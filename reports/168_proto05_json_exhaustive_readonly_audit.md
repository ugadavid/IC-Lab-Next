# Audit 168 — JSON exclusivement dans Proto05

Date : 1er août 2026  
Périmètre audité : `prototypes/05-augmented-ic-video-01`  
Version observée : `0.1.59` (inchangée)  
Nature : audit statique exhaustif en lecture seule  
Écriture autorisée : ce rapport uniquement  
Base, données, processus et fichiers Proto05 modifiés : aucun  
Commit/push : aucun

## 1. Conclusion exécutive

**Oui : MariaDB est déjà l’unique source de vérité métier du runtime réel de Proto05.**

La preuve actuelle est directe et ne dépend pas seulement des rapports historiques :

- `server/server.js:89` fixe `STORAGE_AUTHORITY = "mariadb"` ;
- `server/proto05-read-boundary.js:3-24` n’accepte qu’un adaptateur MariaDB ;
- `server/proto05-write-boundary.js:3-47` n’expose que l’adaptateur d’écriture MariaDB ;
- `server/server.js:3940-4004` construit ces deux adaptateurs et toutes les mutations passent par `persistMariaDbSnapshot()` ou par une mutation SQL spécialisée ;
- `server/server.js:5144-5167` répond en diagnostic/503 si MariaDB est indisponible : il n’existe aucun repli JSON ;
- les quatre anciens fichiers métier `data/activities.json`, `data/activity-library.json`, `data/video-catalog.json` et `data/video-library.json` sont absents ;
- `server/test/mariadb-only-runtime.test.js:379-395` fige statiquement l’absence de sélecteur, de fallback et de ces quatre chemins dans les fichiers runtime ;
- `reports/146_proto05_mariadb_only_json_backend_removal_report.md:7-25` documente le cutover qui les a retirés, mais le code actuel reste la preuve prioritaire.

Il ne subsiste **aucune double source de vérité active**. Il subsiste en revanche :

1. des outils historiques de migration JSON encore appelables manuellement ;
2. des lecteurs JSON dormants dans `media-library-runtime.js`, module chargé au runtime pour ses fonctions de projection pures ;
3. une sauvegarde historique de vidéothèque 0.1 contenant d’anciennes données métier ;
4. quatorze sauvegardes de schéma/registre MariaDB et deux sauvegardes runtime de migration ;
5. des textes documentaires et un message UI encore formulés comme si une sauvegarde métier `.bak` était produite.

Ces résidus n’affectent pas l’autorité actuelle, mais ils entretiennent une surface de confusion et de réactivation manuelle. Leur extermination doit être faite par petites missions séparées, strictement dans Proto05.

## 2. Méthode et limites

L’audit a inspecté le code, les documents actifs, les tests, les migrations historiques, les sauvegardes et tous les `*.json` présents dans Proto05. Les rapports Proto05 ont été consultés uniquement comme historique. Les lanceurs racine déjà connus ont été limités à `START_IC_LAB_NEXT.bat`, `STOP_IC_LAB_NEXT.bat`, `scripts/windows/{start-all.bat,stop-all.bat,launcher.ps1,launcher-services.json}`.

Les secrets `.env.local` n’ont pas été lus. Aucune connexion MariaDB, migration, restauration, suppression, écriture métier, exécution de serveur ou cycle START/STOP n’a été lancé. Les constats runtime sont établis statiquement ; la recette réelle de la Mission 167 constitue une preuve historique complémentaire, non rejouée ici.

Les appels `JSON.parse`, `JSON.stringify` et `response.json()` ont été séparés en trois natures :

- sérialisation de transport HTTP ou clonage en mémoire, qui n’est pas une persistance fichier ;
- sérialisation de colonnes JSON **dans MariaDB**, qui ne crée pas de seconde source de vérité ;
- lecture/écriture de vrais fichiers JSON, objet principal de cet audit.

### Catégories

| Code | Catégorie |
|---|---|
| C1 | JSON légitime à conserver |
| C2 | JSON de test légitime |
| C3 | JSON d’import/export assumé |
| C4 | Échafaudage temporaire de migration ou de comparaison |
| C5 | Ancienne persistance runtime encore active |
| C6 | Fallback ou double source de vérité dangereux |
| C7 | Fichier orphelin ou référence morte |
| C8 | Cas incertain à examiner |

Résultat : C5 = aucun ; C6 = aucun actif ; C8 = aucun après traçage.

## 3. Inventaire exact des 27 fichiers JSON présents

| Élément | Emplacement | Producteur | Consommateur | Lecture/écriture | Runtime réel ? | Autorité actuelle | Catégorie | Preuve |
|---|---|---|---|---|---|---|---|---|
| Contrat des migrations | `database/schema-migrations/manifest.json` | maintenance DBA/Proto05 | runner et vérification au démarrage | lecture ; écriture humaine | oui, contrôle de schéma | contrat technique | C1 | `schema-migrations.js:224-257`; `proto05-mariadb-readonly.js` appelle la vérification |
| Manifeste 001 | `database/schema-migrations/001_proto05_canonical_schema.manifest.json` | reconstructeur/maintenance | runner | lecture | oui | schéma attendu 001 | C1 | `schema-migrations.js:294-306` |
| Manifeste 002 | `database/schema-migrations/002_proto05_canonical_routines.manifest.json` | reconstructeur/maintenance | runner | lecture | oui | schéma attendu 002 | C1 | idem |
| Manifeste 003 | `database/schema-migrations/003_proto05_audio_anonymization.manifest.json` | reconstructeur/maintenance | runner | lecture | oui | schéma attendu 003 | C1 | idem |
| Manifeste 004 | `database/schema-migrations/004_proto05_working_copy_delete.manifest.json` | reconstructeur/maintenance | runner | lecture | oui | schéma attendu 004 | C1 | idem |
| Manifeste 005 | `database/schema-migrations/005_proto05_terminal_output_delete.manifest.json` | reconstructeur/maintenance | runner | lecture | oui | schéma attendu 005 | C1 | idem |
| Manifeste 006 | `database/schema-migrations/006_proto05_asset_delete_lineage.manifest.json` | reconstructeur/maintenance | runner | lecture | oui | schéma attendu courant | C1 | idem ; fingerprint courant documenté en Mission 167 |
| Package Node | `server/package.json` | maintenance du composant | npm/outillage | lecture | non par `node server.js`; oui si commande npm | configuration technique | C1 | scripts `start`, `test`, `schema:*`; launcher appelle directement Node |
| Fixture activité | `server/test/fixtures/layer-visibility.activity.json` | tests | tests d’UI/couches | lecture | non | fixture isolée | C2 | emplacement `server/test/fixtures` |
| Fixture médiathèque | `server/test/fixtures/media-library-canonical.valid.json` | tests | `media-library-contract.test.js` | lecture | non | fixture isolée | C2 | test lignes 13-14 |
| Sauvegarde Library 0.1 | `data/backups/mission-102-video-library-0.1.json` | Mission 102/installateur historique | migration documentaire 005 | lecture manuelle potentielle | non | ancien témoin JSON, pas autorité | C4 | `005_proto05_document_metadata_migration.mjs:82-84` |
| Sauvegarde pré-baseline 154 | `database/backups/mission-154-schema-registry-before-baseline.json` | `backup-registry` | restauration/forensic manuelle | lecture seule hors commande explicite | non | témoin MariaDB historique | C4 | format `proto05-schema-registry-backup/1` |
| Sauvegarde procédures 154b | `database/backups/mission-154b-stored-procedures-before.json` | inventaire Mission 154b | comparaison/restauration manuelle | lecture | non | témoin de procédures | C4 | format `proto05-stored-procedures-backup/1` |
| Sauvegarde 155 initiale | `database/backups/mission-155-before-002.json` | runner | vérification/reprise 155 | lecture | non | témoin historique | C4 | registre 001, fingerprint daté |
| Sauvegarde 155 révision 2 | `database/backups/mission-155-before-002-revision2.json` | runner | reprise 155 | lecture | non | témoin historique | C4 | registre 001 |
| Sauvegarde 155 révision 3 | `database/backups/mission-155-before-002-revision3.json` | runner | reprise 155 | lecture | non | témoin historique | C4 | registre 001 |
| Sauvegarde 155 révision 4 | `database/backups/mission-155-before-002-revision4.json` | runner | reprise 155 | lecture | non | témoin historique | C4 | registre 001 |
| Sauvegarde 155 révision 5 | `database/backups/mission-155-before-002-revision5.json` | runner | reprise 155 | lecture | non | témoin historique | C4 | registre 001 |
| Sauvegarde 155 révision 6 | `database/backups/mission-155-before-002-revision6.json` | runner | reprise 155 | lecture | non | témoin historique | C4 | registre 001 |
| Sauvegarde 155 révision 7 | `database/backups/mission-155-before-002-revision7.json` | runner | reprise 155 | lecture | non | témoin historique | C4 | registre 001 |
| Sauvegarde 155 révision 8 | `database/backups/mission-155-before-002-revision8.json` | runner | reprise 155 | lecture | non | témoin historique | C4 | registre 001 |
| Témoin final 155 | `database/backups/mission-155-final-witness.json` | runner | contrôle Mission 155 | lecture | non | témoin historique | C4 | registre 001-002 |
| Sauvegarde vérifiée 155 | `database/backups/mission-155-final-verified.json` | runner | contrôle Mission 155 | lecture | non | témoin historique | C4 | registre 001-002 |
| Sauvegarde post-tests 155 | `database/backups/mission-155-post-tests.json` | runner | contrôle Mission 155 | lecture | non | témoin historique | C4 | registre 001-002 |
| Sauvegarde pré-003 | `database/backups/mission-156-before-003-registry.json` | runner | reprise Mission 156 | lecture | non | témoin historique | C4 | registre 001-002 |
| Sauvegarde pré-006 périmée | `.runtime-migration-006-registry-backup.json` | runner Mission 167 | vérification d’une application/adoption | lecture uniquement si `--backup` explicite | non | témoin schéma 005 périmé | C4 | fingerprint `e59fe0…`, registre 001-005 |
| Sauvegarde d’adoption 006 | `.runtime-migration-006-adoption-registry-backup.json` | runner Mission 167 | récupération/forensic 006 | lecture uniquement si `--backup` explicite | non | témoin exact avant adoption | C4 | fingerprint `13e0e1…`, registre 001-005 |

Tous les 27 fichiers sont du JSON syntaxiquement lisible. Aucun `node_modules` n’existe sous Proto05 ; il n’y a donc aucun corpus tiers supplémentaire à exclure.

## 4. Mécanismes de lecture/écriture JSON

| Élément | Emplacement | Producteur | Consommateur | Lecture/écriture | Runtime réel ? | Autorité actuelle | Catégorie | Preuve |
|---|---|---|---|---|---|---|---|---|
| Transport API JSON | `server/server.js`, pages `teacher-*.html`, `guided-overlays.js`, `shared/*.js` | serveur/client | navigateur/serveur | `JSON.parse`, `JSON.stringify`, `response.json()` en mémoire/réseau | oui | MariaDB derrière l’API | C1 | `server.js:357-358`, nombreuses routes `readRequestBody`; aucune écriture fichier |
| Clonage déterministe | `media-library-runtime.js:16-17`, `server.js:1062-1067`, contrats | runtime | runtime | parse/stringify en mémoire | oui | projection MariaDB | C1 | aucun chemin fichier associé |
| Colonnes JSON MariaDB | `proto05-mariadb-readonly.js:87`, `proto05-mariadb-write.js:102-127` | procédures/adapter SQL | projection/écriture SQL | parse/stringify de valeurs SQL | oui | MariaDB | C1 | valeurs issues de requêtes/procédures, pas de fichier |
| Runner de migrations | `schema-migrations.js` | manifestes + MariaDB | démarrage/CLI | lit 7 manifestes ; peut écrire un backup JSON exclusif | oui en lecture ; écriture seulement commande admin | contrat technique | C1/C4 | lignes 224-306, 717-751 |
| Reconstructeur de manifeste | `scripts/rebuild-schema-manifest.js` | schéma temporaire | dernier manifeste | lit `manifest.json`, réécrit le manifeste cible | non ; commande admin explicite | outillage | C4 | lignes 50-62 ; script `schema:rebuild-manifest` |
| CLI de sauvegarde registre | `scripts/schema-migrations.js` | MariaDB | fichier choisi par `--output` | écrit JSON `wx` | non ; commande admin | recovery technique | C4 | lignes 100-108 |
| Migration JSON→MariaDB globale | `database/migrations/001_proto05_json_to_mariadb_dry_run.mjs`, `003_proto05_json_to_mariadb_apply.mjs` | anciens quatre JSON + langues externes | plan/DB si commande autorisée | lecture JSON ; 003 écrit MariaDB et dump SQL | non | ancien cutover | C4 | sources déclarées lignes 19-39 de 001 ; modes explicites de 003 |
| Métadonnées documentaires | `database/migrations/005_proto05_document_metadata_migration.mjs` | 15 sources JSON/BAK historiques | `data_projection_metadata` | lecture ; DDL/DML seulement modes explicites | non | ancien cutover | C4 | `SOURCE_FILES`, `DOCUMENTS`, `--apply` et hash gates |
| Réconciliation ciblée | `database/migrations/007_proto05_targeted_json_mariadb_reconciliation.mjs` | anciens JSON + média disque | MariaDB/artefacts choisis | lecture JSON ; écrit rapports et SQL/DML selon mode | non | outil historique | C4 | lignes 91-92, 566-580 |
| Migration catalogue langues | `server/scripts/migrate-language-catalog.js` | fichiers `--data` et `--catalog` | fichier `--data` | lecture ; copie `.bak`, temp, rename avec `--apply` | non | outil historique | C4 | lignes 150-208 |
| Migration Library pure | `server/media-library-migration.js` | objet fourni | objet canonique | mémoire uniquement | non hors tests/outils | transformation historique | C4 | appelée par install/dry-run/runtime helper |
| Dry-run Library | `server/media-library-dry-run.js` | chemins explicites | répertoire vide explicite | lit sources ; écrit 4 JSON isolés | non | artefacts de migration | C4 | lignes 44-69 |
| Installateur Library | `server/media-library-install.js` | chemins explicites | remplace le JSON désigné | lit, backup, temp, rename | non | ancien installateur | C4 | lignes 27-75 |
| Lecteurs dormants de Library | `server/media-library-runtime.js` | chemin ou objet | outils/tests ; serveur seulement pour projections pures | `readJsonSync`, `readCanonicalMediaLibraryAsync` peuvent lire un JSON | module oui, lecteurs non appelés | MariaDB | C4 | serveur importe seulement `projectCanonicalLibrary`, `canonicalFromRuntime`, `assertWritableCanonical`; aucune occurrence d’appel des lecteurs hors tests |
| Tests JSON isolés | `server/test/**`, `database/tests/*.mjs` | fixtures/temp | tests | read/write/copy/rename dans `%TEMP%` ou DB de test | non | fixtures | C2 | `media-library-*.test.js`, `language-migration.test.js` |
| Export de propositions roadmap | `ROADMAP.md:366,440` | fonctionnalité future | utilisateur | format JSON documenté, non implémenté comme backend | non | échange futur | C3 | documentation seulement |
| Backups média `.bak` | `server/server.js:1650,1746,1878` | suppression/copie/traitement | rollback immédiat runtime | copie binaire temporaire, pas JSON | oui | fichier média temporaire | hors JSON/C1 | chemins sous `os.tmpdir()`, supprimés/restaurés dans le flux |
| Message UI `.bak` obsolète | `shared/activity-library.js:360-373` | code UI | utilisateur supprimant une activité | aucune écriture réelle correspondante | oui, route utilisateur | MariaDB transactionnelle | C7 | texte « Une sauvegarde .bak sera créée » contredit `persistActivities()` SQL |
| Documentation serveur obsolète | `server/README.md:210,254-255,308-310,330-342,385` | historique documentaire | développeur/opérateur | décrit JSON/BAK anciens | oui comme documentation | MariaDB | C7 | contradiction avec section autorité lignes 10-14 et code actuel |
| Documentation modèle historique | `MEDIA_LIBRARY_MODEL.md:491-613` | historique | développeur | décrit `video-library.json` et `.bak` | documentaire | MariaDB | C7 | en-tête lignes 3-7 corrige le statut, sections historiques restent ambiguës |
| README racine historique | `README.md:18-30` | historique | développeur | mention langues JSON et sauvegarde `.bak` | documentaire | MariaDB | C7 | correction tardive lignes 205-206, ancien texte non contextualisé au début |

### Chemins dynamiques pouvant viser du JSON

- `schema-migrations.js:migrationContractPaths()` construit `database/schema-migrations/manifest.json`; `safeSourcePath()` borne les manifestes et sources au prototype.
- `rebuild-schema-manifest.js:56-62` construit le manifeste final depuis `latest.schemaManifest`.
- `schema-migrations.js:writeRegistryBackupExclusive()` écrit le chemin CLI fourni ; `scripts/schema-migrations.js` le résout explicitement.
- `media-library-{dry-run,install}.js` acceptent des chemins injectés par appelant ; aucun appel n’est exposé par le serveur ou `package.json`.
- `migrate-language-catalog.js:189-208` accepte `--data`, `--catalog`, `--backup` ; la commande n’est pas dans `package.json`.
- les migrations 001/005/007 construisent les quatre anciens chemins sous `data/`; ils échoueraient aujourd’hui car ces fichiers sont absents.
- les tests construisent leurs JSON sous un `mkdtemp()` et les détruisent ensuite.

## 5. Analyse détaillée des catégories C4 à C8

### 5.1 Outils historiques JSON→MariaDB (C4)

**Atteignabilité.** Ils ne sont appelés ni par `server.js`, ni par les frontières, ni par les launchers. Ils restent atteignables par commande Node directe ou `require()` manuel. `media-library-runtime.js` est chargé, mais ses lecteurs fichier ne sont pas invoqués.

**Routes/actions.** Aucune route HTTP ni action utilisateur. Commandes manuelles : migrations `001/003/005/007`, `scripts/migrate-language-catalog.js`, ou appel programmatique des modules `media-library-{dry-run,install}`.

**Données possibles.** Activités, authoring, fiches pédagogiques, dossiers d’activités, catalogue vidéo, assets/sources/playables, dossiers/tags, traitements/dérivations, métadonnées documentaires et catalogue de langues.

**Équivalent MariaDB.** Tables `activities` et tables `activity_*`; `media_assets`, `media_sources`, `media_playables`, `media_*`; `data_projection_metadata`; `languages`; procédures canoniques.

**Dépendances avant suppression.** Les migrations historiques servent de preuve/reproductibilité ; `proto05-mariadb-readonly.js` et `server.js` utilisent encore les fonctions pures de projection de `media-library-runtime.js`; les tests `media-library-*` couvrent encore le contrat historique.

**Risque de conservation.** Réactivation manuelle accidentelle d’un ancien import contre la base réelle, illusion qu’un backend JSON est supporté, et maintien des lecteurs fichier dans un module de production.

**Action minimale.** Isoler et documenter d’abord ; scinder ensuite les fonctions pures de projection des lecteurs historiques ; seulement après preuve d’absence de consommateur, archiver/supprimer les installateurs et scripts obsolètes dans une mission dédiée.

### 5.2 Sauvegarde métier Mission 102 (C4)

**Atteignabilité.** Absente du runtime ; référencée explicitement par la migration 005 et lisible manuellement.

**Données.** 152 587 octets, schéma 0.1, collections `assets`, `sources`, `playables`; elle peut contenir des identifiants et métadonnées désormais divergents de MariaDB.

**Équivalent MariaDB.** Tables média et colonnes JSON internes à MariaDB.

**Dépendances.** Hash attendu dans la migration documentaire 005 et valeur de preuve historique.

**Risque.** Confusion avec une sauvegarde restaurable actuelle ou réimport accidentel.

**Action minimale.** Isoler/documenter comme archive non restaurable ; ne pas supprimer avant d’avoir retiré ou figé la migration 005 historique.

### 5.3 Sauvegardes registre/procédures (C4)

**Atteignabilité.** Jamais lues automatiquement. Le runner ne lit une sauvegarde que si un opérateur fournit `--backup`. Il vérifie format, base, fingerprint, registre et témoin de données (`schema-migrations.js:737-751`) : les anciennes sauvegardes ne peuvent donc pas être silencieusement adoptées contre l’état courant.

**Données.** Structure SQL, manifestes observés, lignes `schema_migrations`, empreintes et témoins de tables ; la sauvegarde 154b contient les définitions de procédures.

**Équivalent MariaDB.** Schéma réel, `schema_migrations`, `information_schema` et données courantes.

**Dépendances.** Reprise forensic des Missions 154-167 et preuves des transitions.

**Risque.** Accumulation, exposition inutile d’un snapshot métier et choix du mauvais fichier par un opérateur ; le fail-closed réduit mais n’annule pas le risque documentaire.

**Action minimale.** Définir une politique de rétention ; conserver au minimum le dernier témoin validé et l’archive nécessaire à la preuve 006 ; déplacer ensuite les révisions intermédiaires vers une archive Proto05 clairement non opérationnelle, puis supprimer seulement avec autorisation.

### 5.4 Références mortes/obsolètes (C7)

**Atteignabilité.** Le texte `.bak` de `shared/activity-library.js` est réellement affichable via `/teacher` puis suppression d’une activité. Les passages README sont consultables par les développeurs.

**Données annoncées.** Une prétendue sauvegarde `activities.json.bak` et une persistance JSON d’authoring/classification qui n’existent plus.

**Équivalent MariaDB.** Transaction SQL et contrôle de concurrence ; aucune sauvegarde fichier par suppression.

**Dépendances.** Aucune dépendance métier ; seulement correction cohérente de texte et tests UI/documentaires.

**Risque.** Fausse promesse de récupération à David, mauvaise procédure d’exploitation, tentative de chercher/restaurer un fichier inexistant.

**Action minimale.** Corriger dans une petite mission documentaire/UI, avec test statique interdisant les affirmations `.bak` sur les parcours MariaDB.

### 5.5 C5, C6, C8

- **C5 — ancienne persistance runtime active : aucune.**
- **C6 — fallback/double source dangereuse : aucune active.** Les outils C4 pourraient devenir dangereux seulement par commande manuelle explicite ; ils ne constituent pas un fallback.
- **C8 — cas incertain : aucun après traçage.** Le seul module ambigu, `media-library-runtime.js`, est résolu : ses projections pures sont actives, ses lecteurs fichier sont dormants.

## 6. Couverture par domaine demandé

| Domaine | Lecture runtime | Écriture runtime | Autorité | Résidu JSON fichier |
|---|---|---|---|---|
| Activités | bundle MariaDB | procédures/transactions MariaDB | MariaDB | ancien backup/migrations seulement |
| Vidéothèque et actifs | projection MariaDB | procédures et mutations SQL | MariaDB | backup Mission 102 seulement |
| Fiches pédagogiques | tables `activity_pedagogical_*` | SQL via writer | MariaDB | migrations historiques |
| Authoring | tables `activity_*` | `sp_activity_replace_authoring` | MariaDB | aucune persistance fichier |
| Traitements/dérivations | `media_treatments`, lignage média | procédures spécialisées | MariaDB | anciens plans de migration |
| Dossiers/tags | `activity_folders`, `media_folders`, `media_tags` | SQL | MariaDB | aucun fichier actif |
| Utilisateurs/sessions | aucune gestion utilisateur/session métier | aucune | non implémenté | aucun JSON |
| Registre migrations | `schema_migrations` + manifestes techniques | ligne SQL contrôlée | MariaDB + contrat versionné | backups C4 |
| Sauvegarde/récupération | fichiers de témoin explicites | commande admin seulement | MariaDB courante | backups C4 |
| Anciennes données `activities.json`/Library | absentes | impossible par runtime | MariaDB | archive Mission 102 partielle et scripts historiques |

## 7. Références hors périmètre, signalées sans extension d’audit

| Chemin hors Proto05 | Référence depuis Proto05 | Statut limité |
|---|---|---|
| `shared/reference-data/languages.json` | migrations `001`, `005`, `007` et ancien `scripts/migrate-language-catalog.js` via `../../shared/reference-data/languages.json` | non ouvert comme nouveau périmètre ; référence historique seulement |
| `prototypes/00-ic-hub/server/node_modules/mysql2/promise` | résolution par défaut dans les CLI/adaptateurs Proto05 | dépendance Node externe au périmètre, non auditée |
| `prototypes/00-ic-hub/server/server.js` | test statique `mariadb-only-runtime.test.js:394` | preuve historique de non-lecture, fichier non audité |
| `scripts/windows/launcher-services.json` | `launcher.ps1:315`; entrée `proto05` | JSON technique légitime hors Proto05 : lance `node --env-file=../.env.local server.js`, aucun mode JSON métier |

Les lanceurs `START_IC_LAB_NEXT.bat` et `STOP_IC_LAB_NEXT.bat` ne transportent aucun chemin de données JSON. Ils délèguent au launcher commun ; aucune recommandation de modification hors Proto05 n’est formulée.

## 8. Listes finales exactes

### JSON encore impliqués dans le runtime réel

Fichiers du périmètre :

1. `database/schema-migrations/manifest.json` ;
2. `database/schema-migrations/001_proto05_canonical_schema.manifest.json` ;
3. `database/schema-migrations/002_proto05_canonical_routines.manifest.json` ;
4. `database/schema-migrations/003_proto05_audio_anonymization.manifest.json` ;
5. `database/schema-migrations/004_proto05_working_copy_delete.manifest.json` ;
6. `database/schema-migrations/005_proto05_terminal_output_delete.manifest.json` ;
7. `database/schema-migrations/006_proto05_asset_delete_lineage.manifest.json`.

Ils contrôlent la compatibilité du schéma ; ils ne contiennent aucune donnée métier utilisateur. `server/package.json` intervient avec npm/outillage, mais le launcher réel appelle directement `node server.js`.

Hors périmètre mais directement impliqué dans le lancement : `scripts/windows/launcher-services.json`, configuration technique du service Proto05.

### Écritures JSON encore possibles en production

**Par le serveur HTTP réel : aucune écriture de fichier JSON.**

Restent possibles uniquement par commande d’administration/développement explicite :

- `schema-migrations.js backup-registry --output=...` : nouveau snapshot de recovery ;
- `schema:rebuild-manifest` : réécriture du dernier manifeste de schéma ;
- scripts historiques `003/005/007`, `migrate-language-catalog.js`, `media-library-dry-run.js`, `media-library-install.js` : commandes manuelles, hors serveur et hors launcher ;
- tests : fichiers temporaires isolés.

Les réponses API JSON, corps de requêtes et valeurs sérialisées vers les colonnes JSON MariaDB ne sont pas des écritures de fichiers JSON.

### Doubles sources de vérité éventuelles

- Double source active : **aucune**.
- Fallback MariaDB→JSON : **aucun**.
- JSON→MariaDB automatique au démarrage : **aucun**.
- Risque latent : scripts historiques appelables manuellement et backup Mission 102 ; ils sont inactifs et ne sont pas chargés par une route ou un launcher.

### JSON légitimes à ne surtout pas supprimer

- les sept manifestes `database/schema-migrations/*.json` ;
- `server/package.json` ;
- les deux fixtures sous `server/test/fixtures/` ;
- toute sauvegarde de registre encore retenue par une procédure de recovery validée, notamment `.runtime-migration-006-adoption-registry-backup.json`, tant qu’une politique de rétention n’a pas été décidée ;
- hors périmètre et sans recommandation d’action : `scripts/windows/launcher-services.json`.

## 9. Plan d’extermination ordonné en petites missions

Toutes les actions ci-dessous sont strictement limitées à `prototypes/05-augmented-ic-video-01`. Aucune n’est exécutée par cet audit.

1. **Mission A — vérité documentaire/UI.** Retirer la promesse `.bak` de `shared/activity-library.js`; corriger les passages obsolètes de `README.md`, `server/README.md` et `MEDIA_LIBRARY_MODEL.md`; ajouter un test statique ciblé. Vérification : aucune mention active ne promet une sauvegarde JSON lors d’une mutation MariaDB.
2. **Mission B — séparation du module runtime.** Extraire les fonctions pures `projectCanonicalLibrary`, `canonicalFromRuntime`, `assertWritableCanonical` dans un module sans `fs`; faire dépendre le serveur et l’adaptateur MariaDB de ce module. Laisser temporairement les lecteurs historiques dans un module clairement nommé migration. Vérification : graphe runtime sans import `node:fs` causé par la compatibilité JSON.
3. **Mission C — inventaire d’appelabilité des outils historiques.** Pour chaque script 001/003/005/007, migration langue, dry-run et installateur Library, décider « preuve reproductible à conserver » ou « obsolète ». Ajouter un garde-fou refusant `ic_augmented_video` pour tout outil destiné seulement aux fixtures, ou documenter une procédure d’archive. Vérification : aucune commande historique ne peut écrire la base réelle par accident.
4. **Mission D — politique de rétention des backups.** Établir la matrice restauration/preuve pour les quatorze backups `database/backups` et les deux `.runtime-*`; conserver le minimum démontré, archiver ou supprimer les révisions redondantes après autorisation. Vérification : restauration documentée du dernier témoin, aucun fichier opérationnel ambigu.
5. **Mission E — retraite de la sauvegarde Mission 102.** Après avoir neutralisé les consommateurs historiques ou figé leur preuve, déplacer/archiver puis supprimer `data/backups/mission-102-video-library-0.1.json` avec témoin hash et autorisation explicite. Vérification : aucun import, test ou documentation ne la référence.
6. **Mission F — suppression des outils morts.** Supprimer seulement les scripts/modules classés obsolètes en Mission C et leurs tests strictement associés. Vérification : suite Proto05 complète, scan de chemins JSON, `git diff --check`, santé MariaDB-only sans démarrer de fallback.
7. **Mission G — garde-fou durable.** Étendre le test `le runtime ne contient plus de backend métier JSON sélectionnable` à tout le graphe de dépendances runtime et aux lanceurs Proto05, en autorisant explicitement seulement les manifestes techniques. Vérification : introduction d’un lecteur/écrivain métier JSON fait échouer le test.

## 10. Commandes de recherche utilisées

Les commandes ont été exécutées en lecture seule, sauf création de ce rapport par `apply_patch` :

```powershell
git status --short -- prototypes/05-augmented-ic-video-01 reports/...
Get-ChildItem prototypes/05-augmented-ic-video-01 -Recurse -Force -File -Filter *.json
Get-ChildItem prototypes/05-augmented-ic-video-01 -Recurse -Force -File | Where-Object Name -match '(bak|backup|snapshot|fixture|registry|manifest)'
rg --files prototypes/05-augmented-ic-video-01
rg -n --hidden -g '!*.env*' 'JSON\.(parse|stringify)|readFile|writeFile|rename|copyFile|\.json|\.bak|backup|snapshot|fixture' prototypes/05-augmented-ic-video-01
rg -n 'activities\.json|activity-library\.json|video-library\.json|video-catalog\.json|languages\.json|\.bak' prototypes/05-augmented-ic-video-01
rg -n 'createProto05ReadBoundary|createProto05WriteBoundary|STORAGE_AUTHORITY|persistMariaDbSnapshot|MARIADB_AVAILABILITY' prototypes/05-augmented-ic-video-01/server
rg -n 'readCanonicalMediaLibrary|projectCanonicalLibrary|media-library-(runtime|migration|dry-run|install)' prototypes/05-augmented-ic-video-01/server
rg -n -i 'JSON|MariaDB|fallback|source de vérité|autorité|\.bak' prototypes/05-augmented-ic-video-01/{README.md,MEDIA_LIBRARY_MODEL.md,ROADMAP.md,server/README.md}
rg -n -i 'Proto05|activities\.json|video-library\.json|fallback|source de vérité' reports/...
rg -n 'launcher-services\.json|proto05|05-augmented-ic-video-01|env-file' START_IC_LAB_NEXT.bat STOP_IC_LAB_NEXT.bat scripts/windows/...
```

## 11. État Git, vérifications et validation

- Aucun fichier Proto05 n’a été modifié par l’audit.
- Aucune base, donnée ou processus n’a été touché.
- Aucun test dynamique n’a été lancé : l’analyse statique suffisait et évitait toute fixture MariaDB ou processus.
- Seul ce rapport 168 a été créé.
- Version : `0.1.59`, inchangée.
- Validation humaine : non réalisée ; les recommandations restent des missions proposées.

Message de commit proposé pour le rapport seul : `docs(proto05): audit remaining JSON surfaces after MariaDB cutover`
