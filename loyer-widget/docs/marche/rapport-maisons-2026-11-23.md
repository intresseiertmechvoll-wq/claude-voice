# Maisons à louer – relevé du 2026-11-23

Généré par `scripts/marche-maisons.ts`. Suivi depuis le 2026-11-17 (3 relevés). Comparaisons sur les maisons vues depuis le 2025-11-22 (12 mois).

## Ce relevé

- Annonces lues : athome 488, immotop 88, wortimmo 54 (tous pays) ; au Luxembourg : 224.
- Nouvelles annonces : 36. Disparues depuis le relevé précédent (probablement louées ou retirées) : 26.
- Base : 250 annonces, dont 23 exclues des calculs (sans surface, prix aberrant…).
- **Maisons différentes : 124** (227 annonces utilisables ; 103 annonces étaient la même maison sur un autre portail).

## Objectif : au moins 10 maisons de comparaison par territoire

Découpage : 15 secteurs regroupés en 6 régions (`data/marche/secteurs.json`, à valider par Jason).

Secteurs sous le minimum : Couronne ouest et nord (8), Mersch et vallée de l’Alzette (8), Sud-Ouest (Differdange, Pétange) (5), Sud-Est (Dudelange, Bettembourg) (5), Moselle sud (Remich, Mondorf) (5), Moselle nord (Grevenmacher) (3), Junglinster et Betzdorf (2), Mullerthal (Echternach) (1), Nordstad (Ettelbruck, Diekirch) (5), Éislek (Clervaux, Wiltz, Vianden) (6), Canton de Redange (5). Pour leurs communes, la comparaison se fait sur la région. Les maisons disparues restent comptées 12 mois : le nombre monte au fil des relevés.

### Par secteur

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 31 ✔ | 29 | 2 | 5.000 € | 23,9 | +0 % | — | 6 |
| Couronne ouest et nord | 8 (manque 2) | 6 | 2 | 3.900 € | 21,7 | — | — | 5.5 |
| Couronne est et sud | 13 ✔ | 11 | 2 | 3.700 € | 22,8 | −2 % | — | 6 |
| Canton de Capellen | 17 ✔ | 15 | 2 | 3.500 € | 20,5 | −5 % | — | 5.5 |
| Mersch et vallée de l’Alzette | 8 (manque 2) | 8 | 0 | 3.750 € | 21,9 | — | — | — |
| Sud-Ouest (Differdange, Pétange) | 5 (manque 5) | 5 | 0 | 3.650 € | 16,6 | — | — | — |
| Esch et Belval | 10 ✔ | 10 | 0 | 3.425 € | 20,7 | −4 % | — | — |
| Sud-Est (Dudelange, Bettembourg) | 5 (manque 5) | 5 | 0 | 3.000 € | 21,4 | — | — | — |
| Moselle sud (Remich, Mondorf) | 5 (manque 5) | 3 | 2 | 2.800 € | 16,5 | — | — | 5.5 |
| Moselle nord (Grevenmacher) | 3 (manque 7) | 2 | 1 | 3.150 € | 16,1 | — | — | 6 |
| Junglinster et Betzdorf | 2 (manque 8) | 1 | 1 | 2.900 € | 15,8 | — | — | 6 |
| Mullerthal (Echternach) | 1 (manque 9) | 1 | 0 | 2.800 € | 20,7 | — | — | — |
| Nordstad (Ettelbruck, Diekirch) | 5 (manque 5) | 5 | 0 | 2.600 € | 13,9 | — | — | — |
| Éislek (Clervaux, Wiltz, Vianden) | 6 (manque 4) | 6 | 0 | 2.300 € | 16,4 | — | — | — |
| Canton de Redange | 5 (manque 5) | 2 | 3 | 1.700 € | 17,5 | — | −6 % | 5 |

### Par région

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 31 ✔ | 29 | 2 | 5.000 € | 23,9 | +0 % | — | 6 |
| Couronne de Luxembourg-Ville | 21 ✔ | 17 | 4 | 3.700 € | 21,7 | −1 % | +13 % | 6 |
| Ouest et Centre (Capellen, Mersch) | 25 ✔ | 23 | 2 | 3.500 € | 20,5 | −4 % | — | 5.5 |
| Sud | 20 ✔ | 20 | 0 | 3.500 € | 19,3 | −9 % | — | — |
| Est | 11 ✔ | 7 | 4 | 2.950 € | 16,5 | −6 % | −6 % | 6 |
| Nord | 16 ✔ | 13 | 3 | 2.300 € | 17,1 | −3 % | −6 % | 5 |
| **Tout le pays** | 124 ✔ | 109 | 15 | 3.500 € | 20,5 | −3 % | −6 % | 6 |

## Par commune

Chaque commune est comparée sur le plus petit territoire qui a au moins 10 maisons : la commune elle-même, sinon son secteur, sinon sa région.

| Commune | Secteur | Maisons | Actives | Disparues | Loyer médian | Comparée sur | Écart au modèle | Lecture |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Luxembourg | Luxembourg-Ville | 31 | 29 | 2 | 5.000 € | Luxembourg (31) | +0 % | conforme au modèle (± 5 %), mesuré sur la commune : 31 maisons |
| Niederanven | Couronne est et sud | 7 | 5 | 2 | 3.950 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Mamer | Canton de Capellen | 6 | 5 | 1 | 3.700 € | Canton de Capellen (17) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 17 maisons |
| Esch-sur-Alzette | Esch et Belval | 4 | 4 | 0 | 3.500 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Strassen | Couronne ouest et nord | 4 | 2 | 2 | 3.800 € | Couronne de Luxembourg-Ville (21) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 21 maisons |
| Vichten | Canton de Redange | 4 | 1 | 3 | 1.550 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Differdange | Sud-Ouest (Differdange, Pétange) | 3 | 3 | 0 | 3.650 € | Sud (20) | −9 % | au-dessous du modèle de 9 %, mesuré sur la région Sud : 20 maisons |
| Dippach | Canton de Capellen | 3 | 3 | 0 | 3.500 € | Canton de Capellen (17) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 17 maisons |
| Habscht | Canton de Capellen | 3 | 2 | 1 | 3.000 € | Canton de Capellen (17) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 17 maisons |
| Leudelange | Esch et Belval | 3 | 3 | 0 | 3.250 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Mersch | Mersch et vallée de l’Alzette | 3 | 3 | 0 | 4.800 € | Ouest et Centre (Capellen, Mersch) (25) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 25 maisons |
| Sandweiler | Couronne est et sud | 3 | 3 | 0 | 3.700 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Clervaux | Éislek (Clervaux, Wiltz, Vianden) | 2 | 2 | 0 | 2.500 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Dalheim | Moselle sud (Remich, Mondorf) | 2 | 1 | 1 | 3.275 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Dudelange | Sud-Est (Dudelange, Bettembourg) | 2 | 2 | 0 | 2.525 € | Sud (20) | −9 % | au-dessous du modèle de 9 %, mesuré sur la région Sud : 20 maisons |
| Hesperange | Couronne est et sud | 2 | 2 | 0 | 3.000 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Kiischpelt | Éislek (Clervaux, Wiltz, Vianden) | 2 | 2 | 0 | 1.575 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Kopstal | Canton de Capellen | 2 | 2 | 0 | 4.800 € | Canton de Capellen (17) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 17 maisons |
| Mertert | Moselle nord (Grevenmacher) | 2 | 1 | 1 | 4.225 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Reisdorf | Nordstad (Ettelbruck, Diekirch) | 2 | 2 | 0 | 2.150 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Roeser | Sud-Est (Dudelange, Bettembourg) | 2 | 2 | 0 | 8.750 € | Sud (20) | −9 % | au-dessous du modèle de 9 %, mesuré sur la région Sud : 20 maisons |
| Schengen | Moselle sud (Remich, Mondorf) | 2 | 1 | 1 | 2.500 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Walferdange | Couronne ouest et nord | 2 | 2 | 0 | 3.175 € | Couronne de Luxembourg-Ville (21) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 21 maisons |
| Bech | Mullerthal (Echternach) | 1 | 1 | 0 | 2.800 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Bertrange | Couronne ouest et nord | 1 | 1 | 0 | 5.000 € | Couronne de Luxembourg-Ville (21) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 21 maisons |
| Bettembourg | Sud-Est (Dudelange, Bettembourg) | 1 | 1 | 0 | 3.000 € | Sud (20) | −9 % | au-dessous du modèle de 9 %, mesuré sur la région Sud : 20 maisons |
| Betzdorf | Junglinster et Betzdorf | 1 | 0 | 1 | 2.600 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Erpeldange-sur-Sûre | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 2.600 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Ettelbruck | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 2.800 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Fischbach | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 4.500 € | Ouest et Centre (Capellen, Mersch) (25) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 25 maisons |
| Grevenmacher | Moselle nord (Grevenmacher) | 1 | 1 | 0 | 3.150 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Groussbus-Wal | Canton de Redange | 1 | 1 | 0 | 2.950 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Helperknapp | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 2.900 € | Ouest et Centre (Capellen, Mersch) (25) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 25 maisons |
| Junglinster | Junglinster et Betzdorf | 1 | 1 | 0 | 3.200 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Käerjeng | Sud-Ouest (Differdange, Pétange) | 1 | 1 | 0 | 2.990 € | Sud (20) | −9 % | au-dessous du modèle de 9 %, mesuré sur la région Sud : 20 maisons |
| Kehlen | Canton de Capellen | 1 | 1 | 0 | 3.600 € | Canton de Capellen (17) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 17 maisons |
| Koerich | Canton de Capellen | 1 | 1 | 0 | 4.250 € | Canton de Capellen (17) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 17 maisons |
| Larochette | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 3.500 € | Ouest et Centre (Capellen, Mersch) (25) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 25 maisons |
| Lintgen | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 3.200 € | Ouest et Centre (Capellen, Mersch) (25) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 25 maisons |
| Lorentzweiler | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 4.000 € | Ouest et Centre (Capellen, Mersch) (25) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 25 maisons |
| Mondercange | Esch et Belval | 1 | 1 | 0 | 10.000 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Parc Hosingen | Éislek (Clervaux, Wiltz, Vianden) | 1 | 1 | 0 | 2.750 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Pétange | Sud-Ouest (Differdange, Pétange) | 1 | 1 | 0 | 3.500 € | Sud (20) | −9 % | au-dessous du modèle de 9 %, mesuré sur la région Sud : 20 maisons |
| Reckange-sur-Mess | Esch et Belval | 1 | 1 | 0 | 800 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Remich | Moselle sud (Remich, Mondorf) | 1 | 1 | 0 | 2.800 € | Est (11) | −6 % | au-dessous du modèle de 6 %, mesuré sur la région Est : 11 maisons |
| Sanem | Esch et Belval | 1 | 1 | 0 | 3.350 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Schieren | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 3.600 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |
| Steinfort | Canton de Capellen | 1 | 1 | 0 | 3.200 € | Canton de Capellen (17) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 17 maisons |
| Steinsel | Couronne ouest et nord | 1 | 1 | 0 | 4.500 € | Couronne de Luxembourg-Ville (21) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 21 maisons |
| Weiler-la-Tour | Couronne est et sud | 1 | 1 | 0 | 2.900 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Winseler | Éislek (Clervaux, Wiltz, Vianden) | 1 | 1 | 0 | 2.400 € | Nord (16) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 16 maisons |

## Comment lire

- « Modèle » = loyer en annonce que donne l'outil pour une maison de même surface dans la même zone de l'Observatoire. « +8 % » = les maisons de ce territoire sont annoncées 8 % plus cher que le modèle.
- « Disparues » = annonces qui ne sont plus en ligne : probablement louées, mais peut-être retirées. Leur dernier prix est ce qui se rapproche le plus d'un loyer conclu. « Écart, disparues » n'apparaît qu'à partir de 3 maisons disparues.
- Une maison annoncée sur plusieurs portails (atHome, immotop, wortimmo) n'est comptée qu'une fois : même commune, surface à 2 m² près, même nombre de chambres et loyer à 3 % près (ou une chambre d'écart et loyer à 1 % près).
- Ce sont des loyers **demandés** : aucune source publique ne donne les loyers signés des maisons par commune.
