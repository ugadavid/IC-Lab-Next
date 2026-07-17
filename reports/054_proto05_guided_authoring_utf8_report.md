# Rapport 054 — atelier guidé Proto05 : UTF-8 et édition

Date : 2026-07-17

## Périmètre

Correction de l’encodage de l’atelier guidé et de ses réponses, puis activation des actions d’édition déjà affichées pour les intervalles linguistiques et les segments. Le modèle de données, le catalogue vidéo, le lecteur, le proxy HLS et les cinq activités canoniques n’ont pas été modifiés.

## Modifications

- `teacher-guided.html` est désormais enregistré en UTF-8 propre, avec déclaration `<meta charset="utf-8">`.
- `guided-overlays.js` a été nettoyé des séquences mojibakées identifiées.
- La durée de l’atelier utilise `video.duration` lorsque `durationMs` n’est pas persistée, puis les bornes connues des données comme repli. Cela rend les curseurs YouTube utilisables sans changement de modèle.
- Les intervalles peuvent être ajoutés, sélectionnés dans le référentiel partagé, réglés avec les temps courants, appliqués et supprimés.
- Les segments peuvent être ajoutés, édités avec textarea, associés aux locuteurs et langues existants, réglés avec les temps courants, appliqués et supprimés.
- Les sauvegardes guidées conservent également `overlays` existants lors de l’écriture.
- Les boutons DOM dynamiques sont gardés après insertion ; aucun bouton factice n’a été ajouté.

## Contrôles

- Réponse HTTP de l’atelier : `text/html; charset=utf-8`, présence correcte de « Phénomènes », aucune séquence mojibakée détectée.
- Réponse API activité : `application/json; charset=utf-8`, présence correcte de Français, Espagnol, Italien et Portugais, aucune séquence mojibakée détectée.
- Contrôle binaire : `teacher-guided.html` commence par `<!doctype`, les scripts inline sont parsables et aucun préfixe de sortie de commande n’est enregistré.
- `npm run check` : succès.
- Un test ciblé existant (`test/language-catalog.test.js`) sur serveurs et copies temporaires : 3 sous-tests réussis, dont sélection de plusieurs langues partagées et sauvegarde.
- Recette Chromium sur serveur temporaire et copie temporaire : à la largeur effective disponible de 1265 px, encodage correct, ajout/modification/suppression d’un intervalle avec sauvegarde et rechargement, puis ajout/modification/suppression d’un segment avec textarea, langue/locuteur, temps courants, sauvegarde et rechargement. Les compteurs sont revenus à 22 intervalles et 11 segments après suppression.
- Aucune erreur console applicative dans la recette temporaire.

## Données et version

Les écritures de recette ont été effectuées dans une fixture temporaire ; `data/activities.json` canonique n’a pas été ciblé. Version inchangée : serveur Proto05 `0.1.20`, moteur étudiant `index-0.0.9.html`.

## Limites restantes

La recette Chromium intégrée a conservé une fenêtre effective de 1265 px de largeur malgré la demande 1440 × 1000 ; l’absence de débordement a été vérifiée dans cette fenêtre. Les overlays supplémentaires, la vidéo, le catalogue et la refonte graphique restent hors périmètre. La validation humaine finale n’est pas remplacée.

Message de commit proposé : `fix(proto05): make guided authoring editable and restore utf8`

Aucun commit ni push n’a été effectué.
