# Mission 079 — Proto05 : interaction réelle des masques et floutage

## Périmètre et version

Mission limitée à `prototypes/05-augmented-ic-video-01`. La version serveur passe de `0.1.29` à `0.1.30`.
Les activités canoniques, les sources vidéo et les contrats de jobs restent inchangés.

## Modifications

- `teacher-anonymization.html` est désormais un éditeur réellement interactif : capture du pointeur, déplacement hors de la scène, annulation et nettoyage sur perte de focus/navigation, quatre poignées de redimensionnement, bornes normalisées et taille minimale configurable (`0.02`). Le calque est recalé sur la zone vidéo effectivement affichée, y compris avec les marges `object-fit: contain` et après redimensionnement.
- Les boutons numériques disposent d’un incrément immédiat puis d’une répétition contrôlée pendant l’appui maintenu. Les saisies clavier directes restent disponibles.
- `server/server.js` remplace le filtre `drawbox` par un graphe FFmpeg multi-masques utilisant `boxblur`, avec composition déterministe, validation finale du fichier et nettoyage des espaces temporaires conservés.
- La provenance du dérivé contient la méthode `ffmpeg-boxblur-rectangles`, les paramètres de flou, le graphe et les arguments FFmpeg transmis au processus.
- `server/test/hls-preparation.test.js` vérifie la méthode de floutage, les paramètres, la transmission `filter_complex`, la persistance, la lecture Range et le nettoyage existants.

## Vérifications

- `npm run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis, dont préparation, masques multiples, dérivation, provenance, persistance après redémarrage, lecture Range et nettoyage.
- Vérification statique : aucune référence `drawbox` restante dans l’implémentation de dérivation ; présence de `boxblur`, de la capture de pointeur, des quatre poignées et de la répétition numérique.

La recette Chromium interactive 1440 px puis fenêtre réduite n’a pas pu être exécutée dans cette session : aucun contrôle Chromium exploitable n’était disponible. Elle reste à faire avant validation humaine, notamment pour confirmer visuellement l’alignement, le déplacement hors scène, le redimensionnement et l’absence de console applicative.

## Données et limites

Aucune écriture canonique n’a été effectuée par cette mission. Une modification préexistante de `prototypes/05-augmented-ic-video-01/data/video-library.json` était visible dans l’état Git et a été conservée sans intervention.

Restent volontairement hors périmètre : détection automatique, suivi temporel, anonymisation audio, autres prototypes, IC-Hub et refonte générale de la Library. Le flou est appliqué à partir des masques manuels validés ; aucune détection n’est ajoutée.

Suite proposée : recette Chromium manuelle complète, puis contrôle visuel du fichier dérivé sur une source vidéo représentative.

Message de commit proposé : `Proto05: activer l’interaction des masques et le floutage boxblur` (aucun commit créé).
