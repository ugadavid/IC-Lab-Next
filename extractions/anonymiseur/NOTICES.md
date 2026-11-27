# Provenance et dépendances

Cette extraction reprend l’atelier publié dans **IC-Lab-Next, Proto05 0.1.69**. Les chemins d’origine sont relatifs à `prototypes/05-augmented-ic-video-01/`. [Sources de référence](https://github.com/ugadavid/IC-Lab-Next/tree/2098bc4a92feb6839ac0f256258b79ef40286d1a/prototypes/05-augmented-ic-video-01)

| Dans cette extraction | Source et adaptation |
|---|---|
| `ui/index.html` | Commandes, dialogues et surface de montage de `teacher-video-workshop.html`. L’en-tête et l’ouverture du catalogue sont remplacés par le choix du média local. |
| `ui/workshop-timeline.js`, `ui/workshop-timeline.css` | Timeline intégrée, masques, aperçu, boucle, historique et styles de `shared/`. Adaptations JS pour la clé de brouillon et le rattachement explicite des anciens projets. Les pictogrammes sont les tracés SVG de la page et du script d’origine. |
| `ui/workshop-project.js`, `ui/workshop-progress.js` | Validateur JSON v2 et panneau de progression de `shared/`, repris à l’identique. |
| `ui/workshop-versions.js`, `ui/workshop-export.js` | Commandes intégrées de `shared/`, raccordées aux variantes et aux destinations locales. |
| `moteur/workshop-mp4.js` | `server/workshop-mp4.js`, repris à l’identique. Le module appelle FFmpeg et FFprobe par leurs exécutables. |
| `test/moteur.test.js` | Cas de rendu de `server/test/workshop-mp4.test.js`, avec résolution locale des outils. Le test des traitements MariaDB est remplacé par les essais du raccord local dans `test/atelier-local.test.js`. |
| `atelier.js`, `atelier-local.js`, `http-local.js`, `stockage.js`, `choisir.ps1`, `ui/local.js` | Raccord de la mission 245. Démarrage, choix des chemins, identité de la vidéo, variantes, fichiers de lecture et publication locale. |

## Outils utilisés sur CODEX_VM

| Composant externe | Version observée pendant les essais | Usage et notice |
|---|---|---|
| Node.js | 24.22.2 | Serveur local, fichiers, processus et tests. [Notices de Node.js](https://github.com/nodejs/node/blob/v24.22.2/LICENSE) |
| Microsoft Edge | 158.0.4370.33 | Interface, API vidéo et audio du navigateur, sauvegarde automatique et fichiers projet. Crédits des composants disponibles dans `edge://credits`. |
| PowerShell et Windows Forms | PowerShell 7.6.9 dans la session, .NET 10.0.14 | Dialogues natifs d’ouverture et d’enregistrement. [Notice PowerShell](https://github.com/PowerShell/PowerShell/blob/master/LICENSE.txt) |
| FFmpeg et FFprobe | Build Gyan du 4 février 2026, révision `627da1111c` | Rendu, analyse et décodage de contrôle. La commande `ffmpeg -L` de cette installation indique la GNU GPL version 3 ou ultérieure. [Notice FFmpeg](https://ffmpeg.org/legal.html) |

Les exécutables, polices et bibliothèques système proviennent de l’installation de la machine. Aucun paquet npm, binaire tiers ni média n’est distribué dans ce dossier. La provenance du code IC-Lab est conservée ici. Le choix d’une licence de redistribution pour la future application revient au propriétaire du projet.
