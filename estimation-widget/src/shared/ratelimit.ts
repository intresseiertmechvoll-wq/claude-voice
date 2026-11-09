/**
 * Limite : au plus N envois par heure pour une même adresse IP.
 *
 * - Avec Cloudflare KV (gratuit, binding RATE_LIMIT) : compteur partagé.
 *   La clé est une empreinte SHA-256 de l'IP (l'IP elle-même n'est jamais écrite),
 *   et elle s'efface toute seule après 1 heure.
 * - Sans KV : compteur en mémoire, par serveur Cloudflare. Moins fiable (remis à
 *   zéro quand le serveur redémarre), mais ne stocke rien.
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
    const raw = await kv.get(key);
    entry = raw ? (JSON.parse(raw) as { count: number; start: number }) : null;
  } else {
    entry = memory.get(key) ?? null;
    if (memory.size > 10000) memory.clear();
  }
  if (!entry || nowS - entry.start >= WINDOW_S) entry = { count: 0, start: nowS };
  if (entry.count >= limit) return false;

  entry.count += 1;
  if (kv) {
    const ttl = Math.max(60, WINDOW_S - (nowS - entry.start));
    await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
  } else {
    memory.set(key, entry);
  }
  return true;
}

/** Pour les tests */
export function resetMemoryLimiter(): void {
  memory.clear();
}
