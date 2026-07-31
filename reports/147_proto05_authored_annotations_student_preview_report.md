# Mission 147 — Relier les annotations auteur à la prévisualisation étudiante

Date : 30 juillet 2026  
Version Proto05 obtenue : `0.1.48` (inchangée)  
Source métier : MariaDB exclusivement  
Commit / push : aucun

## Périmètre

La mission a porté uniquement sur le chemin des annotations pédagogiques
créées dans l’atelier guidé jusqu’aux deux vues jouables communes :

```text
atelier guidé
→ PUT /api/proto05/activities/:id/authoring
→ activity_annotations
→ GET /api/proto05/activities/:id
→ projection jouable partagée
→ preview enseignant et interface étudiante
```

L’activité réelle de David a été inspectée en lecture seule. Toutes les
mutations de recette ont utilisé une activité jetable, ensuite supprimée.

## Faits observés avant correction

- L’activité réelle contient bien l’annotation
  `Annotation numéro une qui apparait dès le début !`.
- Cette annotation est persistée dans `activity_annotations`, rattachée à son
  segment, et restituée dans `activity.teacherAnnotations` par l’API.
- Preview et student utilisent le même lecteur, `index-0.0.9.html`.
- La projection de transcription lisait déjà `teacherAnnotations`, mais le
  panneau remplaçait ensuite la note par un texte historique codé dans
  `buildLayeredNote()` lorsque aucune couche n’était active :
  `Ce segment continue d’exister dans la vidéo...`.
- À la sortie temporelle du segment, seul son surlignage était retiré. Le
  contenu du panneau pouvait donc rester affiché hors intervalle.
- Plusieurs annotations d’un même segment étaient réduites à la dernière
  entrée par une `Map`.
- Une seconde anomalie frontale a été reproduite pendant la recette : après
  une sauvegarde réussie, l’activité était remplacée par la réponse canonique,
  mais `selected.item` restait l’ancien objet en mémoire. Une modification
  immédiate construisait alors un payload inchangé et le garde-fou MariaDB
  refusait justement l’écriture vide (`PROTO05_EMPTY_TARGETED_WRITE`).

## Clarification des concepts

- **Transcription de segment** : `activity.segments[].text`, toujours rendue
  comme transcription de base.
- **Annotation pédagogique auteur** :
  `activity.teacherAnnotations[]`, persistée dans `activity_annotations`.
- **Question pédagogique d’annotation** :
  `teacherAnnotations[].pedagogicalQuestion`.
- **Couches et phénomènes** : enrichissements distincts ; leur activation ne
  décide plus du texte de l’annotation auteur.
- **Observation personnelle étudiante** : collection locale du lecteur,
  distincte des annotations créées par l’enseignant.
- **Overlay** : contenu vidéo temporel distinct, éventuellement lié à une
  annotation, mais non utilisé comme source du panneau Annotation IC.

## Correction

- Ajout d’un contrat partagé `playable-annotations.js`.
- Une annotation hérite de l’intervalle de son segment, faute de bornes
  propres dans le modèle actuel.
- Règle temporelle retenue : début inclus, fin exclue, soit
  `[segment.startMs, segment.endMs)`.
- Le panneau Annotation IC interroge la projection à chaque évolution du temps
  et affiche seulement les annotations actives.
- La sortie de l’intervalle efface le panneau et l’état temporel actif.
- Le texte historique n’est plus injecté.
- Les annotations simultanées sont triées de façon déterministe par début,
  fin puis identifiant ; leurs notes et questions sont agrégées sans perte.
- La projection de transcription conserve également toutes les annotations
  d’un segment et leurs overlays associés.
- Après sauvegarde dans l’atelier guidé, la sélection est désormais rattachée
  par type et identifiant à l’objet de la réponse canonique. Une modification
  immédiate agit donc sur l’état réellement sauvegardé.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/index-0.0.9.html`
- `prototypes/05-augmented-ic-video-01/shared/playable-annotations.js`
- `prototypes/05-augmented-ic-video-01/shared/playable-transcription.js`
- `prototypes/05-augmented-ic-video-01/shared/authoring-mutation-state.js`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/server/test/playable-annotations.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`

## Preuves automatisées

- Validation syntaxique Node des quatre fichiers JavaScript concernés : OK.
- Suite active `npm test` : **70/70 tests réussis**.
- Tests spécifiques ajoutés :
  - début inclus et fin exclue ;
  - présence à 2 s et absence à 6 s pour un segment 0–5 s ;
  - ordre déterministe de plusieurs annotations simultanées ;
  - modification sans conservation de l’ancien texte ;
  - suppression ;
  - absence du texte historique dans une nouvelle activité ;
  - rattachement de la sélection auteur à la réponse canonique ;
  - cycle MariaDB réel, relecture et redémarrage.
- `teacher-ui-navigation.test.js` n’a pas pu être exécuté isolément : son
  import préexistant `test/helpers/temporary-proto05-server` est absent du
  dépôt. Cette suite ne fait pas partie du script `npm test`; la navigation
  touchée a été couverte par la recette interactive ci-dessous.

## Recette interactive et SQL

Activité jetable : titre distinctif `[TEST mission147-ui-…]`.

1. Création de `ANNOTATION-M147-DEBUT` sur un segment `00:00–00:05`.
2. Présence immédiate dans l’atelier et transition
   `non enregistré → enregistré`.
3. Relecture SQL directe :
   note, question, `start_ms = 0`, `end_ms = 5000`.
4. Relecture API : annotation et rattachement au bon segment présents.
5. Preview et student :
   - à environ 2 s : annotation visible ;
   - après 5 s : annotation absente ;
   - rendu identique ;
   - aucune erreur console.
6. Modification immédiate, sans rechargement, en
   `ANNOTATION-M147-MODIFIEE` :
   - sauvegarde réussie ;
   - ancien texte absent de l’API et des deux DOM ;
   - nouvelle valeur confirmée en SQL.
7. Suppression :
   - aucun des deux textes dans les lecteurs ;
   - zéro annotation dans l’API et en SQL ;
   - état identique après rechargement et redémarrage.
8. Activité réelle de David, en lecture seule :
   - annotation réelle visible dès le début ;
   - texte historique absent ;
   - aucune erreur console.

Vérification visuelle réalisée à une largeur représentative de bureau :
transcription, panneau Annotation IC et commandes restent lisibles ; aucune
refonte visuelle n’a été introduite.

## Nettoyage

- L’activité jetable a été supprimée par sa route canonique après contrôle de
  son identifiant et de son titre.
- Sa route répond ensuite **404**.
- Les cardinalités sont nulles dans `activities` et dans toutes les tables
  relationnelles vérifiées : transcription, segments, annotations, langues,
  locuteurs, intervalles, couches, phénomènes, overlays, liens médias,
  identités pédagogiques et tables d’association.
- Aucune donnée réelle de David n’a été modifiée.

## Validation humaine minimale laissée à David

1. Ouvrir l’activité concernée dans l’atelier guidé.
2. Ouvrir sa prévisualisation à `00:00`.
3. Vérifier que `Annotation numéro une qui apparait dès le début !` apparaît.
4. Lire au-delà de la fin du segment et vérifier sa disparition.
5. Modifier puis supprimer une annotation de test sur une activité jetable,
   sans recharger entre la première sauvegarde et la modification.

## Proposition de message de commit

```text
fix(proto05): render authored annotations in playable views
```
