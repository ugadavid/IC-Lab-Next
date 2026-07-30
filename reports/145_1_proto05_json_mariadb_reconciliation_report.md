# Mission 145.1 — Réconciliation ciblée JSON / MariaDB de Proto05

Date : 30 juillet 2026  
Version Proto05 : `0.1.48`, inchangée  
État : réconciliation ciblée appliquée et vérifiée, sans commit ni push

## Périmètre

La mission a traité exclusivement :

1. les deux fiches Vidéo++ dont les valeurs humaines étaient présentes dans
   `video-library.json` mais absentes de MariaDB ;
2. la copie locale de travail UGA présente dans le JSON et sur disque mais
   absente de MariaDB ;
3. la cause du résultat `11/12` de la frontière de lecture ;
4. le banc de test Vidéo++ qui ne reproduisait pas les fichiers du workspace et
   pouvait donc requalifier à tort la copie UGA comme absente.

Aucun snapshot JSON global n’a été appliqué à MariaDB.

## État initial démontré

Cardinalités MariaDB avant écriture :

| Table | Avant |
|---|---:|
| `media_assets` | 16 |
| `media_sources` | 19 |
| `media_playables` | 19 |
| `media_playable_metadata` | 19 |

### Fiches Vidéo++ humaines

Les deux objets `editorialMetadata` ont la même forme explicite :

```json
{
  "usage": null,
  "context": null,
  "responsibleParty": null,
  "captureDate": null,
  "languageIds": [],
  "notes": null
}
```

| Asset | Valeurs JSON | MariaDB avant | Origine probable | État MariaDB attendu |
|---|---|---|---|---|
| `media-proto05-anonymized-ce9376fcd4b7758691dfc4a6` | description `Aucune idée de ce que c'est que cette vidéo !` et objet éditorial explicite | description et `editorial_metadata_json` à `NULL` | saisie humaine Vidéo++ de la Mission 144 ; la description et le profil apparaissent ensemble dans le diff de travail | description conservée et profil explicite projeté |
| `media-proto05-remote-ref-03738b8065e1866b8e956819` | description `D'où viens tu ?` et objet éditorial explicite | description et `editorial_metadata_json` à `NULL` | saisie humaine Vidéo++ de la Mission 144 ; la description et le profil apparaissent ensemble dans le diff de travail | description conservée et profil explicite projeté |

Ces deux assets ne désignent pas un fichier physique à réconcilier dans cette
mission. Leur identité est stable et déjà présente dans MariaDB.

### Copie locale UGA

Asset parent :

`media-proto05-video-proto05-uga-37004`

Playable distant d’origine :

`video-proto05-uga-37004`

Source locale :

`source-media-proto05-video-proto05-uga-37004-download-b6ddd6a7229a7528`

Playable local :

`video-media-proto05-video-proto05-uga-37004-download-b6ddd6a7229a7528`

Chemin relatif dans le workspace :

`media-proto05-video-proto05-uga-37004/source/b6ddd6a7229a7528-Video-augmentee-IC---source-UGA.mp4`

Témoin physique :

- taille : `270502622` octets ;
- SHA-256 :
  `b6ddd6a7229a7528fda2af45d1033676088b9253984281082b051ac54c8cbf27` ;
- durée : `939238` ms ;
- image : `1920 × 1080`, `60/1`, H.264 ;
- audio : AAC présent ;
- type MIME : `video/mp4`.

Le JSON reliait sans ambiguïté la source et le playable local au même asset UGA
et au playable distant ci-dessus. MariaDB possédait l’asset et le playable
distant, mais aucun des deux identifiants locaux. Le fichier existait exactement
au chemin et avec l’empreinte déclarés. L’origine est donc la copie locale créée
par David avant la Mission 145, et non une entrée historique sans fichier.

## Corrections réalisées

### Projection déterministe Vidéo++

`001_proto05_json_to_mariadb_dry_run.mjs` :

- couvre maintenant `assets[].editorialMetadata` champ par champ ;
- produit `media_assets.editorial_metadata_json` ;
- conserve la distinction entre propriété absente, `NULL`, objet explicite et
  liste vide.

La frontière de lecture passe ainsi de `11/12` à `12/12`, sans suppression ni
affaiblissement d’assertion.

### Réconciliation transactionnelle

Le nouveau script `007_proto05_targeted_json_mariadb_reconciliation.mjs` :

- refuse toute cible ou filiation ambiguë ;
- vérifie l’identité MariaDB et les grants applicatifs sans afficher de secret ;
- recalcule la taille et le SHA-256 du fichier avant toute écriture ;
- produit un plan déterministe protégé par le hash
  `3d564a2b6791a585981995a98259dcdc43f8abc39d574db3bcb026991c3d5fe4` ;
- exige une sauvegarde externe relisible ;
- utilise un verrou nommé, une transaction `SERIALIZABLE` et des préconditions
  sur toutes les valeurs antérieures ;
- modifie seulement les deux assets éditoriaux démontrés ;
- insère seulement la source, le playable et la métadonnée technique UGA ;
- relit les lignes après commit et après reconnexion ;
- expose des modes de contrôle et de reprise ciblés, sans mode de synchronisation
  globale.

Une transaction volontairement avortée a d’abord prouvé le rollback intégral.
L’application réelle a ensuite produit les deltas :

| Table | Delta | Après |
|---|---:|---:|
| `media_assets` | 0 | 16 |
| `media_sources` | +1 | 20 |
| `media_playables` | +1 | 20 |
| `media_playable_metadata` | +1 | 20 |

Les sauvegardes ciblées sont conservées dans le répertoire temporaire local,
sous les noms :

- `proto05-m1451-rollback-a8d7c1.json` ;
- `proto05-m1451-apply-b7f92e.json` ;
- `proto05-m1451-repair-c9e104.json` ;
- `proto05-m1451-repair-resume-d24b66.json`.

Elles ne contiennent aucun secret.

### Fermeture du banc de test Mission 144

La première relance MariaDB de `video-metadata.test.js` a révélé une cause
précise : le serveur temporaire copiait les médias historiques, mais pas
`video-library-workspaces`. Le mapping global du test voyait donc la copie UGA
comme absente et remplaçait `available` par `missing-local`.

Le helper accepte maintenant explicitement
`copyVideoLibraryWorkspaces: true`, activé uniquement par ce test MariaDB. Le
test reproduit ainsi le témoin physique avant son écriture. La disponibilité et
l’horodatage UGA ont été restaurés avec une transaction ciblée et des
préconditions exactes. La suite Vidéo++ repasse ensuite `7/7` sans modifier ce
témoin.

## Relectures SQL, HTTP et interface

- réconciliation ciblée finale : zéro divergence ;
- cardinalités finales : `16/20/20/20` ;
- les deux descriptions et objets éditoriaux sont relus en SQL et par l’API ;
- l’asset UGA expose une seule copie de travail avec les bons identifiants ;
- lecture HTTP réelle du fichier : `206`, plage
  `bytes 0-1023/270502622`, `1024` octets reçus ;
- après redémarrage MariaDB, la fiche UGA affiche
  `Fichier local · Disponible` et le lien `Récupérer sur mon disque` ;
- les deux fiches Vidéo++ affichent leurs descriptions humaines ;
- aucune erreur ni aucun avertissement dans la console des trois fiches.

La recette navigateur de Codex est une preuve technique ; elle ne remplace pas
la validation humaine de David.

## Non-altération

Les empreintes avant et après sont identiques.

### JSON protégés

| Fichier | SHA-256 |
|---|---|
| `activities.json` | `6f6c64dbc34b70ad279af1d0f016afd27a1de9d9c011c3c07dd7e537a9f638d3` |
| `activity-library.json` | `63ce330896759421397c987ccc685884ffb6e1c93663b68b7d3d6ead4c1c256a` |
| `video-catalog.json` | `89a73a4065ab84ae1b676d25fbe62fd17feb0fb51302997b49999e68b05fe373` |
| `video-library.json` | `45bad35fa47a9e91e8f81d73f1933faeeb0dce03d2555a2bd763b7b486d8c5b7` |

### Cinq vidéos physiques

| SHA-256 |
|---|
| `5d624b6d72597eb046aa68d982bebb079318325ea96b576bb5bcfedb4a0da5d` |
| `e88d23de161345885ddc9e5c977de96d2f5fafa9dc29d63eab3be8e2e3914823` |
| `f4dd436c50e8bea3cbb7704d263dfdc03c1bd94181515c7d0977cef889e2c1f3` |
| `47a3e7cf005c9fdc05f8062479714d98fbde9c6c030ba47f923a5cb5dbd753d3` |
| `b6ddd6a7229a7528fda2af45d1033676088b9253984281082b051ac54c8cbf27` |

Aucun téléchargement, déplacement, renommage, remplacement ou duplicata
persistant n’a été réalisé.

## Vérifications

- syntaxe Node des fichiers concernés : réussie ;
- auto-tests du dry-run : `22/22` ;
- frontière de lecture : `12/12` ;
- suite Vidéo++ Mission 144 avec intégration MariaDB réelle : `7/7` ;
- tests Mission 145 : `9/9` verts en trois processus isolés (`7 + 1 + 1`) ;
- preuve de rollback : réussie ;
- relecture ciblée après commit, reconnexion et nouveau redémarrage : réussie ;
- comparaison des trois cibles : `0` divergence ;
- lecture partielle réelle du fichier : réussie ;
- vérification navigateur des trois fiches : réussie ;
- aucun listener restant sur `8791` ;
- aucun temporaire `m145` ou `.incomplete` dans le workspace ;
- `git diff --check` : réussi, hors avertissements CRLF informatifs.

Le fichier complet `library-ffmpeg-download.test.js` conserve une fragilité
d’ordonnancement Windows : après la recette Chromium, le test d’arrêt d’un arbre
FFmpeg atteint son délai de 15 secondes et perturbe le test suivant. Les mêmes
neuf scénarios passent sans modification d’assertion lorsqu’ils sont répartis
dans trois processus. Cette fragilité n’est pas causée par la réconciliation et
n’a pas été masquée par une augmentation de délai.

## Divergences globales hors périmètre

Le comparateur global détecte encore `21` chemins entre les anciens JSON et
l’état MariaDB :

- `18` concernent les activités : MariaDB contient une activité supplémentaire
  et un état auteur différent pour l’activité de recette ;
- `3` concernent le classement d’une autre vidéo de test : dossier, étiquette et
  cardinalité des dossiers.

Ces données ne font partie d’aucun des trois identifiants autorisés par la
Mission 145.1. Leur remplacement par le snapshot JSON aurait été une mutation
globale et aurait pu écraser un état MariaDB plus récent. Elles n’ont donc été ni
modifiées ni attribuées arbitrairement. Elles devront être arbitrées séparément
si l’objectif futur exige une égalité globale avec les anciens fichiers JSON.

## Fichiers de la Mission 145.1

- `prototypes/05-augmented-ic-video-01/database/migrations/001_proto05_json_to_mariadb_dry_run.mjs`
- `prototypes/05-augmented-ic-video-01/database/migrations/007_proto05_targeted_json_mariadb_reconciliation.mjs`
- `prototypes/05-augmented-ic-video-01/server/test/helpers/temporary-proto05-server.js`
- `prototypes/05-augmented-ic-video-01/server/test/video-metadata.test.js`
- `reports/145_1_proto05_json_mariadb_reconciliation_report.md`

Le worktree contient aussi les changements non commités des Missions 144 et
145, volontairement préservés.

## Recette humaine minimale laissée à David

1. Démarrer Proto05 dans son mode MariaDB habituel.
2. Ouvrir les fiches des deux assets Vidéo++ ci-dessus et vérifier leurs deux
   descriptions.
3. Ouvrir la fiche `media-proto05-video-proto05-uga-37004`.
4. Vérifier qu’elle présente exactement une copie de travail marquée
   `Disponible`.
5. Utiliser `Prévisualiser` ou lire le début via le lien de récupération, sans
   supprimer ni modifier la fiche.
6. Redémarrer Proto05 et vérifier que les trois constats persistent.

## Proposition de message de commit

`fix(proto05): reconcile Video++ metadata and UGA working copy`
