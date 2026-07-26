# Mission 120 — Implémentation de l’identité pédagogique minimale de Proto05

Date : 26 juillet 2026  
Périmètre : `prototypes/05-augmented-ic-video-01` et documentation canonique directement rendue obsolète  
Statut : implémentation terminée ; recette visuelle et pédagogique humaine réservée à David

## 1. État initial observé

Le dépôt était sur `main`, en avance de trois commits sur `origin/main`, au
commit :

- `a2b09e56f9b68b649d99d7ec8958de713d298db2` ;
- date : `2026-07-26 15:22:08 +0200` ;
- message : `docs(proto05): design canonical pedagogical identity`.

La version du serveur et du package Proto05 était `0.1.40`. La page étudiante
canonique restait `index-0.0.9.html`.

Un fichier non suivi préexistait avant la mission :
`CONCEPTION_ACTIVITE_PEDAGOGIQUE_PROTO05.md`. Il appartient à David, a été lu
comme source autoritative et n’a pas été modifié.

La source de vérité des activités était et reste
`prototypes/05-augmented-ic-video-01/data/activities.json`. Elle contenait sept
activités, dont aucune ne possédait `pedagogicalIdentity` :

1. `proto05-augmented-video-01` ;
2. `proto05-draft-1784218562686-f87014` ;
3. `proto05-draft-1784219853222-b9e6a5` ;
4. `proto05-draft-1784230655360-d1182f` ;
5. `proto05-copy-1784236861048-984dec` ;
6. `proto05-copy-1784304228900-10fb33` ;
7. `proto05-draft-1784811747316-88a00c`.

Son empreinte SHA-256 relevée et recontrôlée après les tests est :
`488C41D28A9D05D8292B04A63F68E4508DD038087EE0E77DABC05BDBBB4D09ED`.

## 2. Sources lues

Les sources suivantes ont été lues intégralement avant l’implémentation :

- `AGENTS.md` et les instructions de workspace applicables ;
- `docs/WORKSPACE_PROVENANCE.md` ;
- `docs/ARCHITECTURE.md` ;
- `PROJECTS_LAUNCH.md` ;
- `STATUS.md` ;
- `GRILLE_CRITIQUE_REAPPROPRIABILITE.md` ;
- `DEMARCHE_REAPPROPRIABILITE_PROTOTYPES.md` ;
- `CONCEPTION_ACTIVITE_PEDAGOGIQUE_PROTO05.md` ;
- `reports/118_proto05_critical_reappropriability_audit.md` ;
- `reports/119_proto05_pedagogical_identity_design.md` ;
- `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md` ;
- les README du prototype et de son serveur ;
- le code serveur, les pages enseignantes actives, la page étudiante, les
  données et les tests courants de Proto05.

La conception autoritative confirme notamment que l’activité historique est
un brouillon/test conservé, doté d’un potentiel didactique mais sans intention
ou scénario pédagogique global historiquement stabilisé. Aucune qualification
automatique ne pouvait donc être déduite de ses annotations.

## 3. Architecture réellement observée

Proto05 possède un serveur Node natif autonome. Il assure :

- le service des vues enseignant et étudiant ;
- les API de liste, détail, création, modification, duplication et suppression
  des activités ;
- la validation d’intégrité avant écriture ;
- la sauvegarde atomique de `activities.json`, précédée d’un `.bak`.

Les vues enseignantes actives concernées sont :

- `teacher.html` pour la bibliothèque d’activités ;
- `teacher-edit.html` pour les métadonnées générales ;
- `teacher-guided.html` pour l’atelier guidé ;
- `teacher-author.html` pour l’atelier avancé ;
- la prévisualisation enseignant, qui réutilise le moteur étudiant.

La Library vidéo possède son propre modèle canonique. Une activité peut
référencer un média par `videoRef`; cette relation technique est distincte
d’une filiation entre activités.

L’identité pédagogique a donc été insérée dans l’activité elle-même. Un résumé
calculé, `pedagogicalIdentitySummary`, est projeté par les API de liste et de
détail, mais n’est jamais persisté.

## 4. Contrat finalement implémenté

Le contrat `pedagogicalIdentity`, version `0.1`, est défini et validé dans
`server/pedagogical-identity.js`.

Il contient :

- `resourceNature` : `functional-test`, `pedagogical-activity`,
  `demonstration` ou `other` lorsque la nature est établie ;
- `designStatus` : `draft`, `documented`, `to-review` ou `archived` ;
- `intention`, `audience`, `useContext`, `learningObjectives`,
  `prerequisites`, `modalities`, `recommendedScenario`, `pedagogicalCore`,
  `adaptableElements`, `origin`, `responsibility` et `limitations` ;
- `indicativeDuration`, exprimée comme durée pédagogique indicative et non
  comme durée du média ;
- `lineage`, avec racine, parent direct et état de connaissance ;
- `qualifications`, historique explicite de validations humaines.

Les informations qualifiées utilisent les états :

- `known` : information établie ;
- `unknown` : information actuellement inconnue ;
- `to-verify` : information ou hypothèse à confirmer ;
- `not-applicable` : information explicitement non applicable, avec
  justification.

Les validations interdisent de masquer une inconnue derrière une valeur par
défaut. Les états `to-verify` et `not-applicable` exigent une information
explicative. La nature d’activité et la filiation n’acceptent pas
`not-applicable`.

Chaque qualification conserve au minimum :

- un identifiant ;
- un niveau parmi `documented-by-author`, `reviewed-by-expert`,
  `experimented` et `reused-by-third-party` ;
- la personne ou l’acteur ayant validé ;
- une date `YYYY-MM-DD` ;
- le contexte ;
- la nature de la preuve ;
- la preuve ou validation associée.

La complétude de la fiche et la qualification sont calculées séparément. Une
fiche peut être complète et rester `unqualified`. Aucun calcul ni champ de
transmissibilité juridique n’a été ajouté.

Les champs supplémentaires déjà présents dans une identité sont conservés lors
de l’édition : le formulaire repart de l’objet reçu et ne reconstruit que les
champs qu’il gère.

## 5. Compatibilité des sept activités historiques

Une activité sans `pedagogicalIdentity` :

- reste lisible dans les API ;
- obtient uniquement un résumé dérivé `presence: absent`,
  `completeness: incomplete`, `qualificationLevel: unqualified` ;
- reste affichable et modifiable ;
- n’est pas enrichie lors d’une sauvegarde de métadonnées si l’enseignant n’a
  pas explicitement commencé la fiche ;
- ne déclenche aucune migration, qualification ou reconstruction depuis les
  annotations.

Les nouvelles activités reçoivent une fiche vide honnête : champs
`unknown`, statut `draft`, filiation racine et aucune qualification.

`data/activities.json` n’a pas été modifié pendant la mission. Tous les tests
avec écriture utilisent une copie temporaire.

## 6. Insertion dans les vues

### Fiche enseignant

`teacher-edit.html` devient la fiche progressive de l’activité. Les
métadonnées générales restent en tête. L’identité pédagogique n’est créée
qu’après l’action explicite « Commencer la fiche pédagogique ».

Les rubriques sont repliables :

- repères essentiels ;
- usage conseillé ;
- adaptation et limites ;
- origine et responsabilité ;
- qualifications et preuves ;
- filiation pédagogique.

Le formulaire accepte une fiche partielle, distingue les états de connaissance,
reste sur la page après sauvegarde et conserve les valeurs affichées en cas
d’erreur. Il rappelle qu’une fiche complète ne constitue pas une validation
automatique.

### Bibliothèque

`teacher.html` ajoute un résumé compact dans chaque carte :

- nature et état de conception ;
- complétude ;
- qualification ;
- intention, public ou contexte lorsqu’ils sont connus ;
- filiation et besoin éventuel de requalification.

La carte propose l’accès à la fiche et libelle la duplication comme création
d’une variante.

### Atelier guidé

`teacher-guided.html` ajoute un rappel non intrusif sous son en-tête :

- fiche absente, incomplète ou complète ;
- qualification ;
- intention connue ;
- public ou contexte connus ;
- lien vers la fiche complète.

Aucun second formulaire n’a été ajouté. L’atelier avancé n’a pas été refondu.

### Vue étudiante

`index-0.0.9.html` n’a pas été modifié. Le rappel et les contrôles de fiche
restent absents de la vue étudiante.

## 7. Duplication, filiation et qualification

La duplication :

- conserve le contenu descriptif de l’identité lorsqu’il existe ;
- conserve la relation média actuelle, y compris `videoRef` lorsqu’il est
  présent ;
- crée une relation de variante vers le parent direct ;
- conserve une racine connue ou marque honnêtement la racine antérieure
  `to-verify` ;
- passe `designStatus` à `to-review` ;
- vide intégralement `qualifications` ;
- expose `requalificationRequired: true`.

Le serveur refuse les parents absents, les racines incohérentes et les cycles.
Il empêche également la suppression d’une activité encore référencée comme
parent pédagogique.

Deux activités indépendantes utilisant le même média ne reçoivent aucune
filiation. La future activité pédagogique proposée dans le document de
conception n’a pas été créée.

## 8. Fichiers créés ou modifiés

### Créés

- `prototypes/05-augmented-ic-video-01/server/pedagogical-identity.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/pedagogical-identity.test.js` ;
- `reports/120_proto05_pedagogical_identity_implementation.md`.

### Modifiés

- `DEMARCHE_REAPPROPRIABILITE_PROTOTYPES.md` ;
- `prototypes/05-augmented-ic-video-01/README.md` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `prototypes/05-augmented-ic-video-01/server/package.json` ;
- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/empty-draft-validation.test.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/speaker-management.test.js` ;
- `prototypes/05-augmented-ic-video-01/teacher-edit.html` ;
- `prototypes/05-augmented-ic-video-01/teacher-guided.html` ;
- `prototypes/05-augmented-ic-video-01/teacher.html`.

Les deux tests existants ont seulement été adaptés pour exclure la projection
API non persistée avant de comparer la réponse à la donnée écrite. La fixture
temporaire copie désormais le nouveau module et `teacher-edit.html`.

## 9. Tests ajoutés

`server/test/pedagogical-identity.test.js` protège :

- la séparation complétude–qualification ;
- les états inconnus et à vérifier ;
- une qualification avec acteur, date, contexte et preuve ;
- la lecture legacy sans identité ;
- l’écriture et la relecture d’une fiche partielle ;
- l’absence de mutation canonique ;
- la création d’une fiche vide sans enrichissement fictif ;
- la duplication comme variante ;
- la remise à zéro des qualifications ;
- la conservation de `videoRef` ;
- l’absence de filiation entre activités partageant seulement un média ;
- les contrôles de filiation ;
- la séparation de la vue étudiante ;
- le parcours Chromium fiche → bibliothèque → atelier guidé → vue étudiante.

## 10. Vérifications effectuées et résultats exacts

### Analyse statique

- `npm.cmd run check` : succès ;
- version affichée par le script : `proto05-augmented-video-server@0.1.41` ;
- `node --check server.js` : succès ;
- compilation syntaxique des scripts intégrés de `teacher-edit.html`,
  `teacher.html` et `teacher-guided.html` : succès.

### Tests ciblés de l’identité

Commande :

```text
node --test --test-concurrency=1 test/pedagogical-identity.test.js
```

Résultat : 8 tests sur 8 réussis, aucun échec.

### Suite de non-régression pertinente

Commande :

```text
node --test --test-concurrency=1 test/pedagogical-identity.test.js test/activity-duplication.test.js test/empty-draft-validation.test.js test/data-regression.test.js test/speaker-management.test.js test/teacher-save.test.js test/layer-visibility.test.js
```

Résultat : 66 tests sur 66 réussis, aucun échec.

Cette suite couvre aussi les parcours Chromium existants de création,
sauvegarde, atelier guidé, locuteurs et visibilité des couches.

### Suite complète

Commande :

```text
npm.cmd test -- --test-concurrency=1
```

Résultat : 209 tests, 208 réussis, 1 échec.

L’échec concerne le test préexistant
`server/test/library-usage.test.js` :
« le panneau s’ouvre au survol, au focus et au clic sans régresser le menu
Actions ». Ce scénario Chromium de la vidéothèque était déjà signalé lors de
l’audit précédent et les fichiers de la vidéothèque concernés ne sont pas
modifiés par cette mission. Les tests d’identité pédagogique passent dans cette
même exécution complète.

### Validation HTTP et données

Les tests ont démarré des serveurs Proto05 isolés, exercé les API de lecture,
création, modification, duplication et suppression, puis contrôlé leur
persistance temporaire. Les écritures ont été effectuées exclusivement dans
des fixtures.

La source canonique conserve sept activités, zéro identité persistée et
l’empreinte SHA-256
`488C41D28A9D05D8292B04A63F68E4508DD038087EE0E77DABC05BDBBB4D09ED`.

### Validation visuelle automatisée

Chrome installé a exécuté le nouveau scénario dans un iframe de 1440 × 1000
pixels, avec une fenêtre de 1500 × 1100 pixels. Les états fiche absente,
initialisation partielle, sauvegarde, relecture, résumé de bibliothèque,
rappel guidé et retour à la vue étudiante ont été observés sans débordement
horizontal de la fiche.

Il s’agit d’une recette automatisée, pas d’une preuve de compréhension ni
d’acceptation par un enseignant.

## 11. Écarts avec le rapport 119

Deux ajustements ont été retenus pour respecter les décisions humaines du
document de conception et le besoin explicite de la mission :

1. Le rapport 119 proposait principalement `lastQualification`. Le contrat
   implémente `qualifications[]` afin de conserver les niveaux successifs et
   chaque preuve contextualisée, sans ajouter un moteur universel. Le niveau
   de résumé est dérivé de cette liste.
2. Le rapport 119 regroupait certains états sous `resourceStage`. Le contrat
   sépare `resourceNature` et `designStatus`, ce qui évite de confondre la nature
   factuelle d’une ressource avec son état de conception.

La projection `qualificationState` à trois niveaux, dont `transmissible`, n’a
pas été reprise : la mission impose de séparer la qualification pédagogique de
la transmissibilité juridique. La projection minimale expose donc
`completeness`, `qualificationLevel` et `requalificationRequired`.

Ces ajustements ne modifient aucune décision pédagogique autoritative et
n’injectent pas le scénario futur proposé.

## 12. Ce qui reste à vérifier par David

La validation humaine doit encore porter sur :

- la compréhension des libellés par un enseignant non technique ;
- le bon niveau de densité et de progressivité de la fiche ;
- la lisibilité des cartes sur les écrans et tailles réellement utilisés ;
- le caractère suffisamment discret du rappel dans l’atelier guidé ;
- la pertinence pratique du vocabulaire des niveaux de qualification ;
- le parcours de co-conception prévu avec Christian Degache.

Cette recette humaine n’est pas déclarée réalisée par Codex.

## 13. Limites persistantes

- Les sept activités historiques restent volontairement sans fiche et sans
  qualification.
- L’activité historique principale n’est pas factuellement qualifiée.
- Aucun droit média ni aucune transmissibilité juridique n’est évalué.
- Le contrat est volontairement local à Proto05 et ne constitue pas un moteur
  universel de qualification.
- Il n’existe pas encore de requalification courte de la démarche après retour
  humain.
- Le scénario Chromium préexistant de panneau d’usage de la vidéothèque reste
  instable dans la suite complète.

## 14. Version obtenue et état Git final

La version du serveur et du package Proto05 est désormais `0.1.41`. La page
étudiante reste `0.0.9`.

À la fin de l’implémentation, le dépôt reste sur `main`, en avance de trois
commits sur `origin/main`. Les modifications de la mission sont locales et non
commitées. Le fichier non suivi
`CONCEPTION_ACTIVITE_PEDAGOGIQUE_PROTO05.md`, préexistant, est toujours présent
et intact.

Aucun commit ni push n’a été effectué.

## 15. Proposition de message de commit

```text
feat(proto05): add minimal pedagogical activity identity
```

