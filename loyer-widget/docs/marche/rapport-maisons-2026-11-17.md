# Maisons à louer – relevé du 2026-11-17

Généré par `scripts/marche-maisons.ts`. Suivi depuis le 2026-11-17 (1 relevé). Comparaisons sur les maisons vues depuis le 2025-11-16 (12 mois).

## Ce relevé

- Annonces lues : athome 463, wortimmo 42 (tous pays) ; au Luxembourg : 123.
- Nouvelles annonces : 123. Disparues depuis le relevé précédent (probablement louées ou retirées) : 0.
- Base : 123 annonces, dont 10 exclues des calculs (sans surface, prix aberrant…).
- **Maisons différentes : 84** (112 annonces utilisables ; 28 annonces étaient la même maison sur un autre portail).

**Localités inconnues** (à ajouter dans `src/shared/aliases.ts`, puis relancer) : Koedange

## Objectif : au moins 10 maisons de comparaison par territoire

Découpage : 15 secteurs regroupés en 6 régions (`data/marche/secteurs.json`, à valider par Jason).

Secteurs sous le minimum : Couronne ouest et nord (4), Couronne est et sud (9), Mersch et vallée de l’Alzette (6), Sud-Ouest (Differdange, Pétange) (4), Esch et Belval (9), Sud-Est (Dudelange, Bettembourg) (1), Moselle sud (Remich, Mondorf) (3), Moselle nord (Grevenmacher) (3), Junglinster et Betzdorf (2), Mullerthal (Echternach) (1), Nordstad (Ettelbruck, Diekirch) (2), Éislek (Clervaux, Wiltz, Vianden) (6), Canton de Redange (3). Pour leurs communes, la comparaison se fait sur la région. Les maisons disparues restent comptées 12 mois : le nombre monte au fil des relevés.

### Par secteur

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 20 ✔ | 20 | 0 | 4.500 € | 24,0 | −4 % | — | — |
| Couronne ouest et nord | 4 (manque 6) | 4 | 0 | 4.750 € | 21,7 | — | — | — |
| Couronne est et sud | 9 (manque 1) | 9 | 0 | 3.800 € | 22,8 | — | — | — |
| Canton de Capellen | 11 ✔ | 11 | 0 | 3.900 € | 20,5 | −4 % | — | — |
| Mersch et vallée de l’Alzette | 6 (manque 4) | 6 | 0 | 3.350 € | 21,9 | — | — | — |
| Sud-Ouest (Differdange, Pétange) | 4 (manque 6) | 4 | 0 | 3.575 € | 18,3 | — | — | — |
| Esch et Belval | 9 (manque 1) | 9 | 0 | 3.500 € | 18,6 | — | — | — |
| Sud-Est (Dudelange, Bettembourg) | 1 (manque 9) | 1 | 0 | 3.000 € | 21,4 | — | — | — |
| Moselle sud (Remich, Mondorf) | 3 (manque 7) | 3 | 0 | 2.800 € | 16,5 | — | — | — |
| Moselle nord (Grevenmacher) | 3 (manque 7) | 3 | 0 | 3.150 € | 16,1 | — | — | — |
| Junglinster et Betzdorf | 2 (manque 8) | 2 | 0 | 2.900 € | 15,8 | — | — | — |
| Mullerthal (Echternach) | 1 (manque 9) | 1 | 0 | 2.800 € | 20,7 | — | — | — |
| Nordstad (Ettelbruck, Diekirch) | 2 (manque 8) | 2 | 0 | 2.700 € | 13,7 | — | — | — |
| Éislek (Clervaux, Wiltz, Vianden) | 6 (manque 4) | 6 | 0 | 2.300 € | 16,4 | — | — | — |
| Canton de Redange | 3 (manque 7) | 3 | 0 | 1.700 € | 17,5 | — | — | — |

### Par région

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 20 ✔ | 20 | 0 | 4.500 € | 24,0 | −4 % | — | — |
| Couronne de Luxembourg-Ville | 13 ✔ | 13 | 0 | 3.950 € | 21,7 | +4 % | — | — |
| Ouest et Centre (Capellen, Mersch) | 17 ✔ | 17 | 0 | 3.600 € | 20,5 | −3 % | — | — |
| Sud | 14 ✔ | 14 | 0 | 3.500 € | 19,3 | −5 % | — | — |
| Est | 9 (manque 1) | 9 | 0 | 2.950 € | 16,5 | — | — | — |
| Nord | 11 ✔ | 11 | 0 | 2.400 € | 17,0 | −3 % | — | — |
| **Tout le pays** | 84 ✔ | 84 | 0 | 3.525 € | 20,1 | −3 % | — | — |

## Par commune

Chaque commune est comparée sur le plus petit territoire qui a au moins 10 maisons : la commune elle-même, sinon son secteur, sinon sa région.

| Commune | Secteur | Maisons | Actives | Disparues | Loyer médian | Comparée sur | Écart au modèle | Lecture |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Luxembourg | Luxembourg-Ville | 20 | 20 | 0 | 4.500 € | Luxembourg (20) | −4 % | conforme au modèle (± 5 %), mesuré sur la commune : 20 maisons |
| Niederanven | Couronne est et sud | 6 | 6 | 0 | 3.775 € | Couronne de Luxembourg-Ville (13) | +4 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 13 maisons |
| Mamer | Canton de Capellen | 5 | 5 | 0 | 3.900 € | Canton de Capellen (11) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Canton de Capellen : 11 maisons |
| Esch-sur-Alzette | Esch et Belval | 4 | 4 | 0 | 3.500 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Leudelange | Esch et Belval | 3 | 3 | 0 | 3.250 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Clervaux | Éislek (Clervaux, Wiltz, Vianden) | 2 | 2 | 0 | 2.500 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |
| Differdange | Sud-Ouest (Differdange, Pétange) | 2 | 2 | 0 | 3.650 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Kiischpelt | Éislek (Clervaux, Wiltz, Vianden) | 2 | 2 | 0 | 1.575 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |
| Mersch | Mersch et vallée de l’Alzette | 2 | 2 | 0 | 3.800 € | Ouest et Centre (Capellen, Mersch) (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 17 maisons |
| Mertert | Moselle nord (Grevenmacher) | 2 | 2 | 0 | 4.225 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Sandweiler | Couronne est et sud | 2 | 2 | 0 | 4.000 € | Couronne de Luxembourg-Ville (13) | +4 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 13 maisons |
| Vichten | Canton de Redange | 2 | 2 | 0 | 1.550 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |
| Bech | Mullerthal (Echternach) | 1 | 1 | 0 | 2.800 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Bertrange | Couronne ouest et nord | 1 | 1 | 0 | 5.000 € | Couronne de Luxembourg-Ville (13) | +4 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 13 maisons |
| Bettembourg | Sud-Est (Dudelange, Bettembourg) | 1 | 1 | 0 | 3.000 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Betzdorf | Junglinster et Betzdorf | 1 | 1 | 0 | 2.600 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Dalheim | Moselle sud (Remich, Mondorf) | 1 | 1 | 0 | 3.550 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Dippach | Canton de Capellen | 1 | 1 | 0 | 4.400 € | Canton de Capellen (11) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Canton de Capellen : 11 maisons |
| Erpeldange-sur-Sûre | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 2.600 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |
| Ettelbruck | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 2.800 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |
| Grevenmacher | Moselle nord (Grevenmacher) | 1 | 1 | 0 | 3.150 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Groussbus-Wal | Canton de Redange | 1 | 1 | 0 | 2.950 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |
| Habscht | Canton de Capellen | 1 | 1 | 0 | 3.250 € | Canton de Capellen (11) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Canton de Capellen : 11 maisons |
| Helperknapp | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 2.900 € | Ouest et Centre (Capellen, Mersch) (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 17 maisons |
| Hesperange | Couronne est et sud | 1 | 1 | 0 | 3.800 € | Couronne de Luxembourg-Ville (13) | +4 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 13 maisons |
| Junglinster | Junglinster et Betzdorf | 1 | 1 | 0 | 3.200 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Käerjeng | Sud-Ouest (Differdange, Pétange) | 1 | 1 | 0 | 2.990 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Kehlen | Canton de Capellen | 1 | 1 | 0 | 3.600 € | Canton de Capellen (11) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Canton de Capellen : 11 maisons |
| Koerich | Canton de Capellen | 1 | 1 | 0 | 4.250 € | Canton de Capellen (11) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Canton de Capellen : 11 maisons |
| Kopstal | Canton de Capellen | 1 | 1 | 0 | 5.800 € | Canton de Capellen (11) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Canton de Capellen : 11 maisons |
| Larochette | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 3.500 € | Ouest et Centre (Capellen, Mersch) (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 17 maisons |
| Lintgen | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 3.200 € | Ouest et Centre (Capellen, Mersch) (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 17 maisons |
| Lorentzweiler | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 4.000 € | Ouest et Centre (Capellen, Mersch) (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 17 maisons |
| Mondercange | Esch et Belval | 1 | 1 | 0 | 10.000 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Parc Hosingen | Éislek (Clervaux, Wiltz, Vianden) | 1 | 1 | 0 | 2.750 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |
| Pétange | Sud-Ouest (Differdange, Pétange) | 1 | 1 | 0 | 3.500 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Remich | Moselle sud (Remich, Mondorf) | 1 | 1 | 0 | 2.800 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Sanem | Esch et Belval | 1 | 1 | 0 | 3.350 € | Sud (14) | −5 % | au-dessous du modèle de 5 %, mesuré sur la région Sud : 14 maisons |
| Schengen | Moselle sud (Remich, Mondorf) | 1 | 1 | 0 | 2.500 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur tout le pays : 84 maisons |
| Steinfort | Canton de Capellen | 1 | 1 | 0 | 3.200 € | Canton de Capellen (11) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Canton de Capellen : 11 maisons |
| Steinsel | Couronne ouest et nord | 1 | 1 | 0 | 4.500 € | Couronne de Luxembourg-Ville (13) | +4 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 13 maisons |
| Strassen | Couronne ouest et nord | 1 | 1 | 0 | 5.200 € | Couronne de Luxembourg-Ville (13) | +4 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 13 maisons |
| Walferdange | Couronne ouest et nord | 1 | 1 | 0 | 2.950 € | Couronne de Luxembourg-Ville (13) | +4 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 13 maisons |
| Winseler | Éislek (Clervaux, Wiltz, Vianden) | 1 | 1 | 0 | 2.400 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 11 maisons |

## Comment lire

- « Modèle » = loyer en annonce que donne l'outil pour une maison de même surface dans la même zone de l'Observatoire. « +8 % » = les maisons de ce territoire sont annoncées 8 % plus cher que le modèle.
- « Disparues » = annonces qui ne sont plus en ligne : probablement louées, mais peut-être retirées. Leur dernier prix est ce qui se rapproche le plus d'un loyer conclu. « Écart, disparues » n'apparaît qu'à partir de 3 maisons disparues.
- Une maison annoncée sur plusieurs portails (atHome, immotop, wortimmo) n'est comptée qu'une fois : même commune, surface à 2 m² près, même nombre de chambres et loyer à 3 % près (ou une chambre d'écart et loyer à 1 % près).
- Ce sont des loyers **demandés** : aucune source publique ne donne les loyers signés des maisons par commune.
