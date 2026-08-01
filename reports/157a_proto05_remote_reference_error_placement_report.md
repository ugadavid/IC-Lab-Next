# Mission 157A — Replacer le message d’échec d’une référence distante

Date : 1er août 2026

Prototype : Proto05

Version : `0.1.50`, inchangée

## Périmètre

Retouche graphique limitée au parcours « Ajouter depuis une URL » de la
vidéothèque. La cause de l’échec d’enregistrement n’a pas été diagnostiquée ni
corrigée. Aucun contrat média, code serveur, schéma, procédure ou donnée
MariaDB n’a été modifié.

## Modification

Dans `teacher-videos.html`, le panneau « Analyse terminée » contient désormais
un unique encart local `role="alert"`, placé après les informations détectées et
avant les boutons « Confirmer l’ajout » et « Modifier ».

Lors d’une confirmation :

- l’ancien contenu d’erreur est effacé avant la tentative ;
- un échec réactive le bouton et affiche le message dans l’encart local ;
- la barre générale supérieure est vidée de ce message local ;
- le panneau, l’URL, le titre éventuel et les informations analysées restent en
  place ;
- « Modifier » puis une nouvelle analyse reconstruit le panneau avec un encart
  vide et masqué ;
- les chemins de réussite existants continuent d’appeler
  `resetRemoteReference()`, qui retire le panneau et son éventuelle erreur.

Message affiché :

> Impossible d’enregistrer cette référence distante. Vous pouvez réessayer ou modifier l’URL.

## Vérifications

Recette réelle avec l’URL UGA fournie :

- analyse réussie : HLS maître, domaine, URL finale et format conservés ;
- enregistrement toujours en échec, conformément au périmètre de 157A ;
- encart visible dans le panneau bleu, avant les actions ;
- URL conservée intégralement ;
- barre générale vide après l’échec ;
- bouton de confirmation de nouveau disponible ;
- deuxième tentative : toujours un seul encart, sans empilement ;
- « Modifier » puis réanalyse : encart présent une fois, vide et masqué ;
- affichage ordinateur contrôlé ;
- affichage mobile contrôlé à 390 × 844 : encart lisible, largeur contenue et
  aucun débordement horizontal ;
- aucune nouvelle erreur console.

Contrôles automatisés :

- `video-workspaces.test.js` : 8/8 ;
- `teacher-ui-navigation.test.js` : 10/10 ;
- syntaxe Node des fichiers directement concernés : réussie ;
- `git diff --check` : réussi.

La suite complète n’a pas été lancée : la modification est limitée à un bloc
HTML/CSS/JavaScript local, couvert par le test ciblé, la suite de navigation et
la recette visuelle réelle demandée.

## Fichiers

- modifié : `prototypes/05-augmented-ic-video-01/teacher-videos.html` ;
- modifié : `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js` ;
- créé : `reports/157a_proto05_remote_reference_error_placement_report.md`.

## État Git

La Mission 156 était commitée avant cette intervention. Le fichier non suivi
`temp.txt`, déjà présent au départ et étranger à la mission, a été préservé.
Aucun commit ni push n’a été effectué.

Message de commit proposé :

```text
fix(proto05): afficher localement l’échec d’une référence distante
```
