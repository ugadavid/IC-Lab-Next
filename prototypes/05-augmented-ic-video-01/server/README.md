# Serveur autonome du Prototype 05 — 0.1.16

Le serveur Node natif écoute sur `127.0.0.1:8791` et possède les données,
l’API et le service statique du prototype. Il sert `index-0.0.9.html` à la racine.

```powershell
npm start
```

Routes principales : `GET /`, `GET /student/:activityId`, `GET /teacher`,
`GET /teacher/preview/:activityId`, `GET /teacher/edit/:activityId`,
`GET /index-0.0.9.html`, `GET /api/health`, `GET /api/proto05/video-catalog`,
`GET /api/proto05/language-catalog`,
`GET /api/proto05/activities`, `GET /api/proto05/activities/:id` et
`POST /api/proto05/activities/:id/duplicate`, ainsi que
`DELETE /api/proto05/activities/:id`.
Les méthodes non prévues sont refusées (`405`) et les chemins traversants sont
rejetés.

Les écritures locales couvrent la création d’un brouillon, la duplication, la
suppression et les sauvegardes de métadonnées ou d’atelier auteur. Elles
utilisent les validations du prototype ; la sauvegarde JSON est atomique,
séquencée et précédée d’un fichier `.bak` UTF-8.

## Locuteurs propres à chaque activité (0.1.16)

Les locuteurs restent dans `activity.speakers` et ne proviennent d’aucun
référentiel global. Les ateliers avancé et guidé affichent uniquement leurs noms
lisibles, permettent de les ajouter ou modifier et de choisir un ou plusieurs
locuteurs existants dans chaque segment. Les identifiants techniques sont
générés automatiquement, conservés après sauvegarde et masqués dans les deux
interfaces ; les identifiants historiques ne sont pas renommés.

La suppression locale est refusée tant que le locuteur est référencé par un
segment ou par les champs optionnels `speakerId`/`speakerIds` d’une annotation.
Le serveur vérifie l’unicité des identifiants, les libellés non vides et toutes
ces références avant sauvegarde. La duplication conserve les libellés, régénère
les identifiants locaux et remappe `segments[].speakerIds`.

## Suppression sécurisée d’activité (0.1.14)

La bibliothèque enseignant propose une suppression après confirmation affichant
le titre et l’identifiant. Une annulation n’appelle pas l’API. Pendant la
requête, le bouton reste désactivé ; un succès retire la carte et maintient
l’utilisateur dans la bibliothèque, tandis qu’une erreur reste visible sur la
carte.

La route `DELETE /api/proto05/activities/:id` refuse les identifiants mal formés
(`400`), inconnus (`404`) ou ambigus (`409`) avant toute écriture. Une suppression
acceptée retire exactement une entrée, crée `activities.json.bak`, écrit un
fichier temporaire adjacent puis le renomme atomiquement. Il n’existe pas de
protection par rôle ni de corbeille : la sauvegarde `.bak` est le retour arrière
local immédiat et n’est jamais supprimée automatiquement.

## Relation segment–phénomène (0.1.13)

`phenomena[].segmentId` est la source de vérité du rattachement à un segment.
Chaque phénomène conserve ses propres `startMs` et `endMs`. La timeline, la
transcription étudiante et les ateliers calculent leurs affichages depuis cette
relation.

`segments[].phenomenonIds` est conservé dans les données historiques uniquement
comme cache dérivé. Lorsqu’il est présent, le serveur exige une égalité exacte
avec les phénomènes dont `segmentId` vise le segment. Les ateliers maintiennent
ce cache après ajout, modification ou suppression; la duplication le reconstruit
depuis `phenomena[].segmentId`. Une activité déjà incohérente est refusée sans
réparation automatique.

## Référentiel partagé des langues (0.1.12)

Le dictionnaire minimal du workspace se trouve dans
`shared/reference-data/languages.json`. Proto05 le sert en lecture seule sous
`GET /api/proto05/language-catalog` et refuse les autres méthodes sur cette
route.

L’atelier auteur propose exclusivement les quatre entrées `fr`, `es`, `it` et
`pt` dans une sélection multiple. Les cinq activités présentes au passage en
`0.1.12` ont été migrées vers ces identifiants stables. Le serveur refuse les
identifiants et libellés locaux ; une duplication conserve les identifiants du
référentiel au lieu d’en créer de nouveaux.

Le script `scripts/migrate-language-catalog.js` réalise la migration sur un
fichier explicitement désigné. En mode `--apply`, il exige une sauvegarde `.bak`,
la crée sans écraser un fichier existant, puis remplace le JSON par renommage
atomique après validation des volumes et des champs autorisés à changer.

## Brouillon vide et validation d’intégrité (0.1.10)

Un nouveau brouillon initialise désormais une transcription sans langue par
défaut (`languageId: null`) et des collections réellement vides. Il peut être
créé puis sauvegardé depuis l’atelier auteur sans générer de segment fictif.

Avant toute sauvegarde, le serveur valide l’activité finale : unicité des
identifiants, références vers langues, locuteurs, segments, couches et
phénomènes, cohérence du cache dérivé des segments avec `phenomena[].segmentId`, ainsi que la
structure et les références de la configuration de couches. Une activité
historique invalide est refusée avec un diagnostic, sans correction ni
réécriture automatique.

La vue étudiant est explicitement en consultation. La bibliothèque enseignant
est en lecture seule ; sa prévisualisation utilise le même moteur que la vue
étudiant. Le mode enseignant est local au prototype et ne fournit ni
authentification ni gestion réelle des droits.

## Duplication d’activité (0.1.9)

La bibliothèque enseignant propose `Dupliquer l’activité`. La route locale de
duplication crée un brouillon indépendant, régénère les identifiants internes et
leurs références, conserve les contenus auteur et exclut les observations
étudiantes, qui restent en mémoire navigateur. L’original n’est pas modifié et
la copie s’ouvre directement dans l’atelier auteur. Les activités inconnues ou
invalides sont refusées avant la sauvegarde atomique.

## Édition des métadonnées (0.1.8)

Après une sauvegarde réussie dans `/teacher/edit/:activityId`, le parcours ouvre
`/teacher/author/:activityId` avec le même identifiant. La page conserve les
accès à la bibliothèque et à la prévisualisation, et propose aussi un accès
direct explicite à l’atelier auteur. Une erreur API reste affichée sur la page
sans déclencher de redirection.

## Atelier auteur (0.1.1)

`/teacher/create` crée un brouillon et `/teacher/author/:activityId` permet de
préparer métadonnées, transcription, intervalles linguistiques, phénomènes,
couches et annotations. La sauvegarde utilise
`PUT /api/proto05/activities/:id/authoring` et reste limitée au JSON du prototype.
Les temps sont des millisecondes entières ; les vidéos proviennent exclusivement
de `/api/proto05/video-catalog`. L’atelier est local, sans authentification ni
droits réels.

Le proxy HLS n’est pas dupliqué ici : les seules sources autorisées sont
relayées vers le proxy HLS strict d’IC-Hub (`8790`). Cette dépendance résiduelle
est temporaire et documentée ; la page autonome reste sans URL distante
arbitraire ni SSRF.
