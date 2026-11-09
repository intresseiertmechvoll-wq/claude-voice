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

const defaultDeps = (): Deps => ({
  fetch: (...a) => fetch(...a),
  now: () => new Date(),
  log: (...a) => console.log(...a),
  data: data as unknown as Dataset,
  params: params as Params,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const MAX_BODY = 20_000;

export async function handleEstimate(request: Request, env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };

  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  // Seule la page de l'outil (même adresse) peut envoyer le formulaire
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: 'origin' }, 403);

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ ok: false, error: 'content-type' }, 415);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'json' }, 400);
  }

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
  const to = env.LEAD_EMAIL || config.defaultLeadEmail;
  const from = env.FROM_EMAIL || config.defaultFromEmail;

  if (env.EMAIL_MODE === 'log') {
    d.log(`\n=== E-MAIL (mode log, non envoyé) ===\nÀ : ${to}\nDe : ${from}\nRépondre à : ${v.value.contact.email}\nObjet : ${mail.subject}\n\n${mail.text}\n=== FIN ===\n`);
  } else {
    if (!env.RESEND_API_KEY) {
      d.log('RESEND_API_KEY manquante : impossible d’envoyer le lead');
      return json({ ok: false, error: 'config' }, 500);
    }
    const res = await d.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: v.value.contact.email, subject: mail.subject, html: mail.html, text: mail.text }),
    });
    if (!res.ok) {
      d.log('Resend a refusé l’envoi :', res.status, await res.text().catch(() => ''));
      return json({ ok: false, error: 'send' }, 502);
    }
  }

  return json({ ok: true, result: est.result });
}
