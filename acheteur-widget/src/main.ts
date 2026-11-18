import './fonts.css';
import './styles.css';

import config from '../config.json';
import params from '../params.json';
import { loadLang, pickLang, translator } from './i18n';
import { computeBudget, type Params } from './shared/budget';
import { COMMUNES } from './shared/communes';
import type { Budget, PublicResult } from './shared/types';
import { checkTaux, type Taux } from './shared/taux';
import { budgetInput, checkFields, parseMoney, LIMITS, stepFields, TOTAL_STEPS, type Errors } from './shared/validation';
import { setupCombobox } from './ui/combobox';
import { esc } from './ui/html';
import { icon } from './ui/icons';
import { renderBudgetLive, renderBudgetPreview, renderResult, type BudgetOptions, type SimOptions } from './ui/result';
import { formatEuro } from './ui/format';
import { communeChips, errorKey, renderStep, STEP_ICONS, vendreNote, type Ctx, type Values } from './ui/steps';

/** Délai maximal d'une requête. AbortSignal.timeout n'existe qu'à partir de Safari 16 : repli pour les iPhone plus anciens. */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

const TOTAL = TOTAL_STEPS;
const P = params as Params;
const urlParams = new URLSearchParams(location.search);
const lang = pickLang(urlParams.get('lang'));
await loadLang(lang).catch(() => {}); // en cas d'échec, les textes restent en français
if (window.parent !== window) document.documentElement.classList.add('is-embedded');
const t = translator(lang);
const page = (() => {
  const src = urlParams.get('src') ?? '';
  return /^https?:\/\/[^\s<>"]{1,490}$/.test(src) ? src : '';
})();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const today = new Date().toISOString().slice(0, 10);

document.documentElement.lang = lang;
document.title = t('meta.title');

const DEFAULTS: Values = { communes: [], garage: false, courtier: false, alerte: false, indicatif: '+352', rgpd: false };
/** Copie des valeurs de départ (structuredClone n'existe pas avant Safari 15.4) */
const fresh = (): Values => ({ ...DEFAULTS, communes: [] });
const CONTACT_KEYS = ['prenom', 'nom', 'email', 'indicatif', 'numero', 'message', 'alerte', 'rgpd'];

const state: {
  step: number;
  values: Values;
  errors: Errors;
  sending: boolean;
  serverError: string | null;
  /** aperçu du budget, affiché entre les étapes 3 et 4 */
  preview: Budget | null;
  result: PublicResult | null;
  direction: 'next' | 'back';
  returnTo: number | null;
} = { step: 1, values: fresh(), errors: {}, sending: false, serverError: null, preview: null, result: null, direction: 'next', returnTo: null };

const app = document.getElementById('app')!;

function ctx(): Ctx {
  return {
    t,
    lang,
    v: state.values,
    e: state.errors,
    privacyUrl: config.privacyUrl[lang],
    estimationUrl: config.estimationUrl[lang],
    quickCommunes: config.quickCommunes,
    courtierNomPublic: config.courtierNomPublic,
  };
}

/* ---------- Taux du mois (BCL via BCE), lus par le serveur ; à défaut, valeur de secours contrôlée ---------- */
let taux: Taux | null = checkTaux({ variable: P.taux.variable, fixe: P.taux.fixe, mois: P.taux.mois, origine: 'secours' }, new Date());
fetch('/api/taux', { signal: timeoutSignal(8000) })
  .then((r) => r.json())
  .then((j: unknown) => {
    if (j && typeof j === 'object' && 'taux' in j) taux = checkTaux((j as { taux: Taux | null }).taux, new Date());
  })
  .catch(() => {});

function budgetOptions(): BudgetOptions {
  return {
    surtaxe: (Array.isArray(state.values.communes) ? (state.values.communes as string[]) : []).filter((c) => P.surtaxe.communes.includes(c)),
    mensualite: { taux, revenu: (state.values.revenu as string) || null, repere: P.taux.repere_revenu as [number, number], durees: P.taux.durees },
    date: today,
    bellegenAnnonce: { montant: P.bellegen.annonce_par_personne, actuel: P.bellegen.par_personne, etatAu: P.bellegen.annonce_etat_au },
    bellegenChoix: (state.values.bellegen as BudgetOptions['bellegenChoix']) ?? 'non',
    usage: (state.values.usage as BudgetOptions['usage']) ?? 'habiter',
  };
}

/* ---------- Hauteur automatique dans l'iframe ---------- */
function post(msg: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage({ source: 'immobuild-acheteur', ...msg }, '*');
}
let lastHeight = 0;
function sendHeight() {
  const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
  if (h !== lastHeight) {
    lastHeight = h;
    post({ type: 'height', height: h });
  }
}
new ResizeObserver(sendHeight).observe(document.documentElement);
window.addEventListener('load', () => {
  sendHeight();
  post({ type: 'ready' });
});

/* ---------- Rendu ---------- */
const HEAD_START = 0.25;
function fillPercent(): number {
  if (state.preview) return Math.round((3 / TOTAL) * 100);
  const s = state.step;
  const fields = stepFields(s, state.values);
  const missing = Object.keys(checkFields(state.values, fields).errors).length;
  let frac = fields.length ? 1 - missing / fields.length : 0;
  if (s === 1) frac = Math.max(frac, HEAD_START);
  return Math.round(Math.min(1, (s - 1 + frac * 0.92) / TOTAL) * 100);
}
function updateFill() {
  app.querySelector<HTMLElement>('.pbar-fill')?.style.setProperty('--w', `${fillPercent()}%`);
}

function progress(): string {
  const s = state.step;
  const dots = STEP_ICONS.map((ic, i) => {
    const n = i + 1;
    const done = n < s || (state.preview && n === s);
    const cls = done ? 'done' : n === s ? 'current' : '';
    return `<li class="pdot ${cls}"${n === s ? ' aria-current="step"' : ''}><span class="pdot-ico">${done ? icon('check') : icon(ic)}</span><span class="sr-only">${esc(t(`stepsShort.${n}`))}</span></li>`;
  }).join('');
  return `<nav class="progress" aria-label="${esc(t('progress', { n: s, total: TOTAL }))}">
  <p class="progress-label"><span>${esc(t('progress', { n: s, total: TOTAL }))}</span><span class="progress-name">${esc(t(`stepsShort.${s}`))}</span></p>
  <ol class="pdots">${dots}</ol>
  <div class="pbar" aria-hidden="true"><span class="pbar-fill" data-width="${fillPercent()}"></span></div>
</nav>`;
}

function coachHtml(): string {
  const name = config.agent?.name ?? '';
  const avatar = config.agent?.photo ? `<img class="avatar avatar-sm" src="${esc(config.agent.photo)}" alt="" width="48" height="48">` : `<span class="avatar avatar-sm" aria-hidden="true">${esc(name.charAt(0))}</span>`;
  return `<div class="coach">${avatar}<p class="coach-bubble" id="coach" aria-live="polite">${esc(t(`coach.step${state.step}`))}</p></div>`;
}
function coachSay(key: string, vars?: Record<string, string>) {
  const el = app.querySelector<HTMLElement>('#coach');
  const text = t(key, vars);
  if (!el || el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
function coachReact(name: string, value: unknown) {
  const v = String(value);
  if (name === 'vendre' && v.startsWith('oui')) return coachSay('coach.vendre');
  if (name === 'premier' && v === 'oui') return coachSay('coach.premierOui');
  if (name === 'usage' && v === 'investir') return coachSay('coach.investir');
  if (name === 'renover' && v !== 'non') return coachSay('coach.renover');
  if (name === 'courtier' && value === true) return coachSay('coach.courtier');
  if (name === 'mandat' && v === 'oui') return coachSay('coach.mandat');
}

function render(focus = true) {
  if (state.result) {
    const a = state.values;
    const answers = {
      prix: budgetInput(a)?.prix ?? state.result.budget.prix,
      premier: a.premier,
      usage: a.usage,
      bellegen: a.bellegen,
      vendre: a.vendre,
      renover: a.renover,
      mandat: a.mandat || null,
      courtier: a.courtier === true,
      revenu: a.revenu || null,
    } as Parameters<typeof renderResult>[1];
    app.innerHTML = `<div class="card card-result anim-in">${renderResult(state.result, answers, String(a.prenom ?? ''), t, lang, {
      contactUrl: config.contactUrl[lang],
      estimationUrl: config.estimationUrl[lang],
      agent: config.agent,
      phone: config.phone,
      ...budgetOptions(),
    })}</div>`;
    return after(focus);
  }

  const s = state.step;
  const errorCount = Object.keys(state.errors).length;
  const summary = state.serverError
    ? `<div class="alert" role="alert">${icon('info', 'ico ico-sm')}<span>${esc(state.serverError)}</span></div>`
    : errorCount
      ? `<div class="alert" role="alert">${icon('info', 'ico ico-sm')}<span>${esc(t('errors.summary'))}</span></div>`
      : '';
  const intro =
    s === 1 && !state.preview
      ? `<header class="intro">
    <p class="kicker">${esc(t('intro.kicker')).replace(/ImmoBuild Kohn/g, '<span class="nowrap">ImmoBuild Kohn</span>')}</p>
    <h1>${esc(t('intro.title'))}</h1>
    <p>${esc(t('intro.text'))}</p>
    <ul class="badges">
      <li>${icon('cadeau', 'ico ico-xs')}${esc(t('intro.badges.free'))}</li>
      <li>${icon('check', 'ico ico-xs')}${esc(t('intro.badges.commitment'))}</li>
      <li>${icon('donnees', 'ico ico-xs')}${esc(t('intro.badges.official'))}</li>
    </ul>
  </header>`
      : '';

  if (state.preview) {
    app.innerHTML = `<div class="card">
  <div class="card-body">
  ${progress()}
  <div class="step-body anim-next">${renderBudgetPreview(state.preview, t, lang, budgetOptions(), simDepart() ?? undefined)}</div>
  <div class="actions">
    <button type="button" class="btn btn-primary btn-block btn-go" data-action="from-preview">${esc(t('nav.next'))}<span class="arrow">${icon('fleche')}</span></button>
    <button type="button" class="btn btn-ghost" data-action="edit-budget">${icon('fleche')}<span>${esc(t('budget.edit'))}</span></button>
  </div>
  </div>
</div>`;
    return after(focus);
  }

  const primary =
    s === TOTAL
      ? `<button type="submit" class="btn btn-primary btn-block btn-go" ${state.sending ? 'disabled aria-busy="true"' : ''}>${state.sending ? `<span class="spinner" aria-hidden="true"></span>${esc(t('nav.sending'))}` : `${esc(t('nav.submit'))}<span class="arrow">${icon('fleche')}</span>`}</button>`
      : `<button type="submit" class="btn btn-primary btn-block btn-go">${esc(t(s === 3 ? 'nav.toBudget' : 'nav.next'))}<span class="arrow">${icon('fleche')}</span></button>`;

  app.innerHTML = `<div class="card">
  ${intro}
  <div class="card-body">
  ${progress()}
  <form id="form" novalidate>
    <div class="step-body anim-${state.direction}">
      <div class="step-head"><div><h2 class="step-title" id="step-title" tabindex="-1">${esc(t(`steps.${s}.title`))}</h2></div></div>
      ${coachHtml()}
      ${summary}
      ${renderStep(s, ctx())}
    </div>
    <div class="actions">
      ${primary}
      ${state.returnTo && s < state.returnTo ? `<button type="button" class="btn btn-secondary" data-action="to-summary">${esc(t('nav.toSummary'))}</button>` : ''}
      ${s > 1 ? `<button type="button" class="btn btn-ghost" data-action="back" ${state.sending ? 'disabled' : ''}>${icon('fleche')}<span>${esc(t('nav.back'))}</span></button>` : ''}
    </div>
  </form>
  </div>
</div>`;

  if (s === 2) {
    setupCombobox(
      app.querySelector<HTMLInputElement>('#commune')!,
      app.querySelector<HTMLUListElement>('#commune-list')!,
      app.querySelector<HTMLElement>('#commune-status')!,
      COMMUNES.map((c) => c.name),
      t('fields.communeEmpty'),
      (name) => addCommune(name),
    );
  }
  after(focus);
}

function hydrate() {
  app.querySelectorAll<HTMLElement>('[data-width]').forEach((el) => el.style.setProperty('--w', `${el.dataset.width}%`));
}

function after(focus: boolean) {
  hydrate();
  sendHeight();
  if (!focus) return;
  const firstError = Object.keys(state.errors)[0];
  const errTarget = firstError
    ? firstError === 'communes'
      ? app.querySelector<HTMLElement>('#commune')
      : (app.querySelector<HTMLElement>(`[name="${firstError}"]`) ?? app.querySelector<HTMLElement>(`#${firstError}`))
    : null;
  const target = errTarget || app.querySelector<HTMLElement>('#step-title, #result-title, #preview-title');
  target?.focus({ preventScroll: true });
  if (window.parent !== window) {
    if (errTarget) post({ type: 'scrollTo', offset: Math.max(0, Math.round(errTarget.getBoundingClientRect().top + window.scrollY - 90)) });
    else post({ type: 'scroll' });
  } else if (errTarget) {
    errTarget.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
  } else {
    const card = app.querySelector<HTMLElement>('.card');
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

/* ---------- Simulateur « Et si… ? » (aperçu du budget) ---------- */
function simDepart(): SimOptions | null {
  const prixDepart = parseMoney(state.values.prixDepart);
  const apportDepart = parseMoney(state.values.apportDepart);
  return prixDepart && apportDepart !== null && Number.isFinite(prixDepart) && Number.isFinite(apportDepart) ? { prixDepart, apportDepart } : null;
}
let simTimer: ReturnType<typeof setTimeout> | undefined;
/** derniers montants laissés dans l'aperçu */
let simLast: { prix: number; apport: number } | null = null;
function onSim(el: HTMLInputElement) {
  const key = el.name === 'sim_prix' ? 'prix' : el.name === 'sim_apport' ? 'apport' : null;
  if (!key) return;
  state.values[key] = el.value;
  const txt = formatEuro(Number(el.value), lang);
  const out = app.querySelector(`#sim-${key}-out`);
  if (out) out.textContent = txt;
  el.setAttribute('aria-valuetext', txt);
  const input = budgetInput(state.values);
  if (!input) return;
  state.preview = computeBudget(input, P);
  simLast = { prix: input.prix, apport: input.apport };
  const live = app.querySelector('#budget-live');
  if (live) live.innerHTML = renderBudgetLive(state.preview, t, lang, budgetOptions());
  const d = simDepart();
  const dep = app.querySelector<HTMLElement>('#sim-depart');
  if (dep && d) dep.hidden = state.preview.prix === d.prixDepart && state.preview.apport === d.apportDepart;
  sendHeight();
  // Lecteur d'écran : un résumé court, après l'arrêt du curseur
  clearTimeout(simTimer);
  simTimer = setTimeout(() => {
    const st = app.querySelector('#sim-status');
    const b = state.preview;
    if (st && b) st.textContent = b.margeMin >= 0 ? t('sim.statusOk', { prix: formatEuro(b.prix, lang) }) : t('sim.statusGap', { prix: formatEuro(b.prix, lang), montant: formatEuro(-b.margeMin, lang) });
  }, 600);
}

/* ---------- Communes (jusqu'à 3) ---------- */
function communesList(): string[] {
  return Array.isArray(state.values.communes) ? (state.values.communes as string[]) : [];
}
function refreshCommunes() {
  const list = communesList();
  const chips = app.querySelector('#communes-chips');
  if (chips) chips.innerHTML = communeChips({ t, v: state.values });
  const input = app.querySelector<HTMLInputElement>('#commune');
  const full = list.length >= LIMITS.communes;
  if (input) {
    input.value = '';
    input.disabled = full;
  }
  const fullNote = app.querySelector<HTMLElement>('#communes-full');
  if (fullNote) fullNote.hidden = !full;
  app.querySelectorAll<HTMLButtonElement>('[data-commune]').forEach((b) => {
    const on = list.includes(b.dataset.commune!);
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  if (list.length) clearError('communes');
  updateFill();
  sendHeight();
}
function addCommune(name: string) {
  const list = communesList();
  if (!list.includes(name) && list.length < LIMITS.communes) {
    state.values.communes = [...list, name];
    coachSay('coach.commune', { commune: name });
  }
  queueMicrotask(refreshCommunes);
}
function removeCommune(name: string) {
  state.values.communes = communesList().filter((c) => c !== name);
  refreshCommunes();
  app.querySelector<HTMLInputElement>('#commune')?.focus();
}

/* ---------- Erreurs en direct : elles disparaissent dès que le champ est correct ---------- */
function setFieldError(name: string, code: string | undefined) {
  const wrap = app.querySelector<HTMLElement>(`[data-field="${name}"]`);
  const msg = app.querySelector<HTMLElement>(`#${CSS.escape(name)}-error`);
  if (!wrap || !msg) return;
  const inputs = app.querySelectorAll<HTMLElement>(name === 'communes' ? '#commune' : `[name="${name}"]`);
  if (code) {
    state.errors[name] = code as Errors[string];
    wrap.classList.add('has-error');
    msg.innerHTML = `${icon('info', 'ico ico-xs')}<span>${esc(t(errorKey(name, code)))}</span>`;
    msg.hidden = false;
    inputs.forEach((i) => i.setAttribute('aria-invalid', 'true'));
  } else {
    delete state.errors[name];
    wrap.classList.remove('has-error');
    msg.hidden = true;
    msg.innerHTML = '';
    inputs.forEach((i) => i.removeAttribute('aria-invalid'));
  }
  if (!Object.keys(state.errors).length) app.querySelector('.alert')?.remove();
  sendHeight();
}
const clearError = (name: string) => setFieldError(name, undefined);

function checkOne(name: string, showNew: boolean) {
  const { errors } = checkFields(state.values, [name]);
  if (!errors[name]) clearError(name);
  else if (showNew || state.errors[name]) setFieldError(name, errors[name]);
}

/* ---------- Saisie ---------- */
app.addEventListener('input', onInput);
app.addEventListener('change', onInput);
function onInput(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (el.closest('.sim')) return onSim(el as HTMLInputElement);
  if (!el.name || el.name === 'commune') return;
  queueMicrotask(updateFill);
  if (el instanceof HTMLInputElement && el.type === 'checkbox') state.values[el.name] = el.checked;
  else if (el instanceof HTMLInputElement && el.type === 'radio') {
    if (el.checked) state.values[el.name] = el.value;
  } else state.values[el.name] = el.value;
  if (e.type === 'change') coachReact(el.name, state.values[el.name]);

  if (el.name === 'vendre') {
    const note = app.querySelector('#vendre-note');
    if (note) note.innerHTML = vendreNote(ctx(), state.values.vendre);
    sendHeight();
  }
  if (el.name === 'usage') {
    // Premier achat et Bëllegen Akt : seulement pour y habiter
    const box = app.querySelector<HTMLElement>('#habiter-only');
    if (box) box.hidden = state.values.usage === 'investir';
    if (state.values.usage === 'investir') ['premier', 'bellegen'].forEach(clearError);
    sendHeight();
  }
  if (el.name === 'capacite') {
    const box = app.querySelector<HTMLElement>('#capacite-montant');
    if (box) box.hidden = state.values.capacite !== 'oui';
    if (state.values.capacite !== 'oui') clearError('capaciteMontant');
    sendHeight();
  }
  if (el.name === 'indicatif') return checkOne('numero', false);
  // Choix (radio, case) : vérification immédiate ; texte : à la sortie du champ
  const immediate = e.type === 'change';
  checkOne(el.name, immediate && el.value !== '');
}

app.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  queueMicrotask(updateFill);

  const stepBtn = target.closest<HTMLButtonElement>('[data-stepper]');
  if (stepBtn) {
    const name = stepBtn.dataset.stepper!;
    const input = app.querySelector<HTMLInputElement>(`#${name}`)!;
    const cur = Number(input.value) || 0;
    const next = Math.min(Number(stepBtn.dataset.max), Math.max(Number(stepBtn.dataset.min), input.value === '' && Number(stepBtn.dataset.delta) < 0 ? 0 : cur + Number(stepBtn.dataset.delta)));
    input.value = String(next);
    state.values[name] = String(next);
    checkOne(name, false);
    return;
  }

  const quick = target.closest<HTMLButtonElement>('[data-commune]');
  if (quick) {
    const name = quick.dataset.commune!;
    if (communesList().includes(name)) removeCommune(name);
    else addCommune(name);
    return;
  }
  const remove = target.closest<HTMLButtonElement>('[data-remove-commune]');
  if (remove) return removeCommune(remove.dataset.removeCommune!);

  const goto = target.closest<HTMLButtonElement>('[data-goto]');
  if (goto) {
    state.returnTo = TOTAL;
    state.step = Number(goto.dataset.goto);
    state.direction = 'back';
    state.errors = {};
    state.serverError = null;
    return render();
  }

  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'to-summary' && state.returnTo) {
    const { errors } = checkFields(state.values, stepFields(state.step, state.values));
    state.errors = errors;
    if (Object.keys(errors).length) return render();
    // Une réponse des étapes 1 à 3 peut changer le budget : on remontre l'aperçu (et l'étape 3 si elle n'est plus complète)
    if (state.step <= 3) {
      const input = budgetInput(state.values);
      if (!input) {
        state.step = 3;
        state.errors = checkFields(state.values, stepFields(3, state.values)).errors;
        return render();
      }
      state.step = 3;
      state.preview = computeBudget(input, P);
      simLast = { prix: input.prix, apport: input.apport };
      state.direction = 'next';
      return render();
    }
    state.step = state.returnTo;
    state.returnTo = null;
    state.direction = 'next';
    return render();
  } else if (action === 'from-preview') {
    state.preview = null;
    state.step = state.returnTo ?? 4;
    state.returnTo = null;
    state.direction = 'next';
    render();
  } else if (action === 'sim-reset') {
    const d = simDepart();
    if (d) {
      state.values.prix = String(d.prixDepart);
      state.values.apport = String(d.apportDepart);
      state.preview = computeBudget(budgetInput(state.values)!, P);
      simLast = { prix: d.prixDepart, apport: d.apportDepart };
      render(false);
      app.querySelector<HTMLInputElement>('#sim-prix')?.focus();
    }
  } else if (action === 'edit-budget') {
    // Retour à l'étape 3 : si le visiteur change les montants, ils deviendront le nouveau départ du simulateur (voir l'envoi de l'étape 3)
    state.preview = null;
    state.step = 3;
    state.direction = 'back';
    render();
  } else if (action === 'fix-email') {
    const v = target.closest<HTMLElement>('[data-value]')!.dataset.value!;
    state.values.email = v;
    const input = app.querySelector<HTMLInputElement>('#email');
    if (input) input.value = v;
    app.querySelector('#email-suggest')?.remove();
    clearError('email');
  } else if (action === 'back' && !state.sending) {
    state.step = Math.max(1, state.step - 1);
    state.direction = 'back';
    state.errors = {};
    state.serverError = null;
    render();
  } else if (action === 'print') {
    app.querySelectorAll('details').forEach((d) => (d.open = true));
    window.print();
  } else if (action === 'restart') {
    // On garde les coordonnées (en mémoire seulement) pour ne pas les retaper
    const keep = Object.fromEntries(CONTACT_KEYS.filter((k) => k !== 'rgpd').map((k) => [k, state.values[k]]));
    state.values = { ...fresh(), ...keep };
    state.result = null;
    state.preview = null;
    state.step = 1;
    state.direction = 'next';
    render();
  }
});

const EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.fr': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'pt.l': 'pt.lu', 'pt.lux': 'pt.lu',
};
function emailSuggest(value: string) {
  app.querySelector('#email-suggest')?.remove();
  const at = value.lastIndexOf('@');
  const fix = at > 0 ? EMAIL_TYPOS[value.slice(at + 1).toLowerCase()] : undefined;
  if (!fix) return;
  const suggestion = value.slice(0, at + 1) + fix;
  app.querySelector('[data-field="email"]')?.insertAdjacentHTML('beforeend', `<p class="suggest" id="email-suggest">${esc(t('fields.emailTypo'))} <button type="button" class="link-btn" data-action="fix-email" data-value="${esc(suggestion)}">${esc(suggestion)}</button> ?</p>`);
  sendHeight();
}

app.addEventListener('focusout', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.name === 'email') emailSuggest(el.value.trim());
  if (!el.name || el.type === 'radio' || el.type === 'checkbox' || el.name === 'commune' || el.name === 'website') return;
  if (String(el.value).trim() !== '') checkOne(el.name === 'indicatif' ? 'numero' : el.name, true);
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  if (state.sending) return;
  state.serverError = null;
  const { errors } = checkFields(state.values, stepFields(state.step, state.values));
  state.errors = errors;
  if (Object.keys(errors).length) return render();
  if (state.step === 3) {
    // Aperçu du budget, sans coordonnées : calcul dans le navigateur, rien n'est envoyé
    const input = budgetInput(state.values);
    if (input) {
      state.preview = computeBudget(input, P);
      // Départ du simulateur : gardé seulement si le visiteur revient avec les montants qu'il avait laissés dans l'aperçu ;
      // s'il a tapé d'autres montants à l'étape 3, ce sont eux le nouveau départ
      if (!state.values.prixDepart || !simLast || simLast.prix !== input.prix || simLast.apport !== input.apport) {
        state.values.prixDepart = String(input.prix);
        state.values.apportDepart = String(input.apport);
      }
      simLast = { prix: input.prix, apport: input.apport };
      state.direction = 'next';
      return render();
    }
  }
  if (state.returnTo === state.step + 1) state.returnTo = null;
  if (state.step < TOTAL) {
    state.step += 1;
    state.direction = 'next';
    return render();
  }
  send().catch(() => {
    state.sending = false;
    state.serverError = t('errors.server', { contact: config.publicEmail });
    render();
  });
});

/* ---------- Envoi ---------- */
type ApiJson = { ok?: boolean; result?: PublicResult; error?: string; errors?: Errors };

async function send() {
  state.sending = true;
  render(false);
  const contactFields = stepFields(5);
  const answers: Values = {};
  const contact: Values = {};
  for (const [k, v] of Object.entries(state.values)) {
    if (k !== 'website') (contactFields.includes(k) ? contact : answers)[k] = v;
  }
  // Montants de départ : envoyés seulement s'ils ont changé dans le simulateur
  if (parseMoney(answers.prixDepart) === parseMoney(answers.prix)) delete answers.prixDepart;
  if (parseMoney(answers.apportDepart) === parseMoney(answers.apport)) delete answers.apportDepart;
  const website = String(app.querySelector<HTMLInputElement>('#website')?.value ?? '');
  let res: Response;
  let json: ApiJson;
  try {
    res = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang, page, website, answers, contact }),
      signal: timeoutSignal(20_000),
    });
    json = (await res.json().catch(() => ({}))) as ApiJson;
  } catch {
    state.sending = false;
    state.serverError = t('errors.network');
    return render();
  }
  state.sending = false;
  if (res.ok && json.ok && json.result) {
    state.result = json.result;
    return render();
  }
  if (json.error === 'validation' && json.errors) {
    state.errors = json.errors;
    for (let s = 1; s <= TOTAL; s++) {
      if (stepFields(s, state.values).some((f) => f in json.errors!)) {
        state.step = s;
        break;
      }
    }
  } else {
    state.serverError = t(res.status === 429 ? 'errors.rate_limit' : 'errors.server', { contact: config.publicEmail });
  }
  render();
}

render(false);
post({ type: 'ready' });
