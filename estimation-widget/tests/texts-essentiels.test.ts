/**
 * Textes qui changent la qualité des réponses ou la confiance : ils ne doivent pas
 * disparaître lors d'une future réduction de texte (revue du 09/11/2026).
 */
import { describe, expect, it } from 'vitest';
import { translator } from '../src/i18n';
import { estimate } from '../src/shared/engine';
import { renderResult } from '../src/ui/result';
import { renderStep } from '../src/ui/steps';
import { apartment, DATA, PARAMS } from './helpers';

const t = translator('fr');
const ctx = (v: Record<string, unknown>) => ({ t, lang: 'fr' as const, v, e: {}, privacyUrl: '#', quickCommunes: [] });

describe('Textes essentiels (exactitude des réponses et confiance)', () => {
  it('Surface nette, terrain en ares, état général expliqué', () => {
    const html = renderStep(2, ctx({ type: 'maison' }));
    expect(html).toContain('Nette = sans l’épaisseur des murs.');
    expect(html).toContain('1 are = 100');
    expect(html).toContain('Jamais habité ou moins de 5 ans');
    expect(html).toContain('Peintures, sols, petits travaux');
  });

  it('Cave et jardin : privatifs', () => {
    const html = renderStep(4, ctx({ type: 'appartement' }));
    expect(html).toContain('Privative');
    expect(html).toContain('Privatif ou à usage exclusif');
  });

  it('Coordonnées : où partent les données', () => {
    const html = renderStep(6, ctx({ type: 'appartement', commune: 'Dudelange', surface: '80', postes: {} }));
    expect(html).toContain('Vos réponses partent par e-mail à ImmoBuild Kohn');
    expect(html).toContain('politique de confidentialité');
  });

  it('Résultat : ventes notariées citées, bornes de la jauge expliquées, raisons de la visite', () => {
    const html = renderResult(estimate(apartment(), DATA, PARAMS).result, t, 'fr', '#');
    expect(html).toContain('ventes notariées');
    expect(html).toContain('hors 5');
    expect(html).toContain('vue, lumière, finitions');
  });
});
