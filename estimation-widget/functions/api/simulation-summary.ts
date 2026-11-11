import type { Env } from '../../src/server/handler';
import { handleSimulationSummary } from '../../src/server/simulate';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleSimulationSummary(request, env);

export const onRequest: PagesFunction<Env> = () =>
  new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
