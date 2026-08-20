# Informaticaire

Prototype statique v0.7.0 pour une mémoire vivante, communautaire et partageable de l'intercompréhension.

## Présentation courte

Informaticaire aide à retrouver, documenter, relier, sauver, réutiliser et partager les ressources, projets, acteurs, outils, corpus et besoins du domaine de l'intercompréhension.

La v0.7.0 transforme la page historique en cinq parcours applicatifs substituables. Elle conserve toutes les fonctions documentaires, ajoute un explorateur coloré des 110 fiches et permet de parcourir contextuellement les 86 relations typées réelles.

## Publics visés

- Enseignants : retrouver des activités, ressources, scénarios ou outils à adapter.
- Chercheurs : suivre l'histoire des projets, corpus, concepts et acteurs.
- Ingénieurs pédagogiques : comprendre les formats, risques, besoins et possibilités de maintenance.
- Réseaux et associations : piloter la récupération, la mutualisation et la transmission.
- Formation de formateurs : repérer des ressources partageables et des exemples de réutilisation.

## Fonctionnalités

- Bibliothèque de 110 fiches documentées.
- Recherche et filtres par type, statut et public.
- Fiches détaillées avec description, état, relations, acteurs, traçabilité, risques, droits et pistes de réutilisation.
- Navigation principale en cinq familles : Explorer, Carte, Visite, Contribuer et Comprendre.
- Relations internes simples et 86 relations typées.
- Carte relationnelle contextuelle, de proche en proche et sans bibliothèque externe.
- Campagne "Ressources à sauver ensemble".
- Vue "À partager en priorité".
- Formulaire local de contribution avec brouillon JSON exportable.
- Export des fiches en JSON et de la campagne de récupération en CSV.
- Visite guidée en 5 étapes.
- Démo rapide autour de Galanet.
- Recherche externe ciblée dans les ressources de Miriadi, directement depuis sa fiche et sans quitter l’état courant d’Informaticaire.
- Sections de prudence publique et de décisions communautaires.

## Comment ouvrir le prototype

Ouvrir `index.html` dans un navigateur moderne.

Aucun serveur, framework ou backend n'est nécessaire. Les données sont chargées depuis `data.js` et les exports se font côté navigateur.

## Structure des fichiers

- `index.html` : structure de l'interface et sections de démonstration.
- `styles.css` : navigation par vues, identité pastel, cartes, filtres, cartographie SVG, modale, visite guidée et responsive.
- `data.js` : données statiques des fiches, relations, preuves, récupération et champs communautaires.
- `script.js` : navigation applicative, recherche, filtres, voisinages relationnels, rendu des vues, exports, formulaire, visite guidée et démo Galanet.
- `demo-script.md` : scripts de démonstration en 5 minutes et 12 minutes.
- `reports/` : rapports successifs des versions.
- `entretiens/` : sources PDF consultées, non modifiées par le prototype.

## Limites

- Ce prototype n'est pas une base officielle.
- Il n'est pas exhaustif.
- Les droits, licences et accès doivent être vérifiés avant toute diffusion publique.
- Les contributions sont préparées localement puis doivent être relues humainement.
- Les données viennent d'une première exploitation d'entretiens et doivent être consolidées collectivement.

## Pistes

- Ajouter une vraie procédure de validation communautaire.
- Définir un hébergement durable.
- Relier les fiches à des sources vérifiées et à des archives récupérables.
- Améliorer les exports pour un usage documentaire ou institutionnel.
- Préparer une gouvernance minimale : validation, droits, contribution, sauvegarde.
- Étudier un futur backend léger si la communauté souhaite contribuer directement.

## Historique des versions

- v0.1 : création du prototype avec fiches, frise, filtres, recherche, besoins et ressources à vérifier.
- v0.2 : ajout des liens internes, de la traçabilité par entretien et de la campagne de récupération.
- v0.3 : ajout des fiches détaillées, des relations typées, de la carte relationnelle et des exports JSON/CSV.
- v0.4 : recentrage communautaire avec publics, parcours d'usage, réorganisation des fiches et champs de réutilisation.
- v0.5 : contribution simulée, champs droits/licence/accessibilité, filtres par public, priorité communautaire et vue "À partager en priorité".
- v0.6 : version démonstration avec visite guidée, démo rapide, indicateurs de synthèse, limites publiques, décisions communautaires et README partageable.
- v0.6 enrichie : corpus porté à 104 fiches, liens issus du terrain intégrés et recherche externe ciblée dans Miriadi.
- v0.6.6 : corpus consolidé à 110 fiches et recherche de la bibliothèque rendue directement accessible depuis l'accueil.
- v0.7.0 : intégration du langage visuel validé, navigation en cinq familles, explorateur chromatique et cartographie contextuelle des 86 relations réelles.
