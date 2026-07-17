# Rapport 051 — Prototype 05 : découplage annotations / overlays

Date : 2026-07-17  
Périmètre : `prototypes/05-augmented-ic-video-01`

## Résultat

Le modèle possède désormais `activity.overlays[]` comme collection indépendante. `teacherAnnotations[]` conserve uniquement les notes, questions et rattachements pédagogiques. Chaque overlay porte son propre `id`, `startMs`, `endMs`, `title`, `text`, `layerIds` et, facultativement, `annotationId`.

Les 5 activités canoniques sont préservées. Les 12 overlays historiques ont été migrés : 6 dans l’activité UGA historique et 6 dans la copie YouTube. Leurs temps initiaux reprennent ceux du segment de leur annotation. Les propriétés imbriquées `annotation.overlay` ont été supprimées, y compris les valeurs nulles.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/data/activities.json` : migration canonique autorisée ; backup `activities.json.pre-overlay-migration` conservé.
- `prototypes/05-augmented-ic-video-01/server/scripts/migrate-annotation-overlays.js` : migration réutilisable et idempotente.
- `prototypes/05-augmented-ic-video-01/server/server.js` : normalisation legacy, validation des overlays, autorisation d’écriture, duplication et version serveur.
- `prototypes/05-augmented-ic-video-01/server/package.json` : version `0.1.20`.
- `prototypes/05-augmented-ic-video-01/index-0.0.9.html` : rendu étudiant des overlays par temps indépendant, avec visibilité des couches.
- `prototypes/05-augmented-ic-video-01/teacher-author.html` : zones séparées « Annotation pédagogique » et « Affichage dans la vidéo », CRUD indépendant.
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`, `guided-overlays.js` : édition guidée des annotations et overlays autonomes/liés.
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js` et `server/test/overlay-separation.test.js` : fixtures temporaires et cinq contrôles ciblés.

Les autres changements déjà présents dans le worktree ont été conservés.

## Contrôles réalisés

- `npm run check` : OK, serveur `0.1.20`.
- `node --check guided-overlays.js` et `git diff --check` : OK.
- 5 tests ciblés sur copie temporaire : migration, overlay autonome, overlay lié, temps invalides refusés sans écriture, duplication avec remappage : OK.
- Test API auteur existant sur copie temporaire : OK ; les cinq activités canoniques ne sont pas écrites par ce test.
- Recette Chromium locale : la vue étudiant UGA charge les segments, couches, annotations et timeline ; la source HLS renvoie toutefois « Format non supporté » dans cet environnement Chromium local. La vue YouTube affiche l’iframe officielle et l’identifiant `FG4h0_v3oTk`. L’atelier guidé expose « Affichage dans la vidéo » et « Créer un overlay autonome ».

## Limites restantes

- La durée YouTube étant fournie dynamiquement par l’IFrame API, le serveur ne peut borner son `endMs` tant qu’aucune durée n’est persistée ; la validation serveur impose néanmoins entier positif et `endMs > startMs`, tandis que la durée connue UGA est strictement contrôlée.
- La recette Chromium n’a pas pu confirmer la lecture HLS locale, ni les contrôles de lecture/déplacement YouTube de bout en bout ; l’iframe YouTube officielle est bien rendue.
- Les temps propres aux annotations, les observations étudiantes, la vidéo, le proxy HLS, les langues, les locuteurs et les phénomènes n’ont pas été modifiés fonctionnellement.
- Aucune validation humaine ne remplace cette recette automatisée.

## Version et suite

Version réellement modifiée : serveur Proto05 `0.1.20` ; moteur étudiant inchangé (`index-0.0.9.html`).

Suite possible : compléter la synchronisation de durée YouTube côté atelier/serveur et effectuer une recette humaine avec un flux HLS lisible et les commandes YouTube disponibles.

Message de commit proposé (non créé) : `Proto05: découpler les annotations pédagogiques et les overlays vidéo`.
