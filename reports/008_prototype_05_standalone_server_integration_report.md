# Rapport — Prototype 05 : serveur autonome et intégration

Date : 13 juillet 2026  
Version : **0.0.7**

## Architecture retenue

Le prototype possède désormais `prototypes/05-augmented-ic-video-01/server/`, un
serveur Node.js natif sans dépendance supplémentaire, exposé sur `127.0.0.1:8791`.
Il est propriétaire de la page `index-0.0.7.html`, des ressources statiques, de
`data/activities.json`, des routes API Proto05 et de la gestion d’erreurs.

Le proxy HLS n’est pas réimplémenté. Le serveur 05 relaie uniquement une liste
blanche de chemins `uga-37004` vers le proxy HLS strict d’IC-Hub sur 8790, en
conservant les réponses MIME, Range et `206` en streaming. Cette dépendance est
temporaire et évite deux implémentations divergentes.

## Routes

- `GET /` et `GET /index-0.0.7.html` ;
- `GET /api/health` ;
- `GET /api/proto05/activities` ;
- `GET /api/proto05/activities/:id` ;
- `GET /api/hls/uga-37004/...` pour les ressources HLS blanchies.

Les méthodes d’écriture répondent `405`, les identifiants inconnus `404`, les
routes inconnues `404` et les chemins traversants `403`. Les fichiers absents ou
JSON invalides produisent une erreur JSON lisible en `500`.

## Intégration IC-Hub et lancement

`/demos/augmented-video/` sur le port 8790 redirige vers
`http://127.0.0.1:8791/`. Les anciennes routes API Proto05 d’IC-Hub restent
provisoirement disponibles pour compatibilité et lisent la même source canonique.

`scripts/windows/start-proto05.bat` démarre ou réutilise le serveur sans
installation ni migration. `start-all.bat` le lance avant IC-Hub. Le script
`check-status.bat` affiche maintenant Proto 05, IC-Hub, Agent vocal, Dico-IC,
MariaDB et Docker. `PROJECTS_LAUNCH.md` cartographie le nouveau port et point
d’entrée.

## Vérifications

- `npm run check` du serveur 05 : réussi ;
- parsing du JavaScript inline de `index-0.0.7.html` : réussi ;
- démarrage direct sur 8791 et relance idempotente : réussi ;
- `/`, `/api/health`, liste et détail : `200` ;
- détail : version `0.0.7`, 11 segments ;
- activité inconnue et route inconnue : `404` ; POST : `405` ;
- ressource hls.js locale : `200` ;
- manifeste HLS via passerelle : `200` ; segment avec `Range: bytes=0-99` : `206`,
  `Content-Range` préservé, 100 octets relayés ;
- redirection IC-Hub : `302` vers 8791 ; route API IC-Hub de compatibilité : `200` ;
- `check-status.bat` : Proto 05 et IC-Hub actifs ;
- `git diff --check` : réussi.

La validation vidéo précédente reste applicable au même flux et à la même
interface : durée proche de 939,216 secondes, progression, sauts de segments,
timeline, Focus, observations et export CSV.

## Limites et prochaine étape

Le proxy HLS demeure porté par IC-Hub ; sa migration complète pourra être faite
dans une mission dédiée après retrait des routes de compatibilité. Aucun CRUD,
authentification, stockage d’observations ou interface d’administration n’a été
ajouté.

Message de commit proposé :

`feat(prototype-05): add standalone server and launcher integration`
