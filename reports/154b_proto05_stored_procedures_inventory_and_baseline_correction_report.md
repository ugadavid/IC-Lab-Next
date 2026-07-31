# Mission 154B — Inventaire des procédures et correction de baseline

Date : 31 juillet 2026  
Prototype : `prototypes/05-augmented-ic-video-01`  
Version observée et obtenue : `0.1.48`, inchangée  
Révision de départ : `fd52ed2`  
Statut : **arrêt de sécurité avant modification des grants ou du registre réel**

## Résultat

La base explicitement sélectionnée par `SELECT DATABASE()` est
`ic_augmented_video`. Elle contient **43 procédures stockées**. Deux mécanismes
indépendants exécutés avec une visibilité administrative donnent exactement la
même liste ordonnée :

- `SHOW PROCEDURE STATUS WHERE Db = DATABASE()` : 43 ;
- `information_schema.ROUTINES`, filtré par la base et `PROCEDURE` : 43 ;
- différence de noms entre les deux ensembles : 0.

La conclusion de M154 annonçant zéro routine est fausse. Les procédures n’ont
jamais disparu : le compte applicatif utilisé pour l’inspection ne possède ni
`EXECUTE` ni `SHOW CREATE ROUTINE`; MariaDB lui retourne zéro ligne dans les
deux inventaires. Le compte administratif voit les 43 mêmes procédures que
HeidiSQL.

Aucune procédure, aucun grant, aucune ligne de `schema_migrations`, aucune
donnée métier et aucun média n’a été modifié. Le point d’arrêt de la mission est
atteint : une correction complète exige une visibilité fiable des routines au
démarrage et une migration corrective à inscrire dans le registre réel. Ces
changements doivent être autorisés par David avant exécution.

## Témoin exact préalable

Avant toute correction documentaire, les définitions installées ont été
exportées en lecture seule dans le fichier local ignoré :

`prototypes/05-augmented-ic-video-01/database/backups/mission-154b-stored-procedures-before.json`

Le fichier contient pour chaque procédure : résultats de
`information_schema.ROUTINES` et `PARAMETERS`, ligne de
`SHOW PROCEDURE STATUS`, `SHOW CREATE PROCEDURE` exact, paramètres, charset,
collations, mode SQL, `DEFINER` déployé, hash brut et hash fonctionnel.

- format : `proto05-stored-procedures-backup/1` ;
- procédures : 43 ;
- paramètres : 198, tous `IN` ;
- definers déployés distincts : 1, valeur volontairement non reproduite ici ;
- empreinte exacte des `SHOW CREATE` :
  `3dd8cda7f9dabaad1b91ef7e4b15c5b9d4507cd310555c2edd759300015bc926` ;
- empreinte fonctionnelle du témoin :
  `066f80b37e0248d860b427e76dda49c2e20ec616131c7ce9d6e1a3cdcd68d28b` ;
- SHA-256 du fichier de sauvegarde :
  `7c762fb77a89cf6e8d9a3a388ebff2249333be324963c17f7d36b400372c9ba3`.

Cette sauvegarde est ignorée par Git et doit être conservée avec celle de M154.
Elle est la source exacte des corps déployés ; le présent rapport n’en duplique
pas environ trois mille lignes.

## Caractéristiques communes

Les 43 procédures sont réellement présentes et possèdent les caractéristiques
suivantes :

- `ROUTINE_TYPE = PROCEDURE` ;
- `SQL SECURITY DEFINER` ;
- `IS_DETERMINISTIC = NO` ;
- `SQL_DATA_ACCESS = CONTAINS SQL` ;
- commentaire de routine vide ;
- charset client et collations enregistrés dans le témoin exact ;
- aucun `OUT` ou `INOUT` ;
- aucun trigger, fonction, vue ou événement installé.

Le `DEFINER` exact est une propriété déployée conservée dans la sauvegarde. Il
doit être exclu de la définition fonctionnelle portable, contrairement à
`SQL SECURITY`, au mode SQL, à la signature, aux caractéristiques et au corps.
Les commentaires internes et lignes blanches peuvent être normalisés car ils
n’affectent pas le comportement ; les commentaires de routine déclarés restent
contractuels.

## Inventaire exhaustif

Les colonnes `003` et `002` désignent les lignes des fichiers :

- `database/drafts/003_proto05_schema_hardening.sql` ;
- `database/migrations/002_proto05_mariadb_schema_alignment.sql`.

Le hash est celui du contrat fonctionnel installé conservé dans la sauvegarde.
« Appel SQL » désigne seulement un appel entre procédures. « Tests » est le
nombre d’appels directs trouvés dans les recettes SQL suivies ; zéro ne prouve
pas l’obsolescence.

| Procédure | Signature installée | Définitions dépôt | Hash fonctionnel installé | Appel SQL | Tests directs |
|---|---|---|---|---|---:|
| `sp_activity_assign_folder` | `IN p_activity_id varchar(191), IN p_folder_id varchar(191)` | `003:2030` | `c30d4f175416580931dfe3b3c77d56e58b9197a31db3d2254ad8dbd2edbc75b3` | — | 0 |
| `sp_activity_create` | `IN p_activity_id varchar(191), IN p_version varchar(32), IN p_title varchar(500), IN p_description text, IN p_instruction text, IN p_pedagogical_question text` | `003:2444` | `837b39d620b86dd67bce6db08069a6e2c7c2691b97f749998cd425932cc554ff` | — | 10 |
| `sp_activity_delete` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned` | `003:1316` | `ba8ada006b01e599a00c84e2b8c746bc75a0cd0957ffc84e2074b74e0e5d3c18` | — | 0 |
| `sp_activity_duplicate` | `IN p_source_activity_id varchar(191), IN p_expected_source_revision bigint(20) unsigned, IN p_new_activity_id varchar(191), IN p_new_title varchar(500), IN p_keep_folder tinyint(1)` | `003:1101`, `002:715` | `670102d0cad5c2ca5732aa811d7808007d804489bc18a390cc016d8e27e2d855` | — | 1 |
| `sp_activity_folder_create` | `IN p_folder_id varchar(191), IN p_name varchar(255)` | `003:1079` | `04966112c0914f1a3270ca8382e1591093cc70d9917a958a3989072f4ebdc7d8` | — | 0 |
| `sp_activity_folder_delete` | `IN p_folder_id varchar(191)` | `003:1986` | `c61d0646e1ee6de99d603a69a53344c22a3c52711b58afd063b63183a560a709` | — | 0 |
| `sp_activity_folder_rename` | `IN p_folder_id varchar(191), IN p_name varchar(255)` | `003:1945` | `2decf220d93c13a8d7e96bd7a838f949bc3a89b7cf51788ca2fbe330af9d4717` | — | 0 |
| `sp_activity_get` | `IN p_activity_id varchar(191)` | `003:4295`, `002:934` | `7f10c66b7338ec964aa07d471a299cb6aa22a8dc3734b435bc9698f0fca9eb8d` | — | 2 |
| `sp_activity_library_search` | `IN p_query varchar(500), IN p_status varchar(32), IN p_completeness varchar(32), IN p_folder_id varchar(191), IN p_sort varchar(32), IN p_limit int(10) unsigned, IN p_offset int(10) unsigned` | `003:4099` | `b3a397d5734930b1c032bc3911791f8cf790f6790e449f2529b4f907651ccc5b` | — | 1 |
| `sp_activity_remove_supplementary_media` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned, IN p_media_asset_id varchar(191)` | `003:1620` | `cee75de8301178bca76eacc510f7a926081e478618f86bdb20963ff05c22f326` | — | 0 |
| `sp_activity_replace_authoring` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned, IN p_authoring_json longtext` | `003:1678`, `002:140` | `e9e994e4d1f4698933b0191508cc7df85d5bba0fee611ccaeffcba0a0a54d81f` | — | 1 |
| `sp_activity_replace_pedagogical_details` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned, IN p_text_fields_json longtext, IN p_qualifications_json longtext` | `003:2878` | `61cc0573ee2f792f03eb4265c664858856ba014904f4c232f11a585ca3ca5d62` | — | 0 |
| `sp_activity_set_pedagogical_identity` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned, IN p_schema_version varchar(32), IN p_design_status varchar(64), IN p_resource_nature_state varchar(32), IN p_resource_nature_value text, IN p_resource_nature_note text, IN p_duration_state varchar(32), IN p_duration_minutes int(10) unsigned, IN p_duration_note text, IN p_intention_state varchar(32), IN p_intention_value text, IN p_intention_note text, IN p_audience_state varchar(32), IN p_audience_value text, IN p_audience_note text, IN p_use_context_state varchar(32), IN p_use_context_value text, IN p_use_context_note text, IN p_lineage_state varchar(32), IN p_lineage_relation varchar(32), IN p_parent_activity_id varchar(191), IN p_root_activity_id varchar(191), IN p_lineage_note text, IN p_extended_fields_json longtext` | `003:2579` | `a91189bb97980fc26694f5e18065cd88eaa7a17dffa0213fa0b4c0e8eebb4d0e` | — | 6 |
| `sp_activity_set_primary_media` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned, IN p_media_asset_id varchar(191), IN p_media_playable_id varchar(191)` | `003:1380` | `503c5d94d8310df7596c77086a7a9e381121c72de412a01377f73c8b9d962a7c` | — | 7 |
| `sp_activity_set_supplementary_media` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned, IN p_media_asset_id varchar(191), IN p_media_playable_id varchar(191), IN p_sort_order int(10) unsigned` | `003:1491` | `c1bd11d98146cf0436b0db7e44a117a3e6048294b7484b2dceee225ba8b421bf` | — | 11 |
| `sp_activity_update_metadata` | `IN p_activity_id varchar(191), IN p_expected_revision bigint(20) unsigned, IN p_status varchar(32), IN p_title varchar(500), IN p_description text, IN p_instruction text, IN p_pedagogical_question text` | `003:2501` | `8f1d90ba43fdb37736c5fb441f0c619a971bbd8fa52d35fe6b20bcb281adada9` | — | 5 |
| `sp_author_activity_bundle` | `IN p_activity_id varchar(191)` | `003:4774` | `322d7ab0f62cb450e2b81af72d86bca95c47e62a027961ad5e7e040cb0806afd` | `sp_activity_get` | 2 |
| `sp_media_asset_assign_folder` | `IN p_asset_id varchar(191), IN p_folder_id varchar(191)` | `003:2195` | `57bb71e7354ef726214b2faedba01a568076c3c7ec5167057775a06337174058` | — | 0 |
| `sp_media_asset_delete` | `IN p_asset_id varchar(191)` | `003:3919` | `7a1ecd9a39bbd009445288ab125b9dfb736ef2bf2a7e0386199333c57cdeea17` | — | 1 |
| `sp_media_asset_set_tags` | `IN p_asset_id varchar(191), IN p_tag_ids_json longtext` | `003:2336`, `002:415` | `f59a497c7a70c58575979c6d261362c78da176ac00a3a6b1b4886765bce8b3cb` | — | 1 |
| `sp_media_derivation_delete` | `IN p_asset_id varchar(191)` | `003:3989` | `8fb5e050e00341fe42299d7273506187d12ceda98ef9085de4cf248cb07b7b57` | `sp_media_asset_delete` | 0 |
| `sp_media_folder_create` | `IN p_folder_id varchar(191), IN p_parent_folder_id varchar(191), IN p_name varchar(255)` | `003:2072` | `28f52eceef653ff6f04fd2a856f883a6f6fc66274f6056da7df0a72ac71568ad` | — | 0 |
| `sp_media_folder_delete` | `IN p_folder_id varchar(191)` | `003:2146` | `a79b9aad0cbc89266cb6ecedca3d8b95e1db83009c1dcafa93e2088332e6df36` | — | 0 |
| `sp_media_folder_rename` | `IN p_folder_id varchar(191), IN p_name varchar(255)` | `003:2105` | `481ff883ddf03f959460b2606a65f10106d4f7c17c401683e2c8a9740f341e26` | — | 0 |
| `sp_media_get` | `IN p_asset_id varchar(191)` | `003:4440`, `002:1080` | `480ae05c6387f5adc7d6dea2aebd0825ff1c9cf9cdc2c55280187fc60b584d06` | — | 1 |
| `sp_media_library_search` | `IN p_query varchar(500), IN p_source_kind varchar(64), IN p_availability varchar(32), IN p_folder_id varchar(191), IN p_tag_id varchar(191), IN p_sort varchar(32), IN p_limit int(10) unsigned, IN p_offset int(10) unsigned` | `003:4209` | `954a0d1c727e769a3305fad2cd19c618d18c272a34663bc24963899f13bd737f` | — | 1 |
| `sp_media_lineage_delete` | `IN p_family_root_asset_id varchar(191)` | `003:4009` | `aa7b47f15841de99dba877ae3f4bc03f987372c55fe43376548af5d7bfe7f922` | — | 0 |
| `sp_media_lineage_get` | `IN p_asset_id varchar(191)` | `003:4496` | `afe64ae0629084a8a17674f2341c7f29d91c7d555d5bc64f0f4aed10bfa72bc5` | — | 0 |
| `sp_media_register_import` | `IN p_asset_id varchar(191), IN p_source_id varchar(191), IN p_playable_id varchar(191), IN p_title varchar(500), IN p_source_kind varchar(64), IN p_provider varchar(64), IN p_transport varchar(64), IN p_role varchar(64), IN p_mime_type varchar(191), IN p_origin_url text, IN p_storage_scope varchar(64), IN p_storage_key varchar(768), IN p_location_url text, IN p_embed_video_id varchar(191), IN p_availability varchar(32), IN p_provenance_json longtext` | `003:2990` | `9bbd0fc369580446a10383b6d11d0b7f7064e4fae5e26b0ddea8cc2413981e51` | — | 12 |
| `sp_media_register_playable` | `IN p_playable_id varchar(191), IN p_asset_id varchar(191), IN p_source_id varchar(191), IN p_kind varchar(64), IN p_provider varchar(64), IN p_role varchar(64), IN p_availability varchar(32), IN p_storage_scope varchar(64), IN p_storage_key varchar(768), IN p_location_url text, IN p_embed_video_id varchar(191), IN p_make_default tinyint(1), IN p_provenance_json longtext` | `003:3080` | `7d6d04a17a8688b2aad388738035f95a886680175e76824459133ccc416131d0` | — | 2 |
| `sp_media_set_playable_metadata` | `IN p_playable_id varchar(191), IN p_analysis_status varchar(64), IN p_mime_type varchar(191), IN p_duration_ms bigint(20) unsigned, IN p_size_bytes bigint(20) unsigned, IN p_sha256 char(64), IN p_width int(10) unsigned, IN p_height int(10) unsigned, IN p_frame_rate decimal(10,4), IN p_video_codec varchar(64), IN p_audio_codec varchar(64), IN p_has_audio tinyint(1), IN p_analyzer varchar(128), IN p_analyzer_version varchar(64), IN p_error_text text` | `003:3201` | `9d257e6fb1ca436d996f55f926b51155e1adb59efa71a2d2ba1e645e12848b84` | — | 0 |
| `sp_media_tag_create` | `IN p_tag_id varchar(191), IN p_name varchar(191), IN p_color varchar(32)` | `003:2237`, `002:58` | `828333119068e9590b2848307e39cf1488b347ad8520aa0ff8f7abf5c9ed1794` | — | 1 |
| `sp_media_tag_delete` | `IN p_tag_id varchar(191)` | `003:2300` | `d9718ba58ce20fac18613b8d8c7615fc926031951817eafa4af7a96d6d0c09c6` | — | 0 |
| `sp_media_tag_rename` | `IN p_tag_id varchar(191), IN p_name varchar(191), IN p_color varchar(32)` | `003:2259`, `002:87` | `614700412956d06fde5c7517f8a317bbde92bdbcbea0ca9804125ec459284a77` | — | 1 |
| `sp_media_treatments_search` | `IN p_asset_id varchar(191), IN p_status varchar(32), IN p_limit int(10) unsigned, IN p_offset int(10) unsigned` | `003:4516` | `3ba6cba81aef36ddac7d0faefbb64854797132b16528283cf8d2645b5693669d` | — | 0 |
| `sp_media_treatment_complete` | `IN p_treatment_id varchar(191), IN p_output_asset_id varchar(191), IN p_output_source_id varchar(191), IN p_output_playable_id varchar(191), IN p_title varchar(500), IN p_derivation_type varchar(64), IN p_storage_scope varchar(64), IN p_storage_key varchar(768), IN p_mime_type varchar(191), IN p_size_bytes bigint(20) unsigned, IN p_duration_ms bigint(20) unsigned, IN p_sha256 char(64), IN p_ffmpeg_version varchar(191), IN p_diagnostics_json longtext` | `003:3486`, `002:535` | `db515995981d29b4eb1e91bdba86d651630dcce0bd858074ca27f7e698356c7f` | — | 10 |
| `sp_media_treatment_start` | `IN p_treatment_id varchar(191), IN p_source_asset_id varchar(191), IN p_source_playable_id varchar(191), IN p_output_asset_id varchar(191), IN p_output_title varchar(500), IN p_derivation_type varchar(64), IN p_type varchar(64), IN p_label varchar(500), IN p_runtime_job_id varchar(191), IN p_engine varchar(128), IN p_engine_version varchar(64), IN p_parameters_json longtext` | `003:3265` | `f78a2d7e319f784b24656d7f00a19a65259c8e20d624cccdfac1c29b9aabd3bc` | — | 8 |
| `sp_media_treatment_update` | `IN p_treatment_id varchar(191), IN p_status varchar(32), IN p_progress decimal(5,2), IN p_diagnostics_json longtext, IN p_error_json longtext` | `003:3356` | `84685bd68a718ad282899ec0abfceaaacf94356c1315ce09f68cc58f25861810` | — | 12 |
| `sp_media_update_playable_availability` | `IN p_playable_id varchar(191), IN p_availability varchar(32), IN p_reason varchar(191)` | `003:3153` | `88602c8df04f08a2b8eff02677582bb7d2221167b001d99ac6e073aad3e2d939` | — | 3 |
| `sp_storage_file_removal_complete` | `IN p_operation_id varchar(191)` | `003:3783` | `a61d7332179b66a071e94b14481a8e6c66fc38c7aa18a7cc830c3b33b33c3431` | — | 2 |
| `sp_storage_file_removal_fail` | `IN p_operation_id varchar(191), IN p_error_text text` | `003:3848` | `a79803223b35d6a155c390951d18e2629a780bfb17d6197b14429eae64d055f7` | — | 3 |
| `sp_storage_file_removal_request` | `IN p_operation_id varchar(191), IN p_playable_id varchar(191)` | `003:3667` | `49dd4ea0f7fdaf85bbcefb8ccba0f66ea500c71ad225e00abdc28e308820b6ef` | — | 4 |
| `sp_student_activity_bundle` | `IN p_activity_id varchar(191)` | `003:4544` | `ba3cca7aeee909bc19928908caf803badb2ad4538ab3db529203d25bae399dd3` | — | 7 |

Les signatures et définitions exactes restent également disponibles dans la
sauvegarde locale, sans perte d’information.

## Matrice d’utilisation

La recherche a porté sur `server/`, `shared/`, les routes, scripts Node, SQL,
tests, fixtures, documentation, bootstrap et historique Git.

| Famille | Procédures | Appel runtime | Appel indirect | Parcours prévu/documenté | Tests SQL | Statut démontré |
|---|---|---|---|---|---|---|
| Dossiers activité | `sp_activity_folder_*`, `sp_activity_assign_folder` | aucun | aucun | créer, renommer, supprimer, classer | couverture partielle | présente sans appel runtime démontré — décision requise |
| Activité et pédagogie | `sp_activity_create`, `update_metadata`, `delete`, `duplicate`, `set_pedagogical_identity`, `replace_pedagogical_details`, `replace_authoring` | aucun | aucun | CRUD, fiche, atelier, duplication | création, identité, authoring, duplication | présente sans appel runtime démontré — décision requise |
| Liens média activité | `sp_activity_set_primary_media`, `set_supplementary_media`, `remove_supplementary_media` | aucun | aucun | vidéo primaire et médias complémentaires | primaire et complémentaires | présente sans appel runtime démontré — décision requise |
| Lectures activité | `sp_activity_library_search`, `sp_activity_get`, `sp_student_activity_bundle`, `sp_author_activity_bundle` | aucun | `sp_author_activity_bundle` appelle `sp_activity_get` | bibliothèque, fiche, auteur, étudiant | oui | présente sans appel runtime démontré — décision requise |
| Dossiers et tags média | `sp_media_folder_*`, `sp_media_asset_assign_folder`, `sp_media_tag_*`, `sp_media_asset_set_tags` | aucun | aucun | classement et étiquettes | tags et associations | présente sans appel runtime démontré — décision requise |
| Imports et playables | `sp_media_register_import`, `register_playable`, `update_playable_availability`, `set_playable_metadata` | aucun | aucun | import, copie, disponibilité, analyse | oui sauf métadonnées seules | présente sans appel runtime démontré — décision requise |
| Traitements | `sp_media_treatment_start`, `update`, `complete`, `treatments_search` | aucun | aucun | cycle des traitements et recherche | cycle mutation couvert | présente sans appel runtime démontré — décision requise |
| Suppressions média | `sp_media_asset_delete`, `derivation_delete`, `lineage_delete` | aucun | `sp_media_derivation_delete` appelle `sp_media_asset_delete` | préflight et suppression logique | asset couvert | présente sans appel runtime démontré — décision requise |
| Outbox fichier | `sp_storage_file_removal_request`, `complete`, `fail` | aucun | aucun | suppression physique en deux phases | oui | présente sans appel runtime démontré — décision requise |
| Lectures média | `sp_media_library_search`, `sp_media_get`, `sp_media_lineage_get` | aucun | aucun | vidéothèque, fiche, lignée | recherche et fiche | présente sans appel runtime démontré — décision requise |

Toutes les routes actuelles passent par `proto05-mariadb-readonly.js` et
`proto05-mariadb-write.js`. Aucun `CALL sp_*` n’existe dans le runtime. Le compte
applicatif confirme ce fait : un appel de lecture ciblé retourne
`ER_PROCACCESS_DENIED_ERROR` avant exécution.

## Pourquoi M154 s’est trompée

La cause n’est ni une mauvaise base ni un filtre de type erroné :

1. `SELECT DATABASE()` confirmait la bonne base ;
2. les filtres `ROUTINE_SCHEMA` et `ROUTINE_TYPE` étaient corrects ;
3. l’inspection utilisait le compte applicatif à privilèges bornés ;
4. ce compte n’a pas de privilège de routine ; MariaDB masque donc les 43
   lignes ;
5. `inspectDatabaseSchema()` a traité un résultat vide comme une preuve
   d’absence au lieu de vérifier la capacité d’inventaire ;
6. le manifeste a photographié ce résultat incomplet ;
7. la migration `001` sélectionne volontairement les sources avant
   `DELIMITER $$`, supprimant précisément les corps de procédures ;
8. le test de base vide attendait explicitement `routines: 0`, transformant le
   défaut de l’appareil de mesure en assertion verte ;
9. la M154 a ensuite confondu « non appelée par le runtime » avec « non
   installée », puis avec « historique ».

Les rapports 134, 135 et 137 avaient correctement recensé 43 procédures. La
régression d’inventaire apparaît dans l’audit 149 puis M154, tous deux fondés sur
la visibilité insuffisante du compte applicatif.

MariaDB documente que `SHOW CREATE PROCEDURE` exige la propriété de la routine,
`SHOW CREATE ROUTINE` ou un accès au catalogue système. Le nouveau privilège
`SHOW CREATE ROUTINE` existe sur cette instance 11.8 et peut être borné au
schéma. Références :

- https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-create-procedure
- https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant

## Sources du dépôt et reconstruction isolée

Les 43 procédures sont définies dans 003 ; 002 remplace huit définitions après
les évolutions de schéma. Une reconstruction isolée a exécuté :

1. les 32 tables du chemin M154 ;
2. les 86 instructions `DROP IF EXISTS`/`CREATE PROCEDURE` de 003 ;
3. les 16 instructions de remplacement de 002.

Résultat : 43 noms identiques à la base réelle. Les différences textuelles de
cinq `SHOW CREATE` étaient seulement les commentaires SQL et lignes blanches
non conservés par l’installation réelle. Signatures, caractéristiques et SQL
fonctionnel concordent.

Deux recettes SQL ont ensuite été jouées sur la base temporaire :

- `003_proto05_schema_validation.sql` : réussite sans adaptation ;
- `004_proto05_schema_alignment_validation.sql` : réussite après adaptation
  uniquement de son ancien compteur global de `CHECK`, 68 avant M136 contre 70
  dans le schéma final ; aucune assertion fonctionnelle n’a été retirée.

Ces recettes couvrent création et modification d’activité, identité, authoring,
duplication, lectures auteur/étudiant, import média, tags, traitements,
suppression et erreurs contractuelles. Après recette : 43 procédures canoniques,
0 helper `sp_m1*`, puis suppression complète de la base temporaire.

## Runtime : contournement ou erreur

Le modèle de la Mission 127 prévoyait les procédures comme accès futur. Les
Missions 140 et 141 ont ensuite choisi explicitement une autre architecture :

- lectures de 29 tables sous frontière et projection commune ;
- writer générique paramétré, transaction `SERIALIZABLE`, verrou nommé et
  réconciliation sémantique avant commit ;
- depuis M153, contrôle de concurrence optimiste et révision d’agrégat ;
- compte applicatif volontairement sans `EXECUTE`.

Il n’existe donc pas de panne runtime faisant accidentellement ignorer un
`CALL` existant. Il existe deux contrats concurrents : procédures prévues par le
modèle initial et adaptateurs directs ensuite validés. Aucun document actuel ne
donne une décision suffisamment certaine pour remplacer le writer sans risque.

Rétablir immédiatement les procédures dans toutes les routes pourrait perdre
les garanties acquises en M150–M153, notamment la projection complète, les
préflights actuels, les empreintes médias et certaines unités de concurrence.
Conformément à la mission, aucune règle n’est inventée : les 43 procédures sont
classées « présentes sans appel runtime démontré — décision requise » et restent
strictement conservées.

## Canon et fingerprint à corriger

Le contrat corrigé devra inclure pour chaque procédure :

- nom, type et paramètres ordonnés avec mode/type/charset/collation ;
- `SQL SECURITY`, déterminisme, accès SQL, mode SQL et commentaire ;
- corps fonctionnel issu de `SHOW CREATE PROCEDURE` ;
- charsets et collations de création nécessaires à une reconstruction fidèle ;
- hash individuel et participation au fingerprint global.

Normalisations permises : `DEFINER` déployé, commentaires internes SQL,
indentation, lignes blanches et fins de ligne. Ne doivent jamais être
normalisés : signature, instruction SQL, littéral, ordre, `SQL SECURITY`, mode
SQL, caractéristique d’accès, commentaire déclaré, charset ou collation ayant
un effet.

Le nouvel inventeur devra :

1. confirmer la base ;
2. vérifier explicitement la visibilité `SHOW CREATE ROUTINE` ;
3. confronter `SHOW PROCEDURE STATUS` et `information_schema.ROUTINES` ;
4. obtenir chaque `SHOW CREATE PROCEDURE` ;
5. refuser un résultat vide lorsque les droits ne prouvent pas l’absence ;
6. diagnostiquer nom, signature, propriété ou corps manquant/modifié.

## Stratégie honnête proposée pour le registre

La ligne réelle `001` porte toujours le checksum
`2c97057604cd5ffdc8fda582bafaa88b1990e36a090346c683eee16d066be191` et la
description « sans routines historiques ». Elle ne doit être ni réécrite ni
supprimée silencieusement.

Stratégie recommandée :

1. conserver `001` comme témoin exact de la baseline tabulaire effectivement
   inscrite par M154 ;
2. ajouter une migration `002` nommée clairement « adoption canonique des 43
   procédures installées » ;
3. sur base vide, `001` crée les tables puis `002` crée les procédures depuis
   003 et les huit remplacements de 002 historique ;
4. sur la base réelle, si les 43 signatures, propriétés et corps correspondent
   exactement, produire une action spéciale d’adoption sans DDL ;
5. cette adoption ajoute seulement la ligne `002` sous verrou et transaction ;
6. toute différence refuse l’adoption ; aucun `DROP`, `ALTER` ou `CREATE OR
   REPLACE` n’est exécuté sur la base réelle ;
7. le runner conserve l’honnêteté des commits implicites pour une installation
   vide et ne marque jamais une routine partiellement créée comme appliquée.

## Point d’arrêt et décisions demandées à David

Deux changements d’état réels sont nécessaires avant de fermer M154B :

1. donner au vérificateur de démarrage une visibilité des définitions, soit par
   le privilège borné `SHOW CREATE ROUTINE` sur la base du prototype, soit par
   un compte de vérification dédié ; aucun `EXECUTE`, `CREATE ROUTINE` ou
   `ALTER ROUTINE` n’est nécessaire pour l’inventaire ;
2. après implémentation et tests, inscrire la migration additive `002` dans
   `schema_migrations` sur la base réelle.

La première option recommandée est d’ajouter uniquement `SHOW CREATE ROUTINE`
au compte déjà utilisé pour la vérification, puis d’adapter son contrôle de
grants. La seconde option sépare davantage les responsabilités mais exige un
nouveau compte et une nouvelle configuration secrète. Aucun des deux choix n’a
été appliqué.

Après arbitrage, les commandes et valeurs exactes pourront être produites par
le runner corrigé : checksum `002`, plan hash, confirmation littérale et témoin
avant/après. Elles ne peuvent pas être honnêtement inventées avant que la
migration additive et le mode de visibilité aient été choisis.

## Preuves de conservation et nettoyage

État réel observé au début et à la fin :

- procédures : 43 ;
- noms : identiques ;
- empreinte exacte :
  `3dd8cda7f9dabaad1b91ef7e4b15c5b9d4507cd310555c2edd759300015bc926` ;
- empreinte fonctionnelle :
  `066f80b37e0248d860b427e76dda49c2e20ec616131c7ce9d6e1a3cdcd68d28b` ;
- registre : une ligne `001`, checksum inchangé ;
- fingerprint des 31 tables protégées :
  `60688dff7dcf76ab84db4b04e885f99db2d30d74f535f3a562fc5789aa3c6e9f` ;
- cardinalités métier : inchangées ;
- grants et privilèges de routine : inchangés ;
- bases temporaires `proto05_m154b_*` : 0 ;
- helper temporaire de procédure : 0 ;
- serveur, connexion ou verrou résiduel : aucun ;
- média et fichier JSON : aucune écriture ;
- FFmpeg : non exécuté.

## Fichiers modifiés ou créés par M154B

- corrigé : `reports/154_proto05_mariadb_migration_registry_and_baseline_report.md` ;
- créé : `reports/154b_proto05_stored_procedures_inventory_and_baseline_correction_report.md` ;
- créé et ignoré :
  `prototypes/05-augmented-ic-video-01/database/backups/mission-154b-stored-procedures-before.json`.

Aucun code, manifeste, runner, SQL, JSON, média, version ou configuration n’a
été modifié pendant M154B. Les changements non commités de M154 sont conservés.

## Vérifications effectuées et non effectuées

Effectuées : double inventaire réel, 43 `SHOW CREATE PROCEDURE`, signatures,
caractéristiques, appels internes, recherche globale des appelants, comparaison
avec le dépôt, reconstruction isolée, deux recettes SQL, nettoyage et témoins
avant/après.

Non effectuées en raison du point d’arrêt : nouveau fingerprint canonique,
migration additive, tests de procédure manquante/corps/signature modifiés,
grant de visibilité, inscription `002`, démarrage avec le futur canon, recette
Chromium post-correction et suite 125/125 après correction. Le 125/125 de M154
reste un témoin du périmètre tabulaire, pas une preuve des routines.

La recette de Codex ne constitue pas une validation humaine de David.

## Reprise proposée après arbitrage

1. Autoriser le mécanisme de visibilité retenu sans accorder `EXECUTE` par
   défaut.
2. Implémenter la migration additive `002` et l’action d’adoption sans DDL.
3. Ajouter les tests déterministes de visibilité, routine absente, corps,
   signature, reconstruction, concurrence et échec DDL.
4. Refaire le plan réel ; il doit prévoir exclusivement un grant préautorisé
   et/ou une insertion `002`, jamais une modification de procédure.
5. Après sauvegarde vérifiée et accord explicite, appliquer l’inscription,
   relire les 43 hashes, démarrer Proto05 et exécuter les contrôles fonctionnels
   et Chromium.
6. Traiter séparément la décision d’appeler ou non les procédures depuis le
   runtime ; ne pas remplacer le writer tant que l’équivalence avec les
   garanties M150–M153 n’est pas prouvée.

## Proposition de message de commit

À ce stade documentaire bloqué :

`docs(proto05): correct stored procedure inventory and baseline plan`
