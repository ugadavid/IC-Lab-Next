# Mission 113 — Espaces de travail vidéo et lignée des dérivations

## Périmètre

La mission réoriente les copies locales issues de FFmpeg vers des espaces de
travail temporaires par asset, distingue les accès selon leur rôle métier et
prépare plusieurs tentatives d’anonymisation sur une seule fiche Library.

Version de départ : `0.1.35`.

## Diagnostic préalable et décision de modèle

### État réel de 36971

Le commit de la mission 112 contenait, pour l’asset
`media-proto05-remote-ref-03738b8065e1866b8e956819`, une copie locale
`47a3e7cf005c9fdc-36971_GT01_RFC7.mp4` sous
`data/video-library-media/`. Sa finalisation avait ajouté une source et un
playable locaux au même asset, puis promu ce playable via
`asset.defaultPlayableId = playableId`.

Dans l’état de travail remis par David au début de cette mission, cet
enregistrement local a été retiré du document canonique et le fichier physique
n’existe plus. L’asset conserve sa source HLS distante et celle-ci est de
nouveau son playable par défaut. Les quatre fichiers encore présents sous
`video-library-media/` ne correspondent ni à cet enregistrement ni à son
empreinte. Cette situation correspond à une suppression légitime postérieure
au commit 112 ; elle est préservée. Aucun fichier 36971 ne sera fabriqué,
retéléchargé ou migré.

### Cause du cadrage « hébergement local »

La mission 112 écrivait toutes ses sorties sous `video-library-media/`, chemin
historique utilisé par la route de lecture locale. La finalisation du
téléchargement remplaçait ensuite systématiquement le playable par défaut par
la copie locale. La projection regroupait tout playable local sous
`localCopies`, sans rôle métier, et l’interface affichait « Copie locale
disponible · lecture par défaut ». Localité, disponibilité et accès principal
étaient donc confondus.

### Structures de dérivation déjà présentes

Le contrat canonique possède déjà la collection `treatments`. Elle conserve
l’asset et le playable sources, les paramètres/recettes, l’état, la
progression, les dates, l’erreur, le moteur FFmpeg, les diagnostics et le
playable de sortie. L’atelier conserve déjà les masques fixes, masques
temporels, images-clés, interpolation et arguments FFmpeg dans ces paramètres
et provenances. Cette structure est étendue ; aucune seconde collection
canonique parallèle n’est créée.

### Modèle retenu avant implémentation

- `source.role` et `playable.role` portent explicitement l’un des rôles
  `original-remote`, `working-copy`, `derivation-local` ou
  `published-remote`.
- Une valeur projetée `legacy-unknown` rend explicite l’absence de rôle dans
  les données historiques. Elle préserve leurs comportements et associations
  sans requalifier arbitrairement toute URL distante.
- Les nouveaux imports distants sont des `original-remote`. Une future version
  publiée devra être ajoutée explicitement comme `published-remote`.
- Une copie FFmpeg est un `working-copy`, reste sur le même asset et ne modifie
  ni `defaultPlayableId` ni une activité.
- Une tentative de dérivation est un `treatment` canonique stable. Son
  `derivationId` est son identifiant ; son libellé, sa recette, son état, sa
  tentative retenue et sa relation de publication sont des champs explicites.
  Un résultat réussi est un playable `derivation-local` du même asset.
- `Playable.location` reste l’unique vérité canonique de l’emplacement. Les
  nouveaux fichiers portent `storageScope: "workspace"` et une `storageKey`
  relative à l’espace de l’asset. Les anciens playables sans portée continuent
  d’être résolus sous `video-library-media/`.
- La structure physique est
  `data/video-library-workspaces/<asset-id>/source/`,
  `derived/<derivation-id>/` et `temp/`. Tous les composants sont générés ou
  validés côté serveur et les résolutions restent bornées à leur racine.
- L’éligibilité activité est contextuelle : `working-copy` et
  `derivation-local` ne sont jamais proposées comme accès finaux ;
  `published-remote` l’est explicitement. Les accès historiques conservent la
  compatibilité existante et aucune association persistée n’est réécrite.
- L’aperçu, les usages et la suppression restent attachés aux identifiants
  canoniques. Supprimer une copie de travail préserve l’original et est bloqué
  par une dérivation active. Supprimer une dérivation cible son identifiant et
  son seul sous-dossier, avec sauvegarde et rollback du fichier si le writer
  échoue.

## Implémentation

### Stockage et copies de travail

- Les sorties de la plomberie FFmpeg 112 sont désormais finalisées sous
  `data/video-library-workspaces/<asset-id>/source/`.
- Les artefacts incomplets sont créés sous
  `data/video-library-workspaces/<asset-id>/temp/`. Le statut terminal n’est
  publié qu’après leur nettoyage.
- Au démarrage, le serveur nettoie seulement les `temp/` des assets canoniques.
  Il ne touche ni à `source/` ni à `derived/`.
- Les nouveaux source/playable portent `role: "working-copy"` et
  `location.storageScope: "workspace"`.
- Le playable distant reste le `defaultPlayableId`. Aucune activité n’est
  modifiée.
- La suppression de la copie utilise sa portée canonique, conserve les accès
  distants et est refusée lorsqu’une dérivation active en dépend.

### Dérivations sur une seule fiche

- La finalisation d’anonymisation ne crée plus un asset autonome. Elle ajoute
  au même asset une source/playable `derivation-local` et un `treatment`.
- Le `treatment.id`, également exposé comme `derivationId`, est stable et
  possède libellé, dates, état, entrée, recette, sortie, erreur structurée,
  indicateur `retained` et relation `publishedPlayableId`.
- Chaque sortie est rangée sous
  `video-library-workspaces/<asset-id>/derived/<derivation-id>/`.
- Plusieurs traitements coexistent sans écrasement.
- La suppression canonique cible un `derivationId`, valide la destination,
  préserve les autres tentatives, la source de travail et les publications,
  et restaure le fichier si le writer échoue.
- Une copie `working-copy` est acceptée comme entrée réelle de la préparation
  d’anonymisation. La compatibilité de la préparation HLS historique est
  conservée.

### Références publiées

- L’analyse distante et les protections réseau de la mission 111 sont
  réutilisées.
- Après confirmation, une URL publiée peut être ajoutée comme
  source/playable `published-remote` à l’asset existant, sans nouvelle carte et
  sans changer son accès par défaut.
- Une publication peut porter une relation vers un `treatment` de la même
  fiche. Le schéma contrôle l’existence, l’asset et le rôle du playable publié.
- L’interface permet l’ajout confirmé, l’aperçu puis l’association explicite
  d’une version publiée à une activité.

### Interface

Chaque carte possède une section « Versions et accès » avec :

- Originale distante ;
- Copie locale de travail ;
- Dérivations locales ;
- Versions publiées ;
- un groupe séparé « Accès historiques non qualifiés » seulement lorsque le
  rôle manque réellement.

Les actions sont conditionnelles :

- aperçu et création de copie sur l’originale ;
- aperçu, ouverture de l’atelier et suppression sur la copie de travail ;
- aperçu, récupération sur le disque et suppression ciblée sur une dérivation ;
- aperçu et association explicite sur une publication.

Les libellés de la mission 112 ont été remplacés par « Créer une copie locale
de travail ». Le dialogue précise son rôle temporaire, l’anonymisation, la
non-publication et l’absence de remplacement automatique dans les activités.

### Donnée réelle 36971

La copie enregistrée dans le commit 112 sous
`data/video-library-media/47a3e7cf005c9fdc-36971_GT01_RFC7.mp4` avait déjà été
supprimée par David avant la mission 113. Son enregistrement canonique était
également absent. Aucun déplacement, fichier ou redownload n’a donc été
effectué.

La mission fournit en revanche la preuve métier que l’URL UGA 36971 est
l’originale institutionnelle. Le writer canonique a ajouté uniquement
`role: "original-remote"` à son source et son playable exacts. L’URL HLS, le
titre, le dossier, les tags, les usages et le playable par défaut sont
préservés. Les autres accès historiques ne sont pas requalifiés.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/video-workspaces.js`
- `prototypes/05-augmented-ic-video-01/server/media-library-schema.js`
- `prototypes/05-augmented-ic-video-01/server/media-library-runtime.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-ffmpeg-download.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/data/video-library.json`
- `reports/113_proto05_video_workspaces_and_derivation_lineage.md`

## Vérifications

- Tests ciblés `library-ffmpeg-download.test.js` et
  `video-workspaces.test.js` : 13/13 réussis.
- Tests d’anonymisation réels `hls-preparation.test.js` : 8/8 réussis.
- Suite complète `npm test` : 199 tests réussis, 0 échec.
- `npm run check` : réussi.
- `git diff --check` : réussi ; seuls les avertissements de conversion de fins
  de ligne Windows sont émis.
- Ports après remise : une instance sur 8891 ; 8791 libre.

### Recette Chromium réelle

Sur `http://127.0.0.1:8891/teacher/videos` :

- vues grille et liste rendues ;
- menus Actions fermés par défaut et refermés par Échap ;
- carte 36971 classée « Originale distante » ;
- absence de copie de travail et de dérivation affichée sans donnée fictive ;
- action « Créer une copie locale de travail » présente uniquement dans
  Actions ;
- dialogue vérifié avec HLS, hôte UGA, 1920 × 1080, durée 6:32, estimation
  112,6 Mio et destination « Espace de travail de yop » ;
- aucun téléchargement réel déclenché ;
- aperçu HLS 36971 chargé via hls.js, durée 391,816 s, `readyState=4`, aucune
  erreur média ;
- aucune erreur console ;
- filtre réinitialisé et grille complète restaurée avant remise.

Les créations, dérivations et suppressions répétitives ont été effectuées
uniquement sur des serveurs et espaces temporaires de test.

## Limites et suites possibles

- Les anciennes cartes de dérivations autonomes sont conservées comme données
  historiques `legacy-unknown`; elles ne sont pas fusionnées silencieusement.
- Le renommage d’une tentative et la reprise directe de ses réglages ne sont
  pas proposés : aucun writer/contrat produit existant ne garantit encore ces
  opérations.
- Le choix de la tentative `retained` est modélisé mais ne possède pas encore
  de commande UI dédiée.
- Aucune dérivation réelle n’a été lancée sur 36971.

Version obtenue : `0.1.36`.

Message de commit proposé :

`feat(proto05): structure video workspaces and derivation lineage`

## État Git final

- Branche : `main`, en avance de 24 commits locaux sur `origin/main`.
- 10 fichiers suivis modifiés et 3 nouveaux fichiers non suivis, tous listés
  dans la section « Fichiers concernés ».
- Le diff de `video-library.json` inclut l’état utilisateur trouvé au départ :
  la copie locale 36971 et son enregistrement canonique avaient déjà été
  retirés. La mission ne les a ni recréés ni restaurés.
- Aucun commit et aucun push effectués.

## Validation humaine

À effectuer par David après remise d’une instance unique sur le port 8891.
