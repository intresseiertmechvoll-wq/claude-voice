/**
 * Captures d'écran mobiles de chaque étape (Playwright).
 * Prérequis : serveur local lancé (npm run dev) et Playwright installé
 * (npm i -D playwright && npx playwright install chromium).
 * Usage : npm run screenshots   → dossier screenshots/
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-LU' });
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
const pick = (fieldset, text) => page.locator(`fieldset#${fieldset}`).getByText(text, { exact: true }).click();
const next = () => page.getByRole('button', { name: 'Continuer' }).click();

async function step1(type, commune) {
  await page.goto(`${BASE}/?lang=fr&src=${encodeURIComponent('https://immobuild.lu/estimation-gratuite/')}`);
  await pick('type', type);
  await page.locator('#commune').fill(commune.slice(0, 3));
  await page.locator('#commune-list li', { hasText: commune }).first().dispatchEvent('mousedown');
}

// ---------- Appartement à Dudelange ----------
await step1('Appartement', 'Dudelange');
await page.locator('#rue').fill('Rue de la Libération');
await shot('1-le-bien');
await next();

await page.locator('#surface').fill('80');
await page.locator('#chambres').fill('2');
await page.locator('#sdb').fill('1');
await page.locator('#annee').fill('1995');
await pick('etat', 'Bon état');
await page.locator('#energie').selectOption('D');
await page.locator('#etage').selectOption('2');
await pick('ascenseur', 'Oui');
await shot('2-les-donnees');
await next();

for (const [p, v] of [['chassis', 'Bon'], ['chauffage', 'Moyen'], ['electricite', 'Bon'], ['cuisine', 'Neuf'], ['sanitaires', 'Je ne sais pas']]) await pick(`poste_${p}`, v);
await shot('3-les-gros-postes');
await next();

await page.locator('#garages').fill('1');
await page.locator('#terrasse').fill('8');
await page.locator('label.check', { hasText: 'Cave' }).click();
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
await page.locator('#result-title').waitFor();
await shot('7a-resultat-appartement');

// ---------- Maison à Dudelange ----------
await step1('Maison', 'Dudelange');
await next();
await page.locator('#surface').fill('150');
await page.locator('#chambres').fill('4');
await page.locator('#sdb').fill('2');
await page.locator('#annee').fill('1975');
await pick('etat', 'À rafraîchir');
await page.locator('#energie').selectOption('F');
await pick('maisonType', 'Jumelée');
await page.locator('#terrain').fill('450');
await shot('2b-les-donnees-maison');
await next();
for (const p of ['chassis', 'chauffage', 'electricite', 'cuisine', 'sanitaires', 'toiture']) await pick(`poste_${p}`, 'Moyen');
await shot('3b-les-gros-postes-maison');
await next();
await page.locator('label.check', { hasText: 'Jardin' }).click();
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
await page.locator('#result-title').waitFor();
await shot('7b-resultat-maison');

// ---------- Intégration dans une page (embed.js) ----------
await page.goto(`${BASE}/demo.html`);
const frame = page.frameLocator('iframe[data-immobuild-frame]');
await frame.locator('#step-title').waitFor();
await page.waitForTimeout(500);
const h = await page.locator('iframe[data-immobuild-frame]').evaluate((f) => f.style.height);
console.log('Hauteur de l’iframe réglée par postMessage :', h);
await shot('8-integration-embed');

await browser.close();
console.log('Captures enregistrées dans', OUT);
