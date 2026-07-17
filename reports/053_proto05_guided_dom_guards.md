# Rapport 053 — corrections DOM de l’atelier guidé Proto05

## Périmètre

Correction limitée des trois erreurs JavaScript applicatives signalées dans l’atelier guidé, avec validation de l’activité YouTube `proto05-copy-1784236861048-984dec`. Aucune donnée canonique, aucun modèle, lecteur, route ou proxy HLS n’a été modifié.

## Corrections

- `guided-overlays.js` utilise désormais une délégation d’événement pour le bouton d’ajout d’overlay, qui peut être inséré dynamiquement, et ne lance le rendu initial qu’après chargement de l’activité.
- `syncGuidedClock` cible explicitement `#clock` et sort proprement si l’élément ou l’activité courante est absent.
- `renderTimeline` vérifie la présence de `#timeline` avant toute création ou mise à jour de timeline.
- L’atelier guidé dispose d’un point de montage vidéo séparé : le lecteur partagé ne remplace plus l’horloge et la timeline de la carte vidéo.

## Vérifications

- `npm run check` : succès, serveur Proto05 `0.1.20`.
- Chromium, atelier guidé YouTube à 1440 px : horloge, timeline et overlay présents ; ajout d’overlay fonctionnel ; ajout de phénomène fonctionnel ; aucun débordement horizontal (`scrollWidth = clientWidth = 1265` dans la fenêtre de recette).
- Chromium, activité UGA canonique `proto05-augmented-video-01` : chargement de la carte vidéo, horloge et timeline présents, aucune erreur applicative dans une session propre.
- Chromium, atelier auteur YouTube : chargement et panneaux vidéo/overlay/phénomène présents, aucune erreur applicative.
- Les erreurs historiques de télémétrie YouTube observées dans d’anciens journaux de session ont été distinguées des erreurs Proto05 ; les sessions propres utilisées pour la validation ne signalent aucune erreur applicative.

## Version et limites

Version applicative inchangée : serveur `0.1.20`, moteur étudiant `index-0.0.9.html`. Les contrôles complets de la suite n’ont pas été relancés conformément au périmètre. La validation Chromium est une recette d’agent et ne constitue pas une validation humaine.

Suite possible : conserver une session Chromium propre pour une validation humaine finale des contrôles YouTube et UGA.
