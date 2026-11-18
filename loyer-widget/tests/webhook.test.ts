import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { handleEstimate } from '../src/server/handler';
import { handleResendWebhook } from '../src/server/webhook';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { body, DATA, PARAMS, REFS } from './helpers';

// Secret au format Resend/Svix : « whsec_ » + clé en base64
const SECRET = 'whsec_' + Buffer.from('cle-de-test-pour-les-avis-resend').toString('base64');
const NOW = new Date('2026-11-18T20:00:00Z');
const TS = String(Math.floor(NOW.getTime() / 1000));

/** Signature calculée avec node:crypto (indépendamment du code testé) */
function signe(payload: string, id = 'msg_test', ts = TS, secret = SECRET) {
  const sig = createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`${id}.${ts}.${payload}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${sig}` };
}

function avis(type: string, tags: Record<string, string> | undefined, to = 'paul.weber@exemple-faux.lu') {
  return JSON.stringify({
    type,
    created_at: '2026-11-18T19:59:00Z',
    data: { email_id: 'e1', from: 'ImmoBuild Loyer <loyer@immobuild.lu>', to: [to], subject: 'Ihre Mietschätzung für Dudelange – ImmoBuild Kohn', bounce: { message: 'Mailbox does not exist', type: 'Permanent', subType: 'General' }, ...(tags ? { tags } : {}) },
  });
}

function setup() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'x' }), { status: 200 }));
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu', RESEND_WEBHOOK_SECRET: SECRET };
  const deps = { fetch: fetchMock as unknown as typeof fetch, data: DATA, refs: REFS, params: PARAMS, log: () => {}, now: () => NOW };
  return { fetchMock, env, deps };
}

const req = (payload: string, headers: Record<string, string>) =>
  new Request('https://verlounen.lu/api/resend-webhook', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: payload });

describe('Avis de Resend : copie au visiteur non livrée → e-mail « adresse fausse » à Jason', () => {
  it('copie au visiteur rejetée (bounce) : Jason reçoit l’avis, avec le numéro à rappeler', async () => {
    const { fetchMock, env, deps } = setup();
    const p = avis('email.bounced', { categorie: 'copie_visiteur', tel: '352691482731' });
    const res = await handleResendWebhook(req(p, signe(p)), env, deps);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.to).toEqual(['contact@immobuild.lu']);
    expect(sent.subject).toBe('⚠️ Adresse e-mail fausse : paul.weber@exemple-faux.lu – rappeler au +352 691 482 731');
    expect(sent.text).toContain('Mailbox does not exist');
    expect(sent.html).toContain('href="tel:+352691482731"');
    expect(sent.tags).toBeUndefined(); // l'avis lui-même n'est pas étiqueté : pas de boucle
  });

  it('aussi pour « email.failed » et « email.suppressed »', async () => {
    for (const type of ['email.failed', 'email.suppressed']) {
      const { fetchMock, env, deps } = setup();
      const p = avis(type, { categorie: 'copie_visiteur', tel: '33671829304' });
      expect((await handleResendWebhook(req(p, signe(p)), env, deps)).status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it('ignoré : e-mail du lead (sans étiquette), copie bien livrée, autre événement', async () => {
    for (const p of [avis('email.bounced', undefined), avis('email.delivered', { categorie: 'copie_visiteur', tel: '352691482731' }), avis('email.opened', { categorie: 'copie_visiteur' })]) {
      const { fetchMock, env, deps } = setup();
      const res = await handleResendWebhook(req(p, signe(p)), env, deps);
      expect(res.status).toBe(200);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it('refusé : signature fausse, autre secret, contenu modifié, message trop vieux', async () => {
    const p = avis('email.bounced', { categorie: 'copie_visiteur', tel: '352691482731' });
    const cas = [
      { ...signe(p), 'svix-signature': 'v1,AAAA' },
      signe(p, 'msg_test', TS, 'whsec_' + Buffer.from('autre-secret').toString('base64')),
      signe(p.replace('exemple-faux', 'autre')),
      signe(p, 'msg_test', String(Number(TS) - 6 * 60)),
      {},
    ];
    for (const headers of cas) {
      const { fetchMock, env, deps } = setup();
      const res = await handleResendWebhook(req(p, headers as Record<string, string>), env, deps);
      expect(res.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it('plusieurs signatures dans l’en-tête (changement de secret) : une seule valable suffit', async () => {
    const { fetchMock, env, deps } = setup();
    const p = avis('email.bounced', { categorie: 'copie_visiteur', tel: '352691482731' });
    const h = signe(p);
    h['svix-signature'] = `v1,AAAAAAAA ${h['svix-signature']}`;
    expect((await handleResendWebhook(req(p, h), env, deps)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('secret absent : 500, rien n’est envoyé ; GET : 405', async () => {
    const { fetchMock, env, deps } = setup();
    const p = avis('email.bounced', { categorie: 'copie_visiteur' });
    expect((await handleResendWebhook(req(p, signe(p)), { ...env, RESEND_WEBHOOK_SECRET: undefined }, deps)).status).toBe(500);
    expect((await handleResendWebhook(new Request('https://verlounen.lu/api/resend-webhook'), env, deps)).status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('la copie au visiteur part avec les étiquettes attendues (catégorie et téléphone)', async () => {
    resetMemoryLimiter();
    const { fetchMock, env, deps } = setup();
    const r = new Request('https://loyer.example.pages.dev/api/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
      body: JSON.stringify(body({ contact: { numero: '691 482 731' } })),
    });
    await handleEstimate(r, env, { ...deps, copieVisiteur: true });
    const copie = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(copie.tags).toEqual([
      { name: 'categorie', value: 'copie_visiteur' },
      { name: 'tel', value: '352691482731' },
    ]);
    const lead = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(lead.tags).toBeUndefined();
  });
});
