# Prototype 06 — Notes de conception internes

## Point de départ

Le prototype 06 est parti d’une hypothèse technique simple :

> Peut-on créer une interaction vocale d’intercompréhension entre un utilisateur francophone et un agent parlant une autre langue romane ?

La première V0 a permis de vérifier que le navigateur pouvait déjà fournir une base fonctionnelle suffisante :

* reconnaissance vocale ;
* synthèse vocale ;
* scénario codé en dur ;
* historique ;
* observations IC.

## Pivot pédagogique

Le premier scénario, centré sur une situation de type “bibliothèque / itinéraire”, a rapidement été jugé trop générique.

Le prototype a alors été réaligné avec REPLI4C :

> préparer un étudiant francophone à écouter et reconstruire des témoignages plurilingues liés aux conséquences du changement climatique.

Ce pivot a transformé le prototype d’un exercice vocal en une situation d’intercompréhension contextualisée.

## Passage à la table ronde

La V0.2 a introduit trois témoignages courts :

* Clara, Espagne ;
* Marco, Italie ;
* Ana, Brésil.

La question n’était plus seulement :

> Est-ce que l’utilisateur comprend une phrase dans une autre langue ?

mais :

> Est-ce qu’il peut reconstruire un thème commun à partir de plusieurs langues romanes ?

## Passage à la rencontre incarnée

Les versions suivantes ont montré que la présentation sous forme de cartes textuelles restait trop plate.

L’hypothèse UX est alors devenue :

> L’engagement augmente-t-il lorsque les témoignages sont portés par des personnes visibles, situées dans des lieux, plutôt que présentés comme de simples textes audio ?

Cette étape a introduit :

* personnages visibles ;
* fonds situés ;
* bulle de parole ;
* états de rencontre ;
* effets subtils de présence ;
* scène collective finale.

## Principe de design retenu

Les images ne doivent pas être décoratives.

Elles doivent associer :

* une personne ;
* une langue ;
* un lieu ;
* une expérience climatique ;
* une voix ;
* un témoignage.

Le prototype ne cherche donc plus seulement à faire entendre des langues.

Il cherche à mettre en scène une rencontre plurilingue.

## Principe d’animation

Les animations doivent être très discrètes.

Règle retenue :

> Faire sentir la vie sans montrer l’effet.

La respiration du personnage, le halo, les mouvements de fond et les réactions de la bulle doivent rester presque imperceptibles.

L’utilisateur doit ressentir que la scène est vivante, sans identifier consciemment les effets.

## Ce que le prototype permet maintenant d’observer

La version incarnée permet d’observer :

* si l’utilisateur identifie mieux qui parle ;
* si l’association personne / langue / lieu facilite la mémorisation ;
* si la présence visuelle augmente l’envie de répondre ;
* si la scène collective aide à transformer trois écoutes successives en compréhension globale ;
* si l’Observation IC accompagne l’activité sans l’écraser.

## Point important

Le prototype ne repose toujours pas sur une IA conversationnelle.

Il reste volontairement :

* scénarisé ;
* contrôlé ;
* sans backend ;
* sans génération libre ;
* centré sur l’observation pédagogique.

Cette contrainte est importante : elle permet de tester la mise en scène de l’intercompréhension avant d’introduire une intelligence artificielle plus ouverte.

## Pistes ouvertes

À moyen terme :

* ajouter davantage de personnages ;
* couvrir plus de langues romanes ;
* inclure le français comme langue possible de participant ;
* ajouter le roumain ;
* explorer des langues romanes minoritaires ;
* proposer deux personnages par langue ;
* permettre à l’étudiant de choisir un avatar ;
* envisager une personnalisation légère de l’avatar.

Ces pistes ne doivent pas être développées immédiatement.

Elles indiquent simplement que le prototype pourrait évoluer vers un environnement de rencontre plurilingue plus large.

## Formulation provisoire

Le Prototype 06 n’est plus seulement un agent vocal.

Il devient une simulation de rencontre plurilingue REPLI4C destinée à préparer l’entrée dans des échanges d’intercompréhension autour des conséquences du changement climatique.
