import { describe, expect, it } from 'vitest';
import { computeBudget, ltvFor, notaireHT, prixMaximal } from '../src/shared/budget';
import { communesM2 } from '../src/shared/communes-m2';
import { couple, DATA, PARAMS } from './helpers';

describe('Barème du notaire (acte de vente)', () => {
  it('600 000 € : calcul à la main par tranches = 1 750,23 € HT', () => {
    // 148,74 + 74,37 + 148,74 + 59,49 + 297,47 + 371,84 + 297,47 + 352,11
    expect(notaireHT(600000, PARAMS)).toBeCloseTo(1750.23, 1);
  });
  it('Minimum du barème pour un tout petit montant', () => {
    expect(notaireHT(1000, PARAMS)).toBe(PARAMS.notaire.minimum);
  });
});

describe('Règle CSSF (quotité de prêt)', () => {
  it('100 % premier achat, 90 % autre résidence principale, 90 % si inconnu, 80 % investissement', () => {
    expect(ltvFor({ usage: 'habiter', premier: 'oui' }, PARAMS)).toEqual({ ltv: 1, rule: 'premier' });
    expect(ltvFor({ usage: 'habiter', premier: 'non' }, PARAMS)).toEqual({ ltv: 0.9, rule: 'residence' });
    expect(ltvFor({ usage: 'habiter', premier: 'nsp' }, PARAMS)).toEqual({ ltv: 0.9, rule: 'incertain' });
    expect(ltvFor({ usage: 'investir', premier: 'oui' }, PARAMS)).toEqual({ ltv: 0.8, rule: 'investissement' });
  });
});

describe('Budget complet', () => {
  it('Couple, premier achat, 600 000 € : calcul à la main', () => {
    const b = computeBudget(couple(), PARAMS);
    expect(b.droits).toBe(42000); // 7 %
    expect(b.bellegen).toBe(42000); // plafond 80 000 €, limité aux droits
    expect(b.droitsNets).toBe(0);
    expect(b.notaireVente).toBe(2000); // 1 750,23 × 1,17 = 2 047,77 → arrondi à 100 €
    expect(b.pret).toBe(600000); // 100 %
    expect(b.fraisPretMin).toBe(2700); // 600 000 × 0,29 % = 1 740 + 1 000
    expect(b.fraisPretMax).toBe(4200); // 1 740 + 2 500
    expect(b.apportNecessaireMin).toBe(4800); // 2 047,77 + 2 740
    expect(b.apportNecessaireMax).toBe(6300); // 2 047,77 + 4 240
    expect(b.margeMin).toBe(53700);
    expect(b.prixMax).toBeNull(); // pas de montant d'emprunt connu : pas de prix maximal
  });

  it('Investissement seul, 400 000 €, apport 100 000 € : pas de Bëllegen Akt, 80 %, apport insuffisant', () => {
    const b = computeBudget(couple({ usage: 'investir', achat: 'seul', prix: 400000, apport: 100000 }), PARAMS);
    expect(b.bellegen).toBe(0);
    expect(b.droitsNets).toBe(28000);
    expect(b.pret).toBe(320000);
    // 80 000 + 28 000 + 1 813,77 + 928 + 1 000 = 111 741,77
    expect(b.apportNecessaireMin).toBe(111700);
    expect(b.apportNecessaireMax).toBe(113200);
    expect(b.margeMin).toBeLessThan(0);
  });

  it('Bëllegen Akt déjà utilisé : rien n’est déduit', () => {
    expect(computeBudget(couple({ bellegen: 'oui' }), PARAMS).bellegen).toBe(0);
  });

  it('Seul : plafond de 40 000 € par personne', () => {
    const b = computeBudget(couple({ achat: 'seul', prix: 800000 }), PARAMS);
    expect(b.droits).toBe(56000);
    expect(b.bellegen).toBe(40000);
    expect(b.droitsNets).toBe(16000);
  });

  it('Bien neuf : les 7 % sont présentés comme un maximum', () => {
    expect(computeBudget(couple({ neuf: 'neuf' }), PARAMS).droitsMaximum).toBe(true);
    expect(computeBudget(couple(), PARAMS).droitsMaximum).toBe(false);
  });

  it('Montant d’emprunt connu plus bas que la règle CSSF : le prêt est limité', () => {
    const b = computeBudget(couple({ capaciteMontant: 450000 }), PARAMS);
    expect(b.pret).toBe(450000);
    expect(b.pretLimiteParCapacite).toBe(true);
    expect(b.margeMin).toBeLessThan(0);
  });

  it('Prix maximal : l’apport suffit à ce prix, plus à 5 000 € de plus', () => {
    const i = couple({ apport: 80000, capaciteMontant: 500000 });
    const max = prixMaximal(i, PARAMS)!;
    expect(max % 5000).toBe(0);
    expect(computeBudget({ ...i, prix: max }, PARAMS).margeMin).toBeGreaterThanOrEqual(-100);
    expect(computeBudget({ ...i, prix: max + 5000 }, PARAMS).margeMin).toBeLessThan(0);
  });
});

describe('Surfaces par commune', () => {
  it('Dudelange, appartement ancien : 600 000 € ÷ 6 512 €/m² ≈ 92 m²', () => {
    const [d] = communesM2(600000, ['Dudelange'], 'appartement', 'ancien', DATA, PARAMS);
    expect(d.source).toBe('notarie');
    expect(d.nombre).toBe(130);
    expect(d.m2).toBe(92);
  });
  it('Maison : prix annoncés (pas de prix de vente publics)', () => {
    const [d] = communesM2(600000, ['Dudelange'], 'maison', 'ancien', DATA, PARAMS);
    expect(d.source).toBe('annonce');
    expect(d.m2).toBe(113); // 600 000 ÷ 5 320
  });
  it('Les deux types : une ligne par type et par commune', () => {
    expect(communesM2(600000, ['Dudelange', 'Kayl'], 'les_deux', 'ancien', DATA, PARAMS)).toHaveLength(4);
  });
  it('Commune avec moins de 10 ventes : médiane du canton', () => {
    const few = DATA.communes.find((c) => c.notarie_existant_m2 === null && DATA.communes.some((x) => x.canton === c.canton && x.notarie_existant_m2 !== null))!;
    const [d] = communesM2(600000, [few.commune], 'appartement', 'ancien', DATA, PARAMS);
    expect(d.source).toBe('canton');
    expect(d.m2).toBeGreaterThan(0);
  });
});
