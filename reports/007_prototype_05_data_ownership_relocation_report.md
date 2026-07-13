# Rapport — Prototype 05 : recentrage de la propriété des données

Date : 13 juillet 2026  
Version livrée : **0.0.6.2**

## Objet

Le fixture d’activité du prototype 05 n’est plus hébergé dans IC-Hub. Il a été
déplacé de `prototypes/00-ic-hub/server/data/proto05-activities.json` vers
`prototypes/05-augmented-ic-video-01/data/activities.json`. L’ancien fichier a
été supprimé et aucune copie n’est conservée sous `server/data/`.

IC-Hub reste la passerelle HTTP provisoire afin de préserver le comportement de
la page existante. Le serveur lit maintenant un chemin interne fixe construit
depuis la racine du workspace. La fonction `proto05DataFile()` vérifie que le
chemin résolu reste sous le répertoire de données du prototype ; aucune valeur
fournie par le navigateur ne peut choisir un fichier, une URL ou une redirection.

## API conservée

- `GET /api/proto05/activities` : enveloppe de liste avec l’activité publiée ;
- `GET /api/proto05/activities/proto05-augmented-video-01` : détail complet ;
- identifiant inconnu : `404` ;
- méthodes d’écriture : `405` avec `Allow: GET` ;
- lecture JSON absente ou invalide : réponse serveur `500` avec message de
  lecture explicite dans le journal, sans exposition du chemin arbitraire.

Les réponses contiennent toujours les mêmes données pédagogiques : 11 segments,
26 phénomènes, 7 couches, 4 langues, 5 locuteurs et 11 annotations.

## Version et compatibilité

IC-Hub sert désormais `index-0.0.6.2.html`. La version 0.0.6.1 reste présente
comme version précédente ; l’interface, la transcription, la timeline, les
couches, les annotations, le mode Focus, les observations et l’export CSV n’ont
pas été refondus. L’URL vidéo HLS proxyfiée et la dépendance locale épinglée à
hls.js sont conservées depuis la réparation précédente.

## Vérifications effectuées

- serveur IC-Hub démarré sur `127.0.0.1:8790` ; `/api/health` répond `200` ;
- `node --check server.js` réussi ;
- script inline de `index-0.0.6.2.html` compilé avec succès ;
- endpoint liste : `200`, schéma `0.1`, une activité ;
- endpoint détail : `200`, version `0.0.6.2`, comptes ci-dessus ;
- page `/demos/augmented-video/` servie avec le titre 0.0.6.2 et le chargement
  JSON ;
- méthode `POST` : `405` ; activité inconnue : `404` ;
- déplacement temporaire du fichier : l’endpoint a renvoyé `500`, puis le
  fichier a été restauré ;
- validation navigateur précédente conservée : durée HLS observée
  `939.2167 s`, progression de `currentTime`, trois sauts par segments,
  synchronisation timeline, mode Focus, observation et export CSV ;
- `git diff --check` réussi.

## Limites restantes

IC-Hub conserve volontairement une passerelle de compatibilité. Un serveur
autonome du prototype 05, une administration CRUD et une migration de modèle de
données restent hors périmètre de cette mission.

## Message de commit proposé

`refactor(prototype-05): move activity data ownership to prototype`
