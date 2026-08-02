# Mission 186 — Audit strictement non mutateur du système média Proto05

Date : 2 août 2026  
Périmètre : dumps `mariadb_backup_20260801_1940.sql` et `mariadb_backup_20260802_1900.sql`, code, schéma, migrations, tests et interfaces de Proto05.  
Version observée : **0.1.62, inchangée**.  
Décision : **aucun nettoyage, aucune migration et aucun test mutateur ne doivent être lancés avant validation de David**.

## Conclusion prioritaire

La hausse de **7 à 51 assets** est entièrement expliquée : **20 HLS REPLI4C légitimes** et **24 assets de tests parasites** ont été ajoutés. Les tests M150 ont laissé 14 assets ; les tests M152 ont laissé 10 assets, 5 activités, 5 dossiers et 5 tags. Les timestamps, marqueurs et structures correspondent exactement à `server/test/mariadb-only-runtime.test.js`.

La contamination n'est pas hypothétique. Le helper nommé « temporary » charge `prototypes/05-augmented-ic-video-01/.env.local`, démarre le vrai `server.js` avec ce fichier et ouvre la base renvoyée par `mariadbConfigurationFromEnvironment(process.env)`. Il isole seulement le **port HTTP**, pas la base. Le nettoyage compensatoire en `finally` n'est pas une isolation : les timeouts et processus enfants survivants documentés en Mission 184 peuvent l'empêcher d'aboutir.

MariaDB `ic_augmented_video` est l'autorité métier unique actuelle. La « Library canonique » est la projection applicative reconstruite depuis les tables MariaDB, pas un second stockage. Les JSON historiques ont été retirés du runtime ; les manifestes/plans/receipts REPLI4C sont des artefacts d'import suivis, pas un catalogue concurrent.

Les anomalies HLS et aperçu ont la même cause contractuelle : l'import REPLI4C écrit volontairement `provider = "uga-video"`, tandis que l'interface n'autorise l'aperçu que pour `youtube`, `uga`, `direct` et `local`. Les 20 nouveaux HLS ont en plus une URL UGA absolue, alors que l'ancien UGA 37004 utilise le fournisseur `uga` et la passerelle locale `/api/hls/uga-37004/...`. Le fournisseur n'est donc pas une corruption du dump : c'est un désalignement introduit par le nouveau manifeste/import et non pris en charge par l'UI/transport historique.

## Témoins et méthode

- État Git initial et final avant rédaction : propre ; aucun secret consulté.
- SHA-256 dump 1er août : `FB27182170CD58DA9EAA4C4A9FBCD3B2AB2232FD17F88249CB76AFF276EB5A7C`.
- SHA-256 dump 2 août : `A94358A2121640E4298E3C2CD7DA43E3B7241D7BEF5CB5EE856064EC8D9FCB0F`.
- Comparaison statique déterministe des `CREATE TABLE` et `INSERT` de la section `ic_augmented_video` ; aucune connexion à MariaDB métier.
- Docker était inaccessible à l'environnement avant opération (`docker_engine`: accès refusé). Une restauration n'était pas indispensable : les dumps contiennent les données, contraintes et corps complets des routines nécessaires aux conclusions. Aucun conteneur, volume ou schéma temporaire n'a été créé.
- Aucune suite applicative n'a été lancée, car la suite historique contient précisément le test mutateur contaminant.

## Différence exacte entre les sauvegardes

| Ensemble | 01/08 19:40 | 02/08 19:00 | Delta | Qualification |
|---|---:|---:|---:|---|
| `media_assets` | 7 | 51 | +44 | +20 REPLI4C, +24 tests |
| `media_playables` | 10 | 55 | +45 | +20 REPLI4C, +24 tests, +1 dérivation réelle/indéterminée |
| `media_sources` | 10 | 55 | +45 | même ventilation |
| `media_playable_metadata` | 10 | 55 | +46/-1 | métadonnées nouvelles et remplacement d'une ligne historique ; à préserver jusqu'à plan de nettoyage validé |
| `activities` | 3 | 8 | +5 | tests M152 |
| `media_folders` | 1 | 6 | +5 | tests M152 |
| `media_tags` | 3 | 8 | +5 | tests M152 |
| `activity_media_links` | 3 | 8 | +5 | tests M152 |
| `media_treatments` | 1 | 2 | +1 | dérivation `hls-derivation-1785619500924-d6c052d4`, sans marqueur M150/M152 ; ne pas classer parasite sans décision humaine |
| `schema_migrations` | 6 | 6 | 0 | registre inchangé 001–006 |

### Données parasites à nettoyer après validation

- **M150 : 14 assets** locaux, soit sept paires `input`/`output`, titres préfixés `[TEST M150]`, créées le 01/08 à 18:35:45 puis le 02/08 entre 14:50:48 et 15:27:30.
- **M152 : 10 assets** locaux, soit cinq paires `source`/`child`, titres préfixés `[TEST M152]`.
- **M152 : 5 activités**, 5 dossiers, 5 tags et toutes leurs lignes dépendantes (liens média, identité pédagogique, champs pédagogiques, transcription, segments, langues, couches, phénomènes et annotations).
- Ces ensembles doivent être nettoyés par identifiants et relations, jamais par simple plage temporelle ni par suppression globale. Les fichiers locaux associés devront être inventoriés séparément avant toute action physique.

### 20 médias REPLI4C légitimes à conserver

Les IDs vidéo sont : `36970`, `36972`, `36975`, `36977`, `36978`, `36979`, `36980`, `36982`, `36983`, `36984`, `36985`, `36987`, `36988`, `36995`, `36996`, `36997`, `36998`, `37000`, `37001`, `37003`.

Ils ont été créés dans une transaction commune le 02/08 vers 16:31:30 avec les IDs `media-proto05-uga-*`, `source-proto05-uga-*`, `video-proto05-uga-*`. Le receipt M185 et le plan post-import expliquent que 24 entrées corpus ont été réconciliées : quatre existaient déjà et 20 seulement devaient être créées. Ces 20 lignes sont donc le delta légitime demandé.

## Anomalies : preuve, reproduction, cause, risque et correction minimale

### P0 — Tests mutateurs dirigés vers la base métier

**Preuve.** `server/test/helpers/temporary-proto05-server.js:14,29,35-39,231-234` charge `.env.local`, crée une connexion avec la configuration courante puis démarre `server.js` avec le même fichier. `mariadb-only-runtime.test.js` fabrique explicitement les marqueurs M150/M152 retrouvés à l'identique dans le dump. Le rapport 184 documente un timeout de 60 s et un serveur de fixture laissé actif.

**Reproduction sûre.** Inspection statique seulement : suivre `loadTestEnvironment()` → `testDatabaseConnection()` et `startTemporaryProto05Server()` ; rapprocher les littéraux `[TEST M150]`/`[TEST M152]` des lignes des dumps. Ne pas exécuter ce test sur la configuration actuelle.

**Cause exacte.** Confusion entre isolation du processus/port et isolation du stockage ; accès applicatif réel, DML réel et cleanup compensatoire. Aucun garde-fou ne refuse `DB_NAME=ic_augmented_video`, aucun nom de base temporaire aléatoire n'est imposé, aucun rollback englobant ne peut couvrir les requêtes du serveur enfant.

**Risque.** Contamination répétable, nettoyage incomplet en cas de timeout, possibilité de modifier une donnée existante pendant les scénarios de concurrence.

**Correction minimale.** Faire échouer la suite avant toute connexion si la base ne respecte pas un préfixe temporaire dédié ; créer un schéma aléatoire depuis une connexion d'administration explicitement de test, y installer le contrat, injecter ce nom au serveur enfant, puis détruire ce schéma dans un superviseur extérieur. Retirer tout chargement implicite de `.env.local` métier dans les tests mutateurs. Conserver un test readonly séparé pour la base de travail.

**Test requis.** (1) la suite refuse catégoriquement `ic_augmented_video`; (2) deux exécutions parallèles utilisent deux bases distinctes ; (3) kill/timeout forcé laisse la base métier et ses cardinalités/hashes inchangés ; (4) aucun processus enfant ni schéma temporaire ne survit.

### P0 — Suppression d'un asset incomplète / dépendances SQL

**Preuve.** Le schéma a des FK restrictives depuis `media_playables.asset_id`, `media_sources.asset_id`, les trois paires de `media_treatments`, `activity_media_links`, `media_audio_anonymization_plans` et `storage_operations`. Les tables de classement et métadonnées ont leurs propres relations. La routine doit donc supprimer dans un ordre précis et dans une transaction.

**Reproduction sûre.** Lire le préflight d'un asset sans dépendance apparente puis comparer son agrégat aux FK exportées. L'erreur `media_playables.asset_id → media_assets.id` apparaît si l'asset est supprimé avant ses playables ou si un playable oublié subsiste.

**Cause exacte.** Le contrat de suppression a évolué par ajouts successifs (copies de travail, sorties terminales, plans audio, stockage). Le préflight applicatif et la routine SQL ne partagent pas un inventaire unique de toutes les relations. Une dépendance ajoutée peut être oubliée dans l'un des deux.

**Dépendances complètes à traiter.** Activités (`activity_media_links`) ; enfants de lignée (`parent_asset_id`, `family_root_asset_id`) ; dossiers et tags ; plans/passages audio ; traitements source/output/published ; opérations de stockage ; métadonnées de playable ; `default_playable_id` ; playables ; sources ; fichier physique, qui est une phase distincte et réversible. Pour un root, toute la lignée doit être verrouillée ou la suppression refusée.

**Correction minimale.** Une seule routine transactionnelle canonique pour la suppression catalogue, avec verrouillage de l'agrégat, préflight SQL retournant des conflits structurés, ordre enfant→parent, relecture avant commit et aucune suppression physique dans la transaction SQL. L'outbox de retrait physique ne commence qu'après commit.

**Test requis.** Matrice FK automatisée : une fixture par relation bloquante/nettoyable ; rollback injecté à chaque étape ; zéro orphelin ; idempotence/refus clair ; concurrence ; fichier présent/absent/partagé ; root et dérivation.

### P0 — `familyRootAssetId` invalide pendant la suppression

**Preuve.** La migration 006 et les rapports 167/184 décrivent exactement le défaut : l'ancienne routine assignait temporairement un `family_root_asset_id` incohérent lors de la suppression d'un asset racine. Le schéma impose `family_root_asset_id → media_assets.id`, la paire `(family_root_asset_id,parent_asset_id)` et la forme de lignée. Le dump 02/08 possède bien 006 et la routine corrigée.

**Reproduction sûre.** Sur une base isolée future, créer root + playable, supprimer le root sans enfant ; avec la définition 005, observer la violation intermédiaire ; avec 006, vérifier l'ordre sans état invalide. Ne pas rejouer sur la base métier.

**Cause exacte.** La projection JSON expose `familyRootAssetId` pour un root comme son propre ID, alors que la colonne relationnelle canonique d'un root doit rester `NULL`; une logique de suppression a confondu représentation applicative et stockage relationnel.

**Risque.** Échec transactionnel, message générique, asset non supprimé ; si les erreurs sont mal gérées, nettoyage partiel hors SQL.

**Correction minimale.** Conserver 006 comme référence, supprimer toute conversion root `familyRootAssetId=self` vers la colonne SQL, et vérifier que toutes les routes appellent la routine 006 plutôt qu'une réécriture de document générique.

**Test requis.** Root seul, root avec enfant, dérivation, données de provenance contenant `familyRootAssetId=self`, et fingerprint de routine 006.

### P1 — Fournisseur des nouveaux HLS

**Preuve.** `corpus-import-manifest.js` exige littéralement `externalIdentity.provider === "uga-video"`; le plan le propage à `source.provider` et l'apply le transmet à `sp_media_register_import`. Les 20 lignes du dump ont `provider=uga-video`. Les HLS historiques directs ont `provider=direct`; l'ancien 37004 contrôlé a `provider=uga`.

**Reproduction sûre.** Générer le plan en mémoire depuis le manifeste et inspecter `createTechnicalMedia[*].source.provider`; aucune base nécessaire.

**Cause exacte.** Nouveau vocabulaire d'identité externe introduit comme valeur de transport/provider sans migration du contrat consommateur. Trois valeurs représentent désormais des variantes UGA : `direct`, `uga`, `uga-video`.

**Risque.** Branches UI et lecteur non atteintes, comportement réseau différent, futures règles dupliquées.

**Correction minimale.** Décider une valeur canonique unique. Le changement minimal compatible avec l'historique est de conserver `externalIdentity.provider=uga-video` dans la provenance, mais de mapper le provider jouable vers le provider transport déjà pris en charge (`direct` si URL absolue, ou `uga` si passerelle contrôlée). Ne pas réécrire les 20 lignes avant validation produit et plan de données.

**Test requis.** Plan/import puis projection : l'identité externe reste UGA, le playable obtient le provider canonique attendu, l'URL suit la politique réseau, et les anciens `direct`/`uga` restent inchangés.

### P1 — Absence d'aperçu des 20 HLS

**Preuve.** `teacher-videos.html` calcule `canPreview` par `['youtube','uga','direct','local'].includes(playable.provider)`. `uga-video` est absent ; le bouton et son conteneur ne sont donc pas rendus. La fiche détail conditionne aussi le bouton à une URL projetée et utilise le même contrat de lecteur.

**Reproduction sûre.** Injecter en mémoire un playable `{kind:'hls',provider:'uga-video',url:'https://…m3u8'}` dans le renderer : `canPreview=false`. Avec `provider:'direct'`, il devient vrai.

**Cause exacte.** Whitelist fermée par nom de fournisseur au lieu d'une capacité (`kind=hls` + URL lisible + transport autorisé).

**Risque.** 20 médias valides paraissent incomplets ; divergence entre liste, détail et lecteur.

**Correction minimale.** Centraliser `canPreviewPlayable()` dans le contrat partagé et décider par type/capacité, avec politique d'URL séparée du libellé fournisseur. Réutiliser la fonction sur liste et détail.

**Test requis.** DOM sur les cinq providers, HLS natif et hls.js, erreur réseau affichée, fermeture/réouverture, liste et détail.

### P1 — Erreurs utiles cantonnées à la console

**Preuve.** Plusieurs catches de `server.js` journalisent `code`, `reasonCode`, `differencePaths` ou `error.message`, puis renvoient seulement « Enregistrement de la Library impossible », « Création impossible » ou « Erreur serveur ». `proto05-mariadb-write.js` conserve pourtant `reasonCode` et `internalDetail`. Les interfaces ne peuvent afficher que le champ public `error` et d'éventuels `conflicts`.

**Reproduction sûre.** Suivre une erreur SQL de suppression depuis l'adaptateur : détail interne → wrapper → catch serveur → JSON générique → `setActionStatus`. Aucune exécution requise.

**Cause exacte.** Absence de traduction centralisée des erreurs métier/SQL en erreurs publiques structurées ; la journalisation et la réponse HTTP divergent.

**Risque.** Diagnostic impossible pour l'utilisateur, tentatives répétées, dépendances réelles invisibles. Exposer `internalDetail` brut serait toutefois un risque de fuite SQL.

**Correction minimale.** Mapper les errno/codes connus vers `{error, code, action, conflicts}` sans SQL ni chemin interne ; conserver `internalDetail` seulement dans le journal corrélé par un identifiant d'erreur. Afficher le message au niveau de la carte et dans la fiche avec `role=alert`.

**Test requis.** Chaque dépendance connue donne un code et un message français stable ; une erreur inconnue reste générique avec identifiant de corrélation ; aucun SQL/stack/chemin n'est exposé.

### P2 — Doute MariaDB / « Library canonique » / JSON

**Preuve.** `STATUS.md`, `docs/ARCHITECTURE.md`, les read/write boundaries et `mariadb-only-runtime.test.js` convergent : MariaDB est obligatoire et unique. `readCanonicalTablesWithProcedures()` lit les tables et `mapMariaDbTablesToSnapshot()` reconstruit le modèle applicatif. `data_projection_metadata` est un témoin de projection, pas un catalogue. Les fichiers `imports/corpora`, `plans` et `receipts` documentent/préparent l'import.

**Reproduction sûre.** Couper conceptuellement MariaDB dans les tests purs : les routes métier doivent répondre 503 et ne disposent d'aucun fallback JSON.

**Cause exacte du doute.** Terminologie « canonique » utilisée à la fois pour l'autorité SQL, la projection en mémoire et des artefacts historiques/import ; fichiers d'anciens outils encore présents dans l'historique et documentation tardive.

**Risque.** Nettoyage du mauvais support, tentation de réconcilier ou fusionner des catalogues qui ne sont pas co-autoritaires.

**Correction minimale.** Documenter trois niveaux : **autorité persistée MariaDB**, **projection canonique applicative éphémère**, **artefacts d'import non runtime**. Aucun changement de stockage nécessaire.

**Test requis.** Test d'architecture : MariaDB indisponible → 503 ; modification d'un plan/receipt sans import → aucun effet runtime ; lecture SQL → projection déterministe.

## Défauts structurels et défauts d'interface

**Structurels :** absence d'isolation de base des tests ; cleanup compensatoire ; vocabulaire provider non normalisé ; duplication entre préflight applicatif et dépendances SQL ; confusion ponctuelle projection/colonne pour `familyRootAssetId` ; traduction d'erreurs non centralisée.

**Interface :** whitelist d'aperçu incomplète ; absence de bouton pour `uga-video` ; messages génériques sans dépendances/action ; détails utiles uniquement en console ; incohérence potentielle liste/fiche.

## Ordre de réparation sûr et minimal

1. **Geler immédiatement les tests mutateurs MariaDB** sur la configuration de travail ; ajouter d'abord le refus de la base canonique et l'isolation par schéma temporaire.
2. **Faire valider par David la classification** : conserver les 20 IDs REPLI4C ci-dessus ; confirmer le statut de la dérivation du 01/08 21:25 ; approuver explicitement la liste M150/M152 avant tout nettoyage.
3. **Préparer séparément un plan de nettoyage en dry-run**, par IDs et graphe FK, avec sauvegarde, inventaire des fichiers, rollback et cardinalités attendues. Ne pas l'appliquer dans cette mission.
4. **Unifier le contrat de suppression** et sa matrice de dépendances ; conserver la routine 006 et tester sur MariaDB isolée.
5. **Trancher le provider canonique HLS**, puis mapper l'identité `uga-video` vers le transport décidé sans perdre la provenance.
6. **Centraliser la capacité d'aperçu** et l'activer pour les HLS REPLI4C selon la politique réseau retenue.
7. **Structurer les erreurs publiques**, avec messages actionnables et corrélation serveur.
8. Rejouer uniquement sur bases temporaires : tests de non-régression, recette Chromium liste/détail/aperçu/suppression ; puis laisser la validation fonctionnelle humaine à David.

## Contrôles réalisés, limites et validation

Contrôles réalisés : état Git, empreintes, parsing comparatif des deux dumps, cardinalités par table, classification des marqueurs et timestamps, inventaire des FK, lecture des routines/migrations 001–006, chemins d'import, projection, suppression, helper de tests et rendus UI.

Non vérifié : comportement réel du moteur MariaDB par restauration (Docker inaccessible et non indispensable), réseau HLS/aperçu en navigateur, présence des fichiers physiques associés aux fixtures, intention humaine de la dérivation non marquée, validation fonctionnelle par David.

Limite : les dumps sont des sauvegardes globales contenant aussi `ic_dico`, `ic_hub` et `mysql`; l'audit de données est volontairement limité à la section `ic_augmented_video`. Aucun fait concernant les autres bases n'est inféré.

Validation humaine : **non effectuée**. Arrêt demandé ici pour validation de David.

## Fichier créé et proposition de commit

- Créé : `reports/186_proto05_media_system_strict_non_mutating_audit.md`.
- Aucun autre fichier, code, donnée, schéma ou version modifié.
- Aucun commit ni push.
- Message de commit proposé pour ce rapport uniquement : `docs(proto05): audit media data contamination and deletion defects`

---

## Addendum du 2 août 2026 — levée des trois incertitudes restantes

Cet addendum remplace, lorsqu'elles divergent, les hypothèses prudentes de la première partie par des conclusions vérifiées sur une restauration isolée du dump du 2 août. Le dump a été restauré dans le conteneur éphémère `proto05-audit-186-20260802`, sans port publié, avec le réseau Docker `none`. Aucune connexion à la MariaDB métier n'a été effectuée. Toutes les suppressions d'essai ont été encadrées par `SET @proto05_runtime_transaction=1`, `START TRANSACTION`, puis `ROLLBACK` ; la présence de chaque asset après rollback a été vérifiée.

### A. Suppression d'un média : dépendance exacte oubliée

#### Conclusion démontrée

La dépendance SQL qui fait échouer la suppression de l'ancien HLS `media-proto05-remote-ref-03738b8065e1866b8e956819` n'est pas directement `media_playables.asset_id → media_assets.id`. La première contrainte réellement bloquante est :

```text
media_audio_anonymization_plans
  (source_asset_id, source_playable_id)
    → media_playables(asset_id, id)
  contrainte fk_audio_plan_source_playable
```

`sp_media_asset_delete` 006 supprime les traitements, les opérations de stockage, les liens d'activité, met `default_playable_id` à `NULL`, puis tente `DELETE FROM media_playables`. Elle ne supprime ni ne détache le plan audio. MariaDB refuse donc la suppression du playable ; l'asset reste ensuite nécessaire via `media_playables.asset_id`. Le message mentionnant cette dernière FK peut être un effet secondaire ou une restitution incomplète, mais la dépendance métier oubliée à l'origine est le **plan d'anonymisation audio**.

#### Preuve moteur

Sur la copie du dump :

- `media-proto05-remote-ref-03738b8065e1866b8e956819` possède un traitement terminé et un plan audio ;
- l'appel transactionnel à `sp_media_asset_delete` échoue avec MariaDB 1451 et nomme exactement `media_audio_anonymization_plans.fk_audio_plan_source_playable` ;
- cinq assets sans cette dépendance ont été supprimés avec succès par la même routine puis restaurés par rollback : ancien HLS 36973, REPLI4C 36970, deux fixtures M150 et la dérivation anonymisée historique.

#### Chemin applicatif courant

```text
DELETE /api/proto05/library/assets/:id
→ server.js:4270–4295
→ removeLibraryAsset()                        server.js:1613
→ audioPlanDependenciesForPlayables()         server.js:1415–1437
→ libraryAssetDeletionPlan()                  server.js:1451
→ deletionConflict()                          server.js:1521
→ filtrage projection + assertWritableCanonical()
→ persistCanonicalLibrary(operation=media-asset-delete)
→ proto05-mariadb-write.executeSnapshotProcedures()
→ CALL sp_media_asset_delete                  proto05-mariadb-write.js:716
```

Le code applicatif **actuel** connaît le plan audio et doit normalement arrêter la requête au préflight avec un conflit `audio-plans`, avant l'appel SQL. L'oubli subsiste néanmoins dans la routine 006 elle-même : elle n'a pas de garde explicite ni de message métier pour `media_audio_anonymization_plans`. Elle dépend donc de la perfection du préflight Node et retombe sinon sur une erreur FK brute.

#### Correction minimale recommandée

Ne pas supprimer automatiquement le plan audio. Ajouter au début de `sp_media_asset_delete` un `IF EXISTS` explicite sur `media_audio_anonymization_plans` par `source_asset_id` **ou** par les playables de l'asset, avec errno/message stable « asset utilisé par un plan audio ». Maintenir le blocage correspondant dans `libraryAssetDeletionPlan()`. La suppression du plan doit rester une action métier séparée et explicite.

Test requis sur MariaDB temporaire : plan audio présent → préflight Node `409 audio-plans`, routine directe → errno dédié, aucune ligne modifiée ; plan supprimé explicitement → suppression asset complète ; rollback injecté après chaque étape.

### B. `familyRootAssetId` : chemin réel et statut actuel

#### Conclusion démontrée

La route actuelle n'est ni ancienne, ni une suppression SQL directe, ni un contournement de la migration. Elle enlève l'asset, ses sources et ses playables de la projection canonique, valide la projection, puis le writer calcule le delta et appelle :

- `sp_media_asset_delete` si `parent_asset_id` est `NULL` ;
- `sp_media_derivation_delete` sinon.

Le mapper `proto05-relational-mapping.mjs:594–663` ne recopie pas naïvement `familyRootAssetId` en SQL. Il reconstruit le lignage depuis `parentAssetId` : une racine devient `family_root_asset_id=NULL`, une dérivation reçoit la racine calculée. `familyRootAssetId=self` n'est conservé que dans `provenance_json._migration.originalFamilyRootAssetId` à des fins historiques.

La routine 006 réellement présente dans le dump est celle de `database/schema-migrations/006_proto05_asset_delete_lineage.sql` : elle ne réalise plus l'ancienne affectation intermédiaire invalide ; elle met seulement `default_playable_id=NULL` avant de supprimer les playables, sources et asset. Les essais isolés n'ont produit aucune erreur de lignage.

#### Pourquoi l'erreur a pu apparaître « malgré 006 »

Deux mécanismes différents ont porté des messages voisins :

1. **Avant 006**, la routine SQL affectait temporairement une valeur de lignée incompatible avec `chk_media_asset_lineage_shape`; 006 corrige exactement ce cas.
2. **Avant tout SQL**, `assertWritableCanonical()` peut produire `FAMILY_ROOT_NOT_FOUND` si une mutation retire une racine tout en laissant une dérivation qui la référence. Dans le chemin courant, `libraryAssetDeletionPlan()` bloque une racine qui possède un enfant direct, et le schéma SQL empêche un lignage orphelin dans le dump.

Sur l'état actuel restauré, aucun troisième chemin ne reproduit l'erreur. Affirmer qu'elle est encore causée aujourd'hui par la route ou par 006 serait donc faux. Si le message a été observé après l'installation de 006, les explications compatibles avec les preuves sont un serveur/page chargé avant la réparation ou un état antérieur au dump ; il manque le timestamp/log exact pour départager ces deux témoins historiques. Ce point n'empêche pas la correction de suppression du plan audio établie ci-dessus.

#### Correction minimale recommandée

Aucune nouvelle correction de lignage n'est justifiée par l'état courant. Conserver 006, ajouter un test bout-en-bout de la route de suppression qui vérifie le nom de la procédure appelée, et exposer le code d'erreur public (`FAMILY_ROOT_*` ou errno SQL) avec un identifiant de corrélation. Un test de régression doit couvrir racine seule, racine avec enfant, dérivation terminale et projection `familyRootAssetId=self` → colonne SQL `NULL`.

### C. HLS : comparaison champ par champ, provider et aperçu

#### Comparaison représentative

| Champ | Ancien HLS fonctionnel 36973 | Nouveau REPLI4C 36970 | Effet |
|---|---|---|---|
| asset ID | `media-proto05-remote-ref-0b…` | `media-proto05-uga-36970` | aucun |
| `parent_asset_id` / `family_root_asset_id` | `NULL` / `NULL` | `NULL` / `NULL` | identique |
| playable par défaut | `video-media-proto05-remote-ref-0b…` | `video-proto05-uga-36970` | aucun |
| source/playable `kind` | `hls` / `hls` | `hls` / `hls` | identique |
| source/playable `provider` | `direct` / `direct` | `uga-video` / `uga-video` | **cause principale UI/lecteur** |
| transport | `hls` | `hls` | identique |
| rôle | `original-remote` | `NULL` | information métier manquante, non bloquante pour l'aperçu |
| MIME | `application/vnd.apple.mpegurl` | identique | identique |
| URL source et playable | URL UGA absolue `…/36973/livestream.m3u8` | URL UGA absolue `…/36970/livestream.m3u8` | même politique réseau |
| `origin_json` | `originUrl`, `sourceUrl`, `url`, `manifestUrl` | `externalVideoId`, `sourceUrl` | la projection playable conserve néanmoins `location_url` comme `url` |
| disponibilité | `available` | `unknown` | le nouveau média paraît non vérifié |
| analyse | `complete`, analyseur `remote-availability` | `pending` | absence de contrôle post-import |
| provenance | `remote-reference` | corpus/entry REPLI4C | légitime |

#### Cause exacte du bouton absent

Dans `teacher-videos.html:271–273`, le bouton et même son conteneur d'aperçu ne sont rendus que si :

```js
['youtube', 'uga', 'direct', 'local'].includes(playable.provider)
  && Boolean(playable.url || playable.embedUrl)
```

`uga-video` échoue à la première condition. La fiche détail conditionne pareillement l'action à la projection disponible.

#### Cause exacte de la lecture si le bouton est forcé

`shared/ic-video-player.js:114–119` n'autorise la lecture native/HLS que pour les providers `uga`, `local` et `direct`. Avec `uga-video`, `load()` tombe sur : `La source vidéo n'est pas autorisée.` Aucun chargement du manifeste n'est alors tenté par le lecteur Proto05.

Les vérifications réseau montrent que 36973 et 36970 répondent tous deux HTTP 200, `Content-Type: application/vnd.apple.mpegurl`, 317 octets. Chrome les reconnaît tous deux comme HLS et crée un élément `<video>`. En revanche, les réponses ne présentent pas `Access-Control-Allow-Origin`. Le lecteur Proto05 utilise hls.js quand il est disponible ; une URL UGA absolue reste donc exposée à un refus CORS dans ce chemin scripté. L'ancien UGA 37004 évite ce risque avec `provider=uga` et une URL même origine `/api/hls/uga-37004/livestream.m3u8`, mais la passerelle serveur actuelle est codée pour ce seul ID (`server.js:5009–5013`).

#### Provider pertinent et correction minimale recommandée

`uga-video` est pertinent comme **identité externe** dans le manifeste et la provenance, mais pas comme provider de lecture du contrat actuel. Puisque les 20 médias appartiennent au même fournisseur et nécessitent une politique réseau UGA contrôlée, le provider jouable cohérent est l'existant **`uga`**, pas `direct`. L'identité `uga-video` et `externalVideoId` doivent rester dans la provenance.

La correction minimale complète est :

1. mapper l'import REPLI4C vers `playable.provider='uga'` et `source.provider='uga'` ;
2. généraliser la passerelle HLS UGA à une liste fermée d'IDs issue des médias canoniques autorisés, au lieu du seul 37004 ;
3. projeter une URL même origine pour chaque playable ;
4. centraliser `canPreviewPlayable()` et décider par capacité (`kind=hls`, URL autorisée), non par liste dupliquée de providers ;
5. effectuer le même contrôle de disponibilité que l'ancien HLS et faire passer `unknown/pending` à un résultat explicite.

Changer seulement `uga-video` en `direct` ferait réapparaître le bouton et franchirait le garde du lecteur, mais laisserait le risque CORS des URL absolues : ce n'est pas une correction complète.

Tests requis : les 20 IDs produisent un bouton en liste et détail ; le lecteur reçoit une URL locale autorisée ; master playlist et variantes/segments sont relayés ; aucune origine hors liste n'est proxyfiée ; erreur réseau affichée dans l'interface ; ancien `direct` 36973 et ancien `uga` 37004 inchangés.

### Contrôles complémentaires et arrêt

- Restauration moteur : réussie dans une instance isolée sans réseau ni port publié.
- Suppressions/rollback : cinq succès représentatifs ; un échec reproduit et attribué exactement au plan audio.
- Réseau : deux manifestes lus en GET, HTTP 200 et type HLS identique ; absence de CORS observée.
- Navigateur : les deux URLs distantes sont reconnues comme HLS par Chrome ; aucune mutation ni téléchargement.
- Code, schéma, données métier et version : inchangés.
- Validation humaine : non effectuée.

Arrêt pour validation de David. Le message de commit proposé pour le rapport complété reste : `docs(proto05): audit media data contamination and deletion defects`.
# Mise en œuvre autorisée — réparation complète du 2 août 2026

## Résultat exécutif

David a levé l'interdiction de mutation après l'audit. La réparation a été menée avec sauvegarde, répétition préalable sur une restauration isolée, transaction gardée et contrôles après coup. L'état métier final contient **27 médias légitimes** : les **7 historiques** et les **20 HLS REPLI4C**. Aucun média, activité, dossier ou tag marqué M150/M152 ne subsiste.

## Point de retour et contrôles avant mutation

- Sauvegarde SQL complète de `ic_augmented_video` créée avant mutation : `temp/proto05_pre_repair_20260802.sql`.
- SHA-256 : `4D9409EEF54AED2482C30DC146FFA86244A4856BE2BD689487E6B9AFF5F31043`.
- Restauration prouvée dans `proto05-repair-restore-check`, conteneur sans réseau et sans port publié : 51 assets, 6 migrations.
- État métier juste avant nettoyage : 51 assets, 14 M150, 10 M152, 5 activités M152, 5 dossiers M152, 5 tags M152.
- Aucun des 24 assets parasites n'était lié à un plan audio ; aucun n'était référencé par une activité non-fixture.
- Empreinte SHA-256 des 27 identifiants à préserver : `6e335d9fd4b540d625adaa0eb9a88e8cd2f5fd524cb10f99ebe9dc9774066ea3`.

## Mutations réalisées

### Migration 007 et suppression sûre

- Ajout de `007_proto05_asset_delete_audio_plan_guard.sql` et de son manifeste.
- `sp_media_asset_delete` refuse explicitement un asset encore utilisé par `media_audio_anonymization_plans`, avec errno métier `30508`, avant les suppressions enfants.
- Migration appliquée via le compte root du conteneur, le compte applicatif n'ayant pas le droit de remplacer la routine ; inscription explicite et contrôlée dans `schema_migrations`.
- Vérification officielle finale : version `007`, 7 migrations, empreinte `e13d75f10340cfda0907ec2727f25c5cf79d740b067a98d7b2337a4cb0b17624`.

### Nettoyage M150/M152

La transaction testée sur la restauration isolée puis rejouée à l'identique sur la base métier :

1. vérifie les cardinalités exactes attendues ;
2. supprime les 5 activités M152 avec `sp_activity_delete` ;
3. supprime les 24 assets avec `sp_media_asset_delete` sous transaction applicative partagée ;
4. supprime les 5 dossiers et 5 tags M152 ;
5. met à jour exactement 20 sources et 20 playables REPLI4C ;
6. rollback et `RESIGNAL` au moindre écart.

Après transaction : 27 assets, 0 M150, 0 M152, 0 activité/dossier/tag M152. L'empreinte des 27 IDs conservés est restée `6e335d...ea3`. Un second passage a été refusé par la précondition `30686`, sans mutation ; sa procédure temporaire de contrôle a ensuite été supprimée et le schéma canonique revérifié.

## Réparation HLS REPLI4C

- Les 20 sources et 20 playables sont désormais `provider='uga'`.
- L'identité externe reste dans `media_sources.origin_json` : `externalProvider='uga-video'`, `externalVideoId` et `sourceUrl`.
- Chaque playable utilise la passerelle générique déjà présente et contrôlée par le playable canonique : `/api/proto05/library/remote-hls/{playableId}/livestream.m3u8`.
- La passerelle valide la cible distante et confine tous les chemins enfants au répertoire du manifeste ; aucune liste parallèle de 20 URL n'a été ajoutée au serveur.
- `shared/ic-video-player.js` porte maintenant l'unique capacité `canPreviewICPlayable`, fondée sur le type et la présence d'une URL, et accepte aussi `manifestUrl`. Les deux rendus de `teacher-videos.html` utilisent cette capacité.

Preuves HTTP : le master 36970 répond 200 (`application/vnd.apple.mpegurl`, 317 octets), son `720p.m3u8` répond 200 (3117 octets) et référence `720p.ts` par byte ranges.

Preuve visuelle Chrome sur `teacher-videos.html` : 27 cartes, 20 cartes REPLI4C, 20 boutons Aperçu ; clic sur 36970 donnant `aria-pressed=true`, aperçu visible, élément vidéo présent, `readyState=4`, statut « Aperçu chargé », aucune erreur console.

## Isolation définitive des tests

`server/test/helpers/temporary-proto05-server.js` refuse maintenant avant connexion et avant démarrage serveur toute base dont le nom ne correspond pas à `proto05_test_*`. Le port HTTP aléatoire ne participe plus à la décision d'isolation. Un test dédié prouve le refus de `ic_augmented_video` et l'acceptation d'une base dédiée. La suite historique `video-workspaces.test.js` atteint 12 tests statiques sur 13 puis échoue volontairement avant son seul scénario mutateur tant qu'aucune base dédiée n'est fournie : aucune écriture métier n'est alors possible.

## Erreurs et familyRootAssetId

- Les échecs serveur 5xx reçoivent maintenant une référence `ERR-*`, journalisée avec le détail interne sûr ; les suppressions fonctionnelles et inattendues reçoivent une référence `DEL-*`.
- `teacher-videos.html` et `teacher-video-detail.html` affichent cette référence avec le message utile ; le détail technique n'est plus abandonné uniquement en console.
- Aucun comportement `familyRootAssetId` n'a été modifié, conformément à la consigne. Les tests de contrat existants couvrent racine invalide, racine absente et filiation canonique ; la suppression réelle des 24 racines via la routine 007 n'a reproduit aucune anomalie de projection.

## Vérifications réalisées

- restauration isolée et transaction complète : succès ;
- `node --check server.js` : succès ;
- tests ciblés contrat/import/isolation : 86/86 ;
- tests statiques `video-workspaces` : 12/12 avant le scénario mutateur, ensuite refus fermé attendu ;
- schéma officiel : version 007 vérifiée ;
- API santé après redémarrage : HTTP 200 ;
- API Library : 27 assets dont 20 REPLI4C, provider `uga` et URL proxy ;
- HTTP HLS master + variante : 200 ;
- recette visuelle et lecture : succès, aucune erreur console ;
- second passage de nettoyage : refus avant mutation ;
- aucun commit ni push.

Les deux conteneurs temporaires `proto05-repair-restore-check` et `proto05-manifest-temp` ont été supprimés après validation. La sauvegarde SQL locale pré-réparation est conservée et récupérable.

## Validation finale

David a validé la recette humaine le 2 août 2026. Le serveur Proto05 fonctionne sur le port 8791 en version **0.1.63**. L'anonymisation des vidéos REPLI4C est explicitement reportée à une mission ultérieure ; aucun nouveau traitement média n'a été lancé lors de la clôture.
