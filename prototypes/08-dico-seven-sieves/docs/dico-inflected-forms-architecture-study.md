# Dico-IC — étude d'architecture des formes fléchies

## Statut du document

Ce document est une étude exploratoire. Il ne définit pas un schéma final et ne constitue pas une décision d'implémentation.

Aucun code, script SQL, endpoint ou modèle de données n'est modifié dans le cadre de cette étude.

## 1. Rappel du problème

Dico-IC distingue actuellement :

```text
lexical_entry
    ↓
lexical_form
    ↓
form_relation
```

Dans l'usage désormais visé, `lexical_form.lemma` doit contenir une forme canonique de dictionnaire : nom au singulier, verbe à l'infinitif, adjectif sous sa forme canonique, etc.

Seven Sieves, en revanche, reçoit des textes authentiques. Ses tokens contiennent des formes de surface :

```text
utiles
élèves
mangent
organizaciones
```

Le besoin fonctionnel est donc :

```text
occurrence du texte
    ↓
résolution morphologique
    ↓
lemme canonique dans lexical_form
    ↓
lexical_entry, relations, règles et traits Dico-IC
    ↓
enrichissements Seven Sieves
```

### Limite actuelle précise

`POST /analysis` normalise chaque token en `lookup_key`, puis cherche cette valeur directement dans `lexical_form.normalized_lemma` pour la langue source.

Cette normalisation gère la casse et les diacritiques, mais elle ne lemmatise pas :

```text
útiles          → utiles
útil            → util

mangent         → mangent
manger          → manger

organizaciones  → organizaciones
organización    → organizacion
```

Les deux côtés restent différents. Une forme fléchie ne rejoint donc pas les connaissances attachées au lemme, sauf si elle a été stockée à tort comme `lexical_form` ou si une heuristique indépendante produit un signal partiel.

### Distinction conceptuelle nécessaire

Trois objets ne doivent pas être confondus :

1. **Le lemme canonique** : ressource lexicale mutualisée, par exemple `manger`.
2. **La forme morphologique** : réalisation possible du lemme, par exemple `mangent`.
3. **L'occurrence** : apparition de `mangent` à un offset précis dans un texte particulier.

Dico-IC peut avoir intérêt à mutualiser les deux premiers. L'occurrence reste dans la requête et la réponse stateless de Seven Sieves ; elle ne doit pas devenir une donnée apprenante ou une activité persistée.

## 2. Critères de comparaison

Les options sont évaluées selon les critères suivants :

- capacité à reconnaître une forme jamais vue ;
- précision et gestion de l'ambiguïté ;
- explicabilité pédagogique ;
- reproductibilité des analyses ;
- couverture du français, de l'espagnol, de l'italien et du portugais ;
- coût de stockage et d'administration ;
- simplicité des requêtes MariaDB ;
- compatibilité avec un `POST /analysis` stateless ;
- séparation entre lemme, morphologie et occurrence ;
- risque de pollution de la base ;
- possibilité d'évolution progressive.

## 3. Option A — table dédiée aux formes fléchies

### Principe

Le modèle distinguerait explicitement le lemme et ses réalisations :

```text
lexical_entry
    ↓
lexical_form          forme canonique par langue
    ↓
inflected_form        forme de surface possible
```

Conceptuellement, une forme fléchie pourrait porter :

- la forme affichable ;
- une forme normalisée pour la recherche ;
- des traits morphologiques éventuels : nombre, genre, personne, temps, mode ;
- une provenance ;
- un niveau de confiance ;
- un statut de validation.

Cette liste décrit les besoins possibles, pas une proposition SQL arrêtée.

### Avantages

- La distinction entre lemme et flexion devient explicite et lisible.
- Le lookup est déterministe et indexable : une forme connue mène directement à un ou plusieurs lemmes.
- Les résultats sont reproductibles indépendamment de la version d'un moteur externe.
- La provenance et la validation humaine peuvent être conservées.
- Les exceptions, formes irrégulières et formes pédagogiquement importantes sont représentables.
- `form_relation` reste consacré aux relations d'intercompréhension entre lemmes.
- Les assistants lexicaux peuvent continuer à ne produire que des lemmes.

### Inconvénients

- Les paradigmes complets peuvent produire beaucoup de lignes, surtout pour les verbes.
- Une génération exhaustive stockerait de nombreuses formes qui ne seront jamais rencontrées.
- L'ambiguïté doit être prévue : une même surface peut mener à plusieurs lemmes ou analyses.
- Les traits morphologiques varient selon les langues ; un modèle trop rigide deviendrait vite encombrant.
- La qualité dépend de la provenance des paradigmes et de leur maintenance.
- Une interface d'administration supplémentaire serait nécessaire.

### Point important sur l'ambiguïté

Une contrainte d'unicité simple sur la forme normalisée serait insuffisante. Une forme de surface peut être homographe de plusieurs analyses. Le lookup doit donc pouvoir renvoyer plusieurs candidats, puis utiliser la langue et le contexte pour les classer.

### Coût

- **Schéma** : moyen ; nouvel objet et nouveaux index.
- **Données** : de faible à très élevé selon que l'on stocke seulement des formes attestées ou des paradigmes complets.
- **API** : moyen ; ajout d'une étape de résolution avant le chargement des ressources lexicales.
- **Admin** : moyen à élevé ; consultation, correction, provenance et gestion des ambiguïtés.

### Seven Sieves

```text
token "organizaciones"
    ↓ lookup langue=es + forme normalisée
inflected_form "organizaciones"
    ↓
lexical_form "organización"
    ↓
relations et famille lexicale
    ↓
enrichissements sur le token original
```

Seven Sieves continue d'afficher `organizaciones`. La résolution vers `organización` reste une donnée d'analyse, pas un remplacement visuel du texte.

### Assistants IA

- **Domaine** : aucun changement de responsabilité ; il propose des lemmes.
- **Texte** : il ne devrait plus créer un nouveau concept pour chaque flexion inconnue. Il pourrait, à terme, proposer séparément un mapping surface → lemme.
- **Relations** : inchangé ; les relations restent entre formes canoniques.

### Appréciation

L'option A est un bon modèle persistant, particulièrement pour les exceptions et les mappings validés. Elle devient lourde si elle cherche à matérialiser tous les paradigmes de toutes les langues.

## 4. Option B — utiliser `form_relation`

### Principe

L'idée serait de représenter :

```text
utile  --HAS_INFLECTED_FORM-->  utiles
manger --HAS_INFLECTED_FORM-->  mangent
```

### Faisabilité avec le modèle actuel

`form_relation` relie deux identifiants de `lexical_form`. Pour créer cette relation, `utiles` ou `mangent` devraient donc eux-mêmes devenir des `lexical_form`.

Cette option réintroduirait exactement le problème que la correction des prompts vient de réduire : le même niveau mélangerait lemmes canoniques et formes fléchies.

Elle nécessiterait également :

- un nouveau type `HAS_INFLECTED_FORM` ;
- une relation nécessairement asymétrique ;
- une convention pour distinguer les nœuds canoniques des nœuds fléchis ;
- des requêtes supplémentaires pour remonter de la surface au lemme.

### Avantages

- Réutilisation apparente d'une structure existante.
- Possibilité technique de stocker un score, une provenance et des notes.
- Aucun nouvel objet conceptuel si l'on accepte de surcharger `lexical_form`.

### Inconvénients

- Détournement sémantique de `form_relation`, aujourd'hui centrée sur les relations d'intercompréhension entre formes lexicales.
- Pollution de `lexical_form` par des formes non canoniques.
- Mélange entre relations interlinguistiques, relations morphologiques intralinguistiques et flexion.
- Les assistants Relations verraient des nœuds fléchis et pourraient proposer des cognats ou faux amis sur le mauvais niveau.
- Le nombre de nœuds et d'arêtes augmenterait fortement.
- La lisibilité de l'admin et des requêtes diminuerait.
- Le lien `HAS_INFLECTED_FORM` n'exprimerait pas naturellement les traits morphologiques.
- Les enrichissements actuels pourraient prendre une flexion pour une forme à comparer directement dans les tamis 1 et 2.

### Performance

Le lookup demanderait d'abord de trouver un `lexical_form` représentant la surface, puis de parcourir `form_relation` vers le lemme, puis d'interroger à nouveau les relations du lemme. Des index pourraient limiter le coût, mais le chemin serait inutilement indirect et sémantiquement ambigu.

### Seven Sieves

```text
token "mangent"
    ↓
lexical_form "mangent"
    ↓ relation HAS_INFLECTED_FORM inversée
lexical_form "manger"
    ↓ autres form_relation
enrichissements
```

Le moteur devrait filtrer avec soin les relations morphologiques pour qu'elles ne soient pas affichées comme des relations d'intercompréhension.

### Appréciation

L'option B est techniquement contournable mais architecturalement déconseillée. Elle économise une table au prix d'une confusion durable du modèle central.

## 5. Option C — lemmatisation dynamique sans stockage

### Principe

Un moteur morphologique analyse chaque token au moment de la requête :

```text
token et contexte
    ↓
lemmatiseur pour la langue source
    ↓
un ou plusieurs candidats lemma + POS + traits
    ↓
lookup dans lexical_form
```

### Avantages

- Reconnaissance possible de formes jamais vues dans Dico-IC.
- Aucun accroissement du volume de la base.
- Aucun nouvel écran d'administration.
- Bonne adéquation aux textes authentiques et aux verbes très productifs.
- Le contexte de la phrase peut aider à désambiguïser la catégorie et le lemme.
- Une première expérimentation peut être menée sans décider immédiatement d'un modèle persistant.

### Inconvénients

- Dépendance à un moteur ou à des modèles linguistiques par langue.
- Couverture et qualité potentiellement inégales entre français, espagnol, italien et portugais.
- Résultats sensibles à la tokenisation, au contexte, aux noms propres et aux usages non standard.
- Une mise à jour du moteur peut modifier les résultats d'une même requête.
- Les erreurs ne peuvent pas être corrigées durablement dans Dico-IC sans mécanisme d'exception.
- Le déploiement peut devenir plus lourd que l'actuelle API Node légère.
- Un appel à un service distant introduirait latence, disponibilité et questions de transmission des textes.

### Robustesse et reproductibilité

Pour rester explicable, une future réponse devrait connaître au minimum :

- le candidat retenu ;
- les candidats alternatifs utiles ;
- la confiance ;
- la source ou le moteur ;
- la version du moteur ;
- le fait que la résolution est dynamique.

Sans ces éléments, une correction pédagogique serait difficile à reproduire.

### Seven Sieves

```text
token "élèves" + contexte
    ↓
analyse dynamique : élève / noun / plural
    ↓
lookup lexical_form "élève"
    ↓
connaissances Dico-IC
    ↓
enrichissements liés au token "élèves"
```

Si plusieurs analyses sont plausibles, l'API peut soit retenir la meilleure avec prudence, soit ne pas produire d'enrichissement lexical et émettre un warning.

### Assistants IA

L'assistant Texte bénéficierait directement de la même résolution avant son calcul de couverture. Une surface fléchie dont le lemme existe ne serait plus envoyée à l'IA comme concept absent.

### Appréciation

L'option C est excellente pour expérimenter et couvrir l'inédit. Elle est moins satisfaisante seule pour les exceptions, les corrections humaines et la reproductibilité à long terme.

## 6. Option D — architecture hybride

### Principe

L'architecture combine :

1. un lookup exact sur les lemmes ;
2. un lookup dans des mappings de formes fléchies validés, s'ils existent ;
3. une lemmatisation dynamique pour les formes encore inconnues ;
4. un stockage progressif et contrôlé des mappings utiles ou corrigés.

### Pipeline proposé conceptuellement

```text
token de surface + langue + contexte
    ↓
1. correspondance exacte avec un lemme canonique ?
    ├─ oui → lexical_form
    └─ non
        ↓
2. mapping morphologique persistant validé ?
    ├─ oui → lexical_form
    └─ non
        ↓
3. lemmatisation dynamique
        ↓
candidats lemma / POS / traits / confiance
        ↓
résolution vers lexical_form
        ↓
enrichissements Dico-IC
```

### Stockage progressif : garde-fou essentiel

Le stockage ne devrait pas être une écriture automatique effectuée par `POST /analysis`.

La V0 de Seven Sieves est stateless et ce principe reste souhaitable. Une analyse de texte ne doit pas polluer le dictionnaire par chaque hypothèse du moteur.

Un futur workflow prudent serait :

```text
analyse dynamique
    ↓
mapping proposé avec provenance et confiance
    ↓
validation ou correction dans Dico-IC Admin
    ↓
promotion vers la connaissance mutualisée
```

Les analyses fréquentes et sûres pourraient éventuellement être mises en cache techniquement, mais un cache d'exécution ne doit pas être confondu avec la connaissance linguistique validée.

### Avantages

- Couvre à la fois les formes inédites et les exceptions validées.
- Permet une adoption progressive plutôt qu'un chargement massif de paradigmes.
- Les corrections humaines deviennent reproductibles.
- Les formes fréquentes dans les corpus enseignants peuvent enrichir la ressource sans stocker tout l'espace morphologique.
- Les responsabilités restent claires : lemmes dans `lexical_form`, mappings morphologiques dans un objet dédié, relations IC dans `form_relation`.
- La provenance permet de distinguer règle, moteur, import et validation humaine.

### Inconvénients

- Pipeline plus complexe que les options A ou C prises isolément.
- Il faut définir une priorité entre mapping validé, moteur et éventuelles règles locales.
- Les divergences entre une donnée persistée et une nouvelle version du moteur doivent être arbitrées.
- Un écran admin minimal de revue morphologique serait nécessaire à terme.
- Le diagnostic d'une résolution doit rester visible pour ne pas devenir opaque.

### Seven Sieves

Seven Sieves n'a pas besoin de connaître la stratégie de stockage. Il continue à recevoir :

- le token original et ses offsets ;
- les enrichissements calculés ;
- éventuellement, dans une évolution additive du contrat, le lemme résolu, les traits morphologiques, la confiance et la provenance.

Le texte affiché reste strictement identique au texte source.

### Assistants IA

- **Domaine** : continue à produire uniquement des lemmes.
- **Texte** : utilise la résolution morphologique avant de déclarer un mot absent ; peut proposer un mapping séparé si le lemme est connu.
- **Relations** : continue à travailler uniquement sur les formes canoniques d'une entrée.

### Appréciation

L'option D offre le meilleur équilibre à long terme, à condition de rester progressive et de séparer strictement analyse automatique, cache technique et connaissance validée.

## 7. Matrice comparative

| Critère | A — table dédiée | B — relations | C — dynamique | D — hybride |
|---|---|---|---|---|
| Formes jamais vues | faible sans import | faible | forte | forte |
| Reproductibilité | forte | forte mais modèle confus | moyenne | forte pour les mappings validés |
| Exceptions | forte | possible mais illisible | faible | forte |
| Ambiguïté | représentable si prévue | difficile à lire | dépend du moteur | représentable et contextualisable |
| Volume DB | moyen à très élevé | élevé | nul | maîtrisable |
| Simplicité du modèle | bonne si limitée | faible | bonne côté DB | moyenne |
| Explicabilité | forte | faible | variable | forte si provenance exposée |
| Charge admin | moyenne à élevée | élevée | faible | progressive |
| Compatibilité stateless | oui | oui | oui | oui si aucune écriture dans `/analysis` |
| Respect de `form_relation` | oui | non | oui | oui |
| Pertinence pour Dico-IC | bonne | faible | bonne pour prototype | meilleure cible |

## 8. Analyse des cas concrets

### `utile` / `utiles`

Résolution attendue :

```text
utiles → utile
POS : adjective
traits possibles : plural ; genre potentiellement ambigu selon le contexte
```

- **A** : mapping explicite simple, mais une même surface française peut correspondre à plusieurs accords.
- **B** : oblige à créer `utiles` comme `lexical_form`, ce qui contredit la convention canonique.
- **C** : généralement accessible à un lemmatiseur ; le contexte aide pour l'analyse grammaticale.
- **D** : dynamique par défaut, mapping validé utile si cette forme est fréquente ou corrigée.

Une fois `utile` résolu, les tamis lexicaux peuvent exploiter les relations avec `útil`, `utile`, `útil` et `useful` selon les données disponibles.

### `élève` / `élèves`

Résolution nominale attendue :

```text
élèves → élève
POS : noun
trait : plural
```

Le cas montre aussi l'importance du contexte : des graphies proches peuvent appartenir à plusieurs catégories ou analyses. Un simple retrait de `s` ne constitue pas une lemmatisation robuste.

- **A** conserve une correction validée mais doit accepter plusieurs candidats si nécessaire.
- **C** peut utiliser la phrase pour classer les analyses.
- **D** permet à une correction humaine de prendre priorité sur une analyse dynamique future.

### `manger` / `mangent`

Résolution attendue :

```text
mangent → manger
POS : verb
traits possibles : indicative, present, third person, plural
```

Ce cas illustre la limite d'un stockage exhaustif : un verbe possède de nombreuses réalisations. L'option C ou D évite de précharger tous les paradigmes.

La résolution rend le POS verbal disponible pour le tamis 5, tandis que les traits de conjugaison deviennent particulièrement intéressants pour le tamis 6.

### `organización` / `organizaciones`

Résolution attendue :

```text
organizaciones → organización
POS : noun
trait : plural
```

Une fois le lemme résolu, Dico-IC peut retrouver la relation cognate avec `organisation` et la règle `-ción → -tion`.

Il faut toutefois distinguer deux observations :

- la relation lexicale entre les lemmes `organización` et `organisation` ;
- la marque flexionnelle de pluriel visible dans `organizaciones`.

Le tamis 1 devrait s'appuyer sur le lemme et sa relation. Les tamis 3 et 7 peuvent examiner à la fois la surface et le lemme, selon qu'ils expliquent une correspondance dérivationnelle ou une marque flexionnelle.

## 9. Impact sur Seven Sieves

### Contrat actuel

Le contrat V0 peut rester fonctionnel sans rupture : les tokens conservent leur `surface`, leurs offsets UTF-16 et leurs enrichissements.

La résolution morphologique serait une étape interne à l'API avant `loadAnalysisResources()`.

### Extension future possible

Pour l'explicabilité et le diagnostic, une version future pourrait ajouter à un token mot un objet facultatif de ce type :

```json
{
  "morphology": {
    "lemma": "manger",
    "part_of_speech": "verb",
    "features": {
      "number": "plural",
      "person": "third",
      "tense": "present"
    },
    "confidence": 0.93,
    "source": "dynamic_lemmatizer"
  }
}
```

Cet exemple est illustratif. Le choix des traits, de leur vocabulaire et de la version du contrat doit faire l'objet d'une spécification séparée.

### Rendu

Seven Sieves devrait toujours :

- reconstruire et afficher la forme originale ;
- attacher l'info-bulle à l'occurrence originale ;
- présenter le lemme comme une analyse ou une aide, pas comme une correction du texte ;
- afficher une prudence lorsque plusieurs lemmes sont plausibles.

## 10. Impact potentiel sur les sept tamis

### Tamis 1 — Lexique international

Impact direct et fort.

Aujourd'hui, une flexion non reconnue ne peut pas atteindre les `COGNATE_*` du lemme. La résolution `organizaciones → organización` permettrait de réutiliser la relation vers `organisation` sans créer une relation par flexion.

Opportunité : augmenter fortement la couverture tout en conservant un lexique de relations compact.

Risque : une lemmatisation incorrecte pourrait produire une transparence trompeuse. La confiance et l'ambiguïté doivent être prises en compte.

### Tamis 2 — Lexique pan-roman

Impact direct et fort.

Une flexion résolue retrouve la `lexical_entry` et donc toute la famille multilingue canonique. Il n'est pas nécessaire de stocker des familles complètes pour chaque nombre, genre ou conjugaison.

Opportunité : comparer les lemmes entre langues tout en expliquant que le texte présente une forme fléchie.

### Tamis 3 — Correspondances phonétiques ou graphiques régulières

Impact mixte.

Certaines correspondances interlinguistiques sont plus lisibles sur le lemme ; d'autres restent visibles dans la surface. Une architecture future devrait permettre aux règles d'indiquer leur niveau d'application : surface, lemme ou segment morphologique.

Opportunité : éviter qu'une terminaison flexionnelle masque une correspondance entre radicaux.

Risque : appliquer une règle conçue pour un lemme à la surface complète peut générer une transformation artificielle.

### Tamis 4 — Graphies et prononciations

Impact plutôt centré sur la surface.

La graphie réellement rencontrée par l'apprenant reste l'objet principal. Le lemme peut fournir un contexte lexical, mais il ne doit pas remplacer la forme observée pour expliquer la prononciation.

Opportunité : comparer surface, radical et lemme pour mieux localiser le signal.

### Tamis 5 — Syntaxe pan-romane

Impact indirect mais important.

Le lemme fournit une catégorie grammaticale probable. La forme fléchie et le contexte sont cependant nécessaires pour estimer le rôle dans la phrase. `mangent → manger` indique un verbe, mais pas à lui seul son sujet ni sa fonction exacte.

Opportunité : remplacer l'actuelle simple reconnaissance lexicale par un indice mieux contextualisé.

### Tamis 6 — Morphosyntaxe

Impact le plus fort.

La résolution peut produire non seulement le lemme, mais aussi les traits portés par la flexion : nombre, genre, personne, temps ou mode. Ces informations correspondent directement à la finalité du tamis.

Opportunité : expliquer que `mangent` est une forme plurielle de `manger`, ou que `organizaciones` marque le pluriel.

Risque : les inventaires de traits et les ambiguïtés diffèrent selon les langues ; ce tamis demande une modélisation prudente.

### Tamis 7 — Préfixes et suffixes

Impact important mais délicat.

Il devient possible de distinguer :

- un suffixe dérivationnel utile à l'intercompréhension, comme `-ción` ;
- une terminaison flexionnelle, comme le pluriel de `organizaciones` ;
- une terminaison de conjugaison, comme dans `mangent`.

Opportunité : produire des explications plus précises et éviter de traiter toute finale comme un affixe de même nature.

## 11. Impact technique, linguistique et pédagogique

### Technique

La future résolution doit intervenir avant la requête par lot sur `lexical_form`. Elle doit préserver :

- le token et ses offsets ;
- la langue source explicite ;
- le traitement par lots ;
- la nature stateless de l'analyse ;
- la provenance de la décision ;
- les candidats multiples lorsque le résultat est ambigu.

Le cache de performances, s'il existe, doit rester distinct du stockage linguistique validé.

### Linguistique

Une forme fléchie ne se réduit pas toujours à une transformation orthographique simple. Il faut prévoir :

- irrégularités ;
- homographie ;
- syncrétisme morphologique ;
- formes lexicalisées ;
- mots invariables ;
- contractions et clitiques ;
- mots composés ;
- variation régionale ou orthographique ;
- catégories grammaticales dépendantes du contexte.

Le modèle ne doit donc pas supposer une relation surface → lemme toujours unique.

### Pédagogique

La forme fléchie peut elle-même être un indice utile. L'objectif n'est pas seulement de la traverser pour atteindre un lemme, mais de pouvoir expliquer ce qu'elle signale.

Une bonne réponse pédagogique peut articuler :

```text
forme observée : mangent
lemme : manger
indice morphologique : troisième personne du pluriel
famille interlinguistique : manger / mangiare / comer
prudence : analyse dépendante du contexte
```

La résolution doit rester une aide à l'inférence, pas une traduction automatique opaque.

## 12. Recommandation finale

### Cible recommandée : option D, hybride

La meilleure cible pour Dico-IC est une architecture hybride composée de :

1. `lexical_form` réservé aux lemmes canoniques ;
2. lemmatisation dynamique pour couvrir les formes inédites ;
3. un objet persistant dédié, proche de l'option A, pour les mappings attestés, les exceptions et les corrections validées ;
4. une validation humaine avant toute promotion dans la connaissance mutualisée ;
5. `form_relation` conservée pour les relations d'intercompréhension entre lemmes.

### Pourquoi ne pas choisir A seule ?

Parce que stocker préventivement tous les paradigmes serait coûteux et disproportionné pour un projet encore exploratoire. La table dédiée garde néanmoins toute sa valeur comme mémoire sélective et explicable.

### Pourquoi ne pas choisir C seule ?

Parce qu'un moteur dynamique ne capitalise pas les corrections enseignantes, gère imparfaitement les exceptions et rend la reproductibilité dépendante de sa version.

### Pourquoi écarter B ?

Parce qu'elle mélange les niveaux du modèle, pollue `lexical_form` et détourne `form_relation` de sa fonction pédagogique centrale.

### Principe de priorité recommandé

À terme, l'ordre de confiance pourrait être :

```text
mapping validé explicitement
    ↓
analyse dynamique à forte confiance
    ↓
analyse ambiguë avec warning
    ↓
absence de résolution plutôt qu'affirmation fragile
```

Cette priorité devra être testée sur corpus avant d'être figée.

## 13. Stratégie d'évolution prudente

### Étape 1 — définir le contrat de résolution

Avant tout SQL, préciser :

- différence entre surface, forme normalisée et lemme ;
- représentation des candidats multiples ;
- vocabulaire minimal des traits morphologiques ;
- provenance, confiance et version ;
- comportement en cas d'échec.

### Étape 2 — constituer un petit corpus d'évaluation

Utiliser des extraits authentiques dans les quatre langues et annoter manuellement :

- surface ;
- lemme attendu ;
- POS ;
- traits utiles ;
- ambiguïtés ;
- impact attendu sur les tamis.

Les quatre cas de ce document peuvent former le premier noyau, mais ils sont insuffisants pour décider seuls.

### Étape 3 — prototyper l'option C sans écriture

Comparer un ou plusieurs moteurs de lemmatisation sur ce corpus, dans un chemin expérimental séparé. Mesurer :

- précision du lemme ;
- couverture par langue ;
- temps de réponse ;
- stabilité ;
- qualité des traits ;
- erreurs pédagogiquement risquées.

### Étape 4 — tester le gain réel pour Seven Sieves

Mesurer combien de tokens supplémentaires reçoivent un enrichissement pertinent dans chaque tamis, et combien de faux positifs apparaissent.

### Étape 5 — décider du stockage persistant

N'introduire un objet dédié qu'après avoir identifié :

- les corrections réellement nécessaires ;
- les formes fréquentes ;
- les exceptions ;
- les besoins de provenance ;
- les opérations d'administration minimales.

### Étape 6 — concevoir un workflow admin limité

Un futur écran pourrait montrer :

```text
surface rencontrée
→ lemme proposé
→ contexte court
→ traits et confiance
→ accepter / corriger / ignorer
```

Il ne devrait ni importer automatiquement tous les tokens ni exposer à l'enseignant une validation mot par mot obligatoire.

## 14. Pistes à long terme

- Distinguer mappings validés, formes importées depuis une ressource et hypothèses calculées.
- Ajouter des exceptions prioritaires par langue sans recopier des paradigmes complets.
- Versionner le moteur morphologique utilisé dans les analyses reproductibles.
- Étudier des règles morphologiques génératives pour les paradigmes réguliers, séparées des `pattern_rule` interlinguistiques actuelles.
- Permettre plusieurs analyses pour une même surface et les classer avec le contexte.
- Étudier les contractions, clitiques et formes composées propres aux langues romanes.
- Exploiter les formes réellement fréquentes dans les corpus enseignants pour prioriser la validation.
- Distinguer clairement affixes dérivationnels, marques flexionnelles et correspondances interlinguistiques.
- Évaluer si les traits morphologiques doivent être stockés de façon structurée, extensible ou liée à un vocabulaire standard.
- Préserver la possibilité d'une analyse locale, explicable et respectueuse des textes transmis.

## 15. Questions à laisser ouvertes

- Quel niveau de précision morphologique est pédagogiquement utile pour chacun des sept tamis ?
- Faut-il stocker seulement les exceptions et corrections, ou aussi les formes fréquentes validées ?
- Quelle source de vérité doit primer lorsqu'un moteur contredit un mapping ancien ?
- Comment représenter une surface associée à plusieurs lemmes sans forcer une décision hors contexte ?
- Quel moteur offre une couverture suffisamment homogène des quatre langues prioritaires ?
- Les enseignants doivent-ils valider des mappings morphologiques, ou cette tâche relève-t-elle plutôt d'une administration linguistique spécialisée ?
- À partir de quel gain de couverture Seven Sieves une évolution du schéma devient-elle justifiée ?

## Conclusion

La forme fléchie doit être pensée comme une voie d'accès morphologique vers un lemme, pas comme une nouvelle entrée lexicale ni comme une relation d'intercompréhension ordinaire.

La recommandation est de commencer par évaluer une lemmatisation dynamique sans écriture, puis de faire évoluer Dico-IC vers une architecture hybride seulement si les mesures le justifient. Dans cette cible, un stockage dédié et sélectif conserve les mappings validés et les exceptions, tandis que le moteur dynamique couvre les formes inédites.

Cette trajectoire protège les principes actuels du projet : simplicité, explicabilité, progressivité, prudence linguistique et réversibilité.
