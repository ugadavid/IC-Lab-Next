# Plan d'implémentation de `POST /analysis` V0

## Statut et périmètre

Ce document prépare l'implémentation réelle de `POST /analysis` à partir du modèle SQL actuel.

Il ne crée ni API, ni table, ni procédure, ni seed. Il décrit un premier algorithme stateless destiné prioritairement à Seven Sieves Explorer.

Principes retenus :

- une requête contient le texte et tous ses paramètres ;
- aucune donnée de requête ou de réponse n'est persistée ;
- les lectures SQL sont faites par lot ;
- les connaissances lexicales viennent de Dico-IC ;
- les analyses contextuelles légères restent dans l'API ;
- la réponse respecte `contract_version = 0.1` ;
- une transformation graphique n'est jamais présentée comme un mot attesté sans confirmation lexicale.

## 1. Vue d'ensemble de l'algorithme

```text
1. Valider la requête
2. Tokeniser le texte et calculer les offsets UTF-16
3. Normaliser les tokens
4. Charger et valider les langues
5. Charger les lexical_form de la langue source par lot
6. Charger les lexical_entry correspondantes
7. Charger les formes apparentées dans les langues demandées
8. Charger les form_relation et ic_feature utiles
9. Charger les pattern_rule applicables
10. Construire les index en mémoire
11. Générer les enrichments des sept tamis
12. Calculer les statuts de tamis, compteurs et warnings
13. Sérialiser le paquet JSON
```

Le nombre de requêtes SQL doit rester globalement constant pour une analyse courte, indépendamment du nombre de tokens. Les listes trop longues peuvent être découpées en blocs sans changer l'algorithme.

## 2. Validation de la requête

### Entrée attendue

```json
{
  "contract_version": "0.1",
  "text": "La organización internacional...",
  "source_language": "es",
  "mediation_language": "fr",
  "comparison_languages": ["it", "pt"],
  "sieves": [1, 2, 3, 4, 5, 6, 7]
}
```

### Contrôles bloquants

Renvoyer une erreur avant tout accès lexical si :

- le corps n'est pas un objet JSON ;
- `contract_version` est absent ou différent de `0.1` ;
- `text` n'est pas une chaîne ou ne contient aucun caractère utile ;
- `source_language` ou `mediation_language` n'est pas une chaîne ;
- `comparison_languages` n'est pas un tableau de chaînes ;
- `sieves` n'est pas un tableau d'entiers compris entre `1` et `7` ;
- le texte dépasse la limite V0 annoncée.

Statuts recommandés :

- `400` pour une forme de requête invalide ;
- `413` pour un texte trop long ;
- `422` pour une langue principale inexistante ou inactive.

### Valeurs par défaut

- `comparison_languages = []` ;
- `sieves = [1, 2, 3, 4, 5, 6, 7]`.

### Nettoyage non bloquant

- conserver l'ordre des langues de comparaison ;
- supprimer les doublons ;
- ignorer la langue source si elle apparaît dans les comparaisons ;
- ignorer une langue de comparaison inconnue ou inactive avec warning ;
- dédupliquer les tamis.

La langue source et la langue de médiation ne doivent pas être ignorées silencieusement.

## 3. Tokenisation et offsets UTF-16

### Stratégie V0

Pour rester compatible avec le mock et le client actuel, la V0 renvoie uniquement les tokens de type `word`. Les espaces, retours à la ligne et ponctuations restent dans les intervalles entre tokens et sont reconstruits par Seven Sieves.

Patron de départ :

```regex
\p{L}+(?:[’']\p{L}+)*
```

Ce patron reconnaît les suites de lettres Unicode et les apostrophes internes simples. Les nombres, mots avec tirets et cas particuliers devront être ajoutés seulement après observation de textes réels.

### Offsets

Pour chaque occurrence :

```text
index
kind = word
surface
normalized
start
end
enrichments = []
```

`start` est inclusif et `end` exclusif.

Ils sont exprimés en unités UTF-16, avec l'invariant :

```javascript
text.slice(start, end) === surface
```

Si l'API est écrite en JavaScript, les index de chaîne sont déjà compatibles. Dans un autre langage, l'offset doit être converti en nombre d'unités UTF-16, pas en octets UTF-8 ni seulement en points de code Unicode.

### Contrôle interne

Avant la réponse, vérifier pour tous les tokens :

- index continus depuis zéro ;
- offsets croissants et non chevauchants ;
- égalité exacte entre `surface` et la tranche du texte ;
- `enrichments` toujours présent comme tableau.

## 4. Normalisation des tokens

Le contrat et les seeds actuels utilisent implicitement deux besoins différents.

### Normalisation exposée au client

Le champ `token.normalized` reste proche du texte :

1. normalisation Unicode NFC ;
2. passage en minuscules ;
3. conservation des diacritiques.

Exemple :

```text
Organización → organización
```

Cette convention correspond au mock actuel.

### Clé interne de recherche SQL

Les seeds retirent généralement les diacritiques de `normalized_lemma` :

```text
organización → organizacion
información  → informacion
nación       → nacion
```

L'API doit donc calculer une clé interne non renvoyée, par exemple `lookup_key` :

1. partir de `token.normalized` ;
2. décomposer en NFD ;
3. retirer les marques diacritiques ;
4. recomposer si nécessaire ;
5. conserver les lettres et apostrophes attendues.

Cette séparation évite de changer immédiatement le contrat ou les données existantes.

### Limite

La suppression de diacritiques n'est pas linguistiquement neutre. Elle sert seulement de convention de recherche V0. Les collisions possibles doivent être conservées comme plusieurs candidats et non résolues avec `LIMIT 1`.

## 5. Chargement des langues

Une seule requête charge toutes les langues demandées.

```sql
SELECT
    id,
    code,
    name,
    family,
    is_romance,
    is_active
FROM language
WHERE code IN (?, ?, ?, ...);
```

L'API construit ensuite :

```text
languageByCode
requestedLanguageCodes
targetLanguageCodes = médiation + comparaisons valides
```

Règles :

- source absente ou inactive : erreur `422` ;
- médiation absente ou inactive : erreur `422` ;
- comparaison absente ou inactive : suppression et warning `COMPARISON_LANGUAGE_IGNORED`.

## 6. Lecture par lot des formes lexicales source

### Préparation

Extraire les `lookup_key` distinctes de tous les tokens de type `word`.

### Requête

```sql
SELECT
    lf.id,
    lf.entry_id,
    lf.language_id,
    lf.lemma,
    lf.normalized_lemma,
    lf.part_of_speech,
    lf.gender,
    lf.number_behavior,
    lf.register_label,
    lf.source_label,
    lf.confidence_score,
    lf.notes,
    l.code AS language_code
FROM lexical_form lf
JOIN language l ON l.id = lf.language_id
WHERE l.code = ?
  AND lf.normalized_lemma IN (?, ?, ?, ...);
```

Le nombre de valeurs `IN` doit être borné et découpé en blocs si nécessaire.

### Index en mémoire

```text
sourceFormsByLookupKey : lookup_key → lexical_form[]
sourceFormById         : id → lexical_form
sourceEntryIds         : Set<entry_id>
```

Une clé peut renvoyer plusieurs formes. L'API ne doit pas sélectionner arbitrairement la première.

## 7. Lecture des entrées et formes apparentées

### Entrées lexicales

```sql
SELECT
    id,
    entry_key,
    gloss_fr,
    gloss_en,
    semantic_domain,
    notes
FROM lexical_entry
WHERE id IN (?, ?, ?, ...);
```

Index :

```text
entryById : id → lexical_entry
```

### Formes des langues demandées

```sql
SELECT
    lf.id,
    lf.entry_id,
    lf.lemma,
    lf.normalized_lemma,
    lf.part_of_speech,
    lf.source_label,
    lf.confidence_score,
    lf.notes,
    l.code AS language_code,
    l.is_romance
FROM lexical_form lf
JOIN language l ON l.id = lf.language_id
WHERE lf.entry_id IN (?, ?, ?, ...)
  AND l.code IN (?, ?, ?, ...);
```

Les codes comprennent la source, la médiation et les comparaisons valides.

Index :

```text
formsByEntryAndLanguage : entry_id → language_code → lexical_form[]
relatedFormById         : id → lexical_form
```

Cette lecture alimente principalement le tamis 2 et sert à confirmer les cibles du tamis 3.

## 8. Lecture par lot des relations

### Identifiants concernés

Utiliser les IDs des formes source reconnues et, si utile, des formes apparentées chargées.

### Requête

```sql
SELECT
    fr.id,
    fr.source_form_id,
    fr.target_form_id,
    fr.relation_type,
    fr.score,
    fr.is_symmetric,
    fr.source_label,
    fr.confidence_score,
    fr.notes,
    sf.lemma AS source_lemma,
    sf.normalized_lemma AS source_normalized_lemma,
    sl.code AS source_language_code,
    tf.lemma AS target_lemma,
    tf.normalized_lemma AS target_normalized_lemma,
    tl.code AS target_language_code
FROM form_relation fr
JOIN lexical_form sf ON sf.id = fr.source_form_id
JOIN language sl ON sl.id = sf.language_id
JOIN lexical_form tf ON tf.id = fr.target_form_id
JOIN language tl ON tl.id = tf.language_id
WHERE (
        fr.source_form_id IN (?, ?, ?, ...)
        OR fr.target_form_id IN (?, ?, ?, ...)
      )
  AND sl.code IN (?, ?, ?, ...)
  AND tl.code IN (?, ?, ?, ...);
```

### Direction

Pour une forme de token :

- relation trouvée comme source : utilisable ;
- relation trouvée comme cible avec `is_symmetric = 1` : inverser la vue dans le payload ;
- relation trouvée comme cible avec `is_symmetric = 0` : ne pas l'inverser.

Cette logique est nécessaire car les seeds existants utilisent souvent le français comme forme source, alors que le texte analysé peut être espagnol.

### Index

```text
relationsByFormId : form_id → relation[]
```

## 9. Lecture des traits IC

Même si elle n'était pas explicitement exigée dans la liste initiale, cette lecture peut enrichir le tamis 1.

```sql
SELECT
    id,
    form_id,
    feature_type,
    value_num,
    value_text,
    source_label,
    confidence_score,
    notes
FROM ic_feature
WHERE form_id IN (?, ?, ?, ...);
```

Index :

```text
featuresByFormId : form_id → ic_feature[]
```

Vocabulaire V0 reconnu au minimum :

- `TRANSPARENCY_SCORE` ;
- `FALSE_FRIEND_RISK`.

Les autres valeurs restent ignorées avec prudence tant qu'elles ne sont pas documentées.

## 10. Lecture des règles applicables

### Requête

```sql
SELECT
    pr.id,
    pr.pattern_type,
    pr.source_pattern,
    pr.target_pattern,
    pr.description,
    pr.reliability_score,
    pr.examples,
    pr.notes,
    sl.code AS source_language_code,
    tl.code AS target_language_code
FROM pattern_rule pr
JOIN language sl ON sl.id = pr.source_language_id
JOIN language tl ON tl.id = pr.target_language_id
WHERE sl.code = ?
  AND tl.code IN (?, ?, ?, ...);
```

### Convention V0 sans changement de schéma

L'API ne doit exécuter que les valeurs de `pattern_type` qu'elle connaît explicitement.

Pour reproduire le mock, la valeur minimale est :

```text
SUFFIX_TRANSFORM
```

Règle d'exécution :

```text
si token.lookup_key se termine par source_pattern normalisé
alors produire un candidat brut en remplaçant le suffixe par target_pattern
```

Une valeur inconnue de `pattern_type` n'est pas exécutée et peut produire `RULE_APPLICATION_LIMITED`.

## 11. Index de travail en mémoire

Avant de générer les enrichissements, construire :

```text
tokenByIndex
tokensByLookupKey
languageByCode
sourceFormsByLookupKey
entryById
formsByEntryAndLanguage
formsById
relationsByFormId
featuresByFormId
rulesByTargetLanguage
```

Ces index évitent les requêtes à l'intérieur de la boucle des tokens.

## 12. Génération des enrichissements par tamis

### Tamis 1 : `lexical_transparency`

Source : **DB**.

Pour chaque token reconnu :

1. récupérer ses formes source candidates ;
2. chercher une relation vers la langue de médiation ;
3. accepter en V0 `COGNATE_STRONG` et `COGNATE_WEAK` ;
4. choisir la relation au score le plus élevé si plusieurs cibles équivalentes existent ;
5. construire le payload avec les lemmes attestés ;
6. dériver `level` depuis `relation_type` ;
7. utiliser `confidence_score`, puis `score` comme repli ;
8. utiliser `notes` ou un texte générique pour l'explication et la prudence.

Exemple attendu :

```json
{
  "source_form": "organización",
  "mediation_form": "organisation",
  "mediation_language": "fr",
  "relation_type": "COGNATE_STRONG"
}
```

Un `TRANSPARENCY_SCORE` peut compléter la confiance, mais ne remplace pas la relation attestée.

### Tamis 2 : `pan_romance_family`

Source : **DB**.

Pour chaque forme source reconnue :

1. prendre son `entry_id` ;
2. charger les formes de la source, médiation et comparaisons ;
3. conserver uniquement les langues demandées ;
4. exiger au minimum la forme source et une autre forme romane ;
5. ordonner les formes : source, médiation, puis ordre des comparaisons ;
6. produire un seul enrichissement par token et entrée ;
7. calculer une confiance conservatrice depuis les formes ou relations disponibles.

`family_label` reste facultatif. La V0 peut :

- l'omettre ; ou
- le construire par concaténation des lemmes ; ou
- utiliser prudemment `lexical_entry.notes`.

Elle ne doit pas présenter automatiquement `entry_key` comme une famille étymologique.

### Tamis 3 : `form_correspondence`

Source : **mixte DB + calcul API**.

Pour chaque token et règle `SUFFIX_TRANSFORM` applicable :

1. vérifier le suffixe source ;
2. produire un candidat graphique brut ;
3. rechercher une forme cible attestée dans la langue cible, reliée à la forme source ou partageant son `entry_id` ;
4. vérifier que sa clé normalisée est compatible avec `target_pattern` ;
5. utiliser le lemme attesté comme `payload.transformed` ;
6. construire l'explication depuis `pattern_rule.description` ;
7. utiliser `reliability_score` comme confiance.

Cas important :

```text
substitution brute : organización → organization
forme attestée FR  : organisation
```

La V0 doit renvoyer `organisation`. Si aucune forme cible attestée n'est trouvée, elle ne publie pas le candidat comme mot français certain. Elle peut soit ne rien renvoyer, soit produire plus tard un enrichissement explicitement marqué comme hypothèse.

### Tamis 4 : `grapho_phonetic_signal`

Source : **heuristique API** en V0.

Implémenter uniquement un petit catalogue explicite par langue source. Pour reproduire le mock espagnol :

```text
c devant e/i → signal grapho-phonique expérimental
```

La détection peut partir d'un patron comme :

```regex
c[eiéí]
```

Le résultat porte :

- `source.kind = heuristic` ;
- `status = experimental` pour le tamis ;
- une prudence générique ;
- une confiance modérée.

Ne pas lire ou écrire `pattern_rule` pour ce tamis dans la première implémentation.

### Tamis 5 : `syntax_role`

Source : **mixte**, avec connaissance lexicale DB et décision contextuelle API.

V0 limitée :

- si une forme reconnue a `part_of_speech = verb`, produire `role = verb` ;
- ne pas prétendre analyser automatiquement sujet et complément ;
- conserver un statut expérimental ;
- réduire la confiance si plusieurs analyses lexicales sont possibles.

Pour `promueve`, le seed expérimental fournit une forme verbale et l'API produit le rôle probable.

Cette approche ne constitue pas un analyseur syntaxique général.

### Tamis 6 : `morphosyntactic_signal`

Source : **mixte DB + heuristique API**.

Pour l'espagnol :

1. vérifier si le token se termine par `-ar`, `-er` ou `-ir` ;
2. chercher une forme DB avec `part_of_speech = verb` ;
3. si les deux signaux concordent, produire `probable_infinitive` avec confiance élevée ;
4. si seule la terminaison correspond, soit ne rien produire, soit produire une confiance faible et un warning expérimental.

Pour reproduire le mock, `comprender` doit être reconnu comme verbe dans la DB et se terminer par `-er`.

La règle `-er` n'a pas besoin d'être ajoutée à `pattern_rule` en V0 : elle est monolingue, morphosyntaxique et sans transformation cible.

### Tamis 7 : `affix_signal`

Source : **mixte**, règle DB appliquée par l'API.

Réutiliser les règles `SUFFIX_TRANSFORM` déjà chargées :

1. si `source_pattern` correspond à la fin du token ;
2. produire `affix_type = suffix` ;
3. utiliser `source_pattern` comme `affix` ;
4. reprendre description, fiabilité et provenance de la règle.

La même connaissance `-ción → -tion` alimente ainsi les tamis 3 et 7 sans duplication.

## 13. Classification des sept tamis

| Tamis | Source V0 | Statut conseillé | Commentaire |
|---:|---|---|---|
| 1 | DB | `available` | Formes et relations attestées |
| 2 | DB | `available` | Formes partageant une entrée lexicale |
| 3 | Mixte | `available` ou `experimental` | Règle DB, application et confirmation dans l'API |
| 4 | Heuristique API | `experimental` | Petit catalogue grapho-phonique en code |
| 5 | Mixte | `experimental` | POS en DB, rôle probable calculé |
| 6 | Mixte | `experimental` | POS en DB et terminaison calculée |
| 7 | Mixte | `available` | Patron DB détecté par l'API |

La présence de zéro résultat ne rend pas un tamis `unsupported`. Le statut décrit la capacité du moteur, pas la quantité de correspondances dans le texte.

## 14. Génération des warnings

### Warnings de requête

- `COMPARISON_LANGUAGE_IGNORED` : doublon, langue source répétée, langue inconnue ou inactive ;
- `LANGUAGE_NOT_COVERED` : langue valide mais très peu couverte par le lexique ou les règles.

### Warnings de moteur

- `SIEVE_EXPERIMENTAL` pour les tamis 4, 5 et 6 lorsqu'ils sont demandés ;
- `SIEVE_UNSUPPORTED` si aucune implémentation n'existe pour la langue source ;
- `RULE_APPLICATION_LIMITED` si des `pattern_type` inconnus sont rencontrés ;
- `PARTIAL_LEXICAL_COVERAGE` si une faible proportion des tokens est reconnue.

### Warnings internes proposés

Le contrat peut être étendu sans rupture avec des codes plus précis :

- `AMBIGUOUS_LEXICAL_MATCH` lorsqu'une clé retourne plusieurs formes impossibles à départager ;
- `UNCONFIRMED_TRANSFORMATION` lorsqu'une règle produit une chaîne sans forme cible attestée.

Ces warnings ne doivent pas être produits une fois par occurrence si cela surcharge la réponse. Un warning d'analyse avec un compteur et quelques indices de tokens suffit.

### Statut global

- `complete` si tous les tamis demandés disposent d'une implémentation, même expérimentale ;
- `partial` si un tamis demandé est `unsupported` ou si une étape essentielle a été omise ;
- une absence normale de correspondance ne rend pas la réponse partielle.

## 15. Assemblage de la réponse

Après génération :

1. attribuer des IDs locaux `e-0001`, `e-0002`, etc. ;
2. trier les enrichissements d'un token par `sieve_id`, puis confiance décroissante ;
3. calculer `result_count` de chaque tamis ;
4. inclure une entrée pour chaque tamis demandé ;
5. conserver le texte reçu à l'identique ;
6. renvoyer les langues effectivement utilisées ;
7. vérifier les invariants d'offset ;
8. sérialiser en UTF-8.

Les IDs d'enrichissement n'ont aucune persistance au-delà de la réponse.

## 16. Pseudocode complet

```text
function analyze(request):
    validated = validateShapeAndDefaults(request)
    tokens = tokenizeWithUtf16Offsets(validated.text)

    for token in tokens:
        token.normalized = normalizeForClient(token.surface)
        token.lookup_key = normalizeForDatabase(token.normalized)
        token.enrichments = []

    languages, languageWarnings = loadLanguages(validated.languageCodes)
    validatePrimaryLanguages(languages)

    sourceForms = loadSourceForms(
        sourceLanguage,
        distinct(tokens.lookup_key)
    )

    entries = loadEntries(distinct(sourceForms.entry_id))
    relatedForms = loadRelatedForms(
        distinct(sourceForms.entry_id),
        effectiveLanguageCodes
    )

    relations = loadRelations(
        distinct(sourceForms.id + relatedForms.id),
        effectiveLanguageCodes
    )

    features = loadFeatures(distinct(sourceForms.id))
    rules = loadRules(sourceLanguage, targetLanguageCodes)

    indexes = buildIndexes(
        sourceForms,
        entries,
        relatedForms,
        relations,
        features,
        rules
    )

    for token in tokens:
        if sieve 1 requested:
            token.enrichments += buildTransparency(token, indexes)
        if sieve 2 requested:
            token.enrichments += buildPanRomanceFamily(token, indexes)
        if sieve 3 requested:
            token.enrichments += buildConfirmedCorrespondences(token, indexes)
        if sieve 4 requested:
            token.enrichments += buildGraphyHeuristics(token, sourceLanguage)
        if sieve 5 requested:
            token.enrichments += buildProbableVerbRole(token, indexes)
        if sieve 6 requested:
            token.enrichments += buildMorphosyntaxSignals(token, indexes)
        if sieve 7 requested:
            token.enrichments += buildAffixSignals(token, indexes)

    warnings = languageWarnings
             + buildCoverageWarnings(tokens, indexes)
             + buildSieveWarnings(requestedSieves, sourceLanguage, rules)

    return assembleContractV01(
        originalText,
        effectiveLanguages,
        sieveMetadata,
        tokens without lookup_key,
        warnings
    )
```

## 17. Données minimales du seed expérimental

Ces données doivent être ajoutées plus tard dans un nouveau bloc expérimental, sans modifier les seeds existants.

### Entrée 1 : organisation

Clé de travail possible :

```text
ORGANIZATION_ENTITY
```

Formes minimales :

| Langue | Lemma | `normalized_lemma` | POS |
|---|---|---|---|
| `es` | `organización` | `organizacion` | `noun` |
| `fr` | `organisation` | `organisation` | `noun` |

Relation minimale :

```text
COGNATE_STRONG, symmetric = true
```

Pour rester cohérent avec les seeds actuels, la relation peut être enregistrée `fr → es`. L'API doit la lire dans les deux sens grâce à `is_symmetric`.

### Entrée 2 : langue, formes plurielles du mock

Clé de travail possible :

```text
LANGUAGE_SYSTEM
```

| Langue | Lemma | `normalized_lemma` | POS |
|---|---|---|---|
| `es` | `lenguas` | `lenguas` | `noun` |
| `fr` | `langues` | `langues` | `noun` |
| `it` | `lingue` | `lingue` | `noun` |
| `pt` | `línguas` | `linguas` | `noun` |

Le modèle appelle `lemma` ce champ, mais le mock utilise des formes fléchies au pluriel. Pour reproduire le prototype sans lemmatiseur, le seed minimal doit stocker les surfaces plurielles exactes. Cette concession doit être documentée comme expérimentale.

Des relations `COGNATE_STRONG` ou `COGNATE_WEAK` entre le français et les autres formes améliorent le score, mais le partage de `entry_id` suffit pour construire le payload du tamis 2.

### Entrée 3 : scientifique

Clé de travail possible :

```text
SCIENTIFIC_PROPERTY
```

| Langue | Lemma | `normalized_lemma` | POS |
|---|---|---|---|
| `es` | `científica` | `cientifica` | `adjective` |

Cette ligne n'est pas strictement nécessaire à l'heuristique du tamis 4, mais elle permet de reconnaître la forme et de conserver une provenance lexicale.

### Entrée 4 : promouvoir

Clé de travail possible :

```text
PROMOTE_ACTION
```

| Langue | Lemma | `normalized_lemma` | POS |
|---|---|---|---|
| `es` | `promueve` | `promueve` | `verb` |

Comme `lenguas`, `promueve` est une forme fléchie. Elle est stockée telle quelle pour reproduire le mock sans analyse morphologique générale.

### Entrée 5 : comprendre

Clé de travail possible :

```text
UNDERSTAND_COMPREHEND
```

| Langue | Lemma | `normalized_lemma` | POS |
|---|---|---|---|
| `es` | `comprender` | `comprender` | `verb` |
| `fr` | `comprendre` | `comprendre` | `verb` |
| `it` | `comprendere` | `comprendere` | `verb` |
| `pt` | `compreender` | `compreender` | `verb` |

Les relations entre le français et les autres langues sont utiles pour les tamis 1 ou 2, mais le tamis 6 exige seulement que `comprender` soit reconnu comme verbe.

### Règle `-ción → -tion`

Ligne `pattern_rule` minimale :

| Champ | Valeur de travail |
|---|---|
| source | `es` |
| cible | `fr` |
| `pattern_type` | `SUFFIX_TRANSFORM` |
| `source_pattern` | `cion` ou `ción`, selon la convention décidée |
| `target_pattern` | `tion` |
| `description` | Correspondance fréquente entre finales espagnoles et françaises |
| `reliability_score` | valeur expérimentale autour de `0.85` |
| `examples` | `organización → organisation` |
| `notes` | Utiliser une forme lexicale attestée comme sortie finale |

La comparaison des patrons doit employer la même normalisation que `lookup_key`. Si les règles sont stockées avec accents, l'API les normalise avant application. Stocker directement `cion` simplifie la V0 mais rend l'affichage moins fidèle ; le payload peut continuer à afficher `-ción` à partir du token ou des exemples.

### Règle `-er` infinitif

Recommandation V0 : **ne pas l'ajouter à `pattern_rule`**.

Raisons :

- signal monolingue ;
- aucune cible de transformation ;
- `target_language_id` et `target_pattern` sont obligatoires ;
- l'heuristique est simple et doit être confirmée par `part_of_speech = verb`.

Elle reste donc dans le code API jusqu'à ce que le modèle des règles monolingues soit réellement nécessaire.

## 18. Mode d'insertion futur des données

Les données lexicales peuvent utiliser les procédures existantes :

- `sp_upsert_lexical_entry` ;
- `sp_upsert_lexical_form` ;
- `sp_insert_form_relation`.

Points de prudence :

- `sp_insert_form_relation` n'est pas idempotente ;
- les recherches par `normalized_lemma` utilisent `LIMIT 1` ;
- aucune procédure n'insère ou ne met à jour `pattern_rule` ;
- la règle devra être insérée directement de manière contrôlée ou attendre une procédure dédiée ultérieure.

Le futur seed doit rester séparé et explicitement expérimental.

## 19. Ordre d'implémentation recommandé

1. Écrire et tester la tokenisation et les offsets UTF-16 sans base.
2. Implémenter la validation et le chargement des langues.
3. Implémenter la lecture par lot de `lexical_form`.
4. Ajouter les données minimales du mock dans un futur seed expérimental.
5. Implémenter les entrées apparentées et le tamis 2.
6. Implémenter les relations bidirectionnelles et le tamis 1.
7. Ajouter la règle `-ción → -tion` puis les tamis 3 et 7.
8. Ajouter les heuristiques limitées des tamis 4, 5 et 6.
9. Générer warnings, compteurs et statuts.
10. Comparer la réponse réelle au mock avec un test de contrat.
11. Brancher Seven Sieves sur `POST /analysis` en conservant le fallback mock pendant l'expérimentation.

## 20. Tests minimaux à prévoir

### Validation

- version de contrat incorrecte ;
- texte vide ;
- langue source inconnue ;
- comparaison dupliquée ;
- tamis invalide ;
- texte trop long.

### Unicode et tokens

- accents espagnols et portugais ;
- apostrophes ;
- emoji avant un token pour vérifier les unités UTF-16 ;
- ponctuation accolée ;
- retours à la ligne ;
- reconstruction exacte du texte.

### SQL

- token absent du lexique ;
- plusieurs formes pour la même clé ;
- relation symétrique lue à l'envers ;
- relation non symétrique non inversée ;
- entrée avec plusieurs langues ;
- règle sans forme cible attestée.

### Contrat

- sept entrées de tamis ;
- `result_count` exact ;
- enrichissements triés ;
- warnings non dupliqués ;
- absence de `lookup_key` dans la réponse ;
- `organización → organisation` et jamais `organization` comme forme française attestée.

## 21. Questions à laisser ouvertes

- Quelle taille maximale de texte garantit un temps de réponse acceptable ?
- Faut-il retourner les ponctuations comme tokens dans une version suivante ?
- Comment départager plusieurs formes partageant une clé normalisée ?
- À partir de combien de langues une série devient-elle réellement pan-romane ?
- Les libellés pédagogiques restent-ils dans l'API ou seront-ils localisés plus tard ?
- Quand les heuristiques des tamis 4 à 6 devront-elles quitter le code pour devenir administrables ?

## Conclusion

`POST /analysis` peut être implémenté sans nouvelle table et sans réutiliser directement les procédures de lecture actuelles. Une petite série de requêtes SQL par lot suffit pour charger langues, formes, entrées, relations, traits et règles.

La DB alimente directement les tamis 1 et 2. Les tamis 3 et 7 combinent règles stockées et application API. Les tamis 4 à 6 restent expérimentaux, avec une contribution lexicale de la DB pour 5 et 6.

La priorité n'est donc pas d'élargir le schéma. Elle est de fixer la normalisation, ajouter les données minimales du mock, écrire les lectures par lot et produire un premier paquet réel comparable au JSON déjà consommé par Seven Sieves Explorer.
