# Mission 138 — Proto05 — Audit ciblé de l’autorité de `activity.video`

## Décision

Le playable canonique doit devenir l’unique autorité vidéo. La relation entre
une activité et son média reste portée :

- dans le JSON transitoire, par `videoRef.assetId` et
  `videoRef.playableId` ;
- dans MariaDB, par la ligne `primary` de `activity_media_links`.

`activity.video` ne contient aucune donnée propre à l’activité. Il duplique
aujourd’hui l’identité, les métadonnées et les localisateurs du playable ou de
son asset. Il doit disparaître du stockage des activités. Tant que les clients
historiques en ont besoin, il peut rester dans les réponses HTTP comme
projection fermée, déterministe et reconstruite à chaque lecture depuis le
playable canonique.

La décision finale est la stratégie A. Elle supprime la double autorité sans
ajouter de table, de blob JSON ni de migration conservatoire pour les données
de test.

## Préflight

| Point | Fait observé |
|---|---|
| Commit de départ | `bb044a0 docs(proto05): record MariaDB video snapshot blocker` |
| État Git initial | propre |
| Version Proto05 | `0.1.45` dans `server/package.json` |
| Rapport 137 | présent : `reports/137_proto05_mariadb_read_adapter_and_shadow_comparison_report.md` |
| Adaptateur MariaDB applicatif | absent |
| Modes `compare` / `mariadb-readonly` | absents |
| Lecture applicative actuelle | JSON : `activities.json`, `video-library.json`, `video-catalog.json`, catalogues annexes |
| Modifications préexistantes | aucune |

Le serveur charge encore le catalogue et la MediaLibrary JSON au démarrage et
relit `activities.json` pour les requêtes d’activité. Les scripts MariaDB
restent des outils de schéma, de migration et de recette ; aucun ne constitue
une source de lecture de l’application.

## Périmètre et fichiers inspectés

L’audit a porté sur :

- `prototypes/05-augmented-ic-video-01/data/activities.json` ;
- `data/video-catalog.json` et `data/video-library.json` ;
- `server/server.js` ;
- `server/media-contract.js`, `server/library-contract.js`,
  `server/media-library-runtime.js`, `server/media-library-schema.js` et
  `server/media-library-migration.js` ;
- `database/migrations/001_proto05_json_to_mariadb_dry_run.mjs` et
  `database/migrations/002_proto05_mariadb_schema_alignment.sql` ;
- les migrations d’application et de métadonnées déjà validées, uniquement
  pour confirmer la représentation relationnelle ;
- `index-0.0.9.html`, les vues enseignantes actives et les modules de
  `shared/` ;
- les anciens `index-0.0.6.1.html` à `index-0.0.8.html`, classés comme
  consommateurs historiques et non comme page canonique ;
- les tests serveur qui créent, modifient, copient, résolvent, associent,
  listent ou protègent la suppression d’un média ;
- les rapports 132 à 137 et `MEDIA_LIBRARY_MODEL.md`, utilisés comme contexte
  secondaire après vérification du code réel.

Chromium, FFmpeg, les migrations SQL, les recettes MariaDB et les contrôles de
hash globaux n’ont pas été lancés.

## État actuel des données

Les deux activités actives possèdent un `activity.video` persisté et ne
possèdent pas de `videoRef` explicite dans `activities.json`.

| Activité | Champs persistés dans `activity.video` | Référence reconstruite |
|---|---|---|
| `proto05-augmented-video-01` | `id`, `title`, `kind`, `proxyUrl`, `durationMs` | playable HLS UGA du même identifiant |
| `proto05-draft-1784230655360-d1182f` | `id`, `title`, `kind`, `proxyUrl`, `provider`, `videoId`, `embedUrl` | playable YouTube du même identifiant |

La migration MariaDB a déjà transformé cette identification historique en
deux relations primaires `activity_media_links`. Les champs du snapshot ont
été classés
`validation-only:activity-video-projection`, et non comme données à persister.

## Inventaire des accès et matrice du cycle de vie

| Emplacement | Opération | Source utilisée | Valeur produite | Autorité implicite actuelle | Consommateur |
|---|---|---|---|---|---|
| `readActivities()` | lecture et validation | `activities.json` | activité brute normalisée | snapshot obligatoire | toutes les routes d’activité |
| `validateActivityVideoReference()` | validation | d’abord `video.id` + catalogue, sinon `videoRef` + Library | succès ou erreur | snapshot prioritaire si son ID existe au catalogue | lecture et écriture |
| `activityVideoRef()` | résolution de relation | `videoRef`, sinon `video.id` + catalogue | `{assetId, playableId}` | playable si la référence est valide, sinon snapshot/catalogue | détail et résolution |
| `resolveActivityVideo()` | résolution de lecture | les deux helpers précédents | `videoRef` + playable aplati | mixte | détail, lecteur, route de résolution |
| `activityForResponse()` | exposition | activité brute + résolution | snapshot brut, `videoRef`, `videoSource` | mixte | détail, étudiant, aperçu, auteur, guidé |
| `activityForLibraryResponse()` | exposition | activité brute | snapshot brut, sans `videoSource` et sans `videoRef` reconstruit | snapshot | liste et bibliothèque d’activités |
| `draftActivity()` | création par catalogue | `videoId` + catalogue | `video` persisté, pas de `videoRef` | snapshot/catalogue | ancienne création API |
| `draftActivityFromVideoRef()` | création moderne | asset + playable Library | `videoRef` et `video` persistés | playable puis snapshot dupliqué | `teacher-create.html` |
| `activityVideoFromCatalog()` | création/modification | entrée catalogue + ancien snapshot | fusion `{...current, ...champs}` | snapshot fusionné | création et changement par `videoId` |
| `activityVideoFromLibrary()` | création/modification | asset + playable + ancien snapshot | fusion `{...current, ...champs}` | snapshot fusionné | association et changement par `videoRef` |
| `PUT /activities/:id` | modification | `videoId` ou `videoRef` | snapshot fusionné ; relation parfois conservée | mixte | fiche enseignante |
| `PUT /activities/:id/authoring` | sauvegarde auteur | activité courante + `videoId`/`videoRef` | activité complète et snapshot conservé/fusionné | mixte | auteur et atelier guidé |
| `PUT /activities/:id/video-ref` | association | playable Library | `videoRef` + snapshot fusionné | playable puis snapshot dupliqué | bibliothèque vidéo |
| `duplicateActivity()` | copie | activité source complète | copie de `videoRef` et copie intégrale de `video` | les deux | duplication pédagogique |
| `persistActivities()` | persistance | objet d’activité en mémoire | JSON exact, champs inconnus inclus | tout champ transporté devient persistant | toutes les mutations |
| `activityDependencyRelations()` | protection de suppression d’asset | `videoRef` **ou** `video.assetId/id/sourceId/storageKey` | relations de dépendance | mixte | suppression Library |
| `localCopyConflicts()` | protection de suppression locale | `videoRef` **ou** snapshot technique | liste d’activités dépendantes | mixte | suppression de copie locale |
| migration MediaLibrary historique | mapping | `videoRef`, sinon `video.id` | relation asset/playable | snapshot comme secours de migration | outil historique |
| dry-run MariaDB | import et preuve | `videoRef`, sinon `video.id` | `activity_media_links.primary` | playable canonique | migration MariaDB |
| dry-run MariaDB | comparaison | champs du snapshot contre asset/playable | avertissements de divergence | playable canonique | rapport de migration |
| `sp_activity_get` | lecture SQL | `activity_media_links` + asset + playable | média primaire et métadonnées techniques | playable | futur adaptateur |
| lecteurs et vues | affichage/lecture | snapshot, `videoSource` ou les deux | lecteur, durée, libellés | variable selon la vue | étudiant et enseignant |
| tests/fixtures | preuve et préparation | snapshots clonés | conservation, copie, association | souvent snapshot | suite serveur |

### Stockage canonique, projection et voies historiques

- Le stockage vidéo canonique est `video-library.json` aujourd’hui et les
  tables `media_*` dans la cible MariaDB.
- La relation canonique d’activité est déjà `activity_media_links` dans
  MariaDB. `videoRef` en est l’équivalent JSON transitoire.
- `videoSource` est déjà une projection de lecture du playable.
- `activity.video` est présenté comme une projection de compatibilité dans la
  documentation, mais il reste réellement persisté, fusionné, validé, copié et
  utilisé comme fallback : son implémentation actuelle lui donne donc une
  autorité implicite.
- Le fallback `video.id` du catalogue et les pages `index-0.0.6.1` à
  `index-0.0.8` sont des voies historiques à retirer du contrat actif, sans
  chercher à préserver leurs données.
- Les tests qui injectent des champs arbitraires dans `activity.video` prouvent
  une politique de conservation générale, pas une nécessité métier.

## Cycle de vie détaillé

### Création

Deux chemins coexistent.

1. Une création avec `videoId` appelle `draftActivity()`. Elle produit
   `activity.video` depuis le catalogue et ne persiste pas `videoRef`. La
   relation est reconstruite ultérieurement depuis `video.id`.
2. Une création avec `videoRef` appelle `draftActivityFromVideoRef()`. Elle
   résout le playable, persiste la référence et fabrique en plus un snapshot
   redondant.

Après le premier chemin, le catalogue et le snapshot sont implicitement
autoritaires. Après le second, le playable devrait l’être, mais le snapshot
reste stocké et consommé.

### Changement de vidéo

Le snapshot n’est jamais régénéré comme un objet fermé :

- `activityVideoFromCatalog(video, current)` commence par `...current` ;
- `activityVideoFromLibrary(asset, playable, current)` commence également par
  `...current`.

Chaque helper remplace les champs applicables au nouveau playable sans
supprimer ceux de l’ancien fournisseur. Un passage HLS vers YouTube peut donc
conserver `kind: "hls"` et `proxyUrl`; un passage inverse peut conserver
`videoId` et `embedUrl`.

Le remplacement du playable n’est pas non plus atomique dans tous les chemins.
Un `PUT` avec `videoId` modifie `video` sans effacer ou remplacer un éventuel
`videoRef`. Le validateur accepte alors en priorité un `video.id` connu du
catalogue et ne compare pas systématiquement la référence résolue avec ce
snapshot. `resolveActivityVideo()` peut ensuite choisir le `videoRef`. Une
activité peut donc être validée avec une vidéo et résolue avec une autre.

### Sauvegarde auteur

Le client ne peut pas envoyer directement un objet `video` arbitraire : les
payloads autorisés acceptent `videoId` ou `videoRef`. Cette frontière est
positive.

Cependant :

- l’activité courante est copiée par `{...current}` ;
- son snapshot reste présent ;
- une sauvegarde avec le même `videoId` le fusionne sans retirer les champs
  inconnus ou obsolètes ;
- le test de régression exige explicitement la conservation d’un champ inconnu
  injecté dans `activity.video`.

La sauvegarde ne réconcilie donc pas le snapshot avec le playable et peut
conserver ou réintroduire un hybride.

### Duplication et dérivation

`duplicateActivity()` copie séparément :

- `videoRef` lorsqu’il existe ;
- tout `video` par `{...source.video}`.

La copie propage ainsi sans modification les champs obsolètes. Les dérivations
et traitements média eux-mêmes travaillent sur les assets/playables et ne
dépendent pas directement du snapshot, mais leurs protections de suppression
consultent encore les deux représentations.

### Lecture et exposition HTTP

| Route | Représentation vidéo actuelle |
|---|---|
| `GET /api/proto05/activities` | snapshot brut ; pas de `videoSource`; `videoRef` seulement s’il est stocké |
| `GET /api/proto05/activity-library` | même snapshot brut, enrichi du classement |
| `GET /api/proto05/activities/:id` | snapshot brut + `videoRef` résolu + `videoSource` dérivé |
| `GET /api/proto05/activities/:id/video-resolution` | `videoRef` + playable résolu, sans snapshot |
| réponse de `POST /activities` | même forme que le détail |
| réponses des trois `PUT` d’activité | même forme que le détail |
| réponse de duplication | même forme que le détail |

La liste et le détail peuvent donc représenter différemment la même activité.
Le détail ne remplace pas le snapshot par sa projection : il juxtapose la
valeur brute et `videoSource`.

### Playable indisponible ou absent

Le snapshot n’est pas un secours de lecture autonome voulu :

- pour un `videoRef` Library, `validateActivityVideoReference()` exige encore
  que `video.id` corresponde au playable ;
- les localisateurs du snapshot peuvent être obsolètes ;
- aucun test ne prouve qu’un snapshot peut ou doit continuer à jouer une vidéo
  lorsque le playable canonique manque.

Le résolveur de compatibilité actuel ne refuse que `status === "blocked"`.
Dans la projection runtime, un playable `missing-local`,
`unreachable-remote`, `pending` ou `unknown` reçoit généralement
`status: "pending"` et reste donc résoluble. Cette tolérance ne transforme pas
le snapshot en fallback fiable ; elle masque plutôt l’état de disponibilité.

Dans le modèle cible :

- un playable présent mais indisponible reste la relation canonique ; son
  `availability` et son `availabilityReason` sont exposés, sans réutiliser un
  ancien localisateur ;
- un playable absent rend la relation orpheline ; la lecture de résolution ou
  de détail répond par une erreur contractuelle explicite, tandis qu’une liste
  peut afficher l’activité comme « média non résolu » sans inventer de
  snapshot ;
- le lecteur est désactivé tant que `availability !== "available"`.

## Classification des champs

Les champs `assetId`, `sourceId`, `playableId`, `status`, `availability` et
`availabilityReason` ne figurent pas dans les deux snapshots actifs. Ils sont
néanmoins inspectés car les fixtures, les fallbacks de suppression ou le
playable canonique les manipulent autour de `activity.video`.

| Champ | Source actuelle | Source cible | Persisté dans l’activité ? | Projeté depuis le playable/asset ? | Compatibilité nécessaire ? | Classement |
|---|---|---|---:|---:|---:|---|
| `id` | catalogue ou playable | `playable.id` | non | oui | oui, transitoire | identité du média dupliquée |
| `assetId` | fixtures/fallbacks, absent des deux snapshots actifs | relation primaire / `videoRef.assetId` | dans la relation, pas dans `video` | éventuellement | non dans `video` | identité de l’asset |
| `sourceId` | fixtures/fallbacks Library | `playable.sourceId` | non | seulement si une API technique le requiert | non | identité technique de source |
| `playableId` | absent de `video`, présent dans `videoRef` | relation primaire / `videoRef.playableId` | oui, comme clé étrangère relationnelle | non | clé du contrat cible | identité du playable |
| `kind` | catalogue ou projection Library fusionnée | `playable.kind` | non | oui | oui | routage technique |
| `provider` | catalogue/playable, parfois absent pour UGA | `playable.provider` | non | oui | oui | routage technique |
| `videoId` | entrée YouTube | `playable.location.videoId` | non | seulement pour YouTube | oui | localisateur fournisseur |
| `embedUrl` | entrée YouTube | `playable.location.embedUrl` | non | seulement pour YouTube | oui | localisateur technique |
| `proxyUrl` | catalogue HLS ou ancien snapshot | URL HLS résolue/gateway | non | seulement pour HLS, comme alias temporaire | oui pour les clients historiques HLS | compatibilité technique |
| `url` | projection Library | localisateur client résolu | non | selon le type | oui dans le descripteur unifié | localisateur technique |
| `manifestUrl` | projection HLS Library | localisateur client résolu | non | seulement pour HLS | utile temporairement | localisateur technique |
| `sourceUrl` | origine distante du playable | provenance/origine canonique | non | seulement dans une API technique | non pour la lecture courante | provenance technique |
| `storageKey` | projection locale et fallback de suppression | `playable.location.storageKey` | non | seulement dans une API Library | non dans l’activité | localisateur interne |
| `title` | catalogue ou `asset.title` | `media_asset.title` | non | depuis l’asset | oui pour les listes actuelles | projection d’affichage |
| `durationMs` | catalogue ou métadonnées du playable | `playable.technicalMetadata.durationMs` | non | oui | oui pour timelines et bornes | métadonnée technique |
| `mimeType` | absent du snapshot actif | métadonnées du playable | non | dans `videoSource` si utile | non dans `video` | métadonnée technique |
| `status` | absent du snapshot actif | cycle de vie de l’asset ou état applicatif distinct | non | non dans la projection de compatibilité | non | ancien mélange à éviter |
| `availability` | absent du snapshot actif | `playable.availability` | non dans l’activité | oui | oui dans le descripteur de lecture | état technique canonique |
| `availabilityReason` | absent du snapshot actif | `playable.availabilityReason` | non | oui | oui en cas d’indisponibilité | diagnostic technique canonique |
| champs inconnus | fusion et conservation aveugle | aucune | non | non | non | données obsolètes à supprimer |

Il n’existe donc aucun champ de `activity.video` relevant de l’identité ou de
la pédagogie de l’activité.

## Consommateurs et compatibilité

| Consommateur | Champs réellement utilisés | Transport seulement / inutilisé | Capacité à recevoir une projection | Risque et couverture actuelle |
|---|---|---|---|---|
| lecteur étudiant `index-0.0.9.html` | présence de `video`, `proxyUrl/url/storageKey/provider`, `durationMs`; lecture via `videoSource` préférée | les autres champs du snapshot | forte : il utilise déjà `videoSource` pour charger | risque moyen : le garde d’entrée et la durée dépendent encore de `video`; tests serveur partiels, pas de test DOM ciblé |
| prévisualisation enseignante | même page active que l’étudiant | idem | forte | même risque que le lecteur |
| atelier guidé | `durationMs`; descripteur de lecture | `videoSource` existe mais l’injection serveur appelle actuellement le lecteur partagé avec `state.activity.video` | forte après suppression de l’injection brute | risque élevé localisé ; tests de route sans preuve du choix réel du descripteur |
| atelier auteur | `video.id`, `video.title`, `durationMs`; envoie `videoId` | snapshot complet non requis | forte avec `videoRef` + descripteur projeté | risque moyen ; sauvegardes largement testées |
| fiche d’édition | `video.id`, `video.title`; comparaison et envoi de `videoId` | autres champs | forte, en sélectionnant par `videoRef.playableId` | risque moyen ; test de changement HLS/YouTube manquant |
| création enseignante | `videoRef` seulement | aucun snapshot | déjà conforme | risque faible ; test `local-library-import` |
| bibliothèque d’activités | `title`, `id`, `source`, `provider` pour recherche/affichage | le reste | forte depuis asset/playable | risque faible à moyen ; tests de liste mais pas d’égalité liste/détail |
| bibliothèque vidéo | associe `{assetId, playableId}` | texte d’état mentionnant seulement la projection | déjà conforme | risque faible ; tests d’association |
| timeline partagée | `durationMs` | aucun autre champ | forte depuis `videoSource` | risque faible |
| lecteur vidéo partagé | `provider`, `kind`, `url/proxyUrl`, `manifestUrl`, `videoId`, `embedUrl` | titre et relation | conçu pour un descripteur projeté | risque faible si chaque type est couvert |
| routes API de détail | snapshot transporté par `...activity` | tous les champs inconnus | projection centralisable | risque contractuel moyen |
| routes API de liste | snapshot brut | tous les champs inconnus | projection centralisable | risque contractuel moyen |
| suppressions Library | `assetId`, `sourceId`, `id`, `storageKey` comme fallbacks | — | doit utiliser uniquement la relation | risque de faux blocage actuel |
| traitements/HLS | assets, sources et playables | aucun accès métier nécessaire au snapshot | déjà indépendants | aucun risque direct |
| tests de régression | objet entier et champ inconnu | conservation aveugle | doivent changer de doctrine | risque de tests verrouillant le défaut |

Les anciens index `0.0.6.1` à `0.0.8` exigent `proxyUrl` et ne savent pas
consommer tous les playables. Ils ne sont plus `INDEX_FILE`. Ils ne doivent pas
contraindre le contrat cible ; leur accès direct pourra être retiré ou
clairement classé historique dans une mission autorisée.

### Tests qui verrouillent actuellement le snapshot

- `media-contract.test.js` exige sa conservation pendant `PUT authoring`.
- `library-persistence.test.js`, `local-library-import.test.js` et
  `remote-library-reference.test.js` vérifient des champs projetés persistés.
- `activity-duplication.test.js` compare les données auteur, dont `video`.
- `data-regression.test.js` exige la conservation d’un champ inconnu injecté
  dans `activity.video`.
- `library-usage.test.js` et `library-deletion.test.js` fabriquent les deux
  représentations pour prouver les dépendances.
- le helper de serveur temporaire complète le catalogue depuis
  `activity.video` lorsqu’une fixture ne correspond pas au catalogue.

Ces tests restent utiles, mais leurs assertions doivent porter sur une
projection reconstruite et sur la relation canonique, pas sur la conservation
du snapshot.

## Analyse de l’incohérence HLS/YouTube

| Élément | Valeur |
|---|---|
| Activité | `proto05-draft-1784230655360-d1182f` |
| Playable actuel | `video-proto05-youtube-ev9rfkfhfa0` |
| Asset actuel | `media-proto05-video-proto05-youtube-ev9rfkfhfa0` |
| Type canonique | `youtube-embed` |
| Fournisseur canonique | `youtube` |

### Origine probable et chemin de conservation

L’ancien `proxyUrl` est exactement celui du playable UGA 37004 déjà utilisé
dans le prototype. Le code explique suffisamment sa présence sans nécessiter
une enquête historique :

1. un snapshot HLS possédait `kind` et `proxyUrl` ;
2. le changement vers YouTube est passé par
   `activityVideoFromCatalog(newVideo, currentVideo)` ou par une projection
   Library équivalente ;
3. le spread `...current` a conservé les champs HLS ;
4. les champs YouTube ont été ajoutés sans supprimer les champs non
   applicables ;
5. les sauvegardes et duplications ultérieures ont conservé l’objet entier.

Cette explication est une déduction directe du comportement des deux helpers.
L’audit ne cherche pas à attribuer l’écriture historique à une action ou à une
personne.

### Classement des champs

- obsolètes : `kind: "hls"` et `proxyUrl` ;
- cohérents : `id`, `title`, `provider`, `videoId`, `embedUrl` ;
- attendu depuis le playable : `kind: "youtube-embed"`;
- absent à juste titre : tout localisateur HLS.

La projection cible est :

```json
{
  "id": "video-proto05-youtube-ev9rfkfhfa0",
  "title": "Intercompréhension Catalan-Français",
  "kind": "youtube-embed",
  "provider": "youtube",
  "videoId": "eV9RFKFhfa0",
  "embedUrl": "https://www.youtube.com/embed/eV9RFKFhfa0?si=b0uIF3FV83dTrIIF",
  "durationMs": null
}
```

`proxyUrl` n’y figure pas.

## Risques de divergence actuels

1. Les constructeurs conservent les champs de l’ancien fournisseur.
2. La validation peut accepter `video` par le catalogue sans comparer un
   `videoRef` contradictoire.
3. La résolution peut ensuite préférer ce `videoRef`, produisant un snapshot et
   un `videoSource` de playables différents.
4. La création par `videoId` ne persiste pas de relation explicite.
5. La liste expose moins d’informations résolues que le détail.
6. Les sauvegardes et duplications reproduisent les champs inconnus.
7. Les protections de suppression interprètent des localisateurs du snapshot
   comme des relations.
8. L’indisponibilité canonique autre que `blocked` n’est pas correctement
   distinguée d’un playable lisible.
9. L’atelier guidé possède une implémentation qui préfère `videoSource`, mais
   l’injection de `server.js` la remplace par un appel explicite avec le
   snapshot brut.

## Comparaison des stratégies

| Critère | A — supprimer du stockage | B — cache persisté reconstruisible |
|---|---|---|
| Simplicité | une relation et une projection de lecture | relation + discipline de régénération à chaque écriture |
| Duplication | aucune métadonnée média dans l’activité | duplication volontaire mais jetable |
| Écritures | écrire seulement la relation | écrire la relation puis recalculer atomiquement le cache |
| Routes | centraliser un projecteur commun | même projecteur, plus sérialisation du cache |
| Tests | tester relation et projection | tester en plus la fraîcheur et la reconstruction du cache |
| Playable absent | état explicite, aucun faux secours | cache tentant comme secours mais interdit contractuellement |
| MariaDB | correspond déjà à `activity_media_links` | exige une colonne/table/blob inutile ou un cache hors base |
| Transition clients | projection HTTP temporaire possible | projection identique, sans avantage client supplémentaire |
| Données de test | suppression simple de deux objets | nettoyage et régénération de deux objets |
| Risque futur | faible | retour possible de la double autorité |
| Coût | modification ciblée des services, clients et tests | coût initial voisin, puis coût permanent de synchronisation |

La stratégie B ne réduit pas réellement le coût de compatibilité : dans les
deux cas, les réponses HTTP peuvent garder temporairement la même forme. Elle
ajoute uniquement une copie persistée et l’obligation de prouver sa fraîcheur.
Elle est donc écartée.

## Contrat cible

### Relation persistée

Pendant la phase JSON :

```json
{
  "videoRef": {
    "schemaVersion": "0.1",
    "assetId": "media-…",
    "playableId": "video-…"
  }
}
```

Dans MariaDB, cette relation est la ligne `activity_media_links` de rôle
`primary`. Le couple asset/playable reste préférable à un `playableId` nu car
il vérifie l’appartenance relationnelle déjà imposée par le schéma.

### Projection HTTP de compatibilité

Un helper unique, pur et fermé construit `activity.video` depuis l’asset et le
playable résolus. Il ne reçoit jamais `currentVideo` et ignore tout ancien
snapshot.

Champs communs :

```text
id, title, kind, provider, durationMs
```

Champs par type :

| Type | Champs additionnels projetés |
|---|---|
| `youtube-embed` | `videoId`, `embedUrl` |
| `hls` | `url`, `manifestUrl`, et temporairement `proxyUrl` comme alias du même localisateur résolu |
| `direct-url` | `url` |
| `local-file` | `url`; `storageKey` seulement si une vue Library technique l’exige réellement |

Les champs d’un autre type sont absents, et non présents à `null`. Le
descripteur canonique `videoSource` expose en plus `availability`,
`availabilityReason`, `mimeType` et les propriétés techniques nécessaires.

La compatibilité `activity.video` peut ensuite être retirée quand les clients
ne lisent plus que `videoRef` et `videoSource`. Sa suppression du stockage ne
dépend pas de cette seconde étape.

### Indisponibilité

- `available` : projection et localisateur de lecture normaux.
- `missing-local`, `unreachable-remote`, `blocked`, `pending`, `unknown` :
  conserver la relation et les métadonnées, exposer l’état, ne pas fournir un
  ancien localisateur comme fallback et désactiver la lecture.
- playable absent ou n’appartenant plus à l’asset : erreur
  `ACTIVITY_PLAYABLE_UNRESOLVED` pour le détail et la résolution ; dans les
  listes, activité conservée avec un résumé « média non résolu ».

## Plan de correction minimal directement exécutable

### 1. Centraliser la frontière média

Fichiers :

- `server/server.js` ;
- éventuellement `server/library-contract.js` si le descripteur commun doit y
  être placé.

Actions :

1. Remplacer `activityVideoFromCatalog` et `activityVideoFromLibrary` par un
   projecteur pur `projectActivityVideo(asset, playable)` sans argument
   `current`.
2. Ajouter un résolveur unique de relation qui prend `videoRef` comme entrée et
   vérifie asset, playable, appartenance et disponibilité.
3. Réserver le fallback `video.id` à une normalisation ponctuelle des deux
   données de test, puis le retirer du runtime.
4. Faire de `activityForResponse` et `activityForLibraryResponse` les deux
   utilisateurs du même projecteur.
5. Ne jamais réinjecter la projection dans l’objet passé à
   `persistActivities()`.

### 2. Écrire uniquement la relation

Fichier :

- `server/server.js`.

Routes/fonctions :

- `POST /api/proto05/activities` ;
- `PUT /api/proto05/activities/:id` ;
- `PUT /api/proto05/activities/:id/authoring` ;
- `PUT /api/proto05/activities/:id/video-ref` ;
- `POST /api/proto05/activities/:id/duplicate` ;
- `draftActivity*`, `validate*Patch`, `duplicateActivity`.

Actions :

1. Accepter `videoRef` comme contrat d’écriture normal.
2. Si `videoId` reste temporairement accepté pour les anciennes vues, le
   convertir immédiatement en `videoRef`, sans persister `video`.
3. Lors d’un changement, remplacer atomiquement le couple
   `assetId/playableId`.
4. À la sauvegarde auteur sans changement de média, conserver uniquement
   `videoRef`.
5. À la duplication, copier uniquement `videoRef`; le snapshot de réponse est
   recalculé.
6. Refuser toute propriété `video` dans un payload d’écriture.

### 3. Uniformiser les lectures

Fichier :

- `server/server.js`.

Routes :

- `GET /api/proto05/activities` ;
- `GET /api/proto05/activity-library` ;
- `GET /api/proto05/activities/:id` ;
- `GET /api/proto05/activities/:id/video-resolution`.

Actions :

1. Produire la même `videoRef`, la même projection `video` et le même
   `videoSource` pour la liste, la bibliothèque et le détail, sous réserve
   d’une éventuelle projection allégée explicitement documentée.
2. Ne jamais exposer le snapshot stocké, puisqu’il n’existe plus.
3. Représenter l’indisponibilité selon le contrat ci-dessus.

### 4. Retirer les dépendances clientes au stockage

Fichiers :

- `index-0.0.9.html` ;
- `teacher-author.html`, `teacher-edit.html`, `teacher-guided.html`,
  `teacher-videos.html` ;
- `guided-overlays.js` ;
- `shared/activity-library.js`, `shared/ic-timeline.js` et
  `shared/ic-video-player.js` ;
- injection de la route guidée dans `server/server.js`.

Actions :

1. Utiliser `videoSource` pour le lecteur et `videoRef.playableId` pour la
   sélection.
2. Lire titre et durée depuis la projection résolue, jamais depuis une valeur
   persistée supposée.
3. Remplacer les payloads `videoId` des vues auteur/guidée par `videoRef`, ou
   conserver brièvement l’alias serveur de conversion.
4. Modifier l’injection guidée pour passer `videoSource`, ou supprimer
   l’injection au profit de l’implémentation déjà présente dans la page.
5. Mettre à jour le message de `teacher-videos.html` pour ne plus annoncer une
   projection « conservée ».
6. Ne pas adapter les anciens index historiques au nouveau contrat sauf
   décision explicite de les garder accessibles.

### 5. Simplifier les protections Library

Fichier :

- `server/server.js`.

Actions :

1. Faire reposer `activityDependencyRelations()` et `localCopyConflicts()`
   uniquement sur `videoRef` pendant la phase JSON.
2. En MariaDB, utiliser uniquement `activity_media_links`.
3. Supprimer les fallbacks `video.assetId`, `video.sourceId`, `video.id` et
   `video.storageKey`.

### 6. Traiter simplement les données de test

Fichier :

- `data/activities.json`.

Action proposée dans la mission de correction :

1. ajouter à chacune des deux activités le `videoRef` exact déjà prouvé par le
   dry-run/MariaDB ;
2. supprimer entièrement `activity.video` ;
3. ne pas modifier les sauvegardes historiques ;
4. ne pas créer de migration conservatoire, table, colonne ou blob ;
5. si cette édition s’avère plus coûteuse qu’une recréation, recréer les deux
   activités de test avec leurs références canoniques.

### 7. Adapter les tests

Fichiers existants à modifier :

- `server/test/media-contract.test.js` ;
- `server/test/library-persistence.test.js` ;
- `server/test/local-library-import.test.js` ;
- `server/test/remote-library-reference.test.js` ;
- `server/test/activity-duplication.test.js` ;
- `server/test/data-regression.test.js` ;
- `server/test/library-usage.test.js` ;
- `server/test/library-deletion.test.js` ;
- `server/test/helpers/temporary-proto05-server.js`.

Cas à couvrir :

1. création et persistance de `videoRef` sans `video` stocké ;
2. projection fermée HLS, YouTube, URL directe et fichier local ;
3. changement HLS vers YouTube supprimant `proxyUrl`, `manifestUrl`,
   `sourceUrl` et `storageKey` ;
4. changement YouTube vers HLS supprimant `videoId` et `embedUrl` ;
5. sauvegarde auteur sans recréation d’un snapshot stocké ;
6. duplication de la relation seulement ;
7. égalité sémantique des projections liste, bibliothèque et détail ;
8. playable indisponible sans fallback périmé ;
9. playable orphelin avec erreur contractuelle stable ;
10. protections de suppression fondées uniquement sur la relation ;
11. absence de conservation des champs inconnus sous `activity.video`.

Un test ciblé du lecteur partagé doit également vérifier les quatre types de
playable. La validation visuelle des pages étudiante, aperçu et guidée sera
nécessaire dans la mission fonctionnelle, mais n’a pas été exécutée ici.

### 8. Reprendre l’adaptateur MariaDB

Une fois cette correction validée :

1. l’adaptateur lit l’activité et sa relation primaire ;
2. il lit l’asset et le playable joints, ainsi que leurs métadonnées ;
3. le même projecteur HTTP est appliqué aux sources JSON et MariaDB ;
4. le mode de comparaison compare les relations et les projections
   canoniques, jamais l’ancien snapshot ;
5. aucun ajout SQL n’est nécessaire pour `activity.video` ;
6. le blocage de la Mission 137 disparaît, car `kind: hls` et l’ancien
   `proxyUrl` ne font plus partie du résultat attendu.

La mission suivante pourra être une correction fonctionnelle unique, puis la
reprise de l’adaptateur dans une mission séparée. Aucun nouvel audit
périphérique n’est nécessaire.

## Incohérences secondaires classées

| Observation | Classement | Suite dans cette mission |
|---|---|---|
| liste et détail n’exposent pas la même résolution vidéo | structurelle, incluse dans le plan | aucune modification |
| `videoRef` et snapshot peuvent désigner deux playables différents | structurelle, incluse dans le plan | aucune modification |
| disponibilités non `available` encore résolubles | structurelle, incluse dans le plan | aucune modification |
| injection guidée forçant le snapshot brut | structurelle et localisée, incluse dans le plan | aucune modification |
| anciens index exigeant `proxyUrl` | historique, non bloquant | aucun chantier |
| deux snapshots de données de test sans `videoRef` explicite | historique et jetable | correction simple proposée |
| anciens playables ou fichiers indisponibles | données de développement normales | aucune enquête ni nettoyage |

## Vérifications exécutées

- état Git et commit `HEAD` ;
- confirmation de `0.1.45` ;
- recherches ciblées exhaustives dans les données, le serveur, les routes,
  clients, tests, migrations, procédures SQL et rapports ;
- lecture des chemins de création, changement, sauvegarde, duplication,
  résolution, exposition et suppression ;
- inspection du contrat `sp_activity_get` et du mapping
  `activity_media_links` ;
- inspection de la projection runtime de disponibilité ;
- tests Node ciblés :
  `media-contract`, `activity-duplication`, `library-persistence`,
  `local-library-import`, `remote-library-reference` ;
- résultat : **27 tests réussis, 0 échec** ;
- aucun test n’a écrit dans les données canoniques : les serveurs temporaires
  utilisent des copies ;
- Chromium non lancé ;
- FFmpeg non lancé ;
- MariaDB non écrite et non relue, les preuves 133–137 étant suffisantes pour
  cet audit ;
- `git diff --check` : réussi.

## Fichiers modifiés

Créé :

- `reports/138_proto05_activity_video_authority_audit_report.md`.

Aucun fichier applicatif, test, JSON, SQL, configuration ou dépendance n’a été
modifié.

## Version, état Git final et validation humaine

- version obtenue : `0.1.45`, inchangée ;
- état Git final : seul le rapport 138 est non suivi ;
- commit et push : non effectués ;
- validation humaine de David : non réalisée ; ce rapport constitue une
  restitution d’audit, pas une validation humaine.

## Limites restantes

- La correction fonctionnelle n’est pas implémentée conformément au périmètre.
- La projection cible n’a donc pas encore de test exécutable dans le dépôt.
- Les pages n’ont pas été validées visuellement.
- L’adaptateur MariaDB, les modes `compare` et `mariadb-readonly` n’existent
  toujours pas et ne doivent reprendre qu’après la correction.
- Le changement fonctionnel suivant devra appliquer la convention de version
  du composant ; aucune version n’est modifiée par le présent audit
  documentaire.

## Message de commit proposé

```text
docs(proto05): audit activity video authority
```

## Conclusion explicite

**A — supprimer activity.video du stockage et le projeter à la lecture**
