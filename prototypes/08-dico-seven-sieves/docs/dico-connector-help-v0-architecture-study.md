# Dico-IC - Etude d'architecture V0 : `connector_help`

## 1. Analyse du besoin

### Ce que disent les entretiens

Les entretiens ne définissent pas encore un modèle formel des connecteurs. Ils font toutefois apparaître un besoin pédagogique récurrent : un apprenant peut reconnaître une partie du lexique sans comprendre l'organisation du raisonnement. Les connecteurs et marqueurs discursifs deviennent alors des indices décisifs.

Le corpus mentionne explicitement :

- l'intérêt d'un « dictionnaire de connecteurs » ;
- des exemples tels que `mais`, `ensuite`, `donc` et `cependant` ;
- l'importance des mots-outils et marqueurs discursifs pour la compréhension ;
- le besoin d'une aide interprétative, au-delà d'une simple traduction mot à mot.

Ces éléments autorisent à explorer un objet pédagogique consacré aux connecteurs. Ils ne suffisent pas encore à établir une taxonomie exhaustive, une méthode automatique de détection ou une structure SQL définitive. Le document d'entretiens doit rester une mémoire conceptuelle, non une spécification technique.

### Usage pédagogique visé

L'aide attendue ne consiste pas seulement à traduire un connecteur. Elle doit rendre visible sa contribution au discours :

```text
forme observée
↓
fonction discursive
↓
indice sur le raisonnement
↓
compréhension du passage
```

Une aide utile pourrait donc répondre à trois questions simples :

1. Quel élément du texte joue le rôle de connecteur ?
2. Quelle relation signale-t-il probablement ?
3. Que peut anticiper l'apprenant dans la suite du raisonnement ?

### Informations réellement nécessaires en V0

Le besoin minimal porte sur :

- l'expression observée, éventuellement composée de plusieurs mots ;
- sa langue ;
- une fonction discursive pédagogique ;
- une explication courte orientée vers l'action de lecture ;
- un exemple ;
- une prudence rappelant que la fonction dépend parfois du contexte ;
- un statut de validation de la connaissance.

La traduction peut compléter l'aide, mais elle ne doit pas en être le centre. Une analyse syntaxique complète, un classement linguistique fin et une désambiguïsation automatique ne sont pas nécessaires pour démontrer le concept.

## 2. Modèle conceptuel minimal V0

`connector_help` devrait représenter une connaissance pédagogique réutilisable attachée à une expression discursive, et non une propriété générale de tous ses emplois.

### Noyau proposé

```text
connector_help
├── code
├── language
├── expression
├── discourse_function
├── pedagogical_title
├── pedagogical_hint
├── example
├── caution
├── status
└── source_label
```

Rôle des éléments :

| Élément | Rôle V0 |
|---|---|
| `code` | Identifiant stable et lisible de l'aide. |
| `language` | Langue de l'expression reconnue. |
| `expression` | Forme simple ou séquence multi-mots, par exemple `pero` ou `sin embargo`. |
| `discourse_function` | Catégorie pédagogique courte, par exemple `OPPOSITION`. |
| `pedagogical_title` | Intitulé affichable, par exemple « Connecteur logique ». |
| `pedagogical_hint` | Déduction utile pour comprendre la progression du texte. |
| `example` | Exemple bref en contexte ou rapprochement interlinguistique. |
| `caution` | Limite ou caractère non systématique de l'interprétation. |
| `status` | Distingue une proposition d'une connaissance validée. |
| `source_label` | Origine documentaire, pédagogique ou administrative. |

Une référence optionnelle vers une `lexical_entry` pourrait être utile lorsqu'une entrée existe déjà. Elle ne devrait pas être obligatoire : `sin embargo`, `por tanto`, `parce que` et `de plus` sont des séquences multi-mots que le modèle lexical actuel ne représente pas naturellement comme une seule `lexical_form`.

### Éléments à différer

Les champs suivants peuvent attendre une V1 : variantes orthographiques, priorité entre aides, position dans la phrase, registre, sous-fonctions discursives, équivalents multilingues structurés, conditions contextuelles et degrés de confiance calculés.

## 3. Fonctions discursives minimales

Il faut distinguer les fonctions directement soutenues par les exemples des entretiens de celles ajoutées pour construire une démonstration cohérente. Les entretiens rendent particulièrement visibles l'opposition, la chronologie et la conséquence. Le contexte du présent travail invite également à explorer la cause et la conclusion. L'addition et l'illustration complètent utilement le catalogue, mais ne sont pas à considérer comme des catégories définitivement validées par le corpus.

### Catalogue exploratoire

| Fonction | Description pédagogique | Intérêt en intercompréhension | Exemples possibles |
|---|---|---|---|
| `ADDITION` | Ajoute une information dans la même direction. | Permet d'anticiper un argument ou un élément supplémentaire. | ES `además` ; FR `de plus`. |
| `OPPOSITION` | Introduit un contraste, une restriction ou une idée contraire. | Évite de lire deux propositions comme simplement cumulatives. | ES `pero`, `sin embargo` ; FR `mais`, `cependant`. |
| `CAUSE` | Introduit une raison ou une explication. | Aide à repérer ce qui justifie une affirmation. | ES `porque` ; FR `parce que`. |
| `CONSEQUENCE` | Introduit un résultat ou une déduction. | Aide à suivre le passage d'une prémisse à son effet. | ES `por tanto` ; FR `donc`. |
| `CHRONOLOGY` | Situe une étape après une autre. | Rend visible l'ordre d'un récit, d'une procédure ou d'une démonstration. | ES `después`, `luego` ; FR `ensuite`. |
| `ILLUSTRATION` | Introduit un exemple. | Permet de distinguer une idée générale de son illustration. | ES `por ejemplo` ; FR `par exemple`. |
| `CONCLUSION` | Signale une synthèse ou une clôture du raisonnement. | Aide à identifier l'idée que l'auteur souhaite retenir. | ES `en conclusión` ; FR `en conclusion`. |

### Plus petit ensemble démontrable

Pour une V0 réellement limitée, cinq fonctions suffisent :

```text
ADDITION
OPPOSITION
CAUSE
CONSEQUENCE
CHRONOLOGY
```

Elles couvrent les dix expressions espagnoles et françaises proposées dans le besoin, ainsi que les exemples les plus directement présents dans les entretiens. `ILLUSTRATION` et `CONCLUSION` peuvent être préparées conceptuellement puis ajoutées après observation de textes réels.

Il serait prématuré de séparer en V0 opposition, concession, restriction et correction. Une catégorie pédagogique large peut être plus lisible pour l'apprenant, à condition que le message et la prudence restent précis.

## 4. Options d'intégration dans Dico-IC

### Option A - Objet directement attaché à `lexical_entry`

Cette option associerait une aide discursive à une entrée lexicale existante.

**Avantages**

- réutilisation immédiate du lexique et de ses formes multilingues ;
- administration simple pour les connecteurs d'un seul mot ;
- accès naturel après reconnaissance d'une `lexical_form`.

**Limites**

- représentation difficile des connecteurs multi-mots ;
- risque de confondre sens lexical et fonction dans un contexte ;
- une même expression peut avoir plusieurs fonctions ;
- l'aide pédagogique devient artificiellement dépendante de la structure lexicale.

Cette option convient à `pero` ou `mais`, mais devient fragile pour `sin embargo`, `por tanto`, `parce que` ou `de plus`.

### Option B - Objet pédagogique séparé

Cette option fait de `connector_help` un objet autonome, capable de référencer facultativement une entrée lexicale.

**Avantages**

- prise en charge naturelle des expressions simples et multi-mots ;
- séparation claire entre connaissance lexicale et aide pédagogique ;
- évolution possible vers plusieurs fonctions ou plusieurs formulations ;
- cohérence avec la distinction déjà retenue entre connaissance Dico-IC, analyse contextuelle et rendu Seven Sieves.

**Limites**

- nouvel objet à administrer et valider ;
- mécanisme de reconnaissance des séquences à préciser ;
- risque d'un catalogue parallèle au lexique si les liens restent trop faibles.

### Option C - Réutilisation d'un mécanisme existant

Plusieurs mécanismes actuels pourraient sembler disponibles, mais aucun n'est pleinement adapté :

- `form_relation` décrit des relations d'intercompréhension entre formes ; elle ne doit pas devenir un support de fonctions discursives ;
- `pattern_rule` représente des correspondances ou transformations réutilisables ; un connecteur n'est pas une transformation graphique ;
- `ic_feature` pourrait accueillir un prototype générique, mais rendrait la structure, la validation et les expressions multi-mots peu lisibles ;
- une catégorie grammaticale dans `lexical_form` peut signaler qu'un lemme est un connecteur, mais ne suffit pas à porter l'aide pédagogique.

La réutilisation seule économiserait un objet au prix d'une ambiguïté durable du modèle.

### Comparaison

| Option | Simplicité immédiate | Cohérence métier | Multi-mots | Extensibilité |
|---|---:|---:|---:|---:|
| A. Attaché à `lexical_entry` | Forte | Moyenne | Faible | Moyenne |
| B. Objet séparé | Moyenne | Forte | Forte | Forte |
| C. Mécanisme existant | Forte en apparence | Faible | Faible | Faible |

### Architecture recommandée

La solution la plus équilibrée est un objet `connector_help` séparé, avec un lien lexical optionnel lorsqu'il est pertinent. L'expression reconnue demeure explicite dans l'objet afin de ne pas imposer au lexique actuel la représentation immédiate de locutions.

Cette orientation ne préjuge pas de la future structure SQL. Elle fixe seulement la frontière métier :

```text
lexique canonique
≠
expression discursive observée
≠
aide pédagogique affichée
```

## 5. Intégration future dans Seven Sieves

### Parcours conceptuel

```text
texte
↓
token ou séquence de tokens
↓
reconnaissance exacte d'une expression validée
↓
connector_help
↓
fonction discursive
↓
indice pédagogique
```

La reconnaissance doit pouvoir porter sur une séquence, et pas seulement sur un token. Une future réponse d'analyse devra donc identifier la portée de l'enrichissement, par exemple au moyen d'offsets ou de plusieurs indices de tokens. Ce point est plus structurant que le volume du catalogue.

### Exemples de rendu

**`sin embargo`**

```text
Connecteur logique

Fonction : opposition

L'auteur introduit probablement une idée qui contraste avec ce qui précède.

Exemple : sin embargo / cependant

Prudence : la nuance exacte dépend du contexte.
```

**`porque`**

```text
Connecteur logique

Fonction : cause

La proposition qui suit donne probablement une raison ou une explication.

Exemple : porque / parce que
```

**`por tanto`**

```text
Connecteur logique

Fonction : conséquence

L'auteur présente probablement un résultat ou une déduction.

Exemple : por tanto / donc
```

**`además`**

```text
Connecteur logique

Fonction : addition

L'auteur ajoute probablement une information ou un argument.

Exemple : además / de plus
```

Seven Sieves devrait seulement mettre en évidence la séquence et rendre l'aide reçue. Il ne devrait ni administrer le catalogue, ni écrire en base, ni transformer la fonction discursive en état apprenant.

## 6. Cohérence avec les tamis 4, 5 et 6

### Tamis 4

Le tamis 4 aide à reconnaître un mot par une correspondance grapho-phonétique visible. `connector_help` ne décrit pas la forme sonore ou graphique du connecteur. Il ne relève donc pas de ce tamis, même si un même mot peut recevoir simultanément les deux types d'aide.

### Tamis 5

Le tamis 5 est le voisin le plus proche : il aide à reconstruire l'organisation syntaxique et les relations entre groupes. Un connecteur contribue lui aussi à l'organisation du texte.

Cependant, une fonction discursive comme opposition ou conséquence se situe souvent au-dessus de la syntaxe d'une proposition. La réduire à un `syntax_role` ferait perdre sa portée pédagogique.

La position recommandée est donc :

- `connector_help` reste un objet indépendant dans Dico-IC ;
- son rendu peut être regroupé sous le tamis 5 dans une première interface, si Seven Sieves doit absolument conserver sept catégories ;
- son type public doit rester explicite, par exemple `connector_help` ou `discourse_connector`, et non être assimilé à un rôle syntaxique.

À plus long terme, les aides discursives pourraient constituer une couche transversale distincte des sept tamis historiques.

### Tamis 6

Le tamis 6 explique la forme grammaticale d'un mot à partir d'une connaissance morphologique. `connector_help` explique la relation logique portée par une expression. Les deux suivent la même exigence de prudence, mais ne portent pas sur le même objet.

Le principe du tamis 6 reste pertinent :

```text
si la connaissance est validée
→ on l'explique

si la fonction est seulement supposée
→ on reste silencieux ou prudent
```

## 7. Cas concrets V0

| Expression | Langue | Fonction V0 | Aide pédagogique possible |
|---|---|---|---|
| `sin embargo` | ES | Opposition | Une idée contrastée ou une réserve va probablement suivre. |
| `pero` | ES | Opposition | La seconde idée limite ou contredit probablement la première. |
| `porque` | ES | Cause | La proposition introduit probablement une raison. |
| `por tanto` | ES | Conséquence | La proposition présente probablement un résultat ou une déduction. |
| `además` | ES | Addition | Un élément supplémentaire va probablement être ajouté. |
| `cependant` | FR | Opposition | Une idée contrastée ou une réserve va probablement suivre. |
| `mais` | FR | Opposition | La seconde idée limite ou contredit probablement la première. |
| `parce que` | FR | Cause | La proposition introduit probablement une raison. |
| `donc` | FR | Conséquence | La proposition présente probablement un résultat ou une déduction. |
| `de plus` | FR | Addition | Un élément supplémentaire va probablement être ajouté. |

Ces rapprochements ne signifient pas que les expressions sont interchangeables dans tous les contextes. Ils fournissent un point d'appui pédagogique, non une équivalence traductionnelle absolue.

## 8. Risques et questions ouvertes

### Polyfonctionnalité

Un même connecteur peut changer de nuance selon le contexte. `donc` peut notamment exprimer une conséquence, une reprise ou une transition. Une V0 doit sélectionner des emplois prototypiques et afficher une prudence, sans prétendre résoudre toute ambiguïté.

### Expressions multi-mots

La reconnaissance de `sin embargo` ou `parce que` impose une portée sur plusieurs tokens. Le futur contrat ne devra pas attacher artificiellement toute l'aide à un seul mot.

### Fonction et équivalence

Deux expressions peuvent partager une fonction sans être des traductions exactes. La fonction discursive et l'éventuel rapprochement interlinguistique doivent rester deux informations conceptuellement distinctes.

### Granularité pédagogique

Une taxonomie trop fine serait difficile à comprendre et à administrer. Une taxonomie trop large masquerait des différences importantes. La V0 doit être évaluée avec des enseignants avant de séparer opposition, concession et restriction.

### Validation

Le catalogue devra conserver une provenance et un statut. Une proposition issue d'un texte ou d'une IA ne devrait pas devenir automatiquement une connaissance affichée comme certaine.

## 9. Recommandation finale

### Architecture recommandée

Retenir conceptuellement un objet pédagogique autonome `connector_help`, capable de représenter une expression simple ou multi-mots et de référencer facultativement une entrée lexicale existante.

Ce choix :

- respecte le rôle canonique du lexique ;
- ne détourne ni `form_relation`, ni `pattern_rule`, ni `ic_feature` ;
- permet une aide centrée sur la structure du discours ;
- reste compatible avec une future administration et un rendu stateless dans Seven Sieves.

### Périmètre V0 recommandé

- deux langues : espagnol et français ;
- cinq fonctions : addition, opposition, cause, conséquence, chronologie ;
- un catalogue court d'expressions validées ;
- reconnaissance exacte de formes ou séquences ;
- une aide courte, un exemple et une prudence ;
- aucune désambiguïsation contextuelle ;
- aucune écriture depuis Seven Sieves ;
- aucune donnée apprenante.

Un premier prototype pourrait reprendre la méthode du tamis 4 : un petit catalogue contrôlé permettrait d'évaluer la valeur pédagogique avant de figer un modèle persistant. Si le concept est validé, l'étape suivante pourrait suivre la logique du tamis 6 : connaissance validée dans Dico-IC, enrichissement public produit par `/analysis`, rendu simple dans Seven Sieves.

### Ce qui peut attendre une V1

- administration complète des connecteurs ;
- variantes et locutions discontinues ;
- fonctions multiples selon le contexte ;
- détection linguistique ou NLP ;
- liens structurés entre équivalents multilingues ;
- hiérarchie fine des fonctions discursives ;
- adaptation du message au niveau de l'apprenant.

## Conclusion

`connector_help` peut devenir un objet pédagogique majeur de Dico-IC. Il répond à un besoin attesté par les entretiens : aider l'apprenant à comprendre non seulement les mots, mais le mouvement du raisonnement.

La prudence principale porte moins sur la quantité de données que sur la frontière du concept. Le connecteur doit rester une expression discursive contextualisable, accompagnée d'une aide pédagogique validée. Il ne doit être réduit ni à une traduction, ni à une catégorie grammaticale, ni à un rôle syntaxique.

La proposition reste exploratoire. Elle fournit un cadre pour une expérimentation V0, sans constituer une décision de schéma ou d'implémentation.
