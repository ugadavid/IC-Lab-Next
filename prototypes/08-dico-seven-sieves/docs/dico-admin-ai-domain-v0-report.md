# Dico-IC Admin IA par domaine V0

## Objectif

Cette page expérimentale prépare le peuplement lexical assisté par IA à partir d’un domaine pédagogique. Elle reste séparée de l’administration manuelle et de Seven Sieves Explorer.

Le principe V0 est strict : **l’IA propose, l’humain révise et sélectionne, l’API admin écrit**. La génération ne persiste rien dans MariaDB.

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `admin/index-admin-ai-domain-0.1.html` | page indépendante de génération et révision |
| `admin/css/admin-ai-domain-0.1.css` | interface de travail dédiée, sans framework |
| `admin/js/admin-ai-domain-0.1.js` | brouillons locaux, édition, sélection et rapport de création |
| `Node/src/admin-ai-domain.js` | validation, configuration serveur, appel OpenAI et parsing strict |
| `Node/test/admin-ai-domain.test.js` | tests des requêtes et réponses IA |
| `docs/dico-admin-ai-domain-v0-report.md` | présent rapport |
| `.gitignore` | exclusion explicite de `admin/.env` |

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `Node/server.js` | ajout de `POST /admin/ai/domain-candidates` |
| `Node/src/repository.js` | détection par lot des `entry_key` déjà présentes |

La page `admin/index-admin-0.1.html`, Seven Sieves, `POST /analysis`, les scripts SQL et le schéma ne sont pas modifiés.

## Endpoint IA

### `POST /admin/ai/domain-candidates`

Requête :

```json
{
  "domain": "école",
  "count": 10,
  "languages": ["fr", "es", "it", "pt"],
  "level": "A2",
  "parts_of_speech": ["noun", "verb", "adjective"]
}
```

Le serveur vérifie :

- domaine non vide et limité à 100 caractères ;
- nombre limité aux valeurs 10, 20, 30 ou 50 ;
- langues actives, uniques et non vides ;
- niveau parmi A1, A2, B1 et B2 ;
- catégories parmi `noun`, `verb`, `adjective` et `adverb`.

L’appel utilise l’API Responses avec un schéma JSON strict. Le modèle est configurable avec `OPENAI_MODEL` et vaut `gpt-4.1-mini` par défaut. La réponse est reparsée et contrôlée avant d’être transmise au navigateur. Les clés déjà présentes sont renvoyées séparément dans `existing_entry_keys`.

Cet endpoint n’exécute aucun `INSERT`, `UPDATE` ou `DELETE`.

## Clé API

La clé est chargée côté serveur dans cet ordre :

1. variable d’environnement `OPENAI_API_KEY` ;
2. valeur `OPENAI_API_KEY` de `admin/.env`.

Le fichier `.gitignore` exclut explicitement `admin/.env`. La clé n’est présente dans aucun fichier HTML, CSS ou JavaScript client, aucune réponse HTTP et aucun journal de test.

Express sert les pages locales sous `/admin-app` avec `dotfiles: "deny"`. Ainsi, `admin/.env` n’est pas distribué par la route statique de l’application.

## Workflow utilisateur

1. Saisir un domaine pédagogique.
2. Choisir 10, 20, 30 ou 50 propositions.
3. Choisir le niveau, les langues actives et les catégories.
4. Générer un lot de brouillons.
5. Relire et modifier les clés, gloses, domaines, lemmes et catégories.
6. Décocher ou supprimer les propositions indésirables.
7. Utiliser **Créer les entrées sélectionnées**.
8. Lire le rapport : entrées créées, doublons, erreurs et lignes ignorées.

Les brouillons sont conservés uniquement dans la mémoire de la page. Un rechargement les efface.

## Test local

1. Vérifier que MariaDB est disponible sur le port 3306.
2. Vérifier que `admin/.env` contient `OPENAI_API_KEY` ou définir cette variable dans l’environnement du serveur.
3. Depuis `Node/`, lancer `npm start`.
4. Ouvrir `http://localhost:3000/admin-app/index-admin-ai-domain-0.1.html`.
5. Générer un petit lot, corriger les lignes puis ne sélectionner que les entrées réellement souhaitées.
6. Contrôler le rapport avant de consulter les nouvelles entrées dans l’admin général.

Il n’est pas nécessaire de lancer un second serveur statique : Express sert la page en refusant les fichiers cachés.

## Séparation IA, humain et écriture

- **IA** : produit un JSON structuré, sans accès direct à MariaDB.
- **Interface** : marque chaque ligne `Prêt`, `Incomplet`, `Doublon possible` ou `Erreur` et permet la correction.
- **Humain** : choisit explicitement les lignes à garder et déclenche la création.
- **Écriture** : réutilise exclusivement `POST /admin/lexical-entry`, une requête par candidat sélectionné.

Une ligne incomplète ou dotée d’une clé invalide est ignorée lors de la création. Une clé connue est quand même envoyable afin que l’API fournisse un résultat de doublon fiable.

## Tests réalisés

Neuf tests Node réussissent, dont quatre propres à l’assistant IA :

- rejet d’un domaine vide ;
- refus de plus de 50 propositions ;
- parsing d’un JSON candidat valide ;
- rejet d’une langue non demandée.

Un appel OpenAI réel, sans écriture MariaDB, a produit 10 candidats pour le domaine `école`, avec les quatre langues demandées et un JSON conforme.

Le parcours navigateur a ensuite vérifié :

- chargement des langues actives et valeurs FR/ES/IT/PT cochées par défaut ;
- génération de 10 brouillons pour `santé` ;
- détection d’une clé accentuée invalide ;
- correction de la clé vers `HOSPITAL_FACILITY`, passant au statut `Prêt` ;
- tout sélectionner, tout désélectionner et suppression d’une ligne ;
- rapport sans écriture nouvelle sur une clé connue : 0 créée, 1 doublon, 0 erreur, 8 ignorées.
- refus de l’accès HTTP à `/admin-app/.env`.

## Limites V0

- aucune mémoire de brouillon après rechargement ;
- aucune comparaison sémantique avancée avec les entrées existantes ; seul `entry_key` détecte un doublon avant écriture ;
- aucune vérification linguistique automatique des traductions ;
- les hallucinations, faux amis, mauvais genres ou formes peu naturelles restent possibles ;
- la clé technique peut nécessiter une correction humaine malgré le schéma strict ;
- pas de reprise partielle automatique après interruption d’un lot ;
- création séquentielle, donc plus lente pour 50 candidats ;
- pas d’authentification dans cette version locale ;
- coûts et quotas OpenAI non suivis dans l’interface ;
- le modèle par défaut doit être réévalué selon les modèles disponibles sur le compte.

## Points de vigilance

- Ne jamais servir `admin/.env` depuis un serveur HTTP public. Utiliser la route Express `/admin-app`, qui refuse les fichiers cachés, plutôt qu’un serveur statique générique à la racine du projet.
- Restreindre CORS et ajouter une authentification avant tout usage partagé.
- Considérer chaque proposition comme un brouillon, jamais comme une vérité linguistique.
- Vérifier les doublons conceptuels même lorsque les `entry_key` diffèrent.
- Examiner particulièrement les diacritiques, catégories grammaticales et formes polysémiques.
- Conserver la validation humaine comme condition obligatoire avant écriture.

## Suites possibles

1. Ajouter une recherche sémantique de doublons en lecture seule.
2. Ajouter une prévisualisation des effets sur Seven Sieves avant création.
3. Permettre l’export/import local d’un lot de brouillons.
4. Ajouter la proposition depuis un texte comme workflow V2 séparé.
5. Introduire provenance, modèle et date de proposition lorsque le modèle de données aura été validé.

`POST /analysis` reste stateless et aucune donnée apprenante n’est créée.
