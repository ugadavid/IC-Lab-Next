# Mission 185 — Import transactionnel du corpus REPLI4C

Date : 2 août 2026  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Statut : achevée techniquement, validation finale de David attendue  
Version : `0.1.62`, inchangée

## Résultat

Les 20 médias techniques manquants ont été créés dans MariaDB en une transaction
verrouillée. Les quatre médias déjà présents ont été conservés. Aucune activité,
aucun dossier, aucun tag et aucun enrichissement Qwen n'a été écrit. Le plan
post-import retrouve 24 correspondances exactes et zéro création.

## Historique des gardes

Le premier arrêt concernait la sauvegarde. Les dumps 17 h et 17 h 30 ont été
inspectés ; le dump 17 h 30 (`e4da9ae5…3f3dce`) a été restauré avec succès dans
MariaDB 11.8.6 isolée, puis l'environnement a été supprimé.

Le second arrêt a révélé `source.kind: remote`, incompatible avec l'enum 006.
David a autorisé la correction `remote` → `hls`. Le planificateur produit
désormais le type du manifeste et bloque toute valeur hors de : `local-file`,
`direct-url`, `hls`, `youtube-embed`, `derived-output`.

Le troisième arrêt concernait les cardinalités différentes entre v1 et v2.
David a confirmé que l'état du dump 17 h 30 et le snapshot v2 sont la référence
attendue, puis a explicitement approuvé le plan v2.

## Plans et hashes

| Élément | SHA-256 |
|---|---|
| manifeste sémantique | `549f9b8eb37d7aa963a81a5075632abf8cd23715db28a3ddad53f220aa4e48e1` |
| plan v1 sémantique, conservé intact | `36440eec6a9014210107c750152da472065b73656e9bd74284741040e20b9415` |
| plan v2 sémantique appliqué | `f928ed0476437344d9b00a40228e78408b96bc8083b40479cff5e300b6772140` |
| fichier plan v2 | `8dd95dd7f76d30c88a8e25bcbc4167399bcd9ef46fd8afc97b746dc42bada6d5` |
| snapshot pré-import approuvé | `7e1f44bf8f3e82b132bbc637f13e7f85cdd97d1a815d997ad556d1ae0007d221` |
| snapshot post-import | `098b9da22e1d6433712caae63ab20f893a3cf1c667ef8842f79a1d37b5a726f8` |
| plan post-import sémantique | `334ab58c7aa71c28092778fababa2787675e451719ac78a787057e446c37d99d` |
| fichier plan post-import | `483a5ff970661e3deccb85cdf0c4df910e1f1c974b3069d4715f303b66280e17` |
| reçu d'exécution | `c7b52053c941f170d009bd024708da09d909e9c2f04f19baca59fa8b39016c69` |

Le diff v1/v2 comporte les 20 remplacements autorisés `remote` → `hls`, les
hashes dérivés et les cardinalités/snapshot ultérieurement approuvés par David.
Entrées, IDs, URL, appariements, enrichissements exclus et propositions
d'activités sont inchangés.

## Implémentation

`corpus-import-apply.js` vérifie la confirmation, le hash interne du plan, le
corpus, le snapshot courant et les invariants. Il acquiert
`proto05_repli4c_corpus_import`, ouvre une transaction `SERIALIZABLE`, relit le
snapshot dans la transaction, appelle uniquement `sp_media_register_import`,
réconcilie à 24/0 avant commit et libère transaction, connexion et verrou sur
succès ou erreur. L'ancien plan n'est jamais transformé à l'application.

Le CLI `corpus-import.js apply` exige le manifeste, le plan, son hash attendu et
la confirmation `APPLY PROTO05 REPLI4C CORPUS`. Aucun réseau, téléchargement,
FFmpeg ou Qwen n'est appelé.

## Tests avant mutation

- syntaxe des trois modules : réussie ;
- tests planificateur et apply : 40/40 ;
- avec migrations techniques : 56/56 ;
- MariaDB temporaire restaurée depuis le dump 17 h 30 ;
- rollback prouvé depuis de nouvelles connexions après 1, 10 et 20 créations ;
- application temporaire : 20 créations, puis 24 appariements/0 création ;
- ancien plan temporaire refusé ;
- second passage temporaire : no-op et snapshot strictement identique ;
- conteneur temporaire supprimé avant application réelle.

Le test Media Library préexistant dépassant son timeout n'a pas été relancé,
conformément à l'instruction de mission. Aucun serveur, interface, FFmpeg, Qwen
ou accès réseau externe n'a été lancé.

## Préflight réel et transaction

Juste avant mutation, un nouveau plan a été recalculé en lecture seule. Il était
byte-à-byte identique au plan v2 approuvé : snapshot `7e1f44…d221`, 24 entrées,
4 appariements, 20 créations, 20 sources `hls`, 0 `remote`, 0 conflit, 0
blocker. La transaction réelle a ensuite créé exactement 20 assets, 20 sources,
20 playables et 20 métadonnées techniques minimales.

## Médias créés

Les identifiants vidéo créés sont : `36970`, `36972`, `36975`, `36977`,
`36978`, `36979`, `36980`, `36982`, `36983`, `36984`, `36985`, `36987`,
`36988`, `36995`, `36996`, `36997`, `36998`, `37000`, `37001`, `37003`.

Pour chaque identifiant `N` : asset `media-proto05-uga-N`, source
`source-proto05-uga-N`, playable `video-proto05-uga-N`, type `hls`, URL UGA
`…/N/livestream.m3u8`. La lecture finale établit 20 identités externes uniques,
20 URL uniques, 20 sources HLS et 20 playables HLS.

## Validation post-import

| Cardinalité | Avant | Après |
|---|---:|---:|
| assets | 31 | 51 |
| sources | 35 | 55 |
| playables | 35 | 55 |
| activités | 8 | 8 |
| traitements | 2 | 2 |

Les dossiers restent à 6 et les tags à 8. Les snapshots protégés de 36971,
36973, 36976 et 37004 ont exactement les mêmes hashes avant/après, notamment la
description humaine de 36971 et l'activité liée à 37004. Les agrégats finaux
confirment zéro champ éditorial/droit/description injecté et zéro durée,
analyseur ou version d'analyseur issu de Qwen.

Le plan post-import contient 24 appariements exacts, 0 création, 24
enrichissements toujours `to-verify` et non canoniques, 2 activités toujours
seulement proposées, 0 conflit et 0 blocker.

## Idempotence et reçu

Le plan v2 pré-import est refusé avec « Le plan fourni ne correspond plus au
snapshot MariaDB courant ». Le plan post-import a ensuite été appliqué avec
`appliedCount: 0`. Les plans recalculés avant et après ce no-op sont strictement
identiques et conservent le snapshot `098b9d…726f8`.

Reçu :
`imports/receipts/repli4c-24-videos.m185.receipt.json`. Il référence le manifeste,
le plan v2, son fichier, les snapshots pré/post, le plan post-import et les 20
lignes créées. Le plan v1 incompatible reste conservé pour traçabilité.

## Fichiers modifiés ou créés

- `server/corpus-import-plan.js` ;
- `server/corpus-import-apply.js` ;
- `server/scripts/corpus-import.js` ;
- `server/test/corpus-import-plan.test.js` ;
- `server/test/corpus-import-apply.test.js` ;
- `imports/plans/repli4c-24-videos.v2.plan.json` ;
- `imports/plans/repli4c-24-videos.post-import.plan.json` ;
- `imports/receipts/repli4c-24-videos.m185.receipt.json` ;
- `reports/185_proto05_24_video_corpus_transactional_import_report.md`.

`git diff --check` réussit. État Git final :

```text
 M prototypes/05-augmented-ic-video-01/server/corpus-import-plan.js
 M prototypes/05-augmented-ic-video-01/server/scripts/corpus-import.js
 M prototypes/05-augmented-ic-video-01/server/test/corpus-import-plan.test.js
?? prototypes/05-augmented-ic-video-01/imports/plans/repli4c-24-videos.post-import.plan.json
?? prototypes/05-augmented-ic-video-01/imports/plans/repli4c-24-videos.v2.plan.json
?? prototypes/05-augmented-ic-video-01/imports/receipts/
?? prototypes/05-augmented-ic-video-01/server/corpus-import-apply.js
?? prototypes/05-augmented-ic-video-01/server/test/corpus-import-apply.test.js
?? reports/185_proto05_24_video_corpus_transactional_import_report.md
```

Aucun commit ni push. Validation humaine finale de David encore attendue.

Message de commit proposé :

```text
feat(proto05): import REPLI4C corpus transactionally
```
