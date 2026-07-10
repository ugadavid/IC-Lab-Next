# 024 - IC-Hub V0.9.8 - Endpoint lecture seule de manifests Proto06 publies

Date: 2026-07-03

## Resume executif

IC-Hub V0.9.8 ajoute un premier registre JSON local de manifests Proto06 publies et un endpoint lecture seule.

Objectif atteint : le Hub expose `climate-roundtable-demo` comme ressource pedagogique publiee / relue humainement, sans connecter les brouillons IA admin, sans appeler OpenAI, sans modifier Prototype 06 et sans modifier les fichiers runtime.

Endpoints ajoutes :

- `GET /api/proto06/manifests`
- `GET /api/proto06/manifests/:manifestId`

Le detail retourne le manifest complet. La liste retourne uniquement des metadonnees courtes, sans `meeting.steps`.

## Etat initial Git

Commandes lancees :

```bash
git status --short
git status --short -- prototypes/06-voice-agent-ic prototypes/06-*
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultats :

- `git status --short` : aucune sortie au debut de mission.
- Prototype 06 : aucune sortie.
- `runs.json` : aucun diff.
- `sessions.json` : aucun diff.

## Fichiers modifies / crees

Fichiers modifies :

- `server/server.js`

Fichiers crees :

- `server/data/proto06-manifests.json`
- `reports/024_ic_hub_v0.9.8_proto06_manifest_endpoint_report.md`

Fichiers inspectes :

- `server/stores/mariadbStore.js`
- `server/data/prototypes.json`
- `server/data/course-activities.json`
- `server/data/activity-ownership.json`
- `server/data/courses.json`
- `server/data/institutions.json`
- `reports/020_ic_lab_hub_proto06_integration_audit.md`
- `../06-voice-agent-ic/data/proto06-manifests/climate-roundtable-demo.json`
- `../06-voice-agent-ic/reports/023_proto06_v1.2.2_manifest_pedagogical_polish_report.md`

## Structure de stockage choisie

Stockage JSON local :

```txt
server/data/proto06-manifests.json
```

Structure :

```json
{
  "version": "0.9.8",
  "updatedAt": "2026-07-03T00:00:00.000Z",
  "manifests": []
}
```

Le store est aussi declare dans `server.js` :

- `stores.proto06Manifests = "proto06-manifests.json"`;
- `defaultStores.proto06Manifests`.

Choix volontaire : l'endpoint lit ce store via `readLocalJson("proto06Manifests")`, y compris si le Hub tourne en mode MariaDB. Cela evite d'ajouter une table MariaDB prematuree et evite de perturber le store MariaDB existant pour ce palier lecture seule.

## Manifest expose

Manifest ajoute :

- `manifestId`: `climate-roundtable-demo`
- `status`: `published`
- `review.reviewStatus`: `human-reviewed`
- `prototype.id`: `proto06`
- `prototype.minVersion`: `1.2.2`
- `meeting.runtime`: `scripted`
- `meeting.steps[]`: trois tours non generes, sources `human-reviewed`
- `safety.generatedLive`: `false`
- `safety.openAiInLearnerFlow`: `false`
- `safety.containsLearnerText`: `false`
- `safety.serverStored`: `true`

Le manifest ne contient ni secret, ni prompt, ni provider IA, ni token de lancement, ni texte apprenant.

## Endpoints ajoutes

### `GET /api/proto06/manifests`

Retourne une liste courte :

- `manifestId`
- `title`
- `shortTitle`
- `status`
- `prototype.id`
- `targetLanguages`
- `climateThemes`
- `review.reviewStatus`

La liste ne retourne pas `meeting.steps`.

### `GET /api/proto06/manifests/:manifestId`

Retourne le manifest complet si le manifest est trouve et publiable.

Comportements :

- `200` pour `climate-roundtable-demo`;
- `404` pour un manifest absent;
- un manifest invalide ou non publiable n'est pas expose.

Les routes sont placees avant `requireUser`, comme endpoints lecture seule publics. Aucun login n'est necessaire, ce qui evite de modifier `sessions.json` pendant les tests.

## Validation des manifests

Validation serveur ajoutee avant exposition :

- schema attendu : `ic-lab-proto06-activity-manifest`;
- presence de `schemaVersion`;
- presence de `manifestId`;
- `status` limite a `published` ou `human-reviewed`;
- `review.reviewStatus === "human-reviewed"`;
- `prototype.id === "proto06"`;
- presence de `characters[]`;
- presence de `meeting.steps[]`;
- chaque step doit avoir `characterId`, `text`, `languageId`;
- chaque step doit avoir `generated === false`;
- chaque step doit avoir une source relue humainement;
- `safety.generatedLive === false`;
- `safety.openAiInLearnerFlow === false`;
- `safety.containsLearnerText === false`;
- rejet de cles sensibles de type api key, launch token, prompt, provider ou modele.

En cas de manifest invalide, le serveur loggue uniquement :

```txt
[proto06-manifest] hidden <manifestId>: <raisons>
```

Aucun contenu sensible n'est loggue.

## Tests HTTP

Serveur Hub redemarre sur le port `8790`.

Health :

```txt
GET /api/health -> 200
version: 0.9.8
store: json
```

Liste :

```txt
GET http://127.0.0.1:8790/api/proto06/manifests -> 200
```

Resultat : une entree `climate-roundtable-demo`, metadonnees courtes uniquement.

Detail :

```txt
GET http://127.0.0.1:8790/api/proto06/manifests/climate-roundtable-demo -> 200
```

Resultat : manifest complet retourne.

Absent :

```txt
GET http://127.0.0.1:8790/api/proto06/manifests/does-not-exist -> 404
```

Auth existante :

```txt
GET /api/auth/me sans token -> 401
```

Aucun login n'a ete lance afin de ne pas modifier `sessions.json`.

## Securite

Confirme :

- aucun appel OpenAI effectue;
- aucun endpoint IA modifie;
- aucun brouillon IA admin expose;
- aucun lien entre l'AI Lab admin et les manifests;
- aucun fichier Prototype 06 modifie;
- aucun fichier `.env` modifie;
- aucun secret affiche, loggue ou copie;
- aucun texte apprenant dans le manifest;
- aucun manifest complet stocke dans `run_events`;
- `runs.json` et `sessions.json` sans diff.

Nuance importante : le serveur Hub possede deja un chargeur `.env` historique au demarrage (`loadRootEnv`). Cette mission n'ajoute aucune lecture `.env` et l'endpoint manifest ne lit pas `.env`.

Recherche statique :

- `server/data/proto06-manifests.json` ne contient pas `OPENAI_API_KEY`;
- `server/data/proto06-manifests.json` ne contient pas `api.openai.com`;
- le diff de `server.js` ne modifie pas `handleAdminAi` ni les routes `/api/admin/ai/*`;
- les seules mentions OpenAI dans le diff proviennent des imports et champs existants ou du nom de safety `openAiInLearnerFlow`.

## Checks

Commandes lancees :

```bash
node --check prototypes/00-ic-hub/server/server.js
node --check prototypes/00-ic-hub/server/stores/mariadbStore.js
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
git status --short -- prototypes/06-voice-agent-ic prototypes/06-*
```

Resultats :

- `server.js` : OK.
- `stores/mariadbStore.js` : OK.
- `runs.json` / `sessions.json` : aucun diff.
- Prototype 06 : aucune sortie.

## Confirmation Prototype 06 non modifie

Commande :

```bash
git status --short -- prototypes/06-voice-agent-ic prototypes/06-*
```

Resultat : aucune sortie.

## Etat Git final

Changements attendus :

```txt
 M prototypes/00-ic-hub/server/server.js
?? prototypes/00-ic-hub/server/data/proto06-manifests.json
?? prototypes/00-ic-hub/reports/024_ic_hub_v0.9.8_proto06_manifest_endpoint_report.md
```

## Recommandation pour le palier suivant

Palier suivant recommande, sans le faire dans cette mission :

**Prototype 06 V1.2.3 - charger un manifest depuis le Hub**

Perimetre prudent :

- ajouter un parametre `manifestUrl` ou `activitySource=hub-manifest`;
- charger `GET /api/proto06/manifests/:manifestId` depuis le Hub;
- conserver le fallback local;
- ne pas appeler OpenAI;
- ne pas activer de generation IA;
- ne pas envoyer le manifest complet dans `run_events`.

Le Hub V0.9.8 est maintenant pret comme source de verite pedagogique lecture seule pour un premier manifest Proto06 publie.
