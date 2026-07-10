# Dico-IC Admin V0

## Statut et rôle

Dico-IC Admin V0 est une application locale distincte de Seven Sieves Explorer. Elle sert à consulter le modèle actuel et à enrichir manuellement le lexique mutualisé. Seven Sieves reste un client de lecture de `POST /analysis` ; l’admin écrit uniquement dans les tables lexicales existantes.

Cette V0 ne contient ni IA, ni gestion d’activité, ni profil enseignant, ni donnée apprenante.

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `admin/index-admin-0.1.html` | structure de l’application d’administration |
| `admin/css/admin-0.1.css` | interface de travail responsive, sans framework |
| `admin/js/admin-0.1.js` | chargement du modèle, recherche, formulaire et messages |
| `Node/src/admin.js` | validation et normalisation des créations lexicales |
| `Node/test/admin.test.js` | tests de normalisation et de doublons internes à une requête |
| `docs/dico-admin-v0-report.md` | présent rapport |

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `Node/server.js` | ajout des trois routes `/admin` et de leurs réponses d’erreur |
| `Node/src/repository.js` | lectures admin et création transactionnelle entrée + formes |

Aucun fichier SQL, aucun prototype Seven Sieves et aucun fichier situé dans `prototypes/` n’a été modifié.

## Endpoints ajoutés

### `GET /admin/model-summary`

Retourne les nombres actuels de langues, entrées, formes, relations, règles et traits IC. La réponse contient aussi une description courte du rôle des six tables existantes.

### `GET /admin/lexical-entries`

Retourne les entrées avec leurs formes et accepte :

- `limit`, compris entre 1 et 100, avec 30 par défaut ;
- `search`, appliqué à `entry_key`, `gloss_fr` et `semantic_domain`.

Les entrées les plus récentes apparaissent d’abord. Les requêtes utilisent des paramètres préparés.

### `POST /admin/lexical-entry`

Valide une clé technique, une glose française et une à vingt formes. Chaque langue doit exister parmi les langues actives. Le lemme normalisé est calculé côté API avec la même fonction que `POST /analysis` : minuscules Unicode, décomposition NFD et suppression des diacritiques.

L’ajout suit une transaction unique :

1. contrôle de l’absence de `entry_key` avec verrou de lecture ;
2. appel de `sp_upsert_lexical_entry` ;
3. appel de `sp_upsert_lexical_form` pour chaque forme ;
4. lecture du résultat puis commit.

Une clé existante ou une collision avec une forme existante provoque un rollback et une réponse `409 DUPLICATE_ENTRY`. Une requête invalide produit une réponse `400` avec le champ concerné.

## Interface

La page admin présente quatre sections :

- résumé chiffré et description du modèle ;
- langues actives ;
- dernières entrées lexicales avec recherche ;
- ajout d’une entrée et de plusieurs formes linguistiques.

Après une création réussie, la liste et le résumé sont rechargés automatiquement, puis la liste est filtrée sur la nouvelle clé. Les messages distinguent chargement, succès, validation et doublon.

Les quatre lignes `fr`, `es`, `it` et `pt` sont proposées par défaut dans le formulaire, mais peuvent être retirées ou complétées avec les autres langues actives.

## Vérifications réalisées

- cinq tests Node réussis, dont deux propres à l’admin ;
- `GET /admin/model-summary` : HTTP 200 ;
- `GET /admin/lexical-entries?limit=5` : HTTP 200 ;
- doublon d’une entrée existante : HTTP 409 sans modification ;
- création transactionnelle de `SCHOOL_PLACE` : HTTP 201 avec quatre formes ;
- vérification de `école → ecole` dans `normalized_lemma` ;
- seconde création de `SCHOOL_PLACE` : HTTP 409 ;
- recherche de `SCHOOL_PLACE` et affichage de ses quatre formes dans l’interface ;
- message visible : `Doublon : L’entrée SCHOOL_PLACE existe déjà.` ;
- aucune erreur JavaScript observée pendant le parcours de consultation.

L’entrée `SCHOOL_PLACE` créée pendant le test reste dans la base locale comme exemple fonctionnel demandé. Aucun script seed n’a été modifié pour l’y ajouter.

## Test local

1. Vérifier que MariaDB expose `ic_dico` sur le port 3306.
2. Depuis `Node/`, lancer `npm start`.
3. Servir la racine du projet par HTTP, par exemple sur le port 8770.
4. Ouvrir `http://127.0.0.1:8770/admin/index-admin-0.1.html`.
5. Consulter les compteurs, les langues et le lexique.
6. Rechercher une clé puis soumettre une entrée avec au moins une forme.
7. Soumettre à nouveau la même clé pour vérifier le message de doublon.

## Limites V0

- aucune authentification ni autorisation ; usage local uniquement ;
- aucune modification ou suppression d’entrée ;
- aucune création de relation, règle ou trait IC depuis l’interface ;
- catégories grammaticales limitées à une liste simple côté interface, alors que le schéma reste textuel ;
- provenance réduite à une note générique `Ajout manuel via Dico-IC Admin V0` ;
- pas de pagination au-delà de la limite demandée ;
- pas de validation linguistique des concepts ou traductions ;
- pas d’historique, versionnement ou attribution utilisateur ;
- l’URL API `http://localhost:3000` est fixe dans cette première page locale.

## Prochaines étapes IA

### V1 : propositions depuis un domaine

Une future fonctionnalité pourrait recevoir un domaine pédagogique et proposer un lot d’entrées candidates. Ces propositions devraient rester des brouillons en mémoire côté interface jusqu’à une validation explicite. Avant cette étape, il faudra définir la provenance, le niveau de confiance et la politique de détection des doublons sémantiques.

### V2 : propositions depuis un texte

Une étape ultérieure pourrait extraire du texte des formes absentes ou peu couvertes, proposer leurs regroupements multilingues et suggérer des relations. Cette logique devra rester séparée de `POST /analysis` : l’analyse Seven Sieves demeure stateless, tandis que seule une action admin explicite peut enrichir Dico-IC.

Aucune de ces fonctions IA n’est implémentée dans la V0.
