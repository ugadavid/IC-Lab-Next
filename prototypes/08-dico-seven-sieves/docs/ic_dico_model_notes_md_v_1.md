# Notes sur le modèle de données IC-Dico

> ⚠️ Document de travail  
> Ce document décrit l’état actuel de la réflexion sur le modèle de données.  
> Le projet démarre : les choix présentés ici sont provisoires, réversibles et destinés à évoluer avec les retours de terrain, les lectures théoriques et les expérimentations techniques.

---

# 1. Intention générale du modèle

IC-Dico ne cherche pas à modéliser un dictionnaire classique.

L’objectif est de représenter des informations utiles pour l’**intercompréhension** :

- ressemblances lexicales ;
- cognats ;
- faux amis ;
- proximités morphologiques ;
- relations entre formes de langues différentes ;
- indices pédagogiques mobilisables dans des activités.

Le modèle doit permettre de répondre à des questions comme :

- Ce mot ressemble-t-il à un mot connu dans une autre langue ?
- Cette ressemblance est-elle fiable ?
- Y a-t-il un risque de faux ami ?
- Quelle aide peut-on proposer à l’apprenant ?
- Peut-on expliquer pourquoi un mot est transparent ou trompeur ?

---

# 2. Hypothèse de modélisation actuelle

> ⚠️ État actuel de la réflexion  
> Cette modélisation constitue une première hypothèse de travail. Elle n’est ni stabilisée ni considérée comme définitive. Les retours de terrain, les expérimentations techniques et les usages pédagogiques observés pourront conduire à des ajustements importants.

Un point nouveau apparu lors des premiers échanges avec les enseignants concerne la **mutualisation des ressources et des enrichissements**. À terme, le dictionnaire pourrait ne pas être seulement un moteur lexical interne, mais également un espace de capitalisation progressive de connaissances pédagogiques partagées.

Le cœur actuel du modèle repose sur trois niveaux :

```text
lexical_entry
    ↓
lexical_form
    ↓
form_relation
```

## `lexical_entry`

Représente une entrée lexicale abstraite ou pivot sémantique.

Exemple :

```text
PHENOMENON_OBSERVABLE
```

Cette entrée ne correspond pas directement à un mot français, espagnol ou italien.

Elle sert de point d’ancrage pour regrouper plusieurs formes lexicales proches autour d’un même sens général.

## `lexical_form`

Représente une forme réelle dans une langue donnée.

Exemples :

```text
fr : phénomène
es : fenómeno
it : fenomeno
pt : fenômeno
en : phenomenon
```

Chaque forme appartient :

- à une langue ;
- à une entrée lexicale ;
- éventuellement à une catégorie grammaticale.

## `form_relation`

Représente une relation entre deux formes lexicales.

Exemples :

```text
phénomène → fenómeno : COGNATE_STRONG
librairie → library : FALSE_FRIEND
université → universidad : COGNATE_WEAK
```

C’est probablement la table la plus importante pour l’intercompréhension.

Elle permet de représenter non seulement les ressemblances, mais aussi les pièges et les équivalences partielles.

---

# 3. Pourquoi distinguer `lexical_entry` et `lexical_form` ?

Cette distinction est centrale.

Un modèle trop simple du type :

```text
mot_fr = mot_es
```

serait insuffisant.

En intercompréhension, on a besoin de distinguer :

- le sens général ;
- les formes dans chaque langue ;
- la relation entre ces formes ;
- la fiabilité pédagogique de cette relation.

---

# 4. Tables actuelles

## `language`

Table de référence des langues.

Rôle :

- stocker le code de langue ;
- distinguer les langues romanes des autres ;
- garder la possibilité d’ajouter de nouvelles langues.

Langues actuellement envisagées :

```text
fr
es
it
pt
en
```

L’anglais est volontairement inclus comme cas d’étude, même s’il n’est pas une langue romane.

## `lexical_entry`

Table des entrées pivots.

Champs importants :

- `entry_key`
- `gloss_fr`
- `gloss_en`
- `semantic_domain`
- `notes`

Le `gloss` sert à clarifier le sens visé.

## `lexical_form`

Table des formes lexicales.

Champs importants :

- `entry_id`
- `language_id`
- `lemma`
- `normalized_lemma`
- `part_of_speech`
- `confidence_score`

Le champ `normalized_lemma` est important pour les recherches et comparaisons.

## `form_relation`

Table des relations entre formes.

Champs importants :

- `source_form_id`
- `target_form_id`
- `relation_type`
- `score`
- `is_symmetric`
- `confidence_score`
- `notes`

## `ic_feature`

Table de traits liés à l’intercompréhension.

Exemples possibles :

```text
TRANSPARENCY_SCORE
GRAPHIC_SIMILARITY
FALSE_FRIEND_RISK
```

## `pattern_rule`

Cette table occupe actuellement une place secondaire mais pourrait devenir centrale.

L’idée est de pouvoir progressivement formaliser des régularités utiles à l’intercompréhension.

Exemple :

```text
information
información
informazione
informação
```

ou encore :

```text
-tion → -ción
-tion → -zione
-tion → -ção
```

À terme, ces règles pourraient permettre :

- de suggérer automatiquement des cognats potentiels ;
- de générer des indices pour les apprenants ;
- d’expliquer certaines transparences lexicales ;
- d’aider les enseignants à préparer plus rapidement des activités.

⚠️ Ce chantier reste largement exploratoire.

## `pattern_rule`

Table prévue pour les règles de transformation.

Exemples possibles :

```text
fr → es : ph → f
fr → es : -tion → -ción
fr → it : -tion → -zione
fr → pt : -tion → -ção
```

---

# 5. Types de relations actuels

Les types de relations actuellement utilisés ou envisagés sont :

```text
COGNATE_STRONG
COGNATE_WEAK
FALSE_FRIEND
PARTIAL_EQUIVALENCE
ORTHOGRAPHIC_VARIANT
MORPHOLOGICAL_PATTERN
NO_RELATION
```

### `COGNATE_STRONG`

Formes très proches, sens proche, transparence forte.

### `COGNATE_WEAK`

Formes apparentées ou proches, mais transparence moins immédiate.

### `FALSE_FRIEND`

Formes très proches, mais sens différent ou trompeur.

### `PARTIAL_EQUIVALENCE`

Relation sémantique partielle ou contextuelle.

---

# 6. Scores et confiance

Le modèle utilise actuellement deux notions proches mais distinctes :

## `score`

Le score représente la force ou la qualité de la relation.

Actuellement : attribution manuelle.

## `confidence_score`

Le score de confiance indique la confiance dans l’annotation elle-même.

---

# 7. Attention : score et pédagogie

Le score ne doit pas être interprété comme une vérité linguistique absolue.

La question centrale est plutôt :

> cette relation peut-elle aider un apprenant à comprendre ?

---

# 8. Procédures stockées

Le modèle utilise des procédures stockées préfixées par `sp_`.

Ce préfixe est obligatoire pour toutes les procédures du projet.

Objectifs :

- rendre les insertions plus propres ;
- éviter les IDs en dur ;
- préparer un futur usage par API ;
- centraliser la logique minimale.

---

# 9. Hypothèses actuelles

## Hypothèse 1 : le modèle doit rester relationnel

Le choix actuel d’une base MariaDB est volontaire.

## Hypothèse 2 : les relations sont plus importantes que les traductions

IC-Dico cherche à représenter des relations pédagogiquement utiles.

## Hypothèse 3 : le modèle doit accepter l’incertitude

Le modèle doit pouvoir accueillir :

- des relations discutables ;
- des scores provisoires ;
- des annotations manuelles.

---

# 10. Questions ouvertes

## Mutualisation et collaboration

Un point apparu lors des entretiens concerne la volonté des enseignants de pouvoir **mutualiser leurs enrichissements**.

Question encore totalement ouverte :

> IC-Dico doit-il rester un simple moteur lexical ou devenir progressivement une ressource collaborative ?

Exemples possibles :

- enrichissements partagés ;
- validation collective de relations lexicales ;
- annotations pédagogiques mutualisées ;
- bibliothèques de cas intéressants (faux amis, cognats difficiles, stratégies utiles).

Cette orientation changerait potentiellement une partie du modèle de données, mais elle n’est pas prioritaire à ce stade.


## Scoring

Comment calculer un score de transparence ?

Pistes :

- distance orthographique ;
- règles morphologiques ;
- fréquence lexicale ;
- validation humaine.

## Faux amis

Comment distinguer :

- faux ami complet ;
- faux ami partiel ;
- équivalence contextuelle ?

## Sens et polysémie

Faudra-t-il introduire une vraie table `sense` ?

## Langues

Faut-il ajouter :

- catalan ?
- roumain ?
- occitan ?
- galicien ?

## Automatisation

Jusqu’où automatiser sans perdre l’explicabilité pédagogique ?

---

# 11. Risques identifiés

## Sur-ingénierie

Principe actuel :

> ajouter seulement ce qui est utile au prototype immédiat.

## Pollution des données

Mieux vaut peu de données solides que beaucoup de données douteuses.

## Confusion traduction / intercompréhension

Le modèle ne doit pas glisser vers un dictionnaire de traduction classique.

---

# 12. Prochaine étape probable

Priorités actuelles :

1. stabiliser les scripts SQL ;
2. documenter les procédures stockées ;
3. enrichir prudemment le seed ;
4. tester des requêtes simples ;
5. commencer à analyser une phrase ou un court texte.

Objectif expérimental futur :

```text
entrée utilisateur : phrase courte
sortie attendue : mots reconnus, cognats, faux amis, indices possibles
```

