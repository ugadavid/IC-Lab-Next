# Mission 209 — Application des décisions humaines sur les domaines sémantiques C

Date : 18 août 2026

## Résultat

Les 36 reclassements décidés par David ont été appliqués exactement et transactionnellement à `ic_dico`. Les 87 autres entrées C ont été traitées comme des décisions explicites de conservation et sont restées identiques bit à bit. Aucun ID hors de ce périmètre n'a été modifié.

`semantic_domain` demeure un champ texte libre de repérage humain. Aucun schéma, taxonomie, prompt, formulaire, clé conceptuelle, forme ou dépendance n'a été modifié.

## État initial

- dépôt propre au démarrage ;
- HEAD : `fb2161f5d20174f86b0003c1a8dc1208fb26414d`, commit de la Mission 208 ;
- Mission 208 vérifiée sur ses 38 IDs avant chaque contrôle Mission 209 ;
- volumes : 270 entrées, 1 125 formes lexicales, 41 formes fléchies, 12 aides, 70 relations, 1 règle, 8 traits IC et 12 langues ;
- empreinte initiale de `lexical_entry` : `0de59878ff98c0b6b6d4a6e49ac34c2754198a82d2803a4269a34ef1463ed787` ;
- périmètre Mission 207 : 19 groupes C, 123 entrées exactement.

## Sauvegarde des 123 entrées C

La sauvegarde déterministe est `reports/assets/209_dico_ic_semantic_domain_c_decisions/backup.json`.

- SHA-256 : `c243377441e72f6f261bc63b568d8247074ecbf98a3b38b150648e2f1f1a8647` ;
- 123 lignes C complètes ;
- 36 lignes à modifier ;
- 87 lignes à conserver ;
- IDs, clés, gloses françaises et anglaises, domaines et autres colonnes présents dans le snapshot ;
- empreintes séparées des 36 lignes hors domaine, des 87 conservations et des 147 entrées hors C ;
- empreintes des huit tables fonctionnelles ;
- empreinte initiale et empreinte finale calculée avant application.

Le générateur permanent refuse d'écraser une sauvegarde existante.

## Les 36 modifications appliquées

| ID | Clé | Source binaire | Domaine final |
|---:|---|---|---|
| 331 | `BIODIVERSITE` | `ENVIRONMENT_BIODIVERSITY` | `nature` |
| 328 | `INCENDIE` | `ENVIRONMENT_FIRE` | `catastrophe` |
| 329 | `ETRE` | `VERB_TO_BE` | `verbe auxiliaire` |
| 285 | `AGRICOLE` | `activité` | `agriculture` |
| 165 | `TRES` | `adverbe` | `quantité` |
| 232 | `PROVOQUER` | `agir` | `action` |
| 233 | `SUBIR` | `agir` | `action` |
| 15 | `WIDE_BROAD` | `description` | `qualité` |
| 16 | `LONG_LENGTHY` | `description` | `qualité` |
| 26 | `REASONABLE_SENSIBLE` | `description` | `qualité` |
| 27 | `SENSITIVE_EMOTIONAL` | `description` | `qualité` |
| 326 | `NATUREL` | `description` | `qualité` |
| 3 | `IMPORTANT_SIGNIFICANT` | `general` | `qualité` |
| 20 | `PROBLEM_DIFFICULTY` | `general` | `situation` |
| 22 | `GENERAL_COMMON` | `general` | `qualité` |
| 23 | `DIFFERENT_NOT_SAME` | `general` | `qualité` |
| 31 | `ORGANIZATION_ENTITY` | `general` | `organisation` |
| 33 | `SCIENTIFIC_PROPERTY` | `general` | `science` |
| 34 | `PROMOTE_ACTION` | `general` | `action` |
| 35 | `UNDERSTAND_COMPREHEND` | `general` | `cognition` |
| 311 | `PRONOM_DEFINI_MAS_SING` | `grammaire/déterminant` | `grammaire` |
| 310 | `PRONOM_DEFINI_PLURIEL` | `grammaire/pronom` | `grammaire` |
| 195 | `ELEVATION` | `quantité` | `mouvement` |
| 145 | `SANS` | `relation` | `absence` |
| 152 | `DONC` | `relation` | `relations logiques` |
| 192 | `PAR_CONSEQUENT` | `relation` | `relations logiques` |
| 253 | `CAUSE` | `relation` | `causalité` |
| 275 | `CAUSE_NOM` | `relation` | `causalité` |
| 58 | `QUICKLY` | `temps` | `manière` |
| 179 | `PREMIEREMENT` | `temps` | `discours` |
| 229 | `EVENEMENT` | `temps` | `événement` |
| 221 | `CONSEQUEMMENT` | `temps_manière` | `relations logiques` |
| 126 | `RESULTAT` | `économie` | `causalité` |
| 257 | `PRODUCTION_AGRICOLE` | `économie` | `agriculture` |
| 258 | `FOOD_SUPPLY` | `économie` | `alimentation` |
| 203 | `PERSONNE` | `être` | `personne` |

Chaque `UPDATE` exige simultanément l'ID, la clé conceptuelle binaire et le domaine source binaire. Une dérive sur l'un de ces trois éléments annule ou empêche toute la transaction.

## Les 87 décisions de conservation

Le snapshot confirme et protège explicitement :

- 32 entrées dans `action` ;
- ID 286 `PRODUCTION` dans `activité` ;
- 16 entrées dans `nature` ;
- 28 entrées dans `qualité` ;
- neuf entrées dans `quantité` ;
- ID 108 `CUANDO_CONJUNCTION_WHEN` dans `temps`.

Leur empreinte complète est identique avant et après application. Ces lignes ne sont donc ni des oublis ni des cas en attente dans cette mission : leur conservation est la décision humaine appliquée.

## Contradiction `économie` et résolution humaine

La mission demandait initialement la disparition binaire globale de `économie`, tout en exigeant la préservation de la Mission 208 et l'interdiction de modifier un 37e ID. Ces conditions étaient incompatibles : la Mission 208 a légitimement placé l'ID 28 `CURRENCY_MONEY` dans `économie`.

Le contrôle a détecté cette contradiction après l'application autorisée des 36 décisions. David a ensuite précisé la postcondition :

- IDs 126, 257 et 258 ne doivent plus porter `économie` ;
- ID 28 doit conserver `économie` ;
- aucune modification supplémentaire n'est autorisée.

Les tests, contrôles et ce rapport appliquent cette résolution. Le résultat final est : ID 28 `économie`, ID 126 `causalité`, ID 257 `agriculture`, ID 258 `alimentation`.

## Script transactionnel

`normalize-semantic-domains-c.js` expose `--check`, `--apply` et `--rollback`, avec sauvegarde obligatoire.

- `--check` est sans écriture et valide les compteurs, la Mission 208, les 36 décisions, les 87 conservations, les autres entrées et les autres tables ;
- `--apply` accepte seulement l'état initial complet ou l'état final complet ;
- `--rollback` accepte seulement l'état final complet ;
- l'état partiel ou inconnu est refusé ;
- la transaction verrouille les entrées lexicales avant toute écriture ;
- chaque postcondition est recalculée avant le commit.

## Validation MariaDB jetable

Une copie isolée `ic_dico_m209_fixture_fb2161f` des huit tables a validé :

- état initial complet ;
- première application : 36 lignes ;
- seconde application : 0 ligne ;
- rollback : restauration exacte des 36 sources et de l'empreinte initiale ;
- état partiel simulé sur le seul ID 331 : sortie en erreur et ID 328 demeuré inchangé ;
- 87 conservations intactes pendant chaque étape.

Le privilège temporaire a été révoqué, la fixture a été supprimée et son absence finale vérifiée. La preuve structurée est `reports/assets/209_dico_ic_semantic_domain_c_decisions/fixture_validation.json` (SHA-256 `ac9f8352e0f9fccdcb95691441977f967d9055e27b8c59d749a97e0f90fe47eb`).

## Résultat transactionnel canonique

- première application : 36 lignes modifiées ;
- rejeu : 0 ligne modifiée ;
- état final : complet ;
- empreinte finale de `lexical_entry` : `847ae38ba9ff8f7dd4ab688e80509c2a6017debf6857cb9f8f50ecc88793564e` ;
- 87 conservations : empreinte inchangée ;
- entrées hors C : empreinte inchangée ;
- aucune colonne autre que `semantic_domain` modifiée sur les 36 IDs.

Les valeurs sources devenues sans usage ont disparu en comparaison binaire : `ENVIRONMENT_BIODIVERSITY`, `ENVIRONMENT_FIRE`, `VERB_TO_BE`, `adverbe`, `agir`, `description`, `general`, `grammaire/déterminant`, `grammaire/pronom`, `relation`, `temps_manière` et `être`. La vérification d'`économie` suit l'exception ciblée ci-dessus.

Les familles acceptées sont toujours présentes : `action` (37), `activité` (1), `nature` (17), `qualité` (38), `quantité` (10) et `temps` (3).

## Compteurs et empreintes

| Table | Volume avant/après | Empreinte |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 270 | `0de598…d787` → `847ae3…3564e` |
| `lexical_form` | 1 125 | `8b3d2cd9098213395ce9cc78ac257424adc13f22a5775472c536a773529ea4f5` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 70 | `4d3f55cfe964bcba184d07d63eb05e631cc186aaf26da42974a1c17ac2ceaa43` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

## Tests et recettes

### Automatisés

- tests ciblés initiaux : 6/6 réussis ;
- suite complète avant application canonique : 200/200 réussis ;
- suite complète après application et ajout de la résolution `économie` : 201/201 réussis ;
- test explicite : seules les décisions C 126/257/258 quittent `économie`, l'ID 28 est hors plan ;
- syntaxe Node et `git diff --check` : réussis.

### HTTP

- `/admin/model-summary` : volumes attendus ;
- vues API : `BIODIVERSITE → nature`, `INCENDIE → catastrophe`, `ETRE → verbe auxiliaire`, `RESULTAT → causalité`, `PRODUCTION_AGRICOLE → agriculture`, `FOOD_SUPPLY → alimentation` ;
- conservations : `CURRENCY_MONEY → économie`, `PRODUCTION → activité`, `CUANDO_CONJUNCTION_WHEN → temps` ;
- recherche `LIKE` sur `relations logiques` : six résultats, dont les trois apports de cette mission.

### Visuelle Chromium

À 1265 × 710, les vues conceptuelles ont affiché sans défaut visible :

- `BIODIVERSITE` dans `nature` ;
- `RESULTAT` dans `causalité` ;
- `CURRENCY_MONEY` toujours dans `économie`.

La console navigateur ne contient ni erreur ni avertissement. Cette recette Codex ne remplace pas une validation humaine de David.

## Versions et services

Aucune version applicative n'a été modifiée : la mission est exclusivement une migration de données accompagnée de scripts et tests permanents.

Un serveur Dico-IC ciblé a servi les recettes HTTP et visuelles. Son PID 3640 a été authentifié par son marqueur projet puis arrêté. Aucun service HTTP n'écoute le port 3000 en fin de mission. MariaDB reste active comme avant la mission.

## Fichiers créés

- `prototypes/08-dico-seven-sieves/Node/scripts/create-semantic-domain-c-backup.js` ;
- `prototypes/08-dico-seven-sieves/Node/scripts/normalize-semantic-domains-c.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/semantic-domain-c-normalization.test.js` ;
- `reports/assets/209_dico_ic_semantic_domain_c_decisions/backup.json` ;
- `reports/assets/209_dico_ic_semantic_domain_c_decisions/fixture_validation.json` ;
- `reports/209_dico_ic_semantic_domain_c_decisions_report.md`.

Aucun fichier applicatif, prompt ou interface n'a été modifié.

## Limites et suites

- aucun appel OpenAI n'a été effectué ;
- aucun commit, push ou déploiement n'a été réalisé ;
- aucune validation humaine d'interface n'est revendiquée ;
- les domaines ne deviennent pas une taxonomie fermée.

Message de commit proposé :

```text
refactor(dico-ic): appliquer les décisions humaines sur les domaines C
```
