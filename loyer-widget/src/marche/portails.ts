/**
 * Lecture des pages de résultats atHome et wortimmo, sans interprétation par une IA :
 * les annonces sont lues dans la page elle-même.
 *
 * - atHome : données de la page (window.__INITIAL_STATE__ → search.listings), 20 annonces par page.
 * - wortimmo : fiches de la liste (HTML), 15 annonces par page.
 *
 * On ne garde que : loyer, surface, chambres, type, localité, pays, lien, date de mise en ligne
 * (atHome seulement). Jamais le nom de l'agence ou de l'agent, ni les photos, ni les descriptions.
 */
import type { AnnonceImmotop } from './immotop';

export interface AnnoncePortail extends AnnonceImmotop {
  /** date de mise en ligne annoncée par le portail (AAAA-MM-JJ), si elle existe */
  publiee_le?: string | null;
}

export interface PagePortail {
  annonces: AnnoncePortail[];
  page: number;
  pages: number;
  total: number;
  /** lien de la page suivante (wortimmo) */
  suivante?: string | null;
}

const PAYS: Record<string, string> = {
  luxembourg: 'LU',
  france: 'FR',
  belgique: 'BE',
  belgium: 'BE',
  allemagne: 'DE',
  deutschland: 'DE',
  germany: 'DE',
};

const entier = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  const m = String(v ?? '').replace(/[\s  .]/g, '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  const n = m ? Math.round(Number(m[0])) : null;
  return n && n > 0 ? n : null;
};

/* ---------- atHome ---------- */

export function extraireAthome(html: string): PagePortail {
  const debut = html.search(/window\.__INITIAL_STATE__\s*=\s*/);
  if (debut < 0) throw new Error('atHome : données de la page (__INITIAL_STATE__) introuvables ; la page a peut-être changé de format');
  let brut = html.slice(debut).replace(/^window\.__INITIAL_STATE__\s*=\s*/, '');
  brut = brut.slice(0, brut.indexOf('</script>')).trim().replace(/;$/, '');
  // Objet JavaScript : « undefined » n'existe pas en JSON
  brut = brut.replace(/([:\[,])undefined(?=[,\]}])/g, '$1null');
  let etat: any;
  try {
    etat = JSON.parse(brut);
  } catch {
    throw new Error('atHome : données de la page illisibles ; la page a peut-être changé de format');
  }
  const s = etat?.search;
  if (!Array.isArray(s?.listings)) throw new Error('atHome : liste des annonces introuvable dans la page ; la page a peut-être changé de format');
  const annonces: AnnoncePortail[] = [];
  for (const l of s.listings as any[]) {
    const loyer = entier(l?.price);
    const lien = l?.permalink?.fr;
    if (l?.transaction !== 'rent' || l?.isPriceOnDemand || loyer === null || !lien) continue;
    const c = l.characteristic ?? {};
    const pays = String(l.address?.country ?? '').trim().toLowerCase();
    const cree = /^(\d{4})(\d{2})(\d{2})/.exec(String(l.createdAt ?? ''));
    annonces.push({
      loyer,
      surface: entier(c.surface),
      chambres: entier(c.bedrooms),
      type: String(l.typeKey ?? l.type ?? ''),
      localite: String(l.address?.city ?? ''),
      // Pays absent : inconnu (« ?? »), donc exclu des statistiques du Luxembourg
      pays: PAYS[pays] ?? (pays ? pays.slice(0, 2).toUpperCase() : '??'),
      url: `https://www.athome.lu${lien}`,
      publiee_le: cree ? `${cree[1]}-${cree[2]}-${cree[3]}` : null,
    });
  }
  const parPage = Number(s.paginator?.articlesForPage ?? 20);
  const total = Number(s.total ?? annonces.length);
  return {
    annonces,
    page: Number(s.queryFilters?.page ?? 1),
    pages: Number(s.paginator?.totalPages ?? Math.ceil(total / parPage)),
    total,
  };
}

/* ---------- wortimmo ---------- */

const REGIONS_LU = new Set(['centre', 'sud', 'nord', 'est', 'ouest']);
const REGIONS_ETRANGER: Record<string, string> = {
  saarland: 'DE',
  'rheinland-pfalz': 'DE',
  lorraine: 'FR',
  'grand-est': 'FR',
  moselle: 'FR',
  wallonie: 'BE',
  'province-de-luxembourg': 'BE',
};

function paysWortimmo(lien: string): string {
  const chemin = lien.replace(/^.*\/fr\/location-/, '');
  for (const r of REGIONS_LU) if (chemin.includes(`-${r}-`)) return 'LU';
  for (const [r, p] of Object.entries(REGIONS_ETRANGER)) if (chemin.includes(`-${r}-`)) return p;
  return '??';
}

const texte = (h: string) =>
  h
    .replace(/<[^>]+>/g, ' ')
    .replace(/&agrave;/g, 'à')
    .replace(/&eacute;/g, 'é')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export function extraireWortimmo(html: string, page = 1): PagePortail {
  const fiches = html.split(/<div class="hidden-xs clearfix show" id="obj_\d+_content">/).slice(1);
  const annonces: AnnoncePortail[] = [];
  const vus = new Set<string>();
  for (const f of fiches) {
    const a = /<a href="(https:\/\/www\.wortimmo\.lu\/fr\/location-[^"]*-id_\d+)"[^>]*>([\s\S]*?)<\/a>/.exec(f);
    if (!a || vus.has(a[1])) continue;
    vus.add(a[1]);
    const titre = texte(a[2]);
    const prix = /price-property-box-8">([\s\S]*?)<\/div>/.exec(f);
    const loyer = prix && /€/.test(prix[1]) ? entier(texte(prix[1])) : null;
    if (loyer === null) continue; // « Prix sur demande »
    const surface = /serp-ads-d-i">\s*([\d.,\s]+)\s*m<sup>2/.exec(f);
    const chambres = /(\d+)\s*chambre/i.exec(titre);
    const t = /^(.*?)(?:\s+\d+\s*chambre\(s\))?\s+à louer à\s+(.+)$/i.exec(titre);
    annonces.push({
      loyer,
      surface: surface ? entier(surface[1]) : null,
      chambres: chambres ? Number(chambres[1]) : null,
      type: t ? t[1] : '',
      localite: t ? t[2] : '',
      pays: paysWortimmo(a[1]),
      url: a[1],
      publiee_le: null,
    });
  }
  if (!annonces.length && !/Aucun résultat|aucune annonce/i.test(html) && fiches.length === 0)
    throw new Error('wortimmo : aucune fiche trouvée dans la page ; la page a peut-être changé de format');
  const suivante = /<link rel="next" href="([^"]+)"/.exec(html)?.[1] ?? null;
  return { annonces, page, pages: suivante ? page + 1 : page, total: annonces.length, suivante };
}

/** Reconnaît le portail d'une page enregistrée. */
export function portailDe(html: string): 'athome' | 'immotop' | 'wortimmo' | null {
  if (/window\.__INITIAL_STATE__/.test(html) && /athome\.lu/.test(html)) return 'athome';
  if (/<script id="__NEXT_DATA__"/.test(html) && /immotop\.lu/.test(html)) return 'immotop';
  if (/wortimmo\.lu/.test(html) && /id="obj_\d+_content"/.test(html)) return 'wortimmo';
  return null;
}
