# Mission 125 — Proto05 — Transformer la bibliothèque d’activités en sœur fonctionnelle de la vidéothèque

Date : 26 juillet 2026

## Résultat

La route enseignante `/teacher` est désormais une véritable bibliothèque
d’activités, construite dans la même logique de collection que
`/teacher/videos` tout en conservant le shell partagé de la Mission 124.

Elle fournit :

- un titre et une introduction propres à la bibliothèque d’activités ;
- une barre d’outils unique avec recherche, tri, filtre, changement de vue et
  ajout d’une activité ;
- une navigation latérale avec compteurs et dossiers persistants ;
- deux vues réellement distinctes, grille et liste ;
- des cartes plus compactes et hiérarchisées ;
- une action principale `Ouvrir la fiche`, deux accès secondaires et un menu
  d’actions complémentaires ;
- des états vides contextualisés et réversibles ;
- un comportement responsive sans débordement horizontal observé à 375 px.

La version de Proto05 passe de `0.1.44` à `0.1.45`. Cette incrémentation
correspond à une évolution fonctionnelle locale et réversible de la
bibliothèque, sans changement de statut du prototype.

## État initial et périmètre

- Branche observée au contrôle final : `main`.
- HEAD observé au contrôle final : `d19dfd6`
  (`fix(proto05): refine shared teacher navigation`).
- Version initiale : `0.1.44`.
- Les missions 122, 123 et 124 ont été prises comme contexte, puis l’état réel
  du code et des données a été inspecté.
- Le nouvel état canonique communiqué par David — 2 activités et 6 vidéos — a
  été accepté comme référence de travail.
- Les anciennes entrées de développement et les vidéos indisponibles n’ont fait
  l’objet d’aucune enquête, conformément à l’instruction explicite.
- Aucun nettoyage, rétablissement ou ajout de données n’a été réalisé dans
  cette mission.
- Aucun autre prototype, service IC-Hub, launcher ou contrat média n’a été
  modifié.

## Choix fonctionnels

### Charpente et action principale

La page conserve le shell enseignant partagé et son actif `Bibliothèque`.
Son corps reprend la charpente de collection de la vidéothèque :

1. en-tête et explication courte ;
2. barre d’outils ;
3. barre latérale de classement ;
4. zone de résultats ;
5. état vide.

Le lien `Ajouter une activité` vers `/teacher/create` apparaît une seule fois.
Les anciens accès redondants `Préparation enseignant`, `Gérer les sources
vidéo` et `Créer une activité` ont été retirés de cette page.

### Recherche locale

La recherche est effectuée localement sur les activités déjà chargées. Elle
normalise la casse, les accents et les espaces multiples. Elle porte uniquement
sur des informations réellement disponibles :

- titre et identifiant ;
- description, consigne et question pédagogique ;
- intention, public et contexte d’usage pédagogiques ;
- titre, identifiant, source et fournisseur vidéo ;
- qualification et complétude de l’identité pédagogique ;
- nom du dossier éventuel.

La recherche se combine avec le dossier, le filtre d’état et le tri.

### Tri et filtres honnêtes

Les activités ne disposent pas d’une date fiable propre à chaque entrée. Le
champ `updatedAt` observé est celui du magasin entier et ne permet pas un tri de
récence honnête. Aucun faux tri `récentes/anciennes` n’a donc été introduit.

Les seuls tris proposés sont :

- titre de A à Z ;
- titre de Z à A.

Les filtres proposés s’appuient sur des états déjà calculables :

- toutes les activités ;
- brouillons, d’après le statut existant ;
- identité pédagogique complète ;
- identité pédagogique à compléter.

Aucune nouvelle machine d’état métier n’a été créée.

### Dossiers persistants

Le classement est conservé dans un fichier dédié
`data/activity-library.json`, séparé de `activities.json`. Ce fichier :

- reste absent tant qu’aucun classement n’est créé ;
- est lu de manière sûre lorsqu’il est absent ou incomplet ;
- associe au maximum un dossier principal à chaque activité ;
- est écrit par fichier temporaire puis renommage ;
- produit une sauvegarde `.bak` lorsqu’un état précédent existe ;
- ne contient ni copie d’activité ni donnée vidéo.

Les opérations disponibles sont :

- créer un dossier ;
- renommer un dossier ;
- supprimer un dossier ;
- sélectionner `Toutes les activités`, `Non classées` ou un dossier ;
- classer ou déclasser une activité ;
- retrouver le classement après redémarrage.

Supprimer un dossier déclasse ses activités et ne supprime jamais une activité.
Supprimer une activité nettoie au mieux son éventuelle association de
classement après la suppression métier réussie.

### Vues grille et liste

La vue grille donne la priorité au titre, à l’état, au résumé pédagogique et à
la vidéo associée. La vue liste utilise, sur desktop, une ligne alignée plus
dense avec des colonnes dédiées. Les deux vues conservent exactement les mêmes
destinations et le même classement.

Le choix de vue est mémorisé dans `localStorage` et a été retrouvé après
navigation.

Sur mobile, la vue liste se replie en carte verticale pour préserver la
lisibilité et éviter tout défilement horizontal.

### Actions et accessibilité

Chaque activité expose :

- `Ouvrir la fiche` comme action principale ;
- `Prévisualiser` ;
- `Vue étudiante` ;
- un menu `…` contenant `Dupliquer` et `Supprimer`.

Le menu se ferme au clic extérieur et avec `Échap`, puis place le focus dans la
liste à son ouverture. Les boutons de vue annoncent leur état avec
`aria-pressed`; les résultats et messages d’opération disposent de zones
annonçables.

La suppression d’activité conserve la confirmation explicite, l’état de
progression et le comportement d’annulation déjà testés. La suppression d’un
dossier indique que les activités seront seulement déclassées.

## Contrat HTTP ajouté

Les routes suivantes ont été ajoutées au serveur Proto05 :

- `GET /api/proto05/activity-library`
- `POST /api/proto05/activity-library/folders`
- `PATCH /api/proto05/activity-library/folders/:id`
- `DELETE /api/proto05/activity-library/folders/:id`
- `PUT /api/proto05/activity-library/activities/:id/classification`

Les identifiants d’activité et de dossier inconnus sont refusés. Les noms vides
ou dupliqués sont refusés. Les réponses de bibliothèque projettent le
`folderId` à côté des activités sans modifier leur représentation canonique
dans `activities.json`.

## Fichiers modifiés ou créés

- `prototypes/05-augmented-ic-video-01/teacher.html`
- `prototypes/05-augmented-ic-video-01/shared/activity-library.css`
- `prototypes/05-augmented-ic-video-01/shared/activity-library.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/test/activity-library.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/activity-deletion.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `reports/125_proto05_activity_library.md`

Les deux premiers fichiers partagés sont nouveaux. `teacher-video-detail.html`
est uniquement concerné par l’affichage de la version `0.1.45`.

## Tests automatisés

Contrôles ciblés réussis :

- `npm.cmd run check`
  - syntaxe de `server.js` valide pour la version `0.1.45`.
- `node --check ../shared/activity-library.js`
  - syntaxe du module de bibliothèque valide.
- `node --test test/activity-library.test.js`
  - 5 tests réussis, 0 échec ;
  - structure de page et unicité de l’action d’ajout ;
  - combinaison recherche/tri/filtre/dossier ;
  - normalisation casse, accents et espaces ;
  - destinations communes aux deux vues et mémoire de vue ;
  - création, renommage, classement, redémarrage et suppression de dossier ;
  - conservation stricte des deux activités ;
  - refus des références inconnues ;
  - empreintes des données canoniques inchangées.
- `node --test test/teacher-ui-navigation.test.js`
  - 7 tests réussis, 0 échec.
- `node --test test/library-classification.test.js`
  - 4 tests réussis, 0 échec.
- `node --test test/data-regression.test.js`
  - 10 tests réussis, 0 échec.
- `node --test test/activity-deletion.test.js`
  - 3 tests réussis, 0 échec, dont annulation et confirmation en Chromium sur
    serveur et données temporaires.
- `node --test test/activity-duplication.test.js`
  - suite réussie, y compris les assertions de duplication et de redirection.
- `git diff --check`
  - aucune erreur de whitespace ; seuls les avertissements habituels de future
    normalisation LF/CRLF sont affichés.

La suite exhaustive `npm test` n’a pas été lancée, conformément au cadrage de
tests ciblés de la mission.

Tous les tests mutatifs ont utilisé une copie temporaire. Ils n’ont écrit ni
dans `data/activities.json` ni dans `data/video-library.json`. Au contrôle
final, Git ne signale aucune modification sous `data/` et
`data/activity-library.json` n’existe pas dans le répertoire canonique.

## Validation HTTP

Sur le serveur local réel :

- `/api/health` répond :
  `{"ok":true,"service":"proto05-augmented-video","version":"0.1.45","port":8791}` ;
- `/api/proto05/activity-library` expose les 2 activités attendues ;
- aucun dossier n’est présent dans l’état canonique initial ;
- cette lecture n’a créé aucun fichier de classement.

## Recette visuelle limitée

Recette effectuée avec le navigateur intégré.

À 1280 × 720 :

- `/teacher` en grille : shell inchangé, deux cartes visibles, action d’ajout
  unique et aucun débordement horizontal ;
- `/teacher` en liste : lignes réellement distinctes de la grille et mémoire de
  vue conservée après navigation ;
- recherche avec casse et espaces irréguliers : résultat attendu ;
- filtre `Identité complète` : état vide cohérent et action de réinitialisation
  fonctionnelle ;
- menu `…` : actions `Dupliquer` et `Supprimer`, fermeture avec `Échap`, menu
  non rogné ;
- dialogue de création de dossier : titre, champ focalisé et annulation sans
  écriture.

À 375 × 844 :

- grille et liste sans débordement horizontal ;
- action `Ajouter une activité` visible ;
- barre latérale et deux cartes lisibles ;
- liste repliée verticalement avec ses trois destinations ;
- menu `…` entièrement contenu dans la fenêtre ;
- shell général mesuré à 57 px.

La route `/student/proto05-augmented-video-01` a également été contrôlée :
aucun shell, script, style ou attribut de route enseignant n’y est injecté et
aucun débordement horizontal n’a été observé.

Aucune erreur visible n’a été constatée pendant cette recette. La fenêtre a été
remise à sa dimension desktop à la fin.

## Éléments non vérifiés et limites

- aucune campagne exhaustive de tous les tests Proto05 ;
- aucune recette sur appareil tactile physique ;
- aucun test de charge au-delà de l’objectif annoncé d’environ cent activités ;
- aucun test multi-utilisateur ou de concurrence interprocessus ;
- aucune création, modification ou suppression de dossier dans les données
  canoniques pendant la recette réelle ;
- aucune validation humaine de la densité, de l’élégance ou du vocabulaire
  final ;
- les anciennes données de développement et les médias indisponibles n’ont pas
  été analysés, conformément à l’instruction.

La recette Codex constitue un contrôle technique, pas la validation humaine de
David.

## Suites possibles

1. Faire valider humainement l’équilibre entre densité et lisibilité en grille
   et en liste.
2. Valider le vocabulaire `Identité complète` / `Identité à compléter`.
3. Essayer le classement avec quelques dossiers réels lorsque leur taxonomie
   pédagogique sera décidée.
4. Tester sur un appareil mobile physique les menus et dialogues au toucher.

## État final

- Version obtenue : `0.1.45`.
- État canonique de référence conservé : 2 activités et 6 vidéos.
- Aucun fichier de données métier ou média modifié.
- Aucun commit et aucun push effectués.

Message de commit proposé :

`feat(proto05): align activity library with video library`
