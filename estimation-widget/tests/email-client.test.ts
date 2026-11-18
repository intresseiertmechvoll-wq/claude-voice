/** E-mail de confirmation au visiteur : même estimation que l'écran, dans sa langue, sans ses autres données */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../config.json';
import { handleEstimate } from '../src/server/handler';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { formatEuro } from '../src/ui/format';
import { body, DATA, PARAMS } from './helpers';

const ORIGIN = 'https://estimation.example.pages.dev';
const req = (payload: unknown) =>
  new Request(`${ORIGIN}/api/estimate`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.20', origin: ORIGIN }, body: JSON.stringify(payload) });
const dnsFetch = vi.fn(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.lu.' }] })));

function setup(second: 'ok' | 'fail' = 'ok') {
  let n = 0;
  const resend = vi.fn(async () => (++n === 2 && second === 'fail' ? new Response('down', { status: 500 }) : new Response('{"id":"x"}', { status: 200 })));
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu' };
  const deps = { fetch: resend as unknown as typeof fetch, dnsFetch: dnsFetch as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {}, now: () => new Date('2026-11-09T10:00:00Z') };
  const sent = (i: number) => JSON.parse((resend.mock.calls[i] as unknown as [string, RequestInit])[1].body as string);
  return { resend, env, deps, sent };
}

beforeEach(() => resetMemoryLimiter());

describe('E-mail au visiteur', () => {
  it('Part après l’e-mail du lead, au visiteur, réponse vers Jason, avec les mêmes montants que l’écran', async () => {
    const { resend, env, deps, sent } = setup();
    const res = await handleEstimate(req(body()), env, deps);
    const r = ((await res.json()) as any).result;
    expect(resend).toHaveBeenCalledTimes(2);
    expect(sent(0).to).toEqual(['contact@immobuild.lu']);
    expect(sent(0).text).toContain('Copie au visiteur');
    const m = sent(1);
    expect(m.to).toEqual(['marie.muller@example.lu']);
    expect(m.reply_to).toBe('contact@immobuild.lu');
    expect(m.subject).toBe('Votre estimation : Appartement à Dudelange');
    for (const v of [r.market, r.low, r.high]) expect(m.text).toContain(formatEuro(v, 'fr'));
    expect(m.text).toContain('Bonjour Marie,');
    expect(m.text).toContain('Estimation indicative');
    expect(m.text).toContain('Observatoire de l’Habitat');
    expect(m.text).toContain(config.phone);
    expect(m.html).toContain(formatEuro(r.market, 'fr'));
  });

  it('Ne contient pas les autres données du visiteur (téléphone, adresse, message, provenance)', async () => {
    const { env, deps, sent } = setup();
    const b = { ...body({ contact: { message: 'Message privé pour Jason' } }), source: { utm_campaign: 'campagne-secrete' } };
    await handleEstimate(req(b), env, deps);
    const all = JSON.stringify(sent(1));
    for (const s of ['621 483 920', '621483920', 'Rue de la Libération', 'Message privé', 'campagne-secrete', 'Muller']) expect(all).not.toContain(s);
  });

  it('Dans la langue du visiteur (allemand, anglais)', async () => {
    const { env, deps, sent } = setup();
    await handleEstimate(req({ ...body(), lang: 'de' }), env, deps);
    expect(sent(1).subject).toMatch(/^Ihre Bewertung: .+ in Dudelange$/);
    expect(sent(1).text).toContain('Guten Tag Marie,');
    expect(sent(1).html).toContain('lang="de"');
    resetMemoryLimiter();
    const en = setup();
    await handleEstimate(req({ ...body(), lang: 'en' }), en.env, en.deps);
    expect(en.sent(1).text).toContain('Hello Marie,');
    expect(en.sent(1).text).toContain('Market value');
  });

  it('Commune sans données : pas de montant, le message « je vous recontacte »', async () => {
    const { env, deps, sent } = setup();
    await handleEstimate(req(body({ answers: { commune: 'Tandel' } })), env, deps);
    expect(sent(1).subject).toBe('Votre demande d’estimation : Appartement à Tandel');
    expect(sent(1).text).not.toContain('€');
    expect(sent(1).text).toContain('pas assez de données publiques');
  });

  it('Maison : la mention « pas de prix de vente publics pour les maisons » est incluse', async () => {
    const { env, deps, sent } = setup();
    const b = body({ answers: { type: 'maison', terrain: '400', maisonType: 'jumelee', etage: '', ascenseur: '', poste_toiture: 'bon' } });
    const res = await handleEstimate(req(b), env, deps);
    expect(res.status).toBe(200);
    expect(sent(1).subject).toBe('Votre estimation : Maison à Dudelange');
    expect(sent(1).text).toContain('pas de prix de vente publics pour les maisons');
  });

  it('Échec de l’envoi au visiteur : le résultat s’affiche quand même', async () => {
    const { env, deps, resend } = setup('fail');
    const res = await handleEstimate(req(body()), env, deps);
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).ok).toBe(true);
    expect(resend).toHaveBeenCalledTimes(2);
  });

  it('Sur Cloudflare (waitUntil) : l’envoi au visiteur ne retarde pas la réponse', async () => {
    const { env, deps } = setup();
    const waitUntil = vi.fn();
    const res = await handleEstimate(req(body()), env, { ...deps, waitUntil });
    expect(res.status).toBe(200);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
  });

  describe('Désactivé dans config.json (customerEmail: false)', () => {
    const before = config.customerEmail;
    afterEach(() => void ((config as { customerEmail: boolean }).customerEmail = before));
    it('Seul l’e-mail du lead part, sans la ligne « Copie au visiteur »', async () => {
      (config as { customerEmail: boolean }).customerEmail = false;
      const { env, deps, resend, sent } = setup();
      await handleEstimate(req(body()), env, deps);
      expect(resend).toHaveBeenCalledTimes(1);
      expect(sent(0).text).not.toContain('Copie au visiteur');
    });
  });
});
