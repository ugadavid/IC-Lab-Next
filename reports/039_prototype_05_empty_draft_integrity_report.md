# Rapport 039 — Sécurisation du brouillon vide Proto05

**Date :** 16 juillet 2026  
**Périmètre :** `prototypes/05-augmented-ic-video-01`  
**Mission :** rendre un brouillon vide cohérent et sauvegardable, puis renforcer
la validation serveur avant écriture sans modifier les activités canoniques
existantes.

## État réel observé avant modification

- Le serveur Proto05 était réellement en version `0.1.9` dans `server.js`,
  `server/package.json` et le README serveur.
- Le moteur étudiant servi était `index-0.0.8.html`.
- La suite Proto05 comptait réellement 41 tests réussis avant la mission.
- `data/activities.json` contenait quatre activités : l’activité historique,
  `MboloTest`, `Lbinz` et `Original_copy`.
- `MboloTest` et `Lbinz` avaient des collections `languages` vides mais une
  transcription référençant encore `lang-fr`.
- `Original_copy` conservait 12 identifiants de phénomènes référencés par ses
  segments mais absents de sa collection `phenomena`.
- Le SHA-256 initial du fichier canonique était
  `14CF73C27E7F189FA480F7447F0E55741D4DBACEF86B02525A1AF6E8DC4E8F09`.
- Le dépôt comportait déjà des modifications non commitées sur Proto05 et IC-Hub.
  Ils ont été préservés ; aucune restauration ni réécriture globale n’a été
  effectuée.

## Réalisation

### Initialisation vide

- Un nouveau brouillon conserve une transcription identifiée, mais sans langue
  fictive : `languageId` vaut désormais explicitement `null`.
- `segmentIds`, `segments`, `speakers`, `languages`, `languageIntervals`,
  `layers`, `phenomena` et `teacherAnnotations` sont initialisés à vide.
- Les trois listes de visibilité de `layerConfiguration` sont initialisées à
  vide et `allowLearnerToggle` reste un booléen valide.
- La collecte de l’atelier auteur ignore désormais le paragraphe d’état
  « Aucun segment » ; ce texte ne produit plus un faux segment au clic sur
  « Sauvegarder le brouillon ».

### Validation avant sauvegarde

La validation porte désormais sur l’activité finale réellement destinée à
l’écriture, y compris lors d’une simple mise à jour de métadonnées. Elle refuse
avec un message ciblé :

- les références vers une langue, un locuteur, un segment, une couche ou un
  phénomène inexistant ;
- les identifiants absents ou dupliqués dans une collection, ainsi que les
  collisions entre collections ;
- les incohérences réciproques entre `segment.phenomenonIds` et
  `phenomenon.segmentId` ;
- les références invalides dans la transcription, les intervalles
  linguistiques, les annotations et leurs overlays ;
- les configurations de couches non structurées, les références de couches
  inconnues ou dupliquées, un `allowLearnerToggle` non booléen et une couche
  visible par défaut qui ne serait pas visible pour les étudiants ;
- les temps non entiers, hors durée ou dont le début ne précède pas la fin.

Aucune réparation automatique n’est appliquée aux activités existantes.

### Tests et environnement temporaire

- Ajout de `server/test/empty-draft-validation.test.js`.
- Le serveur de test copie les pages et actifs strictement nécessaires dans un
  prototype temporaire et n’utilise qu’un `activities.json` temporaire.
- Le test de duplication utilise un brouillon vide valide propre à la fixture ;
  `MboloTest` et `Lbinz` restent seulement des données à préserver.
- Les tests Chromium sont exécutés séquentiellement afin d’éviter les conflits
  de profils et de processus graphiques observés lors d’exécutions parallèles.
- Le helper Chromium privilégie Chrome lorsqu’il est disponible, utilise un
  profil temporaire isolé et demande une fenêtre `1440×1000`.
- Dans cet environnement Windows, le sandbox Chromium provoquait un crash du
  processus GPU. Le helper utilise donc `--no-sandbox` pour ces seules recettes
  automatisées locales, limitées à `127.0.0.1` et à des fixtures temporaires.

## Fichiers concernés par la mission

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/server/test/empty-draft-validation.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/activity-duplication.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/chromium.js`
- `reports/039_prototype_05_empty_draft_integrity_report.md`

`data/activities.json`, `teacher.html`, `teacher-edit.html` et les fichiers
IC-Hub déjà modifiés avant la mission n’ont pas été réécrits par cette mission.

## Version obtenue

- Serveur Proto05 : `0.1.9` → `0.1.10`.
- Moteur étudiant : `index-0.0.8.html`, inchangé.
- Version interne des nouveaux brouillons : `0.1.0`, inchangée.

L’incrément serveur est un baby step correctif : il sécurise une création et
une sauvegarde existantes sans changer l’architecture ni le statut du
prototype.

## Contrôles réalisés

### Analyse statique

- `npm run check` : réussi.
- `git diff --check` : réussi ; seuls des avertissements de conversion LF/CRLF
  propres au worktree Windows ont été affichés.

### Tests automatisés et serveur

- Commande : `npm test` depuis le serveur Proto05.
- Résultat : **55 tests réussis, 0 échec**.
- Répartition : 41 tests préexistants + 14 nouveaux contrôles.
- Les tests couvrent la création HTTP, la sauvegarde auteur, la persistance et
  la sauvegarde `.bak` temporaires, tous les refus demandés et l’absence
  d’écriture après chaque refus.
- SHA-256 canonique avant et après la suite complète :
  `14CF73C27E7F189FA480F7447F0E55741D4DBACEF86B02525A1AF6E8DC4E8F09`.
- Les quatre activités canoniques et leur ordre sont restés inchangés.

### Validation Chromium

- Parcours automatisé réel : `/teacher/create` → création du brouillon →
  `/teacher/author/:id` → sauvegarde du brouillon vide.
- Fenêtre demandée : `1440×1000` ; viewport utile mesuré : `1418×846`.
- Résultats : redirection correcte, titre « Atelier auteur », confirmation
  « Brouillon sauvegardé. », activité relue identique à l’activité initialisée,
  aucune collection fictive et aucun débordement horizontal.
- Les autres scénarios Chromium existants de visibilité et de retours de
  sauvegarde ont également réussi dans la suite complète.

## Éléments non vérifiés

- Aucune recette fonctionnelle humaine par David n’a été réalisée.
- Aucun test n’a écrit dans le `data/activities.json` canonique.
- La création complète d’une activité pédagogique n’a pas été réalisée ni
  validée.
- L’URL vidéo libre, les overlays, la refonte graphique et une éventuelle
  migration de données ou d’architecture n’ont pas été traités.

## Limites restantes

- `MboloTest` et `Lbinz` restent volontairement inchangés avec leur ancienne
  langue de transcription orpheline. Une tentative de sauvegarde est maintenant
  refusée clairement jusqu’à une décision explicite de réparation.
- `Original_copy` reste volontairement inchangé avec 12 références de
  phénomènes absentes. Sa sauvegarde ou sa duplication est maintenant refusée
  avant écriture.
- Le serveur vérifie la cohérence réciproque segment/phénomène, mais la décision
  produit définitive sur la source de vérité reste ouverte. L’atelier auteur ne
  synchronise pas encore automatiquement les deux côtés lors de la création
  complète d’un phénomène ; un état incomplet est donc refusé plutôt que réparé.
- L’atelier auteur ne fournit pas encore le parcours complet pour créer les
  langues et locuteurs nécessaires à une activité riche. Le brouillon vide est
  néanmoins cohérent et sauvegardable tel quel.

## Suite éventuelle

Une mission séparée, avec décision explicite sur le modèle canonique, pourra
traiter la création complète d’une activité et la synchronisation éditoriale des
références. Une autre mission autorisée pourra proposer une réparation
réversible de `MboloTest`, `Lbinz` et `Original_copy` ; aucune réparation n’est
incluse ici.

## Validation humaine

Les faits ci-dessus résultent de l’inspection du dépôt, des tests locaux et de
la recette Chromium de Codex. Ils ne constituent pas une validation humaine de
David.

## Message de commit proposé

`fix(proto05): sécuriser la sauvegarde des brouillons vides`
