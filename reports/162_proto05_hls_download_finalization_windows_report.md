# Mission 162 — Finalisation des téléchargements HLS sous Windows

## Périmètre

Correction ciblée de la publication d’une copie HLS dans
`data/video-library-workspaces`, sans modification du schéma, des procédures
MariaDB, du modèle média ni des autres ateliers. La version Proto05 passe de
`0.1.54` à `0.1.55` conformément à la règle de baby step du dépôt.

## Diagnostic reproduit

Une fixture HLS locale courte, FFmpeg/FFprobe simulés et un asset MariaDB
jetable ont reproduit l’échec après production complète du fichier. Le premier
diagnostic technique était :

```text
PROTO05_TARGETED_WRITE_RECONCILIATION_FAILED
La relecture ciblée de media_sources diverge (created_at).
```

Deux défauts cumulatifs ont été établis :

1. `appendWorkingCopy` exigeait une égalité exacte entre les horodatages client
   et les colonnes `created_at`, `updated_at` et `analyzed_at` générées par la
   procédure MariaDB. La différence normale de quelques millisecondes annulait
   donc la transaction.
2. Les métadonnées du fichier téléchargé utilisaient `status: "available"`
   comme état d’analyse. Le contrat de `sp_media_register_playable` attend
   `complete` pour renseigner `analyzed_at`. Après correction du premier écart,
   ce second écart aurait encore fait échouer la relecture de
   `media_playable_metadata`.

Le dossier vide venait d’un problème distinct de nettoyage : le temporaire
était créé sous `<asset>/temp`, le fichier était déplacé vers `<asset>/source`
avant l’écriture MariaDB, puis le rollback supprimait uniquement le fichier.
Les répertoires `source`, `temp` et parfois l’asset restaient donc visibles.

## Correction

- Les téléchargements incomplets utilisent désormais la racine privée
  `.proto05-downloads`, hors du dossier définitif de l’asset.
- La publication finale utilise un lien physique atomique sur le même volume,
  suivi de la suppression du nom temporaire. Cette primitive refuse
  `EEXIST` et n’écrase donc jamais une destination existante, y compris sur un
  système où `rename` remplacerait autrement la cible.
- La publication est appelée par le writer après les écritures et la relecture
  relationnelle, immédiatement avant le commit MariaDB. Un échec de publication
  annule la transaction ; un échec de transaction après publication retire le
  fichier final et élague uniquement les répertoires redevenus vides.
- Les suppressions de fichiers et répertoires transitoires disposent de retries
  Windows bornés pour `EPERM` et `EBUSY`.
- Le démarrage supprime la racine temporaire privée ainsi que les anciens
  `temp`/`source` réellement vides. Le traitement terminal nettoie aussi les
  anciens `temp` de l’asset concerné.
- La relecture du writer compare tous les champs métier, mais reconnaît les
  horodatages générés par MariaDB comme autorité. Leur présence et leur validité
  restent obligatoires.
- La projection préparatoire conserve explicitement l’état de disponibilité de
  la mutation staged ; elle ne requalifie pas à tort le fichier comme absent
  avant la publication atomique.
- Le détail interne de réconciliation est journalisé sous une forme bornée et
  non sensible ; le message utilisateur reste générique.

## Tests automatisés

Nouveau fichier ciblé :
`server/test/library-download-finalization.test.js`.

Résultats finaux :

- publication atomique, rollback, reprise immédiate et collision : `1/1` ;
- rollback MariaDB forcé, absence de dossier final, puis nouvelle tentative du
  même média : `1/1` ;
- téléchargement HLS court, fichier final, refus d’un second téléchargement et
  nettoyage complet de la fixture : `1/1` ;
- suite existante `video-workspaces.test.js` : `10/10` ;
- syntaxe Node des fichiers concernés : succès ;
- `git diff --check` : succès au contrôle final.

Les trois scénarios HLS ciblés sont donc à `3/3`. Aucune entrée dont le titre
commence par `[TEST M162]` et aucun workspace de fixture ne subsistent.

## Recette réelle unique

La recette a été effectuée une seule fois avec l’asset existant :

```text
media-proto05-remote-ref-40a71fc0179ee61ada88dbd7
1. GT01_RFC7_reu1_09m05-12m09
```

Le préflight constatait zéro copie locale et une estimation de `58 175 324`
octets. Résultat :

```text
status: completed
storageKey: media-proto05-remote-ref-40a71fc0179ee61ada88dbd7/source/95ea7569b657cb58-1.-GT01_RFC7_reu1_09m05-12m09.mp4
sizeBytes: 53 867 437
sha256: 95ea7569b657cb58ecd79304664ac446adf283cfbb3cf20cd7791cb0d2eef09d
```

La relecture après redémarrage retrouve une source et un playable
`working-copy`, `availability: available`, des métadonnées FFprobe complètes,
`status: complete` et un `analyzedAt` MariaDB valide. Le fichier physique est
présent et non vide. L’ancien dossier `temp` qui précédait la correction a été
retiré ; `.proto05-downloads` et les workspaces vides de test sont absents.
Cette copie réelle est le résultat voulu de la recette et reste dans la fiche de
la vidéo ; elle n’est pas une donnée jetable.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/library-download-finalization.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-download-finalization.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/fixtures/fake-ffmpeg.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md`
- `reports/162_proto05_hls_download_finalization_windows_report.md`

## Limites et validation humaine

La suite Proto05 complète et les ateliers FFmpeg sans rapport avec ce parcours
n’ont pas été lancés, conformément au périmètre proportionné demandé. Aucun
contrôle visuel n’était nécessaire : la correction porte sur le writer et le
système de fichiers, sans modification d’interface.

David peut effectuer une recette humaine minimale en ouvrant la fiche de
« 1. GT01_RFC7_reu1_09m05-12m09 », vérifier la présence de la copie locale puis
la lire. Cette validation humaine n’est pas revendiquée par le présent rapport.

## Proposition de commit

```text
fix(proto05): fiabiliser la finalisation Windows des téléchargements HLS
```
