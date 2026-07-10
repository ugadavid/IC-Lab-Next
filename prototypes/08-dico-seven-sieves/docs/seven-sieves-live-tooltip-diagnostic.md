# Diagnostic Seven Sieves live - info-bulle du tamis 1

## Conclusion courte

`prototypes/01-seven-sieves/index-api-live-0.1.html` est bien la version Seven Sieves la plus récente et la plus complète actuellement présente dans le projet pour l’intégration à Dico-IC.

L’absence d’info-bulle du tamis 1 sur `internacional` n’est pas un défaut d’affichage. L’API ne renvoie aucun enrichissement de tamis 1 pour ce token. La base contient sa famille lexicale multilingue, mais aucune relation explicite de cognat vers la forme française. Le moteur la classe donc au tamis 2, pas au tamis 1.

## Fichiers inspectés

- `prototypes/01-seven-sieves/index-0.0.8.2.html`
- `prototypes/01-seven-sieves/index-api-mock-0.1.html`
- `prototypes/01-seven-sieves/index-api-live-0.1.html`
- `prototypes/01-seven-sieves/js/seven-sieves-api-live-v0.js`
- `prototypes/01-seven-sieves/mock/seven-sieves-mock-v0.js`
- `prototypes/01-seven-sieves/mock/analysis-response-v0.json`
- `Node/src/analysis.js`
- `Node/src/repository.js`
- `database/current_draft/40_seed_api_mock_support.sql`

La base MariaDB courante a également été interrogée en lecture seule pour `organizacion` et `internacional`.

## Page live identifiée

Trois pages Seven Sieves existent :

| Page | Alimentation | État constaté |
|---|---|---|
| `index-0.0.8.2.html` | données historiques codées dans le prototype | ancienne démonstration |
| `index-api-mock-0.1.html` | `mock/analysis-response-v0.json` | intégration JSON locale |
| `index-api-live-0.1.html` | `POST http://localhost:3000/analysis`, avec fallback mock | version live la plus complète |

Seule `index-api-live-0.1.html`, via `js/seven-sieves-api-live-v0.js`, effectue un vrai `POST /analysis`. Elle ajoute le texte modifiable, les langues, l’état de l’API, les compteurs, les warnings et le fallback. Elle est aussi le fichier HTML Seven Sieves le plus récemment modifié dans le dossier.

## Test API réalisé

Requête réduite au cas étudié :

```json
{
  "contract_version": "0.1",
  "text": "organización internacional",
  "source_language": "es",
  "mediation_language": "fr",
  "comparison_languages": ["it", "pt"],
  "sieves": [1, 2, 3, 4, 5, 6, 7]
}
```

Résultat synthétique :

| Token | Enrichissements renvoyés |
|---|---|
| `organización` | tamis 1 `lexical_transparency`, tamis 3 `form_correspondence`, tamis 7 `affix_signal` |
| `internacional` | tamis 2 `pan_romance_family`, tamis 4 `grapho_phonetic_signal` |

Le test de la page live complète a donné 103 tokens, 132 enrichissements et 3 avertissements. L’origine affichée était bien `API Dico-IC`, et non le fallback mock.

## `organización`

### Données présentes

La base contient l’entrée `ORGANIZATION_ENTITY` avec :

- espagnol : `organización`, normalisé `organizacion` ;
- français : `organisation`, normalisé `organisation`.

Elle contient aussi une `form_relation` symétrique :

```text
organisation (fr) ↔ organización (es)
relation_type = COGNATE_STRONG
score = 0.940
source_label = api_mock_support_v0
```

Une règle `pattern_rule` distincte décrit également `-ción → -tion` de l’espagnol vers le français.

### Source exacte de l’info-bulle

L’info-bulle du tamis 1 provient exclusivement de l’enrichissement API `lexical_transparency`. Le moteur le crée parce qu’il trouve une `form_relation` dont le type commence par `COGNATE`, reliée à la langue de médiation française.

Le payload renvoyé est `organización → organisation`. La règle `-ción → -tion` n’est pas la source de cette info-bulle : elle alimente séparément les tamis 3 et 7.

## `internacional`

### Données présentes

La base contient l’entrée `INTERNATIONAL` avec quatre formes :

- espagnol : `internacional` ;
- français : `international` ;
- italien : `internazionale` ;
- portugais : `internacional`.

Cette entrée est donc suffisamment renseignée pour le tamis 2. L’API renvoie effectivement une `pan_romance_family` avec les quatre formes.

En revanche, aucune `form_relation` ne relie actuellement `internacional` à `international`, et aucune règle de correspondance applicable ne crée un résultat de tamis 1.

### Raison exacte de l’absence d’info-bulle

Dans le moteur V0, le tamis 1 ne déduit pas qu’un mot est « international » à partir de son orthographe ni du nombre de formes dans une même `lexical_entry`. Il exige une relation explicite `COGNATE_*` vers une forme de la langue de médiation.

`internacional` est donc reconnu par la base, mais sous la connaissance structurée du tamis 2. Il ne satisfait pas la condition actuelle du tamis 1.

## Rôle du frontend

Le frontend live ne possède plus d’heuristique propre pour fabriquer les info-bulles. Pour le tamis actif, `getTokenEnrichments()` filtre simplement `token.enrichments` sur `sieve_id`. Au survol, l’info-bulle n’est remplie que si ce tableau filtré n’est pas vide.

Le test visuel confirme :

- inspection de `organización`, tamis 1 : « Mot transparent ou quasi transparent », `organización → organisation` ;
- inspection de `internacional`, tamis 1 : « Aucun enrichissement reçu pour ce tamis » ;
- vue multi-tamis de `internacional` : tamis 2 et tamis 4 présents.

Le frontend et le mapping des identifiants de tamis se comportent donc comme prévu.

## Fallback mock

Le mock contient un enrichissement de tamis 1 pour `organización`. Il ne contient aucun enrichissement pour `internacional`. Le fallback produit donc la même absence au tamis 1, même si la réponse live actuelle est plus riche pour `internacional` grâce à la base et à l’heuristique du tamis 4.

## Diagnostic

| Niveau | Diagnostic |
|---|---|
| Page live | correcte et confirmée |
| Frontend | pas en cause ; rendu strict des enrichissements reçus |
| Mapping des tamis | cohérent |
| Moteur | comportement conforme à sa règle V0 : tamis 1 fondé sur `form_relation` |
| Base courante | famille `INTERNATIONAL` présente, relation de cognat es-fr absente |

La cause immédiate est donc une donnée relationnelle manquante au regard du contrat actuel du moteur, et non une entrée lexicale entièrement absente.

## Correction minimale recommandée

Ajouter ultérieurement une seule relation symétrique `COGNATE_STRONG` entre :

```text
internacional (es) ↔ international (fr)
```

avec un score, une confiance et une provenance explicitement choisis. Cette correction relève du contenu de `form_relation`; elle ne demande ni nouvelle table, ni modification du schéma, du frontend ou de `POST /analysis`.

Comme l’admin V0 crée actuellement des entrées et des formes mais pas leurs relations, cet ajout devrait passer soit par un petit seed expérimental dédié et idempotent, soit par une future fonction admin de gestion des relations. Aucun ajout n’a été effectué pendant ce diagnostic.

Une autre option serait de faire dériver le tamis 1 automatiquement des familles multilingues. Ce serait toutefois une modification de la sémantique du moteur, plus large et moins prudente que l’ajout de la relation manquante.

## Observation secondaire

La réponse live du tamis 3 applique actuellement la substitution mécanique `organización → organization` et la marque comme non confirmée, alors que le tamis 1 utilise correctement la forme lexicale française `organisation`. Cette divergence est distincte du problème d’info-bulle du tamis 1 et n’a pas été corrigée ici.
