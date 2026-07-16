# Rapport 045 — gestion des locuteurs propres aux activités Proto05

**Date :** 16 juillet 2026  
**Périmètre :** atelier auteur avancé et validation serveur Proto05  
**Version obtenue :** serveur/package `0.1.15` ; moteur étudiant inchangé `index-0.0.9.html`  
**Commit Git de référence :** `75aaa3539a2e98d5cd266cd22ec65e90783f490c` (HEAD inchangé, aucun commit créé)

## État réel observé

Le modèle courant place déjà les locuteurs dans `activity.speakers`; les
segments les référencent par `segments[].speakerIds`. Aucun champ de locuteur
n’est actuellement présent dans les annotations canoniques. Les langues restent
définies par `shared/reference-data/languages.json`.

Le JSON canonique observé au début de cette mission diffère du libellé connu à
la fin du rapport 044 : sa cinquième activité est désormais
`proto05-copy-1784236861048-984dec`, titre `CopieCopie`. Cet état réel a été pris
comme référence sans restauration ni réécriture.

| Activité | Locuteurs | Références distinctes depuis les segments |
|---|---:|---:|
| `proto05-augmented-video-01` | 5 | 5 |
| `proto05-draft-1784218562686-f87014` — MboloTest | 0 | 0 |
| `proto05-draft-1784219853222-b9e6a5` — Lbinz | 0 | 0 |
| `proto05-draft-1784230655360-d1182f` — brouillon_vide | 0 | 0 |
| `proto05-copy-1784236861048-984dec` — CopieCopie | 5 | 5 |

Le SHA-256 canonique avant et après les contrôles est resté
`18a9bd64783822b73092fffc05ae0765511aad07763d2fcc04f430fcfa99b58c`.

## Réalisation

- Ajout dans `/teacher/author/:activityId` d’une carte « Locuteurs de
  l’activité » affichant les locuteurs existants.
- Création avec identifiant local explicite et libellé ; l’interface refuse les
  identifiants mal formés, vides ou déjà présents dans l’activité.
- Identifiant en lecture seule après création et modification du seul libellé.
- Suppression d’un locuteur inutilisé, avec rappel de sauvegarder le brouillon.
- Refus immédiat de suppression lorsqu’un segment ou une annotation référence
  encore le locuteur, avec volumes d’usages dans le message.
- Remplacement de la saisie libre `speakerIds` des segments par une sélection
  multiple alimentée uniquement par `activity.speakers`.
- Ajout de `speakers` au contrat de sauvegarde auteur.
- Validation serveur des libellés, des identifiants dupliqués, des références
  de segments et des éventuels champs d’annotation `speakerId`/`speakerIds`.
- La duplication existante reste locale : elle conserve les libellés, régénère
  les identifiants et remappe toutes les références de segments contrôlées.

Aucun dictionnaire de locuteurs n’a été créé. Le référentiel partagé des langues
n’a pas été modifié. La vidéo, les overlays, les annotations avancées et la
relation segment–phénomène sont restés hors périmètre.

La version serveur/package passe de `0.1.14` à `0.1.15`. Le moteur étudiant reste
`index-0.0.9.html`.

## Fichiers concernés par cette mission

- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/test/speaker-management.test.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/README.md`
- `docs/ARCHITECTURE.md`
- `STATUS.md`
- le présent rapport.

Le fichier `data/activities.json` était déjà modifié dans le worktree ; cette
mission ne l’a pas écrit.

## Contrôles réalisés

### Quatre tests ciblés

Commande :

```text
node --test --test-concurrency=1 test/speaker-management.test.js
```

Résultat final : **4 tests réussis, 0 échec**.

1. Refus d’un identifiant de locuteur dupliqué, création d’un locuteur,
   association à un segment, rechargement, puis suppression acceptée d’un
   second locuteur inutilisé.
2. Modification du libellé sans changement d’identifiant ni de référence, puis
   duplication avec remappage complet des identifiants de locuteurs.
3. Refus sans écriture de la suppression d’un locuteur utilisé, d’une référence
   de segment inconnue et d’une référence d’annotation inconnue.
4. Recette Chromium sur une copie de `brouillon_vide`.

Chaque test démarre un serveur possédant sa propre copie temporaire du JSON. Les
empreintes et collections de locuteurs du fichier canonique sont vérifiées après
les scénarios.

### Analyse statique

- `node --check server.js` : succès.
- Extraction et compilation du script de `teacher-author.html` avec
  `vm.Script` : succès.
- `npm run check` : succès pour
  `proto05-augmented-video-server@0.1.15`.
- `git diff --check` : aucune erreur ; seuls les avertissements de normalisation
  LF/CRLF du worktree Windows sont présents.

La suite complète n’a pas été relancée, conformément à la mission et en
l’absence de régression dans les contrôles ciblés.

### Recette Chromium unique

- Navigateur : Google Chrome
  `C:\Program Files\Google\Chrome\Application\chrome.exe`, mode headless.
- Surface : `/teacher/author/proto05-draft-1784230655360-d1182f` sur serveur et
  données temporaires.
- Dimension : `1440 × 1000`.
- Parcours : création de `speaker-chromium-test` / « Locutrice Chromium »,
  création d’un segment, sélection du locuteur, contrôle du refus de suppression
  pendant l’usage, sauvegarde, rechargement complet de l’atelier.
- Après rechargement : identifiant stable et en lecture seule, libellé conservé,
  contrôle `SELECT` multiple, segment et `speakerIds` conservés, aucune saisie
  libre de référence de locuteur et aucun débordement horizontal détecté.
- La sauvegarde `.bak` temporaire correspond à la fixture initiale et le JSON
  canonique reste inchangé.

Cette recette automatisée ne vaut pas validation humaine par David.

## Limites restantes

- Les locuteurs ne sont gérés que dans l’atelier auteur avancé ; l’atelier guidé
  ne propose pas encore cette carte.
- Les annotations avancées ne sont pas éditées dans cette mission. Le serveur et
  la garde de suppression reconnaissent seulement leurs éventuels champs
  `speakerId` ou `speakerIds`.
- Le renommage porte uniquement sur le libellé. L’identifiant reste volontairement
  stable et nécessite une opération métier distincte si un futur besoin de
  remappage apparaît.
- Il n’existe ni authentification ni autorisation serveur ; toute sauvegarde
  auteur reste locale au prototype.
- Aucun référentiel global de locuteurs n’existe, conformément à la frontière
  retenue ; deux activités peuvent donc utiliser des identifiants ou libellés
  similaires sans relation entre elles.

## Suite éventuelle

Une mission séparée pourrait décider si l’atelier guidé doit exposer la même
gestion, sans déplacer la propriété des locuteurs hors des activités.

## Message de commit proposé

`feat(proto05): gérer les locuteurs propres aux activités`
