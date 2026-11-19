/**
 * Vérification des réponses. Le même code tourne dans le navigateur (aide à la
 * saisie) et sur le serveur (seule vérification qui compte).
 */
import { COMMUNE_NAMES } from './communes';
import {
  ACHATS,
  BANQUE,
  BELLEGEN,
  CAPACITE,
  DELAIS,
  EXTERIEURS,
  MANDAT,
  NEUF,
  PREMIER,
  RENOVER,
  REVENUS,
  TYPES,
  USAGES,
  VENDRE,
  VISITES,
  type Answers,
  type BudgetInput,
  type Lang,
  type Submission,
} from './types';

export type ErrorCode = 'required' | 'invalid' | 'range' | 'email' | 'emailTypo' | 'phone' | 'rgpd' | 'communes_max';
export type Errors = Record<string, ErrorCode>;

/** Données brutes telles qu'envoyées par le formulaire */
export type Raw = Record<string, unknown>;

export const LIMITS = {
  chambres: { min: 0, max: 6 },
  surface: { min: 15, max: 2000 },
  apport: { min: 0, max: 20_000_000 },
  prix: { min: 50_000, max: 20_000_000 },
  capaciteMontant: { min: 10_000, max: 20_000_000 },
  valeurVente: { min: 20_000, max: 20_000_000 },
  restePret: { min: 0, max: 20_000_000 },
  communes: 3,
};

export const PHONE_CODES = ['+352', '+33', '+32', '+49', '+41', '+31', '+351', '+39', '+34', '+44'];

const TEXT_MAX = { prenom: 80, nom: 80, note: 300, message: 2000, email: 254, page: 500 };

export const TOTAL_STEPS = 5;

/** Champs demandés à chaque étape (1 à 5). Pour un investissement, « premier achat » et « Bëllegen Akt » ne changent rien : on ne les demande pas. */
export function stepFields(step: number, raw: Raw = {}): string[] {
  switch (step) {
    case 1:
      return raw.usage === 'investir' ? ['usage', 'achat', 'vendre'] : ['usage', 'achat', 'premier', 'bellegen', 'vendre'];
    case 2:
      return ['type', 'neuf', 'communes', 'chambres', 'surface', 'exterieur', 'garage', 'renover', 'note'];
    case 3:
      return ['apport', 'prix', 'valeurVente', 'restePret', 'banque', 'capacite', 'capaciteMontant', 'revenu', 'courtier', 'prixDepart', 'apportDepart'];
    case 4:
      return ['delai', 'visites', 'mandat'];
    case 5:
      return ['prenom', 'nom', 'email', 'indicatif', 'numero', 'message', 'alerte', 'rgpd'];
    default:
      return [];
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}

const isEmpty = (v: unknown) => v === undefined || v === null || str(v) === '';

function intIn(v: unknown, lim: { min: number; max: number }): number | ErrorCode {
  const s = str(v);
  if (s === '') return 'required';
  if (!/^\d+$/.test(s)) return 'invalid';
  const n = Number(s);
  return n < lim.min || n > lim.max ? 'range' : n;
}

/** Montant en euros, tolérant : « 60 000 », « 60.000 € », « 60'000 », « 60k », « 1,2 M » */
export function parseMoney(v: unknown): number | null {
  let s = str(v).toLowerCase().replace(/€|eur(os)?/g, '').replace(/[\s  '’]/g, '');
  if (s === '') return null;
  const mult = s.endsWith('k') ? 1000 : s.endsWith('m') || s.endsWith('mio') ? 1_000_000 : 1;
  if (mult !== 1) {
    s = s.replace(/(k|mio|m)$/, '').replace(',', '.');
    return /^\d+(\.\d+)?$/.test(s) ? Math.round(Number(s) * mult) : NaN;
  }
  // Points et virgules suivis de 3 chiffres = séparateurs de milliers ; centimes ignorés
  s = s.replace(/[.,](?=\d{3}(?:[.,]|$))/g, '').replace(/[.,]\d{1,2}$/, '');
  return /^\d+$/.test(s) ? Number(s) : NaN;
}

function money(v: unknown, lim: { min: number; max: number }): number | ErrorCode {
  const n = parseMoney(v);
  if (n === null) return 'required';
  if (!Number.isFinite(n)) return 'invalid';
  return n < lim.min || n > lim.max ? 'range' : n;
}

function oneOf<T extends string>(v: unknown, list: readonly T[]): T | ErrorCode {
  const s = str(v);
  if (s === '') return 'required';
  return (list as readonly string[]).includes(s) ? (s as T) : 'invalid';
}

/** Choix facultatif : vide = null */
function optOneOf<T extends string>(v: unknown, list: readonly T[]): T | null | ErrorCode {
  return isEmpty(v) ? null : oneOf(v, list);
}

/** Case à cocher facultative : absente = non */
function flag(v: unknown): boolean | ErrorCode {
  if (v === undefined || v === null || v === '' || v === false || v === 'non') return false;
  if (v === true || v === 'oui' || v === 'on') return true;
  return 'invalid';
}

// Contrôles bidi + caractères invisibles (zero-width, joiners, BOM) : jamais utiles, parfois utilisés pour tromper
const BIDI_CTRL = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

function optText(v: unknown, max: number, multiline = false): string | ErrorCode {
  if (v !== undefined && v !== null && typeof v !== 'string') return 'invalid';
  let s = str(v).replace(BIDI_CTRL, '');
  s = multiline
    ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n')
    : s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return s.length > max ? 'range' : s;
}

/** Fautes de frappe fréquentes dans les adresses : refusées (le récapitulatif n'arriverait jamais), avec la correction proposée */
export const EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.fr': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'pt.l': 'pt.lu', 'pt.lux': 'pt.lu',
};

const NAME_RE = /^[\p{L}][\p{L}\p{M}'’ʼ .-]*$/u;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

function nameField(v: unknown, max: number): string | ErrorCode {
  const s = str(v).replace(BIDI_CTRL, '');
  if (s === '') return 'required';
  if (s.length > max || !NAME_RE.test(s)) return 'invalid';
  return s;
}

/** Vérifie un numéro : chiffres seulement (espaces, points et tirets acceptés) */
export function normalizePhone(code: unknown, number: unknown): string | ErrorCode {
  const c = str(code);
  let digits = str(number).replace(/[\s.\-/() ]/g, '');
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
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.length >= 6 && digits.length <= 13 ? c + digits : 'phone';
}

function communesField(v: unknown): string[] | ErrorCode {
  if (v === undefined || v === null || v === '') return 'required';
  if (!Array.isArray(v)) return 'invalid';
  if (!v.length) return 'required';
  if (v.length > LIMITS.communes) return 'communes_max';
  const list = v.map(str);
  if (list.some((n) => !COMMUNE_NAMES.has(n)) || new Set(list).size !== list.length) return 'invalid';
  return list;
}

type FieldCheck = (raw: Raw) => unknown;

const CHECKS: Record<string, FieldCheck> = {
  usage: (r) => oneOf(r.usage, USAGES),
  achat: (r) => oneOf(r.achat, ACHATS),
  premier: (r) => oneOf(r.premier, PREMIER),
  bellegen: (r) => oneOf(r.bellegen, BELLEGEN),
  vendre: (r) => oneOf(r.vendre, VENDRE),
  type: (r) => oneOf(r.type, TYPES),
  neuf: (r) => oneOf(r.neuf, NEUF),
  communes: (r) => communesField(r.communes),
  chambres: (r) => intIn(r.chambres, LIMITS.chambres),
  surface: (r) => (isEmpty(r.surface) ? null : intIn(str(r.surface).replace(/\s*m(?:2|²)$/i, ''), LIMITS.surface)),
  exterieur: (r) => optOneOf(r.exterieur, EXTERIEURS),
  garage: (r) => flag(r.garage),
  renover: (r) => oneOf(r.renover, RENOVER),
  note: (r) => optText(r.note, TEXT_MAX.note),
  apport: (r) => money(r.apport, LIMITS.apport),
  prix: (r) => money(r.prix, LIMITS.prix),
  banque: (r) => oneOf(r.banque, BANQUE),
  capacite: (r) => oneOf(r.capacite, CAPACITE),
  // Montant facultatif, seulement si le visiteur sait combien il peut emprunter
  capaciteMontant: (r) => (r.capacite !== 'oui' || isEmpty(r.capaciteMontant) ? null : money(r.capaciteMontant, LIMITS.capaciteMontant)),
  // Bien à vendre d'abord : valeur et prêt restant, facultatifs, seulement si le visiteur doit vendre
  valeurVente: (r) => (!String(r.vendre ?? '').startsWith('oui') || isEmpty(r.valeurVente) ? null : money(r.valeurVente, LIMITS.valeurVente)),
  // Obligatoire dès qu'une valeur de vente est donnée (« 0 » si plus de prêt) : jamais supposé à 0
  restePret: (r) => {
    if (!String(r.vendre ?? '').startsWith('oui')) return null;
    if (isEmpty(r.restePret)) return isEmpty(r.valeurVente) ? null : 'required';
    return money(r.restePret, LIMITS.restePret);
  },
  // Montants de départ, avant le simulateur « Et si… ? » (pour l'e-mail ; facultatifs)
  prixDepart: (r) => (isEmpty(r.prixDepart) ? null : money(r.prixDepart, LIMITS.prix)),
  apportDepart: (r) => (isEmpty(r.apportDepart) ? null : money(r.apportDepart, LIMITS.apport)),
  revenu: (r) => optOneOf(r.revenu, REVENUS),
  courtier: (r) => flag(r.courtier),
  delai: (r) => oneOf(r.delai, DELAIS),
  visites: (r) => optOneOf(r.visites, VISITES),
  mandat: (r) => optOneOf(r.mandat, MANDAT),
  prenom: (r) => nameField(r.prenom, TEXT_MAX.prenom),
  nom: (r) => nameField(r.nom, TEXT_MAX.nom),
  email: (r) => {
    const s = str(r.email);
    if (s === '') return 'required';
    if (s.length > TEXT_MAX.email || !EMAIL_RE.test(s)) return 'email';
    return EMAIL_TYPOS[s.slice(s.lastIndexOf('@') + 1).toLowerCase()] ? 'emailTypo' : s.toLowerCase();
  },
  indicatif: (r) => (/^\+[1-9]\d{0,3}$/.test(str(r.indicatif)) ? str(r.indicatif) : 'phone'),
  numero: (r) => normalizePhone(r.indicatif, r.numero),
  message: (r) => optText(r.message, TEXT_MAX.message, true),
  alerte: (r) => flag(r.alerte),
  rgpd: (r) => (r.rgpd === true || r.rgpd === 'on' ? true : 'rgpd'),
};

const ERROR_CODES = new Set<unknown>(['required', 'invalid', 'range', 'email', 'emailTypo', 'phone', 'rgpd', 'communes_max']);
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

/** Données du calcul de budget, si les étapes 1 à 3 sont valides (aperçu dans le navigateur) */
export function budgetInput(raw: Raw): BudgetInput | null {
  const { values: v, errors } = checkFields(raw, [...stepFields(1, raw), 'neuf', ...stepFields(3)]);
  if (Object.keys(errors).length) return null;
  return {
    usage: v.usage as BudgetInput['usage'],
    achat: v.achat as BudgetInput['achat'],
    premier: (v.premier as BudgetInput['premier']) ?? 'nsp',
    bellegen: (v.bellegen as BudgetInput['bellegen']) ?? 'nsp',
    neuf: v.neuf as BudgetInput['neuf'],
    apport: v.apport as number,
    prix: v.prix as number,
    capaciteMontant: (v.capaciteMontant as number | null) ?? null,
    valeurVente: (v.valeurVente as number | null) ?? null,
    restePret: (v.restePret as number | null) ?? null,
  };
}

export type ValidationResult = { ok: true; value: Submission } | { ok: false; errors: Errors; bot?: boolean };

/** Vérification complète d'un envoi (côté serveur) */
export function validateSubmission(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: { form: 'invalid' } };
  const b = body as Raw;
  // Honeypot : champ invisible pour un humain. S'il est rempli, c'est un robot.
  const hp = b.website;
  if (hp !== undefined && hp !== null && !(typeof hp === 'string' && hp.trim() === '')) return { ok: false, errors: { form: 'invalid' }, bot: true };
  if (!b.answers || typeof b.answers !== 'object' || !b.contact || typeof b.contact !== 'object') return { ok: false, errors: { form: 'invalid' } };

  const raw: Raw = { ...(b.answers as Raw), ...(b.contact as Raw) };
  const fields = [1, 2, 3, 4, 5].flatMap((s) => stepFields(s, raw));
  const { values: v, errors } = checkFields(raw, fields);
  if (Object.keys(errors).length) return { ok: false, errors };

  const lang: Lang = b.lang === 'de' || b.lang === 'en' ? b.lang : 'fr';
  const page = str(b.page);
  const safePage = page.length <= TEXT_MAX.page && /^https?:\/\/[^\s<>"]+$/.test(page) ? page : '';

  const answers: Answers = {
    usage: v.usage as Answers['usage'],
    achat: v.achat as Answers['achat'],
    // Investissement : non demandés, sans effet sur le calcul
    premier: (v.premier as Answers['premier']) ?? 'nsp',
    bellegen: (v.bellegen as Answers['bellegen']) ?? 'nsp',
    vendre: v.vendre as Answers['vendre'],
    type: v.type as Answers['type'],
    neuf: v.neuf as Answers['neuf'],
    communes: v.communes as string[],
    chambres: v.chambres as number,
    surface: (v.surface as number | null) ?? null,
    exterieur: (v.exterieur as Answers['exterieur']) ?? null,
    garage: v.garage as boolean,
    renover: v.renover as Answers['renover'],
    note: v.note as string,
    apport: v.apport as number,
    prix: v.prix as number,
    banque: v.banque as Answers['banque'],
    capacite: v.capacite as Answers['capacite'],
    capaciteMontant: (v.capaciteMontant as number | null) ?? null,
    valeurVente: (v.valeurVente as number | null) ?? null,
    restePret: (v.restePret as number | null) ?? null,
    // Montants de départ gardés seulement s'ils diffèrent des montants retenus
    prixDepart: v.prixDepart != null && v.prixDepart !== v.prix ? (v.prixDepart as number) : null,
    apportDepart: v.apportDepart != null && v.apportDepart !== v.apport ? (v.apportDepart as number) : null,
    revenu: (v.revenu as Answers['revenu']) ?? null,
    courtier: v.courtier as boolean,
    delai: v.delai as Answers['delai'],
    visites: (v.visites as Answers['visites']) ?? null,
    mandat: (v.mandat as Answers['mandat']) ?? null,
  };
  return {
    ok: true,
    value: {
      lang,
      page: safePage,
      answers,
      contact: {
        prenom: v.prenom as string,
        nom: v.nom as string,
        email: v.email as string,
        telephone: v.numero as string,
        message: v.message as string,
        alerte: v.alerte as boolean,
      },
    },
  };
}
