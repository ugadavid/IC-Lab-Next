# Dico-IC - Rapport d'implémentation Connector Help V0

## Objectif

Connector Help devient le premier objet pédagogique transversal officiel de Dico-IC :

```text
connector_help VALIDATED
↓
POST /analysis
↓
pedagogical_enrichments
↓
Seven Sieves
↓
indice discursif visible
```

L'objet reste indépendant du lexique, des relations, des règles, des formes fléchies et des sept tamis.

## Fichiers créés

- `database/current_draft/60_connector_help.sql`
- `Node/test/connector-help.test.js`
- `docs/dico-connector-help-v0-implementation-report.md`

## Fichiers modifiés

- `database/current_draft/README.md`
- `Node/src/admin.js`
- `Node/src/analysis.js`
- `Node/src/repository.js`
- `Node/server.js`
- `Node/test/analysis.test.js`
- `Node/test/admin-inflected-form-repository.test.js`
- `admin/index-admin-0.1.html`
- `admin/css/admin-0.1.css`
- `admin/js/admin-0.1.js`
- `prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html`
- `prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js`
- `docs/api-analysis-contract-v0.md`
- `docs/docs-index.md`

La page Seven Sieves live officielle `index-api-live-0.1.html` n'a pas été modifiée.

## SQL ajouté

`60_connector_help.sql` crée une table autonome contenant :

- langue obligatoire ;
- lien lexical facultatif ;
- expression et expression normalisée ;
- fonction discursive ;
- titre, aide, exemple et prudence ;
- statut, provenance et notes ;
- timestamps ;
- contraintes de contenu, fonctions et statuts ;
- unicité langue/expression/fonction ;
- index de lookup, fonction/statut et lien lexical.

`normalized_expression` utilise `utf8mb4_bin`. L'API calcule une valeur NFC en minuscules en conservant les accents.

Le seed idempotent ajoute 12 objets `VALIDATED` :

- ES : `sin embargo`, `pero`, `porque`, `por tanto`, `además`, `después` ;
- FR : `cependant`, `mais`, `parce que`, `donc`, `de plus`, `ensuite`.

La migration a été exécutée deux fois sur MariaDB : le total est resté à 12. Les accents de `además` et `después` ont été relus correctement.

## Endpoints créés

### Lecture publique

- `GET /connector-helps`
- `GET /connector-help/lookup`
- `GET /connector-help/:id`

Les lectures publiques exposent uniquement les objets validés et masquent les notes ou statuts de travail.

### Administration

- `GET /admin/connector-helps`
- `GET /admin/connector-help-functions`
- `GET /admin/connector-help/:id`
- `POST /admin/connector-help`
- `PUT /admin/connector-help/:id`
- `DELETE /admin/connector-help/:id`

`DELETE` effectue exclusivement un passage à `ARCHIVED`. Les écritures sont transactionnelles. Les langues, références lexicales, collisions et conflits de fonction validée sont contrôlés avant commit.

## Extension de `/analysis`

La réponse comporte désormais systématiquement :

```json
"pedagogical_enrichments": []
```

Une occurrence reconnue produit un objet unique sans `sieve_id` :

```json
{
  "id": "p-0001",
  "type": "connector_help",
  "label": "Connecteur logique",
  "language": "es",
  "function": "OPPOSITION",
  "expression": "Sin embargo",
  "token_indexes": [1, 2],
  "start": 3,
  "end": 14,
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

Les enrichissements historiques des tamis restent attachés aux tokens et inchangés.

## Reconnaissance multi-token

Le repository charge en une requête les aides `VALIDATED` de la langue source. Le moteur :

1. tokenise les expressions avec le tokenizer existant ;
2. compare les formes NFC minuscules, accents conservés ;
3. privilégie la séquence la plus longue ;
4. exige uniquement des espaces entre les mots ;
5. accepte la ponctuation extérieure ;
6. conserve les indices de tous les tokens et les offsets UTF-16 ;
7. n'écrit aucune occurrence en base.

`sin embargo`, `por tanto` et `parce que` couvrent chacun deux tokens, mais produisent un seul objet.

## Seven Sieves

La variante pédagogique ne possède plus de catalogue Connector Help local. Elle :

- valide la présence éventuelle de `pedagogical_enrichments` ;
- sélectionne uniquement `type = connector_help` et `source.kind = connector_help` ;
- surligne tous les `token_indexes` ;
- affiche le titre, la fonction, l'aide, l'exemple et la prudence reçus ;
- conserve le contrôle « Aide discursive expérimentale » ;
- ne crée aucun tamis 8 ;
- n'effectue aucune double détection.

Le fallback mock reste compatible : en l'absence du champ, la page utilise un tableau vide et n'invente pas d'aide discursive.

## Administration

La section **Aides discursives** ajoute :

- liste paginée ;
- recherche et filtres langue, fonction, statut ;
- création ;
- modification ;
- archivage avec confirmation ;
- lien lexical facultatif ;
- panneau de référence des cinq fonctions avec compteurs.

Le champ normalisé n'est jamais affiché ou envoyé par le frontend. Il est toujours recalculé côté API.

## Tests réalisés

### Suite automatisée

Résultat :

```text
86 tests réussis
0 échec
```

La couverture Connector Help vérifie notamment :

- normalisation NFC, casse et espaces ;
- accents conservés ;
- langues ES/FR et fonction invalide ;
- filtres et masquage des champs de travail ;
- création, collision et archivage logique ;
- DDL, unicité et seed idempotent ;
- absence de catalogue local Seven Sieves ;
- portées multi-token ;
- casse ignorée ;
- ponctuation interne refusée ;
- offsets UTF-16 ;
- absence de `sieve_id` ;
- absence de modification des enrichissements des tamis.

### MariaDB et API réelles

- script exécuté deux fois : `12 → 12` lignes ;
- `GET /connector-helps` : 12 objets ;
- catalogue admin : cinq fonctions ;
- résumé du modèle : 12 aides discursives ;
- `Sin embargo` : OPPOSITION, tokens `[1, 2]`, offsets `3–14` après un emoji ;
- `Por tanto` : CONSEQUENCE, deux tokens ;
- `Además` : ADDITION, accent conservé ;
- `PARCE QUE` : CAUSE, casse ignorée ;
- `sin, embargo` : aucun résultat ;
- `ademas` : aucun résultat.

La vérification visuelle automatisée des pages n'a pas pu être exécutée dans cette session, la connexion au navigateur intégré étant indisponible. Les scripts frontend ont néanmoins passé la vérification syntaxique, leurs ressources sont servies localement et leur contrat a été vérifié statiquement.

## Limites V0

- ES et FR uniquement ;
- douze expressions ;
- cinq fonctions fermées ;
- une fonction validée par expression ;
- reconnaissance exacte uniquement ;
- accents obligatoires ;
- aucune locution discontinue ;
- aucune désambiguïsation contextuelle ;
- aucune IA ou NLP ;
- aucune statistique d'usage ;
- aucune écriture depuis Seven Sieves.

## Prochaines étapes

1. réaliser la validation visuelle manuelle de Seven Sieves et de l'admin ;
2. présenter les formulations à des enseignants ;
3. confirmer la promotion de la variante pédagogique vers la page live ;
4. ajouter IT/PT seulement à partir d'un catalogue relu ;
5. conserver les fonctions fermées tant qu'un besoin réel d'administration de la taxonomie n'apparaît pas.

## Conclusion

Connector Help suit désormais le parcours officiel attendu : Dico-IC stocke et valide, `/analysis` détecte sans persister, Seven Sieves explique. L'objet reste transversal, traçable et indépendant des sept tamis.
