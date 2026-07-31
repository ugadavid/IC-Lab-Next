# Mission 152 — Lectures multi-tables cohérentes de Proto05

Date : 31 juillet 2026

Prototype : `prototypes/05-augmented-ic-video-01`

Version observée et obtenue : **`0.1.48`**, inchangée

## Conclusion

Les projections MariaDB composées de Proto05 observent désormais un seul état
transactionnel. Le chargeur canonique emprunte une connexion à un pool borné,
établit immédiatement un snapshot `REPEATABLE READ` en lecture seule, exécute
les 29 lectures ordonnées sur cette même connexion, puis termine la transaction
avant toute projection de route, tout rendu ou tout streaming.

Deux scénarios MariaDB déterministes ont intercalé un commit concurrent au
milieu d'une lecture d'asset puis d'activité. La première projection est restée
entièrement dans l'ancien état ; la suivante a vu entièrement le nouvel état.
Ils couvrent aussi apparition, suppression, erreur interne, rollback,
libération et réutilisation du pool. Le writer concurrent n'a pas été bloqué.

Les onze suites suivies passent à **114/114**. La variation exacte par rapport
à 112/112 correspond aux deux nouveaux tests de snapshot. La recette Chromium
des cinq parcours demandés est concluante et n'a produit aucune erreur console.

## État initial

Le dépôt était propre sur `main`, révision `8edad1f`, avec la Mission 151
commitée. Le chargeur `createMariaDbReadonlyAdapter().readSnapshot()` ouvrait
une connexion dédiée et exécutait séquentiellement 29 `SELECT`, sans
transaction commune. Un commit concurrent pouvait donc devenir visible entre
deux tables et produire une projection hybride.

MariaDB a été inspectée sans modifier ses données :

- serveur `11.8.6-MariaDB-ubu2404` ;
- isolation de session initiale `REPEATABLE-READ` ;
- autocommit actif hors transaction explicite ;
- les 29 tables participant à la projection sont toutes en InnoDB ;
- la syntaxe `START TRANSACTION READ ONLY, WITH CONSISTENT SNAPSHOT` est
  acceptée par l'instance réelle.

## Cartographie des lectures composées

Le serveur possède déjà une frontière commune. Pour chaque requête API GET ou
HEAD concernée, `requestNeedsReadContext()` demande un snapshot au
`proto05ReadBoundary()`, puis `AsyncLocalStorage` transmet cette projection à
`handleApiInReadContext()` et aux fonctions métier. Les routes de mutation
relisent également un snapshot canonique lorsqu'elles doivent construire leur
réponse, sans partager la transaction d'écriture.

| Projection exposée | Entrées principales | Données assemblées | Avant M152 | Après M152 |
| --- | --- | --- | --- | --- |
| Vidéothèque et catalogue | `/teacher/videos`, `/api/proto05/video-catalog`, `/api/proto05/library/assets` | assets, sources, playables, métadonnées techniques, dossiers, étiquettes, liens d'activité | 29 requêtes, une connexion, aucune transaction | 29 requêtes, même connexion et même snapshot |
| Fiche média | route de détail de la bibliothèque et page `/teacher/videos/:id` | asset, provenance, filiations, sources, playables, traitements, usages | même risque d'état hybride | même snapshot partagé |
| Bibliothèque d'activités | `/teacher`, `/api/proto05/activity-library`, `/api/proto05/activities` | activités, identité pédagogique, qualification, médias, état de publication | même risque | même snapshot partagé |
| Atelier auteur | `/teacher/author/:id`, détail et `authoring` de l'API activité | activité, langues, transcription, locuteurs, segments, intervalles, couches, phénomènes, annotations, overlays | même risque | même snapshot partagé |
| Projection jouable | `/teacher/preview/:id`, `/student/:id`, détail API de l'activité | activité publiée, vidéo, transcription et enrichissements | même risque ; une relation pouvait provenir d'un commit plus récent | même snapshot partagé |

Il n'existe pas de table séparée de « version publiée » dans le modèle actuel :
l'état publié est porté par `activities.status` et ses relations dans le même
snapshot. L'activité, ses données d'authoring et sa projection jouable ne
retournent donc pas vers le pool pendant leur assemblage SQL.

Les 29 tables sont regroupées en quatre ensembles : témoin et référentiels
(`data_projection_metadata`, langues, dossiers), activité et identité
pédagogique, authoring et relations, puis catalogue média et traitements. Une
projection exécute exactement un `SELECT` ordonné par table. Le filtrage et la
construction des réponses spécifiques se font ensuite en mémoire, après la
fin de la transaction.

### Lectures volontairement hors snapshot composé

- `/api/health` et la reprise diagnostique vérifient connexion et grants ;
- les fichiers statiques et pages HTML ne lisent pas eux-mêmes le métier ;
- le streaming de fichiers locaux, les passerelles média et HLS, et les flux
  distants relèvent du système de fichiers ou du réseau ;
- le rendu Chromium, la lecture vidéo et la durée d'une session utilisateur ;
- plusieurs requêtes HTTP successives, qui restent des unités distinctes.

Ces parcours ne nécessitent pas un snapshot multi-table et ne doivent surtout
pas prolonger une transaction pendant une opération physique ou réseau. Les
petits catalogues API actuellement servis depuis la frontière commune
continuent de la partager ; les extraire n'apportait aucun gain fonctionnel à
cette mission.

## Niveau d'isolation et garantie retenue

La transaction utilise :

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION READ ONLY, WITH CONSISTENT SNAPSHOT;
```

`WITH CONSISTENT SNAPSHOT` établit la vue dès l'ouverture, avant le premier
`SELECT`. Sous InnoDB et `REPEATABLE READ`, les lectures cohérentes suivantes
réutilisent cette vue. Une ligne absente à cet instant — y compris une relation
qui sera insérée par un writer — reste absente jusqu'à la fin de la projection.
Une ligne supprimée après l'ouverture reste visible dans son état antérieur.
La requête HTTP suivante obtient un nouveau snapshot et voit le commit.

`READ COMMITTED` n'est pas suffisant : MariaDB construit une nouvelle vue de
lecture pour chaque lecture cohérente, ce qui permettrait précisément le
mélange que la mission doit empêcher. `SERIALIZABLE` est plus fort que
nécessaire et pourrait transformer certaines lectures en lectures verrouillées.
Le mécanisme retenu repose sur MVCC, sans verrou métier explicite.

Références MariaDB officielles :

- [Transactions REPEATABLE READ](https://mariadb.com/docs/server/reference/sql-statements/transactions/transactions-repeatable-read)
- [START TRANSACTION](https://mariadb.com/docs/server/reference/sql-statements/transactions/start-transaction)
- [WITH CONSISTENT SNAPSHOT](https://mariadb.com/docs/server/ha-and-performance/standard-replication/enhancements-for-start-transaction-with-consistent-snapshot)
- [SET TRANSACTION](https://mariadb.com/docs/server/reference/sql-statements/transactions/set-transaction)

## Mécanisme partagé

`runConsistentReadSnapshot()` porte le cycle commun :

```text
acquisition d'une connexion du pool
→ isolation REPEATABLE READ pour la prochaine transaction
→ transaction READ ONLY avec snapshot immédiat
→ projection complète sur la connexion reçue
→ COMMIT, ou ROLLBACK sur toute erreur
→ libération certaine de la connexion
```

L'adaptateur crée un unique pool `mysql2` borné à six connexions et le ferme à
l'arrêt du serveur. `readSnapshot()` transmet explicitement la connexion à la
boucle des 29 lectures ; aucune fonction interne n'acquiert une autre
connexion. Le snapshot est projeté vers le modèle applicatif, puis la route
travaille uniquement en mémoire.

Une erreur de projection reste l'erreur principale. Une éventuelle erreur
secondaire de rollback ou de libération est attachée comme information de
nettoyage sans masquer la cause initiale. Après succès, `COMMIT` précède
toujours `release()` ; après erreur, `ROLLBACK` précède toujours `release()`.

Le point de synchronisation optionnel après lecture d'une table n'est utilisé
que par les tests. Il permet une orchestration déterministe sans temporisation
probabiliste et ne modifie aucun parcours de production.

## Tests de concurrence et du pool

### Cycle transactionnel pur

Un premier test contrôle l'ordre exact des opérations en succès. Il injecte
ensuite simultanément une erreur métier, une erreur de rollback et une erreur
de libération : la même erreur métier est propagée, les deux échecs secondaires
sont conservés, et la libération est tout de même tentée.

### Scénario MariaDB réel — asset composé

Une activité, deux assets, un dossier et une étiquette jetables sont créés. La
connexion A ouvre le snapshot et s'arrête après `media_assets`. La connexion B
modifie puis committe en une transaction :

- titre et dossier de l'asset ;
- fournisseur de la source et disponibilité du playable ;
- filiation du second asset ;
- relation d'étiquette ;
- apparition d'un traitement.

Le commit B termine en moins de trois secondes pendant que A est suspendue.
La projection A contient exclusivement les anciennes valeurs et aucune
relation nouvelle. La lecture suivante contient exclusivement les nouvelles
valeurs et toutes les nouvelles relations.

### Scénario MariaDB réel — activité composée

La connexion A s'arrête après `activities`. La connexion B modifie puis
committe :

- titre et état `draft` vers `published` ;
- texte d'un segment ;
- contenu d'une annotation ;
- bornes d'un phénomène ;
- apparition d'une seconde annotation ;
- suppression d'un intervalle linguistique.

La projection A conserve entièrement l'état antérieur, y compris l'intervalle
supprimé et l'absence de la nouvelle annotation. La lecture suivante restitue
entièrement l'état publié et les relations après commit.

### Erreur, réutilisation et absence de fuite

Une erreur identifiable est injectée au milieu de la table des segments. Sa
cause est conservée, la connexion est rendue, puis trois lectures complètes
successives réussissent. L'instrumentation démontre pour chaque projection :

- un seul objet connexion pour les 29 lectures ;
- nombre de connexions acquises égal au nombre libéré ;
- zéro connexion active après chaque lecture et après l'erreur ;
- maximum d'une connexion active dans cette séquence contrôlée ;
- fermeture du pool exactement une fois.

Le compte applicatif ne possède volontairement pas le privilège global
`PROCESS`, donc une inspection de toutes les transactions serveur via
`information_schema.innodb_trx` a été refusée. Les grants n'ont pas été élargis :
la preuve demandée repose sur le cycle instrumenté, le rollback réel, les
répétitions réussies et la fermeture du pool.

## Nettoyage et non-altération

Le test supprime ses relations d'authoring dans l'ordre des clés étrangères,
puis ses activités, traitements, relations média, assets, sources, playables,
dossier, étiquette et fichiers jetables. Il restaure aussi les dates du témoin
de projection affectées par les mutations de test.

Les cardinalités des 29 tables sont comparées avant et après le scénario et
sont identiques. La vérification HTTP finale trouve quatre activités réelles,
zéro activité et zéro asset marqués M152. La recherche du workspace ne trouve
aucun script, fichier déplacé ou résidu de fixture M152.

Lors d'une première exécution de développement, le nettoyage direct de
`activities` ne respectait pas toutes les clés étrangères et a laissé une
fixture exacte. Elle a été identifiée par son marqueur unique, supprimée dans
l'ordre relationnel avec ses deux petits fichiers temporaires, puis le test a
été corrigé. Les contrôles finaux ci-dessus ont été réalisés après ce correctif.
Aucune donnée de David ni aucun média canonique n'a été touché.

Aucun schéma, migration, JSON, donnée réelle, média réel, version, traitement
FFmpeg, outbox ou contrôle optimiste d'écriture n'a été modifié. Aucun fallback
JSON n'a été réintroduit.

## Recette Chromium

Après redémarrage du serveur avec le code de la mission :

- `/teacher/videos` charge les neuf cartes sans contenu partiellement vide ;
- une fiche média réelle affiche identité, provenance, technique, filiation,
  sources, copies, publications, historique, usages et actions ;
- `/teacher` affiche les quatre activités et leurs navigations ;
- l'atelier auteur d'une activité réelle affiche ses données, dont la
  transcription existante ;
- `preview` affiche vidéo, chronologie, onze segments de transcription, sept
  contrôles de couches et annotations ;
- `student` affiche le même lecteur et les mêmes ensembles pertinents ;
- les deux vidéos sont prêtes, sans altération de lecture ;
- aucune erreur ni aucun avertissement n'est présent dans la console.

Cette inspection a été strictement en lecture. La transaction SQL est déjà
terminée lorsque les pages reçoivent leurs données ; navigation, changement de
page et lecture vidéo ne conservent donc aucun snapshot ouvert. La recette de
Codex est une preuve technique et non la validation humaine de David.

## Résultats automatisés

```text
Test transactionnel pur                   1/1 réussi
Test MariaDB concurrent réel              1/1 réussi
mariadb-only-runtime.test.js              9/9 réussis
Suite Proto05 complète                    114/114 réussis
Fichiers de test suivis                   11
Échecs / tests ignorés                    0 / 0
Syntaxe Node des deux fichiers modifiés   valide
git diff --check                          propre
```

La variation de **112 à 114** est exactement constituée des deux tests ajoutés
dans le fichier de tests MariaDB existant. Aucun test existant n'a été retiré,
ignoré ou affaibli.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `reports/152_proto05_consistent_multitable_read_snapshots_report.md`

## Limites et éléments non vérifiés

- La mission garantit la cohérence interne d'une projection SQL, pas celle de
  plusieurs requêtes HTTP ou d'une session utilisateur entière.
- Le filesystem, les flux locaux ou distants et les effets physiques restent
  hors de la transaction MariaDB, conformément au périmètre.
- Aucun crash de processus ou arrêt brutal de MariaDB n'a été injecté au milieu
  d'une projection ; les erreurs applicatives, rollback, libération et reprise
  ont été couverts.
- Les conflits entre deux writers et les contrôles de révision sont hors M152.

## Recette humaine minimale laissée à David

1. Ouvrir `/teacher/videos`, puis une fiche média possédant plusieurs sources
   ou traitements ; vérifier que toutes ses sections se chargent ensemble.
2. Ouvrir une activité réelle dans l'atelier sans la modifier.
3. Ouvrir sa prévisualisation puis sa vue étudiante ; vérifier vidéo,
   transcription, couches et annotations.
4. Revenir à la bibliothèque et confirmer que la navigation reste normale.
5. Vérifier la console du navigateur : aucune nouvelle erreur attendue.

## Proposition de message de commit

```text
fix(proto05): read composed projections from consistent snapshots
```
