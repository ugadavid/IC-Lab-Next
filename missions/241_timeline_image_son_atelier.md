# Mission 241 — Monter l’image et le son sur une vidéo du catalogue

Branche `atelier-anonymisation`. David a validé sur son catalogue le parcours Anonymiser jusqu’à la lecture après la correction FFmpeg de Proto05 0.1.65. Objectif suivant : dès que cette même vidéo est prête, pouvoir la monter et prévisualiser ensemble le flou et le son.

## Raccordement

Partir de la [V12 validée](../prototypes/05-augmented-ic-video-01/maquettes/atelier-anonymisation/Atelier-anonymisation-v12.html), de la route atelier livrée en 239 et des cas de conversion du [rapport 238](../reports/238_etude_raccordement_atelier_proto05_report.md). Réutiliser les interactions de la maquette. Brancher la source lisible du catalogue, sa durée et son horloge réelle, y compris après préparation distante. Entrer directement en édition sur la bonne version, sans sélection de fichier local. Conserver la reprise de préparation et les erreurs récupérables.

- Deux pistes Image et Son dans la même fenêtre. Conserver les gestes V12 : ajout au curseur, déplacement et redimensionnement des passages, découpe et réglage des bornes, zoom, aimants, boucle, raccourcis, annuler/rétablir et choix de disposition.
- Prévisualiser réellement les effets pendant la lecture et après déplacement du curseur. Vérifier que le son original revient à la sortie du passage. Vérifier la position du flou sur une vidéo à bandes latérales et après changement de disposition.
- Conserver les fonctions de projet et de reprise de la V12. Associer la sauvegarde automatique à la vidéo et à sa version, indépendamment d’un job de préparation temporaire. Recharger le montage, le curseur et l’historique. Vérifier qu’ouvrir une autre version n’y reporte aucun passage de la première.
- Le livrable de ce lot est l’édition avec aperçu dans le navigateur. L’export combiné fera l’objet d’une mission après validation. Préserver les parcours historiques, les sources et les associations du catalogue.

## Recette et clôture

Dans un navigateur, ouvrir le nouvel atelier par une carte, utiliser un court média d’essai avec une cible visible et un son identifiable, placer un flou et une coupure qui se recouvrent partiellement, vérifier à la lecture les deux effets et leurs bornes. Déplacer un passage, annuler, recharger et rétablir. Contrôler une autre version puis revenir au montage. Vérifier aussi l’entrée historique sur la même carte. Consigner les tests exécutés, les limites et une recette courte pour David sur CODEX_VM dans `reports/241_timeline_image_son_atelier_report.md`.

Faire commit et push du code et du rapport sur `origin/atelier-anonymisation`. Vérifier le SHA distant et la lecture des livrables sur GitHub. Transmettre le lien du rapport et le SHA puis s’arrêter pour validation. Si le push échoue, indiquer le blocage et le SHA local.
