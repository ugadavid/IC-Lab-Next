# Mission 069 — Proto05 : socle persistant de la Library vidéo

## Résultat

Le socle persistant de la Library vidéo est ajouté exclusivement pour Proto05.
`data/video-library.json` est initialisé à partir du catalogue vidéo existant,
sans modifier `data/activities.json`. Les cinq activités et leur projection
`activity.video` restent inchangées.

## Modèle retenu

La Library contient trois collections :

- `assets` : `MediaAsset` logique, titre, statut, provenance, droits et liens ;
- `sources` : `MediaSource` originale, de type `local-file`, `direct-url`,
  `hls`, ainsi que la source YouTube historique contrôlée ;
- `playables` : `PlayableVersion` résolue, reliée à un asset et une source,
  avec statut, disponibilité, durée et descripteur de lecture.

Les fichiers locaux sont seulement déclarés par `storageKey` : aucun fichier
n’est importé, copié ou téléchargé. Les URL directes doivent être HTTPS et les
manifestes HLS externes passent par la validation UGA existante. YouTube reste
une intégration contrôlée, sans flux direct.

## Routes ajoutées

- `GET /api/proto05/library/assets`
- `POST /api/proto05/library/assets`
- `GET /api/proto05/library/assets/:assetId`
- `GET /api/proto05/library/playables/:playableId`

La résolution des activités consulte d’abord la Library puis conserve le
fallback catalogue de transition. `activity.videoRef` est progressivement
rattaché à l’asset dérivé du catalogue ; `activity.video` reste la projection
de compatibilité exposée et persistée par les routes existantes.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/data/video-library.json`
- `prototypes/05-augmented-ic-video-01/server/library-contract.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-persistence.test.js`

## Vérifications

- `npm run check` : OK.
- 4 tests Library : initialisation, ajout local/direct/HLS, résolution et
  conservation d’activité, persistance après redémarrage : OK.
- 5 tests média de compatibilité existants : OK.
- Les tests utilisent un serveur et des données temporaires ; aucune activité
  canonique n’a été écrite.
- Aucun autre prototype, IC-Hub ou composant général n’a été modifié.
- Aucun contrôle Chromium n’était nécessaire : cette mission ne modifie pas
  l’interface ni le lecteur.

## Version

Serveur Proto05 : `0.1.24` (précédemment `0.1.23`), incrément justifié par la
persistance et les routes minimales de Library.

## Limites restantes

Pas d’interface Library, d’import réel, de téléchargement, de copie locale,
d’anonymisation, de version dérivée, de contrôle de disponibilité distant ni
de bascule complète des ateliers vers la sélection d’assets. Ces sujets restent
à traiter dans les missions suivantes.

Message de commit proposé : `feat(proto05): persist video library assets and playables`
