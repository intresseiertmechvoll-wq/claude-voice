/**
 * E-mail de confirmation envoyé au VISITEUR après sa demande, dans sa langue.
 * Il reprend les chiffres affichés (rien de nouveau, aucune promesse de plus que l'écran).
 * Les réponses à cet e-mail vont chez Jason (reply_to = adresse des leads).
 */
import config from '../../config.json';
import { LOCALES } from '../i18n';
import { escapeHtml } from './email';
import { mensualite, type Taux } from './taux';
import type { Budget, CommuneM2, Lang, Submission } from './types';

const eur = (v: number, lang: Lang) =>
  new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v).replace(/[  ]/g, ' ');
const range = (a: number, b: number, lang: Lang) => (a === b ? eur(a, lang) : `${eur(a, lang)} – ${eur(b, lang)}`);

type Txt = {
  subject: string;
  hello: (p: string) => string;
  intro: string;
  sumTitle: string;
  prix: string;
  total: string;
  apportNec: string;
  apportTotal: string;
  ok: string;
  gap: (m: string) => string;
  pret: string;
  mens: (pret: string, v: string, f: string, mois: string) => string;
  m2Title: (prix: string) => string;
  m2: (c: string, type: string, m2: number, src: string) => string;
  noData: (c: string, type: string) => string;
  apt: string;
  house: string;
  srcAnnonce: string;
  srcVentes: string;
  caveat: string;
  nextTitle: string;
  call: string;
  courtier: string;
  vendre: string;
  contact: (tel: string) => string;
  why: string;
  privacy: string;
  notYou: string;
};

const T: Record<Lang, Txt> = {
  fr: {
    subject: 'Votre budget d’achat – ImmoBuild Kohn',
    hello: (p) => `Bonjour ${p},`,
    intro: 'Merci pour votre demande. Voici le récapitulatif de votre analyse, pour la garder sous la main.',
    sumTitle: 'Votre budget',
    prix: 'Prix d’achat envisagé',
    total: 'Besoin total (prix et frais)',
    apportNec: 'Apport nécessaire au minimum (règle CSSF)',
    apportTotal: 'Votre apport',
    ok: 'Selon la règle CSSF, votre apport couvre le minimum pour ce prix, si votre banque vous prête ce montant. Vos revenus comptent aussi.',
    gap: (m) => `Pour ce prix, il manque environ ${m} d’apport selon la règle CSSF.`,
    pret: 'Prêt nécessaire avec votre apport',
    mens: (pret, v, f, mois) => `Mensualité d’exemple sur 25 ans pour ${pret} : environ ${v} à taux variable et ${f} à taux fixe (taux moyens BCL, ${mois}, hors assurance).`,
    m2Title: (prix) => `Ce que ${prix} représente`,
    m2: (c, type, m2, src) => `${c} (${type}) : environ ${m2} m² (${src})`,
    noData: (c, type) => `${c} (${type}) : pas assez de données publiques`,
    apt: 'appartement',
    house: 'maison',
    srcAnnonce: 'prix annoncés',
    srcVentes: 'ventes notariées',
    caveat: 'Calcul indicatif selon les règles publiques, avec des moyennes : ce n’est ni un conseil en crédit ni une offre de prêt. Seule votre banque décide.',
    nextTitle: 'Et maintenant ?',
    call: 'Jason vous rappelle pour parler de votre recherche.',
    courtier: 'Vous avez demandé à être mis(e) en relation avec notre courtier partenaire : Jason lui transmet votre demande.',
    vendre: 'Vous devez d’abord vendre ? Estimez votre bien gratuitement :',
    contact: (tel) => `Une question ? Répondez simplement à cet e-mail${tel ? ` ou appelez Jason au ${tel}` : ''}.`,
    why: 'Vous recevez cet e-mail parce que vous avez demandé une analyse sur l’outil « Mon budget d’achat » d’ImmoBuild Kohn.',
    privacy: 'Politique de confidentialité',
    notYou: 'Vous n’avez rien demandé ? Ignorez simplement ce message.',
  },
  de: {
    subject: 'Ihr Kaufbudget – ImmoBuild Kohn',
    hello: (p) => `Guten Tag ${p},`,
    intro: 'Danke für Ihre Anfrage. Hier ist die Zusammenfassung Ihrer Analyse zum Aufbewahren.',
    sumTitle: 'Ihr Budget',
    prix: 'Geplanter Kaufpreis',
    total: 'Gesamtbedarf (Preis und Nebenkosten)',
    apportNec: 'Nötiges Eigenkapital mindestens (CSSF-Regel)',
    apportTotal: 'Ihr Eigenkapital',
    ok: 'Nach der CSSF-Regel deckt Ihr Eigenkapital das Minimum für diesen Preis, sofern Ihre Bank Ihnen diesen Betrag leiht. Ihr Einkommen zählt auch.',
    gap: (m) => `Für diesen Preis fehlen nach der CSSF-Regel etwa ${m} Eigenkapital.`,
    pret: 'Nötiger Kredit mit Ihrem Eigenkapital',
    mens: (pret, v, f, mois) => `Beispiel-Monatsrate über 25 Jahre für ${pret}: etwa ${v} mit variablem und ${f} mit festem Zins (BCL-Durchschnittszinsen, ${mois}, ohne Versicherung).`,
    m2Title: (prix) => `Was ${prix} bedeuten`,
    m2: (c, type, m2, src) => `${c} (${type}): etwa ${m2} m² (${src})`,
    noData: (c, type) => `${c} (${type}): nicht genug öffentliche Daten`,
    apt: 'Wohnung',
    house: 'Haus',
    srcAnnonce: 'Angebotspreise',
    srcVentes: 'notarielle Verkäufe',
    caveat: 'Unverbindliche Rechnung nach öffentlichen Regeln, mit Durchschnittswerten: weder eine Kreditberatung noch ein Kreditangebot. Nur Ihre Bank entscheidet.',
    nextTitle: 'Wie geht es weiter?',
    call: 'Jason ruft Sie an, um über Ihre Suche zu sprechen.',
    courtier: 'Sie möchten mit unserem Partner-Kreditvermittler in Kontakt kommen: Jason gibt Ihre Anfrage weiter.',
    vendre: 'Sie müssen zuerst verkaufen? Lassen Sie Ihre Immobilie kostenlos bewerten:',
    contact: (tel) => `Fragen? Antworten Sie einfach auf diese E-Mail${tel ? ` oder rufen Sie Jason an: ${tel}` : ''}.`,
    why: 'Sie erhalten diese E-Mail, weil Sie im Tool „Mein Kaufbudget“ von ImmoBuild Kohn eine Analyse angefordert haben.',
    privacy: 'Datenschutzerklärung',
    notYou: 'Sie haben nichts angefordert? Dann ignorieren Sie diese Nachricht einfach.',
  },
  en: {
    subject: 'Your purchase budget – ImmoBuild Kohn',
    hello: (p) => `Hello ${p},`,
    intro: 'Thank you for your request. Here is a summary of your analysis to keep.',
    sumTitle: 'Your budget',
    prix: 'Purchase price you have in mind',
    total: 'Total needed (price and costs)',
    apportNec: 'Minimum deposit needed (CSSF rule)',
    apportTotal: 'Your deposit',
    ok: 'Under the CSSF rule, your deposit covers the minimum for this price, if your bank lends you this amount. Your income counts too.',
    gap: (m) => `For this price, you are short of about ${m} of deposit under the CSSF rule.`,
    pret: 'Loan needed with your deposit',
    mens: (pret, v, f, mois) => `Example monthly payment over 25 years for ${pret}: about ${v} at a variable rate and ${f} at a fixed rate (BCL average rates, ${mois}, insurance not included).`,
    m2Title: (prix) => `What ${prix} gets you`,
    m2: (c, type, m2, src) => `${c} (${type}): about ${m2} m² (${src})`,
    noData: (c, type) => `${c} (${type}): not enough public data`,
    apt: 'apartment',
    house: 'house',
    srcAnnonce: 'asking prices',
    srcVentes: 'notarised sales',
    caveat: 'Indicative calculation based on public rules and averages: neither credit advice nor a loan offer. Only your bank decides.',
    nextTitle: 'What happens next?',
    call: 'Jason will call you to talk about your search.',
    courtier: 'You asked to be put in touch with our partner broker: Jason passes your request on.',
    vendre: 'Need to sell first? Get a free valuation of your property:',
    contact: (tel) => `Any questions? Just reply to this email${tel ? ` or call Jason on ${tel}` : ''}.`,
    why: 'You are receiving this email because you requested an analysis in ImmoBuild Kohn’s “My purchase budget” tool.',
    privacy: 'Privacy policy',
    notYou: 'Didn’t request anything? Simply ignore this message.',
  },
};


/** Petit guide envoyé avec le récapitulatif. Faits vérifiés le 19/11/2026 :
 *  « compromis de vente vaut vente » et condition suspensive de prêt (guichet.public.lu, compromis de vente) ;
 *  certificat de performance énergétique obligatoire à la vente (guichet.public.lu) ;
 *  garantie d'achèvement en VEFA (Code civil, art. 1601-5, loi du 28/12/1976) ;
 *  Bëllegen Akt : habiter dans les 2 ans (4 ans en construction / terrain), au moins 2 ans (guichet.public.lu, 07/07/2025).
 *  L'écart annonce → vente est calculé sur les données de l'outil (médiane des communes). À relire par Jason. */
type Guide = {
  title: string; avant: string; compromis: string; cpe: string; copro: string; vefa: string; etat: string; bellegen: string;
  prixTitle: string; ecart: (p: string, debut: string, fin: string) => string; serieuse: string; enLigne: string; travaux: string; note: string;
};
const GUIDE: Record<Lang, Guide> = {
  fr: {
    title: 'Petit guide de l’acheteur',
    avant: 'Avant de signer',
    compromis: 'Le compromis vous engage : au Luxembourg, « compromis de vente vaut vente ». Faites-y inscrire une condition suspensive d’obtention du prêt, avec un délai assez long pour la réponse de votre banque.',
    cpe: 'Demandez le certificat de performance énergétique (obligatoire à la vente) : la classe énergétique pèse sur le chauffage et les travaux à venir.',
    copro: 'Appartement : demandez les derniers procès-verbaux d’assemblée générale, le montant des charges et les travaux votés ou prévus.',
    vefa: 'Neuf sur plan : la loi impose au promoteur une garantie d’achèvement. Demandez-la et vérifiez ce qu’elle couvre ; vous payez au fur et à mesure de l’avancement des travaux.',
    etat: 'État du bien : toiture, châssis, chauffage, électricité, humidité. Faites chiffrer les travaux avant de faire une offre (je peux vous y aider avec ImmoBuild).',
    bellegen: 'Bëllegen Akt : il faut habiter le logement dans les 2 ans (4 ans pour un bien en construction) et y rester au moins 2 ans, sinon le crédit d’impôt est à rembourser.',
    prixTitle: 'Reconnaître un prix réaliste',
    ecart: (p: string, debut: string, fin: string) => `Comparez aux ventes réelles, pas seulement aux annonces : pour les appartements, les prix de vente au m² sont en médiane environ ${p} % plus bas que les prix annoncés (Observatoire de l’Habitat, ${debut} – ${fin}).`,
    serieuse: 'Une estimation sérieuse se fait sur place : elle tient compte de l’état, de la classe énergétique, de l’étage et des annexes, et explique sa méthode et ses sources par écrit.',
    enLigne: 'Un chiffre sans visite ni explication, y compris celui d’un outil en ligne comme celui-ci, ne donne qu’un ordre de grandeur.',
    travaux: 'Un prix bas peut cacher un gros budget de travaux : comparez toujours « prix + travaux ».',
    note: 'Conseils généraux, pas un avis juridique : votre notaire reste votre interlocuteur pour l’acte.',
  },
  de: {
    title: 'Kleiner Ratgeber für Käufer',
    avant: 'Vor der Unterschrift',
    compromis: 'Der Vorvertrag bindet Sie: In Luxemburg gilt « compromis de vente vaut vente ». Lassen Sie eine aufschiebende Bedingung für die Kreditzusage eintragen, mit genug Zeit für die Antwort Ihrer Bank.',
    cpe: 'Verlangen Sie den Energiepass (beim Verkauf Pflicht): Die Energieklasse bestimmt Heizkosten und künftige Arbeiten mit.',
    copro: 'Wohnung: Verlangen Sie die letzten Protokolle der Eigentümerversammlung, die Höhe der Nebenkosten und beschlossene oder geplante Arbeiten.',
    vefa: 'Neubau auf Plan: Das Gesetz verpflichtet den Bauträger zu einer Fertigstellungsgarantie. Verlangen Sie sie und prüfen Sie, was sie abdeckt; Sie zahlen nach Baufortschritt.',
    etat: 'Zustand: Dach, Fenster, Heizung, Elektrik, Feuchtigkeit. Lassen Sie die Arbeiten vor dem Angebot beziffern (mit ImmoBuild helfe ich Ihnen dabei).',
    bellegen: 'Bëllegen Akt: Sie müssen innerhalb von 2 Jahren (4 Jahre bei einem Bau in Arbeit) einziehen und mindestens 2 Jahre dort wohnen, sonst ist die Steuergutschrift zurückzuzahlen.',
    prixTitle: 'Einen realistischen Preis erkennen',
    ecart: (p: string, debut: string, fin: string) => `Vergleichen Sie mit echten Verkäufen, nicht nur mit Inseraten: Bei Wohnungen liegen die Verkaufspreise pro m² im Median etwa ${p} % unter den Angebotspreisen (Observatoire de l’Habitat, ${debut} – ${fin}).`,
    serieuse: 'Eine seriöse Bewertung erfolgt vor Ort: Sie berücksichtigt Zustand, Energieklasse, Stockwerk und Nebenräume und erklärt Methode und Quellen schriftlich.',
    enLigne: 'Eine Zahl ohne Besichtigung und Erklärung, auch aus einem Online-Tool wie diesem, ist nur eine Größenordnung.',
    travaux: 'Ein niedriger Preis kann hohe Renovierungskosten verbergen: Vergleichen Sie immer „Preis + Arbeiten“.',
    note: 'Allgemeine Hinweise, keine Rechtsberatung: Für die Urkunde ist Ihr Notar Ihr Ansprechpartner.',
  },
  en: {
    title: 'A short buyer’s guide',
    avant: 'Before you sign',
    compromis: 'The preliminary contract binds you: in Luxembourg, “compromis de vente vaut vente”. Have a condition precedent for obtaining the loan written into it, with enough time for your bank’s answer.',
    cpe: 'Ask for the energy performance certificate (mandatory for a sale): the energy class weighs on heating costs and future works.',
    copro: 'Apartment: ask for the latest minutes of the owners’ general meeting, the service charges and any works voted or planned.',
    vefa: 'New build off-plan: the law requires the developer to provide a completion guarantee. Ask for it and check what it covers; you pay as the works progress.',
    etat: 'Condition: roof, windows, heating, electrics, damp. Get the works costed before making an offer (I can help you with ImmoBuild).',
    bellegen: 'Bëllegen Akt: you must move in within 2 years (4 years for a property under construction) and live there for at least 2 years, otherwise the tax credit must be repaid.',
    prixTitle: 'Recognising a realistic price',
    ecart: (p: string, debut: string, fin: string) => `Compare with actual sales, not just listings: for apartments, sale prices per m² are about ${p}% lower than asking prices in median (Observatoire de l’Habitat, ${debut} – ${fin}).`,
    serieuse: 'A serious valuation is done on site: it takes account of condition, energy class, floor and extras, and explains its method and sources in writing.',
    enLigne: 'A figure without a visit or explanation, including from an online tool like this one, is only a rough guide.',
    travaux: 'A low price can hide a big renovation bill: always compare “price + works”.',
    note: 'General advice, not legal advice: your notary remains your contact for the deed.',
  },
};

function moisTexte(mois: string, lang: Lang): string {
  const [y, m] = mois.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
}

/** Contexte de données pour le guide : écart médian annonce → vente (appartements) et période */
export interface GuideData {
  ecart: number | null;
  debut: string;
  fin: string;
}

function dateCourte(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(LOCALES[lang], { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export function clientEmail(s: Submission, b: Budget, communes: CommuneM2[], taux: Taux | null, data?: GuideData): { subject: string; html: string; text: string } {
  const lang = s.lang;
  const t = T[lang];
  const a = s.answers;
  const rows: [string, string][] = [
    [t.prix, eur(b.prix, lang)],
    [t.total, range(b.totalMin, b.totalMax, lang)],
    [t.apportNec, range(b.apportNecessaireMin, b.apportNecessaireMax, lang)],
    [t.apportTotal, eur(b.apportTotal, lang)],
    ...(b.pretNecessaire < b.pret ? ([[t.pret, eur(b.pretNecessaire, lang)]] as [string, string][]) : []),
  ];
  const verdict = b.margeMin >= 0 ? t.ok : t.gap(range(Math.max(0, -b.margeMax), -b.margeMin, lang));
  const mens =
    taux && b.pretNecessaire > 0
      ? t.mens(eur(b.pretNecessaire, lang), eur(Math.round(mensualite(b.pretNecessaire, taux.variable, 25) / 10) * 10, lang), eur(Math.round(mensualite(b.pretNecessaire, taux.fixe, 25) / 10) * 10, lang), moisTexte(taux.mois, lang))
      : '';
  const m2 = communes.map((c) => {
    const type = c.type === 'maison' ? t.house : t.apt;
    if (c.m2 === null || c.source === null) return t.noData(c.commune, type);
    return t.m2(c.commune, type, c.m2, c.source === 'annonce' || c.source === 'canton_annonce' ? t.srcAnnonce : t.srcVentes);
  });
  const next = [t.call, ...(a.courtier ? [t.courtier] : [])];
  const estimation = a.vendre === 'oui_lu' ? config.estimationUrl[lang] : '';
  const g = GUIDE[lang];
  const avant = [
    g.compromis,
    g.cpe,
    ...(a.type !== 'maison' ? [g.copro] : []),
    ...(a.neuf !== 'ancien' ? [g.vefa] : []),
    g.etat,
    ...(a.usage === 'habiter' ? [g.bellegen] : []),
  ];
  const prixPts = [
    ...(data?.ecart ? [g.ecart(new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(data.ecart * 100), dateCourte(data.debut, lang), dateCourte(data.fin, lang))] : []),
    g.serieuse,
    g.enLigne,
    g.travaux,
  ];
  const privacy = config.privacyUrl[lang];

  const text = [
    t.hello(s.contact.prenom),
    '',
    t.intro,
    '',
    `== ${t.sumTitle} ==`,
    ...rows.map(([k, v]) => `${k}${lang === 'fr' ? ' : ' : ': '}${v}`),
    '',
    verdict,
    ...(mens ? ['', mens] : []),
    '',
    `== ${t.m2Title(eur(b.prix, lang))} ==`,
    ...m2,
    '',
    t.caveat,
    '',
    `== ${g.title} ==`,
    `${g.avant} :`.replace(' :', lang === 'fr' ? ' :' : ':'),
    ...avant.map((x) => `- ${x}`),
    '',
    `${g.prixTitle}${lang === 'fr' ? ' :' : ':'}`,
    ...prixPts.map((x) => `- ${x}`),
    '',
    g.note,
    '',
    `== ${t.nextTitle} ==`,
    ...next,
    ...(estimation ? [`${t.vendre} ${estimation}`] : []),
    t.contact(config.phone),
    '',
    '—',
    `${config.agent.name} · ${config.agent.role}`,
    '',
    t.why,
    `${t.privacy}${lang === 'fr' ? ' : ' : ': '}${privacy}`,
    t.notYou,
  ].join('\n');

  const p = (x: string) => `<p style="margin:0 0 12px">${escapeHtml(x)}</p>`;
  const h = (x: string) => `<h2 style="font-size:16px;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid #F2EFEA">${escapeHtml(x)}</h2>`;
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;padding:24px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342;font-size:15px;line-height:1.5">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px">
${p(t.hello(s.contact.prenom))}${p(t.intro)}
${h(t.sumTitle)}
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;border-bottom:1px solid #F2EFEA">${escapeHtml(k)}</td><td style="padding:6px 0;border-bottom:1px solid #F2EFEA;text-align:right;white-space:nowrap;font-weight:bold">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
<p style="margin:12px 0">${escapeHtml(verdict)}</p>
${mens ? p(mens) : ''}
${h(t.m2Title(eur(b.prix, lang)))}
<ul style="margin:0 0 12px;padding-left:20px">${m2.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
<p style="margin:0 0 12px;font-size:13px;color:#46566c;font-style:italic">${escapeHtml(t.caveat)}</p>
${h(g.title)}
<p style="margin:0 0 6px;font-weight:bold">${escapeHtml(g.avant)}</p>
<ul style="margin:0 0 12px;padding-left:20px">${avant.map((x) => `<li style="margin-bottom:6px">${escapeHtml(x)}</li>`).join('')}</ul>
<p style="margin:0 0 6px;font-weight:bold">${escapeHtml(g.prixTitle)}</p>
<ul style="margin:0 0 12px;padding-left:20px">${prixPts.map((x) => `<li style="margin-bottom:6px">${escapeHtml(x)}</li>`).join('')}</ul>
<p style="margin:0 0 12px;font-size:13px;color:#46566c;font-style:italic">${escapeHtml(g.note)}</p>
${h(t.nextTitle)}
${next.map(p).join('')}
${estimation ? `<p style="margin:0 0 12px">${escapeHtml(t.vendre)} <a href="${escapeHtml(estimation)}" style="color:#0A2342;font-weight:bold">${escapeHtml(estimation.replace(/^https:\/\//, '').replace(/\/?\?.*$/, ''))}</a></p>` : ''}
${p(t.contact(config.phone))}
<p style="margin:16px 0 0;font-weight:bold">${escapeHtml(config.agent.name)}</p><p style="margin:0 0 16px;color:#46566c">${escapeHtml(config.agent.role)}</p>
<p style="margin:24px 0 0;font-size:12px;color:#46566c">${escapeHtml(t.why)} <a href="${escapeHtml(privacy)}" style="color:#46566c">${escapeHtml(t.privacy)}</a>. ${escapeHtml(t.notYou)}</p>
</div></body></html>`;
  return { subject: t.subject, html, text };
}
