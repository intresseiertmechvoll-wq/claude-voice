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
  type Source,
  type Submission,
} from './types';

export type ErrorCode = 'required' | 'invalid' | 'range' | 'email' | 'email_temp' | 'email_domain' | 'phone' | 'phone_fake' | 'rgpd';
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

const TEXT_MAX = { prenom: 80, nom: 80, rue: 160, message: 2000, email: 254, page: 500 };

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

/** Case à cocher facultative : absente = non */
function flag(v: unknown): boolean | ErrorCode {
  if (v === undefined || v === null || v === '' || v === false || v === 'non') return false;
  if (v === true || v === 'oui' || v === 'on') return true;
  return 'invalid';
}

const BIDI_CTRL = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

function optText(v: unknown, max: number, multiline = false): string | ErrorCode {
  if (v !== undefined && v !== null && typeof v !== 'string') return 'invalid';
  let s = str(v).replace(BIDI_CTRL, '');
  s = multiline
    ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n')
    : s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return s.length > max ? 'range' : s;
}

const NAME_RE = /^[\p{L}][\p{L}\p{M}'’ʼ .-]*$/u;
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
    // Luxembourg : pas de 0 initial ; mobiles = 9 chiffres commençant par 6 ; fixes = 6 à 8 chiffres
    if (digits.startsWith('0')) return 'phone';
    if (digits.startsWith('6')) return /^6\d{8}$/.test(digits) ? c + digits : 'phone';
    return digits.length >= 6 && digits.length <= 8 ? c + digits : 'phone';
  }
  if (digits.startsWith('0')) digits = digits.slice(1); // 06… en France, 04… en Belgique, 01… en Allemagne
  return digits.length >= 6 && digits.length <= 13 ? c + digits : 'phone';
}

/**
 * Numéro manifestement inventé (le format, lui, est déjà vérifié par normalizePhone).
 * Volontairement prudent : en cas de doute, le numéro est accepté. Refusés seulement :
 * - tous les chiffres après les 3 premiers identiques (621 000 000, 621 111 111), ou tout le numéro identique ;
 * - quelques numéros d'exemple bien connus (621 123 456, 06 12 34 56 78…).
 * Les suites (691 234 567) ne sont PAS refusées : de vrais numéros en sont une ; elles sont seulement
 * signalées à Jason dans l'e-mail (isSequencePhone).
 * Aucune liste de préfixes d'opérateurs.
 */
const EXAMPLE_PHONES = new Set(['+352621123456', '+352661123456', '+352691123456', '+33612345678', '+33123456789']);

function isRun(d: string): boolean {
  if (d.length < 6) return false;
  const step = Number(d[1]) - Number(d[0]);
  if (step !== 1 && step !== -1) return false;
  for (let i = 1; i < d.length; i++) if (Number(d[i]) - Number(d[i - 1]) !== step) return false;
  return true;
}

/** e164 : numéro rendu par normalizePhone ; code : l'indicatif choisi (+352…) */
export function isFakePhone(code: string, e164: string): boolean {
  if (EXAMPLE_PHONES.has(e164)) return true;
  const nsn = e164.slice(code.trim().length);
  const same = (d: string) => d.length >= 6 && /^(\d)\1+$/.test(d);
  return same(nsn) || same(nsn.slice(3));
}

/** Les 6 derniers chiffres forment une suite (234567, 987654) : accepté, mais « à vérifier » dans l'e-mail */
export function isSequencePhone(e164: string): boolean {
  const digits = e164.replace(/\D/g, '');
  return digits.length >= 8 && isRun(digits.slice(-6));
}

/** Domaines d'adresses e-mail jetables (liste courte, les plus connus) */
export const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
  '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'trashmail.de', 'getnada.com', 'maildrop.cc',
  'dispostable.com', 'throwawaymail.com', 'fakeinbox.com', 'mailnesia.com', 'jetable.org', 'mohmal.com',
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  return DISPOSABLE_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

/* ---------- Provenance (paramètres de campagne du lien), sans cookie ---------- */
export const SOURCE_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export const CLICK_IDS = ['gclid', 'fbclid', 'msclkid'] as const;

/** Garde seulement lettres sans accent, chiffres, espace, _ . - ; 60 caractères au plus */
export function cleanSourceValue(v: unknown): string {
  return typeof v === 'string' ? v.replace(/[^A-Za-z0-9 _.-]/g, '').trim().slice(0, 60).trim() : '';
}

/** Provenance propre : clés connues seulement ; identifiants de clic = simple présence (true), jamais la valeur */
export function sanitizeSource(raw: unknown): Source {
  const out: Source = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  for (const k of SOURCE_KEYS) {
    const v = cleanSourceValue(r[k]);
    if (v) out[k] = v;
  }
  for (const k of CLICK_IDS) if (r[k] === true) out[k] = true;
  return out;
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
    if (s.length > TEXT_MAX.email || !EMAIL_RE.test(s)) return 'email';
    return isDisposableEmail(s) ? 'email_temp' : s.toLowerCase();
  },
  indicatif: (r) => (/^\+[1-9]\d{0,3}$/.test(str(r.indicatif)) ? str(r.indicatif) : 'phone'),
  numero: (r) => {
    const p = normalizePhone(r.indicatif, r.numero);
    return p.startsWith('+') && isFakePhone(str(r.indicatif), p) ? 'phone_fake' : p;
  },
  message: (r) => optText(r.message, TEXT_MAX.message, true),
  rgpd: (r) => (r.rgpd === true || r.rgpd === 'on' ? true : 'rgpd'),
};
for (const p of POSTES_MAISON) CHECKS[`poste_${p}`] = (r) => oneOf(r[`poste_${p}`], POSTE_NOTES);

const ERROR_CODES = new Set<unknown>(['required', 'invalid', 'range', 'email', 'email_temp', 'email_domain', 'phone', 'phone_fake', 'rgpd']);
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
      source: sanitizeSource(b.source),
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
