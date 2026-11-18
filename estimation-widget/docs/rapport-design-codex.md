# Designprüfung für « Estimation gratuite »

**18. November 2026 · ImmoBuild Kohn · `codex/feinschliff-design`**

Ausgangspunkt für die Vorher-Aufnahmen war `934807e` auf `claude/estimation-widget-immobuild-g7jc99`. Beim lesenden Live-Aufruf von estimatioun.lu waren die Dateinamen der Hauptdateien für JavaScript und CSS identisch mit diesem Ausgangsbuild.

## 1. Kurzurteil

Der stärkste Teil des Tools ist die Ergebniskarte. Sie gibt dem Besucher einen schnell erfassbaren Marktwert und erklärt anschließend, wie die Gemeinde und die Angaben zum Objekt in die Schätzung eingehen. Die schwächste Stelle war die Lesbarkeit auf 320 px, vor allem bei langen Auswahltexten und den Beschriftungen am Gemeindevergleich. Die neue Anordnung hält Preis, Spanne und Datengrundlage zusammen, bevor sie den Besucher zu Jason weiterleitet. Der Simulator macht das Ergebnis konkreter, sofern der Hinweis zu den nicht eingerechneten Kosten sichtbar bleibt.

## 2. Umgesetzte Änderungen

| Bildschirm | Geprüfter Befund und Änderung | Vergleich |
|---|---|---|
| 1 · Objekt | Bei 320 px stand das letzte « t » von « Appartement » in einer eigenen Zeile. Die Kacheln nutzen bei dieser Breite ihre Fläche besser, die Schrift ist leicht kleiner und längere Ortsnamen dürfen im Rückblick umbrechen. | [Vorher FR, 320 px](feinschliff/avant/fr-320-1-bien.jpg) · [Nachher](feinschliff/apres/fr-320-1-bien.jpg) |
| 2 · Details | Lange deutsche Zustandsbezeichnungen wurden an ungünstigen Stellen getrennt. Die kürzeren Labels behalten die Abstufungen und ihre erläuternden Beispiele. Die Breite von Eingabefeld und Regler kann sich an den verfügbaren Platz anpassen. | [Vorher DE, 320 px](feinschliff/avant/de-320-2-details.jpg) · [Nachher](feinschliff/apres/de-320-2-details.jpg) |
| 3–6 · Zustand der Bauteile, Extras, Projekt, Kontakt | Die bestehenden Fragegruppen, Extras und Kontaktdaten lassen sich weiterhin in derselben Reihenfolge bearbeiten. Die kürzeren Sprechblasen geben mehr Platz für die Felder. Vier aufklappbare Hinweise stehen unter der Navigation, getrennt von den Antworten. | [Aufgeklappter Hinweis DE, 320 px](feinschliff/apres/de-320-repere.jpg) · [Vorher/Nachher-Matrix](#aufnahmen) |
| Analyse | Aktive Erklärungstexte haben keine feste Höhenbegrenzung mehr. Die Überschrift für die Berechnungsmethoden ist auf Deutsch kürzer. Bei aktivierter Einstellung für reduzierte Bewegung springt auch die Prozentzahl direkt auf den nächsten Stand. Jasons Ablauf und die Dauer sind gleich. | [Vorher DE, 320 px](feinschliff/avant/de-320-7-analyse.jpg) · [Nachher](feinschliff/apres/de-320-7-analyse.jpg) |
| Ergebnis · Marktwert und Spanne | Der Quadratmeterwert hat eine eigene Zeile. Eine sichtbare Überschrift verbindet die gleich ausgerichteten Grenzwerte. Bei siebenstelligen Spannen können die Karten auf kleinen Bildschirmen untereinander stehen. Quellenzeitraum, Hinweis zur Genauigkeit und Datenqualität stehen in einem gemeinsamen Block. | [Vorher FR, 390 px](feinschliff/avant/fr-390-8-resultat.jpg) · [Nachher](feinschliff/apres/fr-390-8-resultat.jpg) |
| Ergebnis · Gemeindevergleich, Kennzahlen, Faktoren | Zwei feste Beschriftungsfelder halten die Beträge lesbar, auch wenn ein Marker nahe am Rand liegt. Form und Farbe verbinden jeden Marker mit seinem Wert. Die Kennzahlen erklären den Modellabschlag auf Angebotspreise. Bei neutralen Eingaben erklärt der Text, dass sich aus den Angaben kein Zuschlag oder Abschlag ergibt. | [Vorher DE, 390 px](feinschliff/avant/de-390-8-resultat.jpg) · [Nachher](feinschliff/apres/de-390-8-resultat.jpg) |
| Ergebnis · Kontakt, Simulator und nächste Schritte | Termin und Anruf bilden eine Gruppe. Auf breiten Ansichten stehen sie nebeneinander, auf dem Handy untereinander. Der Simulator bleibt über seinen Sprungknopf erreichbar. Er folgt auf die Faktoren, und « Wie geht es weiter? » erklärt wie bisher die Rolle von Jason. Der sichtbare Fokus auf dem dunklen Ergebniskopf ist weiß. | [Vorher DE, 1280 px](feinschliff/avant/de-1280-8-resultat.jpg) · [Nachher](feinschliff/apres/de-1280-8-resultat.jpg) |
| Ergebnis ohne Daten · Tandel | Der Besucher sieht die Empfangsbestätigung und den nächsten Schritt ohne Preisfeld. Jasons Profil und die gruppierten Kontaktoptionen tragen die Seite. | [Vorher FR, 320 px](feinschliff/avant/fr-320-tandel-resultat.jpg) · [Nachher](feinschliff/apres/fr-320-tandel-resultat.jpg) |
| Einbettung | Das Demo lädt sein Layout aus einer lokalen CSS-Datei, damit es unter der vorhandenen CSP angewendet wird. Die Höhe des iframe passt sich beim Wechsel zu den Details weiterhin an. | [Vorher, 390 px](feinschliff/avant/demo-390.jpg) · [Nachher](feinschliff/apres/demo-390.jpg) |

### Aufnahmen

Je Zelle die Vorher- und die Nachher-Ansicht. Die Aufnahmen sind vollständige Seiten mit denselben fiktiven Objektdaten. Das Beispiel enthält Garage, Keller, Terrasse und zwei gegenläufige Zustands- bzw. Energieanpassungen. Es unterscheidet sich deshalb vom neutralen Live-Test des vorherigen Prüfberichts.

| Sprache und Breite | Schritt 1 | Schritt 2 | Analyse | Ergebnis |
|---|---|---|---|---|
| FR · 320 px | [V](feinschliff/avant/fr-320-1-bien.jpg) / [N](feinschliff/apres/fr-320-1-bien.jpg) | [V](feinschliff/avant/fr-320-2-details.jpg) / [N](feinschliff/apres/fr-320-2-details.jpg) | [V](feinschliff/avant/fr-320-7-analyse.jpg) / [N](feinschliff/apres/fr-320-7-analyse.jpg) | [V](feinschliff/avant/fr-320-8-resultat.jpg) / [N](feinschliff/apres/fr-320-8-resultat.jpg) |
| FR · 390 px | [V](feinschliff/avant/fr-390-1-bien.jpg) / [N](feinschliff/apres/fr-390-1-bien.jpg) | [V](feinschliff/avant/fr-390-2-details.jpg) / [N](feinschliff/apres/fr-390-2-details.jpg) | [V](feinschliff/avant/fr-390-7-analyse.jpg) / [N](feinschliff/apres/fr-390-7-analyse.jpg) | [V](feinschliff/avant/fr-390-8-resultat.jpg) / [N](feinschliff/apres/fr-390-8-resultat.jpg) |
| FR · 1280 px | [V](feinschliff/avant/fr-1280-1-bien.jpg) / [N](feinschliff/apres/fr-1280-1-bien.jpg) | [V](feinschliff/avant/fr-1280-2-details.jpg) / [N](feinschliff/apres/fr-1280-2-details.jpg) | [V](feinschliff/avant/fr-1280-7-analyse.jpg) / [N](feinschliff/apres/fr-1280-7-analyse.jpg) | [V](feinschliff/avant/fr-1280-8-resultat.jpg) / [N](feinschliff/apres/fr-1280-8-resultat.jpg) |
| DE · 320 px | [V](feinschliff/avant/de-320-1-bien.jpg) / [N](feinschliff/apres/de-320-1-bien.jpg) | [V](feinschliff/avant/de-320-2-details.jpg) / [N](feinschliff/apres/de-320-2-details.jpg) | [V](feinschliff/avant/de-320-7-analyse.jpg) / [N](feinschliff/apres/de-320-7-analyse.jpg) | [V](feinschliff/avant/de-320-8-resultat.jpg) / [N](feinschliff/apres/de-320-8-resultat.jpg) |
| DE · 390 px | [V](feinschliff/avant/de-390-1-bien.jpg) / [N](feinschliff/apres/de-390-1-bien.jpg) | [V](feinschliff/avant/de-390-2-details.jpg) / [N](feinschliff/apres/de-390-2-details.jpg) | [V](feinschliff/avant/de-390-7-analyse.jpg) / [N](feinschliff/apres/de-390-7-analyse.jpg) | [V](feinschliff/avant/de-390-8-resultat.jpg) / [N](feinschliff/apres/de-390-8-resultat.jpg) |
| DE · 1280 px | [V](feinschliff/avant/de-1280-1-bien.jpg) / [N](feinschliff/apres/de-1280-1-bien.jpg) | [V](feinschliff/avant/de-1280-2-details.jpg) / [N](feinschliff/apres/de-1280-2-details.jpg) | [V](feinschliff/avant/de-1280-7-analyse.jpg) / [N](feinschliff/apres/de-1280-7-analyse.jpg) | [V](feinschliff/avant/de-1280-8-resultat.jpg) / [N](feinschliff/apres/de-1280-8-resultat.jpg) |


## 3. Vorschläge und Entscheidungen von Jason

- **Analyseanimation:** Die Hausgrafik und die fünf Schritte erklären, worauf das Tool achtet. Die fest eingeplante Dauer kann auf manchen Geräten länger wirken als der eigentliche Rechenvorgang. Die rund 5,6 Sekunden bleiben gemäß Jasons Entscheidung. [Aktive Datenphase auf 320 px](feinschliff/apres/fr-320-7-analyse.jpg)
- **Preisspanne:** Die Formulierungen « Prix pour une vente rapide » und « Avec un acheteur coup de cœur » bleiben erhalten. Die Spanne entsteht rechnerisch. Der Text kann eine Prognose zur Verkaufsdauer oder zum Käufer nahelegen. Drei mögliche Textpaare für eine spätere Entscheidung sind « Bas / Haut de la fourchette », « Hypothèse basse / haute » und « Estimation basse / haute ». [Spanne im Ergebnis](feinschliff/apres/fr-390-8-resultat.jpg)
- **Goldenes Siegel:** Es ist ein ruhiges Signal für den Eingang der Anfrage. Auf der dunklen Karte funktioniert es als Akzent und passt zu einem Ergebnis, das auch enttäuschen kann. [Ergebniskopf mit Siegel](feinschliff/apres/fr-390-8-resultat.jpg)
- **Kürzere Ergebnisansicht, vermutet:** Auf kleinen Bildschirmen könnte eine kompaktere Staffelung den Einstieg in den Simulator erleichtern. Skizze zum Vergleich: oben Preis, Spanne und Datenhinweis. Darunter Gemeinde und Faktoren unter einem gemeinsamen optionalen Abschnitt. Danach Simulator und Jasons nächste Schritte. Das würde wichtige Erläuterungen erst nach einer zusätzlichen Interaktion zeigen, daher bleibt die jetzige Abfolge bestehen. [Gesamtes Ergebnis auf 320 px](feinschliff/apres/de-320-8-resultat.jpg)

## 4. Jasons Sprechblasen

> **Nachtrag (Claude, 18.11.2026):** Die unten aufgeführten neuen Formulierungen wurden nach der Übernahme **nicht** so live geschaltet. Sie waren frei von KI-Floskeln, klangen aber amtlich und gleichförmig („Je note…“ / „Ich habe notiert…“ in vielen Blasen). Die übernommene Fassung ist ein Mittelweg: menschlich, abwechslungsreich, ohne Begeisterungs-Floskeln, im Einklang mit den Leistungen auf immobuild.lu („de A à Z“, Gestion locative). Gültig ist der Stand in `src/i18n/*.json` (`coach`). Geprüft: Jede Blase hat bei 320 px höchstens 3 Zeilen (FR/DE/EN), axe 0 Fehler.

Die Reaktionen benennen eine Auswahl oder erklären, wie Jason mit ihr umgeht. Die Texte verzichten auf Lob für eine Energieklasse oder Wertungen zum Zustand. Die längste eingesetzte Fassung hat 64 Zeichen. Die sichtbaren Blasen in den getesteten Durchläufen blieben bei 320 px innerhalb von drei Zeilen. Der Humanizer war in dieser Umgebung nicht verfügbar. Die Texte wurden pro Sprache eigenständig überarbeitet.

### Französisch

| Schlüssel | Alt | Neu |
|---|---|---|
| `start` | Bonjour ! Je suis Jason. Quelques clics et je vous donne une fourchette. | Bonjour, je suis Jason, de l’agence ImmoBuild Kohn. |
| `step2` | Une valeur approximative suffit. | Pour la surface, je peux partir d’une valeur approximative. |
| `step3` | Vous hésitez ? Choisissez « ? ». | En cas de doute, laissez-moi un « ? ». |
| `step4` | Ça compte aussi dans le prix ! | Je regarde aussi ce qui vient avec le logement. |
| `step5` | Ça m’aide à vous répondre au bon moment. | Je tiens compte de votre projet pour la suite. |
| `step6` | Votre numéro sert uniquement à parler de votre bien. | J’utiliserai votre numéro uniquement pour parler de votre bien. |
| `appartement` | Un appartement, très bien ! | Je pars sur un appartement. |
| `maison` | Une maison, très bien ! | Je note qu’il s’agit d’une maison. |
| `commune` | {commune}, c’est noté ! | Je note la commune : {commune}. |
| `energieGood` | Bravo, très bonne classe énergétique ! | Je note la classe énergétique {c}. |
| `energieBad` | Pas de souci, j’en tiens compte. | Je prends en compte la classe {c}. |
| `energieUnknown` | Pas grave, on fait sans. | Je continue sans classe énergétique. |
| `allGood` | Bien entretenu, c’est un atout ! | J’ai mis « Bon » partout. Vous pouvez ajuster chaque réponse. |
| `bad` | Merci pour votre franchise. | Je note qu’il y a un poste à revoir. |
| `garage` | Les garages comptent dans le prix. | Je retiens le garage dans les annexes. |
| `jardin` | Un jardin, c’est un vrai plus ! | Je note que vous disposez d’un jardin. |
| `cave` | Une cave, toujours pratique. | Je compte la cave parmi les annexes. |
| `vendre` | Vendre ? Je peux vous accompagner. | Je note que vous envisagez de vendre. |
| `louer` | Louer, c’est noté. | Je retiens que votre projet est de louer. |
| `renseigne` | Bonne idée de vous renseigner d’abord. | Je note que vous souhaitez d’abord vous renseigner. |
| `nonProprio` | Pas de souci, l’estimation reste possible. | Je peux aussi estimer un bien qui ne vous appartient pas. |
| `energieMid` | Classe {c}, c’est noté. | Je retiens la classe {c}. |

### Deutsch

| Schlüssel | Alt | Neu |
|---|---|---|
| `start` | Guten Tag! Ich bin Jason. Ein paar Klicks, und Sie erhalten eine Preisspanne. | Guten Tag, ich bin Jason von ImmoBuild Kohn. |
| `step2` | Ein ungefährer Wert reicht. | Für die Wohnfläche genügt mir ein ungefährer Wert. |
| `step3` | Nicht sicher? Wählen Sie „?“. | Bei „?“ weiß ich, dass Sie den Zustand nicht einschätzen können. |
| `step4` | Auch das zählt beim Preis! | Ich frage auch nach dem, was zur Immobilie gehört. |
| `step5` | So kann ich Ihnen zum richtigen Zeitpunkt antworten. | Ich richte mich nach dem, was Sie mit der Immobilie vorhaben. |
| `step6` | Ihre Nummer dient nur dazu, über Ihre Immobilie zu sprechen. | Ich nutze Ihre Nummer nur für Rückfragen zu dieser Immobilie. |
| `appartement` | Eine Wohnung, sehr gut! | Ich gehe von einer Wohnung aus. |
| `maison` | Ein Haus, sehr gut! | Für die Schätzung nehme ich ein Haus als Grundlage. |
| `commune` | {commune} – ist notiert! | Ich habe {commune} als Gemeinde notiert. |
| `energieGood` | Bravo, sehr gute Energieklasse! | Ich habe die Energieklasse {c} aufgenommen. |
| `energieBad` | Kein Problem, das berücksichtige ich. | Ich berücksichtige die Klasse {c} bei der Schätzung. |
| `energieUnknown` | Nicht schlimm, es geht auch ohne. | Ich rechne ohne Angabe zur Energieklasse weiter. |
| `allGood` | Gut gepflegt, das ist ein Plus! | Ich habe überall „Gut“ gesetzt. Jede Angabe lässt sich ändern. |
| `bad` | Danke für Ihre Offenheit. | Ich merke mir, wo Handlungsbedarf besteht. |
| `garage` | Garagen zählen beim Preis mit. | Die Garage berücksichtige ich als Extra. |
| `jardin` | Ein Garten ist ein echtes Plus! | Ich nehme den Garten mit auf. |
| `cave` | Ein Keller, immer praktisch. | Den Keller erfasse ich separat. |
| `vendre` | Verkaufen? Ich begleite Sie gern. | Ich habe notiert, dass Sie über einen Verkauf nachdenken. |
| `louer` | Vermieten, notiert. | Bei Ihnen geht es um die Vermietung. Das habe ich notiert. |
| `renseigne` | Gute Idee, sich zuerst zu informieren. | Ich merke mir, dass Sie sich erst einmal informieren möchten. |
| `nonProprio` | Kein Problem, die Bewertung ist trotzdem möglich. | Für eine Schätzung setze ich kein Eigentum voraus. |
| `energieMid` | Klasse {c}, notiert. | Ich übernehme Energieklasse {c}. |

### Englisch

| Schlüssel | Alt | Neu |
|---|---|---|
| `start` | Hello! I’m Jason. A few clicks and I’ll give you a price range. | Hello, I’m Jason from ImmoBuild Kohn. |
| `step2` | A rough figure is fine. | I’m happy to work with an approximate floor area. |
| `step3` | Not sure? Pick “?”. | If you choose “?”, I’ll leave that item open. |
| `step4` | These count in the price too! | I’ll ask what comes with the property, too. |
| `step5` | This helps me get back to you at the right time. | What you’re planning helps me understand your enquiry. |
| `step6` | Your number is only used to talk about your property. | I’ll only use your number to talk about this property. |
| `appartement` | An apartment, perfect! | I’ll use the apartment figures for this one. |
| `maison` | A house, lovely! | I’ve put this down as a house. |
| `commune` | {commune}, got it! | I’ve noted {commune} as the location. |
| `energieGood` | Well done, a very good energy class! | I’ve recorded the energy rating as {c}. |
| `energieBad` | No problem, I’ll take it into account. | I’ll take rating {c} into account. |
| `energieUnknown` | Never mind, we’ll do without. | I can carry on without an energy rating. |
| `allGood` | Well kept, great! | I’ve set each item to “Good”. You can change them individually. |
| `bad` | Thanks for being honest. | I’ve noted that this may need some work. |
| `garage` | Garages count in the price. | I’ll include the garage as an extra. |
| `jardin` | A garden is a real plus! | I’ve made a note of the garden. |
| `cave` | A cellar, always handy. | I’ll record the cellar separately. |
| `vendre` | Selling? I can help you with that. | I’ve noted that you’re considering selling. |
| `louer` | Renting out, noted. | I see you’re looking at renting it out. |
| `renseigne` | Good idea to look into it first. | I’ll keep in mind that you’re just looking into it. |
| `nonProprio` | No problem, you can still get a valuation. | I can estimate a property you don’t own. |
| `energieMid` | Class {c}, noted. | I’ve put down class {c}. |


## 5. Wissenshäppchen

Jeder Hinweis ist eingeklappt, per Maus oder Tastatur bedienbar und verlinkt die offizielle Quelle. Es gibt keinen automatischen Wechsel. Die Tabelle nennt die Aussage auf Deutsch. Im Tool steht sie in der ausgewählten Sprache. Die Quellen stehen auch in `src/ui/facts.ts` und in der README.

| Schritt | Aussage | Offizielle Quelle, abgerufen am 18.11.2026 |
|---|---|---|
| 1 · Objekt | Ein kommunaler Durchschnittspreis für Wohnungen wird veröffentlicht, wenn mindestens zehn Verkäufe nach Aufbereitung in die Auswertung eingehen. | [Observatoire de l’Habitat und STATEC, Wohnungspreise nach Gemeinde](https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/) |
| 2 · Details | Der Energiepass weist Energieeffizienz und Wärmeschutz getrennt aus. | [Guichet.lu, Energiepass](https://guichet.public.lu/fr/citoyens/logement/acquisition/performances-energie/demande-passeport-energetique.html) |
| 4 · Extras | Es gibt eine gesonderte Statistik mit Quadratmeterpreisen für Wohnungen, bei denen Garagen, Außenstellplätze und Keller rechnerisch herausgenommen werden. | [Observatoire de l’Habitat, bereinigte Wohnungspreise ohne Extras](https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-prix-affines-hors-annexes-par-commune/) |
| 5 · Projekt | Angebotsmieten geben den vor der Verhandlung verlangten Mietpreis wieder. | [Observatoire de l’Habitat, Angebotsmieten nach Gemeinde](https://data.public.lu/fr/datasets/loyers-annonces-des-logements-par-commune/) |

Die Hinweise verwenden veröffentlichte Definitionen und Methoden. Die Analyse zeigt weiterhin die vom Server gelieferten Gemeindezahlen, sobald sie da sind. Die offiziellen Preise müssen so für das Formular nicht in den Browser geladen werden.

## 6. Prüfprotokoll

### Geprüft

| Prüfung | Ergebnis |
|---|---|
| Lokale Installation und Build | `npm ci`, `npm test` (65 von 65 Tests in 7 Dateien), `npx tsc --noEmit` und `npm run build` erfolgreich. Die Tests für die geschützten Sätze wurden unverändert ausgeführt. |
| Start des Widgets | Wrangler Pages auf Port 8788 mit `EMAIL_MODE=log`. Eine temporäre Node-Vorladung fing den Fehler bei der Netzwerkschnittstellen-Abfrage dieser Umgebung ab. Die lokalen Beispielanfragen erzeugten Logeinträge anstelle echter E-Mails. |
| Responsive-Matrix | FR und DE bei 320, 390, 768 und 1280 px vor und nach den Änderungen. Durchlauf über alle sechs Schritte, Analyse und Ergebnis für Dudelange sowie bis zum Ergebnis ohne Preis für Tandel. EN zusätzlich nachher auf 390 px. Im Nachtest keine horizontalen Überläufe oder abgeschnittenen Texte in den gemessenen Elementen. Die Vorher/Nachher-Aufnahmen der vier Schlüsselscreens wurden visuell durchgesehen. |
| Bedienung und Einbettung | Auf 320 px Hinweise mit Enter geöffnet und mit Leertaste geschlossen. Energieklasse im Simulator FR und DE geändert und die Ergebnisdifferenz beobachtet. Die FR-Demo reagierte auf den Schrittwechsel in allen vier Breiten mit einer neuen iframe-Höhe. Bei 390 px im Nachtest 1.221 → 1.747 px. |
| axe | `node scripts/screenshots.mjs` meldete **0 Verstöße** für die automatisiert geprüften WCAG-2.1-AA-Regeln. Die zusätzliche Matrix hatte ebenfalls **0 Verstöße**, einschließlich aufgeklappter Hinweise bei 320 px. Die Zusatzprüfung misst die stabilen UI-Zustände nach den Übergängen. |
| Chromium | `npx playwright install chromium` lieferte ein unvollständiges Downloadarchiv. Der vorhandene Systembrowser konnte nicht headless starten. Das Originalskript und die Zusatzmatrix liefen mit Headless Chromium 153 aus einer separaten temporären Installation. |
| Gzip-Größe | Jeweils dieselbe Messung mit Node zlib über alle veröffentlichten JS-, CSS- und HTML-Dateien. `index` 16.624 → 16.858 B, `late` 4.543 → 4.620 B, gesamt 53.167 → 54.656 B (**+1.489 B**, unter dem Limit von +3 KB). |
| Live-Vergleich | Nur die Einstiegsseite per GET geladen. Kein Live-Formular abgeschickt. |

### Nicht getestet

- Physische Mobilgeräte, Safari, Firefox und die Ausgabe eines Screenreaders. Die Tastaturprüfung erfasste insbesondere die neuen Hinweise. Ein axe-Lauf ersetzt keine vollständige manuelle WCAG-Prüfung.
- Alle Kombinationen von Objektdaten, Betriebssystem-Schriftgrößen und Fokuspositionen. Siebenstellige Grenzwerte haben eine eigene mobile Darstellung, der aufgezeichnete Dudelange-Fall ist sechsstellig.
- Einbettung in ein produktives WordPress- oder Next.js-Layout und tatsächliche Kontaktaufnahme. Die Prüfung erfolgte über das lokale Demo mit aktivem iframe.
