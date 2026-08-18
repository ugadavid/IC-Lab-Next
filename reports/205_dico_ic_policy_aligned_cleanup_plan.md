# Mission 205 — Plan de nettoyage aligné sur la politique française

Date : 2026-08-18  
Nature : requalification documentaire, strictement en lecture seule  
Version applicative : inchangée  
HEAD initial : `9fa5a3b feat(dico-ic): stabiliser les clés françaises et auditer les doublons`

## Résultat

La Mission 204 avait isolé 69 actions techniquement sûres. Leur relecture selon la politique française des Missions 201 à 203 montre qu'une suppression sûre pour MariaDB n'est pas toujours une bonne opération linguistique.

Le plan Mission 205 contient désormais 74 opérations logiques :

| Catégorie | Opérations | Effet futur |
|---|---:|---|
| A — suppression directement applicable | 30 | suppression d'une entrée vide vers un survivant français satisfaisant |
| B — renommage directement applicable | 26 | conservation de l'ID renseigné et francisation de la clé |
| C — remplacement atomique | 15 | suppression de 23 entrées vides et renommage de 15 IDs renseignés |
| D — protection de prompt/test seulement | 3 | remplacement textuel futur, puis suppression de 3 entrées vides |
| E — arbitrage humain réel | 25 familles | aucune mutation planifiée |

Les catégories A à D représenteraient, après validation et exécution future, 56 suppressions de lignes vides et 41 renommages conservant l'ID. Le total prévisionnel passerait de 326 à 270 entrées, sans suppression de forme ni d'autre dépendance.

Le fichier Mission 204 `safe_actions.json` est donc **supplanté comme plan d'application** par `policy_aligned_actions.json`. Il reste une source d'audit historique.

## État initial vérifié

L'état Git était propre. Les rapports 201 à 204, les quatre actifs Mission 204, l'état MariaDB et les références actuelles du dépôt ont été contrôlés. Aucun appel OpenAI n'a été effectué.

| Objet | Départ | Fin observée | Projection après A–D |
|---|---:|---:|---:|
| `lexical_entry` | 326 | 326 | 270 |
| `lexical_form` | 1 125 | 1 125 | 1 125 |
| `inflected_form` | 41 | 41 | 41 |
| `connector_help` | 12 | 12 | 12 |
| `form_relation` | 70 | 70 | 70 |
| `pattern_rule` | 1 | 1 | 1 |
| `ic_feature` | 8 | 8 | 8 |
| `language` | 12 | 12 | 12 |

L'empreinte SHA-256 de la projection ordonnée des 326 entrées reste `fc3081d330f116a8438bc1b077d0b047b0d2c09bf845e81d654203543a6d1c75`, identique au contrôle Mission 204.

## Règles de requalification

Le plan applique les règles suivantes :

- le lemme français naturel détermine la clé ;
- la canonicalisation ASCII, les majuscules et les underscores sont conservés ;
- l'ID renseigné survit afin de préserver formes et dépendances ;
- une entrée vide française ne remplace jamais l'entrée renseignée : elle libère la clé avant le renommage ;
- un suffixe grammatical est retiré sauf nécessité réelle de désambiguïsation ;
- une référence de prompt, test ou rapport n'est pas assimilée à une résolution runtime vers l'ID MariaDB ;
- une fusion de deux entrées renseignées reste hors du plan automatique.

Le seul suffixe grammatical ajouté est `CAUSE_NOM`, car `CAUSE` est déjà occupée par le concept verbal « causer ». Cette qualification française est indispensable pour éviter une collision sémantique réelle.

## A — Suppressions directement applicables

Les 30 sources sont vides de forme, flexion, relation, aide et trait. Aucune référence fonctionnelle, seed ou script ne les vise.

| ID source | Clé source | ID conservé | Clé finale française |
|---:|---|---:|---|
| 97 | `ESTUDIANTE_NOUN_STUDENT` | 51 | `ETUDIANT` |
| 190 | `CONSTANTE` | 171 | `CONSTANT` |
| 199 | `DESASTREUX_ADJ` | 184 | `DESASTREUX` |
| 200 | `COTIER_ADJ` | 188 | `COTIER` |
| 205 | `PREOCCUPANT_ADJ` | 167 | `PREOCCUPANT` |
| 208 | `CONSTANT_ADJ` | 171 | `CONSTANT` |
| 209 | `CONTINU_ADJ` | 191 | `CONTINU` |
| 211 | `HUMANITE_NOUN` | 177 | `HUMANITE` |
| 212 | `ENTIER_ADJ` | 178 | `ENTIER` |
| 215 | `CONSEQUENCE_NOUN` | 157 | `CONSEQUENCE` |
| 242 | `WORRYING` | 167 | `PREOCCUPANT` |
| 243 | `INCREASE` | 170 | `AUGMENTER` |
| 244 | `CONTINUOUS` | 191 | `CONTINU` |
| 245 | `PRODUCE` | 175 | `PRODUIRE` |
| 246 | `HUMANITY` | 177 | `HUMANITE` |
| 249 | `RISE` | 194 | `S_ELEVER` |
| 262 | `CONSTANTE_ADJECTIVE` | 171 | `CONSTANT` |
| 263 | `CONTINU_ADJECTIVE` | 191 | `CONTINU` |
| 264 | `ENTIER_ADJECTIVE` | 178 | `ENTIER` |
| 266 | `ELEVERSER_VERB` | 194 | `S_ELEVER` |
| 269 | `PROVOQUER_VERB` | 232 | `PROVOQUER` |
| 277 | `RUINER_VERB` | 308 | `RUINER` |
| 283 | `TOTAL_ADJ` | 225 | `TOTAL` |
| 284 | `RUIINER_VERB` | 308 | `RUINER` |
| 299 | `TOTALE` | 225 | `TOTAL` |
| 314 | `PREOCCUPANT_ADJECTIF` | 167 | `PREOCCUPANT` |
| 316 | `CONSTANT_ADJECTIF` | 171 | `CONSTANT` |
| 317 | `ENTIER_ADJECTIF` | 178 | `ENTIER` |
| 319 | `TOTAL_ADJECTIF` | 225 | `TOTAL` |
| 322 | `RUI_NER` | 308 | `RUINER` |

La suppression 97 est ordonnée après le renommage B de l'ID 51 vers `ETUDIANT`. Elle n'est applicable que lorsque cette précondition est satisfaite. Les trois variantes vides de `RUINER` peuvent disparaître vers l'ID français 308 ; l'arbitrage entre les deux entrées **renseignées** `RUIN` et `RUINER` reste séparé en E.

## B — Renommages directement applicables

Les 26 cibles sont absentes avant et après canonicalisation, aucune fusion n'est nécessaire et les IDs renseignés sont conservés.

| ID conservé | Clé actuelle | Clé finale |
|---:|---|---|
| 51 | `STUDENT` | `ETUDIANT` |
| 96 | `MUCHO_ADJECTIVE_DETERMINER_MUCH_MANY` | `BEAUCOUP_DE` |
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
| 250 | `RISK` | `RISQUE` |
| 257 | `AGRICULTURAL_PRODUCTION` | `PRODUCTION_AGRICOLE` |
| 259 | `CONSEQUENT_ADJECTIVE` | `CONSEQUENT` |
| 273 | `FAUNE_NOUN` | `FAUNE` |
| 274 | `FLORE_NOUN` | `FLORE` |
| 275 | `CAUSE_NOUN` | `CAUSE_NOM` |
| 285 | `AGRICULTURE_ADJ` | `AGRICOLE` |
| 286 | `PRODUCTION_NOUN` | `PRODUCTION` |
| 288 | `GRAND_ADJ` | `GRAND` |
| 289 | `DANGER_NOUN` | `DANGER` |
| 291 | `HABITAT_NATUREL_NOUN` | `HABITAT_NATUREL` |
| 304 | `CONTRARIO` | `CONTRAIRE` |
| 326 | `NATUREL_ADJECTIF` | `NATUREL` |

Les consommateurs externes inconnus restent un risque non mesurable. La future exécution devra refaire la recherche de références et refuser toute dérive.

## C — Remplacements atomiques

Chaque opération supprime d'abord l'entrée vide occupant la clé française, renomme ensuite l'ID renseigné, puis supprime les autres alias vides de la famille.

| Famille | Entrées vides à supprimer | ID renseigné conservé | Renommage |
|---|---|---:|---|
| travailler | 143 `TRAVAILLER` | 129 | `TRABAJAR` → `TRAVAILLER` |
| beaucoup | 144 `BEAUCOUP` | 130 | `MUCHO` → `BEAUCOUP` |
| cependant | 146 `CEPENDANT` | 131 | `SIN_EMBARGO` → `CEPENDANT` |
| abandonner | 150 `ABANDONNER` | 134 | `ABANDONAR` → `ABANDONNER` |
| projet | 151 `PROJET` | 135 | `PROYECTO` → `PROJET` |
| adapter | 153 `ADAPTER` | 138 | `ADAPTAR` → `ADAPTER` |
| continuer | 154 `CONTINUER`, 281 `CONTINUER_VERB` | 139 | `CONTINUAR` → `CONTINUER` |
| parce que | 155 `PARCE_QUE` | 140 | `PORQUE` → `PARCE_QUE` |
| trouver | 156 `TROUVER` | 141 | `ENCONTRAR` → `TROUVER` |
| global | 206, 220, 261, 315 | 169 | `GLOBALE` → `GLOBAL` |
| accéléré | 248, 265, 295 | 214 | `ACCELERE_ADJ` → `ACCELERE` |
| humain | 287, 312, 324 | 280 | `HUMAIN_ADJECTIVE` → `HUMAIN` |
| absence | 305 `ABSENCE` | 271 | `ABSENCE_NOUN` → `ABSENCE` |
| eau | 306 `EAU` | 272 | `EAU_NOUN` → `EAU` |
| perdre | 313 `PERDRE` | 290 | `PERDRE_VERB` → `PERDRE` |

Le cas `ACCELERE` est important : l'ID 295 est vide et apparaît comme valeur attendue dans un test de canonicalisation. Cette occurrence n'est pas une dépendance à l'ID 295 ; après l'opération, elle désignera au contraire correctement l'ID renseigné 214.

## D — Protections uniquement textuelles

`SUFFER` (241), `SOFFRIR` (309) et `PREOCCUPANT_ADJECTIVE` (260) sont vides et sans dépendance MariaDB. Leurs occurrences exactes se trouvent uniquement dans :

- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js`, comme contre-exemples du prompt partagé ;
- `prototypes/08-dico-seven-sieves/Node/test/french-concept-key-policy.test.js`, comme chaînes attendues ;
- les rapports historiques.

Elles ne sont jamais résolues comme clés runtime. La formulation future proposée est :

```text
Contre-exemples : pour souffrir, ne choisis pas l’anglais et ne copie pas une graphie italienne ou portugaise ; pour préoccupant, ne choisis pas l’anglais et n’ajoute pas systématiquement un suffixe grammatical.
```

Les assertions futures vérifieront les quatre fragments sémantiques correspondants. Les remplacements exacts, fichier par fichier, sont consignés dans `test_only_protections.csv`. Après modification et réussite des tests, les IDs 241, 309 et 260 pourront être supprimés au profit de `SOUFFRIR` 162 et `PREOCCUPANT` 167.

## E — Arbitrages humains réellement nécessaires

Le CSV passe de 47 familles brutes à 25 familles ciblées. Les concepts clairement distincts (`ELEVER`, `S_ELEVER`, `ELEVATION`, `SE_LEVER`, `PERTE`, `PERDRE`, `HABITATION`, `HABITAT`, notamment) n'y figurent plus : ils ne demandent aucune action.

Les 25 arbitrages restants sont :

1. université historique ;
2. observer ;
3. imaginer ;
4. circuler ;
5. exister ;
6. permettre ;
7. article indéfini ;
8. démonstratif ;
9. article défini et forme contractée ;
10. être ;
11. marqueurs de conséquence ;
12. fusion de contenu `SOUFFRIR_VERB` ;
13. fusion de contenu `AUGMENTER_VERB` ;
14. fusion de contenu `PRODUIRE_VERB` ;
15. production nourricière contre production agricole ;
16. alimentation, disponibilité alimentaire et alimentation humaine ;
17. fusion de contenu `ACCELERER_VERB` ;
18. fusion de contenu `TOTAL_ADJECTIVE` ;
19. fusion de contenu `S_ELEVER_VERB` ;
20. fusion de contenu `RISQUER_VERB` ;
21. subir ;
22. fusion des entrées renseignées `RUIN` et `RUINER` ;
23. devenir ;
24. statut grammatical d'`AUTRE_DETERMINANT` ;
25. statut de l'entrée vide et mal nommée `DE_ARTICLE`.

Le détail exact des IDs, formes, dépendances, références, risques et questions est dans `refined_human_review.csv`. Aucune de ces lignes ne doit entrer dans le futur script A–D.

## Vérifications effectuées par opération

`policy_aligned_actions.json` contient pour chaque opération : catégorie, source, clé actuelle, ID conservé, clé finale, snapshot des dépendances, références fonctionnelles et non fonctionnelles, justifications linguistique et technique, préconditions, contrôles postérieurs, ordre et rollback.

Les vérifications ont porté sur :

- formes lexicales exactes, langue, lemme, POS, confiance et provenance ;
- flexions, relations entrantes et sortantes, aides et traits IC ;
- règle indirecte de suffixe ;
- code, routes, seeds, scripts, tests, prompt, documentation et rapports ;
- collisions exactes et collisions après canonicalisation ;
- conservation de chaque ID renseigné ;
- absence de dépendance directe sur les 56 IDs supprimables.

## Ordre futur de Mission 206

1. vérifier Git, MariaDB, l'empreinte et les compteurs ;
2. créer une sauvegarde ciblée complète des 97 lignes concernées par suppression ou renommage et de toutes leurs dépendances ;
3. exécuter un `--check` sans écriture ;
4. appliquer les B sans collision servant de prérequis, notamment `STUDENT` → `ETUDIANT` ;
5. exécuter chaque C atomiquement : suppression de la collision, renommage de l'ID renseigné, suppression des alias vides ;
6. exécuter les A restantes seulement lorsque leur clé survivante finale est présente ;
7. modifier le prompt et son test conformément au CSV, exécuter les tests, puis seulement appliquer les D ;
8. vérifier que seuls 56 IDs ont disparu, que 41 IDs portent leur nouvelle clé et que toutes les dépendances sont identiques ;
9. `COMMIT` MariaDB uniquement si toutes les postconditions réussissent ; sinon `ROLLBACK` ;
10. ne jamais lire ni appliquer `refined_human_review.csv` dans ce script.

## Spécification du rollback futur

La sauvegarde devra enregistrer, avant toute écriture :

- la ligne complète de chaque entrée supprimée ou renommée ;
- toutes les formes et dépendances des 41 IDs conservés ;
- les compteurs globaux ;
- l'empreinte des fichiers prompt/test concernés par D ;
- le HEAD Git et l'empreinte du plan validé.

Avant `COMMIT`, le rollback est le `ROLLBACK` natif de la transaction. Après un éventuel commit validé, l'inverse déterministe devra :

1. refuser toute collision apparue depuis l'application ;
2. restaurer les anciennes clés sur les mêmes IDs conservés ;
3. réinsérer les 56 lignes vides avec leurs IDs d'origine ;
4. restaurer exactement les deux fichiers textuels de D ;
5. vérifier le retour à 326 entrées et aux empreintes sauvegardées.

Aucun enfant MariaDB n'est à réinsérer pour les suppressions prévues, car les 56 sources ont zéro dépendance directe. Le rollback ne doit jamais recréer ou déplacer une forme.

## Livrables

- `reports/assets/205_dico_ic_policy_aligned_cleanup_plan/policy_aligned_actions.json` ;
- `reports/assets/205_dico_ic_policy_aligned_cleanup_plan/atomic_rekeys.json` ;
- `reports/assets/205_dico_ic_policy_aligned_cleanup_plan/test_only_protections.csv` ;
- `reports/assets/205_dico_ic_policy_aligned_cleanup_plan/refined_human_review.csv` ;
- `reports/assets/205_dico_ic_policy_aligned_cleanup_plan/preflight_selects.sql`.

Le SQL contient exclusivement des `SELECT`. Il contrôle volumes, lignes, collisions, dépendances distinctes, formes et règle indirecte sans produire d'écriture.

## Limites

- Aucun registre ne permet d'exclure un consommateur externe inconnu du dépôt.
- Les 25 familles E exigent une décision de contenu ou de modèle, pas une validation humaine générique du plan A–D.
- Toute modification postérieure de MariaDB ou du dépôt invalide le snapshot et doit faire échouer le futur `--check`.
- Ce plan ne résout pas l'architecture future d'alias ou d'identifiants conceptuels stables.

## Absence de mutation

Aucune donnée MariaDB, entrée, clé, forme, relation, seed, source applicative, test, prompt, dépendance ou version n'a été modifiée. Aucun service n'a été manipulé. Aucun commit, push, déploiement, appel OpenAI ou SQL d'écriture n'a été effectué. Les seules écritures sont ce rapport et ses cinq actifs autorisés.

## Proposition de message de commit

`docs(dico): requalifier le plan de nettoyage selon la politique française (mission 205)`
