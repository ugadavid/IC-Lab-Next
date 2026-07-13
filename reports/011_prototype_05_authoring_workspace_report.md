# Rapport — Prototype 05 : atelier auteur

Date : 13 juillet 2026  
Version : **0.1.0**

## Atelier et routes

- `/teacher/create` crée un brouillon depuis le catalogue vidéo autorisé ;
- `/teacher/author/:activityId` ouvre l’atelier auteur ;
- `/teacher/preview/:activityId` reste la prévisualisation partagée ;
- `/student/:activityId` reste la vue étudiante ;
- `POST /api/proto05/activities` crée une activité minimale ;
- `PUT /api/proto05/activities/:id/authoring` sauvegarde le brouillon complet ;
- `GET /api/proto05/video-catalog` expose le catalogue contrôlé.

La bibliothèque existante reste disponible, avec un accès vers la création et
l’atelier, mais n’a pas été développée davantage.

## Contenu de l’atelier

L’interface regroupe la vidéo/prévisualisation, les métadonnées, la
transcription éditable, la timeline des intervalles linguistiques, la timeline
des occurrences de phénomènes, les couches, les annotations et la sauvegarde
explicite du brouillon. Les segments, intervalles, phénomènes, couches et
annotations peuvent être ajoutés, modifiés ou supprimés depuis cet espace.

Les temps sont validés comme millisecondes entières positives, avec début
strictement inférieur à la fin et contrôle de la durée vidéo. Les chevauchements
ne sont pas supprimés automatiquement.

## Modèle et persistance

Le JSON conserve les données existantes et ajoute `languageIntervals` lorsque
nécessaire. Les activités créées portent `status: "draft"`, un identifiant
stable généré côté serveur et une vidéo du catalogue autorisé. La sauvegarde
reste dans `data/activities.json`, met à jour `updatedAt`, crée une sauvegarde
`.bak`, puis effectue une écriture temporaire et un renommage atomique séquencé.

Le lecteur n’est pas dupliqué : la prévisualisation intégrée à l’atelier pointe
vers le même moteur que la vue étudiant.

## Vérifications

- création d’un brouillon : `201` ;
- sauvegarde auteur avec segment et intervalle : `200` ;
- redémarrage et relecture des données existantes : réussi ;
- conservation de l’activité de démonstration : 11 segments, 26 phénomènes,
  7 couches, 4 langues, 5 locuteurs, 11 annotations ;
- routes `/teacher/create`, `/teacher/author`, `/teacher/preview` et `/student` :
  `200` ;
- parsing des scripts HTML : réussi ;
- `npm run check` : réussi ;
- `git diff --check` : réussi.

## Limites restantes

L’administration reste locale et sans authentification, rôles ou permissions.
Les observations étudiantes ne sont pas persistées. Les contrôles de référence
peuvent encore être enrichis (par exemple une liste de langues et de couches
plus guidée, et une gestion plus fine des rattachements d’annotations).

Message de commit proposé :

`feat(prototype-05): add activity authoring workspace`
