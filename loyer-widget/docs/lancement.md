# Lancement : faire venir des propriétaires sur l’outil

Préparé le 23/11/2026. L’outil ne produit des leads que si des propriétaires le trouvent. Ce document donne des textes prêts à l’emploi ; **à relire et adapter par Jason** (ton, offre de gestion, budget). Aucun texte ne promet un loyer, un délai de location ou un « meilleur prix » : l’outil donne une estimation indicative.

Adresses à utiliser :

| Public | Lien |
| --- | --- |
| Francophones | `https://verlounen.lu/fr/` |
| Germanophones / luxembourgophones | `https://verlounen.lu/de/` |
| Expatriés | `https://verlounen.lu/en/` |

(À remplacer si l’outil est mis en ligne à une autre adresse ; même adresse que `siteUrl` dans `config.json`.)

## 1. Sur immobuild.lu (gratuit, à faire en premier)

- Intégrer l’outil sur la page « gestion locative » (une ligne, voir README partie 5).
- Ajouter un bouton dans le menu ou sur l’accueil : **« Quel loyer pour votre bien ? »** → `/fr/`.
- Signature e-mail de Jason : « Quel loyer pour votre appartement ou votre maison ? Estimation gratuite : verlounen.lu/fr/ »

## 2. Google Ads (Search) – annonce responsive

Ciblage suggéré : Luxembourg, rayon autour de Dudelange / canton d’Esch-sur-Alzette pour commencer ; mots-clés comme *estimation loyer luxembourg*, *quel loyer pour mon appartement*, *loyer maison dudelange*, *gestion locative dudelange*, *Miete schätzen Luxemburg*. Les longueurs ci-dessous respectent les limites de Google Ads (titres 30 caractères, descriptions 90), vérifiées par un script.

**Français – titres (30 max)**
- Quel loyer pour votre bien ?
- Estimation de loyer gratuite
- Loyer au Luxembourg
- En 2 minutes, sans engagement
- À partir de données publiques
- Appartement ou maison
- Gestion locative à Dudelange
- ImmoBuild Kohn, Dudelange

**Français – descriptions (90 max)**
- Estimez le loyer de votre appartement ou maison au Luxembourg avec des données publiques.
- Gratuit, en 4 étapes. Fourchette de loyer et plafond légal inclus.

**Deutsch – Titel (max. 30)**
- Welche Miete ist realistisch?
- Kostenlose Mietschätzung
- Miete in Luxemburg schätzen
- In 2 Minuten, unverbindlich
- Auf Basis öffentlicher Daten
- Wohnung oder Haus
- Mietverwaltung in Düdelingen
- ImmoBuild Kohn, Düdelingen

**Deutsch – Beschreibungen (max. 90)**
- Mietschätzung für Ihre Wohnung oder Ihr Haus in Luxemburg, auf Basis öffentlicher Daten.
- Kostenlos, in 4 Schritten. Mit Mietspanne und gesetzlicher Obergrenze.

## 3. Facebook / Instagram / LinkedIn (publication)

**FR**
> Vous louez (ou allez louer) un appartement ou une maison au Luxembourg ? Quel loyer demander ?
> Notre outil gratuit fait une estimation en 4 étapes, à partir des loyers publiés par l’Observatoire de l’Habitat et des annonces de maisons. Vous obtenez une fourchette, du loyer prudent au loyer d’annonce, et le rappel du plafond légal.
> Lien : verlounen.lu/fr/
> Jason, ImmoBuild Kohn, Dudelange

**DE**
> Sie vermieten eine Wohnung oder ein Haus in Luxemburg? Welche Miete ist realistisch?
> Unser kostenloses Tool schätzt sie in 4 Schritten, auf Basis der Mieten des Observatoire de l’Habitat und von Hausinseraten. Sie erhalten eine Spanne von der Vertragsmiete bis zur Angebotsmiete und einen Hinweis auf die gesetzliche Obergrenze.
> Zum Tool: verlounen.lu/de/
> Jason, ImmoBuild Kohn, Düdelingen

## 4. Fiche Google (Google Business Profile)

Publication « Nouveauté » : « Estimation gratuite du loyer de votre appartement ou de votre maison, en 4 étapes, à partir de données publiques. » Bouton « En savoir plus » → `/fr/`.

## 5. Mesurer (après 4 à 6 semaines)

- `npm run stats` : combien ouvrent l’outil, arrivent à l’étape 4 (coordonnées), voient le résultat (README partie 3.9).
- Cloudflare Web Analytics : d’où viennent les visiteurs (Google, Facebook, immobuild.lu…).
- Repère pour décider : si beaucoup abandonnent à l’étape 4, tester le téléphone facultatif (décision de Jason) ; si peu de visiteurs, c’est la diffusion qu’il faut renforcer, pas l’outil.

Ce que je ne sais pas : le coût par clic sur ces mots-clés au Luxembourg et le volume de recherches. À vérifier dans le planificateur de mots-clés de Google Ads avant de fixer un budget.
