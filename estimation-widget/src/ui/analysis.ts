/**
 * Écran « Analyse de votre bien » affiché entre l'envoi et le résultat.
 *
 * Les étapes décrivent ce que le calcul fait réellement (réponses, données de la commune,
 * méthodes, ajustements, fourchette), avec les vrais chiffres dès que le serveur a répondu.
 * Seul le rythme est ralenti : voir l'étude « The Labor Illusion » (Buell & Norton, 2011).
 * La durée totale se règle dans config.json (analysis.totalMs ; 0 = pas d'attente).
 */
import type { T } from '../i18n';
import type { PropertyType, PublicResult } from '../shared/types';
import { esc } from './html';
import { icon } from './icons';

export type StepKey = 'gather' | 'data' | 'compare' | 'adjust' | 'final';

export interface PlanStep {
  key: StepKey;
  icon: string;
  ms: number;
}

const SHARES: [StepKey, string, number][] = [
  ['gather', 'personne', 0.16],
  ['data', 'donnees', 0.24],
  ['compare', 'regle', 0.24],
  ['adjust', 'outils', 0.2],
  ['final', 'check', 0.16],
];

/** Les 5 étapes et leur durée (la somme vaut totalMs) */
export function analysisPlan(totalMs: number): PlanStep[] {
  const total = Math.max(0, totalMs);
  return SHARES.map(([key, ic, share]) => ({ key, icon: ic, ms: Math.round(total * share) }));
}

/** Texte d'une étape ; « result » est connu dès que le serveur a répondu */
export function stepTexts(
  key: StepKey,
  t: T,
  ctx: { type: PropertyType; commune: string; surface: string; answers: number },
  result: PublicResult | null,
): { title: string; detail: string } {
  const title = t(`analysis.steps.${key}.title`, { commune: ctx.commune });
  const type = t(`fields.typeOptions.${ctx.type}`);
  let detail = t(`analysis.steps.${key}.${key === 'compare' || key === 'adjust' ? ctx.type : 'detail'}`, { commune: ctx.commune });
  if (key === 'gather') detail = t('analysis.steps.gather.detail', { n: ctx.answers, type, surface: ctx.surface, commune: ctx.commune });
  if (result && key === 'data') {
    const s = result.communeStats;
    if (result.status !== 'ok') detail = t('analysis.steps.data.none', { commune: ctx.commune });
    else if (s && ctx.type === 'appartement' && s.notarieM2 && s.ventes) detail = t('analysis.steps.data.found', { ventes: s.ventes, offres: s.offres ?? 0, commune: ctx.commune });
    else if (s && ctx.type === 'appartement' && s.notarieFromCanton) detail = t('analysis.steps.data.canton', { offres: s.offres ?? 0, commune: ctx.commune });
    else if (s?.offres) detail = t('analysis.steps.data.foundHouse', { offres: s.offres, commune: ctx.commune });
  }
  if (result?.status === 'ok' && key === 'adjust') {
    const n = result.factors?.length ?? 0;
    detail = n === 0 ? t('analysis.steps.adjust.none') : n === 1 ? t('analysis.steps.adjust.count1') : t('analysis.steps.adjust.count', { n });
  }
  return { title, detail };
}

export function renderAnalysis(plan: PlanStep[], t: T, meta: string): string {
  return `<section class="analysis" aria-labelledby="analysis-title">
  <div class="house" aria-hidden="true">
    <svg viewBox="0 0 120 112" width="132" height="124">
      <defs><clipPath id="house-clip"><path d="M60 6 L114 50 L106 50 L106 106 L14 106 L14 50 L6 50 Z"/></clipPath></defs>
      <g clip-path="url(#house-clip)">
        <rect x="0" y="0" width="120" height="112" class="house-bg"/>
        <g class="house-fill" id="house-fill">
          <rect x="0" y="0" width="120" height="112" class="house-water"/>
          <rect x="0" y="0" width="120" height="3" class="house-line"/>
        </g>
      </g>
      <path d="M60 6 L114 50 L106 50 L106 106 L14 106 L14 50 L6 50 Z" class="house-outline"/>
      <path d="M50 106 V80 H70 V106" class="house-door"/>
      <rect x="26" y="60" width="16" height="14" rx="2" class="house-win"/>
      <rect x="78" y="60" width="16" height="14" rx="2" class="house-win"/>
    </svg>
    <p class="analysis-pct"><span id="analysis-pct">0</span> %</p>
  </div>
  <h2 id="analysis-title" class="step-title" tabindex="-1">${esc(t('analysis.title'))}</h2>
  <p class="analysis-meta">${esc(meta)}</p>
  <div class="analysis-bar" role="progressbar" aria-labelledby="analysis-title" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="analysis-bar"><span id="analysis-bar-fill"></span></div>
  <ol class="analysis-steps">
    ${plan
      .map(
        (s, i) => `<li class="astep" data-i="${i}">
      <span class="astep-ico"><span class="astep-num" aria-hidden="true">${icon(s.icon, 'ico ico-sm')}</span><span class="spinner spinner-dark" aria-hidden="true"></span><span class="astep-done" aria-hidden="true">${icon('check', 'ico ico-sm')}</span></span>
      <div class="astep-text"><p class="astep-title"></p><p class="astep-detail"></p></div>
    </li>`,
      )
      .join('')}
  </ol>
  <p class="sr-only" role="status" aria-live="polite" id="analysis-live"></p>
</section>`;
}
