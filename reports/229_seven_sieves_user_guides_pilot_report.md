# Mission 229 - Deux guides utilisateurs Seven Sieves

Date : 9 septembre 2026. Mission exclusivement documentaire, réalisée sur le commit `3fae56d6265ed934ce7961aad4f86cf8a880b8d5`, sans changements locaux préexistants. Numéro choisi après calcul du maximum existant (228) et contrôle de non-collision immédiatement avant création.

## Périmètre et résultat

Deux guides autonomes en français pour réussir une première utilisation : préparation et prévisualisation côté enseignant ; exploration, tamis, inspection, sélection, compréhension et aides côté étudiant. Explication de la conservation dans l’onglet, de la réinitialisation des observations et de l’absence de partage d’une préparation par URL seule. L’entrée de démonstration fixe est distinguée du parcours normal.

Versions **inchangées** : enseignant **0.1.3**, apprenant **0.1.6**, contrat d’analyse/session **0.1**, package serveur générique **1.0.0**. Aucun changement applicatif justifiant un incrément.

## Fichiers créés

Dans `docs/utilisateurs/seven-sieves/` :

- `guide-enseignant.md` et `guide-enseignant.pdf` (3 pages) ;
- `guide-etudiant.md` et `guide-etudiant.pdf` (4 pages) ;
- `note-validation.md` ;
- `images/enseignant-parametres.png` ;
- `images/enseignant-resume.png` ;
- `images/etudiant-texte.png` ;
- `images/etudiant-tamis.png` ;
- `images/etudiant-inspection.png` ;
- `images/etudiant-aide-lecture.png`.

Le présent fichier : `reports/229_seven_sieves_user_guides_pilot_report.md`. Aucun fichier préexistant modifié. Les intermédiaires de fabrication et de rendu sont hors du dépôt.

## Vérifications et faits observés

- Analyse statique des interfaces, de l’aide intégrée, du transfert de session et de la route d’analyse avant recette : chemin de lecture des connaissances, sans écriture métier ni appel IA.
- Deux analyses réussies d’un court texte fictif espagnol : 19 tokens, 23 enrichissements, une aide de lecture, indices sur les sept tamis, trois avertissements expérimentaux.
- Recette interactive Chromium à 1265 × 712 : préparation, ouverture apprenante dans le même onglet, sept tamis, inspection, ajout par bouton et double-clic, statuts de compréhension, indices, comparaison, fiche de lecture, dialogue d’aide, réinitialisation, rechargement, retour enseignant, invalidation et texte vide.
- Nouvel onglet normal sans préparation : état vide ; entrée `?soutenance=1` puis rechargement : exemple fixe disponible.
- Identité octet par octet de six sources principales entre HTTP et dépôt, contrôle automatisé de concordance textuelle Markdown/PDF, décodage des six PNG.
- Examen visuel des sept pages PDF rendues par Poppler ; ajustement de la pagination et agrandissement des captures étroites. Pas de chevauchement, légende isolée ou coupure de tableau observés.
- Pas d’erreur visible dans les états observés ni d’entrée warning/error dans les journaux navigateur consultés.

La [note de validation](../docs/utilisateurs/seven-sieves/note-validation.md) détaille les parcours, leurs preuves et les comportements documentés uniquement à partir du code. Aucun test applicatif automatisé relancé ; aucune validation fonctionnelle humaine effectuée.

## Limites et suites

Adresses publiques à compléter ; relecture éditoriale et essai autonome humain à réaliser avant diffusion. Pannes, délai dépassé, annulation et plusieurs variantes de stockage seulement examinés dans le code. Pas de couverture de toutes les langues, des autres navigateurs, de l’accessibilité ou du mobile ; aucune promesse d’exhaustivité linguistique. Aucun audit dynamique SQL ou contrôle exhaustif de la base.

Suite proposée : valider ces deux guides avec David, compléter les accès puis décider séparément de la documentation des autres prototypes.

## Services et préservation

Services préexistants réutilisés : HTTP 3000 (PID 3076), MariaDB 3306 (PID 36936, relais IPv6 10436), toujours présents au contrôle final. Aucun service démarré ou arrêté ; deux onglets de recette créés puis fermés. Aucun code, dépendance, configuration ou donnée métier modifié ; aucun secret `.env` consulté. Aucun appel IA payant, mail, migration, restauration, commit ou push.

Message de commit proposé : `docs(seven-sieves): ajouter les guides enseignant et étudiant illustrés`.
