# Mission 155 — Canon MariaDB et reconnexion du runtime Proto05

Date : 31 juillet 2026

Périmètre : `prototypes/05-augmented-ic-video-01` et documentation de reprise

Version : `0.1.48` → `0.1.49`

Commit de départ : `fd52ed2`

Autorité métier : MariaDB `ic_augmented_video` exclusivement

## Résultat

Le serveur Node conserve les contrats HTTP, la validation, les verrous et les
préconditions. Les lectures métier composées et les mutations effectivement
consommées passent désormais par les procédures stockées canoniques. Le writer
SQL générique précédent n'est plus un chemin concurrent ni un repli silencieux.

La migration additive `002` installe et contrôle exactement 43 procédures. La
baseline `001` n'a pas été modifiée et conserve son checksum :
`2c97057604cd5ffdc8fda582bafaa88b1990e36a090346c683eee16d066be191`.

État final observé du registre et du schéma :

- versions enregistrées : `001`, `002` ;
- checksum `002` :
  `fc08300a464487025e6a9a9f5c207f879b5635465e505f78f084aca3e8806d53` ;
- topologie : 32 tables, 275 colonnes, 89 index, 48 clés étrangères,
  70 contraintes `CHECK`, 43 procédures, aucun trigger et aucun événement ;
- fingerprint structurel attendu et observé :
  `7510550d09b194245d0a27542f14224ea02272380cd340cf48a7cc98ce6f7613` ;
- migrations en attente : aucune.

## État initial confirmé

Les rapports 154 et 154B, le code et l'instance ont été relus. Les 43
procédures existaient, mais le runtime utilisait des lectures et écritures SQL
directes. Le manifeste `001` ne décrivait volontairement que la baseline
tabulaire et ne devait pas être réécrit. Le compte applicatif ne disposait pas
initialement de la visibilité et de l'exécution nécessaires aux routines.

Le dépôt n'était pas propre au départ : les travaux non commités des Missions
154 et 154B étaient présents. Ils ont été conservés. Le dump global ignoré par
Git n'a été ni lu, ni modifié, ni ajouté.

## Cartographie des 43 procédures

`R+` signifie « mise à niveau puis raccordée ». `C` signifie raccordée au
runtime sans consommateur SQL concurrent. `U` signifie conservée dans le canon
mais non appelée artificiellement : aucun parcours applicatif actuel ne la
consomme. « Ancien SQL » résume les écritures ou projections directes retirées
du chemin actif.

| Procédure | Responsabilité et consommateur | Ancien SQL direct / garanties | Décision |
|---|---|---|---|
| `sp_activity_assign_folder` | classement depuis la bibliothèque d'activités | `UPDATE activities.folder_id`; transaction et révision | R+ |
| `sp_activity_create` | création d'activité par les routes enseignantes | `INSERT activities`; transaction externe et révision initiale 1 | R+ |
| `sp_activity_delete` | suppression d'une activité | séries de `DELETE`; précondition de révision et nettoyage de l'agrégat | R+ |
| `sp_activity_duplicate` | duplication enseignante | copie multi-table; remappage et concurrence optimiste | R+ |
| `sp_activity_folder_create` | création de dossier d'activités | `INSERT activity_folders`; transaction partagée | C |
| `sp_activity_folder_delete` | suppression de dossier d'activités | `DELETE activity_folders`; contrôle des références | C |
| `sp_activity_folder_rename` | renommage de dossier d'activités | `UPDATE activity_folders`; transaction partagée | C |
| `sp_activity_get` | lecture historique détaillée, appelée par le bundle ordinaire | anciennes lectures par activité; non utilisée par le snapshot global | U — contrat SQL historique testé |
| `sp_activity_library_search` | recherche SQL paginée d'activités | projection désormais filtrée en mémoire après snapshot | U — aucun appel runtime actuel |
| `sp_activity_remove_supplementary_media` | retrait d'un média complémentaire | `DELETE activity_media_links`; révision optimiste | R+ |
| `sp_activity_replace_authoring` | remplacement atomique de tout l'authoring | remplacements multi-tables; validation JSON, révision, transaction unique | R+ |
| `sp_activity_replace_pedagogical_details` | remplacement historique des seuls détails pédagogiques | sous-ensemble désormais couvert par `replace_authoring` | U — évite deux writers concurrents |
| `sp_activity_set_pedagogical_identity` | identité pédagogique historique | sous-ensemble désormais couvert par `replace_authoring` | U — évite une révision fragmentée |
| `sp_activity_set_primary_media` | média primaire | `INSERT/UPDATE activity_media_links`; révision et playable `available` ou `unknown` seulement | R+ |
| `sp_activity_set_supplementary_media` | média complémentaire | `INSERT/UPDATE activity_media_links`; ordre, révision et disponibilité | R+ |
| `sp_activity_update_metadata` | métadonnées historiques d'activité | sous-ensemble désormais couvert par `replace_authoring` | U — évite une écriture partielle concurrente |
| `sp_author_activity_bundle` | lecture partagée des 29 tables par reader et writer | 29 `SELECT` métier directs; snapshot cohérent et résultat ordonné | R+ |
| `sp_media_asset_assign_folder` | ancien classement média ciblé | couvert par l'enveloppe atomique de `asset_set_tags` | U — évite une écriture partielle |
| `sp_media_asset_delete` | suppression d'un asset racine | suppressions multi-tables; préflight Node et nettoyage SQL de l'agrégat | R+ |
| `sp_media_asset_set_tags` | fiche média, dossier, tags et métadonnées éditoriales | `UPDATE media_assets` et table de jointure; enveloppe atomique complète | R+ |
| `sp_media_derivation_delete` | suppression d'une dérivation | ancien plan de suppressions; délègue au contrat d'asset | R+ |
| `sp_media_folder_create` | création de dossier média | `INSERT media_folders`; transaction partagée | C |
| `sp_media_folder_delete` | suppression de dossier média | `DELETE media_folders`; intégrité relationnelle | C |
| `sp_media_folder_rename` | renommage de dossier média | `UPDATE media_folders`; transaction partagée | C |
| `sp_media_get` | lecture SQL détaillée d'un asset | projection désormais dérivée du snapshot commun | U — contrat SQL et recette conservés |
| `sp_media_library_search` | recherche SQL paginée des médias | filtrage en mémoire après snapshot commun | U — aucun appel runtime actuel |
| `sp_media_lineage_delete` | suppression historique d'une famille entière | aucune route de suppression de lignée complète | U — ne pas inventer un consommateur destructif |
| `sp_media_lineage_get` | lecture SQL de lignée | projection de lignée dérivée du snapshot commun | U — aucun appel runtime actuel |
| `sp_media_register_import` | import média local/distant | insertions asset/source/playable/métadonnées/tags; provenance distincte atomique | R+ |
| `sp_media_register_playable` | copie de travail et nouveau playable | insertions source/playable/métadonnées; enveloppe atomique et relecture | R+ |
| `sp_media_set_playable_metadata` | analyse technique seule | métadonnées incluses dans les enveloppes d'import et de playable | U — aucun parcours d'analyse autonome |
| `sp_media_tag_create` | création d'étiquette | `INSERT media_tags`; nom normalisé et couleur exacte | R+ |
| `sp_media_tag_delete` | suppression d'étiquette | `DELETE media_tags`; intégrité des associations | C |
| `sp_media_tag_rename` | renommage/couleur d'étiquette | `UPDATE media_tags`; normalisation déterministe | R+ |
| `sp_media_treatments_search` | recherche historique de traitements | projection des traitements dans le snapshot commun | U — aucune route de recherche dédiée |
| `sp_media_treatment_complete` | fin de transcodage et publication | aucun traitement runtime actif dans le serveur actuel | U — contrat SQL testé, pas d'appel artificiel |
| `sp_media_treatment_start` | réservation d'une dérivation | aucun traitement runtime actif dans le serveur actuel | U — contrat SQL testé |
| `sp_media_treatment_update` | progression/échec de traitement | aucun traitement runtime actif dans le serveur actuel | U — contrat SQL testé |
| `sp_media_update_playable_availability` | réconciliation explicite disque/MariaDB | ancien `UPDATE media_playables`; préconditions optimistes dans l'enveloppe | R+ |
| `sp_storage_file_removal_complete` | confirmation historique de suppression physique | workflow outbox sans consommateur Node actuel | U — recette SQL conservée |
| `sp_storage_file_removal_fail` | échec et restauration historique de disponibilité | workflow outbox sans consommateur Node actuel | U — recette SQL conservée |
| `sp_storage_file_removal_request` | réservation historique d'une suppression physique | workflow outbox sans consommateur Node actuel | U — recette SQL conservée |
| `sp_student_activity_bundle` | bundle étudiant SQL historique | les vues student et preview utilisent la projection commune du snapshot | U — contrat SQL testé, même projection applicative |

Bilan : 24 procédures ont un consommateur runtime réel ; 19 restent
explicitement canoniques mais sans consommateur applicatif actuel. Elles ne
sont ni maquillées en couverture, ni appelées pour la forme.

## Migration 002 et garanties du runner

La migration `002` compose les définitions historiques après délimiteur, les
redéfinitions d'alignement et le bundle de snapshot final. Son manifeste inclut
les noms, signatures, attributs et corps normalisés des routines. Le `DEFINER`
est neutralisé dans l'empreinte afin que le contrat soit reproductible sans
dépendre d'un compte local.

Le runner :

- reconstruit `001` puis `002` sur une base vide ;
- compare `information_schema.ROUTINES` à `SHOW PROCEDURE STATUS` ;
- exige `SHOW CREATE PROCEDURE` pour chaque routine et échoue si la définition
  est inaccessible ;
- adopte une `002` existante seulement en cas d'égalité exacte ;
- refuse un inventaire incomplet ;
- traite une définition divergente comme une mise à niveau, jamais comme une
  adoption, et exige un témoin vérifié ;
- sérialise les runners par verrou nommé et détecte la dérive du plan ;
- signale honnêtement les commits DDL potentiellement partiels.

La base de développement a été mise à niveau avec témoins ignorés avant chaque
révision de la migration pendant sa mise au point. Le témoin final vérifié est
`database/backups/mission-155-final-verified.json`, ignoré par Git. Son SHA-256
est `3418e71099be0eb959610446d9d9011d856a38ea73e5d63bc6370428b3eed0f5`.

## Écarts corrigés pendant le raccordement

- transactions internes des procédures rendues compatibles avec la transaction
  `SERIALIZABLE` possédée par le writer Node ;
- conservation des révisions initiales et optimistes des activités ;
- persistance complète des champs auteur, des identifiants de liens et des
  enveloppes média, provenance, métadonnées et tags ;
- projection correcte des `NULL` JSON ;
- suppression complète des agrégats temporaires sans relations orphelines ;
- filtre du snapshot sur les agrégats actifs ;
- réconciliation de disponibilité par procédure avec anciennes valeurs
  attendues ;
- attachement autorisé pour `available` et `unknown`, mais refusé pour
  `blocked`, `missing-local` et `pending-removal` ; ce dernier cas a été détecté
  par la recette SQL 129 ;
- recettes 133/136 réalignées sur 70 `CHECK` et sur le caractère évolutif des
  timestamps documentaires, sans modifier le schéma ni les données.

## SQL direct restant

Le runtime ne conserve que des requêtes techniques : identité de connexion,
grants, verrous nommés, paramètres de session et mise à jour de
`data_projection_metadata`. Les migrations, diagnostics et tests utilisent
également du SQL direct par nature. Aucun `SELECT`, `INSERT`, `UPDATE` ou
`DELETE` métier direct ne concurrence les procédures dans les adaptateurs
actifs.

## Droits applicatifs

Le contrôle du runtime confirme :

- droits de base : `SELECT`, `EXECUTE`, `SHOW CREATE ROUTINE` et `SHOW VIEW` ;
- droit de table limité : `UPDATE` sur `data_projection_metadata` ;
- aucun `INSERT`, `DELETE`, `UPDATE` métier global, droit structurel, droit de
  délégation ou privilège d'administration.

Le compte administratif n'est utilisé que par les migrations, les
reconstructions et les fixtures destructives de test. Aucun identifiant ni
secret n'est enregistré dans les fichiers suivis.

## Intégrité et nettoyage

L'empreinte des données protégées avant `002` et après toutes les mises à niveau
et recettes est identique :
`60688dff7dcf76ab84db4b04e885f99db2d30d74f535f3a562fc5789aa3c6e9f`.

Après validation : zéro base temporaire, zéro procédure helper de recette et
zéro ligne `m129_`, `m130_` ou `m133_`. Aucune autre base MariaDB n'a été ciblée
en écriture. Le dump global est toujours ignoré.

## Vérifications

- syntaxe Node des fichiers concernés : réussie ;
- tests du runner de schéma : 13/13 ;
- tests MariaDB runtime : 11/11 ;
- suite Proto05 complète : 129/129 ;
- reconstruction manifeste : 32 tables et 43 routines ;
- recettes SQL : 129, 130, 133, 136 et Vidéo++ réussies dans leur contexte
  approprié ;
- inspection et vérification du registre réel : réussies, action `none` ;
- vérification du compte applicatif et de ses grants : réussie ;
- smoke HTTP avec MariaDB réelle : santé `available`, version `0.1.49`, quatre
  activités projetées, `/teacher` et `/student/:id` en HTTP 200 ;
- `git diff --check` : réussi.

La recette 130 a été exécutée sur une base vide reconstruite, comme l'exige son
préambule. La recette 136 a été exécutée sur la base de développement car elle
contrôle les quatre lignes documentaires migrées ; ses écritures de test sont
annulées par `ROLLBACK`.

## Validation humaine minimale laissée à David

1. démarrer Proto05 avec MariaDB disponible ;
2. ouvrir `/teacher`, une activité existante, sa prévisualisation et sa vue
   étudiante ;
3. créer une activité jetable, la modifier, lui associer un média puis la
   supprimer ;
4. vérifier qu'un conflit de révision ouvert dans deux onglets reste refusé ;
5. confirmer que le mode diagnostic apparaît si MariaDB est arrêtée, puis que
   **Réessayer** rétablit les données après redémarrage.

Cette recette humaine n'est pas remplacée par les contrôles de Codex.

## Fichiers

Créés par les Missions 154–155 :

- `database/schema-migrations/*` ;
- `server/schema-migrations.js` ;
- `server/scripts/schema-migrations.js` ;
- `server/scripts/rebuild-schema-manifest.js` ;
- `server/test/schema-migrations.test.js` ;
- `reports/154_proto05_mariadb_migration_registry_and_baseline_report.md` ;
- `reports/154b_proto05_stored_procedures_inventory_and_baseline_correction_report.md` ;
- `reports/155_proto05_mariadb_canonical_procedures_runtime_report.md`.

Modifiés : SQL des procédures et recettes, adaptateurs MariaDB, diagnostic et
serveur, helpers/tests, `server/README.md`, version serveur et marqueur de fiche,
`.gitignore`, `docs/ARCHITECTURE.md`, `STATUS.md` et `PROJECTS_LAUNCH.md`.

## Limites factuelles

Les 19 procédures sans consommateur runtime restent testées comme contrats SQL,
mais leur présence ne constitue pas une fonctionnalité applicative active. Les
brancher demanderait de nouveaux parcours produit ou recréerait des writers
partiels concurrents ; la mission interdit précisément ces appels artificiels.

## Proposition de commit

`feat(proto05): make canonical MariaDB procedures the transactional runtime`
