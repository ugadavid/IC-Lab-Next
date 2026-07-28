# Mission 141 — Proto05 — Écritures transactionnelles MariaDB

Date : 28 juillet 2026

Statut : **réalisée — correctif de recette automatisé, validation humaine finale laissée à David**

## 1. Résultat

Proto05 dispose désormais de quatre modes explicites :

| Mode | Lectures | Mutations | Fallback |
| --- | --- | --- | --- |
| `json` | JSON | JSON historiques | aucun |
| `compare` | JSON + MariaDB, réponse JSON | refusées | aucun |
| `mariadb-readonly` | MariaDB | refusées | aucun |
| `mariadb` | MariaDB | MariaDB transactionnelle | aucun |

En mode `mariadb`, aucune lecture ni écriture applicative ne consulte les JSON.
Chaque mutation :

1. part du snapshot relationnel lu pour la requête ;
2. applique le service métier existant ;
3. transforme le snapshot canonique en lignes relationnelles ;
4. acquiert un verrou applicatif MariaDB ;
5. ouvre une transaction `SERIALIZABLE` ;
6. calcule uniquement les `INSERT`, `UPDATE` et `DELETE` nécessaires ;
7. relit les 29 tables du contrat ;
8. compare sémantiquement le résultat attendu et le résultat relationnel ;
9. effectue `COMMIT` si et seulement si la comparaison est à zéro divergence ;
10. effectue `ROLLBACK` sur toute erreur, divergence ou échec forcé.

Le schéma existant représente toutes les mutations inventoriées. Aucun SQL,
grant, JSON canonique, média, autre prototype ou autre base n'a été modifié.

Version initiale : `0.1.47`.

Version finale : **`0.1.48`**.

## 2. Préflight et sécurité

| Contrôle | Résultat |
| --- | --- |
| Git initial | propre |
| Mission 140 | commitée, `6cf4c68` |
| Version initiale | `0.1.47` |
| Comparaison JSON/MariaDB brute | 0 divergence |
| Comparaison applicative | 0 divergence |
| Compte applicatif | identité et base conformes |
| Grants Proto05 | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `SHOW VIEW` |
| Global | `USAGE` uniquement |
| DDL, `EXECUTE`, délégation | absents |
| Accès `ic_dico` / `ic_hub` | absent |

La configuration est restée uniquement dans `.env.local`, ignoré par Git.
Aucun secret n'a été lu, affiché, copié dans un log, le code, les tests ou ce
rapport.

La méthode de la skill personnelle `migrate-json-to-mariadb-safely` a conduit
les garde-fous : inspection du prototype réel, séparation domaine/stockage,
frontières explicites, comparaison sémantique avant commit, rollback injecté et
preuve de nettoyage.

## 3. Frontières et responsabilités

### Domaine

Les routes et services existants restent responsables de :

- la validation des payloads ;
- la création des identifiants ;
- les états `unknown` / `to-verify` ;
- l'intégrité des activités ;
- la filiation pédagogique ;
- la projection `activity.video` depuis `videoRef` ;
- les règles HLS, YouTube, assets, playables, rôles et traitements ;
- les compensations de fichiers déjà existantes.

### Stockage

`proto05-mariadb-write.js` est le seul nouveau composant qui produit du DML
MariaDB. Il :

- contrôle les grants à chaque connexion d'écriture ;
- réutilise le mapping relationnel du dry-run via une entrée pure en mémoire ;
- ne contient aucune règle d'interface ni de route ;
- ne produit que du DML paramétré sur les tables connues ;
- ordonne parents, enfants et relations cycliques différées ;
- ne modifie pas une ligne déjà égale ;
- ne contient ni synchronisation, ni double écriture, ni fallback JSON ;
- restitue des erreurs expurgées de toute donnée de connexion.

`proto05-write-boundary.js` sélectionne l'adaptateur selon le mode. La frontière
de lecture de Mission 140 sert également `mariadb`, avec le même mapping et sans
accès JSON.

## 4. Inventaire des mutations

Toutes les mutations persistantes identifiées sont raccordées au writer
transactionnel commun.

| Mutation | Route ou service | Principales tables | Transaction | Validation |
| --- | --- | --- | --- | --- |
| Créer, modifier, sauvegarder une activité | `POST/PUT /api/proto05/activities...` | `activities`, identités, textes, langues, transcriptions, segments, couches, phénomènes, annotations, overlays, liens média | unique | tests JSON, recette MariaDB |
| Dupliquer une activité | `POST .../:id/duplicate` | même graphe + filiation | unique | recette réelle |
| Supprimer une activité | `DELETE .../:id` | graphe activité + classement | unique, enfants avant parent | recette réelle |
| Changer `videoRef` | `PUT .../:id/video-ref` | `activity_media_links`, `activities` | unique | projection et contrat média |
| Dossiers et classement d'activités | routes `activity-library` | `activity_folders`, `activities`, métadonnée documentaire | unique | recette multi-table |
| Catalogue vidéo | `POST /video-catalog` | assets, sources, playables, métadonnée documentaire | unique | recette YouTube temporaire |
| Dossiers, tags et classement média | routes `library/folders`, `tags`, `classification` | `media_folders`, `media_tags`, `media_asset_tags`, `media_assets` | unique | recette réelle |
| Ajouter/supprimer un asset | routes `library/assets` | assets, sources, playables, métadonnées, tags, traitements | unique | asset distant fictif temporaire |
| Référence distante confirmée | service de confirmation | assets, sources, playables | unique | chemin commun + tests existants |
| Copie locale finalisée | service de finalisation | sources, playables, métadonnées, asset par défaut | unique après compensation fichier | chemin commun |
| Rôle d'accès | route `accesses/.../role` | sources, playables, assets | unique | contrat média |
| Suppression copie/dérivation | services dédiés | playables, sources, traitements, asset par défaut | unique avec compensation fichier | chemin commun |
| Dérivation HLS finalisée | service de finalisation | sources, playables, métadonnées, traitements, assets | unique après production fichier | contrat média, sans lancer FFmpeg |

Les configurations et tâches strictement en mémoire restent hors base tant
qu'elles ne produisent pas un objet canonique final. Les opérations physiques
conservent leurs sauvegardes/restaurations existantes autour de la transaction
MariaDB.

## 5. Fichiers concernés

Créés :

- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-write-boundary.js` ;
- `prototypes/05-augmented-ic-video-01/shared/guided-authoring-contract.js` ;
- `prototypes/05-augmented-ic-video-01/shared/playable-layers.js` ;
- `prototypes/05-augmented-ic-video-01/shared/playable-overlays.js` ;
- `prototypes/05-augmented-ic-video-01/shared/playable-transcription.js` ;
- `prototypes/05-augmented-ic-video-01/shared/playable-phenomena.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/guided-authoring-regression.test.js` ;
- `reports/141_proto05_mariadb_transactional_writes_report.md`.

Modifiés :

- `prototypes/05-augmented-ic-video-01/database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-data-mode.js` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-read-boundary.js` ;
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js` ;
- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/proto05-data-read-boundary.test.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js` ;
- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.js` ;
- `prototypes/05-augmented-ic-video-01/index-0.0.9.html` ;
- `prototypes/05-augmented-ic-video-01/teacher-guided.html` ;
- `prototypes/05-augmented-ic-video-01/guided-overlays.js` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `prototypes/05-augmented-ic-video-01/server/package.json` ;
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`.

L'export ajouté au dry-run construit le modèle relationnel depuis un snapshot
en mémoire. Son exécution historique sur fichiers, ses diagnostics, son hash et
ses SQL ne sont pas modifiés.

## 6. Tests automatisés

| Contrôle | Résultat |
| --- | --- |
| Syntaxe Node des fichiers touchés | réussi |
| Frontières JSON/compare/readonly/mariadb | 11/11 |
| Validation stricte des grants applicatifs | réussie |
| Plan insert/update/delete/no-op | réussi |
| Rollback injecté après le premier DML | rollback 1, commit 0 |
| API auteur JSON historique ciblée | 6/6 |
| Persistance et classification Library JSON | 10/10 |
| Autorité vidéo et contrat média | 55/55 |
| Auto-tests du dry-run | 22/22 |
| `git diff --check` | réussi |

Total ciblé Node de la mission, correctifs inclus : **96 tests réussis**, plus
**22 auto-tests du dry-run**. Les scénarios ajoutés couvrent le contrat client
guidé, la transition complète de l’indicateur, la persistance JSON et MariaDB,
le référentiel des langues, la projection jouable des segments et celle des
overlays autonomes, le parcours réel des couches et le contrat cumulatif qui
sépare transcription permanente et enrichissements IC filtrés.

La suite globale n'a pas été lancée : certains fichiers mêlent tests Node,
Chromium ou FFmpeg. Aucun FFmpeg n'a été exécuté. Le correctif ciblé des
segments a ensuite fait l'objet d'une recette visuelle locale dans les deux
lecteurs, sans modifier de donnée canonique.

Le dry-run réel conserve son état connu de Mission 140 :

- 264 lignes préparées ;
- hash `3b3aa50f442ddf6e5c553141de5a36becf7f2fc44dd9908660cb9866c3139456` ;
- trois blocages documentaires préexistants pour les chemins `videoRef` ajoutés
  après le registre de couverture ;
- aucune nouvelle catégorie de blocage.

Cette limite n'affecte ni le mapping utilisé par l'application, ni la
comparaison réelle JSON/MariaDB, qui restent à zéro divergence.

## 7. Recette transactionnelle réelle

Une recette automatisée locale, non versionnée et sans secret, a utilisé le
compte applicatif réel et uniquement des entités identifiables :

1. capture du snapshot métier initial et des cinq hashes JSON ;
2. modification en mémoire d'une activité existante ;
3. échec forcé après le premier DML ;
4. preuve du rollback et de l'absence de commit ;
5. démarrage du serveur en mode `mariadb` ;
6. rejet HTTP d'un `videoRef` invalide ;
7. création et mise à jour d'une activité temporaire ;
8. création d'un dossier et classement multi-table ;
9. duplication et relecture HTTP ;
10. création d'un dossier média et d'un tag ;
11. création et classement d'un asset direct fictif sans accès réseau ;
12. création d'une entrée YouTube temporaire ;
13. suppression des deux activités, des assets, du tag et des dossiers ;
14. arrêt du serveur ;
15. restauration transactionnelle du snapshot de départ ;
16. comparaison sémantique finale et vérification des témoins.

Résultat :

```text
mode=mariadb
forcedRollback=true
applicationDifferences=0
jsonHashesUnchanged=5
temporaryRows=0
```

État final MariaDB :

| Témoin | Valeur |
| --- | ---: |
| Lignes totales Proto05 | 268 |
| Lignes métier | 264 |
| Métadonnées documentaires | 4 |
| Activités | 2 |
| Assets | 16 |
| Sources | 19 |
| Playables | 19 |
| Lignes temporaires Mission 141 | 0 |

Le digest métier capturé avant chaque recette est retrouvé exactement après
nettoyage. Les auto-incréments ne font pas partie de cette preuve métier.

Le hash brut de dump Proto05 observé à la fin est
`a6cdf83f703a4e690b0184719d6c2c4b704bb72c2647ffac98d849692cc5dd54`.
Il n'a pas été capturé avant la toute première transaction de la mission et
n'est donc pas présenté comme un témoin avant/après. La preuve retenue est le
snapshot métier complet, les volumes, la relecture relationnelle et l'absence
de ligne temporaire.

Autres bases :

| Base | Hash de données final | Témoin Mission 140 |
| --- | --- | --- |
| `ic_dico` | `786bd80a39604d9d25bdfd91286b5652b87c9f814afc10dd178dbde5dbb4815c` | identique |
| `ic_hub` | `3ae48844ed0b426479baf1b4d80f2b8d05352ca88cb5a03a00daceb8b68e2382` | identique |

JSON canoniques :

| Fichier | SHA-256 final, identique au témoin Mission 140 |
| --- | --- |
| `activities.json` | `b23cb97d8a07c6243b83b64da8748fab45dad62796cc06d7ec03cf3a693d6b19` |
| `activity-library.json` | `63ce330896759421397c987ccc685884ffb6e1c93663b68b7d3d6ead4c1c256a` |
| `video-catalog.json` | `89a73a4065ab84ae1b676d25fbe62fd17feb0fb51302997b49999e68b05fe373` |
| `video-library.json` | `e98c9a4f051f09020e9227a37d60cf532fa446ba684b80bfb8505dbf3519d473` |
| `languages.json` | `e3034a20260c6f77569966e3cc05618402362822b038cac4d491baee3afff355` |

## 8. Diagnostic et correctif de l’atelier guidé

La première recette humaine en mode `mariadb` a révélé trois anomalies : ajout
ou conservation d’un locuteur perçu comme non durable, création d’un phénomène
impossible selon le contexte et coexistence de deux messages de sauvegarde
contradictoires.

Le même scénario jetable a été exécuté en `json` puis en `mariadb`. Dans les
deux modes, l’API répond `200`, la validation métier accepte les entités
valides, la frontière de stockage persiste les collections et relations, et
une relecture après redémarrage restitue le locuteur, son association au segment
et le phénomène modifié. Le défaut était donc commun au client guidé, pas propre
à l’adaptateur MariaDB.

| Étape | Locuteur | Phénomène |
| --- | --- | --- |
| Bouton | ouvre un éditeur ; `Appliquer` insère ou modifie l’entité en mémoire | crée une occurrence au temps courant |
| Payload | plusieurs constructeurs concurrents existaient, dont un omettait `speakers` | `phenomena`, `segments` et `layers` étaient présents |
| HTTP et métier | `PUT .../authoring`, libellé non vide, identifiants et références valides | même route, intervalle non nul, segment et couche existants, cache dérivé cohérent |
| MariaDB | `activity_speakers` et relation segment-locuteur dans la transaction commune | `activity_phenomena` et références segment/couche dans la même transaction |
| Relecture | conforme après redémarrage | conforme après redémarrage |

La création d’un phénomène pouvait auparavant retenir le segment sélectionné
mais conserver un temps de lecture extérieur à ce segment ; elle pouvait aussi
créer une occurrence sans couche. L’état client devenait alors invalide avant
le refus du serveur. La correction vérifie désormais, avant mutation :

- la présence d’un segment et d’une couche pédagogique ;
- une position de lecture dans un segment ou une sélection explicite ;
- un intervalle entier, non nul, inclus dans le segment et dans la vidéo.

Si la tête de lecture est hors segment mais qu’un segment est sélectionné,
l’occurrence est placée au début du segment et l’interface l’indique. Sinon, un
message décrit le prérequis manquant et aucune mutation n’est réalisée.

Le payload guidé est maintenant construit par un contrat client unique qui
inclut explicitement `speakers` et toutes les collections auteur. Les trois
chemins de sauvegarde historiques de la page l’utilisent, supprimant leur
divergence.

Le miroir d’état testait auparavant le motif générique `modifi` avant le motif
`enregistrées` : « Modifications enregistrées » était classé comme état sale.
Le test de « non enregistré » est maintenant spécifique et prioritaire. Dès une
nouvelle saisie, le message de bas de page enregistré est remplacé par
« Modifications non enregistrées » ; les deux indicateurs ne peuvent plus
afficher des états opposés.

### Preuves du correctif

| Contrôle | Résultat |
| --- | --- |
| Contrat guidé et prérequis du phénomène | réussi |
| Transition enregistré → local → non enregistré → sauvegarde → enregistré | réussie |
| JSON : ajout, modification, sauvegarde, redémarrage, relecture, suppression | réussi |
| MariaDB réelle : même scénario transactionnel et nettoyage | réussi |
| Réponses HTTP de sauvegarde | `200` dans les deux modes |
| Frontières et rollback MariaDB | 11/11 |
| API auteur JSON ciblée | 6/6 |
| Contrat média ciblé | 5/5 |
| Auto-tests du dry-run | 22/22 |
| Syntaxe Node et 11 scripts inline de l’atelier | réussie |

Le scénario MariaDB a créé une activité, un locuteur, un segment, une couche et
un phénomène identifiables comme tests. Il les a modifiés, a redémarré le
serveur, les a relus puis a supprimé l’activité. La relecture finale renvoie
`404` pour l’activité jetable. Aucun JSON canonique n’a été écrit ; les cinq
hashes restent identiques aux témoins de la mission.

Les anciens tests qui attendent encore sept activités ou des copies historiques
supprimées échouent sur ces hypothèses obsolètes. Conformément à la consigne de
David sur les anciennes données de développement, ils n’ont pas été
réinterprétés ici ; les nouveaux tests utilisent uniquement des entités
jetables et ne dépendent d’aucun compteur historique.

Le correctif ne modifie ni le schéma SQL, ni MariaDB hors données jetables, ni
les JSON canoniques, ni la version `0.1.48`.

### Correctif ciblé — référentiel des langues

La chaîne a été contrôlée dans l’ordre suivant :

```text
languages → adaptateur MariaDB → languageCatalog/API → état client → menu Langue
```

L’adaptateur lisait déjà les quatre lignes actives de `languages` et les
projetait dans `languageCatalog`. L’API `/api/proto05/language-catalog` les
exposait correctement. La perte se produisait dans l’atelier guidé : il ne
chargeait pas cet endpoint et construisait le menu depuis
`activity.languages`, collection volontairement vide dans un nouveau
brouillon.

L’atelier charge maintenant le référentiel en parallèle de l’activité, produit
les options du menu depuis cette liste et, lors de l’application, ajoute la
langue sélectionnée à `activity.languages` avant d’enregistrer l’intervalle.
Aucune liste n’est codée en dur.

Preuves :

- 4 langues réellement lues : `es`, `fr`, `it`, `pt` ;
- 4 options produites avec les libellés relationnels ;
- sauvegarde HTTP MariaDB réussie pour un intervalle jetable ;
- langue et intervalle retrouvés après redémarrage du serveur ;
- activité jetable supprimée puis relue en `404` ;
- contrôle SQL final : 0 activité et 0 intervalle temporaires ;
- cinq hashes JSON canoniques inchangés ;
- syntaxe Node et 11 scripts inline valides.

### Correctif ciblé — affichage des segments de transcription

La chaîne a été suivie de bout en bout :

```text
atelier guidé → payload auteur → activity_segments → adaptateur/API
→ projection jouable commune → preview enseignant et vue étudiante
```

Le payload, la transaction MariaDB et l’adaptateur conservaient déjà l’id, le
texte et les bornes du segment. Après redémarrage, l’API les restituait
correctement. La perte se produisait dans le lecteur commun : le filtre de
transcription exigeait au moins une couche active et masquait donc tout segment
simple ou enrichi lorsque sa couche était inactive. La projection jouable est
maintenant partagée dans un module testable : tout segment valide reste visible,
qu’il porte ou non un phénomène. Seuls ses enrichissements IC sont filtrés par
les couches.

La recette interactive a également montré que le calcul temporel retrouvait
bien le segment uniquement dans son intervalle, mais que son surlignage ne se
retirait pas ensuite. Le lecteur retire maintenant ce seul état visuel hors de
l’intervalle, sans masquer le texte ni modifier l’interface.

Preuves :

- ligne SQL MariaDB : id, texte, début `1000` et fin `3000` conformes ;
- mêmes valeurs relues par l’API après redémarrage du serveur ;
- test ciblé de projection et de visibilité : réussi ;
- test MariaDB réel de persistance, redémarrage, deux routes et nettoyage :
  réussi ;
- `/teacher/preview/:id` et `/student/:activityId` affichent le même texte et
  les mêmes bornes ;
- dans les deux vues : non surligné avant 1 s, actif entre 1 s et 3 s, non
  surligné après 3 s, texte toujours lisible ;
- aucune erreur de console dans les deux pages à la dimension de recette ;
- activité et segment jetables absents de l’API après suppression ;
- contrôle SQL final : `0` activité et `0` segment temporaires ;
- aucun changement de schéma, de JSON canonique, de média ou de version.

### Correctif ciblé — affichage des overlays

La chaîne a été suivie dans l’ordre demandé :

```text
atelier guidé → état client → payload auteur → activity_overlays MariaDB
→ adaptateur/API → projection jouable commune → preview et student
```

L’atelier créait bien un overlay autonome, l’ajoutait à
`state.activity.overlays`, puis `buildAuthoringPayload` l’incluait dans le
payload. La transaction, les tables `activity_overlays` et
`activity_overlay_layers`, l’adaptateur et l’API conservaient déjà le contrat.
La première perte se produisait dans `updateOverlay` : le lecteur exigeait au
moins une couche active et masquait donc tout overlay dont `layerIds` était
vide, alors que cette relation est explicitement facultative.

La projection et la sélection temporelle des overlays sont maintenant portées
par un contrat partagé testable. Un overlay autonome reste visible pendant son
intervalle ; un overlay enrichi par des couches conserve le filtrage historique
de ces couches.

Le contrat actuellement créable et persisté ne possède qu’un type de carte
textuelle et ne contient aucun champ `type`, position ou dimensions. Ceux-ci ne
peuvent donc pas être « préservés » comme données sans modifier le modèle ou le
schéma, ce qui était interdit. La position et les dimensions appartiennent au
composant de rendu commun ; leur identité a été vérifiée dans les deux vues.

Preuves :

- payload auteur : collection `overlays` complète et inchangée ;
- ligne SQL : id, annotation facultative `NULL`, début `1000`, fin `3000`,
  titre, texte et ordre conformes ;
- API après redémarrage : mêmes valeurs et `layerIds: []` ;
- test de projection : absent avant 1 s, présent entre 1 s et 3 s, absent dès
  3 s ;
- test de non-régression des overlays enrichis : caché sans sa couche, visible
  avec sa couche active ;
- preview et student : même titre, même texte et même intervalle ;
- composant identique : position absolue, gauche `24px`, bas `24px`, largeur
  `390px`, padding `14px` et rayon `10px` dans les deux vues ;
- aucune erreur de console ;
- activité jetable supprimée puis relue en `404` ;
- contrôle SQL final : `0` activité, `0` overlay et `0` relation de couche
  temporaires ;
- aucun changement de schéma, de donnée ou média canonique, ni de version.

### Correctif ciblé — couches dans les interfaces jouables

L’activité réelle inspectée contient deux couches, « Couche une » et « Couche
deux », et un overlay. Cet overlay n’est pas autonome : sa relation
`layerIds` contient uniquement l’identifiant de « Couche une ». « Couche deux »
n’y est pas associée. L’état auteur reconstruit, le payload produit par
`buildAuthoringPayload`, les tables MariaDB et la réponse API concordent sur ces
valeurs.

Les deux listes `learnerVisibleLayerIds` et `teacherVisibleLayerIds`, ainsi que
`defaultVisibleLayerIds`, sont vides dans cette activité. MariaDB conserve
fidèlement cet état : aucune perte ne se produit lors de la transaction ou de
la relecture.

La rupture se trouvait dans le lecteur commun. Une liste de visibilité vide
était interprétée comme « aucune couche disponible » : les contrôles
disparaissaient, ce qui rendait impossible toute activation de la couche
nécessaire à l’overlay. Le lecteur distingue maintenant :

- les couches disponibles : toutes les couches lorsque la liste d’audience est
  vide, sinon la sélection explicite de cette audience ;
- les couches actives au chargement : uniquement
  `defaultVisibleLayerIds`.

Preview utilise la liste enseignant et student la liste apprenant, par le même
contrat partagé. Une activation ou désactivation recalcule immédiatement
l’overlay, même lorsque l’activité ne contient aucun segment.

Preuves :

- activité réelle : deux contrôles retrouvés, tous deux initialement inactifs,
  dans preview et student ;
- fixture MariaDB : deux couches distinctes et deux overlays, dont un autonome
  et un associé uniquement à la première couche ;
- payload, tables `activity_layers`, `activity_layer_visibility`,
  `activity_overlays` et `activity_overlay_layers` conformes ;
- mêmes couches et mêmes `layerIds` relus par l’API après redémarrage ;
- overlay autonome visible entre 1 s et 3 s sans couche active ;
- overlay enrichi caché dans son intervalle lorsque les deux couches sont
  inactives ;
- activation de la seconde couche : overlay enrichi toujours caché ;
- activation de la première couche : overlay enrichi immédiatement visible
  dans preview et student ;
- nouvelle désactivation de la première couche : overlay immédiatement masqué ;
- aucune erreur de console et aucune anomalie visuelle observée dans les deux
  vues ;
- nettoyage SQL final : `0` activité, couche, visibilité, overlay ou relation
  jetable ;
- activité réelle non modifiée : deux couches, un overlay et une relation avant
  comme après la recette ;
- aucun changement de schéma, donnée ou média canonique, ni de version.

### Correctif cumulatif — transcription permanente et phénomènes IC

L’activité réelle créée par David a été inspectée dans l’état auteur, MariaDB,
l’API et la projection jouable. Elle contient trois segments et trois
phénomènes : deux phénomènes sont associés à « Couche une », le troisième à
« Couche deux ». Les trois listes de visibilité initiale sont vides ; les deux
couches sont donc disponibles mais inactives au chargement.

Le premier maillon défaillant était le filtre du lecteur commun. Les couches
des phénomènes étaient dérivées dans `segment.tags`, puis cette collection
servait aussi à décider si le segment lui-même devait être rendu. Sans couche
active, la transcription disparaissait avec l’enrichissement. L’activation
manuelle de « Couche une » faisait ainsi réapparaître uniquement les deux
segments portant ses phénomènes.

Le contrat est maintenant séparé en deux projections :

- `playable-transcription.js` projette tous les segments et les conserve
  visibles indépendamment des phénomènes et des couches ;
- `playable-phenomena.js` projette les occurrences IC et filtre uniquement ces
  enrichissements selon la couche active.

Preview et student chargent les mêmes modules et la même activité projetée.
L’activation d’une couche recalcule immédiatement la timeline des phénomènes,
sans retirer ni recréer le texte de transcription.

Preuves sur l’activité réelle de David :

- état auteur, payload reconstruit, SQL et API concordants : 3 segments,
  3 phénomènes et 2 couches ;
- sans couche active : 3 segments visibles et aucun phénomène ;
- « Couche une » active : 3 segments toujours visibles et les 2 phénomènes de
  cette seule couche visibles ;
- nouvelle désactivation : 3 segments toujours visibles et aucun phénomène ;
- aucune sauvegarde ni modification de l’activité réelle ; les volumes SQL
  finaux restent 3 segments, 3 phénomènes et 2 couches.

Recette cumulative par le parcours utilisateur réel :

- création d’un brouillon depuis `/teacher/create`, puis ajout dans l’atelier
  guidé de deux couches, d’un segment simple `1000–3000`, d’un segment enrichi
  `4000–6000` et d’un phénomène associé uniquement à la première couche ;
- contrôle SQL direct des deux segments, des deux couches et de la relation
  phénomène–segment–couche ;
- après sauvegarde, rechargement et redémarrage : API conforme ;
- dans preview et student, les deux segments restent visibles avec toutes les
  couches décochées ;
- activation de la seconde couche : phénomène toujours masqué ;
- activation de la première couche : phénomène visible immédiatement dans les
  deux lecteurs ;
- désactivation de la première couche : phénomène masqué, deux segments
  conservés ;
- surlignage temporel vérifié dans les deux lecteurs : aucun segment actif à
  `0 s`, premier segment actif dans `1–3 s`, second actif dans `4–6 s`, aucun
  segment actif après son intervalle ;
- contrôles visuels effectués sur preview et student, sans erreur ni
  avertissement de console ;
- activité jetable supprimée, API finale `404`, contrôle SQL final :
  `0` activité, `0` couche, `0` segment et `0` phénomène temporaires.

Le test cumulatif ajouté exerce également deux overlays — autonome et enrichi —
afin d’empêcher les correctifs des couches, overlays, phénomènes et
transcriptions de se casser mutuellement. Aucun schéma, JSON canonique, média
canonique ou numéro de version n’a été modifié.

### Correctif UX ciblé — bornes des intervalles linguistiques

L’atelier copiait auparavant les valeurs des curseurs dans l’intervalle avant
de vérifier leur cohérence, puis affichait seulement un diagnostic temporel
générique en bas de page. La saisie invalide n’était donc pas expliquée près des
champs.

La validation des bornes est maintenant pure et non mutante en cas d’échec.
Lorsque `fin <= début`, les deux champs sont signalés par `aria-invalid`, un
état visuel local et le message « La fin doit être postérieure au début. ».
Les valeurs restent dans l’éditeur pour correction, mais ni `Appliquer` ni
`Enregistrer` ne les inscrivent dans l’activité. Le message et l’état invalide
disparaissent immédiatement dès que les bornes redeviennent cohérentes. Les
bornes absentes, négatives ou hors durée conservent des messages distincts.

Preuves :

- création et modification : `10 s → 5 s` et `10 s → 10 s` refusés, valeurs
  conservées et aucun faux état enregistré ;
- correction à `10 s → 15 s` : erreur retirée, application et sauvegarde
  possibles ;
- rechargement et SQL : un seul intervalle `es`, `10000–15000` ;
- contrôle visuel des deux champs invalides et du message local ;
- aucune erreur ni avertissement de console ;
- activité jetable supprimée, API `404`, contrôle SQL final à `0` activité et
  `0` intervalle temporaires ;
- aucun changement de schéma, de donnée canonique ou de version.

## 9. Recette humaine finale pour David

Depuis `prototypes/05-augmented-ic-video-01/server` :

```powershell
$env:PROTO05_DATA_MODE = 'mariadb'
node --env-file=../.env.local server.js
```

Puis :

1. ouvrir `http://127.0.0.1:8791/teacher` ;
2. vérifier que les deux activités existantes et leurs vidéos HLS/YouTube sont
   lisibles ;
3. créer une activité nommée exactement `[RECETTE M141] Activité temporaire` en
   choisissant une vidéo existante ;
4. modifier son titre, sa description et une information pédagogique, puis
   sauvegarder et recharger la page ;
5. créer le dossier `[RECETTE M141] Dossier temporaire`, y classer l'activité,
   puis vérifier le classement après rechargement ;
6. dupliquer l'activité et vérifier que la copie est une variante pédagogique
   reliée à sa source ;
7. ouvrir la bibliothèque vidéo, créer le dossier et le tag
   `[RECETTE M141] temporaire`, puis classer uniquement un asset de recette
   explicitement créé à cet effet ; ne pas modifier un asset canonique
   préexistant ;
8. supprimer d'abord la copie, puis l'activité source, l'asset de recette, le
   tag et les deux dossiers temporaires ;
9. recharger les bibliothèques et confirmer l'absence de toute entrée
   `[RECETTE M141]` ;
10. vérifier l’ajout, la modification et la persistance après rechargement d’un
    locuteur et d’un phénomène, ainsi que l’absence de double message de
    sauvegarde contradictoire ;
11. arrêter le serveur avec `Ctrl+C`.

Contrôle complémentaire des gardes :

```powershell
$env:PROTO05_DATA_MODE = 'mariadb-readonly'
node --env-file=../.env.local server.js
```

Vérifier qu'une consultation fonctionne et qu'une tentative de sauvegarde est
refusée. Refaire le même contrôle en mode `compare`. Revenir ensuite au mode
souhaité. La première recette humaine a déclenché ce correctif ; la validation
visuelle et fonctionnelle post-correction reste à réaliser par David.

## 10. Limites et suites

- La validation fonctionnelle et visuelle humaine post-correction reste à
  effectuer. La recette navigateur de Codex ne vaut pas validation humaine.
  Aucun FFmpeg n’a été lancé.
- Les sept anciennes indisponibilités de fichiers locaux restent hors périmètre,
  conformément à la consigne de David.
- Le registre documentaire du dry-run conserve les trois limites `videoRef`
  déjà consignées en Mission 140.
- La Mission 142 pourra retirer le scaffold JSON et établir MariaDB comme
  autorité unique lorsque David aura validé le cutover.

## 11. Git et livraison

- Aucun commit.
- Aucun push.
- Aucun changement de branche.
- Version obtenue : **`0.1.48`**.

Message de commit proposé :

```text
feat(proto05): add transactional MariaDB writes
```
