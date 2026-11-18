/** Adresse : champ avec propositions (étape 1), notes du cadastre (étape 2), section des cartes officielles (résultat) */
import { describe, expect, it } from 'vitest';
import { loadLang, translator } from '../src/i18n';
import { estimate } from '../src/shared/engine';
import type { AddressDetails } from '../src/shared/types';
import { floodDepth, renderGeo, renderResult } from '../src/ui/result';
import { renderStep } from '../src/ui/steps';
import { apartment, DATA, house, PARAMS } from './helpers';

const t = translator('fr');
const ctx = (v: Record<string, unknown>, geo?: Record<string, string>) => ({ t, lang: 'fr' as const, v, e: {}, privacyUrl: '#', quickCommunes: [], geo });
const GEO: AddressDetails = {
  address: { label: '206, Route de Burange, L-3429 Dudelange', locality: 'Dudelange', zip: '3429', precise: true },
  parcel: { numero: '1329/5186', areaM2: 555.45 },
  building: { footprintM2: 125, adjacent: 0, typeSuggere: 'isolee' },
  flood: { hq100: null, hqext: null },
};

describe('Étape 1 : adresse facultative avec propositions', () => {
  it('Champ « Adresse (facultatif) » en combobox accessible, avec l’aide', () => {
    const html = renderStep(1, ctx({ type: 'maison' }));
    expect(html).toContain('Adresse <span class="optional">(facultatif)</span>');
    expect(html).toContain('Avec votre adresse, l’estimation est plus précise.');
    expect(html).toMatch(/id="rue"[^>]*role="combobox"[^>]*aria-autocomplete="list"[^>]*aria-expanded="false"[^>]*aria-controls="rue-list"/);
    expect(html).toContain('aria-describedby="rue-help"');
    expect(html).toContain('<ul id="rue-list" class="combo-inline" role="listbox" aria-labelledby="rue-label" hidden>');
    expect(html).toContain('id="rue-status" role="status"');
    expect(html).not.toContain('style=');
  });

  it('Adresse reconnue : confirmation sous le champ', () => {
    expect(renderStep(1, ctx({ rue: GEO.address!.label }, { found: t('fields.rueFound') }))).toContain('Adresse trouvée sur la carte officielle.');
  });
});

describe('Étape 2 : notes du plan cadastral (maisons)', () => {
  it('Terrain et type de maison : notes reliées aux champs', () => {
    const html = renderStep(
      2,
      ctx({ type: 'maison', terrain: '555', maisonType: 'isolee' }, { terrain: t('fields.geoTerrain', { m2: '555', parcelle: '1329/5186' }), maisonType: t('fields.geoMaisonType') }),
    );
    expect(html).toContain('Cadastre\u00a0: 555\u00a0m² (parcelle 1329/5186). Modifiable si le terrain comprend plusieurs parcelles.');
    expect(html).toContain('Détecté d’après le plan cadastral, à vérifier.');
    expect(html).toMatch(/id="terrain"[^>]*aria-describedby="terrain-help terrain-geo"/);
    expect(html).toContain('id="maisonType" data-field="maisonType" aria-describedby="maisonType-geo"');
  });

  it('Sans adresse : aucune note', () => {
    const html = renderStep(2, ctx({ type: 'maison' }));
    expect(html).not.toContain('geo-note');
    expect(html).not.toContain('Cadastre');
  });
});

describe('Résultat : votre adresse sur les cartes officielles', () => {
  it('Maison hors zone inondable : parcelle, bâtiment, sources', () => {
    const r = estimate(house(), DATA, PARAMS).result;
    const html = renderResult(r, t, 'fr', { contactUrl: '#', geo: GEO });
    expect(html).toContain('Votre adresse sur les cartes officielles');
    expect(html).toContain('206, Route de Burange, <span class="nowrap">L-3429</span> Dudelange');
    expect(html).toContain('Parcelle cadastrale 1329/5186\u00a0: 555\u00a0m²');
    expect(html).toContain('Emprise au sol du bâtiment\u00a0: 125\u00a0m²');
    expect(html).toContain('Hors zone inondable cartographiée (crue centennale et extrême)');
    expect(html).toContain('© ACT – plan cadastral (CC BY 4.0) · Cartes des zones inondables, Administration de la gestion de l’eau');
  });

  it('Appartement : rien sur la parcelle ni le bâtiment, seulement les zones inondables', () => {
    const r = estimate(apartment(), DATA, PARAMS).result;
    const geo: AddressDetails = { ...GEO, flood: { hq100: { river: 'Alzette', depth: '0 - 0.5 m' }, hqext: { river: 'Alzette', depth: '0.5 - 1.0 m' } } };
    const html = renderResult(r, t, 'fr', { contactUrl: '#', geo });
    expect(html).not.toContain('Parcelle');
    expect(html).not.toContain('Emprise');
    expect(html).toContain('Zone inondable (crue centennale) – Alzette, 0 – 0,5 m');
    expect(html).toContain('Zone inondable (crue extrême) – Alzette, 0,5 – 1,0 m');
  });

  it('Crue extrême seulement : formulation exacte, sans alarmisme', () => {
    const geo: AddressDetails = { ...GEO, flood: { hq100: null, hqext: { river: 'Alzette', depth: '0 - 0.5 m' } } };
    const html = renderGeo(geo, 'maison', t, 'fr');
    expect(html).toContain('Hors zone de crue centennale');
    expect(html).toContain('Zone inondable (crue extrême) – Alzette, 0 – 0,5 m');
    expect(html).not.toMatch(/danger|risque élevé|attention/i);
  });

  it('Rien si aucune adresse choisie, si elle est approximative ou si le géoportail n’a rien donné', () => {
    expect(renderResult(estimate(house(), DATA, PARAMS).result, t, 'fr', { contactUrl: '#' })).not.toContain('cartes officielles');
    expect(renderGeo(null, 'maison', t, 'fr')).toBe('');
    expect(renderGeo({ ...GEO, address: { ...GEO.address!, precise: false } }, 'maison', t, 'fr')).toBe('');
    expect(renderGeo({ address: GEO.address, parcel: null, building: null, flood: null }, 'maison', t, 'fr')).toBe('');
    // Appartement et zones inondables inconnues : rien à montrer
    expect(renderGeo({ ...GEO, flood: null }, 'appartement', t, 'fr')).toBe('');
  });

  it('Allemand et anglais', async () => {
    await loadLang('de');
    await loadLang('en');
    const de = renderGeo({ ...GEO, flood: { hq100: { river: 'Alzette', depth: '> 4.0 m' }, hqext: null } }, 'maison', translator('de'), 'de');
    expect(de).toContain('Ihre Adresse auf den amtlichen Karten');
    expect(de).toContain('Katasterparzelle 1329/5186: 555\u00a0m²');
    expect(de).toContain('Überschwemmungsgebiet (hundertjährliches Hochwasser) – Alzette, &gt; 4,0 m');
    const en = renderGeo(GEO, 'maison', translator('en'), 'en');
    expect(en).toContain('Your address on the official maps');
    expect(en).toContain('Outside the mapped flood zones (100-year and extreme flood)');
    expect(floodDepth('0 - 0.5 m', 'en')).toBe('0 – 0.5 m');
  });
});
