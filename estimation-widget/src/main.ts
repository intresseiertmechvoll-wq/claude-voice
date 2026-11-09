import './fonts.css';
import './styles.css';

import config from '../config.json';
import { deCanton, loadLang, pickLang, translator } from './i18n';
import { COMMUNES } from './shared/communes';
import type { PublicResult } from './shared/types';
import { checkFields, stepFields, type Errors } from './shared/validation';
import { setupCombobox } from './ui/combobox';
import { esc } from './ui/html';
import { icon } from './ui/icons';
import { formatEuro, renderResult } from './ui/result';
import { recapItems, renderStep, STEP_ICONS, type Values } from './ui/steps';

const TOTAL = 6;
const params = new URLSearchParams(location.search);
const lang = pickLang(params.get('lang'));
await loadLang(lang);
const t = translator(lang);
const page = (() => {
  const src = params.get('src') ?? '';
  return /^https?:\/\/[^\s<>"]{1,490}$/.test(src) ? src : '';
})();
const contactUrl = config.contactUrl[lang];
const privacyUrl = config.privacyUrl[lang];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.lang = lang;
document.title = t('meta.title');

const DEFAULTS: Values = { garages: '0', parkings: '0', terrasse: '0', cave: false, jardin: false, indicatif: '+352', rgpd: false };
const CONTACT_KEYS = ['prenom', 'nom', 'email', 'indicatif', 'numero'];

const state: {
  step: number;
  values: Values;
  errors: Errors;
  sending: boolean;
  serverError: string | null;
  result: PublicResult | null;
  direction: 'next' | 'back';
} = { step: 1, values: { ...DEFAULTS }, errors: {}, sending: false, serverError: null, result: null, direction: 'next' };

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
window.addEventListener('load', () => {
  sendHeight();
  post({ type: 'ready' });
});

/* ---------- Rendu ---------- */
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
  <div class="pbar" aria-hidden="true"><span class="pbar-fill" data-width="${Math.round(((s - 1) / (TOTAL - 1)) * 100)}"></span></div>
</nav>`;
}

function recapBar(): string {
  if (state.step < 2) return '';
  const items = recapItems(t, state.values).slice(0, 4);
  if (!items.length) return '';
  return `<ul class="recap-bar" aria-label="${esc(t('recap.title'))}">${items.map((i) => `<li>${icon(i.icon, 'ico ico-xs')}<span>${esc(i.text)}</span></li>`).join('')}</ul>`;
}

function render(focus = true) {
  if (state.result) {
    app.innerHTML = `<div class="card card-result anim-in">${renderResult(state.result, t, lang, { contactUrl, agent: config.agent, phone: config.phone })}</div>`;
    hydrate();
    countUp();
    after(focus);
    return;
  }
  const s = state.step;
  const errorCount = Object.keys(state.errors).length;
  const summary = state.serverError
    ? `<div class="alert" role="alert">${icon('info', 'ico ico-sm')}<span>${esc(state.serverError)}</span></div>`
    : errorCount
      ? `<div class="alert" role="alert">${icon('info', 'ico ico-sm')}<span>${esc(t('errors.summary'))}</span></div>`
      : '';

  app.innerHTML = `<div class="card">
  ${
    s === 1
      ? `<header class="intro">
    <p class="kicker">${esc(t('intro.kicker'))}</p>
    <h1>${esc(t('intro.title'))}</h1>
    <p>${esc(t('intro.text'))}</p>
    <ul class="badges">
      <li>${icon('cadeau', 'ico ico-xs')}${esc(t('intro.badges.free'))}</li>
      <li>${icon('check', 'ico ico-xs')}${esc(t('intro.badges.commitment'))}</li>
      <li>${icon('donnees', 'ico ico-xs')}${esc(t('intro.badges.official'))}</li>
      <li>${icon('asap', 'ico ico-xs')}${esc(t('intro.badges.instant'))}</li>
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
        <span class="step-ico">${icon(STEP_ICONS[s - 1])}</span>
        <div>
          <h2 class="step-title" id="step-title" tabindex="-1">${esc(t(`steps.${s}.title`))}</h2>
          <p class="step-text">${esc(t(`steps.${s}.text`))}</p>
        </div>
      </div>
      ${summary}
      ${renderStep(s, { t, lang, v: state.values, e: state.errors, privacyUrl, quickCommunes: config.quickCommunes })}
    </div>
    ${s === TOTAL && config.agent?.name ? `<div class="agent-inline"><span class="avatar" aria-hidden="true">${esc(config.agent.name.charAt(0))}</span><p><strong>${esc(t('agent.title'))}</strong><br>${esc(t('agent.text'))}</p></div>` : ''}
    <div class="actions">
      ${
        s === TOTAL
          ? `<button type="submit" class="btn btn-primary btn-block btn-go" ${state.sending ? 'disabled aria-busy="true"' : ''}>${state.sending ? `<span class="spinner" aria-hidden="true"></span>${esc(t('nav.sending'))}` : `${esc(t('nav.submit'))}${icon('neuf')}`}</button>`
          : `<button type="submit" class="btn btn-primary btn-block btn-go">${esc(t('nav.next'))}<span class="arrow">${icon('fleche')}</span></button>`
      }
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
    el.textContent = formatEuro(Math.round((target * eased) / 1000) * 1000, lang);
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
  post({ type: 'scroll' });
}

function setCommune(name: string) {
  state.values.commune = name;
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
    const key = name === 'commune' && code !== 'required' ? 'errors.commune' : `errors.${code}`;
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

/* ---------- Saisie ---------- */
app.addEventListener('input', onInput);
app.addEventListener('change', onInput);
function onInput(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
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

  // Curseur lié à un champ numérique
  const range = app.querySelector<HTMLInputElement>(`input[type="range"][data-sync="${el.name}"]`);
  if (range && el !== range) {
    const n = Number(String(el.value).replace(',', '.'));
    if (Number.isFinite(n)) {
      range.value = String(n);
      paintRange(range);
    }
  }
  if (el.name === 'indicatif') return checkOne('numero', false);
  if (el.name === 'commune') return; // géré par la liste
  // Choix (radio, case) : vérification immédiate ; texte : à la sortie du champ
  const immediate = e.type === 'change';
  checkOne(el.name, immediate && el.value !== '');
}

app.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;

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
    return;
  }

  const quick = target.closest<HTMLButtonElement>('[data-commune]');
  if (quick) {
    const input = app.querySelector<HTMLInputElement>('#commune');
    if (input) input.value = quick.dataset.commune!;
    setCommune(quick.dataset.commune!);
    return;
  }

  const fill = target.closest<HTMLButtonElement>('[data-fill-all]');
  if (fill) {
    const val = fill.dataset.fillAll!;
    app.querySelectorAll<HTMLInputElement>(`input[type="radio"][name^="poste_"][value="${val}"]`).forEach((r) => {
      r.checked = true;
      state.values[r.name] = val;
      clearError(r.name);
    });
    return;
  }

  const goto = target.closest<HTMLButtonElement>('[data-goto]');
  if (goto) {
    state.step = Number(goto.dataset.goto);
    state.direction = 'back';
    state.errors = {};
    state.serverError = null;
    return render();
  }

  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'back' && !state.sending) {
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
    render();
  }
});

app.addEventListener('focusout', (e) => {
  const el = e.target as HTMLInputElement;
  if (!el.name || el.type === 'radio' || el.type === 'checkbox' || el.name === 'commune' || el.name === 'website') return;
  if (String(el.value).trim() !== '') checkOne(el.name === 'indicatif' ? 'numero' : el.name, true);
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
    state.direction = 'next';
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
