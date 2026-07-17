# Rapport 064 — édition centralisée de l’atelier guidé Proto05

## Périmètre

L’atelier guidé affiche désormais les cartes « Locuteurs » et « Couches pédagogiques » en mode liste uniquement, avec une action « Modifier ». Le formulaire de l’élément sélectionné est rendu dans le panneau permanent « Édition », avec un titre dynamique pour le locuteur et la couche, en conservant la logique existante pour les segments, langues, phénomènes, annotations et overlays.

Les validations, créations, suppressions, sauvegarde, sélection vidéo, modèle JSON et comportement étudiant n’ont pas été modifiés.

## Fichier concerné

- `prototypes/05-augmented-ic-video-01/teacher-guided.html`

## Contrôles réalisés

- `npm run check` réussi dans le serveur Proto05 (`0.1.22`).
- Chromium sur la copie temporaire `proto05-copy-1784236861048-984dec` : sélection d’un locuteur et d’une couche, titres « Édition — Locuteur » et « Édition — Couche pédagogique », modification, sauvegarde puis rechargement.
- Après rechargement, les modifications du locuteur et de la couche sont présentes ; aucun formulaire en doublon dans les cartes.
- Largeur vérifiée : `scrollWidth = clientWidth = 1265`, sans débordement horizontal.
- Aucune erreur applicative dans la console Chromium.

La recette a écrit uniquement dans la copie temporaire. `data/activities.json` canonique n’a pas été modifié.

## Version et limites

Version inchangée : serveur Proto05 `0.1.22`, moteur étudiant `index-0.0.9.html` inchangé. La validation Chromium est automatisée et ne remplace pas une validation humaine.

Aucun commit ni push effectué.

Message de commit proposé : `refactor(proto05): centralize guided editing forms`
