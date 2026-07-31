# Mission 150 — Préflight de suppression média et relations canoniques

## Conclusion

Le préflight de suppression média de Proto05 est désormais aligné sur le
contrat MariaDB canonique. Les traitements sont recherchés par leurs cinq
relations réelles (`sourceAssetId`, `sourcePlayableId`, `outputAssetId`,
`outputPlayableId`, `publishedPlayableId`) et non plus par les anciens champs
artificiels `assetId`, `playableId` et `sourceId`.

Le préflight produit une décision explicite et fermée pour la suppression de
l'entrée de catalogue et pour la suppression physique. Les dépendances
bloquantes sont présentées avant tout dialogue destructif. Les relations de
classement par dossier et étiquette sont identifiées comme nettoyables.

MariaDB reste l'unique source de vérité. Aucun schéma, fichier JSON canonique,
média réel ou numéro de version n'a été modifié.

## État initial

- Branche : `main`.
- Révision de départ : `c825b6ccdaa859e4176c7d80b5ca03703d5140c8`.
- Version Proto05 : `0.1.48`.
- État Git initial : propre.
- Référence automatisée : 11 fichiers de test, 105 tests réussis.

## Origine exacte du défaut

### Chemin fonctionnel

```text
DELETE /api/proto05/library/assets/:id[/physical]
→ removeLibraryAsset()
→ libraryAssetDeletionPlan()
→ deletionConflict()
→ assertWritableCanonical()
→ persistCanonicalLibrary()
→ adaptateur d'écriture transactionnel MariaDB
```

Les réponses de liste et de fiche passent par le même
`libraryAssetDeletionPlan()`, puis par `libraryUsageSummary()`, afin de
présenter le préflight avant la suppression.

La projection MariaDB des traitements expose :

```text
sourceAssetId
sourcePlayableId
outputAssetId
outputPlayableId
publishedPlayableId
```

Le préflight comparait pourtant encore :

```text
treatment.assetId
treatment.playableId
treatment.sourceId
```

Ces trois propriétés n'appartiennent pas au traitement canonique courant. Un
traitement pouvait donc manquer dans le diagnostic présenté, et l'interface
pouvait laisser l'utilisateur ouvrir la confirmation puis lancer une requête
vouée à l'échec.

### Portée de sécurité réelle du défaut

Le défaut sous-estimait le préflight et dégradait le diagnostic. La suppression
réelle disposait encore de deux défenses :

1. `assertWritableCanonical()` refusait le document qui aurait laissé un
   traitement orphelin, avant une éventuelle suppression physique ;
2. les clés étrangères MariaDB restrictives constituaient un dernier
   garde-fou transactionnel.

La correction déplace le refus au bon niveau : avant le dialogue destructif et
avant toute mutation. Elle ne repose toutefois pas sur ces défenses tardives.

## Relations et invariants retenus

### Dépendances bloquantes

| Catégorie | Relation d'autorité |
| --- | --- |
| Activité | `activity.videoRef.assetId` ou `activity.videoRef.playableId` |
| Traitement entrant | `sourceAssetId`, `sourcePlayableId` |
| Traitement sortant | `outputAssetId`, `outputPlayableId` |
| Publication de traitement | `publishedPlayableId` |
| Dérivation | `child.parentAssetId` |
| Suppression physique partagée | même clé de stockage locale portée par un autre playable |
| Incohérence interne | divergence entre relations d'autorité et projections, ou chemin local invalide |

Les sources et playables de l'asset ciblé sont sélectionnés par leur
`assetId`, qui est ici la clé étrangère légitime de ces entités. Les champs
`sourceIds` et `playableIds` de l'asset restent des projections contrôlées et
ne remplacent pas ces relations d'autorité.

### Relations nettoyables

- affectation de l'asset à un dossier ;
- associations entre l'asset et ses étiquettes.

Ces relations ne bloquent pas la suppression du catalogue : l'écriture
transactionnelle retire l'asset et les associations dépendantes, sans
supprimer le dossier ni les étiquettes.

### Décisions exposées

Le contrat `usage.preflight` distingue :

- `allowed` : suppression autorisée ;
- `allowed-with-cleanup` : suppression autorisée avec nettoyage du classement ;
- `blocked` : dépendance bloquante ;
- `file-missing` : enregistrement SQL présent mais fichier physique absent ;
- `not-available` : suppression physique non applicable ;
- `inconsistent` : état interne ne permettant pas une décision sûre.

Toute incohérence produit un refus explicite.

## Correction

### Serveur

- ajout d'un module pur et testable pour inventorier les cinq relations
  canoniques de chaque traitement ;
- ordre déterministe par identifiant de traitement et ordre fixe des
  relations ;
- inventaire séparé des dépendances bloquantes et nettoyables ;
- contrôle des projections `sourceIds` et `playableIds` contre les relations
  réelles ;
- filiation fondée sur `parentAssetId` ;
- état explicite du fichier physique (`present`, `missing`, `not-managed`,
  `ambiguous`, `inconsistent`) ;
- refus fermé sur incohérence ;
- conservation du mécanisme de sauvegarde/restauration du fichier autour de
  l'écriture transactionnelle.

### Interface

- la vidéothèque et la fiche détaillée consultent la décision de préflight
  avant d'ouvrir le dialogue de confirmation ;
- le refus affiche un message utilisateur explicite ;
- la vidéothèque ouvre le panneau d'utilisation avec les activités,
  dérivations, traitements et références partagées ;
- les traitements montrent les libellés des relations canoniques concernées ;
- l'ouverture du panneau est différée à la fin de l'événement de clic afin
  qu'il ne soit pas refermé par le gestionnaire global du même clic.

## Audit des anciens noms

La recherche ciblée ne trouve plus
`treatment.assetId`, `treatment.playableId` ou `treatment.sourceId` dans le
chemin de suppression.

Les occurrences restantes de `assetId`, `playableId` et `sourceId` sont
légitimes lorsqu'elles décrivent :

- la clé étrangère d'une source ou d'un playable vers son asset ;
- la source d'un playable ;
- la référence vidéo d'une activité ;
- les identifiants de route ou de payload ;
- les travaux, préparations et opérations de médiathèque qui manipulent une
  entité asset/source/playable.

Elles n'ont pas été renommées : leur sens appartient au contrat de leur propre
entité et non à l'ancien faux modèle de `MediaTreatment`.

## Tests automatisés

### Tests purs

Deux cas ont été ajoutés au fichier de contrat média existant :

1. un traitement dérivé est détecté par chacune des cinq relations
   canoniques, dans un résultat déterministe ;
2. un objet ne contenant que les trois anciens champs artificiels ne crée
   aucune fausse dépendance.

Résultat ciblé contrat média et navigation : **64/64 réussis**.

### Recette MariaDB isolée

Un scénario transactionnel a été ajouté au fichier de runtime MariaDB
existant. Il crée uniquement des identifiants, lignes et petits fichiers
jetables propres à la mission, puis couvre :

- média sans dépendance : autorisation et suppression complète ;
- activité utilisatrice : refus, activité, asset et fichier intacts ;
- traitement : entrée asset/playable et sortie asset/playable détectées ;
- dérivation : asset parent détecté ;
- dossier et étiquette : décision `allowed-with-cleanup`, associations
  retirées, référentiels conservés puis nettoyés explicitement ;
- fichier absent : suppression physique refusée, suppression du catalogue
  encore possible ;
- relecture SQL directe des états attendus ;
- restauration exacte des cardinalités initiales en fin de test.

Résultat du fichier de runtime MariaDB : **6/6 réussis**, dont le nouveau
scénario de préflight.

### Suite complète

```text
11 fichiers de test
108 tests
108 réussis
0 échec
0 ignoré
```

La variation par rapport à 105/105 correspond exactement aux deux tests purs
et au scénario MariaDB ajoutés.

La syntaxe Node est valide pour le serveur, le nouveau module et les trois
fichiers de test concernés.

## Recette Chromium

Recette effectuée dans le navigateur intégré, sur la vidéothèque enseignante,
à partir d'un asset réel uniquement observé en lecture et possédant une
activité et deux traitements :

- clic sur `Actions`, puis `Retirer de la Library` ;
- aucun dialogue de confirmation ouvert ;
- message affiché :
  `Suppression refusée : cette vidéo possède encore des dépendances.` ;
- panneau visible avec l'activité, ses relations asset/playable et les deux
  traitements ;
- les neuf cartes initiales sont restées présentes ;
- la fiche API de l'asset répondait toujours HTTP 200 après le clic ;
- aucune nouvelle erreur ni aucun avertissement dans la console après
  l'interaction finale.

Aucune requête DELETE n'a été nécessaire sur cet asset et aucune donnée réelle
n'a été modifiée.

## Nettoyage et non-altération

Le scénario MariaDB relève les cardinalités avant la recette et exige leur
égalité exacte après son bloc `finally`.

Témoin direct final :

```json
{"assets":0,"activities":0,"treatments":0,"folders":0,"tags":0}
```

Ces compteurs ciblent les marqueurs `[TEST M150]`. La recherche de fichiers
portant le marqueur `mission150` retourne zéro résultat. Le serveur lancé pour
la recette Chromium a été arrêté ; seul le serveur de travail déjà présent
avant la mission reste à l'écoute.

Les données réelles ont uniquement servi à une vérification en lecture du
refus d'interface. Aucun FFmpeg, aucune migration, aucun changement de schéma,
aucun fallback JSON et aucune correction des médias `missing-local` n'ont été
effectués.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/media-deletion-preflight.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/media-library-contract.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `reports/150_proto05_media_deletion_preflight_canonical_relations_report.md`

## Éléments non modifiés

- schéma et migrations MariaDB ;
- données MariaDB réelles ;
- fichiers JSON canoniques ;
- médias physiques réels ;
- disponibilité des trois médias `missing-local` ;
- snapshots, concurrence, outbox et version.

Version obtenue : **`0.1.48`**, inchangée conformément à la mission.

## Recette humaine minimale laissée à David

1. Démarrer MariaDB et Proto05 normalement.
2. Ouvrir `/teacher/videos`.
3. Sur une vidéo connue comme utilisée, choisir `Actions`, puis
   `Retirer de la Library`.
4. Vérifier que le refus et le panneau de dépendances apparaissent sans
   dialogue de confirmation.
5. Ouvrir la fiche de la même vidéo et déclencher la même action ; vérifier le
   refus explicite.
6. Ne tester une suppression autorisée qu'avec un média jetable créé
   spécialement, puis confirmer son nettoyage SQL et disque.

Cette recette humaine reste à effectuer par David ; la recette Chromium de
Codex ne vaut pas validation humaine.

## Proposition de message de commit

```text
fix(proto05): align media deletion preflight with canonical relations
```
