# Mission 114 — Correction de l’aperçu des dérivations locales

## Périmètre

Correction limitée à la prévisualisation des deux dérivations locales déjà
présentes dans la fiche `yop`. Aucun modèle, workspace, traitement FFmpeg,
fichier média, activité ou donnée canonique n’a été modifié par le correctif.

## Diagnostic

Les deux playables réels sont correctement projetés avec leur rôle
`derivation-local`, leur clé de workspace et leur URL propre. Leurs réponses
HTTP sont valides :

- `200 OK`, `Content-Type: video/mp4`, `Accept-Ranges: bytes` ;
- `206 Partial Content` pour `Range: bytes=0-1023` ;
- tailles respectives : 29 130 464 et 27 393 166 octets.

Avant correction, Chromium ouvrait la zone mais n’y créait aucun élément
`<video>` et affichait : « La source vidéo n’est pas autorisée. » Aucune requête
média n’était donc tentée.

La différence avec la working-copy est le provider projeté : `local` pour la
copie de travail, `proto05-derived` pour une dérivation. Le lecteur commun
autorise la lecture native locale avec le provider `local`. L’aperçu de la fiche
lui transmettait directement `proto05-derived`, d’où le refus avant attachement
du média.

## Correctif

`previewVersion()` conserve le playable canonique intact et transmet au lecteur
existant une copie éphémère avec `provider: "local"` uniquement lorsque son rôle
est `derivation-local`. La route média, le téléchargement et les autres aperçus
ne changent pas.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `reports/114_proto05_local_derivation_preview_fix.md`

Le diff déjà présent de `data/video-library.json` et le dossier réel non suivi
`data/video-library-workspaces/.../derived/` appartiennent à la recette de
David. Ils ont été inspectés mais ni réécrits, ni déplacés, ni supprimés.

## Vérifications

- Recette Chromium réelle des deux dérivations :
  - deux éléments `<video>` indépendants ;
  - contrôles natifs présents ;
  - URLs correspondant exactement à chaque tentative ;
  - `readyState = 4`, durée `391,816667 s` pour chacune ;
  - aucune erreur média ;
  - console Chromium vide.
- Test ciblé `node --test test/video-workspaces.test.js` : 5/5 réussis.
- `npm run check` : réussi.
- `git diff --check` : réussi, hors avertissements de conversion CRLF.
- La suite complète de 199 tests n’a volontairement pas été lancée,
  conformément au périmètre.

## Version et remise

Version obtenue : `0.1.37`.

Les `engineVersion` 0.1.36 enregistrés sur les deux dérivations restent
inchangés : le moteur d’anonymisation n’a pas été modifié.

Validation humaine : à effectuer par David sur l’instance unique laissée sur
le port 8891.

Message de commit proposé :

`fix(proto05): preview local derivations with the native player`

Aucun commit ni push effectué.
