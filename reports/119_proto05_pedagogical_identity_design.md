# Mission 119 — Conception de l’identité pédagogique canonique de Proto05

Date : 2026-07-26

Nature : audit documentaire, fonctionnel et architectural, sans implémentation

Périmètre : `prototypes/05-augmented-ic-video-01`

Version applicative obtenue : inchangée — serveur/package `0.1.40`, moteur étudiant `0.0.9`

## 1. Résumé exécutif

Proto05 possède déjà un modèle technique riche pour la vidéo, la transcription,
les segments, les langues, les phénomènes, les couches et les annotations. Il ne
possède en revanche que quatre métadonnées pédagogiques générales éditables :
`title`, `description`, `instruction` et `pedagogicalQuestion`. Ces quatre champs
ne suffisent pas à dire à un enseignant tiers pour qui l’activité a été conçue,
dans quel contexte l’utiliser, ce qu’elle cherche à faire apprendre ou observer,
ce qu’il faut préserver lors d’une adaptation, ni si sa remise en circulation
est juridiquement établie.

La recommandation est **go**, sous quatre conditions :

1. ajouter à chaque activité un objet imbriqué `pedagogicalIdentity`, propriété
   directe de l’activité et non une deuxième base documentaire ;
2. conserver `activity.title` et `activity.description` comme titre pédagogique
   et résumé canoniques afin d’éviter une double saisie ;
3. représenter explicitement `known`, `unknown`, `not-applicable` et
   `to-verify`, sans inventer les données historiques ;
4. calculer les états `incomplete`, `qualified` et `transmissible` à partir des
   preuves enregistrées, plutôt que laisser un utilisateur déclarer librement
   une ressource « transmissible ».

La filiation pédagogique doit être distincte de la filiation des médias. Une
duplication d’activité doit créer une variante reliée à sa source directe et à
sa racine, remettre sa qualification en révision et ne jamais hériter
silencieusement de l’état `transmissible`.

L’insertion minimale recommandée utilise les surfaces existantes :

- badges et résumé court dans la bibliothèque enseignante ;
- fiche complète dans `/teacher/edit/:activityId`, qui est aujourd’hui la
  surface la plus proche d’une page de détail d’activité ;
- rappel compact et lien vers la fiche dans l’atelier guidé ;
- bandeau enseignant dans la prévisualisation ;
- aucun affichage des incertitudes internes dans la vue étudiante, hors
  attribution ou licence légalement requise.

La future Mission 120 ne doit ni refondre Proto05, ni ajouter une base, un
système de publication institutionnel, un historique complet d’audit, une
recherche multi-critères ou un export complet. Elle doit implémenter le contrat,
les états, la filiation lors de la duplication, une édition proportionnée et
les tests. Les sept activités existantes doivent rester lisibles et apparaître
comme incomplètes tant qu’elles n’ont pas été qualifiées humainement.

## 2. État actuel observé

### 2.1 État du dépôt et sources de vérité

L’état Git initial observé était :

```text
## main...origin/main [ahead 1]
HEAD 6f477417237fc72bec2751c76684a62cb4c72260
docs(proto05): audit critical reappropriability
```

Le répertoire de travail était propre. Le commit d’avance contenait le rapport
118. Aucun changement fonctionnel local n’était présent à préserver.

Les sources de vérité retenues après inspection sont :

- activités : `prototypes/05-augmented-ic-video-01/data/activities.json` ;
- médias : `prototypes/05-augmented-ic-video-01/data/video-library.json` ;
- validation, API et persistance : `prototypes/05-augmented-ic-video-01/server/server.js` ;
- référentiel des langues : `shared/reference-data/languages.json` ;
- modèle de Library : `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md`.

La documentation générale contient encore des versions ou états historiques.
Le code, le package et les données courantes ont donc primé pour les constats.

### 2.2 Activités et métadonnées actuelles

Le magasin contient sept activités :

- une activité historique riche, version `0.1.2` ;
- deux copies riches ou partielles, version `0.1.2` ;
- quatre brouillons ou essais, version `0.1.0` ;
- sept statuts techniques `draft`.

Le modèle d’une activité contient actuellement :

```text
id, version, status,
title, description, instruction, pedagogicalQuestion,
videoRef éventuel, video, transcription,
segments, speakers, languages, languageIntervals,
layers, phenomena, teacherAnnotations, overlays,
layerConfiguration
```

Il ne contient pas de champ canonique pour le public, le contexte, les objectifs,
les prérequis, la durée pédagogique, le scénario conseillé, le cœur
pédagogique, les marges d’adaptation, l’origine pédagogique, la filiation entre
activités, le responsable, les droits par composant, les limites ou la dernière
qualification.

Deux activités seulement possèdent un `videoRef` persisté. Les cinq autres,
dont l’activité historique, reposent encore sur la projection ou le fallback
vidéo lors de la résolution. L’API ajoute un `videoRef` résolu à sa réponse, mais
cela ne signifie pas qu’il est présent dans le JSON canonique.

### 2.3 Contrats d’écriture et comportement de duplication

`validateMetadataPatch()` n’autorise actuellement que :

```text
title, description, instruction, pedagogicalQuestion, videoId, videoRef
```

`validateAuthoringPatch()` ajoute les collections d’auteur, mais n’accepte
aucune fiche pédagogique. Les mises à jour de métadonnées et d’atelier partent
d’une copie superficielle de l’activité courante ; un futur champ inconnu est
donc préservé tant qu’il n’est pas envoyé par le client.

La duplication suit une autre logique : `duplicateActivity()` reconstruit
explicitement un nouvel objet, régénère les identifiants locaux et remappe les
références. Elle ne conserve que les propriétés énumérées dans son code. Une
future identité pédagogique serait donc perdue ou mal recopiée sans adaptation
explicite de cette fonction.

Les écritures sont sérialisées, atomiques et précédées d’une copie `.bak`. Cette
propriété doit rester inchangée.

### 2.4 Surfaces actuelles

| Surface | État observé |
|---|---|
| `/teacher` | Liste le titre, l’ID, la version et le nombre de segments ; propose prévisualisation, modification, vue étudiante, duplication et suppression. |
| `/teacher/create` | Demande un titre, une description et une vidéo de la Library, puis crée un brouillon. |
| `/teacher/edit/:id` | Édite titre, description, consigne, question générale et vidéo. C’est la surface actuelle la plus proche d’une fiche de détail d’activité. |
| `/teacher/author/:id` | Atelier avancé ; édite aussi les quatre métadonnées générales et tous les composants. |
| `/teacher/guided/:id` | Atelier guidé centré sur vidéo, timeline, segments, langues, phénomènes, couches, locuteurs et annotations. |
| `/teacher/preview/:id` | Réutilise exactement le moteur étudiant `index-0.0.9.html`. |
| `/student/:id` | Affiche titre, description, consigne, question générale et rendu pédagogique. |
| `/teacher/videos/:assetId` | Fiche de média, non fiche d’activité ; montre sources, versions, usages et classement, mais aucun formulaire de droits. |

Il n’existe pas de route autonome de détail d’activité en lecture seule. Ajouter
une nouvelle page serait possible mais non nécessaire pour une première
insertion visible.

### 2.5 Tests consultés

Le serveur possède 28 fichiers `*.test.js` et 149 tests de premier niveau. Les
tests directement pertinents consultés protègent notamment :

- création et sauvegarde d’un brouillon vide ;
- intégrité des références et des temps ;
- conservation des données historiques et des champs inconnus ;
- duplication indépendante et remappage des identifiants ;
- absence de copie des observations étudiantes ;
- suppression avec sauvegarde ;
- sauvegardes des ateliers ;
- résolution et usages de la Library ;
- lignage, cycles et cohérence de racine côté média.

La suite existante ne protège pas encore une identité pédagogique, une filiation
d’activité ou un calcul de transmissibilité.

## 3. Besoins directement tirés de l’audit 118

Le rapport 118 établit les besoins suivants :

1. **Qualifier le corpus.** Une ressource historique riche, des copies et des
   essais cohabitent sous le même statut `draft`.
2. **Rendre l’intention lisible.** Les questions segmentaires prouvent un travail
   pédagogique, mais l’objectif global reste à reconstruire depuis le README.
3. **Situer l’usage.** Public, niveau, contexte, modalité, durée et prérequis
   manquent au niveau de l’activité.
4. **Distinguer invariant et variable.** Les composants sont techniquement
   éditables sans indication de ce qui fonde l’intérêt didactique.
5. **Conserver la filiation pédagogique.** La Library consolide la filiation
   média, tandis que les duplications d’activités ne gardent pas leur source.
6. **Qualifier les droits.** Les objets `rights` des médias sont vides ; les
   droits de l’activité, de la transcription et des annotations ne sont pas
   représentés.
7. **Réduire la dépendance à David.** Un tiers ne dispose pas d’une fiche courte
   lui permettant de comprendre, utiliser et adapter une activité sans
   explication orale.
8. **Préserver l’honnêteté.** Une présence de champs ne doit pas être confondue
   avec une preuve de qualité, d’efficacité ou d’autorisation juridique.

## 4. Distinction entre métadonnées pédagogiques, documentaires, juridiques et techniques

| Famille | Question traitée | Propriétaire canonique recommandé | Exemples |
|---|---|---|---|
| Pédagogique | Pourquoi, pour qui et comment utiliser ou adapter l’activité ? | Activité, dans `pedagogicalIdentity` et dans les champs généraux existants | objectifs, public, contexte, scénario, cœur, éléments adaptables |
| Documentaire | Comment identifier, situer et relier la ressource ? | Activité pour son identité ; Library pour le média ; Git/rapports pour l’histoire du logiciel | titre, résumé, origine pédagogique, responsable, filiation d’activité, date de qualification |
| Juridique | Peut-on utiliser, transformer et redistribuer chaque composant ? | Library pour la vidéo ; activité pour l’activité, la transcription, les annotations et composants propres | état de connaissance, autorisation, restriction, fondement, attribution |
| Technique | Comment le prototype exécute et conserve l’activité ? | Modèle technique actuel, serveur et Library | ID, version, statut technique `draft`, durée vidéo, codec, playable, disponibilité, segments et références |

Conséquences :

- `video.durationMs` ne doit pas devenir la durée pédagogique ;
- `activity.status = "draft"` ne doit pas être réutilisé comme verdict de
  transmissibilité ;
- la provenance du média ne doit pas être copiée dans la fiche pédagogique ;
- le titre et le résumé existants ne doivent pas être dupliqués dans
  `pedagogicalIdentity` ;
- `instruction` et `pedagogicalQuestion` restent des contenus présentés à
  l’apprenant, non un substitut au scénario enseignant ;
- un média techniquement disponible peut rester juridiquement `unknown`.

## 5. Proposition de modèle canonique

### 5.1 Choix d’appartenance

L’identité pédagogique doit appartenir directement à l’activité sous la forme
d’un objet imbriqué :

```json
{
  "id": "activity-id",
  "title": "Titre pédagogique canonique",
  "description": "Résumé canonique",
  "instruction": "Consigne apprenant",
  "pedagogicalQuestion": "Question générale apprenant",
  "pedagogicalIdentity": {
    "schemaVersion": "0.1",
    "resourceStage": "draft",
    "audience": {
      "state": "unknown"
    },
    "useContext": {
      "state": "unknown"
    },
    "learningObjectives": {
      "state": "unknown"
    },
    "prerequisites": {
      "state": "unknown"
    },
    "indicativeDuration": {
      "state": "unknown"
    },
    "recommendedScenario": {
      "state": "unknown"
    },
    "pedagogicalCore": {
      "state": "unknown"
    },
    "adaptableElements": {
      "state": "unknown"
    },
    "origin": {
      "state": "unknown"
    },
    "lineage": {
      "state": "to-verify"
    },
    "responsibility": {
      "state": "unknown"
    },
    "componentRights": {
      "activity": {
        "state": "unknown"
      },
      "transcription": {
        "state": "unknown"
      },
      "annotations": {
        "state": "unknown"
      },
      "other": []
    },
    "limitations": {
      "state": "unknown"
    },
    "lastQualification": {
      "state": "unknown"
    }
  }
}
```

Ce choix est préférable à un objet associé autonome parce que la fiche :

- décrit exactement une activité ;
- doit être copiée, exportée et versionnée avec elle ;
- n’a pas de cycle de vie indépendant démontré ;
- ne nécessite ni jointure, ni deuxième identifiant, ni deuxième writer ;
- reste compatible avec le JSON et l’écriture atomique actuels.

Un objet séparé ne deviendrait justifié que si une même fiche devait être
partagée par plusieurs traductions ou éditions indépendantes. Ce besoin n’est
pas observé.

### 5.2 États de connaissance communs

Les champs qualifiés utilisent quatre états :

| État | Sens |
|---|---|
| `known` | Une valeur est fournie et assumée comme actuelle. |
| `unknown` | La personne qui qualifie ne connaît pas l’information. |
| `not-applicable` | Le champ ne s’applique pas ; une justification est obligatoire. |
| `to-verify` | Une valeur ou hypothèse existe, mais une vérification identifiée reste nécessaire. |

L’absence du champ n’est pas un cinquième état. Elle signifie :

- activité legacy non encore initialisée ; ou
- objet invalide/incomplet.

Règles communes recommandées :

- `known` exige une valeur conforme ;
- `unknown` ne doit pas porter une valeur présentée comme vraie ;
- `to-verify` peut porter une `proposedValue`, mais exige une `note` indiquant
  ce qui reste à vérifier ;
- `not-applicable` exige une `rationale` non vide ;
- un tableau `known` peut être vide uniquement lorsque « aucun » est une
  information valide, par exemple « aucun prérequis » ;
- un champ non applicable ne compte comme complet que si cet état est autorisé
  pour ce champ.

### 5.3 Deux axes de statut

Le modèle doit séparer :

1. **la nature ou étape déclarée de la ressource**, `resourceStage` :
   `test`, `draft`, `demonstration`, `candidate`, `archived` ;
2. **son état de préparation calculé**, `qualificationState` :
   `incomplete`, `qualified`, `transmissible`.

`transmissible` ne doit pas être une valeur éditable de `resourceStage`.
L’interface peut et doit afficher exactement « Ressource transmissible », mais
uniquement lorsque les règles du chapitre 10 sont satisfaites.

`candidate` désigne une activité retenue pour qualification comme ressource. Il
évite de faire de `demonstration` ou `draft` un synonyme imprécis de
« potentiellement publiable ».

### 5.4 Données persistées et projections calculées

Sont persistés dans l’activité :

- l’identité pédagogique ;
- la filiation d’activité ;
- les droits des composants propres à l’activité ;
- la dernière qualification humaine.

Sont calculés par le serveur et exposés dans la réponse :

- `qualificationState` ;
- `missingOrUnverifiedFields` ;
- `resolvedVideoRights`, depuis la Library ;
- `blockingTransmissionReasons` ;
- la relation inverse vers les variantes, calculée à partir des
  `parentActivityId`.

Ces projections ne doivent pas devenir une deuxième source de vérité.

### 5.5 Droits sans duplication de la Library

`componentRights.activity`, `.transcription`, `.annotations` et `.other` sont
propres à l’activité.

Les droits vidéo restent dans `MediaAsset.rights`. L’activité ne persiste pas
une copie du titulaire, de la licence ou de la preuve vidéo. L’API résout la
vidéo puis expose une projection en lecture :

```json
{
  "resolvedVideoRights": {
    "state": "unknown",
    "source": "media-library",
    "assetId": "media-proto05-video-proto05-uga-37004"
  }
}
```

L’objet `rights` actuel de la Library n’impose qu’un objet générique et les
fiches vidéo ne permettent pas de l’éditer. Une première Mission 120 peut donc
afficher « droits vidéo inconnus » sans prétendre résoudre la qualification
juridique. La mise en place d’un éditeur de droits média doit rester une mission
séparée, sauf extension explicite du périmètre.

Un enregistrement de droit propre à l’activité suit cette forme minimale :

```json
{
  "state": "known",
  "reuse": "permitted",
  "transformation": "restricted",
  "redistribution": "prohibited",
  "basis": "Autorisation écrite référencée dans le dossier du projet",
  "attribution": "Texte d’attribution à afficher",
  "note": "Restriction de diffusion hors UGA"
}
```

Les valeurs contrôlées `permitted`, `restricted`, `prohibited` décrivent une
conclusion opérationnelle. Elles ne remplacent pas un avis juridique. Lorsque
`state = known`, `basis` est obligatoire. Une URL ou un chemin contenant une
preuve privée ne doit pas être exposé à l’étudiant ni exporté par défaut.

## 6. Tableau détaillé des champs

Dans la colonne « obligation », « structure obligatoire » signifie que le
conteneur doit exister dans une fiche nouvellement initialisée, mais que son état
peut honnêtement rester `unknown` ou `to-verify`. Les activités legacy restent
lisibles sans fiche pendant la transition.

| Nom proposé | Finalité | Type | Obligation | Valeurs possibles | Gestion de l’inconnu | Source actuelle éventuelle | Validation |
|---|---|---|---|---|---|---|---|
| `activity.title` | Titre pédagogique affiché | string | Requis pour `qualified` | texte libre | chaîne vide tolérée pour ancien brouillon, mais état incomplet | `title` existant | chaîne, 5 000 caractères maximum pour compatibilité, non vide après trim pour qualification |
| `activity.description` | Résumé court | string | Requis pour `qualified` | texte libre | chaîne vide = incomplet, pas `unknown` implicite dans une nouvelle fiche | `description` existant | chaîne, 5 000 caractères maximum, non vide pour qualification |
| `activity.instruction` | Consigne apprenant | string | Facultatif au niveau du modèle ; exigible selon le scénario | texte libre | vide autorisé ; le scénario doit expliquer l’absence si nécessaire | champ existant | chaîne, 5 000 caractères maximum |
| `activity.pedagogicalQuestion` | Question générale visible à l’apprenant | string | Facultatif | texte libre | vide autorisé | champ existant ; questions segmentaires séparées | chaîne, 5 000 caractères maximum |
| `pedagogicalIdentity` | Conteneur canonique | object | Facultatif en lecture legacy ; initialisé pour toute nouvelle activité | objet versionné | absence = legacy/incomplet | absent | objet uniquement ; champs inconnus préservés ou écriture refusée |
| `.schemaVersion` | Évolution indépendante du sous-schéma | string | Structure obligatoire | `0.1` initialement | aucune valeur inconnue | absent | version majeure inconnue refusée ; mineure future lue sans écriture destructrice |
| `.resourceStage` | Nature/étape déclarée | enum | Structure obligatoire | `test`, `draft`, `demonstration`, `candidate`, `archived` | pas d’inconnu ; défaut à `draft` uniquement lors d’une création neuve | `status = draft` donne un indice, sans équivalence automatique | enum stricte ; duplication force `draft` |
| `.audience` | Public, rôle et niveau visés | qualified list/text | Requis pour `qualified` | `state` + `items` structurés ou description | quatre états communs ; `not-applicable` interdit | README global évoque enseignant, chercheur, apprenant | `known` exige au moins un public ; niveaux facultatifs, texte non vide |
| `.useContext` | Cadre, modalité et situation d’usage | qualified text | Requis pour `qualified` | `state`, `value`, `note` | quatre états communs | README évoque entretien, recherche, mémoire, mais pas une activité précise | `known` exige texte non vide ; `not-applicable` interdit |
| `.learningObjectives` | Résultats attendus d’apprentissage ou d’observation | qualified list | Requis pour `qualified` | liste de formulations courtes | quatre états communs | hypothèses README et questions segmentaires | `known` exige au moins un objectif ; `not-applicable` interdit |
| `.prerequisites` | Savoirs, matériel ou préparation attendus | qualified list | Requis pour `qualified` | liste, possiblement vide | `known + items: []` signifie « aucun » ; autres états communs | absent | doublons supprimés ; `not-applicable` autorisé avec justification |
| `.indicativeDuration` | Durée de l’activité, distincte de la vidéo | qualified duration | Requis pour `qualified` | `minutes`, `note` | quatre états communs | aucune ; `video.durationMs` ne doit pas être recopié | `minutes` entier positif si `known`; `not-applicable` seulement avec justification |
| `.recommendedScenario` | Déroulé enseignant avant/pendant/après | qualified text | Requis pour `qualified` | texte libre structuré visuellement | quatre états communs | consigne et questions constituent des fragments, pas un scénario | `known` exige texte non vide ; pas de validation didactique automatique |
| `.pedagogicalCore` | Éléments à préserver lors d’une adaptation | qualified list | Requis pour `qualified` | liste de principes ou composants | quatre états communs ; `not-applicable` interdit | couches, phénomènes et questions donnent des indices | `known` exige au moins un élément |
| `.adaptableElements` | Éléments modifiables et précautions | qualified list | Requis pour `qualified` | liste avec éventuellement une précaution par item | quatre états communs ; `not-applicable` possible seulement si justifié | champs éditables actuels, sans qualification | `known` exige au moins un item ou une affirmation explicite « aucun » justifiée |
| `.origin` | Genèse pédagogique, distincte de la provenance vidéo | qualified object | Requis pour `qualified` | `kind`: `original-design`, `adapted-external`, `imported`, plus note/référence | quatre états communs | README, PDF et Git donnent des indices partiels | `known` exige `kind` et note ; ne pas stocker de secret ou chemin privé |
| `.lineage` | Relation à une activité Proto05 source | qualified relation | Structure obligatoire ; connue pour nouvelles créations/duplications | `root` ou `variant` quand connu | `unknown` ou `to-verify` pour legacy ; `not-applicable` interdit | IDs `proto05-copy-*` suggèrent des copies sans prouver le parent | invariants du chapitre 7 |
| `.responsibility` | Responsable de la qualification pédagogique | qualified object | Requis pour `qualified` | nom affiché, rôle, contact fonctionnel facultatif | quatre états communs ; `not-applicable` interdit | absent | nom et rôle non vides si `known`; éviter donnée personnelle inutile |
| `.componentRights.activity` | Droits du scénario et des textes généraux | rights record | Structure obligatoire ; conclusion requise pour `transmissible` | états communs + `reuse`, `transformation`, `redistribution` | quatre états communs | absent | `known` exige `basis` et trois conclusions opérationnelles |
| `.componentRights.transcription` | Droits de la transcription | rights record | Même règle | même vocabulaire | quatre états communs | absent | même règle ; N/A possible seulement si aucune transcription |
| `.componentRights.annotations` | Droits des annotations, questions et couches | rights record | Même règle | même vocabulaire | quatre états communs | absent | même règle ; N/A seulement si aucun composant concerné |
| `.componentRights.other[]` | Autres composants juridiquement distincts | array de records | Facultatif | clé locale, label, rights record | quatre états communs | absent | clés uniques, labels non vides |
| projection `resolvedVideoRights` | Droits vidéo depuis la Library | objet calculé | Requis dans la réponse enrichie | état, assetId, source | vide `{}` de la Library devient `unknown` | `MediaAsset.rights` | jamais écrit dans l’activité ; conflit impossible par construction |
| `.limitations` | Limites, dépendances et précautions importantes | qualified list/text | Requis pour `qualified` | liste ou texte libre | `known + items: []` signifie « aucune limite identifiée » ; autres états communs | limites globales dans README/rapports | une limite marquée bloquante empêche `transmissible` |
| `.lastQualification` | Dernière revue humaine | qualification record | Requis pour `qualified` | `never`, `recorded`, `unknown`, `to-verify` ; date, nature, responsable, note | `unknown` pour legacy ; `never` pour nouveau brouillon | absent | `recorded` exige date ISO, nature contrôlée et responsable |
| projection `qualificationState` | État de préparation | enum calculée | Toujours calculée | `incomplete`, `qualified`, `transmissible` | aucune saisie | absent | calcul déterministe du chapitre 10 |
| projection `missingOrUnverifiedFields` | Explication de l’état | string[] calculée | Toujours calculée | chemins de champs | inclut absents, inconnus et à vérifier | absent | ordre stable, aucun texte juridique improvisé |

Vocabulaire de `lastQualification.nature` :

```text
initial-pedagogical-review
pedagogical-revision
variant-review
rights-review
combined-review
```

Ce vocabulaire peut rester court. Un historique complet des revues n’est pas
nécessaire dans le premier schéma.

## 7. Proposition de filiation entre activités

### 7.1 Forme recommandée

Activité racine connue :

```json
{
  "state": "known",
  "relation": "root",
  "parentActivityId": null,
  "rootActivityId": "activity-root"
}
```

Variante connue :

```json
{
  "state": "known",
  "relation": "variant",
  "parentActivityId": "activity-parent",
  "rootActivityId": "activity-root",
  "adaptationSummary": "Questions reformulées et extrait raccourci."
}
```

Legacy ambigu :

```json
{
  "state": "to-verify",
  "note": "Identifiant de copie détecté, mais activité parente non prouvée."
}
```

### 7.2 Invariants

- une racine référence son propre ID comme `rootActivityId` ;
- une racine a `parentActivityId = null` ;
- une variante possède un parent direct existant et différent d’elle-même ;
- une variante possède une racine existante ;
- le parent appartient à la même racine ;
- aucune chaîne de parents ne contient de cycle ;
- la relation inverse « variantes » est calculée, jamais persistée en double ;
- une suppression d’activité source doit être refusée tant qu’une variante la
  référence, ou passer par une décision explicite de détachement ;
- une duplication conserve le parent direct et la racine, mais remet
  `resourceStage` à `draft` et la dernière qualification à
  `to-verify`/`variant-review` ;
- une copie ne reçoit jamais automatiquement l’état `transmissible`.

### 7.3 Cas d’un parent legacy

Si le parent n’a pas de filiation connue, la duplication peut prouver la
relation directe :

```text
parentActivityId = activité dupliquée
rootActivityId = absent
state = to-verify
```

Le serveur ne doit pas inventer que le parent est la racine. La relation devient
`known` après qualification explicite de la chaîne.

### 7.4 Distinction avec le média

Une activité peut être une variante pédagogique tout en utilisant le même média
que sa source. Inversement, elle peut rester pédagogiquement la même activité
avec une nouvelle représentation ou dérivation vidéo. Les graphes ne doivent
donc pas être fusionnés :

```text
activité source ──> variante pédagogique
      │                     │
      └── videoRef A        └── videoRef A ou B

MediaAsset A ──> MediaAsset B
```

## 8. Stratégie de compatibilité et migration progressive

### Étape 0 — lecture tolérante, aucune écriture automatique

- Une activité sans `pedagogicalIdentity` reste lisible et éditable.
- L’API projette `qualificationState = incomplete`.
- L’interface indique « Fiche pédagogique à compléter ».
- Aucune valeur n’est ajoutée au JSON au seul motif qu’une activité a été lue.

### Étape 1 — nouveaux brouillons

- La création initialise une fiche structurelle avec `resourceStage = draft`.
- Les champs non renseignés reçoivent explicitement `unknown`.
- Une activité créée de zéro reçoit une filiation racine `known`.
- La création depuis une duplication suit les règles de variante du chapitre 7.

### Étape 2 — édition explicite

- `/teacher/edit/:id` permet d’initialiser ou modifier la fiche.
- Une sauvegarde de l’atelier ne doit ni retirer ni recalculer silencieusement la
  fiche.
- Les quatre champs existants restent à leur emplacement canonique.
- Les données partielles peuvent être sauvegardées ; seule la qualification est
  bloquée.

### Étape 3 — qualification des sept activités

- Activité par activité, David ou un responsable répond au questionnaire du
  chapitre 13.
- Les essais peuvent être marqués `test` sans obligation de produire une fiche
  complète.
- Les copies aux parents incertains restent `to-verify`.
- Aucun script ne déduit public, droits, responsable ou scénario depuis le
  titre, les annotations ou l’ID.

### Étape 4 — durcissement éventuel

Lorsque les sept activités ont été explicitement examinées :

- le sous-objet peut devenir structurellement obligatoire pour toute écriture ;
- un export peut embarquer la fiche et une projection datée des droits média ;
- le fallback de compatibilité reste une décision séparée.

### Versionnement

Le sous-schéma possède sa version propre `0.1`. La mission documentaire ne
modifie aucune version. La future implémentation devra incrémenter le plus petit
niveau conforme à la convention du serveur, sans passer automatiquement le
prototype de `0.1` à `0.2`. Le `schemaVersion` global de `activities.json` ne
doit pas être changé sans décision explicite si la lecture d’un champ optionnel
reste compatible.

### Écriture et retour arrière

Toute future migration canonique doit :

- opérer sur une copie ou une fixture d’abord ;
- conserver le writer atomique et la sauvegarde `.bak` ;
- être idempotente ;
- produire les mêmes états inconnus à chaque exécution ;
- ne jamais remplir une valeur métier par inférence ;
- documenter la restauration ;
- préserver les champs inconnus.

## 9. Insertion minimale dans l’interface

### 9.1 Bibliothèque enseignante

Sur chaque carte :

- titre ;
- résumé sur une ou deux lignes ;
- badge `Test`, `Brouillon`, `Démonstration`, `À qualifier` ou `Archivée` ;
- badge calculé `Fiche incomplète`, `Qualifiée` ou `Transmissible` ;
- public et durée uniquement s’ils sont `known` ;
- avertissement compact si un droit est `unknown`, `to-verify`, `restricted` ou
  `prohibited` ;
- lien « Voir/compléter la fiche » ;
- indication `Originale` ou `Variante de …` si la filiation est connue.

La première Mission 120 n’a pas besoin d’ajouter recherche, filtres ou tri
pédagogiques. Les métadonnées les rendent possibles ultérieurement, mais une
carte lisible produit déjà un gain visible.

### 9.2 Page de détail d’activité

Il n’existe pas de page de détail dédiée. Pour éviter une nouvelle route et une
nouvelle source d’interface, `/teacher/edit/:id` doit devenir la fiche de détail
et d’édition.

Organisation recommandée :

1. identité courte : titre, résumé, étape et état calculé ;
2. « Pour utiliser l’activité » : public, contexte, objectifs, prérequis, durée,
   scénario ;
3. « Pour l’adapter » : cœur à préserver, éléments adaptables, limites ;
4. « Origine et responsabilité » : origine, filiation, responsable, dernière
   qualification ;
5. « Droits » : activité, transcription, annotations, autres composants et
   droits vidéo résolus avec lien vers la fiche média.

Les champs avancés peuvent être dans des sections repliables. Le résumé des
blocages reste visible en tête.

### 9.3 Atelier guidé

L’atelier guidé doit afficher un panneau compact enseignant :

- étape et état de qualification ;
- objectif principal ;
- cœur pédagogique ;
- éléments adaptables ;
- droits ou limites bloquants ;
- lien « Compléter la fiche pédagogique ».

La fiche complète ne doit pas être éditée dans l’atelier. L’atelier reste centré
sur les composants temporels. Le titre, la description, la consigne et la
question existants peuvent continuer à être modifiés dans leurs surfaces
actuelles.

### 9.4 Prévisualisation enseignante

Le moteur est partagé avec la vue étudiante. La route
`/teacher/preview/:activityId` peut néanmoins activer un bandeau enseignant
extérieur au contenu pédagogique :

- « Prévisualisation — fiche incomplète/qualifiée/transmissible » ;
- liste courte des blocages ;
- lien vers la fiche ;
- rappel des marges d’adaptation.

Ce bandeau doit être absent de `/student/:activityId`.

### 9.5 Vue étudiante

Informations utiles :

- titre et résumé ;
- consigne ;
- question générale ;
- contenu synchronisé et questions segmentaires ;
- attribution ou licence uniquement si leur affichage est requis.

Informations inutiles ou inappropriées par défaut :

- badge « fiche incomplète » ;
- incertitudes juridiques internes ;
- responsable de qualification ;
- origine de la variante ;
- liste des éléments adaptables ;
- notes de preuve ou chemins documentaires.

### 9.6 Signalement sans blocage abusif

- une fiche incomplète n’empêche ni la création, ni la sauvegarde, ni la
  prévisualisation locale ;
- le badge indique le nombre de rubriques absentes ou à vérifier ;
- l’interface propose une action unique « Compléter la fiche » ;
- seuls la qualification et l’affichage `transmissible` sont bloqués ;
- les messages distinguent « inconnu », « à vérifier » et « non applicable » ;
- aucun pourcentage de complétude n’est nécessaire : il donnerait une fausse
  précision et encouragerait le remplissage mécanique.

## 10. États incomplet, qualifié et transmissible

### 10.1 `incomplete`

État calculé lorsque l’une de ces conditions est vraie :

- fiche absente ou sous-schéma invalide ;
- titre ou résumé vide ;
- étape `test` ou `draft` ;
- public, contexte, objectifs, durée, scénario, cœur ou éléments adaptables
  absents, `unknown` ou `to-verify` ;
- origine, responsabilité ou limites non qualifiées ;
- filiation incohérente ou à vérifier ;
- aucune revue pédagogique enregistrée.

Une activité `test` peut avoir une fiche complète, mais reste `incomplete` au
sens de la transmission tant qu’elle n’est pas promue comme candidate.

### 10.2 `qualified`

État calculé lorsque :

- la fiche est structurellement valide ;
- `resourceStage` vaut `demonstration` ou `candidate` ;
- le minimum pédagogique est `known` ou valablement `not-applicable` ;
- la filiation est cohérente ;
- la dernière qualification est `recorded` ;
- les limites connues ne signalent pas d’impossibilité pédagogique.

Les droits peuvent encore être inconnus, à vérifier ou restrictifs. `qualified`
signifie « pédagogiquement décrite et revue », pas « librement transmissible ».

### 10.3 `transmissible`

État calculé uniquement si l’activité est `qualified` et si :

- les droits vidéo résolus depuis la Library sont `known` ;
- les droits de l’activité, de la transcription, des annotations et des autres
  composants applicables sont `known` ;
- l’usage, la transformation et la redistribution nécessaires au scénario de
  circulation sont `permitted`, ou les restrictions sont compatibles avec le
  contexte déclaré ;
- le média référencé est résoluble et disponible ;
- aucune limite n’est marquée bloquante ;
- l’activité n’est pas archivée ;
- la dernière qualification inclut une revue de droits ou une revue combinée.

Une restriction compatible peut permettre une transmissibilité **située**, par
exemple « transmissible au sein de l’UGA ». L’interface doit alors afficher le
périmètre, non un badge vert générique. En l’absence de contexte de circulation,
une restriction maintient l’état `qualified`.

Ce calcul ne prouve ni la qualité pédagogique, ni la légalité. Il prouve
seulement que les informations et décisions requises ont été enregistrées de
manière cohérente.

## 11. Invariants et tests à prévoir

### 11.1 Contrat et états

- accepter une activité legacy sans fiche en lecture ;
- projeter `incomplete` sans écrire dans le JSON ;
- initialiser une nouvelle activité avec des états `unknown`, sans valeurs
  inventées ;
- refuser un état inconnu ;
- exiger une valeur pour `known` ;
- exiger une justification pour `not-applicable` ;
- exiger une note pour `to-verify` ;
- préserver les champs futurs d’une version mineure ;
- refuser une version majeure inconnue à l’écriture.

### 11.2 Qualification

- produire des raisons de blocage stables et précises ;
- ne jamais produire `transmissible` avec un droit `unknown` ou `to-verify` ;
- ne jamais produire `transmissible` avec un droit `prohibited` ;
- accepter `qualified` avec droits inconnus ;
- ne pas confondre durée vidéo et durée pédagogique ;
- ne pas considérer la présence d’un texte comme validation humaine ;
- faire repasser une variante modifiée en révision.

### 11.3 Filiation

- accepter racine et chaîne multi-génération cohérentes ;
- refuser auto-parent, parent absent, racine absente, cycle direct et cycle
  indirect ;
- calculer les descendants sans relation inverse persistée ;
- refuser ou protéger la suppression d’un parent référencé ;
- dupliquer en enregistrant le parent direct ;
- conserver la racine si elle est connue ;
- ne pas inventer une racine si la source legacy est à vérifier.

### 11.4 Compatibilité des écritures

- la sauvegarde de métadonnées préserve la fiche ;
- la sauvegarde avancée et guidée préserve la fiche même si le payload ne la
  contient pas ;
- la duplication copie les contenus utiles, régénère les IDs, établit la
  filiation et invalide la qualification ;
- les observations étudiantes restent exclues de la copie ;
- le JSON canonique n’est jamais touché par les tests ;
- les écritures temporaires conservent sauvegarde et atomicité.

### 11.5 Interfaces

- cartes : badges, résumé et avertissements sont échappés ;
- fiche : les quatre états sont distinguables par texte, pas seulement couleur ;
- atelier : panneau visible sans masquer la timeline à une largeur
  représentative ;
- preview : bandeau enseignant présent ;
- étudiant : bandeau enseignant et notes internes absents ;
- navigation clavier et focus visibles ;
- une erreur API ne supprime pas les valeurs saisies.

### 11.6 Droits et Library

- la projection vidéo vient de `MediaAsset.rights` ;
- aucune copie des droits vidéo n’est persistée dans l’activité ;
- `rights: {}` devient `unknown`, jamais `permitted` ;
- une vidéo sans `videoRef` persisté reste `incomplete` ou `to-verify` même si un
  fallback technique permet la lecture ;
- un export futur date sa projection de droits sans la déclarer source
  canonique.

## 12. Analyse particulière de l’activité historique

Activité inspectée :
`proto05-augmented-video-01`, version `0.1.2`, statut `draft`.

### 12.1 Preuves techniques et pédagogiques présentes

- titre : « Vidéo augmentée d’intercompréhension » ;
- résumé : lecture synchronisée de moments plurilingues avec annotations
  pédagogiques IC ;
- vidéo UGA déclarée, durée technique `939217 ms`, soit environ 15 min 39 s ;
- onze segments, de 00:02 à 05:02 pour l’échantillon annoté ;
- cinq locuteurs ;
- quatre langues : français, espagnol, italien, portugais ;
- vingt-deux intervalles linguistiques ;
- vingt-six occurrences de phénomènes ;
- sept couches : présentation, changement de langue, compréhension collective,
  clarification, négociation du sens, mot-piège, répertoire plurilingue ;
- onze annotations et onze questions pédagogiques segmentaires ;
- six overlays ;
- toutes les couches sont actuellement visibles par l’enseignant et
  l’apprenant, avec bascule apprenant autorisée ;
- le README formule l’hypothèse générale qu’une transcription synchronisée et
  annotée aide à repérer et discuter des phénomènes fugaces
  d’intercompréhension ;
- le README précise que les onze segments forment un échantillon V0 issu de
  `video-1.pdf`, encore à vérifier contre la vidéo.

L’activité n’a pas de `videoRef` persisté. L’asset UGA correspondant existe dans
la Library, mais son objet `rights` est vide.

### 12.2 Tableau de qualification des informations

| Catégorie | Informations |
|---|---|
| Présentes et prouvées | ID, version `0.1.2`, statut `draft`, titre, résumé, vidéo et durée technique, langues, volumes, segments, couches, phénomènes, annotations, questions segmentaires, visibilité des couches, hypothèse générale du README, caractère V0 et vérification transcription/vidéo encore nécessaire. |
| Déductibles mais à valider par David | Activité destinée à observer et discuter des stratégies d’intercompréhension ; publics possibles enseignant, chercheur ou apprenant ; usages possibles en entretien, séance de recherche ou travail de mémoire ; cœur probable fondé sur la synchronisation vidéo/transcription, la pluralité des langues, les phénomènes et la négociation du sens ; couches, questions, extraits et visibilité probablement adaptables. Ces éléments viennent de documents globaux et ne sont pas encore des décisions propres à l’activité. |
| Inconnues | Public exact et niveau, contexte principal, modalité individuelle/collective, objectifs évaluables, prérequis, durée pédagogique, déroulé conseillé, interventions de l’enseignant, liste validée du cœur, marges d’adaptation autorisées, origine pédagogique précise, responsable, parent ou variantes, dernière qualification, droits vidéo, activité, transcription et annotations, restrictions de diffusion, limites liées à la captation. |
| À demander explicitement à David | Les dix réponses du chapitre 13, notamment intention, public, scénario, cœur, adaptations, origine, responsabilité et droits. |
| Probablement non pertinentes dans la fiche | Version Node, port `8791`, codec, hash, chemin absolu du média, détails du proxy HLS, historique complet des commits, IDs techniques des segments, traces ou observations personnelles d’apprenants. Ces informations restent utiles ailleurs mais ne doivent pas alourdir l’identité pédagogique. |

### 12.3 Ce qui ne peut pas être déduit

Le fait que des annotations existent ne prouve pas :

- le public auquel elles conviennent ;
- la durée nécessaire pour les exploiter ;
- le degré d’étayage requis ;
- que toutes les couches doivent être conservées ;
- que la transcription et les timestamps sont exacts ;
- que les personnes filmées ont autorisé la transformation ou la
  redistribution ;
- que les copies actuelles dérivent directement de cette activité ;
- qu’un enseignant tiers comprendrait l’intention sans David.

## 13. Questionnaire court destiné à David

Répondre en une à cinq phrases par question suffit.

1. **Intention et objectifs.** À la fin de l’activité, que doit avoir appris,
   repéré ou été capable de discuter l’apprenant ? Donne au maximum trois
   objectifs.
2. **Public.** Quel est le public principal : rôle, niveau d’étude ou
   d’expérience, et compétences linguistiques minimales ? Y a-t-il un public
   secondaire ?
3. **Contexte.** Dans quelle situation souhaites-tu réellement transmettre
   cette activité : cours, formation d’enseignants, entretien, recherche,
   travail autonome ou autre ? Individuellement ou en groupe ?
4. **Durée et prérequis.** Combien de minutes prévoir pour l’activité complète,
   et quels prérequis sont nécessaires ? Répondre explicitement « aucun » si
   c’est le cas.
5. **Déroulé conseillé.** Quelles sont les étapes avant, pendant et après la
   vidéo, et quels gestes de l’enseignant ne sont pas visibles dans l’interface ?
6. **Cœur à préserver.** Quels sont les deux à cinq éléments dont la disparition
   ferait perdre l’intérêt pédagogique de l’activité ?
7. **Adaptations.** Que peut modifier un enseignant tiers — extrait, langues,
   couches, questions, consigne, visibilité, rythme — et avec quelles
   précautions ?
8. **Origine et filiation.** Qui a conçu cette activité, à partir de quel
   matériau ou scénario, et quelles activités actuelles sont ses variantes
   directes ? Si tu ne sais plus, indique « à vérifier ».
9. **Responsabilité et qualification.** Qui assume aujourd’hui la qualification
   pédagogique, et à quelle date/nature peut-on enregistrer la dernière revue ?
10. **Droits par composant.** Pour la vidéo, l’activité, la transcription et les
    annotations : usage, modification et redistribution sont-ils permis,
    restreints, interdits ou à vérifier ? Quelle preuve ou autorisation permet
    de l’affirmer, et dans quel périmètre de diffusion ?

## 14. Gains attendus selon la grille critique

### 14.1 Gains directement produits par le modèle

| Dimension de la grille | Critères susceptibles de progresser | Gain réel du modèle |
|---|---|---|
| Socle pédagogique | Intention, public et contexte, cœur, scénarisation, composants et relations, marges, honnêteté du statut | Emplacement canonique, états explicites, séparation invariant/variable, statut non ambigu |
| Retrouvabilité | Identification, description pédagogique, contexte et provenance | Titre/résumé consolidés, public/objectif/durée structurés, origine et filiation |
| Adaptabilité | Stabilité et transformabilité, modularité, droits de transformation, variantes et filiation | Cœur et adaptations reliés à une activité stable ; parent/racine conservés ; droits par composant |
| Documentation | Minimum pédagogique, dépendances et limites, progressivité, proportionnalité | Une fiche courte co-localisée avec la ressource, sans deuxième document à synchroniser |
| Animation | Orientation, non-dépendance aux personnes | Responsable et scénario rendent une partie des gestes et du relais visibles |
| Pérennité | Conservation utile, séparation contenu–outil, cycle de vie | Métadonnées structurées conservables avec l’activité ; étape et qualification explicites |
| Responsabilités | Responsables actuels, gouvernance, transmission | Responsable pédagogique et date/nature de revue identifiables |

Le modèle ne fait progresser que l’**observabilité** de ces critères. Un champ
vide ou mal formulé ne consolide pas le critère.

### 14.2 Gains produits par l’interface

- distinction immédiate entre essais, brouillons, démonstrations et candidats ;
- visibilité des fiches incomplètes sans fouiller le JSON ;
- accès direct au public, à la durée, au cœur et aux adaptations ;
- avertissement avant de confondre duplication technique et variante
  transmissible ;
- droits incertains visibles dans le parcours enseignant ;
- prévisualisation contextualisée sans polluer la vue étudiante ;
- diminution probable du temps de diagnostic initial d’un tiers.

L’interface ne garantit ni la justesse des données, ni leur compréhension.

### 14.3 Gains nécessitant que David renseigne les données

- intention réellement propre à chaque activité ;
- public, contexte, prérequis et durée ;
- scénario et gestes d’accompagnement ;
- cœur pédagogique et marges d’adaptation ;
- origine et filiation des copies existantes ;
- responsable et dernière qualification ;
- droits et périmètre de circulation.

Sans ce travail, Mission 120 produira surtout des badges `incomplete` et
`unknown`, ce qui reste honnête mais ne suffit pas à la transmission.

### 14.4 Gains nécessitant un enseignant tiers

Seul un test du miroir peut vérifier qu’un tiers sait :

- retrouver l’activité à partir d’une intention ;
- expliquer son objectif et son cœur sans David ;
- préparer un usage réaliste ;
- créer une variante en préservant l’essentiel ;
- comprendre les restrictions de droits ;
- estimer que le travail évité dépasse le travail documentaire ajouté.

Ces résultats correspondraient au niveau « testé par un utilisateur cible » de
la grille, pas à une validation automatique.

### 14.5 Problèmes non résolus

La transformation ne résout pas :

- l’obtention des autorisations ou licences ;
- la vérification juridique ;
- l’exactitude de la transcription et des timestamps ;
- l’efficacité pédagogique en situation réelle ;
- l’absence d’authentification et d’autorisations serveur ;
- la dépendance HLS/IC-Hub et les médias externes ;
- l’export complet et autonome ;
- la restauration sur machine vierge ;
- les contradictions des documents d’entrée ;
- la conservation des binaires et sauvegardes locales ;
- la gouvernance institutionnelle ou la charge de maintenance.

## 15. Limites et risques de sur-conception

### Risques

1. **Formulaire inventaire.** Trop de champs encourageraient des réponses
   mécaniques sans intelligence pédagogique.
2. **Fausse preuve.** Un badge vert pourrait être interprété comme validation
   juridique ou pédagogique.
3. **Double saisie.** Dupliquer titre, résumé, vidéo ou provenance média créerait
   des contradictions.
4. **Institutionnalisation prématurée.** Workflows d’approbation, rôles,
   signatures et historique complet ne correspondent pas au prototype actuel.
5. **Migration fictive.** Déduire les valeurs des README, IDs ou annotations
   transformerait des hypothèses en faits.
6. **Édition dispersée.** Permettre la fiche complète dans chaque atelier
   multiplierait les implémentations et les risques de perte.
7. **Statut absolu.** « Transmissible » sans périmètre peut masquer une
   restriction locale.
8. **Surcharge du JSON.** Conserver les projections et relations inverses
   créerait plusieurs sources de vérité.
9. **Droits média hors périmètre.** Étendre Mission 120 à toute la gouvernance de
   la Library ferait exploser l’effort.

### Garde-fous

- sous-objet unique et court ;
- vocabulaire contrôlé seulement pour les états et relations ;
- textes libres pour la pédagogie ;
- aucune note ou score de qualité ;
- aucune publication automatique ;
- aucune fiche séparée ;
- aucune relation inverse persistée ;
- aucun historique complet avant besoin observé ;
- aucun champ de droit vidéo dupliqué ;
- validation humaine affichée comme telle ;
- test du miroir avant toute affirmation de réussite.

## 16. Périmètre recommandé pour une future Mission 120 d’implémentation

### Inclus

1. Formaliser le sous-schéma `pedagogicalIdentity` et ses validateurs dans le
   serveur.
2. Lire les activités legacy sans mutation et calculer les raisons
   d’incomplétude.
3. Initialiser la fiche pour les nouveaux brouillons.
4. Étendre la sauvegarde de métadonnées à la fiche.
5. Préserver la fiche dans les sauvegardes avancée et guidée.
6. Adapter la duplication : parent direct, racine connue, qualification remise
   en révision.
7. Calculer `incomplete`, `qualified`, `transmissible`, sans permettre la saisie
   directe de ce dernier.
8. Résoudre les droits vidéo en lecture depuis la Library ; `{}` reste
   `unknown`.
9. Enrichir les cartes de la bibliothèque.
10. Transformer `/teacher/edit/:id` en fiche de détail/édition proportionnée.
11. Ajouter un rappel compact dans l’atelier guidé et un bandeau dans la
    prévisualisation enseignante.
12. Garder la vue étudiante inchangée hors attribution obligatoire déjà connue.
13. Ajouter les tests de contrat, filiation, qualification, compatibilité et
    séparation enseignant/étudiant.
14. Tester uniquement sur fixtures et copies temporaires.

### Exclus

- remplissage automatique ou en masse des sept activités ;
- modification manuelle de `data/activities.json` sans réponses de David ;
- éditeur des droits média dans la fiche vidéo ;
- migration générale de `videoRef` ;
- recherche, filtres et tri pédagogiques ;
- nouvelle page ou route de détail ;
- historique complet des qualifications ;
- workflow d’approbation, comptes, rôles ou permissions ;
- export/zip/manifest complet ;
- modification de l’architecture de stockage ;
- refonte de l’atelier auteur ou de la vue étudiante ;
- correction des autres dettes de l’audit 118.

### Séquence recommandée

1. contrat et tests unitaires ;
2. projections de lecture legacy ;
3. création et duplication sur fixture ;
4. fiche `/teacher/edit` ;
5. cartes, atelier guidé et preview ;
6. validation visuelle Chromium ;
7. questionnaire rempli par David pour l’activité historique ;
8. mission séparée de qualification des droits média ;
9. test du miroir avec un enseignant tiers.

Mission 120 peut être réalisée avant les réponses de David, mais son résultat
restera volontairement `incomplete` pour les activités existantes. Aucune
activité ne pourra être `transmissible` tant que les droits vidéo de la Library
resteront vides.

## 17. Liste exacte des fichiers probablement concernés par l’implémentation

### Fichiers à modifier dans le périmètre minimal

1. `prototypes/05-augmented-ic-video-01/server/server.js`
2. `prototypes/05-augmented-ic-video-01/teacher.html`
3. `prototypes/05-augmented-ic-video-01/teacher-create.html`
4. `prototypes/05-augmented-ic-video-01/teacher-edit.html`
5. `prototypes/05-augmented-ic-video-01/teacher-guided.html`
6. `prototypes/05-augmented-ic-video-01/index-0.0.9.html`
7. `prototypes/05-augmented-ic-video-01/server/test/activity-duplication.test.js`
8. `prototypes/05-augmented-ic-video-01/server/test/empty-draft-validation.test.js`
9. `prototypes/05-augmented-ic-video-01/server/test/data-regression.test.js`
10. `prototypes/05-augmented-ic-video-01/server/test/teacher-save.test.js`
11. `prototypes/05-augmented-ic-video-01/server/test/pedagogical-identity.test.js`
    — nouveau fichier recommandé
12. `prototypes/05-augmented-ic-video-01/server/README.md`
13. `prototypes/05-augmented-ic-video-01/README.md`
14. `reports/120_proto05_pedagogical_identity_implementation.md`

### Fichier canonique à ne modifier que lors d’une qualification autorisée

15. `prototypes/05-augmented-ic-video-01/data/activities.json`

Le cœur de Mission 120 n’exige pas de modifier ce fichier : les activités legacy
peuvent être projetées comme incomplètes. S’il est décidé d’initialiser ou de
qualifier les sept activités, l’écriture doit faire l’objet d’une sauvegarde,
d’une recette sur copie et d’une validation explicite des valeurs.

### Fichiers probablement non nécessaires au périmètre minimal

- `prototypes/05-augmented-ic-video-01/teacher-author.html` : le serveur préserve
  déjà les propriétés non envoyées ; un test doit le confirmer. À modifier
  seulement si un rappel pédagogique est également demandé dans l’atelier
  avancé.
- `prototypes/05-augmented-ic-video-01/teacher-video-detail.html` : à réserver à
  une mission distincte d’édition des droits média.
- `prototypes/05-augmented-ic-video-01/data/video-library.json` : aucune valeur de
  droit ne doit être inventée.
- `prototypes/05-augmented-ic-video-01/server/media-library-schema.js` : l’objet
  `rights` existe déjà ; son contrat juridique détaillé mérite une mission
  dédiée.
- `prototypes/05-augmented-ic-video-01/MEDIA_LIBRARY_MODEL.md` : à mettre à jour
  dans cette mission dédiée, pas pour décrire prématurément un contrat non
  implémenté.

Cette liste reste « probable » parce que les fichiers exacts ne peuvent être
figés qu’après arbitrage du périmètre de Mission 120 et inspection de l’état Git
à son démarrage.

## 18. Conclusion et recommandation go/no-go

### Recommandation

**GO pour une Mission 120 minimale**, après validation par David des décisions
suivantes :

- le nom `pedagogicalIdentity` ;
- les deux axes `resourceStage` et `qualificationState` ;
- la règle selon laquelle `transmissible` est calculé ;
- l’utilisation de `/teacher/edit/:id` comme fiche de détail ;
- la non-migration automatique des sept activités ;
- le report de l’éditeur de droits média à une mission distincte.

### Conditions d’arrêt pour la future implémentation

Mission 120 devra s’arrêter avant écriture canonique si :

- David souhaite déclarer des droits sans preuve disponible ;
- la filiation des copies doit être inventée ;
- une migration de toutes les activités devient obligatoire ;
- l’implémentation exige une nouvelle base ou une refonte de la Library ;
- la version `0.2` est envisagée sans décision explicite ;
- les valeurs de l’activité historique ne sont pas validées.

### Faits observés, contrôles et validation humaine

Faits observés :

- sept activités, toutes `draft` ;
- quatre métadonnées générales éditables ;
- deux `videoRef` persistés ;
- activité historique riche mais incomplètement qualifiée ;
- droits média vides ;
- duplication sans filiation d’activité ;
- absence de page de détail d’activité distincte.

Contrôles réalisés :

- lecture des instructions et documents obligatoires ;
- vérification Git initiale ;
- inspection des JSON canoniques sans écriture ;
- inspection des validateurs, routes, writers et fonction de duplication ;
- inspection des cinq surfaces demandées et de la fiche vidéo ;
- consultation ciblée des tests de compatibilité et d’intégrité ;
- comparaison avec la grille et le rapport 118 ;
- vérification du numéro de rapport immédiatement avant création.

État Git final observé :

```text
## main...origin/main [ahead 1]
?? DEMARCHE_REAPPROPRIABILITE_PROTOTYPES.md
?? reports/119_proto05_pedagogical_identity_design.md
```

`DEMARCHE_REAPPROPRIABILITE_PROTOTYPES.md` est apparu après le contrôle propre
effectué immédiatement avant la création du rapport 119. Il n’a été ni créé, ni
lu, ni modifié par cette mission. Le seul fichier créé par la mission est le
rapport 119.

Non vérifié ou non testé :

- aucune suite de tests exécutée, car aucun code ni donnée n’a été modifié ;
- aucun serveur lancé ;
- aucune recette HTTP ;
- aucune recette interactive ou visuelle Chromium ;
- aucune validation par un enseignant tiers ;
- aucune validation juridique ;
- aucune réponse de David au questionnaire ;
- aucune qualité pédagogique déduite de la seule présence des champs.

Validation humaine encore requise :

- arbitrage du modèle proposé ;
- réponses de David pour l’activité historique ;
- qualification des droits par la personne compétente ;
- test du miroir par un enseignant tiers après implémentation.

Limites restantes :

- la fiche ne réduit la dépendance à David que si elle est réellement renseignée ;
- la transmissibilité restera bloquée tant que les droits vidéo sont inconnus ;
- l’export, la restauration et la documentation générale restent hors périmètre.

Suite possible :

1. validation de ce rapport par David ;
2. réponses au questionnaire ;
3. Mission 120 minimale ;
4. mission distincte de qualification des droits média ;
5. test du miroir avec un enseignant tiers.

Message de commit proposé, sans commit réalisé :

```text
docs(proto05): design canonical pedagogical identity
```

Fichier créé :
`reports/119_proto05_pedagogical_identity_design.md`

Aucun commit et aucun push n’ont été réalisés.
