import { handleEvent, type EventEnv } from '../../src/server/event';

export const onRequestPost: PagesFunction<EventEnv> = ({ request, env }) => handleEvent(request, env);

export const onRequest: PagesFunction<EventEnv> = () =>
  new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
