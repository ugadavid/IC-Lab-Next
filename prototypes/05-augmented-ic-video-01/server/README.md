# Serveur autonome du Prototype 05

Le serveur Node natif écoute sur `127.0.0.1:8791` et possède les données,
l’API et le service statique du prototype. Il sert `index-0.0.8.html` à la racine.

```powershell
npm start
```

Routes principales : `GET /`, `GET /student/:activityId`, `GET /teacher`,
`GET /teacher/preview/:activityId`, `GET /teacher/edit/:activityId`,
`GET /index-0.0.8.html`, `GET /api/health`, `GET /api/proto05/video-catalog`,
`GET /api/proto05/activities` et `GET /api/proto05/activities/:id`.
Les écritures sont refusées (`405`) et les chemins traversants sont rejetés.

La seule écriture est `PUT /api/proto05/activities/:id`, limitée à `title`,
`description`, `instruction`, `pedagogicalQuestion` et `videoId`. Les autres
champs sont protégés. La sauvegarde est atomique, séquencée et précédée d’un
fichier `.bak` UTF-8.

La vue étudiant est explicitement en consultation. La bibliothèque enseignant
est en lecture seule ; sa prévisualisation utilise le même moteur que la vue
étudiant. Le mode enseignant est local au prototype et ne fournit ni
authentification ni gestion réelle des droits.

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
