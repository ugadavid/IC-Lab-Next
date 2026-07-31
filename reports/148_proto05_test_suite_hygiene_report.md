# Mission 148 — Assainissement de la suite de navigation Proto05 après MariaDB

Date : 2026-07-31

Prototype : `prototypes/05-augmented-ic-video-01`

Version relevée : `0.1.48` — inchangée

Point de départ : commit `a6af0ea` (`fix(proto05): render authored annotations in playable views`), état Git propre.

## Périmètre et conclusion

La suite `teacher-ui-navigation.test.js` n’était ni obsolète ni couverte par les
70 tests alors actifs. Elle conserve dix contrôles utiles sur le shell
enseignant, la séparation enseignant/étudiant, les dialogues, les routes et la
sauvegarde collante. Elle a donc été conservée.

Le helper JSON historique n’a pas été rétabli. Il a été remplacé au même
emplacement par un helper MariaDB-only qui lance le serveur courant, crée
uniquement les activités demandées via les API réelles, mémorise leurs
identifiants générés, puis les supprime et contrôle à la fois leurs réponses
`404` et le retour exact à la liste d’activités initiale.

La commande normale exécute désormais récursivement tous les fichiers
`*.test.js` suivis sous `server/test`, sans compter les helpers comme des tests.
Les 11 suites conservées sont exécutables et actives : 105 tests sur 105
réussissent.

## Historique Git du helper manquant

- Ajout : `cf73e2d1472f7b2181b89df3b4991fa26663eb78`, le
  2026-07-16 à 17:46:16 +02:00,
  `test(prototype-05): protect historical activity data`.
- Usage initial : `data-regression.test.js` et `teacher-save.test.js`. Le helper
  copiait alors le serveur et un magasin `data/activities.json` temporaire.
- Avant sa suppression, 24 suites l’utilisaient. Il avait grandi avec le
  backend JSON et copiait plusieurs catalogues et fichiers applicatifs.
- Suppression : `a871c334fcbb4598290b67688d4a5f16397e7f9c`, le
  2026-07-30 à 18:47:45 +02:00,
  `refactor(proto05): finalize MariaDB-only runtime with resilient diagnostics`.
  Ce commit a supprimé le backend et les fixtures JSON, 24 anciennes suites et
  le helper, puis a remplacé le glob de test par quatre chemins explicites.
- Défaut résiduel du même commit : trois fichiers conservés importaient encore
  le helper supprimé :
  `language-migration.test.js`, `teacher-ui-navigation.test.js` et
  `video-workspaces.test.js`. Ils n’étaient plus cités par le script normal ;
  l’erreur est donc restée invisible.

Historique des suites conservées concernées :

- `language-migration.test.js` :
  `75aaa3539a2e98d5cd266cd22ec65e90783f490c`, 2026-07-16 ;
- `video-workspaces.test.js` :
  `814befab9c2d2cae3c74dd7efca82c64d78029c0`, 2026-07-25 ;
- `teacher-ui-navigation.test.js` :
  `0fc390d1963061856beb98bac71d1db39984ad11`, 2026-07-26.

## Valeur de `teacher-ui-navigation.test.js`

Les dix contrôles portent sur :

1. la distinction des contextes de routes enseignant et étudiant ;
2. le menu général et la séparation d’IC-Hub ;
3. la navigation activité entre édition, guidé, auteur expert et preview ;
4. le partage du shell par les pages enseignantes sans contamination de la vue
   étudiante ;
5. la présence des actions métier dans leurs pages ;
6. l’absence de dialogues natifs au profit du composant partagé ;
7. la validation d’un prompt vide sans perte de saisie ;
8. le piège de focus, la validation et la restitution du focus sous Chromium ;
9. le service HTTP des routes enseignantes et des actifs partagés ;
10. la transition non enregistré → sauvegarde → enregistré et la persistance
    du formulaire.

Les 70 tests précédemment actifs couvraient la projection vidéo, la
disponibilité et le contrat média, le runtime MariaDB et les annotations
jouables. Aucun ne contrôlait le shell, les menus, les dialogues partagés, les
routes enseignantes ni la sauvegarde collante dans le DOM. Retirer la suite
aurait donc diminué la couverture fonctionnelle effective.

## Corrections réalisées

### Helper de serveur

`server/test/helpers/temporary-proto05-server.js` :

- lance le serveur applicatif actuel avec la configuration locale non
  versionnée, sans lire ni imprimer son contenu ;
- exige un healthcheck dont `storageAuthority` vaut `mariadb` ;
- relève les identifiants d’activités avant toute écriture ;
- crée les fixtures par `POST /activities` puis `PUT /authoring` ;
- fournit aux tests les identifiants réellement attribués ;
- sert les runners Chromium depuis un répertoire temporaire strictement
  identifié ;
- supprime uniquement les identifiants créés, exige ensuite `404`, compare la
  liste finale au témoin initial, arrête le processus et retire le répertoire
  temporaire.

Il ne copie aucun JSON, ne propose aucun mode de données et ne constitue pas un
backend alternatif.

### Suites auparavant mortes

- `teacher-ui-navigation.test.js` utilise le nouvel identifiant MariaDB de la
  fixture et le runner temporaire contrôlé.
- `video-workspaces.test.js` utilise le helper MariaDB-only. Deux assertions de
  forme devenues périmées ont été alignées sur les contrats actuels :
  normalisation `derivation-local` tolérante au formatage et action
  `data-save-metadata` avec confirmation `Fiche enregistrée.`.
- `language-migration.test.js` reste la couverture du script historique
  explicite de migration des langues, mais uniquement sur des objets
  synthétiques et des fichiers temporaires. Elle ne lit plus d’ancien magasin
  canonique, ne lance plus le serveur et ne simule aucun backend JSON.

### Lancement et orphelins

- `server/scripts/run-tests.js` découvre récursivement et trie tous les
  `*.test.js`, puis les transmet à `node --test` avec concurrence 1.
- `package.json` délègue la commande normale à ce lanceur. Une future suite
  correctement nommée ne pourra donc plus être oubliée par une liste manuelle.
- `fake-ffmpeg.js` et `fake-mysql2-readonly.js`, sans aucun import restant, ont
  été retirés.

## Inventaire final

| Suite | Tests | Statut normal |
|---|---:|---|
| `activity-video-projection.test.js` | 5 | active |
| `language-migration.test.js` | 3 | active, données synthétiques seulement |
| `mariadb-only-runtime.test.js` | 5 | active |
| `media-library-availability.test.js` | 4 | active |
| `media-library-contract.test.js` | 52 | active |
| `media-library-dry-run.test.js` | 2 | active |
| `media-library-install.test.js` | 2 | active |
| `media-library-migration.test.js` | 11 | active |
| `playable-annotations.test.js` | 4 | active |
| `teacher-ui-navigation.test.js` | 10 | active |
| `video-workspaces.test.js` | 7 | active |
| **Total** | **105** | **105 réussis** |

Suites suivies mais exclues : aucune.

Suites conservées mais inexécutables : aucune.

Ressources non exécutées comme tests :

- `helpers/chromium.js` : utilisé par la navigation enseignante ;
- `helpers/temporary-proto05-server.js` : utilisé par la navigation et les
  espaces vidéo ;
- `fixtures/layer-visibility.activity.json` : fixture de sauvegarde enseignante ;
- `fixtures/media-library-canonical.valid.json` : fixture du contrat média.

Helpers ou fixtures JavaScript orphelins : aucun après retrait des deux fixtures
inutilisées.

## Vérifications et preuves

- `node --test --test-concurrency=1 test/teacher-ui-navigation.test.js` :
  **10/10** ; contrôles Chromium compris.
- `node --test test/video-workspaces.test.js` : **7/7**.
- `node --test test/language-migration.test.js` : **3/3**.
- Suites média auparavant exclues, exécutées individuellement :
  dry-run **2/2**, install **2/2**, migration **11/11**.
- `npm test` via le lanceur final : **105/105**, 0 échec, 0 skip.
- Syntaxe Node validée pour le lanceur, le helper et les trois suites modifiées.
- Recherche ciblée : aucune référence restante aux deux fixtures supprimées ;
  aucune dépendance à `data/activities.json`, à un sélecteur de mode JSON ou à
  une copie de backend dans la navigation et son helper.
- Nettoyage MariaDB : chaque activité de fixture a été supprimée et relue en
  `404`; le helper a retrouvé exactement les identifiants initiaux.
- Relecture MariaDB readonly après la suite : 4 activités présentes,
  **0 activité temporaire Mission 148**.
- Nettoyage système : aucun répertoire `.proto05-test-runtime-*` et aucun
  processus serveur Proto05 lancé par la mission ne subsistaient.
- `git diff --check` : réussi.

Le contrôle Chromium couvre notamment 390×720 pour le dialogue et 1440×1000
pour la sauvegarde. Aucun code d’interface n’a été modifié. Cette recette
automatisée ne vaut pas validation humaine de David.

## Fichiers concernés

Créés :

- `server/scripts/run-tests.js`
- `server/test/helpers/temporary-proto05-server.js`
- `reports/148_proto05_test_suite_hygiene_report.md`

Modifiés :

- `server/package.json`
- `server/test/language-migration.test.js`
- `server/test/teacher-ui-navigation.test.js`
- `server/test/video-workspaces.test.js`

Retirés car orphelins :

- `server/test/fixtures/fake-ffmpeg.js`
- `server/test/fixtures/fake-mysql2-readonly.js`

Aucun fichier applicatif, schéma, donnée canonique, média ou numéro de version
n’a été modifié. Aucun commit ni push n’a été effectué.

## Limites et recette humaine minimale

Aucune validation humaine n’est requise pour établir l’exécution de la suite.
Une recette de confiance facultative consiste à lancer `npm test` depuis
`prototypes/05-augmented-ic-video-01/server` et à constater le bilan
`105/105`.

## Proposition de message de commit

`test(proto05): restore MariaDB-safe navigation coverage`
