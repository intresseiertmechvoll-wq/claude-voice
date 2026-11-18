import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleBudget } from '../src/server/handler';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { readFileSync } from 'node:fs';
import { body, DATA, PARAMS } from './helpers';

const BCE_CSV = readFileSync(new URL('./fixtures/bce-2026-09.csv', import.meta.url), 'utf8');

const URL_API = 'https://acheteur.example.pages.dev/api/budget';

function req(payload: unknown, ip = '203.0.113.7', origin: string | null = 'https://acheteur.example.pages.dev') {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cf-connecting-ip': ip };
  if (origin) headers.origin = origin;
  return new Request(URL_API, { method: 'POST', headers, body: JSON.stringify(payload) });
}

function setup(status = 200) {
  // La BCE (taux du mois) et Resend (e-mail) sont simulés
  const fetchMock = vi.fn(async (url: string) => (String(url).includes('ecb.europa.eu') ? new Response(BCE_CSV) : new Response(JSON.stringify({ id: 'test' }), { status })));
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu' };
  const deps = { fetch: fetchMock as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {}, now: () => new Date('2026-11-18T10:00:00Z') };
  return { fetchMock, env, deps };
}

beforeEach(() => resetMemoryLimiter());

describe('API /api/budget', () => {
  it('Un envoi complet renvoie le résultat et envoie l’e-mail du lead', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleBudget(req(body()), env, deps);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.result.budget.prix).toBe(600000);
    expect(json.result.communes.map((c: any) => c.commune)).toEqual(['Dudelange', 'Kayl', 'Bettembourg']);
    expect(json.result.communes[0].m2).toBe(92);
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('resend'))).toHaveLength(1);
    const sent = JSON.parse((fetchMock.mock.calls.find((c) => String(c[0]).includes('resend')) as unknown as [string, RequestInit])[1].body as string);
    expect(sent.to).toEqual(['contact@immobuild.lu']);
    expect(sent.reply_to).toBe('marie.muller@example.lu');
    expect(sent.subject).toBe('[Acheteur · CHAUD] Marie Muller – Dudelange/Kayl/Bettembourg – Appartement – 600.000 €'); // format fr-LU, comme l’outil d’estimation
    expect(sent.text).toContain('À dire au téléphone');
    expect(sent.text).toContain('Doit d’abord vendre son bien au Luxembourg');
    expect(sent.text).toContain('transmettre à atHome Finance');
    expect(sent.text).toContain('accompagnement acheteur');
    expect(sent.text).toContain('+352 621 123 456');
    expect(sent.text).toContain('Dudelange – appartement : ≈ 92 m²');
  });

  it('Le nom du courtier n’apparaît pas dans le résultat renvoyé au visiteur', async () => {
    const { env, deps } = setup();
    const res = await handleBudget(req(body()), env, deps);
    expect(await res.text()).not.toContain('atHome');
  });

  it('Jamais de résultat ni d’e-mail sans coordonnées valides', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleBudget(req(body({ contact: { email: 'pas-un-email', numero: '' } })), env, deps);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.result).toBeUndefined();
    expect(json.errors.email).toBe('email');
    expect(json.errors.numero).toBe('required');
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('resend'))).toBe(false);
  });

  it('Sans la case RGPD : refusé', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleBudget(req(body({ contact: { rgpd: false } })), env, deps);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).errors.rgpd).toBe('rgpd');
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('resend'))).toBe(false);
  });

  it('Le honeypot bloque les robots', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleBudget(req(body({ website: 'https://spam.example' })), env, deps);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'rejected' });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('resend'))).toBe(false);
  });

  it('Sans en-tête Origin, ou depuis un autre site : refusé', async () => {
    const { env, deps } = setup();
    expect((await handleBudget(req(body(), '203.0.113.7', null), env, deps)).status).toBe(403);
    expect((await handleBudget(req(body(), '203.0.113.7', 'https://autre-site.example'), env, deps)).status).toBe(403);
  });

  it('Plus de 3 communes ou commune inconnue : refusé', async () => {
    const { env, deps } = setup();
    const four = await handleBudget(req(body({ answers: { communes: ['Dudelange', 'Kayl', 'Bettembourg', 'Mersch'] } })), env, deps);
    expect(((await four.json()) as any).errors.communes).toBe('communes_max');
    const unknown = await handleBudget(req(body({ answers: { communes: ['Paris'] } })), env, deps);
    expect(((await unknown.json()) as any).errors.communes).toBe('invalid');
  });

  it('Le budget est recalculé sur le serveur (un calcul envoyé par le navigateur est ignoré)', async () => {
    const { env, deps } = setup();
    const res = await handleBudget(req(body({ answers: { budget: { apportNecessaireMin: 0 }, droits: 0 } })), env, deps);
    const json = (await res.json()) as any;
    expect(json.result.budget.droits).toBe(42000);
  });

  it('Resend en panne : message d’erreur, pas de résultat, l’essai ne compte pas', async () => {
    const { env, deps } = setup(500);
    const res = await handleBudget(req(body()), env, deps);
    expect(res.status).toBe(502);
    expect(((await res.json()) as any).result).toBeUndefined();
  });

  it('Limite : 20 envois par heure et par IP', async () => {
    const { env, deps } = setup();
    for (let i = 0; i < 20; i++) expect((await handleBudget(req(body(), '198.51.100.1'), env, deps)).status).toBe(200);
    expect((await handleBudget(req(body(), '198.51.100.1'), env, deps)).status).toBe(429);
  });
});

describe('Investissement', () => {
  it('« Premier achat » et « Bëllegen Akt » ne sont pas demandés', async () => {
    resetMemoryLimiter();
    const { env, deps, fetchMock } = setup();
    const b = body({ answers: { usage: 'investir', premier: undefined, bellegen: undefined } });
    const res = await handleBudget(req(b), env, deps);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.result.budget.ltvRule).toBe('investissement');
    expect(json.result.budget.bellegen).toBe(0);
    const sent = JSON.parse((fetchMock.mock.calls.find((c) => String(c[0]).includes('resend')) as unknown as [string, RequestInit])[1].body as string);
    expect(sent.text).not.toContain('Bëllegen Akt :');
  });
});
