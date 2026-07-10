# Rapport 011 - Informaticaire v0.6.3 fusion Sandra Garbarino

## Objectif du hotfix

Fusionner les deux fiches créées séparément lors de la mission 010 :

- `Sandra`, personne interviewée ;
- `Sandra Garbarino`, personne citée.

Correction : il s'agit de la même personne. La version v0.6.3 conserve donc une seule fiche acteur cohérente : `Sandra Garbarino`, personne interviewée et citée.

## Fiches fusionnées

Fiches concernées :

- `sandra`
- `sandra-garbarino`

## ID conservé

L'ID conservé est :

- `sandra`

L'ancien ID `sandra-garbarino` a été supprimé afin qu'il n'apparaisse plus comme une personne distincte dans le filtre `Acteurs`.

## Informations conservées

La fiche `sandra` conserve et fusionne :

- le titre complet `Sandra Garbarino` ;
- `type: "acteur"` ;
- `actorKind: "personne interviewée et citée"` ;
- `interviewed: true` ;
- les domaines liés à l'oral, aux corpus, à ELAN, Speechmatics, EuRom Web, l'intercompréhension, l'enseignement et la recherche ;
- les projets mentionnés : EuRom Web, ELAN, Speechmatics, NoSketch Engine, KiParla ;
- les ressources mentionnées : corpus multimodal, Elementi di intercomprensione UniTO ;
- les alias : `Sandra`, `Sandra Garbarino`, `Garbarino` ;
- les champs communautaires ;
- les relations vers ELAN, Speechmatics et corpus multimodal ;
- les éléments de traçabilité documentaire déjà attachés à Sandra.

## Références internes corrigées

- `sandra-garbarino` a été retiré des listes internes du registre d'acteurs.
- La carte relationnelle affiche désormais `Sandra Garbarino`.
- Les relations existantes vers `sandra` sont conservées.
- Aucun `relatedItems`, `relations` ou `recovery.contacts` ne pointe vers un ID inexistant.

## Nombre de fiches acteurs avant / après

Avant le hotfix v0.6.3 :

- 33 fiches `type: "acteur"`.

Après fusion :

- 32 fiches `type: "acteur"`.

La diminution correspond uniquement à la suppression du doublon `sandra-garbarino`.

## Vérifications effectuées

Vérifications statiques :

- `node --check prototypes/07-informaticaire/data.js`
- `node --check prototypes/07-informaticaire/script.js`
- vérification de l'absence de l'ancien ID `sandra-garbarino` ;
- vérification qu'il n'existe qu'une seule fiche Sandra ;
- vérification qu'aucune relation interne n'est cassée.

Vérifications navigateur :

- recherche `Sandra` ;
- recherche `Sandra Garbarino` ;
- recherche `Garbarino` ;
- filtre `Acteurs` ;
- démo Galanet ;
- recherche `EuRom 5` ;
- exports JSON/CSV ;
- console navigateur sans erreur JavaScript bloquante ; un 404 de ressource statique non bloquant a été observé pendant le smoke test ;
- mobile OK.

## Limites restantes

- Les affiliations de Sandra Garbarino restent à compléter.
- Le champ `citedBy` contient encore une entrée `à compléter` pour documenter précisément les entretiens ou fiches où la citation apparaît.
- Les ressources et publications associées pourront être précisées lors d'une passe documentaire ultérieure.

## Confirmation de périmètre

Le hotfix v0.6.3 a été réalisé uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas été modifié.

Aucun autre prototype n'a été modifié.
