# État actuel d’IC-Lab-Next

**Date de l’état documenté : 16 juillet 2026**

## En bref

**Vérifié.** IC-Lab-Next est le workspace Git consolidé actuel d’IC-Lab. Il
contient cinq composants actifs, une architecture documentée et un launcher
Windows global aligné sur leurs serveurs déclarés. Les contrôles documentaires
du 16 juillet n’ont démarré aucun service : les ports et versions ci-dessous
décrivent le dépôt, pas leur disponibilité runtime instantanée.

**Prochaine étape.** Proto05 reste prioritaire. La priorité retenue est de
sécuriser sa livraison par des tests ciblés de visibilité, de sauvegarde et de
non-régression des données historiques avant tout chantier d’architecture plus
large.

## Composants actifs

| Composant | État retenu | Version importante | Exécution |
|---|---|---|---|
| **IC-Hub** | Vérifié dans le dépôt; portail et services transversaux actifs dans l’architecture | serveur/portail `0.10.3`; Hub historique `0.9.6` | Node `8790` |
| **Proto05 — Vidéo augmentée** | Fonctionnel lors de la dernière validation connue; prioritaire; encore provisoirement couplé au Hub | serveur `0.1.7`; moteur `index-0.0.8.html` | Node `8791` |
| **Proto06 — Agent vocal** | Actif et autonome; fonctions vocales dépendantes du navigateur | backend déclaré `1.1` (`package` `1.1.0`); runtime `1.2.3` | Node `8788` |
| **Informaticaire** | Démonstrateur statique gelé | gel `0.6.5` | servi par IC-Hub, sans port propre |
| **Dico-IC / Seven Sieves** | Actif en développement; API, administration et client réunis | contrat API `0.1`; package Node générique `1.0.0` | Node `3000` + MariaDB `3306` |

Les anciens prototypes racine `01` à `04` et BHE ne font pas partie du
périmètre actif. Seven Sieves reste présent dans le composant Dico-IC.

## Launcher global

**Vérifié.** [`START_IC_LAB_NEXT.bat`](START_IC_LAB_NEXT.bat) appelle les
launchers dans l’ordre suivant : Proto05 `8791`, IC-Hub `8790`, Agent vocal
`8788`, puis Dico-IC avec MariaDB `3306` avant Node `3000`. Le portail Hub est
ensuite ouvert, même si un service autonome manque.

[`check-status.bat`](scripts/windows/check-status.bat) vérifie Docker et
l’ouverture des cinq ports sans démarrer de service ni appeler d’endpoint HTTP.
Les launchers ne font ni installation npm, ni migration, ni import SQL, ni
réinitialisation de base. Voir [PROJECTS_LAUNCH.md](PROJECTS_LAUNCH.md).

## Proto05 — état prioritaire

### Vérifié

- serveur autonome, pages, API et JSON propres sur `127.0.0.1:8791` ;
- vues étudiant et enseignant, création, édition, atelier avancé et atelier
  guidé ;
- timeline IC partagée entre la vue étudiante et l’atelier guidé ;
- gestion des couches et de leur visibilité étudiante ;
- source d’activité dans
  `prototypes/05-augmented-ic-video-01/data/activities.json` ;
- écritures JSON validées, séquencées, atomiques et précédées d’une sauvegarde.

### Fonctionnel mais provisoire

- le HLS transite encore par le proxy strict d’IC-Hub `8790` vers la source UGA ;
- Proto05 sert `hls.js` depuis la dépendance installée dans le serveur Hub ;
- IC-Hub conserve des routes Proto05 héritées en lecture seule et une entrée de
  compatibilité qui redirige vers `8791` ;
- les modes étudiant et enseignant ne reposent pas sur une authentification ou
  des droits serveur réels ;
- les observations étudiantes restent en mémoire navigateur et export CSV.

### À faire maintenant

1. automatiser les tests de visibilité des couches et phénomènes étudiants ;
2. couvrir la sauvegarde en succès, HTTP non-2xx, JSON invalide, panne réseau et
   délai dépassé ;
3. vérifier la non-régression des volumes historiques et l’absence de
   réordonnancement parasite avant toute sauvegarde de démonstration.

Le nettoyage interne de `teacher-guided.html` vient après cette sécurisation et
doit conserver les comportements déjà validés.

## Données et services à préserver

- **Proto05** : `data/activities.json` et ses volumes historiques ; ne pas
  modifier ce fichier pour une simple recette.
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
identités et droits réels, IA d’assistance, migration MariaDB de Proto05,
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
