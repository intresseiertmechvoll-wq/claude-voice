/**
 * Taux du mois, lus en direct à la BCE (BCL) et gardés en cache 12 heures.
 * Si la BCE ne répond pas ou si la réponse n'est pas plausible : valeur de secours de params.json,
 * et si elle a plus de 4 mois, pas de mensualité du tout.
 */
import { checkTaux, ECB_URL, parseEcbCsv, type Taux } from '../shared/taux';
import type { Deps } from './handler';

const CACHE_KEY = 'https://acheteur.cache/taux-bce';
const CACHE_S = 12 * 3600;

type CacheLike = { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> };
function cacheOf(): CacheLike | null {
  const c = (globalThis as { caches?: { default?: CacheLike } }).caches;
  return c?.default ?? null;
}

export async function getTaux(d: Pick<Deps, 'fetch' | 'now' | 'log' | 'params'>, useCache = true): Promise<Taux | null> {
  const today = d.now();
  const cache = useCache ? cacheOf() : null;
  const key = new Request(CACHE_KEY);
  if (cache) {
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) {
      const t = checkTaux((await hit.json().catch(() => null)) as Taux | null, today);
      if (t) return t;
    }
  }
  try {
    const res = await d.fetch(ECB_URL, { headers: { accept: 'text/csv' }, signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const parsed = parseEcbCsv(await res.text());
      const t = checkTaux(parsed ? { ...parsed, origine: 'bce' } : null, today);
      if (t) {
        if (cache) await cache.put(key, new Response(JSON.stringify(t), { headers: { 'cache-control': `max-age=${CACHE_S}` } })).catch(() => {});
        return t;
      }
      d.log('Taux BCE non plausibles ou trop anciens : valeur de secours', parsed);
    } else d.log('BCE : réponse', res.status);
  } catch (err) {
    d.log('BCE injoignable :', (err as Error).message);
  }
  const p = d.params.taux;
  return checkTaux({ variable: p.variable, fixe: p.fixe, mois: p.mois, origine: 'secours' }, today);
}

export async function handleTaux(d: Pick<Deps, 'fetch' | 'now' | 'log' | 'params'>): Promise<Response> {
  const t = await getTaux(d);
  return new Response(JSON.stringify({ ok: true, taux: t }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

