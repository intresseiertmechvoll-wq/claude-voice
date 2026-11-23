/**
 * Copie du résultat envoyée au visiteur (désactivée par défaut : config.json → copieVisiteur).
 *
 * Contre les abus (quelqu'un qui taperait l'adresse d'un tiers pour lui envoyer un texte) :
 * l'e-mail ne contient AUCUN texte libre saisi dans le formulaire (ni prénom, ni nom, ni message),
 * seulement des valeurs choisies dans des listes fermées et des chiffres calculés.
 */
import config from '../../config.json';
import type { Estimate } from './engine';
import { escapeHtml } from './email';
import type { Submission } from './types';

type Lang = Submission['lang'];

const LOCALE: Record<Lang, string> = { fr: 'fr-LU', de: 'de-LU', en: 'en-GB' };

const T = {
  fr: {
    subject: (c: string) => `Votre estimation de loyer à ${c} – ImmoBuild Kohn`,
    hello: 'Bonjour,',
    intro: 'Merci pour votre demande. Voici le résultat de votre estimation de loyer, comme affiché à l’écran.',
    bien: { appartement: 'Appartement', maison: 'Maison' },
    conseille: 'Loyer conseillé',
    parMois: 'par mois, hors charges',
    fourchette: 'Fourchette',
    prudent: 'loyer prudent (niveau des baux signés)',
    annonce: 'loyer d’annonce (niveau des annonces actuelles)',
    fiabilite: 'Fiabilité des données',
    rel: { high: 'bonne', medium: 'moyenne', low: 'limitée' },
    meuble: 'Meublé : le supplément pour le mobilier se calcule à part (au plus 1,5 % par mois de la valeur des meubles de moins de 10 ans).',
    plafond: 'Le loyer ne peut pas dépasser un plafond légal : 5 % par an du capital investi dans le logement. Je le vérifie avec vous.',
    loi: 'Voir la loi',
    sansEngagement: 'Estimation indicative, calculée à partir de statistiques publiques. Elle ne remplace pas une visite.',
    suite: (agent: string) => `${agent} vous recontacte au sujet de votre bien. Vous pouvez aussi simplement répondre à cet e-mail.`,
    pied: 'Vous recevez cet e-mail parce que vous avez demandé une estimation de loyer sur notre site. Nous ne vous enverrons pas de newsletter.',
    surface: (n: number) => `${n} m²`,
  },
  de: {
    subject: (c: string) => `Ihre Mietschätzung für ${c} – ImmoBuild Kohn`,
    hello: 'Guten Tag,',
    intro: 'vielen Dank für Ihre Anfrage. Hier ist das Ergebnis Ihrer Mietschätzung, wie es auf dem Bildschirm angezeigt wurde.',
    bien: { appartement: 'Wohnung', maison: 'Haus' },
    conseille: 'Empfohlene Miete',
    parMois: 'pro Monat, ohne Nebenkosten',
    fourchette: 'Spanne',
    prudent: 'Vertragsmiete (Niveau abgeschlossener Verträge)',
    annonce: 'Angebotsmiete (Niveau der aktuellen Inserate)',
    fiabilite: 'Datenlage',
    rel: { high: 'gut', medium: 'mittel', low: 'begrenzt' },
    meuble: 'Möbliert: Der Möbelzuschlag wird getrennt berechnet (höchstens 1,5 % pro Monat vom Wert der Möbel, die jünger als 10 Jahre sind).',
    plafond: 'Die Miete darf eine gesetzliche Obergrenze nicht überschreiten: 5 % pro Jahr des in die Immobilie investierten Kapitals. Ich prüfe das mit Ihnen.',
    loi: 'Gesetz ansehen',
    sansEngagement: 'Unverbindliche Schätzung auf Basis öffentlicher Statistiken. Sie ersetzt keine Besichtigung.',
    suite: (agent: string) => `${agent} meldet sich wegen Ihrer Immobilie bei Ihnen. Sie können auch einfach auf diese E-Mail antworten.`,
    pied: 'Sie erhalten diese E-Mail, weil Sie auf unserer Website eine Mietschätzung angefragt haben. Wir senden Ihnen keinen Newsletter.',
    surface: (n: number) => `${n} m²`,
  },
  en: {
    subject: (c: string) => `Your rent estimate for ${c} – ImmoBuild Kohn`,
    hello: 'Hello,',
    intro: 'Thank you for your request. Here is the result of your rent estimate, as shown on screen.',
    bien: { appartement: 'Apartment', maison: 'House' },
    conseille: 'Suggested rent',
    parMois: 'per month, excluding service charges',
    fourchette: 'Range',
    prudent: 'conservative rent (level of signed leases)',
    annonce: 'asking rent (level of current listings)',
    fiabilite: 'Data reliability',
    rel: { high: 'good', medium: 'medium', low: 'limited' },
    meuble: 'Furnished: a furniture supplement is calculated separately (at most 1.5% per month of the value of furniture less than 10 years old).',
    plafond: 'The rent may not exceed a legal cap: 5% per year of the capital invested in the property. I’ll check this with you.',
    loi: 'See the law',
    sansEngagement: 'Indicative estimate based on public statistics. It does not replace a visit.',
    suite: (agent: string) => `${agent} will contact you about your property. You can also simply reply to this email.`,
    pied: 'You are receiving this email because you requested a rent estimate on our website. We will not send you a newsletter.',
    surface: (n: number) => `${n} m²`,
  },
} as const;

export function emailVisiteur(s: Submission, e: Estimate): { subject: string; html: string; text: string } {
  const t = T[s.lang];
  const r = e.result;
  const eur = (n: number) => new Intl.NumberFormat(LOCALE[s.lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const bien = `${t.bien[r.type]} · ${t.surface(r.surface)} · ${r.commune}`;
  const agent = config.agent.name;
  const sep = s.lang === 'fr' ? '\u00a0: ' : ': ';

  const lignes: string[] = [
    t.hello,
    t.intro,
    '',
    bien,
    `${t.conseille}${sep}${eur(r.mid)} ${t.parMois}`,
    `${t.fourchette}${sep}${eur(r.low)} – ${eur(r.high)}`,
    `  ${eur(r.low)} = ${t.prudent}`,
    `  ${eur(r.high)} = ${t.annonce}`,
    `${t.fiabilite}${sep}${t.rel[r.reliability]}`,
    ...(r.meuble ? ['', t.meuble] : []),
    '',
    `${t.plafond} ${t.loi}${sep}${config.legalUrl}`,
    '',
    t.sansEngagement,
    '',
    t.suite(agent),
    '',
    `${agent} – ${config.agent.role}`,
    '',
    '—',
    t.pied,
  ];
  const text = lignes.join('\n');

  const p = (x: string, style = '') => `<p style="margin:0 0 12px;${style}">${x}</p>`;
  const html = `<!doctype html><html lang="${s.lang}"><body style="margin:0;padding:24px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342;font-size:15px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px">
${p(escapeHtml(t.hello))}${p(escapeHtml(t.intro))}
<div style="background:#0A2342;color:#ffffff;padding:20px;margin:16px 0;text-align:center">
<p style="margin:0 0 4px;font-size:14px">${escapeHtml(bien)}</p>
<p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#C5A46D">${escapeHtml(t.conseille)}</p>
<p style="margin:4px 0;font-size:32px;font-weight:bold">${escapeHtml(eur(r.mid))}</p>
<p style="margin:0;font-size:13px">${escapeHtml(t.parMois)}</p>
</div>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px">
<tr><td style="padding:6px 8px 6px 0;font-weight:bold;white-space:nowrap">${escapeHtml(eur(r.low))}</td><td style="padding:6px 0">${escapeHtml(t.prudent)}</td></tr>
<tr><td style="padding:6px 8px 6px 0;font-weight:bold;white-space:nowrap">${escapeHtml(eur(r.high))}</td><td style="padding:6px 0">${escapeHtml(t.annonce)}</td></tr>
<tr><td style="padding:6px 8px 6px 0;color:#4a5a70">${escapeHtml(t.fiabilite)}</td><td style="padding:6px 0">${escapeHtml(t.rel[r.reliability])}</td></tr>
</table>
${r.meuble ? p(escapeHtml(t.meuble), 'font-size:14px') : ''}
${p(`${escapeHtml(t.plafond)} <a href="${escapeHtml(config.legalUrl)}" style="color:#0A2342">${escapeHtml(t.loi)}</a>`, 'font-size:14px')}
${p(escapeHtml(t.sansEngagement), 'font-size:14px;color:#4a5a70')}
${p(escapeHtml(t.suite(agent)))}
${p(`<strong>${escapeHtml(agent)}</strong><br>${escapeHtml(config.agent.role)}`)}
<p style="margin:24px 0 0;font-size:12px;color:#4a5a70;border-top:1px solid #F2EFEA;padding-top:12px">${escapeHtml(t.pied)}</p>
</div></body></html>`;

  return { subject: t.subject(r.commune), html, text };
}
