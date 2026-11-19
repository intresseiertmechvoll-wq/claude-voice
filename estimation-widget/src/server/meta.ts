/**
 * Meta Conversions API : un événement « Lead » envoyé par notre serveur, seulement si le visiteur a coché la case
 * « mesure des annonces » ET qu'il est arrivé par une annonce Meta (fbclid). Aucun script Meta dans la page.
 * Envoyé : identifiant du clic (fbc), e-mail et téléphone hachés (SHA-256), type de navigateur, page.
 * Pas envoyé : nom, adresse, IP, réponses sur le bien.
 * Format : developers.facebook.com, Conversions API (paramètres client et serveur), consulté le 19/11/2026.
 */
import type { AdClicks } from '../shared/ads';

export interface MetaEnv {
  META_PIXEL_ID?: string;
  /** jeton d'accès de l'API Conversions (secret Cloudflare) */
  META_CAPI_TOKEN?: string;
  /** facultatif : code de test du gestionnaire d'événements (les événements apparaissent dans « Tester les événements ») */
  META_TEST_EVENT_CODE?: string;
}

export const metaConfigured = (env: MetaEnv) => Boolean(env.META_PIXEL_ID && /^\d{5,20}$/.test(env.META_PIXEL_ID) && env.META_CAPI_TOKEN);

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface MetaLead {
  ads: AdClicks;
  email: string;
  /** format international : +352621483920 */
  telephone: string;
  userAgent: string;
  pageUrl: string;
  nowMs: number;
  eventId: string;
}

/** Corps de la requête (séparé pour les tests) */
export async function metaPayload(l: MetaLead, testCode?: string) {
  return {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(l.nowMs / 1000),
        event_id: l.eventId,
        action_source: 'website',
        event_source_url: l.pageUrl,
        user_data: {
          fbc: `fb.1.${l.ads.clickAt ?? l.nowMs}.${l.ads.fbclid}`,
          em: [await sha256(l.email.trim().toLowerCase())],
          ph: [await sha256(l.telephone.replace(/\D/g, ''))],
          client_user_agent: l.userAgent.slice(0, 500),
        },
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
}

/** Ne lève jamais d'erreur : un échec est seulement écrit dans le journal */
export async function sendMetaLead(env: MetaEnv, version: string, l: MetaLead, fetchFn: typeof fetch, log: (...a: unknown[]) => void): Promise<void> {
  if (!metaConfigured(env) || !l.ads.fbclid) return;
  try {
    const body = { ...(await metaPayload(l, env.META_TEST_EVENT_CODE)), access_token: env.META_CAPI_TOKEN };
    const res = await fetchFn(`https://graph.facebook.com/${encodeURIComponent(version)}/${env.META_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) log('Meta a refusé l’événement :', res.status, (await res.text().catch(() => '')).slice(0, 300));
  } catch (err) {
    log('Meta injoignable :', (err as Error).message);
  }
}
