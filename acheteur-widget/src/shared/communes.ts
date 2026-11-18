import cantons from '../../data/cantons.json';

/** Liste des 100 communes (noms seulement, sans aucun prix) */
export const COMMUNES: { name: string; canton: string }[] = Object.entries(cantons as Record<string, unknown>)
  .filter(([k]) => !k.startsWith('_'))
  .flatMap(([canton, list]) => (list as string[]).map((name) => ({ name, canton })))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

export const COMMUNE_NAMES = new Set(COMMUNES.map((c) => c.name));

/** Pour la recherche : sans accents, minuscules */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
