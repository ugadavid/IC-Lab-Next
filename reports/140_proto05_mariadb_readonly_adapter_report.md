# Mission 140 — Proto05 — Adaptateur MariaDB readonly et comparaison JSON

Date : 28 juillet 2026

Statut : **réalisée — validation humaine visuelle laissée à David**

## 1. Résultat

Proto05 possède désormais une frontière de lecture unique et trois modes
explicites :

- `json`, mode par défaut, autonome et inscriptible comme en `0.1.46` ;
- `compare`, qui lit JSON et MariaDB, diagnostique leurs écarts, répond avec
  JSON et refuse toute mutation ;
- `mariadb-readonly`, qui sert les lectures depuis MariaDB sans fallback JSON
  et refuse toute mutation.

Le compte MariaDB local fourni après le premier arrêt a été configuré uniquement
dans `.env.local`, fichier ignoré par Git. Son contenu n'a jamais été lu ni
affiché par Codex. Aucun secret n'a été copié dans le code, les tests, les
sorties, le présent rapport ou un fichier suivi.

La connexion réelle, l'identité obtenue, la base active, les grants et les
lectures ont été vérifiés. Le compte possède uniquement `SELECT` et `SHOW VIEW`
sur `ic_augmented_video`, sans privilège global autre que `USAGE`, sans droit
mutatif, DDL, administratif ou de délégation.

Résultat final :

```text
0 divergence sémantique
```

sur la représentation canonique et sur la projection applicative réellement
consommée par les routes.

## 2. Préflight et historique

| Contrôle | Résultat |
| --- | --- |
| Commit de départ | `97ae726aead101c2c3fcb2ad48f134ff938d103e` |
| Mission 139 | présente et commitée |
| État Git initial | propre, hors rapport 140 provisoire non suivi |
| Version initiale | `0.1.46` |
| Mode initial | JSON uniquement |
| Adaptateur résiduel de Mission 137 | absent |
| Premier arrêt | absence d'un compte réellement readonly |
| Reprise | compte dédié créé et grants validés par David |

Rapports de référence consultés :

- `reports/133_proto05_mariadb_schema_alignment_report.md` ;
- `reports/134_proto05_json_to_mariadb_real_migration_report.md` ;
- `reports/136_proto05_document_metadata_schema_and_migration_report.md` ;
- `reports/137_proto05_mariadb_read_adapter_and_shadow_comparison_report.md` ;
- `reports/138_proto05_activity_video_authority_audit_report.md` ;
- `reports/139_proto05_canonical_video_projection_report.md`.

Les inspections complémentaires ont été limitées aux points d'intégration et
aux divergences concrètes rencontrées.

## 3. Fichiers créés ou modifiés

Créés :

- `prototypes/05-augmented-ic-video-01/.env.example` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-data-mode.js` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-canonical-compare.js` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-read-boundary.js` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/fixtures/fake-mysql2-readonly.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/proto05-data-read-boundary.test.js`.

Modifiés :

- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `prototypes/05-augmented-ic-video-01/server/package.json` ;
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/fixtures/layer-visibility.activity.json` ;
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html` ;
- le présent rapport.

Configuration locale non suivie :

- `prototypes/05-augmented-ic-video-01/.env.local`.

Ce fichier est confirmé ignoré par `.gitignore`. Sa valeur sensible n'a pas été
lue.

## 4. Architecture retenue

Les routes conservent leurs services métier et passent par une frontière de
lecture commune :

```text
routes et services Proto05
          |
          v
frontière de lecture + contexte de requête
       /                         \
adaptateur JSON          adaptateur MariaDB readonly
```

L'adaptateur JSON encapsule les lecteurs historiques. En mode `json`, il est le
seul adaptateur utilisé et MariaDB n'est ni configurée ni chargée.

L'adaptateur MariaDB :

- ouvre une connexion bornée à chaque vérification ou snapshot ;
- impose UTC et une transaction de session readonly ;
- vérifie l'identité, la base et les grants ;
- effectue uniquement des `SELECT` explicites sur 29 tables canoniques ;
- reconstruit activités, pédagogie, relations média, assets, sources,
  playables, traitements, dossiers, tags, langues et métadonnées documentaires ;
- restitue correctement la connexion ;
- nettoie les erreurs de connexion et de lecture de toute donnée sensible ;
- n'expose aucune méthode de mutation.

La projection `projectCanonicalLibrary` existante est appliquée après le mapping
relationnel. La projection vidéo commune de la Mission 139 reste ensuite la
seule responsable de `activity.video` et `activity.videoSource`. Aucun snapshot
vidéo persisté ni fallback historique n'a été réintroduit.

## 5. Configuration des modes

| Mode | Source de lecture | Source de réponse | Mutations | MariaDB requise | Fallback |
| --- | --- | --- | ---: | ---: | --- |
| `json` | JSON | JSON | autorisées comme en 0.1.46 | non | aucun |
| `compare` | JSON + MariaDB | JSON | refusées, HTTP 409 | oui | aucun |
| `mariadb-readonly` | MariaDB | MariaDB | refusées, HTTP 409 | oui | aucun |

`PROTO05_DATA_MODE` accepte uniquement `json`, `compare` et
`mariadb-readonly`. Une autre valeur ou une configuration MariaDB incomplète
arrête explicitement le démarrage.

Le healthcheck expose le mode actif. Une indisponibilité MariaDB en mode
`compare` ou `mariadb-readonly` produit une erreur explicite, sans repli.

En modes non JSON, une garde centrale refuse avant routage toute requête API
autre que `GET` ou `HEAD`. Le payload porte le code
`PROTO05_READONLY_MODE`. Les écritures de création, sauvegarde, changement de
vidéo, duplication, suppression, classement, import, copie ou dérivation sont
donc bloquées avant tout effet.

## 6. Contrat SQL et défense en profondeur

Les lectures utilisent des `SELECT` ordonnés sur les tables canoniques
existantes. Aucune vue ou procédure supplémentaire n'était nécessaire. Le
compte ne possède pas `EXECUTE`, ce qui confirme le choix des lectures
relationnelles explicites.

Requêtes non métier supplémentaires :

- réglage de la session en UTC ;
- réglage de transaction de session readonly ;
- lecture de l'identité et de la base ;
- `SHOW GRANTS` ;
- comptage de contrôle des activités.

Aucune requête `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, `CALL`
ou autre écriture n'existe dans l'adaptateur.

La vérification réelle a obtenu :

| Contrôle | Résultat |
| --- | --- |
| Compte attendu | oui |
| Base active | `ic_augmented_video` |
| Activités lisibles | 2 |
| Privilèges de base | `SELECT`, `SHOW VIEW` |
| Privilège global | `USAGE` uniquement |
| Délégation de privilèges | absente |
| Droits d'écriture ou DDL | absents |
| Validation interne de grants | réussie |

Les grants bruts et les données d'authentification n'ont pas été journalisés.

## 7. Mapping et équivalence

Volumes reconstruits lors de la lecture réelle :

| Agrégat | Volume |
| --- | ---: |
| Activités | 2 |
| Dossiers d'activités | 1 |
| Langues | 4 |
| Assets média | 16 |
| Sources média | 19 |
| Playables | 19 |
| Traitements | 2 |
| Dossiers média | 1 |
| Tags média | 3 |

Le mapping préserve les identifiants, `null`, l'absence de propriété, les
booléens, zéros, dates, ordres métier et relations. Il reconstruit `videoRef`
depuis `activity_media_links`, puis résout le playable canonique.

Les écarts rencontrés pendant l'implémentation étaient uniquement des écarts de
projection ou d'ordre sans différence de donnée :

1. quatre chemins dus à l'ordre éditorial du catalogue de langues, différent de
   l'ordre relationnel par identifiant ;
2. huit chemins dus à l'ordre de projections relationnelles `sourceIds` et
   `playableIds`, qui représentent des ensembles ;
3. sept états de playables locaux dus à l'observation du système de fichiers
   réalisée lors de la migration (`available` contre `missing-local`).

Les corrections ont été limitées à :

- appliquer la projection d'exécution canonique aux données MariaDB ;
- déclarer comme non ordonnées les collections réellement non métier ;
- neutraliser uniquement l'état de disponibilité dérivé de la présence locale
  d'anciens fichiers, conformément à la consigne de David ;
- ignorer les timestamps documentaires sans rôle applicatif.

Les identifiants, valeurs métier, types, relations, localisateurs, données
pédagogiques et ordres métier ne sont jamais neutralisés.

| Agrégat ou contrat | Entités comparées | Divergences initiales | Corrections de mapping/normalisation | Divergences finales |
| --- | ---: | ---: | ---: | ---: |
| Activités | 2 | 0 | 0 | 0 |
| Données pédagogiques | 2 activités | 0 | 0 | 0 |
| Médias et relations projetées | 16 assets, 19 sources | 8 | 1 règle d'ordre | 0 |
| Playables | 19 | 7 | 1 règle d'observation locale | 0 |
| Bibliothèque et langues | 2 bibliothèques, 4 langues | 4 | 1 règle d'ordre | 0 |
| Lecteur, guidé et prévisualisation | 2 activités | 0 | 0 | 0 |

La comparaison canonique brute JSON/MariaDB donne 0 divergence. La comparaison
de la projection applicative donne également 0 divergence.

## 8. Routes et consommateurs

| Route ou service | JSON | Compare | MariaDB readonly | Contrat équivalent | Mutation bloquée si nécessaire |
| --- | ---: | ---: | ---: | ---: | ---: |
| Liste des activités | oui | oui | oui | oui | création bloquée hors JSON |
| Détail d'activité | oui | oui | oui | oui | modification/suppression bloquée |
| Bibliothèque d'activités | oui | oui | oui | oui | classement bloqué |
| Fiche et sauvegarde auteur | oui | lecture oui | lecture oui | oui | sauvegarde bloquée |
| Atelier guidé | oui | oui | oui | oui | sauvegarde bloquée |
| Prévisualisation | oui | oui | oui | oui | sans mutation |
| Lecteur étudiant | oui | oui | oui | oui | sans mutation |
| Catalogue et résolution vidéo | oui | oui | oui | oui | changement bloqué |
| Assets et détail média | oui | oui | oui | oui | imports/dérivations bloqués |
| Langues, dossiers et tags | oui | oui | oui | oui | mutations bloquées |

Recette HTTP réelle :

- liste et détail : HTTP 200 ;
- bibliothèques, assets, détail d'asset, langues et catalogue : HTTP 200 ;
- `/teacher`, guidé, prévisualisation et étudiant : HTTP 200 ;
- activité HLS sans champ YouTube hérité ;
- activité YouTube sans `proxyUrl` hérité ;
- même `videoRef.playableId` en liste et détail ;
- mutation auteur : HTTP 409 avec `PROTO05_READONLY_MODE` ;
- sept lectures comparées, sept diagnostics à zéro divergence ;
- aucune erreur serveur.

## 9. Tests et vérifications

Nouveaux tests de frontière : 7/7 réussis.

Ils couvrent :

- sélection stricte du mode et configuration différée ;
- validation positive et négative des grants ;
- mapping canonique et projection applicative ;
- valeurs, types, champs manquants ou supplémentaires et ordres ;
- réponse JSON sans fusion en mode comparaison ;
- fermeture des connexions et erreurs sans secret ;
- démarrage JSON sans configuration ni client MariaDB ;
- lectures HTTP des deux modes MariaDB ;
- HLS, YouTube, local, indisponibilité, dossiers et tags ;
- détail inexistant ;
- onze familles de mutations refusées ;
- absence de modification des copies JSON de test.

Résultats finaux sans navigateur ni FFmpeg :

| Suite | Résultat |
| --- | --- |
| Syntaxe des 8 fichiers Node concernés | réussie |
| Contrats vidéo, média, Library, migration et frontière | 105/105 |
| Régression données et bibliothèque d'activités | 15/15 |
| Sauvegarde auteur JSON ciblée | 6/6 |
| Comparaison canonique réelle | 0 divergence |
| Comparaison applicative réelle | 0 divergence |
| Recette HTTP réelle compare/MariaDB | réussie |
| `git diff --check` | réussi |

La suite globale n'a pas été lancée, car plusieurs fichiers mélangent tests
Node, Chromium ou FFmpeg. FFmpeg n'a jamais été lancé.

Écart de procédure : une exécution initiale complète de
`teacher-save.test.js`, destinée au test API JSON, a aussi lancé sa sous-recette
Chromium embarquée malgré l'interdiction. Cette sous-recette a expiré et n'est
pas utilisée comme validation. Aucun processus Chromium de test résiduel n'a été
retrouvé. Le sous-test API a ensuite été relancé seul et réussit 6/6.

La fixture `layer-visibility.activity.json` a été alignée sur `videoRef` en
mémoire de test ; elle ne contient plus l'ancien snapshot `video`. Aucun JSON
canonique n'a été modifié.

## 10. Contrôle de non-altération

### MariaDB

| Base | Lignes avant/après | Hash données avant/après | Hash structure avant/après |
| --- | ---: | --- | --- |
| `ic_augmented_video` | 268 | `5514700ce9cf1edcd99fa38afc1d6b408a89cd5c581105eccc7ea07b5fa0fc33` | `dc4d92101b8b21d5d07d36114c00525e66330dbe334aefdb3d9e1a1ba80b4d6a` |
| `ic_dico` | 859 | `786bd80a39604d9d25bdfd91286b5652b87c9f814afc10dd178dbde5dbb4815c` | `03f9e0d6fee34f7a867ca970294aafdf4ad30cad6e68ace69b434dc59b474e27` |
| `ic_hub` | 223 | `3ae48844ed0b426479baf1b4d80f2b8d05352ca88cb5a03a00daceb8b68e2382` | `32197288cce606dc551ba5702e5a0cfb5ad7fc45baf2d77f04bbbce169aee9e3` |

Pour Proto05 :

- 268 lignes totales ;
- 264 lignes métier ;
- 4 lignes documentaires ;
- 32 tables ;
- 0 vue ;
- structure identique, incluant routines et contraintes ;
- 48 clés étrangères ;
- 68 contraintes `CHECK` ;
- 0 trigger ;
- 0 événement.

Les hashes de structure, calculés avec routines, événements et triggers,
reproduisent exactement les témoins initiaux. Aucun grant n'a été modifié par
Codex.

### JSON

| Fichier | SHA-256 final, identique au témoin initial |
| --- | --- |
| `activities.json` | `b23cb97d8a07c6243b83b64da8748fab45dad62796cc06d7ec03cf3a693d6b19` |
| `activity-library.json` | `63ce330896759421397c987ccc685884ffb6e1c93663b68b7d3d6ead4c1c256a` |
| `video-catalog.json` | `89a73a4065ab84ae1b676d25fbe62fd17feb0fb51302997b49999e68b05fe373` |
| `video-library.json` | `e98c9a4f051f09020e9227a37d60cf532fa446ba684b80bfb8505dbf3519d473` |
| `languages.json` | `e3034a20260c6f77569966e3cc05618402362822b038cac4d491baee3afff355` |

| Cible | Avant | Après | Identique |
| --- | ---: | ---: | ---: |
| MariaDB total | 268 | 268 | oui |
| Lignes métier | 264 | 264 | oui |
| Lignes documentaires | 4 | 4 | oui |
| Structures | hashes de référence | mêmes hashes | oui |
| Hashes de données | hashes de référence | mêmes hashes | oui |
| JSON canoniques | hashes de référence | mêmes hashes | oui |
| `ic_dico` | 859 lignes | 859 lignes | oui |
| `ic_hub` | 223 lignes | 223 lignes | oui |

## 11. Recette visuelle laissée à David

Depuis `prototypes/05-augmented-ic-video-01/server` :

### Mode JSON

```powershell
Remove-Item Env:PROTO05_DATA_MODE -ErrorAction SilentlyContinue
npm start
```

### Mode comparaison

```powershell
$env:PROTO05_DATA_MODE = 'compare'
node --env-file=../.env.local server.js
```

### Mode MariaDB readonly

```powershell
$env:PROTO05_DATA_MODE = 'mariadb-readonly'
node --env-file=../.env.local server.js
```

Pour chaque mode :

1. ouvrir `http://127.0.0.1:8791/teacher` ;
2. ouvrir `proto05-augmented-video-01`, puis son guidé, sa prévisualisation et
   sa vue étudiante ; la vidéo attendue est HLS ;
3. ouvrir `proto05-draft-1784230655360-d1182f` dans les mêmes vues ; la vidéo
   attendue est YouTube ;
4. vérifier l'absence de `proxyUrl` historique sur YouTube et de champ YouTube
   sur HLS ;
5. consulter le terminal : en mode `compare`, chaque lecture doit annoncer
   `0 divergence sémantique` ;
6. dans les deux modes readonly, tenter une sauvegarde : elle doit être refusée
   sans effet ;
7. arrêter proprement avec `Ctrl+C`.

Cette recette n'a pas été validée humainement par David dans le cadre de la
présente exécution.

## 12. Limites restantes

- La validation visuelle humaine reste à effectuer.
- Les anciennes indisponibilités de fichiers locaux restent une observation du
  système de fichiers, sans enquête ni modification, conformément à la consigne
  de David.
- Le registre de couverture du dry-run de migration, antérieur à la Mission 139,
  ne référence pas encore les trois chemins `videoRef.assetId`,
  `videoRef.playableId` et `videoRef.schemaVersion`. Il signale donc trois
  blocages de couverture documentaire sur le JSON actuel. Ce dry-run n'a pas été
  modifié dans la Mission 140. Le schéma migré, les lignes MariaDB, le mapping
  canonique et les comparaisons applicatives réelles sont néanmoins cohérents et
  à zéro divergence.

## 13. Version, Git et livraison

Version initiale : `0.1.46`.

Version finale : **`0.1.47`**.

Emplacements mis à jour :

- version du serveur ;
- `server/package.json` ;
- affichage de version de la fiche vidéo ;
- titre du README serveur.

Aucun commit ni push n'a été effectué.

Le worktree contient uniquement les fichiers de la Mission 140 listés dans ce
rapport. `.env.local` est ignoré. `git diff --check` réussit.

Message de commit proposé :

```text
feat(proto05): add MariaDB readonly read modes
```
