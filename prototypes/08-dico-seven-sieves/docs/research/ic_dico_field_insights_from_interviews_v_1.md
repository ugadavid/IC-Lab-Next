# Évolution du dictionnaire d’intercompréhension
## Synthèse des besoins émergents issus des entretiens terrain

> ⚠️ Document de recherche évolutif  
> Ce document vise à conserver une trace des idées, besoins, tensions et pistes apparues au fil des entretiens réalisés avec les enseignants impliqués dans des pratiques d’intercompréhension (IC).  
>
> Il ne s’agit pas d’un document de spécification technique définitif mais d’une mémoire conceptuelle du projet **IC-Dico**, destinée à éclairer progressivement les choix de modélisation.

---

# 1. Pourquoi ce document existe

Le projet **IC-Dico** est né initialement comme une réflexion autour d’un moteur lexical capable de soutenir des activités d’intercompréhension.

Cependant, les premiers entretiens montrent rapidement que les besoins réels dépassent parfois les intuitions initiales.

Les enseignants ne décrivent pas seulement un besoin de dictionnaire ou de lexique multilingue, mais des besoins plus complexes liés à :

- l’aide à la compréhension ;
- les stratégies interprétatives ;
- la reformulation ;
- la mutualisation ;
- l’automatisation raisonnée ;
- les phénomènes linguistiques comparés ;
- l’oral et la multimodalité.

Ce document vise donc à :

- préserver une traçabilité des idées ;
- éviter de perdre des intuitions importantes ;
- distinguer les contributions de chacun ;
- éviter de figer trop vite le modèle ;
- alimenter progressivement la réflexion sur IC-Dico.

---

# 2. Positionnement actuel du dictionnaire

Les entretiens permettent progressivement de clarifier le rôle du dictionnaire.

## Ce que IC-Dico semble être

IC-Dico tend à se positionner comme un :

> **moteur lexical et interprétatif pour l’intercompréhension**

Son rôle serait notamment de :

- identifier des cognats ;
- détecter des faux amis ;
- proposer des indices ;
- signaler des transparences ;
- suggérer des reformulations ;
- mobiliser des phénomènes linguistiques comparés ;
- soutenir la compréhension d’une langue inconnue.

---

## Ce que IC-Dico ne semble pas être

### Pas un traducteur

Les enseignants insistent régulièrement sur le fait qu’un simple équivalent lexical n’est pas suffisant.

L’objectif n’est pas de remplacer la compréhension par la traduction.

---

### Pas une plateforme pédagogique complète

Les textes, activités, médias, audio, scénarisation et parcours pédagogiques relèvent davantage d’un moteur de type **BHE**.

IC-Dico apparaît plutôt comme un :

> **cerveau linguistique branchable**

susceptible d’alimenter plusieurs applications.

Architecture actuellement envisagée :

```text
BHE / App pédagogique
        ↓
    IC-Dico API
        ↓
indices IC
cognats
patterns
faux amis
reformulations
transparence
```

---

# 3. Contributions par enseignant

## 3.1 Christian Degache

### Idées principales

Christian met fortement en avant :

- l’usage de vidéos plurilingues ;
- les interactions authentiques ;
- les stratégies mobilisées par les locuteurs ;
- les besoins d’accompagnement dans la compréhension.

### Impact potentiel sur IC-Dico

- nécessité d’indices interprétatifs ;
- potentiel lien avec des vidéos annotées ;
- soutien aux stratégies d’intercompréhension.

### Point notable

L’idée d’un système capable d’aider à comprendre une interaction plurilingue authentique semble particulièrement cohérente avec un moteur lexical explicable.

---

## 3.2 Kátia Bernardon de Oliveira

### Idées principales

Kátia insiste davantage sur :

- la didactisation ;
- les tamis de l’intercompréhension ;
- la progression pédagogique ;
- l’explicitation des stratégies.

### Impact potentiel sur IC-Dico

- nécessité de rendre les phénomènes linguistiques explicables ;
- compatibilité forte avec une logique d’indices ou d’explication ;
- rapprochement avec les tamis.

### Point notable

IC-Dico pourrait potentiellement devenir un moteur capable d’alimenter automatiquement certains tamis.

---

## 3.3 Teurra Vailatti

### Contexte observé

Teurra utilise déjà de nombreux outils numériques et adopte une posture très autonome vis-à-vis des technologies.

Elle mobilise notamment :

- IA générative ;
- synthèse vocale ;
- outils interactifs ;
- plateformes pédagogiques.

### Idées principales

#### Transferts entre langues

Teurra enseigne fortement à partir de comparaisons interlangues.

Exemples :

```text
-inho ↔ -ito ↔ -ette
```

ou autres régularités linguistiques.

#### Importance des phénomènes linguistiques

Le mot seul semble insuffisant.

Des phénomènes plus larges deviennent intéressants :

```text
DIMINUTIVE
SUFFIXATION
TRANSPARENCE
TRANSFERT INTERLANGUE
```

#### IA comme accélérateur

L’IA est vue comme :

> un moyen d’accélérer la création

mais non comme un remplacement de l’enseignant.

### Impact potentiel sur IC-Dico

- renforcement de `pattern_rule` ;
- nécessité de phénomènes linguistiques comparés ;
- intérêt pour l’enrichissement assisté ;
- validation forte du modèle multilingue.

### Point notable

Teurra semble confirmer que le dictionnaire doit dépasser le simple mot pour intégrer des régularités exploitables pédagogiquement.

---

## 3.4 Richard

### Contexte observé

Richard travaille fortement avec l’oral, les textes et les mécanismes de compréhension progressive.

### Idées principales

#### Importance des connecteurs

Richard mentionne explicitement un travail de dictionnaire de connecteurs.

Exemples :

```text
mais
ensuite
donc
cependant
```

Ces éléments semblent particulièrement importants pour la compréhension.

#### Aide à comprendre plutôt que traduction

Idée centrale :

> fournir une information qui aide à comprendre

et non simplement un équivalent lexical.

#### Langues pont

Certaines langues peuvent aider à accéder à d’autres.

Exemple :

```text
catalan → aide au français
```

#### Oral et exposition répétée

L’écoute répétée semble jouer un rôle important dans le développement de la compréhension.

### Impact potentiel sur IC-Dico

- intégration des connecteurs ;
- importance des marqueurs discursifs ;
- réflexion sur des langues relais ;
- renforcement de la logique d’aide interprétative.

### Point notable

Richard pousse fortement vers un dictionnaire d’aide à la compréhension plutôt qu’un dictionnaire de traduction.

---

## 3.5 Laura

### Idées principales

#### Transparence communicative

Un mot transparent n’est pas seulement un mot proche lexicalement.

Il doit aussi être :

> utile à comprendre dans une situation d’intercompréhension.

Exemple :

```text
choisir ❌
sélectionner ✅
```

car plus transparent entre langues romanes.

#### Reformulation

Lorsqu’un mot est opaque, il faut parfois proposer :

- un synonyme ;
- un antonyme ;
- une reformulation plus transparente.

#### Transformations linguistiques

Laura évoque explicitement plusieurs transformations utiles.

Exemples :

```text
-tion → -ción
pl → pi / ll / ch
```

### Impact potentiel sur IC-Dico

- notion de transparence communicative ;
- reformulation guidée ;
- synonymes et antonymes ;
- renforcement fort de `pattern_rule`.

### Point notable

Laura semble déplacer le dictionnaire vers un moteur d’aide interprétative et de reformulation.

---

# 4. Axes émergents communs

## A. Le dictionnaire n’est pas un traducteur

Convergence forte.

L’objectif principal reste :

> aider à comprendre.

---

## B. Les transformations interlangues semblent centrales

Convergence forte entre :

- Teurra ;
- Laura ;
- Kátia.

`pattern_rule` pourrait devenir une composante importante du moteur.

---

## C. Les connecteurs semblent sous-estimés

Richard fait émerger un besoin nouveau.

Les mots-outils semblent jouer un rôle majeur dans la compréhension.

---

## D. La reformulation est importante

Convergence particulièrement forte chez Laura.

Un mot opaque pourrait parfois être remplacé par un mot plus transparent.

---

## E. L’IA doit assister mais non remplacer

Convergence observée.

Logique dominante :

```text
suggestion
→ validation humaine
→ usage pédagogique
```

---

## F. Mutualisation et enrichissement progressif

Besoin émergent observé chez plusieurs enseignants.

Question ouverte :

> comment mutualiser progressivement les enrichissements ?

---

# 5. Impacts potentiels sur le modèle de données

À ce stade, ces pistes restent exploratoires.

Éléments potentiellement à explorer plus tard :

```text
pattern_rule++
connectors
discourse_marker
bridge_language
transparency_profile
pedagogical_hint
reformulation_strategy
```

⚠️ Ces éléments ne constituent pas des décisions de modélisation.

Ils servent uniquement de pistes de réflexion.

---

# 6. Questions ouvertes

- Jusqu’où automatiser ?
- Comment représenter la transparence ?
- Comment modéliser les connecteurs ?
- Comment gérer les reformulations ?
- Quel rôle exact pour les langues relais ?
- Jusqu’où mutualiser ?
- Comment rester explicable pédagogiquement ?

---

# 7. Priorités actuelles

À court terme, les priorités semblent rester :

1. stabiliser le modèle actuel ;
2. enrichir progressivement le seed ;
3. expérimenter des analyses simples ;
4. tester des transformations interlangues ;
5. éviter la sur-ingénierie.

À moyen terme seulement :

- connecteurs ;
- reformulation ;
- mutualisation ;
- enrichissement collaboratif ;
- langues pont.

---

# 8. Conclusion provisoire

Les entretiens montrent une forte cohérence générale :

> les enseignants semblent attendre davantage un moteur d’aide à comprendre qu’un simple dictionnaire.

Le projet semble progressivement évoluer vers :

> un moteur lexical interprétatif, explicable et potentiellement mutualisable au service de l’intercompréhension.

Cette orientation reste toutefois exploratoire et devra continuer à être confrontée au terrain.

