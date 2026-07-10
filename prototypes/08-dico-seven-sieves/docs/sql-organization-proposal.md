# Proposition d'organisation prudente des scripts SQL

> Document de proposition uniquement.
>
> Aucun fichier SQL existant ne doit être supprimé, renommé ou déplacé automatiquement à ce stade. Cette proposition vise à clarifier une organisation possible, simple et réversible, pour un projet encore exploratoire.

---

## 1. Objectif

Le dossier `database/` contient aujourd'hui plusieurs générations de scripts SQL :

- schéma de base ;
- dump phpMyAdmin ;
- procédures stockées ;
- jeux de données ;
- essais directs ;
- scripts marqués comme à vérifier.

Cette situation est normale pour un prototype, mais elle rend moins évident :

- quel fichier sert à créer une base neuve ;
- quel fichier sert à enrichir les données ;
- quels fichiers sont des archives ou des traces d'expérimentation ;
- comment Docker est censé initialiser la base.

L'objectif proposé est donc de garder tous les fichiers, mais de rendre leur rôle plus lisible.

---

## 2. Principe général

Le projet doit rester simple.

La proposition ne cherche pas à introduire un système de migrations complexe. Pour l'instant, une organisation par dossiers et par ordre d'exécution suffit.

Principe recommandé :

```text
un dossier clair
un fichier = un rôle
un ordre d'exécution lisible
les anciens scripts conservés comme archives
```

---

## 3. Organisation cible proposée

À terme, sans suppression de fichiers, le dossier SQL pourrait être organisé ainsi :

```text
database/
  README.md

  current/
    00_schema.sql
    10_procedures.sql
    20_seed_base.sql
    30_seed_experimental.sql

  snapshots/
    schema_YYYY-MM-DD_phpmyadmin.sql

  experiments/
    data_test.sql
    ps.sql
    sp_insert.sql
    seed_data_v2.sql

  legacy/
    init_schema.sql
    sql.sql
    seed_data.sql
```

Cette structure est une proposition de rangement futur, pas une action à appliquer immédiatement.

---

## 4. Rôle proposé des dossiers

### 4.1 `database/current/`

Contiendrait les scripts considérés comme utilisables pour reconstruire une base de développement propre.

Il ne devrait contenir que peu de fichiers, avec un ordre évident :

```text
00_schema.sql
10_procedures.sql
20_seed_base.sql
30_seed_experimental.sql
```

Rôle :

- `00_schema.sql` : crée uniquement les tables, index et contraintes ;
- `10_procedures.sql` : crée uniquement les procédures stockées ;
- `20_seed_base.sql` : insère les langues et les données minimales nécessaires ;
- `30_seed_experimental.sql` : insère les données lexicales encore exploratoires.

Cette séparation garde le projet lisible sans passer à un système de migrations.

### 4.2 `database/snapshots/`

Contiendrait les exports complets faits depuis phpMyAdmin ou un autre outil.

Exemple :

```text
schema_2026-05-15_phpmyadmin.sql
```

Rôle :

- garder une photo complète d'un état de base ;
- faciliter une comparaison ;
- éviter de confondre un dump avec le script source de référence.

Un snapshot peut contenir structure et données, mais il ne devrait pas être le script principal d'initialisation si le projet cherche à rester compréhensible.

### 4.3 `database/experiments/`

Contiendrait les essais utiles à conserver, mais non considérés comme source de vérité.

Exemples actuels possibles :

- `data_test.sql` ;
- `ps.sql` ;
- `sp_insert.sql` ;
- `seed_data_v2.sql`.

Rôle :

- conserver les idées ;
- garder les essais rejouables manuellement si besoin ;
- éviter qu'un script expérimental soit lancé par erreur comme script principal.

### 4.4 `database/legacy/`

Contiendrait les anciens scripts remplacés ou partiellement divergents.

Exemples possibles :

- `init_schema.sql` ;
- `sql.sql` ;
- `seed_data.sql`.

Rôle :

- ne rien perdre ;
- garder l'historique de réflexion ;
- signaler que ces fichiers ne sont plus forcément à exécuter directement.

Ce dossier ne doit pas signifier "à supprimer". Il signifie plutôt "à consulter avec prudence".

---

## 5. Rôle proposé des fichiers actuels

Cette section propose un statut provisoire pour les fichiers déjà présents.

| Fichier actuel | Rôle observé | Statut proposé |
|---|---|---|
| `database/sql.sql` | Schéma propre avec `pattern_rule` | Base possible pour futur `00_schema.sql` |
| `database/procedures.sql` | Procédures `sp_` exportées | Base possible pour futur `10_procedures.sql`, après vérification des signatures |
| `database/seed_data.sql` | Premier seed par procédures | Base possible pour futur `20_seed_base.sql` ou `30_seed_experimental.sql` |
| `database/seed_data_v2.sql` | Deuxième vague de données | À traiter comme seed expérimental |
| `database/schema.sql` | Dump phpMyAdmin complet | À ranger comme snapshot |
| `database/init_schema.sql` | Schéma + procédures, marqué "à vérifier" | À garder comme legacy ou brouillon de consolidation |
| `database/ps.sql` | Procédures sans préfixe `sp_` | À garder comme expérimentation ancienne |
| `database/sp_insert.sql` | Procédures + insertions de test | À garder comme expérimentation ou brouillon |
| `database/data_test.sql` | Insertions directes par IDs | À garder comme expérimentation, non comme seed principal |

---

## 6. Ordre d'exécution recommandé à terme

Pour une base neuve de développement, l'ordre cible pourrait être :

```text
00_schema.sql
10_procedures.sql
20_seed_base.sql
30_seed_experimental.sql
```

Ce découpage présente plusieurs avantages :

- le schéma peut être vérifié seul ;
- les procédures peuvent être recréées sans toucher aux données ;
- les données minimales sont séparées des données exploratoires ;
- il devient plus facile de savoir ce qui est nécessaire pour démarrer.

---

## 7. Lien avec Docker

Actuellement, `docker-compose.yml` monte :

```text
./db:/docker-entrypoint-initdb.d
```

Mais les scripts SQL visibles sont dans :

```text
database/
```

Deux options simples sont possibles plus tard.

### Option A : garder `db/` comme dossier d'initialisation Docker

Dans ce cas, `db/` contiendrait seulement les fichiers prêts à être exécutés automatiquement, par exemple :

```text
db/
  00_schema.sql
  10_procedures.sql
  20_seed_base.sql
```

Avantage :

- Docker ne voit que les scripts validés.

Inconvénient :

- duplication possible avec `database/current/`.

### Option B : faire pointer Docker vers `database/current/`

Le montage deviendrait plus tard :

```text
./database/current:/docker-entrypoint-initdb.d
```

Avantage :

- une seule source visible pour l'initialisation.

Inconvénient :

- il faut être sûr que `current/` ne contient que des scripts exécutables automatiquement.

Pour rester simple, l'option B paraît plus lisible à moyen terme, mais il n'est pas nécessaire de changer cela maintenant.

---

## 8. Convention de nommage proposée

Une convention très légère suffit :

```text
00_schema.sql
10_procedures.sql
20_seed_base.sql
30_seed_experimental.sql
```

Pourquoi des numéros ?

- MariaDB exécute les scripts d'initialisation dans un ordre déterminé par les noms ;
- les numéros rendent l'ordre visible ;
- il devient plus facile d'ajouter un fichier intermédiaire plus tard.

Pour les snapshots :

```text
schema_2026-05-15_phpmyadmin.sql
```

Pour les essais :

```text
experiment_false_friends.sql
experiment_similarity_v1.sql
```

Ces conventions sont des repères, pas des règles lourdes.

---

## 9. Proposition de transition douce

La transition pourrait se faire en plusieurs petites étapes.

### Étape 1 : documenter les rôles

Créer un `database/README.md` indiquant :

- quel fichier est la référence temporaire ;
- quels fichiers sont expérimentaux ;
- quels fichiers ne doivent pas être exécutés automatiquement.

Aucun fichier SQL n'est déplacé à cette étape.

### Étape 2 : choisir une source provisoire de schéma

Comparer calmement :

- `sql.sql`
- `init_schema.sql`
- `schema.sql`

Puis décider quel fichier sert de base au futur `00_schema.sql`.

Question à trancher :

- `pattern_rule` doit-elle être incluse dans le schéma de référence dès maintenant ?

### Étape 3 : choisir une source provisoire de procédures

Comparer :

- `procedures.sql`
- les procédures dans `init_schema.sql`
- les procédures dans `sp_insert.sql`
- les anciennes procédures de `ps.sql`

Puis produire plus tard un `10_procedures.sql` cohérent.

Question à trancher :

- quelle signature de `sp_upsert_lexical_form` est attendue ?

### Étape 4 : séparer seed minimal et seed expérimental

Créer plus tard deux niveaux :

- `20_seed_base.sql` : langues et données minimales ;
- `30_seed_experimental.sql` : cognats, faux amis, scores, exemples encore discutables.

Cette séparation éviterait de mélanger "la base démarre" et "le modèle explore".

### Étape 5 : connecter Docker au dossier validé

Quand `current/` sera prêt, décider si Docker doit pointer vers :

- `db/`, avec copie manuelle des scripts validés ;
- ou `database/current/`, comme source directe.

---

## 10. Points à éviter pour le moment

Pour rester fidèle à l'état exploratoire du projet, il semble préférable d'éviter pour l'instant :

- un système complet de migrations versionnées ;
- une réécriture massive des scripts SQL ;
- la suppression des anciens fichiers ;
- le renommage immédiat de tous les fichiers ;
- la transformation des dumps en source principale ;
- l'ajout d'outils complexes de build SQL.

La priorité devrait être la lisibilité, pas l'industrialisation.

---

## 11. Questions ouvertes

- Quel fichier SQL représente le mieux le schéma voulu aujourd'hui ?
- `pattern_rule` doit-elle être incluse dans le schéma minimal ?
- Les champs `gender`, `number_behavior`, `register_label` et `source_label` doivent-ils rester dans le schéma courant ?
- Les procédures avec `DEFINER=ic_user@%` doivent-elles être gardées telles quelles ou rendues plus portables ?
- `seed_data_v2.sql` complète-t-il `seed_data.sql` ou le remplace-t-il partiellement ?
- Les données discutables de `data_test.sql` doivent-elles devenir un fichier de cas à valider ?
- Le dossier `db/` doit-il devenir le dossier Docker réel ou seulement disparaître de l'usage futur au profit de `database/current/` ?

---

## 12. Recommandation courte

La réorganisation la plus prudente serait :

1. ne supprimer aucun fichier ;
2. ajouter d'abord une documentation de rôle dans `database/README.md` ;
3. préparer plus tard un dossier `database/current/` avec seulement quatre fichiers ordonnés ;
4. déplacer les anciens scripts dans `legacy/`, `experiments/` ou `snapshots/` seulement après validation humaine ;
5. connecter Docker au dossier validé uniquement quand l'ordre d'exécution est clair.

Cette approche garde le projet simple, lisible et réversible.
