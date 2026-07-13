# Rapport — Prototype 05 : atelier enseignant guidé

Date : 13 juillet 2026  
Version : **0.1.3**

## Nouvelle route

`/teacher/guided/:activityId` ouvre un espace guidé séparé. L’atelier avancé
`/teacher/author/:activityId` reste inchangé et accessible depuis le guidé.
La vue étudiant et la prévisualisation continuent d’utiliser le même moteur
partagé et le même identifiant d’activité.

## Fonctionnement

La page guidée charge l’activité via les API existantes, affiche un aperçu
étudiant, les métadonnées, les moments de transcription, les intervalles
linguistiques, les phénomènes et les cartes de visibilité des couches. Les
éléments sont sélectionnables et déplacent la prévisualisation vers leur
position. Le panneau de moment permet d’ajouter une note pédagogique ou une
question, sauvegardée par l’endpoint auteur existant.

Le vocabulaire visible est orienté enseignant : « Moment sélectionné »,
« Langue entendue », « Phénomène d’intercompréhension », « Note pédagogique »,
« Question pour les étudiants », « Ce que verront les étudiants » et
« Enregistrer ». Les identifiants et millisecondes restent dans les données mais
ne sont pas exposés dans l’interface courante.

## Réutilisation et limites

Le guidé réutilise le serveur 05, les routes API, les validations, la sauvegarde
atomique et le moteur étudiant via la prévisualisation. Il ne crée pas de second
modèle métier ni de second lecteur. L’atelier avancé demeure la référence pour
les opérations techniques complètes.

La première version ne remplace pas encore tous les contrôles fins de l’atelier
avancé : pour une édition détaillée d’un segment, d’une couche ou d’un phénomène,
le bouton « Ajouter un moment ici » conduit au mode avancé avec le contexte de
l’activité conservé.

## Vérifications

- route historique `/teacher/guided/proto05-augmented-video-01` : `200` ;
- activité chargée : 11 segments, 22 intervalles, 26 phénomènes, 7 couches ;
- lien vers prévisualisation et mode avancé généré avec l’identifiant courant ;
- parsing JavaScript des pages guidée et avancée ;
- `npm run check` réussi ;
- `git diff --check` réussi ;
- aucune modification du modèle JSON, du proxy HLS, du launcher ou de la
  bibliothèque.

## Prochaines étapes UX

Ajouter une vraie sélection vidéo dans le guidé, une lecture directement intégrée
au lieu de l’iframe, et des formulaires pédagogiques pour créer un moment sans
ouvrir le mode avancé, tout en conservant les validations et la persistance
existantes.

Message de commit proposé :

`feat(prototype-05): add guided teacher workspace`
