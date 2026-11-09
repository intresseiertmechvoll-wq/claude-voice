/** Rendu des 6 étapes du questionnaire (HTML) */
import { deCanton, type T } from '../i18n';
import type { Lang } from '../shared/types';
import { COMMUNES } from '../shared/communes';
import { DELAIS, ENERGIES, ETATS, MAISON_TYPES, OBJECTIFS, POSTES_APPARTEMENT, POSTES_MAISON, POSTE_NOTES } from '../shared/types';
import { LIMITS, PHONE_CODES, type Errors } from '../shared/validation';
import { esc } from './html';
import { icon } from './icons';

export type Values = Record<string, unknown>;

export interface Ctx {
  t: T;
  lang: Lang;
  v: Values;
  e: Errors;
  privacyUrl: string;
  quickCommunes: string[];
}

export const STEP_ICONS = ['epingle', 'regle', 'outils', 'garage', 'drapeau', 'personne'];
const POSTE_ICONS: Record<string, string> = { chassis: 'chassis', chauffage: 'chauffage', electricite: 'electricite', cuisine: 'cuisine', sanitaires: 'sanitaires', toiture: 'toiture' };
const ETAT_ICONS: Record<string, string> = { neuf: 'neuf', renove: 'renove', bon: 'bon', rafraichir: 'rafraichir', renover: 'renover' };
const DELAI_ICONS: Record<string, string> = { asap: 'asap', '3mois': 'calendrier', '3a6mois': 'calendrier2', plus_tard: 'sablier' };
const OBJECTIF_ICONS: Record<string, string> = { vendre: 'vendre', louer: 'louer', renseigne: 'renseigne' };

/* ---------- Briques ---------- */

function errorMessage(ctx: Ctx, name: string): string {
  const code = ctx.e[name];
  if (!code) return `<p class="field-error" id="${name}-error" hidden></p>`;
  const key = name === 'commune' && code !== 'required' ? 'errors.commune' : `errors.${code}`;
  return `<p class="field-error" id="${name}-error">${icon('info', 'ico ico-xs')}<span>${esc(ctx.t(key))}</span></p>`;
}

function describedBy(ctx: Ctx, name: string, help: boolean): string {
  const ids = [help ? `${name}-help` : '', ctx.e[name] ? `${name}-error` : ''].filter(Boolean).join(' ');
  return ids ? ` aria-describedby="${ids}"` : '';
}

const invalid = (ctx: Ctx, name: string) => (ctx.e[name] ? ' aria-invalid="true"' : '');
const hasErr = (ctx: Ctx, name: string) => (ctx.e[name] ? ' has-error' : '');

function labelText(ctx: Ctx, label: string, optional?: boolean) {
  return `${esc(label)}${optional ? ` <span class="optional">(${esc(ctx.t('optional'))})</span>` : ''}`;
}

function input(
  ctx: Ctx,
  name: string,
  label: string,
  o: { type?: string; help?: string; optional?: boolean; inputmode?: string; autocomplete?: string; placeholder?: string; suffix?: string; maxlength?: number } = {},
): string {
  const attrs = [
    `type="${o.type ?? 'text'}"`,
    `id="${name}"`,
    `name="${name}"`,
    `value="${esc(ctx.v[name] ?? '')}"`,
    o.inputmode ? `inputmode="${o.inputmode}"` : '',
    `autocomplete="${o.autocomplete ?? 'off'}"`,
    o.placeholder ? `placeholder="${esc(o.placeholder)}"` : '',
    o.maxlength ? `maxlength="${o.maxlength}"` : '',
    o.optional ? '' : 'aria-required="true"',
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="field${hasErr(ctx, name)}" data-field="${name}">
  <label for="${name}">${labelText(ctx, label, o.optional)}</label>
  ${o.help ? `<p class="help" id="${name}-help">${esc(o.help)}</p>` : ''}
  <div class="input-wrap${o.suffix ? ' has-suffix' : ''}"><input ${attrs}${invalid(ctx, name)}${describedBy(ctx, name, !!o.help)}>${o.suffix ? `<span class="suffix" aria-hidden="true">${esc(o.suffix)}</span>` : ''}</div>
  ${errorMessage(ctx, name)}
</div>`;
}

type Opt = { value: string; label: string; icon?: string; hint?: string };

/** Choix unique sous forme de cartes (avec icône) ou de pastilles */
function choices(ctx: Ctx, name: string, legend: string, options: Opt[], variant: 'cards' | 'tiles' | 'chips' | 'list' = 'cards', legendIcon?: string): string {
  const err = ctx.e[name] ? ` aria-describedby="${name}-error"` : '';
  return `<fieldset class="field choices choices-${variant} n${options.length}${hasErr(ctx, name)}" id="${name}" data-field="${name}"${err}>
  <legend>${legendIcon ? icon(legendIcon, 'ico ico-legend') : ''}<span>${esc(legend)}</span></legend>
  ${errorMessage(ctx, name)}
  <div class="options">
    ${options
      .map(
        (o) => `<label class="option">
      <input type="radio" name="${name}" value="${esc(o.value)}"${String(ctx.v[name] ?? '') === o.value ? ' checked' : ''}${invalid(ctx, name)}>
      <span class="option-box">
        ${o.icon ? `<span class="option-icon">${icon(o.icon)}</span>` : ''}
        <span class="option-text"><span class="option-label">${esc(o.label)}</span>${o.hint ? `<span class="option-hint">${esc(o.hint)}</span>` : ''}</span>
        <span class="option-check">${icon('check', 'ico ico-xs')}</span>
      </span>
    </label>`,
      )
      .join('')}
  </div>
</fieldset>`;
}

/** Compteur − / + (chambres, garages…) */
function stepper(ctx: Ctx, name: string, label: string, lim: { min: number; max: number }, ico?: string): string {
  const val = String(ctx.v[name] ?? '');
  return `<div class="field stepper-field${hasErr(ctx, name)}" data-field="${name}">
  <label for="${name}">${ico ? icon(ico, 'ico ico-label') : ''}<span>${esc(label)}</span></label>
  <div class="stepper">
    <button type="button" class="stepper-btn" data-stepper="${name}" data-delta="-1" data-min="${lim.min}" data-max="${lim.max}" aria-label="${esc(ctx.t('fields.decrease', { label }))}">${icon('moins')}</button>
    <input type="text" id="${name}" name="${name}" value="${esc(val)}" inputmode="numeric" autocomplete="off" placeholder="–" maxlength="3" aria-required="true"${invalid(ctx, name)}${describedBy(ctx, name, false)}>
    <button type="button" class="stepper-btn" data-stepper="${name}" data-delta="1" data-min="${lim.min}" data-max="${lim.max}" aria-label="${esc(ctx.t('fields.increase', { label }))}">${icon('plus')}</button>
  </div>
  ${errorMessage(ctx, name)}
</div>`;
}

/** Nombre + curseur synchronisés (surface, terrain, terrasse) */
function slider(ctx: Ctx, name: string, label: string, sliderLabel: string, o: { min: number; max: number; step: number; help?: string; ico?: string; optional?: boolean }): string {
  const raw = String(ctx.v[name] ?? '');
  const n = Number(raw.replace(',', '.'));
  const pos = raw !== '' && Number.isFinite(n) ? Math.min(o.max, Math.max(o.min, n)) : o.min;
  return `<div class="field slider-field${hasErr(ctx, name)}" data-field="${name}">
  <label for="${name}">${o.ico ? icon(o.ico, 'ico ico-label') : ''}<span>${labelText(ctx, label, o.optional)}</span></label>
  ${o.help ? `<p class="help" id="${name}-help">${esc(o.help)}</p>` : ''}
  <div class="slider-row">
    <div class="input-wrap has-suffix slider-number"><input type="text" id="${name}" name="${name}" value="${esc(raw)}" inputmode="decimal" autocomplete="off" maxlength="6" aria-required="true"${invalid(ctx, name)}${describedBy(ctx, name, !!o.help)}><span class="suffix" aria-hidden="true">m²</span></div>
    <input type="range" class="range" data-sync="${name}" min="${o.min}" max="${o.max}" step="${o.step}" value="${pos}" aria-label="${esc(sliderLabel)}">
  </div>
  ${errorMessage(ctx, name)}
</div>`;
}

/** Interrupteur visuel (cave, jardin) */
function toggle(ctx: Ctx, name: string, label: string, hint: string, ico: string): string {
  return `<label class="toggle">
  <input type="checkbox" id="${name}" name="${name}"${ctx.v[name] === true ? ' checked' : ''}>
  <span class="toggle-box">
    <span class="option-icon">${icon(ico)}</span>
    <span class="option-text"><span class="option-label">${esc(label)}</span><span class="option-hint">${esc(hint)}</span></span>
    <span class="switch" aria-hidden="true"></span>
  </span>
</label>`;
}

const opts = (t: T, prefix: string, values: readonly string[], icons?: Record<string, string>, hints?: string): Opt[] =>
  values.map((value) => ({ value, label: t(`${prefix}.${value}`), icon: icons?.[value], hint: hints ? t(`${hints}.${value}`) : undefined }));

/* ---------- Résumé du bien ---------- */

export function recapItems(t: T, v: Values): { step: number; icon: string; text: string }[] {
  const items: { step: number; icon: string; text: string }[] = [];
  const has = (k: string) => v[k] !== undefined && v[k] !== null && String(v[k]) !== '';
  if (has('type')) items.push({ step: 1, icon: v.type === 'maison' ? 'maison' : 'appartement', text: `${t(`fields.typeOptions.${v.type}`)}${has('commune') ? ` · ${v.commune}` : ''}` });
  if (has('surface')) items.push({ step: 2, icon: 'regle', text: t('recap.surface', { n: String(v.surface) }) });
  if (has('chambres')) items.push({ step: 2, icon: 'personne', text: t('recap.chambres', { n: String(v.chambres) }) });
  if (has('energie') && v.energie !== 'inconnu') items.push({ step: 2, icon: 'feuille', text: t('recap.energie', { c: String(v.energie) }) });
  if (has('annee')) items.push({ step: 2, icon: 'calendrier', text: t('recap.annee', { n: String(v.annee) }) });
  if (v.type === 'maison' && has('terrain')) items.push({ step: 2, icon: 'jardin', text: t('recap.terrain', { n: String(v.terrain) }) });
  if (Number(v.garages) > 0) items.push({ step: 4, icon: 'garage', text: t('recap.garages', { n: String(v.garages) }) });
  if (Number(v.parkings) > 0) items.push({ step: 4, icon: 'parking', text: t('recap.parkings', { n: String(v.parkings) }) });
  if (Number(String(v.terrasse ?? '0').replace(',', '.')) > 0) items.push({ step: 4, icon: 'terrasse', text: t('recap.terrasse', { n: String(v.terrasse) }) });
  return items;
}

function recapCard(ctx: Ctx): string {
  const { t, v } = ctx;
  const rows: [number, string][] = [];
  const line = (step: number, parts: (string | false | undefined)[]) => {
    const txt = parts.filter(Boolean).join(' · ');
    if (txt) rows.push([step, txt]);
  };
  line(1, [t(`fields.typeOptions.${v.type}`), String(v.commune ?? ''), String(v.rue ?? '') || undefined]);
  line(2, [
    t('recap.surface', { n: String(v.surface) }),
    t('recap.chambres', { n: String(v.chambres) }),
    t('recap.sdb', { n: String(v.sdb) }),
    t(`fields.etatOptions.${v.etat}`),
    v.energie !== 'inconnu' && t('recap.energie', { c: String(v.energie) }),
    v.type === 'maison' ? t(`fields.maisonTypeOptions.${v.maisonType}`) : t(`fields.etageOptions.${v.etage}`),
  ]);
  const postes = v.type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT;
  const notGood = postes.filter((p) => v[`poste_${p}`] !== 'bon');
  line(3, notGood.length ? notGood.map((p) => `${t(`fields.postes.${p}`)} : ${t(`fields.posteShort.${v[`poste_${p}`]}`)}`) : [t('recap.allGood')]);
  line(4, [
    Number(v.garages) > 0 && t('recap.garages', { n: String(v.garages) }),
    Number(v.parkings) > 0 && t('recap.parkings', { n: String(v.parkings) }),
    v.cave === true && t('fields.cave'),
    Number(String(v.terrasse ?? '0').replace(',', '.')) > 0 && t('recap.terrasse', { n: String(v.terrasse) }),
    v.jardin === true && t('fields.jardin'),
  ]);
  line(5, [t(`fields.objectifOptions.${v.objectif}`), t(`fields.delaiOptions.${v.delai}`)]);
  return `<section class="recap" aria-labelledby="recap-title">
  <h3 id="recap-title">${icon(v.type === 'maison' ? 'maison' : 'appartement')}<span>${esc(t('recap.title'))}</span></h3>
  <ul>
    ${rows
      .map(
        ([step, txt]) => `<li><span>${esc(txt)}</span><button type="button" class="link-btn" data-goto="${step}" aria-label="${esc(t('recap.editStep', { step: t(`stepsShort.${step}`) }))}">${esc(t('recap.edit'))}</button></li>`,
      )
      .join('')}
  </ul>
</section>`;
}

/* ---------- Étapes ---------- */

function step1(ctx: Ctx): string {
  const { t, v } = ctx;
  const canton = COMMUNES.find((c) => c.name === v.commune)?.canton;
  return `${choices(ctx, 'type', t('fields.type'), opts(t, 'fields.typeOptions', ['appartement', 'maison'], { appartement: 'appartement', maison: 'maison' }, 'fields.typeHints'), 'tiles')}
<div class="field combobox${hasErr(ctx, 'commune')}" data-field="commune">
  <label for="commune" id="commune-label">${icon('epingle', 'ico ico-label')}<span>${esc(t('fields.commune'))}</span></label>
  <p class="help" id="commune-help">${esc(t('fields.communeHelp'))}</p>
  <div class="combo">
    <input type="text" id="commune" name="commune" value="${esc(v.commune ?? '')}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="commune-list" autocomplete="off" spellcheck="false" aria-required="true"${invalid(ctx, 'commune')}${describedBy(ctx, 'commune', true)}>
    <ul id="commune-list" role="listbox" aria-labelledby="commune-label" hidden></ul>
  </div>
  <p class="commune-canton" id="commune-canton" aria-live="polite">${canton ? `${icon('check', 'ico ico-xs')}${esc(t('fields.communeSelected', { deCanton: deCanton(canton, ctx.lang) }))}` : ''}</p>
  <div class="quick" role="group" aria-label="${esc(t('fields.communeQuick'))}">
    <span class="quick-label" aria-hidden="true">${esc(t('fields.communeQuick'))}</span>
    ${ctx.quickCommunes.map((c) => `<button type="button" class="pill${v.commune === c ? ' is-active' : ''}" data-commune="${esc(c)}" aria-pressed="${v.commune === c}">${esc(c)}</button>`).join('')}
  </div>
  <p class="sr-only" id="commune-status" role="status" aria-live="polite"></p>
  ${errorMessage(ctx, 'commune')}
</div>
${input(ctx, 'rue', t('fields.rue'), { optional: true, autocomplete: 'address-line1', maxlength: 120 })}`;
}

function energyScale(ctx: Ctx): string {
  const { t } = ctx;
  const name = 'energie';
  const err = ctx.e[name] ? ` aria-describedby="${name}-error energie-help"` : ' aria-describedby="energie-help"';
  const letters = ENERGIES.filter((e) => e !== 'inconnu');
  return `<fieldset class="field energy${hasErr(ctx, name)}" id="${name}" data-field="${name}"${err}>
  <legend>${icon('feuille', 'ico ico-legend')}<span>${esc(t('fields.energieLegend'))}</span></legend>
  <p class="help" id="energie-help">${esc(t('fields.energieHelp'))}</p>
  ${errorMessage(ctx, name)}
  <div class="energy-scale-ends" aria-hidden="true"><span>${esc(t('fields.energieLow'))}</span><span>${esc(t('fields.energieHigh'))}</span></div>
  <div class="energy-bars">
    ${letters
      .map(
        (l) => `<label class="energy-opt e-${l === 'A+' ? 'Ap' : l}">
      <input type="radio" name="${name}" value="${l}"${ctx.v[name] === l ? ' checked' : ''}${invalid(ctx, name)}>
      <span class="energy-bar"><span class="energy-letter">${l}</span><span class="option-check">${icon('check', 'ico ico-xs')}</span></span>
    </label>`,
      )
      .join('')}
    <label class="energy-opt energy-unknown">
      <input type="radio" name="${name}" value="inconnu"${ctx.v[name] === 'inconnu' ? ' checked' : ''}${invalid(ctx, name)}>
      <span class="energy-bar">${icon('inconnu', 'ico ico-sm')}<span>${esc(t('fields.energieUnknownShort'))}</span></span>
    </label>
  </div>
</fieldset>`;
}

function step2(ctx: Ctx): string {
  const { t, v } = ctx;
  const house = v.type === 'maison';
  return `${slider(ctx, 'surface', t('fields.surface'), t('fields.surfaceSlider'), { min: house ? 50 : 20, max: house ? 400 : 250, step: 1, help: t('fields.surfaceHelp'), ico: 'regle' })}
<div class="row">
  ${stepper(ctx, 'chambres', t('fields.chambres'), LIMITS.chambres)}
  ${stepper(ctx, 'sdb', t('fields.sdb'), { min: 0, max: LIMITS.sdb.max })}
</div>
${input(ctx, 'annee', t('fields.annee'), { help: t('fields.anneeHelp'), inputmode: 'numeric', placeholder: t('fields.anneePlaceholder'), maxlength: 4 })}
${choices(ctx, 'etat', t('fields.etat'), opts(t, 'fields.etatOptions', ETATS, ETAT_ICONS, 'fields.etatHints'), 'list')}
${energyScale(ctx)}
${
  house
    ? `${choices(ctx, 'maisonType', t('fields.maisonType'), opts(t, 'fields.maisonTypeOptions', MAISON_TYPES, { mitoyenne: 'mitoyenne', jumelee: 'jumelee', isolee: 'isolee' }), 'tiles')}
${slider(ctx, 'terrain', t('fields.terrain'), t('fields.terrainSlider'), { min: 0, max: 2000, step: 10, help: t('fields.terrainHelp'), ico: 'jardin' })}`
    : `${choices(ctx, 'etage', t('fields.etage'), ['0', '1', '2', '3', '4', '5'].map((value) => ({ value, label: t(`fields.etageChips.${value}`) })), 'chips', 'escalier')}
${choices(ctx, 'ascenseur', t('fields.ascenseur'), [{ value: 'oui', label: t('yes') }, { value: 'non', label: t('no') }], 'chips', 'ascenseur')}`
}`;
}

const POSTE_DOTS: Record<string, string> = { mauvais: 'd-bad', moyen: 'd-mid', bon: 'd-good', neuf: 'd-new', inconnu: 'd-unk' };

function step3(ctx: Ctx): string {
  const { t, v } = ctx;
  const postes = v.type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT;
  return `<div class="fill-all"><button type="button" class="link-btn" data-fill-all="bon">${icon('check', 'ico ico-xs')}<span>${esc(t('fields.allGood'))}</span></button></div>
${postes
  .map((p) => {
    const name = `poste_${p}`;
    const err = ctx.e[name] ? ` aria-describedby="${name}-error"` : '';
    return `<fieldset class="field poste${hasErr(ctx, name)}" id="${name}" data-field="${name}"${err}>
  <legend>${icon(POSTE_ICONS[p], 'ico ico-legend')}<span>${esc(t(`fields.postes.${p}`))}</span></legend>
  ${errorMessage(ctx, name)}
  <div class="rating">
    ${POSTE_NOTES.map(
      (n) => `<label class="rate">
      <input type="radio" name="${name}" value="${n}"${v[name] === n ? ' checked' : ''}${invalid(ctx, name)}${n === 'inconnu' ? ` aria-label="${esc(t('fields.posteUnknownLabel'))}"` : ''}>
      <span class="rate-box"><span class="dot ${POSTE_DOTS[n]}" aria-hidden="true"></span><span${n === 'inconnu' ? ' aria-hidden="true"' : ''}>${esc(t(`fields.posteShort.${n}`))}</span></span>
    </label>`,
    ).join('')}
  </div>
</fieldset>`;
  })
  .join('\n')}`;
}

function step4(ctx: Ctx): string {
  const { t, v } = ctx;
  return `<div class="row">
  ${stepper(ctx, 'garages', t('fields.garages'), LIMITS.garages, 'garage')}
  ${stepper(ctx, 'parkings', t('fields.parkings'), LIMITS.parkings, 'parking')}
</div>
<div class="toggles">
  ${toggle(ctx, 'cave', t('fields.cave'), t('fields.caveHint'), 'cave')}
  ${toggle(ctx, 'jardin', t('fields.jardin'), t('fields.jardinHint'), 'jardin')}
</div>
${slider(ctx, 'terrasse', t('fields.terrasse'), t('fields.terrasseSlider'), { min: 0, max: v.type === 'maison' ? 150 : 60, step: 1, help: t('fields.terrasseHelp'), ico: 'terrasse' })}`;
}

function step5(ctx: Ctx): string {
  const { t } = ctx;
  return `${choices(ctx, 'proprietaire', t('fields.proprietaire'), [
    { value: 'oui', label: t('fields.proprietaireOptions.oui'), icon: 'cle' },
    { value: 'non', label: t('fields.proprietaireOptions.non'), icon: 'personne' },
  ], 'tiles')}
${choices(ctx, 'objectif', t('fields.objectif'), opts(t, 'fields.objectifOptions', OBJECTIFS, OBJECTIF_ICONS, 'fields.objectifHints'), 'list')}
${choices(ctx, 'delai', t('fields.delai'), opts(t, 'fields.delaiOptions', DELAIS, DELAI_ICONS), 'tiles')}`;
}

function step6(ctx: Ctx): string {
  const { t } = ctx;
  const link = `<a href="${esc(ctx.privacyUrl)}" target="_blank" rel="noopener">${esc(t('fields.rgpdLink'))}</a>`;
  const phoneErr = ctx.e.numero || ctx.e.indicatif;
  return `${recapCard(ctx)}
<div class="row">
  ${input(ctx, 'prenom', t('fields.prenom'), { autocomplete: 'given-name', maxlength: 80 })}
  ${input(ctx, 'nom', t('fields.nom'), { autocomplete: 'family-name', maxlength: 80 })}
</div>
${input(ctx, 'email', t('fields.email'), { type: 'email', autocomplete: 'email', inputmode: 'email', maxlength: 254 })}
<fieldset class="field phone${phoneErr ? ' has-error' : ''}" data-field="numero">
  <legend><span>${esc(t('fields.telephone'))}</span></legend>
  <p class="help" id="numero-help">${esc(t('fields.numeroHelp'))}</p>
  <div class="phone-row">
    <div class="phone-code">
      <label for="indicatif" class="sr-only">${esc(t('fields.indicatif'))}</label>
      <select id="indicatif" name="indicatif" autocomplete="tel-country-code">
        ${PHONE_CODES.map((c) => `<option value="${c}"${(ctx.v.indicatif ?? '+352') === c ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="phone-number">
      <label for="numero" class="sr-only">${esc(t('fields.numero'))}</label>
      <input type="tel" id="numero" name="numero" value="${esc(ctx.v.numero ?? '')}" autocomplete="tel-national" inputmode="tel" maxlength="20" aria-required="true"${invalid(ctx, 'numero')}${describedBy(ctx, 'numero', true)}>
    </div>
  </div>
  ${errorMessage(ctx, 'numero')}
</fieldset>
<div class="field${hasErr(ctx, 'message')}" data-field="message">
  <label for="message">${labelText(ctx, t('fields.message'), true)}</label>
  <textarea id="message" name="message" rows="2" maxlength="2000"${describedBy(ctx, 'message', false)}>${esc(ctx.v.message ?? '')}</textarea>
  ${errorMessage(ctx, 'message')}
</div>
<div class="hp" aria-hidden="true">
  <label for="website">${esc(t('fields.honeypot'))}</label>
  <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" value="">
</div>
<div class="field checkbox${hasErr(ctx, 'rgpd')}" data-field="rgpd">
  <label class="check">
    <input type="checkbox" id="rgpd" name="rgpd"${ctx.v.rgpd === true ? ' checked' : ''} aria-required="true"${invalid(ctx, 'rgpd')}${describedBy(ctx, 'rgpd', false)}>
    <span>${esc(t('fields.rgpd')).replace('{link}', link)}</span>
  </label>
  ${errorMessage(ctx, 'rgpd')}
</div>
<ul class="trust">
  <li>${icon('cadeau', 'ico ico-sm')}<span>${esc(t('trust.free'))}</span></li>
  <li>${icon('bouclier', 'ico ico-sm')}<span>${esc(t('trust.data'))}</span></li>
  <li>${icon('check', 'ico ico-sm')}<span>${esc(t('trust.cookies'))}</span></li>
</ul>`;
}

const STEPS = [step1, step2, step3, step4, step5, step6];

export function renderStep(step: number, ctx: Ctx): string {
  return STEPS[step - 1](ctx);
}
