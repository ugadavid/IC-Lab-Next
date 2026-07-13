# Prototype 05 — finalisation de la timeline partagée

Version : **0.1.6.2**

## Correction

Le curseur était positionné dans le conteneur global et compensait la colonne des libellés par une formule CSS. La timeline partagée possède maintenant une grille explicite : colonne des libellés et zone `.ic-timeline-plot`. L’axe, les pistes et le curseur sont tous enfants de cette zone. Le curseur utilise exclusivement `left = currentTimeMs / durationMs * 100`.

La vue étudiante ne rend plus l’ancienne timeline concurrente : elle fournit uniquement un point de montage au composant partagé. L’atelier guidé utilise le même rendu ; sa légende générique historique est neutralisée pour conserver une seule légende complète. Le panneau d’édition et les listes guidées restent inchangés.

## Vérifications

- 11 segments, 22 intervalles, 26 phénomènes, 7 couches, 4 langues, 5 locuteurs et 11 annotations conservés ;
- `npm run check` et parsing JavaScript réussis ;
- `git diff --check` réussi ;
- Chromium : étudiant et guidé affichent un seul titre, une seule durée et une seule légende ;
- les deux pages ont exactement la même origine géométrique pour `.ic-timeline-plot`, l’axe, la première piste et le curseur (`x=140` étudiant, `x=147` guidé) ;
- l’atelier masque l’ancienne légende générique (`display:none`) et conserve la légende partagée ;
- 00:00, 00:07 et 15:39 sont calculés dans la même zone que l’axe et les plages ;
- clics segment/langue/phénomène et sélection de l’atelier conservés ; un clic langue puis phénomène positionne la vidéo à `2s` et expose les deux contrôles temporels de l’éditeur ;
- le déplacement vidéo et la mise à jour du curseur passent par l’API partagée.

## Limites

La lecture effective reste dépendante du flux HLS distant et de la disponibilité du serveur UGA. Aucun changement de données, de routes API, de proxy ou de modèle n’a été effectué.

Message de commit proposé :

```text
fix(prototype-05): align shared timeline playhead and rendering
```
