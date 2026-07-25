# Mission 115 — Fiches compactes et résumé de lignée

## Périmètre et hiérarchie retenue

La mission réorganise uniquement la présentation de `teacher-videos.html`.
Aucun modèle, rôle, writer, catalogue, média, workspace, traitement ou activité
n’a été modifié.

La fiche fermée conserve :

- vignette, titre, type et provider ;
- source utile résumée par son hôte ou « Fichier local » ;
- durée lorsqu’elle est connue ;
- disponibilité ;
- usages existants, tags et classement ;
- résumé de lignée sans identifiant technique ni compte nul inutile ;
- actions principales existantes et menu Actions fermé.

Les anciennes empreintes, tailles brutes, URLs complètes et identifiants de
playable ne sont plus injectés dans la fiche compacte.

## Résumé et infobulle

Le bouton de lignée affiche, selon les données :

- `1 originale · 1 copie · 2 dérivations` pour la fiche réelle `yop` ;
- les versions publiées seulement lorsqu’elles existent ;
- `1 accès existant` pour une fiche historique non encore qualifiée.

Son panneau global réutilise le rendu et le calcul de position borné du panneau
d’usages. Il indique :

- originale distante disponible ou absente ;
- copie locale de travail disponible ou absente ;
- nombre de dérivations ;
- nombre de versions publiées ;
- autres accès existants lorsque nécessaire ;
- noms ou dates des dérivations, dans une liste courte.

Il s’ouvre au clic, reçoit le focus, se ferme par nouvelle activation, Échap,
bouton de fermeture ou clic extérieur, et reste borné dans la fenêtre.

## Accès temporaire aux détails

« Gérer les versions » révèle le bloc existant « Versions et accès » uniquement
pour la carte choisie. Ce bloc est `hidden` par défaut et possède une commande
« Refermer ». En liste, il occupe toute la largeur utile de la carte. Les
lecteurs et actions par version restent inchangés et n’apparaissent qu’après
une action volontaire.

La future page de gestion pleine largeur, le redessin détaillé de la lignée et
la requalification des accès historiques restent volontairement reportés.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `reports/115_proto05_compact_video_library_cards.md`

## Vérifications

### Tests automatisés

- `node --test test/video-workspaces.test.js` : 5/5 réussis.
- Deux assertions ciblées ajoutées : détail fermé par défaut et présence du
  résumé compact.
- `npm run check` : réussi.
- `git diff --check` : réussi, hors avertissements CRLF.
- La suite complète n’a pas été lancée, conformément au périmètre UX.

### Recette Chromium réelle

Recette effectuée sur `http://127.0.0.1:8891/teacher/videos`, fenêtre
1280 × 720, avec les 16 fiches et les données existantes :

- grille compacte au chargement, détails et lecteurs tous fermés ;
- largeur maximale de carte de 400 px, sans agrandissement démesuré lors d’un
  filtrage à une seule fiche ;
- liste compacte au chargement, lignes observées entre environ 221 et 252 px ;
- fiche `yop` : résumé exact `1 originale · 1 copie · 2 dérivations` ;
- panneau de lignée entièrement visible au centre et près du bord droit ;
- fermeture vérifiée par Échap, clic extérieur et nouvelle activation ;
- ouverture du détail de `yop` seule : 937 px utiles sur une carte de 971 px ;
- fermeture du détail : aucun détail restant ouvert ;
- aperçu de l’originale HLS : durée 391,816698 s, `readyState=4` ;
- aperçu de la copie : durée 391,837667 s, `readyState=4` ;
- aperçus indépendants des deux dérivations : durée 391,816667 s chacune,
  `readyState=4` ;
- aucun des quatre lecteurs ne signale d’erreur média ;
- les deux liens « Récupérer sur mon disque » sont présents et leurs routes
  répondent `200 video/mp4`, avec `Accept-Ranges: bytes` ;
- menus Actions fermés par défaut ;
- console Chromium vide.

Aucun téléchargement, writer, déplacement, suppression ou traitement réel n’a
été déclenché.

## Version, Git et remise

Version obtenue : `0.1.38`.

État Git avant remise : branche `main`, en avance de 27 commits locaux sur
`origin/main`, cinq fichiers suivis modifiés par la mission et ce rapport
nouveau. Aucun autre changement n’est présent.

Validation humaine : à effectuer par David sur l’instance unique laissée sur
le port 8891.

Message de commit proposé :

`feat(proto05): compact library cards with lineage summaries`

Aucun commit ni push effectué.
