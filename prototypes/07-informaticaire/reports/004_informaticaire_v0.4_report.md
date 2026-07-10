# Rapport 004 - Informaticaire v0.4

## Objectif de la v0.4

Recentrer Informaticaire comme prototype communautaire partageable pour l'intercompréhension. La finalité principale devient : retrouver, documenter, relier, sauver, réutiliser et partager les ressources, projets, acteurs et besoins du domaine.

Les entretiens restent une source de traçabilité et de justification, mais ils ne structurent plus le visage principal de l'outil.

## Fichiers modifiés

- `index.html`
- `styles.css`
- `data.js`
- `script.js`
- `README.md`

## Changements d'orientation communautaire

- Réécriture de l'accueil autour d'une mémoire vivante et partageable de l'intercompréhension.
- Remplacement de la finalité centrée sur l'analyse du stage par une finalité collective : enseignants, chercheurs, ingénieurs pédagogiques, réseaux et associations.
- Réorganisation de la fiche détaillée pour afficher d'abord l'usage, le public, la réutilisation, l'état actuel, les actions possibles et les liens.
- Déplacement de la preuve vers une section secondaire intitulée "Traçabilité documentaire".
- Transformation de la campagne en "Ressources à sauver ensemble".

## Sections ajoutées

- `Pour qui ?`
- `Je veux...`

Les parcours d'usage permettent d'entrer par une intention concrète :

- chercher une ressource pédagogique ;
- savoir si une plateforme existe encore ;
- retrouver qui connaît un projet ;
- contribuer à sauver une ressource fragile ;
- réutiliser ou adapter une activité ;
- comprendre l'histoire d'un outil ou d'un corpus.

## Champs communautaires ajoutés

Les champs suivants ont été ajoutés progressivement aux fiches centrales, avec valeurs par défaut pour les autres :

```js
communityUse: "Réutilisable pour concevoir une activité d'intercompréhension écrite.",
reuseHint: "Peut servir de modèle pour une séquence courte ou être adapté à d'autres langues.",
contributionHint: "Ajouter liens, captures, responsables ou versions récupérables.",
audience: ["enseignants", "chercheurs", "ingénieurs pédagogiques"]
```

## Éléments conservés de la v0.3

- Vue détail par fiche.
- Relations typées.
- Carte relationnelle.
- Exports JSON et CSV.
- Champs `evidence`, `confidence`, `sourceStatus`, `lastChecked` et `todo`.
- Campagne de récupération, renommée et reformulée collectivement.

## Limites

- Les parcours d'usage sont des raccourcis simples, pas encore des vues dédiées persistantes.
- Les champs communautaires ne sont pas encore renseignés finement pour toutes les fiches.
- La contribution reste simulée par des indications ; il n'y a pas encore de formulaire ou dépôt réel.
- La traçabilité documentaire n'est pas encore liée à des pages ou segments précis des entretiens.

## Pistes v0.5

- Ajouter un mode contribution avec formulaire local ou brouillon exportable.
- Ajouter des filtres par public cible.
- Ajouter des vues "enseignants", "chercheurs", "maintenance" et "réseaux".
- Ajouter une priorité communautaire distincte de la priorité de récupération.
- Ajouter des champs de licence, droits et accessibilité.
- Ajouter une matrice ressources x publics x réutilisations possibles.

## Vérifications

- Vérification syntaxique de `data.js` et `script.js`.
- Vérification des sections communautaires ajoutées.
- Vérification des parcours d'usage.
- Vérification de la fiche détaillée réorganisée.
- Vérification de la campagne "Ressources à sauver ensemble".
- Vérification des champs communautaires.
- Vérification responsive mobile.
- Vérification qu'aucune erreur console n'est présente.

## Confirmation de périmètre

Aucun autre prototype n'a été modifié. Les changements de la v0.4 sont strictement limités à `prototypes/07-informaticaire`.

Les fichiers du dossier `prototypes/07-informaticaire/entretiens` n'ont pas été modifiés.
