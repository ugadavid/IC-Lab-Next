# 028 - IC-Lab - Vue d'ensemble du flux Hub vers Proto06 valide

Date: 2026-07-03

## Resume du flux valide

Le flux valide relie IC-Hub V0.9.9 et Prototype 06 V1.2.3 autour d'une activite publiee sous forme de manifest Hub.

Le Hub joue le role de point d'entree institutionnel : il connait le cours, l'assignation, le manifest publie, l'etudiant et le run. Prototype 06 joue le role d'espace d'activite : il lit les parametres de lancement, charge le manifest depuis le Hub, affiche la rencontre plurilingue et envoie des traces sobres.

Flux valide :

```txt
Etudiant dans IC-Hub
-> cours course_demo_repli4c
-> assignation assign_demo_001
-> lancement Proto06
-> URL V1.2.3 avec manifestId
-> chargement du manifest Hub climate-roundtable-demo
-> table ronde scenarisee Clara / Marco / Ana
-> traces sobres dans le run
```

Ce flux a ete teste end-to-end dans le navigateur. Le premier tour joue par Clara provient bien du manifest Hub publie.

## Schema textuel des etapes

```txt
1. Le Hub expose un manifest Proto06 publie
   GET /api/proto06/manifests/climate-roundtable-demo

2. Une assignation de cours reference ce manifest
   courseId: course_demo_repli4c
   assignmentId: assign_demo_001
   activityId: climateObservations001
   activitySource: hub-manifest
   manifestId: climate-roundtable-demo

3. L'etudiant lance l'assignation depuis le Hub
   POST /api/runs/start

4. Le Hub cree un run et genere une URL de lancement
   http://127.0.0.1:8788/index-1.2.3.html
     ?activityId=climateObservations001
     &activitySource=hub-manifest
     &manifestId=climate-roundtable-demo
     &courseId=course_demo_repli4c
     &assignmentId=assign_demo_001
     &runId=...
     &launchToken=...
     &aiConfigId=aicfg_proto06_scripted_browser_voice

5. Prototype 06 lit les parametres URL
   activitySource=hub-manifest
   manifestId=climate-roundtable-demo

6. Prototype 06 recupere le manifest depuis le Hub
   GET http://127.0.0.1:8790/api/proto06/manifests/climate-roundtable-demo

7. Prototype 06 affiche l'activite publiee
   titre, consigne, question commune, personnages, langues, badges

8. L'etudiant demarre la rencontre
   premier tour Clara en espagnol

9. Prototype 06 envoie des traces sobres
   proto_loaded, activity_loaded, ai_config_resolved,
   agent_runtime_selected, meeting_started
```

## Role du Hub

Le Hub structure le cadre pedagogique et institutionnel.

Il porte :

- les utilisateurs et roles ;
- les cours ;
- les inscriptions ;
- les assignations ;
- les prototypes connectes ;
- les manifests Proto06 publies ;
- les runs et traces sobres.

Dans ce flux, le Hub ne genere pas de contenu en direct. Il valide que l'assignation pointe vers un manifest publie et relu humainement, puis il construit une URL de lancement verifiable.

Le Hub ajoute aussi les informations de contexte necessaires :

- `courseId` ;
- `assignmentId` ;
- `runId` ;
- `launchToken` ;
- `aiConfigId`.

Ces informations permettent a Prototype 06 de rester un outil d'activite, tout en laissant le Hub assurer le suivi du parcours.

## Role du manifest publie

Le manifest publie est le contrat pedagogique entre le Hub et Proto06.

Il contient l'activite de reference :

- identifiant du manifest ;
- titre ;
- objectif pedagogique ;
- consigne ;
- question commune ;
- personnages ;
- langues ;
- tours de parole scenarises ;
- observations IC ;
- metadonnees de revue humaine ;
- garde-fous de securite.

Le manifest `climate-roundtable-demo` declare explicitement :

- `status: published` ;
- `review.reviewStatus: human-reviewed` ;
- `safety.generatedLive: false` ;
- `safety.openAiInLearnerFlow: false` ;
- `safety.containsLearnerText: false` ;
- `safety.containsApiKey: false`.

Le manifest est donc un format de publication, pas un brouillon dynamique. Il permet de preparer une activite stable, auditable et rejouable.

## Role de Proto06

Prototype 06 V1.2.3 est l'environnement de rencontre plurilingue.

Dans le flux valide, Proto06 :

- lit `activitySource=hub-manifest` ;
- lit `manifestId=climate-roundtable-demo` ;
- charge le manifest depuis le Hub ;
- affiche la source `IC-Hub` ;
- affiche les badges `Activite publiee`, `Runtime scenarise`, `IA reelle non active` ;
- reconstruit l'activite a partir du manifest ;
- affiche Clara, Marco et Ana ;
- lance une table ronde scenarisee ;
- envoie des traces sobres au Hub.

Proto06 ne choisit pas librement une activite. Il execute l'activite publiee pointee par l'assignation Hub.

## Role des traces

Les traces servent a documenter le deroulement sans capturer le contenu sensible.

Evenements observes dans le run E2E :

- `proto_loaded` ;
- `activity_loaded` ;
- `ai_config_resolved` ;
- `agent_runtime_selected` ;
- `meeting_started`.

Les payloads restent volontairement courts :

- identifiant d'activite ;
- source ;
- scenario ;
- nombre de personnages ;
- configuration IA assignee ;
- runtime utilise ;
- statut de lancement.

Les traces ne stockent pas :

- le manifest complet ;
- les textes complets des tours de parole ;
- un texte apprenant complet ;
- un `launchToken` ;
- un secret ;
- une cle API.

Ce niveau de trace suffit pour comprendre qu'une activite a ete lancee et que le runtime scenarise a ete utilise, sans transformer le Hub en depot de contenus d'apprentissage sensibles.

## Garde-fous

Le flux valide repose sur plusieurs garde-fous.

Cote Hub :

- seuls les manifests publies et relus humainement sont exposes ;
- le manifest est valide avant lancement ;
- les assignations ne stockent qu'un snapshot court ;
- le `launchToken` est retire des payloads evenementiels ;
- les traces restent sobres ;
- aucune generation IA n'est declenchee dans le parcours etudiant.

Cote manifest :

- les tours de parole sont marques comme non generes ;
- les sources sont relues humainement ;
- les flags de securite interdisent la generation live, les textes apprenants et les cles API.

Cote Proto06 :

- le runtime reste scenarise ;
- les badges indiquent que l'activite est publiee ;
- l'interface indique que l'IA reelle n'est pas active ;
- le chargement du manifest Hub est explicite via la source visible `IC-Hub`.

## Hors perimetre explicite

Ce flux ne fait pas :

- de generation IA dans le parcours apprenant ;
- d'appel OpenAI depuis le navigateur ;
- d'appel OpenAI depuis Proto06 ;
- de conversation live avec un modele ;
- de stockage de brouillons IA admin dans les runs ;
- de stockage du manifest complet dans les evenements ;
- de stockage de texte apprenant complet ;
- de publication automatique de contenus non relus ;
- de modification de la base `ic_dico` ;
- de modification du Prototype 06 historique.

Le flux valide est volontairement limite : il relie une publication pedagogique controlee a une execution scenarisee.

## Interet pedagogique

Ce palier est important parce qu'il transforme IC-Lab en chaine pedagogique coherente :

```txt
preparer -> publier -> assigner -> lancer -> vivre l'activite -> tracer sobrement
```

Pour un enseignant ou responsable pedagogique, cela apporte :

- une activite stable et rejouable ;
- une source identifiable ;
- une separation claire entre publication et execution ;
- une lecture explicite des garde-fous ;
- une trace minimale du parcours ;
- une experience etudiante lisible.

Pour l'etudiant, l'activite reste simple :

- il voit la consigne ;
- il identifie les personnages ;
- il entend ou lit des langues romanes ;
- il reconstruit un sens commun ;
- il n'est pas expose a une IA generative live.

Le manifest permet donc de publier une activite d'intercomprehension sans confondre experimentation IA, administration et parcours apprenant.

## Ouverture vers un futur bac a sable IA separe

Le flux valide ouvre une voie prudente vers un futur bac a sable IA, mais sans le melanger au parcours apprenant.

Une evolution possible serait :

```txt
Admin IA separe
-> generation ou aide a la redaction de brouillons
-> evaluation humaine
-> revue pedagogique
-> export / transformation en manifest publie
-> assignation Hub
-> execution scenarisee Proto06
```

Dans cette logique, l'IA resterait en amont, dans un espace controle d'aide a la conception. Le parcours etudiant continuerait a recevoir uniquement des activites publiees, relues et scenarisees.

Cette separation preserve l'objectif central :

- experimenter avec l'IA sans exposer directement les apprenants ;
- garder une responsabilite humaine sur les contenus ;
- conserver des traces sobres ;
- rendre chaque palier auditable.

## Synthese

Le flux Hub V0.9.9 vers Proto06 V1.2.3 est valide comme palier local de publication et lancement d'activites scenarisees.

Il ne cherche pas encore a faire dialoguer des agents IA avec l'etudiant. Il etablit d'abord une base saine : un Hub qui assigne, un manifest qui publie, un prototype qui execute, et des traces qui documentent sans capturer plus que necessaire.
