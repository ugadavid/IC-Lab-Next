# Rapport 063 — mise en page de l’atelier guidé Proto05

## Périmètre

Mise en page de `teacher-guided.html` uniquement. Le panneau « Moment sélectionné » est devenu « Édition », permanent et pleine largeur sous « Vidéo et timeline ». Les moments de transcription sont placés avec les locuteurs, les langues entendues avec les phénomènes, et « Locuteurs » utilise désormais `details/summary`.

Le panneau des locuteurs est construit avec des nœuds DOM et `textContent` afin qu’aucun fragment HTML (`</p>`, `</label>`, `<button>`, etc.) ne soit rendu comme texte visible. Les logiques d’édition, de sauvegarde, de lecteur, de timeline et le modèle de données n’ont pas été modifiés.

## Vérifications

- `npm run check` : réussi (`server` 0.1.22).
- Chromium sur la copie temporaire `proto05-copy-1784236861048-984dec` : édition renommée, sections repliables ouvertes/fermées puis rouvertes, locuteurs inclus, édition d’un segment toujours fonctionnelle.
- Largeur Chromium observée : `clientWidth=1265`, `scrollWidth=1265`; aucun débordement horizontal.
- Aucun fragment HTML visible et aucune erreur applicative dans la console.
- Aucune sauvegarde exécutée ; les cinq activités et `data/activities.json` n’ont pas été modifiés.

## Version et limites

Version applicative inchangée : serveur Proto05 0.1.22 ; moteur étudiant `index-0.0.9.html` inchangé. La vérification Chromium est une recette automatisée Codex, pas une validation humaine. Aucun commit ni push.

Message de commit proposé : `fix(proto05): refine guided authoring layout`
