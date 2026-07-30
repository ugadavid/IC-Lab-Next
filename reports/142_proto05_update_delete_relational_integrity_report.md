# Mission 142 — Proto05 — Modification, suppression et intégrité relationnelle

Date : 28 juillet 2026

Statut : **réalisée — recette automatisée et interactive terminée, validation humaine finale laissée à David**

## 1. Périmètre et préflight

La mission a porté uniquement sur les parcours de modification et de suppression
de l’atelier guidé pour :

- les segments de transcription ;
- les phénomènes IC ;
- les couches ;
- les overlays ;
- les intervalles linguistiques ;
- les locuteurs et leurs associations aux segments.

Préflight :

| Contrôle | Résultat |
| --- | --- |
| Instructions canoniques | lues |
| État Git initial | propre |
| Mission 141 | commitée dans `9544647` |
| Commit initial | `fix(proto05): stabilize MariaDB authoring and playable views` |
| Version initiale | `0.1.48` |
| Version finale | **`0.1.48`, inchangée** |
| Activité réelle de David | consultée uniquement lors des missions précédentes, ni ouverte ni modifiée ici |
| Données et médias canoniques | non modifiés |
| Schéma SQL | non modifié |

Deux activités entièrement jetables, créées depuis `/teacher/create`, ont servi
à la recette :

1. un graphe complet couvrant segments, intervalle, couches, phénomène, overlay
   et locuteur ;
2. un scénario minimal consacré au remplacement de l’association
   locuteur–segment.

Elles ont toutes deux été supprimées depuis la bibliothèque réelle à la fin.

## 2. Ce qui fonctionnait déjà

### Modification

Les modifications suivantes fonctionnaient déjà de bout en bout en mode
`mariadb` :

- libellé d’un locuteur ;
- texte d’un segment et conservation de son association au locuteur ;
- langue d’un intervalle ;
- libellé, description et couleur d’une couche ;
- couche et bornes d’un phénomène ;
- titre, texte et bornes d’un overlay.

Pour chaque entité, la recette a suivi :

```text
action UI → état auteur sale → PUT auteur → transaction MariaDB
→ API → rechargement → redémarrage → atelier / preview / student
```

Les valeurs initiales ont disparu de MariaDB et de l’API après modification.
Les nouvelles valeurs ont été retrouvées après rechargement et redémarrage.
Preview et student ont affiché la transcription, le locuteur, les couches et la
timeline depuis la même projection jouable.

Le second scénario a remplacé dans l’interface l’association du segment :

```text
Locuteur A → Locuteur B
```

La table relationnelle ne contenait ensuite que la relation avec le locuteur B.
Le locuteur A, devenu libre, a pu être supprimé sans retirer le segment ni le
locuteur B.

### Suppressions et protections déjà correctes

- un intervalle pouvait être supprimé et sauvegardé ;
- un phénomène pouvait être supprimé et le cache
  `segments[].phenomenonIds` était resynchronisé ;
- un locuteur encore associé à un segment était bloqué avec un message
  explicite ;
- une couche associée à un phénomène était bloquée ;
- la suppression d’un segment utilisait déjà un dialogue explicite listant les
  phénomènes, annotations et overlays dépendants ;
- la confirmation de ce dialogue appliquait le contrat de cascade existant ;
- la transaction MariaDB supprimait les lignes et relations devenues absentes,
  puis relisait et comparait le résultat avant commit.

## 3. Défauts réellement reproduits

### 3.1 Couche référencée uniquement par un overlay

L’atelier comptait uniquement les phénomènes pour décider si une couche pouvait
être supprimée. Une couche sans phénomène mais encore présente dans
`overlay.layerIds` disparaissait donc de l’état auteur.

La sauvegarde était ensuite correctement refusée par le serveur :

```text
400 — l’overlay référence un identifiant de couche inexistant
```

La transaction n’écrivait rien, mais le refus arrivait trop tard et laissait
l’utilisateur dans un état local invalide.

### 3.2 Indicateur de sauvegarde après suppression programmatique

Les suppressions déclenchées par un bouton ne produisent pas nécessairement un
événement natif `input` ou `change`.

Deux cas ont été reproduits :

- suppression locale d’un overlay : l’élément disparaissait, mais la barre
  supérieure restait sur « Enregistré » ;
- suppression locale d’une couche : le message inférieur demandait
  d’enregistrer, mais la barre supérieure restait sur « Enregistré ».

Le miroir d’état ne reconnaissait pas non plus les formulations
« Enregistrez… » et « … supprimé » comme des modifications locales.

### 3.3 Références de configuration d’une couche

Le parcours historique ne retirait que
`learnerVisibleLayerIds`. Le validateur exige pourtant que
`defaultVisibleLayerIds`, `learnerVisibleLayerIds` et
`teacherVisibleLayerIds` ne contiennent que des couches existantes.

Une couche réellement libre doit donc être retirée des trois listes lors de sa
suppression. Ce contrat est certain : il est porté par le validateur serveur,
la projection et les relations MariaDB.

## 4. Corrections effectuées

### Contrat guidé partagé

`shared/guided-authoring-contract.js` porte désormais :

- l’inventaire des phénomènes et overlays qui référencent une couche ;
- le refus explicite de supprimer une couche encore référencée ;
- la suppression d’une couche libre avec nettoyage des trois listes de
  visibilité ;
- l’inventaire des dépendances d’un segment ;
- la cascade segment → phénomènes / annotations / overlays liés, ainsi que la
  reconstruction du cache dérivé.

Le dialogue existant appelle ce contrat partagé ; son comportement produit
n’est pas réinventé.

### État de sauvegarde

L’atelier dispose d’un signal explicite d’état sale pour les mutations
programmatiques. Les suppressions d’overlay, couche, locuteur et segment
basculent immédiatement la barre supérieure sur :

```text
Modifications non enregistrées
```

Le miroir reconnaît également les formulations « Enregistrez… » et
« … supprimé ». Un refus reste affiché comme un échec et ne produit jamais un
faux état enregistré.

### Couche et overlay

- une couche liée uniquement à un overlay est maintenant bloquée avant toute
  mutation ;
- une couche liée à un phénomène reste bloquée ;
- une couche libre est supprimée avec ses lignes de visibilité, sans toucher
  aux autres couches ;
- la suppression d’un overlay marque immédiatement l’activité comme non
  enregistrée.

## 5. Recette interactive réelle

### Création et modification

Le graphe initial contenait :

- 1 segment ;
- 1 locuteur associé au segment ;
- 1 intervalle linguistique ;
- 2 couches ;
- 1 phénomène associé au segment et à une couche ;
- 1 overlay associé à l’autre couche.

Chaque entité a été modifiée puis sauvegardée séparément. Après chaque
modification :

1. la barre supérieure indiquait un état non enregistré ;
2. la sauvegarde répondait avec succès ;
3. MariaDB contenait la nouvelle valeur ;
4. l’API restituait cette valeur ;
5. l’état enregistré revenait uniquement après succès.

Après redémarrage, les nouvelles valeurs étaient toujours présentes.

### Suppression isolée

Ordre exercé :

1. intervalle linguistique ;
2. overlay ;
3. phénomène ;
4. segment ;
5. couche ;
6. locuteur.

Après chaque sauvegarde :

- la table cible et ses relations attendues étaient à zéro ;
- les entités non visées restaient présentes ;
- l’API reflétait exactement le même état ;
- aucune erreur navigateur ou serveur n’était présente.

La suppression d’un segment possédant un phénomène a aussi été testée dans un
scénario distinct au sein de l’activité jetable :

- le dialogue listait le phénomène ;
- l’annulation ne changeait rien ;
- la confirmation supprimait le segment et ce phénomène ;
- les couches et le locuteur restaient présents.

### Preview et student

Avant suppression, les deux vues restituaient le segment et le locuteur
modifiés. Les contrôles de couches et la timeline utilisaient les valeurs
modifiées.

Après suppression :

- plus aucun segment, intervalle, phénomène ou overlay supprimé n’apparaissait ;
- la couche non visée restait disponible ;
- preview et student affichaient le même état vide de transcription ;
- aucune erreur ni avertissement de console n’a été observé.

La recette a utilisé le navigateur intégré dans un viewport de bureau non
forcé. Aucune capture n’a été conservée.

## 6. Preuves automatisées

Le fichier de tests existant a été complété, sans nouveau fichier de test.

Nouveaux contrôles :

- messages de suppression classés comme état sale ;
- blocage d’une couche référencée par phénomène ou overlay ;
- nettoyage des trois listes de visibilité ;
- cascade segment et préservation des entités non dépendantes ;
- présence des contrats partagés dans les vrais gestionnaires UI ;
- cycle complet de modification et suppression en JSON ;
- même cycle transactionnel en MariaDB ;
- remplacement de l’association locuteur–segment ;
- relecture après redémarrage ;
- suppression finale, API `404` et absence de lignes relationnelles.

Résultats :

| Contrôle | Résultat |
| --- | --- |
| Syntaxe Node des fichiers JavaScript touchés | réussi |
| Scripts inline de `teacher-guided.html` | 11 valides |
| Tests guidés JSON + MariaDB | **19/19** |
| Frontières, grants, plan DML et rollback | **11/11** |
| Total ciblé | **30/30** |
| `git diff --check` | réussi |

La suite globale n’a pas été lancée : plusieurs anciens fichiers mêlent tests
Node, Chromium ou FFmpeg et certains reposent encore sur des volumes historiques
obsolètes. La recette navigateur ciblée de cette mission couvre directement les
états UI demandés, sans lancer Chromium externe ni FFmpeg.

## 7. Nettoyage et non-altération

Les deux activités jetables ont été supprimées depuis l’interface réelle.

Preuves finales :

```text
API activité jetable principale = 404
API activité association locuteur–segment = 404
activités [M142] restantes = 0
relations locuteur–segment [M142] restantes = 0
serveur de recette = arrêté
```

Les volumes MariaDB finaux sont exactement revenus au témoin initial :

| Collection | Avant | Après |
| --- | ---: | ---: |
| activités | 3 | 3 |
| segments | 15 | 15 |
| phénomènes | 29 | 29 |
| couches | 9 | 9 |
| overlays | 8 | 8 |
| intervalles | 31 | 31 |
| locuteurs | 9 | 9 |

L’activité réelle de David, les autres activités, les médias, les JSON
canoniques et le schéma n’ont pas été modifiés.

## 8. Règles métier et arbitrages

Aucune ambiguïté bloquante ne subsiste :

- segment avec dépendances : cascade confirmée par le dialogue existant ;
- locuteur référencé : suppression bloquée ;
- couche référencée par phénomène ou overlay : suppression bloquée ;
- couche libre : suppression autorisée avec retrait de sa configuration de
  visibilité ;
- suppression d’un intervalle ou phénomène : suppression de l’entité seule et
  maintien des autres entités.

Aucune règle métier nouvelle n’a été inventée.

## 9. Fichiers concernés

Modifiés :

- `prototypes/05-augmented-ic-video-01/teacher-guided.html` ;
- `prototypes/05-augmented-ic-video-01/guided-overlays.js` ;
- `prototypes/05-augmented-ic-video-01/shared/guided-authoring-contract.js` ;
- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/guided-authoring-regression.test.js`.

Créé :

- `reports/142_proto05_update_delete_relational_integrity_report.md`.

Aucun commit, push, changement de branche ou changement de version.

## 10. Recette humaine minimale laissée à David

1. démarrer Proto05 en mode `mariadb` ;
2. créer une activité jetable avec un segment, un locuteur, deux couches, un
   phénomène et un overlay lié à une couche ;
3. vérifier qu’une suppression d’overlay fait immédiatement apparaître
   « Modifications non enregistrées » ;
4. vérifier qu’une couche encore liée à un overlay ou un phénomène est bloquée
   avant de disparaître ;
5. retirer les dépendances, supprimer la couche, sauvegarder et recharger ;
6. remplacer le locuteur associé au segment, supprimer l’ancien locuteur puis
   vérifier que le locuteur encore associé reste protégé ;
7. supprimer l’activité jetable.

La recette de Codex établit les faits techniques et visuels observés ; elle ne
remplace pas la validation fonctionnelle humaine de David.

## 11. Message de commit proposé

```text
fix(proto05): secure guided update and deletion flows
```
