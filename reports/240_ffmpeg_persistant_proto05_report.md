# Mission 240 — Retrouver FFmpeg après chaque relance de Proto05

## Demain sur CODEX_VM

1. Avec Docker et MariaDB disponibles et les préparations précédentes terminées, double-cliquer sur `START_IC_LAB_NEXT.bat`. Le correctif est présent dans les fichiers du clone de la VM. Aucun chemin à saisir.
2. Dans la [vidéothèque](http://127.0.0.1:8791/teacher/videos), choisir une vidéo de démonstration avec une version distante sans copie locale prête. Cliquer sur **Anonymiser** et, si nécessaire, choisir cette version. Attendre la préparation puis lancer la lecture.
3. Pour comparer depuis la même carte HLS, revenir à la vidéothèque, cliquer sur **Préparer pour anonymisation**, attendre la fin, puis ouvrir **Éditer les masques**. Pour une copie locale, le parcours historique reste **Voir la fiche → Anonymiser l’image**.

Pour vérifier ce qui tourne, [la santé de Proto05](http://127.0.0.1:8791/api/health) doit afficher la version **0.1.65**. [Le diagnostic FFmpeg](http://127.0.0.1:8791/api/proto05/library/ffmpeg) doit indiquer `available: true`. Avec la configuration reproduite sur cette VM, l’origine est `installation Windows (Tools/FFmpeg/bin)`. Un chemin explicite valide ou le `PATH` peuvent aussi être indiqués.

## Pourquoi la préparation marchait puis échouait

Le double-clic passe par `start-all.bat`, `launcher.ps1` et `service-host.ps1`. Le superviseur lance `node --env-file=../.env.local server.js` dans le répertoire serveur du prototype. Node hérite de l’environnement du lanceur. Le chemin accepté par le bouton **Vérifier et utiliser** était conservé dans la variable JavaScript `RUNTIME_FFMPEG_PATH` pour la durée du processus. Après redémarrage, en l’absence de chemin explicite, la préparation appelait simplement `ffmpeg`. La vérification de la vidéothèque et la préparation utilisaient deux fonctions de résolution différentes.

**Panne reproduite sur la version 0.1.64.** Dans une instance jetable, le processus 9076 a préparé le média par les deux parcours après avoir reçu le chemin via l’API de la vidéothèque. Après son arrêt, le processus 3288 a échoué sur deux préparations neuves du même média. Les versions des deux exécutables répondaient toujours lorsqu’ils étaient appelés par leur chemin complet. Dans l’environnement de l’essai, le `PATH` seul ne les trouvait pas. Ce test établit le mécanisme de la panne sans présumer de la manière dont David avait lancé sa préparation la veille.

## Correction

La vidéothèque et les préparations des deux ateliers utilisent désormais la même détection des outils installés. Elle respecte, dans l’ordre, le choix explicite de la session, `PROTO05_FFMPEG_PATH`, `FFMPEG_PATH`, puis le `PATH` du processus. Sous Windows, si FFmpeg est introuvable dans le `PATH`, elle essaie le dossier `Tools\FFmpeg\bin` du lecteur système. Sur cette VM, elle y trouve `C:\Tools\FFmpeg\bin\ffmpeg.exe` et `ffprobe.exe`. Les deux doivent s’identifier avec `-version`. Une configuration explicite erronée reste visible et le diagnostic nomme l’outil à corriger.

Le choix de la vidéothèque reste un réglage de session. Pour une installation personnalisée durable, le réglage existant est `PROTO05_FFMPEG_PATH`. L’installation actuelle de CODEX_VM est redécouverte automatiquement. Le correctif touche le serveur et sa documentation. Il ne nécessite aucune modification du lanceur, du `PATH` Windows ou des données du labo.

## Preuves de redémarrage et de préparation

Le superviseur Windows du dépôt a réellement lancé, arrêté, puis relancé Node sur une copie isolée de Proto05. Les deux démarrages utilisaient les arguments du manifeste et une configuration de test vide, sans chemin FFmpeg. La base était représentée par une fiche synthétique. Les requêtes de recette ont été remises aux gestionnaires HTTP de production dans le processus. Le média était un MP4 de trois secondes en 320 × 180. Pour le nouvel atelier, l’essai demandait explicitement une préparation du fichier local afin d’exercer FFmpeg même sur une copie lisible.

| Serveur 0.1.65 | Nouvelle préparation dans l’atelier | Nouvelle préparation historique |
| --- | --- | --- |
| Premier démarrage, PID 13404 | `hls-prep-1795769281893-73840ef6` | `hls-prep-1795769282069-2b53dd3d` |
| Après arrêt et relance, PID 100 | `hls-prep-1795769283366-3c34800b` | `hls-prep-1795769283545-98f21c47` |

Les quatre tâches ont abouti. Chacune a démarré le vrai `ffmpeg.exe`, puis le vrai `ffprobe.exe`, depuis le dossier installé sur la VM. Chaque MP4 a été servi par la route média du job (87 293 octets, durée vérifiée de 3 000 ms). L’original synthétique a conservé son empreinte. L’arrêt de chaque processus de recette a été contrôlé.

| Autre contrôle | Résultat |
| --- | --- |
| Outils disponibles dans le `PATH` | Origine `PATH`, les deux préparations aboutissent. |
| `PROTO05_FFMPEG_PATH` valide, `FFMPEG_PATH` erroné | La configuration Proto05 prime, les deux préparations aboutissent. |
| Chemin explicite de FFmpeg absent | Les deux parcours nomment FFmpeg et demandent de corriger son chemin. |
| Copie de FFmpeg dans un chemin avec espace, FFprobe absent à côté | Les deux parcours nomment FFprobe et demandent d’installer celui de la même distribution à côté de FFmpeg. L’API de diagnostic donne également cette indication. |
| Reprise de la recette 239 | Remux HLS de démonstration avec FFmpeg réel et transport distant simulé. Dans Edge, la même carte mène aux deux éditeurs et à la lecture. F5 conserve la version pendant la préparation, deux activations partagent la tâche, la reprise après erreur aboutit. |
| Vérifications du code | `node --check` et `git diff --check` réussis. Neuf tests existants ciblés passent (disponibilité média et publication atomique). |

## Limite de la recette VM

L’entrée `START_IC_LAB_NEXT.bat` a aussi été exécutée sur la copie isolée, avec un manifeste limité à Proto05. L’environnement d’exécution a refusé au lanceur l’accès CIM qui lui sert à identifier les processus. Il s’est arrêté avant le démarrage des services. Les connexions TCP locales depuis cette session ont également renvoyé un refus d’accès. Le redémarrage et les quatre préparations ci-dessus ont donc été vérifiés via son superviseur `service-host.ps1`. Le double-clic depuis l’Explorateur jusqu’à la lecture d’une vidéo du catalogue réel reste à valider par David. Aucun service de sa session, secret, média, dérivé, association ou préparation en cours n’a été modifié par les essais.

## Fichiers et version

- [Serveur](../prototypes/05-augmented-ic-video-01/server/server.js) et [package](../prototypes/05-augmented-ic-video-01/server/package.json). La correction fait passer Proto05 de **0.1.64 à 0.1.65**.
- [Guide du serveur](../prototypes/05-augmented-ic-video-01/server/README.md) et [repère de version du moteur](../prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md).
- Le présent rapport suit la [mission 240](../missions/240_ffmpeg_persistant_proto05.md) et la [recette 239](239_entree_atelier_anonymisation_report.md).

Message de commit proposé : `fix(proto05): retrouver FFmpeg et FFprobe après redémarrage`.
