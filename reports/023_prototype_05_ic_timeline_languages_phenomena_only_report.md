# Prototype 05 — Timeline IC spécialisée

Version : **0.1.6.3**

## Périmètre

La Timeline IC ne rend plus les segments de transcription. Elle consomme uniquement `languageIntervals`, `phenomena`, `languages`, `layers`, la durée et la position courante. Sa structure contient l’axe, quatre pistes de langues et une piste séparée de phénomènes d’intercompréhension, avec un espacement visuel entre les deux familles.

Les 11 segments restent dans l’activité et continuent d’être rendus par le panneau de transcription étudiant et la liste de transcription guidée.

## Événements

Un clic sur une langue émet une sélection `type: "languageInterval"` avec `id`, `languageId`, `startMs` et `endMs`. Un clic sur un phénomène émet `type: "phenomenon"` avec `id`, `layerId`, `startMs` et `endMs`. Le déplacement vidéo passe par `onSeek`. Les pages hôtes restent responsables de leurs panneaux, de l’édition et de la sauvegarde.

## Vérifications

- données conservées : 11 segments, 22 intervalles, 26 phénomènes, 4 langues et 7 couches ;
- `npm run check`, parsing JavaScript et `git diff --check` réussis ;
- étudiant et atelier guidé utilisent le même composant et la même géométrie ;
- aucune ligne « Transcription » ni plage de transcription dans la Timeline IC ;
- lignes FR, ES, IT et PT, puis zone distincte des phénomènes ;
- clics de plages et phénomènes conservés, avec déplacement vidéo et sélection guidée ;
- la transcription reste accessible séparément dans ses panneaux respectifs.

Limite : la lecture vidéo dépend toujours du flux HLS distant.

Message de commit proposé :

```text
refactor(prototype-05): restrict IC timeline to languages and phenomena
```
