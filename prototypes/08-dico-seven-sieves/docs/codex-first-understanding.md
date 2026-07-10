# Première compréhension Codex du projet IC-Dico

> Document produit après lecture initiale de `docs/vision.md`, `docs/ic_dico_model_notes_md_v_1.md`, `docs/research/*`, `database/*` et `docker-compose.yml`.
>
> Le projet est considéré ici comme exploratoire. Les points ci-dessous ne proposent pas de décision de refonte : ils formulent une compréhension provisoire, des éléments expérimentaux et des questions à clarifier.

---

## 1. Compréhension générale du projet

IC-Dico est pensé comme un moteur lexical d'aide à l'intercompréhension entre langues, principalement romanes. Le projet ne cherche pas à produire une traduction automatique ni à reproduire un dictionnaire bilingue classique.

L'objectif central semble être :

- identifier des formes lexicales utiles pour comprendre une langue inconnue ou partiellement connue ;
- représenter des relations entre formes : cognats forts, cognats faibles, faux amis, équivalences partielles ;
- expliciter les indices qui peuvent aider un apprenant ;
- garder une trace de scores, de degrés de confiance et d'annotations humaines ;
- préparer un futur moteur réutilisable par plusieurs applications pédagogiques.

Les documents de vision et de recherche insistent sur trois principes structurants :

- le projet doit rester simple et réversible ;
- les données et les scores sont expérimentaux ;
- l'explicabilité pédagogique prime sur l'automatisation opaque.

IC-Dico apparaît donc davantage comme un noyau lexical interprétatif que comme une application pédagogique complète. Les applications futures possibles peuvent inclure des outils autour des tamis de l'intercompréhension, des textes plurilingues, des vidéos annotées, des activités d'exploration ou des tâches de compréhension guidée.

---

## 2. Architecture actuelle

L'architecture visible dans les fichiers lus est principalement composée de trois couches.

### 2.1 Documentation conceptuelle

Les fichiers `docs/vision.md` et `docs/ic_dico_model_notes_md_v_1.md` décrivent l'intention du projet, les hypothèses de modélisation et les limites à respecter.

Le dossier `docs/research/` conserve une mémoire des entretiens terrain. Il fait émerger des besoins qui dépassent le simple dictionnaire :

- transformations interlangues ;
- connecteurs et marqueurs discursifs ;
- reformulation ;
- langues relais ;
- mutualisation des enrichissements ;
- usage de l'IA comme assistance, avec validation humaine.

### 2.2 Base de données MariaDB

Le projet utilise MariaDB, exposé par `docker-compose.yml`.

Le service principal est :

- `mariadb`, image `mariadb:11`, base `ic_dico`, utilisateur `ic_user`.

Un service d'administration est prévu :

- `phpmyadmin`, exposé sur le port `8080`.

Le stockage persistant passe par le volume Docker `mariadb_data`.

Point important : `docker-compose.yml` monte `./db` vers `/docker-entrypoint-initdb.d`, alors que les scripts SQL analysés sont dans `database/`. Le dossier `db` existe mais semble vide lors de cette lecture. Cela suggère que les scripts de `database/` ne sont peut-être pas exécutés automatiquement au démarrage du conteneur, sauf copie ou usage manuel non visible ici.

### 2.3 Scripts SQL

Le dossier `database/` contient plusieurs types de fichiers :

- scripts de schéma : `sql.sql`, `init_schema.sql`, `schema.sql` ;
- scripts de procédures : `procedures.sql`, `ps.sql`, `sp_insert.sql` ;
- jeux de données : `seed_data.sql`, `seed_data_v2.sql`, `data_test.sql`.

Ces fichiers ne semblent pas tous avoir le même statut :

- `schema.sql` ressemble à un dump phpMyAdmin complet avec structure et données ;
- `sql.sql` ressemble à un schéma propre et relativement canonique ;
- `init_schema.sql` contient un avertissement initial indiquant qu'il faut vérifier et comparer à l'existant ;
- `ps.sql` contient des procédures sans préfixe `sp_`, probablement antérieures ou exploratoires ;
- `procedures.sql` contient des procédures avec préfixe `sp_` ;
- `seed_data.sql` et `seed_data_v2.sql` représentent deux vagues d'enrichissement manuel ;
- `data_test.sql` semble être un jeu de test ou de prototypage direct avec insertions par IDs.

---

## 3. Modèle de données actuel

Le modèle central repose sur une distinction importante :

```text
lexical_entry
    -> lexical_form
        -> form_relation
```

### 3.1 `language`

Table de référence des langues.

Rôle :

- stocker le code de langue ;
- nommer la langue ;
- indiquer la famille linguistique ;
- distinguer les langues romanes ;
- activer ou désactiver une langue.

Langues actuellement présentes ou prévues dans les données :

- `fr`
- `es`
- `it`
- `pt`
- `en`

L'anglais est explicitement traité comme cas comparatif non roman.

### 3.2 `lexical_entry`

Table des entrées lexicales abstraites ou pivots sémantiques.

Une entrée ne correspond pas nécessairement à un mot dans une langue donnée. Elle sert à regrouper des formes qui partagent un sens général.

Champs structurants :

- `entry_key`
- `gloss_fr`
- `gloss_en`
- `semantic_domain`
- `notes`

Exemples d'entrées observées :

- `PHENOMENON_OBSERVABLE`
- `INFORMATION_DATA`
- `UNIVERSITY_INSTITUTION`
- `BOOKSHOP_STORE`
- `LIBRARY_PUBLIC`
- `CURRENTLY_NOW`

### 3.3 `lexical_form`

Table des formes lexicales concrètes.

Une forme appartient à :

- une entrée lexicale ;
- une langue ;
- éventuellement une catégorie grammaticale.

Champs structurants :

- `entry_id`
- `language_id`
- `lemma`
- `normalized_lemma`
- `part_of_speech`
- `confidence_score`
- `notes`

Dans certains scripts, la table contient aussi :

- `gender`
- `number_behavior`
- `register_label`
- `source_label`

La forme normalisée est utilisée par les procédures pour rechercher et relier les formes.

### 3.4 `form_relation`

Table centrale pour l'intercompréhension.

Elle relie deux formes lexicales et qualifie leur relation.

Champs structurants :

- `source_form_id`
- `target_form_id`
- `relation_type`
- `score`
- `is_symmetric`
- `source_label`
- `confidence_score`
- `notes`

Types de relations documentés ou observés :

- `COGNATE_STRONG`
- `COGNATE_WEAK`
- `FALSE_FRIEND`
- `PARTIAL_EQUIVALENCE`
- `ORTHOGRAPHIC_VARIANT`
- `MORPHOLOGICAL_PATTERN`
- `NO_RELATION`

Dans les données actuelles, les types les plus réellement présents semblent être `COGNATE_STRONG`, `COGNATE_WEAK`, `FALSE_FRIEND` et `PARTIAL_EQUIVALENCE`.

### 3.5 `ic_feature`

Table de traits d'intercompréhension associés à une forme.

Elle sert à stocker des indices ou mesures comme :

- `GRAPHIC_SIMILARITY`
- `TRANSPARENCY_SCORE`
- `FALSE_FRIEND_RISK`

Le modèle permet soit une valeur numérique (`value_num`), soit une valeur textuelle (`value_text`).

### 3.6 `pattern_rule`

Table prévue pour représenter des régularités entre langues.

Exemples documentés :

- `ph -> f`
- `-tion -> -ción`
- `-tion -> -zione`
- `-tion -> -ção`

Champs structurants :

- `source_language_id`
- `target_language_id`
- `pattern_type`
- `source_pattern`
- `target_pattern`
- `description`
- `reliability_score`
- `examples`
- `notes`

Cette table est encore secondaire dans les données, mais les documents terrain suggèrent qu'elle pourrait devenir très importante.

---

## 4. Procédures stockées et logique d'accès

Les documents indiquent que les procédures doivent être préfixées par `sp_`.

Les procédures observées avec ce préfixe incluent :

- `sp_upsert_language`
- `sp_upsert_lexical_entry`
- `sp_upsert_lexical_form`
- `sp_insert_form_relation`
- `sp_insert_ic_feature`
- `sp_get_all_relations`
- `sp_get_cognates`
- `sp_get_false_friends`
- `sp_get_similarity`

Les procédures servent principalement à :

- éviter les IDs en dur ;
- faire des insertions par clés métier comme `entry_key`, code langue et lemme normalisé ;
- récupérer des relations lexicales ;
- interroger des cognats ou faux amis ;
- amorcer un futur usage par API.

`sp_get_similarity` est explicitement très simple : elle compare des formes normalisées par égalité ou inclusion de chaîne. Elle ressemble davantage à un prototype de scoring qu'à un calcul linguistique stabilisé.

---

## 5. Éléments encore expérimentaux

Les éléments suivants doivent être considérés comme expérimentaux.

### 5.1 Scores

Les champs `score`, `confidence_score`, `TRANSPARENCY_SCORE`, `GRAPHIC_SIMILARITY` et `FALSE_FRIEND_RISK` sont présents, mais leur méthode de calcul n'est pas stabilisée.

Les documents précisent que les scores actuels sont surtout manuels et pédagogiques. Ils ne doivent pas être interprétés comme des vérités linguistiques absolues.

### 5.2 `pattern_rule`

Les règles de transformation semblent conceptuellement importantes, mais leur usage réel reste limité.

Questions ouvertes :

- les règles servent-elles à expliquer une relation déjà validée ?
- servent-elles à suggérer automatiquement de nouvelles relations ?
- doivent-elles être appliquées à des mots isolés, à des familles morphologiques ou à des phénomènes plus larges ?

### 5.3 Faux amis et équivalences partielles

Les faux amis sont présents dans les données, mais les documents signalent que la distinction entre faux ami complet, faux ami partiel et équivalence contextuelle reste ouverte.

Cette zone semble particulièrement sensible, car elle touche directement à l'utilité pédagogique.

### 5.4 Connecteurs et marqueurs discursifs

Les entretiens font émerger le rôle des connecteurs (`mais`, `ensuite`, `donc`, `cependant`) et des marqueurs discursifs.

Aucune structure dédiée ne semble encore exister dans le modèle actuel.

### 5.5 Reformulation

Les entretiens mentionnent le besoin de remplacer un mot opaque par un mot plus transparent, par exemple dans une logique de reformulation.

Le modèle actuel peut représenter des relations lexicales, mais ne semble pas encore représenter explicitement :

- synonymes pédagogiquement plus transparents ;
- antonymes utiles ;
- reformulations contextualisées ;
- stratégie de remplacement dans une phrase.

### 5.6 Mutualisation

La mutualisation des enrichissements enseignants est une piste importante, mais non modélisée à ce stade.

Il n'y a pas encore, dans les scripts lus, de tables pour :

- contributeurs ;
- validation ;
- versions d'annotation ;
- statut éditorial ;
- discussion ou provenance détaillée.

### 5.7 Analyse de phrase ou de texte

Les documents évoquent une future entrée de type phrase courte avec sortie en mots reconnus, cognats, faux amis et indices.

Le modèle actuel est lexical. Il ne semble pas encore inclure :

- tokenisation ;
- textes sources ;
- occurrences en contexte ;
- annotations de segments ;
- liens entre indice et activité pédagogique.

---

## 6. Incohérences ou tensions repérées

Ces points sont formulés comme observations à vérifier, pas comme décisions à corriger immédiatement.

### 6.1 Dossier Docker `db` vs dossier SQL `database`

`docker-compose.yml` monte `./db` dans `/docker-entrypoint-initdb.d`, mais les scripts analysés sont dans `database/`.

Question :

- le dossier `db` est-il censé recevoir une copie du schéma final, ou le montage Docker devrait-il viser `database/` plus tard ?

### 6.2 Plusieurs sources de vérité SQL possibles

Il existe plusieurs fichiers susceptibles de définir ou représenter la base :

- `database/sql.sql`
- `database/init_schema.sql`
- `database/schema.sql`

Ils ne sont pas équivalents :

- `schema.sql` est un dump avec données ;
- `sql.sql` contient `pattern_rule` ;
- `init_schema.sql` ne crée pas `pattern_rule` dans sa partie table, malgré l'importance de cette table dans la documentation ;
- `init_schema.sql` porte un commentaire indiquant qu'il reste à vérifier.

Question :

- quel fichier doit être considéré comme référence temporaire pour initialiser une base neuve ?

### 6.3 `pattern_rule` documenté mais absent de `init_schema.sql`

La table `pattern_rule` est présente dans `sql.sql` et `schema.sql`, et fortement discutée dans la documentation.

Elle ne semble pas créée dans `init_schema.sql`.

Question :

- `init_schema.sql` est-il incomplet, obsolète, ou volontairement réduit ?

### 6.4 Procédures avec et sans préfixe `sp_`

La documentation dit que le préfixe `sp_` est obligatoire.

Or `ps.sql` définit :

- `get_cognates`
- `get_all_relations`
- `get_similarity`
- `get_false_friends`

Tandis que `procedures.sql` et `init_schema.sql` utilisent des noms préfixés.

Question :

- `ps.sql` doit-il être considéré comme archive exploratoire, brouillon ou script encore utilisé ?

### 6.5 Signatures différentes de `sp_upsert_lexical_form`

Dans certains scripts, `sp_upsert_lexical_form` accepte un paramètre `p_notes`.

Dans `procedures.sql`, la procédure exportée semble avoir une signature plus courte sans `p_notes`.

Question :

- quelle version correspond à l'état attendu de la base en cours d'utilisation ?

### 6.6 Schéma enrichi vs schéma réduit pour `lexical_form`

`sql.sql` et `schema.sql` incluent des champs supplémentaires dans `lexical_form` :

- `gender`
- `number_behavior`
- `register_label`
- `source_label`

`init_schema.sql` contient une version plus réduite.

Question :

- ces champs sont-ils déjà considérés utiles, ou sont-ils des ajouts issus d'un dump/prototype ?

### 6.7 Données par IDs directs vs procédures

`data_test.sql` insère directement des IDs pour les formes et relations.

Les autres scripts récents privilégient les procédures pour éviter les IDs en dur.

Question :

- `data_test.sql` est-il uniquement un ancien jeu de test, ou doit-il encore être rejouable ?

### 6.8 Relations symétriques et procédures de lecture

La table `form_relation` contient `is_symmetric`, mais certaines procédures lisent surtout depuis la source vers la cible.

`sp_get_all_relations` compense par une requête bidirectionnelle, mais `sp_get_cognates` et `sp_get_false_friends` semblent plus orientées source.

Question :

- faut-il considérer toutes les relations symétriques comme interrogeables dans les deux sens, ou certaines relations futures devront-elles vraiment rester directionnelles ?

### 6.9 Types de relation non contraints

Les types de relation sont documentés, mais la base utilise un `VARCHAR(30)` sans table de référence ni contrainte visible.

Ce choix est cohérent avec un prototype souple, mais il laisse possibles des variantes typographiques.

Question :

- faut-il garder cette souplesse pendant l'exploration, ou documenter une liste fermée provisoire ?

### 6.10 Commentaires signalant des données discutables

Dans `data_test.sql`, certains commentaires indiquent déjà des hésitations sur des faux amis ou relations à retirer.

Exemples observés :

- une relation notée comme faux ami avec commentaire indiquant qu'elle ne l'est peut-être pas ;
- une relation autour de `long` / `largo` signalée comme à revoir.

Question :

- ces cas doivent-ils devenir une liste de validation linguistique à traiter séparément ?

---

## 7. Lecture provisoire de l'état du projet

IC-Dico semble être dans une phase saine d'exploration : le noyau conceptuel est clair, mais plusieurs couches SQL coexistent encore.

Le modèle actuel est suffisant pour tester :

- des entrées pivots ;
- des formes par langue ;
- des relations entre formes ;
- quelques scores ;
- quelques règles orthographiques ;
- quelques requêtes simples.

Il n'est pas encore stabilisé pour :

- l'analyse de phrases ;
- la collaboration entre enseignants ;
- la validation éditoriale des données ;
- les phénomènes discursifs ;
- les reformulations contextualisées ;
- le calcul automatique robuste de transparence.

La priorité implicite qui ressort des documents est de préserver la traçabilité des hypothèses plutôt que de figer trop tôt le modèle.

---

## 8. Questions à garder ouvertes

- Quelle est la source SQL de référence à court terme : `sql.sql`, `init_schema.sql`, `schema.sql`, ou une combinaison ?
- Le dossier Docker `db` doit-il rester séparé de `database/` ?
- `pattern_rule` doit-il rester secondaire ou devenir un élément central du prototype ?
- Les scores doivent-ils être purement manuels, semi-automatiques ou calculés puis validés ?
- Comment distinguer proprement faux ami, faux ami partiel et équivalence partielle ?
- Les connecteurs doivent-ils être de simples `lexical_form` ou une catégorie dédiée ?
- Faut-il introduire plus tard une table de sens (`sense`) pour gérer la polysémie ?
- Comment représenter une reformulation plus transparente sans transformer IC-Dico en dictionnaire de synonymes ?
- Quel niveau de provenance faut-il garder pour les annotations humaines ?
- Quand faudra-t-il modéliser la mutualisation : maintenant, plus tard, ou seulement après premiers usages terrain ?

---

## 9. Synthèse courte

IC-Dico est actuellement un prototype de moteur lexical explicable pour l'intercompréhension.

Son coeur relationnel est cohérent :

```text
language
lexical_entry
lexical_form
form_relation
ic_feature
pattern_rule
```

La tension principale n'est pas conceptuelle, mais documentaire et opérationnelle : plusieurs scripts SQL coexistent, avec des statuts différents, et certaines pistes terrain importantes ne sont pas encore modélisées.

À ce stade, il semble préférable de considérer ces divergences comme des traces d'exploration plutôt que comme des erreurs à corriger immédiatement.
