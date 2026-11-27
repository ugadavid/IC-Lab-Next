# Mission 243 — Télécharger le MP4 d’une version de montage

## Essai sur CODEX_VM

1. Double-cliquer sur `START_IC_LAB_NEXT.bat`. La [santé de Proto05](http://127.0.0.1:8791/api/health) doit indiquer **0.1.68**. Cette livraison réutilise le schéma **008** déjà validé pour les versions de montage.
2. Dans la [vidéothèque](http://127.0.0.1:8791/teacher/videos), cliquer sur **Anonymiser** sur la carte habituelle, puis reprendre la même source. Dans **Versions**, ouvrir **Visages + voix** et cliquer sur **Exporter en MP4**. Le nom du montage accompagne la progression du rendu, le contrôle du fichier et sa publication.
3. Quand **MP4 prêt** apparaît, cliquer sur **Télécharger le MP4**. Depuis l’Explorateur Windows, ouvrir le fichier dans son lecteur habituel. Regarder le début du flou, écouter la coupure qui commence plus tard et le retour de la voix. **Lire le MP4** ouvre aussi le dérivé dans un autre onglet.
4. Rouvrir **Visages seuls**, exporter et télécharger. Le masque doit agir au même endroit et le son rester audible sur l’ancien passage coupé. Les deux fichiers portent le nom et l’identifiant de leur version. En revenant dans la vidéothèque, la carte source affiche **✓ Anonymisée**.
5. Pour essayer une variante, déplacer un masque, puis cliquer sur **Exporter en MP4**. **Annuler** laisse la retouche à l’écran. **Enregistrer et exporter** permet de nommer la variante et d’enchaîner le rendu. Un F5 pendant le traitement doit retrouver son état.

## Deux fichiers ouverts hors de l’atelier

La recette sur média synthétique a posé un masque de **1 à 3 s** et une coupure de **2 à 4 s**. Edge a enregistré les deux MP4 sur disque. Un profil Edge indépendant les a ouverts par leur chemin local et a lu les deux fichiers. FFprobe a mesuré pour chacun **6,000 s**, **150 images** de 320 × 240 et deux flux, **H.264 + AAC**. Chaque téléchargement avait la même empreinte SHA-256 que le fichier publié pour sa version.

| Position | Image dans le MP4 | Son « Visages + voix » | Son « Visages seuls » |
| --- | --- | --- | --- |
| 0,6 s | Mire nette | Audible | Audible |
| 1,6 s | Cible floutée | Audible | Audible |
| 2,4 s | Cible floutée | Silence | Audible |
| 3,6 s | Mire redevenue nette | Silence | Audible |
| 4,4 s | Mire nette | Revenu | Audible |

Dans la cible floutée, sur une zone de 16 × 16 pixels à 2,4 s, l’écart moyen par composante RVB entre aperçu et MP4 est **3,16 sur 255**. Entre l’original et le MP4, il est **56,19** sur la même zone. Le niveau audio RMS mesuré sur 120 ms est **0** à 2,4 et 3,6 s pour la version coupée, puis **0,088** à 4,4 s. Sur ces trois fenêtres, la version image seule reste proche de **0,088**.

## Ce qui est rendu et publié

- Le serveur relit le projet immuable par son UUID, sa vidéo de catalogue et son playable source. Il résout le fichier local, la copie de travail liée à cette source ou la préparation achevée utilisée par le lecteur. Le navigateur n’envoie aucun chemin disque ni filtre FFmpeg.
- Tous les rectangles actifs au temps de l’image sont réunis dans un seul masque. Une intersection reçoit le même flou que le reste du masque. La géométrie suit l’image utile et les bornes sont début inclus, fin exclue. Le bip reproduit la sinusoïde de l’aperçu, **650 Hz** et gain **0,045**. En cas de chevauchement sonore, le dernier passage dans l’ordre du projet l’emporte. Le remplacement est calculé par échantillon.
- Le MP4 conserve une seule vidéo et au plus une piste audio. Les autres pistes, les sous-titres, les chapitres et les pièces jointes sont exclus. Une piste AAC intacte peut être copiée lors d’un export image seule. Sur une source muette, le rendu reste muet ou crée le son demandé par un bip.
- Les procédures existantes enregistrent le traitement `workshop-mp4`, sa source et l’UUID du montage dans `media_treatments`. La finalisation rattache le playable dérivé dans la même transaction. Le fichier rejoint l’espace média de Proto05 après contrôle de ses flux, de la durée, du minutage vidéo, de la taille et décodage intégral. La coche de la carte repose sur un traitement de ce type terminé avec un playable de sortie.
- Une requête répétée retrouve sa tentative ou le MP4 déjà produit. Une nouvelle tentative après erreur possède son propre numéro. Après redémarrage, un traitement interrompu peut être relancé. Les fichiers sources, les versions de montage et les dérivés des autres variantes restent disponibles.

## Contrôles et limites

| Contrôle | Résultat |
| --- | --- |
| Parcours navigateur | Carte → atelier → sauvegarde de la première version → retouche → annulation, puis enregistrement et export de **Visages + voix**. Une indisponibilité provoquée de la source a conservé le montage et laissé la carte sans coche. Après rétablissement, double-clic sur la reprise puis rechargement de l’atelier. Deux versions téléchargées, deux dérivés terminés et une tentative en échec dans le registre de recette. |
| Reprise | Arrêt de Proto05 (PID 15796) puis démarrage d’un autre processus (PID 3056). Un second profil a retrouvé la coche, le montage et le MP4 existant. Le nombre de dérivés est resté à deux. |
| Traitement FFmpeg | Sur une autre mire contenant deux pistes d’entrée, vérification des images aux bornes à 20 images/s et mesure des fréquences audio. Deux masques simultanés, coupure recouverte par un bip puis priorité inversée, image seule, son seul, source sans audio avec et sans bip. Une piste audio décalée de 250 ms a conservé son retard initial. Les empreintes de l’original et de la première sortie ont été revérifiées après le deuxième export. |
| Tests automatisés | **13 tests réussis** dans `workshop-mp4.test.js`, `precise-video-time.test.js` et `playable-annotations.test.js`. Le nouveau test de reprise contrôle aussi l’accusé de publication perdu et la réutilisation du traitement terminé. |
| Visuel | Vue Chromium de l’atelier inspectée à **1280 × 800**. Nom de la version, état et liens de lecture et téléchargement lisibles au-dessus du lecteur. Sur la carte source, la coche mesurait 108 × 25 pixels et tenait entre l’usage et le nombre d’accès. Aucun message d’erreur de page sur le parcours terminé. L’entrée historique **Voir la fiche** est restée présente. |

**Conditions de recette.** FFmpeg, FFprobe, l’encodage, les fichiers, les deux processus Proto05 et les navigateurs étaient réels. Les connexions TCP locales et le moteur Docker étaient inaccessibles depuis cette session. Le banc a acheminé les requêtes par IPC vers les gestionnaires de Proto05 et utilisé ses adaptateurs avec un pilote de recette SQLite persistant. Les octets servis par la route média ont été transmis au téléchargement Edge. Le catalogue et le média étaient des fixtures. Aucune écriture dans la base du labo.

**À vérifier sur le catalogue.** Le clic sur le lien de téléchargement servi en HTTP, l’inscription par les procédures MariaDB de la VM et le résultat sur le visage et la voix choisis par David constituent la recette humaine. Les entrées à rotation ou pixels non carrés sont refusées avec un message avant publication. Le renouvellement réel d’une préparation distante et les médias longs n’ont pas été rejoués durant cette mission. La validation humaine acquise porte sur les trois versions de montage de la 242.

## Livraison

Sous `prototypes/05-augmented-ic-video-01/` :

- `teacher-video-workshop.html`, `shared/workshop-timeline.js`, `shared/workshop-timeline.css`, `shared/workshop-versions.js` et `shared/workshop-export.js` portent les commandes, la sauvegarde suivie de l’export et la reprise.
- `teacher-videos.html` affiche la coche sur la carte source.
- `server/server.js`, `server/workshop-exports.js` et `server/workshop-mp4.js` résolvent l’entrée, pilotent la tâche, valident et publient le dérivé. `server/test/workshop-mp4.test.js` contient les tests de rendu et de reprise.
- `server/package.json`, `server/README.md` et `ANONYMIZATION_ENGINE.md` identifient **Proto05 0.1.68** et documentent le rendu. L’incrément depuis **0.1.67** correspond à la nouvelle commande d’export. Le projet JSON reste en version **2**.

Rapport — `reports/243_export_mp4_atelier_report.md`. Commit — `Proto05 0.1.68 — Exporter les versions de montage en MP4`. La suite est l’essai des deux variantes sur CODEX_VM.
