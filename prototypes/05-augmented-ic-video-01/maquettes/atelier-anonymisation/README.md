# Atelier d’anonymisation de Proto05

La [maquette V12](Atelier-anonymisation-v12.html), essayée avec David le 26 novembre 2026, sert de référence pour l’atelier commun image et son. Télécharger le HTML et l’ouvrir dans Chrome pour essayer la démo autonome.

## Parcours à intégrer

Depuis la carte d’une vidéo, **Anonymiser** ouvre immédiatement son atelier. Le titre apparaît dès l’arrivée. L’atelier prend en charge la préparation en arrière-plan et affiche son état sur le lecteur de cette vidéo.

| Situation | Affichage prévu |
|---|---|
| Une copie de travail compatible est prête | Ouvrir directement le lecteur et les outils. |
| La source doit être récupérée en ligne | « Téléchargement de la vidéo en cours… » |
| Une préparation est nécessaire | « Préparation de la copie de travail… » |
| La vidéo devient prête | Retirer la surcouche automatiquement et permettre le montage image et son. |
| Une étape échoue | Expliquer la cause à cet endroit et proposer le geste utile, par exemple indiquer le chemin de FFmpeg puis réessayer. |

Afficher les étapes réellement nécessaires et observables. Une source locale peut demander une préparation. Si le serveur ne distingue pas encore téléchargement et conversion, utiliser le libellé général jusqu’à ce qu’il expose cette distinction. Un retour dans l’atelier doit pouvoir rejoindre le traitement en cours.

## Point de raccordement

Dans [teacher-video-detail.html](../../teacher-video-detail.html), `workshop(id, mode)` envoie les identifiants de la vidéo, de la ressource lisible et de la source à `POST /api/proto05/library/hls-preparations`. La fiche interroge le job et attend `completed` avant de naviguer vers l’éditeur image ou son. Le nouveau parcours ouvrira d’abord l’atelier avec le contexte de la vidéo et y suivra le travail existant. Prévoir un essai local, un essai distant et un échec de préparation lors du raccordement.

Ce premier dépôt conserve la V12 autonome et le parcours cible. Le branchement au moteur reste à réaliser.
