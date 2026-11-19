/** Mesure des annonces avec consentement : rien sans la case ; avec la case, seulement ce qui est annoncé */
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLang, translator } from '../src/i18n';
import { handleEstimate } from '../src/server/handler';
import { consentTexts, sanitizeAds } from '../src/shared/ads';
import { googleConversionTime } from '../src/shared/email';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { validateSubmission } from '../src/shared/validation';
import { renderStep } from '../src/ui/steps';
import { body, DATA, PARAMS } from './helpers';

const ORIGIN = 'https://estimation.example.pages.dev';
const NOW = new Date('2026-11-09T10:00:00Z');
const GCLID = 'EAIaIQobChMI-test_gclid.123';
const FBCLID = 'IwAR3x-test_fbclid';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const req = (payload: unknown) =>
  new Request(`${ORIGIN}/api/estimate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.30', origin: ORIGIN, 'user-agent': 'Mozilla/5.0 Test' },
    body: JSON.stringify(payload),
  });
const dnsFetch = vi.fn(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.lu.' }] })));
const META = { META_PIXEL_ID: '123456789012345', META_CAPI_TOKEN: 'EAAB-test-token' };

function setup(meta: 'ok' | 'fail' = 'ok') {
  const calls: { url: string; body: any }[] = [];
  const f = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(init.body as string) });
    if (url.includes('graph.facebook.com') && meta === 'fail') return new Response('{"error":{}}', { status: 400 });
    return new Response('{"id":"x"}', { status: 200 });
  });
  const deps = { fetch: f as unknown as typeof fetch, dnsFetch: dnsFetch as unknown as typeof fetch, data: DATA, params: PARAMS, log: () => {}, now: () => NOW };
  const lead = () => calls.find((c) => c.url.includes('resend') && c.body.to[0] === 'contact@immobuild.lu')!.body.text as string;
  const metaCall = () => calls.find((c) => c.url.includes('graph.facebook.com'));
  return { calls, deps, lead, metaCall };
}
const withAds = (ads: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  ...body(),
  source: { utm_source: 'facebook', ...(ads.gclid ? { gclid: true } : {}), ...(ads.fbclid ? { fbclid: true } : {}) },
  ads,
  ...extra,
});

beforeEach(() => resetMemoryLimiter());

describe('Consentement : nettoyage', () => {
  const now = NOW.getTime();
  it('Sans consentement explicite (true) : rien', () => {
    expect(sanitizeAds({ gclid: GCLID }, now)).toBeNull();
    expect(sanitizeAds({ consent: 'true', gclid: GCLID }, now)).toBeNull();
    expect(sanitizeAds(undefined, now)).toBeNull();
  });
  it('Identifiants invalides ignorés ; date d’arrivée bornée (7 jours, jamais dans le futur)', () => {
    expect(sanitizeAds({ consent: true, gclid: '<script>' }, now)).toBeNull();
    expect(sanitizeAds({ consent: true, fbclid: FBCLID, clickAt: now - 60_000 }, now)).toEqual({ fbclid: FBCLID, clickAt: now - 60_000 });
    expect(sanitizeAds({ consent: true, fbclid: FBCLID, clickAt: now + 1 }, now)!.clickAt).toBe(now);
    expect(sanitizeAds({ consent: true, fbclid: FBCLID, clickAt: now - 8 * 864e5 }, now)!.clickAt).toBe(now);
  });
  it('Le formulaire sans la case n’envoie pas d’identifiant : la demande ne contient rien', () => {
    const v = validateSubmission(body());
    expect(v.ok && v.value.ads).toBeNull();
  });
});

describe('Case à l’étape 6', () => {
  const ctx = (adPlatforms?: ('google' | 'meta')[], pub?: boolean) =>
    ({ t: translator('fr'), lang: 'fr' as const, v: { pub }, e: {}, privacyUrl: 'https://x', quickCommunes: [], adPlatforms });
  it('Absente sans annonce Google / Meta', () => {
    expect(renderStep(6, ctx())).not.toContain('id="pub"');
    expect(renderStep(6, ctx([]))).not.toContain('id="pub"');
  });
  it('Présente, non cochée, avec la bonne plateforme et ce qui est transmis', () => {
    const g = renderStep(6, ctx(['google']));
    expect(g).toContain('id="pub"');
    expect(g).not.toMatch(/id="pub"[^>]*checked/);
    expect(g).toContain('indique à Google que ma demande');
    expect(g).toContain('Seul l’identifiant du clic');
    const m = renderStep(6, ctx(['google', 'meta']));
    expect(m).toContain('Google et Meta (Facebook, Instagram)');
    expect(m).toContain('forme hachée');
    expect(renderStep(6, ctx(['meta'], true))).toMatch(/id="pub"[^>]*checked/);
  });
  it('Textes en allemand et anglais', async () => {
    await loadLang('de');
    await loadLang('en');
    expect(consentTexts(translator('de'), ['meta']).label).toContain('Meta (Facebook, Instagram) mitteilt');
    expect(consentTexts(translator('en'), ['google']).details).toContain('Only the ad click identifier');
  });
});

describe('Serveur : Meta (API Conversions) et Google (ligne d’import)', () => {
  it('Avec consentement et fbclid : événement « Lead » chez Meta, e-mail et téléphone hachés, rien en clair', async () => {
    const { deps, metaCall, lead } = setup();
    const clickAt = NOW.getTime() - 120_000;
    const res = await handleEstimate(req(withAds({ consent: true, fbclid: FBCLID, clickAt })), { RESEND_API_KEY: 're', LEAD_EMAIL: 'contact@immobuild.lu', ...META }, deps);
    expect(res.status).toBe(200);
    const m = metaCall()!;
    expect(m.url).toBe(`https://graph.facebook.com/v27.0/${META.META_PIXEL_ID}/events`);
    expect(m.body.access_token).toBe(META.META_CAPI_TOKEN);
    const ev = m.body.data[0];
    expect(ev).toMatchObject({ event_name: 'Lead', event_time: NOW.getTime() / 1000, action_source: 'website', event_source_url: `${ORIGIN}/` });
    expect(ev.user_data).toEqual({
      fbc: `fb.1.${clickAt}.${FBCLID}`,
      em: [sha('marie.muller@example.lu')],
      ph: [sha('352621483920')],
      client_user_agent: 'Mozilla/5.0 Test',
    });
    const all = JSON.stringify(m.body);
    for (const plain of ['marie.muller@example.lu', '621483920', 'Marie', 'Muller', 'Dudelange', '203.0.113.30']) expect(all).not.toContain(plain);
    expect(lead()).toContain('Meta : transmis automatiquement (API Conversions)');
    expect(lead()).toMatch(/Consentement : oui, le 2026-11-09T10:00:00.000Z \(texte pub-v1, FR\) : « J’accepte qu’ImmoBuild Kohn indique à Meta/);
  });

  it('Sans la case : aucun appel à Meta, l’e-mail dit « non »', async () => {
    const { deps, metaCall, lead } = setup();
    const b = { ...body(), source: { fbclid: true } };
    await handleEstimate(req(b), { RESEND_API_KEY: 're', LEAD_EMAIL: 'contact@immobuild.lu', ...META }, deps);
    expect(metaCall()).toBeUndefined();
    expect(lead()).toContain('Consentement : non : rien n’a été transmis à Google ni à Meta');
  });

  it('Consentement mais Meta non configuré : aucun appel, l’e-mail le dit', async () => {
    const { deps, metaCall, lead } = setup();
    await handleEstimate(req(withAds({ consent: true, fbclid: FBCLID })), { RESEND_API_KEY: 're', LEAD_EMAIL: 'contact@immobuild.lu' }, deps);
    expect(metaCall()).toBeUndefined();
    expect(lead()).toContain('API Conversions non configurée');
  });

  it('Meta en erreur : le visiteur a quand même son résultat', async () => {
    const { deps, metaCall } = setup('fail');
    const res = await handleEstimate(req(withAds({ consent: true, fbclid: FBCLID })), { RESEND_API_KEY: 're', LEAD_EMAIL: 'contact@immobuild.lu', ...META }, deps);
    expect(res.status).toBe(200);
    expect(metaCall()).toBeDefined();
  });

  it('Google : ligne d’import prête dans l’e-mail (heure de Luxembourg, consentement « Granted »), pas d’appel à Meta', async () => {
    const { deps, metaCall, lead } = setup();
    await handleEstimate(req(withAds({ consent: true, gclid: GCLID }, { lang: 'de' })), { RESEND_API_KEY: 're', LEAD_EMAIL: 'contact@immobuild.lu', ...META }, deps);
    expect(metaCall()).toBeUndefined();
    expect(lead()).toContain(`Ligne CSV : ${GCLID},Lead estimation,2026-11-09 11:00:00+0100,,,Granted`);
    expect(lead()).toContain('(texte pub-v1, DE) : « Ich bin einverstanden, dass ImmoBuild Kohn Google mitteilt');
  });

  it('Heure d’été : décalage +0200', () => {
    expect(googleConversionTime(new Date('2026-07-01T08:30:05Z'))).toBe('2026-07-01 10:30:05+0200');
  });
});
