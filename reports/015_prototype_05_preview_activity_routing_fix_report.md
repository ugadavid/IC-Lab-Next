# Rapport — Prototype 05 : correction du routage de prévisualisation

Date : 13 juillet 2026  
Version corrective : **0.1.2.1**

## Origine du défaut

Le moteur étudiant utilisait déjà l’identifiant présent dans la route
`/student/:activityId`, mais l’atelier auteur devait propager cet identifiant
dans son lien et son iframe. Le défaut observé venait d’un lien étudiant généré
avec l’activité historique codée en dur. La timeline linguistique contenait en
outre une référence résiduelle à `segment` alors que le rendu utilisait désormais
des `languageIntervals`, ce qui déclenchait `segment is not defined`.

## Correction

`teacher-author.html` construit maintenant systématiquement :

- `/teacher/preview/${encodeURIComponent(activityId)}` ;
- `/student/${encodeURIComponent(activityId)}`.

Le moteur `index-0.0.8.html` extrait l’identifiant de la route, l’encode pour
`GET /api/proto05/activities/:activityId` et ne retombe sur l’activité historique
que lorsqu’aucun identifiant de route n’est fourni. Le bouton depuis la
prévisualisation enseignant conserve également l’identifiant courant.

La référence JavaScript résiduelle a été remplacée par les données de
l’intervalle linguistique. Les erreurs sont distinguées entre réseau, activité
inconnue et erreur de rendu. Une activité vide affiche désormais un état lisible
et ne déclenche pas d’accès au segment inexistant.

## Vérifications

- serveur version `0.1.2.1` sur 8791 ;
- activité historique : `22` intervalles, `11` segments, `26` phénomènes,
  `7` couches ;
- route étudiant historique : `200` ;
- route API inconnue : `404` ;
- parsing HTML/JavaScript : réussi ;
- `npm run check` : réussi ;
- `git diff --check` : réussi.

Les données métier et les intervalles historiques n’ont pas été modifiés dans
cette correction. La lecture HLS, la transcription, les couches, Focus,
observations et export CSV restent portés par le moteur partagé.

## Limites restantes

La validation visuelle complète dans un navigateur doit encore être rejouée sur
un brouillon vide réel ; le code de routage et les routes serveur sont toutefois
vérifiés directement. Aucune authentification ni permission n’est introduite.

Message de commit proposé :

`fix(prototype-05): preserve activity id in student preview`
