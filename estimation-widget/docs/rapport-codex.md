# Unabhängiger Prüfbericht: „Estimation gratuite“

**Prüfdatum:** 17.11.2026 · **Branch:** codex/rapport-estimation · **Basis:** Code und Daten aus claude/estimation-widget-immobuild-g7jc99, lokale Tests und Live-Endpunkte. Das Tool wurde nicht geändert.

## 1. Gesamturteil

Der Live-Test vom 18.11.2026 war erfolgreich. Die Schätzung erschien nach 6,6 Sekunden und die zugehörige Testmail ging im verbundenen Outlook-Postfach ein. Der fehlgeschlagene Ersttest vom 17.11. bleibt dokumentiert. Vor aktiver Bewerbung bleiben vor allem die öffentliche Datenschutzerklärung, die Kopplung der Kontaktaufnahme an die Preisfreigabe sowie die Validierung der Preisparameter offen. Die Datenschutzprüfung und die übrigen Bewertungskriterien wurden für den Nachtest nicht wiederholt.

## Live-Nachtest am 18.11.2026

- **Geprüft:** Eine einzelne Anfrage mit denselben vorgegebenen Testdaten wurde um **08:33:23 Uhr (MEZ)** über `https://estimatioun.lu/?lang=fr` abgeschickt. Die Bestätigung „Demande bien reçue“ und die Schätzung für eine Wohnung mit **80 m² in Dudelange** erschienen nach **6,6 Sekunden**. Der Marktwert lag bei **540.000 €**, die Spanne bei **505.000–570.000 €**. Das entspricht der Handrechnung in Abschnitt 3.
- **Geprüft:** Im verbundenen Outlook-Postfach ging die zugehörige E-Mail um **08:33:30 Uhr (MEZ)** ein. Betreff „Nouveau lead estimation – Dudelange – Appartement – Dans les 3 mois“. Die Vorschau enthielt die vereinbarte Testnachricht. Der Live-`Reply-To`-Header wurde nicht geprüft.
- **Geprüft:** Das Resultat zeigte einen Anrufbutton für Jason. Das Formular verlinkte direkt auf `/politique-de-confidentialite-cookies/`. Diese beiden Beobachtungen aktualisieren die entsprechenden Angaben zur Live-Oberfläche vom 17.11.
- **Offen:** Die Ursache der Fehlermeldung vom 17.11. und die Stabilität über längere Zeit bleiben ungeklärt. Die Noten und das nachstehende Protokoll dokumentieren den Stand der Hauptprüfung vom 17.11.

## 2. Notentabelle

| Kriterium | Note 1–5 | Ein-Satz-Begründung |
|---|---:|---|
| Korrekte Berechnung | 4 | Die geprüften Formeln, Gewichte, Schwellen, Grenzen und Rundung entsprechen der README; die Marktgenauigkeit ist wegen nicht validierter Parameter nicht belegt. |
| Ehrlichkeit gegenüber dem Kunden | 3 | Quelle, Zeitraum und indikative Einordnung sind sichtbar; die Labels „vente rapide“ und „coup de cœur“ geben der pauschalen Spanne eine nicht belegte Verkaufssituation. |
| Sicherheit | 3 | Servervalidierung, Honeypot, Ticket-Signatur und Live-Fehlercodes sind vorhanden; Origin ist optional, HSTS fehlt und npm audit meldet sechs hohe Dev-Abhängigkeitsschwachstellen. |
| Datenschutz (DSGVO) | 2 | Das interne Dokument ist ausführlich, aber die öffentliche Datenschutzseite enthält keine konkreten Angaben zum Tool, Cloudflare oder Resend; die Einwilligung ist an den Preiszugang gekoppelt. |
| Kundenerlebnis | 3 | Das sechsstufige Formular bietet Suche, Hinweise und Zusammenfassung; der Live-Abbruch beim Versand und die lange Pflichtstrecke bleiben erhebliche Reibungspunkte. |
| Qualität der Leads für Jason | 4 | Priorität, Rückrufdaten, Projekt und Berechnung sind übersichtlich; reply_to ist im Test korrekt, die tatsächliche Zustellung nicht bestätigt. |
| Barrierefreiheit (WCAG 2.1 AA) | 3 | Semantik, Fokuszustände, Statusmeldungen und Reduced-Motion-Regeln sind im Code angelegt; der axe-Lauf war mangels Chromium nicht möglich. |
| Design und Marke | 4 | Navy, Off-White und Beige prägen die Oberfläche, Gold erscheint als Akzent bzw. auf dunklem Grund; der vorhandene Screenshot ist ordentlich gegliedert, aber kein aktueller Viewport-Test. |
| Stabilität und Leistung | 3 | Submit-Sperre, Client-Timeout und Resend-Timeout sind implementiert; Live-Versand scheiterte, Lighthouse und Browservergleich konnten nicht reproduziert werden. |
| Einbettung | 4 | embed.js prüft Ursprung und sendendes Fenster für postMessage, setzt Höhe und Scrollen und bietet einen Fallback; WordPress und Next.js wurden nicht in Zielseiten getestet. |
| Wartbarkeit | 3 | Module, Tests und Update-Skript sind verständlich getrennt; Abhängigkeitsschwachstellen, fehlende visuelle Reproduktion und nicht bestätigte Parameter bleiben offen. |
| Live-Betrieb | 2 | HTTPS, Weiterleitung von combien.lu und saubere Antworten auf ungültige Requests funktionieren; die Live-Schätzung lieferte bei der einzigen Anfrage kein Ergebnis. |

## 3. Befunde pro Kriterium

### 1. Korrekte Berechnung — Note 4

- **Klein · geprüft:** README, Abschnitt „Appartement“ und „Puis, pour les deux“ (Zeilen 236–250); src/shared/engine.ts (Zeilen 203–280); params.json. Appartements nutzen 50/30/20 und renormieren die Gewichte verfügbarer Methoden. Bei weniger als 10 Notarverkäufen kommt die Kantonsmedian-Methode zum Einsatz. Die Inseratskorrektur ist die Kantons- oder nationale Median-Abweichung, begrenzt auf 0–20 %. Ausreißergrenze, additive Koeffizienten mit Gesamtgrenzen −30/+20 %, Hausbasis, Annexen, 5.000-€-Rundung und Spannen stimmen mit der README überein.
- **Handrechnung, geprüft:** Dudelange-Daten enthalten 130 Verkäufe zu 6.512,33 €/m², Inserate zu 7.048,27 €/m² und Mieten zu 30,37 €/m². Für eine neutrale Wohnung von 80 m² ergibt sich eine Basis von rund 6.742 €/m² und ungerundet rund 539.366 €. Das Ergebnis ist **540.000 €**, **505.000–570.000 €**. Das passt zu tests/engine.test.ts und README Zeile 335.
- **Grenzfälle, geprüft per Code-/Datensatzberechnung:** 10 m² in Dudelange ergeben 65.000 €, 60.000–70.000 €; Rundung und Mindestabstand von 5.000 € machen die Spanne relativ breiter als exakt ±6 %. Bei 1.000 m² und Eingaben von 20 Garagen, 20 Stellplätzen und 1.000 m² Terrasse werden höchstens 4 Garagen, 4 Stellplätze und 30 m² Terrasse angesetzt; Ergebnis 6.925.000 €. Eine 150-m²-Doppelhaushälfte in Dudelange ergibt 765.000 €, 675.000–855.000 € (±12 %). Servergrenzen: 10–1.000 m², src/shared/validation.ts Zeilen 20–31.
- **Klein · geprüft:** tests/engine.test.ts deckt unter 10 Verkäufe (Leudelange), unzureichende Daten (Tandel/Bech) und Dudelange ab. data/communes.json enthält 100 Gemeinden, wurde am 09.11.2026 erzeugt und bildet 01.07.2025–30.06.2026 ab. Der Zeitraum ist am Prüftag rund viereinhalb Monate alt; ein neuer Abruf wurde unterlassen, um Daten nicht zu überschreiben.
- **Mittel · geprüft:** README Zeilen 261–285 und params.json sagen, dass Koeffizienten und weitere Werte noch von Jason zu validieren sind. Die Code-Umsetzung ist methodentreu, beweist aber keine Marktgenauigkeit. Die Verwendung einer aus Apartmentdaten abgeleiteten Inseratskorrektur für Häuser ist eine Modellannahme.
- **Vorschlag:** Jason sollte die Annahmen gegen eigene abgeschlossene Verkäufe prüfen und die freigegebene Parameter-Version dokumentieren, bevor die Ausgabe als verlässliche Marktindikation beworben wird.

### 2. Ehrlichkeit gegenüber dem Kunden — Note 3

- **Klein · geprüft:** src/shared/engine.ts Zeilen 171–184 und vorhandener Screenshot screenshots/8a-resultat-appartement.png zeigen Quelle, Zeitraum und den Hinweis „Estimation indicative“. Für Häuser setzt der Code indicative auf true, passend zu fehlenden öffentlichen Notarpreisen für Häuser.
- **Mittel · geprüft:** Der Screenshot nennt die untere Grenze „Prix pour une vente rapide“ und die obere „Avec un acheteur coup de cœur“. Der Code verwendet eine pauschale symmetrische ±6-%-Spanne; Verkaufsdauer und Käuferverhalten fließen nicht ein. Die Labels suggerieren eine empirische Grundlage, die nicht belegt ist.
- **Mittel · geprüft:** src/ui/analysis.ts Zeilen 1–8 erklärt, dass nur das Tempo verlangsamt wird; config.json Zeilen 30–32 setzt 5.600 ms. Die fünf Schritte beschreiben reale Rechenoperationen und echte Zahlen erscheinen erst nach der Serverantwort. Die künstliche Dauer kann dennoch wie eine längere individuelle Prüfung wirken.
- **Vorschlag:** Spannen neutral „untere/obere indikative Schätzung“ nennen und den Analysebildschirm als Berechnung aus öffentlichen Vergleichsdaten erklären oder deutlich verkürzen.

### 3. Sicherheit — Note 3

- **Klein · geprüft:** src/shared/validation.ts Zeilen 161–199 und 222–280 prüft Eingaben serverseitig. Das Honeypot-Feld wird blockiert. src/server/handler.ts Zeilen 49 und 89–102 begrenzt Größe, Methode und Content-Type. tests/api.test.ts prüft Honeypot, fehlende Einwilligung, Validierung und Rate-Limit; tests/simulate.test.ts prüft signierte Tickets und erlaubte Änderungen.
- **Mittel · geprüft:** src/server/handler.ts Zeilen 92–95 blockiert fremde Origin, lässt eine fehlende Origin aber passieren. Die README Zeilen 322–324 beschreibt den Herkunftsschutz stärker, als der Code ihn durchsetzt. Live-POST mit fremder Origin ergab 403; kein gültiger Lead wurde dabei gesendet.
- **Klein · geprüft:** Einzeilige Felder entfernen C0-Steuerzeichen und manche Bidi-Steuerzeichen (validation.ts Zeilen 110–118). Das umfasst nicht alle unsichtbaren Unicode-Zeichen. Freie Nachricht darf Zeilenumbrüche enthalten, die im Plaintext eingerückt werden (src/shared/email.ts Zeilen 202–204). Eine gezielte Unicode-Injection-Testreihe gibt es nicht.
- **Mittel · geprüft:** Live-Header enthalten CSP mit frame-ancestors, X-Content-Type-Options, Referrer-Policy und Permissions-Policy (public/_headers; Live-GET https://estimatioun.lu/). Strict-Transport-Security fehlte in der geprüften Antwort.
- **Mittel · geprüft:** npm audit meldet **6 hohe Schwachstellen**: picomatch über vite/vitest-Abhängigkeiten und zwei Advisories für xlsx (Prototype Pollution und ReDoS; laut Audit keine verfügbare xlsx-Korrektur). npm audit --omit=dev meldete 0. Betroffene Pakete sind Dev-Abhängigkeiten; xlsx wird im Datenimportskript genutzt.
- **Vorschlag:** Fehlende Origin ablehnen oder klar anders prüfen, HSTS setzen, xlsx ersetzen bzw. eng isolieren und Unicode-Zeichen gezielt normalisieren und testen.

### 4. Datenschutz (DSGVO) — Note 2

- **Kritisch · geprüft:** PRIVACY.md Zeilen 15–24 und 34–64 beschreibt Daten, Zwecke, Cloudflare, Resend, IP-Hash und offene Speicherfristen. Die öffentliche Datenschutzseite unter immobuild.lu/politique-de-confidentialite/ leitet live per 301 auf /politique-de-confidentialite-cookies/ weiter. Der Seiteninhalt erwähnt weder Estimation gratuite noch Cloudflare oder Resend; eine konkrete Aufbewahrungsfrist für diese Leads ist nicht angegeben. PRIVACY.md ist ein internes Arbeitspapier, kein Ersatz für die öffentliche Information.
- **Mittel · geprüft:** Checkbox ist Pflicht; src/shared/validation.ts Zeile 197 verweigert ohne Häkchen jede Berechnung. Die Einwilligung zur Kontaktaufnahme wird damit zugleich Voraussetzung für die Anzeige des Preises. Für die Berechnung aus Objektdaten ist die spätere Kontaktaufnahme nicht offensichtlich erforderlich. Art. 7(4) DSGVO verlangt bei der Freiwilligkeit besondere Beachtung, wenn eine Dienstleistung von einer nicht notwendigen Einwilligung abhängt. **Einschätzung, keine verbindliche Rechtsberatung:** relevantes Koppelungsrisiko, keine festgestellte Rechtsverletzung. Quellen: [Art. 7 DSGVO (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679) und [EDPB-Leitlinien 05/2020 zur Einwilligung](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en).
- **Mittel · geprüft / teilweise nicht verifiziert:** PRIVACY.md Zeile 42 sagt, Resend speichere E-Mail-Daten in den USA und nennt DPA/SCC/DPF; aktuelle Verträge und Kontoeinstellungen wurden nicht geprüft. Mailbox-Anbieter und Aufbewahrung sind in Zeilen 40 und 63–64 offen. Cloudflare/KV-Logs und Aufbewahrung wurden nicht im Konto verifiziert.
- **Klein · geprüft:** Das Simulator-Ticket ist signiert, aber nur Base64-kodiert, also lesbar und nicht verschlüsselt (src/server/token.ts). Laut PRIVACY.md Zeile 49 enthält es Objekt- und Kontaktdaten und liegt im Seitenspeicher, nicht in Cookies oder Local Storage. Die öffentliche Datenschutzerklärung beschreibt den Simulator nicht.
- **Vorschlag:** Öffentliche Datenschutzerklärung um Verantwortlichen, Zwecke, Rechtsgrundlage, Pflicht-/Freiwilligkeitsfolgen, Cloudflare/Resend, Drittlandtransfer, Simulator, Aufbewahrung und Rechte ergänzen. Die Einwilligung zur Kontaktaufnahme vom Zugang zur Berechnung trennen und Rechtsgrundlage fachlich prüfen.

### 5. Kundenerlebnis — Note 3

- **Klein · geprüft:** Der Live-Einstieg zeigt FR, sechs Schritte, Fortschritt, Gemeindesuche und Dudelange-Kurzweg. Der Ablauf übernahm Wohnung, Dudelange und 80 m² in die Zusammenfassung. README beschreibt Alias- und Tippfehlerhilfe; src/shared/aliases.ts enthält Varianten.
- **Mittel · geprüft:** Sechs Schritte und viele Pflichtangaben erhöhen Abbruchaufwand. Der einzige vollständige Live-Durchlauf endete nach dem Absenden mit „L’envoi n’a pas abouti …“ und ließ die Formulardaten für einen erneuten Versuch stehen. Es erschien keine Schätzung.
- **Klein · teilweise geprüft:** Die Fehlermeldung nennt eine Kontaktadresse; Feld- und Fehlerzustände sind im Code vorhanden. FR wurde live gesehen; DE/EN wurden nicht vollständig muttersprachlich geprüft.
- **Bekannte Entscheidung · bewertet:** config.json Zeile 21 lässt die Telefonnummer leer, wodurch der direkte Anrufbutton entfällt. Die Kontaktseite antwortet 200; die Datenschutz-URL leitet 301 auf eine vorhandene Seite um. combien.fr bleibt laut Auftrag inaktiv.
- **Vorschlag:** Versand zuerst beheben, dann DE/EN und die mobilen Ansichten mit einer nicht am Projekt beteiligten Person durchspielen.

### 6. Qualität der Leads für Jason — Note 4

- **Klein · geprüft:** src/shared/email.ts Zeilen 58–65 und 67–105 setzt Priorität aus Eigentümerstatus, Verkaufsziel und Frist. Die Zusammenfassung enthält Wert, Rückrufnummer und E-Mail. tests/api.test.ts Zeilen 20–42 prüft Betreff, Mailinhalt und reply_to an die Besucheradresse.
- **Klein · geprüft:** docs/exemple-email-lead.png und .txt zeigen ein scannbares Layout mit Priorität, Objekt, Rückruf, Projekt und Berechnungsdetails. Bei fehlenden Daten steht eine Aufgabe zur individuellen Schätzung in der Mail.
- **Mittel · Live nicht bestätigt:** Resend-Annahme oder Zustellung an Jason wurde nicht im Postfach geprüft. Der Besucher bekam keine Erfolgsbestätigung.
- **Vorschlag:** Vor Start eine erfolgreiche Zustellung im Zielpostfach bestätigen und den Rückrufprozess für heiße Leads festlegen.

### 7. Barrierefreiheit (WCAG 2.1 AA) — Note 3

- **Klein · im Code geprüft:** src/styles.css Zeilen 79–80, 115, 141, 422 und 597–598 enthält Fokusrahmen und Reduced-Motion-Regeln. src/ui/analysis.ts Zeilen 82–93, src/ui/steps.ts Zeilen 229–243 und src/main.ts Zeilen 282–307 enthalten Status-, Progressbar- und Fehlermeldungssemantik.
- **Nicht bestätigt:** node scripts/screenshots.mjs startete nicht, weil das Playwright-Chromium-Binary fehlt. Daher gibt es aus dieser Prüfung **kein axe-Ergebnis** und keine neue Screenshotreihe. Die README Zeile 34 nennt frühere 0 axe-Fehler und Lighthouse 100/100/100; ich habe diese Angaben nicht reproduziert.
- **Vorschlag:** Chromium installieren und Screenshot-/axe-Durchlauf wiederholen; Tastatur und Screenreader zusätzlich auf Ergebniskarte, Fehlern und Simulator prüfen.

### 8. Design und Marke — Note 4

- **Klein · geprüft im Code:** src/styles.css Zeilen 1–18 definiert Navy #0A2342, Gold #C5A46D, Off-White #F8F8F6, Beige #F2EFEA und lokale Poppins-/Montserrat-Schriften. Gold als Textfarbe erscheint auf dunklem Navy; auf hellem Grund ist Gold im CSS Akzent oder Symbol, nicht Fließtext.
- **Screenshotbeleg:** screenshots/8a-resultat-appartement.png zeigt klare Abschnitte, gut auffindbare Werte und den Navy-Aufbau. Die Repo-Datei wurde nicht in dieser Prüfung erstellt.
- **Nicht bestätigt:** Keine eigenen Tests bei 320, 390, 768 oder 1280 px; Überläufe und abgeschnittene Inhalte sind damit nicht ausgeschlossen.
- **Vorschlag:** Große Ergebniszahl, Skala, Kartengitter und längere deutsche Texte in den vier Viewports prüfen.

### 9. Stabilität und Leistung — Note 3

- **Klein · geprüft:** src/main.ts Zeilen 614–617 und 648–675 sperrt parallele Submits, setzt ein 20-s-Frontend-Timeout und verhindert Doppelklicks während des Sendens. src/server/handler.ts Zeilen 72–85 setzt für Resend 10 s. Bei Fehlern wird kein Ergebnis zurückgegeben und das Rate-Limit laut Code erstattet.
- **Mittel · vermutet:** Wenn Resend eine Mail annimmt, aber die Antwort verloren geht, könnte ein erneuter Versuch eine zweite Mail erzeugen. Ein Idempotenzschlüssel ist nicht vorhanden; dieses Szenario wurde nicht ausgelöst.
- **Mittel · geprüft:** Der Live-Aufruf scheiterte aus Besuchersicht. Ursache und Resend-Status sind ohne Server-/Resend-Zugriff unbekannt. Die Fehlermeldung gibt keine internen Details aus.
- **Nicht getestet:** Safari, Firefox, Netz-/Timeoutfehler, Lighthouse und langsame Verbindungen. Historische README-Messwerte wurden nicht reproduziert.
- **Vorschlag:** Nach Behebung erfolgreiche Zustellung und kontrollierten Fehler-/Retry-Fall beobachten; optional Idempotenzschutz ergänzen.

### 10. Einbettung — Note 4

- **Klein · Code geprüft:** public/embed.js erstellt ein iframe, lädt verzögert, zeigt nach 15 s einen Fallback und akzeptiert Höhen-/Scrollnachrichten nur von passender Origin, Quelle und bekanntem iframe-Fenster. Höhen sind auf 20.000 px begrenzt. integration/EstimationWidget.tsx mountet bei Next.js-Navigation erneut.
- **Klein · geprüft:** public/_headers erlaubt frame-ancestors self, immobuild.lu, dessen Subdomains und localhost; die Live-CSP enthält diese Vorgabe.
- **Nicht getestet:** WordPress/Elementor und Next.js im tatsächlichen Auftritt, fester Header, Scrollausgleich und CSP-Sonderregeln. Das lokale Demo war wegen Wrangler-Startfehler nicht verfügbar.
- **Vorschlag:** Nach Versandfix auf Staging und einer echten mobilen WordPress-Seite einmal Ende-zu-Ende prüfen.

### 11. Wartbarkeit — Note 3

- **Klein · geprüft:** Berechnung, Validierung, Server, Mail, UI und Übersetzungen sind getrennt. scripts/update-data.ts prüft CC0, Titel, Spalten und 100 Gemeinden und schreibt Erzeugungsdatum; Tests verwenden eingefrorene Daten.
- **Mittel · geprüft:** README erklärt Einrichtung, Deployment und Datenupdate verständlich, verweist aber auf noch zu validierende Parameter und Links. npm audit weist sechs hohe Befunde aus.
- **Nicht getestet:** update-data.ts wurde nicht ausgeführt, weil es Live-Daten lädt und data/ überschreiben würde.
- **Vorschlag:** Freigabecheck für Datenperiode, Parameterrevision, Mailzustellung, öffentliche Datenschutzseite und Abhängigkeiten in README ergänzen.

### 12. Live-Betrieb — Note 2

- **Klein · geprüft am 17.11.2026:** estimatioun.lu, www.estimatioun.lu und estimation-widget.pages.dev antworteten 200 über HTTPS. HTTP auf estimatioun.lu leitete 301 auf HTTPS. combien.lu leitete 301 auf https://estimatioun.lu/?lang=fr. www.estimatioun.lu antwortet ebenfalls direkt 200, statt auf eine kanonische Domain umzuleiten.
- **Klein · ohne Versand geprüft:** GET /api/estimate → 405; POST text/plain → 415; fremde Origin → 403; korrekt-origin POST mit ungültigem JSON → 400. Fehlerantworten waren JSON ohne interne Details; es wurden keine gültigen Lead-Daten gesendet.
- **Kritisch · geprüft:** Um ca. **19:48 Europe/Luxembourg** wurde genau eine Live-Anfrage mit den vorgegebenen Test-Kontaktdaten, Wohnung in Dudelange und 80 m² abgeschickt. Die Analyseansicht erschien, danach kehrte das Formular mit „L’envoi n’a pas abouti …“ zurück. **Kein Ergebnis wurde angezeigt.** Bis zur Fehlermeldung vergingen rund 12 Sekunden. Ob Resend die E-Mail annahm oder zustellte, ist unbekannt; kein zweiter Versuch wurde gemacht.
- **Bekannte Entscheidung · geprüft:** noindex steht in index.html und public/demo.html und wurde nicht als Fehler gewertet. combien.fr wurde nicht getestet, da es laut Auftrag noch nicht aktiv ist.
- **Vorschlag:** Cloudflare-Function-/Resend-Status des fehlgeschlagenen Requests prüfen und danach einmal kontrolliert im Zielpostfach verifizieren, bevor Kampagnen Traffic senden.

## 4. Die fünf wichtigsten Verbesserungen

Sortiert nach erwartetem Nutzen für Jason geteilt durch Aufwand; Aufwandsschätzung grob.

| Rang | Verbesserung | Nutzen / Aufwand | Aufwand |
|---:|---|---|---|
| 1 | Live-Versand diagnostizieren und eine erfolgreiche Zustellung im Zielpostfach nachweisen. | Sehr hoch / klein | 1–2 Stunden |
| 2 | Öffentliche Datenschutzerklärung vervollständigen; Kontakt-Einwilligung vom Preiszugang trennen und rechtlich prüfen. | Sehr hoch / mittel | ½–1 Tag plus Datenschutzprüfung |
| 3 | Parameter anhand realer abgeschlossener Verkäufe validieren und freigegebene Version dokumentieren. | Hoch / mittel | ½–1 Tag Jason + Umsetzung |
| 4 | Origin verpflichtend validieren, HSTS setzen und Rate-Limit/KV-Binding im Livekonto verifizieren. | Hoch / klein | 2–4 Stunden |
| 5 | Preisband neutral benennen, Analyseverzögerung transparent/kurz gestalten und danach axe sowie Viewports reproduzierbar prüfen. | Mittel bis hoch / klein | ½ Tag |

## 5. Nicht getestet

- Keine Änderungen an Tool, Cloudflare, Resend oder DNS; kein Pull Request.
- Lokaler Pages-Server startete nicht: npx wrangler pages dev dist --port 8788 brach mit „uv_interface_addresses returned Unknown system error 1“ ab; Wiederholung mit --ip 127.0.0.1 änderte nichts. .dev.vars enthielt nur EMAIL_MODE=log.
- node scripts/screenshots.mjs scheiterte, weil Playwright kein Chromium-Binary fand. Kein axe-Ergebnis und keine neuen Screenshots.
- Keine eigenen Browsergrößen 320/390/768/1280 px; kein Safari-/Firefox-Test; kein Lighthouse-Lauf.
- Kein Einblick in Cloudflare-/Resend-Secrets oder Bindings, Serverlogs, KV-Aktivierung, Postfachzustellung und Resend-Aufbewahrung. Keine Geheimniswerte wurden ausgelesen oder wiedergegeben; ein Mustercheck getrackter Dateien fand keine üblichen API-Key-/Private-Key-Formate.
- scripts/update-data.ts und aktuelle Publikationsdaten wurden nicht neu abgerufen, um data/ unverändert zu lassen.
- combien.fr ist nicht aktiv und wurde nicht getestet.

## 6. Prüfprotokoll

Zeitangaben Europe/Luxembourg, 17.11.2026.

| Zeit / Befehl | Ergebnis |
|---|---|
| ca. 19:47 npm ci | Erfolgreich, 91 Pakete installiert. |
| 19:47 npm test | 7 Testdateien, **63/63 bestanden**. |
| 19:47 npx tsc --noEmit | Erfolgreich, keine Fehler. |
| 19:47 npm run build | Erfolgreich; Vite baute 27 Module. |
| 19:47 npm audit --omit=dev | 0 Schwachstellen. |
| 19:47 npm audit | Exit 1; 6 hohe Schwachstellen in Dev-Abhängigkeiten, darunter xlsx ohne laut Audit verfügbare Korrektur. |
| 19:47 npx wrangler pages dev dist --port 8788 | Fehlgeschlagen: Systemfehler beim Ermitteln der Netzwerkschnittstellen; Loopback-Wiederholung ebenfalls fehlgeschlagen. |
| 19:47 node scripts/screenshots.mjs | Fehlgeschlagen: chromium_headless_shell fehlt; axe nicht ausgeführt. |
| ca. 19:48 Live-Testanfrage | Eine Anfrage mit exakt vorgegebenen Testdaten; nach rund 12 s Fehlermeldung, kein Ergebnis. Nicht wiederholt. |
| 19:47–19:54 Live-API-Fehlanfragen | GET 405, falscher Content-Type 415, fremde Origin 403, ungültiges JSON 400; keine gültigen Lead-Daten. |
| 19:47–19:54 Live-Seiten | estimatioun.lu 200, www.estimatioun.lu 200, estimation-widget.pages.dev 200, HTTP→HTTPS 301, combien.lu 301 zum FR-Einstieg. |
| Lighthouse / axe / Viewports | Nicht ausgeführt bzw. nicht verfügbar; siehe oben. |
