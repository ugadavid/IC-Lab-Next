# Workflow enseignant minimal de Dico-IC

## Statut et intention

Ce document décrit un workflow v0 exploratoire pour préparer dans Dico-IC une activité destinée à Seven Sieves Explorer.

Il ne définit ni une plateforme pédagogique complète, ni un modèle SQL final. Il cherche le plus petit ensemble cohérent permettant à un enseignant de partir de son propre texte, de contrôler les aides proposées et de publier une activité exploitable.

Principe directeur :

> Dico-IC administre les ressources et annotations pédagogiques ; Seven Sieves Explorer les présente et conserve localement l'état de lecture de l'apprenant.

## 1. Périmètre v0

Le workflow v0 prend volontairement les décisions simples suivantes :

- une activité contient un seul texte ;
- le texte est collé ou importé depuis un fichier texte simple ;
- une langue source et une langue de médiation sont obligatoires ;
- aucune ou plusieurs langues de comparaison peuvent être choisies ;
- les sept tamis forment un catalogue connu, dont l'enseignant active un sous-ensemble ;
- la pré-analyse produit des propositions, jamais des vérités automatiquement publiées ;
- l'enseignant peut valider, corriger, rejeter ou ajouter une annotation ;
- seule une activité publiée est lisible par Seven Sieves Explorer ;
- aucune donnée apprenante n'est enregistrée par Dico-IC.

Les imports PDF, DOCX, OCR, la collaboration en temps réel, les classes, les comptes apprenants, la notation et les parcours adaptatifs restent hors périmètre.

## 2. Parcours enseignant minimal

### Étape 1 : créer une activité

L'enseignant crée un brouillon avec quelques informations seulement :

- titre ;
- description ou consigne courte facultative ;
- statut initial `DRAFT`.

Le système attribue un identifiant stable à l'activité.

À ce stade, aucune ressource linguistique mutualisée n'est créée.

### Étape 2 : coller ou importer un texte

Deux entrées suffisent pour la v0 :

- coller du texte brut ;
- importer un fichier `.txt` encodé en UTF-8.

Le contenu importé reste modifiable avant la pré-analyse. Dico-IC conserve le texte source tel qu'il sera présenté dans Seven Sieves Explorer.

Une modification du texte après analyse doit invalider ou recalculer les occurrences et annotations concernées. Pour la v0, la solution la plus lisible est d'avertir l'enseignant puis de relancer entièrement la pré-analyse.

### Étape 3 : choisir les langues

L'enseignant choisit :

- la langue source du texte ;
- la langue de médiation utilisée pour les explications ;
- zéro, une ou plusieurs langues de comparaison.

Exemple correspondant au prototype actuel :

```text
source : es
médiation : fr
comparaison : it, pt
```

Les langues doivent provenir du catalogue `language` existant. La v0 ne cherche pas à détecter automatiquement la langue et ne permet pas nécessairement à l'enseignant d'en créer une nouvelle depuis cet écran.

### Étape 4 : choisir les tamis activés

L'enseignant active les tamis utiles pour cette activité parmi les sept tamis de Seven Sieves Explorer.

La v0 a seulement besoin de mémoriser :

- le code ou numéro du tamis ;
- son activation pour l'activité ;
- éventuellement son ordre d'affichage.

Les titres et principes généraux des tamis peuvent rester définis par l'application au début. Il n'est pas nécessaire de rendre immédiatement chaque libellé administrable.

### Étape 5 : lancer une pré-analyse

Dico-IC prépare d'abord les occurrences du texte :

- forme originale ;
- forme normalisée ;
- position ou index ;
- offsets de début et de fin dans le texte.

Il cherche ensuite, pour les tamis activés :

- les formes lexicales connues ;
- les relations pertinentes avec les langues choisies ;
- les faux amis éventuels ;
- les traits IC disponibles ;
- les règles de `pattern_rule` potentiellement applicables.

Chaque résultat devient une **proposition d'annotation** rattachée à une occurrence. La proposition doit conserver sa provenance : forme, relation, trait, règle ou mécanisme expérimental.

La pré-analyse ne doit pas inventer silencieusement une validation. Une absence de résultat signifie seulement que Dico-IC ne dispose pas encore d'une aide pour cette occurrence.

### Étape 6 : corriger, valider et enrichir

L'enseignant relit les propositions occurrence par occurrence ou tamis par tamis.

Actions minimales :

- **valider** une proposition jugée utile ;
- **corriger** son texte pédagogique, sa catégorie ou sa confiance ;
- **rejeter** une proposition non pertinente dans ce contexte ;
- **ajouter** une annotation manuelle ;
- **ajouter une note pédagogique** visible dans Seven Sieves Explorer.

Une correction locale ne modifie pas automatiquement le lexique mutualisé. Par exemple, corriger l'aide associée à `sentido` dans une activité ne doit pas changer immédiatement toutes les autres activités.

Si une correction semble généralisable, elle pourra plus tard être proposée séparément comme enrichissement mutualisé. Ce mécanisme de proposition et de validation globale n'est pas requis dans la v0.

### Étape 7 : vérifier l'aperçu

Avant publication, l'enseignant ouvre un aperçu proche de Seven Sieves Explorer et vérifie :

- le texte et sa segmentation ;
- les langues affichées ;
- les tamis disponibles ;
- les mots ou occurrences mis en évidence ;
- les explications et formulations de prudence ;
- l'absence d'annotation rejetée ou encore manifestement incorrecte.

L'aperçu ne simule pas un suivi apprenant. Il vérifie seulement le contenu publié.

### Étape 8 : publier pour Seven Sieves Explorer

La publication rend disponible une représentation en lecture seule de l'activité.

Seven Sieves Explorer doit pouvoir charger, avec un identifiant d'activité :

- le texte ;
- les langues ;
- les tamis actifs ;
- les occurrences ;
- les annotations retenues ;
- les références aux ressources lexicales ou règles mobilisées ;
- les notes pédagogiques nécessaires à l'affichage.

Les propositions rejetées ou non retenues ne sont pas exposées au client apprenant.

Pour rester simple, la v0 peut considérer qu'une modification d'une activité publiée la remet en brouillon jusqu'à une nouvelle publication. Une gestion complète des versions n'est pas nécessaire tant que le besoin réel n'est pas confirmé.

## 3. Objets métier nécessaires

### 3.1 Activité

L'activité est l'unité publiée et chargée par Seven Sieves Explorer.

Informations minimales :

- identifiant ;
- titre ;
- consigne ou description facultative ;
- langue source ;
- langue de médiation ;
- langues de comparaison ;
- tamis activés ;
- statut de publication ;
- dates simples de création et modification si elles sont utiles à l'administration.

Pour la v0, une activité appartient implicitement à l'enseignant qui l'édite, sans introduire de modèle complet d'organisation, de classe ou de partage.

### 3.2 Texte

Le texte est le contenu analysé et présenté.

Informations minimales :

- contenu brut ;
- langue source, portée par l'activité ;
- éventuellement titre ou provenance ;
- empreinte ou date de dernière analyse pour détecter une modification.

Conceptuellement, le texte est un objet métier distinct. Physiquement, comme la v0 impose un seul texte par activité, son contenu peut rester dans l'objet ou la table `activity`. Une table `text` séparée ne devient nécessaire que si la réutilisation d'un même texte ou les activités multi-textes apparaissent réellement.

### 3.3 Occurrence ou token

Une occurrence représente un segment précis du texte, et non un lemme abstrait.

Informations minimales :

- activité ;
- index dans le texte ;
- texte original ;
- forme normalisée ;
- offset de début ;
- offset de fin ;
- référence facultative à une `lexical_form` reconnue.

Les offsets permettent de distinguer deux occurrences identiques ayant des fonctions ou annotations différentes. C'est un besoin direct de Seven Sieves Explorer que le modèle lexical actuel ne couvre pas.

### 3.4 Annotation

Une annotation relie une occurrence à un tamis et à une aide proposée ou validée.

Informations minimales :

- occurrence ;
- tamis ;
- type d'annotation ;
- contenu ou valeur affichable ;
- explication facultative ;
- formulation de prudence facultative ;
- confiance facultative ;
- origine : automatique ou manuelle ;
- statut de validation ;
- références facultatives à une forme, relation, trait ou règle mutualisée.

Une annotation peut donc être purement locale ou expliquer une ressource mutualisée dans le contexte du texte.

### 3.5 Règle mobilisée

La règle mobilisée n'est pas une nouvelle règle propre à l'activité. Il s'agit d'une référence depuis l'annotation vers une règle mutualisée, principalement `pattern_rule`.

Cette référence permet de répondre à deux questions :

- pourquoi la proposition a-t-elle été produite ?
- quelle règle doit être citée ou expliquée dans Seven Sieves Explorer ?

Si la logique utilisée n'est pas encore représentable dans `pattern_rule`, l'annotation peut conserver une provenance expérimentale textuelle. Il vaut mieux signaler cette limite que créer automatiquement une règle globale douteuse.

### 3.6 Note pédagogique

Une note pédagogique est un texte rédigé pour guider l'interprétation, rappeler une prudence ou contextualiser une aide.

Dans la v0, elle peut être un champ de l'annotation plutôt qu'une table autonome. Une table dédiée ne serait utile que si la même note doit être réutilisée, traduite, versionnée ou affichée dans plusieurs contextes.

### 3.7 Statut de validation

Deux cycles simples doivent être distingués.

Pour une annotation :

```text
PROPOSED → VALIDATED
         → REJECTED
```

Une annotation corrigée peut être enregistrée comme `VALIDATED` avec une origine ou une trace indiquant qu'elle a été ajustée manuellement. Un statut supplémentaire `CORRECTED` n'est pas indispensable pour faire fonctionner la v0.

Pour une activité :

```text
DRAFT → PUBLISHED
```

Un état `READY` peut être ajouté plus tard si une validation éditoriale distincte apparaît. Il n'est pas nécessaire dans un workflow où le même enseignant prépare et publie son activité.

## 4. Frontières de responsabilité

### 4.1 Lexique mutualisé

Le lexique mutualisé contient des connaissances destinées à être réutilisées dans plusieurs textes ou applications :

- `language` ;
- `lexical_entry` ;
- `lexical_form` ;
- `form_relation` ;
- `ic_feature` lorsqu'il décrit bien une forme ;
- `pattern_rule` ;
- scores, confiance, sources et notes attachés à ces ressources.

Ces données ne dépendent pas d'une occurrence précise du texte. Leur modification peut affecter plusieurs activités et demande donc plus de prudence.

### 4.2 Activité particulière

L'activité contient ce qui dépend du choix pédagogique ou du contexte :

- titre et consigne ;
- texte ;
- langue de médiation et langues de comparaison ;
- tamis activés ;
- occurrences ;
- résultats de pré-analyse ;
- annotations validées, corrigées ou rejetées ;
- rôles syntaxiques attribués dans ce texte ;
- exceptions locales ;
- notes pédagogiques propres à l'activité ;
- statut de publication.

Une annotation d'activité peut référencer le lexique mutualisé sans le recopier ni le modifier.

### 4.3 Session apprenant

Seven Sieves Explorer conserve localement :

- le tamis actif ;
- l'occurrence inspectée ;
- les mots sélectionnés ;
- les statuts `compris`, `doute`, `inconnu` ;
- les compteurs ;
- les résultats visuels `cohérent` ou `discutable` ;
- la progression temporaire et la réinitialisation.

Dico-IC v0 ne reçoit et ne stocke aucune de ces données. Il n'existe donc pas d'objet `learner`, `session`, `answer`, `score` ou `classroom` dans ce périmètre.

## 5. Strict minimum à ajouter au modèle actuel

Le schéma actuel couvre déjà le lexique mutualisé. Le minimum manquant concerne le contexte d'activité.

### 5.1 Une structure `activity`

Elle porte :

- les métadonnées minimales ;
- le contenu du texte unique ;
- les références aux langues source et de médiation ;
- le statut `DRAFT` ou `PUBLISHED`.

Cette structure suffit aussi à représenter le texte dans la v0. Il n'est pas nécessaire d'ajouter immédiatement une table `text` séparée.

### 5.2 Les langues de comparaison

Une activité peut viser plusieurs langues de comparaison. Une petite association entre activité et `language` est plus claire qu'une liste de codes stockée dans une chaîne.

### 5.3 Les tamis activés

Une petite association entre activité et code de tamis suffit. Elle peut porter un ordre d'affichage facultatif.

Il n'est pas nécessaire de créer immédiatement un modèle complet de définition des tamis si leur catalogue reste celui de Seven Sieves Explorer.

### 5.4 Une structure `activity_token`

Elle conserve les occurrences positionnées issues de la dernière pré-analyse et leur éventuel lien avec `lexical_form`.

Sans cette structure, les annotations restent attachées à un mot abstrait et ne peuvent pas distinguer les occurrences.

### 5.5 Une structure `activity_annotation`

Elle porte l'annotation, son tamis, son statut, son origine, sa note pédagogique et ses références facultatives vers les ressources mutualisées.

Pour rester simple, une même structure peut accueillir les propositions automatiques et les annotations manuelles. Le statut et l'origine suffisent à les distinguer.

### 5.6 Ce qui n'est pas ajouté

Le minimum ne comprend pas :

- de table utilisateur complète ;
- de rôles administrateur/enseignant complexes ;
- de classes ou groupes ;
- de sessions apprenantes ;
- de réponses ou statistiques ;
- de workflow de modération collective ;
- de versionnement éditorial complet ;
- de table autonome pour chaque tamis ;
- de table autonome pour les notes pédagogiques ;
- de copie des formes et règles lexicales dans chaque activité.

Au total, le besoin peut être exploré avec cinq ajouts conceptuels simples :

```text
activity
activity_comparison_language
activity_sieve
activity_token
activity_annotation
```

Ces noms sont des propositions de travail, pas une décision SQL.

## 6. Relation avec l'API de Seven Sieves Explorer

Le workflow enseignant prépare un seul objet publié que le client peut charger en lecture seule.

Contrat conceptuel minimal :

```text
GET /activities/{id}
```

La réponse devrait regrouper :

- activité et texte ;
- langues ;
- tamis ;
- occurrences ;
- annotations validées ;
- explications et prudences ;
- références lexicales utiles.

L'administration peut ensuite s'appuyer sur quelques opérations conceptuelles :

```text
POST /activities
PUT  /activities/{id}
POST /activities/{id}/pre-analysis
PUT  /annotations/{id}
POST /activities/{id}/annotations
POST /activities/{id}/publish
```

Ces routes servent à rendre le workflow lisible. Elles ne constituent pas encore une spécification technique figée.

## 7. Règles de simplicité pour la v0

1. Une activité, un texte.
2. Texte brut uniquement.
3. Langues choisies dans le catalogue existant.
4. Pré-analyse explicable et rejouable.
5. Toute proposition automatique commence comme `PROPOSED`.
6. Seules les annotations `VALIDATED` ou ajoutées manuellement sont publiées.
7. Une correction d'activité reste locale par défaut.
8. Aucune donnée apprenante ne remonte dans Dico-IC.
9. Seven Sieves Explorer reçoit un paquet de lecture, sans multiplier les appels par mot.
10. Toute extension du modèle doit répondre à un besoin observé dans ce workflow.

## 8. Questions encore ouvertes

- La pré-analyse doit-elle créer des tokens pour la ponctuation ou seulement pour les mots ?
- L'enseignant doit-il pouvoir modifier manuellement la segmentation ?
- Une activité publiée doit-elle rester accessible après une nouvelle publication ?
- Tous les tamis nécessitent-ils une validation occurrence par occurrence ?
- Les annotations manuelles doivent-elles pouvoir être proposées au lexique mutualisé dès la v0, ou seulement plus tard ?
- Quelle provenance minimale faut-il conserver pour un texte importé ?
- Le français sera-t-il toujours disponible comme langue de médiation des explications ?

Ces questions doivent être testées avec Seven Sieves Explorer et les enseignants avant d'élargir le modèle.

## Conclusion

Le workflow enseignant minimal ne demande pas de transformer Dico-IC en plateforme d'apprentissage. Il demande de relier le noyau lexical existant à une activité textuelle administrable : un texte, des langues, des tamis, des occurrences et des annotations contrôlées humainement.

Le schéma actuel reste le socle des connaissances mutualisées. Cinq ajouts conceptuels suffisent pour explorer le premier cas réel, sans toucher aux sessions apprenantes ni automatiser la mutualisation des corrections.

Seven Sieves Explorer devient ainsi le premier client en lecture d'une activité publiée, tandis que Dico-IC assume un rôle précis : aider l'enseignant à préparer, expliquer, valider et réutiliser des ressources d'intercompréhension.
