# Prototype 05 — administration des couches pédagogiques

Version : **0.1.7**

## Modèle retenu

La visibilité étudiante est portée par `activity.layerConfiguration.learnerVisibleLayerIds`. Les couches et leurs occurrences restent inchangées lorsque la visibilité est modifiée ; le filtrage est appliqué uniquement au rendu étudiant et à sa prévisualisation. La sauvegarde utilise la route auteur existante et son écriture atomique avec fichier `.bak`.

## Contrôles ajoutés

L’atelier guidé affiche désormais une carte par couche dans le panneau **Ce que verront les étudiants** : nom, description, couleur contrôlée par palette, nombre d’occurrences, état visible/masqué et case de visibilité. Les champs d’édition ne montrent pas les identifiants techniques dans l’interface courante.

Une nouvelle couche peut être créée avec un identifiant généré, un nom, une description, une couleur et une visibilité initiale. Un identifiant existant n’est jamais édité. La suppression est refusée si une occurrence de phénomène utilise la couche, avec un message explicite.

## Comportement enseignant / étudiant

Une couche masquée reste disponible dans l’atelier et ses occurrences restent dans les données. Elle disparaît du contenu étudiant et de la Timeline IC étudiante. Les autres couches ne sont pas affectées. La réactivation actualise immédiatement la prévisualisation et restaure le rendu.

## Vérifications

- `npm run check` : OK ;
- parsing JavaScript : OK ;
- `git diff --check` : OK ;
- Chromium atelier guidé : 7 couches historiques visibles, descriptions, couleurs, occurrences et états présents ;
- Chromium : changement de visibilité, actualisation de la prévisualisation et persistance après sauvegarde/rechargement ;
- Chromium : création d’une couche et refus de suppression d’une couche utilisée ;
- Chromium étudiant : seules les couches activées et leurs phénomènes sont rendus ; vidéo, transcription, langues, observations et export restent accessibles ;
- volumes historiques contrôlés : 11 segments, 22 intervalles linguistiques, 26 phénomènes, 4 langues, 5 locuteurs et 11 annotations.

## Limites

La gestion porte uniquement sur les couches de l’atelier guidé. Aucun changement n’est apporté à la Timeline IC partagée, à la transcription, aux intervalles linguistiques, aux annotations, à l’atelier avancé, au proxy HLS ou aux routes API.

## Commit proposé

`feat(prototype-05): make pedagogical layers manageable`
