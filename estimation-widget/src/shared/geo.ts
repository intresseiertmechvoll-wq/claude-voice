/**
 * Géométrie plane pour les données du géoportail (coordonnées LUREF, EPSG:2169, en mètres).
 * Fonctions pures, sans dépendance : point dans un polygone (trous et multipolygones compris),
 * aire (formule du lacet) et distance minimale entre deux polygones.
 */

export type Pt = [number, number];
/** Anneau : liste de points, fermé ou non (le premier point peut être répété à la fin) */
export type Ring = Pt[];
/** Polygone GeoJSON : anneau extérieur puis trous */
export type Poly = Ring[];
/** Géométrie GeoJSON surfacique */
export type Geometry = { type: 'Polygon'; coordinates: Poly } | { type: 'MultiPolygon'; coordinates: Poly[] };

/** Polygones d'une géométrie (Polygon ou MultiPolygon) ; [] si la géométrie n'est pas surfacique ou mal formée */
export function polygonsOf(g: unknown): Poly[] {
  if (!g || typeof g !== 'object') return [];
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown };
  if (!Array.isArray(coordinates)) return [];
  const polys = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : [];
  return (polys as unknown[]).filter(isPoly);
}

const isPt = (p: unknown): p is Pt => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
const isPoly = (p: unknown): p is Poly => Array.isArray(p) && p.length > 0 && p.every((r) => Array.isArray(r) && r.length >= 3 && r.every(isPt));

/** Point dans un anneau (règle pair-impair) */
export function inRing(pt: Pt, ring: Ring): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point dans un polygone : dans l'anneau extérieur et hors de chaque trou */
export function inPolygon(pt: Pt, poly: Poly): boolean {
  if (!poly.length || !inRing(pt, poly[0])) return false;
  return !poly.slice(1).some((hole) => inRing(pt, hole));
}

/** Point dans une géométrie Polygon ou MultiPolygon */
export function contains(g: unknown, pt: Pt): boolean {
  return polygonsOf(g).some((p) => inPolygon(pt, p));
}

/** Aire d'un anneau (formule du lacet), toujours positive */
export function ringArea(ring: Ring): number {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(s) / 2;
}

/** Aire d'une géométrie : anneaux extérieurs moins les trous */
export function area(g: unknown): number {
  return polygonsOf(g).reduce((sum, p) => sum + Math.max(0, ringArea(p[0]) - p.slice(1).reduce((h, r) => h + ringArea(r), 0)), 0);
}

/** Distance d'un point à un segment */
export function pointSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const k = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + k * dx), p[1] - (a[1] + k * dy));
}

function segments(g: unknown): [Pt, Pt][] {
  const out: [Pt, Pt][] = [];
  for (const poly of polygonsOf(g)) for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) out.push([ring[j], ring[i]]);
  return out;
}

const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Distance d'un point à une géométrie : 0 à l'intérieur, sinon distance au bord le plus proche */
export function pointDistance(g: unknown, pt: Pt): number {
  if (contains(g, pt)) return 0;
  let best = Infinity;
  for (const [a, b] of segments(g)) best = Math.min(best, pointSegment(pt, a, b));
  return best;
}

/**
 * Distance minimale entre deux géométries (0 si elles se touchent, se croisent ou si l'une contient l'autre).
 * Les emprises sont d'abord comparées pour éviter le calcul complet entre bâtiments éloignés.
 */
export function minDistance(g1: unknown, g2: unknown): number {
  const s1 = segments(g1);
  const s2 = segments(g2);
  if (!s1.length || !s2.length) return Infinity;
  // Un sommet de l'un à l'intérieur de l'autre : contact
  if (contains(g2, s1[0][0]) || contains(g1, s2[0][0])) return 0;
  let best = Infinity;
  for (const [a, b] of s1) {
    for (const [c, d] of s2) {
      if (segmentsCross(a, b, c, d)) return 0;
      best = Math.min(best, pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
    }
  }
  return best;
}

/** Emprise [xmin, ymin, xmax, ymax] d'une géométrie */
export function bbox(g: unknown): [number, number, number, number] | null {
  let b: [number, number, number, number] | null = null;
  for (const poly of polygonsOf(g))
    for (const [x, y] of poly[0]) b = b ? [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)] : [x, y, x, y];
  return b;
}
