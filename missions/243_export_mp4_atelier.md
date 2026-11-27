# Mission 243 — Exporter le montage image et son en MP4

Branche `atelier-anonymisation`. David a retrouvé dans Edge ses trois versions serveur avec les bons masques et le bon son. Partir du [rapport 242](../reports/242_versions_montage_serveur_report.md) et des pipelines FFmpeg repérés dans le [rapport 238](../reports/238_etude_raccordement_atelier_proto05_report.md).

## Parcours

Dans l’atelier, **Exporter en MP4** rend la vidéo entière à partir de la version serveur ouverte. En présence de retouches ou d’un premier brouillon, proposer en un seul parcours d’enregistrer une version puis de l’exporter, avec possibilité d’annuler. Montrer le nom de la version rendue, l’état réel du traitement et, à la fin, un accès pour lire et télécharger le MP4. Une erreur doit préserver le montage et permettre de réessayer.

## Rendu et vidéothèque

Réutiliser les traitements éprouvés pour produire un seul MP4 qui correspond à l’aperçu : coordonnées dans l’image source, ensemble des masques actifs, coupures et remplacements sonores aux mêmes bornes, y compris les chevauchements. Vérifier la règle effective de priorité de l’aperçu. Si un effet ne peut pas être rendu fidèlement, le signaler avant publication. Couvrir aussi les montages image seule, son seul et les sources sans piste audio. Sélectionner explicitement les flux de sortie pour éviter toute piste originale alternative susceptible de révéler le contenu masqué. Préserver durée et synchronisation.

Associer le résultat à la vidéo, à sa source et à la version de montage figée au lancement. Publier une seule fois un dérivé lisible après validation du fichier. F5, double-clic et reprise d’une même demande doivent retrouver ce travail. Préserver originaux et variantes. Sur la carte source afficher **✓ Anonymisée** après le premier export réussi de ce nouvel atelier ; un projet enregistré ou un export en échec ne suffit pas. L’ancien éditeur reste utilisable. Aucune reprise ni suppression des anciens essais.

## Validation et livraison

Avec un média synthétique à cible visible et son identifiable, produire un fichier où le flou précède la coupure et où la voix revient. Ouvrir le MP4 téléchargé hors de l’atelier. Contrôler les images, les échantillons audio et les flux présents avant, pendant et après les effets, dont un passage en chevauchement ; comparer à l’aperçu. Exporter une autre variante de la même source et vérifier la filiation, le premier fichier et l’original. Tester échec, nouvelle tentative et absence de double inscription. Documenter les vérifications effectivement réalisées et une recette courte pour CODEX_VM ; si le schéma évolue, fournir la migration selon les conventions en place.

Livrer le code et `reports/243_export_mp4_atelier_report.md`. Faire commit et push sur `origin/atelier-anonymisation`, vérifier les livrables sur GitHub et le SHA distant, transmettre le lien du rapport et le SHA puis s’arrêter pour validation. En cas d’échec du push, signaler le blocage et le SHA local.
