# Mission 161 — Intégrer l’aperçu dans la zone média des cartes

Date : 1er août 2026

## Périmètre

Correction locale de la vidéothèque Proto05. Aucun lecteur, contrat média,
endpoint, donnée MariaDB ou comportement d’import n’a été créé ou modifié.

## Cause et correction

Le conteneur `.preview` était rendu après les actions de la carte. Son ouverture
ajoutait donc un bloc sous la carte et augmentait la hauteur de la ligne, tandis
que la miniature restait visible.

Le même conteneur de lecteur partagé est désormais rendu à l’intérieur de
`.asset-thumb`, à côté du visuel initial :

- au clic, le visuel est masqué et le lecteur occupe exactement la boîte média
  existante en ratio 16:9 ;
- le bouton devient `Fermer l’aperçu` et expose `aria-pressed="true"` ;
- la fermeture détruit le lecteur, vide son point de montage, restaure le visuel
  et le libellé `Aperçu` ;
- l’ouverture d’une autre carte détruit et ferme l’aperçu précédent ;
- aucun média n’est chargé avant le clic ;
- les fournisseurs déjà pris en charge (`local`, `direct`, `uga`, `youtube`)
  continuent d’utiliser `createICVideoPlayer` ;
- deux anciens décorateurs d’aperçu local réutilisent maintenant ce parcours
  commun et ne peuvent plus ajouter un bouton ou un lecteur concurrent.

## Vérifications

- test ciblé `node --test test/video-workspaces.test.js` : 10/10 ;
- nouveau test statique : point de montage dans `.asset-thumb`, absence du bloc
  sous la carte, dimensions communes, libellés, fermeture de l’ancien lecteur
  et absence de l’ancien chargement local parallèle ;
- `node --check server.js` : réussi ;
- `git diff --check` : réussi.

Recette visuelle sur `/teacher/videos` avec MariaDB réelle, sans mutation :

- grille, HLS UGA : carte `580,359375 px` avant et après ;
- zone média et lecteur : `366 × 205,875 px` avant et après ;
- un élément vidéo créé uniquement après le clic ;
- miniature masquée, bouton `Fermer l’aperçu`, un seul aperçu ouvert ;
- ouverture d’un YouTube : HLS fermé, miniature HLS restaurée, YouTube seul
  ouvert ;
- fermeture YouTube : miniature, libellé et `aria-pressed="false"` restaurés,
  aucun `video` ou `iframe` restant dans la carte ;
- vue liste : mêmes dimensions `180 × 101,25 px` et hauteur de carte strictement
  identique avant/après ouverture ;
- aucun avertissement ni erreur dans la console du navigateur ;
- serveur de recette arrêté et port `8791` libéré.

La recette a contrôlé l’invariance de la vue liste, pas son esthétique générale
préexistante, hors périmètre de cette correction.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-videos.html` ;
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js` ;
- sources de version Proto05 : `server/package.json`, `server/server.js`,
  `server/README.md`, `teacher-video-detail.html`, `ANONYMIZATION_ENGINE.md` ;
- présent rapport.

## Version et validation humaine

La convention de baby steps porte Proto05 de `0.1.53` à `0.1.54`. La recette
Codex est concluante ; elle ne remplace pas la validation humaine de David.

## Proposition de message de commit

`fix(proto05): intégrer l’aperçu dans la zone média des cartes`
