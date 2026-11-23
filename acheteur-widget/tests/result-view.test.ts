import { describe, expect, it } from 'vitest';
import de from '../src/i18n/de.json';
import en from '../src/i18n/en.json';
import { loadLang, translator } from '../src/i18n';
import { computeBudget } from '../src/shared/budget';
import { communesM2 } from '../src/shared/communes-m2';
import type { PublicResult } from '../src/shared/types';
import { renderBudgetPreview, renderResult } from '../src/ui/result';
import { renderStep, type Ctx } from '../src/ui/steps';
import { couple, DATA, PARAMS } from './helpers';

const t = translator('fr');
const opts = { date: '2026-11-18', bellegenAnnonce: { montant: 45000, actuel: 40000, etatAu: '2026-11-18' }, bellegenChoix: 'non' as const, usage: 'habiter' as const };
const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('Aperçu du budget (sans coordonnées)', () => {
  const html = renderBudgetPreview(computeBudget(couple(), PARAMS), t, 'fr', opts);
  it('Montre le besoin total, le prêt CSSF et l’apport nécessaire', () => {
    const txt = strip(html);
    expect(txt).toContain('Besoin total');
    expect(txt).toContain('Premier achat pour y habiter : jusqu’à 100 % du prix.');
    expect(txt).toContain('Apport nécessaire au minimum');
    expect(txt).toContain('si votre banque vous prête ce montant');
  });
  it('Dit clairement que ce n’est ni un conseil en crédit ni une offre de prêt', () => {
    expect(strip(html)).toContain('Cet outil ne constitue ni un conseil en crédit ni une offre de prêt.');
  });
  it('Annonce les 45 000 € sans les utiliser dans le calcul', () => {
    expect(strip(html)).toContain('loi n’est pas encore votée');
  });
  it('Quand la loi passe (montant actuel = montant annoncé), l’annonce disparaît', () => {
    const later = renderBudgetPreview(computeBudget(couple(), PARAMS), t, 'fr', { ...opts, bellegenAnnonce: { montant: 45000, actuel: 45000, etatAu: '2026-11-18' } });
    expect(strip(later)).not.toContain('pas encore votée');
  });
  it('Aucun prix de commune dans l’aperçu', () => {
    expect(html).not.toMatch(/m²/);
  });
  it('Apport insuffisant : montant manquant et pistes, sans jugement', () => {
    const txt = strip(renderBudgetPreview(computeBudget(couple({ usage: 'investir', prix: 400000, apport: 50000 }), PARAMS), t, 'fr', { ...opts, usage: 'investir' }));
    expect(txt).toContain('il manque environ');
    expect(txt).toContain('Pistes');
    expect(txt).toContain('Pas de Bëllegen Akt pour un investissement locatif.');
  });
});

describe('Résultat complet', () => {
  const b = computeBudget(couple(), PARAMS);
  const r: PublicResult = { budget: b, communes: communesM2(600000, ['Dudelange', 'Kayl'], 'les_deux', 'ancien', DATA, PARAMS), periodeDebut: '2025-07-01', periodeFin: '2026-06-30', taux: null };
  const html = renderResult(
    r,
    { prix: 600000, premier: 'oui', usage: 'habiter', bellegen: 'non', vendre: 'oui_lu', renover: 'selon_prix', mandat: 'oui', courtier: true, revenu: null },
    'Marie',
    t,
    'fr',
    { contactUrl: 'https://immobuild.lu/contact/', estimationUrl: 'https://estimatioun.lu/?lang=fr', agent: { name: 'Jason', role: 'ImmoBuild Kohn' }, phone: '+352 621 830 272', ...opts },
  );
  const txt = strip(html);
  it('Surfaces par commune, avec la source et « prix demandés » pour les maisons', () => {
    expect(txt).toContain('≈ 92 m²');
    expect(txt).toContain('130 ventes notariées');
    expect(txt).toContain('prix demandés, pas prix de vente');
  });
  it('Renvoi vers l’estimation si le visiteur doit d’abord vendre', () => {
    expect(html).toContain('href="https://estimatioun.lu/?lang=fr"');
    expect(txt).toContain('Vous devez d’abord vendre ?');
  });
  it('Cartes accompagnement, rénovation et financement', () => {
    expect(txt).toContain('Accompagnement à l’achat');
    expect(txt).toContain('Un bien à rénover ?');
    expect(txt).toContain('Notre courtier partenaire vous contactera');
  });
  it('Le revenu : seulement un repère de banque, jamais une mensualité', () => {
    expect(txt).toContain('Ce n’est pas une règle légale');
    expect(txt).not.toMatch(/mensualité de \d/);
  });
});

describe('Case courtier', () => {
  const ctx = (nomVisible: boolean): Ctx => ({ t, lang: 'fr', v: {}, e: {}, privacyUrl: '', estimationUrl: '', quickCommunes: [], courtierNomPublic: nomVisible ? 'atHome Finance' : '' });
  it('Texte de Jason : « notre courtier partenaire », sans nom par défaut', () => {
    const html = renderStep(3, ctx(false));
    expect(strip(html)).toContain('avec notre courtier partenaire.');
    expect(html).not.toContain('atHome');
    expect(html).not.toMatch(/name="courtier"[^>]*checked/);
  });
  it('Lien « En savoir plus » vers la section courtier de la politique de confidentialité, sans nommer le courtier', () => {
    const html = renderStep(3, { ...ctx(false), courtierInfoUrl: 'https://immobuild.lu/politique-de-confidentialite-cookies/#courtier-partenaire' });
    expect(html).toContain('href="https://immobuild.lu/politique-de-confidentialite-cookies/#courtier-partenaire"');
    expect(strip(html)).toContain('En savoir plus');
    expect(html).not.toContain('atHome');
  });
  it('Avec courtierNomPublic : le nom apparaît dans « Qui est notre courtier partenaire ? »', () => {
    expect(renderStep(3, ctx(true))).toContain('atHome Finance');
  });
});

describe('Reste à rembourser (revue 19/11)', () => {
  const ctx = (v: Record<string, string>): Ctx => ({ t, lang: 'fr', v: { vendre: 'oui_lu', ...v }, e: {}, privacyUrl: '', estimationUrl: '', quickCommunes: [], courtierNomPublic: '' });
  const champ = (html: string) => html.slice(html.indexOf('data-field="restePret"'), html.indexOf('data-field="restePret"') + 1200);
  it('Sans valeur de vente : facultatif, pas requis', () => {
    const f = champ(renderStep(3, ctx({})));
    expect(f).toContain('<span class="optional">(facultatif)</span>');
    expect(f).not.toContain('aria-required');
  });
  it('Avec une valeur de vente : plus de « (facultatif) » visible, annoncé comme requis', () => {
    const f = champ(renderStep(3, ctx({ valeurVente: '450 000' })));
    expect(f).toContain('<span class="optional" hidden>');
    expect(f).toMatch(/id="restePret"[^>]*aria-required="true"/);
  });
});

describe('Textes essentiels dans les 3 langues', () => {
  it('Avertissement « ni conseil en crédit ni offre de prêt » en allemand et en anglais', () => {
    expect(de.budget.disclaimer).toContain('weder eine Kreditberatung noch ein Kreditangebot');
    expect(en.budget.disclaimer).toContain('neither credit advice nor a loan offer');
  });
  it('L’allemand se charge et remplace le français', async () => {
    await loadLang('de');
    expect(translator('de')('budget.total')).toBe('Gesamtbedarf');
  });
});

describe('Simulateur et vente dans l’aperçu', () => {
  it('Curseurs, montants de départ et lignes de la vente', async () => {
    const { renderSim, simBounds } = await import('../src/ui/result');
    const b = computeBudget(couple({ apport: 20000, valeurVente: 500000, restePret: 300000 }), PARAMS);
    const html = renderBudgetPreview(b, t, 'fr', opts, { prixDepart: 600000, apportDepart: 20000 });
    const txt = strip(html);
    expect(html).toContain('id="sim-prix"');
    expect(html).toContain('id="sim-apport"');
    expect(txt).toContain('Produit net de la vente');
    expect(txt).toContain('Apport total');
    expect(txt).toContain('prêt relais');
    expect(simBounds({ prixDepart: 600000, apportDepart: 20000 })).toEqual({ prix: { min: 360000, max: 840000, step: 5000 }, apport: { min: 0, max: 120000, step: 1000 } });
    // « Revenir au départ » caché tant que rien n'a bougé, visible ensuite
    expect(renderSim(b, { prixDepart: 600000, apportDepart: 20000 }, t, 'fr')).toMatch(/id="sim-depart" hidden/);
    expect(renderSim(computeBudget(couple({ prix: 550000, apport: 20000 }), PARAMS), { prixDepart: 600000, apportDepart: 20000 }, t, 'fr')).not.toMatch(/id="sim-depart" hidden/);
  });
});

describe('Surtaxe communale', () => {
  it('Avertissement si Luxembourg ou Mamer est choisie, sans montant ajouté', () => {
    const b = computeBudget(couple(), PARAMS);
    const avec = strip(renderBudgetPreview(b, t, 'fr', { ...opts, surtaxe: ['Luxembourg'] }));
    expect(avec).toContain('Luxembourg : une surtaxe communale');
    expect(strip(renderBudgetPreview(b, t, 'fr', { ...opts, surtaxe: [] }))).not.toContain('surtaxe');
  });
});
