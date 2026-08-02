# Mission 184 — Réalignement des tests historiques de migrations sur l’état canonique 006

Date : 2 août 2026  
Périmètre : tests de migrations Proto05  
Version : `0.1.62`, inchangée

## Résultat

Les quatre échecs provenaient exclusivement de fixtures et assertions historiques incomplètement mises à jour après l’ajout de 006. Le runner, les six manifestes et le comportement de production étaient corrects. Une correction ciblée du seul fichier `server/test/schema-migrations.test.js` restaure les garanties initiales et porte la suite ciblée de `108/112` à `112/112`.

Aucune migration ni écriture n’a été effectuée dans la base métier. Les tests de migrations utilisent des bases temporaires aléatoires `proto05_m154_*`, créées puis supprimées. Aucun import du corpus n’a été exécuté.

## État initial et contrats consultés

- Git initial : `HEAD e644e67`, worktree propre.
- `AGENTS.md` et conventions Proto05.
- rapports 167 et 183.
- `database/schema-migrations/manifest.json` et manifestes/sources 001–006.
- `server/schema-migrations.js`, notamment `validateRegistry`, `inspectMigrationState`, `adoptExisting` et le verrou du runner.
- `server/test/schema-migrations.test.js` et le test d’adoption 006.
- artefacts et hashes de la Mission 183.

## Évolution 005 → 006

L’état 005 comprend cinq inscriptions et la suppression transactionnelle d’une sortie terminale. L’état 006 modifie uniquement `sp_media_asset_delete` afin de supprimer un asset racine sans assignation temporaire incohérente de `family_root_asset_id`; le nombre de routines demeure 49. 006 est `adoptExisting:true` :

- schéma antérieur exact → DDL 006 planifié ;
- registre 001–005 et schéma déjà exactement 006 → adoption de l’inscription 006 sans DDL ;
- schéma ne correspondant exactement ni à l’état enregistré ni à la cible adoptable → refus ;
- registre complet 001–006 et schéma 006 → aucune action.

Le test dédié `migration 006 adopts an exactly installed schema without planning DDL and rejects any other divergence` confirme ce contrat sans modification du runner.

## Cause précise des quatre échecs

| Test | État de fixture | Échec initial | Cause | Contrat corrigé |
|---|---|---|---|---|
| `empty install, populated baseline and a second run are deterministic` | base temporaire vide, installation canonique complète | `006 !== 005` | deux assertions littérales dataient de cinq migrations | version et cardinalité dérivées de `loadMigrationContract()` |
| `routine adoption refuses an incomplete inventory` | installation 006 puis reconstruction annoncée d’un état 002 et retrait de `sp_media_get` | `PROTO05_MIGRATION_REGISTRY_INVALID` au lieu de `PROTO05_ROUTINE_ADOPTION_REFUSED` | le helper supprimait 003–005 mais laissait l’inscription 006 et sa définition de `sp_media_asset_delete` | retirer 006 et restaurer exactement la définition 002 avant de provoquer l’inventaire incomplet |
| `a divergent routine is never silently adopted` | même reconstruction 002 puis routine volontairement divergente | registre incohérent avant l’analyse de divergence | même 006 résiduelle dans une fixture prétendument 002 | même reconstruction exacte de 002 ; la divergence volontaire atteint de nouveau le contrôle attendu |
| `concurrent runners serialize and never double-register a migration` | base temporaire vide, deux runners avec le même plan | registre réel 6, assertion attendue 5 | cardinalité littérale obsolète | cardinalité dérivée du manifeste canonique courant |

Il ne suffisait donc pas de remplacer deux chaînes `005` par `006`. Les deux tests d’adoption révélaient une fixture réellement incohérente : un registre `001,002,006` par rapport à un contrat temporaire limité à 001–002, avec en plus le corps 006 d’une routine.

## Correction appliquée

Dans `removeAudioMigrationFixture` :

1. charger le contrat canonique réel ;
2. retrouver dans le manifeste 002 le `createStatement` exact de `sp_media_asset_delete` ;
3. supprimer l’inscription 006 de la base temporaire ;
4. remplacer la routine 006 par sa définition 002 ;
5. poursuivre le retrait historique de 003–005 déjà présent.

Dans les deux assertions de fin d’installation : utiliser `canonicalContract.latestVersion` et `canonicalContract.migrations.length`. Dans le test concurrent : comparer la cardinalité du registre à la longueur du même contrat.

Aucun état alternatif n’est accepté, aucune assertion n’est supprimée et aucun résultat n’est figé sur 006. Une future migration 007 sera ainsi reflétée par le contrat chargé au lieu de casser à nouveau ces assertions numériques.

## Garanties conservées

- installation vide déterministe et second run sans changement ;
- inventaire de routine incomplet toujours refusé ;
- routine divergente jamais adoptée silencieusement ;
- sauvegarde toujours exigée avant upgrade ;
- runners concurrents toujours sérialisés ;
- exactement un runner réussit et l’autre reçoit `PROTO05_MIGRATION_PLAN_DRIFT` ;
- registre contenant exactement une inscription par migration canonique ;
- adoption 006 seulement sur fingerprint cible exact ;
- divergence de schéma toujours bloquante.

Le code du runner et les manifestes n’ont pas changé.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/test/schema-migrations.test.js` ;
- `reports/184_proto05_schema_006_historical_test_realignment_report.md`.

Version inchangée : correction de tests uniquement.

## Résultats des tests

### Reproduction avant correction

Commande avec `--test-name-pattern` sur les quatre noms : `0/4`, exactement les quatre erreurs de la Mission 183 :

- version réelle 006 contre attente 005 ;
- registre incohérent dans les deux reconstructions 002 ;
- cardinalité réelle 6 contre attente 5.

Toutes les bases étaient des bases temporaires `proto05_m154_*`, supprimées par `withDatabase`.

### Après correction

- quatre tests isolés : `4/4`, 12,31 s ;
- `schema-migrations.test.js` complet : `16/16`, 29,10 s ;
- test dédié 006 : inclus et réussi ;
- tests Mission 183 : `28/28`, inclus dans la suite combinée ;
- suite combinée Media Library, activités, mapping, isolation JSON, corpus et migrations : `112/112`, 29,02 s ;
- aucun skip, aucun échec dans ces suites.

### Suite générale canonique

`npm test` a été relancé avec le timeout externe inchangé de 300 secondes. Il dépasse encore cette limite et ne fournit donc aucun bilan global final. Le diagnostic par groupes montre :

- les sept premiers tests légers de `mariadb-only-runtime.test.js` réussissent `7/7` en 2,74 s ;
- `MariaDB indisponible…` réussit isolément en 0,71 s ;
- `CRUD activité…` réussit isolément en 2,19 s ;
- `le préflight média MariaDB bloque les relations canoniques et nettoie uniquement les fixtures` dépasse isolément son timeout interne de 60 s puis laisse le processus serveur de fixture actif, empêchant Node de terminer.

Le dépassement global n’est donc pas causé par les migrations 006 ni par une suite simplement longue : il existe un problème préexistant de terminaison/cleanup dans ce test Media Library. Il n’a pas été modifié car il est hors de la Mission 184. Les processus de tests ainsi laissés par les essais avec timeout ont été identifiés par ligne de commande et heure, puis arrêtés ; aucun processus Node étranger n’a été ciblé. Une vérification en lecture seule a confirmé zéro marqueur `mission150-*` dans `media_assets`, `activities`, `media_treatments`, `media_folders` et `media_tags`.

## Contrôle de la Mission 183

| Élément | Hash observé | Attendu | État |
|---|---|---|---|
| source liens | `9468300016f50ac0c3d71840c7230b74c66a78fd1aade340d3d1597572906677` | identique | inchangé |
| source analyse | `75af843398b32b6ad4cae436b1589891fcba54254d275b639b1929bf78079931` | identique | inchangé |
| fichier manifeste | `14bdb5e5e52c25daa2f97f8f8ad3d1cb0756ab86e9ca12434b731e226b309401` | témoin Mission 183 | inchangé |
| manifeste sémantique | `549f9b8eb37d7aa963a81a5075632abf8cd23715db28a3ddad53f220aa4e48e1` | identique | inchangé |
| snapshot de référence | `df27b10984eedaad61c776f77793407c908e20236c2769532292f0a4746eb65a` | identique | inchangé |
| plan sémantique | `36440eec6a9014210107c750152da472065b73656e9bd74284741040e20b9415` | identique | inchangé |
| fichier de plan | `5c419ace4a04d47eefb87723b96c5b44d425ee7ec54863ee912b911bbb0f5b21` | identique | inchangé |

Le manifeste et le plan n’ont pas été régénérés.

## Absence de mutation métier

Les écritures de `schema-migrations.test.js` ont exclusivement visé des bases temporaires nommées aléatoirement, créées et détruites pour chaque scénario. Le contrôle final trouve zéro base `proto05_m154_*`. Aucun DDL/DML n’a visé `ic_augmented_video` dans ces tests.

La commande générale historique charge toutefois `.env.local` dans `mariadb-only-runtime.test.js` et utilise des fixtures préfixées. Ce test a été lancé parce que la mission exigeait la suite générale ; après son timeout, un contrôle readonly a confirmé l’absence de résidu `mission150-*`. Aucun média ou activité du corpus n’a été créé.

## Recommandation

Le contrat 006 et la préparation read-only de la Mission 183 sont cohérents. La préparation d’une future mission d’application du plan peut être autorisée du point de vue des migrations. Avant de considérer la suite générale comme verte, une mission séparée devrait réparer la terminaison du test de préflight Media Library et, idéalement, l’isoler de la base de travail via une base temporaire.

L’application du plan elle-même reste non autorisée et ne doit pas commencer sans ses propres sauvegarde, rollback, préconditions de hashes et validation explicite.

## État Git et commit proposé

État Git final exact :

```text
 M prototypes/05-augmented-ic-video-01/server/test/schema-migrations.test.js
?? reports/184_proto05_schema_006_historical_test_realignment_report.md
```

`git diff --check` réussit. Aucun commit ni push.

Message de commit proposé :

```text
test(proto05): realign schema migration fixtures with 006
```
