# Rapport 044 — suppression sécurisée d’une activité Proto05

**Date :** 16 juillet 2026  
**Périmètre :** bibliothèque enseignant et API locale Proto05  
**Version obtenue :** serveur/package `0.1.14` ; moteur étudiant inchangé `index-0.0.9.html`  
**Commit Git de référence :** `75aaa3539a2e98d5cd266cd22ec65e90783f490c` (HEAD inchangé, aucun commit créé)

## État réel observé avant modification

Le JSON canonique contenait exactement cinq activités :

| Identifiant | Titre |
|---|---|
| `proto05-augmented-video-01` | Vidéo augmentée d’intercompréhension |
| `proto05-draft-1784218562686-f87014` | MboloTest |
| `proto05-draft-1784219853222-b9e6a5` | Lbinz |
| `proto05-draft-1784230655360-d1182f` | brouillon_vide |
| `proto05-copy-1784235824216-9f34df` | Copie de Vidéo augmentée d’intercompréhension |

Son SHA-256 avant et après la mission est resté :
`f7a478ef48d0235349cabdc81afd5df08c428d25e86135c179042d9b5db7f4b3`.
Le fichier était déjà modifié dans le worktree au démarrage de cette mission ;
son contenu n’a été ni réécrit ni restauré par les tests ou la recette.

## Réalisation

- Ajout de l’action `Supprimer l’activité` sur chaque carte de `/teacher`.
- Confirmation native explicite comprenant le titre et l’identifiant, ainsi que
  l’annonce de la sauvegarde `.bak`.
- Annulation locale sans appel réseau et sans écriture.
- Désactivation du bouton et état `aria-busy` pendant la requête.
- Retour d’erreur lisible sur la carte ; après succès, retrait de la seule carte
  ciblée et maintien dans la bibliothèque avec confirmation visible.
- Ajout de `DELETE /api/proto05/activities/:id` :
  - `400` pour un identifiant mal formé ;
  - `404` pour une activité inconnue ;
  - `409` si plusieurs activités portent le même identifiant ;
  - `200` avec l’identité supprimée et le nombre restant après succès.
- Une suppression acceptée passe par le mécanisme partagé : copie préalable en
  `activities.json.bak`, écriture d’un fichier temporaire adjacent, puis
  renommage atomique. Les refus ont lieu avant ce mécanisme.
- L’accès n’a pas été ajouté aux ateliers : la bibliothèque est déjà le point
  de retour et expose l’action sans dupliquer la logique d’interface.

La version serveur/package passe de `0.1.13` à `0.1.14`. Aucun changement n’a été
apporté au modèle d’activité, à la vidéo, aux langues, aux phénomènes, aux
couches ou aux annotations.

## Fichiers concernés par cette mission

- `prototypes/05-augmented-ic-video-01/teacher.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/test/activity-deletion.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/README.md`
- `docs/ARCHITECTURE.md`
- `STATUS.md`
- le présent rapport.

## Contrôles réalisés

### Trois tests ciblés

Commande :

```text
node --test --test-concurrency=1 test/activity-deletion.test.js
```

Résultat : **3 tests réussis, 0 échec**.

1. Suppression d’une copie temporaire, réponse API, sauvegarde préalable et
   égalité stricte des quatre autres objets.
2. Refus sans écriture d’une activité inconnue, d’un identifiant invalide et
   d’un identifiant ambigu ; aucune sauvegarde créée dans ces cas.
3. Recette Chromium unique : annulation puis confirmation depuis la
   bibliothèque.

Chaque serveur de test reçoit son propre répertoire temporaire et sa propre
copie de `activities.json`. L’empreinte du JSON canonique est contrôlée dans les
trois tests.

### Analyse statique

Commande : `npm run check` depuis le serveur Proto05.  
Résultat : succès pour `proto05-augmented-video-server@0.1.14`.

`git diff --check` ne signale aucune erreur de whitespace ; seuls les
avertissements de normalisation LF/CRLF déjà liés au worktree Windows sont
affichés.

### Recette Chromium

- Navigateur : Google Chrome
  `C:\Program Files\Google\Chrome\Application\chrome.exe` en mode headless.
- Surface : `/teacher` servie par un serveur temporaire.
- Dimension : `1440 × 1000`.
- Annulation : confirmation contenant titre et ID, zéro requête `DELETE`, carte
  toujours présente, bouton actif et message sans écriture.
- Confirmation : bouton désactivé pendant la requête, une seule requête
  `DELETE`, carte ciblée retirée, quatre cartes restantes et message de retour à
  la bibliothèque.
- Après le scénario : les quatre activités non ciblées sont strictement égales
  à la fixture initiale et la sauvegarde temporaire correspond exactement aux
  cinq activités initiales.
- Aucune erreur visible détectée dans le parcours contrôlé.

La suite complète n’a pas été relancée, conformément à la limite demandée et en
l’absence de régression dans les contrôles ciblés.

## Limites restantes

- Proto05 reste sans authentification ni autorisation : un client HTTP local
  peut appeler directement le endpoint sans passer par la confirmation de
  l’interface.
- La sauvegarde `.bak` est une sauvegarde roulante unique, remplacée lors de
  l’écriture suivante ; il n’existe ni corbeille ni historique multi-version.
- L’activité historique n’est jamais supprimée automatiquement, mais elle n’est
  pas techniquement protégée contre une suppression explicitement confirmée.
- Le traitement d’une panne réelle du système de fichiers n’a pas été provoqué ;
  le chemin d’erreur applicatif conserve un message clair et le bouton est
  réactivé.
- La recette automatisée ne vaut pas validation fonctionnelle humaine par
  David.

## Retour arrière

Pour une suppression réelle, arrêter les écritures du serveur, vérifier que
`data/activities.json.bak` est bien la sauvegarde attendue, puis la recopier vers
un fichier temporaire dans `data/` et renommer ce fichier vers
`activities.json`. La sauvegarde n’est pas supprimée automatiquement. Aucun
retour arrière de données n’est requis pour cette mission puisque le JSON
canonique n’a pas changé.

## Message de commit proposé

`feat(proto05): sécuriser la suppression des activités`
