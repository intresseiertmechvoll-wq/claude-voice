/** Écran de résultat (fonction pure : renvoie du HTML, testée) */
import { deCanton, LOCALES, type T } from '../i18n';
import type { Lang, PublicFactor, PublicResult } from '../shared/types';
import { formatEuro } from './format';
import { esc } from './html';
import { icon } from './icons';

export { formatEuro };

export interface ResultOptions {
  contactUrl: string;
  gestionUrl: string;
  legalUrl: string;
  agent?: { name: string; role: string; photo?: string };
  phone?: string;
  /** adresse à laquelle une copie du résultat vient d'être envoyée */
  copieA?: string | null;
}

/** « 2026-11-17 » → « novembre 2026 » / « November 2026 » */
function formatMonth(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  const out = new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return lang === 'fr' ? out.replace(/^1 /, '1er ') : out;
}

/** « 4 % » en français et en allemand, « 4% » en anglais */
export function percent(n: string | number, lang: Lang): string {
  return lang === 'en' ? `${n}%` : `${n} %`;
}
/** « Titre : » en français, « Title: » ailleurs */
export function colon(lang: Lang): string {
  return lang === 'fr' ? ' : ' : ': ';
}

function pct(v: number, lang: Lang): string {
  const n = new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 }).format(Math.abs(v * 100));
  return `${v > 0 ? '+' : '−'}${percent(n, lang)}`;
}

function m2(v: number, lang: Lang): string {
  return `${new Intl.NumberFormat(LOCALES[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)} €/m²`;
}

function factorLabel(f: PublicFactor, t: T): string {
  if (f.key.startsWith('energie_')) return t('factors.energie', { c: f.key.slice(8) });
  return t(`factors.${f.key}`, { n: String(f.qty ?? '') });
}

function agentCard(o: ResultOptions): string {
  if (!o.agent?.name) return '';
  const avatar = o.agent.photo
    ? `<img class="avatar" src="${esc(o.agent.photo)}" alt="" width="56" height="56">`
    : `<span class="avatar" aria-hidden="true">${esc(o.agent.name.charAt(0))}</span>`;
  return `<div class="agent">${avatar}<div><p class="agent-name">${esc(o.agent.name)}</p><p class="agent-role">${esc(o.agent.role)}</p></div></div>`;
}

export function renderResult(r: PublicResult, t: T, lang: Lang, o: ResultOptions): string {
  const eur = (v: number) => esc(formatEuro(v, lang));
  const typeLabel = t(`fields.typeOptions.${r.type}`);
  const zoneName = t(`zones.${r.zone}`);

  const ctaGestion = `<a class="btn btn-primary btn-block" href="${esc(o.gestionUrl)}" target="_top" rel="noopener">${icon('gestion')}<span>${esc(t('result.ctaGestion'))}</span></a>`;
  const ctaRdv = `<a class="btn btn-secondary btn-block" href="${esc(o.contactUrl)}" target="_top" rel="noopener">${icon('rdv')}<span>${esc(t('result.ctaRdv'))}</span></a>`;
  const call = o.phone ? `<a class="btn btn-ghost btn-block" href="tel:${esc(o.phone.replace(/\s/g, ''))}" target="_top">${esc(o.phone)}</a>` : '';

  /* Comparaison : annonces de la commune, baux récents de la zone */
  const c = r.compare;
  const statOffres =
    c.offresCommune !== null
      ? `<div class="stat"><p class="stat-label">${esc(t(r.type === 'maison' ? 'result.statOffresMaison' : 'result.statOffres', { commune: r.commune }))}</p><p class="stat-value">${esc(new Intl.NumberFormat(LOCALES[lang]).format(c.offresCommune))}</p><p class="stat-sub">${esc(t('result.statOffresSub', { debut: formatDate(r.annoncesPeriode.debut, lang), fin: formatDate(r.annoncesPeriode.fin, lang) }))}</p></div>`
      : '';
  const statBaux =
    r.type === 'appartement'
      ? `<div class="stat"><p class="stat-label">${esc(t('result.statBaux'))}</p><p class="stat-value">${esc(m2(c.bauxRecentsZoneM2, lang))}</p><p class="stat-sub">${esc(t('result.statBauxSub', { zone: zoneName }))}</p></div>`
      : `<div class="stat"><p class="stat-label">${esc(t('result.statReleve'))}</p><p class="stat-value">${esc(String(c.maisonsReleve ?? 0))}</p><p class="stat-sub">${esc(t('result.statReleveSub', { zone: zoneName, date: formatMonth(r.releveDate, lang) }))}</p></div>`;
  const stats = `<section class="panel" aria-labelledby="stats-title">
    <h3 id="stats-title">${icon('epingle', 'ico ico-sm')}<span>${esc(t('result.compareTitle'))}</span></h3>
    <div class="stats">
      ${statOffres}
      ${statBaux}
      <div class="stat stat-you"><p class="stat-label">${esc(t('result.statYou'))}</p><p class="stat-value">${esc(m2(r.perM2, lang))}</p><p class="stat-sub">${esc(t('result.statYouSub', { n: String(r.surface) }))}</p></div>
    </div>
    <p class="small">${esc(t(r.type === 'maison' ? 'result.compareNoteMaison' : 'result.compareNote', { deCanton: deCanton(r.canton, lang) }))}</p>
  </section>`;

  const factors = r.factors;
  const factorsHtml = `<section class="panel" aria-labelledby="factors-title">
    <h3 id="factors-title">${icon('hausse', 'ico ico-sm')}<span>${esc(t('result.factorsTitle'))}</span></h3>
    ${
      factors.length
        ? `<ul class="factors">${factors
            .map((f) => {
              const up = f.value > 0;
              const val = f.kind === 'eur' ? `+${formatEuro(f.value, lang)}\u00a0/\u00a0${t('result.perMonthShort')}` : pct(f.value, lang);
              return `<li class="${up ? 'up' : 'down'}"><span class="factor-ico">${icon(up ? 'hausse' : 'baisse', 'ico ico-sm')}</span><span class="factor-label">${esc(factorLabel(f, t))}</span><span class="factor-val">${esc(val)}</span></li>`;
            })
            .join('')}</ul>${r.factorsCapped ? `<p class="small">${esc(t('result.factorsCapped'))}</p>` : ''}`
        : `<p class="small">${esc(t(r.type === 'maison' ? 'result.factorsNoneMaison' : 'result.factorsNone'))}</p>`
    }${r.type === 'maison' ? `<p class="small">${esc(t('result.factorsMaisonInclus'))}</p>` : ''}
  </section>`;

  const rel = r.reliability;
  const reliability = `<div class="reliability rel-${rel}">
    <span class="rel-bars" aria-hidden="true"><i></i><i></i><i></i></span>
    <p><strong>${esc(t('result.reliabilityTitle'))}${colon(lang)}${esc(t(`result.reliability.${rel}`))}</strong><br><span class="small">${esc(t(`result.reliabilityText.${r.type}.${rel}`))}</span></p>
  </div>`;

  const legal = `<section class="panel legal" aria-labelledby="legal-title">
    <h3 id="legal-title">${icon('bouclier', 'ico ico-sm')}<span>${esc(t('result.legalTitle'))}</span></h3>
    <p>${esc(t('result.legalText'))} <a href="${esc(o.legalUrl)}" target="_blank" rel="noopener">${esc(t('result.legalLink'))}</a></p>
    ${r.meuble ? `<p class="small">${esc(t('result.legalMeuble'))}</p>` : ''}
  </section>`;

  const how = `<details class="how">
    <summary>${icon('info', 'ico ico-sm')}<span>${esc(t('result.howTitle'))}</span></summary>
    <p>${esc(t(r.type === 'maison' ? 'result.howMaison' : 'result.howAppartement', { deCanton: deCanton(r.canton, lang), zone: zoneName }))}</p>
    <p>${esc(t('result.howRange'))}</p>
  </details>`;

  const source = t(r.type === 'maison' ? 'result.sourceMaison' : 'result.sourceAppartement', { date: formatDate(r.releveDate, lang), trimestre: r.indiceTrimestre.replace('T', ' T') });

  return `<section class="result" aria-labelledby="result-title">
  <div class="result-hero">
    <p class="sent-note"><svg class="seal" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle class="seal-ring" cx="24" cy="24" r="20"/><path class="seal-check" d="M15 24.5l6 6L33 18"/></svg><span>${esc(t('result.sent'))}</span></p>
    <h2 id="result-title" class="step-title" tabindex="-1">${esc(t('result.ready'))}</h2>
    <p class="hero-meta">${esc(t('result.subtitle', { type: typeLabel, commune: r.commune }))} · ${r.surface} m²</p>
    <p class="hero-label">${esc(t('result.mid'))}</p>
    <p class="hero-amount"><span class="sr-only">${eur(r.mid)} ${esc(t('result.perMonth'))}</span><span aria-hidden="true" data-countup="${r.mid}">${eur(r.mid)}</span><span class="hero-unit" aria-hidden="true"> / ${esc(t('result.perMonthShort'))}</span></p>
    <p class="hero-sub">${esc(t('result.midText'))} · ${esc(t('result.perM2', { value: m2(r.perM2, lang) }))}</p>
  </div>
  <section class="range-block" aria-labelledby="range-title">
    <h3 id="range-title" class="sr-only">${esc(t('result.rangeTitle'))}</h3>
    <div class="range-viz" aria-hidden="true"><span class="rv-low"></span><span class="rv-mid"></span><span class="rv-high"></span></div>
    <div class="values">
      <div class="value-card value-low"><p class="value-label">${esc(t('result.low'))}</p><p class="value-amount">${eur(r.low)}</p><p class="value-text">${esc(t('result.lowText'))}</p></div>
      <div class="value-card value-high"><p class="value-label">${esc(t('result.high'))}</p><p class="value-amount">${eur(r.high)}</p><p class="value-text">${esc(t('result.highText'))}</p></div>
    </div>
  </section>
  ${reliability}
  ${o.copieA ? `<p class="copie" data-testid="copie">${icon('info', 'ico ico-sm')}<span>${esc(t('result.copie', { email: o.copieA }))}</span></p>` : ''}
  <p class="disclaimer" data-testid="disclaimer">${esc(t('result.disclaimer'))}</p>
  ${ctaGestion}${ctaRdv}${call}
  ${legal}
  ${stats}
  ${factorsHtml}
  ${how}
  <p class="source">${esc(source)} <a href="${esc(r.type === 'maison' ? 'https://data.public.lu/fr/datasets/loyers-annonces-des-logements-par-commune/' : 'https://logement.public.lu/fr/publications/observatoire/rapport-analyse-24.html')}" target="_blank" rel="noopener">${esc(t('result.sourceLink'))}</a></p>
  <section class="panel next" aria-labelledby="next-title">
    <h3 id="next-title">${icon('drapeau', 'ico ico-sm')}<span>${esc(t('result.nextTitle'))}</span></h3>
    ${agentCard(o)}
    <ol>
      <li>${esc(t('result.next1'))}</li>
      <li>${esc(t('result.next2'))}</li>
    </ol>
  </section>
  <div class="result-actions">
    <button type="button" class="btn btn-ghost" data-action="print">${icon('imprimer')}<span>${esc(t('result.print'))}</span></button>
    <button type="button" class="btn btn-ghost" data-action="restart">${icon('recommencer')}<span>${esc(t('result.restart'))}</span></button>
  </div>
</section>`;
}
