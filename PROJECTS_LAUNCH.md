# Lancement des projets IC-Lab-Next

État documentaire vérifié le **16 juillet 2026** à partir de
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) et des launchers présents dans
`scripts/windows/`.

Ce document indique comment les composants actifs sont lancés et atteints en
local. Les ports ci-dessous sont ceux déclarés par les scripts et serveurs. Aucun
service n’a été démarré pendant cette vérification documentaire ; leur
disponibilité runtime n’est donc pas affirmée ici.

## Vue d’ensemble

| Ordre global | Composant | Port | Entrée principale | Mode d’exécution |
|---:|---|---:|---|---|
| 1 | Prototype 05 — Vidéo augmentée | `8791` | <http://127.0.0.1:8791/> | Serveur Node autonome |
| 2 | IC-Lab Hub | `8790` | <http://127.0.0.1:8790/> | Serveur Node et portail |
| 3 | Prototype 06 — Agent vocal | `8788` | <http://127.0.0.1:8788/library-1.1.html> | Serveur Node autonome |
| 4a | MariaDB Dico-IC | `3306` | Service de base de données | Conteneur Docker Compose |
| 4b | Dico-IC / Seven Sieves | `3000` | <http://127.0.0.1:3000/admin-app/index-admin-0.1.html> | Serveur Node/Express après MariaDB |

Informaticaire n’a pas de serveur autonome : IC-Hub sert ses fichiers sous
<http://127.0.0.1:8790/demos/informaticaire/>.

## Lanceur global sous Windows

Le point d’entrée est
[`START_IC_LAB_NEXT.bat`](START_IC_LAB_NEXT.bat). Il délègue à
[`scripts/windows/start-all.bat`](scripts/windows/start-all.bat), qui appelle les
launchers spécialisés dans cet ordre exact :

```text
START_IC_LAB_NEXT.bat
  -> start-all.bat
       1. start-proto05.bat       -> 8791
       2. start-hub.bat           -> 8790
       3. start-agent-vocal.bat   -> 8788
       4. start-dico-seven.bat
            -> docker compose up -d
            -> attend MariaDB     -> 3306
            -> démarre Node       -> 3000
       5. contrôle les quatre serveurs
       6. ouvre http://127.0.0.1:8790/
```

Chaque launcher réutilise le service si son port est déjà ouvert. Après les
appels de démarrage, `start-all.bat` attend jusqu’à 30 tentatives par serveur et
affiche un résumé `démarré ou déjà actif`, `indisponible` ou `délai dépassé`.
Le portail Hub est ouvert même si l’un des services autonomes manque.

Les launchers utilisent des chemins calculés depuis leur propre emplacement. Ils
peuvent donc être appelés depuis un autre répertoire courant ou depuis un clone
placé dans un chemin contenant des espaces.

## Contrôle d’état sans démarrage

[`scripts/windows/check-status.bat`](scripts/windows/check-status.bat) est un
contrôle en lecture seule. Il :

- interroge la disponibilité de Docker Desktop avec `docker info` ;
- teste l’ouverture locale des ports MariaDB `3306`, Dico-IC `3000`, Agent vocal
  `8788`, IC-Hub `8790` et Proto05 `8791` ;
- affiche `actif` ou `indisponible` pour chaque port ;
- ne démarre aucun service et n’appelle aucun endpoint HTTP applicatif.

Il ne vérifie pas le port phpMyAdmin `8080`, bien que ce service soit déclaré
dans la stack Compose Dico-IC. Un port ouvert confirme seulement qu’un processus
écoute ; il ne valide ni son identité ni son état fonctionnel complet.

## Prototype 05 — Vidéo augmentée

- **Launcher** :
  [`scripts/windows/start-proto05.bat`](scripts/windows/start-proto05.bat).
- **Dossier serveur** : `prototypes/05-augmented-ic-video-01/server`.
- **Port** : `8791`.
- **Démarrage direct** : lancer `node --env-file=../.env.local server.js` depuis
  le dossier serveur. MariaDB est obligatoire, constitue l’unique autorité et
  doit exposer le registre `001`/`002`/`003` ainsi que les procédures canoniques.
- **Entrée racine** : <http://127.0.0.1:8791/> ; le serveur sert actuellement
  `index-0.0.9.html`.
- **Vue étudiante** : <http://127.0.0.1:8791/student/:activityId>.
- **Bibliothèque enseignante** : <http://127.0.0.1:8791/teacher>.
- **Prévisualisation** :
  <http://127.0.0.1:8791/teacher/preview/:activityId>.
- **Création et ateliers** : `/teacher/create`,
  `/teacher/edit/:activityId`, `/teacher/author/:activityId` et
  `/teacher/guided/:activityId`.
- **Ateliers média** : `/teacher/anonymization/:preparationJobId` pour l’image
  et `/teacher/audio-anonymization/:preparationJobId` pour le son.
- **Guide** :
  [README du serveur autonome](prototypes/05-augmented-ic-video-01/server/README.md).

Le launcher global démarre Proto05 **avant IC-Hub** et charge sa configuration MariaDB
avec la configuration locale non versionnée. Le serveur possède ses pages et
son API, mais sa chaîne vidéo n’est pas encore entièrement autonome :

- les requêtes HLS autorisées sont relayées par Proto05 vers le proxy strict
  d’IC-Hub sur `8790` ;
- IC-Hub contacte ensuite une source HLS UGA fixe ;
- Proto05 sert `hls.js`, mais lit actuellement le fichier installé dans le
  `node_modules` du serveur Hub.

Proto05 peut donc démarrer avant le Hub, mais la lecture HLS reste indisponible
tant qu’IC-Hub ou la source UGA ne répond pas. Le mode enseignant local ne fournit
ni authentification ni gestion réelle des droits.

## IC-Lab Hub

- **Launcher** : [`scripts/windows/start-hub.bat`](scripts/windows/start-hub.bat).
- **Dossier serveur** : `prototypes/00-ic-hub/server`.
- **Port** : `8790`.
- **Démarrage direct** : `npm start` depuis le dossier serveur.
- **Portail public** : <http://127.0.0.1:8790/> ; la racine redirige vers
  `/portal-0.10.3.html`.
- **Alias du portail** : <http://127.0.0.1:8790/portal.html>, redirigé vers la
  même page.
- **Hub pédagogique historique** : <http://127.0.0.1:8790/hub.html>, redirigé
  vers `/hub-0.9.6.html`.
- **Guide** : [README du serveur](prototypes/00-ic-hub/server/README.md).

### Routes de démonstrateurs

- <http://127.0.0.1:8790/demos/augmented-video/> redirige vers
  <http://127.0.0.1:8791/>. Cette route est une entrée de compatibilité ; les
  chemins descendants du montage statique historique restent encore présents
  côté Hub.
- <http://127.0.0.1:8790/demos/informaticaire/> sert directement les fichiers de
  `prototypes/07-informaticaire`.

IC-Hub est le portail et conserve ses parcours propres de comptes, cours et
activités. Il ne démarre ni Proto05, ni Agent vocal, ni Dico-IC : cette
orchestration appartient aux launchers. Les anciennes routes Hub
`GET /api/proto05/activities` et `GET /api/proto05/activities/:id` restent
provisoirement disponibles en lecture seule et lisent la source appartenant à
Proto05.

Le launcher Hub exige Node.js, npm et les dépendances déjà installées dans
`server/node_modules`. Il ne lance aucune installation.

## Prototype 06 — Agent vocal IC

- **Launcher** :
  [`scripts/windows/start-agent-vocal.bat`](scripts/windows/start-agent-vocal.bat).
- **Dossier serveur** : `prototypes/06-voice-agent-ic/server`.
- **Port** : `8788`.
- **Démarrage direct** : `npm start` depuis le dossier serveur.
- **Bibliothèque** : <http://127.0.0.1:8788/library-1.1.html>.
- **Runtime connecté** : <http://127.0.0.1:8788/index-1.2.3.html>.
- **Sandbox d’inspection** :
  <http://127.0.0.1:8788/sandbox-1.3-alpha.html>.
- **Guide** :
  [README du serveur](prototypes/06-voice-agent-ic/server/README.md).

Le serveur possède son API et ses activités dans `server/data/activities.json`.
IC-Hub peut le consulter et construire des lancements locaux, mais le service
reste autonome. La synthèse et la reconnaissance vocales dépendent des capacités
du navigateur et du système. La génération IA de la sandbox reste désactivée.

Le launcher vérifie Node.js et npm, mais ne fait aucune installation de
dépendances.

## Informaticaire

- **Serveur autonome** : aucun.
- **Entrée recommandée dans le workspace lancé** :
  <http://127.0.0.1:8790/demos/informaticaire/>.
- **Source** : `prototypes/07-informaticaire/index.html`.
- **Données** : `prototypes/07-informaticaire/data.js`.
- **Guide** : [README](prototypes/07-informaticaire/README.md).

La disponibilité d’Informaticaire dépend donc d’IC-Hub `8790`. Les exports sont
produits côté navigateur. Les documents privés d’entretien ne font pas partie
du dépôt.

## Dico-IC / Seven Sieves

- **Launcher** :
  [`scripts/windows/start-dico-seven.bat`](scripts/windows/start-dico-seven.bat).
- **Racine Compose** : `prototypes/08-dico-seven-sieves`.
- **Dossier serveur** : `prototypes/08-dico-seven-sieves/Node`.
- **MariaDB** : `3306`.
- **Serveur Node/Express** : `3000`.
- **Administration Dico-IC** :
  <http://127.0.0.1:3000/admin-app/index-admin-0.1.html>.
- **Seven Sieves live** :
  <http://127.0.0.1:3000/prototypes/01-seven-sieves/index-api-live-0.1.html>.
- **Guide** :
  [démarrage local](prototypes/08-dico-seven-sieves/docs/dico-local-development-startup.md).

Le launcher :

1. vérifie Node.js, npm, Docker Desktop et les dépendances Node déjà présentes ;
2. exécute uniquement `docker compose up -d` dans la racine Dico-IC ;
3. attend l’ouverture de MariaDB sur `3306` ;
4. réutilise le serveur `3000` s’il est déjà actif, sinon lance `npm start` dans
   `Node`.

La stack utilise le volume externe `ic_lab_next_mariadb_data`. Le launcher ne
fait ni migration, ni import SQL, ni initialisation explicite de base et ne
supprime aucun volume. Le dossier `database/current_draft/` n’est pas une source
SQL canonique validée ; la reconstruction d’une base fraîche reste hors du flux
de lancement courant.

MariaDB et Docker doivent être disponibles avant le démarrage du serveur Node.
Le conteneur phpMyAdmin déclaré sur `8080` est auxiliaire et n’est ni une entrée
principale de ce guide ni un service vérifié par `check-status.bat`.

## Arrêt et limites générales

- Arrêter chaque serveur Node avec `Ctrl+C` dans sa fenêtre dédiée.
- Le workspace ne fournit pas de `stop-all.bat`.
- Pour arrêter les conteneurs Dico sans supprimer les données, utiliser
  `docker compose stop` depuis `prototypes/08-dico-seven-sieves`.
- Ne pas utiliser `docker compose down -v`, qui supprimerait les volumes.
- Les launchers ne font aucun `npm install`, migration, import SQL ou réparation
  automatique de données.
- Un port déjà ouvert est réutilisé sans vérification de l’identité du processus.
- Le portail peut s’ouvrir alors qu’un service autonome est indisponible.
- Proto05 dépend encore d’IC-Hub et de la source UGA pour la lecture HLS.
- Agent vocal dépend des API vocales du navigateur et du système.
- Dico-IC dépend de Docker, de MariaDB et de son volume externe existant.

Pour les frontières entre composants, données et services, consulter
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Pour les règles d’arrêt sûr et le
détail des scripts Windows, consulter
[`scripts/windows/README.md`](scripts/windows/README.md).
