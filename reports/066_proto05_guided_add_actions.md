# Rapport 066 — harmonisation des actions d’ajout Proto05

## Périmètre

Modification limitée à `teacher-guided.html`.

- Ajout de « Ajouter un moment » dans « Moments de transcription ».
- Ajout de « Ajouter une annotation » dans « Annotations » ; l’annotation est rattachée au segment sélectionné ou au segment présent au temps vidéo courant, puis ouverte dans le panneau « Édition — Annotation ».
- Harmonisation des sept actions d’ajout (transcription, langues, phénomènes, couches, locuteurs, annotations et overlays) avec les classes `.guided-add-actions` et `.guided-add-action`, placées directement sous le titre de chaque section.
- Conservation des handlers, validations, modèle JSON, routes, lecteur et données existants.

## Vérifications

- `npm run check` : réussi (`proto05-augmented-video-server` 0.1.22).
- Chromium, copie temporaire `proto05-copy-1784236861048-984dec` : sept boutons présents sous leurs sections, création d’un moment puis d’une annotation fonctionnelle, sélection dans le panneau d’édition, largeur document `1265px` égale à la largeur client `1265px`, aucune erreur console applicative observée.
- Aucune écriture dans `data/activities.json`.

## Version et limites

Version applicative inchangée : serveur Proto05 `0.1.22`, moteur étudiant `index-0.0.9.html`.

La recette Chromium a vérifié les deux nouvelles créations et la présence/positionnement des actions existantes ; elle n’a pas sauvegardé la copie temporaire. Aucun commit ni push.

Suite proposée : validation humaine visuelle finale si nécessaire.

Message de commit proposé : `Harmoniser les actions d’ajout de l’atelier guidé Proto05`.
