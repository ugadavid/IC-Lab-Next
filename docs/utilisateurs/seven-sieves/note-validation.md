# Note de validation des guides Seven Sieves

Date : 9 septembre 2026. Mission documentaire pilote ; aucune validation humaine de David n’est revendiquée.

## Actualisation - polissage éditorial du 9 septembre 2026

- Structure conservée après relecture ; **3 pages enseignant et 4 pages étudiant**. La validation éditoriale finale des retouches reste à obtenir auprès de David.
- Nouvelle vue d’ensemble avec trois repères extérieurs et légende ; captures de détail conservées. Résumé enseignant recapturé puis recentré sur les cinq résultats, avec une image de 1184 × 1092 pixels. Sept PNG utilisés au total ; seul le résumé précédent est remplacé.
- Encadrés distincts pour conserver le travail, répétitions allégées et formulation d’accès harmonisée exactement selon la demande. URL publiques toujours à compléter.
- Une analyse du texte fictif déjà utilisé, ouverture apprenante, inspection et retour enseignant pour les captures seulement : mêmes résultats (19 / 23 / 1, sept tamis, trois avertissements). Sources PNG haute définition recadrées sans interpolation ; aucun contenu d’interface redessiné. Vue d’ensemble : 4992 × 2188 pixels, numéros ajoutés dans une marge extérieure.
- Rendu des **sept pages finales** examiné avec Poppler ; concordance de chaque paragraphe et cellule Markdown/PDF, nombre de pages, formulation d’accès et décodage des images contrôlés. Pas de défaut de pagination ou de lisibilité constaté ; les petits textes de la vue d’ensemble sont complétés par les détails.
- Commit et versions applicatives inchangés. Les livrables de la mission 229 étaient les changements locaux non suivis préexistants ; ils ont été préservés puis révisés dans le périmètre demandé. Aucun code, dépendance, configuration ou donnée métier modifié.
- Services préexistants 3000 et 3306 réutilisés et laissés actifs ; aucun lancement ni arrêt. Réglage temporaire de capture retiré, onglet de recette fermé. Aucune nouvelle campagne générale de tests, aucun commit ni push.
- Rapport de cette retouche : [230](../../../reports/230_seven_sieves_user_guides_editorial_polish_report.md). Les sections suivantes conservent la trace de la mission pilote ; leurs limites fonctionnelles restent applicables.

## État examiné

- Commit : `3fae56d6265ed934ce7961aad4f86cf8a880b8d5`. État Git initial propre, aucun changement local préexistant signalé par `git status --short`.
- Enseignant : `index-teacher-0.1.html`, version affichée et déclarée **0.1.3**.
- Apprenant : `index-student-0.1.html`, version affichée et déclarée **0.1.6**.
- Contrat d’analyse et format de session : **0.1** ; package Node : **1.0.0**, numéro générique distinct des versions d’interface.
- Versions applicatives inchangées. Les deux HTML et les scripts teacher, student, session et soutenance servis par HTTP ont été comparés octet par octet aux fichiers du dépôt : identité confirmée.

## Sources et sécurité du parcours

Consultation des instructions racine, README, `docs/WORKSPACE_PROVENANCE.md`, `docs/ARCHITECTURE.md`, `PROJECTS_LAUNCH.md`, `STATUS.md`, index documentaire Dico, guide de démarrage et rapport 228, puis confrontation au code et aux écrans actuels. Aucun `AGENTS.md` supplémentaire trouvé sous les dossiers concernés.

Sources principales : `Node/server.js` (route `POST /analysis`), `Node/src/repository.js` (`getLanguages`, `loadAnalysisResources`), `Node/src/analysis.js`, les deux pages de rôle et leurs scripts dans `prototypes/01-seven-sieves/`, ainsi que l’aide intégrée à la page apprenante.

Avant toute analyse, vérification du chemin appelé : lectures SQL `SELECT`, calcul des indices et retour de la réponse, sans écriture métier ni appel IA. La préparation utilise `sessionStorage` ; les sélections et statuts de compréhension sont uniquement en mémoire de la page. Cette absence de persistance est établie par lecture du chemin de code et observation des rechargements, sans audit SQL dynamique ni comparaison exhaustive de la base.

## Parcours réellement exécutés

Navigateur Chromium intégré, capture courante **1265 × 712 pixels**, sans changement de taille imposé. Deux onglets de recette créés puis fermés.

1. Préparation du texte fictif : « Los estudiantes comparan la información. Sin embargo, comprender las palabras no es traducir todo el texto. » Espagnol source, français médiation, italien et portugais en comparaison.
2. Deux analyses réussies du même texte, la seconde pour reprendre les captures : **19 tokens, 23 enrichissements, 1 aide à la lecture, tamis 1 à 7 mobilisés, 3 avertissements** concernant les tamis 4, 5 et 6.
3. Ouverture de la vue apprenante par le bouton, dans le même onglet ; texte et langues retrouvés. Inspection de « información », ajout par bouton et par double-clic, choix « Compris », affichage des indices, comparaison (1/1).
4. Activation successive des sept tamis ; observation des formes romanes, correspondance -ción/-tion, repère graphique sur « traducir », verbes probables, pluriels et infinitifs probables, suffixe -ción. Sélection et statut conservés lors du changement de tamis.
5. Affichage puis activation de la fiche « Sin embargo » : opposition, explication, exemple et réserve contextuelle. Ouverture et fermeture du dialogue « Aide ».
6. « Recommencer » : sélection vidée, premier tamis, aides masquées, activité conservée. Double-clic sur « estudiantes », choix « Doute », puis rechargement : texte conservé et sélection à zéro. Le rétablissement de tous les statuts de compréhension après rechargement est également établi dans `createExplorationState` et `renderActivity`.
7. Retour à la préparation et rechargement : texte et paramètres analysés retrouvés. Décocher l’italien invalide le résultat et désactive l’ouverture. Texte vide puis analyse : « Texte requis ».
8. Comparaison sans sélection : message invitant à sélectionner des mots. « estudiantes » sans indice au tamis 1, mais avec indices aux tamis 2 et 6 : absence d’indice distinguée d’un échec.
9. Nouvel onglet sur l’URL apprenante normale : « Aucune activité n’a encore été préparée. ». Navigation de cet onglet vers `index-student-0.1.html?soutenance=1`, puis rechargement : exemple fixe « Durante el día… » chargé directement.

Pas d’erreur visible dans les états finaux observés ; aucune entrée warning/error dans les journaux navigateur consultés. Les actions sémantiques de capture recadrée et certains clics de l’outil navigateur ont donné des résultats inadaptés ; les captures finales proviennent de captures complètes correctement observées, recadrées ensuite sans modification de contenu. Les essais de capture écartés ne sont pas livrés.

## Contrôle éditorial et PDF

- Guide enseignant : **3 pages** ; guide étudiant : **4 pages**. Sources Markdown autonomes et six PNG utilisés, conservés dans `images/`.
- Génération des PDF directement depuis les Markdown ; vérification automatisée de présence de chaque paragraphe et cellule dans le texte extrait des PDF : réussie pour les deux guides.
- Images PNG décodables ; chaque image référencée existe. Recadrages uniquement, sans reconstitution ni retouche fonctionnelle. Texte de démonstration fictif, sans données personnelles.
- Rendu Poppler et examen visuel des sept pages ; nouvelle inspection des pages modifiées après agrandissement de trois captures. Titres, tableaux, légendes et pieds de page lisibles, aucune page vide, coupure de tableau ou légende isolée observée. La capture du résumé reste la plus dense ; ses valeurs et avertissements sont explicités dans le texte.
- Fichiers intermédiaires de fabrication et de contrôle hors du dépôt, dans le dossier de travail de visualisation Codex de cette mission.

## Limites et points à confirmer

- Adresse publique normale et adresse publique de démonstration **à compléter** avant diffusion. Les URL locales de recette ne figurent pas dans les guides.
- Annulation, délai dépassé, panne du service, paquet incompatible, absence totale d’aides, exclusion automatique de la langue source des comparaisons et remplacement d’une préparation par le mode soutenance : comportements lus dans le code, non provoqués en recette. Ils ne sont pas présentés comme des essais réussis.
- Fermeture/réouverture avec restauration de session propre au navigateur, duplication d’onglet, navigation arrière avec cache et accès depuis un autre poste non testés. Les guides ne promettent pas de reprise après fermeture et ne présentent pas l’URL normale comme un moyen de transmission.
- Pas de validation de toutes les combinaisons de langues, de l’exhaustivité ou de la justesse linguistique des indices. Pas de recette mobile, clavier seule, lecteur d’écran, autre navigateur ni impression papier.
- Aucun test applicatif automatisé relancé : mission documentaire, sans modification d’application. Les contrôles automatisés effectués portent sur les livrables et l’identité des sources HTTP.
- Prochaine étape : relecture éditoriale et essai autonome par David ou une personne découvrant l’outil. Cette recette Codex ne remplace pas cette validation humaine.

## Services et état final

Serveurs déjà disponibles avant intervention : HTTP **3000**, PID **3076** ; MariaDB exposée sur **3306**, PID **36936** (relais IPv6 également présent, PID **10436**). Services réutilisés, **aucun service lancé ou arrêté**, ports et PID d’écoute encore présents au contrôle final. Les deux onglets de recette créés ont été fermés.

Aucun code, dépendance, configuration ou fichier métier modifié ; aucun accès à `.env`, aucune migration, restauration, requête SQL d’écriture, sollicitation Alpaga, IA payante, envoi de mail, commit ou push. Les seuls ajouts au dépôt sont les guides, leurs images, cette note et le rapport 229.
