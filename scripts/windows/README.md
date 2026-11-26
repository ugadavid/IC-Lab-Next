# Lanceurs Windows IC-Lab-Next

Les lanceurs utilisent uniquement des chemins calculés depuis le dépôt. Ils
fonctionnent donc depuis un autre répertoire courant et lorsque le chemin du
dépôt contient des espaces.

## Utilisation quotidienne sur CODEX_VM

1. Attendre que Docker Desktop et MariaDB soient disponibles. En cas de doute, double-cliquer sur [check-status.bat](check-status.bat) et vérifier la ligne MariaDB (3306).
2. Dans l’Explorateur, ouvrir `C:\Users\codex\Documents\Projets\IC-Lab-Next` et double-cliquer sur [START_IC_LAB_NEXT.bat](../../START_IC_LAB_NEXT.bat). **Si les quatre services du dernier lancement tournent déjà, les laisser ouverts.** David a validé ce cas sur la VM le 26 novembre 2026. Le lanceur les reconnaît, les arrête, les relance, puis ouvre le [Hub](http://127.0.0.1:8790/).
3. Pour terminer la session, double-cliquer sur [STOP_IC_LAB_NEXT.bat](../../STOP_IC_LAB_NEXT.bat). L’arrêt porte sur les services applicatifs du lancement. Docker et MariaDB restent disponibles.

### Ce qui a été transféré depuis Zenith Ice

| Élément | Emplacement ou repère sur la VM |
|---|---|
| MariaDB 11.8.6 | Docker Desktop avec WSL 2 (paquet WSL 3.0.5). Conteneur `ic_dico_mariadb_next`, volume `ic_lab_next_mariadb_data`, accès hôte `127.0.0.1:3306`. |
| Bases et droits | Export logique sur ZI, puis restauration sur la VM de `ic_augmented_video` (34 tables), `ic_dico` (8) et `ic_hub` (15). Les cinq comptes applicatifs et leurs droits ont été repris séparément. Comptages relevés par David sur la cible. |
| Hub | Le Hub utilise les JSON sur les deux machines, même avec le schéma `ic_hub` restauré. Historique copié vers `prototypes/00-ic-hub/server/data/runs.json`. |
| Configurations locales | `.env` à la racine, `prototypes/05-augmented-ic-video-01/.env.local` et `prototypes/08-dico-seven-sieves/admin/.env`. |
| Médias Proto05 | `prototypes/05-augmented-ic-video-01/data/video-library-media/` et `prototypes/05-augmented-ic-video-01/data/video-library-workspaces/`. Conserver les chemins relatifs, car Proto05 y résout les références de la base. |
| Outils vidéo | Dossier `C:\Tools\FFmpeg`, avec `ffmpeg.exe` et `ffprobe.exe` sous `bin\`. |

David a copié les configurations, l’historique, les deux dossiers média et FFmpeg via la session étendue de la VM. Pour contrôler la reprise, ouvrir le catalogue Proto05 et lire un média local (27 vidéos au catalogue lors de la recette). Dans Dico-IC, rechercher **information** et ouvrir **INFORMATION_DATA** (cinq formes, dix relations). Vérifier aussi l’[écran apprenant Seven Sieves](http://127.0.0.1:3000/prototypes/01-seven-sieves/index-student-0.1.html?soutenance=1). Les observations de David et les contrôles rejoués par Codex sont détaillés dans le [rapport 237](../../reports/237_demenagement_vm_et_correctifs_npm_report.md).

### Si le lanceur refuse l’identité d’un processus Node

Lors de l’essai de David, `Get-Process` trouvait bien le PID **7224** dans Windows PowerShell 5.1 x86, mais la colonne `Path` restait vide. Depuis ce même shell, la commande lancée en PowerShell 64 bits via `Sysnative` retournait pour **le même PID** `C:\Users\codex\AppData\Local\Programs\nodejs\node.exe`. Dans le [lanceur](launcher.ps1), `Test-ServiceIdentity` lit `Path` et le compare à l’exécutable enregistré avant de vérifier les arguments et le lancement. Un chemin illisible suffit à faire refuser l’arrêt. Le double-clic depuis l’Explorateur a permis à David de redémarrer les services déjà actifs.

Pour reproduire la comparaison en lecture seule, relever le PID Node qui écoute actuellement sur le port du Hub. Depuis un PowerShell natif, exécuter `Get-NetTCPConnection -State Listen -LocalPort 8790 | Select-Object LocalPort, OwningProcess`. Ouvrir ensuite **Windows PowerShell (x86)** et utiliser ce PID pour les deux lectures, pendant que le service tourne.

```powershell
$PSVersionTable.PSVersion
[Environment]::Is64BitOperatingSystem
[Environment]::Is64BitProcess
$nodeId = [int](Read-Host 'PID Node courant du Hub')
Get-Process -Id $nodeId | Select-Object Id, ProcessName, Path
$natif = "$env:windir\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
& $natif -NoProfile -Command "[Environment]::Is64BitProcess; Get-Process -Id $nodeId | Select-Object Id, ProcessName, Path"
```

Sur Windows x64, le test d’architecture du **processus** renvoie `False` depuis le shell x86 et `True` depuis le shell natif. `Sysnative` est l’alias utilisable depuis le processus 32 bits pour atteindre le binaire système natif. [Redirection du système de fichiers Windows](https://learn.microsoft.com/en-us/windows/win32/winprog64/file-system-redirector)

## Démarrage global

Double-cliquer sur `START_IC_LAB_NEXT.bat` à la racine effectue un redémarrage
complet des quatre serveurs applicatifs :

1. arrête les processus d’un lancement IC-Lab-Next précédent après vérification
   de leur identité ;
2. attend la libération des ports `8791`, `8790`, `8788` et `3000` ;
3. vérifie seulement que MariaDB répond sur `3306` ;
4. ouvre une fenêtre Windows Terminal dédiée, avec les onglets `Proto05`,
   `IC-Hub`, `Agent vocal` et `Dico-IC` ;
5. vérifie pour chaque serveur le PID, le propriétaire du port et une réponse
   HTTP caractéristique ;
6. ouvre IC-Hub sur <http://127.0.0.1:8790/>.

Si Windows Terminal est absent, un avertissement est affiché et chaque service
est ouvert dans une fenêtre PowerShell distincte. Un port occupé par un processus
qui ne peut pas être authentifié comme appartenant au projet provoque un refus
explicite : ce processus n’est jamais arrêté.

Les journaux et témoins d’identité temporaires sont placés dans
`.ic-lab-next-runtime/`, dossier local ignoré par Git. Le manifeste suivi
`launcher-services.json` décrit les services, leurs dossiers, leurs ports et
leurs contrôles de disponibilité.

Les lanceurs spécialisés restent disponibles pour les usages isolés :

- `start-proto05.bat` : Proto05 sur `8791` ;
- `start-hub.bat` : IC-Hub sur `8790` ;
- `start-agent-vocal.bat` : Agent vocal sur `8788` ;
- `start-dico-seven.bat` : comportement historique propre à Dico-IC ;
- `check-status.bat` : état en lecture seule de Docker et des ports.

Le démarrage global n’appelle pas ces lanceurs spécialisés : il démarre les
processus Node directement depuis les dossiers définis dans le manifeste afin
de garantir une identité et un arrêt fiables.

## Arrêt global

Double-cliquer sur `STOP_IC_LAB_NEXT.bat` demande l’arrêt aux seuls processus
décrits par le témoin du dernier lancement et dont l’exécutable, les arguments,
le dossier, le jeton aléatoire et le superviseur correspondent encore. Une
seconde exécution est sans effet et réussit normalement.

Les ports ne servent jamais d’autorisation d’arrêt. Ils servent uniquement à
détecter les conflits et à confirmer la disponibilité ou la libération d’un
service. Si le témoin local est incohérent avec les processus vivants, STOP
refuse de tuer quoi que ce soit et affiche le problème.

## Docker et MariaDB

`START_IC_LAB_NEXT.bat` et `STOP_IC_LAB_NEXT.bat` ne démarrent, n’arrêtent et ne
redémarrent ni Docker ni MariaDB. Le port `3306` est seulement vérifié comme
dépendance au démarrage et n’est jamais une cible d’arrêt.

Le lanceur spécialisé historique `start-dico-seven.bat` conserve son propre
comportement et peut exécuter `docker compose up -d` lorsqu’il est lancé
directement. Il n’est pas appelé par le démarrage global.

Les scripts globaux ne lancent jamais `npm install`, migration, initialisation
de base, script SQL, suppression de volume, `docker compose stop` ou
`docker compose down`.
