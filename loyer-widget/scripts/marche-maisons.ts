/**
 * Suivi mensuel des maisons à louer : import d'un relevé, base, comparaison par commune, rapport.
 *
 *   npm run marche -- import --date 2026-12-17 --athome chemin/athome.csv --wortimmo chemin/wortimmo.csv
 *   npm run marche -- rapport            (recalcule le rapport, par ex. après ajout d'une localité)
 *
 * Format CSV attendu (une ligne par annonce, tous pays) :
 *   source,page,rent_eur,surface_m2,bedrooms,type,locality,country,url,flag
 * (les colonnes page, type et flag peuvent manquer ; procédure complète : docs/marche/PROCEDURE.md)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import data from '../data/loyers.json';
import refs from '../data/references.json';
import params from '../params.json';
import type { Params } from '../src/shared/engine';
import type { Dataset, References } from '../src/shared/types';
import { baseVide, communeDe, comparerCommunes, importerReleve, rapport, type AnnonceReleve, type Base, type Releve } from '../src/marche/maisons';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, 'data/marche/maisons.json');
const COMMUNES = join(ROOT, 'data/marche/communes-maisons.json');

function csv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const entier = (v: string | undefined) => {
  const s = (v ?? '').replace(/[^\d,.]/g, '').replace(',', '.');
  if (!s) return null;
  const n = Math.round(Number(s));
  return Number.isFinite(n) ? n : null;
};

function idDe(url: string, source: AnnonceReleve['source']): string | null {
  const m = source === 'athome' ? url.match(/id-(\d+)\.html/) : url.match(/id_(\d+)/);
  return m ? m[1] : null;
}

function lireAnnonces(fichier: string, source: AnnonceReleve['source']): { annonces: AnnonceReleve[]; lues: number; rejetees: string[] } {
  const lignes = csv(readFileSync(fichier, 'utf8'));
  const annonces: AnnonceReleve[] = [];
  const rejetees: string[] = [];
  for (const l of lignes) {
    const url = l.url ?? '';
    const id = idDe(url, source);
    const loyer = entier(l.rent_eur);
    if (!id || loyer === null) {
      rejetees.push(`${url || '(sans lien)'} : ${!id ? 'identifiant introuvable dans le lien' : 'loyer illisible'}`);
      continue;
    }
    const pays = (l.country || (/\((FR|BE|DE)\)/i.exec(l.locality ?? '')?.[1] ?? 'LU')).toUpperCase();
    annonces.push({ source, id, url, loyer, surface: entier(l.surface_m2), chambres: entier(l.bedrooms), type: l.type ?? '', localite: l.locality ?? '', pays });
  }
  return { annonces, lues: lignes.length, rejetees };
}

function arg(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function chargerBase(): Base {
  return existsSync(BASE) ? (JSON.parse(readFileSync(BASE, 'utf8')) as Base) : baseVide();
}

function ecrireSorties(base: Base, inconnues: string[]) {
  const date = base.releves[base.releves.length - 1].date;
  const lignes = comparerCommunes(base, data as unknown as Dataset, refs as References, params as Params);
  mkdirSync(join(ROOT, 'data/marche'), { recursive: true });
  mkdirSync(join(ROOT, 'docs/marche'), { recursive: true });
  writeFileSync(BASE, JSON.stringify(base, null, 1) + '\n');
  writeFileSync(COMMUNES, JSON.stringify({ _note: 'Généré par scripts/marche-maisons.ts : comparaison par commune, dernier relevé.', date, communes: lignes }, null, 1) + '\n');
  const fichier = join(ROOT, `docs/marche/rapport-maisons-${date}.md`);
  writeFileSync(fichier, rapport(base, lignes, inconnues, date));
  const avecEcart = lignes.filter((l) => l.ecart !== null);
  console.log(`✔ ${fichier.replace(ROOT + '/', '')}`);
  console.log(`  ${lignes.length} communes avec au moins une maison, ${avecEcart.length} avec assez de données pour un écart`);
  for (const l of avecEcart) console.log(`  ${l.commune.padEnd(20)} ${l.verdict}`);
}

const cmd = process.argv[2];
if (cmd === 'import') {
  const date = arg('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date AAAA-MM-JJ obligatoire');
  const releve: Releve = { date, lues: {}, annonces: [] };
  const rejets: string[] = [];
  for (const source of ['athome', 'wortimmo'] as const) {
    const f = arg(source);
    if (!f) continue;
    const r = lireAnnonces(f, source);
    releve.lues[source] = r.lues;
    releve.annonces.push(...r.annonces);
    rejets.push(...r.rejetees);
  }
  if (!releve.annonces.length) throw new Error('aucune annonce lue : vérifier les fichiers --athome / --wortimmo');
  const base = chargerBase();
  const { inconnues, avertissements } = importerReleve(base, releve);
  mkdirSync(join(ROOT, 'data/marche/releves'), { recursive: true });
  // Copie du relevé (annonces du Luxembourg seulement), pour pouvoir tout reconstruire
  writeFileSync(join(ROOT, `data/marche/releves/${date}.json`), JSON.stringify({ ...releve, annonces: releve.annonces.filter((a) => a.pays === 'LU') }, null, 1) + '\n');
  for (const a of avertissements) console.warn(`⚠ ${a}`);
  if (rejets.length) console.warn(`⚠ ${rejets.length} ligne(s) ignorée(s) :\n  ${rejets.slice(0, 10).join('\n  ')}`);
  if (inconnues.length) console.warn(`⚠ localités inconnues (à ajouter dans src/shared/aliases.ts, puis npm run marche -- rapport) : ${inconnues.join(', ')}`);
  ecrireSorties(base, inconnues);
} else if (cmd === 'rapport') {
  const base = chargerBase();
  if (!base.releves.length) throw new Error('base vide : importer d’abord un relevé');
  const inconnues = new Set<string>();
  for (const f of Object.values(base.fiches)) {
    f.commune = communeDe(f.localite);
    if (!f.commune) inconnues.add(f.localite);
  }
  ecrireSorties(base, [...inconnues].sort());
} else {
  console.log('Usage : npm run marche -- import --date AAAA-MM-JJ --athome fichier.csv [--wortimmo fichier.csv]\n        npm run marche -- rapport');
  process.exit(1);
}
