# Mission 245 — Extraire l’anonymiseur pour l’application de Christian

## Livraison attendue

Produire un dossier de sources autonome et transportable dans `extractions/anonymiseur/` sur la branche `atelier-anonymisation`. Source de référence : Proto05 0.1.69, commit `2098bc4a92feb6839ac0f256258b79ef40286d1a`. Le dossier doit pouvoir être copié seul dans le futur projet. L’objet de cette mission est le code extrait et vérifié. Le choix de l’enveloppe desktop et de l’installateur viendra après l’essai. Laisser le site, ses dépendances et l’ancien éditeur en place.

## Ce qui doit voyager

- Partir du véritable atelier intégré (page, styles, timeline, commandes de versions et d’export) et du moteur éprouvé, notamment `server/workshop-mp4.js` et ses dépendances nécessaires. Suivre les imports et dépendances implicites. Préserver les interactions image/son validées, la prévisualisation, le projet JSON v2, la reprise et les variantes nommées ainsi que le rendu MP4 et ses contrôles. Réutiliser les tests pertinents.
- Remplacer les points d’attache à la vidéothèque par un raccord local minimal : choix du média, sauvegarde et réouverture du projet et des variantes, destination du MP4. Réutiliser FFmpeg et FFprobe déjà installés. Limiter les adaptations à ce qu’exige l’autonomie ; documenter leur provenance. Préserver le fichier source et les variantes lors d’un export.
- Exclure du lot le Hub, Docker/MariaDB, le catalogue, les acquisitions HLS, les médias du labo, les projets personnels, les caches, les secrets et les exécutables FFmpeg. Fournir les dépendances réellement utilisées, leurs versions, les notices applicables et les commandes de lancement. Aucun chemin d’import ou de ressource ne doit remonter dans le dépôt parent.

## Preuve de l’extraction

Copier le dossier seul dans un répertoire temporaire hors du dépôt et lancer la recette depuis cette copie, sans services IC-Lab. Avec un petit média synthétique local, ouvrir l’atelier, poser un flou et une coupure décalée, sauvegarder deux variantes, fermer, rouvrir, exporter puis lire le MP4 hors de l’atelier. Vérifier sur le fichier les bornes du flou, le retour du son et l’absence de piste originale alternative. Indiquer les prérequis exacts sur CODEX_VM et distinguer les vérifications réalisées des limites éventuelles.

Livrer dans le dossier un README court permettant à David de rejouer la recette. Dans `reports/245_extraction_anonymiseur_autonome_report.md`, lister les sources reprises, les adaptations locales, les dépendances et les résultats. Faire commit et push de l’extraction et du rapport sur `origin/atelier-anonymisation`. Vérifier que la branche distante contient le commit et les livrables, transmettre le lien du dossier, du rapport et le SHA vérifié, puis s’arrêter pour validation. Si le push échoue, communiquer le blocage et le SHA local.
