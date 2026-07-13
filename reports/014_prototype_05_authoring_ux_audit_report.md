# Audit UX ciblé — Atelier auteur du Prototype 05

Date : 13 juillet 2026  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version observée : atelier auteur 0.1.2, serveur local sur le port 8791  
Statut : audit sans modification du code ni des données

## 1. Résumé exécutif

L’atelier est techniquement riche et couvre déjà une grande partie du modèle pédagogique : activité, vidéo, transcription, intervalles linguistiques, phénomènes IC, couches, annotations et prévisualisation. Il constitue une bonne base fonctionnelle pour une démonstration.

En revanche, l’expérience actuelle reste celle d’un éditeur de données. Pour une enseignante, le premier contact est difficile : l’écran présente simultanément toutes les dimensions du modèle, les identifiants internes, des millisecondes, des champs sans contexte et des boutons de suppression répétés. Le parcours naturel « regarder → mettre en pause → annoter ce moment → voir le résultat étudiant » n’est pas le parcours dominant de l’interface.

Le risque principal n’est pas l’absence de fonctionnalités, mais la surcharge et l’incertitude : l’utilisatrice ne sait pas quelle action effectuer en premier, ce qui sera visible par les étudiants, ni si une modification a été enregistrée.

Priorité recommandée : transformer l’atelier en espace de travail centré sur la vidéo et le moment sélectionné, avec une progression guidée et des panneaux secondaires repliables. La première mission UX ne devrait pas ajouter de nouvelles capacités métier ; elle devrait rendre le scénario de première création évident et rassurant.

Un défaut fonctionnel bloquant a également été observé pendant l’audit : la prévisualisation échoue dans la construction de la timeline des langues avec `segment is not defined`. Le défaut est visible dans la prévisualisation autonome et remonte comme « Erreur réseau », ce qui donne à l’enseignante une explication trompeuse.

## 2. Public cible et besoins

Le public prioritaire est constitué d’enseignants et de formateurs en langues, avec un intérêt particulier pour l’intercompréhension et le plurilinguisme. Leur objectif n’est pas de gérer un modèle de données, mais de préparer une situation d’observation ou une activité pédagogique.

Ils doivent pouvoir :

- comprendre immédiatement ce que l’activité permettra aux étudiants d’observer ;
- choisir une vidéo et regarder un extrait avant de le décrire ;
- créer un moment à partir de la position courante du lecteur ;
- choisir une langue et un phénomène dans un vocabulaire pédagogique ;
- rédiger une consigne ou une question sans connaître la structure JSON ;
- distinguer clairement ce qui est destiné à l’enseignant de ce que verra l’étudiant ;
- prévisualiser puis revenir à l’édition sans perdre le contexte ;
- savoir à tout moment si le brouillon est sauvegardé.

## 3. Méthode et éléments observés

L’audit a combiné :

- lecture de `teacher-author.html`, `teacher-create.html`, `index-0.0.8.html` et du serveur du prototype ;
- lecture des rapports précédents sur l’atelier et l’ouverture d’activités existantes ;
- ouverture de l’activité historique dans l’atelier auteur ;
- ouverture de la prévisualisation enseignant ;
- ouverture de l’écran « Créer une activité » ;
- observation DOM et capture visuelle à une largeur de 1280 px ;
- simulation mentale du parcours demandé : créer, annoter un premier intervalle, ajouter un phénomène, modifier la transcription, choisir les couches et vérifier la vue étudiant.

Mesures observées sur l’activité historique : 7 cartes, 11 segments, 22 intervalles, 26 phénomènes, 7 couches, 11 annotations et 291 contrôles `input`, `textarea` ou `select`. La hauteur de page dépasse 5 500 px ; l’atelier oblige donc à parcourir une longue page avant de retrouver les actions de sauvegarde ou de prévisualisation.

## 4. Forces actuelles

### Fonctionnelles

- L’atelier existe comme espace dédié et ouvre une activité historique réelle.
- La création et l’édition d’une activité sont séparées de la vue étudiant.
- La vidéo, la transcription, les couches et les annotations sont déjà reliées par le même moteur de rendu.
- La prévisualisation est intégrée à l’atelier et une vue étudiant indépendante reste accessible.
- La sauvegarde explicite et le statut de brouillon sont présents.
- Les validations serveur protègent plusieurs références et contraintes temporelles.
- Les données historiques sont suffisamment riches pour tester un cas réaliste.

### Pédagogiques

- Les notions métier importantes sont déjà présentes : changement de langue, clarification, négociation du sens, compréhension collective, mot-piège et répertoire plurilingue.
- La timeline et la transcription peuvent soutenir une lecture fine de la vidéo.
- Les annotations disposent d’une note et d’une question pédagogique, ce qui ouvre un vrai usage enseignant.
- La séparation entre couches et occurrences existe dans le modèle, ce qui permettra une interface plus simple sans perdre la puissance interne.

## 5. Problèmes UX prioritaires

| Gravité | Problème | Effet sur le parcours | Recommandation |
|---|---|---|---|
| Bloquant | La prévisualisation signale « Erreur réseau » avec `segment is not defined` dans la timeline des langues. | L’enseignante ne peut pas vérifier le résultat et peut croire que son activité est invalide. | Corriger la régression avant toute démonstration ; afficher une erreur technique distincte d’une erreur réseau. |
| Critique | Les millisecondes et identifiants sont visibles dans presque tous les champs. | Charge cognitive élevée, peur de casser les données, impossibilité d’apprendre spontanément. | Afficher des temps `mm:ss` et des noms lisibles ; réserver les identifiants à un mode avancé. |
| Critique | Toutes les collections sont visibles simultanément. | L’utilisateur ne sait pas quelle étape est prioritaire. | Introduire une progression : vidéo, moments, observation, résultat étudiant. |
| Critique | Les phénomènes demandent un identifiant de couche et un identifiant de segment. | La différence entre couche, occurrence et segment est imposée au lieu d’être expliquée. | Ajouter depuis le moment courant, avec sélection par libellé et rattachement automatique. |
| Élevée | La prévisualisation est un iframe compact de 360 px dans une carte étroite. | Le résultat étudiant est difficile à lire et perd son rôle de validation. | Prévoir un mode côte à côte ou une prévisualisation plein panneau, conservant le contexte d’édition. |
| Élevée | Les actions de suppression sont répétées et très visibles, tandis que l’annulation est absente. | Risque d’erreur et faible sentiment de sécurité. | Ajouter annuler/rétablir ou au minimum une confirmation et un retour après suppression. |
| Élevée | La sauvegarde est uniquement une action finale située en bas de page. | L’utilisateur peut perdre confiance sur l’état du brouillon. | Afficher un état persistant « Modifications non enregistrées / Enregistré à… » dans l’en-tête. |
| Moyenne | Les langues, locuteurs et couches sont manipulés par codes (`lang-fr`, `speaker-…`, `layer-…`). | Le contenu pédagogique devient technique et peu lisible. | Utiliser des sélecteurs avec libellé, éventuellement recherche, sans exposer le code. |

## 6. Problèmes visuels et d’architecture générale

### Hiérarchie

Le titre « Atelier auteur » est immédiatement suivi d’un avertissement technique sur l’authentification et le JSON. Cet avertissement est exact pour l’équipe, mais il occupe la place du premier message d’orientation attendu par une enseignante. Le premier écran devrait répondre à : « Que suis-je en train de préparer ? » et « Quelle est la prochaine étape ? ».

La grille actuelle place « Métadonnées et vidéo » à côté de « Prévisualisation », puis une transcription très longue, puis les intervalles, phénomènes, couches et annotations. Cette juxtaposition ne reflète pas l’ordre mental de la tâche. Les éléments de configuration globale et les éléments d’annotation située dans le temps sont mélangés.

### Densité

Les lignes de champs ont une faible différenciation visuelle. Un segment est une suite de champs sans titre local, sans résumé et sans relation visible avec la vidéo. Les temps et les codes prennent autant de place que le texte pédagogique. La page est praticable pour un développeur qui connaît le schéma, mais peu mémorisable pour un nouveau public.

### Vidéo et timeline

La vidéo n’est pas le centre de gravité de l’atelier. Elle apparaît indirectement dans une prévisualisation embarquée, tandis que l’édition temporelle est réalisée au moyen de champs numériques. Il manque un geste central : mettre en pause puis cliquer sur « Créer un moment ici ».

La timeline étudiante est riche, mais elle est enfermée dans la prévisualisation et n’est pas présentée comme un outil d’édition enseignant. Pour l’auteur, il faudrait une timeline principale avec le curseur courant, les moments existants et des actions contextuelles.

### Responsive et démonstration

À 1280 px, la transcription est déjà très dense et la prévisualisation occupe une largeur réduite. Sur une largeur plus petite, la grille risque de devenir une longue succession de cartes. Pour une démonstration UGA, la priorité visuelle devrait être : lecteur suffisamment grand, timeline lisible, panneau de travail clair, prévisualisation facile à ouvrir.

## 7. Problèmes de vocabulaire

Le vocabulaire interne n’est pas nécessairement le vocabulaire de l’enseignante. Les termes à conserver doivent être accompagnés d’une reformulation courte.

| Terme actuel | Risque | Proposition d’interface |
|---|---|---|
| Métadonnées | Technique et abstrait | Informations de l’activité |
| Segment | Peut être compris comme unité linguistique ou technique | Moment de transcription |
| Intervalle linguistique | Correct mais abstrait | Langue entendue dans ce moment |
| Phénomènes IC | Pluriel vague | Phénomène d’intercompréhension |
| Occurrence | Terme de modèle de données | Observation sur la timeline |
| Couche pédagogique | Compréhensible après apprentissage, pas avant | Ce que les étudiants pourront voir |
| Annotation | Peut évoquer une note technique | Note ou question pédagogique |
| `startMs`, `endMs` | Incompréhensible | Début / Fin, au format 00:00 |
| `speakerIds`, `languageIds`, `layerId` | Identifiants exposés | Locuteur / Langues / Phénomène |
| Sauvegarder le brouillon | Correct mais anxiogène si aucune indication d’état | Enregistrer les modifications |

Les libellés devraient privilégier des verbes et des résultats : « Ajouter un moment », « Choisir la langue », « Ajouter une observation », « Voir ce que verra l’étudiant ».

## 8. Parcours de création évalué

### Étape 1 — Créer une activité vidéo

L’écran de création est court et compréhensible : titre, description, vidéo, bouton de création. Sa limite est de ne pas expliquer ce qui se passera après la création ni ce qu’est une activité. Un message de sortie devrait annoncer : « Votre activité est créée. Nous allons maintenant choisir un premier moment dans la vidéo. »

### Étape 2 — Choisir une vidéo et regarder un moment

Le choix de vidéo existe, mais l’atelier auteur ne donne pas immédiatement une expérience de lecture principale. Il faut d’abord comprendre la prévisualisation embarquée, son état et sa relation à l’édition. Le parcours ne commence donc pas naturellement par regarder.

### Étape 3 — Créer un premier intervalle de langue

Cette étape est difficile. Il faut trouver « Intervalles linguistiques », saisir un code de langue puis deux millisecondes. Rien n’indique que l’intervalle doit être créé depuis la position courante ni à quel moment il sera utilisé.

### Étape 4 — Ajouter un phénomène IC

Cette étape est techniquement possible, mais le formulaire demande une couche, des temps et un segment sous forme de codes. L’enseignante doit connaître la structure avant de pouvoir exprimer son observation.

### Étape 5 — Modifier une transcription

La transcription est accessible, mais chaque ligne commence par des temps techniques et continue avec des codes. Le texte est présent mais visuellement noyé. Il manque une relation directe entre le segment affiché et la position vidéo.

### Étape 6 — Choisir les couches visibles

La présence des couches est visible dans l’atelier, mais l’interface ne semble pas proposer un réglage enseignant lisible de « ce que l’étudiant verra ». Modifier le label ou la couleur d’une couche n’est pas la même action que choisir sa visibilité. Cette distinction doit devenir explicite et séparée.

### Étape 7 — Vérifier le rendu étudiant

Le lien « Ouvrir la vue étudiant » est explicite, mais la prévisualisation intégrée est trop petite pour jouer le rôle de contrôle principal. De plus, l’erreur `segment is not defined` observée dans la timeline fait remonter un statut « Erreur réseau », empêchant une validation fiable.

### Conclusion du parcours

Le parcours complet est couvert par le modèle, mais il n’est pas guidé par l’interface. L’utilisatrice doit naviguer dans le schéma de données plutôt que suivre une suite d’actions pédagogiques. Le premier succès — voir un moment annoté apparaître dans la vue étudiant — arrive trop tard et demande trop de connaissances préalables.

## 9. Architecture d’écran recommandée

Proposition de structure cible, sans ajouter de capacité métier :

```text
En-tête : titre de l’activité · état du brouillon · Enregistrer · Voir le résultat étudiant

Étape 1  Préparer
  titre, consigne, question pédagogique, vidéo

Étape 2  Observer la vidéo
  lecteur principal
  timeline d’édition : curseur, moments, langues, phénomènes
  Ajouter un moment ici

Étape 3  Décrire le moment sélectionné
  texte, locuteur, langue(s)
  phénomène d’intercompréhension
  note / question pédagogique

Étape 4  Choisir le résultat étudiant
  couches visibles sous forme de cartes lisibles
  aperçu immédiat du résultat

Panneau secondaire repliable : transcription complète, réglages avancés, détails techniques
Pied d’écran persistant : état de sauvegarde, Annuler, Enregistrer
```

La vidéo et le moment sélectionné doivent rester visibles lorsque l’utilisateur édite une transcription, une langue, un phénomène ou une annotation. Les listes complètes peuvent rester disponibles, mais dans des panneaux secondaires ou des onglets, avec un résumé compact en premier niveau.

## 10. Parcours guidé proposé

1. **Nommer l’activité** — titre et courte intention pédagogique.
2. **Choisir la vidéo** — carte vidéo avec durée lisible et bouton « Commencer à regarder ».
3. **Regarder et mettre en pause** — lecteur principal, position `00:00`, contrôle « Revenir de 5 secondes ».
4. **Créer un moment** — bouton « Ajouter ce moment » ; le début est prérempli par la position courante et la fin est ajustable par lecture ou poignée.
5. **Décrire ce moment** — texte, locuteur et langue(s) via sélecteurs lisibles.
6. **Ajouter une observation IC** — choix guidé parmi les phénomènes, avec une courte aide contextuelle.
7. **Ajouter une question ou une note** — formulation pédagogique, attachée automatiquement au moment.
8. **Choisir la visibilité étudiant** — cases ou cartes « visible par les étudiants », avec aperçu de chaque couche.
9. **Vérifier** — bascule claire « Édition / Vue étudiant » ou panneau côte à côte.
10. **Enregistrer** — confirmation visible, conservation du contexte et possibilité de revenir au moment édité.

Le premier parcours devrait être réalisable avec un seul moment, une seule langue, un seul phénomène et une seule question. Les fonctions avancées restent accessibles ensuite.

## 11. Libellés et messages recommandés

### Actions principales

- « Créer une activité »
- « Commencer avec cette vidéo »
- « Ajouter un moment ici »
- « Ajuster le début » / « Ajuster la fin »
- « Choisir la langue entendue »
- « Ajouter un phénomène d’intercompréhension »
- « Écrire une question pour les étudiants »
- « Choisir ce que les étudiants verront »
- « Voir le résultat étudiant »
- « Enregistrer les modifications »

### Aides courtes

- « Mettez la vidéo en pause, puis ajoutez le moment que vous souhaitez faire observer. »
- « Vous pouvez modifier la durée en déplaçant les poignées sur la timeline. »
- « Une couche regroupe un type d’observation. Une observation indique où ce phénomène apparaît dans la vidéo. »
- « Les codes techniques sont masqués. Afficher les détails ».

### États

- « Modifications non enregistrées »
- « Enregistré à 14:32 »
- « Ce moment est prêt à être montré aux étudiants »
- « Le début doit être placé avant la fin »
- « Choisissez au moins une langue pour décrire ce moment »
- « La prévisualisation ne peut pas charger la vidéo. Vérifiez la connexion ou réessayez. »
- « La prévisualisation rencontre un problème interne. Votre brouillon n’est pas supprimé. »

Le message actuel « Brouillon local — aucune authentification ni gestion réelle des droits. Les données sont sauvegardées dans le JSON du prototype. » devrait être déplacé dans une aide technique secondaire. Le premier écran doit rassurer sur l’action pédagogique, pas exposer les limites d’architecture.

## 12. Feedback immédiat et sécurité

- Après l’ajout d’un moment : sélectionner la carte, afficher la plage sur la timeline et déplacer le lecteur au début.
- Après un changement de langue ou de phénomène : mettre à jour immédiatement la timeline et le résumé du moment.
- Après une annotation : afficher la question dans l’aperçu étudiant sans navigation séparée.
- Après une modification de couche : indiquer explicitement « visible par les étudiants » ou « réservé à l’enseignant ».
- Après suppression : proposer « Annuler » dans un message temporaire ; éviter une confirmation répétitive pour chaque suppression si l’annulation est fiable.
- Avant de quitter avec des modifications : avertir clairement, avec choix « Enregistrer », « Quitter sans enregistrer » et « Annuler ».
- Remplacer les erreurs génériques par une erreur au niveau du champ, un message en langage naturel et une correction suggérée.
- Séparer les états « vidéo indisponible », « activité introuvable », « erreur de rendu » et « sauvegarde refusée ».

## 13. Prévisualisation recommandée

La prévisualisation devrait être une sortie de travail permanente, accessible par un bouton fixe et une bascule réversible. Deux formats sont pertinents :

- **côte à côte** sur grand écran : édition à gauche, résultat étudiant à droite ;
- **panneau latéral élargi** : le résultat s’ouvre sans quitter l’activité et revient au même moment sélectionné.

Le résultat doit afficher un bandeau explicite : « Vue étudiant — ce contenu est visible par les étudiants ». Les éléments réservés à l’enseignant doivent être absents ou marqués comme tels. Quand une modification est faite, un indicateur « aperçu mis à jour » doit apparaître au niveau du moment concerné.

Avant toute démonstration, la régression `segment is not defined` doit être corrigée dans le rendu de la timeline. Elle est actuellement transformée en « Erreur réseau », ce qui rend le diagnostic incompréhensible pour le public cible et fragilise la confiance dans l’outil.

## 14. Découpage recommandé des prochaines missions Codex

### Mission 1 — Réparer et clarifier la prévisualisation

- corriger l’erreur de timeline observée ;
- distinguer erreur réseau et erreur de rendu ;
- vérifier que la prévisualisation étudiante affiche bien un segment, sa couche et sa question ;
- conserver les données inchangées.

### Mission 2 — Établir le vocabulaire visible

- remplacer les codes par des libellés dans les contrôles courants ;
- ajouter des aides courtes pour moment, langue, phénomène, couche et annotation ;
- déplacer les détails techniques dans un panneau avancé.

### Mission 3 — Recentrer l’atelier sur la vidéo

- créer un lecteur principal dans l’espace auteur ;
- afficher une timeline d’édition avec curseur courant ;
- ajouter « Ajouter un moment ici » ;
- relier le moment sélectionné à un panneau d’édition contextualisé.

### Mission 4 — Simplifier l’édition d’un moment

- transformer les lignes techniques en cartes de moments ;
- utiliser `mm:ss` et des contrôles début/fin lisibles ;
- proposer des sélecteurs de langues et de locuteurs ;
- afficher les chevauchements et les incohérences au bon endroit.

### Mission 5 — Guider l’ajout d’un phénomène et d’une annotation

- ajouter un phénomène depuis le moment courant ;
- choisir une catégorie par libellé pédagogique ;
- attacher automatiquement note et question au moment sélectionné ;
- montrer immédiatement le résultat dans l’aperçu.

### Mission 6 — Rendre les couches compréhensibles

- séparer « gérer les types d’observation » et « choisir ce que voient les étudiants » ;
- proposer des cartes avec nom, description, couleur et aperçu ;
- rendre la visibilité explicite.

### Mission 7 — Installer la sécurité du brouillon

- état de sauvegarde persistant ;
- annulation après suppression ;
- avertissement avant sortie ;
- messages d’erreur actionnables.

### Mission 8 — Vérifier le parcours complet

- test avec une personne non développeuse ;
- scénario : créer une activité, annoter un premier moment, modifier une transcription, choisir une couche, vérifier la vue étudiant ;
- mesurer le temps jusqu’au premier résultat visible et les demandes d’aide ;
- corriger uniquement les blocages observés.

## 15. Éléments à ne surtout pas ajouter maintenant

- authentification, rôles ou gestion de permissions ;
- MariaDB ou une nouvelle architecture de persistance ;
- IA de suggestion ou d’annotation ;
- bibliothèque d’activités étendue ;
- export complexe, collaboration multi-utilisateur ou partage public ;
- nouveaux types de phénomènes avant d’avoir rendu les types existants compréhensibles ;
- panneau d’administration ou mode « expert » visible par défaut ;
- options de personnalisation décorative qui éloignent du scénario vidéo → observation → résultat ;
- nouvelles timelines parallèles sans hiérarchie claire.

## 16. Critères de réussite UX

Le prochain état de l’atelier pourra être considéré comme suffisamment clair si :

- une enseignante comprend quoi faire dans les 10 premières secondes ;
- elle crée un premier moment sans saisir de millisecondes ni d’identifiants ;
- elle peut associer une langue et un phénomène à ce moment avec des libellés compréhensibles ;
- elle retrouve immédiatement son annotation dans la vidéo, la timeline et la vue étudiant ;
- elle sait si la modification est enregistrée sans faire défiler toute la page ;
- elle peut annuler une suppression ou revenir à l’état précédent ;
- elle distingue sans explication ce que voit l’enseignant et ce que voit l’étudiant ;
- la prévisualisation fonctionne sans erreur et les messages d’échec indiquent une action possible ;
- le parcours complet de première activité est réalisable en moins de cinq minutes après une brève découverte de l’écran ;
- un test utilisateur ne révèle pas de confusion persistante entre moment, phénomène, couche et annotation.

## Conclusion

Le Prototype 05 possède déjà le socle fonctionnel nécessaire à un outil d’auteur pédagogique. La priorité est désormais une réduction de la complexité perçue, pas une extension du modèle. L’atelier doit faire passer l’enseignante d’une logique de saisie de données à une logique d’observation guidée : regarder, sélectionner un moment, le décrire, choisir ce qui sera visible et constater immédiatement le résultat.

La séquence la plus urgente est donc : corriger la prévisualisation, placer la vidéo au centre, masquer les détails techniques, puis guider la création d’un premier moment complet. Cette séquence donnera le meilleur gain de confiance et de démontrabilité tout en respectant les contraintes du prototype.
