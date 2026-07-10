# Voice Lab - Synthèse vocale navigateur

## Objectif du POC

Voice Lab est un POC autonome pour explorer les voix disponibles via l'API navigateur `speechSynthesis`.

Il permet de lister les voix détectées, de filtrer les langues romanes utiles à IC-Lab, de choisir une voix, de modifier le texte lu et de tester les paramètres de lecture : vitesse, hauteur et volume.

## Fonctionnalités

- Liste toutes les voix renvoyées par `speechSynthesis.getVoices()`.
- Affiche pour chaque voix le nom, la langue, `default`, `localService` et l'URI quand elle existe.
- Filtre les voix par famille de langues : français, espagnol, italien, portugais, catalan et roumain.
- Propose des textes de test prédéfinis pour ces six langues.
- Permet de lire le texte avec une voix choisie.
- Permet de régler `rate`, `pitch` et `volume`.
- Ajoute les commandes `stop`, `pause` et `reprendre`.
- Permet de tester toutes les voix filtrées, l'une après l'autre.
- Gère le chargement différé des voix avec l'événement `voiceschanged`.

## Dépendance au navigateur et au système

Ce POC dépend entièrement des voix exposées par le navigateur et par le système d'exploitation.

Deux ordinateurs peuvent donc afficher des listes très différentes. Certaines voix viennent du système, d'autres du navigateur ou de services installés localement. La propriété `localService` aide à distinguer une voix locale d'une voix potentiellement fournie par un service.

La disponibilité, la qualité et les langues proposées varient fortement selon Chrome, Edge, Safari, Firefox, Windows, macOS, Linux, Android ou iOS.

## Intérêt pour IC-Lab

Pour IC-Lab, ce laboratoire vocal sert à choisir des voix adaptées aux prototypes d'intercompréhension orale.

Il permet d'observer :

- quelles langues romanes sont réellement disponibles sur une machine donnée ;
- si une voix espagnole, italienne, portugaise, catalane ou roumaine est assez claire pour une activité pédagogique ;
- comment la vitesse influence la compréhension entre langues proches ;
- si la synthèse vocale peut soutenir une situation d'écoute partielle sans backend.

Le POC aide donc à décider quelles contraintes vocales doivent être prévues avant de scénariser des interactions plus ambitieuses.

## Limites

- Aucune voix n'est fournie par le projet lui-même.
- Aucune voix n'est générée par IA.
- Aucun backend n'est utilisé.
- Les voix disponibles changent selon l'OS, le navigateur, les paramètres de langue et les voix installées.
- Certaines voix peuvent être visibles mais ne pas fonctionner correctement.
- Le chargement des voix peut être différé ; c'est pourquoi le code utilise `voiceschanged`.
- Les propriétés `default`, `localService` et `voiceURI` dépendent de l'implémentation du navigateur.

## Utilisation

Ouvrir `index.html` dans un navigateur moderne.

Pour un test plus fiable, utiliser Chrome ou Edge, car leur prise en charge de `speechSynthesis` et des voix système est généralement plus complète.
