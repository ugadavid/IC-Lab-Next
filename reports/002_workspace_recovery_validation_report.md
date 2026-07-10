# Rapport 002 — Recette de reprise du workspace consolidé

Date : **10 juillet 2026**

Base vérifiée : `f063ecf60a95eee912c4d9ec8c0cf2888a1acb64` sur `main`

## Objet

Cette recette vérifie les points d’entrée des cinq composants depuis la nouvelle
racine consolidée. Elle n’ajoute aucune fonctionnalité, ne lance aucune
migration et ne réinitialise aucune base.

## État initial

- racine Git : `J:\2026\UGA\M2\Stage-Memoire\Applications\IC-Lab-Next` ;
- branche : `main` ;
- workspace initial propre ;
- aucun dépôt Git imbriqué ;
- cinq composants attendus présents.

## Synthèse

| Composant | Statut de recette | Résultat principal |
|---|---|---|
| IC-Lab Hub | Lancement partiel | Serveur, healthcheck et interfaces publiques accessibles ; authentification non exercée pour préserver les sessions |
| Vidéo augmentée | Validation partielle | HTML, script et ressources présents ; validation visuelle bloquée par la politique `file://` du navigateur intégré |
| Agent vocal IC | Lancement réussi | Backend, bibliothèque, runtime V1.2.3, images et garde-fous IA validés |
| Informaticaire | Validation partielle | Scripts, ressources et parcours de démo présents ; validation visuelle bloquée par la politique `file://` |
| Dico-IC / Seven Sieves | Lancement partiel, API bloquée | Serveur et pages statiques accessibles ; MariaDB absente, endpoints métier en erreur 500 |

## IC-Lab Hub

### Lancement vérifié

- répertoire : `prototypes/00-ic-hub/server` ;
- commande réellement lancée : `node server.js` ;
- commande documentée équivalente : `npm start` ;
- port : `8790` ;
- `GET /api/health` : `200`, service `ic-hub-local`, version serveur `0.10.1`,
  stockage JSON ;
- `npm run check` : réussi.

La page de connexion et le Hub V0.9.6 se chargent sans erreur console ni image
cassée. Les redirections courantes vers le Hub, Teacher, Student et Admin sont
cohérentes.

L’authentification n’a pas été exécutée : elle crée une session locale, ce qui
aurait contredit l’exigence de ne modifier ni comptes, ni sessions, ni traces.
Les endpoints protégés retournent donc normalement `401` sans session.

Le chemin de l’Agent vocal est cohérent : sa bibliothèque et son runtime pointent
vers `127.0.0.1:8788` et répondent. Les quatre autres entrées du catalogue restent
marquées `planned`; il s’agit d’une dette fonctionnelle antérieure, pas d’un
défaut de relocalisation corrigible dans cette mission.

## Vidéo augmentée

La page courante est `index-0.0.6.html`. Son script inline passe le contrôle de
syntaxe et contient la timeline, les segments, la navigation par couches, la
sélection d’observations et l’export CSV. Les fichiers compagnons MP3, PDF et PNG
sont présents.

La vidéo affichée dépend toutefois d’un flux HLS distant de l’UGA. Le navigateur
intégré a refusé l’URL locale `file://`; aucune validation visuelle, console ou
interaction réelle avec la timeline n’a donc été effectuée. Aucun serveur
artificiel n’a été ajouté pour contourner cette limite.

## Agent vocal IC

### Lancement vérifié

- répertoire : `prototypes/06-voice-agent-ic/server` ;
- commande réellement lancée : `node server.js` ;
- commande documentée équivalente : `npm start` ;
- port : `8788` ;
- `GET /api/health` : `200`, backend version `1.1` ;
- `GET /api/activities` : `200`, une activité serveur ;
- `npm run check` : réussi.

La bibliothèque V1.1 charge cinq activités, dont les activités natives et
serveur. Le runtime connecté V1.2.3 est accessible. Tous les PNG non vides du
parcours courant chargent correctement après retrait des PSD.

Le démarrage minimal de la rencontre fait évoluer l’état de l’interface. La
synthèse vocale est interrompue dans le navigateur automatisé, sans erreur
console ; cette capacité reste dépendante du navigateur et de ses voix locales.

La sandbox V1.3-alpha confirme `providerEnabled: false`,
`generationEnabled: false` et présente un bouton de génération désactivé. Aucun
provider externe n’a été appelé.

## Informaticaire

`index.html` référence correctement `styles.css`, `data.js` et `script.js`. Les
deux scripts passent `node --check`. Aucune référence runtime aux PDF
d’entretiens retirés n’a été trouvée.

Les sources contiennent toujours les fonctions documentées de recherche,
navigation par fiches, modale, exports, visite en cinq étapes et démo Galanet.
Les données dérivées d’entretiens n’ont pas été modifiées.

Le navigateur intégré a refusé l’URL locale `file://`. L’ouverture visuelle, les
clics de navigation et le parcours gelé ne sont donc pas validés dans cette
recette.

## Dico-IC / Seven Sieves

### Lancement vérifié

- répertoire : `prototypes/08-dico-seven-sieves/Node` ;
- commande réellement lancée : `node server.js` ;
- commande documentée équivalente : `npm start` ;
- port : `3000` ;
- administration : réponse HTTP `200` ;
- Seven Sieves interne : réponse HTTP `200` ;
- tests Node : **101 réussis, 0 échec**.

Le serveur Node démarre et les ressources statiques des deux interfaces sont
accessibles sans chemin cassé. L’administration et Seven Sieves affichent
correctement l’indisponibilité de l’API.

Docker Desktop n’était pas actif et aucun service n’écoutait sur `3306`. En
conséquence :

- `GET /languages` : `500` ;
- `POST /analysis` avec une requête stateless non destructive : `500` ;
- aucun test réel de connexion ou de lecture MariaDB n’a pu réussir.

Docker n’a pas été démarré, aucune base fraîche n’a été initialisée et aucune
migration n’a été lancée. La canonicalisation SQL reste hors périmètre.

## Intégrité des données et arrêt

Les empreintes SHA-256 des comptes, cours, inscriptions, sessions, traces Hub et
activités de l’Agent vocal sont identiques avant et après la recette. Le nombre
de sauvegardes de l’Agent vocal est inchangé.

Les trois processus Node lancés pour la recette ont été arrêtés. Les ports
`3000`, `8788` et `8790` ne sont plus en écoute.

## Corrections et documentation

Aucune correction de code ou de configuration n’était nécessaire pour un défaut
directement causé par la relocalisation.

Création de :

- `PROJECTS_LAUNCH.md` ;
- `reports/002_workspace_recovery_validation_report.md`.

Aucun rapport historique n’a été modifié.

## Suites recommandées

1. Refaire la validation Dico-IC avec Docker/MariaDB existante disponible, sans
   initialisation ni migration.
2. Effectuer une recette visuelle manuelle des deux pages statiques dans un
   navigateur autorisant `file://`, notamment timeline vidéo et parcours gelé
   Informaticaire.
3. Décider humainement si le Hub doit connecter les quatre composants encore
   marqués `planned`.
4. Traiter séparément la canonicalisation SQL et l’initialisation d’une base
   Dico-IC fraîche.
