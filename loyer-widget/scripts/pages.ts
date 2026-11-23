/**
 * Pages de présentation (trouvables sur Google) : /fr/, /de/, /en/, avec l'outil intégré.
 * Les exemples de loyers sont calculés par l'outil lui-même (src/shared/engine.ts), jamais saisis à la main.
 *
 *   npm run pages      (à relancer après chaque mise à jour des données : npm run update-data)
 *
 * Écrit fr/index.html, de/index.html, en/index.html (entrées Vite) et public/sitemap.xml.
 * Un test (tests/pages.test.ts) vérifie que ces fichiers sont à jour.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config.json';
import data from '../data/loyers.json';
import refs from '../data/references.json';
import params from '../params.json';
import { estimate, type Params } from '../src/shared/engine';
import type { Answers, Dataset, References } from '../src/shared/types';

type Lang = 'fr' | 'de' | 'en';
const LANGS: Lang[] = ['fr', 'de', 'en'];
const SITE = String((config as { siteUrl?: string }).siteUrl ?? 'https://verlounen.lu').replace(/\/$/, '');
const LOCALE: Record<Lang, string> = { fr: 'fr-LU', de: 'de-LU', en: 'en-GB' };
const OG_LOCALE: Record<Lang, string> = { fr: 'fr_LU', de: 'de_LU', en: 'en_GB' };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Exemples par région : une commune représentative, bien « neutre » (bon état, classe D, sans extras) */
const EXEMPLES: { commune: string; nom: Record<Lang, string> }[] = [
  { commune: 'Luxembourg', nom: { fr: 'Luxembourg-Ville', de: 'Luxemburg-Stadt', en: 'Luxembourg City' } },
  { commune: 'Strassen', nom: { fr: 'Communes autour de Luxembourg-Ville (Strassen, Bertrange…)', de: 'Gemeinden rund um Luxemburg-Stadt (Strassen, Bertrange …)', en: 'Communes around Luxembourg City (Strassen, Bertrange…)' } },
  { commune: 'Mamer', nom: { fr: 'Canton de Capellen (Mamer, Steinfort…)', de: 'Kanton Capellen (Mamer, Steinfort …)', en: 'Canton of Capellen (Mamer, Steinfort…)' } },
  { commune: 'Mersch', nom: { fr: 'Canton de Mersch', de: 'Kanton Mersch', en: 'Canton of Mersch' } },
  { commune: 'Dudelange', nom: { fr: 'Sud : canton d’Esch-sur-Alzette (Esch, Dudelange, Differdange…)', de: 'Süden: Kanton Esch/Alzette (Esch, Düdelingen, Differdingen …)', en: 'South: canton of Esch-sur-Alzette (Esch, Dudelange, Differdange…)' } },
  { commune: 'Remich', nom: { fr: 'Moselle : canton de Remich', de: 'Mosel: Kanton Remich', en: 'Moselle: canton of Remich' } },
  { commune: 'Diekirch', nom: { fr: 'Nordstad : canton de Diekirch', de: 'Nordstad: Kanton Diekirch', en: 'Nordstad: canton of Diekirch' } },
  { commune: 'Wiltz', nom: { fr: 'Nord : canton de Wiltz', de: 'Norden: Kanton Wiltz', en: 'North: canton of Wiltz' } },
];

function bien(type: 'appartement' | 'maison', commune: string): Answers {
  return {
    type,
    commune,
    surface: type === 'maison' ? 150 : 80,
    chambres: type === 'maison' ? 4 : 2,
    etat: 'bon',
    energie: 'D',
    meuble: false,
    exterieur: 'aucun',
    garages: 0,
    parkings: 0,
    etage: type === 'maison' ? null : 1,
    ascenseur: type === 'maison' ? null : true,
    proprietaire: true,
    dejaLoue: false,
    gestion: 'oui',
    disponibilite: '3mois',
  };
}

const T = {
  fr: {
    title: 'Quel loyer pour votre appartement ou maison au Luxembourg ? Estimation gratuite',
    description: 'Estimez en 2 minutes le loyer de votre appartement ou de votre maison au Luxembourg, à partir des loyers publics de l’Observatoire de l’Habitat et d’annonces de maisons. Gratuit et sans engagement. ImmoBuild Kohn, Dudelange.',
    h1: 'Quel loyer pour votre appartement ou votre maison ?',
    lead: 'Estimation gratuite et sans engagement, en quatre étapes, à partir de données publiques. Pour les propriétaires au Luxembourg, par ImmoBuild Kohn à Dudelange.',
    methodeTitre: 'Comment le loyer est calculé',
    methode: [
      'Appartements : loyers des baux signés publiés par l’Observatoire de l’Habitat (rapport n°24, « cadastre des loyers »), par canton et par surface, mis à jour avec l’indice des loyers annoncés ({trimestre}).',
      'Maisons : annonces de maisons à louer relevées sur les portails luxembourgeois (relevé du {releve}). Le niveau des baux signés est estimé environ 15 % sous les annonces (hypothèse).',
      'Puis l’état, la classe énergétique, l’extérieur, l’étage et le stationnement ajustent le loyer. Vous obtenez une fourchette : du loyer prudent (baux signés) au loyer d’annonce. Selon le bien réel, l’écart peut atteindre 15 à 20 %.',
    ],
    exemplesTitre: 'Exemples par région',
    exemplesNote: 'Calculés par l’outil pour un bien en bon état, classe énergétique D, sans extérieur ni stationnement (données : {trimestre}, relevé de maisons du {releve}). Les appartements sont calculés par canton, les maisons par région : toutes les communes d’un même canton donnent le même exemple. Votre bien sera différent : faites l’estimation.',
    colRegion: 'Région',
    colApp: 'Appartement 80 m², 2 chambres',
    colMaison: 'Maison 150 m², 4 chambres',
    parMois: 'par mois',
    plafondTitre: 'Le plafond légal',
    plafond: 'Au Luxembourg, le loyer annuel ne peut pas dépasser 5 % du capital investi dans le logement. Un logement meublé peut avoir un supplément pour le mobilier, calculé à part (au plus 1,5 % par mois de la valeur des meubles de moins de 10 ans). Jason vérifie ce point avec vous.',
    loi: 'Lire la loi (legilux)',
    suiteTitre: 'Et ensuite ?',
    suite: 'Jason vous recontacte au sujet de votre bien : vérifier le loyer sur place, le plafond légal, et ce qu’ImmoBuild Kohn peut prendre en charge en gestion locative.',
    gestion: 'Gestion locative avec ImmoBuild Kohn',
    contact: 'Prendre rendez-vous',
    faqTitre: 'Questions fréquentes',
    faq: [
      ['C’est vraiment gratuit ?', 'Oui. L’estimation est gratuite et sans engagement.'],
      ['Pourquoi l’outil demande mes coordonnées ?', 'Le résultat s’affiche après l’étape 4. Vos coordonnées servent uniquement à vous recontacter au sujet de votre bien. Pas de newsletter.'],
      ['Le loyer est-il garanti ?', 'Non. C’est une estimation indicative à partir de statistiques publiques. Elle ne remplace pas une visite.'],
      ['Les appartements de ma commune sont-ils pris en compte ?', 'Le calcul part des loyers de votre canton, puis s’adapte à la surface et aux caractéristiques du bien. Les loyers publics détaillés par commune sont trop peu nombreux pour un calcul fiable.'],
    ],
    confidentialite: 'Confidentialité',
    outil: 'Ouvrir l’outil en plein écran',
    alt: 'Jason, ImmoBuild Kohn',
  },
  de: {
    title: 'Welche Miete für Ihre Wohnung oder Ihr Haus in Luxemburg? Kostenlose Schätzung',
    description: 'Schätzen Sie in 2 Minuten die Miete Ihrer Wohnung oder Ihres Hauses in Luxemburg, auf Basis öffentlicher Mieten des Observatoire de l’Habitat und von Hausinseraten. Kostenlos und unverbindlich. ImmoBuild Kohn, Düdelingen.',
    h1: 'Welche Miete für Ihre Wohnung oder Ihr Haus?',
    lead: 'Kostenlose und unverbindliche Schätzung in vier Schritten, auf Basis öffentlicher Daten. Für Eigentümer in Luxemburg, von ImmoBuild Kohn in Düdelingen.',
    methodeTitre: 'So wird die Miete berechnet',
    methode: [
      'Wohnungen: Mieten abgeschlossener Verträge, veröffentlicht vom Observatoire de l’Habitat (Bericht Nr. 24, „cadastre des loyers“), nach Kanton und Fläche, fortgeschrieben mit dem Index der Angebotsmieten ({trimestre}).',
      'Häuser: Hausinserate der luxemburgischen Immobilienportale (Erhebung vom {releve}). Das Niveau abgeschlossener Verträge wird etwa 15 % unter den Inseraten geschätzt (Annahme).',
      'Danach passen Zustand, Energieklasse, Außenbereich, Etage und Stellplätze die Miete an. Sie erhalten eine Spanne: von der vorsichtigen Miete (Verträge) bis zur Miete im Inserat. Je nach tatsächlicher Immobilie kann die Abweichung 15 bis 20 % betragen.',
    ],
    exemplesTitre: 'Beispiele nach Region',
    exemplesNote: 'Vom Tool berechnet für eine Immobilie in gutem Zustand, Energieklasse D, ohne Außenbereich und Stellplatz (Daten: {trimestre}, Hauserhebung vom {releve}). Wohnungen werden pro Kanton berechnet, Häuser pro Region: Alle Gemeinden eines Kantons ergeben dasselbe Beispiel. Ihre Immobilie ist anders: Machen Sie die Schätzung.',
    colRegion: 'Region',
    colApp: 'Wohnung 80 m², 2 Schlafzimmer',
    colMaison: 'Haus 150 m², 4 Schlafzimmer',
    parMois: 'pro Monat',
    plafondTitre: 'Die gesetzliche Obergrenze',
    plafond: 'In Luxemburg darf die Jahresmiete 5 % des in die Wohnung investierten Kapitals nicht überschreiten. Bei möblierter Vermietung kann ein Möbelzuschlag getrennt berechnet werden (höchstens 1,5 % pro Monat vom Wert der Möbel, die jünger als 10 Jahre sind). Jason prüft das mit Ihnen.',
    loi: 'Gesetz lesen (legilux)',
    suiteTitre: 'Wie geht es weiter?',
    suite: 'Jason meldet sich wegen Ihrer Immobilie: Miete vor Ort prüfen, gesetzliche Obergrenze, und was ImmoBuild Kohn in der Mietverwaltung für Sie übernehmen kann.',
    gestion: 'Mietverwaltung mit ImmoBuild Kohn',
    contact: 'Termin vereinbaren',
    faqTitre: 'Häufige Fragen',
    faq: [
      ['Ist das wirklich kostenlos?', 'Ja. Die Schätzung ist kostenlos und unverbindlich.'],
      ['Warum fragt das Tool nach meinen Kontaktdaten?', 'Das Ergebnis erscheint nach Schritt 4. Ihre Kontaktdaten dienen nur dazu, Sie wegen Ihrer Immobilie zu kontaktieren. Kein Newsletter.'],
      ['Ist die Miete garantiert?', 'Nein. Es ist eine unverbindliche Schätzung auf Basis öffentlicher Statistiken. Sie ersetzt keine Besichtigung.'],
      ['Werden die Wohnungen meiner Gemeinde berücksichtigt?', 'Die Berechnung geht von den Mieten Ihres Kantons aus und passt sie an Fläche und Ausstattung an. Öffentliche Mieten pro Gemeinde gibt es zu wenige für eine verlässliche Berechnung.'],
    ],
    confidentialite: 'Datenschutz',
    outil: 'Tool im Vollbild öffnen',
    alt: 'Jason, ImmoBuild Kohn',
  },
  en: {
    title: 'What rent for your apartment or house in Luxembourg? Free estimate',
    description: 'Estimate in 2 minutes the rent of your apartment or house in Luxembourg, based on public rents from the Observatoire de l’Habitat and house listings. Free and without obligation. ImmoBuild Kohn, Dudelange.',
    h1: 'What rent for your apartment or house?',
    lead: 'Free estimate without obligation, in four steps, based on public data. For property owners in Luxembourg, by ImmoBuild Kohn in Dudelange.',
    methodeTitre: 'How the rent is calculated',
    methode: [
      'Apartments: rents of signed leases published by the Observatoire de l’Habitat (report no. 24, “cadastre des loyers”), by canton and size, updated with the advertised rent index ({trimestre}).',
      'Houses: house rental listings collected from Luxembourg property portals (collected on {releve}). The level of signed leases is estimated at about 15% below listings (assumption).',
      'Then condition, energy class, outdoor space, floor and parking adjust the rent. You get a range: from the cautious rent (signed leases) to the advertised rent. Depending on the actual property, the difference can reach 15 to 20%.',
    ],
    exemplesTitre: 'Examples by region',
    exemplesNote: 'Calculated by the tool for a property in good condition, energy class D, without outdoor space or parking (data: {trimestre}, house listings collected on {releve}). Apartments are calculated per canton, houses per region: all communes of a canton give the same example. Your property will differ: run the estimate.',
    colRegion: 'Region',
    colApp: 'Apartment 80 m², 2 bedrooms',
    colMaison: 'House 150 m², 4 bedrooms',
    parMois: 'per month',
    plafondTitre: 'The legal cap',
    plafond: 'In Luxembourg, the annual rent may not exceed 5% of the capital invested in the property. A furnished property may have a separate furniture supplement (at most 1.5% per month of the value of furniture less than 10 years old). Jason checks this with you.',
    loi: 'Read the law (legilux)',
    suiteTitre: 'What happens next?',
    suite: 'Jason contacts you about your property: checking the rent on site, the legal cap, and what ImmoBuild Kohn can take care of in property management.',
    gestion: 'Property management with ImmoBuild Kohn',
    contact: 'Book an appointment',
    faqTitre: 'Frequently asked questions',
    faq: [
      ['Is it really free?', 'Yes. The estimate is free and without obligation.'],
      ['Why does the tool ask for my contact details?', 'The result is shown after step 4. Your contact details are only used to contact you about your property. No newsletter.'],
      ['Is the rent guaranteed?', 'No. It is an indicative estimate based on public statistics. It does not replace a visit.'],
      ['Are apartments in my commune taken into account?', 'The calculation starts from rents in your canton, then adapts to the size and features of the property. There are too few public rents per commune for a reliable calculation.'],
    ],
    confidentialite: 'Privacy',
    outil: 'Open the tool full screen',
    alt: 'Jason, ImmoBuild Kohn',
  },
} as const;

function dateLongue(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
}

export function genererPage(lang: Lang): string {
  const t = T[lang];
  const D = data as unknown as Dataset;
  const R = refs as References;
  const P = params as Params;
  const trimestre = D.indice.dernier_trimestre.replace('T', ' T');
  const releve = dateLongue(R.maisons.date, lang);
  const vars = (s: string) => s.replace('{trimestre}', trimestre).replace('{releve}', releve);
  const eur = (n: number) => new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const cellule = (type: 'appartement' | 'maison', commune: string) => {
    const r = estimate(bien(type, commune), D, R, P).result;
    return `<strong>${esc(eur(r.mid))}</strong> <span class="per">${esc(t.parMois)}</span><br><span class="range">${esc(eur(r.low))} – ${esc(eur(r.high))}</span>`;
  };
  const lignes = EXEMPLES.map(
    (e) => `        <tr><th scope="row">${esc(e.nom[lang])}</th><td>${cellule('appartement', e.commune)}</td><td>${cellule('maison', e.commune)}</td></tr>`,
  ).join('\n');
  const alternates = LANGS.map((l) => `    <link rel="alternate" hreflang="${l}" href="${SITE}/${l}/" />`).join('\n');
  const autres = LANGS.filter((l) => l !== lang)
    .map((l) => `<a href="/${l}/" hreflang="${l}" lang="${l}">${l.toUpperCase()}</a>`)
    .join(' · ');
  const c = config as unknown as { gestionUrl: Record<Lang, string>; contactUrl: Record<Lang, string>; privacyUrl: Record<Lang, string>; legalUrl: string; agent: { name: string; role: string; photo: string } };

  return `<!doctype html>
<!-- Généré par scripts/pages.ts (npm run pages) : ne pas modifier à la main -->
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(t.title)}</title>
    <meta name="description" content="${esc(t.description)}" />
    <link rel="canonical" href="${SITE}/${lang}/" />
${alternates}
    <link rel="alternate" hreflang="x-default" href="${SITE}/fr/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(t.title)}" />
    <meta property="og:description" content="${esc(t.description)}" />
    <meta property="og:url" content="${SITE}/${lang}/" />
    <meta property="og:locale" content="${OG_LOCALE[lang]}" />
    <link rel="stylesheet" href="/src/landing.css" />
  </head>
  <body>
    <header class="lp-top">
      <div class="lp-wrap"><span class="lp-brand">ImmoBuild Kohn</span><nav class="lp-lang" aria-label="Langue / Sprache / Language">${autres}</nav></div>
    </header>
    <main class="lp-wrap">
      <h1>${esc(t.h1)}</h1>
      <p class="lp-lead">${esc(t.lead)}</p>
      <div class="lp-tool">
        <div data-immobuild-loyer data-lang="${lang}"></div><script src="/embed.js" async></script>
        <noscript><a href="/?lang=${lang}">${esc(t.outil)}</a></noscript>
      </div>

      <section>
        <h2>${esc(t.methodeTitre)}</h2>
        <ul>
${t.methode.map((m) => `          <li>${esc(vars(m))}</li>`).join('\n')}
        </ul>
      </section>

      <section>
        <h2>${esc(t.exemplesTitre)}</h2>
        <div class="lp-table" tabindex="0" role="region" aria-label="${esc(t.exemplesTitre)}">
        <table>
          <caption>${esc(vars(t.exemplesNote))}</caption>
          <thead><tr><th scope="col">${esc(t.colRegion)}</th><th scope="col">${esc(t.colApp)}</th><th scope="col">${esc(t.colMaison)}</th></tr></thead>
          <tbody>
${lignes}
          </tbody>
        </table>
        </div>
      </section>

      <section>
        <h2>${esc(t.plafondTitre)}</h2>
        <p>${esc(t.plafond)} <a href="${esc(c.legalUrl)}" rel="noopener">${esc(t.loi)}</a></p>
      </section>

      <section class="lp-next">
        <h2>${esc(t.suiteTitre)}</h2>
        <div class="lp-agent"><img src="${esc(c.agent.photo)}" alt="${esc(t.alt)}" width="64" height="64" loading="lazy" /><p><strong>${esc(c.agent.name)}</strong><br>${esc(c.agent.role)}</p></div>
        <p>${esc(t.suite)}</p>
        <p class="lp-cta"><a class="lp-btn" href="${esc(c.gestionUrl[lang])}">${esc(t.gestion)}</a> <a class="lp-btn lp-btn-2" href="${esc(c.contactUrl[lang])}">${esc(t.contact)}</a></p>
      </section>

      <section>
        <h2>${esc(t.faqTitre)}</h2>
${t.faq.map(([q, a]) => `        <h3>${esc(q)}</h3>\n        <p>${esc(a)}</p>`).join('\n')}
      </section>
    </main>
    <footer class="lp-foot">
      <div class="lp-wrap">ImmoBuild Kohn · Dudelange · <a href="${esc(c.privacyUrl[lang])}">${esc(t.confidentialite)}</a></div>
    </footer>
  </body>
</html>
`;
}

export function genererSitemap(): string {
  const urls = LANGS.map(
    (l) => `  <url>
    <loc>${SITE}/${l}/</loc>
${LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${SITE}/${a}/" />`).join('\n')}
  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const l of LANGS) {
    mkdirSync(join(ROOT, l), { recursive: true });
    writeFileSync(join(ROOT, l, 'index.html'), genererPage(l));
    console.log(`✔ ${l}/index.html`);
  }
  writeFileSync(join(ROOT, 'public/sitemap.xml'), genererSitemap());
  console.log('✔ public/sitemap.xml');
}
