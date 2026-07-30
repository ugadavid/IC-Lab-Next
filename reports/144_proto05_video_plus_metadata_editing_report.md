# Mission 144 — Fiche Vidéo++ : identité, provenance et édition

Date : 30 juillet 2026  
Prototype : Proto05  
Version applicative : `0.1.48` (inchangée)

## Périmètre

La mission a porté sur l’audit du modèle vidéo existant, la séparation des
informations éditoriales et techniques, l’édition de la fiche vidéo, sa
persistance JSON et MariaDB, la compréhension préalable d’une suppression et
la correction d’incohérences visibles de la vidéothèque.

Aucun identifiant, fichier physique, `storageKey`, lien de filiation, traitement,
média ou activité canonique n’a été renommé ou supprimé. Aucun commit ni push
n’a été effectué.

## Précautions initiales

- La Mission 143 était commitée au démarrage dans `8f58440`
  (`fix(proto05): unify teacher dialogs and guided deletion feedback`).
- Le dépôt n’était pas strictement propre : une modification préexistante de
  David était présente dans
  `prototypes/05-augmented-ic-video-01/data/video-library.json`.
- Ce fichier n’a pas été utilisé comme témoin de recette ni réécrit par la
  mission. Son SHA-256 est resté
  `2F5B72AE4A58E4D28F6688EF82E8051523129F8307ACB9F7DFD427F9F20FA729`.
- La recette MariaDB a utilisé la vidéo de test existante
  `media-proto05-video-proto05-youtube-fg4h0-v3otk`, sans activité associée.
  Toutes les valeurs temporaires ont été restaurées.
- Avant l’évolution du schéma, une sauvegarde de `media_assets` a été créée
  dans le conteneur local sous `/tmp/mission144_media_assets_before.sql`
  (SHA-256 :
  `d53017cbd465d6af3ff4f0208a90f283cd227985adc12b99b5964680e7dbddd5`).

## Audit du modèle réellement présent

### Identité éditoriale humaine

- `media_assets.title` reste le titre logique principal.
- `media_assets.description` reste la description éditoriale dédiée.
- Le dossier et les tags conservent leurs relations existantes.
- Les nouveaux champs d’usage, contexte, responsable, date, langues et notes
  sont regroupés dans `editorialMetadata`.

### Provenance et droits déclarés

- La provenance et l’URL d’origine saisies par un humain sont conservées dans
  `asset.provenance.declared`.
- La licence, le consentement, les restrictions et la confidentialité restent
  dans `asset.rights`.
- Une valeur absente est présentée comme non renseignée ; elle ne produit
  aucune affirmation implicite de droit, de consentement ou de publication.

### Informations techniques et physiques

Le nom physique, le MIME, la durée, les dimensions, la taille, le hash,
l’existence locale et la date d’import sont projetés depuis les sources et
playables. Ils sont en lecture seule dans la fiche.

### Filiation et travail média

Le parent, la racine de famille, les dérivés, les traitements, les accès
publiés et les activités utilisatrices sont calculés depuis les relations
canoniques. L’édition de la fiche ne peut pas les modifier.

## Évolution MariaDB

La migration `006_proto05_video_plus_metadata_schema.sql` ajoute uniquement
`media_assets.editorial_metadata_json`, nullable, avec une contrainte
`JSON_VALID`. Les 16 assets existants sont restés valides et n’ont pas été
réécrits.

Répartition obtenue :

- colonnes dédiées : titre et description ;
- colonne JSON éditoriale : usage, contexte, responsable, date, langues,
  notes ;
- colonnes JSON existantes : provenance déclarée et droits ;
- relations existantes : dossier et tags ;
- sources, playables et traitements inchangés.

La lecture MariaDB ne matérialise `editorialMetadata` que lorsque la colonne
est renseignée, afin de préserver l’équivalence des anciens documents. Le
writer transactionnel inclut la nouvelle colonne et conserve sa relecture
sémantique avant commit.

## Réalisation

### Contrat et API

- Un contrat partagé définit les vocabulaires d’usage et de confidentialité,
  les limites, la normalisation et les erreurs champ par champ.
- `PUT /api/proto05/library/assets/:id/metadata` enregistre les informations
  éditoriales, déclaratives et de classement.
- Le titre est projeté de la même autorité vers la fiche, la vidéothèque, le
  catalogue historique et les sélecteurs d’activité.
- Une description vidée est réellement retirée du document canonique et devient
  `NULL` en MariaDB.
- Une erreur de validation n’effectue aucune écriture et restitue les champs
  concernés.

### Fiche Vidéo++

La fiche distingue visuellement :

- identité éditoriale ;
- provenance et droits ;
- informations techniques et filiation ;
- sources et copies de travail ;
- dérivations ;
- versions publiées ;
- accès historiques non qualifiés ;
- activités utilisatrices ;
- actions générales.

Le mode édition propose sauvegarde et annulation, conserve les valeurs
invalides, marque les champs concernés et protège l’abandon par le dialogue
partagé de la Mission 143. Les sections secondaires sont repliables et
l’affichage reste utilisable sur une largeur étroite.

### Dialogue de suppression

Avant toute confirmation, le dialogue affiche le titre, le nom physique,
l’usage, la famille, les nombres de sources, dérivés, versions publiées et
activités, la présence physique et la portée exacte. Le retrait du catalogue
est distingué d’une éventuelle suppression physique. Aucun nouveau mécanisme
de suppression de fichier n’a été introduit.

### Incohérences corrigées

- Les accès historiques sans rôle ne sont plus affichés comme des versions
  publiées.
- Le nombre de versions publiées correspond aux cartes de la section publiée.
- Le rôle technique `untag` reste préservé mais n’est plus présenté comme une
  étiquette éditoriale.
- La durée technique utilise un playable renseigné lorsque le playable par
  défaut ne possède pas cette donnée.
- Les activités utilisatrices utilisent le contrat actuel `usage.activities`.
- Les métadonnées techniques brutes sont présentées avec des libellés humains.

## Vérifications automatisées

- Validation syntaxique Node de `server.js`.
- 7 tests Vidéo++ en mode MariaDB réel : contrat, compatibilité, persistance
  JSON, refus sans écriture, UI statique, syntaxe des scripts intégrés,
  persistance MariaDB et restauration du témoin.
- 80 tests historiques de contrat média, persistance, classement, suppression
  et navigation enseignante.
- 16 tests de frontière de données, écriture transactionnelle, comparaison et
  projection vidéo.
- Recette SQL `008_proto05_video_plus_metadata_schema_validation.sql` :
  colonne, contrainte et lignes existantes validées.
- `git diff --check`.

Les tests couvrent également :

- la propagation du titre dans la liste et le catalogue/sélecteur ;
- la persistance après redémarrage ;
- l’effacement réel d’une description ;
- la préservation du nom physique, des origines, localisations, identifiants et
  relations de filiation ;
- le refus d’une URL de provenance invalide sans écriture ;
- l’absence de dialogue natif dans les deux surfaces vidéo.

## Recette interactive réalisée

En mode `mariadb`, la fiche de la vidéo de test a été modifiée depuis
l’interface réelle, enregistrée, rechargée, observée dans la vidéothèque et
dans `/teacher/create`, puis relue après redémarrage du serveur.

Ont également été contrôlés :

- annulation d’une modification avec le dialogue partagé ;
- dialogue de suppression détaillé, annulé sans appel destructif ;
- affichage du formulaire à 375 px sans débordement horizontal ;
- absence d’erreur ou d’avertissement dans la console ;
- retour complet du témoin à son titre, sa description, son profil éditorial,
  ses droits, sa provenance, son classement et ses dates initiaux.

Après nettoyage, MariaDB contient de nouveau 16 assets, 19 sources,
19 playables et 2 traitements, avec zéro `editorial_metadata_json` temporaire.

Cette recette de Codex ne vaut pas validation humaine de David.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/shared/video-metadata-contract.js`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/media-library-runtime.js`
- `prototypes/05-augmented-ic-video-01/server/media-library-schema.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/test/video-metadata.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/proto05-data-read-boundary.test.js`
- `prototypes/05-augmented-ic-video-01/database/migrations/006_proto05_video_plus_metadata_schema.sql`
- `prototypes/05-augmented-ic-video-01/database/tests/008_proto05_video_plus_metadata_schema_validation.sql`
- `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `reports/144_proto05_video_plus_metadata_editing_report.md`

Le changement préexistant de
`prototypes/05-augmented-ic-video-01/data/video-library.json` reste hors
mission et n’est pas inclus dans cette liste de réalisation.

## Non vérifié et limites

- Aucune suppression réelle d’entrée ou de fichier n’a été exécutée.
- Aucun fichier média n’a été renommé ou déplacé.
- La validation humaine finale et la décision de commit restent à David.
- La sauvegarde SQL de précaution reste disponible dans le conteneur local pour
  un retour arrière humain si nécessaire.

## Recette humaine minimale proposée

1. Ouvrir une vidéo de test dans la vidéothèque et consulter les quatre
   catégories de la fiche.
2. Modifier un titre, un usage et une information de provenance, enregistrer,
   puis recharger.
3. Vérifier le titre dans la vidéothèque et dans le sélecteur d’une activité.
4. Modifier à nouveau un champ puis annuler et confirmer l’abandon.
5. Ouvrir le dialogue de retrait, lire sa portée, puis l’annuler.
6. Contrôler une fois la fiche sur une largeur étroite.

## Message de commit proposé

`feat(proto05): add editable Video++ metadata profile`
