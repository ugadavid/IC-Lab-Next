# Missions 159 et 159B — Disponibilité locale/YouTube et accès à la source

## Périmètre

Le contrôle unitaire de disponibilité introduit en Mission 158 a été étendu aux playables `local-file` et `youtube-embed`. Aucun contrôle automatique, historique, schéma SQL, migration ou dépendance n’a été ajouté. MariaDB reste l’unique autorité et les procédures existantes restent la seule frontière d’écriture métier.

Version obtenue : **Proto05 0.1.53** (baby step depuis 0.1.52).

## Réalisation

- La route existante `POST /api/proto05/library/assets/:assetId/playables/:playableId/availability-check` sélectionne désormais le contrôleur selon le playable : HLS/URL directe, fichier local ou YouTube.
- La file mono-vol et la protection contre les doubles contrôles simultanés sont partagées par les trois familles.
- La frontière MariaDB ciblée accepte les états cohérents avec chaque type, appelle `sp_media_update_playable_availability` puis `sp_media_set_playable_metadata`, et relit le snapshot canonique avant commit.
- Un fichier local est `available` lorsque le chemin géré désigne un fichier ouvrable en lecture, `missing-local` avec `missing-file` pour `ENOENT`/`ENOTDIR`, et `unknown` lorsque la vérification ne permet pas de conclure.
- L’import local produit directement une entrée canonique `asset/source/playable`, après contrôle du fichier déplacé. Il enregistre immédiatement `available`, `analyzedAt` et l’analyseur `local-file-import`.
- YouTube est contrôlé sans clé ni dépendance par l’endpoint oEmbed officiel : une réponse 200 décrivant une vidéo YouTube et fournissant un iframe vaut `available`; les réponses 400/401/403/404/410 valent `unreachable-remote`; limitation, panne, délai, réponse invalide ou ambiguë valent `unknown`.
- Limite : oEmbed prouve qu’une vidéo publique est reconnue et fournit un embed, mais ne garantit pas toutes les restrictions contextuelles ultérieures du lecteur (géoblocage, politique dépendant du navigateur). Ces cas restent honnêtement `unknown` lorsqu’ils ne peuvent pas être établis.
- Les cartes affichent le même bouton et les mêmes libellés pour les trois familles. Un état `unknown` reste exclu du filtre et du compteur « Indisponibles ».

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-write-boundary.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- marqueurs de version : `server/package.json`, `server/README.md`, `teacher-video-detail.html`, `ANONYMIZATION_ENGINE.md`.

## Contrôles réalisés

- Syntaxe Node des trois fichiers serveur et des deux fichiers de tests concernés : succès.
- Test MariaDB ciblé local + YouTube : 1/1, puis exécution cumulative HLS/local/YouTube : 2/2.
  - import local immédiatement disponible et daté ;
  - présent → absent → restauré ;
  - YouTube disponible → explicitement indisponible → non concluant → disponible ;
  - deux requêtes concurrentes pour un seul contrôle réseau ;
  - relecture SQL/API et persistance après redémarrage ;
  - suppression et retour exact aux cardinalités initiales.
- Tests des vues/cartes : 9/9.
- Tests de disponibilité locale préexistants : 7/7.
- Régression HLS de la Mission 158 : verte.
- Recette visuelle dans le navigateur intégré :
  - 1280 × 900 : cartes locale et YouTube alignées, libellé daté et bouton lisibles ;
  - 390 × 844 : mise en page mobile lisible ;
  - état intermédiaire « Vérification… » visible et bouton désactivé ;
  - aucune erreur console ;
  - le compteur « Indisponibles » est resté à 4 avec une YouTube `unknown` ajoutée temporairement.
- La première commande réseau lancée dans le bac à sable a été refusée avant HTTP (`TypeError: fetch failed`, cause `EACCES`). Ce résultat ne décrivait pas le processus applicatif réel. Une sonde lancée dans les mêmes conditions que le serveur a ensuite obtenu `HTTP 200`, `application/json`, `provider_name: YouTube` et `type: video` pour `FG4h0_v3oTk`.
- `git diff --check` : succès avant création du présent rapport ; à rejouer dans le contrôle final.

## Nettoyage et non-altération

Deux assets jetables, un fichier local et une référence YouTube, ont été utilisés pour la recette visuelle. Les deux API répondent ensuite 404, aucune ligne `[TEST M159]` ni aucun fichier `M159-VISUAL` ne subsiste, et les deux processus de recette ont été arrêtés. Aucun média ou contenu canonique de David n’a été modifié.

## Validation humaine

Les contrôles ci-dessus sont ceux de Codex et ne valent pas validation humaine. Recette minimale proposée à David : revérifier une vidéo locale présente, déplacer temporairement sa copie puis la restaurer, et revérifier une vidéo YouTube publique connue ainsi qu’une URL supprimée/privée.

## Correctif 159B

La recette défaillante utilisait encore un processus Proto05 **0.1.52**, démarré avant les changements de la Mission 159, alors que le worktree et les pages servies avaient déjà atteint **0.1.53**. Le HTML mis à jour appelait donc une route dont le processus en mémoire ne reconnaissait encore que les références HLS/directes : la cible YouTube était refusée, puis la carte était simplement rerendue avec son état persistant `unknown`. Après redémarrage du serveur 0.1.53, l’endpoint oEmbed officiel répond `HTTP 200` pour la vidéo fournie et la route enregistre `available` avec son horodatage.

Le contrôleur conserve oEmbed comme mécanisme unique, léger et sans clé. Les cas non concluants exposent désormais un `diagnosticReason` non sensible dans la réponse et une ligne serveur explicite (`rate-limited`, service indisponible, délai, réseau refusé/indisponible ou réponse invalide). Les réponses 400/401/403/404/410 restent explicitement indisponibles et les autres ambiguïtés restent `unknown`.

Chaque carte YouTube reçoit aussi un lien compact `YT`, construit depuis son propre `videoId`, avec `target="_blank"` et `rel="noopener noreferrer"`. Le lien arrête la propagation du clic et n’est pas rendu pour les autres familles de médias.

Contrôles complémentaires :

- vidéo réelle `FG4h0_v3oTk` : `available`, horodatage persisté et libellé « Disponible — vérifiée le 01/08/2026 » après rechargement ;
- scénario oEmbed déterministe : disponible, 404 explicitement indisponible, 429 non concluant avec `youtube-rate-limited`, puis retour disponible ;
- lien réel : `https://www.youtube.com/watch?v=FG4h0_v3oTk`, nouvel onglet déclaré, protections présentes et page de vidéothèque non naviguée ;
- vérification visuelle 1280 × 900 : bouton compact aligné, carte et état lisibles, aucune refonte ;
- tests ciblés MariaDB : local/YouTube 1/1 et HLS 1/1 ; tests cartes et vues : 9/9 ; contrôles historiques de disponibilité locale : 7/7 ; syntaxes Node : succès.

## Proposition de commit

`feat(proto05): fiabiliser la revérification locale et YouTube`
