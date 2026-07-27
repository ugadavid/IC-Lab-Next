# Mission 129 — Proto05 — Révision du modèle MariaDB et validation

Date : 27 juillet 2026

## Résultat

La révision 002 du schéma Proto05 a été corrigée, installée et validée dans la
base locale dédiée `ic_augmented_video`.

État final vérifié :

- 31 tables InnoDB installées ;
- 43 procédures stockées installées ;
- 47 contraintes de clé étrangère et 65 contraintes `CHECK` reconnues par
  MariaDB ;
- 43 procédures en `SQL SECURITY DEFINER`, sans `DEFINER` nominatif codé dans
  le script ;
- 21 contrôles fonctionnels SQL réussis ;
- 31 tables comptées réellement à zéro ligne après la recette ;
- aucune procédure ni aucun trigger temporaire de test restant ;
- aucun fichier JSON, code Node, route, Docker, serveur, fichier média ou
  version applicative modifié ;
- aucun commit et aucun push effectués.

Le schéma reste installé, mais vide, dans `ic_augmented_video`.

## État de départ

- Branche : `main`.
- HEAD :
  `3b511bdea8ceabb630110bae2bb8e38f13023042`
  (`Db document mission 128`).
- `git status --short` initial : propre.
- Version Proto05 : `0.1.45`.
- Base cible : `ic_augmented_video`, existante et vide.
- Le rapport
  `reports/128_database_connection_information_inventory.md` existait déjà.
  Le présent rapport conserve néanmoins le nom exact imposé par la Mission 129,
  sans modifier ni remplacer cet autre rapport.

La Mission 129 est une révision de schéma et une validation technique. La
version Proto05 reste donc `0.1.45`.

## Sources inspectées

Les sources demandées ont été lues et comparées à l’état réel :

- `reports/126_proto05_storage_inspection_before_mariadb.md` ;
- `reports/127_proto05_mariadb_model_draft.md` ;
- `prototypes/05-augmented-ic-video-01/database/drafts/001_proto05_schema_draft.sql` ;
- configuration Docker de référence utile à l’identification de l’instance et
  du port ;
- `prototypes/05-augmented-ic-video-01/server/package.json` pour la version.

Le brouillon 001 n’a pas été modifié. Son empreinte Git et son empreinte de
travail sont identiques :
`b8d3f8ba3a2419b3d24e8c9a9de6ff1f48ec8501`.

Les anciennes entrées de développement et les vidéos indisponibles n’ont fait
l’objet d’aucune enquête, conformément à l’arbitrage explicite de David.

## Synthèse des douze corrections

### 1. Base cible et séparation DBA/application

Le script complet contient `USE ic_augmented_video;` et ne contient ni
`CREATE DATABASE`, ni `ic_proto05`, ni identifiant de connexion.

La création de la base et de l’utilisateur reste une responsabilité DBA. Le
script 002 installe uniquement les objets applicatifs dans une base existante.

### 2. Intégrité source–playable

`media_sources` expose désormais la clé candidate
`UNIQUE (asset_id, id)`. `media_playables` possède une FK composite
`(asset_id, source_id)` vers cette clé.

La base rejette ainsi directement un playable qui prétend utiliser une source
d’un autre asset. L’index composite nécessaire est présent.

### 3. Plusieurs médias supplémentaires et un seul principal

`activity_media_links` possède maintenant :

- un identifiant propre `id` comme clé primaire ;
- un rôle `primary` ou `supplementary` ;
- un `sort_order` explicite ;
- une colonne générée `primary_activity_id` ;
- une unicité sur `primary_activity_id`, qui garantit au plus un principal ;
- une unicité sur `(activity_id, media_asset_id)` ;
- une unicité sur `(activity_id, role, sort_order)`.

Deux procédures ont été ajoutées :

- `sp_activity_set_supplementary_media` ;
- `sp_activity_remove_supplementary_media`.

### 4. Faux « introuvable » et idempotence

Les six usages de `ROW_COUNT()` restants sont encadrés par un contrôle
d’existence distinct. Les opérations déjà satisfaites réussissent avec
`changed = 0`; une ligne absente produit une erreur; une modification réelle
renvoie `changed = 1`.

Cette doctrine couvre notamment renommage, classement, tags, disponibilité,
liens médias, opérations de stockage et finalisations répétées.

### 5. Atomicité des créations et mutations multi-tables

`sp_activity_create` place l’activité et son identité pédagogique dans une
même transaction avec handler `ROLLBACK`/`RESIGNAL`.

Les mutations multi-tables significatives utilisent la même structure. La
révision 002 contient 24 transactions, 24 `COMMIT` et 24 handlers de sortie.
Les lectures simples ne sont pas artificiellement transactionnelles.

### 6. Contraintes `CHECK` sensibles à `NULL`

Les règles conditionnelles sont exprimées par branches explicites
`IS NULL`/`IS NOT NULL`, notamment pour :

- les états de connaissance et leurs valeurs qualifiées ;
- la filiation pédagogique racine/variante ;
- les localisations de playables locaux ou distants ;
- les sorties et dates des traitements terminés ;
- les informations de lignée média.

Exemples désormais rejetés et testés :

- `intention_state = 'known'` avec `intention_value = NULL` ;
- playable `local-file` avec `storage_key = NULL`.

### 7. Retrait physique sans fenêtre de concurrence

Un playable peut passer de son état antérieur à `pending-removal` uniquement
par `sp_storage_file_removal_request`. La transition et la création de
`storage_operations` sont atomiques.

Transitions retenues :

```text
available (ou autre état antérieur)
  -> pending-removal
     -> missing-local + removed_at, si succès physique
     -> état et raison antérieurs, si échec physique
```

L’opération conserve `previous_availability` et `previous_reason`. Une seule
opération ouverte par playable/type est garantie par une colonne générée et
une clé unique. Les demandes, succès et échecs répétés sont idempotents.

MariaDB ne supprime jamais le fichier : le futur worker Node exécutera
l’opération physique puis appellera la procédure de succès ou d’échec.

### 8. Suppression bloquée pendant les traitements actifs

Les statuts actifs retenus sont `queued`, `running` et `cancelling`.

Le démarrage d’un traitement verrouille sa source et réserve
transactionnellement son asset de sortie avec le cycle `reserved`. Les
suppression d’asset et de lignée vérifient les usages en entrée et en sortie.
La finalisation active l’asset réservé et publie source, playable et métadonnées
dans la même transaction. Un échec terminal retire logiquement la réservation.

### 9. Révision optimiste harmonisée

`activities.revision` est la révision éditoriale unique.

Participent à la révision :

- métadonnées et statut éditorial ;
- identité et détails pédagogiques ;
- graphe auteur : segments, langues, locuteurs, intervalles, couches,
  phénomènes, annotations et overlays ;
- média principal ;
- médias supplémentaires.

Ne participent pas à la révision :

- classement de l’activité dans un dossier ;
- dossiers et tags de médias ;
- métadonnées techniques du playable.

Chaque mutation éditoriale accepte `p_expected_revision`, verrouille
l’activité, signale explicitement un conflit, et n’incrémente qu’une fois si
le contenu change réellement.

### 10. Contrats de lecture explicites

Aucun `SELECT *` contractuel ne reste. Les occurrences d’astérisque sont
uniquement des `COUNT(*)`.

Principaux contrats :

| Procédure | Jeux de résultats |
|---|---|
| `sp_activity_get` | 17 : en-tête+identité, textes pédagogiques, qualifications, médias, langues, transcription, locuteurs, segments, liens locuteurs, liens langues, intervalles, couches, visibilité, phénomènes, annotations, overlays, liens overlay–couche |
| `sp_student_activity_bundle` | 12 : en-tête publié, médias disponibles, langues, locuteurs, segments, liens locuteurs, liens langues, intervalles, couches apprenant, phénomènes visibles, overlays, liens visibles |
| `sp_author_activity_bundle` | les 17 jeux de `sp_activity_get` |
| `sp_media_get` | 5 : asset, sources, playables+technique, tags, usages actifs |
| `sp_media_lineage_get` | 1 : famille média ordonnée |
| `sp_media_treatments_search` | 1 : traitements filtrés et paginés |
| bibliothèques activité/média | 1 jeu de cartes explicites, filtré et paginé |

### 11. Historique des imports

L’unicité `(source_kind, source_digest)` a été remplacée par l’index non unique
`idx_import_runs_snapshot`. Deux exécutions portant sur la même empreinte
peuvent donc être journalisées séparément avec leur propre statut et résultat.

### 12. `SQL SECURITY` et privilèges

Doctrine retenue :

- procédures métier en `SQL SECURITY DEFINER` ;
- aucun `DEFINER='compte'@'hôte'` codé dans le fichier ;
- installation par un propriétaire de déploiement/DBA valide ;
- futur utilisateur applicatif limité à `EXECUTE` et aux lectures directes
  strictement nécessaires ;
- migrations et maintenance par un compte DBA distinct.

La mission n’a volontairement créé, révoqué ou accordé aucun privilège. La
politique de production devra être appliquée séparément après validation DBA.

## Évolution des objets

Le nombre de tables reste 31 : aucune table n’a été ajoutée ou supprimée par
rapport au brouillon 001. Les tables structurantes modifiées sont notamment :

- `import_runs` ;
- `activities` ;
- `activity_pedagogical_identities` ;
- `activity_pedagogical_text_fields` ;
- `media_assets` ;
- `media_sources` ;
- `media_playables` ;
- `media_treatments` ;
- `activity_media_links` ;
- `storage_operations`.

Le nombre de procédures passe de 41 à 43. Aucune procédure n’est supprimée.
Les deux ajouts sont les procédures de pose et retrait des médias
supplémentaires. Les procédures de mutation, traitement, stockage, suppression
et lecture concernées ont été révisées.

Objets finalement présents dans `ic_augmented_video` :

- 31 tables : `schema_migrations`, `import_runs`, `languages`,
  `activity_folders`, `media_folders`, `media_tags`, `activities`,
  `activity_pedagogical_identities`,
  `activity_pedagogical_text_fields`,
  `activity_pedagogical_qualifications`, `activity_languages`,
  `activity_transcriptions`, `activity_speakers`, `activity_segments`,
  `activity_segment_speakers`, `activity_segment_languages`,
  `activity_language_intervals`, `activity_layers`,
  `activity_layer_visibility`, `activity_phenomena`,
  `activity_annotations`, `activity_overlays`, `activity_overlay_layers`,
  `media_assets`, `media_sources`, `media_playables`,
  `media_playable_metadata`, `media_asset_tags`, `media_treatments`,
  `activity_media_links`, `storage_operations` ;
- 43 procédures métier et de lecture définies par le script 002 ;
- aucun trigger ;
- aucune procédure temporaire `sp_m129_*`.

## Validation statique

Contrôles réalisés avant installation :

- 31 `CREATE TABLE`, 31 noms uniques ;
- 43 `CREATE PROCEDURE`, 43 noms uniques ;
- 43 `DROP PROCEDURE IF EXISTS` correspondants ;
- 43 `SQL SECURITY DEFINER` ;
- un couple de délimiteurs ;
- 24 transactions, 24 `COMMIT`, 24 handlers ;
- paramètres et variables locales de chaque procédure contrôlés ;
- FK composite source–playable et index cibles contrôlés ;
- unicité générée du média principal contrôlée ;
- aucun `SELECT *` ;
- six `ROW_COUNT()` tous associés à une distinction existence/changement ;
- aucun `CREATE DATABASE`, identifiant ou mot de passe ;
- `git diff --check` sans diagnostic.

Une garde `pending-removal` avait été placée par erreur dans la procédure de
renommage d’un dossier au cours de la rédaction. Le contrôle des variables l’a
détectée avant toute exécution ; elle a été déplacée dans
`sp_media_update_playable_availability`.

## Environnement et installation réelle

Environnement observé :

- image : `mariadb:11` ;
- conteneur de référence : `ic_dico_mariadb_next` ;
- port hôte : `3306` ;
- base : `ic_augmented_video`.

La connexion d’installation a utilisé le secret déjà présent dans
l’environnement interne du conteneur, sans valeur en clair dans la commande,
le dépôt ou ce rapport.

Contrôles immédiatement antérieurs à l’installation :

```sql
SELECT DATABASE();
SHOW TABLES;
```

Résultat : `ic_augmented_video`, aucune table.

Le script 002 a ensuite été transmis sur l’entrée standard du client MariaDB.
Installation réussie avec code de sortie zéro. Les 43 notes `1305` signalant
que les procédures à supprimer n’existaient pas étaient attendues sur une base
vide ; aucune erreur d’installation n’a eu lieu.

Inventaire moteur après installation :

- 31 tables ;
- 43 procédures ;
- 47 FK ;
- 65 `CHECK` ;
- 43 procédures `DEFINER`.

Une première tentative de requête de contrôle avait subi un problème de
guillemets du client ; aucune écriture n’a été exécutée. La requête a été
rejouée par l’entrée standard et a confirmé la bonne base.

## Recette SQL

Le script reproductible utilise uniquement des identifiants préfixés `m129_`.
Une fixture provoque volontairement l’échec du second insert de
`sp_activity_create` pour prouver le rollback du premier.

Contrôles réussis :

1. propagation de l’échec forcé de l’identité ;
2. atomicité de la création d’activité ;
3. création complète activité+identité ;
4. rejet source d’un autre asset par la FK composite ;
5. coexistence d’un principal et de plusieurs supplémentaires ;
6. rejet relationnel d’un second principal ;
7. idempotence sans incrément de révision ;
8. rejet d’une révision obsolète ;
9. rejet d’une valeur pédagogique `known` à `NULL` ;
10. rejet d’une localisation locale incomplète ;
11. blocage de suppression d’une sortie de traitement active ;
12. retrait de la réservation après échec terminal ;
13. publication idempotente d’un traitement réussi ;
14. transition atomique vers `pending-removal` ;
15. réutilisation de l’unique opération de stockage ouverte ;
16. interdiction de rattacher un playable `pending-removal` ;
17. restauration après échec physique simulé ;
18. finalisation idempotente après succès physique simulé ;
19. deux `import_runs` avec le même digest ;
20. lecture réelle des contrats activité, étudiant et auteur ;
21. suppression de toutes les données persistantes de test.

La première exécution a validé les 19 contrôles métier alors présents, puis le
nettoyage a rencontré l’erreur FK `1451` : les assets racines s’auto-référencent
par `family_root_asset_id` et leur suppression physique est volontairement
restreinte.

Le script de recette a été corrigé ainsi :

- conservation de la valeur de session `FOREIGN_KEY_CHECKS` ;
- désactivation limitée à la suppression des seuls assets `m129_` ;
- restauration immédiate de la valeur ;
- handler restaurant aussi la valeur en cas d’erreur.

La recette complète a ensuite été rejouée, puis enrichie du test de traitement
réussi. Les 21 contrôles ont réussi avec
`MISSION_129_VALIDATION_COMPLETE`.

Le nettoyage ne simule aucune suppression de fichier physique.

## État final de la base

Un `COUNT(*)` réel a été exécuté sur chacune des 31 tables. Les 31 résultats
sont égaux à zéro, y compris :

- `activities` et toutes ses tables filles ;
- `media_assets`, sources, playables, métadonnées, traitements et liens ;
- `storage_operations` ;
- `import_runs` ;
- `schema_migrations`.

Contrôles additionnels :

- base courante : `ic_augmented_video` ;
- tables : 31 ;
- procédures : 43 ;
- procédures de test `sp_m129_*` : 0 ;
- triggers : 0.

Le schéma est donc installé et vide. Aucune donnée canonique antérieure n’a été
lue, migrée ou modifiée.

## Commandes et requêtes utilisées

Les opérations importantes, présentées sans secret, sont :

```text
git status --short
git branch --show-current
git log -1
lecture et contrôles statiques des scripts 001 et 002
docker ps (filtre sur le conteneur MariaDB de référence)
client MariaDB via stdin vers ic_augmented_video
SELECT DATABASE()
SHOW TABLES
interrogation de information_schema
exécution du script 002
exécution du script de validation 002
COUNT(*) de chaque table
git diff --check
```

Le mot de passe n’a été ni affiché, ni écrit, ni consigné.

## Éléments non vérifiés

Conformément aux interdictions de la mission, aucun contrôle n’a porté sur :

- la migration des JSON ;
- l’intégration Node ou les routes ;
- le serveur Proto05 ;
- HTTP, Chromium ou l’interface ;
- FFmpeg réel ou le système de fichiers média ;
- la suite applicative complète ;
- les privilèges du futur compte applicatif en production ;
- une charge concurrente multi-session ;
- la validation fonctionnelle humaine de David.

La recette SQL de Codex établit le comportement du schéma sur MariaDB 11 ; elle
ne remplace pas une validation humaine ou DBA.

## Décisions restant à valider par David

- confirmer la doctrine éditoriale de `activities.revision` avant adaptation
  du serveur ;
- confirmer que dossier d’activité et classement média restent hors révision ;
- confirmer les statuts actifs `queued`, `running`, `cancelling` ;
- confirmer la restauration exacte de disponibilité après échec physique ;
- valider la consommation Node des contrats multi-result-set ;
- valider avec le DBA le propriétaire des routines et les `GRANT EXECUTE` /
  retraits de droits directs du futur compte applicatif ;
- décider ultérieurement de la rétention et de la purge physique des lignes
  logiquement supprimées.

Ces décisions ne bloquent pas la validité du schéma de travail installé.

## Fichiers créés

- `prototypes/05-augmented-ic-video-01/database/drafts/002_proto05_schema_revision.sql` ;
- `prototypes/05-augmented-ic-video-01/database/tests/002_proto05_schema_validation.sql` ;
- `reports/128_proto05_mariadb_model_revision_and_validation.md`.

Aucun autre fichier n’a été modifié. Le brouillon 001, Docker, le code
applicatif, les données et la version sont inchangés.

## État Git final et suite

État attendu après création des livrables :

```text
?? prototypes/05-augmented-ic-video-01/database/drafts/002_proto05_schema_revision.sql
?? prototypes/05-augmented-ic-video-01/database/tests/
?? reports/128_proto05_mariadb_model_revision_and_validation.md
```

Aucun commit ni push n’a été réalisé.

Message de commit proposé :

`feat(proto05): revise and validate MariaDB schema`

Suite possible, uniquement après décision explicite : revue humaine/DBA de la
révision 002, puis mission séparée de préparation de migration JSON. Aucune
migration n’est incluse ici.
