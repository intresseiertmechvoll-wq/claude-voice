/**
 * Moins de faux contacts, et savoir quelle annonce a amené chaque demande — sans cookie ni traceur,
 * sans bloquer un vrai visiteur (en cas de doute, on accepte).
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../config.json';
import { loadLang, translator } from '../src/i18n';
import { checkEmailDomain } from '../src/server/dns';
import { handleEstimate } from '../src/server/handler';
import { COMMUNES } from '../src/shared/communes';
import { leadEmail, qualityLine, sourceSummary } from '../src/shared/email';
import { estimate } from '../src/shared/engine';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import { checkFields, isDisposableEmail, isSequencePhone, normalizePhone, sanitizeSource, validateSubmission } from '../src/shared/validation';
import { landingQuery, landingTitle, readLanding } from '../src/ui/landing';
import { errorKey } from '../src/ui/steps';
import { body, DATA, PARAMS } from './helpers';

const phone = (indicatif: string, numero: string) => checkFields({ indicatif, numero }, ['numero']);

describe('Téléphone : numéros manifestement inventés', () => {
  it.each([
    ['+352', '621 000 000'],
    ['+352', '621 111 111'],
    ['+352', '621 123 456'],
    ['+352', '661 123 456'],
    ['+352', '666 666 666'],
    ['+352', '222 222'],
    ['+33', '06 12 34 56 78'],
    ['+33', '6 00 00 00 00'],
  ])('Refusé : %s %s', (indicatif, numero) => {
    expect(phone(indicatif, numero).errors).toEqual({ numero: 'phone_fake' });
  });

  it.each([
    ['+352', '621 483 920', '+352621483920'],
    ['+352', '691 120 457', '+352691120457'],
    ['+352', '621 112 233', '+352621112233'],
    ['+352', '26 12 34 56', '+35226123456'], // fixe : trop court pour juger
    ['+352', '52 11 11', '+352521111'],
    ['+33', '+33 6 12 47 85 39', '+33612478539'],
    ['+49', '1512 3456789', '+4915123456789'], // mobile allemand : la suite 3456789 ne suffit pas à refuser
    ['+32', '0470 12 34 50', '+32470123450'],
  ])('Accepté : %s %s', (indicatif, numero, e164) => {
    const r = phone(indicatif, numero);
    expect(r.errors).toEqual({});
    expect(r.values.numero).toBe(e164);
  });

  it.each([
    ['+352', '621 654 321', '+352621654321'],
    ['+352', '691 234 567', '+352691234567'],
    ['+33', '6 98 76 54 32', '+33698765432'],
    ['+49', '151 1234567', '+491511234567'],
  ])('Suite de chiffres : acceptée mais signalée : %s %s', (indicatif, numero, e164) => {
    const r = phone(indicatif, numero);
    expect(r.errors).toEqual({});
    expect(r.values.numero).toBe(e164);
    expect(isSequencePhone(e164)).toBe(true);
  });

  it('Numéros ordinaires : pas signalés', () => {
    for (const n of ['+352621483920', '+352691120457', '+33612478539']) expect(isSequencePhone(n)).toBe(false);
  });

  it('Les règles de format restent celles de normalizePhone (erreur « phone », pas « phone_fake »)', () => {
    expect(phone('+352', '721 483 920').errors).toEqual({ numero: 'phone' });
    expect(phone('+352', '123').errors).toEqual({ numero: 'phone' });
    expect(normalizePhone('+352', '621 000 000')).toBe('+352621000000'); // le format seul est correct
  });

  it('Message aimable en FR / DE / EN', async () => {
    await loadLang('de');
    await loadLang('en');
    expect(errorKey('numero', 'phone_fake')).toBe('errors.phone_fake');
    expect(translator('fr')('errors.phone_fake')).toBe('Ce numéro semble incomplet ou fictif. Jason vous rappellera à ce numéro.');
    expect(translator('de')('errors.phone_fake')).toContain('Jason ruft Sie unter dieser Nummer zurück');
    expect(translator('en')('errors.phone_fake')).toContain('Jason will call you back on this number');
    for (const l of ['fr', 'de', 'en'] as const) {
      for (const k of ['phone_fake', 'email_domain', 'email_temp']) expect(translator(l)(`errors.${k}`)).not.toBe(`errors.${k}`);
      expect(translator(l)('fields.numeroPlaceholder')).not.toContain('123 456');
    }
    expect(translator('fr')('errors.email_domain')).toBe('Ce domaine d’e-mail n’existe pas. Vérifiez l’adresse.');
  });
});

describe('E-mail : adresses jetables', () => {
  it.each(['a@mailinator.com', 'a@yopmail.com', 'A@YOPMAIL.FR', 'a@guerrillamail.com', 'a@10minutemail.com', 'a@tempmail.com', 'a@trashmail.com', 'a@temp-mail.org', 'a@x.mailinator.com'])(
    'Refusée : %s',
    (email) => {
      expect(checkFields({ email }, ['email']).errors).toEqual({ email: 'email_temp' });
    },
  );
  it('Acceptées : adresses ordinaires (et domaine qui contient seulement le mot)', () => {
    for (const email of ['marie@pt.lu', 'jo@gmail.com', 'a@notyopmail.com', 'a@mailinator.com.example.lu']) expect(isDisposableEmail(email)).toBe(false);
  });
});

/* ---------- DNS (Cloudflare DNS-over-HTTPS), toujours simulé ---------- */
type Reply = { Status: number; Answer?: { type: number; data: string }[] } | 'error' | 'hang' | number;
function dns(replies: Partial<Record<'MX' | 'A', Reply>>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const r = replies[url.searchParams.get('type') as 'MX' | 'A'] ?? { Status: 0 };
    if (r === 'error') throw new TypeError('network');
    if (r === 'hang') return new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))));
    if (typeof r === 'number') return new Response('err', { status: r });
    return new Response(JSON.stringify(r), { status: 200, headers: { 'content-type': 'application/dns-json' } });
  });
}
const MX = { Status: 0, Answer: [{ type: 15, data: '10 mx.example.lu.' }] };
const A = { Status: 0, Answer: [{ type: 1, data: '192.0.2.1' }] };
const NX = { Status: 3 };

describe('Domaine de l’e-mail : vérification DNS', () => {
  it('MX trouvé : vérifié (une seule question, en-tête application/dns-json)', async () => {
    const f = dns({ MX });
    expect(await checkEmailDomain('marie@Example.LU', f as unknown as typeof fetch)).toBe('verified');
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://cloudflare-dns.com/dns-query?name=example.lu&type=MX');
    expect((init.headers as Record<string, string>).accept).toBe('application/dns-json');
  });
  it('Pas de MX mais une adresse A : vérifié', async () => {
    const f = dns({ MX: { Status: 0 }, A });
    expect(await checkEmailDomain('a@b.lu', f as unknown as typeof fetch)).toBe('verified');
    expect(String(f.mock.calls[1][0])).toContain('type=A');
  });
  it('NXDOMAIN : le domaine n’existe pas', async () => {
    expect(await checkEmailDomain('a@gmial.con', dns({ MX: NX }) as unknown as typeof fetch)).toBe('nxdomain');
  });
  it('Ni MX ni A : accepté (« sans serveur de messagerie »)', async () => {
    expect(await checkEmailDomain('a@b.lu', dns({ MX: { Status: 0 }, A: { Status: 0 } }) as unknown as typeof fetch)).toBe('no_mail');
  });
  it.each([
    ['réseau en panne', { MX: 'error' as const, A: 'error' as const }],
    ['erreur HTTP', { MX: 503, A: 503 }],
    ['SERVFAIL', { MX: { Status: 2 }, A: { Status: 2 } }],
  ])('Panne (%s) : non vérifiable, accepté', async (_l, replies) => {
    expect(await checkEmailDomain('a@b.lu', dns(replies) as unknown as typeof fetch)).toBe('unknown');
  });
  it('Délai dépassé : non vérifiable, sans attendre plus que le délai', async () => {
    const t0 = Date.now();
    expect(await checkEmailDomain('a@b.lu', dns({ MX: 'hang' }) as unknown as typeof fetch, 60)).toBe('unknown');
    expect(Date.now() - t0).toBeLessThan(1000);
  });
  it('Même un fetch qui ignore le signal ne bloque pas au-delà du délai', async () => {
    const never = (() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    expect(await checkEmailDomain('a@b.lu', never, 50)).toBe('unknown');
  });
});

/* ---------- Provenance ---------- */
describe('Provenance : paramètres de campagne, sans cookie', () => {
  it('Clés connues seulement, caractères nettoyés, 60 caractères au plus, identifiants de clic = présence', () => {
    const s = sanitizeSource({
      utm_source: 'google',
      utm_medium: 'cpc\r\nBcc: x@evil.example',
      utm_campaign: 'dudelange-maisons<script>',
      utm_content: 'é'.repeat(5) + 'a'.repeat(80),
      utm_term: 42,
      gclid: true,
      fbclid: 'EAIaIQ-valeur',
      evil: 'x',
    });
    expect(s).toEqual({ utm_source: 'google', utm_medium: 'cpcBcc xevil.example', utm_campaign: 'dudelange-maisonsscript', utm_content: 'a'.repeat(60), gclid: true });
    expect(sanitizeSource('x')).toEqual({});
    expect(sanitizeSource([1])).toEqual({});
  });

  it('Résumé lisible pour Jason', () => {
    expect(sourceSummary({ gclid: true, utm_campaign: 'dudelange-maisons' })).toBe('Google Ads (gclid présent) · campagne : dudelange-maisons');
    expect(sourceSummary({ utm_source: 'facebook', utm_medium: 'paid', fbclid: true })).toBe('Facebook / Instagram (fbclid présent) · source : facebook / paid');
    expect(sourceSummary({ utm_source: 'newsletter' })).toBe('newsletter');
    expect(sourceSummary({})).toBe('Directe / inconnue');
    expect(sourceSummary(undefined)).toBe('Directe / inconnue');
  });

  it('Lien d’arrivée : provenance et préremplissage (commune via les autres noms, valeurs inconnues ignorées)', () => {
    const names = COMMUNES.map((c) => c.name);
    const l = readLanding(new URLSearchParams('utm_source=google&utm_campaign=dudelange maisons&gclid=Cj0KCQ-secret&commune=Düdelingen&type=maison'), names);
    expect(l.source).toEqual({ utm_source: 'google', utm_campaign: 'dudelange maisons', gclid: true });
    expect(l.prefill).toEqual({ commune: 'Dudelange', type: 'maison' });
    expect(readLanding(new URLSearchParams('commune=dudelange&type=appartement'), names).prefill).toEqual({ commune: 'Dudelange', type: 'appartement' });
    expect(readLanding(new URLSearchParams('commune=Paris&type=villa'), names).prefill).toEqual({});
    expect(readLanding(new URLSearchParams(''), names)).toEqual({ source: {}, prefill: {}, clicks: {} });
    expect(l.clicks).toEqual({ gclid: 'Cj0KCQ-secret' });
    // Changement de langue : on garde tout, y compris la valeur de gclid (elle ne part qu'avec le consentement)
    const q = new URLSearchParams({ lang: 'de' });
    landingQuery(l, q);
    expect(q.toString()).toBe('lang=de&utm_source=google&utm_campaign=dudelange+maisons&gclid=Cj0KCQ-secret&commune=Dudelange&type=maison');
  });

  it('Titre repris de l’annonce (FR, DE, EN), titre habituel sans préremplissage', async () => {
    await loadLang('de');
    await loadLang('en');
    const fr = translator('fr'), de = translator('de'), en = translator('en');
    expect(landingTitle({}, fr)).toBe(fr('intro.title'));
    expect(landingTitle({ type: 'maison', commune: 'Dudelange' }, fr)).toBe('Combien vaut votre maison à Dudelange ?');
    expect(landingTitle({ type: 'appartement', commune: 'Esch-sur-Alzette' }, de)).toBe('Was ist Ihre Wohnung in Esch-sur-Alzette wert?');
    expect(landingTitle({ commune: 'Mersch' }, en)).toBe('What is your property in Mersch worth?');
    expect(landingTitle({ type: 'maison' }, fr)).toBe('Combien vaut votre maison ?');
  });
});

/* ---------- embed.js : la page du site transmet la provenance à l'outil ---------- */
function runEmbed(search: string) {
  const created: Record<string, unknown>[] = [];
  const container = { getAttribute: () => null, setAttribute: () => {}, querySelector: () => null, appendChild: () => {}, clientWidth: 800 };
  const script = { src: 'https://estimation.example.pages.dev/embed.js', getAttribute: () => null, hasAttribute: () => false, parentNode: {} };
  const document = {
    currentScript: script,
    readyState: 'complete',
    documentElement: { lang: 'fr' },
    querySelectorAll: () => [container],
    createElement: () => {
      const el: Record<string, unknown> = { style: { setProperty: () => {} }, setAttribute: () => {}, getAttribute: () => null, addEventListener: () => {} };
      created.push(el);
      return el;
    },
  };
  const location = { href: `https://immobuild.lu/estimation/${search}`, origin: 'https://immobuild.lu', pathname: '/estimation/', search };
  const window: Record<string, unknown> = { addEventListener: () => {}, innerWidth: 800 };
  runInNewContext(readFileSync('public/embed.js', 'utf8'), { window, document, location, URL, URLSearchParams, encodeURIComponent, getComputedStyle: () => ({}), setTimeout });
  return new URL(String(created[0].src));
}

describe('embed.js : provenance de la page du site transmise à l’outil', () => {
  it('utm_* nettoyés, gclid / fbclid transmis à l’outil (qui ne les envoie qu’avec consentement), commune et type ; src inchangé', () => {
    const u = runEmbed('?utm_source=google&utm_medium=cpc&utm_campaign=dudelange-maisons%3Cb%3E&gclid=Cj0KCQ-secret&fbclid=IwAR-secret&commune=Dudelange&type=maison&other=1');
    expect(u.origin).toBe('https://estimation.example.pages.dev');
    expect(u.searchParams.get('lang')).toBe('fr');
    expect(u.searchParams.get('src')).toBe('https://immobuild.lu/estimation/');
    expect(u.searchParams.get('utm_source')).toBe('google');
    expect(u.searchParams.get('utm_medium')).toBe('cpc');
    expect(u.searchParams.get('utm_campaign')).toBe('dudelange-maisonsb');
    expect(u.searchParams.get('gclid')).toBe('Cj0KCQ-secret');
    expect(u.searchParams.get('fbclid')).toBe('IwAR-secret');
    expect(u.searchParams.has('msclkid')).toBe(false);
    expect(u.searchParams.get('commune')).toBe('Dudelange');
    expect(u.searchParams.get('type')).toBe('maison');
    expect(u.searchParams.has('other')).toBe(false);
    // Identifiant de clic invalide (caractères interdits) : seulement « présent »
    expect(runEmbed('?gclid=%3Cscript%3E').searchParams.get('gclid')).toBe('1');
  });
  it('Sans paramètres : comme avant (lang et src seulement)', () => {
    const u = runEmbed('');
    expect([...u.searchParams.keys()]).toEqual(['lang', 'src']);
  });
});

/* ---------- Bout en bout : /api/estimate ---------- */
const URL_API = 'https://estimation.example.pages.dev/api/estimate';
function req(payload: unknown, ip = '203.0.113.50') {
  return new Request(URL_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, origin: 'https://estimation.example.pages.dev' },
    body: JSON.stringify(payload),
  });
}
function setup(dnsFetch: unknown) {
  const resend = vi.fn(async () => new Response(JSON.stringify({ id: 'test' }), { status: 200 }));
  const env = { RESEND_API_KEY: 're_test', LEAD_EMAIL: 'contact@immobuild.lu' };
  const deps = { fetch: resend as unknown as typeof fetch, dnsFetch: dnsFetch as typeof fetch, data: DATA, params: PARAMS, log: () => {}, now: () => new Date('2026-11-09T10:00:00Z') };
  const sentText = () => JSON.parse((resend.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).text as string;
  return { resend, env, deps, sentText };
}

beforeEach(() => resetMemoryLimiter());

describe('API : contrôles du contact et provenance', () => {
  it('Domaine inexistant (NXDOMAIN) : erreur sur le champ e-mail, aucun e-mail envoyé, aucun résultat', async () => {
    const { resend, env, deps } = setup(dns({ MX: NX }));
    const res = await handleEstimate(req(body({ contact: { email: 'marie@gmial.con' } })), env, deps);
    expect(res.status).toBe(400);
    const j = (await res.json()) as any;
    expect(j).toEqual({ ok: false, error: 'validation', errors: { email: 'email_domain' } });
    expect(resend).not.toHaveBeenCalled();
  });

  it('Un domaine refusé ne consomme pas la limite d’envois du visiteur', async () => {
    const { env, deps } = setup(dns({ MX: NX }));
    for (let i = 0; i < config.rateLimitPerHour + 2; i++) expect((await handleEstimate(req(body({ contact: { email: 'a@nexistepas.lu' } })), env, deps)).status).toBe(400);
    const ok = setup(dns({ MX }));
    for (let i = 0; i < config.rateLimitPerHour; i++) expect((await handleEstimate(req(body()), ok.env, ok.deps)).status).toBe(200);
    expect((await handleEstimate(req(body()), ok.env, ok.deps)).status).toBe(429);
  });

  it('Adresse jetable : refusée avant toute question DNS et sans compter dans la limite', async () => {
    const f = dns({ MX });
    const { resend, env, deps } = setup(f);
    const res = await handleEstimate(req(body({ contact: { email: 'x@yopmail.com' } })), env, deps);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).errors).toEqual({ email: 'email_temp' });
    expect(f).not.toHaveBeenCalled();
    expect(resend).not.toHaveBeenCalled();
  });

  it('Numéro fictif : refusé côté serveur', async () => {
    const { resend, env, deps } = setup(dns({ MX }));
    const res = await handleEstimate(req(body({ contact: { numero: '621 123 456' } })), env, deps);
    expect(((await res.json()) as any).errors).toEqual({ numero: 'phone_fake' });
    expect(resend).not.toHaveBeenCalled();
  });

  it('Suite de chiffres : le lead part, signalé « à vérifier » dans l’e-mail', async () => {
    const { resend, env, deps, sentText } = setup(dns({ MX }));
    const res = await handleEstimate(req(body({ contact: { numero: '691 234 567' } })), env, deps);
    expect(res.status).toBe(200);
    expect(resend).toHaveBeenCalledTimes(2); // e-mail du lead + copie au visiteur
    expect(sentText()).toContain('Qualité du contact : Téléphone : suite de chiffres, à vérifier');
  });

  it('DNS en panne ou trop lent : le lead part quand même (« non vérifiable »)', async () => {
    const { resend, env, deps, sentText } = setup(dns({ MX: 'error', A: 'error' }));
    const res = await handleEstimate(req(body()), env, deps);
    expect(res.status).toBe(200);
    expect(resend).toHaveBeenCalledTimes(2); // e-mail du lead + copie au visiteur
    expect(sentText()).toContain('Qualité du contact : Téléphone plausible ✓ · domaine de l’e-mail non vérifiable');
  });

  it('Domaine vérifié et provenance Google Ads dans l’e-mail du lead', async () => {
    const { env, deps, sentText } = setup(dns({ MX }));
    const b = { ...body(), source: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'dudelange-maisons', utm_term: 'estimation maison', gclid: true, fbclid: 'valeur' } };
    const res = await handleEstimate(req(b), env, deps);
    expect(res.status).toBe(200);
    const text = sentText();
    expect(text).toContain('Qualité du contact : Téléphone plausible ✓ · domaine de l’e-mail vérifié ✓');
    expect(text).toContain('Provenance : Google Ads (gclid présent) · source : google / cpc · campagne : dudelange-maisons');
    expect(text).toContain('== Provenance ==');
    expect(text).toContain('Mot-clé (utm_term) : estimation maison');
    expect(text).toContain('Identifiant de clic publicitaire : gclid présent (valeur non transmise)');
    expect(text).not.toContain('fbclid');
  });

  it('Sans paramètres de campagne : « Directe / inconnue »', async () => {
    const { env, deps, sentText } = setup(dns({ MX }));
    expect((await handleEstimate(req(body()), env, deps)).status).toBe(200);
    expect(sentText()).toContain('Provenance : Directe / inconnue');
  });

  it('Une provenance farfelue ne bloque jamais l’envoi', async () => {
    const { env, deps } = setup(dns({ MX }));
    expect((await handleEstimate(req({ ...body(), source: 'n’importe quoi' }), env, deps)).status).toBe(200);
    expect((await handleEstimate(req({ ...body(), source: { utm_source: { a: 1 }, gclid: 'x'.repeat(5000) } }), env, deps)).status).toBe(200);
  });

  it('Injection : la provenance ne peut ni casser l’e-mail ni ajouter de balise', () => {
    const v = validateSubmission({ ...body(), source: { utm_campaign: '<img src=x onerror=alert(1)>\n== Coordonnées ==', utm_source: '"><script>' } });
    if (!v.ok) throw new Error('attendu valide');
    const mail = leadEmail(v.value, estimate(v.value.answers, DATA, PARAMS), new Date(), undefined, { emailDomain: 'verified' });
    expect(mail.html).not.toMatch(/<img|<script|onerror=alert\(1\)>/);
    expect(mail.text).not.toContain('\n== Coordonnées ==\nE-mail');
    expect(mail.text.match(/== Coordonnées ==/g)).toHaveLength(1);
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it('Ligne « Qualité du contact » : les trois cas', () => {
    expect(qualityLine({ emailDomain: 'verified' })).toBe('Téléphone plausible ✓ · domaine de l’e-mail vérifié ✓');
    expect(qualityLine({ emailDomain: 'unknown' })).toContain('non vérifiable');
    expect(qualityLine(undefined)).toBe('Téléphone plausible ✓ · domaine de l’e-mail —');
    expect(qualityLine({ emailDomain: 'verified', phoneSequence: true })).toBe('Téléphone : suite de chiffres, à vérifier · domaine de l’e-mail vérifié ✓');
  });
});
