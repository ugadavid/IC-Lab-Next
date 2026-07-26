# Mission 118 — Audit critique de réappropriabilité de Proto05

Date de l’audit : 26 juillet 2026

État examiné : branche `main`, commit `ac77bcf847b1d13a641af93804fba55c5f408ba1`

Version applicative observée : serveur et package `0.1.40`, moteur étudiant `index-0.0.9.html`

Évaluateur : Codex, sur instruction de David

Nature de la mission : audit documentaire, fonctionnel, architectural et historique, sans correctif

## 1. Résumé exécutif

Proto05 offre désormais de fortes prises **techniques** à la réappropriation :
serveur local autonome pour ses pages, son API et son proxy HLS UGA, données
structurées, ateliers séparés, Library canonique, lignage des médias, dossiers,
tags, usages, traitements persistants, écritures atomiques, sauvegardes et une
suite automatisée étendue. Un mainteneur compétent peut retrouver les principaux
composants, lire leurs relations et tester une grande partie des invariants sans
modifier les données réelles.

La **ressource pédagogique**, elle, reste seulement partiellement reprenable. Une
activité riche rend visibles des phénomènes d’intercompréhension, mais les sept
activités sont toutes des brouillons ; plusieurs portent des noms ou contenus de
test ; le public, les prérequis, la durée pédagogique, les droits, les crédits et
le cœur pédagogique à préserver ne sont pas formalisés. La duplication conserve
les contenus mais pas une filiation entre activités. La filiation des médias est
nettement plus consolidée que celle des scénarios pédagogiques.

Le **prototype logiciel** est fonctionnel mais sa documentation ne donne pas une
image fiable et unifiée de l’état courant. Le README principal de Proto05
s’arrête à `0.0.6.2` et affirme encore l’absence d’édition ou de serveur autonome.
`STATUS.md`, `PROJECTS_LAUNCH.md` et `docs/ARCHITECTURE.md` datent du 16 juillet,
annoncent `0.1.16` ou `index-0.0.8` et décrivent encore le proxy HLS comme
dépendant du Hub. Le README serveur commence bien à `0.1.40`, mais décrit encore
la migration Library comme dormante. `MEDIA_LIBRARY_MODEL.md` se présente comme
une cible non implémentée alors que le schéma `1.0` est installé. La roadmap
classe encore comme « Prochain » des phases largement réalisées.

La suite actuelle exécute **201 tests : 200 réussissent et 1 échoue**. L’échec
vient d’un test Chromium resté aligné sur l’ancien contrat d’ouverture du panneau
d’usages au survol et au focus, alors que la mission 116 a explicitement retenu
une ouverture au clic uniquement. La fonctionnalité courante est protégée par
d’autres tests, mais cette divergence montre que l’accumulation rapide de baby
steps a laissé une dette de réconciliation.

Réponse au test du miroir : **Proto05 ne dépend plus exclusivement de son
concepteur pour être inspecté, lancé ou techniquement compris, mais il dépend
encore fortement de David pour qualifier les ressources, arbitrer les droits,
expliquer le cœur pédagogique, choisir la documentation fiable et organiser la
continuité.** Le prototype évite déjà beaucoup de travail technique ; il n’est
pas encore transmissible comme ensemble pédagogique et opérationnel
autosuffisant.

## 2. Périmètre et méthode

### 2.1 Objets distingués

**A — Ressource pédagogique produite ou gérée**

- activités, consignes, questions, annotations et scénarios ;
- vidéo d’origine, copies de travail, dérivations et traitements ;
- langues, locuteurs, segments, intervalles et phénomènes ;
- métadonnées, droits, provenance, filiation, export et transmission.

**B — Prototype logiciel Proto05**

- serveur, routes, pages, API, contrats, tests et launchers ;
- fichiers canoniques et stockages locaux ;
- dépendances Node, navigateur, HLS, FFmpeg/FFprobe et IC-Hub ;
- documentation, historique, sauvegarde, restauration et maintenance.

### 2.2 Tiers de référence et tâches de reprise

Pour la ressource, le tiers de référence est un **enseignant extérieur au projet,
connaissant l’intercompréhension et à l’aise avec des outils numériques, mais
sans transmission orale de David**. Sa tâche est de retrouver une activité,
expliquer son intention, identifier ce qui peut varier, créer une variante,
prévisualiser le résultat et transmettre l’ensemble avec ses sources et droits.

Pour le logiciel, le tiers de référence est un **mainteneur compétent en
Node.js, HTML/JavaScript, JSON et Windows, sans connaissance orale du projet**.
Sa tâche est de lancer Proto05, identifier ses données et dépendances, diagnostiquer
un média absent, modifier prudemment le système sur fixture et restaurer un état
dégradé.

### 2.3 Protocole appliqué

- lecture intégrale de `GRILLE_CRITIQUE_REAPPROPRIABILITE.md` ;
- état Git initial et final ;
- lecture des instructions, README, documents d’architecture et documents
  spécialisés ;
- inspection des données, routes, composants actifs, dépendances et tests ;
- lecture des rapports pertinents jusqu’à la mission 117 ;
- contrôles statiques et suite automatisée sur fixtures/copies temporaires ;
- analyse Git en lecture seule avec dates, commits et écarts ;
- aucun serveur canonique démarré, aucune migration, aucun téléchargement et
  aucune écriture de donnée réelle.

Les états sont exactement ceux de la grille : `Non observable`, `Fragile`,
`Partiel`, `Consolidé`, `Non pertinent`. Aucun score ni pourcentage n’est
calculé.

## 3. État Git initial et préservation

État initial :

```text
## main...origin/main
?? GRILLE_CRITIQUE_REAPPROPRIABILITE.md
```

La grille était donc déjà présente comme fichier non suivi avant la mission.
Elle a été traitée comme document fourni et n’a pas été modifiée. Aucun autre
changement local n’était présent.

Empreintes initiales et finales identiques :

| Donnée canonique | SHA-256 |
|---|---|
| `data/activities.json` | `488C41D28A9D05D8292B04A63F68E4508DD038087EE0E77DABC05BDBBB4D09ED` |
| `data/video-library.json` | `7ADA49D2D49165C40A40E2D534E0957E7918F1AD583F4EE3BE1ED35BB51DC752` |
| `data/video-catalog.json` | `89A73A4065AB84AE1B676D25FBE62FD17FEB0FB51302997B49999E68B05FE373` |

## 4. État canonique réellement observé

### 4.1 Exécution et surfaces

| Élément | État retenu |
|---|---|
| Serveur | Node natif, bind `127.0.0.1`, port par défaut `8791` |
| Version | `0.1.40` dans `server.js` et `server/package.json` |
| Moteur étudiant | `index-0.0.9.html` |
| Vues | étudiant, prévisualisation, bibliothèque d’activités, création, édition, auteur avancé, atelier guidé |
| Library vidéo | `/teacher/videos` et fiche `/teacher/videos/:videoId` |
| Anonymisation | atelier guidé canonique `/teacher/anonymization/:jobId`; ancien atelier avancé retiré |
| Authentification | absente ; les libellés étudiant/enseignant ne sont pas des rôles serveur |

Routes structurantes vérifiées dans `server/server.js` :

- `/student/:activityId` ;
- `/teacher`, `/teacher/create`, `/teacher/edit/:activityId` ;
- `/teacher/author/:activityId`, `/teacher/guided/:activityId` ;
- `/teacher/videos`, `/teacher/videos/:videoId` ;
- `/api/proto05/activities...` ;
- `/api/proto05/library/...` ;
- `/api/hls/uga-37004/...` ;
- `/api/health`.

### 4.2 Données

| Source | État observé |
|---|---|
| `data/activities.json` | 7 activités, toutes `draft` |
| `data/video-library.json` | schéma `1.0`, 16 assets, 19 sources, 19 playables, 2 traitements, 1 dossier, 3 tags |
| Disponibilité | 12 playables `available`, 3 `missing-local`, 4 `unknown` |
| Sources | 12 `derived-output`, 3 `local-file`, 2 `hls`, 2 `youtube-embed` |
| `data/video-catalog.json` | catalogue historique de 3 vidéos, encore utilisé en compatibilité |
| Langues | dictionnaire partagé `shared/reference-data/languages.json`, quatre identifiants |
| Médias binaires | stockés dans des dossiers ignorés par Git |

L’activité historique riche contient 11 segments, 5 locuteurs, 22 intervalles
linguistiques, 26 phénomènes, 7 couches et 11 annotations enseignantes. Quatre
activités n’ont aucun segment ; plusieurs titres et contenus sont manifestement
des essais (`MboloTest`, `brouillon_vide`, `tesT1`). Deux activités seulement
portent un `videoRef`; les cinq autres restent sur la projection/catalogue de
compatibilité. Les sept activités n’ont pas de champs dédiés pour le public,
les prérequis, la durée pédagogique, les crédits, la licence ou la filiation
entre activité originale et copie.

Les 16 assets ont un objet `rights`, mais les 16 objets sont vides. La Library
conserve une provenance technique et des lignages média solides, dont deux
traitements d’anonymisation persistants récents. Les dérivations historiques
restent en partie qualifiées comme accès hérités.

### 4.3 Stockage et récupération

Les JSON canoniques sont suivis par Git. Les sauvegardes `.bak`, le dossier
`data/backups/`, `data/video-library-media/` et
`data/video-library-workspaces/` sont ignorés. Quatre médias historiques sont
présents dans `video-library-media/`; une copie de travail et deux dérivations
récentes sont présentes dans le workspace de l’asset 36971. Trois playables
référencent des fichiers absents sans être supprimés.

Les writers des activités, du catalogue et de la Library sont séquencés,
créent une sauvegarde, écrivent un temporaire adjacent puis renomment. La
suppression physique protégée possède un rollback transactionnel. Il n’existe
cependant ni paquet d’archive complet, ni commande de restauration courante, ni
test documenté de reconstruction depuis un clone vierge avec les médias.

### 4.4 Dépendances actives

- Node.js `>=18` ;
- Chrome/Chromium pour une partie des tests et pour la recette visuelle ;
- FFmpeg et FFprobe pour les copies et dérivations ;
- disponibilité des sources distantes HLS/HTTP ;
- `hls.js` `1.6.13`, physiquement lu depuis
  `prototypes/00-ic-hub/server/node_modules/hls.js/dist/hls.min.js`.

Le proxy UGA est aujourd’hui implémenté directement dans Proto05. IC-Hub garde
néanmoins ses propres routes HLS, deux routes Proto05 de compatibilité et la
redirection `/demos/augmented-video/`. L’autonomie du proxy a donc progressé,
mais la dépendance physique à `hls.js` du Hub demeure.

## 5. Registre des preuves et niveaux

| ID | Preuve et emplacement | Niveau retenu | Ce qu’elle établit / limite |
|---|---|---|---|
| P01 | `git status`, `git log`, `git show`, `git diff` | Documenté | État, dates, commits et transformations ; ne prouve pas l’usage. |
| P02 | `server/package.json`, constantes et routes de `server/server.js` | Documenté | Version, port, API et dépendances codées. |
| P03 | `data/activities.json` | Documenté | Volumes, statuts, métadonnées et relations réellement présentes. |
| P04 | `data/video-library.json`, `MEDIA_LIBRARY_MODEL.md`, `media-library-schema.js` | Documenté | Modèle, lignage, droits, disponibilité et traitements. |
| P05 | `teacher*.html`, `index-0.0.9.html`, `shared/*.js` | Documenté | Surfaces et contrôles disponibles ; pas leur appropriation par un enseignant. |
| P06 | `server/test/*.test.js` et exécution `npm test` | Testé par le concepteur, suite rejouée par l’auditeur | 200/201 réussis ; fixtures temporaires, pas tiers humain. |
| P07 | `npm run check` | Testé par le concepteur, rejoué | Syntaxe de `server.js`, pas fonctionnement complet. |
| P08 | writers et tests de persistance/suppression | Testé par le concepteur | Atomicité, `.bak`, refus et rollback sur fixtures. |
| P09 | README Proto05 et serveur, `STATUS.md`, `PROJECTS_LAUNCH.md`, `docs/ARCHITECTURE.md`, `ROADMAP.md` | Documenté | Documentation abondante mais contradictoire et datée. |
| P10 | rapports 008, 016–018, 067, 094, 096, 098, 102–117 | Documenté / testé par le concepteur | Chronologie, recettes Codex et validations de David ; dispersion importante. |
| P11 | état de suivi/ignoré de `data/` et inventaire physique | Documenté | JSON suivis ; médias, sauvegardes et workspaces locaux non suivis. |
| P12 | `shared/reference-data/languages.json` et tests langue | Documenté / testé | Identifiants partagés et validations. |
| P13 | absence de `LICENSE`, `CONTRIBUTING`, `CODEOWNERS`, guide de maintenance/restauration | Non observable | Ne prouve pas l’absence de décision orale, mais aucune preuve transmissible n’a été trouvée. |
| P14 | commits `6fcbb9a`, `b508c20`, `ac77bcf` | Documenté | États historiques candidats ; aucune ancienne exécution reconstruite. |
| P15 | `scripts/windows/start-proto05.bat`, `start-all.bat` | Documenté | Démarrage local ; le launcher teste le port, pas l’identité ni le healthcheck. |
| P16 | `ANONYMIZATION_ENGINE.md`, traitements et tests HLS/FFmpeg | Documenté / testé | Pipeline, nettoyage et limites ; documentation de version datée. |
| P17 | code et README IC-Hub | Documenté | Compatibilités et dépendance physique `hls.js`. |
| P18 | échec de `library-usage.test.js` ligne 246 | Testé par le concepteur, rejoué | Attente survol/focus obsolète face au contrat clic de la mission 116. |
| P19 | absence de test autonome par enseignant extérieur ou mainteneur indépendant | Non observable | Aucune preuve de niveau « testé par un tiers » ou « observé en usage ». |

## 6. Grille complétée intégralement

Dans les tableaux suivants, chaque cellule contient un constat distinct pour
l’objet concerné. « Doc. » signifie niveau `documenté`; « TC » signifie
`testé par le concepteur` avec la nuance du registre P06.

### 6.1 Socle : intelligibilité et cohérence pédagogiques

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Intention pédagogique | **Partiel — Doc.** Établi : le README formule la question d’observation des stratégies d’IC et l’activité riche contient des questions par segment (P03, P09). Déclaré/inféré : le bénéfice pour enseignant ou apprenant. Non vérifiable : efficacité réelle. **Action :** fiche courte par activité. | **Consolidé — Doc.** Son rôle d’outil d’observation, d’auteur et de gestion vidéo est lisible dans le code, les rapports et la roadmap (P02, P09, P10). |
| Public et contexte | **Fragile — Doc.** Le README évoque enseignant, chercheur ou apprenant, mais aucune activité ne porte public, niveau, modalité, durée ou prérequis (P03, P09). Non vérifiable : adéquation à un public concret. **Action :** métadonnées minimales. | **Partiel — Doc.** Le contexte local universitaire et Windows est inférable ; les profils opératoires et limites de service ne sont pas regroupés (P09, P15). |
| Cœur pédagogique | **Fragile — Doc.** Les phénomènes, couches et questions montrent l’intérêt didactique, mais aucun texte ne distingue les invariants pédagogiques des éléments modifiables (P03, P05). **Action :** expliciter ce qui ne doit pas disparaître. | **Partiel — Doc.** La séparation données/lecteur/timeline et l’observation plurilingue sont lisibles, mais l’architecture ne formalise pas les invariants didactiques à protéger (P04, P05, P09). |
| Scénarisation | **Partiel — Doc.** Consigne et question générale sont prévues ; onze questions segmentaires existent. Plusieurs activités sont vides et l’activité principale a consigne/question générales vides (P03). Aucun déroulé enseignant ou prolongement n’est fourni. | **Consolidé — TC.** Les parcours étudiant, prévisualisation, auteur et guidé sont séparés et couverts par tests (P02, P05, P06). Cela prouve le parcours technique, pas la pertinence pédagogique. |
| Composants et relations | **Partiel — Doc./TC.** Segments, locuteurs, langues, phénomènes, couches, annotations et médias sont structurés et validés (P03, P04, P06). La relation scénario–intention–variante et la filiation des activités restent absentes. | **Consolidé — Doc./TC.** Contrats, références, schéma et tests rendent les relations techniques largement inspectables (P02, P04, P06). |
| Marges d’adaptation | **Fragile — Doc.** Beaucoup de champs sont éditables, mais aucune distinction explicite entre variable et cœur pédagogique ; les conséquences didactiques d’une suppression ne sont pas signalées (P03, P05). | **Partiel — Doc./TC.** Les validations empêchent les références cassées, pas la dégradation pédagogique. Les limites techniques sont mieux explicitées que les limites didactiques (P06, P09). |
| Honnêteté du statut | **Fragile — Doc.** Toutes les activités sont `draft`, ce qui est honnête, mais essais et ressources sérieuses cohabitent sans qualification ; droits et vérification des transcriptions ne sont pas portés par activité (P03). | **Fragile — Doc.** Les rapports sont précis, mais les documents d’entrée contredisent le code courant et des phases réalisées restent annoncées comme futures (P02, P09, P10). |

### 6.2 Retrouvabilité

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Localisation | **Partiel — Doc.** Activités et assets ont des emplacements canoniques et des routes stables locales (P02–P04). Les médias binaires sont locaux, ignorés et non empaquetés (P11). | **Consolidé — Doc.** Le prototype, son serveur, son launcher et ses routes sont identifiables dans le dépôt (P02, P15). |
| Identification | **Fragile — Doc.** IDs stables et titres existent, mais tous les statuts sont `draft`, plusieurs titres sont des essais et les versions d’activité sont hétérogènes (P03). | **Partiel — Doc.** Version serveur et moteur sont explicites, mais plusieurs documents annoncent d’anciennes versions et distinguent mal actif/historique (P02, P09). |
| Description pédagogique | **Fragile — Doc.** Recherche et tags portent surtout le média ; les activités n’indexent pas public, objectif, durée, modalité ou degré de guidage (P03–P05). | **Partiel — Doc.** La fonction générale est décrite, mais il n’existe pas de manifeste synthétique de capacités et contraintes courant en `0.1.40` (P09). |
| Multiplicité des accès | **Partiel — TC.** Recherche, tri, dossiers, tags, disponibilités, usages et familles offrent plusieurs entrées côté médias (P05, P06). Les activités n’ont ni tags ni recherche pédagogique multi-critères. | **Consolidé — TC.** Hub, launcher, routes directes, bibliothèque, fiche détaillée et API fournissent plusieurs accès (P02, P05, P06, P17). |
| Contexte et provenance | **Partiel — Doc.** La provenance technique et le lignage média sont forts ; auteurs, crédits, contexte de captation, droits et filiation d’activité sont faibles ou vides (P03, P04). | **Partiel — Doc.** Git et rapports donnent une chronologie riche, mais un commit peut agréger plusieurs missions sous un message partiel, comme `f5812f3` (P01, P10, P14). |
| Articulation aux classements existants | **Partiel — TC.** Dossier virtuel singulier, tags multiples, recherche et CSV offrent des prises ; pas de favoris, paquet exportable ni liens externes documentés (P05, P06). | **Partiel — Doc.** Le stockage reste lisible et les classements sont virtuels, mais l’organisation est propre à Proto05 et non exportée comme convention portable (P04, P11). |

### 6.3 Adaptabilité

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Accès aux composants | **Consolidé — Doc./TC.** Vidéo, transcription, segments, locuteurs, langues, phénomènes, couches, annotations et overlays sont séparés et éditables (P03, P05, P06). Les droits restent absents. | **Consolidé — Doc.** HTML/JS/JSON et modules de contrat sont accessibles sans format opaque (P02, P04, P05). |
| Transformations prévisibles | **Partiel — TC.** On peut modifier métadonnées, segments, langues, locuteurs, couches, phénomènes, média et anonymisation (P05, P06). Public, durée pédagogique, variantes de guidage et conséquences didactiques ne sont pas cadrés. | **Consolidé — TC.** Les principaux writers et transformations sont testés sur copies temporaires (P06, P08). |
| Stabilité et transformabilité | **Partiel — TC.** Duplication indépendante et prévisualisation protègent l’original technique, mais toutes les activités restent brouillons et aucune version de référence pédagogique n’est désignée (P03, P06). | **Partiel — Doc./TC.** Git, JSON canonique, backups et tests créent une base stable ; la documentation et un test ne sont pas synchronisés (P01, P08, P09, P18). |
| Modularité cohérente | **Partiel — Doc.** Les composants sont modulaires et reliés par IDs, mais leur reprise isolée ne transporte pas automatiquement intention, droits et scénario (P03, P04). | **Consolidé — Doc./TC.** Modules de contrat, player et timeline partagés limitent les doubles vérités ; l’adaptateur historique reste une couche de complexité (P04–P06). |
| Portabilité | **Fragile — Doc.** JSON et CSV sont lisibles, mais aucun paquet ne réunit activité, médias, droits et provenance ; les binaires sont ignorés et des sources sont distantes (P03, P04, P11). | **Partiel — Doc.** Serveur sans dépendances npm propres, bind local et launcher Windows ; dépendances FFmpeg, Chrome, source distante et `hls.js` détenu par le Hub (P02, P15–P17). |
| Droits de transformation | **Non observable — Doc.** Les 16 objets `rights` sont vides et aucun fichier de licence/crédits n’a été trouvé (P04, P13). Ne pas confondre absence de preuve et interdiction juridique. **Action bloquante pour transmission.** | **Non observable — Doc.** Aucune licence du code ou politique de redistribution trouvée (P13). |
| Variantes et filiation | **Fragile — TC.** Le lignage média est consolidé, mais une activité dupliquée ne conserve pas de référence vers son activité source (P03, P04, P06). | **Consolidé — TC.** Parent/racine, rôles, traitements et sorties sont validés pour les médias récents ; les accès historiques restent explicitement non qualifiés (P04, P06, P10). |

### 6.4 Documentation proportionnée

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Minimum pédagogique | **Fragile — Doc.** Intention générale et langues existent ; public, durée pédagogique, prérequis, droits et éléments indispensables manquent au niveau activité (P03, P09). | **Partiel — Doc.** Rôle, lancement et limites existent, mais sont dispersés et datés (P09). |
| Gestes d’accompagnement | **Non observable — Doc.** Aucune fiche enseignant n’explique animation, discussion, relances ou usage des observations (P09, P13). Les questions segmentaires ne remplacent pas ces gestes. | **Non pertinent.** Ce critère s’applique d’abord à la ressource. Pour l’exploitation technique, les gestes nécessaires relèvent des guides de maintenance évalués plus bas. |
| Utilisation et reprise | **Fragile — Doc./TC.** L’interface guide la modification, mais aucun guide de reprise d’une activité ni paquet d’export n’existe ; aucun enseignant tiers n’a réalisé la tâche (P05, P19). | **Partiel — Doc./TC.** `npm start`, launcher et tests existent. Installation des prérequis, restauration et clone vierge ne sont pas démontrés (P09, P15). |
| Dépendances et limites | **Partiel — Doc.** Les limites vidéo et HLS sont décrites, mais droits, médias ignorés et qualité pédagogique par activité ne sont pas synthétisés (P09, P11). | **Partiel — Doc.** Les dépendances sont identifiables dans le code, mais les documents disent encore que le proxy dépend du Hub et n’isolent pas clairement la dépendance `hls.js` restante (P02, P09, P17). |
| Progressivité | **Partiel — Doc.** Le README donne une entrée simple puis une longue chronologie ; il n’offre pas de fiche courte à jour suivie d’annexes par activité (P09). | **Partiel — Doc.** README, modèle, moteur, roadmap et rapports offrent plusieurs niveaux, mais sans index de vérité courante (P09, P10). |
| Proportionnalité | **Fragile — Doc.** Le coût documentaire est élevé en rapports, mais les informations essentielles de reprise pédagogique restent absentes ; effort mal réparti (P03, P09, P10). | **Fragile — Doc.** Plus de cent rapports Proto05 facilitent l’archéologie mais imposent une charge excessive pour reconstruire l’état courant (P10). |
| Actualité | **Fragile — Doc.** Le README décrit encore une ressource non éditable et limitée à l’ancien état (P09). | **Fragile — Doc./TC.** Versions, proxy, migration et roadmap divergent du code ; un test Chromium garde un contrat obsolète (P09, P18). |

### 6.5 Animation et accompagnement de la circulation

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Orientation | **Fragile — Doc.** Le dépôt et le README sont des points d’entrée, mais aucun contact fonctionnel, aide contextuelle ou relais n’est identifié (P09, P13). | **Fragile — Doc.** `AGENTS.md` oriente l’agent et les rapports orientent David ; aucun point d’aide pour un mainteneur extérieur n’est formalisé (P09, P13). |
| Transmission des pratiques | **Non observable — Doc.** Des recettes techniques et validations de David existent, mais aucun cas d’usage enseignant observé ou démonstration pédagogique autonome n’a été trouvé (P10, P19). | **Partiel — Doc.** Rapports et tests transmettent de nombreux gestes techniques ; ils ne constituent pas une passation indépendante (P06, P10). |
| Retours d’expérience | **Non observable.** Aucun mécanisme relié à une activité pour recueillir difficulté, adaptation ou usage réel ; les observations étudiantes sont locales et exportables seulement (P05, P19). | **Fragile — Doc.** Les rapports consignent les recettes et corrections, mais pas un canal durable de retour utilisateur ni un rattachement structuré à une version (P10, P13). |
| Contribution légère | **Non observable.** Aucun formulaire ou canal de variante/correction pédagogique documenté (P13). | **Fragile — Doc.** Git permet techniquement une contribution, mais aucune procédure `CONTRIBUTING`, modèle d’issue ou règle de revue n’est fournie (P13). |
| Non-dépendance aux personnes | **Fragile — Doc.** L’accès aux fichiers demeure, mais le choix des ressources fiables, les droits et le cœur pédagogique dépendent encore de David (P03, P09, P19). | **Fragile — Doc.** Le code est inspectable, mais les arbitrages de roadmap et rôles sont explicitement centrés sur « David et GPT » ; aucune relève testée (P09, P13). |
| Réalisme de l’animation | **Non observable.** Aucun rôle, temps, fréquence ou moyen dédié à l’animation d’une communauté de ressources (P13). | **Non observable.** Aucun dispositif de support ou niveau de service réaliste n’est défini (P13). |

### 6.6 Pérennité d’usage

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Conservation utile | **Partiel — Doc.** Activités, catalogues et provenance sont conservés ; médias et backups sont locaux/ignorés, droits absents et observations non persistées (P03, P04, P11). | **Partiel — Doc./TC.** Git conserve le code et les JSON ; writers et backups protègent les mutations. Il n’existe pas d’inventaire d’archive complet (P01, P08, P11). |
| Formats et dépendances | **Partiel — Doc.** JSON, CSV, HLS et MP4 sont lisibles ; certaines métadonnées techniques sont nulles et la source distante peut disparaître (P03, P04). | **Partiel — Doc.** Node est borné, `hls.js` est verrouillé côté Hub, FFmpeg est diagnostiqué ; aucune installation reproductible propre à Proto05 ne réunit ces dépendances (P02, P15–P17). |
| Séparation contenu–outil | **Partiel — Doc.** Les données structurées survivraient à l’interface, mais médias, droits, scénario enseignant et export complet ne sont pas autonomes (P03, P11). | **Consolidé — Doc.** Données, contrats et interfaces sont séparés ; les projections historiques restent lisibles (P02, P04). |
| Migration et réactivation | **Fragile — TC.** La migration Library a été testée et sauvegardée, mais pas l’export/réactivation d’une activité complète dans un autre contexte (P10, P19). | **Partiel — TC.** Migrateurs, dry-run et installation sont testés ; aucune reconstruction actuelle sur environnement vierge ni restauration complète avec médias n’est prouvée (P06, P10, P11). |
| Maintenance réaliste | **Fragile — Doc./TC.** Les contrôles techniques sont nombreux, mais il n’existe pas de calendrier de vérification des droits, transcriptions, liens et intentions (P09, P13). | **Partiel — Doc./TC.** Tests et rapports identifient les contrôles ; l’échec obsolète, les docs datées et l’absence de guide de maintenance montrent que la charge n’est pas consolidée (P06, P09, P18). |
| Cycle de vie | **Fragile — Doc.** Assets `active/archived` existent, mais toutes les activités restent `draft` sans publication, validation, archivage ou fin de vie (P03, P04). | **Fragile — Doc.** La roadmap utilise des statuts mais n’est pas actualisée ; aucune politique de fin de service ou de conservation des médias n’est fixée (P09). |
| Abandon sans perte | **Fragile — Doc.** Les JSON resteraient récupérables, mais pas nécessairement les médias ignorés, les droits, le contexte ou les observations (P03, P11). | **Fragile — Doc.** Le dépôt permet l’archéologie, mais aucun paquet de clôture, inventaire des binaires ni procédure d’abandon/restauration n’existe (P11, P13). |

### 6.7 Clarification des responsabilités

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Cartographie des tâches | **Fragile — Doc.** Création, édition, classement et traitement sont visibles dans l’interface ; décrire, valider, licencier, publier, actualiser et recueillir les retours ne le sont pas (P05, P09). | **Partiel — Doc.** `AGENTS.md`, roadmap et rapports décrivent de nombreuses opérations, sans matrice courante de maintenance (P09, P10). |
| Responsables actuels | **Fragile — Doc.** David est implicitement responsable ; aucune propriété par activité, média, droits ou validation pédagogique n’est enregistrée (P03, P04, P09). | **Fragile — Doc.** La roadmap cite David, GPT et le stagiaire, mais pas de mainteneur fonctionnel, suppléant ou procédure de décision après le stage (P09). |
| Répartition soutenable | **Fragile — Doc.** Description, vérification, droits et transmission reposent de fait sur David ; aucune preuve de répartition (P13, P19). | **Fragile — Doc.** Automatisation forte, mais documentation, arbitrages et diagnostics restent concentrés ; aucune équipe ou relève démontrée (P09, P19). |
| Gouvernance | **Non observable — Doc.** Pas de licence, règles de publication, politique de contribution ou gouvernance des données pédagogiques trouvée (P13). | **Fragile — Doc.** Règles de sécurité et propriété des données existent dans `AGENTS.md`/architecture, mais droits, versions de service, contributions et médias ne sont pas gouvernés complètement (P09, P13). |
| Transmission | **Non observable.** Aucun enseignant extérieur ni mainteneur indépendant n’a effectué la passation attendue (P19). | **Fragile — Doc.** Rapports et tests soutiennent une passation potentielle, mais aucune reprise indépendante ni exercice de restauration n’est observé (P10, P19). |
| Moyens reconnus | **Non observable.** Temps de description, animation, validation des droits et adaptation non estimé (P13). | **Fragile — Doc.** Les dépendances et tâches sont visibles, mais charge, compétences, hébergement et continuité ne sont pas budgétés ni attribués (P09, P13). |

### 6.8 Arbitrages transversaux

| Critère | Ressource pédagogique | Prototype logiciel |
|---|---|---|
| Coût de réappropriation | **Partiel — Doc./TC.** Recherche, tags, usages, duplication, édition structurée et prévisualisation réduisent le travail. L’absence de fiche pédagogique, droits, export complet et filiation d’activité impose une reconstruction importante. Le bénéfice reste une hypothèse avant test enseignant (P03–P06, P19). | **Partiel — Doc./TC.** Contrats, tests, launchers et rapports réduisent l’archéologie technique ; contradictions documentaires, dépendances locales et absence de restauration augmentent le coût (P06, P09, P11, P17, P18). |
| Intention pédagogique | **Fragile — Doc.** La structure conserve questions, phénomènes et couches, mais l’éditeur autorise des transformations sans expliciter les invariants didactiques ; la prévisualisation montre l’effet visible, pas la perte d’intention (P03, P05). | **Partiel — Doc.** L’architecture protège l’intégrité référentielle et la prévisualisation, mais aucune validation serveur ne protège une intention pédagogique (P06). |
| Compatibilité située | **Fragile — Doc.** L’usage de consultation est accessible dans un navigateur ; la reprise complète demande serveur local, compréhension du modèle et parfois FFmpeg. Compatibilité avec le temps et les moyens des enseignants non observée (P15–P19). | **Partiel — Doc./TC.** Adapté à un laboratoire Windows techniquement équipé ; moins réaliste pour un enseignant seul ou une institution sans Node/FFmpeg/gestion de médias locaux (P02, P15–P17). |

Question finale de la grille : **le travail évité est-il supérieur au travail
ajouté ?**

Hypothèse argumentée : **oui pour les opérations techniques répétées sur les
médias et les annotations ; non démontré pour la reprise pédagogique et la
transmission institutionnelle.** Un test auprès d’enseignants et un exercice de
passation technique sont indispensables pour trancher.

## 7. Synthèse du profil

| Élément | Synthèse |
|---|---|
| Forces déjà consolidées | Données structurées ; ateliers séparés ; prévisualisation ; Library consultable ; provenance et lignage média récents ; usages ; disponibilité ; dossiers/tags ; écritures atomiques ; suppressions protégées ; tests étendus. |
| Fragilités critiques | Droits absents ; documentation d’entrée contradictoire ; aucune fiche pédagogique complète ; aucun paquet transmissible ; aucune restauration complète ; un test obsolète. |
| Dépendances au concepteur | Qualification des activités, choix de la source documentaire fiable, droits, cœur pédagogique, gouvernance, arbitrages de roadmap et continuité. |
| Coûts évitables imposés au repreneur | Lire de nombreux rapports, reconstruire le contexte, installer les dépendances, localiser les médias ignorés, déduire les activités sérieuses et réconcilier les contrats. |
| Risques pour l’intention | Suppression de couches/questions/segments sans avertissement didactique ; anonymisation de signes pertinents ; duplication sans filiation d’activité. |
| Actions prioritaires à faible coût | Fiche minimale par activité ; matrice « actif/historique » ; synchronisation des cinq documents d’entrée ; réconciliation du test d’usage ; licence/crédits explicites. |
| Actions importantes mais coûteuses | Paquet d’export/reprise, restauration sur environnement vierge, filiation des activités, gouvernance et passation indépendante. |
| Fragilités structurelles | Dépendance à des médias lourds/distants, coût de FFmpeg, nécessité d’une expertise didactique pour qualifier le cœur pédagogique. |
| Critères non pertinents | « Gestes d’accompagnement » est non pertinent uniquement pour le logiciel pris isolément ; tous les autres critères ont un effet direct ou indirect. |
| Prochaine mise à l’épreuve | Tâche de reprise complète par un enseignant extérieur et tâche de lancement/restauration par un mainteneur n’ayant pas participé au développement. |

## 8. Forces consolidées

1. **Structure observable.** Les relations techniques ne reposent plus sur des
   noms de fichiers : IDs, références, familles, rôles et traitements sont
   validés.
2. **Préservation.** Les originaux distants, copies de travail et dérivations
   récentes sont distingués. Une copie ne remplace plus silencieusement
   l’original dans une activité.
3. **Retrouvabilité média.** Recherche, tri, dossiers, tags, disponibilités,
   usages et fiche détaillée donnent plusieurs chemins d’accès.
4. **Édition et prévisualisation.** Les vues étudiant, enseignant, guidée et
   avancée partagent les mêmes données et permettent d’observer le résultat.
5. **Sécurité des écritures.** Validation, file d’écriture, `.bak`, temporaire,
   renommage et rollback physique sont couverts sur fixtures.
6. **Diagnostic.** États `missing-local`, traitements persistants, logs FFmpeg
   et erreurs structurées rendent plusieurs dégradations explicites.
7. **Historique.** Les baby steps, rapports et commits rendent les décisions
   reconstructibles, même si cette reconstruction est coûteuse.

## 9. Fragilités et dépendances

- l’activité pédagogique n’a pas de manifeste minimal autonome ;
- la Library connaît la provenance technique, pas les droits ni les crédits ;
- le lignage des médias est plus mûr que le lignage des activités ;
- cinq activités sur sept restent sur le fallback sans `videoRef` ;
- les médias et sauvegardes utiles sont ignorés par Git et non inventoriés dans
  un paquet ;
- `hls.js` reste physiquement détenu par IC-Hub ;
- le launcher accepte tout processus écoutant sur 8791 sans vérifier son
  identité ;
- le corpus mélange ressource riche et brouillons d’essai ;
- la documentation a plusieurs sources de vérité concurrentes ;
- aucun tiers extérieur n’a prouvé la reprise.

## 10. Absents, non documentés et non vérifiables

### Absents dans l’état inspecté

- licence du code et licence/crédits des médias ;
- champs activité pour public, prérequis, durée pédagogique et auteur ;
- filiation entre activité originale et activité dupliquée ;
- paquet d’export complet ;
- authentification et autorisation serveur ;
- persistance des observations étudiantes ;
- guide de maintenance/restauration courant ;
- procédure de contribution et de relais.

### Fonctionnels mais non ou mal documentés

- proxy HLS directement porté par Proto05 ;
- Library canonique installée et active ;
- version `0.1.40` et fiche vidéo détaillée ;
- espaces de travail et traitements persistants ;
- contrat d’ouverture au clic des indicateurs ;
- état réel des phases Library de la roadmap.

### Non vérifiables pendant cet audit

- compréhension de l’intention par un enseignant extérieur ;
- utilité pédagogique en situation réelle ;
- temps effectivement économisé ;
- qualité et exactitude complète de la transcription et des timestamps ;
- capacité de reconstruction sur machine vierge ;
- légalité de la transformation et redistribution des médias ;
- continuité si David n’est plus disponible.

## 11. Comparaison historique préliminaire et commits candidats

### 11.1 Candidat principal « avant »

| Hash | Date | Message | Justification |
|---|---|---|---|
| `6fcbb9a0cfa439384ad3f034407731617e4c8c04` | 13 juillet 2026, 21:00 +02:00 | `lundi soir` | Proto05 `0.1.7` est déjà fonctionnel : serveur autonome, une activité riche, vues étudiant/enseignant, ateliers auteur et guidé, couches et écriture atomique. L’arbre ne contient encore aucun test. Le HLS dépend de `127.0.0.1:8790` et de `hls.js` du Hub. |

État quantifié à ce commit : 1 activité, 11 segments, 26 phénomènes, 7 couches,
28 fichiers Proto05 suivis et aucun fichier sous `server/test/`.

### 11.2 Jalon intermédiaire utile

| Hash | Date | Message | Justification |
|---|---|---|---|
| `b508c2054773ad1522a38f332c2aa1d939c2720c` | 23 juillet 2026 | `feat(proto05): add media contract and playback resolver` | Version `0.1.23`, 52 fichiers Proto05 et 15 fichiers de test. Le contrat média apparaît juste avant la Library canonique, ce qui permettrait d’isoler l’apport de la modélisation asset/source/playable. |

### 11.3 État actuel

| Hash | Date | Message | Justification |
|---|---|---|---|
| `ac77bcf847b1d13a641af93804fba55c5f408ba1` | 25 juillet 2026, 21:38 +02:00 | `feat(proto05): add dedicated full-width video detail page` | Version `0.1.40`, 84 fichiers Proto05 et 33 fichiers dans l’arbre de test. État canonique examiné. |

Entre `6fcbb9a` et l’état actuel : 66 fichiers Proto05 changés, 22 933 lignes
ajoutées et 285 supprimées. Les progrès les plus nets concernent les composants
et relations, l’accès aux composants, la stabilité des écritures, la provenance
média, la retrouvabilité, la disponibilité et la testabilité. Les fragilités
persistantes concernent les droits, le public, le cœur pédagogique, la filiation
des activités, la documentation actuelle, la portabilité complète, la
gouvernance et la reprise par un tiers.

Limites de la comparaison :

- aucune ancienne version n’a été reconstruite ou exécutée ;
- les médias binaires ignorés et les services distants peuvent avoir évolué ;
- le message `6fcbb9a` est peu descriptif ;
- certains commits agrègent plusieurs missions : `f5812f3`, par exemple,
  installe la Library canonique et ajoute les rapports 102, 103, 105 et 106 sous
  un message centré sur les dossiers/tags ;
- l’augmentation du nombre de fonctions ne vaut pas automatiquement
  amélioration de réappropriabilité.

Pour un futur miroir strict, il faudra figer captures, courte vidéo, corpus de
données anonymisé et même tâche de reprise pour les deux commits.

## 12. Travail évité par Proto05

Pour un enseignant :

- retrouver un média par titre, tag, dossier, état ou usage ;
- voir ses activités dépendantes et ses versions ;
- naviguer dans transcription, langues et phénomènes sur une timeline ;
- dupliquer une activité sans remapper manuellement tous les IDs ;
- prévisualiser le résultat étudiant ;
- produire une copie de travail et des dérivations sans manipuler directement
  les commandes FFmpeg ;
- exporter ses observations en CSV.

Pour un mainteneur :

- reconstruire à la main les relations média ;
- détecter de nombreuses références orphelines ;
- inventer un protocole d’écriture atomique ;
- diagnostiquer plusieurs fichiers absents ou traitements interrompus ;
- écrire de zéro des fixtures de sécurité, migration et suppression.

## 13. Travail ajouté par Proto05

- installer et maintenir Node, navigateur, FFmpeg/FFprobe et `hls.js` ;
- administrer des JSON, médias ignorés, workspaces et backups locaux ;
- comprendre Library canonique, projection historique et catalogue fallback ;
- choisir entre plusieurs documents contradictoires ;
- qualifier les activités et remplir les métadonnées manquantes ;
- vérifier les droits et la provenance humaine ;
- surveiller la disponibilité des sources distantes ;
- réconcilier tests, documentation et baby steps ;
- maintenir une application complète là où une activité simple aurait pu être
  transmise sous une forme plus légère.

## 14. Risques de dégradation de l’intention pédagogique

1. **Éditabilité sans invariant didactique.** Une activité peut rester
   structurellement valide après suppression de questions, couches ou moments
   essentiels.
2. **Prévisualisation insuffisante.** Voir que l’écran fonctionne ne montre pas
   que l’activité conserve sa raison pédagogique.
3. **Anonymisation.** Un masque peut retirer un indice visuel utile à l’analyse
   interactionnelle ; la traçabilité technique n’explicite pas cet arbitrage.
4. **Duplication sans filiation.** Une variante peut circuler sans relation
   explicite à l’activité d’origine.
5. **Mélange brouillon/ressource.** L’absence de publication ou validation peut
   conduire à reprendre un essai comme référence.
6. **Observations locales.** L’export CSV conserve une trace, mais la relation
   durable entre cette trace, l’activité et sa version n’est pas garantie.

## 15. Compatibilité avec les pratiques et moyens des acteurs

La consultation étudiante dans un navigateur est compatible avec des moyens
ordinaires si le serveur est déjà disponible. L’édition guidée réduit la
technicité visible et masque plusieurs IDs.

La reprise complète reste adaptée surtout à un laboratoire ou à un mainteneur
technique :

- Windows est bien pris en charge par les launchers ;
- le serveur est local et ne demande pas de base externe ;
- FFmpeg et les médias lourds augmentent la charge ;
- `hls.js` n’appartient pas encore au package Proto05 ;
- l’absence d’authentification limite un déploiement partagé ;
- aucune mesure ne prouve que le temps de description et de classement reste
  acceptable pour les enseignants.

La compatibilité située ne peut donc pas être déclarée consolidée sans
observation.

## 16. Priorités de consolidation proportionnées

### Bloquantes pour une transmission externe

1. Clarifier licence, crédits, autorisations de transformation et
   redistribution du code et des médias.
2. Produire une fiche minimale pour les activités retenues : intention, public,
   prérequis, durée, contexte, cœur pédagogique, marges d’adaptation et statut.
3. Synchroniser un petit ensemble de documents d’entrée avec `0.1.40` et
   désigner leur ordre de vérité.
4. Documenter l’inventaire des médias et une procédure réaliste de
   sauvegarde/restauration.

### Importantes

1. Distinguer ressources de démonstration, brouillons d’essai et activités
   transmissibles.
2. Conserver la filiation lors d’une duplication d’activité.
3. Achever ou déclarer explicitement la transition `videoRef` des cinq
   activités restantes.
4. Rendre Proto05 propriétaire de sa dépendance `hls.js` ou documenter
   explicitement la dépendance croisée.
5. Réconcilier le test d’usage obsolète avec le contrat de la mission 116.
6. Tester lancement et restauration sur un environnement préparé mais vierge.

### Utiles mais non prioritaires

- export d’un paquet activité + manifeste + métadonnées + références médias ;
- index de rapports par fonctionnalité et statut ;
- guide de contribution et matrice simple de responsabilités ;
- politique de conservation des traitements, logs, backups et médias archivés ;
- exposé lisible des accès historiques non qualifiés.

### Nécessitant une observation auprès d’enseignants

- retrouver une activité à partir d’une intention ;
- expliquer son cœur sans aide orale ;
- créer une variante en conservant l’essentiel ;
- comprendre dossiers, tags, usages et familles ;
- juger le coût de saisie documentaire ;
- mesurer le temps évité et les erreurs ;
- vérifier si l’anonymisation conserve les indices pédagogiquement utiles.

## 17. Critique de la grille elle-même

### Critères redondants

- `Intention pédagogique`, `Cœur pédagogique`, `Minimum pédagogique` et
  l’arbitrage `Intention pédagogique` se recouvrent fortement.
- `Contexte et provenance`, `Variantes et filiation` et `Conservation utile`
  évaluent plusieurs fois la traçabilité.
- `Non-dépendance aux personnes`, `Répartition soutenable` et `Transmission`
  pointent le même risque avec des angles voisins.
- `Utilisation et reprise`, `Migration et réactivation` et `Transmission`
  demandent de mieux distinguer reprise pédagogique et reprise technique.

### Formulations trop abstraites

- `Réalité de l’animation`, `Moyens reconnus` et `Proportionnalité` demandent
  une unité d’observation ou des indicateurs pour éviter des jugements
  impressionnistes.
- `Modularité cohérente` et `Compatibilité située` changent fortement selon le
  profil du tiers ; la fiche de cadrage doit être obligatoire, pas seulement
  recommandée.
- `Travail évité supérieur au travail ajouté` nécessite une tâche, une durée et
  un acteur de référence.

### Critères impossibles à prouver ici

- efficacité ou appropriation pédagogique sans enseignants ;
- réalisme de l’animation sans organisation porteuse ;
- non-dépendance aux personnes sans passation ;
- abandon sans perte sans exercice d’archive/restauration ;
- compatibilité située sans inventaire des moyens et observation.

L’état `Non observable` est indispensable pour ne pas transformer ces absences
de preuve en verdicts artificiels.

### Éléments manquants révélés par Proto05

1. **Cohérence entre documentation, code, test et données.** L’actualité seule
   ne décrit pas le cas où quatre sources se contredisent.
2. **Complétude du paquet conservé.** Des JSON suivis ne suffisent pas si les
   binaires et backups restent locaux.
3. **Dette de compatibilité.** Les projections historiques peuvent favoriser la
   continuité tout en augmentant le coût de maintenance.
4. **Statut du corpus.** La grille devrait distinguer donnée de test, brouillon,
   démonstrateur et ressource publiable.
5. **Vie privée et anonymisation.** Droits, consentement, conservation des
   originaux et validation des masques méritent un critère explicite.
6. **Alignement tests–contrat.** Une suite volumineuse peut donner une impression
   de consolidation malgré une attente devenue obsolète.
7. **Granularité de la filiation.** Proto05 montre qu’on peut consolider la
   filiation média tout en laissant la filiation pédagogique fragile.

## 18. Version courte de la grille pour la soutenance

### Fiche en huit questions

1. **Comprendre** — Quelle est l’intention et quel est le cœur à préserver ?
2. **Retrouver** — Peut-on localiser la bonne activité et ses composants par
   plusieurs chemins ?
3. **Transformer** — Peut-on modifier un élément utile sans reconstruire ni
   casser les relations ?
4. **Tracer** — Sources, droits, versions, dérivations et variantes restent-ils
   visibles ?
5. **Transmettre** — Un enseignant extérieur peut-il reprendre l’ensemble sans
   explication orale décisive ?
6. **Maintenir** — Un tiers peut-il lancer, diagnostiquer, tester et restaurer ?
7. **Abandonner sans perdre** — Que reste-t-il si l’application disparaît ?
8. **Arbitrer** — Le travail réellement évité dépasse-t-il le travail ajouté,
   sans dégrader l’intention ?

### Preuves courtes à montrer

- avant `6fcbb9a` : une activité, serveur `0.1.7`, aucun test, HLS via Hub ;
- après `ac77bcf` : Library, lignage, usages, 201 tests dont un écart honnêtement
  visible ;
- fiche vidéo 36971 : originale, copie, deux dérivations et traitements ;
- activité riche : segments, langues, phénomènes et questions ;
- contre-preuves : droits vides, README daté et absence de filiation
  d’activité.

## 19. Conclusion — réponse explicite au test du miroir

Proto05 a réellement progressé en réappropriabilité : les données ne sont plus
enfouies dans une page, les relations média ne reposent plus sur des fichiers
implicites, les traitements sont traçables, les suppressions sont protégées et
les principaux parcours disposent de tests. Un tiers technique peut désormais
examiner le système avec des prises solides.

Le miroir reste néanmoins actif. Le prototype conçu pour lutter contre la
dispersion produit lui-même une dispersion documentaire ; celui qui préserve
les filiations média ne préserve pas encore la filiation des activités ; celui
qui rend les médias retrouvables ne dit pas lesquels sont juridiquement et
pédagogiquement transmissibles ; celui qui automatise la sécurité technique
ne documente pas encore la continuité humaine.

Le verdict qualitatif n’est donc ni « échec » ni « consolidé ». **Proto05 est
techniquement reprenable de façon partielle à forte, pédagogiquement reprenable
de façon fragile à partielle, et institutionnellement non consolidé.** Sa
prochaine consolidation utile ne devrait pas être une nouvelle fonction
spectaculaire, mais la réduction ciblée des dépendances au concepteur :
qualification des ressources, droits, documentation actuelle, filiation des
activités, restauration et épreuve par des tiers.

## 20. Contrôles, limites et restitution

### Contrôles réalisés

- lecture de la grille et du corpus documentaire ;
- inventaire des routes, fichiers, données et dépendances ;
- comptage et inspection des données canoniques ;
- comparaison des empreintes avant/après ;
- une première tentative `npm.cmd test` interrompue par un délai de commande
  d’audit trop court et terminée par `EPIPE`, sans résultat fonctionnel retenu ;
- `npm.cmd test` : **200 réussis, 1 échec sur 201** ;
- diagnostic de l’unique échec : attente Chromium survol/focus obsolète ;
- `npm.cmd run check` : réussi ;
- analyse Git en lecture seule ;
- vérification de l’absence de listener Proto05 temporaire ;
- `git diff --check` : réussi.

### Non vérifié

- serveur canonique et source HLS distante en usage réel pendant cette mission ;
- téléchargement ou dérivation réelle ;
- installation vierge et restauration complète ;
- validation visuelle manuelle nouvelle ;
- validation fonctionnelle humaine de David ;
- tâche de reprise par enseignant ou mainteneur indépendant ;
- droits juridiques et exactitude pédagogique du corpus.

### Fichier créé

- `reports/118_proto05_critical_reappropriability_audit.md`

Aucun code, interface, donnée, launcher, configuration ou version n’a été
modifié. Version obtenue : **inchangée, `0.1.40`**.

Aucun commit ni push n’a été effectué.

État Git final :

```text
## main...origin/main
?? GRILLE_CRITIQUE_REAPPROPRIABILITE.md
?? reports/118_proto05_critical_reappropriability_audit.md
```

La grille était le fichier non suivi préexistant. Le rapport 118 est donc le
seul fichier créé par cette mission. Aucun processus Proto05 ni listener sur
les ports temporaires contrôlés n’est resté actif. La validation humaine de
David demeure en attente.

Message de commit proposé, non exécuté :

`docs(proto05): audit critical reappropriability`
