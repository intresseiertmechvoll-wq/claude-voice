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
    expect(budgetInput(v)).toEqual({ usage: 'habiter', achat: 'seul', premier: 'oui', bellegen: 'non', neuf: 'ancien', apport: 50000, prix: 450000, capaciteMontant: null, valeurVente: null, restePret: null });
    expect(budgetInput({ ...v, prix: '' })).toBeNull();
  });
});

describe('Bien à vendre', () => {
  it('Valeur et prêt restant lus seulement si le visiteur doit vendre', () => {
    expect(checkFields({ vendre: 'oui_lu', valeurVente: '500k', restePret: '300 000' }, ['valeurVente', 'restePret']).values).toEqual({ valeurVente: 500000, restePret: 300000 });
    expect(checkFields({ vendre: 'non', valeurVente: '500k' }, ['valeurVente']).values.valeurVente).toBeNull();
    expect(checkFields({ vendre: 'oui_lu', valeurVente: '' }, ['valeurVente']).values.valeurVente).toBeNull();
  });
});

describe('Prêt restant obligatoire avec une valeur de vente', () => {
  it('Valeur sans prêt restant : « obligatoire » ; « 0 » accepté', () => {
    expect(checkFields({ vendre: 'oui_lu', valeurVente: '500k', restePret: '' }, ['restePret']).errors.restePret).toBe('required');
    expect(checkFields({ vendre: 'oui_lu', valeurVente: '500k', restePret: '0' }, ['restePret']).values.restePret).toBe(0);
    expect(checkFields({ vendre: 'oui_lu', valeurVente: '', restePret: '' }, ['restePret']).values.restePret).toBeNull();
  });
});

describe('Adresse e-mail avec une faute de frappe connue', () => {
  it('gmial.com refusé (le récapitulatif n’arriverait jamais), gmail.com accepté', () => {
    expect(checkFields({ email: 'marie@gmial.com' }, ['email']).errors.email).toBe('emailTypo');
    expect(checkFields({ email: 'Marie@Gmail.com' }, ['email']).values.email).toBe('marie@gmail.com');
  });
});

describe('Caractères invisibles', () => {
  it('Zero-width, BOM et contrôles bidi retirés du message et des noms', () => {
    expect(checkFields({ message: 'Bon\u200bjour\ufeff' }, ['message']).values.message).toBe('Bonjour');
    expect(checkFields({ prenom: 'Ma\u200drie' }, ['prenom']).values.prenom).toBe('Marie');
  });
});
