# Dico-IC Admin - Assistant IA Relations V0

## Objectif

Cette V0 ajoute un troisième assistant IA indépendant. Il travaille sur une seule `lexical_entry`, propose des relations entre ses formes existantes, signale les paires déjà reliées et attend une validation humaine explicite.

Le principe reste inchangé : l’IA propose, l’humain révise, puis l’API admin écrit. Aucune relation n’est créée automatiquement.

## Fichiers créés

- `admin/index-admin-ai-relations-0.1.html`
- `admin/css/admin-ai-relations-0.1.css`
- `admin/js/admin-ai-relations-0.1.js`
- `Node/src/admin-ai-relations.js`
- `Node/test/admin-ai-relations.test.js`
- `docs/dico-admin-ai-relations-v0-report.md`

## Fichiers modifiés

- `admin/js/admin-0.1.js` : ajout du lien `Relations IA` sur chaque entrée.
- `admin/css/admin-0.1.css` : groupe d’actions compact dans le tableau du lexique.
- `Node/server.js` : lecture ciblée d’une entrée et endpoint de propositions.
- `Node/src/repository.js` : lecture d’une entrée et de ses relations internes.
- `Node/src/admin-ai-domain.js` : micro-factorisation du mécanisme JSON strict afin d’accepter un schéma et un parseur spécialisés, sans changer les contrats Domaine et Texte.

Aucun schéma ou script SQL, aucune page Seven Sieves, aucune page IA existante et aucun comportement de `POST /analysis` n’ont été modifiés.

## Endpoints

### `GET /admin/lexical-entry/:entryKey`

Charge l’entrée réelle, ses formes et les relations dont les deux extrémités appartiennent à cette entrée. La page l’utilise pour son affichage initial.

### `POST /admin/ai/relation-candidates`

Requête minimale :

```json
{ "entry_key": "INTERNATIONAL" }
```

Le navigateur n’envoie aucune forme à OpenAI. Le serveur recharge l’entrée depuis MariaDB et transmet seulement :

- `entry_key` ;
- `gloss_fr` ;
- `gloss_en` ;
- identifiant, langue, lemme et catégorie des formes de cette entrée.

La réponse OpenAI suit un schéma JSON strict :

```json
{
  "candidates": [{
    "left_form_id": 121,
    "right_form_id": 120,
    "relation_type": "COGNATE_STRONG",
    "score": 0.95,
    "justification": "formes quasi identiques"
  }]
}
```

Le backend refuse les identifiants hors de l’entrée, une forme reliée à elle-même, un score hors de `[0, 1]`, un type inconnu, une justification invalide et un candidat répété.

## Workflow

1. Depuis le lexique, `Relations IA` ouvre la page avec `?entry_key=...`.
2. La page charge l’entrée, ses formes et ses relations internes.
3. L’utilisateur demande des propositions.
4. Le backend recharge les données réelles et appelle OpenAI côté serveur.
5. Les propositions sont comparées aux relations présentes dans MariaDB.
6. Le tableau affiche les statuts `Nouvelle`, `Déjà existante` ou `Erreur`.
7. L’utilisateur peut modifier le type et le score, sélectionner, désélectionner ou supprimer une ligne.
8. Le bouton final envoie uniquement les lignes retenues à l’endpoint manuel existant.

## Réutilisation de `POST /admin/form-relation`

L’assistant ne possède aucun endpoint d’écriture spécifique. Chaque relation validée est créée par :

```text
POST /admin/form-relation
```

avec `source_label = ai_relations_v0`. Les validations manuelles existantes, la transaction, le contrôle des formes et le refus des doublons restent donc l’unique chemin d’écriture.

Le rapport de création distingue les relations créées, les doublons, les erreurs et les lignes ignorées.

## Gestion des doublons

Avant l’affichage, le repository charge toutes les relations dont les deux formes appartiennent à l’entrée. Une proposition visant une paire déjà reliée, dans l’un ou l’autre sens, reçoit le statut `Déjà existante` et n’est pas cochée.

Ce contrôle est volontairement conservateur : même si le type existant diffère de la proposition, la paire reste désélectionnée. L’humain évite ainsi de créer par inadvertance des interprétations contradictoires.

L’endpoint manuel effectue encore son propre contrôle transactionnel au moment de l’écriture. Une concurrence ou une relation ajoutée entre-temps produit donc un doublon explicite plutôt qu’une seconde insertion silencieuse.

## Exemple réel `INTERNATIONAL`

La base testée contient :

```text
FR international   id 120
ES internacional   id 121
IT internazionale  id 122
PT internacional   id 123
```

Elle contient déjà :

```text
ES internacional ↔ FR international
COGNATE_STRONG
```

L’appel réel avec `gpt-4.1-mini` a renvoyé trois propositions :

| Paire | Type proposé | Score | Statut calculé |
|---|---:|---:|---|
| FR `international` ↔ ES `internacional` | `COGNATE_STRONG` | 0.95 | déjà existante |
| FR `international` ↔ PT `internacional` | `COGNATE_STRONG` | 0.95 | nouvelle |
| FR `international` ↔ IT `internazionale` | `COGNATE_WEAK` | 0.80 | nouvelle |

Le type et le score restent modifiables avant validation. Aucune de ces propositions nouvelles n’a été écrite pendant le test.

## Tests réalisés

Le nouveau fichier couvre :

- clé d’entrée invalide ;
- entrée inexistante ;
- entrée sans assez de formes ;
- réponse IA valide ;
- refus d’un type inconnu ;
- restriction des identifiants au périmètre de l’entrée ;
- détection d’une relation existante ;
- parsing d’une réponse structurée simulée ;
- création après validation via `POST /admin/form-relation`.

Résultat global : **34 tests réussis sur 34**, assistants Domaine et Texte inclus. Les fichiers JavaScript passent la vérification syntaxique et `git diff --check` ne relève pas d’erreur de contenu.

Les vérifications locales ont aussi confirmé :

- chargement réel de `INTERNATIONAL` depuis MariaDB ;
- lecture de ses quatre formes et de sa relation interne ;
- appel OpenAI réel et annotation du doublon ;
- page servie avec un statut HTTP `200` ;
- refus HTTP `404` de `/admin-app/.env`.

Le contrôle visuel automatisé dans le navigateur intégré n’a pas pu être exécuté lors de cette passe : le connecteur a rejeté les métadonnées de sandbox avant son initialisation. Aucun outil de contournement n’a été utilisé. Le HTML, le CSS, le JavaScript, le chargement HTTP et les endpoints ont néanmoins été vérifiés séparément.

## Sécurité

- La clé OpenAI reste côté serveur.
- `admin/.env` reste inaccessible au serveur statique.
- Le client n’envoie que `entry_key` au nouvel endpoint IA.
- Les identifiants de formes sont rechargés et contrôlés côté serveur.
- L’IA n’accède ni à la base globale ni à d’autres entrées.
- Aucune écriture n’a lieu avant l’action humaine finale.

## Limites V0

- Une seule entrée est analysée à la fois.
- Maximum de 20 formes, soit 190 paires théoriques.
- Pas de relation entre entrées différentes.
- Pas de génération en lot depuis tout le dictionnaire.
- Pas d’historique des générations.
- Pas de modification de la justification.
- Pas de suppression ou modification d’une relation existante depuis cette page.
- La qualité des types et scores proposés reste dépendante du modèle et doit être relue.
- Une paire déjà reliée avec un autre type est traitée comme existante par prudence.

## Pistes V1

- Afficher les détails complets de la relation existante dans la ligne.
- Permettre une justification humaine complémentaire avant création.
- Ajouter une option de comparaison ciblée par langue de référence.
- Proposer une détection locale de similarité pour aider au tri, sans écriture automatique.
- Ajouter un historique non persistant de la session de validation.
