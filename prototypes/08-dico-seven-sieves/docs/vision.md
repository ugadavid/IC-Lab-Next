# Vision du projet IC-Dico

> ⚠️ Projet en phase de démarrage exploratoire  
> Le système actuel est un prototype en construction. Les entretiens de terrain avec les enseignants et les besoins pédagogiques observés sont encore en cours d’exploration et peuvent modifier significativement les orientations du projet.  
> Les décisions techniques doivent rester simples, réversibles et documentées.

---

# 1. Contexte

Le projet **IC-Dico** naît dans le cadre d’un travail autour de l’**intercompréhension entre langues romanes (IC)**, en lien avec un stage de Master portant sur les pratiques pédagogiques et les outils numériques mobilisés dans ce domaine.

Au fil des premiers échanges avec les enseignants et de l’analyse des activités existantes, un constat est progressivement apparu :

> une grande partie du travail pédagogique en intercompréhension repose encore sur des manipulations lexicales et textuelles largement réalisées à la main.

Les enseignants construisent souvent eux-mêmes :

- des aides lexicales ;
- des listes de cognats ;
- des alertes sur les faux amis ;
- des transformations morphologiques entre langues ;
- des indices permettant aux apprenants de mieux interpréter des textes en langue inconnue.

Ce travail est riche pédagogiquement, mais coûteux en temps et difficilement mutualisable.

Dans le même temps, plusieurs pistes de développement d’outils numériques ont émergé autour :

- des **7 tamis de l’intercompréhension** ;
- d’activités de compréhension de textes plurilingues ;
- de vidéos accompagnées d’indices ;
- d’exploration de langues inconnues ;
- de tâches interprétables en contexte plurilingue.

Rapidement, un besoin transversal est apparu :

> construire un moteur lexical commun capable de soutenir plusieurs applications futures.

IC-Dico est une première réponse exploratoire à ce besoin.

---

# 2. Le problème

Aujourd’hui, une grande partie des ressources mobilisées en intercompréhension repose sur :

- des documents annotés manuellement ;
- des listes lexicales dispersées ;
- des connaissances expertes implicites ;
- des adaptations spécifiques à chaque activité.

Cette situation rend difficile :

### La mutualisation

Deux enseignants travaillant sur des textes proches recommencent souvent une partie du travail lexical.

### La réutilisation

Une activité efficace dans un contexte reste difficile à adapter rapidement à un autre.

### L’explicitation

Les stratégies d’intercompréhension mobilisées par les enseignants ne sont pas toujours formalisées ou visibles pour les apprenants.

### L’automatisation raisonnée

De nombreuses aides pourraient potentiellement être générées automatiquement ou semi-automatiquement, mais les structures lexicales sous-jacentes restent dispersées.

---

# 3. Ce que nous essayons de construire

IC-Dico n’est pas pensé comme un dictionnaire classique.

L’objectif n’est pas de traduire.

L’objectif est d’aider à **comprendre une langue inconnue ou partiellement connue**.

Le projet cherche à construire un :

> **moteur lexical d’aide à l’intercompréhension**

capable de représenter et mobiliser :

- des **cognats forts** ;
- des **cognats faibles** ;
- des **faux amis** ;
- des **équivalences partielles** ;
- des **transformations orthographiques ou morphologiques** ;
- des **indices de transparence lexicale** ;
- des **aides interprétatives**.

L’ambition actuelle est volontairement limitée :

> construire un noyau expérimental simple mais exploitable.

---

# 4. Ce que ce projet n’est pas

Afin d’éviter les ambiguïtés, il est important de préciser ce que IC-Dico ne cherche pas à être.

## Ce n’est pas un traducteur

Le système ne vise pas à produire une traduction automatique.

L’objectif est de soutenir la compréhension et les stratégies interprétatives.

---

## Ce n’est pas un dictionnaire classique

L’entrée principale du système n’est pas seulement le mot ou sa définition.

L’intérêt porte aussi sur :

- les relations entre formes ;
- les ressemblances utiles ;
- les pièges ;
- les stratégies mobilisables.

---

## Ce n’est pas un système d’IA opaque

Le projet privilégie :

> l’explicabilité pédagogique.

Les suggestions doivent pouvoir être comprises, discutées et justifiées.

---

## Ce n’est pas un projet stabilisé

Le modèle actuel est provisoire.

Il doit rester suffisamment souple pour intégrer :

- les retours des enseignants ;
- les besoins émergents ;
- les contraintes techniques observées ;
- de nouvelles langues ou nouveaux usages.

---

# 5. État actuel du projet

À ce stade, IC-Dico est un **prototype exploratoire**.

Un premier modèle de données est en cours d’expérimentation autour de :

- langues (`language`)
- entrées lexicales (`lexical_entry`)
- formes lexicales (`lexical_form`)
- relations (`form_relation`)
- caractéristiques d’intercompréhension (`ic_feature`)
- règles de transformation (`pattern_rule`)

Un premier jeu de données expérimental est progressivement construit autour :

- du français ;
- de l’espagnol ;
- de l’italien ;
- du portugais ;
- de l’anglais (ajouté comme cas d’étude comparatif).

Les données actuellement présentes ont une fonction principalement :

> exploratoire et pédagogique.

Elles servent à tester le modèle, les relations possibles et les usages futurs.

---

# 6. Applications envisagées

IC-Dico n’est pas une fin en soi.

Il est pensé comme une infrastructure potentiellement réutilisable dans plusieurs types d’outils.

À ce stade, plusieurs pistes restent ouvertes :

### Application autour des stratégies d’intercompréhension

(ex. tamis, indices, exploration guidée)

### Exploration interactive de langues inconnues

(comprendre sans traduction directe)

### Immersion plurilingue contrainte

(textes mélangeant plusieurs langues)

### Tâches interprétables multilingues

(comprendre une consigne dans une langue inconnue)

### Vidéos augmentées d’intercompréhension

(indices lexicaux, culturels et stratégiques pendant le visionnage)

Ces orientations restent exploratoires.

---

# 7. Principes de conception

Le projet repose actuellement sur plusieurs principes simples.

## Simplicité

Préférer des modèles compréhensibles.

Éviter la sur-ingénierie prématurée.

---

## Progressivité

Construire par petites itérations.

Tester avant de généraliser.

---

## Explicabilité

Toute aide proposée doit pouvoir être justifiée.

---

## Prudence linguistique

Éviter les généralisations excessives.

Privilégier les relations lexicales pédagogiquement utiles et relativement robustes.

---

## Réversibilité

Le modèle doit pouvoir évoluer sans rigidité excessive.

---

# 8. Questions ouvertes

À ce stade, plusieurs questions restent entièrement ouvertes :

- Comment calculer un score de transparence lexical ?
- Jusqu’où automatiser les suggestions ?
- Quelles langues intégrer ?
- Quel rôle pour les dictionnaires existants (Wiktionnaire, ressources universitaires, TAL) ?
- Comment mutualiser les enrichissements produits par les enseignants ?
- Quel équilibre entre automatisation et contrôle humain ?

Ces questions font pleinement partie du projet.

