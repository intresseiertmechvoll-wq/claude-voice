import { describe, expect, it } from 'vitest';
import liveData from '../data/communes.json';
import { estimate } from '../src/shared/engine';
import type { Dataset } from '../src/shared/types';
import { apartment, DATA, house, PARAMS } from './helpers';

describe('Calcul', () => {
  it('Appartement 80 m² à Dudelange : valeur de marché = calcul fait à la main', () => {
    // Données Dudelange (1er juillet 2025 – 30 juin 2026) :
    //   notarié existant 6 512,33 €/m² (130 ventes), annoncé appartement 7 048,27 €/m², loyer annoncé 30,37 €/m²/mois
    // Décote du canton d'Esch = médiane des 12 communes avec ventes et annonces
    //   = moyenne des 6e et 7e valeurs : Kayl (1 − 7256,73 / 7523,24) et Pétange (1 − 6606,04 / 6926,28)
    const decote = ((1 - 7256.73 / 7523.24) + (1 - 6606.04 / 6926.28)) / 2; // 4,083 %
    const notarie = 6512.33;
    const annonces = 7048.27 * (1 - decote); // 6 760,49
    const capitalisation = (30.37 * 12 * (1 - 0.1)) / 0.045; // 7 288,80
    // Garde-fou : capitalisation vs moyenne des deux autres = +9,8 % (< 20 %) → gardée
    const base = 0.5 * notarie + 0.3 * annonces + 0.2 * capitalisation; // 6 742,07 €/m²
    const brut = base * 80 * (1 + 0); // bon état, classe E, gros postes « bon », 1er étage avec ascenseur : coefficients = 0
    const attendu = Math.round(brut / 5000) * 5000;

    expect(attendu).toBe(540000);
    const e = estimate(apartment(), DATA, PARAMS);
    expect(e.result.status).toBe('ok');
    expect(e.detail!.decote.value).toBeCloseTo(decote, 10);
    expect(e.detail!.baseM2).toBeCloseTo(base, 6);
    expect(e.detail!.rawMarket).toBeCloseTo(brut, 4);
    expect(e.result.market).toBe(attendu);
    expect(e.result.low).toBe(Math.round((brut * 0.94) / 5000) * 5000); // 505 000
    expect(e.result.high).toBe(Math.round((brut * 1.06) / 5000) * 5000); // 570 000
    expect(e.result.indicative).toBe(false);
  });

  it('Maison à Dudelange : fourchette de ±12 % et mention « indicative »', () => {
    const e = estimate(house(), DATA, PARAMS);
    expect(e.result.status).toBe('ok');
    expect(e.result.spread).toBe(0.12);
    expect(e.result.indicative).toBe(true);
    const raw = e.detail!.rawMarket;
    expect(e.result.low).toBe(Math.round((raw * 0.88) / 5000) * 5000);
    expect(e.result.high).toBe(Math.round((raw * 1.12) / 5000) * 5000);
    // Base maison = prix annoncé maison × (1 − décote du canton)
    expect(e.detail!.baseM2).toBeCloseTo(5319.93 * (1 - e.detail!.decote.value), 6);
    expect(e.detail!.methods.map((m) => m.key)).toEqual(['annonces_maison']);
  });

  it('Commune avec moins de 10 ventes : le calcul passe sur la médiane du canton', () => {
    // Leudelange : 4 ventes seulement. Médiane des 12 communes du canton d'Esch avec ≥ 10 ventes
    // = (Frisange 7 024,46 + Mondercange 7 078,63) / 2
    const e = estimate(apartment({ commune: 'Leudelange' }), DATA, PARAMS);
    expect(e.result.status).toBe('ok');
    expect(e.detail!.notarieOrigin).toBe('mediane_canton');
    const notarie = e.detail!.methods.find((m) => m.key === 'notarie')!;
    expect(notarie.m2).toBeCloseTo((7024.46 + 7078.63) / 2, 6);
    expect(notarie.used).toBe(true);
  });

  it('Changer seulement la classe énergétique change le prix', () => {
    const a = estimate(apartment({ energie: 'B' }), DATA, PARAMS).result.market!;
    const b = estimate(apartment({ energie: 'G' }), DATA, PARAMS).result.market!;
    const c = estimate(apartment({ energie: 'inconnu' }), DATA, PARAMS).result.market!;
    expect(a).toBeGreaterThan(c);
    expect(c).toBeGreaterThan(b);
  });

  it('Garde-fou : une méthode à plus de 20 % des autres sort du calcul', () => {
    const e = estimate(apartment({ commune: 'Esch-sur-Alzette' }), DATA, PARAMS);
    const cap = e.detail!.methods.find((m) => m.key === 'capitalisation')!;
    expect(cap.used).toBe(false);
    expect(cap.note).toMatch(/exclue/);
  });

  it('Pas assez de données : pas de prix', () => {
    const appt = estimate(apartment({ commune: 'Tandel' }), DATA, PARAMS);
    expect(appt.result.status).toBe('insufficient_data');
    expect(appt.result.market).toBeNull();
    const maison = estimate(house({ commune: 'Bech' }), DATA, PARAMS);
    expect(maison.result.status).toBe('insufficient_data');
  });

  it('Les données à jour (data/communes.json) donnent un prix pour Dudelange', () => {
    const e = estimate(apartment(), liveData as unknown as Dataset, PARAMS);
    expect(e.result.status).toBe('ok');
    expect(e.result.market! % 5000).toBe(0);
  });
});
