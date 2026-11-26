# Note de validation - Guide Dico-IC

Date : 9 septembre 2026. Mission documentaire, sans modification applicative ni écriture métier. La recette de Codex ne constitue pas une validation éditoriale ou fonctionnelle humaine de David.

## Livrables

- `guide-enseignant.md` et `guide-enseignant.pdf` : 8 pages, exclusivement pour enseignants et professionnels.
- Cinq captures réelles dans `images/` : recherche, fiche conceptuelle, relation, aide discursive et couverture d’un texte. Recadrages uniquement ; aucun écran redessiné ni contenu remplacé. Recherche, fiche et couverture capturées en haute résolution.
- Renvoi bref ajouté à `../seven-sieves/guide-enseignant.md` et à son PDF, qui conserve 3 pages. Le renvoi comporte un emplacement explicite pour l’accès public à Dico-IC et conseille un onglet distinct.
- Guide étudiant Seven Sieves, images Seven Sieves et note de validation Seven Sieves conservés à l’identique pendant cette mission.

## Parcours réellement essayés

Service local déjà disponible sur `http://127.0.0.1:3000`, navigateur Chromium intégré. Consultation à une dimension représentative de 1280 × 720 ; captures supplémentaires à 900 × 720 et densité doublée. Aucun service démarré ou arrêté pour la mission.

| Parcours | Observation |
| --- | --- |
| Admin principal > Lexique, recherche « information » | Deux résultats : COMMUNICATION et INFORMATION_DATA. Recherche par la clé INFORMATION_DATA également essayée. |
| Voir INFORMATION_DATA | Fiche chargée : glose, domaine communication, cinq formes et dix relations documentées. Retour au lexique utilisé. |
| Modifier et documenter cette entrée > Modifier l’entrée | Formulaire réellement ouvert, valeurs existantes consultées, puis Annuler. Message de restauration des valeurs chargées observé. Aucun champ métier changé. |
| Modifier la relation FR information / ES información | Fenêtre ouverte avec type, score et provenance existants, puis Annuler. Aucun enregistrement. |
| Nouvelle entrée et Formes fléchies | Formulaires, choix de langues, catégories, statuts et liste des mappings examinés ; aucune soumission. |
| Aides discursives, recherche « sin embargo » | Deux résultats, car le texte associé à « cependant » contient aussi cette expression. Formulaire de l’aide espagnole ouvert puis annulé ; expression, fonction, statut, aide, exemple et prudence relevés. |
| IA Texte > Analyser le texte | Texte fictif du guide analysé en espagnol : 16 mots, 16 formes uniques, 10 lemmes connus, 2 flexions connues, 4 formes à examiner. Résultat reproduit pour une capture plus nette. Aucun appel à une route de génération IA. |
| IA Domaine | Écran initial, paramètres et commandes de révision consultés ; aucun lancement. |
| IA Relations sans entrée, puis depuis Relations IA dans le lexique | L’accès général affiche Entrée manquante. L’accès depuis INFORMATION_DATA charge cinq formes et dix relations internes. Aucun lancement. |
| Lien Seven Sieves depuis Dico-IC | Redirection observée vers la préparation enseignante, dans le même onglet. Aucun lien de retour vers Dico-IC dans cette préparation. |

Le texte de couverture est : « Los estudiantes comparan la información. Sin embargo, comprender las palabras no es traducir todo el texto. » Les formes à examiner étaient comparan, embargo, las et todo. Les flexions connues étaient estudiantes → estudiante et palabras → palabra. Le compteur « 0 concepts absents » n’est pas interprété comme une preuve de couverture complète ; le guide explicite cette limite.

Aucune erreur visible empêchant ces consultations n’a été observée. Le message Entrée manquante est documenté avec le chemin permettant de cibler une entrée. Les onglets créés pour la mission ont été fermés et les dimensions d’émulation réinitialisées.

## Comportements établis uniquement dans le code actuel

Aucun environnement isolé d’écriture déjà disponible n’a été identifié dans les procédures examinées. Les fixtures des tests automatisés ne constituent pas un service de recette utilisateur déjà lancé. Aucun environnement de remplacement n’a été improvisé.

- Recherche lexicale sur clé, glose française et domaine, sans recherche directe des lemmes étrangers : `Node/src/repository.js`, `getAdminLexicalEntries`.
- Création de l’entrée avec ses formes, validation des champs, doublons et messages ; correction dans l’atelier de la glose, du domaine, des lemmes et catégories avec clé/langues/provenances préservées : `admin/js/admin-0.1.js`, `admin/js/admin-entry-workbench-0.1.js`, `Node/server.js`, `Node/src/admin.js` et `Node/src/repository.js`.
- Le bouton Modifier du lexique pointe actuellement vers l’atelier. Une ancienne fonction d’édition dans la page principale existe encore dans le script, mais n’est pas présentée comme un parcours accessible. L’atelier actuel n’offre ni ajout de langue ni suppression d’une forme enregistrée.
- Ajout et modification des relations de l’atelier ; une relation symétrique par paire, score entre 0 et 1 ; ajout inter-entrées par Relations dans l’administration principale. Pas de suppression proposée par ces interfaces.
- Création des mappings de pluriels, limitée aux noms/adjectifs FR, ES, IT, PT ; absence de commandes de correction/suppression dans la liste.
- Création et modification des aides discursives ; Archiver demande confirmation puis conserve la ligne au statut ARCHIVED. La révision du statut reste disponible dans le formulaire Modifier. Seules les aides VALIDATED dans une langue active et documentée alimentent l’analyse.
- La route `/admin/text-coverage` lit les formes existantes puis calcule la couverture. Elle n’écrit pas de connaissance et n’appelle pas de fournisseur IA : `Node/server.js` et traitement de couverture dans `Node/src/admin-ai-text.js`.
- Les générations des espaces Domaine, Texte, Formes fléchies et Relations passent par `generateStructuredCandidates` dans `Node/src/admin-ai-domain.js`, qui appelle un service OpenAI extérieur. La configuration effective et la facturation n’ont pas été inspectées. Aucun secret `.env` lu.
- Brouillons, contrôles de complétude, sélection explicite, suppression temporaire, créations ligne par ligne et bilans pouvant contenir des réussites partielles : scripts `admin-ai-domain-0.1.js`, `admin-ai-text-0.1.js`, `admin-ai-text-batches-0.1.js`, `admin-ai-text-generation-0.1.js` et `admin-ai-relations-0.1.js`.
- Les saisies/brouillons sont des états de page, non une sauvegarde documentaire. Une nouvelle analyse de couverture réinitialise les propositions. La langue de référence d’IA Relations bénéficie d’un stockage de session ; cette préférence ne sauvegarde pas les brouillons.
- Chaque nouvelle analyse Seven Sieves recharge ses ressources : `Node/server.js` appelle `repository.loadAnalysisResources`, qui relit les formes, relations et aides. Les mappings doivent être VALIDATED ; les langues demandées doivent être utilisables. Le paquet de préparation déjà obtenu ne s’actualise pas automatiquement. L’exemple fixe utilise ses données prédéfinies. Les fichiers actuels de préparation et de chargement de Seven Sieves, examinés lors de la mission précédente, restent inchangés.

La note historique `docs/teacher-admin-workflow-v0.md` du prototype est une proposition de parcours futur. Ses notions de publication, d’activité brouillon ou de rôles ne sont pas documentées comme des fonctions actuelles.

## Non vérifié et limites

- Création, modification, archivage, réactivation, suppression temporaire de propositions et persistance après écriture : aucune opération d’écriture métier exécutée.
- Générations IA, qualité des réponses, disponibilité du fournisseur, délais réels, annulation d’un appel externe et coût : aucun appel lancé.
- Enchaînement complet « nouvel enrichissement puis nouvel indice Seven Sieves » : non exécuté ; seule la lecture des ressources à chaque analyse est établie dans le code. Le guide formule les conditions et évite de promettre un indice systématique.
- Pagination au-delà des listes filtrées, erreurs serveur provoquées, concurrence entre contributeurs, interruption pendant un enregistrement : non testées. Aucun audit de qualité du corpus ni campagne générale de tests.
- Accès public, appareils mobiles, impression papier et validation par les utilisateurs : non vérifiés.

## Contrôle éditorial et rendu

Les PDF ont été générés directement depuis les Markdown. Le texte extrait des deux PDF correspond intégralement aux sources après normalisation des espaces, signes de mise en forme et pieds de page : 15 045 caractères alphanumériques pour Dico-IC et 4 880 pour Seven Sieves enseignant. Les cinq images Dico-IC référencées existent ; les légendes et emplacements d’accès sont présents dans les deux formats.

Toutes les pages ont été examinées après rendu PNG avec Poppler : 8 pages Dico-IC et 3 pages Seven Sieves enseignant. Les pages 1 et 6 de Dico-IC ont été revues après les dernières améliorations des captures ; les six autres rendus finaux sont identiques, octet pour octet, aux pages déjà examinées. Pas de page de remplissage, de texte coupé, de tableau débordant ou de légende isolée. Les captures larges servent au repérage ; les informations nécessaires à la manipulation sont aussi explicitées dans le texte.

Préservation du guide étudiant Seven Sieves confirmée par SHA-256 avant/après :

- Markdown : `41d9028a23e77ee827fa0f10f6f8bb91790b8403ea3f5d03c2f962b66936c7a9`.
- PDF : `aed2286680344fb6827514e8b4351cbbe71719b7b60ba69b506649cab1a8e006`.

## À compléter avant diffusion

- Adresse publique de Dico-IC, adresse de préparation Seven Sieves et modalités d’accès. La formulation commune est : « Aucun compte personnel à créer ; les modalités d’accès vous seront communiquées. » Aucune procédure de connexion n’est inventée.
- Disponibilité des assistants IA et conditions de leur utilisation dans la démonstration.
- Recette d’écriture dans un environnement isolé lorsqu’il sera disponible, si elle est souhaitée avant diffusion.
- Relecture éditoriale et validation humaine finale de David, **encore attendues**.

Versions applicatives inchangées : administration principale 0.1.8, fiche 0.1.5, atelier 0.1.1, IA Domaine 0.1.4, IA Texte 0.1.14 ; préparation Seven Sieves 0.1.3. Aucun numéro nouveau attribué à IA Relations. Aucun commit ni push.
