# Mission 246 — Les dialogues Windows de l’anonymiseur autonome

## Essai sur CODEX_VM

1. Si l’atelier tourne déjà, arrêtez sa console avec **Ctrl+C**. Depuis la racine du clone, lancez `node .\extractions\anonymiseur\atelier.js`. La console doit annoncer **Atelier autonome 0.1.1**. Ouvrez ou rechargez **http://127.0.0.1:8797** dans Chrome.
2. Cliquez sur **Choisir une vidéo…**. Sans cliquer à nouveau, tapez quelques lettres. Elles doivent apparaître dans le champ du nom de fichier, devant l’atelier. Appuyez sur **Échap**, puis sur **Entrée**. Le sélecteur doit se rouvrir. Choisissez cette fois une vidéo et validez.
3. Ouvrez une variante enregistrée, puis cliquez sur **Exporter en MP4**. Le nom proposé doit être prêt à modifier. Tapez quelques lettres, puis appuyez sur **Échap**. L’atelier doit afficher **Enregistrement annulé**. Fermez le panneau et relancez l’export.
4. Choisissez un dossier et un **nouveau** nom de MP4. À la validation, la progression doit être visible dans l’atelier. Ouvrez le fichier produit depuis l’Explorateur. Le bouton **Annuler** du sélecteur peut aussi servir à refaire l’essai.

## Diagnostic et correctif

En 0.1.0, David a validé l’ouverture, le montage et l’export dans Chrome. Il a constaté que les deux sélecteurs s’ouvraient derrière la fenêtre. Les deux actions lancent `choisir.ps1` depuis Node dans un processus PowerShell STA à console masquée. Le formulaire WinForms passé à `ShowDialog` avait la propriété `TopMost`, mais le script ne l’affichait ni ne l’activait. Il n’avait aucun lien avec la fenêtre de l’atelier.

En 0.1.1, le script reconnaît au premier plan la fenêtre Chromium portant le titre de l’atelier. Il lui rattache un formulaire transparent, sans bordure ni bouton dans la barre des tâches, l’affiche et l’active avant d’ouvrir le sélecteur. À la fermeture, si ce formulaire a encore le premier plan, il rend l’activation à la fenêtre de départ avant d’être détruit. Si la fenêtre de l’atelier n’est plus identifiable au démarrage du script, le sélecteur utilise le formulaire seul. Le correctif n’utilise aucun maintien global `TopMost`. L’atelier rétablit aussi le focus du bouton **Choisir une vidéo…** si sa désactivation temporaire l’avait fait perdre.

## Contrôles effectués sur Windows

| Contrôle | Résultat observé |
| --- | --- |
| Fenêtres natives, PowerShell 7.6.9 | Dans une copie isolée, un processus témoin affichait une fenêtre ayant la classe et le titre attendus. Avant toute action sur chacun des cinq dialogues, l’observateur a vérifié la chaîne de propriétaires, l’ordre des fenêtres, le premier plan et le contrôle qui avait le focus. **5 sur 5** étaient devant le témoin, avec le focus dans le champ du nom de fichier, entre 0,74 et 1,04 s après le lancement du processus. |
| Annulation et retour | Ouverture avec Échap, ouverture validée, destination avec Échap, bouton Annuler, destination validée. **5 retours sur 5** à la fenêtre témoin. Sur les deux essais Échap, le champ qui avait déjà le focus a reçu le premier caractère envoyé. Les annulations ont renvoyé une sortie vide. Les validations ont renvoyé le chemin exact. Le nom proposé à l’export était présent. |
| Parcours Edge automatisé | Deux profils temporaires, interface de l’extraction, zone de rendu de 1 256 × 708. Annulation et réouverture du sélecteur vidéo, sélection du MP4, reprise des variantes, annulation et relance de l’export. Après annulation, le focus du document est revenu à **Choisir une vidéo…**, puis à **Exporter en MP4** après fermeture du panneau d’export. |
| Fichiers réellement exportés | **Visages et voix.mp4**, 96 572 octets, et **Visages seuls.mp4**, 93 680 octets. FFprobe a retrouvé une piste H.264 et une piste AAC de 6 s dans chaque MP4. Les empreintes SHA-256 de la source témoin et des deux montages sont restées identiques entre la préparation des variantes et la fin des exports. |
| Non-régression | Les trois tests Node de l’extraction passent, dont le contrôle des masques et du son dans le MP4. Les deux JavaScript modifiés et le script PowerShell passent les contrôles de syntaxe. |

## Portée de la preuve

Chrome 158 s’est arrêté au démarrage de Crashpad dans le profil de test. Dans Edge 158 en mode fenêtré, l’atelier n’a pas chargé. Le serveur de test écoutait sur la boucle locale, mais n’a reçu aucune requête du navigateur. La recette Edge a donc utilisé le navigateur sans fenêtre, avec un transport de test entre les boutons de l’interface et le gestionnaire HTTP de l’extraction. Les sélecteurs Windows, les variantes et les rendus FFmpeg de cette recette étaient réels. Les projets et les destinations se trouvaient tous dans un dossier temporaire.

L’ordre des fenêtres et le focus natif ont été mesurés sur le témoin Win32 avec les vrais sélecteurs. L’environnement refusait l’injection de frappes au niveau du bureau. Les caractères et Échap du test ont été adressés au contrôle qui détenait déjà le focus. Le lancement de secours par Windows PowerShell 5.1 a également été refusé par sa politique d’exécution. La validation humaine à faire est le premier clic, la frappe immédiate et le retour à Chrome sur CODEX_VM, avec la recette en tête du rapport.

## Fichiers livrés

| Fichier | Changement |
| --- | --- |
| `extractions/anonymiseur/choisir.ps1` | Propriété et activation des deux dialogues, puis retour à la fenêtre de départ. |
| `extractions/anonymiseur/ui/local.js` | Reprise au clavier du choix de vidéo après annulation. |
| `extractions/anonymiseur/atelier.js`, `extractions/anonymiseur/README.md` | Passage de l’extraction de **0.1.0** à **0.1.1** pour ce correctif. |
| `reports/246_dialogues_windows_premier_plan_report.md` | Recette, mesures et limites de validation. |

Commit prévu sur `atelier-anonymisation` — `fix(anonymiseur): rendre le focus aux dialogues Windows et à l’atelier`.

