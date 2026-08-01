# Mission 158 — Disponibilité des références vidéo distantes

## Périmètre et état initial

La mission a été limitée à l’enregistrement et à la revérification manuelle de la dernière disponibilité connue des références vidéo distantes de Proto05. Le dépôt était propre au départ et la Mission 157B était commitée.

Le modèle MariaDB possédait déjà les deux informations nécessaires :

- `media_playables.availability` pour l’état canonique ;
- `media_playable_metadata.analyzed_at` pour l’horodatage complet du dernier contrôle.

Les procédures `sp_media_update_playable_availability` et `sp_media_set_playable_metadata` permettaient déjà une écriture transactionnelle conforme. Aucune migration, modification de schéma ou écriture SQL directe n’a donc été ajoutée.

## Réalisation

Lors de la confirmation d’une analyse distante réussie, le playable est désormais transmis au writer canonique avec `availability = available` et une analyse technique `complete`. La confirmation réutilise le résultat déjà obtenu et ne contacte pas une seconde fois la ressource. MariaDB produit transactionnellement l’horodatage complet `analyzed_at` pendant cet enregistrement.

Une route ciblée permet ensuite de revérifier un playable HLS ou URL directe. Elle réutilise l’analyse distante existante, sérialise les écritures par la frontière MariaDB et remplace uniquement le dernier état connu :

- ressource accessible : `available` ;
- réponse établissant l’indisponibilité : `unreachable-remote` ;
- contrôle techniquement non concluant : `unknown`.

Deux demandes concurrentes portant sur le même playable partagent le même contrôle en cours. L’adaptateur vérifie l’identité asset/source/playable, appelle les procédures existantes dans une transaction, relit le résultat et refuse toute divergence.

La projection applicative conserve maintenant les métadonnées techniques nécessaires à l’affichage de la date. Dans la vidéothèque :

- les états contrôlés affichent une date française `jj/mm/aaaa` ;
- les références distantes disposent d’un bouton discret **Revérifier** ;
- le bouton est désactivé avec le libellé **Vérification…** pendant la requête ;
- la carte est remplacée immédiatement par la réponse canonique, sans rechargement complet ;
- aucune ressource locale ne reçoit ce bouton ;
- les états `unknown` restent « Disponibilité non vérifiée » et ne sont plus comptés ni filtrés comme indisponibles.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-write-boundary.js`
- `prototypes/05-augmented-ic-video-01/server/media-library-runtime.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- marqueurs de version : `server/package.json`, `server/README.md`, `teacher-video-detail.html`, `ANONYMIZATION_ENGINE.md`

## Contrôles réalisés

- Test MariaDB réel ciblé : 1/1 réussi. Il couvre l’analyse et la confirmation sans second appel réseau, l’état initial et son horodatage SQL/API, la revérification accessible, l’indisponibilité démontrée, le contrôle non concluant, le partage d’une vérification concurrente et le nettoyage.
- Tests de projection et d’interface ciblés : 11/11 réussis (`video-workspaces.test.js` et `media-library-install.test.js`).
- Syntaxe Node des fichiers concernés : réussie.
- Compilation des scripts embarqués de `teacher-videos.html` : réussie.
- `git diff --check` : réussi.

Recette visuelle sur un serveur isolé :

- ordinateur, 1280 × 720 : date et bouton alignés, état de vérification visible, aucun débordement horizontal ;
- mobile, 390 × 844 : ligne repliée lisiblement, bouton accessible, aucun débordement horizontal ;
- transition observée : « Disponible — vérifiée le 01/08/2026 » → « Vérification… » avec bouton désactivé → état daté restauré ;
- compteur observé : 4 indisponibles pour 4 cartes réellement indisponibles, tandis que 9 cartes non vérifiées restaient distinctes ;
- aucune erreur console.

La référence jetable `media-proto05-remote-ref-5acf99906c18143814e1c0df` a été supprimée. Son API répondait ensuite 404 et les comptages SQL ciblés donnaient zéro asset, source, playable et métadonnée. Les serveurs temporaires sur les ports 8793 et 8794 ont été arrêtés. Aucune donnée réelle de David n’a été modifiée.

## Limites et validation humaine

La recette de Codex ne remplace pas la validation humaine. David peut vérifier sur une référence distante de son choix que la date est lisible, que **Revérifier** passe brièvement à **Vérification…**, puis que le dernier résultat est conservé après rechargement.

La suite Proto05 complète et les suites FFmpeg/anonymisation n’ont pas été lancées, conformément au périmètre proportionné demandé.

## Version et commit proposé

Version obtenue : **0.1.52** (baby step depuis 0.1.51).

Message proposé :

`feat(proto05): enregistrer et revérifier la disponibilité distante`

Aucun commit ni push n’a été effectué.
