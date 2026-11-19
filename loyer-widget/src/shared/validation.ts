/**
 * Vérification des réponses. Le même code tourne dans le navigateur (aide à la
 * saisie) et sur le serveur (seule vérification qui compte).
 */
import { COMMUNE_NAMES } from './communes';
import {
  DISPONIBILITES,
  ENERGIES,
  ETATS,
  EXTERIEURS,
  GESTIONS,
  type Answers,
  type Lang,
  type Submission,
} from './types';

export type ErrorCode = 'required' | 'invalid' | 'range' | 'email' | 'phone' | 'phone_pays' | 'rgpd';
export type Errors = Record<string, ErrorCode>;

/** Données brutes telles qu'envoyées par le formulaire */
export type Raw = Record<string, unknown>;

export const LIMITS = {
  surface: { min: 10, max: 1000 },
  chambres: { min: 0, max: 20 },
  garages: { min: 0, max: 10 },
  parkings: { min: 0, max: 10 },
  etage: { min: 0, max: 5 },
};

export const PHONE_CODES = ['+352', '+33', '+32', '+49', '+41', '+31', '+351', '+39', '+34', '+44'];

const TEXT_MAX = { prenom: 80, nom: 80, message: 2000, email: 254, page: 500 };

export const TOTAL_STEPS = 4;

/** Champs demandés à chaque étape (1 à 4) */
export function stepFields(step: number, type: unknown): string[] {
  const isHouse = type === 'maison';
  switch (step) {
    case 1:
      return ['type', 'commune', 'surface', 'chambres'];
    case 2:
      return ['etat', 'energie', 'meuble', 'exterieur', 'garages', 'parkings', ...(isHouse ? [] : ['etage', 'ascenseur'])];
    case 3:
      return ['proprietaire', 'dejaLoue', 'gestion', 'disponibilite'];
    case 4:
      return ['prenom', 'nom', 'email', 'indicatif', 'numero', 'message', 'rgpd'];
    default:
      return [];
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}

function intIn(v: unknown, lim: { min: number; max: number }): number | ErrorCode {
  const s = str(v);
  if (s === '') return 'required';
  if (!/^\d+$/.test(s)) return 'invalid';
  const n = Number(s);
  return n < lim.min || n > lim.max ? 'range' : n;
}

function numIn(v: unknown, lim: { min: number; max: number }): number | ErrorCode {
  // Tolérant : « 80m2 », « 80 m² », « 1 200 », « 80,5 »
  const s = str(v).replace(/\s*m(?:2|²)$/i, '').replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (s === '') return 'required';
  if (!/^\d+(\.\d+)?$/.test(s)) return 'invalid';
  const n = Number(s);
  return n < lim.min || n > lim.max ? 'range' : n;
}

function oneOf<T extends string>(v: unknown, list: readonly T[]): T | ErrorCode {
  const s = str(v);
  if (s === '') return 'required';
  return (list as readonly string[]).includes(s) ? (s as T) : 'invalid';
}

function yesNo(v: unknown): boolean | ErrorCode {
  if (v === true || v === 'oui') return true;
  if (v === false || v === 'non') return false;
  return v === undefined || v === null || v === '' ? 'required' : 'invalid';
}

/** Caractères invisibles : sens d'écriture, largeur nulle, séparateurs de ligne Unicode, BOM */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
const LINE_SEP = /[\u2028\u2029\u0085]/g;

function optText(v: unknown, max: number, multiline = false): string | ErrorCode {
  if (v !== undefined && v !== null && typeof v !== 'string') return 'invalid';
  let s = str(v).replace(INVISIBLE, '');
  s = multiline
    ? s.replace(LINE_SEP, '\n').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n')
    : s.replace(LINE_SEP, ' ').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return s.length > max ? 'range' : s;
}

const NAME_RE = /^[\p{L}][\p{L}\p{M}'’ʼ .-]*$/u;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"\u200b-\u200f\u2060-\u2064\ufeff]+@[^\s@<>()[\]\\,;:"\u200b-\u200f\u2060-\u2064\ufeff]+\.[A-Za-z]{2,}$/;

function nameField(v: unknown, max: number): string | ErrorCode {
  const s = str(v).replace(INVISIBLE, '');
  if (s === '') return 'required';
  if (s.length > max || !NAME_RE.test(s)) return 'invalid';
  return s;
}

/** Vérifie un numéro : chiffres seulement (espaces, points et tirets acceptés) */
export function normalizePhone(code: unknown, number: unknown): string | ErrorCode {
  const c = str(code);
  let digits = str(number).replace(/[\s.\-/()\u00a0]/g, '');
  if (digits === '') return 'required';
  if (!/^\+[1-9]\d{0,3}$/.test(c)) return 'phone';
  const cc = c.slice(1);
  // Indicatif recopié dans le numéro (« +352 621… », « 00352 621… », « 352621… ») : on le retire
  if (digits.startsWith('+')) {
    if (!digits.startsWith('+' + cc)) return 'phone';
    digits = digits.slice(1 + cc.length);
  } else if (digits.startsWith('00')) {
    if (!digits.startsWith('00' + cc)) return 'phone';
    digits = digits.slice(2 + cc.length);
  } else if (c === '+352' && digits.startsWith('352') && digits.length >= 9) {
    digits = digits.slice(3);
  }
  if (!/^\d+$/.test(digits)) return 'phone';
  if (c === '+352') {
    // Luxembourg : pas de 0 initial ; fixes = 6 à 8 chiffres (pas de 1 initial : numéros spéciaux) ;
    // mobiles = 9 chiffres, uniquement dans les plages attribuées (ILR, plan national de numérotation,
    // plages utilisées depuis octobre 2025) : à compléter si l'ILR en ouvre une nouvelle.
    // Numéro étranger tapé avec +352 (fréquent chez les frontaliers) : on le dit clairement
    if (/^0[67]\d{8}$|^04\d{8}$|^01[5-7]\d{7,9}$/.test(digits)) return 'phone_pays';
    if (/^[01]/.test(digits)) return 'phone';
    if (digits.startsWith('6')) return /^6\d{8}$/.test(digits) && MOBILES_LU.includes(digits.slice(0, 3)) && !numeroFactice(digits) ? c + digits : 'phone';
    return digits.length >= 6 && digits.length <= 8 && !numeroFactice(digits) ? c + digits : 'phone';
  }
  if (digits.startsWith('0')) digits = digits.slice(1); // 06… en France, 04… en Belgique, 01… en Allemagne
  if (digits.startsWith('0') || numeroFactice(digits)) return 'phone';
  const [min, max] = LONGUEURS[c] ?? [6, 13];
  return digits.length >= min && digits.length <= max ? c + digits : 'phone';
}

/** Plages mobiles luxembourgeoises attribuées (ILR, consulté le 18/11/2026) */
export const MOBILES_LU = ['621', '628', '651', '655', '658', '661', '668', '671', '678', '681', '691', '692', '698'];

/** Longueur du numéro national sans le 0 initial, par indicatif */
const LONGUEURS: Record<string, [number, number]> = {
  '+33': [9, 9], // France
  '+32': [8, 9], // Belgique
  '+49': [6, 11], // Allemagne
  '+31': [9, 9], // Pays-Bas
  '+351': [9, 9], // Portugal
  '+41': [9, 9], // Suisse
  '+34': [9, 9], // Espagne
  '+39': [6, 11], // Italie
  '+44': [9, 10], // Royaume-Uni
};

/**
 * Numéros manifestement inventés : tous les chiffres identiques (« 000000 »), les 6 derniers identiques
 * (« 621 000 000 »), ou une suite de chiffres qui se suivent (« 123456 », « 6 12345678 », « 987654 »).
 */
export function numeroFactice(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits) || /(\d)\1{5}$/.test(digits)) return true;
  const suite = (d: string) => d.length >= 6 && [1, -1].some((pas) => [...d].every((x, i) => i === 0 || Number(x) === (Number(d[i - 1]) + pas + 10) % 10));
  return suite(digits) || suite(digits.slice(1));
}

type FieldCheck = (raw: Raw) => unknown;

const CHECKS: Record<string, FieldCheck> = {
  type: (r) => oneOf(r.type, ['appartement', 'maison'] as const),
  commune: (r) => {
    const s = str(r.commune);
    if (s === '') return 'required';
    return COMMUNE_NAMES.has(s) ? s : 'invalid';
  },
  surface: (r) => numIn(r.surface, LIMITS.surface),
  chambres: (r) => intIn(r.chambres, LIMITS.chambres),
  etat: (r) => oneOf(r.etat, ETATS),
  energie: (r) => oneOf(r.energie, ENERGIES),
  meuble: (r) => yesNo(r.meuble),
  exterieur: (r) => oneOf(r.exterieur, EXTERIEURS),
  garages: (r) => (str(r.garages) === '' ? 0 : intIn(r.garages, LIMITS.garages)),
  parkings: (r) => (str(r.parkings) === '' ? 0 : intIn(r.parkings, LIMITS.parkings)),
  etage: (r) => intIn(r.etage, LIMITS.etage),
  ascenseur: (r) => yesNo(r.ascenseur),
  proprietaire: (r) => yesNo(r.proprietaire),
  dejaLoue: (r) => yesNo(r.dejaLoue),
  gestion: (r) => oneOf(r.gestion, GESTIONS),
  disponibilite: (r) => oneOf(r.disponibilite, DISPONIBILITES),
  prenom: (r) => nameField(r.prenom, TEXT_MAX.prenom),
  nom: (r) => nameField(r.nom, TEXT_MAX.nom),
  email: (r) => {
    const s = str(r.email);
    if (s === '') return 'required';
    return s.length <= TEXT_MAX.email && EMAIL_RE.test(s) ? s.toLowerCase() : 'email';
  },
  indicatif: (r) => (/^\+[1-9]\d{0,3}$/.test(str(r.indicatif)) ? str(r.indicatif) : 'phone'),
  numero: (r) => normalizePhone(r.indicatif, r.numero),
  message: (r) => optText(r.message, TEXT_MAX.message, true),
  rgpd: (r) => (r.rgpd === true || r.rgpd === 'on' ? true : 'rgpd'),
};

const ERROR_CODES = new Set<unknown>(['required', 'invalid', 'range', 'email', 'phone', 'phone_pays', 'rgpd']);
const isError = (v: unknown): v is ErrorCode => typeof v === 'string' && ERROR_CODES.has(v);

/** Vérifie une liste de champs. Renvoie les valeurs propres et les erreurs. */
export function checkFields(raw: Raw, fields: string[]): { values: Record<string, unknown>; errors: Errors } {
  const values: Record<string, unknown> = {};
  const errors: Errors = {};
  for (const f of fields) {
    const check = CHECKS[f];
    if (!check) continue;
    const v = check(raw);
    if (isError(v)) errors[f] = v;
    else values[f] = v;
  }
  return { values, errors };
}

export type ValidationResult =
  | { ok: true; value: Submission }
  | { ok: false; errors: Errors; bot?: boolean };

/** Vérification complète d'un envoi (côté serveur) */
export function validateSubmission(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: { form: 'invalid' } };
  const b = body as Raw;
  // Honeypot : champ invisible pour un humain. S'il est rempli, c'est un robot.
  const hp = b.website;
  if (hp !== undefined && hp !== null && !(typeof hp === 'string' && hp.trim() === '')) return { ok: false, errors: { form: 'invalid' }, bot: true };

  if (!b.answers || typeof b.answers !== 'object' || !b.contact || typeof b.contact !== 'object') return { ok: false, errors: { form: 'invalid' } };
  const raw: Raw = { ...(b.answers as Raw), ...(b.contact as Raw) };

  const fields = [1, 2, 3, 4].flatMap((s) => stepFields(s, raw.type));
  const { values: v, errors } = checkFields(raw, fields);
  if (Object.keys(errors).length) return { ok: false, errors };

  const isHouse = v.type === 'maison';
  const lang: Lang = b.lang === 'de' || b.lang === 'en' ? b.lang : 'fr';
  const page = str(b.page);
  const safePage = page.length <= TEXT_MAX.page && /^https?:\/\/[^\s<>"]+$/.test(page) ? page : '';
  const essai = typeof b.essai === 'number' && Number.isInteger(b.essai) && b.essai >= 1 && b.essai <= 50 ? b.essai : 1;

  return {
    ok: true,
    value: {
      lang,
      page: safePage,
      essai,
      answers: {
        type: v.type as Answers['type'],
        commune: v.commune as string,
        surface: v.surface as number,
        chambres: v.chambres as number,
        etat: v.etat as Answers['etat'],
        energie: v.energie as Answers['energie'],
        meuble: v.meuble as boolean,
        exterieur: v.exterieur as Answers['exterieur'],
        garages: v.garages as number,
        parkings: v.parkings as number,
        etage: isHouse ? null : (v.etage as number),
        ascenseur: isHouse ? null : (v.ascenseur as boolean),
        proprietaire: v.proprietaire as boolean,
        dejaLoue: v.dejaLoue as boolean,
        gestion: v.gestion as Answers['gestion'],
        disponibilite: v.disponibilite as Answers['disponibilite'],
      },
      contact: {
        prenom: v.prenom as string,
        nom: v.nom as string,
        email: v.email as string,
        telephone: v.numero as string,
        message: v.message as string,
      },
    },
  };
}
