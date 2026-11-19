import { describe, expect, it } from 'vitest';
import peuDeDonnees from '../data/peu-de-donnees.json';
import { estimate, facteurIndice, surfaceM2 } from '../src/shared/engine';
import { apartment, DATA, house, PARAMS, REFS } from './helpers';

const run = (a: Parameters<typeof estimate>[0]) => estimate(a, DATA, REFS, PARAMS);

describe('Calcul à la main : Dudelange, appartement de 80 m², sans ajustement', () => {
  /*
   * 1. Médiane du canton d'Esch-sur-Alzette (rapport n°24, graphique 5)          19,12 €/m²
   * 2. Facteur surface : 80 m² = centre de la classe 70–89 m², zone Sud = 17,9    17,9 ÷ 19,12 = 0,93619
   * 3. Baux récents : zone Sud, 22,59 ÷ 19,39                                       1,16503
   * 4. Indice : T2 2026 = 206,49 ; moyenne 2024-2025 = 197,794                     1,04396
   * 5. 19,12 × 0,93619 × 1,16503 × 1,04396 = 21,771 €/m² ; × 80 m²                  = 1 741,67 € (« bail »)
   * 6. « Annonce » = 1 741,67 × 1,17                                                = 2 037,75 €
   * 7. Arrondis à 50 € : bas 1 750 €, haut 2 050 €, milieu (1 741,67 + 2 037,75) ÷ 2 = 1 889,71 → 1 900 €
   * 8. Au m² : 1 900 ÷ 80 = 23,75 → 23,8 €/m²
   */
  const e = run(apartment());

  it('les étapes intermédiaires correspondent au calcul à la main', () => {
    expect(e.detail.medianeCanton).toBe(19.12);
    expect(e.detail.facteurSurface).toBeCloseTo(17.9 / 19.12, 6);
    expect(e.detail.facteurBauxRecents).toBeCloseTo(22.59 / 19.39, 6);
    expect(e.detail.facteurIndice).toBeCloseTo(206.49 / 197.794, 6);
    expect(e.detail.bail).toBeCloseTo(1741.67, 1);
    expect(e.detail.annonce).toBeCloseTo(2037.75, 1);
  });

  it('le résultat affiché est 1 750 / 1 900 / 2 050 €, soit 23,8 €/m²', () => {
    expect(e.result.low).toBe(1750);
    expect(e.result.mid).toBe(1900);
    expect(e.result.high).toBe(2050);
    expect(e.result.perM2).toBe(23.8);
    expect(e.result.factors).toEqual([]);
    expect(e.result.reliability).toBe('high');
  });

  it('la comparaison montre les 111 annonces de Dudelange et les baux récents du Sud', () => {
    expect(e.result.compare.offresCommune).toBe(111);
    expect(e.result.compare.bauxRecentsZoneM2).toBe(22.59);
  });
});

describe('Rückgriff auf den Kanton', () => {
  it('Kayl (36 annonces) et Rumelange donnent le même loyer que Dudelange : même canton', () => {
    const d = run(apartment()).result;
    for (const commune of ['Kayl', 'Rumelange', 'Esch-sur-Alzette']) {
      const r = run(apartment({ commune })).result;
      expect([r.low, r.mid, r.high]).toEqual([d.low, d.mid, d.high]);
      expect(r.canton).toBe('Esch-sur-Alzette');
    }
  });

  it('Esch-sur-Alzette n’est pas faussé par les chambres meublées des annonces (45,37 €/m² publié)', () => {
    const r = run(apartment({ commune: 'Esch-sur-Alzette' })).result;
    expect(r.perM2).toBeLessThan(30);
    expect(r.mid).toBeLessThan(45.37 * 80 * 0.7);
  });

  it('Luxembourg-Ville a sa propre médiane (25,56 €/m²), plus haute que le reste du canton', () => {
    const ville = run(apartment({ commune: 'Luxembourg' }));
    const campagne = run(apartment({ commune: 'Strassen' }));
    expect(ville.detail.medianeCanton).toBe(25.56);
    expect(campagne.detail.medianeCanton).toBe(22.22);
    expect(ville.result.mid).toBeGreaterThan(campagne.result.mid);
  });
});

describe('Commune sans données publiques propres', () => {
  it('Biwer (0 annonce sur 12 mois) : estimation par le canton de Grevenmacher, et le visiteur est prévenu dès l’étape 1', () => {
    const e = run(apartment({ commune: 'Biwer' }));
    expect(e.result.compare.offresCommune).toBe(0);
    expect(e.detail.medianeCanton).toBe(16.27);
    expect(e.result.mid).toBeGreaterThan(0);
    expect(e.result.low).toBeLessThan(e.result.high);
    expect(peuDeDonnees.appartement).toContain('Biwer');
    expect(peuDeDonnees.appartement).not.toContain('Dudelange');
  });

  it('les petits cantons du nord et de l’est ont une fiabilité « limitée »', () => {
    expect(run(apartment({ commune: 'Clervaux' })).result.reliability).toBe('low');
    expect(run(apartment({ commune: 'Echternach' })).result.reliability).toBe('low');
    expect(run(apartment({ commune: 'Diekirch' })).result.reliability).toBe('medium');
  });

  it('les 100 communes donnent une fourchette valide, dans les deux types de biens', () => {
    for (const c of DATA.communes) {
      for (const a of [apartment({ commune: c.commune }), house({ commune: c.commune })]) {
        const r = run(a).result;
        expect(r.low).toBeGreaterThan(0);
        expect(r.low).toBeLessThan(r.mid);
        expect(r.mid).toBeLessThan(r.high);
        expect(r.low % 50 + r.mid % 50 + r.high % 50).toBe(0);
      }
    }
  });
});

describe('Surface', () => {
  it('le loyer ne baisse jamais quand la surface augmente, dans les 6 zones (pas de saut aux limites des classes)', () => {
    for (const commune of ['Luxembourg', 'Strassen', 'Mamer', 'Dudelange', 'Grevenmacher', 'Diekirch']) {
      let prev = 0;
      for (let s = 15; s <= 300; s += 1) {
        const bail = run(apartment({ surface: s, commune })).detail.bail;
        expect(bail).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = bail;
      }
    }
  });

  it('Sud : 140 m² ne donne pas moins que 127 m²', () => {
    const a = run(apartment({ surface: 127 })).detail.bail;
    const b = run(apartment({ surface: 140 })).detail.bail;
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it('interpolation entre deux centres de classe : 50 m² = moitié entre 40 et 60 m²', () => {
    expect(surfaceM2(REFS, 'Sud', 50, 25)).toBeCloseTo((26.4 + 20.0) / 2, 6);
    expect(surfaceM2(REFS, 'Sud', 145, 25)).toBe(12.6);
    expect(surfaceM2(REFS, 'Sud', 300, 25)).toBe(12.6);
  });

  it('sous 40 m² la pente 60 → 40 m² continue, jusqu’au plancher de 25 m²', () => {
    const pente = (26.4 - 20.0) / 20;
    expect(surfaceM2(REFS, 'Sud', 30, 25)).toBeCloseTo(26.4 + 10 * pente, 6);
    expect(surfaceM2(REFS, 'Sud', 15, 25)).toBeCloseTo(26.4 + 15 * pente, 6);
  });

  it('un studio est signalé « fiabilité limitée »', () => {
    expect(run(apartment({ chambres: 0, surface: 30 })).result.reliability).toBe('low');
  });
});

describe('Maisons (modèle des annonces du 17/11/2026)', () => {
  /*
   * Sud, 150 m² : exp(4,96132 + 0,62222 × ln 150) = exp(8,07903) = 3 226 € (« annonce »)
   * « bail » = 3 226 ÷ 1,17 = 2 757 € ; bas 2 750, milieu (2 757 + 3 226) ÷ 2 = 2 992 → 3 000, haut 3 250
   */
  it('Dudelange, 150 m² : 2 750 / 3 000 / 3 250 €', () => {
    const e = run(house());
    expect(e.detail.annonce).toBeCloseTo(3226, 0);
    expect([e.result.low, e.result.mid, e.result.high]).toEqual([2750, 3000, 3250]);
    expect(e.result.reliability).toBe('medium');
    expect(e.result.compare.maisonsReleve).toBe(13);
  });

  it('le stationnement et l’extérieur ne changent pas le loyer d’une maison (supposés compris)', () => {
    const a = run(house()).result;
    const b = run(house({ garages: 2, exterieur: 'jardin' })).result;
    expect(b.mid).toBe(a.mid);
  });

  it('fiabilité limitée dans le nord ou pour une très petite maison', () => {
    expect(run(house({ commune: 'Wiltz' })).result.reliability).toBe('low');
    expect(run(house({ surface: 80 })).result.reliability).toBe('low');
  });

  it('cohérent avec la moyenne nationale de l’Observatoire (3 720 €, 19,77 €/m²) pour une maison de 188 m²', () => {
    const r = run(house({ commune: 'Mamer', surface: 188 })).result;
    expect(r.high).toBeGreaterThan(3200);
    expect(r.high).toBeLessThan(4300);
  });
});

describe('Ajustements', () => {
  it('meublé : le loyer reste hors mobilier (le supplément légal est séparé)', () => {
    const vide = run(apartment()).result;
    const meuble = run(apartment({ meuble: true })).result;
    expect(meuble.mid).toBe(vide.mid);
    expect(meuble.meuble).toBe(true);
  });

  it('garage et parking ajoutent un montant mensuel de la zone, deux places au plus', () => {
    const base = run(apartment());
    const g = run(apartment({ garages: 1, parkings: 1 }));
    expect(g.detail.stationnement.map((x) => x.amount)).toEqual([140, 80]);
    expect(g.detail.rawLow - base.detail.rawLow).toBeCloseTo(220, 6);
    const trop = run(apartment({ garages: 3, parkings: 3 }));
    expect(trop.detail.stationnement).toEqual([{ key: 'garage', qty: 2, unit: 140, amount: 280 }]);
  });

  it('le total des coefficients est plafonné (−20 % / +15 %)', () => {
    const bas = run(apartment({ etat: 'renover', energie: 'I', etage: 0 }));
    expect(bas.detail.coefSum).toBeCloseTo(-0.12 - 0.04 - 0.03, 6);
    const haut = run(apartment({ etat: 'neuf', energie: 'A', exterieur: 'jardin', commune: 'Luxembourg' }));
    expect(haut.detail.coefSum).toBeCloseTo(0.15, 6);
    const tresHaut = run(apartment({ etat: 'neuf', energie: 'A+', exterieur: 'jardin' }));
    expect(tresHaut.detail.coefApplied).toBeLessThanOrEqual(0.15);
  });

  it('étage élevé sans ascenseur et rez-de-chaussée font baisser le loyer', () => {
    const r1 = run(apartment({ etage: 4, ascenseur: false })).result;
    expect(r1.factors.map((f) => f.key)).toContain('etage_sans_ascenseur');
    const r0 = run(apartment({ etage: 0 })).result;
    expect(r0.factors.map((f) => f.key)).toContain('rez_de_chaussee');
  });

  it('l’indice est appliqué : T2 2026 ÷ moyenne 2024-2025', () => {
    expect(facteurIndice(DATA)).toBeCloseTo(1.04396, 4);
  });
});

describe('Fiabilité et communes avec peu de données', () => {
  it('commune avec peu d’annonces (Rumelange) : au plus « moyenne », comme annoncé à l’étape 1', () => {
    expect(peuDeDonnees.appartement).toContain('Rumelange');
    expect(estimate(apartment({ commune: 'Rumelange' }), DATA, REFS, PARAMS).result.reliability).toBe('medium');
    expect(estimate(apartment({ commune: 'Dudelange' }), DATA, REFS, PARAMS).result.reliability).toBe('high');
  });
});

