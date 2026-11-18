import { LOCALES } from '../i18n';
import type { Lang } from '../shared/types';

export function formatEuro(v: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

/** « 1er juillet 2025 », « 30. Juni 2026 », « 1 July 2025 » */
export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  const out = new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return lang === 'fr' ? out.replace(/^1 /, '1er ') : out;
}
