# Mission 082 — Proto05 : atelier avancé d’anonymisation temporelle

## Version et périmètre

Proto05 uniquement. Version serveur inchangée : `0.1.30`. L’atelier fixe `/teacher/anonymization/:jobId` et son pipeline restent disponibles. Aucun autre prototype, IC-Hub ou activité canonique n’a été modifié.

## Route et page

Ajout de la page autonome `/teacher/anonymization-advanced/:jobId`, copiée dans les fixtures temporaires. La Library expose désormais une action `Ouvrir l’atelier avancé` à côté de l’accès à l’atelier fixe.

La page contient un lecteur, un calque aligné sur la zone `object-fit: contain`, une timeline, lecture/pause, petits déplacements temporels, liste des masques, plages d’activation, images-clés, édition des coordonnées, déplacement/redimensionnement, profils de flou, validation, dérivation, annulation et retour Library.

## Contrat temporel

Chaque masque temporel est conservé sous la forme :

```json
{
  "id": "mask-1",
  "startMs": 0,
  "endMs": 2200,
  "keyframes": [
    { "time": 0, "x": 0.08, "y": 0.08, "width": 0.18, "height": 0.18 },
    { "time": 1800, "x": 0.52, "y": 0.20, "width": 0.20, "height": 0.20 }
  ]
}
```

Les coordonnées sont validées entre 0 et 1, avec taille minimale `0.02`. Les images-clés sont manuelles, triées par temps et limitées à la plage du masque. L’interpolation est linéaire pour `x`, `y`, `width` et `height`; avant la première et après la dernière image-clé, la première ou la dernière position est conservée.

La configuration est persistée dans le job de préparation via `temporalMasks`, ce qui permet de recharger la page et de réutiliser la préparation sans recréation inutile.

## Pipeline FFmpeg

Ajout de la route `POST /api/proto05/library/hls-temporal-derivations`. Elle crée un job indépendant avec `mode: temporal`, `method: ffmpeg-boxblur-temporal-keyframes` et le profil choisi. Le graphe FFmpeg applique un `boxblur` à une copie du flux puis compose cette copie uniquement dans la zone active, avec des expressions temporelles et des coordonnées interpolées. Plusieurs masques sont chaînés.

La provenance conserve le mode, les masques temporels, les plages, les images-clés, la règle d’interpolation, le profil, le graphe, les arguments FFmpeg, l’identifiant de préparation, le statut, les dates, le hash et la taille. Le pipeline fixe conserve sa méthode et ses données existantes.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-anonymization-advanced.html`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`
- `reports/082_proto05_temporal_anonymization_workspace.md`

## Contrôles

- `npm run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis.
- Le test couvre une préparation, une dérivation temporelle avec deux images-clés et interpolation, le profil Léger, le graphe `blend`, la provenance, le lien média, puis les dérivations fixes successives et le nettoyage.
- Les validations serveur couvrent plages invalides, images-clés hors bornes, coordonnées hors image, identifiants dupliqués et profils inconnus.

La recette Chromium obligatoire n’a pas pu être exécutée dans cette session, faute d’outil Chromium disponible. La validation humaine doit encore vérifier le parcours Library → atelier avancé, l’alignement visuel, l’interpolation à l’écran, les trois profils, le lien dérivé et l’absence d’erreur console à 1440 px puis en fenêtre réduite.

Les modifications préexistantes de `data/video-library.json`, de l’atelier fixe et des rapports précédents ont été conservées sans intervention. Aucun commit ni push.

Limites : images-clés exclusivement manuelles; aucune détection, aucun suivi automatique, aucune anonymisation vocale et aucune édition par masque dans les activités canoniques.

Message de commit proposé : `Proto05: ajouter l’atelier d’anonymisation temporelle`.
