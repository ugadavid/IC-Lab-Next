# Rapport 188 — Audit approfondi de Dico-IC avant stabilisation

Date : 18 août 2026  
Nature : mission exploratoire et documentaire, sans modification applicative ni écriture de données  
Périmètre : `prototypes/08-dico-seven-sieves`, base MariaDB `ic_dico`, interface Dico-IC Admin et client Seven Sieves

## 1. Résumé exécutif

Dico-IC démontre aujourd'hui un socle de connaissances réellement séparé de son client : Seven Sieves appelle `POST /analysis`, le serveur lit MariaDB `ic_dico`, construit un paquet JSON stateless puis le navigateur rend les enrichissements sans lire la base directement. La séparation des responsabilités est donc réelle au niveau données/API/client. Elle reste toutefois locale et incomplète : Dico-IC, l'API, l'administration et Seven Sieves sont servis par le même processus Express et appartiennent au même prototype ; aucun autre prototype du workspace ne consomme actuellement ce socle.

Les huit compteurs annoncés dans la mission correspondent exactement à la base réelle : **5 langues, 150 entrées lexicales, 597 formes lexicales, 16 formes fléchies, 12 aides discursives, 70 relations, 1 règle et 8 traits d'intercompréhension**.

La quantité brute masque plusieurs limites importantes :

- 115 entrées couvrent les quatre langues centrales FR/ES/IT/PT et 109 couvrent aussi EN ;
- 13 entrées n'ont aucune forme et sont toutes des doublons conceptuels très probables d'entrées déjà remplies ;
- les 16 formes fléchies sont exclusivement espagnoles et `VALIDATED` ;
- les 12 aides discursives sont exclusivement ES/FR et `VALIDATED` ;
- les 597 formes lexicales n'ont aucune provenance renseignée dans `source_label` ;
- les relations et les formes lexicales ne possèdent pas de colonne de statut de validation ;
- les 8 `ic_feature` sont comptés et affichés, mais ne sont pas lus par le chemin d'analyse actuel de Seven Sieves ;
- une seule règle `-ción → -tion` porte à elle seule les résultats des tamis 3 et 7 dans le texte de démonstration ;
- les tamis 4, 5 et une partie du 6 restent des heuristiques en mémoire, explicitement signalées comme expérimentales.

L'entrée existante recommandée pour la démonstration est `INFORMATION_DATA` : cinq formes (`information`, `información`, `informazione`, `informação`, `information`), quatre relations cognates, scores de 0,950 à 0,990 et une utilisation immédiatement visible dans Seven Sieves sur le mot espagnol `información`. Pourtant, l'interface actuelle ne montre pas sur une seule vue les relations, leur provenance et leur statut. Elle affiche le nombre « 4 », mais pas le détail. Le récit demandé n'est donc pas entièrement démontrable en 30 à 45 secondes sans préparation ou commentaire oral.

Deux anomalies sont prioritaires avant la soutenance :

1. `docker-compose.yml` est invalide : `phpmyadmin.depends_on` contient `docker ps`, service inexistant. `docker compose ps` échoue et le lanceur canonique, qui exécute `docker compose up -d`, devrait échouer dans cet état, malgré une documentation qui le présente comme fonctionnel ;
2. la page Seven Sieves déclarée canonique (`index-api-live-0.1.html`) ignore les `pedagogical_enrichments` d'aide discursive. La variante `index-api-live-pedagogical-hints-0.1.html` les consomme réellement, mais se présente elle-même comme expérimentale et n'est ni le lien de l'admin, ni celui de `PROJECTS_LAUNCH.md`.

## 2. Périmètre, méthode et arbitrage d'instructions

### 2.1 Périmètre observé

- racine canonique : `prototypes/08-dico-seven-sieves` ;
- serveur : `prototypes/08-dico-seven-sieves/Node` ;
- administration : `prototypes/08-dico-seven-sieves/admin` ;
- Seven Sieves actif : `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves` ;
- base propriétaire : MariaDB `ic_dico`, volume externe `ic_lab_next_mariadb_data` ;
- lancement Windows : `scripts/windows/start-dico-seven.bat` ;
- ports déclarés : MariaDB `3306`, Node/Express `3000`, phpMyAdmin `8080`.

### 2.2 Contradiction d'instructions arbitrée

La mission autorisait comme unique écriture un rapport dans `IC-Lab-Next/reports/`, tandis que la section « Mode d'audit technique » ajoutée localement à `AGENTS.md` interdisait toute écriture dans le dépôt et imposait `IC-Lab-Next-Technical`. Cette contradiction a été signalée avant l'audit. David a explicitement arbitré en faveur de `IC-Lab-Next/reports/` et demandé que le point soit consigné ici. Aucun autre fichier du dépôt n'a été écrit.

### 2.3 Méthode et protections

- inspection du code, de la configuration, des documents courants, des launchers et des tests ;
- requêtes MariaDB exclusivement en `SELECT` ;
- aucun script SQL, seed, migration ou procédure d'écriture exécuté ;
- aucun appel aux routes administratives d'écriture ;
- observation HTTP et visuelle sur le serveur existant, démarré temporairement sans migration ;
- recette à 1440 × 900 des écrans principaux ;
- exécution des 101 tests Node après vérification statique de l'absence d'écriture fichier/base réelle ;
- préservation de la modification préexistante de `AGENTS.md`.

## 3. Architecture réelle

```text
Navigateur
├── Dico-IC Admin /admin-app/*
└── Seven Sieves /prototypes/01-seven-sieves/*
             │
             │ HTTP, même origine logique :3000
             ▼
Serveur Node/Express :3000
├── fichiers statiques Admin et Seven Sieves
├── API publique GET /languages, GET /connector-helps, POST /analysis
├── API d'administration /admin/*
└── repository mysql2
             │
             ▼
MariaDB :3306 — base ic_dico
```

### 3.1 Points d'entrée canoniques

| Surface | URL canonique documentée | État observé |
|---|---|---|
| Administration | `http://127.0.0.1:3000/admin-app/index-admin-0.1.html` | Fonctionnelle, API connectée |
| Seven Sieves live | `http://127.0.0.1:3000/prototypes/01-seven-sieves/index-api-live-0.1.html` | Fonctionnelle, appelle `/analysis` |
| Seven Sieves avec aides | `.../index-api-live-pedagogical-hints-0.1.html` | Fonctionnelle, mais variante expérimentale non canonique |
| API d'analyse | `POST http://127.0.0.1:3000/analysis` | Contrat `0.1`, lecture seule et stateless |
| Ancien endpoint | `GET /cognates/:word` | Compatibilité historique, appelle `get_all_relations(?)` |

Les pages historiques ou alternatives restent dans le dossier Seven Sieves : `index-0.0.8.2.html`, `index-api-mock-0.1.html`, `index-api-live-pedagogical-hints-0.1.html`. Le lien de l'admin et la documentation de lancement pointent sur `index-api-live-0.1.html`.

### 3.2 Endpoints réellement utilisés

Le client Seven Sieves canonique envoie un unique `POST /analysis` avec texte, langue source, langue de médiation, langues de comparaison et tamis 1 à 7. Il n'appelle pas MariaDB et n'effectue pas une requête par mot.

Le backend lit :

- `language` pour valider les codes actifs ;
- `lexical_form` et `lexical_entry` pour les correspondances exactes ;
- `inflected_form` uniquement pour résoudre des surfaces non reconnues, avec `status = 'VALIDATED'` ;
- `form_relation` pour le tamis 1 ;
- `pattern_rule` pour les tamis 3 et 7 ;
- `connector_help` ES/FR validé pour `pedagogical_enrichments` ;
- aucune ligne `ic_feature` dans `loadAnalysisResources`.

### 3.3 Ce qui est dynamique et ce qui reste simulé ou heuristique

| Fonction | Nature actuelle |
|---|---|
| Tamis 1, cognats vers langue de médiation | dynamique, relations MariaDB |
| Tamis 2, famille multilingue | dynamique, présence de formes dans au moins trois langues demandées ; ne requiert pas de relations explicites |
| Tamis 3 et 7 | dynamique à partir de `pattern_rule`, mais une seule règle existe |
| Tamis 4 | heuristique JS serveur pour `c` devant `e/i` en espagnol ; expérimental |
| Tamis 5 | catégorie `verb` issue du lexique, transformée en rôle syntaxique probable ; pas d'analyse syntaxique contextuelle ; expérimental |
| Tamis 6 | mélange de formes fléchies validées et d'une heuristique d'infinitif espagnol ; expérimental |
| Aides discursives | données MariaDB validées, renvoyées hors tamis dans `pedagogical_enrichments` |
| État apprenant | exclusivement mémoire navigateur |
| Fallback | fichier `mock/analysis-response-v0.json`, proposé seulement si l'API semble indisponible |
| Variante aides pédagogiques | données API pour les connecteurs, plus enrichissements locaux Tamis 4/6 |

### 3.4 Limite de l'affirmation architecturale

« Seven Sieves consomme un socle de connaissances séparé » est **vrai pour la frontière API et la propriété des données** : le client consomme un contrat et ne lit pas MariaDB. Ce n'est pas encore la preuve d'un service mutualisé à l'échelle du laboratoire : les deux applications partagent le même serveur, le même dépôt de prototype et le même déploiement local ; aucun second client hors Seven Sieves n'est branché. L'autonomie logique existe, l'autonomie de déploiement et la mutualisation multi-clients restent à démontrer.

## 4. Inventaire exact de la base `ic_dico`

### 4.1 Compteurs

| Objet | Total réel |
|---|---:|
| Langues | 5 |
| Entrées lexicales | 150 |
| Formes lexicales | 597 |
| Formes fléchies | 16 |
| Aides discursives | 12 |
| Relations | 70 |
| Règles/motifs | 1 |
| Traits IC | 8 |

Il n'y a aucun écart entre ces huit valeurs, l'API `/admin/model-summary`, l'interface et la base réelle.

### 4.2 Langues et couverture

| Code | Nom | Active | Formes lexicales | Formes fléchies | Aides discursives |
|---|---|---:|---:|---:|---:|
| `fr` | Français | oui | 123 | 0 | 6 |
| `es` | Español | oui | 126 | 16 | 6 |
| `it` | Italiano | oui | 117 | 0 | 0 |
| `pt` | Português | oui | 115 | 0 | 0 |
| `en` | English | oui | 116 | 0 | 0 |

Couverture des 150 entrées :

- 109 possèdent FR/ES/IT/PT/EN ;
- 6 possèdent FR/ES/IT/PT sans EN ;
- donc 115 sont complètes dans les quatre langues centrales ;
- 13 ne possèdent aucune forme ;
- 12 ont une couverture partielle différente.

### 4.3 Statuts

- `inflected_form` : 16 `VALIDATED`, aucun autre statut présent ;
- `connector_help` : 12 `VALIDATED`, aucun autre statut présent ;
- `form_relation`, `lexical_form`, `lexical_entry`, `pattern_rule` et `ic_feature` : aucune colonne de statut ;
- la répartition « relations par statut » demandée est donc impossible dans le modèle actuel.

### 4.4 Formes fléchies

Les 16 mappings sont tous espagnols et tous validés. Provenance : 15 `ai_text_inflection_v0`, 1 `manual_admin_v0`. Confiance : 13 à 0,990, 2 à 0,950, 1 à 1,000. La V0 est limitée aux pluriels de noms/adjectifs FR/ES/IT/PT côté assistant, mais la base réelle ne contient que ES ; l'analyse n'émet le signal de pluriel attesté que pour un nom.

### 4.5 Aides discursives

Les 12 objets sont répartis également entre ES et FR :

- opposition : 2 par langue ;
- cause : 1 par langue ;
- conséquence : 1 par langue ;
- addition : 1 par langue ;
- chronologie : 1 par langue.

Tous sont `VALIDATED`, de provenance `connector_help_v0_seed`. Aucun n'est rattaché à une `lexical_entry`, ce rattachement étant facultatif.

### 4.6 Relations

| Type | Total |
|---|---:|
| `COGNATE_STRONG` | 47 |
| `COGNATE_WEAK` | 15 |
| `FALSE_FRIEND` | 8 |

Provenances : 35 `manual_seed_v2`, 29 `manual_seed`, 4 `api_mock_support_v0`, 2 `manual_admin_v0`. Toutes possèdent un score, une confiance et une provenance. Les relations sont surtout orientées depuis FR vers ES/IT/PT/EN, avec deux relations récentes ES→FR. Elles sont toutes symétriques dans les cas observés et aucun statut ne permet de distinguer proposition, validation humaine ou archivage.

### 4.7 Règles et traits

La seule règle est : ES→FR, `SUFFIX_TRANSFORM`, `ción`→`tion`, fiabilité 0,880. Elle produit dix résultats Tamis 3 et dix Tamis 7 dans le texte canonique, car chaque occurrence en `-ción` génère deux enrichissements.

Les 8 `ic_feature` se répartissent entre `FALSE_FRIEND_RISK`, `TRANSPARENCY_SCORE` et `GRAPHIC_SIMILARITY`, avec confiances de 0,800 à 0,980. Ils ne sont toutefois pas chargés par le repository d'analyse actuel et ne participent donc pas aux résultats Seven Sieves.

### 4.8 Provenance et confiance

- 597/597 `lexical_form.source_label` sont `NULL` ; la provenance n'est portée que ponctuellement par `notes` ;
- 597/597 formes ont une confiance, dont 487 à 1,000 ;
- toutes les relations ont provenance, score et confiance ;
- les entrées lexicales n'ont ni provenance structurée, ni statut, ni date de création/mise à jour ;
- seules les aides discursives possèdent `created_at` et `updated_at` ;
- le modèle ne permet donc pas de rendre l'actualisation et la responsabilité aussi explicites que le récit oral le souhaite.

### 4.9 Intégrité, doublons et incohérences

Contrôles exacts : zéro référence orpheline dans les six familles de clés étrangères, zéro auto-relation, zéro relation dupliquée par paire/type, zéro forme dupliquée selon langue + lemme normalisé + POS, zéro forme sans normalisation ou POS.

En revanche, les 13 entrées sans forme sont des doublons conceptuels très probables d'entrées remplies :

| Entrée vide | Entrée déjà remplie |
|---|---|
| `ABANDONNER` | `ABANDONAR` |
| `ADAPTER` | `ADAPTAR` |
| `BEAUCOUP` | `MUCHO` |
| `CEPENDANT` | `SIN_EMBARGO` |
| `CONTINUER` | `CONTINUAR` |
| `ESTUDIANTE_NOUN_STUDENT` | `STUDENT` |
| `OBSERVAR_VERB_TO_OBSERVE` | `OBSERVE` |
| `PARCE_QUE` | `PORQUE` |
| `PROJET` | `PROYECTO` |
| `TRAVAILLER` | `TRABAJAR` |
| `TROUVER` | `ENCONTRAR` |
| `UNIVERSIDAD_NOUN_UNIVERSITY` | `UNIVERSITY_INSTITUTION` |
| `UNIVERSITY` | `UNIVERSITY_INSTITUTION` |

Deux paires partagent même exactement leur glose : `STUDENT`/`ESTUDIANTE_NOUN_STUDENT` et `OBSERVE`/`OBSERVAR_VERB_TO_OBSERVE`.

### 4.10 Entrée recommandée

`INFORMATION_DATA` est la démonstration la plus robuste :

- glose FR : « information, donnée communiquée » ;
- domaine : `communication` ;
- formes : EN `information`, ES `información`, FR `information`, IT `informazione`, PT `informação` ;
- cinq formes à confiance 0,980 ;
- quatre `COGNATE_STRONG` depuis FR, scores 0,950 à 0,990, provenance `manual_seed` ;
- reconnaissance visible du mot `información` dans le texte Seven Sieves canonique.

`INTERNATIONAL` est visible dans le même texte, mais ses formes sont toutes typées `noun` alors que l'occurrence espagnole de la phrase est adjectivale, et une seule relation ES↔FR existe. `ORGANIZATION_ENTITY` porte encore explicitement une provenance de support au mock. Ces deux choix sont donc moins propres pour raconter une connaissance stabilisée.

### 4.11 Absence de `NUIT`

Aucune clé, glose ou forme correspondant à `NUIT`, `nuit`, `noche`, `noite`, `notte` ou `night` n'existe.

Dans le contrat actuel, un ajout propre via l'administration demanderait au minimum :

- `entry_key` : par exemple `NIGHT_TIME` ou `NUIT` selon la convention à arbitrer ;
- `gloss_fr` obligatoire ;
- `gloss_en` facultative mais recommandée ;
- `semantic_domain` recommandé, par exemple `time` ;
- une à vingt formes avec `language`, `lemma`, `part_of_speech` ;
- formes centrales proposées : FR `nuit`, ES `noche`, IT `notte`, PT `noite`, toutes `noun` ;
- EN `night` si l'on maintient la couverture à cinq langues ;
- relations explicites à créer séparément, probablement `COGNATE_WEAK` ou `RELATED_FORM` avec scores et justification/provenance à valider humainement.

L'API normaliserait les lemmes, fixerait leur confiance à 1 et inscrirait une note « Ajout manuel via Dico-IC Admin V0 ». Elle ne renseignerait pas `lexical_form.source_label` et ne pourrait pas attribuer de statut de validation à l'entrée ou aux relations. Une mission d'implémentation doit donc décider si l'on accepte cette limite ou si l'on ajoute d'abord une vraie gouvernance de provenance/statut. Aucune donnée `NUIT` n'a été créée pendant cet audit.

## 5. Données réellement consommées par Seven Sieves

Sur le texte canonique ES→FR avec IT/PT, l'appel réel retourne HTTP 200, contrat `0.1`, **103 tokens et 144 enrichissements** :

| Tamis | Résultats | Source dominante |
|---:|---:|---|
| 1 | 6 | `form_relation` |
| 2 | 82 | `lexical_form` |
| 3 | 10 | `pattern_rule` |
| 4 | 10 | heuristique |
| 5 | 13 | heuristique appuyée sur POS lexical |
| 6 | 13 | 7 `inflected_form` + heuristique d'infinitif |
| 7 | 10 | `pattern_rule` |

Répartition par provenance technique : 6 relations, 82 formes lexicales, 20 utilisations de règle, 7 formes fléchies et 29 heuristiques.

La page canonique montre notamment `organización → organisation`, `internacional → international`, `educación → éducation`, `universidades → université`, `lenguas → langues`, `información → information`.

Les aides discursives sont bien produites par l'API, mais la page canonique ne lit pas `pedagogical_enrichments`. La variante expérimentale avec aides, testée sur son texte par défaut, a rendu six tokens marqués correspondant à quatre expressions : `Sin embargo`, `Además`, `Por tanto`, `porque`. Son propre libellé avertit aussi qu'elle ajoute des indices locaux pour les tamis 4 et 6.

Le test automatisé « Seven Sieves consumes API connector help without a local catalogue » ne contrôle que le script de cette variante, pas le script de la page canonique. Il est donc vrai pour la variante et insuffisant pour établir que le parcours canonique expose cette capacité.

## 6. Audit des langues

### 6.1 Distinctions nécessaires

| Notion | État réel |
|---|---|
| Langues référencées par le modèle | EN, ES, FR, IT, PT ; toutes `is_active = 1` |
| Langues avec formes lexicales | les cinq |
| Formulaire manuel | toutes les langues actives sont disponibles, mais FR/ES/IT/PT sont précréées ; EN doit être ajoutée manuellement |
| Formes fléchies manuelles/assistant | code limité à FR/ES/IT/PT ; données réelles ES seulement |
| IA Domaine / IA Texte | toutes les langues actives sont présentées ; FR/ES/IT/PT cochées par défaut, EN non cochée |
| IA Relations | pivot limité à FR/ES/IT/PT/EN ou `all` |
| Aides discursives | ES/FR uniquement |
| Seven Sieves UI | source, médiation et comparaison limitées en dur à ES/FR/IT/PT |
| API `/analysis` | accepte toute langue active, même si le traitement spécifique est pauvre ou absent |

### 6.2 Faisabilité de CA, GL, OC, RO, CO, SC, RM

Codes ISO attendus et compatibles avec `VARCHAR(5)` : `ca`, `gl`, `oc`, `ro`, `co`, `sc`, `rm`. Leur insertion technique dans `language` est simple. Leur présentation honnête ne l'est pas.

Le modèle ne possède que `is_active`, booléen insuffisant pour distinguer :

- langue référencée ;
- langue documentée par des formes ;
- langue couverte par les assistants ;
- langue réellement exploitable par Seven Sieves ;
- langue expérimentale.

Les ajouter avec `is_active = 1` les ferait immédiatement apparaître dans `/languages`, les assistants Domaine/Texte et les sélecteurs dynamiques de l'admin, donnant une fausse impression de support. L'API accepterait aussi ces codes alors que les heuristiques, formes fléchies, aides discursives, pivots IA Relations et UI Seven Sieves resteraient limités.

Fichiers/couches à considérer dans une future mission : schéma et seed canonique à définir, `Node/src/analysis.js`, `Node/src/admin.js`, `Node/src/admin-ai-inflected-form.js`, `Node/src/admin-ai-relations.js`, `admin/js/admin-0.1.js`, les trois scripts IA, les deux pages/scripts Seven Sieves et les tests correspondants. La divergence des scripts SQL historiques doit être résolue avant toute migration.

### 6.3 Affichage honnête proposé

Ne pas ajouter ces langues avant de pouvoir afficher trois compteurs séparés :

1. **Langues référencées** : catalogue déclaratif, sans promesse de données ;
2. **Langues documentées** : au moins N entrées/formes avec mesure de couverture ;
3. **Langues couvertes par les assistants/Seven Sieves** : capacités explicites par fonction.

Un statut de couverture ou une table de capacités est préférable à la surcharge de `is_active`. À défaut de migration avant soutenance, conserver les cinq langues et expliquer que quatre sont au cœur du démonstrateur, l'anglais servant de comparaison lexicale.

## 7. Audit de compréhension de l'interface

### 7.1 Constat transversal

La mise en page est propre, cohérente et lisible à 1440 × 900. Les compteurs sont très efficaces. En revanche, l'interface est une console d'administration longue et dense, pas une porte d'entrée pédagogique. Elle mélange objets métier, noms de tables, codes API, provenance technique et actions d'écriture. L'utilisateur doit déjà connaître le modèle et les sept tamis.

### 7.2 Par bloc

| Bloc | Prérequis implicites / difficultés | Utilité soutenance |
|---|---|---|
| Modèle | Comprendre `lexical_entry`, `lexical_form`, `inflected_form`, `form_relation`, `pattern_rule`, `ic_feature` ; noms SQL affichés bruts | Compteurs excellents ; table technique à masquer ou reformuler |
| Langues | « Active » laisse penser à une couverture homogène ; EN est active mais absente de Seven Sieves | Montrer seulement avec couverture chiffrée |
| Lexique | Clés internes en capitales, POS en anglais, normalisation en infobulle ; les premières entrées visibles sont souvent vides | Utile si recherche directe d'une entrée préparée |
| Nouvelle entrée | Formulaire d'écriture, clé interne, lemmes et POS ; risque de fausse manipulation en direct | À ne pas ouvrir pendant la démo |
| Formes fléchies | Titre « validées », mais filtre propose quatre statuts ; concepts de surface, lemme, nombre et confiance non expliqués | Administration seulement, sauf exemple ciblé `organizaciones` |
| Aides discursives | Codes `OPPOSITION`, `VALIDATED`, provenance seed affichés tels quels ; création/archivage au même endroit | Bon corpus, mais vue trop administrative |
| Relations | Deux sélecteurs techniques très longs, enums bruts, score/provenance ; liste sans statut | Administration seulement ; la liste prouve la provenance mais est trop dense |
| IA Domaine | Workflow clair en étapes et avertissement humain, mais suppose domaine, niveau, POS, lemmes et langues cibles | Ne pas générer en soutenance ; dépend d'une configuration IA locale non vérifiée |
| IA Texte | Quatre étapes, nombreux états vides et séparation subtile lemme/formes fléchies/concepts absents | Trop long et expérimental pour 30–45 s |
| IA Relations | Navigation directe sans `entry_key` affiche « Entrée manquante » ; une entrée chargée montre les formes et seulement le nombre de relations existantes | Bon futur écran de détail, incomplet aujourd'hui |
| Seven Sieves canonique | Trois colonnes, texte long, avertissements techniques `SIEVE_EXPERIMENTAL`, états moteur `available`, nombreuses interactions | Preuve réelle de consommation API, mais nécessite préparation |
| Variante aides | Rend les aides Dico-IC visibles, mais annonce des indices locaux et un statut expérimental | Démonstration intéressante, à canonicaliser ou expliquer |

### 7.3 Aides contextuelles communes

Un composant commun très court est faisable sans refonte :

- **Ce que c'est** : définition en une phrase ;
- **Pourquoi Dico-IC le conserve** : responsabilité du socle ;
- **Qui produit/valide/utilise** : humain, seed, IA proposée, Seven Sieves ;
- **Exemple** : une donnée réelle ciblée.

La meilleure porte d'entrée serait une section ou page « Comprendre Dico-IC » en lecture seule, composée de quatre étapes : modèle → entrée → preuve de provenance → utilisation Seven Sieves. Elle doit réutiliser les endpoints GET existants et ne pas dupliquer les données.

## 8. Parcours de démonstration

### 8.1 Parcours actuel le plus sûr, préparé à l'avance

Préparer trois vues ou onglets avant de parler :

1. Admin au haut de `index-admin-0.1.html` : montrer les huit compteurs, 5 secondes ;
2. `index-admin-ai-relations-0.1.html?entry_key=INFORMATION_DATA` : montrer cinq langues et « 4 relations internes », 10 secondes ;
3. Seven Sieves canonique déjà analysé : montrer `información → information`, puis le badge « API Dico-IC connectée », 15 à 20 secondes.

Formulation orale fidèle : « Dico-IC conserve une entrée conceptuelle, ses formes multilingues et ses relations. Seven Sieves envoie le texte à l'API ; ici `información` est reconnu et rapproché de `information`. »

Limite à dire si l'on montre l'écran Relations IA : le détail des quatre relations et leur provenance ne sont pas visibles sur cette vue. Ne pas affirmer qu'un statut de validation relationnelle existe.

### 8.2 Parcours sans préparation

Depuis l'admin : cliquer/faire défiler jusqu'au Lexique, rechercher `INFORMATION_DATA`, cliquer « Relations IA », puis « Seven Sieves », puis « Analyser avec Dico-IC ». Ce parcours demande plusieurs déplacements et dépasse probablement 45 secondes. Il est fragile parce que le résultat clé est sous la ligne de flottaison et que les avertissements expérimentaux occupent de l'espace.

### 8.3 Écrans à éviter

- Nouvelle entrée et formulaires d'écriture ;
- IA Domaine et IA Texte en état vide ;
- IA Relations sans `entry_key` ;
- liste générale des relations et ses codes internes ;
- page historique `index-0.0.8.2.html` ;
- fallback mock, sauf pour expliquer explicitement une panne ;
- variante aides pédagogiques tant que son statut canonique et la part d'enrichissements locaux ne sont pas clarifiés.

### 8.4 Risques techniques

- le launcher Dico devrait échouer à cause du Compose invalide ;
- dépendance au conteneur MariaDB et au volume externe existant ;
- la base fraîche n'est pas reconstructible de manière canonique (`./db` n'est pas le dossier des scripts) ;
- l'URL API est codée en dur sur `http://localhost:3000` dans les scripts frontend ;
- fallback mock susceptible de masquer une panne si on le déclenche ;
- trois avertissements techniques visibles pour les tamis 4/5/6 ;
- la page canonique ne démontre pas les aides discursives.

## 9. Arbitrage P0 / P1 / P2

### P0 — Indispensable pour la soutenance

1. **Réparer et vérifier le lancement canonique** : corriger `phpmyadmin.depends_on`, exécuter une recette du launcher sur l'environnement réel, confirmer Node, MariaDB et les deux URL.
2. **Créer une vue de démonstration en lecture seule ou compléter la vue entrée** : afficher `INFORMATION_DATA`, ses cinq formes, les quatre relations, leurs scores, provenance et la formulation honnête « pas de statut relationnel dans la V0 ».
3. **Rendre explicite la part dynamique** : badges lisibles « donnée Dico-IC », « règle Dico-IC », « heuristique expérimentale » ; remplacer les codes `SIEVE_EXPERIMENTAL` visibles par un message jury compréhensible tout en conservant le détail technique accessible.
4. **Arbitrer la page Seven Sieves canonique** : soit intégrer les aides discursives API dans `index-api-live-0.1.html`, soit promouvoir la variante après retrait/explication des enrichissements locaux. Mettre les liens et la documentation en cohérence.
5. **Préparer le parcours `INFORMATION_DATA`** et tester chronomètre en main. Ne pas créer `NUIT` tant que la démonstration fonctionne avec une entrée réelle existante.

### P1 — Réalisable aujourd'hui si P0 est sécurisé

- composant commun d'aide contextuelle sur Modèle, Lexique, Formes fléchies, Aides et Relations ;
- petite porte d'entrée « Comprendre Dico-IC » réutilisant les GET existants ;
- libellés humains pour POS, types de relation, statuts et provenances ;
- compteur de couverture : langues référencées / entrées complètes / langues couvertes par Seven Sieves ;
- nettoyage préparatoire des 13 stubs seulement dans une mission de données séparée, sauvegardée et réversible ;
- ajout de `NUIT` seulement après validation humaine des formes, relations et de la politique de provenance.

L'ajout des sept nouvelles langues ne doit pas être un simple seed P1 : sans statut de couverture distinct, il serait trompeur.

### P2 — Après la soutenance

- canonicalisation SQL et reconstruction fiable d'une base fraîche ;
- modèle de gouvernance complet : statut, validateur, provenance, dates et révision ;
- couverture morphologique multilingue ;
- catalogue de règles et traits réellement consommé ;
- prise en charge de CA/GL/OC/RO/CO/SC/RM par capacités explicites ;
- second client réel hors Seven Sieves ;
- séparation éventuelle du déploiement Dico-IC/Seven Sieves ;
- refonte des assistants et gouvernance collaborative.

## 10. Tranche d'implémentation réaliste pour une journée

Objectif : sécuriser une démonstration honnête, sans migration de schéma et sans enrichissement massif.

### Matin

1. corriger `prototypes/08-dico-seven-sieves/docker-compose.yml` ;
2. vérifier `scripts/windows/start-dico-seven.bat` et les URL canoniques ;
3. enrichir la vue `admin/index-admin-ai-relations-0.1.html` et `admin/js/admin-ai-relations-0.1.js` pour rendre les relations existantes visibles, avec score et provenance déjà renvoyés par `GET /admin/lexical-entry/:entryKey` ;
4. ajouter les styles minimaux dans `admin/css/admin-ai-relations-0.1.css`.

### Après-midi

5. choisir la page Seven canonique et aligner les liens de l'admin et `PROJECTS_LAUNCH.md` ;
6. transformer les avertissements techniques en aide courte, sans cacher le statut expérimental ;
7. ajouter/adapter les tests statiques et de route concernés ;
8. recette HTTP, visuelle 1440 × 900 et chronométrée sur `INFORMATION_DATA`.

Cette tranche peut rester sans changement de contrat API, sans migration et sans donnée nouvelle. Toute création de `NUIT` ou ajout de langues doit rester une mission séparée.

## 11. Requêtes SQL de lecture utilisées

Les commandes de connexion et secrets ne sont pas reproduits. Toutes les requêtes ci-dessous sont des `SELECT`.

```sql
SELECT
  (SELECT COUNT(*) FROM language) AS languages,
  (SELECT COUNT(*) FROM lexical_entry) AS lexical_entries,
  (SELECT COUNT(*) FROM lexical_form) AS lexical_forms,
  (SELECT COUNT(*) FROM inflected_form) AS inflected_forms,
  (SELECT COUNT(*) FROM connector_help) AS connector_helps,
  (SELECT COUNT(*) FROM form_relation) AS form_relations,
  (SELECT COUNT(*) FROM pattern_rule) AS pattern_rules,
  (SELECT COUNT(*) FROM ic_feature) AS ic_features;

SELECT l.code, l.name, l.is_active,
       COUNT(DISTINCT lf.id) AS lexical_forms,
       COUNT(DISTINCT i.id) AS inflected_forms,
       COUNT(DISTINCT ch.id) AS connector_helps
FROM language l
LEFT JOIN lexical_form lf ON lf.language_id = l.id
LEFT JOIN inflected_form i ON i.lexical_form_id = lf.id
LEFT JOIN connector_help ch ON ch.language_id = l.id
GROUP BY l.id ORDER BY l.id;

SELECT SUM(has_fr AND has_es AND has_it AND has_pt) AS complete_central_4,
       SUM(has_fr AND has_es AND has_it AND has_pt AND has_en) AS complete_all_5
FROM (
  SELECT le.id,
         MAX(l.code='fr') has_fr, MAX(l.code='es') has_es,
         MAX(l.code='it') has_it, MAX(l.code='pt') has_pt,
         MAX(l.code='en') has_en
  FROM lexical_entry le
  LEFT JOIN lexical_form lf ON lf.entry_id=le.id
  LEFT JOIN language l ON l.id=lf.language_id
  GROUP BY le.id
) coverage;

SELECT le.entry_key, le.gloss_fr, le.semantic_domain
FROM lexical_entry le
WHERE NOT EXISTS (SELECT 1 FROM lexical_form lf WHERE lf.entry_id=le.id)
ORDER BY le.entry_key;

SELECT l.code, i.status, COUNT(*) AS total
FROM inflected_form i
JOIN lexical_form lf ON lf.id=i.lexical_form_id
JOIN language l ON l.id=lf.language_id
GROUP BY l.code, i.status;

SELECT l.code, ch.discourse_function, ch.status, COUNT(*) AS total
FROM connector_help ch
JOIN language l ON l.id=ch.language_id
GROUP BY l.code, ch.discourse_function, ch.status;

SELECT r.relation_type, sl.code AS source_language,
       tl.code AS target_language, r.source_label, COUNT(*) AS total
FROM form_relation r
JOIN lexical_form sf ON sf.id=r.source_form_id
JOIN language sl ON sl.id=sf.language_id
JOIN lexical_form tf ON tf.id=r.target_form_id
JOIN language tl ON tl.id=tf.language_id
GROUP BY r.relation_type, sl.code, tl.code, r.source_label;

SELECT l.code, f.feature_type, f.source_label, COUNT(*) AS total,
       MIN(f.confidence_score), MAX(f.confidence_score)
FROM ic_feature f
JOIN lexical_form lf ON lf.id=f.form_id
JOIN language l ON l.id=lf.language_id
GROUP BY l.code, f.feature_type, f.source_label;

SELECT p.id, sl.code AS source_language, tl.code AS target_language,
       p.pattern_type, p.source_pattern, p.target_pattern, p.reliability_score
FROM pattern_rule p
JOIN language sl ON sl.id=p.source_language_id
JOIN language tl ON tl.id=p.target_language_id;

SELECT l.code, lf.normalized_lemma, lf.part_of_speech, COUNT(*) AS total
FROM lexical_form lf
JOIN language l ON l.id=lf.language_id
GROUP BY l.code, lf.normalized_lemma, lf.part_of_speech
HAVING COUNT(*) > 1;

SELECT
  (SELECT COUNT(*) FROM lexical_form lf
   LEFT JOIN lexical_entry le ON le.id=lf.entry_id
   LEFT JOIN language l ON l.id=lf.language_id
   WHERE le.id IS NULL OR l.id IS NULL) AS lexical_form_orphans,
  (SELECT COUNT(*) FROM inflected_form i
   LEFT JOIN lexical_form lf ON lf.id=i.lexical_form_id
   WHERE lf.id IS NULL) AS inflected_orphans,
  (SELECT COUNT(*) FROM form_relation r
   LEFT JOIN lexical_form sf ON sf.id=r.source_form_id
   LEFT JOIN lexical_form tf ON tf.id=r.target_form_id
   WHERE sf.id IS NULL OR tf.id IS NULL) AS relation_orphans;

SELECT le.entry_key, le.gloss_fr, le.gloss_en, l.code, lf.lemma
FROM lexical_entry le
LEFT JOIN lexical_form lf ON lf.entry_id=le.id
LEFT JOIN language l ON l.id=lf.language_id
WHERE UPPER(le.entry_key) LIKE '%NUIT%'
   OR LOWER(COALESCE(le.gloss_fr,'')) LIKE '%nuit%'
   OR LOWER(COALESCE(le.gloss_en,'')) LIKE '%night%'
   OR LOWER(COALESCE(lf.lemma,'')) IN ('nuit','noche','noite','notte','night');
```

## 12. Contrôles réalisés

### Analyse statique

- routes Express, repository et moteur d'analyse lus ;
- scripts des quatre surfaces admin et des pages Seven Sieves lus ;
- configuration Compose et launcher Windows confrontés ;
- contraintes et colonnes réelles interrogées dans `information_schema` ;
- tests existants inventoriés avant exécution.

### Base réelle, lecture seule

- compteurs, langues, couverture, statuts, provenance, confiance, relations, règles, traits ;
- doublons structuraux, stubs conceptuels et références orphelines ;
- absence de `NUIT` et équivalents demandés ;
- détail des entrées candidates de démonstration.

### Tests automatisés

`node --test` : **101 tests réussis, 0 échec**, durée rapportée 288,8 ms. Les tests utilisent des repositories/doubles contrôlés et des lectures de fichiers ; aucune base réelle n'a été écrite.

### Validation HTTP et visuelle

- Admin : compteurs et listes chargés depuis l'API réelle ;
- Seven Sieves canonique : analyse HTTP 200, contrat `0.1`, 103 tokens, 144 enrichissements ;
- variante aides : API connectée, quatre expressions discursives réellement signalées ;
- vérification visuelle à 1440 × 900 : aucune erreur de rendu bloquante observée ; densité, jargon et ligne de flottaison documentés.

### Lancement

- les conteneurs MariaDB et phpMyAdmin étaient déjà actifs avant le démarrage du serveur d'observation ;
- `docker compose ps` a refusé le projet à cause de la dépendance inexistante `docker ps` ;
- le serveur Node temporaire lancé pour l'observation (PID initial 66972, sans argument de launcher) s'est terminé avant le contrôle final ;
- au contrôle final, le port 3000 était occupé par un autre processus Node, PID 68800, portant les arguments d'authentification du launcher global `--ic-lab-next-service=dico` et `--ic-lab-next-token=...` ; ce processus distinct n'a pas été arrêté afin de préserver l'état de l'utilisateur. La valeur du jeton n'est pas reproduite dans ce rapport.

## 13. Éléments non vérifiés et limites

- aucune génération OpenAI n'a été déclenchée ; la configuration IA et sa disponibilité ne sont pas validées ;
- aucun launcher global ou `start-dico-seven.bat` n'a été exécuté, car le Compose était déjà prouvé invalide et son exécution aurait tenté de modifier l'état des services ;
- aucune reconstruction de base fraîche, migration, seed ou procédure d'écriture ;
- aucun test humain par David ; les observations navigateur de Codex ne valent pas validation humaine ;
- aucun chronométrage humain réel du discours de soutenance ;
- aucune conclusion linguistique savante sur la relation exacte entre `nuit`, `noche`, `notte`, `noite` : le type et le score doivent être validés par une personne compétente.

Processus en fin de mission : aucun processus lancé par l'audit ne subsiste. Les conteneurs MariaDB/phpMyAdmin préexistants et le serveur Dico-IC authentifié du launcher global n'ont pas été arrêtés.

## 14. Version, fichiers et suite

- version applicative : **inchangée** ; contrat API `0.1`, pages `0.1`, package Node générique `1.0.0` ;
- fichier créé : `reports/188_dico_ic_pre_stabilization_deep_audit.md` ;
- aucun fichier applicatif, configuration, test, schéma ou donnée modifié ;
- aucune branche, commit, migration, seed, push ou déploiement ;
- prochaine suite recommandée : mission d'implémentation P0 d'une journée, sans migration et sans création de données.

Message de commit proposé pour ce seul rapport :

```text
docs: audit Dico-IC avant stabilisation
```
