# Rapport 191 — Audit du modèle de préparation des langues Dico-IC

Date : 18 août 2026  
Nature : audit technique ciblé, exploratoire et documentaire  
Périmètre : `prototypes/08-dico-seven-sieves`, API et administration Dico-IC, assistants IA, Seven Sieves et MariaDB `ic_dico`

## 1. Résumé exécutif

Le modèle actuel ne peut pas représenter honnêtement les trois catégories attendues pour la soutenance avec le seul booléen `language.is_active`.

- avec `is_active = 0`, une langue disparaît de `GET /languages`, de l'administration et des assistants qui consomment cette route ;
- avec `is_active = 1`, elle est acceptée par `POST /analysis`, par les créations lexicales et par plusieurs assistants, même sans aucune donnée exploitable ;
- `is_romance` décrit une propriété linguistique, pas la présence de contenu ni l'analysabilité ;
- la présence de formes lexicales permet de mesurer une couverture, mais ne constitue pas à elle seule un statut éditorial stable.

La solution minimale recommandée est d'ajouter à `language` un statut documentaire explicite à deux valeurs, par exemple `documentation_status = DOCUMENTED | REFERENCED`, tout en conservant `is_active` comme coupe-circuit opérationnel. Les trois catégories publiques sont alors obtenues sans duplication inutile :

| Donnée | Classification publique |
|---|---|
| `is_romance = 1`, `documentation_status = DOCUMENTED` | Langue romane documentée |
| `is_romance = 0`, `documentation_status = DOCUMENTED`, cas actuel EN | Langue de comparaison — non romane |
| `is_romance = 1`, `documentation_status = REFERENCED` | Langue romane référencée — prête à documenter |

La liste opérationnelle doit rester filtrée par `is_active = 1 AND documentation_status = 'DOCUMENTED'`. Un nouveau catalogue de lecture doit exposer toutes les langues et leur statut à l'écran de soutenance. Les sept langues futures pourront ainsi être enregistrées avec `documentation_status = REFERENCED` et `is_active = 0` : visibles dans le catalogue, absentes de tous les choix analysables et de tous les chemins d'écriture ordinaires.

Cette séparation préserve le contrat actuel de `GET /languages`, empêche Seven Sieves d'accepter silencieusement une langue vide et ne nécessite ni table supplémentaire ni contenu lexical fictif.

## 2. Instructions, périmètre et état initial

### 2.1 Instructions applicables

Un seul fichier `AGENTS.md` existe dans le dépôt. La mission active explicitement le mode d'audit technique et interdit toute modification applicative, de schéma, de seed, de test, de configuration ou de donnée.

La section « Production des résultats » de `AGENTS.md` demande normalement d'écrire les audits dans `IC-Lab-Next-Technical`, tandis que la mission 191 autorise et impose explicitement :

`IC-Lab-Next/reports/191_dico_ic_language_readiness_model_audit.md`

Conformément à l'ordre de priorité défini dans le même `AGENTS.md`, l'instruction explicite de la mission prévaut. Le présent rapport est l'unique écriture de la mission. Aucun fichier d'instructions n'a été modifié.

### 2.2 État Git initial

- branche : `main` ;
- commit observé : `9d71369` ;
- état Git initial : propre, aucun fichier modifié ou non suivi ;
- rapports existants : séquence maximale `190`, aucune collision avec le numéro `191`.

Les rapports 188, 189 et 190 ont été lus et confrontés au code et aux données actuels. Ils ne sont pas utilisés comme substituts à l'observation réelle.

### 2.3 Méthode non mutatrice

- inspection statique des sources, tests, SQL, pages et launchers ;
- lecture des trois rapports imposés ;
- interrogation de MariaDB exclusivement par `SHOW` et `SELECT` ;
- aucun serveur applicatif démarré ;
- aucun test exécuté, car la mission demande un audit et un plan de tests, pas une recette dynamique ;
- aucun appel HTTP, route d'écriture, script SQL, migration, seed ou procédure mutatrice.

## 3. État réel de la table `language`

### 3.1 Définition effective dans MariaDB

La table réelle contient :

| Colonne | Type | Null | Défaut | Rôle observé |
|---|---|---:|---|---|
| `id` | `int`, auto-incrément | non | — | identifiant référencé |
| `code` | `varchar(5)` | non | — | code unique |
| `name` | `varchar(50)` | non | — | nom affichable |
| `family` | `varchar(50)` | oui | `NULL` | famille textuelle |
| `is_romance` | `tinyint(1)` | non | `0` | appartenance romane |
| `is_active` | `tinyint(1)` | non | `1` | disponibilité opérationnelle |

Contraintes : clé primaire sur `id`, unicité `uq_language_code` sur `code`. Il n'existe aucune colonne de statut documentaire, de capacité, de couverture ou de rôle applicatif.

### 3.2 Données réelles

| ID | Code | Nom | Famille | Romane | Active | Formes lexicales | Formes fléchies | Aides discursives |
|---:|---|---|---|---:|---:|---:|---:|---:|
| 1 | `fr` | Français | Romance | oui | oui | 123 | 0 | 6 |
| 2 | `es` | Español | Romance | oui | oui | 126 | 16 | 6 |
| 3 | `it` | Italiano | Romance | oui | oui | 117 | 0 | 0 |
| 4 | `pt` | Português | Romance | oui | oui | 115 | 0 | 0 |
| 5 | `en` | English | Germanic | non | oui | 116 | 0 | 0 |

Les relations observées sont ES→FR (2), FR→EN (20), FR→ES (18), FR→IT (15) et FR→PT (15). L'unique règle est ES→FR. Ces volumes montrent une documentation lexicale réelle pour les cinq langues, mais des capacités pédagogiques spécialisées inégales.

### 3.3 Références SQL vers `language`

Clés étrangères directes :

- `lexical_form.language_id` ;
- `connector_help.language_id` ;
- `pattern_rule.source_language_id` ;
- `pattern_rule.target_language_id`.

`form_relation` dépend indirectement des langues par ses deux formes lexicales. Les procédures effectives qui lisent ou écrivent des objets linguistiques incluent notamment `sp_upsert_language`, `sp_upsert_lexical_form`, `sp_insert_form_relation`, `sp_insert_ic_feature` et les procédures historiques de recherche de relations.

`sp_upsert_language` ne connaît actuellement que `code`, `name`, `family`, `is_romance` et `is_active`. Tout ajout de statut devra donc mettre à jour son contrat de reproduction ou décider explicitement de ne plus l'utiliser pour ce champ.

## 4. Sémantique effective de `is_active`

`is_active` n'est pas un simple badge d'affichage. Il commande plusieurs frontières fonctionnelles.

1. `Node/src/repository.js#getLanguages()` exécute `WHERE is_active = 1`.
2. `GET /languages` retourne directement cette liste.
3. `POST /analysis` valide source, médiation et comparaisons uniquement contre cette liste.
4. Les créations et mises à jour de formes résolvent une langue avec `code = ? AND is_active = 1`.
5. Connector Help impose une langue active, puis limite encore à ES/FR.
6. Les assistants Domaine et Texte valident leurs cibles contre les langues retournées par `getLanguages()`.
7. L'assistant Formes fléchies exige à la fois une langue active et le code FR/ES/IT/PT.
8. Les lectures publiques d'aides discursives filtrent `l.is_active = 1`.

Le mot « actif » signifie donc actuellement : autorisé à circuler dans les contrats opérationnels. Il ne signifie ni « référencé », ni « documenté », ni « couvert par tous les outils ».

Une incohérence secondaire existe dans l'administration : `getAdminModelSummary()` compte toutes les lignes de `language`, sans filtre, alors que la section Langues charge `/languages` et n'affiche que les lignes actives. Avec des langues inactives, le compteur et la table divergeraient déjà.

## 5. Cartographie des dépendances

### 5.1 API et repository

| Surface | Lecture/filtre actuel | Effet d'une nouvelle langue active sans contenu |
|---|---|---|
| `GET /languages` | toutes les lignes `is_active = 1` | annoncée comme disponible |
| `POST /analysis` | valide contre `GET /languages` | requête acceptée, résultats pauvres ou vides |
| `GET /admin/model-summary` | compte toutes les langues | compteur gonflé sans qualification |
| créations/éditions lexicales | langue active exigée | autorise l'ajout manuel de formes |
| Connector Help public/admin | active puis ES/FR | pas de fuite fonctionnelle hors ES/FR |
| lectures lexicales et relations | jointures par code/ID, souvent sans filtre actif | des données éventuelles restent lisibles selon la route |

Fichiers principaux :

- `Node/src/repository.js` ;
- `Node/src/analysis.js` ;
- `Node/src/admin.js` ;
- `Node/server.js`.

### 5.2 Administration Dico-IC

`admin/js/admin-0.1.js` charge `/languages` une fois puis réutilise la liste :

- table « Langues actives » et compteur de lignes ;
- sélecteurs de langue des formulaires lexicaux ;
- formulaires précréés FR/ES/IT/PT ;
- validation et édition envoyées aux routes admin.

La vue de lecture `INFORMATION_DATA` possède un ordre public fixe FR/ES/IT/PT/EN dans `admin/js/admin-entry-0.1.1.js`. Elle ne constitue pas un catalogue général et ne doit pas être étendue pour simuler la présence de formes dans les sept langues.

Fichiers d'affichage concernés ultérieurement :

- `admin/index-admin-0.1.html` ;
- `admin/js/admin-0.1.js` ;
- `admin/css/admin-0.1.css` ;
- éventuellement la vue d'entrée uniquement pour garantir qu'elle continue à n'afficher que ses formes réelles, sans carte vide inventée.

### 5.3 Assistants IA

| Assistant | Politique actuelle |
|---|---|
| Domaine | toutes les langues actives sont proposées ; FR/ES/IT/PT cochées par défaut, EN non cochée |
| Texte | toutes les langues actives sont proposées comme cibles ; source limitée visuellement aux quatre codes par défaut |
| Formes fléchies | double protection : langue active et liste dure FR/ES/IT/PT |
| Relations | pivot fixé en dur à FR/ES/IT/PT/EN/`all`; travaille sur les formes de l'entrée |

Fichiers :

- `Node/src/admin-ai-domain.js` ;
- `Node/src/admin-ai-text.js` ;
- `Node/src/admin-ai-inflected-form.js` ;
- `Node/src/admin-ai-relations.js` ;
- `admin/js/admin-ai-domain-0.1.js` ;
- `admin/js/admin-ai-text-0.1.js` ;
- `admin/js/admin-ai-relations-0.1.js` ;
- pages HTML correspondantes.

Si les sept lignes étaient simplement actives, Domaine et les choix cibles de Texte les exposeraient immédiatement. La liste dure protège Formes fléchies et Relations, mais ne suffit pas à protéger l'ensemble.

### 5.4 Seven Sieves

Les pages live canoniques et pédagogiques déclarent en dur quatre choix : ES, FR, IT et PT pour source, médiation et comparaison. Elles ne chargent pas `GET /languages`. Elles ne proposeraient donc pas spontanément CA/GL/OC/RO/CO/SC/RM.

La protection frontend est cependant insuffisante comme garantie d'architecture : `POST /analysis` accepte tout code renvoyé par `getLanguages()`. Un client direct ou une future UI dynamique pourrait donc analyser une langue active vide.

Fichiers concernés par la non-régression :

- `prototypes/01-seven-sieves/index-api-live-0.1.html` ;
- `prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html` ;
- `prototypes/01-seven-sieves/js/seven-sieves-api-live-v0.js` ;
- `Node/src/analysis.js` et `Node/src/repository.js`.

Recommandation : ne pas modifier Seven Sieves lors de l'ajout des sept langues. La garantie doit être côté API par une liste analysable distincte du catalogue.

### 5.5 SQL, seeds et scripts

Les cinq langues courantes figurent dans plusieurs artefacts historiques :

- `database/sql.sql` ;
- `database/init_schema.sql` ;
- `database/schema.sql` ;
- `database/data_test.sql` ;
- `database/seed_data.sql` ;
- `database/sp_insert.sql` ;
- `database/procedures.sql` ;
- `database/current_draft/00_schema.sql` ;
- `database/current_draft/10_procedures.sql` ;
- `database/current_draft/20_seed_base.sql` et seeds suivants.

Le README de `database/current_draft/` précise que ce dossier reste un brouillon et n'est pas une source de vérité finale. Le volume MariaDB est externe et `db/` ne fournit pas actuellement une migration versionnée suffisante pour cette évolution. La mission d'implémentation devra donc créer un script de migration explicite, contrôlable et réversible, sans rejouer les anciens fichiers destructifs.

Le script ciblé `Node/scripts/correct-information-data-source-label.js` fournit un précédent utile pour les modes `--check`, `--apply`, `--rollback`, la sauvegarde et les assertions, mais il ne doit pas être modifié pour cette évolution.

### 5.6 Tests existants à adapter ou compléter

Surface minimale :

- `Node/test/analysis.test.js` : validation des langues analysables ;
- `Node/test/admin.test.js` : langues acceptées pour les formes ;
- `Node/test/admin-manual-routes.test.js` : doubles `getLanguages()` et routes d'écriture ;
- `Node/test/admin-ai-domain.test.js` ;
- `Node/test/admin-ai-text.test.js` ;
- `Node/test/admin-ai-inflected-form.test.js` ;
- `Node/test/admin-ai-relations.test.js` : maintien de la liste pivot ;
- `Node/test/connector-help.test.js` ;
- `Node/test/admin-presentation.test.js` : compteurs documentés/référencés et catalogue ;
- `Node/test/static-files.test.js` : textes publics et absence des sept langues dans les contrôles Seven Sieves.

Les tests actuels utilisent souvent des tableaux FR/ES/IT/PT/EN sans propriété de statut. Le changement devra conserver une valeur par défaut compatible dans les doubles ou enrichir explicitement les fixtures.

## 6. Solutions comparées

### Option A — Réutiliser `is_active`

Deux variantes sont possibles, toutes deux insuffisantes.

- Sept langues inactives : sûres pour l'analyse, mais absentes de `/languages`, de la table admin actuelle et du récit public.
- Sept langues actives : visibles, mais déclarées opérationnelles à tort et acceptées par l'analyse et plusieurs assistants.

Avantage : aucun schéma supplémentaire.  
Défaut rédhibitoire : impossible d'être à la fois visible et non analysable.  
Décision : rejetée.

### Option B — Déduire le statut du contenu réel

Le système pourrait compter les formes par langue et appeler « documentée » toute langue non vide.

Avantages : mesure dynamique et aucun champ éditorial.  
Limites : seuil non défini, couverture très inégale, contenu provisoire potentiellement compté comme documentation, impossibilité d'exprimer l'intention « référencée et prête à documenter » avant la première forme. Cela ne remplace pas un état de catalogue.  
Décision : utile comme métrique complémentaire, insuffisante comme statut.

### Option C — Ajouter un booléen de capacité (`analysis_enabled` ou équivalent)

Avantage : sépare clairement la visibilité de l'analysabilité.  
Limite : ne dit pas pourquoi une langue est désactivée et ne distingue pas « référencée » d'une langue suspendue ou obsolète. Un second mécanisme resterait nécessaire pour le message public.  
Décision : plus précis que `is_active`, mais incomplet pour la mission.

### Option D — Ajouter un statut unique à trois valeurs publiques

Exemple : `DOCUMENTED_ROMANCE`, `NON_ROMANCE_COMPARISON`, `REFERENCED_ROMANCE`.

Avantage : rendu immédiat et simple.  
Limite : mélange dans une même colonne la famille linguistique (`is_romance` existe déjà), la couverture documentaire et le rôle de comparaison. Des combinaisons futures deviennent rigides ou contradictoires.  
Décision : faisable, mais moins propre que la recommandation.

### Option E — Statut documentaire distinct, avec propriétés existantes

Ajouter `documentation_status = DOCUMENTED | REFERENCED`, conserver `is_romance` pour la famille et `is_active` pour l'opérationnel.

Avantages : une seule colonne nouvelle, trois catégories publiques dérivables, pas de duplication du caractère roman, filtre d'analyse explicite, évolution possible de la couverture sans réécrire le modèle.  
Limite : le rôle « comparaison » de l'anglais est dérivé de sa non-romanicité et de son état documenté dans le périmètre actuel ; si Dico-IC accueille plus tard plusieurs langues non romanes avec des rôles différents, un champ `usage_role` séparé deviendra pertinent.  
Décision : recommandée pour le périmètre de soutenance.

### Option F — Table de capacités par langue

Une table `language_capability(language_id, capability, status, ...)` pourrait distinguer analyse, IA, connecteurs, flexion et documentation.

Avantages : modèle extensible et très précis.  
Limites : migration, jointures, administration et gouvernance disproportionnées pour douze langues et trois états publics ; le contenu actuel ne justifie pas encore ce niveau.  
Décision : à reconsidérer seulement si les capacités deviennent réellement indépendantes et administrables.

## 7. Recommandation détaillée

### 7.1 Modèle minimal

Ajouter à `language` :

```text
documentation_status VARCHAR(20) NOT NULL DEFAULT 'DOCUMENTED'
CHECK (documentation_status IN ('DOCUMENTED', 'REFERENCED'))
```

Une chaîne contrainte est préférable ici à un `ENUM` MariaDB si l'on veut des migrations et extensions futures plus lisibles. Le choix final peut rester un `ENUM` si la convention du projet le préfère, sans changer l'architecture recommandée.

État cible :

| Codes | `is_romance` | `documentation_status` | `is_active` | Sens |
|---|---:|---|---:|---|
| FR, ES, IT, PT | 1 | `DOCUMENTED` | 1 | documentées et opérationnelles |
| EN | 0 | `DOCUMENTED` | 1 | documentée comme comparaison non romane |
| CA, GL, OC, RO, CO, SC, RM | 1 | `REFERENCED` | 0 | visibles au catalogue, non analysables |

### 7.2 Deux listes, deux contrats

Conserver `GET /languages` comme contrat des langues opérationnelles. Sa requête doit devenir :

```text
WHERE is_active = 1
  AND documentation_status = 'DOCUMENTED'
```

Ajouter une lecture de catalogue, par exemple `GET /language-catalog`, qui retourne toutes les lignes avec : code, nom, famille, `is_romance`, `is_active`, `documentation_status`, classification publique dérivée et métriques réelles de contenu.

Cette nouvelle route peut alimenter uniquement la section publique/administrative de présentation. Les routes d'analyse, d'écriture et les assistants continuent à consommer la liste opérationnelle. Il ne faut pas remplacer globalement `getLanguages()` par le catalogue.

### 7.3 Compteurs honnêtes

Afficher séparément :

- **4 langues romanes documentées** ;
- **1 langue de comparaison — non romane** ;
- **7 langues romanes référencées, prêtes à accueillir des contenus validés**.

Le total de `language` peut rester disponible comme détail technique (« 12 langues référencées au catalogue »), mais ne doit pas remplacer ces trois compteurs. Les compteurs doivent provenir de MariaDB, pas de constantes frontend.

La couverture lexicale réelle par langue doit rester une métrique distincte. Une langue `DOCUMENTED` n'est pas présentée comme couverte uniformément par tous les objets ou tous les tamis.

### 7.4 Libellés publics proposés

Libellés courts :

- **Langue romane documentée** ;
- **Langue de comparaison — non romane** ;
- **Langue romane référencée — prête à documenter**.

Message principal de soutenance :

> Dico-IC documente actuellement quatre langues romanes et utilise l'anglais comme langue non romane de comparaison. Sept autres langues romanes sont déjà référencées dans le dispositif, prêtes à accueillir des contenus produits et validés par les spécialistes concernés.

Aide contextuelle discrète :

> « Référencée » décrit la capacité d'accueil du catalogue. Cette langue ne contient pas encore de ressources lexicales validées et n'est pas proposée dans l'analyse.

À éviter : « prise en charge », « disponible », « couverte », « opérationnelle » ou « analysable » pour CA/GL/OC/RO/CO/SC/RM.

## 8. Garantie pour Seven Sieves

La garantie doit reposer sur quatre niveaux cumulés :

1. `GET /languages` filtre `is_active = 1` et `DOCUMENTED` ;
2. `validateRequest()` de `POST /analysis` continue à valider chaque code contre cette liste ;
3. les pages Seven Sieves conservent leurs quatre choix explicites FR/ES/IT/PT pendant ces deux missions ;
4. un test d'intégration appelle `/analysis` avec chacun des sept codes et exige `400 INVALID_LANGUAGE`.

Des tests supplémentaires doivent vérifier que :

- `/language-catalog` contient les sept codes comme `REFERENCED` ;
- `/languages` ne contient aucun de ces sept codes ;
- aucun checkbox ou `<option>` des assistants opérationnels ne les propose ;
- aucune forme, relation, règle, aide ou forme fléchie n'est créée pour eux ;
- les compteurs de concepts et formes restent inchangés après leur référencement.

Cette protection côté serveur reste valide même si un utilisateur forge une requête HTTP ou si Seven Sieves devient dynamique plus tard.

## 9. Plan en deux missions ultérieures

### Mission 192A — Introduire la capacité de statut, sans ajouter de langue

Périmètre recommandé :

1. sauvegarder la définition et les cinq lignes de `language` ;
2. créer un script versionné avec `--check`, `--apply`, `--rollback` ;
3. ajouter `documentation_status` avec défaut `DOCUMENTED` et contrainte ;
4. vérifier que les cinq lignes existantes sont `DOCUMENTED`, sans autre changement ;
5. scinder dans le repository la liste opérationnelle et le catalogue ;
6. préserver le contrat de `GET /languages` et ajouter la route catalogue ;
7. rendre les trois compteurs et libellés dans l'administration, avec zéro langue référencée à ce stade ;
8. adapter les procédures/sources SQL de reproduction explicitement retenues, sans réécrire les dumps historiques ;
9. ajouter les tests unitaires, routes, SQL et présentation ;
10. vérifier HTTP et visuellement les états 4/1/0.

Fichiers probables :

- nouveau script sous `Node/scripts/` ;
- `database/current_draft/00_schema.sql` et `10_procedures.sql`, après confirmation qu'ils restent les artefacts de reproduction retenus ;
- `Node/src/repository.js` ;
- `Node/server.js` ;
- `admin/index-admin-0.1.html` ;
- `admin/js/admin-0.1.js` ;
- `admin/css/admin-0.1.css` ;
- tests listés en section 5.6.

Critères d'arrêt : toute divergence entre schéma attendu et schéma réel, statut préexistant inattendu ou impossibilité de sauvegarder/restaurer exactement la table.

Rollback : retirer les changements applicatifs, restaurer le contrat initial, puis supprimer la contrainte et la colonne seulement après avoir vérifié que les cinq valeurs sont celles créées par la migration. La sauvegarde conserve le DDL et les lignes avant opération.

### Mission 192B — Ajouter transactionnellement les sept langues

Précondition : mission précédente validée, sauvegarde récente et recette de `/languages` réussie.

1. préparer les sept lignes exactes CA/GL/OC/RO/CO/SC/RM ;
2. valider humainement les noms affichés avant écriture ;
3. exécuter un script transactionnel et idempotent avec verrouillage ;
4. insérer uniquement les codes absents avec `family = Romance`, `is_romance = 1`, `documentation_status = REFERENCED`, `is_active = 0` ;
5. refuser toute collision de code portant des valeurs différentes ;
6. affirmer exactement sept lignes ajoutées au premier passage et zéro au second ;
7. vérifier zéro ligne dépendante dans les quatre tables à clés étrangères ;
8. vérifier 12 langues au catalogue, toujours 5 dans `/languages`, et compteurs publics 4/1/7 ;
9. exiger le rejet des sept codes par `/analysis` et leur absence des assistants ;
10. effectuer la recette visuelle de la section catalogue, sans modifier Seven Sieves.

Artefact recommandé : nouveau script dédié sous `Node/scripts/`, avec sauvegarde JSON ciblée et modes `--check`, `--apply`, `--rollback`. Le seed de reproduction retenu pourra ensuite être enrichi, sans toucher aux anciens dumps historiques.

Rollback : suppression des sept lignes uniquement si elles correspondent exactement à la sauvegarde d'application et si aucune dépendance n'existe ; sinon arrêt sans suppression et arbitrage humain. La suppression doit être transactionnelle et suivie du contrôle 5/5 des listes catalogue/opérationnelle.

## 10. Plan de tests complet

### Analyse statique

- syntaxe JS et SQL ;
- vérification des constantes et filtres ;
- inventaire des appels à `getLanguages()` pour interdire un remplacement accidentel par le catalogue ;
- `git diff --check`.

### Tests automatisés

- migration fraîche, état déjà appliqué, état partiel refusé, rollback exact ;
- cinq langues existantes conservées octet pour octet hors nouvelle colonne ;
- sept insertions exactes puis rejeu idempotent ;
- `/languages` = FR/ES/IT/PT/EN uniquement ;
- `/language-catalog` = 12 lignes et statuts exacts ;
- analyse rejetée pour chaque code référencé ;
- créations lexicales et assistants refusant les sept codes ;
- compteurs 4/1/7, total catalogue 12, volumes lexicaux inchangés ;
- non-régression des 107 tests actuellement documentés par le rapport 190.

### Base réelle

- sauvegarde avant opération ;
- `SHOW CREATE TABLE language` avant/après ;
- comparaison champ par champ des cinq lignes ;
- comptage exact des sept lignes et de leurs dépendances ;
- deuxième exécution à zéro changement ;
- rollback testé sur une copie jetable avant toute restauration réelle.

### HTTP

- `GET /languages` ;
- nouvelle route catalogue ;
- `GET /admin/model-summary` ;
- `POST /analysis` succès sur ES et refus sur chacun des sept codes ;
- routes admin/IA avec un code référencé forgé.

### Validation visuelle

- administration à 1440×900 et 1366×768 ;
- trois groupes et compteurs visibles sans prétention de couverture ;
- aide contextuelle repliée ;
- absence des sept langues dans les contrôles de création/analyse ;
- aucune erreur console, débordement, texte tronqué ou mojibake.

### Validation humaine

- validation par David des noms et libellés publics ;
- répétition du discours de soutenance ;
- confirmation par les spécialistes avant tout futur contenu lexical.

## 11. Risques et mesures de réduction

| Risque | Niveau | Mesure |
|---|---|---|
| Une langue référencée fuit dans `/analysis` | élevé | filtre serveur double `is_active + documentation_status`, test par code |
| Compteur « langues » interprété comme couverture | élevé | trois compteurs qualifiés, total relégué au détail |
| Assistants IA proposent des langues vides | élevé | conserver la liste opérationnelle pour toutes les validations |
| Incohérence entre scripts SQL historiques | moyen | migration dédiée ; ne pas rejouer les fichiers destructifs ; choisir les artefacts de reproduction |
| Valeurs de statut incohérentes avec `is_romance` | moyen | validation applicative, contraintes et tests de classification |
| Noms publics discutables (`Català`, `Galego`, etc.) | moyen | validation humaine préalable en mission d'ajout |
| Rollback supprime une langue devenue référencée par du contenu | élevé | refuser le rollback si une dépendance existe |
| Statut `DOCUMENTED` surévalue une couverture partielle | moyen | afficher séparément les volumes réels et éviter « couverture complète » |
| Futur besoin de plusieurs rôles non romans | faible à court terme | ajouter ultérieurement `usage_role` sans détourner `documentation_status` |

## 12. Coût et surface estimés

### Mission de statut

- coût : environ 4 à 6 heures ;
- surface : 7 à 12 fichiers selon le nombre de tests regroupés ;
- risque : moyen, car le changement touche le schéma et un contrat transversal, mais peut rester rétrocompatible ;
- version probable : incrément baby-step de l'administration ; contrat API `0.1` conservable si `/languages` ne change pas de forme.

### Mission d'ajout des sept langues

- coût : environ 2 à 4 heures, validation visuelle comprise ;
- surface : un script de données, un seed de reproduction retenu, quelques tests et éventuellement des ajustements de présentation ;
- risque : faible à moyen si la mission de statut est déjà validée ;
- aucun contenu lexical, relation, règle ou aide ne doit être créé.

Total réaliste : une journée à une journée et demie avec sauvegardes, rollback sur copie, tests complets et validation visuelle. La complexité vient moins des sept insertions que de la séparation sûre entre catalogue et analysabilité.

## 13. Éléments non vérifiés et limites

- aucun test automatisé n'a été exécuté pendant cet audit ; le plan de tests est prospectif ;
- aucune route HTTP ni page n'a été lancée ;
- aucune génération OpenAI n'a été déclenchée ;
- aucun test de migration ou rollback n'a été effectué, puisqu'ils impliqueraient des écritures interdites ;
- les noms natifs ou français définitifs des sept langues restent à valider humainement ;
- la recommandation ne prétend pas résoudre une future matrice fine de capacités par tamis ou assistant ;
- aucune validation fonctionnelle humaine par David n'a eu lieu pendant l'audit.

## 14. Contrôle de fin de mission

- unique fichier créé : `reports/191_dico_ic_language_readiness_model_audit.md` ;
- aucun fichier applicatif, schéma, migration, seed, test ou configuration modifié ;
- aucune donnée MariaDB modifiée ;
- aucune langue ou entrée lexicale ajoutée ;
- `INFORMATION_DATA`, `NUIT`, Seven Sieves, les aides discursives, les règles, Compose, les launchers et `AGENTS.md` inchangés ;
- aucun serveur ou processus temporaire démarré par la mission ;
- les conteneurs MariaDB et phpMyAdmin préexistants n'ont pas été modifiés ni arrêtés ;
- commandes volontairement non exécutées en raison du risque de mutation : tests, serveur Node, migration, seed, procédure SQL d'écriture, launcher et Compose ;
- aucun commit, push ou déploiement ;
- version applicative inchangée : vue de lecture Dico-IC `0.1.2`, API `0.1`, package Node `1.0.0`, Seven Sieves inchangé.

Message de commit proposé pour le rapport seul :

```text
docs(dico): auditer le modèle de préparation des langues
```
