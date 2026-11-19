/**
 * Captures d'écran mobiles de chaque étape + audit d'accessibilité (axe-core, WCAG 2.1 AA).
 * Prérequis : serveur local lancé (npm run dev) et Playwright installé
 * (npm i -D playwright && npx playwright install chromium).
 * Usage : npm run screenshots   → dossier screenshots/
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = require.resolve('axe-core/axe.min.js');
const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const OUT = fileURLToPath(new URL('../screenshots/', import.meta.url)).replace(/[\\/]?$/, '/'); // fonctionne aussi sous Windows
mkdirSync(OUT, { recursive: true });

// CHROMIUM_PATH : navigateur à utiliser si Playwright n'a pas installé le sien (ex. Chrome sous Windows)
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-LU', bypassCSP: true });
const page = await ctx.newPage();
const problems = [];

/*
 * Géoportail simulé pour le parcours « maison » : le serveur local ne peut pas toujours joindre geoportail.lu.
 * Propositions = réponse réelle enregistrée ; détails = ce que /api/adresse/details calcule à partir des réponses
 * enregistrées (tests/adresse.test.ts). Le parcours « appartement » garde le vrai serveur : sans géoportail,
 * le champ reste un simple champ texte.
 */
const FIXTURES = new URL('../tests/fixtures/geoportail/', import.meta.url);
const SUGGEST = JSON.parse(readFileSync(new URL('fulltextsearch-route-de-bur.json', FIXTURES), 'utf8')).features.map((f) => ({ label: f.properties.label }));
const DETAILS = {
  address: { label: '206, Route de Burange, L-3429 Dudelange', locality: 'Dudelange', zip: '3429', precise: true },
  parcel: { numero: '1329/5186', areaM2: 555.45 },
  building: { footprintM2: 125, adjacent: 0, typeSuggere: 'isolee' },
  flood: { hq100: null, hqext: null },
};
async function mockGeoportal(on) {
  if (!on) return page.unroute('**/api/adresse/**');
  await page.route('**/api/adresse/suggest', (r) => r.fulfill({ json: SUGGEST }));
  await page.route('**/api/adresse/details', (r) => r.fulfill({ json: DETAILS }));
}
/** Rien ne doit déborder horizontalement (contrôle à 320 px) */
async function noOverflow(name) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  if (w[0] > w[1]) problems.push(`${name} : débordement horizontal (${w[0]} px pour ${w[1]} px)`);
}

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
await page.locator('#rue').pressSequentially('Rue de la Libération');
await page.waitForTimeout(800); // propositions demandées au serveur local : sans géoportail, aucune liste, aucun message d'erreur
if (await page.locator('#rue-list').isVisible()) await page.keyboard.press('Escape');
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
await page.locator('#numero').fill('621 483 920');
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
await page.locator('.alert').waitFor();
await shot('6a-coordonnees-sans-case-rgpd-refuse');
await page.locator('label.check', { hasText: 'J’accepte' }).click();
// Numéro manifestement inventé : message aimable, rien n'est envoyé
await page.locator('#numero').fill('621 111 111');
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
await page.locator('#numero-error:not([hidden])').waitFor();
await shot('6c-numero-fictif');
await page.locator('#numero').fill('621 483 920');
await page.locator('#prenom').focus();
await shot('6b-les-coordonnees');
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
await page.locator('#analysis-title').waitFor();
await page.waitForTimeout(2600);
await shot('7-analyse-en-cours');
await page.locator('#result-title').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
await shot('8a-resultat-appartement');
// Version imprimable / PDF : logo en couleur, sans boutons
await page.emulateMedia({ media: 'print' });
await page.screenshot({ path: `${OUT}8e-resultat-impression.png`, fullPage: true });
await page.emulateMedia({ media: 'screen' });
await page.locator('#wi_energie .e-B').click();
await page.locator('label.work', { hasText: 'Salle de bain neuve' }).click();
await page.waitForTimeout(900);
await page.locator('.whatif').screenshot({ path: `${OUT}8c-simulateur-et-si.png` });
await audit('8c-simulateur-et-si');

// ---------- Maison à Dudelange, avec l'adresse choisie dans la liste ----------
await mockGeoportal(true);
await step1('Maison', 'Dudelange', true);
await page.locator('#rue').pressSequentially('route de bur');
await page.locator('#rue-list li').first().waitFor();
await shot('1c-adresse-propositions');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.locator('#rue-found').getByText('Adresse trouvée').waitFor();
await shot('1d-adresse-trouvee');
await next();
await shot('2c-donnees-maison-cadastre');
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
await page.locator('#numero').fill('691 527 038');
await page.locator('label.check', { hasText: 'J’accepte' }).click();
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
await page.locator('#result-title').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
await shot('8b-resultat-maison');
await mockGeoportal(false);

// ---------- 320 px : rien ne déborde (résultat, puis étape 1 avec la liste d'adresses) ----------
await page.setViewportSize({ width: 320, height: 720 });
await page.waitForTimeout(300);
await noOverflow('8b-resultat-maison (320 px)');
await page.locator('section.geo').screenshot({ path: `${OUT}8d-cartes-officielles-320.png` });
await mockGeoportal(true);
await step1('Maison', 'Dudelange', true);
await page.locator('#rue').pressSequentially('route de bur');
await page.locator('#rue-list li').first().waitFor();
await noOverflow('1c-adresse-propositions (320 px)');
await page.screenshot({ path: `${OUT}1e-adresse-propositions-320.png` });
await mockGeoportal(false);
await page.setViewportSize({ width: 390, height: 844 });

// ---------- Lien d'annonce : provenance et étape 1 préremplie ----------
await page.goto(`${BASE}/?lang=fr&commune=D%C3%BCdelingen&type=maison&utm_source=google&utm_medium=cpc&utm_campaign=dudelange-maisons&gclid=TEST`);
await page.locator('#commune-canton').getByText('canton').waitFor();
if ((await page.locator('#commune').inputValue()) !== 'Dudelange') problems.push('Préremplissage : commune non reprise du lien');
if (!(await page.locator('input[name="type"][value="maison"]').isChecked())) problems.push('Préremplissage : type non repris du lien');
const deLink = await page.locator('.language-links a[hreflang="de"]').getAttribute('href');
if (!deLink.includes('utm_campaign=dudelange-maisons') || !deLink.includes('gclid=1') || deLink.includes('TEST')) problems.push(`Lien de langue : provenance mal transmise (${deLink})`);
await shot('1f-lien-annonce-prerempli');

// ---------- Arrivée par une annonce Meta + Google : case facultative « mesure des annonces » ----------
await page.goto(`${BASE}/?lang=fr&commune=Dudelange&type=appartement&utm_source=facebook&fbclid=IwAR3x-capture_test&gclid=EAIaIQ-capture_test`);
await page.locator('#commune-canton').getByText('canton').waitFor();
await next();
await page.locator('#surface').fill('80');
await plus('chambres', 2);
await plus('sdb', 1);
await page.locator('#annee').fill('1995');
await pick('etat', 'Bon état');
await page.locator('#energie .e-D').click();
await pick('etage', '2e');
await pick('ascenseur', 'Oui');
await next();
await page.locator('[data-fill-all="bon"]').click();
await next();
await next();
await pick('proprietaire', 'Oui');
await pick('objectif', 'Vendre');
await pick('delai', 'Dans les 3 mois');
await next();
await page.locator('#prenom').fill('Lea');
await page.locator('#nom').fill('Schmit');
await page.locator('#email').fill('lea.schmit@example.lu');
await page.locator('#numero').fill('691 527 038');
await page.locator('label.check', { hasText: 'J’accepte qu’ImmoBuild Kohn utilise' }).click();
if (await page.locator('#pub').isChecked()) problems.push('Mesure des annonces : case cochée d’avance');
await page.locator('label.check', { hasText: 'Google et Meta' }).click();
await page.locator('#pub').focus();
await shot('6d-mesure-annonces');
await page.setViewportSize({ width: 320, height: 720 });
await page.waitForTimeout(200);
await noOverflow('6d-mesure-annonces (320 px)');
await page.locator('[data-field="pub"]').screenshot({ path: `${OUT}6e-mesure-annonces-320.png` });
await page.setViewportSize({ width: 390, height: 844 });
const sent = page.waitForRequest((r) => r.url().endsWith('/api/estimate'));
await page.getByRole('button', { name: 'Voir mon estimation' }).click();
const payload = JSON.parse((await sent).postData());
if (payload.ads?.consent !== true || payload.ads.fbclid !== 'IwAR3x-capture_test' || payload.ads.gclid !== 'EAIaIQ-capture_test') problems.push(`Mesure des annonces : identifiants non envoyés malgré la case (${JSON.stringify(payload.ads)})`);
await page.locator('#result-title').waitFor({ timeout: 15000 });

// ---------- Intégration dans une page (embed.js) ----------
await page.goto(`${BASE}/demo.html?utm_source=newsletter&utm_campaign=demo-embed&fbclid=SECRET`);
const frameSrc = await page.locator('iframe[data-immobuild-frame]').getAttribute('src');
if (!frameSrc.includes('utm_campaign=demo-embed') || !frameSrc.includes('fbclid=1') || frameSrc.includes('SECRET')) problems.push(`embed.js : provenance mal transmise (${frameSrc})`);
console.log('Adresse de l’iframe :', frameSrc);
const frame = page.frameLocator('iframe[data-immobuild-frame]');
await frame.locator('#step-title').waitFor();
await page.waitForTimeout(600);
const h = await page.locator('iframe[data-immobuild-frame]').evaluate((f) => f.style.height);
console.log('Hauteur de l’iframe réglée par postMessage :', h);
await page.screenshot({ path: `${OUT}9-integration-embed.png`, fullPage: true });

await browser.close();
console.log(problems.length ? `\n✖ Accessibilité (axe-core, WCAG 2.1 AA) :\n${problems.join('\n')}` : '\n✔ Accessibilité : aucune erreur axe-core (WCAG 2.1 AA) sur les écrans capturés');
console.log('Captures enregistrées dans', OUT);
