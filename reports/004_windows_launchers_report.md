# Rapport 004 — Lanceurs Windows IC-Lab-Next

Date : **10 juillet 2026**

Base de départ : `ecb16f3` sur `main`.

## Fichiers créés

- `START_IC_LAB_NEXT.bat` ;
- `scripts/windows/start-hub.bat` ;
- `scripts/windows/start-agent-vocal.bat` ;
- `scripts/windows/start-dico-seven.bat` ;
- `scripts/windows/start-all.bat` ;
- `scripts/windows/check-status.bat` ;
- `scripts/windows/README.md`.

Les scripts calculent la racine à partir de `%~dp0`, citent tous les chemins et
ne dépendent donc pas du répertoire courant ni d’un chemin absolu vers le
workspace.

## Comportement

`START_IC_LAB_NEXT.bat` délègue à `start-all.bat`. Les lanceurs Hub et Agent
vocal vérifient Node/npm et le port de leur service avant d’ouvrir une fenêtre
Node dédiée. Le Hub ne crée aucun serveur supplémentaire pour Vidéo augmentée
ou Informaticaire.

Le lanceur Dico vérifie Docker avec `docker info`, exécute `docker compose up
-d` depuis `prototypes/08-dico-seven-sieves`, attend MariaDB sur `3306`, puis
ouvre le serveur Node seulement si `3000` est libre. Il n’exécute ni migration,
ni SQL, ni suppression de volume. `start-all.bat` attend au plus 30 tentatives
par service et ouvre ensuite le portail Hub, y compris lorsqu’un service
autonome manque.

`check-status.bat` ne démarre rien : il affiche seulement Docker et les ports
`3306`, `3000`, `8788` et `8790`, sans secret.

## Scénarios testés

1. État initial : MariaDB active, Hub, Agent vocal et Dico-IC arrêtés ;
   `check-status.bat` les a signalés correctement.
2. Appel depuis la racine et depuis `C:\Program Files` : les chemins relatifs
   aux scripts restent valides ; ce second répertoire couvre un chemin courant
   contenant des espaces.
3. Docker indisponible simulé avec un `PATH` de test ne contenant pas Docker :
   `start-dico-seven.bat` affiche le message attendu et sort avec le code `1`,
   sans commande Compose.
4. Lancement Hub : `8790` actif et `GET /api/health` répond avec la version
   `0.10.3`.
5. Lancement Agent vocal : `8788` actif et `GET /api/health` répond avec la
   version `1.1`.
6. Lancement Dico : la commande réellement exécutée est `docker compose up -d`
   dans la racine Dico existante ; `3306` reste actif, `3000` répond et
   `GET /languages` retourne cinq langues.
7. Second appel de chaque lanceur, puis appel du lanceur global : les ports
   déjà actifs sont réutilisés, sans second serveur Node ; le résumé est
   correct et la racine du portail répond `302`.
8. `check-status.bat` après lancement : Docker et les quatre ports sont actifs.

## Intégrité et limites

Les fichiers Hub de comptes, cours, inscriptions, sessions, traces et registre
de prototypes ne présentent aucun diff. Aucun endpoint d’écriture Dico n’a été
appelé, aucune donnée Dico n’a été modifiée et le volume
`ic_lab_next_mariadb_data` est conservé. La stack Compose reste active après la
recette ; seuls les serveurs Node de test sont arrêtés ensuite.

La recette manuelle restante pour David consiste à double-cliquer le lanceur
dans un chemin de clonage contenant lui-même des espaces, à confirmer
l’ouverture de la fenêtre terminal de chaque service et l’ouverture du
navigateur par défaut. Les serveurs Node doivent être arrêtés avec `Ctrl+C`
dans leur fenêtre ; aucune commande `stop-all.bat` n’est fournie.
