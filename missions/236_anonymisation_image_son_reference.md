# Mission 236 — Rejouer les traitements image et son de Proto05

## Objectif

Établir une référence reproductible pour réunir les deux ateliers dans le site, puis réutiliser leur traitement dans une application de bureau pour Christian. Le rapport 235 situe le moteur image et le module audio. Aucune dérivation média n’a encore été vérifiée sur CODEX_VM.

## Travail sur CODEX_VM

- Lire AGENTS.md et le rapport 235. Vérifier la branche et l’état du clone, puis le synchroniser avec main en préservant les fichiers locaux. Si la session limite Git, lire le brief canonique sur GitHub et poursuivre les vérifications accessibles.
- Suivre chacun des deux parcours depuis la fiche enseignant jusqu’au fichier produit. Identifier les écrans, routes, fonctions, entrées, outils externes et sorties réellement utilisés. Repérer où interviennent MariaDB, la préparation HLS et les fichiers temporaires. Identifier la frontière à laquelle on peut exercer le traitement existant sur une vidéo locale.
- Chercher les tests, médias de démonstration et exécutables FFmpeg/FFprobe déjà disponibles, y compris ceux référencés par la configuration documentée. Choisir un court témoin synthétique avec image et son, dans un répertoire temporaire. Utiliser les points d’entrée existants les plus simples. Essayer un masque sur un intervalle et un traitement audio existant sur le même témoin. Pour chaque essai, consigner le geste ou la commande reproductible, la sortie et le contrôle effectué sur la piste concernée et la piste conservée. Si le code le permet déjà, vérifier aussi si les deux effets subsistent dans un seul export.
- Si une étape bloque, poursuivre l’autre parcours. Localiser le premier prérequis manquant et indiquer la manipulation minimale à faire sur la VM ou l’élément précis à reprendre de ZI. Distinguer les restrictions constatées dans la session et les dépendances réellement absentes de la machine.

## Périmètre et clôture

Recette et étude de l’existant. Utiliser une fixture jetable et les outils disponibles. Les données privées, les secrets, la restauration des bases, l’installation système et les modifications du produit sont hors périmètre. Garder médias, exports et fichiers temporaires hors Git.

Produire un rapport court dans reports/ selon AGENTS.md. Inclure le résultat des essais, les chemins utiles et les contraintes concrètes pour une fenêtre commune dans le site. Même en cas de résultat partiel ou bloqué, faire un commit contenant uniquement le rapport et le pousser sur origin/main. Vérifier que le commit est présent sur la branche distante et que le rapport est lisible. Renvoyer le lien et le SHA vérifié, puis s’arrêter pour la lecture avec David.
