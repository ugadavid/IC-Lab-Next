# Rapport 042 — Normalisation de la relation segment–phénomène Proto05

**Date :** 16 juillet 2026  
**Périmètre :** modèle, validation, duplication, ateliers, vue étudiante et
timeline du Prototype 05  
**Mission :** retenir `phenomena[].segmentId` comme source de vérité unique du
rattachement d’un phénomène à un segment.

## État réel observé

- `AGENTS.md`, `STATUS.md`, `docs/ARCHITECTURE.md`, le README Proto05, les
  rapports 040–041, le serveur, les interfaces et le JSON canonique ont été
  inspectés avant modification.
- Le serveur était en version `0.1.12` et servait le moteur
  `index-0.0.8.html`.
- Le JSON contenait cinq activités et les langues étaient déjà normalisées vers
  `fr`, `es`, `it`, `pt`.
- La timeline partagée lisait déjà `phenomena[]` et leurs temps propres.
- La transcription étudiante construisait encore ses tags depuis
  `segments[].phenomenonIds`.
- Le serveur comparait les deux directions, mais la duplication reconstruisait
  le cache inverse depuis le cache source au lieu de partir de
  `phenomena[].segmentId`.
- L’activité historique est cohérente : 11 segments, 26 phénomènes et aucune
  divergence.
- `Original_copy` possède 11 segments, 14 phénomènes valides par `segmentId`,
  mais cinq segments dont le cache inverse diverge. Plusieurs identifiants du
  cache désignent des phénomènes qui ne sont plus présents.
- Les trois brouillons ne contiennent ni segment ni phénomène.
- SHA-256 canonique observé :
  `862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47`.

## Modèle retenu

`phenomena[].segmentId` est la source de vérité fonctionnelle. Un phénomène
porte également ses propres `startMs` et `endMs`; ses temps ne sont pas forcés à
être identiques à ceux du segment.

`segments[].phenomenonIds` reste présent dans les données existantes afin de ne
supprimer aucun contenu. Il est traité exclusivement comme un cache dérivé :

- aucun affichage actif ne le lit;
- lorsqu’il est présent, le serveur exige exactement l’ensemble des phénomènes
  dont `segmentId` correspond au segment;
- les ateliers le recalculent après ajout, déplacement ou suppression d’un
  phénomène sur une activité initialement cohérente;
- la duplication le reconstruit après remappage des `phenomena[].segmentId`.

Le champ peut donc être omis par un futur producteur, mais deux valeurs
divergentes ne peuvent pas être sauvegardées.

## Réalisation

### Serveur et duplication

- La validation contrôle d’abord les `segmentId` des phénomènes, leurs couches
  et leurs temps propres.
- Le cache inverse est ensuite comparé à la relation dérivée, avec un message
  indiquant le segment, la valeur attendue, la valeur reçue et la source de
  vérité.
- Une référence incohérente ou un identifiant de phénomène obsolète bloque la
  sauvegarde avant toute écriture.
- La duplication remappe les phénomènes puis reconstruit chaque
  `segment.phenomenonIds` à partir des nouveaux `phenomenon.segmentId`.

### Vue étudiante et timeline

- Le moteur `index-0.0.9.html` groupe désormais directement les phénomènes par
  `phenomenon.segmentId` pour produire les tags de transcription.
- La timeline continue à rendre directement `phenomena[]` et leurs temps.
- La transcription et la timeline utilisent ainsi la même collection et la
  même relation.

### Ateliers

- L’atelier guidé associe chaque nouveau phénomène au segment sélectionné ou au
  segment contenant la position courante.
- Le formulaire d’un phénomène permet de choisir explicitement son segment.
- Les listes de transcription affichent le nombre de phénomènes calculé depuis
  `phenomena[].segmentId`.
- Ajout, changement de segment et suppression recalculent immédiatement le cache
  dérivé, la liste de transcription et la timeline.
- La suppression d’un segment encore référencé par des phénomènes est refusée.
- L’atelier avancé propose également une sélection de segment, un compteur par
  segment et une piste de phénomènes mise à jour localement.
- Les deux ateliers détectent une relation initialement incohérente. Dans ce cas,
  le bouton de sauvegarde est désactivé et aucune réparation automatique n’est
  appliquée.

## Traitement d’Original_copy

`Original_copy` n’a pas été modifiée, complétée ou réparée. Ses cinq divergences
restent présentes et documentées. Les routes de métadonnées, d’atelier et de
duplication appellent toutes la validation d’intégrité : toute écriture ou
duplication de cette activité est donc refusée proprement.

La lecture reste possible. La vue étudiante affiche les 14 phénomènes existants
selon leurs `segmentId`, sans interpréter les identifiants obsolètes conservés
dans le cache inverse.

## Données

Aucune migration du JSON canonique n’était nécessaire :

- l’activité historique avait déjà un cache dérivé cohérent;
- les trois brouillons étaient vides;
- la mission interdit la réparation automatique d’`Original_copy`.

Le fichier `data/activities.json` n’a jamais été écrit pendant la mission. Son
SHA-256 final est identique au SHA observé :
`862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47`.
Aucune nouvelle sauvegarde `.bak` n’a donc été créée.

## Version obtenue

- Serveur Proto05 : `0.1.12` → `0.1.13`.
- Moteur étudiant : `index-0.0.8.html` → `index-0.0.9.html`.
- Données : inchangées.

Ces deux incréments identifient explicitement le baby step de normalisation côté
API et côté rendu étudiant. L’ancien moteur est conservé comme artefact
historique; le serveur sert désormais `index-0.0.9.html` à la racine et sur les
routes étudiant/prévisualisation.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/index-0.0.9.html`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/server/test/phenomenon-source.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/data-regression.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/layer-visibility.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/README.md`
- `docs/ARCHITECTURE.md`
- `STATUS.md`
- `reports/042_prototype_05_segment_phenomenon_normalization_report.md`

## Contrôles réalisés

### Analyse statique

- `npm run check` : réussi avec le serveur `0.1.13`.
- Parsing JavaScript extrait de `teacher-author.html`, `teacher-guided.html` et
  `index-0.0.9.html` : réussi.
- `git diff --check` : réussi; seuls les avertissements Windows LF/CRLF ont été
  affichés.
- Recherche des consommateurs de `phenomenonIds` : aucune lecture restante dans
  le moteur étudiant ou la timeline; les occurrences runtime restantes servent
  uniquement à la validation, au maintien du cache dérivé et à la duplication.

### Quatre tests ciblés

Commande finale :

`node --test --test-concurrency=1 test/phenomenon-source.test.js`

Résultat final : **4 tests réussis, 0 échec**.

1. ajout Chromium sur l’activité historique et synchronisation immédiate;
2. suppression avec cache dérivé sauvegardable;
3. duplication reconstruite depuis `phenomena[].segmentId`;
4. refus d’écriture et de duplication d’`Original_copy` sans modification.

Tous les serveurs et JSON utilisés par les tests étaient temporaires. Chaque
test a vérifié le SHA du JSON canonique avant/après.

Deux passages en échec ont précédé le résultat final :

- le premier a montré que le diagnostic d’`Original_copy` s’arrêtait d’abord sur
  un identifiant absent; le message a été recentré sur la divergence avec la
  source de vérité;
- les deux premiers lancements Chromium tentaient un ajout à `00:00`, alors que
  le premier segment historique commence plus tard. L’atelier refusait donc
  correctement l’ajout hors segment. La recette a été corrigée pour sélectionner
  explicitement le premier segment.

Ces échecs n’ont touché que les fixtures temporaires et ont justifié les
relances ciblées. La suite complète n’a pas été lancée.

### Recette Chromium réussie

Viewport : `1440×1000`.

Parcours : activité historique dans l’atelier guidé → sélection du premier
segment → ajout d’un phénomène → mise à jour immédiate → sauvegarde → ouverture
de la vue étudiante temporaire.

Constats :

- marqueurs de timeline : 26 → 27;
- compteur de phénomènes du premier segment : 2 → 3;
- sauvegarde réussie avec 27 phénomènes et cache dérivé cohérent;
- vue étudiante : 27 marqueurs et 3 tags sur le premier segment;
- aucune erreur visible relevée dans le parcours réussi.

La recette Codex n’est pas une validation fonctionnelle humaine.

## Éléments non vérifiés et limites

- La suite complète des 55 tests n’a pas été relancée, conformément à la
  mission. Aucun échec final ni indice de régression n’a imposé son exécution.
- `Original_copy` reste volontairement non sauvegardable tant que ses cinq
  divergences ne font pas l’objet d’une mission explicite de réparation.
- Le cache `segments[].phenomenonIds` n’a pas été supprimé des données
  historiques afin de respecter l’interdiction de supprimer du contenu. Il
  reste donc une donnée dérivée transitoire, pas une seconde source.
- Les vidéos, overlays, couches, locuteurs et parcours complet de création d’un
  brouillon n’ont pas été modifiés.
- Aucune validation humaine par David n’a été réalisée.

## Message de commit proposé

`refactor(proto05): unifier la relation segment phénomène`
