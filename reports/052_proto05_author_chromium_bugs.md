# Rapport 052 — Proto05, correctifs atelier auteur Chromium

Date : 2026-07-17
Périmètre : prototypes/05-augmented-ic-video-01/teacher-author.html

## Corrections

- Le rendu initial de la zone des annotations dispose désormais d’un état d’activité minimal pendant le chargement asynchrone ; l’atelier ne tente plus de lire teacherAnnotations sur une activité absente.
- L’accès au bouton d’ajout d’overlay est tolérant lorsque le panneau n’est pas encore créé, puis une délégation de clic le rend fonctionnel après son insertion dynamique.
- La cause du débordement horizontal a été corrigée dans la timeline des phénomènes. Pour l’activité YouTube, durationMs est absent ; l’ancien repli à 1 milliseconde transformait les positions en pourcentages gigantesques. La durée de rendu est maintenant dérivée des bornes vidéo connues lorsque la durée du lecteur n’est pas encore disponible.

Mesure reproduite avant correction : document.documentElement.scrollWidth = 33554432, avec un élément .bar de la timeline atteignant environ 13910204 px. Après correction, les barres restent dans la scène et scrollWidth = clientWidth = 1265 dans le Chromium de recette.

Les modèles, le catalogue, les données canoniques, les lecteurs et le proxy HLS n’ont pas été modifiés.

## Vérifications

- npm run check : réussi ; serveur Proto05 0.1.20.
- Chromium, activité proto05-copy-1784236861048-984dec, source video-proto05-youtube-fg4h0_v3otk : chargement de l’atelier, annotations et overlays présents, boutons addOverlay et save accessibles.
- Console Chromium : aucune erreur JavaScript applicative après rechargement.
- Débordement : aucune barre horizontale ; scrollWidth - clientWidth = 0. Les barres .bar ont retrouvé des dimensions normales.
- Activité UGA historique proto05-augmented-video-01 : chargée dans l’atelier, avec titre et annotations conservés, sans erreur console.

La capacité Chromium demandée à 1440 × 1000 a été appliquée, mais l’instance intégrée a conservé une fenêtre effective de 1280 × 720 (clientWidth = 1265). La mesure effective confirme néanmoins l’absence de débordement ; une validation humaine dans une fenêtre réellement 1440 × 1000 reste à refaire.

## Fichiers

- Modifié : prototypes/05-augmented-ic-video-01/teacher-author.html
- Créé : reports/052_proto05_author_chromium_bugs.md

## Version et limites

Version applicative inchangée : Proto05 serveur 0.1.20, moteur étudiant index-0.0.9.html.

Limite restante : la dimension exacte 1440 × 1000 n’a pas pu être imposée par le Chromium intégré ; aucun débordement n’est observé dans la fenêtre effective disponible.

Suite possible : refaire une validation humaine à 1440 × 1000. Aucun commit ni push effectué.
