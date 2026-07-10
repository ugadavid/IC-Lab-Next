# Rapport 005 - Informaticaire v0.5

## Objectif de la v0.5

Renforcer la possibilité de contribution communautaire et préparer un partage réel avec des enseignants, chercheurs, ingénieurs pédagogiques et membres de réseaux IC.

La v0.5 ajoute une logique de contribution locale simulée et qualifie les fiches avec des informations utiles pour le partage : publics, droits, accessibilité, réutilisation et priorité communautaire.

## Fichiers modifiés

- `index.html`
- `styles.css`
- `data.js`
- `script.js`
- `README.md`

## Section contribution ajoutée

Une section `Contribuer` explique comment un membre de la communauté peut aider :

- signaler une ressource ;
- compléter une fiche ;
- ajouter un lien ;
- préciser un contact ;
- indiquer l'état actuel d'une plateforme ;
- ajouter une capture ou une archive ;
- corriger une référence incertaine ;
- proposer une réutilisation pédagogique.

## Formulaire local ajouté

Un formulaire local permet de préparer un brouillon de contribution avec :

- type de contribution ;
- fiche concernée ;
- titre / lien / remarque ;
- nom ou contact facultatif ;
- niveau de certitude.

Le bouton `Préparer la contribution` génère un brouillon JSON affiché dans la page. Le bouton `Exporter le brouillon JSON` permet de le télécharger côté navigateur.

## Champs droits / licence / accessibilité ajoutés

Les champs suivants ont été ajoutés progressivement :

```js
licenseStatus: "inconnu" | "à vérifier" | "réutilisable" | "restreint",
accessStatus: "accessible" | "accès limité" | "inaccessible" | "à retrouver",
rightsNote: "Droits à vérifier avant diffusion publique."
```

Priorité donnée à Galanet, Galapro, Galatea, Itinéraires romans, Romanofonía y Cinema, corpus ALPAGA / REPLI4C, ressources UNITA, Elementi di intercomprensione UniTO, Portail PLE, PHIP, EuRom / EuRom Web, ELAN et Speechmatics.

## Filtres par public ajoutés

Les filtres suivants ont été ajoutés :

- Pour enseignants
- Pour chercheurs
- Pour ingénieurs pédagogiques
- Pour réseaux / associations
- Pour formation de formateurs

Ils s'appuient sur le champ `audience`.

## Priorité communautaire ajoutée

Les champs suivants distinguent l'utilité communautaire de la priorité de récupération :

```js
communityPriority: "haute" | "moyenne" | "faible",
communityPriorityReason: "Ressource souvent citée et utile à plusieurs publics."
```

## Vue À partager en priorité ajoutée

Une section `À partager en priorité` met en avant :

- Galanet
- Miriadi
- Romanofonía y Cinema
- REPLI4C
- EuRom
- Portail PLE
- PHIP
- ELAN
- Speechmatics
- Corpus vidéo ALPAGA / REPLI4C

Chaque carte indique pourquoi la fiche compte, qui peut l'utiliser et ce qui manque pour la rendre vraiment partageable.

## Limites

- Le formulaire est local et simulé : il ne modifie pas encore les données.
- Les brouillons doivent être relus puis intégrés manuellement.
- Les statuts de droits sont indicatifs et demandent vérification.
- Les filtres par public reposent sur un champ `audience` encore perfectible.
- Il n'existe pas encore de workflow de validation communautaire.

## Pistes v0.6

- Ajouter une file locale de contributions en attente.
- Ajouter un export groupé des contributions.
- Ajouter des statuts de validation : proposé, vérifié, intégré, rejeté.
- Ajouter des champs licence plus structurés.
- Ajouter une vue "prêt à partager" avec critères complets.
- Ajouter des filtres par priorité communautaire et statut d'accès.

## Vérifications

- Vérification syntaxique de `data.js` et `script.js`.
- Vérification des champs droits/licence/accessibilité.
- Vérification des filtres par public.
- Vérification de la vue "À partager en priorité".
- Vérification du formulaire de contribution et du brouillon JSON.
- Vérification de l'export de brouillon.
- Vérification responsive mobile.
- Vérification qu'aucune erreur console n'est présente.

## Confirmation de périmètre

Aucun autre prototype n'a été modifié. Les changements de la v0.5 sont strictement limités à `prototypes/07-informaticaire`.

Les fichiers du dossier `prototypes/07-informaticaire/entretiens` n'ont pas été modifiés.
