# Mission 242 — Retrouver les versions d’un montage sur le serveur

## Essai sur CODEX_VM

**Avant le premier essai, appliquer et vérifier le schéma 008** selon la procédure ci-dessous. Le serveur de cette livraison est **Proto05 0.1.67**. La mission a laissé la base du catalogue en place.

1. Double-cliquer sur `START_IC_LAB_NEXT.bat`, puis ouvrir la [vidéothèque](http://127.0.0.1:8791/teacher/videos). Sur une carte de démonstration, cliquer sur **Anonymiser**. Si un choix de source apparaît, noter laquelle est utilisée. À la première visite, **Versions (0)** ouvre une liste vide.
2. Placer le curseur sur un visage, appuyer sur **M**, régler le masque et zoomer d’un cran. Cliquer sur **Enregistrer une version**, remplacer le nom proposé par **Visages seuls** et enregistrer. Le compteur passe à **1**.
3. Avancer un peu, appuyer sur **S** et choisir **Couper le son**. Enregistrer **Visages + voix**. La liste affiche cette version en premier, avec sa date et le bouton **Ouvrir**.
4. Redémarrer le labo par double-clic sur le lanceur. Dans un autre profil Edge ou Chrome, ouvrir la même carte et la même source. Cliquer sur **Versions (2)**, puis ouvrir **Visages seuls**. Vérifier le masque, le curseur, le zoom et **Ctrl+Z**, puis **Ctrl+Y**.
5. Déplacer le masque et enregistrer une troisième variante. Rouvrir les trois entrées. La première retrouve le masque d’origine, la deuxième sa coupure, la troisième le déplacement. Une autre source de la même carte a sa propre liste.

Pour conserver une retouche au moment d’ouvrir une autre version, choisir **Enregistrer le montage actuel…**. **Annuler** permet de continuer à retoucher. Le bouton à la disquette et **Ctrl+S** gardent leur rôle d’export de fichier JSON. La reprise automatique après F5 reste propre au navigateur.

## Passage de 007 à 008 sur la VM

Proto05 utilise `ic_augmented_video` dans MariaDB. La migration ajoute une table vide et deux procédures. Elle ne reprend aucun essai historique. Les médias restent à leur emplacement et la clé étrangère protège la source d’une version enregistrée. Le démarrage de Proto05 contrôle l’empreinte du schéma.

1. Depuis la racine du clone contenant la livraison, se placer dans `prototypes/05-augmented-ic-video-01/server`. Depuis une session ayant accès au Docker de la VM, exécuter d’abord le test ci-dessous. Il crée sa propre base temporaire, installe le schéma 007, crée un média de test, applique 008 et vérifie l’empreinte ainsi que les procédures. Il nettoie sa base en fin d’essai. **Attendre sa réussite avant de toucher au catalogue.**

   ```powershell
   node --test --test-name-pattern="workshop versions" test/schema-migrations.test.js
   ```

2. Arrêter les écritures de Proto05. Sauvegarder intégralement `ic_augmented_video` avec ses données, routines et registre. Vérifier la restauration sur une base isolée et garder la version applicative précédente pour le retour arrière. Le CLI permet aussi de sauvegarder le registre seul. La restauration complète est celle à prévoir en cas de DDL partiel.
3. Utiliser une session d’administration configurée pour la bonne instance. Les paramètres de connexion suivent les variables `PROTO05_MARIADB_*` du CLI. Le compte applicatif conserve ses droits habituels. Examiner le plan avant d’approuver l’écriture.

   ```powershell
   $plan = node --env-file=../.env.local scripts/schema-migrations.js plan | ConvertFrom-Json
   $plan | Select-Object database, action, latestVersion, planHash
   $plan.pendingMigrations
   ```

   Pour cette mise à niveau, attendre `database = ic_augmented_video`, `action = apply`, la dernière version `008` et **une seule migration en attente, 008**. En cas de divergence, conserver le diagnostic et interrompre l’application.
4. Après validation humaine de la sauvegarde, de la restauration et du plan, appliquer avec le compte de migration. Exécuter la commande suivante seulement si la précédente a réussi.

   ```powershell
   node --env-file=../.env.local scripts/schema-migrations.js apply "--plan-hash=$($plan.planHash)" "--confirm=APPLY PROTO05 SCHEMA MIGRATIONS"
   node --env-file=../.env.local scripts/schema-migrations.js verify
   ```

   Attendre `ok: true` et `schemaVersion: "008"`. Relancer le labo et vérifier **0.1.67** sur la [santé de Proto05](http://127.0.0.1:8791/api/health). Si l’application du DDL s’arrête, garder les écritures suspendues, relever la dernière instruction exécutée et revenir au couple sauvegarde vérifiée / code précédent avant une nouvelle tentative.

## Ce que conserve une version

| Élément | Comportement |
| --- | --- |
| Identité | Le couple vidéo du catalogue / version source choisie reste le même lorsque la préparation change. La route vérifie ce couple et la procédure de lecture le reprend dans son filtre. L’écriture vérifie aussi les identifiants du projet. |
| Contenu | Projet 241 au format `iclab-atelier` v2, avec passages image et son, coordonnées, sélection, curseur, zoom, fenêtre de temps, réglages de lecture et piles Ctrl+Z/Y. MariaDB ajoute un nom, un identifiant et la date UTC. Le navigateur affiche la date locale. |
| Enregistrement | Chaque action volontaire reçoit un UUID. La liste s’ordonne par création, y compris pour deux actions dans la même milliseconde. Un envoi sans réponse conserve sa copie et son UUID pour réessayer. Un même UUID associé à un contenu différent produit un conflit. Le succès suit le commit de la transaction. |
| Stockage et limites | Les données du projet sont limitées à 2 Mio par envoi. Un projet plus grand peut être conservé en JSON. Les versions serveur restent attachées à leur source, quel que soit le profil du navigateur. |

## Vérifications réalisées le 27 novembre 2026

| Contrôle | Résultat observé |
| --- | --- |
| Parcours interactif | Sur une vidéo de démonstration de six secondes, deux profils Edge Chromium initialement vides ont ouvert l’atelier depuis la carte. Le premier a créé les deux versions. Proto05 a été arrêté proprement (PID 6420), puis relancé (PID 15440). Le deuxième profil a retrouvé les deux noms et a créé et rouvert la troisième variante. |
| Fidélité | Les exports JSON complets de **Visages seuls** et **Visages + voix** avaient chacun la même empreinte SHA-256 avant l’arrêt et après réouverture dans le deuxième profil. Ctrl+Z/Y a retiré puis restauré le masque. Les trois variantes ont conservé leurs propres passages. |
| Échec et remplacement | Un double envoi puis la perte simulée de la première confirmation ont laissé le brouillon disponible. La nouvelle tentative a produit une seule ligne. **Annuler** a préservé la retouche. **Enregistrer le montage actuel…** avec le nom proposé a créé une copie supplémentaire, puis ouvert la version demandée. |
| Isolation | Une autre source a renvoyé une liste vide. Une lecture croisée a renvoyé 404, un projet d’une autre source 400, une réutilisation d’UUID avec contenu différent 409. Après renouvellement d’une préparation HLS de test, sa version de montage s’est rouverte. |
| Visuel | Fenêtre Edge 1280 × 800. La liste à deux entrées, ses dates et les trois boutons tenaient dans un dialogue de 544 × 233 pixels. Le rendu Chromium a été inspecté. Aucune erreur JavaScript de page relevée sur le parcours terminé. |
| Contrat et régressions | Le chargeur de migrations lit les trois instructions 008. En retirant uniquement les objets ajoutés du manifeste 008, on retrouve exactement le manifeste 007. Les tests existants de temps, d’annotations et d’audio ont produit 15 réussites, dont le traitement FFmpeg. |

**Portée de la preuve.** La recette a exécuté les pages d’atelier, deux processus Node du serveur, les gestionnaires des routes et les adaptateurs de lecture/écriture du projet. Le catalogue, la préparation et le transport étaient pilotés sur fixture. Le pilote SQL de recette a utilisé SQLite sur disque pour simuler les appels MariaDB. Cette persistance a servi uniquement au test.

Le compte d’exécution ne pouvait pas accéder au moteur Docker de la VM. Le test d’intégration 008 et le test HTTP audio existant ont donc bloqué avant leur scénario MariaDB. La migration sur moteur MariaDB, son empreinte effective et l’essai sur le catalogue de David restent à vérifier selon la procédure ci-dessus. David a validé sur sa propre vidéo le flou, la coupure et Ctrl+Y après F5 de la mission 241. La validation humaine des versions serveur commence avec cette livraison.

## Fichiers livrés

Sous `prototypes/05-augmented-ic-video-01/` :

- `teacher-video-workshop.html`, `shared/workshop-timeline.css`, `shared/workshop-timeline.js`, `shared/workshop-versions.js` et `shared/workshop-project.js` pour les commandes, les dialogues et le format partagé.
- `server/server.js`, `server/proto05-read-boundary.js`, `server/proto05-write-boundary.js`, `server/proto05-mariadb-readonly.js` et `server/proto05-mariadb-write.js` pour les routes, transactions et lectures ciblées.
- `database/schema-migrations/manifest.json`, `008_proto05_workshop_versions.sql` et `008_proto05_workshop_versions.manifest.json` dans le même répertoire, ainsi que `server/test/schema-migrations.test.js` pour le passage 007 → 008.
- `server/package.json`, `server/README.md` et `ANONYMIZATION_ENGINE.md` pour le repère de version et la documentation. L’incrément **0.1.66 → 0.1.67** identifie cette évolution du serveur. Le format JSON du projet reste à **2**.

Rapport — `reports/242_versions_montage_serveur_report.md`. Message de commit — `Proto05 0.1.67 — Enregistrer et rouvrir les versions de montage`.

La prochaine étape est la validation de ces versions sur le catalogue de la VM. L’ancien éditeur reste accessible pour cette recette.
