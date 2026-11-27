# Construire l’application Windows

**Atelier d’anonymisation 0.1.2** reprend la version autonome 0.1.1. L’installateur x64 s’utilise hors ligne, par utilisateur. Electron embarque le moteur JavaScript et le lecteur. Les deux programmes de rendu sont lancés par leur chemin absolu sous `resources/outils`. La version en navigateur reste disponible avec son lanceur d’origine.

## Construction sur CODEX_VM

Préparer l’archive officielle `electron-v45.4.1-win32-x64.zip`, le dossier du build Gyan `2026-02-04-git-627da1111c-full_build` contenant `bin`, `LICENSE` et `README.txt`, et Inno Setup 7 (version de construction sur la VM, 7.1.1). Le script refuse les entrées dont l’empreinte diffère des binaires et notices retenus. Aucun téléchargement n’a lieu pendant la construction. Les dépendances de développement appartiennent au poste de construction.

Depuis la racine du dépôt, dans PowerShell 7 sur CODEX_VM :

```powershell
$archive = Get-ChildItem "$env:LOCALAPPDATA\electron\Cache" -Recurse -File -Filter 'electron-v45.4.1-win32-x64.zip' | Select-Object -First 1
.\extractions\anonymiseur\windows\build.ps1 -ElectronZip $archive.FullName -FFmpegDir 'C:\Tools\FFmpeg'
```

Le script construit dans un dossier temporaire neuf et dépose le setup, `SHA256.txt` et `MEMO-ZI.md` dans `Documents\Livraisons\Anonymiseur-0.1.2-ZI`. Le paramètre `-OutputRoot` permet de choisir un dossier d’essai vide. Une livraison existante est préservée. Les signatures et horodatages du compilateur peuvent faire varier le SHA du setup entre deux constructions. Les exécutables tiers ont chacun une empreinte verrouillée.

## Données et fermeture

Le profil Electron réside dans `%LOCALAPPDATA%\IC-Lab\Anonymiseur\profil-windows`. La dernière vidéo choisie y est mémorisée. À la relance, elle est identifiée à nouveau par son contenu avant la reprise du brouillon. Si elle a été déplacée, **Choisir une vidéo…** permet de la retrouver. Les variantes restent dans le dossier `projets` de l’extraction, à côté du profil Windows. Le passage d’un brouillon du navigateur à l’application se fait par le fichier projet JSON v2.

Les pages et les plages d’octets des médias passent par le gestionnaire de l’atelier dans une session Electron locale. L’application utilise une origine fixe pour la reprise et ne lance aucun serveur TCP. Le processus principal présente les dialogues rattachés à la fenêtre et vérifie l’identité du MP4 avant de l’ouvrir dans le lecteur associé. Pendant un rendu, l’utilisateur peut continuer ou arrêter et quitter. Les projets et les vidéos appartiennent à l’utilisateur et sont conservés lors de la désinstallation.

Pour la recette isolée, le même setup accepte `/DIR=<dossier de test> /IntegrationWindows=non`. Il crée le raccourci **Atelier d’anonymisation** dans ce dossier, avec le même exécutable et le même AppUserModelID que l’entrée Démarrer d’une installation ordinaire. Ce réglage réserve les écritures du test au dossier choisi et évite une entrée de désinstallation dans le compte courant.

[Provenance et conditions de remise des composants tiers](DEPENDANCES.md)
