/**
 * Suivi mensuel des maisons à louer (relevés d'annonces atHome et wortimmo).
 *
 * Chaque relevé met à jour une « base » (data/marche/maisons.json) : une fiche par annonce, avec
 * l'historique des prix, la première et la dernière date où elle a été vue. Une annonce qui disparaît
 * d'un relevé à l'autre est marquée « disparue » (probablement louée, ou retirée : on ne peut pas savoir).
 * Son dernier prix est la meilleure approximation publique d'un loyer réellement conclu.
 *
 * Puis comparaison par commune : loyers des annonces actives et des maisons disparues, rapportés au
 * modèle « maisons » de l'outil (src/shared/engine.ts) pour la même zone et la même surface.
 */
import { ALIASES } from '../shared/aliases';
import { COMMUNES, normalize } from '../shared/communes';
import { estimate, type Params } from '../shared/engine';
import type { Answers, Dataset, References } from '../shared/types';

export interface AnnonceReleve {
  source: 'athome' | 'wortimmo';
  id: string;
  url: string;
  loyer: number;
  surface: number | null;
  chambres: number | null;
  type: string;
  localite: string;
  pays: string;
}

export interface Releve {
  date: string; // AAAA-MM-JJ
  /** nombre d'annonces lues par source (tous pays) : sert à détecter un relevé incomplet */
  lues: Partial<Record<AnnonceReleve['source'], number>>;
  annonces: AnnonceReleve[];
}

export interface Fiche {
  cle: string;
  source: AnnonceReleve['source'];
  id: string;
  url: string;
  localite: string;
  commune: string | null;
  type: string;
  surface: number | null;
  chambres: number | null;
  prix: { date: string; loyer: number }[];
  premier_vu: string;
  dernier_vu: string;
  nb_releves: number;
  statut: 'active' | 'disparue';
  /** date du relevé où l'annonce n'était plus là */
  disparue_le: string | null;
  /** annonce revenue après une disparition (remise en ligne) */
  reapparue: boolean;
  exclusion: string | null;
}

export interface Base {
  _note: string;
  releves: { date: string; lues: Releve['lues']; luxembourg: number; nouvelles: number; disparues: number; avertissements: string[] }[];
  fiches: Record<string, Fiche>;
}

export function baseVide(): Base {
  return {
    _note: 'Généré par scripts/marche-maisons.ts. Une fiche par annonce de maison à louer au Luxembourg (atHome, wortimmo). Ne pas modifier à la main.',
    releves: [],
    fiches: {},
  };
}

/** Localité d'annonce → commune officielle (null si inconnue : à ajouter dans src/shared/aliases.ts) */
export function communeDe(localite: string): string | null {
  const brut = localite.replace(/\s*\((?:FR|BE|DE|LU)\)\s*$/i, '').trim();
  const l = normalize(brut);
  if (!l) return null;
  if (l === 'luxembourg' || l.startsWith('luxembourg-') || l.startsWith('luxembourg ')) return 'Luxembourg';
  const exact = COMMUNES.find((c) => normalize(c.name) === l);
  if (exact) return exact.name;
  const alias = Object.entries(ALIASES).find(([a]) => normalize(a) === l);
  if (alias) return alias[1];
  // « Beringen (Mersch) » → « Beringen »
  const sansParenthese = l.replace(/\s*\(.*\)\s*$/, '');
  if (sansParenthese !== l) return communeDe(sansParenthese);
  return null;
}

/** Mêmes règles que l'analyse du 17/11/2026 (docs/controle-annonces.md) */
export function exclusion(a: { loyer: number; surface: number | null }): string | null {
  if (a.surface === null) return 'sans surface';
  if (a.surface < 30) return 'surface < 30 m² (garage ou erreur)';
  if (a.surface >= 400) return 'surface ≥ 400 m² (terrain compté ?)';
  if (a.loyer < 500 || a.loyer > 15000) return 'loyer hors limites (prix de vente ou erreur ?)';
  if (a.loyer / a.surface < 10) return 'moins de 10 €/m² (à vérifier)';
  return null;
}

const jours = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/**
 * Ajoute un relevé à la base. Garde-fou : si une source a moins de la moitié des annonces du relevé
 * précédent, le relevé est sans doute incomplet (blocage, panne) : on ne marque pas ses annonces absentes
 * comme disparues, et on l'écrit dans les avertissements.
 */
export function importerReleve(base: Base, r: Releve): { inconnues: string[]; avertissements: string[] } {
  if (base.releves.some((x) => x.date === r.date)) throw new Error(`relevé du ${r.date} déjà importé`);
  if (base.releves.length && r.date < base.releves[base.releves.length - 1].date) throw new Error(`relevé du ${r.date} plus ancien que le dernier importé`);
  const avertissements: string[] = [];
  const precedent = base.releves[base.releves.length - 1];
  const sourcesFiables = new Set<AnnonceReleve['source']>();
  for (const s of ['athome', 'wortimmo'] as const) {
    const n = r.lues[s] ?? 0;
    const avant = precedent?.lues[s] ?? 0;
    if (n === 0) avertissements.push(`${s} : aucune annonce lue ; disparitions non comptées pour cette source`);
    else if (avant && n < avant * 0.5) avertissements.push(`${s} : ${n} annonces lues contre ${avant} au relevé précédent ; disparitions non comptées pour cette source`);
    else sourcesFiables.add(s);
  }

  const inconnues = new Set<string>();
  const vues = new Set<string>();
  let nouvelles = 0;
  let luxembourg = 0;
  for (const a of r.annonces) {
    if (a.pays !== 'LU') continue;
    luxembourg++;
    const cle = `${a.source}:${a.id}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    const commune = communeDe(a.localite);
    if (!commune) inconnues.add(a.localite);
    const f = base.fiches[cle];
    if (!f) {
      nouvelles++;
      base.fiches[cle] = {
        cle,
        source: a.source,
        id: a.id,
        url: a.url,
        localite: a.localite,
        commune,
        type: a.type,
        surface: a.surface,
        chambres: a.chambres,
        prix: [{ date: r.date, loyer: a.loyer }],
        premier_vu: r.date,
        dernier_vu: r.date,
        nb_releves: 1,
        statut: 'active',
        disparue_le: null,
        reapparue: false,
        exclusion: exclusion(a),
      };
      continue;
    }
    if (f.prix[f.prix.length - 1].loyer !== a.loyer) f.prix.push({ date: r.date, loyer: a.loyer });
    if (f.statut === 'disparue') {
      f.reapparue = true;
      f.statut = 'active';
      f.disparue_le = null;
    }
    f.dernier_vu = r.date;
    f.nb_releves++;
    f.surface = a.surface ?? f.surface;
    f.chambres = a.chambres ?? f.chambres;
    f.commune = commune ?? f.commune;
    f.exclusion = exclusion({ loyer: a.loyer, surface: f.surface });
  }

  let disparues = 0;
  for (const f of Object.values(base.fiches)) {
    if (f.statut !== 'active' || vues.has(f.cle) || !sourcesFiables.has(f.source)) continue;
    f.statut = 'disparue';
    f.disparue_le = r.date;
    disparues++;
  }
  base.releves.push({ date: r.date, lues: r.lues, luxembourg, nouvelles, disparues, avertissements });
  return { inconnues: [...inconnues].sort(), avertissements };
}

/* ---------- Comparaison par commune ---------- */

export interface LigneCommune {
  commune: string;
  canton: string;
  zone: string;
  actives: number;
  activesLoyerMedian: number | null;
  activesM2Median: number | null;
  activesSurModele: number | null;
  disparues: number;
  disparuesLoyerMedian: number | null;
  disparuesSurModele: number | null;
  disparuesJoursMedian: number | null;
  partBaissePrix: number | null;
  /** écart retenu pour la commune : sur les disparues si au moins 3, sinon sur toutes les annonces */
  ecart: number | null;
  base: number;
  verdict: string;
}

export function mediane(v: number[]): number | null {
  const a = v.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Loyer « annonce » du modèle maisons de l'outil, même zone et même surface */
export function loyerModele(commune: string, surface: number, data: Dataset, refs: References, params: Params): number {
  const a: Answers = {
    type: 'maison', commune, surface, chambres: 3, etat: 'bon', energie: 'D', meuble: false, exterieur: 'aucun',
    garages: 0, parkings: 0, etage: null, ascenseur: null, proprietaire: true, dejaLoue: false, gestion: 'non', disponibilite: 'plus_tard',
  };
  return estimate(a, data, refs, params).detail.annonce;
}

/**
 * Les doublons entre portails (même maison sur atHome et wortimmo) sont comptés une seule fois :
 * même commune, même surface, même nombre de chambres et loyer à 3 % près ; atHome est gardé.
 */
export function sansDoublons(fiches: Fiche[]): Fiche[] {
  const out: Fiche[] = [];
  const tri = [...fiches].sort((a, b) => (a.source === b.source ? a.cle.localeCompare(b.cle) : a.source === 'athome' ? -1 : 1));
  for (const f of tri) {
    const l = f.prix[f.prix.length - 1].loyer;
    const doublon = out.some(
      (g) => g.source !== f.source && g.commune === f.commune && g.surface === f.surface && g.chambres === f.chambres && Math.abs(g.prix[g.prix.length - 1].loyer / l - 1) <= 0.03,
    );
    if (!doublon) out.push(f);
  }
  return out;
}

export function comparerCommunes(base: Base, data: Dataset, refs: References, params: Params, minimum = 5): LigneCommune[] {
  const utiles = sansDoublons(Object.values(base.fiches).filter((f) => f.commune && !f.exclusion));
  const parCommune = new Map<string, Fiche[]>();
  for (const f of utiles) parCommune.set(f.commune!, [...(parCommune.get(f.commune!) ?? []), f]);

  const lignes: LigneCommune[] = [];
  for (const [commune, fiches] of parCommune) {
    const c = data.communes.find((x) => x.commune === commune)!;
    const ratio = (f: Fiche) => f.prix[f.prix.length - 1].loyer / loyerModele(commune, f.surface!, data, refs, params);
    const act = fiches.filter((f) => f.statut === 'active');
    const dis = fiches.filter((f) => f.statut === 'disparue');
    const tous = fiches.map(ratio);
    const ecartDis = dis.length >= 3 ? mediane(dis.map(ratio)) : null;
    const ecart = ecartDis ?? (fiches.length >= minimum ? mediane(tous) : null);
    const nBase = ecartDis !== null ? dis.length : fiches.length;
    const verdict =
      ecart === null
        ? `trop peu de données (${fiches.length} maison${fiches.length > 1 ? 's' : ''})`
        : Math.abs(ecart - 1) < 0.05
          ? 'conforme au modèle (± 5 %)'
          : `${ecart > 1 ? 'au-dessus' : 'au-dessous'} du modèle de ${Math.round(Math.abs(ecart - 1) * 100)} %${ecartDis !== null ? ' (maisons disparues)' : ' (toutes les annonces)'}`;
    lignes.push({
      commune,
      canton: c.canton,
      zone: c.zone,
      actives: act.length,
      activesLoyerMedian: mediane(act.map((f) => f.prix[f.prix.length - 1].loyer)),
      activesM2Median: mediane(act.map((f) => f.prix[f.prix.length - 1].loyer / f.surface!)),
      activesSurModele: mediane(act.map(ratio)),
      disparues: dis.length,
      disparuesLoyerMedian: mediane(dis.map((f) => f.prix[f.prix.length - 1].loyer)),
      disparuesSurModele: mediane(dis.map(ratio)),
      disparuesJoursMedian: mediane(dis.map((f) => jours(f.premier_vu, f.disparue_le!))),
      partBaissePrix: fiches.length ? fiches.filter((f) => f.prix.some((p, i) => i > 0 && p.loyer < f.prix[i - 1].loyer)).length / fiches.length : null,
      ecart,
      base: nBase,
      verdict,
    });
  }
  return lignes.sort((a, b) => b.actives + b.disparues - (a.actives + a.disparues) || a.commune.localeCompare(b.commune, 'fr'));
}

/* ---------- Rapport ---------- */

export const NOMS_ZONES: Record<string, string> = { LV: 'Luxembourg-Ville', LC: 'Luxembourg-Campagne', Peri: 'Capellen, Mersch', Sud: 'Sud', Est: 'Est', Nord: 'Nord' };

const eur = (v: number | null) => (v === null ? '—' : `${new Intl.NumberFormat('fr-LU', { maximumFractionDigits: 0 }).format(Math.round(v))} €`);
const pctEcart = (v: number | null) => (v === null ? '—' : `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`);
const m2 = (v: number | null) => (v === null ? '—' : `${v.toFixed(1).replace('.', ',')}`);

export function rapport(base: Base, lignes: LigneCommune[], inconnues: string[], date: string): string {
  const r = base.releves[base.releves.length - 1];
  const fiches = Object.values(base.fiches);
  const premier = base.releves[0]?.date ?? date;
  const lignesTableau = lignes
    .map(
      (l) =>
        `| ${l.commune} | ${NOMS_ZONES[l.zone] ?? l.zone} | ${l.actives} | ${eur(l.activesLoyerMedian)} | ${m2(l.activesM2Median)} | ${pctEcart(l.activesSurModele)} | ${l.disparues} | ${eur(l.disparuesLoyerMedian)} | ${pctEcart(l.disparuesSurModele)} | ${l.disparuesJoursMedian ?? '—'} | ${l.verdict} |`,
    )
    .join('\n');
  const zones = Object.entries(NOMS_ZONES).map(([z, nom]) => {
    const ls = lignes.filter((l) => l.zone === z);
    const act = ls.reduce((s, l) => s + l.actives, 0);
    const dis = ls.reduce((s, l) => s + l.disparues, 0);
    return `| ${nom} | ${act} | ${dis} |`;
  });
  return `# Maisons à louer – relevé du ${date}

Généré par \`scripts/marche-maisons.ts\`. Suivi depuis le ${premier} (${base.releves.length} relevé${base.releves.length > 1 ? 's' : ''}).

## Ce relevé

- Annonces lues : atHome ${r.lues.athome ?? 0}, wortimmo ${r.lues.wortimmo ?? 0} (tous pays) ; au Luxembourg : ${r.luxembourg}.
- Nouvelles maisons : ${r.nouvelles}. Disparues depuis le relevé précédent (probablement louées ou retirées) : ${r.disparues}.
- Base : ${fiches.length} fiches, dont ${fiches.filter((f) => f.statut === 'active').length} actives et ${fiches.filter((f) => f.statut === 'disparue').length} disparues ; ${fiches.filter((f) => f.exclusion).length} exclues des calculs (sans surface, prix aberrant…).
${r.avertissements.length ? `\n**Avertissements :**\n${r.avertissements.map((a) => `- ${a}`).join('\n')}\n` : ''}${inconnues.length ? `\n**Localités inconnues** (à ajouter dans \`src/shared/aliases.ts\`, puis relancer) : ${inconnues.join(', ')}\n` : ''}
## Par zone

| Zone | Annonces actives | Disparues (total) |
| --- | ---: | ---: |
${zones.join('\n')}

## Par commune

« Modèle » = loyer en annonce que donne l'outil pour une maison de même surface dans la même zone. « +12 % » = la commune loue 12 % plus cher que le modèle de sa zone.
« Disparues » = annonces qui ne sont plus en ligne : probablement louées, mais elles peuvent aussi avoir été retirées. Leur dernier prix est ce qui se rapproche le plus d'un loyer réellement conclu. « Jours » = jours entre la première et la dernière observation (précision : un mois).
Les maisons en double sur atHome et wortimmo ne sont comptées qu'une fois.

| Commune | Zone | Actives | Loyer médian | €/m² | Actives vs modèle | Disparues | Dernier loyer médian | Disparues vs modèle | Jours | Lecture |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${lignesTableau}

## Comment lire

- Une commune n'a un écart affiché qu'à partir de ${5} maisons (ou 3 maisons disparues). En dessous, l'écart ne veut rien dire.
- Pendant les premiers mois, il y a peu de maisons disparues : la colonne « Disparues vs modèle » se remplit au fil des relevés.
- Ce sont des loyers **demandés**, jamais des loyers signés : aucune source publique ne donne les loyers signés des maisons par commune.
`;
}
