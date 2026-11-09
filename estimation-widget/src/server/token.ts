/**
 * Ticket signé (HMAC-SHA256) remis avec le résultat. Il permet au simulateur « Et si… ? »
 * de recalculer le prix sans redemander les coordonnées, et seulement pour ce bien-là.
 * Rien n'est stocké sur le serveur : tout est dans le ticket, qui vit dans la page du visiteur.
 */
import type { Answers, Lang } from '../shared/types';

export interface TicketPayload {
  v: 1;
  /** expiration (secondes depuis 1970) */
  exp: number;
  lang: Lang;
  a: Answers;
  c: { prenom: string; nom: string; email: string; telephone: string };
}

export const TICKET_TTL_S = 2 * 3600;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(`immobuild-simulation|${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signTicket(payload: TicketPayload, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** Renvoie le contenu du ticket, ou null s'il est faux, modifié ou expiré */
export async function verifyTicket(ticket: unknown, secret: string, nowS = Math.floor(Date.now() / 1000)): Promise<TicketPayload | null> {
  if (typeof ticket !== 'string' || ticket.length > 6000) return null;
  const [body, sig] = ticket.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(secret), unb64url(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64url(body))) as TicketPayload;
    if (p.v !== 1 || typeof p.exp !== 'number' || p.exp < nowS) return null;
    return p;
  } catch {
    return null;
  }
}

/** Secret de signature : SIMULATION_SECRET, sinon dérivé de la clé Resend ; en local (EMAIL_MODE=log), une valeur de test */
export function ticketSecret(env: { SIMULATION_SECRET?: string; RESEND_API_KEY?: string; EMAIL_MODE?: string }): string | null {
  return env.SIMULATION_SECRET || env.RESEND_API_KEY || (env.EMAIL_MODE === 'log' ? 'local-dev-only' : null);
}
