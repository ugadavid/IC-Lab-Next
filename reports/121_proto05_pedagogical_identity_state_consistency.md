# Mission 121 — Harmonisation de l’état des informations saisies

Date : 26 juillet 2026  
Périmètre : fiche pédagogique de Proto05  
Statut : correction implémentée et contrôlée sur fixtures ; vérification humaine à réaliser par David

## 1. État Git et version de départ

Avant toute modification :

- branche : `main` ;
- état : propre ;
- avance sur `origin/main` : quatre commits ;
- HEAD : `3a1f7ca5783372605bcdb81b9acbfd23420943c7` ;
- commit : `feat(proto05): add minimal pedagogical activity identity` ;
- date du commit : `2026-07-26 17:46:08 +0200` ;
- version serveur et package Proto05 : `0.1.41`.

La Mission 120 était donc bien commitée avant le début de cette mission.

Le commit de Mission 120 contient aussi la saisie issue de la recette humaine
dans `data/activities.json`. Cette donnée est la source canonique courante. Elle
présente notamment :

```json
"indicativeDuration": {
  "state": "unknown",
  "minutes": 60
}
```

Le champ `learningObjectives` ne contient aucune valeur, ce qui confirme que
la saisie observée dans « Objectifs » avait été perdue avant la persistance.

L’empreinte SHA-256 initiale et finale de `data/activities.json` est :
`39B5F0850847875D0A188AE1D43550E777D0A7438B457B47DC44C1ECD6FC9077`.

## 2. Cause exacte des deux incohérences

### Objectifs

`collectQualifiedField()` lisait toujours le texte saisi, mais ne copiait
`value` dans l’objet sérialisé que lorsque l’état était différent de
`unknown`.

Une saisie effectuée sans toucher à la liste d’état produisait donc :

```json
{ "state": "unknown" }
```

La valeur visible dans le formulaire était perdue lors de la sauvegarde.

### Durée indicative

`collectIdentity()` sérialisait `minutes` indépendamment de l’état sélectionné.
Il n’existait aucune harmonisation entre la présence d’une durée et
`indicativeDuration.state`.

Une durée saisie sans toucher à la liste produisait donc :

```json
{ "state": "unknown", "minutes": 60 }
```

Le validateur serveur acceptait cette combinaison contradictoire pour rester
tolérant envers les données partielles.

## 3. Champs recensés

Trois familles de champs saisissables portent un état sémantique :

1. les douze champs textuels :
   `intention`, `audience`, `useContext`, `learningObjectives`,
   `prerequisites`, `modalities`, `recommendedScenario`, `pedagogicalCore`,
   `adaptableElements`, `limitations`, `origin` et `responsibility` ;
2. `resourceNature`, associée à une nature choisie et à une précision ;
3. `indicativeDuration`, associée à un nombre de minutes et à une précision.

`lineage` possède également un état, mais n’est pas saisissable dans la fiche.
Il est affiché en lecture seule et contrôlé par la duplication. Il n’a pas été
modifié, conformément au hors-périmètre.

`designStatus` est un état de conception directement choisi, sans valeur
informationnelle associée. Les qualifications sont des enregistrements
explicites et n’utilisent pas cette logique `unknown` / `to-verify`.

## 4. Règle commune appliquée

Une fonction commune côté formulaire examine l’état et les contrôles
informationnels associés :

- information vide et état `unknown` : état conservé ;
- information non vide et état `unknown` : passage à `to-verify` ;
- autre état déjà choisi : état conservé ;
- tentative de remettre `unknown` alors qu’une valeur reste présente :
  retour à `to-verify`, car cette combinaison est contradictoire.

Cette règle est exécutée :

- dès la saisie ou le changement d’un contrôle ;
- une seconde fois pendant la sérialisation, afin de couvrir une donnée
  contradictoire déjà chargée ou une saisie programmatique.

Toutes les valeurs textuelles non vides sont désormais ajoutées à l’objet
sérialisé, y compris lorsque l’utilisateur n’a jamais manipulé la liste
d’état.

La règle est aussi centralisée côté serveur dans
`normalizePedagogicalIdentityStates()`. Lors d’un `PUT` de la fiche, le serveur
normalise une copie de l’identité reçue avant validation :

- texte non vide + `unknown` → `to-verify` ;
- nature ou précision non vide + `unknown` → `to-verify` ;
- minutes ou précision non vide + `unknown` → `to-verify`.

Cette défense serveur garantit la cohérence même pour un client qui
n’exécuterait pas le JavaScript attendu. Elle ne modifie pas l’objet reçu en
mémoire.

Une nature pressentie suffit désormais à documenter un état `to-verify`, sans
obliger à ajouter une note redondante. De même, une durée en minutes suffit à
documenter une durée `to-verify`. `not-applicable` continue d’exiger une
justification.

Une simple lecture ne déclenche aucune normalisation persistée. Une
contradiction existante n’est corrigée qu’à la prochaine sauvegarde explicite
de cette fiche.

Aucune qualification n’est créée ou modifiée par cette règle.

## 5. Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/teacher-edit.html` :
  harmonisation lors de la saisie et sérialisation uniforme ;
- `prototypes/05-augmented-ic-video-01/server/pedagogical-identity.js` :
  normalisation pure commune et ajustement minimal des validations de nature
  et de durée ;
- `prototypes/05-augmented-ic-video-01/server/server.js` :
  normalisation à la sauvegarde et version `0.1.42` ;
- `prototypes/05-augmented-ic-video-01/server/test/pedagogical-identity.test.js` :
  tests unitaires, API et Chromium ciblés ;
- `prototypes/05-augmented-ic-video-01/server/package.json` :
  version `0.1.42` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` :
  version et comportement de normalisation ;
- `reports/121_proto05_pedagogical_identity_state_consistency.md` :
  présent rapport.

`data/activities.json`, la vue étudiante, la bibliothèque, l’atelier guidé,
la duplication, la filiation, les qualifications et les autres prototypes
n’ont pas été modifiés.

## 6. Tests ajoutés ou adaptés

### Normalisation pure

Le test parcourt les douze champs textuels et vérifie uniformément :

- conservation de chaque valeur ;
- passage de `unknown` à `to-verify` ;
- même comportement pour la nature et la durée ;
- absence de mutation de l’objet d’entrée ;
- conservation de `unknown` lorsqu’aucune information n’est présente ;
- conservation des états `known` déjà choisis ;
- absence de qualification automatique.

### API et persistance

Une fixture reprend la contradiction réellement observée
`unknown + 60 minutes`.

Le test vérifie :

- qu’un `GET` ne modifie pas le fichier temporaire ;
- qu’une sauvegarde harmonise objectifs, prérequis et durée ;
- qu’un état `known` déjà choisi reste `known` ;
- que les valeurs et états sont présents après relecture du JSON ;
- que la qualification reste `unqualified` et la liste vide ;
- que le fichier canonique réel reste inchangé.

### Chromium directement lié au correctif

Le scénario ciblé ouvre la fiche contenant la durée contradictoire puis saisit
un objectif et un prérequis sans manipuler leur état. Il vérifie immédiatement
le passage à `to-verify`, applique la même règle à la nature et à la durée,
confirme la conservation d’une intention déjà `known`, sauvegarde, recharge et
relit les valeurs.

Le test historique de compatibilité legacy utilise désormais l’une des
activités réellement dépourvues de fiche, puisque l’activité principale a été
renseignée pendant la recette humaine de Mission 120.

## 7. Vérifications effectuées et résultats exacts

### Tests strictement ciblés initiaux

```text
node --test --test-concurrency=1 --test-name-pattern="harmonisation|consultation" test/pedagogical-identity.test.js
```

Résultat : 3 tests réussis sur 3, aucun échec.

### Contrat, compatibilité et correctif ciblé

```text
node --test --test-concurrency=1 --test-name-pattern="contrat d’identité|lecture legacy|harmonisation|consultation" test/pedagogical-identity.test.js
```

Résultat : 5 tests réussis sur 5, aucun échec.

### Sauvegardes directement voisines

```text
node --test --test-concurrency=1 test/teacher-save.test.js
```

Résultat : 13 tests réussis sur 13, aucun échec.

### Contrôles statiques

```text
npm.cmd run check
```

Résultat : succès pour
`proto05-augmented-video-server@0.1.42` et `node --check server.js`.

Les contrôles syntaxiques directs de `pedagogical-identity.js` et de
`test/pedagogical-identity.test.js` réussissent également.

```text
git diff --check
```

Résultat : succès ; uniquement des avertissements de conversion future
LF/CRLF, sans erreur de whitespace.

Conformément à la mission, la suite complète n’a pas été exécutée. Aucun test
Chromium sans rapport direct avec la sérialisation et les états n’a été lancé.

## 8. Préservation des données

Toutes les écritures de tests ont ciblé des copies temporaires. La donnée
canonique conserve son empreinte SHA-256 :
`39B5F0850847875D0A188AE1D43550E777D0A7438B457B47DC44C1ECD6FC9077`.

La contradiction actuellement présente dans la fiche canonique n’a pas été
migrée. Elle passera à `to-verify` lors de la prochaine sauvegarde explicite de
cette fiche.

## 9. Ce qui reste à vérifier par David

Une vérification humaine courte doit confirmer dans l’application réelle :

- qu’une saisie dans « Objectifs » fait immédiatement apparaître
  « À vérifier » ;
- que les 60 minutes existantes passent à « À vérifier » à la prochaine
  sauvegarde ;
- que les deux valeurs sont toujours présentes après rechargement ;
- que le changement automatique paraît naturel et non intrusif ;
- qu’un état explicitement choisi est correctement respecté lorsqu’il est
  compatible avec la valeur.

Les tests automatisés ne valent pas validation humaine de ces libellés et
interactions.

## 10. Version et état Git final

La version obtenue est `0.1.42`. La version étudiante reste inchangée.

Le dépôt reste sur `main`, en avance de quatre commits sur `origin/main`. Les
modifications de Mission 121 et le présent rapport sont locaux et non
commités.

Aucun commit ni push n’a été effectué.

## 11. Proposition de message de commit

```text
fix(proto05): harmonize pedagogical identity input states
```

