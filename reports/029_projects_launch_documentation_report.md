# Rapport 029 — mise à jour du guide de lancement

Date : **16 juillet 2026**

## Objet

Mettre `PROJECTS_LAUNCH.md` en conformité avec l’architecture actuelle et les
launchers Windows présents, sans modifier de script, serveur, code, donnée ou
configuration.

## Livrables

- mise à jour de [`PROJECTS_LAUNCH.md`](../PROJECTS_LAUNCH.md) ;
- création du présent rapport documentaire.

Aucun autre fichier existant n’a été modifié.

## Sources consultées

- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) ;
- `START_IC_LAB_NEXT.bat` ;
- `scripts/windows/start-all.bat` ;
- `scripts/windows/start-proto05.bat` ;
- `scripts/windows/start-hub.bat` ;
- `scripts/windows/start-agent-vocal.bat` ;
- `scripts/windows/start-dico-seven.bat` ;
- `scripts/windows/check-status.bat` ;
- les guides de serveur liés depuis `PROJECTS_LAUNCH.md` ;
- les blocs de routage statique d’IC-Hub et de Proto05, lus uniquement pour
  confirmer les redirections et entrées documentées.

## Faits vérifiés et corrections apportées

### Séquence globale

`START_IC_LAB_NEXT.bat` appelle `start-all.bat`. Celui-ci lance ou réutilise :

1. Proto05 sur `8791` ;
2. IC-Hub sur `8790` ;
3. Agent vocal sur `8788` ;
4. la stack Dico-IC, avec MariaDB `3306` avant le serveur Node `3000`.

Le guide précédent omettait Proto05 dans le résumé du launcher global alors que
son introduction le mentionnait déjà. Cette contradiction est supprimée.

### Proto05

L’ancienne section décrivait encore un fichier `index-0.0.6.html` ouvert sans
serveur et indiquait « Port : aucun ». Elle est remplacée par l’état vérifié :

- serveur autonome dans `prototypes/05-augmented-ic-video-01/server` ;
- port `8791` ;
- racine servant `index-0.0.8.html` ;
- vues étudiant et enseignant actuelles ;
- lancement avant IC-Hub ;
- dépendance HLS résiduelle envers le proxy et le `hls.js` d’IC-Hub.

### IC-Hub et redirections

Les entrées actuelles sont précisées :

- `/` et `/portal.html` vers `portal-0.10.3.html` ;
- `/hub.html` vers `hub-0.9.6.html` ;
- `/demos/augmented-video/` vers Proto05 `8791` ;
- `/demos/informaticaire/` servi par IC-Hub.

Le maintien des routes Proto05 héritées en lecture seule et du montage statique
descendant est présenté comme une compatibilité provisoire.

### Agent vocal et Dico-IC

Les ports et entrées existants sont conservés sans reprendre les affirmations de
recette runtime de l’ancien document :

- Agent vocal `8788` ;
- Dico-IC / Seven Sieves `3000` ;
- MariaDB `3306` ;
- phpMyAdmin `8080` mentionné seulement comme service Compose auxiliaire non
  contrôlé par le script de statut.

Le flux Dico documente strictement ce que fait le launcher : `docker compose up
-d`, attente de `3306`, puis démarrage ou réutilisation de Node `3000`. Aucune
migration, initialisation ou exécution SQL n’est attribuée au launcher.

### `check-status.bat`

Le guide indique désormais que ce script :

- vérifie Docker Desktop ;
- teste les ports `3306`, `3000`, `8788`, `8790` et `8791` ;
- ne démarre rien ;
- ne fait aucun contrôle HTTP et ne vérifie pas l’identité du processus en
  écoute ;
- ne contrôle pas phpMyAdmin `8080`.

## Choix documentaires

- Les ports sont présentés comme des valeurs déclarées, pas comme une preuve de
  disponibilité runtime.
- Les versions « probables » et les anciennes validations de reprise ont été
  retirées lorsqu’elles n’étaient pas nécessaires au lancement actuel.
- Les points d’entrée sont séparés des dépendances et limites afin de garder le
  document utilisable sans en faire un historique de versions.
- Les commandes destructrices ou de migration ne sont pas proposées.

## Vérifications effectuées

- existence de chaque fichier lié localement ;
- résolution de tous les liens Markdown locaux de `PROJECTS_LAUNCH.md` et du
  présent rapport ;
- recherche des ports et de l’ordre d’appel dans les launchers ;
- confirmation statique des redirections IC-Hub et des routes de vues Proto05 ;
- contrôle du périmètre Git : seul `PROJECTS_LAUNCH.md` est modifié parmi les
  fichiers existants, et le présent rapport est nouveau ;
- contrôle d’espaces du nouveau rapport ;
- `git diff --check`.

Aucun launcher, serveur, endpoint, navigateur, conteneur, test applicatif,
migration ou script SQL n’a été exécuté.
