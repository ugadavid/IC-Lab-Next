# Atelier d’anonymisation 0.1.2 · essai sur Zenith Ice

1. Copiez le dossier de livraison sur ZI. Installez `Anonymiseur-0.1.2-Setup-x64.exe` dans votre compte Windows. Le setup contient Electron, FFmpeg et FFprobe. Aucun téléchargement au premier lancement.
2. Ouvrez **Atelier d’anonymisation** dans le menu Démarrer. Choisissez un petit MP4 local. Testez **Échap**, puis **Entrée** pour rouvrir le sélecteur.
3. Placez un masque avec **M** et enregistrez la variante *Visages seuls*. Un peu plus loin, utilisez **S** pour couper le son et enregistrez *Visages + voix*.
4. Fermez puis rouvrez l’application. Vérifiez le brouillon et les **Versions (2)**. Ouvrez *Visages + voix*, cliquez sur **Exporter en MP4**, puis choisissez un nom de fichier neuf. Ouvrez-le dans un lecteur indépendant pour contrôler le flou, la coupure et le retour du son.
5. En cours d’export, fermer la fenêtre propose de continuer ou d’arrêter le rendu. La désinstallation conserve les projets de votre compte dans `%LOCALAPPDATA%\IC-Lab\Anonymiseur`.

Pour contrôler l’intégrité du transfert, comparez le SHA-256 du setup avec `SHA256.txt`. Édition d’essai pour David. La remise à Christian attend le complément de sources tierces décrit dans les notices installées.
