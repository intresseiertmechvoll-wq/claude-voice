/**
 * Traitement d'un envoi : vérification → limite par IP → calcul → e-mail → résultat.
 * Le résultat complet (surfaces par commune) n'est renvoyé qu'une fois les coordonnées vérifiées ET l'e-mail parti.
 */
import server from '../../server.json';
import data from '../../data/communes.json';
import params from '../../params.json';
import { computeBudget, type Params } from '../shared/budget';
import { communesM2 } from '../shared/communes-m2';
import { leadEmail } from '../shared/email';
import { allowSubmission, refundSubmission, type KVLike } from '../shared/ratelimit';
import type { Dataset, PublicResult } from '../shared/types';
import { validateSubmission } from '../shared/validation';

export interface Env {
  RESEND_API_KEY?: string;
  LEAD_EMAIL?: string;
  FROM_EMAIL?: string;
  /** "log" : n'envoie rien, écrit l'e-mail dans la console (tests en local) */
  EMAIL_MODE?: string;
  RATE_LIMIT?: KVLike;
  RATE_LIMIT_SALT?: string;
}

export interface Deps {
  fetch: typeof fetch;
  now: () => Date;
  log: (...args: unknown[]) => void;
  data: Dataset;
  params: Params;
}

export const defaultDeps = (): Deps => ({
  fetch: (...a) => fetch(...a),
  now: () => new Date(),
  log: (...a) => console.log(...a),
  data: data as unknown as Dataset,
  params: params as Params,
});

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const MAX_BODY = 20_000;

export interface Mail {
  subject: string;
  html: string;
  text: string;
  replyTo: string;
}

/** Envoi par Resend (ou affichage dans la console avec EMAIL_MODE=log). Renvoie une erreur ou null. */
export async function sendMail(env: Env, d: Deps, mail: Mail): Promise<'config' | 'send' | null> {
  const to = env.LEAD_EMAIL || server.defaultLeadEmail;
  const from = env.FROM_EMAIL || server.defaultFromEmail;
  if (env.EMAIL_MODE === 'log') {
    d.log(`\n=== E-MAIL (mode log, non envoyé) ===\nÀ : ${to}\nDe : ${from}\nRépondre à : ${mail.replyTo}\nObjet : ${mail.subject}\n\n${mail.text}\n=== FIN ===\n`);
    return null;
  }
  if (!env.RESEND_API_KEY) {
    d.log('RESEND_API_KEY manquante : impossible d’envoyer l’e-mail');
    return 'config';
  }
  let res: Response;
  try {
    res = await d.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: mail.replyTo, subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    d.log('Resend injoignable :', (err as Error).message);
    return 'send';
  }
  if (!res.ok) {
    d.log('Resend a refusé l’envoi :', res.status, await res.text().catch(() => ''));
    return 'send';
  }
  return null;
}

/** Contrôles communs : POST, même origine, JSON, taille. Renvoie le corps ou une réponse d'erreur. */
export async function readJson(request: Request, maxBody = MAX_BODY): Promise<{ body: unknown } | { error: Response }> {
  if (request.method !== 'POST') return { error: json({ ok: false, error: 'method' }, 405) };
  // Les navigateurs envoient toujours Origin sur un POST fetch : une requête sans Origin ne vient pas de l'outil
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return { error: json({ ok: false, error: 'origin' }, 403) };
  const mediaType = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') return { error: json({ ok: false, error: 'content-type' }, 415) };
  const text = await request.text();
  if (text.length > maxBody) return { error: json({ ok: false, error: 'too_large' }, 413) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: json({ ok: false, error: 'json' }, 400) };
  }
}

export async function handleBudget(request: Request, env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };
  const r = await readJson(request);
  if ('error' in r) return r.error;

  const v = validateSubmission(r.body);
  if (!v.ok) {
    // Robot (honeypot rempli) : rien n'est calculé ni envoyé
    if (v.bot) return json({ ok: false, error: 'rejected' }, 400);
    return json({ ok: false, error: 'validation', errors: v.errors }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  // Clé secrète de l'empreinte d'IP : sans elle (valeur par défaut publique), une empreinte d'IPv4 se retrouve par essais
  const salt = env.RATE_LIMIT_SALT || env.RESEND_API_KEY || 'immobuild-acheteur';
  const allowed = await allowSubmission(ip, server.rateLimitPerHour, env.RATE_LIMIT, salt);
  if (!allowed) return json({ ok: false, error: 'rate_limit' }, 429);

  const a = v.value.answers;
  // Le budget est recalculé ici : on ne reprend jamais un calcul venu du navigateur
  const budget = computeBudget(a, d.params);
  const communes = communesM2(a.prix, a.communes, a.type, a.neuf, d.data, d.params);
  const mail = leadEmail(v.value, budget, communes, d.data.periode, d.now());
  const err = await sendMail(env, d, { ...mail, replyTo: v.value.contact.email });
  if (err) {
    // Rien n'est parti : l'essai ne compte pas dans la limite, le visiteur peut réessayer
    await refundSubmission(ip, env.RATE_LIMIT, salt);
    return json({ ok: false, error: err }, err === 'config' ? 500 : 502);
  }

  const result: PublicResult = { budget, communes, periodeDebut: d.data.periode_debut, periodeFin: d.data.periode_fin };
  return json({ ok: true, result });
}
