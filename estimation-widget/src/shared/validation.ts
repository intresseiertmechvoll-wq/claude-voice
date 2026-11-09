/**
 * Vérification des réponses. Le même code tourne dans le navigateur (aide à la
 * saisie) et sur le serveur (seule vérification qui compte).
 */
import { COMMUNE_NAMES } from './communes';
import {
  DELAIS,
  ENERGIES,
  ETATS,
  MAISON_TYPES,
  OBJECTIFS,
  POSTES_APPARTEMENT,
  POSTES_MAISON,
  POSTE_NOTES,
  type Answers,
  type Lang,
  type Submission,
} from './types';

export type ErrorCode = 'required' | 'invalid' | 'range' | 'email' | 'phone' | 'rgpd';
export type Errors = Record<string, ErrorCode>;

/** Données brutes telles qu'envoyées par le formulaire */
export type Raw = Record<string, unknown>;

export const LIMITS = {
  surface: { min: 10, max: 1000 },
  chambres: { min: 0, max: 20 },
  sdb: { min: 0, max: 10 },
  // L'année maximale est calculée à chaque vérification (voir maxYear) : sur Cloudflare,
  // new Date() au chargement du module renvoie 1970.
  annee: { min: 1700, max: 0 },
  terrain: { min: 0, max: 100000 },
  garages: { min: 0, max: 20 },
  parkings: { min: 0, max: 20 },
  terrasse: { min: 0, max: 1000 },
  etage: { min: 0, max: 5 },
};

/** Année de construction maximale : année en cours + 5 (projets en VEFA) */
export function maxYear(): number {
  return new Date().getFullYear() + 5;
}

export const PHONE_CODES = ['+352', '+33', '+32', '+49', '+41', '+31', '+351', '+39', '+34', '+44'];

const TEXT_MAX = { prenom: 80, nom: 80, rue: 120, message: 2000, email: 254, page: 500 };

/** Champs demandés à chaque étape (1 à 6) */
export function stepFields(step: number, type: unknown): string[] {
  const isHouse = type === 'maison';
  switch (step) {
    case 1:
      return ['type', 'commune', 'rue'];
    case 2:
      return ['surface', 'chambres', 'sdb', 'annee', 'etat', 'energie', ...(isHouse ? ['terrain', 'maisonType'] : ['etage', 'ascenseur'])];
    case 3:
      return (isHouse ? POSTES_MAISON : POSTES_APPARTEMENT).map((p) => `poste_${p}`);
    case 4:
      return ['garages', 'parkings', 'cave', 'terrasse', 'jardin'];
    case 5:
      return ['proprietaire', 'objectif', 'delai'];
    case 6:
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
  const s = str(v).replace(',', '.');
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

/** Case à cocher facultative : absente = non */
function flag(v: unknown): boolean | ErrorCode {
  if (v === undefined || v === null || v === '' || v === false || v === 'non') return false;
  if (v === true || v === 'oui' || v === 'on') return true;
  return 'invalid';
}

function optText(v: unknown, max: number): string | ErrorCode {
  if (v !== undefined && v !== null && typeof v !== 'string') return 'invalid';
  const s = str(v);
  return s.length > max ? 'range' : s;
}

const NAME_RE = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

function nameField(v: unknown, max: number): string | ErrorCode {
  const s = str(v);
  if (s === '') return 'required';
  if (s.length > max || !NAME_RE.test(s)) return 'invalid';
  return s;
}

/** Vérifie un numéro : chiffres seulement (espaces, points et tirets acceptés) */
export function normalizePhone(code: unknown, number: unknown): string | ErrorCode {
  const c = str(code);
  const n = str(number).replace(/[\s.\-/()]/g, '');
  if (n === '') return 'required';
  if (!/^\+[1-9]\d{0,3}$/.test(c)) return 'phone';
  let digits = n;
  if (digits.startsWith('00')) return 'phone';
  if (digits.startsWith('+')) return 'phone';
  if (c !== '+352' && digits.startsWith('0')) digits = digits.slice(1); // 06… en France, 04… en Belgique, 01… en Allemagne
  if (!/^\d+$/.test(digits)) return 'phone';
  if (c === '+352') {
    // Luxembourg : fixes de 6 à 8 chiffres, mobiles de 9 chiffres commençant par 6
    if (!(digits.length >= 6 && digits.length <= 8) && !/^6\d{8}$/.test(digits)) return 'phone';
  } else if (digits.length < 6 || digits.length > 13) {
    return 'phone';
  }
  return c + digits;
}

type FieldCheck = (raw: Raw) => unknown;

const CHECKS: Record<string, FieldCheck> = {
  type: (r) => oneOf(r.type, ['appartement', 'maison'] as const),
  commune: (r) => {
    const s = str(r.commune);
    if (s === '') return 'required';
    return COMMUNE_NAMES.has(s) ? s : 'invalid';
  },
  rue: (r) => optText(r.rue, TEXT_MAX.rue),
  surface: (r) => numIn(r.surface, LIMITS.surface),
  chambres: (r) => intIn(r.chambres, LIMITS.chambres),
  sdb: (r) => intIn(r.sdb, LIMITS.sdb),
  annee: (r) => intIn(r.annee, { min: LIMITS.annee.min, max: maxYear() }),
  etat: (r) => oneOf(r.etat, ETATS),
  energie: (r) => oneOf(r.energie, ENERGIES),
  etage: (r) => intIn(r.etage, LIMITS.etage),
  ascenseur: (r) => yesNo(r.ascenseur),
  terrain: (r) => numIn(r.terrain, LIMITS.terrain),
  maisonType: (r) => oneOf(r.maisonType, MAISON_TYPES),
  garages: (r) => (str(r.garages) === '' ? 0 : intIn(r.garages, LIMITS.garages)),
  parkings: (r) => (str(r.parkings) === '' ? 0 : intIn(r.parkings, LIMITS.parkings)),
  cave: (r) => flag(r.cave),
  terrasse: (r) => (str(r.terrasse) === '' ? 0 : numIn(r.terrasse, LIMITS.terrasse)),
  jardin: (r) => flag(r.jardin),
  proprietaire: (r) => yesNo(r.proprietaire),
  objectif: (r) => oneOf(r.objectif, OBJECTIFS),
  delai: (r) => oneOf(r.delai, DELAIS),
  prenom: (r) => nameField(r.prenom, TEXT_MAX.prenom),
  nom: (r) => nameField(r.nom, TEXT_MAX.nom),
  email: (r) => {
    const s = str(r.email);
    if (s === '') return 'required';
    return s.length <= TEXT_MAX.email && EMAIL_RE.test(s) ? s.toLowerCase() : 'email';
  },
  indicatif: (r) => (/^\+[1-9]\d{0,3}$/.test(str(r.indicatif)) ? str(r.indicatif) : 'phone'),
  numero: (r) => normalizePhone(r.indicatif, r.numero),
  message: (r) => optText(r.message, TEXT_MAX.message),
  rgpd: (r) => (r.rgpd === true || r.rgpd === 'on' ? true : 'rgpd'),
};
for (const p of POSTES_MAISON) CHECKS[`poste_${p}`] = (r) => oneOf(r[`poste_${p}`], POSTE_NOTES);

const ERROR_CODES = new Set<unknown>(['required', 'invalid', 'range', 'email', 'phone', 'rgpd']);
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
  if (str(b.website) !== '') return { ok: false, errors: { form: 'invalid' }, bot: true };

  const raw: Raw = { ...(b.answers as Raw), ...(b.contact as Raw) };
  if (typeof b.answers !== 'object' || typeof b.contact !== 'object') return { ok: false, errors: { form: 'invalid' } };

  const fields = [1, 2, 3, 4, 5, 6].flatMap((s) => stepFields(s, raw.type));
  const { values: v, errors } = checkFields(raw, fields);
  if (Object.keys(errors).length) return { ok: false, errors };

  const isHouse = v.type === 'maison';
  const postes: Answers['postes'] = {};
  for (const p of isHouse ? POSTES_MAISON : POSTES_APPARTEMENT) postes[p] = v[`poste_${p}`] as Answers['postes'][typeof p];

  const lang: Lang = b.lang === 'de' || b.lang === 'en' ? b.lang : 'fr';
  const page = str(b.page);
  const safePage = page.length <= TEXT_MAX.page && /^https?:\/\/[^\s<>"]+$/.test(page) ? page : '';

  return {
    ok: true,
    value: {
      lang,
      page: safePage,
      answers: {
        type: v.type as Answers['type'],
        commune: v.commune as string,
        rue: v.rue as string,
        surface: v.surface as number,
        chambres: v.chambres as number,
        sdb: v.sdb as number,
        annee: v.annee as number,
        etat: v.etat as Answers['etat'],
        energie: v.energie as Answers['energie'],
        etage: isHouse ? null : (v.etage as number),
        ascenseur: isHouse ? null : (v.ascenseur as boolean),
        terrain: isHouse ? (v.terrain as number) : null,
        maisonType: isHouse ? (v.maisonType as Answers['maisonType']) : null,
        postes,
        garages: v.garages as number,
        parkings: v.parkings as number,
        cave: v.cave as boolean,
        terrasse: v.terrasse as number,
        jardin: v.jardin as boolean,
        proprietaire: v.proprietaire as boolean,
        objectif: v.objectif as Answers['objectif'],
        delai: v.delai as Answers['delai'],
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
