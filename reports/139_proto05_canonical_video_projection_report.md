# Mission 139 — Proto05 — Projection canonique de la vidéo d’activité

Date : 2026-07-28
Version obtenue : `0.1.46`
Commit de départ : `45df55a` (`docs(proto05): audit activity video authority`)

## Résultat

La décision A de la Mission 138 est appliquée :

> supprimer `activity.video` du stockage et le projeter à la lecture.

Le playable de `video-library.json` est désormais l’unique autorité vidéo de
Proto05. Une activité JSON persiste seulement :

```json
{
  "videoRef": {
    "schemaVersion": "0.1",
    "assetId": "...",
    "playableId": "..."
  }
}
```

Les objets compatibles `video` et `videoSource` sont construits à la lecture.
Ils ne sont jamais réécrits dans l’activité.

## Préflight

- état Git initial : propre ;
- rapport 138 : présent et committé ;
- décision confirmée : option A ;
- version initiale : `0.1.45` ;
- mode applicatif : JSON exclusivement ;
- aucun adaptateur MariaDB de lecture issu de la Mission 137 ;
- aucune modification préexistante à préserver ;
- HEAD : `45df55a`.

Le rapport 138 a été lu comme inventaire de référence. La mission n’a pas
recommencé l’audit.

## Modèle appliqué

### Stockage

`activityForStorage()` retire systématiquement `video` et `videoSource`.
`storeForPersistence()` applique cette frontière à toutes les activités avant
chaque écriture atomique.

Les écritures suivantes ne produisent plus de snapshot :

- création ;
- sauvegarde auteur ;
- modification partielle ;
- changement de vidéo ;
- association depuis la vidéothèque ;
- duplication.

L’alias client transitoire `videoId` reste accepté pour les vues qui
l’utilisent encore. Il est converti immédiatement en `videoRef` canonique et
n’est jamais persisté. Un payload contenant directement `video` ou
`videoSource` est refusé comme champ non autorisé.

Les protections de suppression d’asset ou de copie locale consultent désormais
uniquement `videoRef`.

### Exposition

Le nouveau module `server/activity-video-projection.js` centralise une
projection pure, fermée et non mutante.

Il couvre les types réellement présents :

- `youtube-embed` : `videoId` et `embedUrl`, sans propriété HLS ;
- `hls` : `url`, `manifestUrl` et alias compatible `proxyUrl`, sans propriété
  YouTube ;
- `local-file` : `url` et `storageKey` ;
- `direct-url` : `url`.

Les propriétés absentes ne sont pas ajoutées artificiellement. Les valeurs
définies, y compris `null`, conservent leur type.

La liste, le détail et la bibliothèque d’activités appellent la même
projection. Les vues étudiant, prévisualisation et atelier guidé consomment
ainsi la même autorité. L’injection du lecteur guidé utilise maintenant
`videoSource`.

### Playable absent ou indisponible

Une référence absente ou orpheline produit une erreur explicite
`ACTIVITY_PLAYABLE_UNRESOLVED` ; les lectures concernées répondent `409`. Aucun
snapshot historique n’est consulté.

Pour les états explicitement indisponibles actuels (`blocked`,
`missing-local`, `pending`, `unreachable-remote`), `videoSource` conserve le
diagnostic de disponibilité mais ses localisateurs sont retirés. La projection
`video` ne peut donc pas ressusciter une ancienne URL.

Les playables déclaratifs existants en état `unknown` conservent leur
localisateur canonique. Ce choix minimal préserve les sources HLS et YouTube
actuelles : `unknown` n’est pas traité comme une indisponibilité prouvée.

## Nettoyage des données de test

Les deux activités canoniques ont été nettoyées :

- `proto05-augmented-video-01` conserve la référence vers le playable HLS
  `video-proto05-uga-37004` ;
- `proto05-draft-1784230655360-d1182f` conserve la référence vers le playable
  YouTube `video-proto05-youtube-ev9rfkfhfa0`.

`video` et `videoSource` sont absents des deux objets persistés. Le snapshot
hybride HLS/YouTube a donc disparu sans migration conservatoire et sans
conservation de l’ancien `proxyUrl`.

Les fixtures représentant le stockage courant ont été alignées sur
`videoRef`. Les fixtures qui testent explicitement les anciens outils de
migration MediaLibrary restent volontairement historiques.

## Fichiers concernés

### Créés

- `prototypes/05-augmented-ic-video-01/server/activity-video-projection.js`
- `prototypes/05-augmented-ic-video-01/server/test/activity-video-authority.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/activity-video-projection.test.js`
- `reports/139_proto05_canonical_video_projection_report.md`

### Modifiés

- `prototypes/05-augmented-ic-video-01/data/activities.json`
- `prototypes/05-augmented-ic-video-01/guided-overlays.js`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/activity-duplication.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/data-regression.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/empty-draft-validation.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-persistence.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/media-contract.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/remote-library-reference.test.js`

Aucun fichier SQL, schéma, migration ou adaptateur MariaDB n’a été modifié.

## Contrats observables

Le stockage brut contient `videoRef`, sans `video` ni `videoSource`.

Les réponses d’activité continuent d’exposer :

- `videoRef` ;
- `video`, projection de compatibilité fermée ;
- `videoSource`, descripteur canonique de lecture ;
- les données pédagogiques existantes.

La bibliothèque d’activités expose maintenant le même contrat vidéo que la
liste et le détail. Une référence irrésolue n’est plus masquée par un snapshot.

## Tests et contrôles

### Tests ajoutés

Les nouveaux tests couvrent :

- projections YouTube, HLS, locale et directe ;
- absence des propriétés non applicables ;
- déterminisme et absence de mutation des sources ;
- playable absent et playable explicitement indisponible ;
- création, sauvegarde, changement de vidéo et duplication sans snapshot ;
- refus d’un faux snapshot client ;
- inspection du JSON réellement persisté ;
- cohérence liste, détail et bibliothèque ;
- disponibilité des routes étudiant, prévisualisation et atelier guidé ;
- régression HLS → YouTube, sans `proxyUrl` résiduel.

### Résultats

- validation syntaxique Node du serveur, du module et des tests nouveaux :
  réussie ;
- suite serveur sans navigateur ni FFmpeg : **143/143** tests réussis ;
- sous-suite de création et validation d’un brouillon, filtrée pour ne pas
  exécuter sa recette Chromium : **10/10** tests réussis ;
- total des contrôles automatisés finaux exécutés sans navigateur ni FFmpeg :
  **153/153** ;
- validation JSON et résolution des deux `videoRef` canoniques : réussies ;
- `git diff --check` final : réussi (les avertissements de conversion LF/CRLF
  correspondent à la configuration existante du dépôt).

La suite verte principale exclut les fichiers qui embarquent une recette
Chromium, les deux fichiers FFmpeg, ainsi que
`overlay-separation.test.js`. Ce dernier possède une assertion historique
indépendante de cette mission qui attend encore sept activités alors que
l’état canonique de départ en contient deux ; ses quatre sous-tests
fonctionnels réussissent.

### Écart de procédure

Une première tentative de suite élargie a exclu les deux fichiers FFmpeg, mais
pas tous les fichiers mêlant tests Node et recettes Chromium. Elle a donc lancé
involontairement plusieurs recettes Chromium. Aucun FFmpeg n’a été lancé.

Cette exécution n’est pas présentée comme une validation visuelle : elle a
notamment rencontré des attentes historiques déjà désalignées avec le
catalogue canonique de deux activités. Les exécutions finales ont utilisé une
sélection explicite sans navigateur.

## Témoins MariaDB avant/après

Les contrôles ont été effectués en lecture seule par dumps déterministes. Le
secret est resté interne au conteneur et n’a pas été affiché.

| Base | Lignes | Hash données avant/après | Hash structure avant/après |
|---|---:|---|---|
| `ic_augmented_video` | 268 | `5514700ce9cf1edcd99fa38afc1d6b408a89cd5c581105eccc7ea07b5fa0fc33` | `dc4d92101b8b21d5d07d36114c00525e66330dbe334aefdb3d9e1a1ba80b4d6a` |
| `ic_dico` | 859 | `786bd80a39604d9d25bdfd91286b5652b87c9f814afc10dd178dbde5dbb4815c` | `03f9e0d6fee34f7a867ca970294aafdf4ad30cad6e68ace69b434dc59b474e27` |
| `ic_hub` | 223 | `3ae48844ed0b426479baf1b4d80f2b8d05352ca88cb5a03a00daceb8b68e2382` | `32197288cce606dc551ba5702e5a0cfb5ad7fc45baf2d77f04bbbce169aee9e3` |

État final de `ic_augmented_video` :

- 268 lignes totales ;
- 264 lignes métier ;
- 4 lignes documentaires ;
- 32 tables ;
- 0 vue ;
- 43 routines ;
- 48 FK ;
- 68 contraintes `CHECK` ;
- 0 trigger ;
- 0 événement.

Les témoins avant et après sont identiques. `ic_dico` et `ic_hub` sont
inchangées. Aucune synchronisation du JSON nettoyé vers MariaDB n’a été
effectuée.

L’écart temporaire attendu subsiste donc : MariaDB contient l’état de test
migré antérieur, tandis que le JSON courant utilise le modèle nettoyé. Il ne
bloque pas la mission et devra être traité seulement lors d’une reprise
contrôlée de l’adaptateur ou d’une réinitialisation explicitement autorisée.

## Recette visuelle laissée à David

La validation humaine n’a pas été réalisée.

1. Ouvrir `/teacher` et vérifier les deux activités de test dans la liste.
2. Ouvrir `proto05-augmented-video-01` depuis sa fiche ou
   `/teacher/guided/proto05-augmented-video-01` : la source attendue est HLS.
3. Ouvrir `proto05-draft-1784230655360-d1182f` : la source attendue est
   YouTube, sans tentative de lecture de l’ancien flux UGA.
4. Ouvrir `/student/<id>` et `/teacher/preview/<id>` pour chacune.
5. Depuis la fiche d’édition, changer l’activité HLS vers la vidéo YouTube,
   sauvegarder puis recharger.
6. Vérifier que YouTube reste sélectionné et qu’aucun flux HLS ne réapparaît.
7. Si une vidéo locale disponible est visible dans la vidéothèque, créer une
   activité avec elle, puis contrôler fiche, atelier et vue étudiante.

Résultat attendu : même type et même source entre liste, détail, guidé et vue
étudiante ; aucun retour de l’ancien playable après rechargement.

## Limites et suite

- Les clients auteur et édition qui envoient encore `videoId` utilisent
  l’alias de transition converti immédiatement côté serveur. Le stockage cible
  reste exclusivement `videoRef`.
- La disponibilité média n’a pas été refondue ; seuls les faux fallbacks ont
  été supprimés.
- La validation visuelle humaine reste à effectuer par David.
- L’adaptateur MariaDB n’a pas été commencé. Sa reprise pourra lire la relation
  primaire existante puis appeler la même projection, sans reconstituer un
  snapshot depuis les anciennes données JSON.

## État Git et livraison

La mission laisse uniquement les changements locaux listés dans ce rapport.
Aucun commit et aucun push n’ont été effectués.

Message de commit proposé :

```text
fix(proto05): derive activity video from canonical playable
```
