# Rapport 231 - Guide utilisateur Dico-IC

Date : 9 septembre 2026.

## Périmètre et résultat

Mission documentaire pour les enseignants et professionnels : guide Dico-IC de 8 pages, cinq captures réelles, note de validation et bref renvoi dans le guide enseignant Seven Sieves, qui reste à 3 pages. Consultation et recherche d’abord, puis lecture d’une fiche, correction/création, relations, pluriels, aides discursives, assistants IA et articulation avec Seven Sieves. Aucun parcours étudiant Dico-IC créé.

## Fichiers concernés

Créés :

- `docs/utilisateurs/dico-ic/guide-enseignant.md`
- `docs/utilisateurs/dico-ic/guide-enseignant.pdf`
- `docs/utilisateurs/dico-ic/note-validation.md`
- `docs/utilisateurs/dico-ic/images/recherche.png`
- `docs/utilisateurs/dico-ic/images/fiche.png`
- `docs/utilisateurs/dico-ic/images/relation.png`
- `docs/utilisateurs/dico-ic/images/aide.png`
- `docs/utilisateurs/dico-ic/images/couverture.png`
- Le présent rapport.

Mis à jour :

- `docs/utilisateurs/seven-sieves/guide-enseignant.md`
- `docs/utilisateurs/seven-sieves/guide-enseignant.pdf`

Les documents Seven Sieves et les rapports 229/230 étaient déjà présents et non suivis au début de cette mission. Leur travail a été préservé. Dans le dossier Seven Sieves, seuls les deux fichiers enseignants ci-dessus ont changé. Le guide étudiant, ses images et la note de validation ont été conservés à l’identique ; contrôle SHA-256 consigné dans la note Dico-IC.

## Contrôles réalisés

- Analyse statique de l’interface et des traitements actuels de consultation, écritures manuelles, assistants IA et analyse Seven Sieves. Les parcours prospectifs de l’ancienne note teacher-admin-workflow-v0 ne sont pas présentés comme des fonctions disponibles.
- Recette Chromium sur le service existant : recherche information/INFORMATION_DATA, fiche avec cinq formes et dix relations, ouverture/annulation des formulaires d’entrée et de relation, recherche et ouverture/annulation de l’aide sin embargo, consultation des espaces manuels et IA, entrée IA Relations ciblée/non ciblée, passage à la préparation Seven Sieves.
- Analyse de couverture du texte fictif, sans génération : 10 lemmes, 2 flexions connues, 4 formes à examiner. Même résultat reproduit pour la capture finale. La route utilisée est une lecture/calcul sans écriture métier ni appel IA.
- Captures à 1280 × 720 et 900 × 720, avec haute résolution pour recherche, fiche et couverture ; recadrages sans retouche du contenu de l’interface.
- Rendu et examen visuel des 8 pages Dico-IC et 3 pages Seven Sieves enseignant. Les dernières pages régénérées non retouchées ont également été comparées aux rendus déjà examinés : identité binaire de six pages Dico-IC. Pas de débordement ni page de remplissage.
- Concordance intégrale du texte Markdown/PDF après normalisation des marques de mise en forme, espaces et pieds de page ; légendes, accès et images contrôlés. Dico-IC : 15 045 caractères alphanumériques ; Seven Sieves : 4 880.
- État Git : aucune modification de fichier suivi ; seuls les nouveaux documents et rapports non suivis sont présents. Aucun changement de code, données, configuration, dépendances ou version. Aucun test automatisé ni campagne générale lancé.

Le service HTTP existant sur 3000 (PID 3076) et MariaDB sur 3306 (PID 36936, relais IPv6 10436) sont restés en place. Aucun processus serveur démarré ou arrêté par la mission. Le contrôle des ports par la commande PowerShell dédiée était refusé par l’environnement ; la lecture de netstat a confirmé les processus existants, sans élévation. Les deux onglets créés pour cette mission ont été fermés et les réglages de capture réinitialisés.

## Limites et suite éventuelle

Aucun environnement isolé d’écriture déjà disponible n’a été identifié. Les créations, corrections enregistrées, archivages et réactivations n’ont donc pas été exécutés sur les données métier. Le guide décrit les traitements établis et la note distingue explicitement ces opérations des parcours essayés.

Aucune génération IA payante lancée ; disponibilité du fournisseur, coûts et qualité des propositions non vérifiés. Le code établit le rechargement des connaissances à chaque analyse Seven Sieves, mais aucune preuve dynamique « créer puis obtenir un nouvel indice » n’a été produite. Le guide n’en fait pas une promesse systématique.

Les adresses publiques et modalités d’accès restent à compléter. Impression papier, usage mobile et recette de concurrence non effectués. Une recette des écritures pourra être réalisée dans un environnement isolé, si demandée. La validation éditoriale et fonctionnelle humaine finale de David reste attendue.

## Versions et livraison

Mission documentaire : versions applicatives inchangées. Repères observés : administration principale 0.1.8 ; fiche 0.1.5 ; atelier 0.1.1 ; IA Domaine 0.1.4 ; IA Texte 0.1.14 ; préparation Seven Sieves 0.1.3. Aucun nouveau numéro de version attribué.

Note détaillée : `docs/utilisateurs/dico-ic/note-validation.md`.

Message de commit proposé : `docs(dico-ic): ajouter le guide enseignant et le renvoi Seven Sieves`.

Aucun commit ni push effectué.
