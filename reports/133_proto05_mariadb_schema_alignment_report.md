# Mission 133 — Proto05 — Alignement du schéma MariaDB sur le contrat JSON canonique

Date : 27 juillet 2026

Correctif final du validateur des traitements : 27 juillet 2026

Périmètre : Proto05 et base locale `ic_augmented_video` uniquement

Statut : **réalisée et vérifiée**

Version applicative : **0.1.45, inchangée**

## Résultat

Le schéma MariaDB installé est désormais aligné sur les décisions de contrat de
la Mission 133. La migration de schéma a été appliquée à
`ic_augmented_video`, sans migration des données JSON.

Le dry-run final est valide :

| Indicateur | Résultat |
|---|---:|
| Chemins normalisés | 435 |
| Occurrences contrôlées | 3 222 |
| Occurrences conciliées | 3 222 |
| Écarts de couverture | 0 |
| Chemins `unmapped-blocking` | 0 |
| Lignes préparées | 264 dans 27 tables |
| Erreurs bloquantes | 0 |
| Avertissements | 22 |
| Hash des sources | `a5cacd7540586cffca68415bb50bd9837dfcd4d04e6c4ec3221cf7e1f844eef0` |
| Hash déterministe Mission 132.1 | `cdfaf5aededd26cd24778306b49e4967c4f84869a2359f57322caf7bc184bcad` |
| Hash déterministe final | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |

## Décisions appliquées

| Contrat canonique | Destination ou règle SQL | Justification |
|---|---|---|
| `assets[].description` | `media_assets.description TEXT NULL` | texte libre optionnel ; aucune valeur par défaut ni redirection vers la provenance |
| `tags[].color` | `media_tags.color VARCHAR(32) NULL` | validateur applicatif : chaîne facultative de 32 caractères au plus |
| `layerConfiguration.id` | `activities.layer_configuration_id VARCHAR(191) NULL` | même famille que les identifiants métier ; absence autorisée ; aucune unicité ou FK non démontrée |
| intervalle non segmenté | `activity_language_intervals.segment_id VARCHAR(191) NULL` | préserve l’état pédagogique légitime sans créer de segment artificiel |
| traitement terminé | sortie et date de fin obligatoires ; publication facultative | `completed` décrit la production, pas sa publication |
| snapshot vidéo historique | avertissement old/new ; playable canonique autoritatif | la projection redondante ne devient pas une seconde vérité |

Les trois nouvelles propriétés sont des colonnes dédiées. Aucune n’est stockée
dans `provenance_json`, dans un JSON générique ou dans une table clé/valeur.

## Migration et retour arrière

Migration créée :

`prototypes/05-augmented-ic-video-01/database/migrations/002_proto05_mariadb_schema_alignment.sql`

SHA-256 final de la migration :

`64ba179ebc294eaa7ab708d65fd5904c34d2ed71dee01e969b0787f6cd35e92e`

Avant application, une sauvegarde de schéma seule a été créée :

`C:\Users\david\AppData\Local\Temp\proto05_ic_augmented_video_before_m133_schema.sql`

- taille : 200 099 octets ;
- SHA-256 :
  `15516E05EF0035BB9A7EB0A929BECE2EB12B4026B154D0C030E90EF12EA15D80` ;
- contenu contrôlé : 31 `CREATE TABLE` et 43 `CREATE PROCEDURE`.

La migration documente l’ordre de rollback : restaurer d’abord les procédures,
reposer l’ancien `CHECK`, refuser le retour à `segment_id NOT NULL` si une ligne
non segmentée existe, puis retirer les trois colonnes. Aucune donnée métier
n’existait lors de l’application.

## Contraintes modifiées

### Intervalle linguistique

La colonne `segment_id` devient nullable. La FK existante
`fk_language_interval_segment` est conservée : `NULL` est accepté, mais un
identifiant inconnu non nul reste rejeté par MariaDB avec l’erreur 1452.

### Traitement terminé

Ancienne règle :

```text
status != completed
OU (
  output_asset_id IS NOT NULL
  ET output_playable_id IS NOT NULL
  ET published_playable_id IS NOT NULL
  ET finished_at IS NOT NULL
)
```

Nouvelle règle :

```text
status != completed
OU (
  output_asset_id IS NOT NULL
  ET output_playable_id IS NOT NULL
  ET finished_at IS NOT NULL
)
```

Le `CHECK` conserve son nom
`chk_media_treatment_completed_output`. La FK composite
`fk_treatment_published_playable` reste en place : si
`published_playable_id` est fourni, le playable doit appartenir à l’asset de
sortie. Aucun statut ou champ de sortie existant n’a été affaibli.

Le nombre total de contraintes `CHECK` reste **65**.

## Dépendances inspectées

### Procédures modifiées

| Procédure | Adaptation |
|---|---|
| `sp_media_tag_create` | accepte, écrit et restitue la couleur facultative |
| `sp_media_tag_rename` | met à jour et restitue la couleur facultative |
| `sp_media_asset_set_tags` | restitue la couleur ; types `JSON_TABLE` alignés sur la collation des identifiants |
| `sp_activity_replace_authoring` | écrit `layerConfiguration.id` et accepte un `segmentId` absent |
| `sp_activity_duplicate` | régénère `layer-config-<nouvel id>` et préserve les intervalles non segmentés |
| `sp_media_treatment_complete` | enregistre la sortie réelle sans inventer de publication ; rejeu idempotent conservé |
| `sp_activity_get` | restitue `layer_configuration_id` dans la lecture complète |
| `sp_media_get` | restitue la description de l’asset et la couleur des tags |

La recette a révélé une incompatibilité de collation dans les colonnes
temporaires `JSON_TABLE` de `sp_media_asset_set_tags`. Leur charset/collation a
été rendu explicite et cohérent avec les identifiants existants.

### Dépendances laissées inchangées

| Élément | Justification |
|---|---|
| `sp_activity_create` | ne reçoit pas de configuration auteur ; la colonne nullable est alimentée lors du remplacement d’authoring |
| `sp_activity_update_metadata` | ne modifie que les métadonnées d’activité, pas la configuration de couches |
| `sp_media_register_import` | son interface actuelle ne reçoit pas de description ; le futur migrateur construit directement la colonne dédiée |
| `sp_media_library_search` | projection de liste, pas lecture complète de l’asset |
| `sp_student_activity_bundle_get` | contrat étudiant volontairement distinct du contrat auteur complet |
| vues SQL | aucune vue dans `ic_augmented_video` |
| triggers et événements | aucun avant, aucun ajouté |

Les recherches applicatives ont confirmé que le validateur de bibliothèque
média est le contrat réellement concerné pour les deux propriétés facultatives.
Il accepte désormais `asset.description` comme chaîne ou `NULL` et `tag.color`
comme chaîne de 32 caractères au plus ou `NULL`.

### Correctif final du validateur des traitements

Le typedef `MediaTreatment` déclare maintenant explicitement
`publishedPlayableId:string|null`.

Le validateur JavaScript est aligné sur le contrat SQL et le dry-run :

- un traitement `completed` exige `outputAssetId` et `outputPlayableId` ;
- sa progression doit être exactement égale à 100 ;
- `finishedAt` doit être présent et constituer une date ISO UTC valide ;
- `publishedPlayableId` reste facultatif ;
- lorsqu’il est présent, le playable doit appartenir à `outputAssetId` et
  conserver le rôle canonique `published-remote`.

La comparaison résiduelle avec `sourceAssetId` a été remplacée par la
comparaison avec `outputAssetId`. Quatre tests construits uniquement par clones
en mémoire couvrent l’absence de date de fin, une progression différente de
100, une publication valide sur l’asset de sortie et le rejet d’une publication
appartenant seulement à l’asset source.

## Dry-run et neuf anciens blocages

| Ancien blocage | Nombre | Sort final |
|---|---:|---|
| intervalles sans segment | 4 | lignes préservées avec `segment_id = NULL` |
| traitements terminés non publiés | 2 | lignes valides avec sortie réelle et `published_playable_id = NULL` |
| divergences du snapshot vidéo | 2 | avertissements `ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE` |
| chemin `layerConfiguration.id` sans cible | 1 | `column-mapped` vers `activities.layer_configuration_id` |
| **Total** | **9** | **0 blocage restant** |

Pour l’activité `proto05-draft-1784230655360-d1182f`, les avertissements
exposent :

- `kind` : ancien `hls`, nouveau `youtube-embed` ;
- `proxyUrl` : ancienne valeur
  `/api/hls/uga-37004/livestream.m3u8`, nouvelle valeur `NULL` ;
- playable canonique utilisé :
  `video-proto05-youtube-ev9rfkfhfa0`.

Le `playableId` canonique est résolu en priorité. Son absence, une référence
inconnue ou une identité ambiguë restent bloquantes. Aucun JSON source n’est
modifié.

Les mappings futurs de description, couleur et identité de configuration sont
testés avec des valeurs non vides. Le registre prouve leur production dans les
colonnes dédiées et interdit le détour par une colonne JSON.

## Vérifications

### Validation JavaScript

- syntaxe Node du dry-run : réussie ;
- syntaxe du validateur et de son test : réussie ;
- auto-tests du dry-run : **22/22** ;
- tests du contrat de bibliothèque média : **52/52** ;
- aucune dépendance installée.

Après le correctif final, un dry-run réel conserve strictement le bilan
435 chemins / 3 222 occurrences conciliées / 264 lignes / 0 blocage /
22 avertissements et le hash
`d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233`.
Le fichier de dry-run n’a pas été modifié.

### Exécutions du dry-run

| Exécution | Contexte | Code | Bloquants | Avertissements | Hash |
|---:|---|---:|---:|---:|---|
| 1 | racine du workspace | 0 | 0 | 22 | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |
| 2 | dossier Proto05 | 0 | 0 | 22 | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |
| 3 | racine, consécutive 1 | 0 | 0 | 22 | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |
| 4 | racine, consécutive 2 | 0 | 0 | 22 | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |

Les quatre exécutions donnent également 435 chemins, 3 222 occurrences
conciliées, 264 lignes préparées et zéro écart.

### Recette SQL

Recette créée :

`prototypes/05-augmented-ic-video-01/database/tests/004_proto05_schema_alignment_validation.sql`

Résultat final : **16/16 assertions réussies**, marqueur
`MISSION_133_VALIDATION_COMPLETE`, code client 0.

La recette vérifie les quatre définitions de colonnes, les comptes d’objets,
le nouveau `CHECK`, l’écriture auteur, la duplication, le `NULL` d’intervalle,
le rejet d’un segment inconnu, la description et la couleur, les lectures
complètes, la terminaison non publiée, le rejet d’une publication incohérente,
le rejet d’un traitement terminé sans sortie, l’absence de trigger/événement et
le nettoyage final.

Pendant sa mise au point, la recette a d’abord corrigé le nom attendu de la FK,
puis révélé la dépendance de collation de `sp_media_asset_set_tags`. L’ajout du
cas de duplication a aussi nécessité d’ordonner le nettoyage de la filiation
pédagogique. Ces trois points sont corrigés ; la dernière exécution est
entièrement réussie.

## État MariaDB final

| Témoin | Avant | Après |
|---|---:|---:|
| tables | 31 | 31 |
| procédures | 43 | 43 |
| FK | 48 | 48 |
| contraintes `CHECK` | 65 | 65 |
| triggers | 0 | 0 |
| événements | 0 | 0 |

Les 31 tables ont chacune un `COUNT(*) = 0`, y compris `schema_migrations` et
`import_runs`. Les procédures temporaires `sp_m133_*` ont été supprimées.
Aucune donnée JSON réelle n’a été injectée.

Témoins des autres bases :

| Base | Avant | Après |
|---|---|---|
| `ic_dico` | 8 tables, 0 vue, 9 procédures | 8 tables, 0 vue, 9 procédures |
| `ic_hub` | 15 tables, 1 vue, 3 procédures | 15 tables, 1 vue, 3 procédures |

Aucune autre base n’a été modifiée.

Le correctif final du validateur n’a exécuté aucune commande SQL et n’a modifié
ni le schéma ni l’état de MariaDB.

## Immutabilité des quinze JSON

Les SHA-256 après travaux sont identiques aux relevés avant travaux :

| Fichier | SHA-256 inchangé |
|---|---|
| `data/activities.20260716T205538855Z.before-original-copy-removal.json.bak` | `862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47` |
| `data/activities.json` | `95766C6256ACE97A39F63760B2EB530183910113D8DE6DEFF037D0B0F6D3D8C3` |
| `data/activities.json.bak` | `CB024E557A12BC84BB155955AE5C5270B4464350EC2C42243EA68C66F9FB9976` |
| `data/activities.pre-language-catalog-0.1.12.json.bak` | `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD` |
| `data/activity-library.json` | `63CE330896759421397C987CCC685884FFB6E1C93663B68B7D3D6EAD4C1C256A` |
| `data/activity-library.json.bak` | `1426A224FB94FB54273A2AAF489D29036A24A775FA3C7941903F7DFF8451FF65` |
| `data/backups/mission-102-video-library-0.1.json` | `361305F679391FB8559C2958880CE9DCB5A0CF238A1C6371A2B3F6583CFD7A9B` |
| `data/video-catalog.json` | `89A73A4065AB84AE1B676D25FBE62FD17FEB0FB51302997B49999E68B05FE373` |
| `data/video-catalog.json.bak` | `761410B2B5F1D981DB3996D663F7D6F4B3225E56EA09E8641E297C5E27260172` |
| `data/video-library.json` | `E98C9A4F051F09020E9227A37D60CF532FA446BA684B80BFB8505DBF3519D473` |
| `data/video-library.json.bak` | `64079311A2FE741F7448D2415F8E74B866F976006F0FB88265F51D545431028A` |
| `server/package.json` | `522EA570AC20703B10D66C4290DEA2A0988E91C7A800133971EB136201F1D826` |
| `server/test/fixtures/layer-visibility.activity.json` | `533556B24E33D49F746259CA9C072DBE4AEE39DF51ED0F1688E18395E03ECC39` |
| `server/test/fixtures/media-library-canonical.valid.json` | `1593A0498A3F343EC0C2A1EDAEE5425BAC3064CFDE075EC113DB5138E8291511` |
| `../../shared/reference-data/languages.json` | `E3034A20260C6F77569966E3CC05618402362822B038CAC4D491BAEE3AFFF355` |

## Fichiers concernés

Créés :

- `prototypes/05-augmented-ic-video-01/database/migrations/002_proto05_mariadb_schema_alignment.sql` ;
- `prototypes/05-augmented-ic-video-01/database/tests/004_proto05_schema_alignment_validation.sql` ;
- `reports/133_proto05_mariadb_schema_alignment_report.md`.

Modifiés :

- `prototypes/05-augmented-ic-video-01/database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` ;
- `prototypes/05-augmented-ic-video-01/server/media-library-schema.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/media-library-contract.test.js` ;
- `reports/132_proto05_json_to_mariadb_migration_audit_and_dry_run.md`.

## Limites et validation humaine

- La migration réelle des données JSON n’a pas commencé et reste interdite hors
  mission dédiée.
- Le dry-run prépare un modèle en mémoire ; il ne remplace pas une future
  transaction de migration et sa recette de reconstruction.
- Les avertissements historiques de fichiers indisponibles, de lignée, de dates
  et de doublon sémantique restent non bloquants.
- Aucune interface n’a été modifiée ; Chromium et FFmpeg n’ont pas été lancés.
- La validation réalisée est statique, automatisée et MariaDB. Elle ne vaut pas
  validation fonctionnelle humaine de David.

## État Git et remise

- branche : `main` ;
- HEAD : `4ebf1dad5deef8f1a3724e045a88fd4d16efefca` ;
- version Proto05 : `0.1.45`, inchangée ;
- aucun commit ;
- aucun push.

Le contrôle final `git diff --check` est réussi. Les livrables non suivis ont
également été contrôlés sans erreur d’espace final.

Message de commit proposé, non exécuté :

```text
feat(proto05): align MariaDB schema with canonical JSON
```

Suite possible, uniquement sur nouvelle mission explicite : préparer la
migration transactionnelle des données JSON à partir de ce dry-run validé.
