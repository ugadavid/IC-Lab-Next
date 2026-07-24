# Mission 102 — Installation de la vidéothèque canonique Proto05

## Résultat

La Library historique Proto05 `data/video-library.json` a été migrée et
installée en `schemaVersion: "1.0"`. La migration a utilisé le migrateur de la
mission 101 et le validateur canonique 099. Aucun `videoRef`, `activity.video`
ou autre champ de `data/activities.json` n’a été écrit.

Version applicative inchangée : **0.1.31**.

## Sauvegarde et installation

- sauvegarde exclusive :
  `prototypes/05-augmented-ic-video-01/data/backups/mission-102-video-library-0.1.json` ;
- SHA-256 de la source historique :
  `361305f679391fb8559c2958880ce9dcb5a0cf238a1c6371a2b3f6583cfd7a9b` ;
- SHA-256 de la sauvegarde : identique à la source ;
- la sauvegarde est créée en mode exclusif et n’est jamais écrasée ;
- la sortie canonique est écrite dans un fichier temporaire du même répertoire,
  revalidée, puis remplacée par renommage atomique ;
- aucun fichier média, catalogue historique ou activité n’a été supprimé,
  déplacé ou téléchargé.

Statistiques installées : 15 assets, 15 sources, 15 playables, 9 fichiers
locaux présents, 3 playables conservés en `missing-local` avec
`availabilityReason: "missing-file"`, 0 traitement fabriqué et 10 traitements
historiques différés.

## Adaptateur fonctionnel

Fichiers ajoutés :

- `prototypes/05-augmented-ic-video-01/server/media-library-runtime.js` :
  lecture/validation canonique et projection de compatibilité pour les routes
  historiques ;
- `prototypes/05-augmented-ic-video-01/server/media-library-install.js` :
  installation explicite, sauvegarde exclusive et écriture atomique ;
- `prototypes/05-augmented-ic-video-01/server/test/media-library-install.test.js`.

Fichiers adaptés :

- `server/server.js` : la Library 1.0 est chargée comme source de vérité ; les
  consommateurs existants reçoivent une projection reconstruite ; les
  écritures passent par une conversion et une validation canoniques ;
- `server/media-library-migration.js` : conservation du provider dans les
  playables canoniques ;
- `server/test/helpers/temporary-proto05-server.js` : copie des modules de
  lecture/migration dans les serveurs temporaires ;
- `server/test/library-persistence.test.js` : attente explicite du schéma 1.0.

Les routes Library, la résolution des playables, l’import local, la copie
directe, la préparation HLS, la dérivation et l’association vidéo des activités
restent accessibles par l’adaptateur. `activity.video` reste une projection de
compatibilité ; les activités n’ont pas été migrées.

## Vérifications

- tests ciblés 099/101/102, persistance Library, import local, copie directe,
  duplication et régression de données : **96/96 réussis** ;
- `npm run check` : réussi ;
- `git diff --check` : réussi ;
- hash de `data/activities.json` comparé à `HEAD` : identique ;
- lecture directe de la Library installée : 1.0 valide, 15/15/15 ;
- recette HTTP via serveur Proto05 temporaire : lecture Range locale, ajout des
  sources locale/directe/HLS, résolution d’un playable, persistance après
  redémarrage et association d’une copie d’activité : réussis ;
- les tests de non-mutation de `activities.json` et des sources historiques ont
  réussi.

Une exécution de `npm test` a été tentée, mais a dépassé le délai de contrôle
avant restitution complète. Les tests ciblés couvrent les parcours touchés et
ont été rejoués avec succès ; aucune dérivation FFmpeg, requête réseau distante
ou recette Chromium n’a été lancée.

## Limites restantes

- les anciennes pages et routes utilisent encore la projection runtime ; leur
  refonte vers les objets canoniques natifs est volontairement différée ;
- les activités historiques restent sans `videoRef` nouveau ; leur table de
  correspondance de migration reste un artefact de migration, non une écriture ;
- les 3 fichiers locaux absents restent visibles mais non lisibles ;
- les traitements historiques incomplets ne sont pas reconstruits ;
- aucune interface Library nouvelle, analyse technique, téléchargement,
  réconciliation ou migration de fichiers média n’a été ajoutée.

## État Git

Branche : `main`. Aucun commit ni push effectué. Les changements non commités
sont limités au socle d’installation/adaptateur, aux tests concernés, au
rapport et au document `data/video-library.json` explicitement autorisé par la
mission. Le répertoire de sauvegarde runtime est ignoré par Git.

Message de commit proposé :

`feat(proto05): install canonical media library`

## Complément de validation avant commit

### État initial et prérequis

- branche : `main` ;
- dernier commit : `7d97263 feat(proto05): add dormant media library dry-run migrator` ;
- prérequis 098, 099, 100 et 101 présents ;
- le diff initial ne contenait que l’installation 102, son adaptateur, ses tests
  et le rapport ; aucune migration n’a été recommencée pendant ce complément.

### Source, lecteur, projection et consommateurs

Le flux vérifié est :

```text
data/video-library.json 1.0
  → readCanonicalMediaLibrary / validateMediaLibrary
  → projectCanonicalLibrary
  → VIDEO_LIBRARY runtime avec alias historiques
  → resolveLibraryPlayable / activityVideoFromLibrary
  → routes Library, résolution vidéo, activités
  → teacher-videos, teacher-create, teacher-author, teacher-guided,
    prévisualisation et index étudiant
```

Les routes de consultation utilisent cette projection sans reconstruire de
catalogue canonique. `video-catalog.json` est encore lu par la compatibilité
des activités historiques et possède son writer distinct ; il n’est jamais
reconstruit depuis `VIDEO_LIBRARY`.

### Writers inspectés

| Writer | Déclencheur | Traitement retenu |
|---|---|---|
| `installCanonicalMediaLibrary` | installation 102 explicite | sauvegarde exclusive 0.1, migration 101, validation 1.0, temp même répertoire, rename atomique ; une seule installation |
| `persistVideoLibrary` | import local, copie directe, dérivation, POST d’asset | part du document canonique précédent, conserve ses entités et champs inconnus, ajoute seulement les nouveaux objets via le migrateur, valide puis écrit une fois sous file queue |
| `persistVideoCatalog` | route historique POST catalogue | writer séparé de `video-catalog.json`, sans reconstruction depuis la projection Library |
| `persistActivities` | création, auteur, guidé, association vidéo | writer séparé de `activities.json`, hors installation 102 et non appelé par les consultations |
| writers HLS/FFmpeg | jobs temporaires et fichiers de dérivation | espaces temporaires ou média géré ; aucun catalogue canonique reconstruit par une consultation |

Pour les entités canoniques existantes, `canonicalFromRuntime` repart d’une
copie du document 1.0 chargé : il ne sérialise pas la projection historique en
remplacement du document canonique. Les champs inconnus des entités existantes
sont donc conservés ; les writers ne modifient que les champs explicitement
compatibles (`title`, `lifecycle`, `defaultPlayableId`) et ajoutent des entités
nouvelles validées. Les contrôles de persistance et de redémarrage ont réussi.

La preuve de non-double-écriture est constituée par l’absence d’écriture dans
`loadVideoLibrary`, l’unique `rename` du writer Library par opération, la file
`writeQueue`, et les tests de persistance : aucun writer n’est appelé pendant
les consultations.

### Écart exact avec la sortie de la mission 101

Le seul changement du migrateur depuis la mission 101 est l’ajout de :

```js
provider: source.provider || null
```

dans chaque `Playable` canonique. La sortie reste déterministe et contient les
mêmes 15 assets, 15 sources, 15 playables, disponibilités, traitements différés,
relations et diagnostics. L’écart est limité à la présence du champ `provider`
sur les 15 playables ; la sortie installée et les deux exécutions de contrôle
en contiennent 15/15. Les deux exécutions actuelles sont strictement égales et
la sortie installée est valide, lisible et `writeEligible`.

### Suite de tests complète

La suite ciblée reste à **96/96 réussis**. Une suite complète a été relancée
avec `node --test --test-concurrency=1 test/*.test.js` avec un délai maximal
configuré de cinq minutes. Elle a été interrompue avant ce terme après
inspection du processus bloqué, afin de ne pas laisser tourner le worker sans
contrôle et sans masquer son état.
L’inspection des processus a identifié précisément le worker bloquant :
`test/hls-preparation.test.js`, qui reste sans sortie au-delà de 30 secondes
lorsqu’il est lancé seul. Il ne s’agit pas d’un échec masqué : le résultat est
**indéterminé par timeout**, et non déclaré réussi.

### Recette runtime réelle isolée

Sur un serveur Proto05 temporaire chargé avec la Library installée :

- `GET /api/proto05/library/assets` : 200, 15 assets ;
- playable local présent : résolution 200 et média Range 206 ;
- playable distant HLS UGA : résolution 200, sans téléchargement distant ;
- playable `missing-local` : visible et résolu structurellement 200, sans
  tentative de lecture physique ;
- activité historique : `GET /api/proto05/activities/:id` et
  `/video-resolution` : 200 ;
- pages Library, prévisualisation/auteur, guidé et étudiant : HTTP 200 ;
- le hash de `video-library.json` est identique avant/après les consultations.

Une validation visuelle Chromium n’a pas été exécutée dans ce complément ; la
restitution à David reste nécessaire pour cette partie humaine.

### Activités et absence d’écriture

Empreintes exactes de `data/activities.json` :

- avant : `488c41d28a9d05d8292b04a63f68e4508dd038087ee0e77dabc05bdbbb4d09ed` ;
- après : `488c41d28a9d05d8292b04a63f68e4508dd038087ee0e77dabc05bdbbb4d09ed` ;
- égalité binaire : oui ; projection `activity.video` : identique.

Deux `videoRef` existaient déjà avant la mission, sur
`proto05-draft-1784219853222-b9e6a5` et
`proto05-draft-1784811747316-88a00c`. Aucun nouveau `videoRef` n’a été écrit.

### Test de restauration et procédure de marche arrière

Une copie temporaire a été restaurée depuis la sauvegarde ; elle a été
comparée octet par octet et porte le schéma 0.1. La procédure exacte, à
exécuter après arrêt du serveur et après sauvegarde de l’état courant, est :

```powershell
$data = 'J:\2026\UGA\M2\Stage-Memoire\Applications\IC-Lab-Next\prototypes\05-augmented-ic-video-01\data'
Copy-Item -LiteralPath (Join-Path $data 'video-library.json') -Destination (Join-Path $data 'video-library.json.before-rollback') -Force
Copy-Item -LiteralPath (Join-Path $data 'backups\mission-102-video-library-0.1.json') -Destination (Join-Path $data 'video-library.json.rollback.tmp') -Force
Move-Item -LiteralPath (Join-Path $data 'video-library.json.rollback.tmp') -Destination (Join-Path $data 'video-library.json') -Force
```

Cette procédure restaure uniquement le catalogue historique ; elle ne touche
ni `activities.json` ni `video-library-media`. La restauration fonctionnelle
n’a pas été exécutée puisque la Library 1.0 est valide.

### Processus

Les processus de test lancés pendant la validation, y compris les workers
`npm test` et `hls-preparation`, ont été arrêtés explicitement. Le contrôle final
ne montre plus de processus de test Proto05 ; les processus Node préexistants
du workspace et les services externes n’ont pas été arrêtés.

### Contrôles finaux et état Git

- `npm run check` depuis `prototypes/05-augmented-ic-video-01/server` : réussi ;
- `git diff --check` : réussi ;
- aucune donnée supplémentaire modifiée ;
- aucun commit ni push.

État Git final : les changements restent ceux listés dans le rapport initial,
plus le présent complément documentaire. Le dernier commit demeure
`7d97263`; version applicative `0.1.31` inchangée.

## Validation finale avant commit — comparaison HLS et recette runtime

### Comparaison isolée du sous-test HLS

Le même sous-test a été exécuté sans modifier le travail courant dans une
copie issue de HEAD `7d97263`, puis dans l’état actuel de la mission 102 :

```text
node --test --test-concurrency=1 --test-name-pattern="préparation HLS temporaire" test/hls-preparation.test.js
```

| État | Résultat | Durée observée |
|---|---:|---:|
| HEAD `7d97263` | 1/1 réussi | 18,955 s |
| Mission 102 actuelle | 1/1 réussi | 18,546 s |

Le timeout signalé précédemment n'est donc pas une régression de la migration
102. L'analyse a révélé que la fixture du test utilisait encore des objets de
la projection 0.1 alors que le serveur validait le catalogue canonique 1.0 ;
les assertions lisaient également d'anciens champs de playable. La fixture et
ses accès ont été alignés sur le contrat canonique, sans modifier les données
réelles ni le comportement HLS. L'adaptateur runtime conserve en outre la
provenance nécessaire aux sorties dérivées.

### Suite et contrôles après correction de compatibilité

- `npm test` : **168/168 réussis**, 0 échec, 0 test annulé, 0 ignoré ; durée
  observée : 37,514 s ;
- sous-test HLS comparatif : résultats ci-dessus, avec succès dans les deux
  états isolés ;
- `npm run check` : à rejouer après cette mise à jour documentaire ;
- `git diff --check` : à rejouer après cette mise à jour documentaire.

### Runtime réel laissé à David pour validation visuelle

Le serveur Proto05 réel est lancé sur `http://127.0.0.1:8891`, version
`0.1.31`, avec healthcheck 200. Le processus lancé pour cette recette est
conservé actif jusqu'à la validation visuelle de David ; Chromium n'a pas été
ouvert automatiquement.

URLs exactes :

- Library : `http://127.0.0.1:8891/teacher-videos.html`
- API de la Library — 15 entrées :
  `http://127.0.0.1:8891/api/proto05/library/assets`
- média local présent :
  `http://127.0.0.1:8891/api/proto05/library/media/1ae9eb2b32006bdc-anonymized.mp4`
- playable distant HLS UGA :
  `http://127.0.0.1:8891/api/proto05/library/playables/video-proto05-uga-37004`
- playable local présent :
  `http://127.0.0.1:8891/api/proto05/library/playables/video-media-proto05-anonymized-1ae9eb2b32006bdcb57b0c96`
- playable `missing-local` :
  `http://127.0.0.1:8891/api/proto05/library/playables/video-media-proto05-anonymized-41393a2fec32b45ccffa4420`
- activité étudiante :
  `http://127.0.0.1:8891/index-0.0.9.html?activity=proto05-augmented-video-01`
- prévisualisation/auteur :
  `http://127.0.0.1:8891/teacher-author.html?activity=proto05-augmented-video-01`
- atelier guidé :
  `http://127.0.0.1:8891/teacher-guided.html?activity=proto05-augmented-video-01`
- parcours auteur lié à l'activité :
  `http://127.0.0.1:8891/teacher/author/proto05-augmented-video-01`

La validation visuelle humaine reste en attente : affichage des 15 entrées,
lecture du local, résolution du distant HLS, comportement visible de
`missing-local`, puis vérification des quatre parcours. Après confirmation de
David, le serveur sera arrêté ; les SHA-256 des deux fichiers de données,
l'absence d'écriture lors des consultations, `npm run check` et `git diff
--check` seront revérifiés et consignés ici.

## Validation visuelle finale — contrôle accepté

David a validé la recette visuelle après redémarrage du serveur : les 15 entrées
sont visibles ; les trois playables `missing-local` sont clairement signalés
comme **indisponibles**, avec le motif `missing-file` ; les autres médias sont
affichés comme disponibles normalement.

Le serveur de recette Proto05, PID `42168`, a ensuite été arrêté. Le port 8891
ne possède plus de listener. Les autres processus Node observés appartiennent
à des services préexistants et n'ont pas été arrêtés.

Contrôles finaux après la recette :

- SHA-256 final de `data/video-library.json` :
  `9cc48a5c0fab83255823a83942a66e7f2ef373eb70dfb9c5a0b0da5d6c7d4410` ;
- SHA-256 final de `data/activities.json` :
  `488c41d28a9d05d8292b04a63f68e4508dd038087ee0e77dabc05bdbbb4d09ed` ;
- comparaison avec les empreintes relevées avant la recette : identiques ;
- aucune écriture produite par les consultations et la recette visuelle ;
- `npm run check` : réussi ;
- `git diff --check` : réussi ;
- version applicative inchangée : `0.1.31` ;
- aucun commit ni push.

La validation humaine visuelle est donc acquise pour ce périmètre. Les limites
fonctionnelles et le périmètre du rapport initial restent inchangés.
