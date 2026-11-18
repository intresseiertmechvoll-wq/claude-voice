/**
 * Suivi mensuel des maisons à louer : import d'un relevé, base, comparaison par commune, rapport.
 *
 *   npm run marche -- import --date 2026-12-17 --athome chemin/athome.csv --wortimmo chemin/wortimmo.csv
 *   npm run marche -- rapport            (recalcule le rapport, par ex. après ajout d'une localité)
 *   npm run marche -- immotop --out immotop.csv page1.json page2.json …
 *       (lit les pages immotop enregistrées par Firecrawl en « rawHtml », ou des fichiers .html,
 *        et écrit le CSV ; les données sont lues dans la page, sans interprétation par une IA)
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
import { extraireImmotop } from '../src/marche/immotop';
import { baseVide, communeDe, comparer, importerReleve, rapport, type AnnonceReleve, type Base, type Releve } from '../src/marche/maisons';

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
  const m = source === 'athome' ? url.match(/id-(\d+)\.html/) : source === 'immotop' ? url.match(/annonces\/(\d+)/) : url.match(/id_(\d+)/);
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
  const comp = comparer(base, data as unknown as Dataset, refs as References, params as Params);
  mkdirSync(join(ROOT, 'data/marche'), { recursive: true });
  mkdirSync(join(ROOT, 'docs/marche'), { recursive: true });
  writeFileSync(BASE, JSON.stringify(base, null, 1) + '\n');
  writeFileSync(COMMUNES, JSON.stringify({ _note: 'Généré par scripts/marche-maisons.ts : comparaison par secteur, région et commune, dernier relevé.', date, ...comp }, null, 1) + '\n');
  const fichier = join(ROOT, `docs/marche/rapport-maisons-${date}.md`);
  writeFileSync(fichier, rapport(base, comp, inconnues, date));
  console.log(`✔ ${fichier.replace(ROOT + '/', '')}`);
  console.log(`  ${comp.objetsTotal} maisons différentes (${comp.doublons} doublons entre portails retirés), ${comp.communes.length} communes`);
  for (const g of comp.secteurs) console.log(`  ${g.nom.padEnd(34)} ${String(g.objets).padStart(3)} maisons${g.objets < 10 ? '  (moins de 10)' : ''}`);
}

const cmd = process.argv[2];
if (cmd === 'import') {
  const date = arg('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date AAAA-MM-JJ obligatoire');
  const releve: Releve = { date, lues: {}, annonces: [] };
  const rejets: string[] = [];
  for (const source of ['athome', 'immotop', 'wortimmo'] as const) {
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
} else if (cmd === 'immotop') {
  const out = arg('out');
  const fichiers = process.argv.slice(3).filter((f: string, i: number, all: string[]) => f !== '--out' && all[i - 1] !== '--out');
  if (!out || !fichiers.length) throw new Error('usage : npm run marche -- immotop --out immotop.csv page1.json [page2.json …]');
  const lignes: string[] = ['source,page,rent_eur,surface_m2,bedrooms,type,locality,country,url,flag'];
  const vus = new Set<string>();
  const esc = (v: unknown) => {
    const t = String(v ?? '');
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  for (const f of fichiers) {
    const brut = readFileSync(f, 'utf8');
    let html = brut;
    try {
      const j = JSON.parse(brut);
      html = j.rawHtml ?? j.html ?? brut;
    } catch {
      /* fichier .html */
    }
    const page = extraireImmotop(html);
    console.log(`${f} : ${page.annonces.length} annonces (page ${page.page} sur ${page.pages}, ${page.total} au total)${page.pages > page.page ? '  ⚠ il reste des pages : ajouter ?pag=N' : ''}`);
    for (const a of page.annonces) {
      if (vus.has(a.url)) continue;
      vus.add(a.url);
      lignes.push(['immotop', page.page, a.loyer, a.surface ?? '', a.chambres ?? '', a.type, a.localite, a.pays, a.url, ''].map(esc).join(','));
    }
  }
  writeFileSync(out, lignes.join('\n') + '\n');
  console.log(`✔ ${out} : ${lignes.length - 1} annonces`);
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
