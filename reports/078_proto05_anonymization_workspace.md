# Mission 078 — Proto05 : page dédiée d’édition et d’anonymisation vidéo

## Périmètre

Mission limitée au Prototype 05. Aucune activité canonique ni autre prototype n’a été modifié. La version applicative reste `0.1.29`.

## Réalisation

- ajout de la page dédiée `/teacher/anonymization/:jobId` ;
- accès depuis la Library par l’action « Éditer les masques » ;
- espace de travail grand écran séparé de la grille de cartes : vidéo, calque, poignées de déplacement/redimensionnement, liste latérale et coordonnées normalisées ;
- actions « Réinitialiser », « Valider les masques », « Lancer la dérivation » et « Annuler » ;
- affichage de la source, du job de préparation, de l’état et de la provenance ;
- mention explicite du caractère manuel des masques et de l’absence de détection automatique ;
- persistance temporaire des masques via `PUT /api/proto05/library/hls-preparations/:jobId` et rechargement par `jobId` ;
- accès média temporaire de la préparation pour le lecteur ;
- conservation de la validation serveur, des identifiants stables, de la transmission FFmpeg, de la persistance atomique et du nettoyage existants.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-anonymization.html` — nouvelle surface de travail ;
- `prototypes/05-augmented-ic-video-01/teacher-videos.html` — navigation depuis la Library et résumé conservé ;
- `prototypes/05-augmented-ic-video-01/server/server.js` — route de page, persistance de la configuration temporaire et média de préparation ;
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js` — inclusion de la page dans les serveurs de test ;
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js` — contrôles ciblés de la page, des masques et de la dérivation.

## Vérifications

- `npm run check` : réussi ;
- tests ciblés HLS/anonymisation : 2 sous-tests réussis ; couverture ajoutée pour les coordonnées invalides, identifiants dupliqués, sauvegarde/rechargement, dérivation et nettoyage ;
- Chromium : Library → « Éditer les masques » → page dédiée ; ajout de deux masques, modification de coordonnées, réinitialisation, recréation, validation, actualisation, dérivation, provenance, fichier dérivé et retour Library ;
- Chromium : aucune erreur applicative dans la console ; dimensions inspectées sans débordement horizontal ; recette réalisée sur la fenêtre disponible, puis vérification responsive par les règles de mise en page de la page dédiée.

## Limites restantes

- aucune détection automatique, aucun suivi temporel et aucune anonymisation vocale ;
- la préparation et sa configuration restent temporaires jusqu’au lancement ou à l’annulation ;
- la page est fournie pour les jobs de préparation HLS existants ; l’extension à d’autres workflows de Library pourra être traitée séparément ;
- la validation Chromium n’est pas une validation humaine formelle.

## Suite proposée

Ajouter ultérieurement la gestion de plusieurs formats de préparation, les états de reprise de job plus riches et, si nécessaire, une recette visuelle dédiée sur une fenêtre strictement dimensionnée à 1440 px.

## Commit proposé

`feat(proto05): add dedicated anonymization workspace`

Aucun commit ni push effectué.
