# Mission 201 — Audit de la politique linguistique des noms de concept Dico-IC

Date : 2026-08-18  
Composant : Dico-IC / Seven Sieves  
Nature : audit exploratoire strictement en lecture seule  
Version obtenue : inchangée — assistant texte `0.1.10`, administration principale `0.1.5`, API générale `0.1`, package Node `1.0.0`

## 1. Synthèse et recommandation

Le projet ne possède actuellement **aucune politique linguistique stable et
explicite** pour `lexical_entry.entry_key`.

La convention initiale était implicitement anglophone et descriptive :
`PHENOMENON_OBSERVABLE`, `INFORMATION_DATA`, `UNIVERSITY_INSTITUTION`,
`BOOKSHOP_STORE`. Elle ne découlait toutefois ni du schéma ni d'une règle
documentée. Les strates suivantes ont introduit des clés anglaises simples, des
constructions espagnol–anglais, des clés françaises, des suffixes grammaticaux
tantôt anglais tantôt français, puis de nouvelles clés anglaises et françaises.
La base active est donc le résultat d'une **coexistence non gouvernée**, pas
d'une politique neutre ou liée systématiquement à la langue source.

L'orientation proposée par David est confirmée, avec deux nuances :

1. le français doit être présenté comme **langue de nomination humaine des
   nouveaux concepts**, et non comme la langue intrinsèque ou universelle du
   concept ;
2. la catégorie grammaticale ne doit pas devenir un suffixe systématique de la
   clé. Elle existe déjà sur chaque `lexical_form` et ne doit être ajoutée au nom
   conceptuel que lorsqu'elle participe réellement à une distinction que le
   qualificatif sémantique ne suffit pas à exprimer.

Politique recommandée à court terme :

```text
nouvelle entry_key
  = nom conceptuel français lisible
  + canonicalisation ASCII majuscule existante
  + qualificatif sémantique français seulement si nécessaire
  + validation humaine obligatoire

anciennes entry_key
  = conservées telles quelles
  = jamais renommées en masse avant mécanisme d'alias ou d'identifiant stable
```

Exemples conformes : `SOUFFRIR`, `PREOCCUPANT`, `AUGMENTER`,
`BANQUE_FINANCE`, `BANQUE_DONNEES`, `VOLER_DEPLACEMENT_AERIEN`,
`VOLER_DEROBER`.

## 2. Périmètre, état initial et méthode

### État Git

Le dépôt était propre au début de l'audit. `HEAD` pointait sur :

```text
4cab65e fix(dico): fiabiliser les générations IA et canonicaliser les clés techniques
```

Les commits des Missions 195 à 200 sont donc consolidés dans le commit annoncé.
Le numéro de rapport suivant a été déterminé par la séquence réelle : le maximum
était 200 et le chemin 201 n'existait pas avant cette mission.

### Sources examinées

- schéma actif MariaDB et métadonnées `information_schema` ;
- toutes les lignes de `lexical_entry` et leurs formes associées, en lecture
  seule ;
- `database/schema.sql`, `seed_data.sql`, `seed_data_v2.sql`, `data_test.sql` et
  les seeds de `database/current_draft/` ;
- procédures SQL et accès du dépôt Node ;
- prompts Domaine et Texte, validations, routes, administration et tests ;
- documentation de modèle, contrat d'analyse, déduplication et assistants IA ;
- rapports 195 à 200 et rapports de déduplication antérieurs ;
- historique Git disponible dans le dépôt consolidé ;
- copies historiques accessibles dans `Applications/Dico` et
  `Applications/IC-Lab/prototypes/08-dico-seven-sieves`.

Les copies historiques examinées confirment les mêmes schémas, seeds et prompts
antérieurs à la Mission 200. Le dépôt consolidé ne fournit que le commit
d'import initial du 10 juillet et les commits récents pour ces fichiers : cette
limite empêche de dater finement chaque inflexion antérieure. Aucun document
historique consulté n'énonce une langue obligatoire pour `entry_key`.

### Méthode de classification

Les 326 clés ont été relues avec leurs gloses française et anglaise, leurs
formes, leur domaine, leurs notes et leur identifiant. La classification est une
lecture humaine prudente de la **surface de la clé**, pas un détecteur de langue
présenté comme certain.

Les classes sont mutuellement exclusives pour permettre un total quantifié :

- « français probable » : structure et mots principalement français ;
- « anglais probable » : structure et mots principalement anglais ;
- « partagé/multilingue » : forme identique ou quasi identique dans plusieurs
  langues du catalogue ;
- « international/savant » : terme translingue ou morphologie savante dont
  l'attribution à une langue unique serait artificielle ;
- « autre langue identifiable » : principalement espagnol dans le corpus ;
- « mixte/hybride » : assemblage explicite de langues ou de conventions ;
- « technique » : métalangage grammatical ou code plus que nom de concept ;
- « opaque, malformed ou non attribuable sûrement » : forme fautive ou segment
  dont l'origine ne peut pas être affirmée proprement.

Des clés telles que `GLOBAL`, `CONSTANT`, `INTERNATIONAL` ou `HABITAT` ne sont
donc pas déclarées françaises ou anglaises par simple intuition.

## 3. Convention historique retrouvée

### Modèle conceptuel

La documentation définit `lexical_entry` comme une entrée abstraite ou un pivot
sémantique et précise que `PHENOMENON_OBSERVABLE` ne correspond pas directement
à un mot d'une langue. `lexical_form` porte, elle, les lemmes réels et leur code
de langue. Cette séparation exclut une politique « toujours la langue source » :
une même entrée regroupe plusieurs langues et n'a pas de langue source unique.

Le modèle contient dès l'origine `gloss_fr` et `gloss_en`, mais aucun champ
`entry_key_language`, aucun libellé conceptuel séparé et aucune table d'alias.

### Schéma et seeds

Le schéma impose seulement :

- `VARCHAR(100)` ;
- unicité de `entry_key` ;
- puis, dans l'application actuelle, format ASCII majuscule et underscores.

Il n'impose aucune langue. Le dump historique commence par seize clés anglaises
descriptives, notamment `PHENOMENON_OBSERVABLE`, `INFORMATION_DATA`,
`IMPORTANT_SIGNIFICANT`, `NATION_COUNTRY` et `UNIVERSITY_INSTITUTION`. Le seed
expérimental poursuit ce style, y compris pour des faux amis français ou romans :
`CURRENTLY_NOW`, `BOOKSHOP_STORE`, `ATTEND_BE_PRESENT`, `CONDOM_PROTECTION`.

Les seeds de support Seven Sieves emploient également
`ORGANIZATION_ENTITY`, `LANGUAGE_SYSTEM`, `SCIENTIFIC_PROPERTY`,
`PROMOTE_ACTION` et `UNDERSTAND_COMPREHEND`. Il s'agit d'une convention
historique **anglaise lisible et sémantiquement qualifiée**, mais elle est
implicite et n'a jamais été codée comme contrat.

### Administration, prompts et tests

L'administration manuelle exige historiquement une forme syntaxique, avec des
exemples `SCHOOL_PLACE` et `INFORMATION_DATA`, sans règle linguistique.

Les prompts actuels disent seulement « clé conceptuelle stable » et imposent
majuscules/underscores ou ASCII. Ils n'indiquent jamais :

- la langue du nom ;
- le rôle de la forme française ;
- le choix du qualificatif ;
- la conduite à tenir face à une polysémie.

Les tests renforcent involontairement la convention anglaise par leurs fixtures
`SCHOOL_PLACE`, `LIBRARY_PLACE`, `ORGANIZATION_ENTITY`, `USEFUL` et
`INTERNATIONAL`, mais ils testent la structure et les contrats, pas une politique
linguistique.

### Conclusion historique

La meilleure description factuelle est :

```text
origine : préférence implicite pour des clés anglaises lisibles et qualifiées
évolution : langue variable, souvent influencée par le texte ou le lot généré
état actuel : aucune politique stable
```

Le projet n'a historiquement privilégié ni une vraie clé internationale, ni un
identifiant neutre, ni systématiquement le français, l'anglais ou la langue
source. L'anglais initial était un style de nommage technique, pas une décision
architecturale formalisée.

## 4. État réel des clés MariaDB

### Volumes constatés

| Table | Mission 200 | Mission 201 | Écart |
| --- | ---: | ---: | ---: |
| `lexical_entry` | 307 | 326 | +19 |
| `lexical_form` | 1 086 | 1 125 | +39 |
| `inflected_form` | 40 | 41 | +1 |
| `connector_help` | 12 | 12 | 0 |
| `form_relation` | 70 | 70 | 0 |
| `pattern_rule` | 1 | 1 | 0 |
| `ic_feature` | 8 | 8 | 0 |
| `language` | 12 | 12 | 0 |

Ces volumes sont l'état réel enrichi par David et ne sont pas ramenés à une
ancienne référence.

`lexical_entry` ne possède ni date ni provenance structurée. Néanmoins, les 307
entrées du relevé Mission 200 ont toutes un ID inférieur ou égal à 313. Les 19
entrées nouvelles ont exactement les ID 314 à 332 et portent 39 formes. Cette
frontière permet une comparaison sûre des entrées, mais pas de reconstruire
l'heure, le lot ou l'auteur exact de chaque création. La forme fléchie
supplémentaire n'est pas attribuée à un lot sans preuve.

### Classification des 326 clés

| Classe prudente | Avant les 19 ajouts | Ajouts ID 314–332 | Total | Proportion |
| --- | ---: | ---: | ---: | ---: |
| Français probable | 62 | 14 | 76 | 23,3 % |
| Anglais probable | 92 | 0 | 92 | 28,2 % |
| Partagé ou proche dans plusieurs langues | 19 | 2 | 21 | 6,4 % |
| International ou savant | 26 | 2 | 28 | 8,6 % |
| Autre langue identifiable, surtout espagnol | 18 | 0 | 18 | 5,5 % |
| Mixte ou hybride | 79 | 0 | 79 | 24,2 % |
| Opaque ou purement technique | 8 | 0 | 8 | 2,5 % |
| Malformed ou impossible à attribuer sûrement | 3 | 1 | 4 | 1,2 % |
| **Total** | **307** | **19** | **326** | **100,0 %** |

Exemples représentatifs :

| Classe | Exemples |
| --- | --- |
| Français probable | `SOUFFRIR`, `AUGMENTER`, `PAR_CONSEQUENT`, `INCENDIE`, `ALIMENTATION_HUMAINE` |
| Anglais probable | `PHENOMENON_OBSERVABLE`, `SCHOOL_PLACE`, `WORRYING`, `INCREASE`, `FOOD_SUPPLY` |
| Partagé/multilingue | `INTERNATIONAL`, `ACCESSIBLE`, `GLOBAL`, `TOTAL`, `HABITAT` |
| International/savant | `METHODOLOGY`, `METEOROLOGIQUE`, `DEFORESTATION`, `BIODIVERSITE` |
| Autre langue | `RESULTADO`, `TRABAJAR`, `SIN_EMBARGO`, `PROYECTO` |
| Mixte/hybride | `UNIVERSIDAD_NOUN_UNIVERSITY`, `PREOCCUPANT_ADJECTIVE`, `HUMAIN_ADJ`, `CAUSE_NOUN` |
| Technique | `DETERMINANT_POSSESSIF_1PLURAL`, `PRONOM_DEFINI_MAS_SING`, `LE_ARTICLE` |
| Malformed/non attribuable | `ELEVERSER_VERB`, `RUIINER_VERB`, `SOFFRIR`, `RUI_NER` |

Les 19 ajouts récents infléchissent nettement le corpus vers le français : 14
sont français probables, quatre sont partagés ou savants et un (`RUI_NER`) est
malformed. Cette tendance récente soutient l'orientation française, mais ne
répare pas la dette historique.

### Anomalies et incohérences évidentes

1. **Même sens, langues de clé distinctes** :
   `SOUFFRIR`/`SOUFFRIR_VERB` face à `SUFFER`,
   `PREOCCUPANT_ADJ` face à `WORRYING`,
   `AUGMENTER` face à `INCREASE`,
   `PRODUIRE` face à `PRODUCE`,
   `HUMANITE` face à `HUMANITY`,
   `S_ELEVER` face à `RISE`.
2. **Variantes de suffixe grammatical** : `_ADJ`, `_ADJECTIVE`, `_ADJECTIF`,
   `_VERB`, `_VERBE` et `_NOUN` coexistent.
3. **Clés issues de la langue observée combinées à de l'anglais technique** :
   `UNIVERSIDAD_NOUN_UNIVERSITY`, `OBSERVAR_VERB_TO_OBSERVE`,
   `MUCHO_ADJECTIVE_DETERMINER_MUCH_MANY`.
4. **Formes lexicalement suspectes** : `SOFFRIR` n'est pas le français
   `SOUFFRIR` et ressemble à une contamination romane ; `ELEVERSER_VERB`,
   `RUIINER_VERB` et `RUI_NER` ne constituent pas des noms conceptuels fiables.
5. **Multiplication d'une même famille de décision** : `PREOCCUPANT`,
   `PREOCCUPANT_ADJ`, `PREOCCUPANT_ADJECTIVE`,
   `PREOCCUPANT_ADJECTIF` et `WORRYING` ; schémas comparables autour de
   `TOTAL`, `HUMAIN`, `ACCELERE`, `CONSTANT`, `CONTINUER` et `RUINER`.

Les gloses identiques renforcent certains signaux. La glose « qui cause de
l'inquiétude » relie actuellement trois clés : `PREOCCUPANT_ADJ`, `WORRYING` et
`PREOCCUPANT_ADJECTIF`. L'identité de glose n'est cependant pas une preuve
générale d'identité conceptuelle.

## 5. Fonction réelle et consommateurs de `entry_key`

`entry_key` est aujourd'hui **à la fois un identifiant métier et un nom de
concept lisible**.

| Surface | Usage observé |
| --- | --- |
| MariaDB | clé unique de `lexical_entry`; les enfants référencent l'ID numérique |
| Procédures/seeds | `sp_upsert_lexical_entry` et `sp_upsert_lexical_form` retrouvent l'entrée par la clé |
| API admin | ressource dans `/admin/lexical-entry/:entryKey`; création, recherche et mise à jour |
| Assistants | entrée/sortie JSON, détection exacte des doublons, sélection d'une entrée pour relations et flexions |
| Administration | champ public « Clé d'entrée/CONCEPT », tableaux, messages, datasets et liens |
| URL | paramètre `entry_key` et segment `:entryKey` dans les vues d'entrée et de relations |
| Analyse / Seven Sieves | chargée avec les formes ; peut servir de repli au `family_label`; le client consomme l'API, pas MariaDB |
| Relations | indirectement via `lexical_form`; les écrans exposent aussi les clés source et cible |
| Formes fléchies | indirectement via `lexical_form_id`; l'administration expose la clé cible |
| Connector Help | clé convertie en ID au moment de la liaison ; FK finale sur l'ID |
| Tests et fixtures | nombreuses valeurs codées en dur (`INFORMATION_DATA`, `USEFUL`, `INTERNATIONAL`, etc.) |
| Documentation et scripts | exemples, requêtes, seeds, diagnostics et plans de déduplication |
| Export/portabilité | aucun export canonique dédié n'a été trouvé, mais les réponses JSON et URLs rendent la clé portable de fait |

Les seules clés étrangères directes vers `lexical_entry` sont :

- `lexical_form.entry_id → lexical_entry.id` ;
- `connector_help.lexical_entry_id → lexical_entry.id`.

`form_relation`, `inflected_form` et `ic_feature` dépendent des IDs de formes.
Un simple changement de chaîne préserverait donc ces liens SQL. Cela ne rend pas
le renommage sûr : le contrat applicatif et documentaire reste fondé sur la
chaîne.

### Risque précis d'un renommage

| Risque | Niveau | Motif |
| --- | --- | --- |
| Rupture des FK internes | faible si seul le champ change | les FK utilisent les IDs |
| Collision avec une autre clé | élevé | nombreuses variantes sémantiques existent déjà |
| Seeds et procédures | élevé | un ancien seed rejoué peut recréer l'ancienne clé ou viser la mauvaise entrée |
| API, URLs et favoris | élevé | la clé est un identifiant de ressource sans alias ni redirection |
| Assistants et déduplication | élevé | comparaison exacte de `entry_key` seulement |
| Tests, scripts et documentation | moyen à élevé | nombreuses références codées en dur |
| Consommateurs externes inconnus | non bornable | aucun registre d'usage ni contrat d'alias |
| Audit/traçabilité | élevé | aucun historique de renommage ni statut d'archive |

Conclusion : **ne pas renommer les clés historiques dans le contexte actuel**.
Une future migration devrait d'abord introduire une identité stable ou des
alias, inventorier toutes les références, sauvegarder, simuler les collisions
et fournir un rollback. Ce chantier dépasse très largement une correction de
prompt avant soutenance.

## 6. Comparaison des politiques possibles

| Option | Atouts | Faiblesses et risques | Verdict |
| --- | --- | --- | --- |
| Française | cohérente avec l'interface, `gloss_fr`, David et les enseignants ; validation humaine réaliste ; l'anglais reste comparaison | convention culturellement située ; nécessite qualification des sens et discipline éditoriale | **recommandée pour les nouvelles clés** |
| Anglaise | continuité avec les premiers seeds ; lisibilité pour certains développeurs ; vocabulaire informatique courant | validation moins sûre par les contributeurs ; rôle ambigu de l'anglais non roman ; n'apporte aucune interopérabilité formelle sans ontologie externe | non recommandée comme défaut |
| Neutre/opaque | identifiant réellement stable ; découplage langue/libellé ; bonne base d'interopérabilité future | migration, nouveau libellé, UI et alias nécessaires ; illisible seul ; disproportionné avant soutenance | cible architecturale possible, pas action immédiate |
| Coexistence contrôlée | aucune migration risquée ; politique applicable immédiatement ; dette bornée ; prépare une séparation ultérieure | corpus historique reste hétérogène ; recherche et doublons doivent compenser | **meilleur compromis actuel** |

L'anglais actuel n'est pas une norme d'interopérabilité : `WORRYING` ou
`SCHOOL_PLACE` ne sont reliés à aucun vocabulaire contrôlé externe. Remplacer le
français par l'anglais déplacerait donc la convention humaine sans produire une
neutralité technique.

## 7. Convention proposée pour les nouveaux concepts

### Règle principale

1. Choisir un **nom conceptuel français naturel**, à partir du sens et non de la
   simple forme rencontrée.
2. Utiliser le lemme canonique : infinitif pour un verbe, singulier pour un nom,
   forme dictionnaire pour adjectif et adverbe.
3. Appliquer la canonicalisation Mission 200 : majuscules, ASCII, underscores.
4. Ajouter un qualificatif **sémantique français** seulement quand le nom seul
   est ambigu dans Dico-IC.
5. Chercher les concepts existants avant création, y compris dans les autres
   langues de clé.
6. Faire valider le sens, la clé et les formes par un humain avant écriture.

### Polysémie et homonymie

Le qualificatif doit décrire le sens, pas répéter mécaniquement une traduction
anglaise :

```text
BANQUE_FINANCE
BANQUE_DONNEES
VOLER_DEPLACEMENT_AERIEN
VOLER_DEROBER
```

Une clé courte reste préférable quand un seul concept existe dans la base :
`SOUFFRIR`, `AUGMENTER`, `PREOCCUPANT`.

Si une seconde acception arrive, les nouvelles clés qualifiées ne doivent pas
entraîner automatiquement le renommage de la clé courte historique. Il faut une
décision humaine et, à terme, un système d'alias ou de libellé séparé.

### Catégorie grammaticale

La POS ne doit **pas** faire partie systématiquement du nom conceptuel :

- elle est déjà portée par chaque `lexical_form` ;
- une entrée peut regrouper des réalisations grammaticales différentes selon
  les langues ;
- les suffixes actuels montrent une forte dérive (`ADJ`, `ADJECTIVE`,
  `ADJECTIF`) ;
- le sens est généralement plus informatif que la classe grammaticale.

La POS peut être ajoutée exceptionnellement lorsque deux concepts réellement
distincts restent homonymes après analyse sémantique, avec un vocabulaire
français unique et documenté (`NOM`, `VERBE`, `ADJECTIF`, `ADVERBE`). Elle ne
doit jamais remplacer la qualification du sens.

## 8. Génération IA future

### Pourquoi le prompt actuel varie

Le prompt Texte demande d'identifier un concept à partir d'une forme absente,
de fournir des formes multilingues et une glose française. Le prompt Domaine
opère dans un contexte d'intercompréhension romane. Tous deux imposent la forme
technique de la clé, mais aucun n'impose sa langue.

Le modèle peut donc légitimement, au regard des instructions actuelles :

- reprendre la langue du mot d'entrée ;
- employer l'anglais, fréquent dans les identifiants et dans les fixtures ;
- choisir le français parce que le prompt et la glose sont français ;
- généraliser depuis l'espagnol, l'italien ou le portugais présents dans le même
  lot ;
- produire une construction hybride en combinant lemme roman, étiquette de POS
  anglaise et traduction anglaise.

La canonicalisation corrige `ACCÉLÉRÉ → ACCELERE`, mais ne peut pas corriger
`SOFFRIR → SOUFFRIR`, `SUFFER → SOUFFRIR` ni choisir entre deux sens.

### Instruction proposée, non implémentée

```text
Pour chaque nouveau concept, nomme entry_key en français. Pars du sens visé et
utilise un nom conceptuel français naturel : infinitif pour un verbe, singulier
pour un nom, forme dictionnaire pour un adjectif ou un adverbe. La clé finale
doit rester ASCII, en majuscules avec underscores. N'utilise pas l'anglais comme
langue implicite de la clé : l'anglais est une forme de comparaison dans forms.
Si le mot français est polysémique ou si une clé proche existe, ajoute un
qualificatif sémantique français bref plutôt qu'une étiquette grammaticale
systématique. Ne déduis pas la clé d'une forme fléchie ni d'une autre langue
romane. Toute clé linguistiquement incertaine doit rester un brouillon à revoir.
```

Cette instruction doit être partagée par les assistants Domaine et Texte pour
éviter deux politiques concurrentes.

### Validations automatiques possibles

- canonicalisation ASCII et validation syntaxique existantes ;
- collision exacte avec les clés existantes et le lot courant ;
- avertissement si la clé ne correspond à aucune forme française proposée ou
  si elle contient un suffixe anglais connu ;
- comparaison normalisée avec les lemmes français et les gloses ;
- recherche de formes identiques par langue/POS ;
- score de similarité de gloses et remontée de concepts candidats ;
- contrôle d'un vocabulaire de qualificatifs/POS si une taxonomie est adoptée.

Ces contrôles doivent produire des **alertes**, pas décider seuls qu'une clé
n'est pas française : `GLOBAL`, `CONSTANT`, `HABITAT` ou des termes savants sont
intrinsèquement ambigus.

### Validations obligatoirement humaines

- naturalité du nom français ;
- correction du sens et de la polysémie ;
- équivalence réelle entre formes multilingues ;
- choix d'un qualificatif sémantique ;
- décision qu'un concept est identique, proche ou distinct ;
- fusion, archivage ou renommage d'une entrée ;
- acceptation des emprunts et termes internationaux.

## 9. Détection prudente des doublons sémantiques

La détection raisonnable doit être un entonnoir de signaux :

1. **clé canonique exacte** — blocage automatique déjà en place ;
2. **forme normalisée + langue + POS** — candidat fort, mais la polysémie doit
   rester possible ;
3. **recouvrement des formes multilingues** — plusieurs traductions identiques
   constituent un signal plus robuste qu'une seule ;
4. **gloses française et anglaise** — égalité, mots significatifs communs ou
   similarité sémantique ;
5. **domaine, POS et relations** — servent à confirmer ou à écarter ;
6. **recherche des concepts existants dans l'interface** — présenter les
   candidats avant création ;
7. **assistance IA** — classer « probablement identique / proche / distinct »,
   avec justification courte et sans droit d'écriture ;
8. **validation humaine** — seule autorisée à conclure et à déclencher une
   opération ultérieure.

Il ne faut pas fusionner automatiquement `SOUFFRIR`/`SUFFER`,
`PREOCCUPANT`/`WORRYING` ou `AUGMENTER`/`INCREASE`. Une même glose peut masquer
des différences d'usage, d'aspect, de POS ou de granularité. À l'inverse, des
gloses différentes peuvent décrire le même concept avec des formulations
différentes.

## 10. Stratégie de transition

### Court terme, avant soutenance

- appliquer la convention française uniquement aux nouvelles propositions ;
- conserver toutes les clés existantes ;
- rendre la règle visible dans les assistants ;
- afficher des doublons sémantiques comme avertissements non bloquants ;
- conserver la validation humaine avant toute création ;
- documenter les anomalies, sans les corriger pendant la mission de politique.

### Moyen terme

- ajouter une recherche multi-signal des concepts existants ;
- définir une taxonomie minimale de décisions qualité : candidat doublon,
  distinct, à revoir ;
- prévoir un registre d'alias avant tout renommage ;
- ne traiter les groupes historiques qu'un par un, avec sauvegarde, dépendances,
  tests d'analyse et rollback.

### Long terme

Étudier une séparation explicite :

```text
concept_id stable et opaque
concept_label_fr lisible et modifiable
aliases historiques
lexical_form par langue
```

Cette cible correspond mieux à la dualité actuelle, mais constitue une évolution
de schéma et de contrats. Elle exige un audit/migration dédié et une décision de
produit ; elle ne doit pas être glissée dans une correction de prompt.

## 11. Prochaine mission d'implémentation précisément bornée

### Mission proposée — Politique française pour les nouvelles clés IA

Périmètre autorisé recommandé :

1. créer une constante d'instruction linguistique partagée par les prompts
   Domaine et Texte ;
2. intégrer exactement la règle française, le qualificatif sémantique et le
   statut de l'anglais comme langue de comparaison ;
3. conserver intégralement la canonicalisation Mission 200 et les contrats JSON ;
4. ajouter dans les deux interfaces un rappel court de la convention ;
5. ajouter des tests statiques des deux prompts et des tests de parsing montrant
   que la canonicalisation n'altère pas les formes/gloses ;
6. tester les exemples `SOUFFRIR`, `PREOCCUPANT`, `AUGMENTER`,
   `BANQUE_FINANCE` et `VOLER_DEROBER` dans une fixture sans écriture ;
7. ne modifier ni schéma, ni donnée, ni clé historique, ni route, ni mécanisme de
   déduplication sémantique ;
8. soumettre ensuite un petit lot OpenAI réel à la validation humaine de David,
   sans création automatique.

Critères d'acceptation : les deux prompts portent la même politique ; les tests
existants restent verts ; aucune clé existante ne change ; les propositions
restent des brouillons ; une recette humaine confirme que les nouvelles clés
sont françaises et que les termes ambigus sont révisables.

La détection sémantique multi-signal doit faire l'objet d'une mission séparée,
car elle nécessite des choix de seuil, d'affichage et de faux positifs.

## 12. Contrôles, limites et préservation

### Contrôles réalisés

- état Git initial propre ;
- lecture des 326 clés et 1 125 formes ;
- contrôle des volumes de huit tables ;
- distinction vérifiée entre 307 entrées ID ≤ 313 et 19 entrées ID 314–332 ;
- lecture des clés étrangères via `information_schema` ;
- inventaire statique des routes, requêtes, interfaces, URLs, prompts, tests,
  seeds, scripts et documents consommateurs ;
- comparaison en lecture seule avec les archives Dico et IC-Lab accessibles ;
- recherche de gloses françaises strictement identiques et de groupes suspects ;
- aucun démarrage, arrêt ou redémarrage de service.

### Éléments non vérifiés

- aucun appel OpenAI réel ;
- aucune recette visuelle, l'interface n'ayant pas été modifiée ;
- aucun test automatisé, car la mission interdit toute modification et les tests
  ne sont pas nécessaires à un audit statique/SQL en lecture seule ;
- aucune preuve d'absence de consommateur externe non versionné ;
- aucune datation fine avant l'ID 314, faute de timestamps/provenance ;
- aucune conclusion automatique sur la langue des termes ambigus.

### Confirmation de non-modification

La mission n'a exécuté aucune commande SQL d'écriture, migration,
réinitialisation ou correction. Aucun service n'a été démarré ni arrêté. Aucune
donnée MariaDB, clé, forme, relation, prompt, test, version ou fichier
applicatif n'a été modifié.

Le seul fichier créé par la mission est le présent rapport :

`reports/201_dico_ic_concept_key_language_policy_audit.md`

## 13. Message de commit proposé

`docs(dico): auditer la politique linguistique des clés conceptuelles`
