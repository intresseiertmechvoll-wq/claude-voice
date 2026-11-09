/**
 * Simulateur « Et si… ? » (après le résultat)
 * - /api/simulate : recalcule le prix avec quelques réponses modifiées (état, énergie, gros postes). Aucun e-mail.
 * - /api/simulation-summary : un seul e-mail de complément à Jay avec les essais du visiteur.
 * Les deux exigent le ticket signé remis avec le résultat : impossible d'obtenir un prix sans avoir laissé ses coordonnées.
 */
import { estimate } from '../shared/engine';
import { escapeHtml } from '../shared/email';
import { allowSubmission } from '../shared/ratelimit';
import { ENERGIES, ETATS, POSTES_APPARTEMENT, POSTES_MAISON, POSTE_NOTES, type Answers, type Energie, type Etat, type Poste, type PosteKey } from '../shared/types';
import { defaultDeps, json, readJson, sendMail, type Deps, type Env } from './handler';
import { ticketSecret, verifyTicket, type TicketPayload } from './token';

export interface Changes {
  etat?: Etat;
  energie?: Energie;
  postes?: Partial<Record<PosteKey, Poste>>;
}

const SIM_PER_HOUR = 120;
const SUMMARY_PER_HOUR = 3;
const MAX_SCENARIOS = 10;

/** Vérifie les modifications demandées ; null si une valeur n'est pas autorisée */
export function parseChanges(raw: unknown, type: Answers['type']): Changes | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: Changes = {};
  for (const k of Object.keys(r)) if (!['etat', 'energie', 'postes'].includes(k)) return null;
  if (r.etat !== undefined) {
    if (!ETATS.includes(r.etat as Etat)) return null;
    out.etat = r.etat as Etat;
  }
  if (r.energie !== undefined) {
    if (!ENERGIES.includes(r.energie as Energie)) return null;
    out.energie = r.energie as Energie;
  }
  if (r.postes !== undefined) {
    if (!r.postes || typeof r.postes !== 'object' || Array.isArray(r.postes)) return null;
    const allowed: readonly string[] = type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT;
    out.postes = {};
    for (const [k, v] of Object.entries(r.postes as Record<string, unknown>)) {
      if (!allowed.includes(k) || !POSTE_NOTES.includes(v as Poste)) return null;
      out.postes[k as PosteKey] = v as Poste;
    }
  }
  return out;
}

export function applyChanges(a: Answers, c: Changes): Answers {
  return { ...a, etat: c.etat ?? a.etat, energie: c.energie ?? a.energie, postes: { ...a.postes, ...(c.postes ?? {}) } };
}

async function ticketFrom(body: unknown, env: Env): Promise<TicketPayload | Response> {
  const secret = ticketSecret(env);
  if (!secret) return json({ ok: false, error: 'disabled' }, 404);
  const t = await verifyTicket((body as { token?: unknown } | null)?.token, secret);
  return t ?? json({ ok: false, error: 'token' }, 401);
}

export async function handleSimulate(request: Request, env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };
  const r = await readJson(request, 8000);
  if ('error' in r) return r.error;
  const ticket = await ticketFrom(r.body, env);
  if (ticket instanceof Response) return ticket;
  const changes = parseChanges((r.body as { changes?: unknown }).changes, ticket.a.type);
  if (!changes) return json({ ok: false, error: 'validation' }, 400);
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await allowSubmission(ip, SIM_PER_HOUR, undefined, 'simulation'))) return json({ ok: false, error: 'rate_limit' }, 429);

  const base = estimate(ticket.a, d.data, d.params).result;
  const sim = estimate(applyChanges(ticket.a, changes), d.data, d.params).result;
  if (base.status !== 'ok' || sim.status !== 'ok') return json({ ok: false, error: 'no_data' }, 422);
  return json({ ok: true, market: sim.market, low: sim.low, high: sim.high, pricePerM2: sim.pricePerM2, delta: sim.market! - base.market! });
}

/* ---------- E-mail de complément ---------- */

const LBL = {
  etat: { neuf: 'neuf', renove: 'rénové récemment', bon: 'bon état', rafraichir: 'à rafraîchir', renover: 'à rénover' },
  poste: { chassis: 'Châssis', chauffage: 'Chauffage', electricite: 'Électricité', cuisine: 'Cuisine', sanitaires: 'Sanitaires', toiture: 'Toiture' },
  note: { mauvais: 'mauvais', moyen: 'moyen', bon: 'bon', neuf: 'neuf', inconnu: 'je ne sais pas' },
} as const;

const eur = (v: number) => new Intl.NumberFormat('fr-LU', { maximumFractionDigits: 0 }).format(v).replace(/ | /g, ' ') + ' €';
const signed = (v: number) => (v >= 0 ? '+' : '−') + eur(Math.abs(v));

/** « Classe énergétique D → B ; Cuisine : moyen → neuf » */
export function describeChanges(a: Answers, c: Changes): string {
  const parts: string[] = [];
  if (c.energie && c.energie !== a.energie) parts.push(`Classe énergétique ${a.energie === 'inconnu' ? '?' : a.energie} → ${c.energie === 'inconnu' ? '?' : c.energie}`);
  if (c.etat && c.etat !== a.etat) parts.push(`État général : ${LBL.etat[a.etat]} → ${LBL.etat[c.etat]}`);
  for (const [k, v] of Object.entries(c.postes ?? {}) as [PosteKey, Poste][]) {
    const before = a.postes[k] ?? 'inconnu';
    if (v !== before) parts.push(`${LBL.poste[k]} : ${LBL.note[before]} → ${LBL.note[v]}`);
  }
  return parts.join(' ; ') || 'aucun changement';
}

export async function handleSimulationSummary(request: Request, env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };
  const r = await readJson(request, 12000);
  if ('error' in r) return r.error;
  const ticket = await ticketFrom(r.body, env);
  if (ticket instanceof Response) return ticket;
  const raw = (r.body as { scenarios?: unknown }).scenarios;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SCENARIOS) return json({ ok: false, error: 'validation' }, 400);
  const scenarios: Changes[] = [];
  for (const s of raw) {
    const c = parseChanges(s, ticket.a.type);
    if (!c) return json({ ok: false, error: 'validation' }, 400);
    scenarios.push(c);
  }
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await allowSubmission(ip, SUMMARY_PER_HOUR, undefined, 'simulation-summary'))) return json({ ok: false, error: 'rate_limit' }, 429);

  // Les valeurs sont recalculées ici : on ne fait jamais confiance aux chiffres envoyés par le navigateur
  const a = ticket.a;
  const base = estimate(a, d.data, d.params).result;
  if (base.status !== 'ok') return json({ ok: false, error: 'no_data' }, 422);
  const rows = scenarios.map((c) => {
    const m = estimate(applyChanges(a, c), d.data, d.params).result.market!;
    return { what: describeChanges(a, c), market: m, delta: m - base.market! };
  });

  const c = ticket.c;
  const subject = `Complément lead estimation – ${a.commune} – ${c.prenom} ${c.nom} a testé des travaux`.replace(/[\r\n]+/g, ' ');
  const intro = `${c.prenom} ${c.nom} (${c.email}, ${c.telephone}) a utilisé le simulateur « Et si… ? » après son estimation.`;
  const text = `${intro}\n\nBien : ${a.type === 'maison' ? 'Maison' : 'Appartement'} de ${a.surface} m² à ${a.commune}\nValeur de marché affichée : ${eur(base.market!)}\n\nEssais :\n${rows
    .map((x, i) => `${i + 1}. ${x.what} → ${eur(x.market)} (${signed(x.delta)})`)
    .join('\n')}\n\nÀ creuser au rendez-vous : projet de travaux avant la vente ?\nLes montants ne tiennent pas compte du coût des travaux.`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px">
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(subject)}</h1>
<p>${escapeHtml(intro)}</p>
<p><strong>Bien :</strong> ${escapeHtml(`${a.type === 'maison' ? 'Maison' : 'Appartement'} de ${a.surface} m² à ${a.commune}`)}<br><strong>Valeur de marché affichée :</strong> ${escapeHtml(eur(base.market!))}</p>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${rows
    .map(
      (x) =>
        `<tr><td style="padding:6px 12px 6px 0;border-top:1px solid #F2EFEA">${escapeHtml(x.what)}</td><td style="padding:6px 0;border-top:1px solid #F2EFEA;white-space:nowrap;text-align:right"><strong>${escapeHtml(eur(x.market))}</strong><br>${escapeHtml(signed(x.delta))}</td></tr>`,
    )
    .join('')}</table>
<p style="font-size:13px;color:#46566C;margin-top:16px">À creuser au rendez-vous : projet de travaux avant la vente ? Les montants ne tiennent pas compte du coût des travaux.</p>
</div></body></html>`;
  const err = await sendMail(env, d, { subject, html, text, replyTo: c.email });
  if (err) return json({ ok: false, error: err }, err === 'config' ? 500 : 502);
  return json({ ok: true });
}
