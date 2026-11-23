/**
 * Parcours des visiteurs (comptage anonyme, src/server/etapes.ts) : combien arrivent à chaque étape.
 *
 *   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run stats            (30 derniers jours)
 *   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run stats -- 7       (7 derniers jours)
 *
 * Jeton API : Cloudflare → My Profile → API Tokens → Create Token → permission « Account Analytics : Read ».
 * Source : API SQL de Workers Analytics Engine (developers.cloudflare.com/analytics/analytics-engine/sql-api/).
 */
const compte = process.env.CLOUDFLARE_ACCOUNT_ID;
const jeton = process.env.CLOUDFLARE_API_TOKEN;
const jours = Math.max(1, Math.min(365, Number(process.argv[2] ?? 30) || 30));
if (!compte || !jeton) {
  console.error('CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_API_TOKEN sont nécessaires (voir l’en-tête de scripts/stats.ts).');
  process.exit(1);
}

const sql = `SELECT blob1 AS etape, blob4 AS ou, SUM(_sample_interval) AS n
FROM loyer_etapes
WHERE timestamp > NOW() - INTERVAL '${jours}' DAY
GROUP BY etape, ou
FORMAT JSON`;

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${compte}/analytics_engine/sql`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jeton}` },
  body: sql,
});
if (!res.ok) {
  console.error(`Erreur ${res.status} : ${await res.text()}`);
  process.exit(1);
}
const { data } = (await res.json()) as { data: { etape: string; ou: string; n: string | number }[] };

export function entonnoir(rows: { etape: string; ou: string; n: string | number }[]) {
  const ordre = ['ouvert', 'e2', 'e3', 'e4', 'resultat'];
  const noms: Record<string, string> = { ouvert: 'Outil ouvert', e2: 'Étape 2 (détails)', e3: 'Étape 3 (projet)', e4: 'Étape 4 (coordonnées)', resultat: 'Résultat (= lead)' };
  const total = (e: string) => rows.filter((r) => r.etape === e).reduce((s, r) => s + Number(r.n), 0);
  const base = total('ouvert');
  return ordre.map((e, i) => {
    const n = total(e);
    const avant = i ? total(ordre[i - 1]) : n;
    return { etape: noms[e], n, depuisDebut: base ? Math.round((100 * n) / base) : 0, depuisAvant: avant ? Math.round((100 * n) / avant) : 0 };
  });
}

console.log(`Parcours des ${jours} derniers jours (comptage anonyme, peut être échantillonné par Cloudflare)\n`);
for (const l of entonnoir(data)) console.log(`${l.etape.padEnd(24)} ${String(l.n).padStart(6)}   ${String(l.depuisDebut).padStart(3)} % du début   ${String(l.depuisAvant).padStart(3)} % de l’étape avant`);
const site = data.filter((r) => r.ou === 'site' && r.etape === 'ouvert').reduce((s, r) => s + Number(r.n), 0);
const direct = data.filter((r) => r.ou === 'direct' && r.etape === 'ouvert').reduce((s, r) => s + Number(r.n), 0);
console.log(`\nOuvertures : ${site} dans ton site (iframe), ${direct} en direct (verlounen.lu ou pages de présentation).`);
