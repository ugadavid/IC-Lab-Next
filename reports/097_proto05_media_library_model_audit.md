# Mission 097 — Audit du modèle actuel de la vidéothèque Proto05

## Résumé exécutif

L’audit porte sur l’état réellement présent dans Proto05, sans modification de
code, de schéma ou de données.

Proto05 possède aujourd’hui deux niveaux de référence vidéo :

1. `data/video-catalog.json`, ancien catalogue encore lu par la compatibilité
   des activités historiques et par certaines routes auteur ;
2. `data/video-library.json`, source persistante actuelle de la Library, avec
   trois collections parallèles `assets`, `sources` et `playables`.

La Library contient actuellement **15 assets, 15 sources et 15 playables** :

- 1 source HLS UGA ;
- 2 sources YouTube contrôlées ;
- 2 fichiers locaux gérés ;
- 10 dérivés anonymisés locaux.

Le stockage physique contient 9 fichiers vidéo gérés. Trois des dix dérivés
enregistrés dans la Library ont un `storageKey` dont le fichier est absent. Ces
entrées restent structurellement présentes mais ne sont pas lisibles tant
qu’elles ne sont pas restaurées ou marquées indisponibles. Ce constat n’a pas
été réparé durant l’audit.

Les sept activités canoniques utilisent encore un mélange de compatibilité :
certaines ont `videoRef`, d’autres ne possèdent que `activity.video` et sont
résolues par l’ancien catalogue. Les activités ne référencent actuellement
aucun des dérivés anonymisés par `videoRef`.

Le modèle actuel permet déjà de distinguer asset logique, source et playable,
de conserver une provenance et de rattacher un dérivé à un asset source et à
un job de préparation. Il ne possède toutefois pas encore de famille
persistante, de dossier, de tags, de collections sauvegardées, d’historique
de traitements durable ou de politique générale de suppression.

## 1. Entités actuelles

| Entité réelle | Rôle | Identifiant / stockage | Relations et usage |
|---|---|---|---|
| `video-catalog.json` / `VIDEO_CATALOG` | Projection historique des sources autorisées | `data/video-catalog.json`, identifiant `video.id` | Lu par `loadVideoCatalog`, les routes de compatibilité et la résolution des activités sans `videoRef`. Écriture par `POST /api/proto05/video-catalog`. |
| `MediaAsset` implicite | Identité logique navigable d’un média | `video-library.json.assets[].id` | Référence ses `sourceIds`, `playableIds`, `defaultPlayableId`, titre, statut, provenance, métadonnées et droits. Affiché par `teacher-videos.html`. |
| `MediaSource` implicite | Origine ou déclaration d’un média | `video-library.json.sources[].id`, `assetId` | Porte `kind`, fournisseur, URL, chemin logique, disponibilité, provenance et métadonnées d’origine. |
| `Playable` / `PlayableVersion` implicite | Version effectivement résolue par un lecteur | `video-library.json.playables[].id`, `assetId`, `sourceId` | Porte l’URL ou le `storageKey`, le statut, le type, le MIME et les métadonnées nécessaires au lecteur. Résolu par `resolveLibraryPlayable`. |
| `activity.videoRef` | Référence moderne utilisée par une activité | `activities.json.activities[].videoRef` | Contient `schemaVersion`, `assetId`, `playableId`. Validé par `resolveActivityVideo` et `validateAuthoringPatch`. |
| `activity.video` | Projection de compatibilité | `activities.json.activities[].video` | Conservée lors des sélections Library et utilisée par les vues étudiant, guidée, auteur et prévisualisation. |
| `HLS preparation job` | Copie temporaire préparée pour FFmpeg | `ACTIVE_HLS_PREPARATIONS`, workspace sous `%TEMP%/proto05-hls-preparations` | Identifie `assetId`, `playableId`, `sourceId`, `id`, progression, état, métadonnées et fichier temporaire `work.mp4`. Non persisté après redémarrage. |
| `HLS derivation job` | Traitement d’anonymisation puis publication | `ACTIVE_HLS_DERIVATIONS`, workspace sous `%TEMP%/proto05-hls-derivations` | Référence la préparation, les masques ou étapes, le profil de flou, les commandes FFmpeg et le résultat. Le job est temporaire ; le dérivé est persistant dans la Library. |
| `derived asset/source/playable` | Média MP4 issu d’une préparation | Trois entrées dans `video-library.json` et fichier dans `data/video-library-media` | La provenance contient `sourceAssetId`, `sourcePreparationJobId`, paramètres de masque, FFmpeg, hash et taille. |
| `segments`, `teacherAnnotations`, `overlays` | Données pédagogiques d’une activité | `activities.json` | Elles ne portent pas de référence vidéo propre : leurs temps sont interprétés dans la vidéo de l’activité. |

### Structure persistante réelle de la Library

```json
{
  "schemaVersion": "0.1",
  "updatedAt": "…",
  "assets": [],
  "sources": [],
  "playables": []
}
```

La validation actuelle vérifie surtout les tableaux et l’unicité globale des
identifiants. Elle ne vérifie pas de manière exhaustive toutes les relations
asset/source/playable, l’existence physique de chaque fichier, ni l’unicité
des familles de provenance.

## 2. Données présentes et stockage physique

### Fichiers persistants

- `data/video-library.json` : Library actuelle, 15 assets/sources/playables ;
- `data/video-catalog.json` : catalogue historique, utilisé pour la transition ;
- `data/activities.json` : 7 activités canoniques ;
- fichiers `.bak` pour les activités, le catalogue et la Library ;
- `data/video-library-media/` : copies locales et dérivés publiés ;
- `data/video-library-media` ne contient pas les HLS distants ni les vidéos
  YouTube ;
- les jobs et leurs fichiers de travail sont sous le répertoire temporaire du
  système et sont supprimés après succès, échec ou annulation.

### Fichiers vidéo actuellement présents

Les neuf fichiers observés sont deux fichiers locaux d’origine et sept dérivés
anonymisés existants, soit 9 fichiers au total. Les trois dérivés suivants sont
référencés mais absents :

- `e4bde20ecc6a4075-anonymized.mp4` ;
- `41393a2fec32b45c-anonymized.mp4` ;
- `ce9376fcd4b77586-anonymized.mp4`.

La Library conserve pour eux l’asset, le source, le playable, le hash et la
provenance ; elle ne dispose pas d’un état explicite `missing` calculé à partir
du système de fichiers.

### Chemins et conventions

Les copies gérées utilisent un `storageKey` relatif, par exemple
`video_toto_1080p.mp4` ou `37db64d0529dda8c-video_toto_1080p.mp4`. Les dérivés
utilisent un préfixe de hash suivi de `-anonymized.mp4`.

`safeLibraryMediaPath` refuse les chemins absolus, les séparateurs Windows et
les composants `.` ou `..`, puis résout le fichier sous
`data/video-library-media`. Les chemins absolus d’origine peuvent toutefois
être conservés dans la provenance d’un import local historique.

Les écritures persistantes de Library, catalogue et activités utilisent un
fichier temporaire, une sauvegarde `.bak` et un renommage atomique. Les
répertoires temporaires de jobs utilisent `fs.mkdtemp` et sont nettoyés par les
fonctions de finalisation.

### Risques de stockage constatés

- `video-library.json` est la source persistante de la Library, mais le
  catalogue historique continue d’être une source de compatibilité ;
- l’existence d’un fichier physique n’est pas une contrainte de validation
  générale de la Library ;
- la provenance porte parfois un chemin d’origine absolu dépendant de Windows ;
- le nom de fichier est utilisé pour le stockage, mais l’identité logique est
  normalement l’`assetId`, pas le nom ;
- aucune route de suppression générale d’asset, source, playable ou fichier
  publié n’a été trouvée ;
- un déplacement manuel d’un fichier local casse le playable sans réécriture
  automatique de la Library ;
- aucune relation inverse persistante ne permet de retrouver les activités
  utilisant un asset sans parcourir les activités.

## 3. Parcours actuels

### A. Import local

`teacher-videos.html` envoie un fichier multipart à
`POST /api/proto05/library/import-local`. Le serveur écrit d’abord une copie
temporaire dans `data/video-library-media`, calcule SHA-256 et taille, détecte
un doublon par hash, puis renomme la copie et persiste simultanément asset,
source et playable avec une sauvegarde préalable.

L’original sélectionné dans le navigateur n’est pas déplacé. La provenance
conserve le nom original, la date d’import, le hash et la taille. Les
métadonnées vidéo disponibles restent limitées dans l’entrée créée ; la durée
est souvent `null` pour ces imports.

### B. Source distante ou HLS

La déclaration d’une source passe par `POST /api/proto05/library/assets`.
Les types acceptés sont `local-file`, `direct-url` et `hls`.

- HLS : domaine et chemin UGA autorisés, lecture via le proxy HLS existant ;
- URL directe : URL média contrôlée, sans YouTube ni manifeste HLS ;
- YouTube : présent dans le catalogue contrôlé et représenté par
  `youtube-embed`, mais non accepté comme URL libre par l’ajout générique ;
- copie distante : `POST /api/proto05/library/copy-direct`, avec validation de
  protocole, redirections, MIME, taille, timeout, adresses privées et hash ; la
  copie est ensuite un playable local, tandis que la source conserve l’URL
  distante et la provenance.

Le proxy HLS et le lecteur ne récupèrent pas directement les flux YouTube.

### C. Création et édition d’activité

`teacher-create.html` interroge la Library et crée une activité avec
`videoRef.assetId` et `videoRef.playableId`. Le serveur construit alors
`activity.video` comme projection de compatibilité.

L’association ultérieure passe par
`PUT /api/proto05/activities/:id/video-ref`. L’édition auteur et guidée
acceptent un `videoRef` validé, tout en conservant `activity.video`.

Les activités historiques sans `videoRef` sont résolues depuis leur
`activity.video.id` par le catalogue. Si l’entrée ou le fichier n’existe plus,
la résolution échoue au chargement ou à la validation ; il n’existe pas de
fallback physique automatique.

### D. Préparation d’anonymisation

`POST /api/proto05/library/hls-preparations` résout asset/playable/source,
exige une source HLS compatible, crée un job en mémoire et télécharge/prépare
un `work.mp4` dans `%TEMP%/proto05-hls-preparations/<jobId>-…`.

Le job porte `assetId`, `playableId`, `sourceId`, `metadata.sourceUrl`, la
progression, les journaux, les masques et les étapes. Une seule source peut
avoir plusieurs jobs successifs ; le stockage actuel ne leur donne pas de
registre durable séparé.

### E. Dérivation

`POST /api/proto05/library/hls-derivations` ou
`POST /api/proto05/library/hls-temporal-derivations` crée un job temporaire.
Le pipeline produit des segments locaux, les concatène sans second encodage
vidéo, remuxe l’audio puis valide le MP4.

Après succès, `persistDerivedPlayable` calcule hash et taille, écrit un nouvel
asset/source/playable dans `video-library.json` et déplace le fichier dans
`data/video-library-media`. La provenance du nouvel asset contient notamment
`sourceAssetId`, `sourcePreparationJobId`, les masques ou étapes, la méthode,
les paramètres FFmpeg, le hash, la taille et la date.

Le résultat apparaît ensuite dans la Library via la liste des assets. Le lien
est donc réel mais stocké dans la provenance, pas dans une relation de famille
dédiée.

### F. Suppression et annulation

La suppression d’activité agit sur `activities.json` et conserve une
sauvegarde ; elle ne supprime pas automatiquement les assets ou fichiers
vidéo.

Les routes `DELETE` de préparation et de dérivation demandent l’annulation du
job et nettoient les workspaces temporaires. Aucune route publique de
suppression d’un asset, d’une source, d’un playable ou d’un fichier dérivé n’a
été trouvée. La suppression physique et la protection des sources ayant des
dérivés restent donc à définir.

## 4. Relations source/dérivés observées

```text
asset UGA
  └─ source hls UGA ─ playable HLS
       └─ preparation job temporaire
            └─ derivation job temporaire
                 └─ asset dérivé ─ source local-file ─ playable local MP4
```

Les dix dérivés observés portent tous `sourceAssetId` vers l’asset UGA et un
`sourcePreparationJobId`. Plusieurs dérivés peuvent donc être rattachés à une
même source. Les données ne prouvent pas qu’un dérivé a déjà servi de source
d’un autre dérivé, même si le playable local peut techniquement être sélectionné
par une activité et certaines routes acceptent une résolution Library.

Le traitement est partiellement identifiable : la provenance conserve la
méthode, le job de préparation, les masques/étapes, le profil de flou, le filtre
et la version FFmpeg. Le job lui-même n’est pas durable après redémarrage.

L’activité peut choisir explicitement un playable d’asset, mais il n’existe pas
de champ `familyId`, `parentAssetId`, `derivedFrom` normalisé ni de relation
inverse persistante. Une famille doit actuellement être reconstruite en
groupant `sourceAssetId` dans les provenances.

## 5. Comparaison aux besoins du ROADMAP

| Notion décidée | État actuel | Informations manquantes / conflit |
|---|---|---|
| Famille source/dérivés | Partielle, calculable depuis `sourceAssetId` | Pas de famille stable, pas de parent formel, pas de relation inverse. |
| Provenance | Partielle à bonne pour imports et dérivés | Formats différents selon l’origine ; provenance non normalisée. |
| Type de média | Partiel via `kind`/`provider` | `direct-url` devient `local-file` côté playable après copie distante. |
| Dossiers manuels | Absents | Aucun champ ou stockage de classement. |
| Tags | Absents | Aucun champ ni route de qualification transverse. |
| Collections automatiques | Calculables partiellement par requête | « originales », « anonymisées », « en traitement » reposent sur heuristiques ; état missing non persisté. |
| États de traitement | Présents surtout dans les jobs en mémoire | Pas d’historique durable ni d’état global asset/traitement. |
| Métadonnées techniques | Présentes mais incomplètes et dupliquées | Durée, codec, résolution et cadence ne sont pas systématiquement persistés dans tous les imports. |
| Métadonnées fonctionnelles | Titre et provenance partiels | Pas de description fonctionnelle, dossier, tags, droits détaillés ou publication. |
| Suppression traçable | Activités et jobs encadrés ; médias non supprimables publiquement | Pas de garde-fou source/dérivés, rétention ou audit de suppression. |

### Collections automatiques envisagées

- **Toutes les vidéos** : calculable par `assets` actifs ;
- **Originales** : approximable par provenance `catalog-migration`,
  `managed-local-copy` ou source distante, mais la notion d’original n’est pas
  formalisée ;
- **Anonymisées** : calculable avec `provenance.kind ===
  derived-anonymized` ;
- **En cours de traitement** : calculable seulement à partir des Maps de jobs du
  processus courant, donc perdu après redémarrage ;
- **En erreur** : lisible sur les jobs actifs, pas sur un historique persistant ;
- **Non classées** : impossible à distinguer rigoureusement sans dossier ou
  catégorie explicite.

## 6. Dossiers, tags, collections et familles

La recherche dans le code et les données ne révèle pas de notion persistante de
dossier, `folderId`, tag, catégorie ou collection liée à une activité.

Les regroupements actuels sont implicites : cartes de Library, filtres par type
de source, fournisseur, statut et présence d’un playable. Ils ne constituent
pas des collections persistantes.

Le chemin physique n’est pas un dossier fonctionnel : il sert de clé de
stockage, et la provenance peut contenir un chemin d’origine. Il ne faut donc
pas déduire les futurs dossiers ou tags à partir de ces chemins.

La famille source/dérivé est la seule relation structurelle déjà observable,
mais elle est encodée dans la provenance de chaque dérivé et non dans une
entité relationnelle distincte. Cela respecte partiellement la décision du
ROADMAP, mais rend les contrôles d’intégrité et les suppressions difficiles.

## 7. États de traitement observés

| Domaine | Valeurs observées | Persisté ou calculé | Limite |
|---|---|---|---|
| Asset | `active` | Persisté | Pas de `missing`, `archived`, `blocked` ou `processing` général. |
| Source | `declared`, `available`, `unavailable` | Persisté | Disponibilité déclarée différente de l’existence physique. |
| Playable | `pending`, `available`, `blocked` possible par le résolveur | Persisté / contrôlé à la résolution | Pas de raison d’indisponibilité normalisée. |
| Préparation | `queued`, `running`, `cancelling`, `completed`, `failed`, `cancelled` | En mémoire | Perdu au redémarrage ; TTL 30 minutes après fin. |
| Dérivation | `prêt`, `anonymisation`, `validation`, `annulation`, `terminé`, `échoué`, `annulé` et codes publics normalisés | En mémoire, résultat partiellement persisté | Historique du traitement absent ; l’asset final seul reste dans la Library. |
| Fichier | existence réelle ou erreur de lecture | Calculé à la demande | Pas converti en état persisté `missing`. |

Les transitions sont explicites dans les fonctions `runHlsPreparation`,
`runHlsDerivation`, `cancelHlsPreparation` et `cancelHlsDerivation`, mais leur
journal n’est pas une entité durable.

## 8. Compatibilité et migration future

À préserver impérativement :

- les sept activités canoniques et leur ordre/contenu ;
- `activity.video` comme projection compatible ;
- `activity.videoRef` lorsqu’il existe ;
- la résolution des activités historiques par `video-catalog.json` ;
- les routes étudiant, auteur, guidée, prévisualisation et Library ;
- les sources HLS UGA et le proxy existant ;
- les deux sources YouTube contrôlées ;
- les copies locales et les dérivés existants, y compris leur provenance ;
- les sauvegardes `.bak`, écritures atomiques et autonomie hors IC-Hub.

### Compléments probablement non destructifs

Il serait possible d’ajouter progressivement des champs tels que dossier, tags,
famille, état calculé, parent logique et métadonnées techniques sans supprimer
`video`, `videoRef`, `sourceIds`, `playableIds` ni la provenance existante.

### Migration nécessitant décision et sauvegarde

- transformer le catalogue historique en références Library définitives ;
- formaliser les dix dérivés et les trois fichiers absents ;
- choisir si un dérivé peut devenir une source de dérivation ;
- normaliser les provenances hétérogènes ;
- décider si les URLs distantes copiées restent une source originale ou une
  provenance de la copie locale ;
- introduire un historique durable des jobs ;
- définir les règles de suppression et de restauration.

Les relations `sourceAssetId` et `sourcePreparationJobId` sont reconstructibles
avec certitude pour les dérivés actuels. Une relation de famille plus riche,
les droits, le dossier d’origine et les intentions utilisateur ne le sont pas
sans information humaine supplémentaire.

## 9. Dette et risques classés

### Bloquant pour le futur modèle

1. Trois playables locaux enregistrés sont physiquement absents.
2. Deux sources de vérité coexistent encore pour les activités historiques :
   catalogue et Library.
3. Les jobs de préparation/dérivation ne sont pas persistés et leur historique
   disparaît après redémarrage.
4. Les règles de suppression de médias et de protection des dérivés n’existent
   pas.

### Important avant migration

1. Pas de relation de famille normalisée ni de relation inverse.
2. Provenances et métadonnées différentes selon le type d’import.
3. État `missing` non persisté.
4. Chemins d’origine absolus dépendants de Windows.
5. Durée et métadonnées techniques parfois nulles ou dupliquées.

### Compatible avec une transition progressive

1. `assetId` et `playableId` stables peuvent servir de base au nouveau modèle.
2. Les écritures atomiques et sauvegardes `.bak` fournissent un mécanisme de
   migration réversible.
3. `sourceAssetId`, `sourcePreparationJobId`, hash et provenance permettent de
   reconstruire une première famille de dérivés.
4. `activity.video` peut rester une projection pendant la transition.

### Dette reportable

1. Absence de vignettes, posters et fichiers d’aperçu persistants.
2. Absence de tags, dossiers et collections sauvegardés.
3. Absence de droits détaillés et de statut de publication.
4. Dépendance aux conventions Windows dans quelques provenances historiques.

## 10. Questions ouvertes pour David et GPT

1. **Quelle source de vérité finale pour les activités historiques ?** Le
   catalogue peut rester un fallback de compatibilité, ou toutes les activités
   peuvent être complétées avec `videoRef`. Le premier choix minimise la
   migration mais maintient deux chemins ; le second simplifie le modèle mais
   exige une migration sauvegardée des sept activités.
2. **Que faire des trois dérivés absents ?** Les restaurer depuis une sauvegarde,
   les marquer `missing`, ou retirer leurs références. La restauration préserve
   l’historique ; le marquage conserve la traçabilité ; le retrait risque une
   perte de provenance.
3. **Une copie distante est-elle un nouvel original logique ou une version
   locale d’une source distante ?** Ces options changent la famille, les droits
   et la suppression de l’URL d’origine.
4. **Un dérivé doit-il pouvoir devenir la source d’une nouvelle dérivation ?**
   L’autoriser rend le graphe récursif ; l’interdire simplifie les familles et
   les règles de suppression.
5. **Les jobs doivent-ils survivre au redémarrage ?** Une persistance permet le
   suivi et l’audit ; elle impose un modèle d’historique, de reprise et de
   nettoyage.
6. **Quel est le sens métier d’« originale » pour une entrée de catalogue,
   une copie locale et une URL directe ?** Sans décision, la collection
   automatique `Originales` restera heuristique.
7. **Les dossiers et tags doivent-ils être propres à Proto05 ou liés à une
   future Library partagée ?** Le premier choix respecte l’autonomie actuelle ;
   le second crée une dépendance inter-prototypes à arbitrer explicitement.
8. **Quelle politique de suppression appliquer à un asset utilisé par des
   activités ou possédant des dérivés ?** Refus, archivage logique ou cascade
   contrôlée ont des impacts très différents sur les activités historiques.

## Fichiers inspectés et contrôles

Fichiers principalement inspectés :

- `server/server.js` ;
- `server/library-contract.js` et `server/media-contract.js` ;
- `server/package.json` ;
- `data/video-library.json`, `data/video-catalog.json`, `data/activities.json` ;
- `data/video-library-media/` ;
- `teacher-videos.html`, `teacher-create.html`, `teacher-guided.html`,
  `teacher-anonymization.html`, `teacher-author.html`, `teacher.html` ;
- tests Library, import local, copie distante, persistance, HLS et dérivation ;
- `README.md`, `ROADMAP.md` et `server/README.md`.

Contrôles exécutés :

- recherches statiques des entités, routes, états, chemins, dossiers, tags,
  collections et provenance ;
- lecture et comptage des données réelles JSON ;
- comparaison des `storageKey` avec les fichiers réellement présents ;
- `git diff --check` — aucun espace en erreur.

Aucun serveur interactif, Chromium, test complet, téléchargement, dérivation,
migration ou écriture de donnée canonique n’a été lancé.

## État Git final

La mission n’a modifié que ce rapport documentaire. Aucun changement
fonctionnel, aucune version, aucun commit et aucun push n’ont été effectués.

Message de commit proposé, non exécuté :
`docs(proto05): audit current media library model`.
