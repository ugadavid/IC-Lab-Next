# Mission 237 — Documenter le déménagement sur CODEX_VM et publier les correctifs npm

## Livrables

Compléter le guide Windows existant (ou y relier une fiche concise dans docs/) et rédiger reports/237_demenagement_vm_et_correctifs_npm_report.md selon AGENTS.md. Les rapports 235 et 236 retracent le diagnostic initial et l’inventaire. Le guide doit permettre de retrouver le geste quotidien, de comprendre ce qui a été transféré et de reproduire les vérifications utiles.

## Relevé de David sur la VM, 26 novembre 2026

- Docker Desktop avec WSL 2. Le paquet WSL installé affiche la version 3.0.5. MariaDB 11.8.6, conteneur ic_dico_mariadb_next, volume ic_lab_next_mariadb_data, port hôte 127.0.0.1:3306. Décrire l’export logique et la restauration des trois bases, puis la reprise séparée des cinq comptes applicatifs et de leurs droits. Tables observées sur la cible : ic_augmented_video 34, ic_dico 8, ic_hub 15.
- Hub en stockage JSON sur ZI et sur la VM. Copie via la session étendue des trois configurations locales listées en 236, de runs.json, des dossiers video-library-media et video-library-workspaces (21 fichiers, environ 0,47 Gio sur ZI) et de C:\Tools\FFmpeg. Documenter uniquement les emplacements.
- Validation humaine : Proto05 disponible sur MariaDB, 27 vidéos au catalogue et lecture d’un média local confirmée. Fiche Dico-IC INFORMATION_DATA avec cinq formes et dix relations. Écran apprenant Seven Sieves chargé. David confirme le fonctionnement général et le redémarrage des services déjà actifs par double-clic sur START_IC_LAB_NEXT.bat. Attribuer ces observations à David et distinguer les contrôles réellement rejoués par Codex.
- Diagnostic du lanceur : même processus Node (PID 7224 lors de cet essai), Get-Process trouve le PID mais renvoie Path vide dans Windows PowerShell 5.1 x86. La même commande exécutée depuis ce shell via le PowerShell natif sous Sysnative renvoie le chemin de node.exe. Relier ce résultat au contrôle d’identité du lanceur, expliquer comment vérifier l’architecture et refaire la comparaison avec le PID courant. Consigner le double-clic depuis l’Explorateur comme démarrage validé. Le code du lanceur reste hors périmètre.

## Correctifs npm et publication

Inspecter d’abord HEAD, l’état Git et le diff local des manifests et fichiers de verrouillage dans prototypes/00-ic-hub/server et prototypes/08-dico-seven-sieves/Node. Préserver ces changements lors de la synchronisation avec main et conserver le labo en fonctionnement. Retrouver les versions avant/après dans le diff. Alertes initiales du Hub : mysql2. Dico-IC : body-parser, mysql2, proxy-addr et qs. Relever le résultat actuel de npm audit séparément pour chaque composant. Ne conclure à zéro alerte que sur résultat observé.

Publier les correctifs locaux pertinents. S’ils manquent ou sont incomplets, appliquer npm audit fix sans --force aux seuls composants concernés et examiner le diff. Vérifier que npm ci reproduit les dépendances dans une copie temporaire si possible, sans toucher aux modules utilisés par les serveurs. Consigner toute limite réseau ou de session et les alertes restantes. Exclure changements étrangers, node_modules, secrets, empreintes d’authentification, dumps, médias et fichiers de données privés.

Faire un commit des correctifs npm et un commit documentaire avec guide et rapport sur origin/main, y compris en cas de résultat partiel (publier les livrables obtenus). Vérifier les SHA sur la branche distante et la lisibilité du rapport. Si Git local reste limité, utiliser la connexion GitHub avec les fichiers exacts vérifiés sur la VM, puis préciser l’état du clone. Renvoyer le lien du rapport, du guide et les SHA vérifiés, puis s’arrêter.
