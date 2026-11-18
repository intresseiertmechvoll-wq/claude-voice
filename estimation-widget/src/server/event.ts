/** /api/e : un compteur anonyme du parcours (voir src/shared/funnel.ts). Répond toujours 204 si la demande est valide. */
import { CLIENT_EVENTS, writeFunnel, type ClientEvent, type FunnelDataset } from '../shared/funnel';
import { sanitizeSource } from '../shared/validation';
import { json, readJson } from './handler';

export interface EventEnv {
  FUNNEL?: FunnelDataset;
}

const EVENTS = new Set<string>(CLIENT_EVENTS);
const LANGS = new Set(['fr', 'de', 'en']);

export async function handleEvent(request: Request, env: EventEnv, log: (...a: unknown[]) => void = console.log): Promise<Response> {
  const r = await readJson(request, 1_000);
  if ('error' in r) return r.error;
  const b = r.body as Record<string, unknown> | null;
  if (!b || typeof b !== 'object' || !EVENTS.has(b.e as string) || !LANGS.has(b.l as string)) return json({ ok: false, error: 'invalid' }, 400);
  writeFunnel(env.FUNNEL, b.e as ClientEvent, { lang: b.l as 'fr' | 'de' | 'en', source: sanitizeSource(b.s), embedded: b.i === true }, log);
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
