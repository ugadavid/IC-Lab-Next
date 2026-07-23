# Mission 070 — Proto05 : première interface de la Library vidéo

Date : 2026-07-23  
Périmètre : `prototypes/05-augmented-ic-video-01` uniquement.

## Réalisation

- Ajout de la première interface persistante dans `teacher-videos.html`.
- Affichage des assets, sources, versions lisibles et `playableId`.
- Recherche par titre, identifiant ou type de source et filtre local/direct/HLS/YouTube.
- Formulaire d’ajout déclaratif pour URL directe, manifeste HLS `.m3u8` et référence locale (`storageKey`), sans import physique.
- Aperçu des playables YouTube et UGA/HLS via le lecteur partagé existant.
- Sélection d’un asset et route d’association à une activité sur copie ; `activity.video` reste la projection de compatibilité.
- Routes utilisées : `GET /api/proto05/library/assets`, `GET /api/proto05/activities`, `POST /api/proto05/library/assets`, `PUT /api/proto05/activities/:id/video-ref`.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/test/library-persistence.test.js`

La donnée persistante et le helper de serveur temporaire introduits par la mission 069 ont été réutilisés. Aucun autre prototype, IC-Hub ni activité canonique n’a été modifié.

## Version

Version Proto05 serveur réellement servie : `0.1.25`.

## Vérifications

- `npm run check` : OK.
- 10 tests ciblés : OK, dont lecture/persistance de la Library, ajout local/direct/HLS, résolution d’un playable, conservation de `activity.video` et association sur copie temporaire.
- Chromium : affichage initial de 3 assets, recherche YouTube, filtre HLS, aperçu YouTube chargé dans une iframe, largeur sans débordement (`scrollWidth` égal à la largeur utile), console applicative sans erreur observée.
- L’envoi effectif du formulaire d’ajout et l’association UI n’ont pas été exécutés sur le serveur réel afin de ne pas écrire une nouvelle Library ou une activité canonique pendant la recette ; leurs contrats sont couverts sur serveur temporaire.

## Limites et suite

Aucun téléchargement, import physique, fichier local réel, copie, anonymisation, version dérivée, suppression ou édition avancée de Library n’est inclus. Les sources directes et locales restent déclaratives et ne sont pas prévisualisées tant qu’un playable compatible n’est pas disponible. Une prochaine mission pourra ajouter une gestion de sélection d’activité plus intégrée et les workflows d’import contrôlé.

Message de commit proposé : `feat(proto05): add first video library interface`
