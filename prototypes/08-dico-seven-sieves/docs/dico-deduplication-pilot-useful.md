# Dico-IC — cas pilote de déduplication `USEFUL` / `UTIL_ADJECTIVE_USEFUL`

## Statut du document

Ce document est une étude opérationnelle préparatoire réalisée en lecture seule.

Aucune donnée n'a été modifiée, fusionnée ou supprimée. L'objectif est de
préparer une procédure reproductible pour les cas où une entrée canonique
coexiste avec une entrée contenant des formes fléchies stockées comme lemmes.

Cas étudié :

```text
USEFUL
UTIL_ADJECTIVE_USEFUL
```

## 1. Inventaire complet

### 1.1 Entrées lexicales

| Champ | `USEFUL` | `UTIL_ADJECTIVE_USEFUL` |
|---|---|---|
| `id` | 75 | 121 |
| `entry_key` | `USEFUL` | `UTIL_ADJECTIVE_USEFUL` |
| `gloss_fr` | `Qui sert à quelque chose` | `qui sert à quelque chose` |
| `gloss_en` | `That serves a purpose` | `serving a purpose` |
| `semantic_domain` | `qualité` | `description` |
| `notes` | `Ajout manuel via Dico-IC Admin V0.` | `Ajout manuel via Dico-IC Admin V0.` |

Les deux entrées portent donc la même glose française, à la casse près, et une
glose anglaise très proche.

### 1.2 Formes lexicales de `USEFUL`

| `lexical_form_id` | Langue | Lemme | Normalisé | POS | Confiance |
|---:|---|---|---|---|---:|
| 310 | en | `useful` | `useful` | `adjective` | 1.000 |
| 309 | es | `útil` | `util` | `adjective` | 1.000 |
| 311 | fr | `utile` | `utile` | `adjective` | 1.000 |
| 312 | it | `utile` | `utile` | `adjective` | 1.000 |
| 313 | pt | `útil` | `util` | `adjective` | 1.000 |

Ces formes correspondent à des lemmes dictionnaires. `USEFUL` couvre les quatre
langues romanes prioritaires et l'anglais.

### 1.3 Formes lexicales de `UTIL_ADJECTIVE_USEFUL`

| `lexical_form_id` | Langue | Lemme stocké | Normalisé | POS | Confiance |
|---:|---|---|---|---|---:|
| 539 | es | `útiles` | `utiles` | `adjective` | 1.000 |
| 540 | fr | `utiles` | `utiles` | `adjective` | 1.000 |
| 541 | it | `utili` | `utili` | `adjective` | 1.000 |
| 542 | pt | `úteis` | `uteis` | `adjective` | 1.000 |

Ces formes ressemblent à des pluriels adjectivaux, pas à des lemmes
dictionnaires. Elles appartiennent plutôt à la couche morphologique
`inflected_form`.

### 1.4 Relations `form_relation`

Résultat observé :

```text
0 relation liée aux formes de USEFUL
0 relation liée aux formes de UTIL_ADJECTIVE_USEFUL
```

Aucune relation n'est donc à transférer aujourd'hui. Ce point réduit fortement
le risque du cas pilote, mais il ne doit pas être généralisé : d'autres doublons
pourraient porter des relations utiles.

### 1.5 Mappings `inflected_form`

Résultat observé :

```text
0 inflected_form attachée aux formes de USEFUL
0 inflected_form attachée aux formes de UTIL_ADJECTIVE_USEFUL
```

Les pluriels `útiles`, `utiles`, `utili` et `úteis` ne sont donc pas encore
représentés comme formes fléchies validées vers les lemmes canoniques.

### 1.6 `ic_feature`

Résultat observé :

```text
0 ic_feature attachée aux formes de USEFUL
0 ic_feature attachée aux formes de UTIL_ADJECTIVE_USEFUL
```

Aucune feature IC ne serait à migrer dans ce cas précis.

### 1.7 `connector_help`

Résultat observé :

```text
0 connector_help lié à USEFUL
0 connector_help lié à UTIL_ADJECTIVE_USEFUL
```

Ce résultat est attendu : ces entrées décrivent un adjectif lexical, pas un
connecteur discursif.

### 1.8 Usages éventuels dans `/analysis`

Le moteur d'analyse cherche d'abord les tokens dans `lexical_form`. Les formes
de `UTIL_ADJECTIVE_USEFUL` peuvent donc être reconnues aujourd'hui comme des
lemmes exacts :

| Token normalisé | Langue | Entrée actuellement trouvable comme `lexical_form` |
|---|---|---|
| `util` | es | `USEFUL` |
| `utiles` | es | `UTIL_ADJECTIVE_USEFUL` |
| `utile` | fr | `USEFUL` |
| `utiles` | fr | `UTIL_ADJECTIVE_USEFUL` |
| `utile` | it | `USEFUL` |
| `utili` | it | `UTIL_ADJECTIVE_USEFUL` |
| `util` | pt | `USEFUL` |
| `uteis` | pt | `UTIL_ADJECTIVE_USEFUL` |

Ce comportement est précisément le problème : un pluriel observé peut être
traité comme un lemme autonome au lieu d'être résolu vers son lemme canonique.

## 2. Analyse conceptuelle

### S'agit-il du même concept ?

Oui, selon les données actuelles.

Les signaux convergent :

- même glose française ;
- même catégorie grammaticale ;
- même champ sémantique général ;
- formes romanes de `UTIL_ADJECTIVE_USEFUL` correspondant aux pluriels des
  formes canoniques de `USEFUL` ;
- aucun indice visible d'un sens spécialisé, lexicalisé ou distinct.

### Ce qui est canonique

L'entrée canonique est `USEFUL`.

Elle contient :

- l'anglais `useful` ;
- les lemmes romans singuliers/canoniques `útil`, `utile`, `utile`, `útil` ;
- la catégorie `adjective` ;
- une glose plus générale.

### Ce qui ressemble à une forme fléchie

`UTIL_ADJECTIVE_USEFUL` contient :

```text
ES útiles
FR utiles
IT utili
PT úteis
```

Ces formes correspondent à des pluriels adjectivaux. Elles ne devraient pas
servir de `lexical_form.lemma` dans la convention désormais retenue par le
projet.

### Lexique ou morphologie ?

| Élément | Niveau recommandé |
|---|---|
| `útil`, `utile`, `utile`, `útil`, `useful` | lexique canonique : `lexical_form` |
| `útiles`, `utiles`, `utili`, `úteis` | morphologie attestée : `inflected_form` |
| relation entre `utile` et `útil` | relation IC éventuelle : `form_relation` |
| information "pluriel" | morphologie pédagogique : tamis 6 |

La règle générale confirmée par ce cas est :

```text
lexical_form = lemme canonique
inflected_form = surface observée validée vers un lemme
form_relation = relation d'intercompréhension entre lemmes
```

## 3. Simulation de nettoyage

Cette section décrit une cible possible. Elle n'est pas une opération exécutée.

### Avant

```text
lexical_entry USEFUL
├── EN useful
├── ES útil
├── FR utile
├── IT utile
└── PT útil

lexical_entry UTIL_ADJECTIVE_USEFUL
├── ES útiles
├── FR utiles
├── IT utili
└── PT úteis
```

Effet actuel probable :

```text
token "útiles"
↓
lookup lexical_form exact
↓
entrée UTIL_ADJECTIVE_USEFUL
```

Le pluriel est donc pris pour un lemme.

### Après recommandé

```text
lexical_entry USEFUL
├── EN useful
├── ES útil
│   └── inflected_form útiles / PLURAL / VALIDATED
├── FR utile
│   └── inflected_form utiles / PLURAL / VALIDATED
├── IT utile
│   └── inflected_form utili / PLURAL / VALIDATED
└── PT útil
    └── inflected_form úteis / PLURAL / VALIDATED

lexical_entry UTIL_ADJECTIVE_USEFUL
└── à archiver/fusionner après validation humaine
```

Effet cible attendu :

```text
token "útiles"
↓
lookup lexical_form exact
↓
non trouvé comme lemme autonome
↓
lookup inflected_form VALIDATED
↓
lemme cible ES útil
↓
entrée USEFUL
↓
enrichissement lexical + éventuel indice tamis 6
```

Cette cible suppose qu'une future opération empêche `útiles` de rester visible
comme `lexical_form`, sinon le lookup exact continuera à masquer le chemin
`inflected_form`.

## 4. Formes à convertir en `inflected_form`

Les conversions suivantes seraient candidates à une revue humaine.

| Langue | Surface actuelle | Normalisée | Lemme cible | `lexical_form_id` cible | Catégorie | Justification |
|---|---|---|---|---:|---|---|
| es | `útiles` | `utiles` | `útil` | 309 | adjective | Pluriel adjectival espagnol de `útil` |
| fr | `utiles` | `utiles` | `utile` | 311 | adjective | Pluriel adjectival français de `utile` |
| it | `utili` | `utili` | `utile` | 312 | adjective | Pluriel adjectival italien de `utile` |
| pt | `úteis` | `uteis` | `útil` | 313 | adjective | Pluriel adjectival portugais de `útil` |

Valeurs conceptuelles recommandées pour une future création :

| Champ | Valeur recommandée |
|---|---|
| `grammatical_number` | `PLURAL` |
| `status` | `VALIDATED` après validation humaine |
| `source_label` | `dedup_pilot_useful_v0` ou équivalent |
| `confidence_score` | `1.000` si validé manuellement |

## 5. Relations et dépendances

### Relations existantes

Les formes des deux entrées n'ont actuellement aucune relation `form_relation`.

Opération nécessaire dans ce cas pilote :

```text
aucun transfert de relation
```

### Risque de perte

Faible pour ce cas, car aucune relation, feature, aide connecteur ou mapping
fléchi n'est attaché aux formes observées.

### Dépendances à vérifier avant toute future fusion

Même si le cas actuel est simple, la procédure doit toujours vérifier :

- `form_relation.source_form_id` ;
- `form_relation.target_form_id` ;
- `ic_feature.form_id` ;
- `inflected_form.lexical_form_id` ;
- `connector_help.lexical_entry_id` ;
- usages éventuels dans tests, mocks, documentation et prototypes.

### Point important sur le schéma actuel

`lexical_entry` ne possède pas de champ `status` ou `archived_at`. Une future
"fusion" ne peut donc pas être une simple archive logique dans le modèle actuel.
Deux options prudentes existent :

1. conserver l'entrée doublon temporairement après création des mappings
   `inflected_form` ;
2. attendre un mécanisme d'archivage logique avant toute disparition visible.

Une suppression physique directe serait prématurée.

## 6. Risques à anticiper

### Ce qui pourrait casser

- `/analysis` pourrait continuer à résoudre `útiles`, `utiles`, `utili`,
  `úteis` comme `lexical_form` si ces formes restent stockées dans
  `UTIL_ADJECTIVE_USEFUL`.
- Une suppression physique de `UTIL_ADJECTIVE_USEFUL` supprimerait ses formes
  via la contrainte de clé étrangère, mais elle ne laisserait pas de trace de la
  décision.
- Si d'autres données sont ajoutées plus tard à cette entrée, le cas ne sera
  plus aussi simple.
- Une future création `inflected_form` pourrait entrer en collision si un mapping
  identique existe déjà au moment de l'opération.

### Ce qui doit être vérifié

Avant toute opération réelle :

1. refaire l'inventaire en base ;
2. vérifier qu'aucune relation n'a été ajoutée depuis ce document ;
3. vérifier les collisions `inflected_form` ;
4. tester `/analysis` avant/après sur les formes singulières et plurielles ;
5. vérifier Seven Sieves, notamment les tamis 1, 2, 3 et 6 ;
6. conserver une sauvegarde de la base.

### Ce qui doit être migré

Dans l'état observé aujourd'hui :

```text
à migrer : 4 formes fléchies vers inflected_form
à transférer : aucune relation
à transférer : aucune ic_feature
à transférer : aucun connector_help
```

## 7. Procédure générique proposée

Le cas `USEFUL` peut servir de modèle pour les doublons du type :

```text
lemme canonique
+
formes fléchies stockées comme lemmes
```

Procédure recommandée :

```text
1. Identifier le groupe candidat
2. Inventorier toutes les entrées et formes concernées
3. Comparer les gloses, POS, domaines et notes
4. Décider si le concept est réellement identique
5. Choisir l'entrée canonique
6. Identifier les formes fléchies à convertir
7. Vérifier les dépendances :
   - form_relation
   - ic_feature
   - inflected_form
   - connector_help
   - usages dans code/docs/tests
8. Préparer les mappings inflected_form
9. Transférer ou recréer les relations utiles si nécessaire
10. Vérifier que les surfaces fléchies ne masquent plus le lookup inflected_form
11. Tester /analysis et Seven Sieves
12. Archiver logiquement l'entrée doublon si le modèle le permet
13. Supprimer physiquement seulement si une politique explicite existe
```

La règle centrale :

```text
ne jamais supprimer avant d'avoir recréé le chemin utile vers l'entrée canonique
```

## 8. Recommandation finale

### Faut-il traiter ce cas ?

Oui.

`USEFUL` / `UTIL_ADJECTIVE_USEFUL` est un excellent cas pilote parce que :

- le doublon conceptuel est très probable ;
- les formes fléchies sont faciles à identifier ;
- l'entrée canonique existe déjà ;
- aucune relation ou feature ne complique la migration aujourd'hui ;
- le cas illustre exactement le problème que les prompts IA corrigés cherchent à
  éviter.

### Comment le traiter ?

Recommandation opérationnelle future, après sauvegarde et revue humaine :

```text
1. conserver USEFUL comme entrée canonique ;
2. créer quatre mappings inflected_form VALIDATED vers les formes de USEFUL ;
3. vérifier que /analysis résout les pluriels via inflected_form ;
4. vérifier que le tamis 6 peut expliquer ces pluriels ;
5. décider ensuite du sort de UTIL_ADJECTIVE_USEFUL.
```

### Que faire de `UTIL_ADJECTIVE_USEFUL` ?

Dans le schéma actuel, la meilleure décision n'est pas de supprimer
immédiatement. Le projet devrait d'abord choisir une politique de traitement des
doublons :

- archive logique future ;
- table ou champ de décision qualité ;
- ou suppression physique contrôlée après sauvegarde.

En attendant, `UTIL_ADJECTIVE_USEFUL` doit être considéré comme :

```text
doublon probable
à ne plus enrichir
à convertir en inflected_form
à retirer du chemin d'analyse seulement lors d'une opération contrôlée
```

## 9. Conclusion

Le cas pilote confirme la stratégie générale :

```text
USEFUL = connaissance lexicale canonique
UTIL_ADJECTIVE_USEFUL = accident de modélisation lié à des pluriels observés
```

Il valide aussi une procédure plus large pour les futurs cas similaires :

```text
observer
classer
convertir les formes fléchies
préserver les relations
tester l'analyse
archiver seulement après décision humaine
```

Ce cas peut donc devenir le modèle de référence pour nettoyer les doublons
conceptuels issus de formes fléchies stockées dans `lexical_form`, à condition de
respecter strictement la validation humaine et de ne jamais automatiser la fusion
ou la suppression.
