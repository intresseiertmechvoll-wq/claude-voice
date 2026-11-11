export type Lang = 'fr' | 'de' | 'en';
export type PropertyType = 'appartement' | 'maison';
export type Etat = 'neuf' | 'renove' | 'bon' | 'rafraichir' | 'renover';
export type Energie = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'inconnu';
export type Poste = 'mauvais' | 'moyen' | 'bon' | 'neuf' | 'inconnu';
export type MaisonType = 'mitoyenne' | 'jumelee' | 'isolee';
export type Objectif = 'vendre' | 'louer' | 'renseigne';
export type Delai = 'asap' | '3mois' | '3a6mois' | 'plus_tard';

export const ETATS: Etat[] = ['neuf', 'renove', 'bon', 'rafraichir', 'renover'];
export const ENERGIES: Energie[] = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'inconnu'];
export const POSTE_NOTES: Poste[] = ['mauvais', 'moyen', 'bon', 'neuf', 'inconnu'];
export const MAISON_TYPES: MaisonType[] = ['mitoyenne', 'jumelee', 'isolee'];
export const OBJECTIFS: Objectif[] = ['vendre', 'louer', 'renseigne'];
export const DELAIS: Delai[] = ['asap', '3mois', '3a6mois', 'plus_tard'];
export const POSTES_APPARTEMENT = ['chassis', 'chauffage', 'electricite', 'cuisine', 'sanitaires'] as const;
export const POSTES_MAISON = [...POSTES_APPARTEMENT, 'toiture'] as const;
export type PosteKey = (typeof POSTES_MAISON)[number];

/** Réponses validées du visiteur */
export interface Answers {
  type: PropertyType;
  commune: string;
  rue: string;
  surface: number;
  chambres: number;
  sdb: number;
  annee: number;
  etat: Etat;
  energie: Energie;
  /** appartement : 0 = rez-de-chaussée, 5 = 5e et plus */
  etage: number | null;
  ascenseur: boolean | null;
  /** maison */
  terrain: number | null;
  maisonType: MaisonType | null;
  postes: Partial<Record<PosteKey, Poste>>;
  garages: number;
  parkings: number;
  cave: boolean;
  terrasse: number;
  jardin: boolean;
  proprietaire: boolean;
  objectif: Objectif;
  delai: Delai;
}

export interface Contact {
  prenom: string;
  nom: string;
  email: string;
  /** format international, ex. +352621123456 */
  telephone: string;
  message: string;
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
  /** fourchette publiée : 5 % des ventes les moins chères et 5 % les plus chères exclues */
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

export type FactorKey = string;

/** Un élément qui fait monter ou baisser l'estimation, montré au visiteur */
export interface PublicFactor {
  key: FactorKey;
  /** pct : coefficient (0.02 = +2 %) ; eur : montant d'une annexe */
  kind: 'pct' | 'eur';
  value: number;
  qty?: number;
}

export type Reliability = 'high' | 'medium' | 'low';

/** Résultat envoyé au navigateur, seulement après des coordonnées valides */
export interface PublicResult {
  status: 'ok' | 'insufficient_data';
  type: PropertyType;
  commune: string;
  low: number | null;
  market: number | null;
  high: number | null;
  spread: number | null;
  indicative: boolean;
  periode: string;
  /** dates ISO, pour afficher la période dans la langue du visiteur */
  periodeDebut: string;
  periodeFin: string;
  source: string;
  sourceUrl: string;
  surface?: number;
  /** valeur de marché ÷ surface */
  pricePerM2?: number | null;
  /** logement seul (sans annexes), pour comparer aux prix de la commune */
  buildingPerM2?: number | null;
  factors?: PublicFactor[];
  /** vrai si la somme des coefficients a été plafonnée */
  factorsCapped?: boolean;
  methods?: { key: 'notarie' | 'annonces' | 'capitalisation' | 'annonces_maison'; m2: number; weight: number }[];
  reliability?: Reliability | null;
  /** ticket signé pour le simulateur « Et si… ? » */
  simToken?: string;
  communeStats?: {
    canton: string;
    notarieM2: number | null;
    notarieMinM2: number | null;
    notarieMaxM2: number | null;
    ventes: number | null;
    notarieFromCanton: boolean;
    annonceM2: number | null;
    offres: number | null;
    /** écart habituel annonce → vente appliqué (0,041 = 4,1 %) */
    decote: number;
  };
}
