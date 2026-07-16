# Rapport 035 — Visibilité des accès Proto05 depuis IC-Hub

**Date :** 16 juillet 2026

**Version modifiée :** IC-Hub `0.10.3` → `0.10.4`

**Versions inchangées :** serveur Proto05 `0.1.7`, moteur Proto05
`index-0.0.8.html`

## Périmètre

La mission améliore uniquement la visibilité des surfaces existantes de
Proto05 depuis le portail public d’IC-Hub. Elle n’ajoute ni authentification, ni
logique de droits, ni route applicative, et ne touche pas à la création de
brouillons.

Les sources consultées sont [`AGENTS.md`](../AGENTS.md),
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md),
[`STATUS.md`](../STATUS.md), [`PROJECTS_LAUNCH.md`](../PROJECTS_LAUNCH.md), le
[README du serveur Hub](../prototypes/00-ic-hub/server/README.md) et les routes
actuelles des serveurs Hub et Proto05.

## Réalisation

Le nouvel artefact de portail `0.10.4` conserve intact le portail `0.10.3` et
met en avant la carte Proto05 sur toute la largeur. Il expose des accès
explicitement nommés vers :

- l’entrée générale historique `/demos/augmented-video/`, dont la redirection
  vers `http://127.0.0.1:8791/` est conservée ;
- la vue étudiant de `proto05-augmented-video-01` ;
- l’espace enseignant `/teacher` ;
- l’atelier guidé de `proto05-augmented-video-01` ;
- le mode avancé de `proto05-augmented-video-01` ;
- l’espace local Hub `/hub.html`, qui utilise la redirection existante vers la
  connexion locale lorsqu’aucune session n’est présente.

Aucune route de création et aucun bouton de création de brouillon n’ont été
ajoutés au portail.

## Fichiers concernés

- `prototypes/00-ic-hub/public/portal-0.10.4.html` — nouveau portail ;
- `prototypes/00-ic-hub/public/portal-0.10.4.css` — présentation du nouveau
  portail ;
- `prototypes/00-ic-hub/server/server.js` — version et redirections du portail ;
- `prototypes/00-ic-hub/server/package.json` — version Hub `0.10.4` ;
- `prototypes/00-ic-hub/server/package-lock.json` — version racine alignée ;
- `prototypes/00-ic-hub/server/README.md` — version et accès Proto05 documentés ;
- `reports/035_ic_hub_proto05_access_visibility_report.md` — présent rapport.

## Contrôles exécutés

### Analyse statique et tests

- `npm run check` dans le serveur Hub : succès ;
- cohérence des versions `package.json` et `package-lock.json` : `0.10.4` ;
- suite Proto05 : 31 tests réussis, 0 échec ;
- `git diff --check` : succès ;
- contrôle des espaces finaux dans les nouveaux fichiers : succès.

### HTTP et intégrité

- healthcheck du Hub `0.10.4` : succès sur le port temporaire `8792` ;
- racine du Hub : redirection vers `/portal-0.10.4.html` ;
- entrée générale Proto05 : redirection conservée vers `8791` ;
- routes étudiant, enseignant, atelier guidé et mode avancé : HTTP `200` ;
- API de l’activité réelle : identifiant
  `proto05-augmented-video-01`, 11 segments chargés ;
- SHA-256 de `data/activities.json` après les contrôles :
  `3DB18608A7A94021F4C7B5DFE3E306BC31517A0556A7B6094BF6FA60851776BE`,
  identique à la valeur de référence.

### Validation visuelle Chromium

La recette a été exécutée à `1280 × 720` dans Chromium :

- portail Hub `0.10.4` lisible, carte Proto05 prioritaire et boutons distincts ;
- chaque accès a été cliqué depuis le portail ;
- vue étudiant chargée avec le titre de l’activité historique ;
- espace enseignant chargé avec une activité, l’identifiant réel et 11 segments ;
- atelier guidé chargé avec 11 segments, 22 intervalles linguistiques et 26
  phénomènes ;
- mode avancé chargé avec 11 segments, 22 intervalles, 26 phénomènes et 7
  couches ;
- « Mon espace local » mène correctement à la connexion locale en l’absence de
  session ;
- aucune erreur ou alerte console relevée sur le portail final.

Cette recette Codex ne constitue pas une validation fonctionnelle humaine.

## Éléments non vérifiés

- aucune connexion avec un compte de démonstration n’a été effectuée ;
- aucune création, modification ou sauvegarde d’activité n’a été déclenchée ;
- aucune modification de brouillon n’a été testée ;
- la lecture complète du média HLS externe n’a pas été parcourue jusqu’à son
  terme ;
- les autres démonstrateurs du portail n’ont pas fait l’objet d’une recette
  fonctionnelle complète.

## Message de commit proposé

`feat(hub): exposer les accès Proto05 depuis le portail`

## Limites restantes

- le processus déjà actif sur le port standard `8790` servait encore Hub
  `0.10.3` ; la version `0.10.4` a donc été validée sur `8792`, puis le serveur
  temporaire a été arrêté. Un redémarrage normal du Hub est nécessaire pour
  exposer `0.10.4` sur `8790` ;
- les libellés étudiant et enseignant de Proto05 ne correspondent toujours pas
  à des droits serveur réels ;
- Proto05 dépend encore du proxy HLS et de la dépendance `hls.js` d’IC-Hub ;
- la page avancée présente à `1280 × 720` un chevauchement visuel préexistant de
  boutons sous la prévisualisation. Il n’a pas été corrigé, car cette mission ne
  modifie que la visibilité depuis le portail Hub ;
- la création d’une activité depuis un brouillon vide reste hors périmètre.
