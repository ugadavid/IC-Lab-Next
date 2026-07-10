# Rapport 010 - Informaticaire v0.6.2 registre des acteurs

## Objectif de la mission

Rendre le filtre `Acteurs` plus utile, cohérent et démontrable en créant un registre d'acteurs à deux niveaux :

- personnes interviewées ;
- personnes citées dans les entretiens.

L'objectif n'était pas de créer une encyclopédie exhaustive, mais de rendre visibles les principales personnes ressources, les personnes citées et les cas à vérifier.

## Fichiers modifiés

- `prototypes/07-informaticaire/data.js`
- `prototypes/07-informaticaire/script.js`

## Fichier créé

- `prototypes/07-informaticaire/reports/010_informaticaire_v0.6.2_actor_registry_report.md`

## Nombre de fiches acteurs avant / après

Avant la mission :

- 10 fiches `type: "acteur"` ;
- 11 fiches acteur au sens large en comptant `APICAD` comme acteur collectif.

Après la mission :

- 33 fiches `type: "acteur"` ;
- 34 fiches acteur au sens large en comptant `APICAD` comme acteur collectif ;
- 15 personnes interviewées marquées avec `interviewed: true`.

## Personnes interviewées ajoutées ou complétées

Fiches déjà présentes et complétées :

- Laura
- Richard
- Thomas
- Alice
- Sandra
- Encarni Carrasco
- Jean-Pierre Chavagne
- Christian Degache
- Kátia
- Hugues Sheeren

Fiches ajoutées :

- Teurra
- Giovanna
- Elena
- Roxana
- Sandrine

Les personnes dont le nom complet reste incertain ont reçu :

- `confidence: "à vérifier"` ;
- `sourceStatus: "nom complet à vérifier"` ;
- `todo: ["Vérifier le nom complet"]`.

## Personnes citées ajoutées ou complétées

Fiches citées ajoutées :

- Louise Dabène
- Claire Blanche-Benveniste
- Sandra Garbarino
- Paula Leone
- Mariana Frontini
- Laurent Baqué
- Eric Martin / Éric Marteau
- Raquel Serrano López
- Magdalena de Carlo
- Lia Escarpe
- Robin Bright
- Timothée Liotard
- Philippe Blanchet
- Pierre Escudé
- Francisco Calvo del Olmo / Paco
- Salman Khan
- Hugo / Professor Hugo
- Chassagne / Castagne à Reims

Fiches existantes complétées comme interviewées et citées :

- Hugues Sheeren
- Jean-Pierre Chavagne
- Encarni Carrasco
- Christian Degache
- Kátia

## Doublons évités ou fusionnés

- `Jean-Pierre Chavagne` n'a pas été dupliqué : la fiche existante `jean-pierre` a été enrichie.
- `Encarni Carrasco` et `Encarnación Carrasco Perea / Encarni` ont été rattachées à la fiche existante `encarni` via des alias.
- `Christian Degache` n'a pas été dupliqué.
- `Kátia` / `Katia` ont été gérées par alias sur la fiche existante `katia`.
- `Hugues Sheeren` / `Hugues Scheren` ont été gérés par alias sur la fiche existante `hugues`.
- `Sandra Garbarino` a été créée séparément pour éviter de la confondre avec la fiche `Sandra` interviewée.
- `Eric Martin / Éric Marteau`, `Hugo / Professor Hugo` et `Chassagne / Castagne à Reims` restent volontairement des fiches à vérifier.

## Champs ajoutés

Les fiches acteurs disposent désormais progressivement de :

- `actorKind`
- `interviewed`
- `domains`
- `affiliations`
- `mentionedProjects`
- `mentionedResources`
- `citedBy`
- `aliases`

Les champs communautaires existants ont été conservés :

- `communityUse`
- `reuseHint`
- `contributionHint`
- `audience`

## Alias ajoutés

Alias principaux ajoutés :

- `JP`, `Jean-Pierre`, `Chavagne`
- `Katia`, `Kátia`
- `Christian`, `Degache`, `Degâge`, `De Gache`
- `Encarni`, `Encarnación Carrasco`, `Encarnación Carrasco Perea`
- `Hugues`, `Hugues Scheren`, `Hugues Sheeren`
- `Louise Dabene`, `Dabène`
- `Claire Blanche Benveniste`, `Blanche-Benveniste`
- `Paco`, `Francisco Calvo del Olmo`
- `Professor Hugo`, `Professeur Hugo`
- `Chassagne`, `Castagne`

## Interface

L'interface n'a pas reçu de nouvelle grosse fonctionnalité.

Les cartes et fiches détaillées affichent maintenant, pour les acteurs :

- un badge `Interviewé`, `Cité`, `Interviewé + cité`, `Collectif` ou `À vérifier` ;
- les domaines ;
- les projets mentionnés ;
- les ressources mentionnées ;
- les personnes ou entretiens qui citent la fiche quand l'information est disponible.

## Vérifications effectuées

Vérifications statiques :

- `node --check prototypes/07-informaticaire/data.js`
- `node --check prototypes/07-informaticaire/script.js`

Vérifications navigateur prévues et effectuées :

- filtre `Acteurs` ;
- recherche `Christian` ;
- recherche `Katia` ;
- recherche `Kátia` ;
- recherche `JP` ;
- recherche `Chavagne` ;
- recherche `Encarni` ;
- recherche `Hugues` ;
- recherche `Sandra` ;
- recherche `Louise Dabène` ;
- recherche `Claire Blanche-Benveniste` ;
- démo Galanet ;
- recherche `EuRom 5` ;
- exports JSON/CSV ;
- mobile ;
- console navigateur.

## Limites restantes

- Les personnes citées ne sont pas toutes documentées avec la même précision.
- Les champs `citedBy`, `domains`, `affiliations`, `mentionedProjects` et `mentionedResources` doivent être enrichis avec une passe documentaire plus fine.
- Plusieurs identités restent à vérifier : Eric Martin / Éric Marteau, Hugo / Professor Hugo, Chassagne / Castagne à Reims.
- Les institutions et collectifs restent peu nombreux ; APICAD est conservé comme `acteur collectif` pour ne pas casser les filtres existants.
- Le filtre `Acteurs` reste centré sur `type: "acteur"` afin de ne pas mélanger personnes et institutions.

## Confirmation de périmètre

La mission 010 a été réalisée uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas été modifié.

Aucun autre prototype n'a été modifié.
