# Rapport 036 — Parcours d’édition des métadonnées Proto05

**Date :** 16 juillet 2026

**Version modifiée :** serveur Proto05 `0.1.7` → `0.1.8`

**Artefact moteur inchangé :** `index-0.0.8.html`

## Périmètre

La mission corrige uniquement le parcours
`/teacher/edit/:activityId`. Après une sauvegarde réussie des métadonnées, la
page ouvre désormais `/teacher/author/:activityId` avec le même identifiant.

Le modèle de données, l’atelier auteur, la création de brouillons et les droits
n’ont pas été modifiés.

## État initial préservé

Le dépôt contenait déjà des changements non validés liés au portail Hub `0.10.4`
et au [rapport 035](035_ic_hub_proto05_access_visibility_report.md). Ils ont été
préservés.

Le fichier canonique `data/activities.json` était également déjà modifié avant
la mission : il contenait notamment le brouillon local `MboloTest`. Son SHA-256
initial était
`1248F45CC9EAC88968CB6A72A28DE63BCD2E576C4D1C216F9B9D5B81A1851DF3`.
Cette modification existante n’a été ni restaurée, ni réécrite par la mission.

## Réalisation

Dans `teacher-edit.html` :

- le bouton `Enregistrer` est désactivé pendant la requête ;
- le formulaire expose `aria-busy="true"` pendant la sauvegarde ;
- le statut indique clairement « Sauvegarde des métadonnées en cours… » ;
- une réponse valide est contrôlée, y compris l’identifiant d’activité renvoyé ;
- après succès, la page redirige vers
  `/teacher/author/:activityId` avec le même identifiant ;
- une erreur HTTP, réseau ou une réponse de sauvegarde invalide affiche un
  message explicite, réactive le bouton et ne redirige pas ;
- le bouton `Ouvrir l’atelier auteur` a été ajouté ;
- les accès `Retour bibliothèque` et `Ouvrir la prévisualisation` sont
  conservés.

## Fichiers concernés par la mission

- `prototypes/05-augmented-ic-video-01/teacher-edit.html` ;
- `prototypes/05-augmented-ic-video-01/server/server.js` ;
- `prototypes/05-augmented-ic-video-01/server/package.json` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `reports/036_prototype_05_teacher_edit_flow_report.md`.

## Contrôles exécutés

### Analyse statique

- `npm run check` : succès avec le serveur `0.1.8` ;
- extraction et compilation du script embarqué de `teacher-edit.html` : succès ;
- cohérence entre `server.js`, `package.json` et le README : version `0.1.8`.

### Recette Chromium

La recette a utilisé une copie temporaire de l’état courant de Proto05 sur le
port `8793`. Aucune écriture n’a ciblé la donnée canonique.

Avec l’activité historique `proto05-augmented-video-01` :

- la page d’édition charge les métadonnées et les quatre actions attendues ;
- pendant la sauvegarde, le bouton est désactivé, le formulaire est occupé et le
  message d’attente est visible ;
- les métadonnées sont enregistrées dans la copie temporaire ;
- la redirection aboutit à
  `/teacher/author/proto05-augmented-video-01` ;
- l’atelier auteur recharge la métadonnée modifiée dans la fixture ;
- le bouton explicite `Ouvrir l’atelier auteur` aboutit à la même route.

Un serveur de fixture a ensuite renvoyé une réponse API `503` après un délai
contrôlé :

- l’état de sauvegarde est visible pendant l’attente ;
- le message d’échec est affiché dans la page ;
- le bouton `Enregistrer` est réactivé ;
- `aria-busy` est retiré ;
- l’URL reste
  `/teacher/edit/proto05-augmented-video-01` ;
- le SHA-256 de la fixture est identique avant et après la tentative refusée.

Aucune erreur ou alerte console n’a été relevée pendant cette recette. La
fixture et son serveur temporaire ont été supprimés après validation.

### Suite Proto05

- la première relance via Microsoft Edge a rencontré un incident GPU propre à
  l’environnement Chromium, sans assertion fonctionnelle en échec ;
- la relance finale avec Google Chrome explicitement sélectionné a exécuté les
  31 tests existants : 31 réussis, 0 échec.

### Intégrité et dépôt

- SHA-256 canonique après recette et tests :
  `1248F45CC9EAC88968CB6A72A28DE63BCD2E576C4D1C216F9B9D5B81A1851DF3`,
  identique au début de la mission ;
- `git diff --check` : succès ;
- les liens locaux du présent rapport ont été vérifiés.

## Éléments non vérifiés

- aucune sauvegarde n’a été exécutée contre `data/activities.json` ;
- aucune création ou modification de brouillon n’a été déclenchée ;
- aucun changement de droits ou d’authentification n’a été testé ;
- aucune validation fonctionnelle humaine n’a été réalisée.

## Message de commit proposé

`fix(proto05): ouvrir l’atelier auteur après édition`

## Limites restantes

- le processus Proto05 déjà actif sur `8791` expose encore le healthcheck
  `0.1.7` tant qu’il n’est pas redémarré ; les sources et la fixture validée sont
  en `0.1.8` ;
- la recette d’échec HTTP repose sur une réponse `503` simulée par le serveur de
  fixture ;
- le brouillon local préexistant dans `data/activities.json` reste présent et
  hors du périmètre de cette correction ;
- les modes enseignant et étudiant restent des libellés sans droits serveur
  réels.
