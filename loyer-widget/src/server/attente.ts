/**
 * Leads en attente : si Resend ne peut pas envoyer l'e-mail du lead (panne, quota épuisé…), l'e-mail
 * déjà rédigé est gardé, CHIFFRÉ, dans Cloudflare KV pendant 7 jours au plus, puis envoyé dès qu'un
 * envoi suivant réussit (avec « Envoi différé – reçu le … » dans l'objet), et effacé aussitôt.
 *
 * Actif seulement si les deux réglages existent : stockage KV `LEADS_EN_ATTENTE` et secret
 * `LEAD_BACKUP_KEY` (une longue phrase au hasard). Sans eux : comportement d'avant (message d'erreur
 * au visiteur, rien n'est gardé).
 *
 * Chiffrement : AES-GCM 256 bits, clé = SHA-256 du secret, vecteur aléatoire de 12 octets par lead.
 * Sans le secret, le contenu stocké est illisible (même pour quelqu'un qui a accès à Cloudflare KV).
 */
import type { Deps, Env, Mail } from './handler';

export interface KVAttente {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
}

export const DUREE_ATTENTE_S = 7 * 24 * 3600;
export const PREFIXE = 'lead:';
/** au plus N leads en attente envoyés par passage (garde la réponse rapide) */
const PAR_PASSAGE = 5;

interface Garde {
  mail: Mail;
  /** date de la demande du visiteur (ISO) */
  recu: string;
}

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function deb64(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function cle(secret: string): Promise<CryptoKey> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function chiffrer(secret: string, texte: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cle(secret), new TextEncoder().encode(texte)));
  const tout = new Uint8Array(iv.length + c.length);
  tout.set(iv);
  tout.set(c, iv.length);
  return b64(tout);
}

export async function dechiffrer(secret: string, donnees: string): Promise<string> {
  const tout = deb64(donnees);
  const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: tout.slice(0, 12) }, await cle(secret), tout.slice(12));
  return new TextDecoder().decode(clair);
}

const actif = (env: Env): env is Env & { LEADS_EN_ATTENTE: KVAttente; LEAD_BACKUP_KEY: string } => Boolean(env.LEADS_EN_ATTENTE && env.LEAD_BACKUP_KEY);

/** Garde l'e-mail du lead. Renvoie true si c'est fait (le visiteur peut voir son résultat). */
export async function mettreEnAttente(env: Env, d: Deps, mail: Mail): Promise<boolean> {
  if (!actif(env)) return false;
  try {
    const recu = d.now().toISOString();
    const id = `${PREFIXE}${recu}-${b64(crypto.getRandomValues(new Uint8Array(6))).replace(/[^A-Za-z0-9]/g, '')}`;
    const g: Garde = { mail, recu };
    await env.LEADS_EN_ATTENTE.put(id, await chiffrer(env.LEAD_BACKUP_KEY, JSON.stringify(g)), { expirationTtl: DUREE_ATTENTE_S });
    d.log('Lead mis en attente (e-mail impossible à envoyer pour le moment) :', id);
    return true;
  } catch (err) {
    d.log('Impossible de garder le lead en attente :', (err as Error).message);
    return false;
  }
}

/** « 19/11 à 14:02 », heure de Luxembourg */
const dateLux = (iso: string) => {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-LU', { ...o, timeZone: 'Europe/Luxembourg' }).format(new Date(iso));
  return `${f({ day: '2-digit', month: '2-digit' })} à ${f({ hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Envoie les leads en attente (au plus 5 par passage), puis les efface. Appelé après chaque envoi réussi.
 * Renvoie le nombre de leads envoyés.
 */
export async function envoyerEnAttente(env: Env, d: Deps, envoyer: (m: Mail) => Promise<string | null>): Promise<number> {
  if (!actif(env)) return 0;
  let envoyes = 0;
  try {
    const { keys } = await env.LEADS_EN_ATTENTE.list({ prefix: PREFIXE, limit: PAR_PASSAGE });
    for (const { name } of keys) {
      const brut = await env.LEADS_EN_ATTENTE.get(name);
      if (!brut) continue; // déjà envoyé par un passage parallèle, ou expiré
      let g: Garde;
      try {
        g = JSON.parse(await dechiffrer(env.LEAD_BACKUP_KEY, brut)) as Garde;
      } catch {
        // Secret changé entre-temps : illisible. On le laisse expirer (7 jours) et on le signale.
        d.log('Lead en attente illisible (LEAD_BACKUP_KEY changé ?) :', name);
        continue;
      }
      const prefixe = `[Envoi différé – demande reçue le ${dateLux(g.recu)}] `;
      const mail: Mail = {
        ...g.mail,
        subject: prefixe + g.mail.subject,
        text: `${prefixe}\nCet e-mail n’a pas pu partir au moment de la demande (panne ou quota de l’envoi d’e-mails).\n\n${g.mail.text}`,
        html: g.mail.html.replace(/(<div[^>]*>)/, `$1<p style="margin:0 0 16px;padding:8px 12px;background:#F2EFEA;font-size:14px">${prefixe.trim().replace(/[<>&]/g, '')} Cet e-mail n’a pas pu partir au moment de la demande.</p>`),
      };
      if ((await envoyer(mail)) !== null) break; // toujours en panne : on réessaiera au prochain envoi
      await env.LEADS_EN_ATTENTE.delete(name);
      envoyes++;
    }
  } catch (err) {
    d.log('Leads en attente : erreur pendant l’envoi :', (err as Error).message);
  }
  if (envoyes) d.log(`${envoyes} lead(s) en attente envoyé(s)`);
  return envoyes;
}
