/** E-mail du lead envoyé à ImmoBuild Kohn (toujours en français) */
import type { Estimate } from './engine';
import type { Submission } from './types';
import { POSTES_APPARTEMENT, POSTES_MAISON } from './types';

const L = {
  type: { appartement: 'Appartement', maison: 'Maison' },
  etat: { neuf: 'Neuf', renove: 'Rénové récemment', bon: 'Bon état', rafraichir: 'À rafraîchir', renover: 'À rénover' },
  poste: { mauvais: 'Mauvais', moyen: 'Moyen', bon: 'Bon', neuf: 'Neuf', inconnu: 'Je ne sais pas' },
  posteNom: { chassis: 'Châssis', chauffage: 'Chauffage', electricite: 'Électricité', cuisine: 'Cuisine', sanitaires: 'Sanitaires', toiture: 'Toiture' },
  maisonType: { mitoyenne: 'Mitoyenne', jumelee: 'Jumelée', isolee: 'Isolée' },
  objectif: { vendre: 'Vendre', louer: 'Louer', renseigne: 'Je me renseigne' },
  delai: { asap: 'Dès que possible', '3mois': 'Dans les 3 mois', '3a6mois': '3 à 6 mois', plus_tard: 'Plus tard' },
  methode: { notarie: 'Ventes notariées', annonces: 'Annonces corrigées', capitalisation: 'Capitalisation (loyers)', annonces_maison: 'Annonces maisons corrigées' },
  lang: { fr: 'Français', de: 'Allemand', en: 'Anglais' },
} as const;

const COEF_LABELS: Record<string, string> = {
  gros_postes: 'Gros postes (total, plafonné)',
  rez_de_chaussee: 'Rez-de-chaussée',
  etage_sans_ascenseur: 'Étage élevé sans ascenseur',
  jardin_appartement: 'Jardin (appartement)',
  petit_terrain: 'Petit terrain pour ce type de maison',
  grand_terrain: 'Grand terrain pour ce type de maison',
};

function coefLabel(key: string): string {
  if (COEF_LABELS[key]) return COEF_LABELS[key];
  const [kind, value] = [key.slice(0, key.indexOf('_')), key.slice(key.indexOf('_') + 1)];
  if (kind === 'etat') return `État général : ${L.etat[value as keyof typeof L.etat] ?? value}`;
  if (kind === 'energie') return `Classe énergétique ${value === 'inconnu' ? 'inconnue' : value}`;
  if (kind === 'maison') return `Maison ${(L.maisonType[value as keyof typeof L.maisonType] ?? value).toLowerCase()}`;
  return key;
}

function annexLabel(key: string, qty: number): string {
  if (key === 'garage') return `garage × ${qty}`;
  if (key === 'parking') return `parking extérieur × ${qty}`;
  if (key === 'terrasse') return `balcon/terrasse ${qty} m² (pondéré)`;
  return key;
}

const eur = (v: number | null) => (v === null ? '—' : new Intl.NumberFormat('fr-LU', { maximumFractionDigits: 0 }).format(v).replace(/ | /g, ' ') + ' €');
const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1).replace('.', ',')} %`;
const yn = (v: boolean | null) => (v === null ? '—' : v ? 'Oui' : 'Non');

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Priorité du lead, règle simple (à valider par Jay) */
export function leadPriority(s: Submission): { level: 'chaud' | 'tiède' | 'froid'; why: string } {
  const a = s.answers;
  const soon = a.delai === 'asap' || a.delai === '3mois';
  if (a.proprietaire && a.objectif === 'vendre' && soon) return { level: 'chaud', why: 'propriétaire, veut vendre, dans les 3 mois' };
  if (a.proprietaire && a.objectif !== 'renseigne') return { level: 'tiède', why: `propriétaire, veut ${a.objectif === 'vendre' ? 'vendre' : 'louer'}, ${L.delai[a.delai].toLowerCase()}` };
  return { level: 'froid', why: a.proprietaire ? 'propriétaire qui se renseigne' : 'pas propriétaire' };
}

export function leadSubject(s: Submission): string {
  const a = s.answers;
  // Retour à la ligne interdit dans un objet d'e-mail
  return `Nouveau lead estimation – ${a.commune} – ${L.type[a.type]} – ${L.delai[a.delai]}`.replace(/[\r\n]+/g, ' ');
}

type Section = { title: string; rows: [string, string][] };

export function leadSections(s: Submission, e: Estimate, date: Date): Section[] {
  const a = s.answers;
  const c = s.contact;
  const r = e.result;
  const d = e.detail;
  const postes = a.type === 'maison' ? POSTES_MAISON : POSTES_APPARTEMENT;

  const prio = leadPriority(s);
  const sections: Section[] = [
    {
      title: 'En un coup d’œil',
      rows: [
        ['Priorité', `${prio.level === 'chaud' ? '🔥 ' : ''}${prio.level.charAt(0).toUpperCase() + prio.level.slice(1)} – ${prio.why}`],
        ['Bien', `${L.type[a.type]} de ${a.surface} m² à ${a.commune}`],
        ['Valeur de marché affichée', r.status === 'ok' ? eur(r.market) : 'aucune (pas assez de données)'],
        ['Rappeler', `${c.prenom} ${c.nom} – ${c.telephone}`],
      ],
    },
    {
      title: 'Coordonnées',
      rows: [
        ['Prénom', c.prenom],
        ['Nom', c.nom],
        ['E-mail', c.email],
        ['Téléphone', c.telephone],
        ['Message', c.message || '—'],
      ],
    },
    {
      title: 'Résultat affiché au visiteur',
      rows:
        r.status === 'ok'
          ? [
              ['Valeur basse (vente rapide)', eur(r.low)],
              ['Valeur de marché', eur(r.market)],
              ['Valeur haute (coup de cœur)', eur(r.high)],
              ['Fourchette', `± ${(r.spread! * 100).toFixed(0)} %${r.indicative ? ' – mention « indicative » affichée' : ''}`],
            ]
          : [['Résultat', `Pas de prix affiché (« Je vous recontacte avec une estimation personnalisée »). Raison : ${e.reason}`]],
    },
    {
      title: 'Le bien',
      rows: [
        ['Type', L.type[a.type]],
        ['Commune', `${a.commune}${d ? ` (canton ${d.canton})` : ''}`],
        ['Rue', a.rue || '—'],
        ['Surface habitable nette', `${a.surface} m²`],
        ['Chambres', String(a.chambres)],
        ['Salles de bain', String(a.sdb)],
        ['Année de construction', String(a.annee)],
        ['État général', L.etat[a.etat]],
        ['Classe énergétique', a.energie === 'inconnu' ? 'Je ne sais pas' : a.energie],
        ...(a.type === 'appartement'
          ? ([
              ['Étage', a.etage === 0 ? 'Rez-de-chaussée' : a.etage === 5 ? '5e et plus' : `${a.etage}e`],
              ['Ascenseur', yn(a.ascenseur)],
            ] as [string, string][])
          : ([
              ['Type de maison', a.maisonType ? L.maisonType[a.maisonType] : '—'],
              ['Surface du terrain', `${a.terrain} m²`],
            ] as [string, string][])),
      ],
    },
    { title: 'Gros postes', rows: postes.map((p) => [L.posteNom[p], L.poste[a.postes[p] ?? 'inconnu']] as [string, string]) },
    {
      title: 'Annexes',
      rows: [
        ['Garages', String(a.garages)],
        ['Parkings extérieurs', String(a.parkings)],
        ['Cave', yn(a.cave)],
        ['Balcon / terrasse', `${a.terrasse} m²`],
        ['Jardin', yn(a.jardin)],
      ],
    },
    {
      title: 'Le projet',
      rows: [
        ['Propriétaire', yn(a.proprietaire)],
        ['Objectif', L.objectif[a.objectif]],
        ['Délai', L.delai[a.delai]],
      ],
    },
  ];

  if (d) {
    sections.push({
      title: 'Détail du calcul',
      rows: [
        ...d.methods.map(
          (m) =>
            [
              `${L.methode[m.key]} (poids ${Math.round(m.weight * 100)} %)`,
              `${m.m2 === null ? '—' : `${Math.round(m.m2)} €/m²`} – ${m.used ? 'utilisée' : 'non utilisée'} – ${m.note}`,
            ] as [string, string],
        ),
        ['Décote annonce → vente', `${pct(-d.decote.value)} (${d.decote.origin === 'canton' ? `médiane du canton, ${d.decote.communes} communes` : `médiane nationale, ${d.decote.communes} communes`})`],
        ['Prix de base retenu', `${Math.round(d.baseM2)} €/m²`],
        ...d.coefficients.map((x) => [`Coefficient – ${coefLabel(x.key)}`, pct(x.value)] as [string, string]),
        ['Total des coefficients', `${pct(d.coefSum)}${d.coefApplied !== d.coefSum ? ` (plafonné à ${pct(d.coefApplied)})` : ''}`],
        ['Valeur du logement', `${Math.round(d.baseM2)} €/m² × ${d.surface} m² × (1 ${d.coefApplied < 0 ? '−' : '+'} ${Math.abs(d.coefApplied * 100).toFixed(1).replace('.', ',')} %) = ${eur(d.buildingValue)}`],
        ...d.annexes.map((x) => [`Annexe : ${annexLabel(x.key, x.qty)}`, eur(x.amount)] as [string, string]),
        ...(d.annexes.length ? ([['Ajustement des annexes selon le prix de la commune', `× ${d.communeScale.toFixed(2).replace('.', ',')}`]] as [string, string][]) : []),
        ['Valeur de marché avant arrondi', eur(d.rawMarket)],
      ],
    });
  }

  sections.push({
    title: 'Contexte',
    rows: [
      ['Langue', L.lang[s.lang]],
      ['Date', date.toLocaleString('fr-LU', { timeZone: 'Europe/Luxembourg', dateStyle: 'full', timeStyle: 'short' })],
      ['Page d’origine', s.page || '—'],
      ['Données', `${r.source}, période ${r.periode}`],
    ],
  });
  return sections;
}

export function leadEmail(s: Submission, e: Estimate, date = new Date()): { subject: string; html: string; text: string } {
  const sections = leadSections(s, e, date);
  const text = sections
    .map((sec) => `== ${sec.title} ==\n` + sec.rows.map(([k, v]) => `${k} : ${v}`).join('\n'))
    .join('\n\n');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(leadSubject(s))}</h1>
${sections
  .map(
    (sec) => `<h2 style="font-size:16px;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid #F2EFEA">${escapeHtml(sec.title)}</h2>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${sec.rows
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#4a5a70;width:42%">${escapeHtml(k)}</td><td style="padding:4px 0;vertical-align:top">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`)
      .join('')}</table>`,
  )
  .join('\n')}
<p style="font-size:12px;color:#4a5a70;margin-top:24px">Répondre à cet e-mail écrit directement au visiteur. Aucune autre copie de ces données n’est conservée par l’outil.</p>
</div></body></html>`;
  return { subject: leadSubject(s), html, text };
}
