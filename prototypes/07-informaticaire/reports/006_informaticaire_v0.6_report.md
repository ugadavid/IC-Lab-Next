# Rapport 006 - Informaticaire v0.6

## Objectif de la v0.6

Préparer une version partageable et démontrable d'Informaticaire, compréhensible rapidement par des enseignants, chercheurs, ingénieurs pédagogiques ou membres d'un réseau IC.

La v0.6 rend plus visibles :

- ce qu'est Informaticaire ;
- à quoi il sert ;
- comment chercher ;
- comment contribuer ;
- pourquoi certaines ressources sont à sauver ;
- comment l'outil pourrait servir à la communauté IC.

## Fichiers modifiés

- `prototypes/07-informaticaire/index.html`
- `prototypes/07-informaticaire/styles.css`
- `prototypes/07-informaticaire/script.js`
- `prototypes/07-informaticaire/README.md`

## Fichiers créés

- `prototypes/07-informaticaire/reports/006_informaticaire_v0.6_report.md`

## Visite guidée ajoutée

Une section `Découvrir Informaticaire en 5 étapes` a été ajoutée.

Elle contient cinq boutons :

1. Comprendre le projet.
2. Explorer la mémoire des ressources.
3. Voir les liens entre acteurs, projets et outils.
4. Identifier les ressources à sauver.
5. Préparer une contribution.

Chaque bouton fait défiler la page vers la section correspondante et applique une surbrillance temporaire.

## Démo rapide ajoutée

Une section `Démo rapide` présente un parcours Galanet :

- chercher Galanet ;
- voir son historique ;
- repérer ses liens avec Galapro, Miriadi et APICAD ;
- constater sa fragilité ;
- identifier qui peut aider ;
- préparer une contribution.

Le bouton `Lancer le parcours Galanet` remplit la recherche, met Galanet en focus, prépare la fiche cible dans le formulaire de contribution et ouvre la fiche détaillée.

## Indicateurs ajoutés

Le haut de page affiche désormais cinq indicateurs calculés côté navigateur :

- nombre de fiches documentées ;
- nombre de ressources à sauver ensemble ;
- nombre de fiches à partager en priorité ;
- nombre de publics cibles ;
- nombre de relations typées.

Dans l'état actuel des données, ils affichent :

- 42 fiches documentées ;
- 11 ressources à sauver ensemble ;
- 10 fiches à partager en priorité ;
- 5 publics cibles ;
- 64 relations typées.

## Section limites publiques ajoutée

Une section `Ce prototype n'est pas encore...` a été ajoutée pour clarifier les précautions :

- ce n'est pas une base officielle ;
- ce n'est pas une base exhaustive ;
- les droits et accès doivent être vérifiés ;
- les contributions sont préparées localement puis relues humainement ;
- les données viennent d'une première exploitation d'entretiens et doivent être consolidées collectivement.

## Section décisions communautaires ajoutée

Une section `Prochaines décisions communautaires` a été ajoutée.

Elle formule les questions à trancher :

- Qui valide les fiches ?
- Où héberger durablement l'outil ?
- Quels droits pour les ressources ?
- Qui peut contribuer ?
- Quel lien avec APICAD, REPLI4C, Miriadi ou l'UGA ?
- Quelle politique de sauvegarde ?
- Quelle gouvernance minimale ?

## README amélioré

Le `README.md` a été réécrit pour être présentable :

- présentation courte ;
- publics visés ;
- fonctionnalités ;
- méthode d'ouverture du prototype ;
- structure des fichiers ;
- limites ;
- pistes ;
- historique des versions v0.1 à v0.6.

## Limites

- La visite guidée reste volontairement simple : elle scrolle vers des sections existantes et applique une surbrillance, sans moteur de tutoriel complexe.
- La démo rapide est centrée sur Galanet ; d'autres scénarios pourraient être ajoutés pour ALPAGA, REPLI4C, Miriadi, EuRom ou le Portail PLE.
- Les compteurs reposent sur les données locales actuelles et sur la liste statique des fiches à partager en priorité.
- Les contributions restent locales, sans stockage serveur ni validation automatique.

## Pistes v0.7

- Ajouter plusieurs scénarios de démonstration par public cible.
- Préparer une version imprimable ou exportable de la fiche détaillée.
- Créer une matrice de validation communautaire.
- Ajouter un champ `governanceStatus` pour distinguer les fiches validées, en discussion ou à relire.
- Préparer une maquette de dépôt communautaire ou d'hébergement pérenne.
- Ajouter des liens sources vérifiés quand les droits et accès auront été clarifiés.

## Vérifications

- Vérification syntaxique de `data.js`.
- Vérification syntaxique de `script.js`.
- Vérification navigateur de la page locale.
- Vérification des compteurs : 42, 11, 10, 5, 64.
- Vérification de la présence des 5 étapes de visite guidée.
- Vérification de la démo Galanet et de l'ouverture de la fiche détaillée.
- Vérification de la section limites publiques.
- Vérification de la section décisions communautaires.
- Vérification mobile de l'absence de débordement horizontal.

## Confirmation de périmètre

La v0.6 a été réalisée uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas été modifié.

Aucun autre prototype n'a été modifié.
