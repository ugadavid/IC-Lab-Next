# Mission 123 — Socle visuel et navigation partagés des vues enseignantes Proto05

Date : 2026-07-26  
Nature : évolution visuelle et navigation enseignante  
Version obtenue : `0.1.43`

## 1. Résultat

Les neuf routes enseignantes actives de Proto05 utilisent désormais un même
socle visuel et un même en-tête :

- identité **Vidéo augmentée** ;
- navigation générale vers **Bibliothèque**, **Nouvelle activité**,
  **Vidéothèque** et **IC-Hub** ;
- indication accessible de la section courante ;
- navigation contextuelle lorsqu'une activité est ouverte ;
- titre et statut de l'activité courante ;
- distinction explicite entre **Atelier guidé** et
  **Atelier auteur · Mode expert** ;
- action **Enregistrer** et état de sauvegarde conservés dans l'en-tête
  collant des trois pages d'édition.

Le langage visuel reprend la police système, le fond gris très clair, les
surfaces blanches, la palette bleu-vert, les rayons, bordures et ombres légères
de la vidéothèque. Les anciens contenus métier restent en place : la mission
harmonise leur contenant sans réorganiser les formulaires, cartes, timelines
ou outils média.

La route étudiante `/student/:id` et le moteur servi à `/` ne montent ni menu,
ni feuille de style enseignante, ni classe de page enseignante. La
prévisualisation `/teacher/preview/:id` reçoit le menu seulement lorsqu'elle
est ouverte comme page principale ; le même aperçu intégré dans l'iframe de
l'atelier auteur ne reçoit pas de second menu imbriqué.

## 2. État initial

- Branche : `main`
- Relation au distant : `main...origin/main [ahead 6]`
- Arbre de travail initial : propre
- Commit initial :
  `7ae1cfcd97a89b4a9a7e3606e3711e04faa6363b`
- Intitulé :
  `docs(proto05): audit teacher navigation architecture`
- Date :
  `2026-07-26T18:35:38+02:00`
- Mission 122 : commitée et présente dans
  `reports/122_proto05_teacher_navigation_audit.md`
- Version Proto05 initiale : `0.1.42`
- Artefact étudiant courant : `index-0.0.9.html`

Aucune modification non liée n'était présente au démarrage.

## 3. Sources et routes inspectées

### Instructions et documentation

- `AGENTS.md`
- `docs/WORKSPACE_PROVENANCE.md`
- `docs/ARCHITECTURE.md`
- `PROJECTS_LAUNCH.md`
- `STATUS.md`
- `reports/122_proto05_teacher_navigation_audit.md`, lu intégralement

### Code et tests

- routeur statique de `server/server.js` ;
- huit pages HTML enseignantes autonomes ;
- artefact partagé `index-0.0.9.html` ;
- styles de `teacher-videos.html` pris comme référence principale ;
- styles et comportements collants de `teacher-author.html` et
  `teacher-videos.html` ;
- serveur temporaire et tests voisins sous `server/test/`.

### Routes enseignantes confirmées

| Route | État | Socle appliqué |
| --- | --- | --- |
| `/teacher` | active | général |
| `/teacher/create` | active | général |
| `/teacher/edit/:activityId` | active | général + activité + sauvegarde |
| `/teacher/guided/:activityId` | active | général + activité + sauvegarde |
| `/teacher/author/:activityId` | active, mode expert | général + activité + sauvegarde |
| `/teacher/preview/:activityId` | active | général + activité, seulement en page principale |
| `/teacher/videos` | active | général |
| `/teacher/videos/:videoId` | active | général, section Vidéothèque |
| `/teacher/anonymization/:jobId` | active et spécialisée | général, section Vidéothèque |

Routes volontairement exclues :

- `/student/:activityId`, `/student` et `/` : expérience étudiante ;
- `/teacher/anonymization-advanced/:jobId` : ancienne route retirée, toujours
  absente et toujours 404.

## 4. Choix visuels issus de la vidéothèque

Le nouveau fichier partagé reprend puis formalise :

- `system-ui` comme pile typographique ;
- fond général `#f6f7fb` ;
- texte principal bleu-noir `#172033` ;
- primaire bleu-vert `#164e63` ;
- accent `#0e7490` ;
- surfaces blanches ;
- bordures gris-bleu `#dbe1ea` ;
- rayons de 8 à 14 px ;
- ombres diffuses peu contrastées ;
- largeur maximale généreuse de 1440 px ;
- espaces réguliers à base de `0.5rem`, `1rem` et `1.5rem` ;
- états succès, avertissement et erreur cohérents ;
- focus clavier jaune de 3 px, visible et non dépendant de la couleur.

Les sélecteurs partagés harmonisent le fond, la typographie, les principaux
panneaux, cartes, champs et boutons sans remplacer les styles spécialisés des
timelines, masques, couches ou contrôles vidéo.

Les anciennes pages Arial/bleu historique reçoivent le même socle que les
pages média récentes. Les compléments locaux restent présents, mais ne
définissent plus l'identité générale de l'application.

## 5. Architecture du socle partagé

### `shared/teacher-shell.css`

Le fichier contient :

- variables de couleur, surface, bordure, rayon, ombre et largeur ;
- structure de l'en-tête général et contextuel ;
- styles d'état actif, survol et focus ;
- badges de statut et de mode expert ;
- états de sauvegarde ;
- socle des conteneurs enseignants ;
- adaptations ciblées des anciennes pages ;
- comportement collant ;
- responsive par grilles compactes et défilements internes horizontaux ;
- respect de `prefers-reduced-motion`.

Le fichier reste centré sur le contenant enseignant. Il ne remplace pas les
styles métier de chaque page.

### `shared/teacher-shell.js`

Le script autonome :

1. classe la route courante ;
2. quitte immédiatement si la route n'est pas enseignante ;
3. centralise l'unique URL locale d'IC-Hub ;
4. crée l'en-tête avec des éléments HTML interactifs natifs ;
5. pose `aria-current="page"` sur la destination courante ;
6. ajoute les quatre destinations d'activité quand un `activityId` existe ;
7. charge en lecture seule le titre et le statut de l'activité ;
8. installe le contrôle de sauvegarde seulement sur la fiche, le guidé et
   l'auteur ;
9. expose quelques fonctions pures au test Node ;
10. refuse de monter le menu de prévisualisation dans une iframe.

Le composant n'est ni un framework, ni un propriétaire des données métier.
Les formulaires et gestionnaires existants restent responsables de leurs
sauvegardes.

### Intégration HTML

Les huit pages enseignantes autonomes chargent les deux actifs partagés.
`index-0.0.9.html` charge seulement le script. Sur cette page partagée, le
script injecte la feuille de style et le DOM exclusivement sous
`/teacher/preview/:id`.

Le serveur temporaire de tests copie aussi les deux nouveaux actifs. Le
serveur de production n'a pas besoin de nouvelle route : son service statique
existant couvre déjà `/shared/`.

## 6. Menu général

Structure :

1. **Vidéo augmentée**, repère identitaire et lien vers `/teacher` ;
2. **Bibliothèque**, `/teacher` ;
3. **Nouvelle activité**, `/teacher/create` ;
4. **Vidéothèque**, `/teacher/videos` ;
5. **IC-Hub**, URL centralisée dans `teacher-shell.js`.

La section active est indiquée par :

- `aria-current="page"` ;
- fond légèrement coloré ;
- trait inférieur ;
- point d'accent, afin de ne pas dépendre uniquement de la couleur.

Les pages de détail vidéo et d'anonymisation activent la section
**Vidéothèque**. Les pages liées à une activité n'activent pas artificiellement
la bibliothèque : leur emplacement précis est porté par le deuxième niveau.

Le lien identitaire et les liens de navigation sont de vrais éléments `<a>`.
L'action Enregistrer est un vrai `<button>`. Un lien d'évitement vers le
contenu principal est ajouté.

## 7. Navigation contextuelle d'une activité

Le deuxième niveau apparaît uniquement sous :

- `/teacher/edit/:id` ;
- `/teacher/guided/:id` ;
- `/teacher/author/:id` ;
- `/teacher/preview/:id`.

Il présente :

- le titre courant, tronqué visuellement si nécessaire mais conservé dans
  l'attribut `title` ;
- le statut métier de l'activité, par exemple **Brouillon** ;
- **Fiche pédagogique** ;
- **Atelier guidé** ;
- **Atelier auteur**, accompagné d'un badge **Mode expert** ;
- **Prévisualisation étudiante**.

Le guidé et l'auteur sont des destinations sœurs. Le mode auteur n'est ni
caché ni présenté comme historique. L'ancien anonymiseur avancé ne figure
jamais dans la navigation.

Les anciens liens contextuels redondants sont masqués lorsqu'ils sont
exactement remplacés par le deuxième niveau. L'ouverture autonome de la vue
étudiante reste disponible dans les ateliers quand elle correspond à une
action différente de la prévisualisation enseignante.

## 8. Navigation, actions et états

Le composant sépare :

- les destinations générales ;
- les destinations de l'activité ;
- l'action de sauvegarde ;
- le statut métier de l'activité ;
- l'état technique de sauvegarde.

États techniques présentés :

- **Modifications non enregistrées** après un événement `input` ou `change` ;
- **Enregistrement…** au déclenchement ;
- **Enregistré** après le message de succès de la page ;
- **Échec de l'enregistrement** après une erreur reconnue.

La sauvegarde n'a été ajoutée à aucune page qui n'en possédait pas.

Pour préserver les contrats existants :

- le bouton métier `#save` reste dans le DOM et conserve son gestionnaire ;
- il devient visuellement masqué et retiré de l'ordre de tabulation ;
- le bouton du socle déclenche le gestionnaire historique ;
- sur la fiche, il utilise `requestSubmit` avec le bouton d'origine afin de
  conserver la soumission et la validation du formulaire ;
- dans les ateliers, il déclenche le bouton historique et son `onclick` ;
- l'état existant `#status` est observé mais non remplacé.

Une sauvegarde complète de la fiche a été exécutée sur une copie temporaire :
le nouveau bouton a enregistré le titre attendu et les quatre états sont
restés lisibles. Aucune donnée canonique n'a été écrite.

## 9. Pages longues et responsive

L'en-tête unique utilise `position: sticky; top: 0`. Il contient les deux
niveaux et, le cas échéant, la sauvegarde. Il n'y a pas trois barres
indépendantes.

Contrôle en exécution sur la fiche :

- après un défilement de `1100 px`, `shellTop = 0` ;
- position calculée : `sticky` ;
- hauteur observée sur la largeur bureau du navigateur : environ `130 px` ;
- aucun débordement horizontal de la page.

À `375 × 844` :

- hauteur du conteneur complet : `213 px` ;
- activité, statut et sauvegarde restent visibles ;
- aucun débordement horizontal du document ;
- les deux groupes de navigation disposent de leur propre défilement
  horizontal plutôt que d'élargir la page.

Le résultat reste un compromis compact pour quatre destinations contextuelles.
La densité et la hauteur mobile doivent encore être appréciées par David.

## 10. Vues effectivement harmonisées

### Bibliothèque d'activités

- fond, typographie et largeur communs ;
- activités présentées comme surfaces cohérentes ;
- menu général et section Bibliothèque active ;
- cartes et détails existants non compactés.

### Création

- menu général, section Nouvelle activité active ;
- panneaux, champs et boutons sur le socle commun ;
- choix de vidéo et création inchangés.

### Fiche pédagogique

- deux niveaux de navigation ;
- titre et statut d'activité ;
- sauvegarde collante et états ;
- contenu, catégories, informations et comportement des champs inchangés.

### Atelier guidé

- deux niveaux de navigation ;
- sauvegarde collante ;
- ancien lien générique `Mode avancé` remplacé visuellement par
  **Atelier auteur · Mode expert** ;
- vidéo, timeline et éditeurs internes inchangés.

### Atelier auteur

- deux niveaux de navigation ;
- mode expert explicite ;
- ancienne barre collante basse retirée visuellement ;
- sauvegarde remontée dans l'en-tête ;
- prévisualisation intégrée sans menu imbriqué ;
- outils experts et densité interne conservés.

### Prévisualisation enseignante

- menu général et navigation d'activité en page principale ;
- moteur étudiant interne inchangé ;
- aucune sauvegarde inventée.

### Vidéothèque

- reste la référence visuelle ;
- reçoit le même menu général et l'état actif Vidéothèque ;
- bibliothèque média, cartes, panneaux et actions inchangés.

### Détail vidéo

- menu général et section Vidéothèque ;
- contenu spécialisé et actions par rôle inchangés ;
- libellé de version ancien corrigé vers `0.1.43`.

### Anonymisation active

- menu général et section Vidéothèque ;
- fond, conteneur et typographie générale harmonisés ;
- éditeur de masques, traitements et dérivations inchangés.

## 11. Préservation de la vue étudiante

La même source HTML sert les routes étudiante et de prévisualisation. La seule
modification de `index-0.0.9.html` est donc le chargement différé du script de
détection.

Sous `/student/:id` et `/` :

- `routeContext` renvoie `null` ;
- le script s'arrête avant toute mutation ;
- aucune feuille `teacher-shell.css` n'est ajoutée ;
- aucune classe de page enseignante n'est ajoutée ;
- aucun menu n'est ajouté.

Sous `/teacher/preview/:id` :

- le script monte le socle si `window.self === window.top` ;
- il s'arrête dans l'iframe de l'atelier auteur.

La recette navigateur a confirmé :

| État | Prévisualisation enseignante | Vue étudiante |
| --- | --- | --- |
| Menu présent | oui | non |
| Feuille enseignante injectée | oui | non |
| Classe enseignante sur `body` | oui | non |
| Débordement horizontal | non | non |

## 12. Fichiers créés ou modifiés

### Créés

- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.css`
- `prototypes/05-augmented-ic-video-01/shared/teacher-shell.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-ui-navigation.test.js`
- `reports/123_proto05_shared_teacher_ui_and_navigation.md`

### Pages intégrées

- `prototypes/05-augmented-ic-video-01/teacher.html`
- `prototypes/05-augmented-ic-video-01/teacher-create.html`
- `prototypes/05-augmented-ic-video-01/teacher-edit.html`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/teacher-author.html`
- `prototypes/05-augmented-ic-video-01/teacher-videos.html`
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html`
- `prototypes/05-augmented-ic-video-01/teacher-anonymization.html`
- `prototypes/05-augmented-ic-video-01/index-0.0.9.html`

### Version et tests

- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/teacher-save.test.js`

Aucun fichier de données, contrat média, launcher, IC-Hub ou autre prototype
n'a été modifié.

## 13. Tests ajoutés ou adaptés

### Nouveau test `teacher-ui-navigation.test.js`

Sept contrôles :

1. classification exacte des routes enseignantes et rejet des routes
   étudiantes ;
2. destinations générales, état actif et URL IC-Hub centralisée ;
3. quatre destinations contextuelles et mode expert ;
4. présence du socle dans les pages enseignantes et garde de l'artefact
   étudiant ;
5. conservation des actions métier existantes ;
6. service HTTP des neuf routes, des deux actifs et maintien du 404 historique ;
7. sauvegarde Chromium de la fiche sur copie temporaire depuis le bouton
   collant.

### Tests adaptés

- le serveur temporaire copie les deux actifs partagés ;
- le serveur de fixture de `teacher-save.test.js` sert ces actifs afin que son
  scénario guidé continue de tester la page réelle.

## 14. Commandes et résultats

### Contrôles réussis

| Commande | Résultat |
| --- | --- |
| `node --check shared/teacher-shell.js` | succès |
| `node --check server/test/teacher-ui-navigation.test.js` | succès |
| `npm.cmd run check` | succès, serveur `0.1.43` syntaxiquement valide |
| `node --test --test-concurrency=1 test/teacher-ui-navigation.test.js` | 7 tests réussis, 0 échec |
| `node --test --test-concurrency=1 test/teacher-save.test.js` | 13 tests réussis, 0 échec |
| `node --test --test-concurrency=1 test/video-workspaces.test.js` | 7 tests réussis, 0 échec |
| `node --test --test-concurrency=1 test/hls-preparation.test.js` | 8 tests réussis, 0 échec |
| recherche `anonymization-advanced`, `0.1.42`, `0.1.40` dans les sources concernées | aucun résultat |
| `git diff --check` | succès ; avertissements de conversion LF/CRLF seulement |

La suite exhaustive n'a pas été lancée.

### Test voisin présentant des échecs antérieurs

Commande :

```text
node --test --test-concurrency=1 test/pedagogical-identity.test.js
```

Résultat : 6 réussites, 3 échecs.

Échecs observés :

1. le test attend `indicativeDuration.state === "unknown"` alors que la donnée
   canonique commitée vaut déjà `"to-verify"` ;
2. le scénario Chromium historique expire en attendant le message de
   sauvegarde d'une activité legacy ;
3. le second scénario Chromium répète l'attente `"unknown"` contredite par la
   donnée canonique.

Le scénario de sauvegarde legacy a été relancé avec le script du nouveau socle
temporairement remplacé par une ressource inexistante, puis le fichier a été
immédiatement restauré. L'échec et le même délai ont été reproduits sans le
socle. Les deux autres échecs portent sur l'état canonique avant toute
interaction UI. Ces trois échecs ne sont donc pas attribuables à la Mission
123 et n'ont pas été « corrigés » hors périmètre.

Le nouveau test de sauvegarde collante utilise une fixture cohérente, écrit
uniquement dans la copie temporaire et réussit.

## 15. Recette technique et visuelle limitée

Une recette en navigateur local a été menée sur le serveur déjà actif à
`http://127.0.0.1:8791`.

Pages inspectées :

- bibliothèque ;
- création ;
- fiche pédagogique ;
- atelier guidé ;
- atelier auteur ;
- prévisualisation enseignante ;
- vue étudiante ;
- vidéothèque ;
- détail vidéo réel ;
- route d'anonymisation spécialisée.

Faits constatés :

- menu présent sur toutes les vues enseignantes inspectées ;
- rubrique active correcte ;
- onglet d'activité actif correct ;
- titre et statut de l'activité présents ;
- atelier auteur accompagné du badge Mode expert ;
- aucun menu imbriqué dans l'iframe de l'auteur ;
- bouton de sauvegarde visible dans l'en-tête ;
- état non enregistré déclenché après modification d'un champ ;
- pas de débordement horizontal manifeste ;
- comportement collant confirmé après défilement ;
- aucun message console d'erreur ou d'avertissement sur le contrôle final ;
- vue étudiante sans classe, style ou menu enseignant.

Dimensions :

- largeur bureau du navigateur, environ 1265 px ;
- contrôle ciblé à `375 × 844`.

La route d'anonymisation a été contrôlée pour son contenant avec un identifiant
de recette inexistant. Aucun traitement réel n'a été lancé. Le fonctionnement
du moteur et des dérivations a été couvert par les huit tests
`hls-preparation.test.js`, sans nouvelle recette métier.

## 16. Limites et validation humaine

### Non vérifié automatiquement

- qualité esthétique subjective sur tous les contenus et toutes les tailles ;
- lecture avec un lecteur d'écran ;
- audit WCAG exhaustif ;
- tous les navigateurs ;
- workflow visuel complet d'anonymisation avec un job actif ;
- confort réel de Christian ;
- efficacité quotidienne de David.

### Points courts pour David

1. hauteur du double niveau, surtout sur petit écran ;
2. confort du défilement horizontal des menus à `375 px` ;
3. équilibre visuel entre Atelier guidé et Auteur · Mode expert ;
4. pertinence du lien IC-Hub dans les modes de lancement non locaux ;
5. densité des anciennes pages maintenant placées dans le nouveau contenant ;
6. sensation de continuité entre activités et vidéothèque.

La validation menée ici est technique. Elle ne vaut pas validation humaine de
David.

## 17. Version

Proto05 passe de **`0.1.42` à `0.1.43`**.

Justification : harmonisation visuelle et navigation partagée constituent une
évolution incrémentale du prototype, compatible avec la série `0.1.x`. Aucun
passage à `0.2` n'est impliqué.

Sources de vérité mises à jour :

- `server/package.json` ;
- constante `VERSION` de `server/server.js`.

Le libellé secondaire de la fiche vidéo a été aligné sur `0.1.43`.

Le processus local déjà actif à 8791 avait été démarré avant la modification :
son endpoint `/api/health` annonçait encore `0.1.42` pendant la recette. Les
fichiers statiques modifiés étaient bien relus à chaque requête et ont permis
la validation visuelle, mais un redémarrage normal de Proto05 sera nécessaire
pour que le processus annonce `0.1.43`. Le processus utilisateur n'a pas été
arrêté ni redémarré silencieusement.

## 18. État Git final et commit proposé

Le numéro de rapport a été vérifié immédiatement avant sa création :
maximum existant `122`, absence de collision avec `123`.

État final observé :

```text
## main...origin/main [ahead 6]
13 fichiers suivis modifiés
4 fichiers non suivis créés :
  shared/teacher-shell.css
  shared/teacher-shell.js
  server/test/teacher-ui-navigation.test.js
  reports/123_proto05_shared_teacher_ui_and_navigation.md
```

Les treize fichiers suivis sont ceux énumérés dans la section 12. Aucun
fichier de données n'apparaît dans l'état Git.

Aucun commit ni push n'a été effectué.

Message de commit proposé :

```text
feat(proto05): unify teacher UI and navigation
```

Ce rapport distingue les contrôles automatiques et visuels de la validation
humaine encore attendue.
