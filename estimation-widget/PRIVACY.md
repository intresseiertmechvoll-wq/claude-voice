# Données personnelles – outil « Estimation gratuite »

Ce document décrit ce que fait l'outil, pour t'aider à mettre à jour ta politique de confidentialité. Ce n'est pas un avis juridique. Les points marqués **à compléter** dépendent de toi.

## En bref

- Pas de cookie, pas de traceur, pas de statistiques de visite, pas de police chargée depuis Google.
- Pas de base de données : les réponses partent par e-mail, puis l'outil ne garde rien.
- Deux prestataires : **Cloudflare** (hébergement de l'outil et calcul) et **Resend** (envoi de l'e-mail).

## 1. Données collectées

| Données | Obligatoire | D'où |
| --- | --- | --- |
| Description du bien : type, commune, surface, chambres, salles de bain, année, état, classe énergétique, étage/ascenseur ou terrain/type de maison, gros postes, annexes | oui | formulaire |
| Rue du bien | non | formulaire |
| Projet : propriétaire oui/non, objectif, délai | oui | formulaire |
| Prénom, nom, e-mail, téléphone | oui | formulaire |
| Message | non | formulaire |
| Accord (case cochée) | oui | formulaire |
| Langue de l'outil, page du site d'où vient la demande (adresse sans paramètres), date et heure | automatique | navigateur / serveur |
| Adresse IP | automatique | technique, voir point 4 |

L'estimation calculée (3 valeurs et détail du calcul) est ajoutée à l'e-mail. Le résultat affiché au visiteur (chiffres de sa commune, facteurs, fiabilité) ne contient que des statistiques publiques et ses propres réponses. Le bouton « Imprimer ou enregistrer en PDF » fonctionne dans son navigateur : rien n'est envoyé.

## 2. Pourquoi (finalités)

1. Calculer et afficher une estimation indicative du bien.
2. Transmettre la demande à ImmoBuild Kohn pour recontacter la personne au sujet de son bien (estimation sur place, mise en vente ou en location).
3. Protéger l'outil contre les abus (anti-robot, limite de 5 envois par heure et par adresse IP).

Base légale proposée : le **consentement** (case à cocher obligatoire, non cochée au départ) pour 1 et 2 ; l'**intérêt légitime** (sécurité) pour 3. **À valider** avec ta politique actuelle.

## 3. Où vont les données

| Étape | Prestataire | Ce qui se passe | Où |
| --- | --- | --- | --- |
| Affichage et calcul | Cloudflare, Inc. (Cloudflare Pages Functions) | Le formulaire est envoyé au serveur de l'outil, vérifié et calculé en mémoire, puis oublié. | réseau mondial de Cloudflare, au plus près du visiteur |
| Envoi de l'e-mail | Resend (Plus Five Five, Inc.) | Resend transmet l'e-mail à `LEAD_EMAIL`. | États-Unis (voir ci-dessous) |
| Réception | ta boîte e-mail (`contact@immobuild.lu`) | L'e-mail reste dans ta boîte. | **à compléter** (ton fournisseur de messagerie, par ex. Microsoft 365) |

**Resend** : d'après sa documentation, les données du compte et des e-mails sont stockées aux États-Unis. Le choix d'une région d'envoi en Europe (Irlande, offres payantes) change seulement l'endroit d'où partent les e-mails, pas l'endroit où les données sont stockées. Les transferts hors de l'UE sont couverts par son accord de traitement des données (DPA), qui contient les clauses contractuelles types de l'UE, et Resend indique être certifié au EU-US Data Privacy Framework. Sources : [resend.com/security/gdpr](https://resend.com/security/gdpr), [resend.com/legal/dpa](https://resend.com/legal/dpa), [resend.com/docs/dashboard/domains/regions](https://resend.com/docs/dashboard/domains/regions). Resend garde aussi une trace des e-mails envoyés dans ton tableau de bord : **à vérifier** dans ton compte (durée de conservation des journaux).

**Cloudflare** : traite les requêtes (dont l'adresse IP) pour faire fonctionner et protéger le service. Cloudflare propose aussi un DPA, accepté avec ses conditions d'utilisation. **À vérifier** dans ton compte Cloudflare.

## 4. Adresse IP et limite d'envois

- Pour bloquer les abus, l'outil compte les envois par adresse IP : au plus 5 par heure.
- Si Cloudflare KV est activé (README, 3.4) : l'outil enregistre une **empreinte** de l'adresse IP (SHA-256, l'adresse elle-même n'est pas écrite) et un compteur. Ils s'effacent automatiquement après **1 heure**.
- Sans KV : le compteur reste en mémoire sur le serveur Cloudflare, sans écriture.
- L'adresse IP ne figure pas dans l'e-mail du lead.

## 5. Durée de conservation

- Dans l'outil : aucune (sauf l'empreinte d'IP, 1 heure au plus).
- Dans ta boîte e-mail : **à compléter**. Fixe une durée, par exemple : suppression des demandes sans suite après X mois.
- Chez Resend : **à vérifier** (journaux d'envoi).

## 6. Droits des personnes

Accès, rectification, effacement, opposition, retrait du consentement : par e-mail à `contact@immobuild.lu`. Réclamation possible auprès de la CNPD (Commission nationale pour la protection des données, Luxembourg).

## 7. Texte proposé pour ta politique de confidentialité

> **Outil « Estimation gratuite »**
> Quand vous utilisez notre outil d'estimation en ligne, nous recueillons la description de votre bien, votre projet et vos coordonnées (prénom, nom, e-mail, téléphone, message facultatif). Ces informations servent à calculer une estimation indicative et à vous recontacter au sujet de votre bien, avec votre accord. Elles nous sont transmises par e-mail et ne sont pas enregistrées dans une base de données.
> L'outil est hébergé par Cloudflare, Inc. L'e-mail est envoyé par Resend (Plus Five Five, Inc.), dont les serveurs sont situés aux États-Unis ; ce transfert est encadré par les clauses contractuelles types de la Commission européenne. Pour limiter les abus, une empreinte non réversible de votre adresse IP peut être conservée une heure au maximum.
> L'outil n'utilise ni cookie ni traceur. Nous conservons votre demande pendant **[durée à compléter]**. Vous pouvez à tout moment demander l'accès, la rectification ou l'effacement de vos données, ou retirer votre accord, en écrivant à contact@immobuild.lu. Vous pouvez aussi adresser une réclamation à la CNPD.
