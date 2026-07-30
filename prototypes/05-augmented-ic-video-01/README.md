# Prototype 05 — Vidéo augmentée d’intercompréhension

## Question pédagogique

Comment rendre observable ce qui se joue dans une interaction plurilingue réelle ?

Le prototype explore la possibilité de regarder une vidéo non pas seulement comme document audiovisuel, mais comme support d’observation des stratégies d’intercompréhension : clarification, négociation du sens, changements de langue, compréhension collective, gestion des mots-pièges.

## Hypothèse testée

Une transcription synchronisée et annotée peut aider un enseignant, chercheur ou apprenant à repérer des moments pédagogiquement riches dans une interaction plurilingue.

L’hypothèse n’est pas que l’annotation donne la “bonne lecture”, mais qu’elle rend discutables et visibles des phénomènes souvent fugaces.

## Mécanique du prototype

- Référentiel partagé des langues `fr`, `es`, `it`, `pt`, servi en lecture seule
  depuis `shared/reference-data/languages.json` et utilisé par toutes les
  activités Proto05.
- Locuteurs définis localement dans chaque activité, avec sélection multiple
  dans les segments des ateliers avancé et guidé ; leurs identifiants stables
  sont générés automatiquement et masqués, sans dictionnaire global.
- Lecteur vidéo pointant vers le flux HLS fourni.
- Colonne de transcription synchronisée.
- Segments cliquables qui déplacent la vidéo au timestamp associé.
- Annotation IC affichée pour le segment actif.
- Rattachement des phénomènes aux segments défini par
  `phenomena[].segmentId`; chaque phénomène conserve ses propres temps.
- Bibliothèque enseignant avec duplication et suppression explicite sécurisée
  par confirmation, sauvegarde `.bak` et remplacement atomique du JSON.
- Fiche d’identité pédagogique progressive et facultative, avec états explicites
  (`établi`, `inconnu`, `à vérifier`, `non applicable`), qualifications fondées
  sur des preuves et filiation créée uniquement par duplication pédagogique.
  Les activités historiques sans fiche restent lisibles et modifiables sans
  migration automatique.
- Badges de stratégie :
  - présentation ;
  - changement de langue ;
  - compréhension collective ;
  - clarification ;
  - négociation du sens ;
  - mot-piège ;
  - répertoire plurilingue.

Les segments sont codés en dur dans une structure JavaScript simple :

```js
{
  start: 186,
  end: 225,
  speaker: "Présentateur 1",
  text: "La carrera... comment on dit ça en français ?",
  tags: ["mot-piège", "négociation du sens", "clarification"],
  note: "Moment intéressant : le groupe discute d’un faux ami partiel entre espagnol et français."
}
```

## Limites actuelles

- Les 11 segments sont un échantillon V0 limité, issus de la transcription PDF disponible dans ce dossier et encore à vérifier contre la vidéo.
- La lecture HLS dépend de la disponibilité du flux UGA distant et du proxy fermé fourni par IC-Hub.
- La version `0.0.6.1` doit être ouverte depuis IC-Hub : une ouverture directe du fichier HTML ne donne pas accès au proxy ni à hls.js.
- Il n’y a pas de stockage, d’export ou d’édition des annotations.
- Les timestamps sont des points de départ pour discussion, pas un alignement définitif.
- Le prototype ne traite pas toute la vidéo.

## Pistes d’itération

- Produire une transcription partielle validée à partir de la vidéo et du PDF.
- Ajuster précisément les timestamps.
- Ajouter un lecteur HLS embarqué si la compatibilité navigateur devient un frein.
- Ajouter un mode “discussion” pour comparer plusieurs interprétations d’un même segment.
- Permettre l’édition locale des notes sans transformer le prototype en plateforme.
- Tester la lisibilité avec enseignants et chercheurs en IC.

## Évolution V0.0.2

La version `index-0.0.2.html` améliore l’observabilité pédagogique sans remplacer la V0.0.1.

Ajouts :

- filtres par badge de stratégie ;
- question pédagogique dédiée à chaque segment ;
- bouton “Copier l’observation” pour récupérer timestamp, locuteur, texte, tags, note IC et question.

Cette évolution vise à faciliter la discussion en entretien, en séance de recherche ou dans un mémoire, sans transformer le prototype en outil d’annotation complet.

## Évolution V0.0.3

La version `index-0.0.3.html` teste une logique de couches d’observation sans remplacer les versions précédentes.

Ajouts :

- panneau “Couches actives” avec cases à cocher pour afficher ou masquer les phénomènes observés ;
- transcription recalculée selon les couches visibles, tout en gardant la synchronisation vidéo ;
- annotation IC adaptée aux couches actives ;
- première carte flottante directement sur la vidéo pour le moment `carrera`.

Cette évolution cherche à observer si l’attention reste davantage centrée sur l’image lorsque certains indices pédagogiques apparaissent dans la vidéo elle-même plutôt que seulement dans les panneaux latéraux.

## Évolution V0.0.4

La version `index-0.0.4.html` déplace l’expérience vers une observation plus immersive de la vidéo.

Ajouts :

- bouton “Mode Focus” pour masquer transcription et annotation inférieure ;
- panneau de couches actives directement superposé à la vidéo ;
- overlays supplémentaires pour changement de langue, compréhension collective et répertoire plurilingue ;
- apparition et disparition légèrement animées des cartes vidéo.

Cette passe teste une question simple : une vidéo observée à travers des couches d’intercompréhension reste-t-elle plus lisible et plus engageante qu’une transcription annotée placée à côté ?

## Évolution V0.0.4.2

La version `index-0.0.4.2.html` améliore le confort d’observation sans changer la logique pédagogique.

Ajouts :

- bouton de fermeture sur les cartes overlay ;
- overlay masqué pour le segment courant après fermeture, puis de nouveau disponible lors d’un futur segment ;
- panneau “Couches actives” repliable ;
- compteur des couches activées dans l’état réduit.

Cette passe teste si l’utilisateur peut reprendre plus facilement une observation libre de la vidéo lorsque les aides visuelles deviennent temporairement moins présentes.

## Évolution V0.0.5

La version `index-0.0.5.html` ajoute une timeline d’observation sous la vidéo.

Ajouts :

- ligne “Langues” avec barres colorées pour FR, ES, IT et PT ;
- ligne “Phénomènes IC” avec marqueurs cliquables alignés dans le temps ;
- propriété `languages` ajoutée aux segments codés en dur ;
- clic sur une barre ou un marqueur pour déplacer la vidéo au segment correspondant ;
- masquage des marqueurs IC quand leur couche est décochée ;
- légende simple pour les langues et les phénomènes.

Cette passe teste l’hypothèse qu’une timeline colorée peut rendre visible la dynamique de l’échange avant même la lecture fine de la transcription.

## Évolution V0.0.5.1

La version `index-0.0.5.1.html` synchronise visuellement la timeline avec la lecture vidéo.

Ajouts :

- curseur vertical de lecture traversant les lignes “Langues” et “Phénomènes IC” ;
- petit repère temporel associé au curseur ;
- mise à jour en temps réel pendant la lecture ;
- repositionnement immédiat après clic sur un segment, une barre de langue ou un marqueur IC.

Cette passe teste si la timeline devient un véritable instrument d’observation temporelle lorsque la position de lecture y est visible en continu.

## Évolution V0.0.5.2

La version `index-0.0.5.2.html` corrige l’alignement de la timeline.

Ajouts et corrections :

- grille de timeline à deux colonnes : labels à gauche, pistes temporelles à droite ;
- graduations de temps minute par minute ;
- curseur vertical limité à la colonne temporelle ;
- alignement commun entre graduations, barres de langues, marqueurs IC et curseur ;
- recalcul du curseur lors du redimensionnement de l’interface.

Cette passe vise à rendre la timeline plus fiable comme instrument d’observation : le point 00:00 et toutes les positions temporelles partagent désormais le même repère horizontal.

## Évolution V0.0.6

La version `index-0.0.6.html` ajoute un mini tableau de bord de lecture.

Ajouts :

- bouton “Ajouter à mes observations” pour le segment actif ;
- tableau local en mémoire JavaScript, sans stockage durable ;
- colonnes timestamp, locuteur, texte court, langues, tags et note personnelle ;
- notes personnelles éditables directement dans le tableau ;
- suppression simple d’une observation ;
- export CSV des observations sélectionnées.

Cette passe teste l’hypothèse qu’une vidéo augmentée devient plus utile si l’utilisateur peut sélectionner ses propres moments remarquables et les exporter comme trace de lecture.

## Évolution V0.0.6.1

La version `index-0.0.6.1.html` répare la lecture HLS depuis IC-Hub sans modifier le modèle pédagogique.

Ajouts et corrections :

- hls.js `1.6.13` chargé localement depuis IC-Hub pour Chrome et Chromium ;
- manifeste et segments servis par un proxy IC-Hub à source UGA fixe ;
- repli vers la lecture HLS native lorsque hls.js n’est pas supporté ;
- états explicites `chargement`, `prêt`, `lecture`, `attente`, `erreur réseau` et `format non supporté` ;
- gestion des erreurs hls.js et des erreurs du lecteur HTML ;
- destruction de l’instance hls.js avant tout changement de source et à la fermeture de la page.

La même version chargeait alors l’activité en lecture seule depuis IC-Hub via
`GET /api/proto05/activities/proto05-augmented-video-01`. Le modèle métier sépare
la vidéo, la transcription, les segments, les locuteurs, les langues, les couches,
les occurrences de phénomènes, les annotations enseignantes et la configuration
de visibilité. Les temps synchronisés sont stockés en millisecondes entières.

## Évolution V0.0.6.2

Ce passage décrit l’état historique V0.0.6.2. Depuis la Mission 146, MariaDB est
l’autorité métier exclusive du serveur autonome Proto05. IC-Hub ne lit plus de
fichier Proto05 et ne conserve qu’un relais HTTP de compatibilité en lecture.
