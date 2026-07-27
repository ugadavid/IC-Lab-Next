# Mission 135 — Proto05 — Lecture MariaDB et comparaison avec les JSON

## Statut

**Mission arrêtée avant modification fonctionnelle.**

L’audit a établi que deux valeurs appartenant aux réponses actuellement servies
ne sont pas reconstructibles depuis `ic_augmented_video` seule :

- le `updatedAt` du document de classement des activités ;
- le `updatedAt` du document canonique de bibliothèque média.

La mission impose à la fois :

- de conserver exactement les contrats JSON historiques ;
- de servir les lectures depuis MariaDB seule en mode `mariadb-readonly` ;
- d’obtenir zéro écart sur la comparaison réelle ;
- de s’arrêter si une donnée nécessaire n’est pas reconstructible depuis le
  schéma courant.

La règle d’arrêt a donc été appliquée. Aucun adaptateur partiel, aucune bascule,
aucun blocage de mutation et aucune connexion MariaDB applicative n’ont été
introduits.

## Point de départ

| Élément | Valeur observée |
|---|---|
| branche | `main` |
| commit `HEAD` | `d0eea3dfe49296f168f49fe934094b59bd3fbcfc` |
| dernier commit | `feat(proto05): migrate canonical JSON data to MariaDB` |
| état Git initial | propre |
| Mission 134 | présente dans `HEAD` et rapport 134 présent |
| version Proto05 | `0.1.45` |
| mode de lecture applicatif | JSON uniquement |

## Préflight JSON

Le dry-run canonique a été relancé sans écriture :

| Contrôle | Résultat |
|---|---:|
| fichiers sources du plan | 5 |
| chemins couverts | 435 |
| occurrences observées | 3 222 |
| occurrences conciliées | 3 222 |
| lignes préparées | 264 |
| tables alimentées | 27 |
| blocages | 0 |
| avertissements | 22 |
| chemins non couverts | 0 |
| hash canonique | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |

Les quinze empreintes de référence correspondent à la Mission 134 :

| Fichier | SHA-256 |
|---|---|
| `data/activities.20260716T205538855Z.before-original-copy-removal.json.bak` | `862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47` |
| `data/activities.json` | `95766C6256ACE97A39F63760B2EB530183910113D8DE6DEFF037D0B0F6D3D8C3` |
| `data/activities.json.bak` | `CB024E557A12BC84BB155955AE5C5270B4464350EC2C42243EA68C66F9FB9976` |
| `data/activities.pre-language-catalog-0.1.12.json.bak` | `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD` |
| `data/activity-library.json` | `63CE330896759421397C987CCC685884FFB6E1C93663B68B7D3D6EAD4C1C256A` |
| `data/activity-library.json.bak` | `1426A224FB94FB54273A2AAF489D29036A24A775FA3C7941903F7DFF8451FF65` |
| `data/backups/mission-102-video-library-0.1.json` | `361305F679391FB8559C2958880CE9DCB5A0CF238A1C6371A2B3F6583CFD7A9B` |
| `data/video-catalog.json` | `89A73A4065AB84AE1B676D25FBE62FD17FEB0FB51302997B49999E68B05FE373` |
| `data/video-catalog.json.bak` | `761410B2B5F1D981DB3996D663F7D6F4B3225E56EA09E8641E297C5E27260172` |
| `data/video-library.json` | `E98C9A4F051F09020E9227A37D60CF532FA446BA684B80BFB8505DBF3519D473` |
| `data/video-library.json.bak` | `64079311A2FE741F7448D2415F8E74B866F976006F0FB88265F51D545431028A` |
| `server/package.json` | `522EA570AC20703B10D66C4290DEA2A0988E91C7A800133971EB136201F1D826` |
| `server/test/fixtures/layer-visibility.activity.json` | `533556B24E33D49F746259CA9C072DBE4AEE39DF51ED0F1688E18395E03ECC39` |
| `server/test/fixtures/media-library-canonical.valid.json` | `1593A0498A3F343EC0C2A1EDAEE5425BAC3064CFDE075EC113DB5138E8291511` |
| `../../shared/reference-data/languages.json` | `E3034A20260C6F77569966E3CC05618402362822B038CAC4D491BAEE3AFFF355` |

## Préflight MariaDB

Le contrôle `--verify-only` de la Mission 134 a été relancé :

| Contrôle | Résultat |
|---|---:|
| lignes | 264 |
| tables alimentées | 27 |
| lignes manquantes, supplémentaires ou divergentes | 0 |
| références orphelines | 0 |
| hash de lecture MariaDB | `5701301f90c874d2632ba5e0b9d2c138ff43c2e19964d3ac8051a65919c32f20` |
| tables | 31 |
| procédures | 43 |
| clés étrangères | 48 |
| contraintes `CHECK` | 65 |
| tables non-InnoDB | 0 |
| triggers | 0 |
| événements | 0 |

Invariants relus :

- quatre intervalles ont `segment_id = NULL` ;
- deux traitements `completed` n’ont pas de playable publié ;
- deux activités possèdent une configuration de couches ;
- deux liens média primaires sont présents.

Témoins des autres bases :

| Base | Témoin observé |
|---|---|
| `ic_dico` | 8 tables, 0 vue, 9 procédures, hash données `786bd80a39604d9d25bdfd91286b5652b87c9f814afc10dd178dbde5dbb4815c` |
| `ic_hub` | 15 tables, 1 vue, 3 procédures, hash données `3ae48844ed0b426479baf1b4d80f2b8d05352ca88cb5a03a00daceb8b68e2382` |

## Inventaire des lectures actuelles

Le serveur est un fichier Node principal de 3 689 lignes. La sélection de
source n’est pas encore abstraite.

| Domaine | Point d’entrée actuel | Source JSON | Contrat retourné | Consommateurs | Lecture MariaDB nécessaire |
|---|---|---|---|---|---|
| activités | `readActivities()` | `data/activities.json` | document, liste, détail, atelier, vidéo résolue | routes activités, bibliothèque, suppressions média | oui |
| classement des activités | `readActivityLibraryClassification()` | `data/activity-library.json` | `schemaVersion`, `updatedAt`, dossiers, affectations | bibliothèque et mutations de dossiers | oui |
| catalogue vidéo | `loadVideoCatalog()` puis cache `VIDEO_CATALOG` | `data/video-catalog.json` | sources vidéo de compatibilité | catalogue, création et résolution | oui |
| bibliothèque média | `loadVideoLibrary()` puis caches `CANONICAL_LIBRARY` et `VIDEO_LIBRARY` | `data/video-library.json` | assets, sources, playables, traitements, dossiers, tags | routes Library, activités, flux et traitements | oui |
| langues | `loadLanguageCatalog()` puis cache `LANGUAGE_CATALOG` | `shared/reference-data/languages.json` | référentiel partagé | route langues et validation d’atelier | oui |
| médias locaux | `fs.stat`, `createReadStream` | fichiers sous `video-library-media` et `video-library-workspaces` | contenu binaire, taille et disponibilité physique | lecteur et téléchargements | non : les fichiers restent des fichiers |
| ressources statiques | `fs.readFile` | HTML, JS, CSS, images, PDF, MP3 | contenu HTTP statique | navigateur | non |
| traitements temporaires | maps en mémoire et répertoires temporaires | mémoire et fichiers temporaires | progression de jobs non persistés | routes HLS et téléchargements | non pour la projection canonique |

### Nature des accès

- **lecture pure** : listes et détails d’activités, bibliothèque, catalogue,
  langues, résolution de playable ;
- **lecture préalable à écriture** : duplication, modification, suppression,
  classement, ajout ou retrait de tags, préparation et publication ;
- **métadonnées métier persistées** : les cinq documents JSON et leur projection
  relationnelle ;
- **lecture technique de fichier** : médias, manifests, ressources statiques et
  fichiers temporaires ;
- **projection calculée** : `activityForResponse`,
  `activityForLibraryResponse`, `libraryAssetDetails`,
  `playableForClient`, résolutions de source et résumés pédagogiques ;
- **caches** : `VIDEO_CATALOG`, `CANONICAL_LIBRARY`, `VIDEO_LIBRARY`,
  `LANGUAGE_CATALOG` et leurs index.

## Routes de lecture concernées

Les principales surfaces métier observées sont :

- `GET /api/proto05/video-catalog` ;
- `GET /api/proto05/activity-library` ;
- `GET /api/proto05/library/assets` ;
- `GET /api/proto05/library/assets/:id` ;
- `GET /api/proto05/library/playables/:id` ;
- `GET /api/proto05/language-catalog` ;
- `GET /api/proto05/activities` ;
- `GET /api/proto05/activities/:id` ;
- `GET /api/proto05/activities/:id/video-resolution`.

Les routes de statut de jobs et les routes de média local ou distant sont des
lectures techniques. Elles utilisent cependant des métadonnées issues du cache
de bibliothèque pour localiser le playable ; une future frontière devra donc
leur fournir la même projection sans déplacer les fichiers dans MariaDB.

## Procédures inspectées

Les procédures de lecture suivantes ont été inspectées dans le schéma réellement
appliqué :

- `sp_activity_library_search` ;
- `sp_media_library_search` ;
- `sp_activity_get` ;
- `sp_media_get` ;
- `sp_media_lineage_get` ;
- `sp_media_treatments_search` ;
- `sp_student_activity_bundle` ;
- `sp_author_activity_bundle`.

Elles sont utiles pour des recherches ou des bundles ciblés, mais aucune ne
restitue les métadonnées de document perdues. Les limites complémentaires
observées sont :

- `sp_activity_get` ne restitue pas l’identité
  `activities.layer_configuration_id` ;
- `sp_media_get` ne restitue pas `media_assets.description` ;
- les recherches de bibliothèque retournent des résumés, pas la projection
  complète imbriquée ;
- aucune procédure ne restitue le `schemaVersion` et le `updatedAt` des
  documents `activity-library.json` et `video-library.json`.

Une future implémentation pourrait réutiliser les procédures ciblées et compléter
les colonnes absentes par des requêtes directes statiques et centralisées.
Cependant, une requête directe ne peut pas lire une valeur qui n’est persistée
dans aucune table.

## Blocage de reconstruction

### Classement des activités

Valeur actuellement servie :

```text
activity-library.json.updatedAt =
2026-07-26T20:07:58.978Z
```

Dernières traces relationnelles disponibles :

```text
MAX(activity_folders.updated_at) =
2026-07-26 20:07:55.023

MAX(activities.updated_at) =
2026-07-26 17:30:42.426
```

L’affectation activité-dossier est portée par `activities.folder_id`, sans
timestamp propre. La modification de l’affectation ayant produit le timestamp
du document n’est donc pas datée en MariaDB.

### Bibliothèque média

Valeur actuellement servie :

```text
video-library.json.updatedAt =
2026-07-26T18:39:12.425Z
```

Dernières traces relationnelles disponibles :

```text
MAX(media_assets.updated_at) =
2026-07-25 16:28:38.820

MAX(media_playables.updated_at) =
2026-07-25 16:28:38.820

MAX(media_treatments.updated_at) =
2026-07-25 16:28:38.820
```

Le timestamp du document est postérieur à toutes les lignes métier concernées.
Il ne peut donc pas être déduit par un maximum relationnel.

### Recherche de traces alternatives

Les requêtes de preuve, toutes en lecture seule, ont vérifié :

- les maxima des colonnes `updated_at` concernées ;
- les colonnes dont le nom contient `schema`, `updated_at` ou `snapshot` dans
  `information_schema.COLUMNS` ;
- `import_runs`, qui contient zéro ligne ;
- `schema_migrations`, qui contient zéro ligne.

Aucune table, colonne, ligne d’audit ou procédure ne contient les deux valeurs
attendues.

### Pourquoi les contournements ont été refusés

- lire les timestamps dans les JSON en mode `mariadb-readonly` violerait la
  règle « lectures applicatives depuis MariaDB » ;
- renvoyer `NULL` ou omettre les champs modifierait le contrat historique ;
- utiliser `MAX(updated_at)` renverrait des valeurs factuellement différentes ;
- figer les deux timestamps dans le code ne fonctionnerait pas après une
  écriture JSON et empêcherait une comparaison fiable ;
- masquer ces écarts dans la normalisation violerait l’interdiction de cacher
  une valeur métier perdue.

## Frontière de données envisagée mais non créée

L’audit conduit à une frontière future simple :

```text
routes et services
        |
sélecteur central json / compare / mariadb-readonly
        |
adaptateur JSON     adaptateur MariaDB
        \             /
      comparaison structurée
```

Les contrats minimaux seraient :

- document d’activités ;
- classement de bibliothèque d’activités ;
- catalogue vidéo canonique de compatibilité ;
- bibliothèque média canonique ;
- référentiel de langues.

Cette frontière n’a pas été créée pour éviter de laisser un mode annoncé mais
incapable de satisfaire son contrat.

## Modification qui semble nécessaire

Une validation humaine est nécessaire avant toute modification du schéma ou
nouvelle migration.

La solution minimale serait de persister les métadonnées des projections
documentaires, par exemple dans une table dédiée :

```text
data_projection_metadata
  domain
  schema_version
  source_updated_at
```

avec au minimum deux lignes :

```text
activity-library
media-library
```

La future migration devrait remplir ces valeurs depuis les JSON canoniques.
Une solution avec deux tables d’état spécialisées serait également possible.
Le choix appartient à une mission de schéma/migration distincte.

## Matrice de validation

| Domaine | JSON | MariaDB | Écarts | Lecture MariaDB validée |
|---|---:|---:|---:|---|
| activités | 2 | 2 | non calculé au niveau API | non, mission arrêtée |
| classement d’activités | 1 dossier, 1 affectation | 1 dossier, `folder_id` présent | au moins 1 valeur non reconstructible | non |
| langues | 4 | 4 | non calculé au niveau API | non |
| bibliothèque média | 16 assets, 19 sources, 19 playables, 2 traitements | mêmes cardinalités | au moins 1 valeur non reconstructible | non |
| dossiers média | 1 | 1 | non calculé au niveau API | non |
| tags média | 3 | 3 | non calculé au niveau API | non |
| traitements | 2 | 2 | non calculé au niveau API | non |

Cette matrice ne présente pas les cardinalités identiques comme une preuve
d’équivalence des contrats applicatifs.

## Tests et recettes

### Effectués

- état Git et commit de départ ;
- présence de la Mission 134 ;
- version `0.1.45` ;
- quinze hashes JSON ;
- dry-run canonique réel ;
- vérification MariaDB réelle en lecture seule ;
- schéma, contraintes et moteurs ;
- témoins `ic_dico` et `ic_hub` ;
- inventaire statique des lectures et routes ;
- inspection des procédures de lecture ;
- requêtes de preuve sur les timestamps et métadonnées disponibles.

### Non effectués du fait de la règle d’arrêt

- aucun fichier Node fonctionnel modifié ;
- aucun test de configuration ajouté ;
- aucun adaptateur créé ;
- aucune comparaison applicative complète exécutée ;
- aucun serveur lancé en `compare` ou `mariadb-readonly` ;
- aucune route recettée dans ces modes inexistants ;
- aucune mutation tentée en lecture seule ;
- aucune recette Chromium ou FFmpeg.

Une mutation représentative n’a volontairement pas été tentée : le mode
`mariadb-readonly` n’existe pas encore et le mode courant aurait autorisé une
écriture JSON.

## Intégrité et périmètre

- aucun des quinze JSON n’a été modifié ;
- aucune ligne MariaDB n’a été modifiée ;
- aucun schéma ni procédure n’a été modifié ;
- aucune autre base n’a été modifiée ;
- aucune dépendance n’a été ajoutée ;
- aucune écriture MariaDB applicative n’a été commencée ;
- le mode par défaut reste de fait le fonctionnement JSON historique ;
- la version reste `0.1.45` ;
- aucun commit ni push n’a été effectué.

## Fichiers créés ou modifiés

- création du présent rapport :
  `reports/135_proto05_mariadb_read_adapter_and_shadow_comparison_report.md`.

Aucun fichier applicatif, SQL, JSON, package ou fichier de version n’a été
modifié.

## État Git final

```text
?? reports/135_proto05_mariadb_read_adapter_and_shadow_comparison_report.md
```

- branche : `main` ;
- `HEAD` : `d0eea3dfe49296f168f49fe934094b59bd3fbcfc` ;
- `git diff --check` : réussi ;
- espaces de fin de ligne dans le nouveau rapport : aucun ;
- commit et push : non effectués.

## Validation humaine et suite

Le constat technique est établi par inspection et lectures réelles. Il ne vaut
pas décision de modifier le schéma.

Suite proposée :

1. arbitrer la persistance des métadonnées de document ;
2. créer une mission distincte de schéma/migration ;
3. migrer et réconcilier ces valeurs ;
4. reprendre ensuite la Mission 135 depuis un préflight neuf.

Le message de commit proposé par la mission
`feat(proto05): add MariaDB read adapter and shadow comparison` ne s’applique
pas à cet état bloqué. Si David souhaite versionner uniquement ce rapport, un
message documentaire possible serait :

```text
docs(proto05): record MariaDB read adapter metadata blocker
```
