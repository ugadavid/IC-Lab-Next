# Mission 239 — Ouvrir le nouvel atelier depuis la vidéothèque

## Essai sur CODEX_VM

1. Ouvrir PowerShell dans `C:\Users\codex\Documents\Projets\IC-Lab-Next`. Le clone observé était sur `main`, avec le rapport 238 en fichier non suivi. Les commandes ci-dessous mettent à l’abri cette copie si elle est encore présente, puis récupèrent la branche de l’atelier. Le rapport 238 est déjà publié sur cette branche.

   ```powershell
   git status --short --branch
   git fetch origin
   if ($LASTEXITCODE -ne 0) { throw "Récupération de la branche impossible." }
   $rapport = 'reports/238_etude_raccordement_atelier_proto05_report.md'
   if (git ls-files --others --exclude-standard -- $rapport) {
       git stash push --include-untracked -m "Copie locale du rapport 238 avant essai 239" -- $rapport
       if ($LASTEXITCODE -ne 0) { throw "La mise à l’abri du rapport a échoué." }
   }
   git switch atelier-anonymisation
   if ($LASTEXITCODE -eq 0) { git pull --ff-only origin atelier-anonymisation }
   ```

2. Relancer le labo avec le lanceur habituel, hors d’une préparation en cours. Vérifier que le champ `version` de [la santé de Proto05](http://127.0.0.1:8791/api/health) vaut **0.1.64**. Si l’ancienne version est encore en mémoire, utiliser `STOP_IC_LAB_NEXT.bat` puis `START_IC_LAB_NEXT.bat`.
3. Ouvrir [la vidéothèque](http://127.0.0.1:8791/teacher/videos). Sur une carte de démonstration, cliquer sur **Anonymiser**. Le titre de la vidéo apparaît dans l’atelier. S’il y a plusieurs versions, en choisir une. Pour une copie locale prête, appuyer sur **Lecture** puis sur **F5** et vérifier le titre et la version.
4. Essayer une version distante sans copie prête. Pendant « Téléchargement de la vidéo en cours… », appuyer sur **F5**. La sélection reste dans l’adresse, la préparation continue, puis le lecteur apparaît. Pour vérifier l’unicité, ouvrir deux fois la même adresse pendant l’attente et comparer, dans l’onglet **Réseau** des outils du navigateur, l’identifiant des requêtes de suivi. Deux versions distantes distinctes doivent avoir des identifiants distincts.
5. Revenir à **la même carte**. Ouvrir **Voir la fiche → Anonymiser l’image** sur la version locale et lancer la lecture dans l’ancien éditeur. Sur une carte HLS qui propose **Préparer pour anonymisation**, attendre la fin de cette préparation avant d’ouvrir **Éditer les masques**. Cette recette s’arrête à la lecture.

## Du clic au lecteur

La carte ouvre immédiatement `/teacher/videos/:assetId/anonymiser`. L’atelier détermine les versions disponibles. S’il en reste plusieurs après rapprochement d’un original distant et de sa copie de travail identifiée, il demande laquelle ouvrir. La version choisie figure dans l’adresse sous `?playableId=…`. La fiche donne aussi accès au nouvel atelier pour une version précise, à côté des commandes historiques.

Le serveur vérifie que la version appartient à la vidéo et en déduit la source. Il sert directement un fichier local disponible. Pour une version distante, il peut rejoindre son téléchargement de bibliothèque, retrouver sa copie locale par provenance ou rejoindre sa préparation FFmpeg. Si la préparation manque, le serveur la crée une seule fois pour cette vidéo, cette version et cette source. Deux accès simultanés partagent le travail. Le téléchargement de bibliothèque suit ensuite l’identifiant de la copie effectivement produite.

L’atelier affiche les étapes connues du serveur et le pourcentage uniquement lorsqu’il est disponible pour le téléchargement suivi. Il bascule sur le lecteur dès que le fichier est prêt. Un échec affiche la cause et **Réessayer**. Si le navigateur refuse un fichier local, **Réessayer** demande une préparation FFmpeg. Un remux peut corriger le conteneur mais conserve les codecs.

## Recette exécutée

Les essais ont utilisé une vidéo synthétique de trois secondes et des copies temporaires. Le serveur et le navigateur ont été contrôlés séparément. Pour le scénario distant, la playlist HLS, les segments et le MP4 étaient des fichiers de test. Le transport réseau et les réponses de la bibliothèque ont été simulés.

| Essai | Résultat observé |
| --- | --- |
| Carte de démonstration → nouvel atelier, version locale | Choix dans l’atelier, lecture décodée dans Edge. Le serveur livre le fichier local sans lancer FFmpeg. Empreinte du média identique après l’essai. |
| HLS, deux activations rapprochées et F5 | Le navigateur conserve la version après rechargement et passe de l’attente à la lecture. Côté serveur, deux demandes concurrentes rendent le même identifiant et déclenchent un seul FFmpeg. Le MP4 produit a été vérifié par FFprobe et lu dans Edge. |
| Deux versions distantes du même asset | Le serveur crée deux préparations distinctes. La version HLS et la version par URL directe conservent chacune leur identité. |
| Téléchargement de bibliothèque déjà en cours | L’atelier affiche les 42 % fournis par la fixture puis ouvre la bonne copie. Le serveur ne rattache pas le téléchargement d’une autre version. |
| Échec, nouvelle tentative, expiration | Une entrée HLS introuvable fait échouer FFmpeg. Après rétablissement du média, une nouvelle préparation aboutit. L’interface expose la cause et son bouton de reprise permet la lecture. Une préparation expirée peut également être recréée. |
| Ancien parcours depuis la même carte | **Voir la fiche → Anonymiser l’image** ouvre l’ancien éditeur. La vidéo locale y est lisible. **Préparer pour anonymisation → Éditer les masques** ouvre aussi l’ancien lecteur une fois la préparation HLS terminée. Lors d’un premier essai, le bouton historique était accessible trop tôt : l’ancien éditeur demandait alors d’attendre la fin de la préparation. |

Le contrôle visuel dans Edge Chromium à **1280 × 800** a porté sur la page d’attente. Le titre, la version, les liens de retour et le message sont lisibles, sans chevauchement visible. Les essais de lecture ont vérifié que le temps du lecteur avançait.

`node --check` réussit sur le serveur. Neuf tests existants ciblés passent (huit sur la disponibilité des médias, un sur la publication atomique d’un téléchargement). Les contrôles des routes ont aussi vérifié l’ouverture des pages et le rejet d’un couple vidéo/version incohérent.

## Fichiers, versions et suite

- [Vidéothèque](../prototypes/05-augmented-ic-video-01/teacher-videos.html), [fiche vidéo](../prototypes/05-augmented-ic-video-01/teacher-video-detail.html) et [nouvel atelier](../prototypes/05-augmented-ic-video-01/teacher-video-workshop.html) pour les deux entrées et la lecture. La version affichée sur la fiche passe de **0.1.58 à 0.1.59**.
- [Serveur Proto05](../prototypes/05-augmented-ic-video-01/server/server.js) et [package](../prototypes/05-augmented-ic-video-01/server/package.json) pour la route et la reprise de préparation. La version du serveur passe de **0.1.63 à 0.1.64** pour ce premier lot.
- [README du serveur](../prototypes/05-augmented-ic-video-01/server/README.md), [documentation du moteur](../prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md) et présent rapport. [Brief 239](../missions/239_entree_atelier_anonymisation.md) · [Étude 238](238_etude_raccordement_atelier_proto05_report.md).

F5 rejoint la préparation tant que le processus Proto05 la conserve. Un redémarrage du serveur perd les tâches en mémoire. Les sorties temporaires terminées expirent selon la durée configurée (30 minutes par défaut). La lecture sur les médias de la VM, l’accès au fournisseur distant réel et les tests d’intégration MariaDB restent à valider. Les essais isolés n’ont écrit ni dans la base du labo ni dans ses originaux, ses dérivés ou leurs associations.

La prochaine décision revient à David après la recette. La timeline image et son et l’export combiné relèvent des lots suivants.

Message de commit proposé : `feat(proto05): ouvrir l’atelier d’anonymisation depuis la vidéothèque`.
