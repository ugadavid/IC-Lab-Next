# Mission 146.1 — Annotations réactives et diagnostic MariaDB

Date : 30 juillet 2026  
Version applicative : `0.1.48` (inchangée)  
Commit/push : aucun

## Résultat

Les annotations de l’atelier auteur sont désormais réconciliées avec la réponse
canonique de l’API immédiatement après une sauvegarde réussie. Une garde
`singleFlight` empêche deux clics rapprochés de produire deux mutations
concurrentes. L’échec HTTP ou réseau conserve le brouillon affiché, restitue un
message explicite et ne produit pas de faux succès.

Proto05 conserve MariaDB comme unique autorité et reste fail-closed, mais son
processus HTTP peut maintenant démarrer lorsque MariaDB est indisponible. Dans
cet état :

- `GET /api/health` répond `503` avec un diagnostic non sensible ;
- toutes les routes métier répondent `503` ;
- les navigations HTML affichent une page française autonome ;
- aucun backend JSON, snapshot obsolète ou jeu de données fictif n’est servi ;
- `POST /api/diagnostics/mariadb/retry` vérifie la reprise et rouvre le runtime
  dans le même processus lorsque MariaDB redevient disponible.

## Diagnostic

### Annotations

La chaîne MariaDB était fonctionnelle : le payload contenait l’annotation, la
transaction écrivait `activity_annotations`, la projection readonly la
restituait et l’API renvoyait l’activité canonique.

Le défaut était frontal. `teacher-author.html` conserve plusieurs couches
historiques de gestionnaires, et le dernier gestionnaire de sauvegarde
réaffectait directement l’état sans point de réconciliation testable ni garde
contre les requêtes concurrentes. Le cycle a été fermé avec un contrôleur
partagé qui :

1. accepte uniquement une réponse contenant une activité canonique ;
2. remplace l’état auteur par cette activité ;
3. déclenche immédiatement le rerendu ;
4. sérialise les clics répétés sur une même sauvegarde.

L’ajout local continue d’apparaître sans attendre la sauvegarde. La modification
et la suppression utilisent le même cycle canonique.

### MariaDB indisponible

Le démarrage attendait auparavant `verify()` avant d’ouvrir le port ; toute
erreur terminait donc le processus. Le port est désormais ouvert avec un état
interne `checking`, `available` ou `unavailable`. La vérification MariaDB met
l’état à jour sans élargir la frontière de données.

Les causes publiques distinguées sont :

- `connection_refused` ;
- `authentication_or_grants` ;
- `schema_or_migrations` ;
- `configuration_invalid` ;
- `unexpected_error`.

Les erreurs enveloppées par l’adaptateur readonly conservent leur `cause`, ce
qui permet cette classification. Le navigateur ne reçoit ni DSN, ni compte, ni
mot de passe. Les logs serveur se limitent à la catégorie et aux codes
techniques non sensibles.

## Fichiers de la Mission 146.1

- `prototypes/05-augmented-ic-video-01/shared/authoring-mutation-state.js`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/server/mariadb-diagnostics.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `STATUS.md`
- `docs/ARCHITECTURE.md`
- `reports/146_1_proto05_annotations_database_diagnostics_report.md`

Les autres changements déjà présents dans le worktree appartiennent à la
Mission 146 et ont été préservés.

## Preuves

### Automatisées

- validations syntaxiques Node : réussies ;
- test ciblé MariaDB exclusive : **5/5** ;
- suite courante de la Mission 146 : **66/66** ;
- démarrage MariaDB disponible : health `status=available` ;
- démarrage sur un port MariaDB fermé : processus HTTP maintenu, health et
  routes métier en `503`, page diagnostic servie ;
- reprise dans le même processus : un proxy TCP de test a d’abord laissé la
  connexion fermée, puis relayé la vraie MariaDB ; l’action de retry est passée
  de `503` à `200` et la route des activités est redevenue disponible ;
- scan du HTML et des payloads de diagnostic : aucun secret ni fallback JSON ;
- `git diff --check` : réussi.

### Recette navigateur et SQL

Une activité jetable a été créée, puis manipulée dans l’atelier auteur réel :

- création d’un segment ;
- ajout d’une annotation, visible immédiatement ;
- sauvegarde et rerendu à partir de la réponse API canonique ;
- rechargement : annotation toujours présente ;
- modification : nouvelle valeur immédiatement affichée et persistée ;
- suppression : disparition immédiate puis persistée ;
- redémarrage du serveur avec une nouvelle annotation jetable : restitution
  correcte dans l’atelier ;
- console navigateur : aucune erreur.

La ligne jetable a été relue directement dans `activity_annotations` avec son
identifiant, son texte et son rattachement à l’activité. Après suppression de
l’activité, son API a répondu `404` et les cardinalités SQL ciblées étaient :

- `activities` : 0 ;
- `activity_segments` : 0 ;
- `activity_annotations` : 0.

La page diagnostic a été inspectée visuellement à `1280 × 720` : texte français
lisible, hiérarchie claire, bouton « Réessayer » visible et aucun contenu métier.
Le clic sur « Réessayer » a affiché la raison maîtrisée sans erreur console.

Les serveurs temporaires lancés sur `8792` et `8793` ont été arrêtés. Le serveur
préexistant sur `8791`, qui n’avait pas été lancé par cette mission, n’a pas été
touché.

## Limites et validation humaine

La vraie MariaDB n’a pas été arrêtée : la coupure et la reprise ont été simulées
sans risque par un port fermé puis un proxy TCP local vers la même instance.
Cette preuve couvre le comportement applicatif, mais pas l’état visuel exact
produit par un arrêt manuel de Docker Desktop sur la machine de David.

Recette humaine minimale proposée :

1. ajouter une annotation jetable dans une activité de recette, sauvegarder et
   confirmer son apparition immédiate ;
2. recharger, modifier, sauvegarder, puis supprimer cette annotation ;
3. arrêter temporairement le conteneur MariaDB dans un créneau sûr et relancer
   Proto05 ;
4. confirmer la page française, le `503` de `/api/health` et l’absence de
   données métier ;
5. relancer MariaDB, cliquer « Réessayer » et confirmer le retour normal de
   l’atelier.

## Message de commit proposé

`refactor(proto05): finalize MariaDB-only runtime with resilient diagnostics`
