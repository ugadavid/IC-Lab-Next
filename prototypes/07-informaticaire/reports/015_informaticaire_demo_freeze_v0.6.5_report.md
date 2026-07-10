# Rapport 015 - Gel demo Informaticaire v0.6.5

## Objectif

Mettre a jour le document de gel de demonstration apres l'ajout des liens externes verifies dans Informaticaire v0.6.5.

Cette mission ne cree pas de fonctionnalite nouvelle. Elle fige et documente l'etat demontrable apres la mission 014.

## Version gelee

Version gelee pour demonstration : **v0.6.5**.

Cette version consolide :

- le hotfix recherche/alias v0.6.1 ;
- le registre acteurs v0.6.2 ;
- la fusion Sandra Garbarino v0.6.3 ;
- le flux de correction de fiches v0.6.4 ;
- les liens externes verifies v0.6.5.

## Fichiers crees ou modifies

Fichier modifie :

- `DEMO_FREEZE.md`

Fichier cree :

- `reports/015_informaticaire_demo_freeze_v0.6.5_report.md`

## Absence de modification fonctionnelle

Aucune fonctionnalite n'a ete ajoutee ou modifiee pendant cette mission.

La mise a jour porte uniquement sur le gel de demonstration et sur le present rapport.

## Liens externes integres dans le gel

`DEMO_FREEZE.md` mentionne maintenant :

- la version gelee `v0.6.5` ;
- la structure `externalLinks` dans les fiches centrales ;
- 19 fiches structurees pour les liens externes ;
- 16 fiches avec au moins un lien externe ;
- 20 liens externes ajoutes ;
- des liens externes verifies visibles dans les fiches detaillees ;
- les badges `Lien verifie`, `Lien a verifier` et `Sans lien` ;
- la contribution de type `lien externe` ;
- l'ouverture des liens avec `target="_blank"` et `rel="noopener noreferrer"` ;
- le fait que certains liens restent volontairement a verifier.

Les elements precedents sont conserves :

- 42 fiches documentees comme repere de demonstration ;
- 32 fiches acteurs ;
- 15 personnes interviewees presentes ;
- une fiche unique `Sandra Garbarino`, interviewee et citee ;
- le flux `Proposer une correction` depuis les fiches detaillees.

## Parcours de demo mis a jour

Le parcours recommande ajoute maintenant :

- ouvrir `Miriadi` et montrer les liens externes ;
- ouvrir `EuRom / EuRom Web` et montrer le site officiel ;
- ouvrir `Galanet` et expliquer la logique d'archive a verifier ;
- ouvrir `Galatea` pour montrer une fiche sans lien confirme ;
- montrer une contribution de type `lien externe`.

## Limites mises a jour

Les limites a annoncer incluent maintenant :

- les liens externes ne prouvent pas que la ressource est complete, reutilisable ou juridiquement diffusable ;
- certains liens sont indirects, archives ou encore a confirmer comme sources officielles ;
- les droits, licences et acces restent a verifier ;
- les statuts d'accessibilite doivent etre revus regulierement.

## Verifications rapides

Verification depuis `data.js` :

- nombre total d'items dans les donnees actuelles : 64 ;
- 32 fiches acteurs ;
- 15 fiches acteurs avec `interviewed: true` ;
- une seule fiche Sandra : `Sandra Garbarino` ;
- 19 fiches avec structure `externalLinks` ;
- 16 fiches avec au moins un lien externe ;
- 20 liens externes ajoutes ;
- des liens restent volontairement a verifier lorsque la source est indirecte, archivee ou non confirmee comme officielle.

Verification documentaire :

- `DEMO_FREEZE.md` contient la version `v0.6.5` ;
- les chiffres des liens externes sont presents ;
- le parcours de demo mentionne Miriadi, EuRom / EuRom Web, Galanet, Galatea et la contribution de type lien externe ;
- les limites de liens externes sont explicites ;
- l'avertissement git sur `prototypes/00-ic-hub` est conserve.

## Confirmation de perimetre

La mission 015 a ete realisee uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas ete modifie.

Aucun autre prototype n'a ete modifie.

## Rappel git

Des changements preexistants sont visibles dans `prototypes/00-ic-hub`.

Ils restent hors perimetre et ne doivent pas etre embarques dans une livraison, un commit ou un gel Informaticaire.
