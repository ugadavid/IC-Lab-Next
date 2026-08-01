# Mission 165 — Nettoyer les médias fantômes de Proto05

## Périmètre et état initial

La mission a porté exclusivement sur les trois disponibilités locales erronées
confirmées par l’audit 163 et la Mission 164. Le dry-run frais effectué avant
toute mutation retrouvait exactement ces trois cibles, sans quatrième anomalie
ni refus, avec le hash
`08a3e2965068c3222c2a85bf9f134035f4eb2f8249397e021135e221a7b60e06` :

- la copie locale absente de la vidéo 1 ;
- une dérivation audio absente de la vidéo 2 ;
- une dérivation visuelle absente de la vidéo 2.

La vidéo 1 ne possédait aucune activité, traitement, plan audio, dérivation
active ni ressource physique exploitable. La vidéo 2 conservait une copie de
travail saine, une dérivation visuelle saine, une activité brouillon, un plan
audio de deux passages et les traitements légitimes correspondants.

Un snapshot cohérent préalable, ignoré par Git, a été conservé sous
`temp/mission165_before_cleanup_snapshot.json` (221241 octets, SHA-256
`336636d5dd17bff4d1be1a0a56f3a74ed709f6fb7754d7662a44a6f633570642`).
Un témoin du registre avant migration a également été conservé sous
`temp/mission165_schema_registry_before_005.json` (531071 octets, SHA-256
`459e3ecae8072d7946045b53790310c2bb829cf8e849ed4272f43d49f26635c6`).
Aucun secret n’est présent dans ce rapport.

## Migration additive 005

Le schéma 004 ne permettait pas de supprimer canoniquement un traitement
terminal isolé avec son playable de sortie absent : la procédure de suppression
d’une copie de travail protégeait correctement la référence du traitement et la
suppression de l’asset entier aurait détruit les éléments sains de la vidéo 2.

La migration additive minimale 005 ajoute donc
`sp_media_terminal_output_delete`. Cette procédure transactionnelle :

- exige un traitement terminal et la correspondance exacte asset/traitement/playable ;
- limite l’opération à une sortie locale de rôle `derivation-local` ;
- bloque toute activité, autre traitement, plan audio ou stockage partagé ;
- retire le traitement, le playable, ses opérations de stockage et sa source
  uniquement lorsque celle-ci n’est plus utilisée ;
- recalcule le playable par défaut sans altérer l’asset conservé.

Le plan réel, inspecté avec le compte applicatif puis le compte administrateur,
ne contenait que 005. Son hash était
`af7d1b04518f8a3ea6a3effe9b437e17aebd52b1d589cf73abe84aaf713aa9ad`,
son checksum SQL
`4ebb475a9efc90a1102eb947996c9e22c90da2f11afd299a4ca88b45a9a88cc7`
et son empreinte de schéma attendue
`e59fe00d3bdea2318fefb322fd44c404eb1bfdc894ebdc7f205fe37223668066`.
La migration autorisée a été appliquée avec succès. La vérification finale
confirme la version de schéma `005`, cinq migrations enregistrées et 49
procédures. Les migrations 001 à 004 sont byte-for-byte inchangées dans Git.

Le writer MariaDB associe désormais une suppression de traitement terminal à
sa sortie locale supprimée et invoque cette procédure avant les suppressions de
copies de travail ordinaires.

## Nettoyage réel

Chaque mutation a été précédée d’une nouvelle lecture des dépendances et d’un
préflight frais.

### Vidéo 1

L’asset `media-proto05-remote-ref-40a71fc0179ee61ada88dbd7`, sa source, son
playable fantôme et leurs métadonnées ont été supprimés par la procédure
canonique de retrait d’asset. L’API de détail répond désormais 404 et aucun
fichier sain n’a été supprimé. Son répertoire résiduel est absent.

### Vidéo 2

Les deux sorties absentes et leurs traitements terminés ont été supprimés
transactionnellement :

- `video-audio-derivation-1785529576378-59a5391d` avec le traitement
  `audio-derivation-1785529576378-59a5391d` ;
- `video-hls-temporal-derivation-1784996884534-a240cc7c` avec le traitement
  `hls-temporal-derivation-1784996884534-a240cc7c`.

Ont été conservés et revérifiés : l’asset de la vidéo 2, sa copie de travail,
sa dérivation visuelle saine, son activité brouillon, son traitement légitime,
son plan audio et ses deux passages. Les deux fichiers sains correspondent à
leur taille et à leur empreinte enregistrées et répondent correctement à une
lecture HTTP partielle (`206`).

Sous Windows, les deux répertoires de dérivation déjà vides ne disparaissaient
pas avec l’ancien appel non récursif. Ils ont été retirés de manière bornée et
le serveur utilise maintenant le nettoyeur prudent de parents vides déjà
présent dans Proto05. Le test applicatif couvre également ce cas. Aucun fichier
physique sain n’a été déplacé ou supprimé.

## Intégrité et contrôles

La relecture SQL finale donne zéro ligne pour l’asset supprimé, les trois
playables fantômes et les deux traitements supprimés. Pour la vidéo 2, elle
confirme un asset, un lien d’activité, un traitement, un plan audio et deux
passages. Les recherches d’orphelins sont toutes à zéro pour les sources,
playables, métadonnées, liens d’activité, traitements, plans audio, passages et
opérations de stockage.

Le dry-run final est vide : 19 playables inspectés, 11 locaux, 11 inchangés,
aucune disponibilité à dégrader, aucun refus et hash
`912fda652f587c4353250bf0e216eb8deece159928ae457d658fa165806fcd64`.

Contrôles exécutés :

- tests du registre et des procédures : 15/15 réussis ;
- tests transactionnels de finalisation/suppression : 5/5 réussis ;
- tests ciblés contrats média, disponibilité et workspaces : 75/75 réussis ;
- syntaxe Node des fichiers concernés : réussie ;
- vérification réelle du schéma 005 : réussie ;
- `git diff --check` : réussi.

Après redémarrage du serveur en version `0.1.57`, la recette visuelle a vérifié
la vidéothèque et la fiche de la vidéo 2 en 1440 × 900 puis en 390 × 844 :

- 13 cartes sur 13, vidéo 1 absente et vidéo 2 présente ;
- fiche vidéo 2 avec trois accès seulement : référence distante, copie de
  travail et unique dérivation saine ;
- activité et plan audio toujours visibles ;
- aperçu de la copie saine chargé sans erreur (`readyState` 4) ;
- aucun débordement horizontal et aucune erreur ou alerte console.

Cette recette technique ne remplace pas la validation humaine de David. La
recette humaine minimale restante consiste à ouvrir la vidéothèque, confirmer
l’absence de la vidéo 1, puis ouvrir et lire la copie de travail de la vidéo 2
en vérifiant son activité et son plan audio.

## Fichiers concernés, version et état Git

Fichiers créés :

- `database/schema-migrations/005_proto05_terminal_output_delete.sql` ;
- `database/schema-migrations/005_proto05_terminal_output_delete.manifest.json` ;
- `reports/165_proto05_media_ghost_cleanup_report.md`.

Fichiers modifiés :

- `database/schema-migrations/manifest.json` ;
- `server/proto05-mariadb-write.js` ;
- `server/server.js` ;
- `server/test/schema-migrations.test.js` ;
- `server/test/library-download-finalization.test.js` ;
- `server/package.json` ;
- `server/README.md` ;
- `ANONYMIZATION_ENGINE.md` ;
- `teacher-video-detail.html`.

Proto05 passe de `0.1.56` à `0.1.57`, conformément à la convention de baby
steps pour cette correction applicative et transactionnelle. Aucun commit ni
push n’a été effectué.

Proposition de message de commit :

`fix(proto05): nettoyer les références média fantômes`
