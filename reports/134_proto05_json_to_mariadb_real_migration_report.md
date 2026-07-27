# Mission 134 — Proto05 — Migration réelle des JSON canoniques vers MariaDB

Date : 27 juillet 2026

Périmètre : Proto05 et base locale `ic_augmented_video` uniquement

Statut : **migration committée, réconciliée et protégée contre un second import**

Version applicative : **0.1.45, inchangée**

## Résultat

Les données du plan validé en Mission 133 ont été importées dans
`ic_augmented_video` :

| Indicateur | Résultat |
|---|---:|
| Lignes persistées | 264 |
| Tables alimentées | 27 |
| Lignes manquantes | 0 |
| Lignes supplémentaires | 0 |
| Valeurs divergentes | 0 |
| Références orphelines | 0 |
| Blocages du plan | 0 |
| Avertissements qualifiés | 22 |
| Hash du plan | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |
| Hash de lecture MariaDB | `5701301f90c874d2632ba5e0b9d2c138ff43c2e19964d3ac8051a65919c32f20` |

L’application n’a pas été basculée vers MariaDB. Ses routes, son interface et
son fonctionnement JSON restent inchangés.

## Checkpoint et préflight

- branche : `main` ;
- commit de départ :
  `94b03c68dcdf1ae383215d5f17d74de67d538bee` ;
- libellé du commit :
  `feat(proto05): align MariaDB schema with canonical JSON` ;
- état Git initial : propre ;
- version Proto05 : `0.1.45`.

Les dry-runs exécutés depuis la racine du workspace et depuis le dossier
Proto05 ont chacun confirmé :

- 435 chemins ;
- 3 222 occurrences conciliées ;
- 264 lignes dans 27 tables ;
- 0 blocage ;
- 22 avertissements ;
- hash
  `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233`.

État MariaDB initial :

| Objet | Nombre |
|---|---:|
| tables InnoDB | 31 |
| procédures | 43 |
| FK | 48 |
| contraintes `CHECK` | 65 |
| triggers | 0 |
| événements | 0 |
| lignes totales | 0 |

Les 31 tables ont été comptées séparément à zéro. Toute destination non vide,
toute divergence de hash, de schéma ou d’avertissement aurait interrompu
l’exécution avant écriture.

## Intégrité des quinze JSON

Les SHA-256 initiaux et finaux sont identiques :

| Fichier | SHA-256 |
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

Aucun de ces fichiers n’a été écrit.

## Sauvegarde pré-migration

Sauvegarde complète hors dépôt :

`C:\Users\david\AppData\Local\Temp\proto05_ic_augmented_video_before_m134_data_20260727.sql`

| Propriété | Valeur |
|---|---|
| taille | 209 372 octets |
| SHA-256 | `153A735DFAEA1AB4EF758C8DB83AB166609DF420267586B54BB79A8D2CEFA40F` |
| tables détectées | 31 |
| procédures détectées | 43 |
| lisibilité | réussie |

Le dump inclut schéma, contraintes, routines, triggers, événements et données.
Il a été vérifié statiquement sans restauration ni création d’une autre base.
Aucun fichier existant n’a été écrasé.

## Script transactionnel

Fichier créé :

`prototypes/05-augmented-ic-video-01/database/migrations/003_proto05_json_to_mariadb_apply.mjs`

Le dry-run expose désormais son modèle préparé à l’import, sans modifier son
calcul ni son interface en ligne de commande. Le migrateur réutilise donc
directement `deterministicResult` et ne maintient aucun second mapping JSON vers
SQL.

Modes :

- mode par défaut et `--verify-only` : lecture seule ;
- `--backup` : dump complet hors dépôt ;
- `--rollback-test` : transaction réelle avec échec contrôlé avant commit ;
- `--apply` : import initial transactionnel.

Protections de `--apply` et `--rollback-test` :

- base exacte `ic_augmented_video` ;
- hash exact du plan ;
- confirmation littérale de l’intention d’écrire ;
- sauvegarde complète existante et vérifiée ;
- verrou MariaDB nommé, limité à cette migration ;
- nouvelle vérification des 31 tables après acquisition du verrou ;
- une seule connexion pour la transaction ;
- moteurs InnoDB confirmés ;
- FK et `CHECK` laissés actifs ;
- aucun `INSERT IGNORE`, `REPLACE`, upsert ou désactivation de FK ;
- rollback sur erreur, interruption ou divergence ;
- refus de toute nouvelle catégorie ou quantité d’avertissement.

Le pilote `mysql2` déjà présent dans le workspace est utilisé uniquement par
l’outil de migration. Aucune dépendance n’a été installée et aucune dépendance
applicative n’a été ajoutée. Le secret MariaDB est lu en mémoire depuis
l’environnement interne du conteneur ; il n’est ni argument, ni log, ni fichier.

Commande d’application expurgée :

```text
node database/migrations/003_proto05_json_to_mariadb_apply.mjs \
  --apply \
  --database=ic_augmented_video \
  --expected-plan-hash=<hash validé> \
  --confirm=<confirmation explicite> \
  --backup-file=<sauvegarde hors dépôt>
```

## Test de rollback

Le premier essai de mise au point a détecté, avant tout commit :

- l’activation automatique de `media_assets.updated_at` lors de l’affectation
  différée du playable par défaut ;
- une différence d’ordre entre `localeCompare` et la collation MariaDB.

La transaction a été annulée et une lecture indépendante a confirmé zéro ligne.
Le migrateur a ensuite été corrigé pour restaurer explicitement le timestamp
source et rapprocher les lignes par clé primaire plutôt que par position.

Le scénario contrôlé final a :

1. acquis le verrou ;
2. vérifié la destination vide ;
3. inséré les 264 lignes ;
4. concilié les 264 lignes avant commit ;
5. injecté `CONTROLLED_ROLLBACK_TEST` ;
6. exécuté `ROLLBACK` ;
7. libéré le verrou ;
8. ouvert une nouvelle connexion ;
9. confirmé les 31 tables à zéro.

Résultat : `status=rolled-back`, `totalRowsAfterRollback=0`.

## Réconciliation avant et après commit

La comparaison porte sur toutes les colonnes effectivement produites par le
plan, table par table et clé primaire par clé primaire. Les objets JSON sont
comparés après ordre canonique des propriétés ; les dates, nombres, booléens et
`NULL` sont normalisés uniquement selon leur représentation SQL.

Le hash MariaDB est calculé sur une projection canonique des 31 tables :

```text
méthode = proto05-mariadb-plan-columns-v1
tables + clés primaires + colonnes du plan + valeurs relues normalisées
```

Il n’est pas directement comparable au hash du plan, lequel inclut aussi les
sources, le schéma et la couverture. La correspondance est prouvée séparément
par zéro ligne et zéro valeur divergente.

| Contrôle | Avant commit | Après commit |
|---|---:|---:|
| lignes | 264 | 264 |
| tables alimentées | 27 | 27 |
| écarts | 0 | 0 |
| orphelins | 0 | 0 |
| hash MariaDB | `5701301f90c874d2632ba5e0b9d2c138ff43c2e19964d3ac8051a65919c32f20` | `5701301f90c874d2632ba5e0b9d2c138ff43c2e19964d3ac8051a65919c32f20` |

Invariants vérifiés :

- 4 intervalles avec `segment_id = NULL` ;
- 2 traitements `completed`, pourvus d’une sortie et non publiés ;
- 2 activités avec `layer_configuration_id` ;
- 0 description média non nulle, conformément aux sources actuelles ;
- 0 couleur de tag non nulle, conformément aux sources actuelles ;
- 2 liens média principaux canoniques ;
- aucun segment ni aucune publication inventés.

## Table de réconciliation

| Table | Plan attendu | Avant migration | Après migration | Écarts |
|---|---:|---:|---:|---:|
| `activities` | 2 | 0 | 2 | 0 |
| `activity_annotations` | 11 | 0 | 11 | 0 |
| `activity_folders` | 1 | 0 | 1 | 0 |
| `activity_language_intervals` | 26 | 0 | 26 | 0 |
| `activity_languages` | 6 | 0 | 6 | 0 |
| `activity_layer_visibility` | 14 | 0 | 14 | 0 |
| `activity_layers` | 7 | 0 | 7 | 0 |
| `activity_media_links` | 2 | 0 | 2 | 0 |
| `activity_overlay_layers` | 14 | 0 | 14 | 0 |
| `activity_overlays` | 6 | 0 | 6 | 0 |
| `activity_pedagogical_identities` | 1 | 0 | 1 | 0 |
| `activity_pedagogical_qualifications` | 0 | 0 | 0 | 0 |
| `activity_pedagogical_text_fields` | 9 | 0 | 9 | 0 |
| `activity_phenomena` | 26 | 0 | 26 | 0 |
| `activity_segment_languages` | 22 | 0 | 22 | 0 |
| `activity_segment_speakers` | 13 | 0 | 13 | 0 |
| `activity_segments` | 11 | 0 | 11 | 0 |
| `activity_speakers` | 5 | 0 | 5 | 0 |
| `activity_transcriptions` | 2 | 0 | 2 | 0 |
| `import_runs` | 0 | 0 | 0 | 0 |
| `languages` | 4 | 0 | 4 | 0 |
| `media_asset_tags` | 3 | 0 | 3 | 0 |
| `media_assets` | 16 | 0 | 16 | 0 |
| `media_folders` | 1 | 0 | 1 | 0 |
| `media_playable_metadata` | 19 | 0 | 19 | 0 |
| `media_playables` | 19 | 0 | 19 | 0 |
| `media_sources` | 19 | 0 | 19 | 0 |
| `media_tags` | 3 | 0 | 3 | 0 |
| `media_treatments` | 2 | 0 | 2 | 0 |
| `schema_migrations` | 0 | 0 | 0 | 0 |
| `storage_operations` | 0 | 0 | 0 | 0 |
| **Total** | **264** | **0** | **264** | **0** |

## Les 22 avertissements

| Code | Nombre | Objet et justification |
|---|---:|---|
| `ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE` | 2 | ancien `kind` HLS et ancien `proxyUrl`; le playable YouTube canonique est importé |
| `ACTIVITY_TIMESTAMP_FALLBACK` | 2 | absence de date d’activité ; timestamp déterministe du document utilisé |
| `AVAILABLE_LOCAL_FILE_MISSING` | 7 | anciennes vidéos de développement absentes ; disponibilité normalisée sans enquête |
| `MEDIA_LINEAGE_RECONSTRUCTED` | 10 | lignée reconstruite depuis la provenance historique explicite |
| `SEMANTIC_INTERVAL_DUPLICATE` | 1 | deux identifiants distincts portent le même intervalle ; les deux sont conservés |
| **Total** | **22** | aucune nouvelle catégorie ni occurrence |

## Seconde exécution

La même commande `--apply` a été relancée après le commit.

Résultat attendu et obtenu :

- code non nul ;
- `DESTINATION_NOT_EMPTY` ;
- 264 lignes déjà présentes ;
- aucune insertion, mise à jour ou suppression ;
- aucun doublon ;
- zéro écart et zéro orphelin sur la lecture existante ;
- hash MariaDB inchangé :
  `5701301f90c874d2632ba5e0b9d2c138ff43c2e19964d3ac8051a65919c32f20`.

## Autres bases et schéma final

| Témoin | Avant | Après |
|---|---|---|
| `ic_dico` | 8 tables, 0 vue, 9 procédures, données `786bd80a39604d9d25bdfd91286b5652b87c9f814afc10dd178dbde5dbb4815c` | identique |
| `ic_hub` | 15 tables, 1 vue, 3 procédures, données `3ae48844ed0b426479baf1b4d80f2b8d05352ca88cb5a03a00daceb8b68e2382` | identique |

État final de `ic_augmented_video` :

- 31 tables InnoDB ;
- 43 procédures ;
- 48 FK ;
- 65 `CHECK` ;
- 0 trigger ;
- 0 événement ;
- 264 lignes dans 27 tables ;
- aucune modification de schéma ou de procédure.

## Tests exécutés

- syntaxe Node des trois fichiers de migration/test : réussie ;
- auto-tests du dry-run : **22/22** ;
- tests du contrat média : **52/52** ;
- tests spécifiques du migrateur : **6/6** ;
- recette SQL ciblée Mission 133 : **16/16**, fixtures supprimées ;
- dry-run réel après migration : hash et bilan inchangés ;
- rollback volontaire : réussi, zéro ligne persistée ;
- réconciliation avant commit : réussie ;
- réconciliation après commit : réussie ;
- seconde tentative : refusée sans écriture ;
- quinze hashes JSON avant/après : identiques ;
- témoins des autres bases avant/après : identiques.

## Fichiers concernés

Créés :

- `prototypes/05-augmented-ic-video-01/database/migrations/003_proto05_json_to_mariadb_apply.mjs` ;
- `prototypes/05-augmented-ic-video-01/database/tests/005_proto05_json_to_mariadb_apply.test.mjs` ;
- `reports/134_proto05_json_to_mariadb_real_migration_report.md`.

Modifié :

- `prototypes/05-augmented-ic-video-01/database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` — export minimal du plan préparé et garde d’exécution directe ; comportement, auto-tests et hash inchangés.

Aucun JSON, fichier SQL, schéma, procédure, route, interface, package ou fichier
de version n’a été modifié.

## Limites et suites

- MariaDB contient désormais une copie canonique conciliée, mais l’application
  continue à utiliser les JSON comme source de vérité.
- Aucune synchronisation, mise à jour incrémentale, bascule applicative ou
  écriture bidirectionnelle n’a été commencée.
- Chromium et FFmpeg n’ont pas été lancés.
- La validation est automatisée et MariaDB ; elle ne vaut pas validation
  fonctionnelle humaine de David.

## État Git final

- branche : `main` ;
- HEAD inchangé :
  `94b03c68dcdf1ae383215d5f17d74de67d538bee` ;
- version : `0.1.45`, inchangée ;
- aucun commit ;
- aucun push ;
- `git diff --check` : réussi.

Message de commit proposé, non exécuté :

```text
feat(proto05): migrate canonical JSON data to MariaDB
```
