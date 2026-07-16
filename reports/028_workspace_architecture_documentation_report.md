# Rapport 028 — documentation de l’architecture du workspace

Date : **16 juillet 2026**

Mission : création de `docs/ARCHITECTURE.md` et du présent rapport, sans
modification applicative.

## Résultat

Le document [ARCHITECTURE.md](../docs/ARCHITECTURE.md) décrit l’organisation
actuelle d’IC-Lab-Next, sa topologie locale, les frontières de données et de
services, ainsi que l’architecture autonome mais encore partiellement dépendante
d’IC-Hub de Proto05.

La rédaction distingue les faits présents dans le dépôt, les compatibilités
provisoires et les évolutions explicitement différées. Les anciens documents ne
sont pas repris comme état courant lorsqu’ils contredisent les exécutables.

## Sources consultées

### Documents de cadrage et lancement

- `README.md` ;
- `PROJECTS_LAUNCH.md` ;
- `docs/WORKSPACE_PROVENANCE.md` ;
- `.gitignore` ;
- `START_IC_LAB_NEXT.bat` ;
- `scripts/windows/README.md` ;
- `scripts/windows/start-all.bat` ;
- `scripts/windows/start-hub.bat` ;
- `scripts/windows/start-proto05.bat` ;
- `scripts/windows/start-agent-vocal.bat` ;
- `scripts/windows/start-dico-seven.bat` ;
- `scripts/windows/check-status.bat`.

### README des composants actifs

- `prototypes/00-ic-hub/server/README.md` ;
- `prototypes/00-ic-hub/server/db/README.md` ;
- `prototypes/05-augmented-ic-video-01/README.md` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `prototypes/06-voice-agent-ic/README.md` ;
- `prototypes/06-voice-agent-ic/server/README.md` ;
- `prototypes/06-voice-agent-ic/voice-lab/README.md` ;
- `prototypes/07-informaticaire/README.md` ;
- `prototypes/08-dico-seven-sieves/database/current_draft/README.md` ;
- `prototypes/08-dico-seven-sieves/docs/docs-index.md` ;
- `prototypes/08-dico-seven-sieves/docs/dico-local-development-startup.md`.

Le composant `08-dico-seven-sieves` ne possède pas de README à sa racine. Son
index documentaire et son guide de démarrage ont donc été utilisés comme points
d’entrée spécialisés.

### Exécutables et configurations inspectés statiquement

- les `package.json` des serveurs Hub, Proto05, Proto06 et Dico-IC ;
- `server.js` des quatre serveurs ;
- `prototypes/00-ic-hub/public/portal-0.10.3.html` ;
- `prototypes/00-ic-hub/server/data/prototypes.json` ;
- `prototypes/08-dico-seven-sieves/docker-compose.yml` ;
- les vues courantes Proto05 `index-0.0.8.html`, `teacher.html`,
  `teacher-create.html`, `teacher-edit.html`, `teacher-author.html` et
  `teacher-guided.html` ;
- `prototypes/05-augmented-ic-video-01/shared/ic-timeline.js` et `.css` ;
- la structure et les clés de
  `prototypes/05-augmented-ic-video-01/data/activities.json`, sans écriture ;
- l’inventaire Git des fichiers de données suivis et l’inventaire des dossiers
  actifs, exclus et `.git` imbriqués.

Aucun fichier `.env` n’a été lu.

### Rapports et modèles spécialisés

- rapports `003`, `004`, `005`, `006`, `007`, `008`, `009`, `016`, `020`,
  `025`, `026` et `027` à la racine `reports/` ;
- `prototypes/08-dico-seven-sieves/docs/ic_dico_model_notes_md_v_1.md` ;
- `prototypes/08-dico-seven-sieves/docs/api-analysis-contract-v0.md` ;
- références ciblées à la source de vérité SQL et à Compose dans la
  documentation Dico-IC.

## Faits vérifiés dans le dépôt

### Workspace et périmètre

- La racine est l’unique dépôt Git; aucun `.git` imbriqué n’a été trouvé sous
  `prototypes/`.
- Les cinq racines actives `00`, `05`, `06`, `07` et `08` sont présentes.
- Les anciens prototypes racine `01` à `04` et BHE ne sont pas présents.
- Le dossier privé `prototypes/07-informaticaire/entretiens/` est absent et
  ignoré par la configuration Git.
- `STATUS.md`, `AGENTS.md` et `DATA_MODEL.md` sont absents; ils n’ont pas été
  créés par cette mission.

### Lancement et ports

- Le launcher global appelle réellement, dans cet ordre, Proto05, IC-Hub,
  Proto06 puis Dico-IC.
- Les ports déclarés sont `8791`, `8790`, `8788`, `3000` et `3306`.
- Compose déclare aussi phpMyAdmin sur `8080`; ce port n’est pas inclus dans le
  contrôle du launcher.
- Le launcher Dico exécute `docker compose up -d`, attend `3306`, puis démarre
  Node sur `3000`. Aucun script de migration ou SQL n’est appelé par les
  launchers.

### Services et accès

- IC-Hub sert le portail public et Informaticaire, expose les parcours Hub et
  redirige l’entrée exacte Proto05 vers `8791`.
- Proto06 et Dico-IC restent des services autonomes atteints par des liens du
  portail.
- Seven Sieves et l’administration Dico-IC sont servis par le même serveur Node
  que l’API Dico-IC sur `3000`.
- Le serveur Dico-IC dépend de MariaDB; Seven Sieves n’accède pas directement à
  la base.

### Données et frontières

- IC-Hub possède ses fichiers transversaux sous `server/data/`. Les sessions,
  runs, sauvegardes et fichiers corrompus runtime sont ignorés.
- Proto05 possède `data/activities.json`; le Hub n’en conserve pas de copie dans
  son propre dossier de données.
- Proto06 possède `server/data/activities.json`; son serveur crée des sauvegardes
  runtime avant écriture.
- Informaticaire charge le corpus suivi `data.js` et produit ses exports côté
  navigateur.
- Dico-IC persiste dans la base `ic_dico` du volume externe
  `ic_lab_next_mariadb_data`.
- Le dossier Compose `db/` est vide, tandis que `database/current_draft/` n’est
  ni monté ni déclaré source de vérité. Une initialisation fraîche fiable n’est
  donc pas vérifiée.

### Proto05 actuel

- Le serveur autonome est versionné `0.1.7`, écoute sur `127.0.0.1:8791` et sert
  `index-0.0.8.html` à la racine.
- Les vues étudiant et prévisualisation enseignant partagent ce moteur.
- Les bibliothèques et ateliers enseignant disposent de routes de création,
  édition, auteur avancé et atelier guidé.
- La timeline partagée se trouve dans `shared/ic-timeline.js` et `.css` et est
  utilisée par la vue étudiante et l’atelier guidé.
- Le JSON courant possède une enveloppe `schemaVersion`, `updatedAt`,
  `activities`; l’activité vérifiée contient vidéo, intervalles linguistiques,
  transcription, segments, locuteurs, langues, couches, phénomènes, annotations,
  visibilité et métadonnées pédagogiques.
- Le serveur expose la lecture, la création d’un brouillon et deux niveaux de
  mise à jour; il valide puis écrit le JSON de manière séquencée et atomique,
  après copie `.bak`.
- Aucune authentification ni permission réelle ne protège ces écritures locales.

### Dépendances provisoires Proto05 / Hub

- Le relais HLS Proto05 accepte une liste fermée de chemins puis les transmet au
  proxy HLS d’IC-Hub sur `8790`.
- IC-Hub résout une source UGA fixe et conserve la responsabilité du proxy
  sortant.
- Proto05 lit également `hls.min.js` depuis le `node_modules` du serveur Hub.
- IC-Hub garde ses routes Proto05 en lecture seule, qui lisent directement le
  JSON du prototype.
- La route exacte `/demos/augmented-video/` redirige vers `8791`; le montage
  statique historique demeure dans le serveur Hub pour les chemins descendants.

## Contradictions documentaires rencontrées

| Source | Contradiction | Arbitrage documentaire |
|---|---|---|
| `PROJECTS_LAUNCH.md` | L’introduction annonce Proto05 autonome sur `8791`; la section Proto05 indique encore « aucun port » et ouverture directe de `index-0.0.6.html` | Launcher, package et serveur actuels retenus |
| `README.md` racine | Le lien de démonstrateur Proto05 pointe encore vers `index-0.0.6.html` | Entrée serveur actuelle `index-0.0.8.html` retenue |
| README Proto05 | S’arrête à `0.0.6.2` et annonce le serveur autonome comme mission future | Serveur autonome et rapports `008` à `027` retenus |
| README IC-Hub | Annonce une séparation future de Proto05 et décrit seulement la passerelle en lecture seule | Cette description ne vaut plus que pour les routes Hub héritées |
| README serveur Proto05 | Affirme que `PUT /activities/:id` est la seule écriture, puis documente l’atelier auteur | Le code confirme aussi `POST /activities` et `PUT /activities/:id/authoring` |
| `scripts/windows/README.md` | La phrase d’ouverture liste Hub, Agent vocal et Dico-IC sans Proto05 | `start-all.bat` confirme que Proto05 est lancé en premier |
| Rapport `003` et rapport `004` | Décrivent l’ancienne vidéo statique servie par Hub et un launcher global à trois serveurs | Conservés comme historique, pas comme topologie actuelle |
| Rapport `026` | Formule que « IC-Hub sert l’activité » | Interprétation restreinte au HLS/à la compatibilité; la page, l’API principale et le JSON sont servis par Proto05 |
| README Informaticaire | Liste un dossier `entretiens/` de PDF sources | Le dossier est actuellement absent et explicitement ignoré comme privé |
| Documentation Dico-IC | Plusieurs scripts SQL existent, mais aucun n’est consacré comme source canonique; le montage Compose vise un dossier vide | Aucune source SQL ni reproductibilité de base fraîche n’est affirmée |

Les versions d’interface, de serveur et de package ne forment pas toujours un
numéro unique. Le document d’architecture nomme les artefacts courants au lieu de
fabriquer une « version globale » de chaque prototype.

## Choix de structure retenus

- Une carte par responsabilité plutôt qu’un historique des versions.
- Une séparation explicite entre portail, launcher, prototypes, services et
  stockages.
- Un tableau de ports fondé sur les valeurs déclarées, accompagné d’un avertissement
  sur l’absence de contrôle runtime.
- Deux flux ASCII courts : topologie d’exécution et séquence de lancement.
- Une section Proto05 plus détaillée, justifiée par sa récente autonomisation et
  par le nombre de documents anciens encore présents.
- Une section dédiée aux dépendances provisoires, afin de ne pas présenter
  Proto05 comme totalement découplé.
- Des liens vers les documents spécialisés existants et des liens explicitement
  signalés comme futurs vers `STATUS.md`, `AGENTS.md` et `DATA_MODEL.md`.
- Une liste compacte des contradictions dans l’architecture, avec le détail
  complet conservé dans le présent rapport.

## Éléments volontairement hors périmètre

- Manuel utilisateur ou procédure de recette interactive.
- Historique détaillé des versions des prototypes.
- Roadmap technique au-delà des décisions explicitement différées.
- Analyse du contenu privé, des secrets ou des fichiers `.env`.
- Validation du contenu scientifique ou pédagogique des corpus.
- Détermination d’une source SQL canonique Dico-IC.
- Conception de l’authentification, des droits, de l’IA ou de la future base
  Proto05.
- Création de `STATUS.md`, `AGENTS.md` ou `DATA_MODEL.md`.
- Modification de README existant, code, données, launcher ou configuration.

## Vérifications effectuées

Les contrôles sont exclusivement documentaires et statiques :

- inventaire des fichiers et README avec `rg --files` et PowerShell ;
- lecture des documents, packages, launchers, configurations et portions de
  serveurs pertinentes ;
- recherche des ports, routes, chemins de données et dépendances par `rg` ;
- inventaire des données suivies avec `git ls-files` ;
- vérification de l’existence des cinq composants et de l’absence des anciens
  composants racine, BHE, documents futurs et dépôts Git imbriqués ;
- parsing en lecture seule des clés du JSON Proto05 ;
- contrôle des liens locaux des deux nouveaux documents, avec trois liens futurs
  volontairement absents et signalés comme tels ;
- revue du diff limitée aux deux livrables ;
- `git diff --check`.

Aucun serveur, navigateur, conteneur, test applicatif, migration, endpoint,
script SQL ou écriture de données n’a été lancé pendant cette mission.
