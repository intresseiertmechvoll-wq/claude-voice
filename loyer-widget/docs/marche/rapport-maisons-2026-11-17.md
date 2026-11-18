# Maisons à louer – relevé du 2026-11-17

Généré par `scripts/marche-maisons.ts`. Suivi depuis le 2026-11-17 (1 relevé). Comparaisons sur les maisons vues depuis le 2025-11-16 (12 mois).

## Ce relevé

- Annonces lues : athome 463, wortimmo 42 (tous pays) ; au Luxembourg : 123.
- Nouvelles annonces : 123. Disparues depuis le relevé précédent (probablement louées ou retirées) : 0.
- Base : 123 annonces, dont 10 exclues des calculs (sans surface, prix aberrant…).
- **Maisons différentes : 84** (112 annonces utilisables ; 28 annonces étaient la même maison sur un autre portail).

**Localités inconnues** (à ajouter dans `src/shared/aliases.ts`, puis relancer) : Koedange

## Objectif : au moins 10 maisons de comparaison par territoire

Cantons sous le minimum : Clervaux (3), Diekirch (2), Echternach (1), Grevenmacher (5), Mersch (6), Redange (3), Remich (3), Vianden (0), Wiltz (3). Pour leurs communes, la comparaison se fait sur la zone. Les maisons disparues restent comptées 12 mois : le nombre monte au fil des relevés.

### Par canton

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 20 ✔ | 20 | 0 | 4.500 € | 24,0 | −4 % | — | — |
| Capellen | 12 ✔ | 12 | 0 | 3.750 € | 20,3 | −5 % | — | — |
| Clervaux | 3 (manque 7) | 3 | 0 | 2.750 € | 13,4 | — | — | — |
| Diekirch | 2 (manque 8) | 2 | 0 | 2.700 € | 13,7 | — | — | — |
| Echternach | 1 (manque 9) | 1 | 0 | 2.800 € | 20,7 | — | — | — |
| Esch-sur-Alzette | 13 ✔ | 13 | 0 | 3.500 € | 18,6 | −3 % | — | — |
| Grevenmacher | 5 (manque 5) | 5 | 0 | 3.150 € | 16,1 | — | — | — |
| Luxembourg | 13 ✔ | 13 | 0 | 3.950 € | 21,7 | +4 % | — | — |
| Mersch | 6 (manque 4) | 6 | 0 | 3.350 € | 21,9 | — | — | — |
| Redange | 3 (manque 7) | 3 | 0 | 1.700 € | 17,5 | — | — | — |
| Remich | 3 (manque 7) | 3 | 0 | 2.800 € | 16,5 | — | — | — |
| Vianden | 0 (manque 10) | 0 | 0 | — | — | — | — | — |
| Wiltz | 3 (manque 7) | 3 | 0 | 1.900 € | 17,1 | — | — | — |

### Par zone

| Territoire | Maisons (12 mois) | Actives | Disparues | Loyer médian | €/m² | Écart au modèle | Écart, disparues | Jours avant disparition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Luxembourg-Ville | 20 ✔ | 20 | 0 | 4.500 € | 24,0 | −4 % | — | — |
| Luxembourg-Campagne | 13 ✔ | 13 | 0 | 3.950 € | 21,7 | +4 % | — | — |
| Capellen, Mersch | 18 ✔ | 18 | 0 | 3.550 € | 20,3 | −4 % | — | — |
| Sud | 13 ✔ | 13 | 0 | 3.500 € | 18,6 | −3 % | — | — |
| Est | 9 (manque 1) | 9 | 0 | 2.950 € | 16,5 | — | — | — |
| Nord | 11 ✔ | 11 | 0 | 2.400 € | 17,0 | −3 % | — | — |
| **Tout le pays** | 84 ✔ | 84 | 0 | 3.525 € | 20,1 | −3 % | — | — |

## Par commune

Chaque commune est comparée sur le plus petit territoire qui a au moins 10 maisons : la commune elle-même, sinon son canton, sinon sa zone.

| Commune | Canton | Maisons | Actives | Disparues | Loyer médian | Comparée sur | Écart au modèle | Lecture |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Luxembourg | Luxembourg-Ville | 20 | 20 | 0 | 4.500 € | Luxembourg (20) | −4 % | conforme au modèle (± 5 %), mesuré sur la commune : 20 maisons |
| Niederanven | Luxembourg | 6 | 6 | 0 | 3.775 € | Luxembourg (13) | +4 % | conforme au modèle (± 5 %), mesuré sur le canton (Luxembourg) : 13 maisons |
| Mamer | Capellen | 5 | 5 | 0 | 3.900 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Esch-sur-Alzette | Esch-sur-Alzette | 4 | 4 | 0 | 3.500 € | Esch-sur-Alzette (13) | −3 % | conforme au modèle (± 5 %), mesuré sur le canton (Esch-sur-Alzette) : 13 maisons |
| Leudelange | Esch-sur-Alzette | 3 | 3 | 0 | 3.250 € | Esch-sur-Alzette (13) | −3 % | conforme au modèle (± 5 %), mesuré sur le canton (Esch-sur-Alzette) : 13 maisons |
| Clervaux | Clervaux | 2 | 2 | 0 | 2.500 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |
| Differdange | Esch-sur-Alzette | 2 | 2 | 0 | 3.650 € | Esch-sur-Alzette (13) | −3 % | conforme au modèle (± 5 %), mesuré sur le canton (Esch-sur-Alzette) : 13 maisons |
| Kiischpelt | Wiltz | 2 | 2 | 0 | 1.575 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |
| Mersch | Mersch | 2 | 2 | 0 | 3.800 € | Capellen, Mersch (18) | −4 % | conforme au modèle (± 5 %), mesuré sur la zone : 18 maisons |
| Mertert | Grevenmacher | 2 | 2 | 0 | 4.225 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Sandweiler | Luxembourg | 2 | 2 | 0 | 4.000 € | Luxembourg (13) | +4 % | conforme au modèle (± 5 %), mesuré sur le canton (Luxembourg) : 13 maisons |
| Vichten | Redange | 2 | 2 | 0 | 1.550 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |
| Bech | Echternach | 1 | 1 | 0 | 2.800 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Bertrange | Luxembourg | 1 | 1 | 0 | 5.000 € | Luxembourg (13) | +4 % | conforme au modèle (± 5 %), mesuré sur le canton (Luxembourg) : 13 maisons |
| Bettembourg | Esch-sur-Alzette | 1 | 1 | 0 | 3.000 € | Esch-sur-Alzette (13) | −3 % | conforme au modèle (± 5 %), mesuré sur le canton (Esch-sur-Alzette) : 13 maisons |
| Betzdorf | Grevenmacher | 1 | 1 | 0 | 2.600 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Dalheim | Remich | 1 | 1 | 0 | 3.550 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Dippach | Capellen | 1 | 1 | 0 | 4.400 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Erpeldange-sur-Sûre | Diekirch | 1 | 1 | 0 | 2.600 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |
| Ettelbruck | Diekirch | 1 | 1 | 0 | 2.800 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |
| Grevenmacher | Grevenmacher | 1 | 1 | 0 | 3.150 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Groussbus-Wal | Redange | 1 | 1 | 0 | 2.950 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |
| Habscht | Capellen | 1 | 1 | 0 | 3.250 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Helperknapp | Mersch | 1 | 1 | 0 | 2.900 € | Capellen, Mersch (18) | −4 % | conforme au modèle (± 5 %), mesuré sur la zone : 18 maisons |
| Hesperange | Luxembourg | 1 | 1 | 0 | 3.800 € | Luxembourg (13) | +4 % | conforme au modèle (± 5 %), mesuré sur le canton (Luxembourg) : 13 maisons |
| Junglinster | Grevenmacher | 1 | 1 | 0 | 3.200 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Käerjeng | Capellen | 1 | 1 | 0 | 2.990 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Kehlen | Capellen | 1 | 1 | 0 | 3.600 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Koerich | Capellen | 1 | 1 | 0 | 4.250 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Kopstal | Capellen | 1 | 1 | 0 | 5.800 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Larochette | Mersch | 1 | 1 | 0 | 3.500 € | Capellen, Mersch (18) | −4 % | conforme au modèle (± 5 %), mesuré sur la zone : 18 maisons |
| Lintgen | Mersch | 1 | 1 | 0 | 3.200 € | Capellen, Mersch (18) | −4 % | conforme au modèle (± 5 %), mesuré sur la zone : 18 maisons |
| Lorentzweiler | Mersch | 1 | 1 | 0 | 4.000 € | Capellen, Mersch (18) | −4 % | conforme au modèle (± 5 %), mesuré sur la zone : 18 maisons |
| Mondercange | Esch-sur-Alzette | 1 | 1 | 0 | 10.000 € | Esch-sur-Alzette (13) | −3 % | conforme au modèle (± 5 %), mesuré sur le canton (Esch-sur-Alzette) : 13 maisons |
| Parc Hosingen | Clervaux | 1 | 1 | 0 | 2.750 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |
| Pétange | Esch-sur-Alzette | 1 | 1 | 0 | 3.500 € | Esch-sur-Alzette (13) | −3 % | conforme au modèle (± 5 %), mesuré sur le canton (Esch-sur-Alzette) : 13 maisons |
| Remich | Remich | 1 | 1 | 0 | 2.800 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Sanem | Esch-sur-Alzette | 1 | 1 | 0 | 3.350 € | Esch-sur-Alzette (13) | −3 % | conforme au modèle (± 5 %), mesuré sur le canton (Esch-sur-Alzette) : 13 maisons |
| Schengen | Remich | 1 | 1 | 0 | 2.500 € | Luxembourg (84) | −3 % | conforme au modèle (± 5 %), mesuré sur le pays : 84 maisons |
| Steinfort | Capellen | 1 | 1 | 0 | 3.200 € | Capellen (12) | −5 % | au-dessous du modèle de 5 %, mesuré sur le canton (Capellen) : 12 maisons |
| Steinsel | Luxembourg | 1 | 1 | 0 | 4.500 € | Luxembourg (13) | +4 % | conforme au modèle (± 5 %), mesuré sur le canton (Luxembourg) : 13 maisons |
| Strassen | Luxembourg | 1 | 1 | 0 | 5.200 € | Luxembourg (13) | +4 % | conforme au modèle (± 5 %), mesuré sur le canton (Luxembourg) : 13 maisons |
| Walferdange | Luxembourg | 1 | 1 | 0 | 2.950 € | Luxembourg (13) | +4 % | conforme au modèle (± 5 %), mesuré sur le canton (Luxembourg) : 13 maisons |
| Winseler | Wiltz | 1 | 1 | 0 | 2.400 € | Nord (11) | −3 % | conforme au modèle (± 5 %), mesuré sur la zone : 11 maisons |

## Comment lire

- « Modèle » = loyer en annonce que donne l'outil pour une maison de même surface dans la même zone. « +8 % » = les maisons de ce territoire sont annoncées 8 % plus cher que le modèle.
- « Disparues » = annonces qui ne sont plus en ligne : probablement louées, mais peut-être retirées. Leur dernier prix est ce qui se rapproche le plus d'un loyer conclu. « Écart, disparues » n'apparaît qu'à partir de 3 maisons disparues.
- Une maison annoncée sur plusieurs portails (atHome, immotop, wortimmo) n'est comptée qu'une fois : même commune, surface à 2 m² près, même nombre de chambres et loyer à 3 % près (ou une chambre d'écart et loyer à 1 % près).
- Ce sont des loyers **demandés** : aucune source publique ne donne les loyers signés des maisons par commune.
