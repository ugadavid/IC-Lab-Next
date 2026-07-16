# Architecture d’IC-Lab-Next

État observé dans le dépôt le **16 juillet 2026**. Ce document décrit
l’organisation courante du workspace et les frontières entre ses composants. Il
ne remplace ni les guides de lancement, ni les README métier, ni le statut
courant ou les règles de contribution.

## Statut des informations

Trois niveaux sont distingués dans la suite :

- **vérifié** : présent dans les fichiers, serveurs, launchers ou données suivies
  du dépôt ;
- **provisoire** : fonctionnel aujourd’hui, mais conservé comme compatibilité ou
  en attente d’une séparation ;
- **futur** : décision explicitement différée, non présentée comme une capacité
  actuelle.

Les ports indiqués sont les ports déclarés par les configurations et launchers.
Aucun service n’a été démarré pour produire ce document ; leur disponibilité
runtime au 16 juillet 2026 n’est donc pas affirmée ici.

## Périmètre du workspace

IC-Lab-Next est le dépôt Git consolidé de développement actuel d’IC-Lab, un
laboratoire de prototypage pédagogique consacré à l’intercompréhension. Sa racine
Git unique rassemble les composants actifs et leurs documents de travail utiles,
sans chercher à reproduire toute l’histoire du laboratoire.

L’ancien workspace `IC-Lab` reste l’archive historique complète. IC-Lab-Next est
une base active nettoyée : les copies intermédiaires, les anciens dépôts Git
imbriqués et certains artefacts privés n’y sont pas conservés. La provenance et
les limites de cette consolidation sont détaillées dans
[WORKSPACE_PROVENANCE.md](WORKSPACE_PROVENANCE.md).

Le périmètre actif vérifié est constitué de cinq racines :

```text
IC-Lab-Next/
├── prototypes/00-ic-hub
├── prototypes/05-augmented-ic-video-01
├── prototypes/06-voice-agent-ic
├── prototypes/07-informaticaire
└── prototypes/08-dico-seven-sieves
```

## Carte des composants actifs

| Composant | Rôle actuel | Exécution | Données principales possédées |
|---|---|---|---|
| **00 — IC-Hub** | Portail public, parcours locaux de comptes/cours/activités et services transversaux | Serveur Node, port `8790` | Métadonnées Hub dans `server/data/`; sessions et runs runtime locaux; mode MariaDB Hub optionnel |
| **05 — Vidéo augmentée** | Lecture et observation d’une vidéo IC, vues étudiant/enseignant et ateliers d’auteur | Serveur Node autonome, port `8791` | `data/activities.json`, sauvegarde locale `.bak`; observations étudiantes non persistées |
| **06 — Agent vocal IC** | Bibliothèque, composition et exécution locale d’activités orales plurilingues | Serveur Node autonome, port `8788` | `server/data/activities.json`; fixtures de manifestes dans `data/proto06-manifests/` |
| **07 — Informaticaire** | Mémoire, documentation et retrouvabilité des ressources IC | Application statique servie par IC-Hub | Corpus de démonstration suivi dans `data.js`; exports produits côté navigateur |
| **08 — Dico-IC / Seven Sieves** | Service de connaissances plurilingues, administration et client de lecture guidée | Serveur Node/Express, port `3000`, connecté à MariaDB `3306` | Base `ic_dico` dans le volume Docker externe; état d’interface Seven Sieves local au navigateur |

### IC-Hub et launcher : deux responsabilités distinctes

Le **launcher global** orchestre le démarrage local. Il appelle les launchers de
Proto05, d’IC-Hub, de l’Agent vocal et de Dico-IC, contrôle leurs ports puis ouvre
le portail. Il n’est pas un serveur applicatif et ne possède aucune donnée.

**IC-Hub** est un serveur et un portail. Il sert ses propres interfaces, le
démonstrateur statique Informaticaire, des fonctions transversales de Hub et des
connecteurs locaux. Il ne démarre pas les autres serveurs. Sa page publique reste
lisible même si un service autonome est indisponible.

Le Hub possède aussi un parcours pédagogique historique authentifié : comptes de
démonstration, cours, inscriptions, assignations, runs, propriété/visibilité et
configuration IA. Cette surface est distincte du portail public et ne constitue
pas une authentification commune automatiquement appliquée aux prototypes.

## Topologie d’exécution

```text
                                  source HLS UGA
                                        ^
                                        |
                                  proxy strict HLS
                                        |
Navigateur ---- Proto05 :8791 --------> IC-Hub :8790
    |                 |                      |
    |                 +-- JSON Proto05      +-- portail et données Hub
    |                                        +-- Informaticaire statique
    |
    +------------ Agent vocal :8788 <------ connecteur Hub local
    |
    +------------ Dico-IC / Seven Sieves :3000
                               |
                               v
                         MariaDB :3306
                    volume externe Dico-IC
```

| Port | Processus déclaré | Dépendances et remarques vérifiées |
|---:|---|---|
| `8790` | Serveur Node IC-Hub | Portail, API Hub, routes héritées Proto05, proxy HLS strict et service statique Informaticaire |
| `8791` | Serveur Node Proto05 | Bind explicite sur `127.0.0.1`; API, vues et données Proto05; dépend encore de `8790` pour HLS |
| `8788` | Serveur Node Proto06 | Bibliothèque à la racine, runtime vocal, API d’activités JSON |
| `3000` | Serveur Node/Express Dico-IC | Sert API, administration Dico-IC et pages Seven Sieves; dépend de MariaDB |
| `3306` | Conteneur MariaDB Dico-IC | Base `ic_dico` dans `ic_lab_next_mariadb_data`; peut aussi être l’hôte d’un schéma Hub séparé si son mode MariaDB optionnel est activé |
| `8080` | Conteneur phpMyAdmin | Déclaré dans Compose comme outil auxiliaire; non contrôlé par `check-status.bat` et disponibilité non vérifiée pendant cette mission |

Le mode de stockage par défaut du Hub est JSON. Un mode MariaDB expérimental
existe pour un schéma `ic_hub`, mais il est distinct de la base `ic_dico` et
dépend de variables locales. Le mode effectivement sélectionné au runtime n’est
pas vérifiable sans consulter la configuration locale ou démarrer le serveur.

## Flux de lancement et d’accès

### Lancement global Windows

```text
START_IC_LAB_NEXT.bat
  -> scripts/windows/start-all.bat
       1. démarre ou réutilise Proto05             :8791
       2. démarre ou réutilise IC-Hub              :8790
       3. démarre ou réutilise l’Agent vocal       :8788
       4. docker compose up -d pour Dico-IC
          -> attend MariaDB                        :3306
          -> démarre ou réutilise le serveur Node  :3000
       5. vérifie les quatre serveurs et ouvre http://127.0.0.1:8790/
```

Le launcher ne fait ni `npm install`, ni migration, ni exécution SQL, ni
initialisation explicite de base. Le détail opérationnel et l’arrêt sûr restent
dans [PROJECTS_LAUNCH.md](../PROJECTS_LAUNCH.md) et le
[guide des launchers Windows](../scripts/windows/README.md).

### Accès depuis le portail

| Destination | Flux actuel |
|---|---|
| Vidéo augmentée | La carte Hub ouvre `/demos/augmented-video/`; le Hub redirige cette entrée exacte vers `http://127.0.0.1:8791/` |
| Agent vocal | Lien direct vers le service autonome `8788` |
| Informaticaire | Le Hub sert directement les fichiers du prototype sous `/demos/informaticaire/` |
| Dico-IC | Lien direct vers l’administration servie sur `3000` |
| Seven Sieves | Lien direct vers la page live servie sur `3000`, laquelle appelle l’API Dico-IC du même serveur |

Le portail est donc un point d’entrée, pas un reverse proxy général et pas un
bus de données entre tous les prototypes.

## Propriété et circulation des données

| Propriétaire | Source ou stockage | Frontière actuelle |
|---|---|---|
| IC-Hub | `prototypes/00-ic-hub/server/data/*.json` | Comptes, cours, inscriptions, assignations, catalogues, propriété, configurations et manifestes publiés Hub. Les sessions, runs, corruptions et sauvegardes runtime sont ignorés par Git. |
| Proto05 | `prototypes/05-augmented-ic-video-01/data/activities.json` | Source canonique actuelle de ses activités. Le serveur `8791` lit et écrit ce JSON; le Hub ne doit pas en conserver une copie. |
| Proto06 | `server/data/activities.json` | Activités du backend vocal. Le Hub les consulte par HTTP pour son connecteur; les manifestes publiés du Hub restent une donnée transversale distincte. |
| Informaticaire | `data.js` | Corpus statique chargé par la page. Les contributions et exports sont préparés côté navigateur; le corpus n’est ni une base officielle ni une donnée Hub. |
| Dico-IC | MariaDB `ic_dico` dans `ic_lab_next_mariadb_data` | Lexique, relations, formes et objets pédagogiques. Seven Sieves consomme l’API et ne lit jamais MariaDB directement. |

Les médias HLS restent externes au dépôt et au modèle de données Proto05. Les
documents privés d’entretien, secrets, journaux, bases locales, dépendances et
sauvegardes runtime ne sont pas des données partagées du workspace.

Le montage Compose `./db:/docker-entrypoint-initdb.d` pointe actuellement vers un
dossier vide. Les scripts de `database/current_draft/` sont un brouillon non
canonique et ne sont pas montés par Compose. La reconstruction fiable d’une base
Dico-IC fraîche n’est donc pas une propriété garantie par l’architecture
actuelle.

## Architecture interne actuelle de Proto05

Proto05 est désormais autonome pour ses pages, son API et son JSON. Son moteur de
lecture et sa prévisualisation enseignant utilisent le même fichier
`index-0.0.8.html`.

```text
                       serveur Proto05 :8791
┌──────────────────────────────────────────────────────────────┐
│ Routes étudiant / prévisualisation                           │
│   -> moteur partagé index-0.0.8.html                         │
│      -> lecteur HLS, transcription, couches, observations    │
│      -> shared/ic-timeline.js + shared/ic-timeline.css       │
│                                                              │
│ Routes enseignant                                            │
│   -> bibliothèque, création, édition, atelier avancé         │
│   -> atelier guidé avec prévisualisation et timeline partagée│
│                                                              │
│ API /api/proto05                                             │
│   -> catalogue vidéo contrôlé                                │
│   -> lecture, création et mise à jour des activités          │
│   -> validation + écriture JSON atomique + copie .bak        │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            v
                  data/activities.json
```

### Surfaces principales

| Surface | Rôle vérifié |
|---|---|
| `/student/:activityId` | Vue de consultation étudiante |
| `/teacher` | Bibliothèque d’activités |
| `/teacher/preview/:activityId` | Prévisualisation avec le moteur étudiant partagé |
| `/teacher/create` | Création d’un brouillon |
| `/teacher/edit/:activityId` | Édition de métadonnées |
| `/teacher/author/:activityId` | Atelier auteur avancé |
| `/teacher/guided/:activityId` | Atelier guidé; réutilise la timeline partagée et la prévisualisation |

Le JSON d’une activité regroupe notamment vidéo, transcription, segments,
locuteurs, langues, intervalles linguistiques, couches, phénomènes, annotations
enseignantes et configuration de visibilité. Les temps sont des millisecondes
entières. La timeline partagée rend les langues et phénomènes sur un repère
commun, avec des interactions adaptées au mode étudiant ou auteur.

Le serveur expose actuellement des écritures locales : création d’un brouillon
par `POST /api/proto05/activities`, mise à jour des métadonnées par
`PUT /api/proto05/activities/:id` et sauvegarde de l’atelier par
`PUT /api/proto05/activities/:id/authoring`. Ces opérations ne sont pas protégées
par une authentification ou des droits réels.

## Dépendances provisoires Proto05 ↔ IC-Hub

Les dépendances suivantes sont **fonctionnelles mais provisoires** :

1. Le navigateur demande le flux sous `/api/hls/uga-37004/...` au serveur
   Proto05. Celui-ci relaie uniquement ces chemins autorisés vers la même route
   sur IC-Hub `8790`. IC-Hub résout ensuite une origine UGA fixe et applique sa
   liste blanche.
2. Proto05 sert `/vendor/hls.js/hls.min.js`, mais lit actuellement ce fichier
   depuis `prototypes/00-ic-hub/server/node_modules/hls.js`. L’installation de la
   dépendance reste donc physiquement détenue par le Hub.
3. IC-Hub conserve `GET /api/proto05/activities` et
   `GET /api/proto05/activities/:id`. Ces routes héritées lisent directement le
   JSON appartenant à Proto05, en lecture seule, pour compatibilité.
4. L’entrée historique exacte `/demos/augmented-video/` redirige vers `8791`.
   Le montage statique historique reste encore présent pour les chemins enfants
   sous ce préfixe.

La migration HLS complète vers Proto05 et le retrait des routes de compatibilité
sont différés. Tant qu’ils ne sont pas réalisés, Proto05 n’est autonome ni pour
la chaîne HLS complète, ni pour sa dépendance locale à hls.js.

## Frontières architecturales

- **Portail** : présente les destinations et conserve les parcours Hub; il ne
  fusionne pas les applications.
- **Launcher** : démarre ou réutilise les processus; il n’installe, ne migre et
  ne possède rien.
- **Prototypes** : conservent leur logique pédagogique, leurs pages et leurs
  données métier propres.
- **Services transversaux Hub** : comptes, cours, assignations, runs, catalogues,
  connecteurs et compatibilités locales; ils ne forment pas une base métier
  commune imposée aux prototypes.
- **Dico-IC** : service de connaissances autonome. Seven Sieves en est un client
  au sein du même composant; les autres prototypes ne sont pas reliés à sa base
  par l’architecture actuelle.
- **Données** : chaque composant reste propriétaire de sa source. Un accès de
  compatibilité à un fichier voisin ne transfère pas cette propriété.
- **Base de données** : `ic_dico` appartient à Dico-IC. L’éventuel schéma
  `ic_hub` appartient au Hub; aucune table Dico-IC ne doit être utilisée comme
  stockage Hub.

## Décisions provisoires et évolutions différées

| Sujet | Décision actuelle | Ce qui n’est pas encore acquis |
|---|---|---|
| Stockage Proto05 | JSON local suivi dans le prototype, avec écritures atomiques et sauvegarde | Migration vers une base de données |
| Authentification Proto05 | Aucune; libellés étudiant/enseignant uniquement | Identités, rôles et contrôle d’accès réels |
| Droits | Visibilité pédagogique dans le JSON, sans permission serveur | Autorisations d’édition et de publication |
| IA Proto05 | Aucune génération IA dans le parcours actuel | Assistance IA à l’annotation ou à l’auteur |
| HLS Proto05 | Relais via le proxy strict et la dépendance hls.js d’IC-Hub | Propriété complète du proxy et de la dépendance dans Proto05 |
| Observations étudiantes | Mémoire navigateur et export CSV | Persistance serveur |

Ces décisions décrivent des frontières, pas une roadmap détaillée. Les travaux
futurs demandent des missions et décisions de conception séparées.

## Exclusions connues

Sont explicitement hors du périmètre actif :

- les anciens prototypes racine `01-seven-sieves`, `02-multilingual-story`,
  `03-forgotten-notebook` et `04-false-friends` ; Seven Sieves reste toutefois
  actif à l’intérieur de `08-dico-seven-sieves` ;
- Boost Hyper Engine (BHE) ;
- les PSD et documents privés d’entretien ;
- les secrets `.env` ;
- `node_modules`, journaux, sessions, runs, sauvegardes, corruptions, bases
  locales et autres données runtime ignorées ;
- toute affirmation qu’un brouillon SQL Dico-IC est une source de vérité ou
  qu’une base fraîche est reproductible.

## Incohérences documentaires à connaître

Le code et les launchers actuels priment pour la présente carte d’architecture.
Les divergences les plus structurantes sont :

| Source | Information ancienne ou contradictoire | État retenu ici |
|---|---|---|
| `PROJECTS_LAUNCH.md` | Son introduction décrit Proto05 sur `8791`, mais sa section détaillée le présente encore comme un fichier statique sans port | Serveur autonome `8791`, vérifié dans le launcher, le package et `server.js` |
| README racine et README Proto05 | Référencent encore `0.0.6`/`0.0.6.2` et présentent le serveur autonome comme futur | Le serveur sert `index-0.0.8.html`, version serveur/package `0.1.7` |
| README IC-Hub | Présente la séparation Proto05 comme future | La séparation existe; seules les routes de compatibilité et le HLS restent au Hub |
| README du serveur Proto05 | Affirme d’abord que `PUT` métadonnées est la seule écriture, puis documente l’atelier | Le code expose aussi `POST` de création et `PUT .../authoring` |
| Guide des launchers Windows | Sa phrase d’ouverture omet Proto05 | `start-all.bat` lance effectivement Proto05 en premier |

Le rapport associé donne la liste complète des contrôles et contradictions :
[rapport 028](../reports/028_workspace_architecture_documentation_report.md).

## Documents spécialisés

### Références actuelles

- [README du workspace](../README.md)
- [Provenance du workspace](WORKSPACE_PROVENANCE.md)
- [Lancement des projets](../PROJECTS_LAUNCH.md)
- [Serveur IC-Hub](../prototypes/00-ic-hub/server/README.md)
- [Prototype 05](../prototypes/05-augmented-ic-video-01/README.md) et
  [serveur autonome](../prototypes/05-augmented-ic-video-01/server/README.md)
- [Agent vocal](../prototypes/06-voice-agent-ic/README.md) et
  [serveur local](../prototypes/06-voice-agent-ic/server/README.md)
- [Informaticaire](../prototypes/07-informaticaire/README.md)
- [Index documentaire Dico-IC](../prototypes/08-dico-seven-sieves/docs/docs-index.md)
- [Modèle conceptuel Dico-IC](../prototypes/08-dico-seven-sieves/docs/ic_dico_model_notes_md_v_1.md)
- [Contrat d’analyse Dico-IC / Seven Sieves](../prototypes/08-dico-seven-sieves/docs/api-analysis-contract-v0.md)
- [JSON courant de Proto05](../prototypes/05-augmented-ic-video-01/data/activities.json),
  [extraction initiale du modèle](../reports/006_prototype_05_activity_json_extraction_report.md),
  [recentrage de sa propriété](../reports/007_prototype_05_data_ownership_relocation_report.md) et
  [modèle de visibilité des couches](../reports/025_prototype_05_layer_management_report.md)
- [État récent de Proto05](../reports/026_prototype_05_daily_summary_2026-07-13.md)

### Documents de gouvernance et de modèle

Les documents suivants complètent désormais cette architecture :

- [STATUS.md](../STATUS.md) — statut synthétique et prochaine priorité du workspace ;
- [AGENTS.md](../AGENTS.md) — règles de contribution et d’exécution pour Codex ;
- [DATA_MODEL.md](DATA_MODEL.md) — emplacement réservé pour une future synthèse
  des modèles de données. Ce document n’existe pas encore.