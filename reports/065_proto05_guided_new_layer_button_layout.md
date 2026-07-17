# Rapport 065 — bouton « Nouvelle couche » de l’atelier guidé

## Périmètre

Correction limitée à l’affichage de `+ Nouvelle couche` dans `teacher-guided.html`. L’action est désormais un bloc séparé au-dessus de la grille des couches ; seules les cartes restent dans la grille. La taille du bouton reste normale et sa fonctionnalité d’ouverture du panneau « Édition — Couche pédagogique » est conservée.

Aucun changement de modèle, de sauvegarde, de carte existante ou de donnée canonique.

## Contrôles

- Chromium sur la copie temporaire `proto05-copy-1784236861048-984dec`, section ouverte puis repliée.
- Bouton mesuré à `113 × 24 px`, hors grille ; la grille contient uniquement les cartes.
- Création temporaire d’une couche vérifiée : ouverture du formulaire puis ajout d’une couche de recette dans la copie.
- `scrollWidth = clientWidth = 1265` dans les états contrôlés ; aucune colonne bleue ni débordement horizontal observé.
- `npm run check` réussi (`proto05-augmented-video-server@0.1.22`).

La recette n’a pas écrit dans `data/activities.json`.

Version inchangée : serveur Proto05 `0.1.22`.

Aucun commit ni push effectué.

Message de commit proposé : `fix(proto05): keep new layer action outside card grid`
