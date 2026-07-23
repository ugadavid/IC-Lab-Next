# Mission 067 — Proto05 : conception canonique de la Library vidéo

Date de l’audit : 23 juillet 2026.

## Périmètre et état observé

Cette mission est documentaire. Aucun code fonctionnel, aucune route et aucune donnée canonique n’a été modifié.

Sources consultées : code courant, données courantes, AGENTS.md, STATUS.md, docs/ARCHITECTURE.md, README de Proto05 et README du serveur autonome. Les anciens rapports servent uniquement de contexte.

Le serveur courant déclare VERSION = "0.1.22" dans prototypes/05-augmented-ic-video-01/server/server.js. Le README serveur porte encore 0.1.16 : cette divergence documentaire doit être résolue dans une mission de versionnement séparée. Le moteur étudiant servi est index-0.0.9.html.

## 1. Audit de l’existant

### 1.1 Référence vidéo actuelle

La référence portée par chaque activité dans prototypes/05-augmented-ic-video-01/data/activities.json est l’objet activity.video. Pour UGA, il contient actuellement id, title, kind = hls, proxyUrl et durationMs. Pour YouTube, il contient notamment id, title, provider, videoId, embedUrl et durationMs.

Le champ utilisé dans les ateliers et les métadonnées est video.id, transmis comme videoId dans les payloads d’écriture. Une activité ne référence donc pas encore un asset logique distinct, une copie locale ou une version dérivée.

Le catalogue propriétaire est prototypes/05-augmented-ic-video-01/data/video-catalog.json. Il contient trois entrées autorisées : une source UGA/HLS et deux sources YouTube, dont FG4h0_v3oTk. Le catalogue est chargé au démarrage du serveur et constitue la source de vérité des identifiants autorisés.

### 1.2 Consommateurs

| Surface | Consommation actuelle | Fragilité pour une Library |
|---|---|---|
| Serveur Proto05 | Charge video-catalog.json; valide activity.video; construit la projection avec activityVideoFromCatalog(); utilise videoId pour création, métadonnées, authoring et duplication. | Contrat d’activité couplé à la projection, sans asset/copie/version. |
| Bibliothèque et création | teacher.html, teacher-create.html et teacher-edit.html chargent GET /api/proto05/video-catalog et envoient l’identifiant sélectionné. | Sélection directe d’une entrée du catalogue. |
| Catalogue enseignant | teacher-videos.html affiche les entrées et POSTe provider, title et link. | Lien d’import et identité durable sont mélangés. |
| Atelier auteur | teacher-author.html charge activité, catalogue et langues; remplit un select; sauvegarde videoId; ouvre la prévisualisation. | Aucun choix de copie ou version. |
| Atelier guidé | teacher-guided.html charge activity.video.proxyUrl dans attachVideo(), avec hls.js ou lecteur natif. | Chemin courant HLS-only : il ne sélectionne pas le provider et ne consomme pas embedUrl. |
| Prévisualisation | /teacher/preview/:id sert index-0.0.9.html dans le même moteur que l’étudiant. | Dépend du modèle activity.video. |
| Étudiant | /student/:id utilise buildActivityView(), puis createICVideoPlayer(). | Le moteur accepte proxyUrl ou provider YouTube, mais streamLink reste pensé pour HLS et vaut # pour YouTube. |
| Lecteur partagé | shared/ic-video-player.js choisit UGA/HLS ou YouTube. | Bon point d’insertion, mais aucun concept d’asset/version. |

Les phénomènes, annotations, overlays et synchronisations ne référencent pas la vidéo directement : ils utilisent les temps de l’activité. Ils doivent seulement être revalidés si la durée d’un playable change.

### 1.3 Routes et validations

Routes actuelles :

- GET /api/proto05/video-catalog : catalogue autorisé ;
- POST /api/proto05/video-catalog : ajout persistant validé ;
- GET /api/proto05/activities et GET /api/proto05/activities/:id : lecture des activités ;
- POST /api/proto05/activities : création d’un brouillon à partir d’un videoId ;
- PUT /api/proto05/activities/:id : métadonnées et changement de videoId ;
- PUT /api/proto05/activities/:id/authoring : sauvegarde de l’atelier ;
- POST /api/proto05/activities/:id/duplicate : duplication ;
- GET/HEAD /api/hls/uga-37004/... : passerelle HLS allowlistée.

Validations :

- catalogue chargé depuis la donnée Proto05, identifiants uniques, provider limité à youtube ou uga, authorized obligatoire ;
- YouTube : identifiant de 11 caractères ou URL HTTPS www.youtube.com/embed/<id> ; pas d’hôte arbitraire ni de flux direct ;
- HLS : domaine UGA, chemin fixe du média 37004 et playlist parmi livestream.m3u8, 360p.m3u8, 720p.m3u8, 1080p.m3u8 ;
- activité : entrée autorisée existante; pour YouTube, provider/videoId/embedUrl doivent correspondre; pour UGA, proxyUrl doit correspondre ;
- authoring : le serveur ne reçoit pas transcription top-level; il reconstruit transcription.segmentIds depuis segments avant validation d’intégrité.

### 1.4 URL directe et manifeste HLS

La compatibilité URL directe est limitée :

1. Le POST catalogue accepte un champ link, mais une URL UGA n’est admise que si elle respecte le domaine, le chemin et le nom de fichier autorisés.
2. Le catalogue conserve sourceUrl comme provenance d’origine et produit proxyUrl comme adresse de lecture. Les activités ne stockent que la projection proxy.
3. Le navigateur demande /api/hls/uga-37004/...; Proto05 relaie vers IC-Hub 8790, puis l’origine UGA fixe. hlsPathIsAllowed() limite manifests et segments.
4. hls.js est utilisé quand il est supporté, sinon le lecteur natif est tenté.
5. Aucun fichier vidéo local n’est accepté aujourd’hui par le modèle ou les routes. Les fichiers présents à la racine du prototype ne constituent pas une Library locale.

YouTube n’est jamais converti en URL de flux : seul l’embed contrôlé et l’API officielle YouTube IFrame sont utilisés par le lecteur partagé. Cette règle doit rester inchangée.

### 1.5 Points d’introduction d’une copie locale

Les points les moins risqués sont :

- créer un stockage Library séparé de activities.json ;
- conserver le catalogue actuel comme compatibilité ou associer ses entrées à des sources Library ;
- introduire un résolveur serveur activity reference -> playable source ;
- faire recevoir au lecteur partagé une source normalisée provider-aware ;
- migrer d’abord une copie temporaire ou un brouillon ;
- conserver activity.video comme projection calculée pendant la transition.

Il faut éviter une réécriture directe de activity.video dans les cinq activités : elle toucherait validation, duplication, ateliers et moteur étudiant simultanément.

## 2. Modèle de Library proposé

La Library doit être une donnée persistante propriétaire de Proto05, par exemple data/video-library.json dans une première implémentation JSON. Elle ne doit pas devenir une copie de activities.json ni une donnée du Hub.

### 2.1 Entités

~~~
MediaAsset logique
├── MediaSource originale
├── MediaCopy locale (zéro, une ou plusieurs)
└── MediaVariant dérivée (zéro, une ou plusieurs)

Activity.videoRef -> MediaAsset + playableVersion/source sélectionnée
~~~

Modèle minimal conceptuel :

~~~
Library {
  schemaVersion,
  assets: [
    {
      id, title, status,
      rights: { holder, license, territory, expiresAt },
      provenance: { createdAt, createdBy, notes },
      sourceIds, copyIds, variantIds, defaultPlayableId
    }
  ],
  sources: [
    {
      id, assetId, kind, sourceType, provider,
      url, proxyPath, videoId, embedUrl,
      mimeType, durationMs, availability, authorized,
      provenance
    }
  ],
  copies: [
    {
      id, assetId, sourceId, storageKey,
      checksum, sizeBytes, mimeType, durationMs,
      status, availability, createdAt
    }
  ],
  variants: [
    {
      id, assetId, parentId, derivation,
      storageKey, checksum, mimeType, durationMs,
      status, availability
    }
  ]
}
~~~

Champs recommandés :

- MediaAsset : identité logique stable, titre, statut, droits, provenance et liens vers sources/copies/versions ;
- MediaSource : origine contrôlée. kind vaut local-file, direct-url ou hls; provider peut préciser uga, youtube ou un futur fournisseur. YouTube utilise videoId/embedUrl comme métadonnées d’embed, jamais une URL de flux ;
- MediaCopy : fichier local contrôlé, storageKey interne, taille, checksum, MIME, durée et statut de vérification ;
- MediaVariant : version dérivée avec parentId, outil/version, paramètres, checksum, durée et disponibilité ;
- Activity.videoRef : assetId et playableId validés, avec éventuel repli contrôlé.

### 2.2 Types de source

| Type | Données | Lecture future |
|---|---|---|
| local-file | clé de stockage interne, checksum, MIME, taille, durée | route interne contrôlée, jamais chemin client arbitraire |
| direct-url | URL HTTPS autorisée par politique de domaine, provenance, MIME/durée | lecture directe seulement si politique autorisée, sinon copie/variant |
| hls | manifeste m3u8, fournisseur, chemin allowlisté/proxy, MIME, durée | lecteur HLS via résolution contrôlée |
| YouTube contrôlé | provider youtube, videoId, embedUrl validé | API officielle IFrame uniquement, aucune copie de flux |

direct-url et hls sont des capacités de modèle, pas une autorisation globale. Chaque fournisseur conserve son allowlist.

## 3. Workflows futurs

### 3.1 Import

1. L’enseignant choisit le type et fournit un identifiant ou lien contrôlé.
2. Le serveur parse, normalise et valide fournisseur, domaine, chemin, MIME et provenance.
3. Il crée ou rattache un MediaAsset puis crée une MediaSource.
4. Une vérification de disponibilité séparée peut mesurer MIME, durée ou état.
5. L’interface affiche pending, available, unavailable ou blocked et la raison.

YouTube reste une référence contrôlée, pas un téléchargement ni une extraction de flux.

### 3.2 Copie locale

1. L’auteur demande une copie éligible et confirme les droits.
2. Le serveur crée un job et une MediaCopy pending.
3. Un worker télécharge selon la politique autorisée, calcule checksum, inspecte MIME/durée et écrit dans un stockage interne.
4. La copie devient available après vérification et enregistrement atomique.
5. L’activité peut sélectionner la copie comme playableId.

Téléchargement et anonymisation sont hors de cette mission.

### 3.3 Dérivation

Une dérivation est déclarative : parent, outil/version, paramètres, codec/résolution, durée et sortie. Elle produit une MediaVariant identifiée. Avant publication, la durée doit être revalidée contre segments, phénomènes, annotations et overlays.

## 4. Routes API futures

Ces routes sont proposées, non implémentées :

| Route | Rôle |
|---|---|
| GET /api/proto05/library/assets | lister assets selon statut, droits et disponibilité |
| POST /api/proto05/library/assets | créer un asset ou importer une source contrôlée |
| GET /api/proto05/library/assets/:assetId | détail, sources, copies, versions, provenance |
| POST /api/proto05/library/assets/:assetId/sources | ajouter une source validée |
| POST /api/proto05/library/assets/:assetId/copies | demander une copie locale |
| GET /api/proto05/library/copies/:copyId | état et métadonnées techniques |
| POST /api/proto05/library/assets/:assetId/variants | demander une dérivation contrôlée |
| GET /api/proto05/library/playables/:playableId | résoudre une lecture provider-aware |
| PUT /api/proto05/activities/:id/video-ref | sélectionner asset et playable validés |
| GET /api/proto05/activities/:id/video-resolution | diagnostic de résolution et disponibilité |
| POST /api/proto05/library/availability-checks | lancer un contrôle séparé |

Le endpoint de résolution doit retourner uniquement un descripteur interne : par exemple provider + proxyUrl pour HLS, ou provider + videoId + embedUrl pour YouTube. Il ne doit jamais fournir une URL YouTube directe de flux ni accepter une URL libre.

## 5. Impacts par vue

- Enseignant / Library : remplacer progressivement la liste de catalogue par les assets, avec source, copie, version, droits et disponibilité ; ne proposer que des playables validés.
- Atelier auteur : conserver d’abord un adaptateur asset -> playable, puis ajouter le choix de version et le diagnostic. Le payload futur devient videoRef au lieu du seul videoId.
- Atelier guidé : migrer attachVideo() vers le lecteur partagé et le résolveur; c’est indispensable pour uniformiser UGA/HLS, copies locales et YouTube.
- Prévisualisation : continuer à servir index-0.0.9.html, mais lui fournir une activité ou source résolue. Elle doit rester identique à l’étudiant.
- Étudiant : ne recevoir que les métadonnées de lecture nécessaires; chemins internes, checksums et droits restent côté serveur. Le moteur choisit le provider sans URL arbitraire.

## 6. Droits, disponibilité et provenance

La Library doit distinguer :

1. Droit : droit de référencer, copier, dériver et publier; titulaire, territoire et échéance.
2. Disponibilité : joignabilité actuelle, MIME, durée et manifeste lisible; une indisponibilité ne supprime pas la provenance.
3. Provenance : origine, date, auteur de l’import, lien original, checksum et transformations.

Pour YouTube, conserver URL d’intégration, identifiant, date de vérification et décision de contrôle; ne pas présenter une copie locale de flux comme option implicite. Pour UGA, conserver URL d’origine et proxy allowlisté. Pour un fichier local, conserver le nom comme métadonnée non fiable, le checksum et la clé interne comme identité technique.

## 7. Découpage recommandé

1. Contrat et adaptateur de lecture : définir videoRef et le descripteur résolu, garder activity.video en projection, migrer l’atelier guidé vers createICVideoPlayer().
2. Schéma Library persistant : créer video-library.json, validations, identifiants et écritures atomiques, sans modifier activities.json.
3. Migration sans rupture : associer les trois entrées actuelles à des assets/sources, vérifier les cinq activités et la duplication.
4. API de consultation et sélection : faire utiliser assets/playables par teacher-videos, teacher-create, teacher-edit et teacher-author.
5. Disponibilité et droits : états, provenance et contrôles sans téléchargement.
6. Copies locales contrôlées : stockage, jobs, checksum, nettoyage et restauration, après décision sur les droits.
7. Versions dérivées : jobs et validation des durées avant publication.
8. Bascule progressive : faire évoluer les payloads vers videoRef, maintenir la lecture historique, puis retirer la projection seulement après migration autorisée.

## Contrôles et limites

- Audit statique du code, des routes, des données et de la documentation courante réalisé.
- Aucun service, route d’écriture, migration, téléchargement ou anonymisation exécuté.
- Aucun service Chromium démarré : la mission était documentaire.
- Les droits auprès de l’UGA, de YouTube et des titulaires n’ont pas été vérifiés; ils nécessitent une décision humaine et des sources contractuelles.

Version applicative inchangée. Aucun commit ni push.

Message de commit proposé : Documenter la conception canonique de la Library vidéo Proto05.

