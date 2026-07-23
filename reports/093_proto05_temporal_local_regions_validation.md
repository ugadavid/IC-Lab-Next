# Mission 093 — Proto05 : validation des régions locales et des raccords

Date : 2026-07-23  
Périmètre : `prototypes/05-augmented-ic-video-01` uniquement

## Résultat

L’architecture locale de la mission 092 est conservée. La vérification lossless
confirme que le crop élargi sert uniquement de contexte au `boxblur`, puis que
le résultat est recadré aux dimensions exactes du masque avant l’overlay.

La recette Chromium a également produit un dérivé complet dans la même session,
mais elle a révélé une perte de cinq images au remux final. La cause était
`-shortest`, qui arrêtait la sortie sur la durée audio légèrement plus courte
que la vidéo segmentée. Cette cause est corrigée ; un second run complet
Chromium après cette correction reste à effectuer.

## Graphe et raccords

Pour une vidéo 640×360 et un masque `(x=0, y=0, width=0,2, height=0,2)`, le
graphe réellement exécuté est de la forme :

```text
[0:v]split=2[base][source0];
[source0]crop=x='0':y='0':w='136':h='80',boxblur=luma_radius=2:luma_power=1[expanded0];
[expanded0]crop=x='0':y='0':w='128':h='72'[blurred0];
[base][blurred0]overlay=x='0':y='0':eof_action=pass[outv]
```

Les 4 pixels de marge sont donc consommés par le flou, mais seuls les 128×72
pixels du second crop sont injectés dans l’overlay. Les diagnostics `framemd5`
lossless ont comparé des zones extérieures aux masques et des bandes
adjacentes à leurs quatre côtés : 3 600 images comparées, zéro différence dans
les zones extérieures et aux bordures testées. La différence visible observée
sur les sorties encodées ne peut donc pas être attribuée à un débordement du
rectangle ; elle relève de l’encodage segmenté/libx264 ou des timestamps.

La partition de référence utilise `ceil(t × fps)` et assigne chaque intervalle
à une seule étape. Les benchmarks A–C de la mission 092 affichaient 3 599
images car `-t 60` arrêtait le décodage sur les timestamps de la source, dont
la vidéo commence à `start_time=0,021 s`. La variante D comptait explicitement
les images de la fenêtre et en conservait 3 600. La correction ajoute le nombre
d’images source à la sonde FFprobe et borne la dernière étape à cette valeur,
afin de ne pas demander d’images inexistantes.

## Recette Chromium complète observée

Dans une même session Chromium :

- préparation HLS : `hls-prep-1784841412133-0e2d9405` ;
- deux étapes créées : `0–15422 ms`, puis `15422–939238 ms` ;
- dérivation : `hls-temporal-derivation-1784841493529-3791176b` ;
- progression visible jusqu’à l’état terminal `completed` ;
- asset dérivé : `media-proto05-anonymized-86883fdff00c654a5c29ea75` ;
- SHA-256 : `86883fdff00c654a5c29ea75495f6cf4afc481adec64ca84f8fb7643fff04c3c` ;
- taille : 29 275 705 octets ;
- temps serveur : `21:18:13.529Z` → `21:18:29.411Z` pour le job, environ 15,9 s ;
- concaténation : `-c:v copy` ;
- remux audio : `-c:a copy`.

Le fichier MP4 a été créé et référencé par la Library. FFprobe a toutefois
mesuré 56 348 images vidéo, 939,133333 s de vidéo et 939,178667 s de fichier,
alors que les logs de concat indiquaient 56 353 images. L’écart de cinq images
est précisément le symptôme du `-shortest` supprimé dans la correction.

La lecture du fichier dérivé a été vérifiée par sa disponibilité dans la
Library et son endpoint média pendant la recette. La lecture complète après la
correction n’est pas déclarée validée : elle nécessite un nouveau run complet
dans Chromium.

## Commandes FFmpeg observées

Chaque étape locale encode une seule fois, sans audio :

```text
ffmpeg -hide_banner -y -i <work.mp4> -ss <seek> -frames:v <frames> -filter_complex <graphe-local> -map [outv] -an -c:v libx264 -preset veryfast -crf 23 -fps_mode passthrough -video_track_timescale 90000 <segment.mp4>
```

L’assemblage est :

```text
ffmpeg -hide_banner -y -f concat -safe 0 -i <segments.txt> -c:v copy -an <video-concat.mp4>
```

Le remux corrigé est désormais :

```text
ffmpeg -hide_banner -y -i <video-concat.mp4> -i <work.mp4> -map 0:v:0 -map 1:a? -c:v copy -c:a copy -movflags +faststart <derived.mp4>
```

`-shortest` n’est plus utilisé : la vidéo segmentée conserve ainsi toutes ses
images, sans second encodage vidéo.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/server.js`
  - crop exact après flou ;
  - partition bornée au nombre d’images source ;
  - remux sans `-shortest` ;
  - instrumentation FFmpeg conservée.
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`
  - contrôles du chemin local, de `nb_frames` et de l’absence de `-shortest`.
- ce rapport.

La Library contient l’asset dérivé produit pendant la recette ; aucune activité
canonique n’a été modifiée. Les autres modifications présentes dans Git sont
antérieures ou parallèles à cette mission et ont été conservées.

## Vérifications

- `npm run check` : réussi (`node --check server.js`) ;
- `node --test test/hls-preparation.test.js` : 8/8 réussis ;
- diagnostics lossless des bordures et zones extérieures : réussis ;
- recette Chromium du lancement et de la fin du job : réussie avant la
  correction du remux ;
- serveur redémarré et version servie vérifiée : `0.1.29` ; package serveur :
  `0.1.30` ;
- `git diff --check` : aucune erreur de whitespace.

## Limites restantes

- un second run complet de 939,238 s doit confirmer dans la même session
  Chromium le nombre final d’images, la durée, l’audio et la lecture après la
  correction du remux ;
- la comparaison visuelle exhaustive de chaque transition et l’écoute complète
  de l’audio restent à faire après ce run ;
- aucune optimisation GPU ni parallélisme n’a été ajouté.

Version applicative : inchangée côté serveur servi (`0.1.29`) ; le package
serveur reste `0.1.30`. Aucun commit ni push.

Message de commit proposé : `fix(proto05): preserve temporal local-region frames at remux`
