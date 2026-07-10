# Guide mainteneur - Administration IA IC-Hub

Date: 2026-07-03

## Dernier etat valide

- Hub : V0.9.6
- Prototype 06 : V1.2
- Mode Proto06 : runtime scenarise securise
- IA generative dans les activites : non
- Appels OpenAI depuis navigateur : non
- Texte apprenant envoye a OpenAI : non
- Cles visibles cote navigateur : non
- Derniere validation : 2026-07-03

Cet etat correspond a une plateforme prete pour tests administrateurs avec admin IA en app-shell, AI Lab serveur, brouillons pedagogiques controles, draft packs communs, grille d'evaluation locale et comparaison multi-evaluateurs hors ligne, mais sans activation IA dans les parcours apprenants.

## Etat general

Le Hub IC-Lab administre un catalogue de providers et de modeles IA, mais aucune IA generative n'est activee dans les parcours apprenants par ce seul catalogue.

Prototype 06 reste en runtime scenarise tant qu'un runtime generatif n'est pas explicitement cree, teste cote serveur, puis branche dans le parcours apprenant apres validation.

## Architecture IA du Hub

La couche IA du Hub contient quatre niveaux :

1. Providers : fournisseurs techniques comme OpenAI, Anthropic, Google, Mistral ou Ollama.
2. Modeles : moteurs disponibles chez un provider.
3. AIConfig : profil local qui decrit un mode IA/voix possible pour un prototype.
4. Prototypes : applications pedagogiques comme Prototype 06, qui resolvent leur mode d'execution a partir de l'assignation et de l'AIConfig.

Le catalogue providers/modeles prepare des choix futurs. Il ne lance pas d'appel de generation dans les activites.

## Providers

Un provider est un fournisseur technique. Le provider OpenAI peut etre synchronise cote serveur pour lire la liste des modeles accessibles avec la cle configuree localement.

Les metadonnees provider modifiables dans l'admin sont locales :

- titre;
- statut;
- Base URL;
- notes.

Modifier ces champs ne modifie pas le compte OpenAI.

## Modeles

Un modele est un moteur disponible chez un provider. Le Hub stocke :

- id technique;
- famille;
- modalite;
- description courte;
- recommandation IC-Lab;
- cout qualitatif;
- prix renseignes ou non;
- autorisations locales teacher/student/runtime.

`allowedForRuntime` rend un modele selectionnable pour une future configuration. Cela n'active pas automatiquement l'IA dans Prototype 06.

## AIConfig

Une AIConfig est un profil local de mode IA/voix. Elle peut decrire :

- un mode scenarise;
- un futur mode texte;
- un futur mode voix;
- des limites de duree;
- un niveau de cout;
- des warnings.

Une AIConfig peut pointer vers un modele catalogue avec `modelCatalogId`, mais cela reste une configuration administrative tant qu'aucun runtime generatif n'est branche dans le prototype.

## Role de Prototype 06

Prototype 06 utilise actuellement un runtime scenarise securise. Les activites peuvent remonter des traces et des evenements, mais les modeles synchronises dans le Hub ne generent pas de contenu pour les apprenants.

Pour savoir si l'IA est reellement activee, verifier :

- le runtime du prototype;
- l'AIConfig resolue pour l'assignation;
- le code serveur du runtime;
- l'absence ou presence d'un appel provider pendant l'activite.

En V0.9.6, l'etat attendu est : generation possible uniquement dans l'AI Lab admin serveur, aucune generation IA dans le parcours apprenant.

## Admin IA V0.9.6

L'admin IA V0.9.6 est organise comme une app-shell avec une barre superieure, une navigation laterale fixe et une seule vue principale visible a la fois.

Vues disponibles :

- Tableau : etat valide et garde-fous principaux.
- Catalogue : providers, synchronisation OpenAI serveur, filtres modeles et recommandations.
- AIConfig : configurations locales, sans activation automatique.
- Generer : generation admin-only de brouillons et export de draft pack.
- Evaluer : import local de draft pack, grille locale, export evaluation.
- Comparer : import local de plusieurs evaluations et export comparaison.
- Securite : gouvernance, retour arriere, limites institutionnelles.
- Systeme : health, stockage, utilisateurs, cours, prototypes, sessions.

La navigation utilise le hash de l'URL (`#catalog`, `#evaluate`, etc.) et ne stocke pas les brouillons, evaluations, imports ou comparaisons dans `localStorage`.

## Emplacement de `.env`

Le fichier `.env` doit rester a la racine du workspace :

`<racine-du-workspace>/.env`

Il ne doit jamais etre committe.

Verification :

```powershell
git check-ignore -v .env
git ls-files .env
```

La premiere commande doit montrer une regle `.gitignore`. La seconde ne doit rien retourner.

## Securite des cles

Les cles provider restent cote serveur. L'admin peut afficher si une cle est detectee, mais jamais sa valeur.

Principes :

- ne jamais afficher le contenu de `.env`;
- ne jamais logger une cle;
- ne jamais appeler OpenAI depuis le navigateur;
- ne jamais envoyer de texte apprenant a OpenAI sans runtime explicitement concu, audite et valide;
- en cas de doute, desactiver `allowedForRuntime`.

## Synchroniser OpenAI

Depuis l'admin V0.9.6, le bouton de synchronisation appelle l'endpoint local :

`POST /api/admin/ai/providers/openai/sync-models`

Le navigateur contacte uniquement le Hub local. Le serveur contacte OpenAI pour lire la liste des modeles accessibles. Cette action ne lance aucune generation.

## AI Lab scenarios controles, draft packs et comparaison hors ligne

La V0.9.6 conserve trois endpoints admin-only :

- `GET /api/admin/ai/runtime/status`;
- `POST /api/admin/ai/runtime/smoke-test`;
- `POST /api/admin/ai/runtime/ic-agent-draft`.

Ces endpoints sont reserves aux admins. Ils ne sont pas appeles au chargement de page. Ils ne sont executes qu'apres une action explicite dans l'admin.

Le modele utilise doit venir du catalogue local `ai_models` :

- provider `openai`;
- statut disponible;
- `allowedForRuntime = true`;
- non stale;
- non deprecated;
- `providerModelId` present.

Le frontend ne peut pas fournir un nom de modele arbitraire.

Le formulaire de brouillon envoie seulement des champs controles :

- modele catalogue;
- personnage;
- langue cible;
- scenario pedagogique;
- theme climatique limite a 120 caracteres;
- longueur entre 20 et 60 mots;
- prudence pedagogique `safe` ou `exploratory`.

Le prompt complet est construit cote serveur. L'endpoint refuse les champs de prompt libre, texte apprenant, launchToken ou donnees personnelles.

La reponse de generation est structuree avec `draft`, `checks` et `safety`. Les checks restent locaux et simples : markdown detecte, point d'interrogation, longueur approximative et langue cible attendue.

Les brouillons affiches dans l'admin V0.9.6 sont conserves uniquement en memoire JavaScript de la page. Ils disparaissent au rechargement. Ils ne sont pas envoyes en base.

La V0.9.2 ajoute une grille d'evaluation locale par brouillon :

- clarte pour l'intercomprehension;
- transparence lexicale;
- adequation au scenario;
- naturel de la langue cible;
- prudence pedagogique;
- reutilisabilite dans Prototype 06;
- cout / interet du modele.

Chaque critere est note de 1 a 5. Le score moyen, les recommandations, les favoris et les commentaires restent en memoire JavaScript uniquement. Ils ne sont pas envoyes au serveur, pas stockes en base, pas ecrits dans `run_events` et pas conserves en `localStorage`.

L'export JSON de session est genere cote navigateur. Il peut contenir les textes generes et les commentaires d'evaluation, mais aucun secret, token, cle API ou donnee apprenante.

La V0.9.3 enrichit l'export avec :

- `schema`;
- `schemaVersion`;
- `rubricVersion`;
- `exportedAt`;
- `evaluator.label`;
- `drafts`;
- `ratings`;
- `score`;
- `comment`;
- `favorite`;
- `safety`.

La section `Comparaison multi-evaluateurs` importe plusieurs exports JSON cote navigateur uniquement. Les fichiers sont limites a 2 Mo chacun, valides par schema, puis compares localement. Aucun upload serveur n'est effectue.

La comparaison affiche des agregats, un tableau de scores, les brouillons avec fort desaccord et des details par critere. L'export de comparaison est aussi genere cote navigateur.

La V0.9.4 ajoute un format `ic-hub-ai-lab-draft-pack`. Le workflow recommande est :

1. un admin genere un lot commun de brouillons;
2. il exporte `Exporter le lot de brouillons a evaluer`;
3. chaque evaluateur importe ce meme draft pack;
4. chaque evaluateur note localement et exporte son evaluation;
5. l'admin importe les evaluation-exports et compare les resultats.

Les evaluations V0.9.4 contiennent `draftPackId` et conservent les `draftId` originaux. La comparaison regroupe prioritairement par `draftPackId + draftId` et affiche un warning si plusieurs packs differents sont melanges.

Les appels OpenAI utilisent `store: false`. Les textes generes ne sont pas ecrits en base, ni dans `run_events`, ni injectes dans Prototype 06.

## Verifier le mode JSON

Depuis `prototypes/00-ic-hub/server` :

```powershell
node --check server.js
node server.js
```

Puis ouvrir :

`http://127.0.0.1:8790/admin-0.9.6.html`

Verifier :

- health en `store = json`;
- admin V0.9.6 accessible;
- checklist visible;
- modeles recommandes ou message fallback;
- teacher/student interdits sur les endpoints admin IA.

## Verifier le mode MariaDB

Depuis `prototypes/00-ic-hub/server` :

```powershell
node db/migrate-json-to-mariadb.js
$env:IC_HUB_STORE="mariadb"
node server.js
```

Puis ouvrir :

`http://127.0.0.1:8790/admin-0.9.6.html`

Verifier :

- health en `store = mariadb`;
- counts DB presents;
- providers/modeles lisibles;
- admin V0.9.6 accessible.

## Savoir si l'IA est active ou non

L'IA generative est consideree non active si :

- Prototype 06 utilise encore le runtime scenarise;
- aucune route runtime ne demande a un provider de generer un contenu apprenant;
- les modeles sont seulement catalogues;
- les AIConfig restent des profils administratifs.

Un modele synchronise, recommande ou autorise runtime n'est pas une activation.

## Procedure retour arriere d'urgence

Cette procedure est guidee et manuelle. Il n'y a pas de bouton destructif automatique.

1. Verifier que Prototype 06 utilise le runtime scenarise.
2. Desactiver `allowedForRuntime` sur les modeles douteux.
3. Repasser les AIConfig experimentales en `planned` ou `disabled`.
4. Verifier que le bandeau admin indique toujours "aucune IA generative active".
5. Relancer le Hub en mode JSON si besoin.
6. Consulter ce guide mainteneur.

En cas de doute : desactiver les modeles runtime et conserver le mode scenarise.

## Retour arriere vers runtime scenarise

Pour revenir a l'etat le plus prudent :

1. garder ou remettre l'AIConfig scenarisee par defaut pour Prototype 06;
2. desactiver `allowedForRuntime` sur les modeles incertains;
3. laisser les providers en `planned` ou `disabled` si necessaire;
4. relancer le Hub en mode JSON si MariaDB pose probleme;
5. verifier que Prototype 06 lance toujours ses activites sans generation IA.

## Ce qui active reellement l'IA

Synchroniser les modeles OpenAI :

- contacte OpenAI cote serveur;
- recupere la liste des modeles;
- ne genere aucun texte;
- n'envoie aucun texte apprenant.

Pour qu'une IA generative soit reellement active, il faudrait explicitement :

1. associer une AIConfig a un modele autorise;
2. creer un endpoint serveur de generation;
3. modifier le runtime Prototype 06;
4. autoriser le mode generatif;
5. tester la securite;
6. valider pedagogiquement.

En V0.9.6, seuls les endpoints admin serveur sont actifs pour test controle. Aucun branchement Prototype 06 ou parcours apprenant n'est actif.

## Donnees apprenantes

Dans l'etat actuel du prototype :

- reponses apprenantes stockees dans les traces : non, seulement longueur / presence selon le flux existant;
- reponses apprenantes envoyees a OpenAI : non;
- textes generes par IA stockes : non;
- audio IA genere : non;
- donnees personnelles envoyees a un provider : non.

## Checklist avant activation future

Avant toute activation generative :

- verifier base legale / cadre institutionnel;
- verifier information des apprenants;
- verifier minimisation des donnees;
- ne jamais envoyer de texte libre apprenant sans justification;
- tester avec prompts fictifs;
- limiter duree et couts;
- journaliser uniquement des metadonnees non sensibles;
- prevoir desactivation immediate;
- valider pedagogiquement avec enseignant responsable.

## Prochaines etapes recommandees

1. Verifier l'etat IA dans `admin-0.9.6.html`.
2. Synchroniser les modeles si la cle serveur est presente.
3. Marquer 2 ou 3 modeles texte comme `recommended` apres verification.
4. Renseigner les prix depuis les tarifs officiels.
5. Associer une AIConfig a un modele catalogue recommande.
6. Tester cote serveur seulement.
7. Brancher un parcours apprenant uniquement apres validation pedagogique, technique et budgetaire.
