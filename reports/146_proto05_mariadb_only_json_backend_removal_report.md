# Mission 146 — Proto05 MariaDB exclusive

Date : 30 juillet 2026  
Version applicative : `0.1.48` (inchangée)  
Commit/push : aucun

## Résultat

MariaDB `ic_augmented_video` est désormais l’unique autorité métier du runtime
Proto05. Le serveur ne propose plus de sélection de stockage, de comparaison,
de mode readonly applicatif ni de repli JSON. Sa configuration MariaDB est
obligatoire et contrôlée avant l’ouverture du port HTTP.

Les quatre documents métier JSON (`activities`, classement d’activités,
catalogue vidéo et vidéothèque), leurs sauvegardes runtime et l’ancien script de
migration d’overlays ont été retirés. Les cinq fichiers suivis restent
récupérables par Git. Les six sauvegardes locales ignorées ont été copiées avant
suppression dans le dossier temporaire de récupération
`proto05-mission146-retired-json-recovery`.

Les outils historiques de migration sous `database/migrations/` restent hors du
chemin runtime. Ils décrivent l’ancien cutover et ne sont appelés ni par le
serveur ni par les launchers.

## Frontières et transactions

- La frontière de lecture instancie toujours l’adaptateur MariaDB.
- La frontière d’écriture n’expose que les mutations MariaDB.
- Les mutations générales reçoivent l’état de départ et l’état demandé.
- Le périmètre est calculé par identifiants métier (activité, asset, source,
  playable, traitement, dossier et tag).
- Le plan SQL est filtré à ce périmètre avant exécution sous verrou applicatif
  et transaction sérialisable.
- Les cardinalités et valeurs ciblées sont relues avant commit.
- La copie de travail conserve sa transaction spécialisée.
- Un état client lu est cloné avant mutation, afin qu’une requête ne puisse pas
  altérer le témoin de départ.

IC-Hub ne lit plus les données Proto05 sur disque. Ses deux routes de
compatibilité en lecture relaient l’API autonome `8791` par HTTP.

## Nettoyage des tests

Les suites et helpers dont le contrat consistait à copier, modifier, sauvegarder
ou comparer le backend JSON ont été supprimés. La suite par défaut conserve les
tests de projection et de contrat indépendants du stockage et ajoute une suite
MariaDB réelle couvrant :

- absence statique du sélecteur, du repli et des chemins métier JSON ;
- échec fermé quand MariaDB est indisponible, sans secret dans le message ;
- démarrage MariaDB réussi ;
- création, modification, relecture, redémarrage et suppression d’une activité ;
- atelier guidé : langue, intervalle, segment, locuteur, couche et overlay ;
- création, relecture après redémarrage et suppression d’un dossier et d’un tag ;
- nettoyage complet des entités jetables.

Une incohérence préexistante entre la normalisation des tags du serveur et celle
du validateur média a été reproduite pendant cette recette. Le validateur utilise
désormais la même normalisation déterministe que la création applicative.

## Preuves

- Validation syntaxique Node : réussie pour Proto05, ses frontières, son test
  MariaDB et le serveur IC-Hub.
- Suite retenue : **64/64 tests réussis**.
- `git diff --check` : réussi.
- Scan runtime/documentation active : aucune occurrence de
  `PROTO05_DATA_MODE`, `writeSnapshot`, des lecteurs JSON historiques ou des
  quatre chemins métier JSON.
- Répertoire `data/` : aucun fichier `*.json*`.
- Redémarrage après suppression des JSON : healthcheck
  `storageAuthority=mariadb`, trois activités relues.
- Témoin déterministe MariaDB avant/après redémarrage :
  `d81e9a880d1b40ea1897c5da127a71393c34e5d378de3346b79ccec4e45851d0`.
- Cardinalités relues : 3 activités, 9 assets, 15 sources, 15 playables,
  4 traitements, 1 dossier, 3 tags et 4 langues.
- Entités Mission 146 résiduelles : 0 activité, 0 dossier, 0 tag.
- Les sept vidéos physiques ont conservé leurs témoins SHA-256 initiaux :
  `5D624B…DA5D`, `E88D23…14823`, `F4DD43…2C1F3`,
  `47A3E7…753D3`, `B65EAD…167B7`, `1591E1…12B7` et
  `B6DDD6…CBF27`.

Les 21 divergences historiques JSON/MariaDB n’ont été ni importées ni
réconciliées : la suppression de l’ancien backend les rend inaccessibles au
runtime, conformément à la mission.

## Documentation et lancement

Les guides du serveur, du prototype, du workspace, le statut, l’architecture,
le modèle de vidéothèque, l’exemple de configuration et le launcher Windows ont
été alignés sur MariaDB exclusive. Le launcher ne définit plus de mode de
données.

## Limites et validation humaine

La recette automatisée n’a effectué ni téléchargement distant, ni traitement
FFmpeg, ni suppression physique de média. Les assets locaux/UGA, leurs
playables, lignages et quatre traitements ont été relus dans la projection
MariaDB et les sept fichiers ont été contrôlés par hash, mais ces parcours
coûteux n’ont pas été rejoués. Aucune validation visuelle Chromium n’a été
réalisée pendant cette mission.

Recette humaine minimale proposée :

1. lancer Proto05 avec le launcher habituel et confirmer l’ouverture de la
   bibliothèque ;
2. ouvrir une activité existante dans l’atelier guidé puis preview/student sans
   l’enregistrer ;
3. ouvrir une fiche UGA et une fiche locale, vérifier leurs versions et lancer
   uniquement leur prévisualisation ;
4. arrêter MariaDB dans un créneau sûr, constater que Proto05 refuse de
   démarrer, puis la relancer.

## Message de commit proposé

`refactor(proto05): make MariaDB the exclusive runtime authority`
