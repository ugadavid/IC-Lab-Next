# Modèle canonique de la vidéothèque Proto05

Statut : spécification documentaire cible, mission 098.

Ce document fixe le modèle fonctionnel de la Library vidéo de Proto05. Il ne
constitue pas encore une migration ni une implémentation. Proto05 reste
autonome et `data/video-library.json` reste le futur document canonique unique.

## 1. Principes

- `MediaAsset`, `MediaSource` et `Playable` restent trois entités distinctes.
- Un asset représente l’identité logique et classable d’un média.
- Une source décrit une origine ou une représentation technique déclarée.
- Un playable décrit une représentation effectivement lisible.
- Les relations sont portées par des identifiants stables, jamais par un nom de
  fichier ou un chemin absolu.
- Les collections automatiques sont calculées, jamais stockées comme listes de
  membres.
- Un traitement est persistant ; son workspace d’exécution reste temporaire.
- L’archivage est l’opération utilisateur normale. La suppression physique est
  une opération protégée et distincte.

## 2. Entités et cardinalités

### 2.1 `MediaAsset`

Un asset est une identité logique visible dans la vidéothèque.

Champs minimaux :

| Champ | Type | Nullabilité / valeurs | Rôle |
|---|---|---|---|
| `id` | string | obligatoire, stable | Identité logique. Conservé lors d’une copie locale ou d’une nouvelle représentation. |
| `title` | string | obligatoire | Titre affiché et classable. |
| `lifecycle` | enum | `active` / `archived`, défaut `active` | Cycle de vie logique. |
| `folderId` | string | nullable | Dossier principal ; `null` signifie non classé. |
| `defaultPlayableId` | string | nullable | Au plus un playable par défaut ; peut être nul si aucun playable disponible. |
| `parentAssetId` | string | nullable | Asset parent immédiat ; nul pour la racine. |
| `familyRootAssetId` | string | obligatoire | Racine stable de la famille. Pour une racine, égal à `id`. |
| `derivationTypes` | enum[] | zéro ou plus | Types de dérivation normalisés, notamment `anonymization`. |
| `tagIds` | string[] | zéro ou plus | Associations vers les tags. |
| `provenance` | object | obligatoire | Création, origine et lignage normalisés. |
| `technicalMetadata` | object | partiellement connu | Métadonnées logiques ou agrégées. |
| `rights` | object | par défaut `{}` | Informations de droits disponibles. |
| `createdAt`, `updatedAt` | ISO string | obligatoires | Dates du modèle. |

Les listes `sourceIds` et `playableIds`, lorsqu’elles sont exposées dans une
projection ou un index, sont recalculées en filtrant respectivement
`MediaSource.assetId` et `Playable.assetId`. Elles ne sont pas des relations
persistées obligatoires et ne constituent jamais une seconde source de vérité.

Un asset peut exister sans playable disponible. Un asset manquant n’est donc
pas supprimé ni rendu structurellement invalide.

### 2.2 `MediaSource`

Une source peut être une origine distante, une déclaration locale, une
représentation HLS, YouTube ou une origine technique de dérivation.

Champs minimaux :

| Champ | Type | Rôle |
|---|---|---|
| `id` | string | Identité stable de la source. |
| `assetId` | string | Asset propriétaire. |
| `kind` | enum | `local-file`, `direct-url`, `hls`, `youtube-embed`, `derived-output`. |
| `provider` | string | `local`, `direct`, `uga`, `youtube`, `proto05-derived`, ou fournisseur explicitement validé. |
| `origin` | object | URL, identifiant vidéo, nom d’origine et provenance déclarée. |
| `transport` | enum | `file`, `http`, `https`, `hls`, `youtube-iframe`. |
| `mimeType` | string | nullable si inconnu. |
| `createdAt` | ISO string | Date de déclaration/import. |
| `provenance` | object | Informations historiques non fonctionnelles. |

`MediaSource` décrit l’origine. `Playable.location` décrit la représentation
lisible. Une source ne doit pas être confondue avec une copie locale : la
source distante reste conservée lorsqu’une copie locale supplémentaire est
créée.

### 2.3 `Playable`

Un playable est la représentation demandée au lecteur.

Champs minimaux :

| Champ | Type | Rôle |
|---|---|---|
| `id` | string | Identité stable de la représentation. |
| `assetId` | string | Asset unique propriétaire. |
| `sourceId` | string | Source à l’origine de cette représentation. |
| `kind` | enum | `local-file`, `direct-url`, `hls`, `youtube-embed`. |
| `availability` | enum | Disponibilité lisible courante ; seule notion d’état du playable. |
| `availabilityReason` | string nullable | Code technique expliquant l’indisponibilité ; `null` lorsqu’aucune raison particulière ne s’applique, avec au minimum `missing-file` pour `missing-local`. |
| `location` | object | URL, manifeste, embed ou `storageKey`, selon le kind. Le fichier géré est toujours localisé ici. |
| `technicalMetadata` | object | Durée, dimensions, cadence, codecs, MIME, taille, hash. |
| `createdAt`, `updatedAt` | ISO string | Dates de la représentation. |
| `provenance` | object | Copie, dérivation ou analyse ayant produit le playable. |

Cardinalités cibles :

- un asset possède une ou plusieurs sources ;
- un asset possède zéro, un ou plusieurs playables ;
- une source peut produire plusieurs playables ;
- un playable appartient à un seul asset et référence une seule source ;
- un asset possède au plus un playable par défaut.

## 3. Sources, copies et transport

L’identité logique, l’origine, le transport et la représentation sont séparés.

### Source distante et copie locale

Une URL directe ou un flux distant copié localement ne crée pas un nouvel
original logique. La copie devient un playable local supplémentaire du même
asset ; la source distante reste associée au même asset et conserve son URL,
ses redirections et sa provenance.

Un changement de playable par défaut ne change donc jamais `asset.id`. Pour une
copie locale gérée, le `storageKey` fonctionnel appartient à
`Playable.location`, jamais à `MediaSource`.

Pour un import local, `MediaSource.origin` et sa provenance conservent le nom
original et les informations d’origine. Le fichier copié et lisible est
référencé uniquement par `Playable.location.storageKey`.

### HLS UGA

La source HLS contient l’URL UGA autorisée et ses paramètres de validation. Le
playable HLS contient le manifeste/proxy effectivement utilisé. Le proxy reste
la seule voie de lecture Proto05 pour cette source.

### YouTube

La source et le playable YouTube ne contiennent qu’un identifiant vidéo valide
et une URL `youtube.com/embed/...` contrôlée. Le lecteur officiel IFrame API est
le seul mécanisme autorisé. Aucun flux YouTube direct n’est introduit dans ce
modèle.

## 4. Familles et lignage

Une famille regroupe une racine et tous ses descendants via les champs de
lignage de chaque asset :

```text
parentAssetId = null
familyRootAssetId = asset.id
        │
        ├── dérivé A : parentAssetId = racine
        │       familyRootAssetId = racine
        └── dérivé B : parentAssetId = dérivé A
                familyRootAssetId = racine
```

Invariants :

- un asset appartient à une seule famille ;
- une racine a `parentAssetId = null` et `familyRootAssetId = id` ;
- un dérivé a un parent immédiat existant ;
- `familyRootAssetId` pointe vers une racine existante ;
- aucun asset n’est son propre parent ou ancêtre ;
- aucun cycle n’est autorisé ;
- la relation inverse enfants/descendants est calculée par parcours des
  `parentAssetId`, pas stockée en double.

Un asset est **Original** si `parentAssetId === null`, quel que soit le type de
son playable. Un asset est **Anonymisé** lorsque sa propre dérivation normalisée
contient `anonymization` dans `derivationTypes`. Le seul fait d’avoir un
ancêtre anonymisé ne suffit pas ; la famille et les ancêtres restent
consultables séparément.

## 5. Provenance et dérivation

La provenance normalisée peut contenir :

```json
{
  "creationType": "catalog-migration | local-import | remote-copy | derivation",
  "createdAt": "…",
  "provider": "uga | youtube | local | direct | proto05-derived",
  "originalFileName": null,
  "originUrl": null,
  "originReference": null,
  "sha256": null,
  "sizeBytes": null,
  "parentAssetId": null,
  "familyRootAssetId": "asset-example",
  "treatmentId": null,
  "method": null,
  "parameters": {},
  "engine": "proto05",
  "engineVersion": "0.1.31",
  "ffmpegVersion": null,
  "historical": {}
}
```

Les anciens chemins absolus peuvent rester dans `historical`, mais ne sont ni
identifiants ni prérequis de lecture. Les relations fonctionnelles utilisent
les IDs et les `storageKey` relatifs sûrs.

## 6. Cycle de vie et disponibilité

### Asset

```text
active ──archiver──> archived
archived ──restaurer──> active
```

L’archivage masque l’asset des collections ordinaires mais conserve son
identité, sa provenance, ses familles et ses références.

### Playable

Codes normalisés :

- `available` : représentation vérifiée et lisible ;
- `missing-local` : `Playable.location.storageKey` géré mais fichier absent ;
- `unreachable-remote` : source distante temporairement inaccessible ;
- `blocked` : lecture interdite par validation, droits ou politique ;
- `pending` : représentation déclarée ou en attente de préparation ;
- `unknown` : disponibilité non encore vérifiée.

Les trois dérivés absents du schéma 0.1 sont migrés en conservant asset, source,
playable, famille et provenance, mais avec `availability: "missing-local"` et
`availabilityReason: "missing-file"`. Aucun fichier n’est restauré, recréé,
téléchargé ou supprimé. Si le fichier revient plus tard à son `storageKey`, le
playable peut redevenir `available` sans changer son identité.

## 7. `MediaTreatment` persistant

Un traitement durable est séparé de son workspace temporaire.

```json
{
  "id": "treatment-example",
  "type": "anonymization",
  "sourceAssetId": "asset-example",
  "sourcePlayableId": "playable-example",
  "sourcePreparationId": null,
  "outputAssetId": null,
  "outputPlayableId": null,
  "status": "queued",
  "progress": 0,
  "createdAt": "…",
  "startedAt": null,
  "finishedAt": null,
  "error": null,
  "parameters": {},
  "engine": "proto05",
  "engineVersion": "0.1.31",
  "ffmpegVersion": null,
  "runtimeJobId": null,
  "diagnostics": {}
}
```

États autorisés : `queued`, `running`, `cancelling`, `completed`, `failed`,
`cancelled`, `interrupted`.

L’asset de sortie n’est créé et publié qu’après validation complète du fichier
final. Un échec ne produit jamais un faux média lisible. Au redémarrage, tout
traitement `queued`, `running` ou `cancelling` sans processus correspondant
devient `interrupted`, avec ses diagnostics conservés. Aucune reprise
automatique n’est requise dans cette phase.

## 8. Dossiers et tags

### Dossiers

Les dossiers sont virtuels et propres à Proto05 :

```json
{
  "id": "folder-example",
  "name": "Corpus",
  "parentFolderId": null,
  "sortOrder": 0,
  "createdAt": "…",
  "updatedAt": "…"
}
```

Un asset appartient à zéro ou un dossier principal. `folderId: null` signifie
non classé. Les dossiers peuvent être hiérarchiques mais aucun cycle n’est
autorisé. Supprimer un dossier ne supprime aucun média ; ses assets deviennent
non classés. Aucun déplacement physique ne résulte d’un déplacement logique.

### Tags

```json
{
  "id": "tag-example",
  "name": "à vérifier",
  "normalizedName": "a-verifier",
  "createdAt": "…",
  "updatedAt": "…"
}
```

Les noms sont comparés après trim, normalisation Unicode et comparaison
insensible à la casse ; `normalizedName` est unique. Un asset peut porter
plusieurs tags et un tag qualifier plusieurs assets. Renommer un tag conserve
son ID et modifie son nom. Supprimer un tag ne retire que les associations.

## 9. Collections automatiques

Les collections sont des requêtes calculées ; aucune liste de membres n’est
persistée :

- **Toutes les vidéos** : assets `active` ;
- **Originales** : assets `active` dont `parentAssetId` est nul ;
- **Anonymisées** : assets `active` dont la propre dérivation normalisée porte
  le type `anonymization` dans `derivationTypes` ; le seul fait d’avoir un
  ancêtre anonymisé ne suffit pas à qualifier une dérivation ultérieure. La
  famille et les ancêtres restent consultables séparément ;
- **En cours de traitement** : traitements `queued`, `running` ou `cancelling` ;
- **En erreur** : traitements `failed` ou `interrupted` ;
- **Non classées** : assets `active` dont `folderId` est nul.

Les assets archivés sont exclus des collections ordinaires. Une vue de
traitement peut afficher son asset source et son état sans créer un asset de
sortie fictif.

## 10. Métadonnées techniques

Les métadonnées sont séparées entre asset, source, playable et traitement.

```json
{
  "durationMs": null,
  "width": null,
  "height": null,
  "frameRate": null,
  "videoCodec": null,
  "audioCodec": null,
  "hasAudio": null,
  "mimeType": null,
  "sizeBytes": null,
  "sha256": null,
  "analyzedAt": null,
  "analyzer": null,
  "analyzerVersion": null,
  "status": "unknown",
  "error": null
}
```

Les champs inconnus restent `null` et ne bloquent pas la déclaration d’un
asset distant. Une analyse échouée est représentée par son statut et son
erreur, sans inventer de valeurs techniques.

## 11. Politique de suppression

| Objet | Action normale | Suppression définitive |
|---|---|---|
| Asset | Archivage logique réversible | Refus si activité, descendant, traitement, parent ou racine requis. |
| Playable | Désactivation/archivage de la représentation | Refus si playable par défaut, activité ou traitement le référence ; la source et l’asset restent. |
| Fichier physique | Conservation contrôlée | Refus si un playable actif ou une provenance le requiert ; suppression séparée et auditée. |
| Dossier | Suppression logique | Aucun fichier ni asset supprimé ; assets non classés. |
| Tag | Suppression de l’association et du tag | Aucun asset ni fichier supprimé. |
| Traitement | Conservation de l’historique | Pas de suppression automatique avec le fichier de sortie. |

Il n’existe aucune cascade automatique de médias, activités, descendants ou
fichiers dans la première version.

## 12. Invariants et réactions

`technicalMetadata.status` décrit uniquement le résultat de l’analyse
technique. `MediaTreatment.status` décrit uniquement l’exécution d’un
traitement. `Playable` ne possède pas de champ `status` : sa disponibilité est
entièrement portée par `availability`.

Une écriture doit être refusée si :

- un identifiant obligatoire est dupliqué ou invalide ;
- une référence asset/source/playable, parent, racine, dossier, tag ou traitement
  est inconnue ;
- `MediaSource.assetId` ne correspond pas à l’asset attendu ;
- `Playable.assetId` ou `Playable.sourceId` ne pointe pas vers une entité
  existante et cohérente ;
- `defaultPlayableId` n’appartient pas à l’asset ;
- le lignage est cyclique ou sa racine est incohérente ;
- la hiérarchie des dossiers est cyclique ;
- un `storageKey` est absolu, traverse le répertoire géré ou vise un fichier
  temporaire ;
- un traitement terminé ne possède pas de sortie validée cohérente ;
- une activité moderne ne peut pas être résolue par son `videoRef`.

Un fichier local absent ne déclenche pas une suppression : il marque le
playable `missing-local`. Une erreur temporaire distante marque la disponibilité
`unreachable-remote`. Une incohérence réparable par inspection est signalée et
ne peut être corrigée que par une réconciliation explicite et sauvegardée.

## 13. Schéma JSON cible illustratif

L’exemple est volontairement sans donnée personnelle ni chemin réel.

```json
{
  "schemaVersion": "1.0",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "assets": [{
    "id": "asset-example",
    "title": "Média exemple",
    "lifecycle": "active",
    "folderId": null,
    "defaultPlayableId": "playable-example",
    "parentAssetId": null,
    "familyRootAssetId": "asset-example",
    "derivationTypes": [],
    "tagIds": [],
    "provenance": { "creationType": "local-import", "createdAt": "2026-01-01T00:00:00.000Z" },
    "technicalMetadata": { "durationMs": null },
    "rights": {},
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }],
  "sources": [{
    "id": "source-example",
    "assetId": "asset-example",
    "kind": "local-file",
    "provider": "local",
    "origin": { "originalFileName": "example.mp4" },
    "transport": "file",
    "mimeType": "video/mp4",
    "provenance": {},
    "createdAt": "2026-01-01T00:00:00.000Z"
  }],
  "playables": [{
    "id": "playable-example",
    "assetId": "asset-example",
    "sourceId": "source-example",
    "kind": "local-file",
    "availability": "available",
    "availabilityReason": null,
    "location": { "storageKey": "example.mp4" },
    "technicalMetadata": { "mimeType": "video/mp4" },
    "provenance": {},
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }],
  "treatments": [],
  "folders": [],
  "tags": []
}
```

Les éventuelles listes `sourceIds` et `playableIds` sont des projections
recalculables et ne sont pas incluses dans l’état canonique illustratif. Une
technologie de stockage future peut indexer ces relations différemment, sans
changer les IDs, cardinalités ni invariants.

## 13.1. Stratégie de version du schéma

`schemaVersion` utilise le format `MAJEUR.MINEUR` avec une composante majeure
entière supérieure ou égale à 1 et une composante mineure entière supérieure ou
égale à 0, par exemple `1.0`.

- un changement majeur (`1.x` vers `2.0`) rompt le contrat ou nécessite une
  migration ; l’écriture d’une version majeure inconnue est refusée ;
- un changement mineur (`1.0` vers `1.1`) ajoute uniquement des champs ou
  valeurs rétrocompatibles ;
- une lecture peut tolérer une version mineure ultérieure uniquement si les
  champs inconnus peuvent être conservés sans perte et si les invariants connus
  restent vérifiables ;
- toute transition entre versions majeures doit être explicite, versionnée,
  sauvegardée, idempotente, réversible et testée avant écriture canonique.

La tolérance de lecture ne vaut pas autorisation d’écriture silencieuse : une
écriture doit préserver les champs inconnus ou être refusée.

## 14. Source de vérité et compatibilité activité

Après migration, la Library est la source de vérité :

```text
video-library.json
        ↓ resolve(videoRef)
activity.videoRef
        ↓ projection temporaire
activity.video
        ↓
student / teacher / guided / author / preview
```

La direction est à sens unique : la Library produit la référence et la
projection de l’activité. `activity.video` ne sert jamais à remplacer un
enregistrement valide de la Library. Si `videoRef` et `video` se contredisent,
le serveur doit refuser l’écriture ou reconstruire `video` depuis le
`videoRef` résolu ; il ne doit pas choisir silencieusement l’ancienne
projection.

Les sept activités canoniques reçoivent des `videoRef` stables et valides. Le
catalogue historique reste en lecture seule pour comparaison et fallback
pendant la transition. Il ne peut être retiré qu’après :

1. que les sept activités possèdent un `videoRef` valide ;
2. que chaque asset/playable référencé soit résolu depuis la Library ;
3. que les routes étudiant, enseignant, guidée, auteur et prévisualisation
   réussissent sur une copie ;
4. qu’aucun chemin de code hors rapports n’exige le fallback du catalogue ;
5. qu’un état pré-migration sauvegardé et une procédure de restauration aient
   été vérifiés.

## 15. Plan de migration depuis le schéma 0.1

La migration est versionnée, déterministe, idempotente et réversible.

### Phase M0 — sauvegarde et validation à blanc

1. Stopper les écritures concurrentes.
2. Sauvegarder Library, activités, catalogue et leurs `.bak` dans un emplacement
   contrôlé.
3. Valider l’unicité des IDs et le graphe asset/source/playable actuel.
4. Vérifier les `storageKey` sans déplacer de fichier.
5. Produire un rapport à blanc sans écrire.

### Phase M1 — enrichissement structurel

1. Conserver les IDs actuels lorsque possible.
2. Définir `lifecycle`, `folderId: null`, `tagIds: []`, dates et métadonnées
   normalisées.
3. Construire les familles : les assets non dérivés deviennent racines ; les
   dérivés utilisent `sourceAssetId` comme parent immédiat lorsque la relation
   est certaine. Pour les dérivés actuels, les dix liens sont reconstruits à
   partir de `sourceAssetId` et leur racine est l’asset UGA.
4. Conserver les provenances historiques, y compris les chemins absolus sous
   une zone historique non fonctionnelle.
5. Ajouter `treatments: []`, `folders: []` et `tags: []` si ces collections
   résident dans le même document.

### Phase M2 — disponibilité

1. Contrôler l’existence de chaque `storageKey`.
2. Marquer les trois playables absents `missing-local` / `missing-file`.
3. Ne pas restaurer, recréer, télécharger, renommer, déplacer ou supprimer un
   fichier.
4. Conserver l’identité afin qu’un retour du fichier réactive le même playable.

### Phase M3 — activités

1. Résoudre les sept activités par leur `video.id` actuel lorsque nécessaire.
2. Créer un `videoRef` stable vers l’asset/playable Library correspondant.
3. Rejeter et signaler toute ambiguïté ; ne pas choisir silencieusement un
   playable différent.
4. Recalculer `activity.video` depuis le `videoRef` et conserver sa forme de
   compatibilité.

### Phase M4 — traitements

1. Ne pas transformer rétroactivement les jobs expirés en faux traitements
   terminés.
2. Créer des traitements persistants uniquement pour les traitements dont les
   données de résultat et de provenance sont encore certaines.
3. Pour les dérivés déjà publiés, rattacher le traitement à partir de
   `sourcePreparationJobId` et de la provenance ; conserver les paramètres
   historiques disponibles.
4. Laisser `runtimeJobId` nul lorsque le job temporaire n’est plus récupérable.

### Phase M5 — validation et bascule

1. Valider toutes les références, familles, dossiers, tags, traitements et
   disponibilités.
2. Écrire atomiquement la nouvelle Library après sauvegarde.
3. Lire les sept activités dans toutes les vues concernées sur une copie.
4. Conserver le catalogue en lecture seule et comparer les résolutions.
5. Restaurer intégralement les sauvegardes en cas d’échec.

Le catalogue historique ne peut être retiré qu’après satisfaction des cinq
conditions de suppression du fallback définies plus haut. Aucun fichier vidéo
n’est modifié par cette migration de modèle.

## 16. Compatibilité à préserver

- **Sept activités** : ajout non destructif de `videoRef`, conservation de
  `video` comme projection temporaire ;
- **Étudiant, enseignant, guidé, auteur, prévisualisation** : tous consomment
  une source résolue sans connaître le stockage interne ;
- **Atelier d’anonymisation canonique** : continue à choisir un playable HLS
  compatible et à publier uniquement un résultat validé ;
- **HLS UGA** : domaine, chemins et proxy autorisés restent inchangés ;
- **YouTube contrôlé** : IFrame API et embed contrôlé uniquement ;
- **Imports locaux** : copies gérées, hash et provenance conservés ;
- **Copies distantes** : source distante et copie locale restent deux
  représentations du même asset ;
- **Dérivés existants** : IDs, hashes, provenance et fichiers présents restent
  lisibles ; les fichiers absents deviennent `missing-local` ;
- **Écritures atomiques et `.bak`** : conservées pour chaque mutation ;
- **Autonomie** : aucune dépendance à IC-Hub ou à une Library partagée n’est
  introduite.

## 17. Découpage d’implémentation proposé

1. Contrat JSON cible, validation et index calculés.
2. Migration à blanc sur copie, rapport des ambiguïtés et des fichiers absents.
3. Migration réelle sauvegardée et idempotente.
4. Adaptation des résolveurs et projection `activity.video`.
5. Enrichissement des familles, lignage et disponibilité.
6. Persistance des `MediaTreatment` et réconciliation au redémarrage.
7. Dossiers virtuels et validation de hiérarchie.
8. Tags et associations.
9. Collections automatiques calculées.
10. Archivage, restauration et suppression protégée.
11. Adaptation progressive de Library, création d’activité, auteur et guidé.
12. Retrait documenté du catalogue fallback après validation des sept activités.

Chaque étape doit avoir ses fixtures temporaires, sa sauvegarde, ses tests
ciblés et une possibilité de restauration. Aucune étape ne doit commencer par
une suppression physique ou par une migration irréversible.
