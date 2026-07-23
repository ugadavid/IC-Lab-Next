# Mission 072 — Import local et création d’activité depuis la Library vidéo

## Périmètre

Mission limitée au Prototype 05. Aucun autre prototype, IC-Hub ou service général n’a été modifié. Les cinq activités canoniques et `data/activities.json` sont restés inchangés. Une sauvegarde de `data/video-library.json` a été conservée dans `data/video-library.json.bak` avant la validation finale.

## Réalisation

- Ajout de l’import `POST /api/proto05/library/import-local`.
- Le navigateur envoie le fichier choisi au serveur Proto05 ; le serveur écrit un fichier temporaire, calcule SHA-256 et taille, refuse les extensions non vidéo, détecte les doublons, puis déplace la copie validée dans `data/video-library-media/`.
- Le nom original, l’empreinte, la taille, le type MIME et la date d’import sont conservés dans la provenance et les métadonnées. Le chemin local réel de l’original n’est pas prétendu accessible par le navigateur.
- Un doublon répond `409` sans nouvelle écriture et retourne l’asset/playable existant.
- `POST /api/proto05/activities` accepte désormais `videoRef` (`schemaVersion`, `assetId`, `playableId`), résout le playable Library, crée `activity.video` comme projection de compatibilité et conserve les routes historiques `videoId`.
- `teacher-videos.html` propose l’action et le formulaire de sélection locale, la copie gérée, le retour de doublon et l’aperçu local.
- `teacher-create.html` charge la Library, recherche/filtre les assets, affiche les sources et playableIds, prévisualise les sources lisibles, permet une sélection explicite asset/playable et ouvre directement l’atelier guidé après création.
- `index-0.0.9.html` accepte les sources locales résolues par la Library dans le parcours étudiant ; UGA/HLS et YouTube restent inchangés.
- Le helper de serveur temporaire couvre désormais les pages Library et n’interprète pas une activité locale comme une source UGA de compatibilité.

## Fichiers concernés

- `server/server.js`
- `server/package.json`
- `server/test/helpers/temporary-proto05-server.js`
- `server/test/local-library-import.test.js`
- `teacher-videos.html`
- `teacher-create.html`
- `index-0.0.9.html`
- `data/video-library.json` (empreinte, taille, nom et métadonnées de la copie locale déjà présente)
- `data/video-library.json.bak` (sauvegarde)
- `reports/072_proto05_local_import_and_library_activity_creation.md`

## Vérifications

- `npm run check` : réussi, serveur Proto05 `0.1.27`.
- Tests ciblés d’import et création : 2 tests réussis.
- Tests de non-régression Library, contrat média et données : 23 assertions réussies.
- Import temporaire : copie gérée, hash, déduplication `409`, persistance après redémarrage.
- Création temporaire : `videoRef`, projection `activity.video`, routes guidée et étudiant.
- Chromium sur serveur temporaire : Library affichée, aperçu local lisible, recherche et filtre local vérifiés sans débordement ; création avec asset/playable local, atelier guidé chargé avec durée `15:39`, parcours étudiant en état « Prêt » avec la copie locale.
- Les erreurs de console observées provenaient du canal d’extension navigateur, pas de Proto05 ; aucune erreur applicative Proto05 n’a été relevée.
- La sélection d’un fichier réel via le sélecteur natif n’a pas pu être automatisée par le contrôle Chromium disponible ; le chemin serveur d’import a été exercé par test HTTP isolé et le parcours visuel a été vérifié avec la copie locale existante.

## Contrat final et limites

Le contrat reste `videoRef = { schemaVersion: "0.1", assetId, playableId }`. La source locale utilise `kind: "local-file"`, `provider: "local"`, `storageKey`, une URL interne de lecture, et des métadonnées de provenance. Aucun téléchargement distant, import physique distant, dérivé, anonymisation ou gestion complète de Library n’a été ajouté.

Version réellement modifiée : serveur/package `0.1.26 → 0.1.27`. Le moteur étudiant reste `index-0.0.9.html`. Aucun commit ni push.

Suite proposée : traiter séparément les copies distantes, les métadonnées média enrichies et les droits/disponibilités de Library.

Message de commit proposé : `feat(proto05): import local et création d’activité depuis la Library vidéo`
