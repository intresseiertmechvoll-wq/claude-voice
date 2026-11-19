/**
 * Mesure des annonces AVEC consentement (case facultative à l'étape 6).
 * Sans case cochée : rien ne part chez Google ou Meta, et la page n'envoie pas la valeur des identifiants de clic à notre serveur
 * (embed.js et les liens de langue la passent après « # », jamais envoyé ; seule exception : une annonce qui mène directement à l'outil).
 * Avec la case : notre serveur transmet l'identifiant du clic (et, pour Meta, l'e-mail et le téléphone hachés en SHA-256
 * plus le type de navigateur) ; aucun script de Google ou Meta n'est chargé dans la page.
 */
import type { T } from '../i18n';

/** Identifiant de clic : lettres, chiffres, « . », « _ », « - » ; 8 à 500 caractères (sinon ignoré) */
export function cleanClickId(v: unknown): string {
  return typeof v === 'string' && /^[A-Za-z0-9._-]{8,500}$/.test(v) ? v : '';
}

export interface AdClicks {
  gclid?: string;
  fbclid?: string;
  /** arrivée sur la page (ms depuis 1970) : sert à dater le clic pour Meta (paramètre fbc) */
  clickAt?: number;
}

/** Corps reçu → identifiants retenus, seulement si consent === true et au moins un identifiant valide */
export function sanitizeAds(raw: unknown, nowMs: number): AdClicks | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.consent !== true) return null;
  const out: AdClicks = {};
  const g = cleanClickId(r.gclid);
  const f = cleanClickId(r.fbclid);
  if (g) out.gclid = g;
  if (f) out.fbclid = f;
  if (!g && !f) return null;
  // Arrivée au plus 7 jours avant l'envoi, jamais dans le futur ; sinon : maintenant
  const at = typeof r.clickAt === 'number' && Number.isInteger(r.clickAt) ? r.clickAt : NaN;
  out.clickAt = at <= nowMs && at >= nowMs - 7 * 864e5 ? at : nowMs;
  return out;
}

export type Platform = 'google' | 'meta';
export function platformsOf(c: { gclid?: unknown; fbclid?: unknown }): Platform[] {
  return [...(c.gclid ? (['google'] as const) : []), ...(c.fbclid ? (['meta'] as const) : [])];
}

/** Version du texte de consentement : à changer à chaque modification du texte (preuve du consentement) */
export const CONSENT_VERSION = 'pub-v1';

/** Texte de la case et précision, dans la langue du visiteur (même fonction pour la page et pour la preuve dans l'e-mail) */
export function consentTexts(t: T, platforms: Platform[]): { label: string; details: string } {
  const key = platforms.length === 2 ? 'both' : platforms[0] ?? 'google';
  return {
    label: t('ads.label', { platforms: t(`ads.platforms.${key}`) }),
    details: t(platforms.includes('meta') ? 'ads.detailsMeta' : 'ads.detailsGoogle'),
  };
}
