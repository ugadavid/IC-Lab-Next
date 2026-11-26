# Mission 230 - Polissage éditorial des guides Seven Sieves

Date : 9 septembre 2026. Périmètre documentaire uniquement. Numéro choisi après vérification du maximum 229 et de l’absence de collision immédiatement avant écriture.

## Retouches réalisées

- Structure et parcours conservés : guide enseignant **3 pages**, guide étudiant **4 pages**, sans couverture ajoutée.
- Nouvelle capture réelle d’ensemble de la vue apprenante : trois repères numérotés placés dans une marge ajoutée au-dessus de l’image, sans masquer ou redessiner les commandes. Légende courte : choix du tamis, exploration du texte, observation et inspection.
- Captures de détail conservées. Les détails du texte et de la compréhension sont réunis côte à côte sur la page d’inspection dans le PDF étudiant.
- Nouvelle capture du résumé enseignant, recadrée sur les cinq résultats chiffrés. Les avertissements restent explicités par la légende et le texte. La définition passe de 326 × 553 à **1184 × 1092 pixels** ; le cadrage évite de réduire toute la colonne.
- Encadrés de conservation propres aux deux publics, avec onglet à garder ouvert, copie du texte et des langues côté enseignant, notes personnelles côté étudiant et absence de sauvegarde des sélections/choix. Répétitions réduites, distinctions sur la préparation analysée, les modifications non analysées, le rechargement, Recommencer, la fermeture et l’exemple fixe conservées.
- Formulation exacte demandée sur les comptes personnels appliquée dans les deux guides ; emplacements des URL publiques maintenus.

## Fichiers concernés

Sous `docs/utilisateurs/seven-sieves/`, mis à jour : `guide-enseignant.md`, `guide-enseignant.pdf`, `guide-etudiant.md`, `guide-etudiant.pdf`, `note-validation.md`, `images/enseignant-resume.png`.

Créés : `images/etudiant-vue-ensemble.png` et le présent rapport. Les cinq autres images et le rapport 229 sont conservés. Les versions précédentes des fichiers révisés ont été copiées dans le dossier de travail de visualisation Codex, hors dépôt, avant remplacement.

## État initial et versions

Commit inchangé : `3fae56d6265ed934ce7961aad4f86cf8a880b8d5`. Les livrables de la mission 229 étaient déjà présents mais non suivis par Git au démarrage ; ils ont été révisés dans le périmètre explicitement autorisé. Aucun changement de fichier suivi observé.

Versions applicatives **inchangées** : enseignant **0.1.3**, apprenant **0.1.6**, contrat d’analyse/session **0.1**, package Node **1.0.0**. La mission est documentaire et ne justifie aucun incrément applicatif.

## Vérifications

- Réutilisation du serveur existant et du parcours dont l’absence d’écriture métier avait été vérifiée à la mission 229. Une analyse du même texte fictif espagnol : 19 tokens, 23 enrichissements, une aide de lecture, sept tamis mobilisés et trois avertissements.
- Ouverture apprenante, inspection de « información » et retour enseignant pour les seules nouvelles captures. Pas de nouvelle campagne générale de tests.
- Capture Chromium avec viewport logique 1280 × 720 et facteur de rendu 2 ; sources PNG exportées à 5120 × 2880, recadrées sans interpolation. Vue d’ensemble finale : **4992 × 2188 pixels**. Seuls les trois repères extérieurs ont été dessinés ; aucun pixel de l’interface n’a été retouché pour simuler une fonctionnalité.
- Rendu Poppler et examen visuel des **sept pages finales** : hiérarchie, légendes, encadrés, tableaux, taille des captures et absence de débordement contrôlés. La vue d’ensemble est destinée au repérage ; les détails servent à la lecture des commandes.
- Concordance automatisée de chaque paragraphe et cellule Markdown avec le texte extrait des PDF, nombres de pages et existence/décodage de toutes les images : réussis. Formulation d’accès exacte contrôlée dans les deux Markdown.
- Journal du navigateur consulté : aucune entrée warning/error. État Git final : aucune modification de fichier suivi ; seuls les livrables documentaires attendus sont présents.

## Services, limites et suite

HTTP 3000 (PID 3076) et MariaDB 3306 (PID 36936, relais IPv6 10436) étaient actifs et le sont restés. Aucun service démarré ou arrêté. L’override temporaire d’affichage a été retiré et l’onglet de capture fermé.

Aucune modification de code, dépendance, configuration ou donnée métier ; aucun appel IA payant, email, commit ou push. Les limites fonctionnelles et les parcours non testés de la mission pilote restent applicables ; pas d’essai mobile, d’impression papier ou de validation linguistique exhaustive supplémentaire.

Restent à confirmer : URL publiques et modalités d’accès, puis **validation éditoriale finale de David**. La satisfaction exprimée sur la structure ne vaut pas approbation des présentes retouches.

Message de commit proposé : `docs(seven-sieves): polir les guides et clarifier la conservation du travail`.
