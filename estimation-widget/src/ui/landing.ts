/**
 * Lien d'arrivée (annonces) : provenance et préremplissage, lus une fois dans l'adresse de la page.
 * Gardés en mémoire seulement : aucun cookie, aucun stockage dans le navigateur.
 */
import { cleanClickId } from '../shared/ads';
import { CLICK_IDS, sanitizeSource, SOURCE_KEYS } from '../shared/validation';
import type { T } from '../i18n';
import type { Source } from '../shared/types';
import { resolveCommune } from './combobox';

export interface Landing {
  /** utm_* nettoyés ; gclid / fbclid / msclkid : présence seulement */
  source: Source;
  /** ?type=appartement|maison et ?commune=… (nom officiel ou autre nom connu) ; valeur inconnue : ignorée */
  prefill: { type?: 'appartement' | 'maison'; commune?: string };
  /**
   * Valeurs des identifiants de clic Google / Meta, gardées en mémoire dans la page.
   * Envoyées à notre serveur SEULEMENT si le visiteur coche la case « mesure des annonces » (src/shared/ads.ts).
   */
  clicks: { gclid?: string; fbclid?: string };
}

/**
 * params : l'adresse de la page (?…) ; hash : la partie après « # ».
 * La valeur de gclid / fbclid arrive dans l'adresse quand l'annonce mène directement à l'outil, ou dans « # »
 * quand embed.js la transmet depuis le site (la partie « # » n'est jamais envoyée au serveur).
 */
export function readLanding(params: URLSearchParams, communes: string[], hash: URLSearchParams = new URLSearchParams()): Landing {
  const source = sanitizeSource({
    ...Object.fromEntries(SOURCE_KEYS.map((k) => [k, params.get(k) ?? ''])),
    ...Object.fromEntries(CLICK_IDS.map((k) => [k, params.has(k)])),
  });
  const prefill: Landing['prefill'] = {};
  const type = params.get('type');
  if (type === 'appartement' || type === 'maison') prefill.type = type;
  const commune = resolveCommune((params.get('commune') ?? '').slice(0, 80), communes);
  if (commune) prefill.commune = commune;
  const clicks: Landing['clicks'] = {};
  const g = cleanClickId(hash.get('gclid')) || cleanClickId(params.get('gclid'));
  const f = cleanClickId(hash.get('fbclid')) || cleanClickId(params.get('fbclid'));
  if (g) clicks.gclid = g;
  if (f) clicks.fbclid = f;
  return { source, prefill, clicks };
}

/** Paramètres à garder dans les liens de changement de langue */
export function landingQuery(l: Landing, query: URLSearchParams): void {
  for (const k of SOURCE_KEYS) if (l.source[k]) query.set(k, l.source[k]!);
  // Seulement la présence dans l'adresse ; la valeur passe par « # » (landingHash), jamais envoyée au serveur
  for (const k of CLICK_IDS) if (l.source[k]) query.set(k, '1');
  if (l.prefill.commune) query.set('commune', l.prefill.commune);
  if (l.prefill.type) query.set('type', l.prefill.type);
}

/** Arrivée par une annonce (« ?type=maison&commune=Dudelange ») : le titre reprend le message de l'annonce */
export function landingTitle(prefill: Landing['prefill'], t: T): string {
  const { type, commune } = prefill;
  if (!type && !commune) return t('intro.title');
  const key = commune ? (type ? `${type}_commune` : 'commune') : type!;
  return t(`intro.titleAd.${key}`, { commune: commune ?? '' });
}

/** « gclid=…&fbclid=… » à mettre après « # » (vide sans identifiant) : le navigateur ne l'envoie à aucun serveur */
export function landingHash(l: Landing): string {
  const h = new URLSearchParams();
  if (l.clicks.gclid) h.set('gclid', l.clicks.gclid);
  if (l.clicks.fbclid) h.set('fbclid', l.clicks.fbclid);
  return h.toString();
}
