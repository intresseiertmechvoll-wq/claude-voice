/**
 * Adresse → données publiques du géoportail national (geoportail.lu, Administration du cadastre et de la topographie).
 * - /api/adresse/suggest : propositions d'adresses pendant la saisie
 * - /api/adresse/details : parcelle cadastrale, emprise du bâtiment, bâtiments accolés, zones inondables
 * Le serveur interroge le géoportail lui-même : l'adresse IP du visiteur n'est jamais transmise, rien n'est enregistré.
 * Une partie qui échoue vaut null : jamais d'erreur 5xx pour une panne partielle du géoportail.
 */
import { allowSubmission } from '../shared/ratelimit';
import { area, bbox, contains, minDistance, pointDistance, type Pt } from '../shared/geo';
import type { AddressDetails, FloodZone, MaisonType } from '../shared/types';
import { defaultDeps, json, readJson, type Deps, type Env } from './handler';

export const GEO_TIMEOUT_MS = 4000;
const SUGGEST_PER_HOUR = 120;
const DETAILS_PER_HOUR = 60;
const LABEL_MAX = 160;

const URLS = {
  suggest: (q: string) => `https://map.geoportail.lu/fulltextsearch?query=${encodeURIComponent(q)}&limit=6&layer=Adresse`,
  geocode: (label: string) => `https://apiv3.geoportail.lu/geocode/search?queryString=${encodeURIComponent(label)}`,
  wfs: (service: 'cp' | 'bu', typeName: string, b: number[], count: number) =>
    `https://wms.inspire.geoportail.lu/geoserver/${service}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=${typeName}&srsName=EPSG:2169&bbox=${b.map((v) => v.toFixed(2)).join(',')},EPSG:2169&outputFormat=application/json&count=${count}`,
  flood: (layer: number, [x, y]: Pt) => {
    const box = [x - 10, y - 10, x + 10, y + 10].map((v) => v.toFixed(2)).join(',');
    return `https://map.geoportail.lu/getfeatureinfo?layers=${layer}&box1=${box}&box2=${box}`;
  },
};
/** Cartes des zones inondables (Administration de la gestion de l'eau) : crue centennale et crue extrême */
const FLOOD_LAYERS = { hq100: 3262, hqext: 3263 } as const;

/** Texte sur une ligne, sans caractères de contrôle ni de direction (protège l'e-mail et la page) */
export function clean(v: unknown, max: number): string {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  return String(v)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export interface GeoOptions {
  /** délai maximal de chaque appel au géoportail */
  timeoutMs?: number;
  /** délai maximal de l'ensemble (les parties déjà lues sont gardées) */
  deadlineMs?: number;
}

/** GET JSON avec délai maximal ; lève une erreur en cas de panne, de délai dépassé ou de réponse non JSON */
async function getJson(f: typeof fetch, url: string, ms: number, outer?: AbortSignal): Promise<unknown> {
  if (outer?.aborted) throw new Error('deadline');
  const c = new AbortController();
  const abort = () => c.abort();
  outer?.addEventListener('abort', abort);
  const timer = setTimeout(abort, ms);
  const stopped = new Promise<never>((_, reject) => c.signal.addEventListener('abort', () => reject(new Error('timeout'))));
  stopped.catch(() => {});
  try {
    const res = await Promise.race([f(url, { signal: c.signal, headers: { accept: 'application/json' } }), stopped]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await Promise.race([res.json() as Promise<unknown>, stopped]);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', abort);
  }
}

const features = (fc: unknown): { id?: unknown; geometry?: unknown; properties?: Record<string, unknown> }[] => {
  const list = (fc as { features?: unknown } | null)?.features;
  if (!Array.isArray(list)) throw new Error('format');
  return list.filter((f) => f && typeof f === 'object');
};

/* ---------- Propositions d'adresses ---------- */

export function parseSuggestions(fc: unknown): { label: string }[] {
  const out: { label: string }[] = [];
  for (const f of features(fc)) {
    const label = clean(f.properties?.label, LABEL_MAX);
    if (label && !out.some((o) => o.label === label)) out.push({ label });
  }
  return out.slice(0, 6);
}

export async function suggestAddresses(q: string, f: typeof fetch, o: GeoOptions = {}): Promise<{ label: string }[]> {
  try {
    return parseSuggestions(await getJson(f, URLS.suggest(q), o.timeoutMs ?? GEO_TIMEOUT_MS));
  } catch {
    return [];
  }
}

/* ---------- Détails d'une adresse ---------- */

type Located = { address: NonNullable<AddressDetails['address']>; point: Pt };

/** Réponse du géocodeur → adresse normalisée et point en LUREF (EPSG:2169) ; null si rien de fiable */
export function parseGeocode(raw: unknown): Located | null {
  const r = (raw as { results?: unknown } | null)?.results;
  if (!Array.isArray(r) || !r.length) return null;
  const best = r[0] as { accuracy?: unknown; easting?: unknown; northing?: unknown; AddressDetails?: Record<string, unknown> };
  const x = Number(best.easting);
  const y = Number(best.northing);
  // Emprise du Luxembourg en LUREF (avec marge) : une coordonnée hors de ce cadre n'est pas une adresse luxembourgeoise
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 40000 || x > 110000 || y < 50000 || y > 145000) return null;
  const d = best.AddressDetails ?? {};
  const num = clean(d.postnumber, 12);
  const street = clean(d.street, 80);
  const zip = clean(d.zip, 8).replace(/\D/g, '');
  const locality = clean(d.locality, 60);
  if (!street || !locality) return null;
  const label = `${num ? `${num}, ` : ''}${street}, ${zip ? `L-${zip} ` : ''}${locality}`;
  return { address: { label, locality, zip, precise: Number(best.accuracy) >= 7 }, point: [x, y] };
}

/** Parcelle cadastrale qui contient le point (la recherche par emprise renvoie aussi les voisines) */
export function pickParcel(fc: unknown, pt: Pt): AddressDetails['parcel'] {
  const hit = features(fc).find((f) => contains(f.geometry, pt));
  if (!hit) return null;
  const numero = clean(hit.properties?.label, 30);
  const given = Number(hit.properties?.area);
  const areaM2 = Number.isFinite(given) && given > 0 ? given : Math.round(area(hit.geometry) * 100) / 100;
  return numero && areaM2 > 0 ? { numero, areaM2 } : null;
}

/** Bâtiment qui contient le point, sinon le plus proche à moins de 15 m */
export function pickBuilding(fc: unknown, pt: Pt): { id: string; geometry: unknown } | null {
  let best: { id: string; geometry: unknown; d: number } | null = null;
  for (const f of features(fc)) {
    const d = pointDistance(f.geometry, pt);
    if (d <= 15 && (!best || d < best.d)) best = { id: String(f.id ?? ''), geometry: f.geometry, d };
  }
  return best && { id: best.id, geometry: best.geometry };
}

/** Nombre d'autres bâtiments à moins de 0,6 m → 0 isolée, 1 jumelée, 2 et plus mitoyenne (suggestion à vérifier) */
export function adjacency(fc: unknown, main: { id: string; geometry: unknown }): { adjacent: number; typeSuggere: MaisonType } {
  const same = JSON.stringify(main.geometry);
  const adjacent = features(fc).filter((f) => {
    if ((main.id && String(f.id ?? '') === main.id) || JSON.stringify(f.geometry) === same) return false;
    return minDistance(main.geometry, f.geometry) <= 0.6;
  }).length;
  return { adjacent, typeSuggere: adjacent === 0 ? 'isolee' : adjacent === 1 ? 'jumelee' : 'mitoyenne' };
}

/** Réponse getfeatureinfo d'une carte des zones inondables → zone qui contient le point, ou null (hors zone) */
export function parseFlood(raw: unknown, pt: Pt): FloodZone | null {
  if (!Array.isArray(raw)) throw new Error('format');
  for (const layer of raw) {
    const list = (layer as { features?: unknown } | null)?.features;
    if (!Array.isArray(list)) continue;
    for (const f of list as { geometry?: unknown; attributes?: Record<string, unknown> }[]) {
      if (f && contains(f.geometry, pt)) return { river: clean(f.attributes?.gewaesser, 60), depth: clean(f.attributes?.txt, 40) };
    }
  }
  return null;
}

/** Lève une erreur seulement si le géocodeur ne répond pas ; ensuite, chaque partie en panne vaut null */
export async function lookupAddress(label: string, f: typeof fetch, o: GeoOptions = {}): Promise<AddressDetails> {
  const ms = o.timeoutMs ?? GEO_TIMEOUT_MS;
  const outer = o.deadlineMs ? new AbortController() : null;
  const deadline = outer ? setTimeout(() => outer.abort(), o.deadlineMs) : undefined;
  const get = (url: string) => getJson(f, url, ms, outer?.signal);
  const none: AddressDetails = { address: null, parcel: null, building: null, flood: null };
  try {
    // Géocodeur injoignable : erreur (le serveur dit « géoportail injoignable », pas « adresse inconnue »)
    const loc = parseGeocode(await get(URLS.geocode(label)));
    if (!loc) return none;
    // Adresse approximative (rue ou localité seulement) : le point ne tombe pas sur le bien, on ne cherche rien de plus
    if (!loc.address.precise) return { ...none, address: loc.address };
    const [x, y] = loc.point;
    const pt = loc.point;

    const parcel = get(URLS.wfs('cp', 'cp:CP.CadastralParcel', [x - 2, y - 2, x + 2, y + 2], 10)).then((fc) => pickParcel(fc, pt));
    const building = get(URLS.wfs('bu', 'bu:BU.Building', [x - 15, y - 15, x + 15, y + 15], 20)).then(async (fc) => {
      const main = pickBuilding(fc, pt);
      if (!main) return null;
      const footprintM2 = Math.round(area(main.geometry));
      try {
        const b = bbox(main.geometry)!;
        const around = await get(URLS.wfs('bu', 'bu:BU.Building', [b[0] - 1.5, b[1] - 1.5, b[2] + 1.5, b[3] + 1.5], 20));
        return { footprintM2, ...adjacency(around, main) };
      } catch {
        return { footprintM2, adjacent: null, typeSuggere: null };
      }
    });
    const flood = Promise.all([get(URLS.flood(FLOOD_LAYERS.hq100, pt)), get(URLS.flood(FLOOD_LAYERS.hqext, pt))]).then(([a, b]) => ({
      hq100: parseFlood(a, pt),
      hqext: parseFlood(b, pt),
    }));

    const [p, bu, fl] = await Promise.allSettled([parcel, building, flood]);
    return {
      address: loc.address,
      parcel: p.status === 'fulfilled' ? p.value : null,
      building: bu.status === 'fulfilled' ? bu.value : null,
      // Une seule des deux cartes lue : on ne peut pas dire « hors zone », donc rien
      flood: fl.status === 'fulfilled' ? fl.value : null,
    };
  } finally {
    clearTimeout(deadline);
  }
}

/* ---------- Points d'entrée ---------- */

const ip = (request: Request) => request.headers.get('cf-connecting-ip') ?? 'unknown';
const geoFetchOf = (d: Deps) => d.geoFetch ?? d.fetch;

export async function handleAddressSuggest(request: Request, _env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };
  const r = await readJson(request, 1000);
  if ('error' in r) return r.error;
  const raw = (r.body as { q?: unknown } | null)?.q;
  const q = typeof raw === 'string' ? raw.trim() : '';
  if (q.length < 3 || q.length > 120 || /[\u0000-\u001f\u007f]/.test(q)) return json({ ok: false, error: 'validation' }, 400);
  if (!(await allowSubmission(ip(request), SUGGEST_PER_HOUR, undefined, 'adresse-suggest'))) return json({ ok: false, error: 'rate_limit' }, 429);
  return json(await suggestAddresses(q, geoFetchOf(d)));
}

/** Libellé d'adresse accepté : texte, 3 à 160 caractères, sans caractère de contrôle */
export function validLabel(v: unknown): string | null {
  if (typeof v !== 'string' || /[\u0000-\u001f\u007f]/.test(v)) return null;
  const s = v.trim();
  return s.length >= 3 && s.length <= LABEL_MAX ? s : null;
}

export async function handleAddressDetails(request: Request, _env: Env, deps: Partial<Deps> = {}): Promise<Response> {
  const d = { ...defaultDeps(), ...deps };
  const r = await readJson(request, 1000);
  if ('error' in r) return r.error;
  const label = validLabel((r.body as { label?: unknown } | null)?.label);
  if (!label) return json({ ok: false, error: 'validation' }, 400);
  if (!(await allowSubmission(ip(request), DETAILS_PER_HOUR, undefined, 'adresse-details'))) return json({ ok: false, error: 'rate_limit' }, 429);
  const none: AddressDetails = { address: null, parcel: null, building: null, flood: null };
  return json(await lookupAddress(label, geoFetchOf(d), { deadlineMs: 9000 }).catch(() => none));
}
