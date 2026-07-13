# Prototype 05 — composant partagé de timeline IC

Version : **0.1.6**

## Fichiers partagés

- `shared/ic-timeline.js` expose `createICTimeline({ container, activity, durationMs, currentTime, mode, onSeek, onSelect })`, ainsi que `update`, `setCurrentTime`, `setSelectedElement` et `destroy`.
- `shared/ic-timeline.css` contient la géométrie, les couleurs, l’axe, le curseur et la légende.

La vue étudiante et `teacher-guided.html` chargent maintenant ces mêmes fichiers. Le composant reprend la structure visuelle de `index-0.0.8.html`.

## Géométrie et interactions

La colonne fixe des libellés est séparée de la zone temporelle. Les plages, graduations, clics et curseur utilisent la même conversion `timeToPercent`; le zéro ne peut donc plus être décalé par la largeur des libellés. Les lignes affichées sont la transcription, chaque langue du catalogue et les phénomènes IC. Le mode étudiant effectue une navigation, tandis que le mode auteur transmet une sélection structurée au panneau d’édition.

## Vérifications

- activité historique intacte : 11 segments, 22 intervalles, 26 phénomènes, 7 couches, 4 langues ;
- fichiers JS partagé, étudiant et guidé parsés avec `node --check` ;
- serveur `npm run check` réussi ;
- modules `/shared/ic-timeline.js` et `/shared/ic-timeline.css` servis en HTTP 200 avec leurs types MIME ;
- `git diff --check` réussi.

## Limites

La validation visuelle complète des alignements, clics et de la lecture HLS doit être rejouée dans Chromium. L’atelier avancé n’utilise pas ce composant, conformément au périmètre de la mission.
