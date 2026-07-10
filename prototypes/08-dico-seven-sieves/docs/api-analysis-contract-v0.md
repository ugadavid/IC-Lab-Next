# Contrat JSON V0 pour `POST /analysis`

## Statut du contrat

Ce document définit le contrat exploratoire V0 entre l'API Dico-IC et Seven Sieves Explorer.

Il vise une intégration directe avec une page HTML/JavaScript statique utilisant `fetch`. Il ne définit aucune sauvegarde d'activité, annotation persistante, session apprenant ou contribution au dictionnaire.

La V0 est **stateless** : chaque requête contient tout ce qui est nécessaire à l'analyse et chaque réponse constitue un paquet autonome.

Le contrat est identifié par :

```text
contract_version = "0.1"
```

Cette version est provisoire. Une modification incompatible devra changer la valeur de `contract_version`.

## 1. Vue d'ensemble

```text
Seven Sieves Explorer
    POST /analysis
    texte + langues + tamis
            ↓
        Dico-IC API
            ↓
    JSON : tamis + tokens + enrichments + warnings
```

L'API :

- reçoit le texte brut ;
- segmente et normalise les occurrences ;
- interroge les ressources mutualisées ;
- applique les règles disponibles ;
- associe les résultats aux sept tamis ;
- renvoie un paquet directement affichable.

Elle n'enregistre pas le texte ni le résultat de l'analyse.

## 2. Transport HTTP

### Requête

```http
POST /analysis
Content-Type: application/json; charset=utf-8
Accept: application/json
```

### Réponse réussie

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
```

Une réponse peut être partielle et conserver le statut HTTP `200` si certains tamis sont expérimentaux ou non pris en charge. Ces limites sont alors décrites dans `sieves` et `warnings`.

### Compatibilité avec une page statique

L'API doit autoriser par CORS l'origine depuis laquelle Seven Sieves Explorer est servi. La V0 ne dépend pas de cookies, de session serveur ni d'un framework JavaScript.

Pour un usage normal, il est préférable de servir la page statique par HTTP. Une page ouverte directement en `file://` peut produire une origine `null`, dont l'autorisation doit rester limitée au développement local.

## 3. Requête `POST /analysis`

### Structure

```json
{
  "contract_version": "0.1",
  "text": "La organización internacional promueve la educación científica.",
  "source_language": "es",
  "mediation_language": "fr",
  "comparison_languages": ["it", "pt"],
  "sieves": [1, 2, 3, 4, 5, 6, 7]
}
```

### Champs

| Champ | Type | Obligatoire | Règle V0 |
|---|---|---:|---|
| `contract_version` | chaîne | oui | Doit valoir `0.1` |
| `text` | chaîne | oui | Texte UTF-8 non vide à analyser |
| `source_language` | chaîne | oui | Code présent dans `language.code` |
| `mediation_language` | chaîne | oui | Langue principale de comparaison et d'explication |
| `comparison_languages` | tableau de chaînes | non | Défaut : tableau vide |
| `sieves` | tableau d'entiers | non | Défaut : les sept tamis `[1,2,3,4,5,6,7]` |

### Règles de validation

- Les codes de langue utilisent la casse enregistrée par l'API, normalement des codes minuscules comme `es`, `fr`, `it` ou `pt`.
- `comparison_languages` ne doit pas contenir de doublons.
- Une langue source répétée dans `comparison_languages` est ignorée et produit éventuellement un warning.
- `sieves` ne peut contenir que les entiers `1` à `7`.
- Un tableau `sieves` vide est valide et produit une tokenisation sans enrichissement ; ce cas est surtout utile au diagnostic.
- La longueur maximale de `text` reste une limite d'implémentation à documenter par l'API.
- Aucun identifiant d'activité, d'enseignant ou d'apprenant n'est accepté en V0.

### Choix sur le format de `sieves`

Le contrat formel utilise toujours un tableau. La valeur textuelle `"all"`, évoquée dans le document de workflow, n'est pas conservée afin d'éviter un champ pouvant changer de type. L'omission du champ signifie déjà « tous les tamis ».

## 4. Réponse globale

### Structure

```json
{
  "contract_version": "0.1",
  "status": "partial",
  "text": "La organización internacional promueve la educación científica.",
  "languages": {
    "source": "es",
    "mediation": "fr",
    "comparison": ["it", "pt"]
  },
  "sieves": [],
  "tokens": [],
  "pedagogical_enrichments": [],
  "warnings": []
}
```

### Champs

| Champ | Type | Description |
|---|---|---|
| `contract_version` | chaîne | Version du contrat utilisée pour construire la réponse |
| `status` | chaîne | `complete` ou `partial` |
| `text` | chaîne | Copie exacte du texte reçu |
| `languages` | objet | Langues effectivement utilisées après normalisation de la requête |
| `sieves` | tableau | État et métadonnées des tamis demandés |
| `tokens` | tableau | Tokens ordonnés avec leurs enrichissements |
| `pedagogical_enrichments` | tableau | Aides pédagogiques transversales portant sur un ou plusieurs tokens |
| `warnings` | tableau | Limites non bloquantes rencontrées pendant l'analyse |

`status = complete` signifie que tous les tamis demandés ont pu être traités selon leur niveau de couverture déclaré. Cela ne signifie pas que chaque mot possède un enrichissement ni que l'analyse est linguistiquement exhaustive.

`status = partial` signifie qu'au moins une partie demandée n'a pas pu être traitée normalement. Un warning doit en préciser la raison.

## 5. Format des langues

```json
{
  "source": "es",
  "mediation": "fr",
  "comparison": ["it", "pt"]
}
```

Les codes correspondent à `language.code`. Le tableau `comparison` est dédupliqué et conserve, si possible, l'ordre demandé par le client.

## 6. Format des tamis

Chaque tamis demandé possède une entrée, même lorsqu'aucun enrichissement n'est trouvé.

```json
{
  "id": 3,
  "code": "phonetic_correspondences",
  "label": "Correspondances phonétiques",
  "description": "Repère des correspondances régulières entre formes.",
  "status": "experimental",
  "result_count": 4
}
```

### Champs

| Champ | Type | Description |
|---|---|---|
| `id` | entier | Numéro stable de `1` à `7` |
| `code` | chaîne | Identifiant technique stable |
| `label` | chaîne | Libellé affichable dans la langue de médiation si disponible |
| `description` | chaîne | Description pédagogique courte |
| `status` | chaîne | `available`, `experimental` ou `unsupported` |
| `result_count` | entier | Nombre d'enrichissements de ce tamis dans `tokens` |

### Catalogue V0

| ID | Code stable | Libellé actuel |
|---:|---|---|
| 1 | `international_lexicon` | Lexique international |
| 2 | `pan_romance_lexicon` | Lexique pan-roman |
| 3 | `phonetic_correspondences` | Correspondances phonétiques |
| 4 | `graphy_pronunciation` | Graphies / prononciations |
| 5 | `pan_romance_syntax` | Syntaxe pan-romane |
| 6 | `morphosyntax` | Morphosyntaxe |
| 7 | `affixes` | Préfixes / suffixes |

Le statut décrit la maturité du traitement pour la requête courante :

- `available` : le traitement est disponible ;
- `experimental` : le traitement produit des résultats, avec prudence ;
- `unsupported` : aucun traitement fiable n'est disponible pour cette combinaison de langues ou cette version.

Un tamis `unsupported` doit avoir `result_count: 0`.

## 7. Format des tokens

### Structure

```json
{
  "index": 1,
  "kind": "word",
  "surface": "organización",
  "normalized": "organización",
  "start": 3,
  "end": 15,
  "enrichments": []
}
```

### Champs

| Champ | Type | Description |
|---|---|---|
| `index` | entier | Index zéro-based dans le tableau `tokens` |
| `kind` | chaîne | `word` ou `punctuation` en V0 |
| `surface` | chaîne | Sous-chaîne exacte du texte source |
| `normalized` | chaîne | Forme normalisée ; chaîne vide possible pour la ponctuation |
| `start` | entier | Offset inclusif de début |
| `end` | entier | Offset exclusif de fin |
| `enrichments` | tableau | Résultats associés à cette occurrence |

### Convention d'offsets

Pour être directement compatible avec JavaScript, `start` et `end` sont exprimés en **unités de code UTF-16**, comme les index utilisés par `String.prototype.slice`.

L'invariant attendu est :

```javascript
response.text.slice(token.start, token.end) === token.surface
```

Cette convention doit être testée avec les caractères accentués et les caractères représentés par deux unités UTF-16.

### Ordre et reconstruction

- Les tokens sont triés par `start` croissant.
- Ils ne se chevauchent pas.
- Les espaces et retours à la ligne ne sont pas nécessairement des tokens.
- Seven Sieves reconstruit fidèlement le texte en insérant les portions situées entre `end` et le `start` suivant.
- Les tokens de ponctuation peuvent être rendus sans interaction linguistique.
- Un token sans résultat possède `enrichments: []`.

La tokenisation est produite par l'API afin que le client et le serveur partagent exactement les mêmes occurrences.

## 8. Format commun des enrichments

Chaque enrichissement possède un socle commun et un `payload` spécialisé.

```json
{
  "id": "e-0007",
  "sieve_id": 2,
  "type": "pan_romance_family",
  "label": "Parenté lexicale romane",
  "explanation": "Des formes proches sont observables dans plusieurs langues romanes.",
  "caution": "La parenté ne garantit pas une équivalence exacte dans tous les contextes.",
  "confidence": 0.82,
  "level": "strong",
  "source": {
    "kind": "form_relation",
    "id": 42,
    "label": "Dico-IC"
  },
  "payload": {}
}
```

### Champs communs

| Champ | Type | Obligatoire | Description |
|---|---|---:|---|
| `id` | chaîne | oui | Identifiant unique dans cette réponse seulement |
| `sieve_id` | entier | oui | Tamis de `1` à `7` |
| `type` | chaîne | oui | Type technique de l'enrichissement |
| `label` | chaîne | oui | Résumé court affichable |
| `explanation` | chaîne | oui | Explication pédagogique |
| `caution` | chaîne | non | Limite ou formulation de prudence |
| `confidence` | nombre | non | Valeur comprise entre `0` et `1` |
| `level` | chaîne | non | `strong`, `partial` ou `informational` |
| `source` | objet | oui | Provenance de l'enrichissement |
| `payload` | objet | oui | Données propres au type |

### Identifiant local

`id` n'est pas un identifiant persistant. Il permet uniquement au JavaScript de référencer un enrichissement pendant le rendu de la réponse courante.

### Confiance et niveau

`confidence` exprime la confiance disponible dans l'annotation ou la règle. Elle ne constitue pas une note pour l'apprenant.

`level` aide Seven Sieves à reproduire les distinctions visuelles actuelles entre correspondance forte, partielle ou simple information. Il peut être omis si cette distinction n'est pas pertinente.

### Provenance

```json
{
  "kind": "pattern_rule",
  "id": 12,
  "label": "Dico-IC"
}
```

Valeurs initiales de `source.kind` :

- `lexical_form`
- `form_relation`
- `ic_feature`
- `pattern_rule`
- `inflected_form`
- `connector_help`
- `heuristic`

`source.id` est présent lorsqu'une ligne correspondante existe dans Dico-IC. Il est absent pour une heuristique en mémoire. Seven Sieves ne doit pas dépendre de cet identifiant pour afficher le résultat.

### Extensibilité

Le client doit ignorer les champs inconnus. Si un `type` d'enrichissement n'est pas encore reconnu, il peut afficher au minimum `label`, `explanation` et `caution`.

## 8 bis. Enrichissements pédagogiques transversaux

Les objets de `pedagogical_enrichments` ne sont pas rattachés à un tamis. Ils peuvent porter sur plusieurs tokens et ne possèdent donc pas de `sieve_id`.

### Connector Help V0

```json
{
  "id": "p-0001",
  "type": "connector_help",
  "label": "Connecteur logique",
  "language": "es",
  "function": "OPPOSITION",
  "expression": "Sin embargo",
  "token_indexes": [0, 1],
  "start": 0,
  "end": 11,
  "pedagogical_hint": "L'auteur introduit probablement une idée qui contraste avec ce qui précède.",
  "example": "sin embargo / cependant",
  "caution": "La fonction exacte peut dépendre du contexte.",
  "source": {
    "kind": "connector_help",
    "id": 1,
    "label": "Dico-IC"
  }
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---:|---|
| `id` | chaîne | oui | Identifiant local à la réponse |
| `type` | chaîne | oui | `connector_help` en V0 |
| `label` | chaîne | oui | Titre pédagogique affichable |
| `language` | chaîne | oui | Langue source de l'expression |
| `function` | chaîne | oui | `OPPOSITION`, `CAUSE`, `CONSEQUENCE`, `ADDITION` ou `CHRONOLOGY` |
| `expression` | chaîne | oui | Surface exacte observée dans le texte |
| `token_indexes` | tableau d'entiers | oui | Tous les tokens couverts par l'expression |
| `start` | entier | oui | Début de la portée en unités UTF-16 |
| `end` | entier | oui | Fin exclusive de la portée en unités UTF-16 |
| `pedagogical_hint` | chaîne | oui | Aide à la compréhension du raisonnement |
| `example` | chaîne ou `null` | non | Exemple ou rapprochement interlinguistique |
| `caution` | chaîne ou `null` | non | Limite d'interprétation |
| `source` | objet | oui | Provenance persistée dans Dico-IC |

Règles V0 :

- reconnaissance exacte, insensible à la casse et sensible aux accents ;
- ponctuation admise avant ou après, mais pas entre les mots d'une locution ;
- seuls les objets `connector_help` au statut `VALIDATED` sont utilisés ;
- une occurrence multi-token produit un seul enrichissement ;
- Seven Sieves utilise `token_indexes`, `start` et `end` sans recalcul linguistique ;
- l'absence de résultat est représentée par `pedagogical_enrichments: []`.

L'ajout de ce tableau reste compatible avec `contract_version = 0.1` : il est additif et les anciens clients peuvent l'ignorer.

## 9. Exemples pour les sept tamis

Les exemples suivants sont illustratifs. Ils définissent la forme des objets, pas la disponibilité actuelle des données.

### Tamis 1 : lexique international

Type : `lexical_transparency`

```json
{
  "id": "e-0001",
  "sieve_id": 1,
  "type": "lexical_transparency",
  "label": "Mot transparent ou quasi transparent",
  "explanation": "La forme espagnole est proche d'une forme reconnaissable en français.",
  "caution": "Cette ressemblance est un indice et non une traduction automatique.",
  "confidence": 0.9,
  "level": "strong",
  "source": {
    "kind": "form_relation",
    "id": 42,
    "label": "Dico-IC"
  },
  "payload": {
    "source_form": "organización",
    "mediation_form": "organisation",
    "mediation_language": "fr",
    "relation_type": "COGNATE_STRONG"
  }
}
```

### Tamis 2 : lexique pan-roman

Type : `pan_romance_family`

```json
{
  "id": "e-0002",
  "sieve_id": 2,
  "type": "pan_romance_family",
  "label": "Parenté lexicale romane",
  "explanation": "Le noyau lexical reste visible dans plusieurs langues.",
  "caution": "Les formes proches peuvent avoir des usages partiellement différents.",
  "confidence": 0.82,
  "level": "strong",
  "source": {
    "kind": "form_relation",
    "id": 51,
    "label": "Dico-IC"
  },
  "payload": {
    "family_label": "comprendre / comprendere / compreender",
    "forms": [
      { "language": "es", "form": "comprender" },
      { "language": "fr", "form": "comprendre" },
      { "language": "it", "form": "comprendere" },
      { "language": "pt", "form": "compreender" }
    ]
  }
}
```

`family_label` reste facultatif et expérimental. Les formes structurées dans `forms` constituent la donnée principale.

### Tamis 3 : correspondances phonétiques

Type : `form_correspondence`

```json
{
  "id": "e-0003",
  "sieve_id": 3,
  "type": "form_correspondence",
  "label": "Correspondance -ción → -tion",
  "explanation": "Cette finale fournit une piste fréquente entre l'espagnol et le français.",
  "caution": "La transformation ne garantit pas à elle seule le sens du mot.",
  "confidence": 0.86,
  "level": "strong",
  "source": {
    "kind": "pattern_rule",
    "id": 12,
    "label": "Dico-IC"
  },
  "payload": {
    "original": "organización",
    "transformed": "organization",
    "source_pattern": "ción",
    "target_pattern": "tion",
    "source_language": "es",
    "target_language": "fr"
  }
}
```

La forme `transformed` est une piste graphique calculée. Elle ne doit pas être présentée comme un lemme français attesté sans confirmation lexicale.

### Tamis 4 : graphies et prononciations

Type : `grapho_phonetic_signal`

```json
{
  "id": "e-0004",
  "sieve_id": 4,
  "type": "grapho_phonetic_signal",
  "label": "ñ proche de gn",
  "explanation": "La lettre ñ peut rappeler le groupe français gn dans certaines familles de mots.",
  "caution": "Cette observation ne suffit pas à traduire le mot.",
  "confidence": 0.7,
  "level": "informational",
  "source": {
    "kind": "heuristic",
    "label": "Règle expérimentale V0"
  },
  "payload": {
    "pattern": "ñ",
    "scope": "contains",
    "comparison_hint": "gn"
  }
}
```

### Tamis 5 : syntaxe pan-romane

Type : `syntax_role`

```json
{
  "id": "e-0005",
  "sieve_id": 5,
  "type": "syntax_role",
  "label": "Verbe probable",
  "explanation": "Cette occurrence semble porter le noyau de l'action ou du procès.",
  "caution": "Il s'agit d'une lecture syntaxique simplifiée et contextuelle.",
  "confidence": 0.62,
  "level": "informational",
  "source": {
    "kind": "heuristic",
    "label": "Analyse syntaxique expérimentale"
  },
  "payload": {
    "role": "verb",
    "pattern": "subject_verb_complement"
  }
}
```

Valeurs initiales de `payload.role` : `subject`, `verb`, `complement`.

### Tamis 6 : morphosyntaxe

Type : `morphosyntactic_signal`

Lorsqu’une forme de surface est résolue par un mapping `inflected_form` validé et pluriel, l’API peut produire l’enrichissement attesté suivant :

```json
{
  "id": "e-0006",
  "sieve_id": 6,
  "type": "morphosyntactic_signal",
  "label": "Pluriel validé",
  "explanation": "Cette forme est le pluriel validé de « organización » dans Dico-IC.",
  "caution": "Cette information provient d’un mapping validé dans Dico-IC.",
  "confidence": 1,
  "level": "strong",
  "source": {
    "kind": "inflected_form",
    "id": 1,
    "label": "Dico-IC"
  },
  "payload": {
    "category": "validated_plural",
    "grammatical_number": "PLURAL",
    "lemma": "organización",
    "surface_form": "organizaciones"
  }
}
```

Cette V0 est limitée aux noms dont le mapping est `VALIDATED`. Elle ne déduit aucun pluriel par terminaison et ne couvre pas encore les adjectifs.

Le signal heuristique d’infinitif reste également possible :

```json
{
  "id": "e-0006",
  "sieve_id": 6,
  "type": "morphosyntactic_signal",
  "label": "Infinitif probable",
  "explanation": "La finale -er peut signaler un infinitif espagnol.",
  "caution": "Le rôle exact doit être vérifié dans la phrase.",
  "confidence": 0.78,
  "level": "informational",
  "source": {
    "kind": "heuristic",
    "label": "Signal morphosyntaxique V0"
  },
  "payload": {
    "category": "probable_infinitive",
    "marker": "-er",
    "part_of_speech": "VERB"
  }
}
```

### Tamis 7 : préfixes et suffixes

Type : `affix_signal`

```json
{
  "id": "e-0007",
  "sieve_id": 7,
  "type": "affix_signal",
  "label": "Suffixe -ción repéré",
  "explanation": "La finale peut aider à reconnaître une famille de mots.",
  "caution": "Un suffixe isolé ne détermine pas le sens complet.",
  "confidence": 0.85,
  "level": "informational",
  "source": {
    "kind": "pattern_rule",
    "id": 12,
    "label": "Dico-IC"
  },
  "payload": {
    "affix_type": "suffix",
    "affix": "ción",
    "language": "es"
  }
}
```

Valeurs initiales de `payload.affix_type` : `prefix` ou `suffix`.

## 10. Format des warnings

Les warnings signalent une limite non bloquante. Ils ne remplacent pas les erreurs HTTP.

```json
{
  "code": "SIEVE_UNSUPPORTED",
  "severity": "warning",
  "scope": "sieve",
  "message": "Le tamis 5 n'est pas pris en charge pour cette combinaison de langues.",
  "sieve_id": 5
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|---|---|---:|---|
| `code` | chaîne | oui | Code technique stable |
| `severity` | chaîne | oui | `info` ou `warning` |
| `scope` | chaîne | oui | `analysis`, `sieve` ou `token` |
| `message` | chaîne | oui | Message affichable ou journalisable |
| `sieve_id` | entier | selon portée | Tamis concerné |
| `token_index` | entier | selon portée | Token concerné |
| `details` | objet | non | Informations techniques additionnelles |

### Codes initiaux proposés

| Code | Usage |
|---|---|
| `SIEVE_EXPERIMENTAL` | Résultats disponibles mais traitement exploratoire |
| `SIEVE_UNSUPPORTED` | Tamis indisponible pour la requête |
| `LANGUAGE_NOT_COVERED` | Couverture linguistique absente ou faible |
| `COMPARISON_LANGUAGE_IGNORED` | Langue de comparaison dupliquée ou invalide |
| `PARTIAL_LEXICAL_COVERAGE` | Peu de formes reconnues dans le texte |
| `RULE_APPLICATION_LIMITED` | Certaines règles ne sont pas exécutables avec le modèle actuel |
| `TEXT_TRUNCATED` | Texte tronqué selon une limite annoncée |

`TEXT_TRUNCATED` ne doit être utilisé que si cette politique est explicitement acceptée. Une erreur `413` est préférable à une troncature silencieuse.

## 11. Erreurs bloquantes

Une erreur de requête ne renvoie pas le paquet normal.

```json
{
  "contract_version": "0.1",
  "error": {
    "code": "INVALID_LANGUAGE",
    "message": "La langue source demandée n'est pas disponible.",
    "field": "source_language"
  }
}
```

Statuts HTTP recommandés :

- `400` : JSON ou champ invalide ;
- `413` : texte trop long ;
- `415` : type de contenu différent de JSON ;
- `422` : paramètres formellement valides mais non traitables ;
- `500` : erreur interne non prévue.

Seven Sieves doit afficher un message simple et conserver le texte saisi afin que l'enseignant puisse corriger ou relancer.

## 12. Correspondance avec le modèle SQL actuel

| Élément du contrat | Source potentielle actuelle |
|---|---|
| Codes et propriétés des langues | `language` |
| Formes comparées | `lexical_form` |
| Cognats, faux amis, équivalences | `form_relation` |
| Confiance ou traits d'une forme | `ic_feature` et `lexical_form.confidence_score` |
| Correspondances et affixes | `pattern_rule` |
| Aides discursives validées | `connector_help` |
| Provenance textuelle | `source_label`, `notes`, `description` |

Les éléments suivants sont calculés en mémoire et ne nécessitent pas de table en V0 :

- tokens ;
- offsets ;
- identifiants locaux d'enrichissement ;
- regroupement par tamis ;
- warnings ;
- statut global de la réponse.

Le schéma ne représente pas encore précisément toutes les heuristiques des tamis 4, 5 et 6. Le contrat autorise donc `source.kind = heuristic` et un statut de tamis `experimental`, sans prétendre que ces résultats sont déjà persistés dans Dico-IC.

## 13. Ce qui reste côté Seven Sieves Explorer

Seven Sieves conserve :

- la zone de collage et l'import local du fichier texte ;
- les sélecteurs de langue ;
- l'activation ou la désactivation visuelle des tamis ;
- l'URL de base de l'API ;
- l'appel `fetch`, l'indicateur de chargement et la gestion des erreurs réseau ;
- la reconstruction sûre du texte à partir des offsets ;
- le rendu des surlignages, légendes, infobulles et panneaux ;
- l'activation visuelle des aides discursives reçues dans `pedagogical_enrichments` ;
- les micro-guides et textes génériques d'interface ;
- le tamis actif ;
- le mot inspecté ;
- les sélections ;
- les statuts locaux `compris`, `doute`, `inconnu` ;
- les compteurs, feedbacks de session et la réinitialisation.

La page ne doit pas :

- interroger la base directement ;
- recalculer les règles linguistiques reçues ;
- redétecter localement les connecteurs déjà fournis par Dico-IC ;
- appeler l'API une fois par mot ;
- persister automatiquement le texte ou les statuts apprenants ;
- exiger une validation des enrichissements avant affichage.

Pour la sécurité du rendu, les chaînes renvoyées par l'API doivent être insérées avec `textContent` ou échappées avant toute utilisation dans `innerHTML`.

## 14. Règles de compatibilité client

Le JavaScript de Seven Sieves doit :

1. vérifier `contract_version` ;
2. conserver et afficher le texte même si `tokens` est vide ;
3. ignorer les champs JSON inconnus ;
4. tolérer un type d'enrichissement inconnu en affichant ses champs communs ;
5. tolérer un tamis `unsupported` ;
6. ne jamais interpréter `confidence` comme une note apprenant ;
7. reconstruire le texte avec les offsets plutôt qu'avec un simple découpage sur les espaces ;
8. conserver tout état apprenant uniquement en mémoire locale.

## 15. Critères d'acceptation du contrat V0

Le contrat est utilisable si :

- une page HTML/JS sans compilation peut envoyer la requête avec `fetch` ;
- un seul appel analyse tout le texte ;
- le texte original peut être reconstruit exactement ;
- chaque occurrence peut porter zéro ou plusieurs enrichissements ;
- les sept tamis ont un identifiant et un état explicites ;
- les résultats expérimentaux sont signalés ;
- une couverture partielle n'empêche pas l'affichage ;
- aucune donnée n'est sauvegardée par l'appel ;
- les interactions apprenantes restent entièrement côté Seven Sieves.

## Conclusion

Le contrat V0 réduit l'intégration à un échange unique et stateless : Seven Sieves envoie un texte et ses langues, puis reçoit un paquet JSON positionné, explicable et directement affichable.

Le socle commun des enrichissements reste volontairement petit. Les sept tamis utilisent des `payload` spécialisés sans imposer une modélisation SQL prématurée. Ce contrat doit maintenant être confronté à une première implémentation légère avant d'être considéré comme stable.
