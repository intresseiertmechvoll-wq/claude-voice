import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import './styles.css';

import config from '../config.json';
import { pickLang, translator } from './i18n';
import { COMMUNES } from './shared/communes';
import type { PublicResult } from './shared/types';
import { checkFields, stepFields, type Errors } from './shared/validation';
import { setupCombobox } from './ui/combobox';
import { esc } from './ui/html';
import { renderResult } from './ui/result';
import { renderStep, type Values } from './ui/steps';

const TOTAL = 6;
const params = new URLSearchParams(location.search);
const lang = pickLang(params.get('lang'));
const t = translator(lang);
const page = (() => {
  const src = params.get('src') ?? '';
  return /^https?:\/\/[^\s<>"]{1,490}$/.test(src) ? src : '';
})();
const contactUrl = config.contactUrl[lang];
const privacyUrl = config.privacyUrl[lang];

document.documentElement.lang = lang;
document.title = t('meta.title');

const state: {
  step: number;
  values: Values;
  errors: Errors;
  sending: boolean;
  serverError: string | null;
  result: PublicResult | null;
} = {
  step: 1,
  values: { garages: '0', parkings: '0', terrasse: '0', cave: false, jardin: false, indicatif: '+352', rgpd: false },
  errors: {},
  sending: false,
  serverError: null,
  result: null,
};

const app = document.getElementById('app')!;

/* ---------- Hauteur automatique dans l'iframe ---------- */
function post(msg: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage({ source: 'immobuild-estimation', ...msg }, '*');
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
window.addEventListener('load', sendHeight);

/* ---------- Rendu ---------- */
function progress(): string {
  const segs = Array.from({ length: TOTAL }, (_, i) => `<span class="seg${i < state.step ? ' done' : ''}${i === state.step - 1 ? ' current' : ''}"></span>`).join('');
  return `<div class="progress">
  <p class="progress-label">${esc(t('progress', { n: state.step, total: TOTAL }))}</p>
  <div class="progress-bar" aria-hidden="true">${segs}</div>
</div>`;
}

function render(focus = true) {
  if (state.result) {
    app.innerHTML = `<div class="card">${renderResult(state.result, t, lang, contactUrl)}</div>`;
    after(focus);
    return;
  }
  const s = state.step;
  const errorCount = Object.keys(state.errors).length;
  const summary = state.serverError
    ? `<div class="alert" role="alert">${esc(state.serverError)}</div>`
    : errorCount
      ? `<div class="alert" role="alert">${esc(t('errors.summary'))}</div>`
      : '';

  app.innerHTML = `<div class="card">
  ${s === 1 ? `<header class="intro"><h1>${esc(t('intro.title'))}</h1><p>${esc(t('intro.text'))}</p></header>` : ''}
  ${progress()}
  <form id="form" novalidate>
    <h2 class="step-title" id="step-title" tabindex="-1">${esc(t(`steps.${s}.title`))}</h2>
    <p class="step-text">${esc(t(`steps.${s}.text`))}</p>
    ${summary}
    ${renderStep(s, { t, v: state.values, e: state.errors, privacyUrl })}
    <div class="actions">
      ${
        s === TOTAL
          ? `<button type="submit" class="btn btn-primary btn-block" ${state.sending ? 'disabled aria-busy="true"' : ''}>${state.sending ? `<span class="spinner" aria-hidden="true"></span>${esc(t('nav.sending'))}` : esc(t('nav.submit'))}</button>`
          : `<button type="submit" class="btn btn-primary btn-block">${esc(t('nav.next'))}</button>`
      }
      ${s > 1 ? `<button type="button" class="btn btn-secondary" data-action="back" ${state.sending ? 'disabled' : ''}>${esc(t('nav.back'))}</button>` : ''}
    </div>
  </form>
</div>`;

  if (s === 1) {
    setupCombobox(
      app.querySelector<HTMLInputElement>('#commune')!,
      app.querySelector<HTMLUListElement>('#commune-list')!,
      app.querySelector<HTMLElement>('#commune-status')!,
      COMMUNES.map((c) => c.name),
      t('fields.communeEmpty'),
      (name) => {
        state.values.commune = name;
        delete state.errors.commune;
      },
    );
  }
  after(focus);
}

function after(focus: boolean) {
  sendHeight();
  if (!focus) return;
  // Le premier champ en erreur, sinon le titre de l'étape
  const firstError = Object.keys(state.errors)[0];
  const target =
    (firstError && (app.querySelector<HTMLElement>(`[name="${firstError}"]`) ?? app.querySelector<HTMLElement>(`#${firstError}`))) ||
    app.querySelector<HTMLElement>('#step-title, #result-title');
  target?.focus({ preventScroll: true });
  post({ type: 'scroll' });
}

/* ---------- Saisie ---------- */
app.addEventListener('input', onChange);
app.addEventListener('change', onChange);
function onChange(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (!el.name) return;
  if (el instanceof HTMLInputElement && el.type === 'checkbox') state.values[el.name] = el.checked;
  else if (el instanceof HTMLInputElement && el.type === 'radio') {
    if (el.checked) state.values[el.name] = el.value;
  } else state.values[el.name] = el.value;
}

app.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('[data-action="back"]');
  if (!btn || state.sending) return;
  state.step = Math.max(1, state.step - 1);
  state.errors = {};
  state.serverError = null;
  render();
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  if (state.sending) return;
  state.serverError = null;
  const { errors } = checkFields(state.values, stepFields(state.step, state.values.type));
  state.errors = errors;
  if (Object.keys(errors).length) return render();
  if (state.step < TOTAL) {
    state.step += 1;
    return render();
  }
  void send();
});

/* ---------- Envoi ---------- */
async function send() {
  state.sending = true;
  render(false);
  const contactFields = stepFields(6, state.values.type);
  const answers: Values = {};
  const contact: Values = {};
  for (const [k, v] of Object.entries(state.values)) {
    if (k !== 'website') (contactFields.includes(k) ? contact : answers)[k] = v;
  }
  // Champ anti-robot : invisible, vide pour un humain
  const website = String(state.values.website ?? '');

  try {
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang, page, website, answers, contact }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: PublicResult; error?: string; errors?: Errors };
    state.sending = false;
    if (res.ok && json.ok && json.result) {
      state.result = json.result;
      return render();
    }
    if (json.error === 'validation' && json.errors) {
      state.errors = json.errors;
      // Revenir à la première étape qui contient une erreur
      for (let s = 1; s <= TOTAL; s++) {
        if (stepFields(s, state.values.type).some((f) => f in json.errors!)) {
          state.step = s;
          break;
        }
      }
      return render();
    }
    state.serverError = t(res.status === 429 ? 'errors.rate_limit' : 'errors.server');
  } catch {
    state.sending = false;
    state.serverError = t('errors.network');
  }
  render();
}

render(false);
