# Dico-IC Admin - extensions manuelles V0

## Objectif

Cette extension rend l’administration manuelle plus utile sans modifier le modèle SQL : consultation paginée du lexique, correction transactionnelle d’une entrée existante et création contrôlée de relations entre formes.

Le périmètre reste local et simple. `POST /analysis`, Seven Sieves, les scripts SQL et les pages IA ne sont pas modifiés.

## Fichiers créés

- `Node/test/admin-manual-routes.test.js`
- `docs/dico-admin-manual-v0-extensions-report.md`

## Fichiers modifiés

- `admin/index-admin-0.1.html`
- `admin/css/admin-0.1.css`
- `admin/js/admin-0.1.js`
- `Node/server.js`
- `Node/src/admin.js`
- `Node/src/repository.js`
- `Node/test/admin.test.js`

## Endpoints ajoutés ou modifiés

### `GET /admin/lexical-entries`

Accepte désormais `limit`, `offset` et `search`.

```json
{
  "contract_version": "0.1",
  "items": [],
  "limit": 30,
  "offset": 0,
  "total": 125,
  "search": ""
}
```

### `PUT /admin/lexical-entry/:entryKey`

Met à jour dans une transaction :

- `gloss_fr` ;
- `gloss_en` ;
- `semantic_domain` ;
- langue, lemme et catégorie des formes existantes.

`entry_key` reste immuable. Chaque forme doit conserver son `id`. L’API verrouille l’entrée et ses formes, exige que l’ensemble reçu corresponde exactement aux formes existantes, recalcule `normalized_lemma` et intercepte les doublons SQL.

### `GET /admin/forms`

Recherche des formes par lemme, forme normalisée, code langue ou `entry_key`. La réponse expose les identifiants nécessaires à la création d’une relation.

### `GET /admin/form-relations`

Liste ou recherche les relations avec les deux formes, leurs langues, leurs entrées, le type, le score et la provenance.

### `POST /admin/form-relation`

Crée une relation manuelle symétrique. Les types V0 sont :

- `COGNATE_STRONG` ;
- `COGNATE_WEAK` ;
- `FALSE_FRIEND` ;
- `RELATED_FORM`.

Le score est obligatoire entre 0 et 1. La provenance vaut `manual_admin_v0` par défaut. La transaction verrouille les deux formes dans l’ordre de leurs identifiants, vérifie leur existence et refuse un doublon du même type dans les deux orientations.

## Pagination

La page charge 30 entrées à la fois et affiche une navigation du type :

```text
← Précédent    31–60 / 125    Suivant →
```

Les boutons sont désactivés aux bornes. Une nouvelle recherche remet `offset` à zéro tout en conservant le fonctionnement historique sur la clé, la glose française et le domaine sémantique.

Le test réel a confirmé deux pages successives de 30 éléments sur 125 entrées. La recherche `INTERNATIONAL`, lancée depuis la deuxième page, est revenue à `1–1 / 1`.

## Édition

Chaque ligne possède une action `Modifier`. Elle réutilise le formulaire de création en mode édition :

- la clé est visible mais désactivée ;
- les gloses et le domaine sont préremplis ;
- les formes existantes sont préremplies avec leur identifiant ;
- l’ajout et le retrait de formes sont désactivés ;
- `Annuler` restaure le mode création.

Cette approche évite toute suppression implicite. Le succès ou l’erreur est affiché dans le message du formulaire, puis la liste est rechargée sur l’entrée concernée.

## Relations

Une nouvelle section propose deux recherches indépendantes de formes. Chaque résultat montre :

```text
LANGUE · lemme · ENTRY_KEY · catégorie
```

L’administrateur choisit ensuite le type, le score et la provenance, puis crée explicitement la relation. Les 30 relations les plus récentes sont visibles sous le formulaire et peuvent être filtrées.

Aucune IA et aucune création automatique ne participent à ce workflow.

## Tests réalisés

La suite Node couvre notamment :

- pagination avec `limit` et `offset` ;
- recherche paginée ;
- modification valide et normalisation des formes ;
- refus d’une modification invalide ou d’un changement de clé ;
- création d’une relation valide ;
- refus d’une forme inexistante ;
- refus d’une relation en doublon.

Résultat final : **24 tests réussis sur 24**. Les fichiers serveur, repository, validation et frontend passent aussi la vérification syntaxique Node.

Vérifications avec la MariaDB locale :

- pagination : 30 éléments sur un total de 125 ;
- deuxième page : `offset = 30`, 30 éléments ;
- recherche `INTERNATIONAL` : une entrée ;
- recherche `internacional` : deux formes espagnole et portugaise ;
- tentative avec forme inexistante : `404`, aucune relation ajoutée ;
- tentative d’un doublon réel : `409`, compteur stable à 68 relations ;
- tentative de mise à jour d’une entrée inexistante : `404`.

Le navigateur a permis de vérifier la pagination, le retour à la première page lors d’une recherche, le passage en mode édition, l’annulation sans écriture, les recherches de formes et les rendus bureau et mobile. Aucune erreur console n’a été observée.

## Cas `internacional ↔ international`

La section Relations permet maintenant de sélectionner précisément :

```text
ES · internacional · INTERNATIONAL · noun
FR · international · INTERNATIONAL · noun
```

La création suivante peut être effectuée manuellement :

```text
type = COGNATE_STRONG
score = 0.95
source_label = manual_admin_v0
```

Avec le moteur actuel, cette relation symétrique rendra `internacional` éligible à l’enrichissement `lexical_transparency` du tamis 1 lorsque le français est la langue de médiation. Elle n’a pas été créée automatiquement pendant les tests.

## Limites V0

- Pas de modification de `entry_key`.
- Pas d’ajout ou de suppression de formes pendant l’édition.
- Pas de suppression d’entrée.
- Pas de modification ou suppression de relation.
- Toutes les nouvelles relations sont symétriques.
- Les doublons de relations sont contrôlés par transaction dans l’application, car le schéma ne possède pas de contrainte unique sur la paire.
- Pas d’authentification ni de journal d’audit dans cette V0 locale.
- La recherche reste simple et ne fait ni lemmatisation ni classement linguistique avancé.
