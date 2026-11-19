/** Aperçu du budget (sans coordonnées) et résultat complet (fonctions pures : renvoient du HTML, testées) */
import { LOCALES, type T } from '../i18n';
import type { Answers, Budget, CommuneM2, Lang, PublicResult } from '../shared/types';
import { formatEuro } from './format';
import { mensualite, partRevenu, type Taux } from '../shared/taux';
import { esc } from './html';
import { icon } from './icons';

export interface BudgetOptions {
  /** date du calcul, AAAA-MM-JJ (état des règles) */
  date: string;
  /** montant annoncé ; l'annonce n'est affichée que s'il dépasse le montant actuel */
  bellegenAnnonce: { montant: number; actuel: number; etatAu: string };
  bellegenChoix: 'non' | 'oui' | 'nsp';
  usage: 'habiter' | 'investir';
  /** communes choisies où une surtaxe communale peut s'appliquer (avertissement, non calculée) */
  surtaxe?: string[];
  /** mensualité d'exemple : taux du mois (null = pas affichée), tranche de revenu, repère des banques, durées */
  mensualite?: { taux: Taux | null; revenu: string | null; repere: [number, number]; durees: number[] };
}

/** Mensualité d'exemple avec les taux moyens BCL du mois. Rien si les taux manquent ou sont trop anciens. */
export function renderMensualite(pret: number, taux: Taux | null, revenu: string | null | undefined, t: T, lang: Lang, repere: [number, number], durees: number[]): string {
  if (!taux || pret <= 0) return '';
  const pctFmt = (v: number) => new Intl.NumberFormat(LOCALES[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + (lang === 'en' ? '%' : '\u00a0%');
  const eur = (v: number) => `<span class="nw">${esc(formatEuro(Math.round(v / 10) * 10, lang))}</span>`;
  const [y, m] = taux.mois.split('-').map(Number);
  const moisTxt = new Intl.DateTimeFormat(LOCALES[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
  const rows = durees
    .map((n) => `<tr><th scope="row">${esc(t('mensualite.duree', { n }))}</th><td>${eur(mensualite(pret, taux.variable, n))}</td><td>${eur(mensualite(pret, taux.fixe, n))}</td></tr>`)
    .join('');
  let part = '';
  const p = partRevenu(mensualite(pret, taux.fixe, 25), revenu);
  if (p) {
    const pc = (v: number) => `${Math.round(v * 100)}${lang === 'en' ? '%' : '\u00a0%'}`;
    const txt = p.min !== null && p.max !== null ? t('mensualite.partRange', { min: pc(p.min), max: pc(p.max) }) : p.min !== null ? t('mensualite.partMin', { min: pc(p.min) }) : t('mensualite.partMax', { max: pc(p.max!) });
    // Milieu de la fourchette (ou la seule borne connue) comparé au repère des banques
    const ref = p.min !== null && p.max !== null ? (p.min + p.max) / 2 : (p.min ?? p.max)!;
    const level = ref > repere[1] ? 'high' : ref < repere[0] ? 'low' : 'mid';
    part = `<p class="part part-${level}">${esc(txt)} ${esc(t(`mensualite.repere_${level}`))}</p>`;
  }
  return `<section class="panel mensualite" aria-labelledby="mens-title">
  <h3 id="mens-title">${icon('calendrier', 'ico ico-sm')}<span>${esc(t('mensualite.title'))}</span></h3>
  <p class="small">${esc(t('mensualite.sub', { pret: formatEuro(pret, lang), mois: moisTxt }))}</p>
  <table class="budget-table mens-table">
    <thead><tr><th scope="col"></th><th scope="col">${esc(t('mensualite.variable', { taux: pctFmt(taux.variable) }))}</th><th scope="col">${esc(t('mensualite.fixe', { taux: pctFmt(taux.fixe) }))}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${part}
  <p class="small disclaimer">${esc(t('mensualite.disclaimer'))}</p>
</section>`;
}

export interface ResultOptions {
  contactUrl: string;
  estimationUrl: string;
  agent?: { name: string; role: string; photo?: string };
  phone?: string;
}

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  const out = new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return lang === 'fr' ? out.replace(/^1 /, '1er ') : out;
}

const range = (a: number, b: number, lang: Lang) => (a === b ? formatEuro(a, lang) : `${formatEuro(a, lang)} – ${formatEuro(b, lang)}`);
/** Fourchette en HTML : chaque montant reste sur une ligne, la fourchette peut passer à la ligne */
const rangeHtml = (a: number, b: number, lang: Lang) =>
  a === b ? `<span class="nw">${esc(formatEuro(a, lang))}</span>` : `<span class="nw">${esc(formatEuro(a, lang))}</span> – <span class="nw">${esc(formatEuro(b, lang))}</span>`;

/** Tableau du budget : identique dans l'aperçu et dans le résultat */
export function renderBudget(b: Budget, t: T, lang: Lang, o: BudgetOptions): string {
  const eur = (v: number) => `<span class="nw">${esc(formatEuro(v, lang))}</span>`;
  // La note passe sur sa propre ligne, sous le libellé et le montant (lisible sur téléphone)
  const row = (label: string, value: string, cls = '', note = '') =>
    `<tr class="${cls}${note ? ' has-note' : ''}"><th scope="row">${esc(label)}</th><td>${value}</td></tr>${note ? `<tr class="note-row ${cls}"><td colspan="2">${esc(note)}</td></tr>` : ''}`;

  let bellegenNote = '';
  if (o.usage === 'investir') bellegenNote = t('budget.bellegenNone');
  else if (o.bellegenChoix === 'oui') bellegenNote = t('budget.bellegenUsed');
  else if (o.bellegenChoix === 'nsp') bellegenNote = t('budget.bellegenNsp');

  const manque = b.margeMin < 0;
  const manqueTxt = range(Math.max(0, -b.margeMax), -b.margeMin, lang);
  const verdict = manque
    ? `<div class="verdict verdict-gap" role="status">${icon('info', 'ico ico-sm')}<div><p><strong>${esc(t('budget.manque', { montant: manqueTxt }))}</strong></p><p class="small">${esc(t('budget.pistes'))}</p></div></div>`
    : `<div class="verdict verdict-ok" role="status">${icon('check', 'ico ico-sm')}<p><strong>${esc(t('budget.ok'))}</strong></p></div>`;

  const annonce =
    o.usage === 'habiter' && o.bellegenChoix !== 'oui' && o.bellegenAnnonce.montant > o.bellegenAnnonce.actuel
      ? `<p class="small">${esc(t('budget.bellegenAnnonce', { montant: formatEuro(o.bellegenAnnonce.montant, lang), date: formatDate(o.bellegenAnnonce.etatAu, lang) }))}</p>`
      : '';

  return `<section class="panel budget" aria-labelledby="budget-title">
  <h3 id="budget-title">${icon('donnees', 'ico ico-sm')}<span>${esc(t('budget.title', { prix: formatEuro(b.prix, lang) }))}</span></h3>
  <p class="small">${esc(t('budget.sub', { date: formatDate(o.date, lang) }))}</p>
  <table class="budget-table">
    <tbody>
      ${row(t('budget.prix'), eur(b.prix))}
      ${row(t('budget.droits'), `${b.droitsMaximum ? '≤\u00a0' : ''}${eur(b.droits)}`, '', b.droitsMaximum ? t('budget.droitsMax') : '')}
      ${row(t('budget.bellegen'), b.bellegen ? `−\u00a0${eur(b.bellegen)}` : eur(0), 'minus', bellegenNote)}
      ${row(t('budget.notaire'), eur(b.notaireVente))}
      ${b.pret > 0 ? row(t('budget.fraisPret'), eur(b.fraisPret), '', b.pretNecessaire < b.pret ? t('budget.fraisPretMax') : '') : ''}
      ${row(t('budget.divers'), rangeHtml(b.fraisDiversMin, b.fraisDiversMax, lang), '', t('budget.fraisPretNote'))}
      ${row(t('budget.total'), `<strong>${rangeHtml(b.totalMin, b.totalMax, lang)}</strong>`, 'total')}
      ${row(b.pretLimiteParCapacite ? t('budget.pretCapacite') : t('budget.pret'), `−\u00a0${eur(b.pret)}`, 'minus', `${t(`budget.ltv.${b.ltvRule}`)} ${t('budget.ltvNote')}`)}
      ${row(t('budget.apportNecessaire'), `<strong>${rangeHtml(b.apportNecessaireMin, b.apportNecessaireMax, lang)}</strong>`, 'total')}
      ${
        b.produitVente !== null
          ? `${row(t('budget.epargne'), eur(b.apport))}
      ${row(t('budget.produitVente'), `+\u00a0${eur(b.produitVente)}`, 'minus', t('budget.produitVenteNote', { frais: formatEuro(b.fraisVente ?? 0, lang) }))}
      ${row(t('budget.apportTotal'), `<strong>${eur(b.apportTotal)}</strong>`, 'total')}`
          : row(t('budget.apportDeclare'), eur(b.apport))
      }
      ${b.pretNecessaire < b.pret ? row(t('budget.pretNecessaire'), `<strong>${eur(b.pretNecessaire)}</strong>`, 'total', t('budget.pretNecessaireNote')) : ''}
    </tbody>
  </table>
  ${verdict}
  ${b.produitVente ? `<p class="small relais">${icon('info', 'ico ico-xs')} ${esc(t('budget.relais'))}</p>` : ''}
  ${b.prixMax !== null ? `<p class="prixmax">${icon('cle', 'ico ico-sm')}<span>${esc(t('budget.prixMax', { pret: formatEuro(b.pretAuPrixMax ?? 0, lang), prix: formatEuro(b.prixMax, lang) }))}</span></p>` : ''}
  ${annonce}
  ${o.surtaxe?.length ? `<p class="small surtaxe">${icon('info', 'ico ico-xs')} ${esc(t('budget.surtaxe', { communes: o.surtaxe.join(', ') }))}</p>` : ''}
  <p class="small disclaimer">${esc(t('budget.disclaimer'))}</p>
</section>`;
}

/** Partie de l'aperçu recalculée à chaque mouvement du simulateur */
export function renderBudgetLive(b: Budget, t: T, lang: Lang, o: BudgetOptions): string {
  return `${renderBudget(b, t, lang, o)}
  ${o.mensualite ? renderMensualite(b.pretNecessaire, o.mensualite.taux, o.mensualite.revenu, t, lang, o.mensualite.repere, o.mensualite.durees) : ''}`;
}

export interface SimOptions {
  prixDepart: number;
  apportDepart: number;
}

const round = (v: number, step: number) => Math.round(v / step) * step;
/** Bornes des curseurs, fixées à partir des montants de départ (elles ne bougent pas pendant le glissement) */
export function simBounds(s: SimOptions) {
  return {
    prix: { min: Math.max(50_000, round(s.prixDepart * 0.6, 5000)), max: Math.min(20_000_000, round(s.prixDepart * 1.4, 5000)), step: 5000 },
    apport: { min: 0, max: Math.min(20_000_000, Math.max(round(s.apportDepart * 2, 1000), s.apportDepart + 100_000)), step: 1000 },
  };
}

/** Simulateur « Et si… ? » : prix et apport, recalcul immédiat dans le navigateur */
export function renderSim(b: Budget, s: SimOptions, t: T, lang: Lang): string {
  const bd = simBounds(s);
  const changed = b.prix !== s.prixDepart || b.apport !== s.apportDepart;
  const slider = (name: 'prix' | 'apport', label: string, value: number) => {
    const lim = bd[name];
    return `<div class="sim-row">
    <label for="sim-${name}">${esc(label)}</label>
    <output id="sim-${name}-out" for="sim-${name}">${esc(formatEuro(value, lang))}</output>
    <input type="range" id="sim-${name}" name="sim_${name}" min="${lim.min}" max="${lim.max}" step="${lim.step}" value="${Math.min(lim.max, Math.max(lim.min, value))}" aria-valuetext="${esc(formatEuro(value, lang))}">
  </div>`;
  };
  return `<section class="sim" aria-labelledby="sim-title">
  <h3 id="sim-title">${icon('outils', 'ico ico-sm')}<span>${esc(t('sim.title'))}</span></h3>
  <p class="small">${esc(t('sim.sub'))}</p>
  ${slider('prix', t('sim.prix'), b.prix)}
  ${slider('apport', t('sim.apport'), b.apport)}
  <p class="small sim-depart" id="sim-depart"${changed ? '' : ' hidden'}>${esc(t('sim.depart', { prix: formatEuro(s.prixDepart, lang), apport: formatEuro(s.apportDepart, lang) }))} <button type="button" class="link-btn" data-action="sim-reset">${esc(t('sim.reset'))}</button></p>
</section>`;
}

/** Aperçu affiché après l'étape 3, sans coordonnées */
export function renderBudgetPreview(b: Budget, t: T, lang: Lang, o: BudgetOptions, sim?: SimOptions): string {
  return `<section class="result" aria-labelledby="preview-title">
  <h2 id="preview-title" class="step-title" tabindex="-1">${esc(t('steps.3.title'))}</h2>
  ${sim ? renderSim(b, sim, t, lang) : ''}
  <p class="sr-only" id="sim-status" aria-live="polite"></p>
  <div id="budget-live">${renderBudgetLive(b, t, lang, o)}</div>
  <p class="next-hint">${icon('fleche', 'ico ico-sm')}<span>${esc(t('budget.next'))}</span></p>
</section>`;
}

function communesHtml(list: CommuneM2[], prix: number, r: PublicResult, t: T, lang: Lang): string {
  const items = list
    .map((c) => {
      const label = `${esc(c.commune)} <span class="muted">· ${esc(t(`result.typeLabel.${c.type}`))}</span>`;
      if (c.m2 === null || c.prixM2 === null || c.source === null) {
        return `<li class="cm"><p class="cm-name">${label}</p><p class="cm-m2 muted">${esc(t('result.noData'))}</p></li>`;
      }
      const neuf = c.ancienPourNeuf ? `<p class="cm-sub cm-warn">${esc(t('result.ancienPourNeuf'))}</p>` : '';
      return `<li class="cm"><p class="cm-name">${label}</p><p class="cm-m2">${esc(t('result.m2', { m2: String(c.m2) }))}</p><p class="cm-sub">${esc(t('result.perM2', { prix: formatEuro(Math.round(c.prixM2), lang) }))} · ${esc(t(`result.source.${c.source}`, { n: String(c.nombre ?? '') }))}</p>${neuf}</li>`;
    })
    .join('');
  return `<section class="panel" aria-labelledby="communes-title">
  <h3 id="communes-title">${icon('epingle', 'ico ico-sm')}<span>${esc(t('result.communesTitle', { prix: formatEuro(prix, lang) }))}</span></h3>
  <p class="small">${esc(t('result.communesSub'))}</p>
  <ul class="cm-list">${items}</ul>
  <p class="small">${esc(t('result.communesNote', { debut: formatDate(r.periodeDebut, lang), fin: formatDate(r.periodeFin, lang) }))}</p>
</section>`;
}

function agentCard(o: ResultOptions): string {
  if (!o.agent?.name) return '';
  const avatar = o.agent.photo
    ? `<img class="avatar" src="${esc(o.agent.photo)}" alt="" width="56" height="56">`
    : `<span class="avatar" aria-hidden="true">${esc(o.agent.name.charAt(0))}</span>`;
  return `<div class="agent">${avatar}<div><p class="agent-name">${esc(o.agent.name)}</p><p class="agent-role">${esc(o.agent.role)}</p></div></div>`;
}

export function renderResult(r: PublicResult, a: Pick<Answers, 'prix' | 'premier' | 'usage' | 'bellegen' | 'vendre' | 'renover' | 'mandat' | 'courtier' | 'revenu'>, prenom: string, t: T, lang: Lang, o: ResultOptions & BudgetOptions, email = ''): string {
  const cards: string[] = [];
  const card = (ico: string, title: string, text: string, link = '') =>
    `<div class="next-card">${icon(ico, 'ico ico-sm')}<div><p class="next-title">${esc(title)}</p><p class="small">${esc(text)}</p>${link}</div></div>`;
  if (a.vendre === 'oui_lu') cards.push(card('vendre', t('result.vendreTitle'), t('result.vendreText'), `<a class="btn btn-secondary" href="${esc(o.estimationUrl)}" target="_blank" rel="noopener">${esc(t('result.vendreCta'))}</a>`));
  if (a.mandat === 'oui' || a.mandat === 'peut_etre') cards.push(card('cle', t('result.mandatTitle'), t('result.mandatText')));
  if (a.renover === 'oui' || a.renover === 'selon_prix') cards.push(card('outils', t('result.renoverTitle'), t('result.renoverText')));
  if (a.courtier) cards.push(card('donnees', t('result.courtierTitle'), t('result.courtierText')));

  const checks = [
    a.usage === 'habiter' && a.premier !== 'non' ? t('result.checkPremier') : '',
    t('result.checkRevenu'),
    a.usage === 'habiter' ? `${esc(t('result.checkAides'))} <a href="https://guichet.public.lu/fr/citoyens/logement/aides.html" target="_blank" rel="noopener">${esc(t('result.checkAidesLink'))}</a>` : '',
  ].filter(Boolean);

  const cta = `<a class="btn btn-primary btn-block" href="${esc(o.contactUrl)}" target="_top" rel="noopener">${icon('rdv')}<span>${esc(t('result.cta'))}</span></a>`;
  const call = o.phone
    ? `<a class="btn btn-secondary btn-block" href="tel:${esc(o.phone.replace(/\s/g, ''))}" target="_top">${icon('telephone')}<span class="call-text"><span>${esc(t('result.call', { name: o.agent?.name ?? '' }).trim())}</span><span class="call-num">${esc(o.phone)}</span></span></a>`
    : '';

  return `<section class="result" aria-labelledby="result-title">
  <div class="result-hero">
    <span class="hero-badge">${icon('check')}</span>
    <h2 id="result-title" class="step-title" tabindex="-1">${esc(t('result.title', { prenom }))}</h2>
    <p class="hero-sub">${esc(t('result.sub'))}</p>
    ${r.copie && email ? `<p class="hero-sub hero-mail">${esc(t('result.copie', { email }))}</p>` : ''}
  </div>
  ${communesHtml(r.communes, a.prix, r, t, lang)}
  ${o.mensualite ? renderMensualite(r.budget.pretNecessaire, r.taux, a.revenu, t, lang, o.mensualite.repere, o.mensualite.durees) : ''}
  <details class="budget-again panel"><summary>${icon('donnees', 'ico ico-sm')}<span>${esc(t('result.budgetAgain', { prix: formatEuro(r.budget.prix, lang) }))}</span></summary>${renderBudget(r.budget, t, lang, o)}</details>
  <section class="panel" aria-labelledby="check-title">
    <h3 id="check-title">${icon('info', 'ico ico-sm')}<span>${esc(t('result.checkTitle'))}</span></h3>
    <ul class="checklist">${checks.map((c) => `<li>${c.includes('<a ') ? c : esc(c)}</li>`).join('')}</ul>
  </section>
  <section class="panel" aria-labelledby="next-title">
    <h3 id="next-title">${icon('fleche', 'ico ico-sm')}<span>${esc(t('result.nextTitle'))}</span></h3>
    ${cards.join('')}
    ${agentCard(o)}
    <p class="small">${esc(t('result.agentText'))}</p>
    ${cta}${call}
  </section>
  <div class="result-actions">
    <button type="button" class="btn btn-ghost" data-action="print">${icon('imprimer')}<span>${esc(t('result.print'))}</span></button>
    <button type="button" class="btn btn-ghost" data-action="restart">${icon('recommencer')}<span>${esc(t('result.restart'))}</span></button>
  </div>
</section>`;
}
