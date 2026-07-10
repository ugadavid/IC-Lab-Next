# IC-Lab Hub V0.10.3

Hub local experimental place au-dessus des prototypes IC-Lab. Il gere des comptes demo, des roles, des cours, des inscriptions, des prototypes disponibles et des assignations d'activites.

## Lancer

```bash
cd prototypes/00-ic-hub/server
npm start
```

Le serveur ecoute par defaut sur `http://localhost:8790`.

La racine `/` est le portail public de demonstration IC-Lab-Next. Elle propose
des routes locales stables pour les demonstrateurs statiques, sans les copier :

- `/demos/augmented-video/` ;
- `/demos/informaticaire/`.

Les services Agent vocal (`8788`) et Dico-IC / Seven Sieves (`3000`) restent
autonomes : le portail expose seulement leurs liens et leurs prerequis locaux.

La passe V0.1.1 stabilise le serveur : garde-fou contre les doubles reponses HTTP, lecture de body JSON plus defensive, creation/verifications des fichiers JSON au demarrage et logs minimaux.

La V0.2 ajoute un connecteur local vers Prototype 06 sans copier sa logique interne.

## Comptes demo

- `admin@demo.local` / `admin`
- `teacher@demo.local` / `teacher`
- `student@demo.local` / `student`

Les mots de passe ne sont pas stockes en clair. Ils sont hashes avec `crypto.scryptSync` et un sel local.

## Endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/prototypes`
- `GET /api/prototypes/status`
- `GET /api/prototypes/:prototypeId/activities`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/:id`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`
- `POST /api/courses/join`
- `GET /api/courses/:courseId/activities`
- `POST /api/courses/:courseId/activities`
- `DELETE /api/courses/:courseId/activities/:assignmentId`
- `GET /api/admin/users`
- `GET /api/admin/sessions`

Les routes protegees attendent :

```txt
Authorization: Bearer <token>
```

## Pages

- `/` et `/portal.html` : portail de demonstration V0.10.3 ;
- `/login.html`
- `/hub.html`
- `/teacher.html`
- `/student.html`
- `/admin.html`
- `/hub-0.2.html`
- `/teacher-0.2.html`
- `/student-0.2.html`
- `/admin-0.2.html`

## Connecteur Prototype 06

Le connecteur `proto06` utilise :

- `baseUrl`: `http://127.0.0.1:8788`
- `activityApiUrl`: `http://127.0.0.1:8788/api/activities`
- `launchUrl`: `http://127.0.0.1:8788/index-1.1.html`

Si Prototype 06 est indisponible, le hub reste utilisable et retourne un statut `unavailable`.

## Securite prototype

Cette authentification est une demonstration locale. Elle n'est pas prete pour un deploiement public.

Limites connues :

- pas de HTTPS ;
- pas de cookies securises ;
- pas de CSRF ;
- gestion simple des tokens ;
- pas de recuperation de mot de passe ;
- comptes demo faibles ;
- stockage JSON local ;
- permissions simplifiees.
