/**
 * Lien d'arrivée (annonces) : provenance et préremplissage, lus une fois dans l'adresse de la page.
 * Gardés en mémoire seulement : aucun cookie, aucun stockage dans le navigateur.
 */
import { CLICK_IDS, sanitizeSource, SOURCE_KEYS } from '../shared/validation';
import type { Source } from '../shared/types';
import { resolveCommune } from './combobox';

export interface Landing {
  /** utm_* nettoyés ; gclid / fbclid / msclkid : présence seulement */
  source: Source;
  /** ?type=appartement|maison et ?commune=… (nom officiel ou autre nom connu) ; valeur inconnue : ignorée */
  prefill: { type?: 'appartement' | 'maison'; commune?: string };
}

export function readLanding(params: URLSearchParams, communes: string[]): Landing {
  const source = sanitizeSource({
    ...Object.fromEntries(SOURCE_KEYS.map((k) => [k, params.get(k) ?? ''])),
    ...Object.fromEntries(CLICK_IDS.map((k) => [k, params.has(k)])),
  });
  const prefill: Landing['prefill'] = {};
  const type = params.get('type');
  if (type === 'appartement' || type === 'maison') prefill.type = type;
  const commune = resolveCommune((params.get('commune') ?? '').slice(0, 80), communes);
  if (commune) prefill.commune = commune;
  return { source, prefill };
}

/** Paramètres à garder dans les liens de changement de langue */
export function landingQuery(l: Landing, query: URLSearchParams): void {
  for (const k of SOURCE_KEYS) if (l.source[k]) query.set(k, l.source[k]!);
  for (const k of CLICK_IDS) if (l.source[k]) query.set(k, '1');
  if (l.prefill.commune) query.set('commune', l.prefill.commune);
  if (l.prefill.type) query.set('type', l.prefill.type);
}
