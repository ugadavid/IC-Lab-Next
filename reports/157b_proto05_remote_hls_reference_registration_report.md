# Mission 157B — Enregistrement d’une référence vidéo HLS distante

Date : 1er août 2026

Prototype : Proto05

Version obtenue : `0.1.51`

## Périmètre et diagnostic

L’URL UGA fournie est valide : l’analyse HTTP identifie un manifeste HLS maître.
L’échec se produisait ensuite avant l’appel d’écriture MariaDB. La projection
canonique relisait littéralement le transport SQL `filesystem` d’une source
audio dérivée existante, alors que le contrat applicatif attend `file`. La
validation globale de la Library refusait donc toute nouvelle écriture média
avec `INVALID_TRANSPORT`.

Le parcours de création d’une nouvelle référence passait en outre par la forme
runtime historique puis sa remigration. Cette conversion ne conservait pas le
rôle métier `original-remote` de la nouvelle source et du nouveau playable.

## Correction

- La frontière de lecture MariaDB traduit désormais uniquement `filesystem`
  vers le vocabulaire canonique `file`; les autres transports sont inchangés.
- La confirmation construit directement les trois objets canoniques
  `asset/source/playable`, puis utilise l’écriture transactionnelle existante et
  `sp_media_register_import`.
- La source et le playable HLS conservent leur URL, leur transport `hls`, leur
  rôle `original-remote`, leur disponibilité et leurs métadonnées techniques.
- Le verrou de confirmation et la détection de doublon existants sont conservés.
- Aucun schéma, aucune procédure, aucune migration et aucune donnée canonique
  durable n’ont été modifiés.

## Vérifications

- Reproduction avant correction avec l’URL UGA : analyse `200`, confirmation
  `500`, validation `INVALID_TRANSPORT` sur `filesystem`.
- Test ciblé MariaDB : 2/2, comprenant la normalisation de frontière et un HLS
  simulé de bout en bout ; confirmation concurrente `201/409`, une seule ligne,
  relecture SQL/API, fiche HTTP `200`, doublon refusé, entrée invalide refusée et
  cardinalités restaurées après nettoyage.
- URL UGA exacte après correction : analyse `200` (`hls`, `master`), confirmation
  `201`, présence dans la liste, API de détail `200`, fiche enseignante `200`,
  manifeste relayé `200`, rôles `original-remote` en API et SQL.
- Nettoyage de la recette UGA : API `404`, puis `0` asset, `0` source et `0`
  playable pour l’identifiant temporaire en SQL.
- Tests existants `video-workspaces.test.js` : 8/8, dont l’encart local de la
  Mission 157A.
- Syntaxe Node des fichiers concernés : réussie.
- Suite complète non exécutée, conformément au périmètre ciblé.

La recette humaine finale reste à effectuer par David après redémarrage du
serveur principal ; le processus préexistant sur le port habituel n’a pas été
interrompu pendant la mission.

## Fichiers

- `prototypes/05-augmented-ic-video-01/server/proto05-mariadb-readonly.js`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- marqueurs de version : `server/package.json`, `server/README.md`,
  `teacher-video-detail.html`, `ANONYMIZATION_ENGINE.md`
- présent rapport

La version a été incrémentée de `0.1.50` à `0.1.51` selon la règle de baby-step
du dépôt. Aucun commit ni push n’a été effectué.

Message de commit proposé :

```text
fix(proto05): enregistrer les références HLS distantes
```
