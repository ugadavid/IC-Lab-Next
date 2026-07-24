# Mission 098 — Spécification canonique de la vidéothèque Proto05

## Résultat

Les décisions fonctionnelles de la mission ont été traduites dans le document
canonique :

[MEDIA_LIBRARY_MODEL.md](/J:/2026/UGA/M2/Stage-Memoire/Applications/IC-Lab-Next/prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md)

Le document fixe :

- asset, source et playable sans fusion ;
- les cardinalités cibles non 1:1 ;
- la Library comme source de vérité après migration ;
- `video-catalog.json` comme fallback transitoire en lecture seule ;
- `videoRef` comme référence moderne et `activity.video` comme projection ;
- les copies locales distantes comme playables supplémentaires du même asset ;
- les familles avec `parentAssetId` et `familyRootAssetId` ;
- la disponibilité `available`, `missing-local`, `unreachable-remote`,
  `blocked`, `pending`, `unknown` ;
- l’entité persistante `MediaTreatment` et ses états normalisés ;
- dossiers, tags et collections calculées ;
- métadonnées techniques, intégrité et politique de suppression ;
- la migration déterministe, sauvegardée, idempotente et réversible ;
- la compatibilité des sept activités et des vues Proto05 ;
- le découpage en missions courtes d’implémentation.

Les corrections finales de contrat précisent également que :

- `MediaSource.assetId`, `Playable.assetId` et `Playable.sourceId` sont les
  seules relations canoniques ; `sourceIds` et `playableIds` sont des
  projections recalculables ;
- `Playable` ne possède pas de `status` ; sa disponibilité est portée par
  `availability`, l’analyse par `technicalMetadata.status` et l’exécution par
  `MediaTreatment.status` ;
- l’origine reste dans `MediaSource`, tandis que le fichier géré est localisé
  par `Playable.location.storageKey` ;
- la collection « Anonymisées » qualifie uniquement la dérivation propre de
  type `anonymization`, pas un simple ancêtre ;
- `schemaVersion` suit un format `MAJEUR.MINEUR` avec migration explicite entre
  versions majeures et lecture mineure tolérante seulement sans perte.

## Contradictions techniques relevées

La spécification cible n’est pas identique au schéma 0.1 actuel. Les écarts
sont documentés, sans correction pendant cette mission :

1. `video-library.json` contient actuellement un asset/source/playable par
   entrée, mais la cible autorise plusieurs sources et playables par asset.
2. La copie distante actuelle crée un nouvel asset. La cible impose qu’elle
   crée un playable local supplémentaire du même asset ; cela nécessitera une
   adaptation de la fonction de copie et une migration prudente des entrées
   existantes.
3. Les dérivés actuels possèdent `sourceAssetId` dans leur provenance, mais pas
   `parentAssetId` ni `familyRootAssetId` normalisés.
4. Les trois fichiers absents sont actuellement représentés comme disponibles
   dans la Library ; la cible les marque `missing-local` sans restauration ni
   suppression.
5. Les jobs de préparation et de dérivation sont en mémoire. La cible demande
   un `MediaTreatment` persistant et une transition au redémarrage vers
   `interrupted`.
6. Certaines activités n’ont pas encore de `videoRef` et utilisent le catalogue
   historique ; la migration devra compléter les sept activités sans perdre
   `activity.video`.
7. Les dossiers, tags et traitements persistants n’existent pas encore ; leurs
   collections cibles sont définies vides à la migration.

Ces différences sont des travaux futurs, pas des régressions corrigées dans
098.

## Points volontairement différés

- aucune modification de `video-library.json`, `video-catalog.json` ou
  `activities.json` ;
- aucune création de validator ou de route ;
- aucune migration à blanc exécutée ;
- aucune restauration ou qualification physique des trois fichiers absents ;
- aucune persistance des traitements ;
- aucune interface de dossiers, tags, familles ou suppression ;
- aucun changement de version ;
- aucun serveur, navigateur, téléchargement, traitement vidéo ou dérivation.

## Fichiers inspectés

- `prototypes/05-augmented-ic-video-01/reports/097_proto05_media_library_model_audit.md` ;
- `server/server.js` ;
- `server/library-contract.js` et `server/media-contract.js` ;
- `server/package.json` ;
- `data/video-library.json`, `data/video-catalog.json`, `data/activities.json` ;
- `data/video-library-media/` ;
- `teacher-videos.html`, `teacher-create.html`, `teacher-guided.html`,
  `teacher-anonymization.html`, `teacher-author.html`, `teacher.html` ;
- `server/README.md`, `README.md`, `ROADMAP.md` ;
- tests de Library, imports, copies distantes, HLS, persistance et dérivation.

## Contrôles exécutés

- recherches statiques des entités, routes, champs, chemins, états et usages ;
- lecture et comptage des données réelles : 7 activités, 15 assets, 15 sources,
  15 playables et 9 fichiers physiques ;
- comparaison des `storageKey` avec les fichiers présents, sans restauration ni
  écriture ;
- vérification de cohérence documentaire avec le rapport 097 et les décisions
  explicites de la mission 098 ;
- `git diff --check` — réussi.

Conformément au périmètre, aucun test fonctionnel, serveur interactif,
Chromium, téléchargement, traitement, migration ou écriture canonique n’a été
exécuté.

## Version et état Git

La version reste **0.1.31** : cette mission est documentaire et n’autorise
aucun incrément.

Les seuls fichiers créés sont :

- `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md` ;
- `reports/098_proto05_media_library_model_specification.md`.

Aucun code, donnée, `ROADMAP.md` ou configuration n’a été modifié. Aucun commit
ni push n’a été effectué.

Message de commit proposé, non exécuté :
`docs(proto05): define canonical media library model`.
