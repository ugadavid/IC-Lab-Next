# Rapport 038 — Duplication d’une activité Proto05

**Date :** 16 juillet 2026

**Version modifiée :** serveur Proto05 `0.1.8` → `0.1.9`

**Artefact moteur inchangé :** `index-0.0.8.html`

## Périmètre

La mission ajoute la duplication locale d’une activité depuis la bibliothèque
enseignant. Elle ne change ni le modèle de données, ni les droits, ni le HLS, ni
le launcher. Les écritures de test et la recette Chrome ont exclusivement ciblé
des copies temporaires.

L’état initial non indexé a été préservé : les modifications Hub et Proto05 des
missions précédentes, ainsi que les brouillons canoniques `MboloTest` et `Lbinz`,
n’ont été ni restaurés ni réécrits.

## Réalisation

- ajout de `POST /api/proto05/activities/:id/duplicate` ;
- génération d’un identifiant `proto05-copy-*` absent du magasin courant ;
- copie des métadonnées, de la vidéo, de la transcription, des segments, des
  locuteurs, des langues, des intervalles linguistiques, des couches, des
  phénomènes et des annotations ;
- régénération des identifiants de transcription, segments, locuteurs, langues,
  intervalles, couches, phénomènes, annotations et configuration de couches ;
- remappage de toutes leurs références croisées ;
- titre `Copie de …` et statut de brouillon ;
- exclusion par liste blanche de tout champ d’observation étudiante ;
- validation de la source avec les validateurs auteur existants et des contrôles
  de références complémentaires avant écriture ;
- sauvegarde avec la file séquencée, le remplacement atomique et le `.bak`
  existants ;
- refus `404` des activités inconnues, `400` des sources invalides et `405` des
  méthodes non prévues ;
- action explicite `Dupliquer l’activité` dans chaque carte de la bibliothèque,
  avec état d’attente, message d’erreur et ouverture automatique de la copie
  dans `/teacher/author/:copyId`.

## Fichiers concernés

- [`server/server.js`](../prototypes/05-augmented-ic-video-01/server/server.js) ;
- [`teacher.html`](../prototypes/05-augmented-ic-video-01/teacher.html) ;
- [`server/test/activity-duplication.test.js`](../prototypes/05-augmented-ic-video-01/server/test/activity-duplication.test.js) ;
- [`server/package.json`](../prototypes/05-augmented-ic-video-01/server/package.json) ;
- [`server/README.md`](../prototypes/05-augmented-ic-video-01/server/README.md) ;
- présent rapport.

`data/activities.json` reste modifié dans le working tree par les brouillons
préexistants documentés dans le [rapport 037](037_prototype_05_current_data_state_audit_report.md),
mais cette mission ne l’a pas modifié.

## Tests automatisés ajoutés

Le nouveau fichier couvre neuf sous-tests fonctionnels ; le runner Node compte
le test parent et ses sous-tests, soit dix tests supplémentaires :

- duplication de l’activité historique avec titre, vidéo et métadonnées ;
- conservation des volumes `11 / 22 / 26 / 7 / 4 / 5 / 11` ;
- égalité des contenus auteur après normalisation des nouveaux identifiants ;
- unicité et absence de collision de tous les identifiants internes ;
- exclusion de sentinelles `studentObservations`, `learnerObservations` et
  `observations` injectées uniquement dans la fixture ;
- duplication d’un brouillon vide ;
- immutabilité stricte des originaux, dont `MboloTest` et `Lbinz` lorsqu’ils sont
  présents dans la donnée locale ;
- refus sans écriture d’une activité inconnue, d’une source à identifiants
  invalides et d’une méthode non autorisée ;
- cohérence du `.bak` après chacune des deux sauvegardes valides.

La fixture de test reste portable : elle réutilise les brouillons locaux
lorsqu’ils existent et crée des équivalents temporaires sinon. Elle n’écrit
jamais dans la donnée canonique.

## Contrôles exécutés

### Analyse statique et suite complète

- `npm run check` : succès ;
- compilation du script embarqué de `teacher.html` avec `vm.Script` : succès ;
- `npm test` avec Google Chrome sélectionné : **41 tests réussis, 0 échec** ;
- SHA-256 canonique avant et après chaque suite :
  `DBCCB28BD353F107A1F02778576735C1C4AC6FEEFD8B6CF903EBF8FBC269AB60`.

### Recette Chromium

Une copie complète de Proto05 a été servie sur `127.0.0.1:8794`, puis supprimée
avec son processus à la fin de la recette. Dans Chrome, à une dimension visible
d’environ `2550 × 1275` :

- la bibliothèque affiche les trois activités initiales et un bouton de
  duplication clairement identifié sur chaque carte ;
- la duplication de `proto05-augmented-video-01` ouvre
  `/teacher/author/proto05-copy-1784222839696-b58a0d` ;
- l’atelier de cette copie charge le titre attendu, 11 segments, 7 couches,
  26 phénomènes et 11 annotations ;
- la duplication de `MboloTest` ouvre
  `/teacher/author/proto05-copy-1784222854330-94b783` ;
- sa copie charge `Maintenant oui`, `C’est ok`, `Kékidi?` et ses collections
  auteur vides ;
- aucune erreur ou alerte console n’a été relevée ;
- le magasin temporaire final contient cinq activités : les trois originales,
  strictement égales à leur état initial, et les deux copies attendues.

Cette recette Chromium est une vérification réalisée par Codex ; elle ne vaut
pas validation fonctionnelle humaine de David.

## Éléments non vérifiés

- aucune duplication n’a été exécutée contre le serveur ou la donnée canonique ;
- l’état d’erreur de l’interface n’a pas été simulé dans Chrome, les refus étant
  couverts au niveau API automatisé ;
- aucune charge concurrente de nombreuses duplications n’a été testée ;
- la lecture vidéo HLS n’a pas été validée dans la copie temporaire ;
- aucune validation fonctionnelle humaine n’a été réalisée.

## Message de commit proposé

`feat(proto05): dupliquer une activité dans l’atelier auteur`

## Limites restantes

- les observations étudiantes restent aujourd’hui en mémoire navigateur ; leur
  exclusion est garantie par la construction en liste blanche et par des
  sentinelles de test, non par la présence d’un champ canonique réel ;
- le processus standard `8791` n’a pas répondu au contrôle final et n’a pas été
  redémarré ; la version `0.1.9` a été vérifiée sur la copie temporaire ;
- `STATUS.md` conserve la version documentaire antérieure et n’a pas été modifié
  dans cette mission ciblée ;
- `MboloTest`, `Lbinz` et `data/activities.json` restent non indexés et soumis à
  la validation humaine déjà demandée dans le rapport 037.
