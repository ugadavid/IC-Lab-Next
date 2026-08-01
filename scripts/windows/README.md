# Lanceurs Windows IC-Lab-Next

Les lanceurs utilisent uniquement des chemins calculés depuis le dépôt. Ils
fonctionnent donc depuis un autre répertoire courant et lorsque le chemin du
dépôt contient des espaces.

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
