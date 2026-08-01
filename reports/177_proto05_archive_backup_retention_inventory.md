# Mission 177 — Inventaire probant et politique de rétention des archives de Proto05

Date : 2026-08-01  
Périmètre analysé : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.60` (inchangée)  
Nature : audit exclusivement en lecture, sans serveur, base, migration ni régénération

## Conclusion

L'inventaire retient **66 candidats**. Il ne révèle **aucun doublon binaire exact** et ne permet de proposer **aucune suppression immédiate suffisamment démontrée**. Les contrats techniques et fixtures actuels doivent rester en place ; les sauvegardes de schéma et anciens moteurs possèdent une valeur probatoire ; l'ancien catalogue média et trois médias isolés nécessitent une politique humaine de rétention, notamment à cause d'un risque de données métier ou personnelles.

MariaDB demeure l'unique autorité métier du runtime. Aucun candidat classé comme archive, sauvegarde ou indéterminé n'est lu par le graphe serveur. Les deux seules familles candidates à une opération future sont : déplacement documenté des témoins techniques vers une archive, et examen humain des quatre éléments susceptibles de contenir des données métier ou personnelles. Ce ne sont pas encore des autorisations de déplacement ou de suppression.

## Méthode

L'inventaire a combiné :

- parcours récursif des 149 fichiers de Proto05 ;
- sélection par extensions de sauvegarde, noms de répertoire et termes `archive`, `backup`, `legacy`, `migration`, `snapshot`, `registry`, copies versionnées, fixtures, médias racine et artefacts SQL ;
- examen séparé des 27 JSON afin de ne pas assimiler extension JSON et caractère historique ;
- `git ls-files`, `git check-ignore -v` et `git log -1 --format=%cs -- <chemin>` ;
- `Get-FileHash -Algorithm SHA256` pour chaque candidat ;
- recherche `rg` par chemin, basename, répertoire, primitives `readFile`, `readdir`, `backup`, `manifest` et constructions dynamiques ;
- inspection limitée à la forme des JSON sensibles : clés, types et nombres de lignes, sans restituer leurs valeurs métier ;
- calcul d'une empreinte déterministe du jeu ordonné `chemin<TAB>sha256`.

Empreinte initiale du jeu des 66 candidats : `28935bf5ebc23ac49fe874a2c2d9e4a1fdf579a4bfd1fed03c8bad6fba9b339d`.

## Catégories opérationnelles

| Code | Catégorie | Définition appliquée |
|---|---|---|
| AI | Actif indispensable | Chargé par le runtime, une migration technique ou un test/protocole actuel. |
| FA | Fixture actuelle | Donnée synthétique ou contrôlée avec consommateur de test établi. |
| AHP | Archive historique probante | Témoin unique d'une transition, sans autorité runtime. |
| SSP | Sauvegarde de sécurité encore pertinente | Copie de données réelles dont la valeur de restauration ou de preuve dépasse Git. |
| AR | Artefact reproductible | Sortie déterministe entièrement reconstruisible depuis des sources conservées. |
| DE | Doublon exact | Octets identiques démontrés par SHA-256, sans valeur distincte. |
| OCR | Orphelin candidat au retrait | Aucun consommateur, aucune valeur unique, aucun besoin de restauration ou de test. |
| I | Indéterminé | Provenance, sensibilité, usage manuel ou valeur insuffisamment établis. |

Dispositions : **CE** conserver à l'emplacement ; **CD** conserver et documenter ; **DA** déplacer ultérieurement vers une archive identifiée ; **HD** conserver hors dépôt selon une procédure à définir ; **SU** supprimer dans une mission ultérieure ; **EM** examen humain obligatoire.

## Inventaire exhaustif

Les dates sont les dernières dates Git pertinentes ; `ignoré` signifie présent localement mais exclu par `.gitignore`. Les hashes sont ceux des octets observés. `R` = runtime, `T` = test actuel, `D` = documentation, `M` = usage manuel, `Ø` = aucun consommateur trouvé.

| Chemin | Octets | SHA-256 | Git/date | Consommation et rôle | Cat. | Disp. |
|---|---:|---|---|---|---|---|
| `.runtime-migration-006-adoption-registry-backup.json` | 536846 | `9575642b2f741465ab3d44f573eaa28c08174cd7fb973cb67f3a91385a98256b` | suivi/2026-08-01 | Ø ; témoin adoption 006, registre 001–005, schéma et hashes protégés | AHP | DA |
| `.runtime-migration-006-registry-backup.json` | 536877 | `4f628149a0ac0c09535c43d8837971a098aeddb6b8ae33db4ed97e13a03f8b1e` | suivi/2026-08-01 | Ø ; témoin avant application partielle 006 | AHP | DA |
| `data/backups/mission-102-video-library-0.1.json` | 152587 | `361305f679391fb8559c2958880ce9dcb5a0cf238a1c6371a2b3f6583cfd7a9b` | ignoré/- | Ø ; ancien catalogue réel, 15 assets/sources/playables | SSP | HD+EM |
| `database/backups/mission-154-schema-registry-before-baseline.json` | 4955 | `5dbf438dc5c3038e988def98b671b3b882d87c8946adf84e08987be64b800d3a` | ignoré/- | Ø ; registre vide, empreintes de données | AHP | DA |
| `database/backups/mission-154b-stored-procedures-before.json` | 469145 | `7c762fb77a89cf6e8d9a3a388ebff2249333be324963c17f7d36b400372c9ba3` | ignoré/- | Ø ; définitions de 43 procédures antérieures | AHP | DA |
| `database/backups/mission-155-before-002.json` | 462279 | `d71aaaef35d594d1f06f28fe8d4a6cafc7bd862f43e60b8f4d460653bc64ec97` | ignoré/- | Ø ; schéma/registre avant 002 | AHP | DA |
| `database/backups/mission-155-before-002-revision2.json` | 473905 | `c51511fd8539296365a81ba2e795b3216d8aed4c448c279f92fd2aec4a289236` | ignoré/- | Ø ; révision intermédiaire distincte | AHP | DA |
| `database/backups/mission-155-before-002-revision3.json` | 473845 | `f5ab46a5537d1779316d27599063c2857f08213d212846c1496f927d65919e45` | ignoré/- | Ø ; révision intermédiaire distincte | AHP | DA |
| `database/backups/mission-155-before-002-revision4.json` | 475146 | `cc1a5ba0427bca6de8785f1888a6d9e9d73e08c0e09a68fcfe7c508f911fdb39` | ignoré/- | Ø ; révision intermédiaire distincte | AHP | DA |
| `database/backups/mission-155-before-002-revision5.json` | 477578 | `0c94340535bf6f03115852402500cdf296d3df36eb2db46262396be29cd328a2` | ignoré/- | Ø ; révision intermédiaire distincte | AHP | DA |
| `database/backups/mission-155-before-002-revision6.json` | 479714 | `895de002acfcc3b38d5c6a1d99341ac0dbbb9b9b55063fe6715fcac7bf4211db` | ignoré/- | Ø ; révision intermédiaire distincte | AHP | DA |
| `database/backups/mission-155-before-002-revision7.json` | 484313 | `9f972b6fcde7df31ed21c1faf66c00e35285da3f03eefd79abbf88f3a6bbaacb` | ignoré/- | Ø ; révision intermédiaire distincte | AHP | DA |
| `database/backups/mission-155-before-002-revision8.json` | 484520 | `d34d57d04315863910212c8c50b524afbdd3386495d34acf8423a27f3bcf0cd8` | ignoré/- | Ø ; révision intermédiaire distincte | AHP | DA |
| `database/backups/mission-155-final-verified.json` | 484900 | `3418e71099be0eb959610446d9d9011d856a38ea73e5d63bc6370428b3eed0f5` | ignoré/- | Ø ; témoin final registre 001–002 | AHP | DA |
| `database/backups/mission-155-final-witness.json` | 484806 | `add423ad04a82f9f1fcfb78b2d67630ffa2b8e0a62c7e9781074d1ea8b069de1` | ignoré/- | Ø ; témoin final distinct | AHP | DA |
| `database/backups/mission-155-post-tests.json` | 484900 | `5bfb6d97af125fb91af40e4dd81207b16bf1b13a396c1badd711f47b441416b8` | ignoré/- | Ø ; état après tests, distinct par hash | AHP | DA |
| `database/backups/mission-156-before-003-registry.json` | 484900 | `2a40cc4b84bd608877e4fc6c6297e31916ea5bd110ce2f654ae9596627107de9` | ignoré/- | Ø ; témoin avant 003 | AHP | DA |
| `database/drafts/001_proto05_schema_draft.sql` | 111037 | `342c9145b95947e06fbc33d5eb2017182efa948c0763a5c58bf203c66fc16010` | suivi/2026-07-27 | D/M ; premier modèle relationnel | AHP | CD |
| `database/drafts/002_proto05_schema_revision.sql` | 148160 | `362d5aa73fae297eea37946d7dbe648a188393a29403de5c5fccd530324e157e` | suivi/2026-07-27 | M ; source annoncée par test SQL 002 | AHP | CD |
| `database/drafts/003_proto05_schema_hardening.sql` | 170706 | `a5e48057bd87dcbd1593b7627dab5078e193026d54892c8d6a4374f7b60e960c` | suivi/2026-07-31 | T/M ; copié par `schema-migrations.test.js`, source test SQL 003 | AI | CE |
| `database/migrations/002_proto05_mariadb_schema_alignment.sql` | 48416 | `4c216d8c6765d3f861be7b716f39467adefee76dd6ff0c75fc9126b33c968147` | suivi/2026-07-31 | T/M ; source technique conservée | AI | CE |
| `database/migrations/004_proto05_document_metadata_schema.sql` | 1579 | `1e756a22784fa147b1d74c2376d0f3cd281f60d8163309e3a5ac0f29d07dc375` | suivi/2026-08-01 | T/M ; source technique conservée | AI | CE |
| `database/migrations/006_proto05_video_plus_metadata_schema.sql` | 828 | `fc1e1d9aaa291e1d71e787e2aa76fb0d157057205906adc8b8ae3f2e58632d48` | suivi/2026-07-30 | T/M/D ; source technique conservée | AI | CE |
| `database/schema-migrations/manifest.json` | 2784 | `c049b1abe49b8cbd323e50a7891ce0b218a07f1aae60f29d4805f72f5a052f60` | suivi/2026-08-01 | R/T/M ; index exact 001–006 | AI | CE |
| `database/schema-migrations/001_proto05_canonical_schema.manifest.json` | 252757 | `7c1bdd43ef0a508b07355be561c9eb01d1b77cc24e838c82b7d86530d4ca2565` | suivi/2026-07-31 | R/T/M ; manifeste attendu 001 | AI | CE |
| `database/schema-migrations/002_proto05_canonical_routines.manifest.json` | 456170 | `3857c9cbd8cbe9a332021d7c818ee94283d1ccf625b10348d00f0c040490e4c0` | suivi/2026-07-31 | R/T/M ; manifeste attendu 002 | AI | CE |
| `database/schema-migrations/002_proto05_canonical_routines.sql` | 3721 | `a10d2fed3c25340ea87f4915878936a32e3eb1ff4280240ea74e7772acce69fb` | suivi/2026-07-31 | R/T/M ; DDL 002 | AI | CE |
| `database/schema-migrations/002_proto05_routine_session.sql` | 189 | `3e74dbf460210e3af502d8e3baae98d129b0840aeec1d17783f93321e905f579` | suivi/2026-07-31 | R/T/M ; préambule session 002 | AI | CE |
| `database/schema-migrations/003_proto05_audio_anonymization.manifest.json` | 495489 | `f0c02ff86699c9d779f8d98369082f3bdd6ffec2b5fdfeb927b048d3932d62aa` | suivi/2026-07-31 | R/T/M ; manifeste attendu 003 | AI | CE |
| `database/schema-migrations/003_proto05_audio_anonymization.sql` | 14453 | `f60fa656130522b2338ecd0cf4f9323d068858a12d3d3080d73faac1f9770593` | suivi/2026-07-31 | R/T/M ; DDL 003 | AI | CE |
| `database/schema-migrations/004_proto05_working_copy_delete.manifest.json` | 499427 | `61a21e16c4c243e7e64d81f4bb8f0f4ede01c03823656c76e4936b9ceffb1030` | suivi/2026-08-01 | R/T/M ; manifeste attendu 004 | AI | CE |
| `database/schema-migrations/004_proto05_working_copy_delete.sql` | 3440 | `ebb6522cded71ce315e369da6112bc9a6c73ff8beeb9877148ea7a76f044f7f2` | suivi/2026-08-01 | R/T/M ; DDL 004 | AI | CE |
| `database/schema-migrations/005_proto05_terminal_output_delete.manifest.json` | 504815 | `6b2081089149c6f15eaa1819896655716ad687447247beddea4309278acf1281` | suivi/2026-08-01 | R/T/M ; manifeste attendu 005 | AI | CE |
| `database/schema-migrations/005_proto05_terminal_output_delete.sql` | 4770 | `cd16ee275528a05a2fb6e43334864b4f6145e971360006059b3b14707fd78bd3` | suivi/2026-08-01 | R/T/M ; DDL 005 | AI | CE |
| `database/schema-migrations/006_proto05_asset_delete_lineage.manifest.json` | 504784 | `02f49433f544584babdf17038ac81cbecff91f1942aadb3e8478f02f091489bf` | suivi/2026-08-01 | R/T/M ; manifeste attendu 006 | AI | CE |
| `database/schema-migrations/006_proto05_asset_delete_lineage.sql` | 2558 | `70aa1f861c10f18d23894711ca70b64ec50c32ce3f16a7229346a442c3a8ff4e` | suivi/2026-08-01 | R/T/M ; DDL 006 | AI | CE |
| `database/tests/002_proto05_schema_validation.sql` | 13396 | `111dea449778292b0436d4f5a18d4fc1f1bd270260e0301a81c25f1a0626233e` | suivi/2026-07-27 | M ; validation du brouillon 002 | AHP | CD |
| `database/tests/003_proto05_schema_validation.sql` | 38167 | `f4431e69417a09c711944318ffdb7b6297878ca7c8ed4bc21c47a99bcdde0c2c` | suivi/2026-07-27 | M ; validation du brouillon 003 | AHP | CD |
| `database/tests/004_proto05_schema_alignment_validation.sql` | 13691 | `c459b154ef800ee02be26db8169eaf2862a7d8a2d7677ffa87aeaafd0d62ca31` | suivi/2026-07-31 | M ; recette du schéma aligné | AHP | CD |
| `database/tests/006_proto05_document_metadata_schema_validation.sql` | 6336 | `e6ac88d57ef68227e04aa7295e2aae640612103c6e64f5bc8c810b628a3cfcbc` | suivi/2026-07-31 | M ; recette métadonnées | AHP | CD |
| `database/tests/008_proto05_video_plus_metadata_schema_validation.sql` | 1032 | `d374176682e12d92e3d0d3733a85f22b623a401f84cd82a0f863310144c04287` | suivi/2026-07-30 | M ; recette vidéo/métadonnées | AHP | CD |
| `server/media-library-migration.js` | 25739 | `bec781368221c7b3702ac9fb759ef693264be3a521a99d38e42fe44b9c900b80` | suivi/2026-07-24 | T ; convertisseur pur conservé, sans I/O | AI | CE |
| `server/test/media-library-migration.test.js` | 8990 | `a442d39596ffe806c33610265ec8be87371f01cc50c598a608983b988e7f85fd` | suivi/2026-08-01 | T ; protège le convertisseur pur | AI | CE |
| `server/schema-migrations.js` | 38441 | `764dd7d4481f479b69026a82f5e67cf89d3604a669bf1e0fa46c1515930d5e98` | suivi/2026-08-01 | R/T/M ; chargeur, vérification et runner actuels | AI | CE |
| `server/scripts/schema-migrations.js` | 4696 | `160dbcd258ba5f4b4b2df7f74b6bd8122069b831b7277a09133f1d994c8eef20` | suivi/2026-07-31 | M/package ; CLI actuel | AI | CE |
| `server/test/schema-migrations.test.js` | 35107 | `0c63cf4be718c102f5e9dcca6946f949b4bf6f87c9a6993b7a3f2a4cefa37102` | suivi/2026-08-01 | T ; contrat du runner et sources copiées | AI | CE |
| `server/test/fixtures/fake-ffmpeg.js` | 1505 | `be41f11592e9ec4f389449eca43e32eab31974c73caa662ac4e8309c04147a04` | suivi/2026-08-01 | T ; `library-download-finalization.test.js` | FA | CE |
| `server/test/fixtures/layer-visibility.activity.json` | 4010 | `ea324913337cc2ac11bc672f7388f4572cda95d5aa9ff74c2975c07758d8ae1c` | suivi/2026-07-28 | T ; `teacher-ui-navigation.test.js` | FA | CE |
| `server/test/fixtures/media-library-canonical.valid.json` | 7422 | `1593a0498a3f343ec0c2a1edaee5425bac3064cfde075ec113db5138e8291511` | suivi/2026-07-24 | T ; trois suites actuelles | FA | CE |
| `index-0.0.1.html` | 15745 | `c0e38957e3bcc0957efaf22e31ac00f4088a0243d0cc79ee80f18866bbbf2535` | suivi/2026-07-10 | D ; première version décrite dans README | AHP | CD |
| `index-0.0.2.html` | 21413 | `0e95650af5de3e5693ab2e6dc9130ea9215ac415ee82b073930a1c2167828cfc` | suivi/2026-07-10 | D ; version documentée | AHP | CD |
| `index-0.0.3.html` | 25387 | `18e42938aba6bb0d4e3ec15d2786931e64f72513c08629523e5e944c8626c0c9` | suivi/2026-07-10 | D ; version documentée | AHP | CD |
| `index-0.0.4.html` | 28931 | `52ce89b39984fc6e18e685ba6b007604914fb39444ef06ea6b998ead62b8ed5e` | suivi/2026-07-10 | D ; version documentée | AHP | CD |
| `index-0.0.4.2.html` | 31511 | `73a3baf766f77a2956ec6bc975c581837bdbaafa42822efd4c5c9f631641efa2` | suivi/2026-07-10 | D ; version documentée | AHP | CD |
| `index-0.0.5.html` | 39936 | `010583319d26e69dbeee3ec26b7e96de7d88469f98bc2fbd472de2414ce499ce` | suivi/2026-07-10 | D ; version documentée | AHP | CD |
| `index-0.0.5.1.html` | 41772 | `a0f9ed3af8a94e61635a74c99444025ecd096d57fc297e441a7b4edb7c9efde9` | suivi/2026-07-10 | D ; version documentée | AHP | CD |
| `index-0.0.5.2.html` | 43544 | `54c4bb806f42a675c74438d45b7fc82c8124af79592e7a6d84b52ea78c8c8bd1` | suivi/2026-07-10 | D ; version documentée | AHP | CD |
| `index-0.0.6.html` | 51427 | `a190fcb07849157e7558261850491c55e5a26a9f43ec2741104acb77e374b441` | suivi/2026-07-10 | D ; nombreux rapports historiques | AHP | CD |
| `index-0.0.6.1.html` | 50678 | `ebb9dd28d7d05a34cb28224971017b454996828384754795fedbf9b50b3e706a` | suivi/2026-07-13 | D ; rapports 005/006/013 | AHP | CD |
| `index-0.0.6.2.html` | 50681 | `58529ddeba570de2f10b1895b1a56859c5e5b35134593f86e4c402b4ec7a1ff4` | suivi/2026-07-13 | D ; rapport 007 | AHP | CD |
| `index-0.0.7.html` | 50672 | `1fb8ca824783652f2f7596b8a2c70cd84d183ac9375db753cb0626857672e1a1` | suivi/2026-07-13 | D ; rapport 008 | AHP | CD |
| `index-0.0.8.html` | 52488 | `0d014219d53e8bf94b0f2e76d0406c3274525d0796f2271ee24dbb42c9425d06` | suivi/2026-07-13 | D ; nombreux rapports 009–041 | AHP | CD |
| `index-0.0.9.html` | 51878 | `cc6e646225b2a93c08179f36fc6a7c943be9df6b20d3d8c4362b96169098615a` | suivi/2026-07-31 | R/T/D ; `INDEX_FILE`, tests étudiant | AI | CE |
| `audio-1.mp3` | 3803549 | `42565df2f48ac85e5db1709700f4a567b5d4005329cd1605caf0635aaba2742a` | suivi/2026-07-10 | Ø ; provenance et personnes audibles non établies | I | EM |
| `video-1.pdf` | 43607 | `b741e984f38cca6bf6c0f8bcea1947136978ce6263ed2683414000662055f579` | suivi/2026-07-10 | Ø ; provenance et contenu non établis | I | EM |
| `videoframe_10238.png` | 1465122 | `f37bd0ce84be59d6ee23114b71316f96622b24d18cb192e886f2dcc4fd685a77` | suivi/2026-07-10 | Ø ; image potentiellement identifiable | I | EM |

## Doublons exacts et reproductibilité

Le regroupement des 66 fichiers par SHA-256 produit **zéro groupe de doublons exacts**. Les fichiers `mission-155-final-verified.json`, `mission-155-post-tests.json` et `mission-156-before-003-registry.json` ont la même taille mais des hashes différents : ils ne sont pas des doublons. Une ressemblance de structure ou une différence limitée à un horodatage n'autorise pas à les classer DE sans comparaison sémantique et décision de valeur probatoire.

Aucun fichier n'est classé AR : les manifestes sont des contrats versionnés actifs, tandis que les sauvegardes reflètent des états historiques réels qui ne sont pas reconstructibles exactement depuis le schéma actuel et Git seuls.

## Accès dynamiques et usages manuels

- `server/schema-migrations.js` construit dynamiquement `database/schema-migrations/manifest.json`, puis les chemins de sources et manifestes déclarés. Cette convention ne visite ni `database/backups/`, ni `database/drafts/`, ni `database/tests/`.
- `server/scripts/schema-migrations.js backup-registry --output` écrit uniquement vers un chemin explicitement fourni ; il ne découvre pas les sauvegardes inventoriées. `apply --backup` ne lit qu'un chemin explicite.
- `server/scripts/run-tests.js` découvre les fichiers `server/test/*.test.js`, pas les sauvegardes ou médias racine.
- `server.js` sert explicitement `index-0.0.9.html`; aucune résolution générique ne sélectionne les anciennes versions.
- Les tests construisent dynamiquement `server/test/fixtures/...`, avec consommateurs démontrés pour les trois fixtures.
- Aucun nom de sauvegarde Mission 102/154/155/156 n'est référencé dans le code courant. Leur emploi éventuel est manuel et historique.

## Risques de données sensibles

- L'ancien catalogue Mission 102 contient titres, URL, provenance et droits de médias réels. Il peut indirectement révéler personnes, ressources non publiques ou organisation du travail. Son contenu n'est pas reproduit ici.
- Les sauvegardes de registre contiennent surtout schéma, procédures, identifiant de base, acteur d'application, compteurs et hashes ; elles ne contiennent pas les lignes métier observées. Elles restent des métadonnées d'infrastructure à ne pas publier sans revue.
- Le MP3 peut contenir une voix ; le PNG peut montrer une personne ou une scène ; le PDF peut contenir des informations non publiques. Faute de provenance démontrée, ils restent indéterminés et intouchables.
- Les fixtures sont synthétiques ou contrôlées d'après leurs consommateurs et ne doivent pas être remplacées par des données réelles.

## Éléments formellement exclus de toute suppression

- tout `database/schema-migrations/**`, le chargeur, le CLI et leurs tests ;
- les sources techniques copiées par le test du runner ;
- `server/media-library-migration.js` et son test ;
- les trois fixtures actuelles ;
- `index-0.0.9.html` ;
- toutes les sauvegardes et archives probantes jusqu'à mise en œuvre d'une politique approuvée ;
- l'ancien catalogue Mission 102 et les trois médias indéterminés jusqu'à décision explicite ;
- les rapports historiques, hors inventaire fichier par fichier car situés hors du périmètre Proto05 et explicitement protégés par la mission ;
- les données linguistiques partagées : référencées hors Proto05 par le mapping, signalées mais non ouvertes ni reclassées.

## Candidats à une mission ultérieure

Il n'existe **aucun lot de suppression physique déjà autorisable par cette preuve**. Les lots suivants sont des étapes de décision réversibles :

1. **Témoins techniques suivis** : définir un emplacement d'archive et mettre à jour les références avant tout déplacement des deux `.runtime-*`.
2. **Témoins techniques ignorés** : copier avec contrôle SHA-256 vers un stockage de rétention défini, établir durée/propriétaire, puis seulement décider du maintien local des sauvegardes 154–156.
3. **Ancien catalogue métier** : revue propriétaire/RGPD, comparaison de la valeur de restauration avec MariaDB et définition d'un stockage chiffré hors dépôt.
4. **Médias indéterminés** : identification humaine de la provenance, des droits, des personnes et du lien éventuel avec les versions historiques ; décision séparée pour chaque fichier.
5. **Anciens moteurs HTML** : conserver en place tant que README et rapports les référencent ; un déplacement nécessiterait une mission documentaire dédiée.

Les seuls « candidats au retrait » au sens exploratoire sont les trois médias racine, mais ils restent catégorie I et **ne satisfont pas** les cinq preuves exigées pour une suppression. Aucun élément n'est catégorie OCR, DE ou AR.

## Contrôles exécutés

- inventaire statique : 149 fichiers, 27 JSON, 66 candidats ;
- statut Git : 50 suivis, 16 sauvegardes ignorées ; aucune modification initiale ;
- hashes : 66 SHA-256, zéro doublon exact ;
- `runtime-json-isolation.test.js` et `media-library-contract.test.js` : **59/59 réussis** ;
- tests statiques de navigation consommateurs de fixture : **5/5 réussis** ;
- test de la fixture FFmpeg, cas atomique sans serveur ni base : **1/1 réussi** ;
- tests statiques Library/vidéothèque : **9/9 réussis** ;
- chargement du contrat de migrations : exactement **001,002,003,004,005,006** ;
- recherches de consommateurs directs, noms historiques et constructions dynamiques : exécutées ;
- `git diff --check` : réussi après création du rapport.

## Contrôles non exécutés

- aucune suite nécessitant MariaDB ou un serveur ;
- aucun script SQL manuel ;
- aucune ouverture UI ;
- aucun installateur, migrateur, générateur de manifeste ou commande de sauvegarde ;
- aucune analyse biométrique, transcription audio ou extraction détaillée des documents/médias indéterminés : disproportionnée et susceptible d'exposer des données personnelles.

## Preuve de non-modification

L'empreinte du jeu des candidats avant création du rapport est `28935bf5ebc23ac49fe874a2c2d9e4a1fdf579a4bfd1fed03c8bad6fba9b339d`. Elle a été recalculée après les tests et la rédaction ; elle reste identique. Aucun des 66 candidats n'apparaît modifié dans Git. Le seul fichier créé par la mission est ce rapport.

## État Git final

- nouveau : `reports/177_proto05_archive_backup_retention_inventory.md` ;
- aucun fichier de Proto05 modifié, déplacé, renommé ou supprimé ;
- aucun commit ni push.

## Message de commit proposé

`docs(proto05): inventory historical artifacts and propose retention policy`
