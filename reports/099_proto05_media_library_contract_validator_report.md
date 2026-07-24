# Mission 099 — Contrat et validateur de la Library Proto05

## Résumé exécutif

Le contrat cible de `MEDIA_LIBRARY_MODEL.md` est maintenant traduit par un
module JavaScript interne, pur et dormant :

`prototypes/05-augmented-ic-video-01/server/media-library-schema.js`

Le module fournit les typedefs JSDoc du schéma cible, `validateMediaLibrary`,
`assertMediaLibrary` et `isMediaLibrary`. Il ne lit aucun fichier, n’accède pas
au réseau, ne mute pas son entrée et n’est branché sur aucune route ou écriture
de la Library 0.1 actuelle.

## Fichiers créés et modifiés

Créés :

- `server/media-library-schema.js` — types documentaires et validateur ;
- `server/test/fixtures/media-library-canonical.valid.json` — fixture
  synthétique complète ;
- `server/test/media-library-contract.test.js` — 47 tests déterministes ;
- `reports/099_proto05_media_library_contract_validator_report.md` — présent
  rapport.

Modifié :

- `server/README.md` — emplacement, appel et limites du validateur.

Non modifiés : code de production actuel hors nouveau module, routes, données
JSON canoniques, catalogue, médias, préparation/dérivation, ROADMAP et version
applicative.

## Architecture retenue

La solution utilise uniquement les API natives Node.js et `node:test`. Aucun
package n’a été ajouté.

Le résultat de validation contient :

```js
{
  valid,
  readable,
  writeEligible,
  requiresUnknownFieldPreservation,
  version,
  problems,
  warnings,
  unavailable,
  reconcilable
}
```

Chaque diagnostic porte un code stable, une sévérité, un chemin précis, un
message lisible et, lorsque disponible, l’identifiant de l’entité concernée.
`assertMediaLibrary` lève une erreur portant le résultat détaillé, sans
transformer ni réparer la donnée.

## Correspondance contrat → types

Les typedefs JSDoc représentent :

- `MediaLibrary` ;
- `MediaAsset` ;
- `MediaSource` ;
- `Playable` ;
- `MediaTreatment` ;
- `MediaFolder` ;
- `MediaTag` ;
- `MediaLibraryProblem` et `MediaLibraryValidationResult`.

Les relations canoniques sont celles du contrat : `MediaSource.assetId`,
`Playable.assetId` et `Playable.sourceId`. Les listes `sourceIds` et
`playableIds` sont refusées dans un document persistant canonique, car elles
restent des projections recalculables.

`Playable` ne possède pas de `status`. Sa disponibilité est portée par
`availability`, l’analyse par `technicalMetadata.status` et l’exécution par
`MediaTreatment.status`. Le fichier géré est vérifié via
`Playable.location.storageKey`, jamais via une relation physique de source.

## Règles structurelles implémentées

- `schemaVersion` au format `MAJEUR.MINEUR` ; majeure >= 1, mineure >= 0 ;
- distinction entre syntaxe invalide, majeure inconnue et mineure future ;
- mineure future acceptée avec avertissement, sans mécanisme d’écriture ou de
  conservation automatique des champs inconnus ;
- collections obligatoires `assets`, `sources`, `playables`, `treatments`,
  `folders`, `tags` ;
- objets, tableaux, chaînes, nombres, booléens, nullabilité et dates ISO UTC ;
- enums de cycle asset, disponibilité, type de source/playable, transport et
  état de traitement ;
- identifiants sûrs et uniques dans chaque espace ;
- `storageKey` relatif, sans chemin absolu Windows, séparateur inverse,
  composant vide, `.` ou `..` ;
- localisations selon le type du playable ;
- métadonnées techniques partielles et valeurs inconnues autorisées ;
- provenance, paramètres, diagnostics et erreurs structurés.

## Invariants sémantiques implémentés

- `MediaSource.assetId` existe ;
- `Playable.assetId` et `Playable.sourceId` existent et sont cohérents ;
- `defaultPlayableId` est nul ou appartient au bon asset ;
- `folderId`, tags, parents, racines et références de traitements existent ;
- un asset peut ne posséder aucun playable ;
- un `missing-local` correctement déclaré avec
  `availabilityReason: "missing-file"` reste valide mais produit un diagnostic
  d’indisponibilité ;
- les familles acceptent original → dérivé → dérivé de dérivé ;
- parent, racine et famille sont cohérents ;
- cycles directs et indirects interdits ;
- cycles de dossiers et auto-parent interdits ;
- noms de tags normalisés et associations non dupliquées ;
- traitement `completed` exige une sortie cohérente ;
- traitement `failed`, `cancelled` ou `interrupted` ne publie pas de sortie ;
- sources et playables d’un traitement appartiennent au même asset source ;
- plusieurs playables, dont une copie locale et une représentation distante, sont
  possibles pour un même asset.

La vérification de disponibilité est purement déclarative. Le validateur ne
fait ni `stat`, ni accès réseau, ni analyse média.

## Collections automatiques

Les collections automatiques n’ont pas été implémentées dans cette mission.
Le contrat les définit, mais leur projection pure appartient à la mission
consacrée aux collections. Aucun membre n’est persisté par le nouveau module.

## Points volontairement différés

- migration du schéma 0.1 ;
- tolérance d’écriture avec conservation de champs inconnus d’une mineure
  future ;
- lecture/écriture de la Library réelle ;
- contrôle physique `missing-local` ;
- analyse technique ffprobe ;
- machine de reprise des traitements au redémarrage ;
- publication, archivage, suppression et restauration ;
- projection des collections automatiques ;
- branchement sur les routes et parcours existants.

Le contrat 098 décrit la responsabilité de `technicalMetadata.status`, mais ne
fixe pas encore une liste exhaustive de codes d’analyse. Le validateur contrôle
donc sa présence sous forme de chaîne lorsqu’elle est fournie, sans inventer un
nouvel enum fonctionnel.

## Fixtures synthétiques

La fixture ne contient aucune donnée canonique, URL UGA, chemin Windows, nom
d’activité ou donnée personnelle. Elle couvre :

- un original ;
- un dérivé anonymisé ;
- un dérivé du dérivé ;
- une source distante ;
- un playable local supplémentaire du même asset ;
- un playable `missing-local` avec `missing-file` ;
- une hiérarchie de dossiers ;
- plusieurs tags et associations ;
- un traitement terminé ;
- un traitement échoué sans faux output.

Les variantes invalides sont générées par copie ciblée dans les tests.

## Tests ajoutés

`node --test test/media-library-contract.test.js` : **47/47 réussis**.

### Matrice de couverture obligatoire

| Cas obligatoire | Test exact | Diagnostic / résultat attendu | Statut |
|---|---|---|---|
| Document valide complet | `le document canonique synthétique complet est accepté sans mutation` | `valid=true`, aucune erreur, entrée inchangée | couvert |
| Document non muté | `document valide non muté explicitement` | comparaison profonde avant/après | couvert |
| Asset sans playable | `un asset sans playable et un lignage sur plusieurs générations sont valides` | accepté, `defaultPlayableId=null` | couvert |
| `schemaVersion` invalide | `schemaVersion distingue syntaxe invalide, majeure inconnue et mineure future` | `INVALID_SCHEMA_VERSION` | couvert |
| Version majeure inconnue | même test | `UNKNOWN_SCHEMA_MAJOR`, `readable=false`, `writeEligible=false` | couvert |
| Version mineure future | même test | avertissement `FUTURE_SCHEMA_MINOR`, lisible mais non réinscriptible | couvert |
| Collection obligatoire absente | `les collections, types, enums et champs obligatoires sont contrôlés` | `MISSING_COLLECTION` | couvert |
| Champ obligatoire absent | `champ obligatoire absent : MediaAsset.title` | `MISSING_FIELD` sur `assets[0].title` | couvert |
| Type ou enum incorrect | `les collections, types, enums et champs obligatoires sont contrôlés` | diagnostics d’enum/transport | couvert |
| Source sans asset | `référence orpheline : MediaSource.assetId` | `SOURCE_ASSET_NOT_FOUND` | couvert |
| Playable sans asset | `référence orpheline : Playable.assetId` | `PLAYABLE_ASSET_NOT_FOUND` | couvert |
| Playable sans source | `référence orpheline : Playable.sourceId` | `PLAYABLE_SOURCE_NOT_FOUND` | couvert |
| `defaultPlayableId` invalide | `référence orpheline : defaultPlayableId` | `DEFAULT_PLAYABLE_NOT_FOUND` | couvert |
| Traitement vers asset/playable absent | `référence orpheline : traitement vers asset et playable` | `TREATMENT_SOURCE_ASSET_NOT_FOUND` et `TREATMENT_SOURCE_PLAYABLE_NOT_FOUND` | couvert |
| Source du playable appartenant à un autre asset | `source du playable appartenant à un autre asset` | `PLAYABLE_SOURCE_ASSET_MISMATCH` | couvert |
| Auto-parent d’asset | `auto-parent d’asset` | `FAMILY_CYCLE` | couvert |
| Cycle direct d’assets | `cycle direct d’assets` | `FAMILY_CYCLE` | couvert |
| Cycle indirect d’assets | `cycle indirect d’assets` | `FAMILY_CYCLE` | couvert |
| Racine incohérente | `racine de famille incohérente` | `FAMILY_ROOT_MISMATCH` | couvert |
| Parent d’asset inexistant | `parent d’asset inexistant` | `PARENT_ASSET_NOT_FOUND` | couvert |
| Racine de famille inexistante | `racine de famille inexistante` | `FAMILY_ROOT_NOT_FOUND` | couvert |
| Lignage multi-générations valide | `lignage multi-générations valide explicitement` | accepté, chaîne parent/root cohérente | couvert |
| Auto-parent de dossier | `auto-parent de dossier` | `FOLDER_CYCLE` | couvert |
| Cycle direct de dossiers | `cycle direct de dossiers` | `FOLDER_CYCLE` | couvert |
| Dossier inexistant | `dossier inexistant explicitement` | `FOLDER_NOT_FOUND` | couvert |
| Tag orphelin | `association de tag orpheline` | `TAG_NOT_FOUND` | couvert |
| Doublon d’association | `doublon d’association de tag` | `DUPLICATE_TAG_ASSOCIATION` | couvert |
| Conflit de normalisation et d’unicité des tags | `conflit de normalisation et d’unicité des tags` | `DUPLICATE_TAG_NAME` | couvert |
| StorageKey absolu | `storageKey absolu` | `UNSAFE_STORAGE_KEY` | couvert |
| Traversée de répertoire | `storageKey traversant un répertoire` | `UNSAFE_STORAGE_KEY` | couvert |
| Location incohérente | `location incohérente` | `INVALID_PLAYABLE_LOCATION` | couvert |
| Availability inconnue | `availability inconnue` | `INVALID_AVAILABILITY` | couvert |
| `availabilityReason` incohérent | `availabilityReason incohérent` | `MISSING_AVAILABILITY_REASON` / `INVALID_AVAILABILITY_REASON` | couvert |
| Missing local accepté | `la disponibilité et la localisation des playables sont séparées` | `valid=true`, diagnostic `PLAYABLE_UNAVAILABLE` | couvert |
| Traitement `completed` incohérent | `traitement completed incohérent` | `COMPLETED_OUTPUT_MISSING` | couvert |
| Traitement échoué sans output | `traitement failed sans output` | accepté sans faux output | couvert |
| État de traitement valide | `état de traitement valide` | `completed` et `failed` acceptés selon leurs invariants | couvert |
| État de traitement inconnu | `état de traitement inconnu` | `INVALID_TREATMENT_STATUS` | couvert |
| Relations source d’un traitement incohérentes | `relations source d’un traitement incohérentes` | `TREATMENT_SOURCE_MISMATCH` | couvert |
| Plusieurs erreurs indépendantes | `plusieurs erreurs indépendantes sont rapportées séparément` | plusieurs codes et chemins distincts | couvert |
| Erreur / avertissement / indisponibilité | `erreur, avertissement et indisponibilité sont distingués` | tableaux séparés et codes distincts | couvert |
| Codes de diagnostic stables | `codes de diagnostic stables` | même entrée invalide, même code `MISSING_FIELD` | couvert |
| Chemins de diagnostic précis | `chemins de diagnostic précis` | `assets[0].title` | couvert |
| Validation invalide sans mutation | `validation invalide sans mutation` | entrée strictement identique après validation | couvert |
| Situation réconciliable | aucun cas canonique explicitement défini par 098 | tableau `reconcilable` exposé, aucune classification inventée | différé |
| `Playable.status` interdit | `la disponibilité et la localisation des playables sont séparées` | `PLAYABLE_STATUS_FORBIDDEN` | couvert |
| Relations sans listes persistées | `les projections sourceIds et playableIds ne deviennent pas une seconde vérité` | `PERSISTED_PROJECTION_FIELD` | couvert |

Les projections automatiques de collections ne sont pas implémentées dans ce
socle ; elles restent différées à la mission dédiée aux collections.

## technicalMetadata.status et écriture des versions futures

La relecture de `MEDIA_LIBRARY_MODEL.md` et du document 098 confirme qu’aucune
liste exhaustive de valeurs de `technicalMetadata.status` n’y est fixée. Le
validateur contrôle donc uniquement sa structure de chaîne lorsqu’elle est
présente, sans inventer silencieusement un enum. Cette limite contractuelle
doit être tranchée avant tout branchement fonctionnel qui dépendrait de cet
état.

Le résultat expose explicitement :

- `readable` : le format et la majeure sont lisibles par ce validateur ;
- `writeEligible` : signal structurel pour un futur writer ;
- `requiresUnknownFieldPreservation` : version mineure future détectée.

Une version mineure future (`1.1` avec support `1.0`) est lisible avec un
avertissement, mais `writeEligible=false`. Tant que les champs inconnus ne sont
pas préservés sans perte, toute réécriture doit être refusée par le futur
parcours d’écriture. `assertMediaLibrary` vérifie uniquement la validité
structurelle et ne constitue pas une autorisation d’écriture.

## Contrôles exécutés

- `node --check media-library-schema.js` — réussi ;
- `node --test test/media-library-contract.test.js` — 47/47 ;
- `npm.cmd run check` — réussi ; le contrôle ciblé du nouveau module a aussi été
  exécuté explicitement ;
- vérification TypeScript — non applicable : aucun `tsconfig`, fichier TypeScript
  ou script TypeScript n’existe dans le serveur Proto05 ;
- build — non applicable : `package.json` ne déclare aucun script de build ;
- serveur interactif, Chromium, téléchargement, FFmpeg, ffprobe, migration et
  tests fonctionnels existants — non exécutés conformément au périmètre.

`git diff --check` est exécuté après les modifications.

## Données réelles et branchement

Le nouveau validateur ne lit, ne migre et ne réécrit aucune donnée réelle. Il
est dormant et n’est appelé par aucune route, aucun résolveur de production,
aucun parcours étudiant/auteur/guidé et aucune écriture de `video-library.json`.
Les tests ne chargent que la fixture synthétique versionnée.

## Version et état Git

La version applicative reste **0.1.31**. Aucun incrément n’est nécessaire pour
ce socle interne dormant.

Les changements Git de cette mission sont limités au module, à sa fixture, à
ses tests, à la documentation serveur et à ce rapport. Aucun commit ni push n’a
été effectué.

Message de commit proposé, non exécuté :
`feat(proto05): add dormant canonical media library validator`.
