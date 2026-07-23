# Mission 087 — Proto05 : interaction multi-masques

## Périmètre

Correction limitée à l’interaction des masques temporels dans l’atelier avancé de Proto05. Aucun changement du modèle vidéo, de l’atelier fixe, du pipeline FFmpeg, des activités canoniques ou des temps manuels.

## Cause observée

Le rendu et les handlers historiques pouvaient laisser plusieurs rectangles intercepter les pointeurs et acheminer le geste via un état de sélection recalculé. Le geste n’identifiait donc pas suffisamment sa cible lorsque plusieurs masques étaient présents.

## Correction

Fichiers concernés :

- `prototypes/05-augmented-ic-video-01/teacher-anonymization-advanced.html`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`

Chaque poignée porte explicitement `maskId`, `keyframeId` et `handle` (`nw`, `ne`, `sw`, `se`). Au `pointerdown`, le geste capture ces identifiants ainsi que les références du masque et de l’image-clé visés. Les mouvements utilisent uniquement cette transaction et sa géométrie initiale ; ils ne dépendent ni d’un index de tableau, ni du masque actif recalculé, ni de `video.currentTime`.

Les rectangles non sélectionnés ont `pointer-events: none`. Le masque sélectionné expose ses quatre poignées, au-dessus du rectangle, avec capture du pointeur et gestion de `pointerup`, `pointercancel` et `lostpointercapture`. Les coordonnées restent normalisées, bornées et soumises à la taille minimale existante. Une interaction modifie seulement la géométrie de l’image-clé déjà sélectionnée ; elle ne crée ni ne déplace d’image-clé et ne modifie pas son temps.

## Vérifications

- `npm.cmd run check` : réussi.
- `node --test test/hls-preparation.test.js` : 3 tests réussis, dont le contrôle statique de l’isolation `maskId`/`keyframeId`/`handle`, des pointeurs non sélectionnés et des annulations.
- Chromium, copie temporaire : ajout d’un second masque, sélection de chacun, redimensionnement avec les quatre poignées de chacun, contrôle de l’indépendance des géométries, des temps et des images-clés, puis actualisation.
- Chromium 1440×1000 : 2 masques, 8 poignées, 4 poignées interactives, `scrollWidth = clientWidth = 1440`.
- Chromium 800×600 : 2 masques, 8 poignées, 4 poignées interactives, `scrollWidth = clientWidth = 785`.
- Console Chromium : aucune erreur applicative relevée.

La persistance après actualisation a conservé les deux masques, les géométries finales et les temps manuels. Aucun fichier canonique d’activité n’a été modifié.

## Limites restantes

La recette a exercé les glissements et les quatre coins sur les deux masques. Un événement matériel `pointercancel`/`lostpointercapture` n’a pas été provoqué artificiellement dans Chromium ; leurs chemins sont couverts par le test ciblé et le code de nettoyage. La validation humaine finale reste à effectuer.

Version Proto05 : `0.1.30`, inchangée.

Message de commit proposé, non exécuté : `fix(proto05): isolate temporal mask pointer gestures`
