# Mission 095 — Réconciliation de la suite Proto05

## Périmètre et référence

La vérification porte uniquement sur Proto05. L’état canonique contient sept
activités, et non cinq : `proto05-augmented-video-01`, trois brouillons,
`proto05-copy-1784236861048-984dec`, `proto05-copy-1784304228900-10fb33` et
`proto05-draft-1784811747316-88a00c`.

Aucune écriture dans `data/activities.json` n’a été effectuée. La version de
référence retenue est **0.1.30**, déjà déclarée par `server/package.json` et
désormais servie par `server.js` et le healthcheck. La documentation du moteur
autonome mentionne également cette version.

## Origine des 21 échecs historiques

Les échecs ont été comparés aux données actuelles, aux contrats actuellement
servis et à l’historique des tests. Ils étaient tous des attentes obsolètes ;
aucune régression fonctionnelle n’a été identifiée.

- les assertions de suppression, migration de langues, séparation des overlays
  et gestion des locuteurs attendaient cinq activités ; elles attendent
  maintenant les sept activités réellement présentes ;
- plusieurs tests utilisaient l’ancien titre ou l’ancien choix implicite
  `Original_copy` ; ils sélectionnent maintenant l’activité par son identifiant
  actuel `proto05-copy-1784236861048-984dec` ;
- les fixtures de duplication et de validation ne déclaraient pas la collection
  indépendante `overlays` ; elles la contiennent désormais explicitement ;
- le test des phénomènes forge désormais une référence `segmentId` inconnue
  pour tester la vraie règle de cohérence. La duplication actuelle réussit et
  conserve les références de phénomènes ; l’ancienne attente de refus était
  incompatible avec le contrat courant ;
- les recettes Chromium utilisaient d’anciens sélecteurs, routes et messages.
  Elles utilisent le catalogue courant, la route guidée et les états inline
  actuellement rendus ;
- la persistance de réponse distingue les projections dérivées `videoRef` et
  `videoSource` de la structure effectivement écrite ; aucune assertion n’est
  affaiblie sur les données persistantes ;
- `teacher-save.test.js` attendait une ancienne modale et un timeout de dix
  secondes. Le code courant expose un état inline, des réponses HTTP lisibles
  et la réactivation du bouton ; le test vérifie maintenant ces comportements
  exacts pour succès, HTTP, JSON invalide et réseau.

L’historique confirme notamment que le contrat guidé courant a été aligné après
l’introduction initiale du test de sauvegarde ; il ne s’agit donc pas d’une
régression masquée.

## Cas limites vérifiés

Le validateur actuel normalise les étapes par `startMs`, complète les fins
manquantes jusqu’à l’étape suivante puis jusqu’à la durée vidéo, et refuse les
débuts hors durée, les fins incohérentes et les temps de début dupliqués.

- première étape après `t = 0` : acceptée si elle reste dans la durée ; elle
  n’est pas artificiellement ramenée à zéro ;
- masque partiellement ou totalement hors cadre : refusé par les bornes
  normalisées `x + width <= 1` et `y + height <= 1`, puis contrôlé à la
  résolution vidéo ;
- coordonnées décimales : acceptées et conservées comme ratios normalisés,
  sous réserve des bornes et de dimensions d’au moins deux pixels après
  quantification vidéo ;
- collection vide entre deux collections non vides : acceptée ; la collection
  vide est conservée comme étape valide et ne produit aucun masque orphelin.

Les contrôles temporels existants couvrent également le tri, les doublons de
temps, la durée, les masques invalides, les temps manuels distincts 3000/3001
ms et la dérivation sans masque.

## Fichiers modifiés pour la mission

- `prototypes/05-augmented-ic-video-01/server/server.js` — version servie
  `0.1.30` ;
- `prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md` — référence
  documentaire `0.1.30` ;
- tests serveur : `activity-deletion.test.js`,
  `activity-duplication.test.js`, `empty-draft-validation.test.js`,
  `language-catalog.test.js`, `language-migration.test.js`,
  `overlay-separation.test.js`, `phenomenon-source.test.js`,
  `speaker-management.test.js` et `teacher-save.test.js`.

Les modifications déjà présentes dans `data/video-library.json`,
`server/test/hls-preparation.test.js`, `ROADMAP.md` et le rapport 094 ont été
préservées ; elles ne sont pas attribuées à la réconciliation 095.

## Vérifications

- test ciblé moteur : `node --test test/hls-preparation.test.js` — **9/9** ;
- suite complète : `npm.cmd test` — **103/103**, 0 échec, 0 skip ;
- contrôle syntaxique : `npm.cmd run check` — **réussi** ;
- whitespace : `git diff --check` — **réussi** ;
- healthcheck autonome sur le port isolé 8799 —
  `{"ok":true,"service":"proto05-augmented-video","version":"0.1.30","port":8799}` ;
- aucune dérivation complète de 939 secondes n’a été relancée ;
- aucune recette humaine Chromium supplémentaire n’a été revendiquée dans
  cette mission ; les scénarios Chromium couverts par les tests automatisés
  réconciliés ont réussi.

## État final et suites

La version obtenue est **0.1.30**, sans incrément supplémentaire. Le moteur
fonctionnel n’a pas été refondu. L’état Git conserve les changements
préexistants et les modifications de tests/documentation listées ci-dessus ;
aucun commit ni push n’a été effectué.

Message de commit proposé, non exécuté :
`test(proto05): reconcile reference suite and version`.

Limite restante : la validation visuelle humaine de David et la décision de
commit restent à faire séparément.
