# 236 — Remettre tout IC-Lab-Next en service sur CODEX_VM

## Devant Zenith Ice · liste de collecte

**Commencer par retrouver l’instance MariaDB utilisée, les deux dossiers vidéo et le mode de stockage du Hub.** Lors de la future collecte, prendre la base et les fichiers au même point dans le temps. La base décrit les vidéos et leurs usages pédagogiques. Le contenu des fichiers vidéo réside sur disque.

Dans ce rapport, **racine ZI** désigne le clone qui sert réellement les applications. Le dernier chemin documenté est `J:\2026\UGA\M2\Stage-Memoire\Applications\IC-Lab-Next`, à vérifier sur place. **Racine VM** désigne `C:\Users\codex\Documents\Projets\IC-Lab-Next`. Sauf indication contraire, conserver le même chemin relatif sous la racine VM. Les commandes de repérage figurent immédiatement après ce tableau.

| À cocher sur ZI | Quoi retrouver et à quel titre | Destination sur la VM et preuve de reprise |
|---|---|---|
| ☐ **Docker et MariaDB** | Indispensable. Relever contexte Docker, projet et fichiers Compose actifs, conteneurs, image/version exacte, port hôte, montages, volume et moteur SQL. Identifier les schémas réellement présents sur chaque instance. | Docker/MariaDB de la VM. Reproduire le montage validé et vérifier l’identité SQL. Les dumps et inventaires restent dans un dossier privé hors Git. [Compose suivi](../prototypes/08-dico-seven-sieves/docker-compose.yml) |
| ☐ **Vidéo augmentée · base** | Indispensable. Prévoir l’export complet de `ic_augmented_video` avec activités, transcriptions, bibliothèque, liens vers les médias, traitements, plans audio, routines et registre `schema_migrations`. Relever séparément propriétaires SQL et droits du compte applicatif. | Schéma Proto05 sur l’instance cible. Comparer registre 001–007, sommes de contrôle, objets et effectifs, puis ouvrir une activité et sa vidéo. [Contrat du schéma](../prototypes/05-augmented-ic-video-01/database/schema-migrations/manifest.json) |
| ☐ **Vidéo augmentée · fichiers** | Indispensable pour les ressources locales. Sous `prototypes/05-augmented-ic-video-01/data/`, inventorier **video-library-media/** et **video-library-workspaces/** avec chemins relatifs, tailles et SHA-256. Inclure les copies et sorties conservées. Relever à part les originaux externes ou hors clone nécessaires. | Les deux mêmes arbres sous Proto05. Comparer le manifeste de fichiers puis résoudre chaque référence SQL sur la VM. [Résolution et contrôles](../prototypes/05-augmented-ic-video-01/server/local-media-availability-reconciliation.js) |
| ☐ **Dico-IC** | Indispensable. Base `ic_dico` (ou valeur effective de `DB_NAME`), formes, relations, aides, objets pédagogiques et procédures. Identifier le conteneur par ses montages. Le nom déclaré du volume externe est `ic_lab_next_mariadb_data`. | Instance utilisée par le serveur Dico. Vérifier `/languages`, puis rechercher **information** et ouvrir **INFORMATION_DATA**. Le dossier `database/current_draft/` et les jeux d’essai ne reconstituent pas le lexique vivant. [Accès SQL Dico](../prototypes/08-dico-seven-sieves/Node/src/repository.js) |
| ☐ **Hub · utilisateurs, cours et activités** | Indispensable pour retrouver l’état de ZI. Déterminer `requestedStore` et `store`. Si SQL est utilisé, inclure le schéma Hub (défaut `ic_hub`). Si JSON est utilisé, récupérer les écarts ZI sous `prototypes/00-ic-hub/server/data/`. Si un repli a pu se produire, préserver les deux sources avant d’arbitrer. | Même mode et mêmes identifiants de comptes, cours, inscriptions, affectations, propriétaires et espaces. Vérifier les données métier avec un compte autorisé, y compris une affectation vocale. [Serveur Hub](../prototypes/00-ic-hub/server/server.js) · [adaptateur SQL](../prototypes/00-ic-hub/server/stores/mariadbStore.js) |
| ☐ **Hub · IA, manifestes et historique** | Comparer les 13 JSON suivis avec Git. Les fournisseurs, modèles et configurations suivent le stockage du Hub. **Même en SQL**, `ai-model-metadata.json` et `proto06-manifests.json` sont lus localement. Conserver les écarts et, si l’historique compte, `runs.json` en mode JSON ou les runs/événements en SQL. Les sessions et jetons du navigateur sont renouvelables. | Même `server/data/` pour les fichiers retenus. Vérifier le catalogue IA avec un administrateur, les manifestes publiés et l’historique attendu. Garder les anciens jetons et les sauvegardes privées hors du dépôt. [Administration IA](../prototypes/00-ic-hub/docs/ai-admin-maintainer-guide.md) |
| ☐ **Agent vocal** | Le catalogue embarqué et `prototypes/06-voice-agent-ic/server/data/activities.json` sont suivis. Comparer la version vivante de ce JSON sur ZI. Dans le profil et l’origine utilisés sur ZI, identifier les créations exclusivement locales (`proto06CustomActivities`). **Exporter** place le JSON de l’activité dans la zone d’export de la bibliothèque. Conserver séparément les activités souhaitées. | JSON serveur au même emplacement. Les exports individuels restent privés pour une reprise via la bibliothèque. Vérifier une activité serveur, une création locale si retenue et une activité lancée depuis le Hub. [Serveur](../prototypes/06-voice-agent-ic/server/server.js) · [bibliothèque](../prototypes/06-voice-agent-ic/library-1.1.js) |
| ☐ **Informaticaire** | Le démonstrateur statique et `prototypes/07-informaticaire/data.js` sont suivis. Vérifier les différences ZI. Les contributions et exports téléchargés sont facultatifs et se retrouvent via l’historique des téléchargements du navigateur. Les entretiens privés sont hors collecte. | Le Hub sert le dossier du prototype. Rechercher **Miriadi**, ouvrir sa fiche et suivre **Lectŭrĭo+**. [Interface et exports](../prototypes/07-informaticaire/script.js) |
| ☐ **Seven Sieves et ressources partagées** | Le parcours enseignant utilise l’API Dico. La soutenance utilise `mock/soutenance-analysis-v0.json` suivi. Aucun volume Seven distinct identifié. Une préparation propre à un onglet vit dans `sessionStorage` (`seven-sieves.activity.v0.1`). Relever le texte et les paramètres si elle doit être recréée. Le référentiel `shared/reference-data/languages.json` vient de Git. Proto05 relit ses langues dans la table SQL `languages`. | Garder les dossiers et les identifiants du clone. Tester une nouvelle analyse puis la soutenance dans un autre onglet vierge. [Session Seven](../prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js) · [architecture](../docs/ARCHITECTURE.md) |
| ☐ **Configurations et outils** | Repérer la présence de `.env` racine (Hub), `prototypes/05-augmented-ic-video-01/.env.local` (obligatoire) et `prototypes/08-dico-seven-sieves/admin/.env` (IA Dico si utilisée). Identifier versions de Node/npm, Docker, FFmpeg/FFprobe et l’origine des paramètres du service Dico. | Reconfigurer en privé pour la VM. Réinstaller les deux ensembles npm verrouillés, au Hub et à Dico. FFmpeg/FFprobe sont requis pour les traitements et l’analyse média. Vérifier versions, connexion par service et état IA. Aucune valeur secrète à mettre dans le rapport. |

## Repérage sur ZI · lecture seule

**1. Trouver le clone et ses écarts.** Dans PowerShell, essayer le chemin historique. À défaut, rechercher le lanceur sous un dossier de projets choisi, puis vérifier le dépôt et son SHA. Si plusieurs copies existent, le projet Compose et le chemin des médias actifs permettent de les départager.

```powershell
$zi = 'J:\2026\UGA\M2\Stage-Memoire\Applications\IC-Lab-Next'
if (-not (Test-Path -LiteralPath ([IO.Path]::Combine($zi,'START_IC_LAB_NEXT.bat')))) {
    $zone = Read-Host 'Dossier de projets à explorer'
    Get-ChildItem -LiteralPath $zone -Filter START_IC_LAB_NEXT.bat -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty DirectoryName
    $zi = Read-Host 'Racine IC-Lab-Next retenue'
}
git -C $zi rev-parse --show-toplevel HEAD
git --no-optional-locks -C $zi status --short --untracked-files=normal
git -C $zi diff HEAD --name-status -- prototypes/00-ic-hub/server/data prototypes/06-voice-agent-ic/server/data prototypes/07-informaticaire/data.js shared/reference-data
'.env','prototypes/05-augmented-ic-video-01/.env.local','prototypes/08-dico-seven-sieves/admin/.env' |
    ForEach-Object { [pscustomobject]@{ Fichier = $_; Present = Test-Path -LiteralPath (Join-Path $zi $_) } }
Get-Command node,npm.cmd,docker,ffmpeg,ffprobe -ErrorAction SilentlyContinue | Select-Object Name,Source
```

Le diagnostic de septembre situait FFmpeg sous `C:\Tools\FFmpeg\bin`. Si `Get-Command` ne le trouve pas, vérifier ce dossier par `Get-ChildItem -LiteralPath 'C:\Tools\FFmpeg\bin' -Filter 'ff*.exe'`. Si le chemin configuré est différent, le relever dans l’interface de diagnostic vidéo de ZI. Pour les anciens exports utilisateur, consulter d’abord **Téléchargements** dans le profil qui les a produits.

**2. Cartographier Docker.** Relever tous les conteneurs MariaDB plausibles, y compris arrêtés. Pour chacun, noter projet, image et identifiant d’image, port publié, montage de `/var/lib/mysql` et bind éventuel de `/docker-entrypoint-initdb.d`. Un arrêt, un contexte différent ou des droits insuffisants peuvent masquer l’instance recherchée.

```powershell
docker context show
docker context ls
docker compose ls --all
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker volume ls
$db = Read-Host 'Nom du conteneur MariaDB à examiner'
docker inspect --format '{{.Config.Image}} {{.Image}}' $db
docker inspect --format '{{json .Mounts}}' $db | ConvertFrom-Json |
    Select-Object Type,Name,Source,Destination,RW
docker port $db
$labels = docker inspect --format '{{json .Config.Labels}}' $db | ConvertFrom-Json
$labels | Select-Object 'com.docker.compose.project','com.docker.compose.project.working_dir','com.docker.compose.project.config_files'
$vol = Read-Host 'Nom du volume réellement monté sur /var/lib/mysql (vide pour un bind)'
if ($vol) { docker volume inspect --format '{{.Name}} {{.Driver}} {{.Mountpoint}}' $vol }
```

Le Compose suivi déclare `mariadb` / `ic_dico_mariadb_next` (`mariadb:11`, `3306:3306`), le volume externe nommé ci-dessus et le bind `./db:/docker-entrypoint-initdb.d`. Il déclare aussi `phpmyadmin` / `ic_lab_next_phpmyadmin` (`8080:80`), interface facultative. Ces noms décrivent le fichier Git. **Aucun conteneur, volume ni schéma de ZI n’a été observé directement.** Le point de montage Docker Desktop peut se trouver dans sa VM Linux. La collecte se fait par le serveur SQL et les arbres média Windows.

**Écart à résoudre avant la remise en route Docker.** Dans le fichier publié, `phpmyadmin.depends_on` contient littéralement `docker ps`, alors que les services déclarés s’appellent `mariadb` et `phpmyadmin`. Le bind `./db` est également absent du clone VM. Comparer les fichiers indiqués par les labels à la version Git. Depuis le dossier du projet actif, exécuter `docker compose config --quiet` avec les mêmes options `-f` que sur ZI si plusieurs fichiers sont employés. Noter le code retour et le diagnostic. Un conteneur déjà en marche peut provenir d’une définition antérieure. Ne lancer aucun `up` pour cette vérification. [Validation silencieuse de Compose](https://docs.docker.com/reference/cli/docker/compose/config/)

**3. Attribuer les schémas.** Si le Hub tourne déjà, exécuter `Invoke-RestMethod 'http://127.0.0.1:8790/api/health/db' | Select-Object service,requestedStore,store`. Recouper avec le journal du serveur (stockage actif/repli), un compte et un cours connus. Un retour HTTP 200 ou la présence du schéma `ic_hub` ne suffit pas. Si aucun conteneur ne correspond à l’instance attendue, relever les services Windows (`Get-Service -Name '*maria*','*mysql*' -ErrorAction SilentlyContinue`) et le propriétaire du port (`Get-NetTCPConnection -State Listen -LocalPort 3306`). Demander à l’exploitant les hôtes, ports et noms des schémas actifs si le moteur est distant.

Sur une instance **déjà active**, ouvrir le client avec un compte de lecture habilité. La saisie du mot de passe se fait à l’invite. Ces requêtes inventorient les métadonnées sur ZI. Garder leurs sorties détaillées en privé.

```powershell
$lecteur = Read-Host 'Compte MariaDB de lecture'
docker exec -it $db mariadb "--user=$lecteur" --password
```

```sql
SELECT @@hostname AS hote, @@port AS port_interne, VERSION() AS version_sql;
SHOW DATABASES;
SELECT table_schema, table_type, engine, COUNT(*) AS objets
FROM information_schema.tables
WHERE table_schema IN ('ic_dico','ic_augmented_video','ic_hub')
GROUP BY table_schema, table_type, engine;
SELECT routine_schema, routine_type, COUNT(*) AS routines
FROM information_schema.routines
WHERE routine_schema IN ('ic_dico','ic_augmented_video','ic_hub')
GROUP BY routine_schema, routine_type;
```

Adapter la liste aux noms réellement utilisés. Relever aussi vues, déclencheurs, événements, collations, `DEFINER` et privilèges nécessaires auprès du DBA, sans divulguer les comptes ni leurs justificatifs. Un inventaire fait avec un compte limité ne démontre pas l’absence d’un schéma invisible.

## Relier une vidéo à son fichier

Sur ZI, choisir en privé une activité avec un média local, puis suivre **activité → lien pédagogique → asset → version lisible → emplacement**. `activity_media_links.media_asset_id` désigne l’objet éditorial. Le lien peut désigner un `media_playable_id` précis. Quand il en manque un, vérifier le `default_playable_id` de l’asset et la projection réellement présentée. `media_sources` porte l’origine. `media_treatments` conserve les couples source/sortie et la version publiée. Les plans et passages audio sont en SQL. Préserver également la filiation des assets et les références entre versions.

Sélectionner le schéma confirmé sur ZI (adapter la ligne `USE` si son nom diffère). La première requête distingue la version fixée par l’activité et celle proposée par défaut sur l’asset. Garder les résultats sur la machine.

```sql
USE ic_augmented_video;
SELECT l.activity_id, l.role, l.media_asset_id, l.media_playable_id AS version_fixee,
       a.default_playable_id AS version_par_defaut, p.id AS version_examinee,
       p.kind, p.storage_scope, p.storage_key
FROM activity_media_links AS l
LEFT JOIN media_assets AS a ON a.id = l.media_asset_id
LEFT JOIN media_playables AS p ON p.id = COALESCE(l.media_playable_id, a.default_playable_id)
ORDER BY l.activity_id, l.sort_order, l.id;
```

Dans la même session, relever le registre, puis inventorier toutes les versions locales, y compris celles qu’aucune activité n’utilise. Pour retrouver un original extérieur au clone, consulter en privé `media_sources.origin_url` et `media_playables.location_url` pour l’asset concerné.

```sql
SELECT version, checksum_sha256 FROM schema_migrations ORDER BY version;
SELECT p.id AS playable_id, p.asset_id, p.source_id, p.role, p.availability,
       p.storage_scope, p.storage_key, m.size_bytes, m.sha256
FROM media_playables AS p
LEFT JOIN media_playable_metadata AS m ON m.playable_id = p.id
WHERE p.kind = 'local-file'
ORDER BY p.storage_scope, p.storage_key, p.id;
```

| `storage_scope` SQL | Où chercher relativement au dossier `data/` de Proto05 |
|---|---|
| `legacy-media` ou `library-media` | `video-library-media/<storage_key>` |
| `workspace` | `video-library-workspaces/<storage_key>` |

Conserver chemin relatif, casse, sous-dossiers et identifiants. Signaler séparément clé vide/invalide, scope inconnu, version retirée, fichier déjà manquant sur ZI et fichier physique sans ligne correspondante. Plusieurs versions peuvent partager un fichier. Une origine YouTube, HLS UGA, HLS distant ou média direct peut être joignable uniquement par le réseau. Relever fournisseur et disponibilité en privé. Un lien distant ne garantit pas qu’une copie locale pourra être recréée. [Schéma et colonnes](../prototypes/05-augmented-ic-video-01/database/schema-migrations/001_proto05_canonical_schema.manifest.json) · [résolution des emplacements](../prototypes/05-augmented-ic-video-01/server/scripts/local-media-availability-dry-run.js)

**Inventaire disque** à lancer avec PowerShell sur ZI puis sur la VM en adaptant `$zi`. Le résultat reste à l’écran. Il peut prendre du temps sur les gros fichiers. Comparer le triplet `Racine/Cle, Octets, SHA256` entre machines et les tailles/empreintes SQL lorsqu’elles existent. Pour un fichier sans empreinte SQL, l’empreinte prise sur ZI sert de témoin de transfert.

```powershell
$media = Join-Path $zi 'prototypes/05-augmented-ic-video-01/data'
foreach ($nom in 'video-library-media','video-library-workspaces') {
    $dir = Join-Path $media $nom
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) { Write-Warning "Absent : $dir"; continue }
    Get-ChildItem -LiteralPath $dir -File -Recurse -Force -ErrorAction Stop | ForEach-Object {
        [pscustomobject]@{
            Racine = $nom
            Cle    = $_.FullName.Substring($dir.Length + 1).Replace('\','/')
            Octets = $_.Length
            SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256 -ErrorAction Stop).Hash
        }
    }
}
```

Le repère du 9 septembre était de **15 MP4** sous `video-library-media` et **5 MP4** sous `video-library-workspaces`, soit environ **466 Mio** au total. Ces chiffres donnent un ordre de grandeur pour retrouver l’ancienne copie. La référence de réception sera l’inventaire frais de ZI. [État des lieux historique](../docs/229_2026-09-09_etat_des_lieux_hebergement_alpaga.md)

**Copier en priorité** les originaux locaux uniques, copies de travail référencées, dérivés retenus/publiés et fichiers dont la source n’est plus accessible. Un rendu peut être régénérable si l’entrée exacte, les masques/paramètres temporels ou le plan audio, et la chaîne FFmpeg compatible sont disponibles. Conserver le rendu existant tant que cette équivalence reste à établir. Les jobs en mémoire, segments temporaires, préparations expirées et téléchargements partiels sont recréables. Les isoler des sorties finales. Ne supprimer aucun « orphelin » pendant le rapprochement. [Espaces de travail](../prototypes/05-augmented-ic-video-01/server/video-workspaces.js) · [moteur](../prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md)

## Export à préparer pour la mission de transfert

1. **Fixer un point de reprise commun.** Convenir d’une fenêtre sans édition, DDL, import, téléchargement ni dérivation. Terminer ou suspendre les traitements. Figer les écritures applicatives pendant le dump **et** la copie des médias/JSON. Noter date, SHA du code, versions du serveur et du client de dump, contexte, moteurs et schémas.
2. **Exporter les seuls schémas IC retenus**, ensemble par instance si possible. Pour les tables InnoDB, utiliser `mariadb-dump --single-transaction --quick --routines --events --triggers --hex-blob --databases …` avec un compte de sauvegarde adapté. Si une table métier utilise un moteur non transactionnel, le DBA valide la méthode de gel correspondante. Garder vues, procédures, registre et données. Conserver séparément le relevé privé des propriétaires et grants à recréer. Éviter le transport des bases système, d’un volume Docker monté à chaud, ou l’emploi d’un ancien dump sans provenance. [Options de mariadb-dump](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump)
3. **Préparer une sortie privée et neuve.** Avec le client Windows compatible, utiliser `--result-file=<chemin privé unique>` et le mot de passe à l’invite. Depuis un conteneur, utiliser le client de son image et un fichier de résultat temporaire privé, puis `docker cp` vers le lot hors Git. Vérifier code retour nul, taille et SHA-256 du dump reçu. Un fichier créé après une erreur n’est pas une sauvegarde validée.
4. **Contrôler sur une instance VM isolée**, après accord sur sauvegarde, cible et retour arrière. Comparer noms et nombres d’objets, effectifs exacts des tables métier, registre/empreintes 001–007, droits et lecture des fichiers référencés. Les comptes SQL applicatifs sont distincts des comptes pédagogiques du Hub. Le compte Proto05 requiert `SELECT`, `EXECUTE`, `SHOW CREATE ROUTINE` sur son schéma, éventuellement `SHOW VIEW`, et `UPDATE` ciblé sur `data_projection_metadata`. Conserver le dump d’origine si une adaptation des `DEFINER` est nécessaire. Une restauration précédente mentionnée dans les archives ne valide pas ce lot. [Contrôle de droits Proto05](../prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js)

## Remise en route et recette sur la VM

**Constaté sur le clone le 26 novembre 2026.** Node 24.22.2, npm 11.19.1, Windows Terminal, les JSON suivis et les sources des six parcours sont présents. Sont absents aux emplacements attendus les `node_modules` Hub et Dico, les deux arbres média, le `.env` racine, le `.env.local` Proto05 et le fichier `admin/.env` de Dico. Docker, FFmpeg et FFprobe ne sont pas dans le PATH de la session. Docker Desktop et sa CLI sont absents des chemins usuels testés sous `C:\Program Files\Docker`. Une autre installation ou une autre instance SQL reste à identifier sur la VM.

**Limites propres à la session.** La 235 a rencontré un refus CIM du lanceur et un accès HTTP loopback refusé ou expiré depuis ses processus. L’installation npm a échoué sur la résolution DNS du registre. Le transport Git local ne résout toujours pas `github.com` et les métadonnées `.git` sont en lecture seule ici. Ces limites de recette ne permettent pas de conclure à une panne du réseau, de Windows ou des applications dans la session interactive de David. [Rapport 235](235_reprise_codex_vm_report.md)

**Ordre proposé, après collecte et validation du transfert.**

1. Aligner le clone VM sur `main` en préservant ses fichiers locaux. Installer les dépendances verrouillées par `npm ci` dans `prototypes/00-ic-hub/server` puis `prototypes/08-dico-seven-sieves/Node`. Proto06 utilise Node sans dépendance npm déclarée. Proto05 charge normalement `mysql2` et `hls.js` depuis le Hub voisin. Préparer Docker/MariaDB sur le port attendu, FFmpeg et son FFprobe compatible.
2. Résoudre la configuration Compose effective avant tout démarrage Docker. Préparer la cible restaurable, les comptes/grants et les paramètres privés. Pour le Hub, renseigner `IC_HUB_STORE` et `IC_HUB_DB_*` ainsi que les variables OpenAI nécessaires à l’admin. Pour Proto05, les cinq `PROTO05_MARIADB_{HOST,PORT,DATABASE,USER,PASSWORD}` et, si utile, `PROTO05_FFMPEG_PATH`. Pour Dico, `DB_HOST/PORT/NAME/USER/PASSWORD` proviennent de l’environnement du processus. Le fichier `admin/.env` porte les réglages IA `OPENAI_API_KEY` et `OPENAI_MODEL`. Les modèles `.env.example` du Hub et de Proto05 sont suivis. L’authentification et les appels OpenAI réels restent à valider avec la configuration privée.
3. Restaurer la copie SQL retenue et positionner les deux arbres média et les fichiers JSON avant de démarrer les applications. Le Hub peut amorcer ses données au démarrage, et Proto05 nettoie certains téléchargements incomplets. Comparer le manifeste SQL/disque sur la copie. Le contrôle prévu `node --env-file=../.env.local scripts/local-media-availability-dry-run.js`, depuis le dossier serveur de Proto05, renvoie `mode: dry-run` et `applied: 0`. Comparer sa synthèse aux écarts déjà recensés sur ZI. Ce contrôle de réception utilise uniquement le mode de lecture.
4. Avec MariaDB déjà active sur `127.0.0.1:3306`, lancer `START_IC_LAB_NEXT.bat` depuis la racine dans une session Windows interactive. Le manifeste démarre **Proto05 8791 → Hub 8790 → Agent vocal 8788 → Dico 3000**, puis ouvre le Hub. Le lanceur global contrôle MariaDB et ne la démarre pas. Le lanceur Dico isolé, lui, appelle `docker compose up -d`. [Manifeste Windows](../scripts/windows/launcher-services.json) · [guide d’arrêt et démarrage](../scripts/windows/README.md)

| Parcours à réceptionner | Geste depuis l’entrée normale | Résultat attendu |
|---|---|---|
| **Hub public, authentifié et IA** | Ouvrir `http://127.0.0.1:8790/`, puis **Mon espace local** (`/hub.html`). Se connecter avec un compte de recette, ouvrir un cours, son affectation et le catalogue IA via `/admin.html` avec le rôle approprié. | Cinq cartes et données du cours attendu. `/api/health/db` et le journal confirment le mode retenu. L’administration liste fournisseurs, modèles, configurations et métadonnées. Un appel OpenAI réel éventuel fait l’objet d’un essai distinct sur contenu fictif. |
| **Vidéo augmentée** | Depuis **Espace enseignant**, ouvrir `/teacher/videos` sur 8791 et lire une copie locale. Ouvrir l’activité étudiante associée, puis une source distante autorisée. | `/api/health` répond 200 avec `status=available`. Vidéo et son, durée, transcription et annotations correspondent au témoin ZI. Un `503` signale une dépendance métier indisponible. Le gestionnaire HLS de Proto05 contacte directement UGA pour sa route historique. Le Hub conserve son propre relais. Vérifier séparément YouTube et les autres hôtes réellement référencés. [Gestionnaire HLS courant](../prototypes/05-augmented-ic-video-01/server/server.js) |
| **Agent vocal** | Ouvrir `http://127.0.0.1:8788/library-1.1.html` depuis le Hub. Comparer une activité serveur puis lancer l’affectation depuis le cours de recette. | `/api/health` et `/api/activities` répondent. Le runtime 1.2.3 charge le bon manifeste et la configuration via le Hub. Vérifier voix Windows et micro sur un scénario de test, puis la remontée du run de test. La reconnaissance dépend du navigateur et de ses services. [Runtime vocal](../prototypes/06-voice-agent-ic/script-1.2.3.js) |
| **Informaticaire** | Cliquer la carte du Hub, `http://127.0.0.1:8790/demos/informaticaire/`. | Recherche Miriadi, fiche et navigation vers Lectŭrĭo+ fonctionnent dans la page servie. Vérifier à part un lien externe. La maquette Next et les entretiens ne sont pas nécessaires. |
| **Dico-IC** | Ouvrir `http://127.0.0.1:3000/admin-app/index-admin-0.1.html`. Rechercher **information**, cliquer sur **Voir** pour **INFORMATION_DATA**. | Les formes et relations s’affichent depuis MariaDB. La proposition IA sur texte fictif, si souhaitée, vérifie ensuite l’accès OpenAI sans enregistrer de proposition. |
| **Seven Sieves** | Carte du Hub → préparation enseignant, lancer l’analyse sur un texte de démonstration, ouvrir l’activité apprenant dans le même onglet. Puis ouvrir dans un **onglet vierge** `http://127.0.0.1:3000/prototypes/01-seven-sieves/index-student-0.1.html?soutenance=1`. | L’analyse enseignant (`POST /analysis`) renvoie un paquet et un mot est inspectable sous un tamis. L’entrée directe affiche le texte de soutenance et ses tamis dès l’ouverture. [Entrée directe](../prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-soutenance-v0.js) |

**Arrêt de réception.** Lancer `STOP_IC_LAB_NEXT.bat` dans la session de recette. Vérifier que les quatre serveurs applicatifs du lancement ont libéré leurs ports et que MariaDB répond toujours sur 3306. Refaire un démarrage global et retrouver le même cours et la même vidéo afin de vérifier la persistance.

**Périmètre et preuve.** Inventaire documentaire fondé sur le code, le Compose, les manifestes, les fichiers présents sur la VM et les constats de la 235. La comparaison GitHub entre le clone `c52e52a` et le brief corrigé `934940f` montre uniquement des différences de missions et de rapport. Les sources applicatives examinées concordent. Conteneurs, volumes, schémas actifs, lots de fichiers et écarts JSON restent à relever sur ZI. Aucun transfert, export, démarrage applicatif, appel IA, restauration ou modification métier pendant la 236. La recette ci-dessus est à exécuter sur la future copie. La validation humaine revient à David.

Le commit `docs(reports): inventorier la reprise complète de Zenith Ice vers CODEX_VM` contient uniquement `reports/236_inventaire_reprise_zi_vm_report.md`. Les versions applicatives restent inchangées. L’extraction de l’atelier image et son reste reportée.
