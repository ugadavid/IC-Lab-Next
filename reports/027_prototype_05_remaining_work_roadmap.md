# Prototype 05 — roadmap des travaux restants

Cette roadmap part de l’état observé au 13 juillet 2026 et des rapports 017 à 026.

## Travaux restant à réaliser

### Consolidation technique

- regrouper les derniers overrides de `teacher-guided.html` dans un module ou une section dédiée ;
- supprimer les doublons historiques de handlers et de styles après vérification de non-régression ;
- documenter explicitement le contrat de visibilité entre `layerConfiguration`, la vue enseignant et la vue étudiante ;
- ajouter des tests automatisés ciblant les couches visibles, les phénomènes filtrés et la sauvegarde.

### Robustesse de l’atelier

- tester systématiquement les réponses HTTP non-2xx, les erreurs JSON et les délais de réseau de la sauvegarde ;
- vérifier l’accessibilité clavier/focus de la modale et des cartes de couches ;
- compléter les tests responsive avec de vraies tailles Chromium larges, moyennes et mobiles ;
- contrôler la persistance après plusieurs modifications successives sans réordonner inutilement la configuration.

### Qualité de livraison

- isoler les changements de chaque mission dans des commits conventionnels distincts ;
- vérifier les différences de données avant chaque sauvegarde de démonstration ;
- produire une passe finale de non-régression sur vidéo, transcription, observations, export CSV, timeline et mode Focus ;
- harmoniser l’encodage et la lisibilité des pages HTML actuellement très compactées.

## Bugs ou limites connus

- `teacher-guided.html` concentre encore beaucoup de logique et plusieurs ajouts de présentation ; cela augmente le risque de régression lors d’une prochaine modification ;
- les vérifications Chromium ont été faites manuellement, sans suite automatisée persistante ;
- la disponibilité et la latence du flux HLS distant restent des dépendances externes ;
- la sauvegarde atomique existe côté serveur, mais les scénarios réseau longs doivent rester couverts par des tests dédiés ;
- la branche de travail n’est pas encore nettoyée ni commitée ;
- les données historiques doivent être contrôlées avant toute nouvelle démonstration afin d’éviter qu’une sauvegarde de test ne modifie seulement l’ordre ou le timestamp du fichier.

## Priorités recommandées

1. **P1 — sécuriser la livraison** : tests automatisés de visibilité, sauvegarde succès/erreur et non-régression des volumes historiques.
2. **P1 — nettoyer l’atelier guidé** : factoriser les handlers et styles ajoutés progressivement, sans changer l’interface.
3. **P2 — renforcer l’accessibilité** : focus, clavier, annonces de statut et fermeture fiable des modales.
4. **P2 — valider le responsive** : matrice Chromium large/moyenne/mobile avec captures ou mesures reproductibles.
5. **P3 — préparer la maintenance** : documentation du contrat de données et découpage en modules partagés.

## Proposition de missions courtes

### Mission A — tests de visibilité

Ajouter un jeu de tests qui vérifie : couche publiée visible, couche masquée absente de la liste et de la timeline étudiante, toggle étudiant local, données et configuration professeur inchangées.

### Mission B — tests de sauvegarde

Tester succès, HTTP en erreur, JSON invalide, réseau indisponible et délai dépassé ; vérifier `finally`, fermeture de modale et réactivation du bouton.

### Mission C — nettoyage de l’atelier guidé

Regrouper les derniers scripts et styles en conservant strictement les sélecteurs et comportements validés dans Chromium.

### Mission D — accessibilité et responsive

Valider navigation clavier, focus de modale, annonces de statut et rendu aux trois largeurs de référence.

### Mission E — préparation de livraison

Comparer les données au point de référence, exécuter les checks finaux, rédiger le changelog et préparer un commit propre de version `0.1.7`.

## Hors périmètre recommandé

Ne pas engager dans ces missions la migration MariaDB, l’authentification, la gestion de permissions, l’IA, la refonte de l’atelier avancé, une nouvelle API, un nouveau proxy HLS ou une modification des launchers. Ces sujets nécessitent des missions séparées et des décisions de conception explicites.
