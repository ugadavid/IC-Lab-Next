# Mission 160 — Fiabiliser le démarrage et l’arrêt d’IC-Lab-Next

Date : 1er août 2026

## Périmètre

La mission porte uniquement sur l’orchestration Windows du workspace. Aucun
code fonctionnel de prototype, aucune donnée MariaDB et aucune migration n’ont
été modifiés. Les lanceurs individuels historiques sont conservés ; les points
d’entrée globaux utilisent désormais un orchestrateur commun.

## Cause du maintien des anciennes versions

Le précédent `start-all.bat` déléguait aux lanceurs individuels. Ceux-ci
considéraient généralement qu’un port ouvert suffisait pour réutiliser un
service déjà actif. Le lancement global pouvait donc conserver un ancien
processus Node et ne garantissait ni son identité ni l’exécution du code
actuellement présent sur disque.

## Réalisation

- `START_IC_LAB_NEXT.bat` délègue à `launcher.ps1 -Action Start` et réalise un
  redémarrage complet.
- `STOP_IC_LAB_NEXT.bat` et `scripts/windows/stop-all.bat` fournissent l’arrêt
  global idempotent.
- `launcher-services.json` décrit les quatre services, leurs dossiers, ports et
  contrôles HTTP. MariaDB y figure uniquement comme dépendance TCP.
- Chaque lancement reçoit un jeton aléatoire. Le superviseur de chaque onglet
  publie atomiquement le PID Node, son exécutable, ses arguments, son dossier,
  son empreinte de commande, son PID superviseur, son port et son jeton dans
  `.ic-lab-next-runtime/`, ignoré par Git.
- START et STOP ne considèrent jamais un port comme une autorisation d’arrêt.
  Avant tout arrêt, ils revérifient l’exécutable, les arguments, le jeton, le
  service et le superviseur. Une ancienne instance antérieure à ce mécanisme
  n’est arrêtée que si sa commande et sa lignée la rattachent au dépôt ; sinon
  le lancement échoue explicitement et laisse le processus intact.
- Après l’arrêt, START attend la libération des quatre ports applicatifs, vérifie
  les prérequis et MariaDB, puis crée les quatre onglets `Proto05`, `IC-Hub`,
  `Agent vocal` et `Dico-IC` dans la même fenêtre Windows Terminal nommée avec le
  jeton du lancement.
- La disponibilité exige simultanément l’identité du processus, la propriété du
  port et une réponse HTTP contenant le témoin attendu. IC-Hub n’est ouvert dans
  le navigateur qu’après réussite des quatre contrôles.
- Si `wt.exe` est absent, le lanceur annonce un repli vers une fenêtre
  PowerShell par service.
- Une requête d’arrêt authentifiée permet à chaque superviseur de terminer le
  serveur puis son onglet. Un arrêt forcé reste borné au PID dont l’identité a
  été revérifiée.

## Docker et MariaDB

Les scripts globaux ne contiennent ni commande Docker ni cible d’arrêt sur le
port `3306`. MariaDB a été observée avant et après la recette avec le même
témoin :

- identifiant : `d6c44a5da176df89b10df783a7ada92b9247b5a6a8885277fb55bfce4ca34f3a` ;
- démarrage : `2026-08-01T05:31:29.218196392Z` ;
- redémarrages : `0` ;
- état : `running`.

Le conteneur n’a donc été ni arrêté ni redémarré par START ou STOP.

## Vérifications réalisées

### Test isolé

`scripts/windows/test/launcher-smoke-test.ps1` a créé un dépôt fixture jetable
dans un chemin temporaire contenant des espaces et quatre serveurs Node sur des
ports libres. Résultat : `LAUNCHER_SMOKE_TEST_OK`.

Le scénario couvre :

- premier START et quatre disponibilités ;
- second START avec remplacement de tous les PID ;
- premier puis second STOP ;
- conservation d’un processus étranger occupant un port et refus du START ;
- reprise après un témoin local illisible lorsque tous les ports sont libres ;
- nettoyage du dossier et des processus temporaires ;
- mode de repli sans Windows Terminal.

### Recette réelle

- départ avec `3000`, `8788`, `8790` et `8791` libres : réussi ;
- premier START : quatre réponses HTTP `200`, propriétaires des ports égaux aux
  PID publiés et identité de commande confirmée ;
- Windows Terminal : quatre hôtes lancés vers le même nom de fenêtre et un seul
  processus/fenêtre Terminal exposé par Windows ; le dernier onglet actif portait
  le titre `Dico-IC` ;
- second START : jeton changé, anciens PID `35484`, `5568`, `13892`, `16836`
  absents et nouveaux PID `2944`, `17072`, `61656`, `8504`, sans réutilisation ;
- STOP : quatre arrêts confirmés et quatre ports libérés ;
- second STOP : code `0` avec message « déjà arrêté » ;
- port `8788` occupé par une fixture étrangère : START refusé, PID étranger
  toujours vivant après le refus, aucun autre service démarré ; fixture ensuite
  supprimée ;
- syntaxe PowerShell des trois scripts : valide ;
- syntaxe Node de la fixture : valide ;
- manifeste JSON : quatre services et une dépendance ;
- recherche statique des commandes Docker destructrices dans les nouveaux
  lanceurs : aucune occurrence ;
- `git diff --check` : réussi lors des contrôles intermédiaires et finaux.

L’ouverture d’IC-Hub par le lanceur et son accessibilité HTTP ont été vérifiées.
La politique de l’outil d’automatisation Windows interdit de piloter Windows
Terminal ; l’examen graphique manuel des quatre libellés d’onglets reste donc
une validation humaine distincte, bien que les commandes, témoins et processus
confirment leur création dans la même fenêtre nommée.

## Fichiers concernés

Créés :

- `STOP_IC_LAB_NEXT.bat` ;
- `scripts/windows/stop-all.bat` ;
- `scripts/windows/launcher.ps1` ;
- `scripts/windows/service-host.ps1` ;
- `scripts/windows/launcher-services.json` ;
- `scripts/windows/test/launcher-smoke-test.ps1` ;
- `scripts/windows/test/fixture-server.js` ;
- `reports/160_ic_lab_next_windows_start_stop_report.md`.

Modifiés :

- `.gitignore` ;
- `START_IC_LAB_NEXT.bat` ;
- `scripts/windows/start-all.bat` ;
- `scripts/windows/README.md` ;
- `PROJECTS_LAUNCH.md` ;
- `docs/ARCHITECTURE.md` ;
- `STATUS.md`.

## Éléments non vérifiés et limites

- Le repli réel sur une machine dépourvue de Windows Terminal n’a pas été testé
  matériellement ; son chemin `-NoTerminal` est couvert par la fixture.
- La fermeture visuelle de chaque onglet est à confirmer par David. Les quatre
  superviseurs et processus Node étaient absents après STOP.
- Le nettoyage d’une instance historique volontairement ambiguë reste
  fail-closed : elle n’est pas tuée, et START nomme le port/PID bloquant.
- Les suites applicatives et FFmpeg n’ont pas été lancées, conformément au
  périmètre ciblé.

## Version et validation humaine

Les versions applicatives sont inchangées : Proto05 `0.1.53`, IC-Hub `0.10.4`,
Agent vocal `1.1.0` et package Dico-IC `1.0.0`.

Recette humaine minimale : double-cliquer sur `START_IC_LAB_NEXT.bat`, confirmer
la présence d’une seule fenêtre dédiée et des quatre onglets nommés, puis
double-cliquer sur `STOP_IC_LAB_NEXT.bat` et constater leur fermeture sans arrêt
du conteneur MariaDB.

## Proposition de message de commit

`feat(workspace): fiabiliser les lanceurs Windows globaux`
