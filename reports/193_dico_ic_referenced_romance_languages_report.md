# Rapport 193 — Ajout des langues romanes référencées dans Dico-IC

Date : 18 août 2026  
Nature : évolution de données ciblée, reproductibilité, contrats API et présentation administrative  
Périmètre : `prototypes/08-dico-seven-sieves`, MariaDB `ic_dico`, sans contenu linguistique nouveau

## 1. Résultat

Dico-IC référence désormais douze langues dans son catalogue, tout en maintenant exactement cinq langues opérationnelles.

- FR, ES, IT, PT et EN restent `DOCUMENTED` et actives ;
- CA, GL, OC, RO, CO, SC et RM sont `REFERENCED` et inactives ;
- les sept nouvelles lignes ne possèdent aucune forme, relation, règle, aide, forme fléchie ni trait IC ;
- `GET /languages` conserve son contrat `0.1`, ses cinq lignes et ses anciennes clés ;
- `GET /language-catalog` retourne les douze lignes dans l’ordre public demandé ;
- l’administration affiche trois catégories lisibles et passe à la version **0.1.4** ;
- le package Node reste **1.0.0**, le contrat API reste **0.1** et Seven Sieves reste inchangé.

## 2. Instructions et état Git initial

`AGENTS.md` et les rapports 190, 191 et 192 ont été lus avant intervention. L’autorisation explicite du rapport dans `IC-Lab-Next/reports/` prévaut sur la règle historique d’emplacement des audits ; la mission 193 est en outre une implémentation, pas un audit technique en lecture seule.

État initial :

- branche : `main` ;
- commit : `886028c feat(dico): introduire le statut documentaire des langues` ;
- état Git : propre, aucun fichier modifié ou non suivi ;
- séquence des rapports : maximum `192`, aucune collision avec `193`.

## 3. Préconditions observées avant écriture

Le contrôle `migrate-language-documentation-status.js --check`, puis le nouveau script en mode `--check`, ont établi :

- colonne `documentation_status VARCHAR(20) NOT NULL DEFAULT 'DOCUMENTED'` présente ;
- contrainte n’admettant que `DOCUMENTED` et `REFERENCED` ;
- exactement cinq lignes, IDs 1 à 5, codes FR/ES/IT/PT/EN ;
- cinq statuts `DOCUMENTED`, cinq activations à 1 ;
- aucune ligne CA, GL, OC, RO, CO, SC ou RM ;
- auto-incrément suivant : 6 ;
- 150 entrées lexicales ;
- 597 formes lexicales ;
- 16 formes fléchies ;
- 12 aides discursives ;
- 70 relations ;
- 1 règle ;
- 8 traits IC.

Toute divergence sur le schéma, une ligne historique ou un volume fonctionnel provoque l’arrêt avant insertion.

## 4. Valeurs exactes insérées

| ID | Code | Nom | Famille stockée | Romane | Statut documentaire | Active |
|---:|---|---|---|---:|---|---:|
| 6 | `ca` | Català | Romance | 1 | `REFERENCED` | 0 |
| 7 | `gl` | Galego | Romance | 1 | `REFERENCED` | 0 |
| 8 | `oc` | Occitan | Romance | 1 | `REFERENCED` | 0 |
| 9 | `ro` | Română | Romance | 1 | `REFERENCED` | 0 |
| 10 | `co` | Corsu | Romance | 1 | `REFERENCED` | 0 |
| 11 | `sc` | Sardu | Romance | 1 | `REFERENCED` | 0 |
| 12 | `rm` | Rumantsch | Romance | 1 | `REFERENCED` | 0 |

Aucun autre objet métier n’a été inséré.

## 5. Script, sauvegardes et garanties de rollback

Script créé :

`prototypes/08-dico-seven-sieves/Node/scripts/manage-referenced-romance-languages.js`

Modes :

```text
--check
--apply --backup-dir <dossier>
--rollback --backup-dir <dossier>
```

Garanties :

- validation exacte du schéma documentaire et des cinq lignes historiques ;
- validation des sept volumes fonctionnels ;
- états stricts `pending` ou `applied`, tout état partiel ou collision étant refusé ;
- sauvegarde exclusive avant insertion, sans écrasement silencieux ;
- transaction, verrouillage de toutes les lignes de `language` et requêtes paramétrées ;
- assertion de sept lignes au premier passage et zéro au rejeu ;
- vérification des dépendances directes et indirectes ;
- rollback possible uniquement avec la sauvegarde attendue, sept lignes exactes et zéro dépendance ;
- suppression transactionnelle des sept seules lignes ;
- restauration contrôlée des cinq lignes et de l’auto-incrément initial.

Sauvegarde de la base de développement :

`reports/assets/193_dico_ic_referenced_romance_languages/development-before/`

Elle contient :

- `language-schema-before.sql` ;
- `language-rows-before.json` ;
- `migration-manifest-before.json`.

Sauvegarde de la preuve jetable :

`reports/assets/193_dico_ic_referenced_romance_languages/rollback-test/`

## 6. Preuve sur copie complète jetable

La base complète `ic_dico` a été copiée dans `ic_dico_m193_rollback_test` avant l’application réelle.

Résultats :

- première application : `changed_rows = 7`, état `applied` ;
- seconde application : `changed_rows = 0`, état `already_applied` ;
- dépendance simulée : une forme lexicale jetable rattachée à CA ;
- rollback avec dépendance : refus explicite, une dépendance lexicale détectée, aucune langue supprimée ;
- retrait de la seule fixture jetable : exactement une ligne ;
- rollback suivant : `changed_rows = 7`, état `restored` ;
- état restauré : cinq lignes initiales exactes, volumes initiaux et auto-incrément 6 ;
- collision CA portant des valeurs différentes : application refusée avant sauvegarde et sans écriture supplémentaire.

La base et son droit temporaire ont ensuite été supprimés. Le contrôle final trouve zéro base `ic_dico_m193_%`.

## 7. Application sur `ic_dico`

- première application réelle : exactement 7 insertions ;
- seconde application réelle : exactement 0 modification ;
- rollback réel : non exécuté, conformément à la mission ;
- état final du script : `applied` ;
- dépendances finales des sept codes : 0 dans chaque catégorie contrôlée.

## 8. Reproductibilité

La voie retenue par la mission 192 a été complétée sans modifier les dumps historiques.

- `database/current_draft/00_schema.sql` reste la déclaration du statut ;
- `database/current_draft/20_seed_base.sql` appelle encore `sp_upsert_language` pour les cinq lignes historiques ;
- il insère ensuite explicitement les sept lignes avec `REFERENCED` et `is_active = 0`, sans dépendre du défaut `DOCUMENTED` ;
- `database/current_draft/10_procedures.sql` reste inchangé ;
- `sp_upsert_language` conserve ses cinq paramètres historiques.

Une base jetable créée par `00_schema.sql`, `10_procedures.sql` et `20_seed_base.sql` adaptés seulement au nom de la base de test a produit exactement les IDs et statuts 1 à 12 attendus : 5 documentées, 7 référencées, 5 actives. La base de reproduction a été supprimée après contrôle.

## 9. Contrats HTTP et requêtes forgées

Les contrôles ont été exécutés sur le code courant via un serveur isolé sur le port 3193.

### Liste opérationnelle

`GET /languages` :

- HTTP 200 ;
- contrat `0.1` ;
- ordre exact FR/ES/IT/PT/EN ;
- seules clés historiques : `code`, `name`, `family`, `is_romance`, `is_active` ;
- aucun des sept nouveaux codes.

### Catalogue documentaire

`GET /language-catalog` :

- HTTP 200 ;
- ordre exact FR/ES/IT/PT/CA/GL/OC/RO/CO/SC/RM/EN ;
- compteurs : 4 documentées romanes, 7 référencées romanes, 1 comparaison non romane, total 12 ;
- les sept lignes portent chacune zéro concept, forme, forme fléchie et aide discursive.

### Frontières fonctionnelles

Pour chacun des codes CA, GL, OC, RO, CO, SC et RM :

- `POST /analysis` : HTTP 400 `INVALID_LANGUAGE` ;
- `POST /admin/lexical-entry` forgé : HTTP 400 `INVALID_LANGUAGE`, aucune écriture ;
- assistant Domaine : HTTP 400 `INVALID_LANGUAGES` avant génération ;
- couverture Texte : HTTP 400 `INVALID_SOURCE_LANGUAGE` ;
- génération Texte : HTTP 400 `INVALID_LANGUAGES` avant génération.

Une analyse ES→FR valide retourne toujours HTTP 200 avec le contrat `0.1`.

`GET /admin/lexical-entry/INFORMATION_DATA` retourne toujours cinq formes FR/ES/IT/PT/EN et quatre relations.

## 10. Présentation et recette visuelle

La vue principale affiche désormais :

- le message de soutenance demandé, mot pour mot ;
- 4 langues romanes documentées ;
- 7 langues romanes prêtes à documenter ;
- 1 langue de comparaison — non romane ;
- 12 langues au catalogue, en détail discret ;
- les familles publiques `Romane` et `Germanique` sans modifier les valeurs stockées ;
- pour les sept nouvelles langues : `Langue romane référencée — prête à documenter` et `Prête à accueillir des contenus validés` ;
- EN en dernier, avec fond, bordure et libellé distincts.

Recette à 1440 × 900 et 1366 × 768 :

- douze lignes lisibles ;
- ordre impératif respecté ;
- aucune troncature utile ni aucun débordement horizontal ;
- largeur document et largeur cliente identiques ;
- largeur du tableau et de son conteneur identiques ;
- aucun code `DOCUMENTED`, `REFERENCED` ou `is_active` visible ;
- aucune présence des sept codes dans les sélecteurs fonctionnels ;
- assistant Domaine : FR/ES/IT/PT/EN seulement ;
- assistant Texte : sources FR/ES/IT/PT, cibles FR/ES/IT/PT/EN ;
- aucune erreur ni avertissement console ;
- aucun mojibake observé.

Captures :

- `reports/assets/193_dico_ic_referenced_romance_languages/catalog-1440x900.png` ;
- `reports/assets/193_dico_ic_referenced_romance_languages/catalog-1366x768.png`.

Cette recette Codex ne constitue pas une validation fonctionnelle humaine de David.

## 11. Tests et contrôles statiques

- suite Node complète : **117 tests réussis, 0 échec** ;
- non-régression des 111 tests de la mission 192 ;
- 6 tests ciblés nouveaux couvrant constantes exactes, état partiel/collision, volumes et dépendances, sept analyses et écritures forgées, assistants Domaine/Texte et reproduction SQL ;
- `node --check` réussi sur le script, le repository, le frontend et le test ciblé ;
- syntaxe SQL exécutée avec succès sur la base de reproduction jetable ;
- `git diff --check` réussi, hors avertissements informatifs LF/CRLF ;
- recherche de mojibake sur les fichiers concernés : aucune occurrence ;
- diff Seven Sieves : vide ;
- aucune dépendance installée ou mise à jour.

## 12. État MariaDB final

| Objet | Total final |
|---|---:|
| Langues | 12 |
| Langues `DOCUMENTED` | 5 |
| Langues `REFERENCED` | 7 |
| Langues actives | 5 |
| Entrées lexicales | 150 |
| Formes lexicales | 597 |
| Formes fléchies | 16 |
| Aides discursives | 12 |
| Relations | 70 |
| Règles | 1 |
| Traits IC | 8 |

Les dépendances des sept nouvelles langues sont toutes nulles : formes, formes fléchies, aides, règles, relations et traits IC.

## 13. Fichiers concernés

### Créés

- `prototypes/08-dico-seven-sieves/Node/scripts/manage-referenced-romance-languages.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/referenced-romance-languages.test.js` ;
- trois sauvegardes sous `reports/assets/193_dico_ic_referenced_romance_languages/development-before/` ;
- trois sauvegardes sous `reports/assets/193_dico_ic_referenced_romance_languages/rollback-test/` ;
- deux captures sous `reports/assets/193_dico_ic_referenced_romance_languages/` ;
- `reports/193_dico_ic_referenced_romance_languages_report.md`.

### Modifiés

- `prototypes/08-dico-seven-sieves/Node/src/repository.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-0.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-0.1.css` ;
- `prototypes/08-dico-seven-sieves/database/current_draft/20_seed_base.sql` ;
- `prototypes/08-dico-seven-sieves/database/current_draft/README.md`.

## 14. Périmètre préservé, processus et limites

Inchangés :

- données lexicales, relations, règles, aides discursives, formes fléchies et traits IC ;
- entrée `NUIT` ;
- vue et données `INFORMATION_DATA` ;
- Seven Sieves ;
- anciens dumps SQL ;
- `sp_upsert_language` ;
- Compose, launchers, migration portable et `AGENTS.md` ;
- contrat API et package Node.

Le processus temporaire de cette mission, PID 9736 sur le port 3193, a été arrêté et le port a été vérifié libre. Une tentative initiale sur 3100 a quitté immédiatement car ce port était déjà occupé. Deux serveurs Dico-IC préexistaient à la mission sur 3000 (processus géré par le launcher) et 3100 ; ils n’ont pas été lancés, modifiés ni arrêtés par cette mission afin de préserver l’état utilisateur préexistant. Ils ne constituent donc pas des processus laissés par l’implémentation, mais restent une limite factuelle à la formulation littérale « aucun serveur ».

Aucune base jetable ne subsiste. Les conteneurs MariaDB et phpMyAdmin préexistants n’ont pas été redémarrés ni arrêtés.

Aucun commit, push ou déploiement n’a été réalisé. Aucune validation humaine finale de David n’a encore eu lieu.

Message de commit proposé :

```text
feat(dico): référencer sept langues romanes au catalogue
```
