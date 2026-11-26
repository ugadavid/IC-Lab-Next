# Note de validation documentaire - IC-Hub

Date : 9 septembre 2026. Contrôles réalisés par Codex ; validation éditoriale et fonctionnelle humaine de David non obtenue.

## Périmètre et sources

Guide professionnel de prise en main du portail uniquement, en 2 pages. Aucune documentation des anciens parcours de comptes, cours ou suivi. Dico-IC est présenté comme réservé aux enseignants et professionnels par consigne d’usage, sans prétendre à une protection technique par rôle. Les enseignants transmettent le parcours étudiant approprié et son guide.

Lecture de `AGENTS.md`, des documents de provenance, d’architecture, de lancement et de statut, du README du serveur Hub, de `server/server.js`, de `public/portal-0.10.4.html` et de sa feuille de style. Vérification des six titres et chemins des guides détaillés cités. Les services existants ont été réutilisés sans redémarrage ; aucun lanceur n’a été créé ou exécuté.

Le navigateur atteint `/portal-0.10.4.html` depuis la racine. La version 0.10.3 encore mentionnée dans certains documents généraux ne décrit donc plus le portail servi. Certains badges de versions des outils dans l’accueil sont également historiques (par exemple Informaticaire V0.6.5, alors que l’outil affiche V0.7.1). La capture conserve fidèlement ces mentions ; elles ne sont pas reprises comme versions courantes des outils dans le texte du guide. Aucune version applicative modifiée.

## Destinations contrôlées dans le navigateur

Origine du portail : `http://127.0.0.1:8790/`. Chaque lien ci-dessous a été cliqué depuis l’accueil. Chaque arrivée a été contrôlée par l’URL et le contenu visible de la page. Le retour dans l’historique du navigateur ramène au portail, dans le même onglet.

| Bouton exact | Destination observée | Résultat de l’ouverture |
| --- | --- | --- |
| Entrée générale Proto05 | `http://127.0.0.1:8791/` après `/demos/augmented-video/` | Vue de consultation vidéo, transcription et timeline affichées. |
| Vue étudiant · activité historique | `http://127.0.0.1:8791/student/proto05-augmented-video-01` | Consultation de l’activité historique affichée. |
| Espace enseignant | `http://127.0.0.1:8791/teacher` | Bibliothèque d’activités affichée, 5 résultats lors du contrôle. |
| Atelier guidé · activité historique | `http://127.0.0.1:8791/teacher/guided/proto05-augmented-video-01` | Atelier guidé de l’activité affiché. Aucune modification ni sauvegarde. |
| Mode avancé · activité historique | `http://127.0.0.1:8791/teacher/author/proto05-augmented-video-01` | Atelier auteur affiché. Aucune modification ni sauvegarde. |
| Ouvrir l’Agent vocal | `http://127.0.0.1:8788/library-1.1.html` | Bibliothèque REPLI4C et filtres affichés. Aucune activité vocale lancée. |
| Ouvrir Informaticaire | `http://127.0.0.1:8790/demos/informaticaire/` | Accueil de consultation V0.7.1 affiché. |
| Ouvrir l’administration Dico-IC | `http://127.0.0.1:3000/admin-app/index-admin-0.1.html` | Administration V0.1.8 affichée avec « API connectée ». |
| Ouvrir Seven Sieves | `http://127.0.0.1:3000/prototypes/01-seven-sieves/index-teacher-0.1.html` après le lien `index-api-live-0.1.html` | Préparation enseignant V0.1.3 affichée. Aucune analyse lancée. |

Aucune des neuf destinations de démonstrateur n’était indisponible lors de cette vérification. Cela établit l’ouverture des accès, pas une validation complète des fonctions de chaque prototype. Le lien « Mon espace local » vers `/hub.html` est présent dans le code et dans l’accueil ; sa destination historique n’a pas été ouverte, conformément au périmètre. Aucun accès à Alpaga ou dev-lab, ni appel payant.

## Livrables et contrôle visuel

- `guide-utilisateur.md` et `guide-utilisateur.pdf` : 2 pages, sans couverture séparée ; tableau besoin / outil / accès, consigne de transmission aux étudiants et six liens vers les PDF détaillés.
- `images/accueil.png` : capture réelle de la zone des cinq cartes, à une largeur de navigateur de 1280 pixels et haute densité. Deux zones contiguës de la même page ont été raccordées à leurs coordonnées originales pour obtenir toute la hauteur, puis les marges latérales ont été recadrées. Aucun contenu d’interface n’a été masqué, inventé ou redessiné. Image finale : 4720 × 3564 pixels, placée sur la largeur utile du PDF. Aucun repère ajouté : les titres des cartes suffisent.
- Retouche autorisée dans `../informaticaire/guide-utilisateur.md` et son PDF : ajout de la précision demandée sur « Depuis cette fiche » / « Vers cette fiche » à la page 4, en remplacement de l’explication précédente pour éviter la répétition. Le guide reste à 5 pages ; ses images et sa note de validation sont inchangées.
- Les 7 pages des deux PDF ont été rendues puis inspectées visuellement : captures lisibles, légendes et tableaux complets, marges respectées, absence de débordement. Les pages 1, 2, 3 et 5 d’Informaticaire sont également identiques pixel par pixel aux rendus antérieurs.
- Concordance exacte du texte Markdown/PDF vérifiée sur les 7 pages, après normalisation des espaces et des marques de mise en forme, hors pieds de page et texte inclus dans les captures.
- Les six liens de guides dans le Markdown et les annotations du PDF ciblent des fichiers existants, portant les titres annoncés. Leur ouverture par tous les lecteurs PDF n’a pas été testée ; les liens relatifs nécessitent de conserver l’organisation des dossiers de livraison.
- Comparaison SHA-256 des guides présents avant la mission : seuls les deux fichiers Informaticaire autorisés changent ; les 36 autres fichiers sont préservés.

## Limites et suite

Les URL publiques et les modalités d’accès restent explicitement à compléter. Les destinations publiques futures et leur disponibilité hors de l’environnement local ne sont pas vérifiées. Aucun audit des ressources externes, des activités vocales, ni des fonctions métier internes n’a été réalisé ; pas de campagne générale de tests. Aucun guide utilisateur dédié à l’Agent vocal n’existe dans le dossier des guides lors de cette mission.

La capture contient les indications techniques actuellement visibles dans l’interface ; le texte d’accompagnement ne les transforme pas en consignes de lancement. La procédure « outil indisponible » est une consigne de recours, sans simulation de panne ni arrêt des services.

À confirmer par David : validation éditoriale finale et informations d’accès à publier. Aucun commit ni push. L’onglet de recette a été fermé ; aucun service n’a été démarré ou arrêté.
