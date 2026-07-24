# Mission 100 — Audit de migration de la vidéothèque Proto05

## Résumé exécutif

Cette mission est un audit documentaire et technique en lecture seule. Aucune
migration, copie, écriture canonique, réparation de référence, requête distante,
serveur, navigateur, FFmpeg ou ffprobe n’a été exécuté.

L’état observé distingue trois niveaux :

1. `data/video-library.json` est la Library persistante actuelle pour les assets
   déjà enregistrés et les `videoRef` modernes ;
2. `data/video-catalog.json` reste actif comme catalogue de compatibilité pour
   les activités historiques et certaines vues auteur ;
3. `activity.video` reste la projection de compatibilité consommée par les
   vues vidéo, tandis que `activity.videoRef` est présent seulement sur une
   partie des activités.

L’inventaire anonymisé compte 7 activités, 15 assets, 15 sources et 15
playables. Il compte 9 fichiers vidéo gérés présents pour 12 `storageKey`
référencés : 3 représentations locales sont donc actuellement indisponibles
physiquement, bien qu’elles soient déclarées disponibles dans le document 0.1.
La Library contient 1 source HLS UGA, 2 sources YouTube contrôlées, 2 fichiers
locaux d’origine et 10 dérivés anonymisés. Aucun traitement n’est persisté dans
`video-library.json`; les jobs de préparation et de dérivation sont en mémoire.

La cible canonique de `MEDIA_LIBRARY_MODEL.md` n’est pas encore le format réel
du fichier : la Library persistante est `schemaVersion: "0.1"`, avec des listes
`sourceIds`/`playableIds`, un champ `status` de playable et sans collections
`treatments`, `folders` ou `tags`. La migration future devra donc être une
transformation explicite, versionnée, déterministe et validée par le module 099,
sans réécrire les données canoniques pendant cette mission.

## 1. Prérequis et état Git initial

Le prérequis demandé est satisfait : le commit `92aad68`
`feat(proto05): add dormant canonical media library validator` est présent.
La branche observée est `main` et l’arbre Git était propre avant l’audit.

Le rapport 099 a été contrôlé. Il contient le validateur dormant, sa fixture
synthétique et ses 47 scénarios. Le validateur est pur, ne lit pas la Library
réelle et n’est branché sur aucune route.

## 2. Périmètre et sources inspectées

Sources de gouvernance et de contrat :

- `AGENTS.md` ;
- `STATUS.md` ;
- `docs/ARCHITECTURE.md` ;
- `prototypes/05-augmented-ic-video-01/README.md` ;
- `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md` ;
- `prototypes/05-augmented-ic-video-01/ROADMAP.md` ;
- rapports 097, 098 et 099.

Code et interfaces :

- `server/server.js` ;
- `server/library-contract.js` ;
- `server/media-contract.js` ;
- `server/media-library-schema.js` ;
- `teacher-videos.html`, `teacher-create.html`, `teacher-edit.html`,
  `teacher-author.html`, `teacher-guided.html`, `teacher-anonymization.html` ;
- `shared/ic-video-player.js`.

Données et stockage inspectés en lecture seule :

- `data/video-library.json` ;
- `data/video-catalog.json` ;
- `data/activities.json` ;
- les fichiers `.bak` et formats alternatifs présents ;
- la liste des fichiers de `data/video-library-media/`.

Les URLs, chemins personnels, noms de fichiers vidéo, identifiants d’activités,
identifiants de jobs et hashes réels sont volontairement omis ou généralisés
dans ce rapport.

## 3. Inventaire quantitatif anonymisé

| Élément | Quantité observée | Commentaire |
|---|---:|---|
| Activités | 7 | Document `activities.json`; aucune modification |
| Entrées du catalogue historique | 3 | 1 UGA et 2 YouTube contrôlées |
| Assets Library | 15 | Tous déclarés `active` |
| Sources Library | 15 | 1 HLS, 2 YouTube, 12 locales |
| Playables Library | 15 | Même répartition que les sources |
| Fichiers gérés présents | 9 | Vérification locale de présence uniquement |
| `storageKey` référencés | 12 | 3 fichiers référencés absents |
| Dérivés anonymisés | 10 | Identifiables par leur provenance historique |
| Traitements persistants | 0 | Aucun tableau `treatments` dans le fichier réel |
| Dossiers persistants | 0 | Aucun tableau `folders` dans le fichier réel |
| Tags persistants | 0 | Aucun tableau `tags` dans le fichier réel |
| Activités avec `videoRef` | 2 | Références résolubles dans la Library actuelle |
| Activités sans `videoRef` | 5 | Résolues par `activity.video` et le catalogue historique |
| Doublons d’identifiants inter-collections | 0 | Contrôle sur assets/sources/playables |
| Sources orphelines | 0 | `source.assetId` résolu |
| Playables sans asset/source | 0 | Relations résolues |
| Playables dont source et asset divergent | 0 | Cohérence observée |
| `defaultPlayableId` orphelins | 0 | Cohérence observée |
| Projections `sourceIds`/`playableIds` incohérentes | 0 | Cohérence actuelle, malgré leur statut non canonique cible |

### Nullité et formes variantes

Dans la Library réelle, les champs `parentAssetId`, `familyRootAssetId`,
`folderId`, `tagIds`, `derivationTypes` et `technicalMetadata` canoniques sont
absents des assets historiques. Les dérivés disposent à la place de structures
de provenance variables contenant notamment une origine, un job temporaire, des
masques, un filtre et parfois une commande FFmpeg.

Sur les playables, les représentations distantes YouTube n’ont pas de
`storageKey`; le HLS utilise un manifeste/proxy; les playables locaux utilisent
un `storageKey`, une URL interne, un hash et une taille. La durée et les
métadonnées techniques ne sont pas renseignées uniformément.

## 4. Source de vérité, projections, caches et héritage

| Emplacement / mécanisme | Nature actuelle | Preuve et usage |
|---|---|---|
| `data/video-library.json` | Source persistante de la Library actuelle | Chargé par `loadVideoLibrary`; écrit par les parcours Library/import/dérivation |
| `data/video-catalog.json` | Source de compatibilité historique et catalogue contrôlé | Chargé par `loadVideoCatalog`; route GET/POST catalogue; résolution des activités sans `videoRef` |
| `activity.videoRef` | Référence moderne d’une activité | Porte `schemaVersion`, `assetId`, `playableId`; vérifiée par `resolveLibraryPlayable` |
| `activity.video` | Projection de compatibilité et héritage historique | Construite par `activityVideoFromLibrary` ou `activityVideoFromCatalog`; consommée par les vues |
| `assets[].sourceIds` / `assets[].playableIds` | Projection persistée dans le modèle 0.1 | Maintenue par `library-contract.js`; devient non canonique dans le modèle cible |
| `VIDEO_CATALOG` | Cache mémoire immuable du catalogue chargé | `freezeVideoCatalog`; rechargé au démarrage |
| `VIDEO_LIBRARY` | État mémoire chargé depuis la Library | Fusionne actuellement les entrées du catalogue historique au chargement |
| jobs HLS | État temporaire et cache d’exécution | Maps `ACTIVE_HLS_PREPARATIONS` et `ACTIVE_HLS_DERIVATIONS`; workspaces sous le répertoire temporaire système |
| fichiers `.bak` | Sauvegardes de sécurité ou historiques | Ne sont pas lus comme source active par le parcours normal |
| `data/video-library-media/` | Stockage physique géré | Accédé par `safeLibraryMediaPath` et la route média; ne constitue pas une identité logique |
| anciens fichiers `index-*.html` et médias racine | Héritage / artefacts historiques | Non utilisés comme source de vérité par le serveur autonome actuel, sauf références documentaires éventuelles |

Point important : `loadVideoLibrary` peut initialiser ou compléter le document
0.1 à partir du catalogue autorisé. Cette fusion est un comportement de
compatibilité et une écriture potentielle au démarrage; elle ne constitue pas
la migration canonique 1.0.

## 5. Description exacte du schéma historique 0.1

### 5.1 Document Library

La forme réelle est :

```json
{
  "schemaVersion": "0.1",
  "updatedAt": "…",
  "assets": [],
  "sources": [],
  "playables": []
}
```

Il n’y a pas, dans le document réel, de collections persistantes `treatments`,
`folders` ou `tags`.

### 5.2 Asset historique

Forme observée :

- `id`, `title`, `status` (`active`) ;
- `sourceIds`, `playableIds`, `defaultPlayableId` ;
- `provenance`, parfois `metadata`, et `rights` ;
- absence des relations canoniques de famille, dossier et tags.

Les listes d’identifiants sont cohérentes avec les collections actuelles, mais
elles devront devenir des projections recalculées dans la sortie canonique.
`status` ne correspond pas directement au couple cible `lifecycle` et aux états
de disponibilité : la transformation doit être documentée et testée.

### 5.3 Source historique

Forme observée :

- `id`, `assetId`, `title`, `kind`, `provider` ;
- `originUrl`, `manifestUrl`, `proxyUrl`, `url`, `embedUrl`, `videoId` selon le
  fournisseur ;
- `storageKey` pour certaines déclarations locales ;
- `mimeType`, `durationMs`, `availability`, `authorized` ;
- `sha256`, `checksum`, `sizeBytes` lorsque disponibles ;
- `provenance` variable.

La source historique mélange parfois origine, localisation lisible et
projection HTTP. C’est une incompatibilité documentaire avec la séparation
cible `MediaSource` / `Playable.location`.

### 5.4 Playable historique

Forme observée :

- `id`, `assetId`, `sourceId`, `kind`, `provider` ;
- `status` et `availability`, tous deux présents et actuellement `available` ;
- `url`, `manifestUrl`, `originUrl`, `storageKey`, `embedUrl`, `videoId` selon
  le type ;
- `mimeType`, `durationMs`, `sha256`, `sizeBytes`, `fileName` ;
- `provenance` pour les dérivés.

Dans la cible, `Playable.status` doit disparaître. La disponibilité cible porte
`availability` et `availabilityReason`; les informations d’analyse rejoignent
`technicalMetadata` lorsque leur provenance est suffisamment établie.

### 5.5 Catalogue historique

Chaque entrée du catalogue contient en pratique un identifiant, un titre, un
provider, un type de source, une autorisation, une durée éventuelle, une URL ou
un proxy, et pour YouTube un `videoId` et un `embedUrl` contrôlés. Le serveur
valide strictement :

- YouTube par identifiant de 11 caractères ou URL d’intégration contrôlée ;
- HLS par le domaine et les chemins UGA autorisés ;
- absence de fournisseur ou URL non autorisés.

Le catalogue ne couvre pas les copies locales et dérivés de la Library.

### 5.6 Activité et relation vidéo

Les activités portent :

- `video`, projection contenant l’identifiant du playable historique ou Library,
  le provider et les propriétés de lecture ;
- `videoRef` facultatif, de forme actuelle `{ schemaVersion: "0.1", assetId,
  playableId }` ;
- le reste des données pédagogiques : segments, transcription, locuteurs,
  langues, intervalles, phénomènes, couches, annotations et overlays.

Sur les 7 activités observées, 2 ont un `videoRef` résoluble dans la Library et
5 utilisent encore la compatibilité `activity.video` + catalogue historique.
La migration future devra compléter les références sans supprimer la
projection `activity.video`.

### 5.7 Préparations et dérivations

Les préparations HLS et dérivations sont des jobs en mémoire, non des entités
persistées. Le job de préparation contient notamment asset/playable/source,
état, progression, journal, masques et métadonnées de source. Le job de
dérivation contient la préparation, les masques ou étapes, le profil de flou,
les commandes FFmpeg, la progression, les erreurs et le résultat temporaire.

Après succès, `persistDerivedPlayable` publie un asset, une source et un
playable local, ainsi qu’un fichier géré. La provenance historique conserve une
partie des paramètres, mais ne fournit pas toujours une famille canonique, un
parent direct ou une date d’exécution complète.

## 6. Matrice de correspondance 0.1 → canonique

Statuts : `direct`, `normalized`, `derived`, `defaulted`, `split`, `merged`,
`unavailable`, `ambiguous`, `invalid`, `obsolete`, `deferred`.

| Origine historique | Cible | Transformation future | Cardinalité | Statut | Diagnostic si impossible |
|---|---|---|---|---|---|
| document `schemaVersion` | `MediaLibrary.schemaVersion` | reconnaître exactement `0.1`, produire la version cible choisie | 1→1 | normalized | `SOURCE_SCHEMA_UNKNOWN` |
| `updatedAt` | document `updatedAt` | conserver une date valide; sinon dater la migration seulement si autorisé | 1→1 | normalized / defaulted | `SOURCE_DATE_INVALID` |
| `assets[].id` | `MediaAsset.id` | préserver seulement si son unicité et son format sont acceptés; sinon ID déterministe futur | 1→1 | direct / deferred | `ASSET_ID_INVALID` |
| `assets[].title` | `MediaAsset.title` | recopier; refuser vide ou ambigu | 1→1 | direct | `ASSET_TITLE_MISSING` |
| `assets[].status` | `MediaAsset.lifecycle` et disponibilités | mapper `active`; ne pas inventer `archived` à partir d’un autre signal | 1→1 | normalized / ambiguous | `ASSET_STATUS_UNMAPPED` |
| `assets[].sourceIds` | `MediaSource.assetId` | ignorer la liste persistée comme vérité; reconstruire par source | 1→n | derived / obsolete | `SOURCE_RELATION_AMBIGUOUS` |
| `assets[].playableIds` | `Playable.assetId` | ignorer la liste persistée comme vérité; reconstruire par playable | 1→n | derived / obsolete | `PLAYABLE_RELATION_AMBIGUOUS` |
| `assets[].defaultPlayableId` | `MediaAsset.defaultPlayableId` | conserver si le playable appartient à l’asset et reste admissible | 1→1 | direct | `DEFAULT_PLAYABLE_INVALID` |
| `assets[].provenance` | `MediaAsset.provenance` | normaliser `kind`, origine, dates, hash et méthode | 1→1 | normalized / split | `PROVENANCE_INCOMPLETE` |
| `assets[].metadata` | `MediaAsset.technicalMetadata` ou playable | répartir selon le niveau réellement prouvé | 1→1 | split / ambiguous | `METADATA_SCOPE_AMBIGUOUS` |
| `assets[].rights` | `MediaAsset.rights` | recopier l’objet sans créer de droit absent | 1→1 | direct | `RIGHTS_INVALID` |
| `sources[].id` | `MediaSource.id` | préserver ou générer selon la décision d’identifiants | 1→1 | direct / deferred | `SOURCE_ID_INVALID` |
| `sources[].assetId` | `MediaSource.assetId` | valider l’asset propriétaire | 1→1 | direct | `SOURCE_ASSET_NOT_FOUND` |
| `sources[].kind` | `MediaSource.kind` | mapper HLS, YouTube, local et dérivé vers les enums cibles | 1→1 | normalized | `SOURCE_KIND_UNMAPPED` |
| `sources[].provider` | `MediaSource.provider` | conserver les providers contrôlés; qualifier les valeurs historiques | 1→1 | normalized | `SOURCE_PROVIDER_UNKNOWN` |
| `originUrl` / `sourceUrl` | `MediaSource.origin` | conserver l’origine distante sans la confondre avec le playable | 0..1→0..1 | normalized | `SOURCE_ORIGIN_INVALID` |
| `manifestUrl` / `proxyUrl` | `MediaSource.origin` ou métadonnée de validation | garder l’origine et transférer le proxy lisible au playable | 0..1→0..1 | split | `HLS_ORIGIN_AMBIGUOUS` |
| `embedUrl` / `videoId` | `MediaSource.origin` | conserver l’identifiant et l’embed contrôlé | 0..1→0..1 | normalized | `YOUTUBE_REFERENCE_INVALID` |
| `sources[].storageKey` | `Playable.location.storageKey` | déplacer la représentation gérée au playable; ne pas garder une seconde copie fonctionnelle | 0..1→0..1 | split | `STORAGE_KEY_UNSAFE` |
| `mimeType`, `durationMs` | `Playable.technicalMetadata` | recopier seulement si le niveau de preuve est connu | 0..1→0..1 | normalized / unavailable | `TECHNICAL_METADATA_INVALID` |
| `sha256`, `checksum`, `sizeBytes` | `Playable.technicalMetadata` / provenance | normaliser hash et taille, signaler conflit | 0..1→0..1 | merged / normalized | `HASH_CONFLICT` |
| `sources[].availability` | `Playable.availability` | séparer disponibilité déclarée et vérification physique | 1→1 | normalized / ambiguous | `AVAILABILITY_UNMAPPED` |
| `sources[].authorized` | validation d’import ou droits | ne pas transformer automatiquement l’autorisation en droit cible | 1→1 | ambiguous | `AUTHORIZATION_UNMAPPED` |
| `playables[].id` | `Playable.id` | préserver si stable; sinon stratégie déterministe à décider | 1→1 | direct / deferred | `PLAYABLE_ID_INVALID` |
| `playables[].assetId` | `Playable.assetId` | valider l’appartenance | 1→1 | direct | `PLAYABLE_ASSET_NOT_FOUND` |
| `playables[].sourceId` | `Playable.sourceId` | valider la source et son asset | 1→1 | direct | `PLAYABLE_SOURCE_NOT_FOUND` / `PLAYABLE_SOURCE_ASSET_MISMATCH` |
| `playables[].kind` / provider | `Playable.kind` | normaliser selon la représentation effectivement lue | 1→1 | normalized | `PLAYABLE_KIND_UNMAPPED` |
| `playables[].status` | aucun champ cible | ne pas migrer; analyser la disponibilité réelle séparément | 1→0 | obsolete | `PLAYABLE_STATUS_OBSOLETE` |
| `playables[].availability` | `Playable.availability` | normaliser, puis marquer missing-local si la copie est absente | 1→1 | normalized | `AVAILABILITY_UNMAPPED` |
| playable `url` / `manifestUrl` / `embedUrl` | `Playable.location` | choisir URL, manifest ou embed selon kind | 0..1→0..1 | split / normalized | `PLAYABLE_LOCATION_INCOHERENT` |
| playable `storageKey` | `Playable.location.storageKey` | conserver une clé relative sûre uniquement | 0..1→0..1 | direct / normalized | `STORAGE_KEY_UNSAFE` |
| playable `originUrl` | `MediaSource.origin` | déplacer l’origine au niveau source | 0..1→0..1 | split | `SOURCE_ORIGIN_INVALID` |
| playable metadata | `Playable.technicalMetadata` | réunir les valeurs non contradictoires | 0..1→0..1 | merged / unavailable | `TECHNICAL_METADATA_CONFLICT` |
| playable provenance | `Playable.provenance` | conserver copie/import/dérivation dans le scope représentation | 0..1→0..1 | normalized | `PROVENANCE_INCOMPLETE` |
| `provenance.sourceAssetId` des dérivés | `MediaAsset.parentAssetId` | direct seulement si l’origine et le parent immédiat sont prouvés | 1→1 | direct / ambiguous | `FAMILY_PARENT_UNPROVABLE` |
| provenance `kind=derived-anonymized` / method | `MediaAsset.derivationTypes` | mettre `anonymization` seulement pour la propre dérivation de l’asset | 1→1 | normalized | `DERIVATION_TYPE_UNPROVABLE` |
| provenance job de préparation | `MediaTreatment` | créer un traitement seulement si l’exécution et son statut sont prouvés | 1→0..1 | unavailable / ambiguous | `TREATMENT_HISTORY_ABSENT` |
| provenance masques/étapes/FFmpeg | `MediaTreatment.parameters` et outputs | conserver comme paramètres si leur statut et leur source sont reliés | 0..1→0..1 | split / ambiguous | `TREATMENT_PARAMETERS_INCOMPLETE` |
| fichier géré présent | `Playable.location` + disponibilité | conserver la clé, hash et taille | 1→1 | direct | `LOCAL_FILE_UNREADABLE` |
| fichier référencé absent | playable `missing-local` | conserver l’asset et déclarer `availabilityReason=missing-file` | 1→1 | normalized / unavailable | `LOCAL_FILE_MISSING` |
| activité `videoRef` | future référence d’activité | conserver asset/playable et changer de version seulement selon contrat de transition | 1→1 | normalized / deferred | `ACTIVITY_VIDEO_REF_UNRESOLVED` |
| activité `video.id` | projection `activity.video` | conserver pendant la transition, ne pas en faire la relation canonique cible | 1→1 | direct / obsolete à terme | `ACTIVITY_VIDEO_UNRESOLVED` |
| catalogue historique | sources/assets/playables correspondant | migrer les entrées autorisées sans supprimer le catalogue pendant la transition | 1→n | split / deferred | `CATALOG_ENTRY_UNMAPPABLE` |
| jobs en mémoire | `MediaTreatment` | ne pas fabriquer un historique absent; ne migrer que les traitements persistés prouvés | n→0 | unavailable | `TREATMENT_HISTORY_ABSENT` |
| sauvegardes `.bak` | aucune entité canonique directe | conserver comme sauvegarde hors source active; comparer uniquement lors de la future procédure | n→0 | obsolete / deferred | `BACKUP_NOT_SOURCE` |
| fichiers média physiques | `Playable.location` | ne jamais déduire une identité uniquement du nom de fichier | n→1 | derived / ambiguous | `ORPHAN_MEDIA_FILE` |
| catégories visuelles de Library | collections calculées | ne pas créer de dossiers/tags à partir de filtres d’interface | n→0 | obsolete | `HISTORICAL_CATEGORY_NOT_CONTRACTUAL` |

Les lignes `ambiguous`, `invalid` et `deferred` ne sont pas résolues dans ce
rapport. Elles constituent des arrêts ou demandes de décision pour le futur
migrateur.

## 7. Séparation asset / source / playable

La décomposition proposée pour chaque entrée historique est la suivante :

- `MediaAsset` porte le titre, l’identité logique, le cycle de vie, les droits,
  le lignage et la provenance générale ;
- `MediaSource` porte l’origine : catalogue UGA, déclaration YouTube contrôlée,
  fichier local importé, URL distante ou origine de dérivation ;
- `Playable` porte une représentation lisible et sa localisation effective ;
- `Playable.location.storageKey` porte le fichier géré ;
- une copie locale d’une source distante conserve l’asset et la source distante,
  puis ajoute un playable local au même asset ;
- un import local sans origine distante conserve le nom et la provenance dans
  la source, et le fichier géré uniquement dans la location du playable ;
- plusieurs playables d’un asset sont distingués par `Playable.id` et
  `sourceId`, jamais par une liste persistée d’IDs dans l’asset ;
- `defaultPlayableId` reste nul si aucune représentation admissible n’est
  disponible ;
- une représentation locale absente reste dans la Library et devient
  `missing-local` avec `missing-file`, sans recréation ni téléchargement.

La future transformation doit reconstruire les relations depuis
`source.assetId`, `playable.assetId` et `playable.sourceId`. Les anciennes listes
`sourceIds` et `playableIds` ne doivent pas être recopiées comme relations
canoniques.

## 8. Identifiants et déterminisme

### Constat historique

Les identifiants actuels sont des chaînes préfixées, parfois dérivées de l’ID
du catalogue, parfois d’un hash de fichier, parfois générées avec un timestamp
pour les jobs. Ils ne forment pas tous le même espace sémantique. Les jobs sont
explicitement temporaires et ne peuvent pas devenir des identifiants persistants
sans règle supplémentaire.

### Stratégies possibles

| Stratégie | Avantages | Risques |
|---|---|---|
| Préserver les IDs historiques avec namespace | Traçabilité et migration simple | IDs hétérogènes, collisions sémantiques et dépendance au passé |
| Empreinte déterministe d’un tuple normalisé | Reproductible, indépendant de l’ordre des tableaux, collision faible | Tout changement de normalisation change l’ID; provenance de l’ancien ID à conserver |
| UUID aléatoire à la migration | Simple techniquement | Non déterministe, impossible à comparer entre deux migrations à blanc |
| Identifiant séquentiel par ordre de lecture | Lisible | Dépend de l’ordre, interdit par le contrat de déterminisme |

Recommandation à soumettre à David : utiliser un identifiant déterministe
préfixé par type, calculé à partir d’une représentation canonique de l’entrée
historique et de sa relation normalisée, tout en conservant l’ancien ID dans la
provenance. Cette recommandation n’est pas une décision acquise : le choix du
tuple canonique, du format d’empreinte et de la politique de collision doit être
validé avant implémentation.

La stratégie devra être appliquée séparément à `MediaAsset`, `MediaSource`,
`Playable`, `MediaTreatment`, `MediaFolder`, `MediaTag` et aux associations,
avec des espaces préfixés distincts. Aucun identifiant réel n’a été généré ici.

## 9. Familles, provenance et dérivation

Les dérivés historiques indiquent une origine et un job de préparation dans leur
provenance. Cela permet de proposer un parent uniquement lorsque la provenance
identifie sans ambiguïté l’asset immédiatement précédent. Elle ne permet pas de
déduire automatiquement une famille complète pour tous les cas.

La migration ne doit pas qualifier un asset d’« anonymisé » par simple héritage.
Un asset pourra recevoir `derivationTypes: ["anonymization"]` seulement si sa
propre provenance de dérivation normalisée le justifie. Un ancêtre anonymisé ne
suffit pas.

Les masques fixes, les étapes temporelles, le profil de flou, le filtre et la
version FFmpeg sont des paramètres historiques de dérivation. Ils pourront
alimenter `MediaTreatment.parameters`, mais seuls les traitements réellement
prouvés doivent être persistés. Un job en mémoire disparu après redémarrage ne
doit pas être recréé rétrospectivement.

## 10. Disponibilité et fichiers manquants

Les 12 `storageKey` observés correspondent à 9 fichiers présents et 3 absents.
Le document 0.1 les déclare pourtant tous `available`. La future migration doit
conserver les trois assets et playables, mais traduire les représentations
physiques absentes en :

```text
Playable.availability = "missing-local"
Playable.availabilityReason = "missing-file"
Playable.location.storageKey = la clé relative conservée
```

Cette conversion est déclarative : elle ne restaure pas le fichier, ne le
télécharge pas, ne le remplace pas et ne supprime pas l’asset. La réconciliation
physique devra être une mission séparée, avec droits, provenance et procédure de
restauration explicites.

Pour les sources distantes, la disponibilité du playable ne doit pas être
confondue avec l’autorisation de la source ou avec une observation réseau faite
pendant la migration.

## 11. Métadonnées techniques

| Métadonnée | Présence historique | Transformation proposée |
|---|---|---|
| Durée | partielle; parfois nulle | directe si prouvée, sinon inconnue |
| Largeur / hauteur | non uniforme | unavailable sans analyse physique |
| Cadence | non uniforme | unavailable sans analyse physique |
| Codecs | principalement dans provenance/FFmpeg de certains dérivés | ne pas confondre codec de sortie et codec d’origine |
| Audio | implicite dans certaines commandes | unavailable si non mesuré |
| MIME | présent sur plusieurs entrées | normalisé vers playable/source selon la preuve |
| Taille | présente sur fichiers gérés | directe si cohérente avec la copie |
| Hash | présent sur plusieurs fichiers | directe après contrôle de forme; conflit bloquant |
| Date d’analyse | absente ou incluse dans provenance | unavailable si non explicitement stockée |
| Outil/version | présent surtout pour dérivés FFmpeg | provenance ou traitement, pas analyse technique automatique |
| `technicalMetadata.status` | non défini uniformément | conserver une chaîne si réellement présente; ne pas inventer d’enum |
| erreur d’analyse | non structurée uniformément | diagnostic source si preuve, sinon inconnue |

Aucun outil d’analyse n’a été lancé. Le validateur 099 ne fixe pas de liste
exhaustive pour `technicalMetadata.status`; le futur migrateur doit donc
contrôler la structure sans inventer de valeurs canoniques.

## 12. Traitements et préparations historiques

Les jobs de préparation et de dérivation sont aujourd’hui des objets en mémoire.
Ils ont des états d’exécution, des journaux et des workspaces temporaires, mais
aucun registre durable dans la Library. Les dérivés publiés conservent une trace
partielle dans leur provenance.

| Élément historique | `MediaTreatment` futur | Décision d’audit |
|---|---|---|
| job terminé encore documenté par la provenance | traitement possible | `ambiguous` : vérifier l’exhaustivité des dates, sources et sorties |
| job en mémoire sans historique durable | traitement | ne pas fabriquer rétrospectivement |
| préparation `work.mp4` temporaire | traitement ou workspace | le workspace reste temporaire; seule une préparation explicitement persistée peut être migrée |
| dérivé avec output publié | traitement completed possible | exige source asset/playable cohérent et output asset/playable cohérent |
| échec/cancellation ancien sans sortie | traitement failed/cancelled possible | seulement si l’état est persisté; sinon `unavailable` |
| traitement interrompu par redémarrage | interrupted | aucune preuve historique générale; décision nécessaire |

Un traitement `completed` doit relier une source et une sortie de la même
opération. Un traitement `failed`, `cancelled` ou `interrupted` ne doit pas
recevoir de faux output.

## 13. Dossiers, tags et collections

Aucun dossier, tag ou association asset-tag n’a été trouvé dans la Library
réelle. Les regroupements de l’interface sont des filtres calculés par kind,
provider, statut ou présence d’un playable.

Il ne faut pas transformer automatiquement :

- un provider en tag ;
- un titre en tag ;
- un chemin de stockage en dossier ;
- une catégorie d’interface en dossier persistant.

Les collections suivantes doivent rester calculées :

- Toutes les vidéos ;
- Originales ;
- Anonymisées ;
- En cours de traitement ;
- En erreur ;
- Non classées.

« Anonymisées » signifie que la propre dérivation normalisée de l’asset contient
`anonymization` dans `derivationTypes`; un ancêtre anonymisé ne suffit pas.

## 14. Relations avec les activités

Les vues et routes consommatrices sont :

- étudiant et prévisualisation : reçoivent `activity.video` et la source
  résolue dans la réponse d’activité ;
- atelier guidé : utilise `activity.videoSource` lorsqu’il est résolu, puis le
  lecteur HLS/local ou YouTube via l’adaptateur partagé ;
- auteur et édition : chargent encore le catalogue historique pour certaines
  listes et conservent `activity.video` ;
- Library `teacher-videos.html` : lit les assets détaillés depuis
  `/api/proto05/library/assets` et associe un asset/playable via
  `/api/proto05/activities/:id/video-ref` ;
- création : sélectionne un playable depuis la Library puis POST une activité
  avec `videoRef` ;
- résolution : `/api/proto05/activities/:id/video-resolution` expose le
  `videoRef` et le descripteur lisible.

La migration future devra utiliser une relation d’activité vers un asset et un
playable explicitement sélectionnés. `activity.video` sera conservée comme
projection de transition. Les cinq activités historiques sans `videoRef` ne
doivent pas être modifiées lors de cet audit; leur migration devra préserver
strictement toutes les propriétés vidéo actuelles.

## 15. Compatibilité des versions

### Reconnaissance

- `schemaVersion: "0.1"` avec les collections `assets`, `sources` et
  `playables` et les formes historiques identifiées est le format historique
  attendu ;
- un document répondant déjà au schéma canonique majeur doit être validé par le
  module 099 et ne doit pas être remigré ;
- tout autre format doit être refusé comme source inconnue.

### Passage prévu

La mission suivante devra lire le 0.1, produire une structure canonique distincte
en mémoire, construire un rapport de correspondance, puis appeler
`validateMediaLibrary` sur la sortie. La source 0.1 restera inchangée jusqu’à
une décision explicite d’écriture.

Une version mineure future lisible mais non `writeEligible` ne doit pas être
réécrite tant que les champs inconnus ne peuvent pas être conservés sans perte.
Cette règle du validateur 099 interdit une double migration silencieuse et
protège les extensions futures.

## 16. Classification des anomalies futures

Les codes suivants sont proposés pour le migrateur; ils ne modifient pas les
codes du validateur 099.

| Anomalie | Code proposé | Niveau | Bloquant | Poursuite des autres entrées |
|---|---|---|---|---|
| Information inconnue autorisée | `SOURCE_FIELD_UNKNOWN` | information | non | oui |
| Représentation indisponible correctement décrite | `LOCAL_FILE_MISSING` | indisponibilité | non | oui |
| Avertissement de normalisation | `SOURCE_NORMALIZED` | avertissement | non | oui |
| Source ambiguë | `SOURCE_AMBIGUOUS` | ambiguïté | décision | oui, entrée isolée |
| Référence source orpheline | `SOURCE_REFERENCE_ORPHAN` | erreur source | oui pour l’entrée | oui |
| Sortie canonique incompatible | `CANONICAL_OUTPUT_INVALID` | erreur contrat | oui pour la sortie | non sans correction |
| Famille non reconstructible | `FAMILY_PARENT_UNPROVABLE` | ambiguïté | décision | oui, entrée isolée |
| Traitement absent mais dérivé présent | `TREATMENT_HISTORY_ABSENT` | avertissement / décision | non ou décision | oui |
| Situation réconciliable ultérieurement | `RECONCILIABLE_STORAGE` | réconciliable | non | oui |

Chaque diagnostic futur devra porter un chemin source précis, une entité
anonymisée, un niveau et une indication séparée entre anomalie de la source et
invalidité de la sortie canonique. Un avertissement ne doit pas être confondu
avec une indisponibilité; une indisponibilité ne doit pas être transformée en
erreur structurelle; une réconciliation ne doit pas muter la source.

## 17. Protocole de migration à blanc proposé

Ce protocole est spécifié mais n’a pas été exécuté :

1. lire explicitement le fichier 0.1 autorisé ;
2. réaliser une copie en mémoire et calculer une empreinte de non-mutation ;
3. détecter le format 0.1 et refuser tout format inconnu ;
4. transformer par fonctions pures, sans réseau ni filesystem média ;
5. générer les identifiants selon la stratégie approuvée ;
6. produire un document canonique distinct, sans toucher aux fichiers réels ;
7. valider la sortie avec le validateur 099 ;
8. produire une correspondance entrée par entrée et les diagnostics ;
9. exécuter deux fois la transformation sur la même entrée et comparer les sorties ;
10. comparer la source avant/après pour prouver l’absence de mutation ;
11. vérifier que les fichiers absents deviennent `missing-local` sans création ;
12. vérifier que les listes d’IDs historiques deviennent des projections, non des relations persistées ;
13. isoler toute sortie éventuelle dans un répertoire temporaire explicitement autorisé ;
14. supprimer ou conserver les artefacts temporaires selon la mission dédiée ;
15. ne brancher aucune vue ni route avant validation humaine.

Garde-fous :

- audit = lecture et rapport ;
- migration en mémoire = transformation sans écriture ;
- migration à blanc = sortie isolée et réversible ;
- migration réelle = mission ultérieure avec sauvegarde et approbation ;
- branchement fonctionnel = mission distincte après validation du contrat.

## 18. Décisions nécessaires avant implémentation

### 18.1 Identifiants

Faut-il préserver les IDs historiques avec namespace ou recalculer une empreinte
canonique? La première option maximise la traçabilité; la seconde garantit un
déterminisme indépendant des formes historiques. Recommandation : empreinte
canonique préfixée, avec ancien ID conservé en provenance, sous réserve de
validation.

### 18.2 Famille des dérivés

Quand une provenance indique une source d’origine mais pas le parent immédiat,
faut-il classer l’entrée comme racine provisoire, la bloquer, ou demander une
décision? Recommandation : bloquer la normalisation de famille de cette entrée
avec `FAMILY_PARENT_UNPROVABLE`; ne pas inventer un parent.

### 18.3 Treatments historiques

Faut-il créer un `MediaTreatment` pour chaque dérivé publié malgré l’absence de
registre de job durable, ou seulement pour les traitements dont la provenance
contient une preuve complète? Recommandation : ne migrer que les traitements
prouvés et signaler les autres comme historique incomplet.

### 18.4 Fichiers absents

Faut-il migrer immédiatement les trois playables en `missing-local`, ou laisser
la migration bloquante jusqu’à une réconciliation physique? Recommandation :
les conserver en `missing-local` avec `missing-file`, sans restaurer ni supprimer.

### 18.5 `activity.video`

Faut-il générer un `videoRef` pour les cinq activités historiques pendant une
étape de transition ou attendre une validation par activité? Recommandation :
générer sur copie de migration, vérifier chaque projection `activity.video`, puis
ne rien écrire dans les activités sans validation de la table de correspondance.

### 18.6 `technicalMetadata.status`

Le contrat 098/099 ne fixe pas d’enum exhaustive. Il faut décider plus tard si
les valeurs d’analyse restent des chaînes libres ou reçoivent une liste
contractuelle. Aucun enum n’est inventé ici.

### 18.7 Source distante et copies locales

Les entrées historiques créées comme nouveaux assets par la copie distante ne
correspondent pas exactement à la cible, qui veut conserver le même asset et
ajouter un playable local. Il faut décider si les entrées existantes sont
regroupées par preuve de même origine ou conservées séparées pour éviter une
fusion hasardeuse. Recommandation : ne fusionner que sur une preuve explicite
URL/hash/provenance; sinon classer `ambiguous`.

## 19. Fichiers créés ou modifiés

Créé :

- `reports/100_proto05_media_library_migration_audit.md`.

Modifié : aucun fichier de code, donnée, route, configuration, contrat,
`MEDIA_LIBRARY_MODEL.md`, `ROADMAP.md` ou version applicative.

## 20. Contrôles et absence de mutation

Contrôles exécutés :

- vérification de la branche, du commit 099 et de l’état Git initial ;
- lecture statique des contrats, routes, résolveurs, vues et tests ;
- inventaire JSON agrégé en lecture seule ;
- vérification locale de présence des `storageKey` référencés, sans analyse de
  contenu média ;
- contrôle de collision et de références orphelines en mémoire uniquement ;
- vérification que le rapport 100 n’existait pas avant création.

Contrôles volontairement non exécutés :

- migration, même en mémoire selon la définition du prompt ;
- writer, serveur, HTTP, navigateur, Chromium ;
- suite fonctionnelle, `npm run check`, build ;
- téléchargement distant, scan réseau, FFmpeg, ffprobe ;
- écriture dans `activities.json`, `video-catalog.json`, `video-library.json`
  ou le dossier média.

La source Git était propre avant l’écriture documentaire. Aucune donnée réelle
n’a été modifiée par l’audit; seul le présent rapport est nouveau.

## 21. Version et état Git final

Version inchangée : **0.1.31**.

L’état Git final doit contenir uniquement le présent rapport comme changement de
la mission 100. Aucun commit ni push n’a été effectué.

Suite proposée : faire valider les décisions ouvertes, puis implémenter un
transformateur pur séparé avec fixtures anonymisées avant toute écriture réelle.

Message de commit proposé, non exécuté :
`docs(proto05): audit legacy media library migration`
