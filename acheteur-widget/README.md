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
| Bëllegen Akt | 40 000 € par personne, plafonné aux droits ; 0 si investissement ou déjà utilisé | guichet.public.lu | officiel |
| 45 000 € annoncés | **affichés comme information, pas utilisés** (projet de loi 8806 pas voté au 18/11/2026) | gouvernement.lu, chd.lu | à mettre à jour quand la loi passe : `bellegen.par_personne` |
| Prêt maximal | 100 % premier achat pour y habiter ; 90 % autre résidence principale ; 90 % si « je ne sais pas » ; 80 % investissement | Règlement CSSF 20-08, FAQ du 09/03/2026 | officiel |
| Notaire, vente | barème 7 par tranches + TVA 17 % (600 000 € → 2 048 €) | repris de tevaxia.lu | **texte légal à relire** sur legilux |
| Frais du prêt | 0,24 % + 0,05 % du prêt + **1 000 à 2 500 €** (honoraires de l’acte de prêt, débours) | 0,05 % : pfi.public.lu ; 0,24 % : sites privés | **hypothèse à valider** (`pret.divers_min/max`) |
| Prix maximal | seulement si le visiteur connaît son montant d’emprunt (sinon, avec 100 % de prêt, seul le revenu limiterait, et l’outil ne calcule pas de prêt) | | |
| m² par commune | appartement : ventes notariées (≥ 10), neuf : ventes VEFA (≥ 10), sinon médiane du canton ; maison : **prix annoncés** (≥ 30), sinon médiane du canton | Observatoire de l’Habitat | « prix demandés » écrit en clair pour les maisons |

Ce que l’outil **ne fait pas**, exprès : pas de mensualité, pas de taux, pas de capacité d’emprunt calculée à partir du revenu, pas de nom de banque. Phrase affichée sous chaque budget : « Cet outil ne constitue ni un conseil en crédit ni une offre de prêt. Seule votre banque décide. »

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
npm test                          # 52 tests
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
2. `params.json` : valider l’hypothèse des frais du prêt (1 000 à 2 500 €) et relire le barème du notaire sur legilux.
3. Politique de confidentialité : ajouter les nouvelles données (budget, revenu en tranche) et **nommer atHome Finance comme destinataire possible** (voir `PRIVACY.md`).
4. Quand le projet de loi 8806 est voté : `params.json` → `bellegen.par_personne` = 45000 (et mettre à jour `_source`). L’annonce « pas encore votée » disparaît alors toute seule.

## Tests (52)

| Sujet | Fichier |
| --- | --- |
| Calcul à la main : couple, premier achat, 600 000 € ; investissement 400 000 € ; Bëllegen Akt seul / déjà utilisé ; bien neuf ; montant d’emprunt connu ; prix maximal | `tests/budget.test.ts` |
| m² par commune : Dudelange ≈ 92 m² (appartement), ≈ 113 m² (maison, prix annoncés), médiane du canton | `tests/budget.test.ts` |
| API : e-mail complet, nom du courtier absent du résultat, pas de résultat sans coordonnées valides, RGPD, honeypot, Origin, 3 communes max, recalcul serveur, Resend en panne, limite de 20/heure | `tests/api.test.ts` |
| Montants tolérants (« 60k », « 600.000 € », « 1,2 M »…), montant d’emprunt facultatif, aperçu sans coordonnées | `tests/validation.test.ts` |
| Écrans : avertissement « ni conseil en crédit ni offre de prêt » (3 langues), 45 000 € annoncés mais non utilisés, aucun prix de commune dans l’aperçu, renvoi vers l’estimation, case courtier sans nom | `tests/result-view.test.ts` |

Vérifié aussi dans un vrai navigateur (Chromium, 390 px et 320 px, 18/11/2026) : parcours complet jusqu’au résultat, 0 erreur JavaScript, 0 défaut d’accessibilité axe-core (WCAG 2.1 AA) sur les 8 écrans, pas de défilement horizontal, intégration par iframe. Captures dans `screenshots/`.
