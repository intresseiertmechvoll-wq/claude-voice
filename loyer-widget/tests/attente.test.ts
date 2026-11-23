import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chiffrer, dechiffrer, type KVAttente } from '../src/server/attente';
import { handleEstimate } from '../src/server/handler';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { body, DATA, PARAMS, REFS } from './helpers';

/** Faux Cloudflare KV en mémoire */
function kv(echoue = false): KVAttente & { data: Map<string, string>; ttl: Map<string, number | undefined> } {
  const data = new Map<string, string>();
  const ttl = new Map<string, number | undefined>();
  return {
    data,
    ttl,
    async get(k) {
      return data.get(k) ?? null;
    },
    async put(k, v, o) {
      if (echoue) throw new Error('KV indisponible');
      data.set(k, v);
      ttl.set(k, o?.expirationTtl);
    },
    async delete(k) {
      data.delete(k);
    },
    async list({ prefix, limit }) {
      return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((name) => ({ name })) };
    },
  };
}

const SECRET = 'une longue phrase au hasard pour les tests';
const req = (payload: unknown, ip = '203.0.113.20') =>
  new Request('https://loyer.example.pages.dev/api/estimate', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(payload) });

/** Resend : en panne (`panne = true`) ou en marche ; on garde le corps de chaque e-mail parti */
function resend() {
  const etat = { panne: true };
  const partis: any[] = [];
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    if (etat.panne) return new Response('quota', { status: 429 });
    partis.push(JSON.parse(init.body as string));
    return new Response(JSON.stringify({ id: 'x' }), { status: 200 });
  });
  return { etat, partis, fetchMock };
}

const deps = (fetchMock: unknown, now = '2026-11-19T13:02:00Z') => ({ fetch: fetchMock as typeof fetch, data: DATA, refs: REFS, params: PARAMS, log: () => {}, now: () => new Date(now) });

beforeEach(() => resetMemoryLimiter());

describe('Leads en attente (Resend en panne)', () => {
  it('Resend en panne : le visiteur voit son résultat, le lead est gardé chiffré 7 jours', async () => {
    const store = kv();
    const r = resend();
    const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu', LEADS_EN_ATTENTE: store, LEAD_BACKUP_KEY: SECRET };
    const res = await handleEstimate(req(body()), env, deps(r.fetchMock));
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).result.mid).toBeGreaterThan(0);
    expect(store.data.size).toBe(1);
    const [[cle, valeur]] = [...store.data];
    expect(cle.startsWith('lead:2026-11-19T13:02:00.000Z-')).toBe(true);
    expect(store.ttl.get(cle)).toBe(7 * 24 * 3600);
    // chiffré : ni l'e-mail, ni le nom, ni le téléphone ne sont lisibles
    // (on regarde les octets bruts : une suite de chiffres comme « 621 » peut apparaître par hasard dans du base64)
    expect(valeur).toMatch(/^[A-Za-z0-9+/]+=*$/);
    const octets = Buffer.from(valeur, 'base64').toString('latin1');
    for (const clair of ['marie.muller@example.lu', 'Muller', '+352', 'Dudelange', 'Lead loyer']) expect(octets).not.toContain(clair);
    expect(JSON.parse(await dechiffrer(SECRET, valeur)).mail.subject).toContain('Lead loyer – Dudelange');
  });

  it('dès que Resend remarche, le lead en attente part avec « Envoi différé », puis est effacé', async () => {
    const store = kv();
    const r = resend();
    const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu', LEADS_EN_ATTENTE: store, LEAD_BACKUP_KEY: SECRET };
    await handleEstimate(req(body()), env, deps(r.fetchMock));
    r.etat.panne = false;
    await handleEstimate(req(body({ contact: { prenom: 'Paul', nom: 'Weber', email: 'paul.weber@example.lu' } }), '203.0.113.21'), env, deps(r.fetchMock, '2026-11-19T15:00:00Z'));
    expect(r.partis).toHaveLength(2);
    expect(r.partis[0].reply_to).toBe('paul.weber@example.lu'); // le nouveau lead d'abord
    expect(r.partis[1].subject).toBe('[Envoi différé – demande reçue le 19/11 à 14:02] 🔥 Lead loyer – Dudelange – Appartement – gestion : oui');
    expect(r.partis[1].reply_to).toBe('marie.muller@example.lu');
    expect(r.partis[1].text).toContain('n’a pas pu partir au moment de la demande');
    expect(store.data.size).toBe(0);
  });

  it('toujours en panne : rien n’est perdu ni effacé', async () => {
    const store = kv();
    const r = resend();
    const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu', LEADS_EN_ATTENTE: store, LEAD_BACKUP_KEY: SECRET };
    await handleEstimate(req(body()), env, deps(r.fetchMock));
    await handleEstimate(req(body(), '203.0.113.22'), env, deps(r.fetchMock));
    expect(store.data.size).toBe(2);
  });

  it('sans réglage (pas de KV ou pas de secret) : comportement d’avant, message d’erreur, rien de gardé', async () => {
    for (const env of [
      { RESEND_API_KEY: 're_test', LEAD_BACKUP_KEY: SECRET },
      { RESEND_API_KEY: 're_test', LEADS_EN_ATTENTE: kv() },
    ]) {
      resetMemoryLimiter();
      const r = resend();
      const res = await handleEstimate(req(body()), env, deps(r.fetchMock));
      expect(res.status).toBe(502);
    }
  });

  it('KV en panne aussi : message d’erreur au visiteur (rien ne se perd en silence)', async () => {
    const r = resend();
    const res = await handleEstimate(req(body()), { RESEND_API_KEY: 're_test', LEADS_EN_ATTENTE: kv(true), LEAD_BACKUP_KEY: SECRET }, deps(r.fetchMock));
    expect(res.status).toBe(502);
  });

  it('chiffrement : aller-retour, autre secret illisible, deux chiffrements différents', async () => {
    const a = await chiffrer(SECRET, 'bonjour');
    const b = await chiffrer(SECRET, 'bonjour');
    expect(a).not.toBe(b);
    expect(await dechiffrer(SECRET, a)).toBe('bonjour');
    await expect(dechiffrer('autre secret', a)).rejects.toThrow();
  });

  it('lead illisible (secret changé) : ignoré, pas d’envoi, il expirera seul', async () => {
    const store = kv();
    store.data.set('lead:2026-11-18T10:00:00.000Z-abc', await chiffrer('ancien secret', '{}'));
    const r = resend();
    r.etat.panne = false;
    await handleEstimate(req(body()), { RESEND_API_KEY: 're_test', LEADS_EN_ATTENTE: store, LEAD_BACKUP_KEY: SECRET }, deps(r.fetchMock));
    expect(r.partis).toHaveLength(1); // seulement le nouveau lead
    expect(store.data.size).toBe(1);
  });

  it('avec waitUntil (Cloudflare) : l’envoi des leads en attente se fait après la réponse', async () => {
    const store = kv();
    const r = resend();
    const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu', LEADS_EN_ATTENTE: store, LEAD_BACKUP_KEY: SECRET };
    await handleEstimate(req(body()), env, deps(r.fetchMock));
    r.etat.panne = false;
    const taches: Promise<unknown>[] = [];
    await handleEstimate(req(body(), '203.0.113.23'), env, { ...deps(r.fetchMock), waitUntil: (p: Promise<unknown>) => void taches.push(p) });
    expect(taches).toHaveLength(1);
    await Promise.all(taches);
    expect(r.partis).toHaveLength(2);
    expect(store.data.size).toBe(0);
  });
});
