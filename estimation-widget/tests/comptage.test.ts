/** Comptage anonyme du parcours : seulement des compteurs, jamais de réponses ni de coordonnées */
import { describe, expect, it, vi } from 'vitest';
import { handleEvent } from '../src/server/event';
import { handleEstimate } from '../src/server/handler';
import { channel, funnelPoint } from '../src/shared/funnel';
import { body, DATA, PARAMS } from './helpers';

const ORIGIN = 'https://estimation.example.pages.dev';
const post = (path: string, payload: unknown, headers: Record<string, string> = {}) =>
  new Request(ORIGIN + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'cf-connecting-ip': '203.0.113.9', ...headers }, body: JSON.stringify(payload) });
const dataset = () => ({ writeDataPoint: vi.fn() });

describe('Compteur /api/e', () => {
  it('Étape atteinte : un point avec événement, langue, canal, campagne, intégré ou non', async () => {
    const FUNNEL = dataset();
    const res = await handleEvent(post('/api/e', { e: 'step-3', l: 'de', s: { utm_source: 'Google', utm_campaign: 'dudelange-maisons', gclid: true }, i: true }), { FUNNEL });
    expect(res.status).toBe(204);
    expect(FUNNEL.writeDataPoint).toHaveBeenCalledWith({
      indexes: ['step-3'],
      blobs: ['step-3', 'de', 'google', 'dudelange-maisons', 'site', '', ''],
      doubles: [1],
    });
  });

  it('Rien d’autre n’est enregistré : ni IP, ni champ inconnu', async () => {
    const FUNNEL = dataset();
    await handleEvent(post('/api/e', { e: 'call', l: 'fr', email: 'x@y.lu', s: { utm_source: 'face<book>' } }), { FUNNEL });
    const p = JSON.stringify(FUNNEL.writeDataPoint.mock.calls[0]);
    expect(p).not.toContain('203.0.113.9');
    expect(p).not.toContain('x@y.lu');
    expect(p).toContain('"facebook"');
  });

  it('Événement ou langue inconnus : 400, rien d’écrit', async () => {
    const FUNNEL = dataset();
    expect((await handleEvent(post('/api/e', { e: 'hack', l: 'fr' }), { FUNNEL })).status).toBe(400);
    expect((await handleEvent(post('/api/e', { e: 'step-1', l: 'it' }), { FUNNEL })).status).toBe(400);
    expect(FUNNEL.writeDataPoint).not.toHaveBeenCalled();
  });

  it('Autre site (Origin différente) : 403', async () => {
    const FUNNEL = dataset();
    expect((await handleEvent(post('/api/e', { e: 'step-1', l: 'fr' }, { origin: 'https://evil.example' }), { FUNNEL })).status).toBe(403);
    expect(FUNNEL.writeDataPoint).not.toHaveBeenCalled();
  });

  it('Sans liaison (local, ou pas encore configurée) ou liaison en panne : 204 quand même', async () => {
    expect((await handleEvent(post('/api/e', { e: 'step-1', l: 'fr' }), {})).status).toBe(204);
    const FUNNEL = { writeDataPoint: vi.fn(() => { throw new Error('quota'); }) };
    expect((await handleEvent(post('/api/e', { e: 'step-1', l: 'fr' }), { FUNNEL }, () => {})).status).toBe(204);
  });

  it('Canal : utm_source, sinon identifiant de clic, sinon direct', () => {
    expect(channel({ utm_source: 'Newsletter' })).toBe('newsletter');
    expect(channel({ fbclid: true })).toBe('facebook');
    expect(channel({ msclkid: true })).toBe('bing');
    expect(channel(undefined)).toBe('direct');
    expect(funnelPoint('step-1', { lang: 'fr' }).blobs).toEqual(['step-1', 'fr', 'direct', '-', 'direct', '', '']);
  });
});

describe('Lead compté par le serveur', () => {
  it('Demande envoyée : « lead » avec type et commune, sans coordonnées', async () => {
    const FUNNEL = dataset();
    const resend = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
    const dnsFetch = vi.fn(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.lu.' }] })));
    const b = { ...body(), source: { utm_source: 'google', utm_campaign: 'dudelange' } };
    const res = await handleEstimate(post('/api/estimate', b, { 'cf-connecting-ip': '203.0.113.77' }), { RESEND_API_KEY: 're_test', FUNNEL }, {
      fetch: resend as unknown as typeof fetch, dnsFetch: dnsFetch as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {},
    });
    expect(res.status).toBe(200);
    expect(FUNNEL.writeDataPoint).toHaveBeenCalledTimes(1);
    const p = FUNNEL.writeDataPoint.mock.calls[0][0];
    expect(p.blobs).toEqual(['lead', 'fr', 'google', 'dudelange', 'site', 'appartement', 'Dudelange']);
    const all = JSON.stringify(p);
    for (const v of Object.values(b.contact as Record<string, unknown>)) if (typeof v === 'string' && v.length > 3) expect(all).not.toContain(v);
  });

  it('Envoi refusé par Resend : pas de lead compté', async () => {
    const FUNNEL = dataset();
    const resend = vi.fn(async () => new Response('err', { status: 500 }));
    const dnsFetch = vi.fn(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.lu.' }] })));
    await handleEstimate(post('/api/estimate', body(), { 'cf-connecting-ip': '203.0.113.78' }), { RESEND_API_KEY: 're_test', FUNNEL }, {
      fetch: resend as unknown as typeof fetch, dnsFetch: dnsFetch as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {},
    });
    expect(FUNNEL.writeDataPoint).not.toHaveBeenCalled();
  });
});
