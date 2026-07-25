# Mission 112 — Télécharger une vidéo distante dans la Library avec FFmpeg

Date : 2026-07-24  
Prototype : `05-augmented-ic-video-01`  
Version de départ : `0.1.34`  
Version visée après validation complète : `0.1.35`

## Périmètre

Cette mission ajoute une copie locale gérée à un asset distant existant, avec
FFmpeg, progression, annulation et finalisation atomique. La référence HLS 36971
de David reste canonique et ne sera ni téléchargée intégralement ni modifiée
pendant les recettes sans confirmation humaine explicite.

Le dépôt réel est propre au démarrage de la mission, sur `main` à
`ac92dd9` (`feat(proto05): add secure remote video references`).

## Diagnostic préalable et décision canonique

### Modèle multi-source et multi-playable

Le contrat canonique 1.0 autorise explicitement :

- une ou plusieurs sources par asset ;
- zéro, un ou plusieurs playables par asset ;
- plusieurs playables produits par une source ;
- un unique `defaultPlayableId` par asset.

Les relations persistées sont `MediaSource.assetId`, `Playable.assetId` et
`Playable.sourceId`. Les listes `sourceIds` et `playableIds` ne sont que des
projections recalculées. Le catalogue actuel ne contient encore aucun asset
multi-source ou multi-playable, mais le schéma, son validateur et les tests de
contrat acceptent cette cardinalité.

`MEDIA_LIBRARY_MODEL.md` tranche précisément le cas de la mission : une URL ou
un flux distant copié localement ne crée pas un nouvel original logique. La
copie devient un playable local supplémentaire du même asset ; la source
distante reste conservée.

### Décision retenue avant implémentation

La copie FFmpeg sera donc ajoutée au **même asset** :

1. conservation intégrale de l’asset et de sa source/playable distants ;
2. ajout d’une source locale décrivant la provenance de la copie ;
3. ajout d’un playable `local-file` dont
   `location.storageKey` désigne le fichier géré ;
4. passage du playable local en `defaultPlayableId` après validation et
   persistance réussies ;
5. conservation du titre, du dossier, des tags, du lignage et des usages de
   l’asset.

Cette solution respecte le modèle existant, évite un doublon de carte et
n’introduit aucun stockage parallèle. Le writer canonique devra seulement
accepter l’ajout de nouvelles sources/playables rattachés à un asset déjà
persisté, ce que son adaptateur runtime historique ne sait pas encore produire
à lui seul.

### Stockage, nommage et suppression

Le dossier possédé par Proto05 est
`data/video-library-media/`. Les `storageKey` sont relatifs, sans chemin absolu,
antislash, segment vide, `.` ou `..`, puis résolus et vérifiés sous cette racine.

Les imports existants utilisent un préfixe de hash SHA-256 suivi d’un nom
nettoyé. La mission conservera cette convention :
`<16 caractères du hash>-<nom utilisateur validé>`. Aucun fichier final
existant ne sera remplacé.

La suppression physique actuelle agit sur un asset entier et exige un fichier
local unique. Pour un asset mixte, une route dédiée retirera uniquement le
playable local, sa source locale et son fichier, avec les mêmes contrôles
d’usage, de partage et de rollback que la mission 107. Elle ne supprimera jamais
la source distante ni l’asset.

### Lecture, disponibilité et usages

La carte moderne choisit actuellement le playable correspondant à
`defaultPlayableId`, sinon le premier playable. L’activité, elle, conserve son
`videoRef.playableId` explicite. Faire du playable local le défaut rend donc la
copie immédiatement prévisualisable dans la Library sans réécrire les activités
existantes.

La disponibilité locale est calculée depuis le `storageKey` et l’existence du
fichier géré. Les usages sont calculés par asset, source, playable et
`storageKey`. L’ajout au même asset conserve naturellement le badge d’usage,
le dossier, les tags et les protections ; une suppression de copie locale devra
en plus vérifier les dépendances propres à son playable.

### FFmpeg réel et configuration existante

Le projet utilise déjà `FFMPEG_PATH`, puis `ffmpeg` dans `PATH`, pour les
préparations et dérivations HLS. Aucun parcours arbitraire du disque ni
installation automatique n’est nécessaire.

Sur la machine de David :

- `ffmpeg.exe` détecté dans `C:\Tools\ffmpeg\bin\ffmpeg.exe` ;
- `ffprobe.exe` détecté dans le même dossier ;
- `ffmpeg -version` et `ffprobe -version` réussissent ;
- build détecté : `2026-02-04-git-627da1111c-full_build-www.gyan.dev`.

La mission réutilisera `FFMPEG_PATH`, acceptera un chemin explicite vers
`ffmpeg.exe` uniquement, le validera avec une invocation bornée de
`-version`, puis essaiera `ffmpeg` dans `PATH`. Le navigateur ne pourra fournir
ni commande complète ni arguments libres.

### Stratégie média arrêtée

FFmpeg sera lancé avec un exécutable et une liste d’arguments séparés,
`shell: false`, `-nostdin` et `-progress pipe:1`.

Pour HLS, le téléchargement utilisera la source canonique à travers le résolveur
same-origin strict lié au playable. Chaque manifeste, playlist, segment et
redirection reste ainsi soumis aux protections DNS/SSRF de la mission 111.
Une playlist maître sélectionnera de façon déterministe la variante de plus
haut `BANDWIDTH` (puis la meilleure résolution en cas d’égalité).

La sortie sera remuxée sans transcodage :

- MP4 lorsque les flux sont compatibles ;
- WebM seulement pour une source directe déjà WebM ;
- erreur claire lorsqu’aucun conteneur local lisible ne peut être produit sans
  transcodage.

Le fichier incomplet restera dans un workspace temporaire de la tâche et ne
deviendra jamais un playable. Après succès FFmpeg : validation non vide,
`ffprobe`, hash, déplacement atomique vers la destination finale, écriture
canonique, puis projection actualisée. Si le writer échoue après le déplacement,
le fichier final est supprimé et l’asset distant reste intact.

## Réparation du test préexistant

`library-persistence.test.js` lit actuellement le média réel absent
`video_37004_1080p.mp4`. Il sera réparé avec une fixture locale temporaire
contrôlée dans la copie de test. Le média réel et les données canoniques ne
seront pas recréés ni modifiés pour satisfaire ce test.

## Réalisation

La version obtenue est `0.1.35`.

### Chaîne de téléchargement

Le serveur expose maintenant :

- l’état FFmpeg/FFprobe et une configuration temporaire bornée au chemin exact
  de `ffmpeg.exe` ;
- les options calculées d’un téléchargement distant ;
- la création, la consultation et l’annulation d’une tâche ;
- une passerelle same-origin canonique pour les fichiers vidéo directs ;
- la passerelle HLS existante, étendue aux sources canoniques historiques
  `provider: uga`.

La tâche choisit la variante HLS au plus haut `BANDWIDTH`, remuxe sans
transcodage, lit `-progress pipe:1`, borne sa durée et maintient un seul
téléchargement actif par asset. L’exécutable et les arguments restent séparés,
avec `shell: false`, `-nostdin` et aucun argument libre reçu du navigateur.
La whitelist de protocoles de cette tâche exclut explicitement `file:` et
n’autorise que `http,https,tcp,tls,crypto`.

Le workspace incomplet se trouve sous
`data/video-library-media/.proto05-downloads/`. Une sortie n’est publiée
qu’après succès FFmpeg, validation FFprobe, hash et contrôle de collision. Le
fichier est ensuite déplacé atomiquement, puis le writer canonique ajoute la
source et le playable locaux au même asset. Un échec du writer supprime le
fichier final. Annulation, timeout, fermeture gracieuse et prochain démarrage
nettoient les temporaires de l’exécution.

### Interface

Le menu `Actions` affiche `Télécharger dans la Library` uniquement lorsqu’une
source HLS ou directe est éligible et qu’aucune copie locale n’existe. Le
panneau non modal présente le type, l’hôte, la variante, la durée, la taille
estimée, la destination, le nom du fichier et l’état FFmpeg avant confirmation.
Pendant l’exécution, il affiche état, pourcentage, temps média, taille écrite,
vitesse et annulation.

Après réussite, la carte est reprojetée sans rechargement. Le playable local
devient le défaut, l’aperçu local est immédiatement disponible et la
provenance distante reste visible. Le garde d’aperçu du renderer moderne a été
étendu au provider `local`, défaut révélé par la recette Chromium. Pour un
asset mixte, `Supprimer la copie locale` retire uniquement le fichier, sa
source locale et son playable ; l’asset et sa référence distante sont
conservés.

### Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/server/test/library-ffmpeg-download.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/fixtures/fake-ffmpeg.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-persistence.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-classification.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/remote-library-reference.test.js`
- `reports/112_proto05_library_ffmpeg_download.md`

Le test de persistance ne dépend plus du fichier réel absent
`video_37004_1080p.mp4` : il écrit une petite fixture dans le dossier temporaire
du serveur. Le test de classement compare désormais le nombre final d’assets à
son état initial au lieu de supposer un catalogue figé à 15 entrées.

## Vérifications

### Automatisation

- test ciblé Mission 112 : HLS importé par les vraies routes
  analyse/confirmation, relecture du catalogue, options, tâche FFmpeg,
  projection locale et aperçu ;
- URL directe, source canonique historique UGA, FFmpeg absent, configuration
  invalide, nom traversant, échec FFmpeg, sortie illisible, concurrence,
  annulation de l’arbre de processus, timeout, collision, arrêt/reprise et
  nettoyage ;
- suppression de la seule copie locale avec conservation de l’asset et de la
  référence distante ;
- invocation statiquement vérifiée avec `shell: false` ;
- suite complète `npm test` : **194 tests réussis, 0 échec** ;
- `npm run check` : réussi ;
- compilation des 10 scripts inline de `teacher-videos.html` avec `vm.Script` :
  réussie ;
- `git diff --check` : réussi (seuls les avertissements attendus de conversion
  LF vers CRLF sont affichés).

Toutes les écritures des tests utilisent des catalogues, dossiers média,
origines HTTP et exécutables FFmpeg/FFprobe temporaires contrôlés.

### Chromium réel sur données temporaires

La recette ciblée a été exécutée avec
`C:\Program Files\Google\Chrome\Application\chrome.exe` :

- menus Actions fermés par défaut ;
- action de téléchargement présente sur la carte HLS ;
- récapitulatif HLS, hôte, qualité 1280 × 720, destination et FFmpeg visibles ;
- lancement réel de la fixture FFmpeg, progression et état terminal à 100 % ;
- reprojection de la carte sans rechargement ;
- bouton Aperçu local présent et lecteur vidéo ouvert ;
- bascule liste puis grille préservée ;
- aucune erreur `error` ou `unhandledrejection` capturée.

### Vérification réelle sans téléchargement de 36971

Sur l’instance canonique 8891, la carte 36971 (`yop`) conserve sa référence
distante et propose l’action. L’analyse légère réelle a observé :

- HLS `videos.univ-grenoble-alpes.fr` ;
- variante choisie : **1920 × 1080** ;
- durée annoncée : **6 min 32 s** ;
- taille estimée : **112,6 Mio** ;
- nom proposé : `yop.mp4` ;
- destination : dossier géré de la Library Proto05 ;
- FFmpeg détecté :
  `2026-02-04-git-627da1111c-full_build-www.gyan.dev`.

Le panneau a été annulé avant lancement. La grille, la liste et la fermeture du
menu ont été vérifiées. La référence canonique 37004 a également produit des
options valides (1920 × 1080, durée 939217 ms) après l’extension du résolveur
historique UGA.

### Non vérifié et limites

- Le téléchargement intégral réel de 36971 n’a volontairement pas été lancé.
- Les erreurs physiques de disque plein ou de permission sont mappées et les
  rollbacks sont couverts par des échecs contrôlés ; aucun disque réel n’a été
  rempli ni rendu illisible.
- La validation fonctionnelle humaine de David reste à effectuer sur
  l’instance 8891.

## Validation humaine

Le téléchargement réel complet de 36971 reste soumis à la confirmation explicite
de David. L’interface lui présente maintenant avant lancement :

- qualité : 1920 × 1080 ;
- durée : 6 min 32 s ;
- estimation : 112,6 Mio ;
- nom : `yop.mp4` ;
- destination : dossier géré de la Library Proto05.

Une seule instance `0.1.35` est laissée sur 8891 pour cette validation. Le port
8791 reste libre.

## Message de commit proposé

`feat(proto05): download remote library videos with ffmpeg`

Aucun commit ni push n’a été effectué.
