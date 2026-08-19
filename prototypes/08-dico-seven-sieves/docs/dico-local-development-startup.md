# Dico-IC - Demarrage local en deux minutes

Ce guide donne le chemin court pour lancer Dico-IC en local avec un seul point
d'entree HTTP cote Node.

## Etapes

1. Lancer Docker MariaDB depuis la racine du projet :

```bash
docker compose up -d
```

2. Aller dans le serveur Node :

```bash
cd Node
```

3. Demarrer l'application :

```bash
npm start
```

4. Ouvrir les pages locales :

```text
http://localhost:3000/admin-app/index-admin-0.1.html

http://localhost:3000/prototypes/01-seven-sieves/index-teacher-0.1.html

La préparation enseignant transmet le paquet complet dans le stockage de
session du même onglet, puis ouvre l’activité apprenant :

```text
http://localhost:3000/prototypes/01-seven-sieves/index-student-0.1.html
```

L’ancienne URL `index-api-live-0.1.html` reste une entrée de compatibilité et
redirige vers la page enseignant.
```

## Notes

- L'API REST reste servie directement par le meme serveur Node, par exemple
  `POST http://localhost:3000/analysis`.
- L'administration est servie sous `/admin-app/`.
- Les prototypes Seven Sieves sont servis sous `/prototypes/`.
- Aucun serveur `file://`, Python ou serveur statique separe n'est necessaire.
