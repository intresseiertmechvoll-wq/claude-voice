import './fonts.css';
import './styles.css';

import config from '../config.json';
import { deCanton, loadLang, pickLang, translator } from './i18n';
import { COMMUNES } from './shared/communes';
import { POSTES_APPARTEMENT, POSTES_MAISON, type PropertyType, type PublicResult } from './shared/types';
import { checkFields, stepFields, type Errors } from './shared/validation';
import { setupCombobox } from './ui/combobox';
import { esc } from './ui/html';
import { icon } from './ui/icons';
import { formatEuro } from './ui/format';
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
    app.innerHTML = `<div class="card card-result anim-in">${late!.renderResult(state.result, t, lang, { contactUrl, agent: config.agent, phone: config.phone, whatIf: whatIfBase() })}</div>`;
    hydrate();
    countUp();
    after(focus);
    return;
  }
  const s = state.step;
  // Dès l'étape 4, on prépare en arrière-plan le code de l'analyse et du résultat
  if (s >= 4) prefetchLate();
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
      ${renderStep(s, { t, lang, v: state.values, e: state.errors, privacyUrl, quickCommunes: config.quickCommunes })}
    </div>
    <div class="actions">
      ${
        s === TOTAL
          ? `<button type="submit" class="btn btn-primary btn-block btn-go" ${state.sending ? 'disabled aria-busy="true"' : ''}>${state.sending ? `<span class="spinner" aria-hidden="true"></span>${esc(t('nav.sending'))}` : `${esc(t('nav.submit'))}<span class="arrow">${icon('fleche')}</span>`}</button>`
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
    app.querySelector<HTMLElement>('#step-title, #result-title, #analysis-title');
  target?.focus({ preventScroll: true });
  post({ type: 'scroll' });
}

function setCommune(name: string) {
  state.values.commune = name;
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

/* ---------- Bulle de Jay : un mot par étape, et des réactions aux réponses ---------- */
let coachText = '';
function coachHtml(): string {
  coachText = t(state.step === 1 ? 'coach.start' : `coach.step${state.step}`);
  const name = config.agent?.name ?? '';
  const avatar = config.agent?.photo ? `<img class="avatar avatar-sm" src="${esc(config.agent.photo)}" alt="" width="40" height="40">` : `<span class="avatar avatar-sm" aria-hidden="true">${esc(name.charAt(0))}</span>`;
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
function coachReact(name: string, value: unknown) {
  const v = String(value);
  if (name === 'type') return coachSay(`coach.${v}`);
  if (name === 'energie') return coachSay(['A+', 'A', 'B'].includes(v) ? 'coach.energieGood' : ['G', 'H', 'I'].includes(v) ? 'coach.energieBad' : v === 'inconnu' ? 'coach.energieUnknown' : `coach.step2`);
  if (name.startsWith('poste_') && v === 'mauvais') return coachSay('coach.bad');
  if ((name === 'jardin' || name === 'cave') && value === true) return coachSay(`coach.${name}`);
  if (name === 'garages' && Number(v) > 0) return coachSay('coach.garage');
  if (name === 'objectif') return coachSay(`coach.${v}`);
  if (name === 'proprietaire' && v === 'non') return coachSay('coach.nonProprio');
}

/* ---------- Saisie ---------- */
app.addEventListener('input', onInput);
app.addEventListener('change', onInput);
function onInput(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (el.closest('.whatif')) return onWhatIf();
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
  if (el.name === 'indicatif') return checkOne('numero', false);
  if (el.name === 'commune') return; // géré par la liste
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

  const fill = target.closest<HTMLButtonElement>('[data-fill-all]');
  if (fill) {
    const val = fill.dataset.fillAll!;
    app.querySelectorAll<HTMLInputElement>(`input[type="radio"][name^="poste_"][value="${val}"]`).forEach((r) => {
      r.checked = true;
      state.values[r.name] = val;
      clearError(r.name);
    });
    coachSay('coach.allGood');
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
  } else if (action === 'goto-whatif') {
    const box = app.querySelector<HTMLElement>('.whatif');
    if (box) {
      const top = box.getBoundingClientRect().top + window.scrollY - 8;
      // Dans l'iframe, c'est la page du site qui défile ; seule, la page de l'outil défile
      if (window.parent !== window) post({ type: 'scrollTo', offset: Math.round(top) });
      else window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
      box.querySelector<HTMLInputElement>('input:checked, input')?.focus({ preventScroll: true });
    }
  } else if (action === 'whatif-reset') {
    resetWhatIf();
  } else if (action === 'restart') {
    sendSummary();
    // On garde les coordonnées (en mémoire seulement) pour ne pas les retaper
    const keep = Object.fromEntries(CONTACT_KEYS.map((k) => [k, state.values[k]]));
    state.values = { ...DEFAULTS, ...keep };
    state.result = null;
    state.step = 1;
    state.direction = 'next';
    render();
  }
});

/* ---------- Simulateur « Et si… ? » ---------- */
function whatIfBase() {
  const type = (state.values.type as PropertyType) ?? 'appartement';
  const postes: Record<string, string> = {};
  for (const p of type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT) postes[p] = String(state.values[`poste_${p}`] ?? 'inconnu');
  return { type, etat: String(state.values.etat), energie: String(state.values.energie), postes };
}

const scenarios = new Map<string, Record<string, unknown>>();
let summarySent = false;
let simTimer: ReturnType<typeof setTimeout> | undefined;
let simAbort: AbortController | null = null;

function currentChanges(): Record<string, unknown> {
  const base = whatIfBase();
  const changes: Record<string, unknown> = {};
  const energie = app.querySelector<HTMLInputElement>('input[name="wi_energie"]:checked')?.value;
  const etat = app.querySelector<HTMLInputElement>('input[name="wi_etat"]:checked')?.value;
  if (energie && energie !== base.energie) changes.energie = energie;
  if (etat && etat !== base.etat) changes.etat = etat;
  const works = [...app.querySelectorAll<HTMLInputElement>('input[name="wi_work"]:checked')].map((i) => i.value);
  if (works.length) changes.postes = Object.fromEntries(works.map((w) => [w, 'neuf']));
  return changes;
}

function showWhatIf(label: string, value: string, delta: number | null) {
  const l = app.querySelector('#wo-label');
  const v = app.querySelector('#wo-value');
  const d = app.querySelector<HTMLElement>('#wo-delta');
  if (!l || !v || !d) return;
  l.textContent = label;
  v.textContent = value;
  d.className = 'wo-delta' + (delta === null || delta === 0 ? '' : delta > 0 ? ' up' : ' down');
  d.textContent = delta === null || delta === 0 ? '' : `${delta > 0 ? '+' : '−'}${formatEuro(Math.abs(delta), lang)}`;
  const out = app.querySelector<HTMLElement>('.whatif-out');
  out?.classList.remove('flash');
  void out?.offsetWidth;
  out?.classList.add('flash');
}

function onWhatIf() {
  const r = state.result;
  if (!r?.simToken || r.market === null) return;
  const changes = currentChanges();
  clearTimeout(simTimer);
  simAbort?.abort();
  if (!Object.keys(changes).length) return showWhatIf(t('whatif.idle'), formatEuro(r.market, lang), null);
  app.querySelector('#wo-label')!.textContent = t('whatif.loading');
  simTimer = setTimeout(async () => {
    simAbort = new AbortController();
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: r.simToken, changes }),
        signal: simAbort.signal,
      });
      const j = (await res.json()) as { ok?: boolean; market?: number; delta?: number };
      if (!res.ok || !j.ok || j.market === undefined) throw new Error('simulation');
      showWhatIf(j.delta ? t('whatif.newValue') : t('whatif.same'), formatEuro(j.market, lang), j.delta ?? 0);
      const key = JSON.stringify(changes);
      scenarios.delete(key);
      scenarios.set(key, changes);
      while (scenarios.size > 10) scenarios.delete(scenarios.keys().next().value!);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') showWhatIf(t('whatif.error'), formatEuro(r.market!, lang), null);
    }
  }, 250);
}

function resetWhatIf() {
  const base = whatIfBase();
  app.querySelectorAll<HTMLInputElement>('.whatif input').forEach((i) => {
    if (i.name === 'wi_energie') i.checked = i.value === base.energie;
    else if (i.name === 'wi_etat') i.checked = i.value === base.etat;
    else i.checked = false;
  });
  onWhatIf();
}

/** Un seul e-mail de complément à Jay avec les essais, quand le visiteur quitte la page ou passe à la suite */
function sendSummary() {
  const token = state.result?.simToken;
  if (summarySent || !token || !scenarios.size) return;
  summarySent = true;
  const payload = JSON.stringify({ token, scenarios: [...scenarios.values()] });
  const blob = new Blob([payload], { type: 'application/json' });
  if (!navigator.sendBeacon?.('/api/simulation-summary', blob)) {
    void fetch('/api/simulation-summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  }
}
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && sendSummary());
window.addEventListener('pagehide', sendSummary);
app.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('a.btn-primary, a.btn-secondary')) sendSummary();
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

/* ---------- Envoi + écran « Analyse de votre bien » ---------- */
type ApiJson = { ok?: boolean; result?: PublicResult; error?: string; errors?: Errors };
type Outcome = { res: Response; json: ApiJson } | { network: true };
const isSuccess = (o: Outcome | null): o is { res: Response; json: ApiJson & { result: PublicResult } } => !!o && !('network' in o) && o.res.ok && !!o.json.ok && !!o.json.result;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Réponses données aux étapes 1 à 5 (pour « N réponses prises en compte ») */
function answeredCount(): number {
  let n = 0;
  for (let s = 1; s <= 5; s++) for (const f of stepFields(s, state.values.type)) if (state.values[f] !== undefined && state.values[f] !== '') n++;
  return n;
}

async function send() {
  state.sending = true;
  state.serverError = null;
  const contactFields = stepFields(6, state.values.type);
  const answers: Values = {};
  const contact: Values = {};
  for (const [k, v] of Object.entries(state.values)) {
    if (k !== 'website') (contactFields.includes(k) ? contact : answers)[k] = v;
  }
  // Champ anti-robot : invisible, vide pour un humain
  const website = String(state.values.website ?? '');

  // La demande part tout de suite ; l'écran d'analyse avance en parallèle
  let outcome: Outcome | null = null;
  const request: Promise<Outcome> = fetch('/api/estimate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lang, page, website, answers, contact }),
  })
    .then(async (res) => ({ res, json: (await res.json().catch(() => ({}))) as ApiJson }))
    .catch(() => ({ network: true as const }));
  void request.then((o) => (outcome = o));
  const failed = new Promise<void>((r) => void request.then((o) => !isSuccess(o) && r()));

  const type = (state.values.type as PropertyType) ?? 'appartement';
  const actx = { type, commune: String(state.values.commune ?? ''), surface: String(state.values.surface ?? ''), answers: answeredCount() };
  try {
    await loadLate();
  } catch {
    return stopAnalysis({ network: true });
  }
  const { analysisPlan, renderAnalysis, stepTexts } = late!;
  const plan = analysisPlan(config.analysis?.totalMs ?? 5600);
  const meta = `${t(`fields.typeOptions.${type}`)} · ${actx.surface} m² · ${actx.commune}`;
  app.innerHTML = `<div class="card card-analysis anim-in">${renderAnalysis(plan, t, meta)}</div>`;
  const items = [...app.querySelectorAll<HTMLElement>('.astep')];
  const live = app.querySelector<HTMLElement>('#analysis-live')!;
  const fill = app.querySelector<SVGGElement>('#house-fill')!;
  const pctEl = app.querySelector<HTMLElement>('#analysis-pct')!;
  const bar = app.querySelector<HTMLElement>('#analysis-bar')!;
  const barFill = app.querySelector<HTMLElement>('#analysis-bar-fill')!;
  let result: PublicResult | null = null;
  const writeTexts = () =>
    plan.forEach((st, i) => {
      const { title, detail } = stepTexts(st.key, t, actx, result);
      items[i].querySelector('.astep-title')!.textContent = title;
      items[i].querySelector('.astep-detail')!.textContent = detail;
    });
  writeTexts();
  // Dès que le serveur répond, les vrais chiffres remplacent les textes généraux
  void request.then((o) => {
    if (isSuccess(o) && state.sending) {
      result = o.json.result;
      writeTexts();
      sendHeight();
    }
  });
  fill.style.transform = 'translateY(112px)';
  after(true);

  // Progression : la maison se remplit depuis le bas
  let shown = 0;
  const progress = (to: number, ms: number) => {
    fill.style.transition = `transform ${reducedMotion ? 0 : ms}ms ease-in-out`;
    fill.style.transform = `translateY(${(1 - to / 100) * 112}px)`;
    barFill.style.transition = `width ${reducedMotion ? 0 : ms}ms ease-in-out`;
    barFill.style.width = `${to}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(to)));
    const from = shown;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      shown = from + (to - from) * k;
      pctEl.textContent = String(Math.round(shown));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  for (let i = 0; i < plan.length; i++) {
    items[i].classList.add('is-active');
    live.textContent = items[i].querySelector('.astep-title')!.textContent ?? '';
    sendHeight();
    progress(((i + 1) / plan.length) * 100, plan[i].ms);
    await Promise.race([wait(plan[i].ms), failed]);
    if (outcome && !isSuccess(outcome)) return stopAnalysis(outcome);
    if (plan[i].key === 'data') {
      // Les chiffres réels de la commune s'affichent dès que le serveur a répondu
      const o = await request;
      if (!isSuccess(o)) return stopAnalysis(o);
      result = o.json.result;
      if (result.status !== 'ok') {
        items[i].classList.replace('is-active', 'is-done');
        items.slice(i + 1).forEach((el) => el.classList.add('is-skipped'));
        progress(100, 300);
        break;
      }
    }
    items[i].classList.replace('is-active', 'is-done');
  }
  app.querySelector('#analysis-title')!.textContent = t('analysis.done');
  live.textContent = t('analysis.done');
  await wait(reducedMotion ? 150 : 450);
  state.sending = false;
  // Nouveau bien : les essais du simulateur repartent de zéro (le résumé du bien précédent est déjà parti)
  scenarios.clear();
  summarySent = false;
  state.result = result ?? (isSuccess(outcome) ? (outcome as { json: { result: PublicResult } }).json.result : null);
  render();
}

/** Erreur : l'écran d'analyse s'arrête aussitôt (pas de fausse progression) */
function stopAnalysis(o: Outcome) {
  state.sending = false;
  if (!('network' in o) && o.json.error === 'validation' && o.json.errors) {
    state.errors = o.json.errors;
    for (let s = 1; s <= TOTAL; s++) {
      if (stepFields(s, state.values.type).some((f) => f in o.json.errors!)) {
        state.step = s;
        break;
      }
    }
  } else {
    state.serverError = 'network' in o ? t('errors.network') : t(o.res.status === 429 ? 'errors.rate_limit' : 'errors.server');
  }
  render();
}

render(false);
