/** E-mail du lead envoyé à ImmoBuild Kohn (toujours en français) */
import type { Estimate } from './engine';
import type { Submission } from './types';

const L = {
  type: { appartement: 'Appartement', maison: 'Maison' },
  etat: { neuf: 'Neuf', renove: 'Rénové récemment', bon: 'Bon état', rafraichir: 'À rafraîchir', renover: 'À rénover' },
  exterieur: { aucun: 'Aucun', balcon: 'Balcon', terrasse: 'Terrasse', jardin: 'Jardin privatif' },
  gestion: { oui: 'Oui', peut_etre: 'Peut-être', non: 'Non' },
  dispo: { libre: 'Libre maintenant', '3mois': 'Dans les 3 mois', '3a6mois': 'Dans 3 à 6 mois', plus_tard: 'Plus tard / je ne sais pas' },
  zone: { LV: 'Luxembourg-Ville', LC: 'Communes autour de Luxembourg-Ville', Peri: 'Périphérie (Capellen, Mersch)', Sud: 'Sud (canton d’Esch)', Est: 'Est', Nord: 'Nord' },
  fiabilite: { high: 'Bonne', medium: 'Moyenne', low: 'Limitée' },
  lang: { fr: 'Français', de: 'Allemand', en: 'Anglais' },
} as const;

function coefLabel(key: string): string {
  const [kind, ...rest] = key.split('_');
  const value = rest.join('_');
  if (kind === 'etat') return `État : ${L.etat[value as keyof typeof L.etat] ?? value}`;
  if (kind === 'energie') return `Classe énergétique ${value === 'inconnu' ? 'inconnue' : value}`;
  if (kind === 'exterieur') return `Extérieur : ${(L.exterieur[value as keyof typeof L.exterieur] ?? value).toLowerCase()}`;
  if (key === 'rez_de_chaussee') return 'Rez-de-chaussée';
  if (key === 'etage_sans_ascenseur') return 'Étage élevé sans ascenseur';
  return key;
}

const eur = (v: number) => new Intl.NumberFormat('fr-LU', { maximumFractionDigits: 0 }).format(Math.round(v)).replace(/[  ]/g, ' ') + ' €';
const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1).replace('.', ',')} %`;
const dec = (v: number, d = 3) => v.toFixed(d).replace('.', ',');
const yn = (v: boolean | null) => (v === null ? '—' : v ? 'Oui' : 'Non');

/** « +352621123456 » → « +352 621 123 456 » */
export function formatPhone(p: string): string {
  const m = p.match(/^(\+352|\+\d{2})(\d+)$/);
  if (!m) return p;
  return `${m[1]} ${m[2].replace(/(\d{3})(?=\d{2,})/g, '$1 ')}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Priorité du lead (à valider par Jason) :
 * chaud = propriétaire, veut la gestion, bien libre dans les 3 mois ;
 * tiède = propriétaire intéressé par la gestion (oui ou peut-être) ;
 * froid = le reste.
 */
export function leadPriority(s: Submission): { level: 'chaud' | 'tiède' | 'froid'; why: string } {
  const a = s.answers;
  const soon = a.disponibilite === 'libre' || a.disponibilite === '3mois';
  if (a.proprietaire && a.gestion === 'oui' && soon) return { level: 'chaud', why: `propriétaire, veut la gestion, ${L.dispo[a.disponibilite].toLowerCase()}` };
  if (a.proprietaire && a.gestion !== 'non') return { level: 'tiède', why: `propriétaire, gestion : ${L.gestion[a.gestion].toLowerCase()}, ${L.dispo[a.disponibilite].toLowerCase()}` };
  return { level: 'froid', why: a.proprietaire ? 'propriétaire, ne souhaite pas la gestion' : 'pas propriétaire' };
}

export function leadSubject(s: Submission): string {
  const a = s.answers;
  const prio = leadPriority(s);
  // Retour à la ligne interdit dans un objet d'e-mail (commune et libellés viennent de listes fermées)
  return `${prio.level === 'chaud' ? '🔥 ' : ''}Lead loyer – ${a.commune} – ${L.type[a.type]} – gestion : ${L.gestion[a.gestion].toLowerCase()}`.replace(/[\r\n\u2028\u2029]+/g, ' ');
}

type Section = { title: string; rows: [string, string][] };

export function leadSections(s: Submission, e: Estimate, date: Date): Section[] {
  const a = s.answers;
  const c = s.contact;
  const r = e.result;
  const d = e.detail;
  const prio = leadPriority(s);

  const sections: Section[] = [
    {
      title: 'En un coup d’œil',
      rows: [
        ['Priorité', `${prio.level === 'chaud' ? '🔥 ' : ''}${prio.level.charAt(0).toUpperCase() + prio.level.slice(1)} – ${prio.why}`],
        ['Bien', `${L.type[a.type]} de ${a.surface} m² à ${a.commune}`],
        ['Loyer affiché', `${eur(r.low)} – ${eur(r.high)} par mois (milieu ${eur(r.mid)}), hors charges${a.meuble ? ', hors supplément mobilier' : ''}`],
        ['Rappeler', `${c.prenom} ${c.nom} – ${formatPhone(c.telephone)}`],
        ['E-mail', c.email],
        ['Langue', L.lang[s.lang]],
        ...(c.message ? ([['Message', c.message]] as [string, string][]) : []),
      ],
    },
    {
      title: 'Le projet',
      rows: [
        ['Propriétaire', yn(a.proprietaire)],
        ['Déjà loué', yn(a.dejaLoue)],
        ['Gestion locative souhaitée', L.gestion[a.gestion]],
        ['Disponible', L.dispo[a.disponibilite]],
      ],
    },
    {
      title: 'Coordonnées',
      rows: [
        ['Prénom', c.prenom],
        ['Nom', c.nom],
        ['E-mail', c.email],
        ['Téléphone', formatPhone(c.telephone)],
        ['Message', c.message || '—'],
      ],
    },
    {
      title: 'Le bien',
      rows: [
        ['Type', L.type[a.type]],
        ['Commune', `${a.commune} (canton ${d.canton}, zone ${L.zone[d.zone]})`],
        ['Surface habitable', `${a.surface} m²`],
        ['Chambres', a.chambres === 0 ? '0 (studio)' : String(a.chambres)],
        ['État', L.etat[a.etat]],
        ['Classe énergétique', a.energie === 'inconnu' ? 'Je ne sais pas' : a.energie],
        ['Meublé', yn(a.meuble)],
        ['Extérieur', L.exterieur[a.exterieur]],
        ['Garages / places intérieures', String(a.garages)],
        ['Parkings extérieurs', String(a.parkings)],
        ...(a.type === 'appartement'
          ? ([
              ['Étage', a.etage === 0 ? 'Rez-de-chaussée' : a.etage === 1 ? '1er' : a.etage === 5 ? '5e et plus' : `${a.etage}e`],
              ['Ascenseur', yn(a.ascenseur)],
            ] as [string, string][])
          : []),
      ],
    },
    {
      title: 'Résultat affiché au visiteur',
      rows: [
        ['Loyer prudent (niveau des baux signés)', eur(r.low)],
        ['Loyer conseillé (milieu)', eur(r.mid)],
        ['Loyer affiché en annonce', eur(r.high)],
        ['Au m² (milieu)', `${String(r.perM2).replace('.', ',')} €/m²`],
        ['Fiabilité affichée', L.fiabilite[r.reliability]],
      ],
    },
  ];

  const calc: [string, string][] = [];
  if (a.type === 'appartement') {
    calc.push(
      ['Médiane du canton (baux en cours 2025)', `${dec(d.medianeCanton!, 2)} €/m²`],
      ['Facteur surface', `${dec(d.facteurSurface!)} (${dec(d.surfaceM2Zone!, 2)} €/m² pour ${a.surface} m² dans la zone)`],
      ['Facteur baux récents (2024-2025)', dec(d.facteurBauxRecents!)],
      ['Mise à jour par l’indice', `${dec(d.facteurIndice, 4)} (${r.indiceTrimestre})`],
      ['Loyer de référence « bail »', `${eur(d.bail)} (${dec(d.bail / a.surface, 2)} €/m²)`],
      ['Loyer de référence « annonce »', `${eur(d.annonce)} (× 1,17)`],
    );
  } else {
    calc.push(
      ['Modèle maisons (annonces du ' + r.releveDate + ')', `${eur(d.annonce)} pour ${a.surface} m² dans la zone ${L.zone[d.zone]}`],
      ['Loyer de référence « bail »', `${eur(d.bail)} (÷ 1,17, hypothèse)`],
    );
  }
  calc.push(
    ...d.coefficients.map((x) => [`Coefficient – ${coefLabel(x.key)}`, pct(x.value)] as [string, string]),
    ['Total des coefficients', `${pct(d.coefSum)}${d.coefApplied !== d.coefSum ? ` (plafonné à ${pct(d.coefApplied)})` : ''}`],
    ...d.stationnement.map((x) => [`Stationnement : ${x.key === 'garage' ? 'garage' : 'parking extérieur'} × ${x.qty}`, `${eur(x.amount)} (${eur(x.unit)} par place)`] as [string, string]),
    ['Avant arrondi', `bas ${eur(d.rawLow)} · haut ${eur(d.rawHigh)}`],
    ['Arrondi', 'à 50 € près'],
  );
  sections.push({ title: 'Détail du calcul', rows: calc });

  sections.push({
    title: 'Contexte',
    rows: [
      ['Date', date.toLocaleString('fr-LU', { timeZone: 'Europe/Luxembourg', dateStyle: 'full', timeStyle: 'short' })],
      ['Page d’origine', s.page || '—'],
      ['À vérifier en rendez-vous', 'plafond légal (5 % du capital investi), charges, supplément mobilier si meublé'],
    ],
  });
  return sections;
}

/* ---------- Boutons d'action en tête de l'e-mail : appeler, WhatsApp, répondre ---------- */

const BIEN: Record<Submission['lang'], Record<'appartement' | 'maison', string>> = {
  fr: { appartement: 'votre appartement', maison: 'votre maison' },
  de: { appartement: 'Ihre Wohnung', maison: 'Ihr Haus' },
  en: { appartement: 'your apartment', maison: 'your house' },
};

/** Réponse préparée dans la langue du visiteur (Jason la relit et la complète avant d'envoyer) */
export function reponsePreparee(s: Submission): { subject: string; body: string } {
  const { prenom, nom } = s.contact;
  const bien = BIEN[s.lang][s.answers.type];
  const commune = s.answers.commune;
  if (s.lang === 'de')
    return {
      subject: `Ihre Mietschätzung in ${commune}`,
      body: `Guten Tag ${prenom} ${nom},\n\nvielen Dank für Ihre Anfrage zur Miete für ${bien} in ${commune}. Gerne bespreche ich das Ergebnis kurz mit Ihnen am Telefon: Wann sind Sie gut erreichbar?\n\nFreundliche Grüße\nJason\nImmoBuild Kohn`,
    };
  if (s.lang === 'en')
    return {
      subject: `Your rent estimate in ${commune}`,
      body: `Dear ${prenom} ${nom},\n\nThank you for your rent estimate request for ${bien} in ${commune}. I would be happy to go through the result with you by phone: when is a good time to call you?\n\nKind regards,\nJason\nImmoBuild Kohn`,
    };
  return {
    subject: `Votre estimation de loyer à ${commune}`,
    body: `Bonjour ${prenom} ${nom},\n\nMerci pour votre demande d’estimation de loyer pour ${bien} à ${commune}. Je vous propose d’en parler brièvement par téléphone : quand êtes-vous joignable ?\n\nBien cordialement,\nJason\nImmoBuild Kohn`,
  };
}

/** Numéro de mobile (WhatsApp possible) : Luxembourg 6…, France 6/7…, Belgique 4…, Allemagne 15/16/17… */
export function estMobile(tel: string): boolean {
  return /^\+3526|^\+33[67]|^\+324|^\+491[5-7]/.test(tel);
}

function boutons(s: Submission): string {
  const tel = s.contact.telephone;
  const r = reponsePreparee(s);
  const mailto = `mailto:${encodeURIComponent(s.contact.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body)}`;
  const btn = (href: string, label: string, plein: boolean) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:6px;font-weight:bold;font-size:14px;text-decoration:none;${plein ? 'background:#0A2342;color:#ffffff' : 'background:#ffffff;color:#0A2342;border:1px solid #0A2342'}">${escapeHtml(label)}</a>`;
  return `<p style="margin:0 0 8px">${btn(`tel:${tel}`, `📞 Appeler ${formatPhone(tel)}`, true)}${estMobile(tel) ? btn(`https://wa.me/${tel.slice(1)}`, 'WhatsApp', false) : ''}${btn(mailto, `✉️ Répondre (${L.lang[s.lang].toLowerCase()}, texte préparé)`, false)}</p>`;
}

export function leadEmail(s: Submission, e: Estimate, date = new Date()): { subject: string; html: string; text: string } {
  const sections = leadSections(s, e, date);
  const text = sections
    .map((sec) => `== ${sec.title} ==\n` + sec.rows.map(([k, v]) => `${k} : ${v.replace(/\n/g, '\n    | ')}`).join('\n'))
    .join('\n\n');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(leadSubject(s))}</h1>
${boutons(s)}
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
  return { subject: leadSubject(s), html, text };
}
