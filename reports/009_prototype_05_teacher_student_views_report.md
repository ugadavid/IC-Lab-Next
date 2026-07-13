# Rapport — Prototype 05 : vues étudiant et enseignant

Date : 13 juillet 2026  
Version : **0.0.8**

## Routes

- `GET /student` et `GET /student/:activityId` : vue étudiant ;
- `GET /teacher` : bibliothèque de préparation enseignant ;
- `GET /teacher/preview/:activityId` : prévisualisation enseignant ;
- les routes API existantes `/api/health` et `/api/proto05/activities...` sont
  inchangées et restent en lecture seule.

L’entrée IC-Hub `/demos/augmented-video/` continue de rediriger vers le serveur
autonome 8791.

## Organisation du moteur partagé

`index-0.0.8.html` est le moteur unique de lecture et de rendu : HLS, vidéo,
transcription, timeline, couches, annotations, Focus, observations et export
CSV. Les routes étudiant et enseignant prévisualisation servent ce même fichier.
Le mode est déterminé par la route et l’identifiant d’activité, sans seconde
implémentation visuelle.

`teacher.html` ne fournit que la bibliothèque : il charge la liste API, affiche
les informations principales et propose les liens de prévisualisation et de vue
étudiant. Aucun bouton d’écriture ni endpoint CRUD n’a été ajouté.

## Différences fonctionnelles

- Vue étudiant : consultation explicitement identifiée, sans administration ;
- Préparation enseignant : bibliothèque, ouverture d’une activité,
  prévisualisation et lien vers la vue étudiant correspondante ;
- limite affichée : **Mode enseignant local de prototype — aucune
  authentification ni gestion réelle des droits.**

Les observations restent en mémoire de session et l’export CSV demeure local.
`data/activities.json` n’a pas été modifié par cette mission.

## Vérifications

- serveur 05 redémarré sur 8791, `/api/health` renvoie `0.0.8` ;
- `/`, `/student`, `/student/:id`, `/teacher` et `/teacher/preview/:id` : `200` ;
- bibliothèque enseignant chargée via `/api/proto05/activities` ;
- prévisualisation et vue étudiant servent le même fichier de rendu ;
- API liste et détail : `200` ; POST : `405` ;
- redirection IC-Hub : `302` vers `http://127.0.0.1:8791/` ;
- `npm run check` et parsing des scripts HTML : réussis ;
- `git diff --check` : réussi.

La validation vidéo précédente reste applicable au moteur partagé : durée proche
de 939,216 secondes, progression, clics segments, timeline, couches, Focus,
observations et export CSV. Le proxy HLS et les données n’ont pas été modifiés.

## Limites et prochaine mission

La séparation est fonctionnelle et visuelle uniquement. Il n’y a ni session,
authentification, rôle, permission, CRUD, persistance d’observations ou
administration réelle. La prochaine étape recommandée est une étude séparée du
contrat d’authentification et des droits avant toute écriture de données.

Message de commit proposé :

`feat(prototype-05): add teacher and student views`
