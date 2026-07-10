# Dico-IC — diagnostic V0 de déduplication

## Statut du document

Ce document est un diagnostic en lecture seule réalisé le 21 juin 2026 sur la
base locale `ic_dico`.

Aucune donnée n'a été modifiée, fusionnée ou supprimée. Les constats ci-dessous
servent uniquement à :

```text
observer
classer
analyser
proposer
```

## 1. Synthèse

La base actuelle contient :

| Objet | Volume observé |
|---|---:|
| `lexical_entry` | 156 |
| `lexical_form` | 625 |
| `inflected_form` | 5 |
| `form_relation` | 70 |
| langues actives | 5 |

Le diagnostic ne trouve pas de doublon exact sur :

```text
language + part_of_speech + normalized_lemma
```

et ne trouve pas non plus de doublon exact de `form_relation` ni de collision
dans `inflected_form`.

Le risque principal est donc ailleurs :

1. formes fléchies stockées comme lemmes ;
2. même concept représenté par une entrée canonique et une entrée descriptive ;
3. entrées sans formes ou très incomplètes ;
4. stubs créés autour d'un mot isolé puis recouverts ensuite par une entrée
   plus complète ;
5. variantes proches introduites par IA ou par tests admin.

Le cas `USEFUL` / `UTIL_ADJECTIVE_USEFUL` est confirmé comme emblématique :
`USEFUL` contient les lemmes canoniques, tandis que `UTIL_ADJECTIVE_USEFUL`
contient des pluriels romanes stockés dans `lexical_form`.

## 2. Cartographie des risques

### R1 — même concept, plusieurs `lexical_entry`

Exemple typique :

```text
ELEMENT
ELEMENTO_NOUN_ELEMENT
```

ou :

```text
TEXT
TEXTO_NOUN_TEXT
```

Le risque vient de deux styles de clé : une clé conceptuelle courte et une clé
descriptive générée par l'IA.

### R2 — même lemme, plusieurs entrées

Ce cas strict n'a pas été observé aujourd'hui pour :

```text
language + normalized_lemma + part_of_speech
```

Il reste un risque futur si les assistants créent des entrées avant de vérifier
la couverture existante.

### R3 — forme fléchie prise pour un lemme

Risque confirmé.

Exemples observés :

```text
UTIL_ADJECTIVE_USEFUL
ES útiles
FR utiles
IT utili
PT úteis
```

Ces formes devraient plutôt devenir des mappings `inflected_form` vers les
lemmes de `USEFUL`.

### R4 — concept déjà existant recréé par IA

Risque probable, surtout pour les entrées générées avec des clés descriptives :

```text
ESTRATEGIA_NOUN_STRATEGY
STRATEGY

TERMINACION_NOUN_ENDING
ENDING

FAMILIAR_ADJECTIVE_FAMILIAR
FAMILIAR
```

### R5 — entrées partiellement remplies

La base contient :

| Niveau de complétude | Nombre |
|---|---:|
| entrées sans aucune forme | 13 |
| entrées avec une seule forme | 17 |
| entrées avec 2 ou 3 formes | 5 |
| entrées avec 4 formes ou plus | 121 |

Les entrées sans forme sont particulièrement sensibles : elles peuvent être des
concepts attendus, mais aussi des doublons latents.

### R6 — variantes proches mais légitimes

Tout rapprochement n'est pas un doublon. Exemple :

```text
ACTUALLY_NOW_ES
CURRENTLY_NOW
```

peut relever du faux ami ou d'une distinction pédagogique utile, même si les
gloses sont proches.

### R7 — entrées fonctionnelles ou discursives

Avec `connector_help`, certaines expressions comme `pero`, `sin embargo` ou
`parce que` peuvent exister comme aides discursives sans devoir devenir des
entrées lexicales complètes. Les stubs lexicaux de connecteurs doivent donc être
revus prudemment.

### R8 — données expérimentales historiques

Une partie de la base vient de seeds, tests, pages admin et assistants IA. Les
styles de nommage, domaines et niveaux de complétude ne sont pas homogènes. Ce
n'est pas anormal dans un projet exploratoire, mais cela augmente le risque de
dédoublement silencieux.

## 3. État actuel de la base

### 3.1 Doublons stricts

Résultat observé :

```text
0 doublon exact language + normalized_lemma + part_of_speech
0 doublon exact language + lemma + part_of_speech entre plusieurs entrées
0 normalized_lemma vide ou NULL
0 collision inflected_form par langue + normalized_surface
0 doublon form_relation
```

Ce point est positif : les contraintes et validations actuelles empêchent déjà
les collisions les plus simples.

### 3.2 Entrées sans formes

Entrées observées sans `lexical_form` :

```text
ABANDONNER
ADAPTER
BEAUCOUP
CEPENDANT
CONTINUER
ESTUDIANTE_NOUN_STUDENT
OBSERVAR_VERB_TO_OBSERVE
PARCE_QUE
PROJET
TRAVAILLER
TROUVER
UNIVERSIDAD_NOUN_UNIVERSITY
UNIVERSITY
```

Ces entrées ne sont pas forcément fausses. Elles peuvent représenter :

- des brouillons ;
- des créations interrompues ;
- des concepts destinés à être complétés ;
- des doublons d'entrées plus complètes ;
- des connecteurs qui devraient plutôt vivre dans `connector_help`.

### 3.3 Entrées monolingues

Entrées observées avec une seule forme :

```text
ACTUALLY_NOW_ES
ASK_REQUEST
ATTEND_BE_PRESENT
CIRCULAR_VERB_TO_CIRCULATE
COLLEGE_HE
CURRENTLY_NOW
DEMAND_REQUIRE
EXISTIR_VERB_TO_EXIST
IMAGINAR_VERB_TO_IMAGINE
LIBRARY_PUBLIC
PERMITIR_VERB_TO_ALLOW
PRESERVATIVE_ADDITIVE
PROMOTE_ACTION
SCIENTIFIC_PROPERTY
SECONDARY_SCHOOL_FR
SENSITIVE_EMOTIONAL
SER
```

Ces entrées peuvent être légitimes si elles servent à documenter des faux amis,
des verbes observés ou des concepts encore incomplets. Elles méritent toutefois
un statut de revue.

### 3.4 Formes ressemblant à des pluriels stockées comme lemmes

La requête heuristique détecte de nombreuses formes nominales/adjectivales dont
la terminaison ressemble à un pluriel. Tous les cas ne sont pas automatiquement
faux : par exemple `sens` en français peut être un lemme.

Cas particulièrement suspects car ils forment des paires avec une entrée
canonique existante :

| Entrée suspecte | Entrée canonique proche | Signal |
|---|---|---|
| `UTIL_ADJECTIVE_USEFUL` | `USEFUL` | pluriels romanes contre lemmes canoniques |
| `ELEMENTO_NOUN_ELEMENT` | `ELEMENT` | `elementos/éléments/elementi` vs `elemento/élément` |
| `TERMINACION_NOUN_ENDING` | `ENDING` | `terminaciones/terminaisons/terminazioni` vs singuliers |
| `ESTRATEGIA_NOUN_STRATEGY` | `STRATEGY` | `estrategias/estratégias` vs `estrategia` |
| `FAMILIAR_ADJECTIVE_FAMILIAR` | `FAMILIAR` | pluriels `familiares/familiers/familiari` |
| `TEXTO_NOUN_TEXT` | `TEXT` | `textos/textes/testi` vs `texto/texte/testo` |

## 4. Cas emblématiques

### 4.1 `USEFUL` / `UTIL_ADJECTIVE_USEFUL`

#### Données observées

`USEFUL` :

| Langue | Forme | Normalisée | POS |
|---|---|---|---|
| en | useful | useful | adjective |
| es | útil | util | adjective |
| fr | utile | utile | adjective |
| it | utile | utile | adjective |
| pt | útil | util | adjective |

`UTIL_ADJECTIVE_USEFUL` :

| Langue | Forme | Normalisée | POS |
|---|---|---|---|
| es | útiles | utiles | adjective |
| fr | utiles | utiles | adjective |
| it | utili | utili | adjective |
| pt | úteis | uteis | adjective |

#### Pourquoi c'est suspect

- Même glose française : `qui sert à quelque chose`.
- Même catégorie grammaticale.
- Même concept pédagogique.
- Les formes de `UTIL_ADJECTIVE_USEFUL` sont des pluriels contextuels.
- Le rapport de correction des prompts IA identifie explicitement ce problème.

#### Pourquoi cela pourrait être légitime

Uniquement si l'on décidait de modéliser une forme lexicalisée ou un emploi
spécifique différent. Ce n'est pas le cas visible ici.

#### Recommandation

Classer comme **doublon probable de type B**, à traiter en revue humaine.

Action future probable, non automatique :

```text
conserver USEFUL comme entrée canonique
transformer les pluriels de UTIL_ADJECTIVE_USEFUL en inflected_form validés
archiver ou fusionner UTIL_ADJECTIVE_USEFUL après validation humaine
```

Ne pas supprimer sans vérifier les relations, notes, usages et éventuels liens
créés depuis cette entrée.

### 4.2 `ELEMENT` / `ELEMENTO_NOUN_ELEMENT`

#### Signal

`ELEMENTO_NOUN_ELEMENT` contient :

```text
elementos
éléments
elementi
elementos
```

tandis que `ELEMENT` contient les formes singulières proches.

#### Interprétation

Doublon probable produit par création depuis forme observée plurielle.

#### Recommandation

Type B : revue humaine prioritaire après `USEFUL`.

### 4.3 `ENDING` / `TERMINACION_NOUN_ENDING`

#### Signal

Les paires singulier/pluriel sont visibles dans plusieurs langues :

```text
terminación / terminaciones
terminaison / terminaisons
terminazione / terminazioni
terminação / terminações
```

#### Recommandation

Type B : doublon probable. Vérifier si `ENDING` porte des relations ou
enrichissements que l'autre entrée ne possède pas.

### 4.4 `STRATEGY` / `ESTRATEGIA_NOUN_STRATEGY`

#### Signal

La collision apparaît en espagnol et portugais :

```text
estrategia / estrategias
estratégia / estratégias
```

#### Recommandation

Type B : doublon probable, mais vérifier la couverture des autres langues avant
décision.

### 4.5 `FAMILIAR` / `FAMILIAR_ADJECTIVE_FAMILIAR`

#### Signal

Même adjectif, formes singulières d'un côté et pluriels de l'autre.

#### Prudence

`familiar` peut aussi avoir des nuances sémantiques selon langue et contexte.
Ici, les données visibles penchent toutefois vers le doublon.

#### Recommandation

Type B, avec revue sémantique.

### 4.6 `ESTUDIANTE_NOUN_STUDENT` / `STUDENT`

#### Signal

Même glose exacte :

```text
personne qui étudie
```

mais `ESTUDIANTE_NOUN_STUDENT` n'a actuellement aucune forme.

#### Recommandation

Type A ou B selon intention. Si l'entrée vide n'a pas de rôle prévu, elle est un
stub à archiver ou fusionner après validation.

### 4.7 `OBSERVAR_VERB_TO_OBSERVE` / `OBSERVE`

#### Signal

Même glose exacte :

```text
regarder attentivement
```

mais l'une des entrées peut être un stub vide.

#### Recommandation

Type B : vérifier s'il s'agit d'une création incomplète de l'Assistant Texte.

## 5. Typologie proposée

### Type A — doublon certain

Critères :

- même concept ;
- mêmes formes canoniques ou mêmes gloses ;
- une entrée vide ou strictement redondante ;
- aucune distinction pédagogique visible.

Action recommandée :

```text
revue humaine
→ choisir l'entrée canonique
→ préparer une fusion contrôlée
```

### Type B — doublon probable

Critères :

- une entrée contient les lemmes ;
- une autre contient des pluriels ou formes fléchies du même concept ;
- ou même glose avec formes proches.

Exemples :

```text
USEFUL / UTIL_ADJECTIVE_USEFUL
ELEMENT / ELEMENTO_NOUN_ELEMENT
ENDING / TERMINACION_NOUN_ENDING
```

Action recommandée :

```text
examiner relations et usages
→ convertir les flexions en inflected_form si pertinent
→ archiver/fusionner ensuite
```

### Type C — entrées proches mais potentiellement distinctes

Critères :

- gloses proches ;
- formes apparentées ;
- mais possible différence de sens, registre, faux ami ou fonction pédagogique.

Exemples possibles :

```text
ACTUALLY_NOW_ES / CURRENTLY_NOW
ATTEND_BE_PRESENT / ASSIST?
DEMAND_REQUIRE / ASK_REQUEST
```

Action recommandée :

```text
conserver temporairement
→ documenter la distinction
→ éventuellement relier comme faux ami ou relation pédagogique
```

### Type D — aucun problème immédiat

Critères :

- entrée complète ;
- lemmes canoniques ;
- pas de collision de normalisation ;
- pas de glose identique suspecte ;
- relations cohérentes.

Action recommandée :

```text
aucune action
```

### Type E — entrée incomplète à qualifier

Critères :

- aucune forme ;
- une seule forme ;
- domaine ou glose insuffisante ;
- clé indiquant un brouillon.

Action recommandée :

```text
compléter
ou archiver
ou fusionner
```

## 6. Requêtes SQL utiles

### 6.1 Doublons stricts par lemme normalisé

```sql
SELECT
  l.code AS language,
  lf.part_of_speech,
  lf.normalized_lemma,
  COUNT(*) AS count_forms,
  GROUP_CONCAT(CONCAT(le.entry_key, ':', lf.lemma)
               ORDER BY le.entry_key SEPARATOR ' | ') AS examples
FROM lexical_form lf
JOIN language l ON l.id = lf.language_id
JOIN lexical_entry le ON le.id = lf.entry_id
WHERE lf.normalized_lemma IS NOT NULL
  AND lf.normalized_lemma <> ''
GROUP BY l.code, lf.part_of_speech, lf.normalized_lemma
HAVING COUNT(*) > 1
ORDER BY count_forms DESC, l.code, lf.normalized_lemma;
```

### 6.2 Même lemme exact dans plusieurs entrées

```sql
SELECT
  l.code AS language,
  lf.part_of_speech,
  lf.lemma,
  COUNT(DISTINCT le.id) AS entry_count,
  GROUP_CONCAT(DISTINCT le.entry_key
               ORDER BY le.entry_key SEPARATOR ' | ') AS entries
FROM lexical_form lf
JOIN language l ON l.id = lf.language_id
JOIN lexical_entry le ON le.id = lf.entry_id
GROUP BY l.code, lf.part_of_speech, lf.lemma
HAVING COUNT(DISTINCT le.id) > 1
ORDER BY entry_count DESC, l.code, lf.lemma;
```

### 6.3 Entrées sans forme ou très incomplètes

```sql
SELECT
  le.entry_key,
  COUNT(lf.id) AS form_count,
  GROUP_CONCAT(CONCAT(l.code, ':', lf.lemma, '/', COALESCE(lf.part_of_speech, ''))
               ORDER BY l.code SEPARATOR ' | ') AS forms
FROM lexical_entry le
LEFT JOIN lexical_form lf ON lf.entry_id = le.id
LEFT JOIN language l ON l.id = lf.language_id
GROUP BY le.id
HAVING COUNT(lf.id) <= 1
ORDER BY form_count, le.entry_key;
```

### 6.4 Gloses françaises identiques

```sql
SELECT
  LOWER(TRIM(gloss_fr)) AS gloss_key,
  COUNT(*) AS count_entries,
  GROUP_CONCAT(entry_key ORDER BY entry_key SEPARATOR ' | ') AS entries
FROM lexical_entry
WHERE gloss_fr IS NOT NULL
  AND TRIM(gloss_fr) <> ''
GROUP BY LOWER(TRIM(gloss_fr))
HAVING COUNT(*) > 1
ORDER BY count_entries DESC, gloss_key;
```

### 6.5 Formes qui ressemblent à des pluriels

Cette requête est heuristique. Elle produit des candidats de revue, pas des
erreurs certaines.

```sql
SELECT
  le.entry_key,
  l.code AS language,
  lf.lemma,
  lf.normalized_lemma,
  lf.part_of_speech
FROM lexical_form lf
JOIN lexical_entry le ON le.id = lf.entry_id
JOIN language l ON l.id = lf.language_id
WHERE LOWER(COALESCE(lf.part_of_speech, '')) IN ('noun', 'adjective')
  AND (
    (l.code IN ('fr', 'es', 'pt') AND lf.normalized_lemma REGEXP 's$')
    OR
    (l.code = 'it' AND lf.normalized_lemma REGEXP 'i$')
  )
ORDER BY le.entry_key, l.code, lf.lemma;
```

### 6.6 Collisions `inflected_form`

```sql
SELECT
  l.code AS language,
  inf.normalized_surface,
  COUNT(*) AS count_mappings,
  GROUP_CONCAT(CONCAT(le.entry_key, ':', lf.lemma, '/', inf.status)
               ORDER BY le.entry_key SEPARATOR ' | ') AS mappings
FROM inflected_form inf
JOIN lexical_form lf ON lf.id = inf.lexical_form_id
JOIN language l ON l.id = lf.language_id
JOIN lexical_entry le ON le.id = lf.entry_id
GROUP BY l.code, inf.normalized_surface
HAVING COUNT(*) > 1
ORDER BY count_mappings DESC, l.code, inf.normalized_surface;
```

### 6.7 Doublons de relations symétriques

```sql
SELECT
  LEAST(source_form_id, target_form_id) AS form_a,
  GREATEST(source_form_id, target_form_id) AS form_b,
  relation_type,
  COUNT(*) AS count_relations
FROM form_relation
GROUP BY
  LEAST(source_form_id, target_form_id),
  GREATEST(source_form_id, target_form_id),
  relation_type
HAVING COUNT(*) > 1
ORDER BY count_relations DESC;
```

### 6.8 Entrées sans forme romane

```sql
SELECT
  le.entry_key,
  COUNT(lf.id) AS total_forms,
  SUM(CASE WHEN l.code IN ('fr', 'es', 'it', 'pt') THEN 1 ELSE 0 END)
    AS romance_forms,
  GROUP_CONCAT(CONCAT(COALESCE(l.code, '?'), ':', COALESCE(lf.lemma, '-'))
               ORDER BY l.code SEPARATOR ' | ') AS forms
FROM lexical_entry le
LEFT JOIN lexical_form lf ON lf.entry_id = le.id
LEFT JOIN language l ON l.id = lf.language_id
GROUP BY le.id
HAVING romance_forms = 0 OR romance_forms IS NULL
ORDER BY le.entry_key;
```

## 7. Stratégie de nettoyage prudente

### Étape 1 — figer une photographie

Exporter ou sauvegarder :

- `lexical_entry` ;
- `lexical_form` ;
- `form_relation` ;
- `inflected_form` ;
- `connector_help`.

Ne jamais nettoyer sans pouvoir revenir à l'état précédent.

### Étape 2 — produire une liste de candidats

Utiliser les requêtes ci-dessus pour classer les entrées en :

```text
A doublon certain
B doublon probable
C proche mais distinct
D rien à faire
E incomplet
```

### Étape 3 — choisir une entrée canonique

Pour chaque groupe suspect :

- préférer l'entrée avec lemmes canoniques ;
- vérifier les relations existantes ;
- vérifier les mappings `inflected_form` ;
- vérifier les éventuels usages dans les prototypes ou tests ;
- conserver les notes utiles.

### Étape 4 — préparer une fusion manuelle

Une fusion ne devrait jamais être un `DELETE` direct.

Ordre prudent :

1. compléter l'entrée canonique si nécessaire ;
2. recréer les formes fléchies comme `inflected_form` ;
3. déplacer ou recréer les relations pertinentes ;
4. marquer l'entrée doublon comme archivée si un statut existe un jour ;
5. supprimer physiquement seulement après une phase de validation longue.

### Étape 5 — vérifier `/analysis`

Après toute correction future :

- tester les mots concernés dans `POST /analysis` ;
- vérifier Seven Sieves ;
- vérifier les tamis 1, 2, 3 et 6 ;
- vérifier qu'aucune relation utile n'a disparu.

## 8. Outils futurs pour l'administration

Une section **Qualité du dictionnaire** pourrait regrouper :

### Alertes

- doublons stricts de `normalized_lemma` ;
- entrées sans formes ;
- entrées monolingues ;
- formes ressemblant à des pluriels stockées comme lemmes ;
- gloses identiques ;
- formes sans relation dans des familles attendues ;
- mappings `inflected_form` en conflit ;
- relations symétriques dupliquées.

### Tableaux de contrôle

- **Doublons probables** : groupe, raison, score, action recommandée ;
- **Entrées incomplètes** : nombre de formes, langues manquantes, source ;
- **Formes suspectes** : surface, hypothèse de lemme, cible existante ;
- **Stubs** : entrées sans formes ou sans usage visible.

### Score qualité simple

Sans sur-ingénierie, un score indicatif pourrait combiner :

- nombre de langues romanes couvertes ;
- présence d'une glose ;
- absence de plural-like lemma ;
- relations ou enrichissements disponibles ;
- absence de collision ;
- source et confiance.

Ce score ne devrait pas décider automatiquement. Il sert à trier la revue humaine.

### Actions futures possibles

- marquer comme `needs_review` ;
- archiver logiquement ;
- lier une entrée suspecte à son entrée canonique ;
- proposer une fusion assistée ;
- créer automatiquement une proposition `inflected_form`, sans l'écrire.

## 9. Recommandation finale

### État actuel

Le dictionnaire est sain sur les collisions strictes, mais hétérogène sur la
qualité conceptuelle.

Le niveau de risque global est :

```text
moyen aujourd'hui
élevé si les assistants IA continuent à créer sans contrôle qualité
```

### Urgences

1. Revoir les entrées qui stockent des pluriels comme lemmes.
2. Traiter `USEFUL` / `UTIL_ADJECTIVE_USEFUL` comme cas pilote.
3. Examiner les groupes :

```text
ELEMENT / ELEMENTO_NOUN_ELEMENT
ENDING / TERMINACION_NOUN_ENDING
STRATEGY / ESTRATEGIA_NOUN_STRATEGY
FAMILIAR / FAMILIAR_ADJECTIVE_FAMILIAR
TEXT / TEXTO_NOUN_TEXT
```

4. Qualifier les 13 entrées sans formes.
5. Ajouter un tableau de qualité avant d'augmenter fortement le volume.

### Ordre conseillé

```text
1. créer une liste de revue à partir des requêtes SQL
2. classer les candidats A/B/C/D/E
3. traiter d'abord les doublons issus de pluriels
4. transformer les pluriels utiles en inflected_form
5. conserver une trace des décisions humaines
6. seulement ensuite envisager une fusion ou suppression logique
```

### Principe à conserver

La déduplication doit suivre la même philosophie que les assistants IA :

```text
le système signale
l'humain décide
l'API contrôle
la base conserve une décision explicite
```

Le nettoyage ne doit pas chercher à rendre la base parfaite immédiatement. Il
doit surtout éviter que les mêmes erreurs ne se reproduisent pendant la prochaine
phase de croissance.
