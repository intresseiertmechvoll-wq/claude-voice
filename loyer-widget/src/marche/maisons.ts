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
  source: 'athome' | 'immotop' | 'wortimmo';
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
  const sourcesFiables = new Set<AnnonceReleve['source']>();
  for (const s of ['athome', 'immotop', 'wortimmo'] as const) {
    if (!(s in r.lues)) {
      // source non relevée cette fois : ses annonces ne sont pas marquées disparues
      if (base.releves.some((x) => (x.lues[s] ?? 0) > 0)) avertissements.push(`${s} : pas relevé cette fois ; disparitions non comptées pour cette source`);
      continue;
    }
    const n = r.lues[s] ?? 0;
    // Comparaison avec le dernier relevé où cette source a été lue
    const avant = [...base.releves].reverse().find((x) => (x.lues[s] ?? 0) > 0)?.lues[s] ?? 0;
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

/* ---------- Objets : une maison peut être annoncée sur plusieurs portails ---------- */

/** Priorité quand une même maison est sur plusieurs portails : on garde l'annonce de ce portail */
const PRIORITE: Record<Fiche['source'], number> = { athome: 0, immotop: 1, wortimmo: 2 };

const dernierLoyer = (f: Fiche) => f.prix[f.prix.length - 1].loyer;

/**
 * Deux annonces de portails différents sont la même maison si : même commune, surface connue et égale
 * à 2 m² près, et soit même nombre de chambres (quand les deux le donnent) et loyer à 3 % près,
 * soit une chambre d'écart et loyer à 1 % près.
 * Deux annonces du même portail ne sont jamais fusionnées.
 */
export function memeMaison(a: Fiche, b: Fiche): boolean {
  if (a.source === b.source || !a.commune || a.commune !== b.commune) return false;
  if (a.surface === null || b.surface === null || Math.abs(a.surface - b.surface) > 2) return false;
  const ecartLoyer = Math.abs(dernierLoyer(a) / dernierLoyer(b) - 1);
  // Les portails ne comptent pas toujours les chambres de la même façon : 1 d'écart toléré si le loyer est identique (à 1 % près)
  const ecartChambres = a.chambres !== null && b.chambres !== null ? Math.abs(a.chambres - b.chambres) : 0;
  if (ecartChambres === 0) return ecartLoyer <= 0.03;
  return ecartChambres === 1 && ecartLoyer <= 0.01;
}

export interface Objet {
  /** annonce retenue (portail prioritaire) */
  fiche: Fiche;
  /** toutes les annonces de cette maison */
  annonces: Fiche[];
  commune: string;
  surface: number;
  loyer: number;
  statut: 'active' | 'disparue';
  premier_vu: string;
  disparue_le: string | null;
  baissePrix: boolean;
}

/** Regroupe les annonces en maisons (objets), une seule fois chacune */
export function objets(fiches: Fiche[]): Objet[] {
  const tri = [...fiches].sort((a, b) => PRIORITE[a.source] - PRIORITE[b.source] || a.cle.localeCompare(b.cle));
  const groupes: Fiche[][] = [];
  for (const f of tri) {
    const g = groupes.find((grp) => !grp.some((x) => x.source === f.source) && grp.some((x) => memeMaison(x, f)));
    if (g) g.push(f);
    else groupes.push([f]);
  }
  return groupes.map((grp) => {
    const fiche = grp[0];
    const active = grp.some((f) => f.statut === 'active');
    return {
      fiche,
      annonces: grp,
      commune: fiche.commune!,
      surface: fiche.surface!,
      loyer: dernierLoyer(fiche),
      statut: active ? 'active' : 'disparue',
      premier_vu: grp.map((f) => f.premier_vu).sort()[0],
      disparue_le: active ? null : grp.map((f) => f.disparue_le!).sort().at(-1)!,
      baissePrix: grp.some((f) => f.prix.some((p, i) => i > 0 && p.loyer < f.prix[i - 1].loyer)),
    };
  });
}

/* ---------- Comparaison par territoire ---------- */

export const MINIMUM_OBJETS = 10;
export const FENETRE_MOIS = 12;

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

export type Niveau = 'commune' | 'canton' | 'zone' | 'pays';

export interface Groupe {
  niveau: Niveau;
  nom: string;
  objets: number;
  actives: number;
  disparues: number;
  loyerMedian: number | null;
  m2Median: number | null;
  /** loyer médian des objets ÷ modèle (1,08 = 8 % au-dessus du modèle) */
  ecart: number | null;
  ecartDisparues: number | null;
  joursDisparuesMedian: number | null;
  partBaissePrix: number | null;
}

export interface LigneCommune {
  commune: string;
  canton: string;
  zone: string;
  objets: number;
  actives: number;
  disparues: number;
  loyerMedian: number | null;
  /** territoire utilisé pour la comparaison : le plus petit qui a au moins 10 objets */
  reference: { niveau: Niveau; nom: string; objets: number; ecart: number | null };
  verdict: string;
}

export interface Comparaison {
  depuis: string;
  objetsTotal: number;
  annoncesTotal: number;
  doublons: number;
  cantons: Groupe[];
  zones: Groupe[];
  pays: Groupe;
  communes: LigneCommune[];
}

/** Canton affiché : Luxembourg-Ville à part du reste du canton de Luxembourg */
const cantonDe = (commune: string, canton: string) => (commune === 'Luxembourg' ? 'Luxembourg-Ville' : canton);

function groupe(niveau: Niveau, nom: string, obj: Objet[], ratio: (o: Objet) => number): Groupe {
  const dis = obj.filter((o) => o.statut === 'disparue');
  return {
    niveau,
    nom,
    objets: obj.length,
    actives: obj.length - dis.length,
    disparues: dis.length,
    loyerMedian: mediane(obj.map((o) => o.loyer)),
    m2Median: mediane(obj.map((o) => o.loyer / o.surface)),
    ecart: obj.length ? mediane(obj.map(ratio)) : null,
    ecartDisparues: dis.length >= 3 ? mediane(dis.map(ratio)) : null,
    joursDisparuesMedian: mediane(dis.map((o) => jours(o.premier_vu, o.disparue_le!))),
    partBaissePrix: obj.length ? obj.filter((o) => o.baissePrix).length / obj.length : null,
  };
}

/**
 * Compare les maisons des 12 derniers mois (actives et disparues) au modèle de l'outil.
 * Pour chaque commune, la comparaison se fait sur le plus petit territoire qui a au moins 10 maisons :
 * la commune, sinon son canton, sinon sa zone, sinon le pays.
 */
export function comparer(base: Base, data: Dataset, refs: References, params: Params, dateRef?: string): Comparaison {
  const fin = dateRef ?? base.releves[base.releves.length - 1]?.date ?? new Date().toISOString().slice(0, 10);
  const debut = new Date(Date.parse(fin) - FENETRE_MOIS * 30.5 * 86_400_000).toISOString().slice(0, 10);
  const fiches = Object.values(base.fiches).filter((f) => f.commune && !f.exclusion && f.dernier_vu >= debut);
  const obj = objets(fiches);
  const info = new Map(data.communes.map((c) => [c.commune, c]));
  const cache = new Map<string, number>();
  const ratio = (o: Objet) => {
    const k = `${o.commune}|${o.surface}`;
    if (!cache.has(k)) cache.set(k, loyerModele(o.commune, o.surface, data, refs, params));
    return o.loyer / cache.get(k)!;
  };
  const par = (cle: (o: Objet) => string) => {
    const m = new Map<string, Objet[]>();
    for (const o of obj) m.set(cle(o), [...(m.get(cle(o)) ?? []), o]);
    return m;
  };
  const parCommune = par((o) => o.commune);
  const parCanton = par((o) => cantonDe(o.commune, info.get(o.commune)!.canton));
  const parZone = par((o) => info.get(o.commune)!.zone);

  const tousCantons = ['Luxembourg-Ville', ...[...new Set(data.communes.map((c) => c.canton))].sort((a, b) => a.localeCompare(b, 'fr'))];
  const cantons = tousCantons.map((c) => groupe('canton', c, parCanton.get(c) ?? [], ratio));
  const zones = ['LV', 'LC', 'Peri', 'Sud', 'Est', 'Nord'].map((z) => groupe('zone', z, parZone.get(z) ?? [], ratio));
  const pays = groupe('pays', 'Luxembourg', obj, ratio);

  const communes: LigneCommune[] = [...parCommune.entries()].map(([commune, liste]) => {
    const c = info.get(commune)!;
    const canton = cantonDe(commune, c.canton);
    const candidats: Groupe[] = [
      groupe('commune', commune, liste, ratio),
      cantons.find((g) => g.nom === canton)!,
      zones.find((g) => g.nom === c.zone)!,
      pays,
    ];
    const ref = candidats.find((g) => g.objets >= MINIMUM_OBJETS) ?? pays;
    const e = ref.ecart;
    const ou = ref.niveau === 'commune' ? 'la commune' : ref.niveau === 'canton' ? `le canton (${ref.nom})` : ref.niveau === 'zone' ? 'la zone' : 'le pays';
    const verdict =
      e === null
        ? 'pas de données'
        : `${Math.abs(e - 1) < 0.05 ? 'conforme au modèle (± 5 %)' : `${e > 1 ? 'au-dessus' : 'au-dessous'} du modèle de ${Math.round(Math.abs(e - 1) * 100)} %`}, mesuré sur ${ou} : ${ref.objets} maisons`;
    const dis = liste.filter((o) => o.statut === 'disparue').length;
    return {
      commune,
      canton,
      zone: c.zone,
      objets: liste.length,
      actives: liste.length - dis,
      disparues: dis,
      loyerMedian: mediane(liste.map((o) => o.loyer)),
      reference: { niveau: ref.niveau, nom: ref.nom, objets: ref.objets, ecart: e },
      verdict,
    };
  });
  communes.sort((a, b) => b.objets - a.objets || a.commune.localeCompare(b.commune, 'fr'));
  return { depuis: debut, objetsTotal: obj.length, annoncesTotal: fiches.length, doublons: fiches.length - obj.length, cantons, zones, pays, communes };
}

/* ---------- Rapport ---------- */

export const NOMS_ZONES: Record<string, string> = { LV: 'Luxembourg-Ville', LC: 'Luxembourg-Campagne', Peri: 'Capellen, Mersch', Sud: 'Sud', Est: 'Est', Nord: 'Nord' };

const eur = (v: number | null) => (v === null ? '—' : `${new Intl.NumberFormat('fr-LU', { maximumFractionDigits: 0 }).format(Math.round(v))} €`);
const pctEcart = (v: number | null) => (v === null ? '—' : `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`);
const m2 = (v: number | null) => (v === null ? '—' : `${v.toFixed(1).replace('.', ',')}`);
const etat = (n: number) => (n >= MINIMUM_OBJETS ? `${n} ✔` : `${n} (manque ${MINIMUM_OBJETS - n})`);

function ligneGroupe(g: Groupe, nom = g.nom): string {
  return `| ${nom} | ${etat(g.objets)} | ${g.actives} | ${g.disparues} | ${eur(g.loyerMedian)} | ${m2(g.m2Median)} | ${g.objets >= MINIMUM_OBJETS ? pctEcart(g.ecart) : '—'} | ${pctEcart(g.ecartDisparues)} | ${g.joursDisparuesMedian ?? '—'} |`;
}

export function rapport(base: Base, c: Comparaison, inconnues: string[], date: string): string {
  const r = base.releves[base.releves.length - 1];
  const fiches = Object.values(base.fiches);
  const premier = base.releves[0]?.date ?? date;
  const lus = Object.entries(r.lues).map(([s, n]) => `${s} ${n}`).join(', ');
  const manquants = c.cantons.filter((g) => g.objets < MINIMUM_OBJETS);
  const tete = '| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |';
  return `# Maisons à louer – relevé du ${date}

Généré par \`scripts/marche-maisons.ts\`. Suivi depuis le ${premier} (${base.releves.length} relevé${base.releves.length > 1 ? 's' : ''}). Comparaisons sur les maisons vues depuis le ${c.depuis} (12 mois).

## Ce relevé

- Annonces lues : ${lus} (tous pays) ; au Luxembourg : ${r.luxembourg}.
- Nouvelles annonces : ${r.nouvelles}. Disparues depuis le relevé précédent (probablement louées ou retirées) : ${r.disparues}.
- Base : ${fiches.length} annonces, dont ${fiches.filter((f) => f.exclusion).length} exclues des calculs (sans surface, prix aberrant…).
- **Maisons différentes : ${c.objetsTotal}** (${c.annoncesTotal} annonces utilisables ; ${c.doublons} annonces étaient la même maison sur un autre portail).
${r.avertissements.length ? `\n**Avertissements :**\n${r.avertissements.map((a) => `- ${a}`).join('\n')}\n` : ''}${inconnues.length ? `\n**Localités inconnues** (à ajouter dans \`src/shared/aliases.ts\`, puis relancer) : ${inconnues.join(', ')}\n` : ''}
## Objectif : au moins ${MINIMUM_OBJETS} maisons de comparaison par territoire

${manquants.length ? `Cantons sous le minimum : ${manquants.map((g) => `${g.nom} (${g.objets})`).join(', ')}. Pour leurs communes, la comparaison se fait sur la zone. Les maisons disparues restent comptées 12 mois : le nombre monte au fil des relevés.` : 'Tous les cantons ont au moins 10 maisons.'}

### Par canton

${tete}
${c.cantons.map((g) => ligneGroupe(g)).join('\n')}

### Par zone

${tete}
${c.zones.map((g) => ligneGroupe(g, NOMS_ZONES[g.nom] ?? g.nom)).join('\n')}
${ligneGroupe(c.pays, '**Tout le pays**')}

## Par commune

Chaque commune est comparée sur le plus petit territoire qui a au moins ${MINIMUM_OBJETS} maisons : la commune elle-même, sinon son canton, sinon sa zone.

| Commune | Canton | Maisons | Actives | Disparues | Loyer médian | Comparée sur | Écart au modèle | Lecture |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
${c.communes.map((l) => `| ${l.commune} | ${l.canton} | ${l.objets} | ${l.actives} | ${l.disparues} | ${eur(l.loyerMedian)} | ${l.reference.niveau === 'zone' ? NOMS_ZONES[l.reference.nom] ?? l.reference.nom : l.reference.nom} (${l.reference.objets}) | ${pctEcart(l.reference.ecart)} | ${l.verdict} |`).join('\n')}

## Comment lire

- « Modèle » = loyer en annonce que donne l'outil pour une maison de même surface dans la même zone. « +8 % » = les maisons de ce territoire sont annoncées 8 % plus cher que le modèle.
- « Disparues » = annonces qui ne sont plus en ligne : probablement louées, mais peut-être retirées. Leur dernier prix est ce qui se rapproche le plus d'un loyer conclu. « Écart, disparues » n'apparaît qu'à partir de 3 maisons disparues.
- Une maison annoncée sur plusieurs portails (atHome, immotop, wortimmo) n'est comptée qu'une fois : même commune, surface à 2 m² près, même nombre de chambres et loyer à 3 % près (ou une chambre d'écart et loyer à 1 % près).
- Ce sont des loyers **demandés** : aucune source publique ne donne les loyers signés des maisons par commune.
`;
}
