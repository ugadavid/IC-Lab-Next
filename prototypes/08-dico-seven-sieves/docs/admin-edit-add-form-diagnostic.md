# Diagnostic ciblé — ajout d'une forme en mode édition

## Conclusion

Le bouton `+ Ajouter une forme` n'est pas dépourvu de listener et celui-ci n'est pas perdu lors du passage en édition. Le bouton est explicitement désactivé par `startEditingEntry()` avec `addFormButton.disabled = true`.

Ce comportement est volontaire et cohérent avec la limite actuelle du backend : l'endpoint d'édition accepte uniquement la modification des formes existantes. Il n'accepte pas une forme supplémentaire et ne contient aucun chemin d'insertion dans `lexical_form`.

La fonctionnalité d'ajout d'une forme à une entrée existante n'a donc jamais été implémentée de bout en bout dans cette V0.

## Fichiers inspectés

- `admin/index-admin-0.1.html`
- `admin/js/admin-0.1.js`
- `Node/server.js`
- `Node/src/admin.js`
- `Node/src/repository.js`
- `docs/dico-admin-manual-v0-extensions-report.md`

## Listener JavaScript

Le bouton est un élément statique du formulaire principal :

```html
<button id="addFormButton" type="button">+ Ajouter une forme</button>
```

Le listener est attaché une seule fois au chargement du script :

```js
addFormButton.addEventListener("click", () => addFormRow());
```

Il n'est :

- ni limité au formulaire de création ;
- ni supprimé en mode édition ;
- ni perdu lors d'une reconstruction du DOM.

Seules les lignes du tableau sont reconstruites avec `formsTableBody.replaceChildren()`. Le bouton lui-même reste dans le DOM et conserve son listener.

La cause immédiate de l'absence de réaction est dans `startEditingEntry()` :

```js
addFormButton.disabled = true;
```

Un bouton HTML désactivé ne déclenche pas son événement `click`. `addFormRow()` n'est donc jamais appelée dans ce mode, aucun message n'est prévu et aucune exception n'est produite par ce clic.

## Création et édition

### Nouvelle entrée

`resetEntryForm()` place l'interface en mode création :

```js
addFormButton.disabled = false;
resetFormRows();
```

Le clic appelle alors `addFormRow()` et ajoute une ligne sans identifiant de forme. C'est le comportement attendu pour une création d'entrée complète.

### Modifier une entrée

`startEditingEntry()` :

1. vide le tableau de formes ;
2. reconstruit chaque ligne existante avec son `form.id` ;
3. rend ces lignes non supprimables avec `removable = false` ;
4. désactive le bouton d'ajout.

Le texte affiché confirme cette intention : « La clé et l'ensemble des formes sont conservés. Les lemmes et catégories peuvent être corrigés. »

La documentation de la V0 indique également explicitement : « Pas d'ajout ou de suppression de formes pendant l'édition. »

## Vérification des erreurs JavaScript

L'inspection statique ne révèle aucune référence nulle ni exception silencieuse sur ce parcours : le bouton et le tableau existent, et le listener est correctement attaché.

Une capture automatisée de la console du navigateur n'a pas pu être réalisée dans cette session, le connecteur de navigateur ayant refusé son initialisation pour une métadonnée de bac à sable manquante. Cela ne change pas le diagnostic du clic : le contrôle est désactivé avant interaction, donc le navigateur n'appelle pas le listener et aucun code de `addFormRow()` ne peut lever d'erreur.

## Support backend réel

L'endpoint concerné est :

```text
PUT /admin/lexical-entry/:entryKey
```

Deux protections empêchent aujourd'hui l'ajout d'une forme.

### Validation de la requête

`validateAdminLexicalEntryUpdate()` exige que chaque élément de `forms` possède un `id` entier positif et unique. Une nouvelle ligne créée par `addFormRow()` n'aurait pas de `data-form-id`, donc `collectForms()` n'enverrait pas d'`id`.

La requête serait rejetée avec :

```text
400 INVALID_FORM_ID
```

### Transaction du repository

`updateAdminLexicalEntry()` verrouille l'entrée et ses formes, puis exige que les identifiants reçus correspondent exactement à l'ensemble des identifiants existants. Toute différence est rejetée avec `409 INVALID_FORM_SET`.

La transaction exécute ensuite uniquement des instructions `UPDATE lexical_form`. Elle ne contient aucun `INSERT INTO lexical_form` ni appel à `sp_upsert_lexical_form` pour les nouvelles formes.

La transaction couvre correctement les modifications actuellement autorisées, mais pas l'ajout de formes.

## Test avec UTIL_ADJECTIVE_USEFUL

La lecture réelle de l'API confirme les formes suivantes :

| ID | Langue | Lemme | Catégorie |
|---:|:---:|---|---|
| 539 | ES | útiles | adjective |
| 540 | FR | utiles | adjective |
| 541 | IT | utili | adjective |
| 542 | PT | úteis | adjective |

Une requête d'édition contenant ces quatre formes et une cinquième forme `EN useful`, sans identifiant, a été envoyée uniquement pour vérifier la validation. Elle a été rejetée avant écriture :

```json
{
  "code": "INVALID_FORM_ID",
  "message": "L'identifiant de la forme 5 est invalide ou répété.",
  "field": "forms[4].id"
}
```

Aucune donnée n'a été modifiée par ce test.

## Flux attendu

Le flux suivant ne fonctionne pas actuellement :

```text
Modifier
→ Ajouter une forme
→ EN useful / adjective
→ Enregistrer
→ création d'une lexical_form
```

Le premier blocage est visuel (`disabled`). Si ce blocage était retiré seul, la validation API refuserait la nouvelle ligne. Même en contournant cette validation, le repository refuserait un ensemble d'identifiants différent et ne saurait pas insérer la nouvelle forme.

## Correction minimale recommandée

Une correction minimale doit rester coordonnée sur trois niveaux :

1. Autoriser le bouton en édition et distinguer visuellement les nouvelles lignes sans identifiant, tout en conservant l'interdiction de supprimer implicitement les formes existantes.
2. Adapter la validation pour accepter des formes existantes avec `id` et des formes nouvelles sans `id`, tout en exigeant la conservation de tous les identifiants existants.
3. Dans la même transaction, mettre à jour les formes identifiées puis insérer les nouvelles formes après validation de la langue active, normalisation du lemme et contrôle des doublons.

Aucune modification du schéma SQL n'est nécessaire.

## Difficulté et risque

- **Difficulté : faible à modérée.** Le périmètre est localisé, mais une simple activation du bouton serait insuffisante.
- **Risque de régression : faible à modéré** avec des tests ciblés sur l'ajout, les doublons, les langues inactives et le rollback transactionnel.
- **Risque d'une correction frontend seule : élevé.** Elle exposerait une action qui échoue systématiquement côté API.

La recommandation prudente est donc d'implémenter l'ajout comme une petite extension transactionnelle complète, et non comme une correction isolée du bouton.
