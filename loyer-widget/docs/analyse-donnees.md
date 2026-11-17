# Analyse des données de loyer – verlounen.lu (phase 0)

Date de l'analyse : 17/11/2026. Objectif : savoir si les données publiques permettent d'afficher une fourchette de loyer **réaliste** pour un appartement ou une maison, et avec quelle méthode.

**Verdict proposé : GO avec restrictions.**

- Appartements : oui, mais **pas** avec le loyer annoncé au m² par commune (biaisé, voir partie 2). Méthode proposée : loyers réels de l'enquête « cadastre des loyers » (canton × surface), mis à jour avec l'indice officiel des loyers annoncés (partie 5).
- Maisons : **pas de chiffre** dans la V1. Données trop rares (4 communes publiées). Estimation personnelle par Jay.
- Meublé, balcon, parking : aucune donnée officielle. Coefficients à proposer par Jay.

---

## 1. Les données trouvées

### 1.1 Sur data.public.lu (licence CC0, Observatoire de l'Habitat)

Recherche « loyer », « loyers », « location » sur l'API data.public.lu le 17/11/2026 : **3 jeux de données** sur les loyers, tous issus des **annonces** IMMOTOP.LU (loyers demandés, avant négociation). Mise à jour du 24/09/2026, statistiques jusqu'au 2e trimestre 2026.

| Jeu de données | Fichier | Contenu | Couverture |
| --- | --- | --- | --- |
| [Loyers annoncés des logements – Par commune](https://data.public.lu/fr/datasets/loyers-annonces-des-logements-par-commune/) | `location-appartement-2025-26.xls` | Appartements : nombre d'offres, loyer moyen (€/mois), loyer moyen au m², 1/7/2025 – 30/6/2026 | 100 communes listées, **36 avec un prix** (au moins 30 annonces). 9 479 offres. |
| idem | `location-maison-2025-26.xls` | Maisons : mêmes colonnes | **4 communes seulement** (Luxembourg, Mamer, Pétange, Strassen). 712 offres au total. |
| idem | `loyers-annonces-apparts-2009-2025.xls` | Série par commune et par année civile, 2009 à 2025 | Comme ci-dessus, une feuille par année |
| [Loyers annoncés – Luxembourg-Ville, par quartier](https://data.public.lu/fr/datasets/loyers-annonces-des-logements-a-luxembourg-ville-par-quartier/) | `vdl-location-appartements-2025-26.xlsx`, `vdl-location-maisons-2025-26.xlsx` | Par quartier de la Ville | 23 quartiers ; maisons : 6 quartiers publiés |
| [Loyers annoncés des logements](https://data.public.lu/fr/datasets/loyers-annonces-des-logements/) | `serie-retrospective-euros-courants.xls` | **Indice** trimestriel national (base 100 = T1 2005) : location d'appartements, location de maisons | National, 2005 – T2 2026 |

**Aucune donnée par nombre de chambres ou par taille** sur data.public.lu. Pas de méthodologie détaillée (PDF) dans ces jeux de données ; seule la description indique la source (annonces IMMOTOP.LU) et le seuil de 30 annonces.

Format : identique à celui déjà lu par `estimation-widget/scripts/update-data.ts` pour les appartements. Deux différences à connaître : le fichier « maisons » ne liste que les 4 communes publiées (pas les 100) ; le fichier des quartiers « maisons » publie des quartiers avec seulement 11 à 18 annonces (seuil différent de 30). Sans conséquence ici, ces fichiers ne seront pas utilisés.

### 1.2 Publications de l'Observatoire de l'Habitat (hors data.public.lu)

| Publication | Ce qu'elle apporte |
| --- | --- |
| **Rapport d'analyse n°24 « Le cadastre des loyers – Premiers résultats »** (Observatoire de l'Habitat / LISER, 05/06/2026), [page](https://logement.public.lu/fr/publications/observatoire/rapport-analyse-24.html), [PDF](https://liser.elsevierpure.com/files/81560225/rapport-analyse-24_regulation_des_loyers.pdf) | **Loyers réellement payés** (hors charges), enquête d'octobre–novembre 2025 auprès de 27 889 multipropriétaires, 5 116 réponses complètes, **4 514 appartements** et 750 maisons. Tableaux : loyer médian au m² par canton, par zone × **classe de surface**, par zone × classe énergétique, par zone × date d'entrée du locataire, et comparaison avec les loyers annoncés. Meublés et locations de courte durée **exclus**. |
| **Le Logement en chiffres n°20** (STATEC et Observatoire, 24/09/2026), [PDF](https://statistiques.public.lu/dam-assets/catalogue-publications/logement-en-chiffres/2026/logement-en-chiffre-2026-02.pdf), [communiqué](https://gouvernement.lu/fr/actualites/toutes_actualites/communiques/2026/09-septembre/24-logement-en-chiffres-n20.html) | Loyers annoncés des appartements : +5,8 % sur un an au T2 2026. **Chambres meublées : environ 14 % des annonces**, contre moins de 3 % au début des années 2010, « fortement concentré dans la Ville de Luxembourg et dans le sud du pays ». |
| [Simulateur des loyers](https://logement.public.lu/fr/observatoire-habitat/prix-de-location/simulateur.html) de l'Observatoire (mis à jour le 24/09/2026) | Modèle **hédonique** sur les annonces IMMOTOP.LU du 1/7/2025 au 30/6/2026, **appartements seulement**, 100 communes. Entrées : commune, type (standard, studio, duplex…), chambres, surface, balcon/terrasse, jardin, garages, parkings. Fourchette = intervalle de confiance à 90 %. Les coefficients ne sont **pas** publiés en données ouvertes. |

Pas trouvé : une grille officielle de « loyers de référence ». Le rapport n°24 annonce qu'elle fera l'objet du prochain rapport ; le rapport n°25 publié depuis porte sur le marché de la vente (T1 2026). Je n'ai pas trouvé de grille publiée au 17/11/2026.

---

## 2. Pourquoi Esch-sur-Alzette est si haut

### 2.1 Le calcul qui révèle le problème

Le fichier donne pour chaque commune le **loyer moyen** (€/mois) et le **loyer moyen au m²**. En divisant l'un par l'autre, on obtient une « surface implicite » : l'ordre de grandeur de la surface des biens annoncés.

| Commune | Offres | Loyer moyen | €/m² annoncé | Surface implicite |
| --- | ---: | ---: | ---: | ---: |
| Mondercange | 59 | 936 € | 50,88 | **18 m²** |
| Käerjeng | 119 | 974 € | 42,33 | **23 m²** |
| Esch-sur-Alzette | 623 | 1 088 € | 45,37 | **24 m²** |
| Leudelange | 80 | 1 150 € | 45,65 | **25 m²** |
| Mamer | 229 | 1 265 € | 46,41 | **27 m²** |
| Luxembourg | 5 655 | 2 032 € | 50,17 | 41 m² |
| Dudelange | 111 | 1 665 € | 30,37 | 55 m² |
| Differdange | 134 | 1 431 € | 30,89 | 46 m² |
| Bettembourg | 39 | 1 593 € | 32,81 | 49 m² |
| Clervaux | 70 | 1 401 € | 18,11 | 77 m² |
| **Moyenne nationale** | 9 479 | 1 843 € | 44,20 | 42 m² |

Un loyer moyen de 936 € à 1 088 € et une surface implicite de 18 à 25 m² : ce ne sont pas des appartements classiques, ce sont surtout des **chambres** (colocation, coliving, chambres meublées) et des studios. Une chambre de 15 m² louée 900 € pèse 60 €/m² dans la moyenne.

### 2.2 La confirmation officielle

Le rapport n°24 de l’Observatoire (section 4, comparaison avec les loyers annoncés) l’écrit noir sur blanc :

> « Certaines surfaces de coliving et des chambres meublées sont incluses dans les loyers annoncés moyens des logements (malgré les efforts pour identifier et retirer ces logements des statistiques) […] »

Et pour Esch en particulier : « dans les communes les plus urbanisées (Luxembourg-Ville, Esch-sur-Alzette), les loyers par m² plus élevés s'expliquent également par des surfaces de logement en moyenne plus petites. »

Ce que je **sais** : les chambres meublées font environ 14 % des annonces nationales et sont concentrées à Luxembourg et dans le Sud (Logement en chiffres n°20) ; certaines sont dans les moyennes par commune (rapport n°24).
Ce que je **suppose** : à Esch, Mondercange et Käerjeng, leur part est bien plus forte que 14 % (campus de Belval à Esch et Sanem/Mondercange, résidences de coliving). Les surfaces implicites le suggèrent fortement, mais le fichier ne permet pas de le prouver commune par commune.

### 2.3 L'effet grandit avec le temps

| | 2018 | 2025 | Évolution |
| --- | ---: | ---: | ---: |
| €/m² annoncé moyen national | 24,49 | 39,66 | **+62 %** |
| Loyer moyen annoncé national (€/mois) | 1 611 € | 1 800 € | +12 % |
| Indice officiel des loyers annoncés d'appartements (moyenne annuelle, base 2005) | 164,7 | 198,6 | **+21 %** |
| Esch : €/m² annoncé | 19,92 | 41,36 | +108 % |
| Esch : surface implicite | 56 m² | 28 m² | divisée par 2 |

L'indice officiel (qui corrige les changements de composition) monte de 21 %. Le €/m² moyen monte de 62 %. L'écart vient du mélange des biens, pas du marché. Même chose à Bertrange : loyer moyen stable (1 940 € en 2025 comme en 2023), mais €/m² de 27,44 à 48,67.

### 2.4 Comparaison avec les loyers réellement payés

Rapport n°24, graphique 10 (2025, €/m² par mois, hors charges) :

| Zone | Tous les baux en cours | Baux conclus en 2024 ou 2025 | Loyers annoncés |
| --- | ---: | ---: | ---: |
| Luxembourg-Ville | 26,47 | 30,00 | 45,42 |
| Luxembourg-Campagne | 22,54 | 25,38 | 36,22 |
| **Sud (canton d'Esch, Dudelange compris)** | 19,39 | **22,59** | 31,52 |
| Périphérie (Capellen, Mersch) | 18,34 | 21,50 | 28,87 |
| Est | 16,82 | 19,69 | 21,82 |
| Nord | 15,99 | 17,76 | 19,15 |
| National | 21,59 | 24,44 | 39,66 |

Les baux récents du Sud se signent autour de **22,6 €/m²**, loin des 30,37 (Dudelange) et 45,37 (Esch) annoncés. Une partie de l'écart est normale (prix demandé avant négociation, petits biens plus nombreux dans les annonces), le reste vient des chambres.

**Conséquence :** multiplier le €/m² annoncé de la commune par la surface donnerait des loyers beaucoup trop hauts. Exemple : 80 m² à Dudelange → 30,37 × 80 = **2 430 €/mois**, contre environ 1 750 € avec la méthode proposée (partie 5). Pour Esch, 80 m² → 3 630 € : irréaliste.

---

## 3. Données par taille

- **data.public.lu** : rien par taille ni par nombre de chambres.
- **Rapport n°24** : oui, loyers réels médians par **zone × classe de surface** (tableau ci-dessous). C'est la clé d'une fourchette juste.
- **Simulateur officiel** : tient compte de la surface, du type (studio…) et des chambres, mais ses coefficients ne sont pas publics.

Rapport n°24, graphique 7 : loyer médian au m² des appartements en 2025, tous baux en cours (€/m²) :

| Zone | < 50 m² | 50–69 | 70–89 | 90–109 | 110–129 | ≥ 130 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 35,0 | 27,5 | 22,8 | 21,3 | 22,0 | 20,4 |
| Luxembourg-Campagne | 31,1 | 25,4 | 21,4 | 19,0 | 17,5 | 17,2 |
| Périphérie | 28,5 | 19,5 | 18,3 | 17,4 | 13,6 | 15,0 |
| Sud | 26,4 | 20,0 | 17,9 | 16,2 | 15,5 | 12,6 |
| Est | 21,2 | 18,6 | 16,5 | 13,8 | 13,8 | 12,1 |
| Nord | 20,0 | 17,0 | 15,1 | 14,3 | 12,8 | 12,8 |
| National | 30,0 | 22,4 | 19,1 | 17,8 | 16,8 | 15,7 |

Le même rapport donne aussi le loyer médian au m² par **canton** (Luxembourg-Ville 25,56 ; Luxembourg-Campagne 22,22 ; Esch-sur-Alzette 19,12 ; Capellen 18,67 ; Remich 17,86 ; Mersch 17,50 ; Vianden 17,20 ; Grevenmacher 16,27 ; Diekirch 16,14 ; Wiltz 16,01 ; Clervaux 15,56 ; Echternach 13,59 ; Redange 13,57 ; national 20,54) et par **classe énergétique** (Sud : A 23,4 ; B 20,0 ; C 17,8 ; D 17,2 ; E 17,5 ; F–H 16,7 ; inconnue 18,1).

Limite : le nombre de réponses par canton n'est pas publié. Pour les petits cantons (Vianden, Redange, Echternach), la médiane repose probablement sur peu de logements (je suppose, non vérifié).

---

## 4. Maisons

- Loyers annoncés : 4 communes publiées, 712 offres dans tout le pays sur 12 mois, moyenne nationale 3 720 €/mois (19,77 €/m², surface implicite 188 m²).
- Rapport n°24 : 750 maisons, mais seulement une répartition des loyers mensuels (30 % au-dessus de 2 500 €, 15 % sous 1 000 €). **Aucun loyer au m² par zone ou par surface.**
- Logement en chiffres n°20 : l'indice des maisons est « plus volatil », –3,1 % sur un an.

**Proposition : pas de chiffre pour les maisons dans la V1.** Le visiteur décrit sa maison, Jay donne une estimation personnelle (comme les communes « sans données » dans l'outil d'estimation).

---

## 5. Méthode proposée (appartements)

Toutes les communes passent par leur **canton** (Luxembourg-Ville à part, comme dans le rapport). Les 100 communes ont donc une estimation, mais **deux communes du même canton donnent le même loyer** à bien égal (par ex. Dudelange, Kayl et Esch). C'est la principale limite, à dire honnêtement dans le résultat (« niveau du canton »).

```
loyer au m² = médiane du canton                                    (rapport n°24, graphique 5)
            × facteur surface   = médiane zone × classe de surface ÷ médiane de la zone   (graphique 7)
            × facteur bail récent = baux 2024-2025 ÷ tous les baux, de la zone          (graphique 10)
            × mise à jour indice = dernier indice trimestriel ÷ moyenne 2024-2025      (data.public.lu, CC0)
            × ajustements du bien (énergie, état, meublé, extérieur, parking)          (params.json, à valider par Jay)
loyer mensuel = loyer au m² × surface, arrondi à 50 €
fourchette : basse / milieu / haute autour de ce loyer (écart à fixer, par ex. ± 8 %)
```

### Exemple à la main : Dudelange, appartement de 80 m², classe énergétique D, bon état, non meublé

1. Médiane du canton d'Esch-sur-Alzette : **19,12 €/m²** (zone Sud = canton d'Esch).
2. Facteur surface : 80 m² est dans la classe 70–89 ; Sud 70–89 = 17,9 ; 17,9 ÷ 19,12 = **0,936**.
3. Facteur bail récent : Sud 22,59 ÷ 19,39 = **1,165**.
4. Mise à jour : indice T2 2026 = 206,49 ; moyenne 2024-2025 = 197,79 ; 206,49 ÷ 197,79 = **1,044**.
5. 19,12 × 0,936 × 1,165 × 1,044 = **21,77 €/m²** ; × 80 m² = 1 741 € → **1 750 €/mois** (milieu).
6. Avec ± 8 % : environ **1 600 € à 1 900 €**.

Pour comparer : la méthode « €/m² annoncé de la commune » donnerait 2 430 €.

Ordre de grandeur plausible pour un 2 chambres à Dudelange, à mon avis, mais **non vérifié** contre des annonces réelles. Vérification simple que Jay peut faire : saisir 3 à 5 biens qu'il connaît (loués récemment) dans l'outil et dans le simulateur officiel de l'Observatoire, et comparer.

### Fiabilité affichée (proposition)

| Niveau | Quand |
| --- | --- |
| Bonne | Luxembourg-Ville, Luxembourg-Campagne, canton d'Esch, et surface entre 40 et 130 m² |
| Moyenne | Autres cantons, surface entre 40 et 130 m² |
| Limitée | Vianden, Redange, Echternach, Wiltz, Clervaux (marchés plus petits), ou surface < 40 m² ou > 130 m², ou duplex/penthouse |

L'outil peut aussi afficher le **nombre d'annonces de location dans la commune** sur 12 mois (donnée publiée pour les 100 communes, même quand le prix est masqué) : utile pour parler de la demande sans afficher un prix biaisé.

### Ce que la méthode ne couvre pas (à fixer par Jay, marqué « proposition »)

- **Meublé** : exclu de l'enquête ; aucune donnée officielle pour un appartement entier meublé.
- **Balcon / terrasse, parking / garage, étage / ascenseur** : non publiés par zone. Le simulateur officiel les utilise, mais ses coefficients ne sont pas publics.
- **Classe énergétique** : l'écart brut A / F–H est de 35 à 40 % au niveau national, mais le rapport précise qu'il mélange l'effet de l'âge et de la localisation (les logements A sont récents et souvent loués récemment, déjà compté dans le facteur bail récent). Il faut donc un coefficient bien plus faible que l'écart brut.

### Mise à jour des données

- Indice trimestriel (data.public.lu, CC0) : automatique, comme `update-data.ts` dans l'outil d'estimation.
- Tableaux du rapport n°24 : saisis à la main dans un fichier JSON, avec la source et la page. À revoir à chaque nouveau rapport de l'Observatoire (en particulier la future grille de loyers de référence, qui pourrait remplacer cette méthode).
- Licence : le rapport n'est pas sous CC0 comme data.public.lu. On reprend une trentaine de chiffres statistiques, avec la source citée. Je suppose que c'est sans problème, mais ce n'est pas vérifié juridiquement.

---

## 6. Risques principaux

1. **Précision au niveau du canton seulement.** Dans le canton d'Esch, Dudelange, Esch, Rumelange et Leudelange ont le même niveau de départ. Jay connaît mieux les écarts locaux ; il peut ajouter plus tard un petit ajustement par commune (à justifier).
2. **Combinaison de tableaux publiés séparément.** Les facteurs surface et bail récent sont multipliés comme s'ils étaient indépendants ; ce n'est qu'une approximation. Le rapport mélange aussi médianes (graphiques 5 et 7) et moyennes (graphique 10).
3. **Données de fin 2025 mises à jour par un indice national.** Si les loyers évoluent différemment selon les régions, l'écart grandit avec le temps.

---

## Sources

- data.public.lu, API `https://data.public.lu/api/1/datasets/?q=loyer`, consultée le 17/11/2026 ; fichiers téléchargés le 17/11/2026 (versions du 24/09/2026 et du 26/03/2026).
- Observatoire de l'Habitat (2026), *Rapport d'analyse n°24 : Le cadastre des loyers – Premiers résultats*, 05/06/2026 : graphiques 5, 6, 7, 8, 9, 10 et texte de la section 4.
- STATEC et Observatoire de l'Habitat (2026), *Le Logement en chiffres n°20*, 24/09/2026 : « Focus sur… les évolutions récentes des loyers annoncés ».
- Observatoire de l'Habitat, *Simulateur des loyers*, page consultée le 17/11/2026.
