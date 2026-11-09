import fixture from './fixtures/communes-2026T2.json';
import params from '../params.json';
import type { Answers, Dataset } from '../src/shared/types';
import type { Params } from '../src/shared/engine';

/** Données figées (période 1er juillet 2025 – 30 juin 2026) : les calculs à la main restent valables après une mise à jour trimestrielle */
export const DATA = fixture as unknown as Dataset;
export const PARAMS = params as Params;

/** Appartement « neutre » : tous les coefficients à 0 */
export function apartment(over: Partial<Answers> = {}): Answers {
  return {
    type: 'appartement',
    commune: 'Dudelange',
    rue: '',
    surface: 80,
    chambres: 2,
    sdb: 1,
    annee: 1995,
    etat: 'bon',
    energie: 'E',
    etage: 1,
    ascenseur: true,
    terrain: null,
    maisonType: null,
    postes: { chassis: 'bon', chauffage: 'bon', electricite: 'bon', cuisine: 'bon', sanitaires: 'bon' },
    garages: 0,
    parkings: 0,
    cave: false,
    terrasse: 0,
    jardin: false,
    proprietaire: true,
    objectif: 'vendre',
    delai: '3mois',
    ...over,
  };
}

export function house(over: Partial<Answers> = {}): Answers {
  return apartment({
    type: 'maison',
    surface: 150,
    etage: null,
    ascenseur: null,
    terrain: 400,
    maisonType: 'jumelee',
    postes: { chassis: 'bon', chauffage: 'bon', electricite: 'bon', cuisine: 'bon', sanitaires: 'bon', toiture: 'bon' },
    ...over,
  });
}

/** Corps de requête tel que l'envoie le formulaire */
export function body(over: { answers?: Record<string, unknown>; contact?: Record<string, unknown>; website?: string } = {}) {
  return {
    lang: 'fr',
    page: 'https://immobuild.lu/estimation/',
    website: over.website ?? '',
    answers: {
      type: 'appartement', commune: 'Dudelange', rue: 'Rue de la Libération', surface: '80', chambres: '2', sdb: '1', annee: '1995',
      etat: 'bon', energie: 'E', etage: '1', ascenseur: 'oui',
      poste_chassis: 'bon', poste_chauffage: 'bon', poste_electricite: 'bon', poste_cuisine: 'bon', poste_sanitaires: 'bon',
      garages: '1', parkings: '0', cave: true, terrasse: '8', jardin: false,
      proprietaire: 'oui', objectif: 'vendre', delai: '3mois',
      ...over.answers,
    },
    contact: {
      prenom: 'Marie', nom: 'Muller', email: 'marie.muller@example.lu', indicatif: '+352', numero: '621 123 456', message: '', rgpd: true,
      ...over.contact,
    },
  };
}
