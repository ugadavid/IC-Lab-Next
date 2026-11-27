# Mission 247 — Première application Windows pour Christian

## Essai de David sur Zenith Ice

Le dossier de remise vérifié sur CODEX_VM est **`C:\Users\codex\Documents\Projets\IC-Lab-Next\dist\Anonymiseur-0.1.2-ZI\`**. David a choisi une livraison dans le projet après le refus d’écriture dans `Documents\Livraisons`. Le dossier `dist` est déjà exclu de Git. Les trois fichiers ont été relus à cet emplacement et le SHA-256 du setup correspond au manifeste.

| Fichier | Usage |
| --- | --- |
| `Anonymiseur-0.1.2-Setup-x64.exe` | Installateur par utilisateur, 283 721 627 octets |
| `SHA256.txt` | SHA-256 du setup : `7bc9e198699cd5587a382ac457754b532f156584dd91c0cc7069739f4818c8c9` |
| `MEMO-ZI.md` | Recette courte à emporter avec le setup |

1. Copiez ce dossier sur ZI et lancez le setup. Depuis Démarrer, ouvrez **Atelier d’anonymisation**. Le premier point à vérifier est l’apparition de la fenêtre dédiée.
2. Cliquez sur **Choisir une vidéo…**. Tapez dans le sélecteur, appuyez sur **Échap**, puis sur **Entrée** pour le rouvrir. Validez un MP4 local.
3. Posez un flou avec **M**, enregistrez *Visages seuls*. Posez une coupure plus tard avec **S**, enregistrez *Visages + voix*. Fermez et rouvrez par le raccourci. Vérifiez la vidéo, le curseur et les deux variantes.
4. Ouvrez *Visages + voix*, cliquez sur **Exporter en MP4**. Essayez Échap puis une nouvelle destination. Lisez le fichier depuis l’Explorateur. Cette édition est destinée à l’essai personnel de David avant la remise à Christian.

## Ce que contient l’installation

L’application Windows **0.1.2** part de l’extraction **0.1.1**, commit `86baf9109c15f3b5f42a659c91e4ed44a23df374`. Le nouvel artefact principal est le setup, dont la version provient de `windows/package.json`. Electron 45.4.1 x64 embarque Chromium et Node. Le lecteur, l’interface, les versions, le format projet JSON v2 et le moteur MP4 proviennent de l’extraction. La fenêtre a un rendu isolé, sans Node ni pont natif exposé au JavaScript de la page. Son origine HTTPS fixe est desservie en mémoire par le processus principal. Le montage ne dépend d’aucun port, du réseau, de PowerShell ou d’une installation système de Node ou de FFmpeg.

Les deux dialogues ont pour propriétaire la fenêtre Electron. L’application garde son brouillon et le dernier chemin choisi dans le profil Windows. À la relance, elle recalcule l’identité du média et rouvre la vidéo. Les variantes restent sous `%LOCALAPPDATA%\IC-Lab\Anonymiseur\projets`. Le choix d’arrêter une exportation annule le processus et attend le nettoyage avant fermeture.

## Installation et essai du raccourci

Inno Setup **7.1.1** a installé le setup définitif sur Windows x64 hors du dépôt, sans élévation, avec le code retour **0**. Le mode d’essai a créé le raccourci dans le dossier installé en préservant le menu Démarrer et le registre du compte réel. En installation ordinaire, le setup crée aussi l’entrée Démarrer.

L’ouverture du `.lnk` par le Shell Windows a bien créé **Atelier.exe** dans le dossier de cette installation, PID **3624**. Il s’est terminé avec **0x80000003** avant l’apparition d’une fenêtre. Deux hôtes Electron témoins, versions 45.4.1 et 33.4.11, ont rendu le même code avant d’exécuter le JavaScript d’une application minimale. L’origine exacte de cet arrêt n’a pas pu être établie dans la session. Le critère de recette complète depuis le raccourci reste ouvert. Il en va de même du premier plan des deux dialogues et du clavier après Échap dans la fenêtre installée. David a validé ces gestes dans Chrome pour la 0.1.1.

## Contrôles réalisés avec les fichiers installés

Pour poursuivre la recette, le banc a exécuté **Atelier.exe installé en mode Node**, avec l’entrée principale, le gestionnaire de requêtes, la persistance et le moteur installés. Edge sans fenêtre a exécuté l’interface installée dans un profil de test. Le banc a remplacé la fenêtre Electron et les réponses des dialogues et transporté les requêtes vers le gestionnaire en mémoire. Les contrôles d’ordre de fenêtres Win32 ne font pas partie de cet essai.

| Essai | Observation |
| --- | --- |
| Ouverture, montage et reprise | Sur une vidéo H.264/AAC de 6 s, flou de 1 à 3 s puis coupure de 2 à 4 s. Le banc a enregistré *Visages seuls* et *Visages + voix*. Un deuxième processus a retrouvé le dernier média, les deux variantes et le curseur à 2,5 s. Les contrôles du DOM ont retrouvé le bouton d’ouverture après annulation, puis le bouton d’export après fermeture du panneau. |
| Outils de rendu | Le `PATH` des processus de l’atelier contenait uniquement System32. Les variables de résolution FFmpeg et FFprobe pointaient sur des fichiers absents. Les appels réellement exécutés pointaient tous sur `installation-finale\resources\outils\ffprobe.exe` et `ffmpeg.exe`. Le premier export a lancé FFmpeg sous les PID 14108 et 9980 pour le rendu puis le décodage de vérification. |
| Lecture indépendante | Un lecteur vidéo Edge séparé, ouvert directement sur les MP4 dans un profil neuf, a lu chaque fichier jusqu’à l’événement de fin à 6 s. Chaque résultat contient 120 images de 320 × 180, une piste H.264 et une piste AAC. |
| Vérification du flou | Contraste local dans le masque à 0,95 / 1 / 2,95 / 3 s : **227 / 0 / 0 / 228** sur chacun des MP4. |
| Vérification du son | Amplitude RMS à 1,96 / 2,02 / 3,96 / 4,02 s : **0,08887 / 0 / 0 / 0,08824** dans *Visages + voix*. Pour *Visages seuls*, elle reste supérieure à 0,087 aux quatre mesures. |
| Fermeture pendant le rendu | En déclenchant la fermeture pendant un vrai processus FFmpeg, le choix **Continuer l’export** a produit le MP4. Le choix **Arrêter et quitter** a arrêté le processus, laissé la destination libre et libéré le dossier temporaire. Les réponses à la confirmation étaient automatisées. |
| Intégrité | SHA-256 du média témoin avant et après : `01b6f33bf6f54db8715205bdcb828905635f4a7af6fdbc8f5868809e3d96e181`. Quatre tests Node passent, dont le nouveau test du transport de la fenêtre, des plages de lecture et de l’origine des requêtes. |

## Outils tiers et remise

La construction vérifie les empreintes de l’archive Electron, de FFmpeg, de FFprobe et des notices Gyan. Elle livre la licence d’Electron, les crédits Chromium, la GPLv3, le README détaillé du constructeur, les options de compilation et les sorties de licence des deux exécutables. Le build Gyan statique du 4 février 2026 porte la révision `627da1111c`, avec GPL, version 3 et libx264 activés. Le dossier disponible ne fournit pas les sources correspondantes complètes de toutes ses bibliothèques et des scripts de construction. **La redistribution de ce setup à Christian reste à préparer** avec ces éléments ou un build dont ils sont disponibles. [Notices et références de la livraison](../extractions/anonymiseur/windows/DEPENDANCES.md)

## Fichiers et publication

- `extractions/anonymiseur/windows/` contient le point d’entrée Electron, le transport, le manifeste, le script de construction, la définition Inno, les notices, le mémo et le guide de reconstruction.
- `extractions/anonymiseur/atelier-local.js` expose la reprise d’un fichier, permet d’interrompre son calcul d’empreinte et signale un export actif. Le README de l’extraction renvoie à l’édition Windows.
- `extractions/anonymiseur/test/windows-transport.test.js` couvre le nouveau transport. Le présent rapport est `reports/247_application_windows_anonymiseur_report.md`.

Message du commit — `feat(anonymiseur): installer l’atelier Windows autonome 0.1.2`.
