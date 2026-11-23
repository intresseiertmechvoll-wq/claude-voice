import type { Env } from '../../src/server/handler';
import { handleEtape } from '../../src/server/etapes';

/** Comptage anonyme des étapes du parcours (voir src/server/etapes.ts) */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleEtape(request, env);

export const onRequest: PagesFunction<Env> = () =>
  new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
