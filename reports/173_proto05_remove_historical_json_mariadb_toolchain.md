# Mission 173 — Retrait physique de la chaîne historique JSON → MariaDB de Proto05

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.60` (inchangée)  
État initial : dépôt propre, commit `82596df` (Mission 172).

## Résultat

La chaîne exécutable historique qui lisait les anciennes sources métier JSON
pour construire, appliquer, compléter ou réconcilier MariaDB a été supprimée.
Le mapping relationnel de production demeure dans
`server/proto05-relational-mapping.mjs` et le repository d'écriture le charge
directement.

MariaDB reste l'unique autorité métier. Aucune ancienne source JSON n'a été
recréée, aucune base ou migration n'a été modifiée et aucune politique de
rétention n'a été appliquée aux archives.

La version reste `0.1.60` : il s'agit du retrait d'outils internes déjà hors
runtime, sans modification du comportement applicatif.

## Graphe des consommateurs avant suppression

| Élément | Consommateurs observés juste avant suppression | Consommateur fonctionnel actuel ? | Décision |
|---|---|---:|---|
| `001_proto05_json_to_mariadb_dry_run.mjs` | 003 et 007 ; wrapper de compatibilité testé par `relational-mapping-extraction.test.js` | non ; le runtime utilise le module extrait depuis 172 | supprimer ; remplacer le test d'équivalence au wrapper par des fingerprints stricts du nouveau module |
| `003_proto05_json_to_mariadb_apply.mjs` | 005 ; `database/tests/005...` ; garde 009 | non | supprimer avec son test dédié |
| `005_proto05_document_metadata_migration.mjs` | `database/tests/007...` ; garde 009 ; commentaire historique dans le DDL 004 | non | supprimer avec son test ; actualiser le commentaire sans supprimer le DDL |
| `007_proto05_targeted_json_mariadb_reconciliation.mjs` | garde 009 uniquement | non | supprimer |
| `historical-test-database-guard.mjs` | exclusivement 003, 005 et 007 | non après retrait des outils | supprimer comme compatibilité morte |

Les recherches ont couvert `server.js`, repositories, routes et scripts du
serveur, `server/package.json`, le chargeur de migrations techniques, les
launchers racine START/STOP et le code partagé explicitement Proto05. Aucun
import, appel, commande npm, route, launcher ou script d'installation ne
référençait la chaîne.

Les anciens tests à **21/24** ne protégeaient aucun contrat de production :
leurs trois échecs dépendaient précisément des anciennes sources absentes. Ils
ont été retirés avec les outils au lieu d'être rendus artificiellement verts.

## Fichiers supprimés

Outils :

- `database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` ;
- `database/migrations/003_proto05_json_to_mariadb_apply.mjs` ;
- `database/migrations/005_proto05_document_metadata_migration.mjs` ;
- `database/migrations/007_proto05_targeted_json_mariadb_reconciliation.mjs` ;
- `database/migrations/historical-test-database-guard.mjs`.

Tests exclusivement dédiés :

- `database/tests/005_proto05_json_to_mariadb_apply.test.mjs` ;
- `database/tests/007_proto05_document_metadata_migration.test.mjs` ;
- `database/tests/009_historical_json_tool_guards.test.mjs`.

Ces suppressions restent récupérables par Git tant qu'elles ne sont pas
commitées. Aucune archive métier n'a été touchée.

## Références retirées ou actualisées

- `server/README.md` ne présente plus les anciens exécutables comme des outils
  encore conservés ; il distingue le retrait de la chaîne JSON des contrats
  techniques toujours actifs.
- Le commentaire de `database/migrations/004_proto05_document_metadata_schema.sql`
  ne renvoie plus à l'installateur 005 supprimé. Ce DDL historique est conservé
  et explicitement contextualisé.
- `server/test/relational-mapping-extraction.test.js` n'importe plus 001 et ne
  lance plus son CLI. Il verrouille maintenant les fingerprints déterministes
  du modèle (`591a9d5c…9bfd2`) et des définitions (`332e695a…1b9b`), puis vérifie
  l'absence physique des quatre outils.

Aucune entrée de `package.json` ou launcher n'a dû être retirée : aucune ne
permettait d'invoquer ces scripts.

## Éléments explicitement préservés

- `server/proto05-relational-mapping.mjs` et
  `server/proto05-mariadb-write.js` ;
- les six manifestes JSON techniques 001 à 006, leur manifeste registre et
  leurs SQL ;
- `server/schema-migrations.js` et `server/scripts/schema-migrations.js` ;
- les DDL historiques SQL 002, 004 et 006 sous `database/migrations/` ;
- toutes les sauvegardes, archives et fichiers de registre soumis à rétention ;
- `media-library-runtime.js`, `media-library-install.js`,
  `media-library-dry-run.js`, `media-library-migration.js` et leurs tests ;
- `server/scripts/migrate-language-catalog.js` et son test ;
- toutes les fixtures encore utilisées ;
- configurations techniques et `server/package.json`.

## Preuve de non-confusion avec les migrations techniques

Les suppressions visent exclusivement quatre fichiers exécutables `.mjs` sous
`database/migrations/`. Le répertoire `database/schema-migrations/` est intact :

1. `001_proto05_canonical_schema.manifest.json` ;
2. `002_proto05_canonical_routines.manifest.json` ;
3. `003_proto05_audio_anonymization.manifest.json` ;
4. `004_proto05_working_copy_delete.manifest.json` ;
5. `005_proto05_terminal_output_delete.manifest.json` ;
6. `006_proto05_asset_delete_lineage.manifest.json`.

Le chargement direct de `loadMigrationContract()` retourne exactement
`001,002,003,004,005,006` et 6 migrations. Le test d'isolation charge également
ces manifestes sans donnée métier. Aucun manifeste ou SQL technique n'apparaît
dans le diff comme supprimé ou modifié.

## Tests et contrôles

| Contrôle | Résultat |
|---|---|
| mapping, isolation runtime, projection activité, contrat/availability/migration Library, annotations | **91/91** |
| contrôles statiques ciblés vidéothèque et suppression (`video-workspaces.test.js`, pattern excluant la recette serveur) | **9/9** |
| `relational-mapping-extraction.test.js` | **4/4**, fingerprints stricts et absence des quatre fichiers |
| `runtime-json-isolation.test.js` | **4/4**, repositories MariaDB sans fallback et manifestes chargeables |
| chargement direct du contrat technique | 6 migrations, exactement 001–006 |
| recherche des anciens noms | occurrences restantes limitées aux assertions négatives qui prouvent leur absence ; aucun import/appel/commande |
| recherche de `data/activities.json` créé | aucun fichier |
| `git diff --check` | réussi |

### Contrôles non exécutés et incident de sélection

Les suites `schema-migrations.test.js` et `mariadb-only-runtime.test.js` n'ont
pas été exécutées : elles ouvrent des connexions et créent ou modifient des
bases temporaires/réelles, ce que la mission interdit.

Une première sélection incluait l'intégralité de `video-workspaces.test.js`.
Ses 103 tests unitaires/statistiques ont réussi, mais son dernier test a démarré
un serveur temporaire malgré l'intention de rester statique ; celui-ci est
resté en mode diagnostic et a échoué avec
`PROTO05_MIGRATION_REGISTRY_INVALID`, puis le helper s'est nettoyé. Aucun serveur
de production, aucune migration et aucune écriture métier n'ont été lancés. Ce
test n'a pas été relancé. Une seconde exécution limitée explicitement aux neuf
contrats statiques de projection/suppression a réussi 9/9.

Il n'y a pas de validation UI, HTTP réelle ou validation humaine de David à
revendiquer.

## Éléments non supprimés et justification

- Les DDL SQL 002/004/006 restent des preuves et contrats historiques utilisés
  par les tests/manifestes actuels ; ils ne sont pas les exécutables visés.
- Les outils `media-library-*` et `migrate-language-catalog.js` sont réservés à
  un lot séparé par la mission.
- Les archives et sauvegardes nécessitent encore une décision explicite de
  rétention ; elles restent intactes.
- Les noms des quatre outils subsistent seulement dans deux tests de garde sous
  forme d'assertions d'absence, jamais comme chemin exécutable.

## Prochain lot recommandé

Selon la matrice 171 : traiter séparément
`media-library-runtime.js` avec `media-library-install.js` et leur test, après
avoir retiré toute dernière dépendance historique ; décider ensuite si le
dry-run Library doit être archivé comme preuve reproductible. Le CLI de langues
et les archives doivent rester des décisions distinctes, et la rétention des
sauvegardes ne doit pas être couplée à une suppression de code.

## État Git final

Le diff contient huit suppressions ciblées, trois adaptations conservées
(`server/README.md`, le test de mapping et le commentaire du DDL 004) et ce
rapport. Aucun fichier n'est indexé. Aucun commit ni push n'a été effectué.

## Message de commit proposé

`chore(proto05): remove historical JSON to MariaDB toolchain`
