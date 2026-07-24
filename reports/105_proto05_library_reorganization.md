# Rapport 105 — Réorganisation de la Library Proto05

## Périmètre

Première passe UX limitée à `teacher-videos.html`. Le catalogue canonique,
les médias, les activités et les routes n'ont pas été modifiés.

## Fonctionnalités livrées

- barre supérieure avec recherche, tri par titre/date/disponibilité, filtre de
  source, choix grille/liste et bouton d'ajout ;
- colonne latérale avec Toutes les vidéos, Non classées, Indisponibles et la
  liste des dossiers connus ;
- zone principale filtrée selon la sélection courante ;
- cartes allégées avec miniature ou aperçu de type source, titre, source,
  playable, disponibilité et actions existantes ;
- recherche par titre, identifiant ou contenu de source ;
- sélection visuelle de la vidéo et du dossier/vue actifs ;
- actions d'aperçu et d'association conservées ;
- panneau d'ajout repliable conservant les trois formulaires existants.

Le catalogue installé contient actuellement zéro dossier persistant et les
assets sont non classés. L'interface affiche donc explicitement l'état vide des
dossiers et rend Non classées fonctionnel. Aucun stockage parallèle ni writer de
dossiers n'a été introduit.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/server.js` — version `0.1.32`
- `prototypes/05-augmented-ic-video-01/server/package.json` — version `0.1.32`

Version applicative finale : **0.1.32**.

## Vérifications

- `npm run check` : réussi ;
- parsing des 9 scripts inline de `teacher-videos.html` : réussi ;
- `git diff --check` : réussi ;
- aucune écriture de donnée canonique effectuée.

La recette Chromium n'a pas été ouverte automatiquement. Le serveur est lancé
séparément pour validation visuelle humaine.

## Limites

La création, le renommage et le déplacement persistants des dossiers restent
différés, car le modèle courant n'expose pas d'interface d'écriture dédiée et
la mission interdit d'inventer un stockage parallèle. Les miniatures natives
des fichiers locaux et HLS restent des représentations visuelles de type
source ; l'aperçu réel reste accessible par l'action existante.

Aucun commit ni push.
