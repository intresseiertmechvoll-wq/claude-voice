import { describe, expect, it } from 'vitest';
import { extraireAthome, extraireWortimmo, portailDe } from '../src/marche/portails';

/* Pages réduites, construites sur le modèle des vraies pages du 18/11/2026 (sans nom d'agence). */

const athome = (listings: unknown[], extra = '') =>
  `<html><head><link href="https://www.athome.lu/x"></head><body><script>window.__INITIAL_STATE__=${JSON.stringify({
    config: { suggestedServices: '__U__' },
    search: { total: 463, paginator: { articlesForPage: 20, totalPages: 24 }, queryFilters: { page: 3 }, listings },
  }).replace('"__U__"', 'undefined')};</script>${extra}</body></html>`;

const listing = (o: Record<string, unknown> = {}) => ({
  id: 9378787,
  typeKey: 'house',
  transaction: 'rent',
  isPriceOnDemand: false,
  price: 2800,
  createdAt: '20261012T082410Z',
  permalink: { fr: '/location/maison/clervaux/id-9378787.html' },
  characteristic: { bedrooms: 3, surface: 123 },
  address: { city: 'Clervaux', country: 'Luxembourg' },
  contact: { name: 'NE PAS LIRE' },
  ...o,
});

describe('atHome : lecture des données de la page', () => {
  it('lit loyer, surface, chambres, localité, pays, lien et date de mise en ligne', () => {
    const p = extraireAthome(athome([listing()]));
    expect(p).toMatchObject({ page: 3, pages: 24, total: 463 });
    expect(p.annonces).toEqual([
      {
        loyer: 2800,
        surface: 123,
        chambres: 3,
        type: 'house',
        localite: 'Clervaux',
        pays: 'LU',
        url: 'https://www.athome.lu/location/maison/clervaux/id-9378787.html',
        publiee_le: '2026-10-12',
      },
    ]);
    expect(JSON.stringify(p)).not.toContain('NE PAS LIRE');
  });

  it('surface décimale arrondie, surface 0 = inconnue, pays étranger, prix sur demande ignoré', () => {
    const p = extraireAthome(
      athome([
        listing({ characteristic: { bedrooms: 4, surface: 308.2 } }),
        listing({ characteristic: { bedrooms: 4, surface: 0 } }),
        listing({ address: { city: 'Freistroff', country: 'France' } }),
        listing({ isPriceOnDemand: true }),
        listing({ transaction: 'sell' }),
      ]),
    );
    expect(p.annonces.map((a) => [a.surface, a.pays])).toEqual([
      [308, 'LU'],
      [null, 'LU'],
      [123, 'FR'],
    ]);
  });

  it('page sans données : erreur claire (format changé)', () => {
    expect(() => extraireAthome('<html>athome.lu</html>')).toThrow(/introuvables/);
  });

  it('reconnaît le portail', () => {
    expect(portailDe(athome([listing()]))).toBe('athome');
  });
});

const fiche = (id: number, titre: string, prix: string, surface: string | null, region = 'sud', slug = 'maison') =>
  `<div class="hidden-xs clearfix show" id="obj_${id}_content"></div><p class="serp-agency-title">AGENCE A NE PAS LIRE</p>` +
  `<h2><a href="https://www.wortimmo.lu/fr/location-${slug}-${region}-x-id_${id}" data-search-page="1" class="js-ad-click">${titre}</a></h2>` +
  `<div class="black-84 size24 price-property-box-8">\n   ${prix}\n</div>` +
  (surface ? `<div class="serp-ads-dimension"><p class="serp-ads-d-i">${surface}m<sup>2</sup></p></div>` : '');

const wortimmo = (fiches: string[], suivante = true) =>
  `<html><head>${suivante ? '<link rel="next" href="https://www.wortimmo.lu/fr/location/maison?page=3">' : ''}</head><body>wortimmo.lu ${fiches.join('')}</body></html>`;

describe('wortimmo : lecture des fiches de la liste', () => {
  it('lit loyer, surface, chambres, type, localité, pays (d’après la région du lien), page suivante', () => {
    const p = extraireWortimmo(
      wortimmo([
        fiche(1, 'Maison 3 chambre(s) à louer à Bettange-sur-Mess', '3 500 €', '260', 'ouest'),
        fiche(2, 'Maison individuelle 4 chambre(s) à louer à Strassen', '5 200 €', '240', 'centre', 'maison-individuelle'),
        fiche(3, 'Maison 3 chambre(s) à louer à Trier', '1 790 €', '160', 'rheinland-pfalz'),
        fiche(4, 'Maison de maître à louer à Schengen', '2 500 €', '200', 'est', 'maison-de-maitre'),
        fiche(5, 'Maison 2 chambre(s) à louer à Vichten', 'Prix sur demande', '100', 'ouest'),
      ]),
      2,
    );
    expect(p.annonces.map((a) => [a.loyer, a.surface, a.chambres, a.type, a.localite, a.pays])).toEqual([
      [3500, 260, 3, 'Maison', 'Bettange-sur-Mess', 'LU'],
      [5200, 240, 4, 'Maison individuelle', 'Strassen', 'LU'],
      [1790, 160, 3, 'Maison', 'Trier', 'DE'],
      [2500, 200, null, 'Maison de maître', 'Schengen', 'LU'],
    ]);
    expect(p).toMatchObject({ page: 2, pages: 3, suivante: 'https://www.wortimmo.lu/fr/location/maison?page=3' });
    expect(JSON.stringify(p)).not.toContain('AGENCE');
    expect(portailDe(wortimmo([fiche(1, 'Maison à louer à Syren', '2 900 €', '185')]))).toBe('wortimmo');
  });

  it('dernière page : pas de page suivante ; surface absente = inconnue', () => {
    const p = extraireWortimmo(wortimmo([fiche(9, 'Maison 3 chambre(s) à louer à Syren', '2 900 €', null, 'centre')], false), 4);
    expect(p).toMatchObject({ page: 4, pages: 4, suivante: null });
    expect(p.annonces[0].surface).toBeNull();
  });

  it('page sans fiche : erreur claire (format changé)', () => {
    expect(() => extraireWortimmo('<html>wortimmo.lu</html>')).toThrow(/format/);
  });
});
