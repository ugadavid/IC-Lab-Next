# Prototype 05 — rapport de réparation de la lecture HLS

Date : 2026-07-13  
Périmètre : `prototypes/05-augmented-ic-video-01` et routes/dépendances strictement nécessaires dans IC-Hub.

## Résultat

La lecture HLS fonctionne dans Chrome depuis `http://127.0.0.1:8790/demos/augmented-video/`.

Le prototype servi passe de `0.0.6` à `0.0.6.1`. IC-Hub conserve sa version `0.10.3` : aucune évolution fonctionnelle autre que le service local de hls.js, le proxy HLS fermé et le changement de fichier d’index n’a été introduite.

## Cause confirmée

La version `0.0.6` interprétait toute valeur non vide de `video.canPlayType("application/vnd.apple.mpegurl")` comme une capacité HLS native confirmée. Chrome retourne `maybe`, recevait directement le manifeste distant dans les deux branches et terminait avec `MEDIA_ERR_SRC_NOT_SUPPORTED`. La source UGA ne fournissait par ailleurs pas les en-têtes CORS requis pour une consommation directe par hls.js.

## Implémentation

### hls.js local

- dépendance de production épinglée : `hls.js@1.6.13` ;
- fichier servi localement par IC-Hub à `/vendor/hls.js/hls.min.js` ;
- aucune dépendance à un CDN ;
- hls.js utilisé en priorité lorsque `Hls.isSupported()` confirme les Media Source Extensions ;
- lecture HLS native conservée lorsque hls.js n’est pas supporté mais que le lecteur annonce le type HLS.

### Proxy HLS fermé

Route publique : `GET|HEAD /api/hls/uga-37004/<ressource>`.

Propriétés de sécurité :

- aucune URL distante n’est acceptée depuis le navigateur ;
- l’identifiant `uga-37004` résout côté serveur une unique origine HTTPS et un unique répertoire UGA ;
- liste blanche exacte des quatre manifestes et trois fichiers `.ts` utilisés par cette vidéo ;
- rejet des sources inconnues, chemins absolus, schémas d’URL, barres obliques inverses, octets nuls et segments `.`/`..` ;
- nouvelle validation de l’origine et du préfixe de chemin après résolution URL ;
- `redirect: "manual"` et refus de toute réponse amont `3xx` ;
- méthodes limitées à `GET` et `HEAD`.

Propriétés de transport :

- chemins relatifs des playlists inchangés ;
- relais des types MIME amont ;
- relais de `Range` et `If-Range` ;
- relais des statuts `206`, `Content-Range`, `Content-Length` et `Accept-Ranges` lorsqu’ils sont présents ;
- diffusion du corps amont par pipeline de streams, sans mise en mémoire du fichier de segments complet ;
- annulation de la requête amont lorsque le client se déconnecte.

### États et cycle de vie du lecteur

États visibles ajoutés : `Chargement`, `Prêt`, `Lecture`, `Attente`, `Erreur réseau`, `Format non supporté`.

Les événements hls.js fatals et non fatals ainsi que les événements vidéo `loadstart`, `loadedmetadata`, `canplay`, `playing`, `waiting`, `stalled` et `error` mettent à jour l’état. L’ancienne affirmation prématurée « flux chargé » a été supprimée.

La fonction de chargement détruit l’éventuelle instance hls.js avant toute nouvelle source. L’instance est aussi détruite sur erreur fatale et à `beforeunload`.

## Vérifications effectuées

### Statique et dépendances

- `npm install hls.js@1.6.13 --save-exact` : installation réussie ;
- `npm list hls.js --depth=0` : `hls.js@1.6.13` ;
- `npm run check` : `node --check server.js`, réussi ;
- parsing du script inline du prototype avec le moteur JavaScript Node : réussi ;
- `npm audit --omit=dev` : 0 vulnérabilité ;
- aucun script de build, typecheck ou test automatisé n’est défini dans le `package.json` d’IC-Hub.

### Serveur et routes

- démarrage d’IC-Hub sur le port `8790` : réussi ;
- `GET /api/health` : `200`, service `ic-hub-local` version `0.10.3` ;
- prototype 05 : `200 text/html`, version servie `0.0.6.1` ;
- portail `portal-0.10.3.html` : `200` ;
- démonstrateur `informaticaire` : `200` ;
- hls.js local : `200 text/javascript`, 541 012 octets ;
- manifeste maître : `200 application/vnd.apple.mpegurl`, 317 octets ;
- variante 360p : `200 application/vnd.apple.mpegurl`, 13 543 octets ;
- chemins relatifs `360p.m3u8`, `720p.m3u8`, `1080p.m3u8` préservés ;
- playlist 360p : directives `EXT-X-BYTERANGE` et chemin relatif `360p.ts` préservés ;
- `HEAD` du manifeste : `200`, `Accept-Ranges: bytes` et MIME HLS ;
- `POST` sur le proxy : `405`, `Allow: GET, HEAD` ;
- identifiant de source inconnu, ressource absente de la liste blanche, URL absolue encodée et traversée encodée : `404` ;
- un paramètre `?url=https://evil.example/...` est ignoré et ne modifie pas la destination fixe.

### Range et streaming

Requête `Range: bytes=0-1023` sur `360p.ts` :

- statut : `206 Partial Content` ;
- `Content-Range: bytes 0-1023/137020416` ;
- `Content-Length: 1024` ;
- `Content-Type: video/mp2t`.

### Chrome

- image vidéo visible et décodée ;
- dimensions décodées : `640 × 360` ;
- `readyState: 4` ;
- durée : `939.216740999997 s` ;
- source média hls.js : URL `blob:` locale ;
- lecture réelle : `currentTime` passé de `0` à `2.362636 s` ;
- état visible pendant la lecture : `Lecture` ;
- trois clics sur des segments de transcription : positions `32 s`, `118 s` et `186 s` ;
- curseur de timeline synchronisé à `0:32`, `1:58` et `3:06` ;
- segment et annotation actifs synchronisés avec chaque saut ;
- mode Focus : transcription et timeline masquées, puis restaurées ;
- aucune erreur CORS ;
- après rechargement final : aucune erreur ni aucun avertissement dans la console Chrome.

### Panne contrôlée

IC-Hub a été arrêté brièvement pendant la lecture, puis un saut hors du tampon a été effectué. Le lecteur est passé par `Attente` puis par `Erreur réseau` avec le message lisible :

> Impossible de charger le flux vidéo. Vérifiez la connexion à la source UGA puis réessayez.

Après relance d’IC-Hub et rechargement de la page, l’état est revenu à `Prêt`, avec une durée de `939.216740999997 s` et une image `640 × 360`.

### Git

- `git diff --check` : réussi.

## Fichiers modifiés

1. `prototypes/00-ic-hub/server/server.js`
2. `prototypes/00-ic-hub/server/package.json`
3. `prototypes/00-ic-hub/server/package-lock.json`
4. `prototypes/00-ic-hub/server/README.md`
5. `prototypes/05-augmented-ic-video-01/index-0.0.6.1.html` (nouveau)
6. `prototypes/05-augmented-ic-video-01/README.md`
7. `reports/005_prototype_05_hls_playback_repair_report.md` (ce rapport)

Les fichiers de données, Docker, `START_IC_LAB_NEXT.bat`, la transcription, la timeline pédagogique, les observations et les interfaces d’administration n’ont pas été modifiés.

## Limites restantes

- la lecture reste dépendante de la disponibilité et de la structure du flux UGA ;
- la liste blanche exacte doit être mise à jour si le manifeste UGA change de noms de ressources ;
- le repli HLS natif est implémenté selon le chemin standard recommandé, mais n’a pas été exécuté sur Safari dans cet environnement Windows ;
- après une erreur réseau fatale, la récupération passe actuellement par un rechargement de page ; aucun bouton de reconnexion n’a été ajouté afin de ne pas refondre l’interface ;
- les timestamps et la transcription restent les données V0 existantes, hors périmètre de cette mission.

## Message de commit proposé

`fix(prototype-05): restore HLS playback through IC-Hub proxy`
