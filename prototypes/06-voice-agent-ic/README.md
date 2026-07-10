# Prototype 06 - Agent vocal IC

## Objectif

Ce prototype V0.1 teste une interaction orale simple inspirée de REPLI4C entre un étudiant francophone et une étudiante espagnole.

REPLI4C étudie des échanges télécollaboratifs plurilingues entre étudiants d'Argentine, du Brésil, d'Espagne, d'Italie et de France. Les participants communiquent en intercompréhension : chacun s'exprime dans sa propre langue romane, sans viser la traduction complète.

Le prototype ne cherche pas à produire une application complète. Il sert à rendre observable une situation d'intercompréhension orale autour de témoignages liés au changement climatique.

## Fichiers

- `index-0.0.1.html` : page autonome du prototype.
- `index-0.0.2.html` : variante expérimentale en table ronde plurilingue.
- `index-0.0.3.html` : variante expérimentale en rencontre plurilingue incarnée.
- `index-0.0.3.1.html` : passe UX/UI de mise en scène de la rencontre.
- `index-0.0.3.2.html` : passe UX/UI centrée sur émotion, présence et respiration visuelle.
- `index-0.0.3.3.html` : variante centrée sur le contrôle audio de la rencontre.
- `index-0.0.4.html` : variante V0.4 avec données structurées.
- `style.css` : mise en forme de l'interface.
- `style-0.0.3.css` : styles propres à la rencontre visuelle V0.3.
- `style-0.0.3.1.css` : styles propres à la scène centrale V0.3.1.
- `style-0.0.3.2.css` : styles propres à la scène plus sensible V0.3.2.
- `style-0.0.3.3.css` : styles V0.3.2 conservés avec contrôles audio ajoutés.
- `style-0.0.4.css` : styles issus de la V0.3.5, conservés pour la V0.4.
- `data-0.0.4.js` : catalogues structurés des langues, lieux, personnages et scénarios.
- `script.js` : scénario codé en dur, transcription, réponses vocales et observations IC.
- `script-0.0.2.js` : scénario V0.2 codé en dur pour plusieurs témoignages.
- `script-0.0.3.js` : scénario V0.3 codé en dur avec participants visibles et états de rencontre.
- `script-0.0.3.1.js` : scénario V0.3.1 avec focus visuel, progression et prise de parole utilisateur.
- `script-0.0.3.2.js` : copie autonome du scénario V0.3.1 pour ajustements fins de la V0.3.2.
- `script-0.0.3.3.js` : scénario V0.3.2 avec séparation entre lecture automatique, pause, reprise, stop et relecture manuelle.
- `script-0.0.4.js` : logique V0.3.5 adaptée pour reconstruire l'affichage depuis les catalogues.
- `README.md` : intention pédagogique et limites.

## Fonctionnement

1. L'utilisateur clique sur `Démarrer l'échange`.
2. Une consigne en français apparaît.
3. Clara, étudiante espagnole à Valencia, lance un témoignage sur les étés plus longs et plus chauds.
4. L'utilisateur clique sur `Parler`.
5. Si le navigateur accepte la reconnaissance vocale, la parole est transcrite en français.
6. Si le micro n'est pas disponible, l'utilisateur peut écrire une phrase courte dans la zone de saisie.
7. L'agent répond avec une relance scénarisée, lue à voix haute.
8. L'historique et la zone `Observation IC` rendent visibles quelques indices.

## Données scénarisées

Le scénario est volontairement codé en dur dans un objet JavaScript.

Il contient :

- une consigne ;
- une première prise de parole de Clara ;
- quatre tours de réponse possibles ;
- une réponse de clarification en cas d'entrée peu reconnue ;
- des indices IC associés à chaque tour.

Le scénario V0.1 est centré sur :

- les conséquences ressenties du changement climatique ;
- les expériences quotidiennes ;
- les émotions ;
- l'adaptation ;
- la construction progressive d'une compréhension commune.

Un dernier tour introduit un très court témoignage italien afin de commencer à tester une situation plurilingue simple.

## Que permet d'observer ce prototype sur la compréhension orale entre langues romanes proches ?

Le prototype permet d'observer comment un francophone peut construire du sens à partir d'indices partiels dans une langue romane proche, principalement l'espagnol, puis très brièvement l'italien.

Il met en évidence plusieurs phénomènes :

- les mots transparents facilitent une première compréhension globale ;
- la compréhension peut avancer sans traduction complète ;
- la négociation du sens peut stabiliser l'échange au lieu de le bloquer ;
- la reformulation aide à transformer un témoignage en repères plus accessibles ;
- la reconstruction progressive du sens s'appuie sur des mots proches, des émotions et des expériences concrètes ;
- l'incertitude peut être acceptée comme une condition normale de l'intercompréhension.

L'intérêt principal est donc de rendre visibles des micro-stratégies d'intercompréhension orale : repérer des ressemblances, accepter l'incertitude, demander une précision, reformuler et reconstruire le sens à partir de quelques appuis partagés.

## Limites V0

- Le prototype dépend des API vocales disponibles dans le navigateur.
- La reconnaissance vocale fonctionne surtout dans Chrome ou Edge.
- Les réponses de l'agent ne sont pas générées par IA : elles sont scénarisées en dur.
- Aucun backend, aucun stockage et aucune analyse linguistique réelle ne sont inclus.
- Les indices IC sont des hypothèses pédagogiques affichées pour discussion.

## Pistes d'itération

- Ajouter plusieurs témoignages courts inspirés de REPLI4C.
- Comparer des voix et témoignages en espagnol, italien, portugais, français et catalan.
- Ajouter un mode d'observation enseignant.
- Exporter l'historique de l'échange.
- Affiner les indices IC après test avec des utilisateurs.

## Variante V0.2 - Table ronde plurilingue

La version `index-0.0.2.html` explore une autre hypothèse pédagogique sans remplacer la V0.1.

Question testée :

> L'intercompréhension est-elle mobilisée différemment lorsque plusieurs langues romanes sont présentes simultanément ?

La V0.2 ne simule plus un dialogue avec une seule interlocutrice. Elle propose une mini-table ronde avec trois témoignages très courts :

- Clara, Espagne : étés plus longs et plus chauds à Valencia ;
- Marco, Italie : périodes de sécheresse plus fréquentes ;
- Ana, Brésil : pluies plus fortes qu'avant.

Chaque témoignage est affiché et lu vocalement. L'utilisateur francophone répond ensuite à une question commune : quels changements ont été compris et quels points communs apparaissent ?

La logique reste volontairement simple :

- scénario codé en dur ;
- reconnaissance vocale ou saisie de secours ;
- synthèse vocale navigateur ;
- historique de l'échange ;
- observations IC scénarisées à partir de mots-clés ;
- aucun backend ;
- aucune IA ;
- aucun appel externe.

Cette variante cherche surtout à observer comment une compréhension globale peut se construire à partir de plusieurs indices partiels répartis dans différentes langues romanes.

## Variante V0.3 - Rencontre plurilingue incarnée

La version `index-0.0.3.html` conserve la V0.2 comme référence, mais déplace l'hypothèse vers l'engagement visuel.

Question testée :

> L'engagement de l'utilisateur augmente-t-il lorsque les participants sont incarnés visuellement plutôt que présentés uniquement sous forme de texte ?

La V0.3 reprend les trois mêmes témoignages courts, mais Clara, Marco et Ana deviennent des participants visibles. Un seul intervenant est actif à la fois. Les autres restent présents en arrière-plan avec un état simple :

- attente ;
- parole ;
- écoute ;
- réflexion.

Le scénario reste volontairement limité :

- avatars stylisés en HTML/CSS ;
- témoignages successifs ;
- synthèse vocale navigateur ;
- reconnaissance vocale ou saisie de secours ;
- historique ;
- observations IC scénarisées ;
- aucune IA ;
- aucun backend ;
- aucun appel externe.

Cette variante cherche à observer si la mémoire des personnes, des voix et des langues aide l'apprenant à reconstruire un sens global : Clara est associée à la chaleur, Marco à la sécheresse, Ana aux pluies plus fortes.

## Variante V0.3.1 - Mise en scène de la rencontre

La version `index-0.0.3.1.html` conserve la V0.3 comme base conceptuelle, mais renforce fortement la mise en scène UX/UI.

Question testée :

> L'utilisateur s'engage-t-il davantage lorsque la rencontre ressemble visuellement à une interaction avec des personnes plutôt qu'à un tableau de bord ?

Cette passe ajoute :

- une grande scène centrale pour la personne active ;
- un portrait agrandi pour l'intervenant qui parle ;
- des participants secondaires visibles en retrait ;
- des états visuels simples : parle, écoute, attend, réflexion ;
- une bulle de parole plus présente ;
- un indicateur de progression `1 / 4` jusqu'à la question commune ;
- un déroulé latéral ;
- une zone de réponse pensée comme prise de parole de l'utilisateur.

La logique technique reste inchangée : HTML/CSS/JS autonome, scénario codé en dur, synthèse vocale navigateur, reconnaissance vocale ou saisie de secours, aucun backend et aucune IA.

## Variante V0.3.2 - Présence et respiration visuelle

La version `index-0.0.3.2.html` conserve la V0.3.1 comme référence, mais travaille davantage l'émotion, la présence et la lisibilité.

Question testée :

> Une incarnation plus chaleureuse et plus lisible augmente-t-elle l'envie de participer à une rencontre plurilingue REPLI4C ?

Cette passe ne change pas la logique pédagogique. Elle ajuste surtout :

- l'espace donné à la scène centrale ;
- la taille et la présence du portrait actif ;
- l'expressivité de la bulle de parole ;
- la discrétion des participants secondaires ;
- la densité de l'Observation IC ;
- l'invitation à répondre comme prise de parole.

Cette version prépare aussi des ajustements manuels ultérieurs : avatars, couleurs, scène, bulle et disposition des participants sont principalement contrôlés dans `style-0.0.3.2.css`.

## Variante V0.3.3 - Contrôle audio

La version `index-0.0.3.3.html` conserve l'état visuel courant de la V0.3.2, y compris les images, les fonds et les effets de présence.

Elle isole la logique audio afin que la relecture d'un moment actif ne fasse plus avancer automatiquement la séquence. Elle ajoute aussi des contrôles explicites :

- pause ;
- reprendre ;
- réécouter le moment actif ;
- stop.

La règle principale est simple : seule la lecture normale de la séquence peut faire passer au participant suivant. Une relecture manuelle relit le moment affiché, mais ne déclenche jamais l'étape suivante.

## Variante V0.4 - Données structurées

La version `index-0.0.4.html` conserve l'interface, la scène collective, les effets visuels, la reconnaissance vocale, la synthèse vocale et les contrôles audio, mais extrait les données dans `data-0.0.4.js`.

Cette V0.4 introduit quatre catalogues :

- `languageCatalog` ;
- `placeCatalog` ;
- `characterCatalog` ;
- `scenarioCatalog`.

Le script principal reconstruit les participants à partir des références du scénario. Le nom vient du personnage, la langue vient du catalogue des langues, le fond vient du lieu, et le texte vient de l'étape scénarisée.

L'objectif est de préparer une future bibliothèque de rencontres plurilingues sans devoir réécrire la logique principale à chaque nouveau personnage, lieu, langue ou scénario.
