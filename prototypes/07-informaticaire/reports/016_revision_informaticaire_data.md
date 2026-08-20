# Révision éditoriale d’Informaticaire — 20 août 2026

## Livrable

Le fichier `data_informaticaire_revise.js` est une copie révisée de `data.js`. Le fichier transmis par David n’a pas été modifié.

## Résultat

- 64 fiches initiales conservées ;
- 8 fiches ajoutées, soit 72 fiches au total ;
- 10 entrées chronologiques portées à 13 ;
- 17 filtres portés à 18 ;
- aucun identifiant dupliqué ;
- aucune relation interne, relation de graphe ou entrée chronologique orpheline ;
- aucune collision de titre ou d’alias après normalisation ;
- syntaxe JavaScript valide.

## Corrections certaines

### Lectŭrĭo+

La fiche `lecturio`, déjà reliée à une page Miriadi existante, n’est plus présentée comme un objet au nom et au statut inconnus :

- titre public corrigé en `Lectŭrĭo+` ;
- statut `vivant` ;
- source qualifiée comme documentation officielle retrouvée ;
- ancien identifiant `lecturio` conservé ;
- anciens alias conservés ou complétés pour la recherche.

### APICAD

APICAD était typé `acteur collectif`, valeur qu’aucun filtre public ne permettait d’afficher. La fiche utilise désormais le type technique `acteur`, avec `actorKind: institution / collectif`. Elle rejoint ainsi le filtre existant « Acteurs » sans perdre sa qualification.

### Miriadi

Le type `plateforme` était présent dans les données mais absent des filtres. Le filtre « Plateformes » a été ajouté.

### Raquel Serrano López

La fiche n’est plus décrite comme une simple personne citée :

- entretien réalisé ;
- transcription encore absente du corpus audité ;
- documents transmis attestés ;
- liens vers Interra, REFIC, Formarse en IC et l’étude de 2021 ;
- aucune demande explicite d’intégration ou de republication ne lui est attribuée.

### Prototypes actuels

La chronologie contenait déjà `prototypes-actuels`, mais aucune fiche correspondante n’existait. Une fiche a été ajoutée afin de supprimer ce lien orphelin et de relier le travail du stage aux besoins transversaux.

## Ajouts documentaires sélectionnés

Le tableau Symbaloo ne devient pas 51 fiches supplémentaires. Il est représenté par un nœud de collection, puis complété par les références les plus structurantes et les mieux documentées :

1. `formarse-en-ic` — portail de formation et de ressources ;
2. `refic` — compétences de communication plurilingue en intercompréhension ;
3. `refdic` — compétences en didactique de l’intercompréhension ;
4. `marep-carap` — cadre des approches plurielles ;
5. `eval-ic` — modèles, descripteurs, protocole et outil d’évaluation ;
6. `interra` — dispositif didactique transmis par Raquel ;
7. `etude-serrano-2021` — étude comparative de matériaux didactiques.

Les deux PDF transmis servent uniquement de sources descriptives. Ils ne sont ni intégrés ni proposés au téléchargement.

## Relations ajoutées

Les nouveaux objets sont reliés aux fiches existantes les plus pertinentes : Miriadi, Galapro, Évaluation, EuRom, Aides à la compréhension orale, Centraliser sans figer, Encarni et Raquel. Les relations existantes sont conservées et dédupliquées.

## Points volontairement non corrigés dans ce seul fichier

Ces sujets nécessitent une modification de l’interface ou un arbitrage documentaire, pas une réécriture automatique des données :

- le libellé public « Vérifié » doit devenir « Fiche revue le » dans le moteur d’affichage ;
- une date de contrôle d’accessibilité ne doit apparaître que pour un lien réellement contrôlé accessible ;
- les documentations annonçant encore 42 fiches doivent être alignées sur le corpus final ;
- les 25 fiches restant au statut `à vérifier` ne doivent pas être promues sans preuve ;
- les entrées dont le nom ou l’identité restent incertains doivent faire l’objet d’un arbitrage humain ;
- les URL répétées dans plusieurs fiches ont été conservées : elles expriment parfois un rapprochement documentaire, même lorsqu’il reste explicitement « à vérifier ».

## Contrôles exécutés

- `node --check data_informaticaire_revise.js` ;
- évaluation du fichier dans un contexte JavaScript isolé ;
- unicité des 72 identifiants ;
- validation de toutes les cibles `relatedItems` et `relations` ;
- validation des identifiants du graphe et de la chronologie ;
- contrôle des champs obligatoires ;
- recherche des collisions de titres et d’alias normalisés.

