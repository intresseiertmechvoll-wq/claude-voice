/**
 * Traitement d'un envoi : vérification → limite par IP → calcul → e-mail → résultat.
 * Le résultat n'est renvoyé qu'une fois les coordonnées vérifiées ET l'e-mail parti.
 */
import config from '../../config.json';
import data from '../../data/loyers.json';
import references from '../../data/references.json';
import params from '../../params.json';
import { estimate, type Params } from '../shared/engine';
import { leadEmail } from '../shared/email';
import { emailVisiteur } from '../shared/email-visiteur';
import { envoyerEnAttente, mettreEnAttente, type KVAttente } from './attente';
import { allowSubmission, refundSubmission, type KVLike } from '../shared/ratelimit';
import type { Dataset, References } from '../shared/types';
import { validateSubmission } from '../shared/validation';

export interface Env {
  RESEND_API_KEY?: string;
  LEAD_EMAIL?: string;
  FROM_EMAIL?: string;
  /** "log" : n'envoie rien, écrit l'e-mail dans la console (tests en local) */
  EMAIL_MODE?: string;
  RATE_LIMIT?: KVLike;
  RATE_LIMIT_SALT?: string;
  /** secret de signature des avis de Resend (webhook), commence par « whsec_ » */
  RESEND_WEBHOOK_SECRET?: string;
  /** clé secrète Cloudflare Turnstile ; absente = pas de contrôle anti-robots */
  TURNSTILE_SECRET_KEY?: string;
  /** leads en attente si Resend est en panne (Cloudflare KV) ; voir src/server/attente.ts */
  LEADS_EN_ATTENTE?: KVAttente;
  /** secret de chiffrement des leads en attente (longue phrase au hasard) */
  LEAD_BACKUP_KEY?: string;
}

export interface Deps {
  fetch: typeof fetch;
  now: () => Date;
  log: (...args: unknown[]) => void;
  data: Dataset;
  refs: References;
  params: Params;
  /** copie du résultat au visiteur (config.json → copieVisiteur) */
  copieVisiteur: boolean;
  /** Cloudflare : continuer un travail après la réponse (envoi des leads en attente) */
  waitUntil?: (p: Promise<unknown>) => void;
}

export const defaultDeps = (): Deps => ({
  fetch: (...a) => fetch(...a),
  now: () => new Date(),
  log: (...a) => console.log(...a),
  data: data as unknown as Dataset,
  refs: references as References,
  params: params as Params,
  copieVisiteur: config.copieVisiteur === true,
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
  /** destinataire ; par défaut l'adresse des leads (LEAD_EMAIL) */
  to?: string;
  /** étiquettes Resend (lettres, chiffres, _ et - seulement), renvoyées dans ses avis */
  tags?: { name: string; value: string }[];
}

/** Envoi par Resend (ou affichage dans la console avec EMAIL_MODE=log). Renvoie une erreur ou null. */
export async function sendMail(env: Env, d: Deps, mail: Mail): Promise<'config' | 'send' | null> {
  const to = mail.to ?? (env.LEAD_EMAIL || config.defaultLeadEmail);
  const from = env.FROM_EMAIL || config.defaultFromEmail;
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
      body: JSON.stringify({ from, to: [to], reply_to: mail.replyTo, subject: mail.subject, html: mail.html, text: mail.text, ...(mail.tags ? { tags: mail.tags } : {}) }),
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

/**
 * Cloudflare Turnstile : vérifie le jeton du navigateur (developers.cloudflare.com/turnstile,
 * « Validate the token »). Jeton absent ou refusé → false. Cloudflare injoignable → true (on ne perd
 * pas un vrai lead à cause d'une panne ; la limite par IP et le champ piège restent actifs).
 */
export async function verifierTurnstile(secret: string, token: unknown, ip: string, d: Deps): Promise<boolean> {
  if (typeof token !== 'string' || token === '' || token.length > 2048) return false;
  try {
    const res = await d.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5_000),
    });
    const r = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (r.success !== true) d.log('Turnstile refusé :', (r['error-codes'] ?? []).join(', '));
    return r.success === true;
  } catch (err) {
    d.log('Turnstile injoignable, envoi accepté :', (err as Error).message);
    return true;
  }
}

/** Contrôles communs : POST, même origine, JSON, taille. Renvoie le corps ou une réponse d'erreur. */
export async function readJson(request: Request, maxBody = MAX_BODY): Promise<{ body: unknown } | { error: Response }> {
  if (request.method !== 'POST') return { error: json({ ok: false, error: 'method' }, 405) };
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return { error: json({ ok: false, error: 'origin' }, 403) };
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
  if (env.TURNSTILE_SECRET_KEY && !(await verifierTurnstile(env.TURNSTILE_SECRET_KEY, (body as { turnstile?: unknown }).turnstile, ip, d))) {
    return json({ ok: false, error: 'turnstile' }, 403);
  }
  const allowed = await allowSubmission(ip, config.rateLimitPerHour, env.RATE_LIMIT, env.RATE_LIMIT_SALT ?? 'immobuild-loyer');
  if (!allowed) return json({ ok: false, error: 'rate_limit' }, 429);

  const est = estimate(v.value.answers, d.data, d.refs, d.params);
  const mail = leadEmail(v.value, est, d.now());
  const err = await sendMail(env, d, { ...mail, replyTo: v.value.contact.email });
  if (err) {
    // Lead gardé (chiffré) pour un envoi plus tard : le visiteur voit son résultat comme d'habitude
    if (await mettreEnAttente(env, d, { ...mail, replyTo: v.value.contact.email })) {
      return json({ ok: true, result: est.result, copie: false });
    }
    // Rien n'est parti ni gardé : l'essai ne compte pas dans la limite, le visiteur peut réessayer
    await refundSubmission(ip, env.RATE_LIMIT, env.RATE_LIMIT_SALT ?? 'immobuild-loyer');
    return json({ ok: false, error: err }, err === 'config' ? 500 : 502);
  }

  // L'envoi marche : on en profite pour envoyer les leads restés en attente (après la réponse si possible)
  const attente = envoyerEnAttente(env, d, (m) => sendMail(env, d, m));
  if (d.waitUntil) d.waitUntil(attente);
  else await attente;

  // Copie au visiteur : seulement si Jason l'a activée. Un échec ne bloque pas le résultat
  // (le lead est déjà parti) : l'écran dit simplement qu'aucune copie n'a été envoyée.
  let copie = false;
  if (d.copieVisiteur) {
    const m = emailVisiteur(v.value, est);
    // Étiquettes : si l'adresse est fausse, l'avis de Resend permet de prévenir Jason (src/server/webhook.ts)
    const tags = [
      { name: 'categorie', value: 'copie_visiteur' },
      { name: 'tel', value: v.value.contact.telephone.replace(/\D/g, '') },
    ];
    copie = (await sendMail(env, d, { ...m, to: v.value.contact.email, replyTo: env.LEAD_EMAIL || config.defaultLeadEmail, tags })) === null;
  }

  return json({ ok: true, result: est.result, copie });
}
