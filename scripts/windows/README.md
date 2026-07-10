# Lanceurs Windows IC-Lab-Next

Ces scripts utilisent uniquement des chemins relatifs au dépôt. Ils peuvent
donc être lancés depuis la racine, depuis un autre répertoire courant ou après
un clonage dans un chemin Windows contenant des espaces.

## Démarrage

Double-cliquer sur `START_IC_LAB_NEXT.bat` à la racine lance Hub, Agent vocal et
Dico-IC / Seven Sieves, puis ouvre le portail <http://127.0.0.1:8790/>.

Les lanceurs spécialisés sont aussi disponibles :

- `start-hub.bat` : Hub, Vidéo augmentée et Informaticaire sur `8790` ;
- `start-agent-vocal.bat` : Agent vocal sur `8788` ;
- `start-dico-seven.bat` : stack Compose Dico existante, puis Node sur `3000` ;
- `start-all.bat` : les trois lanceurs et un résumé après 30 tentatives de
  vérification maximum par service ;
- `check-status.bat` : état lecture seule de Docker et des ports.

Les scripts ne lancent jamais `npm install`, migration, initialisation de base,
script SQL, suppression de volume ou `docker compose down -v`. Le lanceur Dico
exécute seulement `docker compose up -d` depuis son dossier existant, puis
attend MariaDB sur `3306`.

## Arrêt sûr

Arrêtez chaque serveur Node avec `Ctrl+C` dans sa propre fenêtre. Pour arrêter
la stack Docker Dico depuis `prototypes/08-dico-seven-sieves`, utilisez :

```bat
docker compose stop
```

N’utilisez jamais `docker compose down -v` : cette commande supprimerait les
volumes, dont `ic_lab_next_mariadb_data`.
