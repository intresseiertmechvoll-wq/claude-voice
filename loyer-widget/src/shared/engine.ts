/**
 * Moteur de calcul du loyer (tourne uniquement sur le serveur).
 *
 * Appartement (sources : data/references.json)
 *   loyer « bail » au m² = médiane du canton                          (rapport n°24, graphique 5)
 *                        × facteur surface (zone, interpolé)          (graphique 7 ÷ médiane de la zone)
 *                        × baux récents ÷ tous les baux (zone)        (graphique 10)
 *                        × indice dernier trimestre ÷ moyenne 2024-2025 (data.public.lu)
 *   loyer « annonce »    = loyer « bail » × 1,17                       (relevé de 350 annonces, 17/11/2026)
 * Maison
 *   loyer « annonce »    = exp(constante de la zone + 0,622 × ln(surface)) (relevé de 84 annonces)
 *                        × indice dernier trimestre ÷ indice au relevé
 *   loyer « bail »       = loyer « annonce » ÷ 1,17                    (même écart que les appartements : hypothèse)
 * Puis, pour les deux :
 *   bas = bail × (1 + coefficients) + stationnement ; haut = annonce × (1 + coefficients) + stationnement ;
 *   milieu = (bas + haut) / 2 ; arrondis à 50 €.
 */
import type { Answers, CommuneData, Dataset, PublicFactor, PublicResult, References, Reliability, Zone } from './types';

export type Params = typeof import('../../params.json');

export interface Detail {
  canton: string;
  zone: Zone;
  /** appartement : chaque étape du calcul au m² */
  medianeCanton: number | null;
  facteurSurface: number | null;
  surfaceM2Zone: number | null;
  facteurBauxRecents: number | null;
  facteurIndice: number;
  /** loyer mensuel de référence avant coefficients */
  bail: number;
  annonce: number;
  coefficients: { key: string; value: number }[];
  coefSum: number;
  coefApplied: number;
  stationnement: { key: 'garage' | 'parking'; qty: number; unit: number; amount: number }[];
  rawLow: number;
  rawHigh: number;
}

export interface Estimate {
  result: PublicResult;
  detail: Detail;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Loyer médian au m² de la zone pour une surface donnée (graphique 7).
 * Valeurs placées au centre des classes (40, 60, 80, 100, 120, 145 m²), interpolation linéaire entre deux centres.
 * Au-dessus de 145 m² : valeur de la dernière classe. En dessous de 40 m² : on prolonge la pente 60 → 40 m²
 * jusqu'au plancher (25 m² par défaut), car les petites surfaces se louent plus cher au m².
 */
export function surfaceM2(refs: References, zone: Zone, surface: number, plancher: number): number {
  const x = refs.cadastre.surface.centres;
  const y = refs.cadastre.surface[zone];
  if (surface >= x[x.length - 1]) return y[y.length - 1];
  if (surface <= x[0]) {
    const pente = (y[0] - y[1]) / (x[1] - x[0]);
    return y[0] + pente * (x[0] - Math.max(surface, plancher));
  }
  for (let i = 0; i < x.length - 1; i++) {
    if (surface <= x[i + 1]) return y[i] + ((surface - x[i]) / (x[i + 1] - x[i])) * (y[i + 1] - y[i]);
  }
  return y[y.length - 1];
}

/**
 * Loyer au m² retenu pour une surface : un logement plus grand ne peut pas avoir un loyer total plus bas.
 * (Dans le Sud, le loyer médian passe de 15,5 €/m² pour 110–129 m² à 12,6 €/m² pour 130 m² et plus :
 * sans cette règle, 140 m² donneraient moins que 127 m².) On garde le loyer total le plus haut atteint
 * par une surface plus petite, ramené au m².
 */
export function surfaceM2Monotone(refs: References, zone: Zone, surface: number, plancher: number): number {
  let best = surface * surfaceM2(refs, zone, surface, plancher);
  for (let x = Math.ceil(plancher); x < surface; x++) best = Math.max(best, x * surfaceM2(refs, zone, x, plancher));
  return best / surface;
}

/** Indice : dernier trimestre ÷ moyenne 2024-2025 (période des « baux récents » du rapport n°24) */
export function facteurIndice(data: Dataset): number {
  return data.indice.dernier_valeur / data.indice.base_valeur;
}

function coefficients(a: Answers, params: Params): { key: string; value: number }[] {
  const c = params.coefficients;
  const out: { key: string; value: number }[] = [];
  out.push({ key: `etat_${a.etat}`, value: c.etat[a.etat] });
  out.push({ key: `energie_${a.energie}`, value: c.energie[a.energie] });
  if (a.type === 'appartement') {
    out.push({ key: `exterieur_${a.exterieur}`, value: c.exterieur_appartement[a.exterieur] });
    const e = c.etage_appartement;
    if (a.etage === 0) out.push({ key: 'rez_de_chaussee', value: e.rez_de_chaussee });
    else if ((a.etage ?? 0) >= e.sans_ascenseur_a_partir_de_l_etage && a.ascenseur === false) out.push({ key: 'etage_sans_ascenseur', value: e.sans_ascenseur });
  }
  return out.filter((x) => x.value !== 0);
}

function stationnement(a: Answers, zone: Zone, refs: References, params: Params): Detail['stationnement'] {
  if (a.type === 'maison' && !params.stationnement.maison) return [];
  const max = params.stationnement.places_max;
  const g = Math.min(a.garages, max);
  const p = Math.min(a.parkings, Math.max(0, max - g));
  const out: Detail['stationnement'] = [];
  if (g) out.push({ key: 'garage', qty: g, unit: refs.stationnement.garageParMois[zone], amount: g * refs.stationnement.garageParMois[zone] });
  if (p) out.push({ key: 'parking', qty: p, unit: refs.stationnement.parkingExterieurParMois[zone], amount: p * refs.stationnement.parkingExterieurParMois[zone] });
  return out;
}

/**
 * Fiabilité affichée (règle simple, à valider par Jason) :
 * - appartement : « bonne » à Luxembourg-Ville, dans les communes autour et dans le Sud pour 40 à 130 m² avec au moins
 *   une chambre ; « limitée » dans les petits cantons du nord et de l'est, pour un studio ou hors 30–160 m² ;
 *   « moyenne » sinon ;
 * - maison : « moyenne » si la zone compte au moins 13 annonces dans le relevé et 100 à 300 m², « limitée » sinon.
 */
export function reliability(a: Answers, c: CommuneData, refs: References, params: Params): Reliability {
  const f = params.fiabilite;
  if (a.type === 'maison') {
    const n = refs.maisons.annonces[c.zone];
    const [lo, hi] = f.maison_surface_moyenne;
    return n >= f.maison_annonces_min_zone && a.surface >= lo && a.surface <= hi ? 'medium' : 'low';
  }
  const [lmin, lmax] = f.appartement_surface_limite;
  if (f.cantons_limites.includes(c.canton) || a.chambres === 0 || a.surface < lmin || a.surface > lmax) return 'low';
  const [bmin, bmax] = f.appartement_surface_bonne;
  if (f.zones_bonnes_appartement.includes(c.zone) && a.surface >= bmin && a.surface <= bmax) return 'high';
  return 'medium';
}

export function estimate(a: Answers, data: Dataset, refs: References, params: Params): Estimate {
  const c = data.communes.find((x) => x.commune === a.commune);
  // La validation n'accepte que les 100 communes de data/cantons.json, toutes présentes dans data/loyers.json
  if (!c) throw new Error(`commune absente des données : ${a.commune}`);
  const zone = c.zone;
  const indice = facteurIndice(data);
  const ratio = params.niveaux.annonce_sur_bail;

  let bail: number;
  let annonce: number;
  let medianeCanton: number | null = null;
  let facteurSurface: number | null = null;
  let surfZone: number | null = null;
  let facteurBaux: number | null = null;

  if (a.type === 'appartement') {
    const cad = refs.cadastre;
    medianeCanton = c.zone === 'LV' ? cad.medianeCanton.LuxembourgVille : (cad.medianeCanton as unknown as Record<string, number>)[c.canton];
    surfZone = surfaceM2Monotone(refs, zone, a.surface, params.surface.plancher_extrapolation_m2);
    facteurSurface = surfZone / cad.medianeZone[zone];
    facteurBaux = cad.bauxRecents[zone].recents / cad.bauxRecents[zone].tous;
    const m2 = medianeCanton * facteurSurface * facteurBaux * indice;
    bail = m2 * a.surface;
    annonce = bail * ratio;
  } else {
    const m = refs.maisons;
    const depuisReleve = data.indice.dernier_valeur / data.indice.releve_maisons_valeur;
    annonce = Math.exp(m.constante[zone] + m.elasticite * Math.log(a.surface)) * depuisReleve;
    bail = annonce / ratio;
  }

  const coefs = coefficients(a, params);
  const coefSum = coefs.reduce((s, x) => s + x.value, 0);
  const coefApplied = clamp(coefSum, params.coefficients.total_min, params.coefficients.total_max);
  const park = stationnement(a, zone, refs, params);
  const parkTotal = park.reduce((s, x) => s + x.amount, 0);

  const rawLow = bail * (1 + coefApplied) + parkTotal;
  const rawHigh = annonce * (1 + coefApplied) + parkTotal;
  const step = params.arrondi;
  let low = roundTo(rawLow, step);
  let high = roundTo(rawHigh, step);
  if (high - low < params.ecart_min_eur) {
    const centre = (rawLow + rawHigh) / 2;
    low = roundTo(centre - params.ecart_min_eur / 2, step);
    high = roundTo(centre + params.ecart_min_eur / 2, step);
  }
  const mid = roundTo((rawLow + rawHigh) / 2, step);

  const factors: PublicFactor[] = [
    ...coefs.map((x) => ({ key: x.key, kind: 'pct' as const, value: x.value })),
    ...park.map((x) => ({ key: x.key, kind: 'eur' as const, value: x.amount, qty: x.qty })),
  ];

  const result: PublicResult = {
    type: a.type,
    commune: c.commune,
    canton: c.canton,
    zone,
    surface: a.surface,
    low,
    mid,
    high,
    perM2: Math.round((mid / a.surface) * 10) / 10,
    meuble: a.meuble,
    factors,
    factorsCapped: coefApplied !== coefSum,
    reliability: reliability(a, c, refs, params),
    compare: {
      offresCommune: a.type === 'appartement' ? c.offres_appartement : c.offres_maison,
      offresType: a.type,
      bauxRecentsZoneM2: refs.cadastre.bauxRecents[zone].recents,
      maisonsReleve: a.type === 'maison' ? refs.maisons.annonces[zone] : null,
    },
    annoncesPeriode: { debut: data.annonces.periode_debut, fin: data.annonces.periode_fin },
    indiceTrimestre: data.indice.dernier_trimestre,
    releveDate: refs.maisons.date,
  };

  return {
    result,
    detail: {
      canton: c.canton,
      zone,
      medianeCanton,
      facteurSurface,
      surfaceM2Zone: surfZone,
      facteurBauxRecents: facteurBaux,
      facteurIndice: indice,
      bail,
      annonce,
      coefficients: coefs,
      coefSum,
      coefApplied,
      stationnement: park,
      rawLow,
      rawHigh,
    },
  };
}
