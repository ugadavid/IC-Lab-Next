# Mission 068 — Proto05 : contrat média et adaptateur de lecture

## Périmètre

Socle technique minimal de la future Library vidéo, limité à Proto05. Aucune
donnée canonique n’a été réécrite et aucun autre prototype n’a été modifié.

## Contrat retenu

Une activité conserve `activity.video` comme projection de compatibilité. Une
référence normalisée est dérivée ou acceptée sous la forme :

```json
{
  "schemaVersion": "0.1",
  "assetId": "media-proto05-<catalogue-id>",
  "playableId": "<catalogue-id>"
}
```

`assetId` identifie l’asset média logique ; `playableId` identifie la source
autorisée effectivement jouable. Le serveur expose en complément
`activity.videoSource`, descripteur normalisé de type `direct-url`, `hls` ou
`youtube-embed`, avec URL jouable, manifeste éventuel, fournisseur et durée.
Les URL directes et les manifestes `.m3u8` sont normalisés uniquement par le
résolveur contrôlé ; aucun mécanisme d’import ou d’URL libre n’est ajouté.

## Compatibilité

- Les activités existantes sont migrées à l’exécution : `videoRef` est dérivé
  du catalogue sans réécriture du JSON canonique.
- `GET /api/proto05/activities/:id` conserve `activity.video` et ajoute les
  projections résolues ; une route dédiée
  `/api/proto05/activities/:id/video-resolution` permet d’obtenir le même
  descripteur contrôlé.
- Le lecteur partagé accepte désormais `source.url` pour UGA comme son ancien
  `proxyUrl`, et l’atelier guidé utilise le descripteur résolu. YouTube reste
  servi par l’adaptateur IFrame officiel existant.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/media-contract.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/test/media-contract.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/shared/ic-video-player.js`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/index-0.0.9.html`

## Vérifications

- `npm run check` : OK.
- 5 tests ciblés : URL directe, manifeste HLS, activité existante sans
  écriture canonique, source YouTube et PUT authoring sur copie temporaire :
  OK.
- Chromium : activité YouTube de guidé chargée avec iframe et horloge,
  console applicative sans erreur, largeur 1265/1265 ; atelier auteur chargé
  sans erreur et sans débordement.
- Parcours étudiant UGA : le proxy Proto05 répond, mais la lecture live est
  restée en erreur car IC-Hub `127.0.0.1:8790` était indisponible ; cette
  dépendance externe n’a pas été modifiée.
- Vérification du statut Git : aucune modification de `data/activities.json`
  canonique et aucun changement hors Proto05, à l’exception du présent
  rapport documentaire obligatoire.

## Version

Version Proto05 serveur : `0.1.23` (précédemment `0.1.22`), incrément mineur
justifié par l’introduction du contrat et du résolveur média.

## Limites et suite

La Library administrable, l’import, le téléchargement, les copies locales,
l’anonymisation et les versions dérivées restent volontairement hors mission.
Le fonctionnement HLS complet doit être revalidé avec IC-Hub lancé.

Message de commit proposé : `feat(proto05): add media contract and playback resolver`
