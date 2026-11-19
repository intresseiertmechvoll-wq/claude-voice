/**
 * Calcul du budget d'achat. Le même code tourne dans le navigateur (aperçu sans
 * coordonnées) et sur le serveur (e-mail du lead). Aucune donnée de prix de
 * commune ici : seulement des règles publiques (droits, Bëllegen Akt, CSSF, barème notarial).
 */
import type { Budget, BudgetInput, LtvRule } from './types';

export type Params = typeof import('../../params.json');

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/** Honoraires du notaire par tranches (mêmes tranches pour les barèmes 7 et 5), hors TVA */
function bareme(montant: number, p: Params, taux: number[]): number {
  let total = 0;
  let bas = 0;
  p.notaire.tranches.forEach((t, i) => {
    const haut = t.jusqua ?? Infinity;
    if (montant > bas) total += (Math.min(montant, haut) - bas) * taux[i];
    bas = haut;
  });
  return Math.max(total, p.notaire.minimum);
}

/** Acte de vente : barème 7, hors TVA */
export function notaireHT(prix: number, p: Params): number {
  return bareme(prix, p, p.notaire.tranches.map((t) => t.taux));
}

/** Acte de prêt : barème 5, hors TVA */
export function notairePretHT(pret: number, p: Params): number {
  return bareme(pret, p, p.pret.bareme5);
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

/** Acte de prêt : droit 0,24 % + inscription 0,05 % + honoraires barème 5 avec TVA */
function fraisActePret(pret: number, p: Params): number {
  return pret > 0 ? pret * (p.pret.droit_acte_pret + p.pret.inscription) + notairePretHT(pret, p) * (1 + p.notaire.tva) : 0;
}

/** Calcul brut (sans arrondi) pour un prix donné */
function raw(i: BudgetInput, prix: number, p: Params) {
  const droits = prix * p.droits.taux;
  const plafond = bellegenPlafond(i, p);
  // L'AED perçoit toujours au moins 100 € : le crédit ne peut pas effacer tous les droits
  const bellegen = Math.max(0, Math.min(plafond, droits - p.bellegen.perception_minimale));
  const notaireVente = notaireHT(prix, p) * (1 + p.notaire.tva);
  const { ltv, rule } = ltvFor(i, p);
  const pretMaxCssf = prix * ltv;
  const pret = i.capaciteMontant !== null ? Math.min(pretMaxCssf, i.capaciteMontant) : pretMaxCssf;
  const fraisPret = fraisActePret(pret, p);
  const base = prix + droits - bellegen + notaireVente + fraisPret;
  return { droits, plafond, bellegen, notaireVente, ltv, rule, pretMaxCssf, pret, fraisPret, totalMin: base + p.divers.min, totalMax: base + p.divers.max };
}

/**
 * Prix maximal pour un apport et un montant d'emprunt connus.
 * Sans montant connu, il n'y en a pas : avec 100 % de prêt possible (premier achat), seul le revenu limite, et l'outil ne le calcule pas.
 */
/** Vente du bien actuel : produit net = valeur − prêt restant − frais d'agence estimés (jamais négatif) */
export function vente(i: Pick<BudgetInput, 'valeurVente' | 'restePret'>, p: Params): { frais: number; produit: number } | null {
  // Seulement avec les deux montants : un prêt restant non renseigné n'est jamais compté comme 0
  if (i.valeurVente === null || i.valeurVente <= 0 || i.restePret === null) return null;
  const frais = i.valeurVente * p.vente.frais_taux;
  // Peut être négatif : si le prêt restant dépasse la valeur nette, l'acheteur doit rembourser la différence de sa poche
  return { frais, produit: i.valeurVente - (i.restePret ?? 0) - frais };
}

/** Apport utilisé : épargne + produit net de la vente */
export function apportTotal(i: BudgetInput, p: Params): number {
  return i.apport + (vente(i, p)?.produit ?? 0);
}

export function prixMaximal(i: BudgetInput, p: Params): number | null {
  if (i.capaciteMontant === null) return null;
  const dispo = apportTotal(i, p);
  const ok = (prix: number) => {
    const r = raw(i, prix, p);
    return r.totalMax - r.pret <= dispo;
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
  const v = vente(i, p);
  const dispo = i.apport + (v?.produit ?? 0);
  // Prêt nécessaire : les frais de l'acte de prêt dépendent du prêt lui-même, on resserre en quelques tours
  const sansFraisPret = r.totalMax - r.fraisPret;
  let pretNecessaire = Math.max(0, Math.min(r.pret, r.totalMax - dispo));
  for (let k = 0; k < 5; k++) pretNecessaire = Math.max(0, Math.min(r.pret, sansFraisPret + fraisActePret(pretNecessaire, p) - dispo));
  const prixMax = prixMaximal(i, p);
  const ltv = r.ltv;
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
    fraisPret: rd(r.fraisPret),
    fraisDiversMin: p.divers.min,
    fraisDiversMax: p.divers.max,
    totalMin: rd(r.totalMin),
    totalMax: rd(r.totalMax),
    apportNecessaireMin: rd(apportNecessaireMin),
    apportNecessaireMax: rd(apportNecessaireMax),
    apport: i.apport,
    fraisVente: v ? rd(v.frais) : null,
    produitVente: v ? rd(v.produit) : null,
    apportTotal: rd(dispo),
    pretNecessaire: rd(pretNecessaire),
    // Écarts calculés sur les montants affichés (arrondis) : la soustraction à l'écran tombe juste
    margeMin: rd(dispo) - rd(apportNecessaireMax),
    margeMax: rd(dispo) - rd(apportNecessaireMin),
    prixMax,
    pretAuPrixMax: prixMax === null ? null : rd(Math.min(i.capaciteMontant ?? Infinity, prixMax * ltv)),
  };
}
