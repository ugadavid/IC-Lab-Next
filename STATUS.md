# État actuel d’IC-Lab-Next

**Date de l’état documenté : 31 juillet 2026**

## En bref

**Vérifié.** IC-Lab-Next est le workspace Git consolidé actuel d’IC-Lab. Il
contient cinq composants actifs, une architecture documentée et un launcher
Windows global aligné sur leurs serveurs déclarés. Les contrôles documentaires
du 16 juillet n’ont démarré aucun service : les ports et versions ci-dessous
décrivent le dépôt, pas leur disponibilité runtime instantanée.

**Cutover Proto05 terminé.** MariaDB `ic_augmented_video` est l’unique autorité
runtime. Le sélecteur de stockage, les lectures/écritures et sauvegardes JSON,
ainsi que le repli JSON ont été retirés. Si MariaDB ou les grants applicatifs
sont indisponibles, le serveur HTTP reste ouvert en mode diagnostic, toutes les
routes métier répondent `503` et aucune donnée alternative n’est servie.

**Prochaine étape.** Créer une nouvelle activité depuis l’atelier guidé, à
partir d’un brouillon vide.

## Composants actifs

| Composant | État retenu | Version importante | Exécution |
|---|---|---|---|
| **IC-Hub** | Vérifié dans le dépôt; portail et services transversaux actifs dans l’architecture | serveur/portail `0.10.3`; Hub historique `0.9.6` | Node `8790` |
| **Proto05 — Vidéo augmentée** | Fonctionnel; MariaDB exclusive; serveur autonome | serveur `0.1.50`; moteur `index-0.0.9.html` | Node `8791` |
| **Proto06 — Agent vocal** | Actif et autonome; fonctions vocales dépendantes du navigateur | backend déclaré `1.1` (`package` `1.1.0`); runtime `1.2.3` | Node `8788` |
| **Informaticaire** | Démonstrateur statique gelé | gel `0.6.5` | servi par IC-Hub, sans port propre |
| **Dico-IC / Seven Sieves** | Actif en développement; API, administration et client réunis | contrat API `0.1`; package Node générique `1.0.0` | Node `3000` + MariaDB `3306` |

Les anciens prototypes racine `01` à `04` et BHE ne font pas partie du
périmètre actif. Seven Sieves reste présent dans le composant Dico-IC.

## Launcher global

**Vérifié le 1er août 2026.** [`START_IC_LAB_NEXT.bat`](START_IC_LAB_NEXT.bat)
effectue un redémarrage réel de Proto05 `8791`, IC-Hub `8790`, Agent vocal
`8788` et Dico-IC `3000`, puis les regroupe dans une fenêtre Windows Terminal.
Chaque processus est authentifié, son port et sa disponibilité HTTP sont
contrôlés, et le portail Hub est ouvert lorsque les quatre services sont prêts.

[`STOP_IC_LAB_NEXT.bat`](STOP_IC_LAB_NEXT.bat) arrête uniquement les processus
du lancement authentifié et peut être relancé sans erreur. Les deux lanceurs
globaux ne pilotent jamais Docker ni MariaDB ; `3306` est seulement vérifié en
lecture au démarrage.

[`check-status.bat`](scripts/windows/check-status.bat) vérifie Docker et
l’ouverture des cinq ports sans démarrer de service ni appeler d’endpoint HTTP.
Les launchers globaux ne font ni installation npm, ni migration, ni import SQL,
ni réinitialisation de base. Voir [PROJECTS_LAUNCH.md](PROJECTS_LAUNCH.md).

## Proto05 — état prioritaire

### Vérifié

- serveur autonome, pages et API sur `127.0.0.1:8791`, avec MariaDB obligatoire ;
- vues étudiant et enseignant, création, édition, atelier avancé et atelier
  guidé ;
- timeline IC partagée entre la vue étudiante et l’atelier guidé ;
- gestion des couches et de leur visibilité étudiante ;
- données métier dans MariaDB `ic_augmented_video`, via le canon des 47
  procédures stockées, des transactions ciblées et une relecture avant commit ;
- ateliers séparés d’anonymisation visuelle et audio ; le second persiste des
  plans multi-zones et produit des dérivations `soft-tone`, `beep` ou `silence` ;
- suppression explicite depuis la bibliothèque, avec confirmation titre/ID,
  refus des identifiants invalides ou ambigus et conservation des autres
  activités ;
- référentiel de langues lu depuis la table MariaDB `languages` ;
- locuteurs propres à chaque activité, gérés dans les ateliers avancé et guidé,
  sélectionnés par référence dans les segments, avec identifiants techniques
  générés et masqués, sans référentiel global ;
- `phenomena[].segmentId` comme source de vérité du rattachement des phénomènes;
  le cache inverse historique est strictement dérivé et validé ;
- visibilité des couches testée côté étudiant et enseignant ;
- sauvegarde enseignant testée en succès et dans les cas d’erreur prévus ;
- intégrité des données historiques testée sur fixture et copies temporaires ;
- suite complète de 55 tests réussie lors de la mission 039 ; la migration des
  langues a ensuite été vérifiée par 4 tests ciblés sans réexécuter cette suite,
  conformément au périmètre de la mission.

### Fonctionnel mais provisoire

- le HLS transite encore par le proxy strict d’IC-Hub `8790` vers la source UGA ;
- Proto05 sert `hls.js` depuis la dépendance installée dans le serveur Hub ;
- IC-Hub conserve des routes Proto05 héritées en lecture seule et une entrée de
  compatibilité qui redirige vers `8791` ;
- les modes étudiant et enseignant ne reposent pas sur une authentification ou
  des droits serveur réels ;
- les observations étudiantes restent en mémoire navigateur et export CSV.

### À faire maintenant

1. Créer une nouvelle activité depuis l’atelier guidé, à partir d’un brouillon
   vide.

## Données et services à préserver

- **Proto05** : MariaDB `ic_augmented_video` et les médias physiques sous
  `data/video-library-media/` et `data/video-library-workspaces/` ; toute recette
  doit employer des identifiants jetables et les nettoyer.
- **IC-Hub** : `server/data/`, ainsi que les sessions, runs et sauvegardes
  runtime locales ignorées par Git.
- **Proto06** : `server/data/activities.json` et ses sauvegardes runtime.
- **Informaticaire** : `data.js`; les données dérivées d’entretiens demandent une
  gouvernance humaine et les documents privés restent hors dépôt.
- **Dico-IC** : volume externe `ic_lab_next_mariadb_data`; ne jamais utiliser
  `docker compose down -v`. `database/current_draft/` n’est pas une source SQL
  canonique validée.
- **Workspace** : secrets `.env`, journaux, bases locales, dépendances et autres
  données runtime restent locaux et ignorés.

## Dernières validations réellement connues

- **16 juillet 2026 — sécurisation Proto05 (état historique antérieur au cutover)** : les [rapports 031](reports/031_prototype_05_layer_visibility_tests_report.md),
  [032](reports/032_prototype_05_save_tests_report.md) et
  [033](reports/033_prototype_05_data_regression_tests_report.md) consignent la
  couverture de la visibilité des couches, de la sauvegarde en succès et en
  erreur, et de l’intégrité des données historiques. La suite complète compte
  31 tests réussis et le témoin JSON de l’époque est resté identique pendant
  ces contrôles.
- **13 juillet 2026 — Proto05** : le [rapport 026](reports/026_prototype_05_daily_summary_2026-07-13.md)
  consigne `npm run check`, le parsing JavaScript, le healthcheck `0.1.7` sur
  `8791` et des validations Chromium de la timeline, des couches, de la
  visibilité et des retours de sauvegarde. Ces contrôles n’ont pas été rejoués
  pendant les missions documentaires du 16 juillet.
- **10 juillet 2026 — reprise du workspace** : le
  [rapport 002](reports/002_workspace_recovery_validation_report.md) consigne des
  validations Hub, Agent vocal et Dico-IC / Seven Sieves. Il précède toutefois
  l’autonomisation actuelle de Proto05 et certaines versions courantes.
- **16 juillet 2026 — documentation** : architecture, guide de lancement et
  liens locaux ont été contrôlés dans les [rapports 028](reports/028_workspace_architecture_documentation_report.md)
  et [029](reports/029_projects_launch_documentation_report.md), sans validation
  runtime.

## Travaux différés

**À faire plus tard, par missions séparées :** authentification Proto05,
identités et droits réels, IA d’assistance,
persistance des observations étudiantes, migration HLS complète hors IC-Hub,
retrait des routes héritées, canonicalisation SQL Dico-IC et initialisation
fiable d’une base Dico-IC fraîche.

**Hors périmètre immédiat :** refonte de l’atelier avancé, nouvelle API,
modification des launchers, réintégration des anciens prototypes, BHE, documents
privés, secrets et données runtime.

L’historique détaillé et les priorités secondaires restent dans les rapports,
notamment le [rapport 027](reports/027_prototype_05_remaining_work_roadmap.md).
Les frontières actuelles sont décrites dans
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
