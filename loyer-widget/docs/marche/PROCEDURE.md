# Relevé mensuel des maisons à louer – procédure

Exécutée une fois par mois par une session Claude planifiée (ou à la main). Durée : environ 20 minutes. Coût : environ 150 crédits Firecrawl.

Décision du propriétaire du projet (17/11/2026) : collecte mensuelle automatique sur atHome.lu et wortimmo.lu, risque lié aux conditions d'utilisation des portails accepté en connaissance de cause. On ne collecte que : loyer, surface, chambres, type, localité, pays, lien. **Jamais de nom d'agent ou d'agence, jamais de photo, jamais de description.**

## 0. Préparer

```bash
cd loyer-widget
git fetch origin claude/dazzling-carson-y40amu && git checkout claude/dazzling-carson-y40amu && git pull
npm ci
```

Date du relevé : la date du jour, `AAAA-MM-JJ`. Dossier de travail : le scratchpad de la session (pas dans le dépôt).

## 1. atHome : toutes les maisons à louer

Avec l'outil MCP `mcp__Firecrawl__firecrawl_scrape` (l'accès direct à athome.lu est bloqué par le proxy) :

- page 1 : `https://www.athome.lu/location/maison`, puis `https://www.athome.lu/location/maison?page=2`, `?page=3`… jusqu'à une page 404 ou une page sans nouvelle annonce (environ 24 pages ; 20 annonces par page) ;
- `formats: ["query"]`, **`maxAge: 0`** (obligatoire : sinon Firecrawl peut renvoyer une copie de la page vieille de plusieurs jours, et les maisons louées entre-temps ne seraient pas vues comme disparues ; vérifier dans la réponse que `cacheState` n'est pas `hit`), et ce `queryOptions.prompt` :

> Return ONLY a CSV (header: rent_eur,surface_m2,bedrooms,type,locality,url) with one line per rental listing card in the main results list of this page, including inline 'Annonce suggérée' cards. Copy numbers exactly as shown on the card: rent as integer euros (no spaces, no € sign), surface as integer m2 (empty if not shown). bedrooms = the number in 'N chambre(s)' only; if the card says 'N pièces', leave bedrooms empty. type = card title words before 'à louer' or before the count (Maison, Maison individuelle, Maison mitoyenne, Maison jumelée, Villa, Bungalow…). locality = locality exactly as shown, including a country suffix like (FR), (BE) or (DE). After the CSV, one line: RESULTS_LINE=<text like '21 - 40 sur 463 annonces'>.

- Plusieurs pages peuvent être lues en parallèle (6 à la fois).
- **Contrôle** : lire aussi la page 1 avec `formats: ["markdown"]` (et `maxAge: 0`) et vérifier chaque ligne du CSV (loyer, surface) contre le texte. Si plus d'une ligne sur 20 est fausse, s'arrêter et le signaler.
- Écrire un seul fichier `athome.csv` avec l'en-tête `source,page,rent_eur,surface_m2,bedrooms,type,locality,country,url,flag` : `source = athome`, `country = LU` sauf si la localité finit par (FR), (BE) ou (DE). Retirer les doublons (même `url`).
- Si une page renvoie une erreur, la relancer une fois. Si le total lu est très inférieur au total annoncé (« sur N annonces »), le noter dans le rapport.

## 2. wortimmo : toutes les maisons à louer

- `https://www.wortimmo.lu/fr/location/maison`, puis `?page=2`, `?page=3`… jusqu'à ce que le lien « page suivante » manque (environ 4 pages). Là aussi **`maxAge: 0`**.
- `queryOptions.prompt` :

> Return CSV rent_eur,surface_m2,bedrooms,locality,url for each listing card (empty if absent; numbers as integers, no € sign). Then one line NEXT=<href of next page link or none>.

- Écrire `wortimmo.csv` avec le même en-tête que `athome.csv` (`source = wortimmo`, `page` et `type` peuvent rester vides). `country` : `LU` sauf pour les localités clairement étrangères (Trier, Nonnweiler, Aubange, Stintino…) : `DE`, `BE`, `FR`, `IT`… Ignorer les « Prix sur demande ».

## 3. Importer et comparer

```bash
npm run marche -- import --date AAAA-MM-JJ --athome <scratchpad>/athome.csv --wortimmo <scratchpad>/wortimmo.csv
npm test
```

Le script :

- met à jour `data/marche/maisons.json` (une fiche par annonce : prix successifs, première et dernière observation, « disparue » quand l'annonce n'est plus en ligne) ;
- garde une copie du relevé (annonces du Luxembourg) dans `data/marche/releves/AAAA-MM-JJ.json` ;
- écrit `data/marche/communes-maisons.json` et `docs/marche/rapport-maisons-AAAA-MM-JJ.md` (comparaison par commune avec le modèle de l'outil).

S'il signale des **localités inconnues** : ajouter la correspondance localité → commune dans `src/shared/aliases.ts` **seulement si elle est certaine** (vérifier la commune), puis `npm run marche -- rapport`. En cas de doute, laisser la localité inconnue : elle reste listée dans le rapport.

S'il signale un **relevé incomplet** (moins de la moitié des annonces du mois précédent pour une source) : les disparitions de cette source ne sont pas comptées ce mois-ci. Le signaler dans le message final.

## 4. Enregistrer

```bash
git add data/marche docs/marche src/shared/aliases.ts
git commit -m "loyer-widget : relevé mensuel des maisons du AAAA-MM-JJ"
git push -u origin claude/dazzling-carson-y40amu
```

Fin du message de commit : les lignes d'attribution demandées par la session. Si la session n'a pas le droit de pousser sur cette branche, pousser sur la branche indiquée par la session et le dire.

## 5. Message final (en allemand, court)

- nombre d'annonces lues (atHome, wortimmo), au Luxembourg, nouvelles, disparues ;
- communes dont l'écart avec le modèle dépasse ± 10 % **et** qui ont assez de données ;
- avertissements (relevé incomplet, localités inconnues, contrôle de la page 1) ;
- lien vers le rapport du mois.

## Ce que le relevé ne permet pas de dire

- Une annonce disparue n'est pas forcément louée (retirée, expirée, louée ailleurs). Son dernier prix est une approximation du loyer conclu, pas un loyer signé.
- La durée en ligne n'est précise qu'au mois près.
- Peu de maisons par commune : un écart n'est affiché qu'à partir de 5 maisons (ou 3 disparues). Il faudra plusieurs mois pour comparer plus que quelques communes.
- Le modèle de l'outil (`data/references.json` → `maisons`) n'est **pas** modifié automatiquement : un ajustement par commune ne se fait qu'après décision de Jason.
