# Rapport 062 — Sections repliables de l’atelier guidé Proto05

## Périmètre

Ajout d’une logique d’interface dans `teacher-guided.html` pour convertir en
`<details>/<summary>` accessibles les sections Moments de transcription,
Langues entendues, Phénomènes, Couches pédagogiques, Annotations et Overlays,
ainsi que Moment sélectionné. La zone Vidéo et timeline reste toujours visible.

Les sections sont ouvertes par défaut et conservent le style visuel de
l’atelier auteur. Les panneaux Annotations et Overlays créés dynamiquement sont
également pris en charge. Aucune logique d’édition, de sauvegarde, de sélection,
de lecteur, de timeline ou de modèle JSON n’a été modifiée.

## Fichiers

- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- ce rapport

## Vérifications

- `npm run check` : réussi (`server 0.1.22`, syntaxe Node validée).
- Chromium sur l’atelier guidé YouTube, activité temporaire
  `proto05-copy-1784236861048-984dec` : 7 summaries présents, ouverts au
  chargement ; chaque section a été repliée puis rouverte.
- Édition d’un moment de transcription après réouverture : fonctionnelle.
- Console applicative : aucune erreur.
- Débordement horizontal : `document.documentElement.scrollWidth ===
  document.documentElement.clientWidth` (1265 px dans la recette).
- Aucun écrit dans `data/activities.json` ; aucun commit ni push.

## Version et limites

Version applicative inchangée : serveur Proto05 `0.1.22`, moteur étudiant
`index-0.0.9.html`. La validation visuelle a été réalisée dans Chromium sur
l’atelier guidé YouTube ; une validation humaine distincte reste à effectuer.

Message de commit proposé : `fix(proto05): collapse guided authoring sections`
