# Mission 071 — Importer une copie locale dans la Library Proto05

## Résultat

Une copie gérée de `temp/video_37004_1080p.mp4` a été créée dans :

`prototypes/05-augmented-ic-video-01/data/video-library-media/video_37004_1080p.mp4`

L’original n’a pas été modifié. Les deux fichiers ont le même SHA-256 :
`1583A15EC897DC283E946A85E8EA4BEF81F262BA08BA89C5D06B8C9A95425AA2`.

La Library contient désormais :

- asset `media-proto05-local-video-37004-1080p` ;
- source `source-proto05-local-video-37004-1080p`, de type `local-file` ;
- playable `video-proto05-local-video-37004-1080p`, fournisseur `local` ;
- provenance avec le chemin original et le chemin de copie gérée.

La copie est lisible via `/api/proto05/library/media/video_37004_1080p.mp4`, avec support des requêtes HTTP partielles. L’interface Library propose son aperçu. L’atelier guidé consomme maintenant la source vidéo résolue et ne force plus le proxy HLS pour cette source locale.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/data/video-library.json`
- `prototypes/05-augmented-ic-video-01/data/video-library-media/video_37004_1080p.mp4`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/shared/ic-video-player.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- tests temporaires Proto05 pour les serveurs de copie et la persistance Library.

## Vérifications

- `npm run check` : OK, serveur Proto05 `0.1.26`.
- 11 tests ciblés Library/média : OK.
- Chromium, Library : asset local affiché, aperçu chargé, absence de débordement horizontal.
- Chromium, atelier guidé sur une copie temporaire de `proto05-copy-1784236861048-984dec` : source locale chargée, durée détectée `939,237667 s` (15:39), contrôles natifs visibles, absence d’erreur applicative et absence de débordement.
- Serveur relancé et vérifié en `0.1.26` sur le port Proto05 habituel.

Ces recettes Chromium sont des contrôles effectués par Codex ; aucune validation humaine n’est déclarée.

## Limites et suite

Aucun téléchargement distant, import physique générique, anonymisation ou version dérivée n’est introduit. La durée n’est pas persistée dans la Library : elle est lue par le navigateur à partir du MP4. La sélection générique de fichier et la gestion complète des droits restent à traiter dans une mission ultérieure.

Version modifiée : `0.1.26` pour le serveur Proto05. Aucun autre prototype, IC-Hub ou dépôt canonique d’activités n’a été modifié par les tests.

Message de commit proposé : `Proto05: import managed local video into Library`
