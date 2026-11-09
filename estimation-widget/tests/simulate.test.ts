import { beforeEach, describe, expect, it, vi } from 'vitest';
import { estimate } from '../src/shared/engine';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { handleEstimate } from '../src/server/handler';
import { applyChanges, describeChanges, handleSimulate, handleSimulationSummary, parseChanges } from '../src/server/simulate';
import { signTicket, verifyTicket } from '../src/server/token';
import { apartment, body, DATA, PARAMS } from './helpers';

const BASE = 'https://estimation.example.pages.dev';
const post = (path: string, payload: unknown) =>
  new Request(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.50', origin: BASE }, body: JSON.stringify(payload) });

function setup() {
  const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu' };
  const deps = { fetch: fetchMock as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {}, now: () => new Date() };
  return { fetchMock, env, deps };
}

async function ticket() {
  const { env, deps } = setup();
  const res = await handleEstimate(post('/api/estimate', body({ answers: { energie: 'D' } })), env, deps);
  return ((await res.json()) as any).result as { simToken: string; market: number };
}

beforeEach(() => resetMemoryLimiter());

describe('Ticket signé', () => {
  it('est remis avec un résultat, et refusé s’il est modifié ou expiré', async () => {
    const r = await ticket();
    expect(r.simToken).toMatch(/^[\w-]+\.[\w-]+$/);
    expect(await verifyTicket(r.simToken, 're_test')).not.toBeNull();
    expect(await verifyTicket(r.simToken, 'autre-secret')).toBeNull();
    const [b, s] = r.simToken.split('.');
    expect(await verifyTicket(`${b}x.${s}`, 're_test')).toBeNull();
    const old = await signTicket({ v: 1, exp: 1000, lang: 'fr', a: apartment(), c: { prenom: 'A', nom: 'B', email: 'a@b.lu', telephone: '+352621123456' } }, 're_test');
    expect(await verifyTicket(old, 're_test')).toBeNull();
  });

  it('ne contient pas de prix et pas de ticket si la commune n’a pas assez de données', async () => {
    const { env, deps } = setup();
    const res = await handleEstimate(post('/api/estimate', body({ answers: { commune: 'Tandel' } })), env, deps);
    expect(((await res.json()) as any).result.simToken).toBeUndefined();
  });
});

describe('Simulateur « Et si… ? »', () => {
  it('Sans ticket valide : refusé (pas de prix sans coordonnées)', async () => {
    const { env, deps } = setup();
    expect((await handleSimulate(post('/api/simulate', { changes: { energie: 'B' } }), env, deps)).status).toBe(401);
    expect((await handleSimulate(post('/api/simulate', { token: 'faux.ticket', changes: { energie: 'B' } }), env, deps)).status).toBe(401);
  });

  it('Rénovation énergétique D → B : prix recalculé, aucun e-mail envoyé', async () => {
    const r = await ticket();
    const { env, deps, fetchMock } = setup();
    const res = await handleSimulate(post('/api/simulate', { token: r.simToken, changes: { energie: 'B', postes: { cuisine: 'neuf' } } }), env, deps);
    const j = (await res.json()) as any;
    expect(res.status).toBe(200);
    const expected = estimate(applyChanges(apartment({ energie: 'D', garages: 1, cave: true, terrasse: 8, etage: 1 }), { energie: 'B', postes: { cuisine: 'neuf' } }), DATA, PARAMS).result.market;
    expect(j.market).toBe(expected);
    expect(j.delta).toBe(j.market - r.market);
    expect(j.delta).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Valeurs interdites refusées', () => {
    expect(parseChanges({ surface: 200 }, 'appartement')).toBeNull();
    expect(parseChanges({ energie: 'Z' }, 'appartement')).toBeNull();
    expect(parseChanges({ postes: { toiture: 'neuf' } }, 'appartement')).toBeNull();
    expect(parseChanges({ postes: { toiture: 'neuf' } }, 'maison')).toEqual({ postes: { toiture: 'neuf' } });
  });

  it('E-mail de complément : un seul, valeurs recalculées par le serveur', async () => {
    const r = await ticket();
    const { env, deps, fetchMock } = setup();
    const res = await handleSimulationSummary(post('/api/simulation-summary', { token: r.simToken, scenarios: [{ energie: 'B' }, { etat: 'renove', postes: { sanitaires: 'neuf' } }] }), env, deps);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.subject).toBe('Complément lead estimation – Dudelange – Marie Muller a testé des travaux');
    expect(sent.reply_to).toBe('marie.muller@example.lu');
    expect(sent.text).toContain('Classe énergétique D → B');
    expect(sent.text).toContain('État général : bon état → rénové récemment ; Sanitaires : bon → neuf');
    expect(sent.text).toContain('ne tiennent pas compte du coût des travaux');
  });

  it('Description lisible des changements', () => {
    expect(describeChanges(apartment({ energie: 'F' }), { energie: 'C', postes: { chassis: 'neuf' } })).toBe('Classe énergétique F → C ; Châssis : bon → neuf');
  });
});
