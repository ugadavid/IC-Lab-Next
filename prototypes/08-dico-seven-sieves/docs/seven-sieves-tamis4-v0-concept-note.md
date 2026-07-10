# Seven Sieves — note conceptuelle Tamis 4 V0

## 1. Contexte

Seven Sieves Explorer cherche à aider un lecteur à construire du sens dans un texte en langue romane avant de recourir à une traduction complète. Dico-IC lui fournit déjà des enrichissements lexicaux et des correspondances via `POST /analysis`.

Les premiers travaux ont toutefois montré que le tamis 4, consacré aux graphies et aux prononciations, restait peu explicite. Une expérimentation locale a donc été lancée dans Seven Sieves pour répondre à une question simple : **une courte indication grapho-phonétique, affichée au bon endroit, aide-t-elle à poursuivre la lecture ?**

Le choix d’un prototype frontend avait deux objectifs :

- tester rapidement la forme pédagogique de l’indice ;
- éviter de faire évoluer Dico-IC avant de savoir quelles connaissances méritent réellement d’être partagées et administrées.

Cette expérimentation ne redéfinit pas Dico-IC. Elle sert à faire émerger, depuis des textes observables, de futurs objets pédagogiques possibles.

## 2. Hypothèse pédagogique

Le prototype repose sur le parcours suivant :

```text
mot observé
↓
indice de lecture
↓
raisonnement par rapprochement
↓
hypothèse de compréhension
```

Il s’oppose à un parcours réduit à :

```text
mot observé
↓
traduction fournie
```

L’indice ne donne pas directement le sens. Il attire l’attention sur une régularité visible et propose une comparaison susceptible de rendre le mot moins opaque.

Par exemple, devant `España`, le rapprochement `ñ / gn` permet au lecteur francophone de rapprocher la forme de `Espagne`. L’apprenant reste acteur du raisonnement : il observe, compare, formule une hypothèse et la confronte au contexte.

Un bon indice V0 doit donc être :

- bref ;
- attaché à une forme réellement présente ;
- formulé comme une aide et non comme une vérité absolue ;
- illustré par au moins un exemple ;
- accompagné d’une prudence explicite.

## 3. Catalogue V0 validé

Le catalogue V0 comprend quatre indices espagnol-français.

### `ñ ↔ gn`

**Intérêt pédagogique :** ne pas lire `ñ` comme un simple `n` et reconnaître une proximité graphique et sonore possible avec le français `gn`.

**Exemple :** `España / Espagne`.

**Prudence :** indice utile, mais pas règle universelle. La présence de `ñ` ne suffit ni à traduire le mot, ni à garantir une correspondance française en `gn`.

### `-ción ↔ -tion`

**Intérêt pédagogique :** reconnaître rapidement de nombreux noms savants ou abstraits proches du français.

**Exemple :** `organización / organisation`, `educación / éducation`.

**Prudence :** correspondance fréquente mais non systématique. La règle porte strictement sur la finale `-ción` ; `comprensión`, terminé par `-sión`, n’entre pas dans cette V0.

### `-dad ↔ -té`

**Intérêt pédagogique :** rapprocher des noms abstraits espagnols de formes françaises familières.

**Exemple :** `universidad / université`, `actividad / activité`.

**Prudence :** indice fréquent mais non systématique. Une terminaison compatible ne garantit pas à elle seule l’équivalence sémantique.

### `-mente ↔ -ment`

**Intérêt pédagogique :** repérer un adverbe probable et retrouver une base lexicale souvent transparente.

**Exemple :** `rápidamente / rapidement`, `normalmente / normalement`.

**Prudence :** indice fréquent mais non systématique. La V0 se limite à une terminaison visible et ne vérifie pas la catégorie grammaticale en contexte.

### Statut du catalogue

Ces quatre indices constituent un **noyau démonstratif validé en V0** : ils sont assez simples pour être expliqués, détectés et rendus dans Seven Sieves. Cette validation porte sur le concept et son fonctionnement technique. Elle ne constitue pas encore une validation scientifique de leur couverture ni une évaluation auprès d’enseignants et d’apprenants.

## 4. Architecture technique V0

### Principe

Le catalogue est local au frontend de la variante expérimentale Seven Sieves :

```text
réponse POST /analysis
+
indices pédagogiques locaux applicables
↓
rendu commun : surbrillance, infobulle, inspection
```

Le paquet JSON renvoyé par Dico-IC n’est pas modifié. Les indices locaux sont ajoutés uniquement lors de la lecture et du rendu dans la page.

### Emplacement des fichiers

Page expérimentale :

```text
prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html
```

Catalogue et mécanisme local :

```text
prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js
```

La page live officielle reste :

```text
prototypes/01-seven-sieves/index-api-live-0.1.html
```

### Repères pour retrouver le mécanisme

Dans le script expérimental :

- `pedagogicalHints` contient les quatre objets du catalogue ;
- `matchMode: "suffix"` distingue les terminaisons de la recherche simple dans le mot ;
- `getLocalPedagogicalEnrichments()` transforme une règle locale applicable en enrichissement affichable ;
- `getTokenEnrichments()` fusionne, pour le rendu, les enrichissements API et locaux ;
- la déduplication écarte un indice local si l’API fournit déjà le même type et le même motif.

Chaque objet local contient au minimum :

```text
tamis
langue
motif
mode de détection éventuel
titre
message
exemples
prudence
```

### Frontières confirmées

La V0 n’a entraîné :

- aucune modification de Dico-IC ;
- aucune modification de `POST /analysis` ;
- aucune modification de MariaDB ;
- aucune modification du schéma ou des scripts SQL ;
- aucune modification de Dico-IC Admin ;
- aucune modification de la page live officielle.

## 5. Ce qui a été validé

### Coexistence avec l’API

Le frontend conserve les tokens, offsets, warnings et enrichissements fournis par le contrat `0.1`. Le compteur d’enrichissements API reste celui du paquet Dico-IC ; les indices locaux ne se font pas passer pour des données serveur.

### Coexistence avec les autres tamis

Les règles locales ne sont consultées que pour le tamis 4 et pour une source espagnole. Les tamis 1, 2, 3, 5, 6 et 7 continuent d’utiliser leur comportement habituel.

### Plusieurs indices dans un même texte

Un texte peut contenir simultanément `organización`, `información`, `rápidamente`, `universidad` et d’autres occurrences compatibles. Chaque token reçoit l’indice correspondant sans empêcher les enrichissements API des autres tokens ou tamis.

### Deux modes de détection simples

- `ñ` est recherché à n’importe quelle position ;
- `ción`, `dad` et `mente` doivent terminer le token.

Cette distinction suffit au prototype et réduit quelques faux positifs évidents sans introduire de NLP.

### Non-régression

La règle initiale `ñ / gn` continue de reconnaître notamment `España`, `señal` et `compañero`. La variante expérimentale reste servable comme page HTML/JS légère, avec le même système d’infobulle et de surbrillance.

## 6. Limites

- langue source espagnole uniquement ;
- médiation formulée uniquement en français ;
- quatre règles seulement ;
- catalogue codé dans le frontend et non administrable ;
- détection purement graphique ;
- aucune lemmatisation ;
- aucune vérification de catégorie grammaticale ;
- aucune gestion structurée des exceptions ;
- aucune mesure du taux de faux positifs ;
- aucune validation formelle par des enseignants ou des apprenants ;
- aucune décision définitive sur la frontière entre tamis 3 et tamis 4.

Les finales `-ción/-tion`, `-dad/-té` et `-mente/-ment` peuvent aussi être décrites comme correspondances interlangues du tamis 3. Leur présence au tamis 4 sert ici à tester une **explication de lecture**. Une future ligne éditoriale devra attribuer à chaque tamis une intention distincte et éviter les infobulles redondantes.

## 7. Décision projet

Le concept d’**indice pédagogique local attaché à un token** est considéré comme validé en V0.

Cette décision signifie que :

- l’approche mérite d’être poursuivie ;
- le format `titre + message + exemples + prudence` constitue une base utilisable ;
- l’intégration avec le paquet API et les interactions Seven Sieves est viable ;
- de nouvelles règles peuvent être ajoutées progressivement à partir des textes réellement rencontrés.

Elle ne signifie pas que :

- les quatre règles sont universelles ;
- le catalogue est complet ;
- toutes les règles doivent être stockées dans Dico-IC ;
- l’efficacité pédagogique est déjà démontrée ;
- le tamis 4 est stabilisé.

La stratégie retenue est donc une croissance contrôlée : observer les textes, identifier un indice utile, documenter exemples et limites, le tester dans Seven Sieves, puis décider s’il mérite une validation plus large.

## 8. Perspectives

### Futurs objets pédagogiques

Le prototype donne une forme concrète à l’objet conceptuel **indice grapho-phonétique pédagogique**. Un tel objet pourrait, à terme, porter :

- langues concernées ;
- motif et contexte d’application ;
- type d’aide : rapprochement, règle de lecture ou avertissement ;
- message pédagogique ;
- exemples et contre-exemples ;
- prudence ;
- provenance, confiance et statut de validation.

Cette description reste conceptuelle. Elle ne préjuge ni d’une table SQL ni d’un endpoint.

### Lien avec le tamis 5

Le même principe peut être transposé à des patrons syntaxiques simples :

```text
groupe de mots
↓
patron pédagogique
↓
raisonnement sur « qui fait quoi »
```

La différence essentielle est l’échelle : le tamis 5 porte souvent sur plusieurs tokens. Il faudra donc réfléchir au rendu d’un groupe ou d’une relation, pas seulement d’un mot.

### Lien avec le tamis 6

Le tamis 6 peut suivre un parcours comparable autour d’une forme observée :

```text
forme fléchie
↓
indice de nombre, genre, personne ou temps
↓
lemme et rôle grammatical probables
```

`inflected_form` fournit déjà un premier accès validé pour certains pluriels. Les traits complexes devront toutefois rester calculés tant que leur stockage et leur utilité pédagogique ne sont pas établis.

### Éventuel stockage futur dans Dico-IC

Seven Sieves peut conserver :

- la surbrillance ;
- l’infobulle ;
- l’activation des tamis ;
- l’inspection et la sélection ;
- les formulations temporaires de test.

Dico-IC pourrait un jour porter les connaissances partagées et validées : motif, langues, message, exemples, prudence, source et statut. Ce déplacement deviendrait pertinent si plusieurs clients doivent utiliser les mêmes règles ou si les enseignants doivent les administrer.

Avant toute évolution du modèle, trois validations restent nécessaires :

1. utilité constatée dans des textes authentiques ;
2. validation des formulations par des enseignants ;
3. clarification de la frontière pédagogique entre tamis 3 et tamis 4.

## Conclusion

La V0 montre qu’un indice court et prudent peut s’insérer entre le mot et la traduction pour soutenir un raisonnement d’intercompréhension. Le catalogue de quatre règles est volontairement modeste : sa valeur tient moins à sa couverture qu’à la démonstration d’un mécanisme réutilisable.

La suite du projet doit conserver cette logique : partir des textes et des besoins de lecture, ajouter peu de règles, rendre leurs limites visibles, puis seulement décider lesquelles deviennent des connaissances durables de Dico-IC.
