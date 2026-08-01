# Moteur d’anonymisation Proto05

## Sémantique des étapes

Une étape commence à `startMs` et reste active jusqu’à `endMs`. Les étapes sont
normalisées dans l’ordre chronologique. Deux étapes ne peuvent pas commencer au
même instant : une image source appartient à une seule étape. Une collection
peut être vide ; elle produit alors un segment vidéo sans modification.

Les temps négatifs, hors durée, les plages vides et les coordonnées hors cadre
sont refusés. Un `endMs` absent est déduit uniquement de l’étape suivante ou de
la durée FFprobe de la source. La dernière borne est limitée au nombre réel
d’images lorsque celui-ci est disponible.

## Pipeline de référence

```text
source préparée
→ FFprobe (résolution, cadence, durée, nombre d’images)
→ partition ceil(startMs × fps) / ceil(endMs × fps)
→ crop élargi → boxblur → crop exact du masque → overlay
→ encodage vidéo de chaque segment
→ concat demuxer avec -c:v copy
→ remux audio AAC avec -c:a copy, ou repli AAC explicite
→ validation FFmpeg
→ copie atomique dans la Library
```

Le crop élargi ne sert qu’au contexte du flou. Le second crop fixe la surface
exacte floutée avant l’overlay. Une collection vide utilise un filtre `null`.

## Audio, erreurs et nettoyage

Les segments intermédiaires ne contiennent pas d’audio. L’audio source est
remuxé une seule fois ; l’absence de piste audio est autorisée par `-map 1:a?`.
Chaque étape FFmpeg est enregistrée avec ses arguments, son PID, ses dates, son
code de sortie et son chemin de sortie. Un échec ou une annulation supprime le
workspace temporaire et ne publie aucun dérivé. Le journal FFmpeg reste
disponible pour le diagnostic. La publication passe par un fichier temporaire,
puis une validation de la Library ; ce fichier temporaire est supprimé en cas
d’échec.

## Atelier d’anonymisation audio

L’atelier audio est distinct de l’éditeur spatial. Son plan ordonne des passages
temporels stables selon des intervalles semi-ouverts `[startMs, endMs)`. Les
chevauchements sont refusés et les passages adjacents restent autorisés. Chaque
passage remplace entièrement l’audio original par une tonalité douce, un bip ou
du silence ; aucun mélange avec la parole source n’est effectué.

Le graphe FFmpeg concatène les portions originales et remplacées, applique de
brefs fondus aux signaux synthétiques, réencode l’audio en AAC 48 kHz et copie
le flux vidéo sans réencodage. Une source sans piste audio est refusée avant le
lancement. L’aperçu navigateur utilise Web Audio pour une écoute immédiate et
indicative ; l’export FFmpeg validé demeure l’autorité technique.

## Autonomie

Le serveur Proto05 démarre depuis `prototypes/05-augmented-ic-video-01/server`
avec Node et FFmpeg accessibles par le PATH. Le proxy UGA contrôlé résout
directement vers le manifeste UGA autorisé ; il ne dépend pas d’un serveur
IC-Hub pour cette route. Les activités, la Library et les fichiers gérés restent
dans `data/` de Proto05.

La préparation HLS et la lecture navigateur peuvent néanmoins nécessiter une
source UGA disponible et, selon le navigateur, un moteur HLS côté client. Les
copies locales et les fixtures FFmpeg ne dépendent pas d’IC-Hub.

## Limites reportées

Le moteur ne prend pas encore en charge le VFR comme contrat distinct, la
reprise/cache des segments, le parallélisme, le GPU, ni la détection automatique.
# Version de référence

Le serveur autonome Proto05 et son package sont servis en version **0.1.56**.
