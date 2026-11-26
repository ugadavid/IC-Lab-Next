# Mission 238 — Étudier le raccordement de l’atelier image et son à Proto05

## Débrief du 26 novembre 2026

Les missions 235 à 237 ont documenté le déménagement de ZI vers CODEX_VM. David a validé la lecture d’un média local et le redémarrage du labo. Le clone de la VM a ensuite été resynchronisé avec main. En reprenant l’ancien atelier, David a rencontré un échec de préparation lié au lancement de FFmpeg, puis un diagnostic FFprobe peu explicite. La préparation a finalement abouti. Cette expérience a motivé la refonte du parcours.

David et GPT ont ensuite itéré sur douze maquettes HTML autonomes, essayées dans Chrome. Lire la [V12](../prototypes/05-augmented-ic-video-01/maquettes/atelier-anonymisation/Atelier-anonymisation-v12.html) et sa [note de parcours](../prototypes/05-augmented-ic-video-01/maquettes/atelier-anonymisation/README.md), déposées sur cette branche au commit dc19259. Elles fixent la référence ergonomique.

- Un lecteur commun, deux pistes image et son. Masques manuels déplaçables et redimensionnables, compteur pour les superpositions exactes, passages sonores, scission et bornes temporelles.
- Timeline manipulable, pas partagé, saisie de durée au centième, raccourcis, aimants facultatifs, boucle de contrôle avec contexte, annuler/rétablir et zoom. La sensibilité des aimants reste à affiner ultérieurement.
- Projet JSON, récupération automatique, reprise du curseur, de la sélection et de l’historique, réassociation du média local. Interface compacte à pictogrammes, infobulles, largeur du lecteur et disposition des outils réglables.
- La V12 produit un aperçu dans le navigateur. Proto05 possède déjà des traitements réels pour l’image et le son. Le premier objectif est leur utilisation dans le site. L’application de bureau envisagée pour Christian viendra ultérieurement.

## Question à instruire

Quel premier raccordement simple permettrait de cliquer **Anonymiser** sur la carte, d’entrer immédiatement dans l’atelier de cette vidéo et d’y suivre sa préparation, en réutilisant l’existant ?

1. Suivre le parcours actuel depuis la carte et la fiche. Identifier les routes, identifiants média, préparations, copies de travail, états réellement exposés et moteurs image/son. Citer les fichiers et fonctions utiles.
2. Proposer le déroulé pour un média local, une source distante, une préparation déjà prête ou en cours, et un échec récupérable. Préciser comment retrouver le bon travail au retour dans la page et où présenter la progression fiable, la cause et la relance.
3. Examiner un exemple concret de correspondance entre V12 et moteurs existants : un masque sur un intervalle et un traitement sonore sur un autre, sur le même média. Relever les écarts de coordonnées, de temps, d’effets, de sauvegarde et d’export combiné qui comptent réellement. Distinguer ce que le code confirme des hypothèses à tester.
4. Recommander un premier petit lot réversible, son test d’acceptation et les éventuelles décisions qui appartiennent à David.

## Livraison et arrêt

Étude documentaire sur la branche atelier-anonymisation. Lire AGENTS.md et les documents pertinents. Seul livrable : reports/238_etude_raccordement_atelier_proto05_report.md, même si le constat est partiel. Commencer par la recommandation en quelques lignes. Garder le labo de la VM disponible ; une copie de travail séparée convient si besoin. L’implémentation, la modification de la V12, les opérations sur les données et la fusion vers main sont hors périmètre.

Faire un commit contenant uniquement le rapport, puis le pousser sur origin/atelier-anonymisation. Vérifier le SHA distant et la lisibilité du rapport. Transmettre le lien et le SHA vérifié, puis s’arrêter pour notre lecture.
