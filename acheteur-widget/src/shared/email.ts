/** E-mail du lead acheteur envoyé à ImmoBuild Kohn (toujours en français) */
import params from '../../params.json';
import server from '../../server.json';
import { mensualite, partRevenu, type Taux } from './taux';
import type { Budget, CommuneM2, Submission } from './types';

const L = {
  usage: { habiter: 'Résidence principale', investir: 'Investissement (location)' },
  achat: { seul: 'seul(e)', deux: 'à deux' },
  premier: { oui: 'oui', non: 'non', nsp: 'ne sait pas' },
  bellegen: { non: 'pas encore utilisé', oui: 'déjà utilisé (en partie ou entièrement)', nsp: 'ne sait pas' },
  vendre: { non: 'Non', oui_lu: 'OUI, un bien au Luxembourg', oui_etranger: 'Oui, un bien à l’étranger' },
  type: { appartement: 'Appartement', maison: 'Maison', les_deux: 'Appartement ou maison' },
  neuf: { ancien: 'ancien', neuf: 'neuf', peu_importe: 'neuf ou ancien' },
  exterieur: { balcon: 'balcon ou terrasse', jardin: 'jardin', peu_importe: 'peu importe' },
  renover: { oui: 'oui', selon_prix: 'selon le prix', non: 'non' },
  banque: { oui: 'oui', pas_encore: 'pas encore' },
  revenu: {
    moins_4000: 'moins de 4 000 €',
    '4000_6000': '4 000 – 6 000 €',
    '6000_8000': '6 000 – 8 000 €',
    '8000_10000': '8 000 – 10 000 €',
    '10000_14000': '10 000 – 14 000 €',
    plus_14000: 'plus de 14 000 €',
    nr: 'préfère ne pas répondre',
  },
  delai: { asap: 'Dès que possible', '3a6mois': 'Dans 3 à 6 mois', '6a12mois': 'Dans 6 à 12 mois', renseigne: 'Se renseigne' },
  visites: { '0': 'aucune', '1_5': '1 à 5', plus5: 'plus de 5' },
  mandat: { oui: 'OUI', peut_etre: 'peut-être', non: 'non' },
  ltv: { premier: '100 % (premier achat)', residence: '90 % (résidence principale, pas un premier achat)', incertain: '90 % (statut premier achat inconnu : règle prudente)', investissement: '80 % (investissement)' },
  source: {
    notarie: 'ventes notariées',
    vefa: 'ventes notariées neuf (VEFA)',
    canton: 'médiane des ventes notariées du canton',
    annonce: 'prix annoncés maisons',
    canton_annonce: 'médiane des prix annoncés maisons du canton',
  },
  lang: { fr: 'Français', de: 'Allemand', en: 'Anglais' },
} as const;

const eur = (v: number | null) => (v === null ? '—' : new Intl.NumberFormat('fr-LU', { maximumFractionDigits: 0 }).format(v).replace(/[  ]/g, ' ') + ' €');
const range = (a: number, b: number) => (a === b ? eur(a) : `${eur(a)} à ${eur(b)}`);
const yn = (v: boolean) => (v ? 'Oui' : 'Non');

/** « +352621123456 » → « +352 621 123 456 » */
export function formatPhone(p: string): string {
  const m = p.match(/^(\+352|\+\d{2})(\d+)$/);
  if (!m) return p;
  return `${m[1]} ${m[2].replace(/(\d{3})(?=\d{2,})/g, '$1 ')}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Priorité du lead (règle simple, à valider par Jason) */
export function leadPriority(s: Submission, b: Budget): { level: 'chaud' | 'tiède' | 'froid'; why: string } {
  const a = s.answers;
  const soon = a.delai === 'asap' || a.delai === '3a6mois';
  const reasons: string[] = [];
  if (a.vendre === 'oui_lu') reasons.push('doit d’abord vendre au Luxembourg');
  if (a.mandat === 'oui') reasons.push('veut être accompagné(e)');
  if (a.courtier) reasons.push('veut le courtier partenaire');
  if (a.capacite === 'oui') reasons.push('connaît son montant d’emprunt');
  // Avec 100 % de prêt possible (premier achat), un apport « suffisant » ne dit presque rien : compté seulement avec la règle à 90 % ou 80 %
  if (b.margeMin >= 0 && b.ltvRule !== 'premier') reasons.push('apport suffisant pour ce prix');
  if (soon && reasons.length) return { level: 'chaud', why: `${L.delai[a.delai].toLowerCase()} + ${reasons.join(', ')}` };
  if (a.delai !== 'renseigne') return { level: 'tiède', why: `${L.delai[a.delai].toLowerCase()}${reasons.length ? ` ; ${reasons.join(', ')}` : ''}` };
  return { level: 'froid', why: `se renseigne${reasons.length ? ` ; ${reasons.join(', ')}` : ''}` };
}

/** Points à aborder au téléphone */
export function talkingPoints(s: Submission, b: Budget): string[] {
  const a = s.answers;
  const out: string[] = [];
  if (a.vendre === 'oui_lu') out.push(`Doit d’abord vendre son bien au Luxembourg${a.valeurVente ? ` (valeur estimée par le visiteur : ${eur(a.valeurVente)})` : ''} → proposer l’estimation (estimatioun.lu ou visite).`);
  const surtaxe = a.communes.filter((c) => params.surtaxe.communes.includes(c));
  if (surtaxe.length) out.push(`${surtaxe.join(', ')} : surtaxe communale possible (+3 % du prix) selon le type d’immeuble, non comptée dans le calcul. Le visiteur a vu un avertissement.`);
  if (a.prixDepart || a.apportDepart !== null) out.push('A testé d’autres montants dans le simulateur : voir « Budget ».');
  if (a.vendre === 'oui_etranger') out.push('Doit d’abord vendre un bien à l’étranger → timing et financement relais à aborder.');
  if (a.courtier) out.push(`Souhaite être mis(e) en relation avec le courtier partenaire → transmettre à ${server.courtierNom}.`);
  else if (a.banque === 'pas_encore') out.push('N’a pas encore parlé à une banque.');
  if (a.mandat === 'oui' || a.mandat === 'peut_etre') out.push(`Intéressé(e) par l’accompagnement acheteur (négociation, état du bien) : ${L.mandat[a.mandat]}.`);
  if (a.renover === 'oui' || a.renover === 'selon_prix') out.push(`Prêt(e) à acheter un bien à rénover (${L.renover[a.renover]}) → argument ImmoBuild.`);
  if (b.margeMin < 0) out.push(`Pour ce prix, il manque environ ${range(Math.max(0, -b.margeMax), -b.margeMin)} d’apport selon la règle CSSF.`);
  if (a.usage === 'habiter' && a.premier === 'nsp') out.push('Ne sait pas s’il / si elle est premier acquéreur (définition CSSF) : à vérifier.');
  if (a.usage === 'habiter' && a.bellegen === 'nsp') out.push('Ne sait pas si le Bëllegen Akt a déjà été utilisé : à vérifier.');
  if (s.contact.alerte) out.push('Veut être prévenu(e) si un bien correspondant arrive → vérifier dans Apimo.');
  return out;
}

export function leadSubject(s: Submission, b: Budget): string {
  const a = s.answers;
  const prio = leadPriority(s, b).level.toUpperCase();
  return `[Acheteur · ${prio}] ${s.contact.prenom} ${s.contact.nom} – ${a.communes.join('/')} – ${L.type[a.type]} – ${eur(a.prix)}`.replace(/[\r\n]+/g, ' ');
}

type Section = { title: string; rows: [string, string][] };

function communeLine(c: CommuneM2): [string, string] {
  const label = `${c.commune} – ${c.type === 'maison' ? 'maison' : 'appartement'}`;
  if (c.m2 === null || c.prixM2 === null || c.source === null) return [label, 'pas assez de données publiques'];
  return [label, `≈ ${c.m2} m² (${eur(Math.round(c.prixM2))}/m², ${L.source[c.source]}${c.nombre ? `, ${c.nombre} ${c.source.startsWith('canton') ? 'communes' : c.source === 'annonce' ? 'annonces' : 'ventes'}` : ''})${c.ancienPourNeuf ? ' – prix de l’ancien : le visiteur cherche du neuf, surface surestimée' : ''}`];
}

export function leadSections(s: Submission, b: Budget, communes: CommuneM2[], date: Date, periode: string): Section[] {
  const a = s.answers;
  const c = s.contact;
  const prio = leadPriority(s, b);
  const points = talkingPoints(s, b);
  return [
    {
      title: 'En un coup d’œil',
      rows: [
        ['Priorité', `${prio.level === 'chaud' ? '🔥 ' : ''}${prio.level.charAt(0).toUpperCase() + prio.level.slice(1)} – ${prio.why}`],
        ['Rappeler', `${c.prenom} ${c.nom} – ${formatPhone(c.telephone)}`],
        ['E-mail', c.email],
        ['Langue', L.lang[s.lang]],
        ...(c.message ? ([['Message', c.message]] as [string, string][]) : []),
      ],
    },
    { title: 'À dire au téléphone', rows: points.length ? points.map((p, i) => [`${i + 1}.`, p] as [string, string]) : [['—', 'Rien de particulier']] },
    {
      title: 'Projet',
      rows: [
        ['Pour', `${L.usage[a.usage]} · achat ${L.achat[a.achat]}`],
        ...(a.usage === 'habiter'
          ? ([
              ['Premier achat (CSSF)', L.premier[a.premier]],
              ['Bëllegen Akt', L.bellegen[a.bellegen]],
            ] as [string, string][])
          : []),
        ['Doit d’abord vendre', L.vendre[a.vendre]],
        ['Calendrier', L.delai[a.delai]],
        ['Biens déjà visités', a.visites ? L.visites[a.visites] : '—'],
        ['Accompagnement acheteur', a.mandat ? L.mandat[a.mandat] : '—'],
      ],
    },
    {
      title: 'Recherche',
      rows: [
        ['Type', `${L.type[a.type]} · ${L.neuf[a.neuf]}`],
        ['Communes', a.communes.join(', ')],
        ['Chambres minimum', String(a.chambres)],
        ['Surface minimum', a.surface ? `${a.surface} m²` : '—'],
        ['Extérieur', a.exterieur ? L.exterieur[a.exterieur] : '—'],
        ['Garage souhaité', yn(a.garage)],
        ['Bien à rénover', L.renover[a.renover]],
        ['Ce qui compte', a.note || '—'],
        ['Prévenir si un bien correspond', yn(c.alerte)],
      ],
    },
    {
      title: 'Budget (déclaratif)',
      rows: [
        ['Prix visé', `${eur(a.prix)}${a.prixDepart ? ` (au départ ${eur(a.prixDepart)}, modifié dans le simulateur)` : ''}`],
        ['Épargne', `${eur(a.apport)}${a.apportDepart !== null ? ` (au départ ${eur(a.apportDepart)}, modifié dans le simulateur)` : ''}`],
        ...(a.valeurVente !== null
          ? ([
              ['Bien à vendre : valeur estimée', `${eur(a.valeurVente)} (déclarée par le visiteur)`],
              ['Bien à vendre : reste du prêt', eur(a.restePret ?? 0)],
            ] as [string, string][])
          : []),
        ['A parlé à sa banque', L.banque[a.banque]],
        ['Sait combien emprunter', a.capacite === 'oui' ? `oui${a.capaciteMontant ? `, environ ${eur(a.capaciteMontant)}` : ''}` : 'non'],
        ['Revenu net du ménage / mois', a.revenu ? L.revenu[a.revenu] : '—'],
        ['Mise en relation courtier partenaire', a.courtier ? `OUI → ${server.courtierNom}` : 'non'],
      ],
    },
    {
      title: 'Calcul affiché au visiteur',
      rows: [
        ['Droits d’enregistrement et de transcription (7 %)', `${eur(b.droits)}${b.droitsMaximum ? ' (maximum : bien neuf)' : ''}`],
        ['Bëllegen Akt déduit', `− ${eur(b.bellegen)}${b.bellegenPlafond ? ` (plafond ${eur(b.bellegenPlafond)})` : ''}`],
        ['Notaire, acte de vente (TVA comprise)', eur(b.notaireVente)],
        ['Acte de prêt (0,24 % + 0,05 % + notaire barème 5, TVA)', eur(b.fraisPret)],
        ['Copies, extraits, débours (hypothèse)', range(b.fraisDiversMin, b.fraisDiversMax)],
        ['Besoin total', range(b.totalMin, b.totalMax)],
        ['Règle CSSF', L.ltv[b.ltvRule]],
        ['Prêt nécessaire (tout l’apport utilisé)', eur(b.pretNecessaire)],
        ['Prêt maximal retenu', `${eur(b.pret)}${b.pretLimiteParCapacite ? ' (limité au montant indiqué par le visiteur)' : ''}`],
        ['Apport nécessaire', range(b.apportNecessaireMin, b.apportNecessaireMax)],
        ...(b.produitVente !== null
          ? ([
              ['Produit net de la vente', `${eur(b.produitVente)} (frais d’agence estimés ${eur(b.fraisVente)})`],
              ['Apport total retenu', eur(b.apportTotal)],
            ] as [string, string][])
          : []),
        ['Écart avec l’apport déclaré', b.margeMin >= 0 ? `suffisant (+${eur(b.margeMin)} au moins)` : `manque ${range(Math.max(0, -b.margeMax), -b.margeMin)}`],
        ...(b.prixMax !== null ? ([['Prix maximal avec ce montant d’emprunt', eur(b.prixMax)]] as [string, string][]) : []),
      ],
    },
    { title: `Ce que ${eur(a.prix)} représente (${periode})`, rows: communes.map(communeLine) },
    {
      title: 'Contexte',
      rows: [
        ['Date', date.toLocaleString('fr-LU', { timeZone: 'Europe/Luxembourg', dateStyle: 'full', timeStyle: 'short' })],
        ['Page d’origine', s.page || '—'],
        ['Correspondance avec mes biens', 'à vérifier dans Apimo (pas automatique en V1)'],
      ],
    },
  ];
}

/** Mensualité d'exemple, telle qu'affichée au visiteur, avec le taux et son origine (pour contrôle) */
function mensualiteSection(s: Submission, b: Budget, taux: Taux | null): Section {
  if (!taux) return { title: 'Mensualité d’exemple', rows: [['Affichée', 'non (taux indisponibles ou de plus de 4 mois)']] };
  const mois = `${taux.mois} (${taux.origine === 'bce' ? 'lu en direct à la BCE' : 'VALEUR DE SECOURS de params.json : la BCE n’a pas répondu'})`;
  const fmtPct = (v: number) => `${v.toFixed(2).replace('.', ',')} %`;
  const rows: [string, string][] = [['Taux moyens BCL', `variable ${fmtPct(taux.variable)} · fixe plus de 10 ans ${fmtPct(taux.fixe)} · ${mois}`]];
  for (const n of [20, 25, 30]) rows.push([`Sur ${n} ans (prêt ${eur(b.pretNecessaire)})`, `${eur(Math.round(mensualite(b.pretNecessaire, taux.variable, n) / 10) * 10)} variable · ${eur(Math.round(mensualite(b.pretNecessaire, taux.fixe, n) / 10) * 10)} fixe`]);
  const part = partRevenu(mensualite(b.pretNecessaire, taux.fixe, 25), s.answers.revenu);
  if (part) rows.push(['Part du revenu (25 ans, fixe)', `${part.min !== null ? Math.round(part.min * 100) : '?'} à ${part.max !== null ? Math.round(part.max * 100) : '?'} %`]);
  return { title: 'Mensualité d’exemple (hors assurance)', rows };
}

export function leadEmail(s: Submission, b: Budget, communes: CommuneM2[], periode: string, date = new Date(), taux: Taux | null = null): { subject: string; html: string; text: string } {
  const sections = leadSections(s, b, communes, date, periode);
  sections.splice(sections.length - 2, 0, mensualiteSection(s, b, taux));
  const subject = leadSubject(s, b);
  const text = sections.map((sec) => `== ${sec.title} ==\n` + sec.rows.map(([k, v]) => `${/^\d+\.$/.test(k) ? `${k} ` : `${k} : `}${v.replace(/\n/g, '\n    | ')}`).join('\n')).join('\n\n');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(subject)}</h1>
${sections
  .map(
    (sec) => `<h2 style="font-size:16px;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid #F2EFEA">${escapeHtml(sec.title)}</h2>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${sec.rows
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#4a5a70;width:42%">${escapeHtml(k)}</td><td style="padding:4px 0;vertical-align:top">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`)
      .join('')}</table>`,
  )
  .join('\n')}
<p style="font-size:12px;color:#4a5a70;margin-top:24px">Si vous répondez à cet e-mail, la réponse part directement chez le visiteur. L’outil ne garde aucune copie (Resend conserve un journal d’envoi).</p>
</div></body></html>`;
  return { subject, html, text };
}
