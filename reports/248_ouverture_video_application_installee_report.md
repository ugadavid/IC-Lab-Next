# Mission 248 — Ouvrir une vidéo depuis l’application installée

## Essai sur Zenith Ice

Le setup **0.1.3** pour David est dans `C:\Users\codex\Documents\Projets\IC-Lab-Next\dist\Anonymiseur-0.1.3-ZI\Anonymiseur-0.1.3-Setup-x64.exe` sur CODEX_VM. Le même dossier contient le mémo et le manifeste. Le SHA-256 relu sur le setup de 283 722 181 octets est `8de137a7ab58c0623321e71e505f5cb1de060d921f935dcec26d1b051acc131e`.

1. Fermez la 0.1.2, installez la 0.1.3 dans le même compte et lancez **Atelier d’anonymisation** depuis son raccourci.
2. Cliquez sur **Choisir une vidéo…**, tapez quelques caractères, puis appuyez sur **Échap**. Appuyez sur **Entrée** pour rouvrir le sélecteur et choisissez un MP4.
3. Posez un masque, enregistrez une variante, puis cliquez sur **Exporter en MP4**. Choisissez une nouvelle destination et ouvrez le fichier produit.
4. Si l’action est refusée, ouvrez `%LOCALAPPDATA%\IC-Lab\Anonymiseur\profil-windows\diagnostic-acces.json`. Le dernier choix vidéo ou refus d’écriture y laisse l’heure, la version, le statut et les contrôles d’origine et de contenu. Aucun nom de média, chemin de fichier ou corps de requête n’y figure.

## Pourquoi le sélecteur restait fermé

Sur ZI, David a confirmé que le raccourci de la **0.1.2** ouvrait la fenêtre. Son message d’erreur venait du contrôle des écritures, avant l’appel au dialogue natif. Le bouton envoyait bien un POST JSON. Le gestionnaire local exigeait aussi l’en-tête HTTP `Origin`. Or le transport Electron de l’application intercepte la requête et recevait séparément l’origine de la page dans `request.initiatorOrigin`. La 0.1.2 ne consultait que les en-têtes. Le banc de la mission 247 fabriquait lui-même un en-tête `Origin` valide.

J’ai isolé la condition en rejouant la conversion de requête présente dans **Atelier.exe** et le gestionnaire de chaque installation. Avec un initiateur valide et un type `application/json`, la seule absence de l’en-tête `Origin` reproduit exactement **403 — Ouvrez l’atelier pour effectuer cette action.** en 0.1.2, avec zéro appel au sélecteur. En ajoutant uniquement l’en-tête, la même version appelle le sélecteur. La conversion Electron 45.4.1 omet aussi l’en-tête lorsqu’il contient le texte `null`. La trace du clic historique sur ZI n’est pas disponible pour distinguer ces deux formes. [Conversion dans Electron 45.4.1](https://github.com/electron/electron/blob/v45.4.1/lib/browser/api/protocol.ts) · [Origine de l’initiateur fournie par Electron](https://www.electronjs.org/docs/latest/api/protocol#protocolhandlescheme-handler)

## Correctif et contrôles d’accès

Pour toute écriture interceptée dans l’application Windows, la 0.1.3 exige l’initiateur natif exact `https://atelier.invalid`. Si l’en-tête HTTP manque, l’adaptateur transmet cette origine vérifiée au gestionnaire local. Un en-tête présent reste soumis à son contrôle d’origine. Le type de média doit être exactement `application/json`, avec paramètres éventuels. Ce raccord commun dessert le choix vidéo, la sauvegarde des variantes et le lancement des exports.

| Contrôle | Résultat |
| --- | --- |
| Initiateur de l’atelier, en-tête absent, contenu JSON | Ouverture, sauvegarde et export acceptés. Dans le comparatif d’ouverture, la 0.1.3 renvoie **200** et atteint le sélecteur. |
| Initiateur absent, opaque ou étranger, même avec un en-tête de l’atelier | **403** avant le sélecteur. |
| En-tête d’origine contradictoire, destination étrangère ou requête signalée intersite | **403**. |
| Type absent, `text/plain` ou `application/jsonp` | **403**. |
| Entrée HTTP de l’édition navigateur | L’absence de l’en-tête d’origine reste refusée. Une écriture de même origine avec JSON reste acceptée. |

## Installation et recette

**Depuis le vrai raccourci.** Le setup définitif a été installé par-dessus la 0.1.2 dans un dossier de test Windows hors du dépôt. Le raccourci créé par Inno a lancé l’exécutable installé, PID **4212**. Dans cette session, il s’est arrêté avec **0x80000003** avant de créer une fenêtre, comme la 0.1.2. Le clic dans la fenêtre Electron visible, le premier plan du sélecteur, Échap et le choix réel d’une destination restent à valider sur ZI. Le SHA-256 du montage témoin nommé et celui du fichier mémorisant la dernière vidéo étaient identiques avant et après la mise à jour.

**Avec les composants installés.** Edge sans fenêtre a exécuté les boutons et la timeline de l’interface installée dans un profil jetable. Le banc a utilisé les en-têtes produits par les requêtes de cette interface, fourni l’initiateur de test à la conversion embarquée dans Electron et exercé le processus principal installé en mode Node. Il a remplacé la fenêtre et les réponses des dialogues. Les deux POST de choix, les deux PUT de variante et les trois POST d’export ont tous reçu **200**, avec `Origin` absent et type JSON présent. Annulation et réouverture, reprise des variantes *Visages seuls* et *Visages + voix*, reprise du curseur à 2,5 s et retour de focus aux boutons ont été vérifiés sur ce banc.

Les deux MP4 ont été produits par les **FFmpeg et FFprobe de l’installation**. Un lecteur Edge indépendant les a lus jusqu’à 6 s. Dans *Visages + voix*, le contraste dans le masque passe de 227 à 0, puis revient à 228. L’amplitude sonore mesurée passe de 0,08887 à zéro pendant la coupure, puis revient à 0,08824. Dans *Visages seuls*, elle reste supérieure à 0,087 aux quatre mêmes points. La source a conservé son empreinte. Les **cinq tests Node** de l’extraction passent.

## Fichiers et version

- `windows/transport.cjs`, `http-local.js` et `windows/main.cjs` assurent la vérification de l’initiateur, le contrôle JSON et le diagnostic local.
- `test/windows-transport.test.js` couvre les trois écritures, les lectures de média et les refus d’accès.
- `windows/package.json`, les deux README, `windows/DEPENDANCES.md` et `windows/MEMO-ZI.md` identifient le correctif Windows **0.1.3**. Les chemins sont relatifs à `extractions/anonymiseur/`. L’identité d’installation, le profil et le format des variantes sont ceux de la 0.1.2.
- Rapport : `reports/248_ouverture_video_application_installee_report.md`. Setup, manifeste et mémo de remise résident dans `dist`, exclu de Git.

Message de commit — `fix(anonymiseur): vérifier l’initiateur Electron avant les écritures`.
