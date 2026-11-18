/**
 * E-mail de confirmation au visiteur, dans sa langue : la même estimation que celle affichée en ligne,
 * la source, l'avertissement « indicative » et le contact de Jason. Rien d'autre (ni réponses détaillées, ni adresse).
 * Réponse à cet e-mail → Jason (reply_to = adresse des leads).
 */
import { translator, type T } from '../i18n';
import { formatDate, formatEuro } from '../ui/format';
import type { Estimate } from './engine';
import { escapeHtml } from './email';
import type { Submission } from './types';

export interface ClientMailOptions {
  agent: { name: string; role: string };
  phone?: string;
  contactUrl: string;
  privacyUrl: string;
  date: Date;
}

/** Les dictionnaires DE / EN doivent être chargés avant (loadLang) */
export function clientEmail(s: Submission, e: Estimate, o: ClientMailOptions): { subject: string; html: string; text: string } {
  const t: T = translator(s.lang);
  const r = e.result;
  const lang = s.lang;
  const eur = (v: number) => formatEuro(v, lang);
  const sep = lang === 'fr' ? '\u00a0: ' : ': ';
  const bien = t('result.subtitle', { type: t(`fields.typeOptions.${r.type}`), commune: r.commune });
  const ok = r.status === 'ok' && r.market !== null && r.low !== null && r.high !== null;
  const subject = t(ok ? 'mailClient.subject' : 'mailClient.subjectNoData', { bien }).replace(/[\r\n]+/g, ' ');
  const prenom = s.contact.prenom;
  const periode = `${formatDate(r.periodeDebut, lang)} – ${formatDate(r.periodeFin, lang)}`;
  const source = t(r.type === 'maison' ? 'result.sourceMaison' : 'result.sourceAppartement');
  const dateLine = t('result.printDate', { date: new Intl.DateTimeFormat(lang === 'fr' ? 'fr-LU' : lang === 'de' ? 'de-LU' : 'en-GB', { dateStyle: 'long', timeZone: 'Europe/Luxembourg' }).format(o.date) });

  const rows: [string, string][] = ok
    ? [
        [t('result.market'), eur(r.market!)],
        [t('result.low'), eur(r.low!)],
        [t('result.high'), eur(r.high!)],
      ]
    : [];
  const perM2 = ok && r.pricePerM2 ? t('result.perM2', { value: eur(r.pricePerM2) }) : '';
  const notes = ok
    ? [t('result.disclaimer'), ...(r.type === 'maison' ? [t('result.indicativeHouse')] : []), t('result.source', { source, periode })]
    : [t('result.noDataText')];
  const contact: [string, string][] = [
    ...(o.phone ? ([[t('mailClient.phone'), o.phone]] as [string, string][]) : []),
    ['Web', o.contactUrl],
  ];

  const text = [
    t('mailClient.hello', { prenom }),
    '',
    ok ? t('mailClient.intro') : t('result.noDataTitle'),
    '',
    `${bien} · ${dateLine}`,
    ...rows.map(([k, v], i) => `${k}${sep}${v}${i === 0 && perM2 ? ` (${perM2})` : ''}`),
    '',
    ...notes,
    ...(ok ? [`${t('result.sourceLink')}${sep}${r.sourceUrl}`] : []),
    '',
    t('mailClient.next'),
    ...contact.map(([k, v]) => `${k}${sep}${v}`),
    '',
    `${o.agent.name}`,
    `${o.agent.role}`,
    '',
    '--',
    t('mailClient.footer'),
    `${t('mailClient.privacy')}${sep}${o.privacyUrl}`,
  ].join('\n');

  const h = escapeHtml;
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;padding:24px 12px;background:#F8F8F6;font-family:Arial,Helvetica,sans-serif;color:#0A2342;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-top:4px solid #C5A46D;padding:24px">
<p style="margin:0 0 20px;font-size:13px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#0A2342">ImmoBuild Kohn</p>
<p style="margin:0 0 12px">${h(t('mailClient.hello', { prenom }))}</p>
<p style="margin:0 0 20px">${h(ok ? t('mailClient.intro') : t('result.noDataTitle'))}</p>
<p style="margin:0 0 4px;font-weight:bold">${h(bien)}</p>
<p style="margin:0 0 12px;font-size:13px;color:#4a5a70">${h(dateLine)}</p>
${
  ok
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:15px">${rows
        .map(
          ([k, v], i) =>
            `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #F2EFEA;color:#4a5a70;vertical-align:top">${h(k)}</td><td style="padding:8px 0;border-bottom:1px solid #F2EFEA;text-align:right;vertical-align:top;white-space:nowrap"><strong style="${i === 0 ? 'font-size:20px' : ''}">${h(v)}</strong>${i === 0 && perM2 ? `<br><span style="font-size:13px;color:#4a5a70">${h(perM2)}</span>` : ''}</td></tr>`,
        )
        .join('')}</table>`
    : ''
}
${notes.map((n) => `<p style="margin:0 0 8px;font-size:13px;color:#4a5a70">${h(n)}</p>`).join('\n')}
${ok ? `<p style="margin:0 0 20px;font-size:13px"><a href="${h(r.sourceUrl)}" style="color:#0A2342">${h(t('result.sourceLink'))}</a></p>` : ''}
<p style="margin:20px 0 8px">${h(t('mailClient.next'))}</p>
<p style="margin:0 0 20px">${o.phone ? `${h(t('mailClient.phone'))}${sep}<a href="tel:${h(o.phone.replace(/\s/g, ''))}" style="color:#0A2342;font-weight:bold">${h(o.phone)}</a><br>` : ''}<a href="${h(o.contactUrl)}" style="color:#0A2342">${h(o.contactUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></p>
<p style="margin:0"><strong>${h(o.agent.name)}</strong><br><span style="color:#4a5a70">${h(o.agent.role)}</span></p>
<p style="margin:28px 0 0;padding-top:12px;border-top:1px solid #F2EFEA;font-size:12px;color:#4a5a70">${h(t('mailClient.footer'))} <a href="${h(o.privacyUrl)}" style="color:#4a5a70">${h(t('mailClient.privacy'))}</a></p>
</div></body></html>`;
  return { subject, html, text };
}
