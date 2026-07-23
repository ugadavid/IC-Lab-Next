# Mission 083 — Proto05 : interaction réelle des masques temporels

## Version et périmètre

Proto05 uniquement. Version serveur inchangée : `0.1.30`. L’atelier fixe, le contrat des masques fixes, les dérivés existants et les activités canoniques sont préservés.

## Cause du bug

Dans `teacher-anonymization-advanced.html`, le rendu initial ne créait qu’une poignée bas-droite. Surtout, `pointermove` appelait `renderRects()`, qui remplaçait immédiatement le rectangle ayant capturé le pointeur. La capture et ses écouteurs étaient donc détruits pendant le glisser, ce qui rendait les poignées inactives ou provoquait un saut.

## Correction

- Quatre poignées explicites `nw`, `ne`, `sw` et `se` sont présentes et reçoivent les pointeurs (`pointer-events:auto`); le calque reste non interactif hors de ses rectangles.
- `setPointerCapture` est appelé sur le rectangle actif.
- `pointerup`, `pointercancel`, `lostpointercapture`, perte de focus et relâchement global nettoient l’état d’interaction.
- Le rectangle n’est plus rerendu pendant le déplacement. Son style est mis à jour directement tandis que le modèle temporel est modifié par `upsertKeyframe`.
- Déplacement et redimensionnement utilisent le `getBoundingClientRect()` du calque correspondant à la zone vidéo affichée, elle-même calculée depuis le conteneur et `object-fit: contain`.
- Les limites restent normalisées entre 0 et 1 avec une taille minimale de `0.02`; les quatre coins redimensionnent sans saut et sans conflit avec la sélection.
- Les changements de configuration sont sauvegardés avec temporisation dans `temporalMasks`; les autres images-clés sont conservées et les clés restent triées.
- Une resynchronisation est conservée après scroll et redimensionnement.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/teacher-anonymization-advanced.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`
- `reports/083_proto05_temporal_mask_handles.md`

## Tests et contrôles

- `npm run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis.
- Le test couvre la route de l’atelier avancé, la préparation, la dérivation temporelle avec deux images-clés, l’interpolation, la provenance et les dérivations fixes existantes.
- Vérification statique : quatre coins, capture/release/cancel, `lostpointercapture`, `pointer-events`, `getBoundingClientRect`, mise à jour du modèle via `upsertKeyframe`, sauvegarde `temporalMasks` et profils conservés.

La recette Chromium interactive obligatoire à 1440 px puis en fenêtre réduite n’a pas pu être exécutée dans cette session, faute d’outil Chromium disponible. Elle doit encore confirmer visuellement le glisser de chaque coin, l’interaction après scroll/redimensionnement, la persistance après actualisation et l’absence d’erreur console.

Les modifications préexistantes de `data/video-library.json`, de l’atelier fixe et des rapports 077–082 ont été conservées sans intervention. Aucun commit ni push.

Limites restantes : images-clés manuelles uniquement, pas de suivi automatique, détection de visage ou anonymisation vocale.

Message de commit proposé : `Proto05: rendre les poignées temporelles interactives`.
