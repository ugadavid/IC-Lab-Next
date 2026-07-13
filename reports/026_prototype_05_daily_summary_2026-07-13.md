# Prototype 05 — bilan documentaire du 13 juillet 2026

## Périmètre du bilan

Ce bilan recoupe l’état du dépôt et les rapports 017 à 025. Aucun fichier applicatif, fichier de données ou launcher n’a été modifié pour produire ce document.

## Fonctionnalités réalisées

Les travaux de la journée ont consolidé l’atelier guidé et la vue étudiante :

- atelier guidé interactif avec lecteur HLS, contrôles, sélection d’objets et édition des segments, intervalles et phénomènes ;
- timeline IC partagée, puis spécialisée sur les quatre langues et les phénomènes, avec géométrie, axe, curseur et événements typés communs ;
- libellés de timeline clarifiés (`FR`, `ES`, `IT`, `PT`, `Phénomènes`) et compteur vidéo guidé fiable (`15:39`) ;
- administration des couches dans **Ce que verront les étudiants** : visibilité enseignant, cartes, occurrences, création, édition et suppression conditionnelle ;
- filtrage étudiant : les couches masquées par le professeur ne sont plus proposées ni rendues dans la timeline étudiante ; les cases restantes sont locales à l’étudiant et filtrent seulement ses phénomènes ;
- amélioration de présentation des cartes de couches et remplacement visible de `Nom humain` par `Nom` ;
- retour d’enregistrement guidé avec modale de succès, fermeture automatique, message d’erreur, bouton `Fermer` et réactivation garantie du bouton via `finally`.

## Versions atteintes

- timeline spécialisée : **0.1.6.3** ;
- libellés et compteur : **0.1.6.4** ;
- administration des couches et serveur courant : **0.1.7** ;
- serveur observé sur `127.0.0.1:8791` : service `proto05-augmented-video`, version `0.1.7`.

## Fichiers concernés dans l’état actuel

- `prototypes/05-augmented-ic-video-01/index-0.0.8.html` : filtrage des couches proposées et des phénomènes côté étudiant ;
- `prototypes/05-augmented-ic-video-01/teacher-guided.html` : atelier guidé, cartes de couches, édition, visibilité et feedback de sauvegarde ;
- `prototypes/05-augmented-ic-video-01/shared/ic-timeline.js` et `shared/ic-timeline.css` : composant et géométrie de timeline partagés ;
- `prototypes/05-augmented-ic-video-01/server/server.js` et `server/package.json` : version serveur `0.1.7` ;
- `prototypes/05-augmented-ic-video-01/data/activities.json` : activité historique et configuration de visibilité actuellement présentes dans l’arbre de travail ;
- rapports 017 à 025, auxquels s’ajoutent le présent rapport et la roadmap 027.

Le dépôt contient des modifications non committées héritées de la séquence de missions. Aucun nettoyage ou réécriture de ces changements n’a été effectué pendant la rédaction de ce bilan.

## Vérifications effectuées

- `npm run check` dans le serveur : OK ;
- parsing des scripts JavaScript embarqués : OK ;
- `git diff --check` : OK ;
- endpoint santé local : OK, version `0.1.7` sur le port `8791` ;
- Chromium : timeline étudiant et guidé, sélection, déplacement vidéo et durée `15:39` ;
- Chromium : cartes de couches, édition à la demande, création et suppression conditionnelle ;
- Chromium : masquage enseignant puis réapparition après réactivation ;
- Chromium : masquage local étudiant sans modification de la configuration enseignant ;
- Chromium : modale d’enregistrement en succès et en erreur réseau, fermeture ou bouton `Fermer` fonctionnels.

## État actuel fonctionnel

Le parcours principal est fonctionnel : IC-Hub sert l’activité, la vidéo HLS se lit, la timeline partagée reste synchronisée, l’atelier guidé permet de gérer les couches, et la vue étudiante respecte la visibilité publiée par l’enseignant tout en laissant l’étudiant filtrer localement les couches proposées.

## Terminé / en cours / hors périmètre

### Terminé

Lecture HLS, atelier guidé, timeline IC partagée et spécialisée, gestion des couches, visibilité enseignant/étudiant, feedback de sauvegarde et contrôles de validation décrits ci-dessus.

### En cours

La branche de travail reste non committée et contient plusieurs ajouts successifs dans les pages HTML. La consolidation, le nettoyage des overrides et l’automatisation des scénarios Chromium restent à planifier.

### Hors périmètre

Base de données, MariaDB, authentification, permissions, IA, extraction JSON supplémentaire, refonte de l’atelier avancé, modification du proxy HLS et modification des launchers.
