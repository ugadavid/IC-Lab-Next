# Rapport 040 — Dictionnaire partagé des langues Proto05

**Date :** 16 juillet 2026  
**Périmètre :** référentiel transversal du workspace et atelier auteur du
Prototype 05  
**Mission :** créer un dictionnaire commun minimal de langues, le servir en
lecture seule et l’utiliser dans un brouillon vide sans migrer les activités
existantes.

## État réel observé avant modification

- Le serveur Proto05 était en version `0.1.10` et le moteur étudiant restait
  `index-0.0.8.html`.
- Aucun dossier ni contrat global de référentiels n’existait à la racine du
  workspace.
- L’atelier auteur utilisait des champs texte pour `segment.languageIds` et
  `languageInterval.languageId`. Il n’exposait aucune sélection commune des
  langues de l’activité.
- `data/activities.json` contenait réellement cinq activités au début de cette
  mission : l’activité historique, `MboloTest`, `Lbinz`, `Original_copy` et
  `brouillon_vide`.
- Le SHA-256 canonique initial était
  `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD`.
- Le worktree comportait déjà de nombreuses modifications non commitées sur
  Proto05 et IC-Hub. Elles ont été préservées.

## Choix d’architecture

Le dictionnaire est placé dans
`shared/reference-data/languages.json`. Il appartient au workspace, et non à
IC-Hub ou à un autre prototype. Ce choix évite :

- de transformer IC-Hub en propriétaire d’une donnée métier commune ;
- de créer une dépendance entre Proto05 et Proto06 ou Dico-IC ;
- de dupliquer le dictionnaire dans les activités Proto05.

Le référentiel transversal ne possède aucune activité, annotation ou donnée
pédagogique. Les activités restent la propriété de Proto05 dans
`data/activities.json`.

## Référentiel réalisé

Le fichier contient uniquement les quatre entrées demandées :

| Identifiant stable | Libellé |
|---|---|
| `fr` | Français |
| `es` | Espagnol |
| `it` | Italien |
| `pt` | Portugais |

Le serveur charge ce contrat au démarrage et expose
`GET /api/proto05/language-catalog`. Toute autre méthode sur cette route est
refusée avec `405` et `Allow: GET`. Aucune écriture du référentiel n’est
implémentée.

## Atelier auteur

- Une section « Langues de l’activité » propose une sélection multiple composée
  exclusivement des quatre entrées du référentiel.
- Une langue choisie est enregistrée dans un nouveau brouillon sous la forme
  `{ id, code, label }`, avec l’identifiant stable, le code majuscule attendu
  par le modèle Proto05 et le libellé fourni par le référentiel.
- Le champ texte `segment.languageIds` est remplacé par une sélection multiple.
- Le champ texte `languageInterval.languageId` est remplacé par une sélection
  simple, car le modèle courant d’un intervalle ne contient qu’une seule langue.
- Aucun nom de langue ne peut être saisi manuellement dans ces contrôles.
- Les activités utilisant les anciens identifiants de langues sont détectées
  comme historiques : leurs langues restent affichées comme conservées et ne
  sont pas converties ni éditées par la nouvelle sélection.
- Le serveur refuse également une tentative d’introduire une langue absente du
  référentiel dans un brouillon utilisant le nouveau contrat.

## Préservation des données

Aucune activité existante n’a été migrée, normalisée ou réécrite. Après les
contrôles :

- les cinq activités et leur ordre sont inchangés ;
- `MboloTest`, `Lbinz`, `Original_copy` et `brouillon_vide` sont préservés ;
- le SHA-256 canonique reste
  `35F780A52911B0AAC69B0B887151844D4FC45FAB42E75D3F4E2D90D4514B53BD`.

## Fichiers concernés par la mission

- `shared/reference-data/languages.json`
- `shared/reference-data/README.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/language-catalog.test.js`
- `reports/040_prototype_05_shared_language_catalog_report.md`

`data/activities.json` n’a pas été écrit par cette mission. Les autres fichiers
déjà modifiés dans le worktree n’ont pas été restaurés ni réécrits.

## Version obtenue

- Serveur Proto05 : `0.1.10` → `0.1.11`.
- Moteur étudiant : `index-0.0.8.html`, inchangé.
- Référentiel partagé : premier contrat, sans numéro de version applicative
  distinct.

L’incrément `0.1.11` est un baby step fonctionnel limité au catalogue en lecture
seule et aux contrôles de sélection de l’atelier auteur.

## Contrôles réalisés

### Analyse statique

- `npm run check` : réussi en version `0.1.11`.
- `git diff --check` : réussi ; seuls les avertissements Windows LF/CRLF du
  worktree ont été affichés.

### Trois tests ciblés

Commande :

`node --test --test-concurrency=1 test/language-catalog.test.js`

Résultat : **3 tests réussis, 0 échec**.

1. contenu exact du fichier partagé, réponse GET exacte, refus POST et absence
   d’écriture ;
2. sauvegarde de `fr` et `es` dans un brouillon temporaire, refus de `de` et
   absence d’écriture après le refus ;
3. parcours Chromium complet sur fixture temporaire.

Le référentiel partagé et le JSON canonique ont le même SHA-256 avant et après
les tests.

### Vérification Chromium unique

Une seule exécution Chromium a été effectuée pour cette mission :

`/teacher/create` → création d’un brouillon temporaire → atelier auteur →
sélection multiple `fr` + `es` → ajout d’un segment utilisant `fr` + `es` →
sauvegarde.

Résultats observés :

- quatre options exactes dans le sélecteur ;
- sélection multiple active pour l’activité et le segment ;
- aucun champ texte de langue ;
- confirmation « Brouillon sauvegardé. » ;
- activité relue avec les deux langues et les références du segment ;
- aucun débordement horizontal au viewport représentatif demandé
  (`1440×1000`, surface utile Chromium supérieure à `1400×800`).

### Suite complète

La suite complète des 55 tests n’a volontairement pas été relancée,
conformément à la mission. Aucun échec ni indice de régression n’a été rencontré
pendant les trois contrôles ciblés.

## Éléments non vérifiés

- Aucune validation fonctionnelle humaine par David n’a été réalisée.
- Les activités historiques n’ont pas été ouvertes puis sauvegardées : leur
  préservation a été vérifiée par l’absence d’écriture et le hash canonique.
- Les autres prototypes ne consomment pas encore ce référentiel.
- La suite complète des 55 tests n’a pas été exécutée.

## Limites restantes

- `MboloTest` et `Lbinz` conservent leurs incohérences historiques déjà
  documentées ; aucune migration n’est incluse.
- `Original_copy` conserve ses références de phénomènes incohérentes ; la
  mission n’a modifié aucune relation segment/phénomène.
- Les langues historiques de l’activité principale et d’`Original_copy`
  utilisent encore leurs identifiants locaux. Elles restent en lecture seule
  dans le nouveau contrôle jusqu’à une mission de migration explicite.
- La création complète des locuteurs, transcriptions et intervalles reste hors
  périmètre. Cette mission ne traite que la sélection des langues.
- Aucun service d’authentification, de gestion vidéo ou d’écriture du
  référentiel n’a été ajouté.

## Suite éventuelle

Une mission séparée pourra décider si et comment migrer les identifiants de
langues historiques vers `fr`, `es`, `it` et `pt`, avec sauvegarde, plan de
retour arrière et validation humaine. Une autre mission pourra autoriser un
second prototype à consommer le dictionnaire partagé sans dupliquer son
contenu.

## Validation humaine

Les faits ci-dessus résultent de l’inspection du dépôt, des tests ciblés et de
la recette Chromium de Codex. Ils ne constituent pas une validation humaine de
David.

## Message de commit proposé

`feat(proto05): partager le référentiel des langues`
