# Mission 091 — Proto05 : benchmark et optimisation du graphe FFmpeg temporel

Date : 2026-07-23

## Périmètre

Le travail reste limité à la génération du graphe FFmpeg de l’atelier simple. Aucune activité canonique, aucune interface d’étapes, aucun modèle de masques et aucun atelier avancé n’ont été modifiés. Aucune dérivation complète de 939,238 secondes n’a été lancée.

## Cause mesurée

Le graphe précédent enchaînait, pour chaque masque, un `split` plein écran, un `boxblur` plein écran puis un `blend` vers le composite suivant. Avec deux masques de même profil, il produisait donc deux flous plein écran et deux compositions successives. Le coût augmentait linéairement avec le nombre de masques, avant même l’encodage logiciel `libx264`.

La préparation temporaire UGA utilisée pour les deux mesures est :

```text
C:\Users\david\AppData\Local\Temp\proto05-hls-preparations\hls-prep-1784838518025-52f69919-HBU5pr\work.mp4
```

Elle mesure 640×360, 60 fps, avec audio AAC, et sa durée est de 939,24 s. Elle provient d’une préparation temporaire HLS ; aucune écriture dans la Library n’a été effectuée.

## Benchmark sur extrait de 60 secondes

Les deux exécutions ont utilisé exactement le même extrait, les mêmes deux masques et les mêmes paramètres vidéo : `libx264`, preset `veryfast`, CRF 23, 640×360, 60 fps. Pour rendre la comparaison strictement comparable, l’audio a été réencodé en AAC dans les deux commandes de benchmark. Le serveur utilise désormais `-c:a copy` quand FFprobe confirme un audio AAC compatible, avec repli AAC sinon.

| Mesure | Graphe précédent | Graphe regroupé |
|---|---:|---:|
| Temps réel | 57,578 s | 41,359 s |
| Vitesse finale | 1,04× | 1,45× |
| Images finales | 3 599 | 3 599 |
| Durée | 60,000 s | 60,000 s |
| Résolution / cadence | 640×360 / 60 fps | 640×360 / 60 fps |
| Taille MP4 | 2 200 590 octets | 2 204 489 octets |
| GPU | non utilisé | non utilisé |

Le gain mesuré est d’environ 28,2 % sur le temps de traitement et l’extrapolation indicative à 939,238 s passe d’environ 901,3 s à environ 647,4 s. Cette extrapolation reste indicative : le coût réel dépend de la machine et du contenu.

Le chemin de sortie et les journaux temporaires sont :

```text
C:\Users\david\AppData\Local\Temp\proto05-mission091\old-60s.mp4
C:\Users\david\AppData\Local\Temp\proto05-mission091\old-60s.log
C:\Users\david\AppData\Local\Temp\proto05-mission091\new-60s.mp4
C:\Users\david\AppData\Local\Temp\proto05-mission091\new-60s.log
```

Le chemin de préparation et ces sorties sont temporaires. Ils ne constituent pas une donnée Proto05 persistante.

## Graphe retenu

Ancien graphe, pour deux masques :

```text
[0:v]split=2[base0][blur0];[blur0]boxblur...[blur0b];[base0][blur0b]blend=if(region0,B,A)[composite0];[composite0]split=2[base1][blur1];[blur1]boxblur...[blur1b];[base1][blur1b]blend=if(region1,B,A)[outv]
```

Nouveau graphe :

```text
[0:v]split=2[temporalBase][temporalBlur];[temporalBlur]boxblur=luma_radius=2:luma_power=1[temporalBlurred];[temporalBase][temporalBlurred]blend=all_expr='if((region0)+(region1),B,A)'[outv]
```

Chaque `regionN` conserve ses bornes spatiales, ses interpolations et sa fenêtre temporelle. La somme des conditions vaut zéro hors des masques et une valeur non nulle dans l’union des zones ; une seule image floutée est donc composée avec l’original pour tous les masques partageant le profil du job. Les intersections restent floutées une seule fois, ce qui est sémantiquement équivalent lorsque le profil est identique.

Le serveur sélectionne maintenant `-c:a copy` si le flux audio d’entrée est AAC, sinon `-c:a aac`. La commande et la métadonnée `audioCodec` restent exposées par l’instrumentation de la mission 090.

## Contrôles de rendu et de synchronisation

Des images ont été extraites dans :

```text
C:\Users\david\AppData\Local\Temp\proto05-mission091\frames
```

Points contrôlés : 27,5 s avant la transition, 28,177 s à la transition, 28,5 s après la transition et 40 s dans la seconde étape. Le rendu observé est cohérent entre les deux sorties : la première zone apparaît puis la seconde prend le relais à la frontière, les zones hors masque restent inchangées et les deux zones sont traitées simultanément lorsque la seconde étape est active. Les deux sorties conservent 60 s, 640×360, 60 fps et l’audio synchronisé.

Une comparaison globale des encodages donne SSIM `All: 0.996443`. Cette valeur n’est pas une identité binaire — les deux encodages ont été réalisés séparément — mais elle est compatible avec la conservation visuelle observée. Aucun GPU n’a été utilisé ; le traitement est volontairement resté en `libx264` logiciel.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/server.js` : graphe temporel regroupé ; détection FFprobe de l’audio AAC et copie audio avec repli AAC.
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js` : test ciblé vérifiant l’absence d’un flou plein écran par masque et la conservation de l’instrumentation.

## Vérifications

- `npm.cmd run check` : OK.
- `node --test test/hls-preparation.test.js` : 7 tests réussis.
- benchmark FFmpeg ancien/nouveau sur le même extrait de 60 s : terminé.
- contrôle FFprobe des deux sorties : OK.
- contrôle visuel des transitions et zones : OK sur les images extraites.
- serveur Proto05 redémarré avec le code modifié : `/api/health` répond `200`, version réellement servie `0.1.29`.
- aucune dérivation complète lancée ; aucune activité canonique modifiée.

## Limites et validation attendue

Le benchmark porte sur deux masques partageant un profil de flou, conformément au cas demandé. La généralisation à plusieurs profils distincts nécessitera un groupe de composition par profil. La dérivation complète de 939,238 s n’est pas lancée : les deux commandes, journaux, mesures et résultats sont présentés ici pour validation de David avant toute exécution longue.

Version applicative : inchangée (`0.1.29` réellement servie ; package serveur `0.1.30`).

État Git : modifications locales conservées, aucun commit et aucun push.

Message de commit proposé, non créé : `proto05: group temporal blur composition`.
