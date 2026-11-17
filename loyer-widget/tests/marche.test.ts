import { describe, expect, it } from 'vitest';
import { baseVide, communeDe, comparerCommunes, importerReleve, sansDoublons, type AnnonceReleve, type Releve } from '../src/marche/maisons';
import { DATA, PARAMS, REFS } from './helpers';

const a = (id: string, loyer: number, over: Partial<AnnonceReleve> = {}): AnnonceReleve => ({
  source: 'athome', id, url: `https://www.athome.lu/location/maison/x/id-${id}.html`, loyer, surface: 150, chambres: 3, type: 'Maison', localite: 'Dudelange', pays: 'LU', ...over,
});
const releve = (date: string, annonces: AnnonceReleve[], lues = { athome: 100, wortimmo: 40 }): Releve => ({ date, lues, annonces });

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

describe('Comparaison par commune', () => {
  it('même maison sur atHome et wortimmo : comptée une fois', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', [a('1', 3000), a('9', 3050, { source: 'wortimmo', url: 'https://www.wortimmo.lu/fr/location-maison-id_9' })]));
    expect(sansDoublons(Object.values(base.fiches))).toHaveLength(1);
  });

  it('écart affiché seulement avec assez de maisons ; sinon « trop peu de données »', () => {
    const base = baseVide();
    // Modèle Sud, 150 m² : 3 226 € ; cinq maisons à 3 550 € = +10 %
    importerReleve(base, releve('2026-11-17', ['1', '2', '3', '4', '5'].map((id) => a(id, 3550)).concat(a('6', 2000, { localite: 'Kayl', surface: 100 }))));
    const lignes = comparerCommunes(base, DATA, REFS, PARAMS);
    const dud = lignes.find((l) => l.commune === 'Dudelange')!;
    expect(dud.actives).toBe(5);
    expect(dud.ecart).toBeCloseTo(3550 / 3226, 2);
    expect(dud.verdict).toBe('au-dessus du modèle de 10 % (toutes les annonces)');
    expect(lignes.find((l) => l.commune === 'Kayl')!.verdict).toBe('trop peu de données (1 maison)');
  });

  it('dès 3 maisons disparues, l’écart se calcule sur leur dernier prix', () => {
    const base = baseVide();
    importerReleve(base, releve('2026-11-17', ['1', '2', '3', '4'].map((id) => a(id, 3000))));
    importerReleve(base, releve('2026-12-17', [a('4', 3000)]));
    const dud = comparerCommunes(base, DATA, REFS, PARAMS).find((l) => l.commune === 'Dudelange')!;
    expect(dud.disparues).toBe(3);
    expect(dud.disparuesJoursMedian).toBe(30);
    expect(dud.verdict).toMatch(/au-dessous du modèle de 7 % \(maisons disparues\)/);
  });
});
