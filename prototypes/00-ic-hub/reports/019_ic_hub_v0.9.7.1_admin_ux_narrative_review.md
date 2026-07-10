# 019 - IC-Hub V0.9.7.1 - Admin IA UX narrative review

Date: 2026-07-03

## Resume executif

Cette mission relit l'admin IA comme une application pour responsable pedagogique, ingenieur pedagogique ou admin institutionnel. Aucun fichier applicatif n'a ete modifie.

Conclusion generale : l'admin IA raconte deja clairement une architecture prudente. Les garde-fous sont visibles, le parcours apprenant reste explicitement non generatif, et les operations sensibles sont bien presentees comme admin-only, serveur ou locales selon le cas. Le recit global peut cependant devenir plus fluide avec de simples textes d'aide : mieux expliquer le passage Catalogue -> AIConfig -> Generer -> Evaluer -> Comparer, et differencier plus clairement generation serveur controlee, brouillons locaux, evaluation locale et comparaison locale.

Recommandation : engager une mission suivante limitee aux titres, sous-titres, labels et encadres pedagogiques. Ne pas modifier les endpoints, ne pas modifier Prototype 06, ne pas appeler OpenAI, ne pas toucher aux fichiers runtime.

## Etat Git initial

Commandes lancees :

```bash
git status --short
git status --short prototypes/06-voice-agent-ic prototypes/06-*
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultats :

- `git status --short` : aucune sortie au moment de l'etat initial.
- Prototype 06 : aucune sortie, donc aucune modification detectee.
- `runs.json` : aucun diff.
- `sessions.json` : aucun diff.

Note : pour eviter de creer une session d'authentification ou d'appeler un endpoint admin, la relecture s'est faite a partir des fichiers HTML/CSS/JS et des rapports 016, 017 et 018.

## Rappel des garde-fous

- Prototype 06 ne doit pas etre modifie.
- `.env` ne doit pas etre modifie.
- `OPENAI_API_KEY` ne doit pas etre lue, affichee, loggee ou copiee.
- Aucun appel OpenAI ne doit etre effectue dans cette mission.
- Aucune generation IA ne doit etre lancee.
- Aucun endpoint IA ne doit etre modifie.
- Aucun brouillon IA ne doit etre ecrit dans `run_events`.
- `runs.json` et `sessions.json` ne doivent pas etre modifies.
- Aucun fichier `admin-0.9.7.*` ne doit etre cree.

## Analyse vue par vue

### 1. Vue d'ensemble - `#dashboard`

Role reel :

- Donner l'etat de securite initial.
- Dire que le parcours apprenant n'est pas generatif.
- Installer la confiance avant les fonctions IA.

Ce qui est compris immediatement :

- L'IA generative n'est pas active dans les activites.
- Prototype 06 reste en runtime scenarise.
- Les cles ne sont pas visibles cote navigateur.
- Le navigateur n'appelle pas OpenAI.

Ce qui reste implicite ou ambigu :

- La vue dit ce qui n'est pas actif, mais explique peu ce que l'admin peut faire ensuite.
- Le lien narratif vers Catalogue puis AIConfig n'est pas encore guide.

Ce qui rassure :

- Les badges "IA apprenante inactive" et "Parcours scenarise".
- La liste des signaux de securite en premier ecran.

Ce qui pourrait perdre un responsable pedagogique :

- Le terme "runtime scenarise" est precis mais technique.
- L'utilisateur peut comprendre que "rien ne marche encore", alors que l'admin IA a bien un laboratoire controle.

Micro-amelioration recommandee :

- Ajouter un court encadre : "Point de depart : ici on verifie que l'IA n'est pas dans le parcours apprenant. Ensuite, le catalogue sert a choisir des modeles pour des tests admin uniquement."

### 2. Catalogue IA - `#catalog`

Role reel :

- Lister providers et modeles.
- Synchroniser les modeles OpenAI cote serveur.
- Donner des informations de cout, statut, recommandation et admissibilite runtime.

Ce qui est compris immediatement :

- Un provider fournit des modeles.
- Une synchronisation OpenAI existe.
- La cle reste cote serveur.
- Les prix sont indicatifs et doivent etre verifies.

Ce qui reste implicite ou ambigu :

- "Mettre a jour la liste des modeles accessibles avec ma cle OpenAI" peut impressionner un admin institutionnel.
- La difference entre "modele disponible", "modele autorise runtime" et "modele effectivement utilise" meriterait une mini-explication plus visible.

Ce qui rassure :

- Le texte dit que la synchronisation ne genere aucun texte et n'envoie aucun texte apprenant.
- Le champ "Prix non renseigne" evite une fausse precision.

Ce qui pourrait inquieter :

- Le bouton de sync mentionne explicitement la cle, meme sans l'afficher.
- Les termes "runtime", "allowedForRuntime", "recommended" peuvent sembler techniques.

Micro-amelioration recommandee :

- Renommer ou accompagner le bouton avec une aide : "Synchroniser la liste des modeles (serveur uniquement, aucune generation)".
- Ajouter une ligne : "Autorise runtime signifie selectionnable pour test admin; cela n'active pas Prototype 06."

### 3. AIConfig - `#aiconfig`

Role reel :

- Representer les profils locaux d'activation administrative.
- Faire le lien entre catalogue IA et usages futurs, sans activer le parcours apprenant.

Ce qui est compris immediatement :

- Une AIConfig n'active rien sans runtime generatif explicite.
- C'est une zone de configuration, pas une zone d'execution.

Ce qui reste implicite ou ambigu :

- On ne voit pas encore clairement pourquoi un admin passerait par AIConfig avant de generer ou d'evaluer.
- Le terme "AIConfig" est court mais tres interne.

Ce qui rassure :

- La phrase "n'active rien sans runtime generatif explicite" est forte.

Ce qui pourrait perdre un responsable pedagogique :

- AIConfig ressemble a un objet technique plus qu'a une etape de gouvernance.

Micro-amelioration recommandee :

- Ajouter un sous-titre : "Une AIConfig documente une intention ou un profil; elle ne branche pas automatiquement l'IA aux etudiants."

### 4. Generer - `#generate`

Role reel :

- Produire des brouillons pedagogiques admin-only via serveur.
- Permettre de creer un lot commun de brouillons a evaluer.
- Rester hors parcours apprenant.

Ce qui est compris immediatement :

- Les essais se font cote serveur.
- Ils ne modifient pas Prototype 06.
- Ils ne sont pas visibles des apprenants.
- Ils ne sont pas stockes dans les traces.

Ce qui reste implicite ou ambigu :

- La vue Generer, Evaluer et Comparer partagent le meme panneau "AI Lab serveur". C'est fonctionnel, mais le titre central ne change pas selon le mode.
- "store=false" est clair pour un developpeur, moins pour un responsable pedagogique.

Ce qui rassure :

- Les badges "Admin only" et "store=false".
- La section "Ce laboratoire ne fait pas".
- L'indication "Aucun appel OpenAI n'est effectue au chargement".

Ce qui pourrait inquieter :

- Les boutons "Smoke test serveur" et "Generer" peuvent sembler proches du parcours apprenant si l'utilisateur ne lit pas tout.

Micro-amelioration recommandee :

- Ajouter un encadre "Cette vue sert a produire un lot test. Rien n'est publie aux apprenants."
- Ajouter une traduction UX de `store=false` : "non stocke cote serveur".

### 5. Evaluer - `#evaluate`

Role reel :

- Evaluer localement des brouillons generes ou importes.
- Produire un export d'evaluation sans upload serveur.

Ce qui est compris immediatement :

- Les brouillons sont en memoire navigateur.
- Un rechargement vide la liste.
- Les exports contiennent textes et commentaires, donc doivent etre relus.

Ce qui reste implicite ou ambigu :

- Le mode Evaluer utilise le meme panneau que Generer, donc le haut de la vue peut encore porter des textes de generation selon le sous-mode CSS.
- La notion "evaluation locale" est presente mais pourrait etre placee plus haut dans le mode Evaluer.

Ce qui rassure :

- "Memoire navigateur uniquement".
- "Ces donnees ne sont pas stockees".
- Import navigateur uniquement.

Ce qui pourrait perdre :

- Un evaluateur pourrait chercher d'abord "Importer un lot" alors que la section apparait apres la synthese de session.

Micro-amelioration recommandee :

- En mode Evaluer, afficher en premier : "Importer un draft pack ou evaluer les brouillons de cette session. Rien n'est envoye au serveur."

### 6. Comparer - `#compare`

Role reel :

- Importer plusieurs evaluations locales.
- Comparer les scores, commentaires, criteres, desaccords et recommandations.
- Produire un export local de comparaison.

Ce qui est compris immediatement :

- L'import est local.
- Aucun upload serveur.
- Il faut preferer des exports issus du meme `draftPackId`.

Ce qui reste implicite ou ambigu :

- La raison pedagogique du `draftPackId` pourrait etre expliquee plus humainement : comparer le meme lot commun.
- Le terme `draftPackId` est utile techniquement, mais assez opaque pour un public non developpeur.

Ce qui rassure :

- La mention explicite "Aucun upload serveur".
- Le warning sur les packs differents evite les fausses comparaisons.

Ce qui pourrait inquieter :

- Les tableaux de comparaison peuvent sembler evaluatifs ou decisifs sans rappeler qu'il s'agit d'une aide a la relecture humaine.

Micro-amelioration recommandee :

- Ajouter : "Comparer plusieurs evaluations n'est fiable que si tous les evaluateurs ont note le meme lot de brouillons."
- Ajouter une note : "La recommandation est une aide de tri, pas une decision automatique."

### 7. Gouvernance - `#security`

Role reel :

- Rappeler les interdits.
- Expliquer ce qui declencherait vraiment l'IA.
- Donner un protocole de retour arriere.

Ce qui est compris immediatement :

- Le parcours apprenant n'est pas generatif.
- Activer l'IA demanderait plusieurs decisions explicites.
- Il existe une procedure de retour arriere.

Ce qui reste implicite ou ambigu :

- La gouvernance arrive en vue 7, alors qu'elle est l'une des idees centrales.
- Elle est presente dans le dashboard, mais son espace dedie pourrait etre signale plus tot.

Ce qui rassure :

- La liste d'urgence est concrete.
- Les donnees apprenantes sont abordees clairement.
- La checklist avant activation est robuste.

Ce qui pourrait devenir anxiogene :

- L'accumulation d'interdits peut donner une impression de danger permanent si elle n'est pas accompagnee d'un message positif de maitrise.

Micro-amelioration recommandee :

- Ajouter une phrase d'apaisement : "Ces garde-fous permettent de tester sereinement sans exposer les apprenants."

### 8. Systeme - `#system`

Role reel :

- Montrer l'etat technique : health, stockage, utilisateurs, institutions, cours, prototypes, connecteurs, sessions.
- Servir au diagnostic admin.

Ce qui est compris immediatement :

- C'est une vue technique.
- Elle n'est pas une vue pedagogique.
- Elle permet de verifier JSON/MariaDB et les donnees chargees.

Ce qui reste implicite ou ambigu :

- Les sessions actives peuvent etre sensibles ou bruyantes pour un public non technique.
- Les "Activites referencees" melangent des concepts de visibilite, institution, owner et prototype.

Ce qui rassure :

- La vue separe clairement diagnostic technique et laboratoire IA.

Ce qui pourrait perdre :

- Trop de donnees systeme peuvent diluer le recit pedagogique.

Micro-amelioration recommandee :

- Ajouter un court texte : "Vue technique de diagnostic; elle ne modifie pas l'IA et ne lance aucune generation."

## Diagnostic du recit global

### Ordre des vues

L'ordre actuel est globalement logique :

1. Vue d'ensemble : securiser le contexte.
2. Catalogue : connaitre les modeles.
3. AIConfig : documenter les profils.
4. Generer : produire des brouillons test.
5. Evaluer : relire localement.
6. Comparer : agreger plusieurs evaluations.
7. Gouvernance : approfondir les garde-fous.
8. Systeme : diagnostiquer.

La seule hesitation narrative : Gouvernance pourrait apparaitre plus tot, ou etre mieux annoncee dans le dashboard. La sidebar actuelle reste acceptable car le dashboard porte deja les signaux de securite.

### Passage Catalogue -> AIConfig -> Generer -> Evaluer -> Comparer

Le passage est comprehensible pour un utilisateur technique. Pour un responsable pedagogique, il manque un petit fil conducteur :

- Catalogue : "quels modeles sont connus et a quel niveau de confiance ?"
- AIConfig : "comment documente-t-on l'intention d'usage sans activer les apprenants ?"
- Generer : "comment produit-on un lot test admin-only ?"
- Evaluer : "comment relit-on localement ce lot ?"
- Comparer : "comment plusieurs personnes confrontent leurs evaluations ?"

Ce fil peut etre ajoute par textes courts uniquement.

### Distinction serveur / local / non stocke

La distinction existe mais pourrait etre plus pedagogique :

- Generation : serveur admin-only.
- Brouillons de session : memoire navigateur.
- Draft pack : fichier local exporte.
- Evaluation : locale navigateur.
- Comparaison : locale navigateur.
- Run events : non touches.

La phrase cle a introduire : "Le serveur peut generer un brouillon admin-only, mais les lots, notes et comparaisons restent sous forme de fichiers locaux tant que l'admin ne les partage pas."

### Gouvernance et serieux

L'interface donne une impression serieuse. Elle peut parfois paraitre tres defensive. Le bon ajustement n'est pas de retirer les garde-fous, mais d'ajouter une intention positive :

- proteger les apprenants;
- permettre une relecture humaine;
- comparer des brouillons avant toute reutilisation;
- documenter les choix institutionnels.

## Points forts actuels

- Le premier message dit clairement que l'IA apprenante est inactive.
- Les appels OpenAI navigateur sont explicitement exclus.
- Les cles ne sont jamais presentees comme visibles.
- Le laboratoire admin est separe du parcours apprenant.
- Les exports locaux sont bien signales.
- Les garde-fous sont redondants, mais utiles pour un contexte institutionnel.
- La comparaison multi-evaluateurs insiste sur le meme `draftPackId`.
- Le systeme reste compatible JSON/MariaDB sans en faire un sujet pedagogique central.

## Ambiguites UX

- `store=false` est rassurant techniquement, mais moins parlant pour un public pedagogique.
- `draftPackId` est utile, mais doit etre traduit en "lot commun de brouillons".
- AIConfig peut sembler activer quelque chose alors qu'elle documente surtout une configuration.
- Les modes Generer / Evaluer / Comparer partagent un meme panneau Lab, ce qui peut brouiller le titre central.
- Le bouton de synchronisation OpenAI mentionne la cle; il faudrait le cadrer plus explicitement comme serveur-only.
- Le terme "runtime" est utile en maintenance, mais devrait etre accompagne d'un equivalent plus simple.

## Micro-ameliorations recommandees

Priorite 1 - Textes d'aide sans risque :

1. Ajouter dans le dashboard un mini-fil conducteur du type :
   "Parcours recommande : verifier les garde-fous, consulter le catalogue, choisir un profil, generer un lot test, evaluer localement, comparer les evaluations."
2. Ajouter dans Catalogue :
   "Synchroniser les modeles ne genere aucun contenu et ne transmet aucun texte apprenant."
3. Ajouter dans AIConfig :
   "Une AIConfig documente un usage possible; elle n'active pas les etudiants."
4. Ajouter dans Generer :
   "Generation serveur admin-only; les brouillons ne sont pas publies."
5. Ajouter dans Evaluer :
   "Evaluation locale; un rechargement efface les brouillons non exportes."
6. Ajouter dans Comparer :
   "Comparer est fiable si tous les evaluateurs utilisent le meme lot commun."
7. Ajouter dans Gouvernance :
   "Ces garde-fous permettent de tester sereinement, pas de bloquer l'experimentation."

Priorite 2 - Labels :

1. Remplacer visuellement `store=false` par "non stocke cote serveur" ou ajouter les deux.
2. Ajouter une aide au terme `draftPackId` : "identifiant du lot commun".
3. Accompagner "runtime" par "mode d'execution".
4. Rendre le bouton de sync OpenAI moins anxiogene : "Synchroniser la liste des modeles cote serveur".

Priorite 3 - Encadres pedagogiques :

1. Encadre "Ce qui reste local" dans Evaluer / Comparer.
2. Encadre "Ce qui touche le serveur" dans Generer.
3. Encadre "Ce qui ne touche jamais les apprenants" dans Gouvernance.

## Risques a eviter

- Ajouter des aides trop longues qui rendent l'interface anxiogene.
- Multiplier les avertissements rouges alors que la plupart des actions sont controlees.
- Introduire une nouvelle navigation ou des pages V0.9.7.
- Modifier les endpoints admin IA.
- Lancer une generation OpenAI pour "tester le texte".
- Toucher a `runs.json` ou `sessions.json`.
- Refactorer le JS monolithique dans cette passe narrative.
- Rendre le catalogue trop technique pour un responsable pedagogique.

## Proposition de mission suivante

Mission suggeree : **IC-Hub V0.9.7.2 - micro-copy pedagogique admin IA**.

Perimetre limite :

- Modifier uniquement les textes HTML d'aide, titres, sous-titres, labels et petits encadres.
- Ne pas modifier `admin-0.9.6.js` sauf si un label deja existant est genere cote JS et doit etre harmonise.
- Ne pas modifier les endpoints.
- Ne pas appeler OpenAI.
- Ne pas modifier Prototype 06.
- Ne pas modifier `runs.json` ou `sessions.json`.

Changements concrets proposes :

1. Ajouter un fil conducteur court dans `#dashboard`.
2. Clarifier `#catalog` autour de la synchronisation serveur-only.
3. Clarifier `#aiconfig` comme intention/profil, pas activation.
4. Ajouter trois phrases dediees aux modes `#generate`, `#evaluate`, `#compare`.
5. Traduire visuellement `store=false` par "non stocke cote serveur" dans les textes visibles.
6. Ajouter une phrase positive dans `#security` sur l'interet pedagogique des garde-fous.

Definition de fini :

- Aucun fichier applicatif hors admin HTML/CSS et eventuellement micro-label JS.
- Aucun appel OpenAI.
- Aucun fichier runtime modifie.
- Prototype 06 intact.
- Rapport 020 cree.

## Etat final attendu

Seul ce rapport doit etre ajoute par cette mission :

```txt
?? prototypes/00-ic-hub/reports/019_ic_hub_v0.9.7.1_admin_ux_narrative_review.md
```

Les changements V0.9.7 deja presents dans `admin-0.9.6.html`, `admin-0.9.6.css` et le rapport 018 restent hors perimetre de cette relecture narrative.
