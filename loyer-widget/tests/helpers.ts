import fixture from './fixtures/loyers-2026T2.json';
import references from '../data/references.json';
import params from '../params.json';
import type { Answers, Dataset, References } from '../src/shared/types';
import type { Params } from '../src/shared/engine';

/**
 * Données figées (annonces 1er juillet 2025 – 30 juin 2026, indice T2 2026 = 206,49) :
 * les calculs à la main des tests restent valables après une mise à jour trimestrielle.
 */
export const DATA = fixture as unknown as Dataset;
export const REFS = references as References;
export const PARAMS = params as Params;

/** Appartement « neutre » : aucun coefficient (bon état, classe D, sans extérieur ni stationnement, 1er étage avec ascenseur) */
export function apartment(over: Partial<Answers> = {}): Answers {
  return {
    type: 'appartement',
    commune: 'Dudelange',
    surface: 80,
    chambres: 2,
    etat: 'bon',
    energie: 'D',
    meuble: false,
    exterieur: 'aucun',
    garages: 0,
    parkings: 0,
    etage: 1,
    ascenseur: true,
    proprietaire: true,
    dejaLoue: false,
    gestion: 'oui',
    disponibilite: '3mois',
    ...over,
  };
}

export function house(over: Partial<Answers> = {}): Answers {
  return apartment({ type: 'maison', surface: 150, etage: null, ascenseur: null, ...over });
}

/** Corps de requête tel que l'envoie le formulaire */
export function body(over: { answers?: Record<string, unknown>; contact?: Record<string, unknown>; website?: string } = {}) {
  return {
    lang: 'fr',
    page: 'https://immobuild.lu/gestion-locative/',
    website: over.website ?? '',
    answers: {
      type: 'appartement', commune: 'Dudelange', surface: '80', chambres: '2',
      etat: 'bon', energie: 'D', meuble: 'non', exterieur: 'balcon', garages: '1', parkings: '0', etage: '1', ascenseur: 'oui',
      proprietaire: 'oui', dejaLoue: 'non', gestion: 'oui', disponibilite: '3mois',
      ...over.answers,
    },
    contact: {
      prenom: 'Marie', nom: 'Muller', email: 'marie.muller@example.lu', indicatif: '+352', numero: '621 123 456', message: '', rgpd: true,
      ...over.contact,
    },
  };
}
