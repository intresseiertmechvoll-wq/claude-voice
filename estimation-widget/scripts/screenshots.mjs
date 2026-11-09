/**
 * Captures d'écran mobiles de chaque étape + audit d'accessibilité (axe-core, WCAG 2.1 AA).
 * Prérequis : serveur local lancé (npm run dev) et Playwright installé
 * (npm i -D playwright && npx playwright install chromium).
 * Usage : npm run screenshots   → dossier screenshots/
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = require.resolve('axe-core/axe.min.js');
const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-LU', bypassCSP: true });
const page = await ctx.newPage();
const problems = [];

async function audit(name) {
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
  for (const v of res.violations) problems.push(`${name} : ${v.id} (${v.impact}) – ${v.nodes.length} élément(s) – ${v.nodes[0]?.target}`);
}
async function shot(name) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  await audit(name);
}
const pick = (fieldset, text) => page.locator(`fieldset#${fieldset}`).locator('label', { hasText: text }).first().click();
const next = () => page.getByRole('button', { name: 'Continuer' }).click();
const plus = (name, n = 1) => Array.from({ length: n }).reduce((p) => p.then(() => page.locator(`[data-stepper="${name}"][data-delta="1"]`).click()), Promise.resolve());

async function step1(type, commune, quick = false) {
  await page.goto(`${BASE}/?lang=fr&src=${encodeURIComponent('https://immobuild.lu/estimation-gratuite/')}`);
  await pick('type', type);
  if (quick) {
    await page.locator(`[data-commune="${commune}"]`).click();
  } else {
    await page.locator('#commune').fill(commune.slice(0, 3));
    await page.locator('#commune-list li', { hasText: commune }).first().waitFor();
  }
}

// ---------- Appartement à Dudelange ----------
await step1('Appartement', 'Dudelange');
await shot('1a-recherche-commune');
await page.locator('#commune-list li', { hasText: 'Dudelange' }).first().dispatchEvent('mousedown');
await page.locator('#rue').fill('Rue de la Libération');
await shot('1b-le-bien');
await next();

await page.locator('#surface').fill('80');
await page.locator('#surface').blur();
await plus('chambres', 2);
await plus('sdb', 1);
await page.locator('#annee').fill('1995');
await pick('etat', 'Bon état');
await page.locator('#energie .e-D').click();
await pick('etage', '2e');
await pick('ascenseur', 'Oui');
await shot('2-les-donnees');
await next();

await page.locator('[data-fill-all="bon"]').click();
await pick('poste_chauffage', 'Moyen');
await pick('poste_cuisine', 'Neuf');
await page.locator('#poste_sanitaires label.rate').last().click();
await shot('3-les-gros-postes');
await next();

await plus('garages', 1);
await page.locator('label.toggle', { hasText: 'Cave' }).click();
await page.locator('#terrasse').fill('8');
await shot('4-les-annexes');
await next();

await pick('proprietaire', 'Oui');
await pick('objectif', 'Vendre');
await pick('delai', 'Dans les 3 mois');
await shot('5-le-projet');
await next();

await page.locator('#prenom').fill('Marie');
await page.locator('#nom').fill('Muller');
await page.locator('#email').fill('marie.muller@example.lu');
await page.locator('#numero').fill('621 123 456');
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
await page.locator('.alert').waitFor();
await shot('6a-coordonnees-sans-case-rgpd-refuse');
await page.locator('label.check', { hasText: 'J’accepte' }).click();
await shot('6b-les-coordonnees');
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
await page.locator('#analysis-title').waitFor();
await page.waitForTimeout(2600);
await shot('7-analyse-en-cours');
await page.locator('#result-title').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
await shot('8a-resultat-appartement');
await page.locator('#wi_energie .e-B').click();
await page.locator('label.work', { hasText: 'Salle de bain neuve' }).click();
await page.waitForTimeout(900);
await page.locator('.whatif').screenshot({ path: `${OUT}8c-simulateur-et-si.png` });
await audit('8c-simulateur-et-si');

// ---------- Maison à Dudelange ----------
await step1('Maison', 'Dudelange', true);
await next();
await page.locator('#surface').fill('150');
await plus('chambres', 4);
await plus('sdb', 2);
await page.locator('#annee').fill('1975');
await pick('etat', 'À rafraîchir');
await page.locator('#energie .e-F').click();
await pick('maisonType', 'Jumelée');
await page.locator('#terrain').fill('450');
await shot('2b-les-donnees-maison');
await next();
for (const p of ['chassis', 'chauffage', 'electricite', 'cuisine', 'sanitaires', 'toiture']) await pick(`poste_${p}`, 'Moyen');
await shot('3b-les-gros-postes-maison');
await next();
await page.locator('label.toggle', { hasText: 'Jardin' }).click();
await next();
await pick('proprietaire', 'Oui');
await pick('objectif', 'Vendre');
await pick('delai', 'Dès que possible');
await next();
await page.locator('#prenom').fill('Paul');
await page.locator('#nom').fill('Weber');
await page.locator('#email').fill('paul.weber@example.lu');
await page.locator('#numero').fill('691 234 567');
await page.locator('label.check', { hasText: 'J’accepte' }).click();
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
await page.locator('#result-title').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
await shot('8b-resultat-maison');

// ---------- Intégration dans une page (embed.js) ----------
await page.goto(`${BASE}/demo.html`);
const frame = page.frameLocator('iframe[data-immobuild-frame]');
await frame.locator('#step-title').waitFor();
await page.waitForTimeout(600);
const h = await page.locator('iframe[data-immobuild-frame]').evaluate((f) => f.style.height);
console.log('Hauteur de l’iframe réglée par postMessage :', h);
await page.screenshot({ path: `${OUT}9-integration-embed.png`, fullPage: true });

await browser.close();
console.log(problems.length ? `\n✖ Accessibilité (axe-core, WCAG 2.1 AA) :\n${problems.join('\n')}` : '\n✔ Accessibilité : aucune erreur axe-core (WCAG 2.1 AA) sur les écrans capturés');
console.log('Captures enregistrées dans', OUT);
