# Mission 176 — Analyse et retrait conditionnel du migrateur historique du catalogue de langues de Proto05

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version obtenue : `0.1.60` (inchangée)

## Décision

`server/scripts/migrate-language-catalog.js` était un outil ponctuel entièrement obsolète. Il a été retiré avec son test dédié `server/test/language-migration.test.js`.

Aucune règle n'a été extraite : les transformations `legacy-*` vers les quatre identifiants `fr`, `es`, `it`, `pt`, la lecture d'un ancien magasin d'activités JSON et la création d'une sauvegarde `.bak` formaient exclusivement le contrat de la migration historique vers `0.1.12`. Elles ne définissent pas le comportement métier actuel.

## Analyse avant retrait

### Point d'entrée et accessibilité

- Point d'entrée manuel : `node server/scripts/migrate-language-catalog.js --data <json> --catalog <json>`, avec `--apply --backup <fichier.bak>` pour écrire.
- Entrées : un ancien magasin JSON exposant `activities[]` et un catalogue JSON contenant exactement `fr`, `es`, `it`, `pt` dans cet ordre.
- Effets possibles : lecture des deux JSON ; en mode `--apply`, copie exclusive `.bak`, écriture temporaire, `fsync`, puis renommage atomique du magasin.
- Exports : `catalogMap`, `migrateStore`, `runMigration`, `summarizeStore`, `validateMigratedStore`.
- Consommateur de code unique : `server/test/language-migration.test.js`.
- Aucun import depuis `server.js`, les routes, les repositories MariaDB, les frontières de lecture/écriture, les lanceurs, `package.json` ou les migrations techniques.
- La référence de `server/README.md` était déjà historique ; elle est maintenant formulée sans présenter un outil supprimé comme disponible.

### Contrat du test retiré

Le test historique vérifiait trois propriétés du seul migrateur : remappage d'une fixture synthétique `legacy-fr`/`legacy-es`, écriture atomique avec sauvegarde exacte, et refus d'un ancien code `DE`. Exécuté avant modification, il obtenait **3/3**. Il n'assurait aucun contrat du runtime MariaDB actuel.

### Équivalents actuels indépendants

- Le catalogue courant est exposé par `GET /api/proto05/language-catalog` et consommé comme référentiel.
- `server.js`, fonction `validateActivityIntegrity`, refuse les références de langue absentes pour transcription, segments et intervalles.
- `shared/video-metadata-contract.js`, fonction `validateProfile`, refuse une langue éditoriale absente des `knownLanguageIds`.
- `server/proto05-relational-mapping.mjs` projette les langues et les relations `activity_languages`, `activity_segment_languages` et `activity_language_intervals`.
- `server/proto05-mariadb-readonly.js` reconstruit ces relations depuis MariaDB ; `server/proto05-mariadb-write.js` les écrit via le repository MariaDB.
- Les contraintes relationnelles des migrations techniques protègent les références en base.

Le test d'intégration `server/test/mariadb-only-runtime.test.js` couvre également le catalogue et les mutations d'activités avec langues, mais il requiert une base temporaire et le démarrage du serveur : il n'a pas été exécuté, conformément à l'interdiction de cette mission.

## Modifications

- supprimé : `server/scripts/migrate-language-catalog.js` ;
- supprimé : `server/test/language-migration.test.js` ;
- modifié : `server/test/runtime-json-isolation.test.js`, qui exige désormais aussi l'absence physique du migrateur ;
- modifié : `server/README.md`, historique conservé mais outil signalé comme retiré ;
- créé : ce rapport.

Les données de référence, migrations techniques `001` à `006`, modules de projection/mapping, repositories, fixtures, archives, sauvegardes et rapports n'ont pas été modifiés.

## Vérifications

### Avant modification

- `node --test server/test/language-migration.test.js` : **3/3 réussis**.

### Après modification

- Contrat courant `validateProfile`, langue `fr` acceptée et `legacy-fr` refusée hors référentiel : **réussi**.
- Suites mapping, projection, Library, annotations et isolation runtime : **91/91 réussis**.
- Contrôles statiques vidéothèque, suppression, dérivation, cartes, aperçu et retours : **9/9 réussis**.
- Chargement exact des manifestes techniques : **001, 002, 003, 004, 005, 006 — 6 manifestes**.
- Recherche de `migrate-language-catalog`, `language-migration.test`, `activities.before-language-migration` et `EXPECTED_LANGUAGE_IDS` : seules les deux assertions négatives du test d'isolation subsistent.
- `git diff --check` : **réussi**.

### Non exécuté

- `server/test/mariadb-only-runtime.test.js` : nécessite une base MariaDB temporaire et un serveur ; explicitement hors périmètre.
- Aucun serveur, aucune interface, aucune connexion MariaDB et aucune migration réelle n'ont été lancés.

## État Git final

Changements limités à Proto05 et à ce rapport : deux suppressions, deux modifications ciblées et un rapport nouveau. Aucun commit ni push n'a été effectué.

## Limites et suite

La validation dynamique des routes linguistiques reste couverte par une suite d'intégration existante mais n'a pas été rejouée dans cette mission. Le prochain travail du plan 168 peut examiner les archives et sauvegardes restantes selon leur politique de rétention, sans remettre les anciens outils JSON dans le graphe runtime.

## Message de commit proposé

`chore(proto05): remove obsolete language catalog migrator`
