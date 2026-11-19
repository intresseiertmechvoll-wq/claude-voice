export type Lang = 'fr' | 'de' | 'en';
export type PropertyType = 'appartement' | 'maison';
export type Etat = 'neuf' | 'renove' | 'bon' | 'rafraichir' | 'renover';
export type Energie = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'inconnu';
export type Exterieur = 'aucun' | 'balcon' | 'terrasse' | 'jardin';
export type Gestion = 'oui' | 'peut_etre' | 'non';
export type Disponibilite = 'libre' | '3mois' | '3a6mois' | 'plus_tard';
export type Zone = 'LV' | 'LC' | 'Peri' | 'Sud' | 'Est' | 'Nord';

export const ETATS: Etat[] = ['neuf', 'renove', 'bon', 'rafraichir', 'renover'];
export const ENERGIES: Energie[] = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'inconnu'];
export const EXTERIEURS: Exterieur[] = ['aucun', 'balcon', 'terrasse', 'jardin'];
export const GESTIONS: Gestion[] = ['oui', 'peut_etre', 'non'];
export const DISPONIBILITES: Disponibilite[] = ['libre', '3mois', '3a6mois', 'plus_tard'];
export const ZONES: Zone[] = ['LV', 'LC', 'Peri', 'Sud', 'Est', 'Nord'];

/** Réponses validées du visiteur */
export interface Answers {
  type: PropertyType;
  commune: string;
  surface: number;
  chambres: number;
  etat: Etat;
  energie: Energie;
  meuble: boolean;
  exterieur: Exterieur;
  garages: number;
  parkings: number;
  /** appartement : 0 = rez-de-chaussée, 5 = 5e et plus ; null pour une maison */
  etage: number | null;
  ascenseur: boolean | null;
  proprietaire: boolean;
  dejaLoue: boolean;
  gestion: Gestion;
  disponibilite: Disponibilite;
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
  /** 1 = première estimation de ce visiteur sur la page ; 2, 3… = nouvel envoi (variante, retour) */
  essai: number;
}

export interface CommuneData {
  commune: string;
  canton: string;
  zone: Zone;
  offres_appartement: number;
  offres_maison: number | null;
}

/** data/loyers.json (généré par scripts/update-data.ts) */
export interface Dataset {
  genere_le: string;
  annonces: {
    periode: string;
    periode_debut: string;
    periode_fin: string;
    total_appartements: number | null;
    total_maisons: number | null;
    maison_loyer_moyen_national: number | null;
    maison_loyer_m2_national: number | null;
  };
  indice: {
    serie: string;
    base_trimestres: string[];
    base_valeur: number;
    dernier_trimestre: string;
    dernier_valeur: number;
    releve_maisons_trimestre: string;
    releve_maisons_valeur: number;
  };
  sources: Record<string, { titre: string; jeu_de_donnees: string; fichier: string; mis_a_jour: string }>;
  communes: CommuneData[];
}

/** data/references.json (saisi à la main, sources dans le fichier) */
export type References = typeof import('../../data/references.json');

/** Un élément qui fait monter ou baisser le loyer, montré au visiteur */
export interface PublicFactor {
  key: string;
  /** pct : coefficient (0.02 = +2 %) ; eur : montant mensuel (stationnement) */
  kind: 'pct' | 'eur';
  value: number;
  qty?: number;
}

export type Reliability = 'high' | 'medium' | 'low';

/** Résultat envoyé au navigateur, seulement après des coordonnées valides et l'e-mail parti */
export interface PublicResult {
  type: PropertyType;
  commune: string;
  canton: string;
  zone: Zone;
  surface: number;
  /** loyers mensuels hors charges, arrondis à 50 € */
  low: number;
  mid: number;
  high: number;
  /** milieu ÷ surface, arrondi au dixième */
  perM2: number;
  meuble: boolean;
  factors: PublicFactor[];
  factorsCapped: boolean;
  reliability: Reliability;
  /** chiffres de comparaison montrés au visiteur */
  compare: {
    /** annonces de location d'appartements (ou de maisons) dans la commune, 12 derniers mois (Observatoire) */
    offresCommune: number | null;
    offresType: PropertyType;
    /** loyer au m² des baux signés en 2024-2025 dans la zone (rapport n°24, appartements) */
    bauxRecentsZoneM2: number;
    /** maisons : nombre d'annonces de la zone dans le relevé */
    maisonsReleve: number | null;
  };
  annoncesPeriode: { debut: string; fin: string };
  indiceTrimestre: string;
  releveDate: string;
}
