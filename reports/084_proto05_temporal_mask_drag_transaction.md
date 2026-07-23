# Mission 084 — Proto05 : transaction de déplacement et poignées temporelles

## Version et périmètre

Proto05 uniquement. Version serveur inchangée : `0.1.30`. L’atelier fixe, les profils, les préparations, les dérivés existants et les données canoniques sont préservés.

## Cause et correction

Le code précédent appelait `upsertKeyframe()` à chaque `pointermove`, en relisant `video.currentTime`. Un seul geste créait donc une série de clés à des micro-instants différents.

L’interaction temporelle est maintenant transactionnelle :

1. `pointerdown` capture une fois l’instant, la géométrie initiale et la clé active.
2. `pointermove` ne modifie qu’un brouillon local et le style du rectangle existant.
3. `pointerup` crée ou remplace une seule clé, trie les clés et déclenche une seule sauvegarde différée.
4. `pointercancel`, perte de focus, navigation ou interaction interrompue abandonnent le brouillon.

Le temps d’édition est normalisé à la milliseconde. Le serveur applique également cette normalisation au chargement et regroupe uniquement les clés ayant le même temps normalisé; les temps réellement distincts sont conservés.

## Poignées

Les quatre poignées `nw`, `ne`, `sw` et `se` sont créées une fois par rendu, centrées sur les coins, placées au-dessus du rectangle avec `z-index`, `pointer-events:auto` et une zone de 16 px. Le calque reste `pointer-events:none` hors des rectangles. Aucun rendu de la liste ou des poignées n’est effectué pendant `pointermove`.

Le déplacement et le redimensionnement utilisent le même `getBoundingClientRect()` du calque, lui-même aligné sur la zone vidéo réelle avec `object-fit: contain`. Les valeurs restent normalisées et respectent la taille minimale `0.02` ainsi que les limites de l’image.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/teacher-anonymization-advanced.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `reports/084_proto05_temporal_mask_drag_transaction.md`

## Contrôles effectués

- `npm run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis, couvrant l’atelier avancé, la dérivation temporelle, l’interpolation, la provenance, les dérivations fixes et le nettoyage.
- Vérification statique : instant capturé au `pointerdown`, brouillon séparé, commit au `pointerup`, annulation, quatre coins, `setPointerCapture`, `lostpointercapture`, `pointer-events`, `z-index`, normalisation des temps et sauvegarde `temporalMasks`.

La recette Chromium obligatoire à 1440 px puis en fenêtre réduite n’a pas pu être exécutée dans cette session, faute d’outil Chromium disponible. Elle doit encore confirmer visuellement les quatre poignées, les gestes rapides, l’absence de clés intermédiaires, le comportement après scroll/redimensionnement et la persistance après actualisation.

Les modifications préexistantes de `data/video-library.json`, de l’atelier fixe et des rapports 077–083 ont été conservées sans intervention. Aucun commit ni push.

Limites restantes : images-clés manuelles uniquement, sans suivi automatique, détection de visage ou anonymisation vocale.

Message de commit proposé : `Proto05: transactionnaliser les déplacements temporels`.
