/**
 * Met à jour data/loyers.json à partir des fichiers de l'Observatoire de l'Habitat
 * publiés sur data.public.lu (licence CC0) :
 *   - nombre d'annonces de location par commune (appartements, maisons), 12 derniers mois ;
 *   - indice trimestriel des loyers annoncés d'appartements (mise à jour des niveaux).
 *
 * Les valeurs tirées de rapports (cadastre des loyers, relevé d'annonces) sont dans
 * data/references.json et se mettent à jour à la main (voir README).
 *
 * Usage : npm run update-data
 * Le script s'arrête avec un message clair si un fichier n'a pas le format attendu.
 * Dans ce cas, ne pas forcer : vérifier le fichier à la main.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import refs from '../data/references.json';
import params from '../params.json';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://data.public.lu/api/1/datasets/';
const CACHE = join(ROOT, '.data-cache');

class FormatError extends Error {}
function fail(msg: string): never {
  throw new FormatError(msg);
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Variantes d'écriture rencontrées dans les fichiers → nom officiel utilisé dans l'outil */
const ALIASES: Record<string, string> = {
  'luxembourg-ville': 'Luxembourg',
  erpeldange: 'Erpeldange-sur-Sûre',
  redange: 'Redange-sur-Attert',
  petange: 'Pétange',
  kaerjeng: 'Käerjeng',
};

type Rows = (string | number | null)[][];

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
  return cantons.get(ALIASES[n] ? norm(ALIASES[n]) : n);
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

function sheetRows(buf: Buffer): Rows {
  const wb = XLSX.read(buf, { type: 'buffer' });
  if (wb.SheetNames.length < 1) fail('classeur vide');
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, blankrows: true }) as Rows;
}

const cell = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v === '*' || v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  fail(`valeur inattendue : ${JSON.stringify(v)}`);
}

/** Trouve la cellule « Commune » ; renvoie la ligne et la colonne */
function findHeader(rows: Rows, text: RegExp): { row: number; col: number } {
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].findIndex((v) => text.test(cell(v)));
    if (c >= 0) return { row: r, col: c };
  }
  fail(`en-tête ${text} introuvable`);
}

/** Période du titre : « … entre le 1er juillet 2025 et le 30 juin 2026 » */
function period(rows: Rows): { texte: string; debut: string; fin: string } {
  const title = rows.map((r) => r.map(cell).join(' ')).find((l) => /entre le/i.test(l)) ?? '';
  const m = title.match(/(1er\s+\p{L}+\s+\d{4}).*?(\d{1,2}\s+\p{L}+\s+\d{4})/u);
  if (!m) fail(`période introuvable dans le titre : « ${title} »`);
  return { texte: `${m[1].toLowerCase()} – ${m[2].toLowerCase()}`, debut: isoDate(m[1]), fin: isoDate(m[2]) };
}

const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
function isoDate(text: string): string {
  const m = norm(text).match(/^(\d{1,2})(?:er)?\s+(\p{L}+)\s+(\d{4})$/u);
  const month = m ? MOIS.indexOf(m[2]) + 1 : 0;
  if (!m || month === 0) fail(`date illisible : « ${text} »`);
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

type Offres = { offres: Map<string, number>; nationalMoyen: number | null; nationalM2: number | null; total: number | null; periode: ReturnType<typeof period> };

/** Fichier « loyers annoncés … par commune » : nombre d'offres de chaque commune listée */
function parseOffres(rows: Rows, key: string, cantons: Map<string, { name: string; canton: string }>, expectAll: boolean): Offres {
  const h = findHeader(rows, /^Commune$/);
  const header = rows[h.row].slice(h.col).map(cell);
  if (!/Nombre d'offres/i.test(header[1] ?? '') || !/Loyer moyen annonc/i.test(header[2] ?? '') || !/au m²/i.test(header[3] ?? '')) {
    fail(`${key} : colonnes inattendues ${JSON.stringify(header.slice(0, 4))}`);
  }
  const offres = new Map<string, number>();
  let r = h.row + 1;
  for (; r < rows.length; r++) {
    const name = cell(rows[r][h.col]);
    if (!name) break;
    const c = resolveName(name, cantons);
    if (!c) fail(`${key} : commune inconnue « ${name} » (à ajouter dans data/cantons.json ou dans ALIASES)`);
    const n = num(rows[r][h.col + 1]);
    if (n === null || n < 0) fail(`${key} : nombre d'offres illisible pour ${name}`);
    offres.set(c.name, n);
  }
  if (expectAll && offres.size !== 100) fail(`${key} : ${offres.size} communes au lieu de 100`);
  if (offres.size === 0) fail(`${key} : aucune commune`);
  let nationalMoyen: number | null = null;
  let nationalM2: number | null = null;
  let total: number | null = null;
  for (; r < rows.length; r++) {
    const label = cell(rows[r][h.col]);
    if (/^Moyenne nationale/i.test(label)) {
      nationalMoyen = num(rows[r][h.col + 2]);
      nationalM2 = num(rows[r][h.col + 3]);
    }
    if (/^Total d'offres/i.test(label)) total = num(rows[r][h.col + 1]);
  }
  return { offres, nationalMoyen, nationalM2, total, periode: period(rows) };
}

/** Série trimestrielle « Location d'appartement » (base 100 = T1 2005) */
function parseIndice(rows: Rows): Record<string, number> {
  const h = findHeader(rows, /^Location d'appartement$/i);
  const yearCol = rows[h.row].findIndex((v) => /^Ann[ée]e$/i.test(cell(v)));
  const qCol = rows[h.row].findIndex((v) => /^Trimestre$/i.test(cell(v)));
  if (yearCol < 0 || qCol < 0) fail('indice : colonnes « Année » / « Trimestre » introuvables');
  const out: Record<string, number> = {};
  let year = 0;
  for (let r = h.row + 1; r < rows.length; r++) {
    const y = cell(rows[r][yearCol]);
    if (/^\d{4}$/.test(y)) year = Number(y);
    const q = cell(rows[r][qCol]);
    const v = rows[r][h.col];
    if (!year || !/^T[1-4]$/.test(q) || v === null || v === '') continue;
    const n = num(v);
    if (n === null || n < 50 || n > 1000) fail(`indice : valeur hors limites ${year}${q} = ${v}`);
    out[`${year}${q}`] = n;
  }
  if (!out['2005T1'] || Math.abs(out['2005T1'] - 100) > 0.01) fail('indice : la base 100 au T1 2005 est introuvable');
  return out;
}

async function resource(dataset: string, match: RegExp) {
  const ds = await fetchJson(API + dataset + '/');
  if (ds.license !== 'cc-zero') fail(`licence inattendue pour ${dataset} : ${ds.license}`);
  const res = (ds.resources as any[]).find((r) => match.test(r.title));
  if (!res) fail(`ressource ${match} introuvable dans ${dataset}`);
  console.log(`↓ ${res.title}\n  ${res.url}`);
  return { ds, res };
}

async function main() {
  const cantons = loadCantons();
  const zones = refs.zones;

  const app = await resource('loyers-annonces-des-logements-par-commune', /loyers annoncés des appartements par commune sur les 12 derniers mois/i);
  const mai = await resource('loyers-annonces-des-logements-par-commune', /loyers annoncés des maisons par commune sur les 12 derniers mois/i);
  const ind = await resource('loyers-annonces-des-logements', /EUROS COURANTS/);

  const offresApp = parseOffres(sheetRows(await download(app.res.url, 'location-appartement.xls')), 'appartements', cantons, true);
  const offresMai = parseOffres(sheetRows(await download(mai.res.url, 'location-maison.xls')), 'maisons', cantons, false);
  const indice = parseIndice(sheetRows(await download(ind.res.url, 'indice.xls')));

  const base = refs.cadastre.indiceBase.trimestres.map((q) => indice[q] ?? fail(`indice : trimestre ${q} manquant`));
  const baseValeur = base.reduce((s, v) => s + v, 0) / base.length;
  const dernierQ = Object.keys(indice).sort().at(-1)!;
  const releveQ = refs.maisons.indiceAuReleve;
  if (!indice[releveQ]) fail(`indice : trimestre du relevé de maisons ${releveQ} manquant`);
  const facteur = indice[dernierQ] / baseValeur;
  if (facteur < 0.8 || facteur > 1.5) fail(`facteur d'indice inattendu : ${facteur.toFixed(3)} (à vérifier)`);

  const communes = [...cantons.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map((c) => ({
      commune: c.name,
      canton: c.canton,
      zone: c.name === zones.communeVille ? 'LV' : (zones.parCanton as Record<string, string>)[c.canton] ?? fail(`zone inconnue pour le canton ${c.canton}`),
      offres_appartement: offresApp.offres.get(c.name) ?? fail(`offres manquantes pour ${c.name}`),
      offres_maison: offresMai.offres.get(c.name) ?? null,
    }));

  const out = {
    genere_le: new Date().toISOString(),
    licence: 'CC0 (data.public.lu)',
    annonces: {
      periode: offresApp.periode.texte,
      periode_debut: offresApp.periode.debut,
      periode_fin: offresApp.periode.fin,
      total_appartements: offresApp.total,
      total_maisons: offresMai.total,
      maison_loyer_moyen_national: offresMai.nationalMoyen,
      maison_loyer_m2_national: offresMai.nationalM2,
    },
    indice: {
      serie: 'Loyers annoncés d’appartements, euros courants, base 100 = T1 2005',
      base_trimestres: refs.cadastre.indiceBase.trimestres,
      base_valeur: Math.round(baseValeur * 1000) / 1000,
      dernier_trimestre: dernierQ,
      dernier_valeur: indice[dernierQ],
      releve_maisons_trimestre: releveQ,
      releve_maisons_valeur: indice[releveQ],
    },
    sources: {
      offres_appartements: { titre: app.res.title, jeu_de_donnees: app.ds.page, fichier: app.res.url, mis_a_jour: app.res.last_modified },
      offres_maisons: { titre: mai.res.title, jeu_de_donnees: mai.ds.page, fichier: mai.res.url, mis_a_jour: mai.res.last_modified },
      indice: { titre: ind.res.title, jeu_de_donnees: ind.ds.page, fichier: ind.res.url, mis_a_jour: ind.res.last_modified },
    },
    communes,
  };
  writeFileSync(join(ROOT, 'data/loyers.json'), JSON.stringify(out, null, 2) + '\n');

  // Communes où l'outil prévient le visiteur dès l'étape 1 (noms seulement, aucun prix)
  const peu = {
    _note: 'Généré par scripts/update-data.ts. appartement : moins de 30 annonces de location sur 12 mois (le calcul s’appuie sur le canton) ; maison : zone avec peu d’annonces de maisons dans le relevé.',
    appartement: communes.filter((c) => c.offres_appartement < 30).map((c) => c.commune),
    maison: communes.filter((c) => (refs.maisons.annonces as Record<string, number>)[c.zone] < params.fiabilite.maison_annonces_min_zone).map((c) => c.commune),
  };
  writeFileSync(join(ROOT, 'data/peu-de-donnees.json'), JSON.stringify(peu, null, 2) + '\n');
  console.log(`\n✔ data/loyers.json : ${communes.length} communes, annonces ${out.annonces.periode}`);
  console.log(`  indice : base 2024-2025 = ${out.indice.base_valeur}, ${dernierQ} = ${indice[dernierQ]} → facteur ${facteur.toFixed(4)}`);
  console.log(`  communes avec au moins 30 annonces d'appartements : ${communes.filter((c) => c.offres_appartement >= 30).length}`);
}

main().catch((e) => {
  if (e instanceof FormatError) {
    console.error(`\n✖ FORMAT INATTENDU : ${e.message}\n  data/loyers.json n'a PAS été modifié. Vérifier le fichier source avant d'aller plus loin.`);
  } else {
    console.error('\n✖ Erreur :', e.message ?? e);
  }
  process.exit(1);
});
