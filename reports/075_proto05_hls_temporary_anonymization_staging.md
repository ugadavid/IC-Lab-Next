# Mission 075 — Préparation HLS temporaire pour anonymisation

## Périmètre

Socle temporaire Proto05 uniquement. Aucune activité canonique, source existante, version dérivée finale ou entrée de Library n’est créée ou modifiée par la préparation.

## Réalisation

- Version serveur Proto05 : `0.1.29`.
- Ajout de jobs en mémoire pour les sources HLS de la Library uniquement.
- Résolution stricte `assetId` / `playableId` / `sourceId` puis validation de l’URL `.m3u8` par le contrôle HTTP(S)/DNS existant, avec refus des adresses privées ou internes.
- FFmpeg est recherché via `FFMPEG_PATH`, puis dans `PATH`.
- Chaque job utilise un répertoire dédié sous le répertoire temporaire du système (`proto05-hls-preparations`), jamais `data/video-library-media/`.
- La sortie temporaire est produite en MP4, avec limites de durée, de taille, de temps d’exécution et durée de rétention. Une annulation, une erreur FFmpeg ou un dépassement nettoie le workspace.
- La réponse expose l’état, la progression, les métadonnées temporaires et une fin d’expiration, sans exposer de chemin arbitraire.

Routes ajoutées :

- `POST /api/proto05/library/hls-preparations`
- `GET /api/proto05/library/hls-preparations/:jobId`
- `DELETE /api/proto05/library/hls-preparations/:jobId`

L’interface Library affiche l’action « Préparer pour anonymisation » pour les cartes HLS et restitue les états de préparation, de réussite, d’échec et d’annulation.

## Fichiers concernés

- `server/server.js`
- `server/package.json`
- `server/test/helpers/temporary-proto05-server.js`
- `server/test/hls-preparation.test.js`
- `teacher-videos.html`
- ce rapport

## Vérifications

- `npm run check` : réussi (`node --check server.js`).
- Tests ciblés HLS : 2 tests réussis : préparation avec métadonnées, annulation et nettoyage ; refus des sources non HLS ou invalides.
- Tests de non-régression ciblés des missions précédentes : copies distantes contrôlées, requêtes média interrompues, persistance Library et régression des données réussis lors de la campagne ciblée.
- Chromium : Library chargée, carte HLS sélectionnée, préparation terminée avec fichier temporaire et métadonnées visibles ; aucune erreur applicative dans la console et aucun débordement horizontal observé. Le nettoyage de l’annulation est couvert par le test serveur ; le très court fixture Chromium a terminé avant qu’une annulation interactive puisse rester affichée.

## Compatibilité et limites

Les activités existantes conservent `activity.videoRef`, `activity.video`, leurs URL et leur projection de compatibilité. La lecture HLS distante n’est pas remplacée. Aucun téléchargement distant, import local, anonymisation, FFmpeg de transformation, copie persistante ou version dérivée n’est livré dans cette mission.

Restent à traiter dans des missions ultérieures : le pipeline d’anonymisation lui-même, les copies ou versions persistantes, les droits et la gestion durable des artefacts temporaires.

Validation humaine : non effectuée ; le rapport restitue uniquement les contrôles automatisés et la recette Chromium réalisée par Codex.

Message de commit proposé (non créé) : `proto05: stage HLS sources in temporary anonymization jobs`
