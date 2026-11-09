/** Rendu des 6 étapes du questionnaire (HTML) */
import type { T } from '../i18n';
import { DELAIS, ENERGIES, ETATS, MAISON_TYPES, OBJECTIFS, POSTES_APPARTEMENT, POSTES_MAISON, POSTE_NOTES } from '../shared/types';
import { LIMITS, PHONE_CODES, type Errors } from '../shared/validation';
import { esc } from './html';

export type Values = Record<string, unknown>;

interface Ctx {
  t: T;
  v: Values;
  e: Errors;
  privacyUrl: string;
}

function errorMessage(ctx: Ctx, name: string): string {
  const code = ctx.e[name];
  if (!code) return '';
  const key = name === 'commune' && code !== 'required' ? 'errors.commune' : `errors.${code}`;
  return `<p class="field-error" id="${name}-error">${esc(ctx.t(key))}</p>`;
}

function describedBy(ctx: Ctx, name: string, help: boolean): string {
  const ids = [help ? `${name}-help` : '', ctx.e[name] ? `${name}-error` : ''].filter(Boolean).join(' ');
  return ids ? ` aria-describedby="${ids}"` : '';
}

const invalid = (ctx: Ctx, name: string) => (ctx.e[name] ? ' aria-invalid="true"' : '');

function labelText(ctx: Ctx, label: string, optional?: boolean) {
  return `${esc(label)}${optional ? ` <span class="optional">(${esc(ctx.t('optional'))})</span>` : ''}`;
}

function input(
  ctx: Ctx,
  name: string,
  label: string,
  opts: { type?: string; help?: string; optional?: boolean; inputmode?: string; autocomplete?: string; min?: number; max?: number; step?: string; placeholder?: string; suffix?: string } = {},
): string {
  const type = opts.type ?? 'text';
  const attrs = [
    `type="${type}"`,
    `id="${name}"`,
    `name="${name}"`,
    `value="${esc(ctx.v[name] ?? '')}"`,
    opts.inputmode ? `inputmode="${opts.inputmode}"` : '',
    opts.autocomplete ? `autocomplete="${opts.autocomplete}"` : 'autocomplete="off"',
    opts.min !== undefined ? `min="${opts.min}"` : '',
    opts.max !== undefined ? `max="${opts.max}"` : '',
    opts.step ? `step="${opts.step}"` : '',
    opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : '',
    opts.optional ? '' : 'aria-required="true"',
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="field${ctx.e[name] ? ' has-error' : ''}">
  <label for="${name}">${labelText(ctx, label, opts.optional)}</label>
  ${opts.help ? `<p class="help" id="${name}-help">${esc(opts.help)}</p>` : ''}
  <div class="input-wrap${opts.suffix ? ' has-suffix' : ''}"><input ${attrs}${invalid(ctx, name)}${describedBy(ctx, name, !!opts.help)}>${opts.suffix ? `<span class="suffix" aria-hidden="true">${esc(opts.suffix)}</span>` : ''}</div>
  ${errorMessage(ctx, name)}
</div>`;
}

function select(ctx: Ctx, name: string, label: string, options: { value: string; label: string }[], help?: string): string {
  return `<div class="field${ctx.e[name] ? ' has-error' : ''}">
  <label for="${name}">${labelText(ctx, label)}</label>
  ${help ? `<p class="help" id="${name}-help">${esc(help)}</p>` : ''}
  <select id="${name}" name="${name}" aria-required="true"${invalid(ctx, name)}${describedBy(ctx, name, !!help)}>
    <option value="">${esc(ctx.t('fields.choose'))}</option>
    ${options.map((o) => `<option value="${esc(o.value)}"${String(ctx.v[name] ?? '') === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
  </select>
  ${errorMessage(ctx, name)}
</div>`;
}

function radios(ctx: Ctx, name: string, legend: string, options: { value: string; label: string }[], variant: 'cards' | 'chips' = 'cards'): string {
  const err = ctx.e[name] ? ` aria-describedby="${name}-error"` : '';
  return `<fieldset class="field radios radios-${variant}${ctx.e[name] ? ' has-error' : ''}" id="${name}"${err}>
  <legend>${esc(legend)}</legend>
  ${errorMessage(ctx, name)}
  <div class="options">
    ${options
      .map(
        (o, i) => `<label class="option">
      <input type="radio" name="${name}" value="${esc(o.value)}"${String(ctx.v[name] ?? '') === o.value ? ' checked' : ''}${i === 0 ? ' aria-required="true"' : ''}${invalid(ctx, name)}>
      <span>${esc(o.label)}</span>
    </label>`,
      )
      .join('')}
  </div>
</fieldset>`;
}

function yesNo(ctx: Ctx, name: string, legend: string): string {
  return radios(ctx, name, legend, [
    { value: 'oui', label: ctx.t('yes') },
    { value: 'non', label: ctx.t('no') },
  ]);
}

function checkbox(ctx: Ctx, name: string, labelHtml: string, required = false): string {
  return `<div class="field checkbox${ctx.e[name] ? ' has-error' : ''}">
  <label class="check">
    <input type="checkbox" id="${name}" name="${name}"${ctx.v[name] === true ? ' checked' : ''}${required ? ' aria-required="true"' : ''}${invalid(ctx, name)}${describedBy(ctx, name, false)}>
    <span>${labelHtml}</span>
  </label>
  ${errorMessage(ctx, name)}
</div>`;
}

const opts = (t: T, prefix: string, values: readonly string[]) => values.map((value) => ({ value, label: t(`${prefix}.${value}`) }));

function step1(ctx: Ctx): string {
  const { t } = ctx;
  return `${radios(ctx, 'type', t('fields.type'), opts(t, 'fields.typeOptions', ['appartement', 'maison']))}
<div class="field combobox${ctx.e.commune ? ' has-error' : ''}">
  <label for="commune" id="commune-label">${esc(t('fields.commune'))}</label>
  <p class="help" id="commune-help">${esc(t('fields.communeHelp'))}</p>
  <div class="combo">
    <input type="text" id="commune" name="commune" value="${esc(ctx.v.commune ?? '')}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="commune-list" autocomplete="off" spellcheck="false" aria-required="true"${invalid(ctx, 'commune')}${describedBy(ctx, 'commune', true)}>
    <ul id="commune-list" role="listbox" aria-labelledby="commune-label" hidden></ul>
  </div>
  <p class="sr-only" id="commune-status" role="status" aria-live="polite"></p>
  ${errorMessage(ctx, 'commune')}
</div>
${input(ctx, 'rue', t('fields.rue'), { optional: true, autocomplete: 'address-line1' })}`;
}

function step2(ctx: Ctx): string {
  const { t, v } = ctx;
  const house = v.type === 'maison';
  return `${input(ctx, 'surface', t('fields.surface'), { help: t('fields.surfaceHelp'), inputmode: 'decimal', suffix: 'm²' })}
<div class="row">
  ${input(ctx, 'chambres', t('fields.chambres'), { inputmode: 'numeric' })}
  ${input(ctx, 'sdb', t('fields.sdb'), { inputmode: 'numeric' })}
</div>
${input(ctx, 'annee', t('fields.annee'), { help: t('fields.anneeHelp'), inputmode: 'numeric', placeholder: '1990' })}
${radios(ctx, 'etat', t('fields.etat'), opts(t, 'fields.etatOptions', ETATS))}
${select(
  ctx,
  'energie',
  t('fields.energie'),
  ENERGIES.map((value) => ({ value, label: value === 'inconnu' ? t('fields.energieUnknown') : value })),
  t('fields.energieHelp'),
)}
${
  house
    ? `${radios(ctx, 'maisonType', t('fields.maisonType'), opts(t, 'fields.maisonTypeOptions', MAISON_TYPES))}
${input(ctx, 'terrain', t('fields.terrain'), { help: t('fields.terrainHelp'), inputmode: 'numeric', suffix: 'm²', max: LIMITS.terrain.max })}`
    : `${select(ctx, 'etage', t('fields.etage'), opts(t, 'fields.etageOptions', ['0', '1', '2', '3', '4', '5']))}
${yesNo(ctx, 'ascenseur', t('fields.ascenseur'))}`
}`;
}

function step3(ctx: Ctx): string {
  const { t, v } = ctx;
  const postes = v.type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT;
  return postes.map((p) => radios(ctx, `poste_${p}`, t(`fields.postes.${p}`), opts(t, 'fields.posteOptions', POSTE_NOTES), 'chips')).join('\n');
}

function step4(ctx: Ctx): string {
  const { t } = ctx;
  return `<div class="row">
  ${input(ctx, 'garages', t('fields.garages'), { inputmode: 'numeric' })}
  ${input(ctx, 'parkings', t('fields.parkings'), { inputmode: 'numeric' })}
</div>
${input(ctx, 'terrasse', t('fields.terrasse'), { inputmode: 'decimal', suffix: 'm²' })}
<div class="checks">
  ${checkbox(ctx, 'cave', esc(t('fields.cave')))}
  ${checkbox(ctx, 'jardin', esc(t('fields.jardin')))}
</div>`;
}

function step5(ctx: Ctx): string {
  const { t } = ctx;
  return `${yesNo(ctx, 'proprietaire', t('fields.proprietaire'))}
${radios(ctx, 'objectif', t('fields.objectif'), opts(t, 'fields.objectifOptions', OBJECTIFS))}
${radios(ctx, 'delai', t('fields.delai'), opts(t, 'fields.delaiOptions', DELAIS))}`;
}

function step6(ctx: Ctx): string {
  const { t } = ctx;
  const link = `<a href="${esc(ctx.privacyUrl)}" target="_blank" rel="noopener">${esc(t('fields.rgpdLink'))}</a>`;
  const phoneErr = ctx.e.numero || ctx.e.indicatif;
  return `<div class="row">
  ${input(ctx, 'prenom', t('fields.prenom'), { autocomplete: 'given-name' })}
  ${input(ctx, 'nom', t('fields.nom'), { autocomplete: 'family-name' })}
</div>
${input(ctx, 'email', t('fields.email'), { type: 'email', autocomplete: 'email', inputmode: 'email' })}
<fieldset class="field phone${phoneErr ? ' has-error' : ''}">
  <legend>${esc(t('fields.telephone'))}</legend>
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
      <input type="tel" id="numero" name="numero" value="${esc(ctx.v.numero ?? '')}" autocomplete="tel-national" inputmode="tel" aria-required="true"${invalid(ctx, 'numero')}${describedBy(ctx, 'numero', true)}>
    </div>
  </div>
  ${errorMessage(ctx, 'numero')}
</fieldset>
<div class="field${ctx.e.message ? ' has-error' : ''}">
  <label for="message">${labelText(ctx, t('fields.message'), true)}</label>
  <textarea id="message" name="message" rows="3" maxlength="2000"${describedBy(ctx, 'message', false)}>${esc(ctx.v.message ?? '')}</textarea>
  ${errorMessage(ctx, 'message')}
</div>
<div class="hp" aria-hidden="true">
  <label for="website">${esc(t('fields.honeypot'))}</label>
  <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" value="">
</div>
${checkbox(ctx, 'rgpd', esc(t('fields.rgpd')).replace('{link}', link), true)}
<p class="privacy-note">${esc(t('fields.privacyNote'))}</p>`;
}

const STEPS = [step1, step2, step3, step4, step5, step6];

export function renderStep(step: number, ctx: Ctx): string {
  return STEPS[step - 1](ctx);
}
