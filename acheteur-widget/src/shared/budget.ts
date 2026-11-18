/**
 * Calcul du budget d'achat. Le même code tourne dans le navigateur (aperçu sans
 * coordonnées) et sur le serveur (e-mail du lead). Aucune donnée de prix de
 * commune ici : seulement des règles publiques (droits, Bëllegen Akt, CSSF, barème notarial).
 */
import type { Budget, BudgetInput, LtvRule } from './types';

export type Params = typeof import('../../params.json');

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/** Honoraires du notaire pour un acte de vente (barème par tranches), hors TVA */
export function notaireHT(prix: number, p: Params): number {
  let total = 0;
  let bas = 0;
  for (const t of p.notaire.tranches) {
    const haut = t.jusqua ?? Infinity;
    if (prix > bas) total += (Math.min(prix, haut) - bas) * t.taux;
    bas = haut;
  }
  return Math.max(total, p.notaire.minimum);
}

/** Quotité maximale de prêt selon le règlement CSSF 20-08 */
export function ltvFor(i: Pick<BudgetInput, 'usage' | 'premier'>, p: Params): { ltv: number; rule: LtvRule } {
  if (i.usage === 'investir') return { ltv: p.ltv.investissement, rule: 'investissement' };
  if (i.premier === 'oui') return { ltv: p.ltv.premier, rule: 'premier' };
  // « je ne sais pas » : on applique la règle la plus prudente des deux
  return { ltv: p.ltv.residence, rule: i.premier === 'non' ? 'residence' : 'incertain' };
}

/** Plafond du Bëllegen Akt pour le ménage. 0 si investissement ou déjà utilisé. */
export function bellegenPlafond(i: Pick<BudgetInput, 'usage' | 'achat' | 'bellegen'>, p: Params): number {
  if (i.usage !== 'habiter' || i.bellegen === 'oui') return 0;
  return (i.achat === 'deux' ? 2 : 1) * p.bellegen.par_personne;
}

/** Calcul brut (sans arrondi) pour un prix donné */
function raw(i: BudgetInput, prix: number, p: Params) {
  const droits = prix * p.droits.taux;
  const plafond = bellegenPlafond(i, p);
  const bellegen = Math.min(droits, plafond);
  const notaireVente = notaireHT(prix, p) * (1 + p.notaire.tva);
  const { ltv, rule } = ltvFor(i, p);
  const pretMaxCssf = prix * ltv;
  const pret = i.capaciteMontant !== null ? Math.min(pretMaxCssf, i.capaciteMontant) : pretMaxCssf;
  const fraisFixes = pret * (p.pret.droit_acte_pret + p.pret.inscription);
  const fraisPretMin = pret > 0 ? fraisFixes + p.pret.divers_min : 0;
  const fraisPretMax = pret > 0 ? fraisFixes + p.pret.divers_max : 0;
  const base = prix + droits - bellegen + notaireVente;
  return { droits, plafond, bellegen, notaireVente, ltv, rule, pretMaxCssf, pret, fraisPretMin, fraisPretMax, totalMin: base + fraisPretMin, totalMax: base + fraisPretMax };
}

/**
 * Prix maximal pour un apport et un montant d'emprunt connus.
 * Sans montant connu, il n'y en a pas : avec 100 % de prêt possible (premier achat), seul le revenu limite, et l'outil ne le calcule pas.
 */
export function prixMaximal(i: BudgetInput, p: Params): number | null {
  if (i.capaciteMontant === null) return null;
  const ok = (prix: number) => {
    const r = raw(i, prix, p);
    return r.totalMax - r.pret <= i.apport;
  };
  let lo = 0;
  let hi = 20_000_000;
  if (!ok(1000)) return 0;
  for (let k = 0; k < 60 && hi - lo > 100; k++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  // arrondi vers le bas à 5 000 € : un prix maximal ne doit jamais être surestimé
  return Math.floor(lo / 5000) * 5000;
}

export function computeBudget(i: BudgetInput, p: Params): Budget {
  const r = raw(i, i.prix, p);
  const step = p.arrondi;
  const rd = (v: number) => roundTo(v, step);
  const apportNecessaireMin = Math.max(0, r.totalMin - r.pret);
  const apportNecessaireMax = Math.max(0, r.totalMax - r.pret);
  return {
    prix: i.prix,
    droits: rd(r.droits),
    droitsMaximum: i.neuf === 'neuf',
    bellegen: rd(r.bellegen),
    bellegenPlafond: r.plafond,
    droitsNets: rd(r.droits - r.bellegen),
    notaireVente: rd(r.notaireVente),
    ltv: r.ltv,
    ltvRule: r.rule,
    pretMaxCssf: rd(r.pretMaxCssf),
    pret: rd(r.pret),
    pretLimiteParCapacite: i.capaciteMontant !== null && i.capaciteMontant < r.pretMaxCssf,
    fraisPretMin: rd(r.fraisPretMin),
    fraisPretMax: rd(r.fraisPretMax),
    totalMin: rd(r.totalMin),
    totalMax: rd(r.totalMax),
    apportNecessaireMin: rd(apportNecessaireMin),
    apportNecessaireMax: rd(apportNecessaireMax),
    apport: i.apport,
    margeMin: rd(i.apport - apportNecessaireMax),
    margeMax: rd(i.apport - apportNecessaireMin),
    prixMax: prixMaximal(i, p),
  };
}
