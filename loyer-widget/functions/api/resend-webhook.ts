import type { Env } from '../../src/server/handler';
import { handleResendWebhook } from '../../src/server/webhook';

/** Avis de Resend (copie au visiteur non livrée) : voir README, « Adresse e-mail fausse » */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleResendWebhook(request, env);

export const onRequest: PagesFunction<Env> = () =>
  new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
