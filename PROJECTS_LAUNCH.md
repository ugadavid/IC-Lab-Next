# Lancement des projets IC-Lab-Next

Dernière vérification : **10 juillet 2026**

Ce document donne les points d’entrée courts du workspace consolidé. Les détails
propres à chaque composant restent dans leurs guides respectifs.

## IC-Lab Hub

- **Finalité** : portail local, comptes de démonstration, cours, activités et
  lancement des prototypes connectés.
- **Dossier** : `prototypes/00-ic-hub/server`
- **Version courante probable** : serveur `0.10.1`, interface Hub `0.9.6`.
- **État** : actif ; recette partielle sans authentification afin de ne créer
  aucune session.
- **Prérequis** : Node.js 18 ou plus récent et dépendances déjà installées.
- **Lancement** : `npm start` depuis le dossier du serveur.
- **Port** : `8790` par défaut.
- **Entrées** : <http://127.0.0.1:8790/> et
  <http://127.0.0.1:8790/hub.html>.
- **Arrêt** : `Ctrl+C` dans le terminal du serveur.
- **Données locales** : `server/data/` ; les sessions et traces runtime restent
  locales et ignorées.
- **Limites connues** : l’accès authentifié crée une session et n’a donc pas été
  exercé pendant la recette de reprise. Seul l’Agent vocal est actuellement
  connecté dans le catalogue ; les autres composants sont encore marqués
  `planned`.
- **Guide** : [README du serveur](prototypes/00-ic-hub/server/README.md).

## Vidéo augmentée d’intercompréhension

- **Finalité** : observation multimodale et timeline pédagogique d’une vidéo
  d’intercompréhension.
- **Dossier** : `prototypes/05-augmented-ic-video-01`
- **Version courante probable** : `0.0.6`.
- **État** : démonstrateur ; structure et ressources vérifiées, validation
  visuelle non effectuée dans le navigateur intégré.
- **Prérequis** : navigateur moderne et accès au flux HLS distant de l’UGA.
- **Lancement** : ouvrir `index-0.0.6.html` dans un navigateur.
- **Port** : aucun.
- **Entrée** :
  [`index-0.0.6.html`](prototypes/05-augmented-ic-video-01/index-0.0.6.html).
- **Arrêt** : fermer l’onglet.
- **Limites connues** : la vidéo courante dépend d’un flux HLS distant ; le
  navigateur intégré de recette refuse les URL locales `file://`.
- **Guide** : [README du prototype](prototypes/05-augmented-ic-video-01/README.md).

## Agent vocal IC

- **Finalité** : bibliothèque, composition et exécution de rencontres orales
  plurilingues.
- **Dossier serveur** : `prototypes/06-voice-agent-ic/server`
- **Version courante probable** : runtime connecté `1.2.3`, backend `1.1`.
- **État** : actif et en développement ; lancement réussi.
- **Prérequis** : Node.js 18 ou plus récent. Le backend n’a aucune dépendance npm
  externe déclarée.
- **Lancement** : `npm start` depuis le dossier serveur.
- **Port** : `8788` par défaut.
- **Entrées** : <http://127.0.0.1:8788/library-1.1.html>,
  <http://127.0.0.1:8788/index-1.2.3.html> et, pour inspection uniquement,
  <http://127.0.0.1:8788/sandbox-1.3-alpha.html>.
- **Arrêt** : `Ctrl+C` dans le terminal du serveur.
- **Données locales** : `server/data/activities.json`; les sauvegardes runtime
  restent ignorées.
- **Limites connues** : la synthèse et la reconnaissance vocales dépendent des
  capacités du navigateur. La génération IA de la sandbox est désactivée.
- **Guide** : [README du serveur](prototypes/06-voice-agent-ic/server/README.md).

## Informaticaire

- **Finalité** : mémoire communautaire, documentation et retrouvabilité des
  ressources d’intercompréhension.
- **Dossier** : `prototypes/07-informaticaire`
- **Version courante probable** : démonstrateur gelé `0.6.5`.
- **État** : gelé ; structure, scripts et parcours documenté vérifiés, validation
  visuelle non effectuée dans le navigateur intégré.
- **Prérequis** : navigateur moderne ; aucun serveur ni paquet externe.
- **Lancement** : ouvrir `index.html` dans un navigateur.
- **Port** : aucun.
- **Entrée** : [`index.html`](prototypes/07-informaticaire/index.html).
- **Arrêt** : fermer l’onglet.
- **Données locales** : `data.js`, chargé directement par la page.
- **Limites connues** : données dérivées d’entretiens à gouvernance humaine ; les
  PDF privés retirés ne sont pas nécessaires au runtime. Le navigateur intégré
  de recette refuse les URL locales `file://`.
- **Guides** : [README](prototypes/07-informaticaire/README.md) et
  [gel de démonstration](prototypes/07-informaticaire/DEMO_FREEZE.md).

## Dico-IC / Seven Sieves

- **Finalité** : service de connaissances plurilingues, administration et
  interface de lecture guidée Seven Sieves.
- **Dossier serveur** : `prototypes/08-dico-seven-sieves/Node`
- **Version courante probable** : API/administration V0, contrat d’analyse `0.1`.
- **État** : en développement ; validation de reprise réussie avec l’API et les
  deux interfaces connectées à la stack Docker actuelle d’IC-Lab-Next.
- **Prérequis** : Node.js, dépendances installées et stack Docker existante dans
  `prototypes/08-dico-seven-sieves`. Le projet Compose `08-dico-seven-sieves`
  utilise MariaDB `ic_dico_mariadb_next`, phpMyAdmin
  `ic_lab_next_phpmyadmin` et le volume externe
  `ic_lab_next_mariadb_data` sur `/var/lib/mysql`; MariaDB écoute sur `3306`.
  Ne pas initialiser une base fraîche dans le cadre d’une reprise.
- **Lancement** : `npm start` depuis le dossier `Node`, après vérification de la
  base existante.
- **Port** : `3000` par défaut.
- **Entrées** : <http://127.0.0.1:3000/admin-app/index-admin-0.1.html> et
  <http://127.0.0.1:3000/prototypes/01-seven-sieves/index-api-live-0.1.html>.
- **Contrôles API** : `GET /languages` et `POST /analysis` validés sans écriture
  de données ; validation humaine du clic « Analyser avec Dico-IC », résultats
  et enrichissements affichés dans Seven Sieves.
- **Arrêt** : `Ctrl+C` dans le terminal du serveur.
- **Limites connues** : MariaDB/Docker doit déjà être disponible. La
  canonicalisation SQL et l’initialisation d’une base fraîche restent hors
  périmètre et nécessitent une mission dédiée.
- **Guide** :
  [démarrage local](prototypes/08-dico-seven-sieves/docs/dico-local-development-startup.md).

## Résultat détaillé de la recette

Voir [`reports/002_workspace_recovery_validation_report.md`](reports/002_workspace_recovery_validation_report.md).
