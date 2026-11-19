# Données personnelles – outil « Estimation gratuite »

Ce document décrit ce que fait l'outil, pour t'aider à mettre à jour ta politique de confidentialité. Ce n'est pas un avis juridique. Les points marqués **à compléter** dépendent de toi.

## En bref

- Pas de cookie, pas de traceur, pas de police chargée depuis Google. Seulement des **compteurs anonymes** du parcours (« étape 3 affichée », « demande envoyée »), sans IP ni identifiant de visiteur (section 3 quinquies).
- Pas de base de données : les réponses partent par e-mail, puis l'outil ne garde rien. Le visiteur reçoit aussi une copie de son estimation par e-mail (désactivable : `customerEmail` dans `config.json`).
- Deux prestataires : **Cloudflare** (hébergement de l'outil et calcul) et **Resend** (envoi de l'e-mail).
- Si le lien qui amène le visiteur contient des paramètres de campagne (`utm_*`) ou un identifiant de clic publicitaire (`gclid`, `fbclid`, `msclkid`), l'outil les joint à la demande pour savoir quelle annonce l'a amené : les `utm_*` nettoyés, et pour les identifiants de clic **seulement leur présence**. Leur valeur ne part que si le visiteur coche la case « mesure des annonces » (section 3 sexies). Pas de cookie.
- Le domaine de l'adresse e-mail (la partie après « @ ») est vérifié par une question DNS à **Cloudflare DNS**, envoyée par notre serveur ; rien n'est enregistré.
- Si le visiteur donne son adresse (facultatif), notre serveur la transmet au **géoportail de l'État luxembourgeois** (geoportail.lu, Administration du cadastre et de la topographie) pour lire des cartes publiques. Son adresse IP n'est pas transmise ; rien n'est enregistré.

## 1. Données collectées

| Données | Obligatoire | D'où |
| --- | --- | --- |
| Description du bien : type, commune, surface, chambres, salles de bain, année, état, classe énergétique, étage/ascenseur ou terrain/type de maison, gros postes, annexes | oui | formulaire |
| Adresse du bien (avec propositions d'adresses pendant la saisie) | non | formulaire |
| Projet : propriétaire oui/non, objectif, délai | oui | formulaire |
| Prénom, nom, e-mail, téléphone | oui | formulaire |
| Message | non | formulaire |
| Accord (case cochée) | oui | formulaire |
| Langue de l'outil, page du site d'où vient la demande (adresse sans paramètres), date et heure | automatique | navigateur / serveur |
| Provenance : paramètres de campagne du lien (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, 60 caractères au plus, lettres sans accent, chiffres, espace, `_ . -`) et présence oui/non d'un identifiant de clic publicitaire (`gclid` Google, `fbclid` Facebook/Instagram, `msclkid` Microsoft), **sans sa valeur** | automatique, s'ils sont dans le lien | adresse de la page (de l'outil ou de ton site qui l'intègre) |
| Résultat de la vérification du domaine de l'e-mail (vérifié / non vérifiable) | automatique | serveur |
| Adresse IP | automatique | technique, voir point 4 |

L'estimation calculée (3 valeurs et détail du calcul) est ajoutée à l'e-mail. Le résultat affiché au visiteur (chiffres de sa commune, facteurs, fiabilité) ne contient que des statistiques publiques et ses propres réponses. Le bouton « Imprimer ou enregistrer en PDF » fonctionne dans son navigateur : rien n'est envoyé.

## 2. Pourquoi (finalités)

1. Calculer et afficher une estimation indicative du bien.
2. Transmettre la demande à ImmoBuild Kohn pour recontacter la personne au sujet de son bien (estimation sur place, mise en vente ou en location).
3. Protéger l'outil contre les abus (anti-robot, limite de 20 envois par heure et par adresse IP) et éviter les faux contacts (numéro manifestement inventé, adresse e-mail jetable ou domaine inexistant).
4. Savoir quelle publicité ou quel lien a amené la demande (provenance), pour juger l'efficacité des annonces.

Base légale proposée : le **consentement** (case à cocher obligatoire, non cochée au départ) pour 1 et 2 ; l'**intérêt légitime** (sécurité, qualité des contacts, mesure de l'efficacité des annonces sans traceur) pour 3 et 4. **À valider** avec ta politique actuelle.

## 3. Où vont les données

| Étape | Prestataire | Ce qui se passe | Où |
| --- | --- | --- | --- |
| Affichage et calcul | Cloudflare, Inc. (Cloudflare Pages Functions) | Le formulaire est envoyé au serveur de l'outil, vérifié et calculé en mémoire, puis oublié. | réseau mondial de Cloudflare, au plus près du visiteur |
| Envoi de l'e-mail | Resend (Plus Five Five, Inc.) | Resend transmet l'e-mail à `LEAD_EMAIL`, et la copie de l'estimation au visiteur. | États-Unis (voir ci-dessous) |
| Compteurs anonymes du parcours | Cloudflare (Workers Analytics Engine) | Compteurs sans IP ni identifiant, effacés après 3 mois. | voir Cloudflare ci-dessus |
| Réception | ta boîte e-mail (`contact@immobuild.lu`) | L'e-mail reste dans ta boîte. | **à compléter** (ton fournisseur de messagerie, par ex. Microsoft 365) |

**Resend** : d'après sa documentation, les données du compte et des e-mails sont stockées aux États-Unis. Le choix d'une région d'envoi en Europe (Irlande, offres payantes) change seulement l'endroit d'où partent les e-mails, pas l'endroit où les données sont stockées. Les transferts hors de l'UE sont couverts par son accord de traitement des données (DPA), qui contient les clauses contractuelles types de l'UE, et Resend indique être certifié au EU-US Data Privacy Framework. Sources : [resend.com/security/gdpr](https://resend.com/security/gdpr), [resend.com/legal/dpa](https://resend.com/legal/dpa), [resend.com/docs/dashboard/domains/regions](https://resend.com/docs/dashboard/domains/regions). Resend garde aussi une trace des e-mails envoyés dans ton tableau de bord : **à vérifier** dans ton compte (durée de conservation des journaux).

**Cloudflare** : traite les requêtes (dont l'adresse IP) pour faire fonctionner et protéger le service. Cloudflare propose aussi un DPA, accepté avec ses conditions d'utilisation. **À vérifier** dans ton compte Cloudflare.

## 3 bis. Simulateur « Et si… ? » (après le résultat)

- Le visiteur peut tester l'effet de travaux (classe énergétique, état, cuisine, salle de bain…). Chaque essai est recalculé par le serveur Cloudflare, sans être enregistré ni envoyé par e-mail.
- Pour cela, le résultat contient un **ticket signé** valable 2 heures. Il contient les réponses sur le bien et le prénom, le nom, l'e-mail et le téléphone du visiteur. Il reste dans la page ouverte du visiteur (pas de cookie, pas de stockage dans le navigateur) et disparaît quand il la ferme.
- Le visiteur en est informé dans le simulateur (« Je reçois vos essais pour en parler avec vous »). Quand il quitte la page (ou clique sur « Prendre rendez-vous »), un e-mail de complément part à ImmoBuild Kohn, par Resend, avec ses nouveaux essais et les valeurs recalculées : au plus 3 par résultat.
- Base légale proposée : la même que la demande (le visiteur vient d'accepter d'être recontacté au sujet de son bien). **À valider.**

## 3 ter. Adresse et cartes officielles (géoportail)

- Le champ « Adresse » est facultatif. Pendant la saisie (à partir de 4 caractères), le texte tapé est envoyé à notre serveur Cloudflare, qui demande des propositions d'adresses au **géoportail national** (geoportail.lu, service de l'État luxembourgeois géré par l'Administration du cadastre et de la topographie, ACT).
- Quand le visiteur choisit une adresse, notre serveur demande au géoportail les données **publiques** de cet endroit : parcelle cadastrale et sa surface, emprise du bâtiment et bâtiments accolés (plan cadastral, licence CC BY 4.0), zones inondables (cartes de l'Administration de la gestion de l'eau). Il refait la même recherche à l'envoi du formulaire, pour l'e-mail du lead.
- Seule l'adresse (ou le début tapé) part vers le géoportail, **depuis notre serveur** : ni l'adresse IP du visiteur, ni ses coordonnées, ni ses autres réponses ne sont transmises. Rien n'est enregistré par l'outil (un compteur en mémoire limite les recherches par adresse IP, comme au point 4).
- L'adresse et les données trouvées figurent dans l'e-mail du lead (section « Adresse sur les cartes officielles »). Sans adresse, rien n'est envoyé au géoportail.
- Le géoportail est un service public : **à vérifier** s'il tient des journaux techniques des requêtes reçues (ils contiendraient l'adresse recherchée et l'adresse IP de Cloudflare, pas celle du visiteur).

## 3 quater. Provenance et vérification de l'adresse e-mail

- **Provenance.** À l'ouverture de l'outil, le navigateur lit l'adresse de la page : paramètres `utm_*` et présence de `gclid` / `fbclid` / `msclkid`. Quand l'outil est intégré à ton site, `embed.js` lit l'adresse de **ta** page et transmet ces mêmes informations à l'outil (identifiants de clic : seulement « présent », jamais la valeur). Elles restent en mémoire dans la page ouverte (pas de cookie, pas de stockage dans le navigateur), partent avec la demande et figurent dans l'e-mail du lead (section « Provenance »). Elles ne sont envoyées ni à Google, ni à Meta, ni à Microsoft : il n'y a aucun pixel ni suivi de conversion.
- **Vérification du domaine de l'e-mail.** Avant d'envoyer la demande, notre serveur demande à Cloudflare DNS (`cloudflare-dns.com`, DNS-over-HTTPS) si le domaine de l'adresse (ex. `pt.lu`) a un serveur de messagerie. Seul le nom de domaine part, depuis notre serveur : ni l'adresse e-mail complète, ni l'IP du visiteur. Rien n'est enregistré par l'outil ; le résultat (vérifié / non vérifiable) figure dans l'e-mail du lead. Si le domaine n'existe pas, le visiteur est invité à corriger son adresse. En cas de panne ou de lenteur (plus de 2 secondes), la demande est acceptée.
- **Adresses jetables et numéros fictifs.** Une courte liste de domaines d'e-mails jetables connus (yopmail, mailinator…) et des règles simples sur le numéro (tous les chiffres identiques ou numéro d'exemple refusés ; suite 234567 seulement signalée à Jason) sont vérifiées dans l'outil et sur le serveur, sans rien envoyer à personne.


## 3 quinquies. Copie au visiteur et compteurs anonymes

- **Copie de l'estimation au visiteur.** Une fois l'e-mail du lead parti, le visiteur reçoit, dans sa langue, un e-mail avec le type de bien, la commune, les trois montants affichés, l'avertissement « estimation indicative », la source et le contact de Jason. Ni son téléphone, ni son adresse, ni son message, ni la provenance. S'il répond, la réponse arrive dans `LEAD_EMAIL`. Si cet envoi échoue, le résultat s'affiche quand même. L'e-mail du lead indique « Copie au visiteur ». Désactivable : `"customerEmail": false` dans `config.json`.
- **Compteurs anonymes du parcours.** La page envoie à `/api/e` un événement la première fois que le visiteur atteint chaque étape (`step-1` à `step-6`), clique sur « Appeler » ou « Estimation sur place », imprime, ou utilise le simulateur ; le serveur compte lui-même chaque demande envoyée (`lead`, ou `lead-nodata` sans prix). Pour chaque événement : l'événement, la langue, le canal (utm_source, sinon « google » / « facebook » / « bing » si un identifiant de clic était présent, sinon « direct »), la campagne (utm_campaign), intégré au site ou non ; pour une demande, aussi le type de bien et la commune. **Jamais** : IP, identifiant de visiteur ou de session, cookie, réponses détaillées, coordonnées, adresse. Stockage : Cloudflare Workers Analytics Engine, jeu `estimation_funnel`, effacé après 3 mois (source : developers.cloudflare.com/analytics/analytics-engine/limits, consulté le 18/11/2026). Sans la liaison `FUNNEL` configurée, rien n'est compté.
- Ces compteurs ne lisent ni n'écrivent rien sur l'appareil du visiteur (pas de cookie, pas de stockage). *Analyse technique, pas un avis juridique : à faire valider en cas de doute.*


## 3 sexies. Mesure des annonces avec consentement (Google Ads, Meta)

- **Quand** : seulement si le visiteur arrive avec un `gclid` (Google) ou un `fbclid` (Meta) valide dans le lien. Sinon, la case n'existe pas.
- **La case** : étape 6, facultative, **jamais cochée d'avance**, séparée de la case obligatoire. Elle nomme la ou les régies concernées et dit ce qui part (`src/shared/ads.ts`, textes `ads.*` dans `src/i18n/`). Sans la case cochée, la page n'envoie **pas** la valeur des identifiants de clic à notre serveur (`src/main.ts`) et le serveur l'ignore de toute façon (`sanitizeAds`).
- **Meta** : notre serveur envoie un événement `Lead` à l'API Conversions (`src/server/meta.ts`) : `fbc` (= `fb.1.<heure d'arrivée>.<fbclid>`), e-mail et téléphone hachés SHA-256, type de navigateur (`User-Agent`, exigé par Meta pour un événement « website »), adresse de la page. Pas de nom, d'adresse, d'IP ni de réponses. Seulement si `META_PIXEL_ID` et `META_CAPI_TOKEN` sont configurés.
- **Google** : rien n'est envoyé automatiquement. L'e-mail du lead contient une ligne prête à importer dans Google Ads (`gclid`, nom de la conversion, heure, `Granted` dans la colonne de consentement « Ad User Data »).
- **Preuve du consentement** (art. 7.1 RGPD, demandée aussi par la CNPD) : l'e-mail du lead contient la date, la version du texte (`pub-v1`) et le texte exact affiché, dans la langue du visiteur. Si tu modifies le texte, change `CONSENT_VERSION`.
- **Retrait** : par e-mail. Tu supprimes alors la conversion côté Google (ne pas l'importer, ou la retirer) ; chez Meta, une conversion déjà envoyée ne peut pas être reprise par l'outil.
- **Analyse et incertitudes (ce n'est pas un avis juridique)** :
  - Le CEPD considère que la collecte d'identifiants transmis dans un lien de suivi (« URL tracking ») relève de l'article 5(3) de la directive ePrivacy, donc du consentement (Lignes directrices 2/2023, v2 d'octobre 2024, points 49 à 51 : edpb.europa.eu, consulté le 19/11/2026). D'où la case.
  - La CNPD exige un consentement libre, spécifique, éclairé, univoque (action positive, pas de case pré-cochée), aussi facile à retirer qu'à donner, et une preuve (Lignes directrices cookies et autres traceurs, sections 3.2.2 à 3.2.9 : cnpd.public.lu, consulté le 19/11/2026). La case et l'e-mail de preuve suivent ces points.
  - **Incertain** : l'identifiant est lu dans l'adresse de la page à l'arrivée et gardé en mémoire **avant** le consentement, sans être envoyé. Une lecture stricte du CEPD pourrait considérer cette lecture elle-même comme un « accès ». Le texte demandé par Meta (responsabilité conjointe, conditions « Business Tools ») et la mention exacte dans la politique de confidentialité sont à faire valider par un juriste avant de lancer des annonces à grande échelle.

## 4. Adresse IP et limite d'envois

- Pour bloquer les abus, l'outil compte les envois par adresse IP : au plus 20 par heure.
- Si Cloudflare KV est activé (README, 3.4) : l'outil enregistre une **empreinte** de l'adresse IP (SHA-256 avec une clé secrète : `RATE_LIMIT_SALT`, sinon `SIMULATION_SECRET` ; l'adresse elle-même n'est pas écrite) et un compteur. Sans clé secrète, une empreinte d'adresse IPv4 pourrait être retrouvée par essais : la clé est donc indispensable. Ils s'effacent automatiquement après **1 heure**.
- Sans KV : le compteur reste en mémoire sur le serveur Cloudflare, sans écriture.
- L'adresse IP ne figure pas dans l'e-mail du lead.

## 5. Durée de conservation

- Dans l'outil : aucune (sauf l'empreinte d'IP, 1 heure au plus).
- Dans ta boîte e-mail : **à compléter**. Fixe une durée, par exemple : suppression des demandes sans suite après X mois.
- Chez Resend : **à vérifier** (journaux d'envoi).

## 6. Droits des personnes

Accès, rectification, effacement, opposition, retrait du consentement : par e-mail à `contact@immobuild.lu`. Réclamation possible auprès de la CNPD (Commission nationale pour la protection des données, Luxembourg).

## 7. Texte pour ta politique de confidentialité

Version complète, prête à coller (avec responsable, base légale, destinataires et droits) : [`docs/texte-politique-confidentialite.md`](docs/texte-politique-confidentialite.md). Deux passages sont à compléter : la durée de conservation de tes demandes et celle des journaux Resend.

**Important :** la phrase « ni cookie, ni traceur, ni outil de statistiques qui suivrait un visiteur » n'est vraie que si *Web Analytics* de Cloudflare est désactivé pour `estimatioun.lu` (Cloudflare l'a ajouté automatiquement ; la règle de sécurité CSP de l'outil le bloque, mais il faut le couper dans le tableau de bord).
