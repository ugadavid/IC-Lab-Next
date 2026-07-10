# Rapport 003 - Informaticaire v0.3

## Objectif de la v0.3

Passer d'une logique de cartes à une logique de fiches consultables, tout en ajoutant une première visualisation des relations et des exports utiles pour l'exploitation dans le mémoire.

## Fichiers créés

- `reports/003_informaticaire_v0.3_report.md`

## Fichiers modifiés

- `index.html`
- `styles.css`
- `data.js`
- `script.js`
- `README.md`

## Vue détail ajoutée

Une modale de détail a été ajoutée. Elle s'ouvre au clic sur une carte ou via le bouton "Ouvrir la fiche". Elle affiche :

- titre ;
- type ;
- statut ;
- description longue quand elle existe ;
- période ;
- tags ;
- acteurs liés ;
- fiches liées ;
- traçabilité par entretien ;
- risques ;
- récupération / prochaine action ;
- notes d'incertitude ;
- todo documentaire.

Aucune page HTML par fiche n'a été créée : la logique reste statique et pilotée par JavaScript.

## Types de relations ajoutés

Le champ `relations` a été ajouté aux fiches centrales.

Types prévus :

- `prolonge`
- `hérite de`
- `utilise`
- `cite`
- `maintient`
- `fragilise`
- `récupère`
- `documente`

Les relations typées ont été priorisées pour Galatea, Galanet, Galapro, Miriadi, APICAD, Lecturio, ALPAGA, REPLI4C, Romanofonía y Cinema, Sandra, ELAN, Speechmatics, corpus multimodal, Encarni, Jean-Pierre, Christian, Kátia, politique linguistique et pérennisation.

## Vue graphe ajoutée

Une section "Carte relationnelle" a été ajoutée sans bibliothèque externe. Elle propose une lecture en colonnes :

- Christian -> Romanofonía -> REPLI4C
- Sandra -> ELAN -> corpus multimodal
- Encarni -> Galanet -> Miriadi
- Jean-Pierre -> APICAD -> Galapro
- Kátia -> politique linguistique -> pérennisation

Chaque nœud du graphe ouvre la fiche détaillée correspondante.

## Exports ajoutés

Deux boutons ont été ajoutés dans la bibliothèque :

- `Exporter les fiches en JSON`
- `Exporter la campagne en CSV`

Les exports sont générés côté navigateur à partir des données locales :

- `informaticaire_items_v0.3.json`
- `informaticaire_recovery_v0.3.csv`

## Nouveaux champs de données

Les fiches disposent progressivement des champs suivants :

```js
confidence: "haute" | "moyenne" | "à vérifier",
sourceStatus: "confirmé" | "incertain" | "transcription à vérifier",
lastChecked: "2026-07-03",
todo: ["Vérifier le nom exact", "Demander archive à Christian"]
```

Des valeurs par défaut sont appliquées aux fiches qui ne sont pas encore enrichies finement.

## Limites

- La vue détail est une modale, pas encore une vraie route ou URL partageable.
- Le graphe est une carte relationnelle simple en colonnes, pas un graphe interactif complet.
- Les relations typées couvrent les fiches centrales mais pas toute la base.
- Les descriptions longues sont ajoutées progressivement.
- Les exports ne contiennent pas encore de métadonnées de version séparées.

## Pistes v0.4

- Ajouter des URL d'ancrage par fiche.
- Ajouter une vue tableau scientifique avec tri par confiance, statut de source et date.
- Ajouter des sources page par page ou segment par segment.
- Ajouter des filtres par type de relation.
- Ajouter un graphe SVG plus complet si nécessaire.
- Ajouter un export CSV général des fiches.
- Ajouter une matrice entretiens x fiches.

## Vérifications

- Vérification syntaxique de `data.js` et `script.js`.
- Vérification de cohérence des relations typées et des lignes de graphe.
- Vérification navigateur de la modale de détail.
- Vérification du clic sur les nœuds de graphe.
- Vérification de l'export JSON.
- Vérification de l'export CSV de récupération.
- Vérification responsive mobile.
- Vérification qu'aucune erreur console n'est présente.

## Confirmation de périmètre

Aucun autre prototype n'a été modifié. Les changements de la v0.3 sont strictement limités à `prototypes/07-informaticaire`.

Les fichiers du dossier `prototypes/07-informaticaire/entretiens` n'ont pas été modifiés.
