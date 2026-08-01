# Mission 166 — Réparer définitivement « Retirer de la Library »

Date : 1er août 2026

Composant : Proto05

Version obtenue : `0.1.58`

## Périmètre

La reprise a couvert le parcours réel de retrait depuis `/teacher/videos`, la
fiche Vidéo++, la suppression d’une tentative de dérivation, le préflight des
dépendances, la condition `If-Match`, les retours locaux et les diagnostics
serveur. Aucune migration, modification de schéma, réparation média ou
suppression de donnée réelle n’a été effectuée.

## Affirmations précédentes invalidées

Le premier rapport 166 concluait trop largement à partir de trois assets
déclaratifs jetables. Ces fixtures prouvaient le retrait d’un asset simple,
mais elles ne contenaient ni traitement terminal, ni playable de dérivation,
ni plan audio. Elles ne couvraient donc pas le type exact manipulé par David.

Les affirmations suivantes étaient incomplètes ou fausses :

- le défaut ne se situait pas seulement avant la frontière HTTP ;
- la réussite d’un retrait d’asset déclaratif ne prouvait pas la suppression
  d’une tentative d’anonymisation ;
- le message global n’était pas acceptable, même lorsqu’il décrivait un
  préflight ;
- la recette responsive n’avait pas été réellement exécutée dans un viewport
  mobile.

La recette humaine de David a donc correctement invalidé la conclusion
fonctionnelle précédente.

## Cible réelle et cartographie

Le libellé `Tentative 25/07/2026 18:26:17` identifie un traitement, pas un asset
autonome :

- asset : `media-proto05-remote-ref-03738b8065e1866b8e956819` ;
- titre de la fiche : `2. GT01_RFC7_reu1_14m34-18m` ;
- traitement : `hls-temporal-derivation-1784996744983-f056bd47` ;
- playable source :
  `video-media-proto05-remote-ref-03738b8065e1866b8e956819-download-47a3e7cf005c9fdc` ;
- playable de sortie :
  `video-hls-temporal-derivation-1784996744983-f056bd47` ;
- rôle de sortie : `derivation-local` ;
- état : `completed`, progression 100 ;
- plan audio bloquant : `audio-plan-443f28c0849caa368dc139ff`, deux passages ;
- fichier de sortie : présent, lisible par le serveur, 29 130 464 octets.

La fiche est aussi liée à l’activité `Activité temporaire`. La suppression de
l’asset complet doit donc être refusée. La suppression de la seule tentative
doit également être refusée tant que son playable sert de source au plan audio.

## Cause technique exacte

Dans le parcours historique de suppression de la tentative, le navigateur
émettait :

- méthode : `DELETE` ;
- URL :
  `/api/proto05/library/assets/media-proto05-remote-ref-03738b8065e1866b8e956819/derivations/hls-temporal-derivation-1784996744983-f056bd47` ;
- `If-Match` : absent ;
- corps : absent.

Le writer reconnaissait la suppression isolée du traitement terminal et
appelait `sp_media_terminal_output_delete`. Sur l’état réel, la procédure
renvoie exactement :

```text
errno 30507
SQLSTATE 45000
sp_media_terminal_output_delete: output used by audio plan
```

Le writer remplaçait ensuite cette cause par
`Écriture MariaDB transactionnelle impossible.`. La route renvoyait alors un
HTTP 400 avec ce seul texte, et l’interface l’envoyait dans le statut global.

La procédure protège une dépendance légitime. Le défaut était donc double :

1. absence de préflight applicatif de la dérivation avant toute tentative de
   suppression physique et transactionnelle ;
2. perte de la cause MariaDB, puis placement du message hors du contexte de la
   vidéo.

Le bouton `Actions > Retirer de la Library` de la carte concerne quant à lui
l’asset complet. Après correction, il relit le détail frais et s’arrête avant
le DELETE sur cette fiche, en nommant l’activité, le traitement et le plan
audio. Les deux opérations sont désormais distinguées explicitement.

## Correction

### Serveur

- Ajout d’un préflight dédié aux traitements de dérivation.
- Contrôle de l’état terminal, du playable de sortie, de son rôle, de sa portée
  de stockage, de son fichier, des activités, des autres traitements, des
  plans audio et des références de stockage partagées.
- Ajout du GET de préflight sur l’URL de la dérivation.
- Le DELETE exige maintenant le `deletionRevisionToken` dans `If-Match` et
  recalcule le préflight juste avant la mutation.
- Une dépendance produit un HTTP 409 structuré avec son type et ses éléments.
- Le writer conserve l’errno et le message interne pour les journaux, sans les
  exposer au navigateur.
- Un véritable échec technique reçoit un identifiant `DEL-…`, journalisé avec
  un contexte borné et restitué sous une formulation utilisateur non sensible.
- La procédure et la migration 005 n’ont pas été modifiées.

### Interface

- Chaque carte possède maintenant son propre cartouche `aria-live` pour les
  vérifications, annulations, refus, conflits, succès et erreurs techniques de
  retrait.
- Les refus ne déclenchent plus automatiquement le panneau d’usage par-dessus
  la carte ; les dépendances sont lisibles directement dans le cartouche.
- La fiche média possède un cartouche dans chaque accès et un autre dans les
  actions générales.
- La suppression d’une dérivation commence par son GET de préflight, puis
  transmet `If-Match` si elle est autorisée.
- Le statut global n’est plus utilisé par les suppressions. Les autres messages
  généraux restent inchangés.

## Recette réelle sur le port 8791

Après redémarrage authentifié des services :

1. **Asset réel protégé, depuis la carte** : `Actions > Retirer de la Library`
   conserve la carte et affiche localement `Activité temporaire`, la tentative
   du 25 juillet et le plan audio. Le statut global reste vide.
2. **Tentative réelle, depuis la fiche** : `Supprimer la tentative` affiche
   localement le plan audio et ses deux passages. Aucun dialogue destructif et
   aucun DELETE ne sont déclenchés par l’interface.
3. **Défense HTTP** : un DELETE volontaire avec le bon `If-Match`, sans corps,
   reçoit HTTP 409 et la collection `audio-plans`. Le fichier et les trois
   lignes réelles restent présents.
4. **Succès depuis une carte** : une source déclarative jetable créée depuis
   l’interface a affiché le succès dans sa carte, puis la carte a disparu et le
   compteur est revenu à `12 / 12`.
5. **Succès depuis la fiche** : une seconde source jetable a affiché le succès
   dans le cartouche des actions générales, puis a redirigé vers la Library où
   la carte était absente.
6. **Conflit de révision** : une troisième fixture modifiée entre le préflight
   et la confirmation a reçu le refus de concurrence dans sa propre carte,
   avec invitation à recharger. Elle est restée présente jusqu’à son nettoyage
   canonique.
7. **Redémarrage** : le serveur a repris sur `8791`; les deux retraits jetables
   sont restés effectifs et la cible réelle protégée est restée intacte.

Le contrôle visuel ordinateur confirme un cartouche rose lisible dans la carte,
sans message dans la barre d’outils et sans recouvrement par le panneau d’usage.
Les règles responsive existantes conservent la carte sur une colonne sous
760 px et le cartouche utilise la largeur interne de la carte. Le contrôleur de
navigateur disponible n’offrait toutefois pas de changement de viewport : une
capture mobile réelle reste une validation humaine à effectuer par David.
Le contrôleur ne proposait pas non plus de lecture directe de la console du
navigateur ; aucune erreur visible ni rupture d’action n’a été observée, mais
ce contrôle console précis reste inclus dans la recette humaine minimale.

## Preuves d’intégrité et nettoyage

Après les essais :

- assets dont le titre commence par `[TEST M166]` : 0 ;
- plans audio dont l’identifiant commence par `m166-` : 0 ;
- traitements de fixture `m165-treatment-…` : 0 ;
- fichier ou dossier de fixture M166 résiduel : aucun ;
- traitement réel protégé : 1 ;
- playable réel protégé : 1 ;
- plan audio réel protégé : 1 ;
- fichier réel protégé : présent, taille inchangée.

Une fixture de test a d’abord révélé que le compte applicatif ne pouvait pas
supprimer directement une ligne de plan audio, conformément à ses grants. Elle
a été immédiatement nettoyée avec le compte administratif local, sans afficher
ses secrets, puis le test a été corrigé pour garantir ce nettoyage même en cas
d’échec.

## Vérifications automatisées

- `node --check server/server.js` : réussi.
- `node --check server/proto05-mariadb-write.js` : réussi.
- validation syntaxique des scripts embarqués des deux pages : réussie.
- `media-library-contract.test.js`, `video-workspaces.test.js` et
  `library-download-finalization.test.js` : 73/73 réussis.
- Le test transactionnel couvre désormais un traitement terminal dont la
  sortie est protégée par un plan audio, le HTTP 409 sans mutation, puis le
  succès après retrait contrôlé de la dépendance jetable.
- Les tests statiques couvrent le préflight réel, `If-Match`, les cartouches
  carte et fiche, l’absence d’usage du statut global et les diagnostics.
- santé après redémarrage : `available`, service Proto05 `0.1.58`.
- `git diff --check` : réussi.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/library-download-finalization.test.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md`
- `reports/166_proto05_library_removal_report.md`

## Recette humaine minimale laissée à David

Sur la carte `2. GT01_RFC7_reu1_14m34-18m`, choisir
`Actions > Retirer de la Library`. Vérifier que la carte reste présente et que
son cartouche nomme l’activité, la tentative et le plan audio, sans message dans
la barre supérieure. Ouvrir ensuite la fiche et choisir `Supprimer la tentative` :
le plan audio doit être nommé dans le cartouche de cette dérivation. Faire un
contrôle rapide à largeur mobile réelle.

## Proposition de commit

`fix(proto05): préflight les dérivations et localise les retours de suppression`
