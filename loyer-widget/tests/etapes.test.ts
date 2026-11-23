import { describe, expect, it } from 'vitest';
import { handleEtape } from '../src/server/etapes';

const req = (payload: unknown, o: { origin?: string; type?: string } = {}) =>
  new Request('https://verlounen.lu/api/etape', {
    method: 'POST',
    headers: { 'content-type': o.type ?? 'application/json', ...(o.origin ? { origin: o.origin } : {}) },
    body: JSON.stringify(payload),
  });

function moteur() {
  const points: { blobs?: string[]; indexes?: string[] }[] = [];
  return { points, ETAPES: { writeDataPoint: (p: { blobs?: string[]; indexes?: string[] }) => void points.push(p) } };
}

describe('Comptage anonyme des étapes', () => {
  it('compte l’étape, le type, la langue et « site / direct », rien d’autre', async () => {
    const m = moteur();
    const res = await handleEtape(req({ etape: 'e3', type: 'maison', lang: 'de', integre: true, email: 'x@y.lu', ip: '1.2.3.4' }), { ETAPES: m.ETAPES });
    expect(res.status).toBe(204);
    expect(m.points).toEqual([{ blobs: ['e3', 'maison', 'de', 'site'], indexes: ['loyer'] }]);
  });

  it('valeurs inconnues ramenées à des valeurs sûres ; étape inconnue refusée', async () => {
    const m = moteur();
    await handleEtape(req({ etape: 'ouvert', type: '<script>', lang: 'xx' }), { ETAPES: m.ETAPES });
    expect(m.points[0].blobs).toEqual(['ouvert', '', 'fr', 'direct']);
    expect((await handleEtape(req({ etape: 'admin' }), { ETAPES: m.ETAPES })).status).toBe(400);
    expect(m.points).toHaveLength(1);
  });

  it('autre site, mauvais type de contenu, GET : refusés', async () => {
    const m = moteur();
    expect((await handleEtape(req({ etape: 'e2' }, { origin: 'https://ailleurs.example' }), { ETAPES: m.ETAPES })).status).toBe(403);
    expect((await handleEtape(req({ etape: 'e2' }, { type: 'text/plain' }), { ETAPES: m.ETAPES })).status).toBe(415);
    expect((await handleEtape(new Request('https://verlounen.lu/api/etape'), { ETAPES: m.ETAPES })).status).toBe(405);
    expect(m.points).toHaveLength(0);
  });

  it('sans binding Analytics Engine : accepté, rien n’est compté, pas d’erreur', async () => {
    expect((await handleEtape(req({ etape: 'resultat' }), {})).status).toBe(204);
  });
});
