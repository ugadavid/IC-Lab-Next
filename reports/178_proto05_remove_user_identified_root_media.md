# Mission 178 — Suppression des trois médias racine identifiés de Proto05

Date : 2026-08-01  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version : `0.1.60` (inchangée)

## Décision explicite de David

David a identifié et autorisé la suppression définitive, sans copie ni archive, des trois fichiers suivants :

- `audio-1.mp3` : enregistrement audio source ayant servi à produire la transcription initiale ;
- `video-1.pdf` : transcription initiale utilisée au commencement du travail ;
- `videoframe_10238.png` : vignette créée uniquement pour montrer à ChatGPT l'apparence des vidéos.

David confirme qu'ils n'ont plus de valeur opérationnelle, pédagogique, probatoire ou documentaire pour Proto05. Cette autorisation ne couvre aucun autre candidat de la Mission 177.

## Témoins avant suppression

| Chemin relatif exact | Taille | Git | SHA-256 |
|---|---:|---|---|
| `audio-1.mp3` | 3 803 549 octets | suivi | `42565df2f48ac85e5db1709700f4a567b5d4005329cd1605caf0635aaba2742a` |
| `video-1.pdf` | 43 607 octets | suivi | `b741e984f38cca6bf6c0f8bcea1947136978ce6263ed2683414000662055f579` |
| `videoframe_10238.png` | 1 465 122 octets | suivi | `f37bd0ce84be59d6ee23114b71316f96622b24d18cb192e886f2dcc4fd685a77` |

## Recherche de consommateurs

Les recherches ont porté sur les trois basenames et chemins dans tout Proto05, puis sur les conventions dynamiques : `ROOT_DIR`, `INDEX_FILE`, `path.join`, `path.resolve`, `readFile`, `readdir`, extensions média, racines `data/video-library-media` et `data/video-library-workspaces`.

Résultat :

- aucun import ou chargement explicite ;
- aucune route nommée ;
- aucun repository ou adaptateur MariaDB ;
- aucune fixture ou test ;
- aucun script ;
- aucune référence dans une documentation opérationnelle de Proto05 ;
- aucune référence statique dans l'ancien catalogue conservé, les fixtures ou les surfaces HTML/JS ;
- aucun mécanisme de Media Library ne parcourt la racine du prototype : les médias gérés sont résolus exclusivement sous les deux racines `data/` dédiées.

Une nuance a été vérifiée : la desserte statique générique de `server.js` pouvait retourner n'importe quel fichier racine lorsqu'un client connaissait directement son URL. Aucun contrat, route déclarée ou consommateur ne sélectionnait ces trois noms. Cette accessibilité passive disparaît avec leur absence physique et ne constituait pas un usage fonctionnel.

Deux références historiques hors Proto05 subsistent volontairement : le rapport 119 mentionne `video-1.pdf` comme témoin ancien et le rapport 177 inventorie les trois fichiers. Elles ne sont ni opérationnelles ni réécrites, conformément à la mission.

## Suppression effectuée

Exactement ces trois fichiers ont été supprimés :

- `prototypes/05-augmented-ic-video-01/audio-1.mp3` ;
- `prototypes/05-augmented-ic-video-01/video-1.pdf` ;
- `prototypes/05-augmented-ic-video-01/videoframe_10238.png`.

Les trois chemins sont absents après suppression. Aucune copie, sauvegarde ou archive n'a été créée.

## Préservation des autres candidats

Les 63 autres candidats de la Mission 177 ont été hashés avant et après suppression selon la liste déterministe `chemin<TAB>sha256`. Leur empreinte est restée identique :

`f1fccdb4cb49681b03f6925a5f1692962b1baf580404e1c3e441b68e59883c0f`

Sont notamment préservés sans modification :

- `data/backups/mission-102-video-library-0.1.json` ;
- toutes les sauvegardes de registre, schéma et procédures ;
- les trois fixtures actuelles ;
- les migrations techniques et manifestes 001–006 ;
- les repositories et adaptateurs MariaDB ;
- les modules de mapping, projection, disponibilité, schéma et migration ;
- les anciens moteurs HTML et les rapports historiques ;
- tous les médias gérés sous les répertoires Media Library.

## Contrôles exécutés

- existence physique après suppression : **trois fichiers absents** ;
- recherche active dans Proto05 après suppression : **zéro référence aux trois noms** ;
- isolation runtime, contrat Library, disponibilité et projection : **72/72 réussis** ;
- contrôles statiques vidéothèque, Library et suppression : **9/9 réussis** ;
- chargement non destructif des migrations : exactement **001,002,003,004,005,006** ;
- empreinte des 63 autres candidats : identique avant/après ;
- `git diff --check` : réussi.

## Contrôles non exécutés

Aucun serveur, aucune interface, aucune connexion MariaDB et aucune migration réelle n'ont été lancés. La base n'a donc pas été interrogée ; l'absence d'entrée Media Library repose sur la preuve statique, les racines de stockage strictes déjà testées, l'inventaire 177 commité et la décision factuelle fournie par David.

## État Git final

- trois suppressions suivies, exactement celles autorisées ;
- un rapport nouveau ;
- aucun autre fichier modifié, déplacé ou supprimé ;
- aucun commit ni push.

## Message de commit proposé

`chore(proto05): remove obsolete user-identified root media`
