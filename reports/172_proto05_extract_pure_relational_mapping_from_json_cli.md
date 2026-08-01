# Mission 172 — Séparation du mapping relationnel pur et du CLI JSON historique 001

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.60` (inchangée)  
Validation : statique et tests locaux sans connexion MariaDB, sans serveur et sans donnée métier réelle.

## Résultat

Le noyau relationnel nécessaire aux écritures MariaDB est maintenant porté par
`server/proto05-relational-mapping.mjs`. Ce module :

- n'importe que `node:crypto` ;
- ne connaît ni `fs`, ni `path`, ni chemin de source JSON ;
- ne lit et n'écrit aucun fichier ;
- exporte seulement `TABLE_DEFINITIONS`, `stableStringify` et
  `relationalModelFromCanonicalSnapshot` ;
- reçoit l'observation éventuelle d'un fichier local par une fonction purement
  injectée, sans connaître son implémentation.

`server/proto05-mariadb-write.js` charge directement ce module. Le runtime de
production ne dépend donc plus, directement ou transitivement, de
`database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` ni d'un autre
fichier de `database/migrations/`.

Le chemin `server/` a été retenu parce que le module est désormais un contrat de
production partagé par le repository d'écriture, au même niveau que les
adaptateurs MariaDB et les projections. Le conserver sous `database/migrations`
aurait maintenu la dépendance architecturale précisément visée par la mission.

## Inventaire des exports de 001 avant extraction

| Export | Classement | Consommateurs avant 172 | État après 172 |
|---|---|---|---|
| `DEFAULT_PROTOTYPE_DIRECTORY` | lecture/résolution de source JSON historique et CLI | 003, 005 ; logique interne de 001 | reste dans 001 ; 003/005 l'utilisent encore pour leurs sources historiques |
| `TABLE_DEFINITIONS` | mapping pur encore utilisé en production | `proto05-mariadb-write.js`, 003 et 005 par import direct ou via le contrat 001 | définition canonique dans le nouveau module ; 003/005 l'importent directement ; réexport de compatibilité par 001 |
| `relationalModelFromCanonicalSnapshot` | mapping pur encore utilisé en production | `proto05-mariadb-write.js`; tests et outils historiques | implémentation dans le nouveau module ; 001 conserve seulement un wrapper historique avec observation filesystem injectée |
| `stableStringify` | utilitaire pur partagé | 003, 005, 007, mapping et tests | implémentation dans le nouveau module ; import direct par 003/005/007 ; réexport de compatibilité par 001 |
| `deterministicResult` | lecture, validation et résolution de sources JSON historiques | 003 et 007 ; CLI 001 ; 005 transitivement via 003 | reste dans 001 ; il lit les sources, vérifie le schéma et délègue désormais la construction relationnelle au nouveau noyau |

Fonctions non exportées exclusivement liées au CLI ou à l'historique :
`readSourceFile`, `verifySchemaContract`, inventaire de couverture, calcul des
hashes de source/plan, self-tests, parsing des options et impression des
résultats. Elles restent dans 001 et n'entrent pas dans le module de production.

## Frontière retenue

Le nouveau module contient les définitions des tables, les normalisations et
validateurs nécessaires à la construction des lignes, les contrôles de clés et
relations, le tri déterministe, les diagnostics de mapping et la construction
du modèle à partir d'un snapshot canonique déjà fourni en mémoire.

La seule ancienne dépendance environnementale du mapping concernait la preuve
d'existence et la taille des playables locaux. L'algorithme reste identique,
mais cette preuve est maintenant fournie par `observeLocalPlayable` :

- 001 injecte son observateur historique basé sur ses chemins de sources ;
- `proto05-mariadb-write.js` injecte l'observateur runtime existant basé sur le
  stockage local de Proto05 ;
- le noyau pur ne reçoit que `{ exists, actualSize }`.

L'ordre des tables et lignes, les noms et colonnes, les règles de disponibilité,
les diagnostics, la gestion des blockers et `stableStringify` n'ont pas changé.
L'option interne `throwOnBlockers: false` permet au dry-run historique de
continuer à restituer ses blockers comme auparavant, alors que le repository
conserve le refus par exception.

## Graphes d'import

Avant :

```text
server/proto05-mariadb-write.js
  -> database/migrations/001_proto05_json_to_mariadb_dry_run.mjs
       -> fs + path + lecteurs JSON + CLI + mapping
```

Après :

```text
server/proto05-mariadb-write.js
  -> server/proto05-relational-mapping.mjs
       -> node:crypto uniquement

database/migrations/001... (CLI historique)
  -> server/proto05-relational-mapping.mjs

003 -> 001 (plan/sources historiques)
    -> nouveau module (TABLE_DEFINITIONS, stableStringify)
005 -> 001 (racine historique)
    -> 003 (plan/backup historique)
    -> nouveau module (TABLE_DEFINITIONS, stableStringify)
007 -> 001 (deterministicResult historique)
    -> nouveau module (stableStringify)
```

Aucune flèche ne repart d'un module de production vers un outil historique.

## Preuves d'équivalence

`server/test/relational-mapping-extraction.test.js` construit un même snapshot
canonique et compare, au moyen du sérialiseur déterministe :

- toutes les définitions de tables ;
- l'ordre, les clés, relations et lignes de toutes les tables du modèle ;
- les sources virtuelles et leurs hashes ;
- les diagnostics et observations.

Le résultat du nouveau module est strictement identique au contrat encore
réexporté par 001. Les 22 self-tests historiques de 001 réussissent, y compris
les diagnostics, valeurs dédiées, relations, null/absence et contrôles de
couverture. La suite historique conserve exactement son état 21/24 connu : les
trois mêmes échecs `SOURCE_MISSING`/`ENOENT` dus aux sources métier volontairement
absentes, sans nouvel échec ni assouplissement.

## Fichiers modifiés ou créés

- `server/proto05-relational-mapping.mjs` — nouveau noyau pur ;
- `server/proto05-mariadb-write.js` — import direct et injection de
  l'observation locale ;
- `database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` — délégation
  du mapping au noyau extrait ;
- `database/migrations/003_proto05_json_to_mariadb_apply.mjs` — imports purs
  directs ;
- `database/migrations/005_proto05_document_metadata_migration.mjs` — imports
  purs directs ;
- `database/migrations/007_proto05_targeted_json_mariadb_reconciliation.mjs` —
  import pur direct ;
- `server/test/relational-mapping-extraction.test.js` — nouveau test ciblé ;
- `server/test/runtime-json-isolation.test.js` — interdiction explicite des
  migrations dans le graphe runtime ;
- `reports/172_proto05_extract_pure_relational_mapping_from_json_cli.md`.

## Tests et contrôles

| Contrôle | Résultat |
|---|---|
| `node --check` sur le nouveau module, 001, 003, 005, 007 et le repository | réussi |
| `node database/migrations/001... --self-test` | **22/22** |
| `relational-mapping-extraction.test.js` | **4/4** |
| `runtime-json-isolation.test.js` | **4/4** |
| `009_historical_json_tool_guards.test.mjs` | **5/5** |
| suites mapping/projection sélectionnées (`media-library-migration`, extraction, isolation, garde) | **24/24** |
| suites historiques 003/005 | **21/24**, exactement les trois absences de sources documentées en Mission 171 |
| recherche statique `fs/path/readFile/writeFile/existsSync/statSync` dans le nouveau module | aucune occurrence |
| recherche statique de 001 et `database/migrations` dans les frontières runtime | aucune occurrence |
| chargement des manifestes techniques via `runtime-json-isolation.test.js` | réussi |
| `git diff --check` | réussi |

### Test non exécuté

`server/test/mariadb-only-runtime.test.js` n'a pas été exécuté : cette suite
ouvre une connexion à la base réelle configurée, sauvegarde des métadonnées et
effectue des recettes transactionnelles. La mission interdit toute connexion
MariaDB. Les chemins de mapping sans base sont couverts par l'équivalence pure,
les self-tests et les tests statiques.

Aucun serveur, interface, migration ou processus n'a été lancé. Il n'y a donc
pas de validation humaine ou visuelle à revendiquer.

## Dépendances historiques restantes

- 003 et 007 dépendent encore de `deterministicResult` de 001 pour reconstruire
  les plans depuis les anciennes sources ;
- 005 dépend de la racine historique de 001 et du plan/backup de 003 ;
- 001 conserve son lecteur JSON, sa couverture, ses self-tests et son CLI ;
- 001 réexporte les trois contrats purs pour compatibilité historique ;
- 007 importe toujours `media-library-runtime.js` pour sa projection historique ;
- les tests 005/007 et les outils install/dry-run/langues restent présents ;
- fixtures, archives et sauvegardes restent intactes et sans décision de rétention.

Ces éléments pourront être archivés ou supprimés par groupes lors d'une mission
distincte, après arbitrage de rétention. La Mission 172 n'en supprime aucun.

## État Git final

Le dépôt était propre au début de la mission. Les changements finaux sont
limités aux huit fichiers Proto05 listés ci-dessus et au rapport 172. Aucun
fichier n'est indexé ; aucun commit ni push n'a été effectué.

## Message de commit proposé

`refactor(proto05): extract pure relational mapping from historical JSON CLI`
