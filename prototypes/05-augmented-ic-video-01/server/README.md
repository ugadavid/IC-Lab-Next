# Serveur autonome du Prototype 05 — 0.1.12

Le serveur Node natif écoute sur `127.0.0.1:8791` et possède les données,
l’API et le service statique du prototype. Il sert `index-0.0.8.html` à la racine.

```powershell
npm start
```

Routes principales : `GET /`, `GET /student/:activityId`, `GET /teacher`,
`GET /teacher/preview/:activityId`, `GET /teacher/edit/:activityId`,
`GET /index-0.0.8.html`, `GET /api/health`, `GET /api/proto05/video-catalog`,
`GET /api/proto05/language-catalog`,
`GET /api/proto05/activities`, `GET /api/proto05/activities/:id` et
`POST /api/proto05/activities/:id/duplicate`.
Les méthodes non prévues sont refusées (`405`) et les chemins traversants sont
rejetés.

Les écritures locales couvrent la création d’un brouillon, la duplication et les
sauvegardes de métadonnées ou d’atelier auteur. Elles utilisent les validations
du prototype ; la sauvegarde JSON est atomique, séquencée et précédée d’un
fichier `.bak` UTF-8.

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
phénomènes, cohérence réciproque entre segments et phénomènes, ainsi que la
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
