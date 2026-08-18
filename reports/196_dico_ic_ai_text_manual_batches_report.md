# Mission 196 — Examen manuel par lots de 100

Date : 2026-08-18  
Composant : `prototypes/08-dico-seven-sieves`  
Version de l’assistant texte obtenue : `0.1.6`

## Décision produit

David abandonne la recherche historique engagée pendant la Mission 195 et autorise explicitement une fonctionnalité nouvelle : l’examen manuel, en mémoire frontend, de lots successifs contenant au plus 100 formes.

Cette implémentation n’est pas présentée comme la restauration historiquement prouvée d’un ancien comportement. Le diagnostic 195 est préservé dans `reports/195_dico_ic_ai_text_historical_batch_regression_report.md` afin d’être intégré ultérieurement au même commit.

## État Git initial

Au début de la Mission 196 :

- `HEAD` était `3855d7e` ;
- le rapport 195 était non suivi ;
- `admin/css/admin-ai-text-0.1.css` et `admin/index-admin-ai-text-0.1.html` apparaissaient encore comme modifiés, mais leurs contenus et leurs objets Git étaient identiques à `HEAD` ;
- aucun module de lots issu de la tentative interrompue n’existait ;
- `git diff`, `git diff --raw` et `git diff --numstat` ne montraient aucune modification applicative conservée.

Aucun reset destructif n’a été effectué. Les deux fichiers concernés ont ensuite reçu de véritables modifications de Mission 196 : affichage de progression, version et style associé.

## Fichiers créés

- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-batches-0.1.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-ai-text-batches.test.js` ;
- `reports/196_dico_ic_ai_text_manual_batches_report.md`.

## Fichiers modifiés

- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-0.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-ai-text-0.1.css` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-ai-inflected-form.test.js`.

Le rapport 195 reste inchangé et non suivi. Aucun autre prototype, launcher, fichier Compose, migration, catalogue, atelier manuel, Seven Sieves, `INFORMATION_DATA` ou `AGENTS.md` n’a été modifié. `NUIT` n’a pas été ajouté.

## Mécanisme d’état en mémoire

Le nouveau module `admin-ai-text-batches-0.1.js` expose une session manuelle testable et le constructeur de payload frontend.

La session conserve uniquement en mémoire :

- les formes de l’analyse dans leur ordre de couverture initial ;
- les identités déjà examinées ;
- les propositions reçues, dans leur ordre d’arrivée ;
- le nombre de lots réussis.

L’identité stable d’une forme combine la langue et sa forme normalisée. Elle ne dépend pas d’un index de tableau ou d’un numéro de ligne susceptible de changer lors d’un rendu.

`nextBatch()` sélectionne, dans l’ordre initial, les premières formes dont l’identité n’est pas encore examinée, avec une limite stricte de 100. Le constructeur de payload refuse lui-même tout tableau supérieur à 100, avant l’appel réseau.

`completeBatch()` n’est appelé qu’après une réponse API réussie. Il :

1. marque toutes les identités demandées comme examinées, même lorsque l’IA omet certaines formes ;
2. fusionne les nouveaux candidats par identité stable ;
3. conserve l’objet existant lorsqu’une identité est déjà présente.

Cette dernière règle préserve les corrections de lemme, les cibles, les états et les sélections humaines déjà modifiés. Elle empêche aussi les doublons.

Une nouvelle soumission d’analyse, du même texte ou d’un autre, réinitialise volontairement la session, les propositions, le reliquat lexical, les compteurs, le dernier résultat de génération et le rapport de création. Un changement de langue source produit la même réinitialisation.

Aucun état de lot n’est persisté dans MariaDB, le navigateur ou un fichier.

## Comportement 100 + reliquat

Pour 164 formes :

- le bilan continue d’afficher les 164 formes ;
- avant génération : `164 formes à examiner · prochain lot : 100` ;
- premier clic manuel : payload de 100 formes ;
- après succès : `100 examinées · 64 restantes` et bouton `Examiner les 64 formes restantes` ;
- second clic manuel : payload de 64 formes ;
- après succès : `164 formes examinées` ;
- le bouton devient `Toutes les formes ont été examinées` et reste désactivé ;
- aucun troisième appel n’est déclenché.

Il n’existe aucune boucle d’enchaînement automatique. Chaque lot nécessite un clic humain.

Les propositions du premier lot restent affichées après le second. Le passage au lot suivant ne déclenche aucune création. Seul le bouton historique de création des mappings explicitement cochés peut écrire, et il n’a pas été utilisé pendant les recettes.

## Gestion des erreurs

Le curseur de session n’avance qu’après résolution réussie de `apiRequest`. Une erreur réseau, serveur ou IA laisse donc le lot courant intact. Le prochain clic reconstruit exactement le même lot, dans le même ordre.

Les tests couvrent :

- échec puis reprise exacte du premier lot ;
- réussite du premier lot puis échec du second ;
- reprise exacte des 64 formes du second lot ;
- conservation des 100 premières propositions durant ces reprises.

## Limite serveur préservée

La constante serveur `MAX_INFLECTED_CANDIDATES` reste fixée à 100. Aucun code serveur de production n’a été modifié.

Un nouveau test HTTP envoie réellement un POST forgé de 101 éléments à une instance éphémère de `createApp`. Résultat :

- HTTP `400` ;
- code `INFLECTED_ITEM_LIMIT_EXCEEDED` ;
- message `La génération est limitée à 100 formes.` ;
- rejet avant toute génération IA.

## Tests automatisés

### Cas ciblés

Le module couvre les répartitions :

| Formes | Lots attendus |
|---:|---|
| 0 | aucun |
| 1 | 1 |
| 99 | 99 |
| 100 | 100 |
| 101 | 100 + 1 |
| 164 | 100 + 64 |
| 200 | 100 + 100 |

Sont aussi testés :

- aucun payload frontend supérieur à 100 ;
- limite serveur et requête HTTP forgée de 101 ;
- progression après réussite ;
- absence de progression après échec ;
- reprise exacte du lot ;
- lot réussi avec seulement une partie des propositions retournées ;
- fusion et conservation des propositions ;
- conservation d’un lemme corrigé et d’une sélection humaine désactivée ;
- absence de doublons ;
- achèvement complet sans lot suivant ;
- réinitialisation par une nouvelle analyse ;
- identité stable avec normalisation et changement de langue.

Résultats finaux :

- `node --check` sur les deux scripts frontend et le serveur : réussi ;
- groupe ciblé final : 27 tests réussis sur 27 ;
- `npm.cmd test` depuis `Node` : 136 tests réussis sur 136.

Une invocation intermédiaire de `npm.cmd test` depuis le dossier parent, qui ne contient pas de `package.json`, a produit l’erreur attendue `ENOENT`. Elle n’a écrit ni cache dans le dépôt ni artefact, puis la commande a été relancée depuis le bon répertoire avec succès.

Aucun appel OpenAI réel n’a été nécessaire.

## Recette déterministe 164 = 100 + 64

Une recette de logique sans fichier persistant a produit :

```json
{
  "payloads": [100, 64],
  "thirdPayload": 0,
  "candidates": 164,
  "uniqueCandidates": 164,
  "persistentWrites": 0
}
```

Une recette navigateur a ensuite servi les vrais fichiers frontend avec une fixture HTTP jetable et déterministe. Observations :

- bilan initial : 164 formes à examiner ;
- premier payload observé : 100 ;
- après le premier succès : 100 lignes et 64 restantes ;
- un lemme de la première ligne a été modifié et sa sélection décochée ;
- second payload observé : 64 ;
- après fusion : 164 lignes ;
- le lemme modifié et la sélection décochée sont restés inchangés ;
- 164 candidats uniques ;
- bouton final désactivé ;
- aucun troisième payload ;
- compteur d’écritures persistantes de la fixture : 0.

La fixture temporaire `Node/test/mission196-visual-fixture.cjs` a été supprimée après la recette. Aucun fichier de fixture ne subsiste.

## Validation visuelle

La page réelle a été contrôlée dans le navigateur Chromium intégré avec les réponses déterministes :

- `1440 × 900` : bilan de 164, information neutre `164 formes à examiner · prochain lot : 100`, bouton lisible `Examiner le prochain lot — 100 formes`, aucune erreur rouge ;
- `1366 × 768` : état final `164 formes examinées`, bouton final désactivé, 164 propositions fusionnées, modification humaine visible et conservée ;
- aucune erreur ni alerte dans la console du navigateur ;
- aucun chevauchement ou défaut visible sur les états examinés ;
- le tableau large conserve son défilement horizontal historique.

Les captures ont été inspectées directement pendant la recette et n’ont pas été ajoutées au dépôt. Cette recette Codex ne vaut pas validation fonctionnelle humaine de David.

## MariaDB et périmètre préservé

Le contrôle final en lecture seule `node scripts/manage-referenced-romance-languages.js --check` retourne l’état `applied`.

- 12 langues présentes ;
- `ca`, `gl`, `oc`, `ro`, `co`, `sc`, `rm` restent référencées, inactives et sans dépendance ;
- volumes inchangés : `150 / 597 / 16 / 12 / 70 / 1 / 8`.

Aucune migration, requête d’écriture, création de mapping, modification de langue ou transformation de données n’a été exécutée.

## Processus

- le serveur Dico préexistant et authentifié sur le port 3000, PID observé `16680`, a été préservé ;
- une tentative de démarrage supplémentaire n’a pas conservé de processus, le port étant déjà occupé ;
- le serveur de fixture sur le port 3100, PID `64816`, a été arrêté après contrôle de son état final ;
- le port 3100 ne répondait plus après l’arrêt ;
- l’onglet de recette a été fermé et la surcharge temporaire de viewport a été réinitialisée.

Aucun processus temporaire de Mission 196 ne subsiste.

## Versions

- assistant texte : `0.1.6` ;
- administration principale : `0.1.5`, inchangée ;
- contrat API : `0.1`, inchangé ;
- package Node : `1.0.0`, inchangé.

La hausse `0.1.5 → 0.1.6` est un baby step de l’assistant concerné, justifié par l’ajout de la progression manuelle par lots.

## Limites et validation humaine

- Les tests et recettes utilisent des propositions IA simulées ; aucun comportement d’un modèle distant n’est revendiqué.
- Les écritures explicitement validées restent couvertes par le fonctionnement existant, mais n’ont volontairement pas été rejouées contre MariaDB.
- David doit encore effectuer sa validation humaine éventuelle sur un texte réel et avec son fournisseur IA configuré.

## Commit proposé

Aucun commit, push ou déploiement n’a été effectué.

Message proposé pour intégrer les rapports 195 et 196 avec la correction :

`fix(dico): examiner manuellement les formes IA par lots de 100`

