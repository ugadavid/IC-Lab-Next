# 237 — Déménagement sur CODEX_VM et correctifs npm

**Le 26 novembre 2026, David a validé le redémarrage du laboratoire déjà en service par double-clic sur `START_IC_LAB_NEXT.bat` depuis l’Explorateur de la VM.** Il peut laisser les services du lancement précédent ouverts. Le [guide Windows](../scripts/windows/README.md#utilisation-quotidienne-sur-codex_vm) donne le geste quotidien, les emplacements transférés et le diagnostic PowerShell.

## Ce qui est arrivé sur la VM

| Élément | Relevé de David | Contrôle de Codex pendant la 237 |
|---|---|---|
| Instance SQL | Docker Desktop avec WSL 2, paquet WSL 3.0.5. MariaDB 11.8.6, conteneur `ic_dico_mariadb_next`, volume `ic_lab_next_mariadb_data`, port hôte `127.0.0.1:3306`. | Présence des clients Docker et WSL. La session n’a pas accès au canal du moteur Docker. |
| Bases et comptes | Export logique des trois bases sur Zenith Ice puis restauration sur la cible. David y a compté 34 tables dans `ic_augmented_video`, 8 dans `ic_dico` et 15 dans `ic_hub`. Reprise séparée des cinq comptes applicatifs et de leurs droits. Le Hub est resté en mode JSON sur ZI et sur la VM. | Comptages SQL, droits et mode actif attribués au relevé de David. |
| Configurations et historique | Copie via la session étendue de `.env` à la racine, `prototypes/05-augmented-ic-video-01/.env.local`, `prototypes/08-dico-seven-sieves/admin/.env` et `prototypes/00-ic-hub/server/data/runs.json`. | Présence des quatre fichiers vérifiée par leur chemin. |
| Médias et outils | Même transfert pour `video-library-media/` et `video-library-workspaces/` sous `prototypes/05-augmented-ic-video-01/data/` (21 fichiers, environ 0,47 Gio sur ZI), et pour `C:\Tools\FFmpeg`. | 15 fichiers dans le premier arbre et 6 dans le second. Présence de `bin\ffmpeg.exe` et `bin\ffprobe.exe`. Les empreintes des médias entre les deux machines n’ont pas été comparées pendant cette mission. |

Le schéma Proto05 porte les références des activités, des médias et de leurs versions lisibles. Les fichiers locaux correspondants ont retrouvé les deux arbres attendus sur la VM. Le nombre de vidéos du catalogue et le nombre de fichiers sur disque comptent des objets différents. Le [rapport 236](236_inventaire_reprise_zi_vm_report.md#relier-une-vidéo-à-son-fichier) détaille la correspondance.

## Validation humaine et diagnostic du lanceur

- **Vidéo augmentée** — David a constaté que Proto05 était disponible sur MariaDB, a vu les 27 vidéos du catalogue et a lu un média local.
- **Dico-IC et Seven Sieves** — David a ouvert la fiche **INFORMATION_DATA** (cinq formes, dix relations) et a vu l’écran apprenant Seven Sieves chargé.
- **Démarrage** — Services déjà actifs, David a double-cliqué sur `START_IC_LAB_NEXT.bat` dans l’Explorateur. Il a vu le lanceur reconnaître le lancement précédent et redémarrer tout le labo.
- **Windows PowerShell 5.1** — Pour le **même PID Node 7224**, `Get-Process` renvoyait un `Path` vide en x86. Appelé depuis ce shell via `Sysnative`, le PowerShell 64 bits lisait `C:\Users\codex\AppData\Local\Programs\nodejs\node.exe`. Codex a vérifié dans `Test-ServiceIdentity` que l’absence de chemin fait refuser l’identité avant tout arrêt. Le guide permet de refaire la comparaison avec le PID courant.

La validation fonctionnelle ci-dessus est celle de David. Pendant la 237, les quatre sondes HTTP locales ont rencontré un refus d’accès aux sockets et l’inspection des ports via CIM a été refusée. Codex n’a rejoué ni le redémarrage ni les écrans métier. Les appels IA, la voix et la totalité des médias n’ont pas fait l’objet d’une recette individuelle pendant cette clôture.

## Deux correctifs npm conservés

Au départ, les seules modifications suivies dans le clone étaient les deux `package-lock.json`. Les `package.json` et l’index Git étaient intacts. La comparaison du `HEAD` local `c52e52a` avec le `main` de départ `056e3e8` portait uniquement sur les missions et rapports antérieurs ou courants. Les verrouillages ont été conservés et contrôlés sur cette base distante.

| Composant | Paquets visés par les alertes initiales, avant → après | Autres changements de résolution dans le verrouillage |
|---|---|---|
| Hub (`prototypes/00-ic-hub/server`) | `mysql2` 3.22.5 → 3.24.6 | `iconv-lite` 0.7.2 → 0.7.3, `sql-escaper` 1.3.3 → 1.9.1. Retrait de `denque` 2.1.0. |
| Dico-IC (`prototypes/08-dico-seven-sieves/Node`) | `body-parser` 2.2.2 → 2.4.0, `mysql2` 3.22.2 → 3.24.6, `proxy-addr` 2.0.7 → 2.0.8, `qs` 6.15.1 → 6.17.1 | Mêmes évolutions de `iconv-lite`, `sql-escaper` et `denque`. `es-object-atoms` 1.1.1 → 1.1.2, `hasown` 2.0.3 → 2.0.4, `object-inspect` 1.13.4 → 1.14.0, `side-channel` 1.1.0 → 1.1.1, `type-is` 2.0.1 → 2.1.0. Ajout de `content-type` 2.1.0 sous `body-parser` et sous `type-is`. |

### Résultat des audits et de la réinstallation isolée

| Composant | Audit enregistré sur la VM le 26 novembre, après correction | `npm audit --json` relancé par Codex | `npm ci` de la 237 |
|---|---|---|---|
| Hub | Après `npm audit fix`, le registre a répondu HTTP 200 avec le rapport final `{}`. **0 alerte à cet instant**, code de sortie 0. | Code 1, `ENOTFOUND registry.npmjs.org`. Le registre n’a fourni aucun nouveau décompte. | 15 paquets, 15 versions conformes au verrouillage. `npm ls --all` réussi. |
| Dico-IC | Après son propre `npm audit fix`, le registre a répondu HTTP 200 avec le rapport final `{}`. **0 alerte à cet instant**, code de sortie 0. | Code 1, `ENOTFOUND registry.npmjs.org`. Le registre n’a fourni aucun nouveau décompte. | 79 paquets, 79 versions conformes au verrouillage. `npm ls --all` réussi. |

Codex a vérifié dans les journaux npm de la VM le composant ciblé, les alertes initiales et la dernière réponse du registre pour chacun des deux `npm audit fix`, tous deux lancés sans `--force`. Les versions corrigées des paquets visés sont également présentes dans les installations du clone.

Pour vérifier la reproductibilité, chaque `npm ci --offline --no-audit` a tourné sous Node 24.22.2 et npm 11.19.1, dans un dossier temporaire contenant les deux fichiers npm du composant et un cache alimenté avec ses archives publiques. L’arbre installé a été comparé à chaque entrée du verrouillage. Les modules des serveurs en service ont été préservés. Pour actualiser le résultat des audits depuis une session connectée, exécuter ces deux commandes depuis la racine du clone.

```powershell
npm.cmd --prefix prototypes/00-ic-hub/server audit
npm.cmd --prefix prototypes/08-dico-seven-sieves/Node audit
```

## Fichiers, versions et publication

1. [Commit des correctifs npm](https://github.com/ugadavid/IC-Lab-Next/commit/930f7d45fe94e7fafb7301f8b34f6b645aaec1bb) — `fix(deps): mettre à jour les dépendances npm du Hub et de Dico-IC`. Il contient les fichiers de verrouillage du [Hub](../prototypes/00-ic-hub/server/package-lock.json) et de [Dico-IC](../prototypes/08-dico-seven-sieves/Node/package-lock.json).
2. `docs(windows): documenter le déménagement et la recette sur CODEX_VM` — [guide Windows](../scripts/windows/README.md) et présent rapport, `reports/237_demenagement_vm_et_correctifs_npm_report.md`.

Les versions des packages applicatifs restent **0.10.4 pour le Hub** et **1.0.0 pour Dico-IC**. La correction porte sur les dépendances résolues. Aucun changement du lanceur, des comptes, des bases ou des fichiers privés pendant la 237.

Le Git de cette session ne résout pas `github.com` et ses métadonnées locales sont en lecture seule. La publication sur `origin/main` passe par la connexion GitHub en respectant le contenu Git des fichiers du clone. Le `HEAD` local reste à `c52e52a`. Les rapports 235 et 236, déjà publiés, sont conservés dans le clone. [Diagnostic initial de la 235](235_reprise_codex_vm_report.md) · [Mission 237](https://github.com/ugadavid/IC-Lab-Next/blob/056e3e84da3732ff6eb18a295a9b4cac8b80bb3e/missions/237_demenagement_vm_et_correctifs_npm.md)
