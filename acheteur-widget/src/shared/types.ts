export type Lang = 'fr' | 'de' | 'en';

/* Choix proposés dans le questionnaire */
export const USAGES = ['habiter', 'investir'] as const;
export const ACHATS = ['seul', 'deux'] as const;
export const PREMIER = ['oui', 'non', 'nsp'] as const;
/** Bëllegen Akt déjà utilisé ? */
export const BELLEGEN = ['non', 'oui', 'nsp'] as const;
export const VENDRE = ['non', 'oui_lu', 'oui_etranger'] as const;
export const TYPES = ['appartement', 'maison', 'les_deux'] as const;
export const NEUF = ['ancien', 'neuf', 'peu_importe'] as const;
export const EXTERIEURS = ['balcon', 'jardin', 'peu_importe'] as const;
export const RENOVER = ['oui', 'selon_prix', 'non'] as const;
export const BANQUE = ['oui', 'pas_encore'] as const;
export const CAPACITE = ['oui', 'non'] as const;
export const REVENUS = ['moins_4000', '4000_6000', '6000_8000', '8000_10000', '10000_14000', 'plus_14000', 'nr'] as const;
export const DELAIS = ['asap', '3a6mois', '6a12mois', 'renseigne'] as const;
export const VISITES = ['0', '1_5', 'plus5'] as const;
export const MANDAT = ['oui', 'peut_etre', 'non'] as const;

export type Usage = (typeof USAGES)[number];
export type Achat = (typeof ACHATS)[number];
export type Premier = (typeof PREMIER)[number];
export type Bellegen = (typeof BELLEGEN)[number];
export type Vendre = (typeof VENDRE)[number];
export type TypeBien = (typeof TYPES)[number];
export type Neuf = (typeof NEUF)[number];
export type Exterieur = (typeof EXTERIEURS)[number];
export type Renover = (typeof RENOVER)[number];
export type Banque = (typeof BANQUE)[number];
export type Capacite = (typeof CAPACITE)[number];
export type Revenu = (typeof REVENUS)[number];
export type Delai = (typeof DELAIS)[number];
export type Visites = (typeof VISITES)[number];
export type Mandat = (typeof MANDAT)[number];

/** Données qui suffisent au calcul du budget (étapes 1 et 3, aucun prix de commune) */
export interface BudgetInput {
  usage: Usage;
  achat: Achat;
  premier: Premier;
  bellegen: Bellegen;
  neuf: Neuf;
  apport: number;
  prix: number;
  /** montant d'emprunt connu (banque, courtier), sinon null */
  capaciteMontant: number | null;
  /** bien à vendre d'abord : valeur estimée et prêt restant (null si non renseignés) */
  valeurVente: number | null;
  restePret: number | null;
}

/** Réponses validées du visiteur */
export interface Answers extends BudgetInput {
  vendre: Vendre;
  type: TypeBien;
  communes: string[];
  chambres: number;
  surface: number | null;
  exterieur: Exterieur | null;
  garage: boolean;
  renover: Renover;
  note: string;
  banque: Banque;
  capacite: Capacite;
  /** montants avant le simulateur « Et si… ? » (null si inchangés) */
  prixDepart: number | null;
  apportDepart: number | null;
  revenu: Revenu | null;
  courtier: boolean;
  delai: Delai;
  visites: Visites | null;
  mandat: Mandat | null;
}

export interface Contact {
  prenom: string;
  nom: string;
  email: string;
  /** format international, ex. +352621123456 */
  telephone: string;
  message: string;
  /** « Me prévenir si un bien correspondant entre chez ImmoBuild » */
  alerte: boolean;
}

export interface Submission {
  answers: Answers;
  contact: Contact;
  lang: Lang;
  page: string;
}

export interface CommuneData {
  commune: string;
  canton: string;
  notarie_existant_ventes: number | null;
  notarie_existant_m2: number | null;
  notarie_existant_min_m2?: number | null;
  notarie_existant_max_m2?: number | null;
  notarie_vefa_ventes: number | null;
  notarie_vefa_m2: number | null;
  annonce_appartement_offres: number | null;
  annonce_appartement_m2: number | null;
  annonce_maison_offres: number | null;
  annonce_maison_m2: number | null;
  loyer_appartement_offres: number | null;
  loyer_appartement_m2: number | null;
  periode: string;
  source: string;
}

export interface Dataset {
  genere_le: string;
  periode: string;
  periode_debut: string;
  periode_fin: string;
  sources: Record<string, { titre: string; jeu_de_donnees: string; periode: string; source: string; fichier: string; mis_a_jour: string }>;
  communes: CommuneData[];
}

/** Règle CSSF appliquée au prêt (règlement CSSF 20-08) */
export type LtvRule = 'premier' | 'residence' | 'incertain' | 'investissement';

/** Résultat du calcul du budget (affiché sans coordonnées) */
export interface Budget {
  prix: number;
  /** 7 % du prix. Pour un bien neuf (VEFA), c'est un maximum */
  droits: number;
  droitsMaximum: boolean;
  /** Bëllegen Akt déduit des droits */
  bellegen: number;
  /** plafond total du Bëllegen Akt pour le ménage (0 si non applicable) */
  bellegenPlafond: number;
  droitsNets: number;
  /** honoraires de l'acte de vente, TVA comprise */
  notaireVente: number;
  ltv: number;
  ltvRule: LtvRule;
  /** prêt maximal selon la règle CSSF */
  pretMaxCssf: number;
  /** prêt retenu : règle CSSF, ou montant connu du visiteur s'il est plus bas */
  pret: number;
  pretLimiteParCapacite: boolean;
  /** acte de prêt : droit de 0,24 % + inscription 0,05 % + honoraires du notaire (barème 5, TVA comprise) */
  fraisPret: number;
  /** copies, extraits, débours (vente et prêt) : estimation */
  fraisDiversMin: number;
  fraisDiversMax: number;
  totalMin: number;
  totalMax: number;
  /** apport nécessaire au minimum (fourchette, à cause des frais estimés) */
  apportNecessaireMin: number;
  apportNecessaireMax: number;
  apport: number;
  /** apport déclaré − apport nécessaire (négatif = il manque de l'apport) */
  margeMin: number;
  margeMax: number;
  /** vente du bien actuel : frais estimés et produit net (null si pas de vente renseignée) */
  fraisVente: number | null;
  produitVente: number | null;
  /** apport utilisé dans le calcul : épargne + produit net de la vente */
  apportTotal: number;
  /** prêt vraiment nécessaire si tout l'apport est utilisé (au plus le prêt retenu) : base de la mensualité */
  pretNecessaire: number;
  /** prix maximal avec l'apport et le montant d'emprunt connus (seulement si montant connu) */
  prixMax: number | null;
}

/** Surface accessible avec le budget dans une commune */
export interface CommuneM2 {
  commune: string;
  canton: string;
  type: 'appartement' | 'maison';
  /** notarie : ventes notariées (appartements existants) ; vefa : ventes notariées neuf ; canton : médiane du canton ; annonce : prix annoncés (maisons) */
  source: 'notarie' | 'vefa' | 'canton' | 'annonce' | 'canton_annonce' | null;
  prixM2: number | null;
  /** nombre de ventes ou d'annonces derrière ce prix */
  nombre: number | null;
  m2: number | null;
  /** neuf demandé, mais seulement des prix de l'ancien disponibles : le neuf coûte en général plus cher */
  ancienPourNeuf?: boolean;
}

export interface PublicResult {
  budget: Budget;
  /** taux du mois utilisés pour la mensualité d'exemple (null : pas de mensualité affichée) */
  taux: import('./taux').Taux | null;
  communes: CommuneM2[];
  periodeDebut: string;
  periodeFin: string;
}
