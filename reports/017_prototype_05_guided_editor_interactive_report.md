# Rapport — Prototype 05 : atelier guidé interactif

Date : 13 juillet 2026  
Version : **0.1.4**

## Organisation

`/teacher/guided/:activityId` utilise maintenant un éditeur dédié, sans iframe
étudiant permanent. Le lecteur vidéo HLS est directement intégré à la page,
avec contrôles natifs, position courante, durée, retour/avance de cinq secondes
et curseur synchronisé.

La prévisualisation étudiante reste accessible dans un nouvel onglet via
« Voir le résultat étudiant » et conserve l’identifiant courant. Le mode avancé
reste disponible sans modification.

## Timeline et édition

La timeline présente trois familles de barres cliquables : transcription,
intervalles linguistiques et phénomènes IC. Chaque clic sélectionne l’objet,
déplace la vidéo à son début et alimente le panneau d’édition.

Le panneau permet de modifier les segments (texte, début, fin, locuteur,
langues), les intervalles (langue, début, fin) et les phénomènes (type/couche,
début, fin). Des actions permettent l’ajout et la suppression ; les nouvelles
données sont sauvegardées par `PUT /api/proto05/activities/:id/authoring`.

## Vérifications

- route guidée historique servie sur 8791 ;
- lecteur direct et source HLS contrôlée conservés ;
- sélection et déplacement vidéo reliés à la timeline ;
- formulaires et boutons d’ajout/suppression présents ;
- prévisualisation séparée et identifiant courant conservé ;
- parsing JavaScript réussi ;
- `npm run check` réussi ;
- `git diff --check` réussi.

Les données historiques, le proxy HLS, l’atelier avancé et la bibliothèque ne
sont pas refondus. Les observations étudiantes restent hors persistance.

## Limites restantes

Le lecteur guidé ne factorise pas encore un module JavaScript partagé avec le
lecteur étudiant ; il réutilise cependant la même source HLS, les mêmes routes,
le même modèle et les mêmes validations. Une extraction de module de lecteur
pourra réduire cette duplication technique dans une mission ultérieure.

Message de commit proposé :

`feat(prototype-05): make guided authoring interactive`
