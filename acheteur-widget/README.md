# Mon budget d’achat – ImmoBuild Kohn

Outil pour les **acheteurs** : le visiteur décrit son projet et son budget, voit tout de suite **combien il lui faut vraiment** (prix + 7 % − Bëllegen Akt + notaire + frais du prêt, apport minimum selon la règle CSSF), puis, avec ses coordonnées, **ce que son budget représente en m²** dans 1 à 3 communes. Tu reçois le lead par e-mail, avec les points à aborder au téléphone.

Concept et recherche (sources, choix, risques) : [`docs/concept.md`](docs/concept.md). Exemple d’e-mail de lead : [`docs/exemple-email-lead.txt`](docs/exemple-email-lead.txt).

| Partie | Où | Rôle |
| --- | --- | --- |
| Page de l’outil | `index.html`, `src/main.ts`, `src/ui/` | Le questionnaire (5 étapes) et les résultats. |
| Calcul du budget | `src/shared/budget.ts` | Règles publiques seulement. Tourne dans le navigateur (aperçu) **et** sur le serveur (e-mail). |
| m² par commune | `src/shared/communes-m2.ts` | Serveur seulement : les prix des communes ne partent vers le navigateur qu’après les coordonnées. |
| Serveur | `functions/api/budget.ts`, `src/server/handler.ts` | Cloudflare Pages Functions : vérifie, recalcule, envoie l’e-mail. |
| Intégration | `public/embed.js` | Crée l’iframe et règle sa hauteur. |
| Données | `data/communes.json` | Observatoire de l’Habitat (CC0), copie de celles de l’outil d’estimation. |
| Réglages | `params.json`, `config.json`, `server.json` | Règles et sources ; liens visibles ; e-mails et nom du courtier (serveur seulement). |

Comme l’outil d’estimation : pas de base de données, pas de cookie, pas de traceur, polices incluses.

## Le parcours

1. **Votre projet** : y habiter ou louer, seul ou à deux, premier achat (définition CSSF), Bëllegen Akt déjà utilisé, bien à vendre d’abord (→ lien vers estimatioun.lu).
2. **Ce que vous cherchez** : appartement / maison / les deux, neuf ou ancien, **1 à 3 communes de tout le Luxembourg**, chambres, surface (facultatif), extérieur (facultatif), garage, prêt à rénover, ce qui compte (facultatif).
3. **Votre budget** : apport, prix envisagé, banque déjà vue, montant d’emprunt connu (facultatif), revenu en tranche (facultatif), case « mis(e) en relation avec notre courtier partenaire ».
   → **Aperçu du budget, sans coordonnées** (calcul dans le navigateur, rien n’est envoyé).
4. **Calendrier** : quand, biens déjà visités (facultatif), intérêt pour un accompagnement à l’achat (facultatif).
5. **Coordonnées** : prénom, nom, e-mail, téléphone, message, « prévenez-moi si un bien correspond », accord RGPD.
   → **Résultat complet** : m² par commune, budget, points à vérifier, prochaines étapes (estimation si vente d’abord, rénovation, accompagnement, courtier), appel / rendez-vous, PDF.

## Calcul (`params.json`, chaque valeur avec sa source)

| Élément | Règle | Source | Statut |
| --- | --- | --- | --- |
| Droits | 7 % du prix (6 % + 1 %) | guichet.public.lu, page du 07/07/2025 | officiel |
| Bien neuf | 7 % affiché comme **maximum** (souvent seulement sur le terrain et la partie construite) | | prudent |
| Bëllegen Akt | 40 000 € par personne, plafonné aux droits ; l’AED perçoit toujours au moins 100 € ; 0 si investissement ou déjà utilisé | guichet.public.lu, pfi.public.lu | officiel |
| Ville de Luxembourg, Mamer | surtaxe communale (+50 % du droit d’enregistrement) **seulement** pour les immeubles à usage mixte ou commercial : 0 pour un logement, donc pas dans l’outil | pfi.public.lu (surtaxe), guichet.public.lu | vérifié le 18/11/2026 |
| 45 000 € annoncés | **affichés comme information, pas utilisés** (projet de loi 8806 pas voté au 18/11/2026) | gouvernement.lu, chd.lu | à mettre à jour quand la loi passe : `bellegen.par_personne` |
| Prêt maximal | 100 % premier achat pour y habiter ; 90 % autre résidence principale ; 90 % si « je ne sais pas » ; 80 % investissement | Règlement CSSF 20-08, FAQ du 09/03/2026 | officiel |
| Notaire, vente | barème 7 par tranches + TVA 17 % (600 000 € → 2 048 €) | notariat.lu, texte coordonné du Conseil d’État (doc. 51.123) | vérifié |
| Acte de prêt | 0,24 % + 0,05 % du prêt + honoraires barème 5 + TVA (600 000 € → 2 943 €) | pfi.public.lu (tarif, hypothèques), barème 5 | vérifié ; des exemptions existent : calcul prudent |
| Copies, extraits, débours | **300 à 1 000 €** | | **hypothèse à valider** (`divers`) |
| Prix maximal | seulement si le visiteur connaît son montant d’emprunt (sinon, avec 100 % de prêt, seul le revenu limiterait, et l’outil ne calcule pas de prêt) | | |
| m² par commune | appartement : ventes notariées (≥ 10), neuf : ventes VEFA (≥ 10), sinon médiane du canton ; maison : **prix annoncés** (≥ 30), sinon médiane du canton | Observatoire de l’Habitat | « prix demandés » écrit en clair pour les maisons |

### Mensualité d’exemple (ajoutée le 18/11/2026)

- Montrée sous le budget (aperçu et résultat) : prêt retenu, sur 20, 25 et 30 ans, au **taux moyen variable** et au **taux moyen fixe plus de 10 ans** des nouveaux crédits immobiliers au Luxembourg, hors assurance.
- Si le visiteur a donné sa tranche de revenu : part du revenu (25 ans, taux fixe), comparée au repère habituel des banques (un tiers à 40 %), en trois niveaux (plutôt sous / dans / plutôt au-dessus).
- **D’où viennent les taux, chaque mois, sans rien faire** : le serveur les lit en direct à la BCE, qui publie les statistiques de la BCL (`data-api.ecb.europa.eu`, séries `MIR.M.LU.B.A2C.F` et `.P`), et les garde 12 heures. Contrôle du 18/11/2026 : septembre 2026 = 3,13 % variable (identique au communiqué BCL du 03/11/2026) et 4,03 % fixe.
- **Garde-fous** (`src/shared/taux.ts`) : taux entre 0,5 et 10 %, écart variable/fixe de 4 points au plus, les deux séries du même mois, données de **4 mois au plus**. Sinon : valeur de secours de `params.json` (contrôlée, avec les mêmes règles) ; si elle a aussi plus de 4 mois, **aucune mensualité n’est affichée**.
- **Ton contrôle** : chaque e-mail de lead indique le taux utilisé, son mois et s’il vient de la BCE en direct ou de la **VALEUR DE SECOURS**. Si tu vois « valeur de secours » plusieurs fois de suite, la lecture en direct ne marche plus.
- Mettre à jour la valeur de secours (par ex. tous les 3 mois) : `npm run update-taux` puis `npm run deploy`. Le script s’arrête sans rien changer si les taux sont illisibles, non plausibles, trop anciens ou ont bougé de plus d’un point.
- Non testé : la lecture en direct **depuis Cloudflare** (en local, le serveur de test n’a pas pu joindre la BCE et a pris la valeur de secours ; depuis cette machine, la BCE répond).

Ce que l’outil **ne fait pas**, exprès : pas de capacité d’emprunt calculée à partir du revenu, pas de taux personnel, pas de nom de banque. La mensualité est un exemple au taux moyen, écrit comme tel. Phrase affichée sous chaque budget : « Cet outil ne constitue ni un conseil en crédit ni une offre de prêt. Seule votre banque décide. »

## Priorité du lead (e-mail)

- **Chaud** : achat dès que possible ou dans 3 à 6 mois **et** au moins un de : doit d’abord vendre au Luxembourg, veut être accompagné(e), veut le courtier, apport suffisant.
- **Tiède** : achat prévu dans les 12 mois.
- **Froid** : se renseigne.

Règle dans `src/shared/email.ts` (`leadPriority`), à adapter.

## Installer, tester, mettre en ligne

Même procédure que l’outil d’estimation (voir son README, parties 1 à 3), avec le nom de projet `acheteur-widget` :

```bash
cd acheteur-widget
npm install
cp .dev.vars.example .dev.vars   # EMAIL_MODE=log : aucun e-mail ne part en local
npm test                          # 65 tests
npm run dev                       # http://localhost:8788/ et /demo.html
```

Mise en ligne : `npx wrangler pages project create acheteur-widget --production-branch main`, puis `npm run deploy`, puis les secrets `RESEND_API_KEY`, `LEAD_EMAIL`, `FROM_EMAIL` (par ex. `ImmoBuild Acheteurs <acheteurs@immobuild.lu>`, sur le domaine déjà validé chez Resend) et, conseillé, `RATE_LIMIT_SALT` (une longue phrase au hasard). Le quota Resend gratuit (3 000 e-mails/mois, 100/jour) est **partagé** avec l’outil d’estimation s’il utilise le même compte.

Pas de domaine à part (ta décision du 18/11/2026) : l’outil tourne sur `acheteur-widget.pages.dev` (ou un sous-domaine de immobuild.lu si tu gères son DNS chez Cloudflare) et s’affiche sur une page de immobuild.lu, par ex. `/acheter`.

### WordPress (Elementor)

Widget **HTML**, une ligne (remplace l’adresse par celle de l’outil) :

```html
<div data-immobuild-acheteur data-lang="fr"></div><script src="https://acheteur-widget.pages.dev/embed.js" async></script>
```

`data-lang="de"` ou `"en"` pour les autres langues. Mêmes options que l’outil d’estimation (`data-offset`, `data-src`). L’outil n’accepte d’être affiché que sur `immobuild.lu` et ses sous-domaines (`public/_headers`).

### Données (chaque trimestre)

Les données viennent de l’outil d’estimation. Après `npm run update-data` dans `estimation-widget/` :

```bash
cd acheteur-widget && npm run sync-data && npm test && npm run deploy
```

## À faire par toi avant la mise en ligne

1. `config.json` : vérifier `contactUrl`, `privacyUrl` (vraies adresses), `quickCommunes` (raccourcis de l’étape 2, actuellement Luxembourg, Esch, Dudelange, Bettembourg, Differdange, Mersch).
2. `params.json` : valider l’hypothèse « copies, extraits, débours » (300 à 1 000 €) avec un notaire.
3. Politique de confidentialité : ajouter les nouvelles données (budget, revenu en tranche) et **nommer atHome Finance comme destinataire possible** (voir `PRIVACY.md`).
4. Quand le projet de loi 8806 est voté : `params.json` → `bellegen.par_personne` = 45000 (et mettre à jour `_source`). L’annonce « pas encore votée » disparaît alors toute seule.

## Tests (65)

| Sujet | Fichier |
| --- | --- |
| Calcul à la main : couple, premier achat, 600 000 € ; investissement 400 000 € ; Bëllegen Akt seul / déjà utilisé ; bien neuf ; montant d’emprunt connu ; prix maximal | `tests/budget.test.ts` |
| m² par commune : Dudelange ≈ 92 m² (appartement), ≈ 113 m² (maison, prix annoncés), médiane du canton | `tests/budget.test.ts` |
| API : e-mail complet, nom du courtier absent du résultat, pas de résultat sans coordonnées valides, RGPD, honeypot, Origin, 3 communes max, recalcul serveur, Resend en panne, limite de 20/heure | `tests/api.test.ts` |
| Montants tolérants (« 60k », « 600.000 € », « 1,2 M »…), montant d’emprunt facultatif, aperçu sans coordonnées | `tests/validation.test.ts` |
| Taux : lecture de la vraie réponse BCE, format inattendu, taux absurdes, trop anciens, BCE en panne ; mensualité calculée à la main (600 000 € sur 25 ans à 4,03 % = 3 176,97 €) ; part du revenu | `tests/taux.test.ts` |
| Écrans : avertissement « ni conseil en crédit ni offre de prêt » (3 langues), 45 000 € annoncés mais non utilisés, aucun prix de commune dans l’aperçu, renvoi vers l’estimation, case courtier sans nom | `tests/result-view.test.ts` |

Vérifié aussi dans un vrai navigateur (Chromium, 390 px et 320 px, 18/11/2026) : parcours complet jusqu’au résultat, 0 erreur JavaScript, 0 défaut d’accessibilité axe-core (WCAG 2.1 AA) sur les 8 écrans, pas de défilement horizontal, intégration par iframe. Captures dans `screenshots/`.
