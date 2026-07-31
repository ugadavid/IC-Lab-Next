# Mission 149 — Audit post-cutover de l’intégrité MariaDB de Proto05

Date de l’audit : 31 juillet 2026

Prototype : `prototypes/05-augmented-ic-video-01`

Version observée : `0.1.48` — inchangée

Révision Git de départ : `007c4dd` (`test(proto05): restore MariaDB-safe navigation coverage`)

## Résumé exécutif

L’état courant de `ic_augmented_video` est relationnellement cohérent :

- les 32 tables attendues sont présentes, en InnoDB et `utf8mb4_unicode_ci` ;
- les 48 clés étrangères ont été contrôlées sans trouver aucun orphelin ;
- aucun cycle de filiation, doublon d’ordre contrôlé, intervalle invalide, JSON syntaxiquement invalide ou état média contradictoire n’a été détecté ;
- la projection applicative relit les 4 activités et le catalogue média sans erreur de validation ;
- le compte applicatif est limité à `SELECT`, `INSERT`, `UPDATE`, `DELETE` et `SHOW VIEW` sur la seule base du prototype, avec `USAGE` global et sans droit de schéma ni délégation ;
- aucune donnée, aucun schéma, aucun média et aucun code applicatif n’ont été modifiés pendant l’audit.

Il n’existe donc pas de preuve de corruption actuelle. Le cutover n’est toutefois pas entièrement fermé sur le plan opérationnel. Quatre risques importants ont été démontrés :

1. une lecture applicative agrège 29 tables sans transaction de lecture cohérente ;
2. les écritures sérialisent leur exécution, mais n’appliquent aucun contrôle de concurrence optimiste sur le snapshot chargé avant la file d’écriture ;
3. l’instance ne possède ni historique de migration renseigné ni procédure stockée, alors que la recette SQL versionnée en déclare 43 ;
4. les opérations mêlant fichiers et SQL reposent sur une compensation en mémoire, sans outbox durable, malgré le contrat à deux phases prévu dans le schéma déclaré.

Aucun de ces risques ne justifie une mutation pendant la présente mission. Ils doivent être traités par des missions correctives séparées et réversibles.

## Périmètre et méthode

L’audit a été conduit exclusivement par :

- inspection du code, des migrations, des tests et des rapports existants ;
- `SELECT`, `SHOW`, interrogation de `information_schema`, CTE récursives et `EXPLAIN` ;
- relecture de fichiers média et calcul local de leurs SHA-256 ;
- validation des projections métier en mémoire.

Toutes les connexions d’audit ont activé `SET SESSION TRANSACTION READ ONLY`. Aucun `INSERT`, `UPDATE`, `DELETE`, DDL, procédure de test, fixture, serveur applicatif, Chromium ou FFmpeg n’a été exécuté. Aucun secret ni DSN complet n’est reproduit dans ce rapport.

L’audit porte sur l’état réellement installé. Les fichiers SQL historiques servent à établir le contrat déclaré, mais ne prévalent pas sur l’instance et le runtime observés.

## Schéma réellement installé

### Empreinte globale

| Propriété | Valeur observée |
|---|---:|
| Tables de base | 32 |
| Colonnes | 275 |
| Clés étrangères | 48 |
| Contraintes `CHECK` | 70 |
| Index, primaire et uniques compris | 89 |
| Procédures/fonctions | 0 |
| Triggers | 0 |
| Events | 0 |
| Règles de suppression FK | 20 `CASCADE`, 26 `RESTRICT`, 2 `SET NULL` |
| Lignes totales | 348 |
| Entrées `schema_migrations` | 0 |
| Entrées `import_runs` | 0 |

### Modèle relationnel effectif

Les identifiants métier sont des chaînes fournies par l’application ; le modèle ne dépend pas de clés techniques auto-incrémentées.

| Domaine | Tables | Relations et rôle effectifs |
|---|---|---|
| Pilotage | `schema_migrations`, `import_runs`, `data_projection_metadata` | Registre de schéma, témoins d’import et métadonnées de projection. Seule la dernière table contient actuellement des lignes. |
| Référentiels et classement | `languages`, `activity_folders`, `media_folders`, `media_tags`, `media_asset_tags` | Langues, arborescences et tags. Les suppressions de dossier détachent les objets par `SET NULL`; la jonction de tags cascade. |
| Activité | `activities`, `activity_pedagogical_identities`, `activity_pedagogical_text_fields`, `activity_pedagogical_qualifications` | Racine de l’activité, identité pédagogique, champs documentaires et qualifications. La filiation pédagogique référence d’autres activités avec protection restrictive. |
| Auteur temporel | `activity_languages`, `activity_transcriptions`, `activity_speakers`, `activity_segments`, `activity_segment_speakers`, `activity_segment_languages`, `activity_language_intervals` | Graphe de transcription, locuteurs, langues et intervalles, entièrement qualifié par `activity_id`. Les bornes imposent `end_ms > start_ms`. |
| Enrichissements | `activity_layers`, `activity_layer_visibility`, `activity_phenomena`, `activity_annotations`, `activity_overlays`, `activity_overlay_layers` | Couches, visibilité, phénomènes, annotations et overlays. Les relations internes utilisent des clés composites incluant l’activité, empêchant les associations entre activités. |
| Liaison activité-média | `activity_media_links` | Lie une activité à un couple cohérent asset/playable. Suppression de l’activité en cascade ; suppression du playable restreinte. |
| Catalogue média | `media_assets`, `media_sources`, `media_playables`, `media_playable_metadata` | Asset logique, origines, représentations jouables et métadonnées techniques. Les couples asset/playable/source sont protégés par des clés composites et des suppressions restrictives. |
| Traitements et stockage | `media_treatments`, `storage_operations` | Dérivations, sorties, publication éventuelle et outbox de suppression physique. Quatre traitements existent ; l’outbox est vide et n’est pas utilisée par le runtime courant. |

Le modèle ne possède pas de table séparée de « version publiée » d’activité : `activities` contient un état mutable, un statut et une révision. Côté média, les représentations publiées sont des playables de rôle `published-remote`, éventuellement reliés par `media_treatments.published_playable_id`. La dérivation est portée par `media_treatments` et la filiation des assets.

### Cardinalités observées

| Groupe | Cardinalités |
|---|---|
| Activités | 4 activités, 4 identités, 36 champs pédagogiques, 0 qualification, 4 transcriptions, 4 liens média |
| Auteur | 12 langues d’activité, 12 locuteurs, 16 segments, 19 associations segment-locuteur, 27 associations segment-langue, 33 intervalles |
| Enrichissements | 11 couches, 22 visibilités, 29 phénomènes, 14 annotations, 10 overlays, 17 associations overlay-couche |
| Classement | 1 dossier d’activité, 1 dossier média, 3 tags, 3 associations asset-tag |
| Média | 9 assets, 15 sources, 15 playables, 15 métadonnées de playable, 4 traitements |
| Opérations | 0 opération de stockage, 0 import enregistré, 0 migration enregistrée |

Les quatre activités sont au statut `draft`, les neuf assets sont actifs et les quatre traitements sont `completed` avec progression 100, sortie cohérente et date de fin.

## Schéma déclaré et schéma installé

Le schéma installé correspond structurellement à la composition suivante :

- base `database/drafts/003_proto05_schema_hardening.sql` ;
- alignement `database/migrations/002_proto05_mariadb_schema_alignment.sql` ;
- table documentaire de la migration 004 ;
- colonne `media_assets.editorial_metadata_json` de la migration 006.

Les tables, colonnes, clés, contraintes et index attendus par cette composition ont été retrouvés. Les écarts sont ailleurs :

| Sujet | Contrat déclaré/versionné | Instance installée | Conclusion |
|---|---|---|---|
| Tables et colonnes | 31 tables de base, puis 004 ajoute la 32e et 006 une colonne | 32 tables, 275 colonnes | Conforme structurellement |
| Contraintes | FKs, `CHECK`, uniques et index de 003 + 002/004/006 | 48 FKs, 70 `CHECK`, 89 index | Conforme structurellement |
| Procédures | 003 déclare 43 procédures ; 002 en remplace plusieurs | 0 routine | Dérive déclaratif/runtime |
| Registre de migration | `schema_migrations` doit témoigner des versions appliquées | table vide | Traçabilité absente |
| Déploiement | scripts unitaires et installateurs historiques | pas de runner ordonné ni de garde de version au démarrage | Reproductibilité incomplète |
| Idempotence | certains installateurs Node prévolent l’état | SQL 002, 004 et 006 stricts ; réexécution brute non idempotente | Exécution manuelle à encadrer |

Le runtime MariaDB-only n’appelle pas les procédures stockées et le compte applicatif n’a pas `EXECUTE`. Leur absence n’est donc pas une panne actuelle. Elle signifie toutefois que le fichier présenté comme schéma canonique ne reconstruit pas fidèlement l’architecture effectivement exploitée sans décision explicite : installer les procédures et les utiliser, ou retirer formellement ce contrat historique.

## Contrôles d’intégrité des données

### Résultats relationnels

- 48/48 clés étrangères : aucun orphelin ;
- aucune référence transversale entre activités dans les clés composites auteur ;
- aucun cycle dans la filiation des assets, l’arborescence média ou la filiation pédagogique ;
- aucun doublon de `sort_order` dans les collections contrôlées d’une même activité ou d’un même dossier ;
- aucun lien d’activité vers un asset supprimé ou un playable retiré ;
- aucun `default_playable_id` ne viole les clés composites ;
- aucun traitement ne référence une source ou une sortie absente ;
- aucun traitement terminé ne viole le contrat progression/sortie/date de fin ;
- aucun JSON stocké n’est syntaxiquement invalide.

### Résultats métier

- aucune activité active ne manque d’identité pédagogique, transcription ou média principal ;
- aucun statut d’activité n’est contradictoire avec `deleted_at` ;
- aucun asset n’a un couple `lifecycle`/`deleted_at` contradictoire ;
- aucun playable n’a un couple `availability`/`removed_at` contradictoire ;
- aucune incohérence source/playable de rôle ou de filiation n’est détectée par le validateur média ;
- les 4 activités sont projetées par l’adaptateur MariaDB ;
- le modèle relationnel déterministe couvre les 31 tables métier sans bloqueur ;
- la bibliothèque projetée est valide, lisible et éligible à l’écriture.

Certaines garanties restent uniquement applicatives : forme sémantique des JSON, libellés non vides, cohérence complète des configurations de couches, correspondance fine avec le référentiel des langues, unicité des ordres, compatibilité des rôles média, disponibilité physique et règles de publication. MariaDB contrôle la syntaxe JSON, mais pas ces contrats de structure.

### Fichiers média locaux

Onze playables déclarent un stockage local :

- 4 sont disponibles et leur fichier, taille et SHA-256 correspondent ;
- 4 sont déclarés `missing-local` et leur fichier est effectivement absent ;
- 3 sont déclarés `missing-local` alors que leur fichier est présent et que taille et SHA-256 correspondent :
  - `video-hls-temporal-derivation-1784996744983-f056bd47` ;
  - `video-hls-temporal-derivation-1784996884534-a240cc7c` ;
  - `video-media-proto05-remote-ref-03738b8065e1866b8e956819-download-47a3e7cf005c9fdc`.

Il s’agit d’une dérive de métadonnée de disponibilité, sans perte physique détectée. Les quatre fichiers réellement absents correspondent aux anciennes données de développement signalées par David ; aucune recherche de responsabilité n’a été menée.

## Suppressions et intégrité relationnelle

| Objet supprimé | Précontrôle applicatif | Garantie SQL | Comportement et limite |
|---|---|---|---|
| Activité | Vérifie la filiation et retire aussi son classement du snapshot | Enfants auteur et liens média en cascade ; filiation restrictive | Transaction SQL unique. Une activité parente ne peut pas être retirée tant qu’une descendante la référence. |
| Intervalle, segment, annotation, phénomène, overlay, couche, locuteur | Mutation du snapshot auteur et validation métier | Propriété de l’activité en cascade ; références internes principalement restrictives | Échec fermé si une association restante contredit le snapshot. Le runtime supprime explicitement les relations disparues en ordre inverse. |
| Dossier d’activité | Détache les activités puis retire le dossier | FK activité `SET NULL` | Détachement et suppression dans une même transaction. |
| Dossier média | Détache les assets puis retire le dossier | FK asset `SET NULL`, hiérarchie enfant restrictive | Échec fermé si un dossier enfant demeure. |
| Tag média | Met à jour le catalogue et les `tagIds` | Jonction en cascade | Une transaction de snapshot. |
| Asset média | Calcule activités, descendants, traitements, références partagées et fichiers | Sources, playables, liens, filiation et traitements restrictifs ; tags en cascade | Le runtime effectue une suppression physique SQL, pas la suppression logique prévue par 003. Le précontrôle des traitements comporte un défaut décrit ci-dessous. |
| Source/playable | Parcours spécialisés de copie, dérivation ou suppression d’asset | Références activité, asset par défaut et traitements restrictives | Pas de suppression libre silencieuse. |
| Dérivation/traitement | Bloque traitement actif et playable publié | Relations source/sortie/publication restrictives | Traitement, sortie et fichier sont coordonnés par compensation, sans outbox durable. |
| Version publiée média | Bloque la suppression d’une dérivation possédant `publishedPlayableId` | FK composite restrictive | Pas de table de version publiée autonome. |

Défaut ciblé : `libraryAssetDeletionPlan()` recherche les traitements avec les anciens champs `assetId`, `playableId` et `sourceId`. Le contrat canonique emploie `sourceAssetId`, `sourcePlayableId`, `outputAssetId`, `outputPlayableId` et `publishedPlayableId`. Le préflight peut donc omettre un traitement réel. Les validateurs et FKs doivent ensuite faire échouer la suppression, ce qui protège la donnée, mais l’utilisateur obtient un refus tardif et moins explicite.

## Transactions et mutations

| Parcours | Frontière transactionnelle observée | Atomicité SQL | Risque résiduel |
|---|---|---|---|
| Création, duplication, édition et suppression d’activité | Snapshot métier → file d’écriture → verrou nommé global → transaction `SERIALIZABLE` → verrouillage des tables gérées → diff ciblé → relecture → commit | Oui pour les lignes SQL concernées | Snapshot chargé avant la file ; aucun contrôle de révision au `WHERE` |
| Édition auteur guidée | Même writer de snapshot avec portée calculée par IDs modifiés | Oui | Écrasement silencieux possible entre deux éditions concurrentes du même objet |
| Classement dossiers/tags | Même writer et même transaction | Oui | Même absence de concurrence optimiste |
| Import local | Fichier temporaire, hash, déplacement final, puis transaction SQL | Oui pour SQL | Arrêt brutal entre déplacement et commit : fichier orphelin possible |
| Référence distante | Ajout source/playable/traitement éventuel dans un snapshot canonique | Oui | Token en mémoire et absence de clé d’opération durable |
| Copie de travail | Transaction ciblée, verrous sur asset/playable source, contrôle des cardinalités | Oui | Fichier finalisé avant SQL ; fenêtre de panne entre les deux autorités |
| Dérivation | Production/déplacement du fichier, puis transaction média complète | Oui | Même fenêtre de panne ; nettoyage seulement dans le `catch` du processus vivant |
| Publication distante | Ajout source + playable publié + lien du traitement dans une transaction canonique | Oui | Pas d’idempotency key persistée en cas d’issue de commit incertaine |
| Suppression physique | Copie de secours temporaire, suppression fichier, transaction SQL, restauration sur erreur capturée | Oui pour SQL | Un crash avant restauration peut désynchroniser fichier et base |

Les mutations SQL d’une opération utilisent bien une connexion et une transaction uniques. Les erreurs capturées provoquent un rollback et les tests historiques couvrent un échec forcé. Deux garanties manquent cependant :

1. `buildUpdate()` filtre uniquement par clé primaire. La colonne `activities.revision` et les digests ne participent jamais à un contrôle de version, et la projection de migration initialise `revision` à 1. Deux clients peuvent charger le même état, puis le dernier commit écrase le premier. Une mise à jour obsolète du même objet après suppression peut même le réinsérer.
2. Le verrou nommé sérialise l’exécution des writers, pas l’acquisition des snapshots. Il ne remplace donc pas un contrôle de concurrence optimiste.

## Frontière de lecture, requêtes et index

`proto05-mariadb-readonly.js` exécute 29 `SELECT *` séquentiels, un par table métier, puis reconstruit tout le snapshot. Aucun `START TRANSACTION READ ONLY WITH CONSISTENT SNAPSHOT` n’encadre la série. Un commit d’écriture peut survenir entre deux lectures : chaque requête est valide isolément, mais la projection peut réunir deux instants différents.

Ce comportement entraîne également :

- 29 requêtes et une lecture de l’ensemble des données métier pour chaque snapshot, y compris les routes ne demandant qu’une activité ;
- le même coût avant la plupart des mutations ;
- des tris complets sur plusieurs petites tables auteur, car l’ordre demandé `(activity_id, sort_order, id)` n’a pas toujours un index exact.

À la cardinalité actuelle, les `EXPLAIN` ne révèlent aucun problème de performance opérationnel : les tables contiennent au plus quelques dizaines de lignes. Ajouter mécaniquement des index masquerait la cause principale. La priorité est une frontière de lecture cohérente et ciblée par route/activité ; les index devront ensuite être choisis à partir de ses requêtes réelles. Les index temporels existants `(activity_id, start_ms, end_ms)` restent pertinents pour des lectures ciblées et ne sont simplement pas valorisés par le snapshot global.

Il ne s’agit pas d’un N+1 dépendant du nombre d’entités, mais d’un coût fixe de 29 lectures intégrales par requête applicative.

## Garanties SQL et garanties Node

| Garantie | MariaDB | Node/application |
|---|---|---|
| Existence et appartenance des références | FKs simples et composites | Validation redondante et projection |
| Isolation entre activités | Clés composites incluant `activity_id` | Construction du snapshot |
| Bornes temporelles | `CHECK end_ms > start_ms` | Messages UX et validation métier |
| Statuts/progression/JSON syntaxique | `CHECK` | Contrats de forme et messages métier |
| Unicité technique et normalisation principale | PK/uniques | Génération des IDs |
| Ordre unique dans une collection | Non garanti en SQL | Validateur seulement |
| Libellés non vides et référentiels exacts | Partiel | Validateur seulement |
| Forme sémantique des JSON | `JSON_VALID` seulement | Mappers et validateurs |
| Rôles et éligibilité média | Partiel | Validateur média |
| Disponibilité/hash du fichier | Non | Inspection applicative |
| Cohérence d’un snapshot multi-table | Non utilisée par le reader actuel | Non garantie |
| Concurrence optimiste | Colonne `revision` disponible, non utilisée | Non implémentée |
| Atomicité fichier + SQL | Impossible dans une transaction SQL seule | Compensation en mémoire, pas d’outbox active |

## Exploitation, droits, diagnostic et reprise

### Compte applicatif

La vérification a obtenu le compte attendu sur la base attendue. Les privilèges validés sont :

- global : `USAGE` uniquement ;
- base du prototype : `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `SHOW VIEW` ;
- aucun privilège global supplémentaire, DDL, `EXECUTE`, `GRANT OPTION` ou accès à une autre base.

Le compte est adapté au runtime applicatif direct observé. Il ne pourrait pas installer ou réparer le schéma, ce qui respecte la séparation d’autorité.

### Santé et diagnostic

Le serveur reste fail-closed et ne réintroduit aucun backend JSON. Les erreurs MariaDB sont classées en connexion, authentification/grants, schéma/migrations, configuration ou erreur interne ; le navigateur reçoit un message non sensible et les logs filtrent les détails.

La vérification de disponibilité ne contrôle toutefois que l’identité, les grants et un `COUNT(*)` sur `activities`. Une table ou colonne requise ailleurs peut manquer tout en laissant la santé initiale « disponible » ; la première lecture complète échoue ensuite en 503. L’absence d’entrées dans `schema_migrations` empêche une garde fiable par version.

### Sauvegarde et restauration

Les scripts historiques de migration imposaient un dump externe vérifié et possèdent des modes de contrôle/rollback. Aucun runbook opérationnel courant ne définit cependant :

- la fréquence et la rétention des sauvegardes ;
- la responsabilité de leur surveillance ;
- une restauration périodiquement testée ;
- la reprise des opérations fichier/SQL interrompues ;
- la version de schéma requise avant démarrage.

Aucune restauration n’a été exécutée pendant cet audit, car elle aurait violé son caractère strictement non mutatif. La restaurabilité actuelle n’est donc pas prouvée.

## Constats priorisés

### Important — I1 — Snapshot de lecture non cohérent

**Preuve :** `readSnapshot()` boucle sur 29 `SELECT` sans transaction explicite.

**Impact :** une projection peut mélanger des lignes d’avant et d’après un commit et échouer transitoirement ou servir un état impossible.

**État actuel :** aucune incohérence présente dans les données au moment de l’audit.

### Important — I2 — Écritures concurrentes sans contrôle de version

**Preuve :** le snapshot est chargé avant la file ; `buildUpdate()` filtre seulement sur la PK ; aucune clause ne compare `revision`, digest ou timestamp.

**Impact :** perte de mise à jour du même objet, et réinsertion possible par un client obsolète après suppression.

**Protection existante :** verrou nommé, `SERIALIZABLE`, FKs et relecture protègent l’atomicité d’un writer, pas la fraîcheur de son intention.

### Important — I3 — Traçabilité et contrat de schéma non fermés

**Preuve :** `schema_migrations` contient 0 ligne ; l’instance contient 0 routine alors que 003 en déclare 43 ; aucun runner/garde de version ne ferme l’ordre 003+002+004+006.

**Impact :** dérive non détectée, reconstruction ambiguë et diagnostic de démarrage incomplet.

**État runtime :** fonctionnel parce que l’application utilise du SQL direct et ne demande pas `EXECUTE`.

### Important — I4 — Atomicité fichier/SQL seulement compensatoire

**Preuve :** `storage_operations` est vide et absent des tables gérées par le writer ; les fichiers sont déplacés/supprimés avant le commit puis restaurés ou nettoyés seulement dans les erreurs capturées.

**Impact :** un arrêt brutal peut laisser un fichier orphelin ou manquant malgré une transaction SQL correcte.

**Écart de contrat :** 003 décrit des suppressions logiques et une suppression physique en deux phases ; le runtime supprime physiquement les lignes du catalogue.

### Modéré — M1 — Disponibilité de trois playables locaux obsolète

**Preuve :** état SQL `missing-local`, mais fichier présent et taille/SHA-256 conformes pour les trois IDs listés plus haut.

**Impact :** une ressource valide peut être déclarée indisponible.

### Modéré — M2 — Préflight de suppression média incomplet

**Preuve :** `libraryAssetDeletionPlan()` utilise trois anciens noms de champs de traitement.

**Impact :** dépendance omise du dialogue de suppression ; l’échec reste fermé ensuite par validation/FK, mais tardif et moins explicite.

### Modéré — M3 — Lecture globale coûteuse et index non alignés

**Preuve :** 29 tables relues intégralement par snapshot ; plusieurs tris complets observés par `EXPLAIN`.

**Impact :** croissance du coût avec le catalogue et contention accrue, sans problème sensible à la taille actuelle.

### Modéré — M4 — Santé et reprise opérationnelle partielles

**Preuve :** probe limité à `activities`, registre de migration vide, documentation partiellement héritée de la période JSON, pas de preuve récente de restauration.

**Impact :** indisponibilité ou dérive diagnostiquée tardivement ; reprise dépendante d’un savoir historique.

### Faible — F1 — Invariants métier exclusivement applicatifs

**Preuve :** unicité des ordres, forme profonde des JSON et plusieurs règles de libellé/rôle ne sont pas contraintes en SQL.

**Impact :** une écriture hors frontière Node pourrait créer des données que la projection refuserait. Le compte applicatif courant est contrôlé, mais le contrat doit expliciter cette dépendance.

## Recommandations minimales

1. Encadrer les 29 lectures actuelles par une transaction read-only à snapshot cohérent, puis introduire des lectures ciblées par route sans changer la projection métier.
2. Ajouter une concurrence optimiste fondée sur `revision` ou un digest attendu, incrémenter la révision et répondre 409 en cas de conflit.
3. Définir un manifeste de migration ordonné, checksummé et renseigné ; faire vérifier au démarrage toutes les tables/colonnes requises et la version attendue.
4. Arbitrer explicitement le destin des 43 procédures : contrat actif testé et doté de grants adaptés, ou retrait documenté du schéma canonique. Ne pas maintenir deux architectures déclarées.
5. Réactiver un protocole durable pour les opérations fichier/SQL : outbox, identifiant d’opération idempotent, reprise au démarrage et réconciliation.
6. Corriger le mapping des dépendances de traitements dans le préflight de suppression.
7. Réconcilier de façon ciblée les trois disponibilités locales, après témoin et recette humaine, sans toucher aux quatre absences historiques légitimes.
8. Formaliser sauvegarde, rétention, test de restauration et procédure de reprise ; ne pas considérer l’existence d’anciens scripts comme une preuve de restaurabilité.

## Découpage proposé en missions correctives indépendantes

| Mission proposée | Périmètre isolé | Preuve de sortie attendue |
|---|---|---|
| A — Snapshot de lecture cohérent | Transaction read-only cohérente, test d’un commit concurrent, conservation de la projection | Aucun snapshot déchiré ; tests de lecture et suites existantes verts |
| B — Concurrence optimiste | Révision/digest attendu, 409, non-résurrection après suppression | Deux éditions concurrentes et scénario delete/update déterministes |
| C — Manifeste et garde de schéma | Registre checksummé, baseline installée, probe exhaustif, décision sur les routines | Instance conforme détectée ; dérive simulée classée avant trafic métier |
| D — Cohérence fichiers/SQL | Outbox/idempotence/reprise et réconciliation | Tests de panne à chaque frontière et aucune divergence résiduelle |
| E — Suppression média | Champs canoniques de traitement et matrice de dépendances | Préflight exact avant toute mutation, FK toujours en défense |
| F — Disponibilité locale ciblée | Trois lignes démontrées seulement | SQL/API/fichier cohérents, quatre absences historiques inchangées |
| G — Frontière de requêtes et index | Lectures ciblées puis index guidés par `EXPLAIN` | Budget de requêtes documenté et absence de régression fonctionnelle |
| H — Runbook sauvegarde/reprise | Procédure, responsabilités et exercice isolé de restauration | Restauration testée hors données réelles et preuve datée |

Ces missions ne doivent pas être fusionnées avec une migration globale ni commencer par muter l’instance réelle. Les missions C, D, F et H nécessitent un plan de sauvegarde/retour arrière et une autorisation humaine avant toute écriture.

## Vérifications et non-altération

Contrôles réalisés :

- état Git initial propre et Mission 148 commitée ;
- inventaire `information_schema` des tables, colonnes, contraintes, index et routines ;
- scan générique des 48 clés étrangères ;
- contrôles spécifiques de cycles, tris, états, liens, traitements et JSON ;
- projection MariaDB et validateurs métier/média en mémoire ;
- inspection physique et SHA-256 des onze références locales ;
- `EXPLAIN` des requêtes de la frontière de lecture ;
- validation non sensible de l’identité et des grants ;
- témoin déterministe des 32 tables avant et après l’audit ;
- `git diff --check`.

Témoin initial déterministe de la base : `bb92942194dba0bc166574a946761f35cb59f36a78a090d7344e278385a762d3`.

Témoin final : identique, avec les mêmes 32 tables et 348 lignes.

Méthode : nom de table trié, toutes colonnes dans l’ordre ordinal, toutes lignes triées sur toutes les colonnes, sérialisation JSON, SHA-256.

Éléments volontairement non vérifiés :

- aucune restauration réelle de sauvegarde ;
- aucune concurrence dynamique, car elle aurait nécessité des écritures ;
- aucune recette navigateur ou humaine ;
- aucune simulation de crash de processus ;
- aucune mutation de disponibilité ou correction applicative.

## Fichiers concernés et suite

Fichier créé :

- `reports/149_proto05_mariadb_integrity_post_cutover_audit.md`

Aucun autre fichier n’a été modifié. La version reste `0.1.48`. La validation humaine de David reste distincte de cet audit statique et SQL read-only.

Message de commit proposé pour le seul rapport, après validation humaine :

`docs(proto05): audit post-cutover MariaDB integrity`
