# Prompt : unabhängige Prüfung des Käufer-Tools « Mon budget d’achat »

Sprich Deutsch. Ich bin Jason, Inhaber von ImmoBuild Kohn (Immobilienmakler und Renovierung, Dudelange, Luxemburg). Prüfe das Käufer-Tool **unabhängig und kritisch**. Du hast es nicht gebaut; verlass dich nicht auf Aussagen in README oder concept.md, sondern prüfe selbst.

## Was zu prüfen ist

- Repository `intresseiertmechvoll-wq/claude-voice`, Branch `claude/acheteur-concept`, Ordner **`acheteur-widget/`**.
- Lesen zuerst: `README.md`, `PRIVACY.md`, `params.json`, `config.json`, `server.json`, `docs/concept.md` (Teile 11–14), `docs/exemple-email-lead.txt`.
- Code: `src/shared/` (budget, communes-m2, taux, validation, email, types), `src/ui/` (steps, result), `src/main.ts`, `src/server/` (handler, taux), `functions/api/` (budget, taux), `public/` (embed.js, _headers, demo.html), `src/i18n/` (fr, de, en), `tests/`, `scripts/update-taux.ts`.
- Das Tool ist **noch nicht online**. Alles läuft lokal: `cd acheteur-widget && npm ci && cp .dev.vars.example .dev.vars && npm test && npm run dev` (Port 8788, `EMAIL_MODE=log`: E-Mails erscheinen im Terminal, nichts wird verschickt).

**Ändere keinen Code des Tools** und nichts in `estimation-widget/`. Du schreibst nur den Bericht.

## Arbeitsweise

- Zeig die Realität, nicht schöner und nicht dramatischer. Kein Lob als Füllung.
- Trenne klar: **geprüft** (mit Beleg), **vermutet** („ich vermute“), **nicht geprüft**. Erfinde nichts.
- Rechtliches und Fakten zu Luxemburg (Gebühren, Bëllegen Akt, CSSF, Notartarif, Zuschläge) mit offizieller Quelle und Datum prüfen (guichet.public.lu, pfi.public.lu, legilux.public.lu, cssf.lu, bcl.lu, data.public.lu), nicht aus dem Gedächtnis. Keine Rechtsberatung.
- Schreib „funktioniert“ nur, wenn du es ausgeführt hast.

## Kriterien (Note 1–5 pro Kriterium, 5 = sehr gut)

1. **Korrekte Berechnung**: Entspricht der Code der Methode in README und `params.json`?
   - 7 % Gebühren; Bëllegen Akt 40 000 € pro Person, begrenzt auf die Gebühren, mindestens 100 € bleiben fällig, 0 bei Vermietung oder schon genutzt; Neubau „7 % höchstens“.
   - CSSF-Regel 100 / 90 / 80 % (und 90 % bei „je ne sais pas“).
   - Notar Kaufakt Barème 7 + 17 % MwSt.; Kreditakt 0,24 % + 0,05 % + Barème 5 + MwSt.; Kopien/Auslagen 300–1 000 € (Annahme).
   - Verkaufserlös (Wert − Restschuld − 3,51 % Maklerkosten als Annahme, nie negativ, nur mit beiden Werten).
   - Nötiger Kredit (Kreditkosten auf den nötigen Kredit, iterativ), Höchstpreis nur mit bekanntem Kreditbetrag, Rundung auf 100 € bzw. 5 000 € beim Höchstpreis.
   - m² pro Gemeinde: Wohnungen nach notariellen Verkäufen (≥ 10), Neubau nach VEFA-Verkäufen (≥ 10) sonst Bestandspreis mit Warnung, sonst Median des Kantons; Häuser nach Angebotspreisen (≥ 30) sonst Median des Kantons.
   - Monatsrate (Annuität, ohne Versicherung) auf den nötigen Kredit; Anteil am Einkommen je Spanne; Vergleich mit 33–40 %.
   - Grenzfälle: Eigenkapital 0, Preis 50 000 € und 20 Mio. €, Vermietung, Bëllegen schon genutzt, Restschuld höher als Wert, Gemeinden ohne Daten, Neubau ohne VEFA-Daten, Stadt Luxemburg/Mamer (Gemeindezuschlag: nur Hinweis, nicht gerechnet: ist das richtig?).
   - Rechne 2–3 Fälle **von Hand** nach. Prüfe, wie aktuell die Daten sind (Observatoire-Periode, Zinsmonat).
   - Gleiche Zahlen in Browser-Vorschau, Ergebnis und Lead-E-Mail?
2. **Ehrlichkeit gegenüber dem Kunden**: keine erfundenen Zahlen, Bewertungen oder Garantien.
   - Quelle und Zeitraum genannt.
   - « ni un conseil en crédit ni une offre de prêt »; die Monatsrate ist als Durchschnitt markiert, nicht als Angebot.
   - 45 000 € angekündigt, aber nicht gerechnet; Häuser = Angebotspreise; Annahmen als Annahmen erkennbar.
   - Kein übertriebenes Versprechen in Texten, Simulator und Sprechblasen (« Jason vous rappelle », « Prévenez-moi si un bien correspond » wird von Hand eingelöst).
   - Ist die Einschätzung haltbar, dass der Rechner keine Kreditvermittlung oder -beratung im Sinne des Code de la consommation (Art. L. 226-1 ff., Gesetz vom 23.12.2016) ist? Auch die Weiterleitung an einen Courtier gegen Vergütung. Geprüft oder vermutet angeben.
3. **Sicherheit**:
   - Prüfung aller Felder auf dem Server; der Server rechnet selbst neu (ignoriert Zahlen aus dem Browser).
   - Bot-Feld, Limit pro IP (inkl. KV), Origin- und Content-Type-Prüfung, Größenlimit.
   - Einschleusen von Text in die Lead-E-Mail (Zeilenumbrüche, unsichtbare Zeichen, Betreff), XSS in den HTML-Strings.
   - `server.json` (Lead-Adresse, Name des Courtiers) darf **nicht** im Browser-Bundle landen: `npm run build` und `dist/` durchsuchen.
   - `/api/taux`: Missbrauch möglich? Plausibilitätsprüfung der EZB-Werte.
   - CSP und frame-ancestors, Fehlermeldungen ohne interne Details, `npm audit`.
4. **Datenschutz (DSGVO)**:
   - Datensparsamkeit (Einkommen nur als Spanne, freiwillig), Einwilligung.
   - Courtier-Kästchen ohne Namen: Reicht die Nennung in der Datenschutzerklärung? (EDPB-Leitlinien 05/2020; geprüft oder vermutet.)
   - Übereinstimmung von `PRIVACY.md` mit dem tatsächlichen Verhalten: welche Daten wohin, Speicherung, Cloudflare und Resend, Übermittlung in die USA, Abruf bei der EZB ohne Personendaten.
   - Informationspflichten, „Prévenez-moi“ ohne Datenbank.
5. **Kundenerlebnis**:
   - Verständlichkeit, Länge und Abbruchrisiko der 5 Schritte.
   - Budget ohne Kontaktdaten, Simulator « Et si… ? », Verkaufs-Box, ausgeblendete Fragen bei Vermietung.
   - Fehlermeldungen, Hilfen (Gemeindesuche mit Aliassen, bis 3 Gemeinden, tolerante Beträge wie « 60k » oder « 600.000 € », Tippfehler bei E-Mail).
   - Bedienung auf dem Handy.
   - Textqualität in FR, DE und EN (Fehler, Ton, Konsistenz, gleiche Bedeutung).
   - Bewerte den echten Mehrwert gegenüber Bankrechnern und estimimmo.lu.
6. **Qualität der Leads für Jason**:
   - Ist die E-Mail auf einen Blick nützlich? Sind die Priorität (chaud/tiède/froid) und « À dire au téléphone » sinnvoll?
   - Geht reply_to an den Besucher? Kommen Verkauf, Courtier, Käufermandat, Simulator-Startwerte, Zinsherkunft (live oder Ersatzwert) und Gemeindezuschlag an?
   - Fehlt etwas Wichtiges für den Rückruf?
7. **Barrierefreiheit (WCAG 2.1 AA)**:
   - Kontraste, Tastatur (auch die Schieberegler), Fokus, Screenreader-Texte, Fehlermeldungen, Animationen (prefers-reduced-motion).
   - Belege mit axe-Ergebnissen. Für axe die CSP im Testbrowser umgehen und nach den Animationen messen (sonst falsche Kontrastmeldungen).
8. **Design und Marke**:
   - Navy #0A2342, Gold #C5A46D nur als Akzent und nie als Text auf hellem Grund, Off-White #F8F8F6, Beige #F2EFEA.
   - Schriften Poppins und Montserrat, lokal geladen.
   - Einheitliche Abstände; nichts ragt über den Rand, nichts wird abgeschnitten (320, 390 und 1280 px).
   - Einheitlich mit estimatioun.lu?
9. **Stabilität und Leistung**:
   - Ladezeit und Größe (Lighthouse mobil, falls möglich).
   - Verhalten bei Resend-Ausfall oder Timeout, EZB-Ausfall oder Timeout, Netzfehlern und Doppelklick.
   - Safari- und Firefox-Besonderheiten im Code. Nicht getestete Browser ausdrücklich nennen.
10. **Einbettung**:
    - `public/embed.js` (`data-immobuild-acheteur`) in WordPress/Elementor.
    - Höhenanpassung per postMessage, Scrollen, Fallback-Link, Herkunftsprüfung der Nachrichten.
    - Fehlt eine Next.js-Komponente wie beim Estimation-Tool? Konflikt, wenn beide Tools auf derselben Seite eingebettet sind?
11. **Wartbarkeit**:
    - Lesbarkeit des Codes, Testabdeckung (was fehlt?).
    - `scripts/update-taux.ts`, `npm run sync-data` (Abhängigkeit vom Estimation-Tool), doppelter Code zwischen den beiden Tools.
    - README verständlich für einen Nicht-Entwickler.
12. **Lokaler Betrieb statt Live-Betrieb** (das Tool ist nicht online):
    - Mit `npm run dev` prüfen: `/api/budget` antwortet auf falsche Anfragen sauber (GET → 405, falscher Content-Type → 415, fehlendes oder fremdes Origin → 403, ungültige Daten → 400), und zwar **ohne E-Mail** (im Terminal kontrollieren).
    - `/api/taux` antwortet; mit welcher Herkunft (live oder Ersatzwert)?
    - Danach **eine** vollständige Testanfrage über die Oberfläche: Kommt ein Ergebnis? Wie lange dauert es? Wie sieht die E-Mail im Terminal aus?
    - Was kann erst nach dem Online-Stellen geprüft werden?

## Aufbau des Berichts

Datei **`acheteur-widget/docs/rapport-revue.md`** auf einem **neuen Branch `claude/rapport-acheteur`** (abgeleitet von `claude/acheteur-concept`). Commit und Push nur dieser Datei (und eventuell Screenshots in `acheteur-widget/docs/revue/`). **Kein Pull Request.**

1. **Gesamturteil** in 3–5 Sätzen: Ist das Tool bereit für echte Kunden? Die 3 größten Risiken, das wichtigste zuerst.
2. **Notentabelle**: Kriterium | Note 1–5 | Ein-Satz-Begründung.
3. **Befunde pro Kriterium**: jeweils Schweregrad (kritisch / mittel / klein), Beleg (Datei:Zeile, Befehl und Ergebnis, Screenshot-Name oder URL), wie man es nachstellt, Vorschlag zur Behebung. Markierung „geprüft“ oder „vermutet“.
4. **Die 5 wichtigsten Verbesserungen**, sortiert nach Nutzen für Jason geteilt durch Aufwand, mit grober Aufwandsschätzung.
5. **Nicht getestet**: was und warum (z. B. kein Safari, keine echte E-Mail, nicht online).
6. **Protokoll**: ausgeführte Befehle mit Kurzergebnis (Testanzahl, Build, axe, Lighthouse) und Uhrzeit der Testanfrage.

Zum Schluss im Chat: Gesamturteil, Notentabelle und die 3 größten Risiken in Kurzform.
