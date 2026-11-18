# Prüfbericht: Käufer-Tool « Mon budget d’achat » (`acheteur-widget/`)

Prüfung vom 18.11.2026, Branch `claude/acheteur-concept` (Stand Commit `eac38bd`). Unabhängig: README und concept.md wurden gelesen, aber jede Aussage unten habe ich selbst nachgeprüft oder ausdrücklich als „vermutet“ / „nicht geprüft“ markiert. Am Code des Tools wurde nichts geändert. Keine Rechtsberatung.

Legende: **[geprüft]** = selbst ausgeführt oder in offizieller Quelle gelesen (Beleg dabei). **[vermutet]** = meine Einschätzung ohne vollständigen Beleg. **[nicht geprüft]** = nicht untersucht.

---

## 1. Gesamturteil

Die Berechnung stimmt: Drei Fälle habe ich von Hand nachgerechnet, sie treffen auf den Euro (Rundung 100 €). Die Regeln (7 %, Bëllegen Akt 40 000 € mit 100 € Mindesterhebung, CSSF 100/90/80 %, Barème 7 und 5, 0,24 % + 0,05 %) sind durch offizielle Quellen belegt. Lokal ist das Tool technisch sauber: 80/80 Tests, Build ohne Fehler, alle Fehlanfragen werden korrekt abgewiesen, ohne dass eine E-Mail entsteht. axe meldet 0 Verstöße auf 8 Bildschirmen bei 320, 390 und 1280 px, es gibt keine JavaScript-Fehler, und das Ergebnis kommt nach 125 ms.

**Für echte Kunden ist es bereit, sobald drei Dinge erledigt sind.** Diese sind keine Programmierfehler, sondern Entscheidungen bzw. Betriebsfragen.

**Die 3 größten Risiken, das wichtigste zuerst:**
1. **Courtier-Weiterleitung gegen Vergütung, ohne Namen am Kästchen und ohne Offenlegung der Vergütung.** Die Ausnahme „présente seulement“ im Code de la consommation passt nach dem Wortlaut (siehe 2.4). Offen bleiben aber zwei Fragen, die ich vermute, nicht geprüft habe: ob die DSGVO-Einwilligung ohne Namen am Kästchen gültig ist, und ob „gratuitement“ ohne Hinweis auf Jasons Vergütung lauterkeitsrechtlich hält. → Anwalt, vor dem Start.
2. **Betrieb auf Cloudflare ist ungetestet.** Offen sind: KV-Limit (in der README des Käufer-Tools nicht beschrieben), echter Resend-Versand, EZB-Abruf und Cache auf `pages.dev`, `frame-ancestors` auf immobuild.lu/Elementor. Ohne KV ist das Limit von 20 Anfragen pro Stunde und IP nur ein Zähler pro Server-Instanz.
3. **Versprechen, die Jason von Hand einlösen muss:** « Jason vous rappelle », « Notre courtier partenaire vous contactera », « Prévenez-moi si un bien correspondant entre chez ImmoBuild » (ohne Datenbank, Abgleich in Apimo von Hand) und « Je connais aussi des biens qui ne sont pas encore en ligne ». Bleibt ein Lead liegen, wirkt das Tool unehrlich, obwohl die Zahlen stimmen.

---

## 2. Notentabelle

| # | Kriterium | Note | Begründung (ein Satz) |
| --- | --- | --- | --- |
| 1 | Korrekte Berechnung | **4** | Drei Fälle von Hand bestätigt; Schwächen nur bei Randfällen (negatives Eigenkapital beim Verkauf wird stumm auf 0 gesetzt, „Median des Kantons“ teils aus 1 Gemeinde, CSSF-Ausnahmequote nicht erwähnt). |
| 2 | Ehrlichkeit gegenüber dem Kunden | **4** | Quellen, Zeitraum, Annahmen und « ni conseil ni offre » sind klar; Abzug für « gratuitement »/« partenaire » ohne Hinweis auf Vergütung und für unbelegbare Werbesätze. |
| 3 | Sicherheit | **4** | Alle Server-Prüfungen greifen und der Server rechnet selbst; KV nicht eingerichtet bzw. nicht dokumentiert, unsichtbare Zeichen gehen in die E-Mail, 1 bekannte Lücke in `xlsx` (nur Entwicklung). |
| 4 | Datenschutz (DSGVO) | **3** | Sparsam und ohne Cookies, aber Courtier am Kästchen ohne Namen, Datenschutzerklärung von immobuild.lu noch nicht ergänzt, Aufbewahrungsfristen offen. |
| 5 | Kundenerlebnis | **4** | Klar, tolerant bei Eingaben, Budget ohne Kontaktdaten; 5 Schritte mit ~30 Feldern sind lang, kleine Textmängel in DE/EN. |
| 6 | Qualität der Leads | **4** | Auf einen Blick nützlich, alle geforderten Angaben kommen an; falsche Gruppierung bei +351-Nummern, irreführende Zeile „Écart avec l’apport déclaré“, „chaud“ etwas großzügig. |
| 7 | Barrierefreiheit | **4** | axe 0 Verstöße, Tastatur inkl. Regler funktioniert, reduced-motion beachtet; kein echter Screenreader-Test. |
| 8 | Design und Marke | **4** | Farben und Schriften korrekt und lokal, kein Überlauf bei 320/390/1280 px; Vergleich mit estimatioun.lu nicht live geprüft. |
| 9 | Stabilität und Leistung | **4** | Schnell, kleines Bundle (~45 kB gzip JS+CSS), Doppelklick abgefangen, Ausfälle im Code behandelt; Safari/Firefox, Lighthouse und Cloudflare-Betrieb nicht getestet. |
| 10 | Einbettung | **3** | `embed.js` lokal funktionsfähig (Höhe, Herkunftsprüfung); WordPress/Elementor nicht getestet, keine Next.js-Komponente. |
| 11 | Wartbarkeit | **3** | Lesbarer, kommentierter Code und gute README; 7 Dateien 1:1 aus dem Estimation-Tool kopiert, CSS mit toten Estimation-Regeln, keine automatischen Browser- oder `embed.js`-Tests. |
| 12 | Lokaler Betrieb | **5** | Alle geforderten Fehlerfälle liefern den richtigen Code ohne E-Mail; `/api/taux` live von der EZB; Testanfrage in 125 ms mit vollständiger E-Mail. |

---

## 3. Befunde pro Kriterium

### 3.1 Korrekte Berechnung

**Handrechnungen [geprüft].** `npx tsx` mit `computeBudget` (Skript im Protokoll) und mit Taschenrechner gegengerechnet:

| Fall | Von Hand | Tool |
| --- | --- | --- |
| **A.** Paar, Erstkauf, 600 000 €, Ersparnis 60 000 €, Verkauf 400 000 € mit Restschuld 150 000 € | Gebühren 42 000; Bëllegen min(80 000; 42 000 − 100) = 41 900; Notar Barème 7: 1 750,23 × 1,17 = 2 047,76; Kreditakt bei 600 000: 1 740 + 1 028,19 × 1,17 = 2 942,98; Bedarf 605 390,74 → **605 400 bis 606 100**; Verkaufserlös 400 000 − 150 000 − 14 040 = **235 960**; nötiger Kredit ≈ 307 188 + Kreditkosten ≈ 1 922 = **309 110**; Rate 25 J. 4,03 %: **1 636,7 €** | 605 400 – 606 100; 236 000; 309 100; 1 640 € ✔ |
| **B.** Vermietung, allein, 400 000 €, Ersparnis 100 000 €, Kreditbetrag 300 000 € | Gebühren 28 000, kein Bëllegen; Notar 1 550,23 × 1,17 = 1 813,8; Kredit min(320 000; 300 000) = 300 000, Kosten 870 + 878,19 × 1,17 = 1 897,5; Bedarf **432 000 bis 432 700**; Fehlbetrag **32 000 bis 32 700**; Höchstpreis: bei 350 000 € braucht man 99 083 € ≤ 100 000 ✔, bei 355 000 € 100 453 € ✘ → **350 000** | identisch ✔ |
| **C.** 50 000 €, Erstkauf | Gebühren 3 500, Bëllegen 3 400 (100 € bleiben) | ✔ |

Die Tabellen von Barème 7 und 5 stimmen mit dem Notariat überein, ebenso Minimum 99,16 € und MwSt. 17 %. Quelle: notariat.lu, Tabelle `table_honoraires` (per OCR gelesen, abgerufen am 18.11.2026), https://www.notariat.lu/notaire/reglement-revision-tarifs.

**Regeln gegen Quelle [geprüft, abgerufen am 18.11.2026].**

- **7 % = 6 % + 1 %:** guichet.public.lu, crédit d’impôt actes notariés (Seite vom 07.07.2025); pfi.public.lu/fr/citoyen/enregistrement/tarif.html.
- **Bëllegen Akt 40 000 € pro Erwerber**, nur Eigennutzung, „L’AED percevra dans tous les cas un montant minimal de 100 euros“: guichet.public.lu (07.07.2025), Gesetz vom 03.07.2025 (legilux, eli/etat/leg/loi/2025/07/03/a279/jo).
  - Bei Vermietung gibt es nichts („Ne sont pas visés : … les immeubles destinés à la location“).
  - Der befristete „crédit d’impôt location“ von 20 000 € (Gesetz vom 22.05.2024) gilt nach Aktenlage im Nov. 2026 nicht mehr. Code `budget.ts:43–46` ✔.
- **45 000 €: Gesetzentwurf 8806** ist „En commission“ (chd.lu, letzte Aktualisierung 13.10.2026), also nicht verabschiedet. Die Behandlung als Hinweis ohne Rechnung ist ✔.
- **CSSF 20-08:** 100/90/80 %, FAQ vom 09.03.2026 (cssf.lu). Code `budget.ts:35–40` ✔; „je ne sais pas“ → 90 % ✔.
- **Kreditakt:** 0,24 % (pfi, tarif) und 0,05 % (pfi, hypothèques: „Il existe des exemptions“) ✔.

**Befunde:**

| Schweregrad | Befund | Beleg / Nachstellen | Vorschlag |
| --- | --- | --- | --- |
| mittel | **Negatives Eigenkapital beim Verkauf wird stumm auf 0 gesetzt.** Bei Restschuld > Wert − Kosten fehlt dem Käufer in Wirklichkeit Geld (er muss den Rest des alten Kredits ablösen), das Tool zeigt aber „Produit net 0 €“. [geprüft] | `budget.ts:77`; Wert 300 000 €, Restschuld 350 000 € → `produitVente: 0`, Fehlbetrag nur 4 800 – 5 500 € statt real ≈ 65 000 € mehr. | Bei negativem Erlös einen Hinweis zeigen (« Le prêt restant dépasse la valeur : à voir avec votre banque ») und im Lead markieren. |
| klein | **„Médiane du canton“ teils aus 1 Gemeinde.** Beispiel Beaufort (Kanton Echternach), Wohnung: Median aus `nombre: 1`. Die E-Mail schreibt dann „1 communes“. [geprüft] | `communes-m2.ts:172–174`; Skript `edge.ts`. | Mindestanzahl Gemeinden (z. B. 3), sonst „pas assez de données“. |
| klein | **CSSF-Ausnahmequote nicht erwähnt.** Banken dürfen 15 % ihrer Neukredite der 90-%-Kategorie bis 100 % vergeben (CSSF-FAQ 09.03.2026). Der Satz „C’est un plafond légal“ ist für 90 % daher etwas zu hart. [geprüft] | `fr.json` Text unter „Prêt maximal selon la règle CSSF“. | « En général 90 % ; les banques peuvent aller au-delà dans des cas limités. » |
| klein | **Neubau:** Gesetzentwurf 8807 (in commission, rückwirkend ab 16.07.2026) würde bei VEFA die bereits gebauten Teile befreien. Die Anzeige „7 % höchstens“ bleibt richtig. Die **TVA-Frage** beim Neubau (3 % vs. 17 %, v. a. bei Vermietung) berührt das Tool nicht. [vermutet: für Investoren in VEFA relevant] | chd.lu Dossier 8807. | Einen Satz zur TVA bei Neubau/Vermietung aufnehmen oder bewusst weglassen und im Gespräch klären. |
| klein | **Gemeindezuschlag nur als Hinweis:** richtig. In Mamer ist ausdrücklich befreit, wer den Bëllegen Akt nutzt (Règlement vom 11.12.2020, Art. 6), ebenso Einfamilienhäuser und VEFA-Wohnungen. In der Stadt Luxemburg sind Einfamilienhäuser und „maisons de rapport“ befreit (pfi.public.lu/fr/professionnel/enregistrement/surtaxe.html). Ob eine Eigentumswohnung in der Stadt darunter fällt, ist offen. [geprüft / Wohnung: nicht geklärt] | `params.json` → `surtaxe`. | So lassen, Notar fragen. |

**Datenaktualität [geprüft].**

- **Observatoire-Daten im Tool:** 01.07.2025 – 30.06.2026 (`data/communes.json`). Das ist die neueste Veröffentlichung (data.public.lu, aktualisiert am 24.09.2026, „Statistiques jusqu’au 2e trimestre 2026“).
- **Zinsen:** September 2026, 3,13 % / 4,03 %. Das entspricht dem ECB Data Portal; Oktober ist noch nicht veröffentlicht. `/api/taux` lieferte lokal `origine: "bce"`.

**Datenlage pro Gemeinde [geprüft].**

- Von 100 Gemeinden haben 49 keine eigenen notariellen Wohnungsdaten. 84 haben keine VEFA-Daten ≥ 10, 17 keine Hausangebote ≥ 30.
- **12 Gemeinden haben gar keinen Wert für Wohnungen**: Beckerich, Ell, Groussbus-Wal, Préizerdaul, Putscheid, Rambrouch, Redange, Saeul, Tandel, Useldange, Vianden, Vichten. Sie zeigen „pas assez de données publiques“, was korrekt behandelt ist.

**Gleiche Zahlen in Vorschau, Ergebnis und E-Mail [geprüft].** Nach dem Simulator (Preis 580 000 €) zeigen Ergebnisseite und E-Mail denselben nötigen Kredit (289 000 €) und dieselben Raten (1 390 / 1 530 € bei 25 Jahren). Die Vorschau bei 600 000 € stimmt mit der Handrechnung A überein.

### 3.2 Ehrlichkeit gegenüber dem Kunden

**[geprüft]** Was stimmt (Screenshot `docs/revue/390-fr-apercu.png`):

- Quelle und Zeitraum sind genannt (Observatoire, „du 1er juillet 2025 au 30 juin 2026“).
- « ni un conseil en crédit ni une offre de prêt » steht unter jedem Budget, in drei Sprachen.
- Die Rate ist als « Moyenne des crédits signés … ni une offre ni votre taux » markiert.
- Die 45 000 € sind als angekündigt und nicht gerechnet gekennzeichnet.
- Häuser erscheinen als « prix annoncés ».
- Die Annahmen sind als « Estimation » bzw. « 3 % + TVA » erkennbar.

**Bewertung Kreditvermittlung (Code de la consommation, Gesetz vom 23.12.2016)** [Wortlaut geprüft, Einordnung vermutet]:

- **Ausnahme im Wortlaut:** Art. L. 226-1 Nr. 14 nimmt aus, wer « ne présente pas seulement, directement ou indirectement, un consommateur à un prêteur **ou à un intermédiaire de crédit immobilier** » (legilux, eli/etat/leg/loi/2016/12/23/n24/jo).
  - Die Annahme in `concept.md` Teil 8, der Wortlaut nenne nur « à un prêteur », ist damit **überholt**. Die Ausnahme erfasst auch die Vorstellung bei einem Courtier.
- **Rechner selbst:** keine Produkte, keine Bank, keine persönliche Empfehlung („services de conseil“ = « recommandations personnalisées », Nr. 23). Nach meiner Lesart ist das **keine Vermittlung und keine Beratung**. [vermutet]
- **Vergütung:** Die Ausnahme hängt nach dem Wortlaut nicht davon ab, ob Jason bezahlt wird. Sie entfällt aber, sobald er Kreditverträge « présente ou propose » oder vorbereitende Arbeiten macht, z. B. Unterlagen sammeln oder Konditionen besprechen. [vermutet; Anwaltsfrage]

**Befunde:**

| Schweregrad | Befund | Beleg | Vorschlag |
| --- | --- | --- | --- |
| mittel | « Un courtier compare plusieurs banques pour vous, **gratuitement** » und « notre courtier **partenaire** », während Jason für die Weiterleitung bezahlt wird (concept.md Teil 8). Ob eine fehlende Offenlegung lauterkeitsrechtlich hält (Code de la consommation, irreführende Unterlassung), habe ich **nicht geprüft**. [vermutet: Risiko] | `fr.json:169`, `concept.md` Teil 8 | Anwalt fragen; einfachste Lösung: kurzer Satz im Link « Qui est notre courtier partenaire ? » (« ImmoBuild reçoit une rémunération du courtier, sans frais pour vous »). |
| mittel | Versprechen, die nur durch Jason eingelöst werden: « Jason l’a reçue aussi et vous rappelle », « Notre courtier partenaire vous contactera », « Prévenez-moi si un bien correspondant entre chez ImmoBuild ». [geprüft: Texte; Einlösung organisatorisch] | `fr.json:201, 273`, Ergebnisseite | Rückrufzeit intern festlegen (z. B. 1 Werktag); Apimo-Abgleich als feste Routine. |
| klein | « Je connais aussi des biens qui ne sont pas encore en ligne » ist unbelegbar. Muss für Jason wahr sein. [nicht prüfbar] | `result.agentText` | Nur behalten, wenn es regelmäßig zutrifft. |
| klein | `config.json` wird mit dem `_note`-Text ins Browser-Bundle übernommen („ton choix du 18/11/2026“). Für Besucher sichtbar, wenn sie den Code öffnen. [geprüft] | `dist/assets/index-*.js` | `_note` beim Import weglassen oder in README verschieben. |

### 3.3 Sicherheit

**[geprüft], lokal mit `wrangler pages dev`:** siehe 3.12 (405/415/403/400/413, Honeypot, keine E-Mail). Weitere Punkte:

- **Server prüft alle Felder:** `validation.ts` mit Whitelists für alle Auswahlfelder, Beträge mit Grenzen, Namen per Regex, E-Mail-Regex und Telefonprüfung.
- **Server rechnet selbst neu:** `handler.ts:123–126`; zusätzlich Test `api.test.ts:97`.
- **Kein Leck aus `server.json` [geprüft]:** Nach `npm run build` gibt `grep -E "atHome|acheteurs@|rateLimitPerHour" dist/assets/*.js` keinen Treffer. Die Treffer für `courtierNom` sind nur der leere Schalter `courtierNomPublic` und Kommentartext aus `config.json`. Auch Gemeindepreise stehen nicht im Bundle.
- **E-Mail-Injektion:**
  - Der Betreff ist von Zeilenumbrüchen bereinigt (`email.ts:95`).
  - Der HTML-Teil wird komplett mit `escapeHtml` erzeugt.
  - Das Versenden läuft über die Resend-JSON-API, ohne SMTP-Header. Header-Injection ist so nicht möglich. [vermutet für Resend-Seite]
  - Bidi-Steuerzeichen werden entfernt.
- **CSP:** `default-src 'self'`, kein `unsafe-inline`, `frame-ancestors 'self' https://immobuild.lu https://*.immobuild.lu`, nosniff, HSTS; per `curl -I` gesehen.
- **Fehlermeldungen** nennen nur Codes (`origin`, `validation` …), keine Interna.

**Befunde:**

| Schweregrad | Befund | Beleg | Vorschlag |
| --- | --- | --- | --- |
| mittel | **KV für das Limit ist nirgends eingerichtet, und die README des Käufer-Tools erklärt es nicht.** Es gibt kein `wrangler.toml`, und die README verweist nur pauschal auf die Estimation-README. Ohne KV zählt jede Cloudflare-Instanz für sich (`ratelimit.ts:224`). Das Limit von 20/h ist dann leicht zu umgehen. Folge: Spam-Leads und ein verbrauchtes Resend-Kontingent (100/Tag, **geteilt** mit dem Estimation-Tool). [geprüft: Code/Doku; Wirkung vermutet] | `grep -n KV README.md` → nichts | KV-Abschnitt aus `estimation-widget/README.md` (ab Zeile 121) übernehmen und vor dem Start einrichten. |
| klein | **Unsichtbare Zeichen:** Zero-width-Zeichen (U+200B usw.) bleiben in Nachricht/E-Mail erhalten; im Test kam `​` in der E-Mail an. Das Namensfeld erlaubt Punkte, z. B. „www.beispiel.com“ als Name. | `validation.ts:122`, Terminal-E-Mail | U+200B–U+200D, U+2060, U+FEFF mit entfernen. |
| klein | `npm audit`: **1 high** in `xlsx` (ReDoS, kein Fix). `xlsx` wird im Käufer-Tool nirgends importiert (nur in package.json). Keine Auswirkung auf das Live-Tool. [geprüft] | `npm audit` | Aus `devDependencies` entfernen. |
| klein | `/api/taux` ist ohne Limit; der Cache nutzt `caches.default`. Ich vermute, dass der Cache-API auf `*.pages.dev` nicht wirkt (bei `workers.dev` ist das so dokumentiert). Dann ruft jede Anfrage die EZB auf (max. 6 s). Missbrauch kann höchstens die EZB auf Cloudflare-IPs drosseln; dann greift der Ersatzwert. Personendaten sind nicht betroffen. [vermutet] | `src/server/taux.ts:151–173` | Nach dem Start im Log prüfen; notfalls KV als Cache nutzen. |
| klein | Die Größenprüfung erfolgt erst nach `request.text()` (alles wird gelesen, dann 20 000 Zeichen geprüft). | `handler.ts:96–97` | `content-length` vorab prüfen. Geringes Risiko. |

### 3.4 Datenschutz (DSGVO)

**[geprüft]** Was stimmt:

- Das Einkommen wird nur als Spanne abgefragt, ist freiwillig und hat die Option « préfère ne pas répondre ».
- Es gibt keine Cookies, keine Tracker und keine externen Schriften (Netzwerkprotokoll im Test: nur eigene Adresse).
- Die Vorschau sendet keine Formulardaten (nur `GET /api/taux` ohne Inhalt).
- Das Courtier-Kästchen ist nicht vorausgewählt und getrennt von der RGPD-Box.
- Der IP-Hash ist gesalzen und läuft nach 1 h ab.
- Bei der EZB werden keine Personendaten abgerufen.
- Die eingebettete Seite übergibt nur `origin + pathname`, keine Query-Parameter.

**Befunde:**

| Schweregrad | Befund | Beleg | Vorschlag |
| --- | --- | --- | --- |
| **kritisch vor Start** | **Courtier ohne Namen am Kästchen.** Die EDPB-Leitlinien 05/2020 zur Einwilligung (Rn. 65 ff., „informed“) verlangen die Identität jedes Verantwortlichen, der sich auf die Einwilligung stützt. Die Nennung nur in der Datenschutzerklärung ist schwächer. [Leitlinien-Inhalt aus meinem Wissen, Randnummer nicht am Original nachgelesen → **vermutet**] | `config.json` `courtierNomPublic: ""` | `courtierNomPublic: "atHome Finance"` setzen (fertiger Schalter, kein Code). |
| **kritisch vor Start** | **Datenschutzerklärung auf immobuild.lu noch nicht ergänzt.** Es fehlen: neue Daten (Budget, Einkommensspanne), atHome Finance als Empfänger, Resend/Cloudflare mit USA-Übermittlung und Aufbewahrungsfristen. `PRIVACY.md` selbst markiert das als „à compléter“. Die USA-Übermittlung ist dort nur per Verweis auf das Estimation-Tool behandelt. [geprüft: Dokument; Webseite nicht geprüft] | `PRIVACY.md` Teile 3–4 | Vor dem Start einpflegen. |
| klein | Rechtsgrundlage „Einwilligung“ für den Rückruf: Art. 6 (1) b (vorvertragliche Maßnahme auf Anfrage) wäre robuster, weil ein Widerruf dann nicht das ganze Verhältnis berührt. [vermutet] | `PRIVACY.md` Teil 2 | Mit Datenschutzberater klären. |
| klein | „Prévenez-moi“ ohne Datenbank: Die Daten liegen nur im Postfach. Das ist datensparsam, aber eine Frist ist nötig („à compléter“). | `PRIVACY.md` Teil 4 | z. B. 12 Monate, dann nachfragen. |

**`PRIVACY.md` gegen tatsächliches Verhalten [geprüft]:**

- **Stimmt:** Daten fließen nur beim Absenden, an Cloudflare (Function) und Resend (Mail). Gespeichert wird im Tool nichts außer dem IP-Hash.
- **Kleine Ungenauigkeit:** „Langue, page d’origine, date“ ist korrekt. Das Beispiel-E-Mail-Postfach ist aber `contact@immobuild.lu`, also kein dediziertes Postfach; wer darauf Zugriff hat, sieht die Finanzdaten.

### 3.5 Kundenerlebnis

**[geprüft]** im Browser:

- Gemeindesuche mit Aliassen funktioniert, maximal 3 Gemeinden, danach ist das Feld gesperrt mit Hinweis.
- « 60k » und « 600.000 € » werden korrekt gelesen. Außerdem: « 1,2 M » → 1 200 000, « 2,5 mio » → 2 500 000, « 600’000 » ✔. « 1.5 » → 1 (danach Fehlermeldung „Bereich“) ✔.
- Der Tippfehler-Vorschlag „gmial.com → gmail.com“ erscheint und lässt sich übernehmen.
- Bei Vermietung werden „premier achat“ und „Bëllegen“ ausgeblendet (`stepFields`, Test `api.test.ts:119`).
- Der Simulator reagiert sofort, auch per Pfeiltaste (Schritt 5 000 €).
- Kein horizontales Scrollen bei 320 px.

**Mehrwert gegenüber Bankrechnern/estimimmo.lu [vermutet]:**

- **Stärke:** Ehrlich gerechnete Nebenkosten mit Bëllegen Akt und CSSF-Eigenkapital, m² pro Gemeinde aus notariellen Daten und Verkaufserlös in einem Schritt. Das bieten Bankrechner meist nicht zusammen.
- **Schwäche:** Keine Kreditfähigkeit aus dem Einkommen (bewusst). Ein Erstkäufer mit 100 % CSSF sieht deshalb „apport suffisant“, obwohl sein Einkommen der eigentliche Engpass ist. Der Text sagt das („Vos revenus comptent aussi“), aber leise.
- **Einschränkung:** estimimmo.lu habe ich nicht geöffnet.

**Befunde:**

| Schweregrad | Befund | Vorschlag |
| --- | --- | --- |
| mittel | **Länge:** 5 Schritte, ~30 Felder. Das Budget kommt nach Schritt 3 (gut), Kontaktdaten erst in Schritt 5. Abbruchrisiko zwischen Vorschau und Schritt 5 [vermutet]. | Nach dem Start messen (concept.md Teil „Kennzahlen“); Schritt 4 eventuell in Schritt 5 integrieren. |
| klein | DE/EN: E-Mail-Vorschlag „Meinten Sie x **?**“ mit französischem Leerzeichen (hart im Code: `main.ts:556`). DE „Partner-Kreditvermittler“ ist korrekt, aber sperrig. Sonst haben alle 267 Schlüssel in 3 Sprachen Inhalt [geprüft]. | Leerzeichen sprachabhängig. |
| klein | „Écart avec l’apport déclaré“ meint Ersparnis + Verkaufserlös. Missverständlich, wenn ein Verkauf dabei ist. | „Écart avec l’apport total“. |

### 3.6 Qualität der Leads für Jason

**[geprüft]** E-Mail der Testanfrage (Terminal, Protokoll Teil 6):

- **Priorität und Vorgehen:** Priorität mit Begründung oben, nummerierte Liste „À dire au téléphone“ (7 Punkte).
- **Antwortadresse:** `Répondre à` ist die Besucheradresse.
- **Vollständigkeit:** Verkauf (Wert, Restschuld, Erlös), Courtier („OUI → atHome Finance“), Käufermandat, Simulator-Startwerte („au départ 600.000 €, modifié dans le simulateur“), Zinsherkunft („lu en direct à la BCE“) und der Gemeindezuschlag für Luxembourg kommen an.

**Befunde:**

| Schweregrad | Befund | Beleg | Vorschlag |
| --- | --- | --- | --- |
| klein | **Portugal (+351) falsch gruppiert:** `+351912345678` wird als „+35 191 234 5678“ angezeigt; die Vorwahl wirkt wie +35. Für Rückrufe relevant, da Portugiesen eine große Zielgruppe sind. [geprüft] | `email.ts:47`; Skript `edge.ts` | Ländervorwahl aus `PHONE_CODES` nehmen statt `\+\d{2}`. |
| klein | **„Chaud“ großzügig:** „dès que possible/3–6 mois“ + *irgendein* Grund reicht, z. B. nur „connaît son montant d’emprunt“ ohne Betrag. | `email.ts:57–69` | Nach 1–2 Monaten an echten Leads nachjustieren. |
| klein | **Es fehlt für den Rückruf:** bevorzugte Rückrufzeit; ob schon ein konkretes Objekt im Blick ist; bei Vermietung, ob Neubau (TVA-Frage). | – | Optional ein Feld „Meilleur moment pour vous appeler“. |

### 3.7 Barrierefreiheit (WCAG 2.1 AA)

**[geprüft]**

- **axe-core 4.14** (`wcag2a/aa`, `wcag21a/aa`), CSP im Testbrowser umgangen, 900 ms nach jeder Animation gemessen: **0 Verstöße** auf 8 Bildschirmen (Schritte 1–5 einschließlich Fehleranzeige, Vorschau, Simulator, Ergebnis) bei 390 px FR. Ebenso 0 bei 320 px DE und 1280 px EN (je 7 Bildschirme ohne Ergebnis).
- **Tastatur:** Tab erreicht jede Radiogruppe und den Button, Fokusrahmen 3 px navy (`styles.css:115, 141`). Die Simulator-Regler lassen sich per Pfeiltaste bedienen, mit `aria-valuetext` in Euro („580.000 €“).
- **Fehler:** Feldfehler erscheinen mit `aria-invalid` und `aria-describedby` und werden fokussiert bzw. eingescrollt.
- **reduced-motion:** Mit `prefers-reduced-motion: reduce` gibt es keine Kartenanimation (`animationName: none`).

**Nicht geprüft:** echter Screenreader (VoiceOver/NVDA), Zoom 200 %, Windows-Kontrastmodus.

### 3.8 Design und Marke

**[geprüft]**

- **Farben:** Navy `#0A2342`, Gold `#C5A46D`, Off-White und Beige sind als Variablen gesetzt (`styles.css:5`). Gold als Text erscheint nur auf Navy (`.kicker`, `.hero-label` liegen in `.intro`/`.result-hero` mit Navy-Hintergrund); sonst nur als Akzent (Rahmen, Symbole, Schieberegler-Schatten).
- **Schriften:** Poppins 600 und Montserrat 400/600 sind lokal als woff2 im Build, ohne Google-Aufruf.
- **Layout:** Kein Überlauf bei 320/390/1280 px, nichts abgeschnitten. Screenshots: `docs/revue/320-de-coordonnees.png`, `390-fr-apercu.png`, `390-fr-resultat.png`, `1280-en-recherche.png`.

**Nicht geprüft:** Vergleich mit dem Live-Auftritt von estimatioun.lu. Der Code teilt CSS-Basis und Icons 1:1 mit dem Estimation-Tool, daher ist ein einheitliches Bild wahrscheinlich [vermutet].

### 3.9 Stabilität und Leistung

**[geprüft]**

- **Build:** JS 83,8 kB (29,8 kB gzip), CSS 46,8 kB (9,7 kB gzip), 3 Schriften 45 kB, DE/EN je ~6 kB gzip nachgeladen.
- **Testanfrage:** Antwort nach 125 ms lokal (Server 24 ms).
- **Doppelklick** auf „Absenden“ erzeugt **eine** Anfrage (`main.ts:568`, Terminal zeigt 1 POST).
- **Ausfälle im Code:**
  - Resend: Timeout 10 s, Fehler → 502, Limit wird zurückgegeben (`handler.ts:130–133`).
  - EZB: Timeout 6 s → Ersatzwert.
  - Netzfehler im Browser → Meldung `errors.network`.
  - Unit-Tests decken „Resend en panne“ und „BCE en panne“ ab.
- **Safari:** Ein Fallback für `AbortSignal.timeout` (Safari < 16) ist vorhanden (`main.ts:20`); Build-Ziel `safari15`.

**Befunde:**

| Schweregrad | Befund | Vorschlag |
| --- | --- | --- |
| klein | Timeout im Browser 20 s, auf dem Server bis zu 6 s (EZB) + 10 s (Resend). Bei sehr langsamem Resend kann die Mail rausgehen, während der Browser schon „Netzfehler“ zeigt. Ein erneuter Versuch erzeugt dann einen **doppelten Lead**. [vermutet, selten] | Hinnehmen; ggf. Hinweis „Vérifiez vos e-mails avant de réessayer“. |
| – | **Nicht getestet:** Safari/iOS, Firefox, Lighthouse (nicht installiert, kein Online-Ziel), echtes Verhalten bei Resend-Ausfall und EZB-Timeout aus Cloudflare. | Nach dem Start prüfen (Teil 5). |

### 3.10 Einbettung

**[geprüft lokal]** `demo.html` mit `embed.js` (390 px):

- Das iframe wird erzeugt, die Höhe per postMessage auf 1 661 px gesetzt und nach Anzeige von Fehlern auf 1 858 px angepasst.
- `data-ok=1` wird gesetzt, keine JS-Fehler.
- `embed.js` prüft `e.origin === base`, `source === 'immobuild-acheteur'` und `e.source === contentWindow` (`embed.js:115–119`).
- Der Ersatzlink erscheint nach 15 s ohne Nachricht.
- Andere Kennungen als beim Estimation-Tool (`data-immobuild-acheteur`, `window.ImmoBuildAcheteur`, eigene Nachrichtenquelle) → **kein Konflikt** bei beiden Tools auf einer Seite. [vermutet: per Code, nicht zusammen getestet]
- postMessage aus dem iframe geht mit `'*'`. Der Inhalt ist aber nur Höhe/Scrollen, keine Personendaten [geprüft].

| Schweregrad | Befund | Vorschlag |
| --- | --- | --- |
| mittel | **WordPress/Elementor nicht getestet**, ebenso `frame-ancestors` gegen die echte Domain. Falls die Seite z. B. `www.immobuild.lu` nutzt: Die Domain ist von `https://*.immobuild.lu` gedeckt ✔. Eine andere Domain (neuer Next.js-Auftritt) muss in `_headers` eingetragen werden. | Erste Testseite vor dem öffentlichen Link. |
| klein | **Keine Next.js-Komponente** wie `estimation-widget/integration/EstimationWidget.tsx`. `data-manual` + `ImmoBuildAcheteur.mount()` ist vorhanden, die Komponente fehlt. | Komponente kopieren und anpassen (~30 min), wenn der Next.js-Auftritt kommt. |

### 3.11 Wartbarkeit

**[geprüft]**

- Code klar, mit deutschen/französischen Kommentaren zum *Warum*.
- `tsc --noEmit` ohne Fehler, 80 Tests in 0,5 s.
- `scripts/update-taux.ts` bricht bei unplausiblen Werten oder Sprüngen über 1 Punkt ab, sinnvoll.
- README für Nicht-Entwickler gut lesbar (Tabellen, „À faire par toi“).

| Schweregrad | Befund | Beleg | Vorschlag |
| --- | --- | --- | --- |
| mittel | **Doppelter Code:** `ratelimit.ts`, `aliases.ts`, `communes.ts`, `combobox.ts`, `html.ts`, `icons.ts`, `fonts.css` sind **identisch** im Estimation-Tool. Selbst der Standard-Salt heißt `'immobuild-estimation'`. Eine Sicherheitskorrektur muss zweimal gemacht werden. | `diff` → 0 Abweichungen | Gemeinsamer Ordner `shared/` oder npm-Workspace; mindestens eine Liste „Dateien, die doppelt existieren“ in beiden READMEs. |
| klein | `styles.css` (735 Zeilen) enthält tote Regeln aus dem Estimation-Tool (`.energy-*`, `.rate-*`). | `styles.css:217, 230, 244` | Aufräumen. |
| klein | `npm run sync-data` kopiert blind aus `../estimation-widget/data/`. Ohne `npm run update-data` dort bleibt alles alt, und es gibt keine Prüfung der Periode. | `package.json` | Nach dem Kopieren Periode anzeigen; Test auf Alter (> 9 Monate → Warnung). |
| klein | **Testlücken:** kein automatischer Browser-Test (die README nennt manuelle Prüfungen), kein Test für `embed.js`, für `formatPhone` mit +351 oder für negativen Verkaufserlös. | `tests/` | Diese drei Fälle ergänzen. |

### 3.12 Lokaler Betrieb

**[geprüft]** mit `wrangler pages dev dist --port 8788`, `EMAIL_MODE=log`:

| Anfrage | Ergebnis | E-Mail im Terminal? |
| --- | --- | --- |
| `GET /api/budget` | 405 `method` | nein |
| POST, `Content-Type: text/plain` | 415 | nein |
| POST ohne Origin | 403 `origin` | nein |
| POST mit `Origin: https://evil.example` | 403 | nein |
| kaputtes JSON | 400 `json` | nein |
| `{}` | 400 `validation` | nein |
| 30 kB Körper | 413 `too_large` | nein |
| Honeypot gefüllt | 400 `rejected` | nein |
| ungültige Daten | 400 mit Feldliste | nein |
| `GET /api/taux` | 200, `{"variable":3.13,"fixe":4.03,"mois":"2026-09","origine":"bce"}` (live EZB) | – |
| `POST /api/taux` | 405 | – |
| **vollständige Anfrage über die Oberfläche** (18.11.2026, 21:29:34 UTC = 22:29 Luxemburg) | Ergebnis nach **125 ms**, POST 200 in 24 ms | **ja, genau eine** (vollständig, siehe 3.6) |

**Erst nach dem Online-Stellen prüfbar:**
- echter Resend-Versand und Zustellung (Spam-Ordner)
- Antwort an den Besucher über `reply_to`
- KV-Limit über mehrere Instanzen
- EZB-Abruf und Cache aus Cloudflare
- `frame-ancestors` auf immobuild.lu und Elementor
- `cf-connecting-ip`
- HSTS
- Safari/iPhone
- Lighthouse mobil
- Kontingent bei gemeinsamer Nutzung mit dem Estimation-Tool

---

## 4. Die 5 wichtigsten Verbesserungen (Nutzen ÷ Aufwand)

| # | Maßnahme | Nutzen | Aufwand |
| --- | --- | --- | --- |
| 1 | `config.json` → `courtierNomPublic: "atHome Finance"` und Datenschutzerklärung auf immobuild.lu ergänzen (Budget, Einkommensspanne, atHome Finance, Resend/Cloudflare, Fristen) | entschärft das größte Rechtsrisiko | 5 min + ~1 h Text |
| 2 | KV-Namespace `RATE_LIMIT` anlegen und binden; Abschnitt in die README | Schutz vor Spam und Resend-Kontingent | 15 min |
| 3 | Anwaltsfrage zur Vergütung/« gratuitement » (eine Mail, Texte aus concept.md Teil 10 nutzen) | Rechtssicherheit für das Courtier-Modell | 30 min für Jason (Anwaltskosten nicht geschätzt) |
| 4 | Negativen Verkaufserlös anzeigen + `formatPhone` für +351/+3xx korrigieren + Tests | verhindert zu optimistisches Budget und falsche Rückrufnummer | ~1–2 h |
| 5 | Test-Livegang auf einer versteckten Seite von immobuild.lu: Resend, `reply_to`, KV, EZB aus Cloudflare, Safari/iPhone, Elementor | schließt alle „nicht getestet“-Punkte | ~2 h |

Danach, bei Bedarf: gemeinsamen Code mit dem Estimation-Tool zusammenführen (½–1 Tag), Next.js-Komponente (30 min).

---

## 5. Nicht getestet

- **Safari/iOS, Firefox, Edge:** nur Chromium (Playwright) verfügbar.
- **Echter Screenreader, 200 % Zoom:** kein NVDA/VoiceOver in der Umgebung.
- **Lighthouse mobil:** nicht installiert, kein Online-Ziel; nur Bundle-Größen gemessen.
- **Echter E-Mail-Versand (Resend), Zustellung, `reply_to`:** `EMAIL_MODE=log`, kein API-Schlüssel, Auftrag „nichts verschicken“.
- **Cloudflare-Betrieb** (KV, Cache-API auf pages.dev, EZB-Abruf aus Cloudflare, `cf-connecting-ip`): nicht online.
- **WordPress/Elementor, beide Tools auf einer Seite:** keine WordPress-Instanz; Konfliktfreiheit nur aus dem Code abgeleitet.
- **Live-Vergleich mit estimatioun.lu und estimimmo.lu:** nicht geöffnet.
- **Rechtliche Würdigung** (Vergütung Courtier, DSGVO-Einwilligung ohne Namen, Lauterkeitsrecht): Wortlaut gelesen, keine Rechtsberatung.
- **Barème-Tabellen:** auf notariat.lu nur als Bild vorhanden, per OCR gelesen; ein Gegenlesen am Bild ist empfehlenswert.
- **Befreiungen beim Kreditakt (0,24 %/0,05 %):** pfi nennt Befreiungen nur allgemein, nicht konkret gefunden. Das Tool rechnet daher eher zu hoch (vorsichtig).

---

## 6. Protokoll (18.11.2026, Zeiten UTC)

| Zeit | Befehl | Ergebnis |
| --- | --- | --- |
| 21:26 | `git checkout -B claude/rapport-acheteur origin/claude/acheteur-concept` | Branch angelegt (Basis `eac38bd`) |
| 21:26 | `npm ci` | OK |
| 21:27 | `npm test` | **5 Dateien, 80/80 Tests bestanden**, 534 ms |
| 21:27 | `npm run typecheck` | 0 Fehler |
| 21:27 | `npm run build` | OK, 93 ms; JS 83,83 kB (29,76 kB gzip), CSS 46,79 kB |
| 21:27 | `npm audit` | 1 high (`xlsx`, ReDoS, kein Fix; im Tool nicht genutzt) |
| 21:27 | `grep -E "atHome\|acheteurs@\|rateLimitPerHour" dist/assets/*.js` | kein Treffer |
| 21:28 | `cp .dev.vars.example .dev.vars && wrangler pages dev dist --port 8788` | läuft (`EMAIL_MODE=log`) |
| 21:28 | 11 `curl`-Anfragen (Tabelle 3.12) | 405/415/403/403/400/400/413/400/400/200/405; **keine E-Mail** im Terminal |
| 21:29:34 | Playwright, voller Ablauf 390 px FR, Doppelklick auf Absenden | Ergebnis nach 125 ms, 1 POST, 1 E-Mail im Terminal, 0 JS-Fehler |
| 21:29–21:31 | axe-core 4.14 (CSP umgangen, nach Animation) | 0 Verstöße: 390 px FR (8 Bildschirme), 320 px DE (7), 1280 px EN (7); kein horizontaler Überlauf |
| 21:32 | Tastaturtest (Tab, Pfeiltasten am Regler, reduced-motion) | Fokus sichtbar, Regler 600 000 → 580 000 €, keine Animation |
| 21:33 | `npx tsx edge.ts` (Randfälle, `parseMoney`, `normalizePhone`, `formatPhone`, Gemeindedaten) | siehe 3.1, 3.5, 3.6 |
| 21:35 | `diff` gegen `estimation-widget/` | 7 Dateien identisch |
| 21:40 | Playwright `demo.html` | iframe-Höhe 1 661 → 1 858 px, `data-ok=1`, 0 Fehler |
| 21:30–21:40 | Faktenprüfung (guichet, pfi, legilux, chd, cssf, notariat, data.public.lu, ECB Data Portal, mamer.lu) über firecrawl; direkte Abrufe von guichet/chd/EZB-API waren aus der Umgebung gesperrt | Quellen in Teil 3.1, 3.2 |

Testskripte (nicht im Repository): Playwright-Ablauf `flow.cjs`, Tastatur `kb.cjs`, Einbettung `demo.cjs`, Randfälle `edge.ts`.
