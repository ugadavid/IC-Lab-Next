# Dico-IC Admin - Assistant IA Relations V1

## Objectif

La V1 ajoute une stratégie de comparaison configurable à l’Assistant IA Relations. L’administrateur choisit une langue de référence ou le mode `Toutes` avant la génération, sans modifier le modèle de données ni le format des candidats.

L’IA propose toujours des relations internes à une seule entrée. L’humain les révise et les sélectionne. Seul `POST /admin/form-relation` écrit en base.

## Fichiers modifiés

- `Node/src/admin-ai-relations.js`
- `Node/server.js`
- `Node/test/admin-ai-relations.test.js`
- `admin/index-admin-ai-relations-0.1.html`
- `admin/css/admin-ai-relations-0.1.css`
- `admin/js/admin-ai-relations-0.1.js`

Le présent rapport est ajouté sous `docs/dico-admin-ai-relations-v1-reference-language-report.md`.

## Contrat étendu

`POST /admin/ai/relation-candidates` accepte désormais :

```json
{
  "entry_key": "INTERNATIONAL",
  "reference_language": "es"
}
```

Valeurs autorisées : `fr`, `es`, `it`, `pt`, `en`, `all`.

Si `reference_language` est absent, le backend utilise `fr`. Une autre valeur produit une erreur `400 INVALID_REFERENCE_LANGUAGE`. La réponse conserve le même tableau `candidates`; seule la métadonnée `generation.reference_language` est ajoutée.

## Interface

Un sélecteur visible est placé avec l’action de génération :

```text
Langue de référence
[ FR ▼ ]  [ ✨ Proposer les relations ]
```

La valeur par défaut est `FR`. Le choix est conservé dans `sessionStorage` pendant la session et reste affiché après une génération. Les choix proposés sont FR, ES, IT, PT, EN et Toutes.

## Comportement par mode

| Mode | Priorité donnée au modèle |
|---|---|
| FR | paires impliquant le français |
| ES | paires impliquant l’espagnol |
| IT | paires impliquant l’italien |
| PT | paires impliquant le portugais |
| EN | paires impliquant l’anglais |
| Toutes | meilleures paires internes, sans langue pivot |

Dans les cinq modes avec référence, les relations entre les autres langues restent autorisées mais secondaires. Le prompt demande aussi d’éviter les combinaisons transitives redondantes. En mode Toutes, cette contrainte de pivot disparaît afin de faire émerger les proximités les plus pertinentes.

## Impact sur les propositions

Le changement ne filtre pas les résultats après coup : la stratégie est communiquée au modèle avec les données bornées de l’entrée. Les contrôles serveur restent identiques ensuite : identifiants internes, types autorisés, score entre 0 et 1, absence d’auto-relation et détection des doublons.

Le format JSON strict n’a pas changé. Le type et le score restent éditables par l’humain avant toute création.

## Compatibilité avec la V0

- Une requête V0 contenant seulement `entry_key` continue de fonctionner.
- Le défaut `fr` reproduit la préférence historique pour le français.
- La détection des relations existantes ne change pas.
- La page utilise toujours `POST /admin/form-relation` pour écrire.
- Aucune relation n’est créée par l’endpoint IA.
- Les pages Domaine et Texte ne sont pas modifiées.
- `POST /analysis`, Seven Sieves, le schéma et les scripts SQL ne sont pas modifiés.

## Tests réalisés

Les tests couvrent explicitement :

- défaut historique FR ;
- références FR, ES, IT, PT et EN ;
- mode ALL sans pivot ;
- refus d’une valeur inconnue ;
- présence de la stratégie attendue dans le prompt ;
- conservation des validations V0 et du chemin d’écriture manuel.

Résultat global : **42 tests réussis sur 42**. Les vérifications syntaxiques Node sont également réussies.

Une requête réelle avec `reference_language = de` a renvoyé `400 INVALID_REFERENCE_LANGUAGE`. La page est servie en HTTP `200`, contient le sélecteur et déclare FR comme option initiale.

Le connecteur du navigateur intégré refuse toujours les métadonnées de sandbox avant initialisation. Le contrôle visuel automatisé n’a donc pas pu être relancé ; aucun mécanisme de contournement n’a été utilisé.

## Exemple `INTERNATIONAL`

Formes présentes : FR `international`, ES `internacional`, IT `internazionale`, PT `internacional`.

Avec ES comme référence, l’appel réel `gpt-4.1-mini` a proposé :

| Paire | Type | Score | Statut |
|---|---|---:|---|
| ES ↔ FR | `COGNATE_STRONG` | 0.95 | déjà existante |
| ES ↔ PT | `COGNATE_STRONG` | 0.98 | nouvelle |
| ES ↔ IT | `COGNATE_STRONG` | 0.85 | nouvelle |

Le pivot espagnol fait donc apparaître directement ES↔PT, absente de la génération historique centrée sur FR.

## Exemple `CADA_DETERMINER_EACH_EVERY`

Formes présentes : EN `each`, ES `cada`, FR `chaque`, IT `ogni`, PT `cada`.

En mode Toutes, le modèle a placé en premier :

```text
ES cada ↔ PT cada
COGNATE_STRONG · 0.95
```

Il a aussi proposé trois proximités plus faibles vers FR `chaque`. Le mode sans pivot permet ici de faire émerger la paire romane orthographiquement identique.

## Exemple `UTIL_ADJECTIVE_USEFUL`

Formes présentes : ES `útiles`, FR `utiles`, IT `utili`, PT `úteis`.

Avec IT comme référence, les trois propositions impliquent l’italien :

| Paire | Type | Score |
|---|---|---:|
| IT `utili` ↔ ES `útiles` | `COGNATE_STRONG` | 0.95 |
| IT `utili` ↔ PT `úteis` | `COGNATE_STRONG` | 0.95 |
| IT `utili` ↔ FR `utiles` | `COGNATE_STRONG` | 0.90 |

Ces résultats restent des brouillons linguistiques : ils n’ont pas été écrits en base pendant les tests.

## Limites

- Le pivot influence le prompt mais ne constitue pas un filtre algorithmique absolu.
- Une langue choisie peut être absente de l’entrée ; le modèle utilise alors les paires secondaires disponibles.
- La qualité des scores et des types dépend toujours du modèle et exige une validation humaine.
- Le mode Toutes peut produire davantage de propositions sur une entrée riche.
- Il n’existe toujours ni génération inter-entrées ni traitement global du dictionnaire.

La V1 améliore ainsi la pertinence des comparaisons sans ajouter de table, de règle persistée ou de nouveau chemin d’écriture.
