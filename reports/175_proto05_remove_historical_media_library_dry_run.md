# Mission 175 — Suppression ciblée du dry-run JSON historique de Media Library

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.60` (inchangée)  
État initial : dépôt propre, commit `121bd0e` (Mission 174).

## Résultat

Le dry-run fichier historique et son test exclusivement dédié ont été
supprimés :

- `server/media-library-dry-run.js` ;
- `server/test/media-library-dry-run.test.js`.

Ils n'avaient aucun consommateur fonctionnel. Les invariants encore utiles sont
protégés directement par le cœur de migration, le contrat Library et les tests
d'availability. MariaDB demeure l'unique autorité métier et la version reste
`0.1.60`, car aucun comportement du runtime n'a changé.

## Graphe final des consommateurs avant suppression

```text
server/media-library-dry-run.js
  -> media-library-migration.js
  -> media-library-availability.js
  <- server/test/media-library-dry-run.test.js uniquement

server.js / repositories / routes / launchers / package.json
  -X-> aucun import, appel ou script vers media-library-dry-run.js
```

Le fichier n'était ni un CLI déclaré, ni une commande npm. Le launcher, les
scripts d'installation/maintenance et les frontières MariaDB ne le
référençaient pas. Le test créait ses propres fichiers dans des répertoires
temporaires : aucune fixture partagée n'est devenue orpheline.

## Contrats auparavant exercés par le dry-run

| Contrat | Nature après cutover | Couverture indépendante / décision |
|---|---|---|
| migration d'une représentation Library 0.1 vers 1.0 | cœur pur encore utile aux projections | `media-library-migration.test.js` vérifie entités séparées, identifiants, références et validité |
| déterminisme de deux exécutions | invariant actuel du cœur pur | assertion renforcée dans `media-library-migration.test.js` : égalité profonde du résultat complet, pas seulement de `output` |
| diagnostics et refus des sources inconnues/incomplètes | invariant actuel | tests migration et contrat Library, codes et chemins stricts |
| disponibilité locale présente/absente | invariant actuel | `media-library-availability.test.js` et test `missing-local` du cœur |
| absence de mutation de la source, de l'availability et des options | invariant actuel | tests dédiés de `media-library-migration.test.js` |
| tri et identité indépendants de l'ordre d'entrée | invariant actuel | tests du cœur sur réordonnancement et stabilité des identifiants |
| génération de quatre artefacts JSON temporaires | comportement propre à l'orchestrateur retiré | historique et sans consommateur ; supprimé avec l'outil |
| refus d'une sortie fonctionnelle ou non vide | garde propre à l'écriture d'artefacts retirée | devenue sans objet ; aucune écriture équivalente n'est conservée |
| preuve que le fichier source demeure byte-identique | garde d'orchestration fichier | devenue sans objet ; la non-mutation des objets métier reste testée au niveau légitime |
| validation du document canonique produit | invariant actuel | `media-library-contract.test.js` couvre validité, filiation, classification, disponibilités et traitements |

Aucune assertion n'a été relâchée. Le transfert de déterminisme rend le test du
cœur plus exigeant : `first` et `second` doivent être entièrement identiques,
incluant sortie, diagnostics, mappings, statistiques et validation, puis rester
indépendants en mémoire.

## Documentation actualisée

`server/README.md` ne présente plus le dry-run comme un outil disponible et ne
promet plus la production d'artefacts. La section décrit désormais les deux
composants préservés sans persistance métier JSON : le cœur pur de
transformation et le collecteur d'availability.

Les anciens rapports et documents rétrospectifs n'ont pas été réécrits.

## Composants explicitement préservés

- `server/media-library-migration.js` et son test ;
- `server/media-library-projection.js` ;
- `server/media-library-availability.js` et son test ;
- `server/media-library-schema.js` et le contrat Library ;
- `server/proto05-relational-mapping.mjs` ;
- repositories et adaptateurs MariaDB ;
- `server/scripts/migrate-language-catalog.js` et son test ;
- manifestes/SQL techniques 001–006, registre et chargeur ;
- fixtures indépendantes, archives, sauvegardes et registres.

Les implémentations préservées sont inchangées dans le diff. Seuls leurs tests
ont été renforcés lorsque nécessaire.

## Preuves de non-régression

- Le graphe runtime conserve `media-library-projection.js`, les repositories
  MariaDB et aucun lecteur/fallback JSON métier.
- `media-library-projection.js` reste sans accès filesystem.
- Le résultat complet de deux migrations identiques est profondément égal.
- Les 11 contrats du cœur protègent diagnostics, identités, ordre,
  non-mutation, références, filiation et disponibilité.
- Les contrats Library protègent classification, filiation, traitements et
  préflight de suppression.
- Le test d'isolation exige maintenant l'absence physique du dry-run en plus de
  son absence du graphe.
- Le chargeur retourne exactement les migrations techniques 001 à 006.
- Aucun fichier `data/activities.json` ni autre persistance métier JSON n'a été
  créé.

## Tests exécutés

| Contrôle | Résultat |
|---|---|
| mapping relationnel, isolation runtime, projection vidéo, contrat Library, availability, migration, annotations | **91/91** |
| `media-library-migration.test.js` | **11/11**, résultat complet déterministe |
| `runtime-json-isolation.test.js` | **4/4** |
| tests statiques ciblés vidéothèque/suppression | **9/9** |
| chargement direct des migrations techniques | exactement `001,002,003,004,005,006` |
| recherche du nom, chemin, imports et commandes | assertions négatives uniquement ; aucune invocation active |
| `git diff --check` | réussi après contrôle final |

### Tests non exécutés

- `mariadb-only-runtime.test.js` et `schema-migrations.test.js` ouvrent des
  connexions MariaDB : non exécutés.
- Les recettes de téléchargement et le dernier test dynamique de
  `video-workspaces.test.js` démarrent un serveur : non exécutés. Seuls ses neuf
  contrats statiques ont été sélectionnés explicitement.
- Aucun serveur, base, migration, interface ou donnée métier n'a été lancé ou
  modifié. Aucune validation humaine ou visuelle n'est revendiquée.

## État Git final

Le diff contient deux suppressions, le renforcement de deux tests, la mise à
jour ciblée de `server/README.md` et ce rapport. Aucun fichier n'est indexé ;
aucun commit ni push n'a été effectué. Les suppressions restent récupérables
via Git.

## Prochain lot recommandé

Deux décisions doivent rester séparées :

1. analyser puis décider du sort de
   `server/scripts/migrate-language-catalog.js` et de son test dans une mission
   dédiée ;
2. définir indépendamment la politique de rétention des archives, sauvegardes
   et registres avant toute suppression de données ou preuves historiques.

La Mission 175 ne prend aucune décision sur ces deux lots.

## Message de commit proposé

`chore(proto05): remove historical media library dry run`
