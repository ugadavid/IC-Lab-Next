# Mission 217 — Capacité `connector_help` pour les cinq langues documentées

Date : 19 août 2026  
Projet : `prototypes/08-dico-seven-sieves`  
Base observée : `ic_dico`

## 1. Résultat

Le sous-système des aides à la lecture accepte désormais toute langue qui est à la fois présente dans `language`, active et `DOCUMENTED`. Cette règle est dérivée du modèle courant et partagée par la validation administrative, les routes, le dépôt MariaDB et l’analyse ; aucune liste d’autorisation ES/FR ou FR/ES/IT/PT/EN n’est utilisée.

Dans l’état réel de la base, cette règle ouvre FR, ES, IT, PT et EN. Les quatre premières sont présentées comme langues romanes documentées. EN est présenté explicitement comme `Langue de comparaison — non romane`.

IT, PT et EN sont correctement utilisables mais restent volontairement vides : aucune aide n’a été ajoutée avant la Mission 218. CA, GL, OC, RO, CO, SC et RM restent `REFERENCED`, inactives et non analysables.

## 2. État initial contrôlé

- Git : HEAD `d01852f`, dépôt propre au début de mission.
- Mission 216 : rapport et quatre artefacts de référence présents et lus.
- Services : Dico-IC, MariaDB et phpMyAdmin observés actifs ; le serveur Dico était servi sur le port 3000.
- Versions : administration `0.1.7`, contrat API `0.1`, package Node `1.0.0`, Seven Sieves enseignant `0.1.2`, Seven Sieves apprenant `0.1.3`.
- Catalogue : cinq langues actives `DOCUMENTED`, sept langues romanes inactives `REFERENCED`.
- Aides : 12 lignes, exclusivement FR (6) et ES (6), toutes `VALIDATED`.

### Empreintes initiales

Méthode : `SELECT * ORDER BY id`, sérialisation JSON déterministe par le client MariaDB du projet, puis SHA-256.

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

## 3. Restrictions retirées et règle partagée

Un module de capacité centralise le prédicat suivant :

1. la langue existe ;
2. `is_active` vaut vrai ;
3. `documentation_status` vaut exactement `DOCUMENTED`.

Ce prédicat remplace les restrictions ES/FR dans :

- la validation d’une aide créée ou modifiée ;
- le garde-fou transactionnel du dépôt avant écriture ;
- les filtres publics et administratifs ;
- la consultation exacte d’une aide ;
- le chargement des ressources d’analyse ;
- la construction des enrichissements pédagogiques.

Le dépôt continue de renforcer les lectures publiques et l’analyse par les conditions SQL `is_active = 1`, `documentation_status = 'DOCUMENTED'` et `status = 'VALIDATED'`. Une ligne `PROPOSED` ne peut donc pas être exposée dans l’analyse publique.

La nouvelle route additive `GET /connector-help-languages` expose les langues réellement utilisables et leur classification publique. Les routes existantes ne sont ni renommées ni modifiées de manière incompatible.

## 4. Administration

Les deux sélecteurs de la section « Aides discursives » sont alimentés dynamiquement par la nouvelle route, puis regroupés en :

- `Langues romanes documentées` ;
- `Langue de comparaison — non romane`.

Les codes restent visibles après le nom de langue. L’anglais n’est pas présenté comme une cinquième langue romane. L’interface ne contient plus d’options ES/FR statiques pour ce sous-système.

## 5. Fichiers concernés

Créés :

- `prototypes/08-dico-seven-sieves/Node/src/connector-help-capability.js` ;
- `reports/217_dico_ic_five_language_connector_help_capability_report.md`.

Modifiés :

- `prototypes/08-dico-seven-sieves/Node/server.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/admin.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/analysis.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/repository.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/analysis.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/connector-help.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/referenced-romance-languages.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/semantic-domain-normalization.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-0.1.js` ;
- `prototypes/08-dico-seven-sieves/docs/api-analysis-contract-v0.md`.

Aucun fichier Seven Sieves, seed SQL, fixture de données ou heuristique de tamis n’a été modifié.

## 6. Tests permanents

Les tests couvrent notamment :

- dérivation de la capacité depuis `is_active` et `documentation_status` ;
- acceptation de FR, ES, IT, PT et EN par les routes publiques, l’administration, la consultation exacte et l’analyse ;
- acceptation transactionnelle d’une future aide italienne par le dépôt ;
- rejet d’une langue inactive `REFERENCED` jusque dans le garde-fou du dépôt ;
- rejet des sept codes référencés et d’un code inconnu par requête forgée ;
- réponse vide normale pour IT/PT/EN ;
- absence de restriction linguistique dans le moteur lorsqu’une aide future est fournie ;
- maintien du cas multi-token `Sin embargo`, de ses offsets UTF-16 et de ses indexes de tokens ;
- filtrage SQL des aides publiques sur `VALIDATED`, langue active et `DOCUMENTED` ;
- absence de champs de travail dans la réponse publique ;
- classification non romane de EN et groupes dynamiques de l’administration ;
- invariants de seed et absence de catalogue local dans Seven Sieves.

Résultats :

- tests ciblés `connector-help` finaux : 18/18 réussis ;
- campagne ciblée analyse, connecteurs, fichiers statiques et langues référencées : 42/42 réussis ;
- suite Node complète finale : 239/239 réussis, code de sortie 0 ;
- syntaxe Node/JavaScript : réussie pour le serveur, le dépôt, l’analyse, l’administration, le nouveau module et le script d’interface ;
- `git diff --check` : réussi ; seuls les avertissements locaux de conversion LF/CRLF de Git ont été observés.

## 7. Recette HTTP réelle

Instance contrôlée : `http://127.0.0.1:3000`, contrat `0.1`.

### Catalogue et listes

- `/connector-help-languages` : ES, FR, IT et PT classés langues romanes documentées ; EN classé `Langue de comparaison — non romane`.
- listes publique et administrative : FR 6, ES 6, IT 0, PT 0, EN 0.
- consultations exactes IT, PT et EN : HTTP 200, zéro résultat.
- filtre public forgé CA ou `xx` : HTTP 400, `INVALID_CONNECTOR_LANGUAGE`.

### Analyses exactes demandées

| Langue | Résultat |
|---|---|
| ES — `Sin embargo, la información circula durante la noche.` | accepté ; une aide `Sin embargo`, tokens `[0,1]`, offsets `[0,11)`, sans `sieve_id` |
| FR — `Cependant, nous continuons parce que les indices sont utiles.` | accepté ; deux aides : `Cependant` et `parce que` |
| IT — `Tuttavia, le informazioni continuano a circolare.` | accepté ; zéro aide |
| PT — `No entanto, a informação continua a circular.` | accepté ; zéro aide |
| EN — `However, the information continues to circulate.` | accepté ; zéro aide |

CA, GL, OC, RO, CO, SC, RM et `xx` ont chacun été refusés avec HTTP 400 et `INVALID_LANGUAGE` avant chargement des ressources d’analyse.

L’absence d’aide IT/PT/EN est donc un résultat métier vide, pas une panne.

## 8. Vérification d’interface et limite

Les surfaces réelles ont été servies avec HTTP 200. Le HTML indique la version `0.1.8`, le script chargé contient la source dynamique `/connector-help-languages` et les deux groupes attendus, et aucun marqueur de mojibake n’a été détecté dans la page servie.

La connexion au navigateur intégré a échoué au niveau de l’infrastructure avant l’ouverture de la page. Aucune capture visuelle fiable n’a donc été produite et l’absence de débordement ou d’erreur console n’est pas affirmée. Une validation humaine simple de David reste à effectuer pour le rendu des groupes, la distinction visuelle de EN et la largeur disponible. Les contrôles HTTP et statiques ne valent pas cette validation humaine.

## 9. Versions et contrats

- Dico-IC Admin : `0.1.7` → `0.1.8`, car sa liste de langues et son libellé ont changé.
- Contrat global d’analyse : reste `0.1`, l’évolution étant additive et compatible.
- Package Node : reste `1.0.0`, convention actuelle inchangée.
- Seven Sieves enseignant : reste `0.1.2`.
- Seven Sieves apprenant : reste `0.1.3`.

Seven Sieves n’a pas été incrémenté puisqu’aucun de ses fichiers n’a changé.

## 10. Intégrité MariaDB finale

Les huit volumes et les huit empreintes finales sont strictement identiques aux valeurs initiales du tableau de la section 2.

En particulier :

- `connector_help` : toujours 12 lignes et empreinte identique ;
- FR : 6 aides ; ES : 6 aides ; IT/PT/EN : 0 aide ;
- `form_relation` : toujours 86 lignes et empreinte identique ;
- CA, GL, OC, RO, CO, SC et RM : toujours `REFERENCED`, inactives et sans aide ;
- aucune insertion, mise à jour, suppression ou promotion de statut ;
- aucun appel OpenAI.

## 11. Services gérés

Le processus Dico ancien utilisant le port 3000 a été identifié par son PID, sa commande Node et son marqueur IC-Lab-Next avant arrêt ciblé. Une première tentative manuelle s’est arrêtée lorsque le dispositif racine a repris le port. Le serveur authentifié PID 40756 a ensuite été arrêté, l’état courant lancé en PID 60752, puis redémarré après le dernier ajustement en PID 8668. La recette finale porte sur ce dernier processus.

MariaDB et phpMyAdmin ont été préservés. Aucun autre processus n’a été arrêté.

## 12. État de clôture et suite

- Aucun commit, push ou déploiement effectué.
- Aucun fichier temporaire ou fixture résiduelle créé.
- Les seuls changements Git sont ceux de la mission et le présent rapport.
- La Mission 218 pourra alimenter IT/PT/EN sans nouvelle modification de la règle de capacité.

Message de commit proposé :

```text
feat(dico-ic): open connector help to documented active languages (mission 217)
```
