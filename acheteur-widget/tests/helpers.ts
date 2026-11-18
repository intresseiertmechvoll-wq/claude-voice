import fixture from './fixtures/communes-2026T2.json';
import params from '../params.json';
import type { Params } from '../src/shared/budget';
import type { BudgetInput, Dataset } from '../src/shared/types';

/** Données figées (période 1er juillet 2025 – 30 juin 2026) : les calculs à la main restent valables après une mise à jour */
export const DATA = fixture as unknown as Dataset;
export const PARAMS = params as Params;

/** Couple, premier achat pour y habiter, Bëllegen Akt pas encore utilisé, ancien, 600 000 €, apport 60 000 € */
export function couple(over: Partial<BudgetInput> = {}): BudgetInput {
  return { usage: 'habiter', achat: 'deux', premier: 'oui', bellegen: 'non', neuf: 'ancien', apport: 60000, prix: 600000, capaciteMontant: null, ...over };
}

/** Corps de requête tel que l'envoie le formulaire */
export function body(over: { answers?: Record<string, unknown>; contact?: Record<string, unknown>; website?: string } = {}) {
  return {
    lang: 'fr',
    page: 'https://immobuild.lu/acheter/',
    website: over.website ?? '',
    answers: {
      usage: 'habiter', achat: 'deux', premier: 'oui', bellegen: 'non', vendre: 'oui_lu',
      type: 'appartement', neuf: 'ancien', communes: ['Dudelange', 'Kayl', 'Bettembourg'], chambres: '3', surface: '', exterieur: 'balcon', garage: true, renover: 'selon_prix', note: 'École à pied',
      apport: '60 000', prix: '600.000 €', banque: 'pas_encore', capacite: 'non', capaciteMontant: '', revenu: '6000_8000', courtier: true,
      delai: 'asap', visites: '1_5', mandat: 'oui',
      ...over.answers,
    },
    contact: {
      prenom: 'Marie', nom: 'Muller', email: 'marie.muller@example.lu', indicatif: '+352', numero: '621 123 456', message: '', alerte: true, rgpd: true,
      ...over.contact,
    },
  };
}
