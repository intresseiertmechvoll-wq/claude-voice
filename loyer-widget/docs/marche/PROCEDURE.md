# Relevé mensuel des maisons à louer – procédure

Exécutée une fois par mois par une session Claude planifiée (ou à la main). Durée : environ 25 minutes. Coût : environ 180 crédits Firecrawl.

Trois portails : **atHome**, **immotop** et **wortimmo**. Une même maison y est souvent annoncée plusieurs fois (le 18/11/2026 : 191 annonces utilisables pour 111 maisons différentes) : le script la reconnaît et ne la compte qu'une fois. vivi.lu et nextimmo.lu ont été testés le 18/11/2026 : presque toutes leurs maisons étaient déjà sur les trois portails (0 nouvelle sur vivi, 1 probable sur nextimmo) ; ils ne sont pas relevés.

Décision du propriétaire du projet (17/11/2026, étendue à immotop.lu le 18/11/2026) : collecte mensuelle automatique sur atHome.lu, immotop.lu et wortimmo.lu, risque lié aux conditions d'utilisation des portails accepté en connaissance de cause. On ne collecte que : loyer, surface, chambres, type, localité, pays, lien. **Jamais de nom d'agent ou d'agence, jamais de photo, jamais de description.**

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

## 2. immotop : toutes les maisons à louer

Les données d'immotop sont lues directement dans la page (pas d'interprétation par une IA) :

- 5 régions : `https://www.immotop.lu/location-maisons/centre-lu/`, `…/sud-lu/`, `…/nord-lu/`, `…/est-lu/`, `…/ouest-lu/` ;
- avec `mcp__Firecrawl__firecrawl_scrape`, `formats: ["rawHtml"]`, `maxAge: 0`. La réponse est trop longue pour être affichée : l'outil l'enregistre dans un fichier et en donne le chemin ;
- lancer `npm run marche -- immotop --out <scratchpad>/immotop.csv <fichier1> <fichier2> …` avec ces fichiers. Le script indique pour chaque page « page 1 sur N » : s'il reste des pages, relever aussi `…/centre-lu/?pag=2` (etc.) et relancer la commande avec tous les fichiers ;
- s'il signale « données de la page introuvables », immotop a changé de format : ne pas importer immotop ce mois-ci et le signaler.

## 3. wortimmo : toutes les maisons à louer

- `https://www.wortimmo.lu/fr/location/maison`, puis `?page=2`, `?page=3`… jusqu'à ce que le lien « page suivante » manque (environ 4 pages). Là aussi **`maxAge: 0`**.
- `queryOptions.prompt` :

> Return CSV rent_eur,surface_m2,bedrooms,locality,url for each listing card (empty if absent; numbers as integers, no € sign). Then one line NEXT=<href of next page link or none>.

- Écrire `wortimmo.csv` avec le même en-tête que `athome.csv` (`source = wortimmo`, `page` et `type` peuvent rester vides). `country` : `LU` sauf pour les localités clairement étrangères (Trier, Nonnweiler, Aubange, Stintino…) : `DE`, `BE`, `FR`, `IT`… Ignorer les « Prix sur demande ».

## 4. Importer et comparer

```bash
npm run marche -- import --date AAAA-MM-JJ --athome <scratchpad>/athome.csv --immotop <scratchpad>/immotop.csv --wortimmo <scratchpad>/wortimmo.csv
npm test
```

Le script :

- met à jour `data/marche/maisons.json` (une fiche par annonce : prix successifs, première et dernière observation, « disparue » quand l'annonce n'est plus en ligne) ;
- garde une copie du relevé (annonces du Luxembourg) dans `data/marche/releves/AAAA-MM-JJ.json` ;
- regroupe les annonces des trois portails en maisons (même commune, surface à 2 m² près, même nombre de chambres et loyer à 3 % près, ou une chambre d'écart et loyer à 1 % près) ;
- écrit `data/marche/communes-maisons.json` et `docs/marche/rapport-maisons-AAAA-MM-JJ.md` : comparaison avec le modèle de l'outil par canton, par zone et par commune. Objectif : **au moins 10 maisons de comparaison par territoire**. Les maisons disparues restent comptées 12 mois. Chaque commune est comparée sur le plus petit territoire qui atteint 10 maisons (la commune, sinon son canton, sinon sa zone).

S'il signale des **localités inconnues** : ajouter la correspondance localité → commune dans `src/shared/aliases.ts` **seulement si elle est certaine** (vérifier la commune), puis `npm run marche -- rapport`. En cas de doute, laisser la localité inconnue : elle reste listée dans le rapport.

S'il signale un **relevé incomplet** (moins de la moitié des annonces du mois précédent pour une source) : les disparitions de cette source ne sont pas comptées ce mois-ci. Le signaler dans le message final.

## 5. Enregistrer

```bash
git add data/marche docs/marche src/shared/aliases.ts
git commit -m "loyer-widget : relevé mensuel des maisons du AAAA-MM-JJ"
git push -u origin claude/dazzling-carson-y40amu
```

Fin du message de commit : les lignes d'attribution demandées par la session. Si la session n'a pas le droit de pousser sur cette branche, pousser sur la branche indiquée par la session et le dire.

## 6. Message final (en allemand, court)

- nombre d'annonces lues (atHome, immotop, wortimmo), maisons différentes après regroupement, nouvelles, disparues ;
- cantons qui ont atteint ou pas les 10 maisons de comparaison ;
- communes dont l'écart avec le modèle dépasse ± 10 % **et** qui ont assez de données ;
- avertissements (relevé incomplet, localités inconnues, contrôle de la page 1) ;
- lien vers le rapport du mois.

## Ce que le relevé ne permet pas de dire

- Une annonce disparue n'est pas forcément louée (retirée, expirée, louée ailleurs). Son dernier prix est une approximation du loyer conclu, pas un loyer signé.
- La durée en ligne n'est précise qu'au mois près.
- Peu de maisons à louer dans certains cantons (Vianden 0, Echternach 1 le 18/11/2026) : même en cumulant 12 mois, ils n'atteindront peut-être jamais 10 maisons. Leurs communes restent alors comparées sur la zone (toutes les zones ont plus de 10 maisons dès le premier mois).
- Le modèle de l'outil (`data/references.json` → `maisons`) n'est **pas** modifié automatiquement : un ajustement par commune ne se fait qu'après décision de Jason.
