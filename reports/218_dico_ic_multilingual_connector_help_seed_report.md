# Mission 218 — Enrichissement transactionnel du catalogue multilingue des aides à la lecture

Date : 19 août 2026  
Projet : `prototypes/08-dico-seven-sieves`  
Base : `ic_dico`

## 1. Résultat

La Mission 218 est appliquée. Quinze aides IT/PT/EN issues exactement de la matrice Mission 216 ont été ajoutées dans une transaction unique, puis un rejeu idempotent a confirmé zéro modification supplémentaire.

Le catalogue contient désormais 27 aides :

| Langue | Aides | Fonctions distinctes |
|---|---:|---:|
| FR | 6 | 5 |
| ES | 6 | 5 |
| IT | 5 | 5 |
| PT | 5 | 5 |
| EN | 5 | 5 |

Les variantes historiques FR `mais` et ES `pero` sont conservées. CA, GL, OC, RO, CO, SC et RM restent sans aide.

## 2. Sens du statut et validation humaine

David a validé la matrice Mission 216 comme noyau de travail publiable pour le prototype. Les quinze lignes portent donc le statut technique `VALIDATED`, qui signifie ici :

> publiée et utilisable par l’application

Ce statut ne constitue pas une preuve de validation scientifique individuelle par Christian ou Sylvain. La provenance homogène est `Noyau multilingue Dico-IC` et la note interne est `Catalogue de travail à revoir avec Christian et Sylvain.`. La discussion linguistique et pédagogique avec eux reste future.

Les quinze `lexical_entry_id` sont `NULL`. Aucune relation lexicale n’a été inventée.

## 3. Jeu de données appliqué

| Langue | Opposition | Cause | Conséquence | Addition | Chronologie |
|---|---|---|---|---|---|
| IT | `tuttavia` | `perché` | `quindi` | `inoltre` | `poi` |
| PT | `no entanto` | `porque` | `portanto` | `além disso` | `depois` |
| EN | `however` | `because` | `therefore` | `moreover` | `then` |

Expression, normalisation, fonction, titre, aide, exemple et prudence sont repris sans reformulation depuis `proposed_multilingual_matrix.json`. Le plan permanent recroise chaque champ avec cette source avant toute opération.

## 4. État initial et sauvegarde

État initial réel confirmé avant toute écriture :

- HEAD Git : `dfbed23`, dépôt propre ;
- 12 aides : FR 6, ES 6, IT/PT/EN 0 ;
- auto-incrément `connector_help` : 17 ;
- 86 relations ;
- cinq langues actives `DOCUMENTED` ;
- sept langues inactives `REFERENCED`.

La sauvegarde `pre_apply_backup.json` contient les douze lignes historiques complètes, les huit volumes, les huit empreintes et l’auto-incrément. Son SHA-256 est `598da6fb4509b2cb9a3454598c4ebb872f08fd132f113488e2ece4539b20d6f3`.

### Empreintes initiales

| Table | Lignes | SHA-256 |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

## 5. Script transactionnel permanent

`manage-multilingual-connector-helps.js` propose :

- `--check` ;
- `--apply` ;
- `--rollback`.

Tous les modes exigent la sauvegarde. Le script :

- résout IT/PT/EN par code ;
- vérifie `is_active = 1` et `DOCUMENTED` ;
- recroise le plan gelé avec la matrice Mission 216 ;
- protège l’empreinte des douze lignes historiques ;
- protège les sept autres tables ;
- reproduit le conflit applicatif d’expression normalisée validée ;
- refuse les états `partial` et `unknown` ;
- insère les quinze lignes dans une transaction ;
- reconnaît un état déjà appliqué et écrit alors zéro ligne ;
- vérifie au rollback les empreintes d’identité et de contenu ;
- ne cible jamais une simple plage d’auto-incréments ;
- restaure l’auto-incrément initial après rollback exact.

Un script séparé produit la sauvegarde avant application sans écraser un artefact existant.

## 6. Validation MariaDB jetable

Un conteneur MariaDB 11 isolé sur le port 3307 a reçu une copie complète des 8 tables, 9 procédures et données de `ic_dico`.

Résultats :

- état initial : `pending`, empreintes identiques ;
- application : 15/15 ;
- total final : 27 ;
- répartition : 6/6/5/5/5 ;
- rejeu : zéro modification ;
- ligne `PROPOSED` injectée : absente de la lecture publique, puis supprimée ;
- ligne Mission 218 modifiée : rollback refusé ;
- contenu exact restauré : rollback 15/15 réussi ;
- auto-incrément restauré à 17 ;
- état partiel : application refusée ;
- collision validée : application refusée ;
- fin : huit volumes et empreintes revenus exactement à l’état initial.

Le conteneur `ic_dico_m218_fixture` a été arrêté avec `--rm`. Il ne subsiste plus et le port 3307 est libre. La preuve finale porte le SHA-256 `25832a8234c4f436ff83cfa16aec8ff0f703126d5f4a6af7845d5ef448dd6e24`.

## 7. Application réelle

Le contrôle immédiatement préalable a confirmé `pending`. L’application a créé exactement les IDs 17 à 31, sans supposer ces IDs dans le plan ni dans le rollback.

- premier passage : `changed_rows = 15`, état `applied` ;
- second passage : `changed_rows = 0`, état `applied` ;
- auto-incrément final : 32 ;
- empreinte des douze historiques : strictement inchangée ;
- empreintes des sept autres tables : strictement inchangées.

Le rollback réel n’a pas été exécuté après l’application validée. Il a été prouvé intégralement sur la copie jetable. Les instructions contrôlées sont conservées dans `rollback_instructions.md`.

## 8. Seed canonique

`database/current_draft/60_connector_help.sql` conserve le bloc historique des douze aides, puis ajoute un bloc Mission 218 idempotent :

- résolution des langues par code ;
- langue active et `DOCUMENTED` ;
- mêmes quinze contenus que le plan ;
- statut, provenance et notes identiques à la base ;
- aucun lien lexical ;
- anti-doublon par langue, expression normalisée et fonction.

Le test permanent vérifie les quinze lignes et chacun des champs de contenu entre le seed et le plan gelé. La base réelle n’a pas été réinitialisée depuis le seed.

## 9. Recette API réelle

Les textes exacts demandés ont été envoyés à `POST /analysis`.

### Italien

HTTP 200, cinq aides :

- `Tuttavia` — opposition — `[0,8)` ;
- `perché` — cause — `[21,27)` ;
- `Inoltre` — addition — `[52,59)` ;
- `quindi` — conséquence — `[84,90)` ;
- `poi` — chronologie — `[113,116)`.

### Portugais

HTTP 200, cinq aides :

- `No entanto` — opposition — `[0,10)`, tokens `[0,1]` ;
- `porque` — cause — `[22,28)` ;
- `Além disso` — addition — `[53,63)`, tokens `[10,11]` ;
- `portanto` — conséquence — `[87,95)` ;
- `depois` — chronologie — `[119,125)`.

### Anglais

HTTP 200, cinq aides : `However`, `because`, `Moreover`, `therefore`, `then`. EN reste publiquement `Langue de comparaison — non romane`.

### Non-régressions et normalisation

- ES : `Sin embargo`, `[0,11)`, tokens `[0,1]` ;
- FR : `Cependant` et `parce que`, contenus historiques inchangés ;
- casse : `TUTTAVIA` et `PERCHÉ` reconnus ;
- accents : `perche` ne correspond pas à `perché`, `Alem disso` ne correspond pas à `além disso` ;
- toutes les surfaces sont exactement égales à la tranche définie par leurs offsets ;
- aucune aide ne possède de `sieve_id` ;
- CA est refusé avec HTTP 400 `INVALID_CONNECTOR_LANGUAGE`.

## 10. Contrôle Seven Sieves

Les paquets réels IT et PT ont été passés au contrat de session et au moteur d’aides apprenant :

- cinq aides valides dans chaque langue ;
- `No entanto` et `Além disso` rattachés à leurs deux tokens ;
- bouton présent quand cinq aides existent ;
- section masquée par défaut ;
- affichage puis masquage fonctionnels ;
- tamis actif 4 conservé pendant les changements d’affichage ;
- sept tamis exactement ;
- aucune aide transformée en tamis ;
- sélection, état et contrat de session couverts par la suite existante ;
- EN absent des choix enseignant et apprenant, volontairement.

La connexion au navigateur intégré a échoué avant l’ouverture de la page. Aucun constat visuel de largeur, couleurs ou absence d’erreur console n’est donc affirmé. La validation humaine simple du rendu IT/PT reste à effectuer par David. Les contrôles du moteur ne remplacent pas cette validation humaine.

## 11. Tests

- tests ciblés initiaux analyse/connecteurs/plan : 38/38 réussis ;
- tests permanents Mission 218 : plan, provenance, accents, états, sauvegarde, fixture, application réelle, transaction, seed, moteur multilingue et Seven Sieves ;
- suite Node finale : 252/252 réussis, code de sortie 0 ;
- syntaxe des trois scripts Mission 218 : réussie ;
- `git diff --check` : réussi ; seuls les avertissements locaux LF/CRLF sont observés.

## 12. Intégrité finale

| Table | Lignes finales | SHA-256 final | Évolution |
|---|---:|---|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` | identique |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` | identique |
| `lexical_form` | 1286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` | identique |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` | identique |
| `connector_help` | 27 | `a94c3b333830c15169d7bf31758c936912b6ac3b4b002fb600750c27c0271c11` | +15 attendues |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` | identique |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` | identique |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` | identique |

La seule différence de données est l’ajout exact des quinze lignes `connector_help`. Les douze lignes historiques gardent l’empreinte `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846`.

## 13. Fichiers concernés

Modifiés :

- `prototypes/08-dico-seven-sieves/database/current_draft/60_connector_help.sql` ;
- `prototypes/08-dico-seven-sieves/Node/test/connector-help.test.js`.

Créés :

- `prototypes/08-dico-seven-sieves/Node/scripts/manage-multilingual-connector-helps.js` ;
- `prototypes/08-dico-seven-sieves/Node/scripts/create-multilingual-connector-help-backup.js` ;
- `prototypes/08-dico-seven-sieves/Node/scripts/validate-multilingual-connector-help-fixture.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/multilingual-connector-help-seed.test.js` ;
- `reports/assets/218_dico_ic_multilingual_connector_help_seed/mission_218_frozen_plan.json` ;
- `reports/assets/218_dico_ic_multilingual_connector_help_seed/pre_apply_backup.json` ;
- `reports/assets/218_dico_ic_multilingual_connector_help_seed/fixture_validation_evidence.json` ;
- `reports/assets/218_dico_ic_multilingual_connector_help_seed/real_application_evidence.json` ;
- `reports/assets/218_dico_ic_multilingual_connector_help_seed/real_api_and_seven_sieves_recipe.json` ;
- `reports/assets/218_dico_ic_multilingual_connector_help_seed/rollback_instructions.md` ;
- `reports/218_dico_ic_multilingual_connector_help_seed_report.md`.

Aucun fichier d’interface, des sept tamis ou de leurs heuristiques n’a été modifié.

## 14. Versions et services

Versions inchangées :

- administration Dico-IC : `0.1.8` ;
- contrat API : `0.1` ;
- package Node : `1.0.0` ;
- Seven Sieves enseignant : `0.1.2` ;
- Seven Sieves apprenant : `0.1.3`.

Le conteneur MariaDB principal et phpMyAdmin ont été préservés. Le conteneur jetable a seul été créé puis supprimé. Une instance Dico-IC ciblée a été lancée pour les recettes HTTP ; elle n’était plus en écoute lors du contrôle final et n’a pas été relancée artificiellement. Aucun autre service applicatif n’a été manipulé.

## 15. Clôture et limites

- Aucun appel OpenAI.
- Aucun commit, push ou déploiement.
- Aucune migration vers un portable.
- Aucune fixture ou processus MariaDB jetable résiduel.
- Discussion Christian/Sylvain et validation visuelle humaine encore à effectuer.

Message de commit proposé :

```text
feat(dico-ic): seed multilingual connector help core (mission 218)
```
