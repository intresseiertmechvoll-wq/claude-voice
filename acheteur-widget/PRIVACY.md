# Données personnelles – outil « Mon budget d’achat »

Ce document décrit ce que fait l’outil, pour t’aider à compléter ta politique de confidentialité. **Ce n’est pas un avis juridique.** Les points marqués **à compléter** ou **à valider** dépendent de toi.

## En bref

- Pas de cookie, pas de traceur, pas de statistiques de visite, pas de police chargée depuis Google.
- Pas de base de données : les réponses partent par e-mail, puis l’outil ne garde rien.
- L’**aperçu du budget** (après l’étape 3) est calculé **dans le navigateur** : à ce moment, rien n’est envoyé.
- Deux prestataires, comme l’outil d’estimation : **Cloudflare** (hébergement, calcul) et **Resend** (envoi de l’e-mail). Détails et sources : `estimation-widget/PRIVACY.md`, partie 3.

## 1. Données collectées (seulement à l’envoi final)

| Données | Obligatoire | Remarque |
| --- | --- | --- |
| Projet : y habiter / louer, seul / à deux, premier achat, Bëllegen Akt déjà utilisé, bien à vendre d’abord | oui | |
| Recherche : type, neuf / ancien, 1 à 3 communes, chambres, prêt à rénover | oui | |
| Surface, extérieur, garage, ce qui compte (texte court) | non | |
| Budget : apport, prix envisagé, banque déjà vue, sait combien emprunter | oui | données financières **déclarées** |
| Montant d’emprunt connu | non | |
| Revenu net du ménage | non | **en tranche seulement** (minimisation), avec « je préfère ne pas répondre » |
| Mise en relation avec le courtier partenaire | non | case **non cochée** au départ, séparée de l’accord RGPD |
| Calendrier, biens visités, intérêt pour un accompagnement | calendrier oui, le reste non | |
| Prénom, nom, e-mail, téléphone, accord | oui | |
| Message, « prévenez-moi si un bien correspond » | non | |
| Langue, page d’origine, date | automatique | |
| Adresse IP | automatique | empreinte (SHA-256 avec clé secrète) pour la limite de 20 envois par heure, effacée après 1 heure, jamais dans l’e-mail |

Aucune donnée d’identité bancaire, de compte, d’employeur ou de dette n’est demandée.

## 2. Finalités et base légale (proposition, **à valider**)

1. Calculer et afficher le budget et les surfaces par commune.
2. Transmettre la demande à ImmoBuild Kohn pour recontacter la personne au sujet de sa recherche.
3. **Si la case est cochée** : transmettre les coordonnées et le projet au courtier partenaire, pour qu’il la contacte au sujet du financement.
4. Si la case est cochée : la prévenir quand un bien correspondant arrive.
5. Sécurité (anti-robot, limite par IP).

Base légale proposée : **consentement** pour 1 à 4 (cases à cocher, non cochées au départ, une case distincte pour le courtier) ; **intérêt légitime** pour 5.

## 3. Le courtier partenaire

- La case dit seulement « notre courtier partenaire » (ta décision du 18/11/2026). Le nom n’est pas dans le code envoyé au navigateur ; il est seulement dans l’e-mail que tu reçois (`server.json`).
- **Transmission** : l’outil n’envoie rien au courtier. Tu reçois l’e-mail avec « Mise en relation courtier partenaire : OUI → atHome Finance » et tu transmets toi-même.
- **À compléter dans ta politique de confidentialité** : nommer atHome Finance comme destinataire possible, avec la finalité (contact au sujet du financement) et la condition (seulement si la case est cochée).
- **Risque à connaître (je suppose, pas vérifié par un juriste)** : pour qu’un consentement à une transmission vers un autre responsable soit valable, les lignes directrices 05/2020 du CEPD/EDPB demandent que ce responsable soit **nommé** au moment du choix. Le nommer seulement dans la politique de confidentialité est plus faible que de le nommer à côté de la case. Option prête : `config.json` → `courtierNomPublic` = « atHome Finance » affiche un petit lien « Qui est notre courtier partenaire ? » à côté de la case, sans changer le texte de la case.

## 4. Durée de conservation

- Dans l’outil : aucune (empreinte d’IP : 1 heure au plus).
- Dans ta boîte e-mail : **à compléter** (par ex. suppression des demandes sans suite après X mois).
- Chez Resend : **à vérifier** (journaux d’envoi).
- Demandes « prévenez-moi » : tant que la personne cherche ; **à compléter** (par ex. 12 mois, puis on redemande).

## 5. Droits des personnes

Accès, rectification, effacement, opposition, retrait du consentement : par e-mail à `contact@immobuild.lu`. Réclamation possible auprès de la CNPD.
