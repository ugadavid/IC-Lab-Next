# Seed expérimental de support au mock API V0

## Statut et objectif

Le fichier `database/current_draft/40_seed_api_mock_support.sql` est un brouillon expérimental complémentaire. Il prépare les données minimales permettant à une future implémentation stateless de `POST /analysis` de reproduire les enrichissements principaux du mock Seven Sieves.

Il ne constitue ni une source de vérité validée, ni un vocabulaire de production. Il doit être lu après `00_schema.sql`, `10_procedures.sql`, `20_seed_base.sql` et `30_seed_experimental.sql`.

## Données ajoutées

Le seed ajoute cinq entrées lexicales conceptuelles et douze formes :

| Entrée | Formes | Usage visé |
|---|---|---|
| `ORGANIZATION_ENTITY` | `organización` (es), `organisation` (fr) | cognat et transformation `-ción → -tion` |
| `LANGUAGE_SYSTEM` | `lenguas` (es), `langues` (fr), `lingue` (it), `línguas` (pt) | lexique pan-roman du tamis 2 |
| `SCIENTIFIC_PROPERTY` | `científica` (es) | reconnaissance lexicale et indice grapho-phonique |
| `PROMOTE_ACTION` | `promueve` (es) | reconnaissance d’une forme verbale |
| `UNDERSTAND_COMPREHEND` | `comprender` (es), `comprendre` (fr), `comprendere` (it), `compreender` (pt) | infinitif espagnol et comparaisons romanes |

Les valeurs de `normalized_lemma` suivent la convention observée dans le brouillon : minuscules et suppression des diacritiques, par exemple `organizacion`, `cientifica` et `linguas`.

Le seed ajoute aussi quatre relations symétriques minimales :

| Source française | Cible | Type |
|---|---|---|
| `organisation` | `organización` | `COGNATE_STRONG` |
| `langues` | `lenguas` | `COGNATE_WEAK` |
| `langues` | `lingue` | `COGNATE_STRONG` |
| `langues` | `línguas` | `COGNATE_WEAK` |

Enfin, une règle `pattern_rule` espagnol vers français est ajoutée avec le type conventionnel `SUFFIX_TRANSFORM`, le motif source `ción` et le motif cible `tion`. L’exemple attesté reste `organización → organisation`.

## Correspondance avec les sept tamis

| Tamis | Apport de ce seed | Complément attendu de l’API |
|---|---|---|
| 1. Lexique transparent | relation `organización` / `organisation` | sélection et mise en forme de l’enrichissement |
| 2. Lexique pan-roman | entrée partagée pour les quatre formes de « langues » | regroupement des formes par langue |
| 3. Correspondances régulières | règle `-ción → -tion` et cible lexicale attestée | application prudente et contrôle de la cible |
| 4. Grapho-phonie | forme `científica` identifiée comme adjectif | heuristiques grapho-phoniques |
| 5. Morphosyntaxe | forme `promueve` identifiée comme verbe | interprétation de la flexion et signal utile |
| 6. Stratégies grammaticales | forme `comprender` identifiée comme verbe | heuristique API sur l’infinitif espagnol en `-er` |
| 7. Régularités transférables | même règle `-ción → -tion` | formulation pédagogique et avertissement de non-universalité |

Le seed ne tente donc pas de produire à lui seul les sept enrichissements. Il fournit les faits lexicaux et la règle réutilisable ; l’API reste responsable de la tokenisation, des offsets UTF-16, des heuristiques, du classement par tamis et des warnings.

## Réexécution et doublons

Les entrées et formes passent par les procédures d’upsert existantes. La procédure actuelle d’insertion de relation effectue en revanche un `INSERT` inconditionnel ; elle n’est donc pas utilisée ici. Chaque relation est insérée par une requête conditionnelle qui vérifie aussi une éventuelle relation symétrique inverse.

`pattern_rule` ne dispose pas de procédure dédiée. Son insertion est également conditionnelle sur la paire de langues, le type et les deux motifs. Cette protection convient aux réexécutions ordinaires du seed, sans constituer une garantie forte contre deux exécutions concurrentes, car le schéma ne porte pas de contrainte d’unicité équivalente.

## Encodage

Le script commence par `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci`. Les formes accentuées restent stockées dans `lemma`, les valeurs de recherche sans diacritiques dans `normalized_lemma`. La règle conserve `ción` dans `source_pattern` afin de décrire le phénomène linguistique lisiblement ; l’API devra définir explicitement si son moteur de motifs travaille sur la forme originale, la forme normalisée, ou les deux.

## Limites assumées

- `lenguas`, `langues`, `lingue`, `línguas`, `científica` et `promueve` sont des formes fléchies enregistrées comme `lexical_form` pour reconnaître exactement le texte du mock. Le modèle ne distingue pas encore clairement lemme canonique et forme de surface.
- Aucune règle générique d’infinitif en `-er` n’est ajoutée à `pattern_rule`. Ce signal reste une heuristique de l’API V0.
- Les relations cognates de `comprender` avec ses comparants romans ne sont pas nécessaires aux enrichissements actuels du mock ; l’entrée commune suffit pour les retrouver, sans multiplier les relations expérimentales.
- Les scores sont des valeurs provisoires destinées au test fonctionnel, pas des évaluations linguistiques validées.
- Le seed n’ajoute ni activité, ni session, ni statut, ni donnée apprenante. Il ne change pas le caractère stateless de la V0.
- Le seed ne remplace ni un analyseur morphologique, ni un analyseur syntaxique, ni la logique de génération des warnings.

## Vérification effectuée

Le contenu a été contrôlé statiquement par rapport aux signatures de `10_procedures.sql` et aux colonnes de `00_schema.sql`. Aucun script SQL n’a été exécuté et aucun fichier existant n’a été modifié.
