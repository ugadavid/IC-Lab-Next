# 229 — État des lieux et préparation de l’hébergement IC sur Alpaga

Date : **9 septembre 2026**. Mission documentaire, sans installation ni déploiement.

## 1. Résultat et périmètre

**Les cinq outils demandés peuvent être regroupés derrière Apache avec trois processus Node et MariaDB. En revanche, le code courant ne permet pas une publication sous un préfixe URL par simple réglage Apache.** Des liens locaux, des URL absolues à la racine et des chemins interprétés dans le navigateur demandent des adaptations de configuration intégrées aux interfaces, à proposer puis réaliser dans une mission distincte.

La solution conservatrice recommandée est une entrée `https://alpaga.univ-grenoble-alpes.fr/ic/`, avec trois montages `/ic/hub/`, `/ic/video/`, `/ic/dico/`, et une protection Apache commune limitée à `/ic`. Elle conserve les noms DNS et les accès Drupal. Elle reste conditionnée à la vérification que `/ic` n’est pas déjà utilisé, à l’inspection Apache et à l’acceptation des adaptations d’URL décrites en section 6. **Ne pas mettre en ligne le clone inchangé avec ces seuls montages.**

David a précisé pendant cette mission : **IC-Hub = portail d’accès uniquement**. Les anciens parcours comptes, cours et administration Hub ne sont pas à publier. Informaticaire, Dico-IC, Seven Sieves et Vidéos augmentées conservent leurs fonctions et limites actuelles. L’Agent vocal, la maquette Sites/Next d’Informaticaire, les autres prototypes et le site de soutenance sont exclus. Aucune application de recette, gestion d’utilisateurs ou intégration d’identité n’est proposée.

Trois statuts sont utilisés dans ce rapport :

- **Constat actuel** : observation du disque, de Git, du code ou d’une source officielle consultée pendant cette mission.
- **Historique communiqué** : information fournie par David ou issue d’une documentation antérieure, sans nouvelle validation d’exécution.
- **Recommandation** : proposition non appliquée, dont les conditions sont explicitées.

Ce rapport unique est écrit dans `docs/` conformément à la mission explicite, prioritaire sur l’emplacement général `reports/` d’AGENTS.md. La séquence locale maximale était 228 ; le numéro 229 et l’absence de collision ont été vérifiés avant création. Ce document **n’est pas** le rapport historique de restauration 229 cité dans la mission, absent du dépôt courant. Version applicative inchangée.

## 2. État réel du dépôt et livraison GitHub

| Vérification actuelle | Résultat |
|---|---|
| Source | `J:\2026\UGA\M2\Stage-Memoire\Applications\IC-Lab-Next` |
| Branche | `main` |
| HEAD | `eb356b522b660b2cc895da84ab1f9387d640b97b` |
| Message / date du commit | `feat(soutenance): ajout du mémoire` / 29 août 2026 |
| Référence locale `origin/main` | Même SHA |
| Remote fetch et push | `https://github.com/ugadavid/IC-Lab-Next.git` |
| Vérification distante | `git ls-remote origin refs/heads/main` : même SHA ; aucune récupération d’objets, aucun fetch ni push |
| État initial | Aucun fichier suivi modifié, aucune modification indexée, aucun fichier non suivi non ignoré |
| Contrôle final après création | Uniquement ce rapport non suivi ; aucun diff suivi ou indexé ; HEAD inchangé |

La première tentative réseau restreinte a échoué ; une seconde interrogation distante en lecture seule a réussi. La correspondance GitHub est donc revérifiée, et ne repose pas uniquement sur la référence locale `origin/main`. Cela ne valide ni la procédure future d’accès GitHub depuis Alpaga, ni les réglages de visibilité du dépôt.

Le démarrage et les premiers parcours revérifiés par David après retour au commit restent une **validation humaine communiquée**, non une recette reproduite ici. Aucun historique Git, backup ou fichier ignoré n’a été utilisé pour réactiver du code ultérieur.

### Hors Git : ce qu’un clone ne transporte pas

| Élément constaté | Traitement de livraison recommandé |
|---|---|
| `.env` racine, `.env.local` Proto05, `admin/.env` Dico présents et ignorés | Ne pas copier aveuglément les configurations locales. Préparer séparément des configurations privées adaptées à Alpaga ; leurs contenus n’ont pas été lus. |
| `node_modules` Hub et Dico présents et ignorés | Reconstituer sur Linux à partir des deux `package-lock.json` suivis ; ne pas transférer les dépendances Windows. |
| SQL vivant | Absent de Git ; livrer des dumps logiques explicitement limités aux schémas IC retenus. |
| Médias Proto05 | Deux répertoires ignorés, inventoriés ci-dessous ; transfert séparé nécessaire. |
| Hub `sessions.json`, `runs.json`, corruptions et sauvegardes ignorés | Ne pas transférer de sessions actives ni de corruptions. Pour le portail seul, aucun besoin identifié de transférer les runs historiques. |
| Dumps racine `mariadb_backup_*.sql`, dossiers `backups`, `prototypes/database`, `temp`, `.ic-lab-next-runtime` | Présence observée seulement ; ne constituent pas une source de livraison validée. Ne pas transférer en bloc. |
| Données du navigateur | Ne sont transportées ni par GitHub, ni par les dumps SQL. |

### Fichiers sensibles versionnés : observation sans valeurs

L’inventaire suivi ne contient pas de véritable fichier `.env` ni de clé privée au nom usuel ; seuls les modèles `.env.example` sont suivis. Une recherche heuristique de signatures de clés privées et de jetons OpenAI/GitHub dans les fichiers texte suivis de moins de 2 Mo n’a trouvé aucune correspondance. **Ce contrôle limité à l’arbre courant n’est pas une certification d’absence de secrets ni un audit de l’historique.**

Il existe néanmoins des éléments sensibles suivis :

- `prototypes/00-ic-hub/server/data/users.json` contient cinq comptes avec adresses, empreintes et sels de mots de passe ; aucune valeur reproduite ici.
- `prototypes/08-dico-seven-sieves/docker-compose.yml` contient des affectations de mots de passe de développement, dont le compte administrateur de la stack ; valeurs non reproduites.
- `prototypes/00-ic-hub/server/db/db.js` et `prototypes/08-dico-seven-sieves/Node/src/repository.js` possèdent des mots de passe de repli dans le code. Leur éventuelle utilisation réelle n’a pas été vérifiée.
- Le corpus Informaticaire `data.js` est suivi et dérivé notamment d’entretiens ; la restriction à la démonstration privée ne transforme pas ce corpus en base publique validée.

Recommandation : fournir des identifiants MariaDB propres à la VM par environnement, sans réutiliser les valeurs de développement, et ne jamais servir les fichiers techniques. Aucun nettoyage de Git ni changement de données n’a été effectué.

## 3. Les cinq outils et leurs dépendances

Les chemins de la colonne lancement sont relatifs à la racine du clone. Les commandes décrivent l’existant ; elles n’ont pas été exécutées.

| Prototype | Lancement actuel et répertoire de travail | Dépendances | Données faisant autorité | Contraintes d’hébergement |
|---|---|---|---|---|
| **IC-Hub : portail** | `npm start` → `node server.js`, dans `prototypes/00-ic-hub/server`, port 8790 | Node ; dépendances du package ; HLS UGA pour le relais utilisé par Proto05 | Portail `public/portal-0.10.4.html` ; données Hub distinctes si parcours historiques utilisés | `/` redirige vers `/portal-0.10.4.html` ; cartes vers `127.0.0.1:8791`, `3000`, `8788` ; pas de bind loopback explicite ; publier le portail et Informaticaire seulement |
| **Informaticaire** | Aucun processus supplémentaire ; servi par Hub sous `/demos/informaticaire/` | HTML/CSS/JS statiques, aucun build requis | `prototypes/07-informaticaire/data.js` ; contributions préparées et exportées dans le navigateur | Conserver le slash final pour les ressources relatives ; ne pas déployer `informaticaire-maquette-sites` |
| **Vidéos augmentées / Proto05** | `node --env-file=../.env.local server.js`, dans `prototypes/05-augmented-ic-video-01/server`, port 8791 | MariaDB ; `mysql2` et `hls.js` pris dans le `node_modules` du Hub ; Hub pour HLS historique ; FFmpeg/FFprobe pour traitements | SQL `ic_augmented_video` ; fichiers physiques dans les deux racines média | Écoute explicitement `127.0.0.1` ; API `/api/proto05/`, vues `/student/...`, `/teacher...`, ressources `/shared/`, `/vendor/` ; nombreuses URL racine |
| **Dico-IC** | `npm start` → `node server.js`, dans `prototypes/08-dico-seven-sieves/Node`, port 3000 | Express, cors, mysql2 ; MariaDB ; OpenAI seulement pour les fonctions IA d’administration | SQL `ic_dico` ; le dossier `database/current_draft` n’est pas une base d’installation canonique | Pages `/admin-app/`, API `/admin/...`, `/languages`, `/language-catalog`, etc. ; pas de bind loopback explicite ; interfaces IA avec `http://localhost:3000` |
| **Seven Sieves** | Même processus Dico, aucun serveur propre ; `/prototypes/01-seven-sieves/index-teacher-0.1.html` | API Dico `POST /analysis` pour une nouvelle préparation ; scripts et paquet de démonstration suivis | Lexique SQL Dico ; paquet préparé dans `sessionStorage` ; exploration apprenante en mémoire | Même origine et même session d’onglet entre préparation et exploration ; API enseignant codée `/analysis` ; aucune persistance multi-utilisateur |

### Lancement local, versions et Linux

Le vrai lanceur global est `START_IC_LAB_NEXT.bat` → `scripts/windows/start-all.bat` et sa chaîne PowerShell, fondée sur `scripts/windows/launcher-services.json`. Le manifeste démarre **quatre** services, dont Proto06 ; il ne faut pas le reprendre tel quel pour la cible à trois services. Le démarrage global ne pilote pas Docker. Le lanceur individuel `start-dico-seven.bat` conserve, lui, un `docker compose up -d` : il n’est pas adapté à la MariaDB native d’Alpaga et ne doit pas y être transposé.

Versions actuelles : Hub serveur/package/portail **0.10.4**, Proto05 serveur/package **0.1.63** et moteur **index-0.0.9.html**, Informaticaire **0.7.1**, Dico package générique **1.0.0** et contrat API **0.1**, pages courantes Seven Sieves **0.1**. Ces numéros ont des significations distinctes et restent inchangés.

Node présent dans le PATH local : **v22.17.0**. Hub et Proto05 déclarent `>=18`, mais le lanceur Proto05 utilise `--env-file`, introduit en Node **20.6.0**. Pour limiter les différences avec le poste, recommander la branche **Node 22 LTS avec un correctif de sécurité courant**, à valider par la recette courte sur Linux. Node 24 LTS serait aussi un candidat, mais n’a pas été testé ici. Ne pas choisir Node 18/20 pour un nouvel hébergement : ils sont désormais en fin de vie. Sources : [option --env-file](https://nodejs.org/api/cli.html#--env-fileconfig), [versions Node](https://nodejs.org/en/about/previous-releases).

Versions verrouillées dans les dépendances :

- Hub : `dotenv 17.4.2`, `hls.js 1.6.13`, `mysql2 3.22.5`, `openai 6.45.0`.
- Dico : `express 5.2.1`, `cors 2.8.6`, `mysql2 3.22.2`.
- Proto05 : aucune dépendance npm propre déclarée ; les imports de `mysql2` et le fichier `hls.js` dépendent physiquement du dossier Hub voisin. **Conserver la topologie du clone.**

`npm ci` dans les deux dossiers possédant un lockfile est la proposition d’installation future. Aucun Docker, phpMyAdmin, PHP-FPM supplémentaire, build Next ou outil de supervision npm n’est requis pour ces cinq outils. FFmpeg et FFprobe sont repérés sur Windows sous `C:\Tools\FFmpeg\bin` ; ce chemin ne doit pas être repris sur Linux. Le code contient des branches Linux et Windows, mais les traitements Linux ne sont pas validés par cette inspection.

### Configuration à préparer, sans lecture des secrets locaux

| Service | Variables et comportement établis par le code |
|---|---|
| Hub | `PORT` (8790), `PROTO05_API_ORIGIN` (`http://127.0.0.1:8791`), `IC_HUB_STORE` (`json` par défaut), `IC_HUB_DB_HOST`, `IC_HUB_DB_PORT`, `IC_HUB_DB_NAME`, `IC_HUB_DB_USER`, `IC_HUB_DB_PASSWORD`. Le chargeur lit aussi le `.env` racine ; `PORT` et `PROTO05_API_ORIGIN` sont évalués avant ce chargement, donc les injecter au lancement. |
| Proto05 | Obligatoires : `PROTO05_MARIADB_HOST`, `PROTO05_MARIADB_PORT`, `PROTO05_MARIADB_DATABASE`, `PROTO05_MARIADB_USER`, `PROTO05_MARIADB_PASSWORD`. Facultatives : `PORT`, `PROTO05_MYSQL2_DIRECTORY`, `PROTO05_FFMPEG_PATH` ou `FFMPEG_PATH`. |
| Dico | `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Le serveur SQL consomme l’environnement du processus ; il ne charge pas automatiquement un fichier de configuration SQL. Utiliser `127.0.0.1` explicitement sur Alpaga. |
| Dico IA | `OPENAI_API_KEY`, `OPENAI_MODEL`. Le chargeur IA regarde également `admin/.env`, mais privilégie l’environnement ; aucun besoin de placer ce fichier dans l’arbre servi. |

Les autres variables Proto05 règlent les délais, volumes et historiques des copies distantes, références, téléchargements, préparations et dérivations HLS (`PROTO05_REMOTE_*`, `PROTO05_LIBRARY_DOWNLOAD_*`, `PROTO05_HLS_PREPARATION_*`, `PROTO05_HLS_DERIVATION_*`). Garder les valeurs existantes au premier essai, puis ajuster uniquement un besoin constaté. **Ne pas transférer de variables `PROTO05_TEST_*`**, notamment celles qui autorisent des destinations réseau privées.

La lecture HLS historique est relayée de Proto05 vers le Hub sur loopback, puis vers une origine UGA fixe sous `videos.univ-grenoble-alpes.fr`. Ces adresses de communication entre serveurs ne sont pas des liens à remplacer par les URL publiques. Les autres vidéos peuvent dépendre de YouTube, de HLS distants ou de fichiers distants ; leurs disponibilités, restrictions réseau et droits ne sont pas revérifiés ici. OpenAI sert aux propositions IA Dico ; la consultation lexicale et l’analyse Seven Sieves ne nécessitent pas d’appel OpenAI. Informaticaire ouvre des ressources externes, mais son corpus et sa recherche sont locaux au navigateur.

## 4. Données, restauration et médias

### SQL, JSON et navigateur

**Constat actuel du contrat, pas interrogation des bases :**

- **Proto05** utilise exclusivement MariaDB, sans repli métier JSON. Son démarrage contrôle connexion, identité, grants, registre et empreinte du schéma. Le registre courant va de **001 à 007**, et non seulement 001–003 comme certains guides l’indiquent. Un simple port ouvert ou une page diagnostic ne prouve pas que les données sont accessibles.
- Le compte applicatif Proto05 doit posséder `SELECT`, `EXECUTE`, `SHOW CREATE ROUTINE`, éventuellement `SHOW VIEW`, ainsi que le seul `UPDATE` direct technique sur `data_projection_metadata`. Des privilèges globaux, sur Drupal, ou des écritures métier directes font échouer son contrôle. Ne pas utiliser le compte administrateur MariaDB ni le compte Drupal.
- **Dico-IC** utilise MariaDB via son repository. Les scripts SQL dispersés et `current_draft` ne garantissent pas la reconstruction de l’état réel ; privilégier un dump de la base effectivement utilisée. Le Compose local référence un volume externe ; le tag `mariadb:11` ne prouve pas la version du serveur installé.
- **Hub** sait fonctionner en JSON ou en MariaDB `ic_hub` et possède un repli JSON en cas d’indisponibilité SQL. Le mode réellement sélectionné localement n’a pas été lu. Ses JSON suivis restent présents ; le démarrage peut créer/initialiser des fichiers et comptes. Pour le portail seul, aucune dépendance à `ic_hub` n’est nécessaire dans le parcours visible, mais **ne pas changer silencieusement son mode de stockage pour prétendre reproduire l’état local**. Le choix de configuration de la copie VM doit être explicite.
- **Informaticaire** : `data.js` est le corpus ; les contributions ne sont pas enregistrées sur un serveur, et nécessitent l’export proposé par l’interface.
- **Seven Sieves** : `seven-sieves.activity.v0.1` contient le paquet dans `sessionStorage`. Il peut survivre au rechargement de l’onglet, mais ce n’est pas un stockage partagé ni durable ; une nouvelle session, un autre navigateur ou un autre hôte ne récupère pas l’activité. Les sélections et statuts d’exploration apprenante sont en mémoire et se réinitialisent au rechargement. Envoyer l’URL de la vue apprenante ne transmet pas le paquet préparé.

Seven Sieves possède déjà une entrée directe `index-student-0.1.html?soutenance=1`, qui charge le paquet suivi `mock/soutenance-analysis-v0.json` et remplace le paquet de session. Cette fonction appartient au prototype Seven Sieves ; elle n’exige pas de publier le **site** de soutenance. Ce paquet figé ne valide pas l’analyse de nouveaux textes ni la base distante.

### Test MariaDB communiqué : portée de la preuve

**Historique communiqué par David :** restauration 11.8.6 → 11.4.5, trois bases, 57 tables, 61 procédures, une vue, données comparées sans divergence, adaptation des propriétaires SQL Proto05 vers un compte dédié.

Les trois fichiers annoncés sont **absents du disque courant** :

- `reports/229_mariadb_1186_to_1145_restore_test_report.md` ;
- `scripts/mariadb-restore-test-1145.py` ;
- `scripts/mariadb-restore-test-1145-check.cjs`.

Ils n’ont pas été recherchés dans un autre état Git, ni recréés, ni exécutés. Les trois noms plausibles d’après le code sont `ic_dico`, `ic_augmented_video`, `ic_hub`, mais cette correspondance avec la campagne historique reste à confirmer.

Ce test est encourageant mais insuffisant pour certifier le dump à livrer : manquent le SHA testé, les noms exacts des schémas, la date et les empreintes des dumps, le détail des comptes/DEFINER/grants et la preuve du registre Proto05 001–007. Le normaliseur courant retire le préfixe `CREATE DEFINER` pour comparer les routines ; cela rend une adaptation ciblée des propriétaires cohérente avec le code, sans garantir que les droits et l’exécution seront corrects.

**Pas de nouvelle campagne demandée.** Récupérer seulement la synthèse non secrète de cette preuve si disponible. Lors de la livraison future, vérifier que les dumps retenus correspondent à l’état courant et que la santé applicative Proto05 confirme son contrat après restauration. Ne pas réimporter des scripts de brouillon, ne pas lancer de migration pour contourner un diagnostic, ne pas exporter/restaurer les bases système `mysql`, `sys` ou `drupal`. Les modifications de DEFINER se limitent aux objets IC et nécessitent une copie originale du dump préservée et une adaptation documentée.

### Médias actuellement présents

| Répertoire sous `prototypes/05-augmented-ic-video-01/data/` | Fichiers | Taille observée |
|---|---:|---:|
| `video-library-media/` | 15 MP4 | 28 309 456 octets |
| `video-library-workspaces/` | 5 MP4 | 460 248 938 octets |
| **Total** | **20 MP4** | **488 558 394 octets, environ 466 Mio** |

Inventaire de noms, extensions et tailles seulement ; aucune vidéo lue, hachée, convertie ou déplacée. Aucun média audio/vidéo principal suivi identifié dans le périmètre des prototypes demandés. Les images et ressources d’interface suivies restent livrées avec le code.

Le code résout des `storageKey` relatifs, avec un `storageScope` distinguant les deux racines, et sert les médias par `/api/proto05/library/media/...`. **Copier les deux arbres avec leurs sous-dossiers et leur casse exacte**, sans renommer ni fusionner. Le code calcule actuellement ces racines depuis le répertoire du prototype ; ce ne sont pas des variables de chemin configurables. Placer le clone hors de tout DocumentRoot, puis conserver ces emplacements est le choix le plus simple pour une première livraison. Sauvegarder SQL et médias ensemble avant toute actualisation.

L’existence de vingt fichiers ne prouve pas que toutes les références SQL ont un fichier, ni que chaque fichier est référencé. Sans lecture de la base, la concordance, les chemins Windows éventuellement conservés dans des métadonnées techniques, les empreintes et les références distantes restent inconnus. Une comparaison ciblée des références du dump avec les deux arbres sera nécessaire avant de déclarer la copie complète. Aucun recalcul ni réconciliation mutatrice n’a été lancé.

Les préparations temporaires et processus FFmpeg en cours ne constituent pas un état transférable. Les opérations terminées et leurs médias persistants doivent être copiés ; prévoir une fenêtre sans édition ni traitement lors de la livraison future.

## 5. Organisation proposée sur Alpaga et protection de Drupal

### État de la VM : historique uniquement

Aucun accès SSH, aucune connexion improvisée à Alpaga, aucun démarrage ou arrêt distant n’a été effectué. Les faits suivants proviennent de la mission : VMware x86_64 ; Ubuntu 24.10 et noyau 6.11.0-8 ; 2 CPU, 3,3 Gio RAM et 3,8 Gio swap ; racine 48 Go dont environ 38 disponibles ; `/data` XFS 49 Go dont environ 48 disponibles ; `/var/www` → `/data/www` ; compte `david` dans `sudo` et `www-data`.

Apache2, PHP-FPM 8.3 et MariaDB 11.4.5 sont annoncés comme services ; Node/npm non repérés, Docker absent. MariaDB est annoncé sur `127.0.0.1:3306`, datadir `/var/lib/mysql`, charset `utf8mb4`, collation `utf8mb4_uca1400_ai_ci`. Aucun de ces éléments n’a été revérifié en exécution.

Drupal DIPROLANG : fichiers `/data/www/drupal`, DocumentRoot `/var/www/drupal/web`, base `drupal` d’environ 167 tables et 352 Mio. Le fichier `/etc/apache2/sites-enabled/alpaga.conf` porte les VirtualHosts 80/443, `ServerName alpaga.univ-grenoble-alpes.fr`, alias `alpaga.u-ga.fr`, `alpaga`, `diprolang.univ-grenoble-alpes.fr`. HTTP redirige vers HTTPS ; HTTPS sur `alpaga.u-ga.fr` redirige vers le nom canonique. Le Directory Drupal accepte `AllowOverride All` et `Require all granted`. Son `.htaccess` demeure une inconnue.

Modules annoncés : proxy, proxy_http, proxy_fcgi, proxy_wstunnel, rewrite, ssl, alias. Les modules d’authentification doivent être confirmés. Le certificat `/etc/ssl/sites/certs/alpaga.pem` couvre les trois noms DNS complets, avec une validité communiquée du 23 juillet 2026 au 7 février 2027 ; le nom court `alpaga` n’est pas annoncé dans ses SAN. Aucune clé privée n’a été lue.

**Ubuntu 24.10 est arrivé en fin de support le 10 juillet 2025.** Le signaler au responsable de la VM avant ouverture de la démonstration ; un mot de passe Apache ne corrige pas l’obsolescence du système. La décision de maintien ou de mise à niveau appartient au responsable, hors de cette mission. [Annonce officielle Ubuntu](https://lists.ubuntu.com/archives/ubuntu-announce/2025-July/000314.html).

### Emplacements et routes recommandés

- Code : `/data/ic-lab-next/app`, clone avec sa topologie actuelle, **hors** de `/data/www/drupal` et de tout DocumentRoot/Alias statique.
- Configurations privées : `/etc/ic-lab-next/`, trois fichiers séparés ; fichier de mot de passe Apache également hors des répertoires servis. L’environnement est injecté au processus, sans `.env` dans les arbres publics.
- Sauvegardes IC : `/data/ic-lab-next/backups/`, non servi. Aucun changement du datadir MariaDB ni des fichiers Drupal.
- Exécution : compte système dédié à IC, sans droit d’écriture sur Drupal. Écriture uniquement là où le fonctionnement l’exige : JSON runtime Hub, deux racines média Proto05 et temporaires. Ne pas donner de droits récursifs globaux à `/data/www`.

| URL publique proposée | Destination interne, préfixe retiré par Apache |
|---|---|
| `/ic/` | Redirection vers `/ic/hub/` |
| `/ic/hub/` | Hub `http://127.0.0.1:8790/`, avec surface publique filtrée |
| `/ic/hub/demos/informaticaire/` | Montage Informaticaire existant du Hub |
| `/ic/video/` | Proto05 `http://127.0.0.1:8791/` |
| `/ic/dico/admin-app/index-admin-0.1.html` | Dico `http://127.0.0.1:3000/admin-app/index-admin-0.1.html` |
| `/ic/dico/prototypes/01-seven-sieves/index-teacher-0.1.html` | Seven Sieves sur ce même Dico |

La suppression des préfixes entrants par Apache conserve les routes internes existantes. Elle **ne corrige pas** les URL émises dans HTML, JS, JSON ou manifestes HLS, les redirections racine et les interprétations de `location.pathname`. `ProxyPassReverse` traite des en-têtes de redirection, pas les liens dans les corps de pages : [documentation Apache](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html#proxypassreverse).

**Alternative DNS soumise à David :** réserver `alpaga.u-ga.fr` à IC au lieu de sa redirection vers Drupal. À la rédaction, cet arbitrage n’a pas été reçu ; la proposition principale conserve donc tous les alias Drupal. Une attribution dédiée pourrait éviter de préfixer les nombreuses routes Proto05 en lui réservant la racine de cet hôte et en routant explicitement les surfaces Hub/Dico. Il faudrait encore corriger les liens localhost et vérifier les collisions d’URL. Ce serait une modification d’usage d’un alias existant, jamais une opération à faire implicitement. Affecter les trois noms à trois applications déplacerait les accès Drupal : option écartée. De nouveaux sous-domaines exigeraient DNS et certificat supplémentaires : ils ne sont pas nécessaires à la proposition principale.

### Apache : protection commune, publication limitée

Recommander des directives ciblées dans le VirtualHost HTTPS, éventuellement via un fichier inclus dédié à IC. **Pas de `.htaccess` Drupal modifié, pas de protection de tout le domaine, pas d’hypothèse qu’un `.htaccess` local protège les requêtes proxifiées.** La protection d’un espace URL proxifié doit être posée sur cet espace URL. Sources : [sections Location](https://httpd.apache.org/docs/2.4/mod/core.html#location), [authentification Apache](https://httpd.apache.org/docs/2.4/howto/auth.html).

Principe d’authentification, à intégrer après inspection de la configuration complète, et non configuration prête à activer :

```apache
<LocationMatch "^/ic(?:/|$)">
    AuthType Basic
    AuthName "Demonstration IC"
    AuthBasicProvider file
    AuthUserFile /etc/ic-lab-next/demo.htpasswd
    Require valid-user
</LocationMatch>
```

La protection doit couvrir toutes les méthodes, pages, API, fichiers média, segments/manifeste HLS et futurs éventuels upgrades WebSocket. Aucun besoin WebSocket ou SSE n’a été identifié dans les entrées et serveurs inspectés : ne pas ajouter un service ou une règle d’upgrade générique sans besoin. Les appels HTTP internes entre Node restent sur loopback, sans repasser par le mot de passe public. Ne pas transmettre les identifiants Apache à des fournisseurs externes.

Le mot de passe commun permet aux personnes admises d’utiliser les **écritures déjà présentes** dans Proto05 et Dico. Il ne crée pas de rôles ni de lecture seule. Démontrer sur des copies VM sauvegardées, sans promettre de séparation enseignant/apprenant.

**Filtrage indispensable même après authentification :** `serveStatic` Proto05 accepte tout fichier situé sous sa racine sans liste d’extensions limitée ; le montage historique Hub `/demos/augmented-video/` a aussi une surface large. Un clone entier proxifié sans restriction pourrait donc exposer code, SQL, notes ou configurations locales. Dico refuse les dotfiles, mais son montage statique de l’administration n’est pas une sélection de fichiers publiables.

Préparer des règles Apache qui n’autorisent que les pages/assets réellement utilisés, les API applicatives nécessaires et les routes média contrôlées. Refuser les chemins techniques (`server`, `database`, backups, dotfiles, notes privées), les accès directs au répertoire `data` et le vieux montage statique vidéo du Hub ; conserver l’accès média par l’API prévue. Pour Informaticaire, publier `index.html`, `styles.css`, `script.js`, `data.js` et les ressources référencées, sans servir entretiens, rapports ou maquette. Pour Hub, ne publier que portail/CSS et ce montage Informaticaire ; bloquer les routes comptes/cours/admin et autres démos. Pour Dico, limiter `/prototypes/` à Seven Sieves et sélectionner les ressources de l’administration.

Les exclusions de proxy seules ne sont pas un refus d’accès : elles pourraient renvoyer vers Drupal. Les chemins IC refusés doivent répondre explicitement 403/404 et ne jamais devenir une page Drupal. Vérifier la combinaison effective des sections `Location`, des règles d’autorisation et des redirections : une règle plus spécifique ne doit pas ouvrir une exception à l’authentification. Garder `ProxyRequests Off`. Ne pas intercepter `/api`, `/admin` ou `/teacher` à la racine du domaine Drupal pour compenser les liens IC non adaptés.

Hub et Dico appellent actuellement `listen(port)` sans hôte : une variable `HOST` seule ne les restreindrait pas. Recommander le petit réglage de bind explicite `127.0.0.1` dans ces deux points d’entrée, à proposer dans la mission d’adaptation, avec contrôle du pare-feu comme seconde barrière. Proto05 est déjà lié à loopback. Aucune ouverture publique de 3000, 8790, 8791, 3306 ou 8080.

### Lancement et redémarrage

Trois unités systemd simples, une par `server.js`, sont suffisantes : répertoires de travail exacts du tableau, chemin absolu du Node retenu, environnement privé propre à chaque service, redémarrage sur échec et journaux identifiables. Exécuter `node server.js` reprend le mécanisme existant ; pour Proto05, l’environnement injecté remplace le chemin Windows relatif `--env-file=../.env.local`. Ne pas créer un nouveau lanceur applicatif, ajouter PM2 ou porter la stack Docker.

Ordre de recette recommandé : vérifier MariaDB existante, démarrer Hub, Proto05 puis Dico, contrôler leur état réel, puis seulement ouvrir les routes Apache. Au redémarrage machine, vérifier les trois services et la santé SQL ; l’ordre de lancement ne suffit pas à garantir la disponibilité. **Arrêter/redémarrer uniquement les trois unités IC**, jamais MariaDB, PHP-FPM ou Drupal pour mettre à jour un prototype. Aucun service n’a été créé ou lancé ici.

## 6. Les seules adaptations à proposer

| Adaptation indispensable | Preuve actuelle et limite |
|---|---|
| Configurations privées de service et comptes MariaDB propres à IC | Variables déjà consommées par les serveurs ; aucun nouveau modèle utilisateur. Confirmer le mode Hub retenu. |
| Bind loopback Hub/Dico et règles Apache ciblées | Les deux `listen` ne fixent pas d’interface ; Apache doit authentifier et filtrer l’espace IC. |
| Liens du portail déployé | `portal-0.10.4.html` pointe vers les ports locaux et affiche Agent vocal/Mon espace local. Adapter ses destinations à la publication et retirer ces accès hors périmètre de la surface publiée. Aucun redesign. |
| Bases publiques d’URL pour le préfixe `/ic/...` | Aucun réglage général de base URL déjà disponible. Il faut des modifications ciblées de code/configuration d’interface ; ce n’est pas une promesse de livraison par `.env` seulement. |
| Proto05 : préfixe côté navigateur et URL produites | `index-0.0.9.html`, pages `teacher*.html`, `shared/teacher-shell.js`, lecteur partagé et réponses serveur utilisent `/api`, `/shared`, `/vendor`, `/teacher`, `/student`. Adapter aussi la détection des vues et les liens média/HLS produits, sans modifier les clés SQL ou les contenus pédagogiques. |
| Dico/Seven : base API | `admin-0.1.js` et les fiches prennent `window.location.origin`, qui ne contient pas `/ic/dico` ; les trois interfaces IA utilisent `http://localhost:3000`. Le JS enseignant Seven appelle `/analysis`. Garder les navigations relatives entre pages du même outil. |
| Redirections Hub et retour depuis Proto05 | Hub émet des redirections racine et `http://127.0.0.1:8791/` ; `teacher-shell.js` contient un retour `127.0.0.1:8790`. Les communications internes loopback, elles, restent locales. |
| Dépendances Linux et chemins FFmpeg | Installer les dépendances verrouillées ; configurer un chemin Linux ou le PATH seulement si les traitements font partie de la démonstration. |

Si « uniquement de la configuration » exclut toute adaptation de constantes et de chemins dans le code, **l’option `/ic/` est bloquée en l’état** : il faut arbitrer les URL/hôtes avant une mission d’exécution. Ce rapport expose ce coût au lieu de proposer une réécriture automatique du HTML/JS par Apache, fragile pour les JSON, le HLS et les chemins de navigation.

Le conflit `Authorization: Basic` / `Authorization: Bearer` des anciens parcours Hub est établi dans le code (`public/hub-0.9.6.js`, `server.js`). La décision « portail seulement » permet de ne pas publier ces parcours ; aucune modification d’authentification applicative n’est requise. Ne pas créer une exemption publique sur leurs API.

## 7. Observations minimales à demander sur Alpaga

Ces commandes sont proposées à David, **non exécutées dans cette mission**. Elles lisent l’état/configuration ; elles n’installent rien, ne démarrent aucun service, ne lancent aucun SQL et n’affichent ni `.env`, ni clé privée, ni fichier de mots de passe. Si une commande n’est pas disponible, noter simplement son absence.

```bash
cat /etc/os-release
uname -m
command -v node npm ffmpeg ffprobe
node --version
apache2 -v
sudo apache2ctl -S
sudo apache2ctl -M
sudo apache2ctl -t -D DUMP_INCLUDES
systemctl is-active apache2 mariadb php8.3-fpm
sudo ss -ltnp
readlink -f /var/www
namei -l /data /data/www /data/www/drupal/web
df -h / /data
free -h
getent ahosts alpaga.univ-grenoble-alpes.fr alpaga.u-ga.fr
openssl x509 -in /etc/ssl/sites/certs/alpaga.pem -noout -dates -ext subjectAltName
```

Puis inspecter localement `/etc/apache2/sites-enabled/alpaga.conf`, les fichiers inclus effectivement applicables et `/var/www/drupal/web/.htaccess`, **sans ouvrir la clé privée, les `.env` ou `settings.php` Drupal**. Transmettre seulement les blocs utiles : ServerName/Alias, DocumentRoot, Directory, Location, Alias, ProxyPass, Rewrite/Redirect, règles d’accès et ErrorDocument ; masquer toute valeur privée éventuellement présente. Le `.htaccess` doit être lu, pas modifié. Confirmer l’absence d’usage de `/ic` et de règle qui le réécrit vers Drupal.

Il reste aussi à confirmer, sans secret : le mode Hub effectivement souhaité sur la VM, les noms des schémas et la traçabilité du test de restauration, la liste des médias référencés par la copie SQL, la présence de FFmpeg si ses ateliers doivent être essayés, les règles de filtrage réseau et les destinations vidéo/IA joignables. Aucune valeur de mot de passe ni clé API n’est nécessaire au rapport.

## 8. Procédure courte de livraison future

**Toutes les étapes ci-dessous sont à réaliser dans une mission ultérieure autorisée. Aucune n’a été appliquée ici.**

1. **Arrêter les choix.** Confirmer URL et préfixes, surface « portail seul », mode de stockage Hub, fichiers média et dumps retenus. Faire valider au responsable de la VM le point Ubuntu obsolète et les règles Apache après les observations ci-dessus. Si les adaptations de code nécessaires ne sont pas acceptées, ne pas avancer vers l’ouverture publique.
2. **Préserver Drupal.** Avec son responsable, identifier une sauvegarde restaurable de la base `drupal` et des fichiers/configurations Drupal/Apache concernés, relever propriétaires/permissions, hôtes et redirections de référence. Conserver une copie exacte de la configuration Apache avant ajout IC. Documenter emplacement, date et personne capable de restaurer ; ne pas sauvegarder ou transmettre la clé privée dans le paquet IC. Toute sauvegarde/restauration SQL reste soumise à l’autorisation humaine préalable prévue par AGENTS.md.
3. **Préparer le code à livrer.** Dans la mission d’adaptation, partir du SHA observé, appliquer uniquement les réglages nécessaires et les vérifier. David pourra ensuite autoriser commit/push. Sur Alpaga, cloner dans `/data/ic-lab-next/app`, choisir explicitement le SHA validé et vérifier `git rev-parse HEAD`. Installer les dépendances des deux lockfiles et le runtime retenu. Ne jamais cloner dans le DocumentRoot Drupal ni copier tout le workspace Windows.
4. **Livrer les données séparément.** Durant une fenêtre sans édition ni traitement, produire des dumps logiques des seuls schémas IC nécessaires, avec routines et objets associés, et inventaire/empreintes de transfert. Ne pas transférer les utilisateurs système MariaDB ni restaurer `--all-databases`. Restaurer dans des schémas IC distincts de Drupal, seulement après validation des sauvegardes, de l’impact et du retour arrière. Conserver les noms attendus ou les fournir via les variables existantes ; vérifier les DEFINER et les grants dédiés Proto05. Ne pas exécuter les scripts de migration/seed pour « compléter » au hasard.
5. **Copier les médias et configurations privées.** Copier les deux arbres média en conservant structure et casse ; comparer tailles/empreintes du transfert et références de la copie SQL. Injecter les secrets propres à la VM hors de tout chemin servi. Ne pas copier les sessions, corruptions, temporaires, logs, anciennes sauvegardes ni le site de soutenance. Le clone peut contenir les autres sources suivies : elles doivent rester inaccessibles par HTTP.
6. **Démarrer les trois processus internes.** Installer les trois unités simples et contrôler Hub, Proto05 et Dico sur loopback. Pour Proto05, vérifier que `/api/health` annonce réellement MariaDB disponible, puis lire une activité et une vidéo ; pour Dico, une page statique seule est insuffisante, lire aussi `/languages`. En cas d’écart SQL, conserver le diagnostic et interrompre l’ouverture, sans migration corrective improvisée.
7. **Ouvrir Apache puis faire la recette.** Ajouter seulement la configuration IC et le mot de passe partagé, vérifier la syntaxe avant un rechargement maîtrisé d’Apache, puis effectuer les contrôles ci-dessous. Conserver les redirections et le DocumentRoot Drupal. Ne transmettre l’accès à Katia et Christian qu’après la recette et la validation humaine de David ; aucun envoi de message n’est réalisé par cette mission.

### Retour arrière

- Échec avant Apache : garder l’IC non publié, arrêter seulement ses unités si elles ont été démarrées ; Drupal n’a pas besoin de restauration.
- Échec après ajout Apache : rétablir la configuration Apache sauvegardée, contrôler sa syntaxe et recharger ; vérifier Drupal sur les noms de référence. Garder les bases et fichiers IC pour diagnostic, sans suppression précipitée.
- Retour à un code IC précédent : utiliser le SHA validé précédent seulement s’il reste compatible avec les données ; sinon restaurer ensemble la copie SQL IC et ses médias sauvegardés, après autorisation. Ne jamais restaurer Drupal pour annuler une simple erreur IC.
- Aucun arrêt global de MariaDB, aucun changement de `/var/lib/mysql`, aucun `DROP` générique, aucune suppression de volume ni de dossier partagé. Une anomalie concernant Drupal impose d’arrêter l’opération IC et de prévenir son responsable.

## 9. Recette manuelle courte et limites assumées

Recette future sur un navigateur Chromium récent, fenêtre représentative **1366 × 768**, puis un rechargement d’URL profonde. Consigner les observations et quelques captures utiles ; aucune recette visuelle n’a été réalisée aujourd’hui puisqu’aucune interface n’a été modifiée et aucun serveur ne devait être lancé.

1. **Drupal avant/après** : page d’accueil et chemin profond connu, HTTPS et redirections des alias inchangés, absence de demande du mot de passe IC sur Drupal.
2. **Protection** : dans une session sans identifiants, portail, URL profonde, API Dico/Proto05, MP4 et manifeste/segment HLS sont refusés ou demandent l’authentification, sans contenu métier. Mauvais mot de passe refusé ; bon mot de passe donne accès. Les chemins techniques restent 403/404 même authentifié. Aucun port Node/MariaDB accessible depuis l’extérieur ; ne pas se contenter du contrôle loopback.
3. **Navigation** : les cinq destinations s’ouvrent depuis le portail ; aucune navigation vers localhost, aucun contenu mixte HTTP sous HTTPS, aucune fuite hors `/ic` vers une route Drupal, aucun lien vers comptes Hub/Agent vocal/soutenance. Contrôler visuellement menus et vues professeur/élève Proto05, car la détection du chemin fait partie des adaptations.
4. **Informaticaire** : recherche, fiche et carte relationnelle ; export local d’un fichier. **Dico** : langues, fiche lexicale et relations. **Seven Sieves** : analyser un court texte non privé, ouvrir l’exploration dans le même onglet, vérifier les tamis ; constater les limites après rechargement/nouvelle session. L’entrée figée `?soutenance=1` ne remplace pas le test d’une nouvelle analyse.
5. **Proto05** : bibliothèque, activité, vidéo locale avec déplacement temporel, transcription/annotations, prévisualisation et une source HLS réellement utilisée. Vérifier les réponses partielles nécessaires au déplacement dans un MP4 et les segments HLS authentifiés. Pas d’import ou suppression sur les références originales pour cette première recette.
6. **Fonctions conditionnelles et reprise** : si retenus, essai IA Dico sur texte non privé et traitement FFmpeg sur une copie explicitement réversible, avec accord sur coût et modifications de la copie VM. Sinon les noter non vérifiés. Redémarrer uniquement les trois unités IC, puis refaire leurs contrôles de santé et une lecture ; constater que Drupal reste disponible. La reprise après redémarrage complet de VM exige un créneau validé par son responsable.

Le compte Apache commun donne un accès commun aux fonctions d’édition actuelles ; il ne garantit ni attribution des modifications, ni isolation pédagogique. La VM héberge une **copie de démonstration**, sans synchronisation automatique avec le poste de David. Seven Sieves et Informaticaire gardent leurs limites de stockage navigateur. Les services vidéo distants et OpenAI peuvent être indisponibles ; les appels IA restent dépendants d’une configuration privée et de leur coût. Les 2 CPU et 3,3 Gio annoncés ne constituent pas une preuve de capacité : éviter plusieurs conversions vidéo simultanées pendant une démonstration et observer l’effet sur Drupal. Aucune garantie de charge, de haute disponibilité ou d’exploitation pédagogique n’est donnée.

## 10. Contrôles effectués et restitution

**Effectués :** lecture d’AGENTS.md et de la documentation pertinente ; contrôle Git initial, référence distante, contrôle avant écriture et contrôle final après création du rapport ; analyse statique des serveurs, manifeste de lancement, interfaces courantes, dépendances verrouillées et contrats de stockage ; inventaire des fichiers ignorés et médias par métadonnées ; recherche de signatures sensibles sans affichage des valeurs ; vérification de présence des trois pièces de restauration ; consultation de documentations officielles Apache/Node/Ubuntu. Tous les liens locaux du rapport ont été vérifiés, sans cible manquante. Les erreurs ponctuelles de recherche de chemins et de lecture structurée ont été corrigées par des lectures adaptées, sans effet sur les fichiers.

**Non effectués :** tests automatisés, requêtes aux applications, lecture SQL, dump, restauration, migration, nouvelle campagne MariaDB, validation HTTP/serveur, recette interactive/visuelle, connexion VM, contrôle de pare-feu réel, installation, comparaison d’empreintes média, validation fonctionnelle humaine de cette livraison. Aucun processus applicatif ou conteneur n’a été démarré ou arrêté ; aucun ne reste à arrêter du fait de cette mission. Les suites de tests, launchers et commandes mutatrices ont volontairement été écartés conformément à la demande.

**Fichier créé :** `docs/229_2026-09-09_etat_des_lieux_hebergement_alpaga.md`, seul changement autorisé. **Fonctionnalité réalisée :** état des lieux et procédure proposée ; aucune fonctionnalité applicative développée. **Versions : inchangées.** Aucun commit ni push.

**Suites possibles :** fournir les observations VM, arrêter l’organisation d’URL et la configuration Hub, puis confier une mission séparée d’adaptations minimales et de préparation vérifiée. Ce rapport ne vaut ni autorisation de migration/restauration, ni validation humaine de mise en ligne.

Message de commit proposé, sans exécution :

```text
docs(hebergement): préparer la démonstration IC sur Alpaga
```

### Principales pièces du dépôt utilisées

- [Architecture](ARCHITECTURE.md), [provenance](WORKSPACE_PROVENANCE.md), [lancement](../PROJECTS_LAUNCH.md), [statut](../STATUS.md), [guide Windows](../scripts/windows/README.md), [manifeste de lancement](../scripts/windows/launcher-services.json).
- [Serveur Hub](../prototypes/00-ic-hub/server/server.js), [README Hub](../prototypes/00-ic-hub/server/README.md), [portail courant](../prototypes/00-ic-hub/public/portal-0.10.4.html), [stockage Hub](../prototypes/00-ic-hub/server/db/README.md).
- [Serveur Proto05](../prototypes/05-augmented-ic-video-01/server/server.js), [README serveur](../prototypes/05-augmented-ic-video-01/server/README.md), [configuration SQL](../prototypes/05-augmented-ic-video-01/server/proto05-data-mode.js), [grants](../prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js), [registre 001–007](../prototypes/05-augmented-ic-video-01/database/schema-migrations/manifest.json), [navigation enseignant](../prototypes/05-augmented-ic-video-01/shared/teacher-shell.js).
- [Informaticaire](../prototypes/07-informaticaire/README.md), [Dico démarrage](../prototypes/08-dico-seven-sieves/docs/dico-local-development-startup.md), [serveur Dico](../prototypes/08-dico-seven-sieves/Node/server.js), [repository SQL](../prototypes/08-dico-seven-sieves/Node/src/repository.js), [contrat de session Seven Sieves](../prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js).

Les mentions documentaires de Proto05 JSON, des anciennes versions du portail/Informaticaire, de l’absence de STOP global, du registre limité à 001–003 et des anciens parcours Seven Sieves ne sont pas retenues comme état actuel. Les éléments de code cités priment ; ces documents historiques n’ont pas été modifiés.
