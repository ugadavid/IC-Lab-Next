# Dico-IC — étude d'intégration V0 du workflow IA vers `inflected_form`

## Statut du document

Cette étude prépare le chantier B2. Elle ne constitue ni une implémentation, ni une
modification du modèle SQL, ni un nouveau contrat d'API.

Elle part de l'état réel du projet :

- l'Assistant IA Texte repère les formes absentes de `lexical_form` et propose des
  entrées lexicales ;
- les assistants lexicaux demandent désormais des lemmes dictionnaires ;
- `inflected_form` relie déjà un pluriel attesté à une `lexical_form` canonique ;
- seuls les mappings `VALIDATED` alimentent `POST /analysis` ;
- la création manuelle d'un mapping existe déjà dans Dico-IC Admin ;
- aucune sortie IA n'est écrite sans action humaine.

## 1. Cas d'usage

### 1.1 Problème actuel

La couverture de l'Assistant IA Texte compare aujourd'hui les mots du texte à
`lexical_form.normalized_lemma`.

Une surface comme :

```text
organizaciones
```

peut donc être classée comme inconnue alors que le concept et le lemme espagnol
`organización` existent déjà. Si elle est envoyée au workflow lexical, l'IA peut
proposer une nouvelle `lexical_entry`, ce qui augmente le risque de doublon
conceptuel.

Il faut distinguer au moins trois situations :

```text
surface = lemme déjà connu
surface = forme fléchie d'un lemme déjà connu
surface = concept réellement absent
```

### 1.2 Parcours cible

```text
texte soumis explicitement dans Dico-IC Admin
↓
tokenisation et regroupement des surfaces
↓
lookup lexical_form
↓
lookup inflected_form VALIDATED
↓
surfaces encore non résolues
↓
propositions IA de lemmes et de traits simples
↓
confirmation du lemme candidat dans lexical_form
↓
brouillons inflected_form
↓
correction, acceptation ou refus humain
↓
écriture explicite dans inflected_form
```

Ce workflow concerne la préparation de la connaissance dans l'admin. Il ne doit
pas être déclenché par Seven Sieves ni introduire une écriture dans
`POST /analysis`.

### 1.3 Gains attendus

- éviter de créer une entrée lexicale pour un simple pluriel ;
- réduire la recherche manuelle du lemme cible ;
- traiter en lot les formes issues d'un texte réel ;
- capitaliser les validations humaines pour les analyses suivantes ;
- améliorer ensuite les tamis lexicaux et le tamis 6 sans modifier le texte ;
- conserver une séparation nette entre surface observée et lemme canonique.

### 1.4 Risques

- lemmatisation erronée ou produite dans la mauvaise langue ;
- confusion entre pluriel et mot lexicalement distinct ;
- association à une mauvaise entrée homographe ;
- confiance IA interprétée comme une preuve ;
- proposition d'un lemme qui n'existe pas encore dans Dico-IC ;
- création en double d'un mapping déjà présent ;
- perte du contexte si l'IA ne reçoit que la surface isolée ;
- validation trop rapide de lots importants.

Le principal garde-fou reste :

```text
l'IA propose
→ l'humain valide
→ l'API contrôle
→ le repository écrit
```

## 2. Objets manipulés

### 2.1 Observation temporaire

Une observation appartient au lot courant et ne doit pas être persistée en V0 :

```text
surface_form
normalized_surface
language
occurrences
contexts[]
token_indexes éventuels
```

Un ou deux contextes courts suffisent pour la revue. Le texte complet ne doit pas
être copié dans `inflected_form`.

### 2.2 Proposition IA temporaire

Noyau conceptuel recommandé :

```text
surface_form
language
lemma_candidate
part_of_speech
grammatical_number
confidence_score
reason_short
source_label
```

Après rapprochement avec la base, le serveur ajoute :

```text
lexical_form_id
entry_key
canonical_lemma
match_state
existing_mapping
conflicts[]
```

`lemma_candidate` est une hypothèse de travail. `lexical_form_id` est la cible
réelle qui sera écrite après validation.

### 2.3 États utiles dans l'interface

Les brouillons peuvent utiliser des états purement locaux :

```text
READY
NEEDS_CORRECTION
LEMMA_NOT_FOUND
ALREADY_KNOWN
AMBIGUOUS
REJECTED_BY_REVIEWER
CREATED
ERROR
```

Ils ne doivent pas être confondus avec les statuts persistants de
`inflected_form` :

```text
PROPOSED
VALIDATED
REJECTED
ARCHIVED
```

Pour la V0, une proposition IA peut rester entièrement transitoire. Après
validation humaine, elle peut être créée directement avec le statut `VALIDATED`.
Il n'est pas nécessaire de remplir la table avec toutes les propositions
refusées.

### 2.4 Provenance

Une convention simple suffirait :

```text
ai_text_inflection_v0
```

La provenance indique l'origine de la proposition, pas sa qualité. La validation
humaine est représentée par le statut final, et non par un score artificiellement
porté à `1`.

## 3. Workflow recommandé

### Étape 1 — analyser la couverture

Le texte est tokenisé avec la logique existante. Les surfaces sont regroupées par
langue source et clé normalisée, avec un compteur d'occurrences.

La couverture devrait distinguer :

1. lemmes exacts connus ;
2. formes fléchies déjà validées ;
3. surfaces non résolues.

Les catégories 1 et 2 ne sont pas envoyées à l'IA.

### Étape 2 — sélectionner les surfaces

L'administrateur choisit les surfaces à examiner. Cette étape évite d'envoyer à
l'IA les noms propres, erreurs typographiques, nombres ou éléments sans intérêt.

### Étape 3 — générer les propositions

L'IA reçoit au minimum :

- la langue source ;
- la surface ;
- un contexte court ;
- le périmètre strict : noms et adjectifs au pluriel ;
- l'instruction de produire un lemme dictionnaire singulier ;
- les valeurs contrôlées attendues.

Exemple conceptuel :

```json
{
  "surface_form": "organizaciones",
  "language": "es",
  "lemma_candidate": "organización",
  "part_of_speech": "noun",
  "grammatical_number": "PLURAL",
  "confidence_score": 0.97,
  "reason_short": "Pluriel nominal espagnol."
}
```

Le score sert uniquement au tri. Il ne doit jamais décider seul de l'écriture.

### Étape 4 — rapprocher les lemmes de Dico-IC

Le serveur normalise les lemmes proposés et effectue une lecture par lot de
`lexical_form`, filtrée par langue et catégorie.

Résultats possibles :

```text
une cible exacte       → READY
aucune cible           → LEMMA_NOT_FOUND
plusieurs cibles       → AMBIGUOUS
mapping déjà présent   → ALREADY_KNOWN
collision contradictoire → NEEDS_CORRECTION
```

L'IA ne doit pas fournir directement un identifiant SQL.

### Étape 5 — réviser

Pour chaque ligne, l'humain peut :

- accepter la cible proposée ;
- choisir une autre `lexical_form` existante ;
- corriger le lemme candidat puis relancer la recherche ;
- refuser la proposition ;
- basculer vers le workflow lexical si le lemme est réellement absent.

### Étape 6 — écrire

Seules les lignes cochées, non ambiguës et reliées à une cible existante sont
envoyées à l'endpoint admin d'écriture.

La création reste transactionnelle ligne par ligne dans la V0. Un rapport final
sépare :

```text
créés
déjà connus
conflits
refusés
erreurs
```

Une future création en lot transactionnelle n'est pas indispensable au premier
prototype.

### Variante A — lemme déjà présent

```text
internacionales
→ IA : internacional, adjective, PLURAL
→ lexical_form ES internacional trouvée
→ validation
→ inflected_form créée
```

### Variante B — lemme absent

```text
surface
→ lemma_candidate absent de lexical_form
→ aucune création inflected_form
→ proposition transférable à l'Assistant IA Texte lexical
→ création et validation du lemme
→ nouvelle analyse ou reprise du brouillon
```

La V0 ne devrait pas créer simultanément une `lexical_entry` et son
`inflected_form` dans une transaction complexe.

### Variante C — proposition ambiguë

```text
surface
→ plusieurs lexical_form compatibles
→ sélection humaine obligatoire
→ aucune cible choisie par défaut
```

## 4. Réutilisation de l'existant

### 4.1 Éléments directement réutilisables

L'Assistant IA Texte fournit déjà :

- la saisie d'un texte ;
- la tokenisation et le regroupement des formes ;
- la limite de taille ;
- la sélection des langues ;
- l'appel OpenAI structuré côté serveur ;
- les brouillons éditables et sélectionnables ;
- le principe de rapport après écriture ;
- la règle explicite des lemmes dictionnaires ;
- la séparation IA, humain, API et MariaDB.

La gestion manuelle de `inflected_form` fournit déjà :

- la recherche d'une `lexical_form` cible ;
- les contrôles FR, ES, IT et PT ;
- les contrôles `noun` et `adjective` ;
- le nombre `PLURAL` ;
- les statuts ;
- la normalisation de la surface ;
- la confiance et la provenance ;
- la création transactionnelle ;
- la conversion des doublons SQL en erreur métier.

### 4.2 Ce qui doit évoluer conceptuellement

La couverture Texte ne devrait plus assimiler automatiquement :

```text
absent de lexical_form
=
concept absent
```

Elle doit consulter les mappings validés avant d'établir la liste des véritables
inconnues.

Le générateur lexical et le générateur de mappings doivent également recevoir des
consignes et des schémas JSON différents.

### 4.3 Étendre l'Assistant IA Texte ou créer un assistant séparé ?

#### Extension unique

Un seul assistant pourrait renvoyer des candidats lexicaux et des candidats
fléchis dans la même réponse.

Avantage : un seul appel et une seule page.

Inconvénients :

- schéma JSON plus complexe ;
- risque de confusion entre concept et mapping ;
- validation visuelle plus lourde ;
- écritures vers deux ressources différentes ;
- tests et messages d'erreur moins lisibles.

#### Assistant IA Formes Fléchies séparé

Un module dédié traiterait seulement les surfaces sélectionnées et produirait
uniquement des candidats `inflected_form`.

Avantages :

- prompt très étroit ;
- schéma simple ;
- périmètre linguistique contrôlable ;
- logique de doublons spécifique ;
- validation plus compréhensible ;
- évolution indépendante vers d'autres traits morphologiques.

Inconvénient : une action supplémentaire dans le parcours.

### 4.4 Recommandation

Créer à terme un **Assistant IA Formes Fléchies distinct au niveau métier et
serveur**, mais accessible depuis la page ou le résultat de l'Assistant IA Texte.

L'expérience peut rester continue :

```text
Assistant IA Texte
├── concepts réellement absents
└── formes susceptibles d'être fléchies
    ↓
    ouvrir l'Assistant IA Formes Fléchies
```

Cette solution réutilise l'entrée par texte sans mélanger les contrats ni les
écritures.

## 5. Cas linguistiques V0

### Périmètre inclus

```text
langues : fr, es, it, pt
catégories : noun, adjective
trait : grammatical_number = PLURAL
sortie : lemme singulier canonique existant
```

### `organizaciones → organización`

Cas nominal espagnol de référence. La proposition est exploitable si la
`lexical_form` espagnole `organización` existe. Une fois validée, elle donne accès
aux enrichissements lexicaux et à l'indice morphologique du tamis 6.

### `internacionales → internacional`

Le même mapping de surface peut concerner un nom ou un adjectif selon le
contexte. La V0 demandée traite surtout l'adjectif, mais le POS ne doit pas être
deviné sans contexte. Si plusieurs cibles ou catégories existent, la ligne doit
être marquée ambiguë.

### `utiles → útil`

Ce cas illustre deux difficultés :

- le caractère accentué doit être restauré dans le lemme espagnol ;
- `utiles` peut aussi être une surface française.

La langue source est donc obligatoire. Le lookup ne doit jamais porter sur la
seule clé normalisée `utiles`.

### Hors périmètre

- verbes, conjugaisons, temps et personnes ;
- genre et accords complexes ;
- formes comparatives ou superlatives ;
- clitiques et contractions ;
- dérivation ;
- génération exhaustive de paradigmes ;
- déduction par règles suffixales persistantes.

Une proposition hors périmètre doit être refusée ou ignorée, pas approximativement
convertie.

## 6. Présentation dans Dico-IC Admin

### 6.1 Entrée dans le workflow

Depuis le résultat de couverture du texte, une section distincte peut afficher :

```text
Formes déjà connues
Formes fléchies déjà validées
Formes à examiner
Concepts candidats
```

Un bouton explicite pourrait lancer :

```text
Proposer des mappings de pluriel
```

### 6.2 Tableau de revue

Colonnes minimales :

| Garder | Surface | Langue | Contexte | Lemme proposé | Cible Dico-IC | POS | Nombre | Confiance | État |
|---|---|---|---|---|---|---|---|---|---|

La cible doit afficher au minimum :

```text
ES · organización · noun
ORGANIZATION_ENTITY
```

### 6.3 Actions humaines

- **Accepter** : conserve la proposition et sa cible ;
- **Corriger** : modifie le lemme ou sélectionne une autre cible ;
- **Refuser** : retire la ligne du lot courant ;
- **Créer le lemme** : redirige vers le workflow lexical, sans écriture
  `inflected_form` immédiate.

Le bouton final doit annoncer précisément :

```text
Créer les mappings validés
```

et non « Enregistrer les propositions IA ».

### 6.4 Réduction de la friction

- regrouper les occurrences identiques ;
- montrer un contexte court, pas chaque token ;
- précocher uniquement les lignes `READY`, jamais les ambiguïtés ;
- trier par fréquence puis par confiance ;
- permettre la sélection en lot ;
- conserver un rapport détaillé.

La validation humaine reste systématique sans devenir une annotation mot par mot.

## 7. Compatibilité avec `inflected_form`

### 7.1 Champs déjà suffisants

Le modèle actuel couvre le besoin V0 :

```text
lexical_form_id
surface_form
normalized_surface
grammatical_number
status
source_label
confidence_score
created_at
```

La langue et le POS sont correctement dérivés de la `lexical_form` cible.

### 7.2 Contraintes déjà alignées

- pluriel uniquement ;
- noms et adjectifs uniquement ;
- FR, ES, IT et PT ;
- surfaces normalisées avec la convention Dico-IC ;
- statuts compatibles avec proposition et validation ;
- unicité du même mapping cible + surface + nombre ;
- seuls les mappings validés sont consommés par l'analyse.

### 7.3 Limites actuelles

- absence d'édition ou d'archivage dans le workflow manuel V0 ;
- pas de notes ni de contexte conservé ;
- pas de date de validation ni d'identité du validateur ;
- pas de contrainte empêchant une même surface d'être validée vers plusieurs
  cibles ;
- confiance non calibrée entre différents modèles ;
- aucune opération de création en lot.

Aucune de ces limites n'impose une modification SQL pour expérimenter le workflow
IA V0.

### 7.4 Adaptations minimales futures

La première implémentation peut réutiliser l'endpoint de création existant, après
validation de chaque brouillon.

Les adaptations minimales se situeraient surtout dans :

- la lecture de couverture ;
- un module de génération IA dédié ;
- le rapprochement en lot avec `lexical_form` ;
- l'interface de revue.

Le schéma actuel peut rester inchangé.

## 8. Gestion des doublons et conflits

### Forme déjà connue comme lemme exact

Ne pas proposer de mapping fléchi. La correspondance exacte reste prioritaire.

### Mapping exact déjà validé

Afficher `ALREADY_KNOWN` et ne pas l'envoyer à l'écriture.

### Mapping identique déjà proposé

Éviter le doublon dans le lot en dédoublonnant par :

```text
language
+ normalized_surface
+ lexical_form_id
+ grammatical_number
```

Si une ligne `PROPOSED` existe déjà en base, la V0 peut la signaler et demander
une revue manuelle plutôt que créer une seconde ligne.

### Même surface, autre lemme cible

Ce n'est pas nécessairement un doublon : il peut s'agir d'une ambiguïté réelle.

Comportement recommandé :

- afficher les mappings existants ;
- ne sélectionner aucune cible automatiquement ;
- exiger une décision humaine ;
- avertir si plusieurs mappings `VALIDATED` coexistent.

### Lemme absent

Ne jamais insérer un mapping sans cible. Orienter la ligne vers le workflow de
création lexicale.

### Collision SQL au moment de l'écriture

Le repository effectue un rollback et l'API renvoie le conflit métier existant.
L'interface doit alors reclasser la ligne en `ALREADY_KNOWN` ou `ERROR`, puis
rafraîchir les mappings.

### Proposition répétée après refus

La V0 peut conserver le refus seulement dans l'état local du lot. Persister tous
les refus ajouterait une fonction de gouvernance qui mérite une décision
ultérieure.

## 9. Architecture recommandée

```text
Dico-IC Admin — texte
↓
service de couverture enrichi
├── lexical_form exactes
├── inflected_form VALIDATED
└── surfaces non résolues
        ↓
Assistant IA Formes Fléchies
        ↓
propositions structurées temporaires
        ↓
résolution serveur vers lexical_form existantes
        ↓
tableau de revue humaine
        ↓
endpoint admin inflected_form existant
        ↓
transaction et contrôles repository
        ↓
inflected_form VALIDATED
        ↓
POST /analysis en lecture seule
```

### Répartition des responsabilités

| Composant | Responsabilité |
|---|---|
| Assistant IA Texte | point d'entrée par texte et identification des surfaces à examiner |
| Assistant IA Formes Fléchies | proposition morphologique étroite |
| Serveur | validation, normalisation, rapprochement avec les cibles et détection des conflits |
| Humain | correction, choix de la cible, acceptation ou refus |
| API admin | écriture explicite seulement |
| Repository | transaction, contraintes et rollback |
| `POST /analysis` | lecture des mappings validés, sans écriture |
| Seven Sieves | consommation des enrichissements seulement |

## 10. Périmètre et ordre de mise en œuvre conseillés

### V0 recommandée

- une langue source explicite par analyse ;
- FR, ES, IT et PT ;
- pluriels de noms et adjectifs ;
- lemme cible obligatoirement déjà présent ;
- un ou deux contextes courts ;
- propositions temporaires ;
- validation humaine individuelle ou en lot ;
- création par l'endpoint admin existant ;
- aucun changement SQL.

### Ordre conseillé

1. Faire évoluer conceptuellement la couverture pour reconnaître aussi les
   `inflected_form` validées.
2. Définir un petit contrat JSON propre aux candidats fléchis.
3. Créer le module IA spécialisé et ses tests de prompt sans appel OpenAI.
4. Ajouter la résolution par lot des lemmes candidats vers `lexical_form`.
5. Construire le tableau de revue dans l'admin.
6. Réutiliser l'écriture existante et tester les collisions réelles.
7. Évaluer le workflow sur un petit corpus FR/ES/IT/PT.
8. Décider seulement ensuite si une écriture en lot ou une persistance des refus
   est utile.

### Complexité estimée

**Moyenne**, car le schéma et l'écriture unitaire existent déjà. Le travail
principal porte sur :

- la classification correcte des surfaces ;
- le nouveau contrat IA ;
- le rapprochement avec les lemmes existants ;
- la revue ergonomique des ambiguïtés.

La difficulté linguistique reste contenue grâce au périmètre pluriel
nom/adjectif.

## 11. Critères de validation d'un futur prototype

Un prototype B2 pourrait être considéré comme concluant si :

- `organizaciones` propose `organización` et retrouve la bonne cible espagnole ;
- `internacionales` est présenté comme ambigu si le contexte ou le POS ne permet
  pas de conclure ;
- `utiles` n'est jamais rapproché d'une langue sans langue source explicite ;
- une surface déjà connue n'est pas reproposée ;
- un lemme absent ne produit aucune écriture `inflected_form` ;
- un doublon SQL est clairement signalé ;
- aucune sortie IA n'est écrite avant validation ;
- `/analysis` et Seven Sieves restent inchangés et stateless.

## 12. Questions à conserver ouvertes

- Faut-il envoyer une phrase entière ou une fenêtre courte autour de chaque
  surface ?
- Une proposition à faible confiance doit-elle être masquée ou simplement
  déclassée ?
- Faut-il autoriser plusieurs cibles validées pour une même surface dans la V0 ?
- Comment présenter une forme qui peut être nom ou adjectif ?
- Le refus d'une proposition doit-il rester local ou être mémorisé plus tard ?
- Faut-il permettre de reprendre un brouillon après la création du lemme absent ?
- Un futur moteur morphologique local doit-il précéder l'IA ou servir de seconde
  opinion ?
- Quelle taille de lot reste raisonnable pour une revue humaine fiable ?

## Conclusion

Le workflow B2 peut être construit sans modifier le schéma actuel.

La recommandation est de conserver l'Assistant IA Texte comme porte d'entrée par
les textes, tout en introduisant un Assistant IA Formes Fléchies séparé dans ses
responsabilités, son prompt et son contrat de données.

La distinction structurante est :

```text
concept absent
→ candidat lexical_entry

surface fléchie d'un lemme existant
→ candidat inflected_form
```

Le futur prototype doit donc moins chercher à « générer des pluriels » qu'à
classer prudemment des surfaces réellement observées, retrouver leur lemme
canonique dans Dico-IC et présenter ce rapprochement à un humain.

La règle de gouvernance reste inchangée :

```text
l'IA suggère
l'humain décide
l'API valide
MariaDB conserve uniquement la connaissance acceptée
```
