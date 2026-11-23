# Estimation de loyer – verlounen.lu – ImmoBuild Kohn

Outil « Quel loyer pour votre bien ? » pour gagner des clients en **gestion locative** :

> **Avant la mise en ligne : 8 points à cocher**
> 1. `config.json` : `gestionUrl` (aujourd'hui la page contact, pas une page « gestion locative »), `contactUrl`, `privacyUrl`, `phone` (vide = pas de numéro affiché).
> 2. `params.json` : valider les coefficients et la règle de priorité des leads (partie « Paramètres à valider »).
> 3. Politique de confidentialité sur immobuild.lu : ajouter le texte de `PRIVACY.md` (point 7) et fixer la durée de conservation des leads.
> 4. **Faire relire par un juriste la case à cocher de l'étape 4** : aujourd'hui, le résultat ne s'affiche que si le visiteur accepte d'être recontacté. Une revue indépendante (18/11/2026) signale un risque de « consentement lié » (art. 7, paragraphe 4, RGPD). Piste : base légale « demande du visiteur » et case formulée comme une prise de connaissance.
> 5. Cloudflare : créer le stockage KV `RATE_LIMIT` et le secret `RATE_LIMIT_SALT` (partie 3.4), sinon la limite de 20 envois par heure ne tient pas.
> 6. Cloudflare Turnstile (anti-robots, partie 3.7) : clé de site dans `config.json`, clé secrète `TURNSTILE_SECRET_KEY`. Et les leads en attente (partie 3.8) : stockage `LEADS_EN_ATTENTE` et secret `LEAD_BACKUP_KEY`.
> 7. Revérifier la loi sur legilux (partie « Plafond légal ») : une réforme est en discussion.
> 8. Mettre en ligne, puis envoyer 3 ou 4 estimations de test depuis de vrais téléphones (iPhone et Android) et vérifier les e-mails reçus.
>
> Pour faire venir des propriétaires : textes prêts (Google Ads, réseaux sociaux, fiche Google) dans `docs/lancement.md`.
>
> Pour savoir si l'outil marche (partie 3.9) : activer Cloudflare Web Analytics (1 clic) et le comptage des étapes (binding `ETAPES`). Pour être trouvé sur Google : déclarer `https://verlounen.lu/sitemap.xml` dans Google Search Console.

1. le propriétaire décrit son appartement ou sa maison en 3 étapes courtes ;
2. il donne ses coordonnées ;
3. il voit une fourchette de loyer mensuel (prudent / conseillé / en annonce), et tu reçois le lead par e-mail, avec sa priorité. En tête de l'e-mail : boutons **Appeler**, **WhatsApp** (si c'est un mobile) et **Répondre** (réponse déjà rédigée dans la langue du visiteur, à relire avant d'envoyer).

**Option, désactivée par défaut : copie du résultat au visiteur** (`config.json` → `"copieVisiteur": true`, puis remettre en ligne). Le visiteur reçoit son résultat par e-mail, dans sa langue (exemple : `docs/exemple-email-visiteur.txt`) ; l'écran le lui dit (« Une copie a été envoyée à … ») et l'étape 4 l'annonce. Avant d'activer :
1. compléter ta politique de confidentialité (texte proposé dans `PRIVACY.md`, point 7) ;
2. compter **2 e-mails par lead** dans le quota Resend (offre gratuite : 100 par jour, partagée avec l'outil d'estimation) ;
3. savoir que si l'adresse est fausse, l'envoi « réussit » quand même : le refus arrive plus tard dans le tableau de bord Resend (onglet des e-mails), pas dans l'outil.
Si la copie ne part pas, le résultat s'affiche quand même (le lead est déjà chez toi).

**Adresse e-mail fausse : tu es prévenu.** Quand la copie ne peut pas être livrée (adresse inexistante, boîte refusée…), Resend le signale à l'outil, qui t'envoie aussitôt un e-mail « ⚠️ Adresse e-mail fausse : … – rappeler au +352 … », avec un bouton **Appeler** (et WhatsApp si c'est un mobile). L'e-mail du lead, lui, arrive toujours (il part avant la copie). À régler une fois, dans Resend :
1. *Webhooks* → *Add Webhook* ; adresse : `https://<adresse de l'outil>/api/resend-webhook` (par ex. `https://verlounen.lu/api/resend-webhook`) ; événements : `email.bounced`, `email.failed`, `email.suppressed` ;
2. copier le *Signing Secret* (`whsec_…`) puis : `npx wrangler pages secret put RESEND_WEBHOOK_SECRET --project-name loyer-widget` ;
3. tester : envoyer une estimation avec l'adresse `bounced@resend.dev` (adresse de test de Resend qui est toujours refusée) ; l'avis doit arriver en une à deux minutes.
Sécurité : seuls les messages signés par Resend sont acceptés (signature vérifiée, 5 minutes de tolérance) ; seuls les e-mails « copie au visiteur » déclenchent un avis (pas de boucle) ; rien n'est enregistré. Si un avis est envoyé deux fois (Resend réessaie quand l'outil ne répond pas), tu peux recevoir un doublon.

L'outil est construit à partir de l'outil d'estimation (`estimation-widget/`) : même technique, même design, même sécurité. Il s'affiche seul sur **verlounen.lu** ou dans une iframe sur ton site (WordPress ou Next.js).

| Partie | Où | Rôle |
| --- | --- | --- |
| Page de l'outil | `index.html`, `src/` | Le questionnaire (HTML, CSS, TypeScript, Vite). Aucune donnée de loyer dans le navigateur. |
| Intégration | `public/embed.js` | Crée l'iframe et règle sa hauteur toute seule. |
| Serveur | `functions/api/estimate.ts`, `src/server/` | Cloudflare Pages Functions : vérifie, calcule, envoie l'e-mail. |
| Calcul | `src/shared/engine.ts` | Le moteur (voir « Comment le loyer est calculé »). |
| Données publiques | `data/loyers.json` | Observatoire de l'Habitat, data.public.lu, licence CC0 (mise à jour par script). |
| Données de référence | `data/references.json` | Chiffres tirés de rapports et du relevé d'annonces, avec leur source (mise à jour à la main). |
| Réglages | `params.json`, `config.json` | Coefficients (**à valider par Jason**), liens, adresse e-mail. |
| Analyses | `docs/` | Analyse des données, contrôle sur annonces réelles, cadre légal, remarques sur l'outil d'estimation. |

Pas de base de données, pas de cookie, pas de traceur. Les polices sont incluses dans l'outil.

### Ce que vit le visiteur

- **Étape 1 – le bien** : appartement ou maison, commune (recherche tolérante aux accents et aux autres noms : Düdelingen, Kirchberg…), surface, chambres (0 = studio). S'il y a peu de données publiques pour sa commune, il le sait tout de suite.
- **Étape 2 – les détails** : état, classe énergétique, meublé ou vide, balcon / terrasse / jardin, garages et parkings, étage et ascenseur (appartement).
- **Étape 3 – le projet** : propriétaire ? déjà loué ? gestion locative souhaitée (oui / peut-être / non) ? libre à partir de quand ?
- **Étape 4 – coordonnées** : prénom, nom, e-mail, téléphone (+352 par défaut), message, case RGPD. Coordonnées obligatoires pour voir le résultat (c'est annoncé dès le début, avec « gratuit et sans engagement »). Le téléphone est contrôlé : numéros manifestement inventés refusés (« 00000 », « 123456 », « 621 000 000 »…) ; au Luxembourg, mobiles seulement dans les plages attribuées par l'ILR (621, 628, 651, 655, 658, 661, 668, 671, 678, 681, 691, 692, 698 ; liste dans `src/shared/validation.ts`, à compléter si l'ILR ouvre une nouvelle plage) ; longueur contrôlée pour la France, la Belgique et les pays voisins. Un numéro qui passe ce contrôle peut quand même ne pas exister : seul un appel le confirme. Un numéro français, belge ou allemand tapé avec +352 (« 06… », « 04… », « 015… ») reçoit un message clair (« choisissez l'indicatif »). Les messages d'erreur d'un champ s'affichent après la fin du toucher, pour que le doigt ne tombe pas à côté de la case RGPD. La touche « retour » du téléphone revient à l'étape précédente (sans perdre les réponses).
- **Résultat** (immédiat, sans écran d'attente) : loyer conseillé par mois et au m², fourchette « loyer prudent » (baux signés) – « loyer en annonce », fiabilité des données, phrase obligatoire, boutons **« Confier la gestion à ImmoBuild Kohn »** et « Prendre rendez-vous », mention du plafond légal avec lien vers la loi, comparaison avec la commune et la région, ce qui fait monter ou baisser le loyer, sources.
- **Jason présent** : ta photo et une bulle qui réagit à certaines réponses. Les phrases sont dans `src/i18n/fr.json` → `coach`.
- **Trois langues** : `?lang=fr`, `?lang=de`, `?lang=en`.

Contrôlé le 19/11/2026 (en local, pas encore en ligne) : 0 erreur axe-core (WCAG 2.1 AA), rien ne dépasse et aucun texte coupé à 320, 390, 768 et 1280 px en FR, DE et EN ; Lighthouse 12.2.1 mobile : performance 100, accessibilité 100, bonnes pratiques 100, LCP 1,4 s, 87 Ko au total. En ligne, les chiffres peuvent être un peu différents.

---

## 1. Installer

Il te faut **Node.js 20 ou plus récent** (nodejs.org, version « LTS »).

```bash
cd loyer-widget
npm install
```

> L'outil a été créé dans le dossier `loyer-widget/` du dépôt `claude-voice` (branche `claude/dazzling-carson-y40amu`). Pour en faire un dépôt à part, en gardant l'historique :
>
> ```bash
> git subtree split --prefix=loyer-widget -b loyer-widget-seul
> mkdir ../loyer-widget && cd ../loyer-widget && git init
> git pull ../claude-voice loyer-widget-seul
> ```

## 2. Tester en local

```bash
cp .dev.vars.example .dev.vars   # une seule fois
npm test                          # les tests automatiques
npm run dev                       # construit l'outil et lance le serveur local
```

Puis ouvre :

- http://localhost:8788/ : l'outil seul (`?lang=de` ou `?lang=en` pour les autres langues) ;
- http://localhost:8788/demo.html : l'outil intégré dans une page, comme sur ton site.

En local, `.dev.vars` contient `EMAIL_MODE=log` : **aucun e-mail ne part**. Le contenu de l'e-mail s'affiche dans le terminal. Exemple : `docs/exemple-email-lead.txt`.

Captures d'écran et contrôles (serveur local lancé, Playwright installé avec `npm i -D playwright && npx playwright install chromium`) :

```bash
npm run screenshots   # → dossier screenshots/ (et screenshots/tmp/ pour toutes les tailles et langues)
```

La limite de 20 envois par heure et par IP s'applique aussi en local : si tu enchaînes beaucoup d'essais, relance `npm run dev`.

## 3. Mettre en ligne sur Cloudflare

Cloudflare Pages est gratuit. Les fonctions serveur partagent le quota gratuit des Workers (100 000 requêtes par jour).

**À faire depuis ton ordinateur** : l'envoi vers Cloudflare n'est pas possible depuis la session où l'outil a été construit.

### 3.1 Créer le projet (une seule fois)

```bash
npx wrangler login
npx wrangler pages project create loyer-widget --production-branch main
npm run deploy
```

C'est un **projet séparé** de `estimation-widget`. L'outil est en ligne à l'adresse affichée, en général `https://loyer-widget.pages.dev`.

### 3.2 Les variables

```bash
npx wrangler pages secret put RESEND_API_KEY --project-name loyer-widget
npx wrangler pages secret put LEAD_EMAIL --project-name loyer-widget
npx wrangler pages secret put FROM_EMAIL --project-name loyer-widget
```

| Variable | Valeur | Obligatoire |
| --- | --- | --- |
| `RESEND_API_KEY` | ta clé Resend (`re_…`), la même que pour l'outil d'estimation ou une nouvelle | oui |
| `LEAD_EMAIL` | l'adresse qui reçoit les leads, par défaut `contact@immobuild.lu` | non |
| `FROM_EMAIL` | l'expéditeur, sur ton domaine validé chez Resend, par ex. `ImmoBuild Loyer <loyer@immobuild.lu>` | oui, sauf si c'est exactement cette adresse |
| `LEAD_BACKUP_KEY` | secret de chiffrement des leads en attente (longue phrase au hasard, ne plus la changer), voir 3.8 | non, conseillé |
| `TURNSTILE_SECRET_KEY` | clé secrète Cloudflare Turnstile (anti-robots), voir 3.7 | non, conseillé |
| `RESEND_WEBHOOK_SECRET` | secret de signature des avis de Resend (`whsec_…`), voir « Adresse e-mail fausse » ci-dessous | seulement si la copie au visiteur est activée |
| `RATE_LIMIT_SALT` | une longue phrase au hasard, gardée secrète (empêche de retrouver une IP à partir de son empreinte) | non, conseillé |

La clé n'est jamais dans le code. Relance `npm run deploy` après un changement.

### 3.3 Resend

Le domaine `immobuild.lu` est déjà validé chez Resend pour l'outil d'estimation : rien à refaire. L'offre gratuite (3 000 e-mails par mois, 100 par jour) est **partagée** entre les deux outils.

### 3.4 Limite de 20 envois par heure et par IP

Comme pour l'outil d'estimation : sans réglage, compteur en mémoire (par serveur Cloudflare) ; pour un compteur partagé, active Cloudflare KV :

```bash
npx wrangler kv namespace create RATE_LIMIT_LOYER
```

Puis : Workers & Pages → loyer-widget → Settings → Bindings → Add → KV namespace → variable `RATE_LIMIT`, espace `RATE_LIMIT_LOYER`. Relance `npm run deploy`. Seule une empreinte de l'IP est stockée, effacée après 1 heure.

### 3.5 Le domaine verlounen.lu

1. Dans Cloudflare : *Add a domain* → `verlounen.lu` (offre Free), puis remplace les serveurs de noms chez ton registrar par ceux que Cloudflare indique. Obligatoire pour un domaine sans `www`.
2. Workers & Pages → loyer-widget → Custom domains → `verlounen.lu` et `www.verlounen.lu`.
3. Vérifie : ouvre `https://verlounen.lu/demo.html`, fais une estimation avec tes coordonnées, contrôle que l'e-mail arrive et que « Répondre » écrit au visiteur.

### 3.6 Avant la mise en ligne

- `config.json` : `gestionUrl` (page « gestion locative » de ton site), `contactUrl`, `privacyUrl`, `phone`.
- `params.json` : valider les coefficients (partie « Paramètres à valider »).
- Revérifier la loi sur legilux (partie « Plafond légal ») : une réforme est en discussion.

### 3.7 Anti-robots : Cloudflare Turnstile (conseillé)

Sans protection, un robot peut remplir le formulaire des centaines de fois : ta boîte se remplit et le quota Resend (100 e-mails par jour, partagé avec l'outil d'estimation) s'épuise ; ensuite, plus aucun vrai lead ne passe. Turnstile (gratuit, de Cloudflare) vérifie en arrière-plan que le visiteur est un humain ; dans la plupart des cas, il ne voit rien.

1. Cloudflare → *Turnstile* → *Add widget* ; nom « verlounen » ; domaines : `verlounen.lu`, `immobuild.lu` (et l'adresse `*.pages.dev` du projet si tu testes dessus) ; mode **Managed** ; **ne pas activer** « pre-clearance » (sinon un cookie est déposé).
2. Copier la **clé de site** dans `config.json` → `"turnstileSiteKey": "0x…"`.
3. Copier la **clé secrète** : `npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name loyer-widget`, puis `npm run deploy`.
4. Tester une estimation depuis ton téléphone. Pour tester sans vraie clé : clé de site `1x00000000000000000000BB` et clé secrète `1x0000000000000000000000000000000AA` (clés de test officielles de Cloudflare, toujours acceptées).

Comportement : le script de Cloudflare n'est chargé qu'à l'étape 3, donc seulement par les visiteurs qui vont au bout. Si le contrôle échoue (robot, bloqueur de publicité qui bloque Cloudflare), le visiteur voit un message et rien n'est envoyé. Si les serveurs de Cloudflare ne répondent pas, l'envoi est accepté quand même (pas de lead perdu à cause d'une panne ; la limite par IP et le champ piège restent actifs). Sans les deux clés, l'outil marche comme avant, sans Turnstile.

Données : Turnstile analyse des signaux techniques du navigateur (adresse IP, empreinte TLS, User-Agent) ; voir `PRIVACY.md`. Cloudflare indique que Turnstile ne dépose pas de cookie (sans « pre-clearance »), mais des utilisateurs signalent parfois un cookie technique `_cfuvid` : **après la mise en ligne, vérifier dans le navigateur** (outils de développement → Application → Cookies). S'il y en a un, retirer « sans cookies » des textes de l'outil (`trust.line` dans `src/i18n/*.json`) et de la politique de confidentialité.

### 3.8 Ne perdre aucun lead si Resend tombe en panne (conseillé)

Sans réglage : si Resend ne peut pas envoyer l'e-mail (panne, quota de 100 e-mails par jour épuisé…), le visiteur voit un message d'erreur et le lead est perdu s'il ne réessaie pas. Avec ce réglage, le visiteur voit son résultat normalement, l'e-mail du lead est gardé **chiffré** dans Cloudflare, puis il t'arrive automatiquement avec l'objet « [Envoi différé – demande reçue le 19/11 à 14:02] … » dès qu'un envoi suivant réussit.

```bash
npx wrangler kv namespace create LEADS_EN_ATTENTE
npx wrangler pages secret put LEAD_BACKUP_KEY --project-name loyer-widget
```

Puis : Workers & Pages → loyer-widget → Settings → Bindings → Add → KV namespace → variable `LEADS_EN_ATTENTE`. Pour `LEAD_BACKUP_KEY` : une longue phrase au hasard, **à ne jamais changer** tant que des leads sont en attente (sinon ils deviennent illisibles). Relance `npm run deploy`.

À savoir :
- les leads en attente partent lors de l'envoi réussi **suivant** : s'il n'y a pas de nouveau visiteur, ils attendent (au plus 7 jours, ensuite ils sont effacés) ;
- au plus 5 leads en attente partent à chaque passage ;
- rarement, un lead en attente peut arriver deux fois (deux visiteurs au même moment) ;
- testé en local avec le stockage KV de Wrangler (panne simulée, puis envoi différé) ; pas encore testé en ligne.

### 3.9 Pages pour Google et mesure du parcours

**Pages de présentation** `/fr/`, `/de/`, `/en/` (générées par `npm run pages`, fichiers `fr/index.html`…) : titre et description pour Google, l'outil intégré, la méthode de calcul, des **exemples de loyers par région calculés par l'outil** (appartement 80 m², maison 150 m² ; jamais saisis à la main), le plafond légal, Jason, une FAQ. Avec `sitemap.xml` et `robots.txt`. L'adresse publique vient de `config.json` → `siteUrl` (aujourd'hui `https://verlounen.lu`). Ce sont ces adresses à utiliser dans la publicité et sur les réseaux. Contrôlé en local : 0 erreur axe-core à 320, 390 et 1280 px, l'outil intégré se charge avec les vrais en-têtes de sécurité.

À faire après la mise en ligne : Google Search Console → ajouter `verlounen.lu` → déclarer `https://verlounen.lu/sitemap.xml`. Être bien placé sur Google prend des semaines et n'est pas garanti ; la publicité et les liens depuis immobuild.lu restent nécessaires au début.

**Mesure, sans cookie :**
1. **Visites** : Cloudflare → Workers & Pages → loyer-widget → *Metrics* → *Web Analytics* → *Enable* (1 clic ; Cloudflare ajoute son script au prochain déploiement ; les en-têtes de sécurité l'autorisent déjà).
2. **Parcours étape par étape** (combien ouvrent l'outil, arrivent à l'étape 4, voient le résultat) : Settings → Bindings → Add → *Analytics Engine* → variable `ETAPES`, jeu de données `loyer_etapes`, puis `npm run deploy`. Lecture :
   ```bash
   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run stats
   ```
   (jeton : My Profile → API Tokens → permission « Account Analytics : Read »). Exemple de lecture : « 300 ouvertures, 90 à l'étape 4, 60 résultats » = 1 visiteur sur 5 devient un lead, et un tiers abandonne à l'étape 4 (coordonnées). Rien d'autre n'est compté : ni cookie, ni identifiant, ni adresse IP. Pas encore testé avec un vrai compte Cloudflare.

## 4. Mettre à jour les données

### Chaque trimestre (5 minutes)

```bash
npm run update-data && npm run pages && npm test && npm run deploy
```

`npm run pages` recalcule les exemples de loyers des pages /fr/, /de/, /en/ avec les nouvelles données (un test échoue si on l'oublie).

`update-data` télécharge sur data.public.lu le nombre d'annonces de location par commune et l'indice des loyers annoncés, puis réécrit `data/loyers.json` et `data/peu-de-donnees.json`. Si un fichier change de format, le script **s'arrête sans rien modifier** et dit pourquoi. Derrière un proxy : `NODE_USE_ENV_PROXY=1 npm run update-data`.

L'indice met à jour le niveau des loyers. Les tests utilisent une copie figée (`tests/fixtures/`) : le calcul à la main reste valable.

### Chaque semaine, automatiquement : suivi des maisons à louer

Une session Claude planifiée relève chaque lundi toutes les maisons à louer sur atHome, immotop et wortimmo (loyer, surface, chambres, localité, lien ; jamais de nom d'agent), puis :

- met à jour la base `data/marche/maisons.json` : une fiche par maison, avec ses prix successifs ; une annonce qui n'est plus en ligne est marquée « disparue » (probablement louée, ou retirée) ;
- reconnaît la même maison annoncée sur plusieurs portails et ne la compte qu'une fois ;
- compare chaque secteur, chaque région et chaque commune au modèle de l'outil, avec au moins 10 maisons de comparaison par territoire (sinon le territoire supérieur). Découpage en 15 secteurs et 6 régions dans `data/marche/secteurs.json` (Sud et Est découpés en plusieurs secteurs ; à valider par Jason, modifiable) : `docs/marche/rapport-maisons-AAAA-MM-JJ.md` et `data/marche/communes-maisons.json` ;
- enregistre le tout dans git.

Procédure complète (aussi pour la faire à la main) : `docs/marche/PROCEDURE.md`. À la main : `npm run marche -- import --date AAAA-MM-JJ --athome athome.csv --immotop immotop.csv --wortimmo wortimmo.csv`.

Le modèle de l'outil n'est **pas** modifié automatiquement : quand une commune s'écarte durablement de son modèle (assez de maisons, plusieurs mois), c'est toi qui décides d'un ajustement. Risque lié aux conditions d'utilisation des portails : accepté par le propriétaire du projet le 17/11/2026.

### Deux fois par an, à la main

- **Relevé d'annonces d'appartements** (facteur « annonce ÷ bail ») et **réestimation du modèle maisons** à partir de la base des relevés : relancer `docs/analyse-appartements.py` et `docs/analyse-maisons.py`, reporter les chiffres dans `data/references.json` (`maisons`, `calibration`, `stationnement`). Le site lui-même ne collecte rien sur les portails.
- **Nouveau rapport de l'Observatoire** sur le cadastre des loyers (une grille de loyers de référence est annoncée) : mettre à jour `data/references.json` → `cadastre`, ou remplacer la méthode si la grille officielle est publiée.

## 5. Intégrer l'outil

Adresse : `https://verlounen.lu` (tant que le domaine n'est pas branché : `https://loyer-widget.pages.dev`).

### WordPress (Elementor)

Widget **HTML**, une ligne :

```html
<div data-immobuild-loyer data-lang="fr"></div><script src="https://verlounen.lu/embed.js" async></script>
```

`data-lang="de"` ou `"en"` pour les autres langues ; `data-offset="90"` sur le `<div>` si ton site a un en-tête fixe ; `data-src="https://verlounen.lu/embed.js"` sur le `<script>` si une extension recopie les scripts. L'outil d'estimation et l'outil de loyer peuvent être sur la même page : leurs noms ne se mélangent pas.

### Next.js (immobuild-website)

Je n'ai pas modifié ce dépôt. Le composant est prêt dans `integration/LoyerWidget.tsx` : copie-le dans `immobuild-website/components/`, puis `<LoyerWidget lang="fr" />` et `NEXT_PUBLIC_LOYER_URL=https://verlounen.lu` dans `.env`.

L'outil n'accepte d'être affiché que sur `immobuild.lu` et ses sous-domaines (`frame-ancestors` dans `public/_headers`). Une autre adresse (ex. `immobuild-website.vercel.app`) doit être ajoutée sur cette ligne.

---

## Comment le loyer est calculé

Pourquoi pas simplement « loyer annoncé au m² de la commune × surface » ? Parce que ce chiffre officiel est faussé par les chambres meublées et le coliving (par ex. Esch-sur-Alzette : 45,37 €/m², surface moyenne implicite 24 m²). Un 80 m² à Esch sortirait à 3 630 €. Détails : `docs/analyse-donnees.md`.

### Appartement

1. **Loyer médian au m² du canton** (baux en cours en 2025) : rapport n°24 de l'Observatoire de l'Habitat, « Le cadastre des loyers » (juin 2026). Luxembourg-Ville a sa propre valeur.
2. **× facteur surface** : les petits logements se louent plus cher au m². Médiane de la zone pour la surface du bien ÷ médiane de la zone. Les valeurs du rapport (par classe de surface) sont reliées en ligne droite, pour éviter les sauts ; sous 40 m², la pente continue jusqu'à 25 m² ; un logement plus grand n'a jamais un loyer total plus bas.
3. **× baux récents** : loyers des baux signés en 2024-2025 ÷ tous les baux en cours (même rapport, par zone).
4. **× indice** : dernier indice trimestriel des loyers annoncés ÷ moyenne 2024-2025 (data.public.lu). Aujourd'hui : 206,49 ÷ 197,79 = 1,044.

= **loyer « bail »** (niveau des baux réellement signés).
**Loyer « annonce »** = loyer « bail » × 1,17 (écart médian mesuré sur 350 annonces d'appartements du 17/11/2026, stable par zone et par surface).

### Maison

Il n'existe pas de loyers publics détaillés pour les maisons (l'Observatoire ne publie que 4 communes). Le calcul part d'un modèle construit sur **84 annonces de maisons** au Luxembourg (atHome et wortimmo, 17/11/2026) : loyer selon la zone et la surface (quand la surface double, le loyer monte d'environ 54 %). C'est le **loyer « annonce »** ; le loyer « bail » = annonce ÷ 1,17 (même écart que pour les appartements : **hypothèse**, pas mesurée pour les maisons). Contrôle : médiane 20,0 €/m², contre 19,77 €/m² pour la moyenne nationale de l'Observatoire.

### Puis, pour les deux

- **Bas** (« loyer prudent ») = bail × (1 + coefficients) + stationnement.
- **Haut** (« loyer en annonce ») = annonce × (1 + coefficients) + stationnement.
- **Milieu** (« loyer conseillé ») = moyenne des deux.
- Arrondis à 50 €, au moins 100 € d'écart.

**Exemple** (calculé à la main dans `tests/engine.test.ts`) : appartement de 80 m² à Dudelange, bon état, classe D, sans extérieur ni parking : 19,12 × 0,936 × 1,165 × 1,044 = 21,77 €/m² → bail 1 742 €, annonce 2 038 € → **1 750 / 1 900 / 2 050 €**.

**Limite à connaître** : le calcul se fait au niveau du canton. Dudelange, Kayl, Rumelange et Esch donnent le même loyer à bien égal. Tu connais mieux les différences locales : un ajustement par commune pourra être ajouté plus tard, s'il est justifié.

## Paramètres à valider (Jason)

Tout est dans `params.json` et `data/references.json`. Les coefficients s'additionnent ; le total est borné entre −20 % et +15 %.

| Réglage | Valeur proposée | D'où vient la valeur | Statut |
| --- | --- | --- | --- |
| Écart annonce ÷ bail | × 1,17 | Médiane de 350 annonces d'appartements comparées à la méthode (17/11/2026) | mesuré |
| Maisons : bail = annonce ÷ 1,17 | ÷ 1,17 | Même écart que les appartements | **hypothèse** |
| État | neuf +5 %, rénové +3 %, bon 0, à rafraîchir −5 %, à rénover −12 % | Aucune donnée publique ; valeurs prudentes | proposition |
| Classe énergétique | A+/A +5 %, B +3 %, C +1 %, D/E 0, F −2 %, G −3 %, H/I −4 %, inconnue 0 | Le rapport n°24 montre +35 à 40 % entre A et F–H, mais mélangé avec l'âge du bien et la date du bail (déjà comptés) : on n'en garde qu'une petite partie | proposition |
| Extérieur (appartement) | balcon +2 %, terrasse +4 %, jardin +5 % | Aucune donnée publique | proposition |
| Étage (appartement) | rez-de-chaussée −3 % ; 3e ou plus sans ascenseur −5 % | Même logique que l'outil d'estimation | proposition |
| Garage / place intérieure | +200 € Luxembourg-Ville, +170 € communes autour de Luxembourg-Ville, +140 € Périphérie et Sud, +120 € Est, +100 € Nord (par mois) | Annonces atHome du 17/11/2026 : médiane 200 € à Luxembourg-Ville (20 annonces), 140 € dans le Sud (14) ; autres zones : proposition | en partie mesuré |
| Parking extérieur | +120 / 100 / 80 / 80 / 70 / 60 € | Environ 60 % d'un garage | proposition |
| Places comptées | 2 au plus | Au-delà, plus un logement standard | proposition |
| Maison : stationnement et extérieur | pas d'ajustement | Supposés compris dans les annonces de maisons | proposition |
| Meublé | pas d'ajustement du loyer | La loi prévoit un supplément mobilier séparé, au plus 1,5 % par mois des factures des meubles de moins de 10 ans | légal |
| Arrondi | 50 € | | proposition |
| Fiabilité « bonne » | appartement à Luxembourg-Ville, dans les communes autour ou dans le Sud, 40 à 130 m², au moins 1 chambre | Zones avec le plus de données | proposition |
| Fiabilité « limitée » | cantons de Vianden, Redange, Echternach, Wiltz, Clervaux ; studio ; moins de 30 ou plus de 160 m² ; maison dans l'est ou le nord, ou hors 100–300 m² | Peu de données | proposition |
| Priorité du lead | chaud : propriétaire + veut la gestion + libre dans les 3 mois ; tiède : propriétaire + gestion oui ou peut-être ; froid : le reste | Ta consigne | à valider |

Non utilisés dans le calcul (mais présents dans l'e-mail) : déjà loué, chambres (sauf studio pour la fiabilité).

## Plafond légal

Vérifié sur legilux le 17/11/2026 (`docs/cadre-legal.md`) : loi du 21 septembre 2006 sur le bail à usage d'habitation, version consolidée applicable au 02/10/2026, article 3 : le loyer annuel ne peut pas dépasser **5 % du capital investi** (réévalué, décoté après 15 ans). Pas de taux différent selon la classe énergétique dans le texte en vigueur. L'outil **ne calcule pas** ce plafond (il faut les factures) ; il affiche : « Le loyer ne peut pas dépasser un plafond légal lié au capital investi : 5 % par an. Je vérifie ce point avec vous. » avec le lien vers la loi. Une réforme est en discussion (rapports de l'Observatoire du 17/04/2026) : **revérifier avant la mise en ligne**.

## Titre en luxembourgeois (proposition)

« **Wat kritt Dir fir Är Wunneng?** » (« Combien obtenez-vous pour votre logement ? »). **Pas utilisé dans l'outil** : à faire vérifier par une personne de langue maternelle luxembourgeoise, puis, si tu le veux, à mettre dans `src/i18n/fr.json` → `intro.kicker` (et dans les autres langues).

## Sécurité et données personnelles

- Vérification de tous les champs sur le serveur ; le navigateur ne fait qu'aider.
- Champ caché anti-robot (honeypot) : rien n'est calculé ni envoyé s'il est rempli.
- Au plus **20 envois par heure** et par IP (`config.json` → `rateLimitPerHour`), comme l'outil d'estimation (réseaux mobiles partagés).
- Contrôle `Origin` : un navigateur ne peut pas envoyer le formulaire depuis une autre page. Ce contrôle n'arrête pas un robot (qui n'envoie pas d'`Origin`) : contre les robots, le champ piège, la limite par IP et Cloudflare Turnstile. Seulement `application/json`.
- Le résultat n'est renvoyé **qu'après** des coordonnées valides **et** l'envoi réussi de l'e-mail. Si Resend échoue ou ne répond pas en 10 secondes, message d'erreur avec ton adresse ; l'essai raté ne compte pas dans la limite.
- Champs d'une ligne : ni retour à la ligne, ni caractères invisibles (largeur nulle, sens d'écriture, séparateurs de ligne Unicode).
- Politique de sécurité du contenu (CSP) sans styles ni scripts en ligne ; affichage en iframe seulement sur `immobuild.lu` et ses sous-domaines.
- Aucune donnée stockée en dehors de l'e-mail. Détails : `PRIVACY.md`.

## Tests

`npm test` lance 128 tests (23/11/2026), dont :

| Test | Fichier |
| --- | --- |
| Dudelange 80 m² = calcul à la main (1 750 / 1 900 / 2 050 €) | `tests/engine.test.ts` |
| Rückgriff auf den Kanton : Kayl, Rumelange, Esch = Dudelange ; Esch pas faussé par les chambres | `tests/engine.test.ts` |
| Commune sans annonce (Biwer) : calcul par le canton, visiteur prévenu | `tests/engine.test.ts` |
| Les 100 communes × 2 types donnent une fourchette valide ; le loyer ne baisse jamais quand la surface monte | `tests/engine.test.ts` |
| Maison à Dudelange = calcul à la main (2 750 / 3 000 / 3 250 €) | `tests/engine.test.ts` |
| Sans case RGPD → refusé ; honeypot → bloqué ; jamais de résultat sans coordonnées valides | `tests/api.test.ts` |
| Resend en panne ou trop lent → pas de résultat, essai non compté | `tests/api.test.ts` |
| Limite par IP, contrôle d'origine, type de contenu exact | `tests/api.test.ts` |
| Phrase obligatoire, mention légale, appel « Confier la gestion », mêmes clés en FR/DE/EN, pas de « vrai loyer » | `tests/result-view.test.ts` |

## Décisions ouvertes pour Jason

1. Valider ou corriger les coefficients (tableau ci-dessus) et la règle de priorité.
2. Adresses `gestionUrl`, `contactUrl`, `privacyUrl`, numéro de téléphone (`config.json`).
3. Titre luxembourgeois : le faire relire, puis décider.
4. Google : l'outil seul (`/`) reste en `noindex` (c'est la page affichée dans les iframes). Les pages **/fr/, /de/, /en/** sont faites pour Google (partie 3.9). À décider : la page d'accueil de verlounen.lu doit-elle renvoyer vers /fr/ ? (redirection à ajouter dans `public/_redirects`, pas fait).
