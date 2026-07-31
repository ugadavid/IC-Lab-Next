# Mission 154 — Registre de migrations MariaDB et baseline de Proto05

Date : 31 juillet 2026  
Composant : `prototypes/05-augmented-ic-video-01`  
Version applicative avant/après : `0.1.48` — inchangée  
Révision de départ : `fd52ed2 fix(proto05): reject stale activity and media writes`  
État de départ : dépôt propre, Missions 149 à 153 commitées  
Autorité de données : MariaDB exclusivement

> **Rectification Mission 154B — rapport non validé.** L’inspection initiale a
> utilisé le compte applicatif, qui ne possède ni `EXECUTE` ni
> `SHOW CREATE ROUTINE`. MariaDB lui a masqué les routines. Une inspection
> administrative ultérieure, par `SHOW PROCEDURE STATUS` et
> `information_schema.ROUTINES`, recense 43 procédures réellement installées.
> Toutes les affirmations de la version initiale de ce rapport décrivant zéro
> procédure ou un canon « sans routines » sont corrigées ci-dessous. La ligne
> `001` reste présente mais ne constitue pas encore un contrat canonique
> complet. Voir le rapport 154B.

## Résultat

La Mission 154 a installé une ligne de baseline `001` sans rejouer de DDL et
sans modifier de donnée métier, mais son contrat ne photographie que la partie
tabulaire du schéma. La base réelle contient aussi 43 procédures que le compte
d’inspection initial ne pouvait pas voir. Le manifeste, le fingerprint, la
reconstruction vide et la vérification de démarrage issus de M154 sont donc
incomplets et ne doivent pas être considérés comme validés.

Le témoin pris immédiatement avant et après cette inscription confirme cette
non-altération. Une exécution complète ultérieure des tests historiques a
toutefois rafraîchi les seuls horodatages techniques de
`data_projection_metadata`. Ce défaut d’isolation des tests a été corrigé et
les nouvelles exécutions sont stables ; la valeur exacte antérieure à cette
première exécution ne peut pas être restaurée sûrement depuis une sauvegarde qui
n’en conservait volontairement que le hash. Le détail et la limite résiduelle
sont documentés plus bas.

Le chemin d’installation neuve reconstruit correctement les tables et le
registre, mais omet les 43 procédures : il ne reproduit donc pas la base réelle.
Les contrôles de registre, tables, contraintes et index restent utiles ; leur
prétention à couvrir le schéma complet est retirée dans l’attente de la
correction 154B.

Résultats techniques conservés mais **non suffisants pour valider M154** :

- baseline installée : `001` ;
- checksum de migration :
  `2c97057604cd5ffdc8fda582bafaa88b1990e36a090346c683eee16d066be191` ;
- fingerprint partiel, limité à ce que voyait le compte applicatif :
  `1ffb3af8345a5144cbd66a606a8ed74b6c5d326db614063c2d4503679403664d` ;
- tests dédiés au registre : 10/10 ;
- suite Proto05 : 125/125, contre 115/115 avant mission ;
- version : `0.1.48`, inchangée ;
- aucun commit ni push.

## Précautions et propriété des données

Les instructions du workspace, l’architecture, la provenance, les documents
Proto05 et les rapports pertinents ont été lus avant modification. Le fichier
local de secrets n’a pas été ouvert. Les commandes Node l’ont chargé directement
et aucun mot de passe, DSN ou secret n’a été copié dans le code, les tests ou ce
rapport.

Le compte applicatif observé possède seulement `SELECT`, `INSERT`, `UPDATE`,
`DELETE` et `SHOW VIEW` sur la base Proto05, avec `USAGE` global. Il ne possède
aucun droit DDL, `EXECUTE`, administration ou délégation. L’accès
administrateur utilisé par les tests est resté en mémoire et n’a visé que des
bases nommées `proto05_m154_*`, supprimées par `finally`.

La baseline elle-même n’a effectué qu’une insertion dans `schema_migrations`.
Aucune table métier, donnée JSON, vidéo ou autre fichier média n’a été
modifié. Les fixtures de validation ont créé puis retiré leurs données
jetables ; l’incident distinct sur les horodatages documentaires techniques
est consigné explicitement dans la section de validation.

## Inventaire du schéma installé avant baseline

### Instance et valeurs globales

- serveur : MariaDB `11.8.6-MariaDB-ubu2404` ;
- base sélectionnée : `ic_augmented_video` ;
- charset/collation par défaut : `utf8mb4` / `utf8mb4_unicode_ci` ;
- moteur de toutes les tables : InnoDB ;
- tables de base : 32 ;
- colonnes : 275 ;
- index : 89, représentés par 170 parties d’index ;
- clés étrangères : 48 ;
- contraintes `CHECK` : 70 ;
- vues : 0 ;
- procédures installées : 43 ; fonctions installées : 0 ;
- triggers installés : 0 ;
- événements installés : 0.

### Tables

Les 32 tables observées et inscrites dans le manifeste sont :

1. `activities`
2. `activity_annotations`
3. `activity_folders`
4. `activity_languages`
5. `activity_language_intervals`
6. `activity_layers`
7. `activity_layer_visibility`
8. `activity_media_links`
9. `activity_overlays`
10. `activity_overlay_layers`
11. `activity_pedagogical_identities`
12. `activity_pedagogical_qualifications`
13. `activity_pedagogical_text_fields`
14. `activity_phenomena`
15. `activity_segments`
16. `activity_segment_languages`
17. `activity_segment_speakers`
18. `activity_speakers`
19. `activity_transcriptions`
20. `data_projection_metadata`
21. `import_runs`
22. `languages`
23. `media_assets`
24. `media_asset_tags`
25. `media_folders`
26. `media_playables`
27. `media_playable_metadata`
28. `media_sources`
29. `media_tags`
30. `media_treatments`
31. `schema_migrations`
32. `storage_operations`

L’inventaire exhaustif des 275 colonnes — ordre, type, nullabilité, valeur par
défaut, charset, collation, extra, génération et commentaire — ainsi que toutes
les parties d’index, contraintes, colonnes de clés, règles de clés étrangères et
clauses `CHECK` se trouve dans :

`prototypes/05-augmented-ic-video-01/database/schema-migrations/001_proto05_canonical_schema.manifest.json`

Ce fichier est un témoin versionné, lisible et diffable ; son SHA-256 physique
est `7c1bdd43ef0a508b07355be561c9eb01d1b77cc24e838c82b7d86530d4ca2565`.
Il évite de dupliquer dans ce rapport 275 définitions et 170 parties d’index.

### Registre avant mission

La structure existante était suffisante et n’a pas été altérée :

| Colonne | Contrat |
|---|---|
| `version` | `VARCHAR(64)`, clé primaire, version ordonnée stable |
| `description` | `VARCHAR(255) NOT NULL`, nom lisible stable |
| `checksum_sha256` | `CHAR(64) NOT NULL`, unique |
| `applied_at` | `DATETIME(3) NOT NULL`, défaut `CURRENT_TIMESTAMP(3)` |
| `applied_by` | `VARCHAR(191) NULL`, contient ici la version du runner |

Le registre contenait 0 ligne. Aucun autre registre de migrations concurrent
n’a été trouvé. `import_runs` et `data_projection_metadata` sont des témoins
d’import/projection de données, pas des versions de schéma.

## Sources du dépôt et histoire démontrable

### Brouillons et schémas historiques

- `database/drafts/001_proto05_schema_draft.sql` : première proposition
  relationnelle, historique non retenu comme vérité installée ;
- `database/drafts/002_proto05_schema_revision.sql` : révision intermédiaire ;
- `database/drafts/003_proto05_schema_hardening.sql` : définition installable la
  plus complète, avec 31 tables puis les 43 procédures réellement installées ;
- `database/migrations/002_proto05_mariadb_schema_alignment.sql` : cinq
  ajustements structurels ultérieurs, puis redéfinition de huit procédures ;
- `database/migrations/004_proto05_document_metadata_schema.sql` : ajout de
  `data_projection_metadata` ;
- `database/migrations/006_proto05_video_plus_metadata_schema.sql` : ajout de
  `media_assets.editorial_metadata_json` et de son `CHECK`.

### Scripts de données, audit et validation

- `001_proto05_json_to_mariadb_dry_run.mjs` décrit et contrôle la projection
  JSON historique ;
- `003_proto05_json_to_mariadb_apply.mjs`, `005_proto05_document_metadata_migration.mjs`
  et `007_proto05_targeted_json_mariadb_reconciliation.mjs` sont des outils de
  données historiques, pas des migrations de schéma rejouées au démarrage ;
- les SQL sous `database/tests/` créent aussi des procédures ou triggers de
  recette strictement temporaires, distincts des 43 procédures installées ;
- le runtime Node courant effectue les lectures et mutations par SQL direct. La
  recherche dans `server/` et `shared/` ne trouve aucun appel `CALL sp_*`.

L’ordre historique exact de toutes les applications manuelles ne peut pas être
prouvé. La mission ne fabrique donc pas une suite fictive. Elle introduit une
`baseline du schéma canonique observé`, puis ouvre une séquence fiable pour les
évolutions futures.

## Procédures installées et conservées

Les deux inventaires administratifs indépendants de M154B recensent les mêmes
43 procédures dans `ic_augmented_video`. Le fichier 003 les définit et le SQL
002 en redéfinit huit :

`sp_activity_folder_create`, `sp_activity_duplicate`, `sp_activity_delete`,
`sp_activity_set_primary_media`, `sp_activity_set_supplementary_media`,
`sp_activity_remove_supplementary_media`, `sp_activity_replace_authoring`,
`sp_activity_folder_rename`, `sp_activity_folder_delete`,
`sp_activity_assign_folder`, `sp_media_folder_create`,
`sp_media_folder_rename`, `sp_media_folder_delete`,
`sp_media_asset_assign_folder`, `sp_media_tag_create`, `sp_media_tag_rename`,
`sp_media_tag_delete`, `sp_media_asset_set_tags`, `sp_activity_create`,
`sp_activity_update_metadata`, `sp_activity_set_pedagogical_identity`,
`sp_activity_replace_pedagogical_details`, `sp_media_register_import`,
`sp_media_register_playable`, `sp_media_update_playable_availability`,
`sp_media_set_playable_metadata`, `sp_media_treatment_start`,
`sp_media_treatment_update`, `sp_media_treatment_complete`,
`sp_storage_file_removal_request`, `sp_storage_file_removal_complete`,
`sp_storage_file_removal_fail`, `sp_media_asset_delete`,
`sp_media_derivation_delete`, `sp_media_lineage_delete`,
`sp_activity_library_search`, `sp_media_library_search`, `sp_activity_get`,
`sp_media_get`, `sp_media_lineage_get`, `sp_media_treatments_search`,
`sp_student_activity_bundle`, `sp_author_activity_bundle`.

État démontré : elles sont installées, `SQL SECURITY DEFINER`, toutes déclarées
`NOT DETERMINISTIC` et `CONTAINS SQL`. Aucun appel n’existe dans le runtime Node
courant, qui utilise les adaptateurs relationnels directs introduits par les
Missions 140 et 141. Deux procédures en appellent une autre côté SQL et les
recettes SQL historiques en exercent plusieurs. L’absence d’appel runtime ne
permet ni de les déclarer historiques ni de les supprimer. Leur statut est
« présentes sans appel runtime démontré — conservées en attente de décision de
David ».

Leur inventaire exhaustif, leurs signatures, définitions exactes et hashes sont
fournis par le rapport 154B et sa sauvegarde locale ignorée. Aucune procédure,
vue, fonction, trigger, événement ou permission n’a été modifié pendant M154B.

## Baseline canonique

Le manifeste `database/schema-migrations/manifest.json` contient une migration
ordonnée :

| Champ | Valeur |
|---|---|
| version | `001` |
| type | `baseline` |
| description enregistrée | `Baseline du schéma canonique Proto05 sans routines historiques` — formulation désormais reconnue comme incorrecte |
| checksum | `2c97057604cd5ffdc8fda582bafaa88b1990e36a090346c683eee16d066be191` |

Son SQL canonique est composé sans dupliquer le schéma :

1. section DDL de 003 avant le premier `DELIMITER $$` ;
2. section DDL de 002 avant le premier `DELIMITER $$` ;
3. migration 004 complète ;
4. migration 006 complète.

Les directives `USE` et `SET NAMES` ne sont pas exécutées par le runner ; la
connexion fixe déjà la base autorisée et le charset. Toute directive
`DELIMITER` dans le contenu sélectionné est refusée. Les chemins doivent rester
dans le prototype. Le SHA-256 porte sur le contenu sélectionné normalisé avec
ses frontières de source : une modification ultérieure, même si elle ne change
pas encore la structure installée, invalide la migration enregistrée.

Cette composition a été appliquée sur une base entièrement vide et a produit
le manifeste tabulaire attendu, mais aucune procédure. Elle ne reconstruit donc
pas l’instance réelle. La définition des procédures existe déjà dans 003 puis
dans les huit remplacements de 002 ; une migration corrective additive doit les
intégrer sans réécrire silencieusement `001`.

## Fingerprint structurel

`server/schema-migrations.js` interroge `information_schema` avec des tris
explicites et sérialise un objet à clés triées avant SHA-256.

Entrent dans le fingerprint :

- charset et collation par défaut de la base ;
- tables, type, moteur, collation et commentaire ;
- colonnes, position, nom, type complet, nullabilité, défaut, `EXTRA`,
  expression générée, charset, collation et commentaire ;
- index, unicité, ordre des colonnes, préfixe, type, commentaire et état
  `IGNORED` ;
- clés primaires, uniques et autres contraintes de table ;
- colonnes de clés, références et positions ;
- clés étrangères, contrainte référencée, `MATCH`, `ON UPDATE` et `ON DELETE` ;
- clauses `CHECK` ;
- vues, routines, paramètres, triggers et événements **visibles par le compte
  d’inspection**. Cette réserve manquait dans la version initiale et rend le
  fingerprint M154 incomplet : les 43 procédures étaient invisibles au compte
  applicatif.

Sont exclus car non fonctionnels ou volontairement hors contrat :

- nom physique de la base ;
- valeur courante d’`AUTO_INCREMENT` ;
- cardinalités, tailles, statistiques et dates techniques de tables ;
- `DEFINER` et autres identités d’installation ;
- données et contenu de `schema_migrations` ;
- ordre non garanti des lignes d’`information_schema`, neutralisé par les
  `ORDER BY` ;
- formatage SQL hors checksum de migration.

Les métadonnées numériques sont converties explicitement en nombres. Cette
normalisation est nécessaire parce que `mysql2` peut restituer les ordinaux
comme chaînes lorsque `bigNumberStrings` est actif dans le pool runtime. Le
premier passage de la suite complète a révélé cette différence de représentation
sans différence SQL ; le correctif conserve toutes les valeurs et stabilise le
hash entre CLI et runtime.

Deux inspections successives via le même compte applicatif donnent le même hash,
mais cette stabilité ne prouve pas l’exhaustivité. Une inspection disposant des
droits de visibilité voit 43 routines. Le futur contrôle doit donc exiger une
visibilité démontrée, lire `SHOW CREATE PROCEDURE`, normaliser seulement le
`DEFINER` déployé et comparer signature, caractéristiques et corps fonctionnel.
Un résultat vide sans preuve de visibilité doit être une erreur explicite.

## Runner et point d’exécution

Le choix retenu sépare :

- commande d’administration explicite : plan, sauvegarde, baseline ou apply ;
- démarrage applicatif : vérification strictement non destructive.

Commandes opérateur :

```powershell
node --env-file=../.env.local scripts/schema-migrations.js plan
node --env-file=../.env.local scripts/schema-migrations.js verify
node --env-file=../.env.local scripts/schema-migrations.js backup-registry --output=<nouveau-chemin-ignoré>
```

`baseline` et `apply` exigent le hash exact du plan, une confirmation littérale
différente pour chaque action et, pour la baseline, une sauvegarde du registre
relue et comparée à l’état courant. Il n’existe pas de `--force`.

Le CLI Proto05 refuse une base configurée sous un autre nom. Le SQL provient
uniquement des fichiers versionnés du manifeste, jamais d’une entrée utilisateur.
Le registre doit être un préfixe exact des migrations connues. Sont refusés :
checksum absent/mal formé/modifié, doublon, trou ou ordre incohérent, migration
inconnue et version plus récente que le code.

Au démarrage, `proto05-mariadb-readonly.js` vérifie identité, grants, registre,
fingerprint et lecture représentative. Ce contrôle reste fail-closed pour les
objets visibles, mais il ne peut pas certifier les routines avec les grants
actuels. La correction nécessite une visibilité `SHOW CREATE ROUTINE` ou un
compte de vérification dédié ; aucun grant n’a été modifié sans arbitrage.

## Concurrence, transactions et DDL

Le runner acquiert le verrou de session
`<base>.proto05.schema-migrations` avec `GET_LOCK`, puis recalcule intégralement
le plan. Une modification entre inspection et verrou devient
`PROTO05_MIGRATION_PLAN_DRIFT`. Le verrou est libéré explicitement dans
`finally` et la fermeture de la connexion reste une seconde garantie.

Une inscription de registre est une transaction DML courte. En revanche,
MariaDB effectue des commits implicites autour de nombreux DDL ; une suite de
`CREATE TABLE`/`ALTER TABLE` ne peut donc pas être présentée comme globalement
rollbackable. Le runner exécute les instructions une à une, s’arrête à la
première erreur, n’inscrit pas la migration, n’exécute pas la suivante et
signale le nombre d’instructions possiblement déjà committées. La reprise exige
alors inspection et restauration humaines, jamais une continuation silencieuse.

Références MariaDB :

- [SQL statements causing an implicit commit](https://mariadb.com/docs/server/reference/sql-statements/transactions/sql-statements-that-cause-an-implicit-commit)
- [`GET_LOCK`](https://mariadb.com/docs/server/reference/sql-functions/secondary-functions/miscellaneous-functions/get_lock)

## Parcours d’une installation vide

Sur une base vide autorisée :

1. le plan constate l’absence de registre et de table ;
2. `apply` exige le plan hashé et la confirmation ;
3. le verrou est acquis ;
4. chaque instruction DDL de `001` est exécutée séquentiellement ;
5. le schéma obtenu est comparé au manifeste exact ;
6. la ligne `001` est inscrite seulement après égalité ;
7. une nouvelle inspection exige un registre complet et le même fingerprint ;
8. un second lancement retourne `changed: false`.

Cette procédure a réellement produit 32 tables, 275 colonnes, 89 index, 48 FKs
et 70 `CHECK`, mais zéro routine au lieu des 43 installées. Le test prouve le
défaut de reconstruction, pas une installation canonique complète.

## Baseline de la base réelle

### Plan avant écriture

- registre : présent, 0 ligne ;
- fingerprint observé par le compte insuffisamment privilégié : égal au
  manifeste partiel ;
- fingerprint réellement exhaustif : non établi avant l’écriture ;
- différences annoncées : 0, résultat invalidé par les 43 procédures masquées ;
- action : `baseline` ;
- plan hash :
  `af738f31eb92dd320ab29a6d8fd2b21a004a0faf68d0f3e4356c582169b6897d` ;
- mutation planifiée : une insertion dans `schema_migrations` ;
- DDL planifié : aucun.

Une sauvegarde ciblée exclusive a été créée dans le chemin ignoré
`prototypes/05-augmented-ic-video-01/database/backups/mission-154-schema-registry-before-baseline.json`.
Elle contient le `SHOW CREATE TABLE`, les 0 lignes initiales, le fingerprint de
schéma et seulement les cardinalités/hashes des 31 tables protégées, sans valeur
métier. SHA-256 du fichier :
`5dbf438dc5c3038e988def98b671b3b882d87c8946adf84e08987be64b800d3a`.

### Inscription effectuée

Sous verrou et transaction, une ligne a été ajoutée :

- version : `001` ;
- description enregistrée : baseline canonique sans routines historiques —
  description factuellement incomplète, conservée sans réécriture silencieuse ;
- checksum : checksum attendu ;
- `applied_by` : `proto05-schema-runner/1`.

### Preuves après écriture

- registre : exactement 1 ligne, version `001` ;
- fingerprint tabulaire partiel : inchangé ;
- fingerprint des données protégées avant/après :
  `c3b561c14be5a1a771035af3ac70faf581a2408dd7adbb18881a1246d082a76d` ;
- aucune table métier changée selon les cardinalités et hashes par table au
  terme de l’opération de baseline elle-même ;
- nouveau plan : `none` ;
- nouveau plan hash :
  `802968cad4d2415c0ed991306f9469b3d96c6a6564c43b0596b72f57897a17d9` ;
- seconde exécution de la même commande : `changed: false` ;
- plusieurs démarrages ultérieurs : registre/fingerprint partiel inchangés ;
  ils ne contrôlaient pas les procédures masquées.

Retour arrière ciblé disponible : après vérification du fichier de sauvegarde et
du témoin de données, supprimer exclusivement la ligne `001` portant le checksum
attendu restaurerait les 0 lignes sauvegardées. Cette action n’a pas été
exécutée. La baseline n’est plus tenue pour complète, mais toute suppression ou
réécriture de sa ligne resterait une décision humaine sous verrou. La stratégie
154B recommandée est additive afin de ne pas falsifier `001`.

## Tests ajoutés

`server/test/schema-migrations.test.js` couvre dix scénarios :

1. installation depuis une base vide ;
2. baseline d’un schéma peuplé équivalent et témoin de non-altération ;
3. second lancement idempotent ;
4. source de migration modifiée ou absente ;
5. registre mal formé, inconnu, plus récent, dupliqué ou désordonné ;
6. migration en retard : vérification de démarrage refusée puis apply explicite
   réparant la fixture ;
7. divergence de colonne ;
8. divergence d’index, de valeur par défaut et de clé étrangère ;
9. deux runners concurrents : un seul succès, une seule ligne ;
10. DDL invalide : arrêt, première instruction explicitement signalée comme
    possiblement committée, instruction suivante absente, registre non mensonger
    et verrou libéré ; plus un probe unitaire de la frontière readonly avant
    lecture métier.

Toutes les fixtures sont des bases aléatoires sous le préfixe strict
`proto05_m154_*`. La liste finale des bases ne contient plus aucune de ces
fixtures.

Ces tests n’inventorient ni ne reconstruisent les 43 procédures. Leur résultat
vert ne valide donc que le périmètre tabulaire et le registre partiel. Les tests
de routines exigés sont reportés à la reprise 154B après arbitrage des grants et
de la migration additive.

## Résultats de validation

### Statique

- syntaxe Node : tous les fichiers nouveaux/modifiés valides ;
- `git diff --check` : succès ;
- scan des sources : aucun secret ou fallback JSON introduit ;
- version `0.1.48` : inchangée.

### Automatisé et MariaDB

- tests du registre : 10/10 ;
- tests MariaDB runtime ciblés : 10/10 ;
- suite Proto05 complète : 125/125 ;
- aucun test existant supprimé, ignoré ou affaibli ;
- écart de 115 à 125 expliqué par les 10 nouveaux tests ;
- base vide, baseline, idempotence, migration modifiée/manquante, divergences,
  concurrence, échec DDL et registre inattendu : verts ;
- aucune base ou table temporaire, connexion, verrou ou serveur résiduel.

### Incident d’isolation des tests et correction

La preuve avant/après de la baseline a bien été prise immédiatement autour de
l’unique insertion du registre et reste valide : son fingerprint protégé est
identique des deux côtés
(`c3b561c14be5a1a771035af3ac70faf581a2408dd7adbb18881a1246d082a76d`).

Pendant la validation complète suivante, les anciens scénarios CRUD ont créé et
supprimé correctement leurs activités jetables, mais le writer a aussi mis à
jour `data_projection_metadata.source_updated_at_utc`. Les helpers ne
restauraient pas ce témoin global. La comparaison avec la sauvegarde initiale
a montré :

- 30 tables protégées sur 31 strictement inchangées ;
- seule `data_projection_metadata` différente ;
- cardinalité inchangée à 4 ;
- ancien hash de table :
  `cad29df25b7b2cff7e510202a1b3d4292b0cc7a666462e134b8ac7460483eaf5` ;
- hash observé après le premier passage :
  `6878b55559c23e9b888816f6a2e0b816b53f431933616df41bd9c2b5512a2cd9`.

La suite MariaDB principale et le helper des serveurs temporaires sauvegardent
désormais les quatre lignes documentaires avant leurs fixtures et les
restaurent transactionnellement après arrêt du serveur de test, y compris en
cas d’échec. Une nouvelle exécution ciblée (10/10), puis la suite complète
(125/125), ont conservé exactement le hash
`6878b55559c23e9b888816f6a2e0b816b53f431933616df41bd9c2b5512a2cd9`
avant et après.

La sauvegarde pré-baseline ne contient pas les valeurs de ces horodatages, mais
seulement leurs hashes, afin de ne pas dupliquer les données applicatives. Les
logs binaires ne sont pas disponibles. Une reconstitution depuis d’anciens
JSON serait une hypothèse et a donc été refusée. L’état technique courant est
conservé sans correction arbitraire ; David doit arbitrer s’il exige une
restauration historique exacte de ces dates documentaires. Cette limite ne
touche ni les lignes métier, ni le schéma, ni le registre de migration.

Le premier passage complet avait obtenu 114/124 : le pool runtime renvoyait les
positions numériques d’`information_schema` comme chaînes. Le fail-closed a
correctement refusé le démarrage. La normalisation typée a été ajoutée sans
affaiblir le fingerprint, puis les suites ciblées et complètes sont devenues
entièrement vertes.

### Runtime et contrôle visuel

Deux démarrages réels successifs ont donné `status: available`, autorité
`mariadb`, version `0.1.48`. Les surfaces suivantes ont été relues sans mutation
et ont toutes répondu 200 :

- `/teacher/videos` ;
- fiche détaillée d’un média et son API ;
- `/teacher` ;
- atelier auteur ;
- preview enseignant ;
- interface student.

Ces observations fonctionnelles restent vraies, mais le démarrage « available »
ne prouve pas l’intégrité des procédures : le compte runtime ne pouvait pas les
voir et ne les appelle pas.

Le contrôle Chromium live de la bibliothèque enseignant à 1280×720 a observé :

- titre `Bibliothèque d’activités — Proto05` ;
- contenu principal visible et quatre résultats MariaDB ;
- aucune page diagnostic ;
- largeur document 1265 pour viewport 1280, donc aucun débordement horizontal ;
- aucune erreur ni warning console ;
- aucune différence visuelle fonctionnelle constatée.

La suite existante a en outre conservé ses contrôles Chromium de navigation,
dialogues et sauvegarde collante, et ses vérifications HTTP des routes teacher,
vidéothèque, fiche média, auteur, preview et student. Les autres surfaces ont
été vérifiées fonctionnellement et par HTTP pendant cette mission, mais n’ont
pas chacune reçu une capture visuelle live distincte. Aucun fichier HTML/CSS
n’a été modifié.

## Nettoyage final et état Git

- aucune base `proto05_m154_*` ;
- aucun répertoire `.proto05-test-runtime-*` ;
- port 8791 libre ;
- serveurs lancés arrêtés ;
- aucun média temporaire ou fichier de fixture résiduel selon les nettoyages et
  assertions de la suite ;
- une nouvelle suite complète ne modifie plus le hash des métadonnées de
  projection ;
- sauvegarde réelle conservée dans un chemin ignoré, car elle constitue le
  retour arrière ciblé de la baseline ;
- aucun commit ni push.

## Fichiers créés

- `prototypes/05-augmented-ic-video-01/database/schema-migrations/manifest.json`
- `prototypes/05-augmented-ic-video-01/database/schema-migrations/001_proto05_canonical_schema.manifest.json`
- `prototypes/05-augmented-ic-video-01/server/schema-migrations.js`
- `prototypes/05-augmented-ic-video-01/server/scripts/schema-migrations.js`
- `prototypes/05-augmented-ic-video-01/server/test/schema-migrations.test.js`
- `reports/154_proto05_mariadb_migration_registry_and_baseline_report.md`

Fichier local ignoré créé :

- `prototypes/05-augmented-ic-video-01/database/backups/mission-154-schema-registry-before-baseline.json`

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js`
- `prototypes/05-augmented-ic-video-01/server/mariadb-diagnostics.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`

## Limites et validation humaine

- les 43 procédures installées doivent être conservées ; aucun nettoyage n’est
  autorisé ni proposé ;
- le choix entre maintien du writer direct et raccordement progressif aux
  procédures reste une décision architecturale de David ;
- le registre réel `001` et les grants doivent rester inchangés jusqu’à
  validation du plan additif 154B ;
- aucun exercice complet de restauration d’instance n’a été réalisé ; seule la
  restauration ciblée du registre est documentée et prouvée par fixture ;
- la sauvegarde ignorée doit être conservée tant que David souhaite garder ce
  retour arrière ;
- les valeurs précises des quatre horodatages documentaires antérieurs au
  premier passage complet ne sont pas récupérables depuis le témoin hash-only ;
  aucune valeur supposée n’a été réinjectée ;
- la recette de Codex ne vaut pas validation humaine de David.

## Recette humaine minimale proposée

1. Ne pas utiliser le résultat actuel de `schema:verify` comme preuve d’un
   schéma complet : il ne voit pas encore les routines.
2. Lire le rapport 154B et arbitrer la visibilité `SHOW CREATE ROUTINE`, la
   migration additive `002` et le statut runtime des procédures.
3. Ne lancer aucune commande `baseline`, `apply`, suppression ou réécriture du
   registre avant cet arbitrage.
4. Arbitrer séparément seulement si une restauration exacte des anciens horodatages de
   `data_projection_metadata` est jugée nécessaire ; ne pas les reconstruire à
   partir des JSON historiques sans nouvelle preuve.

## Proposition de message de commit

Ne pas committer M154 comme baseline vérifiée avant la reprise 154B. Pour le
seul état documentaire d’arrêt actuel :

`docs(proto05): correct stored procedure inventory and baseline plan`
