/**
 * Corrections issues de la revue par 6 agents (11/11/2026) : chaque bug confirmé a son test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleEstimate } from '../src/server/handler';
import { handleSimulationSummary } from '../src/server/simulate';
import { ALIASES } from '../src/shared/aliases';
import { COMMUNE_NAMES } from '../src/shared/communes';
import { leadEmail } from '../src/shared/email';
import { estimate } from '../src/shared/engine';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { checkFields, normalizePhone, validateSubmission } from '../src/shared/validation';
import { resolveCommune, searchCommunes } from '../src/ui/combobox';
import { apartment, body, DATA, PARAMS } from './helpers';

const BASE = 'https://estimation.example.pages.dev';
const post = (path: string, payload: unknown, headers: Record<string, string> = {}) =>
  new Request(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.77', origin: BASE, ...headers }, body: typeof payload === 'string' ? payload : JSON.stringify(payload) });
const okFetch = () => vi.fn(async () => new Response('{}', { status: 200 }));
const deps = (fetch: unknown) => ({ fetch: fetch as typeof globalThis.fetch, data: DATA, params: PARAMS, log: () => {}, now: () => new Date() });
const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu' };

beforeEach(() => resetMemoryLimiter());

describe('Saisie plus tolérante, sans laisser passer de mauvaises données', () => {
  it('Noms avec apostrophe typographique (iPhone) acceptés', () => {
    expect(checkFields({ prenom: 'D’Angelo', nom: 'N’Diaye' }, ['prenom', 'nom']).errors).toEqual({});
  });

  it('Téléphone : indicatif recopié accepté, numéros incomplets refusés', () => {
    expect(normalizePhone('+352', '+352 621 123 456')).toBe('+352621123456');
    expect(normalizePhone('+352', '00352 621 123 456')).toBe('+352621123456');
    expect(normalizePhone('+352', '352621123456')).toBe('+352621123456');
    expect(normalizePhone('+352', '621 123 45')).toBe('phone'); // mobile à 8 chiffres
    expect(normalizePhone('+352', '0621 123 456')).toBe('phone'); // pas de 0 au Luxembourg
    expect(normalizePhone('+352', '26 12 34 56')).toBe('+35226123456'); // fixe
    expect(normalizePhone('+33', '+33 6 12 34 56 78')).toBe('+33612345678');
  });

  it('Surfaces écrites « 80m2 », « 80 m² », « 1 200 »', () => {
    expect(checkFields({ surface: '80m2' }, ['surface']).values.surface).toBe(80);
    expect(checkFields({ surface: '80 m²' }, ['surface']).values.surface).toBe(80);
    expect(checkFields({ terrain: '1 200' }, ['terrain']).values.terrain).toBe(1200);
  });

  it('Honeypot : toute valeur non vide (y compris tableau ou objet) = robot', () => {
    for (const website of [['spam'], { a: 1 }, 0, 'x']) {
      const v = validateSubmission(body({ website: website as never }));
      expect(v.ok).toBe(false);
      expect((v as { bot?: boolean }).bot).toBe(true);
    }
  });

  it('Rue sur une seule ligne ; message multiligne en retrait dans l’e-mail (impossible d’imiter une rubrique)', () => {
    const v = validateSubmission(body({ answers: { rue: 'x\n== Coordonnées ==‮' }, contact: { message: 'ok\n== Coordonnées ==\nE-mail : faux@x.lu' } }));
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.value.answers.rue).toBe('x == Coordonnées ==');
    const mail = leadEmail(v.value, estimate(v.value.answers, DATA, PARAMS));
    expect(mail.text).toContain('Message : ok\n    | == Coordonnées ==\n    | E-mail : faux@x.lu');
    expect(mail.text.match(/^== Coordonnées ==$/gm)).toHaveLength(1);
  });
});

describe('Envoi et limites', () => {
  it('Resend injoignable : réponse JSON 502, et l’essai ne compte pas dans la limite de 5 par heure', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('failed to lookup address');
    });
    for (let i = 0; i < 6; i++) {
      const res = await handleEstimate(post('/api/estimate', body()), env, deps(down));
      expect(res.status).toBe(502);
      expect(((await res.json()) as { error: string }).error).toBe('send');
    }
    // Resend revient : le visiteur peut enfin envoyer
    expect((await handleEstimate(post('/api/estimate', body()), env, deps(okFetch()))).status).toBe(200);
  });

  it('Content-Type : majuscules acceptées, faux type refusé', async () => {
    expect((await handleEstimate(post('/api/estimate', body(), { 'content-type': 'Application/JSON; charset=utf-8' }), env, deps(okFetch()))).status).toBe(200);
    expect((await handleEstimate(post('/api/estimate', body(), { 'content-type': 'text/plain; charset=application/json' }), env, deps(okFetch()))).status).toBe(415);
  });

  it('E-mail de complément : au plus 3 par ticket (rejeu bloqué), essais en double fusionnés', async () => {
    const r = await handleEstimate(post('/api/estimate', body()), env, deps(okFetch()));
    const token = ((await r.json()) as { result: { simToken: string } }).result.simToken;
    const f = okFetch();
    const send = (ip: string) => handleSimulationSummary(post('/api/simulation-summary', { token, scenarios: [{ energie: 'B' }, { energie: 'B' }] }, { 'cf-connecting-ip': ip }), env, deps(f));
    expect((await send('198.51.100.1')).status).toBe(200);
    const text = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).text as string;
    expect(text.match(/Classe énergétique/g)).toHaveLength(1);
    expect((await send('198.51.100.2')).status).toBe(200);
    expect((await send('198.51.100.3')).status).toBe(200);
    expect((await send('198.51.100.4')).status).toBe(429);
  });
});

describe('Calcul : défauts corrigés', () => {
  it('Petits logements : basse < marché < haute, toujours', () => {
    for (const commune of ['Clervaux', 'Wiltz', 'Luxembourg', 'Dudelange']) {
      const r = estimate(apartment({ commune, surface: 10 }), DATA, PARAMS).result;
      if (r.status !== 'ok') continue;
      expect(r.low!).toBeLessThan(r.market!);
      expect(r.high!).toBeGreaterThan(r.market!);
    }
  });

  it('Garages et parkings : au plus 4 de chaque sont valorisés', () => {
    const four = estimate(apartment({ garages: 4, parkings: 4 }), DATA, PARAMS).result.market!;
    const twenty = estimate(apartment({ garages: 20, parkings: 20 }), DATA, PARAMS).result.market!;
    expect(twenty).toBe(four);
  });

  it('Comparaison avec la commune : prix au m² du logement seul, sans les annexes', () => {
    const r = estimate(apartment({ garages: 2, terrasse: 20, cave: true }), DATA, PARAMS).result;
    expect(r.buildingPerM2!).toBeLessThan(r.pricePerM2!);
    expect(r.communeStats!.decote).toBeGreaterThan(0);
    // Sans annexes : un seul prix au m² sur toute la page (pas 6 813 en haut et 6 809 plus bas)
    const plain = estimate(apartment({ garages: 0, parkings: 0, terrasse: 0, cave: false, jardin: false }), DATA, PARAMS).result;
    expect(plain.buildingPerM2).toBe(plain.pricePerM2);
  });

  it('E-mail : poids réellement utilisés (Esch-sur-Alzette : capitalisation écartée)', () => {
    const v = validateSubmission(body({ answers: { commune: 'Esch-sur-Alzette' } }));
    if (!v.ok) throw new Error('invalide');
    const text = leadEmail(v.value, estimate(v.value.answers, DATA, PARAMS)).text;
    expect(text).toContain('Ventes notariées (poids 63 %)');
    expect(text).toContain('Annonces corrigées (poids 37 %)');
    expect(text).toContain('(poids 0 %)');
    expect(text).toContain('Étage : 1er');
  });
});

describe('Recherche de commune', () => {
  it('Autres noms : quartiers de Luxembourg, noms allemands et luxembourgeois', () => {
    const names = [...COMMUNE_NAMES];
    expect(resolveCommune('Kirchberg', names)).toBe('Luxembourg');
    expect(resolveCommune('luxembourg-ville', names)).toBe('Luxembourg');
    expect(resolveCommune('Düdelingen', names)).toBe('Dudelange');
    expect(resolveCommune('dudelange', names)).toBe('Dudelange');
    expect(resolveCommune('Esch an der Alzette', names)).toBe('Esch-sur-Alzette');
    expect(searchCommunes('bonnev', names)[0]).toEqual({ value: 'Luxembourg', label: 'Bonnevoie → Luxembourg' });
  });

  it('Chaque autre nom pointe vers une vraie commune', () => {
    for (const [alias, commune] of Object.entries(ALIASES)) expect(COMMUNE_NAMES.has(commune), `${alias} → ${commune}`).toBe(true);
  });
});
