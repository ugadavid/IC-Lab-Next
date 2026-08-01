# Mission 164 — Fiabiliser les suppressions et supprimer les abandons silencieux

## Conclusion

La Mission 164 est terminée. La migration additive 004 a été appliquée à
`ic_augmented_video` avec le plan expressément autorisé, puis vérifiée avec le
compte applicatif. Le cycle ciblé de suppression, les tests transactionnels, le
dry-run des disponibilités et la recette visuelle ordinateur/mobile sont
concluants.

Les médias réels 1 et 2 n’ont été ni supprimés, ni réparés, ni modifiés. Les
trois disponibilités erronées n’ont pas été corrigées : elles restent seulement
décrites par le dry-run. Aucun compte ni privilège n’a été modifié. Aucun commit
ni push n’a été effectué.

Version obtenue : `0.1.56`.

## Défauts établis et corrections

### Suppression d’une copie de travail

Le writer pouvait accepter une suppression de copie sans retirer son playable
et sa source, car aucune procédure canonique ne couvrait cette mutation sur un
asset conservé. La migration 004 ajoute uniquement
`sp_media_working_copy_delete`. La procédure :

- accepte une copie locale active du rôle attendu ;
- bloque les activités, traitements, plans audio, passages et stockages
  partagés ;
- réaffecte le playable par défaut lorsque cela est nécessaire ;
- retire transactionnellement l’opération de stockage, le playable et la source
  devenue inutilisée ;
- permet la suppression logique lorsque le fichier physique a déjà disparu ;
- ne modifie aucune migration 001–003.

Le writer appelle désormais cette procédure au lieu de contourner la frontière
MariaDB par un `DELETE` applicatif direct.

### Préflight et retours utilisateur

- les cartes et la fiche envoient un `If-Match` frais ;
- le préflight est relu juste avant la confirmation ;
- les dépendances bloquantes couvrent les activités, toutes les relations de
  traitement, les dérivations, les plans audio, leurs passages et le stockage
  partagé ;
- les fichiers locaux sont distingués en présent, absent ou erreur d’accès ;
- une ressource réellement disponible est privilégiée pour le résumé technique ;
- le lecteur n’annonce plus un aperçu chargé avant un signal de lecture réel ;
- les refus, absences et erreurs concernés produisent un message visible et
  exploitable ;
- les retours d’action des cartes et de la fiche sont ramenés au centre de la
  zone visible, y compris sur mobile.

Les protections contre la destruction d’une ressource partagée ou encore
référencée sont conservées.

## Migration 004

### Préflight autorisé

Juste avant l’application, le runner a confirmé :

- base cible : `ic_augmented_video` ;
- registre courant : 001–003 ;
- seule migration en attente : 004 ;
- état initial : 34 tables et 47 routines ;
- hash exact du plan :
  `3a219f9edcbecea1268299c67b1b53b592575fc3ea34f464d143113b805d48bd` ;
- checksum de 004 :
  `fc49a2f889818118f43aee232b6e04ef99f7e5e0c50815df31566a0b5485888c`.

Le témoin de retour arrière est conservé dans le répertoire temporaire ignoré
par Git sous `temp/mission164_schema_registry_before_004.json` (526753 octets,
SHA-256 `c30fce646c5b267987f547e4ead7117cc59bb1272b31aa963b908eab0d852958`).

### Application et vérification

Une première tentative avec le compte applicatif avait échoué proprement avant
toute DDL (`completedStatements: 0`, `partialDdlPossible: false`) faute du droit
de création de routine. Après la nouvelle autorisation de David, le runner a
utilisé uniquement les variables administrateur déjà présentes dans la
configuration locale non versionnée. Leur valeur n’a été ni affichée, ni
journalisée, ni écrite dans le dépôt.

L’application suivante a réussi sans divergence :

- seule 004 a été appliquée ;
- registre final : 001–004 ;
- 34 tables et 48 routines ;
- aucune migration en attente ;
- empreinte canonique finale :
  `f9db4299e41b31939e00af2e64f71c3ccd4a7babee2a885b5db8cb748a110a3b`.

La commande de vérification exécutée avec le compte applicatif confirme
`schemaVersion: 004`, quatre migrations et cette même empreinte. Aucun retour
arrière n’a été nécessaire.

## Dry-run des disponibilités

Le dry-run réel, strictement sans écriture, reste inchangé après la migration :

- 23 playables inspectés, dont 14 locaux ;
- 11 états locaux cohérents et inchangés ;
- 3 playables déclarés disponibles dont le fichier est absent ;
- 3 propositions vers `missing-local / missing-file` ;
- 0 refus et 0 écriture appliquée ;
- hash du plan :
  `08a3e2965068c3222c2a85bf9f134035f4eb2f8249397e021135e221a7b60e06`.

Le rapport ne révèle aucun chemin physique. Les trois lignes réelles restent
inchangées conformément à la mission.

## Contrôles automatisés

- validation syntaxique Node des sources concernées : réussite ;
- contrats média, disponibilités et navigation ciblée : 75/75 ;
- tests transactionnels de finalisation et suppression : 4/4 ;
- installation 001–004 sur une base éphémère : réussite, registre 004 et
  48 routines ;
- suppression transactionnelle d’une copie physiquement absente : réussite,
  sans altération des autres accès ;
- rollback, nettoyage, reprise immédiate et collision de destination : réussite ;
- vérification canonique de la base réelle : réussite ;
- `git diff --check` : réussite ; seuls les avertissements Git habituels de
  conversion LF/CRLF sont présents.

Les fixtures transactionnelles et leurs fichiers ont été nettoyés par les
tests. Aucune donnée temporaire de recette ne subsiste.

## Recette visuelle non destructive

Un serveur isolé utilisant le code courant a été lancé sur un port dédié puis
arrêté à la fin de la recette.

Sur ordinateur :

- une ressource locale absente affiche explicitement
  « Aperçu indisponible : le fichier local est absent » ;
- aucun faux message « Aperçu chargé » n’est présenté ;
- le préflight de la copie de travail du média réel 2 énumère précisément
  l’activité et les tentatives qui bloquent la suppression ;
- aucun dialogue de confirmation destructive n’est ouvert après ce refus.

Sur mobile, à 390 × 844 :

- le même refus est entièrement visible dans la fenêtre ;
- le message identifie les dépendances ;
- aucun débordement horizontal n’est observé ;
- aucun dialogue destructif n’est ouvert.

La console navigateur ne contient aucune nouvelle erreur ni alerte. Cette
recette a uniquement déclenché des lectures et un préflight refusé : aucun clic
de confirmation ni aucune mutation du média réel n’a eu lieu. Elle ne remplace
pas la validation humaine de David.

## Fichiers concernés

- migration :
  `database/schema-migrations/004_proto05_working_copy_delete.sql`,
  `004_proto05_working_copy_delete.manifest.json`, `manifest.json` ;
- serveur : `server/server.js`, `server/proto05-mariadb-write.js`,
  `server/media-deletion-preflight.js`, `server/schema-migrations.js` ;
- dry-run : `server/local-media-availability-reconciliation.js`,
  `server/scripts/local-media-availability-dry-run.js` ;
- interface et lecteur : `teacher-videos.html`, `teacher-video-detail.html`,
  `shared/ic-video-player.js` ;
- tests ciblés : contrats média, disponibilités, workspaces, finalisation et
  migrations ;
- version et documentation technique : `server/package.json`,
  `server/README.md`, `ANONYMIZATION_ENGINE.md`.

## Limites et validation humaine minimale

Le nettoyage réel des médias 1 et 2 et l’application des trois corrections de
disponibilité restent volontairement hors périmètre. David peut valider
manuellement, sans confirmer de suppression, qu’un média bloqué affiche toutes
ses dépendances et qu’une ressource absente ne produit plus de faux succès
d’aperçu.

Proposition de message de commit :

`fix(proto05): fiabiliser le préflight et la suppression des copies média`
