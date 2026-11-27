# Atelier d’anonymisation autonome · 0.1.1

L’[application Windows 0.1.3](windows/README.md) installe cette interface, son lecteur et les outils de rendu. Son raccourci **Atelier d’anonymisation** ouvre une fenêtre dédiée. Les instructions ci-dessous concernent l’édition navigateur.

Depuis la racine du clone sur CODEX_VM, lancez cette commande dans PowerShell.

```powershell
node .\extractions\anonymiseur\atelier.js
```

Ouvrez **http://127.0.0.1:8797** dans Edge ou Chrome. Gardez la console ouverte pendant le montage et les exports. **Ctrl+C** arrête l’atelier. Après avoir copié le dossier seul ailleurs, ouvrez PowerShell dans la copie et utilisez `node .\atelier.js`.

## Premier montage

1. Cliquez sur **Choisir une vidéo…** et sélectionnez un MP4 local, de préférence H.264/AAC. La lecture se fait directement depuis ce fichier.
2. Placez le curseur au début du flou, appuyez sur **M**, dessinez ou ajustez le cadre et réglez la fin du passage. Cliquez sur **Enregistrer une version** et nommez-la *Visages seuls*.
3. Déplacez le curseur, appuyez sur **S** et choisissez **Couper le son**. Ajustez sa fin indépendamment du flou. **B** boucle sur le passage sélectionné. Enregistrez *Visages et voix*.
4. Le lendemain, relancez la commande et choisissez la même vidéo. **Versions (2)** rouvre chacune des variantes. Le même profil de navigateur retrouve aussi le brouillon, le curseur et l’historique d’annulation. **Ctrl+S** permet de garder le projet JSON v2 dans un fichier de votre choix.
5. Ouvrez la variante souhaitée et cliquez sur **Exporter en MP4**. Si le montage a changé, nommez d’abord la nouvelle variante. Dans le dialogue Windows, choisissez un **nouveau nom de fichier** et son dossier. À la fin du contrôle du rendu, ouvrez le MP4 depuis l’Explorateur. **Lire le dernier MP4** retrouve également le dernier résultat disponible de la variante.

## Ce qui est enregistré

Les variantes résident dans `%LOCALAPPDATA%\IC-Lab\Anonymiseur\projets\<SHA-256 de la vidéo>\versions\`. Chaque version possède son propre `montage.json`. Son sous-dossier `exports` contient les reçus des MP4 enregistrés, avec leur destination. Un fichier vidéo identique garde ses variantes après un déplacement ou un changement de nom. Un contenu différent reçoit sa propre identité.

Le brouillon automatique appartient au profil du navigateur et à l’adresse de l’atelier. Pour le transporter, utilisez **Enregistrer le projet**, puis **Ouvrir un projet** avec la même vidéo. À l’import d’un JSON v2 de Proto05, l’atelier vérifie la durée et vous demande de confirmer la correspondance avec le média du catalogue.

## Prérequis et contrôles

Windows avec bureau interactif, Node.js 24, Edge ou Chrome récent et PowerShell avec Windows Forms pour les sélecteurs de fichiers. Le lanceur cherche `pwsh.exe`, puis Windows PowerShell 5.1 si PowerShell 7 est absent. Les règles PowerShell de la machine doivent autoriser l’exécution du script local `choisir.ps1`.

FFmpeg avec encodeur `libx264`, encodeur AAC et FFprobe doivent être installés. Sur CODEX_VM, les deux exécutables se trouvent dans `C:\Tools\FFmpeg\bin`. L’atelier sait aussi utiliser le `PATH` ou les chemins explicites `FFMPEG_PATH` et `FFPROBE_PATH`. Le lancement et les tests utilisent exclusivement les modules fournis avec Node. Le service écoute sur la boucle locale et peut fonctionner sans démarrer IC-Lab.

Pour rejouer les tests dans le dossier extrait, utilisez `node --test`. Le moteur hérité vérifie les pistes, la durée et le décodage complet du MP4. Il accepte des pixels carrés sans rotation à appliquer et une sortie inférieure à 2 Gio. La lecture du fichier d’entrée dépend des codecs pris en charge par le navigateur.

[Provenance, dépendances et notices](NOTICES.md)
