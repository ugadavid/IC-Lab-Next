# Mission 204 — Audit de nettoyage des concepts Dico-IC

Date : 2026-08-18  
Statut : audit terminé, strictement en lecture seule  
Version applicative : inchangée  
Commit observé au départ : `628a93b feat(dico): normaliser en français les nouveaux concepts IA`

## Résultat

Les 326 entrées conceptuelles présentes ont été auditées. L'audit isole 63 familles candidates et 211 entrées nécessitant une classification explicite. Les 115 autres entrées, dépourvues de signal de nettoyage suffisamment pertinent, sont néanmoins inventoriées dans le livrable exhaustif.

La proposition automatisable est limitée à 69 actions :

- 48 suppressions d'entrées vides, sans dépendance directe ni référence fonctionnelle connue, avec survivant identifié ;
- 21 renommages sans collision, conservant l'ID et les dépendances SQL ;
- aucune fusion de contenu ;
- aucune action sur une ligne de `review_required.csv`.

Cette liste est une proposition à valider humainement. Elle n'est ni une autorisation ni un script d'exécution.

## État initial et volumes préservés

L'état Git était propre au début de la mission. Les rapports 201, 202 et 203 ainsi que les instructions applicables ont été lus avant l'analyse. Aucun appel OpenAI n'a été lancé.

| Objet MariaDB | Départ | Fin |
|---|---:|---:|
| `lexical_entry` | 326 | 326 |
| `lexical_form` | 1 125 | 1 125 |
| `inflected_form` | 41 | 41 |
| `connector_help` | 12 | 12 |
| `form_relation` | 70 | 70 |
| `pattern_rule` | 1 | 1 |
| `ic_feature` | 8 | 8 |
| `language` | 12 | 12 |

Les IDs des entrées vont de 1 à 332 avec des lacunes, soit bien 326 lignes. L'empreinte SHA-256 de la projection ordonnée `id, entry_key, gloss_fr, gloss_en, semantic_domain, notes` est restée `fc3081d330f116a8438bc1b077d0b047b0d2c09bf845e81d654203543a6d1c75` au contrôle final.

## Méthode

L'audit a utilisé uniquement des requêtes `SELECT`, la lecture du dépôt et `git grep -I` :

1. extraction distincte des entrées, formes, flexions, relations entrantes et sortantes, traits IC, aides discursives et règles indirectes ;
2. recherche exacte des clés dans le code, les routes, tests, seeds, scripts, documentation et rapports ;
3. rapprochement en entonnoir par clés et suffixes, gloses exactes, formes identiques dans une même langue, recouvrement multilingue, POS, domaine et proximité normalisée ;
4. vérification manuelle des familles prioritaires et des préconditions A/B ;
5. partition de l'ensemble des 326 lignes : 172 membres de familles, 39 clés protégées isolées et 115 non-candidates.

La présence d'une forme est considérée comme une utilisation structurelle potentielle. Aucune conclusion n'est formulée sur l'utilisation humaine réelle, faute de journal d'usage. Le statut « historique » repose prudemment sur les IDs et les rapports disponibles, pas sur une preuve d'utilisation.

## Classification A à F

Chaque candidat possède exactement une `primary_class` dans `candidate_families.json`.

| Classe | Sens | Entrées |
|---|---|---:|
| A | suppression sûre proposée | 48 |
| B | renommage sûr proposé | 21 |
| C | fusion probable à arbitrer | 41 |
| D | concepts probablement distincts | 19 |
| E | clé historique ou applicative protégée | 51 |
| F | données insuffisantes, à revoir | 31 |
| **Total** |  | **211** |

Une famille peut donc afficher plusieurs classes, car ses membres n'ont pas nécessairement le même statut. Par exemple, une entrée vide peut être A tandis que son survivant référencé est E.

## Actions sûres proposées — liste complète

### A — 48 suppressions d'entrées vides

Chaque flèche désigne le survivant proposé. Toutes ces sources ont zéro forme, zéro flexion, zéro relation entrante ou sortante, zéro aide, zéro trait et aucune référence dans le code, les routes, tests, seeds ou scripts au moment de l'audit.

| ID source | Clé supprimable | ID survivant | Clé survivante |
|---:|---|---:|---|
| 97 | `ESTUDIANTE_NOUN_STUDENT` | 51 | `STUDENT` |
| 143 | `TRAVAILLER` | 129 | `TRABAJAR` |
| 144 | `BEAUCOUP` | 130 | `MUCHO` |
| 146 | `CEPENDANT` | 131 | `SIN_EMBARGO` |
| 150 | `ABANDONNER` | 134 | `ABANDONAR` |
| 151 | `PROJET` | 135 | `PROYECTO` |
| 153 | `ADAPTER` | 138 | `ADAPTAR` |
| 154 | `CONTINUER` | 139 | `CONTINUAR` |
| 155 | `PARCE_QUE` | 140 | `PORQUE` |
| 156 | `TROUVER` | 141 | `ENCONTRAR` |
| 190 | `CONSTANTE` | 171 | `CONSTANT` |
| 199 | `DESASTREUX_ADJ` | 184 | `DESASTREUX` |
| 200 | `COTIER_ADJ` | 188 | `COTIER` |
| 205 | `PREOCCUPANT_ADJ` | 167 | `PREOCCUPANT` |
| 206 | `GLOBAL_ADJ` | 169 | `GLOBALE` |
| 208 | `CONSTANT_ADJ` | 171 | `CONSTANT` |
| 209 | `CONTINU_ADJ` | 191 | `CONTINU` |
| 211 | `HUMANITE_NOUN` | 177 | `HUMANITE` |
| 212 | `ENTIER_ADJ` | 178 | `ENTIER` |
| 215 | `CONSEQUENCE_NOUN` | 157 | `CONSEQUENCE` |
| 220 | `GLOBAL` | 169 | `GLOBALE` |
| 242 | `WORRYING` | 167 | `PREOCCUPANT` |
| 243 | `INCREASE` | 170 | `AUGMENTER` |
| 244 | `CONTINUOUS` | 191 | `CONTINU` |
| 245 | `PRODUCE` | 175 | `PRODUIRE` |
| 246 | `HUMANITY` | 177 | `HUMANITE` |
| 248 | `ACCELERATED` | 214 | `ACCELERE_ADJ` |
| 249 | `RISE` | 194 | `S_ELEVER` |
| 261 | `GLOBALE_ADJECTIVE` | 169 | `GLOBALE` |
| 262 | `CONSTANTE_ADJECTIVE` | 171 | `CONSTANT` |
| 263 | `CONTINU_ADJECTIVE` | 191 | `CONTINU` |
| 264 | `ENTIER_ADJECTIVE` | 178 | `ENTIER` |
| 265 | `ACCELERE_ADJECTIVE` | 214 | `ACCELERE_ADJ` |
| 266 | `ELEVERSER_VERB` | 194 | `S_ELEVER` |
| 269 | `PROVOQUER_VERB` | 232 | `PROVOQUER` |
| 283 | `TOTAL_ADJ` | 225 | `TOTAL` |
| 287 | `HUMAIN_ADJ` | 280 | `HUMAIN_ADJECTIVE` |
| 299 | `TOTALE` | 225 | `TOTAL` |
| 305 | `ABSENCE` | 271 | `ABSENCE_NOUN` |
| 306 | `EAU` | 272 | `EAU_NOUN` |
| 312 | `HUMAIN` | 280 | `HUMAIN_ADJECTIVE` |
| 313 | `PERDRE` | 290 | `PERDRE_VERB` |
| 314 | `PREOCCUPANT_ADJECTIF` | 167 | `PREOCCUPANT` |
| 315 | `GLOBAL_ADJECTIF` | 169 | `GLOBALE` |
| 316 | `CONSTANT_ADJECTIF` | 171 | `CONSTANT` |
| 317 | `ENTIER_ADJECTIF` | 178 | `ENTIER` |
| 319 | `TOTAL_ADJECTIF` | 225 | `TOTAL` |
| 324 | `HUMAIN_ADJECTIF` | 280 | `HUMAIN_ADJECTIVE` |

### B — 21 renommages conservant l'ID

Pour chaque cible, la clé est absente, la forme française et les gloses confirment le sens, aucune fusion n'est nécessaire et aucune référence fonctionnelle exacte à l'ancienne clé n'a été trouvée.

| ID conservé | Ancienne clé | Nouvelle clé proposée |
|---:|---|---|
| 100 | `ACADEMICO_ADJECTIVE_ACADEMIC` | `ACADEMIQUE` |
| 102 | `RESULTAR_VERB_TO_RESULT` | `RESULTER` |
| 126 | `RESULTADO` | `RESULTAT` |
| 128 | `PARTICIPANTE` | `PARTICIPANT` |
| 137 | `NECESARIO` | `NECESSAIRE` |
| 201 | `PROCHE_ADJ` | `PROCHE` |
| 202 | `MILLION_NOUN` | `MILLION` |
| 203 | `PERSONNE_NOUN` | `PERSONNE` |
| 217 | `MENACE_NOUN` | `MENACE` |
| 218 | `MER_NOUN` | `MER` |
| 221 | `CONSEQUENT_ADVERBE` | `CONSEQUEMMENT` |
| 259 | `CONSEQUENT_ADJECTIVE` | `CONSEQUENT` |
| 273 | `FAUNE_NOUN` | `FAUNE` |
| 274 | `FLORE_NOUN` | `FLORE` |
| 285 | `AGRICULTURE_ADJ` | `AGRICOLE` |
| 286 | `PRODUCTION_NOUN` | `PRODUCTION` |
| 288 | `GRAND_ADJ` | `GRAND` |
| 289 | `DANGER_NOUN` | `DANGER` |
| 291 | `HABITAT_NATUREL_NOUN` | `HABITAT_NATUREL` |
| 304 | `CONTRARIO` | `CONTRAIRE` |
| 326 | `NATUREL_ADJECTIF` | `NATUREL` |

Le risque résiduel commun aux renommages est l'existence éventuelle d'un consommateur externe inconnu du dépôt. La future application devra donc vérifier de nouveau les références et refuser toute collision.

## Familles prioritaires

### Souffrir

- `SOUFFRIR` (162) contient cinq formes et reste protégé E.
- `SOUFFRIR_VERB` (204) contient une forme anglaise ; une fusion déplacerait du contenu : C.
- `SUFFER` (241) est bien vide en base, conformément à l'information humaine. Il n'est pourtant pas A, car la clé est utilisée comme contre-exemple dans le prompt partagé et les tests : E.
- `SOFFRIR` (309) est vide mais apparaît également dans les garde-fous de canonicalisation : E.

### S'élever, élever et élévation

- `S_ELEVER` (194) est la clé pronominale renseignée et protégée E.
- `S_ELEVER_VERB` (216) contient deux formes : C, sans fusion automatique.
- `RISE` (249) et `ELEVERSER_VERB` (266) sont vides et sans dépendance : A vers `S_ELEVER`.
- `ELEVER` (222), transitif, `S_ELEVER` (194), pronominal, et `ELEVATION` (195), nominal, restent probablement distincts : D pour la distinction sémantique/POS pertinente.
- `SE_LEVER_VERBE_PRONOMINAL` (318) possède deux formes et représente « se lever », distinct de « s'élever » : D.

### Préoccupant

- `PREOCCUPANT` (167) contient cinq formes et reste protégé E.
- `PREOCCUPANT_ADJ` (205), `WORRYING` (242) et `PREOCCUPANT_ADJECTIF` (314) sont des doublons vides sans dépendance : A.
- `PREOCCUPANT_ADJECTIVE` (260) reste E, sa clé étant référencée dans les tests de politique/canonicalisation.
- `WORRISOME` n'existe pas dans les 326 entrées.

### Augmenter, produire, humanité

- `INCREASE` (243), `PRODUCE` (245), `HUMANITY` (246) et `HUMANITE_NOUN` (211) sont des doublons vides proposés A.
- `AUGMENTER_VERB` (207) et `PRODUIRE_VERB` (210) contiennent chacun du contenu : C, donc aucune suppression ni fusion automatique.
- `AUGMENTATION` (173), nominal, reste distinct de `AUGMENTER` : D.
- La famille de production recouvre aussi alimentation et production nourricière ; ce voisinage sémantique n'autorise aucune identité automatique. Les lignes concernées restent C/F dans le CSV.

### Ruiner

- `RUIN` (256) et `RUINER` (308) contiennent du contenu et demandent un arbitrage de fusion : C.
- `RUINER_VERB` (277), `RUIINER_VERB` (284) et `RUI_NER` (322) sont vides, mais les données ne suffisent pas à identifier sans ambiguïté le survivant et la portée conceptuelle : F, aucune action sûre.

## Références applicatives et protections

La recherche a distingué les références fonctionnelles des mentions diagnostiques. Les clés historiques initiales apparaissent largement dans les seeds et tests. `INFORMATION_DATA` est notamment référencée dans l'administration, des tests, plusieurs seeds, un script correctif et la documentation de procédures ; elle reste E.

Les clés récentes servant explicitement de cas de test ou de contre-exemple (`SUFFER`, `SOFFRIR`, `PREOCCUPANT_ADJECTIVE`, `S_ELEVER`, entre autres) sont également E même lorsqu'elles sont vides. Une mention limitée à un rapport n'a pas, à elle seule, été assimilée à une référence applicative bloquante pour une action A/B.

Les références exactes par entrée, classées par type, figurent dans `candidate_families.json` et `safe_actions.json`.

## Livrables

- `reports/assets/204_dico_ic_concept_cleanup_audit/safe_actions.json` : 69 propositions A/B, préconditions et contrôles postérieurs ;
- `reports/assets/204_dico_ic_concept_cleanup_audit/review_required.csv` : 47 familles/lignes d'arbitrage C, D ou F ;
- `reports/assets/204_dico_ic_concept_cleanup_audit/candidate_families.json` : inventaire détaillé, signaux, dépendances et références, plus la partition exhaustive des 326 entrées ;
- `reports/assets/204_dico_ic_concept_cleanup_audit/verification_queries.sql` : requêtes exclusivement `SELECT`.

Les JSON ont été reparsés avec succès. Le fichier SQL a été contrôlé contre les verbes d'écriture interdits. Les comptages A/B du JSON correspondent aux 69 lignes proposées.

## Risques et limites

- La proximité lexicale ou une glose identique ne prouve jamais seule l'identité conceptuelle.
- Les règles de motifs sont signalées comme dépendances indirectes ; elles ne ciblent pas une entrée par clé.
- Les références externes au dépôt et l'utilisation humaine réelle ne sont pas observables.
- Les classifications C, D et F requièrent la décision de David ; aucune ne doit entrer dans une exécution automatisée.
- Les résultats sont une photographie de MariaDB et du dépôt au commit observé. Toute dérive ultérieure invalide les préconditions.

## Plan proposé pour la Mission 205

Après validation humaine explicite d'une liste figée issue de `safe_actions.json` seulement :

1. produire une sauvegarde ciblée complète des 69 IDs et de toutes leurs dépendances ;
2. créer un script transactionnel avec modes `--check`, `--apply` et `--rollback` ;
3. lier chaque action à son ID, ancienne clé, cible ou survivant validé ;
4. refuser une clé, un hash, une collision ou un compteur de dépendances inattendu ;
5. appliquer uniquement les IDs explicitement validés ;
6. vérifier les volumes, dépendances, survivants et état Git avant/après ;
7. exclure intégralement `review_required.csv` du script ;
8. exiger une recette humaine avant toute suite.

## Absence de mutation

Aucune donnée MariaDB, clé, forme, relation, seed, source applicative, configuration, version ou dépendance n'a été modifiée. Aucun service n'a été arrêté ou redémarré, car cela n'a pas été nécessaire. Aucun commit, push ou déploiement n'a été effectué. Les seules écritures sont ce rapport et ses quatre livrables autorisés.

## Proposition de message de commit

`docs(dico): documenter l'audit de nettoyage des 326 concepts (mission 204)`
