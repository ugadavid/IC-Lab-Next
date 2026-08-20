# Mission 225 — Intégration visuelle et relationnelle d’Informaticaire

Date : 20 août 2026  
Version publique obtenue : **0.7.0**  
Périmètre applicatif : `prototypes/07-informaticaire`  
Statut : réalisée sans commit, push ni déploiement

## Résumé

La maquette validée a été transposée dans l’application statique réelle sans introduire React, Vinext, bibliothèque graphique ou dépendance réseau. Informaticaire possède désormais trois portes d’entrée réellement exploitables :

1. un accueil compact avec recherche immédiate et aperçu relationnel réel ;
2. un explorateur coloré des 110 fiches ;
3. une carte SVG contextuelle alimentée uniquement par les 86 relations typées du corpus.

Les anciennes ancres ont été conservées comme panneaux secondaires. Les changements de fonction remplacent maintenant le panneau visible au lieu de faire défiler une page unique. Les données éditoriales n’ont pas été modifiées.

## État initial observé

- dernier commit applicatif : `90ff7c7 feat(informaticaire): rendre la recherche accessible dès l’accueil (mission 224)` ;
- état Git initial : seul le dossier de maquette `prototypes/07-informaticaire/informaticaire-maquette-sites/` était non suivi ;
- 110 fiches et 110 identifiants uniques ;
- 414 liens `relatedItems` ;
- 86 relations typées ;
- 18 filtres ;
- 13 jalons de frise ;
- aucune cible interne ou relationnelle manquante ;
- architecture statique HTML, CSS et JavaScript, sans backend métier.

Empreintes initiales :

| Fichier | SHA-256 |
|---|---|
| `data.js` | `34e1fcc7c6a645b3512083d083f2594ee5610c37b1313d6e6d459fcccf5a5626` |
| `data_original.js` | `9126ef227b07448a55173e83f371cdeba2ea361cc050db39a1ef3325d20e10b8` |

## Architecture retenue

### Navigation par vues

Chaque section éditoriale existante possède une famille `data-view-family`. La fonction `showAppView` :

- masque tous les panneaux sauf celui demandé ;
- active la famille principale correspondante ;
- construit la sous-navigation de cette famille ;
- conserve la recherche, le filtre et la fiche ciblée ;
- met à jour l’ancre sans utiliser `scrollIntoView` ;
- permet l’ouverture directe d’une ancienne ancre et la navigation arrière par l’historique.

La marque Informaticaire reste le retour à l’accueil. Les cinq entrées principales sont exactement : Explorer, Carte, Visite, Contribuer et Comprendre.

### Accueil

- titre public : « Les ressources de l’IC se retrouvent. » ;
- recherche et raccourcis de la Mission 224 conservés ;
- transmission exacte de la chaîne saisie à la recherche principale ;
- focus replacé dans la recherche Explorer ;
- aperçu relationnel construit autour de Miriadi à partir de relations réelles ;
- compteurs issus du corpus ;
- accès directs aux 110 fiches, à la visite, à la démo et à la contribution.

### Explorateur

La couleur de fond indique la famille documentaire :

- projet : bleu clair ;
- plateforme : lavande ;
- ressource, outil ou corpus : vert pastel ;
- acteur : corail pastel ;
- concept ou besoin structurant : jaune doux.

L’état documentaire reste un signal séparé avec une pastille et un point coloré. Chaque carte indique son degré relationnel et propose deux actions distinctes : ouvrir la fiche ou ouvrir son voisinage dans la Carte. La recherche, les 18 filtres, les liens internes, les liens externes et le détail complet sont conservés.

### Carte relationnelle

La Carte repose sur deux fonctions internes :

- `relationEntries` transforme chaque entrée de `item.relations` en une arête source, cible, type et note ;
- `buildRelationNeighborhood` sélectionne uniquement les relations entrantes ou sortantes de la fiche centrale.

La vue n’utilise pas `relatedItems` pour fabriquer des arêtes. Le test compare les 86 entrées indexées aux 86 quadruplets réels du corpus. Pour Miriadi, la construction donne 11 relations réelles vers 8 voisins distincts.

Le SVG affiche une ligne par voisin. Lorsque plusieurs relations réelles concernent le même voisin, leurs libellés réels sont réunis sur cette ligne et le panneau latéral conserve les relations individuellement. Le panneau présente :

- type et état documentaire ;
- titre et résumé ;
- nombre de relations entrantes et sortantes ;
- libellé exact, fiche liée et note éventuelle de chaque relation ;
- actions pour recentrer le voisinage et ouvrir la fiche liée ;
- action pour ouvrir la fiche centrale complète.

Le sélecteur permet d’atteindre les 110 fiches, y compris celles sans relation. La navigation peut continuer de proche en proche. La carte ne produit donc jamais un graphe global illisible de 110 nœuds. Les animations sont limitées aux retours de survol et neutralisées avec `prefers-reduced-motion`.

## Correspondance de la navigation

| Ancienne entrée | Nouvelle famille | Emplacement final |
|---|---|---|
| Concept | Comprendre | Le concept |
| Visite | Visite | Visite en 5 étapes |
| Démo rapide | Visite | Démo Galanet |
| Pour qui ? | Comprendre | Pour qui ? |
| Je veux… | Visite | Par intention |
| Frise | Comprendre | Frise historique |
| Explorer | Explorer | Toutes les fiches |
| À partager | Explorer | À partager |
| Contribuer | Contribuer | Préparer une contribution |
| Relations | Carte | Lectures guidées, en complément du nouveau voisinage interactif |
| Sauver | Contribuer | Campagne de récupération |
| Limites | Comprendre | Limites |
| Décisions | Comprendre | Décisions |
| À sauver | Explorer | À sauver / vérifier |
| Besoins | Comprendre | Besoins |

Aucune des quinze sections historiques n’a disparu.

## Fonctions préservées

- recherche exacte depuis l’accueil et recherche principale ;
- 18 filtres par type, statut et public ;
- classement des résultats et tolérance des alias ;
- fiches détaillées et navigation entre fiches ;
- liens externes ;
- recherche avancée Miriadi ;
- export JSON des fiches, renommé `informaticaire_items_v0.7.0.json` ;
- export CSV de récupération, renommé `informaticaire_recovery_v0.7.0.csv` ;
- visite guidée et parcours d’intention ;
- démo Galanet ;
- campagne de récupération ;
- préparation locale des contributions et corrections ;
- anciennes lectures relationnelles guidées ;
- ancres et ouverture directe par hash ;
- chargement local par scripts classiques, sans module ni ressource externe.

## Fichiers modifiés ou créés

- `prototypes/07-informaticaire/index.html` : cinq familles, accueil 0.7.0, aperçu relationnel et nouvelle Carte ;
- `prototypes/07-informaticaire/styles.css` : identité pastel, navigation, familles chromatiques, graphe SVG et responsive ;
- `prototypes/07-informaticaire/script.js` : gestion des vues, voisinages réels, rendu SVG et liaisons Explorer → Carte → fiche ;
- `prototypes/07-informaticaire/README.md` : version et fonctions 0.7.0 ;
- `prototypes/07-informaticaire/informaticaire-immediate-search.test.js` : adaptation de la régression Mission 224 au changement de vue ;
- `prototypes/07-informaticaire/informaticaire-relational-navigation.test.js` : nouvelle suite relationnelle, navigation et responsive ;
- `reports/225_informaticaire_visual_relational_integration_report.md` : présent rapport.

Le dossier de maquette fourni a uniquement servi de référence et n’a pas été modifié.

## Vérifications automatisées

Commandes :

```text
node --check prototypes/07-informaticaire/script.js
node --test prototypes/07-informaticaire/informaticaire-immediate-search.test.js prototypes/07-informaticaire/informaticaire-relational-navigation.test.js
git diff --check
```

Résultats :

- syntaxe JavaScript valide ;
- 10 tests sur 10 réussis ;
- 110 fiches et 110 identifiants uniques ;
- 414 liens ;
- 86 relations typées ;
- aucune cible manquante ;
- requête d’accueil transmise à l’identique ;
- filtre et recherche conservés pendant un remplacement de panneau ;
- construction relationnelle identique au corpus source ;
- présence des chemins Explorer → Carte et Carte → fiche ;
- fonctions d’export, Miriadi, contribution et démo toujours présentes ;
- aucune dépendance externe ;
- aucune séquence de mojibake détectée ;
- aucune erreur de whitespace dans le diff.

## Recette HTTP et visuelle

Route utilisée : `http://127.0.0.1:8790/demos/informaticaire/`.

Le service a répondu `HTTP 200` et a servi la version `0.7.0`.

### 1440 × 900

- accueil : titre exact, cinq accès principaux, 110 fiches et 86 relations affichés ;
- un seul panneau visible : `accueil` ;
- recherche `  EuRom5  ` transmise avec ses espaces, filtre `Tous` conservé, focus sur `search-input` ;
- Explorer : trois résultats réels, cartes différenciées et aucun débordement ;
- chemin Explorer → Carte testé sur EuRom ;
- EuRom : deux relations réelles, deux lignes et trois nœuds ;
- ouverture de la fiche complète testée ;
- fiche Miriadi : neuf liens externes et recherche avancée présentes ;
- aucun débordement global après correction du sélecteur de fiche ;
- console : aucune entrée.

### 1366 × 768

- accueil entièrement exploitable, cinq accès principaux visibles ;
- aucun débordement horizontal ;
- Carte Miriadi : huit lignes de voisinage, neuf nœuds, panneau latéral défilable ;
- familles chromatiques contrôlées dans la légende, les nœuds et le panneau ;
- couleurs calculées distinctes pour projet, plateforme, ressource, acteur et concept ;
- aucun débordement global.

Le contrôle visuel a révélé et fait corriger :

1. la largeur intrinsèque du sélecteur de fiche qui dépassait la fenêtre ;
2. une priorité CSS qui appliquait initialement le jaune par défaut à toutes les familles de la Carte.

## Préservation des données

Empreintes finales :

| Fichier | SHA-256 final | Résultat |
|---|---|---|
| `data.js` | `34e1fcc7c6a645b3512083d083f2594ee5610c37b1313d6e6d459fcccf5a5626` | identique à l’état initial |
| `data_original.js` | `9126ef227b07448a55173e83f371cdeba2ea361cc050db39a1ef3325d20e10b8` | identique à l’état initial |

Aucune fiche, relation, note, source ou donnée documentaire n’a été renommée ou réécrite.

## Services et processus

- aucun service n’a été arrêté ou démarré par la mission ;
- IC-Hub était déjà actif et répond encore sur le port 8790 ;
- le processus Node à l’écoute observé en fin de mission porte le PID `47684` ;
- ce processus préexistant est laissé actif, conformément à l’état fourni par David ;
- aucun appel OpenAI, déploiement ou installation n’a été exécuté.

## Limites et validation humaine restante

- l’ouverture directe `file://` n’a pas été recettée visuellement par le navigateur intégré ; la compatibilité portable est couverte statiquement par l’absence de modules, de dépendances et de chargements externes, ainsi que par les tests ;
- les anciennes lectures en colonnes restent accessibles sous « Lectures guidées » ; elles ne remplacent pas la nouvelle carte basée sur les 86 relations ;
- le panneau latéral utilise son propre défilement pour les voisinages les plus denses afin de garder le graphe visible ;
- les captures et contrôles de Codex ne remplacent pas la validation humaine de David sur la personnalité graphique, les libellés et le confort réel à la souris ou au clavier.

## État Git final

Modifiés :

- `prototypes/07-informaticaire/README.md` ;
- `prototypes/07-informaticaire/index.html` ;
- `prototypes/07-informaticaire/informaticaire-immediate-search.test.js` ;
- `prototypes/07-informaticaire/script.js` ;
- `prototypes/07-informaticaire/styles.css`.

Non suivis :

- `prototypes/07-informaticaire/informaticaire-maquette-sites/` — référence fournie, préservée ;
- `prototypes/07-informaticaire/informaticaire-relational-navigation.test.js` ;
- `reports/225_informaticaire_visual_relational_integration_report.md`.

Aucun commit, push ou déploiement n’a été créé.

## Message de commit proposé

```text
feat(informaticaire): intégrer l’explorateur et la carte relationnelle (mission 225)
```
