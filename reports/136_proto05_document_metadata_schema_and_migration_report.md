# Mission 136 — Proto05 — Persistance des métadonnées documentaires dans MariaDB

Date : 27 juillet 2026

Périmètre : Proto05 et base locale `ic_augmented_video` uniquement

Statut : **schéma installé, quatre lignes migrées, projection documentaire
intégralement réconciliée**

Version applicative : **0.1.45, inchangée**

## Résultat

Les métadonnées scalaires nécessaires pour reconstruire les documents Proto05
ont été persistées dans une table dédiée :

| Indicateur | Résultat |
|---|---:|
| Documents canoniques inventoriés | 5 |
| Documents portant une version de schéma | 4 |
| Lignes documentaires persistées | 4 |
| Horodatages documentaires persistés | 3 |
| Documents manquants | 0 |
| Documents supplémentaires | 0 |
| Propriétés manquantes | 0 |
| Propriétés supplémentaires | 0 |
| Valeurs divergentes | 0 |
| Pertes de précision temporelle | 0 |
| Hash du plan documentaire | `f266796b1e78ff06fcc30008d10119427bcd0ec2ebeea9716cc46cb5fc5c94bf` |
| Hash des quinze sources protégées | `a9c613242b38338dcb844a6a196015357d519c304a58eab09d6a0653c8f1afaa` |
| Hash des quatre lignes relues | `b6ee0ce1e759b112ca7aebd7d752d331ea49fa30e4c8b32b0847c8f20bdcb760` |
| Hash du contenu MariaDB final contrôlé | `588c10fc5f184379b0930c5ff130f2894639aaa4f5934076d688f5e5e04f4c60` |

L’application, les routes et l’interface n’ont pas été modifiées. Proto05
continue à lire exclusivement les JSON. Aucun adaptateur applicatif MariaDB,
dual-write, mécanisme de synchronisation ou écriture applicative MariaDB n’a été
introduit.

## Préflight

- branche : `main` ;
- commit de départ :
  `f809a363a40df4de5d88495a726be1b45b0f2300` ;
- libellé :
  `docs(proto05): record MariaDB read adapter metadata blocker` ;
- état Git initial : propre ;
- version Proto05 : `0.1.45` ;
- migration réelle Mission 134 présente ;
- rapport d’arrêt Mission 135 présent.

Le dry-run canonique initial puis final a confirmé :

- 435 chemins ;
- 3 222 occurrences observées et conciliées ;
- 264 lignes métier dans 27 tables alimentées ;
- 0 blocage ;
- 22 avertissements connus ;
- hash canonique
  `d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233`.

État MariaDB initial :

| Contrôle | Valeur |
|---|---:|
| tables | 31 |
| procédures | 43 |
| clés étrangères | 48 |
| contraintes `CHECK` | 65 |
| triggers | 0 |
| événements | 0 |
| lignes métier | 264 |
| tables métier alimentées | 27 |
| écarts avec le plan | 0 |
| orphelins | 0 |
| hash de projection Mission 134 | `5701301f90c874d2632ba5e0b9d2c138ff43c2e19964d3ac8051a65919c32f20` |

Un second instantané déterministe brut des 31 tables historiques a été calculé
par le migrateur documentaire :

`ac98aea7b8f453dd2eaf4b6ace0709c4ba5f76d61aeeeb6805aea9e2c366ae84`

Cet instantané est identique avant DDL, après DDL, après rollback et après
commit.

## Inventaire complet des racines documentaires

Les cinq documents et toutes leurs propriétés de premier niveau ont été
inventoriés. Les collections relèvent des données métier déjà migrées ou des
projections de compatibilité validées par les Missions 133 et 134. Les valeurs
scalaires documentaires ne sont pas confondues avec les versions applicatives
ou les dates d’entités.

| Document | Propriété racine | Valeur JSON | Exposée par l’API | Situation initiale | Classification et action |
|---|---|---|---:|---|---|
| `activities` | `schemaVersion` | `0.1` | oui | constante de schéma connue du validateur, absente des tables | persistée pour rendre la projection technique autonome |
| `activities` | `updatedAt` | `2026-07-26T17:30:42.426Z` | oui | utilisée comme repli lors de la migration métier, mais sans identité documentaire explicite | persistée exactement |
| `activities` | `activities` | 2 éléments | oui | 2 lignes et dépendances métier conciliées | reconstructible depuis les tables métier |
| `activity-library` | `schemaVersion` | `0.1` | oui | constante de schéma connue du code, absente des tables | persistée |
| `activity-library` | `updatedAt` | `2026-07-26T20:07:58.978Z` | oui | absente ; le maximum d’entité vaut `2026-07-26T20:07:55.023Z` et n’a pas le même sens | persistée exactement |
| `activity-library` | `folders` | 1 élément | oui | ligne métier conciliée | reconstructible |
| `activity-library` | `assignments` | 1 association | oui | relation d’affectation migrée et conciliée | reconstructible |
| `video-catalog` | `schemaVersion` | `0.1` | indirectement | constante du contrat de compatibilité, absente des tables | persistée |
| `video-catalog` | `videos` | 3 éléments | oui, comme catalogue de compatibilité | projection sémantique contrôlée par le dry-run | reconstructible selon le contrat de compatibilité existant |
| `video-library` / `media-library` | `schemaVersion` | `1.0` | oui | constante de schéma connue du validateur, absente des tables | persistée |
| `video-library` / `media-library` | `updatedAt` | `2026-07-26T18:39:12.425Z` | oui | absente ; le maximum d’entité vaut `2026-07-25T16:28:38.820Z` et n’a pas le même sens | persistée exactement |
| `video-library` / `media-library` | `assets` | 16 éléments | oui | 16 lignes métier conciliées | reconstructible |
| `video-library` / `media-library` | `sources` | 19 éléments | oui | 19 lignes métier conciliées | reconstructible |
| `video-library` / `media-library` | `playables` | 19 éléments | oui | 19 lignes métier conciliées | reconstructible |
| `video-library` / `media-library` | `treatments` | 2 éléments | oui | 2 lignes métier conciliées | reconstructible |
| `video-library` / `media-library` | `folders` | 1 élément | oui | ligne métier conciliée | reconstructible |
| `video-library` / `media-library` | `tags` | 3 éléments | oui | 3 lignes métier conciliées | reconstructible |
| `language-catalog` | `languages` | 4 éléments | oui via le catalogue de langues | 4 lignes métier conciliées | reconstructible ; aucune métadonnée scalaire à ajouter |

Il n’existe dans ces racines ni identifiant de document, ni version de
projection distincte, ni date de création, ni provenance scalaire
supplémentaire. L’inventaire ne justifie donc aucune autre colonne.

Bien que les quatre `schemaVersion` soient aussi définies par les validateurs,
elles ont été persistées : une lecture technique MariaDB peut ainsi restituer
entièrement les métadonnées sans dépendre d’une seconde source de vérité dans le
code. Le catalogue de langues, qui ne porte aucune métadonnée scalaire, ne
produit volontairement aucune ligne.

## Modèle retenu

Migration :

`prototypes/05-augmented-ic-video-01/database/migrations/004_proto05_document_metadata_schema.sql`

Table :

```text
data_projection_metadata
├── document_key          VARCHAR(64)  NOT NULL  PRIMARY KEY
├── schema_version        VARCHAR(32)  NOT NULL
└── source_updated_at_utc DATETIME(3)  NULL
```

Contrat :

- `document_key` identifie exactement l’une des quatre projections portant une
  version : `activities`, `activity-library`, `media-library` ou
  `video-catalog` ;
- `schema_version` suit le format numérique `majeure.mineure` ;
- `source_updated_at_utc` est obligatoire pour les trois documents qui portent
  `updatedAt` et obligatoirement `NULL` pour `video-catalog` ;
- la clé primaire interdit les doublons ;
- trois contraintes nommées expriment le jeu de documents, le format de version
  et la présence/absence de date ;
- moteur `InnoDB`, encodage `utf8mb4`, collation `utf8mb4_unicode_ci` ;
- aucune FK, car aucune ligne métier ne possède l’identité du document racine ;
- aucun blob JSON et aucun schéma clé/valeur arbitraire.

Le modèle ajoute une table spécialisée et quatre lignes, sans modifier les 31
tables métier ni les 43 procédures existantes.

## UTC et millisecondes

La connexion du migrateur impose une session MariaDB à `+00:00`. Le passage
JSON vers SQL est une conversion textuelle stricte :

```text
2026-07-26T20:07:58.978Z
→ 2026-07-26 20:07:58.978
→ DATETIME(3)
→ 2026-07-26T20:07:58.978Z
```

Le format accepté exige explicitement `Z` et trois chiffres de millisecondes.
Les dates sans millisecondes, avec décalage local ou avec un séparateur non ISO
sont refusées. La lecture MariaDB utilise six chiffres fournis par
`DATE_FORMAT`, puis exige et conserve exactement les trois chiffres stockés.

Les tests ont répété la conversion avec les fuseaux Node
`Pacific/Honolulu` et `Asia/Tokyo`. Le résultat reste identique. Les valeurs
bloquantes sont relues exactement :

- `2026-07-26T20:07:58.978Z` ;
- `2026-07-26T18:39:12.425Z`.

## Plan documentaire déterministe

Migrateur :

`prototypes/05-augmented-ic-video-01/database/migrations/005_proto05_document_metadata_migration.mjs`

Le plan protège les quinze fichiers, relance le plan métier historique et
refuse toute métadonnée racine inconnue. Il produit quatre lignes, triées par
`document_key`, sans avertissement :

| Clé | Version | Date UTC SQL | Source |
|---|---|---|---|
| `activities` | `0.1` | `2026-07-26 17:30:42.426` | `data/activities.json` |
| `activity-library` | `0.1` | `2026-07-26 20:07:58.978` | `data/activity-library.json` |
| `media-library` | `1.0` | `2026-07-26 18:39:12.425` | `data/video-library.json` |
| `video-catalog` | `0.1` | `NULL` | `data/video-catalog.json` |

Hash déterministe :

`f266796b1e78ff06fcc30008d10119427bcd0ec2ebeea9716cc46cb5fc5c94bf`

Les modes capables d’écrire exigent simultanément :

- la base exacte `ic_augmented_video` ;
- le hash exact du plan documentaire ;
- le hash exact des quinze sources ;
- une confirmation littérale propre à l’installation ou à l’insertion ;
- une sauvegarde pré-DDL complète et vérifiée ;
- une table documentaire vide pour l’insertion.

Le SQL d’insertion est paramétré. Il n’emploie ni upsert, ni
`INSERT IGNORE`, ni `REPLACE`, ni désactivation de contrainte.

Commande d’application, expurgée de tout secret :

```text
node database/migrations/005_proto05_document_metadata_migration.mjs \
  --apply \
  --database=ic_augmented_video \
  --expected-plan-hash=<hash documentaire validé> \
  --expected-source-set-hash=<hash des quinze sources> \
  --confirm=<confirmation explicite> \
  --backup-file=<sauvegarde absolue hors dépôt>
```

Le secret MariaDB est lu en mémoire depuis l’environnement interne du
conteneur. Il n’est ni argument, ni log, ni fichier du dépôt.

## Sauvegarde et distinction DDL/données

Sauvegarde pré-DDL complète, hors dépôt :

`C:\Users\david\AppData\Local\Temp\proto05_ic_augmented_video_before_m136_metadata.sql`

| Propriété | Valeur |
|---|---|
| taille | 312 208 octets |
| SHA-256 | `e0af4f1eec214ec164899ceac6dd41021e0dd2861ae64906b224514adf9cc45a` |
| tables détectées | 31 |
| procédures détectées | 43 |
| lisibilité | réussie |

L’installation du `CREATE TABLE` et l’insertion ont été exécutées en deux
phases distinctes :

1. installation stricte de la table ;
2. nouvelle connexion et transaction réservée aux quatre lignes.

Le `CREATE TABLE` provoque un commit implicite MariaDB. Le script ne prétend pas
que le rollback des données annule ce DDL. Si un échec était survenu après le
DDL, la table serait restée installée et vide ; le retour complet à l’état
pré-mission aurait nécessité une intervention humaine explicitement validée,
soit la suppression ciblée de cette seule table après contrôle d’impact, soit
la restauration de la sauvegarde vérifiée. Aucune restauration ni suppression
n’a été nécessaire.

La seconde installation a détecté la définition exacte déjà présente et a
retourné `already-installed`, sans reconstruire ni altérer la table.

## Rollback volontaire

Le scénario réel a :

1. vérifié le schéma installé ;
2. acquis le verrou nommé ;
3. ouvert une transaction ;
4. confirmé la destination vide ;
5. inséré les quatre lignes ;
6. relu toutes les colonnes et obtenu zéro écart ;
7. injecté `CONTROLLED_ROLLBACK_TEST` avant commit ;
8. exécuté `ROLLBACK` ;
9. libéré le verrou ;
10. ouvert une nouvelle connexion ;
11. confirmé zéro ligne documentaire ;
12. confirmé les 264 lignes métier et les témoins externes inchangés.

Résultat : `status=rolled-back`.

Ce rollback porte uniquement sur l’insertion transactionnelle. Il ne retire
pas la table déjà installée.

## Migration et réconciliation

La migration réelle a inséré puis committé exactement quatre lignes. Une
nouvelle connexion de lecture a effectué la validation post-commit.

| Document | Propriété | JSON attendu | MariaDB relu | Écart |
|---|---|---|---|---:|
| `activities` | `schemaVersion` | `0.1` | `0.1` | 0 |
| `activities` | `updatedAt` | `2026-07-26T17:30:42.426Z` | `2026-07-26T17:30:42.426Z` | 0 |
| `activity-library` | `schemaVersion` | `0.1` | `0.1` | 0 |
| `activity-library` | `updatedAt` | `2026-07-26T20:07:58.978Z` | `2026-07-26T20:07:58.978Z` | 0 |
| `media-library` | `schemaVersion` | `1.0` | `1.0` | 0 |
| `media-library` | `updatedAt` | `2026-07-26T18:39:12.425Z` | `2026-07-26T18:39:12.425Z` | 0 |
| `video-catalog` | `schemaVersion` | `0.1` | `0.1` | 0 |
| `video-catalog` | `updatedAt` | propriété absente | `NULL`, projeté comme absence | 0 |

Résumé avant et après commit :

| Contrôle | Avant commit | Après commit |
|---|---:|---:|
| lignes documentaires | 4 | 4 |
| documents manquants | 0 | 0 |
| documents supplémentaires | 0 | 0 |
| valeurs divergentes | 0 | 0 |
| pertes de précision | 0 | 0 |
| hash des lignes | `b6ee0ce1e759b112ca7aebd7d752d331ea49fa30e4c8b32b0847c8f20bdcb760` | `b6ee0ce1e759b112ca7aebd7d752d331ea49fa30e4c8b32b0847c8f20bdcb760` |

La projection technique démontre que les métadonnées racines peuvent désormais
être reconstruites depuis MariaDB sans lecture des JSON. Cette projection reste
limitée au migrateur et aux tests ; elle n’est reliée à aucune route.

## Seconde exécution

La commande d’application identique a été relancée après le commit.

Résultat attendu et obtenu :

- code non nul ;
- `DESTINATION_NOT_EMPTY` ;
- 4 lignes existantes ;
- refus avant écriture ;
- aucune différence avec le plan ;
- hash des lignes conservé :
  `b6ee0ce1e759b112ca7aebd7d752d331ea49fa30e4c8b32b0847c8f20bdcb760`.

Aucun doublon, upsert, update ou mécanisme de synchronisation n’a été créé.

## Intégrité des quinze fichiers protégés

Les SHA-256 initiaux et finaux sont identiques :

| Fichier | SHA-256 |
|---|---|
| `data/activities.20260716T205538855Z.before-original-copy-removal.json.bak` | `862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47` |
| `data/activities.json` | `95766C6256ACE97A39F63760B2EB530183910113D8DE6DEFF037D0B0F6D3D8C3` |
| `data/activities.json.bak` | `CB024E557A12BC84BB155955AE5C5270B4464350EC2C42243EA68C66F9FB9976` |
| `data/activities.pre-language-catalog-0.1.12.json.bak` | `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD` |
| `data/activity-library.json` | `63CE330896759421397C987CCC685884FFB6E1C93663B68B7D3D6EAD4C1C256A` |
| `data/activity-library.json.bak` | `1426A224FB94FB54273A2AAF489D29036A24A775FA3C7941903F7DFF8451FF65` |
| `data/backups/mission-102-video-library-0.1.json` | `361305F679391FB8559C2958880CE9DCB5A0CF238A1C6371A2B3F6583CFD7A9B` |
| `data/video-catalog.json` | `89A73A4065AB84AE1B676D25FBE62FD17FEB0FB51302997B49999E68B05FE373` |
| `data/video-catalog.json.bak` | `761410B2B5F1D981DB3996D663F7D6F4B3225E56EA09E8641E297C5E27260172` |
| `data/video-library.json` | `E98C9A4F051F09020E9227A37D60CF532FA446BA684B80BFB8505DBF3519D473` |
| `data/video-library.json.bak` | `64079311A2FE741F7448D2415F8E74B866F976006F0FB88265F51D545431028A` |
| `server/package.json` | `522EA570AC20703B10D66C4290DEA2A0988E91C7A800133971EB136201F1D826` |
| `server/test/fixtures/layer-visibility.activity.json` | `533556B24E33D49F746259CA9C072DBE4AEE39DF51ED0F1688E18395E03ECC39` |
| `server/test/fixtures/media-library-canonical.valid.json` | `1593A0498A3F343EC0C2A1EDAEE5425BAC3064CFDE075EC113DB5138E8291511` |
| `../../shared/reference-data/languages.json` | `E3034A20260C6F77569966E3CC05618402362822B038CAC4D491BAEE3AFFF355` |

Aucun de ces fichiers n’a été écrit.

## État SQL et témoins finaux

| Objet | Avant | Après |
|---|---:|---:|
| tables | 31 | 32 |
| tables alimentées | 27 | 28 |
| lignes totales | 264 | 268 |
| lignes métier historiques | 264 | 264 |
| lignes documentaires | 0 | 4 |
| procédures | 43 | 43 |
| clés étrangères | 48 | 48 |
| contraintes `CHECK` | 65 | 68 |
| triggers | 0 | 0 |
| événements | 0 | 0 |
| tables non-InnoDB | 0 | 0 |

Les trois nouvelles contraintes sont uniquement celles de
`data_projection_metadata`. Aucune contrainte historique n’a disparu.

| Témoin | Avant | Après |
|---|---|---|
| `ic_dico` | 8 tables, 0 vue, 9 procédures, données `786bd80a39604d9d25bdfd91286b5652b87c9f814afc10dd178dbde5dbb4815c` | identique |
| `ic_hub` | 15 tables, 1 vue, 3 procédures, données `3ae48844ed0b426479baf1b4d80f2b8d05352ca88cb5a03a00daceb8b68e2382` | identique |

Les témoins ont été pris par lectures de schéma et dumps de données
déterministes. Aucune écriture n’a ciblé ces bases ni une autre base.

## Tests exécutés

- validation syntaxique Node des migrations et tests concernés : réussie ;
- tests du plan et des migrateurs : **24/24** ;
- déterminisme du plan documentaire : réussi ;
- mauvaise base : refusée avant connexion ;
- hash source incorrect : refusé avant connexion ;
- destination non vide : refusée avant écriture ;
- timestamps exacts et stabilité UTC : réussis ;
- auto-tests du dry-run canonique : **22/22** ;
- tests du contrat média : **52/52** ;
- recette SQL Mission 133 adaptée : réussie, fixtures supprimées ;
- recette SQL Mission 136 : **10 contrôles**, réussie ;
- contraintes de clé, version et date : réussies ;
- rollback volontaire : réussi ;
- migration réelle : 4 lignes committées ;
- réconciliation avant et après commit : zéro écart ;
- seconde insertion : refusée ;
- seconde installation DDL : `already-installed` ;
- vérification Mission 134 après extension : 264 lignes, 27 tables métier,
  0 écart, 0 orphelin ;
- dry-run réel final : bilan et hash historique inchangés ;
- quinze hashes finaux : identiques ;
- témoins des autres bases : identiques ;
- `git diff --check` : réussi.

Chromium et FFmpeg n’ont pas été lancés.

## Fichiers concernés

Créés :

- `prototypes/05-augmented-ic-video-01/database/migrations/004_proto05_document_metadata_schema.sql` ;
- `prototypes/05-augmented-ic-video-01/database/migrations/005_proto05_document_metadata_migration.mjs` ;
- `prototypes/05-augmented-ic-video-01/database/tests/006_proto05_document_metadata_schema_validation.sql` ;
- `prototypes/05-augmented-ic-video-01/database/tests/007_proto05_document_metadata_migration.test.mjs` ;
- `reports/136_proto05_document_metadata_schema_and_migration_report.md`.

Modifiés :

- `prototypes/05-augmented-ic-video-01/database/migrations/003_proto05_json_to_mariadb_apply.mjs` :
  la vérification Mission 134 accepte explicitement l’état historique 31/65 et
  l’état étendu 32/68, tout en contrôlant la présence de la seule table
  documentaire ;
- `prototypes/05-augmented-ic-video-01/database/tests/004_proto05_schema_alignment_validation.sql` :
  totaux adaptés à la table et aux trois contraintes documentaires.

Aucun JSON, table métier, procédure, route, interface, dépendance ou fichier de
version n’a été modifié.

## Éléments non vérifiés, limites et suite

- Aucune recette Chromium, FFmpeg ou interface n’était nécessaire ou autorisée.
- Aucun test fonctionnel de lecture applicative MariaDB n’a été réalisé :
  l’adaptateur reste volontairement hors périmètre.
- La validation automatisée et MariaDB ne vaut pas validation humaine de David.
- La sauvegarde n’a pas été restaurée, car aucune divergence ne l’exigeait ; sa
  structure, ses données et sa lisibilité ont été contrôlées statiquement.
- La suite possible est une nouvelle mission explicitement confiée pour
  reprendre l’adaptateur de lecture MariaDB de la Mission 135.

## État Git final

- branche : `main` ;
- HEAD inchangé :
  `f809a363a40df4de5d88495a726be1b45b0f2300` ;
- version : `0.1.45`, inchangée ;
- aucun commit ;
- aucun push ;
- changements limités aux sept fichiers listés ci-dessus ;
- `git diff --check` : réussi.

Message de commit proposé, non exécuté :

```text
feat(proto05): persist canonical document metadata in MariaDB
```
