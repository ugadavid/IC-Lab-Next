# 020 - IC-Lab - Audit integration Hub -> Prototype 06

Date: 2026-07-03

## Resume executif

Cette mission est un audit d'integration. Aucun fichier applicatif n'a ete modifie, Prototype 06 n'a pas ete modifie, aucun appel OpenAI n'a ete lance et aucun fichier runtime n'a ete touche.

Conclusion generale : l'integration Hub -> Prototype 06 existe deja sur une base solide pour le lancement, les assignations et les traces minimales. Le point manquant n'est pas un branchement IA direct, mais un contrat pedagogique explicite : un `proto06ActivityManifest` publie, relu humainement, que Prototype 06 peut consommer sans generer de texte en direct.

Recommandation : avancer par paliers. D'abord stabiliser un manifest statique lisible par Prototype 06, puis le servir depuis le Hub, puis le relier aux assignations, puis seulement ensuite relier les brouillons IA admin a un processus de publication humaine. Le manifest doit etre du contenu pedagogique valide, pas un brouillon IA brut.

## Etat Git initial

Commandes lancees :

```bash
git status --short
git status --short -- prototypes/06-voice-agent-ic prototypes/06-*
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultats :

```txt
?? prototypes/00-ic-hub/reports/019_ic_hub_v0.9.7.1_admin_ux_narrative_review.md
```

- Prototype 06 : aucune sortie, donc aucune modification detectee.
- `runs.json` : aucun diff.
- `sessions.json` : aucun diff.
- Le rapport 019 etait deja non suivi au debut de cette mission.

## Rappel des garde-fous

- Ne pas modifier Prototype 06 dans cette mission.
- Ne pas lire, afficher, logger ou copier `OPENAI_API_KEY`.
- Ne pas appeler OpenAI.
- Ne pas ajouter d'appel OpenAI depuis le navigateur.
- Ne pas envoyer de texte apprenant a OpenAI.
- Ne pas ecrire de brouillons IA dans `run_events`.
- Ne pas modifier `runs.json` ou `sessions.json`.
- Ne pas stocker les evaluations IA admin en base.
- Conserver JSON et MariaDB.

## Etat actuel de Prototype 06

Fichiers inspectes :

- `prototypes/06-voice-agent-ic/index-1.2.html`
- `prototypes/06-voice-agent-ic/script-1.2.js`
- `prototypes/06-voice-agent-ic/data-1.1.js`
- `prototypes/06-voice-agent-ic/server/server.js`
- `prototypes/06-voice-agent-ic/server/data/activities.json`
- `prototypes/06-voice-agent-ic/20260702_proto06_v1.2_agent-runtime-skeleton_report.md`

Constats principaux :

- La V1.2 lit deja les parametres `activityId`, `activitySource`, `courseId`, `assignmentId`, `runId`, `launchToken` et `aiConfigId`.
- Le lancement Hub fonctionne par URL vers `index-1.2.html`.
- Le backend local Proto06 expose `/api/activities` et `/api/activities/:id` sur le port 8788.
- Le format d'activite actuel est leger : `id`, `title`, `pedagogicalGoal`, `scenarioId`, `characterIds`, `languages`, `climateThemes`, `instructions`, `commonQuestion`, `teacherNotes`.
- Prototype 06 reconstruit la rencontre a partir des catalogues locaux : `characterCatalog`, `languageCatalog`, `placeCatalog`, `scenarioCatalog`, `pedagogicalScenarioCatalog` et `testimonyVariantCatalog`.
- Le runtime V1.2 reste scenarise : `scriptedAgentRuntime` est le seul runtime effectif; les runtimes IA futurs retombent sur le mode scenarise.
- Les events Hub existants sont non sensibles : `proto_loaded`, `activity_loaded`, `meeting_started`, `user_answer_submitted`, `activity_completed`, `ai_config_resolved`, `agent_runtime_selected`, `error`.
- Les payloads n'envoient pas de texte apprenant complet : `user_answer_submitted` est compacte cote Hub en longueur et indicateurs.

Points d'attention :

- Prototype 06 utilise encore `localStorage` pour ses selections internes historiques.
- Les activites serveur Proto06 ne portent pas encore un scenario complet avec tours, textes, consignes et metadonnees institutionnelles.
- Le texte scenarise reste dans les catalogues locaux, pas dans un objet de publication partage avec le Hub.
- Le backend Proto06 sait stocker des activites, mais il n'est pas encore un registre de manifests pedagogiques publies.

## Etat actuel du Hub

Fichiers inspectes :

- `prototypes/00-ic-hub/server/server.js`
- `prototypes/00-ic-hub/server/stores/mariadbStore.js`
- `prototypes/00-ic-hub/server/data/prototypes.json`
- `prototypes/00-ic-hub/server/data/course-activities.json`
- `prototypes/00-ic-hub/server/data/activity-ownership.json`
- `prototypes/00-ic-hub/server/data/courses.json`
- `prototypes/00-ic-hub/server/data/institutions.json`
- rapports 016, 017, 018 et 019

Constats principaux :

- `proto06.launchUrl` pointe vers `http://127.0.0.1:8788/index-1.2.html`.
- Le Hub sait interroger le catalogue d'activites Proto06 via `activityApiUrl`.
- Le Hub sait creer des assignations de cours avec `activitySnapshot`, `visibility`, `institutionId`, `ownerId` et `aiConfigId`.
- `POST /api/runs/start` cree un run et genere une URL avec `activityId`, `activitySource`, `courseId`, `assignmentId`, `runId`, `launchToken` et `aiConfigId`.
- `POST /api/runs/:runId/events` valide les types d'evenements et compacte les payloads.
- Les traces sont disponibles en JSON local et MariaDB.
- L'admin IA V0.9.6 permet de generer des brouillons admin-only, d'evaluer localement, de creer des draft packs et de comparer plusieurs evaluations hors serveur.
- Les endpoints IA admin sont sous `/api/admin/ai` et proteges par role admin.
- Les appels OpenAI sont serveur uniquement dans `server/ai/openaiRuntime.js` et utilisent `store: false`.

Point important : les brouillons IA admin ne sont pas encore relies a une publication Prototype 06. C'est sain. Il manque une etape de transformation et de validation humaine avant tout usage apprenant.

## Contrat propose Hub -> Prototype 06

Nom propose : `proto06ActivityManifest`.

Objectif : transporter une activite pedagogique publiee et rejouable par Prototype 06, sans generation en direct, sans secret, sans texte apprenant et sans dependance a OpenAI.

Version minimale :

```json
{
  "schema": "ic-lab-proto06-activity-manifest",
  "schemaVersion": "0.1",
  "manifestId": "proto06-climate-roundtable-demo",
  "activityId": "climateObservations001",
  "version": "1.0.0",
  "status": "published",
  "title": "Comprendre des constats climatiques",
  "shortTitle": "Constats climatiques",
  "description": "Rencontre plurilingue scenarisee autour de temoignages climatiques.",
  "prototype": {
    "id": "proto06",
    "minVersion": "1.2"
  },
  "institution": {
    "id": "inst_uga",
    "name": "Universite Grenoble Alpes"
  },
  "course": {
    "id": "course_demo_repli4c",
    "title": "REPLI4C - groupe demo"
  },
  "assignment": {
    "id": "assign_demo_001",
    "visibility": "course"
  },
  "activitySource": "hub-manifest",
  "uiLanguage": "fr-FR",
  "targetLanguages": ["es", "it", "ptBr"],
  "climateThemes": ["chaleur", "secheresse", "pluies fortes"],
  "characters": [
    {
      "id": "clara",
      "displayName": "Clara",
      "languageId": "es",
      "placeId": "valencia",
      "role": "Etudiante",
      "image": "images/Clara.png",
      "voice": {
        "speechLang": "es-ES"
      }
    }
  ],
  "pedagogicalScenario": {
    "id": "globalUnderstanding",
    "title": "Comprehension globale",
    "taskType": "reconstruction",
    "pedagogicalGoal": "Reconstruire les phenomenes climatiques evoques dans plusieurs temoignages romans.",
    "instruction": "Ecoutez les temoignages et reconstruisez le theme commun a partir d'indices partiels.",
    "commonQuestion": "Quels changements avez-vous compris et quels points communs reliez-vous entre les participants ?",
    "observationFocus": ["mots transparents", "comprehension partielle", "theme commun"]
  },
  "meeting": {
    "runtime": "scripted",
    "steps": [
      {
        "stepId": "step-clara-001",
        "characterId": "clara",
        "text": "En Valencia los veranos son mas largos y mas calurosos.",
        "languageId": "es",
        "transparentWords": ["veranos", "largos", "calurosos"],
        "generated": false,
        "source": "human-reviewed"
      }
    ],
    "fallbackUtterance": "Je comprends plusieurs effets du changement climatique.",
    "initialObservation": {
      "transparent": "Les mots proches servent de premiers appuis.",
      "clarification": "La tache consiste a relier les temoignages.",
      "reformulation": "Le sens global se construit en comparant les phenomenes.",
      "partial": "Une comprehension partielle peut suffire."
    }
  },
  "teacherNotes": "Activite d'entree pour observer la reconstruction globale.",
  "review": {
    "reviewStatus": "human-reviewed",
    "reviewedByLabel": "Equipe pedagogique",
    "reviewedAt": "2026-07-03T00:00:00.000Z"
  },
  "safety": {
    "containsLearnerText": false,
    "containsApiKey": false,
    "generatedLive": false,
    "openAiInLearnerFlow": false,
    "serverStored": true
  }
}
```

Champs minimaux indispensables pour une premiere implementation :

- `schema`, `schemaVersion`, `manifestId`, `activityId`, `status`.
- `title`, `pedagogicalScenario.id`, `pedagogicalScenario.pedagogicalGoal`, `pedagogicalScenario.instruction`, `pedagogicalScenario.commonQuestion`.
- `characters[]` avec `id`, `displayName`, `languageId`, `placeId`.
- `meeting.steps[]` avec `stepId`, `characterId`, `text`, `languageId`, `transparentWords`, `generated=false`.
- `safety.containsLearnerText=false`, `safety.containsApiKey=false`, `safety.generatedLive=false`.

Regle de securite centrale : un manifest utilise par Prototype 06 cote apprenant doit etre en statut `published` ou `human-reviewed`. Un draft IA admin ne doit jamais devenir automatiquement un manifest apprenant.

## Contrat minimal Proto06 -> Hub

Objectif : permettre au Hub de suivre le deroulement pedagogique sans recevoir de texte apprenant complet, sans secret, sans cle et sans contenu genere.

Events proposes pour une premiere version :

```json
{
  "type": "manifest_loaded",
  "payload": {
    "manifestId": "proto06-climate-roundtable-demo",
    "activityId": "climateObservations001",
    "schemaVersion": "0.1",
    "stepCount": 3,
    "characterCount": 3,
    "runtime": "scripted"
  }
}
```

```json
{
  "type": "scene_started",
  "payload": {
    "manifestId": "proto06-climate-roundtable-demo",
    "activityId": "climateObservations001",
    "sceneId": "meeting-main",
    "stepCount": 3
  }
}
```

```json
{
  "type": "step_started",
  "payload": {
    "manifestId": "proto06-climate-roundtable-demo",
    "activityId": "climateObservations001",
    "stepId": "step-clara-001",
    "characterId": "clara",
    "languageId": "es"
  }
}
```

```json
{
  "type": "learner_response_submitted",
  "payload": {
    "activityId": "climateObservations001",
    "answerLength": 184,
    "hasText": true
  }
}
```

```json
{
  "type": "activity_completed",
  "payload": {
    "manifestId": "proto06-climate-roundtable-demo",
    "activityId": "climateObservations001",
    "completedStepCount": 3,
    "runtime": "scripted"
  }
}
```

Pour rester compatible avec le Hub actuel, deux options sont possibles :

- option prudente : reutiliser les types existants `activity_loaded`, `meeting_started`, `user_answer_submitted`, `activity_completed` et enrichir seulement les payloads autorises;
- option plus explicite : ajouter progressivement `manifest_loaded`, `scene_started` et `step_started` a la liste blanche du Hub.

Dans les deux cas, la regle doit rester stricte : pas de texte apprenant complet, pas de `launchToken` dans les payloads stockes, pas de prompts, pas de brouillons IA, pas de cle.

## Scenario pedagogique cible

Premiere cible recommandee : une rencontre REPLI4C courte a trois personnages, comprehension globale, climat.

Pourquoi ce scenario :

- il correspond deja a l'activite `climateObservations001`;
- il existe deja dans les catalogues Proto06;
- il couvre les champs necessaires : personnages, langues, lieux, themes, consigne, question commune, indices transparents;
- il limite le risque UX et technique;
- il permet de verifier la chaine complete sans ajouter d'IA dans le parcours apprenant.

Contour pedagogique propose :

- personnages : Clara, Marco, Ana;
- langues : espagnol, italien, portugais du Bresil;
- tache : reconstruire les phenomenes climatiques et les points communs;
- interaction : ecoute scenarisee, observation, reponse courte en francais;
- trace : progression, demarrage, reponse soumise sous forme compacte, completion.

## Risques identifies

1. Confondre brouillon IA et activite publiee.
   - Risque : un texte genere admin-only pourrait etre utilise trop vite avec des apprenants.
   - Mitigation : statut `draft`, `reviewed`, `published`; pas de publication automatique.

2. Envoyer trop d'informations dans les traces.
   - Risque : texte apprenant, prompt, consigne complete ou texte de brouillon dans `run_events`.
   - Mitigation : liste blanche de payloads, longueurs, ids et booleens uniquement.

3. Dupliquer deux sources de verite.
   - Risque : catalogues Proto06 et manifests Hub divergent.
   - Mitigation : le manifest devient l'objet de publication; les catalogues locaux restent fallback et fixtures.

4. Casser le fonctionnement local existant.
   - Risque : library, composer ou fallback manuel perturbes.
   - Mitigation : nouvelle version Prototype 06 separee, fallback intact si `manifestId` absent.

5. Melanger admin IA et parcours apprenant.
   - Risque : l'AI Lab semble piloter directement Prototype 06.
   - Mitigation : vocabulaire clair : "brouillon", "lot d'evaluation", "manifest publie", "runtime scenarise".

6. Exposer des secrets ou de la configuration runtime.
   - Risque : cle API, `.env`, token de lancement ou details provider dans le navigateur.
   - Mitigation : aucun secret dans le manifest, `launchToken` uniquement pour poster les events, payloads filtres.

7. Ambiguite sur le stockage.
   - Risque : croire que les brouillons admin sont stockes en base.
   - Mitigation : les brouillons restent locaux; seuls les manifests publies peuvent etre stockes plus tard, comme ressources pedagogiques validees.

## Architecture progressive recommandee

### Palier 1 - Manifest statique cote Prototype 06

- Creer un manifest fixture local.
- Creer une micro-version Prototype 06 qui lit `manifestId` ou `manifestUrl`.
- Garder le fallback V1.2 actuel si aucun manifest n'est fourni.
- Aucun appel OpenAI.
- Aucune modification du Hub necessaire pour ce premier test.

### Palier 2 - Manifest servi par le Hub

- Ajouter un stockage JSON/MariaDB de manifests publies dans le Hub.
- Ajouter un endpoint lecture seule, par exemple `GET /api/proto06/manifests/:manifestId`.
- Ne servir que des manifests `published` visibles selon role, cours, institution et ownership.
- Ne pas exposer de brouillons IA admin dans cet endpoint.

### Palier 3 - Assignation de manifest

- Etendre les assignations pour porter `manifestId` en plus de `activityId`.
- Generer une URL Prototype 06 du type :

```txt
http://127.0.0.1:8788/index-1.2.1.html?manifestId=...&activitySource=hub-manifest&courseId=...&assignmentId=...&runId=...&launchToken=...
```

- Conserver `activitySnapshot` pour affichage Hub si Prototype 06 est indisponible.

### Palier 4 - Traces pedagogiques minimales

- Ajouter `manifest_loaded` et eventuellement `step_started` si utile.
- Continuer a compacter `learner_response_submitted`.
- Garder `activity_completed` comme signal de fin.
- Verifier JSON et MariaDB.

### Palier 5 - Publication depuis l'AI Lab admin

- Transformer un draft pack evalue en proposition de manifest.
- Exiger une validation humaine explicite.
- Stocker uniquement le manifest publie, pas les evaluations locales ni les brouillons de travail.
- Garder l'IA hors parcours apprenant tant que le runtime generatif n'est pas decide et encadre.

## Premiere mission d'implementation limitee proposee

Mission suivante recommandee : **Prototype 06 V1.2.1 - lecture d'un manifest fixture local, sans Hub lourd**.

Perimetre propose :

- Ne pas modifier les anciennes versions Prototype 06.
- Creer `index-1.2.1.html`, `script-1.2.1.js`, `style-1.2.1.css` si necessaire.
- Ajouter un fichier fixture local, par exemple `data/proto06-manifests/climate-roundtable-demo.json`.
- Lire `manifestId` dans l'URL.
- Si le manifest existe, construire la rencontre a partir de `characters`, `pedagogicalScenario` et `meeting.steps`.
- Si le manifest manque ou est invalide, afficher une erreur claire et revenir au fonctionnement V1.2 actuel.
- Ne pas appeler OpenAI.
- Ne pas modifier le Hub.
- Ne pas modifier `run_events` au depart, sauf reutilisation des events existants.
- Creer un rapport dedie.

Definition de fini pour cette mission suivante :

- `node --check script-1.2.1.js` OK.
- `index-1.2.1.html?manifestId=climate-roundtable-demo` charge la rencontre.
- Le lancement V1.2 sans manifest reste disponible.
- Aucune cle, aucun texte apprenant, aucun appel provider.
- Prototype 06 est modifie uniquement dans de nouveaux fichiers versionnes.

Deuxieme mission possible ensuite : **IC-Hub V0.9.8 - endpoint lecture seule de manifests publies**, avec JSON et MariaDB, sans publication IA automatique.

## Recommandation finale

Pret pour une premiere passe d'integration, mais pas directement par l'AI Lab. Le bon ordre est :

1. definir et tester un manifest publie;
2. faire lire ce manifest par Prototype 06;
3. faire servir ce manifest par le Hub;
4. relier les assignations;
5. seulement ensuite transformer les brouillons IA evalues en propositions de manifests relus.

Cette progression garde l'architecture pedagogique prudente : l'IA aide l'admin a preparer, l'humain valide, Prototype 06 joue une activite scenarisee, et le Hub trace uniquement ce qui est necessaire.
