# Mission 126 — Proto05 — Inspection ciblée du stockage avant conception MariaDB

Date : 26 juillet 2026

## Résultat

Proto05 possède aujourd’hui quatre documents JSON actifs :

1. `activities.json` pour les activités et leurs données d’auteur ;
2. `activity-library.json` pour les dossiers d’activités ;
3. `video-library.json` pour la bibliothèque média canonique ;
4. `video-catalog.json` pour la compatibilité historique.

Il lit également le référentiel partagé `shared/reference-data/languages.json`.
Les fichiers vidéo restent sur le système de fichiers, dans deux espaces
gérés. Les jobs de téléchargement, préparation et dérivation en cours sont
principalement conservés en mémoire.

La présence des 16 fiches vidéo est expliquée directement : les 16 assets sont
toujours présents dans `video-library.json`, et la route de liste expose tous
ces assets sans filtrer ceux dont le fichier local manque. Dix playables locaux
référencés correspondent actuellement à dix assets distincts dont le fichier
est absent. Aucun mécanisme de restauration au démarrage depuis `.bak`, seed
ou fixture n’a été trouvé.

Cette mission n’a conçu aucun schéma SQL, exécuté aucune migration et modifié
aucune donnée.

## État initial

- Branche : `main`.
- HEAD :
  `eec3b172d0a8ca8b52be43c56467db49b19cb5df`
  (`feat(proto05): align activity library with video library`).
- `git status --short` : propre.
- Version Proto05 : `0.1.45`.
- Les changements des Missions 123 à 125 sont déjà commités dans l’état
  observé ; aucun changement non committé n’était à préserver.
- Numéro de rapport maximal observé avant écriture : 125.
- Aucun fichier `reports/126_proto05_storage_inspection_before_mariadb.md`
  n’existait.

La Mission 126 est documentaire : la version reste `0.1.45`.

## Inventaire synthétique des stockages

| Stockage | Rôle et entités principales | Lecture active | Écriture active | Initialisation, sauvegarde et statut |
|---|---|---|---|---|
| `prototypes/05-augmented-ic-video-01/data/activities.json` | 2 activités ; identité pédagogique ; transcription ; segments ; locuteurs ; langues ; intervalles linguistiques ; couches ; phénomènes ; annotations enseignantes ; overlays ; configuration de visibilité ; projection vidéo compatible | `readActivities()` dans `server/server.js`, à chaque parcours concerné | `persistActivities()` après création, édition guidée/auteur, duplication, suppression et changement de vidéo | Le fichier absent ou invalide fait échouer la lecture. Avant écriture : copie `.bak`, fichier temporaire puis renommage. Métier, canonique actuel |
| `data/activity-library.json` | 1 dossier d’activités et 1 affectation activité–dossier | `readActivityLibraryClassification()` | `persistActivityLibraryClassification()` pour créer, renommer, supprimer un dossier et classer/déclasser | Si absent : valeur vide seulement en mémoire, sans création par la lecture. À la première écriture : création du fichier ; ensuite `.bak`, temporaire et renommage. Métier de classement, séparé des activités |
| `data/video-library.json` | Schéma 1.0 : 16 assets, 19 sources, 19 playables, 2 traitements, 1 dossier média et 3 tags | `readCanonicalMediaLibrary()` puis `projectCanonicalLibrary()` au démarrage ; cache `CANONICAL_LIBRARY` et projection runtime `VIDEO_LIBRARY` | writers Library : création/suppression d’asset, imports/copies, sources distantes, rôles, dossiers/tags, traitements et dérivations | Obligatoire au démarrage : s’il manque, le serveur échoue. Validation canonique avant écriture ; `.bak`, fichier temporaire, renommage avec reprise Windows. Métier et technique ; source de vérité média actuelle |
| `data/video-catalog.json` | 3 entrées historiques autorisées ; sources UGA/YouTube de compatibilité | `loadVideoCatalog()` au démarrage ; cache immuable `VIDEO_CATALOG` | route historique `POST /api/proto05/video-catalog` via `persistVideoCatalog()` | Obligatoire et validé au démarrage ; `.bak`, temporaire, renommage. Compatibilité encore active, pas source de la liste moderne |
| `shared/reference-data/languages.json` | 4 langues de référence partagées | `loadLanguageCatalog()` au démarrage ; index en mémoire | aucun writer Proto05 | Obligatoire et validé ; aucune valeur de repli. Référentiel partagé, hors propriété Proto05 |
| `data/video-library-media/` | 2 fichiers MP4 dans l’ancien espace géré | route média, import local, copie distante, suppressions physiques encadrées | import/copie, ancienne publication de dérivations, suppression explicite | Répertoire créé à la demande par les writers. Technique, binaire, pas une identité logique |
| `data/video-library-workspaces/` | 3 fichiers MP4 dans 5 sous-répertoires d’asset/traitement | route média avec scope `workspace`, détail Library et traitements | téléchargements, migration de copies et dérivations récentes | Répertoires créés à la demande. Technique, binaire, organisation par asset |
| Maps `ACTIVE_LIBRARY_DOWNLOADS`, `ACTIVE_HLS_PREPARATIONS`, `ACTIVE_HLS_DERIVATIONS` | état runtime, progression, erreurs, annulation et chemins temporaires | routes de suivi runtime | processus courant seulement | Non durable ; perdu au redémarrage. Les résultats réussis peuvent produire un playable et un traitement persistants |
| répertoires sous le temporaire système | fichiers de téléchargement, préparation HLS, segments et sorties FFmpeg | jobs actifs | pipelines de traitement | créés par `mkdir`/`mkdtemp`, nettoyés après fin ou expiration. Temporaire |

### Structure utile des activités

Les deux activités contiennent au total :

- 11 segments ;
- 5 locuteurs ;
- 6 occurrences de langues dans les activités ;
- 26 intervalles linguistiques ;
- 7 couches ;
- 26 phénomènes ;
- 11 annotations enseignantes ;
- 6 overlays.

Les deux activités possèdent encore `activity.video`, projection compatible,
et aucune ne possède actuellement `videoRef`. Ce point est important pour la
future migration du lien activité–média.

### Structure utile de la Library

Les grandes collections du document 1.0 sont :

```text
MediaLibrary
├── assets       16
├── sources      19
├── playables    19
├── treatments    2
├── folders       1
└── tags          3
```

Les assets portent notamment leur cycle de vie, dossier, tags, famille,
playable par défaut, provenance, droits et métadonnées techniques. Les sources
portent l’origine, le fournisseur, le transport et leur relation à l’asset.
Les playables portent la localisation, la disponibilité, le rôle et leur
relation à la source. Les traitements relient source, exécution et résultat.

### Sauvegardes, archives et données non actives

Présentes mais non lues par le parcours normal :

- `activities.json.bak` ;
- `activity-library.json.bak` ;
- `video-catalog.json.bak` ;
- `video-library.json.bak` ;
- sauvegardes historiques d’activités datées ;
- `activities.json.pre-overlay-migration` ;
- `data/backups/mission-102-video-library-0.1.json`.

Les `.bak` sont écrits avant remplacement d’un JSON actif. Aucune lecture
automatique de ces fichiers au démarrage n’a été trouvée. Les restaurations
trouvées dans le code concernent uniquement le rollback immédiat d’une
suppression physique échouée, depuis une copie temporaire créée pour cette
opération.

Autres éléments non actifs :

- `server/test/fixtures/media-library-canonical.valid.json` : fixture
  synthétique ;
- `server/test/fixtures/layer-visibility.activity.json` : fixture d’activité ;
- copies JSON créées sous le répertoire temporaire par les tests ;
- `media-library-dry-run.js` : produit des sorties isolées seulement quand il
  est lancé explicitement ;
- `media-library-install.js` : installateur explicite de la Mission 102, non
  appelé au démarrage ;
- scripts `server/scripts/migrate-*.js` : migrations explicites, non appelées
  au démarrage.

## Carte des lectures, écritures et initialisations

```text
démarrage serveur
├── video-catalog.json ── loadVideoCatalog ──> VIDEO_CATALOG
├── video-library.json ── read + validation 1.0
│                        ├──> CANONICAL_LIBRARY
│                        └──> projection VIDEO_LIBRARY
└── languages.json ───── loadLanguageCatalog ──> référentiel mémoire

requêtes activités
├── activities.json ──── readActivities
│   ├── GET liste/détail
│   ├── POST création/duplication
│   ├── PUT édition/association vidéo
│   └── DELETE activité
└── activity-library.json
    ├── lecture + projection folderId
    └── écriture dossiers/affectations

requêtes Library
├── VIDEO_LIBRARY.assets ──> liste des fiches
├── ajout/import/copie/rôle/classement/suppression
│   └── mutation canonique validée ──> video-library.json
├── traitement en mémoire
│   └── succès ──> fichier workspace + source/playable/treatment
└── association à une activité
    └── videoRef + projection activity.video ──> activities.json
```

### Activités

- La création peut partir soit d’une entrée du catalogue historique, soit d’un
  asset/playable de la Library.
- La duplication recopie les données d’auteur, régénère les identifiants locaux
  et ne touche pas à la source.
- Les éditions, suppressions et associations vidéo réécrivent le document
  complet sous la file d’écriture commune.
- La suppression d’une activité retire ensuite, au mieux, son affectation de
  dossier.

### Médias

- La liste moderne est construite depuis `VIDEO_LIBRARY.assets`.
- Les imports locaux et copies distantes écrivent le fichier physique puis les
  entités canoniques.
- Les références distantes peuvent ajouter sources et playables.
- Les dossiers, tags et rôles modifient le document canonique.
- Une suppression d’asset ou de copie vérifie les dépendances. Lorsqu’un fichier
  doit être supprimé, une sauvegarde temporaire permet un rollback si
  l’écriture du catalogue échoue.
- Les traitements réussis publient leurs métadonnées dans la Library ; le détail
  d’exécution runtime reste en mémoire.

### Compatibilité

- `media-library-runtime.js` valide le document 1.0 et produit la forme runtime
  attendue par le serveur existant.
- `canonicalFromRuntime()` repart du document canonique existant et fusionne les
  mutations de la projection ; il ne remplace pas volontairement le canonique
  par une ancienne forme 0.1.
- `activity.video` reste une projection consommée par les vues historiques.
- `video-catalog.json` permet encore de résoudre les activités qui n’ont pas de
  `videoRef`.
- Aucun seed codé en dur n’est utilisé comme fallback actif : l’ancien tableau
  `LEGACY_VIDEO_CATALOG` est commenté.

## Pourquoi 16 fiches sont présentes

### Ce qui est certain

1. `data/video-library.json` contient actuellement 16 assets.
2. `loadVideoLibrary()` charge obligatoirement ce document au démarrage.
3. `GET /api/proto05/library/assets` projette chaque élément de
   `VIDEO_LIBRARY.assets`; la liste n’est pas filtrée par existence physique.
4. L’historique Git de `video-library.json` montre déjà 16 assets et
   19 playables dans :
   - `50ca813d` ;
   - `f83bd030`, commit
     `chore(proto05): establish clean canonical media baseline`.
5. Le commit `f83bd030` a réduit `activities.json` à deux activités, mais son
   changement de `video-library.json` est limité à une ligne ajoutée et une
   ligne retirée ; le nombre d’assets est resté 16. Aucun fichier de
   `video-library-media/` n’apparaît dans ce diff.
6. Sur les 15 playables possédant une clé de stockage locale, 10 playables,
   appartenant à 10 assets distincts, pointent vers un fichier absent.
7. Les deux espaces de stockage contiennent 5 MP4 au total : 2 dans l’ancien
   répertoire média et 3 dans les workspaces. Cela correspond aux 5 playables
   locaux encore présents.
8. Les sauvegardes `.bak` et l’archive de la Mission 102 ne sont jamais relues
   par le démarrage normal.

### Conclusion proportionnée

Les dix fiches n’ont pas été recréées par le serveur. Leurs métadonnées n’ont
jamais quitté la source active `video-library.json`; seuls leurs fichiers
locaux sont aujourd’hui absents. L’interface les montre donc comme fiches
indisponibles.

L’inspection ne peut pas prouver quelle opération humaine précise a retiré les
fichiers, car ces binaires ne sont pas suivis par Git. Elle prouve en revanche
que le commit de baseline n’a pas supprimé les dix assets du catalogue et
qu’aucune restauration automatique n’est responsable de leur présence.

Si une enquête devenait nécessaire, elle devrait reprendre uniquement à partir
des journaux locaux éventuels et du moment où les fichiers physiques ont été
retirés. Ce n’est pas nécessaire pour préparer la migration MariaDB.

## Conventions MariaDB existantes

### Instance et séparation

La pile de référence
`prototypes/08-dico-seven-sieves/docker-compose.yml` utilise :

- MariaDB 11 ;
- un conteneur de référence `ic_dico_mariadb_next` ;
- le port local 3306 ;
- le volume externe persistant `ic_lab_next_mariadb_data` ;
- une base par composant.

L’ancienne pile `ic_dico_mariadb` n’a pas été utilisée.

L’inspection live en lecture seule confirme :

- bases applicatives présentes : `ic_dico` et `ic_hub` ;
- aucune base Proto05 n’existe encore ;
- 8 tables dans `ic_dico` ;
- 14 tables et 1 vue dans `ic_hub`.

### Organisation SQL

Dico-IC possède :

- `database/` pour les scripts historiques ;
- `database/current_draft/` pour un ordre préparé :
  `00_schema.sql`, `10_procedures.sql`, puis seeds numérotés ;
- un schéma InnoDB en `utf8mb4` ;
- des procédures préfixées `sp_`.

IC-Hub possède :

- `server/db/schema.sql` ;
- `server/db/procedures.sql` ;
- `server/db/migrate-json-to-mariadb.js` ;
- des scripts de contrôle de cohérence et de routines ;
- un repository/store MariaDB séparé du store JSON.

Les procédures applicatives live suivent bien le préfixe `sp_` :

- 9 dans `ic_dico` ;
- 3 dans `ic_hub`.

### Connexions Node

Les deux composants utilisent `mysql2/promise` et un pool :

- Dico-IC : variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
  `DB_NAME` ;
- IC-Hub : variables préfixées `IC_HUB_DB_*` et sélecteur de store
  `IC_HUB_STORE`.

Les configurations observées utilisent `utf8mb4`, une limite de connexions et
un utilisateur/base dédiés. Aucun mot de passe n’est reproduit dans ce rapport.

### Stratégies réutilisables et réserve importante

Conventions utiles :

- base et utilisateur dédiés par composant ;
- `schema.sql`, `procedures.sql`, script de migration et contrôles séparés ;
- dry-run explicite ;
- migrations idempotentes par upsert ;
- transactions ou procédures stockées pour les mutations multi-entités ;
- contrôles post-migration ;
- préfixe `sp_` ;
- InnoDB et `utf8mb4`.

Réserve pour Proto05 : IC-Hub conserve un fallback JSON et sa migration
n’efface pas les lignes absentes des JSON. Ce choix protège le Hub pendant sa
transition, mais ne doit pas être recopié comme état final de Proto05. La
décision de la Mission 126 impose que MariaDB devienne l’unique source de
vérité et que les JSON ne puissent jamais réinjecter silencieusement des
données après le cutover.

## Grandes entités candidates

Cette liste prépare la conception ; elle ne présume ni tables, ni types SQL, ni
degré final de normalisation.

| Entité candidate | Responsabilité et relations principales | Source actuelle | Nature |
|---|---|---|---|
| Activité | identité, statut, contenu pédagogique ; possède transcription et objets d’auteur ; choisit un média | `activities.json` | métier |
| Identité pédagogique | intention, public, contexte, qualification et état de saisie d’une activité | `activities[].pedagogicalIdentity` | métier |
| Dossier d’activités / affectation | classement principal, au plus un dossier par activité actuellement | `activity-library.json` | métier |
| Asset média | identité logique d’une vidéo, famille, cycle, dossier, tags et playable par défaut | `video-library.json.assets` | métier |
| Source média | origine, fournisseur, transport et provenance d’un asset | `video-library.json.sources` | métier/technique |
| Playable | représentation effectivement lisible, distante ou locale, disponibilité et localisation | `video-library.json.playables` | technique |
| Traitement / dérivation | opération reliant une entrée média, une exécution et une sortie | `video-library.json.treatments` et jobs runtime | technique |
| Dossier média | classement manuel des assets | `video-library.json.folders` | métier |
| Tag média / association | qualification transverse des assets | `video-library.json.tags` et `assets[].tagIds` | métier |
| Lien activité–vidéo | choix d’un asset et d’un playable par une activité ; projection compatible à maintenir pendant la transition | `activity.video`, futur `videoRef` | métier |
| Transcription / segment | découpage temporel et texte de l’activité | `activities[].transcription`, `segments` | métier |
| Locuteur | participant référencé par segments et annotations | `activities[].speakers` | métier |
| Langue | référentiel partagé et usage dans une activité | `languages.json`, `activities[].languages` | référentiel |
| Intervalle linguistique | langue observée sur une plage temporelle | `activities[].languageIntervals` | métier |
| Couche / configuration de visibilité | regroupement et visibilité apprenant/enseignant | `layers`, `layerConfiguration` | métier |
| Phénomène | occurrence pédagogique ou linguistique reliée au temps, segment et couche | `activities[].phenomena` | métier |
| Annotation enseignante | annotation d’auteur reliée aux segments/couches | `activities[].teacherAnnotations` | métier |
| Overlay | contenu augmenté temporel, autonome ou relié à une annotation | `activities[].overlays` | métier |
| Métadonnées techniques / provenance / droits | faits de fichier, origine, transformation et droits d’usage | sous-objets Library | technique ou dérivée selon le champ |
| Objet de stockage physique | clé, scope, empreinte et existence d’un fichier hors base | `playables[].location` et système de fichiers | technique |

## Principaux risques de migration

1. **Double source de vérité** : laisser le JSON lisible/inscriptible après le
   cutover permettrait une réinjection ou une divergence.
2. **Périmètre canonique non tranché** : le JSON contient 16 assets alors que
   l’état produit attendu en retient 6.
3. **Fichiers absents** : dix assets possèdent une représentation locale
   manquante ; présence métier et existence physique doivent être distinguées.
4. **Relations vidéo historiques** : les deux activités utilisent
   `activity.video`, sans `videoRef`.
5. **Identifiants** : les IDs existants sont référencés à travers de nombreux
   sous-objets et doivent rester traçables.
6. **Ordre et temporalité** : segments, intervalles, annotations et overlays
   comportent ordre, bornes temporelles et références croisées.
7. **Mutations multi-entités** : création/suppression média, publication d’un
   traitement et association vidéo nécessitent des transactions.
8. **Jobs non durables** : un redémarrage perd les états runtime actuellement
   en mémoire.
9. **Métadonnées hétérogènes** : provenance, droits et informations techniques
   sont partiels et parfois issus de migrations.
10. **Chemins physiques** : scopes de stockage, chemins Windows historiques et
    fichiers hors base doivent rester séparés de l’identité logique.
11. **Backups historiques** : ils doivent devenir archives explicites, jamais
    sources implicites.
12. **Référentiel des langues** : sa propriété partagée et son mode de
    référencement depuis Proto05 doivent être décidés.
13. **Concurrence** : la file d’écriture JSON actuelle sérialise toutes les
    écritures ; l’équivalent SQL devra définir transactions et niveaux de
    verrouillage utiles.
14. **Champs inconnus et versions** : la migration doit préserver ou
    diagnostiquer ce qui n’est pas normalisé, sans perte silencieuse.

## Points à décider pendant la conception

- snapshot source exact de la migration et liste validée des 6 médias à
  conserver ;
- suppression logique, archivage ou conservation des 10 fiches sans fichier ;
- maintien des binaires sur disque avec seulement leurs métadonnées en base ;
- stratégie d’identifiants et table de correspondance ;
- degré de normalisation des gros sous-objets pédagogiques ;
- propriété de la langue : référentiel commun ou copie Proto05 ;
- représentation du lien activité–asset–playable ;
- persistance et reprise des jobs ;
- règles de famille source/dérivé et suppression ;
- transactions Node ou procédures `sp_` selon les invariants ;
- stratégie de migration versionnée et journal de cutover ;
- statut final des JSON : export, archive en lecture seule ou suppression du
  runtime ;
- comportement explicite si MariaDB est indisponible : erreur visible plutôt
  que fallback JSON silencieux.

## Découpage indicatif des missions suivantes

1. **Conception relationnelle** : modèle logique, responsabilités, relations,
   identifiants, invariants et décisions ouvertes.
2. **Création de la base Proto05** : base/utilisateur dédiés, scripts versionnés,
   contrôles minimaux ; aucune donnée métier.
3. **Adaptateur MariaDB** : repository et transactions derrière les contrats
   HTTP existants, encore sans cutover.
4. **Migration à blanc** : snapshot JSON explicite, sortie isolée, mapping,
   diagnostics, comparaison de volumes et références.
5. **Migration réelle** : sauvegarde, fenêtre de gel, import validé et rollback
   approuvé.
6. **Vérification** : volumes, relations, échantillons fonctionnels,
   indisponibilités, redémarrage et non-régression.
7. **Cutover** : MariaDB seule source runtime ; blocage de toute initialisation
   ou fusion JSON.
8. **Archives/exports** : conservation éventuelle des JSON comme export
   horodaté ou archive non réinjectable.

Aucune de ces étapes n’a été exécutée pendant la Mission 126.

## Fichiers inspectés

### Proto05

- `server/server.js`
- `server/media-library-runtime.js`
- `server/media-library-schema.js`
- `server/media-library-migration.js`
- `server/media-library-install.js`
- `server/media-library-dry-run.js`
- `server/video-workspaces.js`
- `server/library-contract.js`
- `server/package.json`
- les quatre JSON actifs de `data/`
- le contenu structurel de `video-library-media/` et
  `video-library-workspaces/`
- sauvegardes et archive de migration présentes sous `data/`
- fixtures JSON de tests
- `shared/reference-data/languages.json`

### Rapports

Les noms réels diffèrent légèrement des intitulés fournis dans la mission :

- `reports/097_proto05_media_library_model_audit.md`
- `reports/098_proto05_media_library_model_specification.md`
- `reports/099_proto05_media_library_contract_validator_report.md`
- `reports/100_proto05_media_library_migration_audit.md`
- `reports/101_proto05_media_library_dry_run_migration_report.md`
- `reports/102_proto05_canonical_media_library_installation_report.md`
- `reports/125_proto05_activity_library.md`

### MariaDB

- `prototypes/08-dico-seven-sieves/docker-compose.yml`
- `prototypes/08-dico-seven-sieves/Node/src/repository.js`
- `prototypes/08-dico-seven-sieves/database/current_draft/`
- `prototypes/00-ic-hub/server/db/`
- `prototypes/00-ic-hub/server/stores/mariadbStore.js`
- rapports MariaDB IC-Hub V0.6, V0.6.1 et V0.6.2

## Commandes et contrôles réellement exécutés

- `git status --short`
- `git branch --show-current`
- `git log`, `git show`, `git diff` et `git ls-tree` en lecture seule
- `rg --files` et recherches `rg` ciblées
- `Get-Content` sur les sources, rapports et JSON
- résumés structurels PowerShell avec `ConvertFrom-Json`
- `Get-ChildItem` et `Test-Path` pour les fichiers gérés, sauvegardes et
  workspaces
- `docker compose ps`
- `SHOW DATABASES`
- `SHOW TABLES FROM ic_dico`
- `SHOW TABLES FROM ic_hub`
- `SHOW PROCEDURE STATUS`
- `git diff --check`
- contrôle isolé du rapport non suivi avec
  `git diff --no-index --check` et recherche des espaces de fin de ligne

La première tentative de connexion Docker directe a été refusée par le sandbox
puis relancée après autorisation. Deux premières commandes groupées ont atteint
MariaDB mais ont échoué sur le quoting SQL Windows/shell, sans exécuter
d’instruction. Les requêtes `SHOW` séparées ont ensuite réussi. Aucun secret
n’a été affiché dans le rapport.

Conformément au périmètre, aucun test, serveur, navigateur, FFmpeg, import,
traitement ou migration n’a été lancé.

Les contrôles finaux de whitespace ne signalent aucune erreur. Git émet
uniquement son avertissement habituel sur une future normalisation LF/CRLF.

## État final

- Version inchangée : `0.1.45`.
- Seul le présent rapport est créé.
- Aucun fichier existant modifié.
- Aucun JSON, média, `.bak`, configuration Docker ou base modifié.
- Aucune base, table, procédure ou ligne créée, altérée ou supprimée.
- Aucun commit et aucun push effectués.

Message de commit proposé :

`docs(proto05): inspect storage before MariaDB design`
