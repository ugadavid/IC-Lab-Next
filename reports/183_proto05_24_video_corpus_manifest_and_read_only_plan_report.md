# Mission 183 — Manifeste v1 et planificateur en lecture seule du corpus de 24 vidéos

Date : 2 août 2026  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.62`, inchangée  
Statut : plan produit, aucune application disponible ni exécutée

## 1. Résultat

Le manifeste v1 contient exactement les 24 vidéos auditées. Le plan réel, calculé deux fois depuis une transaction MariaDB `READ ONLY`, trouve les quatre correspondances attendues, propose vingt créations techniques, conserve les 24 enrichissements Qwen et les deux activités hors écriture canonique, et ne contient aucun conflit ni blocker.

MariaDB reste l’unique autorité métier. Le manifeste est une entrée d’import versionnée hors runtime. Le code livré ne contient aucune commande d’application, aucun accès réseau, aucun téléchargement et aucune écriture MariaDB.

## 2. État initial et contrats consultés

- Git initial : `HEAD 3e536ba`, worktree propre.
- Sources : `Liens_24videos.txt` et `ANALYSE_CORPUS_QWEN3_24_VIDEOS.md`.
- Instructions : `AGENTS.md`, architecture/provenance du workspace, README Proto05 et serveur.
- Référence : rapport 182 lu intégralement.
- Contrats : manifestes de schéma 001–006, projection Media Library, repository readonly, contrat des métadonnées vidéo, projection des activités, mapping relationnel et tests associés.
- Autorité confirmée : snapshot canonique produit exclusivement depuis MariaDB ; aucun fallback JSON métier.

Les deux sources ont été hachées avant validation et n’ont pas été modifiées.

## 3. Fichiers créés ou modifiés

- créé : `imports/corpora/repli4c-24-videos.v1.json` ;
- créé : `imports/plans/repli4c-24-videos.v1.plan.json` ;
- créé : `server/corpus-import-manifest.js` ;
- créé : `server/corpus-import-plan.js` ;
- créé : `server/scripts/corpus-import.js` ;
- créé : `server/test/corpus-import-plan.test.js` ;
- modifié : `server/package.json` (commande `corpus:plan` seulement) ;
- créé : ce rapport.

Aucun fichier métier canonique, migration, manifeste de schéma, activité ou média existant n’a été modifié.

## 4. Schéma final du manifeste

Le contrat fermé `proto05-corpus-import-manifest/1.0` contient :

- `corpus` : ID stable et deux sources avec rôles et SHA-256 ;
- `entries[24]` : ID stable, ordre, nom fonctionnel, groupe/cadre/réunion/plage textuelle, identité UGA, URL HLS complète, MIME, analyse provisoire et preuves ;
- `evidence` : axes distincts `origin` et `validation` ;
- `canonicalMatch` : quatre correspondances connues, seulement comme précondition ;
- `activityProposals[2]` : plage, titre, synthèse, vérifications requises et preuve `to-verify`.

Origines employées : `source-technical` pour le fichier de liens, `automatic-synthesis` pour les synthèses issues de l’analyse Qwen. Toutes les analyses et propositions sont `to-verify`. Aucune valeur n’est `human-verified`.

## 5. Inventaire du manifeste

| Ordre | ID | Groupe/cadre/réunion | Durée provisoire | Langues provisoires | Présence connue |
|---:|---:|---|---:|---|---|
| 1 | 36970 | GT01/RFC7/R1 | 193000 | pt, fr | absent |
| 2 | 36971 | GT01/RFC7/R1 | 392000 | pt, fr, es | existant |
| 3 | 36972 | GT01/RFC7/R1 | 312000 | pt, fr | absent |
| 4 | 36973 | GT01/RFC7/R1 | 198000 | pt, es, fr | existant |
| 5 | 36975 | GT01/RFC7/R1 | 183000 | pt, es, fr | absent |
| 6 | 36976 | GT01/RFC7/R1 | 163000 | fr, it, pt | existant |
| 7 | 36977 | GT01/RFC7/R1 | 252000 | fr, pt, es | absent |
| 8 | 36978 | GT01/RFC7/R1 | 283000 | fr, pt, es | absent |
| 9 | 36979 | GT01/RFC7/R1 | 149000 | pt, it, fr | absent |
| 10 | 36980 | GT01/RFC7/R1 | 190000 | pt, it, fr | absent |
| 11 | 36982 | GT01/RFC7/R1 | 415000 | fr, it, pt | absent |
| 12 | 36988 | GT08/RFC7/R3 | 142000 | es, it, pt, fr | absent |
| 13 | 36984 | GT08/RFC7/R3 | 364000 | pt, it, es, fr | absent |
| 14 | 36983 | GT08/RFC7/R3 | 159000 | pt, it, es, fr | absent |
| 15 | 36985 | GT08/RFC7/R3 | 179000 | pt, it, fr | absent |
| 16 | 36987 | GT08/RFC7/R3 | 110000 | pt | absent |
| 17 | 36996 | GT05/RFC8/R2 | 347000 | fr, pt, it | absent |
| 18 | 36997 | GT05/RFC8/R2 | 309000 | fr, pt, it | absent |
| 19 | 36998 | GT05/RFC8/R2 | 250000 | pt, it, fr | absent |
| 20 | 36995 | GT05/RFC8/R2 | 361000 | pt, fr, it | absent |
| 21 | 37000 | GT05/RFC8/R2 | 394000 | pt, fr | absent |
| 22 | 37001 | GT05/RFC8/R2 | 248000 | pt, fr, it | absent |
| 23 | 37003 | GT11/RFC8/R1 | 421000 | fr, es, it, pt | absent |
| 24 | 37004 | GT11/RFC8/R1 | 939000 | fr, es, it, pt | existant |

Ces durées et langues sont des propositions, jamais des métadonnées techniques/canoniques.

## 6. Validateur

Le validateur est pur : manifeste et témoins de hashes entrent en paramètres ; aucune lecture n’est effectuée par son cœur. Il refuse avant toute lecture métier :

- version, corpus, propriété ou structure inconnus ;
- cardinalité autre que 24 ou séquence d’ordre autre que 1–24 ;
- doublon d’entrée, ordre, videoId ou URL ;
- URL hors du chemin UGA exact ou incohérente avec le videoId ;
- langue hors `es/fr/it/pt` ou langue dupliquée ;
- milliseconde non entière, durée non positive ou passage mal borné ;
- preuve absente ou couple origine/validation incohérent ;
- `human-verified` sans validateur, date et preuve ;
- hash source différent ;
- activité A/B absente, mal liée ou mal bornée.

La mince couche de chargement calcule d’abord les hashes des deux sources, appelle le validateur, puis seulement autorise la lecture MariaDB.

## 7. Planificateur et matching exact

`createCorpusImportPlan` reçoit le manifeste validé, un snapshot canonique et les hashes. Il n’importe ni filesystem, ni client SQL, ni HTTP, et ne consulte ni horloge ni environnement.

Ordre effectif : identité UGA reconnue dans une URL exacte de source/playable ; URL canonique exacte et identité composée provider/videoId sont la même preuve structurée pour ce fournisseur. Un asset candidat unique est apparié. Plusieurs assets sont un blocker. Aucun candidat entraîne une proposition de création. Le titre, la durée, le nom, l’ordre et la similarité ne participent jamais au matching.

Les IDs des absents sont déterministes :

- `media-proto05-uga-<videoId>` ;
- `source-proto05-uga-<videoId>` ;
- `video-proto05-uga-<videoId>`.

Toute collision dans les espaces asset/source/playable bloque l’entrée. Les IDs existants ne sont jamais renommés.

## 8. Préservation et exclusions canoniques

Pour un match, le plan incorpore une vue de préservation et son hash : asset complet, sources, playables, traitements/dérivations et activités liées. Il ne produit aucune mutation de ces objets.

Pour un absent, seule la future création technique est décrite : asset titré par le nom fonctionnel, source HLS, playable distant, identité UGA et provenance du corpus.

Restent exclusivement dans `proposedEnrichments` avec `canonicalWrite:false` : durée Qwen, langues Qwen, résumé, intérêt pédagogique, passages et réserves. Droits, dossier et tags ne sont ni proposés ni inventés. Les activités A/B restent dans `proposedActivities` avec `canonicalWrite:false` :

- A : `37004`, 456000–627000 ms, « Ler/lire : faire comprendre et réparer » ;
- B : `36988`, 24000–135000 ms, « Un même changement climatique, plusieurs réalités locales ».

## 9. Plan réel

Commande :

```text
npm run corpus:plan -- --output=../imports/plans/repli4c-24-videos.v1.plan.json
```

La recette a utilisé directement l’équivalent Node depuis la racine Proto05. Résumé observé :

```text
entryCount: 24
matchedExistingCount: 4
createTechnicalMediaCount: 20
proposedEnrichmentCount: 24
proposedActivityCount: 2
conflictCount: 0
blockerCount: 0
```

État MariaDB projeté lors des deux lectures : 11 assets, 15 sources, 15 playables, 2 traitements et 4 activités.

### Quatre correspondances

| ID | Asset conservé | Preuve |
|---:|---|---|
| 36971 | `media-proto05-remote-ref-03738b8065e1866b8e956819` | URL UGA exacte |
| 36973 | `media-proto05-remote-ref-0b565a4a0ba865a02cd10c87` | URL UGA exacte |
| 36976 | `media-proto05-remote-ref-c3bd95a1556c0bb08ba0e0fb` | URL UGA exacte |
| 37004 | `media-proto05-video-proto05-uga-37004` | URL UGA exacte |

La description `D'où viens tu ?` de 36971 figure inchangée dans la vue de préservation. Les sources, playables, durées techniques, dérivations et titres sont capturés. L’activité `proto05-augmented-video-01` reste liée à 37004 et inchangée.

### Vingt créations techniques proposées

`36970`, `36972`, `36975`, `36977`, `36978`, `36979`, `36980`, `36982`, `36988`, `36984`, `36983`, `36985`, `36987`, `36996`, `36997`, `36998`, `36995`, `37000`, `37001`, `37003`.

Chaque entrée possède dans l’artefact les trois IDs déterministes, l’URL complète, le MIME et la provenance. Aucune de ces opérations n’a été exécutée.

## 10. Hashes et déterminisme

| Témoin | SHA-256 |
|---|---|
| `Liens_24videos.txt` | `9468300016f50ac0c3d71840c7230b74c66a78fd1aade340d3d1597572906677` |
| `ANALYSE_CORPUS_QWEN3_24_VIDEOS.md` | `75af843398b32b6ad4cae436b1589891fcba54254d275b639b1929bf78079931` |
| fichier manifeste | `14bdb5e5e52c25daa2f97f8f8ad3d1cb0756ab86e9ca12434b731e226b309401` |
| manifeste sémantique canonique | `549f9b8eb37d7aa963a81a5075632abf8cd23715db28a3ddad53f220aa4e48e1` |
| snapshot MariaDB canonique | `df27b10984eedaad61c776f77793407c908e20236c2769532292f0a4746eb65a` |
| cœur sémantique du plan | `36440eec6a9014210107c750152da472065b73656e9bd74284741040e20b9415` |
| fichier de plan complet | `5c419ace4a04d47eefb87723b96c5b44d425ee7ec54863ee912b911bbb0f5b21` |

Deux exécutions indépendantes successives ont produit le même snapshot hash, le même plan hash et exactement le même SHA de fichier. L’ordre physique des entrées ne change pas le plan : `corpusOrder` détermine l’ordre sémantique.

## 11. Absence de mutation

- chaque lecture utilise `START TRANSACTION READ ONLY, WITH CONSISTENT SNAPSHOT` ;
- la commande ne référence aucun repository d’écriture et n’expose que `plan` ;
- `apply` et toute commande inconnue sont refusés avant le chargement de configuration ;
- aucun DDL, DML, verrou d’écriture, FFmpeg, Qwen, HTTP externe ou analyse de média ;
- hashes des deux sources inchangés ;
- hashes de snapshot identiques avant/après les deux plans ;
- cardinalités et objets protégés identiques dans les deux projections ;
- seule écriture de la commande : l’artefact de plan explicitement demandé hors runtime métier.

## 12. Tests

Tests nouveaux : `28/28` réussis. Ils couvrent les 28 exigences explicites de la mission, y compris refus de `apply`, ambiguïtés, collisions, préservation, absence de fallback/réseau/écriture et déterminisme.

Suite ciblée combinée : `112` tests, `108` réussis et `4` échecs préexistants dans `schema-migrations.test.js`. Les quatre assertions attendent encore un état intermédiaire 005 alors que la Mission 167 a légitimement finalisé/adopté 006 :

- `empty install, populated baseline and a second run are deterministic` ;
- `routine adoption refuses an incomplete inventory` ;
- `a divergent routine is never silently adopted` ;
- `concurrent runners serialize and never double-register a migration`.

Ces échecs ne sont causés ni par le manifeste ni par le planificateur et n’ont pas été assouplis, conformément au périmètre. Les 108 autres contrôles, dont Media Library, activités, mapping, isolation JSON et migration 006 adoptExisting, réussissent.

La suite générale `npm test` a également été lancée. Elle n’a pas terminé dans la limite de 300 secondes et a été interrompue par le timeout ; aucun total final ne peut donc lui être attribué. Cette limite ne remplace pas les résultats ciblés ci-dessus. Les contrôles syntaxiques des trois modules réussissent. La recherche statique ne trouve aucune instruction SQL mutatrice, option `--apply`, primitive réseau, FFmpeg ou Qwen dans les trois modules de la mission. `git diff --check` réussit.

## 13. Limites et mission suivante

Le plan n’est pas une autorisation d’appliquer. La prochaine mission doit d’abord corriger séparément les quatre attentes historiques 005 si David souhaite une suite globale verte, puis préparer la porte d’application : sauvegarde vérifiée, compte et privilèges, préconditions de hashes, transaction/rollback injecté et validation humaine explicite du plan `36440e…b9415`.

Cette future mission ne devra toujours appliquer que les vingt créations techniques. Les enrichissements et activités resteront exclus jusqu’à validation humaine ou évolution séparément autorisée du contrat.

## 14. Version, Git et commit proposé

Version obtenue : `0.1.62`, inchangée. Cet outillage de planification ne modifie pas le comportement runtime ou l’interface.

État Git final exact :

```text
 M prototypes/05-augmented-ic-video-01/server/package.json
?? prototypes/05-augmented-ic-video-01/imports/
?? prototypes/05-augmented-ic-video-01/server/corpus-import-manifest.js
?? prototypes/05-augmented-ic-video-01/server/corpus-import-plan.js
?? prototypes/05-augmented-ic-video-01/server/scripts/corpus-import.js
?? prototypes/05-augmented-ic-video-01/server/test/corpus-import-plan.test.js
?? reports/183_proto05_24_video_corpus_manifest_and_read_only_plan_report.md
```

Le répertoire `imports/` contient exactement le manifeste v1 et l’artefact de plan v1. Aucun commit ni push.

Message de commit proposé :

```text
feat(proto05): add read-only corpus manifest planner
```
