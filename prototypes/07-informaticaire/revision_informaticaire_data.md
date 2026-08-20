# Révision éditoriale d’Informaticaire — 20 août 2026

## Livrable

Le fichier `data_informaticaire_revise.js` est une copie révisée de `data.js`. Le fichier transmis par David n’a pas été modifié.

## Résultat

- 60 des 64 fiches initiales conservées après retrait des quatre notices hors périmètre ou inexploitables ;
- 13 fiches éditoriales et prototypes ajoutés lors de la première passe ;
- 31 fiches autonomes issues du recensement de terrain `Formarse en IC` ;
- 104 fiches au total ;
- 10 entrées chronologiques portées à 13 ;
- 17 filtres portés à 18 ;
- les 51 tuiles du Symbaloo sont toutes représentées : 31 par une fiche autonome, 19 par un lien qualifié dans une fiche existante et EVAL-IC par son lien déjà présent ;
- aucun identifiant dupliqué ;
- aucune relation interne, relation de graphe ou entrée chronologique orpheline ;
- aucune collision de titre ou d’alias après normalisation ;
- syntaxe JavaScript valide.

## Corrections certaines

### Lectŭrĭo+

La fiche `lecturio`, déjà reliée à une page Miriadi existante, n’est plus présentée comme un objet au nom et au statut inconnus :

- titre public corrigé en `Lectŭrĭo+` ;
- statut `vivant` ;
- source qualifiée comme documentation officielle retrouvée ;
- ancien identifiant `lecturio` conservé ;
- anciens alias conservés ou complétés pour la recherche.

### APICAD

APICAD était typé `acteur collectif`, valeur qu’aucun filtre public ne permettait d’afficher. La fiche utilise désormais le type technique `acteur`, avec `actorKind: institution / collectif`. Elle rejoint ainsi le filtre existant « Acteurs » sans perdre sa qualification.

### Miriadi

Le type `plateforme` était présent dans les données mais absent des filtres. Le filtre « Plateformes » a été ajouté.

La fiche déclare désormais un contrat `siteSearch` consommé par l'interface : libellé, aide, domaine `miriadi.net` et modèle de requête externe limité au site. Cette configuration ne remplace pas la recherche locale d'Informaticaire ; elle permet de l'étendre aux ressources Miriadi encore absentes de la cartographie. Le formulaire est rendu uniquement pour les fiches qui déclarent ce contrat, valide la saisie, encode la requête et ouvre les résultats externes dans un nouvel onglet sans modifier l'état courant de l'application.

### Raquel Serrano López

La fiche n’est plus décrite comme une simple personne citée :

- entretien réalisé ;
- transcription encore absente du corpus audité ;
- documents transmis attestés ;
- liens vers Interra, REFIC, Formarse en IC et l’étude de 2021 ;
- aucune demande explicite d’intégration ou de republication ne lui est attribuée.

### Prototypes du stage

La chronologie contenait déjà `prototypes-actuels`, mais aucune fiche correspondante n’existait. Une fiche transversale a été ajoutée, puis déclinée en cinq productions réellement montrables : `Seven Sieves`, `Dico-IC`, `Vidéos augmentées`, `Informaticaire` et `IC-Hub`. Chaque prototype est relié aux besoins auxquels il répond ; aucun lien local ou état de déploiement n’a été inventé.

### Richard Brunel Matias et PHIP

- le prénom isolé est remplacé publiquement par `Richard Brunel Matias` ;
- la fiche PHIP et la fiche acteur sont reliées dans les deux sens ;
- le lien officiel du portail remplace l’ancien rapprochement insuffisant ;
- le rôle de créateur de PHIP, la formation des enseignants de portugais, la participation aux manuels InterRom et la production de récits, guides et ressources audio sont explicités ;
- l’affiliation retenue est la Facultad de Lenguas de l’Universidad Nacional de Córdoba.

La piste « Mendoza » a été écartée : elle est contredite à la fois par l’entretien et par la présentation officielle de PHIP.

### Passe rapide sur les personnes interviewées

Les notices de Kátia Bernardon de Oliveira, Alice Fiorentino, Laura Nieddu, Thomas Defornel, Teurra Fernandes Vailatti, Giovanna Arenare, Elena Diego Hernández, Roxana Cancino Garcia et Sandrine Allain ont été resituées à partir des entretiens puis consolidées avec des sources institutionnelles. Fonctions, établissements attestés, publics, pratiques et productions sont distingués des éléments qui restent à préciser. `Chassagne / Castagne à Reims` est désormais identifié sans ambiguïté comme Éric Castagne. `Eric Martin / Éric Marteau` est résolu comme Éric Martin, auteur sur Galanet et contributeur du REFIC.

Les références publiques à Sandra et Hugues ont été harmonisées en `Sandra Garbarino` et `Hugues Sheeren`, tandis que les prénoms courts restent conservés dans le champ technique `interviews` pour correspondre aux noms de fichiers du corpus.

### Identités et affiliations consolidées le 20 août 2026

- Kátia Bernardon de Oliveira — Université Grenoble Alpes, Service des langues et LIDILEM ;
- Alice Fiorentino — Université Savoie Mont Blanc, LLSETI et réseau UNITA ;
- Laura Nieddu — Université Lumière Lyon 2, Centre de langues ;
- Thomas Defornel — École de français langue étrangère de l’Université de Lausanne, confirmé directement par l’entretien ;
- Teurra Fernandes Vailatti — Université Jean Moulin Lyon 3, Faculté des langues ;
- Giovanna Arenare — doctorat soutenu à l’Universitat Pompeu Fabra en 2022 et enseignement secondaire en Italie ;
- Elena Diego Hernández — Universidad de Salamanca, Facultad de Filología ;
- Roxana Cancino Garcia — doctorante à l’Université Grenoble Alpes, LIDILEM ;
- Sandrine Allain — Universidade Federal de Santa Catarina à Florianópolis et enseignement public de l’État de Santa Catarina ;
- Éric Castagne — Université de Reims Champagne-Ardenne, CIRLEP et réseau ICE.
- Éric Martin — Universitat Autònoma de Barcelona, Galanet et REFIC ; la variante « Éric Marteau » est conservée uniquement comme ancien alias de recherche.
- Lorraine Baqué — Universitat Autònoma de Barcelona, compréhension orale, phonétique et Galanet ; la forme « Laurent Baqué » est traitée comme une erreur de transcription et conservée comme alias.
- Paola Leone — Università del Salento, télétandem, interaction orale et intercompréhension ; la forme « Paula » est conservée comme alias ;
- Mariana Frontini — Université Lumière Lyon 2, enseignement et dispositifs d’intercompréhension ;
- Maddalena De Carlo — Università degli Studi di Cassino e del Lazio Meridionale, MIRIADI et coordination du REFIC ; la forme « Magdalena » est conservée comme alias.

Les variantes courtes restent des alias de recherche et les noms des fichiers d’entretien ne changent pas. En revanche, toutes les listes publiques `actors` et `citedBy` sont canonicalisées vers les identités complètes.

### Doutes maintenus au lieu d’être masqués

- l’établissement scolaire actuel de Giovanna Arenare en Italie n’est pas identifié dans les sources contrôlées ;
- l’établissement scolaire précis de Sandrine Allain dans le réseau public de Santa Catarina n’est pas identifié ;
- aucun profil institutionnel public fiable de Thomas Defornel n’a été retrouvé, mais son identité et son poste à Lausanne sont explicitement établis par sa transcription ;
- Philippe Blanchet, Pierre Escudé, Francisco Calvo del Olmo et Salman Khan sont identifiables, mais c’est la pertinence ou le contexte précis de leur citation dans ce corpus qui reste à établir.

Quatre notices trop fragiles ou hors périmètre ont été supprimées le 20 août 2026 :

- Timothée Liotard relève du contexte Boost’English et non d’Informaticaire ;
- Robin Bright est une spécialiste canadienne de la littératie, sans lien démontrable avec l’intercompréhension dans les sources contrôlées ;
- Lia Escarpe ne renvoie à aucune personne ni contribution fiable dans le champ ;
- `Hugo / Professor Hugo` ne permet aucune identification exploitable.

## Intégration exhaustive du recensement Formarse en IC

Le tableau Symbaloo est traité comme une trace actuelle du terrain et non comme un agrégateur historique accessoire. Sa provenance ne valide pas automatiquement chaque contenu, mais elle établit sa pertinence documentaire pour le corpus. Les 51 tuiles sont donc toutes représentées.

### 31 fiches autonomes

- matériels et projets : Euromania, Lingalog, EuroComDidact, Europa IC, Romanica Intercom, InterRom et PanromanIC ;
- jeux : Limbo, Latinolinguo, BABEL et Romanica ;
- continuité : Catalunya Intercomprensió ;
- vidéothèque : Linguamix, Langfocus et Ecolinguist ;
- recherche et fondements : la Jornada de l'UB, le TFM sur les chansons et l'IC germanique, les vidéos de fondements et en catalan, l'enseignement à distance, le plurilinguisme, l'intégration curriculaire, l'éducation plurilingue, la médiation doctorale et l'ouvrage collectif de Ca' Foscari ;
- curiosités et prolongements : Synergies Europe 5, la ressource de l'UNED, les origines des langues romanes, JALING et Mundolingua.

### 19 rattachements à des fiches existantes

- Itinéraires romans et Lectŭrĭo+ reçoivent les pages précises recensées ;
- EuRom rassemble EuRom5 et EuroComRom ;
- Miriadi rassemble ses activités, inscription, formation, événements, équipes de travail, témoignages et résultats de recherche ;
- REFIC, REFDIC et MAREP/CARAP reçoivent leurs versions ou documents complémentaires ;
- APICAD reçoit sa page de présentation et la collecte de soutien à l'IC ;
- l'étude Serrano López reçoit sa notice pérenne ;
- Formarse en IC conserve la définition grand public de Wikipédia comme porte d'entrée secondaire.

La tuile EVAL-IC était déjà représentée par son URL exacte. Avec la page Symbaloo elle-même, les 52 URL externes extraites du DOCX sont donc présentes dans les données.

Les deux PDF transmis servent uniquement de sources descriptives. Ils ne sont ni intégrés ni proposés au téléchargement.

## Relations ajoutées

Les nouveaux objets sont reliés aux fiches existantes les plus pertinentes : Miriadi, Galapro, Évaluation, EuRom, Aides à la compréhension orale, Centraliser sans figer, Encarni, Raquel et les prototypes du stage. Le nœud `formarse-en-ic` donne accès aux 51 objets représentés. Les relations existantes sont conservées et dédupliquées.

## Points volontairement non corrigés dans ce seul fichier

Ces sujets nécessitent une modification de l’interface ou un arbitrage documentaire, pas une réécriture automatique des données :

- le libellé public « Vérifié » doit devenir « Fiche revue le » dans le moteur d’affichage ;
- une date de contrôle d’accessibilité ne doit apparaître que pour un lien réellement contrôlé accessible ;
- les documentations annonçant encore 42 fiches doivent être alignées sur le corpus final ;
- les 10 fiches restant au statut `à vérifier` ne doivent pas être promues sans preuve ;
- les entrées dont le nom ou l’identité restent incertains doivent faire l’objet d’un arbitrage humain ; les entretiens ont permis de mieux les situer, mais pas toujours de retrouver leur état civil complet ;
- les URL répétées dans plusieurs fiches ont été conservées : elles expriment parfois un rapprochement documentaire, même lorsqu’il reste explicitement « à vérifier ».

## Contrôles exécutés

- `node --check data_informaticaire_revise.js` ;
- évaluation du fichier dans un contexte JavaScript isolé ;
- unicité des 104 identifiants ;
- présence des 52 URL externes extraites du DOCX, sans aucun lien manquant ;
- validation de toutes les cibles `relatedItems` et `relations` ;
- validation des identifiants du graphe et de la chronologie ;
- contrôle des champs obligatoires ;
- recherche des collisions de titres et d’alias normalisés.
