# Mission 245 — Extraction de l’anonymiseur pour Christian

## Essai sur CODEX_VM

Depuis la racine du clone, lancez `node .\extractions\anonymiseur\atelier.js`, puis ouvrez **http://127.0.0.1:8797** dans Edge. Dans une copie du seul dossier `anonymiseur`, la commande devient `node .\atelier.js`. Le lanceur global du labo est inutile.

1. Cliquez sur **Choisir une vidéo…**, ouvrez un MP4 de votre disque, placez un masque avec **M**, puis enregistrez *Visages seuls*.
2. Avancez le curseur et ajoutez avec **S** un passage **Couper le son**. Enregistrez *Visages et voix*. La boucle **B** permet de caler les deux passages.
3. Fermez l’onglet et le processus local. Relancez, sélectionnez le même fichier et ouvrez *Visages et voix* dans **Versions (2)**.
4. Cliquez sur **Exporter en MP4**. Choisissez un dossier et un nouveau nom. Ouvrez le résultat dans votre lecteur habituel. Recommencez avec *Visages seuls* pour comparer la piste sonore.

Le [README de l’extraction](../extractions/anonymiseur/README.md) précise les prérequis, le stockage, la reprise du brouillon et le transport d’un projet.

## Sources et adaptations

L’extraction **0.1.0** part des neuf fichiers de l’atelier **Proto05 0.1.69** au commit `2098bc4a92feb6839ac0f256258b79ef40286d1a`. Avant adaptation, les neuf empreintes Git locales correspondaient aux blobs publiés. La version 0.1.0 identifie le premier lot autonome.

| Origine dans Proto05 | Livrable dans `extractions/anonymiseur/` | Adaptation |
|---|---|---|
| `teacher-video-workshop.html` | `ui/index.html`, `ui/local.js` | Surface du lecteur, contrôles image/son, dialogues, aide et navigation clavier. L’entrée ouvre un fichier local. |
| `shared/workshop-timeline.js` et `.css` | `ui/workshop-timeline.js` et `.css` | Gestes, poignées, aperçu, zoom, boucle, annuler/rétablir et projet JSON v2. Clé de brouillon par empreinte du média. Rattachement d’un projet Proto05 importé après contrôle de durée et confirmation. CSS à l’identique. |
| `shared/workshop-project.js`, `shared/workshop-progress.js` | Fichiers de mêmes noms dans `ui/` | Validateur et panneau de progression repris à l’identique. |
| `shared/workshop-versions.js`, `shared/workshop-export.js` | Fichiers de mêmes noms dans `ui/` | Liste et réouverture, enregistrement d’une variante retouchée avant export, suivi du rendu, sélection de la destination et accès au dernier MP4. |
| `server/workshop-mp4.js` | `moteur/workshop-mp4.js` | Moteur identique, blob Git `351f23df2a05b1bfedfcd849ec088f058b52f84f`. Conservés notamment le masque commun, les intervalles début inclus / fin exclue, la priorité du dernier passage audio et le décodage intégral de contrôle. |
| `server/test/workshop-mp4.test.js` | `test/moteur.test.js` | Cas de rendu sur média multipiste et muet, coupure, bip, chevauchements et décalage audio. Résolution des outils commune au lanceur. |

Le raccord local se trouve dans `atelier.js`, `atelier-local.js`, `http-local.js`, `stockage.js` et `choisir.ps1`. Le test `test/atelier-local.test.js` couvre ce raccord. Les [notices](../extractions/anonymiseur/NOTICES.md) identifient les sources et les outils externes.

Le navigateur lit directement le fichier choisi, avec prise en charge des plages d’octets. Son SHA-256 identifie le montage, même après avoir renommé ou déplacé une vidéo identique. Le brouillon conserve le curseur et les piles d’annulation dans le profil du navigateur. Chaque variante est un instantané JSON distinct sur disque, relisible dans un autre profil. FFmpeg travaille dans un répertoire temporaire dédié. Après validation, la publication exclusive évite d’écraser un fichier existant. Un reçu local rattache le MP4 à sa variante, y compris après redémarrage.

## Preuve hors dépôt

Les **18 fichiers** du lot ont été copiés dans un répertoire temporaire extérieur au clone. Chaque fichier de la copie a été comparé octet pour octet par SHA-256 avec son homologue à livrer. Les projets, médias et résultats de la recette ont été créés à côté, dans des répertoires jetables. La recette n’utilise aucun import du dépôt parent, aucune route Proto05, ni Hub, Docker ou MariaDB.

- **Lancement et tests.** Depuis la copie, `node atelier.js` a ouvert son écoute sur `127.0.0.1:8797`, puis le processus d’essai a été arrêté. Les trois tests Node passent depuis ce même dossier. Ils couvrent notamment les requêtes de lecture partielle, deux enregistrements concurrents de la même variante, le refus d’un export vers la source et le rendu multi-pistes.
- **Montage dans Edge.** Sur un damier synthétique de 6 secondes, création d’un masque de 1 à 3 s et d’une coupure de 2 à 4 s. Le rechargement a restauré le curseur à **2,50 s**, les deux passages et **quatre entrées d’annulation**. Arrêt du processus de recette (PID 14892). Après relance (PID 4336), un second profil Edge a rouvert les deux variantes depuis le disque et exporté chacune vers un fichier distinct.
- **Contrôle visuel.** La capture Chromium à **1280 × 800** montre le masque sur le damier, les deux pistes aux bornes décalées, **Versions (2)** et les commandes de lecture et d’export, sans chevauchement visible. Les commandes de l’ancien site ne figurent plus dans l’en-tête.
- **Lecture indépendante.** Chaque fichier exporté a été ouvert depuis le disque dans un lecteur HTML vidéo indépendant, dans un profil Edge distinct, sans script de l’atelier. Les deux lectures sont allées jusqu’à l’événement de fin à **6,00 s**, avec 24 relevés de progression chacune. Les mesures ci-dessous proviennent du décodage des fichiers.
- **Préservation.** La source et les deux `montage.json` avaient les mêmes empreintes avant et après les deux exports. Dans une nouvelle instance, chaque reçu a retrouvé le MP4 de sa propre variante.

| Mesure sur les MP4 | Visages seuls | Visages et voix |
|---|---:|---:|
| Contraste dans le masque à 0,95 / 1,00 / 2,95 / 3,00 s¹ | 227 / 0 / 0 / 228 | 227 / 0 / 0 / 228 |
| Niveau sonore à 1,96 / 2,02 / 3,96 / 4,02 s² | 0,08889 / 0,08835 / 0,08731 / 0,08825 | 0,08887 / 0 / 0 / 0,08824 |
| Pistes et durée | 1 H.264 + 1 AAC, 120 images, 6,00 s | 1 H.264 + 1 AAC, 120 images, 6,00 s |

¹ Maximum moins minimum sur un carré de 16 × 16 pixels. Le damier perd son contraste pendant le masque et le retrouve sur la première image à 3 s.  
² Niveau RMS sur 20 ms, amplitude normalisée. Le témoin d’entrée contenait deux pistes audio. FFprobe confirme que les sorties n’offrent aucune piste originale alternative.

## Environnement et limites

Essais sous Windows avec Node **24.22.2**, Edge **158.0.4370.33**, PowerShell **7.6.9** dans la session et FFmpeg/FFprobe **2026-02-04-git-627da1111c** dans `C:\Tools\FFmpeg\bin`. Les polices, le navigateur, les runtimes et les exécutables multimédias sont fournis par la machine. Le dossier extrait contient uniquement le code, deux fichiers de documentation et les tests.

Les connexions TCP clientes vers la boucle locale sont refusées dans cette session. Pour l’essai interactif automatisé, Edge et le gestionnaire de requêtes du lot ont échangé par un transport de test. Le lecteur a ouvert la source sur disque. La dernière passe a piloté les véritables dialogues Windows du dossier extrait, deux choix de vidéo et deux choix de destination. Chaque dialogue a renvoyé le chemin sélectionné et laissé la destination libre pour la publication du MP4. Le rendu, les fichiers projet, les reçus, les MP4 et leur lecture indépendante sont réels. La navigation TCP de bout en bout dans le navigateur habituel reste à confirmer sur CODEX_VM. Le repli vers Windows PowerShell 5.1, utilisé seulement en l’absence de PowerShell 7, n’a pas été validé dans cette session. Les codecs pris en charge en entrée dépendent du navigateur. Les limites du moteur 0.1.69 sur la rotation, les pixels non carrés et la taille de sortie s’appliquent.

La validation humaine de David porte sur **Proto05 0.1.69**. Ce lot autonome attend son essai. L’enveloppe desktop, l’installateur et la suite du site sont reportés. Le commit de livraison contient uniquement `extractions/anonymiseur/` et `reports/245_extraction_anonymiseur_autonome_report.md`. Message de commit **Extraire l’atelier d’anonymisation autonome 0.1.0 depuis Proto05 0.1.69**.
