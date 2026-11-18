import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleEstimate } from '../src/server/handler';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { checkFields, normalizePhone, validateSubmission } from '../src/shared/validation';
import config from '../config.json';
import { body, DATA, PARAMS, REFS } from './helpers';

const URL_API = 'https://loyer.example.pages.dev/api/estimate';

function req(payload: unknown, ip = '203.0.113.7', origin = 'https://loyer.example.pages.dev', contentType = 'application/json') {
  return new Request(URL_API, {
    method: 'POST',
    headers: { 'content-type': contentType, 'cf-connecting-ip': ip, origin },
    body: JSON.stringify(payload),
  });
}

function setup() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'test' }), { status: 200 }));
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu' };
  const deps = { fetch: fetchMock as unknown as typeof fetch, data: DATA, refs: REFS, params: PARAMS, log: () => {}, now: () => new Date('2026-11-17T10:00:00Z') };
  return { fetchMock, env, deps };
}

beforeEach(() => resetMemoryLimiter());

describe('API /api/estimate', () => {
  it('un envoi complet renvoie la fourchette et envoie l’e-mail du lead à Jason', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body()), env, deps);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    // Dudelange 80 m², balcon (+2 %), 1 garage (+140 €)
    expect(json.result.low).toBe(1900);
    expect(json.result.high).toBe(2200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const sent = JSON.parse(init.body as string);
    expect(sent.to).toEqual(['contact@immobuild.lu']);
    expect(sent.reply_to).toBe('marie.muller@example.lu');
    expect(sent.subject).toBe('🔥 Lead loyer – Dudelange – Appartement – gestion : oui');
    expect(sent.text).toContain('Chaud – propriétaire, veut la gestion, dans les 3 mois');
    expect(sent.text).toContain('+352 621 123 456');
    expect(sent.text).toContain('Détail du calcul');
    expect(sent.text).toContain('Stationnement : garage × 1');
  });

  it('e-mail du lead : boutons Appeler, WhatsApp (mobile) et Répondre avec un texte préparé dans la langue du visiteur', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req({ ...body({ contact: { prenom: 'Paul-André', nom: "O'Neil" } }), lang: 'de' }), env, deps);
    expect(await res.clone().json()).toMatchObject({ ok: true });
    const html = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).html as string;
    expect(html).toContain('href="tel:+352621123456"');
    expect(html).toContain('href="https://wa.me/352621123456"');
    const mailto = /href="(mailto:[^"]+)"/.exec(html)![1].replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    expect(mailto.startsWith('mailto:marie.muller@example.lu?subject=')).toBe(true);
    const body_ = decodeURIComponent(mailto.split('body=')[1]);
    expect(body_).toContain("Guten Tag Paul-André O'Neil");
    expect(body_).toContain('Ihre Wohnung in Dudelange');
    expect(html).not.toContain("O'Neil"); // apostrophe échappée dans le HTML
  });

  it('e-mail du lead : pas de bouton WhatsApp pour un numéro fixe', async () => {
    const { fetchMock, env, deps } = setup();
    await handleEstimate(req(body({ contact: { numero: '26 54 87 12' } })), env, deps);
    const html = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).html as string;
    expect(html).toContain('href="tel:+35226548712"');
    expect(html).not.toContain('wa.me');
  });

  it('priorité : tiède si la gestion est « peut-être », froid si le visiteur n’est pas propriétaire', async () => {
    const { fetchMock, env, deps } = setup();
    await handleEstimate(req(body({ answers: { gestion: 'peut_etre', disponibilite: 'plus_tard' } })), env, deps);
    await handleEstimate(req(body({ answers: { proprietaire: 'non' } })), env, deps);
    const subjects = fetchMock.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string).text as string);
    expect(subjects[0]).toContain('Priorité : Tiède');
    expect(subjects[1]).toContain('Priorité : Froid – pas propriétaire');
  });

  it('un envoi sans la case RGPD est refusé', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body({ contact: { rgpd: false } })), env, deps);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.errors.rgpd).toBe('rgpd');
    expect(json.result).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('le honeypot bloque les robots (pas de résultat, pas d’e-mail)', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body({ website: 'https://spam.example' })), env, deps);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'rejected' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['e-mail invalide', { email: 'marie@' }],
    ['e-mail vide', { email: '' }],
    ['e-mail avec caractère invisible', { email: 'marie​@example.lu' }],
    ['téléphone trop court', { numero: '123' }],
    ['téléphone avec lettres', { numero: '621 ABC 456' }],
    ['prénom vide', { prenom: '' }],
    ['nom vide', { nom: '   ' }],
    ['nom avec retour à la ligne', { nom: 'Muller\nBcc: x@y.z' }],
  ])('jamais de résultat sans coordonnées valides : %s', async (_label, contact) => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(req(body({ contact })), env, deps);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).not.toMatch(/"low"|"mid"|"high"|€/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('jamais de résultat sans coordonnées : bloc contact absent', async () => {
    const { fetchMock, env, deps } = setup();
    const b = body() as any;
    delete b.contact;
    const res = await handleEstimate(req(b), env, deps);
    expect(res.status).toBe(400);
    expect(await res.text()).not.toMatch(/"mid"/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('les réponses sont vérifiées aussi côté serveur', async () => {
    const { env, deps } = setup();
    const res = await handleEstimate(req(body({ answers: { surface: '-5', commune: 'Paris', energie: 'Z', gestion: 'toujours' } })), env, deps);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(Object.keys(json.errors).sort()).toEqual(['commune', 'energie', 'gestion', 'surface']);
  });

  it('une maison n’a pas besoin d’étage ni d’ascenseur', async () => {
    const { env, deps } = setup();
    const res = await handleEstimate(req(body({ answers: { type: 'maison', surface: '150', etage: undefined, ascenseur: undefined } })), env, deps);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.result.type).toBe('maison');
  });

  it(`au plus ${config.rateLimitPerHour} envois par heure pour une même IP`, async () => {
    const { fetchMock, env, deps } = setup();
    const max = config.rateLimitPerHour;
    for (let i = 0; i < max; i++) expect((await handleEstimate(req(body()), env, deps)).status).toBe(200);
    expect((await handleEstimate(req(body()), env, deps)).status).toBe(429);
    expect((await handleEstimate(req(body(), '198.51.100.1'), env, deps)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(max + 1);
  });

  it('un envoi depuis un autre site est refusé', async () => {
    const { env, deps } = setup();
    expect((await handleEstimate(req(body(), '203.0.113.9', 'https://evil.example'), env, deps)).status).toBe(403);
  });

  it('le type de contenu doit être exactement application/json', async () => {
    const { env, deps } = setup();
    expect((await handleEstimate(req(body(), '203.0.113.9', 'https://loyer.example.pages.dev', 'text/plain'), env, deps)).status).toBe(415);
    expect((await handleEstimate(req(body(), '203.0.113.9', 'https://loyer.example.pages.dev', 'application/json; charset=utf-8'), env, deps)).status).toBe(200);
  });

  it('Resend en panne : pas de résultat, et l’essai ne compte pas dans la limite', async () => {
    const { env, deps } = setup();
    const down = (async () => new Response('err', { status: 500 })) as unknown as typeof fetch;
    for (let i = 0; i < config.rateLimitPerHour + 3; i++) {
      const res = await handleEstimate(req(body()), env, { ...deps, fetch: down });
      expect(res.status).toBe(502);
      expect(await res.text()).not.toMatch(/"mid"/);
    }
    // Resend revient : le visiteur peut envoyer, ses essais ratés n'ont pas été comptés
    expect((await handleEstimate(req(body()), env, deps)).status).toBe(200);
  });

  it('Resend qui ne répond pas (délai de 10 s dépassé) : erreur claire, pas de résultat', async () => {
    const { env, deps } = setup();
    const timeout = (async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    }) as unknown as typeof fetch;
    const res = await handleEstimate(req(body()), env, { ...deps, fetch: timeout });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: 'send' });
  });

  it('sans clé Resend : erreur de configuration, pas de résultat', async () => {
    const { deps } = setup();
    const res = await handleEstimate(req(body()), {}, deps);
    expect(res.status).toBe(500);
  });
});

describe('Vérification des réponses', () => {
  it('téléphone : +352 par défaut, mobile et fixe luxembourgeois, et numéros étrangers', () => {
    expect(normalizePhone('+352', '621 123 456')).toBe('+352621123456');
    expect(normalizePhone('+352', '52 12 34')).toBe('+352521234');
    expect(normalizePhone('+352', '721 123 456')).toBe('phone');
    expect(normalizePhone('+33', '06 71 82 93 04')).toBe('+33671829304');
    expect(normalizePhone('+352', '12')).toBe('phone');
  });

  it('téléphone : les numéros manifestement inventés sont refusés', () => {
    for (const n of ['00000', '000000', '111111', '621 000 000', '691 111 111', '123456', '12345678', '612 345 678', '987 654', '666 666 666'])
      expect(normalizePhone('+352', n), n).toBe('phone');
    for (const [c, n] of [['+33', '06 12 34 56 78'], ['+33', '00 00 00 00 00'], ['+49', '0000000'], ['+32', '0456 00 00 00']])
      expect(normalizePhone(c, n), `${c} ${n}`).toBe('phone');
  });

  it('téléphone : mobiles luxembourgeois seulement dans les plages attribuées (ILR), fixes sans 1 initial', () => {
    for (const p of ['621', '628', '651', '655', '658', '661', '668', '671', '678', '681', '691', '692', '698'])
      expect(normalizePhone('+352', `${p} 482 731`)).toBe(`+352${p}482731`);
    expect(normalizePhone('+352', '631 482 731')).toBe('phone');
    expect(normalizePhone('+352', '601 482 731')).toBe('phone');
    expect(normalizePhone('+352', '112 112')).toBe('phone');
    expect(normalizePhone('+352', '26 54 87 12')).toBe('+35226548712');
    expect(normalizePhone('+352', '691 234 567')).toBe('+352691234567');
  });

  it('téléphone : numéro français, belge ou allemand tapé avec +352 : message clair', () => {
    expect(normalizePhone('+352', '06 71 82 93 04')).toBe('phone_pays');
    expect(normalizePhone('+352', '0471 82 93 04')).toBe('phone_pays');
    expect(normalizePhone('+352', '0151 2345 6789')).toBe('phone_pays');
    expect(normalizePhone('+33', '06 71 82 93 04')).toBe('+33671829304');
  });

  it('téléphone : longueur contrôlée pour la France et la Belgique', () => {
    expect(normalizePhone('+33', '06 71 82 93 0')).toBe('phone');
    expect(normalizePhone('+32', '0471 82 93 04')).toBe('+32471829304');
    expect(normalizePhone('+32', '04 718 29')).toBe('phone');
  });

  it('message : caractères invisibles retirés, séparateurs de ligne Unicode remplacés', () => {
    const { values } = checkFields({ message: 'Bonjour Bcc: x@y.z​' }, ['message']);
    expect(values.message).toBe('Bonjour\nBcc: x@y.z');
  });

  it('surface tolérante : « 80m2 », « 80,5 »', () => {
    expect(checkFields({ surface: '80m2' }, ['surface']).values.surface).toBe(80);
    expect(checkFields({ surface: '80,5' }, ['surface']).values.surface).toBe(80.5);
  });

  it('les champs inconnus envoyés par un robot sont ignorés', () => {
    const b = body({ answers: { prix: 999999, __proto__: { admin: true } } as any });
    const v = validateSubmission(b);
    expect(v.ok).toBe(true);
    if (v.ok) expect(Object.keys(v.value.answers)).not.toContain('prix');
  });
});
