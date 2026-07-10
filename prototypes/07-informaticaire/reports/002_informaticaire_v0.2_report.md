# Rapport 002 - Informaticaire v0.2

## Objectif de la v0.2

Renforcer l'utilité scientifique et documentaire du prototype Informaticaire en ajoutant trois dimensions : des liens internes entre fiches, une traçabilité par entretien et une campagne de récupération des ressources fragiles.

La v0.2 ajoute aussi une section explicative "Pourquoi Informaticaire ?" pour préciser le concept : conserver, documenter, relier, retrouver, rendre réutilisable, préparer la maintenance et préparer la transmission.

## Fichiers créés

- `reports/002_informaticaire_v0.2_report.md`

## Fichiers modifiés

- `index.html`
- `styles.css`
- `data.js`
- `script.js`
- `README.md`

## Liens internes ajoutés

La structure `relatedItems` a été ajoutée aux fiches importantes. Les liens sont affichés dans chaque carte sous la forme "Lié à". Un clic sur un lien interne filtre la bibliothèque sur la fiche liée.

Relations prioritaires intégrées :

- Galatea -> Galanet -> Galapro -> Miriadi
- Miriadi -> APICAD -> Lecturio
- ALPAGA -> REPLI4C -> Romanofonía y Cinema
- Sandra -> ELAN -> Speechmatics -> corpus multimodal
- Encarni -> Galanet -> Galapro -> Miriadi -> évaluation
- Jean-Pierre -> Galanet -> Galapro -> Miriadi -> APICAD
- Christian -> Romanofonía -> ALPAGA -> REPLI4C -> Moodle
- Kátia -> Sciences du langage -> politique linguistique -> pérennisation

## Structure evidence ajoutée

Le champ `evidence` prépare une traçabilité par entretien sans imposer encore de citations page par page.

Format ajouté :

```js
evidence: [
  {
    interview: "Jean-Pierre Chavagne",
    note: "Décrit Galanet comme plateforme centrale avec forum, chat, dépôt de documents et production collective."
  }
]
```

Les notes de traçabilité ont été ajoutées aux fiches centrales : Galatea, Galanet, Galapro, Miriadi, APICAD, Lecturio, ALPAGA, REPLI4C, Romanofonía y Cinema, EuRom, Sandra, Christian, Encarni, Jean-Pierre, Kátia, ELAN, Speechmatics, corpus multimodal, aides à la compréhension orale, politique linguistique, pérennisation et annotation/transcription.

## Structure recovery ajoutée

Le champ `recovery` organise les ressources fragiles en campagne de récupération.

Format ajouté :

```js
recovery: {
  priority: "haute",
  status: "à contacter",
  nextAction: "Demander à Christian et Jean-Pierre s'ils disposent de captures ou d'archives.",
  responsible: "à définir",
  contacts: ["christian", "jean-pierre"]
}
```

L'interface affiche ces données dans une section dédiée "Campagne de récupération".

## Éléments ajoutés à la campagne de récupération

- Galanet
- Galapro
- Galatea / CD-ROM
- Itinéraires romans
- Aides à la compréhension orale
- Archives Miriadi anciennes
- Corpus vidéo ALPAGA / REPLI4C
- Ressources UNITA
- Ressources Elementi di intercomprensione UniTO
- Portail PLE cité par Kátia

## Autres ajouts de données

Quelques fiches complémentaires ont été ajoutées pour rendre les relations demandées navigables :

- Archives Miriadi anciennes
- Ressources UNITA
- Corpus multimodal
- Moodle
- Évaluation
- Sciences du langage
- Politique linguistique
- Pérennisation

## Limites

- Les preuves restent des notes synthétiques par entretien, sans page ni extrait exact.
- Les liens internes sont des relations éditoriales simples, pas encore un graphe typé.
- Le clic sur une relation filtre la bibliothèque sur la fiche liée ; il n'existe pas encore de page détail séparée.
- Les contacts de récupération sont indicatifs et doivent être validés.
- Les priorités de récupération sont provisoires.

## Pistes v0.3

- Créer une vraie vue détail par fiche.
- Ajouter des types de relations : hérite de, prolonge, utilise, cite, maintient, récupère.
- Ajouter références page par page ou segment par segment depuis les PDF.
- Ajouter une vue graphe acteurs-projets-ressources.
- Ajouter une vue tableau pour piloter la campagne de récupération.
- Ajouter des champs `todo`, `confidence`, `sourceStatus` et `lastChecked`.
- Préparer un export JSON/CSV des fiches et de la campagne.

## Vérifications

- Vérification syntaxique de `data.js` et `script.js`.
- Vérification navigateur de l'affichage initial.
- Vérification du nombre de fiches, de la frise, des besoins, de la campagne et des cartes fragiles.
- Vérification du clic sur un lien interne.
- Vérification du filtre et de la recherche.
- Vérification responsive mobile sans débordement horizontal.
- Vérification qu'aucune erreur console n'est présente.

## Confirmation de périmètre

Aucun autre prototype n'a été modifié. Les changements de la v0.2 sont strictement limités à `prototypes/07-informaticaire`.

Les fichiers du dossier `prototypes/07-informaticaire/entretiens` n'ont pas été modifiés.
