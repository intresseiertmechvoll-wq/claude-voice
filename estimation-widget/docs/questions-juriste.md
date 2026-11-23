# Questions pour un juriste (RGPD / ePrivacy, Luxembourg)

**Objet :** outil « Estimation gratuite » d'ImmoBuild Kohn S.à r.l. (estimatioun.lu, intégré à immobuild.lu), avant des campagnes Google Ads et Meta.
**Préparé le 23/11/2026** à partir du code et de la documentation (`PRIVACY.md`, `docs/texte-politique-confidentialite.md`). Ce document pose des questions ; il ne contient pas d'avis juridique.

## Ce que fait l'outil (résumé)

1. Le visiteur décrit son bien en 5 étapes, puis donne prénom, nom, e-mail, téléphone (obligatoires) et coche une case obligatoire : « J'accepte qu'ImmoBuild Kohn utilise ces informations pour me recontacter au sujet de mon bien… ». **Le prix n'est affiché qu'après.**
2. Le serveur (Cloudflare) calcule une fourchette à partir de statistiques publiques, envoie la demande à ImmoBuild par e-mail (Resend, États-Unis, clauses types + Data Privacy Framework ; boîte Microsoft 365) et une copie de l'estimation au visiteur.
3. Optionnel : adresse du bien → données publiques du géoportail (parcelle, bâtiment, zones inondables), ajoutées à l'e-mail.
4. Contrôles anti-abus : empreinte salée de l'IP (1 h), vérification DNS du domaine de l'e-mail, règle de limitation Cloudflare.
5. Statistiques : compteurs d'étapes sans IP, cookie ni identifiant (Cloudflare Analytics Engine, 3 mois).
6. Publicité : paramètres `utm_*` joints à la demande. **Seulement si une case facultative non cochée est cochée** (proposée seulement après un clic publicitaire) : envoi serveur à Meta (API Conversions : identifiant de clic, e-mail et téléphone hachés SHA-256, user-agent) ; pour Google, ImmoBuild importe le `gclid` à la main. Preuve du consentement (date, version et texte) gardée dans l'e-mail.
7. Aucun cookie, aucun stockage dans le navigateur, aucun script tiers dans l'outil.

## Questions

### A. Affichage du prix après les coordonnées (art. 7(4) RGPD)

1. La case obligatoire « me recontacter » est-elle un consentement **libre**, alors que le prix n'apparaît qu'après ? Le calcul lui-même n'a pas besoin des coordonnées.
2. Vaut-il mieux fonder la demande sur les **mesures précontractuelles** (art. 6(1)(b), comme dans la politique actuelle d'ImmoBuild pour les « demandes d'estimation ») ou sur l'**intérêt légitime** ? Dans ce cas, la case devient-elle une simple information plutôt qu'un consentement ?
3. Si le couplage pose problème : suffit-il de proposer une alternative (par ex. « voir le prix sans être rappelé », avec e-mail seulement) ?

### B. Mesure des annonces (ePrivacy art. 5(3), loi modifiée du 30 mai 2005 art. 4(3)(e))

4. Les lignes directrices 2/2023 du CEPD (v2, points 49 à 51) placent le suivi par URL sous l'art. 5(3). L'outil lit `gclid` / `fbclid` dans l'adresse à l'arrivée et le garde en mémoire dans la page, **sans l'envoyer**, jusqu'à la case. Cette simple lecture est-elle déjà un « accès » soumis au consentement ?
5. La case au moment de l'envoi du formulaire (facultative, non cochée, texte spécifique par régie, retrait par e-mail) remplit-elle les exigences de la CNPD (lignes directrices cookies, points 3.2.2 à 3.2.9) ? Faut-il aussi un moyen de retrait en ligne ?
6. Meta API Conversions : ImmoBuild et Meta sont-ils **responsables conjoints** (au sens de l'arrêt CJUE Fashion ID) ? Quelles mentions ajouter, et quelles conditions Meta accepter (« Business Tools Terms », avenant de traitement) ?
7. Transfert à Meta Platforms Ireland / Google Ireland, puis hors UE : la mention actuelle (renvoi à leurs politiques) suffit-elle ?

### C. Statistiques et anti-abus

8. Les compteurs d'étapes (envoi depuis la page à notre serveur, sans IP, cookie ni identifiant) relèvent-ils de l'art. 5(3) ePrivacy ? Si oui, peuvent-ils être exemptés (mesure d'audience strictement limitée), ou faut-il un consentement ?
9. L'empreinte salée de l'IP (1 h, limitation des abus) et la vérification DNS du domaine de l'e-mail (seul le domaine est envoyé à Cloudflare DNS) peuvent-elles reposer sur l'intérêt légitime ?

### D. Information et contrats

10. La section proposée pour la politique de confidentialité (`docs/texte-politique-confidentialite.md`) est-elle complète au regard de l'art. 13 ? Faut-il une notice courte directement dans l'outil (premier niveau) en plus du lien ?
11. Contrats de sous-traitance (art. 28) à vérifier : Cloudflare, Resend, Microsoft. Le géoportail (Administration du cadastre et de la topographie, service public) est-il un destinataire à mentionner ?
12. Durées : 12 mois après le dernier échange sans suite pour les demandes, 30 jours chez Resend, 3 mois pour les compteurs. Est-ce acceptable ?

### E. Contenu et responsabilité professionnelle

13. Les textes suffisent-ils pour qu'une estimation en ligne ne soit pas prise pour une **expertise** engageant l'agence ? Aujourd'hui : « Estimation indicative basée sur des statistiques publiques. Elle ne remplace pas une estimation sur place. » Et pour les maisons, un avertissement plus fort.
14. Le badge « Agence certifiée – Chambre immobilière » avec un lien vers la fiche de membre : y a-t-il des règles d'usage du label à respecter ?

## Pièces utiles

- Code et documentation : dépôt `intresseiertmechvoll-wq/claude-voice`, dossier `estimation-widget/` (accès sur demande).
- `PRIVACY.md` : tous les flux de données, avec sources.
- `docs/texte-politique-confidentialite.md` : texte proposé pour immobuild.lu.
- `docs/rapport-codex-2.md` : rapport d'audit indépendant du 19/11/2026.
