/**
 * Adresse et cartes officielles : réponses réelles du géoportail enregistrées le 18/11/2026
 * (tests/fixtures/geoportail/), servies par un fetch simulé. Aucun appel réseau.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adjacency, handleAddressDetails, handleAddressSuggest, lookupAddress, parseFlood, parseGeocode, pickBuilding } from '../src/server/adresse';
import { handleEstimate } from '../src/server/handler';
import { leadEmail } from '../src/shared/email';
import { estimate } from '../src/shared/engine';
import { resetMemoryLimiter } from '../src/shared/ratelimit';
import type { AddressDetails } from '../src/shared/types';
import { validateSubmission } from '../src/shared/validation';
import buildings from './fixtures/geoportail/buildings-206-burange.json';
import flood from './fixtures/geoportail/flood-hqext-alzette.json';
import suggest from './fixtures/geoportail/fulltextsearch-route-de-bur.json';
import geocode from './fixtures/geoportail/geocode-206-burange.json';
import parcels from './fixtures/geoportail/parcels-206-burange.json';
import { body, DATA, PARAMS } from './helpers';

const BASE = 'https://estimation.example.pages.dev';
const LABEL = '206, Route de Burange, L-3429 Dudelange';
const post = (path: string, payload: unknown, ip = '203.0.113.20') =>
  new Request(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, origin: BASE }, body: JSON.stringify(payload) });
const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
const EMPTY_FC = { type: 'FeatureCollection', features: [] };

/** Géoportail simulé : chaque service renvoie la réponse réelle enregistrée (ou celle donnée en remplacement) */
function geoportal(over: Partial<Record<'suggest' | 'geocode' | 'parcels' | 'buildings' | 'hq100' | 'hqext', unknown>> = {}) {
  const pick = (k: keyof typeof over, def: unknown) => (k in over ? over[k] : def);
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const r = url.includes('fulltextsearch')
      ? pick('suggest', suggest)
      : url.includes('/geocode/')
        ? pick('geocode', geocode)
        : url.includes('/cp/wfs')
          ? pick('parcels', parcels)
          : url.includes('/bu/wfs')
            ? pick('buildings', buildings)
            : url.includes('layers=3262')
              ? pick('hq100', [])
              : url.includes('layers=3263')
                ? pick('hqext', [])
                : new Error('URL inattendue');
    if (r instanceof Error) throw r;
    if (r instanceof Response) return r;
    return ok(r);
  });
}
const down = () => vi.fn(async () => { throw new TypeError('fetch failed'); });
const deps = (geoFetch: unknown, fetch: unknown = vi.fn(async () => ok({ id: 'mail' }))) => ({
  geoFetch: geoFetch as typeof globalThis.fetch,
  fetch: fetch as typeof globalThis.fetch,
  data: DATA,
  params: PARAMS,
  log: () => {},
  now: () => new Date('2026-11-18T10:00:00Z'),
});

/** Géocodage déplacé sur un point de la carte des crues (Alzette), même format que la réponse réelle */
const geocodeAt = (x: number, y: number) => ({ ...geocode, results: [{ ...geocode.results[0], easting: x, northing: y }] });

beforeEach(() => resetMemoryLimiter());

describe('/api/adresse/suggest', () => {
  it('Renvoie les libellés du géoportail (au plus 6)', async () => {
    const f = geoportal();
    const res = await handleAddressSuggest(post('/api/adresse/suggest', { q: '  route de bur ' }), {}, deps(f));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ label: LABEL }, { label: '209, Route de Burange, L-3429 Dudelange' }, { label: '205, Route de Burange, L-3429 Dudelange' }]);
    const url = String(f.mock.calls[0][0]);
    expect(url).toBe('https://map.geoportail.lu/fulltextsearch?query=route%20de%20bur&limit=6&layer=Adresse');
    // L'adresse IP du visiteur n'est pas transmise au géoportail
    expect(JSON.stringify((f.mock.calls[0] as unknown[])[1])).not.toContain('203.0.113.20');
  });

  it('Géoportail en panne ou réponse bizarre : liste vide, pas d’erreur', async () => {
    for (const f of [down(), geoportal({ suggest: new Response('<html>', { status: 200 }) }), geoportal({ suggest: new Response('err', { status: 503 }) })]) {
      const res = await handleAddressSuggest(post('/api/adresse/suggest', { q: 'route de bur' }), {}, deps(f));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    }
  });

  it('Requête vérifiée : 3 à 120 caractères, même site, limite par heure', async () => {
    const f = geoportal();
    expect((await handleAddressSuggest(post('/api/adresse/suggest', { q: 'ab' }), {}, deps(f))).status).toBe(400);
    expect((await handleAddressSuggest(post('/api/adresse/suggest', { q: 'x'.repeat(121) }), {}, deps(f))).status).toBe(400);
    expect((await handleAddressSuggest(post('/api/adresse/suggest', { q: 12345 }), {}, deps(f))).status).toBe(400);
    const foreign = new Request(BASE + '/api/adresse/suggest', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{"q":"route"}' });
    expect((await handleAddressSuggest(foreign, {}, deps(f))).status).toBe(403);
    expect(f).not.toHaveBeenCalled();
    for (let i = 0; i < 120; i++) expect((await handleAddressSuggest(post('/api/adresse/suggest', { q: 'route de bur' }, '198.51.100.3'), {}, deps(f))).status).toBe(200);
    expect((await handleAddressSuggest(post('/api/adresse/suggest', { q: 'route de bur' }, '198.51.100.3'), {}, deps(f))).status).toBe(429);
  });
});

describe('/api/adresse/details', () => {
  it('206, route de Burange : parcelle 1329/5186 (555,45 m²), bâtiment de 125 m² isolé, hors zone inondable', async () => {
    const f = geoportal();
    const res = await handleAddressDetails(post('/api/adresse/details', { label: LABEL }), {}, deps(f));
    expect(res.status).toBe(200);
    const d = (await res.json()) as AddressDetails;
    expect(d).toEqual({
      address: { label: LABEL, locality: 'Dudelange', zip: '3429', precise: true },
      parcel: { numero: '1329/5186', areaM2: 555.45 },
      building: { footprintM2: 125, adjacent: 0, typeSuggere: 'isolee' },
      flood: { hq100: null, hqext: null },
    });
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toBe('https://apiv3.geoportail.lu/geocode/search?queryString=206%2C%20Route%20de%20Burange%2C%20L-3429%20Dudelange');
    expect(urls.find((u) => u.includes('/cp/wfs'))).toContain('bbox=74218.37,61896.72,74222.37,61900.72,EPSG:2169');
    expect(urls.filter((u) => u.includes('/bu/wfs'))).toHaveLength(2); // bâtiment, puis ses voisins
    expect(urls.some((u) => u.includes('layers=3262') && u.includes('box1=74210.37,61888.72,74230.37,61908.72'))).toBe(true);
    expect(urls.some((u) => u.includes('layers=3263'))).toBe(true);
  });

  it('Zone inondable : polygone qui contient le point, pas seulement proche', async () => {
    // Point dans la petite zone « 0 - 0.5 m » de la carte des crues extrêmes
    const inZone = await lookupAddress(LABEL, geoportal({ geocode: geocodeAt(77338.5, 76045), parcels: EMPTY_FC, buildings: EMPTY_FC, hqext: flood }));
    expect(inZone.flood).toEqual({ hq100: null, hqext: { river: 'Alzette', depth: '0 - 0.5 m' } });
    expect(inZone.parcel).toBeNull();
    expect(inZone.building).toBeNull();
    // Point d'où la réponse a été demandée : 3 polygones dans le carré de 20 m, aucun ne le contient
    const near = await lookupAddress(LABEL, geoportal({ geocode: geocodeAt(77335.03, 76049.95), parcels: EMPTY_FC, buildings: EMPTY_FC, hq100: flood, hqext: flood }));
    expect(near.flood).toEqual({ hq100: null, hqext: null });
    expect(parseFlood(flood, [77346.5, 76050])).toEqual({ river: 'Alzette', depth: '> 4.0 m' });
    expect(parseFlood([], [0, 0])).toBeNull();
    expect(() => parseFlood({ error: 'x' }, [0, 0])).toThrow();
  });

  it('Bâtiments accolés : 0 isolée, 1 jumelée, 2 et plus mitoyenne', () => {
    const main = pickBuilding(buildings, [74220.3735, 61898.7242])!;
    expect(main).not.toBeNull();
    expect(adjacency(buildings, main)).toEqual({ adjacent: 0, typeSuggere: 'isolee' });
    // Voisins construits contre un mur du bâtiment réel : [a, b] = mur, décalé de « gap » m puis épais de 8 m
    const against = (a: number[], b: number[], dir: number, gap: number, id: string) => ({
      type: 'Feature',
      id,
      geometry: { type: 'Polygon', coordinates: [[[a[0] + dir * gap, a[1]], [b[0] + dir * gap, b[1]], [b[0] + dir * (gap + 8), b[1]], [a[0] + dir * (gap + 8), a[1]], [a[0] + dir * gap, a[1]]]] },
    });
    const east = [[74227.84908, 61890.57476], [74229.21728, 61900.80767]];
    const west = [[74216.81248, 61891.08387], [74218.30768, 61902.26636]];
    const one = { type: 'FeatureCollection', features: [...buildings.features, against(east[0], east[1], 1, 0, 'est'), against(west[0], west[1], -1, 3, 'loin')] };
    expect(adjacency(one, main)).toEqual({ adjacent: 1, typeSuggere: 'jumelee' });
    const two = { type: 'FeatureCollection', features: [...one.features, against(west[0], west[1], -1, 0.4, 'ouest')] };
    expect(adjacency(two, main)).toEqual({ adjacent: 2, typeSuggere: 'mitoyenne' });
    // Point à plus de 15 m de tout bâtiment : pas de bâtiment retenu
    expect(pickBuilding(buildings, [74180, 61898])).toBeNull();
  });

  it('Panne totale ou partielle : null pour la partie concernée, toujours 200', async () => {
    await expect(lookupAddress(LABEL, down())).rejects.toThrow();
    const all = await handleAddressDetails(post('/api/adresse/details', { label: LABEL }), {}, deps(down()));
    expect(all.status).toBe(200);
    expect(await all.json()).toEqual({ address: null, parcel: null, building: null, flood: null });

    const partial = await lookupAddress(LABEL, geoportal({ parcels: new Response('err', { status: 500 }), hqext: new Response('<xml/>', { status: 200 }) }));
    expect(partial.address?.precise).toBe(true);
    expect(partial.parcel).toBeNull();
    expect(partial.flood).toBeNull(); // une seule carte lue : on ne dit pas « hors zone »
    expect(partial.building).toEqual({ footprintM2: 125, adjacent: 0, typeSuggere: 'isolee' });
  });

  it('Géoportail trop lent : abandon après le délai, sans bloquer', async () => {
    const slow = vi.fn(() => new Promise<Response>(() => {}));
    const t0 = Date.now();
    await expect(lookupAddress(LABEL, slow as unknown as typeof fetch, { timeoutMs: 50 })).rejects.toThrow('timeout');
    expect(Date.now() - t0).toBeLessThan(1000);
    // Géocodage lu, puis services lents : les parties manquantes valent null
    const f = geoportal();
    const partSlow = vi.fn((input: RequestInfo | URL) => (String(input).includes('/geocode/') ? f(input) : new Promise<Response>(() => {})));
    const d = await lookupAddress(LABEL, partSlow as unknown as typeof fetch, { timeoutMs: 50 });
    expect(d).toEqual({ address: { label: LABEL, locality: 'Dudelange', zip: '3429', precise: true }, parcel: null, building: null, flood: null });
  });

  it('Adresse approximative (rue seulement) : pas de parcelle ni de zone inondable', async () => {
    const f = geoportal({ geocode: { ...geocode, results: [{ ...geocode.results[0], accuracy: 6, AddressDetails: { ...geocode.results[0].AddressDetails, postnumber: '' } }] } });
    const d = await lookupAddress('Route de Burange Dudelange', f);
    expect(d).toEqual({ address: { label: 'Route de Burange, L-3429 Dudelange', locality: 'Dudelange', zip: '3429', precise: false }, parcel: null, building: null, flood: null });
    expect(f).toHaveBeenCalledTimes(1);
    expect(parseGeocode({ success: true, count: 0, results: [] })).toBeNull();
  });

  it('Libellé vérifié : texte de 3 à 160 caractères, sans caractère de contrôle', async () => {
    const f = geoportal();
    for (const label of ['', 'ab', 'x'.repeat(161), 'Rue A\nBcc: x@y.z', 42, null]) {
      expect((await handleAddressDetails(post('/api/adresse/details', { label }), {}, deps(f))).status).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('Textes du géoportail nettoyés (pas de retour à la ligne dans l’e-mail)', async () => {
    const evil = { ...geocode, results: [{ ...geocode.results[0], AddressDetails: { ...geocode.results[0].AddressDetails, street: 'Route\r\nBcc: x@evil.example' } }] };
    const d = await lookupAddress(LABEL, geoportal({ geocode: evil }));
    expect(d.address?.label).toBe('206, Route Bcc: x@evil.example, L-3429 Dudelange');
  });
});

describe('/api/estimate avec adresse', () => {
  const withAddress = (over: Record<string, unknown> = {}) =>
    body({ answers: { type: 'maison', rue: LABEL, terrain: '555', maisonType: 'jumelee', poste_toiture: 'bon', etage: '', ascenseur: '', ...over } });

  it('L’e-mail du lead contient l’adresse, la parcelle, le bâtiment et les zones inondables (relus par le serveur)', async () => {
    const mail = vi.fn(async () => ok({ id: 'mail' }));
    const geo = geoportal();
    // Des données géographiques envoyées par le navigateur sont ignorées
    const payload = withAddress();
    (payload as Record<string, unknown>).geo = { parcel: { numero: '9999/1', areaM2: 99999 } };
    const res = await handleEstimate(post('/api/estimate', payload), { RESEND_API_KEY: 're_test' }, deps(geo, mail));
    expect(res.status).toBe(200);
    expect(mail).toHaveBeenCalledTimes(2); // e-mail du lead + copie au visiteur
    const sent = JSON.parse((mail.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.text).toContain('== Adresse sur les cartes officielles (géoportail) ==');
    expect(sent.text).toContain(`Adresse trouvée : ${LABEL}`);
    expect(sent.text).toContain('Parcelle cadastrale : 1329/5186 – 555,45 m²');
    expect(sent.text).toContain('Emprise au sol du bâtiment : 125 m²');
    expect(sent.text).toContain('suggestion : isolée (d’après le plan cadastral, à vérifier');
    expect(sent.text).toContain('réponse du visiteur : jumelée');
    expect(sent.text).toContain('Zone inondable – crue centennale (HQ100) : non (hors zone cartographiée)');
    expect(sent.text).toContain('Zone inondable – crue extrême (HQext) : non (hors zone cartographiée)');
    expect(sent.text).toContain('© ACT – plan cadastral (CC BY 4.0)');
    expect(sent.text).not.toContain('9999/1');
    expect(sent.html).toContain('1329/5186');
  });

  it('Géoportail en panne : l’estimation et l’e-mail partent quand même', async () => {
    const mail = vi.fn(async () => ok({ id: 'mail' }));
    const res = await handleEstimate(post('/api/estimate', withAddress()), { RESEND_API_KEY: 're_test' }, deps(down(), mail));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { result: { market: number } }).result.market).toBeGreaterThan(0);
    const sent = JSON.parse((mail.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.text).toContain('géoportail injoignable');
  });

  it('Géoportail qui ne répond pas : l’estimation part après 4 secondes au plus', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    // Attente réelle (setImmediate n'est pas simulé) jusqu'à ce que la condition soit vraie, 3 s au plus
    const until = async (cond: () => boolean) => {
      for (const t0 = Date.now(); !cond() && Date.now() - t0 < 3000; ) await new Promise((r) => setImmediate(r));
    };
    try {
      const mail = vi.fn(async () => ok({ id: 'mail' }));
      const hang = vi.fn(() => new Promise<Response>(() => {}));
      let res: Response | null = null;
      void handleEstimate(post('/api/estimate', withAddress()), { RESEND_API_KEY: 're_test' }, deps(hang, mail)).then((r) => (res = r));
      await until(() => hang.mock.calls.length > 0);
      expect(hang).toHaveBeenCalledTimes(1); // géocodage demandé, sans réponse
      await vi.advanceTimersByTimeAsync(3990);
      await new Promise((r) => setImmediate(r));
      expect(res).toBeNull();
      await vi.advanceTimersByTimeAsync(20);
      await until(() => res !== null);
      expect((res as Response | null)?.status).toBe(200);
      expect(mail).toHaveBeenCalledTimes(2); // e-mail du lead + copie au visiteur
    } finally {
      vi.useRealTimers();
    }
  });

  it('Sans adresse : aucun appel au géoportail, pas de section', async () => {
    const mail = vi.fn(async () => ok({ id: 'mail' }));
    const geo = geoportal();
    const res = await handleEstimate(post('/api/estimate', body({ answers: { rue: '' } })), { RESEND_API_KEY: 're_test' }, deps(geo, mail));
    expect(res.status).toBe(200);
    expect(geo).not.toHaveBeenCalled();
    const sent = JSON.parse((mail.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.text).not.toContain('cartes officielles');
    expect(sent.text).toContain('Adresse : —');
  });

  it('Appartement : parcelle de l’immeuble, pas de suggestion de type de maison ; zone inondable affichée', () => {
    const v = validateSubmission(body({ answers: { rue: LABEL } }));
    if (!v.ok) throw new Error('invalide');
    const geo: AddressDetails = {
      address: { label: LABEL, locality: 'Dudelange', zip: '3429', precise: true },
      parcel: { numero: '1329/5186', areaM2: 555.45 },
      building: { footprintM2: 125, adjacent: 2, typeSuggere: 'mitoyenne' },
      flood: { hq100: { river: 'Alzette', depth: '0 - 0.5 m' }, hqext: { river: 'Alzette', depth: '0.5 - 1.0 m' } },
    };
    const { text } = leadEmail(v.value, estimate(v.value.answers, DATA, PARAMS), new Date(), geo);
    expect(text).toContain('1329/5186 – 555,45 m² (parcelle de l’immeuble)');
    expect(text).not.toContain('Bâtiments accolés');
    expect(text).toContain('crue centennale (HQ100) : oui – Alzette, hauteur d’eau 0 - 0.5 m');
    expect(text).toContain('crue extrême (HQext) : oui – Alzette, hauteur d’eau 0.5 - 1.0 m');
  });
});
