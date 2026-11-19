/**
 * Contrôle navigateur : correction d'une faute de frappe dans l'adresse e-mail (« …@gmial.com » → « …@gmail.com »).
 *
 * Cas couvert : le curseur est encore dans le champ e-mail et le visiteur clique sur la proposition. Le mousedown
 * retire le focus du champ (focusout) ; la proposition ne doit pas être recréée à ce moment-là, sinon le clic
 * tombe à côté et l'adresse reste fausse. Vérifie aussi le point d'interrogation selon la langue.
 *
 * Prérequis : serveur local lancé (npm run build && npx vite preview --port 4173, ou npm run dev) et Playwright.
 * Usage : BASE_URL=http://localhost:4173 node scripts/check-email-suggest.mjs
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const QUESTION_MARK = { fr: ' ?', de: '?', en: '?' };

const browser = await chromium.launch();
const failures = [];

/** Choisit la première option de chaque groupe de boutons radio encore vide de l'étape affichée */
async function pickAllRadios(page) {
  const names = await page.$$eval('form input[type="radio"]', (els) => [...new Set(els.map((e) => e.name))]);
  for (const name of names) {
    if (await page.locator(`input[name="${name}"]:checked`).count()) continue;
    await page.locator(`input[type="radio"][name="${name}"]`).first().check({ force: true });
  }
}
const next = (page) => page.locator('form button[type="submit"]').click();

async function toContactStep(page, lang) {
  await page.goto(`${BASE}/?lang=${lang}`);
  await page.locator('input[name="type"][value="appartement"]').check({ force: true });
  await page.locator('[data-commune]').first().click();
  await page.locator('#rue').fill('Rue de la Libération');
  await page.keyboard.press('Escape');
  await next(page);
  await page.locator('#surface').fill('80');
  await page.locator('[data-stepper="chambres"][data-delta="1"]').click();
  await page.locator('[data-stepper="sdb"][data-delta="1"]').click();
  await page.locator('#annee').fill('1995');
  await page.locator('#energie .e-D').click();
  await pickAllRadios(page);
  await next(page);
  await page.locator('[data-fill-all="bon"]').click();
  await next(page);
  await next(page);
  await pickAllRadios(page);
  await next(page);
  await page.locator('#email').waitFor();
}

for (const lang of (process.env.LANGS ?? 'fr,de,en').split(',')) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const fail = (msg) => failures.push(`[${lang}] ${msg}`);
  try {
    await toContactStep(page, lang);
    await page.locator('#email').fill('marie@gmial.com');
    await page.locator('#prenom').click(); // un autre champ : la proposition apparaît
    const suggest = page.locator('#email-suggest');
    await suggest.waitFor();
    const text = await suggest.textContent();
    if (!text.endsWith(`marie@gmail.com${QUESTION_MARK[lang]}`)) fail(`texte de la proposition inattendu : ${JSON.stringify(text)}`);

    // Retour dans le champ, puis clic direct sur la proposition (souris réelle : mousedown → focusout → click)
    await page.focus('#email');
    await page.click('[data-action="fix-email"]');
    const value = await page.inputValue('#email');
    if (value !== 'marie@gmail.com') fail(`clic avec le champ e-mail actif : adresse restée « ${value} »`);
    if (await suggest.count()) fail('la proposition est encore affichée après la correction');

    // La proposition suit la saisie : nouvelle faute → nouvelle proposition, adresse correcte → plus rien
    await page.locator('#email').fill('marie@hotmial.com');
    await page.locator('#prenom').click();
    if ((await page.locator('[data-action="fix-email"]').getAttribute('data-value')) !== 'marie@hotmail.com') fail('proposition non mise à jour après une autre faute');
    await page.locator('#email').fill('marie@hotmail.com');
    await page.locator('#prenom').click();
    if (await suggest.count()) fail('proposition encore affichée pour une adresse correcte');
  } catch (e) {
    fail(`erreur : ${e.message.split('\n').slice(0, 4).join(' / ')}`);
  }
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Proposition de correction e-mail : OK (fr, de, en)');
