import fr from './fr.json';
import type { Lang } from '../shared/types';

export type Dict = typeof fr;

/** Le français est inclus ; l'allemand et l'anglais sont chargés seulement si besoin */
const DICTS: Partial<Record<Lang, Dict>> = { fr };

export async function loadLang(lang: Lang): Promise<void> {
  if (DICTS[lang]) return;
  DICTS[lang] = (lang === 'de' ? (await import('./de.json')).default : (await import('./en.json')).default) as Dict;
}

export function pickLang(v: string | null | undefined): Lang {
  return v === 'de' || v === 'en' ? v : 'fr';
}

export type T = (key: string, vars?: Record<string, string | number>) => string;

/** t('fields.surface'), t('progress', { n: 2, total: 6 }) – repli sur le français */
export function translator(lang: Lang): T {
  const get = (dict: unknown, key: string): unknown =>
    key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict);
  return (key, vars) => {
    let s = get(DICTS[lang] ?? DICTS.fr, key);
    if (typeof s !== 'string') s = get(DICTS.fr, key);
    if (typeof s !== 'string') return key;
    return vars ? (s as string).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : (s as string);
  };
}

export const LOCALES: Record<Lang, string> = { fr: 'fr-LU', de: 'de-LU', en: 'en-GB' };

/** « d’Esch-sur-Alzette », « de Capellen » en français ; le nom seul en allemand et en anglais */
export function deCanton(canton: string, lang: Lang): string {
  if (lang !== 'fr') return canton;
  return /^[aeiouyéèêh]/i.test(canton) ? `d’${canton}` : `de ${canton}`;
}
