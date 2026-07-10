# Rapport 012 - Gel demo Informaticaire v0.6.3

## Objectif

Mettre a jour le document de gel de demonstration apres le hotfix v0.6.3, qui fusionne les fiches `Sandra` et `Sandra Garbarino` en une seule fiche acteur.

## Version gelee

Version gelee pour demonstration : **v0.6.3**.

Cette version correspond a l'etat demontrable v0.6 consolide par :

- le hotfix recherche/alias v0.6.1 ;
- le registre acteurs v0.6.2 ;
- la fusion Sandra Garbarino v0.6.3.

## Fichiers crees ou modifies

Fichier modifie :

- `DEMO_FREEZE.md`

Fichier cree :

- `reports/012_informaticaire_demo_freeze_v0.6.3_report.md`

## Absence de modification fonctionnelle

Aucune fonctionnalite n'a ete ajoutee ou modifiee.

Les fichiers de code et de donnees n'ont pas ete modifies dans cette mission. La mise a jour porte uniquement sur le document de gel de demonstration et sur le present rapport.

## Mises a jour du gel

`DEMO_FREEZE.md` indique desormais :

- version gelee : `v0.6.3` ;
- 32 fiches acteurs dans le registre ;
- 15 personnes interviewees presentes ;
- une fiche unique `Sandra Garbarino`, interviewee et citee ;
- maintien de l'avertissement git sur les changements preexistants dans `prototypes/00-ic-hub`.

Le parcours de demo recommande a ete complete pour inclure :

- clic sur le filtre `Acteurs` ;
- recherche `Sandra` ;
- recherche `Sandra Garbarino` ;
- recherche `JP` ;
- recherche `Katia` ;
- recherche `Louise Dabene` ;
- recherche `EuRom 5`.

La checklist des recherches de test avant presentation a ete mise a jour avec :

- `Sandra`
- `Sandra Garbarino`
- `Garbarino`
- `Christian`
- `Katia`
- `JP`
- `Chavagne`
- `Hugues`
- `Louise Dabene`
- `Claire Blanche-Benveniste`
- `EuRom 5`
- `EuRom5`
- `Galanet`

## Coherence du registre acteurs

Verification rapide depuis `data.js` :

- nombre de fiches `type: "acteur"` : 32 ;
- nombre de fiches acteurs avec `interviewed: true` : 15 ;
- une seule fiche Sandra existe dans le registre ;
- l'ID conserve est `sandra` ;
- le titre affiche est `Sandra Garbarino` ;
- `actorKind` vaut `personne interviewee et citee` ;
- `interviewed` vaut `true` ;
- les alias `Sandra`, `Sandra Garbarino` et `Garbarino` sont presents.

## Verifications rapides effectuees

Verifications statiques :

- lecture de `DEMO_FREEZE.md` ;
- controle du nombre d'acteurs et d'interviewes depuis `data.js` ;
- controle de l'unicite de la fiche Sandra Garbarino ;
- controle des recherches de test avec la logique de normalisation et de classement de l'interface.

Toutes les recherches suivantes retournent au moins une fiche pertinente :

- `Sandra`
- `Sandra Garbarino`
- `Garbarino`
- `Christian`
- `Katia`
- `JP`
- `Chavagne`
- `Hugues`
- `Louise Dabene`
- `Claire Blanche-Benveniste`
- `EuRom 5`
- `EuRom5`
- `Galanet`

Resultats de tete verifies :

- `Sandra`, `Sandra Garbarino` et `Garbarino` retournent `Sandra Garbarino` en premier resultat ;
- `EuRom 5` et `EuRom5` retournent `EuRom / EuRom Web` en premier resultat ;
- `Galanet` retourne `Galanet` en premier resultat ;
- `JP` et `Chavagne` retrouvent `Jean-Pierre Chavagne`.

## 404 statique non bloquant

Aucun nouveau smoke test navigateur n'a ete necessaire pour cette mission, car elle ne modifie pas l'interface ni le code fonctionnel.

Le 404 de ressource statique non bloquant observe pendant la verification du hotfix v0.6.3 reste mentionne comme point de vigilance. Il n'avait pas bloque la recherche, le filtre Acteurs, la demo Galanet, les exports ou l'affichage mobile.

## Confirmation de perimetre

La mission 012 a ete realisee uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas ete modifie.

Aucun autre prototype n'a ete modifie.

Les changements preexistants dans `prototypes/00-ic-hub` restent hors perimetre et ne doivent pas etre embarques dans un gel ou une livraison Informaticaire.
