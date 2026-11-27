# Atelier d’anonymisation 0.1.3 · essai sur Zenith Ice

1. Fermez l’atelier 0.1.2 et installez `Anonymiseur-0.1.3-Setup-x64.exe` dans le même compte Windows. L’installation reprend le dossier des projets et le profil existants.
2. Ouvrez **Atelier d’anonymisation** dans le menu Démarrer. Choisissez un petit MP4 local. Testez **Échap**, puis **Entrée** pour rouvrir le sélecteur.
3. Placez un masque avec **M** et enregistrez la variante *Visages seuls*. Un peu plus loin, utilisez **S** pour couper le son et enregistrez *Visages + voix*.
4. Fermez puis rouvrez l’application. Vérifiez le brouillon et les **Versions (2)**. Ouvrez *Visages + voix*, cliquez sur **Exporter en MP4**, puis choisissez un nom de fichier neuf. Ouvrez-le dans un lecteur indépendant pour contrôler le flou, la coupure et le retour du son.
5. En cours d’export, fermer la fenêtre propose de continuer ou d’arrêter le rendu. La désinstallation conserve les projets de votre compte dans `%LOCALAPPDATA%\IC-Lab\Anonymiseur`.

Si le premier clic bloque, copiez ce chemin dans la barre d’adresse de l’Explorateur : `%LOCALAPPDATA%\IC-Lab\Anonymiseur\profil-windows\diagnostic-acces.json`. Le dernier choix vidéo ou refus d’écriture y indique la version, l’heure, le statut, l’initiateur Electron, la présence de l’origine HTTP et la reconnaissance du JSON. Le fichier peut être partagé sans révéler les noms ni les chemins des vidéos.

Pour contrôler l’intégrité du transfert, comparez le SHA-256 du setup avec `SHA256.txt`. Édition d’essai pour David. La remise à Christian attend le complément de sources tierces décrit dans les notices installées.
