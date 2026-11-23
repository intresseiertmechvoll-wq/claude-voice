/**
 * Comptage anonyme du parcours (combien de visiteurs arrivent à chaque étape), pour savoir où ils
 * abandonnent. Aucun cookie, aucun identifiant, aucune adresse IP enregistrée : seulement l'étape,
 * le type de bien, la langue et « intégré dans un site ou non ».
 *
 * Stockage : Cloudflare Workers Analytics Engine (binding `ETAPES`, jeu de données `loyer_etapes`).
 * Sans binding, la requête est acceptée et rien n'est compté. Lecture : `npm run stats`.
 */
import { json, readJson, type Env } from './handler';

export interface AnalyticsEngine {
  writeDataPoint(p: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}

export const ETAPES = ['ouvert', 'e2', 'e3', 'e4', 'resultat'] as const;

export async function handleEtape(request: Request, env: Env): Promise<Response> {
  const r = await readJson(request, 500);
  if ('error' in r) return r.error;
  const b = (r.body ?? {}) as Record<string, unknown>;
  const etape = String(b.etape ?? '');
  if (!(ETAPES as readonly string[]).includes(etape)) return json({ ok: false, error: 'invalid' }, 400);
  const type = b.type === 'appartement' || b.type === 'maison' ? b.type : '';
  const lang = b.lang === 'de' || b.lang === 'en' ? b.lang : 'fr';
  const ou = b.integre === true ? 'site' : 'direct';
  try {
    env.ETAPES?.writeDataPoint({ blobs: [etape, type, lang, ou], indexes: ['loyer'] });
  } catch {
    /* comptage perdu : sans importance */
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
