# Unabhängige Prüfung: Mietpreis-Check „verlounen.lu“ (`loyer-widget/`)

Prüfung vom 18.11.2026 (Abend), Stand des Branches `claude/dazzling-carson-y40amu` (letzter Commit 18.11.2026, 21:07 UTC). Geprüft wurden Code, Daten, Tests und ein lokaler Lauf (`npm run dev`, `EMAIL_MODE=log`). Es wurde keine echte E-Mail verschickt, kein Portal abgefragt und nichts am Code geändert.

Kennzeichnung: **geprüft** = selbst nachgestellt oder im Code belegt; **vermutet** = plausibel, aber nicht nachgewiesen.

---

## 1. Gesamturteil

Das Tool ist technisch sauber gebaut und hält im Wesentlichen, was die README verspricht: Die Berechnung stimmt mit der beschriebenen Methode überein (drei Fälle von Hand nachgerechnet), der Server prüft alle Felder, axe-core findet 0 Verstöße, die Seite lädt mit 85 KB in unter einer Sekunde. **Für echte Kunden ist es noch nicht bereit**, aber nicht wegen des Codes, sondern wegen offener Betriebs- und Rechtsschritte: Die Domain löst nicht auf, `gestionUrl`, Telefonnummer und Datenschutzerklärung sind Platzhalter bzw. „à compléter“, die Koeffizienten sind laut eigener Angabe noch nicht von Jason freigegeben.

Die 3 größten Risiken, das wichtigste zuerst:

1. **Verlorene Leads durch Spam oder ausgeschöpftes Resend-Kontingent.** Kein Captcha, Anfragen-Limit ohne KV praktisch wirkungslos, und das Gratis-Kontingent (100 E-Mails/Tag) wird mit dem Bewertungs-Tool geteilt. Ist es erschöpft, bekommt jeder echte Besucher eine Fehlermeldung und der Lead ist weg (keine Zwischenspeicherung).
2. **Die angezeigte Spanne wirkt genauer, als die Daten sind.** Sie reicht nur ±8 % um den Mittelwert, die eigene Messung zeigt aber ±18 % Streuung einzelner Inserate. Bei Häusern wird „Niveau abgeschlossener Verträge“ angezeigt, obwohl das eine nicht gemessene Annahme ist (Inserat ÷ 1,17) und das Hausmodell auf 84 Inseraten eines einzigen Tages beruht.
3. **Datenschutz: Einwilligung als Bedingung für das Ergebnis.** Ohne Häkchen „Kontakt erlaubt“ gibt es kein Ergebnis („Merci de cocher cette case pour voir votre loyer“). Das kann als unzulässige Kopplung (Art. 7 Abs. 4 DSGVO) gelesen werden. Dazu ist die Datenschutzerklärung noch nicht ergänzt. (Rechtliche Einschätzung, kein Rechtsrat.)

---

## 2. Notentabelle

| # | Kriterium | Note (1–5) | Begründung in einem Satz |
| --- | --- | :---: | --- |
| 1 | Korrekte Berechnung | 4 | Code = README-Methode, Handrechnungen stimmen; Schwächen: Plateau 127–157 m² im Süden, Extremwerte (10 m²-Haus, 1000 m²-Wohnung) werden ohne Rückfrage gerechnet. |
| 2 | Ehrlichkeit gegenüber dem Kunden | 3 | Quellen, Zeitraum und „indicative“ sind da; aber Haus-„Vertragsmiete“ wird dem Besucher als Fakt gezeigt, und die schmale Spanne suggeriert Genauigkeit. |
| 3 | Sicherheit | 4 | Saubere Prüfungen, Escaping, Webhook-Signatur korrekt; Lücken: kein Captcha, Origin-Prüfung greift nur bei Browsern, KV-Zähler nicht atomar. |
| 4 | Datenschutz (DSGVO) | 3 | `PRIVACY.md` ist ehrlich und deckt sich mit dem Code; offen sind Kopplung der Einwilligung und die noch nicht ergänzte Datenschutzerklärung. |
| 5 | Kundenerlebnis | 4 | Klarer 4-Schritte-Ablauf, Pflicht der Kontaktdaten früh gesagt, gute Hilfen; kleine Lücken (Alias „Duedelange“ fehlt, widersprüchliche Hinweise bei Rumelange). |
| 6 | Qualität der Leads | 4 | E-Mail auf einen Blick nützlich, Buttons und Reply-To korrekt; aber Doppel-Leads bei „Zurück“ und keine Warnung bei vermutlich falscher E-Mail-Adresse. |
| 7 | Barrierefreiheit | 4 | axe: 0 Verstöße in 3 Sprachen × 4 Breiten; Fokus fällt nach leerem Gemeindefeld auf `body`; kein Test mit echtem Screenreader. |
| 8 | Design und Marke | 4 | Farben und Schriften wie vorgegeben, Gold nur auf Navy, nichts ragt über; Demo-Seite verliert ihr Styling durch die eigene CSP. |
| 9 | Stabilität und Leistung | 4 | 85 KB, LCP ≈ 0,7 s bei gedrosselter Verbindung, Doppelklick abgefangen; bei Resend-Ausfall geht der Lead verloren, Safari < 16 kann nicht senden (vermutet). |
| 10 | Einbettung | 4 | `embed.js` robust (Herkunftsprüfung, Fallback-Link, Höhe, Scroll-Offset); Next.js-Komponente ungetestet, Vercel-Vorschau nicht in `frame-ancestors`. |
| 11 | Wartbarkeit | 4 | Gut lesbarer Code, 95 Tests; README veraltet (nennt 56 Tests), Oberfläche, `embed.js` und `update-data` ohne Unit-Tests. |
| 12 | Betrieb | 2 | Lokal alles korrekt; online existiert nichts (DNS für verlounen.lu und loyer-widget.pages.dev löst nicht auf), Pflicht-Einstellungen noch offen. |
| 13 | Marktdaten-Pipeline | 4 | Lesen ohne KI, Doppelte werden zusammengeführt, 100 Gemeinden genau einmal, keine Personendaten; erst 2 Erhebungen, AGB-Risiko der Portale bewusst akzeptiert. |

---

## 3. Befunde pro Kriterium

### 3.1 Korrekte Berechnung

**Handrechnungen (geprüft)**, alle mit dem Skript im Protokoll (Abschnitt 6) gegen `estimate()` verglichen:

| Fall | Hand | Tool |
| --- | --- | --- |
| Wohnung Dudelange 80 m², bon, D | 19,12 × (17,9/19,12) × (22,59/19,39) × (206,49/197,794) = 21,77 €/m² → Vertrag 1 741,7 €, Inserat 2 037,8 € → 1 750 / 1 900 / 2 050 € | 1 750 / 1 900 / 2 050 € ✔ |
| Wohnung Strassen 80 m² (Zone LC) | 22,22 × (21,4/22,22) × (25,38/22,54) × 1,04396 = 25,16 €/m² → 2 012,5 € | Vertrag 2 012,5 €, 2 000 / 2 200 / 2 350 € ✔ |
| Haus Dudelange 150 m² | exp(4,96132 + 0,62222 × ln 150) = 3 226,1 €; ÷ 1,17 = 2 757,4 €; Mitte 2 991,7 € → 3 000 € | 2 750 / 3 000 / 3 250 € ✔ |

Weitere geprüfte Punkte: Koeffizienten-Obergrenze (−20 %/+15 %) greift (`engine.ts:166`), höchstens 2 Stellplätze (`engine.ts:103–105`), bei Häusern kein Stellplatz-/Außenbereich-Zuschlag (wie in README), Rundung auf 50 €, Mindestabstand 100 €, Studio (0 Zimmer) → Zuverlässigkeit „limitée“, Index 2026T2 ÷ Mittel 2024–2025 = 1,044 wie in README. Für alle 100 Gemeinden × 2 Typen gibt es ein Ergebnis (Test vorhanden), Miete sinkt nie mit steigender Fläche (eigener Lauf 10–1000 m², 0 Fälle).

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 1.1 | **Plateau großer Wohnungen im Süden:** 127, 131 und 140 m² in Dudelange ergeben exakt dieselbe Miete (2 250 / 2 450 / 2 650 €), rechnerisch bis ca. 157 m². Ursache: Regel „größer nie billiger“ (`engine.ts:76–80`) gegen den Datensprung 15,5 → 12,6 €/m² (Klasse ≥ 130 m²). Methodisch vertretbar, aber für einen Eigentümer mit 150 m² schwer erklärbar. *Nachstellen:* `estimate()` mit surface 127/140. *Vorschlag:* In der Lead-E-Mail einen Hinweis „Plateau-Regel angewandt“ ausgeben; Jason entscheidet, ob ab 130 m² eine flache Steigung angesetzt wird. | klein | geprüft |
| 1.2 | **Extremwerte werden ohne Rückfrage gerechnet:** Haus 10 m² → 550 €/Monat (55 €/m²), Wohnung 1000 m² → 16 650 €/Monat; 20 Schlafzimmer auf 10 m² sind zulässig (`validation.ts:24–25`, keine Plausibilitätsprüfung Fläche/Zimmer, `params.json` → `maison_surface_limite` wird nirgends benutzt). Zuverlässigkeit steht dann zwar auf „limitée“, aber die Zahl wirkt absurd. *Vorschlag:* Haus 40–600 m², Wohnung 12–400 m², Zimmer ≤ Fläche/9; außerhalb freundliche Meldung „bitte Jason direkt kontaktieren“. | klein | geprüft |
| 1.3 | **Kleine Flächen teuer pro m²:** Studio 25 m² in Dudelange → 1 050 €/Monat (42 €/m²). Folgt aus der Verlängerung der Steigung 60 → 40 m² bis 25 m² (`engine.ts:60–63`, „proposition“). Ob das dem Markt entspricht, kann ich nicht belegen. *Vorschlag:* Jason anhand 3–4 realer Studios im Süden prüfen lassen. | klein | vermutet |
| 1.4 | **Aktualität:** Index-Quartal 2026T2 (Datei von data.public.lu vom 24.09.2026, `data/loyers.json`), Inserate-Zeitraum 01.07.2025–30.06.2026, Cadastre-Bericht Juni 2026, Haus-Erhebung 17.11.2026. Für den 18.11.2026 aktuell; 2026T3 dürfte bald erscheinen (vermutet). `update-data` hält den Index der Haus-Erhebung korrekt fest (`scripts/update-data.ts:201,234–235`), d. h. ein neues Quartal verschiebt das Hausmodell richtig. | – | geprüft |
| 1.5 | **Kanton-Median „Luxembourg“ = 22,22 = Zone LC:** Plausibel, wenn Grafik 5 den Kanton ohne Stadt meint. Ohne den Bericht kann ich das nicht bestätigen. *Vorschlag:* Einmal gegen Grafik 5/6 des Rapport n°24 abgleichen. | klein | vermutet |

### 3.2 Ehrlichkeit gegenüber dem Kunden

Positiv (geprüft): „Estimation indicative … ne remplace pas une visite“ immer sichtbar (`result.ts:149`), Quellen mit Zeitraum und Quartal, Hinweis auf gesetzliche Obergrenze mit Link, Möblierungszuschlag korrekt als separat erklärt, Test gegen Wörter wie „vrai loyer“/„garanti“, keine erfundenen Bewertungen oder Kundenzahlen. Die README legt die Haus-Annahme offen.

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 2.1 | **Haus: Annahme wird dem Besucher als Fakt gezeigt.** Die untere Zahl heißt „Loyer prudent – Niveau des baux signés récemment“ (`fr.json:214`) und „Le bas … correspond aux baux signés récemment“ (`fr.json:260`) – auch bei Häusern, wo sie nur Inserat ÷ 1,17 ist (laut README „hypothèse, pas mesurée“). *Vorschlag:* Für Häuser eigener Text, z. B. „Niveau estimé des baux signés (hypothèse : 15 % sous les annonces)“. | mittel | geprüft |
| 2.2 | **Spanne enger als die Unsicherheit.** Unten/oben liegen immer nur Faktor 1,17 auseinander (±8 % um die Mitte). Laut eigener Kontrolle (`docs/controle-annonces.md:33,139`) liegen im Süden nur 26 % der Inserate innerhalb ±8 % der Methode, typische Streuung ±18 %; Hausmodell: Standardabweichung 0,173 im Log (`references.json` → `ecartTypeLog`). Die Spanne ist korrekt beschriftet (Vertrag vs. Inserat), wird aber leicht als „hier liegt meine Miete“ gelesen. *Vorschlag:* Satz ergänzen: „Selon l'état réel et l'emplacement, le loyer peut s'écarter de ± 15 à 20 %.“ | mittel | geprüft |
| 2.3 | **Widersprüchliche Signale bei Gemeinden mit wenig Daten:** Rumelange (steht in `data/peu-de-donnees.json`) zeigt in Schritt 1 „Peu d'annonces publiques à Rumelange“, im Ergebnis „Fiabilité des données : Bonne – Beaucoup de loyers connus …“. `reliability()` (`engine.ts:119–131`) ignoriert die Liste. Fachlich vertretbar (gerechnet wird auf Kantonsebene), für den Besucher verwirrend. *Vorschlag:* Bei Gemeinden der Liste höchstens „moyenne“. | klein | geprüft (Browser, Screenshot `own-resultat-rumelange.png`) |
| 2.4 | **Quellenlink für Häuser** führt zu den Inserate-Zählungen von data.public.lu (`result.ts:155`), nicht zu den Daten des Hausmodells (eigene Erhebung, nicht öffentlich). Text „Sources : relevé d'annonces de maisons …“ ist korrekt, Link etwas irreführend. | klein | geprüft |
| 2.5 | „Les chambres meublées et les colocations ne sont pas comptées“ (`fr.json:260`): Für die Inserate-Erhebung belegt (`controle-annonces.md:7`), für die Cadastre-Mediane des Observatoire nicht nachprüfbar. | klein | vermutet |
| 2.6 | README nennt „Lighthouse 100/100/100“ und „56 tests“ (`README.md:46,276`). Testzahl ist veraltet (tatsächlich 95); Lighthouse konnte ich nicht nachprüfen. Kein Kundenrisiko, aber die README sollte stimmen. | klein | geprüft |

### 3.3 Sicherheit

Geprüft und in Ordnung: Serverprüfung aller Felder mit geschlossenen Listen (`validation.ts:172–204`), Honeypot (`validation.ts:232–233`, lokal: 400 „rejected“, keine E-Mail), Content-Type exakt `application/json` (415), ungültiges JSON (400), zu groß (413), falsche Methode (405), fremde Origin (403). Einzeilige Felder ohne Zeilenumbrüche/unsichtbare Zeichen, Namen nur Buchstaben, alles HTML-escaped (`email.ts:39–41,230`), Betreff aus geschlossenen Listen. Fehlermeldungen ohne interne Details. CSP ohne `unsafe-inline`, `frame-ancestors` nur immobuild.lu (lokal ausgeliefert, siehe Protokoll). Keine Mietdaten im Browser-Bundle (grep in `dist/`). Webhook: Svix-Signatur HMAC-SHA256, Vergleich in konstanter Zeit, 5-Minuten-Fenster, nur Tag `copie_visiteur` (keine Schleife), HTML in Feldern wird escaped (eigener Test, Protokoll). Kopie an den Besucher enthält keinen frei eingegebenen Text (`email-visiteur.ts:317–373`).

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 3.1 | **Kein Schutz gegen gezielten Spam, geteiltes Kontingent.** Honeypot hält nur dumme Bots ab. Ohne KV zählt das Limit pro Cloudflare-Instanz im Speicher (`ratelimit.ts:173,190`), d. h. faktisch kaum begrenzt; mit KV ist get→put nicht atomar (`ratelimit.ts:186–200`, parallele Anfragen zählen doppelt nicht). Folge: Jasons Postfach und das mit dem Bewertungs-Tool geteilte Resend-Kontingent (100/Tag, README 3.3) lassen sich füllen; danach scheitert jeder echte Lead (502). *Nachstellen:* `curl` ohne Origin mit gültigem JSON (nicht ausgeführt, würde E-Mail auslösen; Code-Pfad `handler.ts:103` belegt). *Vorschlag:* Cloudflare Turnstile (kostenlos, unsichtbar) + KV aktivieren + Resend-Plan prüfen. | mittel | geprüft (Code), Auswirkung vermutet |
| 3.2 | **Origin-Prüfung nur für Browser:** fehlt der Header, wird die Anfrage angenommen (`handler.ts:103`; lokal: `{}` ohne Origin → 400 *validation*, nicht 403). Als CSRF-Schutz korrekt, als Bot-Schutz wirkungslos. README formuliert „Formulaire accepté seulement depuis la page de l'outil“ – zu stark. *Vorschlag:* README-Satz präzisieren; Schutz über Turnstile. | klein | geprüft |
| 3.3 | **Standard-Salz öffentlich:** Ohne `RATE_LIMIT_SALT` wird `'immobuild-loyer'` benutzt (`handler.ts:131`); IPv4-Hashes in KV ließen sich dann durchprobieren. In README/PRIVACY offen gesagt. *Vorschlag:* Salz vor Start Pflicht machen (bei fehlendem Salz und vorhandenem KV: Warnung im Log). | klein | geprüft |
| 3.4 | Körper wird erst vollständig gelesen, dann Größe geprüft (`handler.ts:106–107`, `webhook.ts:84–85`); `length` zählt Zeichen, nicht Bytes. Cloudflare begrenzt selbst (100 MB), praktisch harmlos. | klein | geprüft |
| 3.5 | `npm audit`: 1 „high“ in `xlsx` (Prototype Pollution, ReDoS), kein Fix verfügbar. Nur Dev-Abhängigkeit für `update-data`, liest nur Dateien von data.public.lu; nicht im ausgelieferten Tool. *Vorschlag:* Auf SheetJS-CDN-Version oder CSV-Download umstellen, wenn verfügbar. | klein | geprüft |
| 3.6 | Webhook: dieselbe signierte Nachricht innerhalb von 5 Minuten erneut → zweites Avis (eigener Test: 2× 200 „avis“). In README erwähnt. *Vorschlag:* akzeptieren oder `svix-id` 10 min in KV merken. | klein | geprüft |
| 3.7 | Keine HSTS-Header in `_headers`. Bei Cloudflare per Dashboard einstellbar. | klein | geprüft |

### 3.4 Datenschutz (DSGVO)

Geprüft und stimmig: Keine Cookies, kein Tracking, Schriften lokal (Netzwerk-Log: nur eigene Domain), keine Datenbank, IP nicht in der E-Mail, Telefon-Tag bei Resend in `PRIVACY.md` Abschnitt 3 offengelegt, USA-Transfer (Resend) benannt. Marktdaten: gespeichert werden nur Quelle, ID, URL, Ort, Typ, Fläche, Zimmer, Preise, Datum (`data/marche/maisons.json`, alle 214 Einträge mit genau diesen Feldern; keine Makler-/Agenturnamen, keine Beschreibungen).

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 4.1 | **Kopplung Einwilligung ↔ Ergebnis.** Das Ergebnis gibt es nur mit Häkchen „J'accepte qu'ImmoBuild Kohn utilise ces informations pour me recontacter“ (`fr.json:166,176`). Einwilligung muss freiwillig sein; ist sie Bedingung für eine Leistung, kann sie unwirksam sein (Art. 7 Abs. 4 DSGVO). *Vorschlag (Jurist fragen):* Rechtsgrundlage auf „vorvertragliche Anfrage / berechtigtes Interesse“ stellen und das Häkchen als „Kenntnisnahme“ formulieren, oder Ergebnis ohne Kontakt-Einwilligung zeigen. | mittel | vermutet (rechtliche Einschätzung) |
| 4.2 | **Datenschutzerklärung noch nicht ergänzt:** Der Link geht auf die allgemeine Seite (`config.json` → `privacyUrl`); der Textvorschlag in `PRIVACY.md` Abschnitt 7 mit Speicherdauer „[à compléter]“ ist noch nicht übernommen (vermutet, Seite nicht abrufbar). Informationspflicht Art. 13 vor Start erfüllen. | mittel | vermutet |
| 4.3 | `PRIVACY.md` sagt „page … (adresse sans paramètres)“; das gilt nur über `embed.js` (`embed.js:76`). Direkt aufgerufen kann `?src=` eine beliebige URL mit Parametern enthalten (`main.ts:21–24`, `validation.ts:245`). Harmlos, aber Formulierung anpassen. | klein | geprüft |
| 4.4 | Marktdaten speichern Inserat-URLs; einzelne URLs könnten indirekt auf private Vermieter verweisen. Kein Name gespeichert; geringes Risiko. AGB-Risiko der Portale vom Projektinhaber akzeptiert (README). | klein | geprüft |

### 3.5 Kundenerlebnis

Geprüft im Browser (390 px): Pflicht der Kontaktdaten steht in der Einleitung („pour voir le résultat, vous laissez vos coordonnées à la fin“) und in allen 3 Sprachen; Gemeindesuche mit Aliasen („Kirchberg → Luxembourg“); Tippfehler-Hinweis („gmial.com → gmail.com“); französische Nummer mit +352 → klare Meldung; „621 000 000“ abgelehnt; Zurück-Taste geht einen Schritt zurück, Antworten bleiben (Schritt 2: `etat` blieb gewählt); Doppelklick auf „Voir mon loyer“ → 1 Anfrage. Texte FR/DE/EN fehlerfrei und im Ton einheitlich (Stichprobe von 18 Schlüsseln je Sprache); gleiche Schlüssel per Test.

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 5.1 | Alias „Duedelange“ (häufige Schreibweise ohne Umlaut) → „Aucune commune trouvée“. „Düdelingen“, „Diddeleng“ funktionieren (`aliases.ts:17`). *Vorschlag:* Umlaut-Ersatz (ü→ue) in der Suche normalisieren. | klein | geprüft |
| 5.2 | Beispielnummer „621 123 456“ auch in der deutschen/englischen Fehlermeldung, unabhängig von gewählter Vorwahl. Für Grenzgänger mit +33/+49 verwirrend. | klein | geprüft |
| 5.3 | Wörtliche Ungereimtheit Rumelange: siehe 2.3. | klein | geprüft |
| 5.4 | „Stellplätze zählen bei der Miete.“ (DE `coach.garage`) klingt holprig; besser „Stellplätze erhöhen die Miete.“ | klein | geprüft |
| 5.5 | Abbruchrisiko: Schritt 3 fragt Eigentum/Verwaltung/Verfügbarkeit vor den Kontaktdaten; der Ablauf ist kurz (4 Schritte). Ob Besucher bei Schritt 4 abbrechen, lässt sich nur mit echten Zahlen sagen. | – | nicht messbar |

### 3.6 Qualität der Leads für Jason

Geprüft anhand der geloggten E-Mail (Protokoll): Betreff mit 🔥 und Gemeinde, Block „En un coup d'œil“ mit Priorität, Spanne, Telefon, E-Mail, Sprache; Reply-To = Besucher; Buttons `tel:+352…`, `wa.me/352…` (nur Mobil), `mailto:` mit vorbereitetem Text in Besuchersprache (`email.ts:183–215`); vollständiger Rechenweg. Priorität chaud/tiède/froid wie in README (`email.ts:49–55`), sinnvoll.

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 6.1 | **Doppelte Leads:** Zurück-Taste vom Ergebnis führt zu Schritt 4 mit allen Daten (`main.ts:623–625`), „Faire une autre estimation“ behält die Kontaktdaten (`main.ts:456–464`). Jedes erneute Absenden = neue Lead-E-Mail. Besucher, die Varianten ausprobieren (mit/ohne Garage), erzeugen 3–5 Leads. *Vorschlag:* Betreff-Zusatz „(2e estimation)“ über ein Zähler-Feld im Formular, oder Folge-Schätzungen ohne neue E-Mail anzeigen. | mittel | geprüft |
| 6.2 | **Keine Warnung bei vermutlich falscher E-Mail.** Die Adresse `test.revue@gmial.com` ging unverändert an Jason, ohne Hinweis (Hinweis erscheint nur dem Besucher). Das Avis „Adresse e-mail fausse“ funktioniert nur, wenn `copieVisiteur` aktiv ist (Standard: aus). *Vorschlag:* In der Lead-E-Mail „⚠️ Adresse peut-être mal tapée (gmial.com → gmail.com ?)“ mit derselben Tippfehlerliste. | mittel | geprüft |
| 6.3 | Avis „Adresse e-mail fausse“: Text verständlich, Button „Appeler“, Raison des Servers mitgeschickt (eigener Test). | – | geprüft |
| 6.4 | Es fehlt für den Rückruf eine Frage „Wann sind Sie am besten erreichbar?“ und die Adresse/Straße. Für den Erstkontakt nicht nötig, aber hilfreich. | klein | geprüft |
| 6.5 | Zahlenformat in der E-Mail „1.750 €“ (fr-LU), README schreibt „1 750 €“. Korrekt für Luxemburg, nur uneinheitlich. | klein | geprüft |

### 3.7 Barrierefreiheit (WCAG 2.1 AA)

Geprüft: axe-core (wcag2a/aa, 21a/aa) über alle Schritte und das Ergebnis, FR/DE/EN × 320/390/768/1280 px: **0 Verstöße**. Sichtbarer Fokusrahmen (3 px Navy) auf allen Bedienelementen, `aria-live` für Jasons Sprechblase, Fehler mit `aria-invalid` und `aria-describedby`, `prefers-reduced-motion` abgefangen (CSS `styles.css:429`, Zähl-Animation `main.ts:218`). Gold als Text nur auf Navy (Browser-Prüfung: kein Gold-Text auf hellem Grund).

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 7.1 | **Fokusverlust:** Leeres Gemeindefeld fokussieren → Tab → Fokus auf `body`. Vermutete Ursache: Die beim Fokus geöffnete, scrollbare Liste wird von Chrome als Tab-Ziel genommen und beim `blur` versteckt (`combobox.ts:66–68,99–103`). Nächster Tab geht weiter, aber ein Schritt ohne sichtbaren Fokus. *Vorschlag:* `tabindex="-1"` auf `#commune-list`. | klein | geprüft (Ursache vermutet) |
| 7.2 | axe prüft nur automatisch erkennbare Regeln; kein Test mit NVDA/VoiceOver. Die Spanne-Grafik ist `aria-hidden`, die Werte stehen als Text – gut. | – | nicht getestet |
| 7.3 | Das mitgelieferte Screenshot-Skript setzt `bypassCSP: true` (`scripts/screenshots.mjs:63`) – CSP-Probleme fallen damit nicht auf (siehe 8.1). | klein | geprüft |

### 3.8 Design und Marke

Geprüft: Navy #0A2342, Gold #C5A46D nur als Akzent (Rahmen, Icons, Text auf Navy, `styles.css:5` mit Kommentar 6,7:1), Off-White/Beige als Flächen; Poppins 600 und Montserrat 400/600 lokal geladen (`document.fonts` im Browser). Kein horizontaler Scroll, nichts abgeschnitten bei 320–1280 px (Layout-Prüfung des Skripts, 0 Befunde). Optisch geprüft an zwei Screenshots (FR-Ergebnis 390 px, DE Schritt 1 320 px): ruhig, professionell, Jasons Foto passt.

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 8.1 | **`demo.html` ohne Styling:** Inline-`<style>` (`public/demo.html:8`) wird von der eigenen CSP blockiert (Konsole: „Applying inline style violates … style-src 'self'“, Kopfzeile ohne Beige-Hintergrund). Betrifft nur die Demo, die Jason laut README zum Testen öffnen soll. *Vorschlag:* Styles in `/demo.css` auslagern. | klein | geprüft |
| 8.2 | Grüne Balken bei „Fiabilité : Bonne“ sind außerhalb der Markenfarben; funktional sinnvoll. | klein | geprüft |
| 8.3 | Unbekannte Pfade (`/nope`, `/api/nope`) liefern 200 mit der Startseite statt 404 (Pages-SPA-Verhalten ohne `404.html`). | klein | geprüft |

### 3.9 Stabilität und Leistung

Geprüft: Build 224 KB auf Platte; Startseite inkl. Vorab-Laden 85 KB übertragen; bei simulierter langsamer Verbindung (150 ms Latenz, 1,6 Mbit/s) Schritt 1 nach 922 ms sichtbar, LCP 736 ms, CLS 0,000. Antwort der lokalen Testanfrage nach 65 ms (ohne Resend). Resend-Ausfall/Timeout (10 s) → 502, Versuch zählt nicht ins Limit (Tests `api.test.ts`). Kopie scheitert → Ergebnis trotzdem (Test). Netzfehler → klare Meldung (`main.ts:569–572`). Doppelklick → 1 Anfrage (Browser).

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 9.1 | **Lead hängt komplett an Resend.** Kein Ausweichweg (z. B. zweiter Empfänger, KV-Zwischenspeicher, Webhook zu einem anderen Dienst). Bei Resend-Störung oder erschöpftem Kontingent: Fehlermeldung mit E-Mail-Adresse – ein Teil der Besucher schreibt dann nicht. *Vorschlag:* Bei Fehler Anfrage verschlüsselt 7 Tage in KV ablegen und Jason beim nächsten erfolgreichen Versand nachliefern, oder mindestens Monitoring. | mittel | geprüft (Code) |
| 9.2 | **Zeitlimits passen nicht zusammen, wenn die Kopie aktiv ist:** Browser bricht nach 20 s ab (`main.ts:566`), Server wartet bis 10 s auf den Lead und weitere 10 s auf die Kopie (`handler.ts:86,153`, synchron). Im schlechtesten Fall „Envoi n'a pas abouti“, obwohl der Lead schon bei Jason ist → Besucher sendet erneut → Doppel-Lead. *Vorschlag:* Kopie per `waitUntil` nach der Antwort senden. | klein | geprüft (Code), Eintritt vermutet selten |
| 9.3 | **Safari < 16 / iOS < 16:** `AbortSignal.timeout` (`main.ts:566`) gibt es dort nicht → Exception → „L'envoi n'a pas abouti“, Absenden unmöglich. Top-Level-`await` (`main.ts:18`) braucht Safari ≥ 15. Anteil 2026 vermutlich klein. *Vorschlag:* `AbortController` + `setTimeout` als Fallback. | klein | vermutet (nicht in Safari getestet) |
| 9.4 | `requestIdleCallback` fehlt in Safari – Fallback vorhanden (`main.ts:63–64`). Firefox: keine Besonderheiten im Code gefunden. | – | geprüft (Code) |

### 3.10 Einbettung

Geprüft: `embed.js` prüft `e.origin === base` und `e.source` (`embed.js:115–119`), begrenzt Höhe (< 20 000) und Scroll-Offset, setzt Stile mit `!important` gegen WordPress-Themes, Fallback-Link nach 15 s ohne Lebenszeichen (`embed.js:94–98`), `loading="lazy"`, `data-offset` für feste Kopfzeilen. In der Demo (390 px) wurde die Höhe per postMessage auf 1423 px gesetzt. Zurück-Taste innerhalb des iframes über `history.pushState` (`main.ts:601–633`) – im eigenständigen Aufruf geprüft.

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 10.1 | `frame-ancestors` erlaubt nur `immobuild.lu` und Subdomains (`public/_headers`). Vercel-Vorschauen und `localhost` zeigen den Fallback-Link. In README dokumentiert; vor Tests auf Vorschau-URLs daran denken. | klein | geprüft |
| 10.2 | Next.js-Komponente (`integration/LoyerWidget.tsx`) nicht getestet. Auffällig: `key={lang}` erzeugt beim Sprachwechsel einen neuen Container, `mount()` wird in `useEffect` und `onReady` aufgerufen; `embed.js` verhindert Doppel-Montage (`embed.js:72`). Sieht korrekt aus. | – | vermutet |
| 10.3 | Zurück-Taste im iframe: `history.pushState` im iframe fügt Einträge zur Verlaufsliste des Elternfensters hinzu – gewollt. Wer nach dem Ergebnis die Seite verlassen will, muss mehrmals „Zurück“ drücken (je Schritt einmal). | klein | vermutet (im iframe nicht nachgestellt) |
| 10.4 | WordPress/Elementor nicht getestet (keine Installation). | – | nicht getestet |

### 3.11 Wartbarkeit

Geprüft: TypeScript strikt, `tsc --noEmit` ohne Fehler; Code mit verständlichen französischen Kommentaren; Parameter getrennt in `params.json`/`references.json` mit Quellen; 95 Tests in 6 Dateien grün. `update-data` bricht bei Formatänderung ab, statt falsche Daten zu schreiben.

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 11.1 | Testlücken: keine Unit-Tests für `main.ts` (Ablauf, Zurück-Taste, Fehlerzuordnung), `embed.js`, `combobox.ts`, `update-data.ts`; Anfrage ohne Origin nicht getestet. Abdeckung der Oberfläche nur über das Screenshot-Skript (setzt laufenden Server und Playwright voraus). | klein | geprüft |
| 11.2 | README veraltet bei Testzahl (56 statt 95) und verweist für die Marktdaten auf eine Claude-Sitzung mit festem Werkzeugnamen `mcp__Firecrawl__firecrawl_scrape` (`PROCEDURE.md:25`); in dieser Sitzung heißt das Werkzeug anders. Eine automatische Sitzung muss das selbst erkennen. | klein | geprüft |
| 11.3 | README ist für Jason gut lesbar (Schritte, Befehle, Tabellen), aber lang (rund 300 Zeilen) und mischt Nutzer- und Entwicklerthemen. *Vorschlag:* Eine Seite „Vor dem Start: 8 Haken“ an den Anfang. | klein | geprüft |

### 3.12 Betrieb

Lokal geprüft (`npm run dev`, Port 8788):

| Anfrage | Ergebnis |
| --- | --- |
| `GET /` Header | CSP (inkl. `frame-ancestors`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ✔ |
| `GET /embed.js` | `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=600` ✔ |
| `GET /api/estimate` | 405 ✔ |
| `POST` mit `text/plain` | 415 ✔ |
| `POST` ungültiges JSON | 400 `json` ✔ |
| `POST` fremde Origin | 403 ✔ |
| `POST` 30 KB | 413 ✔ |
| `POST {}` / `[]` | 400 `validation` ✔ |
| `POST` Honeypot | 400 `rejected` ✔ |
| `PUT /api/estimate` | 405 ✔ |
| `GET /api/resend-webhook` | 405 ✔ |
| `POST /api/resend-webhook` ohne Secret | 500 `config` ✔ (gewollt) |

Bei keiner dieser Anfragen wurde eine E-Mail geloggt.

**Echte lokale Testanfrage im Browser** (18.11.2026, 21:20:05 UTC = 22:20 Luxemburg): Wohnung Rumelange 80 m², Ergebnis 1 750 / 1 900 / 2 050 € nach 65 ms, eine Lead-E-Mail im Log (vollständig, siehe Abschnitt 3.6).

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 12.1 | **Nicht online:** `verlounen.lu`, `www.verlounen.lu` und `loyer-widget.pages.dev` lösen per DNS nicht auf (Firecrawl: „DNS resolution failed“, 18.11.2026 ca. 21:25 UTC; direkter Zugriff vom Prüfrechner durch Proxy gesperrt). Ob die Domain registriert ist, habe ich nicht geprüft. | – (erwartet) | geprüft |
| 12.2 | **Pflicht-Einstellungen vor Start offen:** `gestionUrl` zeigt auf `/contact/` (keine Seite „gestion locative“), `phone` leer, Datenschutztext (4.2), Koeffizienten „à valider“, KV + `RATE_LIMIT_SALT`, Gesetzeslage (Reform in Diskussion) erneut prüfen. Alles in README 3.6 erwähnt, aber nicht als Checkliste. | mittel | geprüft |
| 12.3 | `npm run dev` baut und startet ohne Fehler; im Log erscheint ein Fehler-Stacktrace von `undici` (vermutlich Wrangler-Update-Prüfung ohne Internet), ohne Folgen. | klein | geprüft |

### 3.13 Marktdaten-Pipeline (Häuser)

Geprüft: atHome aus `window.__INITIAL_STATE__`, wortimmo aus HTML-Fiches, immotop aus `__NEXT_DATA__` – ohne KI (`src/marche/portails.ts`, `immotop.ts`); bei Formatänderung klare Fehlermeldung statt stiller Fehldaten (Tests). Zusammenführen über Portale (Gemeinde, Fläche ±2 m², gleiche Zimmer + Preis ±3 % bzw. 1 Zimmer Unterschied + Preis ±1 %) mit Tests. `data/marche/secteurs.json`: alle 100 Gemeinden genau einmal (eigene Prüfung + Test). Mindestens-10-Regel mit Rückfall Sektor → Region → Land (Test). Unvollständige Erhebung erzeugt keine falschen „disparues“ (Stand 18.11.: athome/wortimmo nicht erhoben → Warnung, 0 Verschwundene). **Kein automatischer Einfluss auf den Preis:** `scripts/marche-maisons.ts` schreibt nur `data/marche/*` und `docs/marche/*` (Zeilen 102–105, 130, 198), nie `references.json`/`params.json`.

| # | Befund | Schwere | Status |
| --- | --- | --- | --- |
| 13.1 | **Datenbasis noch dünn:** 2 Erhebungen (17.11. atHome+wortimmo, 18.11. nur immotop), 111 verschiedene Häuser; 11 von 15 Sektoren unter 10 Häusern. Jasons eigener Sektor Sud-Est (Dudelange, Bettembourg) hat 3 Häuser mit Median 8 500 € (`rapport-maisons-2026-11-18.md`, getrieben durch die Roeser-Doppelinserate). Aus dem Bericht sollten noch keine Schlüsse gezogen werden – der Bericht sagt das selbst. | mittel | geprüft |
| 13.2 | **Automatischer Push auf den Entwicklungsbranch** jede Woche (`PROCEDURE.md:74`). Kollidiert mit gleichzeitiger Arbeit am Tool und vermischt Daten-Commits mit Code. *Vorschlag:* eigener Branch `marche/releves` oder eigenes Repo. | klein | geprüft |
| 13.3 | atHome: Land fehlt → als `LU` gezählt (`portails.ts:75`). Ein ausländisches Haus ohne Land würde in die Luxemburg-Statistik fallen. Sicherer: unbekannt = ausschließen. | klein | geprüft |
| 13.4 | Rechtliches Risiko (Nutzungsbedingungen der Portale) ist vom Projektinhaber am 17./18.11.2026 schriftlich akzeptiert; die Erhebung speichert keine Personendaten (3.4). Ich bewerte das Risiko nicht weiter. | – | geprüft |
| 13.5 | Localité „Koedange“ unbekannt (Bericht 18.11.) – korrekt nicht geraten, sondern gelistet. | – | geprüft |
| 13.6 | Bericht nutzt „5.000 €“ (Punkt als Tausendertrenner) in einem französischen Dokument; uneinheitlich mit README. | klein | geprüft |

---

## 4. Die 5 wichtigsten Verbesserungen (Nutzen für Jason ÷ Aufwand)

| Rang | Verbesserung | Nutzen | Aufwand (grob) |
| --- | --- | --- | --- |
| 1 | **Start-Checkliste abarbeiten:** `gestionUrl`, `phone`, Datenschutzerklärung (Text aus `PRIVACY.md` §7 + Speicherdauer), KV + `RATE_LIMIT_SALT`, Koeffizienten freigeben, Gesetz erneut prüfen. | Ohne das kein seriöser Start | 2–3 h (Jason), 0 Code |
| 2 | **Warnung „E-Mail vermutlich vertippt“ in der Lead-E-Mail** (gleiche Liste wie im Browser) und Hinweis „2e estimation du même visiteur“ bei erneutem Absenden. | Weniger tote Leads, weniger Doppel-E-Mails | 2–3 h |
| 3 | **Cloudflare Turnstile** vor `/api/estimate` (unsichtbar, kostenlos) + KV-Limit. | Schützt Postfach und das mit dem Bewertungs-Tool geteilte Resend-Kontingent | 3–4 h |
| 4 | **Ehrlichere Spanne:** Haus-Untergrenze als „estimation (hypothèse)“ beschriften; Satz zur typischen Streuung (±15–20 %); Zuverlässigkeit höchstens „moyenne“ bei Gemeinden aus `peu-de-donnees.json`. | Vertrauen; weniger Enttäuschung beim Rückruf | 1–2 h (Texte FR/DE/EN + 1 Test) |
| 5 | **Lead nicht verlieren, wenn Resend scheitert:** Anfrage kurz in KV ablegen und nachsenden, Kopie an den Besucher per `waitUntil`. | Kein Lead-Verlust bei Störung | 4–6 h |

Rechtlich zusätzlich (kein Code-Aufwand, aber wichtig): Kopplung Einwilligung ↔ Ergebnis mit einem Juristen klären (Befund 4.1).

---

## 5. Nicht getestet

- **Safari (macOS/iOS) und Firefox:** nicht im Browser getestet, nur Code gelesen. Getestet wurde ausschließlich Chromium (Playwright).
- **Echtes Resend / echte E-Mail im Postfach:** nicht getestet (Regel: nur `EMAIL_MODE=log`). Darstellung der HTML-E-Mail in Outlook/Gmail, Funktion der Buttons `tel:`/`wa.me`/`mailto:` auf dem Handy und Zustellbarkeit (Spam-Ordner) sind offen.
- **Webhook mit echtem Resend:** nur im Prozess mit selbst signierten Nachrichten getestet.
- **Live-Betrieb:** nicht möglich, Domain und `*.pages.dev` lösen nicht auf. Cloudflare-Verhalten (mehrere Instanzen, KV-Verzögerung) nicht beobachtbar.
- **Lighthouse:** nicht ausgeführt; das Nachladen des Pakets wurde in dieser Umgebung nicht erlaubt. Ersatzweise Playwright-Messung (Abschnitt 6). Die README-Angabe „100/100/100“ ist damit **nicht bestätigt**.
- **Screenreader** (NVDA, VoiceOver): nicht getestet; nur axe-core.
- **WordPress/Elementor und Next.js-Einbettung:** nicht getestet; nur `demo.html` lokal.
- **Zurück-Taste innerhalb des iframes:** nur ohne iframe getestet.
- **Marktdaten-Erhebung:** nicht gestartet (Regel), keine Portalabfrage; nur Code, Tests und gespeicherte Daten.
- **Fachliche Richtigkeit der Quellwerte** (Rapport n°24, Grafiken 5–10): nicht gegen das PDF abgeglichen.
- **Gültige Anfrage gegen ein Live-System:** bewusst nicht (würde Jason einen echten Lead schicken).

---

## 6. Protokoll

Alle Zeiten UTC, 18.11.2026. Arbeitsverzeichnis `loyer-widget/`.

| Uhrzeit | Befehl | Ergebnis |
| --- | --- | --- |
| ~21:10 | `npm ci` | ok |
| 21:15 | `npx vitest run` | **6 Dateien, 95 Tests, alle grün** (0,54 s) |
| 21:15 | `npx tsc --noEmit` | 0 Fehler |
| 21:15 | `npx vite build` | ok; JS 43,5 KB (15,2 KB gzip) + Nachlade-Teile, CSS 41 KB (8,8 KB gzip), `dist/` 224 KB |
| 21:15 | `grep` nach Mietdaten in `dist/assets/*.js` | keine Treffer (keine Mediane, Konstanten, 1,17) |
| 21:15 | `npm audit` | 1 high (`xlsx`, Dev-Abhängigkeit, kein Fix) |
| ~21:16 | `cp .dev.vars.example .dev.vars` (`EMAIL_MODE=log`), `npm run dev` | Server auf :8788 |
| ~21:16 | 14 absichtlich falsche Anfragen per `curl` (Tabelle 3.12) | 400/403/405/413/415/500 wie erwartet, 0 E-Mails |
| ~21:17 | `tsx` Skript: `estimate()` für 22 Fälle + Monotonie 10–1000 m² | Handrechnungen ✔, 0 Monotonie-Verstöße, Plateau 127–140 m² (1.1) |
| 21:17:52–21:19:38 | `scripts/screenshots.mjs` (Kopie mit Ausgabe in den Scratchpad, sonst unverändert) | **axe: 0 Verstöße**, kein Überlauf, kein abgeschnittener Text (FR/DE/EN × 320/390/768/1280); iframe-Höhe 1423 px; 17 lokale Anfragen, alle 200 |
| 21:20:05 | Eigene Playwright-Prüfung mit aktiver CSP (lokale Testanfrage) | Ergebnis nach **65 ms**, 1 Anfrage bei Doppelklick, Zurück-Taste ok, keine Konsolenfehler im Tool; CSP-Fehler auf `demo.html` (8.1) |
| ~21:21 | Playwright-Messung (gedrosselt: 150 ms, 1,6 Mbit/s) | Schritt 1 nach 922 ms, LCP 736 ms, CLS 0,000, 85 KB übertragen |
| ~21:22 | Lighthouse (`npx lighthouse`) | **nicht ausgeführt** (Paket-Download nicht erlaubt) |
| ~21:23 | `curl` auf verlounen.lu / www / loyer-widget.pages.dev | vom Proxy abgewiesen |
| ~21:25 | Firecrawl (nur lesend) auf verlounen.lu und loyer-widget.pages.dev | „DNS resolution failed“ für beide |
| ~21:27 | `tsx` Skript: Webhook mit selbst signierten Nachrichten | gültig 200/avis; Wiederholung 200/avis (Duplikat); falsche Signatur 401; 10 min alt 401; ohne Tag / delivered 200/ignore; HTML escaped |
| ~21:30 | Playwright: Tastatur und Goldfarbe | Fokusverlust nach leerem Gemeindefeld (7.1); kein Gold-Text auf hellem Grund |
| – | Dateiprüfungen (Python) | `secteurs.json`: 100/100 Gemeinden, 0 doppelt, 0 fehlend; `maisons.json`: 214 Einträge, nur Sachfelder |

Die Prüfskripte liegen nur im Scratchpad der Prüfsitzung und sind nicht Teil des Repos. Lokal erzeugte Dateien (`.dev.vars`, `dist/`) sind per `.gitignore` ausgeschlossen bzw. wurden entfernt.
