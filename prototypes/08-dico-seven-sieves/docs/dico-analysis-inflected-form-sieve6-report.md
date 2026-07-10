# Dico-IC API — enrichissement `inflected_form` pour le tamis 6

## Objectif

Exposer dans `POST /analysis` une connaissance morphologique déjà validée par Dico-IC afin que Seven Sieves puisse expliquer un pluriel sans heuristique locale, règle graphique ou appel administratif.

Le chemin V0 est désormais :

```text
surface du token
↓
mapping inflected_form VALIDATED et PLURAL
↓
lemme canonique
↓
enrichissement morphosyntactic_signal du tamis 6
```

## Fichiers modifiés

- `Node/src/repository.js`
- `Node/src/analysis.js`
- `Node/test/analysis.test.js`
- `Node/test/admin-inflected-form-repository.test.js`
- `docs/api-analysis-contract-v0.md`

Fichier créé :

- `docs/dico-analysis-inflected-form-sieve6-report.md`

Aucun schéma, script SQL, endpoint admin, fichier Seven Sieves ou assistant IA n’a été modifié.

## Logique retenue

### 1. Propagation interne depuis le repository

La lecture `inflected_form` existante était déjà limitée aux mappings :

```text
status = VALIDATED
```

Elle retourne maintenant, en plus du lemme canonique :

- `inflected_form_id` ;
- `inflected_grammatical_number` ;
- `inflected_status` ;
- `inflected_source_label` ;
- `inflected_confidence_score`.

Les formes lexicales exactes reçoivent les mêmes alias à `NULL`. Cette symétrie garde une forme de ressource stable et évite de confondre un lemme exact avec une résolution morphologique.

### 2. Conditions de génération

L’enrichissement est produit uniquement lorsque :

```text
tamis 6 demandé
AND match_kind = inflected_form
AND inflected_status = VALIDATED
AND inflected_grammatical_number = PLURAL
AND part_of_speech = noun
```

La restriction aux noms respecte le périmètre demandé. Un mapping adjectival validé ne produit pas encore cet enrichissement V0.

### 3. Enrichissement public

Le générateur ajoute un objet `morphosyntactic_signal` à la liste existante du token. Il ne remplace ni ne modifie les enrichissements des autres tamis.

La provenance publique devient :

```json
{
  "kind": "inflected_form",
  "id": 1,
  "label": "Dico-IC"
}
```

`inflected_form` a été ajouté aux valeurs documentées de `source.kind` dans le contrat V0.

## Réponse avant

Avant cette évolution, `organizaciones` mobilisait bien le lemme `organización`, mais la réponse publique ne permettait pas de connaître la provenance morphologique ni le nombre.

Extrait simplifié :

```json
{
  "surface": "organizaciones",
  "enrichments": [
    {
      "sieve_id": 1,
      "type": "lexical_transparency",
      "payload": {
        "source_form": "organización",
        "mediation_form": "organisation"
      }
    },
    {
      "sieve_id": 4,
      "type": "grapho_phonetic_signal"
    }
  ]
}
```

Il n’était pas possible d’affirmer côté client que la surface était un pluriel validé.

## Réponse après

Le token conserve les enrichissements précédents et reçoit en plus :

```json
{
  "id": "e-0003",
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

Le contrat reste `contract_version: "0.1"`. L’évolution est additive : aucun champ existant n’est retiré ou renommé.

## Test réel

Texte envoyé à l’API locale :

```text
Las organizaciones internacionales participan en proyectos educativos.
```

Paramètres principaux :

```text
source = es
médiation = fr
comparaison = it, pt
tamis = 1 à 7
```

Résultat observé pour `organizaciones` :

```text
sieve_id                   = 6
type                       = morphosyntactic_signal
source.kind                = inflected_form
source.id                  = 1
payload.category           = validated_plural
payload.grammatical_number = PLURAL
payload.lemma              = organización
payload.surface_form       = organizaciones
```

Le token possède toujours en parallèle :

- son enrichissement `lexical_transparency` du tamis 1 ;
- son enrichissement `grapho_phonetic_signal` du tamis 4.

Le compteur `result_count` du tamis 6 vaut `1` pour cette requête.

## Tests automatisés

La suite Node contient désormais deux protections spécifiques :

1. un nom résolu par un mapping `VALIDATED` et `PLURAL` produit l’enrichissement attendu ;
2. un mapping adjectival ne produit rien dans cette V0 limitée aux noms.

Le test repository vérifie également que les colonnes morphologiques sont sélectionnées et restent associées à la résolution `inflected_form`.

Résultat complet :

```text
74 tests réussis
0 échec
```

Les tests historiques couvrant les sept types d’enrichissements restent verts.

## Impact sur Seven Sieves

Aucune modification frontend n’est nécessaire pour recevoir l’objet :

- Seven Sieves lit déjà les enrichissements par `sieve_id` ;
- le type `morphosyntactic_signal` est déjà reconnu ;
- le tamis 6 possède déjà son style de surbrillance ;
- le rendu générique affiche `label`, `explanation`, `caution` et la catégorie du payload.

Ainsi, lorsque le tamis 6 est activé, le client peut déjà montrer « Pluriel validé » et l’explication liée à `organización`. Une future amélioration purement visuelle pourra présenter séparément « Singulier » et « Pluriel observé », sans modifier la vérité fournie par l’API.

Les clients plus anciens qui ne souhaitent pas exploiter cet enrichissement peuvent l’ignorer selon les règles d’extensibilité du contrat.

## Compatibilité

- aucune modification des enrichissements tamis 1, 2, 3, 4 ou 7 ;
- aucune modification de la priorité entre match lexical exact et `inflected_form` ;
- aucune écriture pendant `POST /analysis` ;
- aucun appel admin depuis Seven Sieves ;
- aucun accès direct du client à MariaDB ;
- aucun changement du schéma SQL ;
- aucun changement de l’admin ou des assistants IA.

## Limites V0

- noms uniquement ;
- mappings `VALIDATED` uniquement ;
- nombre `PLURAL` uniquement ;
- aucun pluriel probable ;
- aucune règle `-s` ou `-es` ;
- aucun adjectif ;
- aucun genre ;
- aucun accord ;
- aucun verbe ;
- aucune nouvelle forme reconnue ;
- un ancien pluriel stocké comme `lexical_form` exacte garde la priorité et ne passe pas par ce chemin ;
- le tamis 6 conserve son statut général `experimental`, car d’autres signaux V0 restent heuristiques.

## Conclusion

La connaissance validée ne s’arrête plus à la résolution interne du lemme. Elle devient un enrichissement public, explicite et traçable que Seven Sieves peut rendre sans calcul linguistique local.

Le premier prototype pédagogique du tamis 6 est donc débloqué sur le cas précis :

```text
organizaciones
→ organización
→ PLURAL validé
→ enrichissement tamis 6
```
