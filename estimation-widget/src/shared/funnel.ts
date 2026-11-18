/**
 * Comptage anonyme du parcours (combien de visiteurs atteignent chaque étape).
 * Seulement des compteurs : pas d'adresse IP, pas de cookie, pas d'identifiant de visiteur ou de session,
 * aucune réponse ni coordonnée. Stockés dans Cloudflare Workers Analytics Engine (jeu « estimation_funnel »).
 */
import type { Lang, Source } from './types';
import { cleanSourceValue } from './validation';

/** Événements envoyés par la page (une fois par chargement de page et par événement) */
export const CLIENT_EVENTS = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'step-6', 'call', 'rdv', 'print', 'whatif'] as const;
export type ClientEvent = (typeof CLIENT_EVENTS)[number];
/** Événements comptés par le serveur : demande envoyée avec un prix (« lead ») ou sans prix (« lead-nodata ») */
export type ServerEvent = 'lead' | 'lead-nodata';

/** Liaison Analytics Engine (seule la méthode utilisée) */
export interface FunnelDataset {
  writeDataPoint(p: { indexes?: string[]; blobs?: string[]; doubles?: number[] }): void;
}

/** « google », « facebook »… : utm_source, sinon la plateforme d'un identifiant de clic, sinon « direct » */
export function channel(s: Source | undefined): string {
  if (s?.utm_source) return s.utm_source.toLowerCase();
  if (s?.gclid) return 'google';
  if (s?.fbclid) return 'facebook';
  if (s?.msclkid) return 'bing';
  return 'direct';
}

export interface FunnelContext {
  lang: Lang;
  source?: Source;
  embedded?: boolean;
  /** seulement pour les leads : type de bien et commune (pas d'adresse) */
  type?: string;
  commune?: string;
}

/**
 * Colonnes : blob1 événement, blob2 langue, blob3 canal, blob4 campagne, blob5 intégré au site ou direct,
 * blob6 type de bien, blob7 commune (leads seulement). index1 = événement.
 */
export function funnelPoint(event: ClientEvent | ServerEvent, c: FunnelContext) {
  return {
    indexes: [event],
    blobs: [event, c.lang, channel(c.source), cleanSourceValue(c.source?.utm_campaign) || '-', c.embedded ? 'site' : 'direct', c.type ?? '', c.commune ?? ''],
    doubles: [1],
  };
}

/** Ne fait jamais échouer la demande : un compteur perdu vaut mieux qu'un lead perdu */
export function writeFunnel(ds: FunnelDataset | undefined, event: ClientEvent | ServerEvent, c: FunnelContext, log?: (...a: unknown[]) => void): void {
  if (!ds) return;
  try {
    ds.writeDataPoint(funnelPoint(event, c));
  } catch (err) {
    log?.('Comptage impossible :', (err as Error).message);
  }
}
