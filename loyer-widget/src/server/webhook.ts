/**
 * Avis de Resend (webhook) : quand la copie du résultat n'a pas pu être livrée au visiteur
 * (adresse fausse, boîte inexistante…), Jason reçoit un e-mail « adresse fausse, appelez-le ».
 *
 * - Seuls les messages signés par Resend sont acceptés (signature Svix : HMAC-SHA256, secret
 *   RESEND_WEBHOOK_SECRET, horodatage à 5 minutes près).
 * - Seuls les e-mails marqués « copie_visiteur » au moment de l'envoi sont pris en compte :
 *   un problème sur l'e-mail du lead lui-même, ou sur cet avis, ne déclenche rien (pas de boucle).
 * - Rien n'est enregistré : l'avis est envoyé, puis tout est oublié.
 */
import config from '../../config.json';
import { escapeHtml, estMobile, formatPhone } from '../shared/email';
import { defaultDeps, json, sendMail, type Deps, type Env } from './handler';

/** Événements Resend qui veulent dire « la copie n'est pas arrivée » */
export const EVENEMENTS_ECHEC = ['email.bounced', 'email.failed', 'email.suppressed'];
export const TAG_COPIE = 'copie_visiteur';
const TOLERANCE_S = 5 * 60;
const MAX_BODY = 50_000;

function base64(bytes: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
}

/** Comparaison à temps constant (évite de deviner la signature octet par octet) */
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Vérification d'une signature Svix (docs.svix.com, « Verifying webhooks manually ») */
export async function signatureValide(secret: string, id: string, timestamp: string, signatures: string, body: string, maintenant: Date): Promise<boolean> {
  const ts = Number(timestamp);
  if (!id || !Number.isFinite(ts) || Math.abs(maintenant.getTime() / 1000 - ts) > TOLERANCE_S) return false;
  let cle: Uint8Array<ArrayBuffer>;
  try {
    cle = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const k = await crypto.subtle.importKey('raw', cle, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const attendu = base64(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
  return signatures
    .split(' ')
    .map((s) => s.split(','))
    .some(([version, sig]) => version === 'v1' && typeof sig === 'string' && egal(sig, attendu));
}

/** E-mail à Jason : la copie n'est pas arrivée, l'adresse est probablement fausse */
export function avisAdresseFausse(o: { email: string; tel: string | null; sujet: string; raison: string }): { subject: string; html: string; text: string } {
  const tel = o.tel ? `+${o.tel}` : null;
  const subject = `⚠️ Adresse e-mail fausse : ${o.email}${tel ? ` – rappeler au ${formatPhone(tel)}` : ''}`.replace(/[\r\n\u2028\u2029]+/g, ' ');
  const lignes = [
    `La copie du résultat n’a pas pu être livrée à ${o.email}.`,
    `Raison donnée par le serveur : ${o.raison || '—'}`,
    '',
    'L’adresse saisie est probablement fausse : une réponse par e-mail ne lui parviendra pas.',
    tel ? `Rappelez plutôt le visiteur : ${formatPhone(tel)}` : 'Rappelez plutôt le visiteur (numéro dans l’e-mail du lead).',
    '',
    `L’e-mail du lead d’origine est dans votre boîte (cherchez ${o.email}). Objet de la copie : « ${o.sujet} ».`,
  ];
  const btn = (href: string, label: string, plein: boolean) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:6px;font-weight:bold;font-size:14px;text-decoration:none;${plein ? 'background:#0A2342;color:#ffffff' : 'background:#ffffff;color:#0A2342;border:1px solid #0A2342'}">${escapeHtml(label)}</a>`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px;font-size:15px;line-height:1.5">
<h1 style="font-size:20px;margin:0 0 16px">⚠️ Adresse e-mail fausse</h1>
${tel ? `<p style="margin:0 0 16px">${btn(`tel:${tel}`, `📞 Appeler ${formatPhone(tel)}`, true)}${estMobile(tel) ? btn(`https://wa.me/${tel.slice(1)}`, 'WhatsApp', false) : ''}</p>` : ''}
${lignes.map((l) => (l ? `<p style="margin:0 0 8px">${escapeHtml(l)}</p>` : '')).join('\n')}
</div></body></html>`;
  return { subject, html, text: lignes.join('\n') };
}

export async function handleResendWebhook(request: Request, env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!env.RESEND_WEBHOOK_SECRET) {
    d.log('RESEND_WEBHOOK_SECRET manquant : avis de Resend ignorés');
    return json({ ok: false, error: 'config' }, 500);
  }
  const body = await request.text();
  if (body.length > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413);
  const h = (n: string) => request.headers.get(n) ?? '';
  if (!(await signatureValide(env.RESEND_WEBHOOK_SECRET, h('svix-id'), h('svix-timestamp'), h('svix-signature'), body, d.now()))) {
    return json({ ok: false, error: 'signature' }, 401);
  }

  let evt: { type?: string; data?: { to?: unknown; subject?: unknown; tags?: Record<string, unknown>; bounce?: { message?: unknown }; failed?: { reason?: unknown } } };
  try {
    evt = JSON.parse(body);
  } catch {
    return json({ ok: false, error: 'json' }, 400);
  }
  // Même avis reçu deux fois (Resend réessaie) : on ne prévient Jason qu'une fois, si un stockage KV existe
  const kv = env.RATE_LIMIT ?? env.LEADS_EN_ATTENTE;
  const vu = `wh:${h('svix-id').slice(0, 100)}`;
  if (kv && (await kv.get(vu).catch(() => null))) return json({ ok: true, doublon: true });
  const tags = evt.data?.tags ?? {};
  // Seulement les copies au visiteur, et seulement les échecs : tout le reste est ignoré (réponse 200)
  if (!EVENEMENTS_ECHEC.includes(String(evt.type)) || tags.categorie !== TAG_COPIE) return json({ ok: true, ignore: true });

  const email = Array.isArray(evt.data?.to) ? String(evt.data!.to[0] ?? '') : String(evt.data?.to ?? '');
  const tel = typeof tags.tel === 'string' && /^\d{6,15}$/.test(tags.tel) ? tags.tel : null;
  const raison = String(evt.data?.bounce?.message ?? evt.data?.failed?.reason ?? evt.type ?? '').slice(0, 300);
  const avis = avisAdresseFausse({ email: email.slice(0, 254), tel, sujet: String(evt.data?.subject ?? '').slice(0, 200), raison });
  const lead = env.LEAD_EMAIL || config.defaultLeadEmail;
  const err = await sendMail(env, d, { ...avis, to: lead, replyTo: lead });
  // En cas d'échec, Resend renverra l'avis plus tard (il réessaie tant que la réponse n'est pas 2xx)
  if (err) return json({ ok: false, error: err }, 502);
  if (kv) await kv.put(vu, '1', { expirationTtl: 24 * 3600 }).catch(() => {});
  return json({ ok: true, avis: true });
}
