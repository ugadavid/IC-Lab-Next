# Rapport 192 — Implémentation du statut documentaire des langues Dico-IC

Date : 18 août 2026  
Nature : évolution de schéma ciblée, API de lecture et présentation administrative  
Périmètre : `prototypes/08-dico-seven-sieves`, MariaDB `ic_dico`, sans ajout de langue ni de contenu lexical

## 1. Résultat

Dico-IC possède désormais un statut documentaire distinct de l'activation opérationnelle :

- `documentation_status` accepte exactement `DOCUMENTED` et `REFERENCED` ;
- `is_active` est conservé sans modification ;
- les cinq langues historiques FR, ES, IT, PT et EN portent toutes `DOCUMENTED` ;
- aucune autre langue n'a été ajoutée ;
- `GET /languages` reste la liste opérationnelle rétrocompatible, dans l'ordre FR/ES/IT/PT/EN ;
- `GET /language-catalog` expose séparément le catalogue documentaire et ses métriques ;
- l'administration affiche dynamiquement 4 langues romanes documentées, 1 langue de comparaison non romane, 0 langue romane référencée et 5 langues au catalogue ;
- le groupe vide des langues référencées est masqué dans l'interface, sans perdre son compteur API ni sa couverture de test.

La vue principale d'administration passe à la version **0.1.3**. Le contrat API reste **0.1** et le package Node reste **1.0.0**.

## 2. Instructions et état Git initial

La mission autorise explicitement ce rapport dans `IC-Lab-Next/reports/`, alors que la section historique « Mode d'audit technique » de `AGENTS.md` prévoit `IC-Lab-Next-Technical` pour les audits. La mission 192 est une implémentation et son autorisation explicite prévaut. `AGENTS.md` n'a pas été modifié.

État initial :

- branche `main` ;
- commit `9d71369` ;
- unique élément non suivi : `reports/191_dico_ic_language_readiness_model_audit.md`, créé pendant la mission précédente et préservé ;
- aucune modification applicative préexistante.

Les rapports 188, 189, 190 et 191 ont été lus avant l'implémentation.

## 3. Préconditions constatées

Avant toute écriture MariaDB, le mode `--check` a confirmé :

- table `language` composée exactement de `id`, `code`, `name`, `family`, `is_romance`, `is_active` ;
- clé primaire, codes, noms, familles et activations attendus ;
- cinq lignes seulement, IDs 1 à 5, codes FR/ES/IT/PT/EN ;
- absence de colonne ou contrainte documentaire partielle ;
- volumes : 150 entrées, 597 formes lexicales, 16 formes fléchies, 12 aides discursives, 70 relations, 1 règle, 8 traits IC.

Toute divergence sur une ligne, une colonne ou un volume provoque l'arrêt du script avant sauvegarde et avant DDL.

## 4. Sauvegardes

### Base de développement

Créées avant l'ALTER réel :

- `reports/assets/192_dico_ic_documentation_status/development-before/language-schema-before.sql` : résultat exact de `SHOW CREATE TABLE language` ;
- `reports/assets/192_dico_ic_documentation_status/development-before/language-rows-before.json` : cinq lignes historiques ;
- `reports/assets/192_dico_ic_documentation_status/development-before/migration-manifest-before.json` : identité de la migration, valeurs admises et volumes.

Les fichiers sont créés en mode exclusif : un fichier existant n'est jamais écrasé silencieusement.

### Test de rollback

Un jeu équivalent a été créé sous :

`reports/assets/192_dico_ic_documentation_status/rollback-test/`

Il correspond à la copie complète jetable `ic_dico_m192_rollback_test`, supprimée après restauration et vérification.

## 5. Schéma avant et après

Avant :

```text
is_active TINYINT(1) NOT NULL DEFAULT 1
```

Après :

```text
is_active TINYINT(1) NOT NULL DEFAULT 1
documentation_status VARCHAR(20) NOT NULL DEFAULT 'DOCUMENTED'
CONSTRAINT chk_language_documentation_status
  CHECK (documentation_status IN ('DOCUMENTED', 'REFERENCED'))
```

Le type chaîne avec contrainte préserve la séparation entre maturité documentaire, famille linguistique et rôle public. Aucune valeur technique combinée n'a été créée.

## 6. Migration, idempotence et rollback

Script créé :

`prototypes/08-dico-seven-sieves/Node/scripts/migrate-language-documentation-status.js`

Modes :

```text
--check
--apply --backup-dir <dossier>
--rollback --backup-dir <dossier>
```

Protections :

- validation exacte du schéma de départ ;
- validation exacte des cinq langues et des huit volumes ;
- distinction des états `pending`, `applied` et `partial` ;
- refus de toute définition ou valeur inattendue ;
- sauvegardes obligatoires avant l'ALTER ;
- ajout colonne + contrainte dans un ALTER atomique MariaDB ;
- réconciliation complète après DDL ;
- rollback autorisé uniquement depuis l'état entièrement appliqué et une sauvegarde valide ;
- comparaison du DDL et des cinq lignes après restauration.

MariaDB réalise un commit implicite autour du DDL : la sécurité ne repose donc pas sur une transaction SQL illusoire. Elle repose sur l'ALTER atomique, les préconditions, la sauvegarde préalable et le rollback contrôlé.

### Preuve sur copie jetable

La base complète a été copiée vers `ic_dico_m192_rollback_test` :

- première application : `changed_schema = 1`, `changed_rows = 5` ;
- deuxième application : `changed_schema = 0`, `changed_rows = 0`, état `already_applied` ;
- rollback : état `restored`, schéma initial et cinq lignes identiques à la sauvegarde ;
- cinq langues et volumes inchangés après restauration ;
- copie jetable supprimée après contrôle.

Une seconde copie `ic_dico_m192_partial_test` a été placée volontairement dans l'état « colonne présente, contrainte absente ». L'application a été refusée avec code de sortie 1, sans sauvegarde créée ni écriture supplémentaire. Cette copie a ensuite été supprimée.

### Application réelle

- première application : 5 lignes initialisées à `DOCUMENTED` ;
- deuxième application : exactement 0 modification ;
- rollback réel non exécuté, puisque la migration validée doit rester active ;
- commande de rollback disponible à partir de la sauvegarde `development-before`.

## 7. Procédures et reproductibilité

`sp_upsert_language` conserve sa signature historique à cinq paramètres. Elle n'a pas été modifiée : la nouvelle colonne possède un défaut `DOCUMENTED`, donc tous les appels existants restent compatibles sans sixième paramètre obligatoire.

Voie retenue :

- base existante : script versionné `Node/scripts/migrate-language-documentation-status.js` ;
- reproduction à neuf : `database/current_draft/00_schema.sql`, qui contient désormais la colonne et la contrainte ;
- appels historiques : `database/current_draft/20_seed_base.sql`, inchangés et couverts par la valeur par défaut ;
- procédure : `database/current_draft/10_procedures.sql`, inspectée mais inchangée pour préserver la compatibilité.

Le README de `database/current_draft/` explique cette séparation. Aucun ancien dump ou script destructif n'a été rejoué ni réécrit.

## 8. Contrats API

### `GET /languages`

Avant : filtre `is_active = 1`, ordre alphabétique technique.  
Après : filtre `is_active = 1 AND documentation_status = 'DOCUMENTED'`, ordre public FR/ES/IT/PT/EN.

La réponse reste strictement rétrocompatible : `code`, `name`, `family`, `is_romance`, `is_active`. Le statut documentaire n'a pas été injecté dans ce contrat opérationnel.

Cette méthode continue d'alimenter `POST /analysis`, les validations lexicales et les assistants. Les résolutions directes de langues dans le repository et les lectures publiques d'aides discursives appliquent aussi la double garde.

### `GET /language-catalog`

Nouvelle route de lecture distincte. Elle retourne :

- les propriétés du catalogue, dont `documentation_status` ;
- le libellé public dérivé ;
- les volumes réels par langue : concepts, formes, formes fléchies et aides discursives ;
- les compteurs dynamiques `total`, `romance_documented`, `non_romance_comparison`, `romance_referenced`.

La route n'a pas remplacé globalement `getLanguages()`.

## 9. Administration

La section « Langues actives » devient « Catalogue des langues ». Deux listes restent séparées dans le JavaScript :

- `/languages` fournit les choix des formulaires ;
- `/language-catalog` fournit uniquement la consultation documentaire.

État affiché :

- **4** langues romanes documentées ;
- **1** langue de comparaison non romane ;
- groupe référencé masqué parce que son compteur vaut **0** ;
- **5 langues au catalogue**.

Le tableau affiche FR, ES, IT, PT et EN, leur classification publique et leurs volumes réels. Les codes `DOCUMENTED`, `REFERENCED` et le nom de colonne ne sont pas visibles en façade.

L'aide repliée « ? Comprendre le catalogue des langues » explique la différence sans détail de migration ni avertissement anxiogène.

## 10. Fichiers concernés

### Créés

- `prototypes/08-dico-seven-sieves/Node/scripts/migrate-language-documentation-status.js` ;
- six sauvegardes sous `reports/assets/192_dico_ic_documentation_status/development-before/` et `rollback-test/` ;
- `reports/assets/192_dico_ic_documentation_status/catalog-1440x900.png` ;
- `reports/assets/192_dico_ic_documentation_status/catalog-1366x768.png` ;
- `reports/192_dico_ic_documentation_status_implementation_report.md`.

### Modifiés

- `prototypes/08-dico-seven-sieves/Node/src/repository.js` ;
- `prototypes/08-dico-seven-sieves/Node/server.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-0.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-0.1.css` ;
- `prototypes/08-dico-seven-sieves/database/current_draft/00_schema.sql` ;
- `prototypes/08-dico-seven-sieves/database/current_draft/README.md`.

Inspecté mais inchangé : `database/current_draft/10_procedures.sql` et `20_seed_base.sql`.

## 11. Tests automatisés et statiques

Suite complète Node après migration : **111 tests réussis, 0 échec**.

Elle comprend les 107 tests historiques documentés par la mission 190 et 4 tests ciblés couvrant :

- séparation liste opérationnelle/catalogue ;
- double filtre et ordre public ;
- classifications et compteurs 4/1/0/5 ;
- validation des cinq lignes et refus d'état partiel ;
- contrat des deux routes ;
- version, aide et absence de statuts techniques dans l'HTML.

Autres contrôles :

- `node --check` réussi sur migration, repository, serveur et frontend ;
- `git diff --check` réussi ; seuls les avertissements informatifs LF/CRLF subsistent ;
- aucune dépendance installée ou mise à jour.

## 12. Contrôles HTTP réels

Serveur temporaire sur le port 3100 :

| Contrôle | Résultat |
|---|---|
| `GET /languages` | HTTP 200, FR/ES/IT/PT/EN, anciennes clés uniquement |
| `GET /language-catalog` | HTTP 200, 5 langues, cinq `DOCUMENTED`, compteurs 4/1/0/5 |
| `GET /admin/model-summary` | HTTP 200, volumes 5/150/597/16/12/70/1/8 |
| `POST /analysis` ES→FR | HTTP 200, contrat `0.1`, aucun avertissement |
| `POST /admin/text-coverage` | HTTP 200 |
| `GET /admin/lexical-entry/INFORMATION_DATA` | HTTP 200, 5 formes, 4 relations, provenances conservées |

## 13. Recette visuelle

### 1440 × 900 et 1366 × 768

- version visible `0.1.3` ;
- catalogue de cinq lignes dans l'ordre FR/ES/IT/PT/EN ;
- deux compteurs compacts 4 et 1 ;
- groupe vide référencé absent ;
- total 5 visible sans être présenté comme une couverture ;
- anglais visuellement distingué par sa classification de comparaison ;
- aide fermée par défaut, ouverture et texte vérifiés ;
- aucun statut technique visible ;
- aucun débordement horizontal, texte tronqué, mojibake, erreur ou avertissement console.

Captures :

- `reports/assets/192_dico_ic_documentation_status/catalog-1440x900.png` ;
- `reports/assets/192_dico_ic_documentation_status/catalog-1366x768.png`.

La vue `INFORMATION_DATA` a été contrôlée séparément : version 0.1.2 conservée, 5 cartes de forme, 4 relations, provenance publique présente, aucun contrôle d'écriture et aucun débordement.

Cette recette de Codex ne constitue pas une validation humaine de David.

## 14. État MariaDB final

| Objet | Total final |
|---|---:|
| Langues | 5 |
| Langues `DOCUMENTED` | 5 |
| Langues `REFERENCED` | 0 |
| Entrées conceptuelles | 150 |
| Formes linguistiques | 597 |
| Formes fléchies | 16 |
| Aides discursives | 12 |
| Relations | 70 |
| Règles | 1 |
| Traits IC | 8 |

IDs, codes, noms, familles, `is_romance` et `is_active` des cinq lignes sont identiques à la sauvegarde. Aucune ligne CA, GL, OC, RO, CO, SC ou RM n'existe.

## 15. Périmètre préservé, processus et limites

Non modifiés :

- contenus lexicaux, relations, règles, aides discursives, formes fléchies et traits IC ;
- entrée `NUIT` ;
- vue et données `INFORMATION_DATA` ;
- Seven Sieves ;
- Compose, launchers, migration portable et `AGENTS.md` ;
- package Node et contrat API.

Le serveur temporaire sur 3100 a été arrêté. Aucun processus n'écoute sur 3000 ou 3100 à la clôture. Les bases jetables ont été supprimées ; les conteneurs MariaDB/phpMyAdmin préexistants restent actifs et n'ont pas été redémarrés.

Limites :

- aucune langue `REFERENCED` n'existe encore, conformément au périmètre ;
- le rendu futur du troisième groupe est couvert par logique et tests, mais sa recette avec des données réelles appartient à la mission suivante ;
- la signature de `sp_upsert_language` reste volontairement historique ; une future insertion `REFERENCED` devra utiliser le script transactionnel dédié de la prochaine mission ;
- validation humaine finale de David non réalisée.

Aucun commit, push ou déploiement n'a été effectué.

Message de commit proposé :

```text
feat(dico): introduire le statut documentaire des langues
```
