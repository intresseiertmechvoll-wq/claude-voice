/** Bloc « Et si… ? » de l'écran de résultat (rendu HTML, testé) */
import type { T } from '../i18n';
import { ENERGIES, ETATS, POSTES_APPARTEMENT, POSTES_MAISON, type PropertyType } from '../shared/types';
import { esc } from './html';
import { icon } from './icons';

export interface WhatIfBase {
  type: PropertyType;
  etat: string;
  energie: string;
  postes: Record<string, string>;
}

const WORK_ICONS: Record<string, string> = { chassis: 'chassis', chauffage: 'chauffage', electricite: 'electricite', cuisine: 'cuisine', sanitaires: 'sanitaires', toiture: 'toiture' };

export function renderWhatIf(t: T, base: WhatIfBase, marketText: string): string {
  const letters = ENERGIES.filter((e) => e !== 'inconnu');
  const postes = (base.type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT).filter((p) => base.postes[p] !== 'neuf');
  return `<section class="panel whatif" aria-labelledby="whatif-title">
  <h3 id="whatif-title">${icon('neuf', 'ico ico-sm')}<span>${esc(t('whatif.title'))}</span></h3>
  <p class="small whatif-intro">${esc(t('whatif.text'))}</p>
  <fieldset class="field energy" id="wi_energie">
    <legend>${icon('feuille', 'ico ico-legend')}<span>${esc(t('whatif.energy'))}</span></legend>
    <div class="energy-scale-ends" aria-hidden="true"><span>${esc(t('fields.energieLow'))}</span><span>${esc(t('fields.energieHigh'))}</span></div>
    <div class="energy-bars">
      ${letters
        .map(
          (l) => `<label class="energy-opt e-${l === 'A+' ? 'Ap' : l}"><input type="radio" name="wi_energie" value="${l}"${base.energie === l ? ' checked' : ''}><span class="energy-bar"><span class="energy-letter">${l}</span><span class="option-check">${icon('check', 'ico ico-xs')}</span></span></label>`,
        )
        .join('')}
    </div>
  </fieldset>
  <fieldset class="field choices choices-chips n5" id="wi_etat">
    <legend>${icon('bon', 'ico ico-legend')}<span>${esc(t('whatif.etat'))}</span></legend>
    <div class="options">
      ${ETATS.map(
        (e) => `<label class="option"><input type="radio" name="wi_etat" value="${e}"${base.etat === e ? ' checked' : ''}><span class="option-box"><span class="option-text"><span class="option-label">${esc(t(`fields.etatOptions.${e}`))}</span></span></span></label>`,
      ).join('')}
    </div>
  </fieldset>
  ${
    postes.length
      ? `<fieldset class="field" id="wi_works">
    <legend>${icon('outils', 'ico ico-legend')}<span>${esc(t('whatif.works'))}</span></legend>
    <div class="works">
      ${postes
        .map(
          (p) => `<label class="work"><input type="checkbox" name="wi_work" value="${p}"><span class="work-box">${icon(WORK_ICONS[p], 'ico ico-sm')}<span>${esc(t(`whatif.worksItems.${p}`))}</span><span class="work-plus" aria-hidden="true">${icon('plus', 'ico ico-xs')}</span><span class="work-check" aria-hidden="true">${icon('check', 'ico ico-xs')}</span></span></label>`,
        )
        .join('')}
    </div>
  </fieldset>`
      : ''
  }
  <div class="whatif-out" aria-live="polite" aria-atomic="true">
    <p class="wo-label" id="wo-label">${esc(t('whatif.idle'))}</p>
    <p class="wo-value"><span id="wo-value">${esc(marketText)}</span> <span class="wo-delta" id="wo-delta"></span></p>
  </div>
  <div class="whatif-foot">
    <p class="small">${esc(t('whatif.note'))}</p>
    <button type="button" class="link-btn" data-action="whatif-reset">${icon('recommencer', 'ico ico-xs')}<span>${esc(t('whatif.reset'))}</span></button>
  </div>
</section>`;
}
