/**
 * Met à jour la valeur de SECOURS des taux dans params.json (l'outil lit les taux en direct ;
 * cette valeur ne sert que si la BCE ne répond pas). Mêmes contrôles que l'outil.
 *
 * Usage : npm run update-taux   (derrière un proxy : NODE_USE_ENV_PROXY=1 npm run update-taux)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTaux, ECB_URL, parseEcbCsv } from '../src/shared/taux';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(ROOT, 'params.json');

const res = await fetch(ECB_URL, { headers: { accept: 'text/csv' } });
if (!res.ok) throw new Error(`BCE : réponse ${res.status}`);
const parsed = parseEcbCsv(await res.text());
const checked = checkTaux(parsed ? { ...parsed, origine: "bce" } : null, new Date());
if (!checked) {
  console.error('✖ Taux illisibles, non plausibles ou trop anciens :', parsed, '\n  params.json n’a PAS été modifié.');
  process.exit(1);
}
const t = checked!; // vérifié juste au-dessus (process.exit)
const params = JSON.parse(readFileSync(file, 'utf8'));
const old = params.taux;
// Un saut de plus d'un point en un mois est suspect : on s'arrête pour vérifier à la main
if (Math.abs(t.variable - old.variable) > 1 || Math.abs(t.fixe - old.fixe) > 1) {
  console.error(`✖ Écart suspect : ${old.variable} → ${t.variable} / ${old.fixe} → ${t.fixe}. Vérifier sur bcl.lu avant de forcer.`);
  process.exit(1);
}
params.taux = { ...old, variable: t.variable, fixe: t.fixe, mois: t.mois };
writeFileSync(file, JSON.stringify(params, null, 2) + '\n');
console.log(`✔ Taux de secours : ${t.mois}, variable ${t.variable} %, fixe +10 ans ${t.fixe} % (avant : ${old.mois}, ${old.variable} %, ${old.fixe} %)`);
