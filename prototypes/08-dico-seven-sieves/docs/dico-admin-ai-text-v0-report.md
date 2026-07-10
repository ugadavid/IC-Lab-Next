# Dico-IC Admin - Assistant IA par texte V0

## Objectif

Cette V0 ajoute une page d’administration indépendante qui part d’un texte pour repérer les formes déjà présentes dans Dico-IC et préparer des brouillons uniquement pour les formes absentes.

Le principe reste strict : l’IA propose, l’humain révise et sélectionne, puis l’API admin écrit. Aucun résultat OpenAI n’est inséré automatiquement.

## Fichiers créés

- `admin/index-admin-ai-text-0.1.html` : page indépendante en trois étapes.
- `admin/css/admin-ai-text-0.1.css` : styles propres à l’analyse de texte, en complément du style Domaine.
- `admin/js/admin-ai-text-0.1.js` : couverture, génération, édition et rapport de création.
- `Node/src/admin-ai-text.js` : validation, dédoublonnage, couverture lexicale et génération structurée.
- `Node/test/admin-ai-text.test.js` : tests unitaires de la V0 Texte.
- `docs/dico-admin-ai-text-v0-report.md` : présent rapport.

## Fichiers modifiés

- `Node/server.js` : ajout des routes de couverture et de génération Texte.
- `Node/src/repository.js` : ajout d’une lecture par lot des `normalized_lemma`.
- `Node/src/admin-ai-domain.js` : extraction du mécanisme OpenAI structuré commun, sans changement de contrat pour la page Domaine.

Aucun fichier SQL, aucune table, `POST /analysis` et Seven Sieves Explorer n’ont été modifiés.

## Endpoints

### `POST /admin/text-coverage`

Endpoint de lecture seule utilisé avant l’IA.

```json
{ "text": "École bibliothèque zéphyr" }
```

Il tokenise avec la logique existante, normalise sans diacritiques pour la recherche, regroupe les occurrences et compare en une requête paramétrée les formes uniques à `lexical_form.normalized_lemma`.

La réponse sépare `known_forms` et `unknown_forms` et fournit les compteurs `total_words`, `unique_forms`, `known_forms` et `unknown_forms`.

### `POST /admin/ai/text-candidates`

```json
{
  "unknown_words": ["bibliothèque", "zéphyr"],
  "languages": ["fr", "es", "it", "pt"]
}
```

La liste doit être non vide, contient au plus 100 formes, est dédoublonnée avec la normalisation Dico-IC et n’accepte que des langues actives. La réponse reprend exactement la structure des candidats de la V0 Domaine.

## Workflow

1. L’administrateur colle un texte et lance l’analyse.
2. L’API extrait les mots, regroupe les formes et interroge Dico-IC en lecture seule.
3. La page affiche les quatre compteurs et deux listes distinctes : formes couvertes et formes absentes.
4. L’administrateur choisit les langues et demande des propositions pour les seules formes absentes.
5. OpenAI renvoie un JSON soumis au même schéma strict que la V0 Domaine.
6. Les candidats restent des brouillons éditables, sélectionnables, désélectionnables et supprimables.
7. Le bouton final envoie chaque brouillon retenu exclusivement à `POST /admin/lexical-entry`.
8. Le rapport indique les créations, doublons, erreurs et lignes ignorées.

## Réutilisation de la V0 Domaine

La page Texte reprend le tableau d’édition, la validation visuelle, la sélection en lot et le rapport de création de la page Domaine. Côté serveur, les deux assistants partagent désormais l’appel Responses API, le modèle configurable, le schéma JSON strict, le parsing et les contrôles de langues et catégories grammaticales.

La clé reste lue côté serveur depuis l’environnement ou `admin/.env`. Le serveur statique refuse les fichiers cachés : une lecture de `/admin-app/.env` renvoie `404`.

## Séparation des responsabilités

- **IA** : propose des concepts et formes multilingues pour les absents transmis.
- **Humain** : relit, corrige, sélectionne ou supprime chaque brouillon.
- **API** : valide les données et réalise l’unique écriture autorisée via `POST /admin/lexical-entry`.
- **MariaDB** : fournit la couverture actuelle et reçoit seulement les entrées explicitement validées.

## Tests

La suite Node couvre : texte vide, texte au-delà de 20 000 unités UTF-16, liste inconnue vide, parsing d’un JSON IA valide et séparation d’une forme connue après normalisation.

Résultat : **14 tests réussis sur 14**, tests historiques inclus. Les fichiers JavaScript passent également la vérification syntaxique Node.

Des contrôles réels ont confirmé :

- la lecture MariaDB par lot ;
- la reconnaissance de `École` comme `ecole` ;
- un appel OpenAI réel avec `gpt-4.1-mini` ;
- le rendu bureau et mobile ;
- l’absence d’écriture pendant l’analyse et la génération.

## Exemple réel

Pour `École bibliothèque zéphyr`, la base locale a renvoyé :

- 3 mots détectés ;
- 3 formes uniques ;
- 1 forme connue : `École`, reliée à `SCHOOL_PLACE` ;
- 2 formes absentes : `bibliothèque` et `zéphyr`.

La génération a ensuite produit deux brouillons avec quatre formes linguistiques chacun. Aucun bouton de création n’a été déclenché pendant le test.

## Limites V0

- La couverture repose sur l’égalité de `normalized_lemma`, sans lemmatisation contextuelle.
- Les formes homographes connues dans une langue quelconque sont considérées comme couvertes.
- Les mots fonctionnels et variantes fléchies peuvent donc apparaître parmi les absents.
- OpenAI ne reçoit pas la phrase complète : cette V0 limite volontairement les données transmises aux formes absentes.
- Une forme absente produit au plus un brouillon ; la polysémie n’est pas résolue.
- La génération est limitée à 100 formes par appel.
- Il n’existe ni authentification ni historique des générations dans cette V0 locale.

## Pistes V1

- Ajouter une langue source à la couverture pour réduire les homographes interlangues.
- Introduire une lemmatisation légère ou une sélection manuelle des absents avant l’appel IA.
- Envoyer un contexte court et explicitement validé pour désambiguïser les concepts.
- Afficher les correspondances partielles et les variantes déjà connues.
- Ajouter une prévisualisation du paquet lexical avant la création en lot.

La V0 reste volontairement stateless et réversible : tant que l’humain n’appuie pas sur le bouton final, la base ne change pas.
