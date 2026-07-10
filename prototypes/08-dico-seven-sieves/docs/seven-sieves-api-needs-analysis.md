# Besoins API de Seven Sieves Explorer pour Dico-IC

## Statut du document

Ce document est une analyse exploratoire du premier client réel de Dico-IC : `Seven Sieves Explorer`, dans sa version `index-0.0.8.2.html`.

Il ne décrit ni une API définitive ni une refonte du modèle SQL. Il cherche une première frontière utile et réversible entre :

- une base administrable par des enseignants ;
- des connaissances linguistiques réutilisables ;
- l'état local d'une activité apprenante.

La vision centrale retenue est la suivante :

> Dico-IC est une base administrable et une API destinée à alimenter Seven Sieves Explorer et, progressivement, d'autres applications d'intercompréhension.

## 1. Ce que le prototype fait aujourd'hui

Seven Sieves Explorer présente un texte espagnol à un lecteur francophone. Il permet d'activer l'un des sept tamis, de repérer ou sélectionner des mots, d'obtenir des explications et de qualifier chaque mot comme compris, douteux ou inconnu.

Toutes les données et toute la logique sont actuellement embarquées dans un seul fichier HTML. Le prototype joue donc simultanément les rôles suivants :

- contenu pédagogique ;
- mini-base lexicale ;
- moteur de règles ;
- annotateur du texte ;
- interface et état de session apprenant.

Le premier enjeu pour Dico-IC n'est pas d'absorber l'ensemble du prototype. Il est de séparer prudemment ce qui peut être administré ou mutualisé de ce qui doit rester dans l'application.

## 2. Inventaire des données codées en dur

### 2.1 Texte source

Le prototype contient directement dans `rawText` un texte espagnol de cinq phrases portant sur :

- l'organisation internationale ;
- l'éducation scientifique ;
- la coopération culturelle ;
- les langues romanes ;
- la compréhension progressive et les stratégies de lecture.

Le texte ne possède pas d'identifiant, de titre de ressource, d'auteur, de provenance, de licence, de niveau, de version ni de statut de publication.

### 2.2 Langues

Les langues sont implicites ou codées dans les libellés :

- espagnol : langue du texte ;
- français : langue de médiation et de comparaison principale ;
- italien : langue de comparaison dans le lexique pan-roman ;
- portugais : langue de comparaison dans le lexique pan-roman.

Le couple pédagogique `ES → FR` est affiché en dur. Il n'existe aucun sélecteur de langue et aucune configuration dynamique de la langue source, de la langue de médiation ou des langues comparées.

### 2.3 Les sept tamis

Chaque tamis possède un numéro, un titre, une description, un texte d'indice, un micro-guide et parfois des libellés de légende :

1. Lexique international
2. Lexique pan-roman
3. Correspondances phonétiques
4. Graphies / prononciations
5. Syntaxe pan-romane
6. Morphosyntaxe
7. Préfixes / suffixes

Le tamis actif est un état local. En revanche, les intitulés, descriptions, consignes et choix de tamis disponibles constituent une configuration pédagogique.

### 2.4 Candidats du lexique international

Le tamis 1 contient une liste fermée d'environ trente formes espagnoles considérées comme transparentes ou quasi transparentes pour un lecteur francophone, par exemple :

- `organización`
- `internacional`
- `educación`
- `científica`
- `cooperación`
- `comunicación`
- `información`
- `investigación`
- `metodología`
- `reflexión`

Cette liste mélange deux niveaux :

- une propriété lexicale potentiellement réutilisable ;
- la sélection des mots pertinents dans ce texte et pour ce public francophone.

### 2.5 Suffixes suivis

Le tamis 7 utilise une liste de onze finales espagnoles :

```text
ción, sión, dad, mente, al, ible, able, ivo, iva, ico, ica
```

La détection repose uniquement sur `endsWith`. La liste n'indique pas explicitement la langue source, la langue cible, la catégorie grammaticale, les exceptions ni un degré de fiabilité.

### 2.6 Lexique pan-roman

Le tamis 2 contient vingt entrées espagnoles environ. Chaque entrée associe :

- une forme espagnole utilisée comme clé ;
- une forme française ;
- une forme italienne ;
- une forme portugaise ;
- un libellé libre de famille ;
- une note pédagogique.

Exemples de clés :

```text
lenguas, románicas, estudiantes, universidades, palabra,
base, común, cultural, sentido, manera, mejor, muchos,
elementos, familiares, duraderas, desconocidos, comprender,
observan, permite, textos
```

Cette structure mélange formes lexicales, regroupement sémantique ou étymologique et commentaire destiné à l'apprenant.

### 2.7 Règles de transformation

Le tamis 3 contient neuf correspondances de finales de l'espagnol vers le français :

| Source | Cible | Force déclarée |
|---|---|---|
| `ción` | `tion` | forte |
| `sión` | `sion` | forte |
| `dad` | `té` | forte |
| `mente` | `ment` | forte |
| `ico` | `ique` | partielle |
| `ica` | `ique` | partielle |
| `able` | `able` | forte |
| `ible` | `ible` | forte |
| `al` | `al` | partielle |

Chaque règle possède une explication. L'application est mécanique : une seule règle, la première correspondante, remplace une finale si le mot est suffisamment long.

### 2.8 Phénomènes grapho-phoniques

Le tamis 4 contient huit détecteurs :

- `ñ` proche de `gn` ;
- `ll` comme zone de comparaison avec `ill` ou `y` ;
- `h` initial généralement muet ;
- `qu` comme indice de prononciation ;
- `gu` comme indice de prononciation ;
- `j` espagnol ;
- `c` devant `e` ou `i` ;
- `z` comme zone de variation graphique et phonétique.

Chaque détecteur contient un libellé, une condition JavaScript, une explication et une formulation de prudence. Certaines conditions sont de simples inclusions, d'autres portent sur la position ou utilisent une expression régulière.

### 2.9 Signaux morphosyntaxiques

Le tamis 6 contient cinq familles de signaux :

- déterminant probable : liste `la`, `el`, `una` ;
- forme verbale probable : liste fermée de huit formes du texte ;
- infinitif probable : liste fermée de six formes du texte ;
- adverbe en `-mente` : règle productive simplifiée ;
- pluriel possible en `-s` ou `-es` : règle productive simplifiée.

Chaque signal possède un libellé, une condition, une explication et une prudence. Les listes de formes sont liées au texte, alors que les règles sur les finales aspirent à être réutilisables.

### 2.10 Rôles syntaxiques

Le tamis 5 associe les mots du texte à trois rôles très simplifiés :

```text
subject, verb, complement
```

L'affichage utilise les libellés `Sujet probable`, `Verbe probable` et `Complément probable`, avec le patron :

```text
[Sujet] → [Verbe] → [Complément]
```

Les annotations sont indexées par forme normalisée et non par occurrence. Deux occurrences identiques ne peuvent donc pas recevoir des rôles différents. Plusieurs mots fonctionnels ou infinitifs sont rangés dans le rôle générique `complement`.

Ces rôles décrivent le texte courant ; ils ne constituent pas des propriétés lexicales stables.

### 2.11 Feedbacks et aides pédagogiques

Le prototype contient plusieurs niveaux de feedback codés en dur :

- aide générale et conseil de lecture ;
- descriptions, indices et micro-guides propres à chaque tamis ;
- infobulles issues des règles ou du lexique ;
- explications positives et négatives pour chaque tamis ;
- formulations de prudence ;
- légendes `forte`, `partielle`, `sujet`, `verbe`, `complément` ;
- feedback global selon le nombre de sélections cohérentes : aucune, moins de cinq, au moins cinq ;
- comparaison entre sélections `cohérentes` et `discutables` ;
- rappel explicite que le résultat est un support de discussion et non une note finale.

Une partie de ces textes explique une connaissance linguistique et peut accompagner la règle correspondante. Les encouragements, seuils et messages d'interface relèvent davantage de la configuration de l'activité ou du client.

### 2.12 Statuts et données de session

Le prototype conserve uniquement en mémoire :

- le tamis actif ;
- le mot inspecté ;
- les mots sélectionnés ;
- le statut d'un mot : `none`, `known`, `doubt`, `unknown` ;
- les compteurs de sélection et de réponses considérées cohérentes ;
- les marques visuelles `correct` et `incorrect` après comparaison.

Ces données sont effacées par la réinitialisation et ne survivent pas au rechargement de la page.

## 3. Classement des données

### 3.1 Contenus administrables par des enseignants

À court terme, les contenus administrables pourraient être :

- le texte et ses métadonnées minimales ;
- la langue source, la langue de médiation et les langues de comparaison ;
- les tamis activés pour une activité ;
- les consignes, descriptions, indices et messages pédagogiques de l'activité ;
- les annotations de mots ou, de préférence, d'occurrences dans le texte ;
- la sélection de candidats du tamis 1 pour ce texte et ce public ;
- les rôles syntaxiques simplifiés attribués aux occurrences ;
- les exceptions ou validations manuelles aux détections automatiques ;
- les seuils et formulations du feedback global, si leur administration devient réellement utile.

Les textes génériques de l'interface ne doivent pas nécessairement entrer immédiatement dans Dico-IC. Seuls ceux qu'un enseignant doit adapter à une activité justifient une administration côté serveur.

### 3.2 Règles linguistiques réutilisables

Les ressources mutualisables sont :

- le catalogue des langues ;
- les formes lexicales dans chaque langue ;
- les relations entre formes : cognat fort, cognat faible, faux ami ou équivalence partielle ;
- les familles pan-romanes, sous réserve de préciser ce que signifie exactement une famille ;
- les règles de correspondance entre langues ;
- les suffixes et autres patrons, lorsqu'ils sont rattachés à une langue et à une fonction ;
- les phénomènes grapho-phoniques et leurs formulations de prudence ;
- les signaux morphologiques productifs, comme `-mente` ou certaines marques du pluriel ;
- les explications, exemples, sources et degrés de confiance liés à une règle ou une relation.

Une règle réutilisable doit rester explicable, limitée à une paire ou un groupe de langues et distinguée d'une vérité absolue.

### 3.3 Données d'usage ou apprenant à ne pas stocker dans Dico-IC maintenant

Les éléments suivants doivent rester dans Seven Sieves Explorer, au moins pour le premier périmètre :

- le tamis actuellement ouvert ;
- le mot actuellement inspecté ;
- les mots sélectionnés pendant la session ;
- les statuts `compris`, `doute` et `inconnu` ;
- les compteurs et couleurs de progression ;
- le résultat `cohérent` ou `discutable` d'une sélection ;
- les événements de clic, double-clic et survol ;
- l'historique individuel, la notation et les profils apprenants.

Ces données peuvent rester locales et éphémères. Leur stockage introduirait prématurément des questions d'identité, de suivi pédagogique, de consentement et de protection des données qui ne sont pas nécessaires au rôle lexical de Dico-IC.

## 4. Première frontière fonctionnelle pour l'API

### 4.1 Besoin prioritaire : charger une activité

Seven Sieves Explorer doit pouvoir recevoir :

- un identifiant d'activité ;
- le texte ;
- ses langues ;
- les tamis activés ;
- les consignes et annotations éditoriales utiles ;
- une version de la ressource.

Besoin conceptuel :

```text
GET /activities/{activity_id}
```

Le nom de la route reste indicatif. Le besoin important est de ne plus coder le texte et sa configuration dans le fichier HTML.

### 4.2 Besoin prioritaire : analyser le texte en une requête groupée

L'application a besoin d'une analyse de plusieurs tokens, et non d'un appel réseau par mot et par tamis.

Besoin conceptuel :

```text
POST /analysis
```

Entrée minimale :

- texte ou liste d'occurrences ;
- langue source ;
- langue de médiation ;
- langues comparées ;
- tamis demandés.

Sortie minimale par occurrence :

- forme originale et forme normalisée ;
- position dans le texte ;
- correspondances trouvées par tamis ;
- identifiant stable de la forme, relation ou règle mobilisée ;
- explication et prudence ;
- confiance ou force déclarée ;
- indication de provenance : règle automatique ou annotation enseignante.

La position est importante : le prototype actuel raisonne par mot normalisé et perd les différences entre occurrences.

### 4.3 Besoin lexical ciblé

Pour inspecter un mot ou expliquer un résultat, le client doit pouvoir demander :

- une forme dans une langue donnée ;
- ses formes apparentées dans les langues demandées ;
- les types de relation et scores ;
- les notes pédagogiques disponibles ;
- les faux amis éventuels.

Besoin conceptuel :

```text
GET /lexical-forms?language=es&lemma=información&compare=fr,it,pt
```

### 4.4 Besoin de règles filtrées

Le client doit pouvoir récupérer les règles applicables à un couple de langues et à un tamis :

```text
GET /rules?source=es&target=fr&type=suffix
```

Une règle exposée à l'API devrait au minimum fournir :

- son type ;
- les langues source et cible ;
- le patron source et le patron cible ;
- une explication ;
- une prudence éventuelle ;
- une fiabilité ;
- des exemples ;
- un statut permettant de distinguer brouillon et règle validée.

### 4.5 Besoin d'administration, dans un second temps

Une interface enseignante aura probablement besoin de créer ou modifier :

- des activités et textes ;
- leur configuration de tamis ;
- des annotations d'occurrences ;
- des notes pédagogiques ;
- éventuellement des propositions de formes, relations et règles.

Cette administration ne doit pas être confondue immédiatement avec la validation linguistique. Un enrichissement enseignant peut rester une proposition ou une donnée propre à l'activité.

### 4.6 Ce que l'API n'a pas besoin de faire maintenant

Le premier contrat n'a pas besoin :

- d'authentifier ou profiler les apprenants ;
- de sauvegarder chaque clic ;
- de calculer une note ;
- de conserver les statuts de compréhension ;
- de fournir une traduction complète ;
- de produire une analyse syntaxique générale ;
- de remplacer toute la logique d'affichage de Seven Sieves Explorer.

## 5. Comparaison avec le schéma SQL actuel

### 5.1 Déjà représentable

| Besoin | Représentation actuelle | Appréciation |
|---|---|---|
| Catalogue des langues | `language` | Directement représentable |
| Formes espagnoles, françaises, italiennes et portugaises | `lexical_form` | Directement représentable si les entrées pivots sont définies |
| Regroupements lexicaux | `lexical_entry` | Partiellement représentable comme pivot sémantique |
| Cognats et faux amis | `form_relation` | Bien aligné avec la vision centrale |
| Force et confiance d'une relation | `score`, `confidence_score` | Représentable, sens à stabiliser |
| Notes et provenance lexicales | `notes`, `source_label` | Représentable de manière simple |
| Transformations `es → fr` | `pattern_rule` | Structure de base déjà présente |
| Exemples et fiabilité des règles | `examples`, `reliability_score` | Déjà prévus |
| Traits attachés à une forme | `ic_feature` | Peut porter transparence ou catégorie expérimentale |

Le mini-lexique pan-roman peut donc être reconstruit à partir de `lexical_entry`, `lexical_form` et `form_relation`. Il ne devrait pas rester un objet JavaScript séparé à long terme.

### 5.2 Représentable mais de manière ambiguë ou insuffisante

#### Transparence pour un public francophone

`ic_feature` peut stocker un `TRANSPARENCY_SCORE`, mais le modèle ne précise pas :

- la langue connue par l'apprenant ;
- le contexte ou le texte concerné ;
- le tamis qui mobilise le trait ;
- la différence entre score calculé et validation enseignante.

#### Famille pan-romane

`lexical_entry` regroupe des formes autour d'un sens, mais le champ libre `family` du prototype peut désigner tour à tour un radical, une ressemblance, une famille étymologique ou une série pédagogique. Ces notions ne doivent pas être fusionnées sans clarification.

#### Suffixes et règles grapho-phoniques

`pattern_rule` possède les langues et patrons nécessaires, mais ne formalise pas encore :

- l'opérateur d'application : suffixe, préfixe, inclusion ou expression régulière ;
- la position du patron ;
- la priorité entre règles ;
- les exceptions ;
- la formulation de prudence ;
- l'état de validation ou d'activation.

Un suffixe seulement observé, sans transformation cible, s'insère aussi difficilement dans un modèle où `target_pattern` est obligatoire.

#### Signaux morphosyntaxiques

Une forme précise peut recevoir un `ic_feature`, et une finale productive peut être approchée par `pattern_rule`. Le modèle ne distingue toutefois pas clairement :

- une annotation lexicale permanente ;
- une règle productive ;
- une annotation issue du contexte courant.

### 5.3 Manques pour le premier client

Le schéma ne représente pas actuellement :

- une activité pédagogique ;
- un texte et ses métadonnées ;
- la langue de médiation d'une activité ;
- les tamis activés et leur configuration ;
- les occurrences ou positions des tokens ;
- une annotation rattachée à une occurrence précise ;
- une validation ou exception enseignante propre à un texte ;
- les consignes et feedbacks configurables d'une activité ;
- le statut de publication ou de validation d'une ressource.

Il s'agit du principal écart entre le modèle actuel, centré sur le lexique, et Seven Sieves Explorer, centré sur l'exploration d'un texte.

Ce constat ne justifie pas encore une refonte complète. Une première API peut servir les activités depuis une structure simple distincte, puis confirmer les besoins avant toute extension SQL.

### 5.4 Éléments volontairement absents

L'absence de tables utilisateur, session, progression ou réponse apprenante est cohérente avec le périmètre recommandé. Il n'est pas nécessaire de combler ce manque maintenant.

## 6. Limites des procédures stockées actuelles pour l'API

Les procédures présentes fournissent un premier accès aux relations, cognats, faux amis et similarités. Elles ne constituent pas encore un contrat suffisant pour Seven Sieves Explorer.

Points observés :

- les recherches prennent généralement un lemme sans langue source, ce qui peut être ambigu ;
- `sp_get_cognates` suit seulement le sens source de la relation et ne filtre pas explicitement les types de cognat ;
- `sp_get_false_friends` suit également une seule direction ;
- les résultats ne sont pas filtrables par langues cibles ;
- `sp_get_similarity` utilise une comparaison par égalité ou inclusion de chaînes très simplifiée ;
- aucune procédure ne renvoie les règles de `pattern_rule` ;
- aucune procédure n'analyse un lot de mots ou un texte ;
- aucune procédure ne gère de contenu pédagogique ou d'annotation de texte.

Ces divergences doivent être signalées, sans transformer immédiatement les procédures. La future couche API peut d'abord clarifier les entrées et sorties attendues avant de décider si elle appelle des procédures, des requêtes SQL ou une combinaison des deux.

## 7. Éléments encore trop expérimentaux

Les éléments suivants ne devraient pas être figés comme contrat stable :

- la définition des sept tamis et leur frontière exacte ;
- la liste fermée des mots transparents ;
- les transformations mécaniques sans exceptions ;
- la notion libre de `family` dans le lexique pan-roman ;
- le score de transparence et la distinction entre force et confiance ;
- l'usage générique de `ic_feature` ;
- l'exécution technique des `pattern_rule` ;
- les trois rôles syntaxiques appliqués par forme plutôt que par occurrence ;
- le seuil de cinq sélections pour un feedback positif ;
- la similarité approximative de `sp_get_similarity`.

Ils peuvent être exposés comme données de démonstration ou résultats expérimentaux, avec provenance et prudence, mais pas comme vérités linguistiques stabilisées.

## 8. Proposition de périmètre minimal

Sans décider encore d'une structure SQL nouvelle, un premier incrément utile serait :

1. Servir une activité de lecture identifiée avec son texte et ses langues.
2. Fournir une analyse groupée des occurrences pour les tamis 1 à 4 et 7, là où le modèle lexical et les règles sont les plus proches des besoins.
3. Retourner systématiquement explication, prudence, confiance et provenance.
4. Permettre une correction ou annotation enseignante propre à l'activité.
5. Garder les tamis 5 et 6 comme annotations expérimentales du prototype tant que leur généralisation n'est pas éprouvée.
6. Garder entièrement côté client les sélections et statuts apprenants.

Cette tranche recentre Dico-IC sans l'élargir prématurément : le cœur lexical existant alimente une activité textuelle réelle, tandis que les besoins d'administration sont observés sur un cas concret.

## 9. Questions ouvertes à valider sur le terrain

- Un enseignant administre-t-il un texte complet ou seulement des annotations sur un texte importé ?
- Les sept tamis sont-ils fixes, ou leur nom, ordre et disponibilité varient-ils selon le scénario pédagogique ?
- Une annotation enseignante doit-elle rester propre à une activité ou pouvoir être proposée comme ressource mutualisée ?
- La langue de médiation est-elle toujours le français ?
- Les notes du lexique pan-roman doivent-elles être communes à tous les textes ou adaptées au contexte ?
- L'analyse doit-elle partir du texte brut ou d'une tokenisation déjà validée par l'enseignant ?
- Une règle peut-elle être affichée sans avoir été validée humainement ?
- Quels tamis ont réellement besoin d'un moteur côté serveur dans la première expérimentation ?

## Conclusion

Seven Sieves Explorer confirme la vision de Dico-IC comme infrastructure lexicale explicable, mais révèle un besoin absent du modèle actuel : relier ces connaissances à des textes, des occurrences et des choix pédagogiques administrables.

Le schéma actuel représente déjà correctement les langues, formes, relations lexicales et une première idée des règles. Il ne représente ni les activités ni les annotations contextuelles, et ses mécanismes génériques restent trop expérimentaux pour devenir directement une API stable.

La direction la plus prudente consiste donc à construire une première API de lecture et d'analyse groupée autour d'une activité réelle, tout en laissant l'état apprenant dans Seven Sieves Explorer. Cette séparation respecte le rôle central de Dico-IC : mutualiser des contenus et connaissances d'intercompréhension administrables, sans devenir prématurément une plateforme complète de suivi pédagogique.
