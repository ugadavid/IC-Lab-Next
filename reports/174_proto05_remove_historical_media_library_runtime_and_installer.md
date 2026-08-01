# Mission 174 — Retrait du runtime et de l’installateur historiques de Media Library

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.60` (inchangée)  
État initial : dépôt propre, commit `e49825d` (Mission 173).

## Résultat

Les deux composants qui lisaient ou installaient l'ancienne Media Library
depuis des fichiers JSON ont été supprimés avec leur unique test dédié :

- `server/media-library-runtime.js` ;
- `server/media-library-install.js` ;
- `server/test/media-library-install.test.js`.

Le serveur et les repositories continuent d'utiliser
`server/media-library-projection.js`. MariaDB demeure l'unique autorité métier,
sans fallback fichier. Aucun comportement applicatif n'a changé ; la version
reste donc `0.1.60`.

## Graphe des consommateurs avant suppression

```text
server/media-library-install.js
  -> media-library-migration.js
  -> media-library-availability.js
  -> media-library-schema.js
  <- server/test/media-library-install.test.js uniquement

server/media-library-runtime.js
  -> media-library-migration.js
  -> media-library-schema.js
  <- server/test/media-library-install.test.js uniquement

server.js
proto05-mariadb-readonly.js
  -> media-library-projection.js
     -> media-library-migration.js
     -> media-library-schema.js
```

`media-library-dry-run.js` importe directement `media-library-migration.js` et
`media-library-availability.js` ; il ne dépendait d'aucun des deux candidats.
Ni package.json, ni launcher, ni route, ni repository, ni script de démarrage ou
d'installation ne permettait leur invocation.

## Classification des symboles supprimés

### `media-library-runtime.js`

| Symbole | Classement | Remplacement actuel |
|---|---|---|
| `readCanonicalMediaLibrary` | lecteur JSON historique synchrone | aucun : la lecture métier actuelle vient de MariaDB |
| `readCanonicalMediaLibraryAsync` | lecteur JSON historique asynchrone | aucun |
| `migrationForLegacy` | adaptation historique 0.1 → 1.0 | cœur préservé directement dans `media-library-migration.js` pour le dry-run |
| `projectCanonicalLibrary` | contrat pur encore utile, mais duplication résiduelle | implémentation de production déjà extraite dans `media-library-projection.js` depuis 170 |
| `canonicalFromRuntime` | contrat pur de projection/merge actuel | `media-library-projection.js` |
| `assertWritableCanonical` | validation pure actuelle | `media-library-projection.js` |

### `media-library-install.js`

| Symbole | Classement | Consommateur |
|---|---|---|
| `installCanonicalMediaLibrary` | installateur JSON historique avec backup/temp/rename | test dédié supprimé uniquement |
| `sha256` | utilitaire interne exporté pour compatibilité historique | aucun consommateur recensé |

Aucune extraction supplémentaire n'a été nécessaire : tous les contrats purs
actuels étaient déjà présents dans le module de projection légitime, sans accès
filesystem. Aucun wrapper vide ou export de compatibilité n'a été conservé.

## Références et commandes

Aucune référence documentaire opérationnelle, commande npm ou launcher ne
présentait encore ces fichiers comme invocables. Aucun document n'a donc été
modifié artificiellement. Les seules occurrences restantes de leurs noms sont
des assertions négatives dans `runtime-json-isolation.test.js`, renforcées pour
vérifier aussi leur absence physique.

## Composants préservés

- `server/media-library-projection.js` ;
- `server/media-library-migration.js` et son test ;
- `server/media-library-dry-run.js` et son test ;
- `server/media-library-availability.js` et son test ;
- `server/media-library-schema.js` et le contrat Library ;
- `server/proto05-relational-mapping.mjs` ;
- repositories et frontières MariaDB ;
- `server/scripts/migrate-language-catalog.js` et son test ;
- les manifestes/SQL techniques 001–006, registre et chargeur ;
- fixtures actuelles, archives, sauvegardes et registres soumis à rétention.

Les fichiers historiques explicitement préservés sont inchangés dans le diff.
Leurs empreintes Git observées sont :

- `media-library-dry-run.js` : `38885989c594bda9efff53a73423b8cde0c59d17` ;
- `media-library-migration.js` : `2c8d807ba72ac8d41285407757df0d68100e3f05` ;
- `migrate-language-catalog.js` : `32b466e3ae366bd2544e4a1575bc1f976379b83a`.

## Preuves de non-régression

- Le graphe de `server.js` contient `media-library-projection.js`, les deux
  repositories MariaDB et aucune ancienne persistance JSON.
- `media-library-projection.js` reste sans `fs`, lecture, écriture, copie ou
  renommage de fichier.
- Les frontières de lecture et d'écriture échouent avec MariaDB sans fallback.
- Le contrat Library vérifie toujours projections, classifications,
  disponibilités, filiation, traitements et préflight de suppression.
- Le dry-run conservé écrit uniquement ses artefacts temporaires isolés et ses
  deux tests réussissent.
- Le cœur de migration conservé garde ses diagnostics, ordres, identifiants et
  invariants sur onze tests.
- Le chargeur technique retourne exactement les migrations 001–006.

## Tests exécutés

| Contrôle | Résultat |
|---|---|
| mapping relationnel, isolation runtime, projection vidéo, contrat Library, availability, migration, dry-run, annotations | **93/93** |
| tests statiques ciblés de vidéothèque et suppression | **9/9** |
| `runtime-json-isolation.test.js` | **4/4**, y compris absence physique des deux fichiers |
| `media-library-dry-run.test.js` | **2/2** |
| `media-library-migration.test.js` | **11/11** |
| chargement direct des manifestes | exactement `001,002,003,004,005,006` |
| recherche statique des anciens noms/imports/commandes | aucune référence active ; assertions négatives uniquement |
| `git diff --check` | réussi après contrôle final |

### Tests non exécutés

- `mariadb-only-runtime.test.js` et `schema-migrations.test.js` nécessitent une
  connexion MariaDB : non exécutés conformément à la mission.
- Les tests de téléchargement/finalisation et les recettes détaillées de
  vidéothèque démarrent un serveur temporaire : non exécutés. Les neuf contrats
  purement statiques de `video-workspaces.test.js` ont été sélectionnés par nom.
- Aucun serveur, base, migration, interface ou donnée métier n'a été lancé ou
  modifié. Aucune validation humaine ou visuelle n'est revendiquée.

## État Git final

Le diff contient les trois suppressions ciblées, le renforcement du test
d'isolation runtime et ce rapport. Aucun fichier n'est indexé. Aucun commit ni
push n'a été effectué. Les suppressions restent récupérables par Git.

## Prochain lot recommandé

Maintenir trois décisions séparées :

1. décider si `media-library-dry-run.js` doit être archivé comme preuve
   reproductible ou supprimé avec son test ;
2. traiter indépendamment `migrate-language-catalog.js` et son test ;
3. définir une politique de rétention avant toute intervention sur archives,
   sauvegardes ou registres.

Aucune de ces décisions n'est prise par la Mission 174.

## Message de commit proposé

`chore(proto05): remove historical media library runtime and installer`
