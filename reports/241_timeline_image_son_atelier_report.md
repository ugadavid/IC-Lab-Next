# Mission 241 — Monter et prévisualiser l’image et le son dans Proto05

## Essai de cinq minutes sur CODEX_VM

1. Lancer le labo comme d’habitude et ouvrir la [vidéothèque](http://127.0.0.1:8791/teacher/videos). Cliquer sur **Anonymiser** sur une carte contenant un visage et du son. Choisir la version si l’atelier le propose. Dès que la vidéo est lisible, les deux pistes apparaissent. [La santé de Proto05](http://127.0.0.1:8791/api/health) indique la version **0.1.66** après relance.
2. Placer le curseur à **1 s**, appuyer sur **M** et régler la fin à **3 s**. Glisser le cadre sur le visage et tirer son coin inférieur droit pour le redimensionner. Le cadre focalisé, les flèches le déplacent d’un pixel de la vidéo ; **Maj + flèche** règle sa taille.
3. Avancer à **2 s**, appuyer sur **S**, garder **Couper le son** et régler la fin à **4 s**. Sélectionner ce passage sonore, activer l’aperçu avec le bouton en forme d’œil, puis appuyer sur **B**. La boucle ajoute une seconde de contexte de chaque côté. Le visage doit se flouter avant la coupure ; à 3 s l’image redevient nette, à 4 s le son revient.
4. Appuyer de nouveau sur **B** pour arrêter la boucle. Utiliser **+** pour zoomer. Glisser le milieu d’un passage pour le déplacer, l’une de ses poignées pour ajuster une borne. Les **Aimants** facilitent l’alignement ; maintenir **Alt** les suspend pendant le geste. **?** ouvre la liste des raccourcis.
5. Après un déplacement, faire **Ctrl+Z**, placer le curseur à un repère, puis **F5** et **Ctrl+Y**. Le passage doit reprendre sa position modifiée. Ouvrir une autre version, puis revenir à la première. Chacune retrouve ses propres pistes. **Ctrl+S** enregistre aussi un fichier projet avec l’historique.

## Fonctionnement livré

L’entrée 239 suit toujours la préparation sur place et propose **Réessayer** en cas d’échec. Elle monte l’interface issue de la V12 sur la vidéo décodée. Le lecteur donne la durée, les dimensions et le temps courant. Le même temps pilote les pistes **Image** et **Son**, les masques, la coupure, le bip et la boucle. Les intervalles incluent le début et excluent la fin. En cas de passages sonores superposés, l’aperçu applique le dernier passage actif dans l’ordre du projet, comme dans la V12.

Le canevas dessine le flou uniquement dans les rectangles actifs. Ils sont rapportés aux pixels de l’image utile. Le cadre et le rendu restent ainsi placés sur le même sujet dans une vidéo 4:3 affichée dans une scène 16:9 et lorsque la disposition change. Les boutons de disposition conservent le choix de largeur et de position des outils. Au premier accès sur un écran de bureau, la largeur initiale du lecteur tient compte de la place nécessaire aux deux pistes.

La reprise automatique est locale au navigateur et liée au couple **vidéo du catalogue / version choisie**. L’adresse garde ce couple lorsque le serveur livre une copie locale ou renouvelle le job. Le projet conserve notamment passages, sélection, curseur, zoom, position de la fenêtre de timeline et piles annuler/rétablir. Le JSON enregistré peut être rouvert sur la même version. L’import manuel d’un projet V12 autonome vérifie le média et convertit ses coordonnées de scène en coordonnées vidéo. Un fichier d’un autre montage est signalé avant remplacement.

## Contrôles réalisés

Média jetable de six secondes, mire contrastée 320 × 240 à 25 images/s et tonalité continue de 440 Hz. Le serveur de préparation a lu une playlist HLS de test et appelé les vrais FFmpeg et FFprobe. Il a produit un MP4 H.264/AAC de 6,037 s. Edge Chromium 158 a décodé ce fichier dans l’atelier. Le transport distant et les réponses du catalogue étaient simulés ; les gestes d’interface ont été pilotés dans le navigateur.

| Essai | Observation |
| --- | --- |
| Carte → Anonymiser, préparation en cours et rechargement | L’attente s’affiche. L’atelier s’ouvre automatiquement sur les pistes vides de la version demandée, avec la durée du média décodé. |
| Flou de 1 à 3 s et silence de 2 à 4 s | Les pixels du masque diffèrent de l’image source, la surcouche reste transparente hors masque. En lecture, le niveau efficace du son mesuré dans Edge passe de **0,0883** à **0,0000**, puis à **0,0889**. Après déplacement du curseur à 3 s le flou est absent et le son coupé ; à 4 s le son original est rétabli. |
| Bandes latérales et disposition | Le média occupe les trois quarts de la largeur de la scène. Le clavier déplace le masque d’un pixel source. Après passage des outils à gauche et redimensionnement du lecteur, sa position relative à l’image reste identique. Vérification visuelle à **1280 × 800** de l’attente et du montage avec le cadre, les deux pistes et leurs commandes. |
| Montage et historique | Ajout par M/S, glissement, poignée de fin, zoom ×2, découpe, saisie d’une durée au centième, menu du pas et retour de boucle contrôlés. Un déplacement a été annulé, le document rechargé, puis le déplacement rétabli avec Ctrl+Y. Un autre rechargement avec un nouvel identifiant de job a retrouvé le curseur à **2,71 s**, le zoom et l’historique. |
| Projets et versions | Aller-retour d’un JSON avec les deux piles. L’import V12 de l’exemple 4:3 du rapport 238 convertit correctement `x=.3125, w=.1875` en `x=.25, w=.25`. Autre version et autre vidéo ouvertes avec des pistes vides ; le projet étranger est refusé. Retour à la première version avec ses passages, y compris si elle est désormais servie via une copie locale. |
| Ancien éditeur | Depuis la même carte, **Voir la fiche → Anonymiser l’image** mène à l’ancien éditeur et la vidéo y avance en lecture. |
| Contrôles du serveur et du code | Routes de l’atelier et de l’ancien éditeur, lecture locale directe, préparation HLS, reprise du job et nouvelle tentative après échec exercées en isolation. Vérification syntaxique Node du serveur et du script de timeline. |

**Validation humaine.** David a confirmé sur le catalogue de CODEX_VM l’ouverture et la lecture après la mission 240. L’aperçu monté de la mission 241 reste à essayer sur ce catalogue. La recette automatisée n’a utilisé aucune donnée réelle du labo. La boîte de dialogue native d’enregistrement et l’écoute sur les haut-parleurs de la VM restent à vérifier. L’export vidéo combiné relève du lot suivant.

## Fichiers et version

- [Page de l’atelier](../prototypes/05-augmented-ic-video-01/teacher-video-workshop.html), [timeline et projets](../prototypes/05-augmented-ic-video-01/shared/workshop-timeline.js), [styles](../prototypes/05-augmented-ic-video-01/shared/workshop-timeline.css).
- [Serveur](../prototypes/05-augmented-ic-video-01/server/server.js), [package](../prototypes/05-augmented-ic-video-01/server/package.json), [guide du serveur](../prototypes/05-augmented-ic-video-01/server/README.md) et [repère de version du moteur](../prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md). Le lot fait passer Proto05 de **0.1.65 à 0.1.66**. La maquette V12 reste la référence autonome.
- Le présent rapport accompagne la [mission 241](../missions/241_timeline_image_son_atelier.md) et reprend les [cas de conversion de l’étude 238](238_etude_raccordement_atelier_proto05_report.md).

Message de commit proposé — `feat(proto05): raccorder la timeline image et son à la vidéothèque`.
