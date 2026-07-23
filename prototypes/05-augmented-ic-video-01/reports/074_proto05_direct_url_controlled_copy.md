# Mission 074 — Copie locale contrôlée d’une URL vidéo directe

## Réalisation

- Ajout de `POST /api/proto05/library/copy-direct`.
- La route accepte uniquement HTTP(S), refuse les manifestes `.m3u8`, les identifiants URL, les protocoles non média et les réponses non `video/*`.
- Les redirections sont suivies manuellement, limitées à cinq étapes et chaque destination est revalidée. Les adresses privées, locales, link-local et internes sont refusées en production.
- Le téléchargement utilise un fichier temporaire non fourni par l’utilisateur, un timeout configurable (`PROTO05_REMOTE_COPY_TIMEOUT_MS`), une limite configurable (`PROTO05_REMOTE_COPY_MAX_BYTES`) et l’annulation via `req.aborted`.
- Le fichier n’est déplacé dans `data/video-library-media/` qu’après réception complète, hash SHA-256 et validation du type/taille.
- La persistance Library est atomique et sauvegardée par `persistVideoLibrary`. Les échecs et annulations suppriment les fichiers temporaires.
- L’URL originale, l’URL finale, les redirections, le type MIME, la taille, le hash et la provenance sont conservés. Le `source` reste `direct-url`; le playable de lecture pointe vers la copie locale contrôlée.
- Déduplication par URL originale puis par hash d’une copie locale existante.
- `teacher-videos.html` propose « Copier une vidéo depuis une URL directe », l’annulation, l’aperçu local et l’affichage des métadonnées/provenance.

## Fichiers modifiés

- `server/server.js`
- `server/package.json`
- `server/test/remote-library-copy.test.js`
- `teacher-videos.html`
- `reports/074_proto05_direct_url_controlled_copy.md`

## Vérifications

- `npm run check` : réussi.
- 21 tests ciblés réussis, couvrant téléchargement, MIME, HTTP, HLS refusé, redirection invalide, limite, timeout, annulation, hash, taille, déduplication, nettoyage, persistance et régressions Library/activités.
- Les tests utilisent un serveur HTTP local temporaire et une copie temporaire de Proto05 ; aucune activité canonique n’a été créée ou modifiée.
- Chromium : Library → copie depuis URL directe → téléchargement d’une vraie vidéo MP4 → hash/taille/provenance visibles → aperçu `readyState=4`, durée `939,237 s` → création temporaire → atelier guidé `readyState=4` → parcours étudiant `readyState=4`, état `ready`.
- Chromium n’a remonté aucune erreur applicative et aucun débordement horizontal (`scrollWidth < innerWidth`).
- Le serveur relancé sert `0.1.28` sur le port Proto05.

## Limites

Les copies de manifestes HLS, téléchargements distants avancés, FFmpeg, anonymisation, versions dérivées et gestion des droits restent hors périmètre. La protection contre les adresses privées est appliquée à la résolution DNS de chaque URL et redirection ; le mode d’autorisation d’adresses privées n’existe que dans les tests temporaires.

Le moteur étudiant reste `index-0.0.9.html`. Aucun autre prototype, IC-Hub, proxy HLS, activité canonique ou modèle général n’a été modifié. Aucun commit ni push.

Message de commit proposé : `feat(proto05): copier une vidéo directe dans la Library`
