import { LOCALES } from '../i18n';
import type { Lang } from '../shared/types';

export function formatEuro(v: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}
