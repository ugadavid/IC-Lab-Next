# Implémentation de `POST /analysis` V0

## Statut

Cette implémentation est une première API réelle, minimale et exploratoire. Elle respecte `contract_version: "0.1"`, ne persiste aucune donnée et conserve Seven Sieves Explorer comme premier client.

## Stack retenue

Le projet possédait déjà un backend dans `Node/` avec Express, CORS, `mysql2`, un serveur sur le port 3000 et une connexion à `ic_dico`. Cette stack a été conservée. Aucune dépendance supplémentaire ni framework n’a été introduit.

La configuration MariaDB utilise les variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` et `DB_NAME`, avec les valeurs locales du projet comme défauts. `PORT` permet de changer le port HTTP, dont la valeur par défaut reste `3000`.

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `Node/src/repository.js` | pool MariaDB et lectures SQL par lots |
| `Node/src/analysis.js` | validation, tokenisation, normalisation et génération des enrichissements |
| `Node/test/analysis.test.js` | tests des offsets UTF-16, de la validation et des sept types d’enrichissement |
| `docs/post-analysis-api-implementation-report-v0.md` | présent rapport |

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `Node/server.js` | ajout de `GET /languages`, `POST /analysis`, gestion JSON/erreurs et branchement du moteur ; l’ancien endpoint `/cognates/:word` est conservé |
| `Node/package.json` | scripts `start` et `test` |

Le mock `prototypes/01-seven-sieves/mock/analysis-response-v0.json`, le schéma SQL et les seeds ne sont pas modifiés.

## Endpoints

### `GET /languages`

Retourne les langues actives de la table `language`, avec leur code, nom, famille et indicateurs disponibles.

### `POST /analysis`

Le corps suit le contrat V0 : version, texte, langue source, langue de médiation, langues de comparaison et liste des tamis. La limite actuelle est de 20 000 unités de code UTF-16. Les erreurs de version, texte, langue, doublon de langue de comparaison et identifiant de tamis produisent une erreur HTTP structurée.

Le serveur ne sauvegarde ni la requête, ni les tokens, ni la réponse.

## Traitement réalisé

1. Le texte est tokenisé avec une expression Unicode en mots et ponctuation.
2. `start` et `end` utilisent directement les index JavaScript, donc des offsets UTF-16.
3. `normalized` est la forme NFC en minuscules destinée au client.
4. Une clé interne `lookup_key` est obtenue par décomposition Unicode et suppression des diacritiques. Elle n’est pas exposée dans la réponse.
5. Les formes de la langue source sont lues en une requête à partir de toutes les clés distinctes.
6. Les entrées et formes apparentées dans les langues demandées sont lues par lots.
7. Les relations touchant les formes reconnues et les règles applicables aux langues demandées sont lues par lots.
8. Les enrichissements sont calculés en mémoire puis attachés aux occurrences.

## Couverture des tamis

| Tamis | Source V0 | Type produit |
|---:|---|---|
| 1 | `form_relation`, relation cognate vers la langue de médiation | `lexical_transparency` |
| 2 | formes partageant une `lexical_entry` dans au moins trois langues demandées | `pan_romance_family` |
| 3 | `pattern_rule` de type `SUFFIX_TRANSFORM`, avec contrôle d’une forme apparentée quand elle existe | `form_correspondence` |
| 4 | heuristique espagnole `c` devant `e` ou `i` | `grapho_phonetic_signal` |
| 5 | `lexical_form.part_of_speech = verb` | `syntax_role` |
| 6 | POS verbal et finale espagnole `-ar`, `-er` ou `-ir` | `morphosyntactic_signal` |
| 7 | suffixe reconnu par une `pattern_rule` | `affix_signal` |

Les tamis 4, 5 et 6 portent le statut `experimental` et produisent chacun un warning lorsqu’ils sont demandés. Le tamis 5 ne réalise pas d’analyse syntaxique contextuelle : il signale seulement un verbe probable à partir du POS lexical.

## Requêtes SQL

L’API effectue uniquement des `SELECT` : langues actives, formes source par `normalized_lemma`, formes apparentées par `entry_id`, relations par identifiants de formes, puis règles par paire de langues. Les listes utilisent des paramètres préparés ; aucun texte reçu n’est concaténé dans le SQL.

## Exécution locale

Depuis `Node/` :

```text
npm start
```

L’API écoute alors `http://localhost:3000`. Seven Sieves peut appeler `http://localhost:3000/analysis` avec `fetch` ; CORS est activé pour cette V0 locale.

## Limites

- La qualité dépend directement des formes et relations chargées dans la base réellement exécutée.
- La tokenisation ne traite pas encore les abréviations, nombres structurés et frontières linguistiques complexes.
- Une entrée partagée est utilisée comme indice de famille lexicale ; elle ne remplace pas une validation linguistique.
- Les règles sont limitées à `SUFFIX_TRANSFORM` et appliquées comme suffixes littéraux.
- Les textes multilingues, locutions et analyses syntaxiques contextuelles ne sont pas couverts.
- CORS est volontairement permissif pour le développement local ; un déploiement devra restreindre les origines.
- L’ancien endpoint `/cognates/:word` dépend toujours de la procédure exploratoire `get_all_relations` et reste hors du contrat V0.

## Vérification

Les tests automatisés contrôlent notamment un caractère représenté par deux unités UTF-16, la suppression des diacritiques dans `lookup_key`, l’absence de cette clé interne dans la réponse et la génération des sept types d’enrichissement.

Un contrôle d’intégration en lecture seule a aussi été exécuté avec le texte complet du mock et le conteneur MariaDB local :

- `GET /languages` : HTTP 200, langues `en`, `es`, `fr`, `it`, `pt` ;
- `POST /analysis` : HTTP 200 et `contract_version: "0.1"` ;
- 103 tokens, ponctuation comprise ;
- invariant des offsets UTF-16 valide pour tous les tokens ;
- les sept types attendus sont présents dans la réponse ;
- trois warnings `SIEVE_EXPERIMENTAL` signalent les tamis 4, 5 et 6.

Aucune écriture SQL n’a été effectuée pendant cette vérification.
