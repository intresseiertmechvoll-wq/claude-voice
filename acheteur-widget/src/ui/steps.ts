/** Rendu des 5 étapes du questionnaire (HTML) */
import type { T } from '../i18n';
import {
  ACHATS,
  BANQUE,
  BELLEGEN,
  CAPACITE,
  DELAIS,
  EXTERIEURS,
  MANDAT,
  NEUF,
  PREMIER,
  RENOVER,
  REVENUS,
  TYPES,
  USAGES,
  VENDRE,
  VISITES,
  type Lang,
} from '../shared/types';
import { LIMITS, parseMoney, PHONE_CODES, type Errors } from '../shared/validation';
import { formatEuro } from './format';
import { esc } from './html';
import { icon } from './icons';

export type Values = Record<string, unknown>;

export interface Ctx {
  t: T;
  lang: Lang;
  v: Values;
  e: Errors;
  privacyUrl: string;
  estimationUrl: string;
  quickCommunes: string[];
  /** nom du courtier montré à côté de la case ; vide = pas de nom */
  courtierNomPublic: string;
  /** lien « en savoir plus » à côté de la case courtier (section courtier de la politique de confidentialité) */
  courtierInfoUrl?: string;
}

export const STEP_ICONS = ['cle', 'epingle', 'donnees', 'calendrier', 'personne'];

/* ---------- Briques ---------- */

/** Message d'erreur adapté au champ */
export function errorKey(name: string, code: string): string {
  if (code === 'required' && name !== 'communes') return 'errors.required';
  if (name === 'communes') return code === 'communes_max' ? 'errors.communes_max' : 'errors.communes';
  if (name === 'prix' && code === 'range') return 'errors.prixRange';
  if (['apport', 'prix', 'capaciteMontant', 'valeurVente', 'restePret'].includes(name) && code === 'invalid') return 'errors.money';
  return `errors.${code}`;
}

function errorMessage(ctx: Ctx, name: string): string {
  const code = ctx.e[name];
  if (!code) return `<p class="field-error" id="${name}-error" hidden></p>`;
  return `<p class="field-error" id="${name}-error">${icon('info', 'ico ico-xs')}<span>${esc(ctx.t(errorKey(name, code)))}</span></p>`;
}

function describedBy(ctx: Ctx, name: string, help: boolean): string {
  const ids = [help ? `${name}-help` : '', ctx.e[name] ? `${name}-error` : ''].filter(Boolean).join(' ');
  return ids ? ` aria-describedby="${ids}"` : '';
}

const invalid = (ctx: Ctx, name: string) => (ctx.e[name] ? ' aria-invalid="true"' : '');
const hasErr = (ctx: Ctx, name: string) => (ctx.e[name] ? ' has-error' : '');

function labelText(ctx: Ctx, label: string, optional?: boolean, requis = false) {
  return `${esc(label)}${optional ? ` <span class="optional"${requis ? ' hidden' : ''}>(${esc(ctx.t('optional'))})</span>` : ''}`;
}

/** « Reste à rembourser » devient obligatoire dès qu'une valeur de vente est donnée (même règle que validation.ts) */
export const restePretRequis = (v: Values) => String(v.valeurVente ?? '').trim() !== '';

function input(
  ctx: Ctx,
  name: string,
  label: string,
  o: { type?: string; help?: string; optional?: boolean; requis?: boolean; inputmode?: string; autocomplete?: string; placeholder?: string; suffix?: string; maxlength?: number } = {},
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
    o.optional && !o.requis ? '' : 'aria-required="true"',
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="field${hasErr(ctx, name)}" data-field="${name}">
  <label for="${name}">${labelText(ctx, label, o.optional, o.requis)}</label>
  ${o.help ? `<p class="help" id="${name}-help">${esc(o.help)}</p>` : ''}
  <div class="input-wrap${o.suffix ? ' has-suffix' : ''}"><input ${attrs}${invalid(ctx, name)}${describedBy(ctx, name, !!o.help)}>${o.suffix ? `<span class="suffix" aria-hidden="true">${esc(o.suffix)}</span>` : ''}</div>
  ${errorMessage(ctx, name)}
</div>`;
}

/** Montant en euros */
const money = (ctx: Ctx, name: string, label: string, help?: string, optional?: boolean, requis = false) =>
  input(ctx, name, label, { inputmode: 'decimal', suffix: '€', help, optional, requis, maxlength: 16, placeholder: name === 'apport' ? '60 000' : name === 'prix' ? '600 000' : '' });

type Opt = { value: string; label: string; icon?: string; hint?: string };

/** Choix unique sous forme de cartes (avec icône) ou de pastilles */
function choices(ctx: Ctx, name: string, legend: string, options: Opt[], variant: 'tiles' | 'chips' | 'list' = 'tiles', o: { help?: string; optional?: boolean } = {}): string {
  const ids = [o.help ? `${name}-help` : '', ctx.e[name] ? `${name}-error` : ''].filter(Boolean).join(' ');
  return `<fieldset class="field choices choices-${variant} n${options.length}${hasErr(ctx, name)}" id="${name}" data-field="${name}"${ids ? ` aria-describedby="${ids}"` : ''}>
  <legend><span>${labelText(ctx, legend, o.optional)}</span></legend>
  ${o.help ? `<p class="help" id="${name}-help">${esc(o.help)}</p>` : ''}
  ${errorMessage(ctx, name)}
  <div class="options">
    ${options
      .map(
        (op) => `<label class="option">
      <input type="radio" name="${name}" value="${esc(op.value)}"${String(ctx.v[name] ?? '') === op.value ? ' checked' : ''}${invalid(ctx, name)}>
      <span class="option-box">
        ${op.icon ? `<span class="option-icon">${icon(op.icon)}</span>` : ''}
        <span class="option-text"><span class="option-label">${esc(op.label)}</span>${op.hint ? `<span class="option-hint">${esc(op.hint)}</span>` : ''}</span>
        <span class="option-check">${icon('check', 'ico ico-xs')}</span>
      </span>
    </label>`,
      )
      .join('')}
  </div>
</fieldset>`;
}

/** Compteur − / + */
function stepper(ctx: Ctx, name: string, label: string, lim: { min: number; max: number }): string {
  const val = String(ctx.v[name] ?? '');
  return `<div class="field stepper-field${hasErr(ctx, name)}" data-field="${name}">
  <label for="${name}"><span>${esc(label)}</span></label>
  <div class="stepper">
    <button type="button" class="stepper-btn" data-stepper="${name}" data-delta="-1" data-min="${lim.min}" data-max="${lim.max}" aria-label="${esc(ctx.t('fields.decrease', { label }))}">${icon('moins')}</button>
    <input type="text" id="${name}" name="${name}" value="${esc(val)}" inputmode="numeric" autocomplete="off" placeholder="–" maxlength="2" aria-required="true"${invalid(ctx, name)}${describedBy(ctx, name, false)}>
    <button type="button" class="stepper-btn" data-stepper="${name}" data-delta="1" data-min="${lim.min}" data-max="${lim.max}" aria-label="${esc(ctx.t('fields.increase', { label }))}">${icon('plus')}</button>
  </div>
  ${errorMessage(ctx, name)}
</div>`;
}

/** Interrupteur visuel */
function toggle(ctx: Ctx, name: string, label: string, hint: string, ico: string): string {
  return `<label class="toggle">
  <input type="checkbox" id="${name}" name="${name}"${ctx.v[name] === true ? ' checked' : ''}>
  <span class="toggle-box">
    <span class="option-icon">${icon(ico)}</span>
    <span class="option-text"><span class="option-label">${esc(label)}</span>${hint ? `<span class="option-hint">${esc(hint)}</span>` : ''}</span>
    <span class="switch" aria-hidden="true"></span>
  </span>
</label>`;
}

/** Case à cocher facultative (texte long) */
function checkbox(ctx: Ctx, name: string, label: string, extra = ''): string {
  return `<div class="field checkbox" data-field="${name}">
  <label class="check">
    <input type="checkbox" id="${name}" name="${name}"${ctx.v[name] === true ? ' checked' : ''}>
    <span>${esc(label)}</span>
  </label>
  ${extra}
</div>`;
}

const opts = (t: T, prefix: string, values: readonly string[], icons?: Record<string, string>, hints?: string): Opt[] =>
  values.map((value) => ({ value, label: t(`${prefix}.${value}`), icon: icons?.[value], hint: hints ? t(`${hints}.${value}`) : undefined }));

/** Lien vers l'outil d'estimation, montré dès qu'un visiteur doit d'abord vendre */
export function vendreNote(ctx: Pick<Ctx, 't' | 'estimationUrl'>, vendre: unknown): string {
  if (vendre !== 'oui_lu') return '';
  return `${icon('info', 'ico ico-xs')}<span>${esc(ctx.t('fields.vendreNote'))} <a href="${esc(ctx.estimationUrl)}" target="_blank" rel="noopener">${esc(ctx.t('fields.vendreLink'))}</a></span>`;
}

/** Communes choisies (pastilles retirables) */
export function communeChips(ctx: Pick<Ctx, 't' | 'v'>): string {
  const list = Array.isArray(ctx.v.communes) ? (ctx.v.communes as string[]) : [];
  return list
    .map((c) => `<li class="chip"><span>${esc(c)}</span><button type="button" class="chip-x" data-remove-commune="${esc(c)}" aria-label="${esc(ctx.t('fields.communeRemove', { commune: c }))}">×</button></li>`)
    .join('');
}

/* ---------- Résumé (dernière étape) ---------- */

export function recapCard(ctx: Ctx): string {
  const { t, v } = ctx;
  const rows: [number, string][] = [];
  const line = (step: number, parts: (string | false | undefined)[]) => {
    const txt = parts.filter(Boolean).join(' · ');
    if (txt) rows.push([step, txt]);
  };
  const communes = Array.isArray(v.communes) ? (v.communes as string[]).join(', ') : '';
  line(1, [t(`fields.usageOptions.${v.usage}`), t(`fields.achatOptions.${v.achat}`), v.vendre !== 'non' && t(`fields.vendreOptions.${v.vendre}`)]);
  line(2, [t(`fields.typeOptions.${v.type}`), communes, `${t('fields.chambres')}${ctx.lang === 'fr' ? '\u00a0: ' : ': '}${v.chambres}`]);
  const eur = (x: unknown) => {
    const n = parseMoney(x);
    return n !== null && Number.isFinite(n) ? formatEuro(n, ctx.lang) : String(x ?? '');
  };
  const sep = ctx.lang === 'fr' ? '\u00a0: ' : ': ';
  line(3, [`${t('fields.prix')}${sep}${eur(v.prix)}`, `${t('fields.apport')}${sep}${eur(v.apport)}`, v.courtier === true && t('result.courtierTitle')]);
  line(4, [t(`fields.delaiOptions.${v.delai}`)]);
  return `<details class="recap">
  <summary>${icon('maison')}<span><strong>${esc(t('recap.title'))}</strong><br><span class="recap-short">${esc([t(`fields.typeOptions.${v.type}`), communes].filter(Boolean).join(' · '))}</span></span></summary>
  <ul>
    ${rows
      .map(
        ([step, txt]) => `<li><span>${esc(txt)}</span><button type="button" class="link-btn" data-goto="${step}" aria-label="${esc(t('recap.editStep', { step: t(`stepsShort.${step}`) }))}">${esc(t('recap.edit'))}</button></li>`,
      )
      .join('')}
  </ul>
</details>`;
}

/* ---------- Étapes ---------- */

function step1(ctx: Ctx): string {
  const { t, v } = ctx;
  return `${choices(ctx, 'usage', t('fields.usage'), opts(t, 'fields.usageOptions', USAGES, { habiter: 'maison', investir: 'louer' }, 'fields.usageHints'))}
${choices(ctx, 'achat', t('fields.achat'), opts(t, 'fields.achatOptions', ACHATS, { seul: 'personne', deux: 'cle' }))}
<div id="habiter-only"${v.usage === 'investir' ? ' hidden' : ''}>
${choices(ctx, 'premier', t('fields.premier'), opts(t, 'fields.premierOptions', PREMIER), 'chips', { help: t('fields.premierHelp') })}
${choices(ctx, 'bellegen', t('fields.bellegen'), opts(t, 'fields.bellegenOptions', BELLEGEN), 'chips', { help: t('fields.bellegenHelp') })}
</div>
${choices(ctx, 'vendre', t('fields.vendre'), opts(t, 'fields.vendreOptions', VENDRE), 'chips')}
<p class="commune-nodata" id="vendre-note" aria-live="polite">${vendreNote(ctx, v.vendre)}</p>`;
}

function step2(ctx: Ctx): string {
  const { t, v } = ctx;
  const list = Array.isArray(v.communes) ? (v.communes as string[]) : [];
  return `${choices(ctx, 'type', t('fields.type'), opts(t, 'fields.typeOptions', TYPES, { appartement: 'appartement', maison: 'maison', les_deux: 'cle' }))}
${choices(ctx, 'neuf', t('fields.neuf'), opts(t, 'fields.neufOptions', NEUF), 'chips')}
<div class="field combobox${hasErr(ctx, 'communes')}" data-field="communes">
  <label for="commune" id="commune-label"><span>${esc(t('fields.communes'))}</span></label>
  <p class="help" id="communes-help">${esc(t('fields.communesHelp'))}</p>
  <ul class="chips" id="communes-chips" aria-live="polite">${communeChips(ctx)}</ul>
  <div class="combo">
    <input type="text" id="commune" name="commune" value="" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="commune-list" autocomplete="off" spellcheck="false" placeholder="${esc(t('fields.communePlaceholder'))}"${list.length >= LIMITS.communes ? ' disabled' : ''}${invalid(ctx, 'communes')} aria-describedby="communes-help${ctx.e.communes ? ' communes-error' : ''}">
    <ul id="commune-list" role="listbox" aria-labelledby="commune-label" hidden></ul>
  </div>
  <p class="small" id="communes-full"${list.length >= LIMITS.communes ? '' : ' hidden'}>${esc(t('fields.communesFull'))}</p>
  ${errorMessage(ctx, 'communes')}
  <div class="quick" role="group" aria-label="${esc(t('fields.communeQuick'))}">
    <span class="quick-label" aria-hidden="true">${esc(t('fields.communeQuick'))}</span>
    ${ctx.quickCommunes.map((c) => `<button type="button" class="pill${list.includes(c) ? ' is-active' : ''}" data-commune="${esc(c)}" aria-pressed="${list.includes(c)}">${esc(c)}</button>`).join('')}
  </div>
  <p class="sr-only" id="commune-status" role="status" aria-live="polite"></p>
</div>
${stepper(ctx, 'chambres', t('fields.chambres'), LIMITS.chambres)}
${input(ctx, 'surface', t('fields.surface'), { optional: true, inputmode: 'numeric', suffix: 'm²', maxlength: 5 })}
${choices(ctx, 'exterieur', t('fields.exterieur'), opts(t, 'fields.exterieurOptions', EXTERIEURS), 'chips', { optional: true })}
<div class="toggles">${toggle(ctx, 'garage', t('fields.garage'), t('fields.garageHint'), 'garage')}</div>
${choices(ctx, 'renover', t('fields.renover'), opts(t, 'fields.renoverOptions', RENOVER), 'chips')}
${input(ctx, 'note', t('fields.note'), { optional: true, placeholder: t('fields.notePlaceholder'), maxlength: 300 })}`;
}

function step3(ctx: Ctx): string {
  const { t, v } = ctx;
  const who = ctx.courtierNomPublic
    ? `<details class="who"><summary>${esc(t('fields.courtierWho'))}</summary><p class="small">${esc(t('fields.courtierName', { nom: ctx.courtierNomPublic }))}</p></details>`
    : '';
  const info = ctx.courtierInfoUrl
    ? `<p class="small courtier-info"><a href="${esc(ctx.courtierInfoUrl)}" target="_blank" rel="noopener" aria-label="${esc(t('fields.courtierInfoLabel'))}">${esc(t('fields.courtierInfo'))}</a></p>`
    : '';
  return `${money(ctx, 'apport', t('fields.apport'), t('fields.apportHelp'))}
${money(ctx, 'prix', t('fields.prix'), t('fields.prixHelp'))}
<div class="vente-box" id="vente-box"${String(v.vendre ?? '').startsWith('oui') ? '' : ' hidden'}>
  <p class="vente-title">${icon('vendre', 'ico ico-sm')}<span>${esc(t('fields.venteTitle'))}</span></p>
  <p class="small">${esc(t('fields.venteHelp'))} <a href="${esc(ctx.estimationUrl)}" target="_blank" rel="noopener">${esc(t('fields.vendreLink'))}</a></p>
  ${money(ctx, 'valeurVente', t('fields.valeurVente'), undefined, true)}
  ${money(ctx, 'restePret', t('fields.restePret'), t('fields.restePretHelp'), true, restePretRequis(v))}
</div>
${choices(ctx, 'banque', t('fields.banque'), opts(t, 'fields.banqueOptions', BANQUE), 'chips')}
${choices(ctx, 'capacite', t('fields.capacite'), opts(t, 'fields.capaciteOptions', CAPACITE), 'chips')}
<div id="capacite-montant"${v.capacite === 'oui' ? '' : ' hidden'}>${money(ctx, 'capaciteMontant', t('fields.capaciteMontant'), t('fields.capaciteMontantHelp'), true)}</div>
${choices(ctx, 'revenu', t('fields.revenu'), opts(t, 'fields.revenuOptions', REVENUS), 'chips', { help: t('fields.revenuHelp'), optional: true })}
<div class="courtier-box">
  <p class="small">${icon('info', 'ico ico-xs')} ${esc(t('fields.courtierHint'))}</p>
  ${checkbox(ctx, 'courtier', t('fields.courtier'), who + info)}
</div>`;
}

function step4(ctx: Ctx): string {
  const { t } = ctx;
  return `${choices(ctx, 'delai', t('fields.delai'), opts(t, 'fields.delaiOptions', DELAIS, { asap: 'asap', '3a6mois': 'calendrier', '6a12mois': 'calendrier2', renseigne: 'renseigne' }))}
${choices(ctx, 'visites', t('fields.visites'), opts(t, 'fields.visitesOptions', VISITES), 'chips', { optional: true })}
${choices(ctx, 'mandat', t('fields.mandat'), opts(t, 'fields.mandatOptions', MANDAT), 'chips', { optional: true })}`;
}

function step5(ctx: Ctx): string {
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
  <p class="help" id="numero-help">${esc(t('fields.numeroWhy'))}</p>
  <div class="phone-row">
    <div class="phone-code">
      <label for="indicatif" class="sr-only">${esc(t('fields.indicatif'))}</label>
      <select id="indicatif" name="indicatif" autocomplete="tel-country-code">
        ${PHONE_CODES.map((c) => `<option value="${c}"${(ctx.v.indicatif ?? '+352') === c ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="phone-number">
      <label for="numero" class="sr-only">${esc(t('fields.numero'))}</label>
      <input type="tel" id="numero" name="numero" value="${esc(ctx.v.numero ?? '')}" autocomplete="tel-national" inputmode="tel" maxlength="20" placeholder="${esc(t('fields.numeroPlaceholder'))}" aria-required="true"${invalid(ctx, 'numero')}${describedBy(ctx, 'numero', true)}>
    </div>
  </div>
  ${errorMessage(ctx, 'numero')}
</fieldset>
<div class="field${hasErr(ctx, 'message')}" data-field="message">
  <label for="message">${labelText(ctx, t('fields.message'), true)}</label>
  <textarea id="message" name="message" rows="2" maxlength="2000"${describedBy(ctx, 'message', false)}>${esc(ctx.v.message ?? '')}</textarea>
  ${errorMessage(ctx, 'message')}
</div>
${checkbox(ctx, 'alerte', t('fields.alerte'))}
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
<p class="trust">${icon('bouclier', 'ico ico-sm')}<span>${esc(t('trust.line'))}<br>${esc(t('trust.where'))}</span></p>`;
}

const STEPS = [step1, step2, step3, step4, step5];

export function renderStep(step: number, ctx: Ctx): string {
  return STEPS[step - 1](ctx);
}
