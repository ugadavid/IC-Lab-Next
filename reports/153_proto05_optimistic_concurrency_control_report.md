# Mission 153 — Contrôle de concurrence optimiste de Proto05

Date : 31 juillet 2026

Prototype : `prototypes/05-augmented-ic-video-01`

Version observée et obtenue : **`0.1.48`**, inchangée

## Conclusion

Proto05 refuse désormais les écritures préparées depuis une activité ou une
fiche média devenue obsolète. Le contrôle et la mutation appartiennent à la
même transaction MariaDB courte ; un conflit ne modifie aucune table et
n'efface pas les valeurs du formulaire.

Le schéma possédait déjà `activities.revision BIGINT UNSIGNED NOT NULL DEFAULT
1`. Cette colonne est maintenant le témoin commun de l'activité, de son identité
pédagogique et de tout son authoring. Les assets ne possédant pas de colonne
équivalente, deux empreintes SHA-256 canoniques et transactionnellement
recalculées protègent respectivement l'édition humaine et la suppression.
**Aucun changement de schéma ni migration n'a été nécessaire.**

Les onze suites suivies passent à **115/115**. L'écart exact avec la référence
114/114 est le nouveau scénario MariaDB déterministe de concurrence optimiste.
Aucun test existant n'a été retiré, ignoré ou affaibli.

## État initial et risque démontré

Le dépôt était propre sur le commit `2f3b08d` de la Mission 152. Le writer
utilisait déjà une transaction `SERIALIZABLE`, un verrou nommé commun et une
relecture relationnelle avant commit, mais il ne savait pas quel état le client
avait chargé. Son `baseSnapshot` définissait la portée de la mutation ; il ne
constituait pas une précondition utilisateur.

Deux clients pouvaient donc charger le même agrégat, puis produire deux
remplacements successifs valides. Le second remplacement était calculé depuis
l'ancien état et pouvait supprimer silencieusement les nouvelles valeurs du
premier, y compris dans les tables enfants de l'authoring. Le même risque
existait pour les métadonnées d'un asset et pour un préflight de suppression
devenu faux après une modification concurrente.

La projection runtime ignorait la colonne `activities.revision` et le mapper
d'écriture réémettait toujours sa valeur initiale. Un `updatedAt` n'aurait pas
été assez robuste : sa précision n'établit pas un compare-and-swap et toutes
les mutations d'enfants ne garantissaient pas sa progression.

## Cartographie des mutations

| Parcours | Agrégat et tables principales | Forme | Précondition retenue | Risque avant M153 |
| --- | --- | --- | --- | --- |
| Création d'activité | nouvelle ligne `activities`, transcription et identité vides | ajout indépendant | aucune révision antérieure ; nouvelle révision 1 | pas d'écrasement d'un objet chargé |
| Fiche pédagogique | activité, identité, qualifications et lignage | remplacement/patch de l'agrégat | révision de l'activité | écrasement du titre, des consignes ou de l'identité |
| Atelier auteur/guidé | activité, transcriptions, segments, locuteurs, langues, intervalles, couches, phénomènes, annotations, overlays et relations | remplacement multi-table atomique | même révision d'activité | perte de plusieurs collections et relations |
| Association vidéo | `activities` et référence asset/playable | patch d'activité | révision de l'activité | remplacement d'une association plus récente |
| Duplication | source lue puis nouvelle activité avec IDs remappés | lecture + ajout indépendant | révision de la source, sans l'incrémenter | copie silencieuse d'une source devenue obsolète |
| Suppression d'activité | activité et toutes ses relations | suppression | révision de l'activité | suppression après modification concurrente |
| Classement d'activité | affectation dossier de bibliothèque | patch indépendant | aucun compteur d'authoring | faux conflit inutile avec le contenu pédagogique |
| Métadonnées Vidéo++ | asset, `editorial_metadata_json`, provenance/droits, dossier et tags | patch éditorial | empreinte éditoriale de l'asset | perte d'une saisie ou d'un classement concurrent |
| Suppression média | asset, sources, playables, traitements, lignage, stockages partagés et usages d'activité | préflight + suppression | empreinte de suppression dédiée | préflight obsolète et suppression devenue dangereuse |
| Import et référence distante | nouvel asset/source/playable | ajout indépendant | identité/hash et jeton d'analyse propres | pas de remplacement d'un agrégat chargé |
| Version publiée, copie de travail, dérivation | sources, playables, traitements et filiations | ajout/finalisation technique | jetons de préparation, états et préconditions spécialisés | ne justifie pas une révision éditoriale globale |
| Disponibilité locale | playable et métadonnées techniques | correction technique explicite | anciennes valeurs, hash de plan et verrou commun | déjà fermé par M151 |
| Dossiers/étiquettes globaux | référentiels de classement | commandes directes | validation d'identité, d'unicité et d'usage | hors remplacement d'une fiche asset |

Le statut de publication est porté par `activities.status`, sans agrégat de
publication séparé. Toute modification de ce statut via les sauvegardes
couvertes participe donc à la révision de l'activité.

## Unités de concurrence

### Activité et authoring

Une activité et ses tables enfants constituent l'unité minimale cohérente. Une
sauvegarde d'atelier remplace plusieurs collections dont les identifiants et
références doivent être validés ensemble. Une révision par segment ou couche
aurait rendu ce remplacement atomique impraticable ; un compteur global aurait
créé des conflits entre activités distinctes.

Le serveur expose `activity.revision` et un `revisionToken` opaque. Une mutation
acceptée passe la révision de N à N+1 dans la même transaction. Une simple
lecture, un classement dans un dossier de bibliothèque ou la duplication de la
source sans la modifier ne la font pas progresser.

### Asset média

Deux frontières distinctes évitent qu'une opération technique sans rapport ne
bloque une saisie humaine :

- l'empreinte éditoriale couvre l'identifiant, le titre, la description, les
  métadonnées éditoriales, le dossier, les tags, la provenance déclarée et les
  droits ;
- l'empreinte de suppression couvre l'asset complet, ses sources, playables,
  traitements, descendants, partages de stockage et les seules références
  vidéo des activités.

Les collections sont déjà projetées dans un ordre canonique ; les clés JSON
sont triées avant SHA-256. Une lecture identique produit donc le même témoin.
L'empreinte éditoriale exclut les dates et disponibilités techniques.
L'empreinte de suppression exclut la révision pédagogique d'une activité
lorsque sa référence vidéo n'a pas changé.

## Contrat HTTP

Les lectures de détail et les listes utilisées par les interfaces exposent les
jetons de l'activité ou de l'asset. Les mutations protégées les renvoient dans
`If-Match`.

| Cas | Statut | Code | Effet |
| --- | --- | --- | --- |
| jeton courant | succès de la route | — | mutation commitée, nouvelle révision renvoyée |
| jeton absent | `428 Precondition Required` | `PROTO05_REVISION_REQUIRED` | aucune écriture |
| jeton mal formé, mauvais type ou mauvaise ressource | `400 Bad Request` | `PROTO05_REVISION_INVALID` | aucune écriture |
| révision ancienne, future ou empreinte différente | `409 Conflict` | `PROTO05_CONCURRENCY_CONFLICT` | aucune écriture, `reloadRequired: true` |
| entité supprimée | `404` sur le parcours applicatif audité, ou conflit interne si elle disparaît après le préflight | code d'absence/conflit | aucune recréation |

La réponse de conflit contient le type et l'identifiant de l'entité ainsi
qu'un message français. Elle ne contient ni diff interne, ni secret, ni jeton
courant : le client ne peut pas resoumettre son ancien corps en lui substituant
silencieusement une nouvelle révision.

## Garantie transactionnelle

Le writer conserve son verrou nommé commun et sa transaction `SERIALIZABLE`.
Après ouverture de la transaction, il verrouille et relit les tables canoniques,
construit la projection courante, puis compare les préconditions. Pour une
activité, la ligne désirée reçoit la révision courante + 1 avant la production
du plan SQL. Pour les assets, les empreintes sont recalculées depuis cette même
projection verrouillée.

```text
verrou court et transaction
→ relecture SQL courante
→ comparaison de la précondition
→ mutation multi-table complète
→ relecture relationnelle de validation
→ commit
→ nouvelle projection et nouveau témoin dans la réponse
```

Une erreur de précondition intervient avant le plan de mutation. Toute erreur
ultérieure déclenche un rollback ; le verrou et la connexion sont libérés dans
le `finally`. Aucun verrou utilisateur ou pessimiste durable n'est introduit.

## Routes et interfaces couvertes

Les préconditions sont obligatoires sur :

- `PUT /api/proto05/activities/:id` ;
- `PUT /api/proto05/activities/:id/authoring` ;
- `PUT /api/proto05/activities/:id/video-ref` ;
- `POST /api/proto05/activities/:id/duplicate` pour la source lue ;
- `DELETE /api/proto05/activities/:id` ;
- `PUT /api/proto05/library/assets/:id/metadata` ;
- `PUT /api/proto05/library/assets/:id/classification` ;
- `DELETE /api/proto05/library/assets/:id` et `/physical`.

La bibliothèque d'activités, la fiche, l'atelier auteur, l'atelier guidé, la
vidéothèque et la fiche Vidéo++ conservent et transmettent le bon jeton. En cas
de `409`, les formulaires affichent le diagnostic, ne montrent aucune fausse
confirmation, conservent les valeurs locales et proposent de recharger avec un
avertissement sur leur remplacement. Aucune fusion automatique n'a été ajoutée.

## Parcours volontairement indépendants

Les POST de création/import, les commandes de dossier/étiquette, l'ajout d'un
accès publié, les copies locales, les préparations HLS, les dérivations et leur
finalisation ne remplacent pas un formulaire complet chargé auparavant. Ils
gardent leurs identifiants, jetons de préparation, transitions d'état,
idempotence et préconditions spécialisées.

La réconciliation de disponibilité de M151 conserve son plan hashé, ses valeurs
avant, sa relecture et le verrou du writer. Lui faire progresser l'empreinte
éditoriale aurait créé un faux conflit. Les suppressions d'une seule copie ou
d'une dérivation gardent leur préflight spécialisé ; la suppression de l'asset
complet est, elle, protégée par l'empreinte de suppression.

Les commandes globales de renommage/suppression de dossiers et tags ne sont
pas des remplacements d'une fiche asset et n'ont pas reçu de compteur global.
Elles restent transactionnelles et validées contre leurs usages. Une future
interface d'édition longue de ces référentiels devrait définir sa propre unité
de concurrence.

## Scénarios déterministes

Le test ajouté au fichier MariaDB existant utilise uniquement deux assets, deux
petits fichiers et une activité jetables :

1. clients A et B chargent la révision N ;
2. A remplace l'authoring, dont segment, annotation, intervalle, couche et
   phénomène, et reçoit N+1 ;
3. B envoie depuis N d'autres valeurs enfants et reçoit `409` ; une relecture
   SQL confirme que toutes les valeurs de B sont absentes et celles de A
   intactes ;
4. B recharge, sauvegarde et reçoit la révision suivante ;
5. absence (`428`), syntaxe/type/ressource invalides (`400`), révision future
   et ancienne (`409`) sont refusés ;
6. une activité supprimée n'est jamais recréée par l'ancien client ;
7. deux assets distincts acceptent leurs mutations indépendamment ;
8. une seconde édition du même asset est refusée, puis acceptée après
   rechargement ;
9. une modification de classement invalide un préflight de suppression : la
   suppression obsolète reçoit `409` et l'asset reste complet ;
10. une erreur forcée après deux instructions du remplacement multi-table
    restaure toutes les tables et la révision ; la mutation suivante réussit.

Les lectures de détail, preview et student restent accessibles sans `If-Match`.
Le test réutilise les projections partagées sans modifier leur contrat jouable.

## Recette Chromium

Trois recettes ont utilisé des entités temporaires distinctives, sans toucher
les quatre activités ou les médias réels :

- deux fiches pédagogiques ont chargé la même révision ; A a enregistré son
  titre, B a reçu l'échec explicite tout en gardant son titre local et le bouton
  de rechargement, puis a sauvegardé après rechargement ;
- deux ateliers auteur ont chargé le même brouillon ; A a enregistré sa
  description, B a conservé sa description locale avec le message complet et
  l'action de rechargement visible, puis a relu A et sauvegardé normalement ;
- deux fiches Vidéo++ ont édité le même asset jetable ; A a enregistré, B a
  conservé son titre local et affiché le dialogue avertissant de la perte des
  saisies au rechargement, puis a sauvegardé après rechargement.

Dans les trois cas, la relecture HTTP a confirmé que la valeur A restait
intacte après la tentative obsolète. Aucune fausse confirmation, disparition de
saisie ou erreur console inattendue n'a été observée. Les pages ont conservé
leur structure et leurs styles existants ; aucun changement visuel général n'a
été introduit. Cette recette de Codex est une preuve technique, pas la
validation humaine de David.

## Nettoyage et non-altération

Le test compare avant et après les cardinalités des 29 tables projetées et
restaure aussi les dates techniques du témoin de projection. Il supprime ses
relations, activités, assets, sources, playables, dossiers, tags et fichiers.

Deux fixtures laissées par des exécutions de développement interrompues ont été
identifiées par leur identifiant exact et leur préfixe `[TEST]`, puis supprimées
avec leur révision courante. Le helper de nettoyage a été corrigé pour relire le
jeton après une sauvegarde d'interface. Les contrôles finaux ont ensuite retrouvé
exactement quatre activités réelles.

La recette Chromium a supprimé son activité, son asset et son fichier physique
jetables. Les trois URI de détail/stream répondent `404`, la bibliothèque expose
zéro titre `[TEST M153]` et aucun onglet de recette ne reste ouvert.
Le serveur `8791` lancé pour la recette a ensuite été identifié par son port et
sa ligne de commande, arrêté, puis le port a été contrôlé comme libre.

Aucun JSON, schéma, migration, donnée ou média réel, FFmpeg, outbox, version,
commit ou push n'a été utilisé ou modifié.

## Résultats automatisés

```text
Test optimiste MariaDB ciblé                         1/1 réussi
mariadb-only-runtime.test.js                         10/10 réussis
Suite Proto05 complète                              115/115 réussis
Fichiers de test suivis                              11
Échecs / tests ignorés                               0 / 0
Syntaxe Node des fichiers JavaScript concernés       valide
git diff --check                                     propre
```

La variation de **114 à 115** correspond exactement au test de concurrence
optimiste ajouté dans `mariadb-only-runtime.test.js`. Les assertions de
navigation existantes ont été enrichies dans leur test actuel sans créer un
second compteur ni retirer de couverture.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/optimistic-concurrency.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `prototypes/05-augmented-ic-video-01/shared/activity-library.js`
- `prototypes/05-augmented-ic-video-01/teacher-edit.html`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `reports/153_proto05_optimistic_concurrency_control_report.md`

## Limites restantes

- Le contrôle détecte et refuse ; il ne fusionne pas les changements. La
  comparaison ou fusion assistée est volontairement hors mission.
- Les référentiels globaux dossiers/tags n'ont pas de révision propre tant
  qu'ils restent des commandes courtes et directes. Une future édition longue
  devra définir son contrat.
- Les suppressions ciblées de copie locale ou de dérivation utilisent leurs
  préflights spécialisés ; elles ne partagent pas le jeton éditorial de l'asset.
- La robustesse à un crash brutal entre suppression physique et commit SQL
  relève du chantier outbox explicitement exclu. Le rollback applicatif existant
  a été conservé.
- La recette automatisée et Chromium ne remplace pas la validation humaine de
  David.

## Recette humaine minimale laissée à David

1. Ouvrir une activité jetable dans deux onglets de l'atelier auteur.
2. Modifier une valeur différente dans chaque onglet, enregistrer A puis B ;
   vérifier que B conserve sa saisie et explique qu'il faut recharger.
3. Recharger B, refaire sa modification et confirmer la sauvegarde normale.
4. Répéter sur une fiche Vidéo++ jetable ; confirmer que le dialogue prévient
   que le rechargement remplacera la saisie locale.
5. Supprimer les deux fixtures et confirmer qu'elles ne figurent plus dans les
   bibliothèques.

## Proposition de message de commit

```text
fix(proto05): reject stale activity and media writes
```
