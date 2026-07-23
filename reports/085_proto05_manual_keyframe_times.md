# Mission 085 — Proto05 : temps des images-clés renseigné manuellement

## Version et périmètre

Proto05 uniquement. Version serveur inchangée : `0.1.30`. L’atelier fixe, les dérivés existants, les profils et les données canoniques sont préservés.

## Contrat corrigé

Le temps d’une image-clé est désormais une donnée explicitement renseignée par l’utilisateur. Les actions `pointerdown`, `pointermove` et `pointerup` ne lisent pas `video.currentTime` pour créer une clé et ne modifient jamais le temps de la clé sélectionnée.

L’interface fournit :

- un champ `Temps de l’image-clé (ms)` ;
- `Ajouter une image-clé` ;
- `Enregistrer la position actuelle` ;
- `Supprimer cette image-clé` ;
- une indication de l’image-clé active.

Une poignée ne fonctionne que lorsqu’un masque et une image-clé sont sélectionnés. Le geste transporte la référence de l’image-clé sélectionnée et un brouillon de géométrie. Plusieurs centaines de `pointermove` ne modifient pas le modèle et ne créent aucune ligne. Au `pointerup`, seule la géométrie de cette clé est enregistrée et une seule sauvegarde `temporalMasks` est programmée. `pointercancel`, perte de focus ou interruption annulent le brouillon.

Les quatre poignées restent indépendantes et visibles (`nw`, `ne`, `sw`, `se`), avec `z-index`, `pointer-events:auto`, capture du pointeur et repère basé sur le `getBoundingClientRect()` du calque vidéo réel.

## Temps et anciennes clés

Le serveur ne fusionne plus automatiquement les temps réellement distincts et ne les arrondit plus. Deux temps manuels, par exemple 3000 ms et 3001 ms, restent distincts. Aucune migration destructive des éventuelles anciennes micro-clés n’est effectuée; leur traitement reste séparé et doit être explicitement décidé.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-anonymization-advanced.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`
- `reports/085_proto05_manual_keyframe_times.md`

## Contrôles

- `npm run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis.
- Le test vérifie la route avancée, la persistance de deux temps manuels distincts dont 3000 ms, la dérivation temporelle, l’interpolation, la provenance et l’absence de régression du pipeline fixe.
- Vérification statique : absence d’appel à `currentTime()` dans la transaction de poignée, absence d’`upsertKeyframe` pendant `pointermove`, commit géométrique au `pointerup`, contrôle manuel du temps et quatre poignées.

La recette Chromium réelle demandée n’a pas pu être exécutée dans cette session, faute d’outil Chromium disponible. Elle doit encore vérifier visuellement qu’un déplacement rapide avec 500 mouvements ne crée aucune étape, que les quatre poignées fonctionnent, et que les temps saisis manuellement persistent après actualisation.

Les modifications préexistantes de `data/video-library.json`, de l’atelier fixe et des rapports 077–084 ont été conservées sans intervention. Aucun commit ni push.

Limites restantes : les images-clés restent manuelles; aucune détection, suivi automatique ou anonymisation vocale n’est ajouté.

Message de commit proposé : `Proto05: dissocier le temps manuel de l’interaction des poignées`.
