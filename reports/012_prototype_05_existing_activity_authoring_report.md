# Rapport — Prototype 05 : activité historique dans l’atelier auteur

Date : 13 juillet 2026  
Version : **0.1.1**

## Ouverture de l’activité existante

L’activité `proto05-augmented-video-01` est maintenant accessible directement
sur `/teacher/author/proto05-augmented-video-01`. La bibliothèque conserve son
fonctionnement et les accès création/prévisualisation ; la prévisualisation
enseignant expose également un lien de retour vers l’atelier.

L’atelier charge le JSON réel par identifiant stable. Aucun brouillon, fixture ou
copie métier parallèle n’est créé pour cette activité.

## Données chargées

Les contrôles sont remplis depuis l’activité existante : métadonnées, vidéo,
11 segments, leurs textes, temps, locuteurs et langues, 4 langues, 5 locuteurs,
7 couches, configuration de visibilité, 26 phénomènes et 11 annotations.

Le champ `languageIntervals` n’existait pas dans la fixture historique ; il est
normalisé comme tableau vide, sans inventer d’intervalles. L’atelier permet d’en
créer de nouveaux. Les définitions de couches historiques ne comportent pas
toujours description/couleur ; ces contrôles restent donc vides ou prennent leur
valeur d’édition uniquement après intervention explicite.

## Édition et persistance

L’API existante `PUT /api/proto05/activities/:id/authoring` a été conservée.
Elle valide désormais les références croisées : langues et locuteurs des
segments, couches et segments des phénomènes, segments des annotations,
identifiants de couches uniques et intervalles cohérents.

Une modification réversible a été appliquée puis restaurée : texte et temps d’un
segment, locuteur/langues, ajout d’un intervalle, occurrence de phénomène,
visibilité/nom de couche et annotation. La sauvegarde a renvoyé `200`, a conservé
les 11 segments et 26 phénomènes, puis la fixture initiale a été restaurée.
Le serveur relit ensuite les données restaurées et conserve `activities.json.bak`.

## Vérifications

- accès direct atelier historique : `200` ;
- prévisualisation historique : `200` ;
- serveur `0.1.1` sur 8791 ;
- comptes chargés : `11/26/7/4/5/11` ;
- sauvegarde auteur et relecture : réussies ;
- données invalides de référence et temps : `400` ;
- parsing HTML/JavaScript : réussi ;
- `npm run check` : réussi ;
- `git diff --check` : réussi.

La vidéo HLS, la timeline, les couches, les annotations, Focus, observations et
export CSV continuent d’utiliser le moteur étudiant partagé.

## Limites restantes

La fixture historique ne possède pas encore d’intervalles linguistiques
distincts : les langues restent portées par `segment.languageIds`. Il n’y a
toujours ni authentification, permissions, édition multi-utilisateur ou
persistance des observations étudiantes. Une prochaine étape pourra enrichir la
normalisation des timelines et la validation interactive des rattachements.

Message de commit proposé :

`feat(prototype-05): open existing activity in authoring workspace`
