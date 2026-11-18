# Relevé hebdomadaire des maisons à louer – procédure

Exécutée chaque lundi par une session Claude planifiée (ou à la main). Durée : environ 15 minutes. Coût : environ 35 crédits Firecrawl par relevé (1 crédit par page : atHome ~24 pages, immotop ~5, wortimmo ~4), soit environ 150 par mois.

Pourquoi chaque semaine (décision du 18/11/2026) : selon l'Observatoire de l'Habitat, il y a sur 12 mois environ 7 à 12 fois plus de maisons à louer que ce qu'on voit un jour donné (Luxembourg 176 annonces sur 12 mois contre 27 vues le 18/11/2026, Mamer 42 contre 6, Strassen 36 contre 3). Beaucoup de maisons restent donc seulement quelques semaines en ligne ; un relevé par mois en manquerait une partie.

Depuis le 18/11/2026, les trois portails sont lus **directement dans la page** (données de la page ou fiches HTML), sans interprétation par une IA : plus de risque de chiffre mal recopié, et 5 fois moins de crédits.

Trois portails : **atHome**, **immotop** et **wortimmo**. Une même maison y est souvent annoncée plusieurs fois (le 18/11/2026 : 191 annonces utilisables pour 111 maisons différentes) : le script la reconnaît et ne la compte qu'une fois. vivi.lu et nextimmo.lu ont été testés le 18/11/2026 : presque toutes leurs maisons étaient déjà sur les trois portails (0 nouvelle sur vivi, 1 probable sur nextimmo) ; ils ne sont pas relevés.

Décision du propriétaire du projet (17/11/2026, étendue à immotop.lu le 18/11/2026) : collecte automatique (mensuelle, puis chaque semaine depuis le 18/11/2026) sur atHome.lu, immotop.lu et wortimmo.lu, risque lié aux conditions d'utilisation des portails accepté en connaissance de cause. On ne collecte que : loyer, surface, chambres, type, localité, pays, lien. **Jamais de nom d'agent ou d'agence, jamais de photo, jamais de description.**

## 0. Préparer

```bash
cd loyer-widget
git fetch origin claude/dazzling-carson-y40amu && git checkout claude/dazzling-carson-y40amu && git pull
npm ci
```

Date du relevé : la date du jour, `AAAA-MM-JJ`. Dossier de travail : le scratchpad de la session (pas dans le dépôt).

## 1. Enregistrer les pages (Firecrawl)

Avec l'outil MCP `mcp__Firecrawl__firecrawl_scrape` (l'accès direct aux portails est bloqué par le proxy), **toujours** avec `formats: ["rawHtml"]` et **`maxAge: 0`** (obligatoire : sinon Firecrawl peut renvoyer une copie de la page vieille de plusieurs jours, et les maisons louées entre-temps ne seraient pas vues comme disparues). La réponse est trop longue pour être affichée : l'outil l'enregistre dans un fichier et en donne le chemin. Noter tous ces chemins. Plusieurs pages peuvent être lues en parallèle (6 à la fois).

- **atHome** : `https://www.athome.lu/location/maison`, puis `https://www.athome.lu/location/maison?page=2` … jusqu'à la dernière page (environ 24 ; 20 annonces par page).
- **immotop** : 5 régions : `https://www.immotop.lu/location-maisons/centre-lu/`, `…/sud-lu/`, `…/nord-lu/`, `…/est-lu/`, `…/ouest-lu/` (et `?pag=2` si le script le demande).
- **wortimmo** : `https://www.wortimmo.lu/fr/location/maison`, puis `?page=2`, `?page=3` … (environ 4 pages ; 15 annonces par page).

Si une page renvoie une erreur, la relancer une fois.

## 2. Lire les pages

```bash
npm run marche -- lire --dossier <scratchpad>/releve <fichier1> <fichier2> …
```

Le script reconnaît le portail de chaque fichier et écrit `athome.csv`, `immotop.csv` et `wortimmo.csv` dans le dossier. Il indique pour chaque page « page N sur M » et signale :

- **« pages pas encore lues »** : relever ces pages, puis relancer la commande avec **tous** les fichiers ;
- **« copie en cache »** : relire la page avec `maxAge: 0` ;
- **« portail non reconnu » ou « introuvables »** : le portail a changé de format. Ne pas importer ce portail cette fois-ci et le signaler (les autres portails peuvent être importés).

**Contrôle** : pour atHome, le nombre d'annonces lues doit être proche du total annoncé par le portail (« le portail en annonce N ») ; s'il manque plus de 5 %, le signaler. Ouvrir aussi 2 ou 3 lignes au hasard de chaque CSV et vérifier loyer et surface sur la page (une capture `markdown` de la page 1 suffit, 1 crédit).

On ne collecte que : loyer, surface, chambres, type, localité, pays, lien et, pour atHome, la date de mise en ligne. **Jamais de nom d'agent ou d'agence, jamais de photo, jamais de description** (le script ne les lit pas).

## 3. Importer et comparer

```bash
npm run marche -- import --date AAAA-MM-JJ --athome <scratchpad>/releve/athome.csv --immotop <scratchpad>/releve/immotop.csv --wortimmo <scratchpad>/releve/wortimmo.csv
npm test
```

Le script :

- met à jour `data/marche/maisons.json` (une fiche par annonce : prix successifs, première et dernière observation, « disparue » quand l'annonce n'est plus en ligne) ;
- garde une copie du relevé (annonces du Luxembourg) dans `data/marche/releves/AAAA-MM-JJ.json` ;
- regroupe les annonces des trois portails en maisons (même commune, surface à 2 m² près, même nombre de chambres et loyer à 3 % près, ou une chambre d'écart et loyer à 1 % près) ;
- écrit `data/marche/communes-maisons.json` et `docs/marche/rapport-maisons-AAAA-MM-JJ.md` : comparaison avec le modèle de l'outil par secteur, par région et par commune. Objectif : **au moins 10 maisons de comparaison par territoire**. Les maisons disparues restent comptées 12 mois. Chaque commune est comparée sur le plus petit territoire qui atteint 10 maisons (la commune, sinon son secteur, sinon sa région, sinon tout le pays).

Le découpage est dans `data/marche/secteurs.json` : 15 secteurs regroupés en 6 régions (Luxembourg-Ville ; couronne de Luxembourg-Ville ; Ouest et Centre ; Sud en 3 secteurs : Sud-Ouest, Esch et Belval, Sud-Est ; Est en 4 secteurs : Moselle sud, Moselle nord, Junglinster et Betzdorf, Mullerthal ; Nord). Chaque commune doit y figurer une seule fois (un test le vérifie). Jason peut déplacer une commune d'un secteur à l'autre : modifier le fichier, puis `npm test` et `npm run marche -- rapport`.

S'il signale des **localités inconnues** : ajouter la correspondance localité → commune dans `src/shared/aliases.ts` **seulement si elle est certaine** (vérifier la commune), puis `npm run marche -- rapport`. En cas de doute, laisser la localité inconnue : elle reste listée dans le rapport.

S'il signale un **relevé incomplet** (moins de la moitié des annonces du relevé précédent pour une source) : les disparitions de cette source ne sont pas comptées cette fois-ci. Le signaler dans le message final.

## 4. Enregistrer

```bash
git add data/marche docs/marche src/shared/aliases.ts
git commit -m "loyer-widget : relevé des maisons du AAAA-MM-JJ"
git push -u origin claude/dazzling-carson-y40amu
```

Fin du message de commit : les lignes d'attribution demandées par la session. Si la session n'a pas le droit de pousser sur cette branche, pousser sur la branche indiquée par la session et le dire.

## 5. Message final (en allemand, court)

- nombre d'annonces lues (atHome, immotop, wortimmo), maisons différentes après regroupement, nouvelles, disparues ;
- secteurs qui ont atteint ou pas les 10 maisons de comparaison (et régions, si une région est sous 10) ;
- communes dont l'écart avec le modèle dépasse ± 10 % **et** qui ont assez de données ;
- crédits Firecrawl utilisés ;
- avertissements (relevé incomplet, localités inconnues, pages manquantes, contrôle) ;
- lien vers le rapport du relevé.

## Ce que le relevé ne permet pas de dire

- Une annonce disparue n'est pas forcément louée (retirée, expirée, louée ailleurs). Son dernier prix est une approximation du loyer conclu, pas un loyer signé.
- La durée en ligne n'est précise qu'à une semaine près (un mois près pour les annonces disparues avant fin novembre 2026). Une maison louée en moins d'une semaine peut ne jamais être vue. La date de mise en ligne d'atHome est gardée dans le CSV (colonne `published`) mais pas encore utilisée par le rapport ; elle peut être remise à zéro quand une agence republie l'annonce.
- Peu de maisons à louer dans plusieurs secteurs (le 18/11/2026 : 4 secteurs sur 15 ont 10 maisons ; Mullerthal 1, Junglinster et Betzdorf 2). Même en cumulant 12 mois, certains n'atteindront peut-être jamais 10 maisons. Leurs communes restent alors comparées sur la région (les 6 régions ont au moins 10 maisons dès le premier relevé ; l'Est tout juste : 10).
- Une même maison peut être annoncée deux fois sur le même portail avec deux loyers (exemple : Roeser, 277 m², 8 500 € et 9 000 € sur immotop le 18/11/2026). Le script ne regroupe pas deux annonces du même portail (deux maisons jumelles identiques sont possibles) : elles comptent deux fois.
- Le modèle de l'outil (`data/references.json` → `maisons`) n'est **pas** modifié automatiquement : un ajustement par commune ne se fait qu'après décision de Jason.
