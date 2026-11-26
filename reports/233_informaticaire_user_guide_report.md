# Rapport 233 — Guide utilisateur Informaticaire

Date : 9 septembre 2026.

## Périmètre et fichiers créés

Mission documentaire de consultation du prototype `prototypes/07-informaticaire/`, commune aux enseignants, étudiants et autres lecteurs. Aucune fonctionnalité ajoutée ou modifiée, aucune administration ou édition du corpus documentée.

Livrables dans `docs/utilisateurs/informaticaire/` :

- `guide-utilisateur.md` et `guide-utilisateur.pdf` : **5 pages**, parcours Miriadi → Lectŭrĭo+ → corpus de contes, recherche/filtres, fiche, relations, carte et conservation des références.
- `images/fiche-miriadi.png`, `images/recherche.png`, `images/carte-reperes.png`, `images/lien-externe.png` : quatre captures réelles recadrées, trois pastilles de repérage sur la carte.
- `note-validation.md` : contrôles, sources, comportements lus dans le code, limites et validation humaine attendue.

Version **0.7.1 inchangée**. Aucun code, donnée métier, dépendance, configuration ou version modifié. Aucune fiche DIPROLANG créée. Les 31 fichiers des guides Seven Sieves, Dico-IC et Vidéo augmentée ont été préservés par comparaison SHA-256 ; les cinq fichiers applicatifs/documentaires examinés du prototype sont également inchangés.

## Contrôles réalisés

Service IC-Hub existant sur le port 8790 réutilisé, sans nouveau lancement. Consultations Chromium : recherche d’accueil, fiche Miriadi et lien interne vers Lectŭrĭo+, filtres de type/public/état, variante EuRom5, absence de résultat DIPROLANG, Tous et Réinitialiser, voisinage relationnel, choix du centre, clic sur nœud, Recentrer, fiche complète, Lectures guidées, À partager et À sauver / vérifier.

Le lien Corpus de contes Lectŭrĭo+ ouvre effectivement `https://www.miriadi.net/ressources/corpus-contes` dans un nouvel onglet, avec la page de présentation attendue. Les autres adresses externes sont distinguées de cette destination effectivement consultée.

Export JSON déclenché avec message de génération. Rechargements vérifiés : bibliothèque conservée comme vue mais recherche vide et Tous actif, 110 fiches ; carte conservée comme vue mais centre revenu à Miriadi. Les comportements détaillés de recherche, relations, persistance et exports ont été lus dans le code actuel.

Les **5 pages du PDF** ont été inspectées visuellement. Captures de fiche et lien reprises en haute définition puis pages réinspectées ; autres pages finales identiques aux rendus relus. Concordance textuelle Markdown/PDF **5/5**, sommaire et légendes cohérents, pas de débordement ou de page de remplissage.

## Non vérifié, limites et suite

Aucun audit exhaustif du catalogue ou des liens externes, aucun contrôle juridique des droits, aucun parcours de contribution ou correction. Fichier JSON non rouvert pour contrôle complet ; CSV non téléchargé ; résultats du moteur externe non qualifiés. Aucun test général, ni accès à Alpaga ou dev-lab.

La note distingue les limites observées : certaines traces affichent undefined ; les flèches du dessin partent du centre même pour des relations entrantes, dont le sens doit être lu dans le panneau ; les badges de liens regroupent des niveaux et dates de contrôle différents. Ces limites n’ont pas été corrigées, conformément à la mission.

À compléter : URL publique et modalités d’accès. À obtenir : relecture éditoriale et validation humaine finale de David, non revendiquées. Le corpus reste limité et non exhaustif.

Aucun service démarré, relancé ou arrêté. Les deux onglets ouverts pour les vérifications ont été fermés. Aucun appel payant, commit ou push.

Message de commit proposé : `docs(informaticaire): ajouter le guide de consultation utilisateur`.
