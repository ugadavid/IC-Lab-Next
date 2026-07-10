# Rapport d'intégration mock Seven Sieves / Dico-IC V0

## Statut

Cette intégration constitue une première connexion expérimentale entre Seven Sieves Explorer et le contrat JSON V0.

Elle n'implémente aucune API réelle, aucune sauvegarde d'activité et aucune écriture en base. Le fonctionnement reste stateless : la page charge un paquet JSON, l'affiche et conserve seulement son état d'interaction en mémoire locale.

Le prototype historique `index-0.0.8.2.html` n'a pas été modifié.

## Fichiers créés

Les fichiers liés au prototype sont placés dans `prototypes/01-seven-sieves/`.

### `index-api-mock-0.1.html`

Copie expérimentale de l'interface existante.

Elle conserve :

- la mise en page ;
- les sept boutons de tamis ;
- les panneaux d'observation ;
- les interactions de sélection et d'inspection ;
- les statuts locaux `compris`, `doute` et `inconnu`.

L'ancien script du prototype est conservé dans cette copie comme référence, avec un type non exécutable. Le nouveau moteur mock est chargé séparément.

### `mock/analysis-response-v0.json`

Paquet JSON conforme au contrat `0.1` contenant :

- le texte espagnol complet du prototype ;
- les langues `es`, `fr`, `it` et `pt` ;
- les sept tamis et leur état ;
- 92 tokens ordonnés ;
- les offsets UTF-16 de chaque token ;
- au moins un enrichissement pour chaque tamis ;
- trois warnings pour les traitements expérimentaux.

La correspondance problématique est corrigée :

```text
organización → organisation
```

Le mock ne contient pas la forme erronée `organization` comme résultat de transformation.

### `mock/seven-sieves-mock-v0.js`

Script JavaScript sans framework chargé par la copie expérimentale.

Il :

- charge le JSON avec `fetch` ;
- vérifie la version du contrat et la structure minimale ;
- contrôle les offsets avec `text.slice(start, end)` ;
- reconstruit le texte depuis les tokens et les intervalles entre tokens ;
- associe les enrichissements aux occurrences ;
- pilote l'affichage par tamis ;
- conserve l'état d'interface uniquement en mémoire ;
- affiche un message clair lorsque le mock est indisponible.

### `docs/seven-sieves-mock-integration-report-v0.md`

Présent rapport.

## Ce qui est désormais piloté par le JSON

### Texte et occurrences

Le texte affiché ne provient plus de `rawText` dans le script actif. Il est lu depuis `analysis-response-v0.json`.

Les mots interactifs sont créés à partir de `tokens`. Les espaces, retours à la ligne et signes de ponctuation sont préservés grâce aux offsets entre les tokens.

### Langues

Le repère supérieur affiche dynamiquement :

```text
ES → FR · IT / PT
```

Ces valeurs viennent de l'objet `languages` du paquet.

### Métadonnées des tamis

Les libellés, descriptions et statuts `available` ou `experimental` sont lus depuis `sieves`.

Le nombre de tamis reste fixé à sept dans l'interface, conformément au premier client.

### Enrichissements

Les mots mis en évidence, les infobulles, le panneau d'inspection, la vue multi-tamis et le panneau de transformations utilisent les objets `enrichments` reçus.

Les exemples du mock sont :

| Tamis | Occurrence | Enrichissement |
|---:|---|---|
| 1 | `organización` | Transparence lexicale vers `organisation` |
| 2 | `lenguas` | Série `lenguas / langues / lingue / línguas` |
| 3 | `organización` | Correspondance `-ción → -tion`, résultat `organisation` |
| 4 | `científica` | Signal graphique `c` devant `i` |
| 5 | `promueve` | Verbe probable |
| 6 | `comprender` | Infinitif probable en `-er` |
| 7 | `organización` | Suffixe `-ción` |

### Provenance et prudence

Les explications, formulations de prudence, niveaux, confiances et provenances affichées sont celles du paquet JSON.

La page n'interroge pas directement MariaDB et ne recalcule pas les règles linguistiques du mock.

## Interactions qui restent locales

Les interactions suivantes restent dans le JavaScript de Seven Sieves :

- tamis actif ;
- affichage ou masquage des indices ;
- occurrence inspectée ;
- sélection par double-clic ou bouton ;
- statuts `compris`, `doute`, `inconnu` ;
- compteurs de sélection ;
- comparaison avec les enrichissements du tamis actif ;
- réinitialisation.

Ces données disparaissent au rechargement. Elles ne sont pas ajoutées au mock et ne sont envoyées à aucun serveur.

## Ce qui reste encore codé en dur

L'intégration ne cherche pas encore à rendre toute l'interface configurable. Restent dans la page ou le script :

- la structure HTML et le CSS ;
- les sept emplacements de boutons ;
- les micro-guides génériques ;
- les libellés de légende et leur style ;
- les règles visuelles associant un tamis à une classe CSS ;
- les messages génériques de sélection et de progression ;
- l'aide d'utilisation ;
- le chemin relatif `./mock/analysis-response-v0.json` ;
- le comportement local des clics et statuts ;
- le script historique, conservé mais rendu inactif dans la copie expérimentale.

Ces éléments relèvent principalement de Seven Sieves Explorer et n'ont pas tous vocation à venir de Dico-IC.

## Fallback de chargement

Si le `fetch` échoue, la page affiche :

- que le mock JSON n'a pas pu être chargé ;
- qu'un serveur HTTP local est nécessaire ;
- que le prototype historique reste disponible dans `index-0.0.8.2.html`.

L'ancien prototype n'est pas utilisé automatiquement comme moteur de secours. Ce choix évite de masquer une erreur d'intégration en revenant silencieusement aux données codées en dur.

## Vérifications réalisées

La vérification statique confirme :

- JSON valide ;
- 92 tokens ;
- index continus à partir de zéro ;
- offsets UTF-16 cohérents pour tous les tokens ;
- un enrichissement pour chacun des sept tamis ;
- transformation `organización → organisation` ;
- syntaxe JavaScript valide.

La page a également été chargée depuis un serveur HTTP statique local. Les contrôles dans le navigateur confirment :

- chargement du mock sans erreur ;
- reconstruction du texte et de la ponctuation ;
- affichage des 92 tokens ;
- lecture dynamique du repère `ES → FR · IT / PT` ;
- affichage d'un résultat pour chacun des sept tamis ;
- conservation de la sélection après changement de tamis ;
- inspection détaillée de `organización` ;
- statut local `compris` ;
- combinaison correcte des classes de sélection, statut et surlignage.

## Limites de l'intégration mock

### Jeu d'enrichissements volontairement réduit

Le texte contient 92 tokens mais seulement sept enrichissements de démonstration. Le mock prouve le transport et le rendu, pas la couverture linguistique du texte.

### Résultats écrits manuellement

Les enrichissements ne sont pas calculés par Dico-IC. Ils illustrent le contrat attendu.

### Heuristiques expérimentales

Les tamis 4, 5 et 6 utilisent des exemples heuristiques. Ils ne correspondent pas encore à un moteur linguistique stabilisé ni nécessairement à des données présentes dans le schéma SQL.

### Pas encore de texte libre dans cette copie

La page charge le texte contenu dans le mock. Elle ne contient pas encore la zone de collage, l'import `.txt` et les sélecteurs nécessaires pour construire une requête réelle.

### Serveur HTTP nécessaire

Le chargement par `fetch` exige que le dossier soit servi par HTTP. Une ouverture directe du fichier HTML peut être bloquée par les règles de sécurité du navigateur.

### Ancien moteur conservé comme référence

Le code historique est encore présent, mais inactif, dans la copie. Il pourra être retiré une fois la nouvelle intégration suffisamment éprouvée.

### Pas de validation complète de schéma JSON

Le script vérifie les champs essentiels et les offsets, mais n'implémente pas un validateur JSON Schema complet.

## Prochaines étapes vers `POST /analysis`

1. Ajouter dans Seven Sieves une zone de collage et un import `.txt` local.
2. Ajouter les sélecteurs de langue source, de médiation et de comparaison.
3. Construire le corps de requête conforme à `api-analysis-contract-v0.md`.
4. Remplacer le `GET` du fichier mock par un `POST /analysis` avec `fetch`.
5. Conserver sans changement le rendu actuel de `sieves`, `tokens`, `enrichments` et `warnings`.
6. Configurer l'URL de base de l'API sans framework.
7. Gérer les erreurs HTTP `400`, `413`, `422` et `500` tout en conservant le texte saisi.
8. Configurer CORS pour l'origine statique de Seven Sieves.
9. Implémenter côté Dico-IC une tokenisation produisant les mêmes offsets UTF-16.
10. Alimenter progressivement les tamis depuis `lexical_form`, `form_relation`, `ic_feature` et `pattern_rule`.

## Conclusion

Cette intégration confirme qu'une page HTML/JavaScript légère peut consommer le paquet V0 sans dépendre d'un framework ni d'une sauvegarde serveur.

Le texte, les langues, les tamis et les enrichissements sont maintenant transportés par JSON. Seven Sieves conserve son rôle de client interactif, tandis que Dico-IC reste le futur fournisseur stateless de l'analyse.
