# Note de validation documentaire — Vidéo augmentée

Date : 9 septembre 2026. Mission documentaire uniquement. La recette de Codex ne constitue pas une validation humaine de David.

## Livrables et périmètre

- `guide-enseignant.md` et `guide-enseignant.pdf` : **8 pages**.
- `guide-etudiant.md` et `guide-etudiant.pdf` : **4 pages**.
- Six captures réelles recadrées dans `images/` : `bibliotheque.png`, `versions-media.png`, `moment-transcription.png`, `lecteur-etudiant.png`, `frise.png`, `annotation.png`.
- Rapport de mission : `reports/232_video_augmentee_user_guides_report.md`.

Les deux guides sont autonomes. Le guide enseignant commence par une activité existante, puis traite création, duplication, fiche, médias, ateliers, enrichissements, partage et conservation. Le guide étudiant reste limité à la consultation, aux aides d’affichage et aux observations personnelles. Les URL publiques et modalités d’accès sont explicitement à compléter.

Les guides Seven Sieves et Dico-IC validés servent de référence éditoriale et n’ont pas été modifiés. La comparaison des empreintes SHA-256 de leurs 20 fichiers avec le relevé de début de mission confirme leur préservation.

## Sources actuelles consultées

Instructions du dépôt, `docs/ARCHITECTURE.md`, `PROJECTS_LAUNCH.md`, README du prototype et du serveur, puis formulaires et traitements actuels de `prototypes/05-augmented-ic-video-01/`.

Sources déterminantes : `teacher-create.html`, `teacher-edit.html`, `teacher-guided.html`, `guided-overlays.js`, `teacher-author.html`, `teacher-videos.html`, `teacher-video-detail.html`, `teacher-anonymization.html`, `teacher-audio-anonymization.html`, `index-0.0.9.html`, ainsi que les contrats de transcription, overlays, édition guidée, bibliothèque, identité pédagogique et suppression des médias. Les descriptions historiques n’ont pas été prises pour preuve d’un comportement contraire au code actuel.

Version applicative inchangée : serveur Proto05 **0.1.63**, lecteur **0.0.9**. Des écrans conservent des badges de version propres, dont la fiche vidéo affichant 0.1.58 ; aucune harmonisation de ces badges n’entre dans cette mission.

## Parcours réellement essayés dans Chromium

Services déjà disponibles réutilisés : Proto05 sur `http://127.0.0.1:8791`, avec le service média existant IC-Hub. Aucun serveur, lanceur ou environnement de démonstration n’a été créé ou démarré.

Activité de référence : **Vidéo augmentée d’intercompréhension**, identifiant `proto05-augmented-video-01`. Consultation de sa source UGA, durée affichée d’environ 15 min 39 s ; 11 moments de transcription disponibles, limités aux premières minutes.

| Parcours | Observation effective |
| --- | --- |
| Bibliothèque | Recherche du titre, lecture de la carte, ouverture de la fiche et du menu d’actions proposant Dupliquer et Supprimer. |
| Fiche d’activité | Lecture des champs, états et rubriques ; aucune saisie enregistrée. |
| Atelier guidé | Sélection du moment 3:06–3:45 sur « carrera », lecture des champs du moment, d’une annotation et d’un overlay. Aucun ajout, Appliquer ou enregistrement. |
| Atelier expert | Consultation des sections et commandes de préparation ; aucune modification. |
| Création | Ouverture de Ajouter une activité, inspection du choix de média et de Créer le brouillon ; aucune création. |
| Vidéothèque | Consultation des cartes, du formulaire Ajouter une vidéo et de la fiche du média « 2. GT01_RFC7_reu1_14m34-18m ». Original, copie de travail et tentative dérivée observés. Aucun import, transfert, contrôle de disponibilité ou traitement lancé. |
| Prévisualisation | Ouverture de `/teacher/preview/proto05-augmented-video-01` : navigation enseignante présente. |
| Accès étudiant réel | Ouverture de `/student/proto05-augmented-video-01` : mention Vue étudiant · consultation, sans commandes d’auteur. Le parcours fonctionne pour l’activité enregistrée portant l’état Brouillon. |
| Lecture synchronisée | Clic sur le segment 3:06–3:45 : déplacement vers 186 s et démarrage ; pause par le lecteur, annotation et question sur « carrera » visibles. |
| Frise | Clic sur la barre Français 03:06–03:45 : retour à 186 s en conservant la pause. |
| Affichage | Entrée et sortie du Mode Focus ; repli du panneau de couches ; décochage d’une couche puis de toutes les couches dans un autre onglet. Les 11 transcriptions restent affichées tandis que leurs étiquettes disparaissent. |
| Observations | Ajout d’une observation, saisie d’une note personnelle, ouverture du tableau, commande Exporter CSV et message Export CSV généré. Suppression de la ligne vérifiée ensuite : compteur revenu à zéro. |
| Indépendance des onglets | Nouvelle ouverture de la même adresse : position initiale et Mes observations (0), sans la note présente dans le premier onglet. |

Les captures utilisées proviennent de consultations aux dimensions représentatives 1000 × 720 et 1280 × 720, avec capture en haute définition puis recadrage. Aucun écran n’a été redessiné et aucun contenu d’interface n’a été inventé. Les extraits de transcription et d’annotation reproduisent le contenu existant, sans correction éditoriale de ses formulations. Pas d’erreur visible sur les états de consultation retenus. Les quatre onglets créés pour cette mission ont été fermés.

## Comportements établis par lecture du code

- Création et duplication : mutations explicites ; la duplication crée une activité distincte conservant la référence au média. Le formulaire de création redirige vers l’atelier guidé après réussite.
- Fiche, atelier guidé et expert : sauvegardes explicites avec gestion de révision. Appliquer reste une mutation du travail en mémoire ; la requête d’enregistrement conserve l’activité. Un conflit ne prouve pas une sauvegarde et impose de préserver ses saisies avant rechargement.
- Classement d’une activité par Dossier et association d’un média : écritures directes à la commande ; ils n’attendent pas l’enregistrement de l’atelier. La vue Grille/Liste utilise une préférence locale du navigateur.
- Association vidéo : changement de référence de lecture, sans réécriture automatique de la transcription. Modification d’une fiche média : informations partagées de ce média, enregistrées explicitement ; distinction des originaux, copies, dérivations et références publiées.
- Aucun mécanisme de publication d’activité ou contrôle des droits de consultation déduit de l’état Brouillon/Documentée/À requalifier/Archivée. L’accès réellement constaté au brouillon confirme la distinction. Les futures modalités d’accès restent à définir.
- Copie d’observation : contenu du segment avec ses notes et questions pédagogiques, distinct du tableau personnel. CSV : paroles complètes, horaires, locuteurs, langues, catégories et notes personnelles ; les textes des annotations et questions n’y sont pas exportés.
- Observations, position de lecture, choix de couches et Focus : mémoire de la page, sans sauvegarde de progression ni remise de travail. La réinitialisation au rechargement est établie par l’initialisation du lecteur ; la nouvelle ouverture a été essayée, mais le rechargement du même onglet n’a pas fait l’objet d’un essai distinct.
- Suppression guidée d’un segment : retrait de ses phénomènes et annotations et des overlays liés à ces annotations ; détachement et conservation des intervalles de langues. Suppressions de couche/locuteur, activité et médias soumises aux références ou dépendances prévues dans leurs traitements.
- Anonymisation image : préparation temporaire, masques manuels, réglage du flou, images-clés, validation puis dérivation. Anonymisation audio : passages bornés sans chevauchement, effets proposés, plan enregistré dans MariaDB, enregistrement du plan modifié avant lancement, distinction aperçu local/fichier produit.
- Les boutons Anonymiser l’image et Anonymiser le son déclenchent une préparation par POST avant l’ouverture des ateliers ; ils n’ont donc pas été utilisés pour obtenir une capture. Ajouter une version publiée rattache une référence distante après analyse et confirmation ; ce n’est pas un transfert du fichier vers un hébergement.

## Opérations non vérifiées et limites

Aucun environnement isolé déjà disponible pour écrire n’a été identifié. Aucune donnée métier n’a été créée, modifiée ou supprimée par une action de cette mission. Création, duplication, enregistrement auteur, association, classement, suppression, import, analyse distante, anonymisation, publication de référence et conflits de sauvegarde n’ont pas été exécutés. Leurs explications reposent sur les formulaires et traitements actuels.

Le fichier CSV n’a pas été ouvert dans un tableur : le déclenchement et le message de génération ont été observés, son contenu est établi par la construction du CSV dans le lecteur. La copie via le presse-papiers, l’écoute d’un export anonymisé, les sources YouTube et toutes les autres vidéos du catalogue n’ont pas été essayées. Aucune campagne générale de tests ni validation d’Alpaga ou de dev-lab.

La disponibilité des traitements médias sur Alpaga, les URL publiques, les modalités d’accès et le choix final des activités de démonstration restent à confirmer. Les captures décrivent le contenu disponible au moment de la mission et ne garantissent pas sa présence sur le futur hébergement. La validation éditoriale et fonctionnelle humaine finale de David reste attendue.

## Contrôle des documents

- PDF construits à partir des Markdown, sans seconde rédaction indépendante ; textes, légendes, titres, tableaux et renvois conservés.
- Contrôle de concordance page par page par extraction PDF et normalisation de la mise en forme : **8/8 pages enseignant et 4/4 pages étudiant conformes**. Numéros du sommaire vérifiés.
- Rendu PNG et inspection visuelle de toutes les pages. Dernier ajustement : agrandissement de la capture de bibliothèque, puis nouvelle inspection de la page concernée. Absence de texte documentaire coupé, de débordement, de page vide ou de couverture supplémentaire ; captures nettes aux tailles retenues.
- Six images seulement dans le livrable ; captures brutes, outils de fabrication et rendus de contrôle restent hors du dépôt.
- Aucun code, dépendance, configuration ou numéro de version modifié ; aucun commit ni push.
