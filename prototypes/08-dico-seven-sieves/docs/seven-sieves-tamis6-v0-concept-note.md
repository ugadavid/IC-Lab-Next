# Seven Sieves — note conceptuelle Tamis 6 V0

## 1. Contexte

Dico-IC organise sa connaissance lexicale autour de lemmes canoniques dans `lexical_form`. Cette organisation évite de transformer chaque forme rencontrée dans un texte en nouvelle entrée du dictionnaire.

Les textes authentiques contiennent pourtant des formes fléchies :

```text
utiles
élèves
organizaciones
```

Pour accéder aux connaissances du lemme, le système doit pouvoir suivre le chemin :

```text
forme observée
↓
lemme canonique
↓
connaissances Dico-IC
```

La couche expérimentale `inflected_form` a été introduite pour mémoriser certains mappings attestés et validés, sans chercher à représenter toute la morphologie des langues romanes. Son premier cas de référence est :

```text
organizaciones
→ organización
→ PLURAL
```

Dans un premier temps, cette connaissance servait uniquement à retrouver le lemme. Elle restait invisible pour Seven Sieves : l’application pouvait recevoir des enrichissements lexicaux associés à `organización`, mais ne savait pas que la surface avait été reconnue comme pluriel validé.

L’expérimentation du tamis 6 a été lancée pour franchir cette dernière étape : **rendre pédagogiquement visible une connaissance morphologique que Dico-IC possède déjà**, sans demander au frontend de l’inférer.

## 2. Hypothèse pédagogique

Le tamis 6 suit le parcours :

```text
forme observée
↓
lemme connu
↓
indice morphologique
↓
compréhension plus précise
```

Devant `organizaciones`, le lecteur peut ainsi comprendre deux choses distinctes :

- le contenu lexical renvoie à `organización` ;
- la forme du texte exprime un pluriel.

L’indice ne remplace pas la lecture de la phrase. Il rend visible une information grammaticale utile : le texte évoque plusieurs éléments relevant du lemme `organización`.

### Différence avec le tamis 4

```text
Tamis 4
→ reconnaître un mot ou une famille grâce à sa forme visible

Tamis 6
→ comprendre la valeur grammaticale de la forme observée
```

Exemple sur une même famille :

- tamis 4 : `-ción / -tion` rapproche `organización` de `organisation` ;
- tamis 6 : `organizaciones` est identifié comme pluriel validé de `organización`.

Les deux tamis peuvent donc concerner un même token sans être redondants. Le premier soutient la reconnaissance lexicale ; le second précise le nombre grammatical.

## 3. Choix retenu pour la V0

La V0 commence uniquement par :

```text
PLURAL validé
```

Ce choix a été préféré à une règle graphique générale parce qu’il offre le niveau de certitude le plus élevé avec le modèle actuel.

L’indice apparaît seulement si :

- la surface a été résolue par `inflected_form` ;
- le mapping possède le statut `VALIDATED` ;
- le nombre enregistré est `PLURAL` ;
- le lemme cible est un nom dans le périmètre backend actuel ;
- le tamis 6 a été demandé.

La V0 n’utilise :

- aucune heuristique frontend ;
- aucune règle en `-s` ou `-es` ;
- aucune suppression de suffixe ;
- aucune reconstruction de lemme ;
- aucune déduction à partir de la seule ressemblance entre surface et lemme ;
- aucun appel à un endpoint admin ;
- aucun moteur NLP.

Cette restriction est un choix de confiance, pas un manque à masquer. Le projet préfère une explication rare mais fondée à une explication fréquente mais incertaine.

## 4. Architecture technique V0

### Parcours complet

```text
inflected_form VALIDATED
↓
lecture interne par le repository
↓
génération dans POST /analysis
↓
enrichissement morphosyntactic_signal du tamis 6
↓
déclencheur strict Seven Sieves
↓
infobulle et panneau d’inspection
```

### Côté Dico-IC

Dans [`Node/src/repository.js`](../Node/src/repository.js), `loadAnalysisResources()` recherche d’abord une `lexical_form` exacte. Pour les surfaces non résolues, il consulte ensuite les mappings `inflected_form` validés.

La ressource interne transporte notamment :

```text
match_kind
inflected_form_id
inflected_grammatical_number
inflected_status
inflected_source_label
inflected_confidence_score
```

Dans [`Node/src/analysis.js`](../Node/src/analysis.js), `validatedPlural` sélectionne uniquement une résolution :

```text
match_kind = inflected_form
status = VALIDATED
number = PLURAL
part_of_speech = noun
```

Le générateur ajoute alors un enrichissement :

```text
sieve_id = 6
type = morphosyntactic_signal
source.kind = inflected_form
payload.category = validated_plural
```

La documentation publique correspondante se trouve dans [`api-analysis-contract-v0.md`](api-analysis-contract-v0.md). L’ajout reste compatible avec `contract_version: "0.1"` car il est purement additif.

### Côté Seven Sieves

La page expérimentale est :

```text
prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html
```

Son script est :

```text
prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js
```

Le nom du script reflète son origine historique dans le prototype du tamis 4. Il contient désormais également le rendu pédagogique du tamis 6. Aucun renommage n’a été réalisé afin de préserver les variantes existantes.

Deux fonctions servent de repères pour une reprise future :

- `isValidatedPluralEnrichment()` vérifie strictement le contrat ;
- `formatValidatedPluralEnrichment()` transforme le payload reçu en texte pédagogique.

Le formateur générique reste utilisé pour tous les autres enrichissements. La classe visuelle `morpho-match`, déjà associée au tamis 6, assure la surbrillance. La même représentation textuelle alimente l’infobulle et le panneau d’inspection.

### Responsabilités

| Couche | Responsabilité V0 |
|---|---|
| MariaDB / Dico-IC | conserver le mapping validé et le nombre |
| Repository | résoudre la surface et transporter la provenance interne |
| `POST /analysis` | publier un fait morphologique explicite et traçable |
| Seven Sieves | vérifier le type d’objet et l’afficher |
| Apprenant | utiliser l’indice pour interpréter le texte |

## 5. Prototype validé

### Exemple de référence

```text
forme observée : organizaciones
lemme          : organización
nombre         : PLURAL
provenance     : inflected_form VALIDATED
```

Texte de test :

```text
Las organizaciones internacionales participan en proyectos educativos.
```

### Enrichissement reçu

```json
{
  "sieve_id": 6,
  "type": "morphosyntactic_signal",
  "label": "Pluriel validé",
  "source": {
    "kind": "inflected_form",
    "id": 1,
    "label": "Dico-IC"
  },
  "payload": {
    "category": "validated_plural",
    "grammatical_number": "PLURAL",
    "lemma": "organización",
    "surface_form": "organizaciones"
  }
}
```

### Infobulle produite

```text
Indice de pluriel

Cette forme est le pluriel validé de « organización ».

Singulier :
organización

Pluriel observé :
organizaciones

Information utile :
Le texte emploie « organización » au pluriel.

Prudence :
Cette information provient d’un mapping validé dans Dico-IC.
```

La phrase pédagogique reste volontairement liée au lemme reçu. Le payload ne fournit pas la forme française plurielle `organisations`, et Seven Sieves ne la reconstruit pas.

## 6. Ce qui a été validé

### Enrichissement API

Le véritable appel `POST /analysis` produit l’objet attendu pour `organizaciones`. La provenance `inflected_form`, l’identifiant, le nombre, le lemme et la surface sont présents.

### Contrat public

`inflected_form` fait désormais partie des valeurs documentées de `source.kind`. Le type `morphosyntactic_signal` et le payload `validated_plural` donnent au client une connaissance explicite, sans lui exposer la logique SQL.

### Déclencheur strict

Le rendu spécialisé exige simultanément :

```text
sieve_id = 6
type = morphosyntactic_signal
source.kind = inflected_form
payload.category = validated_plural
payload.grammatical_number = PLURAL
lemma et surface_form présents
```

Les signaux heuristiques, les catégories probables et les enrichissements d’autres tamis ne déclenchent pas l’infobulle spécialisée.

### Coexistence avec les tamis 1 et 4

Pour le token de référence, la réponse contient simultanément :

```text
tamis 1 : lexical_transparency
tamis 4 : grapho_phonetic_signal
tamis 6 : morphosyntactic_signal
```

Le tamis 6 s’ajoute à la liste sans modifier les enrichissements existants. L’utilisateur retrouve chaque lecture en activant le tamis correspondant.

### Absence d’heuristique

Seven Sieves n’analyse ni `-s`, ni `-es`, ni la différence entre `organización` et `organizaciones`. Il affiche uniquement le fait transmis par l’API.

Les tests Node du backend sont au nombre de 74 et restent tous verts. Le formateur frontend a été vérifié avec la réponse API réelle et rejette les objets dont le déclencheur ne correspond pas.

## 7. Limites

- mappings `inflected_form` validés uniquement ;
- nombre `PLURAL` uniquement ;
- noms uniquement ;
- aucun adjectif ;
- aucun genre ;
- aucun accord ;
- aucun pluriel probable ;
- aucune règle en `-s` ;
- aucune règle en `-es` ;
- aucun NLP ;
- aucune nouvelle forme reconnue ;
- aucune localisation de l’infobulle hors du français ;
- aucune validation formelle par des enseignants ou apprenants ;
- les anciennes formes plurielles stockées comme `lexical_form` exactes ne passent pas par ce chemin ;
- le tamis 6 reste globalement `experimental`, car son périmètre général n’est pas stabilisé.

Cette V0 valide un parcours, pas une couverture morphologique.

## 8. Décision projet

Le concept est considéré comme **validé en V0** : Dico-IC peut transmettre une connaissance morphologique attestée et Seven Sieves peut l’expliquer sans la recalculer.

Le principe fondateur est :

```text
si on sait
→ on explique

si on suppose
→ on ne dit rien
```

Cette règle implique :

- une provenance explicite ;
- un statut validé ;
- un trait grammatical structuré ;
- un rendu fidèle au payload ;
- l’absence d’infobulle lorsque la confiance structurelle manque.

Elle distingue le tamis 6 V0 des heuristiques morphologiques possibles à l’avenir. Une hypothèse en `-s` ou `-es` devra être identifiée comme telle et ne pourra jamais remplacer silencieusement un mapping validé.

## 9. Perspectives

### Adjectifs validés

`inflected_form` accepte déjà conceptuellement des formes adjectivales, mais le générateur V0 est limité aux noms. Une extension future pourrait appliquer le même parcours aux adjectifs validés, avec une formulation adaptée et des tests séparés.

### Genre

Le genre ne doit être affiché que s’il est structuré, fiable et pédagogiquement utile. La forme seule ne suffit pas toujours. Une future V1 devra distinguer genre lexical, genre de la forme et accord contextuel.

### Accords

Dire qu’un mot est pluriel relève du tamis 6. Dire avec quel déterminant ou nom il s’accorde demande une analyse de plusieurs tokens et touche au tamis 5. Cette frontière doit rester visible.

### Pluriels probables

Des indices en `-s` ou `-es` pourraient augmenter la couverture, mais ils seraient nécessairement moins certains. Ils devront porter une provenance heuristique, une confiance plus faible et une formulation « pluriel probable ».

### Règles morphologiques futures

Des règles validées pourraient un jour compléter les mappings observés, notamment pour les formes fréquentes. Elles devront être évaluées par langue, documenter leurs exceptions et rester secondaires par rapport aux mappings attestés.

### Ordre de priorité durable

```text
1. mapping validé
2. paire attestée
3. règle morphologique validée
4. heuristique probable
5. aucun indice
```

Chaque extension devra conserver la priorité donnée aux connaissances validées et rendre son niveau de certitude visible.

## 10. Positionnement dans Dico-IC

Le tamis 6 V0 marque la première transmission explicite d’une connaissance morphologique depuis Dico-IC jusqu’à Seven Sieves.

Avant cette étape, `inflected_form` servait principalement de couche d’accès : la surface plurielle permettait de retrouver le lemme, puis les connaissances lexicales associées. Le client bénéficiait du résultat sans connaître la raison morphologique de la résolution.

Désormais, Dico-IC transmet aussi :

- la nature de la résolution ;
- le trait `PLURAL` ;
- le lemme concerné ;
- la surface observée ;
- la provenance validée.

Cette évolution est importante parce qu’elle rapproche le projet de sa vision centrale : une base de connaissances explicable, capable non seulement de reconnaître, mais aussi de dire **pourquoi** une forme aide à comprendre le texte.

Elle confirme également une séparation saine des responsabilités :

- Dico-IC sait et atteste ;
- l’API structure et transmet ;
- Seven Sieves met en scène ;
- l’apprenant raisonne.

## Conclusion

Le premier prototype du tamis 6 ne cherche pas à couvrir la morphologie romane. Il démontre un parcours de confiance complet sur un cas réel :

```text
organizaciones
↓
mapping validé vers organización
↓
PLURAL transmis par l’API
↓
indice pédagogique visible
```

Cette V0 établit une règle durable pour les futures extensions morphologiques : expliquer ce que Dico-IC sait, signaler clairement ce qu’il suppose, et préférer le silence à une certitude fabriquée.
