# Mission 156 — Atelier autonome d’anonymisation audio multi-zones

Date : 31 juillet 2026  
Prototype : Proto05 — Vidéo augmentée  
Version : `0.1.49` → `0.1.50`  
Statut : implémentation, migration additive, tests automatisés et recette visuelle Codex terminés  
Validation humaine : à réaliser par David selon la recette minimale de fin de rapport

## 1. Résultat

Proto05 possède désormais un atelier d’anonymisation audio distinct de l’atelier
visuel. Il permet de préparer, sauvegarder, reprendre et exécuter un plan de
passages temporels en remplaçant intégralement le signal original par une
tonalité douce, un bip ou du silence.

Le résultat est enregistré comme une dérivation canonique dans la famille du
média source. Le parcours accepte une copie de travail, une source distante
préparable ou une dérivation locale ; les enchaînements audio → image et image →
audio ont été exécutés sur une base MariaDB isolée.

La migration additive `003` a été appliquée uniquement à
`ic_augmented_video`, après autorisation explicite de David. Les migrations
`001` et `002` et leurs checksums n’ont pas été modifiés.

## 2. État initial et sources inspectées

L’état initial réellement constaté était le suivant :

- Git propre au départ de la mission ;
- version Proto05 `0.1.49` ;
- MariaDB exclusive, registre canonique arrêté à `002` ;
- atelier visuel déjà relié à la vidéothèque, à la préparation locale, à
  FFmpeg, au suivi des traitements et aux dérivations ;
- aucune table, procédure, route ni interface consacrée à un plan audio ;
- cardinalités réelles : 4 activités, 9 assets, 15 sources, 15 playables et
  4 traitements.

Ont été lus avant l’implémentation : les instructions canoniques du dépôt, les
documents d’architecture et de reprise, les rapports 088 à 096 pertinents, les
rapports d’intégration de la vidéothèque et des médias, les rapports 154, 154B
et 155, l’atelier visuel complet, le runtime FFmpeg, les frontières MariaDB, le
runner de migrations, les procédures canoniques, les tests et l’historique Git
utile.

## 3. Cartographie de réutilisation

| Catégorie | Décision |
|---|---|
| Réutilisé tel quel | préparation locale HLS/fichier, résolution sécurisée des médias, lancement FFmpeg, lecture de progression, annulation, nettoyage des sorties incomplètes, modèle asset/source/playable/treatment, service de fichiers avec Range, shell enseignant et fiche média |
| Généralisé | persistance canonique ciblée d’un traitement et de sa sortie ; elle passe désormais par les procédures `sp_media_inline_treatment_start` et `sp_media_inline_treatment_complete` pour les dérivations audio et visuelles |
| Resté spécifique à l’image | masques, coordonnées, dimensions, keyframes, interpolation et graphe vidéo de floutage |
| Créé pour l’audio | modèle du plan et des passages, validation temporelle, graphe audio, aperçu local, routes du plan et du traitement, atelier séparé, tables et procédures audio |

Aucune abstraction d’interface commune prématurée n’a été introduite. Les deux
ateliers partagent l’infrastructure de préparation, de traitement et de modèle
média, mais conservent des plans et des interfaces spécialisés.

## 4. Architecture réalisée

### 4.1 Frontière applicative

Node valide et orchestre. Les écritures métier sont réalisées par procédures
stockées dans une transaction de la frontière MariaDB existante, avec verrou
applicatif, isolation sérialisable, marqueur de transaction et restauration en
cas d’erreur.

Les opérations exposées couvrent :

- lecture d’un plan par identifiant ou par couple asset/playable ;
- sauvegarde optimiste du plan avec révision attendue ;
- démarrage d’un traitement canonique ;
- mise à jour de son état et de sa progression ;
- finalisation atomique de la source, du playable, des métadonnées techniques,
  de la filiation et du traitement.

La projection de lecture a été corrigée pour relire les localisateurs réels des
playables créés par les nouvelles procédures, sans dépendre d’un ancien
snapshot de migration JSON.

### 4.2 Routes et interface

La route enseignante séparée est :

```text
/teacher/audio-anonymization/:jobId
```

La fiche média présente deux actions explicites :

- `Anonymiser l’image` ;
- `Anonymiser le son`.

L’atelier audio fournit le lecteur, le temps courant, les bornes éditables, la
capture des bornes au curseur, le type de remplacement, le libellé et la raison,
la liste triée, la sélection, l’atteinte du passage, la modification, la
suppression, le nombre de passages, la durée masquée, les états enregistré/non
enregistré, l’aperçu original/anonymisé, la sauvegarde, le lancement, la
progression, l’annulation et l’accès au résultat.

## 5. Modèle et règles du plan audio

Deux nouvelles tables portent le modèle :

- `media_audio_anonymization_plans` : source asset/playable, durée, révision
  optimiste, dernier traitement, dates ;
- `media_audio_anonymization_passages` : identifiant stable, ordre, début et fin
  en millisecondes entières, type, libellé, raison et dates.

Règles appliquées à la fois dans Node et dans la procédure de sauvegarde :

- début positif ou nul ;
- fin strictement postérieure au début et inférieure ou égale à la durée ;
- nombres finis normalisés en millisecondes ;
- identifiants uniques ;
- tri déterministe par début, fin et identifiant ;
- maximum explicite de 200 passages par plan ;
- intervalles demi-ouverts `[début, fin)` ;
- contiguïté autorisée ;
- tout chevauchement refusé avant FFmpeg, quel que soit le type, avec un message
  utilisateur précis.

La révision optimiste empêche qu’une sauvegarde périmée écrase silencieusement
une version plus récente du plan.

## 6. Traitement FFmpeg

Le moteur construit une chronologie audio complète à partir des passages
triés : segments originaux hors zones, segments synthétiques ou silencieux dans
les zones, puis concaténation dans l’ordre.

Choix retenus :

- `soft-tone` : combinaison douce de 196 Hz et 246,94 Hz à faible niveau ;
- `beep` : sinus de 880 Hz à niveau maîtrisé ;
- `silence` : source `anullsrc` ;
- fondus très courts à l’entrée et à la sortie des remplacements ;
- sortie audio AAC, stéréo, 48 kHz, 192 kbit/s ;
- copie du flux vidéo (`-c:v copy`) puisque le traitement ne modifie pas
  l’image ;
- première piste audio explicite `0:a:0`, refus clair lorsque le média ne
  contient aucune piste audio ;
- durée et synchronisation conservées par le découpage temporel et la
  concaténation déterministes.

Le son original n’est pas simplement couvert : il est exclu du graphe pendant
chaque passage et remplacé par une nouvelle source audio.

## 7. Aperçu

L’aperçu est local au lecteur et permet de basculer entre son original et effet
anonymisé, d’atteindre le passage sélectionné et de passer au passage précédent
ou suivant. Il reproduit les bornes et le type d’effet, puis restaure l’état
normal hors passage.

La page indique explicitement que l’export FFmpeg reste la référence exacte.
L’aperçu Web Audio et l’export FFmpeg sont sémantiquement équivalents, mais ne
sont pas bit à bit identiques.

## 8. Migration additive 003

### 8.1 Artefacts

La migration ajoute uniquement :

- 2 tables : `media_audio_anonymization_plans` et
  `media_audio_anonymization_passages` ;
- 4 procédures :
  - `sp_audio_anonymization_plan_get` ;
  - `sp_audio_anonymization_plan_save` ;
  - `sp_media_inline_treatment_start` ;
  - `sp_media_inline_treatment_complete`.

Topologie canonique obtenue : 34 tables, 293 colonnes, 95 index, 51 clés
étrangères, 74 contraintes `CHECK` et 47 routines.

### 8.2 Préflight, application et retour arrière

Le témoin de registre préalable a été conservé dans le répertoire ignoré
`database/backups/mission-156-before-003-registry.json`, avec le SHA-256 :

```text
2a40cc4b84bd608877e4fc6c6297e31916ea5bd110ce2f654ae9596627107de9
```

Hash du plan autorisé :

```text
41d86e07a8b2d574abce8f02b7ceb91c5d17eb582a902dddbc9ce8130ecaecf6
```

Le compte applicatif a d’abord été essayé volontairement : ses grants ont
refusé le DDL avant toute instruction, ce qui confirme la séparation des
privilèges.

Lors de la première exécution administrative, MariaDB a créé les seuls objets
de `003`, puis le runner a refusé d’inscrire le registre : le compte
administratif ajoutait `IGNORE_SPACE` au `sql_mode` des routines, contrairement
au manifeste déterministe. Les deux nouvelles tables étaient vides, le registre
était toujours à `002` et aucune cardinalité historique n’avait changé. Le
retour arrière prévu a donc supprimé exclusivement les quatre procédures et les
deux tables nouvelles, après vérification de leur vacuité.

Le runner d’application et le reconstructeur de manifeste fixent désormais un
`sql_mode` de session déterministe :

```text
STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION
```

La seconde application administrative a réussi. Vérification finale :

```text
schemaVersion      003
schemaFingerprint  77c816f77ab229590f28037e5e17439129a20159f923a87b19d92ea4c66b01f3
migrationCount     3
```

Checksums du registre réel :

```text
001  2c97057604cd5ffdc8fda582bafaa88b1990e36a090346c683eee16d066be191
002  fc08300a464487025e6a9a9f5c207f879b5635465e505f78f084aca3e8806d53
003  0d0b55c6b5abb1e98594e2817cc721ce788253f7c2a67453a835490a97515c14
```

## 9. Tests automatisés

### 9.1 Plan, média réel et parcours isolé

`node --test test/audio-anonymization.test.js` : **5/5**.

Les assertions couvrent notamment :

- tri, identifiants, contiguïté et frontière demi-ouverte ;
- bornes nulles, dépassement, doublons et chevauchements ;
- sauvegarde, rechargement, modification, suppression et conflit de révision ;
- redémarrage serveur ;
- dérivation, Range HTTP 206 et filiation SQL ;
- audio → visuel → audio ;
- annulation et absence de sortie faussement disponible ;
- rejet d’une vidéo sans piste audio ;
- nettoyage de la base, de l’utilisateur, des médias et des workspaces isolés.

La fixture FFmpeg contient une image H.264 et un signal original à 440 Hz. Les
analyses portent sur les échantillons PCM réellement produits :

- énergie 440 Hz conservée hors passages ;
- énergie 440 Hz fortement supprimée dans la tonalité douce ;
- énergie 196 Hz dominante dans `soft-tone` ;
- énergie 880 Hz dominante dans `beep` ;
- RMS inférieur à `0,001` dans `silence` ;
- sortie vidéo toujours H.264, audio AAC et durée à moins de 50 ms de la fixture
  de 6 secondes.

### 9.2 Registre et schéma

`node --test test/schema-migrations.test.js` : **14/14**.

La suite couvre installation vide, baseline/adoption contrôlée, deuxième
passage idempotent, migration en attente, divergence de colonne/défaut/index/FK,
inventaire de routines incomplet, routine divergente, visibilité, concurrence,
échec DDL honnête, probe de démarrage et persistance transactionnelle des plans
audio et traitements.

### 9.3 Navigation et non-régression globale

- `teacher-ui-navigation.test.js` : **10/10** ;
- suite Proto05 complète `npm test` : **135/135**, 0 échec, 0 test ignoré,
  **39,4 s** ;
- syntaxe Node : **14 fichiers vérifiés** ;
- vérification du registre réel : réussie ;
- `git diff --check` : réussi, uniquement les avertissements de fin de ligne
  Windows déjà attendus.

La suite complète inclut les témoins historiques de l’atelier visuel, des
masques, keyframes, dérivations, médias, lectures MariaDB, diagnostics,
concurrence, préflight et navigation. Le test audio exécute en plus une vraie
dérivation visuelle à partir d’une sortie audio et une dérivation audio à partir
d’une sortie visuelle.

Une fuite de processus propre au harnais Windows a été découverte pendant le
contrôle final : `taskkill` terminait le processus serveur, mais le test
n’attendait pas/libérait pas son handle Node. Le helper attend désormais la
sortie, détruit ses pipes et libère le handle. La suite individuelle puis la
suite complète quittent normalement.

## 10. Recette visuelle Codex

Recette exécutée dans le navigateur intégré sur le serveur réel en lecture,
sans sauvegarder de plan dans les données de David :

- ouverture de la vidéothèque et d’une fiche vidéo ;
- présence des actions distinctes `Anonymiser l’image` et `Anonymiser le son`
  sur la copie de travail et les dérivations ;
- préparation d’une vidéo et ouverture de l’atelier audio séparé ;
- identité du média et durée affichées ;
- ajout local d’un passage `RECETTE-M156`, 1–3 s, type bip ;
- tentative 2–4 s refusée avec le message de chevauchement ;
- passage adjacent 3–4 s accepté ;
- modification en `silence` avec nouveau libellé ;
- suppression indépendante, le premier passage restant présent ;
- état `Modifications non enregistrées` cohérent ;
- affichage bureau et mobile 390 × 844 sans débordement horizontal ;
- aucune erreur console.

L’absence de mutation pendant cette recette visuelle est volontaire. La
sauvegarde, le redémarrage, l’export et les enchaînements ont été prouvés dans la
recette HTTP/FFmpeg sur MariaDB isolée.

## 11. Performances observées

- traitement objectif FFmpeg d’une fixture de 6 s : environ **0,53 à 0,55 s** ;
- parcours HTTP/MariaDB/FFmpeg isolé complet : environ **5,7 s** ;
- suite Proto05 complète : **39,4 s**.

Le flux vidéo est copié lors d’une dérivation audio. Aucune régression majeure
de la durée de la suite ni du parcours visuel n’a été constatée.

## 12. Nettoyage et non-altération

Après toutes les validations :

```text
activities                           4
media_assets                         9
media_sources                       15
media_playables                     15
media_treatments                     4
media_audio_anonymization_plans      0
media_audio_anonymization_passages   0
```

- aucune activité `[TEST M150]`, `[TEST M152]` ou `[TEST M156]` ;
- aucune base ni aucun utilisateur `proto05_m156_*` ;
- aucun serveur Proto05 de test ;
- aucun processus FFmpeg Proto05 ;
- aucun workspace temporaire créé pendant la Mission 156 ;
- aucun secret, dump ou média temporaire suivi par Git ;
- aucune donnée, vidéo ou activité canonique modifiée.

Quarante workspaces HLS abandonnés par les essais de cette mission avant la
correction du harnais Windows ont été identifiés par leur horodatage et leur
préfixe sous le répertoire temporaire dédié, puis supprimés. Les 115 workspaces
historiques antérieurs ont été laissés intacts.

## 13. Fichiers créés

- `prototypes/05-augmented-ic-video-01/database/schema-migrations/003_proto05_audio_anonymization.sql`
- `prototypes/05-augmented-ic-video-01/database/schema-migrations/003_proto05_audio_anonymization.manifest.json`
- `prototypes/05-augmented-ic-video-01/server/audio-anonymization.js`
- `prototypes/05-augmented-ic-video-01/server/test/audio-anonymization.test.js`
- `prototypes/05-augmented-ic-video-01/teacher-audio-anonymization.html`
- `reports/156_proto05_audio_anonymization_workshop_report.md`

## 14. Fichiers modifiés

- `PROJECTS_LAUNCH.md`
- `STATUS.md`
- `prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md`
- `prototypes/05-augmented-ic-video-01/database/schema-migrations/manifest.json`
- `prototypes/05-augmented-ic-video-01/database/tests/004_proto05_schema_alignment_validation.sql`
- `prototypes/05-augmented-ic-video-01/database/tests/006_proto05_document_metadata_schema_validation.sql`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-write.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-read-boundary.js`
- `prototypes/05-augmented-ic-video-01/server/proto05-write-boundary.js`
- `prototypes/05-augmented-ic-video-01/server/scripts/rebuild-schema-manifest.js`
- `prototypes/05-augmented-ic-video-01/server/scripts/schema-migrations.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/schema-migrations.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/video-workspaces.test.js`
- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.js`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`

## 15. Limites factuelles

- la première version traite explicitement la première piste audio `0:a:0` ;
  une politique de sélection multi-pistes demanderait une décision produit ;
- l’aperçu local est fidèle aux bornes et au type, mais l’export FFmpeg reste la
  seule référence acoustique exacte ;
- aucune forme d’onde, transcription, diarisation, détection automatique ou
  transformation d’identité vocale n’a été ajoutée ;
- la douceur subjective de la tonalité et le confort d’usage sur une vidéo
  longue restent à confirmer humainement par David ;
- le plan est volontairement borné à 200 passages pour éviter les charges et
  payloads non maîtrisés ; cela couvre largement le besoin annoncé de vingt
  passages.

## 16. Recette humaine minimale laissée à David

1. Lancer Proto05 normalement et ouvrir une copie de travail ou une dérivation.
2. Vérifier les deux actions image/son, puis ouvrir `Anonymiser le son`.
3. Créer au moins trois passages : tonalité douce, bip et silence, dont deux
   contigus ; écouter original puis aperçu.
4. Modifier un passage, en supprimer un autre, sauvegarder et recharger la page.
5. Lancer l’anonymisation et vérifier la progression jusqu’au résultat.
6. Lire le fichier dérivé avant, pendant et après chaque passage ; confirmer
   subjectivement l’absence de parole intelligible et le confort de la tonalité.
7. Revenir à la fiche média et confirmer la filiation et l’historique.
8. Tester une fois depuis une dérivation visuelle existante.

Cette recette est une validation humaine ; elle n’est pas remplacée par la
recette visuelle Codex ni par l’analyse objective du signal.

## 17. État Git et proposition de commit

L’état Git contient uniquement les créations et modifications listées ci-dessus.
Aucun commit ni push n’a été effectué. La version finale est `0.1.50`.

Message proposé :

```text
feat(proto05): ajouter l’atelier d’anonymisation audio multi-zones
```
