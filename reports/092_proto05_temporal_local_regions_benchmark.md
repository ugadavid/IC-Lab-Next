# Mission 092 — Proto05 : benchmark par étapes et régions locales

Date : 2026-07-23

## Périmètre et entrée

Les mesures portent uniquement sur l’extrait temporaire de 60 secondes issu de la préparation UGA :

```text
C:\Users\david\AppData\Local\Temp\proto05-hls-preparations\hls-prep-1784838518025-52f69919-HBU5pr\work.mp4
```

Entrée : 640×360, 60 fps, audio AAC, durée source 939,24 s. Aucun fichier Library ou activité canonique n’a été modifié. Aucune dérivation complète n’a été lancée.

Les masques de comparaison sont ceux de la mission 091 :

- étape 1 : 0–28,177 s, masque `(x=0, y=0, w=0,2, h=0,2)` ;
- étape 2 : 28,177–60 s, masque précédent conservé et second masque `(x=0,55, y=0,1, w=0,2, h=0,2)`.

## Pourquoi une étape semblait beaucoup plus rapide

Le serveur n’empruntait pas un algorithme d’encodage différent : il appelait la même dérivation temporelle, mais une seule collection active produisait une seule région dans le graphe. Avec deux étapes, la conversion historique `temporalStepsToMasks` conservait les masques et créait des images-clés ; `ffmpegTemporalBlurFilter` évaluait alors deux fenêtres spatiales et temporelles sur chaque pixel de chaque image.

Le modèle d’atelier décrit des collections par étapes : une étape commence à son temps, sa collection reste active jusqu’à la suivante, puis la collection suivante la remplace. L’ancien chemin dérivé introduisait en plus une interpolation entre images-clés. Le nouveau chemin local utilise directement les collections d’étapes et applique la sémantique de remplacement attendue ; il ne déduit aucune position intermédiaire pendant la lecture.

## Benchmarks A–C

Les trois commandes ont utilisé `libx264`, preset `veryfast`, CRF 23, `-c:a copy`, et le même extrait de 60 secondes.

| Cas | Temps | Vitesse finale | Sortie | Observations |
|---|---:|---:|---:|---|
| A — encodage seul | 1,054 s | 84,9× | 1 995 336 octets | aucun filtre |
| B — une étape / une région | 21,872 s | 2,75× | 1 989 782 octets | un `boxblur` et un `blend` plein écran |
| C — deux étapes / graphe regroupé | 41,127 s | 1,46× | 1 991 721 octets | un flou plein écran, expression union pixel par pixel |

A, B et C produisent 3 599 images vidéo et une durée conteneur de 60,010667 s, avec 640×360 à 60 fps. Les journaux et sorties exacts sont dans :

```text
C:\Users\david\AppData\Local\Temp\proto05-mission092\A-encode-only.mp4
C:\Users\david\AppData\Local\Temp\proto05-mission092\A-encode-only.log
C:\Users\david\AppData\Local\Temp\proto05-mission092\B-one-step.mp4
C:\Users\david\AppData\Local\Temp\proto05-mission092\B-one-step.log
C:\Users\david\AppData\Local\Temp\proto05-mission092\C-two-steps-grouped.mp4
C:\Users\david\AppData\Local\Temp\proto05-mission092\C-two-steps-grouped.log
```

Les commandes exactes suivent le même squelette :

```text
ffmpeg -hide_banner -y -i work.mp4 -t 60 -filter_complex <graphe> -map [outv] -map 0:a? -c:v libx264 -preset veryfast -crf 23 -c:a copy -movflags +faststart sortie.mp4
```

A remplace `-filter_complex <graphe> -map [outv]` par `-map 0:v:0`. Le graphe C est celui de la mission 091 : un `split=2`, un `boxblur` plein écran, puis un `blend` dont la condition est la somme des deux régions. Le coût du filtre est donc la différence entre A et B/C ; le passage de B à C montre le coût supplémentaire de la seconde région temporelle.

Une mesure CPU/GPU instrumentée au niveau matériel n’a pas été activée pendant ces essais courts. Le chemin est CPU-only : `libx264` logiciel et aucun `nvenc`/OpenCL ; FFmpeg détecte les capacités CPU x264 dans ses journaux. Les vitesses et temps ci-dessus constituent la mesure reproductible principale, mais pas un pourcentage d’occupation CPU système. Aucune carte GPU n’est sollicitée.

## Prototype D : régions locales par intervalle

Chaque étape est encodée sans audio, avec des paramètres vidéo identiques. Pour chaque masque, le filtre applique :

```text
split → crop élargi de 2 × marge → boxblur local → overlay à la position d’origine
```

La marge est `max(4, 2 × lumaRadius)` pixels et le crop est borné à l’image. Les deux segments utilisés sont de 1 691 et 1 909 images, soit 3 600 images au total :

```text
ffmpeg -hide_banner -y -i work.mp4 -ss 0 -frames:v 1691 -filter_complex <région étape 1> -map [outv] -an -c:v libx264 -preset veryfast -crf 23 -fps_mode cfr -video_track_timescale 90000 segment-001.mp4
ffmpeg -hide_banner -y -i work.mp4 -ss 28.177 -frames:v 1909 -filter_complex <régions étape 2> -map [outv] -an -c:v libx264 -preset veryfast -crf 23 -fps_mode cfr -video_track_timescale 90000 segment-002.mp4
```

Assemblage sans nouvel encodage vidéo :

```text
ffmpeg -hide_banner -y -f concat -safe 0 -i segments.txt -c:v copy -an video-concat.mp4
ffmpeg -hide_banner -y -i video-concat.mp4 -i work.mp4 -map 0:v:0 -map 1:a:0? -c:v copy -c:a copy -shortest -movflags +faststart D2-final.mp4
```

Résultats séquentiels :

- génération des deux segments : 1,125 s ; vitesses finales environ 82× et 49,5× ;
- concaténation : 0,090 s ;
- remux audio : 0,054 s ;
- total : environ 1,269 s, hors préparation temporaire.

Avec deux segments simultanés : 1,185 s pour la génération. Le parallélisme est donc légèrement plus lent sur cette machine et n’est pas retenu par défaut.

Sorties et journaux D :

```text
C:\Users\david\AppData\Local\Temp\proto05-mission092\D2-final.mp4
C:\Users\david\AppData\Local\Temp\proto05-mission092\D2-segment-1.log
C:\Users\david\AppData\Local\Temp\proto05-mission092\D2-segment-2.log
C:\Users\david\AppData\Local\Temp\proto05-mission092\D2-concat.log
C:\Users\david\AppData\Local\Temp\proto05-mission092\D2-remux.log
```

Le fichier D final contient 3 600 images, dure exactement 60,000 s, reste en 640×360 à 60 fps et conserve l’audio AAC par copie. L’assemblage ne réencode pas la vidéo.

## Contrôles visuels et temporels

Des images ont été extraites avant, à et après 28,177 s, ainsi qu’à 40 s :

```text
C:\Users\david\AppData\Local\Temp\proto05-mission092\frames092
```

Les zones extérieures restent inchangées visuellement ; les deux zones actives sont floutées dans la seconde étape ; la transition est alignée sur le raccord de segments. Le crop local est élargi pour éviter de couper le voisinage nécessaire au flou. Une comparaison globale C/D donne SSIM All `0.985478`. Elle confirme une forte proximité, mais pas une égalité pixel à pixel : le profil local modifie nécessairement la bordure du flou par rapport au flou plein écran. La différence est visible uniquement autour des bords des régions, pas dans la logique de sélection des zones.

## Intégration

La dérivation temporelle simple utilise désormais, pour les jobs à étapes :

- un segment vidéo local par étape ;
- les collections de masques de l’étape sans interpolation implicite ;
- une concaténation vidéo par copie ;
- un remux audio unique, avec copie AAC et repli AAC ;
- l’instrumentation FFmpeg de la mission 090, étendue à `ffmpeg.commands` pour conserver chaque commande, étape, PID, début/fin et code de sortie.

La génération reste séquentielle. Les fichiers intermédiaires restent temporaires et la structure prépare un futur cache par source, intervalle, collection et paramètres d’encodage.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/server.js` : filtre local, découpage par étapes, concaténation, remux audio, instrumentation multi-commandes.
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js` : contrôles ciblés du graphe local, concaténation et instrumentation.

## Vérifications

- `npm.cmd run check` : OK.
- `node --test test/hls-preparation.test.js` : 8 tests réussis.
- benchmarks A, B, C et D sur extrait temporaire : terminés.
- contrôle FFprobe des codecs, cadence, résolution, nombre d’images et durée : OK.
- contrôle visuel des raccords et transitions : OK.
- serveur redémarré avec le code modifié : `/api/health` répond `200`, version réellement servie `0.1.29`.
- aucune dérivation complète lancée, aucun GPU activé, aucune activité canonique modifiée.

## Limites

Le benchmark D couvre deux étapes et deux masques. Le profil de flou est unique pour un job ; plusieurs profils nécessiteront un groupe local par profil. La différence de bord observée entre flou plein écran et flou local doit être validée par David avant d’utiliser ce pipeline pour des dérivations longues. Le pourcentage d’occupation CPU système n’a pas été échantillonné par un compteur matériel pendant les runs.

Version applicative : inchangée (`0.1.29` réellement servie ; package serveur `0.1.30`).

État Git : modifications locales conservées, aucun commit et aucun push.

Message de commit proposé, non créé : `proto05: derive temporal steps with local regions`.
