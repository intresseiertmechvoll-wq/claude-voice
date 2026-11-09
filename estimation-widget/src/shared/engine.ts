/**
 * Moteur de calcul (tourne uniquement sur le serveur).
 *
 * Appartement : logique du moteur V1 (audit du 23/10/2026)
 *   - méthode notariée     : prix moyen notarié « existant » de la commune (médiane du canton si < 10 ventes)
 *   - annonces corrigées   : prix annoncé appartement × (1 − décote du canton)
 *   - capitalisation       : loyer annoncé × 12 × (1 − charges) ÷ taux
 *   - poids 50 / 30 / 20 ; une méthode à plus de 20 % de la moyenne des deux autres sort du calcul
 * Maison : prix annoncé maison de la commune × (1 − décote du canton)
 * Puis, pour les deux : × (1 + somme des coefficients) + annexes.
 */
import type { Answers, CommuneData, Dataset, PublicResult } from './types';
import { POSTES_APPARTEMENT, POSTES_MAISON } from './types';

export type Params = typeof import('../../params.json');

export interface Method {
  key: 'notarie' | 'annonces' | 'capitalisation' | 'annonces_maison';
  m2: number | null;
  weight: number;
  used: boolean;
  note: string;
}

export interface Detail {
  canton: string;
  notarieOrigin: 'commune' | 'mediane_canton' | 'absent';
  decote: { value: number; origin: 'canton' | 'national'; communes: number };
  methods: Method[];
  baseM2: number;
  coefficients: { key: string; value: number }[];
  coefSum: number;
  coefApplied: number;
  surface: number;
  buildingValue: number;
  annexes: { key: string; amount: number }[];
  annexesTotal: number;
  communeScale: number;
  rawMarket: number;
}

export interface Estimate {
  result: PublicResult;
  detail: Detail | null;
  reason: string | null;
}

export function median(values: number[]): number | null {
  const a = values.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/** Écart annoncé → notarié d'une commune (appartements, seules données où les deux existent) */
function communeDecote(c: CommuneData): number | null {
  if (c.notarie_existant_m2 === null || c.annonce_appartement_m2 === null) return null;
  return 1 - c.notarie_existant_m2 / c.annonce_appartement_m2;
}

/** Décote du canton = médiane des écarts de ses communes ; à défaut, médiane nationale */
export function cantonDecote(data: Dataset, canton: string, params: Params): Detail['decote'] {
  const p = params.decote_annonce_vente;
  const inCanton = data.communes.filter((c) => c.canton === canton).map(communeDecote).filter((v): v is number => v !== null);
  if (inCanton.length >= p.communes_min_par_canton) {
    return { value: clamp(median(inCanton)!, p.min, p.max), origin: 'canton', communes: inCanton.length };
  }
  const all = data.communes.map(communeDecote).filter((v): v is number => v !== null);
  return { value: clamp(median(all) ?? 0, p.min, p.max), origin: 'national', communes: all.length };
}

/** Médiane des prix notariés « existant » des communes du canton qui ont au moins 10 ventes */
export function cantonNotarialMedian(data: Dataset, canton: string, params: Params): number | null {
  return median(
    data.communes
      .filter((c) => c.canton === canton && c.notarie_existant_m2 !== null && (c.notarie_existant_ventes ?? 0) >= params.donnees.ventes_min_commune)
      .map((c) => c.notarie_existant_m2!),
  );
}

/** Garde-fou du moteur V1 : la méthode la plus éloignée sort si elle s'écarte de plus de 20 % de la moyenne des autres */
export function excludeOutlier(methods: Method[], maxGap: number): void {
  const active = methods.filter((m) => m.used && m.m2 !== null);
  if (active.length < 3) return;
  let worst: { m: Method; gap: number } | null = null;
  for (const m of active) {
    const others = active.filter((o) => o !== m);
    const ref = others.reduce((s, o) => s + o.m2!, 0) / others.length;
    const gap = Math.abs(m.m2! / ref - 1);
    if (!worst || gap > worst.gap) worst = { m, gap };
  }
  if (worst && worst.gap > maxGap) {
    worst.m.used = false;
    worst.m.note = `exclue : écart de ${(worst.gap * 100).toFixed(1)} % avec la moyenne des autres méthodes`;
  }
}

function coefficients(a: Answers, params: Params): { key: string; value: number }[] {
  const c = params.coefficients;
  const out: { key: string; value: number }[] = [];
  out.push({ key: `etat_${a.etat}`, value: c.etat[a.etat] });

  const postes = a.type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT;
  const g = c.gros_postes;
  const raw = postes.reduce((s, p) => s + g[a.postes[p] ?? 'inconnu'], 0);
  out.push({ key: 'gros_postes', value: clamp(raw, g.total_min, g.total_max) });

  out.push({ key: `energie_${a.energie}`, value: c.energie[a.energie] });

  if (a.type === 'appartement') {
    const e = c.etage_appartement;
    if (a.etage === 0) out.push({ key: 'rez_de_chaussee', value: e.rez_de_chaussee });
    else if ((a.etage ?? 0) >= e.sans_ascenseur_a_partir_de_l_etage && a.ascenseur === false) out.push({ key: 'etage_sans_ascenseur', value: e.sans_ascenseur });
    if (a.jardin) out.push({ key: 'jardin_appartement', value: c.jardin_appartement });
  } else if (a.maisonType) {
    out.push({ key: `maison_${a.maisonType}`, value: c.type_maison[a.maisonType] });
    const t = c.terrain_maison;
    const ref = t.surface_reference_m2[a.maisonType];
    const ratio = (a.terrain ?? 0) / ref;
    if (ratio < t.petit_si_moins_de) out.push({ key: 'petit_terrain', value: t.petit });
    else if (ratio > t.grand_si_plus_de) out.push({ key: 'grand_terrain', value: t.grand });
  }
  return out.filter((x) => x.value !== 0);
}

function annexes(a: Answers, baseM2: number, params: Params) {
  const p = params.annexes[a.type];
  const adj = params.annexes.ajustement_commune;
  const scale = clamp(baseM2 / adj.prix_reference_m2, adj.min, adj.max);
  const list: { key: string; amount: number }[] = [];
  if (a.garages) list.push({ key: `garage × ${a.garages}`, amount: a.garages * p.garage * scale });
  if (a.parkings) list.push({ key: `parking extérieur × ${a.parkings}`, amount: a.parkings * p.parking_exterieur * scale });
  if (a.cave && p.cave) list.push({ key: 'cave', amount: p.cave * scale });
  const terrasseM2 = Math.min(a.terrasse, p.terrasse_m2_max);
  if (terrasseM2 > 0 && p.terrasse_ponderation > 0) {
    list.push({ key: `balcon/terrasse ${terrasseM2} m² × ${p.terrasse_ponderation * 100} %`, amount: terrasseM2 * p.terrasse_ponderation * baseM2 });
  }
  return { list: list.filter((x) => x.amount > 0), scale };
}

const OBSERVATOIRE_URL = 'https://data.public.lu/fr/organizations/ministere-du-logement-et-de-lamenagement-du-territoire-observatoire-de-lhabitat/';

/** Source affichée sous le résultat */
export function sourceText(data: Dataset, type: Answers['type']): { source: string; url: string } {
  if (type === 'maison') {
    return {
      source: 'Observatoire de l’Habitat (Ministère du Logement), prix annoncés des maisons – data.public.lu, licence CC0',
      url: data.sources.annonce_maison?.jeu_de_donnees ?? OBSERVATOIRE_URL,
    };
  }
  return {
    source: 'Observatoire de l’Habitat (Ministère du Logement), ventes notariées, prix et loyers annoncés des appartements – data.public.lu, licence CC0',
    url: OBSERVATOIRE_URL,
  };
}

export function estimate(a: Answers, data: Dataset, params: Params): Estimate {
  const c = data.communes.find((x) => x.commune === a.commune);
  const { source, url } = sourceText(data, a.type);
  const spread = a.type === 'maison' ? params.maison.ecart_fourchette : params.appartement.ecart_fourchette;
  const empty = (reason: string): Estimate => ({
    result: { status: 'insufficient_data', type: a.type, commune: a.commune, low: null, market: null, high: null, spread: null, indicative: true, periode: data.periode, source, sourceUrl: url },
    detail: null,
    reason,
  });
  if (!c) return empty('commune absente des données');

  const decote = cantonDecote(data, c.canton, params);
  const methods: Method[] = [];
  let notarieOrigin: Detail['notarieOrigin'] = 'absent';

  if (a.type === 'appartement') {
    const w = params.appartement.poids;
    const ownNotarial = c.notarie_existant_m2 !== null && (c.notarie_existant_ventes ?? 0) >= params.donnees.ventes_min_commune;
    // Il faut au moins une donnée propre à la commune (ventes ou annonces), sinon pas de prix.
    if (!ownNotarial && c.annonce_appartement_m2 === null) return empty('pas de ventes notariées ni de prix annoncés pour les appartements dans la commune');

    let notarial: number | null = null;
    let note = '';
    if (ownNotarial) {
      notarial = c.notarie_existant_m2;
      notarieOrigin = 'commune';
      note = `${c.notarie_existant_ventes} ventes dans la commune`;
    } else {
      notarial = cantonNotarialMedian(data, c.canton, params);
      notarieOrigin = notarial === null ? 'absent' : 'mediane_canton';
      note = notarial === null ? 'aucune vente publiée dans le canton' : `moins de ${params.donnees.ventes_min_commune} ventes (${c.notarie_existant_ventes ?? 0}) : médiane du canton ${c.canton}`;
    }
    methods.push({ key: 'notarie', m2: notarial, weight: w.notarie, used: notarial !== null, note });

    const ann = c.annonce_appartement_m2 === null ? null : c.annonce_appartement_m2 * (1 - decote.value);
    methods.push({
      key: 'annonces',
      m2: ann,
      weight: w.annonces,
      used: ann !== null,
      note: ann === null ? 'pas assez d’annonces dans la commune' : `${c.annonce_appartement_m2} €/m² annoncé × (1 − ${(decote.value * 100).toFixed(1)} %)`,
    });

    const cp = params.capitalisation;
    const cap = c.loyer_appartement_m2 === null ? null : (c.loyer_appartement_m2 * 12 * (1 - cp.charges_non_recuperables)) / cp.taux;
    methods.push({
      key: 'capitalisation',
      m2: cap,
      weight: w.capitalisation,
      used: cap !== null,
      note: cap === null ? 'pas assez de loyers annoncés dans la commune' : `${c.loyer_appartement_m2} €/m²/mois × 12 × (1 − ${cp.charges_non_recuperables * 100} %) ÷ ${(cp.taux * 100).toFixed(1)} %`,
    });

    excludeOutlier(methods, params.donnees.ecart_max_methode);
  } else {
    if (c.annonce_maison_m2 === null) return empty('pas assez d’annonces de maisons dans la commune');
    methods.push({
      key: 'annonces_maison',
      m2: c.annonce_maison_m2 * (1 - decote.value),
      weight: 1,
      used: true,
      note: `${c.annonce_maison_m2} €/m² annoncé (maisons) × (1 − ${(decote.value * 100).toFixed(1)} %)`,
    });
  }

  const used = methods.filter((m) => m.used && m.m2 !== null);
  if (!used.length) return empty('aucune méthode utilisable');
  const totalWeight = used.reduce((s, m) => s + m.weight, 0);
  const baseM2 = used.reduce((s, m) => s + m.m2! * m.weight, 0) / totalWeight;

  const coefs = coefficients(a, params);
  const coefSum = coefs.reduce((s, x) => s + x.value, 0);
  const coefApplied = clamp(coefSum, params.coefficients.total_min, params.coefficients.total_max);
  const buildingValue = baseM2 * a.surface * (1 + coefApplied);
  const ax = annexes(a, baseM2, params);
  const annexesTotal = ax.list.reduce((s, x) => s + x.amount, 0);
  const rawMarket = buildingValue + annexesTotal;
  const step = params.arrondi;

  return {
    result: {
      status: 'ok',
      type: a.type,
      commune: a.commune,
      low: roundTo(rawMarket * (1 - spread), step),
      market: roundTo(rawMarket, step),
      high: roundTo(rawMarket * (1 + spread), step),
      spread,
      indicative: a.type === 'maison',
      periode: data.periode,
      source,
      sourceUrl: url,
    },
    detail: {
      canton: c.canton,
      notarieOrigin,
      decote,
      methods,
      baseM2,
      coefficients: coefs,
      coefSum,
      coefApplied,
      surface: a.surface,
      buildingValue,
      annexes: ax.list,
      annexesTotal,
      communeScale: ax.scale,
      rawMarket,
    },
    reason: null,
  };
}
