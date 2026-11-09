import { describe, expect, it } from 'vitest';
import { loadLang, translator } from '../src/i18n';
import { estimate } from '../src/shared/engine';
import { renderResult } from '../src/ui/result';
import { apartment, DATA, house, PARAMS } from './helpers';

describe('Écran de résultat', () => {
  it('Maison : la mention « indicative » s’affiche, avec la fourchette', () => {
    const r = estimate(house(), DATA, PARAMS).result;
    const html = renderResult(r, translator('fr'), 'fr', 'https://immobuild.lu/contact/');
    expect(html).toContain('data-testid="indicative"');
    expect(html).toContain('Estimation indicative');
    expect(html).toContain('Il n’existe pas de prix de vente publics pour les maisons');
    expect(html).toContain('Estimation indicative basée sur des statistiques publiques. Elle ne remplace pas une estimation sur place.');
    expect(html).toContain('Prendre rendez-vous pour une estimation précise');
    expect(html).toContain('href="https://immobuild.lu/contact/"');
    expect(html).toContain('1 juillet 2025');
  });

  it('Appartement : pas d’encadré « indicative » spécifique aux maisons, mais la phrase de prudence', () => {
    const r = estimate(apartment(), DATA, PARAMS).result;
    const html = renderResult(r, translator('fr'), 'fr', '#');
    expect(html).not.toContain('data-testid="indicative"');
    expect(html).toContain('Elle ne remplace pas une estimation sur place.');
    expect(html).toContain('Prix pour une vente rapide');
    expect(html).toContain('Prix de biens comparables dans votre commune');
    expect(html).toContain('Avec un acheteur coup de cœur');
  });

  it('Commune sans données : pas de prix, message de recontact', () => {
    const r = estimate(apartment({ commune: 'Tandel' }), DATA, PARAMS).result;
    const html = renderResult(r, translator('fr'), 'fr', '#');
    expect(html).toContain('Je vous recontacte avec une estimation personnalisée.');
    expect(html).not.toMatch(/€/);
  });

  it('Textes DE et EN présents pour chaque clé française', async () => {
    const fr = (await import('../src/i18n/fr.json')).default;
    const keys = (o: object, p = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    for (const lang of ['de', 'en'] as const) {
      const other = (await import(`../src/i18n/${lang}.json`)).default;
      expect(keys(other).sort()).toEqual(keys(fr).sort());
    }
  });
});

describe('Résultat enrichi pour le visiteur', () => {
  it('Appartement : explications, position dans la commune et fiabilité', () => {
    const r = estimate(apartment({ energie: 'B', garages: 1 }), DATA, PARAMS).result;
    expect(r.reliability).toBe('high'); // 130 ventes, 3 méthodes gardées
    expect(r.pricePerM2).toBe(Math.round(r.market! / 80));
    expect(r.factors).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'energie_B', kind: 'pct', value: 0.03 }), expect.objectContaining({ key: 'garage', kind: 'eur', qty: 1 })]));
    expect(r.communeStats).toMatchObject({ notarieM2: 6512, notarieMinM2: 4534, notarieMaxM2: 8901, ventes: 130 });
    const html = renderResult(r, translator('fr'), 'fr', '#');
    expect(html).toContain('Votre bien parmi les ventes à Dudelange');
    expect(html).toContain('Classe énergétique B');
    expect(html).toContain('Fiabilité des données');
  });

  it('Maison : pas de comparaison avec les ventes d’appartements, fiabilité affichée', () => {
    const r = estimate(house(), DATA, PARAMS).result;
    expect(r.communeStats?.notarieM2).toBeNull();
    expect(r.reliability).toBe('medium'); // 356 annonces de maisons à Dudelange
    const html = renderResult(r, translator('fr'), 'fr', '#');
    expect(html).not.toContain('Votre bien parmi les ventes');
    expect(html).not.toContain('ventes d’appartements');
  });

  it('Commune sur la médiane du canton : fiabilité « limitée » et explication', () => {
    const r = estimate(apartment({ commune: 'Leudelange' }), DATA, PARAMS).result;
    expect(r.reliability).toBe('low');
    const html = renderResult(r, translator('fr'), 'fr', '#');
    expect(html).toContain('la médiane du canton d’Esch-sur-Alzette est utilisée');
  });

  it('Textes en allemand chargés à la demande', async () => {
    await loadLang('de');
    const r = estimate(house(), DATA, PARAMS).result;
    const html = renderResult(r, translator('de'), 'de', '#');
    expect(html).toContain('Unverbindliche Schätzung');
    expect(html).toContain('Marktwert');
  });
});
