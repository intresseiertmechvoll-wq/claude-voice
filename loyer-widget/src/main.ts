import './fonts.css';
import './styles.css';

import config from '../config.json';
import { deCanton, loadLang, pickLang, translator } from './i18n';
import { COMMUNES } from './shared/communes';
import type { PublicResult } from './shared/types';
import { checkFields, stepFields, TOTAL_STEPS, type Errors } from './shared/validation';
import { resolveCommune, setupCombobox } from './ui/combobox';
import { esc } from './ui/html';
import { icon } from './ui/icons';
import { formatEuro } from './ui/format';
import { errorKey, noDataNote, recapItems, renderStep, STEP_ICONS, type Values } from './ui/steps';

const TOTAL = TOTAL_STEPS;
const params = new URLSearchParams(location.search);
const lang = pickLang(params.get('lang'));
await loadLang(lang).catch(() => {}); // en cas d'échec, les textes restent en français
if (window.parent !== window) document.documentElement.classList.add('is-embedded');
const t = translator(lang);
const page = (() => {
  const src = params.get('src') ?? '';
  return /^https?:\/\/[^\s<>"]{1,490}$/.test(src) ? src : '';
})();
const contactUrl = config.contactUrl[lang];
const gestionUrl = config.gestionUrl[lang];
const privacyUrl = config.privacyUrl[lang];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.lang = lang;
document.title = t('meta.title');

const DEFAULTS: Values = { garages: '0', parkings: '0', indicatif: '+352', rgpd: false };
const CONTACT_KEYS = ['prenom', 'nom', 'email', 'indicatif', 'numero'];

const state: {
  step: number;
  values: Values;
  errors: Errors;
  sending: boolean;
  serverError: string | null;
  result: PublicResult | null;
  /** une copie du résultat a été envoyée au visiteur */
  copie: boolean;
  direction: 'next' | 'back';
  /** après « Modifier » depuis le résumé : bouton pour y revenir directement */
  returnTo: number | null;
} = { step: 1, values: { ...DEFAULTS }, errors: {}, sending: false, serverError: null, result: null, copie: false, direction: 'next', returnTo: null };

const app = document.getElementById('app')!;

/* ---------- Code de fin de parcours, chargé en arrière-plan ---------- */
type Late = typeof import('./ui/late');
let late: Late | null = null;
let lateLoading: Promise<Late> | null = null;
function loadLate(): Promise<Late> {
  lateLoading ??= import('./ui/late').then((m) => (late = m));
  return lateLoading;
}
function prefetchLate() {
  if (late || lateLoading) return;
  const go = () => void loadLate().catch(() => (lateLoading = null));
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 3000 });
  else setTimeout(go, 500);
}

/* ---------- Hauteur automatique dans l'iframe ---------- */
function post(msg: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage({ source: 'immobuild-loyer', ...msg }, '*');
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
/**
 * Remplissage de la barre : avance au fil des réponses de l'étape en cours (effet de gradient d'objectif)
 * et part avec une petite avance à l'étape 1 (« endowed progress », Nunes & Drèze 2006).
 */
const HEAD_START = 0.25;
function fillPercent(): number {
  const s = state.step;
  const fields = stepFields(s, state.values.type);
  const missing = Object.keys(checkFields(state.values, fields).errors).length;
  let frac = fields.length ? 1 - missing / fields.length : 0;
  if (s === 1) frac = Math.max(frac, HEAD_START);
  return Math.round(Math.min(1, (s - 1 + frac * 0.92) / (TOTAL - 1)) * 100);
}
function updateFill() {
  app.querySelector<HTMLElement>('.pbar-fill')?.style.setProperty('--w', `${fillPercent()}%`);
}

function progress(): string {
  const s = state.step;
  const dots = STEP_ICONS.map((ic, i) => {
    const n = i + 1;
    const cls = n < s ? 'done' : n === s ? 'current' : '';
    return `<li class="pdot ${cls}"${n === s ? ' aria-current="step"' : ''}><span class="pdot-ico">${n < s ? icon('check') : icon(ic)}</span><span class="sr-only">${esc(t(`stepsShort.${n}`))}</span></li>`;
  }).join('');
  return `<nav class="progress" aria-label="${esc(t('progress', { n: s, total: TOTAL }))}">
  <p class="progress-label"><span>${esc(t('progress', { n: s, total: TOTAL }))}</span><span class="progress-name">${esc(t(`stepsShort.${s}`))}</span></p>
  <ol class="pdots">${dots}</ol>
  <div class="pbar" aria-hidden="true"><span class="pbar-fill" data-width="${fillPercent()}"></span></div>
</nav>`;
}

function recapBar(): string {
  if (state.step < 2) return '';
  const items = recapItems(t, state.values).slice(0, 2);
  if (!items.length) return '';
  return `<ul class="recap-bar" aria-label="${esc(t('recap.title'))}">${items.map((i) => `<li>${icon(i.icon, 'ico ico-xs')}<span>${esc(i.text)}</span></li>`).join('')}</ul>`;
}

function render(focus = true) {
  if (state.result) {
    app.innerHTML = `<div class="card card-result anim-in">${late!.renderResult(state.result, t, lang, { contactUrl, gestionUrl, legalUrl: config.legalUrl, agent: config.agent, phone: config.phone, copieA: state.copie ? String(state.values.email ?? '') : null })}</div>`;
    hydrate();
    countUp();
    after(focus);
    return;
  }
  const s = state.step;
  // Dès l'étape 3, on prépare en arrière-plan le code du résultat
  if (s >= 3) prefetchLate();
  const errorCount = Object.keys(state.errors).length;
  const summary = state.serverError
    ? `<div class="alert" role="alert">${icon('info', 'ico ico-sm')}<span>${esc(state.serverError)}${state.serverError === t('errors.reload') ? ` <button type="button" class="link-btn" data-action="reload">${esc(t('nav.reload'))}</button>` : ''}</span></div>`
    : errorCount
      ? `<div class="alert" role="alert">${icon('info', 'ico ico-sm')}<span>${esc(t('errors.summary'))}</span></div>`
      : '';

  app.innerHTML = `<div class="card">
  ${
    s === 1
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
      : ''
  }
  <div class="card-body">
  ${progress()}
  ${recapBar()}
  <form id="form" novalidate>
    <div class="step-body anim-${state.direction}">
      <div class="step-head">
        <div>
          <h2 class="step-title" id="step-title" tabindex="-1">${esc(t(`steps.${s}.title`))}</h2>

        </div>
      </div>
      ${coachHtml()}
      ${summary}
      ${renderStep(s, { t, lang, v: state.values, e: state.errors, privacyUrl, quickCommunes: config.quickCommunes, copieVisiteur: config.copieVisiteur === true })}
    </div>
    <div class="actions">
      ${
        s === TOTAL
          ? `<button type="submit" class="btn btn-primary btn-block btn-go" ${state.sending ? 'disabled aria-busy="true"' : ''}>${state.sending ? `<span class="spinner" aria-hidden="true"></span>${esc(t('nav.sending'))}` : `${esc(t('nav.submit'))}<span class="arrow">${icon('fleche')}</span>`}</button>`
          : `<button type="submit" class="btn btn-primary btn-block btn-go">${esc(t('nav.next'))}<span class="arrow">${icon('fleche')}</span></button>`
      }
      ${state.returnTo && s < state.returnTo ? `<button type="button" class="btn btn-secondary" data-action="to-summary">${esc(t('nav.toSummary'))}</button>` : ''}
      ${s > 1 ? `<button type="button" class="btn btn-ghost" data-action="back" ${state.sending ? 'disabled' : ''}>${icon('fleche')}<span>${esc(t('nav.back'))}</span></button>` : ''}
    </div>
  </form>
  </div>
</div>`;

  if (s === 1) {
    setupCombobox(
      app.querySelector<HTMLInputElement>('#commune')!,
      app.querySelector<HTMLUListElement>('#commune-list')!,
      app.querySelector<HTMLElement>('#commune-status')!,
      COMMUNES.map((c) => c.name),
      t('fields.communeEmpty'),
      (name) => setCommune(name),
    );
  }
  hydrate();
  after(focus);
}

/** Valeurs visuelles posées en JS (la politique de sécurité interdit les styles en ligne) */
function hydrate() {
  app.querySelectorAll<HTMLElement>('[data-pos]').forEach((el) => {
    const p = Number(el.dataset.pos);
    el.style.setProperty('--pos', `${p}%`);
    el.classList.toggle('edge-left', p < 18);
    el.classList.toggle('edge-right', p > 82);
  });
  app.querySelectorAll<HTMLElement>('[data-width]').forEach((el) => el.style.setProperty('--w', `${el.dataset.width}%`));
  app.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(paintRange);
}

function paintRange(r: HTMLInputElement) {
  const p = ((Number(r.value) - Number(r.min)) / (Number(r.max) - Number(r.min))) * 100;
  r.style.setProperty('--p', `${p}%`);
}

function countUp() {
  const el = app.querySelector<HTMLElement>('[data-countup]');
  if (!el || reducedMotion) return;
  const target = Number(el.dataset.countup);
  const start = performance.now();
  const dur = 900;
  const tick = (now: number) => {
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = formatEuro(Math.round((target * eased) / 50) * 50, lang);
    if (k < 1) requestAnimationFrame(tick);
    else el.textContent = formatEuro(target, lang);
  };
  requestAnimationFrame(tick);
}

function after(focus: boolean) {
  sendHeight();
  if (!focus) return;
  const firstError = Object.keys(state.errors)[0];
  const target =
    (firstError && (app.querySelector<HTMLElement>(`[name="${firstError}"]`) ?? app.querySelector<HTMLElement>(`#${firstError}`))) ||
    app.querySelector<HTMLElement>('#step-title, #result-title');
  target?.focus({ preventScroll: true });
  const errorField = firstError ? target : null;
  if (window.parent !== window) {
    if (errorField) post({ type: 'scrollTo', offset: Math.max(0, Math.round(errorField.getBoundingClientRect().top + window.scrollY - 90)) });
    else post({ type: 'scroll' });
  } else if (errorField) {
    errorField.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
  } else {
    const card = app.querySelector<HTMLElement>('.card');
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

function updateNoData() {
  const el = app.querySelector('#commune-nodata');
  if (el) el.innerHTML = noDataNote(t, state.values.type, state.values.commune);
  sendHeight();
}

function setCommune(name: string) {
  state.values.commune = name;
  queueMicrotask(updateNoData);
  coachSay('coach.commune', { commune: name });
  clearError('commune');
  const canton = COMMUNES.find((c) => c.name === name)?.canton;
  const out = app.querySelector('#commune-canton');
  if (out) out.innerHTML = canton ? `${icon('check', 'ico ico-xs')}${esc(t('fields.communeSelected', { deCanton: deCanton(canton, lang) }))}` : '';
  app.querySelectorAll<HTMLButtonElement>('[data-commune]').forEach((b) => {
    const on = b.dataset.commune === name;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

/* ---------- Erreurs en direct : elles disparaissent dès que le champ est correct ---------- */
function setFieldError(name: string, code: string | undefined) {
  const wrap = app.querySelector<HTMLElement>(`[data-field="${name}"]`);
  const msg = app.querySelector<HTMLElement>(`#${CSS.escape(name)}-error`);
  if (!wrap || !msg) return;
  const inputs = app.querySelectorAll<HTMLElement>(`[name="${name}"]`);
  if (code) {
    state.errors[name] = code as Errors[string];
    wrap.classList.add('has-error');
    const key = errorKey(name, code);
    msg.innerHTML = `${icon('info', 'ico ico-xs')}<span>${esc(t(key))}</span>`;
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

/* ---------- Bulle de Jason : un mot par étape, et des réactions aux réponses ---------- */
let coachText = '';
function coachHtml(): string {
  coachText = t(state.step === 1 ? 'coach.start' : `coach.step${state.step}`);
  const name = config.agent?.name ?? '';
  const avatar = config.agent?.photo ? `<img class="avatar avatar-sm" src="${esc(config.agent.photo)}" alt="" width="48" height="48">` : `<span class="avatar avatar-sm" aria-hidden="true">${esc(name.charAt(0))}</span>`;
  return `<div class="coach">${avatar}<p class="coach-bubble" id="coach" aria-live="polite">${esc(coachText)}</p></div>`;
}
function coachSay(key: string, vars?: Record<string, string>) {
  const el = app.querySelector<HTMLElement>('#coach');
  const text = t(key, vars);
  if (!el || text === coachText) return;
  coachText = text;
  el.textContent = text;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
let energyTimer: ReturnType<typeof setTimeout> | undefined;
function coachDefault() {
  coachSay(state.step === 1 ? 'coach.start' : `coach.step${state.step}`);
}
function coachReact(name: string, value: unknown) {
  const v = String(value);
  if (name === 'type') return coachSay(`coach.${v}`);
  if (name === 'energie') {
    // Avec les flèches du clavier, on attend que le choix soit posé avant de réagir
    clearTimeout(energyTimer);
    energyTimer = setTimeout(() => {
      if (['A+', 'A', 'B'].includes(v)) coachSay('coach.energieGood');
      else if (['G', 'H', 'I'].includes(v)) coachSay('coach.energieBad');
      else if (v === 'inconnu') coachSay('coach.energieUnknown');
      else coachSay('coach.energieMid', { c: v });
    }, 600);
    return;
  }
  if (name === 'chambres') return v === '0' ? coachSay('coach.studio') : coachDefault();
  if (name === 'meuble') return coachSay(v === 'oui' ? 'coach.meuble' : 'coach.vide');
  if (name === 'garages' || name === 'parkings') return Number(v) > 0 ? coachSay(state.values.type === 'maison' ? 'coach.garageMaison' : 'coach.garage') : coachDefault();
  if (name === 'gestion') return coachSay(`coach.gestion_${v}`);
  if (name === 'proprietaire') return v === 'non' ? coachSay('coach.nonProprio') : coachDefault();
}

/* ---------- Saisie ---------- */
app.addEventListener('input', onInput);
app.addEventListener('change', onInput);
function onInput(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  queueMicrotask(updateFill);
  if (el instanceof HTMLInputElement && el.type === 'range' && el.dataset.sync) {
    const name = el.dataset.sync;
    state.values[name] = el.value;
    const num = app.querySelector<HTMLInputElement>(`#${name}`);
    if (num) num.value = el.value;
    paintRange(el);
    checkOne(name, false);
    return;
  }
  if (!el.name) return;
  if (el instanceof HTMLInputElement && el.type === 'checkbox') state.values[el.name] = el.checked;
  else if (el instanceof HTMLInputElement && el.type === 'radio') {
    if (el.checked) state.values[el.name] = el.value;
  } else state.values[el.name] = el.value;
  if (e.type === 'change') coachReact(el.name, state.values[el.name]);

  // Curseur lié à un champ numérique
  const range = app.querySelector<HTMLInputElement>(`input[type="range"][data-sync="${el.name}"]`);
  if (range && el !== range) {
    const n = Number(String(el.value).replace(',', '.'));
    if (Number.isFinite(n)) {
      range.value = String(n);
      paintRange(range);
    }
  }
  if (el.name === 'type') updateNoData();
  if (el.name === 'indicatif') return checkOne('numero', false);
  if (el.name === 'commune') return; // géré par la liste
  // Choix (radio, case) : vérification immédiate ; texte : à la sortie du champ
  const immediate = e.type === 'change';
  const run = () => el.isConnected && checkOne(el.name, immediate && el.value !== '');
  // Champ texte quitté en touchant un autre élément : message affiché après le toucher (voir plus bas)
  if (immediate && pointerDown && el.tagName === 'INPUT' && !['radio', 'checkbox', 'range'].includes(el.type)) return void pendingChecks.push(run);
  run();
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
    input.classList.remove('bump');
    void input.offsetWidth;
    input.classList.add('bump');
    checkOne(name, false);
    coachReact(name, next);
    return;
  }

  const quick = target.closest<HTMLButtonElement>('[data-commune]');
  if (quick) {
    const input = app.querySelector<HTMLInputElement>('#commune');
    if (input) input.value = quick.dataset.commune!;
    setCommune(quick.dataset.commune!);
    return;
  }

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
    const { errors } = checkFields(state.values, stepFields(state.step, state.values.type));
    state.errors = errors;
    if (Object.keys(errors).length) return render();
    state.step = state.returnTo;
    state.returnTo = null;
    state.direction = 'next';
    return render();
  } else if (action === 'reload') {
    location.reload();
  } else if (action === 'fix-email') {
    const v = (target.closest<HTMLElement>('[data-value]')!).dataset.value!;
    state.values.email = v;
    const input = app.querySelector<HTMLInputElement>('#email');
    if (input) input.value = v;
    app.querySelector('#email-suggest')?.remove();
    clearError('email');
  } else if (action === 'back' && !state.sending) {
    // Même chemin que la touche « retour » du navigateur, pour garder l'historique en ordre
    if (depth > 0) return history.back();
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
    const keep = Object.fromEntries(CONTACT_KEYS.map((k) => [k, state.values[k]]));
    state.values = { ...DEFAULTS, ...keep };
    state.result = null;
    state.step = 1;
    state.direction = 'next';
    unwindHistory();
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
  const domaine = at > 0 ? value.slice(at + 1).toLowerCase() : '';
  // Fautes de frappe courantes sur la fin de l'adresse : « .con », « .cmo », « .comm », « .lux »
  const fin = domaine.replace(/\.(con|cmo|ocm|comm|vom|xom)$/, '.com').replace(/\.(lux|lu\.)$/, '.lu');
  const fix = at > 0 ? EMAIL_TYPOS[fin] ?? (fin !== domaine ? fin : undefined) : undefined;
  if (!fix) return;
  const suggestion = value.slice(0, at + 1) + fix;
  app.querySelector('[data-field="email"]')?.insertAdjacentHTML('beforeend', `<p class="suggest" id="email-suggest">${esc(t('fields.emailTypo'))} <button type="button" class="link-btn" data-action="fix-email" data-value="${esc(suggestion)}">${esc(suggestion)}</button> ?</p>`);
  sendHeight();
}
/* Quand on quitte un champ en touchant un autre élément (case à cocher, bouton…), le message d'erreur
 * ou la suggestion qui apparaît décale la page : le doigt tomberait à côté. On attend donc la fin du
 * toucher (après le « click ») pour afficher le message. */
let pointerDown = false;
let pendingChecks: (() => void)[] = [];
document.addEventListener('pointerdown', () => (pointerDown = true), true);
const pointerEnd = () => {
  pointerDown = false;
  const runs = pendingChecks;
  pendingChecks = [];
  if (runs.length) setTimeout(() => runs.forEach((f) => f()), 0);
};
document.addEventListener('pointerup', pointerEnd, true);
document.addEventListener('pointercancel', pointerEnd, true);

app.addEventListener('focusout', (e) => {
  const el = e.target as HTMLInputElement;
  const run = () => {
    if (el.name === 'email') emailSuggest(el.value.trim());
    if (!el.name || el.type === 'radio' || el.type === 'checkbox' || el.name === 'commune' || el.name === 'website') return;
    if (!el.isConnected) return; // étape changée entre-temps
    if (String(el.value).trim() !== '') checkOne(el.name === 'indicatif' ? 'numero' : el.name, true);
  };
  if (pointerDown) pendingChecks.push(run);
  else run();
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  if (state.sending) return;
  state.serverError = null;
  if (state.step === 1) {
    const typed = app.querySelector<HTMLInputElement>('#commune')?.value ?? String(state.values.commune ?? '');
    const resolved = resolveCommune(typed, COMMUNES.map((c) => c.name));
    if (resolved) state.values.commune = resolved;
  }
  const { errors } = checkFields(state.values, stepFields(state.step, state.values.type));
  state.errors = errors;
  if (Object.keys(errors).length) return render();
  if (state.returnTo === state.step + 1) state.returnTo = null;
  if (state.step < TOTAL) {
    state.step += 1;
    state.direction = 'next';
    pushStep();
    return render();
  }
  void send();
});

/* ---------- Envoi : le résultat s'affiche dès que le serveur a répondu (pas d'attente artificielle) ---------- */
type ApiJson = { ok?: boolean; result?: PublicResult; copie?: boolean; error?: string; errors?: Errors };

async function send() {
  state.sending = true;
  state.serverError = null;
  render(false); // bouton « Envoi en cours… » tout de suite
  try {
    await loadLate();
  } catch {
    // Morceau de code introuvable (ex. nouvelle version mise en ligne) : rien n'a été envoyé, on propose de recharger
    lateLoading = null;
    state.sending = false;
    state.serverError = t('errors.reload');
    return render();
  }
  const contactFields = stepFields(TOTAL, state.values.type);
  const answers: Values = {};
  const contact: Values = {};
  for (const [k, v] of Object.entries(state.values)) {
    if (k !== 'website') (contactFields.includes(k) ? contact : answers)[k] = v;
  }
  // Champ anti-robot : invisible, vide pour un humain
  const website = String(state.values.website ?? '');

  let res: Response;
  let json: ApiJson = {};
  try {
    res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang, page, website, answers, contact }),
      signal: AbortSignal.timeout(20_000),
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
    state.copie = json.copie === true;
    pushStep();
    return render();
  }
  if (json.error === 'validation' && json.errors) {
    state.errors = json.errors;
    for (let s = 1; s <= TOTAL; s++) {
      if (stepFields(s, state.values.type).some((f) => f in json.errors!)) {
        state.step = s;
        break;
      }
    }
  } else {
    state.serverError = t(res.status === 429 ? 'errors.rate_limit' : 'errors.server', { contact: config.publicEmail });
  }
  render();
}

/* ---------- Touche « retour » du navigateur ou du téléphone : une étape en arrière ----------
 * Chaque étape franchie (et le résultat) ajoute une entrée à l'historique. « Retour » revient à
 * l'étape précédente au lieu de quitter la page et de perdre les réponses. Depuis le résultat, on
 * revient aux coordonnées (un nouvel envoi refait une estimation et un nouvel e-mail). */
let depth = 0;
let ignorePop = false;
function pushStep() {
  try {
    history.pushState({ loyer: true }, '');
    depth++;
  } catch {
    /* historique indisponible : on garde la navigation par boutons */
  }
}
function unwindHistory() {
  if (depth > 0) {
    ignorePop = true;
    history.go(-depth);
    depth = 0;
  }
}
window.addEventListener('popstate', () => {
  if (ignorePop) {
    ignorePop = false;
    return;
  }
  if (depth > 0) depth--;
  if (state.sending) return;
  if (state.result) {
    state.result = null;
    state.step = TOTAL;
  } else if (state.step > 1) {
    state.step -= 1;
  } else return;
  state.direction = 'back';
  state.errors = {};
  state.serverError = null;
  render();
});

render(false);
post({ type: 'ready' });
