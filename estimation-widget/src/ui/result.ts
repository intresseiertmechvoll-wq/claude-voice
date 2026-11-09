/** Écran de résultat (fonction pure : renvoie du HTML, testée) */
import { deCanton, LOCALES, type T } from '../i18n';
import type { Lang, PublicFactor, PublicResult } from '../shared/types';
import { esc } from './html';
import { icon } from './icons';

export interface ResultOptions {
  contactUrl: string;
  agent?: { name: string; role: string; photo?: string };
  phone?: string;
}

export function formatEuro(v: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function pct(v: number, lang: Lang): string {
  const n = new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 }).format(Math.abs(v * 100));
  return `${v > 0 ? '+' : '−'}${n} %`;
}

function factorLabel(f: PublicFactor, t: T): string {
  if (f.key.startsWith('energie_')) return t('factors.energie', { c: f.key.slice(8) });
  return t(`factors.${f.key}`, { n: String(f.qty ?? '') });
}

function agentCard(t: T, o: ResultOptions): string {
  if (!o.agent?.name) return '';
  const avatar = o.agent.photo
    ? `<img class="avatar" src="${esc(o.agent.photo)}" alt="" width="56" height="56">`
    : `<span class="avatar" aria-hidden="true">${esc(o.agent.name.charAt(0))}</span>`;
  return `<div class="agent">${avatar}<div><p class="agent-name">${esc(o.agent.name)}</p><p class="agent-role">${esc(o.agent.role)}</p></div></div>`;
}

export function renderResult(r: PublicResult, t: T, lang: Lang, opts: ResultOptions | string): string {
  const o: ResultOptions = typeof opts === 'string' ? { contactUrl: opts } : opts;
  const cta = `<a class="btn btn-primary btn-block" href="${esc(o.contactUrl)}" target="_top" rel="noopener">${icon('rdv')}<span>${esc(t('result.cta'))}</span></a>`;
  const call = o.phone ? `<a class="btn btn-secondary btn-block" href="tel:${esc(o.phone.replace(/\s/g, ''))}" target="_top">${esc(o.phone)}</a>` : '';
  const actions = `<div class="result-actions">
    <button type="button" class="btn btn-ghost" data-action="print">${icon('imprimer')}<span>${esc(t('result.print'))}</span></button>
    <button type="button" class="btn btn-ghost" data-action="restart">${icon('recommencer')}<span>${esc(t('result.restart'))}</span></button>
  </div>`;

  if (r.status !== 'ok' || r.market === null || r.low === null || r.high === null) {
    return `<section class="result" aria-labelledby="result-title">
  <div class="result-hero hero-nodata">
    <span class="hero-badge">${icon('check')}</span>
    <h2 id="result-title" class="step-title" tabindex="-1">${esc(t('result.noDataTitle'))}</h2>
    <p class="hero-sub">${esc(t('result.noDataText'))}</p>
  </div>
  ${agentCard(t, o)}
  ${cta}${call}
  ${actions}
</section>`;
  }

  const periode = `${formatDate(r.periodeDebut, lang)} – ${formatDate(r.periodeFin, lang)}`;
  const source = t(r.type === 'maison' ? 'result.sourceMaison' : 'result.sourceAppartement');
  const typeLabel = t(`fields.typeOptions.${r.type}`);
  const eur = (v: number) => esc(formatEuro(v, lang));
  const perM2 = r.pricePerM2 ? formatEuro(r.pricePerM2, lang) : null;

  /* Position du bien parmi les ventes de la commune (appartements avec fourchette publiée) */
  const s = r.communeStats;
  let gauge = '';
  if (s && r.type === 'appartement' && s.notarieMinM2 && s.notarieMaxM2 && s.notarieM2 && r.pricePerM2) {
    const span = s.notarieMaxM2 - s.notarieMinM2;
    const pos = (v: number) => Math.round(Math.min(100, Math.max(0, ((v - s.notarieMinM2!) / span) * 100)));
    gauge = `<section class="panel" aria-labelledby="gauge-title">
    <h3 id="gauge-title">${icon('donnees', 'ico ico-sm')}<span>${esc(t('result.gaugeTitle', { commune: r.commune }))}</span></h3>
    <div class="gauge" role="img" aria-label="${esc(`${t('result.gaugeYou')} : ${perM2} / m² · ${t('result.gaugeAvg')} : ${formatEuro(s.notarieM2, lang)} / m² · ${formatEuro(s.notarieMinM2, lang)} – ${formatEuro(s.notarieMaxM2, lang)}`)}">
      <div class="gauge-track"></div>
      <div class="gauge-mark mark-avg" data-pos="${pos(s.notarieM2)}"><span>${esc(t('result.gaugeAvg'))}<br><strong>${eur(s.notarieM2)}</strong></span></div>
      <div class="gauge-mark mark-you" data-pos="${pos(r.pricePerM2)}"><span>${esc(t('result.gaugeYou'))}<br><strong>${esc(perM2!)}</strong></span></div>
    </div>
    <div class="gauge-ends"><span>${eur(s.notarieMinM2)} / m²</span><span>${eur(s.notarieMaxM2)} / m²</span></div>
    <p class="small">${esc(t('result.gaugeText', { debut: formatDate(r.periodeDebut, lang), fin: formatDate(r.periodeFin, lang) }))}</p>
  </section>`;
  }

  const stats =
    s && r.pricePerM2
      ? `<section class="panel" aria-labelledby="stats-title">
    <h3 id="stats-title">${icon('epingle', 'ico ico-sm')}<span>${esc(t('result.communeTitle', { commune: r.commune }))}</span></h3>
    <div class="stats">
      ${s.notarieM2 ? `<div class="stat"><p class="stat-label">${esc(t('result.statNotarie'))}</p><p class="stat-value">${eur(s.notarieM2)}<small> / m²</small></p><p class="stat-sub">${esc(t('result.statNotarieSub', { n: String(s.ventes) }))}</p></div>` : ''}
      ${s.annonceM2 ? `<div class="stat"><p class="stat-label">${esc(t(r.type === 'maison' ? 'result.statAnnonceMaison' : 'result.statAnnonceAppartement'))}</p><p class="stat-value">${eur(s.annonceM2)}<small> / m²</small></p><p class="stat-sub">${esc(t('result.statAnnonceSub', { n: String(s.offres) }))}</p></div>` : ''}
      <div class="stat stat-you"><p class="stat-label">${esc(t('result.statYou'))}</p><p class="stat-value">${esc(perM2!)}<small> / m²</small></p><p class="stat-sub">${esc(t('result.statYouSub', { n: String(r.surface) }))}</p></div>
    </div>
    ${s.notarieFromCanton ? `<p class="small">${esc(t('result.statCanton', { deCanton: deCanton(s.canton, lang) }))}</p>` : ''}
  </section>`
      : '';

  const factors = r.factors ?? [];
  const factorsHtml = `<section class="panel" aria-labelledby="factors-title">
    <h3 id="factors-title">${icon('hausse', 'ico ico-sm')}<span>${esc(t('result.factorsTitle'))}</span></h3>
    ${
      factors.length
        ? `<ul class="factors">${factors
            .map((f) => {
              const up = f.value > 0;
              const val = f.kind === 'eur' ? `+${formatEuro(f.value, lang)}` : pct(f.value, lang);
              return `<li class="${up ? 'up' : 'down'}"><span class="factor-ico">${icon(up ? 'hausse' : 'baisse', 'ico ico-sm')}</span><span class="factor-label">${esc(factorLabel(f, t))}</span><span class="factor-val">${esc(val)}</span></li>`;
            })
            .join('')}</ul>${r.factorsCapped ? `<p class="small">${esc(t('result.factorsCapped'))}</p>` : ''}`
        : `<p class="small">${esc(t('result.factorsNone'))}</p>`
    }
  </section>`;

  const rel = r.reliability;
  const relText = rel ? t(`result.reliabilityText.${r.type}.${rel}`) : '';
  const reliability = rel
    ? `<div class="reliability rel-${rel}">
    <span class="rel-bars" aria-hidden="true"><i></i><i></i><i></i></span>
    <p><strong>${esc(t('result.reliabilityTitle'))} : ${esc(t(`result.reliability.${rel}`))}</strong><br>${esc(relText)}</p>
  </div>`
    : '';

  const how = `<details class="how">
    <summary>${icon('info', 'ico ico-sm')}<span>${esc(t('result.howTitle'))}</span></summary>
    <p>${esc(t(r.type === 'maison' ? 'result.howMaison' : 'result.howAppartement'))}</p>
    ${
      r.methods?.length
        ? `<ul>${r.methods
            .map((m) => `<li>${esc(t('result.methodLine', { name: t(`result.methods.${m.key}`), m2: formatEuro(m.m2, lang), weight: `${Math.round(m.weight * 100)} %` }))}</li>`)
            .join('')}</ul>`
        : ''
    }
  </details>`;

  return `<section class="result" aria-labelledby="result-title">
  <div class="result-hero">
    <p class="sent-note">${icon('check', 'ico ico-xs')}<span>${esc(t('result.sent'))}</span></p>
    <h2 id="result-title" class="step-title" tabindex="-1">${esc(t('result.ready'))}</h2>
    <p class="hero-meta">${esc(t('result.subtitle', { type: typeLabel, commune: r.commune }))}${r.surface ? ` · ${r.surface} m²` : ''}</p>
    <p class="hero-label">${esc(t('result.market'))}</p>
    <p class="hero-amount"><span class="sr-only">${eur(r.market)}</span><span aria-hidden="true" data-countup="${r.market}">${eur(r.market)}</span></p>
    <p class="hero-sub">${esc(t('result.marketText'))}${perM2 ? ` · ${esc(t('result.perM2', { value: perM2 }))}` : ''}</p>
  </div>
  ${
    r.indicative
      ? `<div class="indicative" role="note" data-testid="indicative">
    <p class="indicative-title">${icon('info', 'ico ico-sm')}<span>${esc(t('result.indicativeTitle'))}</span></p>
    <p>${esc(t('result.indicativeHouse'))}</p>
  </div>`
      : ''
  }
  <section class="range-block" aria-labelledby="range-title">
    <h3 id="range-title" class="sr-only">${esc(t('result.rangeTitle'))}</h3>
    <div class="range-viz" aria-hidden="true"><span class="rv-low"></span><span class="rv-mid"></span><span class="rv-high"></span></div>
    <div class="values">
      <div class="value-card value-low"><p class="value-label">${esc(t('result.low'))}</p><p class="value-amount">${eur(r.low)}</p><p class="value-text">${esc(t('result.lowText'))}</p></div>
      <div class="value-card value-high"><p class="value-label">${esc(t('result.high'))}</p><p class="value-amount">${eur(r.high)}</p><p class="value-text">${esc(t('result.highText'))}</p></div>
    </div>
  </section>
  ${reliability}
  <p class="source">${esc(t('result.source', { source, periode }))} <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(t('result.sourceLink'))}</a></p>
  <p class="disclaimer">${esc(t('result.disclaimer'))}</p>
  ${cta}${call}
  ${gauge}
  ${stats}
  ${factorsHtml}
  ${how}
  <section class="panel next" aria-labelledby="next-title">
    <h3 id="next-title">${icon('drapeau', 'ico ico-sm')}<span>${esc(t('result.nextTitle'))}</span></h3>
    ${agentCard(t, o)}
    <ol>
      <li>${esc(t('result.next1'))}</li>
      <li>${esc(t('result.next2'))}</li>
    </ol>
  </section>
  ${actions}
</section>`;
}
