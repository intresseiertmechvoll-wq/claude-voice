/** Rapport Codex 2 : pas de doublon après une réponse perdue de Resend, limite qui ne bloque pas un lead si KV tombe */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleEstimate } from '../src/server/handler';
import { allowSubmission, resetMemoryLimiter } from '../src/shared/ratelimit';
import { body, DATA, PARAMS } from './helpers';

const ORIGIN = 'https://estimation.example.pages.dev';
const req = (payload: unknown, ip = '203.0.113.40') =>
  new Request(`${ORIGIN}/api/estimate`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, origin: ORIGIN }, body: JSON.stringify(payload) });
const dnsFetch = vi.fn(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.lu.' }] })));
const env = { RESEND_API_KEY: 're', LEAD_EMAIL: 'contact@immobuild.lu' };
const deps = (f: unknown) => ({ fetch: f as typeof fetch, dnsFetch: dnsFetch as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {} });
const keyOf = (call: unknown) => ((call as [string, RequestInit])[1].headers as Record<string, string>)['Idempotency-Key'];

beforeEach(() => resetMemoryLimiter());

describe('Clé d’idempotence Resend', () => {
  it('Lead et copie portent une clé dérivée de la saisie ; même saisie = même clé, autre saisie = autre clé', async () => {
    const f = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
    await handleEstimate(req(body()), env, deps(f));
    await handleEstimate(req(body()), env, deps(f));
    await handleEstimate(req(body({ contact: { numero: '691 527 038' } })), env, deps(f));
    const keys = f.mock.calls.map(keyOf);
    expect(keys[0]).toMatch(/^lead-[0-9a-f]{32}$/);
    expect(keys[1]).toBe(keys[0].replace('lead-', 'copie-'));
    expect(keys[2]).toBe(keys[0]);
    expect(keys[4]).not.toBe(keys[0]);
  });

  it('Réponse perdue puis nouvel essai : Resend répond 409 « déjà utilisée » → le visiteur a son résultat, pas de doublon', async () => {
    let n = 0;
    const f = vi.fn(async () => {
      n++;
      if (n === 1) throw new DOMException('The operation timed out.', 'TimeoutError'); // accepté par Resend, réponse perdue
      if (n === 2) return new Response('{"name":"invalid_idempotent_request","message":"This idempotency key has already been used on a request that had a different payload."}', { status: 409 });
      return new Response('{"id":"x"}', { status: 200 });
    });
    const first = await handleEstimate(req(body()), env, deps(f));
    expect(first.status).toBe(502);
    const retry = await handleEstimate(req(body()), env, deps(f));
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as any).ok).toBe(true);
    expect(keyOf(f.mock.calls[1])).toBe(keyOf(f.mock.calls[0]));
  });

  it('409 « premier essai encore en cours » : erreur (il peut encore échouer), le visiteur réessaie', async () => {
    const f = vi.fn(async () => new Response('{"name":"concurrent_idempotent_requests","message":"Same idempotency key used while original request is still in progress."}', { status: 409 }));
    expect((await handleEstimate(req(body()), env, deps(f))).status).toBe(502);
  });

  it('Demande déjà envoyée : pas recomptée dans les statistiques, copie au visiteur tentée avec sa propre clé', async () => {
    const FUNNEL = { writeDataPoint: vi.fn() };
    const f = vi.fn(async (_u: string, init: RequestInit) =>
      ((init.headers as Record<string, string>)['Idempotency-Key'] ?? '').startsWith('lead-')
        ? new Response('{"name":"invalid_idempotent_request"}', { status: 409 })
        : new Response('{"id":"x"}', { status: 200 }),
    );
    const res = await handleEstimate(req(body()), { ...env, FUNNEL }, deps(f));
    expect(res.status).toBe(200);
    expect(FUNNEL.writeDataPoint).not.toHaveBeenCalled();
    expect(keyOf(f.mock.calls[1])).toMatch(/^copie-/);
  });

  it('Un autre 409 (sans rapport avec l’idempotence) reste une erreur', async () => {
    const f = vi.fn(async () => new Response('{"name":"conflict"}', { status: 409 }));
    expect((await handleEstimate(req(body()), env, deps(f))).status).toBe(502);
  });
});

describe('Limite par IP et panne de KV', () => {
  it('KV en panne (lecture) : l’envoi est accepté, pas d’erreur 500', async () => {
    const kv = { get: vi.fn(async () => { throw new Error('KV down'); }), put: vi.fn() };
    expect(await allowSubmission('203.0.113.1', 20, kv)).toBe(true);
  });
  it('KV refuse l’écriture (plus d’une par seconde) : l’envoi est accepté', async () => {
    const kv = { get: vi.fn(async () => null), put: vi.fn(async () => { throw new Error('429 Too Many Requests'); }) };
    expect(await allowSubmission('203.0.113.1', 20, kv)).toBe(true);
  });
  it('Limite anti-rejeu (failOpen = false) : KV en panne → refus', async () => {
    const kv = { get: vi.fn(async () => { throw new Error('KV down'); }), put: vi.fn() };
    expect(await allowSubmission('ticket', 3, kv, 'summary-ticket', Date.now(), false)).toBe(false);
    const kv2 = { get: vi.fn(async () => null), put: vi.fn(async () => { throw new Error('429'); }) };
    expect(await allowSubmission('ticket', 3, kv2, 'summary-ticket', Date.now(), false)).toBe(false);
  });

  it('Par la route complète : KV en panne → résultat et lead quand même', async () => {
    const f = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
    const kv = { get: vi.fn(async () => { throw new Error('KV down'); }), put: vi.fn() };
    const res = await handleEstimate(req(body()), { ...env, RATE_LIMIT: kv }, deps(f));
    expect(res.status).toBe(200);
  });
});
