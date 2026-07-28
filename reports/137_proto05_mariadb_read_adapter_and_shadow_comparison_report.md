# Mission 137 — Proto05 — Rapport d’arrêt de l’adaptateur MariaDB en lecture

Date : 28 juillet 2026

Périmètre : Proto05 et base locale `ic_augmented_video`

Statut : **arrêt de sécurité avant implémentation**

Version applicative : **0.1.45, inchangée**

## Résultat

L’adaptateur MariaDB, les modes `compare` et `mariadb-readonly` et le
comparateur structurel n’ont pas été créés.

L’audit a démontré qu’un contrat actuellement exposé par les routes de lecture
ne peut pas être reconstruit exactement depuis le schéma MariaDB actuel :
le snapshot `activity.video` de l’activité
`proto05-draft-1784230655360-d1182f`.

Deux propriétés historiques de ce snapshot sont servies depuis
`activities.json`, mais n’ont pas été persistées :

| Chemin | JSON attendu | MariaDB disponible |
|---|---|---|
| `activities[proto05-draft-1784230655360-d1182f].video.kind` | `"hls"` | playable primaire `kind="youtube-embed"` |
| `activities[proto05-draft-1784230655360-d1182f].video.proxyUrl` | `"/api/hls/uga-37004/livestream.m3u8"` | `location_url=NULL`, aucune propriété de snapshot correspondante |

Lire ces valeurs depuis le JSON en mode MariaDB, les déduire du catalogue UGA
ou les fabriquer aurait enfreint explicitement la Mission 137. La règle d’arrêt
du paragraphe 21 a donc été appliquée avant toute modification du serveur.

## Checkpoint de départ

- branche : `main` ;
- commit :
  `085cfb56cf250a3a1205d670b5df0892c6bdbd68` ;
- libellé :
  `feat(proto05): persist canonical document metadata in MariaDB` ;
- état Git initial : propre ;
- version : `0.1.45` ;
- rapports 135 et 136 présents ;
- migrations et tests de la Mission 136 présents ;
- aucun adaptateur MariaDB applicatif existant ;
- aucun mode de comparaison existant ;
- application toujours exclusivement alimentée par les JSON.

Docker Desktop était arrêté au début de la session. Il a été redémarré pour
rendre le conteneur MariaDB existant accessible. Ce démarrage n’a exécuté ni
migration ni initialisation de données.

## Préflight des données

Le plan canonique a été relancé :

| Contrôle | Résultat |
|---|---:|
| chemins | 435 |
| occurrences observées | 3 222 |
| occurrences conciliées | 3 222 |
| lignes métier | 264 |
| tables métier alimentées | 27 |
| blocages | 0 |
| avertissements connus | 22 |
| hash canonique | `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233` |

État MariaDB initial et final :

| Contrôle | Avant | Après |
|---|---:|---:|
| lignes totales | 268 | 268 |
| lignes métier | 264 | 264 |
| lignes documentaires | 4 | 4 |
| tables alimentées | 28 | 28 |
| tables | 32 | 32 |
| procédures | 43 | 43 |
| FK | 48 | 48 |
| `CHECK` | 68 | 68 |
| triggers | 0 | 0 |
| événements | 0 | 0 |

Hashes MariaDB initiaux et finaux :

| Projection | Hash |
|---|---|
| projection métier Mission 134 | `5701301f90c874d2632ba5e0b9d2c138ff43c2e19964d3ac8051a65919c32f20` |
| contenu brut des 264 lignes métier | `ac98aea7b8f453dd2eaf4b6ace0709c4ba5f76d61aeeeb6805aea9e2c366ae84` |
| quatre lignes documentaires | `b6ee0ce1e759b112ca7aebd7d752d331ea49fa30e4c8b32b0847c8f20bdcb760` |
| contenu global contrôlé des 268 lignes | `588c10fc5f184379b0930c5ff130f2894639aaa4f5934076d688f5e5e04f4c60` |

La restitution documentaire de la Mission 136 reste exacte, notamment :

- `activity-library.updatedAt` :
  `2026-07-26T20:07:58.978Z` ;
- `media-library.updatedAt` :
  `2026-07-26T18:39:12.425Z`.

Témoins des autres bases, identiques avant et après :

| Base | Témoin |
|---|---|
| `ic_dico` | 8 tables, 0 vue, 9 procédures, données `786bd80a39604d9d25bdfd91286b5652b87c9f814afc10dd178dbde5dbb4815c` |
| `ic_hub` | 15 tables, 1 vue, 3 procédures, données `3ae48844ed0b426479baf1b4d80f2b8d05352ca88cb5a03a00daceb8b68e2382` |

## Quinze fichiers protégés

Les hashes relevés au préflight sont identiques aux Missions 134 et 136 :

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

Aucun test exécuté n’a écrit dans ces fichiers.

## Inventaire des accès JSON applicatifs

Le serveur concentre actuellement les accès applicatifs dans
`server/server.js`.

| Fichier appelant | Donnée lue | Contrat ou projection | Route ou consommateur | Frontière qui aurait été requise |
|---|---|---|---|---|
| `server/server.js` | `data/activities.json` via `readActivities()` | document d’activités, liste, détail, résolution vidéo, usages média | `/api/proto05/activities`, détail, `video-resolution`, bibliothèques et mutations | domaine `activities` |
| `server/server.js` | `data/activity-library.json` via `readActivityLibraryClassification()` | dossiers, affectations et bibliothèque d’activités | `/api/proto05/activity-library` et routes de classement | domaine `activity-library` |
| `server/server.js` | `data/video-catalog.json` au démarrage | catalogue de compatibilité contrôlé | `/api/proto05/video-catalog`, validation et résolution d’activités | domaine `video-catalog` |
| `server/server.js` et `server/media-library-runtime.js` | `data/video-library.json` au démarrage | bibliothèque canonique puis projection runtime en mémoire | `/api/proto05/library/assets`, détails, playables, usages et traitements | domaine `media-library` |
| `server/server.js` | `shared/reference-data/languages.json` au démarrage | catalogue partagé et index de validation | `/api/proto05/language-catalog`, validation des activités | domaine `language-catalog` |

Les objets `VIDEO_CATALOG`, `VIDEO_LIBRARY`, `CANONICAL_LIBRARY` et
`LANGUAGE_CATALOG` sont des caches en mémoire construits depuis les fichiers
canoniques au démarrage. `activities.json` et `activity-library.json` sont
relus pendant les requêtes.

Les scripts d’installation et de dry-run média lisent aussi des JSON, mais ce
sont des outils techniques hors trafic HTTP. Les `.bak` et fixtures ne sont pas
des sources applicatives. Aucun import statique de sauvegarde ou de fixture n’a
été trouvé dans le chemin de lecture du serveur.

Les services de mutation réutilisent aujourd’hui les mêmes caches et helpers
que les lectures. Une future frontière devra donc les séparer avant de pouvoir
garantir le blocage `mariadb-readonly`.

## Contrats HTTP concernés

Les principales lectures directement touchées sont :

- `GET /api/proto05/activities` ;
- `GET /api/proto05/activities/:id` ;
- `GET /api/proto05/activities/:id/video-resolution` ;
- `GET /api/proto05/activity-library` ;
- `GET /api/proto05/video-catalog` ;
- `GET /api/proto05/library/assets` ;
- `GET /api/proto05/library/assets/:id` ;
- `GET /api/proto05/library/playables/:id` ;
- `GET /api/proto05/language-catalog`.

La liste et le détail d’activité étendent l’objet JSON sans le remplacer :

- `activityForLibraryResponse()` conserve `...activity` ;
- `activityForResponse()` conserve également `...activity`, puis ajoute
  `videoRef`, `videoSource` et le résumé pédagogique.

Le snapshot `activity.video` fait donc bien partie du contrat HTTP historique.
Le test `server/test/media-contract.test.js` prouve par ailleurs que
`PUT authoring` conserve ce snapshot sur une copie temporaire.

## Preuve de l’impossibilité de reconstruction

### Valeur JSON servie

Pour `proto05-draft-1784230655360-d1182f` :

```json
{
  "video": {
    "id": "video-proto05-youtube-ev9rfkfhfa0",
    "title": "Intercompréhension Catalan-Français",
    "kind": "hls",
    "proxyUrl": "/api/hls/uga-37004/livestream.m3u8",
    "provider": "youtube",
    "videoId": "eV9RFKFhfa0",
    "embedUrl": "https://www.youtube.com/embed/eV9RFKFhfa0?si=b0uIF3FV83dTrIIF"
  }
}
```

Ce snapshot combine historiquement des propriétés YouTube et deux anciennes
propriétés HLS. Le serveur les conserve parce qu’il expose l’objet JSON
historique tel quel.

### Donnée MariaDB disponible

La relation primaire persistée est :

```text
activity_id       = proto05-draft-1784230655360-d1182f
media_asset_id    = media-proto05-video-proto05-youtube-ev9rfkfhfa0
media_playable_id = video-proto05-youtube-ev9rfkfhfa0
kind              = youtube-embed
provider          = youtube
location_url      = NULL
embed_video_id    = eV9RFKFhfa0
source.origin_url = https://www.youtube.com/embed/eV9RFKFhfa0?si=b0uIF3FV83dTrIIF
```

`CALL sp_activity_get(...)` restitue ce playable canonique et ne renvoie
aucune colonne de snapshot vidéo historique. L’inspection des 32 tables ne
trouve aucune colonne `video` ou `snapshot` portée par l’activité.

Le catalogue vidéo contient séparément un playable UGA avec le proxy attendu,
mais aucune relation SQL ne dit que ce proxy appartient au snapshot de cette
activité YouTube. Le sélectionner constituerait une règle inventée et pourrait
produire un faux résultat pour toute autre activité.

### Trace de migration

Le dry-run a déjà qualifié exactement les deux écarts :

```text
ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE
field=kind
oldValue=hls
newValue=youtube-embed

ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE
field=proxyUrl
oldValue=/api/hls/uga-37004/livestream.m3u8
newValue=null
```

Les chemins `activities[].video.*` sont classés
`validation-only:activity-video-projection`, pas comme propriétés persistées.
La Mission 134 a donc légitimement importé l’autorité canonique du playable,
mais pas le snapshot de compatibilité exposé.

## Trois colonnes métier inspectées

Les trois colonnes signalées par la Mission 135 sont présentes dans le schéma :

- `activities.layer_configuration_id` ;
- `media_assets.description` ;
- `media_tags.color`.

Elles ne corrigent pas le blocage observé : aucune ne porte
`activity.video.kind` ou `activity.video.proxyUrl`.

L’audit n’a pas poursuivi la construction complète des cinq projections après
la preuve de cette première impossibilité. Il ne conclut donc pas que le
snapshot vidéo serait l’unique insuffisance restante.

## Procédure et requête tentées

- procédure : `sp_activity_get('proto05-draft-1784230655360-d1182f')` ;
- requête directe en lecture : jointure paramétrable conceptuellement entre
  `activities`, `activity_media_links`, `media_assets`, `media_playables`,
  `media_playable_metadata` et `media_sources` ;
- inspection en lecture de `information_schema.COLUMNS`.

La procédure et la jointure convergent vers le playable YouTube canonique. Il
n’existe aucun autre résultat SQL exact à sélectionner pour le snapshot.

## Modification qui semblerait nécessaire

Une nouvelle décision de persistance est nécessaire avant de reprendre
l’adaptateur. Deux formes minimales semblent possibles, à arbitrer dans une
mission dédiée :

1. une colonne explicitement contractuelle telle que
   `activities.video_snapshot_json`, validée comme objet et migrée depuis le
   snapshot canonique de chaque activité ;
2. une table dédiée `activity_video_snapshots` avec l’identité de l’activité et
   les propriétés historiques nécessaires, si le contrat doit être davantage
   normalisé.

La première piste reflète mieux la nature de snapshot de compatibilité dont les
champs varient selon le fournisseur. Dans les deux cas, il faudrait :

- une migration de schéma explicitement validée ;
- une migration de données depuis `activities.json` ;
- une couverture champ par champ ;
- une preuve de restitution sans lecture JSON ;
- une décision sur l’autorité future de ce snapshot par rapport au playable.

Aucun de ces changements n’était autorisé par la Mission 137 et aucun n’a été
effectué.

## Matrice des domaines

Un écart de domaine représente ici l’impossibilité contractuelle détectée, pas
un simple écart de nombre d’entités.

| Domaine | JSON | MariaDB | Écarts | Lecture MariaDB validée |
|---|---:|---:|---:|---|
| `activities` | 2 activités | 2 activités | au moins 2 valeurs de snapshot | non |
| `activity-library` | 1 document | données présentes | non exécuté après arrêt | non |
| `media-library` | 1 document | données présentes | non exécuté après arrêt | non |
| `video-catalog` | 1 document | données présentes | non exécuté après arrêt | non |
| `language-catalog` | 1 document | 4 langues | non exécuté après arrêt | non |

## Matrice des routes

Les modes demandés n’ont pas été introduits. Seul le fonctionnement JSON
historique a été contrôlé par les tests existants.

| Route | JSON | Compare | MariaDB lecture seule | Contrat identique |
|---|---:|---:|---:|---:|
| `GET /api/proto05/activities` | existant | non créé | non créé | non démontré |
| `GET /api/proto05/activities/:id` | existant et testé | non créé | non créé | impossible avec le schéma actuel |
| `GET /api/proto05/activities/:id/video-resolution` | existant et testé | non créé | non créé | non démontré |
| `GET /api/proto05/activity-library` | existant | non créé | non créé | non démontré |
| `GET /api/proto05/video-catalog` | existant | non créé | non créé | non démontré |
| `GET /api/proto05/library/assets` | existant | non créé | non créé | non démontré |
| `GET /api/proto05/language-catalog` | existant | non créé | non créé | non démontré |

La mutation HTTP représentative en `mariadb-readonly` n’a pas été testée,
puisque ce mode n’existe pas. Aucun faux résultat de recette n’est annoncé.

## Configuration et connexion

Aucune variable `PROTO05_DATA_MODE` ni configuration de connexion applicative
n’a été ajoutée.

Les outils de migration actuels :

- ciblent explicitement `ic_augmented_video` ;
- utilisent le pilote `mysql2` déjà présent dans le workspace ;
- obtiennent le secret en mémoire depuis l’environnement interne du conteneur ;
- ne l’écrivent ni dans les arguments ni dans les rapports.

Aucun fichier `.env` n’a été lu. Une future mission devra définir la
configuration applicative et un compte réellement limité à la lecture sans
réutiliser implicitement le compte privilégié des migrations.

## Contrôles exécutés

- validation syntaxique de `server/server.js` et des migrateurs concernés :
  réussie ;
- auto-tests du dry-run canonique : **22/22** ;
- dry-run réel : bilan et hash inchangés ;
- contrat média et contrat de bibliothèque média : **57/57** ;
- test de conservation du snapshot `activity.video` sur copie temporaire :
  réussi ;
- vérification MariaDB Mission 134 avant/après : 264 lignes, 0 écart,
  0 orphelin ;
- vérification documentaire Mission 136 avant/après : 4 lignes, 0 écart,
  0 perte de précision ;
- inspection SQL ciblée et `sp_activity_get` : réussies ;
- témoins `ic_dico` et `ic_hub` avant/après : identiques ;
- Chromium et FFmpeg : non lancés ;
- comparaison complète réelle : non exécutée, car impossible avec le schéma
  actuel ;
- recettes des trois modes et refus de mutation : non exécutés, modes non
  créés ;
- `git diff --check` : réussi.

## Fichiers concernés

Créé :

- `reports/137_proto05_mariadb_read_adapter_and_shadow_comparison_report.md`.

Aucun fichier serveur, JSON, SQL, test, configuration, dépendance ou version
n’a été modifié.

## Intégrité et limites finales

- quinze fichiers protégés inchangés ;
- 268 lignes MariaDB inchangées ;
- 264 lignes métier inchangées ;
- 4 lignes documentaires inchangées ;
- schéma inchangé : 32 tables, 43 procédures, 48 FK, 68 `CHECK`, aucun trigger
  ni événement ;
- `ic_dico` et `ic_hub` inchangées ;
- version `0.1.45` inchangée ;
- mode effectif toujours JSON uniquement ;
- aucune écriture applicative MariaDB ;
- aucun dual-write ni synchronisation ;
- aucun fallback silencieux ;
- aucun adaptateur partiel ;
- aucun commit ni push.

La validation automatisée ne vaut pas validation humaine de David.

## État Git final

- branche : `main` ;
- HEAD inchangé :
  `085cfb56cf250a3a1205d670b5df0892c6bdbd68` ;
- seul le rapport 137 est non suivi ;
- `git diff --check` : réussi.

Message de commit documentaire proposé, non exécuté :

```text
docs(proto05): record MariaDB video snapshot blocker
```
