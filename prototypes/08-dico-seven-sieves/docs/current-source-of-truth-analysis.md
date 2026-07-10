# Analyse de source de vérité SQL provisoire

> Audit de cohérence des fichiers `database/sql.sql`, `database/init_schema.sql`, `database/schema.sql` et `database/procedures.sql`.
>
> Ce document ne modifie aucun script SQL, ne propose aucun renommage automatique et ne tranche pas définitivement l'architecture. Le projet reste exploratoire.

---

## 1. Question posée

Le dossier `database/` contient plusieurs fichiers qui peuvent ressembler à des sources de vérité :

- `sql.sql`
- `init_schema.sql`
- `schema.sql`
- `procedures.sql`

L'objectif de cet audit est d'identifier lequel représente aujourd'hui la meilleure base provisoire, ou quelle combinaison minimale paraît la plus lisible.

---

## 2. Résumé court

À l'état actuel, aucun fichier seul ne représente parfaitement toute la base de vérité.

La meilleure source provisoire semble être :

```text
database/sql.sql          pour le schéma des tables
database/procedures.sql   pour l'inventaire le plus complet des procédures sp_
```

Mais cette proposition reste prudente, car :

- `procedures.sql` contient une variante de `sp_upsert_lexical_form` à 6 paramètres ;
- les seeds récents appellent plutôt une variante à 7 paramètres avec `p_notes` ;
- `procedures.sql` utilise `CREATE DEFINER=ic_user@%`, ce qui ressemble à un export de base plus qu'à un script portable ;
- `sql.sql` ne contient aucune procédure ni donnée ;
- `schema.sql` est plus proche d'une photographie de base existante que d'un script source maintenable ;
- `init_schema.sql` mélange schéma et procédures, mais est explicitement marqué comme à vérifier et ne contient pas `pattern_rule`.

---

## 3. Comparaison synthétique

| Fichier | Contenu principal | Points forts | Limites observées | Statut provisoire proposé |
|---|---|---|---|---|
| `database/sql.sql` | Schéma des tables | Clair, court, inclut `pattern_rule`, pas de données mélangées | Pas de procédures, pas de données, pas de `DROP TABLE` | Meilleure base provisoire pour le schéma |
| `database/init_schema.sql` | Schéma + procédures | Rejouable sur base existante grâce aux `DROP`, inclut des procédures sans `DEFINER`, version 7 paramètres de `sp_upsert_lexical_form` | Marqué "à vérifier", omet `pattern_rule`, schéma plus réduit, ne contient pas toutes les procédures de lecture | Brouillon de consolidation, pas source principale |
| `database/schema.sql` | Dump phpMyAdmin complet | Reflète un état réel exporté avec données, index, contraintes, `AUTO_INCREMENT` | Mélange structure et données, ordre dump, encodage visible abîmé dans l'affichage, pas de procédures, peu maintenable comme source | Snapshot / photographie, pas source maintenable |
| `database/procedures.sql` | Procédures stockées `sp_` | Inventaire le plus complet des procédures, inclut les lectures `sp_get_*` | Utilise `DEFINER`, variante 6 paramètres de `sp_upsert_lexical_form`, pas autonome sans schéma | Meilleure base provisoire pour les procédures, avec réserves |

---

## 4. Analyse de `database/sql.sql`

### Contenu

`sql.sql` crée :

- la base `ic_dico` ;
- `language` ;
- `lexical_entry` ;
- `lexical_form` ;
- `form_relation` ;
- `pattern_rule` ;
- `ic_feature`.

Il crée aussi plusieurs index et contraintes.

### Points forts

Ce fichier est le plus lisible comme schéma source :

- il ne mélange pas structure et données ;
- il inclut la table `pattern_rule`, importante dans la documentation du projet ;
- il contient les champs enrichis de `lexical_form` : `gender`, `number_behavior`, `register_label`, `source_label` ;
- il définit les clés étrangères principales ;
- il inclut la contrainte `chk_form_relation_not_same`.

### Limites

Il ne contient pas :

- les procédures stockées ;
- les données de seed ;
- les `DROP TABLE IF EXISTS`, donc il semble plutôt destiné à une base neuve.

### Lecture provisoire

`sql.sql` paraît être la meilleure base actuelle pour le schéma relationnel propre.

Il ne suffit pas seul à reconstruire l'environnement complet, mais il est plus clair que `schema.sql` et plus complet côté tables que `init_schema.sql`.

---

## 5. Analyse de `database/init_schema.sql`

### Contenu

`init_schema.sql` contient :

- un commentaire initial : "A vérifier, comparer à l'existant !!" ;
- des `DROP TABLE IF EXISTS` ;
- la création de plusieurs tables ;
- la création de plusieurs procédures `sp_`.

Tables créées :

- `language`
- `lexical_entry`
- `lexical_form`
- `form_relation`
- `ic_feature`

Procédures créées :

- `sp_upsert_language`
- `sp_upsert_lexical_entry`
- `sp_upsert_lexical_form`
- `sp_insert_form_relation`
- `sp_insert_ic_feature`
- `sp_get_all_relations`

### Points forts

Ce fichier a l'avantage d'être un brouillon de reconstruction complète :

- il recrée les tables après suppression ;
- il inclut les procédures d'insertion de base ;
- il utilise `CREATE PROCEDURE` sans `DEFINER`, ce qui peut être plus portable ;
- sa version de `sp_upsert_lexical_form` accepte `p_notes`, ce qui correspond aux appels présents dans `seed_data.sql` et `seed_data_v2.sql`.

### Limites

Plusieurs divergences l'empêchent d'être une source de vérité fiable aujourd'hui :

- il est explicitement marqué comme à vérifier ;
- il ne crée pas `pattern_rule` ;
- sa table `lexical_form` est plus réduite que celle de `sql.sql` et `schema.sql` ;
- il ne contient pas `sp_get_cognates`, `sp_get_false_friends` ni `sp_get_similarity` ;
- il mélange schéma et procédures, ce qui rend le statut de chaque partie moins clair.

### Lecture provisoire

`init_schema.sql` ressemble à un brouillon utile de consolidation, pas à la meilleure source de vérité actuelle.

Il signale toutefois une information importante : la version à 7 paramètres de `sp_upsert_lexical_form` semble mieux alignée avec les seeds récents.

---

## 6. Analyse de `database/schema.sql`

### Contenu

`schema.sql` est un dump phpMyAdmin généré le 15 mai 2026.

Il contient :

- création de base ;
- création de tables ;
- insertions de données ;
- index ;
- `AUTO_INCREMENT` ;
- contraintes ;
- données pour `language`, `lexical_entry`, `lexical_form`, `form_relation`, `ic_feature`, `pattern_rule`.

### Points forts

Ce fichier est probablement la meilleure photographie d'une base ayant réellement existé.

Il est utile pour :

- comprendre l'état concret d'une base exportée ;
- comparer les données présentes à un moment donné ;
- retrouver les IDs et les `AUTO_INCREMENT` d'une instance ;
- confirmer que `pattern_rule` existe dans au moins un état de base.

### Limites

Comme source de vérité maintenable, il a plusieurs limites :

- il mélange structure et données ;
- il contient des détails propres au dump ;
- il ne contient pas les procédures stockées ;
- il est moins lisible pour faire évoluer le modèle ;
- son affichage montre des caractères accentués abîmés dans la sortie consultée, même si le fichier source peut simplement être encodé différemment ;
- il ne contient pas la contrainte `chk_form_relation_not_same` observée dans `sql.sql` et `init_schema.sql`.

### Lecture provisoire

`schema.sql` doit plutôt être traité comme un snapshot, pas comme la source principale.

Il reste très utile pour comparaison, mais il ne devrait pas devenir le script maintenu à la main.

---

## 7. Analyse de `database/procedures.sql`

### Contenu

`procedures.sql` contient neuf procédures `sp_` :

- `sp_get_all_relations`
- `sp_get_cognates`
- `sp_get_false_friends`
- `sp_get_similarity`
- `sp_insert_form_relation`
- `sp_insert_ic_feature`
- `sp_upsert_language`
- `sp_upsert_lexical_entry`
- `sp_upsert_lexical_form`

### Points forts

Ce fichier est le plus complet pour les procédures :

- il couvre les insertions principales ;
- il couvre plusieurs procédures de lecture ;
- il donne une vision plus large que `init_schema.sql`.

### Limites

Plusieurs réserves doivent être signalées :

- toutes les procédures sont créées avec `CREATE DEFINER=ic_user@%` ;
- il ne contient pas de `DROP PROCEDURE IF EXISTS`, contrairement à `init_schema.sql` ;
- sa version de `sp_upsert_lexical_form` accepte 6 paramètres, alors que les seeds récents appellent 7 paramètres ;
- il ne suffit pas seul, car il dépend du schéma déjà créé.

### Lecture provisoire

`procedures.sql` paraît être la meilleure base actuelle pour inventorier les procédures `sp_`.

Mais il ne peut pas être considéré comme parfaitement prêt à rejouer dans tous les environnements sans vérifier :

- le rôle du `DEFINER` ;
- la signature attendue de `sp_upsert_lexical_form` ;
- l'ordre d'import avec les seeds.

---

## 8. Divergences majeures

### 8.1 Présence de `pattern_rule`

`pattern_rule` est présent dans :

- `sql.sql`
- `schema.sql`

`pattern_rule` est absent de :

- `init_schema.sql`
- `procedures.sql` n'est pas concerné car il ne crée pas les tables.

Cette divergence est importante parce que `pattern_rule` est documentée comme une table potentiellement centrale pour les transformations interlangues.

### 8.2 Forme de `lexical_form`

`sql.sql` et `schema.sql` incluent :

- `gender`
- `number_behavior`
- `register_label`
- `source_label`

`init_schema.sql` ne contient pas ces champs.

Question ouverte :

- ces champs sont-ils déjà considérés comme appartenant au schéma courant ou seulement à une version enrichie ?

### 8.3 Procédures de lecture

`procedures.sql` contient :

- `sp_get_all_relations`
- `sp_get_cognates`
- `sp_get_false_friends`
- `sp_get_similarity`

`init_schema.sql` contient seulement :

- `sp_get_all_relations`

Question ouverte :

- les procédures de lecture spécialisées font-elles partie du noyau courant ou d'une couche expérimentale ?

### 8.4 Signature de `sp_upsert_lexical_form`

`procedures.sql` définit une version à 6 paramètres.

`init_schema.sql` définit une version à 7 paramètres avec `p_notes`.

Les fichiers `seed_data.sql` et `seed_data_v2.sql` appellent la version à 7 paramètres.

Question ouverte :

- la version à 7 paramètres doit-elle être considérée comme la plus récente, ou seulement comme une variante expérimentale ?

### 8.5 `DEFINER` dans `procedures.sql`

`procedures.sql` utilise :

```sql
CREATE DEFINER=`ic_user`@`%` PROCEDURE ...
```

`init_schema.sql` utilise :

```sql
CREATE PROCEDURE ...
```

Question ouverte :

- `procedures.sql` est-il un dump de procédures existantes ou un fichier destiné à l'initialisation portable ?

### 8.6 Structure vs données

`schema.sql` mélange :

- schéma ;
- données ;
- index ;
- contraintes ;
- auto-increments.

`sql.sql` ne contient que le schéma.

Question ouverte :

- veut-on une source maintenable à la main ou une photographie complète de base ?

Pour un projet exploratoire simple, les deux rôles devraient probablement rester séparés.

---

## 9. Proposition de source provisoire

### 9.1 Source provisoire pour le schéma

Proposition :

```text
database/sql.sql
```

Raison :

- c'est le fichier de schéma le plus lisible ;
- il contient `pattern_rule` ;
- il sépare le schéma des données ;
- il reflète mieux le modèle documenté que `init_schema.sql`.

Réserve :

- il ne contient pas les procédures ;
- il ne dit pas comment initialiser une base existante déjà remplie ;
- il doit être comparé à `schema.sql` si l'on veut vérifier l'état réel exporté.

### 9.2 Source provisoire pour les procédures

Proposition :

```text
database/procedures.sql
```

Raison :

- c'est l'inventaire le plus complet des procédures `sp_` ;
- il inclut les procédures de lecture absentes de `init_schema.sql`.

Réserves :

- la signature de `sp_upsert_lexical_form` n'est pas alignée avec les seeds récents ;
- le `DEFINER` peut rendre l'import moins portable ;
- il ne contient pas de `DROP PROCEDURE IF EXISTS`.

### 9.3 Statut des autres fichiers

Proposition :

```text
database/schema.sql       = snapshot / dump de comparaison
database/init_schema.sql  = brouillon de consolidation à vérifier
```

`schema.sql` ne devrait pas être ignoré : il est précieux comme photographie.

`init_schema.sql` ne devrait pas être supprimé : il contient des choix possiblement plus récents côté procédures, notamment `p_notes` dans `sp_upsert_lexical_form`.

---

## 10. Recommandation simple

Sans modifier automatiquement les scripts, la lecture la plus simple aujourd'hui est :

```text
Source provisoire du schéma :
  database/sql.sql

Source provisoire des procédures :
  database/procedures.sql

Sources à consulter pour vérification :
  database/schema.sql
  database/init_schema.sql
```

Cette combinaison n'est pas parfaite, mais elle évite deux pièges :

- prendre un dump complet comme fichier maintenable ;
- prendre un fichier marqué "à vérifier" comme vérité principale.

---

## 11. Questions à garder ouvertes

- Faut-il considérer `pattern_rule` comme obligatoire dans le schéma courant ?
- La version courante de `sp_upsert_lexical_form` doit-elle accepter `p_notes` ?
- Les champs enrichis de `lexical_form` doivent-ils rester dans le noyau ?
- `procedures.sql` doit-il être vu comme export de production locale ou comme script d'initialisation ?
- Les procédures de lecture `sp_get_cognates`, `sp_get_false_friends` et `sp_get_similarity` sont-elles déjà dans le noyau ou encore expérimentales ?
- `schema.sql` doit-il rester un snapshot daté plutôt qu'un fichier de travail ?

---

## 12. Conclusion provisoire

La meilleure base de vérité provisoire n'est pas un fichier unique.

Elle semble plutôt être :

```text
database/sql.sql + database/procedures.sql
```

avec deux notes de prudence :

- `init_schema.sql` contient des indices utiles sur une version plus compatible avec les seeds récents ;
- `schema.sql` reste la photographie concrète d'un état de base et doit servir de comparaison.

Cette proposition privilégie la simplicité et la lisibilité, sans masquer les divergences encore présentes.
