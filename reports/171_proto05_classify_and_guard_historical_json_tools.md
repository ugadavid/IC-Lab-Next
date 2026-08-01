# Mission 171 — Classification et sécurisation des outils historiques JSON de Proto05

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.60` (inchangée)  
Nature des contrôles : analyse statique et tests locaux isolés ; aucune base, migration ou donnée métier réelle utilisée.

## Résultat

Les lecteurs historiques restent absents du graphe du serveur de production et MariaDB reste l’unique autorité métier. Les trois CLI historiques capables d’ouvrir ou de modifier une base (`003`, `005`, `007`) refusent désormais, avant lecture des identifiants, construction du plan ou connexion :

- toute cible absente ou implicite ;
- la base réelle `ic_augmented_video` ;
- tout nom qui n’est pas explicitement une base temporaire Proto05 (`proto05_test_*` ou `proto05_m<mission>_*`).

Aucun outil, test, JSON, archive ou sauvegarde n’a été supprimé. La version de production reste `0.1.60`, car le runtime n’a pas été modifié.

## Matrice de classification

| Élément | Catégorie | Point d’entrée et accessibilité | Entrées JSON | Sorties / effets possibles | Consommateurs et tests | Utilité / équivalent MariaDB / dépendances |
|---|---|---|---|---|---|---|
| `server/media-library-migration.js` | **composant pur encore utilisé** | `require()` seulement ; aucune E/S fichier | objet Library 0.1 injecté | objet Library 1.0 et diagnostics, en mémoire | `media-library-projection.js` au runtime ; `media-library-migration.test.js`, install/dry-run | transformation pure utilisée par `canonicalFromRuntime`; MariaDB fournit les entités projetées. À conserver tant que cette projection en dépend. |
| `server/media-library-runtime.js` | **candidat à suppression** | `require()` manuel ; hors graphe serveur depuis 170 | chemin ou objet Library 0.1/1.0 | lecture synchrone/asynchrone et projection mémoire | `media-library-install.test.js`; migration historique `007` utilise encore `projectCanonicalLibrary` | les lecteurs sont remplacés par les repositories MariaDB et la projection pure par `media-library-projection.js`. Dépendances à déplacer avant suppression : le test historique et l’import de 007. |
| `server/media-library-install.js` | **candidat à suppression** | appel programmatique explicite uniquement | Library legacy, catalogue, activités et disponibilité locale | backup exclusif, fichier temporaire, renommage atomique vers un JSON canonique | `media-library-install.test.js` | ancien installateur d’une persistance désormais abandonnée ; équivalent actuel : écritures transactionnelles MariaDB. À supprimer avec son test après décision de rétention. |
| `server/media-library-dry-run.js` | **preuve historique reproductible** | appel programmatique explicite uniquement | chemins legacy/catalogue/activités et média, tous injectés | quatre artefacts JSON dans un répertoire explicitement vide et isolé ; source inchangée | `media-library-dry-run.test.js` | reproduit la transformation historique sans toucher MariaDB. Peut être archivé avec son test et ses fixtures ; aucune dépendance runtime. |
| `server/scripts/migrate-language-catalog.js` | **outil obsolète** | CLI Node directe avec `--data`, `--catalog`, facultativement `--apply --backup`; aucun script npm/runtime | ancien magasin d’activités et catalogue de langues explicitement fournis | dry-run mémoire ou copie `.bak`, temporaire et remplacement atomique du JSON désigné | `language-migration.test.js` | l’autorité actuelle est MariaDB (`languages` et références d’activités). Conserver uniquement jusqu’à décision d’archivage/suppression conjointe du test. |
| `database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` | **cas incertain** (fichier mixte) | CLI historique directe, mais exports importés par `server/proto05-mariadb-write.js` | CLI : quatre sources JSON historiques ; runtime : snapshots/objets canoniques déjà reconstruits depuis MariaDB | CLI : plan/diagnostics en sortie standard, sans DB ; exports purs : modèle relationnel en mémoire | `003`, `005`, `007`; tests DB historiques ; production utilise `relationalModelFromCanonicalSnapshot` et définitions associées | le CLI est ancien, mais le noyau de mapping est un composant de production. Avant suppression physique, extraire les exports purs dans un module sans lecteur JSON, puis adapter le repository et ses tests. |
| `database/migrations/003_proto05_json_to_mariadb_apply.mjs` | **candidat à suppression** | CLI directe seulement ; modes verify/backup/rollback/apply | plan produit par 001 et anciennes sources ; backup SQL explicite | connexion MariaDB, dump, insertions transactionnelles ou rollback | `database/tests/005...`; importé par 005 pour plan/backup | ancien cutover initial, non reproductible sans sources supprimées. Remplacé par schéma, repositories et runner MariaDB actuels. Désormais limité aux bases de test explicites. |
| `database/migrations/005_proto05_document_metadata_migration.mjs` | **candidat à suppression** | CLI directe seulement ; modes dry-run/verify/install/rollback/apply | quinze sources historiques protégées par hashes, dont archives JSON/BAK | DDL de métadonnées, insertions, vérification et rollback | `database/tests/007...`; dépend de 001 et 003 | ancien enrichissement initial de `data_projection_metadata`, aujourd’hui autorité MariaDB. Le checkpoint complet n’est plus reproductible sans son jeu de sources. Désormais limité aux bases de test explicites. |
| `database/migrations/007_proto05_targeted_json_mariadb_reconciliation.mjs` | **outil obsolète** | CLI directe seulement ; inspect/compare/verify/repair/rollback/apply | ancienne Library JSON, plan 001, médias et backup explicite | comparaisons, artefact JSON choisi, DML ciblé ou rollback | aucun test fonctionnel historique dédié recensé ; nouveau test de garde ; importe encore `media-library-runtime.js` | les sources legacy requises ont disparu et les repositories/procédures MariaDB assurent le fonctionnement actuel. À archiver ou supprimer après conservation des preuves utiles. Désormais limité aux bases de test explicites. |

## Classification des tests associés

| Test | Classement | Contrat couvert | Sort recommandé |
|---|---|---|---|
| `server/test/media-library-migration.test.js` | test de composant pur actif | transformation déterministe, diagnostics, immutabilité | conserver avec `media-library-migration.js` |
| `server/test/media-library-install.test.js` | test historique isolé | backup exclusif et installation atomique JSON | supprimer ultérieurement avec installateur et lecteur runtime, ou archiver ensemble |
| `server/test/media-library-dry-run.test.js` | preuve historique reproductible | sorties confinées à un répertoire temporaire vide | archiver avec le dry-run |
| `server/test/language-migration.test.js` | test historique isolé | remapping et écriture atomique sur fichiers temporaires | archiver/supprimer avec le CLI |
| `database/tests/005_proto05_json_to_mariadb_apply.test.mjs` | test historique partiellement reproductible | garde CLI, SQL strict et checkpoint Mission 133 | conserver avec 003 jusqu’à décision ; le checkpoint complet nécessite un bundle historique isolé |
| `database/tests/007_proto05_document_metadata_migration.test.mjs` | test historique partiellement reproductible | garde CLI, hashes, projection documentaire, SQL et timestamps | conserver avec 005 jusqu’à décision ; deux cas exigent des fixtures isolées |
| `server/test/runtime-json-isolation.test.js` | garde runtime active | absence des outils/lecteurs historiques dans le graphe serveur, MariaDB sans fallback | conserver impérativement |
| `database/tests/009_historical_json_tool_guards.test.mjs` | garde de sécurité active | refus avant plan/secrets/connexion et acceptation des cibles de test | conserver tant que 003/005/007 existent |

## Diagnostic exact des 21/24

La suite combinée reste volontairement à **21 réussites sur 24**. Les trois échecs sont préexistants et ne sont pas masqués.

| Test en échec | Source manquante | Contrat originel | Valeur actuelle | Décision recommandée |
|---|---|---|---|---|
| `database/tests/005...` — « le plan partagé conserve le checkpoint Mission 133 » | `data/activities.json`, première source du jeu historique (puis les autres sources seraient requises) | plan valide : 264 lignes, 27 tables, aucun blocker, 22 warnings et hash Mission 133 | `PLAN_PREFLIGHT_FAILED`; résultat bloqué, 0 ligne, 0 table, hash nul, diagnostic `SOURCE_MISSING` / `ENOENT` | reclasser comme checkpoint historique. Ne le rendre exécutable que si un bundle complet, isolé et autorisé des sources Mission 133 est conservé ; sinon supprimer ultérieurement avec 003. |
| `database/tests/007...` — « un hash individuel protégé différent est détecté sur les sources réelles » | `data/activities.json` | un fichier existant dont le hash attendu est volontairement faux doit produire `SOURCE_HASH_MISMATCH` | `ENOENT`, donc l’assertion sur le code attendu échoue | fournir plus tard une fixture temporaire minimale injectée via le paramètre `prototypeDirectory`; ne jamais recréer `data/activities.json`. Ce test unitaire peut ainsi conserver son sens indépendamment des vraies sources. |
| `database/tests/007...` — « le plan réel conserve les checkpoints déterministes » | jeu historique complet de 15 fichiers, bloqué dès `data/activities.json` | hash de plan et source-set historiques, 5 documents, 4 lignes projetées, 15 fichiers | `PLAN_PREFLIGHT_FAILED` provoqué par `SOURCE_MISSING` / `ENOENT` dans le plan 001 | reclasser comme checkpoint historique complet. Exiger un bundle de preuve isolé ou supprimer ultérieurement avec 005 ; une fixture artificielle partielle ne prouverait pas ce contrat. |

Les assertions n’ont pas été assouplies et aucun ancien fichier métier réel n’a été recréé.

## Garde-fous ajoutés

`database/migrations/historical-test-database-guard.mjs` centralise uniquement la règle des outils historiques :

1. `--database` doit être fourni explicitement ;
2. `ic_augmented_video` est toujours refusée avec `HISTORICAL_PRODUCTION_DATABASE_FORBIDDEN` ;
3. seuls `proto05_test_*` et `proto05_m<mission>_*` sont acceptés ;
4. le contrôle est appelé par les parseurs de 003/005/007 avant construction du plan, lecture des variables de connexion ou appel à `createConnection` ;
5. les requêtes `information_schema` de 003/005 utilisent désormais `SELECT DATABASE()` afin que les vérifications portent réellement sur la base temporaire explicitement sélectionnée, et non sur l’ancien nom de production figé.

Les tests existants de parsing ont été adaptés au nouveau contrat de sécurité sans changer leurs contrôles de plan, de SQL ou de migration. `009_historical_json_tool_guards.test.mjs` prouve ces refus uniquement par parsing et inspection statique : aucune connexion n’est ouverte.

## Preuves d’autorité MariaDB

- `server.js` et `proto05-mariadb-readonly.js` restent protégés par `runtime-json-isolation.test.js` : aucun lecteur historique n’entre dans leur graphe.
- Les frontières métier continuent à déléguer aux repositories MariaDB et le test interdit tout fallback fichier.
- `media-library-migration.js` ne lit aucun fichier : son emploi en production est une projection en mémoire de données issues de MariaDB, pas une seconde persistance.
- Les modifications 171 concernent exclusivement des CLI hors runtime, leur garde et leurs tests.

## Vérifications exécutées

| Commande | Résultat |
|---|---|
| `node --check` sur 003, 005 et 007 | réussi |
| `node --test database/tests/009_historical_json_tool_guards.test.mjs` | **5/5** |
| `node --test server/test/media-library-migration.test.js server/test/media-library-install.test.js server/test/media-library-dry-run.test.js server/test/language-migration.test.js server/test/runtime-json-isolation.test.js` | **22/22** |
| `node --test database/tests/005_proto05_json_to_mariadb_apply.test.mjs database/tests/007_proto05_document_metadata_migration.test.mjs` | **21/24**, trois échecs historiques documentés ci-dessus |
| `node --test server/test/mariadb-only-runtime.test.js` | contrôle complémentaire interrompu après environ 100 s sans sortie ni terminaison ; aucun résultat revendiqué |
| `git diff --check` | réussi |

Aucune validation DB, HTTP, serveur ou interface n’a été exécutée : elle aurait dépassé le périmètre et n’est pas nécessaire pour ces garde-fous pré-connexion.

## Plan de suppression physique pour la mission suivante

1. **Conserver** `media-library-migration.js`, son test, `runtime-json-isolation.test.js` et les manifestes JSON techniques.
2. **Séparer 001** : extraire le mapping pur utilisé par `proto05-mariadb-write.js` dans un module de production sans E/S ; adapter les imports et prouver le contrat à résultat identique. Archiver ensuite le CLI lecteur de 001 avec ses checkpoints.
3. **Archiver les preuves reproductibles** : `media-library-dry-run.js` et son test ; éventuellement le bundle historique Mission 133/136 s’il existe et si une décision de rétention l’autorise. Aucun bundle contenant des données métier ne doit être créé ou déplacé sans mission dédiée.
4. **Supprimer ensemble après validation** : `media-library-runtime.js` + `media-library-install.js` + `media-library-install.test.js`, après remplacement de l’import résiduel dans 007 ; `migrate-language-catalog.js` + `language-migration.test.js` ; 003 + son test ; 005 + son test ; 007 + sa garde dédiée si plus aucun CLI ne la consomme.
5. **Décider la rétention avant toute suppression** des archives `data/backups`, backups de schéma/registre et éventuelles sources historiques complètes : leur valeur probatoire et leur sensibilité métier doivent être arbitrées séparément.

## Fichiers modifiés ou créés

- `database/migrations/003_proto05_json_to_mariadb_apply.mjs`
- `database/migrations/005_proto05_document_metadata_migration.mjs`
- `database/migrations/007_proto05_targeted_json_mariadb_reconciliation.mjs`
- `database/migrations/historical-test-database-guard.mjs` (nouveau)
- `database/tests/005_proto05_json_to_mariadb_apply.test.mjs`
- `database/tests/007_proto05_document_metadata_migration.test.mjs`
- `database/tests/009_historical_json_tool_guards.test.mjs` (nouveau)
- `reports/171_proto05_classify_and_guard_historical_json_tools.md` (nouveau)

## État Git final

Huit chemins sont modifiés ou non suivis, tous limités à Proto05 et au rapport 171 : trois migrations historiques, trois fichiers de tests/garde, le garde commun et ce rapport. Le dépôt était propre au début de la mission. Aucun fichier n’est indexé ; aucun commit ni push n’a été effectué.

## Message de commit proposé

`chore(proto05): classify and guard historical JSON tools`
