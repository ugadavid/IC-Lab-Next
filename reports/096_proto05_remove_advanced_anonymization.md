# Mission 096 — Retrait de l’ancien atelier avancé Proto05

## Cartographie

L’ancien atelier était une surface autonome et non partagée :

- page : `teacher-anonymization-advanced.html` ;
- route : `/teacher/anonymization-advanced/:jobId` ;
- accès Library : bouton « Ouvrir l’atelier avancé » ajouté dynamiquement dans
  `teacher-videos.html` ;
- couverture spécifique : un sous-test de `server/test/hls-preparation.test.js`
  et la copie de la page dans le serveur temporaire de test.

La page utilisait les routes de préparation et de dérivation Proto05, mais ces
routes et leurs validateurs sont également consommés par l’atelier guidé ou par
la compatibilité des préparations. Ils ont donc été conservés. Les fonctions
`temporalMaskConfiguration`, `temporalStepConfiguration`, les collections par
étape, la validation vidéo, le pipeline local et les dérivations n’ont pas été
supprimés.

La route générale `/teacher/author/:activityId` n’a pas été touchée.

## Retrait effectué

- suppression de `teacher-anonymization-advanced.html` ;
- suppression de la route HTTP dédiée ; l’ancienne URL répond maintenant 404 ;
- suppression du bouton et de la logique de navigation correspondants dans la
  Library ;
- retrait de la page morte du serveur temporaire de test ;
- retrait du test qui vérifiait le comportement interne de l’ancien atelier ;
- adaptation du test HLS pour vérifier explicitement le 404 de l’ancienne URL ;
- correction d’un libellé de recette devenu ambigu (« atelier guidé »).

Aucune donnée d’activité, vidéo, masque, préparation ou dérivé n’a été
modifiée.

La seule occurrence de `anonymization-advanced` restante hors rapports est
l’URL utilisée par le test de non-exposition. Elle est intentionnelle et sert à
prouver le comportement 404 ; ce n’est pas un lien de navigation orphelin.

## Documentation et version

`ROADMAP.md` indique désormais que l’atelier guidé est l’unique atelier canonique
d’anonymisation, tout en distinguant l’espace général d’auteur avancé.

La suppression d’une surface fonctionnelle justifie un seul incrément :
**0.1.31** dans `server/package.json`, `server.js`, le healthcheck et la
documentation du moteur.

## Vérifications

- tests ciblés HLS/anonymisation : **8/8** ;
- suite complète `npm.cmd test` : **102/102**, aucun échec, aucun test ignoré ;
- `npm.cmd run check` : réussi ;
- `git diff --check` : réussi ;
- healthcheck isolé port 8798 :
  `{"ok":true,"service":"proto05-augmented-video","version":"0.1.31","port":8798}` ;
- recherche finale : aucun lien ou script d’interface vers l’ancien atelier ;
- aucune dérivation complète de 939 secondes lancée ;
- aucune activité canonique modifiée.

Les tests Chromium inclus dans la suite continuent de couvrir les parcours
Library, auteur, guidé et étudiant. Une validation humaine séparée de David
reste distincte de ces contrôles automatisés.

## État Git

Les changements de cette mission concernent la page supprimée, la route, la
Library, le helper de serveur temporaire, les tests concernés, la roadmap et la
version. Aucun commit ni push n’a été effectué.

Message de commit proposé, non exécuté :
`refactor(proto05): remove legacy advanced anonymization workshop`.

Limite restante : les rapports historiques continuent naturellement de
mentionner l’ancien atelier afin de préserver l’historique du prototype.
