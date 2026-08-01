# Mission 179 — Navigation temporelle précise des lecteurs Proto05

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version obtenue : `0.1.61`

## Résultat

Les trois lecteurs d'édition disposent désormais, dans cet ordre, de quatre commandes compactes : `− 1 s`, `− 0,1 s`, `+ 0,1 s`, `+ 1 s`. Elles déplacent le lecteur sans appeler `play()` ou `pause()`, respectent les bornes réelles du média, sont désactivées tant que les métadonnées ne fournissent pas une durée finie et actualisent immédiatement un affichage `mm:ss,d`.

## Inventaire avant modification

| Surface | Route | Page | Lecteur et usages |
|---|---|---|---|
| Anonymisation visuelle | `/teacher/anonymization/:preparationJobId` | `teacher-anonymization.html` | `<video controls muted>` propre à l'éditeur de masques ; `currentTime` est converti en millisecondes lors de la création d'une étape temporelle/keyframe. |
| Anonymisation audio | `/teacher/audio-anonymization/:preparationJobId` | `teacher-audio-anonymization.html` | `<video controls>` propre à l'aperçu audio ; le temps courant alimente les bornes des passages et la prévisualisation locale. |
| Atelier guidé d'activité | `/teacher/guided/:activityId` | `teacher-guided.html` | `<video controls>` amélioré par `ic-video-player.js` ; le temps courant alimente segments de transcription, intervalles de langue, phénomènes IC et autres annotations temporelles. |

Les trois pages utilisaient les contrôles vidéo natifs et des helpers locaux distincts. L'atelier guidé possédait en outre des déplacements de cinq secondes. Aucun composant de transport partagé n'existait. Les algorithmes d'anonymisation, FFmpeg, masques, routes API et contrôles natifs n'ont pas été modifiés.

## Mutualisation retenue

`shared/precise-video-time.js` constitue un petit contrat indépendant du métier :

- `relativeTime` calcule en millisecondes entières ;
- `knownDuration` exige `readyState >= 1` et une durée finie strictement positive ;
- `formatTime` arrondit uniquement l'affichage au dixième ;
- `bind` synchronise boutons, affichage et callback local sans changer l'état de lecture.

`shared/precise-video-time.css` fournit la disposition commune, le focus visible et le repli responsive. Chaque page conserve son lecteur et son architecture propres, mais branche le même helper et le même balisage accessible.

## Bornage et précision

Le calcul transforme position et pas en millisecondes entières avant addition :

`targetMs = min(durationMs, max(0, round(currentTime × 1000) + round(delta × 1000)))`.

Cette règle rend dix pas de `100 ms` strictement équivalents à un pas de `1 000 ms` et évite les valeurs visibles telles que `12.299999999`. La propriété `currentTime` reçoit ensuite `targetMs / 1000`.

Le stockage actuel est compatible : segments, intervalles de langue, phénomènes et overlays portent `startMs/endMs`; MariaDB les conserve dans des colonnes `BIGINT UNSIGNED`. Aucun arrondi supplémentaire ni changement de schéma n'est introduit. L'affichage au dixième ne dégrade donc pas la valeur métier milliseconde.

## Séparation pédagogique

La séparation reste inchangée :

- les moments de transcription restent dans leur liste et leur panneau d'édition ;
- la Timeline IC partagée `shared/ic-timeline.js` ne consomme que `languageIntervals` et `phenomena` ;
- aucune piste Transcription n'a été ajoutée à cette Timeline IC ;
- le temps déplacé devient simplement le `video.currentTime` que les actions existantes lisent déjà.

## Fichiers créés ou modifiés

Créés :

- `shared/precise-video-time.js` ;
- `shared/precise-video-time.css` ;
- `server/test/precise-video-time.test.js` ;
- ce rapport.

Modifiés :

- `teacher-anonymization.html` ;
- `teacher-audio-anonymization.html` ;
- `teacher-guided.html` ;
- `server/server.js` et `server/package.json` : version `0.1.61` ;
- `server/README.md` et `ANONYMIZATION_ENGINE.md` : références canoniques de version.

## Tests exécutés

- helper temporel, présence sur les trois lecteurs et séparation pédagogique : **3/3** ;
- annotations temporelles et isolation runtime : **8/8** dans le groupe ciblé, soit **11/11** avec le helper ;
- contrats statiques audio : **3/3** ;
- routes et surfaces enseignantes statiques : **7/7** ;
- mapping relationnel et projection vidéo : **9/9** ;
- parsing de tous les scripts inline des trois pages : réussi (`4`, `1` et `12` blocs) ;
- manifestes techniques : exactement `001,002,003,004,005,006` ;
- `node --check` du helper et du serveur : réussi ;
- `git diff --check` : réussi.

Les tests démontrent les quatre pas, les deux bornes, dix incréments de 0,1 s, l'indisponibilité avant métadonnées, la conservation de l'état lecture/pause, l'actualisation immédiate, le callback utilisant la nouvelle position, les libellés accessibles et la réutilisation de `video.currentTime` par les créations existantes.

## Recette navigateur

Le serveur Proto05 déjà présent sur `8791` a été interrogé sans redémarrage : il répondait `503` et présentait le garde-fou « Le schéma MariaDB attendu ou ses migrations sont indisponibles. ». Aucune donnée métier n'a donc été chargée et aucune écriture n'a été tentée.

Pour la seule validation du rendu, un serveur HTTP statique temporaire a servi le dossier Proto05 sur `127.0.0.1:8899`, puis a été arrêté. Les trois fichiers HTML ont été ouverts dans le navigateur :

- quatre boutons présents sur chaque page, dans l'ordre attendu ;
- affichage initial `00:00,0 / --:--,-` ;
- commandes désactivées sans métadonnées, conformément au contrat ;
- position proche du lecteur, zone cliquable confortable et aucun débordement observé à la largeur disponible ;
- contrôles vidéo natifs conservés ;
- aucune erreur de mise en page visible imputable aux nouvelles commandes.

À ce premier stade, les clics début/intermédiaire/fin sur un vrai média, le passage pause/lecture et la création interactive d'une annotation n'avaient pas pu être réalisés : la base indisponible bloquait les routes applicatives et le serveur statique ne fournissait volontairement ni activité ni préparation. Cette limite initiale a ensuite été levée par la recette réelle décrite ci-dessous. David avait déjà validé les deux ateliers d'anonymisation et confirme désormais la recette finale.

## Correction de clôture après la recette de David

David a ensuite constaté que les quatre commandes fonctionnaient dans les deux ateliers d'anonymisation, mais restaient sans effet dans l'atelier guidé réel `/teacher/guided/proto05-augmented-video-01`.

### Reproduction et cause racine

Après rétablissement indépendant du contrat de migration `001`, Proto05 `0.1.61` a été démarré avec le lanceur réel et sa santé MariaDB a été confirmée. Sur le média réel de l'activité guidée, le lecteur rendu exposait initialement `939,216741 s` pendant le chargement des métadonnées et un `readyState` natif égal à `4`, mais les quatre boutons restaient désactivés et l'affichage restait `00:00,0 / --:--,-`. Après lecture et stabilisation des métadonnées HLS, le même lecteur a exposé `939,238 s` ; cette valeur finale effectivement fournie au moment du test de borne est celle retenue pour la recette de fin. L'écart de `21,259 ms` provient donc de l'actualisation de la durée par le lecteur, et non d'un calcul ou d'un arrondi introduit par les commandes.

La cause est l'ordre d'initialisation propre à l'atelier guidé :

1. `Proto05PreciseVideoTime.bind` était appelé sur `<video id="video">` avant l'upgrade ;
2. `upgradeICVideoElement` créait ensuite le véritable lecteur, retirait cet élément du conteneur et le transformait en façade ;
3. la façade redéfinissait `currentTime`, `duration`, `paused` et les événements, mais pas `readyState` ;
4. les écouteurs du helper restaient attachés à l'ancien élément avant son remplacement et ne recevaient jamais les métadonnées du lecteur réel.

Aucune exception JavaScript n'a été observée dans la console avant ou après correction : les boutons ne déclenchaient rien parce qu'ils demeuraient correctement désactivés selon l'état incomplet de la mauvaise cible.

### Correction ciblée

- `shared/ic-video-player.js` expose désormais le `readyState` de la façade et le projette sur l'élément vidéo upgradé ;
- `teacher-guided.html` ne branche les commandes précises qu'après la réussite de `upgradeICVideoElement` ;
- les deux ateliers d'anonymisation, qui utilisent directement leur élément vidéo natif, ne sont pas modifiés par cette correction.

Le nouveau test fonctionnel construit un véritable lecteur simulé derrière la même façade que l'atelier guidé, déclenche réellement le clic `+0,1 s` et vérifie simultanément le `currentTime` du lecteur sous-jacent, l'affichage immédiat et la conservation de l'état pause. Il bloque aussi un retour du binding avant l'upgrade et exige la projection de `readyState`.

### Recette navigateur réelle corrigée

Sur `http://127.0.0.1:8791/teacher/guided/proto05-augmented-video-01` avec le média réel :

- `−1 s`, `−0,1 s`, `+0,1 s` et `+1 s` déplacent le véritable `<video>` ;
- séquence observée en pause : `1,0 → 0 → 0 → 0,1 → 1,1 s` ;
- dix clics `+0,1 s` ont conduit exactement de `1,1` à `2,1 s` ;
- pendant la lecture, un clic `+1 s` a conservé `paused=false` et la lecture a continué ;
- près du début, les reculs sont restés bornés à `0` ;
- près de la fin, le lecteur et l'affichage sont restés bornés à `939,238 s` / `15:39,2` ;
- l'affichage précis s'est actualisé dès chaque clic ;
- une création locale de transcription après déplacement a lu `video.currentTime=2,3 s` ;
- une création locale de langue après déplacement a lu `video.currentTime=3,4 s` ;
- une création locale de phénomène IC après déplacement a lu `video.currentTime=4,5 s` ;
- ces trois créations sont restées non enregistrées et ont été annulées par rechargement : aucune donnée MariaDB n'a été modifiée ;
- la console navigateur est restée vide d'erreur.

La recette manuelle de David demeure la preuve réelle des deux ateliers d'anonymisation et David confirme la recette finale. Leur non-régression a été rejouée automatiquement : les quatre contrats audio/visuel sans base ont réussi, dont le test FFmpeg ciblé sur fixture temporaire. Aucune dérivation d'anonymisation réelle ou longue n'a été lancée. Le parcours HTTP audio isolé n'a pas démarré, car son helper n'a pas pu lire le secret root du conteneur (`docker exec ... MARIADB_ROOT_PASSWORD`) ; cette limite est indépendante du code modifié et aucune base n'a été touchée.

Après correction :

- navigation précise, annotations, isolation et navigation enseignante : **23/23** ;
- contrats audio/visuel ciblés, incluant le contrôle FFmpeg : **4/4** ;
- `node --check shared/ic-video-player.js` : réussi ;
- `git diff --check` : réussi.

La version reste `0.1.61`.

## Contrôles non exécutés

- une connexion MariaDB a bien été utilisée pour charger et vérifier l'application réelle ; aucune écriture MariaDB et aucune migration n'ont été effectuées ;
- aucune dérivation d'anonymisation réelle ou longue n'a été exécutée ; le test FFmpeg ciblé sur fixture temporaire a, lui, bien été exécuté et réussi ;
- le parcours HTTP audio isolé nécessitant l'accès administrateur temporaire n'a pas été exécuté jusqu'au bout ;
- aucune modification persistante d'activité, de plan audio, de masque ou d'annotation n'a été enregistrée : les créations locales de recette ont été annulées par rechargement ;
- aucune validation humaine supplémentaire n'est en attente pour cette correction : David a validé les deux ateliers d'anonymisation et confirme la recette finale.

## État Git final

Les changements fonctionnels de la Mission 179 sont limités à Proto05 et au présent rapport. La restauration locale déjà présente de `database/migrations/004_proto05_document_metadata_schema.sql`, qui rétablit le checksum historique de `001`, reste visible dans l'état Git et n'a pas été modifiée pendant cette mise à jour documentaire. Aucun commit ni push n'a été effectué. Le serveur statique temporaire sur `8899` est arrêté. Proto05 sur `8791` et les autres services lancés pour la recette réelle restent actifs.

## Message de commit proposé

`feat(proto05): add precise video time navigation controls`
