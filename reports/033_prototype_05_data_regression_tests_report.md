# Prototype 05 — tests de non-régression des données historiques

Date : **16 juillet 2026**  
Version applicative obtenue : **inchangée (`0.1.7`)**

## Périmètre

La mission ajoute une couverture automatisée des volumes, références, temps et
propriétés de conservation des données historiques de Proto05. Elle ne modifie
ni l’application, ni `data/activities.json`, ni la timeline, le HLS,
l’interface, le launcher ou le modèle métier.

Le test lit le JSON canonique, en construit une copie temporaire enrichie de
champs sentinelles inconnus, puis démarre le `server.js` courant depuis un
répertoire temporaire. Les deux sauvegardes du scénario ciblent exclusivement
cette copie.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/test/data-regression.test.js` :
  nouvelle couverture historique et deux sauvegardes de non-régression ;
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js` :
  helper commun de copie, démarrage, arrêt et nettoyage du serveur temporaire ;
- `prototypes/05-augmented-ic-video-01/server/test/teacher-save.test.js` :
  réutilisation du helper commun sans changement de couverture fonctionnelle ;
- `reports/033_prototype_05_data_regression_tests_report.md` : présent rapport.

Aucune dépendance n’a été ajoutée. Le script `npm test` existant découvre le
nouveau fichier automatiquement.

## Tests ajoutés

### Volumes historiques

Le test vérifie explicitement :

- 11 segments ;
- 22 intervalles linguistiques ;
- 26 phénomènes ;
- 7 couches ;
- 4 langues ;
- 5 locuteurs ;
- 11 annotations enseignantes.

### Références

Les identifiants des collections sont contrôlés comme présents et uniques. Les
relations suivantes sont vérifiées dans les deux sens lorsque le modèle les
porte :

- transcription vers langue et segments, avec le même ordre que `segments` ;
- segments vers langues, locuteurs et phénomènes ;
- intervalles vers segments et langues ;
- phénomènes vers segments et couches, avec référence inverse dans le segment ;
- annotations vers segments et overlays vers couches ;
- tableaux de visibilité de `layerConfiguration` vers couches existantes ;
- couverture de chaque segment par une annotation historique.

### Temps et synchronisation

Tous les `startMs` et `endMs` des segments, intervalles et phénomènes sont des
entiers positifs ordonnés, compris dans la durée vidéo. L’ordre des segments est
croissant selon `startMs`.

Chaque intervalle linguistique et chaque phénomène reprend exactement les temps
du segment qu’il référence. Les langues d’intervalle et les phénomènes sont
également présents dans les tableaux du segment correspondant.

Le chevauchement historique entre certains segments est conservé : le test ne
transforme pas une donnée existante en contrainte d’absence de chevauchement.

### Sauvegardes et conservation

Deux `PUT /api/proto05/activities/:id/authoring` sont exécutés sur la copie :

1. une sauvegarde complète sans modification ;
2. une sauvegarde dont seul le titre est modifié.

Après la première sauvegarde, l’activité est strictement identique et seul le
`updatedAt` du magasin peut changer. Après la seconde, la normalisation du titre
et de `updatedAt` rend l’état strictement identique au précédent.

Le test compare explicitement l’ordre des tableaux de segments, intervalles,
phénomènes, couches, langues, locuteurs, annotations, segments de transcription
et trois configurations de visibilité. Il vérifie ainsi l’absence de
réordonnancement, suppression ou modification parasite.

Des champs inconnus sont ajoutés uniquement à la copie au niveau du magasin, de
l’activité, de la vidéo, de la transcription, d’un segment, d’un locuteur,
d’une langue, d’un intervalle, d’une couche, d’un phénomène, d’une annotation et
de la configuration. Tous sont conservés après les deux sauvegardes. Les
`speakers` et la `transcription`, non concernés par le payload auteur, restent
strictement identiques.

### Sauvegarde `.bak`

- après la sauvegarde sans modification, le SHA-256 du `.bak` est exactement
  celui de la copie initiale ;
- après la modification ciblée, le SHA-256 du `.bak` est exactement celui de
  l’état obtenu après la première sauvegarde ;
- le contenu JSON du second `.bak` est strictement égal à l’état précédent.

## Contrôles exécutés

- `node --check test/helpers/temporary-proto05-server.js` : **OK** ;
- `node --check test/teacher-save.test.js` : **OK** ;
- `node --check test/data-regression.test.js` : **OK** ;
- `node --test test/data-regression.test.js` : **OK**, 10 tests, 0 échec ;
- `npm test` : **OK**, 31 tests, 0 échec ;
- `git diff --check` : **OK** ;
- version du package : `0.1.7`, inchangée.

La suite complète rejoue également les validations Chromium des rapports 031 et
032. Aucun nouveau scénario visuel ou Chromium n’était nécessaire pour ce test
de données ; la nouvelle couverture utilise l’API réelle sur copie temporaire.

## Préservation du JSON canonique

Le SHA-256 de `data/activities.json` avant et après les tests reste :

`3DB18608A7A94021F4C7B5DFE3E306BC31517A0556A7B6094BF6FA60851776BE`

Les volumes canoniques et `updatedAt` (`2026-07-13T18:23:47.041Z`) sont restés
inchangés. Seules deux écritures `PUT` attendues ont été émises par le nouveau
scénario, toutes deux vers le serveur temporaire.

## Problèmes applicatifs découverts

Aucun problème applicatif réel n’a été découvert. Les références, temps, ordres,
champs inconnus et générations de `.bak` vérifiés sont cohérents dans le scénario
testé. L’amélioration apportée au mécanisme d’arrêt concerne uniquement le helper
de test sous Windows.

## Éléments non vérifiés

- sauvegarde volontaire dans le fichier canonique ou recette sur le serveur de
  démonstration ;
- concurrence de plusieurs écritures et séquencement sous charge ;
- panne disque, permissions insuffisantes ou échec de renommage ;
- corruption préalable du magasin ou récupération après interruption brutale ;
- validité pédagogique des timestamps par comparaison humaine avec la vidéo ;
- HLS, timeline, interface et launcher, hors périmètre de cette mission ;
- validation fonctionnelle humaine de David.

## Limites restantes

- la synchronisation testée est structurelle : bornes dans la durée et égalité
  des temps entre objets liés ; elle ne prouve pas l’alignement audiovisuel réel ;
- les champs sentinelles couvrent les principaux niveaux du JSON mais ne
  représentent pas toute extension future possible ;
- la modification ciblée porte sur le titre et ne cherche pas à tester chaque
  combinaison de champs auteur ;
- le test protège les volumes historiques actuels comme contrat explicite : une
  évolution intentionnelle de ces volumes nécessitera une décision humaine et
  une mise à jour assumée du test.

## Commit proposé

`test(prototype-05): protect historical activity data`
