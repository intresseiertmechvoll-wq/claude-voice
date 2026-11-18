import { describe, expect, it } from 'vitest';
import { area, bbox, contains, inPolygon, minDistance, pointDistance, ringArea } from '../src/shared/geo';
import buildings from './fixtures/geoportail/buildings-206-burange.json';
import flood from './fixtures/geoportail/flood-hqext-alzette.json';
import parcels from './fixtures/geoportail/parcels-206-burange.json';

const square = (x: number, y: number, s: number): [number, number][] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const poly = (ring: [number, number][], ...holes: [number, number][][]) => ({ type: 'Polygon' as const, coordinates: [ring, ...holes] });

describe('Géométrie (géoportail, LUREF)', () => {
  it('Point dans un polygone, avec trou et multipolygone', () => {
    const withHole = poly(square(0, 0, 10), square(4, 4, 2));
    expect(contains(withHole, [1, 1])).toBe(true);
    expect(contains(withHole, [5, 5])).toBe(false); // dans le trou
    expect(contains(withHole, [11, 5])).toBe(false);
    const multi = { type: 'MultiPolygon', coordinates: [[square(0, 0, 1)], [square(10, 10, 1)]] };
    expect(contains(multi, [10.5, 10.5])).toBe(true);
    expect(contains(multi, [5, 5])).toBe(false);
    expect(inPolygon([0.5, 0.5], [square(0, 0, 1)])).toBe(true);
    expect(contains({ type: 'Point', coordinates: [0, 0] }, [0, 0])).toBe(false);
    expect(contains(null, [0, 0])).toBe(false);
  });

  it('Aire (formule du lacet), trous déduits, sens de rotation indifférent', () => {
    expect(ringArea(square(0, 0, 10))).toBe(100);
    expect(ringArea([...square(0, 0, 10)].reverse())).toBe(100);
    expect(area(poly(square(0, 0, 10), square(4, 4, 2)))).toBe(96);
    expect(area({ type: 'MultiPolygon', coordinates: [[square(0, 0, 2)], [square(5, 5, 3)]] })).toBe(13);
  });

  it('Distance entre polygones : 0 s’ils se touchent ou se croisent', () => {
    const a = poly(square(0, 0, 10));
    expect(minDistance(a, poly(square(10, 0, 5)))).toBe(0); // mur commun
    expect(minDistance(a, poly(square(10.4, 2, 5)))).toBeCloseTo(0.4, 6);
    expect(minDistance(a, poly(square(5, 5, 10)))).toBe(0); // chevauchement
    expect(minDistance(a, poly(square(2, 2, 1)))).toBe(0); // l'un dans l'autre
    expect(minDistance(a, poly(square(13, 14, 2)))).toBeCloseTo(5, 6);
    expect(pointDistance(a, [13, 14])).toBeCloseTo(5, 6);
    expect(pointDistance(a, [3, 3])).toBe(0);
    expect(bbox(a)).toEqual([0, 0, 10, 10]);
  });

  it('Plan cadastral réel : le point du 206, route de Burange tombe dans la parcelle 1329/5186 (555,45 m²), pas dans les voisines', () => {
    const pt: [number, number] = [74220.3735, 61898.7242];
    const hits = parcels.features.filter((f) => contains(f.geometry, pt)).map((f) => f.properties.label);
    expect(hits).toEqual(['1329/5186']);
    for (const f of parcels.features) expect(area(f.geometry)).toBeCloseTo(f.properties.area, 1);
  });

  it('Bâtiment réel : le point est dans l’emprise, environ 125 m²', () => {
    const b = buildings.features[0].geometry;
    expect(contains(b, [74220.3735, 61898.7242])).toBe(true);
    expect(Math.round(area(b))).toBe(125);
  });

  it('Carte des crues extrêmes réelle (Alzette) : le point demandé n’est dans aucun des 3 polygones renvoyés', () => {
    const fs = flood[0].features;
    expect(fs.map((f) => contains(f.geometry, [77335.03, 76049.95]))).toEqual([false, false, false]);
    // Contrôles : un point dans chaque type de zone, et un point dans le trou du grand polygone
    expect(fs.map((f) => contains(f.geometry, [77338.5, 76045]))).toEqual([false, true, false]);
    expect(fs.map((f) => contains(f.geometry, [77346.5, 76050]))).toEqual([true, false, false]);
    expect(contains(fs[0].geometry, [77450.5, 77109.5])).toBe(false); // trou
    expect(contains(fs[0].geometry, [77449.5, 77109.5])).toBe(true);
  });
});
