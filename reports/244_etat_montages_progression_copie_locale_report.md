# Mission 244 — Montages en cours, progression et copie locale

## Recette sur CODEX_VM

1. Lancez le labo avec `START_IC_LAB_NEXT.bat`. Dans la vidéothèque de Proto05, choisissez une vidéo de test et cliquez sur **Anonymiser**. Si plusieurs sources sont proposées, notez celle que vous choisissez. L’adresse de l’atelier conserve son `playableId`.
2. Ouvrez trois fois cette même adresse, par exemple première ouverture, **F5**, puis fermeture et réouverture. Si la source est distante et sans copie, laissez finir le premier téléchargement. À la lecture, la ligne sous le titre indique **Copie locale**. Les deux ouvertures suivantes doivent lire la même vidéo directement. Deux onglets ouverts pendant la première acquisition doivent rejoindre le même travail.
3. Enregistrez trois versions du montage sans exporter. Revenez à la vidéothèque. La carte indique **3 montages** en grille et en liste. Une autre carte sans montage garde son aspect habituel. Si la fiche comporte deux sources, la carte totalise les deux et le bouton **Versions** de l’atelier liste celles de la source choisie.
4. Ouvrez une version et cliquez sur **Exporter en MP4**. Regardez le lecteur et le contenu derrière le petit panneau centré pendant le rendu. Une fois le MP4 prêt, essayez **Lire le MP4** ou **Télécharger le MP4**, puis **Fermer**. La carte conserve **3 montages** et affiche **✓ Anonymisée**.
5. Après la fin des travaux, arrêtez le labo avec `STOP_IC_LAB_NEXT.bat`, puis relancez-le avec `START_IC_LAB_NEXT.bat`. Rouvrez la même source. Vérifiez **Copie locale**, vos versions et le nombre de fichiers dans le sous-dossier `source` de la vidéo. L’ancien éditeur reste accessible depuis **Voir la fiche**.

Pour observer le stockage en lecture seule, depuis la racine du clone, lancez cette commande avant la première ouverture puis à chaque reprise. Le nom du dossier parent de `source` correspond à l’identifiant de la vidéo dans l’adresse de l’atelier.

```powershell
Get-ChildItem '.\prototypes\05-augmented-ic-video-01\data\video-library-workspaces\*\source\*' -File |
    Select-Object FullName, Length, LastWriteTime
```

## Ce que faisait la 0.1.68

Pour un original distant sans copie gérée reconnue, l’atelier inspectait la source puis lançait FFmpeg via la passerelle de Proto05. Il produisait `%TEMP%\proto05-hls-preparations\<travail>\work.mp4`. À chaud, F5 pouvait retrouver cette préparation en mémoire. Une fois le travail expiré ou le serveur redémarré, il fallait relire la source. Un ancien fichier géré pouvait déjà être utilisé si une unique copie présente portait la provenance attendue sur le playable. La répétition du message ne prouve donc pas à elle seule un transfert. Sur notre source témoin, il y avait bien un second transfert après redémarrage.

Pendant l’export, chaque sondage effaçait le statut, masquait le panneau, attendait la réponse puis le réaffichait dans le flux sous le titre. Le navigateur recalculait la position du lecteur à chaque cycle. Sur le média témoin, FFmpeg a également émis un premier relevé sans horloge exploitable. La 0.1.68 pouvait alors conserver une progression numérique invalide et afficher 0 %.

## Mesures de transfert et de stockage

Même fichier MP4 de **968 404 octets**, mêmes étapes avant et après. Deux processus Node distincts par version, avec arrêt normal entre les deux. Les demandes d’ouverture et les travaux passent par le code de Proto05. Le banc fournit le transport de la source en mémoire. Il compte les inspections HEAD, les lectures complètes du média et les octets livrés au vrai FFmpeg. FFprobe, les fichiers temporaires et définitifs, leurs tailles et leurs empreintes sont réels. Les enregistrements du catalogue témoin sont persistés à part. Ces mesures décrivent ce banc, pas le trafic Internet du catalogue de David.

| Étape pour la source A | HEAD avant → après | Lectures du média avant → après | Octets de source avant → après | Remuxages FFmpeg avant → après | Fichier de lecture à la fin, avant → après |
|---|---:|---:|---:|---:|---|
| Première ouverture à froid, deux demandes simultanées | 2 → 1 | 1 → 1 | 968 404 → 968 404 | 1 → 1 | 1 temporaire → 1 durable |
| F5 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | même temporaire → même durable |
| Fermer puis rouvrir | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | même temporaire → même durable |
| Deux ouvertures à chaud | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | même temporaire → même durable |
| Rouvrir après redémarrage de Proto05 | 1 → 0 | 1 → 0 | 968 404 → 0 | 1 → 0 | nouveau temporaire → même durable |
| **Total** | **3 → 1** | **2 → 1** | **1 936 808 → 968 404** | **2 → 1** | **2 temporaires successifs → 1 durable** |

Les PID de la comparaison serveur sont 11512 puis 15964 pour la 0.1.68, 4448 puis 17036 pour la 0.1.69. La copie A garde son identifiant et son chemin après relance. Une seconde source B du **même asset**, avec les **mêmes octets**, a déclenché sa propre acquisition. Sur la fixture uniquement, déplacer A hors de son chemin a provoqué un transfert et restauré le chemin et l’identifiant attendus. Remplacer A par un fichier corrompu de taille identique a provoqué un transfert et créé une copie valide distincte. Le fichier corrompu a été préservé octet pour octet. L’ouverture suivante, y compris via l’ancien identifiant, a retrouvé le média réparé avec zéro transfert.

**Observation du disque de CODEX_VM.** Avant et après les essais, le clone contient 3 fichiers dans les dossiers `source` (427 321 600 octets) et 5 fichiers dans les dossiers `derived` (65 218 403 octets). Une copie de travail appartient à la source dont elle provient. Un MP4 exporté est un dérivé volontaire rattaché à une version de montage. Les essais de panne et de restauration ont porté exclusivement sur les fichiers de test.

## Mesures d’interface

Edge Chromium headless, fenêtre de 1280 × 800, zone de page mesurée de 1241 × 708 pixels. Le banc limite la vitesse de lecture de l’entrée par FFmpeg pour observer plusieurs sondages d’un véritable export image et son. Un échec de lecture provoqué sur la fixture a permis d’essayer **Réessayer l’export** puis d’obtenir le MP4. Les routes du serveur Node et les procédures d’accès des versions et des exports ont été exercées via un transport de test et un stockage isolé.

| Pendant le rendu | 0.1.68 | 0.1.69 |
|---|---:|---:|
| Images échantillonnées | 307 | 302 |
| Images où le panneau disparaît | 31 | 0 |
| Déplacement vertical du lecteur, maximum moins minimum | 18,53 px | 0 px |
| Variation du défilement vertical | 16 px | 0 px |
| Pertes du focus posé sur la commande du lecteur | 0 | 0 |

Sur la mesure à 302 images, le même panneau de **352 × 76,69 px** a présenté 0, 8, 26, 34, 52 et 60 % au fil des sondages. Un contrôle distinct a imposé **26 puis 27 %** dans Edge. Les seules mutations du panneau ont touché le texte du chiffre et l’attribut accessible `aria-valuenow`. La position du lecteur et celle du panneau ont gardé les mêmes coordonnées. L’ouverture locale rapide s’est terminée sans affichage du panneau. Les états de préparation sans pourcentage, de téléchargement à 42 %, de lecture locale et d’accès au MP4 prêt ont aussi été parcourus.

La première version enregistrée a donné **1 montage**. Deux versions sur A et une sur B du même asset ont donné **3 montages** sur sa carte et **Versions (2)** dans A. La carte témoin d’une autre vidéo est restée sans compteur ni coche. Vérification en grille, en liste, au retour de l’historique du navigateur, après export et dans un second profil Edge après relance de Proto05. L’ancien parcours a ouvert une vidéo lisible dans l’ancien éditeur.

## Livraison et limites

**Proto05 0.1.69**, incrément depuis 0.1.68 pour ces trois évolutions. Le schéma 008 et le format de projet 2 restent en usage. Les fichiers suivants se trouvent sous `prototypes/05-augmented-ic-video-01/`.

| Fichiers | Rôle |
|---|---|
| `server/server.js`, `server/workshop-local-copy.js`, `server/library-download-finalization.js` | Réservation du travail avant inspection distante, recherche de la provenance exacte, contrôle du fichier, publication exclusive sans écrasement et lecture directe. L’empreinte est vérifiée à nouveau après redémarrage. Pour les anciens fichiers sans empreinte, contrôle par FFprobe. |
| `server/proto05-mariadb-readonly.js`, `teacher-videos.html` | Agrégation dans le snapshot de lecture par asset, une requête de comptage par chargement de catalogue. La fiche identifie les sources ayant leurs propres montages afin de les garder accessibles. |
| `teacher-video-workshop.html`, `shared/workshop-progress.js`, `shared/workshop-export.js`, `shared/workshop-timeline.css`, `server/workshop-exports.js` | Panneau hors du flux, progression mesurable, reprise, accès au résultat et identification du média réellement lu. |
| `server/test/workshop-local-copy.test.js`, `server/test/workshop-catalogue.test.js` | Provenance, intégrité, concurrence de vérification, publication exclusive, comptage multi-source et isolation entre cartes. |
| `server/package.json`, `server/README.md`, `ANONYMIZATION_ENGINE.md` | Version applicative et documentation. |

Les six tests Node ciblés passent, dont les régressions MP4 de la 243. La requête de comptage de l’adaptateur a aussi été exécutée sur une base SQL en mémoire. Docker et les connexions TCP locales du labo étaient inaccessibles depuis la session. L’essai ne mesure donc ni le débit d’un fournisseur HLS en ligne ni une transaction dans la MariaDB de David. La recette humaine acquise concerne l’export 243 sur sa vidéo. La prochaine validation porte sur les trois gestes de la 244 dans son catalogue.

Rapport `reports/244_etat_montages_progression_copie_locale_report.md`. Commit prévu **Proto05 0.1.69 — Compter les montages et réutiliser la copie locale**.
