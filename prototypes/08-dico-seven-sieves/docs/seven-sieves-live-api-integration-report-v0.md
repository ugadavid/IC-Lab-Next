# Intégration live de Seven Sieves avec Dico-IC V0

## Statut

Cette intégration est une première connexion fonctionnelle entre Seven Sieves Explorer et `POST /analysis`. Elle reste exploratoire, sans framework et sans persistance côté Dico-IC.

Les prototypes `index-0.0.8.2.html`, `index-api-mock-0.1.html`, le script mock, le backend et les fichiers SQL restent inchangés.

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `prototypes/01-seven-sieves/index-api-live-0.1.html` | copie live de l’interface avec saisie du texte, langues, état API et métriques |
| `prototypes/01-seven-sieves/js/seven-sieves-api-live-v0.js` | appel réseau, validation de la réponse, fallback et interactions locales |
| `docs/seven-sieves-live-api-integration-report-v0.md` | présent rapport |

## Fonctionnement

La page propose le texte espagnol du prototype par défaut, mais permet de le remplacer librement. Les langues source et de médiation sont sélectionnables parmi `es`, `fr`, `it` et `pt`. Les mêmes quatre codes sont disponibles comme langues de comparaison ; `it` et `pt` sont cochés par défaut.

Le bouton **Analyser avec Dico-IC** envoie à `http://localhost:3000/analysis` :

```json
{
  "contract_version": "0.1",
  "text": "…",
  "source_language": "es",
  "mediation_language": "fr",
  "comparison_languages": ["it", "pt"],
  "sieves": [1, 2, 3, 4, 5, 6, 7]
}
```

La réponse passe par la même validation que dans la version mock : version du contrat, présence du texte, tamis, warnings, ordre des tokens et cohérence de chaque offset UTF-16. Le texte est ensuite reconstruit à partir des tokens et des portions intermédiaires du texte original.

L’interface affiche :

- l’état de connexion ou de chargement ;
- la paire de langues effectivement renvoyée ;
- le nombre de tokens ;
- le nombre total d’enrichissements ;
- le détail des warnings ;
- le statut et le nombre de résultats de chaque tamis.

## Fallback de développement

Si `fetch` échoue ou si l’API répond par une erreur serveur, la page affiche **Charger le mock de développement**. Ce bouton charge `mock/analysis-response-v0.json` et le fait passer par le même rendu.

Une requête refusée pour une erreur de saisie ou de validation affiche le message de l’API, mais ne présente pas le mock comme substitut : le texte doit alors être corrigé.

Le mock existant n’est ni modifié ni copié dans une nouvelle variante.

## État conservé côté navigateur

Après chargement d’une réponse, Seven Sieves garde uniquement en mémoire JavaScript :

- le tamis actif ;
- les occurrences sélectionnées ;
- l’occurrence inspectée ;
- les statuts `compris`, `doute` et `inconnu` ;
- l’affichage ou non des indices.

Ces données ne sont pas envoyées à l’API et ne sont pas persistées. Une nouvelle analyse réinitialise les états attachés aux anciens offsets, tout en conservant autant que possible le tamis actif.

## Procédure de test locale

1. Démarrer MariaDB avec la base `ic_dico` et les données expérimentales utiles.
2. Depuis `Node/`, lancer `npm start` pour exposer l’API sur `http://localhost:3000`.
3. Servir `prototypes/01-seven-sieves/` par HTTP, par exemple sur le port 8768.
4. Ouvrir `http://127.0.0.1:8768/index-api-live-0.1.html`.
5. Lancer l’analyse, changer de tamis, inspecter un mot, le sélectionner et lui attribuer un statut.
6. Pour tester le fallback, arrêter temporairement l’API, relancer l’analyse, puis charger le mock proposé.

Ouvrir directement la page en `file://` est déconseillé : le mock et les appels réseau dépendent du comportement CORS du navigateur.

## Vérifications effectuées

Le parcours live a été testé dans un navigateur avec le texte par défaut :

- état `API Dico-IC connectée` ;
- paire `ES → FR · IT / PT` ;
- 103 tokens et 39 enrichissements avec les données MariaDB présentes ;
- trois warnings expérimentaux affichés ;
- 92 occurrences de mots interactives, la ponctuation restant non interactive ;
- inspection de `organización`, sélection locale et statut `compris` fonctionnels.

Le fallback a également chargé le mock existant : 92 tokens, 7 enrichissements et 3 warnings. La syntaxe du nouveau fichier JavaScript a été contrôlée avec Node.

## Limites

- L’URL de l’API est fixée à `http://localhost:3000` pour cette V0 locale.
- La liste des quatre langues est déclarée dans la page et n’est pas encore alimentée par `GET /languages`.
- Les sept tamis sont toujours envoyés ; il n’existe pas encore de sélection des tamis avant analyse.
- Les états locaux disparaissent au rechargement de la page et sont réinitialisés lors d’une nouvelle analyse.
- La qualité et le volume des enrichissements dépendent directement des données actuellement chargées dans MariaDB.
- Le script historique présent dans la copie HTML reste encapsulé comme texte non exécuté, conformément à la structure de la version mock.

## Prochaines étapes prudentes

1. Charger les options de langue depuis `GET /languages`, avec les quatre valeurs locales comme secours.
2. Permettre de choisir les tamis à envoyer sans compliquer le parcours par défaut.
3. Rendre l’URL d’API configurable pour les tests hors de `localhost`.
4. Ajouter un test navigateur automatisé couvrant réponse live, erreur réseau et fallback.
5. Décider séparément si certains états locaux doivent survivre à un simple rechargement, sans les envoyer à Dico-IC.
