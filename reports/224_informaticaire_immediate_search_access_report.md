# Mission 224 — Rendre la recherche immédiatement accessible dans Informaticaire

Date : 20 août 2026

## Résultat

L’accueil d’Informaticaire permet désormais de lancer immédiatement une recherche dans la bibliothèque, sans passer d’abord par une page de présentation ou un défilement long.

La nouvelle zone d’entrée transmet exactement la chaîne saisie au champ `search-input`, réinitialise seulement le focus documentaire éventuel, appelle les fonctions existantes `renderFilters()` et `renderCards()`, ouvre `#bibliotheque`, puis place le focus et le curseur dans la recherche de la bibliothèque. Aucun second moteur de recherche n’a été créé.

Quatre accès rapides réutilisent les filtres déjà déclarés dans `data.js` :

| Accès public | Filtre existant activé |
|---|---|
| Projets | type `projet` |
| Acteurs | type `acteur` |
| Ressources | type `ressource` |
| À sauver | statut `à récupérer` |

Une recherche vide ouvre la bibliothèque avec le filtre `Tous` et les 110 fiches. Une nouvelle recherche depuis l’accueil remplace correctement la requête précédente.

## Accueil et navigation

Le titre, le propos général, la visite guidée, la démonstration, la contribution et les cinq compteurs dynamiques sont conservés.

La hauteur d’accueil a été réduite sans refonte générale :

- suppression de la hauteur minimale plein écran ;
- titre et texte introductif légèrement resserrés ;
- marges verticales réduites ;
- compteurs présentés dans une grille compacte à deux colonnes ;
- recherche placée avant les autres parcours d’accueil.

Le libellé public « Fiches » de la navigation devient « Explorer ». L’identifiant et le hash techniques `#bibliotheque` restent inchangés.

## Préservation du moteur existant

La fonction locale `activateLibrary()` ne réalise aucune recherche elle-même. Elle configure l’état déjà utilisé par la bibliothèque, sélectionne l’un des objets du tableau `filters`, puis déclenche les deux rendus existants.

Les fonctions de normalisation, de comparaison compacte, de classement, d’affichage des résultats, de fiche détaillée, de relation, d’export et de recherche Miriadi restent inchangées.

Les tests utilisent le moteur réel pour confirmer notamment :

- `EuroComRom` classe la fiche `eurocomrom` en premier ;
- `EuRom5` classe la fiche distincte `eurom` en premier ;
- chacun des quatre filtres rapides renvoie des résultats et reste réellement actif.

## Données préservées

Ni `data.js` ni `data_original.js` n’ont été modifiés.

| Contrôle | Valeur initiale et finale |
|---|---:|
| fiches | 110 |
| identifiants uniques | 110 |
| filtres | 18 |
| entrées de frise | 13 |
| liens `relatedItems` | 414 |
| relations typées | 86 |
| cibles `relatedItems` manquantes | 0 |
| cibles de relations manquantes | 0 |

Empreintes SHA-256 initiales et finales :

- `data.js` : `34e1fcc7c6a645b3512083d083f2594ee5610c37b1313d6e6d459fcccf5a5626` ;
- `data_original.js` : `9126ef227b07448a55173e83f371cdeba2ea361cc050db39a1ef3325d20e10b8`.

Les contenus, acteurs, ressources, liens, relations et distinctions éditoriales du corpus consolidé sont donc préservés à l’octet près.

## Fichiers concernés

- `prototypes/07-informaticaire/index.html` ;
- `prototypes/07-informaticaire/styles.css` ;
- `prototypes/07-informaticaire/script.js` ;
- `prototypes/07-informaticaire/README.md` ;
- `prototypes/07-informaticaire/informaticaire-immediate-search.test.js` — nouveau ;
- `reports/224_informaticaire_immediate_search_access_report.md` — nouveau.

Aucun autre prototype, service, jeu de données ou fichier historique n’est modifié.

## Version

La version publique d’Informaticaire passe de l’état démontrable `0.6.5` à `0.6.6`.

La source de vérité publique est maintenant explicite dans la balise `app-version`, l’indication d’accueil, le pied de page et le README. Les noms historiques des exports `v0.6` sont volontairement conservés afin de ne pas modifier leur contrat dans cette mission.

## Tests et contrôles

Résultats :

- syntaxe `script.js` : réussie ;
- syntaxe `data.js` : réussie ;
- tests ciblés et suite locale complète : 5/5 réussis ;
- transfert exact de la requête : réussi ;
- requête vide et nouvelle recherche : couverts ;
- activation réelle des quatre filtres : réussie ;
- navigation vers `#bibliotheque` et focus de poursuite : couverts ;
- accès direct à `#bibliotheque` : structure et rendu initial préservés ;
- chemins relatifs et absence de dépendance réseau : compatibles avec le fonctionnement `file://` ;
- intégrité des données et relations : réussie ;
- `git diff --check` : réussi.

Le prototype ne possède pas d’autre suite automatisée locale. Aucun appel OpenAI, export ou écriture de données n’a été déclenché.

## Validation visuelle et `file://`

Le navigateur intégré a pu être initialisé, mais sa politique de sécurité a explicitement refusé l’ouverture de l’URL locale `file://`. Le refus interdit également le recours à une autre surface ou à un contournement pour la même vérification. La fenêtre temporaire a été fermée et la taille du navigateur restaurée.

En conséquence, les dimensions `1440 × 900` et `1366 × 768`, l’absence d’erreur console en exécution réelle et le parcours navigateur `file://` n’ont pas pu être validés automatiquement. La structure responsive, les chemins locaux et les comportements ont été vérifiés statiquement et par tests, mais ne valent pas cette validation visuelle.

Recette humaine courte :

1. ouvrir `index.html` directement en `file://` à `1440 × 900`, puis à `1366 × 768` ;
2. confirmer que la recherche, son bouton et les quatre accès rapides sont visibles dès le premier écran, sans débordement horizontal ;
3. rechercher successivement `EuroComRom`, `EuRom5`, une chaîne vide puis `Galanet` ; vérifier le hash `#bibliotheque`, la valeur du champ, les résultats et le focus ;
4. revenir à `#accueil`, lancer une nouvelle recherche et tester Projets, Acteurs, Ressources puis À sauver ;
5. charger directement `index.html#bibliotheque`, ouvrir une fiche, suivre une relation et vérifier les exports sans les télécharger si aucun export n’est souhaité ;
6. vérifier la console, la recherche Miriadi, la frise, les compteurs et les autres parcours conservés.

Cette recette reste une validation humaine de David.

## Services et limites

Informaticaire est un prototype statique. Aucun service IC-Lab-Next n’a été démarré, arrêté ou redémarré. MariaDB et les services non concernés n’ont pas été sollicités.

Aucune refonte graphique générale, animation, nouvelle visualisation ou réorganisation des sections narratives n’a été réalisée.

Aucun commit, push ou déploiement n’a été effectué.

## Message de commit proposé

```text
feat(informaticaire): rendre la recherche accessible dès l’accueil (mission 224)
```
