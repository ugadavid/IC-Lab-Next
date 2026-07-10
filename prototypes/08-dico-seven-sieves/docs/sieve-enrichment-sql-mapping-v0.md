# Correspondance entre enrichissements V0 et modèle SQL

## Objet et limites

Ce document évalue si le modèle SQL actuel de Dico-IC peut produire les enrichissements présents dans `analysis-response-v0.json` pour Seven Sieves Explorer.

L'analyse distingue trois niveaux :

1. **capacité du schéma** : les tables peuvent-elles représenter l'information ?
2. **disponibilité des données** : les lignes nécessaires existent-elles dans le brouillon actuel ?
3. **capacité de lecture** : les procédures actuelles savent-elles fournir l'information à l'API ?

Aucun SQL n'a été modifié ou exécuté. Les ajouts évoqués sont des pistes minimales, non des décisions de schéma.

## Conclusion synthétique

Le schéma actuel couvre déjà le cœur des enrichissements lexicaux :

- tamis 1 : relations lexicales ;
- tamis 2 : regroupement de formes par entrée ;
- tamis 3 : règles de correspondance ;
- tamis 7 : patrons et affixes.

Les tamis 4 et 6 sont partiellement représentables avec `pattern_rule`, `lexical_form` et `ic_feature`, mais les règles ne sont pas encore assez explicites pour être exécutées de manière générique.

Le tamis 5 est contextuel. Son résultat doit être calculé en mémoire par l'API dans la V0 stateless ; il ne justifie pas une nouvelle table syntaxique.

Pour le mock exact, **aucune nouvelle table n'est indispensable**. En revanche, la génération automatique demande :

- d'alimenter les tables avec les formes, relations, traits et règles nécessaires ;
- de définir des conventions exécutables pour `pattern_rule` ;
- d'ajouter une lecture SQL par lot adaptée à `POST /analysis`.

## 1. Inventaire des enrichissements du mock

Le mock contient sept enrichissements, soit un exemple par tamis.

| ID | Tamis | Token | Type | Résultat principal |
|---|---:|---|---|---|
| `e-0001` | 1 | `organización` | `lexical_transparency` | `organización → organisation`, cognat fort |
| `e-0002` | 2 | `lenguas` | `pan_romance_family` | `lenguas / langues / lingue / línguas` |
| `e-0003` | 3 | `organización` | `form_correspondence` | `-ción → -tion`, forme confirmée `organisation` |
| `e-0004` | 4 | `científica` | `grapho_phonetic_signal` | signal `c` devant `i` |
| `e-0005` | 5 | `promueve` | `syntax_role` | rôle contextuel `verb` |
| `e-0006` | 6 | `comprender` | `morphosyntactic_signal` | infinitif probable en `-er` |
| `e-0007` | 7 | `organización` | `affix_signal` | suffixe `-ción` |

Les sept enrichissements contiennent aussi des champs communs :

- libellé ;
- explication ;
- prudence ;
- confiance ;
- niveau ;
- provenance ;
- payload propre au tamis.

## 2. Matrice de couverture SQL

| Enrichissement | Tables concernées | Couverture actuelle | Manque éventuel |
|---|---|---|---|
| Transparence `organización → organisation` | `language`, `lexical_entry`, `lexical_form`, `form_relation`, éventuellement `ic_feature` | Bonne structure pour les formes, langues, type de relation, score et confiance | Données absentes ; explication et prudence seulement en texte libre ; pas de lecture par lot ni filtre de langues dans les procédures |
| Famille pan-romane de `lenguas` | `language`, `lexical_entry`, `lexical_form`, éventuellement `form_relation` | Les formes peuvent partager un `entry_id` et être filtrées par langue | Données absentes ; `family_label` n'a pas de champ dédié ; ambiguïté entre pivot sémantique et famille lexicale |
| Correspondance `-ción → -tion` | `language`, `pattern_rule`, puis `lexical_form` et `form_relation` pour confirmer `organisation` | Les patrons, langues, description, fiabilité et exemples sont prévus | Aucune règle seedée ; sémantique d'application insuffisamment formalisée ; aucune procédure de lecture ; statut de validation absent |
| Signal grapho-phonique `c` devant `i` | `pattern_rule` en approximation, ou `ic_feature` sur une forme précise | Représentation partielle possible | Règle monolingue difficile avec cible obligatoire ; opérateur `contains` non structuré ; prudence et statut expérimental non structurés |
| Rôle syntaxique `promueve = verb` | `lexical_form.part_of_speech` comme indice lexical ; aucune table pour le rôle contextuel | Le lexique peut indiquer que le lemme est verbal, pas son rôle dans cette occurrence | Analyse contextuelle absente du SQL ; doit rester une heuristique en mémoire pour la V0 |
| Infinitif probable `comprender` | `lexical_form.part_of_speech`, `ic_feature`, éventuellement `pattern_rule` pour `-er` | Représentation partielle, suffisante comme entrée d'une heuristique API | Données absentes ; pas de catégorie de règle exécutable ni de procédure de lecture des traits |
| Suffixe `-ción` | `pattern_rule`, éventuellement `ic_feature` sur les formes connues | Bonne base si la règle `-ción → -tion` existe | Aucune règle seedée ; distinction préfixe/suffixe non normalisée ; affixe purement observé difficile si aucune cible n'existe |

## 3. Évaluation détaillée par tamis

### Tamis 1 : lexique international

#### Représentation possible

L'enrichissement peut être construit avec :

- `language` pour `es` et `fr` ;
- `lexical_form` pour `organización` et `organisation` ;
- `form_relation` avec `relation_type = COGNATE_STRONG` ;
- `form_relation.score` pour le niveau de proximité ;
- `form_relation.confidence_score` pour la confiance dans l'annotation ;
- `source_label` et `notes` pour la provenance et le commentaire.

`ic_feature` pourrait aussi stocker un trait de transparence, mais il ne doit pas remplacer la relation explicite entre les deux formes.

#### Informations manquantes

- Les lignes correspondantes ne sont pas présentes dans les seeds actuels du brouillon.
- La perspective « transparent pour un lecteur francophone » n'est pas portée par un champ dédié. La relation `es → fr` permet toutefois de la déduire pour la requête courante.
- `label`, `explanation` et `caution` ne sont pas structurés séparément.

#### Contournement V0

L'API peut produire le libellé générique à partir de `relation_type`, utiliser `notes` comme explication et ajouter une prudence générique côté service.

#### Couverture

**Bonne au niveau du schéma, nulle pour l'exemple exact tant que les données ne sont pas insérées.**

### Tamis 2 : lexique pan-roman

#### Représentation possible

Les quatre formes peuvent être rattachées à une même `lexical_entry` :

```text
es : lenguas
fr : langues
it : lingue
pt : línguas
```

L'API peut chercher la forme espagnole, récupérer son `entry_id`, puis charger les autres `lexical_form` de la même entrée dans les langues demandées.

Des `form_relation` peuvent préciser si les liens sont des cognats forts, faibles ou des équivalences partielles.

#### Informations manquantes

- Les formes du mock ne sont pas présentes dans les seeds actuels.
- Le champ `family_label` n'existe pas.
- `lexical_entry` est défini comme pivot sémantique, alors que `family_label` peut désigner un radical, une série pédagogique ou une famille historique.
- Aucune procédure actuelle ne charge toutes les formes d'une `lexical_entry`.

#### Contournement V0

Le payload `forms` peut être construit sans `family_label`. Le contrat le considère déjà comme facultatif et expérimental.

Si un libellé est utile, l'API peut employer temporairement `lexical_entry.entry_key`, `gloss_fr` ou `notes`, sans prétendre qu'il s'agit d'une famille étymologique formalisée.

#### Couverture

**Bonne pour la série de formes, partielle pour la notion de famille.**

### Tamis 3 : correspondances phonétiques

#### Représentation possible

`pattern_rule` prévoit directement :

- langues source et cible ;
- `source_pattern = ción` ;
- `target_pattern = tion` ;
- `pattern_type` ;
- description ;
- fiabilité ;
- exemples ;
- notes.

L'API applique la règle à `organización`, puis cherche si le résultat attendu correspond à une `lexical_form` française connue. Pour obtenir `organisation` plutôt qu'une simple substitution graphique incorrecte, la confirmation lexicale est essentielle.

#### Informations manquantes

- `pattern_rule` n'est pas alimentée par les seeds actuels.
- `pattern_type` n'a pas encore de vocabulaire contrôlé indiquant suffixe, préfixe, inclusion ou expression régulière.
- L'ordre ou la priorité entre règles n'est pas représenté.
- Aucun statut ne distingue une règle active d'une règle expérimentale ou rejetée.
- Aucune procédure ne lit `pattern_rule`.

#### Contournement V0

La V0 peut adopter une convention simple :

```text
pattern_type = SUFFIX_TRANSFORM
```

L'API applique uniquement les règles reconnues par son code, puis confirme la forme produite avec `lexical_form` ou `form_relation`.

#### Couverture

**Partielle mais proche du besoin ; la principale lacune est l'exécutabilité explicite des règles.**

### Tamis 4 : graphies et prononciations

#### Représentation possible

Deux approximations existent :

1. une `pattern_rule` pour le motif `ci` ;
2. un `ic_feature` attaché à `científica`.

La première est réutilisable, la seconde ne décrit que la forme connue.

#### Informations manquantes

- Le signal est essentiellement monolingue et ne possède pas nécessairement de `target_pattern` ou de langue cible.
- `pattern_rule.target_language_id` et `target_pattern` sont obligatoires.
- Le mode `contains` n'est pas un champ structuré.
- La comparaison phonétique n'a aucun champ spécifique ; le schéma représente surtout une transformation graphique.
- Le statut expérimental et la prudence ne sont pas séparés.

#### Contournement V0

Le mock utilise correctement `source.kind = heuristic`. L'API peut conserver une petite liste de phénomènes grapho-phoniques en code pour la V0, avec warning expérimental.

Stocker le signal comme `ic_feature` sur `científica` est possible mais peu mutualisable. Dupliquer une `pattern_rule` pour chaque langue de médiation est également possible, mais fragile.

#### Couverture

**Faible dans le schéma actuel ; heuristique API recommandée pour la V0.**

### Tamis 5 : syntaxe pan-romane

#### Représentation possible

`lexical_form.part_of_speech = VERB` peut indiquer que `promueve` est une forme verbale.

Cette donnée ne suffit pas à conclure que l'occurrence joue le rôle de noyau verbal dans la phrase. Le rôle syntaxique dépend du contexte et des autres tokens.

#### Informations manquantes

- aucune occurrence textuelle persistée ;
- aucune structure de phrase ;
- aucune dépendance syntaxique ;
- aucune règle contextuelle ;
- aucune confiance syntaxique issue d'un analyseur.

#### Contournement V0

La tokenisation et l'analyse syntaxique légère restent en mémoire dans l'API. Le résultat porte `source.kind = heuristic`, comme dans le mock.

Une nouvelle table syntaxique n'est pas nécessaire : le contrat V0 ne sauvegarde ni texte ni token.

#### Couverture

**Indice lexical partiel, résultat contextuel non représenté et volontairement non persisté.**

### Tamis 6 : morphosyntaxe

#### Représentation possible

Pour `comprender`, le service peut combiner :

- `lexical_form.lemma` et `normalized_lemma` ;
- `lexical_form.part_of_speech = VERB` ;
- un `ic_feature` tel que `INFINITIVE` ;
- une `pattern_rule` décrivant une finale `-er`.

#### Informations manquantes

- aucune donnée du mock dans les seeds actuels ;
- aucun vocabulaire contrôlé pour `feature_type` ;
- aucune lecture de `ic_feature` dans les procédures ;
- aucune règle exécutable explicitant que `-er` se trouve en fin de token ;
- aucune distinction entre trait lexical attesté et signal probable calculé.

#### Contournement V0

L'API peut reconnaître les finales espagnoles `-ar`, `-er` et `-ir`, puis augmenter sa confiance lorsqu'une `lexical_form` connue possède `part_of_speech = VERB`.

Le payload reste un résultat calculé ; il n'a pas à être inséré comme nouvelle ligne à chaque analyse.

#### Couverture

**Partielle ; suffisante pour soutenir une heuristique API explicable.**

### Tamis 7 : préfixes et suffixes

#### Représentation possible

La même `pattern_rule` que pour le tamis 3 peut produire deux enrichissements :

- tamis 3 : transformation `-ción → -tion` ;
- tamis 7 : observation du suffixe source `-ción`.

Cette réutilisation évite de dupliquer la connaissance linguistique.

#### Informations manquantes

- aucune règle présente dans les seeds ;
- distinction préfixe/suffixe non normalisée ;
- règle purement observationnelle difficile si aucune cible n'existe ;
- aucune procédure de lecture.

#### Contournement V0

`pattern_type = SUFFIX_TRANSFORM` permet à l'API de déduire `affix_type = suffix`. Pour un simple signal sans transformation, l'API peut conserver provisoirement une heuristique en code.

#### Couverture

**Bonne si le suffixe participe à une correspondance ; partielle pour les affixes purement observationnels.**

## 4. Champs communs du contrat

### `label`

Le schéma ne stocke pas de libellé API pour chaque type. L'API peut le générer à partir de :

- `relation_type` ;
- `feature_type` ;
- `pattern_type`.

Ce choix est préférable à l'ajout immédiat de libellés répétés dans toutes les tables.

### `explanation`

Sources actuelles possibles :

- `form_relation.notes` ;
- `lexical_form.notes` ;
- `ic_feature.notes` ;
- `pattern_rule.description`.

### `caution`

Aucun champ dédié n'existe. `notes` peut servir provisoirement, mais il mélange alors commentaire interne, explication et prudence.

La V0 peut aussi utiliser des prudences génériques définies par type d'enrichissement dans l'API.

### `confidence`

Sources actuelles :

- `lexical_form.confidence_score` ;
- `form_relation.confidence_score` ;
- `ic_feature.confidence_score` ;
- `pattern_rule.reliability_score`.

La correspondance est satisfaisante, même si les notions de confiance et de fiabilité restent à stabiliser.

### `level`

L'API peut dériver `strong`, `partial` ou `informational` depuis :

- `relation_type` ;
- `score` ;
- `pattern_type` ;
- des seuils applicatifs provisoires.

### `source`

Les tables lexicales et relationnelles possèdent `source_label`. `pattern_rule` n'en possède pas.

L'identifiant primaire de la ligne peut alimenter `source.id`. La valeur `source.kind = heuristic` reste réservée aux calculs en mémoire.

## 5. Limites des procédures actuelles

Le schéma représente davantage que les procédures ne savent lire.

### Relations lexicales

- `sp_get_all_relations` recherche un lemme sans langue source, mais traite les deux directions.
- `sp_get_cognates` ne traite qu'une direction et ne filtre pas explicitement les types `COGNATE_*`.
- `sp_get_false_friends` ne traite qu'une direction.
- aucune de ces procédures ne reçoit la langue de médiation ou la liste des langues de comparaison.
- les notes, confiances et identifiants nécessaires à la provenance ne sont pas renvoyés.

### Similarité

`sp_get_similarity` utilise seulement égalité et inclusion de chaînes. Elle ne suffit pas à produire la transparence pédagogique du tamis 1.

### Entrées, traits et règles

Aucune procédure ne permet actuellement :

- de charger toutes les formes d'une `lexical_entry` ;
- de lire les `ic_feature` d'une liste de formes ;
- de lire les `pattern_rule` pour une paire de langues ;
- d'analyser un lot de tokens.

### Conséquence

L'API V0 devra soit effectuer des requêtes de lecture directes, soit s'appuyer plus tard sur de nouvelles procédures de lecture par lot. Cela ne nécessite aucune nouvelle table.

## 6. Capacité du schéma et état réel des données

Une recherche complémentaire dans `20_seed_base.sql` et `30_seed_experimental.sql` ne trouve pas les formes ou règles utilisées par le mock :

- `organización` / `organisation` ;
- `lenguas` / `langues` / `lingue` / `línguas` ;
- `promueve` ;
- `científica` ;
- `comprender` / `comprendere` / `compreender` ;
- règle `-ción → -tion`.

Le mock illustre donc des données que le schéma peut en partie accueillir, mais que la base consolidée actuelle ne contient pas encore.

Cette distinction est essentielle : une API branchée aujourd'hui sur les seuls seeds ne reproduirait pas le paquet mock.

## 7. Ajouts minimaux au schéma

### Niveau 0 : aucun ajout obligatoire pour le premier prototype API

Pour une première génération automatique exploratoire, le schéma peut rester inchangé si :

- les enrichissements lexicaux sont alimentés dans les tables existantes ;
- `pattern_type` reçoit un petit vocabulaire contrôlé ;
- les tamis 4 à 6 restent des heuristiques en mémoire ;
- `notes` porte provisoirement les explications ou prudences ;
- l'API génère les libellés et warnings.

Ce niveau est le plus prudent pour Seven Sieves comme premier client.

### Niveau 1 : ajustements minimaux lorsque les règles deviennent pilotées par les données

Si l'objectif suivant est de sortir les heuristiques de l'API et de les administrer, les ajustements les plus petits seraient :

#### 1. Mode d'application de `pattern_rule`

Ajouter une information structurée indiquant comment chercher `source_pattern` :

```text
PREFIX
SUFFIX
CONTAINS
REGEX
EXACT
```

Nom de travail possible : `match_scope` ou `match_mode`.

Sans ajout de colonne, ces valeurs peuvent d'abord être encodées dans `pattern_type`. Une colonne séparée ne devient utile que si `pattern_type` doit aussi distinguer phonétique, graphique et morphologique.

#### 2. Statut d'utilisation de la règle

Ajouter un statut minimal, par exemple :

```text
EXPERIMENTAL
ACTIVE
DISABLED
```

Cela permettrait à l'API de ne pas appliquer silencieusement toute ligne de `pattern_rule` et d'alimenter le statut ou les warnings du tamis.

Nom de travail possible : `validation_status`.

#### 3. Autoriser les signaux sans cible

Pour les phénomènes comme `c` devant `i`, envisager que `target_language_id` et `target_pattern` puissent être absents.

Il s'agit d'un ajustement de nullabilité, pas d'une nouvelle table. Il évite de créer de fausses transformations ou de dupliquer une règle monolingue pour chaque langue de médiation.

### Niveau 2 : ajouts utiles mais différables

Les champs suivants amélioreraient la qualité, mais ne sont pas nécessaires pour brancher Seven Sieves :

- `caution` sur `pattern_rule`, sinon utilisation de `notes` ;
- `source_label` sur `pattern_rule`, pour homogénéiser la provenance ;
- priorité d'application des règles ;
- code stable de règle ;
- localisation multilingue des explications.

Ils doivent attendre un besoin observé dans l'API réelle.

## 8. Ce qu'il ne faut pas ajouter pour la V0

Le besoin actuel ne justifie pas :

- une table d'activité ;
- une table de texte ;
- une table de tokens ;
- une table d'enrichissements calculés ;
- une table d'annotations enseignantes ;
- une table de sessions apprenantes ;
- une table syntaxique complète ;
- une table différente pour chacun des sept tamis.

Tokens, enrichissements, compteurs et warnings sont construits en mémoire pour chaque `POST /analysis` puis renvoyés au client.

## 9. Priorités proposées

1. Alimenter les formes et relations nécessaires aux tamis 1 et 2.
2. Ajouter quelques règles `pattern_rule` contrôlées pour les tamis 3 et 7.
3. Écrire des requêtes de lecture par lot pour les tokens, langues, relations, traits et règles.
4. Produire les champs communs du contrat dans la couche API.
5. Maintenir les tamis 4, 5 et 6 comme expérimentaux et explicites.
6. Observer les limites réelles avant tout ajout au schéma.
7. Envisager ensuite seulement le mode d'application, le statut et la nullabilité des règles.

## 10. Divergence documentaire observée

Le mock corrigé contient :

```text
organización → organisation
```

L'exemple du tamis 3 dans `api-analysis-contract-v0.md` contient encore :

```text
organización → organization
```

Cette divergence n'a pas été modifiée dans le cadre de cette tâche. La forme du mock doit servir de référence pour l'intégration française actuelle, car une substitution mécanique ne suffit pas : la forme cible doit être confirmée par le lexique.

## Conclusion

Le modèle SQL actuel constitue une base suffisante pour commencer l'API V0 sans nouvelle table. Sa couverture est forte pour le lexique, raisonnable pour les correspondances et insuffisante pour les analyses contextuelles, qui doivent rester calculées en mémoire.

Le premier obstacle n'est pas la structure relationnelle. Il s'agit de l'absence des données du mock, de règles exécutables clairement typées et de lectures SQL par lot adaptées au contrat.

La stratégie la plus prudente consiste donc à enrichir les tables existantes et construire la couche d'analyse avant d'ajouter au schéma. Les premiers ajustements structurels ne devraient concerner `pattern_rule` qu'après observation des besoins réels de Seven Sieves Explorer.
