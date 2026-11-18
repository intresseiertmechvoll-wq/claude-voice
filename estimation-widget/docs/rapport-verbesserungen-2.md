# Zweite Verbesserungsrunde für « Estimation gratuite »

18. November 2026 · Ausgangspunkt `58a9d66` · Arbeitsbranch `codex/verbesserungen-2`

Die größte Hürde war der späte Wechsel von einer Zahl zur Kontaktanfrage. Wer früh erfährt, welche Schätzung zu erwarten ist und wofür Jason die Angaben erhält, kann bewusst entscheiden, ob er weitermacht. Der zweite klare Gewinn ist ein speicherbarer Ausdruck mit Datum, Spanne, Vorbehalt und direktem Kontakt. Eine höhere Abschlussquote bleibt eine Hypothese.

## 1. Fünf Persona-Protokolle

Fiktive Durchläufe in lokalem Chromium, je bei 390 und 1280 px. Die vier lokalsprachigen Fälle liefen mobil auf FR und am Desktop auf DE. Der Expat lief auf EN auf beiden Geräten und erreichte EN im Nachtest mobil über den französischen Einstieg. „Vermutet“ kennzeichnet die Rollenperspektive. Darin stecken keine Beobachtungen realer Kunden.

| Persona | Geprüft | Vermutetes Zögern oder Abbruchrisiko | Vertrauenssignal oder nächster Schritt |
|---|---|---|---|
| Rentnerin aus Dudelange, verkauft ein Haus | Schnellwahl Dudelange, 145 m², Ergebnis mit Hinweis auf Inserate und Anruf-Option. Mobiler Test mit zu kurzer Nummer. | Fläche, Grundstück und die vielen Zustandsfragen können ermüden. Eine unklare Reaktion auf den ersten Klick bei falscher Nummer lässt das Formular kaputt wirken. | Fehler springt jetzt zur Nummer. Für Rückfragen ist Jason mit dem Anrufbutton erreichbar. Die Zahl lässt sich für ein Familiengespräch ausdrucken. |
| Englischsprachiger Expat, neugierig auf den Wohnungswert in Luxemburg-Stadt | Suche nach « Kirchberg » führt zu « Luxembourg ». Vorher kein Sprachlink im Einstieg. Kontaktwerte ohne ausgelöstes Eingabeereignis wurden als leer behandelt. | Wer nur neugierig ist, kann bei der Pflichtnummer oder der absehbaren Kontaktaufnahme aussteigen. | Sprachauswahl und Zweck stehen am Anfang. Der Datennachweis und die Spanne geben Orientierung. Das Tool bleibt eine Anfrage, wenn man das Ergebnis sehen möchte. |
| Erbengemeinschaft mit Haus in Esch | Alle sechs Bauteile und die Energieklasse akzeptieren « ? ». Ein leeres Baujahr stoppt Schritt 2. Der Durchlauf ging mit einer fiktiven ungefähren Jahreszahl weiter. | Bei ganz unbekanntem Baujahr, Grundstück oder Wohnfläche kann die Gruppe ohne Unterlagen aufgeben. | Eine ungefähre Jahreszahl ist jetzt direkt am Feld als solche erklärt. Die Teilbarkeit als PDF hilft, das Ergebnis gemeinsam anzusehen. |
| Investor mit vermieteter Wohnung und drei Garagen in Mersch | Garagen bleiben nach « Zurück » und « Weiter » erhalten. « Vermieten » bleibt gesetzt. Der Faktor für drei Garagen erscheint im Ergebnis. Zwei synchrone Submit-Ereignisse erzeugen genau einen Request. | Der Investor kann eine Monatsmiete erwarten. Ein unbeschrifteter Marktwert beantwortet dann die falsche Frage. | Vor der Wahl steht jetzt der Hinweis, dass die Ausgabe den Verkaufspreis schätzt. Die Extras sind einzeln nachvollziehbar. |
| Eigentümer in Tandel | Auswahl löst den Datenhinweis aus. Die Wohnung führt nach der Kontaktanfrage zu einer Bestätigung ohne Eurobetrag. | Sechs Schritte für eine Rückrufbitte sind möglicherweise zu viel. « Wenig Daten » kann trotzdem wie eine weniger genaue Zahl klingen. | Die Auswahl sagt jetzt ausdrücklich, dass online kein Preis erscheint. Der Kontaktschritt nennt die persönliche Bewertung als Zweck. |

## 2. Umgesetzt und belegt

| Thema | Änderung und Nutzen | Vorher und nachher |
|---|---|---|
| Einstieg und Kontaktdaten | FR, DE und EN sind am Einstieg sichtbar. Dort steht bereits, dass Jason vor der Anzeige der Verkaufspreisspanne um Kontaktdaten für das jeweilige Objekt bittet. Über den Feldern wird erklärt, dass Angaben und Kontaktdaten per E-Mail an ImmoBuild Kohn gehen. Datenschutzhinweis und Einwilligung bleiben an der Absendestelle. | [Einstieg und Kontakt](verbesserungen-2/einstieg-kontakt.jpg) |
| Fläche, Baujahr und Tandel | Unter der Wohnfläche steht eine aufklappbare, fachlich passende Erklärung. Das Baujahr darf ungefähr angegeben werden. Bei Tandel wird die frühere Formulierung « wenig Daten » zu einer eindeutigen Ansage, dass online kein Preis erscheint. | [Baujahr, Tandel und Flächenhinweis](verbesserungen-2/flaeche-tandel.jpg) |
| Projekt und Formularfehler | Der Verkaufspreis wird bei der Projektauswahl von einer Mieteinschätzung unterschieden. Die Kontaktfelder werden beim Absenden und vor der Rücknavigation vom sichtbaren Formular gelesen. Freitextfehler erscheinen beim Absenden, damit sie die Schaltfläche nicht zwischen Tippen und Klick verschieben. Vorhandene Fehler verschwinden bei Korrektur. Die bestehenden Eingabemodi und Autofill-Tokens bleiben nutzbar. | [Projektauswahl](verbesserungen-2/flaeche-tandel.jpg). Autofill und Fehler sind im Prüfprotokoll belegt. |
| Ergebnis und PDF | « Bewertung vor Ort anfragen » kündigt die Kontaktseite passender an als eine direkte Terminbuchung. Der Anruf bleibt daneben. « Drucken oder als PDF speichern » ist direkt bei den Kontaktoptionen erreichbar. Der A4-Ausdruck enthält Bewertungsdatum, Betrag, Spanne, Quelle und Zeitraum, Vorbehalt, Wertfaktoren und Jasons Kontakt. Der Ausdruck enthält keine eingegebenen Kontaktdaten. Der Druckaufruf klappt die Berechnung im Web nicht mehr auf. | [Ergebnis und PDF](verbesserungen-2/ergebnis-pdf.jpg) |

### Was bei den Wissenshäppchen hilft

**Geprüft:** Die bisherigen Hinweise waren eingeklappt unter « Weiter ». Den Hinweis zur Wohnfläche kann man jetzt dort öffnen, wo die Frage entsteht. Seine Aussage: Zur Wohnfläche zählen unter anderem Wohnräume, Bad und WC sowie innere Verkehrsflächen wie Flure. Der Wortlaut beschreibt die Flächenarten und gibt keine vollständige Messanleitung vor. Tastaturbedienung wurde lokal geprüft. [Guichet.lu und ILNAS, Berechnung der Wohnfläche, abgerufen am 18.11.2026](https://guichet.public.lu/fr/citoyens/logement/construction-renovation-transformation/surface-habitable/calcul-surface-habitable.html)

**Vermutet:** Ein konkreter Titel am Feld hilft der Rentnerin und der Erbengemeinschaft eher als ein Finanzierungstipp nach den Eingaben. Die übrigen drei Hinweise sind optional geblieben. Ob Besucher sie tatsächlich öffnen, wurde nicht mit realem Verkehr gemessen.

## 3. Offene Vorschläge nach Nutzen und Aufwand

| Rang | Vorschlag | Nutzen / Aufwand |
|---:|---|---|
| 1 | Für Tandel schon beim ersten Hinweis eine kurze persönliche Anfrage oder einen direkten Anruf anbieten. Jason entscheidet, welche Angaben er dafür braucht. | Hoch / mittel. Spart eine Strecke ohne Online-Preis. |
| 2 | Für Erben bei Baujahr und Grundstück eine fachlich saubere Möglichkeit « unbekannt » prüfen. Kurz erklären, was dann mit dem Ergebnis passiert. | Hoch / mittel. Braucht Abstimmung mit Validierung und Preismodell. |
| 3 | Den Text auf der verlinkten Datenschutzerklärung gegen den konkreten Versand und die Simulator-Zusammenfassung prüfen. Der Formulartext erklärt heute Zweck und Empfänger. Angaben zu Dienstleistern oder Aufbewahrung gehören in die Erklärung. | Hoch / gering bis mittel. Abstimmung mit dem Verantwortlichen. |
| 4 | Im Kontaktkanal die Rückrufpräferenz ermöglichen, etwa Tageszeit oder « lieber per E-Mail ». Für einen Termin mit freier Auswahl wäre zuerst der tatsächliche Buchungsablauf zu klären. | Mittel / mittel. Jason entscheidet, was er verlässlich bedienen kann. |
| 5 | Einen späteren Wiederaufruf per Link nur dann ergänzen, wenn Nutzer das neben dem PDF wirklich brauchen. | Mittel / hoch. Braucht eine Lösung für Ablaufdatum und Datenhaltung. |

## 4. Geprüft und nicht getestet

### Geprüft

- `npm ci`, `npm test` (**65/65**), `npx tsc --noEmit` und `npm run build` erfolgreich. Zwei bestehende Textprüfungen prüfen die aktualisierten Hinweise zum Versandzweck und die neue Bezeichnung für die Vor-Ort-Anfrage. Die Aussage zu Quelle, Zeitraum und unverbindlicher Schätzung bleibt für den Preis erhalten.
- Die zehn Persona-Durchläufe liefen jeweils vor und nach der Änderung über die echte lokale Pages Function mit `EMAIL_MODE=log`. Die Schutzfelder und Einwilligung wurden weiterhin geprüft. Das Standardkommando für Wrangler stieß bei der Abfrage der Netzwerkschnittstellen auf einen Umgebungsfehler. Die Ausführung auf Port 8788 verwendete denselben Wrangler mit einer temporären Node-Vorladung.
- Mobil bei ungültiger Eingabe `123`: Vorher wurde bei der Rentnerin zwar der Telefonfehler eingefügt, der erste Klick erreichte aber die Formularprüfung nicht und der Fokus blieb nicht am Feld. Nachher zeigte derselbe Klick die Fehlermeldung, setzte den Fokus auf `#numero` und erlaubte nach Korrektur das Weitergehen. E-Mail und Nummer haben weiterhin `inputmode="email"` bzw. `"tel"` sowie `autocomplete="email"` bzw. `"tel-national"`. Namensfelder besitzen ihre Autofill-Tokens.
- Simuliertes Autofill ohne Input- und Change-Ereignis: Vorher null Requests und Pflichtfeldfehler trotz gefüllter Felder. Nachher ein gültiger Request. Der Investor konnte aus Schritt 5 zu den drei Garagen zurück und erneut vor. Der Doppelklicktest schickte zwei synchrone Formularereignisse und erzeugte genau einen Request.
- Slow 4G für den englischen Mobilfall, CPU ohne Drosselung, Browsercache deaktiviert. Vergleichswerte des DevTools-Profils per CDP: 180.000 B/s abwärts, 84.375 B/s aufwärts und 562,5 ms Emulationslatenz. Der direkte EN-Einstieg war vorher nach 2,4 s bedienbar. Nachher dauerte der Wechsel vom französischen Einstieg ins Englische 2,3 s ab Klick bzw. 4,5 s ab Start der ersten Seite. Der normale Sendeablauf bis zum Resultat dauerte in den lokalen Proben rund 5,8–5,9 s. Das sind Einzelmessungen. [Chromium DevTools, Slow4GConditions](https://chromium.googlesource.com/devtools/devtools-frontend/+/HEAD/front_end/core/sdk/NetworkManager.ts)
- A4 ohne Browser-Kopfzeilen und Hintergrunddruck: Für Dudelange und Mersch jeweils **2 → 1 Seite**. Die neuen PDFs enthalten den Hauptwert, die Spanne, den Vorbehalt und Jasons Kontakt. Der Browser kann die PDF-Datei speichern und teilen. Ein erneutes Öffnen der Website führt wieder zum Formular, da das Ergebnis keinen dauerhaften Link erhält.
- `node scripts/screenshots.mjs` meldete **0 axe-Verstöße**. Die Zusatzprüfung über die Persona-Zustände und den geöffneten Flächenhinweis meldete ebenfalls 0. `npx playwright install chromium` scheiterte am heruntergeladenen Archiv. Beide Prüfungen liefen mit separat installiertem Headless Chromium 153. Den Hinweis habe ich mit Enter geöffnet und mit Leertaste geschlossen.
- Summe der gzip-komprimierten JS-, CSS- und HTML-Dateien in `dist`: **54.929 → 56.260 Byte**, also **+1.331 Byte**. Jasons freigegebene Sprechblasen sind unverändert. Die geschützten Berechnungs-, Daten-, Server- und Maildateien unterscheiden sich nicht vom Ausgangspunkt.

### Nicht getestet

- Reale Abschlussquote, tatsächliche Nutzung der Wissenshäppchen und Feedback von Kunden. Die Persona-Notizen sind Hypothesen über Verhalten.
- Native Bildschirmtastatur, native Passwortmanager und tatsächliches Autofill aus einem Gerätedatensatz. Getestet wurden Formularattribute und simulierte Werte ohne Eingabeereignis.
- Safari, Firefox, Screenreader und Drucken auf einem physischen Drucker. Das PDF wurde lokal in Chromium erzeugt. Die Funktionsdauer der Live-Dienste war nicht Gegenstand dieser Runde.
- Tatsächliche Kontaktaufnahme und Versand. Alle Formular-Requests gingen ausschließlich an localhost.
