# Prototype 05 — correction d’intégration responsive de la timeline partagée

Version : **0.1.6.1**

## Cause

La vue étudiante conserve `.timeline-body` comme grille à deux colonnes. Le composant partagé injecté comme enfant direct était donc placé implicitement dans la première colonne, celle des libellés. Sa zone temporelle se retrouvait comprimée et le zéro n’était plus aligné avec les plages.

## Correction

`shared/ic-timeline.css` impose désormais au composant une largeur complète, `min-width:0`, `box-sizing:border-box` et un placement `grid-column:1 / -1` lorsqu’il est enfant de l’ancienne grille. Les pistes ont également `min-width:0`. Les calculs de position restent centralisés dans `ic-timeline.js` et utilisent uniquement la zone de tracé.

## Vérifications

- vue étudiante et atelier guidé continuent de charger le même composant partagé ;
- modules partagés servis en HTTP avec leurs types MIME ;
- activité historique intacte : 11 segments, 22 intervalles, 26 phénomènes, 7 couches, 4 langues ;
- `npm run check`, parsing JavaScript et `git diff --check` réussis.

## Validation Chromium

Dans Chromium, la vue étudiante et l’atelier guidé affichent la timeline sur toute la largeur disponible. L’étudiant présente 6 lignes (Transcription, FR, ES, IT, PT, Phénomènes), 17 graduations jusqu’à `15:39` et 59 plages. L’atelier présente la même géométrie, 59 plages et 26 phénomènes. Un clic sur une plage linguistique puis sur un phénomène dans l’atelier sélectionne l’objet et positionne la vidéo à `2s`; un clic linguistique dans la vue étudiante positionne également la vidéo à `2s`.

La lecture HLS et les contrôles média restent dépendants du flux distant, mais aucune erreur de layout n’a été observée.
