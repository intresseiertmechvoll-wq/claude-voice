/**
 * Taux du mois, lus en direct à la BCE (BCL) et gardés en cache 12 heures.
 * Si la BCE ne répond pas ou si la réponse n'est pas plausible : valeur de secours de params.json,
 * et si elle a plus de 4 mois, pas de mensualité du tout.
 */
import { checkTaux, ECB_URL, parseEcbCsv, type Taux } from '../shared/taux';
import type { Deps } from './handler';

const CACHE_KEY = 'https://acheteur.cache/taux-bce';
const CACHE_S = 12 * 3600;
/** Après un échec de la BCE, on ne la redemande pas avant 1 heure : sinon chaque envoi attendrait le délai d'attente */
const ECHEC_S = 3600;
/** Délai d'attente court : la mensualité est un plus, elle ne doit pas retarder l'envoi de la demande */
const TIMEOUT_MS = 3000;

/**
 * Mémoire du serveur, en plus du cache Cloudflare (qui peut ne rien garder, par ex. sur une adresse *.pages.dev).
 * Garde aussi la valeur de secours après un échec, pour ne pas réessayer la BCE à chaque demande.
 */
let memoire: { t: Taux | null; jusqua: number } | null = null;

/** Pour les tests */
export function resetTauxCache(): void {
  memoire = null;
}

type CacheLike = { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> };
function cacheOf(): CacheLike | null {
  const c = (globalThis as { caches?: { default?: CacheLike } }).caches;
  return c?.default ?? null;
}

export async function getTaux(d: Pick<Deps, 'fetch' | 'now' | 'log' | 'params'>, useCache = true): Promise<Taux | null> {
  const today = d.now();
  const nowMs = today.getTime();
  if (useCache && memoire && nowMs < memoire.jusqua) {
    const t = memoire.t && checkTaux(memoire.t, today);
    if (t || memoire.t === null) return t;
  }
  const cache = useCache ? cacheOf() : null;
  const key = new Request(CACHE_KEY);
  if (cache) {
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) {
      const t = checkTaux((await hit.json().catch(() => null)) as Taux | null, today);
      if (t) {
        if (useCache) memoire = { t, jusqua: nowMs + CACHE_S * 1000 };
        return t;
      }
    }
  }
  try {
    const res = await d.fetch(ECB_URL, { headers: { accept: 'text/csv' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.ok) {
      const parsed = parseEcbCsv(await res.text());
      const t = checkTaux(parsed ? { ...parsed, origine: 'bce' } : null, today);
      if (t) {
        if (useCache) memoire = { t, jusqua: nowMs + CACHE_S * 1000 };
        if (cache) await cache.put(key, new Response(JSON.stringify(t), { headers: { 'cache-control': `max-age=${CACHE_S}` } })).catch(() => {});
        return t;
      }
      d.log('Taux BCE non plausibles ou trop anciens : valeur de secours', parsed);
    } else d.log('BCE : réponse', res.status);
  } catch (err) {
    d.log('BCE injoignable :', (err as Error).message);
  }
  const p = d.params.taux;
  const secours = checkTaux({ variable: p.variable, fixe: p.fixe, mois: p.mois, origine: 'secours' }, today);
  if (useCache) memoire = { t: secours, jusqua: nowMs + ECHEC_S * 1000 };
  return secours;
}

export async function handleTaux(d: Pick<Deps, 'fetch' | 'now' | 'log' | 'params'>): Promise<Response> {
  const t = await getTaux(d);
  return new Response(JSON.stringify({ ok: true, taux: t }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

