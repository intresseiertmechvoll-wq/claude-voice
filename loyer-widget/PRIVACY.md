# Données personnelles – outil « Estimation de loyer » (verlounen.lu)

Ce document décrit ce que fait l'outil, pour t'aider à mettre à jour ta politique de confidentialité. Ce n'est pas un avis juridique. Les points marqués **à compléter** dépendent de toi.

## En bref

- Pas de cookie, pas de traceur, pas de statistiques de visite, pas de police chargée depuis Google. Exception possible : si Cloudflare Turnstile (anti-robots) est activé, voir « Turnstile » ci-dessous.
- Pas de base de données : les réponses partent par e-mail, puis l'outil ne garde rien. Exception (option « leads en attente ») : si l'envoi de l'e-mail échoue, l'e-mail du lead est gardé **chiffré** au plus 7 jours, puis envoyé et effacé (voir ci-dessous).
- Deux prestataires : **Cloudflare** (hébergement de l'outil et calcul) et **Resend** (envoi de l'e-mail).

## 1. Données collectées

| Données | Obligatoire | D'où |
| --- | --- | --- |
| Description du bien : type, commune, surface, chambres, état, classe énergétique, meublé ou vide, extérieur, garages et parkings, étage et ascenseur (appartement) | oui | formulaire |
| Projet : propriétaire oui/non, déjà loué oui/non, gestion locative souhaitée, date de disponibilité | oui | formulaire |
| Prénom, nom, e-mail, téléphone | oui | formulaire |
| Message | non | formulaire |
| Accord (case cochée) | oui | formulaire |
| Langue de l'outil, page du site d'où vient la demande (adresse sans paramètres), date et heure | automatique | navigateur / serveur |
| Adresse IP | automatique | technique, voir point 4 |

L'estimation calculée (3 loyers et détail du calcul) et une priorité (chaud, tiède, froid, déduite des réponses sur le projet) sont ajoutées à l'e-mail. Le résultat affiché au visiteur ne contient que des statistiques publiques et ses propres réponses. Le bouton « Imprimer ou enregistrer en PDF » fonctionne dans son navigateur : rien n'est envoyé.

## 2. Pourquoi (finalités)

1. Calculer et afficher une estimation indicative du loyer du bien.
2. Transmettre la demande à ImmoBuild Kohn pour recontacter la personne au sujet de son bien (gestion locative, mise en location, rendez-vous).
3. Protéger l'outil contre les abus (anti-robot, limite de 20 envois par heure et par adresse IP).

Base légale proposée : le **consentement** (case à cocher obligatoire, non cochée au départ) pour 1 et 2 ; l'**intérêt légitime** (sécurité) pour 3. **À valider** avec ta politique actuelle.

## 3. Où vont les données

| Étape | Prestataire | Ce qui se passe | Où |
| --- | --- | --- | --- |
| Affichage et calcul | Cloudflare, Inc. (Cloudflare Pages Functions) | Le formulaire est envoyé au serveur de l'outil, vérifié et calculé en mémoire, puis oublié. | réseau mondial de Cloudflare, au plus près du visiteur |
| Envoi de l'e-mail | Resend (Plus Five Five, Inc.) | Resend transmet l'e-mail à `LEAD_EMAIL`. | États-Unis (voir ci-dessous) |
| Réception | ta boîte e-mail (`contact@immobuild.lu`) | L'e-mail reste dans ta boîte. | **à compléter** (ton fournisseur de messagerie, par ex. Microsoft 365) |

**Resend** : d'après sa documentation, les données du compte et des e-mails sont stockées aux États-Unis. Le choix d'une région d'envoi en Europe (Irlande, offres payantes) change seulement l'endroit d'où partent les e-mails, pas l'endroit où les données sont stockées. Les transferts hors de l'UE sont couverts par son accord de traitement des données (DPA), qui contient les clauses contractuelles types de l'UE, et Resend indique être certifié au EU-US Data Privacy Framework. Sources : [resend.com/security/gdpr](https://resend.com/security/gdpr), [resend.com/legal/dpa](https://resend.com/legal/dpa), [resend.com/docs/dashboard/domains/regions](https://resend.com/docs/dashboard/domains/regions). Resend garde aussi une trace des e-mails envoyés dans ton tableau de bord : **à vérifier** dans ton compte (durée de conservation des journaux).

**Cloudflare** : traite les requêtes (dont l'adresse IP) pour faire fonctionner et protéger le service. Cloudflare propose aussi un DPA, accepté avec ses conditions d'utilisation. **À vérifier** dans ton compte Cloudflare.

### Copie du résultat au visiteur (option, désactivée)

Si tu actives `copieVisiteur` dans `config.json` :

- un **deuxième e-mail** part, vers l'adresse saisie par le visiteur, avec son résultat (type de bien, surface, commune, trois loyers, fiabilité, plafond légal, « sans engagement »). Expéditeur : `FROM_EMAIL` ; « Répondre » arrive chez toi (`LEAD_EMAIL`) ;
- cet e-mail ne contient **aucun texte saisi librement** (ni prénom, ni nom, ni message) : quelqu'un qui taperait l'adresse d'un tiers ne peut pas s'en servir pour lui envoyer un texte ;
- Resend traite donc aussi l'adresse du visiteur comme destinataire et garde une trace de cet envoi dans son journal (même prestataire, même cadre que ci-dessus) ;
- base légale à mon avis : exécution de la demande du visiteur (il a demandé une estimation). **À valider** ;
- pour l'avis « adresse fausse », la copie part avec deux étiquettes Resend : `categorie = copie_visiteur` et le numéro de téléphone du visiteur en chiffres (déjà présent dans l'e-mail du lead chez Resend). Si la copie est refusée, Resend renvoie l'adresse, l'objet et ces étiquettes à l'outil, qui t'envoie l'avis puis n'enregistre rien ;
- **avant d'activer** : ajouter la phrase proposée au point 7 dans ta politique de confidentialité.

### Turnstile (anti-robots, option conseillée)

Si `turnstileSiteKey` est rempli dans `config.json` :

- à l'étape 3, le navigateur charge un script de Cloudflare (`challenges.cloudflare.com`) qui analyse des signaux techniques : adresse IP, empreinte TLS, User-Agent, adresse du site. Source : [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/) ;
- Cloudflare est **sous-traitant** pour la protection du formulaire, et **responsable de traitement** pour l'amélioration de sa détection des robots (intérêt légitime, selon Cloudflare). À mentionner dans ta politique de confidentialité ;
- l'outil envoie à Cloudflare, depuis le serveur, le jeton du navigateur et l'adresse IP du visiteur pour vérification ; rien n'est enregistré par l'outil ;
- cookies : Cloudflare indique que Turnstile n'en dépose pas (option « pre-clearance » à laisser désactivée) ; à vérifier dans le navigateur après la mise en ligne (voir README 3.7) ;
- texte proposé pour ta politique de confidentialité (point 7) : « Pour protéger le formulaire contre les robots, nous utilisons Cloudflare Turnstile, qui analyse des informations techniques de votre navigateur (dont votre adresse IP). Voir la notice de Cloudflare : cloudflare.com/turnstile-privacy-policy. »

### Leads en attente (option, conseillée)

Si le stockage `LEADS_EN_ATTENTE` (Cloudflare KV) et le secret `LEAD_BACKUP_KEY` existent :

- uniquement quand Resend n'arrive pas à envoyer l'e-mail du lead (panne, quota épuisé), l'e-mail déjà rédigé (coordonnées, réponses, estimation) est enregistré dans Cloudflare KV ;
- **chiffré** (AES-GCM 256 bits) avec `LEAD_BACKUP_KEY` : sans ce secret, le contenu est illisible, y compris pour quelqu'un qui aurait accès au compte Cloudflare ;
- envoyé dès qu'un envoi suivant réussit, puis **effacé** ; dans tous les cas effacé automatiquement après **7 jours** (si Resend reste en panne 7 jours, le lead est perdu) ;
- Cloudflare stocke ces données ; leur emplacement exact n'est pas garanti en Europe (KV est réparti sur le réseau mondial de Cloudflare) : à mentionner dans ta politique de confidentialité ;
- texte proposé (point 7) : « Si l'envoi de votre demande échoue pour une raison technique, elle est conservée chiffrée chez notre hébergeur Cloudflare pendant 7 jours au plus, le temps de nous la transmettre, puis effacée. »

### Mesure de fréquentation (sans cookie)

- **Comptage des étapes** (`/api/etape`, binding `ETAPES`) : à chaque étape atteinte, le navigateur envoie seulement l'étape, le type de bien, la langue et « intégré dans un site ou non ». Ni cookie, ni identifiant, ni adresse IP enregistrée ; impossible de relier un comptage à un lead. Stocké dans Cloudflare Workers Analytics Engine.
- **Cloudflare Web Analytics** (si activé) : Cloudflare compte les pages vues sans cookie, d'après sa documentation (« privacy-first », pas de traçage entre sites). À mentionner dans ta politique de confidentialité : « Nous mesurons la fréquentation de manière anonyme, sans cookie, avec Cloudflare Web Analytics. »

## 4. Adresse IP et limite d'envois

- Pour bloquer les abus, l'outil compte les envois par adresse IP : au plus 20 par heure.
- Si Cloudflare KV est activé (README, 3.4) : l'outil enregistre une **empreinte** de l'adresse IP (SHA-256 de l'adresse et d'une phrase secrète, l'adresse elle-même n'est pas écrite) et un compteur. Ils s'effacent automatiquement après **1 heure**.
- Pour que l'empreinte ne puisse pas être retrouvée en essayant toutes les adresses IP possibles, définis la variable secrète `RATE_LIMIT_SALT` (README, 3.2). Sans elle, une valeur par défaut connue est utilisée.
- Sans KV : le compteur reste en mémoire sur le serveur Cloudflare, sans écriture.
- L'adresse IP ne figure pas dans l'e-mail du lead.

## 5. Durée de conservation

- Dans l'outil : aucune (sauf l'empreinte d'IP, 1 heure au plus). Si l'option « leads en attente » est activée et que l'envoi échoue : l'e-mail du lead, chiffré, jusqu'à son envoi, au plus 7 jours.
- Dans ta boîte e-mail : **à compléter**. Fixe une durée, par exemple : suppression des demandes sans suite après X mois.
- Chez Resend : **à vérifier** (journaux d'envoi).

## 6. Droits des personnes

Accès, rectification, effacement, opposition, retrait du consentement : par e-mail à `contact@immobuild.lu`. Réclamation possible auprès de la CNPD (Commission nationale pour la protection des données, Luxembourg).

## 7. Texte proposé pour ta politique de confidentialité

> **Outil « Estimation de loyer » (verlounen.lu)**
> Quand vous utilisez notre outil d'estimation de loyer, nous recueillons la description de votre bien, votre projet (location, gestion, disponibilité) et vos coordonnées (prénom, nom, e-mail, téléphone, message facultatif). Ces informations servent à calculer une estimation indicative et à vous recontacter au sujet de votre bien, avec votre accord. Elles nous sont transmises par e-mail et ne sont pas enregistrées dans une base de données.
> L'outil est hébergé par Cloudflare, Inc. L'e-mail est envoyé par Resend (Plus Five Five, Inc.), dont les serveurs sont situés aux États-Unis ; ce transfert est encadré par les clauses contractuelles types de la Commission européenne. Pour limiter les abus, une empreinte chiffrée de votre adresse IP peut être conservée une heure au maximum.
> *(À ajouter seulement si la copie au visiteur est activée :)* Vous recevez une copie de votre estimation à l'adresse e-mail indiquée. Cet e-mail est envoyé une seule fois ; nous ne vous envoyons pas de newsletter.
> L'outil n'utilise ni cookie ni traceur. Nous conservons votre demande pendant **[durée à compléter]**. Vous pouvez à tout moment demander l'accès, la rectification ou l'effacement de vos données, ou retirer votre accord, en écrivant à contact@immobuild.lu. Vous pouvez aussi adresser une réclamation à la CNPD.
