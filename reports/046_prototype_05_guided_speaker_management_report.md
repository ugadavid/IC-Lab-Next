# Rapport 046 — intégration des locuteurs dans l’atelier guidé Proto05

**Date :** 16 juillet 2026  
**Périmètre :** ateliers guidé et avancé Proto05, UX des locuteurs  
**Version obtenue :** serveur/package `0.1.16` ; moteur étudiant inchangé `index-0.0.9.html`  
**Commit Git de référence :** `30d3d6d2c0c16a3d403573854fa4a5ea3a554037` (HEAD inchangé, aucun commit créé)

## État réel observé

Le dépôt était propre au début de la mission et intégrait déjà le rapport 045.
Le serveur/package était en `0.1.15`. Le modèle possédait les locuteurs locaux
dans `activity.speakers` et le serveur validait déjà leurs libellés, leur unicité
et les références de segments ou d’annotations.

L’atelier avancé permettait la gestion complète, mais demandait et affichait
l’identifiant technique. L’atelier guidé affichait le nom dans la liste de
sélection d’un segment, sans gestion de la collection et sans transmettre
`speakers` lors d’une sauvegarde.

Les cinq activités canoniques observées sont restées :

| Identifiant | Titre | Locuteurs |
|---|---|---:|
| `proto05-augmented-video-01` | Vidéo augmentée d’intercompréhension | 5 |
| `proto05-draft-1784218562686-f87014` | MboloTest | 0 |
| `proto05-draft-1784219853222-b9e6a5` | Lbinz | 0 |
| `proto05-draft-1784230655360-d1182f` | brouillon_vide | 0 |
| `proto05-copy-1784236861048-984dec` | CopieCopie | 5 |

Le SHA-256 canonique avant et après les contrôles est resté
`18a9bd64783822b73092fffc05ae0765511aad07763d2fcc04f430fcfa99b58c`.
Les identifiants et libellés des dix locuteurs canoniques sont strictement
inchangés.

## Réalisation

### Atelier guidé

- Ajout d’une carte « Locuteurs » affichant uniquement les noms lisibles.
- Création à partir du seul nom ; l’identifiant technique est généré
  automatiquement et vérifié localement contre les identifiants déjà présents.
- Modification du nom sans changement d’identifiant.
- Suppression d’un locuteur inutilisé.
- Refus clair avec volumes d’usage lorsqu’un segment ou une annotation le
  référence encore.
- Sélection multiple des locuteurs existants dans l’éditeur d’un segment.
- Ajout de `speakers` au payload de sauvegarde guidé, puis réutilisation de la
  réponse serveur au rechargement.

### Atelier avancé

- Retrait du champ de saisie et de l’affichage des identifiants.
- Génération automatique des identifiants pour les nouveaux locuteurs.
- Options de segments et messages limités au nom lisible.
- Identifiants existants conservés tels quels dans le modèle.

Dans les deux interfaces, les identifiants restent nécessaires comme valeurs
internes des références et dans les échanges JSON, mais ne sont présents dans
aucun texte visible, champ de saisie ou libellé rendu.

Aucun référentiel global n’a été créé : `shared/reference-data/` contient
toujours uniquement `languages.json` et son README. Les langues et les données
canoniques n’ont pas été modifiées.

La version serveur/package passe de `0.1.15` à `0.1.16` pour identifier cette
évolution d’interface. Le contrat serveur de validation reste celui établi en
`0.1.15`.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/test/speaker-management.test.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/README.md`
- `docs/ARCHITECTURE.md`
- `STATUS.md`
- le présent rapport.

## Contrôles réalisés

### Quatre tests ciblés

Commande :

```text
node --test --test-concurrency=1 test/speaker-management.test.js
```

Résultat : **4 tests réussis, 0 échec**.

1. Création, unicité, association à un segment, relecture et suppression d’un
   locuteur inutilisé sur serveur temporaire.
2. Modification du nom, stabilité de l’identifiant et remappage des locuteurs
   lors d’une duplication.
3. Refus sans écriture d’une suppression utilisée et des références inconnues
   dans un segment ou une annotation.
4. Recette Chromium unique dans l’atelier guidé sur une copie de
   `brouillon_vide`.

Tous les serveurs de test disposent d’un répertoire et d’un
`activities.json` temporaires. L’empreinte et les collections de locuteurs du
JSON canonique sont vérifiées après les scénarios.

### Analyse statique

- `node --check server.js` : succès.
- Compilation des deux scripts de `teacher-author.html` avec `vm.Script` :
  succès.
- Compilation des huit scripts de `teacher-guided.html` avec `vm.Script` :
  succès.
- `npm run check` : succès pour
  `proto05-augmented-video-server@0.1.16`.
- `git diff --check` : aucune erreur ; seuls les avertissements de normalisation
  LF/CRLF du worktree Windows sont présents.

La suite complète n’a pas été relancée, conformément au périmètre demandé et en
l’absence de régression dans les contrôles ciblés.

### Recette Chromium unique

- Navigateur : Google Chrome
  `C:\Program Files\Google\Chrome\Application\chrome.exe`, mode headless.
- Dimension : `1440 × 1000`.
- Activité : copie temporaire de
  `proto05-draft-1784230655360-d1182f` (`brouillon_vide`).
- Parcours guidé : ajout d’un nom, génération automatique d’un identifiant,
  modification du nom, création d’un segment, association du locuteur, refus de
  suppression pendant l’usage, sauvegarde puis rechargement.
- Après rechargement : nom et référence conservés, sélection multiple active et
  identifiant strictement stable.
- Contrôle visuel automatisé : l’identifiant généré n’apparaît pas dans le texte
  visible avant sauvegarde ni après rechargement.
- Contrôle avancé dans le même scénario : aucun champ d’identifiant, aucun
  identifiant existant visible, création d’un second locuteur avec identifiant
  automatique également masqué.
- Aucun débordement horizontal détecté dans les deux ateliers.
- La sauvegarde `.bak` temporaire correspond à la fixture canonique initiale.

Cette recette automatisée ne constitue pas une validation fonctionnelle humaine
par David.

## Limites restantes

- La génération des identifiants est réalisée côté navigateur par les ateliers.
  Le serveur contrôle leur unicité, mais un client API direct peut toujours
  fournir lui-même un identifiant technique.
- Les identifiants restent présents dans le JSON, les valeurs internes des
  contrôles et les requêtes réseau : ils sont masqués à l’utilisateur, pas
  supprimés du contrat de données.
- Les annotations avancées ne sont toujours pas éditées dans ces cartes ; leurs
  éventuelles références `speakerId`/`speakerIds` sont seulement prises en
  compte par la protection de suppression et la validation serveur.
- Proto05 reste sans authentification ni autorisation serveur.
- La validation Chromium est automatisée et limitée à un brouillon vide ; elle
  ne remplace pas une recette humaine sur les activités historiques.

## Message de commit proposé

`feat(proto05): intégrer les locuteurs à l’atelier guidé`
