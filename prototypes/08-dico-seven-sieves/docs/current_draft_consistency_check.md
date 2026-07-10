# Vérification de cohérence théorique de `database/current_draft/`

## Cadre de vérification

Cette vérification est une lecture statique du dossier `database/current_draft/`.

Aucun script SQL n'a été exécuté. Le résultat ci-dessous ne valide donc pas l'exécution réelle dans MariaDB/MySQL ; il indique seulement si l'ordre proposé semble logique au regard des dépendances visibles dans les fichiers.

Ordre vérifié :

1. `00_schema.sql`
2. `10_procedures.sql`
3. `20_seed_base.sql`
4. `30_seed_experimental.sql`

## Verdict provisoire

L'ordre proposé semble cohérent pour une base fraîche ou vide.

La structure générale est logique :

- le schéma est créé avant les procédures ;
- les procédures sont créées avant les appels de seed ;
- les langues minimales sont insérées avant les données lexicales expérimentales ;
- les entrées et formes lexicales expérimentales sont créées avant les relations et les traits qui les référencent.

Aucune procédure appelée dans les seeds ne semble absente du brouillon actuel. Aucun champ utilisé par les procédures ne semble absent du schéma actuel.

Ce verdict reste provisoire : il faudrait une exécution réelle dans l'environnement cible pour confirmer la syntaxe, l'encodage et le comportement exact des contraintes.

## Lecture par fichier

| Fichier | Rôle | Dépendances attendues | État théorique |
|---|---|---|---|
| `00_schema.sql` | Crée la base `ic_dico` et les tables principales | Aucune dépendance applicative préalable | Cohérent comme premier fichier |
| `10_procedures.sql` | Crée les procédures stockées `sp_` | Tables créées par `00_schema.sql` | Cohérent après le schéma |
| `20_seed_base.sql` | Insère les langues de base | `sp_upsert_language` | Cohérent après les procédures |
| `30_seed_experimental.sql` | Insère les entrées, formes, relations et traits expérimentaux | Langues de base, procédures d'upsert et d'insertion | Cohérent après le seed de base |

## Procédures présentes et appels observés

Les procédures présentes dans `10_procedures.sql` sont :

- `sp_get_all_relations`
- `sp_get_cognates`
- `sp_get_false_friends`
- `sp_get_similarity`
- `sp_insert_form_relation`
- `sp_insert_ic_feature`
- `sp_upsert_language`
- `sp_upsert_lexical_entry`
- `sp_upsert_lexical_form`

Les seeds appellent uniquement des procédures présentes :

- `20_seed_base.sql` appelle `sp_upsert_language`.
- `30_seed_experimental.sql` appelle `sp_upsert_lexical_entry`, `sp_upsert_lexical_form`, `sp_insert_form_relation` et `sp_insert_ic_feature`.

La version de `sp_upsert_lexical_form` utilisée dans le brouillon possède bien 7 paramètres, dont `p_notes`. Les appels observés dans `30_seed_experimental.sql` utilisent également 7 arguments.

## Cohérence des champs utilisés

Les champs utilisés par les procédures correspondent au schéma visible dans `00_schema.sql`.

### `language`

Champs utilisés :

- `id`
- `code`
- `name`
- `family`
- `is_romance`
- `is_active`

Ces champs sont présents dans le schéma.

### `lexical_entry`

Champs utilisés :

- `id`
- `entry_key`
- `gloss_fr`
- `gloss_en`
- `semantic_domain`
- `notes`

Ces champs sont présents dans le schéma.

### `lexical_form`

Champs utilisés :

- `id`
- `entry_id`
- `language_id`
- `lemma`
- `normalized_lemma`
- `part_of_speech`
- `confidence_score`
- `notes`

Ces champs sont présents dans le schéma. Le champ `notes`, requis par la signature à 7 paramètres de `sp_upsert_lexical_form`, est bien présent.

### `form_relation`

Champs utilisés :

- `source_form_id`
- `target_form_id`
- `relation_type`
- `score`
- `is_symmetric`
- `source_label`
- `confidence_score`
- `notes`

Ces champs sont présents dans le schéma.

### `ic_feature`

Champs utilisés :

- `form_id`
- `feature_type`
- `value_num`
- `value_text`
- `source_label`
- `confidence_score`
- `notes`

Ces champs sont présents dans le schéma.

## Dépendances de données

### Langues

`20_seed_base.sql` crée les langues suivantes avant les données expérimentales :

- `fr`
- `es`
- `it`
- `pt`
- `en`

Ces codes sont ceux utilisés ensuite par les appels de `30_seed_experimental.sql`.

### Entrées et formes lexicales

Dans `30_seed_experimental.sql`, les données suivent globalement l'ordre attendu :

1. création ou mise à jour d'une entrée lexicale ;
2. création ou mise à jour des formes lexicales associées ;
3. création des relations entre formes ;
4. ajout de traits expérimentaux.

Les relations et traits observés semblent référencer des formes créées plus haut dans le même fichier ou dans un bloc précédent du même fichier.

## Points de vigilance

### 1. Rejouabilité limitée du schéma

`00_schema.sql` utilise `CREATE DATABASE IF NOT EXISTS`, mais les tables sont créées avec `CREATE TABLE` sans `IF NOT EXISTS` ni suppression préalable.

Conséquence théorique : le brouillon semble adapté à une base fraîche, mais pas nécessairement à une réexécution sur une base où les tables existent déjà.

Ce n'est pas une incohérence de l'ordre, mais c'est une limite importante pour les tests répétés.

### 2. Seeds expérimentaux partiellement non idempotents

Les procédures d'upsert rendent les langues, entrées et formes relativement rejouables.

En revanche, `sp_insert_form_relation` et `sp_insert_ic_feature` font des insertions directes. Si `30_seed_experimental.sql` est relancé plusieurs fois, les relations et traits peuvent être dupliqués.

Ce n'est pas bloquant pour une première exécution sur base vide, mais c'est une fragilité pour un brouillon rejoué plusieurs fois.

### 3. Résolution par `normalized_lemma`

`sp_insert_form_relation` et `sp_insert_ic_feature` recherchent les formes à partir du couple :

- code langue ;
- `normalized_lemma`.

Cette stratégie est simple et fonctionne si chaque lemme normalisé est non ambigu dans une langue donnée.

Le schéma ne garantit toutefois pas l'unicité de `(language_id, normalized_lemma)`. La contrainte unique actuelle porte sur `(language_id, lemma, part_of_speech)`.

Conséquence théorique : si plusieurs formes partagent plus tard le même `normalized_lemma` dans une même langue, les procédures peuvent sélectionner une forme arbitraire via `LIMIT 1`.

### 4. `pattern_rule` conservé mais non intégré aux seeds

La table `pattern_rule` est bien présente dans `00_schema.sql`, conformément au choix de la conserver.

Elle n'est pas alimentée par les seeds actuels et aucune procédure du brouillon ne semble l'utiliser.

Ce n'est pas un problème d'exécution, mais cela confirme que `pattern_rule` reste un élément expérimental ou en attente d'intégration.

### 5. Validation réelle encore nécessaire

La présence de `DELIMITER $$`, de `DROP PROCEDURE IF EXISTS` et de procédures stockées doit être validée dans le client MariaDB/MySQL effectivement utilisé.

La lecture statique ne permet pas de garantir :

- le comportement exact du client SQL ;
- l'encodage des caractères accentués ;
- l'application concrète des contraintes ;
- l'absence d'erreur de syntaxe invisible à la lecture.

## Incohérences bloquantes observées

Aucune incohérence bloquante n'a été observée dans l'ordre théorique des fichiers.

En particulier :

- aucune procédure appelée par les seeds ne semble absente ;
- aucun champ utilisé par les procédures ne semble absent du schéma ;
- la signature actuelle de `sp_upsert_lexical_form` correspond aux appels à 7 arguments ;
- les langues utilisées dans les données expérimentales sont introduites avant ces données ;
- les relations et traits semblent être placés après les formes qu'ils référencent.

## Conclusion

Le dossier `database/current_draft/` forme une base de travail provisoire cohérente sur le plan logique.

L'ordre `00_schema.sql`, `10_procedures.sql`, `20_seed_base.sql`, `30_seed_experimental.sql` peut être considéré comme la séquence théorique la plus lisible actuellement pour une première exécution sur base fraîche.

Les principaux risques ne concernent pas l'ordre immédiat, mais plutôt :

- la rejouabilité ;
- l'ambiguïté possible des recherches par `normalized_lemma` ;
- l'absence d'intégration effective de `pattern_rule` ;
- la nécessité d'un test réel ultérieur dans l'environnement SQL cible.

Le brouillon ne doit donc pas être considéré comme une version finale, mais comme une consolidation provisoire raisonnable pour continuer l'exploration.
