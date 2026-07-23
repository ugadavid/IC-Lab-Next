# Mission 076 — Première version dérivée anonymisée Proto05

## Périmètre et version

Mission limitée à `prototypes/05-augmented-ic-video-01`. Version serveur Proto05 conservée en `0.1.29` : aucune modification de version n’était nécessaire après la mission 075.

La chaîne réalisée est :

`source HLS distante → job de préparation temporaire → job de dérivation → validation FFmpeg → copie persistante atomique → asset/playable Library`.

Les activités existantes, `videoRef`, `activity.video`, les sources UGA, YouTube, directes et locales ne sont pas réécrits.

## Contrat et méthode

Routes ajoutées :

- `POST /api/proto05/library/hls-derivations`
- `GET /api/proto05/library/hls-derivations/:jobId`
- `DELETE /api/proto05/library/hls-derivations/:jobId`

Le job référence le `preparationJobId`, l’asset source, les masques, la méthode, l’état, la progression, les métadonnées FFmpeg et le résultat dérivé.

La méthode réellement implémentée est `ffmpeg-drawbox-rectangles`. Elle applique des rectangles noirs déterministes avec `drawbox`. Le masque par défaut couvre les ratios `x=0, y=0, width=0.2, height=0.2`; des masques explicites peuvent être fournis, avec validation stricte des ratios et de leur inclusion dans l’image. Il ne s’agit pas d’une détection automatique de visages.

Les états exposés sont `prêt`, `anonymisation`, `validation`, `terminé`, `annulé`, `échoué` et `expiré`.

FFmpeg est recherché via `FFMPEG_PATH`, puis le `PATH`. La sortie est encodée en H.264/AAC avec `-movflags +faststart`, puis relue par FFmpeg en mode erreur avant persistance. Les limites de taille, durée et temps sont conservées depuis la préparation et contrôlées également pendant la dérivation.

## Persistance et traçabilité

Le nouvel asset est ajouté à `data/video-library.json` uniquement après réussite complète et écriture atomique avec sauvegarde. Le fichier final est copié dans `data/video-library-media/` via un fichier temporaire puis renommé.

La provenance conserve notamment : URL HLS d’origine, asset source, `sourcePreparationJobId`, méthode, masques, version FFmpeg, date, hash SHA-256, taille et statut. Le source asset n’est jamais supprimé.

Les workspaces de préparation et de dérivation sont supprimés après succès, échec ou annulation. Le manifeste et les segments temporaires ne sont pas conservés durablement. Aucun fichier temporaire n’est ajouté au dépôt.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- ce rapport

## Vérifications

- `npm run check` : réussi.
- Test temporaire FFmpeg/HLS : préparation, dérivation effective, validation du MP4, hash, asset/playable, provenance, suppression du workspace source, lecture Range, redémarrage et persistance : réussi.
- Annulation et nettoyage de préparation : réussi.
- Refus des sources non HLS ou inconnues : réussi.
- Les activités canoniques restent inchangées pendant le test.
- Chromium à 1440 px : Library chargée, action HLS visible, aucune erreur applicative, aucun débordement horizontal. La chaîne interactive complète de dérivation n’a pas pu être exécutée sur le serveur canonique faute de fixture HLS locale ; elle est couverte par le test serveur temporaire.

## Limites restantes

La détection et le suivi automatiques des visages ne sont pas implémentés. Les masques doivent encore être définis explicitement. Il n’y a pas encore d’éditeur visuel des masques, de reprise distribuée, de suppression utilisateur des dérivés ni de gestion avancée des droits.

Validation humaine : non effectuée. Aucun commit ni push n’a été réalisé.

Message de commit proposé, non créé : `proto05: persist first anonymized HLS derivative`
