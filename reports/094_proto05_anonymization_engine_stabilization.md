# Mission 094 — Stabilisation du moteur d’anonymisation autonome Proto05

Date : 2026-07-24  
Périmètre : `prototypes/05-augmented-ic-video-01` uniquement

## État observé

Le moteur réel est celui introduit par les missions 088–093 : étapes temporelles,
collections de masques, encodage local par intervalles, concaténation vidéo sans
réencodage puis remux audio. La version servie après redémarrage est `0.1.29` ;
le package serveur reste `0.1.30`.

Le rapport 093 avait identifié une perte de cinq images au remux avec
`-shortest`. La correction de cette mission conserve l’absence de `-shortest`
et ajoute les contrôles d’entrée et de nettoyage décrits ci-dessous.

## Corrections réalisées

- les étapes reçues dans le désordre sont triées par `startMs` ;
- deux étapes au même instant sont refusées explicitement ;
- les débuts négatifs, les débuts à/au-delà de la durée et les fins hors durée
  sont refusés lorsque la durée FFprobe est disponible ;
- une collection temporelle vide est valide et produit un segment passe-partout ;
- les étapes sans fin utilisent la prochaine étape ou la durée FFprobe de la
  source ;
- le nombre d’images demandé à une étape est borné par `nb_frames` réel ;
- une étape sans image source, un masque trop petit pour la résolution ou une
  géométrie non représentable sont refusés avec une erreur lisible ;
- le filtre local vide est `[0:v]null[outv]` ;
- les copies temporaires de publication sont supprimées si `copyFile` ou
  `rename` échoue ;
- le journal FFmpeg est fermé aussi lors d’un échec ou d’une annulation ;
- le proxy HLS autorisé de Proto05 vise directement le chemin UGA contrôlé et ne
  dépend plus du serveur IC-Hub ni du port `8790`.

Aucune nouvelle interface, aucun changement de modèle fonctionnel et aucune
activité canonique n’ont été modifiés.

## Invariants du pipeline

1. Une étape commence à son `startMs` et reste active jusqu’à son `endMs`.
2. Les intervalles sont triés et non chevauchants ; une image ne peut être
   revendiquée par deux étapes.
3. Les bornes sont converties avec `ceil(t × fps)` puis la dernière borne est
   limitée au nombre d’images FFprobe lorsque disponible.
4. Le crop élargi sert uniquement de contexte au `boxblur`; le second crop
   recadre exactement la zone du masque avant l’overlay.
5. Les segments ont des paramètres vidéo compatibles et sont assemblés avec
   `-c:v copy`; aucune seconde génération vidéo n’est effectuée à la concat.
6. L’audio est remuxé une seule fois, copié lorsqu’il est AAC, avec repli AAC
   explicite pour les autres codecs ; l’absence de piste est autorisée.
7. Un dérivé n’est publié qu’après sortie FFmpeg non vide, validation FFmpeg,
   hash, écriture temporaire puis validation/persistance Library.

La documentation technique correspondante est dans
`prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md`.

## Fixtures et contrôles

Une fixture synthétique courte a été ajoutée au test ciblé :

- 320×240 ;
- cadence rationnelle `30000/1001` ;
- durée non alignée sur une image ;
- aucune piste audio ;
- chemin temporaire comportant espaces et Unicode ;
- collection temporelle vide.

La préparation, la dérivation locale, le fichier final et l’absence de piste
audio ont été vérifiés. Les données canoniques `data/activities.json` et la
Library suivie n’ont pas été écrites par cette fixture.

La fixture existante couvre également une vidéo courte avec audio AAC. Les
tests ciblés couvrent les étapes non triées, les temps dupliqués, l’absence
d’étapes, les temps hors durée, l’annulation, les erreurs et le nettoyage.

## Autonomie

Le serveur a été lancé depuis la racine de Proto05 sur un port isolé (`8892`)
avec succès, sans démarrer IC-Hub. Le healthcheck a répondu `0.1.29`. La route
`/api/hls/uga-37004/livestream.m3u8` a également répondu `200` directement via
la source UGA contrôlée ; le port `8790` n’est plus référencé dans le moteur.

Le moteur local et les fixtures FFmpeg fonctionnent avec Node et FFmpeg. La
lecture HLS navigateur conserve toutefois le prérequis d’un moteur HLS côté
client selon le navigateur ; aucune dépendance npm globale n’a été ajoutée.

## Vérifications et résultats

- `npm run check` : réussi ;
- `node --test test/hls-preparation.test.js` : 9/9 réussis ;
- `npm test` : 74/95 réussis, 21 échecs préexistants de fixtures hors périmètre
  immédiat. Les principaux écarts sont les tests historiques qui attendent 5
  activités alors que l’état réel du dépôt en contient 7, des attentes
  anciennes sur `overlays`, et un test d’interface attend une ancienne valeur
  de délai. Aucun de ces échecs ne vient d’une écriture de cette mission ;
  `data/activities.json` reste inchangé ;
- `git diff --check` : aucune erreur de whitespace, avertissements CRLF
  uniquement sur des fichiers déjà modifiés ;
- healthcheck serveur autonome : réussi ;
- manifeste HLS UGA direct : `HEAD 200`, type
  `application/vnd.apple.mpegurl` ;
- dérivation complète de 939 s : non relancée, conformément à la limite de la
  mission. La validation complète précédente reste celle documentée au rapport
  093, avec la correction de `-shortest` désormais couverte par les contrôles
  ciblés.

Performance : aucun graphe de flou plein écran n’a été réintroduit. Le repère
de référence reste celui du rapport 092 (`41,127 s` pour l’ancien graphe groupé
sur 60 s contre `1,269 s` pour le prototype local). La nouvelle fixture courte
sans masque sert de contrôle de robustesse, pas de benchmark comparable à ces
60 secondes.

## Fichiers modifiés ou ajoutés

- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js` ;
- `prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md` ;
- ce rapport.

Les modifications concurrentes déjà présentes dans le dépôt ont été
préservées. Aucun commit ni push. État Git final : modifications Proto05 et
rapports historiques déjà présents, plus les fichiers listés ci-dessus.

Limites reportées : VFR comme contrat distinct, reprise/cache, parallélisme,
GPU, détection automatique et validation Chromium complète post-correction.

Message de commit proposé :
`fix(proto05): stabilize autonomous temporal anonymization engine`
