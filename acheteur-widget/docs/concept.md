# Käufer-Tool ImmoBuild Kohn: Konzept (noch kein Code)

Stand: 18.11.2026 · Branch `claude/acheteur-concept` · Status: **Erste Version gebaut (18.11.2026), siehe Teil 11 und `acheteur-widget/README.md`.**

Legende für alle Fakten:
- **[geprüft]**: Seite oder Datei selbst geöffnet; URL und Seitendatum stehen dabei.
- **[Snippet]**: nur aus einem Suchergebnis, nicht auf der Seite selbst geprüft.
- **[Vermutung]**: meine Einschätzung, nicht belegt.

Alle Abrufe erfolgten am 18.11.2026. Keine Rechtsberatung.

---

## 0. Kurzfassung

- **Empfehlung für die erste Version:** Option A in einer schmalen Form, Arbeitstitel **« Mon budget d'achat »**. Ablauf: 4 Schritte, dann Ergebnis.
  - Der Käufer sieht seinen **Gesamtbedarf** (Preis + 7 % Gebühren − Bëllegen Akt + Nebenkosten) und das **nötige Eigenkapital nach CSSF-Regel**.
  - Er sieht außerdem, **wie viele m² er sich in seinen Wunschgemeinden leisten kann**.
  - Ich bekomme sein Suchprofil, und wenn es zutrifft, den Hinweis „muss erst verkaufen“.
- **Kein Preis-Check als eigenes Tool in der ersten Version.**
  - Es gibt ihn schon kostenlos: estimimmo.lu bietet das Budget in m² pro Gemeinde. Den Preis-Check dort hat nur der Recherche-Agent gesehen, ich habe ihn nicht selbst bestätigt.
  - Die öffentlichen Daten tragen nur eine grobe Aussage, und das auch nur für Bestandswohnungen.
  - Das Recht bei Aussagen über fremde Anzeigen ist ungeklärt.
- **Kein Kreditrechner im engeren Sinn:** keine Kreditempfehlung, kein Produkt, keine Bank-Provision. Das ist die rechtlich sichere Seite (Teil 2.3).
- **Ehrlich zum Lead-Wert:** Ein Käufer-Lead ist für dich wahrscheinlich weniger wert als ein Verkäufer-Lead, außer wenn der Käufer **erst verkaufen muss**. Genau diesen Fall soll das Tool erkennen und an estimatioun.lu weiterleiten **[Vermutung, hängt von deinem Provisionsmodell ab, Frage 1]**.

---

## 1. Was vom Estimation-Tool wiederverwendbar ist

Gelesen in `estimation-widget/`: README, PRIVACY, params.json, config.json, `src/shared/*`, `src/ui/*`, `data/communes.json`. Nichts wurde verändert.

| Baustein | Datei(en) | Wiederverwendung im Käufer-Tool |
| --- | --- | --- |
| Hosting, Einbettung | Cloudflare Pages + Functions, `public/embed.js`, `public/_headers` (frame-ancestors immobuild.lu) | **1:1.** Gleiches Muster: iframe, eine Zeile in Elementor. |
| Gemeindesuche | `src/ui/combobox.ts`, `src/shared/aliases.ts`, `src/shared/communes.ts`, `data/cantons.json` | **1:1.** Tolerant gegenüber Akzenten, kennt deutsche und luxemburgische Namen und Stadtviertel. Für Käufer **Mehrfachauswahl** (bis zu 3 Gemeinden) nötig: kleine Erweiterung. |
| Gemeindedaten | `data/communes.json` + `scripts/update-data.ts` (Observatoire, CC0, Periode 07/2025–06/2026) | **Ja.** Enthält pro Gemeinde notarielle €/m² für Bestandswohnungen (mit Spanne 5–95 %), VEFA, Angebotspreise für Wohnungen und Häuser sowie Zahl der Verkäufe und Angebote. Genau das braucht „Budget in m²“. Das quartalsweise Update gilt dann für beide Tools. |
| Preislogik | `src/shared/engine.ts` (`cantonNotarialMedian`, `cantonDecote`, Fallback auf den Kanton) | **Teilweise.** Die Abschläge vom Angebots- zum Verkaufspreis pro Kanton und der Kantons-Median bei fehlenden Daten sind direkt nutzbar. Die Formel für den Objektwert wird nicht gebraucht. |
| Validierung, Kontakt | `src/shared/validation.ts` (Telefon, E-Mail-Tippfehler, Zahleneingabe „1 200“) | **1:1** für den Kontaktschritt. |
| Lead-E-Mail | `src/shared/email.ts` (Priorität chaud/tiède/froid), Resend, `src/server/handler.ts` (Resultat erst nach erfolgreichem Versand) | **Muster 1:1**, Inhalt neu (Teil 5.3). |
| Sicherheit | Honeypot, Origin-Pflicht, Rate-Limit mit IP-Hash in KV, HSTS, keine Cookies | **1:1.** |
| Design | `src/styles.css`, `src/fonts.css`, `src/ui/icons.ts`, Coach-Blase mit Jasons Foto, Fortschrittsbalken, Rekapitulation | **1:1.** Gleiche Marke, gleiches Gefühl. |
| i18n | `src/i18n/{fr,de,en}.json` | **Muster 1:1**, neue Texte. |
| Simulator „Et si… ?“ | `src/ui/whatif.ts`, `src/server/simulate.ts`, signierte Tickets | **Idee übertragbar:** „Et si j'apporte 20 000 € de plus ? Et si j'achète à deux ?“ Das ist für die erste Version **optional**. |
| Analyse-Bildschirm | `src/ui/analysis.ts` | Optional. Für einen Budgetrechner wirkt eine Wartezeit eher künstlich **[Vermutung]**. Mein Vorschlag: weglassen oder sehr kurz halten. |
| Datenschutztexte | `PRIVACY.md`, `docs/texte-politique-confidentialite.md` | Vorlage. **Neu:** Angaben zu Einkommen und Eigenkapital (Teil 2.4). |

**Technische Empfehlung:** ein eigener Ordner `acheteur-widget/`, mit gemeinsamen Teilen. Am einfachsten werden die Dateien zunächst kopiert und später in ein gemeinsames Paket ausgelagert. So bleibt `estimation-widget/` unberührt. **Nicht entschieden:** Kopieren ist schneller, erzeugt aber doppelte Pflege bei Datenupdates.

---

## 2. Recherche

### 2.1 Was Käufer in Luxemburg brauchen

**Kaufnebenkosten**
- **[geprüft]** Registrierungs- und Transkriptionsgebühren: 6 % + 1 % = **7 %**. Quelle: guichet.public.lu, „Crédit d'impôt sur les actes notariés“, Seite vom 07.07.2025: https://guichet.public.lu/fr/citoyens/logement/aides/aides-indirectes-avantages-fiscaux/credit-impot-actes-notaries.html
- **[geprüft]** Die befristete Halbierung der Bemessungsgrundlage ist ausgelaufen. Voraussetzung waren Akten bis 30.09.2025. Quelle: guichet.public.lu, Meldung vom 04.06.2025.
- **[Snippet]** Notarhonorar: gesetzlicher, degressiver Tarif (RGD vom 24.07.1971). Konkrete Sätze sind **nicht geprüft**.
- **[nicht geprüft]** Kosten der Hypothekeneintragung: In Sekundärquellen stehen etwa 0,24–0,30 % des Darlehens plus Honorar. **Im Tool nicht als Zahl verwenden**, bis ein Notar sie bestätigt (Frage 8).

**Bëllegen Akt**
- **[geprüft] In Kraft:** **40 000 € pro Person**, Paar 80 000 €. Bedingung: selbst bewohnen innerhalb von 2 Jahren, mindestens 2 Jahre lang. Sonst muss alles zurückgezahlt werden. Gleiche guichet-Seite (07.07.2025).
- **[geprüft] Angekündigt:** **45 000 €** für Akten ab 16.07.2026, rückwirkend. Quelle: Regierungsmitteilung vom 16.07.2026, https://gouvernement.lu/fr/actualites/toutes_actualites/communiques/2026/07-juillet/16-meisch-roth-booster-wunnengsbau2.html
- **[geprüft]** Gesetzentwurf **PL 8806**: Stand „En commission“, letzter Eintrag am 13.10.2026, **noch nicht verabschiedet**. Quelle: https://www.chd.lu/fr/dossier/8806
- **Folge für das Tool:** mit 40 000 € rechnen und einen Hinweis zeigen: « 45 000 € annoncés, loi pas encore votée ». Der Wert gehört in `params.json` und lässt sich mit einer Zeile ändern.

**Weitere Hilfen (guichet.public.lu)**
- **[geprüft]** **Prime d'accession:** 500–10 000 €, abhängig vom Einkommen, +40 % für Wohnung oder Reihenhaus. Seite vom 18.02.2026.
- **[geprüft]** **Prime d'épargne:** bis 5 000 € pro Person. Seite vom 19.02.2026.
- **[geprüft]** **Subvention d'intérêt:** 0,25–3,50 % auf höchstens 200 000 €, +20 000 € pro Kind. Seite vom 19.02.2026.
  - Angekündigte Erhöhung: 250 000 € + 30 000 € pro Kind. **Ob sie schon in Kraft ist, ist unsicher.**
- **[geprüft]** **Garantie de l'État:** bis 40 % der Kosten, Einkommensgrenze 101 874 € bzw. 141 049 €. Seite vom 17.02.2026.
- **Folge für das Tool:** Diese Hilfen hängen von Einkommen und Haushalt ab und ändern sich gerade. **Keine Beträge berechnen.** Nur zeigen: « Vous pourriez avoir droit à… », mit Link auf guichet.public.lu. Grund: Eine falsche Zahl ist schlimmer als keine.

**Kreditregeln der CSSF (Beleihungsquote)**
- **[geprüft]** CSSF-Verordnung 20-08, Technical FAQ in der Version vom 09.03.2026: https://www.cssf.lu/wp-content/uploads/Technical_FAQ_on_Regulation_CSSF_No_20-08.pdf
  - **Erstkäufer**, Hauptwohnsitz: Darlehen bis **100 %** des Werts.
  - **Andere Käufer eines Hauptwohnsitzes:** **90 %**. Ausnahmen bis 100 % für 15 % der Jahresproduktion einer Bank.
  - **Sonstige, darunter Vermietung:** **80 %**.
- **[geprüft]** Erstkäufer ist, wer noch nie einen Wohnkredit für eine Immobilie in Luxemburg hatte. Bei gemeinsamem Kauf müssen alle Erstkäufer sein.
- **[geprüft]** Eine gesetzliche Grenze für das Verhältnis von Rate zu Einkommen gibt es nicht.
- **[Vermutung]** Die Faustregel „Rate höchstens ⅓ bis 40 % des Nettoeinkommens“ ist Praxis der Banken, kein Gesetz.
- **Wichtig für das Eigenkapital:** Die Grenze bezieht sich auf den Wert der Immobilie. Die **Nebenkosten** muss der Käufer in der Praxis meist selbst tragen **[Vermutung: übliche Bankpraxis, nicht geprüft]**.

**Zinsen**
- **[geprüft]** BCL, Neugeschäft Wohnkredite **September 2026**, veröffentlicht am 03.11.2026: variabel **3,13 %**, Bindung 10–15 Jahre 4,00 %, 20–25 Jahre 4,05 %, 25–30 Jahre 3,89 %. Quelle: https://www.bcl.lu/fr/media_actualites/communiques/2026/11/Taux/index.html

**Wo Käufer scheitern (Zahlen)**
- **[geprüft]** Bestandswohnungen kosten im Schnitt **7 795 €/m²**, VEFA 9 809 €/m² (2. Quartal 2026). Quelle: logement.public.lu, Observatoire, 24.09.2026.
- **[Snippet]** Rund **30 %** der neuen Wohnkredite haben eine Beleihung über 90 %. Quelle: CSSF-Jahresbericht 2025.
- **[Snippet]** Erstkäufer zahlten im 1. Halbjahr 2023 im Schnitt 45,6 % ihres Einkommens als Rate. Quelle: CSSF 2023, via paperjam.lu.
- **[Vermutung]** Daraus folgt: Die meisten unterschätzen den **Eigenkapitalbedarf für die Nebenkosten** und wissen nicht, ob sie als **Erstkäufer** gelten. Ein Tool kann genau das klären.

### 2.2 Was es schon gibt

| Angebot | Was es kann | Quelle |
| --- | --- | --- |
| Spuerkeess | Rechner „Capacité de remboursement“ und „Simulation prêt logement“ | [geprüft, dass es die Seiten gibt; Inhalt läuft per JS und war nicht lesbar] |
| BIL | Online-Tool für Kreditkapazität und Antrag | [Snippet] |
| immotop.lu | €/m² pro Gemeinde und Viertel, mit Spanne und Verlauf | [Snippet] |
| athome.lu | Preise und Trends, Schätzung für Verkäufer | [Snippet] |
| wortimmo.lu | €/m² pro Gemeinde und Viertel, Suchalarme | [Snippet] |
| **estimimmo.lu/je-cherche** | Rechnet das Budget **in m² pro Gemeinde** um (Notarpreise 07/2025–06/2026). Zeigt passende Anzeigen von atHome, Immotop und Wortimmo mit Medianpreis und **Alarme bei Preissenkungen**. Kauf-gegen-Miete-Rechner. **Laut Recherche-Agent auch Preis-Check einer Anzeige.** Kostenlos, ohne Konto, nächtliche Aktualisierung. | [geprüft am 18.11.2026; den Preis-Check hat nur der Agent gesehen] |

**Die Lücke, ehrlich betrachtet:**
- Zahlen allein (€/m², Budget in m², Preis-Check) gibt es **schon kostenlos und besser automatisiert**, als du es mit einem kleinen Tool kannst. Ein reines Daten-Tool hätte gegen estimimmo keinen Vorteil.
- **[Vermutung]** Folgendes fehlt dort, und das kannst nur du bieten:
  1. Eine **ehrliche Gesamtrechnung**: Gebühren, Bëllegen Akt, Eigenkapital nach CSSF-Regel, alles in einer einfachen Ansicht.
  2. Die **Verbindung zu „erst verkaufen“**: estimatioun.lu, Timing, Überbrückung.
  3. Ein **Mensch, der zurückruft**: Wissen über Düdelingen und Umgebung, Objekte vor der Veröffentlichung, und als ImmoBuild die **Einschätzung von Renovierungskosten**. Das ist dein eigentlicher Vorsprung gegenüber reinen Maklern.

### 2.3 Rechtliche Grenzen (keine Rechtsberatung)

**Kreditvermittlung**
- **[geprüft]** Code de la consommation, Gesetz vom 23.12.2016, **Art. L. 226-1 Punkt 14** (intermédiaire de crédit immobilier) und **Punkt 23** (services de conseil): https://legilux.public.lu/eli/etat/leg/loi/2016/12/23/n24/jo
  - Kreditvermittler ist, wer gegen Vergütung Kreditverträge vorstellt oder anbietet, vorbereitende Arbeiten erledigt oder Verträge abschließt.
  - Ausdrücklich **nicht** Kreditvermittler ist, wer „ne présente pas seulement“, also einen Verbraucher nur an einen Kreditgeber weiterleitet.
- **[geprüft]** **L. 226-23:** Für Vermittlung oder Beratung, „à titre principal ou accessoire“, braucht es eine **Zulassung des Finanzministers**. Register und Aufsicht liegen bei der CSSF.
- **[nicht geprüft]** Die Ausnahme in L. 226-15 Abs. 5 und die aktuelle konsolidierte Fassung des Gesetzes.
- **Meine Einordnung [Vermutung]:**
  - **Allgemeiner Rechner** ohne Produkt, ohne Bank und ohne Provision: wahrscheinlich keine Vermittlung. → **Sicher genug für die erste Version.**
  - **Kontakt an eine Bank gegen Provision:** Das reine Weiterleiten ist ausgenommen. Wer Unterlagen sammelt oder den Antrag vorbereitet, ist im Grenzbereich. → **Erst mit Anwalt oder CSSF klären.**
  - **„Nehmen Sie den Kredit X“** oder ein persönlicher Kreditvorschlag: wahrscheinlich zulassungspflichtig. → **Nicht machen.**

**Aussagen über fremde Anzeigen**
- **[geprüft]** Loi du 30.07.2002, Art. 18: Vergleichende Werbung ist nur erlaubt, wenn sie objektiv und überprüfbar ist und **nicht herabsetzt**.
- **[Snippet]** Teile dieses Gesetzes wurden 2016 neu geregelt. Die aktuelle Norm ist **nicht geprüft**. Dazu kommen die unlauteren Geschäftspraktiken (Loi du 29.04.2009, Code de la consommation).
- **[Vermutung]** Ein Preis neutral neben der amtlichen Spanne, ohne den Anbieter zu nennen und ohne Wertung wie „überteuert“, ist das geringere Risiko. Trotzdem vor einem Preis-Check von einem Anwalt prüfen lassen.

**Maklerberuf**
- **[geprüft]** Autorisation d'établissement als Agent immobilier. Quelle: guichet.public.lu, Seitenstand 18.09.2023.
- Eine Regel, die unverbindliche Preiseinschätzungen verbietet, habe ich **nicht gefunden**.

### 2.4 Datenschutz (DSGVO)

- **[Vermutung, nicht anwaltlich geprüft]**
  - Einkommen und Eigenkapital sind keine „besonderen Kategorien“ nach Art. 9, aber heikle Finanzdaten.
  - **Datenminimierung** (Art. 5 Abs. 1 lit. c): **Spannen statt genauer Beträge** beim Einkommen. Das Eigenkapital als runde Zahl ist für das Ergebnis nötig.
  - Keine Fragen nach Kontodaten, Arbeitgeber oder Schulden im Detail.
- Gleiches Muster wie bei der Schätzung: keine Datenbank, nur E-Mail, kein Cookie, keine Tracker.
- **Neu:** Eingaben zum Budget müssen in der Datenschutzerklärung erwähnt werden. Eine eigene Leitlinie der CNPD zu Lead-Formularen habe ich nicht gefunden.
- **Wichtig:** Das **Ergebnis vor den Kontaktdaten** zeigen (siehe Teil 4) **oder** wie bisher erst danach. Das ist eine Entscheidung mit Folgen für die Anzahl der Leads (Frage 4).

### 2.5 Daten für einen Preis-Check: wie genau ist er möglich?

**[geprüft]** Datensätze des Observatoire auf data.public.lu, Stand 24.09.2026, Daten bis zum 2. Quartal 2026 (gleitende 12 Monate):

| Was | Bestandswohnung | VEFA | Haus |
| --- | --- | --- | --- |
| Verkaufspreis (Notar) €/m² pro Gemeinde | ja, ab 10 Verkäufen (51 von 100 Gemeinden) | ab 10 (16 Gemeinden) | **nein, keine Verkaufspreise pro Gemeinde** |
| Spanne 5–95 % | **ja** | ja | – |
| Angebotspreis €/m² pro Gemeinde | ja, ab 30 Angeboten (61 Gemeinden) | – | ja, ab 30 (82 Gemeinden), **nur Mittelwert** |
| Quartile / Streuung | nein | nein | nein |

- **Beispiel Dudelange, Bestandswohnung:** 130 Verkäufe, Mittelwert 6 512 €/m², Spanne **4 534–8 901 €/m²**. Das sind etwa −30 % bis +37 % um den Mittelwert. Steht so in `data/communes.json`.
- Das Observatoire schreibt selbst: Die Spannen « n'ont qu'une valeur indicative et ne correspondent pas à une expertise » **[geprüft, in der xls-Datei]**.

**Was eine ehrliche Aussage leisten kann**
- **Wohnung im Bestand, Gemeinde mit mindestens 10 Verkäufen:**
  - Möglich ist: « Le prix au m² de cette annonce se situe **dans / au-dessus de / en dessous de** la fourchette des ventes notariées à Dudelange (5 % à 95 %). »
  - Aber: Die Spanne ist so breit, dass fast jede Anzeige „dans la fourchette“ landet. **[Vermutung]** Der Nutzen ist klein.
  - Lage, Zustand, Energieklasse und Stockwerk erklären den Großteil des Unterschieds, und die Daten kennen nichts davon.
- **Haus:** Nur „Angebot gegen Durchschnitt der Angebote“. Das heißt nicht, ob der Preis „den Wert hat“. **Für Häuser kein Preis-Check.**
- **Zeitverzug:** Die Daten sind ein gleitender 12-Monats-Schnitt mit 3 Monaten Verzug. In einem fallenden oder steigenden Markt hinkt das hinterher.

**Fazit:** Ein Preis-Check kann nur sagen „im üblichen Rahmen / außerhalb“, und nur für Bestandswohnungen. Die Frage „ist es den Preis wert?“ kann er **nicht** beantworten. Das kann nur eine Besichtigung, also du.

### 2.6 Abgleich mit deinem Bestand: Apimo

- **[geprüft]** Apimo API v3 (JSON). Doku: https://apimo.com/en/api/webservice
  - Anmeldung mit **provider ID + token** (HTTP Basic).
  - Zugriff nur auf Agenturen, die die Verbindung zum Partner-Konto **freigegeben** haben.
  - Endpunkt `GET /agencies/{id}/properties`, mit Delta-Abgleich über `timestamp`.
  - Standardmäßig **1 000 Anfragen pro Tag**.
  - Mit dem Scope `properties_private` gibt es auch Eigentümerdaten. **Nicht anfordern**, nicht nötig.
- **[geprüft]** Laut der Bibliothek apimo.js (npm, 26.06.2026): Provider-ID und Token « request from Apimo support ».
- **Nicht gefunden:** Kosten, ob eine Partnervereinbarung nötig ist, offizielles WordPress-Plugin.
- **Nächster Schritt:** den Apimo-Support fragen (Frage 7).
- **Technisch [Vermutung]:** Ein nächtlicher Abgleich deiner Objekte in Cloudflare KV ist innerhalb des Kontingents machbar. Daraus ließe sich ein **Abgleich Suchprofil ↔ Bestand** bauen.
- Ein **Benachrichtigungsdienst** hingegen bräuchte eine Datenbank mit Suchprofilen, Abmeldelinks und Löschfristen. Das ist deutlich mehr Aufwand und mehr DSGVO-Pflichten als „nur E-Mail“.

---

## 3. Möglichkeiten im Vergleich

Aufwand grob in Arbeitstagen mit Claude, Tests und Durchsicht eingerechnet **[Vermutung]**.

| | **A. Budget + Suchprofil** | **B. Preis-Check** | **C. Abgleich + Benachrichtigung** | **D. Nur „erst verkaufen?“ in estimatioun.lu** |
| --- | --- | --- | --- | --- |
| Nutzen für Käufer | **Hoch.** Klärt Eigenkapital, Gebühren, Bëllegen Akt, Erstkäuferstatus und „was bekomme ich wo?“ in 2 Minuten. | **Klein bis mittel.** Die Spanne ist breit, nur Wohnungen, gibt es schon bei estimimmo. | Mittel. Nur so gut wie die Zahl deiner Objekte. | – |
| Wert des Leads | Mittel. Kauft in 3–12 Monaten, mit Profil und Budget. **Hoch**, wenn er erst verkaufen muss. | Niedrig bis mittel. Hat schon ein Objekt im Blick, meist bei einem anderen Makler. | Mittel bis hoch, wenn der Bestand passt. | Hoch, aber nur für Verkäufer. |
| Nötige Daten | `communes.json` (vorhanden), 4 Werte in `params.json` | `communes.json` (vorhanden) | Apimo-Zugang, KV, Datenbank für Profile | – |
| Rechtliches Risiko | **Gering**, wenn rein informativ: keine Kreditempfehlung, keine Bank | **Mittel**: Aussagen über fremde Anzeigen | Mittel: DSGVO, Speicherung, Abmeldung | Gering |
| Aufwand | **4–6 Tage** (ca. 70 % Wiederverwendung) | 2–3 Tage zusätzlich | 6–10 Tage plus laufende Pflege | 0,5 Tage |
| Wiederverwendung des Estimation-Tools | hoch | hoch | gering (neu: API, Speicherung) | – |

**Warum nicht B als erste Version** (Widerspruch zu deiner Idee „ist die Immobilie den Preis wert?“):
- Mit öffentlichen Daten lässt sich das **nicht seriös beantworten**: kein Zustand, keine Lage innerhalb der Gemeinde, für Häuser gar keine Verkaufspreise.
- Ein kostenloses Tool, das genau das schon macht, gibt es bereits.
- Und es lockt vor allem Käufer, die gerade mit einem **anderen** Makler verhandeln. **[Vermutung]**

**B als Baustein später:** Im Ergebnis von A kann ein Feld « Vous avez déjà une annonce en vue ? » stehen, mit Positionierung gegenüber der Spanne, aber **nur für Bestandswohnungen**. Sinnvoll erst nach anwaltlicher Prüfung (Frage 6).

---

## 4. Empfehlung: erste Version = A, schmal

**1. Chance**
- Wenig Aufwand, da großteils wiederverwendet.
- Einfaches Thema mit echtem Problem: Eigenkapital und Nebenkosten werden unterschätzt.
- Mit der Frage „Müssen Sie erst verkaufen?“ wird es ein **Zubringer für Verkäufer-Leads**.
- Gleiche Marke wie estimatioun.lu, daher gegenseitige Verweise.

**2. Prüfung**
- *Sicher:*
  - Die 7 %, die 40 000 € Bëllegen Akt und die Grenzen 100/90/80 % sind offiziell belegt (Teil 2.1).
  - Die Gemeindedaten liegen schon vor und werden quartalsweise aktualisiert.
- *Unsicher:*
  - Ob Käufer ihre Kontaktdaten für ein Budget hergeben, wenn Banken und estimimmo das ohne Kontaktdaten bieten.
  - Notar- und Hypothekenkosten sind noch nicht belegt. Die Reform zu 45 000 € und zur Zinssubvention ist noch nicht verabschiedet.
  - Wie viel dir ein Käufer-Lead wert ist, hängt von deinem Provisionsmodell ab.

**3. Fazit**
- **Bauen, aber schmal halten und messen** (Teil 6).
- **Größtes Risiko:** **zu wenige Leads**, weil die Zahlen woanders ohne Formular zu haben sind.
  - Gegenmittel: Ein Teil des Ergebnisses (Gesamtbedarf und Eigenkapital) wird **sofort und ohne Kontakt** gezeigt.
  - Die **Aufteilung nach Gemeinden mit m², das PDF und ein Rückruf** gibt es gegen Kontaktdaten.
  - Das ist eine Abweichung vom Estimation-Tool. Entscheidung bei dir (Frage 4).
- **Zweites Risiko:** Jemand liest das Ergebnis als Kreditzusage. Gegenmittel: Formulierungsregeln (Teil 5.4).
- **Wie sicher ich mir bin:**
  - Mittel bei der Richtung (A vor B).
  - Gering bei der erwarteten Zahl der Leads. Dafür gibt es keine Daten, nur die Messung nach dem Start.

---

## 5. Entwurf

### 5.1 Fragebogen (4 Schritte + Kontakt)

Texte auf Französisch, wie sie im Tool stehen würden. DE und EN folgen wie beim Estimation-Tool. **Fett = Pflicht.**

**Schritt 1 – Votre projet**
- **Vous achetez pour :** y habiter (résidence principale) / louer (investissement)
- **Achat :** seul(e) / à deux
- **Premier achat d'un logement au Luxembourg avec un prêt ?** oui / non / je ne sais pas → Info-Text zur CSSF-Definition
- **Avez-vous déjà utilisé votre Bëllegen Akt ?** non / oui, en partie / oui, entièrement / je ne sais pas
- **Devez-vous d'abord vendre un bien ?** non / oui, au Luxembourg / oui, à l'étranger → bei „oui, au Luxembourg“ Hinweis auf estimatioun.lu (Teil 5.5)

**Schritt 2 – Ce que vous cherchez**
- **Type :** appartement / maison / les deux
- **Communes souhaitées :** 1 à 3, mit der vorhandenen Gemeindesuche und Schnellwahl Dudelange, Bettembourg, Kayl, Rumelange, Esch, Schifflange
- **Chambres minimum :** 1–5+
- Freiwillig: surface minimum ; extérieur (balcon / jardin / peu importe) ; garage ; neuf / ancien / peu importe ; « prêt à rénover ? » (oui / non / selon prix) → wichtig für ImmoBuild
- Freiwillig: Notiz « ce qui compte pour vous » (école, trajet, calme…), höchstens 300 Zeichen

**Schritt 3 – Votre budget** (angepasst nach deinen Antworten vom 18.11.2026)
- **Apport personnel disponible (€)** als runde Zahl, mit Erklärung „Ersparnisse, ohne Rücklage“
- **Prix d'achat visé (€)** **oder** „je ne sais pas“ → dann rechnet das Tool den Höchstpreis allein aus dem Eigenkapital und der CSSF-Regel
- Freiwillig: Revenu net mensuel du ménage als **Spanne**: < 4 000 / 4–6 000 / 6–8 000 / 8–10 000 / 10–14 000 / > 14 000 € / je préfère ne pas répondre
  - Nur für einen **Hinweis**, keine Kreditberechnung (Teil 5.2, Block 3)
- **Avez-vous déjà parlé à votre banque ?** oui / pas encore
- **Savez-vous combien vous pouvez emprunter ?** oui, environ … € (freiwillige Zahl) / non
  - Mit Betrag: Das Tool rechnet mit dieser Zahl statt nur mit der CSSF-Grenze.
- Freiwillig, **eigenes Kästchen, nicht vorausgewählt:** « Je souhaite être mis(e) en relation, sans engagement, avec un courtier en crédit immobilier partenaire. »
  - Bedingungen dazu in Teil 8.

**Schritt 4 – Calendrier**
- **Quand voulez-vous acheter ?** dès que possible / 3–6 mois / 6–12 mois / je me renseigne
- Freiwillig: déjà visité des biens ? 0 / 1–5 / plus

**Kontakt** (wie beim Estimation-Tool)
- Prénom, nom, e-mail, téléphone, Datenschutz-Kästchen: Pflicht
- Message: freiwillig
- Neu, freiwillig und nicht vorausgewählt: « Me prévenir si un bien correspondant entre chez ImmoBuild » → zunächst nur als Vermerk in der E-Mail, ohne automatische Benachrichtigung

### 5.2 Ergebnis-Bildschirm

**Block 1 – Votre budget total (sofort sichtbar, ohne Kontakt; Frage 4)**

| | Beispiel: Paar, Erstkäufer, Kaufpreis 600 000 €, Eigenkapital 60 000 € |
| --- | --- |
| Prix d'achat | 600 000 € |
| Droits d'enregistrement et de transcription (7 %) | 42 000 € |
| − Bëllegen Akt (2 × 40 000 €, plafonné aux droits) | − 42 000 € |
| Frais de notaire et d'hypothèque | **Spanne nach Notartarif, noch zu klären (Frage 8)** |
| **Besoin total** | 600 000 € + Notarkosten |
| Prêt maximal selon la règle CSSF (100 % pour un premier achat) | 600 000 € |
| **Apport nécessaire au minimum** | **Notarkosten** (+ Rücklage) |

- Bei „pas premier achat“: Grenze 90 % → Mindest-Eigenkapital = 10 % des Preises + Kosten.
- Bei „louer“: Grenze 80 %, kein Bëllegen Akt.
- **[Vermutung]** Die Zuteilung von Bëllegen Akt und Gebühren entspricht der Regel auf guichet.public.lu. Die genaue Rechenregel (z. B. Anteile bei Miteigentum) muss vor dem Bau noch einmal mit einem Notar geprüft werden.

**Block 2 – Ce que votre budget représente dans vos communes (nach Kontaktdaten)**
- Pro gewählter Gemeinde, aus `communes.json`:
  - « ≈ 92 m² d'appartement ancien à Dudelange (prix moyen des ventes notariées : 6 512 €/m², 130 ventes, juil. 2025 – juin 2026) »
  - Für Häuser: « ≈ 113 m² au prix moyen **annoncé** (5 320 €/m², 356 annonces) – prix demandés, pas prix de vente »
- Bei zu wenig Daten (Gemeinde unter der Schwelle): Kantonswert, wie im Estimation-Tool, mit Hinweis.
- Ein Satz zum Vergleich: « À Bettembourg, le même budget représente ≈ x m². »

**Block 3 – Points à vérifier (Checkliste, kein Urteil)**
- « Statut de premier acquéreur : à confirmer avec votre banque (définition CSSF). »
- Wenn ein Einkommen angegeben ist: « Les banques regardent souvent si la mensualité reste sous environ un tiers à 40 % du revenu net. Ce n'est pas une règle légale ; votre banque décide. »
  - **Keine Monatsrate und kein „Sie bekommen X € Kredit“.**
- Aides possibles, mit Link auf guichet.public.lu: prime d'accession, prime d'épargne, subvention d'intérêt, garantie de l'État. Ohne Beträge.
- « 45 000 € de Bëllegen Akt annoncés pour les actes depuis le 16/07/2026 : loi pas encore votée (état au … ). »

**Block 4 – Prochaines étapes**
- Jason-Blase: « Je vous rappelle pour parler de votre recherche. Je connais aussi les biens qui ne sont pas encore en ligne. »
- Wenn „muss erst verkaufen“: Karte « Vous devez d'abord vendre ? Estimez votre bien en 2 minutes → estimatioun.lu »
- Wenn „prêt à rénover“: « Un bien à rénover peut être une bonne affaire si on connaît le coût des travaux. Je peux vous aider à l'estimer. »
- Buttons: Appeler / Prendre rendez-vous / Imprimer (PDF)

### 5.3 Lead-E-Mail an dich

Aufbau wie `estimation-widget/src/shared/email.ts`, auf Französisch.

```
Objet : [Acheteur · CHAUD] Marie Muller – Dudelange/Kayl – appart. 3 ch. – apport 60 000 €

PRIORITÉ : CHAUD
  pourquoi : achat dans les 3 mois + doit d'abord vendre un bien au Luxembourg

À DIRE AU TÉLÉPHONE
  • Doit vendre d'abord → proposer l'estimation (estimatioun.lu ou visite)
  • Ouvert à un bien à rénover → argument ImmoBuild
  • Pas encore vu sa banque

PROFIL
  Projet         Résidence principale · à deux · premier achat : oui
  Bëllegen Akt   pas utilisé (2 × 40 000 €)
  Recherche      Appartement · 3 ch. min. · balcon · garage souhaité
  Communes       Dudelange, Kayl, Bettembourg
  Note           « École primaire à pied, calme »

BUDGET (déclaratif)
  Apport         60 000 €
  Prix visé      600 000 €
  Revenu net     6 000 – 8 000 € / mois (tranche)
  Calendrier     dès que possible · 3 biens visités

CALCUL AFFICHÉ AU VISITEUR
  Droits 42 000 € − Bëllegen Akt 42 000 € = 0 €
  Prêt max. CSSF 100 % = 600 000 € → apport mini. = frais de notaire
  Dudelange ≈ 92 m² (6 512 €/m², 130 ventes) · Kayl ≈ … · Bettembourg ≈ …

CORRESPONDANCE AVEC MES BIENS
  (manuel en V1 : vérifier Apimo)

CONTACT
  Marie Muller · +352 621 … · marie@… · FR · 18/11/2026 14:32 · page : immobuild.lu/acheter
  Souhaite être prévenue si un bien correspondant arrive : oui
```

**Priorität (Vorschlag):**
- **chaud:** Kauf innerhalb von 6 Monaten **und** (muss erst verkaufen **oder** Eigenkapital reicht laut Block 1)
- **tiède:** Kauf innerhalb von 12 Monaten
- **froid:** « je me renseigne »

### 5.4 Formulierungsregeln

1. **Immer „Richtwert“:** « estimation indicative », « selon les règles publiques en vigueur au [date] ». Nie « vous pouvez emprunter », « vous obtiendrez », « garanti ».
2. **Keine Kreditaussage:** keine Monatsrate als Zusage, kein Zinssatz als Angebot, keine Bank, kein Produkt. Ein fester Satz unter jedem Ergebnis: « Cet outil ne constitue ni un conseil en crédit ni une offre de prêt. Seule votre banque décide. »
3. **Daten mit Quelle und Zeitraum**, wie im Estimation-Tool: « Observatoire de l'Habitat, ventes notariées juil. 2025 – juin 2026 ».
4. **Häuser:** Es gibt nur Angebotspreise, und das wird immer gesagt.
5. **Nicht verabschiedete Regeln** (45 000 €, Reform der Zinssubvention) nur als Hinweis mit Stand, nie in der Rechnung.
6. **Kein Urteil über fremde Anzeigen** in der ersten Version.
7. **Keine Wertung des Käufers.** Statt « budget insuffisant » heißt es « Pour ce prix, il manque environ X € d'apport selon la règle CSSF. Pistes : … ».
8. Ton wie bisher: sachlich, mit kurzer Jason-Blase, ohne Konfetti.

### 5.5 Zusammenspiel mit estimatioun.lu / combien.lu

- **Gemeinsame Marke:** gleiche Gestaltung, gleiche Jason-Blase, gleiche Fußzeile « Un outil ImmoBuild Kohn ». Die E-Mail kommt immer von `immobuild.lu`.
- **Querverweise:**
  - Käufer-Tool → estimatioun.lu: « Vous devez d'abord vendre ? Estimez votre bien. » Erscheint in Schritt 1 als Hinweis und im Ergebnis als Karte.
  - estimatioun.lu → Käufer-Tool: Bei « objectif : vendre » ein Link im Ergebnis: « Vous rachetez ensuite ? Calculez votre budget d'achat. » **Das ist eine Änderung am Estimation-Tool und wird erst nach deiner Zustimmung umgesetzt** (Frage 9).
  - verlounen.lu (Miet-Tool): Bei « louer (investissement) » ist ein Hinweis möglich. Der Stand der anderen Sitzung ist mir nicht bekannt.
- **Optional, Folgeversion:** Wer beide Tools ausfüllt, landet in **einem** Gesprächstermin. Das geht ohne Datenbank: Der Käufer gibt bei „muss erst verkaufen“ einfach die gleiche E-Mail an, und du erkennst beide Leads in deinem Postfach.

### 5.6 Namen und Domains (.lu)

**Nicht geprüft:** dns.google und andere DNS-Dienste sind im Netzwerk dieser Sitzung gesperrt. Prüfung zum Beispiel auf whois.dns.lu oder bei deinem Registrar. Firmenname wurde nirgends gesendet.

| Idee | Sprache, Bedeutung | Bemerkung |
| --- | --- | --- |
| **kaafen.lu** | lux. „kaufen“ | passt zu estimatioun.lu und verlounen.lu (Luxemburgisch) |
| **akaf.lu** | lux. „Einkauf, Kauf“ | kurz; Rechtschreibung von einem Muttersprachler prüfen lassen |
| **wéivill.lu / weivill.lu** | lux. „wie viel?“ | Gegenstück zu combien.lu; Umlaut-Domain technisch heikel, nur `weivill.lu` nutzen |
| **monbudgetimmo.lu** | fr. „mein Immobilienbudget“ | selbsterklärend für Grenzgänger |
| **premieracquereur.lu** | fr. „Erstkäufer“ | spricht die größte Zielgruppe direkt an, zu lang für Flyer |

Mein Vorschlag: **kaafen.lu** als Adresse, analog zu estimatioun.lu und verlounen.lu. Dazu eine französische Kurzadresse für Flyer, wie combien.lu. **[Vermutung: Verfügbarkeit unbekannt]**

---

## 6. Erfolg messen, ohne Tracker

Alles aus den Lead-E-Mails zählbar, z. B. monatlich per Hand oder mit einem kleinen Zähler in KV ohne Personendaten:

1. **Anzahl Käufer-Leads pro Monat.** Zum Vergleich: Leads aus estimatioun.lu.
2. **Anteil „muss erst verkaufen“**: der wichtigste Wert für dich.
3. **Anteil mit Kauf innerhalb von 6 Monaten** und **Anteil „prêt à rénover“**.
4. **Von dir nachgetragen:** Rückruf erreicht? Termin? Mandat oder Kauf? Eine Tabelle mit 4 Spalten reicht.
5. Optional: ein anonymer Zähler „Ergebnis Block 1 angezeigt“ in KV, nur eine Zahl pro Tag. Damit siehst du, wie viele nach Block 1 abbrechen, falls du Block 1 ohne Kontaktdaten zeigst.

**Abbruchkriterium (Vorschlag):** Weniger als X Leads in 3 Monaten (X legst du fest) → Tool vereinfachen oder nur als Link in estimatioun.lu behalten.

---

## 7a. Deine Antworten vom 18.11.2026

| Punkt | Entscheidung |
| --- | --- |
| Provision | **Offen.** Du klärst das mit anderen Agenturen. Idee: Käufer-Mandat (Teil 9). |
| Finanzierung | Weiterleitung an **atHome Finance** (Vertrag vorhanden, kostenlos für Käufer), freiwilliges Kästchen (Teil 8). |
| Gebiet | **Ganz Luxemburg.** Gemeinden ohne genug Daten bekommen den Kantonswert mit Hinweis, wie im Estimation-Tool. |
| Ergebnis | **Teilweise ohne Kontaktdaten:** Block 1 sofort, Rest nach Kontakt. |
| Budget-Fragen | **Ja**, ergänzt um Bank-Kontakt, bekannter Kreditbetrag und Weiterleitung an einen Courtier (Teil 5.1, Schritt 3). |
| Preis-Check | **Nicht in der ersten Version, aber fest für später geplant.** Passt gut zum Käufer-Mandat (Teil 9). |
| Domain | **Keine eigene Domain.** Das Tool wird auf immobuild.lu eingebettet, z. B. auf einer Seite /acheter. Technisch läuft es auf Cloudflare Pages (`*.pages.dev` oder eine Subdomain von immobuild.lu, falls du deren DNS verwalten kannst). |
| Sprachen | **FR, DE, EN.** |
| Käufermandat | **Ja**, die Zeile « Ça m'intéresse » kommt in die erste Version, um das Interesse zu messen. |

## 7. Entscheidungen, die du treffen musst (bevor gebaut wird)

1. **Provision:** Wer zahlt bei dir, Verkäufer, Käufer oder beide? Bezahlst du dich auch als **Suchmakler** für Käufer? Davon hängt ab, wie viel ein Käufer-Lead wert ist und ob Option A sich lohnt.
2. **Kerngebiet:** Welche Gemeinden? Vorschlag: die 6 Schnellwahl-Gemeinden des Estimation-Tools. Andere Gemeinden auch zulassen oder nur diese?
3. **Budget-Angaben:** Willst du Eigenkapital (Pflicht) und Einkommen (freiwillig, als Spanne) überhaupt abfragen? Oder nur Kaufpreis und Eigenkapital?
4. **Ergebnis vor oder nach den Kontaktdaten?** Vorschlag: Block 1 (Gesamtbedarf und Eigenkapital) ohne Kontakt, der Rest mit. Alternative: alles erst nach Kontakt, wie bei estimatioun.lu. Das bringt mehr Kontaktdaten pro Ergebnis, aber vermutlich mehr Abbrüche.
5. **Preis-Check:** in der ersten Version nein (meine Empfehlung)? Später als Baustein nur für Bestandswohnungen nach anwaltlicher Prüfung? Oder gar nicht?
6. **Anwalt:** Bist du bereit, Kreditvermittlung (falls du je mit Banken gegen Provision arbeiten willst) und Preis-Check von einem Anwalt prüfen zu lassen? Ohne diese Prüfung baue ich beides nicht.
7. **Apimo:** Fragst du beim Apimo-Support nach Provider-ID, Token und Kosten? Ohne Zugang kein automatischer Abgleich. In der ersten Version vergleichst du dann von Hand.
8. **Notar- und Hypothekenkosten:** Kannst du von einem Notar, mit dem du arbeitest, eine Tabelle oder Faustregel bekommen? Sonst zeigt das Tool dort nur « à demander à votre notaire », ohne Zahl.
9. **Querverweis in estimatioun.lu:** Darf ich später einen Link zum Käufer-Tool im Ergebnis des Estimation-Tools einbauen? Das wäre eine eigene, kleine Änderung.
10. **Name und Domain:** kaafen.lu oder eine andere Idee? Kannst du die Verfügbarkeit prüfen oder mir dns.google im Netzwerk freigeben?
11. **Sprachen:** FR, DE, EN wie bisher? Portugiesisch wäre für Käufer im Süden vielleicht wichtig **[Vermutung]**. estimimmo bietet es an.
12. **Courtier-Partner:** Wer ist es genau? Bekommst du Geld für die Weiterleitung? Hast du seine CSSF-Zulassung gesehen?
13. **Käufer-Mandat:** Soll die Zeile « Ça m'intéresse » schon in die erste Version?

---

## 8. Weiterleitung an einen Courtier (neu, 18.11.2026)

**Was du willst:** Käufer können sich freiwillig und unverbindlich an einen Courtier en crédit immobilier weiterleiten lassen.

**1. Chance**
- Klärt die Finanzierung früh. Ein Käufer mit geklärtem Budget ist für dich viel wertvoller.
- Ein Courtier ist der Kanal, über den du selbst **keine Kreditberatung** machen musst.

**2. Prüfung**
- *Recht:*
  - Das Gesetz nimmt aus, wer einen Verbraucher nur „vorstellt“ (L. 226-1 Pkt. 14, Teil 2.3). Eine reine Weiterleitung des Kontakts fällt nach meiner Lesart darunter. **[Vermutung]**
  - Der Wortlaut nennt die Vorstellung „à un prêteur“, ein Courtier ist aber kein prêteur. Ob die Ausnahme auch dann gilt, wenn du **Geld vom Courtier** bekommst, habe ich nicht geprüft. → Anwaltsfrage, vor allem falls es eine Provision gibt.
  - Unproblematisch bleibt es nur, wenn du **nicht** über Kreditbedingungen sprichst, keine Unterlagen sammelst und keinen Kredit empfiehlst.
- *Courtier prüfen:* Er muss als intermédiaire de crédit immobilier zugelassen sein. Das CSSF-Register ist öffentlich. Vor dem Start nachsehen, nicht vertrauen.
- *Datenschutz:*
  - Weitergabe an einen Dritten **nur mit eigenem Kästchen**, nicht vorausgewählt und getrennt von der Datenschutz-Zustimmung zum Rückruf.
  - Der Courtier wird **namentlich** genannt, bevor man ankreuzt.
  - Die Datenschutzerklärung wird ergänzt.
- *Technik:* Am einfachsten bekommst **du** die E-Mail mit dem Vermerk „Weiterleitung an Courtier gewünscht“ und leitest sie selbst weiter. So geht nichts automatisch an Dritte, und du behältst die Kontrolle über den Lead.

**3. Fazit**
- Gute Idee für die erste Version, als freiwilliges Kästchen.
- Größtes Risiko: eine Provision vom Courtier ohne rechtliche Prüfung.
- Ohne Provision ist das Risiko gering. **Sicherheit meiner Einschätzung: mittel, keine Rechtsberatung.**

**Stand 18.11.2026:**
- Jason hat einen Vertrag mit dem Courtier, und der Courtier ist laut Jason zugelassen. Den Vertrag habe ich **nicht gesehen**.
- **Courtier: atHome Finance** (Jason, 18.11.2026), 5 rue Charles Darwin, L-1433 Luxembourg.
  - **[Snippet]** Laut eigener Seite ist der Dienst für den Käufer kostenlos (« Free of charge », https://www.athome.lu/en/finance/mortgage). Jason bestätigt das.
  - **[Snippet]** atHome Finance stellt auch eine Bescheinigung über den möglichen Kreditbetrag aus (https://www.athome.lu/finance/pret-immobilier). Das ist nützlich für Käufer bei Besichtigungen und für das Käufermandat.
  - **[Vermutung]** atHome Finance gehört zur Gruppe des Portals athome.lu.
  - Den Eintrag im CSSF-Register habe ich nicht selbst gesehen.
- **Vergütung:** Jason wird für die Weiterleitung bezahlt und möchte das **nicht** im Formular erwähnen. Das ist seine Entscheidung und wird so umgesetzt.
  - Ob eine Offenlegung Pflicht ist, habe ich nicht geprüft. **[Vermutung]**
  - Folge für die Texte: Der Courtier wird nicht als « indépendant » oder « neutre » bezeichnet, sondern als « courtier partenaire ». So ist die Formulierung ehrlich, ohne die Vergütung zu nennen.
- **Kästchen im Formular, Jasons Wortlaut (18.11.2026):** « Je souhaite être mis(e) en relation, sans engagement, avec notre courtier partenaire. »
  - Ohne Namen im Kästchen.
  - **[Vermutung, nicht anwaltlich geprüft]** Für eine gültige Einwilligung zur Weitergabe an einen anderen Verantwortlichen verlangen die EDPB-Leitlinien 05/2020 zur Einwilligung, dass dieser **benannt** wird.
  - Lösung ohne längeres Kästchen: ein kleiner Link « Qui est notre courtier partenaire ? » direkt daneben, der atHome Finance nennt. Außerdem atHome Finance in der Datenschutzerklärung nennen.

### 8.1 Der Werbesatz für den Courtier

**Jasons Vorschlag:** « Saviez-vous qu'au Luxembourg, les taux varient suivant la tête du client ? Ne vous faites pas avoir, parlez à un courtier. »

**1. Chance**
- Prägnant, und er trifft ein echtes Thema: Kreditzinsen werden einzeln verhandelt.
- Die BCL veröffentlicht nur **Durchschnittswerte**. Im September 2026 lag der variable Satz im Schnitt bei 3,13 %. Was der Einzelne bekommt, weicht davon ab.

**2. Prüfung**
- *Belegt:* Es gibt Durchschnittssätze (BCL). Banken bewerten jeden Kunden einzeln.
- *Nicht belegt:* **Wie groß** die Unterschiede zwischen Banken oder Kunden sind. Dafür habe ich keine Quelle.
- „Suivant la tête du client“ unterstellt Willkür. „Ne vous faites pas avoir“ unterstellt, dass Banken übervorteilen. Das passt nicht zum sachlichen Ton des Tools, und ein Kunde, der seine Bank mag, fühlt sich angegriffen.
- Ein Rechtsproblem sehe ich darin eher nicht, **[Vermutung]**. Das Problem ist die Glaubwürdigkeit.

**3. Fazit:** Inhalt ja, Ton entschärfen. Vorschläge:
- « Le taux d'un crédit immobilier se négocie : il n'est pas le même pour tout le monde. Un courtier compare plusieurs banques pour vous, sans engagement. »
- « Saviez-vous que les taux se négocient au cas par cas ? Comparez avant de signer. Notre courtier partenaire le fait pour vous, gratuitement et sans engagement. »
  - « gratuitement » ist laut Jason und laut Seite von atHome Finance zutreffend.

## 9. Idee Käufer-Mandat: „Ich vertrete den Käufer“ (neu, zum Weiterdenken)

**Was du willst:** Ein Käufer beauftragt dich, für ihn den besten Preis, gute Bedingungen und einen technischen Check-up des Hauses herauszuholen.

**1. Chance**
- Damit hättest du ein Angebot, das estimimmo, die Portale und Banken **nicht** haben.
- Als ImmoBuild kennst du Bau und Renovierungskosten. Den Check Maison gibt es als Ablauf schon.
- Der spätere **Preis-Check** wird hier zu einem echten Werkzeug: Er bereitet die Verhandlung vor und ist keine automatische Bewertung fremder Anzeigen.
- Das Käufer-Tool wird der natürliche Einstieg: « Vous avez trouvé un bien ? Faites-le vérifier avant de signer. »

**2. Prüfung**
- *Markt:* Ob Käufer in Luxemburg dafür bezahlen, weiß ich nicht. Käufer-Mandate (chasseur immobilier, mandat de recherche) gibt es, ich habe aber keine Zahlen für Luxemburg recherchiert. **[nicht geprüft]**
- *Interessenkonflikt:* Du darfst nicht beim gleichen Objekt den Verkäufer **und** den Käufer vertreten, ohne dass beide es wissen. Das ist **[Vermutung]**, die Rechtslage in Luxemburg ist nicht geprüft. Für eigene Objekte also keine Käufer-Mandate.
- *„Beste Konditionen“:* Gemeint sind die **Kaufbedingungen** (Preis, Vertrag, Fristen, Auflagen, Übergabe), nicht der Kredit. Das hat Jason am 18.11.2026 bestätigt. Der Kredit bleibt beim Courtier.

**3. Fazit**
- Vielversprechender als ein Daten-Tool, aber ein **Geschäftsmodell**, kein Softwareproblem.
- Vorschlag: Im Käufer-Tool zuerst nur **eine Zeile** im Ergebnis zeigen, ob jemand Interesse hat, und das messen:
  - « Vous aimeriez être accompagné(e) pour négocier et faire vérifier l'état du bien ? »
  - Kästchen « Ça m'intéresse ».
- Preis, Vertrag und Ablauf legst du fest, wenn sich Interesse zeigt.

## 10. Was du Notar und Apimo fragen sollst (Texte zum Versenden)

### 10.0 Notarkosten: selbst recherchiert (18.11.2026)

Du hast recht, die Tarife sind online zu finden. Damit ist die Anfrage beim Notar (10.1) **nicht mehr nötig**, höchstens zur Bestätigung.

**Kaufakt, Honorar des Notars**
- **[geprüft: Sekundärquelle]** Barème 7 des RGD vom 24.07.1971 (geändert). Es wird in Stufen gerechnet: 4 % bis 3 718 €, … 0,10 % von 247 894 € bis 1 239 468 €, darüber 0,05 %. Dazu 17 % TVA.
  - Quelle: tevaxia.lu/guide/frais-notaire-luxembourg, abgerufen 18.11.2026.
  - Den Gesetzestext auf legilux habe ich **nicht** selbst gelesen (https://legilux.public.lu/eli/etat/leg/rgd/1971/07/24/n1/jo). Vor dem Bau gegenlesen.
- Berechnet aus dieser Tabelle:

| Preis | Honorar ohne TVA | mit 17 % TVA |
| --- | --- | --- |
| 400 000 € | ≈ 1 550 € | ≈ 1 810 € |
| 600 000 € | ≈ 1 750 € | ≈ 2 050 € |
| 700 000 € | ≈ 1 850 € | ≈ 2 165 € |
| 1 000 000 € | ≈ 2 150 € | ≈ 2 515 € |

- Dazu kommen Kopien, Auslagen und Auszüge. Die Beträge sind nicht festgelegt, ich habe sie nicht beziffert.

**Darlehensakt (Hypothek)**
- **[geprüft, offiziell]** Eintragung der Hypothek: **0,05 %**. Quelle: pfi.public.lu/fr/citoyen/hypotheques.html, abgerufen 18.11.2026. Es gibt Befreiungen, die ich nicht im Detail geprüft habe.
- **[Sekundärquelle]** Registrierungsgebühr auf den Darlehensakt: **0,24 %** des Darlehens. Dazu Notarhonorar nach Barème 5 + TVA. Quelle: tevaxia.lu und konstrulux.lu.
  - Barème 5 habe ich **nicht** gefunden.
- Beispiel Darlehen 600 000 €: 1 440 € (0,24 %) + rund 300 € (0,05 %, falls die Hypothek auf den Darlehensbetrag eingetragen wird) + Honorar nach Barème 5 + TVA.

**Folge für das Tool**
- Nebenkosten neben den 7 % als Spanne zeigen, z. B. bei 600 000 € Kauf und 600 000 € Darlehen: « environ 4 000 à 6 000 € (notaire, acte de prêt, inscription), à confirmer par votre notaire ».
- Die obere Grenze ist eine **Annahme** für Barème 5 und die Auslagen. Sobald Barème 5 im Gesetzestext gelesen ist, rechnet das Tool genau statt mit Annahme.

### 10.1 An den Notar (nur noch optional, zur Bestätigung)

**Warum:** Das Tool soll die Kaufnebenkosten als **Spanne** zeigen. Ich habe dafür keine geprüften Zahlen, und eine falsche Zahl in einem öffentlichen Tool wäre schlimmer als keine.

> Bonjour Maître,
>
> Je prépare pour mes clients acquéreurs un petit outil en ligne qui donne une **estimation indicative** des frais d'achat. Pourriez-vous m'indiquer, à titre d'ordre de grandeur :
>
> 1. vos **honoraires** pour un acte de vente d'un logement de 400 000 €, 700 000 € et 1 000 000 € (hors droits d'enregistrement) ;
> 2. le coût total d'un **acte de prêt hypothécaire** (honoraires + inscription hypothécaire + frais divers) pour un prêt de 300 000 €, 600 000 € et 900 000 € ;
> 3. les autres frais habituels (débours, copies, extraits, TVA sur honoraires) ;
> 4. si le **Bëllegen Akt** s'impute bien d'abord sur les droits d'enregistrement et de transcription (7 %) et, en cas d'achat à deux à parts inégales, comment il se répartit ;
> 5. si vous accepteriez que j'écrive dans l'outil « fourchette indicative, à confirmer auprès de votre notaire ».
>
> Merci beaucoup,
> Jason

### 10.2 An Apimo

**Warum:** Ohne Zugang zur API gibt es keinen automatischen Abgleich zwischen Suchprofil und Bestand. Laut Doku braucht man eine provider ID und ein token „vom Support“. Kosten und Bedingungen stehen nicht in der Doku.

> Bonjour,
>
> Je suis client Apimo (agence ImmoBuild Kohn, Dudelange). Je souhaite lire **mes propres biens** via l'API v3 (lecture seule, scope `properties`, sans données privées) pour les comparer aux recherches de mes clients acquéreurs sur mon site.
>
> 1. Comment obtenir un **provider ID et un token** ? Est-ce inclus dans mon abonnement ou payant ?
> 2. Faut-il signer un contrat de partenaire, même pour un usage interne à l'agence ?
> 3. Le quota par défaut (1 000 requêtes/jour) s'applique-t-il ? Une synchronisation par nuit avec `timestamp` est-elle la bonne méthode ?
> 4. Les biens **non publiés** (off-market) sont-ils lisibles, et peut-on les exclure ou les filtrer ?
> 5. Existe-t-il un environnement de test ?
>
> Merci,
> Jason

### 10.3 Domain: neue Ideen

Deine erste Wahl ist vergeben. Die Verfügbarkeit konnte ich nicht prüfen, weil DNS in dieser Sitzung gesperrt ist. Bitte auf whois.dns.lu oder bei deinem Registrar prüfen:

- **kafen.lu**: ich vermute, das ist die luxemburgische Schreibweise von „kaufen“ (ech kafen). Bitte von einem Muttersprachler bestätigen.
- **akafen.lu** oder **akaf.lu**
- **weivill.lu**: „wie viel?“, Gegenstück zu combien.lu
- **monbudgetimmo.lu**
- **acheter-au-luxembourg.lu**: lang, aber selbsterklärend für Grenzgänger

## 11. Umsetzung der ersten Version (18.11.2026)

Gebaut in `acheteur-widget/`, nach Jasons Startsignal vom 18.11.2026. Bei der Prüfung vor dem Bau und beim Bau habe ich folgende Abweichungen vom Entwurf vorgenommen:

| Punkt | Entwurf | Umgesetzt | Warum |
| --- | --- | --- | --- |
| Neubau (VEFA) | 7 % auf den ganzen Preis | 7 % als **Höchstwert** angezeigt, mit Hinweis | Bei Neubau fallen die Gebühren oft nur auf Grundstück und bereits gebauten Teil an. Mit vollen 7 % wäre der Bedarf überschätzt und als genau dargestellt worden. |
| Kaufpreis | freiwillig, sonst Höchstpreis aus Eigenkapital | **Pflicht** | Bei Erstkäufern (100 % Kredit) begrenzt nur das Einkommen den Preis. Da das Tool absichtlich nicht mit dem Einkommen rechnet, wäre ein „Höchstpreis“ nur aus dem Eigenkapital sinnlos hoch. Höchstpreis nur, wenn der Käufer seinen möglichen Kreditbetrag kennt. |
| Nebenkosten des Kredits | Spanne 4 000–6 000 € | 0,24 % + 0,05 % + Notarhonorar nach Barème 5 + MwSt. (geprüft am 18.11.2026), dazu Kopien/Auslagen **300–1 000 € (Annahme)** | Nach dem Faktencheck: Barème 5 gefunden, die Annahme ist nur noch der kleine Rest. |
| Bëllegen Akt | bis zur Höhe der Gebühren | mindestens 100 € Gebühr bleiben immer | AED erhebt laut guichet.lu immer mindestens 100 €. |
| Zuschlag Stadt Luxemburg / Mamer | nicht bedacht | nicht nötig | Gilt nur für gewerblich oder gemischt genutzte Gebäude (pfi.public.lu). |
| 45 000 € Bëllegen Akt | Hinweis | Hinweis, **verschwindet automatisch**, sobald `par_personne` auf 45 000 gesetzt wird | Weniger Pflege. |
| Name des Courtiers | im Kästchen | **nicht im Kästchen und nicht im Code des Browsers** (`server.json`) | Jasons Wunsch. Der Name stand anfangs noch im Browser-Code, das habe ich beim Prüfen korrigiert. Schalter `courtierNomPublic` in `config.json`, falls er ihn doch zeigen will (Datenschutz-Hinweis in `PRIVACY.md`). |
| Käufermandat | Zeile im Ergebnis | Frage in Schritt 4 (freiwillig) **und** Karte im Ergebnis | Damit die Antwort in der Lead-E-Mail steht. |

Getestet: 52 automatische Tests; Ablauf im echten Browser (Chromium, 390 px und 320 px): 0 JavaScript-Fehler, 0 Barrierefreiheits-Fehler (axe-core, WCAG 2.1 AA) auf 8 Bildschirmen, kein seitliches Scrollen, Einbettung per iframe. **Nicht getestet:** echter E-Mail-Versand über Resend, Betrieb auf Cloudflare (nur lokal mit wrangler), WordPress-Seite, Safari/iPhone.

## Anhang: Quellen

| Quelle | URL | Stand |
| --- | --- | --- |
| guichet.public.lu – Bëllegen Akt, 7 % | https://guichet.public.lu/fr/citoyens/logement/aides/aides-indirectes-avantages-fiscaux/credit-impot-actes-notaries.html | Seite 07.07.2025 |
| Regierung – „Booster Wunnengsbau 2“ (45 000 €, VEFA, Zinssubvention) | https://gouvernement.lu/fr/actualites/toutes_actualites/communiques/2026/07-juillet/16-meisch-roth-booster-wunnengsbau2.html | 16.07.2026 |
| Chambre des Députés – PL 8806 | https://www.chd.lu/fr/dossier/8806 | abgerufen 18.11.2026, „En commission“ |
| guichet.public.lu – prime d'accession / épargne / subvention d'intérêt / garantie | guichet.public.lu (Rubrik aides-capital) | 17.–19.02.2026 |
| CSSF – Technical FAQ Verordnung 20-08 | https://www.cssf.lu/wp-content/uploads/Technical_FAQ_on_Regulation_CSSF_No_20-08.pdf | Version 09.03.2026 |
| BCL – Zinsen Neugeschäft Sept. 2026 | https://www.bcl.lu/fr/media_actualites/communiques/2026/11/Taux/index.html | 03.11.2026 |
| Gesetz 23.12.2016 (Wohnimmobilienkredit), L. 226-1, L. 226-23 | https://legilux.public.lu/eli/etat/leg/loi/2016/12/23/n24/jo | Mémorial 28.12.2016; konsolidierte Fassung nicht geprüft |
| Loi 30.07.2002 (Wettbewerb) | https://legilux.public.lu/eli/etat/leg/loi/2002/07/30/n3/jo | aktuelle Fassung nicht geprüft |
| Observatoire – Prix de vente des appartements par commune | https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/ | 24.09.2026, Daten bis T2 2026 |
| Observatoire – Prix annoncés par commune | https://data.public.lu/fr/datasets/prix-annonces-des-logements-par-commune/ | 24.09.2026 |
| Observatoire – Nombre de ventes (Häuser nur national) | https://data.public.lu/fr/datasets/nombre-de-ventes-dappartements-de-maisons-et-de-terrains/ | bis T2 2026 |
| logement.public.lu – Durchschnittspreise | https://logement.public.lu/fr/observatoire-habitat/prix-de-vente.html | 24.09.2026 |
| estimimmo.lu/je-cherche | https://www.estimimmo.lu/je-cherche/ | abgerufen 18.11.2026 |
| Apimo API v3 | https://apimo.com/en/api/webservice | abgerufen 18.11.2026 |
| apimo.js (npm) | https://www.npmjs.com/package/apimo.js | 26.06.2026 |
| guichet.public.lu – Agent immobilier | https://guichet.public.lu/fr/entreprises/creation-developpement/autorisation-etablissement/commerce/agent-immobilier.html | 18.09.2023 |
