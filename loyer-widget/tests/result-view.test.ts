import { describe, expect, it } from 'vitest';
import de from '../src/i18n/de.json';
import en from '../src/i18n/en.json';
import fr from '../src/i18n/fr.json';
import { loadLang, translator } from '../src/i18n';
import { estimate } from '../src/shared/engine';
import { renderResult } from '../src/ui/result';
import type { Lang } from '../src/shared/types';
import { apartment, DATA, house, PARAMS, REFS } from './helpers';

const OPTS = { contactUrl: 'https://immobuild.lu/contact/', gestionUrl: 'https://immobuild.lu/gestion/', legalUrl: 'https://legilux.public.lu/eli/etat/leg/loi/2006/09/21/n1/consolide/20261002', agent: { name: 'Jason', role: 'ImmoBuild Kohn · Dudelange', photo: '/jay.webp' } };

async function html(lang: Lang, a = apartment()) {
  await loadLang(lang);
  return renderResult(estimate(a, DATA, REFS, PARAMS).result, translator(lang), lang, OPTS);
}

describe('Écran de résultat', () => {
  it('contient la phrase obligatoire, la mention du plafond légal avec son lien et l’appel à confier la gestion', async () => {
    const h = await html('fr');
    expect(h).toContain('Estimation indicative basée sur des statistiques publiques. Elle ne remplace pas une visite.');
    expect(h).toMatch(/Le loyer ne peut pas dépasser un plafond légal lié au capital investi\s:\s5\s% par an/);
    expect(h).toContain('Je vérifie ce point avec vous.');
    expect(h).toContain('href="https://legilux.public.lu/eli/etat/leg/loi/2006/09/21/n1/consolide/20261002"');
    expect(h).toContain('Confier la gestion à ImmoBuild Kohn');
    expect(h).toContain('Prendre rendez-vous');
    expect(h).toContain('href="https://immobuild.lu/gestion/"');
  });

  it('affiche la fourchette, le milieu et le prix au m²', async () => {
    const h = await html('fr');
    expect(h).toMatch(/1\.750\s€/);
    expect(h).toMatch(/1\.900\s€/);
    expect(h).toMatch(/2\.050\s€/);
    expect(h).toMatch(/23,8\s€\/m²/);
    expect(h).toContain('Fiabilité des données');
  });

  it('meublé : explique le supplément mobilier ; vide : pas de mention', async () => {
    expect(await html('fr', apartment({ meuble: true }))).toMatch(/le mobilier se paie à part, au plus 1,5\s%/);
    expect(await html('fr')).not.toContain('mobilier se paie');
  });

  it('maison : comparaison avec le relevé de maisons', async () => {
    const h = await html('fr', house());
    expect(h).toContain('Maisons comparées');
    expect(h).toContain('Calcul fondé sur les annonces de maisons');
  });

  it('pas de mot trompeur (« vrai loyer », « garanti ») dans les trois langues', () => {
    const all = JSON.stringify([fr, de, en]).toLowerCase();
    expect(all).not.toMatch(/vrai loyer|garanti|guarantee|wahre miete|echte miete/);
  });

  it('la phrase obligatoire et la mention légale existent en allemand et en anglais', async () => {
    expect(await html('de')).toContain('Sie ersetzt keine Besichtigung.');
    expect(await html('en')).toContain('It does not replace a visit.');
    expect(await html('de')).toContain('Ich prüfe das mit Ihnen.');
    expect(await html('en')).toContain('I will check this with you.');
  });
});

describe('Textes FR / DE / EN', () => {
  const keys = (o: unknown, p = ''): string[] =>
    Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

  it('les trois langues ont exactement les mêmes clés', () => {
    expect(keys(de).sort()).toEqual(keys(fr).sort());
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it('Jason se présente dans les trois langues', () => {
    expect(fr.coach.start).toContain('Jason');
    expect(de.coach.start).toContain('Jason');
    expect(en.coach.start).toContain('Jason');
  });
});
