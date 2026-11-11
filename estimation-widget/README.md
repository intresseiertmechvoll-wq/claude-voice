# Estimation gratuite – ImmoBuild Kohn

Outil « Estimation gratuite » pour récolter des leads de vendeurs :

1. le visiteur décrit son bien en 6 étapes ;
2. il donne ses coordonnées ;
3. il voit 3 valeurs (basse, marché, haute), et tu reçois le lead par e-mail.

L'outil est indépendant de tes sites : il s'affiche dans une iframe, sur WordPress (Elementor) comme sur Next.js.

| Partie | Où | Rôle |
| --- | --- | --- |
| Page de l'outil | `index.html`, `src/` | Le questionnaire (HTML, CSS, TypeScript, Vite). Aucune donnée de prix dans le navigateur. |
| Intégration | `public/embed.js` | Crée l'iframe et règle sa hauteur toute seule. |
| Serveur | `functions/api/estimate.ts`, `src/server/` | Cloudflare Pages Functions : vérifie, calcule, envoie l'e-mail. |
| Calcul | `src/shared/engine.ts` | Le moteur (logique du moteur V1, voir plus bas). |
| Données | `data/communes.json` | Observatoire de l'Habitat, data.public.lu, licence CC0. |
| Réglages | `params.json`, `config.json` | Coefficients (à valider par Jay), liens, adresse e-mail. |

Pas de base de données, pas de cookie, pas de traceur. Les polices sont incluses dans l'outil (pas de Google Fonts).

### Ce que vit le visiteur

- **Un parcours visuel** : cartes illustrées (appartement / maison, type de maison, état, projet, délai), boutons − / + pour les chambres, salles de bain, garages et parkings, curseurs pour les surfaces, étiquette énergie en couleurs (A+ à I), notes des gros postes avec un bouton « Tout mettre sur Bon », interrupteurs pour la cave et le jardin.
- **Rapide** : raccourcis vers les communes proches de Dudelange (réglables), recherche de commune tolérante aux accents et aux autres noms (quartiers de Luxembourg comme Kirchberg ou Bonnevoie, noms allemands ou luxembourgeois comme Düdelingen ou Diddeleng : liste dans `src/shared/aliases.ts`), canton affiché dès le choix, avertissement immédiat si la commune n'a pas assez de données publiques, résumé du bien qui se construit en haut de l'écran.
- **Indulgent** : « 80m2 », « 1 200 », l'indicatif « +352 » recopié dans le numéro, une année sur 2 chiffres, un terrain donné en ares ou une faute dans l'e-mail (« gmial.com ») sont reconnus et corrigés ou expliqués, sans laisser passer de mauvaises données.
- **Rassurant** : progression avec icônes, erreurs expliquées et effacées dès que le champ est correct, récapitulatif modifiable avant l'envoi, engagements clairs (gratuit, sans engagement, pas de cookie).
- **Un écran « Analyse de votre bien »** après l'envoi (environ 6 secondes) : une maison qui se remplit depuis le bas, un pourcentage et 5 étapes cochées une à une — rassemblement des réponses, recherche des données de la commune (avec les vrais chiffres, par ex. « 130 ventes notariées et 508 annonces trouvées à Dudelange »), comparaison des méthodes, ajustement du prix, calcul du prix final. Voir « Écran d'analyse » plus bas.
- **Un simulateur « Et si… ? »** sous le résultat : le visiteur teste une autre classe énergétique, un autre état ou des travaux (cuisine, salle de bain, châssis…) et voit aussitôt la nouvelle valeur et l'écart. Le visiteur est prévenu que tu reçois ses essais. Tu reçois un e-mail de complément quand il quitte la page (au plus 3 par résultat, chacun avec les seuls essais nouveaux) : utile pour préparer le rendez-vous. Voir « Simulateur » plus bas.
- **Une barre de progression qui avance à chaque réponse**, avec une petite avance au départ.
- **Une présence humaine** : une bulle de Jay sous chaque titre, qui réagit à certaines réponses (« Un garage, ça compte ! »). Les phrases sont dans `src/i18n/fr.json` → `coach`, à adapter à ta voix. Ta photo : `config.json` → `agent.photo`.
- **Un résultat sobre** : un sceau doré qui se dessine (pas de confettis : une estimation peut décevoir).
- **Un résultat utile pour lui** : valeur de marché en grand et prix au m², fourchette basse / haute, position de son bien parmi les ventes réelles de sa commune (appartements), chiffres de la commune, ce qui fait monter ou baisser son prix, fiabilité des données, explication du calcul, prochaines étapes, impression / PDF.
- **Accessible et léger** : 0 erreur axe-core (WCAG 2.1 AA) sur tous les écrans capturés, utilisable au clavier, animations coupées si le visiteur le demande à son système. Lighthouse mobile (en local, 11/11/2026) : performance 100, accessibilité 100, bonnes pratiques 100, 89 Ko au total (photo comprise).

---

## 1. Installer

Il te faut **Node.js 20 ou plus récent** (nodejs.org, version « LTS »).

```bash
cd estimation-widget
npm install
```

> Le projet a été créé dans le dossier `estimation-widget/` de la branche `claude/estimation-widget-immobuild-g7jc99` du dépôt `claude-voice` (le seul dépôt disponible pendant sa création). Pour en faire un dépôt à part, à côté de `immobuild-website`, en gardant l'historique :
>
> ```bash
> git subtree split --prefix=estimation-widget -b estimation-widget-seul
> mkdir ../estimation-widget && cd ../estimation-widget && git init
> git pull ../claude-voice estimation-widget-seul
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

En local, `.dev.vars` contient `EMAIL_MODE=log` : **aucun e-mail ne part**. Le contenu de l'e-mail du lead s'affiche dans le terminal.

Captures d'écran mobiles de chaque étape et audit d'accessibilité (serveur local lancé, Playwright installé avec `npm i -D playwright && npx playwright install chromium`) :

```bash
npm run screenshots   # → dossier screenshots/
```

## 3. Mettre en ligne sur Cloudflare

Cloudflare Pages est gratuit. Les fonctions serveur partagent le quota gratuit des Workers : **100 000 requêtes par jour** (remis à zéro à minuit UTC). Les fichiers statiques (la page, embed.js) ne comptent pas dans ce quota.

### 3.1 Créer le projet (une seule fois)

1. Crée un compte sur cloudflare.com (offre Free).
2. Dans le terminal, dans le dossier du projet :

```bash
npx wrangler login                                                   # ouvre le navigateur pour te connecter
npx wrangler pages project create estimation-widget --production-branch main
npm run deploy                                                       # construit et envoie l'outil
```

L'outil est en ligne à l'adresse affichée, en général `https://estimation-widget.pages.dev`.

### 3.2 Les variables

```bash
npx wrangler pages secret put RESEND_API_KEY --project-name estimation-widget
npx wrangler pages secret put LEAD_EMAIL --project-name estimation-widget
npx wrangler pages secret put FROM_EMAIL --project-name estimation-widget
```

Chaque commande te demande la valeur :

| Variable | Valeur | Obligatoire |
| --- | --- | --- |
| `RESEND_API_KEY` | ta clé Resend (`re_…`, voir 3.3) | oui |
| `SIMULATION_SECRET` | une longue phrase au hasard (secret des tickets du simulateur) | non, conseillé |
| `LEAD_EMAIL` | l'adresse qui reçoit les leads, par défaut `contact@immobuild.lu` | non |
| `FROM_EMAIL` | l'expéditeur, sur ton domaine validé chez Resend, par ex. `ImmoBuild Estimation <estimation@immobuild.lu>` | oui, sauf si c'est exactement cette adresse |

Les valeurs sont chiffrées chez Cloudflare. La clé n'est jamais dans le code. Tu peux aussi les voir et les modifier dans le tableau de bord Cloudflare : Workers & Pages → estimation-widget → Settings → Variables and Secrets. Relance `npm run deploy` après un changement.

### 3.3 Resend (l'envoi des e-mails)

1. Crée un compte sur resend.com. L'offre gratuite permet **3 000 e-mails par mois et 100 par jour, pour 1 domaine** (source : [resend.com/blog/new-free-tier](https://resend.com/blog/new-free-tier)).
2. Domains → Add domain → `immobuild.lu`. Resend te donne des enregistrements DNS (SPF, DKIM, MX de retour). Ajoute-les chez ton hébergeur DNS, puis clique « Verify ». La validation peut prendre de quelques minutes à quelques heures.
3. API Keys → Create API key → droits « Sending access » → copie la clé dans `RESEND_API_KEY` (3.2).
4. L'adresse `FROM_EMAIL` doit être sur le domaine validé.

### 3.4 La limite de 5 envois par heure et par IP (gratuit)

Sans réglage, la limite fonctionne déjà, mais en mémoire : chaque serveur Cloudflare compte de son côté, et le compteur repart à zéro quand le serveur redémarre. Pour un compteur fiable et partagé, active Cloudflare KV (gratuit : 100 000 lectures et 1 000 écritures par jour, largement assez ici) :

```bash
npx wrangler kv namespace create RATE_LIMIT
```

Puis dans le tableau de bord : Workers & Pages → estimation-widget → Settings → Bindings → Add → KV namespace → nom de la variable `RATE_LIMIT`, espace `RATE_LIMIT`. Relance `npm run deploy`.

Ce qui est stocké dans KV : une empreinte (SHA-256) de l'adresse IP et un compteur, effacés automatiquement après 1 heure. L'adresse IP elle-même n'est jamais écrite. C'est expliqué dans `PRIVACY.md`.

### 3.5 Vérifier

1. Ouvre `https://estimation-widget.pages.dev/demo.html`.
2. Fais une estimation avec tes propres coordonnées.
3. Vérifie que l'e-mail arrive dans `LEAD_EMAIL`, et que « Répondre » écrit bien au visiteur.

### 3.6 (Facultatif) Ta propre adresse

Workers & Pages → estimation-widget → Custom domains → `estimation.immobuild.lu`. Ensuite, remplace `estimation-widget.pages.dev` par cette adresse dans le code d'intégration (partie 5).

## 4. Mettre à jour les données (chaque trimestre)

L'Observatoire de l'Habitat publie de nouveaux fichiers chaque trimestre (dernières publications vues : 26/03/2026 et 24/09/2026). Une commande :

```bash
npm run update-data && npm test && npm run deploy
```

- `update-data` télécharge les derniers fichiers par l'API de data.public.lu et réécrit `data/communes.json`, ainsi que `data/sans-donnees.json` (la liste des communes sans assez de données, qui sert à prévenir le visiteur dès l'étape 1).
- Si un fichier n'a pas le format attendu (colonnes, nombre de communes, nom de commune inconnu), le script **s'arrête sans rien modifier** et dit pourquoi. Ne force pas : regarde le fichier, ou demande de l'aide.
- Les tests utilisent une copie figée des données (`tests/fixtures/`), donc le calcul à la main du test Dudelange reste valable après une mise à jour.
- Derrière un proxy d'entreprise, lance `NODE_USE_ENV_PROXY=1 npm run update-data`.

Le dossier `moteur-v1` n'existait pas quand l'outil a été créé : le script part directement des fichiers de data.public.lu.

## 5. Intégrer l'outil

Remplace `https://estimation-widget.pages.dev` par ton adresse si tu en as une autre (3.6).

### WordPress (Elementor)

Ajoute un widget **HTML** sur la page, et colle **une ligne** :

```html
<div data-immobuild-estimation data-lang="fr"></div><script src="https://estimation-widget.pages.dev/embed.js" async></script>
```

Pour les pages en allemand ou en anglais : `data-lang="de"` ou `data-lang="en"`.

Options utiles :

- **En-tête fixe** sur le site (menu qui reste en haut) : ajoute sa hauteur, ex. `data-offset="90"` sur le `<div>`, pour que le haut de l'outil ne passe pas dessous quand il fait défiler la page.
- **Extension WordPress qui recopie les scripts** (cache, optimisation) : ajoute `data-src="https://estimation-widget.pages.dev/embed.js"` sur le `<script>`.
- **Largeur** : prévois au moins 320 px pour la colonne qui contient l'outil (testé de 320 à 1280 px, rien ne déborde).
- **Si l'outil ne s'affiche pas** (adresse du site non autorisée, panne), un bouton « Ouvrir l'estimation gratuite » le remplace après 15 secondes, et la console du navigateur explique pourquoi.
- **Si ton site a une règle CSP** : autorise l'adresse de l'outil dans `frame-src`.

### Next.js (dépôt immobuild-website)

Je n'ai pas modifié ce dépôt. Voici le composant à ajouter. Il est aussi dans `integration/EstimationWidget.tsx`.

1. Copie ce fichier dans `immobuild-website/components/EstimationWidget.tsx` :

```tsx
'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const WIDGET_URL = process.env.NEXT_PUBLIC_ESTIMATION_URL ?? 'https://estimation-widget.pages.dev';

declare global {
  interface Window {
    ImmoBuildEstimation?: { mount: () => void };
  }
}

export default function EstimationWidget({ lang = 'fr' }: { lang?: 'fr' | 'de' | 'en' }) {
  useEffect(() => {
    window.ImmoBuildEstimation?.mount();
  }, [lang]);

  return (
    <>
      <div key={lang} data-immobuild-estimation="" data-lang={lang} />
      <Script src={`${WIDGET_URL}/embed.js`} strategy="afterInteractive" data-manual="" onReady={() => window.ImmoBuildEstimation?.mount()} />
    </>
  );
}
```

2. Dans la page voulue : `import EstimationWidget from '@/components/EstimationWidget';` puis `<EstimationWidget lang="fr" />`.
3. Dans `.env` : `NEXT_PUBLIC_ESTIMATION_URL=https://estimation-widget.pages.dev`.

**Important :** l'outil n'accepte d'être affiché que sur `immobuild.lu` et ses sous-domaines (règle `frame-ancestors` dans `public/_headers`). Si le nouveau site tourne sur une autre adresse (par exemple `immobuild-website.vercel.app`), ajoute-la sur cette ligne, puis `npm run deploy`.

---

## Comment le prix est calculé

Toutes les données viennent de l'Observatoire de l'Habitat (data.public.lu, licence CC0), période actuelle : 1er juillet 2025 – 30 juin 2026.

### Appartement (logique du moteur V1, audit du 23/10/2026)

1. **Ventes notariées (50 %)** : prix moyen au m² des appartements existants vendus dans la commune. Si la commune a moins de 10 ventes (l'Observatoire ne publie alors pas de prix), on prend la **médiane des communes du canton** qui ont au moins 10 ventes.
2. **Annonces corrigées (30 %)** : prix annoncé au m² × (1 − décote du canton). La décote du canton est la médiane, sur les communes du canton, de l'écart entre prix annoncé et prix notarié. S'il y a moins de 3 communes avec les deux chiffres dans le canton (actuellement Clervaux, Diekirch, Echternach, Redange, Vianden et Wiltz), on prend la médiane nationale (9,2 % aujourd'hui). La décote est bornée entre 0 et 20 %.
3. **Capitalisation (20 %)** : loyer annoncé au m² × 12 × (1 − 10 % de charges) ÷ 4,5 %.
4. **Garde-fou** : si une méthode s'écarte de plus de 20 % de la moyenne des deux autres, elle sort du calcul (elle reste visible dans l'e-mail). Les poids des méthodes restantes sont recalculés. Exemple réel : à Esch-sur-Alzette, les loyers annoncés au m² sont très élevés (petites surfaces), donc la capitalisation sort.
5. Une méthode sans donnée (trop peu d'annonces) est simplement absente.

### Maison

Il n'existe pas de prix de vente publics pour les maisons. Base = prix annoncé « maison » de la commune × (1 − décote du canton). La fourchette est de ±12 %, et l'encadré « Estimation indicative » s'affiche.

### Puis, pour les deux

Valeur = prix de base au m² × surface × (1 + somme des coefficients) + annexes, arrondie à 5 000 €. Valeur basse = valeur × (1 − écart), valeur haute = valeur × (1 + écart), arrondies à 5 000 €.

### Pas assez de données

Pas de prix affiché, mais le message « Je vous recontacte avec une estimation personnalisée ». Le lead part quand même. Cas actuels :

- **Appartement** : la commune n'a ni 10 ventes ni 30 annonces d'appartements (36 communes, surtout rurales : Beaufort, Tandel, Wincrange…).
- **Maison** : la commune a moins de 30 annonces de maisons (17 communes : Bech, Berdorf, Bourscheid, Erpeldange-sur-Sûre, Fischbach, Goesdorf, Kiischpelt, Larochette, Manternach, Nommern, Putscheid, Saeul, Schieren, Tandel, Waldbillig, Weiswampach, Winseler).

Le visiteur en est prévenu dès l'étape 1, sous la commune, avant de remplir le reste.

## Paramètres (`params.json`) — tout est à valider par Jay

Valeurs de départ simples et prudentes, choisies pour cet outil. Aucune grille d'Estimator Pro ni de Propteo n'a été reprise. Les coefficients s'additionnent, puis le total est borné entre −30 % et +20 %.

| Réglage | Valeur | Pourquoi |
| --- | --- | --- |
| Poids appartement | 50 / 30 / 20 | Ta décision du 23/10/2026. |
| Écart de la fourchette | ±6 % appartement, ±12 % maison | Ta consigne. |
| Garde-fou | 20 % | Moteur V1. |
| Ventes minimum par commune | 10 | Seuil de publication de l'Observatoire. |
| Décote annonce → vente | médiane du canton (au moins 3 communes, sinon médiane nationale), bornée 0–20 % | Calculée sur les données. Actuellement : Esch 4,1 %, Luxembourg 12,1 %, Mersch 14,5 %, Capellen 9,4 %, national 9,2 %. Avec 2 communes seulement, Wiltz tombait à 0 % (−12,7 % et +10,9 %) : d'où le minimum de 3. |
| Capitalisation | charges 10 %, taux 4,5 % | La médiane réelle (loyer annoncé × 12 × 0,9 ÷ prix notarié) est de 4,35 % sur les 33 communes qui ont les deux. 4,5 % donne une valeur un peu plus basse, donc prudente. |
| État général | neuf +8 %, rénové +4 %, bon 0, à rafraîchir −5 %, à rénover −15 % | Le prix moyen de la commune correspond à peu près à un « bon état ». « Neuf » reste prudent : l'outil n'utilise pas le prix VEFA. |
| Gros postes (chacun) | mauvais −2 %, moyen −1 %, bon 0, neuf +1 %, je ne sais pas 0 ; total borné entre −8 % et +4 % | Petit, pour ne pas compter deux fois avec l'état général. |
| Classe énergétique | A+ et A +4 %, B +3 %, C +2 %, D +1 %, E 0, F −2 %, G −4 %, H −6 %, I −8 %, inconnue 0 | Écarts modérés, centrés sur E. |
| Étage (appartement) | rez-de-chaussée −3 % ; 3e étage ou plus sans ascenseur −5 % | |
| Jardin (appartement) | +3 % | Pour une maison, le terrain compte à la place. |
| Type de maison | mitoyenne −5 %, jumelée 0, isolée +5 % | Le prix annoncé moyen mélange tous les types. |
| Terrain (maison) | surface de référence : 250 m² mitoyenne, 400 m² jumelée, 600 m² isolée ; moins de 60 % de la référence −3 %, plus de 150 % +4 % | |
| Annexes appartement | garage 25 000 €, parking extérieur 10 000 €, cave 5 000 €, balcon/terrasse 25 % du prix au m² (30 m² max.) | Le prix notarié moyen inclut déjà une partie des annexes, d'où des montants modestes. |
| Annexes maison | garage 20 000 €, parking extérieur 5 000 €, cave 0, terrasse 0 | La cave et la terrasse sont courantes dans les maisons, donc déjà dans le prix annoncé. |
| Nombre maximal valorisé | 4 garages et 4 parkings | Au-delà, ce n'est plus un logement avec garage (garages à louer, immeuble) : l'estimation automatique n'a pas de sens. Les chiffres saisis restent dans l'e-mail. |
| Ajustement des annexes | × (prix de base ÷ 7 000 €/m²), borné entre 0,7 et 1,3 | Un garage vaut plus à Luxembourg-Ville qu'à Wiltz. |
| Arrondi | 5 000 € | Ta consigne. |
| Fiabilité affichée au visiteur | appartement : « bonne » si ≥ 50 ventes dans la commune et 3 méthodes gardées, « moyenne » si ventes propres à la commune, sinon « limitée » ; maison : « moyenne » si ≥ 100 annonces de maisons, sinon « limitée » | Règle simple et visible (idée V2 de l'audit). |
| Priorité du lead (e-mail) | chaud : propriétaire + vendre + dans les 3 mois ; tiède : propriétaire qui veut vendre ou louer plus tard ; froid : le reste | Pour savoir qui rappeler en premier. Règle dans `src/shared/email.ts`. |

Non utilisés dans le calcul (mais présents dans l'e-mail) : année de construction, chambres, salles de bain, rue, prix VEFA.

Autres réglages, dans `config.json` :

- lien de la page contact et de la politique de confidentialité (**à vérifier : je ne connais pas tes vraies adresses**) ;
- `agent` : ton prénom et ta ligne de présentation ; `photo` : chemin d'une photo placée dans `public/` (ex. `/jay.jpg`), sinon l'initiale s'affiche ;
- `phone` : ton numéro, affiché comme bouton « appeler » sous le résultat (vide = pas de bouton) ;
- `quickCommunes` : les raccourcis de l'étape 1 ;
- `publicEmail` : l'adresse montrée au visiteur si l'envoi échoue ou s'il a atteint la limite (« écrivez-nous à … ») ;
- adresse des leads par défaut, nombre d'envois par heure.

## Écran d'analyse

Ta demande du 09/11/2026 remplace la règle de départ « pas de faux écran d'analyse ».

- **Pourquoi** : l'étude « The Labor Illusion » (Buell & Norton, *Management Science*, 2011) montre que des personnes préfèrent un service plus lent qui montre le travail effectué à un résultat instantané identique. L'effet vient de la **transparence** : voir ce qui est fait.
- **Ce qui est vrai** : chaque étape décrit une opération que le calcul fait réellement. Les chiffres affichés (nombre de réponses, ventes et annonces de la commune, nombre d'ajustements) sont ceux du calcul, affichés dès que le serveur a répondu. Rien n'est inventé.
- **Ce qui est mis en scène** : le rythme. Le calcul prend moins d'une seconde ; l'écran dure environ 6 secondes.
- **En cas de problème** : si le serveur refuse (trop d'envois, erreur, pas de réseau), l'écran s'arrête aussitôt et le message s'affiche (mesuré : 61 ms). Pour une commune sans assez de données, l'analyse s'arrête honnêtement après la recherche des données.
- **Réglage** : `config.json` → `analysis.totalMs` (5600 par défaut ; 0 = résultat immédiat).
- **Accessibilité** : barre de progression lue par les lecteurs d'écran, chaque étape annoncée ; animations coupées si le visiteur le demande à son système (la durée reste la même).

## Simulateur « Et si… ? » et barre de progression

- **Pourquoi** : les gens font davantage confiance à un calcul quand ils peuvent l'ajuster un peu (Dietvorst, Simmons & Massey, *Management Science*, 2018). Une avance visible au départ pousse à aller au bout (Nunes & Drèze, *Journal of Consumer Research*, 2006).
- **Sécurité** : le simulateur ne marche qu'avec le ticket signé remis avec le résultat (impossible d'obtenir un prix sans avoir laissé ses coordonnées). Seuls l'état, la classe énergétique et les gros postes peuvent changer ; la surface et la commune non. Au plus 120 calculs par heure et par IP ; e-mails de complément : 3 par heure et par IP, et 3 par ticket (avec KV activé, cette 2e limite tient aussi d'un serveur à l'autre).
- **E-mail de complément** : les valeurs sont recalculées par le serveur, jamais reprises du navigateur. Il part au moment où le visiteur quitte la page ou clique sur « Prendre rendez-vous », avec seulement les essais pas encore envoyés (les essais identiques sont fusionnés) ; si le navigateur est fermé brutalement, il peut ne pas partir (le lead principal, lui, est déjà envoyé).
- **Secret du ticket** : variable facultative `SIMULATION_SECRET` (une longue phrase au hasard). Sans elle, la clé Resend sert de secret. Si tu changes l'une ou l'autre, les tickets en cours (2 heures) ne marchent plus, rien de grave.
- **Honnêteté** : le simulateur affiche « sans compter le coût des travaux ».

## Sécurité et données personnelles

- Vérification de tous les champs sur le serveur (le navigateur ne fait qu'aider à la saisie).
- Champ caché anti-robot (honeypot) : s'il est rempli, rien n'est calculé ni envoyé.
- Au plus 5 envois par heure pour une même IP (3.4).
- Le formulaire n'est accepté que depuis la page de l'outil elle-même (contrôle de l'en-tête `Origin`).
- Le résultat n'est renvoyé qu'après des coordonnées valides **et** l'envoi réussi de l'e-mail. Si Resend échoue ou ne répond pas en 10 secondes, le visiteur voit un message d'erreur avec ton adresse e-mail et peut réessayer (l'essai raté ne compte pas dans la limite de 5) : le lead n'est jamais perdu en silence.
- La rue, le nom et les autres champs d'une ligne ne peuvent pas contenir de retour à la ligne ni de caractères invisibles : impossible d'imiter une rubrique de l'e-mail. Le message libre est mis en retrait.
- Aucune donnée n'est stockée ailleurs que dans l'e-mail (et, si KV est activé, une empreinte d'IP effacée après 1 heure).
- Détails pour ta politique de confidentialité : `PRIVACY.md`.

## Tests

`npm test` lance 63 tests, dont ceux demandés :

| Test | Fichier |
| --- | --- |
| Appartement 80 m² à Dudelange = calcul à la main (540 000 €) | `tests/engine.test.ts` |
| Maison à Dudelange : ±12 % et mention « indicative » | `tests/engine.test.ts`, `tests/result-view.test.ts` |
| Commune avec moins de 10 ventes → médiane du canton (Leudelange) | `tests/engine.test.ts` |
| Changer seulement la classe énergétique change le prix | `tests/engine.test.ts` |
| Sans case RGPD → refusé ; honeypot → bloqué | `tests/api.test.ts` |
| Jamais de résultat sans coordonnées valides | `tests/api.test.ts` |
| Résultat enrichi (position dans la commune, facteurs, fiabilité, allemand) | `tests/result-view.test.ts` |
| Écran d'analyse : 5 étapes, durée réglable, vrais chiffres seulement après la réponse du serveur | `tests/analysis.test.ts` |
| Textes essentiels protégés (jardin et cave privatifs, ares, bornes de la jauge, ventes notariées, destination des données) | `tests/texts-essentiels.test.ts` |
| Simulateur : ticket signé obligatoire, valeurs interdites refusées, aucun e-mail par essai, e-mail de complément recalculé côté serveur | `tests/simulate.test.ts` |
| Revue par 6 agents (11/11/2026) : un test par bug confirmé (Resend en panne, rejeu du ticket, saisie tolérante, autres noms de communes, fourchette des petits logements, garages plafonnés, prix au m² cohérent, poids réels dans l'e-mail) | `tests/revue-agents.test.ts` |

`npm run screenshots` (serveur local lancé) parcourt tout le questionnaire comme un visiteur, prend les captures et lance un audit d'accessibilité axe-core (WCAG 2.1 AA) sur chaque écran.
