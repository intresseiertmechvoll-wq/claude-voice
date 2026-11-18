# Maisons à louer – relevé du 2026-11-18

Généré par `scripts/marche-maisons.ts`. Suivi depuis le 2026-11-17 (2 relevés). Comparaisons sur les maisons vues depuis le 2025-11-17 (12 mois).

## Ce relevé

- Annonces lues : immotop 91 (tous pays) ; au Luxembourg : 91.
- Nouvelles annonces : 91. Disparues depuis le relevé précédent (probablement louées ou retirées) : 0.
- Base : 214 annonces, dont 22 exclues des calculs (sans surface, prix aberrant…).
- **Maisons différentes : 111** (191 annonces utilisables ; 80 annonces étaient la même maison sur un autre portail).

**Avertissements :**
- athome : pas relevé cette fois ; disparitions non comptées pour cette source
- wortimmo : pas relevé cette fois ; disparitions non comptées pour cette source

**Localités inconnues** (à ajouter dans `src/shared/aliases.ts`, puis relancer) : Koedange

## Objectif : au moins 10 maisons de comparaison par territoire

Découpage : 15 secteurs regroupés en 6 régions (`data/marche/secteurs.json`, à valider par Jason).

Secteurs sous le minimum : Couronne ouest et nord (6), Mersch et vallée de l’Alzette (7), Sud-Ouest (Differdange, Pétange) (4), Sud-Est (Dudelange, Bettembourg) (3), Moselle sud (Remich, Mondorf) (4), Moselle nord (Grevenmacher) (3), Junglinster et Betzdorf (2), Mullerthal (Echternach) (1), Nordstad (Ettelbruck, Diekirch) (4), Éislek (Clervaux, Wiltz, Vianden) (6), Canton de Redange (5). Pour leurs communes, la comparaison se fait sur la région. Les maisons disparues restent comptées 12 mois : le nombre monte au fil des relevés.

### Par secteur

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 27 ✔ | 27 | 0 | 5.000 € | 24,2 | −1 % | — | — |
| Couronne ouest et nord | 6 (manque 4) | 6 | 0 | 4.450 € | 21,7 | — | — | — |
| Couronne est et sud | 13 ✔ | 13 | 0 | 3.700 € | 22,8 | −2 % | — | — |
| Canton de Capellen | 16 ✔ | 16 | 0 | 3.550 € | 20,3 | −5 % | — | — |
| Mersch et vallée de l’Alzette | 7 (manque 3) | 7 | 0 | 3.500 € | 20,0 | — | — | — |
| Sud-Ouest (Differdange, Pétange) | 4 (manque 6) | 4 | 0 | 3.575 € | 18,3 | — | — | — |
| Esch et Belval | 10 ✔ | 10 | 0 | 3.425 € | 20,7 | −4 % | — | — |
| Sud-Est (Dudelange, Bettembourg) | 3 (manque 7) | 3 | 0 | 8.500 € | 30,7 | — | — | — |
| Moselle sud (Remich, Mondorf) | 4 (manque 6) | 4 | 0 | 2.900 € | 18,8 | — | — | — |
| Moselle nord (Grevenmacher) | 3 (manque 7) | 3 | 0 | 3.150 € | 16,1 | — | — | — |
| Junglinster et Betzdorf | 2 (manque 8) | 2 | 0 | 2.900 € | 15,8 | — | — | — |
| Mullerthal (Echternach) | 1 (manque 9) | 1 | 0 | 2.800 € | 20,7 | — | — | — |
| Nordstad (Ettelbruck, Diekirch) | 4 (manque 6) | 4 | 0 | 2.700 € | 15,5 | — | — | — |
| Éislek (Clervaux, Wiltz, Vianden) | 6 (manque 4) | 6 | 0 | 2.300 € | 16,4 | — | — | — |
| Canton de Redange | 5 (manque 5) | 5 | 0 | 1.700 € | 17,5 | — | — | — |

### Par région

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 27 ✔ | 27 | 0 | 5.000 € | 24,2 | −1 % | — | — |
| Couronne de Luxembourg-Ville | 19 ✔ | 19 | 0 | 3.800 € | 21,7 | −1 % | — | — |
| Ouest et Centre (Capellen, Mersch) | 23 ✔ | 23 | 0 | 3.500 € | 20,0 | −4 % | — | — |
| Sud | 17 ✔ | 17 | 0 | 3.500 € | 21,4 | −3 % | — | — |
| Est | 10 ✔ | 10 | 0 | 2.975 € | 16,9 | −3 % | — | — |
| Nord | 15 ✔ | 15 | 0 | 2.400 € | 17,1 | −3 % | — | — |
| **Tout le pays** | 111 ✔ | 111 | 0 | 3.500 € | 20,6 | −3 % | — | — |

## Par commune

Chaque commune est comparée sur le plus petit territoire qui a au moins 10 maisons : la commune elle-même, sinon son secteur, sinon sa région.

| Commune | Secteur | Maisons | Actives | Disparues | Loyer médian | Comparée sur | Écart au modèle | Lecture |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Luxembourg | Luxembourg-Ville | 27 | 27 | 0 | 5.000 € | Luxembourg (27) | −1 % | conforme au modèle (± 5 %), mesuré sur la commune : 27 maisons |
| Niederanven | Couronne est et sud | 7 | 7 | 0 | 3.950 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Mamer | Canton de Capellen | 6 | 6 | 0 | 3.700 € | Canton de Capellen (16) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 16 maisons |
| Esch-sur-Alzette | Esch et Belval | 4 | 4 | 0 | 3.500 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Vichten | Canton de Redange | 4 | 4 | 0 | 1.550 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Habscht | Canton de Capellen | 3 | 3 | 0 | 3.000 € | Canton de Capellen (16) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 16 maisons |
| Leudelange | Esch et Belval | 3 | 3 | 0 | 3.250 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Sandweiler | Couronne est et sud | 3 | 3 | 0 | 3.700 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Strassen | Couronne ouest et nord | 3 | 3 | 0 | 4.400 € | Couronne de Luxembourg-Ville (19) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 19 maisons |
| Clervaux | Éislek (Clervaux, Wiltz, Vianden) | 2 | 2 | 0 | 2.500 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Dalheim | Moselle sud (Remich, Mondorf) | 2 | 2 | 0 | 3.275 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Differdange | Sud-Ouest (Differdange, Pétange) | 2 | 2 | 0 | 3.650 € | Sud (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Sud : 17 maisons |
| Dippach | Canton de Capellen | 2 | 2 | 0 | 3.950 € | Canton de Capellen (16) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 16 maisons |
| Hesperange | Couronne est et sud | 2 | 2 | 0 | 3.000 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Kiischpelt | Éislek (Clervaux, Wiltz, Vianden) | 2 | 2 | 0 | 1.575 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Kopstal | Canton de Capellen | 2 | 2 | 0 | 4.800 € | Canton de Capellen (16) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 16 maisons |
| Mersch | Mersch et vallée de l’Alzette | 2 | 2 | 0 | 3.800 € | Ouest et Centre (Capellen, Mersch) (23) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 23 maisons |
| Mertert | Moselle nord (Grevenmacher) | 2 | 2 | 0 | 4.225 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Roeser | Sud-Est (Dudelange, Bettembourg) | 2 | 2 | 0 | 8.750 € | Sud (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Sud : 17 maisons |
| Bech | Mullerthal (Echternach) | 1 | 1 | 0 | 2.800 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Bertrange | Couronne ouest et nord | 1 | 1 | 0 | 5.000 € | Couronne de Luxembourg-Ville (19) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 19 maisons |
| Bettembourg | Sud-Est (Dudelange, Bettembourg) | 1 | 1 | 0 | 3.000 € | Sud (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Sud : 17 maisons |
| Betzdorf | Junglinster et Betzdorf | 1 | 1 | 0 | 2.600 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Erpeldange-sur-Sûre | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 2.600 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Ettelbruck | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 2.800 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Fischbach | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 4.500 € | Ouest et Centre (Capellen, Mersch) (23) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 23 maisons |
| Grevenmacher | Moselle nord (Grevenmacher) | 1 | 1 | 0 | 3.150 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Groussbus-Wal | Canton de Redange | 1 | 1 | 0 | 2.950 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Helperknapp | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 2.900 € | Ouest et Centre (Capellen, Mersch) (23) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 23 maisons |
| Junglinster | Junglinster et Betzdorf | 1 | 1 | 0 | 3.200 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Käerjeng | Sud-Ouest (Differdange, Pétange) | 1 | 1 | 0 | 2.990 € | Sud (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Sud : 17 maisons |
| Kehlen | Canton de Capellen | 1 | 1 | 0 | 3.600 € | Canton de Capellen (16) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 16 maisons |
| Koerich | Canton de Capellen | 1 | 1 | 0 | 4.250 € | Canton de Capellen (16) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 16 maisons |
| Larochette | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 3.500 € | Ouest et Centre (Capellen, Mersch) (23) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 23 maisons |
| Lintgen | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 3.200 € | Ouest et Centre (Capellen, Mersch) (23) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 23 maisons |
| Lorentzweiler | Mersch et vallée de l’Alzette | 1 | 1 | 0 | 4.000 € | Ouest et Centre (Capellen, Mersch) (23) | −4 % | conforme au modèle (± 5 %), mesuré sur la région Ouest et Centre (Capellen, Mersch) : 23 maisons |
| Mondercange | Esch et Belval | 1 | 1 | 0 | 10.000 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Parc Hosingen | Éislek (Clervaux, Wiltz, Vianden) | 1 | 1 | 0 | 2.750 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Pétange | Sud-Ouest (Differdange, Pétange) | 1 | 1 | 0 | 3.500 € | Sud (17) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Sud : 17 maisons |
| Reckange-sur-Mess | Esch et Belval | 1 | 1 | 0 | 800 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Reisdorf | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 2.500 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Remich | Moselle sud (Remich, Mondorf) | 1 | 1 | 0 | 2.800 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Sanem | Esch et Belval | 1 | 1 | 0 | 3.350 € | Esch et Belval (10) | −4 % | conforme au modèle (± 5 %), mesuré sur le secteur Esch et Belval : 10 maisons |
| Schengen | Moselle sud (Remich, Mondorf) | 1 | 1 | 0 | 2.500 € | Est (10) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Est : 10 maisons |
| Schieren | Nordstad (Ettelbruck, Diekirch) | 1 | 1 | 0 | 3.600 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |
| Steinfort | Canton de Capellen | 1 | 1 | 0 | 3.200 € | Canton de Capellen (16) | −5 % | au-dessous du modèle de 5 %, mesuré sur le secteur Canton de Capellen : 16 maisons |
| Steinsel | Couronne ouest et nord | 1 | 1 | 0 | 4.500 € | Couronne de Luxembourg-Ville (19) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 19 maisons |
| Walferdange | Couronne ouest et nord | 1 | 1 | 0 | 2.950 € | Couronne de Luxembourg-Ville (19) | −1 % | conforme au modèle (± 5 %), mesuré sur la région Couronne de Luxembourg-Ville : 19 maisons |
| Weiler-la-Tour | Couronne est et sud | 1 | 1 | 0 | 2.900 € | Couronne est et sud (13) | −2 % | conforme au modèle (± 5 %), mesuré sur le secteur Couronne est et sud : 13 maisons |
| Winseler | Éislek (Clervaux, Wiltz, Vianden) | 1 | 1 | 0 | 2.400 € | Nord (15) | −3 % | conforme au modèle (± 5 %), mesuré sur la région Nord : 15 maisons |

## Comment lire

- « Modèle » = loyer en annonce que donne l'outil pour une maison de même surface dans la même zone de l'Observatoire. « +8 % » = les maisons de ce territoire sont annoncées 8 % plus cher que le modèle.
- « Disparues » = annonces qui ne sont plus en ligne : probablement louées, mais peut-être retirées. Leur dernier prix est ce qui se rapproche le plus d'un loyer conclu. « Écart, disparues » n'apparaît qu'à partir de 3 maisons disparues.
- Une maison annoncée sur plusieurs portails (atHome, immotop, wortimmo) n'est comptée qu'une fois : même commune, surface à 2 m² près, même nombre de chambres et loyer à 3 % près (ou une chambre d'écart et loyer à 1 % près).
- Ce sont des loyers **demandés** : aucune source publique ne donne les loyers signés des maisons par commune.
