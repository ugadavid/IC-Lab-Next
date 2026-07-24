# Rapport 109 — Indicateurs d’utilisation des vidéos de la Library

## Périmètre

Mission limitée à Proto05 et à la Library moderne de
`teacher-videos.html`. Les activités et le catalogue canoniques ont été lus
uniquement pendant la recette. Aucun asset, média, dossier, tag ou rattachement
d’activité réel n’a été modifié.

Le numéro 109 suit la mission explicitement confiée. La mission 108 avait été
consignée comme correctif final dans le rapport 107 et ne possède pas de fichier
de rapport séparé.

## Diagnostic observé

La protection de suppression de la mission 107 reposait déjà sur
`libraryAssetDeletionPlan()`, puis sur `deletionConflict()`. La route GET de la
Library construisait cependant ses assets sans projeter ce plan.

Deux définitions de `enhanceCards()` coexistaient dans la page. La seconde,
obsolète, écrasait la version qui synchronisait l’état ARIA et garantissait
l’exclusivité des menus Actions. Ce doublon a été retiré dans le périmètre de la
préservation fonctionnelle demandée.

## Réalisation

- enrichissement de `GET /api/proto05/library/assets` après une seule lecture du
  fichier d’activités ;
- réutilisation de `libraryAssetDeletionPlan()` et de `deletionConflict()` pour
  produire le résumé d’usage et conserver une source de vérité commune avec
  DELETE ;
- prise en compte des relations par asset, playable, source et clé de stockage ;
- déduplication des activités par identifiant et fusion de leurs types de
  relation ;
- libellé `Activité sans titre` lorsque le titre utilisateur est absent ;
- projection de `whetherUsed`, du nombre et de la liste structurée des
  activités, des dérivations, traitements, références partagées et des deux
  décisions de blocage ;
- indicateurs compacts `Non utilisée`, `Utilisée · N` ou `Utilisée` lorsqu’une
  dépendance non liée à une activité existe ;
- panneau flottant global ancré au badge actif, défilable, ouvrable au survol,
  au focus ou au clic, refermable par sortie, clic extérieur, bouton ou Échap ;
- affichage des titres d’activités et des autres dépendances sans ajouter
  d’identifiants techniques permanents sur les cartes ;
- conservation des vues grille/liste, des tags, du classement, de l’aperçu, de
  l’association et des menus Actions.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/library-usage.test.js`
- `reports/109_proto05_library_video_usage_indicators.md`

## Vérifications automatisées

Tests ciblés exécutés avec succès : **14/14**.

- asset sans usage ;
- asset utilisé par une activité avec son titre ;
- relations multiples vers la même activité dédupliquées ;
- plusieurs activités et compteur correct ;
- relations indirectes par source et playable ;
- activité sans titre ;
- référence de fichier partagée distinguée ;
- cohérence exacte entre le résumé GET et les conflits DELETE ;
- ouverture au survol, au focus et au clic dans Chrome ;
- fermeture par Échap et clic extérieur ;
- menus Actions fermés au départ, exclusifs et refermables ;
- non-régression des dossiers, tags, recherche et renderer moderne ;
- non-régression des suppressions sûres.

Commandes réussies :

- `node --test --test-concurrency=1 test/library-usage.test.js test/library-deletion.test.js test/library-classification.test.js`
- `npm run check`
- `git diff --check`

Les tests serveur et navigateur utilisent des copies temporaires des données et
des médias.

## Recette Chromium et validation visuelle

Une seule instance Proto05 **0.1.33** a été lancée sur le port 8891, PID 33144 ;
le port 8791 est resté libre.

Sur la Library réelle :

- 15 cartes et 15 indicateurs sont présents ;
- les états disponibles, indisponibles et d’usage coexistent correctement ;
- `Vidéo augmentée IC — source UGA` affiche `Utilisée · 3` ;
- son panneau affiche les trois titres attendus :
  `Vidéo augmentée d’intercompréhension`, `MboloTest` et `LAutreMeSoul` ;
- le même panneau distingue aussi `10 dérivations` ;
- le focus clavier ouvre le panneau et Échap le ferme ;
- le panneau global utilise `position: fixed`, mais ses coordonnées sont
  calculées depuis le badge actif afin de rester contextuellement rattaché ;
- le scénario Chrome ciblé valide aussi le survol, le clic persistant et les
  fermetures ;
- les menus Actions sont fermés au chargement, exclusifs puis refermés par
  Échap ;
- les vues liste et grille fonctionnent ;
- aucune erreur console n’a été relevée.

La page est laissée ouverte sur `http://127.0.0.1:8891/teacher-videos.html` pour
la recette de David. La recette Codex ne constitue pas une validation humaine.

## Mission 110 — Correctif d’ancrage du panneau

### Diagnostic

Le panneau de la mission 109 utilisait la règle fixe `top: 1rem; left: 50%`
avec une translation horizontale. Son positionnement ne consultait jamais le
rectangle du badge actif : le contenu restait visible, mais apparaissait en haut
de la fenêtre, loin de son déclencheur.

### Correctif local

Seuls `teacher-videos.html`, le test Chromium ciblé et ce rapport ont été
adaptés pour la mission 110.

- calcul de la position depuis `getBoundingClientRect()` du badge actif ;
- espacement constant de 8 px ;
- placement prioritaire au-dessus, puis en dessous si l’espace supérieur est
  insuffisant ;
- choix du côté offrant le plus d’espace lorsqu’aucun côté ne peut accueillir
  toute la hauteur ;
- marge de sécurité de 12 px et ajustement horizontal aux bords de la fenêtre ;
- conservation du panneau global en `position: fixed` pour éviter le clipping
  par la grille ;
- hauteur maximale et défilement interne conservés ;
- recalcul à l’ouverture, au défilement et au redimensionnement ;
- restauration et nouveau calcul après un rendu lorsque le badge reste présent ;
- fermeture lorsque le badge ancré sort entièrement de la fenêtre ;
- maintien du délai permettant de déplacer le pointeur du badge vers le panneau.

Aucune logique serveur, route, donnée, analyse de dépendances, mutation,
writer, menu Actions ou autre rendu de carte n’a été modifié par ce correctif.

### Test ciblé

Le test Chromium existant vérifie désormais aussi :

- ancrage au milieu de la grille ;
- bascule sous un badge placé en haut de la fenêtre ;
- placement au-dessus d’un badge placé en bas ;
- maintien de l’écart après défilement ;
- recalcul après redimensionnement ;
- panneau entièrement visible dans une fenêtre étroite ;
- ancrage en vue liste ;
- passage du pointeur du badge au panneau sans fermeture intempestive.

Résultat : **2/2 tests de `library-usage.test.js` réussis**.

### Recette Chromium réelle du correctif

Recette effectuée sur l’instance unique `0.1.33` du port 8891 :

- badge UGA au milieu : panneau au-dessus avec un écart mesuré de 8,05 px ;
- badge au bord supérieur : panneau basculé en dessous, écart 7,63 px ;
- badge au bord inférieur : panneau au-dessus, écart 8,05 px ;
- bord gauche : panneau entièrement contenu, de 331 px à 811 px dans une
  fenêtre de 1440 px ;
- bord droit : panneau ajusté de 948 px à 1428 px, avec la marge de 12 px
  conservée ;
- après défilement : position recalculée depuis le même badge ;
- vues grille et liste : ancrage correct, écart mesuré proche de 8 px ;
- focus, clic persistant et Échap : fonctionnels ;
- survol et transfert badge–panneau : validés par le scénario Chrome ciblé ;
- menus Actions fermés par défaut, exclusifs et refermables ;
- aucune erreur console.

La version reste **0.1.33** : il s’agit d’un correctif local de positionnement
dans le même baby step. Aucune donnée canonique ni aucun média réel n’a été
modifié.

## Éléments non vérifiés et limites

- aucune suppression ou mutation réelle n’a été déclenchée, conformément à la
  contrainte de préservation des données ;
- validation fonctionnelle humaine de David : **validée** ;
- aucun changement d’architecture, de contrat canonique ou de launcher n’a été
  introduit.

## Version et suite

Version Proto05 obtenue : **0.1.33**.

Le baby step est justifié par l’ajout fonctionnel visible dans la Library et la
projection serveur associée. Aucun commit ni push n’a été effectué.

Message de commit proposé :

`feat(proto05): afficher les usages vidéo dans la Library`
