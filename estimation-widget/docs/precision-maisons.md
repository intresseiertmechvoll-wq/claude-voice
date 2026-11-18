# Précision des maisons : toutes les pistes, évaluées (18/11/2026)

Objectif de Jason : que les gens puissent se fier au résultat. Une estimation en ligne ne peut pas être « exacte » (vue, rue, plan, finitions restent invisibles). L'objectif mesurable proposé : **8 maisons sur 10 à moins de 10 % du prix de vente réel**, vérifié sur des ventes réelles, et une fourchette qui s'élargit honnêtement quand les données manquent.

## 1. Où en est l'outil aujourd'hui

Test sur les 7 biens en vente d'ImmoBuild (prix annoncés, pas prix de vente) :

| Bien | Annoncé | Outil | Écart |
|---|---:|---:|---:|
| Appart. 45,6 m² Bascharage | 489 000 € | 435 000 € | −11 % |
| Appart. 44 m² Esch | 419 000 € | 405 000 € | −3 % |
| Duplex 60 m² Mersch | 520 000 € | 510 000 € | −2 % |
| Maison isolée 120 m² Ehlerange | 795 000 € | 675 000 € | −15 % |
| Maison mitoyenne 120 m² Gasperich | 1 250 000 € | 835 000 € | −33 % |
| Maison 140 m² Esch, à rafraîchir | 749 000 € | 600 000 € | −20 % |
| Maison jumelée 115 m² Hoscheid-Dickt (2011) | 740 000 € | 515 000 € | −30 % |

Les appartements sont réalistes depuis le facteur taille (commit 02f6a5c). **Les maisons restent 15 à 33 % sous les prix annoncés.** Une partie est normale (négociation), mais pas tout.

**Pourquoi les maisons sont plus difficiles (fait, source officielle) :** les actes notariés des maisons ne contiennent ni surface ni caractéristiques (pas de cadastre vertical). Il n'existe donc **aucun prix de vente au m² des maisons par commune**. L'outil part des prix *annoncés* au m² (Observatoire / immotop.lu) et leur applique la décote mesurée sur les *appartements*. Le STATEC doit faire une enquête spéciale auprès des acheteurs pour son indice des maisons, avec surface, volume, pièces, salles de bain, **année de construction**, parkings, **rénovations** et **distance à Luxembourg-Ville** (Le Logement en chiffres n° 19, mars 2026).

## 2. Les pistes

### A. Données officielles disponibles (vérifiées)

| # | Piste | Source (vérifiée) | Ce que ça corrige | Effort | Avis |
|---|---|---|---|---|---|
| A1 | **Quartiers de Luxembourg-Ville** : prix annoncés des maisons et appartements par quartier (ex. Belair 11 296 €/m², Bonnevoie 7 158 €/m², ville 8 598 €/m²) | data.public.lu, « Prix annoncés des logements – à Luxembourg-Ville, par quartier », 2025-26, CC0 | Les écarts de −17 % à +31 % entre quartiers de la capitale | Petit (la recherche reconnaît déjà Kirchberg, Bonnevoie… → demander le quartier) | **Oui.** N'explique pas Gasperich (= moyenne de la ville) |
| A2 | **Prix des terrains à bâtir** par commune ou zone (€/are, actes notariés) | Observatoire de l'Habitat, rapport d'analyse n° 19 (2025) et segmentation géographique (févr. 2025) ; disponibilité par commune **à vérifier** | Le terrain compte énormément au Luxembourg ; aujourd'hui seulement −3 % / +4 % forfaitaires | Moyen | **Oui, si les données par commune existent** |
| A3 | **Prix de vente réels des maisons** : moyenne et médiane par grande région (2025 : canton de Luxembourg 1 300 000 €, Capellen-Mersch 980 000 €, Est 900 000 €, canton d'Esch 775 000 €, Nord 725 000 € ; médiane) et volume trimestriel national (T3 2025 – T2 2026 : 2 866 ventes, moyenne 892 257 €) | Le Logement en chiffres n° 19 ; data.public.lu « Nombre de ventes … de maisons », CC0 | Garde-fou : signaler ou élargir quand l'estimation s'éloigne fortement des prix réels de la région | Petit | **Oui comme contrôle**, pas comme formule (pas de surface) |
| A4 | Comparaison prix annoncé moyen (1 243 430 €) / prix de vente moyen (892 257 €) des maisons : −28 % | Mêmes sources | Remplacer la décote « appartements » | — | **Non utilisable tel quel** : les maisons chères restent plus longtemps en annonce et gonflent la moyenne annoncée |
| A5 | Mise à jour au trimestre courant (indice des prix) | Observatoire / STATEC, trimestriel | Retard de 0 à 6 mois des données | Petit | Oui, gain faible |

### B. Pistes écartées (et pourquoi)

| Piste | Raison |
|---|---|
| Prix annoncés par classe énergétique (ChatHome, data.europa.eu) | Pas une source officielle, licence inconnue, écarts mélangés avec l'âge et le neuf (la source le dit elle-même) |
| Récupérer en masse les annonces d'athome.lu ou immotop.lu | Conditions d'utilisation des portails ; prix annoncés seulement |
| Coefficients d'âge « trouvés sur Internet » | Aucune source officielle chiffrée ; ce serait inventer |

### C. Les données de Jason : la piste décisive

Aucune donnée publique ne relie le **prix de vente réel d'une maison** à ses caractéristiques. Jason, lui, a ces ventes.

| # | Piste | Ce que ça apporte |
|---|---|---|
| C1 | **20 à 50 ventes réelles** (idéalement maisons, plusieurs régions) : commune, type, m², terrain, année, rénovations, état, classe énergétique, garage, **prix annoncé et prix de vente final** | Mesurer l'erreur réelle ; caler la décote maisons, l'âge, le terrain, le type ; vérifier l'objectif « 8 sur 10 à ±10 % » |
| C2 | Chaque nouvelle vente ajoutée au fichier | Recalage trimestriel, l'outil s'améliore avec l'activité de l'agence |

**Confidentialité :** ces ventes ne vont **pas** dans le dépôt GitHub (même privé) ni chez un service externe. Fichier local ignoré par git ; seuls les coefficients obtenus vont dans `params.json`.

### D. Changements dans l'outil

| # | Piste | Avis |
|---|---|---|
| D1 | Questions maison en plus : **année de rénovation importante**, localité / quartier (Hoscheid-Dickt ≠ Hosingen) | Oui, une fois les coefficients calés (C1) |
| D2 | **Fourchette honnête par cas** : plus large quand la commune a peu d'annonces de maisons ou que le résultat sort des repères régionaux (A3) | Oui |
| D3 | **Estimation hybride pour les maisons** : fourchette en ligne + « Jason vérifie votre estimation et vous rappelle sous 24 h » | **Fortement recommandé** : c'est la seule voie vers une vraie précision, et c'est un argument commercial |
| D4 | Méthode « terrain + construction » (valeur du terrain + coût de construction selon l'âge) en complément des prix annoncés | Possible après A2 et C1 ; à tester sur les ventes réelles avant de l'activer |

## 3. Ordre recommandé

1. **Jason fournit 20 ventes réelles ou plus** (C1). Sans elles, personne ne peut dire si l'outil est juste pour les maisons.
2. **Script de mesure** (`scripts/backtest.ts`) : erreur médiane, part à ±10 % et ±15 %, par type et région ; à relancer à chaque changement.
3. A1 (quartiers de la capitale) et A3 (garde-fou régional) : rapides et sourcés.
4. A2 (terrains) si les données par commune existent ; puis âge, terrain, type et décote maisons calés sur C1.
5. D2 et D3 (fourchette honnête, vérification par Jason) avant la mise en ligne.
6. Mise en ligne des maisons seulement si l'objectif mesuré est atteint ; sinon les maisons restent « indicatives » avec vérification personnelle.

## 4. Ce qui reste incertain

- Les 7 biens testés ont des **prix annoncés** ; seul le prix de vente final dit si l'outil est juste.
- On ne peut pas savoir à l'avance si l'objectif « 8 sur 10 à ±10 % » est atteignable pour les maisons avec des données au niveau de la commune. La mesure sur les ventes de Jason le dira.
