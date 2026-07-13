# Rapport — Prototype 05 : première administration réelle

Date : 13 juillet 2026  
Version : **0.0.9**

## Périmètre

L’administration locale permet maintenant de modifier uniquement les
métadonnées générales d’une activité et de sélectionner une vidéo autorisée :

- `title` ;
- `description` ;
- `instruction` (consigne) ;
- `pedagogicalQuestion` ;
- `videoId` issu du catalogue contrôlé.

Les identifiants d’activité et de vidéo, le schéma JSON, les segments, la
transcription, les couches, les phénomènes, les annotations et les observations
ne sont pas éditables par ce contrat.

## Catalogue vidéo et API

Le catalogue `GET /api/proto05/video-catalog` ne contient actuellement qu’une
source vérifiée : `video-proto05-uga-37004`, HLS UGA via le proxy local, MIME
`application/vnd.apple.mpegurl`, durée `939217 ms`, autorisée.

L’écriture est limitée à :

`PUT /api/proto05/activities/:id`

Le serveur refuse les champs inconnus, les URLs arbitraires, les vidéos absentes
du catalogue, les identifiants modifiés, les activités inconnues, le JSON
malformé et les méthodes non prévues (`400`, `404`, `405`).

## Persistance

La lecture relit le JSON canonique du prototype. Une sauvegarde valide met à
jour `updatedAt`, crée `activities.json.bak`, écrit un fichier temporaire UTF-8
puis le renomme atomiquement. Une file d’écriture séquence les sauvegardes
concurrentes. Les champs non administrés sont recopiés sans transformation.

## Interface

`/teacher` expose désormais un lien **Modifier l’activité** vers
`/teacher/edit/:id`. Le formulaire charge les valeurs actuelles, propose les
quatre champs textuels et la sélection vidéo, affiche les erreurs ou le succès,
et permet de revenir à la bibliothèque ou d’ouvrir la prévisualisation.

La vue étudiant et la prévisualisation partagent toujours
`index-0.0.8.html`. Les nouvelles métadonnées sont affichées dans ce moteur
commun ; aucun second lecteur n’a été créé.

## Vérifications effectuées

- serveur 05 redémarré sur 8791, `/api/health` en version `0.0.9` ;
- formulaire `/teacher/edit/proto05-augmented-video-01` : `200` ;
- catalogue vidéo et routes étudiant/prévisualisation : `200` ;
- PUT valide : `200`, quatre métadonnées et `videoId` sauvegardés ;
- redémarrage du serveur : valeurs administrées relues depuis le JSON ;
- conservation vérifiée : 11 segments, 26 phénomènes, 7 couches, 4 langues,
  5 locuteurs et 11 annotations ;
- vidéo inconnue, URL arbitraire, identifiant modifié, JSON invalide : `400` ;
- activité inconnue : `404` ; POST : `405` ;
- restauration de la fixture initiale effectuée après le test de persistance ;
- `npm run check`, parsing JavaScript et `git diff --check` réussis.

La lecture HLS, la timeline, les couches, Focus, observations et export CSV
restent portés par le moteur partagé et le proxy existants.

## Limites restantes

Cette administration est locale et sans authentification, rôle ou permission.
Elle ne couvre pas encore les segments, couches, phénomènes, annotations,
transcriptions ni une gestion multi-utilisateur. La prochaine mission
recommandée est de définir le modèle d’authentification et d’autorisation avant
d’élargir les écritures.

Message de commit proposé :

`feat(prototype-05): add activity metadata administration`
