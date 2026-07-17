# Rapport 048 — Harmonisation du lecteur YouTube Proto05

Date : 17 juillet 2026

## Périmètre

Correction limitée à l’affichage du lecteur YouTube contrôlé. Aucun changement
du modèle vidéo, du catalogue, des données, des routes, de la synchronisation,
du proxy HLS ou du rendu HLS n’a été introduit.

## Fichier modifié

- `prototypes/05-augmented-ic-video-01/shared/ic-video-player.js`

Le lecteur YouTube ajoute désormais la classe d’affichage `youtube-active`.
Cette classe impose `width: 100%`, un ratio `16/9` et un iframe plein conteneur.
Les règles sont injectées uniquement pour cette classe ; le lecteur UGA/HLS
continue d’utiliser ses règles `video` existantes.

## Vérifications

- `npm.cmd run check` réussi.
- Parsing du lecteur partagé réussi.
- Vue étudiant UGA contrôlée dans Chromium à 1440 px : aucun changement de
  règle HLS appliqué ; l’état de page et les overlays restent présents.
- Fixture temporaire YouTube, sans écriture du canonique, contrôlée dans
  Chromium à 1440 px avec `FG4h0_v3oTk` : iframe étudiant `832.125 × 468.0625`
  (ratio 16:9), statut `Prêt`, contrôles YouTube présents.
- Atelier guidé contrôlé avec la même fixture : iframe `1280 × 720` (ratio
  16:9), contrôles présents et lecteur occupant la largeur de la scène.
- Les fixtures et serveurs temporaires ont été supprimés après recette.

## Données et version

Les cinq activités canoniques et leurs données n’ont pas été modifiées par cette
mission. La version applicative reste `0.1.17` ; le moteur reste
`index-0.0.9.html`.

## Limites

La validation UGA a confirmé la conservation du chemin et des règles HLS, mais
le flux distant reste dépendant de sa disponibilité runtime. La validation
humaine finale de David n’est pas remplacée par cette recette Chromium.

Message de commit proposé : `fix(proto05): harmonize YouTube player aspect ratio`

Aucun commit ni push réalisés.
