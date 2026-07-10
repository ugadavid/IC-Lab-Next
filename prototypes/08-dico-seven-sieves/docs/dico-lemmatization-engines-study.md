# Dico-IC — étude comparative des moteurs de lemmatisation multilingue

## Statut du document

Ce document est une étude d'architecture. Il ne constitue ni un choix de dépendance définitif ni une décision d'implémentation.

Aucun code, prototype, paquet ou modèle linguistique n'a été créé ou installé pendant cette étude.

### Prudence sur l'état des projets en 2026

Les caractéristiques architecturales décrites ci-dessous reposent sur les documentations et publications connues des projets. L'accès réseau aux documentations officielles a échoué pendant cette session, y compris après autorisation, par expiration de délai.

Les numéros de version, dates de publication des modèles, licences exactes des ressources et statuts de maintenance devront donc être revérifiés sur les pages officielles avant tout prototype. Le rapport évite volontairement d'affirmer qu'une version précise serait « la dernière » en juin 2026.

## 1. Rappel du besoin

Dico-IC stocke désormais préférentiellement des lemmes dictionnaires dans `lexical_form` :

```text
utile
élève
manger
organización
```

Seven Sieves analyse des textes authentiques, où les occurrences sont souvent fléchies :

```text
utiles
élèves
mangent
organizaciones
```

Le pipeline cible est :

```text
texte
    ↓
tokens et offsets
    ↓
lemme + POS + traits morphologiques
    ↓
lookup lexical_form.normalized_lemma
    ↓
relations, familles, règles et traits Dico-IC
    ↓
enrichissements Seven Sieves
```

La lemmatisation doit donc servir de **résolveur d'accès** aux connaissances existantes. Elle ne doit ni remplacer le texte original ni créer automatiquement de nouvelles entrées.

## 2. Contraintes propres à Dico-IC

### Architecture actuelle

- API principale en Node.js et Express ;
- MariaDB pour la connaissance persistante ;
- `POST /analysis` stateless ;
- tokens avec offsets UTF-16 compatibles JavaScript ;
- recherche actuelle par égalité de `lookup_key` et `normalized_lemma` ;
- client Seven Sieves sous forme de page HTML/JavaScript légère.

### Principes fonctionnels

- exécution locale privilégiée ;
- aucun SaaS obligatoire ;
- résultats explicables et reproductibles ;
- coût de maintenance raisonnable ;
- français, espagnol, italien et portugais traités comme langues prioritaires ;
- analyse de phrases et textes courts plutôt que traitement massif de corpus ;
- aucun stockage automatique des textes ou des occurrences.

### Sortie minimale attendue

Pour chaque token mot :

```text
surface
lemma
UPOS ou catégorie compatible
traits morphologiques utiles
provenance du moteur
version du modèle
éventuelle ambiguïté
```

Le lemme seul débloque surtout les tamis 1 et 2. POS et traits morphologiques sont importants pour les tamis 5 et 6.

## 3. Difficulté souvent sous-estimée : la tokenisation

Seven Sieves et l'API possèdent déjà leur propre tokenisation avec offsets UTF-16. Les moteurs NLP tokenisent généralement eux-mêmes le texte et peuvent :

- découper différemment les apostrophes et traits d'union ;
- représenter des mots multi-unités ;
- fusionner ou séparer contractions et clitiques ;
- utiliser des offsets Unicode différents de ceux de JavaScript.

Une future intégration ne devrait donc pas faire correspondre naïvement les tokens par leur position dans deux tableaux.

Deux stratégies sont sérieuses :

1. transmettre au moteur les tokens présegmentés, lorsqu'il le permet, tout en conservant le contexte de phrase ;
2. laisser le moteur tokeniser puis réaligner par intervalles de caractères, avec une conversion explicite entre points de code et unités UTF-16.

Pour un premier prototype, la prise en charge documentée d'une entrée présegmentée est un avantage important.

## 4. Critères de comparaison

Chaque solution est évaluée selon :

- couverture FR, ES, IT et PT ;
- lemmatisation des noms, adjectifs et verbes ;
- traitement des formes fréquentes et irrégulières ;
- utilisation ou non du contexte ;
- capacité à représenter plusieurs candidats ;
- POS et traits de genre, nombre, personne, temps et mode ;
- exécution locale ;
- intégration avec Node ;
- mémoire et latence qualitatives ;
- reproductibilité ;
- maintenance et pérennité ;
- homogénéité entre les quatre langues.

Les appréciations de précision sont des attentes architecturales, pas des résultats de benchmark Dico-IC.

## 5. spaCy

### Positionnement

spaCy est une bibliothèque NLP Python orientée production. Ses pipelines de langues peuvent combiner tokenisation, étiquetage morphosyntaxique, lemmatisation, dépendances et autres composants.

### Couverture

Des pipelines entraînés ont historiquement été proposés pour :

- français ;
- espagnol ;
- italien ;
- portugais.

La disponibilité exacte des tailles et versions de modèles pour chacune des quatre langues doit être vérifiée au moment du prototype sur le [catalogue officiel des modèles spaCy](https://spacy.io/models).

### Qualité attendue

- **Noms et adjectifs réguliers** : bonne attente générale.
- **Verbes fréquents et irréguliers** : bonne si le pipeline et son composant de lemmatisation sont correctement configurés.
- **Ambiguïtés contextuelles** : mieux traitées qu'avec un lexique isolé grâce au POS et au contexte, mais la qualité dépend du pipeline de langue.
- **Homographes** : un seul meilleur lemme est généralement exposé par token ; spaCy n'est pas spontanément un générateur de lattice de candidats.

spaCy propose plusieurs architectures de lemmatiseur selon les langues et configurations : règles, tables de lookup ou composant entraînable. Cette souplesse est utile, mais elle signifie que le comportement peut ne pas être parfaitement homogène entre FR, ES, IT et PT.

### Morphologie

Selon le pipeline, les tokens peuvent exposer :

- lemma ;
- POS universel et tag détaillé ;
- traits morphologiques.

Ces sorties sont pertinentes pour les tamis 5 et 6, mais leur couverture réelle doit être contrôlée langue par langue dans les métadonnées des modèles.

### Intégration

Il n'existe pas de chemin naturel dans l'API Node actuelle pour charger directement les pipelines Python spaCy.

Architecture plausible :

```text
API Node
    ↓ HTTP local ou IPC
service Python spaCy persistant
    ↓
JSON morphologique
```

Un processus Python persistant est préférable à un lancement par requête, car le chargement des modèles est coûteux.

### Performance et mémoire

- **Charge** : moyenne avec petits pipelines, plus élevée avec modèles plus riches.
- **Latence après chargement** : généralement compatible avec des textes courts.
- **Mémoire** : quatre pipelines chargés simultanément peuvent devenir significatifs ; un chargement à la demande ou un cache borné peut être nécessaire.

### Maintenance

Points forts : écosystème mature, documentation riche, interface de pipeline claire et usage industriel important.

Points à surveiller : compatibilité entre version de spaCy et paquets de modèles, différences de composants entre langues, gestion de quatre modèles distincts.

### Seven Sieves

spaCy pourrait recevoir la phrase ou un document présegmenté, puis renvoyer pour chaque token :

```json
{
  "surface": "mangent",
  "lemma": "manger",
  "pos": "VERB",
  "features": { "Number": "Plur", "Person": "3" }
}
```

Node utiliserait ensuite `manger` comme clé de lookup tout en conservant `mangent` et ses offsets pour Seven Sieves.

### Appréciation

spaCy est une option sérieuse, maintenable et ergonomique. Pour Dico-IC, son principal risque est moins la qualité générale que l'hétérogénéité possible des pipelines et ressources entre les quatre langues.

## 6. Stanza

### Positionnement

Stanza est la bibliothèque Python de Stanford NLP pour des pipelines neuronaux multilingues fondés sur les annotations Universal Dependencies.

Elle couvre dans une interface cohérente :

- tokenisation ;
- mots multi-unités ;
- POS ;
- traits morphologiques ;
- lemmatisation ;
- dépendances.

### Couverture

Le français, l'espagnol, l'italien et le portugais disposent de treebanks Universal Dependencies et ont historiquement été couverts par les modèles Stanza. La liste exacte des packages disponibles doit être contrôlée dans la [documentation officielle des modèles Stanza](https://stanfordnlp.github.io/stanza/available_models.html).

### Qualité attendue

- **Noms et adjectifs** : bonne attente grâce au contexte et au POS.
- **Verbes fréquents et irréguliers** : bonne attente ; l'approche entraînée peut dépasser les règles simples.
- **Formes ambiguës** : le contexte de phrase est exploité.
- **Sortie** : généralement un meilleur lemme par mot, pas une liste de candidats concurrents.

Le comportement homogène autour d'Universal Dependencies constitue un avantage pour comparer les quatre langues.

### Morphologie

Stanza expose naturellement les catégories Universal Dependencies :

- `upos` ;
- `xpos` selon le treebank ;
- `lemma` ;
- `feats`, qui peut contenir genre, nombre, personne, temps, mode, etc.

Cette richesse correspond bien aux besoins futurs des tamis 5 et 6.

### Intégration

Stanza nécessite Python et son environnement d'exécution neuronal. L'architecture raisonnable est un sidecar local persistant :

```text
Node /analysis
    ↓ requête locale
service Python Stanza
    ↓
tokens UD + lemmas + feats
```

Stanza documente une utilisation de texte pré-tokenisé, ce qui mérite d'être vérifié et testé pour préserver les tokens Seven Sieves.

### Performance et mémoire

- **Charge** : lourde par rapport à un moteur C++ ou à un lexique.
- **Démarrage** : chargement initial notable.
- **Traitement de textes courts** : vraisemblablement acceptable avec un processus chaud.
- **Quatre langues simultanées** : mémoire à mesurer ; une politique de chargement à la demande peut être utile.

### Maintenance

Points forts : projet académique établi, modèle de données UD cohérent, documentation des processeurs et large couverture multilingue.

Points à surveiller : dépendances Python et calcul neuronal, taille des modèles, cadence de mise à jour, compatibilité entre ressources téléchargées et version de la bibliothèque.

### Seven Sieves

```text
texte espagnol
    ↓ Stanza es
organizaciones → organización / NOUN / Number=Plur
    ↓ Node
lookup organización dans Dico-IC
    ↓
tamis 1, 2, 3, 6 et 7
```

### Appréciation

Stanza est le candidat le plus directement aligné avec le besoin scientifique : contexte, quatre langues, lemmes, POS et traits UD dans une interface homogène. Son coût principal est opérationnel.

## 7. UDPipe

### Positionnement

UDPipe fournit une chaîne locale de traitement Universal Dependencies, historiquement distribuée sous forme d'outil et de bibliothèque C++ avec modèles par treebank.

Elle peut produire tokenisation, POS, lemmes, traits morphologiques et dépendances au format CoNLL-U.

Il faut distinguer la branche UDPipe classique et les générations plus récentes du projet. Le choix exact et leur statut en 2026 doivent être vérifiés sur le [site officiel UDPipe](https://ufal.mff.cuni.cz/udpipe).

### Couverture

La couverture découle des modèles Universal Dependencies disponibles. Les quatre langues prioritaires disposent de treebanks UD ; il faut toutefois vérifier qu'un modèle publié et compatible est disponible pour chaque treebank retenu.

Choisir un treebank n'est pas neutre : domaine, variété et conventions d'annotation peuvent influencer les résultats.

### Qualité attendue

- **Formes régulières et fréquentes** : bonne base attendue.
- **Irrégularités et ambiguïtés** : dépend du modèle ; les anciennes générations peuvent être moins performantes que des pipelines neuronaux plus récents.
- **Sortie** : un meilleur lemme et une analyse UD par token.

UDPipe doit être évalué, pas présumé inférieur : pour des formes romanes courantes et des textes courts, un moteur plus léger peut être largement suffisant.

### Morphologie

Le format CoNLL-U fournit :

- lemma ;
- UPOS ;
- XPOS éventuel ;
- traits `FEATS` ;
- relations syntaxiques.

Le format est explicite, stable et bien adapté à une normalisation interne Dico-IC.

### Intégration

Trois chemins sont envisageables :

1. binaire local appelé par Node ;
2. service local persistant autour de la bibliothèque ;
3. binding natif, si une liaison Node maintenue existe réellement au moment du prototype.

Appeler un nouveau processus pour chaque texte serait simple mais peu élégant. Un processus persistant ou un petit service local serait préférable.

### Performance et mémoire

- **Charge** : légère à moyenne selon génération et modèle.
- **CPU** : bon candidat pour une exécution locale.
- **Mémoire** : généralement plus maîtrisable qu'un ensemble de pipelines neuronaux lourds.

### Maintenance

Points forts : format UD, stabilité, portabilité et modèle d'exécution local.

Points à surveiller : ergonomie de l'intégration Node, distinction entre versions du projet, fraîcheur des modèles, documentation des bindings et sélection des treebanks.

### Seven Sieves

```text
tokens présegmentés ou texte
    ↓ UDPipe local
CoNLL-U
    ↓ adaptateur Node
lemma + UPOS + FEATS alignés aux offsets
    ↓ Dico-IC
```

### Appréciation

UDPipe est le meilleur candidat « témoin léger » pour un futur comparatif. Il pourrait aussi devenir la solution retenue si sa précision sur le corpus Dico-IC est proche de Stanza avec un coût nettement inférieur.

## 8. TreeTagger

### Positionnement

TreeTagger est un outil historique d'étiquetage et de lemmatisation, distribué avec des fichiers de paramètres par langue.

Il reste intéressant lorsqu'on cherche :

- un outil local ;
- rapide ;
- stable ;
- connu dans de nombreux contextes académiques européens.

### Couverture

Des ressources ont historiquement existé pour le français, l'espagnol, l'italien et le portugais. Leur disponibilité, leur date et leurs conditions d'utilisation doivent être vérifiées sur la [page officielle TreeTagger](https://www.cis.uni-muenchen.de/~schmid/tools/TreeTagger/).

### Qualité attendue

- correct sur de nombreux mots fréquents ;
- capable de produire POS et lemme ;
- moins riche et moins homogène qu'un pipeline UD moderne pour les traits morphologiques ;
- dépendance forte aux lexiques et paramètres propres à chaque langue ;
- sortie généralement unique, avec conventions de tags variables.

### Intégration

TreeTagger s'utiliserait comme binaire local, avec un wrapper Node ou un service. Son format est simple, mais l'alignement aux tokens et la normalisation des tagsets demanderaient du code spécifique.

### Performance et mémoire

- **Charge** : légère.
- **Vitesse** : attractive.
- **Déploiement** : simple techniquement, sous réserve des licences de distribution.

### Pérennité et pertinence en 2026

TreeTagger est stable, mais sa conception et son écosystème sont anciens. Pour un nouveau composant central, les points de vigilance sont :

- maintenance plus conservatrice ;
- modèles possiblement anciens ;
- tagsets hétérogènes ;
- licence et redistribution à contrôler ;
- moins bonne adéquation aux futurs besoins morphosyntaxiques des tamis.

### Appréciation

TreeTagger peut servir de baseline historique ou de solution de secours locale. Il n'est pas le premier choix recommandé pour une nouvelle V1 multilingue centrée sur les traits UD.

## 9. Lefff et ressources françaises spécialisées

### Positionnement

Le Lefff est un lexique morphologique du français. Il peut fournir des associations entre formes, lemmes et informations morphosyntaxiques.

### Intérêt

- excellente pertinence pour les exceptions françaises ;
- ressource déterministe et explicable ;
- possibilité de retourner plusieurs analyses lexicales pour une surface ;
- utilité comme référence d'évaluation ou couche de fallback.

### Limites

- français uniquement ;
- lexique, pas analyseur contextuel complet ;
- ambiguïtés non résolues par la phrase ;
- format, licence, version et maintenance à revérifier ;
- ne répond pas au besoin homogène FR/ES/IT/PT.

### Place possible

Le Lefff ne devrait pas être le moteur principal. Il pourrait devenir :

- une source de tests français ;
- une base d'exceptions ;
- une ressource de validation croisée ;
- une source contrôlée de mappings persistants dans l'architecture hybride.

Une page historique de référence est le [wiki ALPAGE consacré au Lefff](https://alpage.inria.fr/frmgwiki/lefff).

## 10. simplemma et approches lexicales légères

### Positionnement

Des bibliothèques comme simplemma proposent une lemmatisation multilingue légère, principalement fondée sur des tables lexicales et règles plutôt que sur une analyse contextuelle complète.

Le [dépôt officiel simplemma](https://github.com/adbar/simplemma) doit être consulté avant prototype pour confirmer langues, maintenance et licences des données.

### Avantages

- intégration Python simple ;
- empreinte et latence réduites ;
- traitement local ;
- bonne baseline pour les flexions régulières et fréquentes ;
- aucun modèle neuronal lourd.

### Limites

- contexte limité ou absent ;
- POS et traits morphologiques insuffisants pour les tamis 5 et 6 ;
- ambiguïtés souvent tranchées par une heuristique ou un ordre lexical ;
- qualité dépendante des dictionnaires de langue.

### Appréciation

Une solution lexicale légère mérite un test de référence, mais pas le rôle de moteur unique. Elle peut couvrir rapidement `utiles → utile` et `organizaciones → organización`, tout en étant moins fiable sur les homographes et analyses contextuelles.

## 11. Trankit et pipelines transformers multilingues

### Positionnement

Trankit est un pipeline multilingue fondé sur des transformers et Universal Dependencies, conçu pour fournir tokenisation, POS, morphologie, lemmes et dépendances dans de nombreuses langues.

Le [dépôt officiel Trankit](https://github.com/nlp-uoregon/trankit) doit être vérifié pour son état de maintenance et ses modèles disponibles en 2026.

### Avantages

- interface multilingue homogène ;
- contexte neuronal ;
- sortie UD riche ;
- candidat scientifiquement pertinent pour une comparaison de qualité.

### Inconvénients

- dépendances Python et transformers ;
- empreinte mémoire et temps de démarrage élevés ;
- complexité disproportionnée pour une première intégration locale légère ;
- maintenance actuelle à confirmer.

### Appréciation

Trankit est un candidat secondaire de benchmark, surtout si Stanza montre des limites. Il n'est pas recommandé comme premier prototype Dico-IC en raison de son coût opérationnel probable.

## 12. Solutions LLM

### Principe

```text
token + phrase + langue
    ↓
LLM
    ↓
lemma + POS + traits
```

### Avantages

- très bonne flexibilité linguistique ;
- possibilité d'expliquer une ambiguïté ;
- capacité à proposer plusieurs candidats ;
- adaptation sans modèle spécifique par langue.

### Inconvénients

- résultat probabiliste et sensible au prompt ;
- reproductibilité faible entre modèles et versions ;
- coût et latence importants à l'échelle de chaque analyse ;
- risque d'halluciner un lemme ou des traits ;
- déploiement local lourd si l'on refuse le SaaS ;
- transmission de textes à un fournisseur externe dans le cas SaaS ;
- difficulté à garantir un alignement token par token ;
- confiance rarement calibrée.

### Seven Sieves

Un LLM dans le chemin chaud de chaque `POST /analysis` rendrait la page dépendante d'une opération plus lente et moins déterministe. Cela contredit la légèreté et l'explicabilité recherchées.

### Place possible

Le LLM peut être utile hors du chemin principal :

- étude d'un cas rejeté par le moteur ;
- proposition admin soumise à validation ;
- génération d'explication pédagogique à partir d'une analyse déjà structurée ;
- comparaison ponctuelle pendant l'évaluation.

### Appréciation

Le LLM est à éviter comme lemmatiseur principal. Il peut rester un assistant de revue, jamais la source de vérité morphologique automatique.

## 13. Solutions Node natives

L'écosystème JavaScript propose des stemmers, tokenizers et outils NLP, mais il n'existe pas, à la connaissance de cette étude, de moteur Node natif mature réunissant simultanément :

- lemmatisation contextuelle ;
- FR, ES, IT et PT ;
- POS et traits morphologiques riches ;
- modèles maintenus ;
- qualité comparable aux pipelines UD établis.

Un stemmer ne convient pas :

```text
mangent → mang
```

n'est pas le lemme `manger` et ne permet pas le lookup Dico-IC.

La recherche d'une dépendance « tout JavaScript » ne devrait donc pas primer sur la qualité linguistique. Une frontière locale Node/Python ou Node/binaire est acceptable si elle reste encapsulée.

## 14. Comparaison des cas cibles

### `utiles → utile`

Cas régulier mais ambigu sans POS : `utiles` peut dépendre de la langue et du contexte.

- spaCy/Stanza/UDPipe : devraient utiliser POS et contexte.
- TreeTagger : probablement traitable avec son tagger et lexique.
- simplemma/Lefff : bon cas de lookup, avec ambiguïté éventuelle.
- LLM : facile en apparence, mais inutilement coûteux.

### `élèves → élève`

Cas français où le contexte et la catégorie comptent. Une ressource lexicale peut retourner plusieurs analyses ; un pipeline contextuel doit en sélectionner une.

- Stanza et spaCy ont ici un avantage conceptuel.
- Lefff est utile comme source de candidats français.
- une règle naïve de suppression de `s` est insuffisante.

### `mangent → manger`

Cas verbal qui teste la qualité réelle du lemmatiseur et du tagger.

- Stanza/spaCy/UDPipe/TreeTagger : candidats sérieux.
- simplemma : à mesurer, surtout sur les irrégularités et ambiguïtés.
- la sortie `VerbForm`, `Mood`, `Tense`, `Person`, `Number` serait très utile au tamis 6.

### `organizaciones → organización`

Cas nominal espagnol régulier.

- tous les moteurs sérieux devraient être évalués sur ce minimum ;
- les traits de pluriel permettent d'expliquer la surface ;
- le lemme débloque ensuite la relation `organización ↔ organisation` et la règle `-ción → -tion`.

## 15. Tableau comparatif

| Solution | FR/ES/IT/PT | Contexte | Lemme | POS / morphologie | Candidats multiples | Intégration Node | Charge | Pérennité estimée |
|---|---|---|---|---|---|---|---|---|
| spaCy | pipelines à confirmer pour les 4 | oui | oui | riche selon modèle | non, meilleur candidat | service Python | moyenne | forte |
| Stanza | couverture UD attendue pour les 4 | oui | oui | riche et homogène UD | non, meilleur candidat | service Python | lourde | forte académique |
| UDPipe | modèles UD à confirmer pour les 4 | oui via tagger | oui | riche en CoNLL-U | non, meilleur candidat | binaire/service | légère à moyenne | stable |
| TreeTagger | paramètres historiques pour les 4 | oui via tagger | oui | POS, traits hétérogènes | généralement non | binaire/wrapper | légère | stable mais ancien |
| Lefff | FR uniquement | non seul | oui | analyses lexicales riches | oui, selon ressource | import/service | légère | ressource spécialisée |
| simplemma | langues à confirmer | très limité | oui | peu ou pas | limité | service Python | légère | à vérifier |
| Trankit | couverture multilingue à confirmer | oui | oui | riche UD | non, meilleur candidat | service Python | lourde | à vérifier |
| LLM distant | oui | oui | oui en intention | flexible mais non garanti | oui sur demande | API externe | lourde/coûteuse | dépend du fournisseur |
| LLM local | oui selon modèle | oui | variable | variable | possible | service local | très lourde | maintenance élevée |

## 16. Précision attendue par catégorie

| Solution | Noms/adjectifs réguliers | Verbes | Irréguliers | Ambiguïtés | Traits utiles tamis 5/6 |
|---|---|---|---|---|---|
| spaCy | bonne | bonne attendue | dépend du pipeline | contextualisées | oui, à vérifier par modèle |
| Stanza | bonne | bonne attendue | modèle contextuel | contextualisées | oui, UD |
| UDPipe | bonne | moyenne à bonne | dépend du modèle/treebank | contextualisées | oui, UD |
| TreeTagger | bonne sur fréquent | moyenne à bonne | dépend du lexique | contextualisées par tagger | partielles et hétérogènes |
| Lefff | forte couverture lexicale FR | riche en analyses FR | bon intérêt lexical | non désambiguïsées seul | oui pour analyses lexicales FR |
| simplemma | bonne sur fréquent | variable | variable | faible | non |
| Trankit | bonne attendue | bonne attendue | modèle contextuel | contextualisées | oui, UD |
| LLM | variable | variable | flexible | peut les verbaliser | non garanti ni calibré |

Ces appréciations doivent être remplacées par des mesures sur le corpus Dico-IC avant toute décision.

## 17. Impact sur Seven Sieves

### Adaptateur recommandé

Quelle que soit la solution, Node devrait dépendre d'un contrat interne stable et non de la sortie brute du moteur :

```json
{
  "engine": "engine-name",
  "engine_version": "pinned-version",
  "model": "language-model-id",
  "language": "fr",
  "tokens": [
    {
      "source_index": 3,
      "surface": "mangent",
      "lemma": "manger",
      "upos": "VERB",
      "features": {
        "Mood": "Ind",
        "Tense": "Pres",
        "Person": "3",
        "Number": "Plur"
      }
    }
  ]
}
```

Ce contrat est illustratif et ne constitue pas une modification de l'API publique.

### Pipeline interne

```text
1. validation de POST /analysis
2. tokenisation Seven Sieves et offsets UTF-16
3. envoi du texte ou des tokens au moteur local
4. alignement et normalisation de la sortie
5. lookup par lot des lemmes dans MariaDB
6. génération des enrichissements
7. réponse avec surfaces originales
```

### Gestion des échecs

Le service de lemmatisation doit être un enrichissement dégradable :

- timeout court et borné ;
- warning explicite ;
- fallback vers le lookup exact actuel ;
- aucune écriture ;
- pas d'échec global si le moteur est indisponible.

## 18. Impact potentiel sur les tamis

### Tamis 1 — lexique international

Tous les moteurs capables de résoudre correctement la flexion augmentent l'accès aux relations `COGNATE_*`. La qualité du lemme est plus importante que la richesse morphologique.

### Tamis 2 — lexique pan-roman

Même effet : le lemme permet de retrouver la `lexical_entry` et les formes canoniques des autres langues.

### Tamis 3 — correspondances

Le moteur permet de comparer la surface et le lemme. Les correspondances de radical peuvent devenir visibles malgré la flexion. Une sortie UD n'est pas suffisante à elle seule pour segmenter tous les morphèmes.

### Tamis 4 — graphie et prononciation

Le token de surface reste prioritaire. Le lemme sert de contexte, mais les moteurs étudiés ne sont pas nécessairement des systèmes de phonétisation.

### Tamis 5 — syntaxe

POS et dépendances peuvent améliorer nettement ce tamis. Stanza, UDPipe, spaCy et Trankit offrent ici plus de potentiel qu'un lemmatiseur lexical léger.

### Tamis 6 — morphosyntaxe

Les traits UD sont particulièrement pertinents : genre, nombre, personne, temps, mode et forme verbale. Stanza et UDPipe ont l'avantage d'une représentation UD explicite ; spaCy peut également exposer des traits selon le pipeline.

### Tamis 7 — affixes

Le lemme aide à distinguer terminaison flexionnelle et suffixe lexical. Aucun moteur général ne remplace toutefois une vraie segmentation morphologique ou les `pattern_rule` interlinguistiques Dico-IC.

## 19. Recommandation à court terme

### Premier prototype recommandé : Stanza

Stanza mérite le premier prototype Dico-IC parce qu'il réunit dans un même cadre :

- les quatre langues prioritaires via Universal Dependencies, sous réserve de vérification des packages actuels ;
- lemmatisation contextuelle ;
- POS universel ;
- traits morphologiques directement utiles ;
- traitement local ;
- possibilité conceptuelle d'entrée pré-tokenisée ;
- format relativement homogène entre langues.

Le prototype devrait être un sidecar Python local minimal et persistant, jamais un lancement Python par token ou par requête.

### Témoin léger obligatoire : UDPipe

Un prototype comparatif n'est scientifiquement utile que s'il possède un témoin plus léger. UDPipe doit être testé sur le même corpus pour déterminer si Stanza apporte un gain réel justifiant sa mémoire et sa complexité.

### Baseline lexicale facultative : simplemma

Une baseline context-free peut mesurer combien de cas sont déjà résolus sans pipeline neuronal. Elle ne doit pas être confondue avec la cible V1.

## 20. Recommandation à moyen terme

### Ne pas coupler Dico-IC à un moteur concret

La V1 robuste devrait définir une interface interne de résolution morphologique :

```text
analyze(language, text, tokens)
→ analyses alignées, versionnées et normalisées
```

Cette interface permettrait :

- Stanza comme candidat de référence ;
- UDPipe comme fallback léger ;
- spaCy comme concurrent sérieux si ses résultats ou son exploitation sont meilleurs pour certaines langues ;
- mappings validés Dico-IC prioritaires dans l'architecture hybride.

### Sélection guidée par les mesures

À moyen terme, le moteur retenu pourrait être :

- Stanza pour les quatre langues si son coût reste acceptable ;
- spaCy si sa vitesse, sa maintenance et ses résultats sont meilleurs ;
- UDPipe si son écart de qualité est faible ;
- éventuellement une stratégie par langue, mais seulement si le gain justifie la complexité.

Le rapport ne recommande pas d'adopter quatre moteurs différents dès la V1. L'homogénéité est une valeur importante pour un projet exploratoire.

## 21. Options à éviter comme moteur principal

### LLM dans `POST /analysis`

À éviter pour coût, latence, reproductibilité, confidentialité et risque d'hallucination.

### Stemmers

À exclure : ils produisent des racines techniques, pas des lemmes dictionnaires.

### Règles artisanales par suffixe

Utiles pour quelques explications pédagogiques, mais insuffisantes comme système de lemmatisation multilingue. Elles échouent sur les irrégularités et ambiguïtés.

### TreeTagger comme choix par défaut d'une nouvelle V1

À éviter sans raison institutionnelle ou résultat de benchmark nettement favorable. Il reste testable, mais son modèle de tags et ses contraintes de distribution risquent d'augmenter la dette d'intégration.

### Un lexique français seul

Lefff est précieux comme ressource, mais ne répond pas au besoin quadrilingue et contextuel.

## 22. Protocole d'expérimentation recommandé

### Corpus

Constituer un corpus court mais contrasté pour chaque langue :

- textes authentiques proches des usages enseignants ;
- noms, adjectifs et verbes ;
- singulier/pluriel et accords ;
- conjugaisons fréquentes et irrégulières ;
- homographes ;
- apostrophes, contractions et clitiques ;
- formes inconnues et noms propres.

### Annotation de référence

Pour chaque token :

- surface ;
- offsets ;
- lemme attendu ;
- POS ;
- traits morphologiques utiles ;
- analyses alternatives acceptables ;
- degré de certitude humaine.

### Moteurs à comparer en priorité

1. Stanza ;
2. UDPipe ;
3. spaCy ;
4. baseline lexicale légère.

TreeTagger et Trankit peuvent être ajoutés si le temps d'étude le permet.

### Mesures

- exactitude du lemme ;
- exactitude par catégorie grammaticale ;
- couverture ;
- qualité des traits ;
- taux d'alignement correct avec les tokens Seven Sieves ;
- latence à froid et à chaud ;
- mémoire par langue ;
- gain d'enrichissements pour chaque tamis ;
- faux enrichissements causés par une mauvaise lemmatisation.

### Tests d'intégration indispensables

- conservation exacte des offsets UTF-16 ;
- texte avec accents et caractères hors BMP ;
- service indisponible ;
- timeout ;
- modèle de langue absent ;
- résultat vide ;
- désaccord entre mapping validé et moteur ;
- plusieurs analyses plausibles.

## 23. Sources officielles à vérifier avant prototype

- [spaCy — modèles](https://spacy.io/models)
- [spaCy — composant Lemmatizer](https://spacy.io/api/lemmatizer)
- [Stanza — modèles disponibles](https://stanfordnlp.github.io/stanza/available_models.html)
- [Stanza — lemmatisation](https://stanfordnlp.github.io/stanza/lemma.html)
- [Stanza — POS et traits morphologiques](https://stanfordnlp.github.io/stanza/pos.html)
- [UDPipe — site officiel](https://ufal.mff.cuni.cz/udpipe)
- [Universal Dependencies — traits morphologiques](https://universaldependencies.org/u/feat/index.html)
- [TreeTagger — page officielle](https://www.cis.uni-muenchen.de/~schmid/tools/TreeTagger/)
- [Lefff — page de référence ALPAGE](https://alpage.inria.fr/frmgwiki/lefff)
- [simplemma — dépôt officiel](https://github.com/adbar/simplemma)
- [Trankit — dépôt officiel](https://github.com/nlp-uoregon/trankit)

Avant installation, il faudra noter pour chaque candidat : version, date du modèle, licence du code, licence des données, taille, hash de l'artefact et treebank utilisé.

## Conclusion

Le moteur qui mérite réellement le premier prototype Dico-IC est **Stanza**, non parce qu'il serait supposé gagner tout benchmark, mais parce qu'il couvre le contrat expérimental le plus complet : lemme contextuel, POS et traits Universal Dependencies pour les quatre langues dans une interface cohérente.

**UDPipe** doit être évalué en parallèle comme alternative plus légère. **spaCy** reste un candidat majeur pour la V1, particulièrement si ses pipelines offrent un meilleur compromis performance-maintenance sur le corpus réel.

La décision finale ne doit pas être prise sur la réputation générale des outils. Elle doit reposer sur un corpus d'intercompréhension, l'alignement exact avec les tokens Seven Sieves et le gain pédagogique mesuré dans les sept tamis.
