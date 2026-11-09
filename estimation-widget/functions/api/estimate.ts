import { handleEstimate, type Env } from '../../src/server/handler';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleEstimate(request, env);

export const onRequest: PagesFunction<Env> = () =>
  new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
