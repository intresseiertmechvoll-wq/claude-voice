/**
 * Parcours des visiteurs : combien atteignent chaque étape, combien envoient une demande, par canal et campagne.
 * Données : Workers Analytics Engine, jeu « estimation_funnel » (compteurs anonymes, voir src/shared/funnel.ts).
 *
 * Usage : CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run funnel -- 30
 *         (30 = nombre de jours, 7 par défaut ; le jeton a besoin du droit « Account Analytics : Read »)
 * Les chiffres sont des estimations de Cloudflare (échantillonnage possible à fort trafic) : SUM(_sample_interval).
 */
const days = Math.max(1, Math.min(90, Number(process.argv[2]) || 7));
const { CLOUDFLARE_ACCOUNT_ID: acc, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!acc || !token) {
  console.error('Il manque CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN (droit « Account Analytics : Read »).');
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acc}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: `${query} FORMAT JSON`,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Analytics Engine ${res.status} : ${text.slice(0, 300)}`);
  return JSON.parse(text).data;
}

const since = `timestamp > NOW() - INTERVAL '${days}' DAY`;
const ORDER = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'step-6', 'lead', 'lead-nodata', 'call', 'rdv', 'print', 'whatif'];
const LABELS = {
  'step-1': 'Étape 1 affichée (visites)', 'step-2': 'Étape 2', 'step-3': 'Étape 3', 'step-4': 'Étape 4', 'step-5': 'Étape 5',
  'step-6': 'Étape 6 (coordonnées)', lead: 'Demande envoyée, avec prix', 'lead-nodata': 'Demande envoyée, sans prix (peu de données)',
  call: 'Clic « Appeler »', rdv: 'Clic « Estimation sur place »', print: 'Impression / PDF', whatif: 'Simulateur utilisé',
};
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '–');

const byEvent = Object.fromEntries((await sql(`SELECT blob1 AS e, SUM(_sample_interval) AS n FROM estimation_funnel WHERE ${since} GROUP BY e`)).map((r) => [r.e, Number(r.n)]));
const visits = byEvent['step-1'] ?? 0;
console.log(`\nParcours sur ${days} jour(s)\n`);
let prev = visits;
for (const e of ORDER) {
  const n = byEvent[e] ?? 0;
  const step = e.startsWith('step-') && e !== 'step-1' ? ` · ${pct(n, prev)} de l'étape précédente` : '';
  console.log(`${LABELS[e].padEnd(46)} ${String(n).padStart(6)}   ${pct(n, visits).padStart(5)} des visites${step}`);
  if (e.startsWith('step-')) prev = n;
}

const rows = await sql(`SELECT blob3 AS canal, blob4 AS campagne, blob1 AS e, SUM(_sample_interval) AS n FROM estimation_funnel WHERE ${since} AND blob1 IN ('step-1', 'step-6', 'lead', 'lead-nodata') GROUP BY canal, campagne, e`);
const camp = {};
for (const r of rows) (camp[`${r.canal} · ${r.campagne}`] ??= {})[r.e] = Number(r.n);
console.log('\nPar canal et campagne : visites → étape 6 → demandes (taux visite → demande)\n');
for (const [k, v] of Object.entries(camp).sort((a, b) => (b[1]['step-1'] ?? 0) - (a[1]['step-1'] ?? 0))) {
  const leads = (v.lead ?? 0) + (v['lead-nodata'] ?? 0);
  console.log(`${k.padEnd(46)} ${String(v['step-1'] ?? 0).padStart(5)} → ${String(v['step-6'] ?? 0).padStart(4)} → ${String(leads).padStart(4)}   (${pct(leads, v['step-1'] ?? 0)})`);
}

const leads = await sql(`SELECT blob6 AS type, blob7 AS commune, SUM(_sample_interval) AS n FROM estimation_funnel WHERE ${since} AND blob1 IN ('lead', 'lead-nodata') GROUP BY type, commune ORDER BY n DESC LIMIT 20`);
if (leads.length) {
  console.log('\nDemandes par commune et type (20 premières)\n');
  for (const r of leads) console.log(`${`${r.commune} · ${r.type}`.padEnd(46)} ${String(r.n).padStart(5)}`);
}
console.log('');
