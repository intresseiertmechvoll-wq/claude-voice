/**
 * Ce que le prix visé représente en m² dans chaque commune choisie (serveur seulement :
 * les prix des communes ne sont envoyés au navigateur qu'après les coordonnées).
 */
import type { Params } from './budget';
import type { CommuneData, CommuneM2, Dataset, Neuf, TypeBien } from './types';

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function apartment(c: CommuneData, data: Dataset, neuf: Neuf, p: Params): Pick<CommuneM2, 'source' | 'prixM2' | 'nombre'> {
  const min = p.communes.ventes_min;
  if (neuf === 'neuf' && c.notarie_vefa_m2 !== null && (c.notarie_vefa_ventes ?? 0) >= min) {
    return { source: 'vefa', prixM2: c.notarie_vefa_m2, nombre: c.notarie_vefa_ventes };
  }
  if (c.notarie_existant_m2 !== null && (c.notarie_existant_ventes ?? 0) >= min) {
    return { source: 'notarie', prixM2: c.notarie_existant_m2, nombre: c.notarie_existant_ventes };
  }
  const canton = data.communes.filter((x) => x.canton === c.canton && x.notarie_existant_m2 !== null && (x.notarie_existant_ventes ?? 0) >= min);
  const m = median(canton.map((x) => x.notarie_existant_m2!));
  return m === null ? { source: null, prixM2: null, nombre: null } : { source: 'canton', prixM2: m, nombre: canton.length };
}

function house(c: CommuneData, data: Dataset, p: Params): Pick<CommuneM2, 'source' | 'prixM2' | 'nombre'> {
  const min = p.communes.offres_min;
  if (c.annonce_maison_m2 !== null && (c.annonce_maison_offres ?? 0) >= min) {
    return { source: 'annonce', prixM2: c.annonce_maison_m2, nombre: c.annonce_maison_offres };
  }
  const canton = data.communes.filter((x) => x.canton === c.canton && x.annonce_maison_m2 !== null && (x.annonce_maison_offres ?? 0) >= min);
  const m = median(canton.map((x) => x.annonce_maison_m2!));
  return m === null ? { source: null, prixM2: null, nombre: null } : { source: 'canton_annonce', prixM2: m, nombre: canton.length };
}

export function communesM2(prix: number, communes: string[], type: TypeBien, neuf: Neuf, data: Dataset, p: Params): CommuneM2[] {
  const types: ('appartement' | 'maison')[] = type === 'les_deux' ? ['appartement', 'maison'] : [type];
  const out: CommuneM2[] = [];
  for (const name of communes) {
    const c = data.communes.find((x) => x.commune === name);
    if (!c) continue;
    for (const t of types) {
      const d = t === 'appartement' ? apartment(c, data, neuf, p) : house(c, data, p);
      const ancienPourNeuf = t === 'appartement' && neuf === 'neuf' && d.source !== null && d.source !== 'vefa';
      out.push({ commune: c.commune, canton: c.canton, type: t, ...d, m2: d.prixM2 ? Math.round(prix / d.prixM2) : null, ...(ancienPourNeuf ? { ancienPourNeuf } : {}) });
    }
  }
  return out;
}
