import { describe, expect, it } from 'vitest';
import { budgetInput, checkFields, parseMoney } from '../src/shared/validation';

describe('Montants tolérants', () => {
  it.each([
    ['60 000', 60000],
    ['60.000 €', 60000],
    ["60'000", 60000],
    ['60k', 60000],
    ['1,2 M', 1200000],
    ['1.200.000', 1200000],
    ['600,000', 600000],
    ['60 000,50', 60000],
    ['600000 EUR', 600000],
  ])('« %s » = %d', (raw, n) => expect(parseMoney(raw)).toBe(n));
  it('Texte non numérique refusé', () => {
    expect(checkFields({ apport: 'beaucoup' }, ['apport']).errors.apport).toBe('invalid');
  });
  it('Prix trop bas refusé', () => {
    expect(checkFields({ prix: '10 000' }, ['prix']).errors.prix).toBe('range');
  });
});

describe('Montant d’emprunt connu', () => {
  it('Ignoré si le visiteur répond « non »', () => {
    expect(checkFields({ capacite: 'non', capaciteMontant: '300000' }, ['capaciteMontant']).values.capaciteMontant).toBeNull();
  });
  it('Facultatif même avec « oui »', () => {
    expect(checkFields({ capacite: 'oui', capaciteMontant: '' }, ['capaciteMontant']).values.capaciteMontant).toBeNull();
    expect(checkFields({ capacite: 'oui', capaciteMontant: '450 000' }, ['capaciteMontant']).values.capaciteMontant).toBe(450000);
  });
});

describe('Aperçu du budget', () => {
  it('Disponible dès que les étapes 1 à 3 sont valides, sans coordonnées', () => {
    const v = { usage: 'habiter', achat: 'seul', premier: 'oui', bellegen: 'non', vendre: 'non', neuf: 'ancien', apport: '50k', prix: '450 000', banque: 'oui', capacite: 'non' };
    expect(budgetInput(v)).toEqual({ usage: 'habiter', achat: 'seul', premier: 'oui', bellegen: 'non', neuf: 'ancien', apport: 50000, prix: 450000, capaciteMontant: null });
    expect(budgetInput({ ...v, prix: '' })).toBeNull();
  });
});
