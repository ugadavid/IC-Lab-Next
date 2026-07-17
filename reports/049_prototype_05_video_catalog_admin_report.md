# Rapport 049 — Catalogue vidéo administrable de Proto05

Date : 17 juillet 2026

## Périmètre

Le catalogue vidéo de `prototypes/05-augmented-ic-video-01` est désormais
persisté dans `data/video-catalog.json`, propriété de Proto05. Les deux sources
existantes sont conservées : UGA/HLS et YouTube `FG4h0_v3oTk`.

L’espace enseignant expose `/teacher/videos` pour ajouter et consulter une
source. Le serveur accepte uniquement les URL d’intégration YouTube ou les
identifiants vidéo valides, et uniquement les playlists UGA autorisées. Les
écritures du catalogue sont validées, sauvegardées et atomiques. Les activités
restent référencées par une source présente et validée dans ce catalogue.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/data/video-catalog.json` : catalogue persistant UGA + YouTube.
- `prototypes/05-augmented-ic-video-01/server/server.js` : chargement, validation, API GET/POST, persistance et contrôle des références.
- `prototypes/05-augmented-ic-video-01/server/package.json` : version serveur.
- `prototypes/05-augmented-ic-video-01/teacher-videos.html` : interface de gestion.
- `prototypes/05-augmented-ic-video-01/teacher.html` : lien depuis la bibliothèque enseignant.
- `prototypes/05-augmented-ic-video-01/shared/ic-video-player.js` : lecture des identifiants YouTube validés du catalogue.

`data/activities.json` n’a pas été modifié. Les cinq activités canoniques sont
toujours présentes. Le proxy HLS, les routes HLS et le modèle d’activité n’ont
pas été transformés.

## Contrôles réalisés

- Quatre contrôles ciblés sur une copie temporaire : ajout YouTube, ajout HLS UGA valide, refus d’une URL libre et maintien de l’activité UGA historique.
- `npm run check` dans `server` : réussi.
- Validation Chromium à largeur représentative : page de catalogue visible, sources UGA/YouTube affichées, ajout de `FG4h0_v3oTk`, puis source disponible dans l’atelier d’édition ; aucune donnée canonique n’a été écrite.
- Contrôle final : catalogue canonique à 2 sources et `activities.json` à 5 activités.

## Limites restantes

- La recette Chromium n’a pas sauvegardé une activité YouTube canonique : elle
  a utilisé une copie temporaire pour respecter la propriété des données.
- La disponibilité réseau effective de chaque vidéo distante n’est pas garantie
  par cette recette locale ; aucun flux YouTube direct n’est récupéré et aucun
  changement n’a été apporté au proxy HLS.
- L’interface n’implémente pas encore la suppression ou l’édition d’une source.

## Version

Version serveur modifiée de `0.1.17` à `0.1.18`. Le moteur étudiant reste
`index-0.0.9.html`.

## Suite possible

Ajouter ultérieurement la gestion explicite du cycle de vie des sources, avec
contrôle des références avant toute désactivation.

Message de commit proposé : `feat(proto05): administrer le catalogue vidéo contrôlé`

Aucun commit ni push n’a été effectué.
