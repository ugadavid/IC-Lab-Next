# Mission 073 — Requêtes média interrompues

## Réalisation

La route `/api/proto05/library/media/:filename` traite désormais l’annulation d’une lecture comme une situation attendue :

- vérification de `req.aborted`, `res.headersSent` et `res.destroyed` avant les réponses d’erreur ;
- aucune tentative de JSON après le début ou la fermeture de la réponse ;
- prise en charge silencieuse de `ERR_STREAM_PREMATURE_CLOSE`, `ECONNRESET`, `EPIPE` et des réponses détruites ;
- destruction du `ReadStream` et retrait des listeners `aborted`/`close` dans tous les chemins ;
- conservation du comportement Range `206`, HEAD et lecture normale.

## Fichiers modifiés

- `server/server.js`
- `server/test/helpers/temporary-proto05-server.js`
- `server/test/media-abort.test.js`
- `reports/073_proto05_library_media_aborted_ranges.md`

## Vérifications

- `npm run check` : réussi.
- Test multi-Range interrompu : 6 requêtes annulées simultanément, serveur encore disponible, aucune réponse JSON tardive et aucun log serveur d’interruption.
- Régression Library média : les tests de persistance, Range, résolution et association passent.
- Chromium sur l’activité UGA historique : lecture prête, seek depuis la timeline vers 2 secondes, préchargement actif, `readyState=4`, aucune erreur console applicative.

## Version et limites

Version Proto05 inchangée : serveur `0.1.27`, moteur étudiant `index-0.0.9.html`. Aucun modèle, catalogue, activité canonique, lecteur fonctionnel ou proxy HLS n’a été modifié. Les messages éventuels provenant d’extensions navigateur sont hors console applicative Proto05.

Aucun commit ni push.

Message de commit proposé : `fix(proto05): gérer silencieusement les requêtes média interrompues`
