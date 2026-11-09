/**
 * Met à jour data/communes.json à partir des derniers fichiers de
 * l'Observatoire de l'Habitat publiés sur data.public.lu (licence CC0).
 *
 * Usage : npm run update-data
 *
 * Le script s'arrête avec un message clair si un fichier n'a pas le format
 * attendu (colonnes, nombre de communes, noms inconnus). Dans ce cas, ne pas
 * forcer : vérifier le fichier à la main.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://data.public.lu/api/1/datasets/';
const CACHE = join(ROOT, '.data-cache');

type Source = {
  key: 'notarie' | 'annonce_appartement' | 'annonce_maison' | 'loyer_appartement';
  dataset: string;
  /** mots qui doivent apparaître dans le titre de la ressource */
  match: RegExp;
};

const SOURCES: Source[] = [
  { key: 'notarie', dataset: 'prix-de-vente-des-appartements-par-commune', match: /12 derniers mois/i },
  { key: 'annonce_appartement', dataset: 'prix-annonces-des-logements-par-commune', match: /vente d'appartements.*12 derniers mois/i },
  { key: 'annonce_maison', dataset: 'prix-annonces-des-logements-par-commune', match: /vente de maisons.*12 derniers mois/i },
  { key: 'loyer_appartement', dataset: 'loyers-annonces-des-logements-par-commune', match: /loyers annoncés des appartements.*12 derniers mois/i },
];

/** Variantes d'écriture rencontrées dans les fichiers → nom officiel utilisé dans l'outil */
const ALIASES: Record<string, string> = {
  'luxembourg-ville': 'Luxembourg',
  erpeldange: 'Erpeldange-sur-Sûre',
  redange: 'Redange-sur-Attert',
};

class FormatError extends Error {}

function fail(msg: string): never {
  throw new FormatError(msg);
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCantons(): Map<string, { name: string; canton: string }> {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data/cantons.json'), 'utf8')) as Record<string, unknown>;
  const map = new Map<string, { name: string; canton: string }>();
  for (const [canton, list] of Object.entries(raw)) {
    if (canton.startsWith('_')) continue;
    for (const name of list as string[]) map.set(norm(name), { name, canton });
  }
  if (map.size !== 100) fail(`data/cantons.json contient ${map.size} communes au lieu de 100.`);
  return map;
}

function resolveName(raw: string, cantons: Map<string, { name: string; canton: string }>) {
  const n = norm(raw);
  const aliased = ALIASES[n] ? norm(ALIASES[n]) : n;
  return cantons.get(aliased);
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return res.json();
}

async function download(url: string, file: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(join(CACHE, file), buf);
  return buf;
}

type Rows = (string | number | null)[][];

function sheetRows(buf: Buffer): Rows {
  const wb = XLSX.read(buf, { type: 'buffer' });
  if (wb.SheetNames.length < 1) fail('classeur vide');
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null }) as Rows;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v === '*' || v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  fail(`valeur inattendue : ${JSON.stringify(v)}`);
}

function round(v: number | null, d = 2): number | null {
  return v === null ? null : Math.round(v * 10 ** d) / 10 ** d;
}

/** Extrait le texte de période du titre (ex. « 1er juillet 2025 – 30 juin 2026 ») */
function period(rows: Rows): string {
  const title = String(rows[0]?.[0] ?? '');
  const m = title.match(/(1er\s+\p{L}+\s+\d{4}).*?(\d{1,2}\s+\p{L}+\s+\d{4})/u);
  if (!m) fail(`période introuvable dans le titre : « ${title} »`);
  return `${m[1].toLowerCase()} – ${m[2].toLowerCase()}`;
}

function headerIndex(rows: Rows): number {
  const i = rows.findIndex((r) => String(r[0] ?? '').trim() === 'Commune');
  if (i < 0) fail('ligne d’en-tête « Commune » introuvable');
  return i;
}

function communeRows(rows: Rows, start: number): Rows {
  const out: Rows = [];
  for (const r of rows.slice(start + 1)) {
    if (r[0] === null || String(r[0]).trim() === '') break;
    out.push(r);
  }
  return out;
}

function expectHeader(cells: (string | number | null)[], expected: RegExp[], file: string) {
  expected.forEach((re, i) => {
    const c = String(cells[i] ?? '').replace(/\s+/g, ' ');
    if (!re.test(c)) fail(`${file} : colonne ${i + 1} = « ${c} », attendu ${re}`);
  });
}

async function main() {
  const cantons = loadCantons();
  const out: Record<string, any> = {};
  const meta: Record<string, any> = {};

  for (const src of SOURCES) {
    const ds = await fetchJson(API + src.dataset + '/');
    const res = (ds.resources as any[]).find((r) => src.match.test(r.title));
    if (!res) fail(`ressource « ${src.match} » introuvable dans ${src.dataset}`);
    if (ds.license !== 'cc-zero') fail(`licence inattendue pour ${src.dataset} : ${ds.license}`);
    console.log(`↓ ${res.title}\n  ${res.url}`);
    const rows = sheetRows(await download(res.url, `${src.key}.xls`));
    const h = headerIndex(rows);
    const header = rows[h];
    const list = communeRows(rows, h);
    if (list.length !== 100) fail(`${src.key} : ${list.length} communes trouvées au lieu de 100`);

    if (src.key === 'notarie') {
      expectHeader(header, [/^Commune$/, /Nombre de ventes/, /Prix moyen au m²/, /Fourchette/, /Nombre de VEFA/, /Prix moyen au m²/, /Fourchette/], src.key);
      const group = rows[h - 1].map((c) => String(c ?? ''));
      if (!/EXISTANTS/i.test(group[1]) || !/VEFA/i.test(group[4])) fail('notarie : groupes « existants » / « VEFA » introuvables');
    } else if (src.key === 'loyer_appartement') {
      expectHeader(header, [/^Commune$/, /Nombre d'offres/, /Loyer moyen annoncé/, /Loyer moyen annoncé au m²/], src.key);
    } else {
      expectHeader(header, [/^Commune$/, /Nombre d'offres/, /Prix moyen annoncé/, /Prix moyen annoncé au m²/], src.key);
    }

    for (const r of list) {
      const c = resolveName(String(r[0]), cantons);
      if (!c) fail(`${src.key} : commune inconnue « ${r[0]} » (à ajouter dans data/cantons.json ou dans ALIASES)`);
      const row = (out[c.name] ??= { commune: c.name, canton: c.canton });
      if (src.key === 'notarie') {
        row.notarie_existant_ventes = num(r[1]);
        row.notarie_existant_m2 = round(num(r[2]));
        row.notarie_vefa_ventes = num(r[4]);
        row.notarie_vefa_m2 = round(num(r[5]));
      } else {
        row[`${src.key}_offres`] = num(r[1]);
        row[`${src.key}_m2`] = round(num(r[3]));
      }
    }

    meta[src.key] = {
      titre: res.title,
      jeu_de_donnees: ds.page ?? `https://data.public.lu/fr/datasets/${src.dataset}/`,
      fichier: res.url,
      mis_a_jour: res.last_modified,
      periode: period(rows),
      source: String(rows.find((r) => /^Source/i.test(String(r[0] ?? '')))?.[0] ?? '').replace(/^Source\s*:\s*/i, ''),
    };
  }

  const communes = Object.values(out).sort((a, b) => a.commune.localeCompare(b.commune, 'fr'));
  if (communes.length !== 100) fail(`${communes.length} communes au total au lieu de 100`);
  const houses = communes.filter((c) => c.annonce_maison_m2 !== null).length;
  if (houses === 0) fail('aucun prix annoncé pour les maisons : arrêt, à vérifier avec Jay');

  const periodeNotarie = meta.notarie.periode;
  for (const c of communes) {
    c.periode = periodeNotarie;
    c.source = 'Observatoire de l’Habitat (Ministère du Logement), data.public.lu, licence CC0';
  }

  const result = {
    genere_le: new Date().toISOString(),
    licence: 'CC0 (data.public.lu)',
    periode: periodeNotarie,
    sources: meta,
    communes,
  };
  writeFileSync(join(ROOT, 'data/communes.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`\n✔ data/communes.json : ${communes.length} communes, période ${periodeNotarie}`);
  console.log(`  ventes notariées publiées : ${communes.filter((c) => c.notarie_existant_m2 !== null).length} communes`);
  console.log(`  prix annoncés appartements : ${communes.filter((c) => c.annonce_appartement_m2 !== null).length} communes`);
  console.log(`  prix annoncés maisons : ${houses} communes`);
  console.log(`  loyers annoncés appartements : ${communes.filter((c) => c.loyer_appartement_m2 !== null).length} communes`);
}

main().catch((e) => {
  if (e instanceof FormatError) {
    console.error(`\n✖ FORMAT INATTENDU : ${e.message}\n  data/communes.json n'a PAS été modifié. Vérifier le fichier source avant d'aller plus loin.`);
  } else {
    console.error('\n✖ Erreur :', e.message ?? e);
  }
  process.exit(1);
});

