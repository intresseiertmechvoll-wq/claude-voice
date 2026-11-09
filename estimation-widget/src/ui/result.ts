/** Écran de résultat (fonction pure : renvoie du HTML, testée) */
import { LOCALES, type T } from '../i18n';
import type { Lang, PublicResult } from '../shared/types';
import { esc } from './html';

export function formatEuro(v: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export function renderResult(r: PublicResult, t: T, lang: Lang, contactUrl: string): string {
  const cta = `<a class="btn btn-primary btn-block" href="${esc(contactUrl)}" target="_top" rel="noopener">${esc(t('result.cta'))}</a>`;

  if (r.status !== 'ok' || r.market === null || r.low === null || r.high === null) {
    return `<section class="result" aria-labelledby="result-title">
  <h2 id="result-title" class="step-title" tabindex="-1">${esc(t('result.noDataTitle'))}</h2>
  <p class="lead">${esc(t('result.noDataText'))}</p>
  ${cta}
</section>`;
  }

  const periode = `${formatDate(r.periodeDebut, lang)} – ${formatDate(r.periodeFin, lang)}`;
  const source = t(r.type === 'maison' ? 'result.sourceMaison' : 'result.sourceAppartement');
  const typeLabel = t(`fields.typeOptions.${r.type}`);
  const card = (key: 'low' | 'market' | 'high', value: number) => `
    <div class="value-card value-${key}">
      <p class="value-label">${esc(t(`result.${key}`))}</p>
      <p class="value-amount">${esc(formatEuro(value, lang))}</p>
      <p class="value-text">${esc(t(`result.${key}Text`))}</p>
    </div>`;

  return `<section class="result" aria-labelledby="result-title">
  <p class="sent-note">${esc(t('result.sent'))}</p>
  <h2 id="result-title" class="step-title" tabindex="-1">${esc(t('result.title'))}</h2>
  <p class="lead">${esc(t('result.subtitle', { type: typeLabel, commune: r.commune }))}</p>
  ${
    r.indicative
      ? `<div class="indicative" role="note" data-testid="indicative">
    <p class="indicative-title">${esc(t('result.indicativeTitle'))}</p>
    <p>${esc(t('result.indicativeHouse'))}</p>
  </div>`
      : ''
  }
  <div class="values">${card('market', r.market)}${card('low', r.low)}${card('high', r.high)}</div>
  <p class="source">${esc(t('result.source', { source, periode }))} <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(t('result.sourceLink'))}</a></p>
  <p class="disclaimer">${esc(t('result.disclaimer'))}</p>
  ${cta}
</section>`;
}
