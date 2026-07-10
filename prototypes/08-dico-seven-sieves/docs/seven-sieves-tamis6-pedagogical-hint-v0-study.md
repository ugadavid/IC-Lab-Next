# Seven Sieves — prototype conceptuel Tamis 6 V0

## Statut et objectif

Cette étude explore une première forme pédagogique du tamis 6, sans implémentation. Le périmètre est volontairement limité au **singulier et au pluriel des noms et adjectifs**.

L’hypothèse reprend le principe validé par le tamis 4 :

```text
forme observée
↓
indice pédagogique
↓
raisonnement grammatical
↓
compréhension plus précise
```

Le tamis 6 ne cherche pas d’abord à traduire le mot. Il aide à comprendre **sous quelle forme grammaticale le mot apparaît** : une entité ou plusieurs, une propriété attribuée à un élément ou à plusieurs.

Cette V0 exclut les verbes, personnes, temps, modes, accords complexes et inventaires d’exceptions. Elle ne propose ni nouvelle table, ni moteur NLP.

## 1. Cas de pluriel observables

### `organización → organizaciones`

**Ce que voit l’apprenant :** la forme du texte est plus longue que `organización` et se termine par `-es`. L’accent écrit de `-ción` n’apparaît plus dans `-ciones`.

**Ce qu’il peut déduire :** `organizaciones` désigne probablement plusieurs organisations ; `organización` est la forme de référence utile pour accéder au dictionnaire et aux rapprochements interlinguistiques.

**Intérêt pédagogique :** la forme plurielle ne bloque plus la reconnaissance du mot. Elle permet aussi de distinguer deux informations complémentaires : le sens lexical vient du lemme, le nombre vient de la flexion.

**Difficulté :** il ne s’agit pas d’un simple ajout visuel de `s`. La finale devient `-ciones` et l’accentuation graphique change. Le mapping validé est donc plus fiable qu’une suppression mécanique de `es`.

### `estudiante → estudiantes`

**Ce que voit l’apprenant :** un `s` final ajouté à une forme terminée par une voyelle.

**Ce qu’il peut déduire :** plusieurs étudiants sont probablement concernés.

**Intérêt pédagogique :** le marqueur est fréquent, visible et facile à rapprocher du pluriel français écrit.

**Difficulté :** la forme ne permet pas toujours de déduire le genre. Le tamis doit parler de nombre, sans inventer une information masculine ou féminine.

### `utilidad → utilidades`

**Ce que voit l’apprenant :** la forme terminée par une consonne reçoit `-es`.

**Ce qu’il peut déduire :** `utilidades` est probablement le pluriel de `utilidad`.

**Intérêt pédagogique :** le lecteur peut isoler une marque de pluriel et retrouver une base lexicale plus courte.

**Difficulté :** retirer `es` n’est pas une stratégie universelle. La confirmation par un mapping attesté ou une forme lexicale connue reste préférable.

### `utile → utiles`

**Ce que voit l’apprenant :** en français, la forme écrite reçoit généralement un `s` au pluriel.

**Ce qu’il peut déduire :** plusieurs noms peuvent être qualifiés d’utiles, ou plusieurs éléments utiles peuvent être évoqués selon le contexte.

**Intérêt pédagogique :** la langue de médiation fournit un point de comparaison simple avec des pluriels romans en `s`.

**Difficulté :** en français, le `s` final n’est généralement pas prononcé. La graphie renseigne le nombre, mais pas nécessairement l’écoute. De plus, `utile` peut être adjectif ou nom selon le contexte.

### `important → importants`

**Ce que voit l’apprenant :** un `s` final distingue à l’écrit le pluriel de l’adjectif français.

**Ce qu’il peut déduire :** l’adjectif qualifie probablement plusieurs éléments.

**Intérêt pédagogique :** montre qu’un adjectif, comme un nom, peut porter une marque de nombre.

**Difficulté :** l’accord avec le nom relève du contexte de la phrase. Le mot isolé permet d’indiquer « pluriel probable », mais pas d’identifier avec certitude le nom auquel il se rattache.

## 2. Cas d’adjectifs

### `utile / utiles`

**Indice visible :** `-s` dans la forme plurielle française.

**Déduction possible :** plusieurs éléments sont probablement qualifiés. Le lecteur peut revenir au lemme `utile` pour retrouver le sens lexical.

**Intérêt pédagogique :** sépare nettement le contenu lexical (« qui a de l’utilité ») de l’information grammaticale (« appliqué à plusieurs éléments »).

**Prudence :** le POS ne doit pas être déduit uniquement de la terminaison ; `utile` peut aussi être employé comme nom.

### `internacional / internacionales`

**Indice visible :** `-es` après la consonne finale de `internacional`.

**Déduction possible :** plusieurs noms sont probablement caractérisés comme internationaux, ou plusieurs éléments internationaux sont désignés.

**Intérêt pédagogique :** le mot reste très transparent malgré sa flexion. Le tamis 6 explique pourquoi la forme du texte diffère du lemme connu.

**Prudence :** `internacional` peut fonctionner comme adjectif ou comme nom selon le contexte. Le nombre est plus sûr que la catégorie grammaticale.

### `importante / importantes`

**Indice visible :** `s` final ajouté à la forme espagnole terminée par une voyelle.

**Déduction possible :** l’adjectif porte probablement un pluriel.

**Intérêt pédagogique :** fournit un exemple espagnol très régulier où le lemme reste immédiatement visible dans la forme fléchie.

**Prudence :** reconnaître le pluriel ne suffit pas à résoudre l’accord ni le rôle syntaxique dans la phrase.

### `important / importants`

**Indice visible :** `s` final dans la forme écrite française.

**Déduction possible :** plusieurs référents sont probablement qualifiés.

**Intérêt pédagogique :** permet une comparaison directe entre le marquage écrit français et espagnol.

**Prudence :** la ressemblance du mécanisme graphique ne signifie pas que toutes les règles de pluriel sont identiques entre les deux langues.

### Conséquence pour la V0

Le même indice de nombre peut concerner un nom ou un adjectif. Le prototype pédagogique ne doit pas annoncer automatiquement « nom pluriel » ou « adjectif pluriel » si Dico-IC ne possède pas une catégorie fiable pour le lemme.

Une formulation robuste est :

```text
Cette forme semble être un pluriel.
```

Une formulation plus précise n’est acceptable que si la catégorie lexicale est connue :

```text
Cette forme adjectivale est validée comme pluriel de « utile ».
```

## 3. Objet pédagogique potentiel

Nom de travail : **indice morphologique de nombre**.

### Fonction

L’objet relie une forme visible à une information grammaticale utile et, lorsque cela est connu, à sa forme de référence.

```text
surface observée
↓
nombre probable ou validé
↓
lemme / singulier de référence
↓
effet sur la compréhension de l’énoncé
```

### Contenu conceptuel minimal

Sans préjuger d’un stockage SQL, l’objet pourrait contenir :

```text
titre pédagogique
langue
forme observée
lemme canonique si connu
singulier de référence si connu
pluriel observé
catégorie grammaticale si fiable
trait : singular ou plural
marque visible éventuelle
message pour l’apprenant
exemple en contexte
prudence
provenance : mapping validé ou indice graphique
degré de confiance
```

### Deux niveaux de certitude

**Niveau 1 — mapping validé :**

```text
organizaciones
→ organización
Number = Plural
```

Le message peut être affirmatif mais rester pédagogique : « Cette forme est le pluriel validé de *organización*. »

**Niveau 2 — indice graphique :**

```text
internacionales
→ finale -es
→ pluriel probable
```

Le message doit rester hypothétique : « La finale `-es` signale souvent un pluriel en espagnol. »

### Le singulier dans cette V0

Le singulier sert principalement de **forme de référence** dans la comparaison. L’absence de `s` ou de `es` ne suffit pas à prouver qu’une forme est singulière.

Par conséquent, la V0 ne recommande pas un indice générique « absence de suffixe = singulier ». Elle affiche le singulier lorsqu’il est connu comme lemme ou membre validé de la paire.

## 4. Différence avec le tamis 4

### Tamis 4 — reconnaître le mot

Le tamis 4 exploite une graphie pour rapprocher des formes et rendre le mot reconnaissable.

```text
organización
↓
indice -ción / -tion
↓
rapprochement avec organisation
↓
hypothèse sur le sens
```

Question pédagogique : **« À quel mot ou à quelle famille cette forme peut-elle me faire penser ? »**

### Tamis 6 — comprendre la forme grammaticale

Le tamis 6 explique ce que la flexion ajoute au mot.

```text
organizaciones
↓
lemme organización + nombre pluriel
↓
plusieurs organisations
↓
interprétation plus précise de la phrase
```

Question pédagogique : **« Que m’apprend la forme de ce mot sur le nombre ? »**

### Coexistence possible

Un même token peut légitimement recevoir les deux indices :

- tamis 4 : `-ción` rappelle le français `-tion` et aide à reconnaître le lexème ;
- tamis 6 : `organizaciones` est une forme plurielle reliée à `organización`.

Les messages ne sont pas redondants : l’un soutient la reconnaissance lexicale, l’autre l’interprétation grammaticale.

Autre exemple :

```text
internacionales
```

- tamis lexical éventuel : rapprochement avec `international` ;
- tamis 6 : `-es` indique un pluriel probable de `internacional`.

## 5. Ce qui est déjà couvert

### Apport actuel d’`inflected_form`

La V0 implémentée sait déjà conserver, pour un mapping validé :

- la forme de surface ;
- sa forme normalisée ;
- le lien vers le `lexical_form` canonique ;
- le nombre `PLURAL` ;
- un statut de validation ;
- une provenance ;
- une confiance.

Pour `organizaciones`, le chemin d’analyse peut donc retrouver `organización`, puis réutiliser les connaissances lexicales associées au lemme. Le texte original et ses offsets restent inchangés.

### Ce que l’analyse fait aujourd’hui

Le repository recherche les `lexical_form` exactes en priorité, puis consulte les `inflected_form` validées pour les surfaces non résolues. Cette lecture est stateless et n’écrit rien dans la base.

Le tamis 6 actuellement généré par le moteur concerne encore une heuristique d’infinitif verbal espagnol. Le nombre `PLURAL` stocké dans `inflected_form` n’est pas encore transformé en enrichissement pédagogique de tamis 6.

Autrement dit :

```text
reconnaissance du lemme : disponible
connaissance PLURAL en base : disponible
infobulle pédagogique de nombre : non réalisée
```

### Ce qui manque conceptuellement

- une formulation pédagogique validée ;
- une priorité claire entre mapping attesté et règle graphique ;
- des mappings validés pour les formes de démonstration ;
- la décision d’afficher ou non la catégorie grammaticale ;
- des exemples de contexte courts ;
- une gestion explicite des cas ambigus ;
- une validation par des enseignants.

Ces manques ne justifient pas immédiatement une nouvelle table ou un moteur morphologique.

## 6. Catalogue minimal V0 proposé

Le catalogue recommandé contient **quatre indices**. Il distingue connaissance attestée et indice graphique.

### Indice A — pluriel validé d’une forme connue

**Déclencheur conceptuel :** mapping `inflected_form` validé.

**Exemple :** `organizaciones → organización`.

**Valeur pédagogique :** forte. Le lecteur obtient simultanément le nombre et le lemme sans que l’application invente une transformation.

**Priorité :** la plus élevée. Si ce mapping existe, il doit primer sur un indice générique en `-es`.

### Indice B — pluriel espagnol visible en `-s`

**Déclencheur conceptuel :** nom ou adjectif espagnol terminé par une voyelle, avec surface observée terminée par `s`.

**Exemples :** `estudiante/estudiantes`, `importante/importantes`.

**Valeur pédagogique :** marque fréquente, visible et facile à expliquer.

**Prudence :** sans mapping ou catégorie connue, il s’agit d’un pluriel probable, pas d’une analyse certaine.

### Indice C — pluriel espagnol visible en `-es`

**Déclencheur conceptuel :** forme espagnole terminée par `-es`, avec singulier connu ou plausible terminé par une consonne.

**Exemples :** `internacional/internacionales`, `utilidad/utilidades`.

**Valeur pédagogique :** permet de retirer mentalement une marque fréquente et de retrouver une forme plus reconnaissable.

**Prudence :** la V0 ne doit pas produire mécaniquement un lemme en supprimant `es`. Elle montre la paire si elle est connue ; sinon elle signale seulement le nombre probable.

### Indice D — pluriel français écrit en `-s`

**Déclencheur conceptuel :** nom ou adjectif français dont la paire singulier/pluriel est connue.

**Exemples :** `utile/utiles`, `important/importants`.

**Valeur pédagogique :** offre un point de médiation familier pour comprendre les marques écrites comparables dans les langues romanes.

**Prudence :** le `s` est souvent muet et le français possède de nombreuses autres formations du pluriel. La règle ne doit être appliquée qu’à des paires simples.

### Ordre recommandé

```text
1. mapping validé de la surface vers le lemme
2. paire singulier/pluriel connue
3. indice graphique simple
4. aucun signal si la confiance est insuffisante
```

L’absence de résultat est préférable à une fausse explication.

## 7. Prototypes d’infobulles Seven Sieves

### Infobulle A — `organizaciones`

```text
Indice de pluriel

Cette forme est le pluriel validé de « organización ».

Singulier : organización
Pluriel observé : organizaciones
Information utile : le texte parle de plusieurs organisations.

Prudence : le lemme et le nombre viennent ici d’un mapping validé dans Dico-IC.
```

### Infobulle B — `estudiantes`

```text
Pluriel probable en -s

La finale -s marque souvent le pluriel en espagnol après une voyelle.

Singulier possible : estudiante
Forme observée : estudiantes
Information utile : plusieurs étudiants sont probablement concernés.

Prudence : cet indice graphique doit être confirmé par le contexte ou une forme connue.
```

### Infobulle C — `internacionales`

```text
Pluriel probable en -es

Après une consonne, la finale -es marque souvent le pluriel en espagnol.

Singulier possible : internacional
Forme observée : internacionales
Information utile : plusieurs éléments semblent être qualifiés d’internationaux.

Prudence : le mot peut être nom ou adjectif selon la phrase.
```

### Infobulle D — `utiles`

```text
Indice de pluriel écrit

Le -s final marque ici une forme plurielle française.

Singulier : utile
Pluriel : utiles
Information utile : la propriété concerne probablement plusieurs éléments.

Prudence : le -s final n’est généralement pas prononcé et toutes les formes françaises ne suivent pas ce modèle.
```

### Variante pour `importants`

```text
Adjectif au pluriel

« importants » est la forme plurielle de « important ».
Le mot qualifie probablement plusieurs éléments.

Prudence : identifier le nom qualifié demande de lire le groupe ou la phrase.
```

Cette dernière prudence marque la frontière avec le tamis 5.

## 8. Perspectives

### Ajouts progressifs compatibles avec la V0

- valider quelques paires réellement rencontrées dans les textes ;
- tester les quatre formulations avec des enseignants ;
- ajouter des exemples en contexte ;
- observer si les apprenants comprennent mieux la quantité ou l’accord ;
- mesurer les faux positifs des indices `-s` et `-es` ;
- étendre ensuite prudemment aux pluriels simples italiens ou portugais.

### Ce qui doit attendre une V1

- genre masculin/féminin ;
- accords entre déterminant, nom et adjectif ;
- pluriels irréguliers ou très allomorphiques ;
- ambiguïtés multiples pour une même surface ;
- conjugaisons ;
- génération automatique de mappings ;
- paradigmes complets ;
- évolution éventuelle du contrat JSON pour porter des traits structurés supplémentaires.

### Ce qui relève plutôt du tamis 5

Le tamis 6 peut dire :

```text
importants = pluriel
```

Le tamis 5 devra expliquer :

```text
importants qualifie probablement tel nom dans ce groupe
```

La détection d’un accord ou d’une dépendance entre plusieurs mots appartient donc plutôt à la syntaxe et au contexte.

### Ce qui relève d’un futur moteur morphologique

Un moteur devient pertinent pour :

- analyser une forme jamais validée ;
- proposer plusieurs lemmes possibles ;
- distinguer nom et adjectif en contexte ;
- attribuer des traits avec un score ;
- traiter les irrégularités et alternances plus complexes.

Il n’est pas nécessaire pour démontrer la valeur pédagogique du premier catalogue. Les mappings validés et quelques paires contrôlées suffisent à tester la question centrale.

## Conclusion

Le tamis 6 peut suivre la même stratégie générale que le tamis 4, avec une différence importante : son indice ne rapproche pas d’abord deux langues, il explique la **valeur grammaticale d’une forme observée**.

Le premier prototype conceptuel peut donc reposer sur :

```text
forme plurielle observée
↓
lemme ou singulier connu
↓
indice de nombre
↓
compréhension de « un ou plusieurs »
```

`inflected_form` apporte déjà le cas le plus solide : une surface attestée, un lemme et un pluriel validé. La prochaine étape logique n’est pas d’élargir le modèle, mais de vérifier si une infobulle courte sur le nombre aide effectivement les lecteurs de Seven Sieves.
