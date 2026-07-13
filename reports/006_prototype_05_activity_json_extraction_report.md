# Prototype 05 — extraction de l’activité dans un JSON

Date : 2026-07-13  
Version servie : `0.0.6.1`  
Périmètre : externalisation lecture seule des données métier du prototype 05.

## Résultat

L’activité existante est maintenant chargée par `fetch` depuis IC-Hub. Le rendu reste visuellement et fonctionnellement équivalent à la version précédente : vidéo HLS, transcription, timeline, couches, phénomènes, annotations, mode Focus, observations en mémoire et export CSV sont conservés.

Aucune base de données, administration, authentification supplémentaire ou persistance des observations étudiantes n’a été ajoutée.

## Fixture retenu

Fichier : `prototypes/00-ic-hub/server/data/proto05-activities.json`

Enveloppe :

```json
{
  "schemaVersion": "0.1",
  "updatedAt": "2026-07-13T00:00:00.000Z",
  "activities": []
}
```

L’activité `proto05-augmented-video-01` contient :

- la vidéo HLS `video-proto05-uga-37004`, avec `durationMs: 939217` et l’URL proxy IC-Hub ;
- la transcription `transcription-proto05-v0` ;
- 11 segments avec `startMs`/`endMs` entiers, texte, `speakerIds`, `languageIds` et `phenomenonIds` ;
- 5 définitions de locuteurs, dont le groupe et les locuteurs composites représentés par des références ;
- 4 langues : FR, ES, IT et PT ;
- 7 définitions de couches pédagogiques avec identifiants stables ;
- 26 occurrences de phénomènes temporelles, séparées des définitions de couches ;
- 11 annotations enseignantes séparées, avec note, question pédagogique et overlay éventuel ;
- une configuration de visibilité indiquant les couches visibles par défaut et côté apprenant/enseignant.

Les observations étudiantes ne figurent pas dans ce JSON : elles restent en mémoire navigateur et continuent d’être exportées en CSV.

## Endpoint

- `GET /api/proto05/activities` retourne l’enveloppe et la liste ;
- `GET /api/proto05/activities/proto05-augmented-video-01` retourne le détail utilisé par le prototype ;
- toute méthode autre que GET reçoit `405 Allow: GET` ;
- un identifiant absent reçoit `404` ;
- aucune route POST, PUT ou DELETE n’a été ajoutée.

Le serveur utilise `readLocalJson`, sans branche MariaDB, et l’endpoint reste public en lecture seule comme le chargement statique du démonstrateur.

## Adaptation HTML

`index-0.0.6.1.html` ne contient plus le tableau métier principal des 11 segments. Il contient uniquement la configuration de rendu (classes CSS, formatage et comportements UI), puis reconstruit un modèle de vue à partir du JSON chargé.

Les IDs internes sont convertis en libellés pour préserver l’affichage existant. Les observations et le CSV utilisent les libellés de couches (`Mot-piège`, `Négociation du sens`, etc.), pas les IDs techniques.

Le chargement invalide ou indisponible produit un état lisible `Erreur réseau` dans le lecteur avec le détail de la réponse IC-Hub et un message dans la zone de transcription.

## Vérifications réalisées

### Serveur et données

- `npm run check` dans IC-Hub : réussi ;
- parsing JSON : réussi ;
- fixture validé : 1 activité, 11 segments, 7 couches, 26 occurrences, 11 annotations ;
- `GET /api/health` : `200` ;
- liste Proto05 : `200`, `schemaVersion: 0.1`, une activité ;
- détail Proto05 : `200`, activité et références présentes ;
- POST détail : `405`, `Allow: GET` ;
- activité absente : `404` ;
- route du prototype : `200`.

### Navigateur

Depuis Chrome, après chargement du JSON :

- état lecteur `Prêt` ;
- durée `939.216740999997 s` ;
- média décodé en `640 × 360`, `readyState: 4` ;
- 11 segments affichés ;
- 7 couches cochées ;
- 26 marqueurs de phénomènes ;
- progression réelle de `currentTime` ;
- sauts vérifiés à `32 s`, `118 s` et `186 s` avec curseur de timeline synchronisé ;
- mode Focus masque puis restaure transcription et timeline ;
- observation ajoutée sur le segment `3:06 — 3:45` ;
- libellés de couches conservés dans le tableau d’observations ;
- export CSV déclenché avec le statut `Export CSV généré.` ;
- aucun journal `Uncaught` ni CORS applicatif.

### Erreur JSON

Le fixture a été rendu temporairement invalide, puis restauré. Le prototype a affiché :

> Impossible de charger l’activité depuis IC-Hub : Réponse IC-Hub 500.

Après restauration, l’état nominal est revenu avec 11 segments, 7 couches, 26 phénomènes et la durée vidéo correcte.

### Git et dépendances

- `git diff --check` : réussi ;
- `npm audit` reste pertinent pour la dépendance existante hls.js et a déjà été validé à 0 vulnérabilité lors de la mission précédente ;
- aucun script de build, typecheck ou test automatisé supplémentaire n’est déclaré dans `package.json`.

## Chevauchements conservés

Les intervalles existants n’ont pas été réinterprétés. Le segment `91–102 s` et le segment `100–118 s` se chevauchent entre `100` et `102 s`. Les occurrences de phénomènes d’un même segment partagent volontairement son intervalle. Aucune décision de fusion ou de priorité n’a été introduite.

## Fichiers modifiés dans cette mission

- `prototypes/00-ic-hub/server/data/proto05-activities.json` (nouveau) ;
- `prototypes/00-ic-hub/server/server.js` ;
- `prototypes/00-ic-hub/server/README.md` ;
- `prototypes/05-augmented-ic-video-01/index-0.0.6.1.html` ;
- `prototypes/05-augmented-ic-video-01/README.md` ;
- ce rapport.

Les modifications HLS et la dépendance `hls.js@1.6.13` de la mission précédente sont conservées telles quelles.

## Limites et décisions reportées

- le fixture reste une source partagée statique, sans versionnement métier par activité au-delà de `schemaVersion` et `updatedAt` ;
- aucun schéma JSON formel ni validation détaillée des références n’a été ajouté côté serveur ;
- les chevauchements temporels restent ceux de la V0 ;
- les rôles enseignant/étudiant, CRUD, édition des annotations et persistance des observations sont reportés ;
- la couverture de transcription reste limitée aux 11 segments existants et ne prétend pas couvrir toute la vidéo de 15:39.

## Message de commit proposé

`feat(prototype-05): load activity from JSON fixture`
