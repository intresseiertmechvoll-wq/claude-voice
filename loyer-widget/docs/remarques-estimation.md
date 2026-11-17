# Remarques sur l'outil d'estimation (`estimation-widget/`)

Relevées en construisant l'outil de loyer, le 17/11/2026, sur la branche `claude/estimation-widget-immobuild-g7jc99` (dernier commit lu : 55a2da3). **Le dossier `estimation-widget/` n'a pas été modifié.** Les points 1 à 4 sont corrigés dans la copie `loyer-widget/` ; le point 1 n'y existe plus (pas de capitalisation).

Classement : le plus important d'abord.

---

## 1. La méthode « capitalisation » utilise des loyers faussés par les chambres meublées (impact sur le prix)

- **Fichier** : `estimation-widget/src/shared/engine.ts`, lignes 7 et 230–238 (méthode `capitalisation`), ligne 240 (garde-fou `excludeOutlier`) ; données `data/communes.json`, champ `loyer_appartement_m2`.
- **Problème** : la capitalisation part du « loyer moyen annoncé au m² » de la commune (Observatoire). Ce chiffre contient des chambres meublées et du coliving (rapport n°24 de l'Observatoire, juin 2026 : « certaines surfaces de coliving et des chambres meublées sont incluses dans les loyers annoncés moyens »). Exemples : Esch-sur-Alzette 45,37 €/m² (surface moyenne implicite 24 m²), Mondercange 50,88 €/m² (18 m²). Voir `analyse-donnees.md`.
- **Conséquence mesurée avec le vrai moteur** (appartement de 80 m², bon état, classe D, aucun extra) :

| Commune | Avec capitalisation | Sans capitalisation | Écart | Pourquoi |
| --- | ---: | ---: | ---: | --- |
| Kopstal | 605 000 € | 735 000 € | **−17,7 %** | la capitalisation (6 646 €/m²) fait sortir la méthode **notariée** (9 708 €/m²) par le garde-fou de 20 % |
| Mertert | 500 000 € | 575 000 € | **−13,0 %** | même mécanisme : la notariée (7 626 €/m²) sort |
| Bertrange | 835 000 € | 805 000 € | +3,7 % | loyers au m² gonflés |
| Luxembourg | 865 000 € | 840 000 € | +3,0 % | idem |
| Dudelange | 545 000 € | 535 000 € | +1,9 % | idem |
| Esch-sur-Alzette | 535 000 € | 535 000 € | 0 % | la capitalisation (10 889 €/m²) est exclue par le garde-fou |

La capitalisation entre dans le calcul pour 27 des 36 communes qui ont un loyer publié. Dans les deux premiers cas, le garde-fou exclut la meilleure source (les ventes réelles) au profit de deux sources moins fiables.

- **Reproduire** : remplacer `loyer_appartement_m2` par `null` dans une copie de `data/communes.json` et comparer `estimate()` pour Kopstal et Mertert (script utilisé : un appel `estimate` avec et sans loyers, même réponses).
- **Proposition** : (a) retirer la capitalisation (poids 60 / 40 entre ventes notariées et annonces), ou (b) la calculer avec les loyers réels du rapport n°24 (`loyer-widget/data/references.json`, méthode de `loyer-widget/src/shared/engine.ts`), ou au minimum (c) ne jamais laisser le garde-fou exclure la méthode notariée quand la commune a ses propres ventes. À décider par Jason ; à retester avec les cas ci-dessus.

## 2. L'empreinte d'IP n'est pas « non réversible » sans secret

- **Fichiers** : `estimation-widget/src/shared/ratelimit.ts`, lignes 24 et 50 (sel par défaut `'immobuild-estimation'`) ; `estimation-widget/PRIVACY.md`, ligne 74 (« empreinte non réversible ») ; `estimation-widget/README.md`, partie 3.2 (la variable `RATE_LIMIT_SALT` n'y est pas mentionnée).
- **Problème** : l'empreinte est SHA-256(sel + IP). Le sel par défaut est public (dans le code) et il n'y a que 4,3 milliards d'adresses IPv4 : on retrouve l'IP d'une empreinte KV en quelques minutes sur un ordinateur ordinaire. La phrase de la politique de confidentialité est donc inexacte tant que `RATE_LIMIT_SALT` n'est pas défini.
- **Reproduire** : calculer SHA-256('immobuild-estimation|' + ip) pour toutes les IPv4 et comparer à une clé KV `rl:…`.
- **Proposition** : documenter `RATE_LIMIT_SALT` comme variable secrète conseillée (README 3.2) et écrire « empreinte chiffrée » dans PRIVACY.md. Fait dans `loyer-widget/README.md` et `loyer-widget/PRIVACY.md`.

## 3. Caractères invisibles et séparateurs de ligne Unicode acceptés

- **Fichier** : `estimation-widget/src/shared/validation.ts`, lignes 110–120 (`BIDI_CTRL`, `optText`) et 122 (`EMAIL_RE`). Le README (ligne 325) affirme le contraire.
- **Problème** : seuls les caractères de sens d'écriture sont retirés. Passent : U+2028 / U+2029 (séparateurs de ligne Unicode), U+200B (espace de largeur nulle), U+FEFF. Testé avec le code actuel : `rue = "Rue A Priorité : 🔥 Chaud"` est accepté tel quel ; `email = "a​@b.lu"` est accepté (et part dans `reply_to`).
- **Risque** : faible. L'objet de l'e-mail n'utilise que des listes fermées. Mais dans la version texte de l'e-mail, U+2028 peut afficher une fausse ligne (« Priorité : Chaud ») selon le logiciel de messagerie, et une adresse avec un caractère invisible ne fonctionne pas pour répondre.
- **Proposition** : retirer `[​-‏⁠-⁤﻿]` partout, remplacer `[  \u0085]` par une espace (une ligne) ou un retour (message), refuser ces caractères dans l'e-mail. Fait dans `loyer-widget/src/shared/validation.ts`, avec tests (`loyer-widget/tests/api.test.ts`).

## 4. `frame-ancestors` autorise `http://localhost:*` en production

- **Fichier** : `estimation-widget/public/_headers`, ligne 7.
- **Problème** : n'importe quelle page servie en local sur un poste (y compris une page malveillante ouverte en local) peut afficher l'outil dans une iframe. Risque faible (pas de session ni de cookie à voler), mais inutile en ligne.
- **Proposition** : retirer `http://localhost:*` de la version en ligne ; l'ajouter seulement le temps d'un test. Fait dans `loyer-widget/public/_headers` (avec une note).

## 5. Contraste de la bulle de Jason pendant l'animation

- **Fichier** : `estimation-widget/src/styles.css`, ligne 523 (`@keyframes bubble`, opacité de départ 0,4).
- **Problème** : pendant 0,45 s, le texte de la bulle a un contraste insuffisant. axe-core le signale si l'audit tombe à ce moment (c'est arrivé sur l'outil de loyer à l'étape 2). Pas bloquant (passager), mais facile à éviter.
- **Proposition** : animer seulement l'échelle, pas l'opacité. Fait dans `loyer-widget/src/styles.css`.

## 6. Détail : `refundSubmission` n'utilise pas l'horloge injectée

- **Fichier** : `estimation-widget/src/shared/ratelimit.ts`, ligne 57 (`Date.now()`), alors que `allowSubmission` accepte `now`.
- **Effet** : aucun en production ; seulement des tests de temps moins faciles à écrire.
- **Proposition** : passer `now` en paramètre, comme dans `allowSubmission`. Non corrigé (sans effet visible).
