import { describe, expect, it } from 'vitest';
import cantons from '../data/cantons.json';
import { resolveCommune, searchCommunes } from '../src/ui/combobox';

const NOMS = Object.entries(cantons).filter(([k]) => !k.startsWith('_')).flatMap(([, v]) => v as string[]);

describe('Recherche de commune', () => {
  it('« Duedelange » (ü écrit ue) et « Düdelingen » trouvent Dudelange', () => {
    expect(resolveCommune('Duedelange', NOMS)).toBe('Dudelange');
    expect(resolveCommune('Düdelingen', NOMS)).toBe('Dudelange');
  });
  it('« Kaerjeng » trouve Käerjeng, « Koerich » reste Koerich', () => {
    expect(resolveCommune('Kaerjeng', NOMS)).toBe('Käerjeng');
    expect(resolveCommune('Koerich', NOMS)).toBe('Koerich');
  });
  it('la recherche partielle marche toujours', () => {
    expect(searchCommunes('Esch', NOMS).map((m) => m.value)).toContain('Esch-sur-Alzette');
  });
});
