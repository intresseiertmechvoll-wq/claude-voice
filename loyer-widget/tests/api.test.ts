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

  it('copie au visiteur : désactivée par défaut, un seul e-mail part (à Jason)', async () => {
    const { fetchMock, env, deps } = setup();
    const json = (await (await handleEstimate(req(body()), env, deps)).json()) as any;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(json.copie).toBe(false);
    expect(config.copieVisiteur).toBe(false);
  });

  it('copie au visiteur activée : 2e e-mail au visiteur, dans sa langue, réponse vers Jason, sans aucun texte libre', async () => {
    const { fetchMock, env, deps } = setup();
    const res = await handleEstimate(
      req({ ...body({ contact: { prenom: 'Achetez', nom: 'Pilules', message: 'Visitez spam.example' } }), lang: 'de' }),
      env,
      { ...deps, copieVisiteur: true },
    );
    const json = (await res.json()) as any;
    expect(json.copie).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sent = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.to).toEqual(['marie.muller@example.lu']);
    expect(sent.reply_to).toBe('contact@immobuild.lu');
    expect(sent.subject).toBe('Ihre Mietschätzung für Dudelange – ImmoBuild Kohn');
    expect(sent.text).toContain('Empfohlene Miete: ');
    expect(sent.text).toContain('Unverbindliche Schätzung');
    for (const libre of ['Achetez', 'Pilules', 'spam.example']) {
      expect(sent.text).not.toContain(libre);
      expect(sent.html).not.toContain(libre);
    }
  });

  it('copie au visiteur : si son envoi échoue, le résultat s’affiche quand même (le lead est parti)', async () => {
    const { fetchMock, env, deps } = setup();
    fetchMock.mockImplementationOnce(async () => new Response('{}', { status: 200 })).mockImplementationOnce(async () => new Response('refus', { status: 422 }));
    const res = await handleEstimate(req(body()), env, { ...deps, copieVisiteur: true });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).copie).toBe(false);
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

describe('Lead : doublons et adresse mal tapée', () => {
  const sent = (fetchMock: ReturnType<typeof setup>['fetchMock'], i = 0) => JSON.parse((fetchMock.mock.calls[i] as unknown as [string, RequestInit])[1].body as string);

  it('2e envoi du même visiteur : signalé dans l’objet et en tête de l’e-mail', async () => {
    const { fetchMock, env, deps } = setup();
    await handleEstimate(req({ ...body(), essai: 2 }), env, deps);
    const m = sent(fetchMock);
    expect(m.subject).toBe('🔥 Lead loyer – Dudelange – Appartement – gestion : oui – 2e estimation');
    expect(m.text).toContain('⚠️ Doublon : 2e estimation');
  });

  it('premier envoi, ou valeur farfelue : pas de mention de doublon', async () => {
    for (const essai of [1, undefined, 'x', 0, 999, 2.5]) {
      resetMemoryLimiter();
      const { fetchMock, env, deps } = setup();
      await handleEstimate(req({ ...body(), essai }), env, deps);
      expect(sent(fetchMock).subject.endsWith('gestion : oui')).toBe(true);
      expect(sent(fetchMock).text).not.toContain('Doublon');
    }
  });

  it('adresse probablement mal tapée : Jason est prévenu dans l’e-mail', async () => {
    const { fetchMock, env, deps } = setup();
    await handleEstimate(req(body({ contact: { email: 'marie.muller@gmial.com' } })), env, deps);
    expect(sent(fetchMock).text).toContain('⚠️ E-mail : peut-être mal tapé : marie.muller@gmail.com ?');
    resetMemoryLimiter();
    const s2 = setup();
    await handleEstimate(req(body()), s2.env, s2.deps);
    expect(sent(s2.fetchMock).text).not.toContain('mal tapé');
  });
});

describe('Cloudflare Turnstile (anti-robots)', () => {
  const siteverify = (success: boolean | 'panne') =>
    vi.fn(async (url: string) => {
      if (String(url).includes('turnstile')) {
        if (success === 'panne') throw new Error('timeout');
        return new Response(JSON.stringify({ success, 'error-codes': success ? [] : ['invalid-input-response'] }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 'x' }), { status: 200 });
    });
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu', TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' };
  const deps = (f: ReturnType<typeof siteverify>) => ({ fetch: f as unknown as typeof fetch, data: DATA, refs: REFS, params: PARAMS, log: () => {}, now: () => new Date('2026-11-19T10:00:00Z') });

  it('jeton accepté : le lead part ; le jeton et l’IP sont transmis à Cloudflare', async () => {
    const f = siteverify(true);
    const res = await handleEstimate(req({ ...body(), turnstile: 'XXXX.DUMMY.TOKEN.XXXX' }), env, deps(f));
    expect(res.status).toBe(200);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(JSON.parse(init.body as string)).toEqual({ secret: env.TURNSTILE_SECRET_KEY, response: 'XXXX.DUMMY.TOKEN.XXXX', remoteip: '203.0.113.7' });
    expect(f).toHaveBeenCalledTimes(2); // vérification + e-mail du lead
  });

  it('jeton refusé ou absent : 403, aucun e-mail', async () => {
    for (const [ok, tok] of [[false, 'XXXX.DUMMY.TOKEN.XXXX'], [true, undefined], [true, ''], [true, 'x'.repeat(2049)]] as const) {
      resetMemoryLimiter();
      const f = siteverify(ok);
      const res = await handleEstimate(req({ ...body(), turnstile: tok }), env, deps(f));
      expect(res.status).toBe(403);
      expect(((await res.json()) as any).error).toBe('turnstile');
      expect(f.mock.calls.some((c) => String(c[0]).includes('resend'))).toBe(false);
    }
  });

  it('Cloudflare injoignable : le lead part quand même (pas de lead perdu à cause d’une panne)', async () => {
    const f = siteverify('panne');
    const res = await handleEstimate(req({ ...body(), turnstile: 'XXXX.DUMMY.TOKEN.XXXX' }), env, deps(f));
    expect(res.status).toBe(200);
  });

  it('sans clé secrète : pas de contrôle (comme avant)', async () => {
    const f = siteverify(false);
    const res = await handleEstimate(req(body()), { ...env, TURNSTILE_SECRET_KEY: undefined }, deps(f));
    expect(res.status).toBe(200);
    expect(f.mock.calls.some((c) => String(c[0]).includes('turnstile'))).toBe(false);
  });
});

describe('Surfaces et chambres plausibles', () => {
  const err = (answers: Record<string, unknown>) => {
    const v = validateSubmission(body({ answers }));
    return v.ok ? null : v.errors;
  };
  it('maison 10 m², appartement 450 m² : « taille » (contacter Jason) ; limites acceptées', () => {
    expect(err({ type: 'maison', surface: '10', chambres: '1', etage: '', ascenseur: '' })).toMatchObject({ surface: 'taille' });
    expect(err({ surface: '450' })).toMatchObject({ surface: 'taille' });
    expect(err({ surface: '1200' })).toMatchObject({ surface: 'taille' });
    expect(err({ surface: '12', chambres: '0' })).toBeNull();
    expect(err({ type: 'maison', surface: '600', chambres: '8', etage: '', ascenseur: '' })).toBeNull();
  });
  it('20 chambres sur 30 m² : refusé ; studio 0 chambre accepté ; 3 chambres sur 27 m² accepté', () => {
    expect(err({ surface: '30', chambres: '20' })).toMatchObject({ chambres: 'trop_chambres' });
    expect(err({ surface: '15', chambres: '0' })).toBeNull();
    expect(err({ surface: '27', chambres: '3' })).toBeNull();
  });
});
