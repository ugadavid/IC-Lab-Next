# Mission 130 — Proto05 — Durcissement du schéma MariaDB et validation

Date : 27 juillet 2026

## Résultat

La révision complète 003 du schéma Proto05 a été créée, installée et validée
dans la base locale dédiée `ic_augmented_video`.

État final réellement observé :

- schéma 003 installé ;
- 31 tables InnoDB ;
- 43 procédures stockées ;
- 48 clés étrangères ;
- 65 contraintes `CHECK` ;
- 39 contrôles SQL réussis ;
- 31 tables comptées à zéro ligne après nettoyage ;
- `FOREIGN_KEY_CHECKS = 1` dans la session de contrôle finale ;
- aucune désactivation des FK dans la recette 003 ;
- aucun helper, trigger, événement ou table de test restant ;
- `ic_dico` et `ic_hub` inchangés ;
- aucun changement de Node, des routes, des JSON, de Docker ou de la version ;
- aucun commit et aucun push.

La base `ic_augmented_video` reste installée mais entièrement vide.

## État initial

- Branche : `main`.
- HEAD :
  `3b511bdea8ceabb630110bae2bb8e38f13023042`
  (`Db document mission 128`).
- Version Proto05 : `0.1.45`.
- État Git initial :

```text
?? prototypes/05-augmented-ic-video-01/database/drafts/002_proto05_schema_revision.sql
?? prototypes/05-augmented-ic-video-01/database/tests/
?? reports/128_proto05_mariadb_model_revision_and_validation.md
```

Ces changements non suivis de la Mission 129 ont été préservés.

Les trois livrables 002 étaient présents et ont été lus intégralement :

- `prototypes/05-augmented-ic-video-01/database/drafts/002_proto05_schema_revision.sql` ;
- `prototypes/05-augmented-ic-video-01/database/tests/002_proto05_schema_validation.sql` ;
- `reports/128_proto05_mariadb_model_revision_and_validation.md`.

Leurs empreintes finales sont restées celles relevées avant la Mission 130 :

- schéma 002 :
  `362D5AA73FAE297EEA37946D7DBE648A188393A29403DE5C5FCCD530324E157E` ;
- recette 002 :
  `111DEA449778292B0436D4F5A18D4FC1F1BD270260E0301A81C25F1A0626233E` ;
- rapport 128 :
  `4A0AB192EA5EF7EA4B2FF56A646EC3BE2C02B9D8D1A38DF498B692919BEF89CC`.

La version reste `0.1.45`.

## Inventaire avant réinstallation

La connexion a été contrôlée par :

```sql
SELECT DATABASE();
SHOW TABLES;
```

Résultat :

- base active : `ic_augmented_video` ;
- 31 tables attendues ;
- 43 procédures attendues ;
- aucun trigger ;
- aucun événement ;
- zéro ligne dans chacune des 31 tables.

Témoins des autres bases avant intervention :

- `ic_dico` : 8 tables et 9 procédures ;
- `ic_hub` : 15 tables, 1 vue et 3 procédures.

Aucun objet ni aucune donnée inattendue n’a été trouvé.

## Corrections du schéma 003

### 1. Locators complets des playables

Les contrats qui exposent un playable utilisable renvoient désormais les
champs nécessaires à sa résolution :

- `kind` ou alias de type ;
- `storage_scope` ;
- `storage_key` ;
- `location_url` ;
- `embed_video_id` ;
- disponibilité ;
- raison d’indisponibilité ;
- métadonnées techniques prévues par le contrat.

Les ajouts concernent notamment :

- le jeu média de `sp_activity_get` ;
- le jeu média de `sp_student_activity_bundle` ;
- la carte principale de `sp_activity_library_search` ;
- le playable par défaut de `sp_media_library_search`.

`sp_media_get` exposait déjà ces informations.

Choix de contrat :

- un playable `local-file` est résolu côté serveur par
  `storage_scope` + `storage_key` ;
- un playable distant utilise `location_url` ou `embed_video_id` ;
- le futur adaptateur Node devra convertir le locator interne en URL servie ou
  signée ;
- `storage_scope` et `storage_key` ne doivent pas être transmis tels quels au
  navigateur si cela révèle une organisation interne ou un chemin sensible.

Node n’a pas été modifié.

### 2. Graphe des traitements

Statuts conservés :

- actifs : `queued`, `running`, `cancelling` ;
- terminaux : `completed`, `failed`, `cancelled`, `interrupted`.

Graphe appliqué par `sp_media_treatment_update` :

```text
queued
  -> queued | running | cancelling | cancelled | failed | interrupted

running
  -> running | cancelling | failed | interrupted
  -> completed uniquement par sp_media_treatment_complete

cancelling
  -> cancelling | cancelled | failed | interrupted

completed | failed | cancelled | interrupted
  -> aucun autre état
  -> rejeu strictement identique seulement
```

Règles de progression :

- intervalle 0–100 ;
- `queued` impose 0 ;
- `running` et `cancelling` restent strictement sous 100 ;
- `completed` impose 100 ;
- aucune régression pendant un état actif ;
- une répétition strictement identique renvoie `changed = 0` ;
- un terminal n’accepte aucune modification de statut, progression,
  diagnostics ou erreur.

La finalisation est réservée à un traitement `running`.

### 3. Idempotence stricte de la finalisation

Lorsqu’un traitement est déjà `completed`,
`sp_media_treatment_complete` compare réellement :

- ID de l’asset de sortie ;
- ID de la source de sortie ;
- ID du playable de sortie et du playable publié ;
- cycle, titre et type de dérivation de l’asset ;
- kind, disponibilité et locator du playable ;
- `storage_scope` et `storage_key` ;
- absence d’URL/embed pour le résultat local ;
- mime type de la source et des métadonnées ;
- taille ;
- durée ;
- SHA-256 ;
- version FFmpeg ;
- diagnostics finaux ;
- statut `completed` et progression 100.

Les dates générées ne participent pas à la comparaison.

Un rejeu identique réussit avec `changed = 0`. Une contradiction produit
l’erreur métier 30340 `completed result mismatch`. Aucun asset, source ou
playable supplémentaire n’est créé.

### 4. Lignées média

La racine média n’est plus auto-référencée :

- racine : `parent_asset_id IS NULL` et
  `family_root_asset_id IS NULL` ;
- dérivé : parent et racine non nuls.

La colonne persistante générée :

```sql
lineage_root_key AS (COALESCE(family_root_asset_id, id))
```

représente uniformément la racine effective.

Garanties relationnelles :

- clé candidate `UNIQUE (lineage_root_key, id)` ;
- FK simple de `family_root_asset_id` vers la racine ;
- FK composite
  `(family_root_asset_id, parent_asset_id)` vers
  `(lineage_root_key, id)` ;
- `CHECK` interdisant l’auto-parenté et les formes racine/dérivé invalides.

Un enfant et son parent appartiennent donc nécessairement à la même famille.

Prévention des cycles :

- `sp_media_treatment_start` crée uniquement un nouvel ID de sortie ;
- l’ID de sortie ne peut pas être l’entrée ;
- un ID d’asset existant ne peut pas être réutilisé comme sortie ;
- aucune procédure métier ne modifie le parent d’un asset existant.

Une écriture DBA directe pourrait contourner la partie procédurale ; le compte
applicatif ne doit donc pas posséder de droit DML direct.

Le passage des racines à `family_root_asset_id = NULL` corrige également le
défaut de purge du 002 : une racine peut être supprimée physiquement après ses
descendants sans suspendre les FK.

### 5. Lignées pédagogiques

Garanties relationnelles :

- clé candidate
  `UNIQUE (root_activity_id, activity_id)` ;
- FK composite
  `(root_activity_id, parent_activity_id)` vers
  `(root_activity_id, activity_id)` ;
- FK existantes vers l’activité, le parent et la racine ;
- `CHECK` rendu explicitement sûr face à `NULL`.

Une variante doit avoir :

- une racine connue et cohérente ;
- un parent connu appartenant à cette racine ;
- un parent et une racine différents d’elle-même.

Les états `unknown`, `to-verify` ou `NULL` ne peuvent pas nommer une relation,
un parent ou une racine. `to-verify` exige une note non vide.

`sp_activity_set_pedagogical_identity` utilise un CTE récursif sur les ancêtres
et rejette une activité qui deviendrait son propre ancêtre.

### 6. Playable publié et asset de sortie

La FK simple sur `published_playable_id` a été remplacée par :

```sql
FOREIGN KEY (output_asset_id, published_playable_id)
REFERENCES media_playables(asset_id, id)
```

La clé candidate `(asset_id, id)` existe déjà sur `media_playables`.
MariaDB garantit donc que le playable publié appartient à l’asset de sortie.

### 7. Règle uniforme de rattachement

Un média rattachable à une activité doit avoir :

- un asset `active` ;
- aucun `deleted_at` ;
- un playable appartenant à cet asset ;
- `availability = 'available'` ;
- aucun `removed_at`.

Cette règle exclut donc `reserved`, `archived`, `deleted`,
`pending-removal`, les playables manquants et les associations incohérentes.

La même condition est appliquée à :

- `sp_activity_set_primary_media` ;
- `sp_activity_set_supplementary_media` ;
- `sp_activity_duplicate` avant copie de ses liens.

Les lectures étudiantes vérifient aussi que l’asset reste actif et le playable
disponible.

### 8. Confidentialité du bundle étudiant

Chaque collection du bundle étudiant porte maintenant `activity_id`.

Le bundle étudiant :

- ne renvoie que les couches learner avec `is_visible = 1` ;
- ne renvoie que les phénomènes de ces couches ;
- exclut un overlay lié exclusivement à une couche auteur/enseignant ;
- ne renvoie pas les notes de `activity_annotations`.

Un overlay sans couche reste globalement visible ; un overlay doté de couches
doit posséder au moins une couche learner visible.

## Validation précise des erreurs

La recette 003 fournit un helper fondé sur :

```sql
GET DIAGNOSTICS CONDITION 1
  RETURNED_SQLSTATE,
  MYSQL_ERRNO,
  MESSAGE_TEXT
```

Chaque test négatif peut vérifier :

- la présence d’une exception ;
- le numéro MariaDB ;
- le SQLSTATE ;
- un fragment stable du message.

Distinctions utilisées :

- erreur métier par `SIGNAL` :
  SQLSTATE `45000`, codes 302xx/303xx ;
- FK relationnelle :
  erreur 1452, SQLSTATE `23000`, nom de la contrainte ;
- `CHECK` :
  erreur 4025, SQLSTATE `23000`, nom de la contrainte ;
- toute autre erreur moteur : échec du test.

Le contrôle négatif interne fournit volontairement un mauvais errno attendu.
Le probe renvoie `matches = 0` tout en capturant le véritable code 30220. La
recette prouve donc qu’une mauvaise erreur ne peut pas rendre le test vert.

Les quatre helpers `sp_m130_*` sont supprimés à la fin.

## Contrats de lecture

### `sp_activity_get` — 17 jeux

1. activité et identité pédagogique ;
2. champs textuels pédagogiques ;
3. qualifications ;
4. média principal et supplémentaires avec locator complet ;
5. langues ;
6. transcription ;
7. locuteurs ;
8. segments ;
9. liens segment–locuteur ;
10. liens segment–langue ;
11. intervalles linguistiques ;
12. couches ;
13. visibilité ;
14. phénomènes ;
15. annotations auteur ;
16. overlays ;
17. liens overlay–couche.

Les collections portent `activity_id`; les identifiants locaux relient les
jeux entre eux. Un jeu peut être vide si la collection n’existe pas.

### `sp_student_activity_bundle` — 12 jeux

1. en-tête publié ;
2. médias disponibles avec locator complet ;
3. langues ;
4. locuteurs ;
5. segments ;
6. liens segment–locuteur ;
7. liens segment–langue ;
8. intervalles ;
9. couches learner visibles ;
10. phénomènes learner visibles ;
11. overlays learner/globalement visibles ;
12. liens overlay–couche learner visibles.

Le premier jeu est vide si l’activité n’est pas publiée ou ne possède pas de
principal actif et disponible. Les autres jeux peuvent être vides selon le
contenu.

### Auteur, média et bibliothèques

- `sp_author_activity_bundle` délègue aux 17 jeux de `sp_activity_get` ;
- `sp_media_get` conserve 5 jeux : asset, sources, playables+technique, tags,
  usages ;
- les bibliothèques activité et média renvoient un jeu paginé explicite,
  désormais muni du locator du playable principal/par défaut.

Tous les `SELECT` listent explicitement leurs colonnes. Aucun `SELECT *` ne
reste.

### Limite d’introspection

MariaDB ne fournit pas en SQL pur un mécanisme portable pour capturer dans des
tables les métadonnées successives de tous les jeux renvoyés par `CALL`.

La validation a donc été distinguée honnêtement :

- automatique SQL : fixture et relations, locators, présence de fragments de
  contrat dans `ROUTINE_DEFINITION` ;
- statique : 17 et 12 blocs documentés, colonnes et alias ;
- exécution réelle : appels des bundles, de la fiche média et des
  bibliothèques sur la fixture peuplée ;
- inspection de sortie : en-têtes et lignes essentielles capturés par le
  client MariaDB.

Observations de sortie :

- locator local `proto05-test` + `m130/local.mp4` présent ;
- locator distant présent ;
- principal identifiable par `role = primary` et `sort_order = 0` ;
- deux supplémentaires ordonnés 10 et 20 ;
- overlay public observé dans général, étudiant et auteur : 3 occurrences ;
- overlay privé observé dans général et auteur seulement : 2 occurrences.

Le nombre de jeux est prouvé statiquement et leur exécution est réelle, mais
leur métadonnée complète n’est pas prétendue introspectée automatiquement par
SQL.

## Fixture non vide

La recette a créé temporairement :

- une activité publiée et son identité pédagogique documentée ;
- une racine, une variante et une variante de second niveau ;
- un principal local ;
- deux supplémentaires, dont un distant ;
- deux langues ;
- une transcription ;
- deux locuteurs ;
- deux segments ;
- deux liens locuteur et deux liens langue ;
- deux intervalles ;
- une couche learner et une couche auteur ;
- deux phénomènes ;
- deux annotations ;
- un overlay public et un overlay auteur ;
- plusieurs familles et dérivations média ;
- traitements actifs, annulé et terminés.

Toutes les lignes portaient le préfixe `m130_`.

## Résultats des 39 contrôles

### Diagnostics et lignées pédagogiques

1. le helper rejette un mauvais errno ;
2. le `SIGNAL` de conflit est identifié précisément ;
3. variante de second niveau valide ;
4. parent d’une autre racine rejeté par la procédure ;
5. auto-parenté rejetée ;
6. cycle récursif rejeté ;
7. parent inter-lignée rejeté par la FK composite ;
8. combinaison `NULL` invalide rejetée par le `CHECK`.

### Rattachements et lignée média

9–18. principal et supplémentaire rejettent chacun :

- asset archivé ;
- asset supprimé logiquement ;
- playable `pending-removal` ;
- playable indisponible ;
- paire asset–playable incohérente.

19. parent d’une autre famille rejeté par FK composite ;
20. auto-parenté média rejetée par `CHECK` ;
21. cycle direct rejeté par la procédure.

### Traitements et finalisation

22. `running -> queued` rejeté ;
23. régression de progression rejetée ;
24. `cancelling -> running` rejeté ;
25. modification terminale rejetée ;
26. autre `storage_key` au rejeu rejetée ;
27. autre digest rejeté ;
28. autre taille/mime rejeté ;
29. absence de duplication après rejeu identique ;
30. playable publié d’un autre asset rejeté par FK ;
31. retour `completed -> running` rejeté ;
32. enfant et petit-enfant valides dans la même famille ;
33. réutilisation d’un ancêtre comme sortie rejetée.

Les appels identiques de `running`, `cancelled` et de finalisation ont également
été exécutés avec succès et `changed = 0`.

### Lecture, confidentialité, historique et nettoyage

34. locators local/distant et ordre des médias présents ;
35. graphe auteur réellement non vide ;
36. locators présents dans les contrats activité/étudiant ;
37. filtre auteur-only présent dans le contrat étudiant ;
38. historique d’import répétable ;
39. toutes les fixtures supprimées avec FK actives.

Les procédures de lecture structurantes ont été appelées entre les contrôles
37 et 38, avant nettoyage.

## Nettoyage sans désactivation des FK

La recette 003 ne contient aucune désactivation de contrainte.

Ordre de purge :

1. opérations de stockage ;
2. liens activité–média ;
3. traitements ;
4. suppression des playables par défaut des assets ;
5. métadonnées, playables, sources et tags média ;
6. assets feuilles, puis parents, dans une boucle contrôlée ;
7. overlays, annotations, phénomènes et couches ;
8. intervalles, liens segmentaires, segments, locuteurs et transcription ;
9. langues d’activité et détails pédagogiques ;
10. variantes pédagogiques du niveau le plus profond vers les racines ;
11. référentiels et imports de test.

La boucle média échoue explicitement si aucun asset feuille ne peut être
supprimé, ce qui détecterait un cycle résiduel au lieu de le masquer.

La racine média à `family_root_asset_id = NULL` permet sa purge normale une
fois ses descendants supprimés.

## SQL SECURITY et privilèges

Les 43 procédures utilisent `SQL SECURITY DEFINER`.

État installé :

- propriétaire effectif : `root@localhost`, car le compte DBA du conteneur a
  installé les routines ;
- aucun `DEFINER='compte'@'hôte'` n’est codé dans le script ;
- sur un autre environnement, le propriétaire sera le compte installateur ;
- aucun secret n’est présent dans les livrables.

Doctrine attendue :

- compte DBA/déploiement propriétaire des objets et responsable des
  migrations ;
- compte applicatif avec `EXECUTE` sur les procédures ;
- aucun droit DML direct sur les tables métier ;
- éventuel `SELECT` direct limité aux référentiels réellement nécessaires,
  ou remplacé ultérieurement par un contrat de lecture ;
- aucune possibilité applicative de contourner les contrôles récursifs par
  `INSERT`/`UPDATE` direct.

Aucun `GRANT`, `REVOKE`, utilisateur ou privilège global n’a été modifié.

## Validation statique

Résultats :

- 31 tables, 31 noms uniques ;
- 43 procédures, 43 noms uniques ;
- 43 couples `DROP/CREATE` ;
- 43 `SQL SECURITY DEFINER` ;
- 116 contraintes nommées, 116 noms uniques ;
- 98 occurrences de codes d’erreur, 98 codes uniques ;
- 24 transactions, 24 `COMMIT`, 24 handlers ;
- paramètres et variables locales de chaque procédure cohérents ;
- clés candidates des trois FK composites présentes et uniques ;
- 17 jeux documentés pour `sp_activity_get` ;
- 12 jeux documentés pour `sp_student_activity_bundle` ;
- contrat auteur déléguant à la fiche complète ;
- aucun `SELECT *` ;
- six `ROW_COUNT()` restants, utilisés avec contrôle d’existence ou pour la
  progression explicite du nettoyage ;
- aucun `CREATE DATABASE` ;
- aucun secret ;
- aucune désactivation des FK dans la recette ;
- `git diff --check` sans diagnostic ;
- aucune espace finale détectée.

Validation moteur :

- les colonnes générées sont matérialisées ;
- les clés candidates sont reconnues ;
- les FK composites sont présentes dans `information_schema` ;
- 48 FK et 65 `CHECK` reconnus ;
- le CTE récursif de la procédure est accepté par MariaDB 11.

## Réinstallation et erreurs rencontrées

Environnement :

- image : `mariadb:11` ;
- conteneur de référence : `ic_dico_mariadb_next` ;
- port local : 3306 ;
- base : `ic_augmented_video`.

Le secret a été lu uniquement depuis l’environnement interne du conteneur. Il
n’apparaît ni dans une commande reproduite, ni dans les fichiers, ni ici.

### Suppression du schéma 002

Le premier `DROP TABLE` groupé a rencontré l’erreur 1451 à cause des références
croisées `media_assets`/`media_playables`. MariaDB avait déjà supprimé les
tables indépendantes précédentes et les procédures.

Correction :

- inventaire immédiat de l’état partiel ;
- retrait ciblé de `fk_media_asset_default_playable` ;
- suppression des 14 tables restantes dans l’ordre précis de leurs FK ;
- aucune suppression de base ;
- aucune suspension des FK.

### Première installation 003

La première installation 003 a créé les 31 tables et 27 procédures, puis a
rencontré une erreur 1064 sur un `END IF` surnuméraire dans
`sp_media_treatment_update`.

Correction :

- suppression du `END IF` excédentaire ;
- inventaire de l’installation partielle vide ;
- nettoyage ciblé ;
- réinstallation complète réussie.

### Première recette 003

Tous les contrôles précédant la purge ont réussi. Le nettoyage a ensuite
rencontré l’erreur 1451 : `activity_language_intervals` référence
`activity_languages` en `RESTRICT`, ce qui ne permet pas de dépendre seulement
de la cascade de l’activité.

Correction :

- ajout d’une purge topologique explicite de tout le graphe auteur ;
- nouvelle exécution complète ;
- 39 contrôles réussis et nettoyage final réussi.

## Contrôles finaux réels

Résultats :

- base active : `ic_augmented_video` ;
- `FOREIGN_KEY_CHECKS` : 1 ;
- marqueur 003 `media_assets.lineage_root_key` : présent ;
- marqueur de finalisation stricte dans la routine : présent ;
- tables : 31 ;
- procédures : 43 ;
- helpers `sp_m130_*` : 0 ;
- triggers : 0 ;
- événements : 0 ;
- tables `m130_*` : 0 ;
- 31 `COUNT(*)` réels : tous à zéro.

Comparaison des témoins finaux :

- `ic_dico` : 8 tables et 9 procédures, inchangé ;
- `ic_hub` : 15 tables, 1 vue et 3 procédures, inchangé.

## Comparaison 002 / 003

| Objet | 002 | 003 |
|---|---:|---:|
| Tables | 31 | 31 |
| Procédures | 43 | 43 |
| FK moteur | 47 | 48 |
| `CHECK` moteur | 65 | 65 |
| Tests annoncés/réussis | 21 | 39 |

Aucune table ni procédure métier n’a été ajoutée ou supprimée. Les changements
portent uniquement sur les colonnes, contraintes et contrats demandés.

## Ce qui n’a pas été vérifié

Conformément au mandat :

- aucune migration JSON ;
- aucun changement ou lancement Node ;
- aucune route ni interface ;
- aucun Chromium ;
- aucun FFmpeg réel ;
- aucune recette visuelle ;
- aucune suite applicative ;
- aucun test de charge concurrent multi-session ;
- aucun déploiement de privilèges applicatifs ;
- aucune validation fonctionnelle humaine de David.

Les appels SQL, contraintes et sorties MariaDB sont validés. L’intégration du
locator et des multi-result sets dans Node reste une mission séparée.

## Décisions restant à valider par David

- confirmer le graphe exact des transitions avant branchement du worker ;
- confirmer qu’un overlay sans couche est bien globalement visible ;
- confirmer la politique d’exposition/transformation des locators côté Node ;
- valider la doctrine de privilèges avec le DBA ;
- valider la consommation des result sets par l’adaptateur Node ;
- décider ultérieurement de la politique de purge des lignes logiquement
  supprimées.

Ces décisions ne bloquent pas la cohérence du schéma 003 installé.

## Fichiers créés

- `prototypes/05-augmented-ic-video-01/database/drafts/003_proto05_schema_hardening.sql` ;
- `prototypes/05-augmented-ic-video-01/database/tests/003_proto05_schema_validation.sql` ;
- `reports/130_proto05_mariadb_schema_hardening_and_validation.md`.

Aucun autre fichier n’a été créé ou modifié par la Mission 130.

## État Git final et suite

État attendu :

```text
?? prototypes/05-augmented-ic-video-01/database/drafts/002_proto05_schema_revision.sql
?? prototypes/05-augmented-ic-video-01/database/drafts/003_proto05_schema_hardening.sql
?? prototypes/05-augmented-ic-video-01/database/tests/
?? reports/128_proto05_mariadb_model_revision_and_validation.md
?? reports/130_proto05_mariadb_schema_hardening_and_validation.md
```

Le répertoire `tests/` contient les recettes 002 préservée et 003 créée.

Aucun commit ni push n’a été réalisé.

Message de commit proposé :

`feat(proto05): harden MariaDB schema invariants`

Suite possible après revue humaine : commit des livrables 002/003 et rapports,
ou mission séparée de branchement Node. Aucune migration JSON ne doit être
déduite de la présente mission.
