# Mission 077 — Édition visuelle des masques d’anonymisation

## Périmètre et version

Modification limitée à Proto05. La version serveur reste `0.1.29`. Aucun autre prototype, IC-Hub, moteur étudiant ou activité canonique n’a été modifié.

## Fonctionnalités livrées

La Library ajoute, après une préparation HLS réussie, une action « Éditer les masques ». L’éditeur affiche le fichier temporaire préparé dans une vidéo 16:9 et superpose les rectangles actifs. Il permet :

- ajout d’un rectangle ;
- déplacement à la souris ;
- redimensionnement par poignée ;
- modification directe des coordonnées ;
- suppression et réinitialisation ;
- affichage des identifiants et coordonnées normalisées ;
- validation visuelle et lancement de la dérivation avec la configuration courante.

Les masques restent manuels et ne sont jamais présentés comme une détection de visages.

## Contrat des masques

Chaque masque suit le format :

```json
{
  "id": "mask-1",
  "x": 0.12,
  "y": 0.08,
  "width": 0.24,
  "height": 0.18
}
```

Les coordonnées sont indépendantes de la résolution. Elles sont calculées depuis la largeur et la hauteur du stage d’affichage : `x = pixelX / stageWidth`, `y = pixelY / stageHeight`, `width = pixelWidth / stageWidth`, `height = pixelHeight / stageHeight`. Le serveur refuse les valeurs non finies, les tailles non positives, les rectangles hors limites, les listes vides, plus de 20 masques et les identifiants dupliqués. L’ordre fourni est conservé.

La configuration validée est transmise sans perte au job de dérivation, utilisée par `ffmpeg-drawbox-rectangles` et enregistrée dans la provenance du dérivé.

## Composants et routes

- `teacher-videos.html` : stage vidéo, calques de masques, poignées, formulaire de coordonnées, validation et interactions.
- `server/server.js` : validation des identifiants, lecture Range du média préparé via `/api/proto05/library/hls-preparations/:jobId/media`, et transmission des masques au pipeline FFmpeg.
- `server/test/hls-preparation.test.js` : contrôles des rectangles hors limites et identifiants dupliqués, en plus de la dérivation et du nettoyage existants.

## Vérifications

- `npm run check` : réussi.
- Scripts inline de `teacher-videos.html` : syntaxe vérifiée.
- Tests HLS/dérivation : préparation, masques invalides, dérivation, validation MP4, hash, provenance, lecture Range, persistance après redémarrage, annulation et nettoyage : réussis.
- Chromium : Library vérifiée à 1440 px, sans erreur applicative ni débordement horizontal. La recette visuelle complète des rectangles n’a pas pu être exécutée sur le serveur canonique, qui ne fournit pas de fixture HLS locale disponible pour maintenir un job préparé pendant la manipulation ; elle reste à réaliser avec une fixture HLS temporaire en recette dédiée.

## Limites restantes

Pas de détection ou de suivi automatique des visages, pas de suivi temporel des masques, pas d’éditeur avancé des points d’ancrage, ni d’aperçu image extrait séparément de la vidéo préparée. Les workspaces temporaires et la persistance atomique restent ceux des missions 075–076.

Validation humaine : non effectuée. Aucun commit ni push.

Message de commit proposé, non créé : `proto05: add visual anonymization mask editor`
