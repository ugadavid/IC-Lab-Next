# Dico-IC - Étude d'implémentation V0 : Connector Help

## Statut du document

Ce document prépare une implémentation future. Le SQL, les routes et les écrans décrits ci-dessous sont des propositions directement exploitables, mais rien n'est implémenté par cette étude.

Décision directrice : **Connector Help est un objet pédagogique réutilisable, distinct du lexique et des sept tamis**.

## 1. Positionnement conceptuel

### Définition

Connector Help associe une expression discursive validée à une fonction et à une aide de lecture :

```text
expression observée
↓
fonction discursive
↓
indice sur le raisonnement
↓
compréhension du passage
```

Exemple :

```text
sin embargo
↓
OPPOSITION
↓
L'auteur introduit probablement une idée qui contraste avec ce qui précède.
```

L'objet porte donc une connaissance interprétative destinée à un lecteur. Son intérêt n'est pas seulement de nommer ou traduire l'expression, mais d'expliquer comment elle organise le discours.

### Ce que Connector Help n'est pas

Connector Help n'est pas :

- une entrée lexicale canonique ;
- une relation de cognat ou d'équivalence entre deux formes ;
- une forme fléchie donnant accès à un lemme ;
- une règle de transformation graphique ;
- une analyse syntaxique complète ;
- une prédiction produite par IA ;
- une donnée d'activité ou de session apprenant.

### Objet lexical ou objet pédagogique ?

Connector Help doit être un **objet pédagogique**.

Une `lexical_entry` décrit un concept lexical mutualisé et ses lemmes. Connector Help décrit l'effet probable d'une expression sur la progression d'un texte. Cette différence devient décisive pour les expressions multi-mots comme `sin embargo`, `por tanto`, `parce que` et `de plus`, qui ne correspondent pas naturellement à une seule `lexical_form` du modèle actuel.

Un lien facultatif vers `lexical_entry` reste utile lorsqu'une entrée pertinente existe, par exemple pour `pero` ou `mais`. Ce lien facilite la navigation administrative ; il ne doit ni conditionner la détection, ni rendre obligatoire la création artificielle d'une entrée lexicale pour chaque locution.

### Position dans l'écosystème actuel

| Objet | Responsabilité | Relation avec Connector Help |
|---|---|---|
| `lexical_entry` / `lexical_form` | Connaissance lexicale canonique par langue | Lien optionnel de documentation, jamais source obligatoire de détection |
| `form_relation` | Relations IC entre formes lexicales | Aucune réutilisation : une fonction discursive n'est pas une relation entre lemmes |
| `inflected_form` | Surface fléchie validée vers un lemme | Aucun lien direct : les deux sont des voies d'accès différentes |
| `pattern_rule` | Correspondances ou transformations réutilisables | Aucune réutilisation : un connecteur n'est pas une transformation |
| `ic_feature` | Caractéristique IC attachée à une forme | Trop générique et limité aux formes simples pour porter le besoin |
| Futurs objets pédagogiques | Explications validées destinées au lecteur | Conventions communes possibles plus tard, sans super-table en V0 |

La V0 ne doit pas créer une table générique `pedagogical_object`. Les objets des tamis 4, 5, 6 et Connector Help n'ont pas encore assez de structure commune stabilisée. Ils peuvent néanmoins partager des conventions : `status`, `source_label`, `pedagogical_hint`, `caution`, timestamps et provenance API.

## 2. Périmètre V0

### Langues

- espagnol (`es`) ;
- français (`fr`).

Les deux langues doivent exister dans `language` et être actives. Les autres langues sont explicitement refusées par les endpoints d'écriture V0, même si la structure future reste compatible avec elles.

### Fonctions discursives

Codes techniques retenus :

| Code | Libellé français | Lecture proposée |
|---|---|---|
| `OPPOSITION` | Opposition | Une idée contrastée, contraire ou restrictive suit probablement. |
| `CAUSE` | Cause | Une raison ou une explication suit probablement. |
| `CONSEQUENCE` | Conséquence | Un résultat ou une déduction est probablement introduit. |
| `ADDITION` | Addition | Une information ou un argument supplémentaire est ajouté. |
| `CHRONOLOGY` | Chronologie | Une étape ou une succession temporelle est signalée. |

`CHRONOLOGY` est recommandé comme code canonique, conformément à l'étude d'architecture précédente. L'interface affiche « Chronologie ». Il ne faut pas conserver simultanément `CHRONOLOGY` et `CHRONOLOGIE` comme deux codes.

### Taille du catalogue

Un catalogue initial de **12 connecteurs**, six par langue, est suffisant :

| Langue | Expressions |
|---|---|
| ES | `sin embargo`, `pero`, `porque`, `por tanto`, `además`, `después` |
| FR | `cependant`, `mais`, `parce que`, `donc`, `de plus`, `ensuite` |

Ce volume couvre les cinq fonctions, permet de comparer mots simples et locutions, et reste entièrement relisible par un enseignant.

### Granularité

- une expression exacte ;
- une fonction prototypique ;
- un message pédagogique court ;
- un exemple ;
- une prudence ;
- un statut de validation.

La contrainte d'unicité autorise plusieurs fonctions pour une même expression à long terme, mais le catalogue V0 ne valide qu'une fonction prototypique par expression.

### Hors périmètre

- italien et portugais ;
- locutions discontinues ;
- variantes automatiques ;
- flexion ou lemmatisation des connecteurs ;
- polyfonctionnalité contextuelle ;
- analyse syntaxique ou discursive par NLP ;
- génération IA ;
- équivalences multilingues structurées ;
- adaptation au niveau de l'apprenant ;
- statistiques d'usage ;
- contribution depuis Seven Sieves ;
- état ou historique apprenant.

## 3. Modèle de données recommandé

### Objet `connector_help`

| Champ conceptuel | Obligatoire | Rôle |
|---|---:|---|
| `id` | oui | Identifiant interne stable |
| `language_id` | oui | Langue active de l'expression |
| `lexical_entry_id` | non | Lien documentaire facultatif vers le lexique |
| `expression` | oui | Expression canonique affichable, simple ou multi-mots |
| `normalized_expression` | oui | Expression NFC et en minuscules, accents conservés |
| `discourse_function` | oui | Un des cinq codes V0 |
| `pedagogical_title` | oui | Titre affichable, « Connecteur logique » par défaut |
| `pedagogical_hint` | oui | Aide orientée vers le raisonnement du lecteur |
| `example` | non | Exemple bref ou rapprochement utile |
| `caution` | non | Limite d'interprétation |
| `status` | oui | `PROPOSED`, `VALIDATED`, `REJECTED` ou `ARCHIVED` |
| `source_label` | non | Origine de la connaissance |
| `notes` | non | Notes internes non exposées dans `/analysis` |
| `created_at` | oui | Date de création |
| `updated_at` | oui | Date de dernière modification |

### Normalisation

`normalized_expression` doit utiliser la même normalisation de casse que les tokens de `/analysis` :

```text
NFC
→ minuscules
→ accents conservés
```

Il ne faut pas utiliser `lookup_key`, qui retire les diacritiques. La V0 exige une reconnaissance exacte : `además` ne doit pas devenir implicitement équivalent à `ademas`.

La colonne normalisée doit employer une collation binaire afin que MariaDB ne neutralise pas les accents pendant les comparaisons. L'API effectue la mise en minuscules avant écriture et avant comparaison.

### Statuts

- `PROPOSED` : visible dans l'admin, jamais utilisé par `/analysis` ;
- `VALIDATED` : utilisable par `/analysis` et lisible publiquement ;
- `REJECTED` : proposition refusée, conservée pour traçabilité ;
- `ARCHIVED` : ancien objet retiré de l'usage courant.

Seuls les objets `VALIDATED` alimentent Seven Sieves.

### Relation lexicale facultative

Le lien porte sur `lexical_entry`, pas sur `lexical_form` : l'aide décrit l'expression discursive dans une langue, alors qu'une entrée peut regrouper plusieurs formes. En cas de suppression de l'entrée, `ON DELETE SET NULL` conserve l'aide pédagogique.

La V0 ne tente pas de relier automatiquement les locutions à plusieurs formes lexicales.

## 4. Schéma SQL minimal proposé

### Table unique

Une seule table suffit en V0. Le catalogue des fonctions reste une constante validée dans le serveur et une contrainte SQL. Une table `discourse_function` ajouterait une administration et des jointures sans bénéfice pour cinq codes stables.

### DDL proposé

```sql
USE ic_dico;

CREATE TABLE IF NOT EXISTS connector_help (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    language_id             INT NOT NULL,
    lexical_entry_id        BIGINT NULL,
    expression              VARCHAR(255) NOT NULL,
    normalized_expression   VARCHAR(255)
                            CHARACTER SET utf8mb4
                            COLLATE utf8mb4_bin NOT NULL,
    discourse_function      VARCHAR(20) NOT NULL,
    pedagogical_title       VARCHAR(100) NOT NULL DEFAULT 'Connecteur logique',
    pedagogical_hint        TEXT NOT NULL,
    example                 TEXT NULL,
    caution                 TEXT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    source_label            VARCHAR(100) NULL,
    notes                   TEXT NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_connector_help_language
        FOREIGN KEY (language_id) REFERENCES language(id),

    CONSTRAINT fk_connector_help_lexical_entry
        FOREIGN KEY (lexical_entry_id) REFERENCES lexical_entry(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_connector_help_expression
        CHECK (CHAR_LENGTH(TRIM(expression)) > 0),

    CONSTRAINT chk_connector_help_normalized_expression
        CHECK (CHAR_LENGTH(TRIM(normalized_expression)) > 0),

    CONSTRAINT chk_connector_help_function
        CHECK (discourse_function IN (
            'OPPOSITION',
            'CAUSE',
            'CONSEQUENCE',
            'ADDITION',
            'CHRONOLOGY'
        )),

    CONSTRAINT chk_connector_help_hint
        CHECK (CHAR_LENGTH(TRIM(pedagogical_hint)) > 0),

    CONSTRAINT chk_connector_help_status
        CHECK (status IN ('PROPOSED', 'VALIDATED', 'REJECTED', 'ARCHIVED')),

    CONSTRAINT uq_connector_help_expression_function
        UNIQUE (language_id, normalized_expression, discourse_function),

    INDEX idx_connector_help_lookup
        (language_id, status, normalized_expression),

    INDEX idx_connector_help_function_status
        (discourse_function, status),

    INDEX idx_connector_help_lexical_entry
        (lexical_entry_id)
) ENGINE=InnoDB;
```

### Justification des clés et index

- la clé primaire numérique suit les autres objets du projet ;
- la clé étrangère `language_id` garantit une langue existante ; l'API ajoute la contrainte V0 « active et ES/FR » ;
- l'unicité empêche le doublon d'une même expression, langue et fonction ;
- l'index `lookup` sert au chargement des expressions validées d'une langue ;
- l'index fonction/statut sert aux filtres admin ;
- l'index lexical facilite la navigation depuis une entrée.

Une contrainte SQL ne peut pas garantir simplement « une seule fonction validée par expression » tout en préparant la polyfonctionnalité. Cette règle reste une validation applicative V0.

### Exemples d'INSERT

Ces exemples supposent des lignes `language` actives pour `es` et `fr`.

```sql
INSERT INTO connector_help (
    language_id,
    expression,
    normalized_expression,
    discourse_function,
    pedagogical_hint,
    example,
    caution,
    status,
    source_label
)
SELECT
    id,
    'sin embargo',
    'sin embargo',
    'OPPOSITION',
    'L''auteur introduit probablement une idée qui contraste avec ce qui précède.',
    'sin embargo / cependant',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED',
    'connector_help_v0_seed'
FROM language WHERE code = 'es';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'porque', 'porque', 'CAUSE',
    'La proposition qui suit donne probablement une raison ou une explication.',
    'porque / parce que',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'es';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'por tanto', 'por tanto', 'CONSEQUENCE',
    'L''auteur présente probablement un résultat ou une déduction.',
    'por tanto / donc',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'es';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'además', 'además', 'ADDITION',
    'L''auteur ajoute probablement une information ou un argument.',
    'además / de plus',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'es';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'después', 'después', 'CHRONOLOGY',
    'L''auteur signale probablement une étape qui vient après la précédente.',
    'después / ensuite',
    'La relation temporelle exacte dépend du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'es';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'cependant', 'cependant', 'OPPOSITION',
    'L''auteur introduit probablement une idée qui contraste avec ce qui précède.',
    'cependant / sin embargo',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'fr';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'parce que', 'parce que', 'CAUSE',
    'La proposition qui suit donne probablement une raison ou une explication.',
    'parce que / porque',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'fr';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'donc', 'donc', 'CONSEQUENCE',
    'L''auteur présente probablement un résultat ou une déduction.',
    'donc / por tanto',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'fr';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'de plus', 'de plus', 'ADDITION',
    'L''auteur ajoute probablement une information ou un argument.',
    'de plus / además',
    'La fonction exacte peut dépendre du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'fr';

INSERT INTO connector_help (
    language_id, expression, normalized_expression, discourse_function,
    pedagogical_hint, example, caution, status, source_label
)
SELECT
    id, 'ensuite', 'ensuite', 'CHRONOLOGY',
    'L''auteur signale probablement une étape qui vient après la précédente.',
    'ensuite / después',
    'La relation temporelle exacte dépend du contexte.',
    'VALIDATED', 'connector_help_v0_seed'
FROM language WHERE code = 'fr';
```

`pero` et `mais` complètent le catalogue recommandé de 12 lignes avec la fonction `OPPOSITION`. Le futur script de seed devra être idempotent et ne pas masquer silencieusement les erreurs de validation.

## 5. API REST

### Convention de routes

L'API actuelle expose `/languages`, `/analysis` et `/admin/...` sans préfixe `/api`. Il est recommandé de conserver cette convention pour Connector Help plutôt que d'introduire un préfixe isolé.

Les routes de lecture publique ne remplacent pas `/analysis`. Seven Sieves continue d'envoyer un texte à `/analysis`, qui traite le catalogue par lot.

### Routes publiques

#### `GET /connector-helps`

Liste uniquement les objets `VALIDATED`.

Paramètres :

| Paramètre | Défaut | Règle |
|---|---:|---|
| `language` | vide | `es` ou `fr` |
| `function` | vide | un code V0 |
| `search` | vide | 100 caractères maximum |
| `limit` | `30` | de 1 à 100 |
| `offset` | `0` | entier positif ou nul |

Réponse `200` :

```json
{
  "contract_version": "0.1",
  "items": [
    {
      "id": 1,
      "language": { "code": "es", "name": "Espagnol" },
      "expression": "sin embargo",
      "discourse_function": "OPPOSITION",
      "pedagogical_title": "Connecteur logique",
      "pedagogical_hint": "L'auteur introduit probablement une idée qui contraste avec ce qui précède.",
      "example": "sin embargo / cependant",
      "caution": "La fonction exacte peut dépendre du contexte.",
      "source_label": "connector_help_v0_seed"
    }
  ],
  "total": 1,
  "limit": 30,
  "offset": 0
}
```

#### `GET /connector-help/lookup`

Recherche exacte utile au diagnostic ou à un autre client léger. La route doit être déclarée avant `/:id`.

```text
GET /connector-help/lookup?language=es&expression=sin%20embargo
```

Réponse `200` :

```json
{
  "contract_version": "0.1",
  "language": "es",
  "expression": "sin embargo",
  "items": [
    {
      "id": 1,
      "discourse_function": "OPPOSITION",
      "pedagogical_hint": "L'auteur introduit probablement une idée qui contraste avec ce qui précède.",
      "example": "sin embargo / cependant",
      "caution": "La fonction exacte peut dépendre du contexte."
    }
  ]
}
```

Une absence de correspondance renvoie `200` avec `items: []`. Ce n'est pas une erreur.

#### `GET /connector-help/:id`

Renvoie un objet `VALIDATED`. Un identifiant absent, rejeté ou archivé renvoie `404` afin de ne pas exposer le contenu de travail public.

### Routes d'administration

| Méthode et route | Rôle |
|---|---|
| `GET /admin/connector-helps` | Liste paginée, tous statuts, filtres langue/fonction/statut/recherche |
| `GET /admin/connector-help-functions` | Catalogue fermé des cinq fonctions avec libellés, descriptions et compteurs |
| `GET /admin/connector-help/:id` | Détail complet, y compris notes et lien lexical |
| `POST /admin/connector-help` | Création transactionnelle |
| `PUT /admin/connector-help/:id` | Modification complète transactionnelle |
| `DELETE /admin/connector-help/:id` | Suppression logique : passage à `ARCHIVED` |

Corps de création ou modification :

```json
{
  "language": "es",
  "lexical_entry_key": null,
  "expression": "sin embargo",
  "discourse_function": "OPPOSITION",
  "pedagogical_title": "Connecteur logique",
  "pedagogical_hint": "L'auteur introduit probablement une idée qui contraste avec ce qui précède.",
  "example": "sin embargo / cependant",
  "caution": "La fonction exacte peut dépendre du contexte.",
  "status": "VALIDATED",
  "source_label": "manual_admin_v0",
  "notes": "Emploi prototypique retenu pour la V0."
}
```

Réponse de création `201` :

```json
{
  "contract_version": "0.1",
  "message": "Aide discursive « sin embargo » créée.",
  "connector_help": {
    "id": 1,
    "language": "es",
    "expression": "sin embargo",
    "normalized_expression": "sin embargo",
    "discourse_function": "OPPOSITION",
    "status": "VALIDATED"
  }
}
```

Réponse de suppression logique `200` :

```json
{
  "contract_version": "0.1",
  "message": "Aide discursive archivée.",
  "connector_help": { "id": 1, "status": "ARCHIVED" }
}
```

### Validation d'écriture

- `Content-Type: application/json` obligatoire ;
- langue active et limitée à `es` ou `fr` ;
- expression non vide, 255 caractères maximum ;
- expression sans espace initial/final et espaces internes normalisés ;
- fonction appartenant au catalogue V0 ;
- titre non vide, 100 caractères maximum ;
- aide pédagogique non vide ;
- statut autorisé ;
- `lexical_entry_key` existante lorsqu'elle est fournie ;
- doublon langue/expression normalisée/fonction refusé ;
- seconde fonction `VALIDATED` pour la même expression refusée en V0 ;
- `normalized_expression` toujours recalculée côté API, jamais acceptée depuis le client.

### Erreurs

Le format reprend `errorResponse` :

```json
{
  "contract_version": "0.1",
  "error": {
    "code": "DUPLICATE_CONNECTOR_HELP",
    "message": "Cette expression possède déjà cette fonction dans cette langue.",
    "field": "expression"
  }
}
```

| HTTP | Code proposé | Situation |
|---:|---|---|
| 400 | `INVALID_CONNECTOR_HELP` | Corps ou champ invalide |
| 400 | `INVALID_DISCOURSE_FUNCTION` | Fonction hors catalogue |
| 400 | `INVALID_CONNECTOR_HELP_STATUS` | Statut invalide |
| 404 | `CONNECTOR_HELP_NOT_FOUND` | Identifiant inexistant |
| 404 | `LEXICAL_ENTRY_NOT_FOUND` | Lien lexical demandé absent |
| 409 | `DUPLICATE_CONNECTOR_HELP` | Collision d'unicité |
| 409 | `CONNECTOR_HELP_FUNCTION_CONFLICT` | Autre fonction déjà validée pour l'expression en V0 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Corps non JSON |
| 422 | `UNSUPPORTED_CONNECTOR_LANGUAGE` | Langue existante mais hors ES/FR ou inactive |

## 6. Intégration dans `/analysis`

### Chargement des ressources

Connector Help est évalué automatiquement par `/analysis` lorsque la langue source vaut `es` ou `fr`. Aucun numéro de tamis ni nouveau paramètre de requête n'est ajouté en V0. Pour une autre langue, `pedagogical_enrichments` reste vide. Cette décision garde la requête `0.1` compatible et laisse chaque client libre d'afficher ou d'ignorer les aides reçues.

`repository.loadAnalysisResources` doit charger en une seule requête toutes les aides `VALIDATED` de la langue source :

```sql
SELECT
    ch.id,
    l.code AS language_code,
    ch.expression,
    ch.normalized_expression,
    ch.discourse_function,
    ch.pedagogical_title,
    ch.pedagogical_hint,
    ch.example,
    ch.caution,
    ch.source_label
FROM connector_help ch
JOIN language l ON l.id = ch.language_id
WHERE l.code = ?
  AND l.is_active = 1
  AND ch.status = 'VALIDATED'
ORDER BY CHAR_LENGTH(ch.normalized_expression) DESC, ch.id ASC;
```

Le catalogue V0 est minuscule. Le charger entièrement par requête est plus simple et plus fiable qu'effectuer un lookup SQL par token.

### Algorithme exact V0

1. Tokeniser le texte avec la fonction actuelle, qui conserve les offsets UTF-16.
2. Tokeniser chaque expression du catalogue avec la même fonction.
3. Utiliser `token.normalized` pour comparer : NFC, minuscules, accents conservés.
4. Trier les expressions par nombre de tokens décroissant, puis longueur décroissante.
5. Parcourir les tokens de type `word`.
6. Comparer les mots attendus à partir de chaque position.
7. Pour une locution, vérifier que le texte entre deux tokens ne contient que des espaces ou retours à la ligne.
8. Refuser une ponctuation interne : `sin, embargo` ne correspond pas à `sin embargo`.
9. Accepter la ponctuation avant ou après la séquence.
10. Conserver la correspondance la plus longue lorsqu'elles se chevauchent.
11. Produire un enrichissement par occurrence, sans écriture en base.

Exemples :

| Texte | Résultat |
|---|---|
| `Sin embargo, continúa.` | correspondance `sin embargo` |
| `SIN EMBARGO` | correspondance `sin embargo` |
| `sin, embargo` | aucune correspondance |
| `además` | correspondance |
| `ademas` | aucune correspondance en V0 |
| `porque` | correspondance |
| `por tanto` | correspondance multi-token |

### Portée multi-token

Les enrichissements actuels sont attachés à un token et exigent un `sieve_id`. Connector Help est indépendant et peut couvrir plusieurs tokens. Il ne faut donc ni le dupliquer artificiellement sur chaque token, ni inventer un tamis 8.

La réponse `/analysis` devrait recevoir un tableau top-level additif :

```json
{
  "contract_version": "0.1",
  "status": "complete",
  "text": "Sin embargo, los resultados fueron modestos.",
  "languages": {
    "source": "es",
    "mediation": "fr",
    "comparison": ["it", "pt"]
  },
  "sieves": [],
  "tokens": [],
  "pedagogical_enrichments": [
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
  ],
  "warnings": []
}
```

Règles du nouveau tableau :

- `expression` conserve la casse et les accents du texte observé ;
- `start` et `end` utilisent les mêmes unités UTF-16 que les tokens ;
- `token_indexes` contient tous les tokens de la séquence ;
- `source.id` référence la connaissance persistée ;
- `notes` et `status` ne sont pas exposés ;
- seuls les objets validés sont produits ;
- le tableau vaut `[]` en l'absence de correspondance.

L'ajout d'un champ top-level optionnel est compatible avec les clients `0.1` qui ignorent les champs inconnus. Le contrat doit néanmoins être documenté avant activation. Un changement ultérieur qui rendrait ce champ obligatoire ou modifierait les tokens nécessiterait une nouvelle version.

### Conséquences pour Seven Sieves

Seven Sieves :

- lit `pedagogical_enrichments` après reconstruction des tokens ;
- applique la surbrillance aux `token_indexes` ;
- rend directement les textes reçus ;
- conserve son contrôle « Aide discursive expérimentale » séparé des tamis ;
- ne détecte plus localement les expressions après migration ;
- ne contacte ni l'admin, ni MariaDB.

Le backend reste stateless : il lit, analyse et répond sans enregistrer le texte ni les occurrences.

## 7. Administration

### Position dans l'admin actuelle

Ajouter une section de premier niveau **Aides discursives** dans `admin/index-admin-0.1.html`, selon les mêmes composants simples que le lexique, les relations et les formes fléchies. Aucun framework ni nouvelle application n'est nécessaire.

### Liste des connecteurs

La liste doit afficher :

- expression ;
- langue ;
- fonction ;
- statut ;
- extrait de l'aide ;
- source ;
- date de modification ;
- lien lexical éventuel ;
- actions Modifier et Archiver.

Filtres : recherche, langue, fonction et statut. Pagination : `limit`, `offset`, `total`, suivant/précédent, sur le modèle du lexique.

### Création et modification

Formulaire minimal :

- langue : sélecteur limité à ES/FR actives ;
- expression ;
- fonction : sélecteur fermé ;
- titre pédagogique ;
- aide pédagogique ;
- exemple ;
- prudence ;
- statut ;
- source ;
- lien lexical facultatif via la recherche de formes/entrées existante ;
- notes internes.

L'interface ne présente jamais `normalized_expression`, calculée par l'API.

La modification recharge l'objet complet et envoie un `PUT`. Un message clair distingue succès, collision et conflit de fonction.

La création et la modification utilisent une transaction courte : verrouillage ou vérification de la langue, résolution du lien lexical facultatif, contrôle des conflits actifs, écriture, relecture de la ligne, puis commit. Toute collision ou référence invalide provoque un rollback complet.

### Suppression

La suppression V0 est logique : le bouton **Archiver** demande confirmation puis passe l'objet à `ARCHIVED`. Aucune suppression physique n'est proposée. Cette décision protège les références de provenance et rend un retour arrière possible.

### Catalogue des fonctions discursives

Un panneau de référence en lecture seule présente les cinq fonctions, leurs libellés, leur description et le nombre d'objets associés. Il est alimenté par une constante serveur partagée avec la validation.

La V0 ne permet pas de créer ou renommer des fonctions. Une administration des fonctions nécessiterait une table dédiée et relève d'une V1 seulement si les enseignants ont besoin de faire évoluer la taxonomie.

### Validation humaine

Le workflow reste :

```text
création PROPOSED
↓
relecture humaine
↓
passage à VALIDATED
↓
utilisation par /analysis
```

Aucune IA n'est nécessaire pour cette V0.

## 8. Migration depuis le prototype

### Étape 1 - Figer le catalogue de référence

- comparer le catalogue JavaScript aux 12 lignes proposées ;
- faire relire fonctions, messages, exemples et prudences ;
- décider explicitement quels objets démarrent en `VALIDATED`.

### Étape 2 - Ajouter le support SQL

- créer un nouveau script de brouillon, par exemple `database/current_draft/60_connector_help.sql` ;
- créer la table et les index ;
- ajouter un seed séparé et idempotent ;
- vérifier MariaDB/utf8mb4 et les accents.

### Étape 3 - Ajouter repository et validations

- lecture paginée admin ;
- CRUD transactionnel ;
- chargement par langue pour l'analyse ;
- normalisation centralisée ;
- tests des doublons, statuts et langues.

### Étape 4 - Ajouter les endpoints REST et l'admin

- exposer les lectures publiques ;
- exposer le CRUD admin ;
- ajouter la section Aides discursives ;
- conserver la validation humaine.

### Étape 5 - Étendre `/analysis`

- documenter `pedagogical_enrichments` ;
- implémenter le matching exact ;
- tester mots simples, locutions, casse, accents, ponctuation et offsets ;
- vérifier que les sept tamis restent inchangés.

### Étape 6 - Migrer Seven Sieves

- consommer le tableau API dans la variante pédagogique ;
- comparer les résultats API et catalogue local sur le corpus V0 ;
- tester l'affichage multi-token ;
- retirer le catalogue local seulement après parité ;
- garder temporairement un mode de démonstration mock, sans double détection.

### Étape 7 - Valider puis promouvoir

- test enseignant ;
- test de non-régression ;
- mise à jour du contrat, des rapports et de l'index documentaire ;
- promotion prudente de la variante vers la page live.

### Risques de migration

| Risque | Réponse V0 |
|---|---|
| Double infobulle | Une seule source active : local avant migration, API après parité |
| Décalage d'offsets | Réutiliser strictement les offsets UTF-16 de la tokenisation API |
| Locution partiellement surlignée | Retourner tous les `token_indexes` et les offsets de portée |
| Accent neutralisé par MariaDB | Normalisation NFC et collation binaire |
| Fonction trop affirmative | Message probabiliste et prudence obligatoires |
| Catalogue divergent | Seed relu et source unique Dico-IC |
| Régression des tamis | Nouveau tableau top-level, aucun changement des enrichissements existants |
| Suppression accidentelle | Archivage logique uniquement |

## 9. Compatibilité avec les tamis

### Tamis 4

Le tamis 4 aide à reconnaître une forme grâce à une correspondance grapho-phonétique. Connector Help explique la fonction discursive d'une expression. Les deux aides peuvent coexister mais ne partagent ni objet ni déclencheur.

### Tamis 5

Le tamis 5 est le voisin conceptuel le plus proche, car il aide à reconstruire l'organisation d'un énoncé. Toutefois, opposition, cause et conséquence décrivent une relation discursive qui peut relier des propositions ou des paragraphes. Les encoder comme `syntax_role` réduirait leur portée.

### Tamis 6

Le tamis 6 explique une forme grammaticale validée ou probable. Connector Help n'analyse ni nombre, ni genre, ni accord. Il partage seulement le principe pédagogique « une connaissance explicite produit une explication explicite ».

### Décision recommandée

Connector Help reste indépendant :

- pas de `sieve_id` ;
- pas de tamis 8 ;
- pas de rattachement technique au tamis 5 ;
- contrôle séparé dans Seven Sieves ;
- tableau d'enrichissements pédagogiques distinct dans `/analysis`.

Cette décision préserve la lisibilité des sept tamis historiques et prépare une famille future d'aides transversales.

## 10. Tests à prévoir lors de l'implémentation

### SQL et repository

- création et lecture UTF-8 de `además`, `después` et `conséquence` ;
- unicité langue/expression/fonction ;
- lien lexical facultatif ;
- archivage ;
- pagination et filtres ;
- chargement des seuls objets validés et actifs.

### Validation API

- langue ES et FR acceptée ;
- langue inactive ou autre refusée ;
- fonction invalide refusée ;
- expression et aide vides refusées ;
- collision renvoyée en `409` ;
- normalisation recalculée ;
- identifiant absent renvoyé en `404`.

### `/analysis`

- `sin embargo`, `por tanto` et `parce que` reconnus sur deux tokens ;
- `pero`, `porque`, `además`, `mais`, `donc` et `ensuite` reconnus sur un token ;
- casse ignorée ;
- accents conservés ;
- ponctuation externe acceptée ;
- ponctuation interne refusée ;
- priorité à la locution la plus longue ;
- offsets UTF-16 exacts ;
- absence de résultat pour `PROPOSED`, `REJECTED` et `ARCHIVED` ;
- aucun changement des enrichissements des tamis 1 à 7 ;
- aucune écriture SQL pendant l'analyse.

### Frontend

- surbrillance de toute la locution ;
- infobulle identique sur chaque token de la portée ou sur le groupe visuel ;
- activation indépendante ;
- coexistence avec tamis 4 et 6 ;
- absence de double résultat après retrait du catalogue local.

## 11. Recommandation finale

### Architecture

Créer une table `connector_help` dédiée, liée obligatoirement à `language` et facultativement à `lexical_entry`. Garder la taxonomie des cinq fonctions dans les validations SQL et serveur. Exposer les objets validés à `/analysis` sous forme d'enrichissements pédagogiques multi-token indépendants des tamis.

### Complexité estimée

Complexité globale : **moyenne**.

| Lot | Complexité |
|---|---|
| Table, seed et repository | Faible à moyenne |
| CRUD REST et admin | Moyenne, patterns déjà présents |
| Matching exact dans `/analysis` | Faible |
| Portée multi-token dans le contrat et Seven Sieves | Moyenne, principal point nouveau |
| Validation pédagogique | Indispensable, hors complexité technique |

À titre indicatif, l'implémentation et les tests représentent environ quatre à sept jours de développement concentré, hors délai de validation par les enseignants.

### Bénéfices attendus

- rendre visible la structure du raisonnement ;
- dépasser la traduction mot à mot ;
- fournir une aide courte, explicable et traçable ;
- mutualiser le catalogue entre Seven Sieves et de futurs clients ;
- conserver Seven Sieves comme client léger et Dico-IC comme source de connaissance.

### Ordre conseillé

1. validation pédagogique des 12 objets ;
2. table et seed ;
3. repository et tests ;
4. contrat `pedagogical_enrichments` et `/analysis` ;
5. consommation par la variante Seven Sieves ;
6. CRUD admin ;
7. retrait du catalogue local ;
8. validation enseignante et promotion éventuelle.

Le CRUD admin peut suivre la première intégration de lecture si le seed validé suffit à démontrer le parcours complet. Il ne faut cependant pas retirer le catalogue local avant que l'API officielle produise une réponse strictement équivalente.

## Conclusion

Connector Help mérite une intégration officielle, mais pas une absorption dans le lexique ou dans un tamis existant. La V0 recommandée reste petite : une table, cinq fonctions, douze expressions, une reconnaissance exacte et un rendu multi-token.

Le choix déterminant est la séparation des responsabilités :

```text
Dico-IC stocke et valide l'aide
↓
/analysis détecte une occurrence sans la persister
↓
Seven Sieves explique la structure du discours
```

Cette architecture conserve la simplicité du projet tout en ouvrant une voie cohérente vers d'autres objets pédagogiques transversaux.
