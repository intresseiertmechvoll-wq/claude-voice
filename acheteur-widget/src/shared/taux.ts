/**
 * Taux moyens des nouveaux crédits immobiliers au Luxembourg (BCL, publiés par la BCE).
 * Utilisés seulement pour une mensualité d'EXEMPLE, jamais comme offre.
 *
 * Séries BCE (MIR, Luxembourg, ménages, achat de logement, nouveaux contrats) :
 *  - F : taux variable ou fixé 1 an au plus
 *  - P : taux fixé plus de 10 ans
 * Contrôle du 18/11/2026 : septembre 2026 = 3,13 % (F) et 4,03 % (P), F identique au communiqué BCL du 03/11/2026.
 */

export interface Taux {
  /** % par an, ex. 3.13 */
  variable: number;
  fixe: number;
  /** mois des données, AAAA-MM */
  mois: string;
  /** d'où vient la valeur : « bce » (lue en direct) ou « secours » (valeur contrôlée de params.json) */
  origine: 'bce' | 'secours';
}

export const ECB_URL = 'https://data-api.ecb.europa.eu/service/data/MIR/M.LU.B.A2C.F+P.R.A.2250.EUR.N?lastNObservations=1&format=csvdata';

/** Limites de plausibilité : une valeur hors limites n'est jamais affichée */
export const PLAUSIBLE = { min: 0.5, max: 10, ecartMaxVariableFixe: 4 };
/** Les données d'un mois sont publiées environ 5 semaines plus tard ; au-delà de 4 mois d'âge, on n'affiche plus de mensualité */
export const AGE_MAX_MOIS = 4;

/** Nombre de mois entre « AAAA-MM » et une date */
export function ageMois(mois: string, today: Date): number {
  const m = /^(\d{4})-(\d{2})$/.exec(mois);
  if (!m) return Infinity;
  return (today.getUTCFullYear() - Number(m[1])) * 12 + (today.getUTCMonth() + 1 - Number(m[2]));
}

/** Vérifie des taux : plausibles et assez récents. Renvoie null sinon (la mensualité n'est alors pas affichée). */
export function checkTaux(t: Partial<Taux> | null | undefined, today: Date): Taux | null {
  if (!t || typeof t.variable !== 'number' || typeof t.fixe !== 'number' || typeof t.mois !== 'string') return null;
  const ok = (v: number) => Number.isFinite(v) && v >= PLAUSIBLE.min && v <= PLAUSIBLE.max;
  if (!ok(t.variable) || !ok(t.fixe) || Math.abs(t.fixe - t.variable) > PLAUSIBLE.ecartMaxVariableFixe) return null;
  const age = ageMois(t.mois, today);
  if (age < 0 || age > AGE_MAX_MOIS) return null;
  return { variable: t.variable, fixe: t.fixe, mois: t.mois, origine: t.origine === 'bce' ? 'bce' : 'secours' };
}

/** Lit la réponse CSV de la BCE (colonnes KEY, TIME_PERIOD, OBS_VALUE). Null si le format a changé. */
export function parseEcbCsv(csv: string): Omit<Taux, 'origine'> | null {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 3) return null;
  const head = lines[0].split(',');
  const iKey = head.indexOf('KEY');
  const iTime = head.indexOf('TIME_PERIOD');
  const iVal = head.indexOf('OBS_VALUE');
  if (iKey < 0 || iTime < 0 || iVal < 0) return null;
  const rows = new Map<string, { mois: string; v: number }>();
  for (const line of lines.slice(1)) {
    // Les titres contiennent des virgules entre guillemets : on ne lit que les premières colonnes, avant tout guillemet
    const cells = line.split(',');
    const key = cells[iKey];
    const serie = key === 'MIR.M.LU.B.A2C.F.R.A.2250.EUR.N' ? 'variable' : key === 'MIR.M.LU.B.A2C.P.R.A.2250.EUR.N' ? 'fixe' : null;
    if (!serie) continue;
    const v = Number(cells[iVal]);
    if (cells[iVal] === '' || !Number.isFinite(v)) return null;
    rows.set(serie, { mois: cells[iTime], v });
  }
  const variable = rows.get('variable');
  const fixe = rows.get('fixe');
  // Les deux séries doivent porter sur le même mois
  if (!variable || !fixe || variable.mois !== fixe.mois) return null;
  return { variable: variable.v, fixe: fixe.v, mois: variable.mois };
}

/** Mensualité d'un prêt amortissable (hors assurance), taux annuel en % */
export function mensualite(pret: number, tauxAnnuel: number, annees: number): number {
  const n = annees * 12;
  const r = tauxAnnuel / 100 / 12;
  if (pret <= 0) return 0;
  if (r === 0) return pret / n;
  return (pret * r) / (1 - Math.pow(1 + r, -n));
}

/** Bornes de revenu des tranches (null = ouverte) */
export const REVENU_BORNES: Record<string, [number | null, number | null]> = {
  moins_4000: [null, 4000],
  '4000_6000': [4000, 6000],
  '6000_8000': [6000, 8000],
  '8000_10000': [8000, 10000],
  '10000_14000': [10000, 14000],
  plus_14000: [14000, null],
};

/** Part du revenu (fourchette) que représente une mensualité ; null si pas de revenu donné */
export function partRevenu(mens: number, revenu: string | null | undefined): { min: number | null; max: number | null } | null {
  const b = revenu ? REVENU_BORNES[revenu] : undefined;
  if (!b) return null;
  return { min: b[1] ? mens / b[1] : null, max: b[0] ? mens / b[0] : null };
}
