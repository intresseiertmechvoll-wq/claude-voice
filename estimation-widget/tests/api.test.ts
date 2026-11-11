import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleEstimate } from '../src/server/handler';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { body, DATA, PARAMS } from './helpers';

const URL_API = 'https://estimation.example.pages.dev/api/estimate';

function req(payload: unknown, ip = '203.0.113.7', origin = 'https://estimation.example.pages.dev') {
  return new Request(URL_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, origin },
    body: JSON.stringify(payload),
  });
}

function setup() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'test' }), { status: 200 }));
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu' };
  const deps = { fetch: fetchMock as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {}, now: () => new Date('2026-11-09T10:00:00Z') };
  return { fetchMock, env, deps };
}

beforeEach(() => resetMemoryLimiter());

describe('API /api/estimate', () => {
  it('Un envoi complet renvoie le résultat et envoie l’e-mail du lead', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body()), env, deps);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.result.market).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const sent = JSON.parse(init.body as string);
    expect(sent.to).toEqual(['contact@immobuild.lu']);
    expect(sent.reply_to).toBe('marie.muller@example.lu');
    expect(sent.subject).toBe('Nouveau lead estimation – Dudelange – Appartement – Dans les 3 mois');
    expect(sent.text).toContain('+352 621 123 456');
    expect(sent.text).toContain('Détail du calcul');
  });

  it('Un envoi sans la case RGPD est refusé', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body({ contact: { rgpd: false } })), env, deps);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.errors.rgpd).toBe('rgpd');
    expect(json.result).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Le honeypot bloque les robots (pas de résultat, pas d’e-mail)', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body({ website: 'https://spam.example' })), env, deps);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json).toEqual({ ok: false, error: 'rejected' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['e-mail invalide', { email: 'marie@' }],
    ['e-mail vide', { email: '' }],
    ['téléphone trop court', { numero: '123' }],
    ['téléphone avec lettres', { numero: '621 ABC 456' }],
    ['prénom vide', { prenom: '' }],
    ['nom vide', { nom: '   ' }],
  ])('Le résultat n’est jamais renvoyé sans coordonnées valides : %s', async (_label, contact) => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body({ contact })), env, deps);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).not.toMatch(/market|low|high|€/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Le résultat n’est jamais renvoyé sans coordonnées : bloc contact absent', async () => {
    const { env, deps } = setup();
    const b = body() as any;
    delete b.contact;
    const res = await handleEstimate(req(b), env, deps);
    expect(res.status).toBe(400);
    expect(await res.text()).not.toMatch(/market/);
  });

  it('Les réponses sont vérifiées aussi côté serveur', async () => {
    const { env, deps } = setup();
    const res = await handleEstimate(req(body({ answers: { surface: '-5', commune: 'Paris', energie: 'Z' } })), env, deps);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(Object.keys(json.errors).sort()).toEqual(['commune', 'energie', 'surface']);
  });

  it('Au plus 5 envois par heure pour une même IP', async () => {
    const { fetchMock, env, deps } = setup();
    for (let i = 0; i < 5; i++) expect((await handleEstimate(req(body()), env, deps)).status).toBe(200);
    expect((await handleEstimate(req(body()), env, deps)).status).toBe(429);
    expect((await handleEstimate(req(body(), '198.51.100.1'), env, deps)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('Commune sans assez de données : pas de prix, mais le lead part quand même', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body({ answers: { commune: 'Tandel' } })), env, deps);
    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.result.status).toBe('insufficient_data');
    expect(json.result.market).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Un envoi depuis un autre site est refusé', async () => {
    const { env, deps } = setup();
    const res = await handleEstimate(req(body(), '203.0.113.9', 'https://evil.example'), env, deps);
    expect(res.status).toBe(403);
  });

  it('Si Resend échoue, pas de résultat (le lead serait perdu)', async () => {
    const { env, deps } = setup();
    const res = await handleEstimate(req(body()), env, { ...deps, fetch: (async () => new Response('err', { status: 500 })) as unknown as typeof fetch });
    expect(res.status).toBe(502);
  });
});

describe('Vérification des réponses', () => {
  it('Année de construction : acceptée jusqu’à l’année en cours + 5, refusée au-delà', async () => {
    const { checkFields, maxYear } = await import('../src/shared/validation');
    expect(maxYear()).toBeGreaterThanOrEqual(2031);
    expect(checkFields({ annee: '1995' }, ['annee']).errors).toEqual({});
    expect(checkFields({ annee: String(maxYear()) }, ['annee']).errors).toEqual({});
    expect(checkFields({ annee: String(maxYear() + 1) }, ['annee']).errors).toEqual({ annee: 'range' });
  });

  it('Téléphone : +352 par défaut, mobile et fixe luxembourgeois, et numéros étrangers', async () => {
    const { normalizePhone } = await import('../src/shared/validation');
    expect(normalizePhone('+352', '621 123 456')).toBe('+352621123456');
    expect(normalizePhone('+352', '52 12 34')).toBe('+352521234');
    expect(normalizePhone('+352', '721 123 456')).toBe('phone');
    expect(normalizePhone('+33', '06 12 34 56 78')).toBe('+33612345678');
    expect(normalizePhone('+352', '12')).toBe('phone');
  });
});
