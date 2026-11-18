import { describe, expect, it } from 'vitest';
import { baseVide, communeDe, comparer, importerReleve, memeMaison, objets, type AnnonceReleve, type Releve } from '../src/marche/maisons';
import cantons from '../data/cantons.json';
import SECTEURS from '../data/marche/secteurs.json';
import { DATA, PARAMS, REFS } from './helpers';

const a = (id: string, loyer: number, over: Partial<AnnonceReleve> = {}): AnnonceReleve => ({
  source: 'athome', id, url: `https://www.athome.lu/location/maison/x/id-${id}.html`, loyer, surface: 150, chambres: 3, type: 'Maison', localite: 'Dudelange', pays: 'LU', ...over,
});
const releve = (date: string, annonces: AnnonceReleve[], lues: Releve['lues'] = { athome: 100, wortimmo: 40 }): Releve => ({ date, lues, annonces });

describe('Localités → communes', () => {
  it('reconnaît communes, quartiers de Luxembourg, villages et pays étrangers', () => {
    expect(communeDe('Dudelange')).toBe('Dudelange');
    expect(communeDe('Luxembourg-Gasperich - Cloche d\'or')).toBe('Luxembourg');
    expect(communeDe('Wasserbillig')).toBe('Mertert');
    expect(communeDe('Beringen (Mersch)')).toBe('Mersch');
    expect(communeDe('Mondorf-Les-Bains')).toBe('Mondorf-les-Bains');
    expect(communeDe('Thionville (FR)')).toBeNull();
  });
});

describe('Suivi mois après mois', () => {
  it('nouvelle annonce, baisse de prix, disparition, réapparition', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [a('1', 3000), a('2', 3500)]));
    importerReleve(base, releve('2026-12-17', [a('1', 2900)]));
    expect(base.fiches['athome:1'].prix.map((p) => p.loyer)).toEqual([3000, 2900]);
    expect(base.fiches['athome:2'].statut).toBe('disparue');
    expect(base.fiches['athome:2'].disparue_le).toBe('2026-12-17');
    expect(base.releves[1]).toMatchObject({ nouvelles: 0, disparues: 1 });
    importerReleve(base, releve('2027-01-17', [a('1', 2900), a('2', 3400)]));
    expect(base.fiches['athome:2']).toMatchObject({ statut: 'active', reapparue: true, disparue_le: null });
  });

  it('relevé incomplet (moins de la moitié des annonces) : pas de fausses disparitions', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [a('1', 3000), a('2', 3500)]));
    const { avertissements } = importerReleve(base, releve('2026-12-17', [a('1', 3000)], { athome: 30, wortimmo: 40 }));
    expect(avertissements[0]).toMatch(/athome : 30 annonces lues contre 100/);
    expect(base.fiches['athome:2'].statut).toBe('active');
  });

  it('refuse d’importer deux fois le même relevé ou un relevé plus ancien', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [a('1', 3000)]));
    expect(() => importerReleve(base, releve('2026-11-17', [a('1', 3000)]))).toThrow(/déjà importé/);
    expect(() => importerReleve(base, releve('2026-10-17', [a('1', 3000)]))).toThrow(/plus ancien/);
  });

  it('les annonces hors Luxembourg et aberrantes ne faussent pas la comparaison', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [a('1', 3000), a('2', 900, { pays: 'FR', localite: 'Thionville (FR)' }), a('3', 20000, { surface: 600 })]));
    expect(base.fiches['athome:2']).toBeUndefined();
    expect(base.fiches['athome:3'].exclusion).toMatch(/surface/);
  });
});

describe('Doublons entre portails', () => {
  it('même maison sur atHome, immotop et wortimmo : un seul objet, l’annonce atHome est gardée', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [
      a('1', 3000),
      a('7', 2950, { source: 'immotop', url: 'https://www.immotop.lu/annonces/7/', surface: 151 }),
      a('9', 3050, { source: 'wortimmo', url: 'https://www.wortimmo.lu/fr/location-maison-id_9' }),
    ], { athome: 100, immotop: 90, wortimmo: 40 }));
    const o = objets(Object.values(base.fiches));
    expect(o).toHaveLength(1);
    expect(o[0].fiche.source).toBe('athome');
    expect(o[0].annonces).toHaveLength(3);
  });

  it('pas de fusion si la surface, les chambres ou le loyer diffèrent, ni entre deux annonces du même portail', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [
      a('1', 3000),
      a('2', 3000),
      a('7', 3000, { source: 'immotop', url: 'https://www.immotop.lu/annonces/7/', surface: 160 }),
      a('8', 3000, { source: 'immotop', url: 'https://www.immotop.lu/annonces/8/', chambres: 5 }),
      a('9', 3300, { source: 'wortimmo', url: 'https://www.wortimmo.lu/fr/location-maison-id_9' }),
    ], { athome: 100, immotop: 90, wortimmo: 40 }));
    const f = base.fiches;
    expect(memeMaison(f['athome:1'], f['athome:2'])).toBe(false);
    expect(memeMaison(f['athome:1'], f['immotop:7'])).toBe(false);
    expect(memeMaison(f['athome:1'], f['immotop:8'])).toBe(false);
    expect(memeMaison(f['athome:1'], f['wortimmo:9'])).toBe(false);
    expect(objets(Object.values(f))).toHaveLength(5);
  });

  it('une chambre d’écart entre portails : même maison si le loyer est identique, pas si le loyer diffère de 2 %', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [
      a('1', 8900, { chambres: 5, surface: 314 }),
      a('7', 8900, { source: 'immotop', url: 'https://www.immotop.lu/annonces/7/', chambres: 4, surface: 314 }),
      a('2', 3000, { chambres: 3 }),
      a('8', 3060, { source: 'immotop', url: 'https://www.immotop.lu/annonces/8/', chambres: 4 }),
    ], { athome: 100, immotop: 90 }));
    expect(memeMaison(base.fiches['athome:1'], base.fiches['immotop:7'])).toBe(true);
    expect(memeMaison(base.fiches['athome:2'], base.fiches['immotop:8'])).toBe(false);
  });

  it('une maison reste « active » tant qu’au moins un portail l’annonce', () => {
    const base = baseVide();
    const lues = { athome: 100, immotop: 90, wortimmo: 40 };
    importerReleve(base, releve('2026-11-17', [a('1', 3000), a('7', 3000, { source: 'immotop', url: 'https://www.immotop.lu/annonces/7/' })], lues));
    importerReleve(base, releve('2026-12-17', [a('7', 3000, { source: 'immotop', url: 'https://www.immotop.lu/annonces/7/' })], lues));
    expect(base.fiches['athome:1'].statut).toBe('disparue');
    expect(objets(Object.values(base.fiches))[0].statut).toBe('active');
  });
});

describe('Comparaison : au moins 10 maisons par territoire', () => {
  const lues = { athome: 100, immotop: 90, wortimmo: 40 };
  const maisons = (n: number, commune: string, loyer: number, depart = 0) =>
    Array.from({ length: n }, (_, i) => a(String(depart + i), loyer, { localite: commune, surface: 150 + i * 5 }));

  it('le découpage couvre les 100 communes, chacune une seule fois, et chaque secteur a une région', () => {
    const toutes = Object.entries(cantons).filter(([k]) => !k.startsWith('_')).flatMap(([, v]) => v as string[]);
    const affectees = SECTEURS.secteurs.flatMap((s) => s.communes);
    expect(affectees.sort()).toEqual([...toutes].sort());
    const regions = new Set(SECTEURS.regions.map((r) => r.id));
    for (const s of SECTEURS.secteurs) expect(regions.has(s.region)).toBe(true);
  });

  it('le Sud et l’Est sont découpés en plusieurs secteurs', () => {
    const par = (r: string) => SECTEURS.secteurs.filter((s) => s.region === r).map((s) => s.id);
    expect(par('Sud')).toEqual(['sud-ouest', 'esch', 'sud-est']);
    expect(par('Est')).toEqual(['moselle-sud', 'moselle-nord', 'junglinster', 'mullerthal']);
  });

  it('commune avec 10 maisons : comparée sur elle-même ; commune avec 2 : sur son secteur s’il en a 10', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [...maisons(10, 'Dudelange', 3600), ...maisons(2, 'Kayl', 3600, 100)], lues));
    const c = comparer(base, DATA, REFS, PARAMS);
    expect(c.communes.find((l) => l.commune === 'Dudelange')!.reference).toMatchObject({ niveau: 'commune', objets: 10 });
    expect(c.communes.find((l) => l.commune === 'Kayl')!.reference).toMatchObject({ niveau: 'secteur', nom: 'Sud-Est (Dudelange, Bettembourg)', objets: 12 });
  });

  it('Esch et Dudelange sont dans deux secteurs différents du Sud', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [...maisons(6, 'Dudelange', 3600), ...maisons(6, 'Esch-sur-Alzette', 3400, 50)], lues));
    const c = comparer(base, DATA, REFS, PARAMS);
    expect(c.secteurs.find((g) => g.nom === 'Sud-Est (Dudelange, Bettembourg)')!.objets).toBe(6);
    expect(c.secteurs.find((g) => g.nom === 'Esch et Belval')!.objets).toBe(6);
    // aucun secteur n'a 10 maisons : comparaison sur la région Sud (12)
    expect(c.communes.find((l) => l.commune === 'Dudelange')!.reference).toMatchObject({ niveau: 'region', nom: 'Sud', objets: 12 });
  });

  it('secteur sous 10 maisons : la commune est comparée sur sa région', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [...maisons(3, 'Wiltz', 2500), ...maisons(8, 'Diekirch', 2500, 50)], lues));
    const c = comparer(base, DATA, REFS, PARAMS);
    expect(c.communes.find((l) => l.commune === 'Wiltz')!.reference).toMatchObject({ niveau: 'region', nom: 'Nord', objets: 11 });
  });

  it('Luxembourg-Ville est séparée de sa couronne', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [...maisons(4, 'Luxembourg-Belair', 5000), ...maisons(3, 'Strassen', 4000, 50)], lues));
    const c = comparer(base, DATA, REFS, PARAMS);
    expect(c.regions.find((g) => g.nom === 'Luxembourg-Ville')!.objets).toBe(4);
    expect(c.regions.find((g) => g.nom === 'Couronne de Luxembourg-Ville')!.objets).toBe(3);
  });

  it('les maisons disparues comptent 12 mois, puis sortent de la comparaison', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-01-17', maisons(5, 'Dudelange', 3200), lues));
    importerReleve(base, releve('2026-02-17', [], { athome: 100, immotop: 90, wortimmo: 40 }));
    expect(comparer(base, DATA, REFS, PARAMS, '2026-12-17').objetsTotal).toBe(5);
    expect(comparer(base, DATA, REFS, PARAMS, '2027-03-17').objetsTotal).toBe(0);
  });
});
