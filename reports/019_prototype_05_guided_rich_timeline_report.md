# Prototype 05 — timeline IC riche dans l’atelier guidé

Version : **0.1.5**

## Référence

La timeline étudiante de `index-0.0.8.html` a servi de référence : axe gradué, curseur, lignes linguistiques par code, marqueurs de phénomènes et légende par couleurs.

## Réalisation

- Timeline guidée reconstruite avec axe `mm:ss`, durée complète et curseur de lecture.
- Lignes distinctes pour toutes les langues du catalogue (FR, ES, IT, PT dans l’activité historique).
- Intervalles linguistiques et 26 phénomènes rendus individuellement, positionnés selon leurs bornes et cliquables.
- Couleurs alignées sur les classes de la timeline étudiante et légende conservée.
- Sélection, déplacement vidéo et édition restent reliés au panneau enseignant.
- Bornes éditées par curseurs accessibles, valeurs `mm:ss`, boutons de définition au temps courant et validation fin > début.

## Vérifications

- Activité historique contrôlée : 11 segments, 22 intervalles, 26 phénomènes, 7 couches, 4 langues, 5 locuteurs, 11 annotations.
- Parsing JavaScript embarqué, `npm run check`, type MIME UTF-8 et `git diff --check`.
- Routes étudiant, prévisualisation et mode avancé laissées inchangées.

## Limites

Le composant reste embarqué dans les deux pages historiques ; une extraction en module partagé pourra être envisagée lors d’une refonte dédiée. Les tests de clics et de lecture image doivent être rejoués dans Chromium avec le flux HLS actif.
