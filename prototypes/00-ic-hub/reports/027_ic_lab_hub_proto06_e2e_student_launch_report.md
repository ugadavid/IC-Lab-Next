# 027 - IC-Lab - Test end-to-end Hub V0.9.9 vers Proto06 V1.2.3

Date: 2026-07-03

## Resume executif

Le parcours etudiant complet a ete teste :

```txt
IC-Hub V0.9.9 -> assignation Proto06 -> lancement -> Prototype 06 V1.2.3 -> manifest Hub -> table ronde scenarisee -> traces sobres
```

Resultat : parcours valide. Le Hub genere une URL V1.2.3 avec `activitySource=hub-manifest` et `manifestId=climate-roundtable-demo`. Prototype 06 charge le manifest depuis IC-Hub, affiche les badges pedagogiques et demarre la table ronde avec le premier tour Clara issu du manifest Hub.

Aucun appel OpenAI n'a ete effectue. Aucun fichier applicatif Hub ou Prototype 06 n'a ete modifie. Deux runs de test ont ete crees puis nettoyes avant la fin de mission.

## Etat initial Git

Commandes lancees :

```bash
git status --short
git status --short -- prototypes/06-voice-agent-ic
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultats :

- `git status --short` : aucune sortie au debut de mission ;
- Prototype 06 : aucune sortie ;
- `runs.json` : aucun diff initial ;
- `sessions.json` : aucun diff initial.

## Serveurs testes

Hub :

```txt
GET http://127.0.0.1:8790/api/health -> 200
service: ic-hub-local
version: 0.9.9
store: json
```

Prototype 06 :

```txt
GET http://127.0.0.1:8788/api/health -> 200
service: proto06-connected-backend
version: 1.1
```

Remarque : le backend Proto06 expose encore `version: 1.1` sur son health endpoint, mais la page testee est bien `index-1.2.3.html`.

Manifest Hub :

```txt
GET /api/proto06/manifests/climate-roundtable-demo -> 200
manifestId: climate-roundtable-demo
status: published
title: Comprendre des constats climatiques
activityId: climateObservations001
```

## Parcours Hub etudiant

Session etudiante locale existante utilisee sans afficher le token.

Assignation verifiee via API :

```txt
GET /api/courses/course_demo_repli4c/activities
assignmentId: assign_demo_001
activitySource: hub-manifest
manifestId: climate-roundtable-demo
activityTitle: Comprendre des constats climatiques
ownership.activitySource: hub-manifest
```

Deux lancements reels ont ete crees pendant le test :

- `run_2c5415cd-75b9-4184-b8d6-e43a2139ec86` : verification API de l'URL generee, sans navigation ;
- `run_3267adb8-13b6-48fd-b768-9e786d82499f` : test navigateur complet.

## URL generee

URL de lancement du run navigateur, token expurge :

```txt
http://127.0.0.1:8788/index-1.2.3.html?activityId=climateObservations001&activitySource=hub-manifest&manifestId=climate-roundtable-demo&courseId=course_demo_repli4c&assignmentId=assign_demo_001&runId=run_3267adb8-13b6-48fd-b768-9e786d82499f&launchToken=[redacted]&aiConfigId=aicfg_proto06_scripted_browser_voice
```

Verifications :

- `index-1.2.3.html` : present ;
- `activitySource=hub-manifest` : present ;
- `manifestId=climate-roundtable-demo` : present ;
- `courseId=course_demo_repli4c` : present ;
- `assignmentId=assign_demo_001` : present ;
- `runId` : present ;
- `launchToken` : present dans l'URL reelle, expurge dans le rapport ;
- `aiConfigId=aicfg_proto06_scripted_browser_voice` : present.

## Chargement Proto06

Page testee dans le navigateur integre :

```txt
Prototype 06 V1.2.3 - Activite manifest Hub
```

Signaux visibles confirmes :

- source visible : `Source : IC-Hub` ;
- badge `Activite publiee` visible ;
- badge `Runtime scenarise` visible ;
- badge `IA reelle non active` visible ;
- titre : `Comprendre des constats climatiques` ;
- scene : `Constats climatiques` ;
- consigne issue du manifest : `Ecoutez les temoignages et reconstruisez le theme commun a partir d'indices partiels.` ;
- question commune issue du manifest : `Quels changements avez-vous compris et quels points communs reliez-vous entre les participants ?` ;
- personnages visibles : Clara, Marco, Ana ;
- langues visibles : espagnol, italien, portugais du Bresil.

## Premiere interaction scenarisee

Action navigateur :

```txt
clic sur "Demarrer la rencontre"
```

Resultat :

- personnage actif : Clara ;
- langue active : espagnol ;
- indices visibles : `veranos`, `largos`, `calurosos` ;
- premier tour affiche : `En Valencia los veranos son mas largos y mas calurosos.` ;
- le tour correspond au manifest Hub publie.

Aucune erreur console ni warning navigateur n'a ete observe.

## Lecture pedagogique

Le parcours donne une experience coherente pour un etudiant :

- le titre et la consigne expliquent rapidement ce qui est attendu ;
- la source IC-Hub rassure sur l'origine de l'activite ;
- les badges indiquent clairement que l'activite est publiee, scenarisee et sans IA reelle active ;
- le lien entre langues romanes, climat et intercomprehension est visible des l'ecran initial ;
- le premier tour Clara fournit un appui lexical clair avec les mots transparents.

Le palier est pedagogiquement testable pour une demonstration encadree.

## Traces observees

Run inspecte :

```txt
run_3267adb8-13b6-48fd-b768-9e786d82499f
status: started
activitySource: hub-manifest
eventCount: 5
```

Evenements observes :

- `proto_loaded`
- `activity_loaded`
- `ai_config_resolved`
- `agent_runtime_selected`
- `meeting_started`

Payloads observes :

- `proto_loaded` : `activityId`, `activitySource`, `href` expurge cote serveur sans `launchToken` ;
- `activity_loaded` : `activityId`, `activitySource`, `scenarioId`, `characterCount` ;
- `ai_config_resolved` : `aiConfigId`, `status`, `mode`, `runtimeEnabled=false` ;
- `agent_runtime_selected` : `assignedMode`, `selectedRuntime`, `fallback`, `generated=false` ;
- `meeting_started` : `activityId`, `activitySource`.

Verifications traces :

- aucun manifest complet stocke dans les evenements ;
- aucun texte complet de step stocke dans les evenements ;
- aucun texte apprenant complet stocke ;
- aucun `launchToken` stocke dans les payloads evenementiels ;
- aucun secret stocke ;
- traces compatibles avec une observation pedagogique sobre.

## Securite

Confirmations :

- aucun appel OpenAI effectue ;
- aucun endpoint IA modifie ;
- aucun appel navigateur vers `api.openai.com` observe ;
- aucun secret affiche ou journalise ;
- `.env` non modifie ;
- Prototype 06 non modifie ;
- Hub non modifie hors rapport ;
- aucun brouillon IA admin expose ;
- aucun texte apprenant envoye a OpenAI.

## Nettoyage runtime

Runs crees pendant le test :

- `run_2c5415cd-75b9-4184-b8d6-e43a2139ec86`
- `run_3267adb8-13b6-48fd-b768-9e786d82499f`

Decision : nettoyage avant commit, pour conserver la convention actuelle de ne pas versionner les runs de test.

Verification finale :

```bash
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultat : aucun diff final. Git signale seulement un warning CRLF lors de l'inspection de `runs.json`, sans changement de contenu.

## Etat final

Avant creation du rapport :

- aucun diff applicatif Hub ;
- aucun diff Prototype 06 ;
- aucun diff `runs.json` ;
- aucun diff `sessions.json`.

Apres creation du rapport, seul fichier attendu :

```txt
prototypes/00-ic-hub/reports/027_ic_lab_hub_proto06_e2e_student_launch_report.md
```

## Recommandation suivante

Le parcours Hub V0.9.9 vers Proto06 V1.2.3 est valide pour une demonstration locale.

Prochaine mission recommandee : une petite passe de documentation utilisateur/enseignant expliquant le flux `manifest publie -> assignation -> lancement etudiant -> traces sobres`, sans ajouter de fonctionnalite et sans modifier les endpoints IA.
