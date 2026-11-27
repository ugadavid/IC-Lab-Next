# Mission 242 — Enregistrer et retrouver les versions d’un montage dans l’atelier

Branche `atelier-anonymisation`. David a validé sur sa vidéo le flou, la coupure du son et Ctrl+Y après F5. Partir de la [mission 241 et de sa recette](../reports/241_timeline_image_son_atelier_report.md).

## Parcours attendu

Dans le nouvel atelier, **Enregistrer une version** propose un nom prérempli, modifiable. Chaque enregistrement explicite conserve une nouvelle copie datée du projet sur le serveur. **Versions (n)** ouvre une liste compacte, la plus récente en premier, avec nom, date et action pour rouvrir. Prévoir le cas de la première visite. Repartir d’une ancienne version permet de créer une nouvelle variante en conservant les précédentes. Si ouvrir une version remplace des modifications en cours, permettre de les garder ou d’annuler.

## Raccordement

Réutiliser le format de projet et la restauration de la 241, y compris pistes, coordonnées, curseur, sélection, zoom et historique Ctrl+Z/Y. Conserver la reprise automatique locale et les commandes d’import/export JSON. Le serveur conserve le projet et ses métadonnées, sans recopier le média. Utiliser la persistance durable de Proto05 et ses conventions d’accès. Rattacher chaque enregistrement au couple stable vidéo du catalogue / version source choisie, y compris après renouvellement d’une préparation. Vérifier cette association côté serveur à l’écriture et à la lecture. Un double-clic ou la reprise d’une requête ne doit pas dédoubler le même enregistrement ; deux enregistrements distincts doivent tous deux subsister. Afficher le succès après confirmation du serveur. En cas d’échec, conserver le travail et permettre de réessayer.

On commence avec une liste vide. L’ancien éditeur reste accessible jusqu’à validation du nouvel atelier. La reprise des anciens essais, leur suppression, le retrait des dépendances historiques, la coche de vidéothèque et l’export MP4 sont hors périmètre.

## Recette et livraison

Sur un média de démonstration, enregistrer « Visages seuls », ajouter une coupure et enregistrer « Visages + voix ». Redémarrer Proto05 et ouvrir un autre profil navigateur pour vérifier la persistance serveur. Rouvrir la première version, vérifier ses réglages et son historique puis créer une troisième variante. Vérifier que la deuxième conserve sa coupure, qu’une autre source possède sa propre liste et qu’un échec de sauvegarde préserve le brouillon. Tester le chemin utilisateur réel et distinguer dans le rapport les essais exécutés des contrôles à faire sur CODEX_VM.

Livrer le code et `reports/242_versions_montage_serveur_report.md` avec recette courte et, si nécessaire, modalités d’application du changement de schéma sur la base existante de la VM. Faire commit et push sur `origin/atelier-anonymisation`, vérifier les livrables et le SHA distant, transmettre le lien du rapport et le SHA puis s’arrêter pour validation. Si le push échoue, signaler la cause et le SHA local.
