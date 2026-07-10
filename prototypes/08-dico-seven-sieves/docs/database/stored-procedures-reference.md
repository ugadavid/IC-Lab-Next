# Référence des procédures stockées `sp_`

> Document d'observation de l'état actuel.
>
> Le projet est exploratoire. Les divergences ci-dessous sont signalées sans décision de refactorisation, sans renommage et sans modification des scripts SQL existants.

---

## 1. Sources consultées

Les procédures `sp_` apparaissent principalement dans trois fichiers :

- `database/procedures.sql`
- `database/init_schema.sql`
- `database/sp_insert.sql`

Les appels aux procédures apparaissent aussi dans :

- `database/seed_data.sql`
- `database/seed_data_v2.sql`
- `database/sp_insert.sql`

Un fichier séparé, `database/ps.sql`, contient des procédures sans préfixe `sp_` (`get_cognates`, `get_all_relations`, `get_similarity`, `get_false_friends`). Elles sont liées fonctionnellement aux procédures `sp_get_*`, mais elles ne sont pas documentées comme procédures `sp_` dans ce fichier.

---

## 2. Inventaire rapide

Procédures `sp_` observées :

| Procédure | Présente dans | Type |
|---|---|---|
| `sp_upsert_language` | `procedures.sql`, `init_schema.sql`, `sp_insert.sql` | insertion / mise à jour |
| `sp_upsert_lexical_entry` | `procedures.sql`, `init_schema.sql`, `sp_insert.sql` | insertion / mise à jour |
| `sp_upsert_lexical_form` | `procedures.sql`, `init_schema.sql`, `sp_insert.sql` | insertion / mise à jour |
| `sp_insert_form_relation` | `procedures.sql`, `init_schema.sql`, `sp_insert.sql` | insertion |
| `sp_insert_ic_feature` | `procedures.sql`, `init_schema.sql`, `sp_insert.sql` | insertion |
| `sp_get_all_relations` | `procedures.sql`, `init_schema.sql` | lecture |
| `sp_get_cognates` | `procedures.sql` | lecture |
| `sp_get_false_friends` | `procedures.sql` | lecture |
| `sp_get_similarity` | `procedures.sql` | lecture / scoring expérimental |

---

## 3. Variantes de signatures observées

### 3.1 Variantes principales

La divergence la plus importante concerne `sp_upsert_lexical_form`.

Version à 6 paramètres :

```sql
CALL sp_upsert_lexical_form(
    p_entry_key,
    p_language_code,
    p_lemma,
    p_normalized_lemma,
    p_part_of_speech,
    p_confidence_score
);
```

Observée dans :

- `database/procedures.sql`
- `database/sp_insert.sql`

Version à 7 paramètres :

```sql
CALL sp_upsert_lexical_form(
    p_entry_key,
    p_language_code,
    p_lemma,
    p_normalized_lemma,
    p_part_of_speech,
    p_confidence_score,
    p_notes
);
```

Observée dans :

- `database/init_schema.sql`
- `database/seed_data.sql` par ses appels ;
- `database/seed_data_v2.sql` par ses appels.

Remarque : les seeds récents utilisent la version à 7 paramètres avec `NULL` en dernier argument. Si la base chargée ne contient que la version à 6 paramètres, ces appels risquent d'échouer.

### 3.2 Différence de définition

`database/procedures.sql` exporte les procédures avec :

```sql
CREATE DEFINER=`ic_user`@`%` PROCEDURE ...
```

`database/init_schema.sql` et `database/sp_insert.sql` utilisent plutôt :

```sql
CREATE PROCEDURE ...
```

Cette différence peut avoir un impact de portabilité selon l'utilisateur MariaDB disponible au moment de l'import.

### 3.3 Couverture différente selon les fichiers

`database/procedures.sql` est le fichier le plus complet pour les procédures de lecture, car il contient :

- `sp_get_all_relations`
- `sp_get_cognates`
- `sp_get_false_friends`
- `sp_get_similarity`

`database/init_schema.sql` ne contient que `sp_get_all_relations` parmi les procédures de lecture.

`database/sp_insert.sql` contient surtout des procédures d'insertion et des exemples d'utilisation.

---

## 4. Procédures d'insertion et de mise à jour

## `sp_upsert_language`

### Rôle

Insérer ou mettre à jour une langue dans la table `language`, à partir de son code.

La procédure utilise `ON DUPLICATE KEY UPDATE`, ce qui suppose que `language.code` est unique.

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_code` | `VARCHAR(5)` | Code court de langue, par exemple `fr`, `es`, `en` |
| `p_name` | `VARCHAR(50)` | Nom affiché de la langue |
| `p_family` | `VARCHAR(50)` | Famille linguistique |
| `p_is_romance` | `BOOLEAN` | Indique si la langue est romane |
| `p_is_active` | `BOOLEAN` | Indique si la langue est active dans le projet |

### Exemple d'usage

```sql
CALL sp_upsert_language('fr', 'Français', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('en', 'English', 'Germanic', FALSE, TRUE);
```

### Dépendances

- Table `language`
- Contrainte unique sur `language.code`

### Remarques

Cette procédure est utilisée dans `seed_data.sql` et `sp_insert.sql`.

### Incohérences observées

Aucune variante de signature observée.

---

## `sp_upsert_lexical_entry`

### Rôle

Insérer ou mettre à jour une entrée lexicale abstraite dans `lexical_entry`.

L'entrée lexicale sert de pivot sémantique pour regrouper plusieurs formes lexicales.

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_entry_key` | `VARCHAR(100)` | Clé métier de l'entrée, par exemple `INFORMATION_DATA` |
| `p_gloss_fr` | `TEXT` | Glose en français |
| `p_gloss_en` | `TEXT` | Glose en anglais |
| `p_semantic_domain` | `VARCHAR(100)` | Domaine sémantique |
| `p_notes` | `TEXT` | Notes libres |

### Exemple d'usage

```sql
CALL sp_upsert_lexical_entry(
    'INFORMATION_DATA',
    'information, donnée communiquée',
    'information, communicated data',
    'communication',
    NULL
);
```

### Dépendances

- Table `lexical_entry`
- Contrainte unique sur `lexical_entry.entry_key`

### Remarques

Cette procédure est fortement utilisée dans les fichiers de seed.

### Incohérences observées

Aucune variante de signature observée.

---

## `sp_upsert_lexical_form`

### Rôle

Insérer ou mettre à jour une forme lexicale concrète dans `lexical_form`, en retrouvant l'entrée lexicale par `entry_key` et la langue par son code.

La procédure évite d'insérer directement les IDs de `lexical_entry` et `language`.

### Paramètres

Version à 6 paramètres :

| Paramètre | Type | Rôle |
|---|---|---|
| `p_entry_key` | `VARCHAR(100)` | Clé de l'entrée lexicale |
| `p_language_code` | `VARCHAR(5)` | Code de langue |
| `p_lemma` | `VARCHAR(255)` | Forme affichée |
| `p_normalized_lemma` | `VARCHAR(255)` | Forme normalisée utilisée pour la recherche |
| `p_part_of_speech` | `VARCHAR(20)` | Catégorie grammaticale |
| `p_confidence_score` | `DECIMAL(4,3)` | Score de confiance de l'annotation |

Version à 7 paramètres :

| Paramètre | Type | Rôle |
|---|---|---|
| `p_notes` | `TEXT` | Notes libres associées à la forme |

Le reste des paramètres est identique à la version à 6 paramètres.

### Exemple d'usage

Version utilisée dans `sp_insert.sql` :

```sql
CALL sp_upsert_lexical_form(
    'INFORMATION_DATA',
    'fr',
    'information',
    'information',
    'noun',
    0.98
);
```

Version utilisée dans les seeds récents :

```sql
CALL sp_upsert_lexical_form(
    'PHENOMENON_OBSERVABLE',
    'fr',
    'phénomène',
    'phenomene',
    'noun',
    0.95,
    NULL
);
```

### Dépendances

- Table `lexical_form`
- Table `lexical_entry`
- Table `language`
- Contrainte unique sur `(language_id, lemma, part_of_speech)`

La procédure signale une erreur si :

- l'entrée lexicale n'existe pas ;
- la langue n'existe pas.

### Remarques

La procédure met à jour au minimum :

- `normalized_lemma`
- `confidence_score`

Dans la version à 7 paramètres, elle met aussi à jour `notes`.

### Incohérences observées

La signature diverge selon les fichiers :

- `procedures.sql` : 6 paramètres, sans `p_notes` ;
- `sp_insert.sql` : 6 paramètres, sans `p_notes` ;
- `init_schema.sql` : 7 paramètres, avec `p_notes` ;
- `seed_data.sql` et `seed_data_v2.sql` appellent la version à 7 paramètres.

Cette divergence rend l'ordre d'import important. Elle ne permet pas, à ce stade, de savoir quelle version est la référence sans vérifier la base réellement chargée.

---

## `sp_insert_form_relation`

### Rôle

Insérer une relation entre deux formes lexicales dans `form_relation`.

La procédure retrouve les formes source et cible à partir de :

- leur code langue ;
- leur lemme normalisé.

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_source_lang_code` | `VARCHAR(5)` | Code langue de la forme source |
| `p_source_norm_lemma` | `VARCHAR(255)` | Lemme normalisé source |
| `p_target_lang_code` | `VARCHAR(5)` | Code langue de la forme cible |
| `p_target_norm_lemma` | `VARCHAR(255)` | Lemme normalisé cible |
| `p_relation_type` | `VARCHAR(30)` | Type de relation |
| `p_score` | `DECIMAL(4,3)` | Score de la relation |
| `p_is_symmetric` | `BOOLEAN` | Indique si la relation est symétrique |
| `p_source_label` | `VARCHAR(100)` | Provenance ou étiquette de source |
| `p_confidence_score` | `DECIMAL(4,3)` | Confiance dans l'annotation |
| `p_notes` | `TEXT` | Notes libres |

### Exemple d'usage

```sql
CALL sp_insert_form_relation(
    'fr', 'information',
    'es', 'informacion',
    'COGNATE_STRONG',
    0.98,
    TRUE,
    'manual_seed',
    0.98,
    NULL
);
```

### Dépendances

- Table `form_relation`
- Table `lexical_form`
- Table `language`
- Formes lexicales déjà présentes

La procédure signale une erreur si :

- la forme source n'existe pas ;
- la forme cible n'existe pas.

### Remarques

Les types de relation observés dans les seeds incluent :

- `COGNATE_STRONG`
- `COGNATE_WEAK`
- `FALSE_FRIEND`
- `PARTIAL_EQUIVALENCE`

La procédure insère une relation, mais ne semble pas faire d'upsert. Des doublons peuvent donc apparaître si le même appel est rejoué, sauf contrainte absente ou ajoutée ailleurs.

### Incohérences observées

La signature est stable dans les fichiers observés.

Le champ `is_symmetric` est inséré, mais toutes les procédures de lecture ne l'utilisent pas explicitement pour décider du sens de consultation.

---

## `sp_insert_ic_feature`

### Rôle

Insérer un trait d'intercompréhension associé à une forme lexicale.

Exemples de traits :

- `GRAPHIC_SIMILARITY`
- `TRANSPARENCY_SCORE`
- `FALSE_FRIEND_RISK`

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_lang_code` | `VARCHAR(5)` | Code langue de la forme |
| `p_norm_lemma` | `VARCHAR(255)` | Lemme normalisé de la forme |
| `p_feature_type` | `VARCHAR(50)` | Type de trait IC |
| `p_value_num` | `DECIMAL(8,4)` | Valeur numérique éventuelle |
| `p_value_text` | `VARCHAR(100)` | Valeur textuelle éventuelle |
| `p_source_label` | `VARCHAR(100)` | Provenance |
| `p_confidence_score` | `DECIMAL(4,3)` | Confiance dans l'annotation |
| `p_notes` | `TEXT` | Notes libres |

### Exemple d'usage

```sql
CALL sp_insert_ic_feature(
    'es',
    'informacion',
    'TRANSPARENCY_SCORE',
    0.96,
    NULL,
    'manual_seed_v2',
    0.95,
    NULL
);
```

### Dépendances

- Table `ic_feature`
- Table `lexical_form`
- Table `language`
- Forme lexicale déjà présente

La procédure signale une erreur si la forme lexicale n'existe pas.

### Remarques

La procédure permet de stocker soit une valeur numérique, soit une valeur textuelle.

### Incohérences observées

La signature est stable dans les fichiers observés.

Comme `sp_insert_form_relation`, cette procédure insère sans upsert. Rejouer un seed peut donc produire des doublons si aucune contrainte ne les empêche.

---

## 5. Procédures de lecture

## `sp_get_all_relations`

### Rôle

Retourner les relations associées à un lemme normalisé, dans les deux sens :

- lorsque le lemme est côté source ;
- lorsque le lemme est côté cible.

Cette procédure donne donc une vue bidirectionnelle des relations enregistrées.

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_lemma` | `VARCHAR(255)` | Lemme normalisé recherché |

### Exemple d'usage

```sql
CALL sp_get_all_relations('information');
CALL sp_get_all_relations('phenomene');
CALL sp_get_all_relations('librairie');
```

### Dépendances

- Table `form_relation`
- Table `lexical_form`
- Table `language`

### Remarques

La procédure utilise un `UNION` pour retourner les relations dans les deux sens.

### Incohérences observées

Deux variantes mineures d'ordre de tri existent :

- `procedures.sql` trie par `score DESC` ;
- `init_schema.sql` trie par `score DESC, lang_2, word_2`.

La logique centrale reste similaire.

---

## `sp_get_cognates`

### Rôle

Retourner les relations depuis une forme source dont le lemme normalisé correspond à `p_lemma`.

Malgré son nom, la procédure ne filtre pas explicitement sur `COGNATE_STRONG` ou `COGNATE_WEAK`. Elle retourne les relations partant de la forme source, quel que soit `relation_type`.

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_lemma` | `VARCHAR(255)` | Lemme normalisé source recherché |

### Exemple d'usage

```sql
CALL sp_get_cognates('information');
```

### Dépendances

- Table `form_relation`
- Table `lexical_form`
- Table `language`

### Remarques

La procédure retourne :

- lemme source ;
- langue source ;
- lemme cible ;
- langue cible ;
- type de relation ;
- score.

### Incohérences observées

Le nom suggère une recherche de cognats, mais la requête ne limite pas les résultats aux types `COGNATE_*`.

La procédure ne cherche que les relations où le lemme est côté source. Elle ne compense pas le sens inverse comme `sp_get_all_relations`.

---

## `sp_get_false_friends`

### Rôle

Retourner les relations de type `FALSE_FRIEND` pour une forme source donnée.

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_lemma` | `VARCHAR(255)` | Lemme normalisé source recherché |

### Exemple d'usage

```sql
CALL sp_get_false_friends('librairie');
CALL sp_get_false_friends('preservatif');
```

### Dépendances

- Table `lexical_form`
- Table `form_relation`
- Table `language`

### Remarques

La procédure filtre explicitement :

```sql
fr.relation_type = 'FALSE_FRIEND'
```

### Incohérences observées

Comme `sp_get_cognates`, elle ne cherche que dans le sens où le lemme est la forme source. Une relation stockée dans l'autre sens ne sera pas retournée par cette procédure.

Les colonnes retournées ne sont pas toutes aliasées dans `procedures.sql`, ce qui peut rendre le résultat moins lisible côté client.

---

## `sp_get_similarity`

### Rôle

Calculer un score de similarité très simple entre un mot fourni et les lemmes normalisés présents dans `lexical_form`.

La logique actuelle est :

- égalité exacte : `1.0` ;
- inclusion dans un sens ou l'autre : `0.7` ;
- sinon : `0.3`.

### Paramètres

| Paramètre | Type | Rôle |
|---|---|---|
| `p_word` | `VARCHAR(255)` | Mot ou lemme normalisé à comparer |

### Exemple d'usage

```sql
CALL sp_get_similarity('information');
CALL sp_get_similarity('phenomene');
```

### Dépendances

- Table `lexical_form`
- Table `language`

### Remarques

Cette procédure ressemble à un prototype de scoring exploratoire. Elle ne mobilise pas `form_relation`, `pattern_rule`, ni de distance orthographique avancée.

### Incohérences observées

Le commentaire dans `ps.sql` décrit une idée de scoring où une relation existante pourrait donner un score, sinon une similarité brute. La version `sp_get_similarity` observée dans `procedures.sql` ne semble pas utiliser les relations existantes.

---

## 6. Dépendances globales

Les procédures dépendent principalement des tables suivantes :

```text
language
lexical_entry
lexical_form
form_relation
ic_feature
```

La table `pattern_rule` est importante dans le modèle de données, mais aucune procédure `sp_` observée ne l'utilise actuellement.

---

## 7. Incohérences transversales observées

### 7.1 Signature de `sp_upsert_lexical_form`

La coexistence de deux signatures est la divergence la plus concrète.

Question ouverte :

- la procédure doit-elle accepter `p_notes`, puisque les seeds récents l'appellent avec ce paramètre ?

### 7.2 Fichier de référence incertain

`procedures.sql` semble le plus complet pour les procédures de lecture, mais `init_schema.sql` semble plus aligné avec les seeds récents pour `sp_upsert_lexical_form`.

Question ouverte :

- quel fichier représente l'état attendu des procédures dans une base neuve ?

### 7.3 `DEFINER` dans `procedures.sql`

Le dump `procedures.sql` contient `CREATE DEFINER=ic_user@%`.

Question ouverte :

- ce fichier est-il un export d'une base existante ou doit-il être rejoué tel quel dans tous les environnements ?

### 7.4 Procédures de lecture non alignées sur la symétrie

`sp_get_all_relations` lit dans les deux sens.

`sp_get_cognates` et `sp_get_false_friends` ne lisent que depuis la source.

Question ouverte :

- les procédures spécialisées doivent-elles respecter `is_symmetric`, ou rester des lectures orientées source ?

### 7.5 Procédure `sp_get_cognates` plus large que son nom

`sp_get_cognates` ne filtre pas sur `COGNATE_STRONG` ou `COGNATE_WEAK`.

Question ouverte :

- le nom désigne-t-il une intention future, ou la procédure doit-elle être comprise comme "relations depuis un cognat potentiel" ?

### 7.6 Insertions non idempotentes pour relations et features

Les procédures `sp_insert_form_relation` et `sp_insert_ic_feature` sont des insertions simples.

Question ouverte :

- les scripts de seed sont-ils destinés à être rejoués plusieurs fois, ou seulement sur une base vide ?

### 7.7 `pattern_rule` non couverte par les procédures `sp_`

Aucune procédure `sp_` observée ne permet d'insérer ou de consulter `pattern_rule`.

Question ouverte :

- cette table est-elle encore trop expérimentale pour être couverte par des procédures, ou manque-t-il une procédure dédiée ?

---

## 8. Lecture provisoire

L'ensemble des procédures confirme une intention claire :

- éviter les IDs en dur ;
- insérer les données lexicales par clés lisibles ;
- préparer une future API ;
- garder une logique SQL simple.

L'état actuel reste cependant exploratoire :

- les procédures de lecture ne couvrent pas toutes les tables ;
- certaines signatures divergent ;
- les seeds ne sont pas tous compatibles avec toutes les définitions observées ;
- plusieurs fichiers semblent appartenir à des moments différents du prototype.

À ce stade, il est préférable de conserver ces divergences comme informations de travail plutôt que de les corriger automatiquement.
