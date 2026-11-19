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

function moisTexte(mois: string, lang: Lang): string {
  const [y, m] = mois.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
}

export function clientEmail(s: Submission, b: Budget, communes: CommuneM2[], taux: Taux | null): { subject: string; html: string; text: string } {
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
${h(t.nextTitle)}
${next.map(p).join('')}
${estimation ? `<p style="margin:0 0 12px">${escapeHtml(t.vendre)} <a href="${escapeHtml(estimation)}" style="color:#0A2342;font-weight:bold">${escapeHtml(estimation.replace(/^https:\/\//, '').replace(/\/?\?.*$/, ''))}</a></p>` : ''}
${p(t.contact(config.phone))}
<p style="margin:16px 0 0;font-weight:bold">${escapeHtml(config.agent.name)}</p><p style="margin:0 0 16px;color:#46566c">${escapeHtml(config.agent.role)}</p>
<p style="margin:24px 0 0;font-size:12px;color:#46566c">${escapeHtml(t.why)} <a href="${escapeHtml(privacy)}" style="color:#46566c">${escapeHtml(t.privacy)}</a>. ${escapeHtml(t.notYou)}</p>
</div></body></html>`;
  return { subject: t.subject, html, text };
}
