# Mission 111 — Ajouter une référence vidéo distante depuis une URL

Date : 2026-07-24  
Prototype : `05-augmented-ic-video-01`  
Version obtenue : `0.1.34`

## Périmètre

La mission ajoute à la Library un parcours explicite d’analyse puis de création
d’une référence vidéo HTTP(S), sans téléchargement du média et sans FFmpeg.
Les formats couverts sont les vidéos directes et les manifestes HLS maître ou
média.

La référence 36971 créée par David pendant la recette humaine est une donnée
canonique légitime. Elle a été inspectée et préservée telle quelle : le
correctif ne la supprime pas, ne la recrée pas et ne migre aucun de ses champs.
Aucun média réel, aucune activité réelle et aucun launcher n’ont été modifiés
par le correctif.

## Diagnostic préalable

Le modèle canonique 1.0 acceptait déjà :

- `MediaSource.kind = direct-url | hls` ;
- `Playable.kind = direct-url | hls` ;
- des localisations distantes par `url` ou `manifestUrl`.

Le writer canonique existant est `persistLibraryMutation`, qui valide la
projection, écrit atomiquement `video-library.json` avec sauvegarde, puis met à
jour l’état en mémoire.

Le parcours réseau générique existant,
`POST /api/proto05/library/copy-direct`, n’était pas réutilisable tel quel :
il télécharge la vidéo entière dans `data/video-library-media`, calcule son hash
et crée un playable local. Il refuse en outre HLS.

Le player partagé chargeait hls.js uniquement pour le provider UGA. Une source
HLS distante avec le provider `direct` aurait donc été confiée à la lecture
native de Chromium, qui ne prend pas HLS en charge.

### Diagnostic du correctif après recette humaine

La référence réellement écrite pour 36971 est complète et cohérente :

- asset `media-proto05-remote-ref-03738b8065e1866b8e956819`, titre `yop`,
  actif, sans dossier ni tag, avec le playable HLS comme défaut ;
- source `kind: hls`, `provider: direct`, `transport: hls`, MIME
  `application/vnd.apple.mpegurl` ;
- playable `kind: hls`, `provider: direct`, disponibilité `unknown` ;
- `originUrl`, `sourceUrl`, `url` et `manifestUrl` conservent exactement
  l’URL UGA 36971 ;
- la projection serveur transmettait elle aussi cette URL distante exacte au
  navigateur.

La référence UGA 37004 suit le même modèle HLS, mais son playable
`provider: uga` expose `/api/hls/uga-37004/livestream.m3u8`, donc une URL de
lecture de même origine que la Library. 36971 exposait au contraire directement
`https://videos.univ-grenoble-alpes.fr/.../36971/livestream.m3u8`.

Les deux manifestes maîtres répondent HTTP 200 côté serveur et utilisent des
playlists variantes puis des segments relatifs. La réponse UGA ne fournit pas
`Access-Control-Allow-Origin`. Dans Chromium, le clic 36971 initialisait bien
hls.js et créait une URL `blob:`, mais restait à `readyState 0`, sans durée,
pendant que l’interface annonçait prématurément « Aperçu chargé ». Aucune erreur
n’était rendue car le player convertissait l’erreur fatale hls.js en événement
sans détail et `load()` se terminait avant `MANIFEST_PARSED`.

La cause est donc démontrée : ni la structure canonique, ni le type du playable,
ni l’URL conservée, ni la disponibilité ne sont erronés. L’échec venait du
chargement HLS cross-origin sans CORS, contrairement au chemin same-origin de
37004, aggravé par un cycle d’erreur asynchrone incomplet dans l’aperçu.

## Réalisation

### Analyse serveur sans écriture

`POST /api/proto05/library/remote-reference/analyze` :

- accepte uniquement HTTP(S) ;
- refuse les chemins locaux, identifiants intégrés, domaines locaux et adresses
  loopback, privées, link-local, documentaires ou réservées, en IPv4 et IPv6 ;
- résout le DNS avant la requête initiale et après chaque redirection ;
- suit au plus cinq redirections ;
- utilise HEAD puis GET borné lorsque nécessaire ;
- applique un timeout de 8 secondes et une lecture maximale de 256 Kio ;
- reconnaît une vidéo directe par son type MIME ;
- reconnaît et valide la structure `#EXTM3U` d’un HLS maître ou média ;
- refuse notamment HTML, HLS incomplet, authentification, timeout et erreur
  réseau ;
- renvoie uniquement un résumé structuré et un jeton temporaire, jamais la
  playlist, les en-têtes, cookies ou informations d’authentification ;
- ne modifie pas la Library.

### Confirmation canonique

`POST /api/proto05/library/remote-reference/confirm` :

- consomme une analyse serveur valable dix minutes ;
- refuse une confirmation concurrente du même jeton ;
- recontrôle les doublons sur URL initiale ou finale exacte ;
- conserve la query string ;
- crée un asset, une source et un playable via le writer canonique existant ;
- ne crée ni fichier, ni `storageKey`, ni proxy générique ;
- garde le jeton réutilisable après un échec d’écriture et ne publie aucun état
  partiel ;
- supprime le jeton après succès ou doublon.

### Interface et lecture

Le panneau « Ajouter une vidéo » comporte une action claire
« Ajouter depuis une URL » avec titre facultatif, URL obligatoire, analyse,
annulation, résumé (type, domaine, URL finale, format et avertissement distant)
et confirmation séparée.

L’annulation interrompt aussi une analyse navigateur en cours. Le bouton de
confirmation est protégé contre le double envoi. La carte apparaît
immédiatement après succès.

Le player partagé utilise désormais hls.js lorsque le playable est de type HLS
ou porte un `manifestUrl`, y compris avec le provider `direct`. Les références
distantes disposent de l’aperçu, des associations, du suivi d’usage et du retrait
logique existants. Sans fichier local, leur menu Actions ne propose aucune
suppression physique.

Pour les seuls playables canoniques `kind: hls` et `provider: direct`, la
projection remplace l’URL de lecture par une passerelle same-origin liée à
l’identifiant du playable. La source canonique et son URL distante restent
inchangées. La passerelle :

- refuse tout playable absent ou d’un autre type ;
- limite les ressources au répertoire distant du manifeste enregistré ;
- revalide l’URL, le DNS et chaque redirection avec les protections réseau
  existantes ;
- relaie le manifeste maître, les playlists et segments relatifs, les requêtes
  `Range` et les en-têtes média utiles ;
- n’est pas un proxy arbitraire et n’écrit aucune donnée.

Le chargement hls.js attend maintenant `MANIFEST_PARSED` avant d’annoncer le
succès. Une erreur fatale rejette le chargement avec son détail et son éventuel
statut HTTP. Un second clic ferme l’aperçu ; une nouvelle ouverture détruit
l’instance précédente avant d’en créer une autre.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/shared/ic-video-player.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/remote-library-reference.test.js`
- `reports/111_proto05_library_remote_url_import.md`

## Tests automatisés

La suite ciblée utilise uniquement des serveurs HTTP locaux et des copies
temporaires. Elle couvre :

- séparation analyse/confirmation et absence d’écriture avant confirmation ;
- HLS maître et média, y compris sans extension `.m3u8` ;
- vidéo directe, query string et fallback HEAD vers GET ;
- protocoles interdits, identifiants intégrés et SSRF IPv4/IPv6 ;
- redirection vers une adresse privée et excès de redirections ;
- HTML, HLS invalide ou trop volumineux, authentification, DNS, timeout et
  réseau indisponible ;
- jeton absent ou expiré, double confirmation ;
- échec du writer sans état partiel ;
- doublon par URL finale ;
- persistance canonique sans playlist, cookie ou en-tête ;
- association, usage, protection de suppression, retrait logique sans requête
  DELETE distante ;
- redémarrage du serveur temporaire puis relecture de la Library depuis le
  catalogue réellement écrit ;
- projection du nouveau playable vers sa passerelle liée au canonique ;
- récupération du manifeste maître, de la playlist variante relative et d’un
  segment relatif avec `Range`, sur une fixture réseau contrôlée ;
- initialisation de hls.js avec l’URL issue de cette projection, puis destruction
  de l’instance ;
- aperçu direct/HLS et présence de hls.js dans la page.

Résultats :

- `node --test --test-concurrency=1 test/remote-library-reference.test.js` :
  4/4 réussis ;
- suite ciblée corrective (référence/copie distante, import local, suppression,
  usage, visibilité) : 25/25 réussis ;
- suite ciblée Library (suppression, usage, copie distante et référence
  distante) : tous les contrôles fonctionnels réussissent après correction du
  test statique ;
- suite complète `npm test` : 184/185 réussis. L’unique échec est hors mission
  et préexistant : `library-persistence.test.js` attend
  `video_37004_1080p.mp4`, absent du répertoire
  `data/video-library-media` dès l’état initial. Aucun média canonique n’a été
  recréé ou modifié pour masquer ce défaut.

## Recette Chromium réelle

Une première recette a été exécutée sur une copie temporaire de la Library avec
un serveur HLS local contrôlé :

- ouverture et fermeture du panneau d’ajout ;
- annulation avec remise à zéro ;
- erreur SSRF visible ;
- analyse d’un HLS maître sans changement du compteur (15 avant, 15 après) ;
- résumé complet et confirmation explicitement séparée ;
- confirmation puis carte immédiate (16 assets) ;
- présence de l’aperçu et d’un élément vidéo ;
- grille et liste ;
- menu Actions fermé par défaut, ouvrable, sans suppression physique ;
- association temporaire à `MboloTest`, panneau `Utilisée · 1` et fermeture par
  Échap ;
- restauration de `MboloTest` vers son playable UGA initial ;
- retrait de la référence temporaire avec `deletedFile: false`, retour à
  15 assets et aucune requête DELETE envoyée au serveur distant ;
- aucune erreur console.

Après le correctif, la recette a été répétée dans la vraie Library, sans modifier
la donnée 36971 :

- la projection 36971 expose
  `/api/proto05/library/remote-hls/video-media-proto05-remote-ref-03738b8065e1866b8e956819/livestream.m3u8`
  à hls.js, tandis que la source conserve l’URL UGA exacte ;
- le manifeste maître répond 200, puis les playlists variantes et segments
  relatifs sont servis depuis le même répertoire distant ;
- 36971 atteint `readyState 4`, avec une durée de `391.816698` secondes, puis
  avance de `4.121909` secondes pendant la lecture ;
- la fermeture retire l’élément vidéo ; la réouverture crée une nouvelle URL
  `blob:`, atteint de nouveau `readyState 4` et retrouve la même durée ;
- 37004 atteint `readyState 4`, avec une durée de `939.216741` secondes, et
  avance de plus de 3 secondes en lecture ;
- le fichier local direct `Test_0` atteint `readyState 4`, avec une durée de
  `142.293604` secondes ;
- grille et liste fonctionnent ; le menu Actions est fermé par défaut puis
  ouvrable ; le formulaire d’import local est toujours présent et n’a pas été
  soumis ;
- aucune erreur console non traitée n’a été relevée.

La page est laissée en grille, filtrée sur `yop`, avec l’aperçu 36971 chargé pour
la vérification de David.

## Contrôles finaux

- `npm run check` : réussi avec la version `0.1.34` ;
- `git diff --check` : réussi ; seuls les avertissements informatifs de
  conversion LF vers CRLF de Git sous Windows sont présents ;
- branche `main`, HEAD `5737fac`, huit chemins modifiés ou non suivis, dont la
  référence canonique 36971 légitimement ajoutée par David et préservée ;
- une seule instance normale écoute sur `127.0.0.1:8891` (PID 41412), healthcheck
  `0.1.34` réussi ; aucune instance n’écoute sur 8791.

## Validation humaine

David a validé la prévisualisation de la référence 36971 ainsi que la fermeture
et la réouverture de son aperçu.

## Limites

La lecture reste dépendante de la disponibilité du serveur distant. La
passerelle corrective résout les chemins relatifs du manifeste dans son
répertoire distant ; elle n’élargit pas le périmètre à un proxy générique. Une
URL signée nécessaire à la lecture doit être conservée avec sa query string ;
elle n’est ni journalisée ni dupliquée ailleurs par ce parcours.

Le défaut préexistant de fixture média signalé par la suite complète demeure
hors périmètre.

## Message de commit proposé

`fix(proto05): preview imported remote HLS references`

Aucun commit ni push n’a été effectué.
