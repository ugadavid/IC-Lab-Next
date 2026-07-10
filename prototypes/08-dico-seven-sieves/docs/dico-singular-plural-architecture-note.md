# Dico-IC — singulier et pluriel des noms et adjectifs V0

## Statut

Cette note prépare une décision de modèle. Elle ne définit aucun SQL final et ne constitue pas une implémentation.

## 1. Rappel du problème

`lexical_form` doit conserver les lemmes canoniques :

```text
FR utile
ES útil
IT utile
PT útil
```

Les textes présentent aussi :

```text
FR utiles
ES útiles
IT utili
PT úteis
```

Le besoin V0 est limité à une résolution :

```text
forme plurielle observée
→ lemme singulier canonique
→ connaissances Dico-IC
```

La forme plurielle n'est ni une nouvelle entrée lexicale ni une relation d'intercompréhension.

## 2. Périmètre V0

### Inclus

- noms ;
- adjectifs ;
- singulier canonique vers pluriel observé ;
- français, espagnol, italien et portugais ;
- formes attestées dans les textes pédagogiques ;
- règles suffixales inverses simples, uniquement comme aide au lookup.

### Exclus

- verbes et conjugaisons ;
- genre et accords masculin/féminin ;
- contractions et clitiques ;
- dérivation ;
- suffixes lexicaux ;
- faux amis et relations IC ;
- paradigmes exhaustifs ;
- noms uniquement pluriels et cas morphologiques complexes ;
- analyse syntaxique complète.

Les formes qui exigent une décision de genre ou une analyse hors périmètre doivent rester non résolues plutôt que recevoir une règle approximative.

## 3. Invariants du modèle

### Ce qui reste dans `lexical_form`

- le lemme dictionnaire canonique ;
- la langue ;
- la catégorie grammaticale ;
- les propriétés lexicales durables ;
- les liens vers l'entrée conceptuelle et les relations IC.

Exemples :

```text
élève
alumno
studente
aluno
organización
organisation
```

### Ce qui ne doit pas devenir `lexical_form`

```text
élèves
alumnos
studenti
alunos
organizaciones
organisations
```

Ces surfaces doivent rester des accès morphologiques vers les lemmes.

### `form_relation`

Elle reste réservée aux cognats, faux amis et autres relations d'intercompréhension entre lemmes. Elle ne doit pas porter le lien singulier/pluriel.

## 4. Option A — `inflected_form`

### Principe

Stocker explicitement les pluriels attestés et validés :

```text
utiles          → lexical_form utile
útiles          → lexical_form útil
utili           → lexical_form utile
úteis           → lexical_form útil
organizaciones  → lexical_form organización
```

### Avantages

- très simple à comprendre ;
- lookup déterministe et rapide ;
- résultat reproductible ;
- exceptions représentables ;
- provenance et validation conservées ;
- volume faible puisque seules les formes observées sont stockées ;
- aucun moteur externe requis pour les formes déjà validées ;
- compatible avec un `/analysis` en lecture seule.

### Risques

- chaque nouvelle surface doit être découverte puis validée ;
- une surface peut mener à plusieurs lemmes ;
- la normalisation sans diacritiques crée des collisions ;
- un mapping validé hors contexte ne résout pas toutes les ambiguïtés ;
- une interface admin minimale devient nécessaire ;
- stocker automatiquement chaque token polluerait rapidement la qualité, même si le volume reste faible.

### Ambiguïtés

La même `normalized_surface` doit pouvoir mener à plusieurs cibles.

Il ne faut donc pas imposer conceptuellement :

```text
UNIQUE(normalized_surface)
```

La langue et le POS du `lexical_form` cible filtrent les candidats. Si plusieurs lemmes restent possibles, le contexte ou un futur lemmatiseur doit les classer.

### Noyau conceptuel recommandé

```text
id
lexical_form_id
surface_form
normalized_surface
grammatical_number
status
source_label
confidence_score
created_at
```

`grammatical_number` rend explicite que la surface représente ici `PLURAL`. Pour ce périmètre étroit, ce champ contrôlé est plus simple qu'un JSON morphologique général.

La langue et le POS sont dérivés de `lexical_form` et ne devraient pas être dupliqués sans besoin démontré.

### Index conceptuels

Sans écrire de SQL, trois accès sont importants :

1. recherche par `normalized_surface` et `status` ;
2. recherche de toutes les formes rattachées à un `lexical_form_id` ;
3. prévention d'un doublon strict du même mapping cible + surface normalisée + nombre.

La recherche Seven Sieves doit être faite par lot pour tous les tokens inconnus.

### Statuts

Vocabulaire minimal possible :

```text
PROPOSED
VALIDATED
REJECTED
ARCHIVED
```

Seules les lignes `VALIDATED` devraient être utilisées comme vérité prioritaire dans `/analysis`.

### Seven Sieves

```text
token "organizaciones"
→ lookup normalized_surface
→ mapping VALIDATED
→ lexical_form "organización"
→ enrichissements du lemme
```

Le token affiché reste `organizaciones`.

### Compatibilité stateless

Oui, si `/analysis` ne fait que lire les mappings. La création et la validation restent dans Dico-IC Admin.

## 5. Option B — `morph_rule`

### Principe

Stocker des transformations intralinguistiques qui génèrent des candidats de lemme à partir de la surface plurielle.

Le sens recommandé est :

```text
surface observée → candidat lemma normalisé
```

et non la génération de tous les pluriels à partir du dictionnaire.

### Exemples de candidats inverses

```text
FR  organisations → organisation     suffixe s → vide
ES  alumnos        → alumno           suffixe s → vide
ES  organizaciones → organización     ciones → cion, puis lookup normalisé
ES  luces          → luz              ces → z
IT  utili          → utile            i → e
IT  studenti       → studente         i → e
PT  alunos         → aluno            s → vide
PT  úteis          → útil              eis → il, puis lookup normalisé
```

La restauration exacte des accents n'a pas besoin d'être inventée par la règle. Celle-ci produit une clé normalisée ; le lookup retrouve ensuite le lemme accentué stocké dans `lexical_form`.

### Avantages

- reconnaît des pluriels jamais enregistrés ;
- peu de lignes pour couvrir plusieurs formes régulières ;
- explicable ;
- exécution locale et rapide ;
- peut proposer automatiquement des mappings à l'admin ;
- utile même avant l'intégration d'un moteur NLP complet.

### Difficulté réelle

Les règles romanes dépassent rapidement le simple ajout de `s` :

- français : formes invariantes et alternances comme `-al/-aux` ou `-eau/-eaux` ;
- espagnol : `-z/-ces`, ajout de `-es`, changements d'accentuation ;
- italien : plusieurs transformations possibles depuis une finale `-i`, dépendantes du genre et de la classe ;
- portugais : alternances `-l`, `-m`, `-ão` et variations d'accentuation.

Même limitée au nombre, une règle inverse peut produire plusieurs lemmes plausibles.

### Garde-fou principal

Une règle ne doit jamais créer seule une vérité lexicale.

Elle doit seulement produire des candidats, puis vérifier :

```text
langue correcte
+ POS noun/adjective
+ normalized_lemma existant dans lexical_form
```

Si aucun lemme canonique n'existe, la règle ne produit pas d'enrichissement lexical.

### Exceptions

Les irrégularités et ambiguïtés restent dans `inflected_form`, pas dans une accumulation de règles de plus en plus spécifiques.

### Noyau conceptuel possible

```text
id
language_id
part_of_speech
feature_name
feature_value
pattern_scope
pattern_from
pattern_to
description
examples
status
priority
confidence_score
created_at
```

Pour la V0 :

```text
feature_name  = Number
feature_value = Plur
pattern_scope = SUFFIX
```

`pattern_from` correspond à la terminaison de surface et `pattern_to` à la terminaison du candidat singulier.

Une direction explicite doit être documentée pour éviter d'interpréter la règle à l'envers.

### Pourquoi ne pas réutiliser `pattern_rule`

`pattern_rule` représente actuellement des correspondances entre langues, par exemple `-ción → -tion`. Une règle de pluriel est intralinguistique et résout une surface vers son lemme.

Mélanger les deux compliquerait les requêtes et les tamis. Un futur `morph_rule` aurait donc un rôle distinct.

### Seven Sieves

```text
token "studenti"
→ règle IT i → e
→ candidat normalisé "studente"
→ lexical_form IT studente existe
→ enrichissements
```

### Limites

- couverture volontairement partielle ;
- sur-génération possible ;
- plusieurs candidats possibles ;
- pas de résolution contextuelle complète ;
- besoin de statuts et de tests par langue ;
- règles dangereuses si elles ne sont pas confirmées par le lexique.

## 6. Option C — hybride V0

### Principe

Combiner :

```text
inflected_form VALIDATED
+
morph_rule simple et contrôlée
```

La table de formes attestées fournit la précision. Les règles fournissent la couverture des cas nouveaux.

### Ordre de priorité

```text
1. lexical_form exact
2. inflected_form VALIDATED
3. morph_rule VALIDATED
4. confirmation du candidat dans lexical_form
5. sinon aucun enrichissement lexical
```

Un futur lemmatiseur dynamique pourrait venir après l'étape 3 ou remplacer progressivement certaines règles, mais il n'est pas nécessaire pour décider cette V0 singulier/pluriel.

### Ce qui est stocké

- lemmes singuliers dans `lexical_form` ;
- pluriels attestés et validés dans `inflected_form` ;
- petit nombre de transformations réutilisables dans `morph_rule` ;
- provenance, statut et confiance.

### Ce qui est calculé

- normalisation de la surface ;
- application des règles aux tokens non reconnus ;
- génération de plusieurs candidats si nécessaire ;
- confirmation par lookup dans `lexical_form` ;
- enrichissements associés au token original.

### Ce qui est validé humainement

- mappings persistants ;
- règles activées ;
- exceptions ;
- conflits entre plusieurs cibles ;
- promotion éventuelle d'un résultat de règle vers `inflected_form`.

### Exemple complet

```text
token ES "organizaciones"
→ pas de lemma exact
→ pas encore de mapping validé
→ règle ES ciones → cion
→ candidat normalisé "organizacion"
→ lexical_form ES organización trouvé
→ enrichissements renvoyés
→ aucune écriture par /analysis
```

Dans un futur workflow admin :

```text
organizaciones → organización
→ proposition regroupée
→ validation humaine
→ mapping inflected_form réutilisable
```

### Avantages

- bon équilibre précision/couverture ;
- adapté au faible volume ;
- progression par les textes réellement utilisés ;
- règles limitées et explicables ;
- exceptions capitalisées ;
- aucune pollution de `lexical_form` ;
- fonctionnement possible sans SaaS ;
- `/analysis` reste stateless.

### Risques

- deux objets nouveaux au lieu d'un ;
- gouvernance des règles nécessaire ;
- risque de doublon entre résultat calculé et mapping validé ;
- règles trop générales si leur activation n'est pas prudente ;
- complexité prématurée si le corpus montre très peu de répétitions.

## 7. Comparaison

| Critère | A — formes attestées | B — règles | C — hybride |
|---|---|---|---|
| Précision | forte après validation | moyenne, dépend du filtre lexique | forte |
| Formes inédites | non | oui, cas réguliers | oui |
| Exceptions | excellente | faible | excellente |
| Administration | simple mais répétitive | règles plus expertes | intermédiaire |
| Volume | faible | très faible | faible |
| Explicabilité | forte | forte si règles simples | forte |
| Ambiguïtés | stockables | génère plusieurs candidats | gérables |
| Maintenance linguistique | faible | moyenne | moyenne |
| Compatibilité stateless | oui | oui | oui |
| Risque de sur-génération | nul après validation | réel | limité par priorité et lookup |

## 8. Recommandation

### Recommandation d'architecture

Retenir l'Option C comme cible, mais l'introduire par étapes :

1. `inflected_form` constitue le noyau V0 obligatoire ;
2. `morph_rule` reste un second niveau facultatif, ajouté seulement après observation de motifs réellement répétés ;
3. toute règle doit produire un candidat confirmé par un `lexical_form` existant ;
4. tout mapping persistant doit être validé dans l'admin ;
5. Seven Sieves ne réalise aucune écriture.

Cette recommandation peut être résumée ainsi :

```text
Option A d'abord
→ Option C lorsque quelques règles prouvent leur utilité
```

### Pourquoi ne pas commencer uniquement par les règles

Le faible volume rend le stockage attesté peu coûteux. Les règles, même simples, introduisent immédiatement des cas linguistiques et des ambiguïtés. Elles doivent être justifiées par le corpus, pas par le désir de couvrir théoriquement les quatre langues.

### Pourquoi garder une cible hybride

Les exemples fournis montrent déjà des répétitions régulières : `+s`, `i → e`, `ciones → cion`. Une petite couche de règles peut réduire les validations répétitives, à condition de rester subordonnée au lexique canonique.

## 9. Champs conceptuels proposés

### `inflected_form` V0

Recommandés :

```text
id
lexical_form_id
surface_form
normalized_surface
grammatical_number
status
source_label
confidence_score
created_at
```

À ne pas dupliquer au départ :

```text
language_code       dérivé de lexical_form.language_id
part_of_speech      dérivé de lexical_form.part_of_speech
```

### `morph_features_json`

Non recommandé dans cette V0 étroite. Le seul trait traité est `Number=Plur`, mieux représenté par un champ contrôlé.

Le JSON pourra être réévalué lorsque genre, conjugaison ou analyses multiples entreront réellement dans le périmètre.

### `admin_seen_count` et `last_admin_seen_at`

Optionnels, non nécessaires au lookup.

Ils peuvent être utiles si leur sens est strictement :

```text
nombre de textes explicitement analysés dans l'admin
dernière observation dans ce workflow admin
```

Ils ne doivent pas être mis à jour par `/analysis` ni compter les usages apprenants.

Pour une V0 minimale, il est préférable de les omettre puis de les ajouter si l'admin démontre leur utilité.

### `morph_rule` V0 éventuelle

```text
id
language_id
part_of_speech
feature_name
feature_value
pattern_scope
pattern_from
pattern_to
description
examples
status
priority
confidence_score
created_at
```

Le POS peut être utile ici pour limiter une règle, contrairement à `inflected_form` où il est déjà porté par la cible.

## 10. Pipeline Seven Sieves proposé

```text
token du texte
    ↓
normalisation avec la convention Dico-IC
    ↓
lookup exact dans lexical_form, langue source incluse
    ↓ sinon
lookup par lot dans inflected_form VALIDATED
    ↓ sinon
application des morph_rule VALIDATED de la langue et du POS possible
    ↓
génération d'un ou plusieurs normalized_lemma candidats
    ↓
confirmation obligatoire dans lexical_form
    ↓
classement ou prudence si plusieurs lemmes correspondent
    ↓
chargement des relations et connaissances Dico-IC
    ↓
enrichissements attachés au token de surface original
```

### Principes d'exécution

- requêtes par lot, pas une requête par token ;
- mappings validés avant règles ;
- aucune insertion ou mise à jour ;
- source du résultat conservée : `exact_lemma`, `validated_inflection` ou `morph_rule` ;
- warning ou absence de résultat en cas d'ambiguïté ;
- offsets et surface Seven Sieves inchangés.

## 11. Application aux cas concrets

| Surface | Lemme canonique | Chemin V0 recommandé |
|---|---|---|
| FR `utiles` | `utile` | mapping validé ; règle `s → vide` possible |
| ES `útiles` | `útil` | mapping validé ; normalisation + règle `s → vide` possible |
| IT `utili` | `utile` | mapping validé ; règle ambiguë `i → e` confirmée par le lexique |
| PT `úteis` | `útil` | mapping validé ; règle normalisée `eis → il` à tester prudemment |
| FR `élèves` | `élève` | mapping validé ; règle `s → vide` possible |
| ES `alumnos` | `alumno` | mapping validé ; règle `s → vide` possible |
| IT `studenti` | `studente` | mapping validé ; règle `i → e` confirmée par le lexique |
| PT `alunos` | `aluno` | mapping validé ; règle `s → vide` possible |
| ES `organizaciones` | `organización` | mapping validé ; règle normalisée `ciones → cion` possible |
| FR `organisations` | `organisation` | mapping validé ; règle `s → vide` possible |

Les règles indiquées sont des hypothèses de test, pas un inventaire linguistique validé.

## 12. Limites

- La V0 ne résout pas le genre.
- Les adjectifs dont le pluriel dépend d'une forme genrée hors périmètre doivent être traités prudemment.
- Les noms irréguliers nécessitent un mapping explicite.
- Les formes invariantes ne permettent pas de déduire le nombre sans contexte.
- Une finale peut produire plusieurs lemmes candidats.
- La confirmation dans `lexical_form` réduit les faux positifs mais ne résout pas toute polysémie.
- Les règles ne remplacent pas un lemmatiseur contextuel général.
- Le nombre de règles doit rester très petit et guidé par le corpus.
- Aucun compteur d'usage apprenant n'est prévu.
- Le modèle ne cherche pas à décrire toute la morphologie romane.

## 13. Prochaines étapes

Avant tout SQL :

1. annoter manuellement un petit corpus FR/ES/IT/PT avec surface, lemme, POS et nombre ;
2. mesurer le nombre de pluriels distincts réellement rencontrés ;
3. compter combien sont couverts par un mapping explicite ;
4. tester sur papier un petit jeu de règles inverses ;
5. mesurer les candidats faux mais présents dans le lexique ;
6. décider du vocabulaire des statuts ;
7. décider si `grammatical_number` suffit ;
8. définir les ambiguïtés acceptables ;
9. spécifier le workflow de validation admin ;
10. seulement ensuite proposer le SQL et les endpoints.

## Conclusion

Pour la V0 singulier/pluriel, `lexical_form` doit rester strictement canonique et une future `inflected_form` doit porter les pluriels attestés et validés.

Une table `morph_rule` peut être pertinente, mais uniquement comme générateur de candidats inverses confirmés par le lexique. Elle ne doit pas être la première source de vérité.

La décision la plus prudente est donc :

```text
commencer par les mappings explicites
→ observer les répétitions
→ ajouter seulement quelques règles prouvées utiles
```

Cette trajectoire respecte le faible volume, la qualité des données, le caractère stateless de `/analysis` et la simplicité de Seven Sieves.
