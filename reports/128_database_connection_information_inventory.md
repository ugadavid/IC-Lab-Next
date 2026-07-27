# Mission 128 — Inventaire des informations de connexion aux bases

Date : 27 juillet 2026

## Résultat

Le dossier `prototypes/` contient actuellement **cinq racines actives**, et non
six :

1. `00-ic-hub` ;
2. `05-augmented-ic-video-01` ;
3. `06-voice-agent-ic` ;
4. `07-informaticaire` ;
5. `08-dico-seven-sieves`.

La documentation du workspace confirme ce périmètre. Le dernier dossier réunit
deux composants fonctionnels, **Dico-IC** et **Seven Sieves**. En les comptant
séparément, on obtient donc six surfaces fonctionnelles.

Seuls deux composants possèdent un connecteur de base de données actif dans le
code actuel :

- **IC-Hub**, avec un mode MariaDB optionnel et un mode JSON par défaut ;
- **Dico-IC**, connecté à MariaDB par son serveur Node.

Proto05, Proto06 et Informaticaire utilisent actuellement des fichiers
JSON/JavaScript. Seven Sieves appelle l’API HTTP de Dico-IC et ne possède aucune
connexion directe à MariaDB.

Les mots de passe et contenus de fichiers `.env` ne sont pas reproduits dans ce
rapport. Les chemins, noms de variables, valeurs non sensibles, valeurs par
défaut et relations entre configurations sont documentés.

## État initial et préservation

- Branche observée : `main`.
- Changements locaux préexistants :
  - `prototypes/08-dico-seven-sieves/docker-compose.yml` modifié ;
  - `prototypes/05-augmented-ic-video-01/database/` non suivi ;
  - `reports/127_proto05_mariadb_model_draft.md` non suivi.
- Ces changements ont été préservés et n’ont pas été modifiés.
- Numéro maximal de rapport vérifié avant écriture : `127`.
- Aucun fichier
  `reports/128_database_connection_information_inventory.md` n’existait.

Cette mission est documentaire. Aucune version applicative n’est modifiée.

## Synthèse par prototype ou composant

| Prototype ou composant | Connexion DB actuelle | Stockage/configuration observés |
|---|---|---|
| `00-ic-hub` | Oui, MariaDB optionnelle | Variables `IC_HUB_DB_*`; chargement du `.env` à la racine du workspace; exemple dans `server/.env.example`; valeurs de repli dans `server/db/db.js` |
| `05-augmented-ic-video-01` | Non | Fichiers JSON actifs; un brouillon SQL MariaDB non exécuté et sans credential est présent dans les changements locaux |
| `06-voice-agent-ic` | Non | `server/data/activities.json` et sauvegardes JSON |
| `07-informaticaire` | Non | `data.js` côté navigateur, sans backend |
| Dico-IC dans `08-dico-seven-sieves` | Oui, MariaDB principale | Credentials de conteneurs dans `docker-compose.yml`; variables `DB_*` et valeurs de repli dans `Node/src/repository.js` |
| Seven Sieves dans `08-dico-seven-sieves/prototypes/01-seven-sieves` | Non, indirecte | Appels HTTP vers l’API Dico-IC sur `localhost:3000` |

## 1. IC-Hub

### Où les informations sont stockées

1. **Configuration locale potentiellement effective** :
   `.env` à la racine du workspace.
   `server/server.js` construit explicitement ce chemin depuis
   `WORKSPACE_DIR`, puis le charge avec `dotenv`. Ce fichier existe dans l’état
   local observé, mais son contenu n’a pas été lu.
2. **Modèle suivi par Git** :
   `prototypes/00-ic-hub/server/.env.example`.
3. **Valeurs de repli du code** :
   `prototypes/00-ic-hub/server/db/db.js`.
4. **Documentation d’exploitation** :
   `prototypes/00-ic-hub/server/db/README.md`.

Les variables déjà définies dans l’environnement du processus ont priorité,
car le chargement `dotenv` utilise `override: false`. Le fichier racine `.env`
vient ensuite, puis les valeurs de repli de `db.js`.

### Paramètres observés

| Paramètre | Variable | Valeur non sensible de repli |
|---|---|---|
| Sélecteur de stockage | `IC_HUB_STORE` | `json` |
| Hôte | `IC_HUB_DB_HOST` | `127.0.0.1` |
| Port | `IC_HUB_DB_PORT` | `3306` |
| Base | `IC_HUB_DB_NAME` | `ic_hub` |
| Utilisateur | `IC_HUB_DB_USER` | `ic_hub_user` |
| Mot de passe | `IC_HUB_DB_PASSWORD` | présent dans l’exemple et dans un repli littéral du code; valeur non reproduite |

Le mode MariaDB n’est activé que si `IC_HUB_STORE=mariadb`. Sinon, le Hub
utilise ses fichiers JSON. Si MariaDB est demandée mais indisponible, le code
prévoit un fallback JSON.

Au moment de l’inspection, aucune variable `IC_HUB_*` concernée n’était définie
dans l’environnement du processus d’inspection. Cela ne prouve pas la
configuration d’un autre processus Hub déjà lancé ou lancé depuis un autre
terminal.

### Point de sécurité

La présence d’un mot de passe d’exemple non vide et d’une valeur de repli
littérale dans des fichiers suivis par Git mérite une correction séparée :
supprimer tout credential du code et ne conserver qu’une variable obligatoire
ou un placeholder manifestement non utilisable. Aucune correction n’a été
effectuée pendant cette mission.

## 2. Proto05 — Vidéo augmentée

Proto05 ne possède pas de connecteur DB actif dans son serveur actuel. Ses
données sont persistées dans plusieurs fichiers JSON appartenant au prototype.
Aucun driver MariaDB, MySQL, PostgreSQL, SQLite, MongoDB ou Redis n’apparaît
dans ses dépendances applicatives.

Un brouillon local non suivi existe dans :

`prototypes/05-augmented-ic-video-01/database/drafts/001_proto05_schema_draft.sql`

Ce brouillon :

- propose théoriquement la base `ic_proto05` ;
- ne crée aucun utilisateur ;
- ne contient aucun credential ;
- n’a pas été exécuté ;
- ne constitue donc pas une information de connexion effective.

## 3. Proto06 — Agent vocal IC

Proto06 n’utilise pas de base de données. Le README du serveur indique que les
activités sont stockées dans :

`prototypes/06-voice-agent-ic/server/data/activities.json`

Les sauvegardes sont également des fichiers JSON. Aucun driver DB n’est présent
dans les dépendances inspectées.

## 4. Proto07 — Informaticaire

Informaticaire est une application statique, sans serveur ni backend propre.
Les données sont chargées depuis :

`prototypes/07-informaticaire/data.js`

Les exports sont produits côté navigateur. Aucune configuration ni connexion
DB n’a été trouvée.

## 5. Dico-IC

### Où les informations sont stockées

1. **Création et accès aux conteneurs MariaDB/phpMyAdmin** :
   `prototypes/08-dico-seven-sieves/docker-compose.yml`.
2. **Connexion du serveur Node** :
   `prototypes/08-dico-seven-sieves/Node/src/repository.js`.
3. **Dépendance cliente** :
   `mysql2/promise`, déclarée par le package Node.

Le serveur Node lit directement les variables du processus. Aucun chargement
d’un fichier `.env` pour les paramètres DB n’a été trouvé dans le parcours de
connexion.

### Paramètres du serveur Node

| Paramètre | Variable | Valeur non sensible de repli |
|---|---|---|
| Hôte | `DB_HOST` | `localhost` |
| Port | `DB_PORT` | `3306` |
| Base | `DB_NAME` | `ic_dico` |
| Utilisateur | `DB_USER` | `ic_user` |
| Mot de passe | `DB_PASSWORD` | repli littéral présent dans le code; valeur non reproduite |

Au moment de l’inspection, aucune variable `DB_*` concernée n’était définie
dans l’environnement du processus d’inspection.

### Paramètres Compose

| Usage | Clés observées | Valeurs non sensibles |
|---|---|---|
| MariaDB | `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_ROOT_PASSWORD` | base `ic_dico`, utilisateur `ic_user`, mots de passe non reproduits |
| Exposition MariaDB | mapping de port | `3306:3306` |
| Persistance | volume externe | `ic_lab_next_mariadb_data` |
| phpMyAdmin | `PMA_HOST`, `PMA_USER`, `PMA_PASSWORD` | hôte `mariadb`, utilisateur `root`, mot de passe non reproduit |
| Exposition phpMyAdmin | mapping de port | `8080:80` |

Les contrôles relationnels sans divulgation ont établi que :

- le mot de passe applicatif MariaDB défini dans Compose est identique à la
  valeur de repli utilisée par le repository Node ;
- le mot de passe phpMyAdmin est identique au mot de passe root MariaDB.

### Point de sécurité

Les mots de passe sont actuellement littéraux dans le fichier Compose, et le
mot de passe applicatif possède aussi un repli littéral dans le code Node.
Même s’il s’agit d’un environnement local, ces informations suivies par Git
devraient être remplacées lors d’une mission dédiée par des variables locales
ignorées, un fichier d’exemple sans secret et une erreur explicite lorsqu’un
credential nécessaire manque.

Le fichier local
`prototypes/08-dico-seven-sieves/admin/.env` existe, mais le code inspecté le
charge pour la configuration OpenAI de l’administration, pas pour la connexion
MariaDB. Son contenu n’a pas été lu.

## 6. Seven Sieves

Seven Sieves ne lit jamais MariaDB directement. Les scripts live appellent :

`http://localhost:3000/analysis`

Il s’agit de l’API HTTP fournie par le serveur Node Dico-IC. La connexion DB
reste donc entièrement du côté Dico-IC.

## Fichiers et sources inspectés

Les contrôles ont porté notamment sur :

- `docs/WORKSPACE_PROVENANCE.md` ;
- `docs/ARCHITECTURE.md` ;
- `PROJECTS_LAUNCH.md` ;
- `STATUS.md` ;
- les README pertinents des cinq racines ;
- les `package.json` et dépendances DB ;
- les sources serveur et repositories ;
- les configurations Compose ;
- les scripts Seven Sieves ;
- les noms des fichiers `.env`, sans lire leur contenu ;
- la présence des variables concernées dans l’environnement du processus, sans
  lire leur valeur.

Les recherches ont exclu `node_modules`, les fichiers `.env`, les journaux et
les rapports historiques lorsqu’il s’agissait d’établir l’état du code actif.

## Vérifications réalisées

- comptage des racines réelles sous `prototypes/` ;
- rapprochement avec la provenance et l’architecture documentées ;
- recherche statique des drivers et mots-clés MariaDB, MySQL, PostgreSQL,
  SQLite, MongoDB et Redis ;
- inspection des sources de connexion et de leur priorité de configuration ;
- vérification de la présence des fichiers `.env` sans lecture de leur contenu ;
- contrôle sans divulgation de la cohérence entre credentials Compose,
  repository Node et phpMyAdmin ;
- recherche des accès directs à une DB dans Seven Sieves ;
- vérification que le brouillon SQL Proto05 ne contient aucun credential ;
- préservation des changements locaux préexistants.

## Non vérifié et limites

- aucun contenu de fichier `.env` n’a été lu ;
- aucun mot de passe n’est reproduit ;
- aucun serveur ou conteneur n’a été démarré ;
- aucune connexion MariaDB n’a été tentée ;
- aucun endpoint HTTP n’a été appelé ;
- aucune base, table, donnée ou variable d’environnement n’a été modifiée ;
- la configuration effective d’un processus lancé depuis un autre terminal
  reste inconnue ;
- aucune validation fonctionnelle humaine de David n’a été réalisée.

## Fichier créé

- `reports/128_database_connection_information_inventory.md`.

Aucun fichier applicatif, donnée, configuration, launcher ou version n’a été
modifié.

## Version, limites restantes et suite possible

Version obtenue : **inchangée**. Cette mission documentaire ne modifie aucune
version applicative.

Suite possible, par mission séparée et après arbitrage :

1. retirer les credentials littéraux du Hub et de Dico-IC ;
2. fournir des `.env.example` ne contenant que des placeholders ;
3. documenter la création d’utilisateurs MariaDB applicatifs limités ;
4. vérifier la connexion sur une base jetable, sans toucher au volume canonique.

Message de commit proposé, sans commit effectué :

`docs: inventory database connection configuration`
