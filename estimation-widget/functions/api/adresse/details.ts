import { handleAddressDetails } from '../../../src/server/adresse';
import type { Env } from '../../../src/server/handler';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleAddressDetails(request, env);

export const onRequest: PagesFunction<Env> = () =>
  new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
