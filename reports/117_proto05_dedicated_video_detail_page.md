# Mission 117 — Page détaillée pleine largeur d’une vidéo

## Résultat

La vidéothèque Proto05 dispose désormais d’une fiche dédiée à l’adresse
`/teacher/videos/:videoId`. Chaque carte propose un lien « Voir la fiche » et le
résumé de lignée conduit au même écran. Le détail transitoire auparavant injecté
dans les cartes n’est plus rendu.

La version obtenue est **0.1.40**.

## Diagnostic préalable

La mission 115 affichait la lignée complète avec `versionsMarkup()` dans une
section `.versions-access` ajoutée à chaque carte puis révélée par
`toggleVersionDetails()`. Ce mécanisme alourdissait la grille et liait la
consultation détaillée au cycle de rendu des cartes.

Une projection détaillée existait déjà sous
`GET /api/proto05/library/assets/:id`, mais la route de suppression générique
`/api/proto05/library/assets/:id[/physical]`, déclarée avant elle, interceptait
aussi les requêtes GET et répondait 405. Le correctif permet à cette route
existante de servir la projection canonique en GET, avec son résumé d’usage.
Il ne crée aucun nouveau modèle et ne recalcule aucune lignée dans le navigateur.

## Réalisation

- ajout de `teacher-video-detail.html`, page autonome, pleine largeur et
  responsive ;
- ajout de la route HTML `/teacher/videos/:videoId` ;
- accès explicite depuis chaque carte en grille et en liste ;
- retour simple vers la vidéothèque, avec prise en charge d’un paramètre
  `return` local lorsqu’il est fourni ;
- en-tête avec titre, provenance, durée, disponibilité, classement et résumé de
  lignée ;
- sections distinctes pour l’originale distante, la copie de travail, les
  dérivations locales, les versions publiées, les usages et le classement ;
- une carte indépendante par dérivation, avec résumé humain de sa recette ;
- aperçu à la demande avec le lecteur partagé `ic-video-player.js`, sans
  lecteur principal démarré au chargement ;
- destruction explicite de chaque instance de lecteur à la fermeture de son
  aperçu et au départ de la page ;
- conservation des actions existantes par rôle : copie locale, atelier
  d’anonymisation, téléchargement, suppression protégée, ajout de version
  publiée, association à une activité et classement ;
- état propre « Vidéo introuvable » pour un identifiant inconnu ;
- retrait du rendu de détail transitoire dans les cartes.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html` ;
- `prototypes/05-augmented-ic-video-01/teacher-videos.html` ;
- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/package.json` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/library-ffmpeg-download.test.js` ;
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`.

## Vérifications automatisées

- `node --test --test-concurrency=1 test/video-workspaces.test.js` :
  **7/7 réussis** ;
- `node --test --test-concurrency=1 test/library-ffmpeg-download.test.js` :
  **8/8 réussis**, dont le scénario Chromium contrôlé traversant la création
  d’une copie, l’ouverture de la fiche dédiée et son aperçu local ;
- `npm run check` : réussi ;
- contrôle syntaxique du JavaScript embarqué dans
  `teacher-video-detail.html` : réussi ;
- `git diff --check` : réussi.

La suite complète n’a pas été lancée, conformément au périmètre de la mission.

## Recette Chromium réelle

Recette effectuée sur `http://127.0.0.1:8891` avec les données existantes, sans
écriture canonique :

- lien « Voir la fiche » présent en grille et en liste ;
- ouverture de la fiche réelle **yop** ;
- projection observée : 1 originale distante, 1 copie locale de travail,
  2 dérivations locales et aucune version publiée ;
- aperçu simultané de la copie et des deux dérivations ;
- trois fichiers locaux chargés avec `readyState = 4`, sans erreur média, et une
  durée cohérente d’environ 391,8 secondes ;
- fermeture puis réouverture d’une dérivation : le nombre d’éléments vidéo passe
  de 3 à 2 puis revient à 3 ;
- initialisation de l’aperçu HLS distant 36971 ;
- état inconnu vérifié avec
  `/teacher/videos/asset-inconnu-mission-117` ;
- largeur étroite vérifiée à 390 × 844 : cinq sections empilées, aucune largeur
  de document supérieure à la fenêtre ;
- aucune erreur ni alerte console ;
- menus Actions de la vidéothèque toujours fermés par défaut pendant le test
  d’intégration Chromium.

La validation ci-dessus est une recette Codex. La validation humaine de David
reste à effectuer.

## Préservation et limites

- aucune donnée canonique ni aucun média réel n’a été modifié ;
- aucune création de copie, anonymisation, association, suppression ou
  reclassification n’a été lancée pendant la recette réelle ;
- le retour conserve un chemin local fourni naturellement, sans ajouter de
  cache complexe de l’état de grille ;
- une seule instance 0.1.40 reste ouverte sur le port 8891 ; le port 8791 est
  libre ;
- aucun commit ni push n’a été effectué.

## Correctif d’intégration graphique

À la demande de David, la première proposition visuelle autonome a été retirée.
La fiche reprend désormais strictement la charte de la vidéothèque et des pages
enseignant :

- `system-ui`, texte `#172033` et fond `#f6f7fb` ;
- largeur de contenu de 1280 px et marges de page identiques ;
- panneaux blancs, bordure `#dbe1ea`, rayon de 14 px et ombre légère existante ;
- boutons bleu pétrole `#164e63`, boutons secondaires blancs et actions
  destructives rouges sur fond blanc ;
- badges bleu clair, métadonnées gris ardoise et vignettes vidéo avec le dégradé
  déjà utilisé dans les cartes ;
- cartes internes, aperçus, formulaires, boîte de dialogue et points de rupture
  alignés sur les composants existants ;
- suppression de la palette sombre, des grands rayons, de la navigation fixe et
  des espacements spécifiques inventés pour la première version.

Ce correctif ne modifie ni le routage, ni les données, ni les actions, ni les
lecteurs, ni les tests fonctionnels. La version reste **0.1.40**.

Comparaison Chromium réelle effectuée entre la vidéothèque et la fiche **yop** :

- en bureau, mêmes valeurs calculées pour la typographie, le fond, le texte, la
  largeur maximale, les panneaux, bordures et rayons ;
- à 390 × 844, mêmes marges mobiles de 12,8 px ;
- fiche empilée sur une seule colonne, largeur de document de 375 px pour une
  fenêtre de 390 px, sans débordement horizontal ;
- navigation, en-tête, badges, cartes et boutons visuellement cohérents avec la
  vidéothèque ;
- aucune erreur console observée.

## Message de commit proposé

`feat(proto05): add dedicated full-width video detail page`
