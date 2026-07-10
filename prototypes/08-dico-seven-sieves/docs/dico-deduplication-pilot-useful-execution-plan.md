# Dico-IC — plan d'exécution du cas pilote `USEFUL`

## Statut du document

Ce document prépare une intervention DBA future. Il ne constitue pas une
exécution.

Aucune donnée n'a été modifiée. Aucun mapping n'a été créé. Aucune entrée n'a
été fusionnée, supprimée ou renommée.

Documents sources :

- `docs/dico-deduplication-v0-diagnostic.md`
- `docs/dico-deduplication-pilot-useful.md`

Cas ciblé :

```text
USEFUL
UTIL_ADJECTIVE_USEFUL
```

## 1. État initial

### 1.1 Hypothèse retenue

`USEFUL` est l'entrée canonique. Elle porte les lemmes dictionnaires.

`UTIL_ADJECTIVE_USEFUL` est très probablement une entrée doublon créée autour de
formes adjectivales plurielles. Elle ne représente pas un concept lexical
distinct dans l'état actuel des données.

### 1.2 `USEFUL`

| Élément | Valeur |
|---|---|
| `lexical_entry.id` | 75 |
| `entry_key` | `USEFUL` |
| `gloss_fr` | `Qui sert à quelque chose` |
| `gloss_en` | `That serves a purpose` |
| `semantic_domain` | `qualité` |

Formes :

| `lexical_form_id` | Langue | Lemme | Normalisé | POS |
|---:|---|---|---|---|
| 310 | en | `useful` | `useful` | `adjective` |
| 309 | es | `útil` | `util` | `adjective` |
| 311 | fr | `utile` | `utile` | `adjective` |
| 312 | it | `utile` | `utile` | `adjective` |
| 313 | pt | `útil` | `util` | `adjective` |

### 1.3 `UTIL_ADJECTIVE_USEFUL`

| Élément | Valeur |
|---|---|
| `lexical_entry.id` | 121 |
| `entry_key` | `UTIL_ADJECTIVE_USEFUL` |
| `gloss_fr` | `qui sert à quelque chose` |
| `gloss_en` | `serving a purpose` |
| `semantic_domain` | `description` |

Formes :

| `lexical_form_id` | Langue | Lemme stocké | Normalisé | POS |
|---:|---|---|---|---|
| 539 | es | `útiles` | `utiles` | `adjective` |
| 540 | fr | `utiles` | `utiles` | `adjective` |
| 541 | it | `utili` | `utili` | `adjective` |
| 542 | pt | `úteis` | `uteis` | `adjective` |

### 1.4 Dépendances observées

État observé lors du cas pilote :

| Dépendance | Résultat |
|---|---|
| `form_relation` liée aux formes des deux entrées | 0 |
| `inflected_form` ciblant les formes des deux entrées | 0 |
| `ic_feature` liée aux formes des deux entrées | 0 |
| `connector_help` lié aux deux entrées | 0 |

### 1.5 Risques connus

Le risque principal est le masquage du chemin `inflected_form`.

Aujourd'hui, `/analysis` cherche d'abord un match exact dans `lexical_form`.
Tant que les formes suivantes existent dans `lexical_form`, elles peuvent être
résolues comme des lemmes autonomes :

```text
es utiles  -> UTIL_ADJECTIVE_USEFUL
fr utiles  -> UTIL_ADJECTIVE_USEFUL
it utili   -> UTIL_ADJECTIVE_USEFUL
pt uteis   -> UTIL_ADJECTIVE_USEFUL
```

Créer des mappings `inflected_form` sans retirer ces surfaces du lookup
`lexical_form` ne suffit donc pas à changer le comportement de `/analysis`.

Deux niveaux d'intervention doivent être distingués :

| Niveau | Effet | Risque |
|---|---|---|
| Phase A : créer les mappings `inflected_form` | Prépare la correction, faible risque | `/analysis` reste masqué par les anciennes `lexical_form` |
| Phase B : retirer les pluriels du chemin `lexical_form` | Résout réellement le cas | nécessite une politique d'archivage ou de suppression contrôlée |

## 2. Sauvegarde préalable

Avant toute intervention réelle, effectuer une sauvegarde complète puis une
sauvegarde ciblée.

### 2.1 Sauvegarde complète

Sauvegarder toute la base `ic_dico`, idéalement avec structure et données.

Exemple de commande à exécuter seulement le jour de l'opération :

```bash
mysqldump --single-transaction --routines --triggers \
  -h localhost -P 3306 -u ic_user -p ic_dico \
  > backups/ic_dico_before_dedup_useful_YYYYMMDD_HHMMSS.sql
```

Cette sauvegarde complète est la source de rollback ultime.

### 2.2 Sauvegarde ciblée

Exporter ensuite les tables directement concernées :

```text
lexical_entry
lexical_form
form_relation
inflected_form
ic_feature
connector_help
```

Ordre recommandé :

1. `lexical_entry`
2. `lexical_form`
3. `form_relation`
4. `ic_feature`
5. `inflected_form`
6. `connector_help`

Justification :

- `lexical_form` dépend de `lexical_entry` ;
- `form_relation`, `ic_feature` et `inflected_form` dépendent de
  `lexical_form` ;
- `connector_help` peut dépendre de `lexical_entry`.

### 2.3 Sauvegarde ciblée par requêtes

Ces requêtes peuvent être utilisées pour exporter la photographie du cas.

```sql
SELECT *
FROM lexical_entry
WHERE entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

```sql
SELECT lf.*
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

```sql
SELECT r.*
FROM form_relation r
JOIN lexical_form sf ON sf.id = r.source_form_id
JOIN lexical_entry se ON se.id = sf.entry_id
JOIN lexical_form tf ON tf.id = r.target_form_id
JOIN lexical_entry te ON te.id = tf.entry_id
WHERE se.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL')
   OR te.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

```sql
SELECT f.*
FROM ic_feature f
JOIN lexical_form lf ON lf.id = f.form_id
JOIN lexical_entry le ON le.id = lf.entry_id
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

```sql
SELECT inf.*
FROM inflected_form inf
JOIN lexical_form lf ON lf.id = inf.lexical_form_id
JOIN lexical_entry le ON le.id = lf.entry_id
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

```sql
SELECT ch.*
FROM connector_help ch
JOIN lexical_entry le ON le.id = ch.lexical_entry_id
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

## 3. Plan d'exécution détaillé

### Étape 0 - validation humaine

Confirmer explicitement que :

```text
USEFUL = entrée canonique
UTIL_ADJECTIVE_USEFUL = doublon probable à nettoyer
```

Sans cette validation, l'opération ne doit pas commencer.

### Étape 1 - sauvegarde

Effectuer :

1. sauvegarde complète ;
2. export ciblé des tables concernées ;
3. conservation de la sortie des requêtes de vérification.

### Étape 2 - transaction de préparation morphologique

Créer les quatre mappings `inflected_form` vers les formes canoniques de
`USEFUL` :

```text
útiles -> útil
utiles -> utile
utili  -> utile
úteis  -> útil
```

Cette étape est réversible et peut être exécutée dans une transaction.

### Étape 3 - contrôle technique immédiat

Vérifier :

- quatre mappings créés ;
- tous en `VALIDATED` ;
- tous en `PLURAL` ;
- aucune collision `inflected_form` ;
- aucune modification involontaire dans `lexical_entry` ou `lexical_form`.

### Étape 4 - test `/analysis` après phase A

Tester les tokens pluriels.

Résultat attendu après phase A seulement :

```text
les mappings inflected_form existent
mais /analysis peut encore résoudre les pluriels via lexical_form
```

Si ce comportement se produit, ce n'est pas un échec de phase A. C'est le
verrou déjà identifié.

### Étape 5 - décision sur la phase B

La phase B consiste à empêcher les formes pluriels de `UTIL_ADJECTIVE_USEFUL`
de rester des lemmes actifs dans `lexical_form`.

Le schéma actuel ne possède pas de statut d'archivage pour `lexical_entry` ou
`lexical_form`. Il faut donc choisir une politique avant d'agir :

1. **Option B1 - attendre** : conserver `UTIL_ADJECTIVE_USEFUL` et accepter que
   `/analysis` reste masqué pour ces surfaces.
2. **Option B2 - suppression contrôlée** : supprimer les formes et l'entrée
   doublon après sauvegarde, avec rollback documenté.
3. **Option B3 - évolution future du modèle** : ajouter plus tard un statut
   logique d'archivage, puis archiver sans suppression physique.
4. **Option B4 - évolution future de `/analysis`** : ignorer certaines entrées
   marquées comme doublons, ce qui demande un mécanisme de marquage.

Pour une opération DBA réversible et prudente, B3 est la meilleure cible à long
terme. B2 est possible techniquement, mais plus risquée car elle efface les
lignes.

### Étape 6 - vérifications fonctionnelles

Une fois la phase retenue exécutée, vérifier :

- `/analysis` ;
- Assistant IA Formes Fléchies ;
- tamis 6 ;
- Seven Sieves ;
- absence de régression sur le singulier.

### Étape 7 - documentation de décision

Consigner :

- date ;
- opérateur ;
- sauvegarde utilisée ;
- SQL exécuté ;
- résultats des tests ;
- décision sur `UTIL_ADJECTIVE_USEFUL`.

## 4. SQL d'intervention préparé

Les requêtes ci-dessous sont préparées pour une opération future. Elles ne sont
pas exécutées dans cette mission.

### 4.1 Lecture

Inventaire des entrées :

```sql
SELECT
  le.id,
  le.entry_key,
  le.gloss_fr,
  le.gloss_en,
  le.semantic_domain,
  le.notes
FROM lexical_entry le
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL')
ORDER BY le.entry_key;
```

Inventaire des formes :

```sql
SELECT
  le.entry_key,
  lf.id AS lexical_form_id,
  l.code AS language,
  lf.lemma,
  lf.normalized_lemma,
  lf.part_of_speech,
  lf.confidence_score,
  lf.notes
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL')
ORDER BY le.entry_key, l.code;
```

### 4.2 Vérification avant création

Vérifier que les cibles canoniques existent :

```sql
SELECT
  l.code AS language,
  lf.id AS lexical_form_id,
  lf.lemma,
  lf.normalized_lemma,
  lf.part_of_speech
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'USEFUL'
  AND (
    (l.code = 'es' AND lf.normalized_lemma = 'util')
    OR (l.code = 'fr' AND lf.normalized_lemma = 'utile')
    OR (l.code = 'it' AND lf.normalized_lemma = 'utile')
    OR (l.code = 'pt' AND lf.normalized_lemma = 'util')
  )
ORDER BY l.code;
```

Vérifier que les mappings n'existent pas déjà :

```sql
SELECT
  inf.id,
  l.code AS language,
  lf.lemma AS target_lemma,
  inf.surface_form,
  inf.normalized_surface,
  inf.grammatical_number,
  inf.status
FROM inflected_form inf
JOIN lexical_form lf ON lf.id = inf.lexical_form_id
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'USEFUL'
  AND (
    (l.code = 'es' AND inf.normalized_surface = 'utiles')
    OR (l.code = 'fr' AND inf.normalized_surface = 'utiles')
    OR (l.code = 'it' AND inf.normalized_surface = 'utili')
    OR (l.code = 'pt' AND inf.normalized_surface = 'uteis')
  );
```

Vérifier les dépendances :

```sql
SELECT COUNT(*) AS relation_count
FROM form_relation r
JOIN lexical_form sf ON sf.id = r.source_form_id
JOIN lexical_entry se ON se.id = sf.entry_id
JOIN lexical_form tf ON tf.id = r.target_form_id
JOIN lexical_entry te ON te.id = tf.entry_id
WHERE se.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL')
   OR te.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

```sql
SELECT COUNT(*) AS feature_count
FROM ic_feature f
JOIN lexical_form lf ON lf.id = f.form_id
JOIN lexical_entry le ON le.id = lf.entry_id
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

```sql
SELECT COUNT(*) AS connector_help_count
FROM connector_help ch
JOIN lexical_entry le ON le.id = ch.lexical_entry_id
WHERE le.entry_key IN ('USEFUL', 'UTIL_ADJECTIVE_USEFUL');
```

### 4.3 Création des mappings `inflected_form`

Ces requêtes sont prévues pour une future exécution transactionnelle.

```sql
START TRANSACTION;
```

Espagnol :

```sql
INSERT INTO inflected_form (
  lexical_form_id,
  surface_form,
  normalized_surface,
  grammatical_number,
  status,
  source_label,
  confidence_score
)
SELECT
  lf.id,
  'útiles',
  'utiles',
  'PLURAL',
  'VALIDATED',
  'dedup_pilot_useful_v0',
  1.000
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'USEFUL'
  AND l.code = 'es'
  AND lf.normalized_lemma = 'util'
  AND lf.part_of_speech = 'adjective'
  AND NOT EXISTS (
    SELECT 1
    FROM inflected_form existing
    WHERE existing.lexical_form_id = lf.id
      AND existing.normalized_surface = 'utiles'
      AND existing.grammatical_number = 'PLURAL'
  );
```

Français :

```sql
INSERT INTO inflected_form (
  lexical_form_id,
  surface_form,
  normalized_surface,
  grammatical_number,
  status,
  source_label,
  confidence_score
)
SELECT
  lf.id,
  'utiles',
  'utiles',
  'PLURAL',
  'VALIDATED',
  'dedup_pilot_useful_v0',
  1.000
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'USEFUL'
  AND l.code = 'fr'
  AND lf.normalized_lemma = 'utile'
  AND lf.part_of_speech = 'adjective'
  AND NOT EXISTS (
    SELECT 1
    FROM inflected_form existing
    WHERE existing.lexical_form_id = lf.id
      AND existing.normalized_surface = 'utiles'
      AND existing.grammatical_number = 'PLURAL'
  );
```

Italien :

```sql
INSERT INTO inflected_form (
  lexical_form_id,
  surface_form,
  normalized_surface,
  grammatical_number,
  status,
  source_label,
  confidence_score
)
SELECT
  lf.id,
  'utili',
  'utili',
  'PLURAL',
  'VALIDATED',
  'dedup_pilot_useful_v0',
  1.000
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'USEFUL'
  AND l.code = 'it'
  AND lf.normalized_lemma = 'utile'
  AND lf.part_of_speech = 'adjective'
  AND NOT EXISTS (
    SELECT 1
    FROM inflected_form existing
    WHERE existing.lexical_form_id = lf.id
      AND existing.normalized_surface = 'utili'
      AND existing.grammatical_number = 'PLURAL'
  );
```

Portugais :

```sql
INSERT INTO inflected_form (
  lexical_form_id,
  surface_form,
  normalized_surface,
  grammatical_number,
  status,
  source_label,
  confidence_score
)
SELECT
  lf.id,
  'úteis',
  'uteis',
  'PLURAL',
  'VALIDATED',
  'dedup_pilot_useful_v0',
  1.000
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'USEFUL'
  AND l.code = 'pt'
  AND lf.normalized_lemma = 'util'
  AND lf.part_of_speech = 'adjective'
  AND NOT EXISTS (
    SELECT 1
    FROM inflected_form existing
    WHERE existing.lexical_form_id = lf.id
      AND existing.normalized_surface = 'uteis'
      AND existing.grammatical_number = 'PLURAL'
  );
```

Contrôle avant validation :

```sql
SELECT
  COUNT(*) AS created_count
FROM inflected_form
WHERE source_label = 'dedup_pilot_useful_v0';
```

Fin de transaction si tout est conforme :

```sql
COMMIT;
```

Rollback immédiat si le contrôle échoue :

```sql
ROLLBACK;
```

### 4.4 Contrôle post-opération

Contrôler les mappings créés :

```sql
SELECT
  inf.id,
  l.code AS language,
  lf.lemma AS target_lemma,
  inf.surface_form,
  inf.normalized_surface,
  inf.grammatical_number,
  inf.status,
  inf.source_label,
  inf.confidence_score
FROM inflected_form inf
JOIN lexical_form lf ON lf.id = inf.lexical_form_id
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'USEFUL'
  AND inf.source_label = 'dedup_pilot_useful_v0'
ORDER BY l.code;
```

Vérifier les surfaces encore visibles comme `lexical_form` :

```sql
SELECT
  le.entry_key,
  l.code AS language,
  lf.id AS lexical_form_id,
  lf.lemma,
  lf.normalized_lemma,
  lf.part_of_speech
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'UTIL_ADJECTIVE_USEFUL'
ORDER BY l.code;
```

Cette requête doit probablement retourner quatre lignes après phase A. C'est
normal tant que la phase B n'est pas décidée.

## 5. Plan de rollback

### 5.1 Rollback pendant la transaction

Si une anomalie est détectée avant `COMMIT` :

```sql
ROLLBACK;
```

Vérifier ensuite :

```sql
SELECT COUNT(*) AS remaining_count
FROM inflected_form
WHERE source_label = 'dedup_pilot_useful_v0';
```

Résultat attendu :

```text
0
```

### 5.2 Rollback après commit de la phase A

Si la phase A a été validée mais doit être annulée, supprimer uniquement les
mappings créés par l'opération, en s'appuyant sur le `source_label`.

```sql
START TRANSACTION;
```

```sql
DELETE FROM inflected_form
WHERE source_label = 'dedup_pilot_useful_v0';
```

```sql
SELECT COUNT(*) AS remaining_count
FROM inflected_form
WHERE source_label = 'dedup_pilot_useful_v0';
```

Si le compteur vaut 0 :

```sql
COMMIT;
```

Sinon :

```sql
ROLLBACK;
```

### 5.3 Rollback après phase B éventuelle

Si une future phase B supprime physiquement les formes ou l'entrée
`UTIL_ADJECTIVE_USEFUL`, le rollback doit utiliser les sauvegardes ciblées.

Ordre de restauration recommandé :

1. restaurer `lexical_entry` pour `UTIL_ADJECTIVE_USEFUL` ;
2. restaurer ses `lexical_form` ;
3. restaurer les éventuelles `form_relation` ;
4. restaurer les éventuelles `ic_feature` ;
5. restaurer les éventuelles `inflected_form` préexistantes ;
6. restaurer les éventuels `connector_help` ;
7. supprimer les mappings `dedup_pilot_useful_v0` si nécessaire ;
8. relancer les contrôles de cohérence.

Dans l'état actuel, aucune dépendance secondaire n'a été observée, mais le
rollback doit rester générique.

### 5.4 Rollback complet

En cas de doute sérieux, restaurer la sauvegarde complète `mysqldump` dans un
environnement contrôlé, comparer, puis restaurer la base de travail seulement si
la procédure de restauration a été vérifiée.

## 6. Vérifications fonctionnelles

### 6.1 `POST /analysis`

Tester les textes suivants :

```text
Los recursos son útiles.
Ces ressources sont utiles.
Questi strumenti sono utili.
Estes recursos são úteis.
```

Pour chaque langue :

- vérifier si le token pluriel est résolu via `lexical_form` ou
  `inflected_form` ;
- vérifier la présence ou l'absence d'un enrichissement tamis 6 ;
- vérifier que le singulier reste résolu vers `USEFUL`.

Après phase A seulement, résultat possible :

```text
mapping inflected_form présent
mais non utilisé si lexical_form plurielle existe encore
```

Après une phase B complète, résultat attendu :

```text
forme plurielle
↓
inflected_form VALIDATED
↓
lemme USEFUL
↓
enrichissement tamis 6
```

### 6.2 Assistant IA Formes Fléchies

Tester :

```text
útiles -> útil
utiles -> utile
utili -> utile
úteis -> útil
```

Résultats attendus après phase A :

- état `ALREADY_KNOWN` ou équivalent si le mapping existe ;
- aucune proposition de nouvelle entrée lexicale ;
- aucun doublon `inflected_form`.

### 6.3 Tamis 6

Vérifier que le tamis 6 produit un enrichissement uniquement si la forme est
réellement résolue par `inflected_form`.

Structure attendue :

```json
{
  "sieve_id": 6,
  "type": "morphosyntactic_signal",
  "source": {
    "kind": "inflected_form"
  },
  "payload": {
    "category": "validated_plural",
    "grammatical_number": "PLURAL",
    "lemma": "útil",
    "surface_form": "útiles"
  }
}
```

### 6.4 Seven Sieves

Tester la variante Seven Sieves qui affiche les indices pédagogiques.

Cas attendu après résolution complète :

```text
útiles
↓
Indice de pluriel
↓
Cette forme est le pluriel validé de « útil ».
```

Vérifier aussi :

- tamis 1 inchangé ;
- tamis 4 inchangé ;
- Connector Help inchangé ;
- pas de régression sur les enrichissements lexicaux.

## 7. Généralisation

La procédure est réutilisable pour les groupes suivants :

```text
ELEMENT / ELEMENTO_NOUN_ELEMENT
ENDING / TERMINACION_NOUN_ENDING
STRATEGY / ESTRATEGIA_NOUN_STRATEGY
FAMILIAR / FAMILIAR_ADJECTIVE_FAMILIAR
TEXT / TEXTO_NOUN_TEXT
```

### Étapes génériques

1. Identifier le couple ou groupe candidat.
2. Choisir une entrée canonique provisoire.
3. Lister toutes les formes.
4. Distinguer lemmes et surfaces fléchies.
5. Vérifier `form_relation`.
6. Vérifier `ic_feature`.
7. Vérifier `inflected_form`.
8. Vérifier `connector_help`.
9. Vérifier les usages dans `/analysis`.
10. Créer les mappings `inflected_form` seulement après validation humaine.
11. Décider séparément du sort de l'entrée doublon.
12. Tester `/analysis` et Seven Sieves.
13. Documenter la décision.

### Différences à prévoir

Certains cas seront plus complexes que `USEFUL` :

- des relations `form_relation` peuvent exister ;
- une entrée doublon peut contenir des notes utiles ;
- une entrée peut mélanger formes canoniques et formes fléchies ;
- des noms peuvent avoir des genres ou variations plus difficiles ;
- certaines formes peuvent être ambiguës.

La procédure `USEFUL` est donc un modèle, pas une garantie que les prochains cas
seront aussi simples.

## 8. Go / No-Go

### Décision

```text
GO pour la phase A
NO-GO pour une résolution complète immédiate
```

### Pourquoi GO pour la phase A ?

La phase A consiste uniquement à créer quatre mappings `inflected_form`
validés vers `USEFUL`.

Elle est acceptable parce que :

- l'entrée canonique existe ;
- les formes cibles sont claires ;
- aucune relation ou feature ne complique le cas ;
- l'opération est transactionnelle ;
- le rollback est simple ;
- les mappings prépareraient le bon modèle morphologique.

Prérequis :

1. sauvegarde complète ;
2. validation humaine explicite ;
3. vérification que les mappings n'existent pas déjà ;
4. exécution dans une transaction ;
5. contrôle immédiat.

### Pourquoi NO-GO pour la résolution complète immédiate ?

La résolution complète suppose que les formes pluriels ne soient plus actives
comme `lexical_form`.

Or, le modèle actuel ne dispose pas encore de :

- champ `status` sur `lexical_entry` ;
- champ `status` sur `lexical_form` ;
- mécanisme d'archivage logique ;
- politique officielle de suppression des doublons ;
- règle `/analysis` permettant d'ignorer une entrée marquée comme doublon.

Supprimer physiquement `UTIL_ADJECTIVE_USEFUL` serait possible techniquement
après sauvegarde, mais ce serait une décision de politique de données, pas une
simple correction technique.

### Recommandation finale

Exécuter d'abord la phase A comme migration préparatoire, puis attendre une
décision projet pour la phase B.

Ordre conseillé :

```text
1. créer les mappings inflected_form validés
2. constater explicitement que /analysis reste masqué par lexical_form
3. décider de la politique d'archivage ou de suppression
4. appliquer la résolution complète seulement ensuite
```

Le cas `USEFUL` reste le meilleur pilote, mais il révèle une limite structurante
du modèle actuel : la déduplication réelle demande non seulement de créer le bon
chemin morphologique, mais aussi de pouvoir retirer proprement l'ancien chemin
lexical.
