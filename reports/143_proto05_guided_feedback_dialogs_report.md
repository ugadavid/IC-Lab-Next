# Mission 143 — Retours utilisateur et dialogues de l’atelier guidé

Date : 30 juillet 2026  
Prototype : Proto05  
Version applicative : `0.1.48` (inchangée)

## Périmètre

La mission a porté exclusivement sur :

- les retours de suppression dans l’atelier guidé ;
- la remise à zéro de l’éditeur après une suppression réussie ;
- le remplacement des appels natifs `alert`, `confirm` et `prompt` dans les surfaces enseignantes de Proto05 ;
- la création d’un système partagé de dialogues accessibles ;
- la validation automatisée et interactive de ces parcours.

Aucun schéma SQL, média, donnée canonique, contrat de migration ou numéro de
version n’a été modifié. L’activité réelle de David n’a pas été ouverte ni
modifiée.

## Précautions initiales

- Le dépôt était sur `main`, au commit
  `ef4bbd5` (`fix(proto05): secure guided update and deletion flows`).
- La Mission 142 était donc bien commitée.
- Un changement antérieur de David était déjà présent dans
  `prototypes/05-augmented-ic-video-01/data/activities.json`. Il a été préservé
  et exclu du travail de cette mission.
- Le SHA-256 de ce fichier est resté inchangé pendant la mission :
  `6E8FDDC4401A5BB5838CDD274384828C8FCDB45B81C6BEA9AB34234B397FEBFF`.
- La recette a utilisé uniquement l’activité jetable
  `proto05-draft-1785404753295-c1b544`, intitulée
  `[M143] Dialogues et suppressions jetables`.

## Défauts réellement reproduits

### Suppression refusée d’une couche

Le contrat métier refusait déjà correctement la suppression d’une couche
référencée par un phénomène ou un overlay. Le défaut se situait dans le
gestionnaire de l’atelier :

- le refus était écrit dans le statut générique de sauvegarde ;
- le shell interprétait alors ce message métier comme un échec
  d’enregistrement ;
- aucun dialogue explicatif n’était affiché ;
- l’interface pouvait donc suggérer à tort un problème de persistance.

Le défaut a été reproduit séparément avec :

- une couche utilisée par un phénomène ;
- une couche utilisée par un overlay.

### Suppression réussie

Après la suppression d’un overlay ou d’une couche devenue libre :

- l’élément disparaissait bien de la liste ;
- l’état passait bien à « non enregistré » ;
- mais le formulaire et le résumé de sélection restaient affichés avec les
  anciennes valeurs.

La cause était l’absence d’une remise à zéro explicite de la sélection et de
l’éditeur. Le simple passage de l’identifiant sélectionné à `null`, suivi d’un
nouveau rendu, ne nettoyait pas tous les éléments visuels.

### Dialogues natifs

L’audit des pages enseignantes et de leurs scripts partagés a trouvé plusieurs
usages natifs de `confirm` et `prompt`, notamment dans la bibliothèque
d’activités et la gestion des vidéos. Ils ne garantissaient ni une présentation
cohérente, ni la validation interne d’une saisie, ni un comportement accessible
uniforme.

## Corrections réalisées

### Système partagé de dialogues

Le shell enseignant expose désormais une API Promise commune pour :

- une information ;
- une erreur ;
- une confirmation, y compris destructive ;
- une saisie avec validation.

Le composant assure :

- un dialogue centré avec arrière-plan ;
- les rôles accessibles `dialog` ou `alertdialog` et les libellés associés ;
- la fermeture par le bouton dédié, par `Échap` et, lorsque permis, par
  l’arrière-plan ;
- le confinement du focus et sa restitution au déclencheur ;
- la prévention d’une double validation ;
- des boutons d’action explicites ;
- la conservation de la valeur saisie et l’affichage d’une erreur interne
  lorsqu’un prompt est invalide ;
- un affichage adapté à une largeur étroite ;
- un style neutre pour l’information, avec le rouge réservé à l’action
  destructive.

### Atelier guidé

- Un refus de suppression de couche ouvre désormais un dialogue précis sans
  modifier l’état de sauvegarde, la sélection ou les données.
- Les formulations distinguent une référence par un phénomène, par un overlay,
  ou par les deux.
- Les refus de suppression de locuteur utilisent également le dialogue partagé.
- Les suppressions réussies de couche, overlay, annotation, intervalle,
  phénomène, segment ou locuteur réinitialisent la sélection, le résumé et
  l’éditeur avant de signaler l’état non enregistré.
- La confirmation de suppression en cascade d’un segment utilise le dialogue
  partagé tout en conservant le contrat métier existant.

### Autres surfaces enseignantes

Les confirmations et saisies natives ont été remplacées dans :

- la bibliothèque d’activités ;
- la bibliothèque et la fiche vidéo ;
- les actions de dossier, étiquette, copie, dérivation, publication et
  suppression concernées.

Les règles métier et les requêtes existantes ont été conservées.

## Preuves automatisées

Les tests ciblés ont été exécutés avec l’intégration MariaDB activée et de façon
séquentielle :

```text
29 tests réussis sur 29
0 échec
0 test ignoré
```

Ils couvrent notamment :

- les trois formulations de refus d’une suppression de couche ;
- l’absence de mutation ou de faux état de sauvegarde lors d’un refus ;
- la remise à zéro des éditeurs après une suppression réussie ;
- l’absence d’appels natifs `alert`, `confirm` ou `prompt` dans les surfaces
  enseignantes auditées ;
- la structure accessible du dialogue partagé ;
- la validation d’une saisie obligatoire ;
- la conservation de sa valeur en cas d’erreur ;
- le confinement et la restitution du focus ;
- l’annulation par `Échap` ;
- la protection contre une double validation.

La syntaxe Node des scripts modifiés et celle des scripts intégrés aux trois
pages enseignantes concernées ont été validées.

## Recette interactive réelle

Une activité a été créée depuis l’interface réelle avec :

- un segment identifiable ;
- deux couches ;
- un phénomène associé à la première couche ;
- un overlay associé à la seconde.

Les constats après correction sont les suivants :

1. La suppression de la couche du phénomène ouvre le message exact :
   « Cette couche ne peut pas être supprimée, car elle est utilisée par un
   phénomène. »
2. La suppression de la couche de l’overlay ouvre le message exact :
   « Cette couche ne peut pas être supprimée, car elle est utilisée par un
   overlay. »
3. Dans les deux cas, l’état reste « Enregistré », le statut de sauvegarde ne
   reçoit aucune erreur et la date SQL de mise à jour reste inchangée : aucune
   sauvegarde n’est déclenchée.
4. Le focus reste confiné, `Échap` ferme le dialogue et le focus revient sur le
   bouton de suppression.
5. La suppression de l’overlay retire immédiatement sa carte, ferme l’éditeur,
   efface la sélection et place l’activité dans l’état non enregistré.
6. Après sauvegarde, la suppression de la couche devenue libre produit le même
   résultat cohérent.
7. Un prompt de création de dossier refuse une valeur vide dans le dialogue,
   conserve la saisie, retire l’erreur après correction et peut être annulé sans
   créer de dossier.
8. À `375 × 700`, le dialogue reste centré, lisible et sans débordement
   horizontal.
9. Aucune erreur ni alerte n’a été relevée dans la console du navigateur.

## Nettoyage et non-altération

- L’activité jetable a été supprimée depuis l’interface réelle au moyen du
  nouveau dialogue de confirmation.
- Son API répond ensuite `404`.
- Les comptages MariaDB sont revenus au niveau de référence :
  3 activités, 15 segments, 29 phénomènes, 9 couches, 8 overlays,
  31 intervalles et 9 locuteurs.
- Aucune activité portant le préfixe de la Mission 143 et aucun dossier média
  temporaire ne subsistent.
- La sortie d’erreur du serveur de recette est vide.
- Les données JSON canoniques et MariaDB n’ont reçu aucune modification
  persistante liée à la recette.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.js`
- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.css`
- `prototypes/05-augmented-ic-video-01/shared/guided-authoring-contract.js`
- `prototypes/05-augmented-ic-video-01/shared/guided-overlays.js`
- `prototypes/05-augmented-ic-video-01/shared/activity-library.js`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `prototypes/05-augmented-ic-video-01/server/test/guided-authoring-regression.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `reports/143_proto05_guided_feedback_dialogs_report.md`

Le changement antérieur présent dans `data/activities.json` appartient à David
et ne fait pas partie de cette liste de modifications de mission.

## Éléments non vérifiés et limites

- La recette Codex ne constitue pas une validation humaine.
- Les actions destructives ont été exercées sur les scénarios jetables
  nécessaires à la mission ; les autres actions converties vers le composant
  partagé sont couvertes par l’audit statique et les tests de dialogue, sans
  répéter chaque opération métier destructive sur les données réelles.
- Aucun changement de contrat métier n’a été introduit pour résoudre une
  ambiguïté relationnelle.

## Recette humaine minimale proposée à David

1. Ouvrir une activité de test dans l’atelier guidé.
2. Créer une couche utilisée par un phénomène, puis tenter de la supprimer :
   vérifier le message précis, l’absence de requête de sauvegarde et le retour du
   focus sur le bouton.
3. Faire le même contrôle avec une couche utilisée par un overlay.
4. Supprimer l’overlay, sauvegarder, puis supprimer la couche devenue libre :
   vérifier la disparition de la carte, la fermeture de l’éditeur et les
   transitions « Enregistré → Non enregistré → Enregistré ».
5. Sur une page de gestion vidéo, ouvrir puis annuler une saisie de nom ou
   d’étiquette, et vérifier la validation d’une valeur vide au clavier.
6. Contrôler rapidement le dialogue sur une fenêtre étroite.

## Proposition de message de commit

```text
fix(proto05): unify teacher dialogs and guided deletion feedback
```

