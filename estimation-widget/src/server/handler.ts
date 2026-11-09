/**
 * Traitement d'un envoi : vérification → limite par IP → calcul → e-mail → résultat.
 * Le résultat n'est renvoyé qu'une fois les coordonnées vérifiées ET l'e-mail parti.
 */
import config from '../../config.json';
import data from '../../data/communes.json';
import params from '../../params.json';
import { estimate, type Params } from '../shared/engine';
import { leadEmail } from '../shared/email';
import { allowSubmission, type KVLike } from '../shared/ratelimit';
import type { Dataset } from '../shared/types';
import { validateSubmission } from '../shared/validation';
import { signTicket, ticketSecret, TICKET_TTL_S } from './token';

export interface Env {
  RESEND_API_KEY?: string;
  LEAD_EMAIL?: string;
  FROM_EMAIL?: string;
  /** "log" : n'envoie rien, écrit l'e-mail dans la console (tests en local) */
  EMAIL_MODE?: string;
  RATE_LIMIT?: KVLike;
  RATE_LIMIT_SALT?: string;
  /** facultatif : secret des tickets du simulateur « Et si… ? » (sinon dérivé de RESEND_API_KEY) */
  SIMULATION_SECRET?: string;
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
  const to = env.LEAD_EMAIL || config.defaultLeadEmail;
  const from = env.FROM_EMAIL || config.defaultFromEmail;
  if (env.EMAIL_MODE === 'log') {
    d.log(`\n=== E-MAIL (mode log, non envoyé) ===\nÀ : ${to}\nDe : ${from}\nRépondre à : ${mail.replyTo}\nObjet : ${mail.subject}\n\n${mail.text}\n=== FIN ===\n`);
    return null;
  }
  if (!env.RESEND_API_KEY) {
    d.log('RESEND_API_KEY manquante : impossible d’envoyer l’e-mail');
    return 'config';
  }
  const res = await d.fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: mail.replyTo, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) {
    d.log('Resend a refusé l’envoi :', res.status, await res.text().catch(() => ''));
    return 'send';
  }
  return null;
}

/** Contrôles communs : POST, même origine, JSON, taille. Renvoie le corps ou une réponse d'erreur. */
export async function readJson(request: Request, maxBody = MAX_BODY): Promise<{ body: unknown } | { error: Response }> {
  if (request.method !== 'POST') return { error: json({ ok: false, error: 'method' }, 405) };
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return { error: json({ ok: false, error: 'origin' }, 403) };
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return { error: json({ ok: false, error: 'content-type' }, 415) };
  const text = await request.text();
  if (text.length > maxBody) return { error: json({ ok: false, error: 'too_large' }, 413) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: json({ ok: false, error: 'json' }, 400) };
  }
}

export async function handleEstimate(request: Request, env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };

  // Seule la page de l'outil (même adresse) peut envoyer le formulaire
  const r = await readJson(request);
  if ('error' in r) return r.error;
  const body = r.body;

  const v = validateSubmission(body);
  if (!v.ok) {
    // Robot (honeypot rempli) : rien n'est calculé ni envoyé
    if (v.bot) return json({ ok: false, error: 'rejected' }, 400);
    return json({ ok: false, error: 'validation', errors: v.errors }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const allowed = await allowSubmission(ip, config.rateLimitPerHour, env.RATE_LIMIT, env.RATE_LIMIT_SALT);
  if (!allowed) return json({ ok: false, error: 'rate_limit' }, 429);

  const est = estimate(v.value.answers, d.data, d.params);
  const mail = leadEmail(v.value, est, d.now());
  const err = await sendMail(env, d, { ...mail, replyTo: v.value.contact.email });
  if (err) return json({ ok: false, error: err }, err === 'config' ? 500 : 502);

  // Ticket pour le simulateur « Et si… ? » (seulement si un prix a été calculé)
  const secret = ticketSecret(env);
  if (secret && est.result.status === 'ok') {
    const c = v.value.contact;
    est.result.simToken = await signTicket(
      { v: 1, exp: Math.floor(d.now().getTime() / 1000) + TICKET_TTL_S, lang: v.value.lang, a: v.value.answers, c: { prenom: c.prenom, nom: c.nom, email: c.email, telephone: c.telephone } },
      secret,
    );
  }

  return json({ ok: true, result: est.result });
}
