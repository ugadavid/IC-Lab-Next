# 026 - IC-Hub V0.9.9 - Lancement d'une assignation Proto06 via manifest Hub

Date: 2026-07-03

## Resume executif

IC-Hub V0.9.9 relie les assignations Proto06 aux manifests Hub publies.

Une assignation peut maintenant porter un `manifestId` court. Au lancement etudiant, le Hub valide que le manifest existe, qu'il est publie, relu humainement et compatible avec les garde-fous, puis genere une URL vers Prototype 06 V1.2.3 avec :

```txt
activitySource=hub-manifest
manifestId=climate-roundtable-demo
courseId=...
assignmentId=...
runId=...
launchToken=...
aiConfigId=...
```

Aucun manifest complet n'est stocke dans l'assignation. Aucun appel OpenAI n'a ete effectue. Prototype 06 n'a pas ete modifie.

## Etat initial

Commandes lancees :

```bash
git status --short
git status --short -- prototypes/06-voice-agent-ic
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultats :

- etat Git initial : propre ;
- Prototype 06 : aucun diff ;
- `runs.json` et `sessions.json` : aucun diff.

## Fichiers modifies

- `server/server.js`
- `server/stores/mariadbStore.js`
- `server/data/prototypes.json`
- `server/data/course-activities.json`
- `server/data/activity-ownership.json`

Fichier cree :

- `reports/026_ic_hub_v0.9.9_proto06_manifest_assignment_launch_report.md`

## Changements serveur

- Version Hub passee a `0.9.9`.
- URL de lancement Proto06 mise a jour vers `http://127.0.0.1:8788/index-1.2.3.html`.
- Ajout d'une validation reutilisable des manifests publies :
  - manifest existant ;
  - schema valide ;
  - status publie ;
  - `review.reviewStatus === "human-reviewed"` ;
  - `safety.generatedLive === false` ;
  - `safety.openAiInLearnerFlow === false` ;
  - `safety.containsLearnerText === false` ;
  - `safety.containsApiKey === false`.
- Ajout de `manifestId` dans le flux d'assignation Proto06.
- Lancement etudiant : si l'assignation porte un manifest, l'URL force `activitySource=hub-manifest` et ajoute `manifestId`.
- En mode MariaDB, le `manifestId` reste porte par le snapshot court, sans migration de schema.

## Donnees de demonstration

L'assignation `assign_demo_001` du cours `course_demo_repli4c` reference maintenant :

- `activityId`: `climateObservations001`
- `activitySource`: `hub-manifest`
- `manifestId`: `climate-roundtable-demo`
- snapshot court : titre, objectif, scenario, personnages, statut et review.

Un ownership court `own_proto06_climateObservations001_hub_manifest` a ete ajoute pour conserver l'enrichissement cote cours, sans stocker le manifest complet.

## Tests HTTP

Hub redemarre sur le port `8790`.

```txt
GET /api/health -> 200
version: 0.9.9
store: json
```

```txt
GET /api/proto06/manifests -> 200
version: 0.9.9
manifestCount: 1
```

```txt
GET /api/proto06/manifests/climate-roundtable-demo -> 200
manifestId: climate-roundtable-demo
status: published
activityId: climateObservations001
```

```txt
GET /api/proto06/manifests/does-not-exist -> 404
```

## Test lancement assignation

Appel effectue avec une session etudiante locale existante, sans afficher le token :

```txt
POST /api/runs/start
courseId=course_demo_repli4c
assignmentId=assign_demo_001
```

Resultat : `201 Created`.

URL de lancement expurgee :

```txt
http://127.0.0.1:8788/index-1.2.3.html?activityId=climateObservations001&activitySource=hub-manifest&manifestId=climate-roundtable-demo&courseId=course_demo_repli4c&assignmentId=assign_demo_001&runId=...&launchToken=[redacted]&aiConfigId=aicfg_proto06_scripted_browser_voice
```

Verifications :

- `index-1.2.3.html` present dans l'URL ;
- `activitySource=hub-manifest` present ;
- `manifestId=climate-roundtable-demo` present ;
- `courseId`, `assignmentId`, `runId`, `launchToken` presents ;
- `aiConfigId` conserve.

Le run de test cree pour cette verification a ete retire de `runs.json` apres test. Le diff final de `runs.json` et `sessions.json` est vide.

## Test erreur manifest non publiable

Tentative d'assignation avec `manifestId=does-not-exist` :

```txt
POST /api/courses/course_demo_repli4c/activities -> 400
```

Reponse :

```json
{
  "error": "Manifest Proto06 introuvable ou non publiable.",
  "manifestId": "does-not-exist"
}
```

Aucun crash serveur et aucune assignation creee.

## Verifications techniques

```bash
node --check server.js
node --check stores/mariadbStore.js
node -e "JSON.parse(... stores modifies ...)"
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
git status --short -- prototypes/06-voice-agent-ic
```

Resultats :

- `server.js` : OK ;
- `stores/mariadbStore.js` : OK ;
- JSON modifies : OK ;
- `runs.json` / `sessions.json` : aucun diff final ;
- Prototype 06 : aucun diff.

## Securite

- Aucun appel OpenAI effectue.
- Aucun appel navigateur vers OpenAI ajoute.
- Aucun endpoint IA modifie.
- Aucun secret lu, affiche ou copie.
- Le `launchToken` est transmis dans l'URL de lancement mais n'est pas journalise dans le rapport.
- Aucun manifest complet n'est duplique dans les assignations.
- Les donnees runtime `sessions.json` et `runs.json` restent sans diff final.

## Limites restantes

- Le support MariaDB conserve le `manifestId` dans `activity_snapshot_json`, sans colonne dediee. C'est volontaire pour eviter une migration prematuree.
- Les tests MariaDB complets n'ont pas ete relances dans cette passe.
- Le flux navigateur complet Hub -> Prototype 06 V1.2.3 n'a pas ete rejoue visuellement dans cette mission ; la generation d'URL serveur a ete verifiee par appel HTTP.

## Recommandation

Pret pour commit V0.9.9 cote Hub.

La prochaine passe peut tester le parcours complet dans le navigateur : etudiant Hub, clic `Lancer`, chargement Proto06 V1.2.3, lecture du manifest Hub et emission des traces scenarisees.
