# Mission 145 — Résurrection des vidéos et audit de sortie du backend JSON

Date : 2026-07-30  
Prototype : Proto05 — Vidéo augmentée  
Version applicative relevée : `0.1.48` — inchangée  
Commit de départ : `8f58440`  
Commit et push : aucun

## 1. Résultat

Le défaut a été reproduit sur une vidéothèque entièrement jetable par le
parcours enseignant réel sous Chromium.

La copie locale ne recréait pas directement une ligne supprimée. Le premier
maillon fautif se trouvait dans la suppression :

1. l’interface retirait la carte après une réponse HTTP de succès ;
2. `removeLibraryAsset()` supprimait l’asset dans la projection applicative ;
3. `persistLibraryMutation()` transmettait cette projection à
   `persistVideoLibrary()` ;
4. `canonicalFromRuntime()` complétait volontairement la projection partielle
   avec le document canonique antérieur ;
5. l’asset absent de la projection était donc réintroduit avant l’écriture ;
6. un rechargement ultérieur, notamment après la création d’une copie locale,
   révélait cette suppression jamais persistée.

Deux facteurs aggravaient le comportement :

- le launcher enseignant exécutait `npm start`, dont le mode implicite restait
  `json` ;
- la finalisation d’une copie locale clonait puis réécrivait la totalité du
  catalogue capturé par le contexte de lecture. En mode MariaDB, ce snapshot
  global pouvait devenir obsolète pendant le téléchargement.

Les trois points sont corrigés :

- la suppression retire désormais l’asset, ses sources et ses playables dans le
  modèle canonique lui-même ;
- la copie locale utilise une mutation ciblée ; en MariaDB, elle insère
  transactionnellement uniquement la nouvelle source, le nouveau playable et
  ses métadonnées, puis met à jour l’horodatage de l’asset et du document ;
- le launcher officiel charge la configuration locale non versionnée et impose
  explicitement `mariadb`.

Le backend JSON n’est pas supprimé : il reste disponible explicitement pour les
tests, la comparaison et l’audit de sortie.

## 2. Précautions et témoins initiaux

Le dépôt n’était pas propre au départ. La Mission 144 était présente sans
commit, notamment dans `server.js`, `proto05-mariadb-write.js`,
`proto05-data-read-boundary.test.js`, la fiche Vidéo++ et
`data/video-library.json`. Ces changements ont été conservés. Les ajouts de la
Mission 145 sont limités aux parcours décrits dans ce rapport.

### 2.1 Empreintes des documents réels

| Document | SHA-256 initial et final |
|---|---|
| `data/activities.json` | `6F6C64DBC34B70AD279AF1D0F016AFD27A1DE9D9C011C3C07DD7E537A9F638D3` |
| `data/activity-library.json` | `63CE330896759421397C987CCC685884FFB6E1C93663B68B7D3D6EAD4C1C256A` |
| `data/video-catalog.json` | `89A73A4065AB84AE1B676D25FBE62FD17FEB0FB51302997B49999E68B05FE373` |
| `data/video-library.json` | `45BAD35FA47A9E91E8F81D73F1933FAEEB0DCE03D2555A2BD763B7B486D8C5B7` |

La valeur de `video-library.json` inclut les modifications préexistantes de la
Mission 144 et la copie UGA créée avant la Mission 145. La Mission 145 ne l’a pas
modifiée.

### 2.2 Fichiers vidéo physiques observés

Les cinq fichiers présents avant la mission sont toujours présents avec les
mêmes empreintes :

| SHA-256 | Rôle observé |
|---|---|
| `5D624B6D72597EB046AA68D982BEBB079318325EA96B576BB5BCBFEDB4A0DA5D` | dérivé anonymisé historique |
| `E88D23DE161345885DDC9E5C977DE96D2F5FAFA9DC29D63EAB3BE8E2E3914823` | dérivé workspace |
| `F4DD436C50E8BEA3CBB7704D263DFDC03C1BD94181515C7D0977CEF889E2C1F3` | dérivé workspace |
| `47A3E7CF005C9FDC05F8062479714D98FBDE9C6C030BA47F923A5CB5DBD753D3` | source locale workspace |
| `B6DDD6A7229A7528FDA2AF45D1033676088B9253984281082B051AC54C8CBF27` | copie UGA créée avant la mission |

Aucun fichier réel n’a été supprimé. Les deux répertoires `temp` réels observés
à la fin sont vides.

### 2.3 États de stockage distingués

Avant correction :

- projection MariaDB : `16` assets, `19` sources, `19` playables ;
- document JSON : `16` assets, `20` sources, `20` playables ;
- la source et le playable supplémentaires du JSON désignent la copie UGA
  physique `B6DDD6…` ;
- cette copie n’existe pas dans la projection MariaDB ;
- les anciens assets visibles sont déjà des lignes MariaDB : l’opération de
  copie observée n’a pas recréé ces lignes SQL.

Cette distinction empêche de confondre :

- une entrée de catalogue ;
- une ligne SQL ;
- une relation source/playable ;
- un fichier physique ;
- une divergence entre autorités JSON et MariaDB.

## 3. Reproduction isolée

Le test ajouté crée trois références distantes temporaires :

- une vidéo à retirer ;
- une vidéo dont une copie locale doit être créée ;
- une vidéo témoin qui ne doit pas changer.

Le navigateur effectue réellement :

1. ouverture de `/teacher/videos` ;
2. menu `Actions` de la première vidéo ;
3. `Retirer de la Library` ;
4. confirmation dans le dialogue enseignant ;
5. menu `Actions` de la deuxième vidéo ;
6. `Créer une copie locale de travail` ;
7. démarrage du traitement ;
8. rechargement de la vidéothèque.

Avant correction, la première vidéo restait dans le document canonique malgré
la réponse HTTP de succès. Après correction :

- asset, sources et playables retirés restent absents ;
- la copie locale n’est créée que sur l’asset cible ;
- l’asset témoin est strictement identique ;
- le `.bak` précédant la copie ne contient déjà plus l’asset retiré ;
- l’état reste identique après redémarrage ;
- aucune erreur navigateur n’est relevée.

Toutes les données et tous les fichiers de ce scénario vivaient dans le dossier
temporaire du test et ont été supprimés par son nettoyage.

## 4. Correction

### 4.1 Suppression canonique

`removeLibraryAsset()` ne passe plus par une projection applicative dont
l’absence peut signifier « champ non projeté ». Il clone le document canonique
courant, retire explicitement :

- l’asset ;
- ses sources ;
- ses playables ;

puis valide et persiste ce document.

### 4.2 Copie JSON ciblée

La copie JSON est sérialisée par la file d’écriture. Le clone du document est
pris à l’intérieur de cette file, au dernier moment, puis seuls les objets de la
copie sont ajoutés. Une suppression déjà validée ne peut donc pas être remplacée
par un snapshot capturé avant elle.

### 4.3 Copie MariaDB ciblée et transactionnelle

La frontière d’écriture expose désormais `appendWorkingCopy()`.

La transaction :

1. vérifie les grants applicatifs ;
2. prend le verrou applicatif existant ;
3. ouvre une transaction `SERIALIZABLE` ;
4. verrouille uniquement l’asset cible et le playable source ;
5. refuse un asset supprimé ou une destination déjà présente ;
6. insère une ligne `media_sources` ;
7. insère une ligne `media_playables` ;
8. insère sa ligne `media_playable_metadata` ;
9. met à jour l’horodatage de l’asset ;
10. met à jour l’horodatage documentaire ;
11. relit les tables et vérifie les cardinalités ;
12. commit uniquement si la relecture ciblée est conforme.

Delta attendu :

| Table | Delta |
|---|---:|
| `media_assets` | `0` |
| `media_sources` | `+1` |
| `media_playables` | `+1` |
| `media_playable_metadata` | `+1` |
| toutes les autres tables | `0` |

La transaction n’exécute aucun `DELETE` et ne réécrit aucune autre vidéo.
Le fichier final est retiré si la transaction échoue.

### 4.4 Démarrage enseignant

`scripts/windows/start-proto05.bat` :

- exige la présence de `../.env.local` sans le lire ni l’afficher ;
- fixe `PROTO05_DATA_MODE=mariadb` ;
- lance Node avec `--env-file=../.env.local`.

Le mode implicite de `npm start` reste provisoirement `json`. Son retrait relève
de la Mission 146.

## 5. Données probablement perçues comme « ressuscitées »

L’état MariaDB actuel contient notamment :

- dix assets `media-proto05-anonymized-*`, dont un seul est projeté avec une
  copie locale disponible ;
- `media-proto05-local-37db64d0529dda8c85791283` (`Test_0`) ;
- `media-proto05-local-video-37004-1080p` ;
- `media-proto05-video-proto05-youtube-fg4h0-v3otk`
  (`Vidéo de test — YouTube contrôlé`).

Ces entrées ont des caractéristiques de développement ou des médias locaux
indisponibles. Elles sont donc des candidates raisonnables à une revue humaine,
pas des suppressions automatiquement autorisées.

Les faits disponibles ne permettent pas d’affirmer lesquelles David avait
retirées. Elles existaient déjà en MariaDB avant l’opération de copie. La copie
UGA supplémentaire est, à l’inverse, présente seulement dans le JSON et sur
disque : c’est une divergence de stockage distincte.

## 6. Procédure de nettoyage proposée — non exécutée

1. Arrêter les écritures Proto05.
2. Exporter la liste MariaDB des assets, sources, playables, traitements,
   relations d’activités et métadonnées.
3. Sauvegarder la base et consigner son empreinte.
4. Relever séparément les fichiers physiques et leurs SHA-256.
5. Faire valider par David chaque asset candidat à partir de son titre et de son
   identifiant stable.
6. Pour chaque candidat, exécuter le plan de dépendances de la fiche :
   activités, dérivations, publications, lignées et fichiers partagés.
7. Refuser toute suppression ambiguë ou dépendante.
8. Retirer d’abord uniquement l’entrée de catalogue par l’application.
9. Vérifier directement les lignes et relations SQL, l’API, l’interface et un
   redémarrage.
10. Traiter une éventuelle suppression physique dans une opération séparée,
    avec sauvegarde et autorisation explicite.
11. Comparer les cardinalités et les empreintes des fichiers non ciblés.

Aucune étape de cette procédure n’a été appliquée à l’état réel.

## 7. Audit de sortie du backend JSON

| Élément | Lecture JSON | Écriture JSON | Équivalent MariaDB | Recommandation |
|---|---|---|---|---|
| Sélection du mode au démarrage | oui en `json` et `compare` | non | complète | corriger : supprimer le défaut implicite JSON en Mission 146 |
| Activités et atelier guidé | `activities.json` en `json`/`compare` | oui en `json` | complète en `mariadb` | retirer du runtime après refactor des fixtures |
| Classement des activités | `activity-library.json` | oui | complète | retirer du runtime |
| Référentiel de langues | fichier partagé en `json`/`compare` | non | table `languages`, complète | garder le fichier comme source partagée/migration, pas comme fallback applicatif |
| Catalogue vidéo historique | chargé au démarrage en `json`/`compare` | oui | projection depuis les tables média | retirer comme autorité runtime |
| Assets, sources et playables | `video-library.json` | oui | complète en lecture | retirer l’autorité JSON ; conserver temporairement les outils de conversion |
| Import local | catalogue JSON + fichier géré | snapshot MariaDB global | équivalence fonctionnelle, mutation encore globale | corriger vers une mutation SQL ciblée |
| Référence distante / import UGA | catalogue JSON | snapshot MariaDB global | équivalence fonctionnelle, mutation encore globale | corriger vers une mutation SQL ciblée |
| Copie locale FFmpeg | catalogue JSON | ciblée après Mission 145 | ciblée et transactionnelle | correction acquise |
| Traitements et dérivations | catalogue JSON | snapshot global | tables présentes, écriture globale | corriger avant exclusivité MariaDB |
| Familles et filiations | catalogue JSON | snapshot global | tables/colonnes présentes | conserver le contrat métier, cibler les mutations |
| Dossiers, tags et classification vidéo | catalogue JSON | snapshot global | tables présentes | corriger vers des mutations ciblées |
| Fiche Vidéo++ | propriétés JSON des assets | snapshot global | colonnes dédiées et JSON MariaDB | conserver ; achever la validation Mission 144 |
| Suppression d’asset | document canonique après correction | oui en mode JSON | fonctionnelle par snapshot global | conserver la correction ; cibler la suppression en Mission 146 |
| Suppression de copie et de dérivation | document canonique | snapshot global | fonctionnelle mais globale | corriger vers des transactions ciblées |
| Publication et liens d’activités | JSON d’activité et média | snapshot global | tables présentes | garder le contrat, retirer le fallback JSON |
| Modes `compare` et `mariadb-readonly` | oui seulement en `compare` | refusée | complète | conserver éventuellement comme outils diagnostiques explicites |
| Exports JSON utilisateur | produit côté client | fichier choisi par l’utilisateur | sans objet | garder : ce n’est pas un backend |
| Fixtures de tests | nombreux tests chargent les JSON | uniquement copies temporaires | partiel selon les tests | garder mais injecter des fixtures autonomes, non une autorité production |
| Dry-run et migrations historiques | lisent les quatre documents | rapports, sauvegardes et SQL contrôlés | objet même de ces outils | garder hors runtime, documenter comme outils historiques |
| Installateurs média historiques | lisent/écrivent des copies JSON | oui sur cibles explicites | remplacés pour la production | archiver ou réserver aux tests/migrations |
| Colonnes JSON MariaDB | non | non | stockage relationnel MariaDB | garder : elles ne constituent pas le backend fichier JSON |
| Documentation d’architecture ancienne | décrit encore JSON comme autorité | non | incohérente avec le launcher actuel | corriger en Mission 146 avec le cutover définitif |

### 7.1 Éléments à ne pas supprimer

- exports JSON demandés par l’utilisateur ;
- fixtures locales et copies temporaires de tests ;
- scripts de migration, dry-run et restauration, clairement séparés du runtime ;
- colonnes JSON internes à MariaDB ;
- comparateur sémantique, utile tant que le cutover n’est pas officiellement
  clos.

### 7.2 Périmètre recommandé de la Mission 146

1. Faire de MariaDB l’unique autorité applicative de production.
2. Supprimer le défaut silencieux `json` et exiger un mode explicite ou
   MariaDB.
3. Retirer le chargement des quatre documents JSON du démarrage normal.
4. Retirer les branches d’écriture JSON de l’API de production.
5. Remplacer les snapshots SQL globaux restants par des mutations ciblées pour
   import, références distantes, classification, traitements, dérivations,
   publications et suppressions.
6. Refactorer les tests pour injecter leurs fixtures au lieu de dépendre des
   documents suivis réels.
7. Conserver les outils historiques dans un espace clairement non runtime.
8. Mettre à jour `docs/ARCHITECTURE.md`, `STATUS.md` et les guides après le
   cutover.
9. Ne nettoyer les anciennes lignes qu’après décision humaine distincte.

## 8. Vérifications

### 8.1 Contrôles réussis

- validation syntaxique Node des fichiers modifiés ;
- `23/23` tests ciblés bibliothèque, suppression, persistance et copie ;
- recette Chromium Mission 145 sur `/teacher/videos`, fenêtre `1440 × 1000` ;
- absence d’erreur navigateur dans le scénario cumulatif ;
- test transactionnel ciblé MariaDB sur modèle contrôlé :
  - succès avec deltas `0/+1/+1/+1` ;
  - aucun `DELETE` ;
  - rollback forcé sans commit ;
- essai réel MariaDB volontairement annulé après les cinq écritures :
  - job attendu `failed` ;
  - aucune copie locale projetée ;
  - asset vidéo jetable retiré ;
  - cardinalités projetées avant/après `16/19/19` ;
  - état identique après redémarrage ;
- démarrage réel du serveur corrigé : mode `mariadb`, `16` assets ;
- empreintes des quatre JSON et des cinq vidéos réelles inchangées ;
- aucun objet contenant `m145` ni fichier `.incomplete` dans le workspace réel ;
- aucun listener restant sur `8791` ;
- `git diff --check` réussi, hors avertissements CRLF informatifs.

### 8.2 Contrôle non vert préexistant

La suite complète `proto05-data-read-boundary.test.js` donne `11/12`. Le seul
échec est le test de mapping global, sur deux champs
`assets[].editorialMetadata` ajoutés par la Mission 144 au JSON de travail mais
absents du modèle déterministe produit par la migration historique `001`.

Le nouveau test Mission 145 de copie MariaDB ciblée passe. Cette divergence
Vidéo++ préexistait avant la correction et n’a pas été masquée ni élargie dans
la Mission 145. Elle doit être fermée dans le périmètre Mission 144 ou dans son
intégration avant le prochain commit commun.

## 9. Fichiers de la Mission 145

- `scripts/windows/start-proto05.bat`
- `PROJECTS_LAUNCH.md`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-write-boundary.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-ffmpeg-download.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/proto05-data-read-boundary.test.js`
- `reports/145_proto05_video_resurrection_json_exit_audit_report.md`

Plusieurs de ces fichiers contiennent aussi des changements préexistants de la
Mission 144 ; ils ne doivent pas être écrasés ni attribués en totalité à la
Mission 145.

## 10. Recette humaine minimale laissée à David

1. Démarrer Proto05 par le launcher Windows.
2. Vérifier dans `/api/health` que `dataMode` vaut `mariadb`.
3. Créer deux vidéos jetables depuis la vidéothèque.
4. Retirer la première de la Library sans supprimer de fichier réel.
5. Recharger la page et vérifier son absence.
6. Créer une copie locale de travail de la seconde.
7. Recharger puis redémarrer le serveur.
8. Vérifier que la première reste absente, que la seconde possède sa copie et
   que les autres fiches n’ont pas changé.
9. Nettoyer uniquement les deux entrées jetables selon leurs dépendances.

Cette recette humaine n’a pas été effectuée par David dans le cadre de la
mission ; les contrôles Chromium de Codex ne la remplacent pas.

## 11. Message de commit proposé

`fix(proto05): prevent video resurrection and target working-copy writes`
