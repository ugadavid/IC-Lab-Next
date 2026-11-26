# Rapport 232 — Guides utilisateurs de la vidéo augmentée

Date : 9 septembre 2026.

## Périmètre et livraison

Mission documentaire du prototype `prototypes/05-augmented-ic-video-01/` : deux guides autonomes, destinés à la préparation enseignante et à la consultation étudiante.

Fichiers créés dans `docs/utilisateurs/video-augmentee/` :

- `guide-enseignant.md` et `guide-enseignant.pdf` : **8 pages** ; parcours initial depuis une activité existante, création/duplication, fiche, association des médias, ateliers guidé/expert, enrichissements, prévisualisation, partage, anonymisation et conservation.
- `guide-etudiant.md` et `guide-etudiant.pdf` : **4 pages** ; lecture synchronisée, frise, annotations, couches, Focus, observations et export.
- `images/bibliotheque.png`, `images/versions-media.png`, `images/moment-transcription.png`, `images/lecteur-etudiant.png`, `images/frise.png`, `images/annotation.png` : six captures réelles recadrées.
- `note-validation.md` : sources, observations, comportements lus dans le code, opérations non vérifiées et réserves.

Aucune fonctionnalité réalisée ou modifiée. Aucun code applicatif, dépendance, configuration, donnée métier ou version modifié. Serveur Proto05 **0.1.63**, lecteur **0.0.9** : versions inchangées. Les fichiers déjà présents, dont les rapports 229 à 231 et les guides validés Seven Sieves/Dico-IC, sont préservés ; leurs 20 fichiers ont été comparés par SHA-256 au relevé initial.

## Vérifications effectuées

Consultations Chromium avec le service existant sur le port 8791 : bibliothèque, fiche, formulaires de création et ajout vidéo sans validation, ateliers guidé/expert sans mutation, vidéothèque et fiche média, prévisualisation et véritable route étudiante. Lecture/pause, déplacement par transcription et barre de langue, annotations, couches, Focus, ajout/saisie/suppression d’une observation temporaire, génération CSV et nouvelle consultation indépendante ont été vérifiés sur l’activité de référence. L’état Brouillon ne bloque pas sa route étudiante.

Captures utiles aux dimensions représentatives 1000 × 720 et 1280 × 720, sans redessiner l’interface. Inspection visuelle des **12 pages** des PDF et comparaison des textes Markdown/PDF par page : **12 concordances sur 12**. Titres, légendes et renvois de pages cohérents. La capture de bibliothèque a été agrandie et sa page réinspectée.

Les traitements actuels ont été lus pour établir les sauvegardes explicites, l’application temporaire dans l’atelier guidé, les écritures directes d’association et de classement, le partage des médias, les suppressions et leurs dépendances, l’anonymisation et la mémoire locale du lecteur. Le détail des preuves et de leurs limites figure dans `docs/utilisateurs/video-augmentee/note-validation.md`.

## Non vérifié, limites et suite

Aucun environnement d’écriture isolé déjà disponible identifié : pas de création, duplication, sauvegarde métier, association, classement, suppression, import, transfert, analyse distante ni traitement d’anonymisation exécuté. Pas d’essai des conflits de sauvegarde ; pas d’ouverture du CSV dans un tableur ni de copie presse-papiers ; pas de campagne générale de tests. Les comportements correspondants sont documentés d’après les formulaires et le code. Le rechargement du même onglet n’a pas été essayé séparément de la nouvelle ouverture ; sa réinitialisation est établie par le code.

URL publiques, modalités d’accès, activités à livrer et disponibilité des traitements médias sur Alpaga restent à confirmer. Aucun accès à Alpaga ou dev-lab. Aucune validation humaine finale de David revendiquée : prochaine étape, sa relecture éditoriale et le renseignement des modalités de livraison.

Aucun serveur démarré, relancé ou arrêté ; services préexistants laissés en place. Les quatre onglets de consultation créés ont été fermés. Aucun commit ni push.

Message de commit proposé : `docs(video-augmentee): ajouter les guides enseignant et étudiant`.
