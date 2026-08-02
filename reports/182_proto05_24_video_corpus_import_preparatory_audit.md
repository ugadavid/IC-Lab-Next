# Mission 182 — Audit préparatoire à l’intégration automatisée du corpus de 24 vidéos dans Proto05

Date : 2 août 2026  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Nature : audit et conception en lecture seule ; aucune implémentation d’import  
Version du dépôt : `0.1.62`, inchangée

## Résultat exécutif

Le corpus source est cohérent et joignable sans ambiguïté : 24 entrées, 24 identifiants UGA distincts, 24 URL HLS distinctes et 24 lignes d’analyse Qwen correspondantes. Quatre vidéos existent déjà dans la Media Library (`36971`, `36973`, `36976`, `37004`) ; `37004` est la seule déjà liée à une activité. Les vingt autres sont absentes.

MariaDB est l’unique autorité métier. Un futur import devra être piloté par un manifeste versionné distinct de cette autorité, produire un plan déterministe en lecture seule, préserver tous les champs manuels existants, puis appliquer le plan sous transaction et verrou applicatif. Aucun rapprochement flou par titre ne doit être autorisé.

Un verrou de conception subsiste avant l’import des enrichissements : le contrat actuel des métadonnées vidéo sait stocker des valeurs éditoriales, mais pas leur état de connaissance champ par champ. Les résumés, langues et passages issus de Qwen ne peuvent donc pas être versés honnêtement dans les champs canoniques en conservant « à vérifier ». La correction minimale future est soit (a) importer seulement les identités et sources techniques et conserver les propositions Qwen dans le manifeste, soit (b) mener d’abord une mission séparée d’extension explicite du contrat de métadonnées. L’option (a) est recommandée pour le premier incrément.

## Périmètre et état initial

Sources fournies, lues intégralement et laissées intactes :

| Source | Taille | SHA-256 avant et après audit | Statut Git |
|---|---:|---|---|
| `prototypes/05-augmented-ic-video-01/Liens_24videos.txt` | 4 218 octets | `9468300016F50AC0C3D71840C7230B74C66A78FD1AADE340D3D1597572906677` | non suivi, préexistant |
| `prototypes/05-augmented-ic-video-01/ANALYSE_CORPUS_QWEN3_24_VIDEOS.md` | 19 438 octets | `75AF843398B32B6AD4CAE436B1589891FCBA54254D275B639B1929BF78079931` | non suivi, préexistant |

État Git initial : `HEAD c40f604`; seuls ces deux fichiers étaient non suivis. Aucun serveur, processus, média, fichier métier ou enregistrement MariaDB n’a été modifié. Les quelques requêtes HTTP locales ont uniquement chargé les projections réelles déjà exposées par Proto05 ; elles n’ont déclenché ni téléchargement externe ni écriture.

## Autorité et modèle de données actuel

Le runtime de Proto05 lit et écrit les données métier dans `ic_augmented_video` par son serveur sur le port 8791. Il n’existe aucun fallback JSON métier. Les JSON 001–006 de `database/schema-migrations/` sont des contrats techniques du schéma et non une persistance métier.

La Media Library sépare correctement :

- `media_assets` : identité éditoriale durable, titre, description, métadonnées, provenance, droits, dossier, famille ;
- `media_sources` : origine technique, fournisseur, transport et URL d’origine ;
- `media_playables` et `media_playable_metadata` : représentation réellement lisible, disponibilité et métadonnées techniques ;
- `media_folders`, `media_tags`, `media_asset_tags` : classement ;
- `activity_media_links` : association d’une activité à un asset/playable ;
- `activities` et ses tables d’authoring : brouillon pédagogique, segments, langues, phénomènes et annotations.

Une URL HLS distante et une copie locale éventuelle doivent rester des représentations d’un même asset. L’identité externe appartient à la source/provenance ; elle ne doit pas être déduite du titre. Les champs éditoriaux existants appartiennent à l’utilisateur et priment sur un enrichissement automatique.

Mécanismes réutilisables : validation des contrats, projection relationnelle pure, repositories MariaDB, procédure d’enregistrement d’un média, écriture transactionnelle avec verrou nommé, contrôles de disponibilité et runner de migrations de schéma. Il n’existe plus de chaîne générique JSON métier → MariaDB et il ne faut pas la recréer. Le flux interactif d’ajout d’une référence distante réalise une analyse réseau et emploie un jeton de confirmation ; ce n’est pas un importeur de corpus hors ligne.

## Inventaire exact des 24 vidéos

Préfixe URL exact commun `H` : `https://videos.univ-grenoble-alpes.fr/media/videos/7d74074b07ff1dfc9ed59cdade1a126fc17fed888ca9d26da6e5b2875e8b5120/`. Dans le tableau, `H<id>/livestream.m3u8` désigne la concaténation littérale avec ce préfixe.

Les durées, langues, résumés et intérêts sont des résultats automatiques provisoires, non une vérité validée humainement.

| Ordre | ID | Nom fonctionnel source | Groupe / réunion | Durée Qwen | Langues Qwen | Résumé et passage remarquable provisoires | URL HLS exacte | État Proto05 observé |
|---:|---:|---|---|---:|---|---|---|---|
| 1 | 36970 | `GT01_RFC7_reu1_09m05-12m09` | GT01 / RFC7 / R1 | 03:13 | PT, FR | Framapad et journal climatique ; 00:00–00:27 *compartilhar/partager*. | `H36970/livestream.m3u8` | absent |
| 2 | 36971 | `GT01_RFC7_reu1_14m34-18m` | GT01 / RFC7 / R1 | 06:32 | PT, FR, ES | Journal, micro et justification du format ; 04:24–05:39 argumentation/reprises plurilingues. | `H36971/livestream.m3u8` | asset existant, aucune activité |
| 3 | 36972 | `GT01_RFC7_reu1_21m10-26m15` | GT01 / RFC7 / R1 | 05:12 | PT, FR | Journal interactif, Genially/Canva et arbitrage de format ; 03:12–05:12. | `H36972/livestream.m3u8` | absent |
| 4 | 36973 | `GT01_RFC7_reu1_26m20-29m40` | GT01 / RFC7 / R1 | 03:18 | PT, ES, FR | Rubriques du journal ; 01:24–02:39 proposition espagnole et reformulations. | `H36973/livestream.m3u8` | asset existant, aucune activité |
| 5 | 36975 | `GT01_RFC7_reu1_36m35-39m30` | GT01 / RFC7 / R1 | 03:03 | PT, ES, FR | Négociation du journal et des mots croisés interactifs ; 00:00–01:39. | `H36975/livestream.m3u8` | absent |
| 6 | 36976 | `GT01_RFC7_reu1_41m30-44m` | GT01 / RFC7 / R1 | 02:43 | FR, IT, PT | Ancien jeu Genially et réappropriation technique. | `H36976/livestream.m3u8` | asset existant, aucune activité |
| 7 | 36977 | `GT01_RFC7_reu1_44m15-48m12` | GT01 / RFC7 / R1 | 04:12 | FR, PT, ES | Mots croisés plurilingues ; 00:48–03:39 stratégies lexicales et aides. | `H36977/livestream.m3u8` | absent |
| 8 | 36978 | `GT01_RFC7_reu1_48m10-52m43` | GT01 / RFC7 / R1 | 04:43 | FR, PT, ES | Récapitulatif et modèle espagnol–italien ; 02:12–03:39 dispositif d’indices. | `H36978/livestream.m3u8` | absent |
| 9 | 36979 | `GT01_RFC7_reu1_59m20-1h01m40` | GT01 / RFC7 / R1 | 02:29 | PT, IT, FR | Glossaire climatique ; 00:12–02:27 transparence et distance lexicales. | `H36979/livestream.m3u8` | absent |
| 10 | 36980 | `GT01_RFC7_reu1_1h05m15-1h08m17` | GT01 / RFC7 / R1 | 03:10 | PT, IT, FR | Effets climatiques au lac de Côme ; 01:00–02:39 clarification plurilingue. | `H36980/livestream.m3u8` | absent |
| 11 | 36982 | `GT01_RFC7_reu1_1h17m23-1h24m03` | GT01 / RFC7 / R1 | 06:55 | FR, IT, PT | Récapitulatif de production et tâches ; 03:36–04:27 photos avant/après. | `H36982/livestream.m3u8` | absent |
| 12 | 36988 | `GT08-RFC7_reu3_13m16-15m32` | GT08 / RFC7 / R3 | 02:22 | ES, IT, PT, FR | Conséquences locales du climat ; 00:24–02:15, activité B proposée. | `H36988/livestream.m3u8` | absent |
| 13 | 36984 | `GT08-RFC7_reu3_17m42-23m30` | GT08 / RFC7 / R3 | 06:04 | PT, IT, ES, FR | Format/épisodes d’un podcast ; 02:36–04:39 structuration plurilingue. | `H36984/livestream.m3u8` | absent |
| 14 | 36983 | `GT08-RFC7_reu3_33m21-35m52` | GT08 / RFC7 / R3 | 02:39 | PT, IT, ES, FR | Binômes et durée des podcasts ; contenu principalement organisationnel. | `H36983/livestream.m3u8` | absent |
| 15 | 36985 | `GT08-RFC7_reu3_43m07-45m55` | GT08 / RFC7 / R3 | 02:59 | PT, IT, FR | Canal YouTube, image et bannière ; détection « chinois » réputée fausse. | `H36985/livestream.m3u8` | absent |
| 16 | 36987 | `GT08-RFC7_reu3_57m16-59m` | GT08 / RFC7 / R3 | 01:50 | PT | Rôle du *roteiro* et vérification par des non-locuteurs. | `H36987/livestream.m3u8` | absent |
| 17 | 36996 | `GT05-RFC8_reu2_11nov25_08m50-14m30` | GT05 / RFC8 / R2 | 05:47 | FR, PT, IT | Titre plurilingue et langues du plan de travail. | `H36996/livestream.m3u8` | absent |
| 18 | 36997 | `GT05-RFC8_reu2_11nov25_18m40-23m40` | GT05 / RFC8 / R2 | 05:09 | FR, PT, IT | Public et diffusion d’un portfolio ; 00:36–02:39 justification du besoin. | `H36997/livestream.m3u8` | absent |
| 19 | 36998 | `GT05-RFC8_reu2_11nov25_27m25-31m37` | GT05 / RFC8 / R2 | 04:10 | PT, IT, FR | *Compte rendu/rapport/ata* ; 01:48–03:51 équivalence et responsabilité. | `H36998/livestream.m3u8` | absent |
| 20 | 36995 | `GT05-RFC8_reu2_11nov25_35m30-40m54` | GT05 / RFC8 / R2 | 06:01 | PT, FR, IT | Catégories du portfolio ; 03:36–04:51 explication de *palestras*. | `H36995/livestream.m3u8` | absent |
| 21 | 37000 | `GT05-RFC8_reu2_11nov25_41m02-47m27` | GT05 / RFC8 / R2 | 06:34 | PT, FR | Binômes plurilingues et ajustements ; noms parfois confus. | `H37000/livestream.m3u8` | absent |
| 22 | 37001 | `GT05-RFC8_reu2_11nov25_47m30-51m30` | GT05 / RFC8 / R2 | 04:08 | PT, FR, IT | Répartition des catégories ; 02:00–02:51 incompréhension/répétition. | `H37001/livestream.m3u8` | absent |
| 23 | 37003 | `GT11-RFC8_reu1_28oct2025_0m-5m47` | GT11 / RFC8 / R1 | 07:01 | FR, ES, IT, PT | Cartographie des répertoires ; 03:00–06:48 langues comprises. | `H37003/livestream.m3u8` | absent |
| 24 | 37004 | `GT11-RFC8_reu1_28oct2025_05m47-22m24` | GT11 / RFC8 / R1 | 15:39 | FR, ES, IT, PT | Présentations et réparations ; 07:36–10:27 *ler/lire*, activité A proposée. | `H37004/livestream.m3u8` | asset existant et activité actuelle distincte |

Contrôles de cardinalité : 24 lignes de liens, 24 IDs uniques, 24 URL uniques, 24 entrées d’analyse, ensembles d’IDs identiques. Aucun doublon interne. L’ordre source n’est pas l’ordre numérique (notamment GT08 et GT05) : `corpusOrder` doit donc être conservé explicitement. Les séparateurs `_`/`-`, le point manquant dans un libellé et les plages inscrites dans les noms sont des variations de libellé à préserver, pas des identités à normaliser destructivement.

Les plages des noms ne sont pas des durées techniques fiables. L’écart entre leur longueur et la durée Qwen va de quelques secondes à +186 s, +74 s ou −58 s. La durée Qwen doit rester `to-verify`; seule une durée mesurée sur un playable peut devenir technique. Exemple réel : `37004` expose 939 217 ms pour le HLS et 939 238 ms pour sa copie locale, contre 15:39 dans l’analyse.

## État réel des quatre correspondances

| ID | Asset / situation | Champs manuels et relations à préserver |
|---:|---|---|
| 36971 | `media-proto05-remote-ref-03738b8065e1866b8e956819`; trois sources/playables dont copie locale | titre `2. GT01_RFC7_reu1_14m34-18m`, description `D'où viens tu ?`, durée locale 391 838 ms, IDs, provenance, famille/dérivations ; aucune activité |
| 36973 | `media-proto05-remote-ref-0b565a4a0ba865a02cd10c87`; HLS distant | titre existant, IDs et source ; aucune activité |
| 36976 | `media-proto05-remote-ref-c3bd95a1556c0bb08ba0e0fb`; distant + dérivation locale | titre, durée locale 163 438 ms, IDs, provenance et dérivation ; aucune activité |
| 37004 | `media-proto05-video-proto05-uga-37004`; HLS + copie locale | titre `Vidéo augmentée IC — source UGA`, IDs, durées, default playable, relations ; activité existante `proto05-augmented-video-01` à ne pas modifier |

Les quatre rapprochements proviennent de l’URL HLS exacte, pas du titre. `36971` démontre un conflit normal : sa description humaine ne correspond pas au résumé Qwen ; elle doit être conservée sans discussion. Les dossiers/tags sont actuellement vides, ce qui n’autorise pas un import automatique à inventer ou remplacer un classement.

## Manifeste d’import proposé

Chemin futur recommandé : `prototypes/05-augmented-ic-video-01/imports/corpora/repli4c-24-videos.v1.json`. Ce chemin le maintient hors du graphe runtime et le distingue des manifestes de schéma. Le fichier est une entrée versionnée et auditable, jamais une seconde autorité métier.

Structure minimale :

```json
{
  "schemaVersion": "proto05-corpus-import-manifest/1.0",
  "corpus": {
    "id": "repli4c-24-videos",
    "sources": [
      {"path": "Liens_24videos.txt", "sha256": "946830...6677", "role": "technical-source"},
      {"path": "ANALYSE_CORPUS_QWEN3_24_VIDEOS.md", "sha256": "75AF84...931", "role": "qwen-analysis"}
    ]
  },
  "entries": [{
    "entryId": "repli4c-video-36970",
    "corpusOrder": 1,
    "functionalName": "GT01_RFC7_reu1_09m05-12m09",
    "grouping": {"group": "GT01", "framework": "RFC7", "meeting": 1, "sourceRangeLabel": "09m05-12m09"},
    "externalIdentity": {"provider": "uga-video", "videoId": "36970"},
    "source": {"kind": "hls", "url": "https://…/36970/livestream.m3u8", "mimeType": "application/vnd.apple.mpegurl"},
    "analysis": {
      "durationMs": 193000,
      "languageIds": ["pt", "fr"],
      "summary": "…",
      "passages": [{"startMs": 0, "endMs": 27000, "purpose": "…"}]
    },
    "evidence": {
      "/source/url": {"origin": "source-technical", "validation": "machine-observed", "sourceRef": "links:1"},
      "/analysis/summary": {"origin": "automatic-synthesis", "validation": "to-verify", "sourceRef": "analysis:36970"},
      "/analysis/languageIds": {"origin": "qwen-asr", "validation": "to-verify", "sourceRef": "analysis:36970"}
    }
  }],
  "activityProposals": []
}
```

L’URL de l’exemple est abrégée seulement dans ce rapport ; le futur manifeste devra contenir l’URL complète. Il ne doit contenir ni date de génération variable ni ID aléatoire dans la partie hachée.

Deux axes doivent rester séparés :

- origine : `source-technical`, `qwen-asr`, `automatic-synthesis`, `existing-canonical`, `human-entry` ;
- validation : `machine-observed`, `to-verify`, `human-verified`, `preserve-existing`.

`human-verified` exige l’identité du validateur, une date et une référence de preuve. Une synthèse automatique ne devient jamais humaine par simple application du manifeste.

## Rapprochement, fusion et idempotence

Ordre de rapprochement strict :

1. ID externe exact, seulement s’il est stocké explicitement ou extrait d’une URL UGA conforme au chemin attendu ;
2. URL source canonique exacte ;
3. identité composée exacte `provider + externalId/source identity` ;
4. sinon aucune correspondance et création planifiée.

Deux candidats pour une même clé, des clés qui désignent des assets différents, une collision d’ID stable ou une URL non conforme sont des blockers. Aucun titre, numéro d’ordre, durée ou ressemblance textuelle ne doit produire de match.

La canonicalisation URL doit utiliser un parseur, minuscule seulement schéma/hôte, retirer un port par défaut, préserver chemin et query, et refuser identifiants intégrés ou fragment. Elle ne doit suivre aucune redirection pendant le dry-run.

Règles de fusion :

| Champ | Asset existant | Nouvel asset |
|---|---|---|
| IDs, sources, playables, famille | préserver ; compléter uniquement par opération explicitement planifiée et non conflictuelle | IDs déterministes après contrôle de collision |
| titre | préserver toute valeur non vide | nom fonctionnel source |
| description | préserver ; ne jamais remplacer par Qwen | vide au premier import technique ; proposition conservée dans le manifeste |
| langues éditoriales | préserver ; Qwen ne remplace rien | non écrites tant que le contrat ne porte pas leur statut |
| dossier/tags | préserver, y compris vide | aucun classement implicite ; décision explicite ultérieure |
| provenance | ajout non destructif et traçable seulement | identité du corpus et source technique |
| droits | ne jamais inférer | restent inconnus jusqu’à décision humaine |
| durée | préserver une mesure technique ; Qwen ne la remplace pas | Qwen reste proposition ; analyse technique ultérieure séparée |
| passages/résumés | restent dans le manifeste jusqu’à validation/extension du contrat | idem |

Les IDs proposés pour les absents peuvent suivre `media-proto05-uga-<videoId>`, `source-proto05-uga-<videoId>` et `video-proto05-uga-<videoId>`, sous réserve d’un contrôle préalable exhaustif. Les IDs existants ne sont jamais renommés.

Le plan doit être du JSON canonique trié, en millisecondes entières, sans timestamp ni valeur aléatoire. Il embarque les hashes des deux sources, du manifeste et du snapshot MariaDB lu. Le plan est haché. L’application exige ce hash et les mêmes préconditions. Une seconde exécution sur l’état résultant doit produire zéro action. `REPLACE`, upsert aveugle et `INSERT IGNORE` sont interdits.

## Pipeline futur sûr

1. Charger et valider le manifeste hors réseau.
2. Vérifier cardinalités, unicité, schéma, URL, bornes et preuves.
3. Lire une projection MariaDB cohérente et calculer les matches/conflits.
4. Produire `dry-run.json` déterministe, couverture champ par champ, blockers, no-op et hash ; aucune connexion en écriture.
5. Obtenir une validation humaine du plan et de la politique des enrichissements.
6. Créer une sauvegarde MariaDB ciblée avec `mariadb-dump --single-transaction`, la hacher, vérifier sa lisibilité et tester sa restauration dans une base isolée.
7. Revalider le hash et les préconditions, acquérir le verrou nommé existant, puis appliquer tous les médias autorisés dans une transaction. Toute entrée invalide doit empêcher toute écriture.
8. Relire et réconcilier intégralement : 24 identités, sources, playables, relations, valeurs préservées et plan suivant vide.
9. Traiter les propositions d’activités dans une phase distincte, après validation humaine de leurs bornes et contenus.

Les repositories/procédures actuels peuvent constituer la primitive d’écriture ; un petit planificateur/importeur dédié est nécessaire. Aucun nouveau fallback JSON ni import au démarrage. Une nouvelle migration de schéma n’est justifiée que si une mission ultérieure choisit réellement les statuts éditoriaux champ par champ.

Fichiers probables d’une future mission, non créés ici :

- `imports/corpora/repli4c-24-videos.v1.json` ;
- `server/corpus-import-plan.js` (pur, sans connexion ni filesystem implicite) ;
- `server/scripts/corpus-import.js` (commandes explicites `plan`/`apply`) ;
- tests ciblés du manifeste, du plan, de la fusion et de l’atomicité.

## Propositions d’activités A et B

### A — `37004`, 07:36–10:27

Le média existe et est déjà relié à une activité générale. La proposition doit créer ultérieurement un brouillon indépendant et relier le même asset/playable ; elle ne doit pas modifier `proto05-augmented-video-01`.

- titre proposé : « Ler/lire : faire comprendre et réparer » ;
- plage provisoire : 456 000–627 000 ms ;
- contenu : geste, explication lexicale et réparation ;
- statut de tout texte dérivé : `to-verify` ;
- vérifications indispensables : voix, geste visible, bornes exactes, langue de chaque intervention et adéquation de la consigne.

Le modèle d’activité sait porter `to-verify` dans son identité pédagogique. La plage doit rester structurée dans la proposition du manifeste et éventuellement être rappelée dans le scénario/les limites. Il ne faut pas créer un faux segment de transcription uniquement pour matérialiser une plage. Transcription, locuteurs, intervalles de langue, phénomènes et annotations restent vides avant écoute humaine.

### B — `36988`, 00:24–02:15

La création dépend d’abord de l’import technique du média absent.

- titre proposé : « Un même changement climatique, plusieurs réalités locales » ;
- plage provisoire : 24 000–135 000 ms ;
- contenu : sécheresse, pluies/inondations, littoral, montée des eaux ;
- statut de tout texte dérivé : `to-verify` ;
- vérifications indispensables : bornes, italien/portugais exacts, transition entre locuteurs et cohérence audiovisuelle.

Comme pour A : nouveau brouillon indépendant, ID stable contrôlé, lien au média, aucune qualification prétendument humaine et aucun authoring détaillé avant écoute.

## Tests exigibles de l’implémentation future

- manifeste : exactement 24 entrées, IDs/URL/order uniques, hashes source exacts, schéma fermé ;
- canonicalisation et matching : quatre matches actuels, vingt créations, ambiguïtés bloquées, aucun fuzzy match ;
- fusion : description de `36971`, titres/IDs, dérivations, durées, dossiers/tags et activité `37004` inchangés ;
- statuts : Qwen toujours `to-verify`, droits jamais inférés, `human-verified` impossible sans preuve ;
- déterminisme : même snapshot → même plan/hash ; second plan vide ; ordre d’entrée sans incidence hors `corpusOrder` ;
- absence de fallback : fichier historique présent ou MariaDB indisponible ne déclenche aucune lecture/écriture alternative ;
- sécurité : plan invalide ou snapshot modifié → zéro écriture ; rollback intégral sur faute injectée ; verrou concurrent ;
- repositories : opérations via MariaDB seulement, réconciliation fidèle ;
- activités : bornes valides, nouvelle activité indépendante, collections d’authoring vides, lien vers le bon média ;
- manifests techniques 001–006 toujours chargés normalement.

## Commandes et contrôles réalisés

Commandes principales (lecture seule) :

```text
git status --short
git rev-parse --short HEAD
rg --files prototypes/05-augmented-ic-video-01 reports
Get-Content -Raw <sources et documents ciblés>
Get-FileHash -Algorithm SHA256 <deux sources>
rg -n <symboles JSON, Media Library, repositories, activités, migrations>
node <scripts en mémoire de parsing/cardinalité et comparaison des plages>
Invoke-RestMethod http://127.0.0.1:8791/<routes GET de santé et projections>
node --test server/test/media-library-contract.test.js server/test/activity-video-projection.test.js server/test/runtime-json-isolation.test.js
git diff --check
```

La lecture locale a observé `storageAuthority: mariadb`. Le processus actif annonçait encore `0.1.61`, alors que le dépôt est en `0.1.62` : c’est un processus de recette déjà actif et non redémarré pendant cet audit, pas un changement de version.

Non exécuté, conformément à la mission : accès aux 24 URL externes, téléchargement vidéo, Qwen, FFmpeg, import, migration, écriture MariaDB, sauvegarde réelle, création d’activité, démarrage/arrêt du serveur, recette UI, commit, push et déploiement.

Résultats : les trois fichiers de tests ont exécuté 64 tests, tous réussis (`64/64`, aucun skip) ; ils couvrent le contrat Media Library, la projection vidéo des activités et l’absence de lecteur JSON métier dans le graphe runtime. `git diff --check` réussit. Les SHA-256 finaux des deux sources sont identiques aux témoins initiaux.

## Décision et prochaine autorisation nécessaire

MariaDB peut recevoir sans ambiguïté les vingt nouvelles identités techniques et reconnaître les quatre existantes. En revanche, l’intégration canonique des enrichissements Qwen doit attendre soit une validation humaine, soit un contrat explicite de statut par champ. La prochaine mission minimale recommandée est l’implémentation du manifeste v1 et du planificateur en mode `plan` seulement, avec une phase 1 limitée aux données techniques. Elle devra s’arrêter avant tout `apply` et présenter le plan/hashes pour autorisation.

## Fichiers modifiés, état Git et commit proposé

Créé par cette mission :

- `reports/182_proto05_24_video_corpus_import_preparatory_audit.md`.

Aucun fichier fonctionnel ni source fournie n’a été modifié. Version obtenue : `0.1.62`, inchangée.

État Git final exact :

```text
?? prototypes/05-augmented-ic-video-01/ANALYSE_CORPUS_QWEN3_24_VIDEOS.md
?? prototypes/05-augmented-ic-video-01/Liens_24videos.txt
?? reports/182_proto05_24_video_corpus_import_preparatory_audit.md
```

Aucun autre changement. Aucun commit ni push.

Message de commit proposé :

```text
docs(proto05): audit 24-video corpus import design
```
