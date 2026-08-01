# Mission 169 — Alignement documentaire et UI sur l’autorité MariaDB de Proto05

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01` et présent rapport uniquement.  
Version applicative : `0.1.59`, inchangée.

## Résultat

MariaDB est désormais présentée sans ambiguïté comme l’unique autorité métier
actuelle de Proto05 dans les surfaces examinées. Le dialogue de suppression
d’activité annonce :

- une suppression transactionnelle dans MariaDB ;
- un refus lorsque des dépendances empêchent la suppression ;
- l’absence de sauvegarde JSON automatique créée par cette action.

Le changement corrige un texte d’interface et la documentation sans modifier le
contrat d’API, le schéma, les données ni le comportement de suppression. La
version `0.1.59` est donc conservée ; un incrément aurait exigé de modifier des
artefacts de version hors de la liste stricte autorisée et n’est pas justifié par
ce seul alignement rédactionnel.

## Formulations trompeuses corrigées

| Surface | Ancienne formulation | Formulation ou statut obtenu |
|---|---|---|
| Dialogue de suppression | « Une sauvegarde .bak sera créée avant la suppression. » | Transaction MariaDB, refus en présence de dépendances, aucune sauvegarde JSON automatique. |
| README principal | Suppression avec sauvegarde `.bak` et remplacement atomique du JSON. | Suppression transactionnelle MariaDB, dépendances bloquantes, aucune sauvegarde JSON automatique. |
| README serveur — mutations | Sauvegarde JSON atomique précédée d’un `.bak`. | Procédures transactionnelles MariaDB, aucun document métier JSON ni `.bak`. |
| README serveur — suppression | Création de `activities.json.bak`, fichier temporaire et renommage. | Suppression d’une activité dans une transaction MariaDB, contrôle des dépendances et rollback en cas d’échec. |
| README serveur — authoring | Sauvegarde « limitée au JSON du prototype ». | Persistance transactionnelle MariaDB sans fichier JSON métier. |
| Modèle Library | `video-library.json` présenté comme source de vérité après migration. | MariaDB présentée comme autorité actuelle ; le diagramme fichier est explicitement historique et non opérationnel depuis la Mission 146. |
| Plan Library | Migration fichier, fallback et `.bak` encore formulés comme plan actif. | Sections explicitement historiques, conservées comme trace antérieure à la Mission 146. |

Le script historique de migration du catalogue de langues reste documenté, mais
son contexte `0.1.12`, son retrait du runtime depuis la Mission 146 et son statut
non opérationnel sont maintenant explicites.

Les manifestes JSON de `database/schema-migrations/` sont explicitement décrits
comme des contrats techniques de schéma et de procédures, jamais comme des
données métier ou une persistance parallèle.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/shared/activity-library.js`
- `prototypes/05-augmented-ic-video-01/README.md`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `reports/169_proto05_mariadb_documentation_ui_alignment.md`

Aucun autre prototype, lanceur, manifeste de migration, script historique,
processus, schéma, base ou donnée métier n’a été modifié.

## Test ajouté

Le test statique « la suppression d’activité annonce MariaDB sans promettre de
sauvegarde JSON » vérifie les trois messages attendus et interdit dans la surface
active la réapparition d’une promesse de création de sauvegarde JSON ou `.bak`.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| `node --test --test-name-pattern "MariaDB sans promettre" test/teacher-ui-navigation.test.js` | Réussi : 1/1. |
| `node --check ../shared/activity-library.js` | Réussi. |
| `node --test --test-name-pattern "actions métier existantes" test/teacher-ui-navigation.test.js` | Réussi : 1/1. |
| `node --test test/teacher-ui-navigation.test.js` | Réussi : 11/11. Les contrôles Chromium des dialogues, à 390 × 720, réussissent. |
| Recherche des anciennes promesses exactes dans les quatre surfaces autorisées | Aucun résultat. |
| Relecture des occurrences JSON, `.bak`, fallback et persistance | Occurrences restantes techniques, statiques, négatives ou explicitement historiques. |
| `git diff --check` | Réussi ; seuls les avertissements de conversion LF vers CRLF propres à la configuration Git sont affichés. |

## Correction de clôture de la suite UI

L’assertion historique sur
`queueMicrotask(() => window.proto05OpenUsagePanel(...))` protégeait l’affichage
des dépendances après le refus du préflight de suppression d’une vidéo. Depuis
la Mission 167, ce refus n’ouvre volontairement plus le panneau après un nouveau
rendu : il affiche sur la carte concernée le message fonctionnel du préflight et
la liste agrégée des éléments bloquants via `setAssetActionStatus`.

Le comportement utile était donc toujours présent sous une autre
implémentation. L’assertion obsolète a été remplacée par une assertion sur le
contrat actuel : le refus et ses `blockingItems` doivent être rendus localement
sous la forme « Éléments concernés : … ». Aucun code de production ni autre
test n’a été modifié pour cette clôture. La suite complète atteint désormais
11/11.

La modale de dialogue partagée a été contrôlée par le test Chromium existant ;
aucune recette connectée à une donnée métier et aucune suppression réelle n’ont
été effectuées.

## État Git final

Les cinq fichiers Proto05 listés ci-dessus sont modifiés et le présent rapport
169 est nouveau. Le rapport 168 était déjà non suivi avant la Mission 169 et a
été préservé sans modification. Aucun commit ni push n’a été effectué.

## Message de commit proposé

`fix(proto05): aligner l’UI et la documentation sur l’autorité MariaDB`
