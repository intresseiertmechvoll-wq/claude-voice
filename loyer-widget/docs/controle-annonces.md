# Contrôle sur des annonces réelles – 17/11/2026

But : vérifier la méthode proposée dans `analyse-donnees.md` (loyers réels du rapport n°24, canton × surface) contre des annonces de location en ligne aujourd'hui.

**Résumé**

- Les annonces confirment le problème des chambres : à Esch-sur-Alzette, atHome affiche **393 annonces** dans la catégorie « appartement », dont **372 chambres** (loyer médian de la 1re page : 905 €, surface médiane 14 m²) et seulement **19** dans le sous-type « appartement ».
- Pour les vrais appartements, les loyers **demandés** aujourd'hui sont en médiane **18 % au-dessus** de la méthode (87 annonces ; Sud : +17 %, 39 annonces).
- L'écart s'explique en bonne partie par ce que la méthode de base ne compte pas encore : **stationnement compris dans le loyer, classe énergétique A/B, meublé, construction récente**. Les appartements simples (ancien, sans parking) tombent presque exactement sur la méthode.
- Les annonces sont très dispersées : seulement **40 %** sont à ± 15 % de la méthode. Une fourchette de ± 8 % est donc trop étroite.

## 1. Données récoltées

| Source | Ce qui a été lu | Remarque |
| --- | --- | --- |
| atHome.lu | Pages de résultats « location appartement » : Dudelange, Bettembourg, Esch-sur-Alzette (tous types et sous-type « appartement »), Differdange, Schifflange, Pétange, Kayl, Luxembourg (sous-type « appartement », 1re page sur 403), Strassen, Ettelbruck, Diekirch, Mersch ; + 8 fiches détaillées | Lecture via Firecrawl ; la page de Dudelange a été contrôlée ligne par ligne contre le texte brut ; les 8 fiches détaillées concordent avec les cartes. |
| immotop.lu | Page de résultats de Dudelange (6 annonces, sans surface sur les cartes) ; pages « prix immobilier » de 6 communes | Les surfaces manquent sur les cartes : pas utilisées dans la comparaison chiffrée. |
| wortimmo.lu | – | Non consulté (temps et crédits limités). |

Fichier : `annonces-controle-2026-11-17.csv` (93 lignes : loyer, surface, chambres, type, localité, lien ; pas de nom d'agent).

**Exclus de la comparaison :** chambres et colocations (dont les unités de 10 à 18 m² d'Esch listées comme « appartement » avec 5 à 8 chambres), biens en France ou en Belgique (Athus, Aubange, Saulnes, Hussigny, Rédange FR), annonces sans surface, un prix de vente publié par erreur en location (Belval, 325 000 €), un bien de 365 m² à 9 125 € (Kayl).

**Limites :** un seul portail, un seul jour, 87 annonces, surtout dans le Sud et à Luxembourg ; peu de données au Nord, à l'Est et en Périphérie. Ce sont des loyers **demandés**, pas signés ; une annonce trop chère reste en ligne plus longtemps, ce qui tire l'échantillon vers le haut.

## 2. Résultat : annonce ÷ méthode

Méthode = celle de `analyse-donnees.md`, sans aucun ajustement (ni énergie, ni parking, ni meublé), avec un facteur de surface **interpolé** (voir 4).

| Groupe | Annonces | Médiane | 1er quartile | 3e quartile | À ± 8 % | À ± 15 % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Tous (appartements et studios) | 87 | **1,18** | 1,09 | 1,33 | 21 % | 40 % |
| Sud (canton d'Esch) | 39 | **1,17** | 1,10 | 1,30 | 26 % | 44 % |
| Luxembourg-Ville | 23 | 1,12 | 1,08 | 1,20 | 17 % | 52 % |
| Luxembourg-Campagne (Strassen) | 19 | 1,29 | 1,23 | 1,34 | 11 % | 21 % |
| Périphérie | 4 | 1,11 | – | – | – | – |
| Nord | 2 | 1,45 | – | – | – | – |
| Dudelange | 9 | 1,11 | 1,01 | 1,28 | 44 % | 67 % |
| Esch-sur-Alzette | 10 | 1,18 | 1,13 | 1,30 | 10 % | 40 % |

Lecture : 1,18 = l'annonce demande 18 % de plus que la méthode.

Exemples à Dudelange :

| Annonce | Surface | Loyer demandé | Méthode | Rapport |
| --- | ---: | ---: | ---: | ---: |
| Appartement 1 ch., 3e étage, sans parking, classe non indiquée | 60 m² | 1 400 € | 1 460 € | 0,96 |
| Appartement 2 ch., 2000, classe **F**, 1 parking | 93 m² | 1 950 € | 1 900 € | 1,03 |
| Appartement 1 ch. | 45 m² | 1 550 € | 1 360 € | 1,14 |
| Appartement 2 ch., classe **A**, **meublé**, terrasse 24 m², **2 parkings** | 85 m² | 2 500 € | 1 810 € | 1,38 |
| Studio | 30 m² | 1 600 € | 960 € | 1,66 |

## 3. Pourquoi les annonces sont plus hautes

Fiches détaillées lues (8 annonces du Sud) :

| Annonce | Rapport | Classe | Parking compris | Meublé | Autre |
| --- | ---: | :---: | :---: | :---: | --- |
| Roeser, 105 m² | 1,66 | B | 2 | ? | terrasse 5 m² |
| Mondercange, 91 m² | 1,44 | B | 1 | ? | 2017, ascenseur, balcon 15,5 m² |
| Bettembourg, 86 m² | 1,48 | B | 1 | ? | 4e étage, ascenseur |
| Esch, 76 m² | 1,36 | B | 1 | oui | 2008 |
| Dudelange, 85 m² | 1,38 | A | 2 | oui | terrasse 24 m² |
| Dudelange, 93 m² | 1,03 | F | 1 | ? | 2000 |
| Dudelange, 60 m² | 0,96 | ? | non | ? | 3e étage |
| Schifflange, 47 m² | 1,01 | A | oui | ? | 2016, rez-de-chaussée |

Ce que je constate : les annonces nettement au-dessus de la méthode sont **récentes (A/B) avec parking compris**, parfois meublées. L'ancien sans extras est au niveau de la méthode. Exception : Schifflange (A, 2016, parking compris, rez-de-chaussée) est lui aussi au niveau de la méthode.
Ce que je suppose : le parking compris vaut environ 100 à 200 € par mois et par place dans le Sud ; la classe A/B, le neuf et le meublé ajoutent chacun quelques pour cent. Huit fiches ne suffisent pas pour chiffrer ces effets : ce seront des **propositions à valider par Jason**.
Ce que je ne sais pas : combien de ces loyers demandés seront effectivement signés. Le rapport n°24 donne 22,59 €/m² pour les baux signés en 2024-2025 dans le Sud ; l'écart avec le demandé n'est pas mesuré pour les appartements seuls.

Studios : la méthode les sous-estime nettement (30 m² → 1,66 ; 28 m² → 1,22 à 1,50 ; 33 m² → 1,32). La classe « moins de 50 m² » du rapport mélange 30 et 49 m², et les studios sont souvent meublés. Proposition : fiabilité « limitée » sous 40 m², ou un supplément studio à valider.

## 4. Correction de la méthode : facteur de surface interpolé

Avec des classes fixes, le loyer **baissait** en passant la limite d'une classe : Esch, 46 m² → 1 477 € mais 50 m² → 1 216 €. Absurde pour un visiteur. Avec l'interpolation : 46 m² → 1 370 €, 50 m² → 1 411 €.

Correction : on place chaque médiane au centre de sa classe (40, 60, 80, 100, 120, 145 m²) et on interpole linéairement entre deux centres. Dudelange : 40 m² → 1 284 €, 45 m² → 1 357 €, 50 m² → 1 411 €, 60 m² → 1 460 €, 80 m² → 1 742 €, 100 m² → 1 970 €. Le loyer monte toujours avec la surface. L'exemple de 80 m² (1 750 €) ne change pas.

## 5. Ce que j'en conclus pour l'outil

1. **La méthode de base tient** pour un appartement standard, ancien, sans parking : c'est le niveau des baux signés récemment, et les annonces simples tombent dessus.
2. **Elle doit être complétée** par des ajustements chiffrés pour le parking (en €/mois par place), la classe énergétique, le meublé et le neuf. Sans eux, l'outil sous-estime les biens récents : 5 des 8 fiches détaillées (A/B avec parking) demandent 36 à 66 % de plus que la méthode. Ce n'est pas un détail : c'est le profil type des biens que Jason voudra gérer.
3. **La fourchette doit être plus large** : environ – 10 % / + 15 % autour du milieu, au lieu de ± 8 %. Même avec des ajustements, les loyers demandés pour des biens semblables varient beaucoup.
4. **Choix à faire par Jason** : afficher le niveau « loyer signé » (prudent, ce que la méthode donne) ou le niveau « loyer demandé en annonce » (environ 15 à 20 % plus haut). Ma recommandation : milieu = loyer signé + ajustements, haut de fourchette = niveau des annonces, et le dire en une phrase dans le résultat.

## 6. Repères immotop (à titre indicatif seulement)

Pages « prix immobilier » d'immotop.lu, octobre 2026, loyer demandé au m², tous biens résidentiels confondus :

| Commune | €/m² | Variation sur un an |
| --- | ---: | ---: |
| Dudelange | 25,71 | + 16,3 % |
| Esch-sur-Alzette | 28,55 | + 7,1 % |
| Schifflange | 30,44 | + 11,5 % |
| Differdange | 28,38 | + 6,5 % |
| Kayl | 27,11 | + 0,3 % |
| Rumelange | 25,29 | – 8,7 % |
| Bettembourg | 22,22 | – 8,4 % |

Peu fiable : la méthode n'est pas publiée ; la valeur d'Esch (28,55) est hors de sa propre fourchette (13,8 à 27,93) ; Dudelange, Schifflange et Rumelange ont exactement la même fourchette (22,22 à 30,44) ; les variations annuelles sautent de – 9 % à + 16 % entre communes voisines. L'ordre de grandeur (22 à 30 €/m² demandés, toutes surfaces) reste cohérent avec la méthode + 15 à 20 %.

---

# Échantillon élargi (même jour, 17/11/2026)

Collecte plus large sur atHome et wortimmo, une seule fois, pour l'analyse (pas de collecte automatique dans l'outil).

| Fichier | Contenu |
| --- | --- |
| `annonces-appartements-athome-2026-11-17.csv` | 40 pages du sous-type « appartement » d'atHome (800 positions sur 2 447 annonces) : 794 annonces uniques, dont 327 au Luxembourg (le reste en France surtout). Chambres et studios exclus par le filtre du site. |
| `annonces-maisons-athome-2026-11-17.csv` | Toutes les annonces de maisons d'atHome (24 pages, 463 annonces), dont 85 au Luxembourg. |
| `annonces-maisons-wortimmo-2026-11-17.csv` | Toutes les annonces de maisons de wortimmo (46), dont 37 au Luxembourg. |
| `maisons-retenues-2026-11-17.csv` | Maisons retenues après nettoyage (84). |
| `analyse-appartements.py`, `analyse-maisons.py` | Calculs reproductibles. |

Contrôle de la lecture automatique : page 1 comparée au texte brut, loyer et surface 20/20 pour les appartements et 18/18 pour les maisons ; page 3 des appartements aussi contrôlée (20/20). Les autres pages ne sont pas contrôlées une à une.

Limites : un jour, surtout atHome ; l'ordre d'affichage d'atHome regroupe les annonces par annonceur, l'échantillon d'appartements n'est donc pas tiré au hasard ; Luxembourg-Ville domine (219 appartements sur 350).

## Appartements : 350 annonces au Luxembourg

Nettoyage : annonces luxembourgeoises seulement, sans prix de vente égaré, surface d'au moins 20 m², loyer d'au moins 500 €, doublons retirés ; les 87 annonces du premier contrôle sont incluses.

| Zone | Annonces | Loyer médian | Surface médiane | €/m² médian | Annonce ÷ méthode | 1er quartile | 3e quartile |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 219 | 2 480 € | 73 m² | 34,15 | **1,15** | 1,06 | 1,28 |
| Luxembourg-Campagne | 50 | 2 550 € | 86 m² | 32,38 | **1,30** | 1,14 | 1,43 |
| Périphérie (Capellen, Mersch) | 17 | 2 550 € | 110 m² | 23,61 | **1,16** | 0,95 | 1,35 |
| Sud (canton d'Esch) | 46 | 1 700 € | 62 m² | 29,48 | **1,18** | 1,10 | 1,30 |
| Est | 10 | 1 725 € | 76 m² | 23,67 | 1,08 | 0,96 | 1,39 |
| Nord | 8 | 1 900 € | 113 m² | 19,59 | 1,18 | 1,05 | 1,39 |
| **Tous** | **350** | 2 400 € | 75 m² | 31,97 | **1,17** | 1,07 | 1,33 |

Par surface, le rapport reste stable : moins de 50 m² 1,22 ; 50–89 m² 1,16 ; 90–129 m² 1,19 ; 130 m² et plus 1,17.

**Lecture :** la méthode « cadastre » (loyers des baux signés en 2024-2025, mis à jour par l'indice) reproduit bien les écarts entre zones et entre surfaces ; les loyers demandés aujourd'hui sont simplement **environ 17 % plus hauts**, partout. C'est cohérent avec ce que dit l'Observatoire (loyers demandés avant négociation, biens récents surreprésentés dans les annonces). Seul Luxembourg-Campagne est nettement au-dessus (1,30) ; avec 50 annonces, surtout à Strassen et Bertrange, je ne corrigerais pas encore.

Contrôle croisé avec un modèle construit uniquement sur les annonces (log(loyer) selon la zone et log(surface)) : 80 m² dans le Sud → 2 116 € ; méthode cadastre × 1,17 → 2 040 €. Les deux approches concordent à 4 % près. Écart typique d'une annonce autour de ce modèle : ± 18 %.

## Maisons : 84 annonces au Luxembourg

atHome (85 au Luxembourg) + wortimmo (37), 32 doublons retirés (même commune, même loyer, même surface). Exclues : sans surface (2), surface d'au moins 400 m² (2, probablement terrain compté), 17 m² à 730 € (Bettembourg), 165 m² à 1 050 € (Herborn, à vérifier), 600 m² à 20 000 € (Itzig).

| Zone | Maisons | Loyer médian | Surface médiane | €/m² médian |
| --- | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 19 | 4 500 € | 200 m² | 24,19 |
| Luxembourg-Campagne | 13 | 3 950 € | 200 m² | 21,67 |
| Périphérie (Capellen, Mersch) | 18 | 3 550 € | 172 m² | 20,26 |
| Sud (canton d'Esch) | 13 | 3 500 € | 180 m² | 18,61 |
| Est | 10 | 3 050 € | 182 m² | 16,89 |
| Nord | 11 | 2 400 € | 140 m² | 17,00 |
| **Tous** | **84** | 3 525 € | | **20,0** |

**Contrôle avec des sources publiées :** Observatoire de l'Habitat, maisons, 1/7/2025 – 30/6/2026 : 712 offres, loyer moyen 3 720 €, 19,77 €/m² (`location-maison-2025-26.xls`, data.public.lu). atHome, rapport T3 2026 (01/10/2026) : loyer annoncé moyen des maisons 3 431 €. Notre échantillon (médiane 20,0 €/m², moyenne 3 896 €) est du même ordre.

Modèle des annonces de maisons : log(loyer) selon la zone et log(surface). Quand la surface double, le loyer monte d'environ 54 % (élasticité 0,62). Écart typique d'une annonce autour du modèle : ± 19 %. Exemples (loyer demandé) :

| Zone | 120 m² | 150 m² | 180 m² | 220 m² |
| --- | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 3 450 € | 4 000 € | 4 450 € | 5 050 € |
| Luxembourg-Campagne | 2 950 € | 3 350 € | 3 750 € | 4 250 € |
| Périphérie | 2 900 € | 3 350 € | 3 750 € | 4 250 € |
| Sud | 2 800 € | 3 250 € | 3 600 € | 4 100 € |
| Est | 2 400 € | 2 750 € | 3 100 € | 3 500 € |
| Nord | 2 000 € | 2 350 € | 2 600 € | 2 950 € |

(arrondi à 50 €)

Limites : 10 à 19 maisons par zone ; ce sont des loyers **demandés** ; il n'existe pas de loyers signés de maisons par région (le rapport n°24 ne donne que la répartition nationale des loyers mensuels de 750 maisons).

## Proposition de fourchette (à valider par Jason)

Même logique pour les deux types de biens :

- **Loyer annoncé typique** (A) : appartements = méthode cadastre × 1,17 ; maisons = modèle des annonces.
- **Bas** = A ÷ 1,17 (niveau des baux réellement signés, mesuré pour les appartements ; pour les maisons, hypothèse du même écart, non mesurée).
- **Haut** = A, puis ajustements du bien (énergie, parking, meublé, état).
- **Milieu** = entre les deux.

Exemple Dudelange, appartement de 80 m², sans ajustement : bas 1 750 €, milieu 1 900 €, haut 2 050 €.
Exemple Sud, maison de 150 m², sans ajustement : bas 2 750 €, milieu 3 000 €, haut 3 250 €.
