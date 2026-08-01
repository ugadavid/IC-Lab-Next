# Mission 170 — Retrait des lecteurs JSON métier dormants du graphe runtime de Proto05

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01` et présent rapport.  
Version obtenue : `0.1.60`.  
Base, donnée métier, migration, manifeste, archive ou sauvegarde modifiés : aucun.

## Résultat

Les points d’entrée de production ne chargent plus le module capable de lire
les anciennes persistances JSON métier. `server.js` et
`proto05-mariadb-readonly.js` dépendent maintenant de
`media-library-projection.js`, module pur sans `fs`, chemin fichier, réseau ou
processus.

Les lecteurs, installateurs, dry-runs, scripts, fixtures et archives
historiques restent physiquement présents, mais sont absents du graphe transitif
de `server.js`. MariaDB demeure l’unique repository de lecture et d’écriture
métier ; une erreur de son adaptateur est propagée sans fallback.

## Lecteurs étudiés et ancienne accessibilité

| Lecteur ou outil | Ancienne chaîne depuis la production | Symbole / effet | Usage réel avant mission | État après mission |
|---|---|---|---|---|
| `server/media-library-runtime.js` | `server.js` → `media-library-runtime.js` | exposait projections pures **et** lecteurs fichier | module chargé ; lecteurs non appelés | absent du graphe de `server.js` |
| `server/media-library-runtime.js` | `server.js` → `proto05-mariadb-readonly.js` → `media-library-runtime.js` | `projectCanonicalLibrary` avec chargement transitif de `node:fs` | projection appelée ; lecteurs non appelés | remplacé par `media-library-projection.js` |
| `readJsonSync` | interne à `media-library-runtime.js` | `fs.readFileSync` + `JSON.parse` | appel mort en production | conservé hors graphe pour le test/installateur historique |
| `readCanonicalMediaLibrary` | export de `media-library-runtime.js` | accepte un chemin ou un objet ; adapte le schéma 0.1 | aucun consommateur de production ; test historique uniquement | conservé hors graphe runtime |
| `readCanonicalMediaLibraryAsync` | export de `media-library-runtime.js` | `fs.readFile` + `JSON.parse` | aucun consommateur recensé | conservé hors graphe runtime, à traiter avec les outils historiques |
| `media-library-install.js` | aucune chaîne depuis `server.js` | lit Library, catalogue et activités JSON ; backup/rename | outil/test historique manuel | inchangé et toujours hors graphe |
| `media-library-dry-run.js` | aucune chaîne depuis `server.js` | lit les sources JSON et écrit des artefacts isolés | outil/test historique manuel | inchangé et toujours hors graphe |
| `server/scripts/migrate-language-catalog.js` | aucune chaîne depuis `server.js` | lit/écrit les JSON explicitement fournis | script historique manuel | inchangé et toujours hors graphe |
| migrations `database/migrations/001`, `003`, `005`, `007` | aucune chaîne depuis `server.js` | anciens imports, comparaisons et réconciliations JSON | commandes historiques manuelles | inchangées et toujours hors graphe |

## Imports retirés et nouveau graphe

Imports retirés :

- `server.js` ne requiert plus `./media-library-runtime` ;
- `proto05-mariadb-readonly.js` ne requiert plus
  `./media-library-runtime`.

Ils requièrent désormais `./media-library-projection`, qui expose seulement :

- `projectCanonicalLibrary` ;
- `canonicalFromRuntime` ;
- `assertWritableCanonical`.

Le convertisseur pur `media-library-migration.js` reste une dépendance du
nouveau module : il ne sait lire aucun fichier et `canonicalFromRuntime`
l’utilise, via un helper interne non exporté, pour convertir les nouvelles entités plates créées
par les parcours métier courants. Le retirer aurait modifié le comportement
fonctionnel ; conformément à la mission, cet élément n’a pas été supprimé.

Chaîne actuelle principale :

```text
server.js
  ├─ proto05-read-boundary.js ── proto05-mariadb-readonly.js
  ├─ proto05-write-boundary.js ─ proto05-mariadb-write.js
  └─ media-library-projection.js (objets en mémoire uniquement)
```

`schema-migrations.js` reste transitivement chargé par l’adaptateur MariaDB. Ses
lectures JSON sont légitimes et limitées aux manifestes de schéma techniques.

## Éléments volontairement conservés

- les sept manifestes JSON de migrations 001–006 : contrats techniques requis
  par la vérification de démarrage ;
- `package.json` et les configurations techniques ;
- les fixtures sous `server/test/fixtures` ;
- `media-library-runtime.js`, `media-library-install.js`,
  `media-library-dry-run.js`, `media-library-migration.js` et leurs tests :
  témoins/outils historiques hors production ;
- les scripts `database/migrations/*` et
  `server/scripts/migrate-language-catalog.js` : commandes historiques manuelles ;
- toutes les archives et sauvegardes recensées par l’audit 168.

Aucun de ces éléments n’a été déplacé, supprimé ou exécuté au démarrage normal.

## Contrôle statique des lectures JSON restantes

| Classe | Lectures observées après mission |
|---|---|
| Runtime de production | manifestes techniques via `schema-migrations.js`; JSON réseau/HTTP, sorties FFprobe/FFmpeg et valeurs JSON MariaDB ; fichiers HTML/médias statiques. Aucun fichier JSON métier. |
| Tests | fixtures JSON et fichiers temporaires sous `%TEMP%`, dont le faux `activities.json` du garde-fou de fallback. |
| Outils historiques manuels | anciens readers Library, installateur, dry-run, migration langues et migrations 001/003/005/007. |
| JSON techniques légitimes | manifestes 001–006, `package.json`, backups de registre uniquement sur commande administrative explicite. |

## Preuves d’autorité MariaDB

Le test `runtime-json-isolation.test.js` construit le graphe transitif des
`require()` locaux depuis `server.js` et prouve :

- présence des adaptateurs `proto05-mariadb-readonly.js` et
  `proto05-mariadb-write.js` ;
- présence du module pur de projection ;
- absence des lecteurs et outils historiques ;
- absence des quatre anciens chemins métier JSON ;
- absence des symboles `readCanonicalMediaLibrary*` ;
- absence de toute API fichier dans le module de projection.

Un second scénario crée un `activities.json` historique dans un répertoire
temporaire, force l’échec du repository MariaDB et vérifie que la frontière
propage exactement cet échec. Aucun contenu du fichier n’est adopté. La
frontière d’écriture délègue elle aussi exclusivement à son adaptateur MariaDB.

## Tests et vérifications

| Commande / suite | Résultat |
|---|---|
| `node --test test/runtime-json-isolation.test.js` | 4/4 réussis |
| Syntaxe de `server.js`, `proto05-mariadb-readonly.js`, `media-library-projection.js` et du nouveau test | réussie |
| Contrat, migration, installateur, dry-run et disponibilité Library | 78/78 réussis |
| Projection activité, suppressions/vidéothèque et finalisation de téléchargements | 23/23 réussis |
| Tests historiques `database/tests/005...` et `007...` | 21/24 réussis ; 3 échecs préexistants dus à l’absence volontaire de `data/activities.json` et du source set Mission 133 |
| Chargement du contrat de migrations actuel | réussi : exactement 001–006, latest 006, fingerprint présent |
| `git diff --check` | réussi |

La suite `server/test/schema-migrations.test.js` n’a pas été lancée : elle crée
et supprime de vraies bases MariaDB temporaires et applique le DDL 001–006,
alors que la mission interdit de toucher à une base ou d’exécuter une migration.
Le test ciblé charge et valide réellement les manifestes et sources SQL sans
connexion ni écriture.

Les trois échecs des tests de migrations historiques ne sont pas une régression
de cette mission : ils démontrent que ces outils attendent encore des JSON
métier supprimés lors du cutover. Aucun fichier n’a été recréé et aucun test
historique n’a été assoupli.

Les tests de vidéothèque utilisent uniquement leurs serveurs temporaires et
fixtures isolées ; aucun serveur de production, cycle START/STOP ou donnée
MariaDB réelle n’a été utilisé.

## Version

La séparation touche le graphe de production. La convention Proto05 impose un
incrément minimal pour une correction runtime : `0.1.59` devient `0.1.60` dans
`server/package.json`, `server.js`, `server/README.md` et
`ANONYMIZATION_ENGINE.md`. Aucun autre contrat ou artefact de version n’est
modifié.

## Fichiers modifiés ou créés

- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js` ;
- `prototypes/05-augmented-ic-video-01/server/media-library-projection.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/runtime-json-isolation.test.js` ;
- `prototypes/05-augmented-ic-video-01/server/package.json` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md` ;
- `reports/170_proto05_remove_dormant_json_readers_from_runtime.md`.

## État Git final

Les sept fichiers Proto05 ci-dessus sont modifiés ou nouveaux et le présent
rapport est nouveau. Aucun fichier extérieur au périmètre n’a été modifié.
Aucun commit ni push n’a été effectué.

## Prochaine étape recommandée

Poursuivre par la Mission C du plan 168 : classer chaque outil historique comme
preuve reproductible ou obsolète, puis ajouter les garde-fous empêchant tout
outil destiné aux fixtures d’écrire accidentellement dans
`ic_augmented_video`. Cette étape doit précéder toute suppression physique.

## Message de commit proposé

`refactor(proto05): isolate dormant JSON readers from production runtime`
