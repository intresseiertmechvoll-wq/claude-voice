import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { getTaux, resetTauxCache } from '../src/server/taux';
import { checkTaux, mensualite, parseEcbCsv, partRevenu } from '../src/shared/taux';
import { translator } from '../src/i18n';
import { renderMensualite } from '../src/ui/result';
import { PARAMS } from './helpers';

const CSV = readFileSync(new URL('./fixtures/bce-2026-09.csv', import.meta.url), 'utf8');
const NOV = new Date('2026-11-18T10:00:00Z');

describe('Taux BCE / BCL', () => {
  it('Lecture de la vraie réponse de la BCE (septembre 2026 : 3,13 % variable = communiqué BCL du 03/11/2026)', () => {
    expect(parseEcbCsv(CSV)).toEqual({ variable: 3.13, fixe: 4.03, mois: '2026-09' });
  });
  it('Format inattendu : rien n’est lu', () => {
    expect(parseEcbCsv('<html>erreur</html>')).toBeNull();
    expect(parseEcbCsv(CSV.replace('2026-09,4.03', '2026-08,4.03'))).toBeNull(); // deux mois différents
  });
  it('Taux non plausibles ou trop anciens : pas de mensualité', () => {
    expect(checkTaux({ variable: 3.13, fixe: 4.03, mois: '2026-09' }, NOV)).not.toBeNull();
    expect(checkTaux({ variable: 12, fixe: 4.03, mois: '2026-09' }, NOV)).toBeNull();
    expect(checkTaux({ variable: 0.1, fixe: 4.03, mois: '2026-09' }, NOV)).toBeNull();
    expect(checkTaux({ variable: 3.13, fixe: 4.03, mois: '2026-09' }, new Date('2027-01-31'))).not.toBeNull(); // 4 mois
    expect(checkTaux({ variable: 3.13, fixe: 4.03, mois: '2026-09' }, new Date('2027-02-01'))).toBeNull(); // 5 mois
  });
  it('Serveur : taux lus en direct', async () => {
    const t = await getTaux({ fetch: vi.fn(async () => new Response(CSV)) as unknown as typeof fetch, now: () => NOV, log: () => {}, params: PARAMS }, false);
    expect(t).toEqual({ variable: 3.13, fixe: 4.03, mois: '2026-09', origine: 'bce' });
  });
  it('Serveur : BCE en panne → valeur de secours ; trop ancienne → rien', async () => {
    const down = vi.fn(async () => {
      throw new Error('panne');
    }) as unknown as typeof fetch;
    expect((await getTaux({ fetch: down, now: () => NOV, log: () => {}, params: PARAMS }, false))?.origine).toBe('secours');
    expect(await getTaux({ fetch: down, now: () => new Date('2027-03-01'), log: () => {}, params: PARAMS }, false)).toBeNull();
  });
  it('Revue 19/11 : après une panne, la BCE n’est pas redemandée pendant 1 heure (pas d’attente à chaque envoi)', async () => {
    resetTauxCache();
    const down = vi.fn(async () => {
      throw new Error('panne');
    }) as unknown as typeof fetch;
    let now = NOV;
    const d = { fetch: down, now: () => now, log: () => {}, params: PARAMS };
    expect((await getTaux(d))?.origine).toBe('secours');
    expect((await getTaux(d))?.origine).toBe('secours');
    expect(down).toHaveBeenCalledTimes(1);
    now = new Date(NOV.getTime() + 61 * 60_000); // 1 h plus tard : nouvel essai
    await getTaux(d);
    expect(down).toHaveBeenCalledTimes(2);
    resetTauxCache();
  });
  it('Revue 19/11 : taux lus gardés en mémoire (même si le cache Cloudflare ne garde rien)', async () => {
    resetTauxCache();
    const live = vi.fn(async () => new Response(CSV)) as unknown as typeof fetch;
    const d = { fetch: live, now: () => NOV, log: () => {}, params: PARAMS };
    expect((await getTaux(d))?.origine).toBe('bce');
    expect((await getTaux(d))?.origine).toBe('bce');
    expect(live).toHaveBeenCalledTimes(1);
    resetTauxCache();
  });
  it('Serveur : réponse absurde de la BCE (ex. 40 %) → valeur de secours, jamais affichée', async () => {
    const bad = vi.fn(async () => new Response(CSV.replace(',4.03,', ',40.3,'))) as unknown as typeof fetch;
    expect((await getTaux({ fetch: bad, now: () => NOV, log: () => {}, params: PARAMS }, false))?.origine).toBe('secours');
  });
});

describe('Mensualité', () => {
  it('600 000 € sur 25 ans à 4,03 % = 3 176,97 € (calcul à la main, formule de l’annuité)', () => {
    expect(mensualite(600000, 4.03, 25)).toBeCloseTo(3176.97, 1);
    expect(mensualite(600000, 3.13, 25)).toBeCloseTo(2886.0, 1);
  });
  it('Part du revenu : tranche 6 000 – 8 000 € → 40 à 53 %', () => {
    const p = partRevenu(3176.97, '6000_8000')!;
    expect(Math.round(p.min! * 100)).toBe(40);
    expect(Math.round(p.max! * 100)).toBe(53);
    expect(partRevenu(3176.97, 'nr')).toBeNull();
    expect(partRevenu(3176.97, 'plus_14000')!.min).toBeNull();
  });
  it('Affichage : taux, mois, avertissement ; rien sans taux', () => {
    const t = translator('fr');
    const html = renderMensualite(600000, { variable: 3.13, fixe: 4.03, mois: '2026-09', origine: 'bce' }, '6000_8000', t, 'fr', [0.33, 0.4], [20, 25, 30]);
    const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(txt).toContain('septembre 2026');
    expect(txt).toContain('Taux fixe +10 ans 4,03');
    expect(txt).toContain('3.180 €'); // arrondi à 10 €
    expect(txt).toContain('ce n’est ni une offre ni votre taux');
    expect(txt).toContain('au-dessus du repère');
    expect(renderMensualite(600000, null, null, t, 'fr', [0.33, 0.4], [25])).toBe('');
  });
});
