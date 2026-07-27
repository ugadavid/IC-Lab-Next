# Mission 132 — Proto05 — Audit et dry-run de migration JSON vers MariaDB

Date initiale : 27 juillet 2026

Correction Mission 132.1 : 27 juillet 2026

Mise à jour ciblée Mission 133 : 27 juillet 2026

Statut : **construction et preuve de couverture fermées ; migration réelle des JSON non commencée**

Périmètre : Proto05 uniquement

Version applicative : **0.1.45, inchangée**

## 1. Résumé de décision

Le script demandé construit intégralement en mémoire la représentation des
futures lignes MariaDB, sans écrire ni dans les JSON ni dans MariaDB.

Résultat sur les données réelles :

| Indicateur | Résultat |
|---|---:|
| Sources actives chargées | 5 |
| Tables décrites | 31 |
| Tables qui recevraient des lignes | 27 |
| Lignes préparées | 264 |
| Erreurs bloquantes | 0 |
| Avertissements | 22 |
| Chemins de champs sans cible SQL | 0 |
| Chemins normalisés observés dans les cinq sources | 435 |
| Occurrences contrôlées | 3 222 |
| Occurrences conciliées | 3 222 |
| Écarts bloquants | 0 |
| Hash des sources retenues | `a5cacd7540586cffca68415bb50bd9837dfcd4d04e6c4ec3221cf7e1f844eef0` |
| Ancien hash Mission 132 | `7a2571191bc7f3034d553171f6043def781c787ef2035052e84465269c7c762e` |
| Hash après alignement Mission 133 | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |

Deux exécutions indépendantes, l’une depuis la racine du workspace et l’autre
depuis le dossier Proto05, ont produit les mêmes comptes, le même ordre, les
mêmes relations, le même hash des sources et le même nouveau hash intermédiaire.

Après l’alignement SQL de la Mission 133, le code de sortie vaut zéro. Les
quatre intervalles sans segment sont préservés avec `segment_id = NULL`, les
deux traitements terminés restent non publiés, `layerConfiguration.id` possède
sa colonne dédiée et les deux divergences du snapshot vidéo sont devenues des
avertissements explicites. Aucune migration réelle des JSON n’est autorisée par
ce résultat.

## Correction Mission 132.1 — preuve de couverture champ par champ

### Faiblesse reconnue de la première version

La première version associait de nombreux chemins à un statut générique selon
leur fichier ou leur préfixe. Ce classement ne prouvait ni la production de la
colonne annoncée, ni la présence d’une valeur dans un JSON intermédiaire, ni
l’exécution d’une validation. Les affirmations initiales sur
`media_tags.color`, `media_assets.description` et
`media_playable_metadata.metadata_json` étaient en outre incompatibles avec le
schéma 003, qui ne contient aucune de ces trois colonnes.

La conclusion initiale « aucune perte silencieuse » avait été retirée en
Mission 132.1. Après l’alignement Mission 133, la preuve exacte établit que
**les 3 222 occurrences sont conciliées et qu’aucun écart n’est bloquant**.

Au début de la correction 132.1, la branche était toujours `main`, le HEAD
`4ebf1dad5deef8f1a3724e045a88fd4d16efefca` et les deux livrables de la
Mission 132 étaient les seuls fichiers non suivis. Ces changements préexistants
ont été conservés et corrigés sur place.

### Nouveau registre exact

Le script découvre d’abord récursivement les chemins réellement présents, avec
normalisation des index de tableau. Il effectue ensuite une recherche exacte
dans un registre statique. Il n’existe plus de règle de repli par fichier,
entité ou préfixe. Un chemin absent du registre devient
`unmapped-blocking`.

Chaque règle porte sa preuve :

| Statut | Preuve exigée |
|---|---|
| `column-mapped` | table, colonne, constructeur, transformation et comparaison de chaque valeur produite |
| `json-preserved` | table, colonne JSON, chemin interne et restitution exacte de chaque valeur |
| `validation-only` | identifiant stable, exécuteur effectivement appelé, invariant et échec bloquant |
| `explicitly-excluded` | justification et preuve que la reconstruction n’est pas compromise |
| `unmapped-blocking` | diagnostic bloquant et code de sortie non nul |

### Volumes de couverture corrigés

| Statut | Chemins | Occurrences | Conciliées | Écarts |
|---|---:|---:|---:|---:|
| `column-mapped` | 147 | 1 293 | 1 293 | 0 |
| `json-preserved` | 247 | 1 811 | 1 811 | 0 |
| `validation-only` | 41 | 118 | 118 | 0 |
| `explicitly-excluded` | 0 | 0 | 0 | 0 |
| `unmapped-blocking` | 0 | 0 | 0 | 0 |
| **Total** | **435** | **3 222** | **3 222** | **0** |

Les 15 validations distinctes effectivement exécutées sont :

- contrats et timestamps des documents d’activités, de classement et de média ;
- contrat du catalogue vidéo ;
- codes de langue d’activité ;
- ordre des segments de transcription ;
- ordre des phénomènes redondants par segment ;
- projection des visibilités de couches ;
- collections d’activité et qualifications vides ;
- projection vidéo des activités ;
- projection sémantique détaillée du catalogue vidéo.

### Corrections de construction et de preuve

- `tags[].color` : aucune occurrence dans le JSON actuel ; une valeur future est
  conciliée avec `media_tags.color`, jamais avec une colonne JSON.
- `assets[].description` : aucune occurrence actuelle ; une valeur future est
  conciliée avec `media_assets.description` et n’est plus détournée vers
  `provenance_json`.
- Métadonnées des playables : aucune colonne `metadata_json` n’existe.
  `status`, MIME, durée, taille, hash, dimensions, framerate, codecs, audio,
  analyseur, date et erreur sont conciliés un par un avec les colonnes dédiées
  de `media_playable_metadata`. `fileName` reste dans
  `media_playables.provenance_json._migration.technicalMetadataExtras.fileName`;
  le framerate brut reste également traçable tandis que sa valeur numérique est
  vérifiée dans `frame_rate`.
- `transcription.segmentIds`, `segments[].phenomenonIds` et
  `languages[].code` sont maintenant comparés réellement. L’ordre est
  sémantique pour les deux premières listes ; le code de langue est comparé à la
  référence partagée et à l’adhésion de l’activité.
- Le catalogue vidéo compare désormais titre, fournisseur, type, asset,
  playable par défaut, locator, MIME, durée, identifiant vidéo, URL d’embed,
  proxy, clé et URL source. `authorized` doit rester strictement vrai.
  L’asset, la disponibilité et les champs non projetés par ce format ne sont pas
  inventés dans le catalogue ; l’appartenance asset–playable et le playable par
  défaut sont toutefois contrôlés.

Le nombre de lignes reste 264 : la correction complète les valeurs et la preuve,
pas le nombre d’entités. Le hash change parce que la représentation
intermédiaire inclut désormais le registre observé, les comptes de valeurs,
les propriétaires absents, les destinations et les résultats de conciliation.

### Analyse enrichie des quatre intervalles sans segment

Les quatre intervalles appartiennent à l’activité
`proto05-draft-1784230655360-d1182f`, dont l’état est `draft` et qui ne contient
aucun segment :

| Intervalle | Langue | Début | Fin | `segmentId` | Segments dans l’activité |
|---|---|---:|---:|---|---:|
| `interval-draft-1784233724941` | `fr` | 0 | 1 000 | propriété absente | 0 |
| `interval-draft-1784233734393` | `es` | 1 000 | 2 000 | propriété absente | 0 |
| `interval-draft-1784233740073` | `fr` | 0 | 1 000 | propriété absente | 0 |
| `language-guided-1784233779108` | `es` | 3 000 | 51 000 | propriété absente | 0 |

Les identifiants de langue et les bornes permettent de lire une timeline
linguistique sans inventer de segment. La Mission 133 a rendu `segment_id`
nullable tout en conservant la FK lorsqu’une valeur est fournie. Les quatre
lignes sont désormais conciliées et une référence non nulle inconnue reste
bloquante.

### Analyse enrichie des deux traitements terminés

| Traitement | Entrée / sortie asset | Playable de sortie | Disponibilité | Locator | Par défaut | Publication démontrable |
|---|---|---|---|---|---|---|
| `hls-temporal-derivation-1784996744983-f056bd47` | `media-proto05-remote-ref-03738b8065e1866b8e956819` | `video-hls-temporal-derivation-1784996744983-f056bd47` | `available` | workspace local dérivé | non | non |
| `hls-temporal-derivation-1784996884534-a240cc7c` | `media-proto05-remote-ref-03738b8065e1866b8e956819` | `video-hls-temporal-derivation-1784996884534-a240cc7c` | `available` | workspace local dérivé | non | non |

Pour chacun, `status=completed`, `outputAssetId` et `outputPlayableId` existent,
le playable appartient bien à l’asset de sortie, et `publishedPlayableId` est
`NULL`. L’asset possède quatre playables candidats ; les deux playables de
traitement ne sont pas le playable par défaut. `outputPlayableId` désigne donc
une sortie technique sans ambiguïté, mais rien ne prouve que cette sortie a été
publiée. Restaurer automatiquement `publishedPlayableId` ne serait pas
strictement démontrable et n’est pas effectué.

### Conclusion sur `layerConfiguration.id`

La recherche dans le code réel montre que cet identifiant :

- est validé par `registerIdentifier` ;
- est conservé dans les payloads d’édition auteur ;
- est remappé lors de la duplication d’une activité ;
- fait partie du contrat auteur sauvegardé ;
- ne porte pas l’ordre des couches, qui provient de leur collection ;
- ne possède aucune colonne ni colonne JSON cible dans le schéma 003.

Il ne peut donc être déclaré obsolète ou redondant. Ses deux occurrences sont
désormais `column-mapped` vers `activities.layer_configuration_id`.

## 2. État initial

| Élément | Valeur observée |
|---|---|
| Branche | `main` |
| HEAD | `4ebf1dad5deef8f1a3724e045a88fd4d16efefca` |
| Dernier commit | `feat(proto05): harden MariaDB schema invariants` |
| Suivi distant | `main...origin/main [ahead 13]` |
| `git status --short` | vide |
| Version Proto05 | `0.1.45` |
| Base active | `ic_augmented_video` |
| Tables | 31 |
| Procédures | 43 |
| Clés étrangères | 48 |
| Contraintes `CHECK` | 65 |
| Triggers | 0 |
| Événements | 0 |
| Lignes dans les 31 tables | 0 dans chacune |

Les contrôles MariaDB initiaux ont exclusivement utilisé des lectures
`SELECT` sur la base ciblée et `information_schema`. Aucun secret n’a été
consigné.

## 3. Sources et documentation inspectées

### 3.1 Méthode de détermination de l’autorité

L’autorité n’a pas été déduite du seul nom des fichiers. La recherche est partie
du serveur et des contrats réellement utilisés :

1. localisation des lecteurs et écrivains JSON dans `server/server.js` ;
2. suivi des adaptateurs dans `server/media-library-runtime.js`,
   `server/library-contract.js`, `server/media-contract.js` et
   `server/pedagogical-identity.js` ;
3. comparaison avec les exports du schéma de bibliothèque média ;
4. confrontation aux décisions documentées dans les Missions 097 à 102 ;
5. confrontation au modèle MariaDB des Missions 128 à 131 ;
6. inventaire de tous les JSON Proto05, des sauvegardes, fixtures et références
   partagées ;
7. calcul de la taille, du SHA-256 et des volumes de chaque candidat.

Cette remontée confirme :

- `activities.json` est la source pédagogique ;
- `activity-library.json` porte le classement des activités ;
- `video-library.json` est la bibliothèque média canonique ;
- `video-catalog.json` est une projection de compatibilité et un contrôle de
  cohérence, pas une seconde source d’insertion média ;
- `shared/reference-data/languages.json` est la référence de langues partagée ;
- les `.bak`, la sauvegarde Mission 102 et les fixtures ne sont pas des sources
  métier actives ;
- les travaux, workspaces et caches de traitement actifs ne sont pas des
  sources JSON persistées à migrer.

### 3.2 Code, schémas et rapports

Ont notamment été inspectés :

- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/media-library-runtime.js` ;
- `prototypes/05-augmented-ic-video-01/server/library-contract.js` ;
- `prototypes/05-augmented-ic-video-01/server/media-contract.js` ;
- `prototypes/05-augmented-ic-video-01/server/pedagogical-identity.js` ;
- les exports du schéma de bibliothèque média ;
- `prototypes/05-augmented-ic-video-01/database/drafts/003_proto05_schema_hardening.sql` ;
- la recette SQL 003 ;
- `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md` ;
- les rapports pertinents 097 à 102, 128, 130 et 131 ;
- `docs/WORKSPACE_PROVENANCE.md`, `docs/ARCHITECTURE.md`,
  `PROJECTS_LAUNCH.md` et `STATUS.md`.

## 4. Inventaire exhaustif des JSON candidats

Les SHA-256 ci-dessous portent sur les octets des fichiers avant le dry-run.

| # | Chemin relatif à Proto05, sauf mention | Taille | SHA-256 | Version / volume principal | Rôle et code consommateur | Décision |
|---:|---|---:|---|---|---|---|
| 1 | `data/activities.20260716T205538855Z.before-original-copy-removal.json.bak` | 58 268 | `862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47` | 0.1 / 5 activités | sauvegarde antérieure ; aucun lecteur/écrivain actif | exclue : historique |
| 2 | `data/activities.json` | 29 438 | `95766C6256ACE97A39F63760B2EB530183910113D8DE6DEFF037D0B0F6D3D8C3` | 0.1 / 2 activités | `readActivities` / `persistActivities`, serveur | **incluse, autoritative** |
| 3 | `data/activities.json.bak` | 30 526 | `CB024E557A12BC84BB155955AE5C5270B4464350EC2C42243EA68C66F9FB9976` | 3 activités | sauvegarde produite par `persistActivities` ; aucun lecteur actif | exclue : doublon historique |
| 4 | `data/activities.pre-language-catalog-0.1.12.json.bak` | 59 778 | `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD` | 5 activités | ancien contrat ; aucun lecteur/écrivain actif | exclue : historique |
| 5 | `data/activity-library.json` | 379 | `63CE330896759421397C987CCC685884FFB6E1C93663B68B7D3D6EAD4C1C256A` | 0.1 / 1 dossier | `readActivityLibraryClassification` / `persistActivityLibraryClassification` | **incluse, autoritative pour le classement** |
| 6 | `data/activity-library.json.bak` | 303 | `1426A224FB94FB54273A2AAF489D29036A24A775FA3C7941903F7DFF8451FF65` | 1 dossier | sauvegarde produite par le persisteur ; aucun lecteur actif | exclue |
| 7 | `data/backups/mission-102-video-library-0.1.json` | 152 587 | `361305F679391FB8559C2958880CE9DCB5A0CF238A1C6371A2B3F6583CFD7A9B` | 0.1 / 15 assets, 15 sources, 15 playables | sauvegarde de mission ; aucun lecteur/écrivain actif | exclue : historique |
| 8 | `data/video-catalog.json` | 1 196 | `89A73A4065AB84AE1B676D25FBE62FD17FEB0FB51302997B49999E68B05FE373` | 0.1 / 3 vidéos | `loadVideoCatalog` / `persistVideoCatalog`, projection `activity.video` | **incluse comme contrôle de compatibilité, zéro ligne créée** |
| 9 | `data/video-catalog.json.bak` | 749 | `761410B2B5F1D981DB3996D663F7D6F4B3225E56EA09E8641E297C5E27260172` | 2 vidéos | sauvegarde produite par `persistVideoCatalog` ; aucun lecteur actif | exclue |
| 10 | `data/video-library.json` | 120 344 | `E98C9A4F051F09020E9227A37D60CF532FA446BA684B80BFB8505DBF3519D473` | 1.0 / 16 assets, 19 sources, 19 playables, 2 traitements | `loadVideoLibrary` via `readCanonicalMediaLibrary` / `writeCanonicalVideoLibrary` | **incluse, autoritative** |
| 11 | `data/video-library.json.bak` | 120 344 | `64079311A2FE741F7448D2415F8E74B866F976006F0FB88265F51D545431028A` | mêmes volumes | sauvegarde produite par l’écrivain canonique ; aucun lecteur actif | exclue |
| 12 | `server/package.json` | 363 | `522EA570AC20703B10D66C4290DEA2A0988E91C7A800133971EB136201F1D826` | version 0.1.45 | lu par Node/npm comme configuration ; aucun écrivain applicatif | exclu |
| 13 | `server/test/fixtures/layer-visibility.activity.json` | 4 033 | `533556B24E33D49F746259CA9C072DBE4AEE39DF51ED0F1688E18395E03ECC39` | 1 fixture | lue uniquement par les tests ; aucun écrivain applicatif | exclue |
| 14 | `server/test/fixtures/media-library-canonical.valid.json` | 7 422 | `1593A0498A3F343EC0C2A1EDAEE5425BAC3064CFDE075EC113DB5138E8291511` | fixture média | lue uniquement par les tests ; aucun écrivain applicatif | exclue |
| 15 | `../../shared/reference-data/languages.json` | 253 | `E3034A20260C6F77569966E3CC05618402362822B038CAC4D491BAEE3AFFF355` | 4 langues | `loadLanguageCatalog`, lecture seule ; aucun écrivain Proto05 | **incluse, autoritative partagée** |

Le hash global des cinq sources/contrôles retenus, chemins relatifs et contenus
compris dans un ordre canonique, est :
`a5cacd7540586cffca68415bb50bd9837dfcd4d04e6c4ec3221cf7e1f844eef0`.

Le catalogue de compatibilité participe à cette empreinte, car une divergence
est un signal pertinent, mais ne génère aucune entité média supplémentaire.

## 5. Inventaire sémantique

### 5.1 Volumes sources et destinations

| Catégorie source | Nombre | Destination envisagée | Lignes préparées | Observation |
|---|---:|---|---:|---|
| Langues de référence | 4 | `languages` | 4 | identifiants normalisés en code majuscule |
| Dossiers d’activités | 1 | `activity_folders` | 1 | ordre conservé |
| Dossiers média | 1 | `media_folders` | 1 | hiérarchie conservée |
| Tags média | 3 | `media_tags` | 3 | identifiants conservés |
| Assets | 16 | `media_assets` | 16 | 6 racines relationnelles, 10 dérivés |
| Sources média | 19 | `media_sources` | 19 | origine/provenance complète conservée |
| Playables | 19 | `media_playables` | 19 | local, HLS, YouTube |
| Métadonnées de playable | 19 | `media_playable_metadata` | 19 | compléments JSON conservés |
| Relations asset–tag | 3 | `media_asset_tags` | 3 | couples uniques |
| Traitements | 2 | `media_treatments` | 2 | terminés avec sortie réelle, publication facultative |
| Activités | 2 | `activities` | 2 | toutes deux `draft` |
| Identités pédagogiques | 1 | `activity_pedagogical_identities` | 1 | une activité sans identité |
| Textes pédagogiques | 9 | `activity_pedagogical_text_fields` | 9 | champs structurés |
| Qualifications pédagogiques | 0 | `activity_pedagogical_qualifications` | 0 | collection vide |
| Langues d’activité | 6 | `activity_languages` | 6 | 4 + 2 |
| Transcriptions | 2 | `activity_transcriptions` | 2 | une par activité |
| Locuteurs | 5 | `activity_speakers` | 5 | seconde activité vide |
| Segments | 11 | `activity_segments` | 11 | seconde activité vide |
| Relations segment–locuteur | 13 | `activity_segment_speakers` | 13 | couples dédupliqués |
| Relations segment–langue | 22 | `activity_segment_languages` | 22 | couples dédupliqués |
| Intervalles linguistiques | 26 | `activity_language_intervals` | 26 | 22 + 4, dont 4 sans segment |
| Couches | 7 | `activity_layers` | 7 | seconde activité vide |
| Visibilités de couche | 14 | `activity_layer_visibility` | 14 | couples uniques |
| Phénomènes | 26 | `activity_phenomena` | 26 | ordre conservé |
| Annotations | 11 | `activity_annotations` | 11 | auteur-only conservé |
| Overlays | 6 | `activity_overlays` | 6 | ordre conservé |
| Relations overlay–couche | 14 | `activity_overlay_layers` | 14 | couples uniques |
| Médias principaux | 2 | `activity_media_links` | 2 | playables canoniques résolus |
| Médias supplémentaires | 0 | `activity_media_links` | 0 | absence explicite |
| Opérations de stockage | 0 | `storage_operations` | 0 | aucune source persistée |
| Imports historiques | 0 | `import_runs` | 0 | réservé à la future migration |

### 5.2 Bibliothèque média

- 16 assets, 19 sources, 19 playables, 2 traitements terminés, 1 dossier et
  3 tags.
- 15 playables locaux : 5 fichiers sont présents et 10 sont absents.
- Le JSON en marque déjà 3 `missing-local`. Sept autres sont déclarés
  disponibles alors que leur fichier n’existe pas ; la représentation proposée
  les normalise en `missing-local` avec raison `missing-file`.
- Cette normalisation est informative et non bloquante. Elle suit l’instruction
  de David selon laquelle les anciennes données de développement et vidéos
  indisponibles sont normales ; aucune recherche de responsabilité n’a été
  menée.
- Les anciens JSON auto-déclarent les 16 assets comme racines. Dix assets
  anonymisés portent cependant
  `provenance.historical.sourceAssetId=media-proto05-video-proto05-uga-37004`.
  Le modèle proposé forme donc 6 racines et 10 dérivés.
- Ce rapprochement est traçable mais reste à valider comme lien de parenté
  immédiate : le champ historique prouve une origine, pas nécessairement le
  parent immédiat.
- Un framerate chaîne `60/1` devient le nombre `60`; la valeur brute reste dans
  la provenance JSON.
- Le scope local absent devient `legacy-media`; un workspace explicite reste
  inchangé.
- Pour YouTube, l’identifiant vidéo devient `embed_video_id`; pour HLS, le
  manifeste et l’URL sont conservés dans les colonnes prévues.
- Les deux traitements `completed` ont `publishedPlayableId: null`. Après
  Mission 133, ce cas est valide si `outputAssetId`, `outputPlayableId` et
  `finishedAt` sont présents et cohérents.

### 5.3 Activités pédagogiques

- Deux activités `draft`.
- Première activité : 4 langues, 5 locuteurs, 11 segments, 22 intervalles,
  7 couches, 26 phénomènes, 11 annotations, 6 overlays et une identité
  pédagogique.
- Seconde activité : 2 langues, aucun locuteur ni segment, 4 intervalles, aucune
  couche, aucun phénomène, aucune annotation, aucun overlay, aucune identité
  pédagogique.
- Les quatre intervalles de cette seconde activité n’ont pas de `segmentId`.
  Mission 133 autorise désormais `segment_id = NULL`, sans retirer la FK qui
  contrôle toute valeur non nulle.
- Deux intervalles de la seconde activité sont sémantiquement identiques. Ils
  sont tous deux conservés, car leurs identifiants sont distincts et aucune
  règle métier n’autorise leur suppression.
- Les activités contiennent l’ancienne projection `activity.video`; leur
  playable est résolu depuis la bibliothèque canonique. Pour la seconde
  activité, le snapshot évoque HLS/proxy alors que le playable canonique est
  YouTube : la source canonique prévaut et la divergence est signalée.
- Aucun média supplémentaire.
- Les dates d’activité étant absentes, `created_at` et `updated_at` reçoivent
  provisoirement le `updatedAt` du document. Cette valeur par défaut est
  déterministe et signalée.
- Les annotations auteur-only restent dans `activity_annotations`. Leur présence
  en base ne signifie pas qu’elles seront exposées par la procédure étudiante.
- `layerConfiguration.id` est conservé dans
  `activities.layer_configuration_id` : un chemin, deux occurrences.

## 6. Cartographie JSON vers MariaDB

Les lignes suivantes synthétisent les familles de mapping. L’Annexe A fournit
séparément les 435 chemins réellement observés, sans échantillonnage. `JSON`
désigne une conservation dans une colonne de provenance ou d’extensions
structurées en plus des colonnes normalisées.

| Chemin JSON | Sens | Cible | Transformation / absence / validation | Conservation et certitude |
|---|---|---|---|---|
| `languages[].id` | code de langue partagé | `languages.id`, `code` | majuscules ; requis ; unique | normalisé sans perte, certain |
| `languages[].label` | libellé | `languages.label` | requis, non vide | exact, certain |
| `activity-library.folders[].id` | dossier activité | `activity_folders.id` | identifiant conservé | exact, certain |
| `activity-library.folders[].name` | nom dossier | `activity_folders.name` | non vide | exact, certain |
| `activity-library.folders[].activityIds[]` | classement | `activities.folder_id` | résolution vers activité ; FK | relation normalisée, certain |
| `video-library.folders[].id` | dossier média | `media_folders.id` | conservé | exact, certain |
| `video-library.folders[].parentFolderId` | parent dossier | `media_folders.parent_folder_id` | absent → `NULL`; cycle interdit | exact, certain |
| `video-library.tags[].id/name` | tag | `media_tags.id/name` | valeurs réellement produites | exact, certain |
| `video-library.tags[].color` | couleur éventuelle | `media_tags.color` | aucune occurrence actuelle ; valeur future conciliée dans la colonne dédiée | exact, certain |
| `assets[].id` | identité média | `media_assets.id` | aucune conversion | exact, certain |
| `assets[].title` | titre média | `media_assets.title` | requis | exact, certain |
| `assets[].description` | description éventuelle | `media_assets.description` | aucune occurrence actuelle ; présence, `NULL` et chaîne vide distingués | exact, certain |
| `assets[].folderId` | classement média | `media_assets.folder_id` | absent → `NULL`; FK | exact, certain |
| `assets[].tagIds[]` | tags | `media_asset_tags` | tri et déduplication des couples | relation sans perte, certain |
| `assets[].defaultPlayableId` | playable par défaut | `media_assets.default_playable_id` | `NULL` à l’insertion, mise à jour différée après playables | exact, certain |
| `assets[].provenance.historical.sourceAssetId` | origine ancienne | `media_assets.parent_asset_id`, `family_root_asset_id`, `provenance_json` | parent proposé ; origine brute conservée | normalisé, **à valider** |
| racine d’asset historique | famille média | `media_assets.family_root_asset_id` | racine → son propre id ; dérivé → id de racine | reconstruction déterministe, à valider pour 10 parents |
| `assets[].createdAt/updatedAt` | dates asset | `media_assets.created_at/updated_at` | ISO attendu ; requis | exact, certain |
| `sources[].id` | identité source | `media_sources.id` | conservé | exact, certain |
| `sources[].assetId` | propriétaire source | `media_sources.asset_id` | FK obligatoire | exact, certain |
| `sources[].kind` | type de source | `media_sources.kind` | validation enum | exact, certain |
| `sources[].origin` | origine détaillée | colonnes `media_sources` + `origin_json` | champs connus normalisés, objet complet conservé | exact + JSON, certain |
| `sources[].provenance` | traçabilité | `media_sources.provenance_json` | absent → `NULL` | exact JSON, certain |
| `playables[].id` | identité playable | `media_playables.id` | conservé | exact, certain |
| `playables[].assetId/sourceId` | propriétaires | `media_playables.asset_id/source_id` | double cohérence asset–source vérifiée | exact, certain |
| `playables[].kind` | type local/HLS/distant | `media_playables.kind` | enum normalisée | exact, certain |
| `playables[].availability` | disponibilité | `media_playables.availability` | fichier local absent → `missing-local` | normalisation factuelle |
| `playables[].availabilityReason` | raison | `media_playables.availability_reason` | `missing-file` ajouté pour les 7 absences constatées | valeur proposée non métier |
| `playables[].location.storageKey` | chemin ou clé locale | `media_playables.storage_key`, `storage_scope` | clé relative validée ; scope absent → `legacy-media` | normalisé sans prétendre disponible |
| `playables[].location.manifestUrl` | HLS | `media_playables.location_url` | URL HLS valide obligatoire selon type | exact, certain |
| `playables[].location.url` | distant | `media_playables.location_url` | URL valide selon type | exact, certain |
| `playables[].location.videoId` | YouTube | `media_playables.embed_video_id` | identifiant extrait/conservé | normalisé, certain |
| `playables[].durationSeconds` | durée | `duration_ms` | secondes décimales × 1000, arrondi entier contrôlé | normalisé sans perte utile |
| `playables[].frameRate="60/1"` | fréquence | `frame_rate` | fraction évaluée à `60` | brut conservé en JSON |
| propriétés techniques du playable | détails techniques | colonnes dédiées de `media_playable_metadata` | conciliation champ par champ | exact ou transformation déclarée |
| `technicalMetadata.fileName` | nom de fichier technique | `media_playables.provenance_json._migration.technicalMetadataExtras.fileName` | propriété JSON réellement produite | exact JSON |
| `treatments[].id` | identité traitement | `media_treatments.id` | conservé | exact, certain |
| `treatments[].inputAssetId` | entrée | `media_treatments.input_asset_id` | FK obligatoire | exact, certain |
| `treatments[].outputAssetId` | résultat | `media_treatments.output_asset_id` | FK et lignée contrôlées | exact, certain |
| `treatments[].status` | cycle de vie | `media_treatments.status` | enum ; `completed` impose une sortie réelle et une date de fin | exact, certain |
| `treatments[].publishedPlayableId` | sortie publiée | `media_treatments.published_playable_id` | `NULL` autorisé ; si renseigné, doit appartenir à l’asset de sortie | exact, certain |
| `activities[].id` | identité activité | `activities.id` | conservé | exact, certain |
| `activities[].title` | titre | `activities.title` | requis | exact, certain |
| `activities[].status` | publication | `activities.status` | enum ; deux `draft` | exact, certain |
| `activities[].createdAt/updatedAt` | dates | `activities.created_at/updated_at` | absentes → `document.updatedAt` | défaut déterministe à valider |
| activité possédant `pedagogicalIdentity` | propriétaire de l’identité | `activity_pedagogical_identities.activity_id` | clé issue de `activities[].id`; l’objet source n’a pas d’id propre | relation certaine |
| `pedagogicalIdentity.rootId/parentId` | filiation pédagogique | `root_identity_id/parent_identity_id` | racine avant descendants ; `NULL` explicite | exact, certain |
| champs texte d’identité | contenu pédagogique | `activity_pedagogical_text_fields` | une ligne par clé/valeur ordonnée | normalisé, certain |
| qualifications d’identité | qualifications | `activity_pedagogical_qualifications` | tableau vide → zéro ligne | exact, certain |
| `activities[].languages[]` | langues de travail | `activity_languages` | id déterministe activité+position ; FK vers `languages` | normalisé, certain |
| `activities[].transcription` | transcription | `activity_transcriptions` | id déterministe depuis activité | exact + JSON |
| `activities[].speakers[].id` | locuteur | `activity_speakers.id` | namespace activité préservé par clé composite | exact, certain |
| `activities[].segments[].id` | segment | `activity_segments.id` | namespace activité préservé par clé composite | exact, certain |
| `segments[].start/end` | bornes | `start_ms/end_ms` | secondes décimales × 1000 ; ordre et durée vérifiés | normalisé, certain |
| `segments[].speakerIds[]` | locuteurs du segment | `activity_segment_speakers` | couples triés/dédupliqués, FK | exact, certain |
| `segments[].languageIds[]` | langues du segment | `activity_segment_languages` | couples triés/dédupliqués, FK | exact, certain |
| `languageIntervals[].id` | intervalle | `activity_language_intervals.id` | conservé dans le namespace activité | exact |
| `languageIntervals[].segmentId` | segment propriétaire | `activity_language_intervals.segment_id` | absent reste `NULL`; toute valeur renseignée reste contrôlée par FK | exact, certain |
| `languageIntervals[].start/end` | bornes linguistiques | `start_ms/end_ms` | secondes × 1000 ; bornes contrôlées | normalisé |
| `layers[].id/type/order` | couche | `activity_layers.*` | ordre de tableau explicité si nécessaire | normalisé, certain |
| `layerVisibility` | visibilité par couche/état | `activity_layer_visibility` | couples uniques | exact, certain |
| `phenomena[].id/layerId` | phénomène | `activity_phenomena.*` | FK couche, position conservée | exact, certain |
| `annotations[].id` et contenu | annotation auteur | `activity_annotations.*` | contenu privé conservé ; exposition étudiante hors de ce dry-run | exact, certain |
| `overlays[].id/order` | overlay | `activity_overlays.*` | ordre explicite | exact, certain |
| `overlays[].layerIds[]` | composition | `activity_overlay_layers` | couples uniques, ordre conservé | exact, certain |
| `activity.video.playableId` | média principal historique | `activity_media_links.playable_id` | résolution dans la bibliothèque canonique | normalisé, certain |
| snapshot `activity.video` | projection de compatibilité | validation seulement | divergence old/new signalée ; le playable canonique prévaut ; aucune seconde insertion | avertissement justifié |
| médias supplémentaires | médias ordonnés | `activity_media_links(role, position)` | aucun actuellement ; position serait explicite | contrat certain |
| `layerConfiguration.id` | identité stable de configuration | `activities.layer_configuration_id` | 2 occurrences ; valeur conservée par la projection auteur | exact, certain |

### 6.1 Provenance des colonnes obligatoires

Les colonnes obligatoires destinées à recevoir des données ont une provenance :

- les clés métier proviennent des identifiants JSON, ou de clés composites
  déterministes lorsque le schéma sépare une collection imbriquée ;
- les clés de propriétaire proviennent du parent JSON et sont vérifiées comme FK
  logique ;
- les positions proviennent d’un champ d’ordre lorsqu’il existe, sinon de
  l’indice stable du tableau source ;
- les timestamps média proviennent des timestamps source ;
- les timestamps d’activité absents proviennent provisoirement du timestamp du
  document, avec avertissement ;
- les colonnes de cycle de vie proviennent des statuts JSON et sont validées
  contre les enums du schéma ;
- `created_at`/`updated_at` gérés nativement par MariaDB pour les futures lignes
  d’audit ne sont pas inventés par le dry-run ;
- `schema_migrations` et `import_runs` reçoivent zéro ligne du JSON. Une future
  migration réelle devra créer une ligne d’audit `import_runs` à partir de son
  propre contexte transactionnel, pas prétendre qu’elle vient des données
  métier.

Après Mission 133, aucune colonne obligatoire ne manque de provenance. Les
quatre intervalles sans segment utilisent le `NULL` autorisé et les deux
traitements terminés satisfont le contrat de sortie sans publication inventée.

### 6.2 Identifiants, `NULL`, inconnus et compatibilité

- Aucun identifiant métier existant n’est remplacé par un UUID aléatoire.
- Les identifiants de lignes dérivées sont produits depuis les identifiants
  parents et l’ordre canonique ; ils sont stables entre exécutions.
- Une propriété absente n’est pas confondue avec une chaîne vide. Elle devient
  `NULL` uniquement quand le schéma l’autorise.
- Une collection absente ou vide produit zéro ligne, et non une ligne factice.
- Les champs techniques complémentaires sont conservés en JSON de provenance ou
  de métadonnées.
- Les champs de la projection de compatibilité servent au contrôle, mais ne
  doublonnent pas les données canoniques.
- Aucun chemin observé ne reste sans cible. `layerConfiguration.id` est
  explicitement concilié avec `activities.layer_configuration_id`.

## 7. Modèle intermédiaire et ordre d’insertion

Chaque descripteur de table conserve :

- le nom de table ;
- les lignes triées canoniquement ;
- la clé primaire ;
- les clés candidates pertinentes ;
- les clés étrangères et leur cible ;
- la provenance source ;
- l’ordre logique ;
- les avertissements associés.

### 7.1 Futures lignes par table

| Ordre logique | Table | Lignes |
|---:|---|---:|
| audit | `schema_migrations` | 0 |
| audit | `import_runs` | 0 |
| 1 | `languages` | 4 |
| 1 | `activity_folders` | 1 |
| 1 | `media_folders` | 1 |
| 1 | `media_tags` | 3 |
| 2 | `activities` | 2 |
| 3 | `media_assets` | 16 |
| 4 | `media_sources` | 19 |
| 5 | `media_playables` | 19 |
| 7 | `media_playable_metadata` | 19 |
| 7 | `media_asset_tags` | 3 |
| 7 | `media_treatments` | 2 |
| 8 | `activity_pedagogical_identities` | 1 |
| 9 | `activity_pedagogical_text_fields` | 9 |
| 9 | `activity_pedagogical_qualifications` | 0 |
| 10 | `activity_languages` | 6 |
| 10 | `activity_transcriptions` | 2 |
| 10 | `activity_speakers` | 5 |
| 10 | `activity_segments` | 11 |
| 11 | `activity_segment_speakers` | 13 |
| 11 | `activity_segment_languages` | 22 |
| 11 | `activity_language_intervals` | 26 |
| 12 | `activity_layers` | 7 |
| 12 | `activity_layer_visibility` | 14 |
| 12 | `activity_phenomena` | 26 |
| 13 | `activity_annotations` | 11 |
| 13 | `activity_overlays` | 6 |
| 13 | `activity_overlay_layers` | 14 |
| 14 | `activity_media_links` | 2 |
| 15 | `storage_operations` | 0 |
| **Total** | **31 tables, 27 non vides** | **264** |

### 7.2 Séquence future compatible avec les FK

1. références, dossiers et tags ;
2. activités ;
3. racines d’assets, puis descendants, avec
   `default_playable_id = NULL` ;
4. sources ;
5. playables ;
6. affectation différée des `default_playable_id` aux assets ;
7. métadonnées, tags d’assets et traitements ;
8. racines d’identités pédagogiques, puis variantes ;
9. détails d’identité pédagogique ;
10. langues, transcriptions, locuteurs et segments d’activité ;
11. jonctions de segments et intervalles ;
12. couches, visibilités et phénomènes ;
13. annotations, overlays et leurs couches ;
14. liens média principal puis suppléments ordonnés ;
15. opérations de stockage seulement si une source explicite existe ;
16. ligne d’audit `import_runs` de la future migration.

La relation circulaire contrôlée entre asset et playable est résolue par
l’insertion nullable du playable par défaut, puis son affectation après
l’insertion des playables. Les FK restent actives en permanence. Aucun
`SET FOREIGN_KEY_CHECKS = 0` n’est nécessaire ni prévu.

## 8. Invariants et niveau de preuve

### 8.1 Reproduits automatiquement en mémoire

- unicité des clés primaires ;
- unicité des clés candidates décrites ;
- résolution des FK logiques ;
- appartenance source–asset–playable ;
- appartenance d’un parent média à sa racine ;
- absence d’auto-parenté et de cycle ;
- résolution du média principal ;
- position et unicité des liens média ;
- validité structurelle des locators selon le type ;
- enums connues ;
- colonnes obligatoires modélisées ;
- règles conditionnelles principales, dont le traitement terminé ;
- bornes et ordres temporels ;
- positions non négatives et cohérentes ;
- absence de doublons dans les jonctions ;
- conservation des volumes ;
- inventaire des chemins de champs et absence de perte silencieuse ;
- présence physique des fichiers locaux référencés.

### 8.2 Vérifiés statiquement contre le schéma 003

- présence des 31 définitions de table ;
- présence des 43 procédures attendues dans le fichier 003 ;
- noms de tables et colonnes utilisés par le modèle ;
- nullabilité et enums utilisées pour les diagnostics ;
- cycle FK asset–playable et stratégie d’affectation différée ;
- règles de lignée et contraintes conditionnelles couvertes par le schéma.

### 8.3 Réservés à la migration transactionnelle réelle

Le dry-run ne prétend pas reproduire le moteur MariaDB. Restent à prouver dans
une mission future autorisée :

- acceptation effective de chaque ligne par le moteur, ses collations, types et
  contraintes complètes ;
- comportement transactionnel réel et rollback atomique ;
- niveaux d’isolation et concurrence ;
- cohérence des procédures de lecture après insertion ;
- reconstruction exacte du bundle étudiant depuis les procédures ;
- visibilité auteur/étudiant en exécution ;
- performance et taille effective des index ;
- droits du compte d’écriture futur.

## 9. Contrôles de conservation

| Élément | Source | Préparé | Classement |
|---|---:|---:|---|
| Assets | 16 | 16 | conservation exacte |
| Sources | 19 | 19 | conservation exacte |
| Playables | 19 | 19 | conservation exacte |
| Traitements | 2 | 2 | conservés et valides sans publication inventée |
| Activités | 2 | 2 | conservation exacte |
| Médias principaux | 2 | 2 | résolution canonique |
| Médias supplémentaires | 0 | 0 | conservation exacte |
| Segments | 11 | 11 | conservation exacte |
| Langues d’activité | 6 | 6 | conservation exacte |
| Locuteurs | 5 | 5 | conservation exacte |
| Intervalles | 26 | 26 | conservés, dont 4 avec `segment_id = NULL` |
| Phénomènes | 26 | 26 | conservation exacte |
| Annotations | 11 | 11 | conservation exacte |
| Couches | 7 | 7 | conservation exacte |
| Overlays | 6 | 6 | conservation exacte |
| Asset–tag | 3 | 3 | couples uniques |
| Segment–locuteur | 13 | 13 | couples uniques |
| Segment–langue | 22 | 22 | couples uniques |
| Visibilité de couche | 14 | 14 | couples uniques |
| Overlay–couche | 14 | 14 | couples uniques |
| Racines/familles média auto-déclarées | 16 | 6 racines + 10 dérivés | normalisation de lignée, à valider |
| `missing-local` déclaré | 3 | 10 | 7 corrections factuelles liées aux fichiers absents |
| Champs sans cible | 0 | 0 | toutes les occurrences ont une destination ou un contrôle explicite |
| Champs entièrement non inventoriés | 0 | 0 | aucune perte silencieuse |

Une activité source non vide est théoriquement reconstructible avec son
identité, sa filiation, son média principal, ses segments, langues, locuteurs,
intervalles, phénomènes, annotations, couches et overlays. Cette affirmation
porte sur la complétude du modèle intermédiaire ; elle ne vaut pas validation
des procédures MariaDB, qui n’ont pas été appelées.

## 10. Anomalies et avertissements

| Niveau | Code | Nombre | Constat | Traitement du dry-run |
|---|---|---:|---|---|
| avertissement | `ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE` | 2 | `video.kind` et `video.proxyUrl` historiques divergent du playable canonique pour une activité | valeurs old/new exposées ; projection canonique utilisée |
| avertissement | `ACTIVITY_TIMESTAMP_FALLBACK` | 2 | dates d’activité absentes | timestamp du document proposé |
| avertissement | `AVAILABLE_LOCAL_FILE_MISSING` | 7 | fichier absent malgré statut disponible | `missing-local`/`missing-file` proposé |
| avertissement | `MEDIA_LINEAGE_RECONSTRUCTED` | 10 | lignée déduite du champ historique | parent proposé et provenance brute conservée |
| avertissement | `SEMANTIC_INTERVAL_DUPLICATE` | 1 | deux intervalles sémantiquement identiques | les deux restent présents |

Il n’existe aucune FK logique orpheline. Les quatre intervalles sans segment
restent explicitement non segmentés et ne constituent plus des erreurs.

## 11. Validation du script

### 11.1 Contrôles statiques et négatifs

| Contrôle | Résultat |
|---|---|
| Syntaxe Node (`node --check`) | réussi |
| Aucun module npm ajouté | confirmé |
| Aucun pilote MariaDB dans le script | confirmé |
| Aucun appel d’écriture fichier | confirmé |
| Aucun mode d’écriture caché | confirmé |
| Aucun identifiant aléatoire | confirmé |
| Motifs SQL dangereux dans le script | aucun |
| Source absente | détectée, code non nul |
| JSON invalide | détecté, code non nul |
| Identifiant dupliqué | détecté |
| FK logique orpheline | détectée |
| Cycle | détecté |
| Locator invalide | détecté |
| Champ obligatoire absent | détecté |
| Enum inconnue | détectée |
| Champ métier inconnu | `unmapped-blocking`, détecté |
| Couleur de tag future dans `media_tags.color` | conciliée |
| Description d’asset future dans `media_assets.description` | conciliée |
| Identité future de configuration dans `activities.layer_configuration_id` | conciliée |
| Traitement terminé sans sortie réelle | rejeté |
| Traitement terminé avec sortie et publication absente | accepté |
| Segment d’intervalle inconnu non nul | rejeté |
| Snapshot vidéo historique divergent | avertissement old/new ; canonique prioritaire |
| Valeur `column-mapped` altérée | échec de conciliation détecté |
| Valeur `json-preserved` retirée | échec de restitution détecté |
| Relation redondante incohérente | divergence détectée |
| Catalogue compatible par l’id mais faux par la valeur | divergence détectée |
| Absence / `NULL` / chaîne vide / tableau vide / zéro | cinq états distingués |
| Auto-tests initiaux, de couverture et de valeurs futures | **22/22 réussis** |

Les tests négatifs utilisent des objets en mémoire ou un chemin source
inexistant. Aucun JSON réel n’a été altéré et aucune fixture persistante n’a
été créée.

### 11.2 Deux exécutions réelles

| Exécution | Répertoire de lancement | Code | Tables non vides | Lignes | Bloquants | Avertissements | Hash |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | racine du workspace | 0 | 27 | 264 | 0 | 22 | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |
| 2 | dossier Proto05 | 0 | 27 | 264 | 0 | 22 | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |

La durée interne est affichable mais exclue du hash, tout comme l’heure, les
chemins absolus, l’environnement et toute valeur aléatoire.

Les deux exécutions terminent avec un code nul parce que les écarts de contrat
ont été fermés. Les auto-tests négatifs prouvent séparément que les erreurs
réelles restent bloquantes.

## 12. Idempotence et stratégie proposée pour la future migration

L’idempotence ne devrait pas signifier « rejouer silencieusement des upserts ».
Pour une première migration canonique, la stratégie recommandée est :

1. reprendre les mêmes sources autoritatives et vérifier leur hash global ;
2. recalculer le modèle intermédiaire et comparer son hash au dry-run autorisé ;
3. refuser l’exécution si une table métier cible n’est pas vide ;
4. ouvrir une transaction globale ;
5. insérer dans l’ordre décrit, racines avant descendants ;
6. affecter les playables par défaut après l’insertion des playables, FK actives ;
7. vérifier les comptes, FK et contraintes dans la transaction ;
8. inscrire une ligne `import_runs` avec le hash des sources, le hash du modèle,
   les volumes et le statut ;
9. valider seulement si toutes les preuves sont conformes ;
10. sinon annuler l’intégralité de la transaction.

Une reprise doit comparer l’empreinte de migration. Une empreinte déjà réussie
doit provoquer un arrêt explicite ou une réponse « déjà appliquée », jamais une
seconde insertion. Une empreinte différente doit être refusée jusqu’à nouvelle
autorisation.

En cas d’échec futur, le premier mécanisme de nettoyage est le rollback de la
transaction globale. Il ne faut ni désactiver les FK ni effectuer de nettoyage
partiel automatique. Les JSON, restés inchangés, demeurent la source de reprise.
`schema_migrations` ne doit pas recevoir une pseudo-version issue du JSON ; son
usage devra être défini avec le mécanisme d’installation du schéma.

## 13. Décisions de contrat fermées par Mission 133

| Ancienne décision | Décision Mission 133 |
|---|---|
| 4 intervalles sans segment | `segment_id` nullable ; FK conservée pour toute valeur renseignée |
| 2 traitements terminés sans playable publié | sortie réelle obligatoire ; publication facultative et cohérente si présente |
| `layerConfiguration.id` | colonne nullable `activities.layer_configuration_id` |
| projection vidéo historique divergente | playable canonique prioritaire ; avertissement old/new explicite |

La parenté des dix anonymisations, les dates de repli et la propriété
opérationnelle du référentiel de langues restent des limites non bloquantes
d’une future migration de données.

La normalisation des sept anciens fichiers indisponibles n’appelle pas
d’enquête. Elle est non bloquante conformément à l’instruction explicite de
David.

## 14. MariaDB et immutabilité des données

### 14.1 Lectures effectuées

Lors de la Mission 132 initiale, les observations avaient été obtenues
exclusivement avec des requêtes de lecture :

- base active `ic_augmented_video` ;
- 31 tables ;
- 43 procédures ;
- 48 FK ;
- 65 contraintes `CHECK` ;
- 0 trigger ;
- 0 événement ;
- `COUNT(*) = 0` pour chacune des 31 tables.

Des témoins en lecture sur les autres bases ont été relevés sans les modifier :

- `ic_dico` : 8 tables de base et 9 procédures ;
- `ic_hub` : 15 tables de base, 1 vue et 3 procédures.

Aucune écriture MariaDB n’avait été exécutée en Mission 132. Mission 133 a
ensuite appliqué la migration de schéma autorisée et une recette transactionnelle
réversible sur `ic_augmented_video`; la base reste vide. Voir le rapport 133.

### 14.2 Fichiers et services inchangés

- Les quinze fichiers JSON candidats ont le même SHA-256 avant et après les
  contrôles.
- Aucun JSON n’a été écrit.
- Le serveur Node applicatif et Proto05 n’ont pas été lancés.
- Docker n’a pas été modifié ni relancé.
- Chromium et FFmpeg n’ont pas été lancés.
- IC-Hub et Dico-IC n’ont reçu aucune écriture.
- En Mission 132, le schéma SQL, les recettes, Node applicatif, `package.json`,
  le lockfile et la version 0.1.45 étaient inchangés. Mission 133 modifie le
  schéma, sa recette et le validateur ciblé ; la version reste 0.1.45.

## 15. Limites

- Le dry-run est un validateur JavaScript, pas une exécution du moteur MariaDB.
- Aucune ligne n’ayant été insérée, les procédures de lecture auteur/étudiant
  n’ont pas été appelées sur ces données.
- L’absence physique d’un fichier est établie localement ; son histoire et sa
  responsabilité ne sont ni recherchées ni nécessaires.
- La parenté immédiate des dix résultats anonymisés ne peut pas être prouvée par
  `sourceAssetId` seul.
- Les dates proposées pour les activités sont des valeurs de repli, pas des
  faits métier établis.
- La propriété opérationnelle du référentiel de langues partagé doit être
  confirmée avant écriture.
- Aucune validation fonctionnelle humaine de David n’a encore eu lieu.
- Aucune recette visuelle n’était pertinente ni autorisée pour ce script.

## 16. Livrables et état final

Fichiers créés, et uniquement ceux-ci :

- `prototypes/05-augmented-ic-video-01/database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` ;
- `reports/132_proto05_json_to_mariadb_migration_audit_and_dry_run.md`.

État Git final observé après contrôles :

- branche `main`, HEAD inchangé
  `4ebf1dad5deef8f1a3724e045a88fd4d16efefca` ;
- deux nouveaux livrables non suivis ;
- aucun fichier existant modifié ;
- `git diff --check` réussi ;
- aucun commit et aucun push.

Message de commit proposé, sans l’exécuter :

```text
fix(proto05): prove JSON migration field coverage
```

## 17. Conclusion

La Mission 132 corrigée et alignée par Mission 133 produit un audit traçable et
un dry-run déterministe sans écriture de données. Les 435 chemins et
3 222 occurrences sont tous confrontés à une règle exacte et tous conciliés.
Aucune occurrence n’est déclarée couverte sur la seule foi de son fichier ou de
son préfixe. Le modèle contient toujours 264 futures lignes dans 27 tables.

Le dry-run est désormais valide avec zéro blocage et 22 avertissements. Il ne
constitue toutefois ni l’autorisation ni l’exécution d’une migration réelle des
JSON : celle-ci reste une mission distincte.

## Annexe A — Couverture exhaustive des chemins observés

Ce tableau est généré par le même registre et le même conciliateur que le
dry-run. « Vides » additionne chaînes, tableaux et objets vides ; l’absence
de propriété chez certains propriétaires est comptée séparément.

| Source | Chemin normalisé | Statut | Occ. | Non-NULL | NULL | Vides | Propriétaires absents | Destination ou contrôle | Conciliées | Écarts |
|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| activities | `activities[].description` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activities.description | 2 | 0 |
| activities | `activities[].id` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activities.id | 2 | 0 |
| activities | `activities[].instruction` | `column-mapped` | 2 | 2 | 0 | 2 | 0 | activities.instruction | 2 | 0 |
| activities | `activities[].languageIntervals[].endMs` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_language_intervals.end_ms | 26 | 0 |
| activities | `activities[].languageIntervals[].id` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_language_intervals.id | 26 | 0 |
| activities | `activities[].languageIntervals[].languageId` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_language_intervals.language_id | 26 | 0 |
| activities | `activities[].languageIntervals[].segmentId` | `column-mapped` | 22 | 22 | 0 | 0 | 4 | activity_language_intervals.segment_id | 22 | 0 |
| activities | `activities[].languageIntervals[].startMs` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_language_intervals.start_ms | 26 | 0 |
| activities | `activities[].languages[].code` | `validation-only` | 6 | 6 | 0 | 0 | 0 | validation:activity-language-code | 6 | 0 |
| activities | `activities[].languages[].id` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_languages.language_id | 6 | 0 |
| activities | `activities[].languages[].label` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_languages.local_label | 6 | 0 |
| activities | `activities[].layerConfiguration.allowLearnerToggle` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activities.allow_learner_toggle | 2 | 0 |
| activities | `activities[].layerConfiguration.defaultVisibleLayerIds[]` | `validation-only` | 8 | 8 | 0 | 1 | 0 | validation:layer-visibility-projection | 8 | 0 |
| activities | `activities[].layerConfiguration.id` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activities.layer_configuration_id | 2 | 0 |
| activities | `activities[].layerConfiguration.learnerVisibleLayerIds[]` | `validation-only` | 8 | 8 | 0 | 1 | 0 | validation:layer-visibility-projection | 8 | 0 |
| activities | `activities[].layerConfiguration.teacherVisibleLayerIds[]` | `validation-only` | 8 | 8 | 0 | 1 | 0 | validation:layer-visibility-projection | 8 | 0 |
| activities | `activities[].layers[]` | `validation-only` | 1 | 1 | 0 | 1 | 1 | validation:empty-activity-collection | 1 | 0 |
| activities | `activities[].layers[].color` | `column-mapped` | 7 | 7 | 0 | 0 | 0 | activity_layers.color | 7 | 0 |
| activities | `activities[].layers[].description` | `column-mapped` | 7 | 7 | 0 | 7 | 0 | activity_layers.description | 7 | 0 |
| activities | `activities[].layers[].id` | `column-mapped` | 7 | 7 | 0 | 0 | 0 | activity_layers.id | 7 | 0 |
| activities | `activities[].layers[].label` | `column-mapped` | 7 | 7 | 0 | 0 | 0 | activity_layers.label | 7 | 0 |
| activities | `activities[].overlays[]` | `validation-only` | 1 | 1 | 0 | 1 | 1 | validation:empty-activity-collection | 1 | 0 |
| activities | `activities[].overlays[].annotationId` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_overlays.annotation_id | 6 | 0 |
| activities | `activities[].overlays[].endMs` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_overlays.end_ms | 6 | 0 |
| activities | `activities[].overlays[].id` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_overlays.id | 6 | 0 |
| activities | `activities[].overlays[].layerIds[]` | `column-mapped` | 14 | 14 | 0 | 0 | 0 | activity_overlay_layers.layer_id | 14 | 0 |
| activities | `activities[].overlays[].startMs` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_overlays.start_ms | 6 | 0 |
| activities | `activities[].overlays[].text` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_overlays.text | 6 | 0 |
| activities | `activities[].overlays[].title` | `column-mapped` | 6 | 6 | 0 | 0 | 0 | activity_overlays.title | 6 | 0 |
| activities | `activities[].pedagogicalIdentity.adaptableElements.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.audience.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.audience_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.audience.value` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.audience_value | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.designStatus` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.design_status | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.indicativeDuration.minutes` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.duration_minutes | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.indicativeDuration.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.duration_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.intention.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.intention_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.intention.value` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.intention_value | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.learningObjectives.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.limitations.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.lineage.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.lineage_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.modalities.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.origin.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.pedagogicalCore.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.prerequisites.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.qualifications[]` | `validation-only` | 1 | 1 | 0 | 1 | 1 | validation:empty-pedagogical-qualification-collection | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.recommendedScenario.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.resourceNature.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.resource_nature_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.resourceNature.value` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.resource_nature_value | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.responsibility.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_text_fields.knowledge_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.schemaVersion` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.schema_version | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.useContext.state` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.use_context_state | 1 | 0 |
| activities | `activities[].pedagogicalIdentity.useContext.value` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activity_pedagogical_identities.use_context_value | 1 | 0 |
| activities | `activities[].pedagogicalQuestion` | `column-mapped` | 2 | 2 | 0 | 2 | 0 | activities.pedagogical_question | 2 | 0 |
| activities | `activities[].phenomena[]` | `validation-only` | 1 | 1 | 0 | 1 | 1 | validation:empty-activity-collection | 1 | 0 |
| activities | `activities[].phenomena[].endMs` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_phenomena.end_ms | 26 | 0 |
| activities | `activities[].phenomena[].id` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_phenomena.id | 26 | 0 |
| activities | `activities[].phenomena[].layerId` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_phenomena.layer_id | 26 | 0 |
| activities | `activities[].phenomena[].segmentId` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_phenomena.segment_id | 26 | 0 |
| activities | `activities[].phenomena[].startMs` | `column-mapped` | 26 | 26 | 0 | 0 | 0 | activity_phenomena.start_ms | 26 | 0 |
| activities | `activities[].segments[]` | `validation-only` | 1 | 1 | 0 | 1 | 1 | validation:empty-activity-collection | 1 | 0 |
| activities | `activities[].segments[].endMs` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_segments.end_ms | 11 | 0 |
| activities | `activities[].segments[].id` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_segments.id | 11 | 0 |
| activities | `activities[].segments[].languageIds[]` | `column-mapped` | 22 | 22 | 0 | 0 | 0 | activity_segment_languages.language_id | 22 | 0 |
| activities | `activities[].segments[].phenomenonIds[]` | `validation-only` | 26 | 26 | 0 | 0 | 0 | validation:segment-phenomenon-order | 26 | 0 |
| activities | `activities[].segments[].speakerIds[]` | `column-mapped` | 13 | 13 | 0 | 0 | 0 | activity_segment_speakers.speaker_id | 13 | 0 |
| activities | `activities[].segments[].startMs` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_segments.start_ms | 11 | 0 |
| activities | `activities[].segments[].text` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_segments.text | 11 | 0 |
| activities | `activities[].speakers[]` | `validation-only` | 1 | 1 | 0 | 1 | 1 | validation:empty-activity-collection | 1 | 0 |
| activities | `activities[].speakers[].id` | `column-mapped` | 5 | 5 | 0 | 0 | 0 | activity_speakers.id | 5 | 0 |
| activities | `activities[].speakers[].label` | `column-mapped` | 5 | 5 | 0 | 0 | 0 | activity_speakers.label | 5 | 0 |
| activities | `activities[].status` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activities.status | 2 | 0 |
| activities | `activities[].teacherAnnotations[]` | `validation-only` | 1 | 1 | 0 | 1 | 1 | validation:empty-activity-collection | 1 | 0 |
| activities | `activities[].teacherAnnotations[].id` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_annotations.id | 11 | 0 |
| activities | `activities[].teacherAnnotations[].note` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_annotations.note | 11 | 0 |
| activities | `activities[].teacherAnnotations[].pedagogicalQuestion` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_annotations.pedagogical_question | 11 | 0 |
| activities | `activities[].teacherAnnotations[].segmentId` | `column-mapped` | 11 | 11 | 0 | 0 | 0 | activity_annotations.segment_id | 11 | 0 |
| activities | `activities[].title` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activities.title | 2 | 0 |
| activities | `activities[].transcription.id` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activity_transcriptions.id | 2 | 0 |
| activities | `activities[].transcription.languageId` | `column-mapped` | 2 | 1 | 1 | 0 | 0 | activity_transcriptions.language_id | 2 | 0 |
| activities | `activities[].transcription.segmentIds[]` | `validation-only` | 12 | 12 | 0 | 1 | 0 | validation:transcription-segment-order | 12 | 0 |
| activities | `activities[].version` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | activities.version | 2 | 0 |
| activities | `activities[].video.durationMs` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activity-video-projection | 1 | 0 |
| activities | `activities[].video.embedUrl` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activity-video-projection | 1 | 0 |
| activities | `activities[].video.id` | `validation-only` | 2 | 2 | 0 | 0 | 0 | validation:activity-video-projection | 2 | 0 |
| activities | `activities[].video.kind` | `validation-only` | 2 | 2 | 0 | 0 | 0 | validation:activity-video-projection | 2 | 0 |
| activities | `activities[].video.provider` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activity-video-projection | 1 | 0 |
| activities | `activities[].video.proxyUrl` | `validation-only` | 2 | 2 | 0 | 0 | 0 | validation:activity-video-projection | 2 | 0 |
| activities | `activities[].video.title` | `validation-only` | 2 | 2 | 0 | 0 | 0 | validation:activity-video-projection | 2 | 0 |
| activities | `activities[].video.videoId` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activity-video-projection | 1 | 0 |
| activities | `schemaVersion` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activities-document-schema | 1 | 0 |
| activities | `updatedAt` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activities-document-timestamp | 1 | 0 |
| activityLibrary | `assignments.proto05-augmented-video-01` | `column-mapped` | 1 | 1 | 0 | 0 | 1 | activities.folder_id | 1 | 0 |
| activityLibrary | `folders[].createdAt` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | activity_folders.created_at | 1 | 0 |
| activityLibrary | `folders[].id` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | activity_folders.id | 1 | 0 |
| activityLibrary | `folders[].name` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | activity_folders.name | 1 | 0 |
| activityLibrary | `folders[].updatedAt` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | activity_folders.updated_at | 1 | 0 |
| activityLibrary | `schemaVersion` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activity-library-schema | 1 | 0 |
| activityLibrary | `updatedAt` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:activity-library-timestamp | 1 | 0 |
| languages | `languages[].id` | `column-mapped` | 4 | 4 | 0 | 0 | 0 | languages.id | 4 | 0 |
| languages | `languages[].label` | `column-mapped` | 4 | 4 | 0 | 0 | 0 | languages.label | 4 | 0 |
| mediaLibrary | `assets[].createdAt` | `column-mapped` | 16 | 16 | 0 | 0 | 0 | media_assets.created_at | 16 | 0 |
| mediaLibrary | `assets[].defaultPlayableId` | `column-mapped` | 16 | 13 | 3 | 0 | 0 | media_assets.default_playable_id | 16 | 0 |
| mediaLibrary | `assets[].derivationTypes[]` | `json-preserved` | 16 | 16 | 0 | 6 | 0 | media_assets.provenance_json._migration.derivationTypes | 16 | 0 |
| mediaLibrary | `assets[].familyRootAssetId` | `json-preserved` | 16 | 16 | 0 | 0 | 0 | media_assets.provenance_json._migration.originalFamilyRootAssetId | 16 | 0 |
| mediaLibrary | `assets[].folderId` | `column-mapped` | 16 | 1 | 15 | 0 | 0 | media_assets.folder_id | 16 | 0 |
| mediaLibrary | `assets[].id` | `column-mapped` | 16 | 16 | 0 | 0 | 0 | media_assets.id | 16 | 0 |
| mediaLibrary | `assets[].lifecycle` | `column-mapped` | 16 | 16 | 0 | 0 | 0 | media_assets.lifecycle | 16 | 0 |
| mediaLibrary | `assets[].parentAssetId` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.originalParentAssetId | 16 | 0 |
| mediaLibrary | `assets[].provenance.creationType` | `json-preserved` | 16 | 16 | 0 | 0 | 0 | media_assets.provenance_json | 16 | 0 |
| mediaLibrary | `assets[].provenance.familyRootAssetId` | `json-preserved` | 16 | 16 | 0 | 0 | 0 | media_assets.provenance_json | 16 | 0 |
| mediaLibrary | `assets[].provenance.historical.blur.filter` | `json-preserved` | 9 | 9 | 0 | 0 | 7 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.blur.id` | `json-preserved` | 8 | 8 | 0 | 0 | 8 | media_assets.provenance_json | 8 | 0 |
| mediaLibrary | `assets[].provenance.historical.blur.label` | `json-preserved` | 8 | 8 | 0 | 0 | 8 | media_assets.provenance_json | 8 | 0 |
| mediaLibrary | `assets[].provenance.historical.blur.lumaPower` | `json-preserved` | 9 | 9 | 0 | 0 | 7 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.blur.lumaRadius` | `json-preserved` | 9 | 9 | 0 | 0 | 7 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.catalogId` | `json-preserved` | 3 | 3 | 0 | 0 | 13 | media_assets.provenance_json | 3 | 0 |
| mediaLibrary | `assets[].provenance.historical.createdAt` | `json-preserved` | 10 | 10 | 0 | 0 | 6 | media_assets.provenance_json | 10 | 0 |
| mediaLibrary | `assets[].provenance.historical.importedAt` | `json-preserved` | 2 | 2 | 0 | 0 | 14 | media_assets.provenance_json | 2 | 0 |
| mediaLibrary | `assets[].provenance.historical.kind` | `json-preserved` | 16 | 16 | 0 | 0 | 0 | media_assets.provenance_json | 16 | 0 |
| mediaLibrary | `assets[].provenance.historical.masks[].height` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_assets.provenance_json | 27 | 0 |
| mediaLibrary | `assets[].provenance.historical.masks[].id` | `json-preserved` | 21 | 21 | 0 | 0 | 6 | media_assets.provenance_json | 21 | 0 |
| mediaLibrary | `assets[].provenance.historical.masks[].time` | `json-preserved` | 6 | 6 | 0 | 0 | 21 | media_assets.provenance_json | 6 | 0 |
| mediaLibrary | `assets[].provenance.historical.masks[].width` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_assets.provenance_json | 27 | 0 |
| mediaLibrary | `assets[].provenance.historical.masks[].x` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_assets.provenance_json | 27 | 0 |
| mediaLibrary | `assets[].provenance.historical.masks[].y` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_assets.provenance_json | 27 | 0 |
| mediaLibrary | `assets[].provenance.historical.method` | `json-preserved` | 10 | 10 | 0 | 0 | 6 | media_assets.provenance_json | 10 | 0 |
| mediaLibrary | `assets[].provenance.historical.mode` | `json-preserved` | 3 | 3 | 0 | 0 | 13 | media_assets.provenance_json | 3 | 0 |
| mediaLibrary | `assets[].provenance.historical.originalFileName` | `json-preserved` | 2 | 2 | 0 | 0 | 14 | media_assets.provenance_json | 2 | 0 |
| mediaLibrary | `assets[].provenance.historical.pathsRedacted` | `json-preserved` | 1 | 1 | 0 | 0 | 15 | media_assets.provenance_json | 1 | 0 |
| mediaLibrary | `assets[].provenance.historical.sha256` | `json-preserved` | 12 | 12 | 0 | 0 | 4 | media_assets.provenance_json | 12 | 0 |
| mediaLibrary | `assets[].provenance.historical.sizeBytes` | `json-preserved` | 12 | 12 | 0 | 0 | 4 | media_assets.provenance_json | 12 | 0 |
| mediaLibrary | `assets[].provenance.historical.sourceAssetId` | `json-preserved` | 10 | 10 | 0 | 0 | 6 | media_assets.provenance_json | 10 | 0 |
| mediaLibrary | `assets[].provenance.historical.sourcePreparationJobId` | `json-preserved` | 10 | 10 | 0 | 0 | 6 | media_assets.provenance_json | 10 | 0 |
| mediaLibrary | `assets[].provenance.historical.status` | `json-preserved` | 10 | 10 | 0 | 0 | 6 | media_assets.provenance_json | 10 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].endMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_assets.provenance_json | 6 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].id` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_assets.provenance_json | 6 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].keyframes[].height` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].keyframes[].time` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].keyframes[].width` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].keyframes[].x` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].keyframes[].y` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalMasks[].startMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_assets.provenance_json | 6 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].endMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_assets.provenance_json | 6 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].id` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_assets.provenance_json | 6 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].masks[].height` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].masks[].id` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].masks[].width` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].masks[].x` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].masks[].y` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_assets.provenance_json | 9 | 0 |
| mediaLibrary | `assets[].provenance.historical.temporalSteps[].startMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_assets.provenance_json | 6 | 0 |
| mediaLibrary | `assets[].provenance.importedAt` | `json-preserved` | 1 | 1 | 0 | 0 | 15 | media_assets.provenance_json | 1 | 0 |
| mediaLibrary | `assets[].provenance.kind` | `json-preserved` | 1 | 1 | 0 | 0 | 15 | media_assets.provenance_json | 1 | 0 |
| mediaLibrary | `assets[].provenance.originalFileName` | `json-preserved` | 16 | 2 | 14 | 0 | 0 | media_assets.provenance_json | 16 | 0 |
| mediaLibrary | `assets[].provenance.originReference` | `json-preserved` | 16 | 3 | 13 | 0 | 0 | media_assets.provenance_json | 16 | 0 |
| mediaLibrary | `assets[].provenance.parentAssetId` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json | 16 | 0 |
| mediaLibrary | `assets[].provenance.provider` | `json-preserved` | 16 | 16 | 0 | 0 | 0 | media_assets.provenance_json | 16 | 0 |
| mediaLibrary | `assets[].rights` | `json-preserved` | 16 | 16 | 0 | 16 | 0 | media_assets.rights_json | 16 | 0 |
| mediaLibrary | `assets[].tagIds[]` | `column-mapped` | 17 | 17 | 0 | 14 | 0 | media_asset_tags.tag_id | 17 | 0 |
| mediaLibrary | `assets[].technicalMetadata.analyzedAt` | `json-preserved` | 16 | 1 | 15 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.analyzer` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.analyzerVersion` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.audioCodec` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.durationMs` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.error` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.frameRate` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.hasAudio` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.height` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.mimeType` | `json-preserved` | 16 | 13 | 3 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.sha256` | `json-preserved` | 16 | 12 | 4 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.sizeBytes` | `json-preserved` | 16 | 12 | 4 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.videoCodec` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].technicalMetadata.width` | `json-preserved` | 16 | 0 | 16 | 0 | 0 | media_assets.provenance_json._migration.assetTechnicalMetadata | 16 | 0 |
| mediaLibrary | `assets[].title` | `column-mapped` | 16 | 16 | 0 | 0 | 0 | media_assets.title | 16 | 0 |
| mediaLibrary | `assets[].updatedAt` | `column-mapped` | 16 | 16 | 0 | 0 | 0 | media_assets.updated_at | 16 | 0 |
| mediaLibrary | `folders[].createdAt` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | media_folders.created_at | 1 | 0 |
| mediaLibrary | `folders[].id` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | media_folders.id | 1 | 0 |
| mediaLibrary | `folders[].name` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | media_folders.name | 1 | 0 |
| mediaLibrary | `folders[].parentFolderId` | `column-mapped` | 1 | 0 | 1 | 0 | 0 | media_folders.parent_folder_id | 1 | 0 |
| mediaLibrary | `folders[].sortOrder` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | media_folders.sort_order | 1 | 0 |
| mediaLibrary | `folders[].updatedAt` | `column-mapped` | 1 | 1 | 0 | 0 | 0 | media_folders.updated_at | 1 | 0 |
| mediaLibrary | `playables[].assetId` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.asset_id | 19 | 0 |
| mediaLibrary | `playables[].availability` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.availability | 19 | 0 |
| mediaLibrary | `playables[].availabilityReason` | `column-mapped` | 19 | 3 | 16 | 0 | 0 | media_playables.availability_reason | 19 | 0 |
| mediaLibrary | `playables[].createdAt` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.created_at | 19 | 0 |
| mediaLibrary | `playables[].id` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.id | 19 | 0 |
| mediaLibrary | `playables[].kind` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.kind | 19 | 0 |
| mediaLibrary | `playables[].location.embedUrl` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json._migration.originalLocation | 2 | 0 |
| mediaLibrary | `playables[].location.manifestUrl` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json._migration.originalLocation | 2 | 0 |
| mediaLibrary | `playables[].location.storageKey` | `json-preserved` | 15 | 15 | 0 | 0 | 4 | media_playables.provenance_json._migration.originalLocation | 15 | 0 |
| mediaLibrary | `playables[].location.storageScope` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_playables.provenance_json._migration.originalLocation | 3 | 0 |
| mediaLibrary | `playables[].location.url` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json._migration.originalLocation | 2 | 0 |
| mediaLibrary | `playables[].location.videoId` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json._migration.originalLocation | 2 | 0 |
| mediaLibrary | `playables[].provenance.blur.filter` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.blur.id` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.blur.label` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.blur.lumaPower` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.blur.lumaRadius` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.createdAt` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.creationType` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_playables.provenance_json | 1 | 0 |
| mediaLibrary | `playables[].provenance.derivationId` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.ffmpeg` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.ffmpegVersion` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_playables.provenance_json | 1 | 0 |
| mediaLibrary | `playables[].provenance.historical` | `json-preserved` | 15 | 15 | 0 | 15 | 4 | media_playables.provenance_json | 15 | 0 |
| mediaLibrary | `playables[].provenance.historical.importedAt` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_playables.provenance_json | 1 | 0 |
| mediaLibrary | `playables[].provenance.historical.kind` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_playables.provenance_json | 1 | 0 |
| mediaLibrary | `playables[].provenance.importedAt` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.interpolation` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.kind` | `json-preserved` | 4 | 4 | 0 | 0 | 15 | media_playables.provenance_json | 4 | 0 |
| mediaLibrary | `playables[].provenance.legacyId` | `json-preserved` | 16 | 16 | 0 | 0 | 3 | media_playables.provenance_json | 16 | 0 |
| mediaLibrary | `playables[].provenance.masks[].height` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.masks[].time` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.masks[].width` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.masks[].x` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.masks[].y` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.method` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.mode` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.originalFileName` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_playables.provenance_json | 1 | 0 |
| mediaLibrary | `playables[].provenance.sha256` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_playables.provenance_json | 3 | 0 |
| mediaLibrary | `playables[].provenance.sizeBytes` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_playables.provenance_json | 3 | 0 |
| mediaLibrary | `playables[].provenance.sourceAssetId` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_playables.provenance_json | 3 | 0 |
| mediaLibrary | `playables[].provenance.sourcePlayableId` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_playables.provenance_json | 1 | 0 |
| mediaLibrary | `playables[].provenance.sourcePreparationJobId` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.status` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_playables.provenance_json | 2 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].endMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].id` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].keyframes[].height` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].keyframes[].time` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].keyframes[].width` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].keyframes[].x` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].keyframes[].y` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalMasks[].startMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].endMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].id` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].masks[].height` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].masks[].id` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].masks[].width` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].masks[].x` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].masks[].y` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_playables.provenance_json | 7 | 0 |
| mediaLibrary | `playables[].provenance.temporalSteps[].startMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_playables.provenance_json | 5 | 0 |
| mediaLibrary | `playables[].provider` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.provider | 19 | 0 |
| mediaLibrary | `playables[].role` | `column-mapped` | 4 | 4 | 0 | 0 | 15 | media_playables.role | 4 | 0 |
| mediaLibrary | `playables[].sourceId` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.source_id | 19 | 0 |
| mediaLibrary | `playables[].technicalMetadata.analyzedAt` | `column-mapped` | 17 | 2 | 15 | 0 | 2 | media_playable_metadata.analyzed_at | 17 | 0 |
| mediaLibrary | `playables[].technicalMetadata.analyzer` | `column-mapped` | 17 | 1 | 16 | 0 | 2 | media_playable_metadata.analyzer | 17 | 0 |
| mediaLibrary | `playables[].technicalMetadata.analyzerVersion` | `column-mapped` | 17 | 0 | 17 | 0 | 2 | media_playable_metadata.analyzer_version | 17 | 0 |
| mediaLibrary | `playables[].technicalMetadata.audioCodec` | `column-mapped` | 17 | 1 | 16 | 0 | 2 | media_playable_metadata.audio_codec | 17 | 0 |
| mediaLibrary | `playables[].technicalMetadata.durationMs` | `column-mapped` | 19 | 2 | 17 | 0 | 0 | media_playable_metadata.duration_ms | 19 | 0 |
| mediaLibrary | `playables[].technicalMetadata.error` | `column-mapped` | 19 | 0 | 19 | 0 | 0 | media_playable_metadata.error_text | 19 | 0 |
| mediaLibrary | `playables[].technicalMetadata.fileName` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_playables.provenance_json._migration.technicalMetadataExtras.fileName | 3 | 0 |
| mediaLibrary | `playables[].technicalMetadata.frameRate` | `column-mapped` | 17 | 1 | 16 | 0 | 2 | media_playable_metadata.frame_rate | 17 | 0 |
| mediaLibrary | `playables[].technicalMetadata.hasAudio` | `column-mapped` | 17 | 1 | 16 | 0 | 2 | media_playable_metadata.has_audio | 17 | 0 |
| mediaLibrary | `playables[].technicalMetadata.height` | `column-mapped` | 19 | 1 | 18 | 0 | 0 | media_playable_metadata.height | 19 | 0 |
| mediaLibrary | `playables[].technicalMetadata.mimeType` | `column-mapped` | 19 | 17 | 2 | 0 | 0 | media_playable_metadata.mime_type | 19 | 0 |
| mediaLibrary | `playables[].technicalMetadata.sha256` | `column-mapped` | 19 | 15 | 4 | 0 | 0 | media_playable_metadata.sha256 | 19 | 0 |
| mediaLibrary | `playables[].technicalMetadata.sizeBytes` | `column-mapped` | 19 | 15 | 4 | 0 | 0 | media_playable_metadata.size_bytes | 19 | 0 |
| mediaLibrary | `playables[].technicalMetadata.status` | `column-mapped` | 3 | 3 | 0 | 0 | 16 | media_playable_metadata.analysis_status | 3 | 0 |
| mediaLibrary | `playables[].technicalMetadata.videoCodec` | `column-mapped` | 17 | 1 | 16 | 0 | 2 | media_playable_metadata.video_codec | 17 | 0 |
| mediaLibrary | `playables[].technicalMetadata.width` | `column-mapped` | 19 | 1 | 18 | 0 | 0 | media_playable_metadata.width | 19 | 0 |
| mediaLibrary | `playables[].updatedAt` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_playables.updated_at | 19 | 0 |
| mediaLibrary | `schemaVersion` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:media-library-schema | 1 | 0 |
| mediaLibrary | `sources[].provenance.historical.blur.filter` | `json-preserved` | 9 | 9 | 0 | 0 | 10 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.blur.id` | `json-preserved` | 8 | 8 | 0 | 0 | 11 | media_sources.provenance_json | 8 | 0 |
| mediaLibrary | `sources[].provenance.historical.blur.label` | `json-preserved` | 8 | 8 | 0 | 0 | 11 | media_sources.provenance_json | 8 | 0 |
| mediaLibrary | `sources[].provenance.historical.blur.lumaPower` | `json-preserved` | 9 | 9 | 0 | 0 | 10 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.blur.lumaRadius` | `json-preserved` | 9 | 9 | 0 | 0 | 10 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.catalogId` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_sources.provenance_json | 3 | 0 |
| mediaLibrary | `sources[].provenance.historical.createdAt` | `json-preserved` | 10 | 10 | 0 | 0 | 9 | media_sources.provenance_json | 10 | 0 |
| mediaLibrary | `sources[].provenance.historical.importedAt` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.historical.kind` | `json-preserved` | 13 | 13 | 0 | 0 | 6 | media_sources.provenance_json | 13 | 0 |
| mediaLibrary | `sources[].provenance.historical.masks[].height` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_sources.provenance_json | 27 | 0 |
| mediaLibrary | `sources[].provenance.historical.masks[].id` | `json-preserved` | 21 | 21 | 0 | 0 | 6 | media_sources.provenance_json | 21 | 0 |
| mediaLibrary | `sources[].provenance.historical.masks[].time` | `json-preserved` | 6 | 6 | 0 | 0 | 21 | media_sources.provenance_json | 6 | 0 |
| mediaLibrary | `sources[].provenance.historical.masks[].width` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_sources.provenance_json | 27 | 0 |
| mediaLibrary | `sources[].provenance.historical.masks[].x` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_sources.provenance_json | 27 | 0 |
| mediaLibrary | `sources[].provenance.historical.masks[].y` | `json-preserved` | 27 | 27 | 0 | 0 | 0 | media_sources.provenance_json | 27 | 0 |
| mediaLibrary | `sources[].provenance.historical.method` | `json-preserved` | 10 | 10 | 0 | 0 | 9 | media_sources.provenance_json | 10 | 0 |
| mediaLibrary | `sources[].provenance.historical.mode` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_sources.provenance_json | 3 | 0 |
| mediaLibrary | `sources[].provenance.historical.originalFileName` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.historical.pathsRedacted` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.provenance_json | 1 | 0 |
| mediaLibrary | `sources[].provenance.historical.sha256` | `json-preserved` | 12 | 12 | 0 | 0 | 7 | media_sources.provenance_json | 12 | 0 |
| mediaLibrary | `sources[].provenance.historical.sizeBytes` | `json-preserved` | 12 | 12 | 0 | 0 | 7 | media_sources.provenance_json | 12 | 0 |
| mediaLibrary | `sources[].provenance.historical.sourceAssetId` | `json-preserved` | 10 | 10 | 0 | 0 | 9 | media_sources.provenance_json | 10 | 0 |
| mediaLibrary | `sources[].provenance.historical.sourcePreparationJobId` | `json-preserved` | 10 | 10 | 0 | 0 | 9 | media_sources.provenance_json | 10 | 0 |
| mediaLibrary | `sources[].provenance.historical.status` | `json-preserved` | 10 | 10 | 0 | 0 | 9 | media_sources.provenance_json | 10 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].endMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_sources.provenance_json | 6 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].id` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_sources.provenance_json | 6 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].keyframes[].height` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].keyframes[].time` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].keyframes[].width` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].keyframes[].x` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].keyframes[].y` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalMasks[].startMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_sources.provenance_json | 6 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].endMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_sources.provenance_json | 6 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].id` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_sources.provenance_json | 6 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].masks[].height` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].masks[].id` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].masks[].width` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].masks[].x` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].masks[].y` | `json-preserved` | 9 | 9 | 0 | 0 | 0 | media_sources.provenance_json | 9 | 0 |
| mediaLibrary | `sources[].provenance.historical.temporalSteps[].startMs` | `json-preserved` | 6 | 6 | 0 | 0 | 0 | media_sources.provenance_json | 6 | 0 |
| mediaLibrary | `sources[].assetId` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_sources.asset_id | 19 | 0 |
| mediaLibrary | `sources[].createdAt` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_sources.created_at | 19 | 0 |
| mediaLibrary | `sources[].id` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_sources.id | 19 | 0 |
| mediaLibrary | `sources[].kind` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_sources.kind | 19 | 0 |
| mediaLibrary | `sources[].mimeType` | `column-mapped` | 19 | 17 | 2 | 0 | 0 | media_sources.mime_type | 19 | 0 |
| mediaLibrary | `sources[].origin.declaredLocal` | `json-preserved` | 12 | 12 | 0 | 0 | 7 | media_sources.origin_json | 12 | 0 |
| mediaLibrary | `sources[].origin.derivationId` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.origin_json | 2 | 0 |
| mediaLibrary | `sources[].origin.embedUrl` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.origin_json | 2 | 0 |
| mediaLibrary | `sources[].origin.manifestUrl` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.origin_json | 2 | 0 |
| mediaLibrary | `sources[].origin.originalFileName` | `json-preserved` | 17 | 3 | 14 | 0 | 2 | media_sources.origin_json | 17 | 0 |
| mediaLibrary | `sources[].origin.originUrl` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.origin_json | 2 | 0 |
| mediaLibrary | `sources[].origin.proxyUrl` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.origin_json | 1 | 0 |
| mediaLibrary | `sources[].origin.sourceAssetId` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.origin_json | 1 | 0 |
| mediaLibrary | `sources[].origin.sourcePlayableId` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.origin_json | 1 | 0 |
| mediaLibrary | `sources[].origin.sourceUrl` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.origin_json | 1 | 0 |
| mediaLibrary | `sources[].origin.url` | `json-preserved` | 12 | 12 | 0 | 0 | 7 | media_sources.origin_json | 12 | 0 |
| mediaLibrary | `sources[].origin.videoId` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.origin_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.blur.filter` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.blur.id` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.blur.label` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.blur.lumaPower` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.blur.lumaRadius` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.createdAt` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.creationType` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.provenance_json | 1 | 0 |
| mediaLibrary | `sources[].provenance.derivationId` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.ffmpeg` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.ffmpegVersion` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.provenance_json | 1 | 0 |
| mediaLibrary | `sources[].provenance.importedAt` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.interpolation` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.kind` | `json-preserved` | 4 | 4 | 0 | 0 | 15 | media_sources.provenance_json | 4 | 0 |
| mediaLibrary | `sources[].provenance.legacyId` | `json-preserved` | 16 | 16 | 0 | 0 | 3 | media_sources.provenance_json | 16 | 0 |
| mediaLibrary | `sources[].provenance.masks[].height` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.masks[].time` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.masks[].width` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.masks[].x` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.masks[].y` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.method` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.mode` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.originalFileName` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.provenance_json | 1 | 0 |
| mediaLibrary | `sources[].provenance.sha256` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_sources.provenance_json | 3 | 0 |
| mediaLibrary | `sources[].provenance.sizeBytes` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_sources.provenance_json | 3 | 0 |
| mediaLibrary | `sources[].provenance.sourceAssetId` | `json-preserved` | 3 | 3 | 0 | 0 | 16 | media_sources.provenance_json | 3 | 0 |
| mediaLibrary | `sources[].provenance.sourcePlayableId` | `json-preserved` | 1 | 1 | 0 | 0 | 18 | media_sources.provenance_json | 1 | 0 |
| mediaLibrary | `sources[].provenance.sourcePreparationJobId` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.status` | `json-preserved` | 2 | 2 | 0 | 0 | 17 | media_sources.provenance_json | 2 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].endMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].id` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].keyframes[].height` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].keyframes[].time` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].keyframes[].width` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].keyframes[].x` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].keyframes[].y` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalMasks[].startMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].endMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].id` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].masks[].height` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].masks[].id` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].masks[].width` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].masks[].x` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].masks[].y` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_sources.provenance_json | 7 | 0 |
| mediaLibrary | `sources[].provenance.temporalSteps[].startMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_sources.provenance_json | 5 | 0 |
| mediaLibrary | `sources[].provider` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_sources.provider | 19 | 0 |
| mediaLibrary | `sources[].role` | `column-mapped` | 4 | 4 | 0 | 0 | 15 | media_sources.role | 4 | 0 |
| mediaLibrary | `sources[].transport` | `column-mapped` | 19 | 19 | 0 | 0 | 0 | media_sources.transport | 19 | 0 |
| mediaLibrary | `tags[].createdAt` | `column-mapped` | 3 | 3 | 0 | 0 | 0 | media_tags.created_at | 3 | 0 |
| mediaLibrary | `tags[].id` | `column-mapped` | 3 | 3 | 0 | 0 | 0 | media_tags.id | 3 | 0 |
| mediaLibrary | `tags[].name` | `column-mapped` | 3 | 3 | 0 | 0 | 0 | media_tags.name | 3 | 0 |
| mediaLibrary | `tags[].normalizedName` | `column-mapped` | 3 | 3 | 0 | 0 | 0 | media_tags.normalized_name | 3 | 0 |
| mediaLibrary | `tags[].updatedAt` | `column-mapped` | 3 | 3 | 0 | 0 | 0 | media_tags.updated_at | 3 | 0 |
| mediaLibrary | `treatments[].createdAt` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.created_at | 2 | 0 |
| mediaLibrary | `treatments[].derivationId` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json._migration.derivationId | 2 | 0 |
| mediaLibrary | `treatments[].diagnostics` | `json-preserved` | 2 | 2 | 0 | 2 | 0 | media_treatments.diagnostics_json | 2 | 0 |
| mediaLibrary | `treatments[].engine` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.engine | 2 | 0 |
| mediaLibrary | `treatments[].engineVersion` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.engine_version | 2 | 0 |
| mediaLibrary | `treatments[].error` | `json-preserved` | 2 | 0 | 2 | 0 | 0 | media_treatments.error_json | 2 | 0 |
| mediaLibrary | `treatments[].ffmpegVersion` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.ffmpeg_version | 2 | 0 |
| mediaLibrary | `treatments[].finishedAt` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.finished_at | 2 | 0 |
| mediaLibrary | `treatments[].id` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.id | 2 | 0 |
| mediaLibrary | `treatments[].label` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.label | 2 | 0 |
| mediaLibrary | `treatments[].outputAssetId` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.output_asset_id | 2 | 0 |
| mediaLibrary | `treatments[].outputPlayableId` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.output_playable_id | 2 | 0 |
| mediaLibrary | `treatments[].parameters.blur.filter` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json | 2 | 0 |
| mediaLibrary | `treatments[].parameters.blur.id` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json | 2 | 0 |
| mediaLibrary | `treatments[].parameters.blur.label` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json | 2 | 0 |
| mediaLibrary | `treatments[].parameters.blur.lumaPower` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json | 2 | 0 |
| mediaLibrary | `treatments[].parameters.blur.lumaRadius` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json | 2 | 0 |
| mediaLibrary | `treatments[].parameters.masks[].height` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.masks[].time` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.masks[].width` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.masks[].x` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.masks[].y` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.method` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json | 2 | 0 |
| mediaLibrary | `treatments[].parameters.mode` | `json-preserved` | 2 | 2 | 0 | 0 | 0 | media_treatments.parameters_json | 2 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].endMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].id` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].keyframes[].height` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].keyframes[].time` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].keyframes[].width` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].keyframes[].x` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].keyframes[].y` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalMasks[].startMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].endMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].id` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].masks[].height` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].masks[].id` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].masks[].width` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].masks[].x` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].masks[].y` | `json-preserved` | 7 | 7 | 0 | 0 | 0 | media_treatments.parameters_json | 7 | 0 |
| mediaLibrary | `treatments[].parameters.temporalSteps[].startMs` | `json-preserved` | 5 | 5 | 0 | 0 | 0 | media_treatments.parameters_json | 5 | 0 |
| mediaLibrary | `treatments[].progress` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.progress | 2 | 0 |
| mediaLibrary | `treatments[].publishedPlayableId` | `column-mapped` | 2 | 0 | 2 | 0 | 0 | media_treatments.published_playable_id | 2 | 0 |
| mediaLibrary | `treatments[].retained` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.retained | 2 | 0 |
| mediaLibrary | `treatments[].runtimeJobId` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.runtime_job_id | 2 | 0 |
| mediaLibrary | `treatments[].sourceAssetId` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.source_asset_id | 2 | 0 |
| mediaLibrary | `treatments[].sourcePlayableId` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.source_playable_id | 2 | 0 |
| mediaLibrary | `treatments[].sourcePreparationId` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.source_preparation_id | 2 | 0 |
| mediaLibrary | `treatments[].startedAt` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.started_at | 2 | 0 |
| mediaLibrary | `treatments[].status` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.status | 2 | 0 |
| mediaLibrary | `treatments[].type` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.type | 2 | 0 |
| mediaLibrary | `treatments[].updatedAt` | `column-mapped` | 2 | 2 | 0 | 0 | 0 | media_treatments.updated_at | 2 | 0 |
| mediaLibrary | `updatedAt` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:media-library-timestamp | 1 | 0 |
| videoCatalog | `schemaVersion` | `validation-only` | 1 | 1 | 0 | 0 | 1 | validation:video-catalog-schema | 1 | 0 |
| videoCatalog | `videos[].authorized` | `validation-only` | 3 | 3 | 0 | 0 | 0 | validation:video-catalog-semantic-projection | 3 | 0 |
| videoCatalog | `videos[].durationMs` | `validation-only` | 2 | 1 | 1 | 0 | 1 | validation:video-catalog-semantic-projection | 2 | 0 |
| videoCatalog | `videos[].embedUrl` | `validation-only` | 2 | 2 | 0 | 0 | 1 | validation:video-catalog-semantic-projection | 2 | 0 |
| videoCatalog | `videos[].id` | `validation-only` | 3 | 3 | 0 | 0 | 0 | validation:video-catalog-semantic-projection | 3 | 0 |
| videoCatalog | `videos[].key` | `validation-only` | 1 | 1 | 0 | 0 | 2 | validation:video-catalog-semantic-projection | 1 | 0 |
| videoCatalog | `videos[].mimeType` | `validation-only` | 1 | 1 | 0 | 0 | 2 | validation:video-catalog-semantic-projection | 1 | 0 |
| videoCatalog | `videos[].provider` | `validation-only` | 3 | 3 | 0 | 0 | 0 | validation:video-catalog-semantic-projection | 3 | 0 |
| videoCatalog | `videos[].proxyUrl` | `validation-only` | 1 | 1 | 0 | 0 | 2 | validation:video-catalog-semantic-projection | 1 | 0 |
| videoCatalog | `videos[].source` | `validation-only` | 1 | 1 | 0 | 0 | 2 | validation:video-catalog-semantic-projection | 1 | 0 |
| videoCatalog | `videos[].sourceType` | `validation-only` | 1 | 1 | 0 | 0 | 2 | validation:video-catalog-semantic-projection | 1 | 0 |
| videoCatalog | `videos[].sourceUrl` | `validation-only` | 1 | 1 | 0 | 0 | 2 | validation:video-catalog-semantic-projection | 1 | 0 |
| videoCatalog | `videos[].title` | `validation-only` | 3 | 3 | 0 | 0 | 0 | validation:video-catalog-semantic-projection | 3 | 0 |
| videoCatalog | `videos[].videoId` | `validation-only` | 2 | 2 | 0 | 0 | 1 | validation:video-catalog-semantic-projection | 2 | 0 |
