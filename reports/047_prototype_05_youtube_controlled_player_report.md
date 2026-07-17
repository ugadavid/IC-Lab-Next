# Rapport 047 — Proto05, source YouTube contrôlée

Date : 17 juillet 2026

## Périmètre

Ajout d’une source YouTube contrôlée au catalogue vidéo de Prototype 05, avec
sélection par provider et adaptateur commun de lecture UGA/HLS et YouTube.
Les uploads, URLs libres, vidéos locales et conversions restent hors périmètre.

## Fichiers concernés par la mission

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/shared/ic-video-player.js`
- `prototypes/05-augmented-ic-video-01/index-0.0.9.html`

L’atelier auteur utilise déjà le endpoint catalogue et le champ `videoId` ; son
choix contrôlé expose donc automatiquement les deux entrées. L’atelier guidé
est adapté au runtime par le serveur pour utiliser le même adaptateur sans
modifier son modèle d’annotation.

## Réalisation

- Catalogue ajouté : `provider: "youtube"`, `videoId: "FG4h0_v3oTk"` et
  `embedUrl` exact fourni.
- YouTube chargé exclusivement via l’API officielle YouTube IFrame.
- Paramètres IFrame configurés : `enablejsapi=1`, `playsinline=1`, `origin` égal
  à `location.origin`.
- Aucune URL YouTube libre ni proxy HLS YouTube n’est accepté.
- Interface commune : chargement, durée, position, lecture/pause, seek,
  disponibilité, états lecture/pause et erreur.
- UGA conserve `proxyUrl`, hls.js et le proxy HLS existant.
- Version serveur et package : `0.1.17`. Le moteur reste
  `index-0.0.9.html`.

## Contrôles réalisés

1. `npm.cmd run check` réussi.
2. Parsing JavaScript du lecteur partagé réussi.
3. Endpoint health/catalogue validé : serveur `0.1.17`, providers `uga` et
   `youtube`, identifiant et URL YouTube exacts.
4. Contrôle statique des données : cinq activités présentes et aucune activité
   canonique enrichie avec les champs YouTube ; aucun test n’a écrit dans
   `data/activities.json`.

## Non vérifié et limites

- Validation Chromium UGA et YouTube non obtenue : le navigateur intégré ne
  pouvait pas joindre le serveur local, alors que `curl` atteignait bien
  `127.0.0.1:8791`.
- La durée YouTube reste fournie par l’IFrame API à la disponibilité du lecteur,
  et non stockée dans le catalogue.
- La recette humaine de chargement, lecture/pause, seek depuis timeline et
  message d’erreur d’intégration reste à faire dans un Chromium pouvant joindre
  le service local.

## Suite possible

Rejouer la recette Chromium demandée, puis confirmer manuellement le comportement
de la vidéo YouTube test et du flux UGA historique.

Message de commit proposé : `feat(proto05): add controlled YouTube video provider`

Aucun commit ni push réalisés.
