# Mission 107 — Suppression sûre des vidéos et références de la Library

## Périmètre

Mission limitée à Proto05. Aucun catalogue canonique, média réel, activité,
route générale ou modèle n’a été modifié pendant les tests.

## Réalisation

- Ajout de `DELETE /api/proto05/library/assets/:assetId` pour retirer un asset
  du catalogue sans toucher au fichier physique.
- Ajout de `DELETE /api/proto05/library/assets/:assetId/physical` pour la
  suppression physique contrôlée suivie du retrait catalogue.
- Résolution serveur du fichier depuis les `playables`/`sources` canoniques et
  leur `storageKey`, avec vérification du chemin dans
  `data/video-library-media/` et contrôle `isFile()`.
- Blocage explicite pour les activités, dérivations, traitements et références
  d’objets partagés. Les dossiers et tags ne sont jamais supprimés.
- En cas de suppression physique, une sauvegarde temporaire transactionnelle
  permet de restaurer le fichier si l’écriture canonique échoue ; le catalogue
  reste alors intact.
- Ajout du menu secondaire aux cartes modernes. Le retrait affiche la
  confirmation de conservation du fichier ; la suppression physique affiche le
  chemin logique, la taille et l’avertissement renforcé.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/library-deletion.test.js`

## Vérifications

Le test ciblé passe **7/7** :

- retrait catalogue sans suppression du fichier ;
- retrait d’une référence `missing-local` ;
- suppression physique temporaire réussie ;
- échec physique avec catalogue conservé ;
- blocage par activité dépendante ;
- blocage d’un fichier partagé ;
- présence des actions et confirmations dans l’interface.

Contrôles complémentaires :

- `npm run check` : réussi ;
- `git diff --check` : réussi ;
- aucune suppression de média réel ; tests isolés dans des répertoires
  temporaires.

Version Proto05 inchangée : **0.1.32**.

La recette Chromium n’est pas incluse dans cette passe automatisée. Une seule
instance du serveur Proto05 est relancée séparément sur le port 8891, sans
ouvrir Chromium, pour validation visuelle humaine.

Limites restantes : aucune corbeille ou récupération utilisateur n’est
introduite ; les dépendances sont bloquantes et doivent être détachées ou
remplacées explicitement dans une mission ultérieure.

## Mission 108 — statut final

Le diagnostic Chromium a confirmé que `hidden=true` était bien posé, mais que
la règle CSS `.asset-delete-menu{display:grid}` le surchargeait ; chaque menu
restait donc visible au chargement. Le correctif conserve l’attribut `hidden`,
utilise `display:none` par défaut et `display:grid` uniquement avec
`:not([hidden])`. Le comportement d’ouverture est désormais exclusif : un seul
menu à la fois, fermeture par second clic, clic extérieur, Échap, nouvelle
vue/rendu ou action. `aria-expanded` et `aria-controls` sont synchronisés.

Recette Chromium réalisée sur `http://127.0.0.1:8891/teacher-videos.html` :
zéro menu visible au chargement, ouverture puis fermeture du même menu,
fermeture du précédent lors de l’ouverture d’un autre, fermeture extérieure et
par Échap, sans erreur console. Les cartes modernes et leurs actions sont
restées intactes ; aucune action destructive n’a été confirmée et aucune donnée
canonique n’a été modifiée.

Test ciblé ajouté : cycle fermé → ouvert → fermé et règles de fermeture/ARIA.
