# Mission 101 — Migration à blanc de la vidéothèque Proto05

## Résumé exécutif

La mission 101 ajoute un migrateur dormant et réalise une migration à blanc
isolée de la Library historique 0.1. Aucune migration fonctionnelle n’a été
effectuée.

Résultat de la migration à blanc sur les données de test actuelles :

| Résultat | Valeur |
|---|---:|
| Source | `0.1` |
| Cible | `1.0` |
| Assets produits | 15 |
| Sources produites | 15 |
| Playables produits | 15 |
| Représentations locales présentes | 9 |
| Représentations locales absentes | 3 |
| MediaTreatment créés | 0 |
| Traitements historiques différés | 10 |
| Références d’activités résolues | 7 |
| Sortie canonique valide | oui |
| Sortie lisible | oui |
| Sortie `writeEligible` | oui, structurellement |
| Champs inconnus à préserver | non |
| Exécutions déterministes égales | oui |
| Source historique non mutée | oui |

Les 3 représentations locales absentes sont conservées dans la sortie avec
`availability: "missing-local"` et `availabilityReason: "missing-file"`. Les
10 dérivés restent des assets anonymisés selon leur propre provenance, mais
aucun `MediaTreatment` n’est fabriqué : les données historiques ne prouvent pas
suffisamment l’exécution persistante complète. Les liens de famille restent
également prudents lorsque `sourceAssetId` prouve une origine sans prouver le
parent immédiat.

## 1. État Git initial et périmètre

Prérequis vérifiés :

- branche `main` ;
- mission 098 présente dans l’historique ;
- commit 099 présent : `92aad68 feat(proto05): add dormant canonical media library validator` ;
- commit 100 présent : `9668fb5 docs(proto05): audit legacy media library migration` ;
- arbre Git propre avant intervention.

Le périmètre est resté limité à Proto05 et à la documentation `reports/` du
workspace. Aucun autre prototype, IC-Hub, route fonctionnelle ou donnée
canonique n’a été modifié.

## 2. Fichiers créés et modifiés

Créés :

- `server/media-library-migration.js` — cœur pur et déterministe ;
- `server/media-library-availability.js` — collecteur local borné ;
- `server/media-library-dry-run.js` — orchestrateur dormant ;
- `server/test/media-library-migration.test.js` ;
- `server/test/media-library-availability.test.js` ;
- `server/test/media-library-dry-run.test.js` ;
- `reports/101_proto05_media_library_dry_run_migration_report.md`.

Modifié :

- `server/README.md` — documentation des trois modules et des garde-fous.

Non modifiés :

- `data/video-library.json` ;
- `data/video-catalog.json` ;
- `data/activities.json` ;
- `data/video-library-media/` ;
- `MEDIA_LIBRARY_MODEL.md` ;
- `ROADMAP.md` ;
- `server/server.js` et les routes ;
- les pages et lecteurs Proto05 ;
- la version applicative.

## 3. Architecture retenue

### 3.1 Cœur pur

API exposée :

```js
migrateLegacyMediaLibrary({
  legacyDocument,
  availabilitySnapshot,
  options
}) => MediaLibraryMigrationResult
```

`server/media-library-migration.js` n’importe ni `fs`, ni `path`, ni réseau, ni
writer, ni route, ni FFmpeg. Il reçoit toutes les données nécessaires, produit
un nouveau graphe d’objets et appelle uniquement le validateur pur 099.

Le résultat expose séparément :

- `output` ;
- `sourceVersion`, `targetVersion` ;
- `migrated`, `transformationProduced` ;
- `valid`, `readable`, `writeEligible` ;
- `requiresUnknownFieldPreservation` ;
- `diagnostics` ;
- `mappings`, `activityReferenceMappings` ;
- `validationResult` ;
- `statistics` ;
- `dryRunExecuted`, `realMigrationPerformed`,
  `persistedInFunctionalLocation`.

`migrated` indique qu’une transformation a été produite. Il ne signifie jamais
qu’un fichier fonctionnel a été remplacé.

### 3.2 Collecteur local

`media-library-availability.js` reçoit une liste explicite de `storageKey` et un
répertoire média explicitement fourni. Il vérifie seulement :

- `present` si le chemin désigne un fichier ;
- `absent` si le fichier n’existe pas ;
- `contradictory` si le chemin existe mais ne désigne pas un fichier ;
- `unobservable` en cas d’erreur de lecture.

Il refuse les chemins absolus, séparateurs Windows, composants `.`/`..` et
traversées. Il ne calcule aucun hash, ne lance aucune analyse, ne télécharge
aucun média et ne parcourt pas le stockage global.

### 3.3 Orchestrateur à blanc

`media-library-dry-run.js` exige :

- les fichiers historiques explicitement désignés ;
- le répertoire média explicitement désigné ;
- un répertoire de sortie temporaire explicite, absent ou vide.

Il refuse une sortie située dans l’espace fonctionnel source, ne remplace aucun
fichier existant et écrit uniquement quatre artefacts isolés :

- `media-library.canonical.json` ;
- `migration.result.json` ;
- `entity-mappings.json` ;
- `activity-reference-mappings.json`.

L’orchestrateur n’est importé ni par `server.js`, ni par une route, ni par une
page utilisateur, ni par le démarrage du serveur.

## 4. Détection des formats

Le cœur reconnaît explicitement un document 0.1 lorsque `schemaVersion` vaut
`"0.1"` et que les trois collections historiques sont présentes.

Il refuse :

- une version absente ou invalide ;
- un format inconnu ;
- une structure historique obligatoire absente ;
- un document déjà canonique 1.x, diagnostiqué
  `CANONICAL_SOURCE_NOT_REMIGRATED` ;
- une collision d’identifiant historique.

Aucune correction silencieuse de la source n’est appliquée.

## 5. Règles de transformation

### Asset, source, playable

- chaque asset historique devient un `MediaAsset` ;
- chaque source historique devient un `MediaSource` ;
- chaque playable historique devient un `Playable` ;
- les listes historiques `sourceIds` et `playableIds` ne sont pas persistées ;
- les relations sont reconstruites par `source.assetId`, `playable.assetId` et
  `playable.sourceId` ;
- les sources distantes restent des origines ;
- les fichiers gérés sont localisés uniquement dans
  `Playable.location.storageKey` ;
- un asset sans playable disponible est conservé ;
- les dossiers, tags et collections automatiques restent vides/calculés.

Les types `derived-output` des sources historiques deviennent des sources
canoniques `derived-output`, tandis que leur représentation lisible reste un
playable `local-file`, conformément au contrat 098.

### Identifiants

Les identifiants historiques valides et uniques sont préservés dans leurs
espaces respectifs. Une fonction de génération déterministe par empreinte est
présente pour les entités supplémentaires futures, avec une graine fondée sur
version source, type, identifiant historique et rôle. Aucun identifiant aléatoire
n’a été produit pendant la migration actuelle.

Les IDs générés ne dépendent ni du titre, ni des métadonnées modifiables, ni de
l’ordre des tableaux, ni d’un chemin personnel.

### Dates

Les dates historiques sont réutilisées lorsqu’elles sont valides. Lorsqu’une
date obligatoire manque, l’appelant fournit une date de migration déterministe;
à défaut, le cœur utilise une valeur fixe documentée et produit
`DEFAULTED_DATE`. L’heure courante n’est jamais consultée.

### `defaultPlayableId`

La priorité est :

1. le playable historiquement préféré, s’il existe et n’est pas bloqué ou
   `missing-local` ;
2. un candidat `available` ou `unknown` ;
3. ordre stable par identifiant lorsque plusieurs candidats sont équivalents ;
4. `null` si aucun playable n’est disponible.

Un choix technique entre plusieurs candidats produit un avertissement
`DEFAULT_PLAYABLE_TIEBROKEN`. Un préféré indisponible produit
`DEFAULT_PLAYABLE_UNAVAILABLE` et ne devient pas une vérité silencieuse.

## 6. Familles et dérivations

La migration ne transforme `sourceAssetId` en parent immédiat que si une
propriété historique explicite `parentAssetId` le prouve. Lorsque seule une
origine `sourceAssetId` est disponible, elle conserve l’asset dérivé mais produit
`FAMILY_PARENT_UNPROVABLE` et ne fabrique pas de famille.

La racine est calculée uniquement depuis une chaîne de parents prouvés. Les
cycles sont bloquants et diagnostiqués.

Un asset dont la propre provenance porte `kind: "derived-anonymized"` reçoit
`derivationTypes: ["anonymization"]`. Cette qualification n’est jamais héritée
d’un ancêtre.

## 7. Disponibilité et fichiers manquants

Le collecteur a examiné uniquement les 12 `storageKey` référencés par la
Library historique. Il a observé 9 fichiers présents et 3 absents.

Les 3 absents deviennent explicitement :

```json
{
  "availability": "missing-local",
  "availabilityReason": "missing-file",
  "location": { "storageKey": "<clé relative conservée>" }
}
```

Aucun asset, playable ou fichier n’a été supprimé, recréé, déplacé ou téléchargé.
Les sources distantes n’ont pas été sondées; elles reçoivent
`availability: "unknown"` et un diagnostic `REMOTE_AVAILABILITY_UNOBSERVED`.

## 8. Métadonnées techniques

Les métadonnées historiques présentes sont recopiées ou normalisées dans
`technicalMetadata` : durée, MIME, taille et hash lorsqu’ils existent. Les
dimensions, cadence, codecs, audio et dates d’analyse absents restent `null` ou
inconnus. Aucun codec n’est déduit d’une extension et aucun analyseur n’a été
lancé.

`technicalMetadata.status` reste une chaîne structurelle lorsqu’elle existe;
aucun enum n’a été inventé, conformément aux limites du contrat 098/099.

## 9. MediaTreatment

Les 10 dérivés historiques portent une provenance de dérivation, mais ne
fournissent pas tous les éléments nécessaires pour prouver un traitement
persistant complet : notamment une relation source playable explicite et un
registre durable de job.

Le migrateur crée donc **0 MediaTreatment** et produit **10 diagnostics
`TREATMENT_HISTORY_ABSENT`**. Il conserve les paramètres autorisés dans la
provenance des assets/playables. Cette décision évite de fabriquer un historique
d’exécution à partir de la seule existence d’un fichier dérivé.

## 10. Dossiers, tags et collections

La source réelle ne contient aucun dossier, tag ou association asset-tag
persistante. Le document de sortie contient donc `folders: []` et `tags: []`.

Les collections Toutes les vidéos, Originales, Anonymisées, En cours de
traitement, En erreur et Non classées restent des projections calculées et ne
sont pas écrites.

## 11. Références proposées pour les activités

Les activités n’ont pas été modifiées. Le migrateur produit seulement une table
de correspondance :

- champ source : `videoRef` lorsqu’il existe, sinon `video.id` ;
- type de référence historique ;
- assetId/playableId canoniques proposés ;
- statut `resolved`, `ambiguous`, `orphaned`, `deferred` ou `invalid` ;
- justification et diagnostic éventuel.

Les 7 références observées sont `resolved` dans la migration à blanc : 2
références `videoRef` modernes et 5 références historiques via le catalogue.
Cette table n’est pas branchée sur les activités et aucune copie intégrale
d’activité n’est conservée dans le rapport.

## 12. Diagnostics et poursuite partielle

Chaque diagnostic de migration contient :

- `code` stable ;
- `severity` parmi `info`, `unavailable`, `warning`, `ambiguous`,
  `reconcilable`, `error` ;
- chemin source ;
- message ;
- `blocking` et `requiresDecision` ;
- détails structurés limités.

Résultats agrégés de la migration réelle à blanc :

| Niveau | Nombre |
|---|---:|
| `unavailable` | 16 |
| `ambiguous` | 10 |
| `warning` | 3 |
| `error` | 0 |

Codes principaux :

- 3 `LOCAL_FILE_MISSING` ;
- 10 `FAMILY_PARENT_UNPROVABLE` ;
- 10 `TREATMENT_HISTORY_ABSENT` ;
- 3 `REMOTE_AVAILABILITY_UNOBSERVED` ;
- 3 `DEFAULT_PLAYABLE_UNAVAILABLE`.

Une anomalie locale ou une provenance insuffisante n’omet pas silencieusement
l’entrée : l’asset et le playable restent dans la sortie, et la statistique ou
le diagnostic indique la limite. Une erreur de format, d’identifiant ou de
sortie canonique reste bloquante.

Les diagnostics exacts du validateur 099 restent séparés dans
`validationResult` ; la sortie actuelle possède zéro erreur canonique.

## 13. Intégration du validateur 099

Chaque sortie produite est envoyée à `validateMediaLibrary`. La migration à
blanc a obtenu :

```text
valid = true
readable = true
writeEligible = true
requiresUnknownFieldPreservation = false
validationResult.problems = []
```

`writeEligible` est ici un résultat structurel de la sortie temporaire. Il ne
constitue pas une autorisation de writer ni une migration réelle. Aucun writer
de production n’est appelé.

## 14. Tests synthétiques exécutés

Commande ciblée :

```text
node --test test/media-library-contract.test.js test/media-library-migration.test.js test/media-library-availability.test.js test/media-library-dry-run.test.js
```

Résultat : **64/64 réussis**.

Couverture ajoutée :

- pureté de la source, des options et de l’instantané ;
- absence de sous-objets partagés et d’état global ;
- formats 0.1, inconnu, absent et déjà canonique ;
- séparation asset/source/playable ;
- local présent/absent, URL directe et sortie dérivée ;
- choix de `defaultPlayableId` ;
- anonymisation propre et non-héritée ;
- traitement historique différé ;
- ordre des collections sans effet ;
- titres/métadonnées sans effet sur les identifiants ;
- collision d’identifiant ;
- collecteur borné, chemins sûrs et observation contradictoire ;
- garde-fous de répertoire temporaire et absence d’écrasement.

Le test existant du validateur 099 est inclus et reste à **47/47**.

## 15. Migration à blanc réelle

L’orchestrateur a été exécuté deux fois avec :

- `data/video-library.json` comme source 0.1 ;
- le catalogue et les activités lus uniquement pour les correspondances ;
- `data/video-library-media/` comme espace observé en lecture seule ;
- un répertoire temporaire système dédié, préfixé
  `proto05-media-library-dry-run-<identifiant opaque>`.

Les quatre artefacts temporaires ont été écrits avec création exclusive, puis le
répertoire temporaire a été supprimé après extraction des résultats. Aucun
chemin personnel absolu, URL réelle ou contenu d’activité n’a été ajouté au
rapport.

Comparaison des deux exécutions :

- sorties canoniques JSON strictement égales ;
- résultats et diagnostics strictement égaux ;
- mêmes mappings et mêmes statistiques ;
- source historique strictement inchangée avant/après ;
- aucune activité modifiée ;
- aucun média créé, déplacé, supprimé, recréé ou téléchargé.

## 16. Écarts avec l’audit 100

Les comptes de 100 sont confirmés : 15 entrées historiques, 9 fichiers locaux
présents, 3 absents, 10 dérivés et 7 activités.

La migration ajoute les précisions suivantes sans contredire l’audit :

- les 3 absents sont effectivement normalisés `missing-local`/`missing-file` ;
- les sources distantes restent non sondées et deviennent `unknown` ;
- les 10 familles dérivées restent partiellement prouvées ;
- aucun traitement historique n’est créé faute de preuve complète ;
- les 7 références d’activités sont résolues dans la table temporaire, sans
  modifier les activités.

## 17. Garde-fous de non-migration réelle

Les contrôles suivants sont en place et testés :

- chemin de sortie obligatoire ;
- sortie absente ou vide uniquement ;
- refus d’une sortie dans l’espace fonctionnel source ;
- création exclusive des artefacts temporaires ;
- absence d’import par `server.js` ;
- absence d’appel par les pages et routes ;
- drapeaux explicites `realMigrationPerformed: false` et
  `persistedInFunctionalLocation: false`.

## 18. Contrôles exécutés

- vérification statique des trois nouveaux modules ;
- tests ciblés migration, collecteur, orchestrateur et validateur 099 : 64/64 ;
- `npm.cmd run check` : réussi ;
- recherche des imports fonctionnels : aucun import dans `server.js`, pages ou
  shared ;
- migration à blanc sur les données de test ;
- seconde exécution et comparaison exacte ;
- contrôle de non-mutation de la source ;
- recherche ciblée de chemins personnels et URLs réelles dans le rapport ;
- `git diff --check` : réussi.

Contrôles non exécutés conformément au périmètre :

- serveur, HTTP, Chromium et recette manuelle ;
- réseau, téléchargement, FFmpeg et ffprobe ;
- analyse technique physique des médias ;
- scan global du stockage ;
- suite fonctionnelle complète et build séparé inexistant dans le package ;
- writer de production et migration réelle.

## 19. Décisions encore ouvertes

Avant une migration réelle, David doit valider :

1. la politique définitive d’identifiants générés pour les entrées sans ID ;
2. le traitement des relations `sourceAssetId` qui ne prouvent pas un parent
   immédiat ;
3. la création éventuelle de `MediaTreatment` pour les dérivés historiques ;
4. la stratégie de réconciliation des 3 fichiers absents ;
5. la conversion contrôlée des activités historiques vers `videoRef` ;
6. la future liste de valeurs de `technicalMetadata.status` ;
7. le regroupement éventuel des copies distantes historiques, uniquement sur
   preuve explicite de même asset.

## 20. Version et état Git final

Version inchangée : **0.1.31**. Cette mission ajoute un socle interne dormant et
une migration à blanc sans comportement utilisateur.

Le changement Git de la mission est limité aux trois modules, aux trois fichiers
de tests, à la documentation serveur et au présent rapport. Aucun commit ni
push n’a été effectué.

Message de commit proposé, non exécuté :
`feat(proto05): add dormant media library dry-run migrator`
