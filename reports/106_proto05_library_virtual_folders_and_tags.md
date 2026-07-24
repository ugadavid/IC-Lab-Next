# Rapport 106 — Dossiers virtuels et tags persistants

## Statut

Mission arrêtée avant modification fonctionnelle en raison d'un obstacle de
contrat identifié dans le modèle canonique actif.

## Constat vérifié

Le catalogue `data/video-library.json` est en `schemaVersion: "1.0"` et expose
bien les collections canoniques `folders` et `tags`. Chaque asset expose
cependant uniquement :

```json
{ "folderId": null, "tagIds": [] }
```

Le champ `folderId` est singulier. Il ne permet pas de représenter une
appartenance à plusieurs dossiers, exigée par la mission. Le contrat ne contient
ni `folderIds`, ni collection persistée d'associations asset–dossier. Le writer
`canonicalFromRuntime` ne peut donc pas enregistrer plusieurs appartenances sans
introduire une nouvelle structure ou détourner un champ existant.

Les tags sont, eux, prévus minimalement par `tagIds` et la collection canonique
`tags`; ils pourraient être traités séparément, mais livrer les tags seuls
laisserait la mission partiellement réalisée et ne résoudrait pas le blocage
des dossiers multiples.

## Décision de périmètre

Aucun code, catalogue, activité, média ou version n'a été modifié pour cette
mission. Aucun stockage navigateur ou second fichier de classement n'a été
créé. Le serveur hérité de la recette précédente a été arrêté ; aucun nouveau
serveur n'a été lancé.

## Arbitrage requis

Avant implémentation, il faut valider une évolution minimale du contrat, par
exemple une collection d'associations canonique ou un remplacement documenté
de `folderId` par `folderIds`, avec mise à jour versionnée du validateur, du
migrateur, du writer et des tests de compatibilité. Cette décision dépasse une
simple réorganisation d'interface et ne doit pas être introduite implicitement.

Version applicative inchangée : **0.1.32**.

Contrôles réalisés malgré l'arrêt préalable : `npm run check` réussi et
`git diff --check` réussi. Aucun test ciblé de mutation ni recette Chromium n'a
été lancé, puisqu'aucune mutation n'a été implémentée.

Aucun commit ni push.

## Reprise après arbitrage

L'arbitrage de David confirme le périmètre minimal : `folderId` reste singulier
et `tagIds` reste la collection de tags ; aucune évolution de `schemaVersion`,
du validateur ou du migrateur n'a été introduite.

### Réalisation

- routes POST/PATCH/DELETE pour les dossiers virtuels ;
- route PUT de classement d'un asset avec `folderId` et `tagIds` ;
- routes POST/PATCH/DELETE pour les tags ;
- suppression d'un dossier : associations remises à `null`, assets et médias
  conservés ; suppression d'un tag : associations retirées uniquement ;
- writer canonique existant réutilisé avec validation, sauvegarde et écriture
  atomique ;
- panneau `Classer` sur chaque vidéo, sélection d'un dossier et de plusieurs
  tags, création d'un tag depuis le panneau ;
- actions de renommage/suppression des dossiers ;
- recherche incluant les noms de dossiers et de tags ;
- deux tags maximum affichés sur une carte, puis `+N`.

### Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/media-library-runtime.js` ;
- `prototypes/05-augmented-ic-video-01/teacher-videos.html` ;
- `prototypes/05-augmented-ic-video-01/server/test/library-classification.test.js`.

### Vérifications

- tests ciblés : **3/3 réussis** ;
- `npm run check` : réussi ;
- `git diff --check` : réussi ;
- tests effectués sur serveurs temporaires et copies de données ;
- persistance après redémarrage vérifiée ;
- les assets, sources et playables sont conservés dans les tests ;
- aucune activité canonique ni média réel n'a été modifié.

Version applicative inchangée : **0.1.32**.

La recette Chromium n'a pas été ouverte automatiquement. Le serveur Proto05 est
lancé séparément pour validation visuelle humaine.

## Correctif ciblé d’écriture Windows

Le diagnostic de la recette David a confirmé deux instances Proto05 écrivant le
même fichier : PID `62720` sur le port 8791 et PID `62988` sur le port 8891.
Elles ont été arrêtées avant le correctif. Le dossier `Toto` et le tag `YT`
étaient déjà présents dans le catalogue ; aucun fichier temporaire
`video-library.json.*.tmp` résiduel n'a été trouvé.

Seul `persistVideoLibrary` a été adapté avec `renameWithWindowsRetries` : cinq
tentatives maximum, délais courts croissants, et reprise limitée aux codes
Windows `EPERM` et `EBUSY`. Le remplacement reste atomique ; après le dernier
échec l'erreur est propagée et le temporaire est nettoyé dans `finally`, sans
déclarer la mutation réussie ni toucher au catalogue valide.

Contrôles après correction :

- tests ciblés de dossiers/tags/classement/persistance : **3/3 réussis** ;
- `npm run check` : réussi ;
- `git diff --check` : réussi ;
- aucune écriture de donnée canonique pendant les tests, réalisés sur serveurs
  temporaires ;
- version inchangée : **0.1.32**.

## Correctif ciblé de recherche

La recherche affichait toutes les vidéos pour `untag` car la projection
retournée à chaque asset contient les collections globales `folders` et `tags`.
La sérialisation brute de l'asset faisait donc correspondre chaque nom de tag
global à toutes les cartes.

Le filtre client construit désormais son texte de recherche avec le titre,
l'identifiant, les sources/playables, le nom du dossier résolu depuis
`folderId` et les noms des tags résolus depuis `tagIds`. Le déclenchement sur la
saisie reste assuré par l'écouteur `input`. Les vues Toutes, Non classées,
Indisponibles et Dossier continuent d'être appliquées après ce filtre.

Contrôles après correction :

- test ciblé de classement/recherche : **3/3 réussis** ;
- `npm run check` : réussi ;
- `git diff --check` : réussi ;
- aucune route de mutation, donnée ou writer modifié pour ce correctif ;
- une seule instance active pour la recette : port 8891, PID `21872` ; port 8791
  libre ;
- Chromium non ouvert automatiquement.

## Diagnostic et correctif du chargement bloqué de la Library

La reproduction sur `http://127.0.0.1:8891/teacher-videos.html` a isolé une
exception JavaScript réelle dans le renderer moderne :

```text
ReferenceError: folderById is not defined
teacher-videos.html:136:235
at filtered (...:136:180)
at renderLibrary104 (...:137:131)
```

L’API de Library répondait correctement en `200` avec 15 assets, un dossier et
trois tags. Le renderer moderne était installé, mais son premier rendu
échouait avant de remplacer `Chargement…`. La cause était une référence à
`folderById` et `tagById`, définies dans un autre scope du script historique.
Le correctif reste limité à la résolution locale des libellés via `folderLabel`
et `tagLabels`; aucune route, donnée, mutation, writer ou modèle n’a été
modifié.

Après rechargement réel de la page : 15 cartes, compteur `15 / 15`, 15
miniatures, dossier `Toto` visible, tags visibles et aucune carte historique
détaillée (`Asset logique` absent). Une nouvelle collecte des erreurs après le
rechargement ne contient aucune erreur JavaScript applicative.

Les contrôles Chromium ont également vérifié la saisie, l’ouverture puis
l’annulation du panneau `Classer`, et le passage grille/liste. Avec le catalogue
actuel, `untag` correspond à deux assets (`Test_0` et `Version anonymisée
dérivée`) car le tag est effectivement persisté sur ces deux assets ; le
résultat observé `2 / 15` est donc cohérent et aucune association n’a été
modifiée pour forcer un résultat différent.

Le test ciblé contient désormais une vérification dédiée de la séquence
`loadFolders` → `renderLibrary104` et du rendu moderne de cartes après le
chargement. Ce contrôle source complète la recette Chromium réelle.

Version inchangée : **0.1.32**.

## Statut final de recette

Recette Chromium validée par David : Library moderne chargée, 15/15 cartes et
miniatures, dossier Toto et tags visibles, panneau Classer et vues grille/liste
fonctionnels, aucune ancienne carte détaillée et aucune erreur JavaScript après
rechargement. La recherche `untag` à deux résultats est cohérente avec les
associations persistées. Le serveur 8891 a ensuite été arrêté ; les ports 8891
et 8791 sont libres. Aucune donnée n’a été modifiée.

## Correctif de régression du renderer

La recherche corrigée avait laissé coexister l'ancien `render()` historique et
le renderer allégé de la mission 104. Après le chargement asynchrone, l'ancien
renderer pouvait réécrire `#assets` avec les cartes détaillées et masquer les
miniatures. Le renderer moderne existait toujours ; il était simplement écrasé
par ce second passage.

Le correctif ajoute uniquement une garde dans l'ancien renderer et active cette
garde lorsque le renderer moderne est installé. Le rendu restauré conserve les
miniatures, le titre, le type/source utile, l'état, les tags et les actions
discrètes ; les dossiers, tags, recherche, vues, tris, aperçu et association
restent ceux des missions précédentes.

Contrôles :

- test ciblé : **3/3 réussis** ;
- `npm run check` : réussi ;
- `git diff --check` : réussi ;
- aucune donnée, route, writer ou modèle modifié ;
- une seule instance active sur 8891, PID `45756` ; 8791 libre ;
- Chromium non ouvert automatiquement.
