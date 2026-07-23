# Mission 081 — Proto05 : profils doux, dérivations successives et lien média

## Version et périmètre

Proto05 uniquement. Version serveur inchangée : `0.1.30`. Aucun autre prototype, IC-Hub, activité canonique ou source existante n’a été modifié.

## Profils de flou

Les profils sont désormais plus doux et déterministes :

| Profil | FFmpeg `boxblur` | Défaut |
|---|---:|---|
| Léger | `luma_radius=2`, `luma_power=1` | oui |
| Standard | `luma_radius=4`, `luma_power=1` | non |
| Fort | `luma_radius=6`, `luma_power=1` | non |

Le profil est affiché dans l’atelier, transmis explicitement dans `blurProfile`, validé par le serveur et conservé dans la provenance avec ses valeurs, le graphe `filter_complex`, les arguments FFmpeg et les masques. Aucun profil ne revient à `drawbox` ou à un rectangle noir.

## Dérivations successives

Après une dérivation, la préparation HLS reste `completed` et son fichier temporaire reste disponible jusqu’à l’expiration prévue. Elle n’est plus invalidée par un succès, un échec ou une annulation de dérivation. Le nettoyage reste assuré par l’expiration du job de préparation.

L’atelier réactive l’action de dérivation et conserve les liens des résultats successifs. Chaque nouvelle demande crée un job indépendant avec son profil et ses paramètres; les dérivés précédents ne sont pas supprimés. Les masques restent ceux de la préparation éditée.

## Correction du lien dérivé

La cause exacte était l’utilisation de `job.metadata.fileName` dans l’interface alors que `persistDerivedPlayable()` ne renseignait pas ce champ. Le lien pointait donc vers `/api/proto05/library/media/` sans fichier.

Le résultat de persistance expose maintenant `mediaUrl` et `storageKey`, dérivés du playable réellement créé. L’interface utilise `metadata.mediaUrl`, qui correspond à `derivedPlayable.url` et à la route média persistante `/api/proto05/library/media/:filename`. Cette route conserve les requêtes Range; aucun workspace temporaire n’est exposé.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/teacher-anonymization.html`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`
- `reports/081_proto05_blur_profiles_repeatable_derivative_link.md`

## Vérifications

- `npm run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis.
- Le test couvre le profil Standard, le refus d’un profil inconnu, les paramètres de provenance, la création d’une seconde dérivation avec le profil Fort depuis la même préparation, la conservation du premier dérivé, la persistance et la lecture Range.
- Vérification statique des profils `2/1`, `4/1`, `6/1`, de `blurProfile`, de `mediaUrl` et de l’absence d’invalidation de la préparation après dérivation.

La recette Chromium obligatoire avec trois profils, plusieurs tailles de fenêtre, actualisation et ouverture visuelle des trois fichiers n’a pas pu être exécutée dans cette session, l’outil Chromium n’étant pas disponible. Elle reste à réaliser pour la validation humaine.

Les modifications préexistantes visibles dans `data/video-library.json`, `teacher-videos.html` et les rapports 077–080 ont été conservées sans intervention. Aucun commit ni push.

Message de commit proposé : `Proto05: rendre les dérivations répétables et corriger le lien média`.
