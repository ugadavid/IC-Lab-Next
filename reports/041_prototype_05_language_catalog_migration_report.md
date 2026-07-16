# Rapport 041 — Migration des activités Proto05 vers le référentiel commun des langues

**Date :** 16 juillet 2026  
**Périmètre :** les cinq activités de `data/activities.json`, leurs références de
langues et les consommateurs actifs du Prototype 05  
**Mission :** faire de `shared/reference-data/languages.json` l’unique source de
vérité des langues Proto05, avec migration réversible et atomique.

## État réel observé avant modification

- Les instructions de `AGENTS.md`, `docs/ARCHITECTURE.md`, `STATUS.md`, le README
  Proto05, les rapports 039–040, le JSON canonique, le référentiel partagé et
  tous les consommateurs trouvés par recherche statique ont été inspectés.
- Le serveur était en version `0.1.11`; le moteur étudiant actif était
  `index-0.0.8.html`.
- Le JSON contenait exactement cinq activités : l’activité historique,
  `MboloTest`, `Lbinz`, `Original_copy` et `brouillon_vide`.
- L’activité historique utilisait `lang-fr`, `lang-es`, `lang-it`, `lang-pt`.
- `Original_copy` utilisait quatre identifiants locaux régénérés lors de sa
  duplication.
- `MboloTest` et `Lbinz` avaient `languages: []`, mais conservaient la référence
  orpheline `transcription.languageId: "lang-fr"`.
- `brouillon_vide` était déjà cohérent : collections vides et langue de
  transcription nulle.
- SHA-256 canonique initial :
  `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD`.
- Le worktree contenait des modifications antérieures non commitées, qui ont été
  préservées.

## Migration réalisée

La correspondance est déterminée par le code de chaque entrée historique :

| Ancien code | Identifiant stable | Libellé canonique |
|---|---|---|
| `FR` | `fr` | Français |
| `ES` | `es` | Espagnol |
| `IT` | `it` | Italien |
| `PT` | `pt` | Portugais |

Pour l’activité historique et `Original_copy`, la migration a remplacé les
entrées de `languages` et remappé :

- `transcription.languageId`;
- chaque valeur de `segments[].languageIds`;
- `languageIntervals[].languageId`.

Pour `MboloTest`, `Lbinz` et `brouillon_vide`, `languages`, `segments` et
`languageIntervals` restent vides et `transcription.languageId` vaut désormais
`null`.

Le script de migration vérifie que l’ordre et les identifiants des activités ne
changent pas, que les volumes restent identiques et que tout champ autre que les
références de langues et `updatedAt` est strictement égal avant/après. Il refuse
un code inconnu, un doublon, une référence orpheline ou un brouillon ayant des
segments/intervalles sans langue déclarée.

## État avant/après

| Activité | Segments | Intervalles | Phénomènes | Couches | Annotations | Langues avant | Langues après | Transcription après |
|---|---:|---:|---:|---:|---:|---|---|---|
| Activité historique | 11 | 22 | 26 | 7 | 11 | `lang-*` (4) | `fr es it pt` | `fr` |
| MboloTest | 0 | 0 | 0 | 0 | 0 | aucune | aucune | `null` |
| Lbinz | 0 | 0 | 0 | 0 | 0 | aucune | aucune | `null` |
| Original_copy | 11 | 22 | 14 | 7 | 11 | identifiants locaux (4) | `fr es it pt` | `fr` |
| brouillon_vide | 0 | 0 | 0 | 0 | 0 | aucune | aucune | `null` |

Les locuteurs restent respectivement à 5 pour les deux activités remplies et à
0 pour les trois brouillons. Les temps, segments, phénomènes, couches,
annotations et relations segment/phénomène n’ont pas été modifiés.

## Procédure sûre et SHA-256

1. Le canonique a été copié dans un dossier temporaire du système.
2. La migration complète a été appliquée sur cette copie avec une sauvegarde
   temporaire.
3. L’état avant/après, les volumes, identifiants et références ont été validés.
4. Les quatre tests ciblés et la recette Chromium ont été exécutés avec des
   serveurs et JSON temporaires; le SHA canonique est resté inchangé pendant ces
   tests.
5. Juste avant l’écriture canonique, le SHA initial a été revérifié et l’absence
   de collision du chemin de sauvegarde a été contrôlée.
6. Le script a créé la sauvegarde sans écrasement, écrit un fichier temporaire
   adjacent, forcé son contenu sur disque puis renommé ce fichier sur le JSON
   canonique.
7. Une validation complète en lecture seule a été répétée sur le résultat.

Horodatage appliqué : `2026-07-16T20:18:59.918Z`.

- SHA-256 avant :
  `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD`;
- SHA-256 après :
  `C5A78CB6281DDE50E26765ECCF5BD7A967E84C701CCA058802BEF9D85E47773B`;
- SHA-256 de la sauvegarde :
  `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD`.

Sauvegarde dédiée :
`prototypes/05-augmented-ic-video-01/data/activities.pre-language-catalog-0.1.12.json.bak`.
L’ancien `activities.json.bak` éventuel n’a pas été remplacé par la migration.

## Retour arrière

Le retour arrière n’a pas été exécuté. Procédure documentée :

1. arrêter le serveur Proto05 pour éviter une écriture concurrente;
2. vérifier que le SHA-256 de la sauvegarde dédiée est exactement le SHA initial
   indiqué ci-dessus;
3. copier cette sauvegarde vers un fichier temporaire adjacent à
   `activities.json`;
4. renommer atomiquement le temporaire sur `activities.json`;
5. vérifier le SHA restauré, puis redémarrer le serveur;
6. si le code `0.1.12` doit rester actif après ce retour de données, ne pas
   sauvegarder les anciennes activités : la validation stricte refusera leurs
   anciens identifiants. Un retour complet cohérent exige aussi de restaurer le
   code `0.1.11` ou de réappliquer ensuite la migration.

## Consommateurs et source unique

- L’atelier auteur charge directement
  `GET /api/proto05/language-catalog` et ne comporte plus de mode de compatibilité
  pour des langues historiques.
- Le serveur valide chaque entrée `{ id, code, label }` contre le référentiel et
  refuse les identifiants locaux.
- La duplication conserve les identifiants globaux `fr`, `es`, `it`, `pt`; elle
  ne régénère plus d’identifiants de langues propres à la copie.
- L’atelier guidé propose uniquement `activity.languages`; cette sélection est
  désormais une matérialisation validée du référentiel commun.
- Le moteur étudiant et la timeline partagée résolvent les références de
  segments et d’intervalles à partir de cette même sélection validée.
- Les chaînes `lang-fr`, `lang-es`, `lang-it`, `lang-pt` encore visibles dans le
  moteur sont des classes CSS calculées depuis les codes `FR`, `ES`, `IT`, `PT`,
  pas un second référentiel ni des références de données.

## Version obtenue

- Serveur Proto05 : `0.1.11` → `0.1.12`.
- Moteur étudiant : `index-0.0.8.html`, inchangé.
- Référentiel partagé : contenu inchangé; il devient la source unique effective
  pour toutes les activités Proto05.

L’incrément `0.1.12` est un baby step fonctionnel couvrant la migration des
données, la validation stricte et la duplication compatible avec les
identifiants globaux.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/data/activities.json`
- `prototypes/05-augmented-ic-video-01/data/activities.pre-language-catalog-0.1.12.json.bak`
- `prototypes/05-augmented-ic-video-01/server/scripts/migrate-language-catalog.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/server/test/language-migration.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/activity-duplication.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/empty-draft-validation.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/fixtures/layer-visibility.activity.json`
- `prototypes/05-augmented-ic-video-01/README.md`
- `shared/reference-data/README.md`
- `docs/ARCHITECTURE.md`
- `STATUS.md`
- `reports/041_prototype_05_language_catalog_migration_report.md`

`shared/reference-data/languages.json` a été lu et validé, mais son contenu n’a
pas été modifié.

## Contrôles réalisés

### Analyse statique et copie temporaire

- `npm run check` : réussi en version `0.1.12`.
- `git diff --check` : réussi; seuls les avertissements Windows LF/CRLF du
  worktree ont été affichés.
- Recherche de tous les consommateurs de `languages`, `languageId` et
  `languageIds` : atelier avancé, atelier guidé, moteur étudiant, timeline,
  serveur et tests inspectés.
- Migration préalable sur copie temporaire : réussie, sauvegarde temporaire au
  SHA initial, résultat validé sans écriture canonique.
- Validation post-écriture en lecture seule : le SHA produit par une nouvelle
  migration idempotente est identique au SHA canonique final.

### Quatre tests ciblés

Commande :

`node --test --test-concurrency=1 test/language-migration.test.js`

Résultat final : **4 tests réussis, 0 échec**.

1. migration des cinq activités en mémoire, préservation des volumes et des
   contenus hors langues;
2. application atomique sur copie temporaire et sauvegarde exacte;
3. serveur temporaire : refus d’un ancien identifiant et duplication avec
   identifiants stables;
4. recette Chromium sur serveur et données temporaires.

Un premier passage a échoué dans le test parce que `brouillon_vide` avait été
pris pour l’identifiant alors qu’il est le titre de l’activité. Le test a été
corrigé puis relancé, comme autorisé après détection d’un échec. Ce premier
passage n’a écrit aucune donnée canonique.

### Recette Chromium

Une recette Chromium réussie a couvert, dans la même page de contrôle :

- l’activité historique en vue étudiante, avec 11 segments rendus et les langues
  `fr`, `es`, `it`, `pt`;
- `brouillon_vide` dans l’atelier auteur, avec les quatre options du référentiel,
  sélecteur actif et sauvegarde réussie sans langue sélectionnée;
- relecture du brouillon avec `languages: []` et
  `transcription.languageId: null`;
- viewport `1440×1000`.

Chromium a aussi été lancé lors du premier passage en échec, mais le scénario
s’est arrêté avant la vérification du brouillon en raison de l’identifiant de
test erroné. Il n’a touché qu’une fixture temporaire.

### Suite complète

La suite complète des 55 tests n’a pas été relancée. Le premier échec ciblé
était localisé dans le nouveau test, et la relance ciblée a entièrement réussi;
aucun indice n’a justifié l’élargissement automatique de la suite.

## Limites restantes

- `Original_copy` conserve ses incohérences historiques de références de
  phénomènes, volontairement hors périmètre. Aucun phénomène, segment ni lien
  segment/phénomène n’a été modifié.
- Certains identifiants opaques d’intervalles historiques contiennent encore le
  texte `lang-fr` ou équivalent. Ces chaînes font partie de l’identifiant de
  l’intervalle, ne sont pas des `languageId`, ne sont interprétées par aucun
  consommateur et n’ont pas été renommées afin de préserver les identifiants
  hors périmètre.
- Aucune authentification, gestion vidéo, modification HLS, migration des
  observations ou décision sur la source segment/phénomène n’a été ajoutée.
- La sauvegarde `.bak` permet le retour des données, mais un rollback complet
  doit maintenir la cohérence entre la version du code et le format des langues.
- Aucune validation fonctionnelle humaine par David n’a été réalisée.

## Validation humaine

Les faits ci-dessus résultent de l’inspection, des validations automatiques et
de la recette Chromium de Codex. Ils ne constituent pas une validation humaine
de David.

## Message de commit proposé

`feat(proto05): migrer les activités vers les langues partagées`
