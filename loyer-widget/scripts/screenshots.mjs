/**
 * Captures d'écran de chaque étape + contrôles automatiques :
 *   - accessibilité (axe-core, WCAG 2.1 AA) ;
 *   - aucun élément ne dépasse de la carte ;
 *   - aucun texte coupé (contenu plus large que sa boîte).
 * Largeurs 320, 390, 768 et 1280 px ; langues FR, DE, EN.
 *
 * Prérequis : serveur local lancé (npm run dev) et Playwright installé
 * (npm i -D playwright && npx playwright install chromium).
 * Usage : npm run screenshots
 *   → screenshots/ : jeu de référence (FR, 390 px, haute définition)
 *   → screenshots/tmp/ : toutes les combinaisons (non versionnées)
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = require.resolve('axe-core/axe.min.js');
const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
const TMP = OUT + 'tmp/';
mkdirSync(TMP, { recursive: true });

const WIDTHS = (process.env.WIDTHS ?? '320,390,768,1280').split(',').map(Number);
const LANGS = (process.env.LANGS ?? 'fr,de,en').split(',');
const problems = [];
const browser = await chromium.launch();

/** Contrôles de mise en page : débordement de la carte, texte coupé */
async function layoutCheck(page, name) {
  const issues = await page.evaluate(() => {
    const out = [];
    const card = document.querySelector('.card');
    if (!card) return ['carte introuvable'];
    const c = card.getBoundingClientRect();
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`défilement horizontal de la page (${document.documentElement.scrollWidth} > ${window.innerWidth})`);
    for (const el of card.querySelectorAll('*')) {
      if (el.closest('.sr-only, .hp, [hidden], details:not([open]) > :not(summary)')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const label = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')}`;
      if (r.right > c.right + 1 || r.left < c.left - 1) out.push(`dépasse de la carte : ${label} (${Math.round(r.left)}–${Math.round(r.right)} pour ${Math.round(c.left)}–${Math.round(c.right)})`);
      const textual = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (textual && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && cs.overflowX !== 'auto' && el.scrollWidth > el.clientWidth + 1 && cs.display !== 'inline') {
        out.push(`texte coupé : ${label} « ${el.textContent.trim().slice(0, 40)} » (${el.scrollWidth} > ${el.clientWidth})`);
      }
    }
    return out;
  });
  for (const i of issues) problems.push(`${name} : ${i}`);
}

async function audit(page, name) {
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
  for (const v of res.violations) problems.push(`${name} : axe ${v.id} (${v.impact}) – ${v.nodes.length} élément(s) – ${v.nodes[0]?.target}`);
}

async function run(lang, width, reference) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: reference ? 2 : 1, isMobile: width < 768, hasTouch: width < 768, locale: `${lang}-LU`, bypassCSP: true });
  const page = await ctx.newPage();
  const dir = reference ? OUT : TMP;
  const tag = `${lang}-${width}`;
  const shot = async (step) => {
    await page.waitForTimeout(250);
    const name = reference ? step : `${tag}-${step}`;
    await page.screenshot({ path: `${dir}${name}.png`, fullPage: true });
    await layoutCheck(page, `${tag} ${step}`);
    await audit(page, `${tag} ${step}`);
  };
  const choose = (field, value) => page.locator(`fieldset#${field} label:has(input[value="${value}"])`).first().click();
  const next = () => page.locator('.btn-go').click();
  const plus = async (name, n = 1) => {
    for (let i = 0; i < n; i++) await page.locator(`[data-stepper="${name}"][data-delta="1"]`).click();
  };

  // ---------- Appartement à Dudelange ----------
  await page.goto(`${BASE}/?lang=${lang}&src=${encodeURIComponent('https://immobuild.lu/gestion-locative/')}`);
  await choose('type', 'appartement');
  await page.locator('#commune').fill('Düd');
  await page.locator('#commune-list li').first().waitFor();
  if (reference) await shot('1a-recherche-commune');
  await page.locator('#commune-list li').first().dispatchEvent('mousedown');
  await page.locator('#surface').fill('80');
  await page.locator('#surface').blur();
  await plus('chambres', 2);
  await shot('1-le-bien');
  await next();

  await choose('etat', 'bon');
  await page.locator('#energie .e-C').click();
  await choose('meuble', 'non');
  await choose('exterieur', 'balcon');
  await plus('garages', 1);
  await choose('etage', '2');
  await choose('ascenseur', 'oui');
  await shot('2-les-details');
  await next();

  await choose('proprietaire', 'oui');
  await choose('dejaLoue', 'non');
  await choose('gestion', 'oui');
  await choose('disponibilite', '3mois');
  await shot('3-le-projet');
  await next();

  await page.locator('#prenom').fill('Marie');
  await page.locator('#nom').fill('Muller');
  await page.locator('#email').fill('marie.muller@example.lu');
  await page.locator('#numero').fill('621 123 456');
  await next();
  await page.locator('.alert').waitFor();
  await shot('4a-coordonnees-sans-case-rgpd-refuse');
  await page.locator('label.check').click();
  await shot('4b-les-coordonnees');
  await next();
  await page.locator('#result-title').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot('5a-resultat-appartement');

  // ---------- Maison à Dudelange, meublée (à 390 px seulement : la limite de 20 envois par heure et par IP s'applique aussi en local) ----------
  if (!reference && width !== 390) return ctx.close();
  await page.goto(`${BASE}/?lang=${lang}`);
  await choose('type', 'maison');
  await page.locator('[data-commune="Dudelange"]').click();
  await page.locator('#surface').fill('150');
  await plus('chambres', 4);
  await next();
  await choose('etat', 'rafraichir');
  await page.locator('#energie .e-F').click();
  await choose('meuble', 'oui');
  await choose('exterieur', 'jardin');
  await shot('2b-les-details-maison');
  await next();
  await choose('proprietaire', 'oui');
  await choose('dejaLoue', 'oui');
  await choose('gestion', 'peut_etre');
  await choose('disponibilite', 'plus_tard');
  await next();
  await page.locator('#prenom').fill('Paul');
  await page.locator('#nom').fill('Weber');
  await page.locator('#email').fill('paul.weber@example.lu');
  await page.locator('#numero').fill('691 234 567');
  await page.locator('label.check').click();
  await next();
  await page.locator('#result-title').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot('5b-resultat-maison');
  await ctx.close();
}

// Jeu de référence (FR, 390 px, haute définition)
await run('fr', 390, true);
for (const lang of LANGS) for (const width of WIDTHS) await run(lang, width, false);

// ---------- Intégration dans une page (embed.js) ----------
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, bypassCSP: true });
const page = await ctx.newPage();
await page.goto(`${BASE}/demo.html`);
const frame = page.frameLocator('iframe[data-immobuild-frame]');
await frame.locator('#step-title').waitFor();
await page.waitForTimeout(800);
const h = await page.locator('iframe[data-immobuild-frame]').evaluate((f) => f.style.height);
console.log('Hauteur de l’iframe réglée par postMessage :', h);
await page.screenshot({ path: `${OUT}6-integration-embed.png`, fullPage: true });

await browser.close();
console.log(problems.length ? `\n✖ ${problems.length} problème(s) :\n${problems.join('\n')}` : '\n✔ Aucune erreur axe-core (WCAG 2.1 AA), aucun débordement, aucun texte coupé');
console.log('Captures enregistrées dans', OUT);
process.exit(problems.length ? 1 : 0);
