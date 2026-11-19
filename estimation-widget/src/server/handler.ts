/**
 * Traitement d'un envoi : vérification → limite par IP → domaine de l'e-mail (DNS) → calcul → e-mail → résultat.
 * Le résultat n'est renvoyé qu'une fois les coordonnées vérifiées ET l'e-mail parti.
 */
import config from '../../config.json';
import data from '../../data/communes.json';
import params from '../../params.json';
import { estimate, type Params } from '../shared/engine';
import { leadEmail } from '../shared/email';
import { clientEmail } from '../shared/email-client';
import { loadLang } from '../i18n';
import type { AddressDetails } from '../shared/types';
import { GEO_TIMEOUT_MS, lookupAddress, validLabel } from './adresse';
import { checkEmailDomain } from './dns';
import { metaConfigured, sendMetaLead, type MetaEnv } from './meta';
import { writeFunnel, type FunnelDataset } from '../shared/funnel';
import { allowSubmission, refundSubmission, type KVLike } from '../shared/ratelimit';
import type { Dataset } from '../shared/types';
import { isSequencePhone, validateSubmission } from '../shared/validation';
import { signTicket, ticketSecret, TICKET_TTL_S } from './token';

export interface Env extends MetaEnv {
  RESEND_API_KEY?: string;
  LEAD_EMAIL?: string;
  FROM_EMAIL?: string;
  /** "log" : n'envoie rien, écrit l'e-mail dans la console (tests en local) */
  EMAIL_MODE?: string;
  RATE_LIMIT?: KVLike;
  RATE_LIMIT_SALT?: string;
  /** facultatif : secret des tickets du simulateur « Et si… ? » (sinon dérivé de RESEND_API_KEY) */
  SIMULATION_SECRET?: string;
  /** facultatif : comptage anonyme du parcours (Workers Analytics Engine, jeu « estimation_funnel ») */
  FUNNEL?: FunnelDataset;
}

export interface Deps {
  fetch: typeof fetch;
  /** appels au géoportail (séparés de l'envoi d'e-mail) */
  geoFetch: typeof fetch;
  /** question DNS sur le domaine de l'e-mail (Cloudflare DNS-over-HTTPS) */
  dnsFetch: typeof fetch;
  now: () => Date;
  log: (...args: unknown[]) => void;
  data: Dataset;
  params: Params;
  /** Pages : context.waitUntil – l'e-mail au visiteur part sans retarder le résultat */
  waitUntil?: (p: Promise<unknown>) => void;
}

export const defaultDeps = (): Deps => ({
  fetch: (...a) => fetch(...a),
  geoFetch: (...a) => fetch(...a),
  dnsFetch: (...a) => fetch(...a),
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
  /** destinataire ; par défaut l'adresse des leads (LEAD_EMAIL) */
  to?: string;
}

/** Envoi par Resend (ou affichage dans la console avec EMAIL_MODE=log). Renvoie une erreur ou null. */
export async function sendMail(env: Env, d: Deps, mail: Mail): Promise<'config' | 'send' | null> {
  const to = mail.to || env.LEAD_EMAIL || config.defaultLeadEmail;
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

export async function handleEstimate(request: Request, env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };

  // Seule la page de l'outil (même adresse) peut envoyer le formulaire
  const r = await readJson(request);
  if ('error' in r) return r.error;
  const body = r.body;

  const v = validateSubmission(body, d.now().getTime());
  if (!v.ok) {
    // Robot (honeypot rempli) : rien n'est calculé ni envoyé
    if (v.bot) return json({ ok: false, error: 'rejected' }, 400);
    return json({ ok: false, error: 'validation', errors: v.errors }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  // Clé secrète de l'empreinte d'IP : sans elle (valeur par défaut publique), une empreinte d'IPv4 se retrouve par essais
  const salt = env.RATE_LIMIT_SALT || env.SIMULATION_SECRET || env.RESEND_API_KEY;
  const allowed = await allowSubmission(ip, config.rateLimitPerHour, env.RATE_LIMIT, salt);
  if (!allowed) return json({ ok: false, error: 'rate_limit' }, 429);

  // Le domaine de l'e-mail existe-t-il ? (2 s au plus, en même temps que le géoportail ; panne = accepté)
  const domainCheck = checkEmailDomain(v.value.contact.email, d.dnsFetch);

  const est = estimate(v.value.answers, d.data, d.params);
  // Adresse donnée : données publiques du géoportail pour Jason, relues ici (jamais reprises du navigateur).
  // Au mieux 4 secondes au total ; une panne n'empêche ni le calcul ni l'e-mail.
  let geo: AddressDetails | null | undefined;
  const label = validLabel(v.value.answers.rue);
  if (label) {
    geo = await lookupAddress(label, d.geoFetch, { deadlineMs: GEO_TIMEOUT_MS }).catch((err) => {
      d.log('Géoportail : recherche impossible', (err as Error).message);
      return null;
    });
  }
  const emailDomain = await domainCheck;
  if (emailDomain === 'nxdomain') {
    // Erreur de saisie : rien n'est parti, l'essai ne compte pas dans la limite
    await refundSubmission(ip, env.RATE_LIMIT, salt);
    return json({ ok: false, error: 'validation', errors: { email: 'email_domain' } }, 400);
  }
  const clientCopy = config.customerEmail !== false;
  await loadLang(v.value.lang); // texte du consentement « mesure des annonces » dans la langue du visiteur (preuve)
  const mail = leadEmail(v.value, est, d.now(), geo, { emailDomain, phoneSequence: isSequencePhone(v.value.contact.telephone), clientCopy,
    metaConfigured: metaConfigured(env), googleConversionName: config.adsMeasure.googleConversionName });
  const err = await sendMail(env, d, { ...mail, replyTo: v.value.contact.email });
  if (err) {
    // Rien n'est parti : l'essai ne compte pas dans la limite, le visiteur peut réessayer
    await refundSubmission(ip, env.RATE_LIMIT, salt);
    return json({ ok: false, error: err }, err === 'config' ? 500 : 502);
  }

  // Copie au visiteur, dans sa langue ; un échec ne change rien au résultat (Jason a déjà le lead)
  if (clientCopy) {
    const copy = sendClientCopy(env, d, v.value, est);
    if (d.waitUntil) d.waitUntil(copy);
    else await copy;
  }

  // Mesure des annonces Meta, seulement avec le consentement (fbclid présent) ; ne retarde pas la réponse
  if (v.value.ads?.fbclid && metaConfigured(env)) {
    const lead = sendMetaLead(env, config.adsMeasure.metaApiVersion, {
      ads: v.value.ads,
      email: v.value.contact.email,
      telephone: v.value.contact.telephone,
      userAgent: request.headers.get('user-agent') ?? '',
      pageUrl: `${new URL(request.url).origin}/`,
      nowMs: d.now().getTime(),
      eventId: crypto.randomUUID(),
    }, d.fetch, d.log);
    if (d.waitUntil) d.waitUntil(lead);
    else await lead;
  }

  // Compteur anonyme : une demande envoyée (type de bien et commune, ni adresse ni coordonnées)
  writeFunnel(env.FUNNEL, est.result.status === 'ok' ? 'lead' : 'lead-nodata', {
    lang: v.value.lang,
    source: v.value.source,
    embedded: v.value.page !== '',
    type: v.value.answers.type,
    commune: v.value.answers.commune,
  }, d.log);

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

/** E-mail au visiteur : la même estimation que l'écran ; réponse → Jason. Ne lève jamais d'erreur. */
async function sendClientCopy(env: Env, d: Deps, s: import('../shared/types').Submission, est: ReturnType<typeof estimate>): Promise<void> {
  try {
    await loadLang(s.lang);
    const m = clientEmail(s, est, {
      agent: config.agent,
      phone: config.phone || undefined,
      contactUrl: config.contactUrl[s.lang],
      privacyUrl: config.privacyUrl[s.lang],
      date: d.now(),
    });
    const err = await sendMail(env, d, { ...m, to: s.contact.email, replyTo: env.LEAD_EMAIL || config.defaultLeadEmail });
    if (err) d.log('E-mail au visiteur non envoyé :', err);
  } catch (e) {
    d.log('E-mail au visiteur impossible :', (e as Error).message);
  }
}
