# Rapport 003 — Portail de démonstration IC-Lab-Next

Date : **10 juillet 2026**

Base de départ : `7a0c777` sur `main`.

## Objet

Cette mission recentre IC-Hub sur un portail local de démonstration. Les
parcours authentifiés, les comptes, les cours, les inscriptions, les sessions,
les traces et les services autonomes restent distincts.

## Architecture retenue

Le serveur HTTP existant du Hub (`8790`) sert désormais le portail public à la
racine `/`, redirigée vers `portal-0.10.3.html`. Le Hub authentifié historique
reste accessible via `hub.html` après la connexion.

Deux dossiers existants sont servis sans copie et sans second serveur :

| Route Hub | Dossier source | Destination |
|---|---|---|
| `/demos/augmented-video/` | `prototypes/05-augmented-ic-video-01` | `index-0.0.6.html` |
| `/demos/informaticaire/` | `prototypes/07-informaticaire` | `index.html` |

Les contrôles de chemin du serveur empêchent de sortir de ces deux racines. Les
services Agent vocal (`8788`) et Dico-IC / Seven Sieves (`3000`) restent des
liens autonomes : aucune donnée ni dépendance fonctionnelle n’est ajoutée au
Hub.

## Changements fonctionnels

Le portefeuille public V0.10.3 contient cinq cartes :

1. Vidéo augmentée — démonstrateur V0.0.6, servi par le Hub ;
2. Agent vocal IC — démonstrateur actif, runtime V1.2.3, prérequis `8788` ;
3. Informaticaire — démonstrateur gelé V0.6.5, servi par le Hub ;
4. Dico-IC — service en développement, administration sur `3000` ;
5. Seven Sieves — application en développement, interface connectée à Dico-IC
   sur `3000`.

Chaque carte précise la finalité, le statut, la version lorsqu’elle est fiable,
l’action d’ouverture et le prérequis local. Le portail reste lisible lorsque
les deux services autonomes sont arrêtés.

## Changements visuels

Une page dédiée et sobre conserve la palette vert sombre du Hub : en-tête de
présentation, grille de cartes cohérentes, badges d’état et actions uniques.
Aucune animation ni surface de pilotage supplémentaire n’a été ajoutée.

## Version

La version du serveur, du package et du portail est portée à **0.10.3**. Elle
prolonge la séquence V0.10.1/V0.10.2 des rapports Hub existants. L’interface
authentifiée historique reste V0.9.6 et n’est pas modifiée.

## Vérifications automatisées

- `node --check prototypes/00-ic-hub/server/server.js` : réussi ;
- démarrage de `node server.js` : réussi sur `8790` ;
- `GET /api/health` : `200`, version `0.10.3`, stockage JSON ;
- `/` : redirection `302` vers le portail ;
- portail, Vidéo augmentée et Informaticaire : réponses HTTP `200` ;
- feuille de style du portail et `styles.css` d’Informaticaire : servies en
  `text/css` ;
- au moment du contrôle, `8788` et `3000` étaient arrêtés ; le portail et les
  deux démonstrateurs servis par le Hub restaient accessibles.

## Recette manuelle

Le navigateur intégré n’a pas pu créer de nouvel onglet local : il exposait un
onglet fantôme hors de la session de test. Aucun autre navigateur n’a été
utilisé en contournement. David doit encore vérifier visuellement :

- l’absence d’erreur console du portail ;
- le rendu des cinq cartes aux dimensions de présentation souhaitées ;
- l’ouverture depuis les deux cartes statiques ;
- les liens Agent vocal, Dico-IC Admin et Seven Sieves une fois leurs services
  locaux lancés.

## Intégrité et limites

Avant et après les contrôles, aucun diff n’est constaté dans `users.json`,
`courses.json`, `enrollments.json`, `sessions.json`, `runs.json`,
`course-activities.json` ni `prototypes.json`. Aucune authentification, aucune
migration, aucune modification de base de données, de stack Docker ou des
quatre prototypes autonomes n’a été effectuée.

La disponibilité des services autonomes est exprimée comme prérequis explicite
plutôt que surveillée par un nouveau mécanisme. Le flux HLS distant de la Vidéo
augmentée demeure une dépendance externe.
