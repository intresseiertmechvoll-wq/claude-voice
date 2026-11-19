/**
 * Limite : au plus N envois par heure pour une même adresse IP.
 *
 * - Avec Cloudflare KV (gratuit, binding RATE_LIMIT) : compteur partagé.
 *   La clé est une empreinte SHA-256 de l'IP (l'IP elle-même n'est jamais écrite),
 *   et elle s'efface toute seule après 1 heure.
 * - Sans KV : compteur en mémoire, par serveur Cloudflare. Moins fiable (remis à
 *   zéro quand le serveur redémarre), mais ne stocke rien.
 * Limite connue : KV n'est pas atomique (lecture puis écriture, au plus une écriture par seconde et par clé),
 * des envois simultanés peuvent passer (rapport Codex 2). Ce compteur sert à l'heure ; les rafales sont arrêtées
 * par une règle de limitation Cloudflare (voir README). En cas de panne de KV, l'envoi est accepté.
 */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

const WINDOW_S = 3600;
const memory = new Map<string, { count: number; start: number }>();

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Renvoie true si l'envoi est autorisé (et le compte), false si la limite est atteinte */
export async function allowSubmission(ip: string, limit: number, kv?: KVLike, salt = 'immobuild-estimation', now = Date.now()): Promise<boolean> {
  const key = 'rl:' + (await sha256(salt + '|' + ip));
  const nowS = Math.floor(now / 1000);

  let entry: { count: number; start: number } | null = null;
  if (kv) {
    try {
      const raw = await kv.get(key);
      entry = raw ? (JSON.parse(raw) as { count: number; start: number }) : null;
    } catch {
      return true; // KV en panne : un lead ne doit pas être perdu (la règle de limitation Cloudflare reste en place)
    }
  } else {
    entry = memory.get(key) ?? null;
    if (memory.size > 10000) memory.clear();
  }
  if (!entry || nowS - entry.start >= WINDOW_S) entry = { count: 0, start: nowS };
  if (entry.count >= limit) return false;

  entry.count += 1;
  if (kv) {
    const ttl = Math.max(60, WINDOW_S - (nowS - entry.start));
    await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl }).catch(() => {}); // ex. plus d'une écriture par seconde
  } else {
    memory.set(key, entry);
  }
  return true;
}

/** Rend la place d'un envoi qui n'a pas abouti (ex. Resend injoignable) : il ne doit pas compter dans la limite */
export async function refundSubmission(ip: string, kv?: KVLike, salt = 'immobuild-estimation'): Promise<void> {
  const key = 'rl:' + (await sha256(salt + '|' + ip));
  if (kv) {
    try {
      const raw = await kv.get(key);
      if (!raw) return;
      const e = JSON.parse(raw) as { count: number; start: number };
      e.count = Math.max(0, e.count - 1);
      const ttl = Math.max(60, WINDOW_S - (Math.floor(Date.now() / 1000) - e.start));
      await kv.put(key, JSON.stringify(e), { expirationTtl: ttl });
    } catch {
      // sans importance : la place sera rendue au plus tard après 1 heure
    }
  } else {
    const e = memory.get(key);
    if (e) e.count = Math.max(0, e.count - 1);
  }
}

/** Pour les tests */
export function resetMemoryLimiter(): void {
  memory.clear();
}
