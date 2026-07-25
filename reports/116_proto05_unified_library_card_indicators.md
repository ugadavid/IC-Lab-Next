# Mission 116 — Indicateurs unifiés des fiches vidéo

## Périmètre

Correction ciblée de la présentation et de l’interaction des indicateurs
synthétiques de `teacher-videos.html`. Aucun modèle, rôle, writer, catalogue,
workspace, média, traitement ou activité n’a été modifié.

## Zone commune et style

Chaque fiche possède désormais une zone sémantique
« Informations complémentaires » qui regroupe :

- `Utilisée : n` ou `Non utilisée` ;
- `n accès`.

Les deux éléments utilisent le même composant `card-indicator` : forme en
pastille, bordure et fond bleu clair, même typographie et mêmes espacements,
retour de survol, contour de focus et état ouvert bleu foncé. Cette zone reste
distincte des actions principales en grille comme en liste.

Le nombre d’accès additionne les accès originaux, copies, dérivations,
publications et accès historiques projetés. Le panneau conserve le détail
métier établi en mission 115.

## Grammaire d’interaction

Les deux indicateurs sont des boutons natifs avec `aria-controls`,
`aria-haspopup="dialog"` et `aria-expanded`.

- Le clic est l’unique interaction d’ouverture.
- Le survol ne fait qu’appliquer un retour visuel.
- Enter et Espace sont pris en charge explicitement.
- Une seconde activation ferme le panneau.
- Échap ferme et restitue le focus à l’indicateur.
- Un clic extérieur ferme le panneau.
- Chaque fonction d’ouverture ferme explicitement l’autre panneau : un seul
  panneau du groupe peut rester ouvert.

Les deux panneaux partagent la classe `indicator-panel`, la structure générale,
le composant de fermeture et le même calcul de position borné.

Le contenu des usages reste inchangé : activités, relations et autres
dépendances. Le contenu des accès conserve l’originale, la copie de travail,
les dérivations, les publications et le résumé compact des tentatives.

## Détail transitoire des versions

« Gérer les versions » continue de révéler le bloc « Versions et accès » de la
seule fiche choisie. Il reste fermé par défaut, refermable et conserve toutes
ses actions.

Ce dépliage est transitoire. Il sera remplacé par l’accès à la future page
détaillée ; cette page, sa route et son redessin ne font pas partie de la
mission 116.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `reports/116_proto05_unified_library_card_indicators.md`

## Vérifications

### Tests ciblés

- `node --test test/video-workspaces.test.js` : 5/5 réussis.
- Le test d’interface existant protège maintenant les deux appels de fermeture
  mutuelle ; aucune nouvelle batterie n’a été créée.
- `npm run check` : réussi.
- `git diff --check` : réussi, hors avertissements CRLF.
- La suite complète n’a pas été exécutée, conformément à la mission.

### Recette Chromium réelle

Recette effectuée sur 8891, fenêtre 1280 × 720, avec les 16 fiches existantes :

- regroupement et alignement sur une même ligne vérifiés en grille et en liste ;
- styles calculés identiques hors état ouvert ;
- aucun panneau ouvert au survol ;
- ouverture des usages au clic ;
- ouverture des accès au clic ;
- bascule directe usages → accès avec un seul panneau visible ;
- seconde activation, Échap et clic extérieur vérifiés ;
- focus restitué et visible ;
- activation réelle par Enter pour les usages et Espace pour les accès ;
- panneau d’usages près du bord droit entièrement dans la fenêtre
  (`left=582`, `right=1062` pour une largeur de fenêtre de 1280 px) ;
- `yop` affiche `Non utilisée` et `4 accès` ;
- détail des versions fermé par défaut, puis ouvert seul et refermé ;
- menus Actions fermés par défaut ;
- console Chromium vide.

Aucune création, suppression, récupération, modification ou régénération de
média n’a été déclenchée.

## Version, Git et remise

Version obtenue : `0.1.39`.

État Git avant remise : branche `main`, en avance de 28 commits locaux sur
`origin/main`, cinq fichiers suivis modifiés par la mission et ce rapport
nouveau. Aucun autre changement n’est présent.

Validation humaine : à effectuer par David sur l’instance unique laissée sur
le port 8891.

Message de commit proposé :

`fix(proto05): unify interactive library card indicators`

Aucun commit ni push effectué.
