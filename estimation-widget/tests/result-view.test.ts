import { describe, expect, it } from 'vitest';
import { translator } from '../src/i18n';
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
