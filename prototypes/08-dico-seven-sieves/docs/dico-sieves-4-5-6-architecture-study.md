# Dico-IC — étude d’architecture des tamis 4, 5 et 6

## 1. Résumé exécutif

Les tamis 4, 5 et 6 ne demandent pas le même type de connaissance et ne devraient pas être réunis dans une table générique.

| Tamis | Objet principal | Niveau d’analyse | Situation actuelle | Orientation recommandée |
|---:|---|---|---|---|
| 4 | Relations entre graphie et prononciation | motif dans une surface ou un lemme, parfois comparaison interlangue | heuristique espagnole codée dans l’API | petit référentiel de règles explicables, distinct à terme si les cas réels le justifient |
| 5 | Structures syntaxiques pan-romanes | groupe ou phrase contextualisée | POS lexical transformé en « rôle probable » | analyse dynamique ; ne stocker plus tard que des patrons pédagogiques réutilisables |
| 6 | Indices morphosyntaxiques portés par les formes | occurrence fléchie dans son contexte | terminaison espagnole + POS lexical ; pluriel validé via `inflected_form` | traits calculés par un moteur morphologique, avec mappings attestés prioritaires |

La recommandation est une **approche hybride différenciée** :

1. conserver les lemmes et relations lexicales comme connaissances canoniques ;
2. conserver `inflected_form` comme couche d’accès validée aux lemmes, limitée aujourd’hui au pluriel ;
3. calculer POS contextuel, traits morphologiques et dépendances pendant `POST /analysis`, sans les persister ;
4. laisser les tamis 4, 5 et 6 au statut `experimental` tant que leurs résultats ne sont pas évalués sur des textes enseignants ;
5. n’introduire une table spécialisée que pour une connaissance réutilisable, administrable et observée à plusieurs reprises.

Cette orientation évite deux confusions : une catégorie lexicale n’est pas un rôle syntaxique, et une terminaison visible n’est pas nécessairement un suffixe lexical.

## 2. Clarification des trois tamis

### 2.1 Tamis 4 — graphies et prononciations

Le tamis 4 aide l’apprenant à ne pas lire une langue voisine avec les seules habitudes de sa langue de médiation. Il attire l’attention sur un groupe graphique dont la réalisation est régulière ou pédagogiquement utile.

Exemples possibles :

- espagnol `c` devant `e/i` ;
- espagnol `ñ` et rapprochement pédagogique avec le français `gn` ou le portugais `nh` ;
- français `ph` et valeur proche de `f` ;
- variations de `qu`, `ll` ou `ch`, à condition de préciser langues, contexte et limites.

L’indice porte d’abord sur la **surface graphique**. Le lemme peut servir à retrouver une connaissance validée, mais la détection doit rester appliquée à la forme réellement vue. Une véritable information de prononciation demanderait une représentation phonologique ou au minimum une description structurée ; une simple substitution de lettres ne suffit pas.

Le tamis 4 peut couvrir :

- une régularité intra-langue : graphème vers prononciation probable ;
- une comparaison interlangue : graphèmes différents associés à des réalisations proches ;
- un avertissement de non-transparence : même graphie, réalisation différente.

Il ne doit pas être confondu avec :

- le tamis 3, qui transforme ou rapproche des formes entre langues pour aider à reconnaître un mot ;
- le tamis 7, qui identifie un affixe ayant une fonction lexicale ou grammaticale.

### 2.2 Tamis 5 — syntaxe pan-romane

Le tamis 5 aide à reconstruire « qui fait quoi » en s’appuyant sur des structures largement partagées : groupe nominal, groupe prépositionnel, noyau verbal, complément, auxiliaire et participe, ordre canonique ou variations fréquentes.

Son unité pertinente n’est généralement pas le mot isolé, mais le **groupe de mots ou la phrase**. Il combine potentiellement :

- catégories grammaticales contextuelles ;
- frontières de groupes ;
- ordre des constituants ;
- dépendances entre mots ;
- fonctions comme sujet, noyau verbal ou complément ;
- construction récurrente, par exemple `déterminant + nom`.

`lexical_form.part_of_speech = verb` indique qu’un lemme peut être verbal. Cela ne démontre pas que l’occurrence est le noyau verbal de cette phrase. Le résultat V0 « Verbe probable » est donc un indice lexical utile, mais pas encore une analyse syntaxique.

Le tamis 5 se distingue des autres tamis parce qu’il dépend directement du **contexte phrastique**. Il ne devrait ni être réduit à une liste de POS, ni produire des faits permanents sur un token qui n’existe que pendant la requête.

### 2.3 Tamis 6 — morphosyntaxe

Le tamis 6 rend visibles les marques grammaticales portées par les formes : nombre, genre, personne, temps, mode, infinitif, participe ou accord.

Exemples :

- `organizaciones` : nom, pluriel ;
- `utiles` : adjectif ou nom selon le contexte, pluriel ;
- `mangent` : verbe, troisième personne, pluriel, présent de l’indicatif ;
- `hablamos` : verbe, première personne, pluriel, avec ambiguïté temporelle possible ;
- `petites` : adjectif, féminin, pluriel dans un contexte compatible.

Il travaille sur la **forme observée**, reliée au lemme, puis désambiguïsée autant que possible par la phrase. Une terminaison seule fournit un candidat ; le POS et le contexte renforcent ou invalident ce candidat.

Il se distingue :

- du tamis 5, qui explique la structure et la fonction dans la phrase ;
- du tamis 7, qui met en valeur des morceaux de mots réutilisables, notamment dérivationnels ;
- du tamis 3, qui compare des formes entre langues.

## 3. État du modèle actuel

### `language`

**Couvre :** code, famille, caractère roman, activation.

**Peut soutenir :** sélection des règles et modèles par langue.

**Ne couvre pas :** variété régionale, alphabet phonétique, conventions morphologiques, modèle NLP ou version de ressource.

**À ne pas lui faire porter :** des règles linguistiques sous forme de colonnes ajoutées par phénomène.

### `lexical_entry`

**Couvre :** concept mutualisé, gloses et domaine sémantique.

**Peut soutenir :** retour au sens après résolution d’un lemme.

**Ne couvre pas :** occurrence textuelle, prononciation, structure syntaxique ou flexion.

**À ne pas lui faire porter :** des analyses liées à une phrase particulière.

### `lexical_form`

**Couvre :** lemme par langue, POS lexical, quelques propriétés générales comme `gender` et `number_behavior`.

**Peut soutenir :** désambiguïsation lexicale initiale et vérification d’un lemme proposé par un moteur.

**Ne couvre pas :** POS contextuel certain, traits d’une occurrence fléchie, prononciation détaillée, fonction syntaxique.

**À ne pas lui faire porter :** `mangent`, `organizaciones` ou toute forme contextuelle comme nouveau lemme ; un rôle `subject` ou `complement` ; une transcription phonétique propre à une occurrence.

### `form_relation`

**Couvre :** relations explicites entre lemmes ou formes canoniques, notamment les cognats.

**Peut soutenir :** tamis 1 et certains rapprochements lexicaux.

**Ne couvre pas :** flexion, prononciation, dépendance syntaxique, accord.

**À ne pas lui faire porter :** `HAS_INFLECTED_FORM`, `IS_SUBJECT_OF` ou des correspondances de graphèmes. Ces usages rendraient ses lectures ambiguës et son administration difficile.

### `pattern_rule`

**Couvre :** transformation d’un motif source vers un motif cible entre deux langues, avec fiabilité, description et exemples.

**Peut soutenir :** tamis 3 et 7, par exemple `-ción → -tion`.

**Limites actuelles :** cible et langue cible obligatoires, absence de mode d’application structuré (`PREFIX`, `SUFFIX`, `CONTAINS`, `REGEX`), absence de statut d’activation et aucune représentation phonétique.

**À ne pas lui faire porter :** une règle syntaxique de phrase ou un jeu libre de traits morphologiques. L’utiliser pour tous les phénomènes ferait dépendre l’interprétation de conventions cachées dans `pattern_type` et `notes`.

### `ic_feature`

**Couvre :** caractéristique souple attachée à une `lexical_form`.

**Peut soutenir :** une propriété lexicale ponctuelle ou une expérimentation administrée.

**Limites :** vocabulaire non contrôlé, valeurs peu structurées, attachement au lemme plutôt qu’à l’occurrence ou à une règle réutilisable.

**À ne pas lui faire porter :** les dépendances de phrase, toutes les analyses morphologiques d’un texte, ou une copie par lemme de chaque règle grapho-phonétique.

### `inflected_form`

**Couvre actuellement :** pluriel attesté et validé d’un nom ou adjectif, relié à son lemme canonique, avec statut, provenance et confiance.

**Peut soutenir :** résolution `organizaciones → organización`, puis enrichissements lexicaux et signal `Number=Plur` du tamis 6.

**Ne couvre pas :** genre, personne, temps, mode, ambiguïtés multiples, contexte syntaxique ou règle productive. Son schéma V0 fixe `grammatical_number = PLURAL`.

**À ne pas lui faire porter maintenant :** toutes les conjugaisons ni un objet JSON morphologique hétérogène sans avoir d’abord évalué un moteur et les usages pédagogiques.

## 4. Analyse du tamis 4

### 4.1 Ce qui doit être représenté

Une connaissance grapho-phonétique réutilisable doit au minimum préciser :

- langue source ;
- motif graphique ;
- position ou contexte du motif ;
- type de phénomène : graphème-prononciation, correspondance interlangue ou avertissement ;
- indication pédagogique ;
- éventuelle langue de comparaison ;
- éventuel motif ou indice de comparaison ;
- fiabilité et statut de validation ;
- exemples et contre-exemples ;
- variante géographique lorsque la réalisation en dépend.

La détection doit s’effectuer sur la surface. La connaissance peut être illustrée par des lemmes, mais ne doit pas dépendre de l’existence de chaque mot dans le dictionnaire.

### 4.2 `pattern_rule` suffit-il ?

Il suffit comme **prototype de correspondance graphique interlangue** lorsque la règle possède réellement une source et une cible, par exemple un rapprochement `ñ ↔ gn` explicitement borné à deux langues.

Il ne convient pas proprement aux cas suivants :

- règle monolingue sans cible, comme `c` devant `e/i` en espagnol ;
- prononciation décrite par un phonème plutôt que par un texte cible ;
- variation régionale ;
- règle demandant contexte gauche/droit, exceptions ou priorité ;
- différence entre graphie et réalisation phonétique.

Étendre `pattern_rule` avant d’avoir un corpus de règles risquerait de rendre ses lignes polysémiques. Une future table de travail `grapho_phonetic_rule` serait plus claire si l’administration doit gérer un catalogue substantiel. Elle ne doit pas être créée sur la seule base des six exemples proposés.

### 4.3 Exemples et prudence

Les exemples sont essentiels, mais ne remplacent pas la règle. Chaque règle devrait pouvoir montrer :

- au moins un exemple positif ;
- si utile, un contre-exemple ;
- un texte de prudence ;
- la portée linguistique exacte.

`ll`, `ch`, `qu` ou `c` ne doivent jamais être présentés comme équivalences universelles. Le tamis doit donner une stratégie de lecture, pas fabriquer une prononciation certaine.

## 5. Analyse du tamis 5

### 5.1 Trois niveaux à distinguer

1. **Catégorie lexicale** : `lexical_form.part_of_speech = verb`.
2. **Catégorie contextuelle** : cette occurrence est analysée comme `VERB`.
3. **Fonction ou dépendance syntaxique** : cette occurrence est le noyau de la proposition, le sujet ou un complément.

Le moteur actuel ne possède que le premier niveau et l’affiche prudemment comme un « verbe probable ». Une vraie progression du tamis 5 exige au minimum le deuxième niveau ; les rôles sujet et complément exigent généralement le troisième.

### 5.2 Peut-on éviter une analyse syntaxique complète ?

Oui, pour une première valeur pédagogique limitée :

- repérer `déterminant + nom` à partir de POS contextuels ;
- repérer `préposition + groupe nominal` ;
- repérer `auxiliaire + participe` ;
- signaler un noyau verbal probable ;
- découper approximativement des groupes sans prétendre construire un arbre complet.

Cette analyse légère demande tout de même tokenisation, POS contextuel et règles de séquence. Elle doit retourner une confiance et accepter l’absence de résultat. Pour `sujet + verbe + complément`, les seules positions sont fragiles : pronoms omis, inversions et subordonnées sont fréquents.

### 5.3 Que peut stocker Dico-IC ?

Dico-IC pourrait stocker à terme des **patrons pédagogiques réutilisables**, pas les analyses de chaque phrase :

```text
code stable
langue ou famille de langues
séquence de catégories ou dépendances
description pédagogique
exemples
limites
statut
fiabilité
```

Une éventuelle table `syntactic_pattern` ne devient pertinente que si des enseignants doivent administrer ces patrons et si l’API sait les exécuter sur une sortie NLP normalisée. Une table ne remplace pas l’analyseur qui reconnaît le patron dans une phrase.

## 6. Analyse du tamis 6

### 6.1 Connaissance lexicale et analyse d’occurrence

Le tamis 6 combine trois couches :

```text
surface observée
↓
lemme et POS possibles
↓
traits morphologiques contextualisés
```

Le dictionnaire connaît le lemme. `inflected_form` peut connaître un mapping attesté et un trait simple validé. Un moteur morphologique peut proposer les traits de l’occurrence. La phrase aide à résoudre les ambiguïtés.

Une représentation normalisée de type Universal Dependencies est un bon candidat pour la couche calculée :

```text
UPOS=VERB
Mood=Ind
Tense=Pres
Person=3
Number=Plur
```

Il s’agit d’une convention interne potentielle, pas d’une modification proposée du contrat public ou du SQL.

### 6.2 Cas concrets

| Surface | Lemme | Signal possible | Confiance sans contexte |
|---|---|---|---|
| `organizaciones` | `organización` | `NOUN`, `Number=Plur` | forte si mapping validé |
| `utiles` | `utile` ou autre analyse selon langue/contexte | `Number=Plur` | moyenne ; POS et lemme peuvent être ambigus |
| `mangent` | `manger` | `VERB`, `Person=3`, `Number=Plur`, `Tense=Pres`, `Mood=Ind` | faible par suffixe seul, forte avec analyseur |
| `hablamos` | `hablar` | `VERB`, `Person=1`, `Number=Plur` ; temps à désambiguïser | moyenne |
| `petite/petits/petites` | `petit` | genre et nombre | variable selon forme et contexte |

Une règle de terminaison peut expliquer le résultat, mais ne doit pas être la seule source de vérité. `-ent` en français ou `-amos` en espagnol génère des analyses concurrentes et des exceptions.

### 6.3 Faut-il stocker les traits morphologiques ?

À court terme, les traits complexes devraient rester dans le résultat d’analyse en mémoire :

- ils dépendent d’un moteur et de sa version ;
- ils peuvent être ambigus ;
- ils appartiennent à une occurrence contextuelle ;
- `POST /analysis` ne persiste ni texte ni token.

Le stockage sélectif est justifié pour un mapping validé et stable, comme `organizaciones → organización` avec `Number=Plur`. Il ne l’est pas encore pour une analyse complète de `hablamos` sans modèle d’ambiguïté et sans besoin admin confirmé.

## 7. Lien avec `inflected_form`

### 7.1 Ce que la table résout déjà

Pour le périmètre V0, `inflected_form` suffit à :

1. reconnaître un pluriel attesté ;
2. retrouver le lemme canonique ;
3. transmettre implicitement ou explicitement `grammatical_number = PLURAL` ;
4. réutiliser les connaissances des tamis 1, 2, 3 et 7 rattachées au lemme.

Elle contribue directement au tamis 6. Elle contribue seulement indirectement au tamis 5 en donnant accès au POS lexical du lemme.

### 7.2 Ce qu’elle ne résout pas

- accord entre plusieurs occurrences ;
- fonction syntaxique ;
- désambiguïsation entre plusieurs lemmes ;
- conjugaison ;
- traits complexes ;
- génération productive de formes ;
- analyse d’une surface jamais observée.

### 7.3 `morph_features_json`

Ajouter immédiatement un champ JSON serait souple, mais prématuré : vocabulaire, cardinalité, provenance et validation ne sont pas encore fixés. Un JSON pourrait masquer des conventions incompatibles entre admin, Stanza, UDPipe ou spaCy.

Avant toute évolution, il faudrait définir :

- un vocabulaire de traits stable ;
- la distinction entre trait validé et trait proposé ;
- la gestion de plusieurs analyses pour une surface ;
- la version du moteur ou de la ressource ;
- les traits réellement affichés par Seven Sieves.

La recommandation est donc : conserver le pluriel structuré actuel, expérimenter les traits complexes dans la réponse interne d’analyse, puis réévaluer le stockage sur des données réelles.

## 8. Options de modélisation

### Option A — ne rien ajouter

**Principe :** conserver les heuristiques en code, `part_of_speech`, `pattern_rule`, `ic_feature` et `inflected_form`.

**Avantages :** aucun coût SQL, rapidité d’expérimentation, faible risque sur l’existant.

**Inconvénients :** règles non administrables, provenance limitée, couverture fragile, multiplication probable des conditions dans l’API.

**Appréciation :** acceptable immédiatement, mais seulement avec statuts `experimental`, warnings et tests explicites.

### Option B — enrichir `pattern_rule`

**Principe :** étendre le modèle actuel pour accueillir modes d’application, règles monolingues et statuts.

**Avantages :** moins de tables, administration potentiellement unifiée, bon prolongement des tamis 3 et 7.

**Inconvénients :** mélange transformation graphique, indice phonétique et morphologie ; syntaxe impossible à représenter proprement ; champs source/cible inadaptés à plusieurs phénomènes.

**Appréciation :** utile pour quelques règles du tamis 4 proches des correspondances existantes, inadéquat comme architecture commune des tamis 4 à 6.

### Option C — tables spécialisées

**Principe :** prévoir des modèles comme `grapho_phonetic_rule`, `syntactic_pattern`, `morph_rule` ou un référentiel de traits.

**Avantages :** intentions claires, validation propre, requêtes et administration dédiées, meilleure évolutivité pédagogique.

**Inconvénients :** coût de conception et d’interface, risque de modéliser avant de connaître les données, besoin d’un moteur même avec les tables, fragmentation possible.

**Appréciation :** cible possible à moyen terme, table par table et uniquement après expérimentation. Il ne faut pas créer quatre tables simultanément.

### Option D — approche hybride

**Principe :** base pour connaissances stables, moteur pour analyses contextuelles, admin pour validation sélective.

**Avantages :** respecte le caractère stateless de l’API, limite le stockage, rend les résultats explicables, permet un fallback, compatible avec le faible volume du projet.

**Inconvénients :** nécessite un contrat interne entre Node et le moteur NLP, gestion de provenance plus rigoureuse, résultats dépendants des modèles, administration future à concevoir.

**Appréciation :** option recommandée. Elle doit être différenciée par tamis, pas réduite à un unique « moteur linguistique ».

## 9. Impact sur Seven Sieves

### Tamis 4

```text
token de surface
↓
application des règles actives pour la langue
↓
signal grapho-phonétique avec provenance et prudence
↓
mise en évidence du motif + infobulle pédagogique
```

**Calculé :** correspondance du motif, contexte graphique, sélection de la règle.

**Lu en base à terme :** règle validée, exemples, fiabilité, variante linguistique.

**Affiché :** motif observé, indication de lecture/comparaison, prudence.

**Invisible :** expression régulière, priorité technique, identifiants internes.

### Tamis 5

```text
phrase tokenisée
↓
POS contextuels et éventuellement dépendances
↓
reconnaissance d’un patron pédagogique
↓
surbrillance d’un groupe ou de rôles probables
```

**Calculé :** POS, groupes, dépendances et présence du patron.

**Lu en base à terme :** définition pédagogique du patron, langues, exemples et limites.

**Affiché :** structure simple, par exemple « groupe nominal » ou « noyau verbal probable ».

**Invisible :** arbre brut de dépendances, tags détaillés sans intérêt pédagogique, scores techniques non calibrés.

Le contrat actuel attache les enrichissements à des tokens. Un véritable patron couvrant plusieurs tokens nécessitera probablement, dans une future version du contrat, une portée par intervalle ou une liste d’indices. Ce point doit être étudié avant une table syntaxique.

### Tamis 6

```text
token de surface
↓
lookup exact du lemme puis inflected_form validée
↓
analyse morphologique dynamique en complément
↓
lemme + traits retenus
↓
signal grammatical explicable
```

**Calculé :** analyses candidates, désambiguïsation et traits contextuels.

**Lu en base :** mapping validé, lemme canonique, POS lexical, confiance et provenance.

**Affiché :** seulement les traits utiles : pluriel, infinitif, personne ou temps lorsqu’ils sont suffisamment fiables.

**Invisible :** candidats rejetés, représentation propre au moteur, détails de stockage.

### Responsabilités du client

Seven Sieves reste un client léger. Il affiche le paquet reçu, les surbrillances, les infobulles et l’état des tamis. Il ne doit ni exécuter les règles linguistiques, ni appeler MariaDB, ni écrire des analyses. Les statuts apprenants restent locaux.

## 10. Risques

### Confusion des niveaux

Le risque principal est de convertir trop vite :

- POS lexical en rôle syntaxique certain ;
- motif graphique en prononciation certaine ;
- terminaison en analyse morphologique certaine ;
- affixe flexionnel en suffixe lexical du tamis 7.

### Surmodélisation

Créer immédiatement plusieurs tables produirait un schéma plus précis en apparence que les connaissances réellement disponibles. Les cas `ph/f`, `gn/nh`, `déterminant + nom` et `-ent` ne suffisent pas à définir les vocabulaires, exceptions et modes d’application.

### Couplage à un moteur NLP

Les sorties des moteurs diffèrent. L’API doit utiliser un contrat interne normalisé et versionné, avec fallback vers les mappings validés et le lookup lexical exact.

### Ambiguïtés linguistiques

Une surface peut avoir plusieurs lemmes, POS ou analyses. L’architecture doit autoriser l’absence de résultat et, à terme, plusieurs candidats. Une confiance technique ne doit pas être montrée comme vérité à l’apprenant.

### Explications trompeuses

Une règle exacte techniquement peut être peu utile pédagogiquement. Les libellés, exemples et précautions doivent être validés par des enseignants, particulièrement pour les variations de prononciation.

### Performance et disponibilité

Un analyseur syntaxique ou morphologique local ajoute mémoire, latence et risque d’indisponibilité. `POST /analysis` doit conserver un timeout borné, un warning clair et un mode dégradé sans échec global.

## 11. Recommandation

### Décision architecturale proposée

Adopter l’option D, avec les frontières suivantes :

- **Tamis 4 :** conserver provisoirement un petit catalogue explicite en code. Tester ensuite un modèle spécialisé de règles administrables. Réutiliser `pattern_rule` seulement lorsqu’une règle est réellement une transformation interlangue compatible avec son sens actuel.
- **Tamis 5 :** ne pas ajouter de table à court terme. Expérimenter un analyseur fournissant POS et dépendances ; stocker éventuellement plus tard des patrons pédagogiques, jamais les phrases analysées.
- **Tamis 6 :** donner priorité au lookup exact puis à `inflected_form`; compléter avec un moteur morphologique local. Garder les traits complexes dans la réponse d’analyse avant de décider lesquels méritent validation et stockage.

### Source de vérité par couche

| Couche | Source de vérité recommandée |
|---|---|
| lemmes et POS lexicaux | `lexical_form` |
| relations IC entre lemmes | `form_relation` |
| transformations lexicales/affixales interlangues | `pattern_rule` |
| pluriels attestés validés | `inflected_form` |
| graphie-prononciation réutilisable | futur référentiel spécialisé si le corpus le justifie |
| POS et traits d’une occurrence | moteur d’analyse, résultat non persisté |
| rôle et structure syntaxiques | calcul contextuel, résultat non persisté |
| patron syntaxique pédagogique | futur référentiel administrable si besoin confirmé |

### Statut API

Les trois tamis doivent rester `experimental` tant que :

- le tamis 4 repose sur quelques conditions codées ;
- le tamis 5 ne possède pas d’analyse contextuelle ;
- le tamis 6 ne couvre qu’un nombre réduit de marqueurs et mappings validés.

## 12. Feuille de route

### Étape 0 — immédiatement, sans schéma

1. Documenter précisément les heuristiques existantes et leurs langues.
2. Harmoniser les payloads et les warnings des tamis 4, 5 et 6.
3. Conserver `source.kind = heuristic` lorsqu’aucune connaissance DB ne justifie le résultat.
4. Exploiter `grammatical_number = PLURAL` pour produire un signal tamis 6 prudent lorsqu’un mapping validé est utilisé.
5. Constituer un petit corpus enseignant annoté avec résultats attendus et cas négatifs.

### Étape 1 — expérimentation NLP hors schéma

1. Comparer Stanza et UDPipe, avec spaCy comme candidat complémentaire, sur FR/ES/IT/PT.
2. Mesurer lemmes, POS, traits, dépendances, alignement avec les offsets UTF-16 et latence.
3. Définir un contrat interne Node/moteur indépendant de la bibliothèque.
4. Tester le gain réel pour les tamis 5 et 6, pas seulement la précision NLP abstraite.

### Étape 2 — données pédagogiques minimales

1. Recenser un petit catalogue de règles du tamis 4 avec exemples et contre-exemples.
2. Recenser quelques patrons du tamis 5 réellement enseignés.
3. Identifier les traits du tamis 6 effectivement compris et utiles aux apprenants.
4. Préparer une validation humaine dans Dico-IC Admin sans automatiser l’écriture depuis Seven Sieves.

### Étape 3 — décision de modèle

Décider séparément :

- si les règles grapho-phonétiques justifient une table spécialisée ;
- si les patrons syntaxiques ont besoin d’un référentiel ;
- si `inflected_form` doit porter quelques traits validés supplémentaires ou rester volontairement limité au nombre.

Chaque décision doit s’appuyer sur le corpus, l’administration souhaitée et les enrichissements effectivement rendus par Seven Sieves.

### Hors périmètre pour l’instant

- stockage des textes ou des tokens analysés ;
- persistance automatique de toutes les sorties NLP ;
- morphologie exhaustive des quatre langues ;
- transcription phonétique exhaustive ;
- arbres syntaxiques stockés en MariaDB ;
- écriture en base depuis Seven Sieves ;
- table générique unique pour tous les tamis.

## Conclusion

Les tamis 4, 5 et 6 deviennent plus solides non pas en stockant davantage de résultats, mais en séparant correctement **connaissance réutilisable**, **analyse contextuelle** et **explication pédagogique**.

`inflected_form` offre déjà un premier pont concret pour le tamis 6. Le tamis 5 dépend surtout d’un futur moteur contextuel. Le tamis 4 est le meilleur candidat à une connaissance administrable dédiée, mais seulement après constitution d’un vrai petit catalogue de règles.

La prochaine décision utile n’est donc pas une modification SQL. C’est la préparation d’un corpus FR/ES/IT/PT permettant de mesurer quels indices améliorent réellement la lecture dans Seven Sieves et lesquels ne sont que des heuristiques séduisantes.
