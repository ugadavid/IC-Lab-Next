# Mission 124 — Proto05 — Alléger et clarifier le shell enseignant partagé

Date : 26 juillet 2026

## Résultat

Le shell partagé introduit par la Mission 123 est conservé et allégé. La
navigation principale ne contient plus que `Bibliothèque` et `Vidéothèque`.
L’identité Proto05, les deux espaces principaux, l’accès transversal à IC-Hub,
le contexte d’activité et les actions de sauvegarde ont désormais des zones
visuellement distinctes.

La version de Proto05 passe de `0.1.43` à `0.1.44`. Il s’agit d’une correction
incrémentale de navigation et de responsive, sans évolution majeure du
prototype.

## État initial

- Branche : `main`, en avance de 8 commits sur `origin/main`.
- HEAD : `f83bd030c3e9b813695f0d32cc037b0a6ea74e23`
  (`chore(proto05): establish clean canonical media baseline`).
- État de travail initial : propre.
- Version initiale : `0.1.43`.
- Le rapport
  `reports/123_proto05_shared_teacher_ui_and_navigation.md` a été lu
  intégralement.
- Le nouvel état de données fourni pour la mission — 2 activités et 6 vidéos —
  a été accepté comme état canonique, sans enquête sur l’historique. Aucun
  fichier sous `prototypes/05-augmented-ic-video-01/data/` n’a été modifié.

## Sources et routes inspectées

Sources principales :

- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.css`
- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `prototypes/05-augmented-ic-video-01/index-0.0.9.html`
- vues HTML enseignantes de bibliothèque, création, fiche, ateliers,
  prévisualisation, vidéothèque, détail vidéo et anonymisation
- `prototypes/05-augmented-ic-video-01/README.md`

Routes inspectées statiquement ou en recette locale :

- `/teacher`
- `/teacher/create`
- `/teacher/videos`
- `/teacher/edit/proto05-augmented-video-01`
- `/teacher/preview/proto05-augmented-video-01`
- `/student/proto05-augmented-video-01`
- les familles `/teacher/guided/:id`, `/teacher/author/:id`,
  `/teacher/videos/:id` et `/teacher/anonymization/:id`

## Problèmes observés dans le shell de la Mission 123

- Le menu général mélangeait deux espaces, une action de création et IC-Hub.
- Les liens cumulaient fond, bordure, point actif et soulignement interne, ce
  qui leur donnait l’apparence de boutons.
- IC-Hub apparaissait au même niveau logique que les espaces principaux.
- La ligne d’activité conservait des libellés longs et un badge expert
  supplémentaire.
- À 375 px, navigation générale et navigation contextuelle formaient deux
  rangées horizontalement défilables.
- Le shell contextuel atteignait environ 213 px sur mobile.
- Des liens de retour restaient strictement redondants dans la vidéothèque et
  la création.

## Choix logiques et visuels

### Structure générale

La structure partagée reste produite par `teacher-shell.js` et stylée par
`teacher-shell.css`. Aucune copie d’en-tête n’a été créée dans les pages.

La première ligne contient désormais :

1. une identité compacte `P5 / Proto05` ;
2. une navigation sémantique avec seulement :
   - `Bibliothèque` → `/teacher`
   - `Vidéothèque` → `/teacher/videos`
3. un lien IC-Hub séparé à droite par un filet vertical.

`Nouvelle activité` et `Ajouter une vidéo` ne sont pas des destinations du
menu général. L’accès existant `Créer une activité` reste présent dans le corps
de `/teacher`, et l’action `Ajouter une vidéo` reste dans la vidéothèque.

Les pages de création et d’activité sont rattachées visuellement à
`Bibliothèque`; les pages de détail vidéo et d’anonymisation restent rattachées
à `Vidéothèque`.

### IC-Hub

- L’URL reste centralisée une seule fois dans `teacher-shell.js`.
- IC-Hub est rendu hors du `nav` des deux espaces principaux.
- Son traitement est typographique, discret et accompagné d’un indicateur
  `↗`.
- Son comportement de navigation existant est conservé : aucun nouvel onglet
  n’a été introduit.
- Aucun fichier IC-Hub n’a été modifié.

### Navigation active

L’actif conserve `aria-current="page"`. Il est indiqué par une graisse plus
forte et un filet inférieur de 2 px, donc pas uniquement par la couleur. Les
gros fonds, bordures, ombres et points actifs ont été retirés. Les zones
cliquables et le focus clavier visible sont conservés.

### Contexte d’activité

Les quatre destinations sont conservées avec leur identifiant d’activité :

- `Fiche`
- `Guidé`
- `Auteur expert`
- `Prévisualisation`

Le titre et l’état de l’activité restent chargés depuis l’API. Le mode auteur
reste explicitement qualifié d’expert sans badge additionnel. L’ancienne route
d’anonymisation avancée n’est pas réintroduite.

### Sauvegarde

Le miroir partagé continue d’appeler le bouton métier original et de refléter
les états `dirty`, `saving`, `saved` et `error`. Aucun second mécanisme de
sauvegarde n’a été créé.

L’intégration visuelle est plus petite et séparée de la navigation par un filet.
Après défilement à `scrollY = 700`, le shell reste à `top = 0` et le bouton
`Enregistrer` reste visible.

### Responsive

À 375 × 844 :

- la ligne générale mesure 56 à 57 px ;
- la ligne contextuelle mesure 87 px ;
- le shell contextuel complet mesure 144 px ;
- la navigation générale ne défile pas horizontalement ;
- les quatre liens contextuels utilisent une grille de quatre colonnes ;
- aucun débordement horizontal de page n’a été mesuré ;
- IC-Hub reste visible sans menu hamburger.

Mesures desktop à 1280 × 720 :

- shell sans contexte : 61 px ;
- ligne générale : 60 px ;
- shell avec activité : 118 px ;
- ligne contextuelle : 57 px.

## Liens redondants supprimés

- `← Bibliothèque enseignant` dans `teacher-videos.html`.
- `← Bibliothèque enseignant` dans `teacher-create.html`.
- `Ouvrir la Library` dans l’en-tête de `teacher-create.html`.

Les retours propres aux workflows de détail ou d’anonymisation ont été
conservés lorsqu’ils portent un contexte ou une destination de retour utile.

## Préservation de la vue étudiante

La référence à `teacher-shell.js` a été retirée de l’artefact
`index-0.0.9.html`. Le serveur l’ajoute uniquement à la réponse
`/teacher/preview/:id`.

Contrôle runtime de `/student/proto05-augmented-video-01` :

- aucun script `teacher-shell.js` ;
- aucune feuille `teacher-shell.css` ;
- aucun élément `[data-teacher-shell]` ;
- aucune classe enseignante sur le `body` ;
- aucun `data-teacher-route`.

Contrôle de `/teacher/preview/proto05-augmented-video-01` :

- un seul shell ;
- un seul script partagé ;
- `Prévisualisation` active ;
- protection contre un second shell dans une prévisualisation intégrée
  conservée.

## Fichiers modifiés ou créés

- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.js`
- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.css`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/index-0.0.9.html`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/teacher-create.html`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `reports/124_proto05_compact_teacher_shell.md`

## Tests adaptés

`server/test/teacher-ui-navigation.test.js` vérifie désormais :

- les deux seules destinations générales et leurs URL ;
- l’absence des actions de création dans ce menu ;
- IC-Hub comme élément séparé et URL centralisée ;
- le rattachement et l’actif principal ;
- les quatre destinations contextuelles compactes ;
- l’accès à la création dans le corps de `/teacher` ;
- la disparition des retours strictement redondants ;
- l’absence du shell et de ses actifs dans la réponse étudiante ;
- l’injection du shell sur la seule prévisualisation enseignante ;
- la sauvegarde partagée sur une copie temporaire de données.

## Commandes et résultats

- `node --test test/teacher-ui-navigation.test.js`
  - 7 tests réussis, 0 échec, durée finale 961,903 ms.
- `npm.cmd run check`
  - succès ; exécute `node --check server.js`.
- `node --check ../shared/teacher-shell.js`
  - succès, aucune sortie.
- `git diff --check`
  - succès ; uniquement des avertissements Git sur la future normalisation
    LF/CRLF, sans erreur de whitespace.
- `Invoke-RestMethod http://127.0.0.1:8791/api/health`
  - `{"ok":true,"service":"proto05-augmented-video","version":"0.1.44","port":8791}`.

Une première commande `node --check shared/teacher-shell.js`, lancée depuis
`server/`, a échoué car ce chemin relatif n’existe pas depuis ce dossier. Elle
a été immédiatement corrigée par `node --check ../shared/teacher-shell.js`,
qui réussit. Cet incident de commande n’indique pas une erreur de syntaxe du
fichier.

La suite exhaustive `npm test` n’a pas été lancée, conformément au périmètre
de la mission.

## Recette visuelle limitée

Contrôlée avec le navigateur intégré :

- `/teacher`, desktop 1280 × 720 ;
- `/teacher/videos`, desktop 1280 × 720 ;
- `/teacher/edit/proto05-augmented-video-01`, desktop 1280 × 720 ;
- sauvegarde collante après défilement ;
- `/teacher`, mobile 375 × 844 ;
- `/teacher/videos`, mobile 375 × 844 ;
- contexte d’activité, mobile 375 × 844 ;
- `/student/proto05-augmented-video-01`, mobile 375 × 844 ;
- `/teacher/preview/proto05-augmented-video-01`.

Les pages actives, l’accès IC-Hub, la navigation contextuelle, l’absence de
débordement horizontal manifeste et l’absence d’erreur visible ont été
contrôlés. La largeur temporaire du navigateur a été réinitialisée après la
recette.

## Limites et validation humaine

Non vérifié :

- aucune campagne exhaustive ni recette Chromium longue ;
- aucune validation sur appareil tactile physique ;
- aucune validation humaine de l’élégance finale ;
- le service IC-Hub n’a pas été ouvert ni modifié ;
- les workflows métier internes des pages n’ont pas été rejoués au-delà de la
  sauvegarde ciblée sur copie temporaire.

Points proposés à David :

1. confirmer la densité et la hiérarchie visuelle du shell à 1280 px ;
2. confirmer la lisibilité des quatre liens contextuels à 375 px ;
3. vérifier si la troncature du titre d’activité sur petit écran conserve assez
   de contexte ;
4. parcourir une page Guidé et une page Auteur longues pour apprécier le shell
   collant en usage réel ;
5. confirmer l’équilibre visuel du lien IC-Hub à droite.

La recette Codex constitue un contrôle technique, pas une validation humaine
de David.

## État final

- Version obtenue : `0.1.44`.
- Aucun fichier de données ou contrat média modifié.
- Aucun autre prototype ni IC-Hub modifié.
- Aucun commit et aucun push effectués.
- Modifications locales limitées aux neuf fichiers Proto05 listés ci-dessus,
  plus le présent rapport.

Message de commit proposé :

`fix(proto05): refine shared teacher navigation`
