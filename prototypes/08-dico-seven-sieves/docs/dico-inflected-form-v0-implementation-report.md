# Dico-IC — implémentation V0 `inflected_form`

## Objectif

Cette V0 ajoute une couche séparée pour les pluriels attestés et validés de noms et adjectifs en français, espagnol, italien et portugais.

Le flux obtenu est :

```text
forme plurielle validée
→ lemme canonique lexical_form
→ connaissances Dico-IC existantes
→ enrichissements du token original
```

`lexical_form` reste le lieu des lemmes. Seven Sieves et `POST /analysis` n'écrivent aucune donnée.

## Fichiers créés

- `database/current_draft/50_inflected_form.sql`
- `Node/test/admin-inflected-form-repository.test.js`
- `docs/dico-inflected-form-v0-implementation-report.md`

## Fichiers modifiés

- `database/current_draft/README.md`
- `Node/server.js`
- `Node/src/admin.js`
- `Node/src/analysis.js`
- `Node/src/repository.js`
- `Node/test/admin.test.js`
- `Node/test/admin-manual-routes.test.js`
- `Node/test/analysis.test.js`
- `admin/index-admin-0.1.html`
- `admin/css/admin-0.1.css`
- `admin/js/admin-0.1.js`

Aucun ancien script SQL, aucune page IA et aucun fichier Seven Sieves n'ont été modifiés.

## Schéma ajouté

Le script `50_inflected_form.sql` crée une table expérimentale :

```text
inflected_form
```

Champs :

```text
id
lexical_form_id
surface_form
normalized_surface
grammatical_number
status
source_label
confidence_score
created_at
```

Contraintes :

- clé étrangère vers `lexical_form(id)` avec suppression en cascade ;
- surfaces brute et normalisée non vides ;
- nombre limité à `PLURAL` ;
- statuts `PROPOSED`, `VALIDATED`, `REJECTED`, `ARCHIVED` ;
- confiance nullable entre 0 et 1 ;
- doublon exact interdit sur cible + surface normalisée + nombre ;
- index de lookup sur surface normalisée + statut ;
- index sur la cible canonique.

Les index sont déclarés dans `CREATE TABLE IF NOT EXISTS`, afin que le script puisse être rejoué sans erreur d'index déjà présent.

Ni `language_code` ni `part_of_speech` ne sont dupliqués. Ils sont lus depuis la cible `lexical_form`.

Le README de `current_draft` mentionne maintenant les scripts 40 et 50 dans l'ordre prévu.

## Endpoints ajoutés

### `GET /admin/inflected-forms`

Filtres acceptés :

```text
search
status
limit
offset
```

La réponse contient :

- surface et forme normalisée ;
- lemme cible ;
- langue et catégorie dérivées ;
- `entry_key` ;
- nombre ;
- statut ;
- provenance ;
- confiance ;
- date de création ;
- total et pagination.

### `POST /admin/inflected-form`

Exemple :

```json
{
  "lexical_form_id": 123,
  "surface_form": "utiles",
  "grammatical_number": "PLURAL",
  "status": "VALIDATED",
  "source_label": "manual_admin_v0",
  "confidence_score": 1
}
```

La validation serveur :

- calcule `normalized_surface` avec `toLookupKey()` ;
- exige une cible existante ;
- limite la cible aux POS `noun` et `adjective` ;
- limite la langue à FR, ES, IT ou PT ;
- valide nombre, statut, provenance et confiance ;
- transforme une collision SQL en `DUPLICATE_INFLECTED_FORM` ;
- effectue la création dans une transaction.

Le `PATCH` facultatif n'a pas été ajouté afin de garder cette première V0 minimale.

## Admin UI

`admin/index-admin-0.1.html` contient une nouvelle section :

```text
Formes fléchies validées
```

Elle permet :

1. de rechercher une forme canonique existante ;
2. de sélectionner sa `lexical_form` ;
3. de saisir la surface plurielle ;
4. de choisir le statut ;
5. de renseigner confiance et provenance ;
6. de créer le mapping ;
7. de rechercher et filtrer les mappings récents.

La recherche réutilise `GET /admin/forms`. La liste affiche la cible sous la forme :

```text
FR · utile
USEFUL · adjective
```

Les statuts disposent d'une distinction visuelle discrète. La mise en page reste responsive et sans framework.

Le résumé du modèle inclut désormais le nombre de `inflected_forms` et documente le rôle de la table.

## Impact sur `POST /analysis`

### Ordre effectif

```text
1. lookup exact dans lexical_form
2. pour les tokens non résolus seulement : lookup inflected_form VALIDATED
3. récupération de la lexical_form cible
4. chargement habituel de l'entrée, des formes apparentées, relations et règles
5. génération des enrichissements existants
```

Une clé interne `matched_lookup_key` relie le lemme canonique à la clé du token pluriel. Elle n'est jamais exposée dans le contrat public.

Le token conserve :

- sa surface originale ;
- ses offsets ;
- ses enrichissements habituels.

Le lemme exact est prioritaire. Une ancienne `lexical_form` portant déjà la surface ne sera donc pas doublée par un mapping fléchi.

### Stateless

Le chargement de l'analyse n'exécute que des `SELECT` :

- aucune insertion ;
- aucune mise à jour ;
- aucun compteur ;
- aucune date de dernière observation ;
- aucune création automatique.

Le contrat JSON public `0.1` n'est pas modifié.

## Tests réalisés

La suite Node couvre :

- validation et normalisation d'une surface ;
- statut invalide ;
- création transactionnelle valide ;
- cible absente ;
- cible avec POS interdit ;
- langue cible interdite ;
- doublon exact ;
- listing filtré et paginé ;
- résolution d'un pluriel validé ;
- absence de requête d'écriture dans l'analyse ;
- priorité du lemme exact ;
- conservation de la surface originale ;
- génération d'un enrichissement à partir du lemme cible.

Résultat :

```text
72 tests réussis
0 échec
```

Les fichiers JavaScript serveur et frontend passent également `node --check`.

## Test réel MariaDB/API

Le script 50 a été appliqué sans erreur à la base locale `ic_dico`.

Un mapping de démonstration a été créé :

```text
ES organizaciones
→ ES organización
→ ORGANIZATION_ENTITY
→ noun
→ VALIDATED
```

Le mapping porte l'identifiant `1`, la provenance `manual_admin_v0` et une confiance de `1`.

L'analyse réelle du texte :

```text
Las organizaciones promueven la educación.
```

a produit pour le token `organizaciones` :

- surface conservée : `organizaciones` ;
- lemme mobilisé en interne : `organización` ;
- enrichissement `lexical_transparency` ;
- enrichissement grapho-phonique existant ;
- aucune écriture pendant `/analysis`.

L'endpoint de listing a relu le mapping avec sa cible, sa langue, sa catégorie et sa date.

## Vérification locale

- API : `http://127.0.0.1:3000`
- Admin : `http://127.0.0.1:8770/admin/index-admin-0.1.html`

Les deux serveurs répondent et la page statique contient la nouvelle section. L'automatisation du navigateur intégré n'a pas pu être initialisée dans cette session ; aucun contrôle visuel interactif ni capture de console n'a donc été obtenu. Les contrôles HTTP, syntaxiques, unitaires et API réels sont concluants.

## Exemple `utile → utiles`

Le scénario est couvert par les tests :

```text
lexical_form FR utile
+ inflected_form VALIDATED utiles
→ token utiles
→ famille lexicale de utile
```

La base locale contient encore une ancienne `lexical_form` plurielle `utiles` dans une entrée expérimentale. Le test réel a donc utilisé `organizaciones → organización` afin de vérifier sans ambiguïté le nouveau chemin `inflected_form`.

Cette V0 ne nettoie ni ne fusionne automatiquement les anciennes données exploratoires.

## Limites V0

- noms et adjectifs uniquement ;
- FR, ES, IT et PT uniquement ;
- nombre `PLURAL` uniquement ;
- aucune édition ou suppression de mapping dans l'UI ;
- aucune résolution automatique des ambiguïtés ;
- aucune lemmatisation dynamique ;
- aucune génération depuis les textes ;
- aucune télémétrie d'usage ;
- seuls les mappings `VALIDATED` alimentent l'analyse ;
- le script 50 doit être appliqué avant de démarrer cette version du backend.

## Absence de `morph_rule`

Aucune table, règle ou heuristique `morph_rule` n'est ajoutée. La V0 repose exclusivement sur des mappings attestés créés explicitement par l'admin.

Seven Sieves, les assistants IA et les scripts SQL antérieurs restent inchangés.
