import { describe, expect, it } from 'vitest';
import { loadLang, translator } from '../src/i18n';
import { estimate } from '../src/shared/engine';
import { analysisPlan, renderAnalysis, stepTexts } from '../src/ui/analysis';
import { apartment, DATA, house, PARAMS } from './helpers';

const t = translator('fr');
const ctx = { type: 'appartement' as const, commune: 'Dudelange', surface: '80', answers: 23 };

describe('Écran « Analyse de votre bien »', () => {
  it('5 étapes dont la durée totale est celle de config.json', () => {
    const plan = analysisPlan(5600);
    expect(plan.map((s) => s.key)).toEqual(['gather', 'data', 'compare', 'adjust', 'final']);
    expect(plan.reduce((s, x) => s + x.ms, 0)).toBe(5600);
    expect(analysisPlan(0).every((s) => s.ms === 0)).toBe(true);
  });

  it('Avant la réponse du serveur : textes généraux, sans chiffres inventés', () => {
    const d = stepTexts('data', t, ctx, null);
    expect(d.title).toBe('Recherche des données de Dudelange');
    expect(d.detail).not.toMatch(/\d/);
    expect(stepTexts('gather', t, ctx, null).detail).toContain('23 réponses prises en compte');
  });

  it('Après la réponse : les vrais chiffres de la commune et le vrai nombre d’ajustements', () => {
    const r = estimate(apartment({ energie: 'B', garages: 1 }), DATA, PARAMS).result;
    expect(stepTexts('data', t, ctx, r).detail).toBe('130 ventes notariées et 508 annonces trouvées à Dudelange');
    expect(stepTexts('adjust', t, ctx, r).detail).toBe(`${r.factors!.length} ajustements appliqués à votre bien`);
  });

  it('Maison : annonces de maisons ; commune sans données : message honnête', () => {
    const r = estimate(house(), DATA, PARAMS).result;
    expect(stepTexts('data', t, { ...ctx, type: 'maison' }, r).detail).toBe('356 annonces de maisons trouvées à Dudelange');
    const none = estimate(apartment({ commune: 'Tandel' }), DATA, PARAMS).result;
    expect(stepTexts('data', t, { ...ctx, commune: 'Tandel' }, none).detail).toBe('Pas assez de données publiques pour Tandel');
  });

  it('Accessible : barre de progression et annonces pour les lecteurs d’écran, en DE aussi', async () => {
    await loadLang('de');
    const html = renderAnalysis(analysisPlan(5600), translator('de'), 'Wohnung · 80 m² · Dudelange');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Ihre Immobilie wird analysiert');
  });
});
