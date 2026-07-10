# Dico-IC — formes fléchies observées et mappings validés

## Statut du document

Ce document complète :

- `docs/dico-inflected-forms-architecture-study.md` ;
- `docs/dico-lemmatization-engines-study.md`.

Il analyse une variante pragmatique adaptée au volume réel envisagé. Il ne constitue ni un schéma SQL final ni une décision d'implémentation.

Aucun code ou SQL n'est modifié dans cette étude.

## 1. Synthèse

Le nouveau contexte renforce la pertinence d'un stockage dédié aux formes fléchies **réellement observées**.

Il ne remet pas en cause l'architecture hybride initiale. Il la précise :

```text
lexical_form
    = lemme canonique et connaissance durable

inflected_form
    = clé d'accès attestée vers ce lemme

lemmatiseur dynamique
    = découverte et fallback pour les formes encore inconnues
```

Dans un projet composé de quelques enseignants, quelques centaines de textes et quatre langues principales, le risque d'explosion du volume devient faible si Dico-IC ne stocke que les formes rencontrées et jugées utiles.

La variante peut être décrite comme une **architecture hybride orientée corpus**, ou **hybride attestée**.

La recommandation générale devient :

```text
lookup exact du lemme
    ↓ sinon
mapping fléchi validé
    ↓ sinon
lemmatisation dynamique
    ↓
lookup du lemme canonique
    ↓
enrichissements Dico-IC
```

Le moteur dynamique reste nécessaire pour les formes inédites. La table dédiée devient toutefois une composante plus précoce et plus centrale que dans une architecture destinée à des corpus massifs.

## 2. Ce que change réellement le faible volume

### Coût de stockage

Une table de paradigmes complets pourrait contenir des millions de formes et serait disproportionnée. Une table limitée aux surfaces attestées dans quelques centaines de textes resterait vraisemblablement petite au regard de MariaDB.

Le coût dominant ne serait pas le stockage, mais :

- la qualité des mappings ;
- la gestion des ambiguïtés ;
- la provenance ;
- le cycle de validation ;
- la définition de ce que signifie « observé ».

### Coût d'administration

À faible volume, une validation humaine sélective est réaliste. Elle ne doit néanmoins pas devenir une validation mot par mot imposée aux enseignants.

Le bon niveau de friction serait plutôt :

- propositions regroupées par surface ;
- priorité aux formes fréquentes ou incertaines ;
- validation en lot ;
- absence d'écriture automatique depuis Seven Sieves.

### Reproductibilité

Le stockage de mappings validés rend l'analyse moins dépendante des changements de version du moteur. Une fois `mangent → manger` validé, le même accès au lexique peut être reproduit même si un futur moteur analyse différemment le contexte.

### Valeur métier

Les formes observées constituent une ressource directement liée aux pratiques pédagogiques réelles. Elles peuvent être plus utiles qu'un paradigme théoriquement complet mais jamais rencontré dans les textes travaillés.

## 3. Nature exacte de `inflected_form`

La table envisagée ne devrait pas être comprise comme un dictionnaire complet de flexion.

Elle représenterait une assertion de ce type :

```text
Dans la langue portée par ce lexical_form,
la surface normalisée X peut donner accès au lemme canonique Y,
selon une provenance et un statut connus.
```

Elle ne représenterait pas :

- une occurrence précise dans un texte ;
- une nouvelle entrée sémantique ;
- une relation d'intercompréhension ;
- une preuve que cette analyse est correcte dans tous les contextes ;
- l'ensemble du paradigme du lemme.

Cette distinction est essentielle pour préserver le modèle :

```text
lexical_entry     concept
lexical_form      lemme canonique dans une langue
inflected_form    accès morphologique attesté vers ce lemme
form_relation     relation IC entre lemmes
token             occurrence stateless dans la réponse d'analyse
```

## 4. Analyse des champs envisagés

La proposition conceptuelle est :

```text
id
lexical_form_id
language_code
surface_form
normalized_surface
part_of_speech
morph_features_json
status
source_label
confidence
seen_count
created_at
last_seen_at
```

### `id`

Pertinent comme identifiant technique stable du mapping.

### `lexical_form_id`

Indispensable. Il désigne le lemme canonique cible et permet de rejoindre `lexical_entry`, la langue, le POS, les relations et les traits IC.

Le lien doit autoriser plusieurs surfaces vers un même lemme et plusieurs lemmes candidats pour une même surface normalisée.

### `language_code`

Probablement redondant dans le noyau.

La langue est déjà déterminée par :

```text
inflected_form.lexical_form_id
→ lexical_form.language_id
→ language.code
```

La recopier dans `inflected_form` crée un risque d'incohérence, par exemple une surface déclarée `es` reliée à un lemme français. MariaDB ne peut pas garantir simplement une cohérence inter-table par une contrainte `CHECK` ordinaire.

À faible volume, le gain de performance d'une dénormalisation est négligeable. La recommandation conceptuelle est donc de dériver la langue par la relation.

Si un futur besoin de recherche justifie une langue directe, il faudra la considérer comme une dénormalisation contrôlée, pas comme une seconde source de vérité.

### `surface_form`

Indispensable. Il conserve une graphie affichable et attestée :

```text
organizaciones
útiles
élèves
mangent
```

Il faudra définir si les variantes uniquement dues à la casse sont regroupées. Il semble préférable de ne pas créer séparément `Élèves` et `élèves` si elles mènent au même mapping.

### `normalized_surface`

Indispensable pour le lookup par lot. Elle doit suivre la même convention que `toLookupKey()` afin d'éviter deux systèmes de normalisation.

Elle ne doit pas remplacer `surface_form` : la suppression des diacritiques crée volontairement des collisions.

Exemple :

```text
ES útiles → utiles
FR utiles → utiles
```

La langue du lemme cible reste donc nécessaire pour résoudre correctement le lookup.

### `part_of_speech`

Souvent redondant.

Le POS canonique est déjà porté par `lexical_form.part_of_speech`. Pour un mapping simple vers un lemme, le recopier pourrait diverger après une correction.

Deux besoins doivent être distingués :

1. le POS lexical du lemme, à dériver de `lexical_form` ;
2. l'analyse contextuelle d'une occurrence, qui appartient plutôt au résultat du moteur et au token courant.

La recommandation est donc de ne pas dupliquer le POS dans le noyau minimal. Une donnée morphologique spécifique à la surface peut rester dans les traits si elle apporte une information distincte.

### `morph_features_json`

Utile, mais non indispensable au premier lookup.

Ce champ pourrait représenter des traits standardisés :

```json
{
  "Number": "Plur",
  "Person": "3",
  "Tense": "Pres",
  "Mood": "Ind"
}
```

Avantages :

- souplesse entre langues ;
- compatibilité possible avec Universal Dependencies ;
- intérêt direct pour le tamis 6 ;
- absence d'une large série de colonnes nullable.

Risques :

- valeurs hétérogènes si aucun vocabulaire n'est imposé ;
- validation plus difficile ;
- requêtes analytiques moins simples ;
- une même surface peut correspondre à plusieurs ensembles de traits.

La présence de traits dans une ligne persistante ne doit pas affirmer que ces traits valent pour toute occurrence. Les formes syncrétiques peuvent partager une surface tout en portant plusieurs analyses.

Trois choix resteront à arbitrer :

- une ligne par mapping surface → lemme, avec plusieurs analyses possibles dans le JSON ;
- plusieurs lignes distinguées par leurs traits ;
- aucun trait persistant au début, le moteur les calculant dans le contexte.

Pour la simplicité V0, le troisième choix ou un JSON nullable paraît le plus prudent.

### `status`

Très pertinent. Il permet de séparer connaissance utilisable et hypothèse.

Vocabulaire conceptuel possible :

```text
PROPOSED
VALIDATED
REJECTED
ARCHIVED
```

- `PROPOSED` : résultat d'un moteur ou d'un import, non prioritaire pour l'analyse publique ;
- `VALIDATED` : mapping approuvé et utilisable avant le moteur dynamique ;
- `REJECTED` : proposition fausse conservée éventuellement pour éviter sa répétition ;
- `ARCHIVED` : mapping ancien ou suspendu, conservé pour traçabilité.

Ces valeurs sont illustratives et devront être discutées avant tout SQL.

### `source_label`

Pertinent pour l'explicabilité, mais un simple libellé peut devenir insuffisant.

Exemples :

```text
manual_admin
stanza_fr_model_x
udpipe_es_treebank_y
teacher_text_import
```

À terme, la provenance utile comprendrait aussi :

- moteur ;
- version du moteur ;
- modèle ou treebank ;
- date de proposition ;
- mode de validation.

À faible volume, un `source_label` conventionnel peut suffire au départ si sa syntaxe est documentée.

### `confidence`

Utile pour trier les propositions, avec prudence.

Les scores de moteurs différents ne sont pas nécessairement comparables ni calibrés. Une confiance de `0.95` ne signifie pas la même chose selon les outils.

Une validation humaine et une confiance moteur sont également deux notions différentes. Le statut doit primer sur le score :

```text
VALIDATED à confiance modeste
```

peut être plus fiable opérationnellement qu'une proposition automatique non relue à `0.99`.

### `created_at`

Pertinent et peu ambigu. Il date la création du mapping dans Dico-IC.

### `seen_count` et `last_seen_at`

Utiles pour l'observation, mais ils introduisent la principale tension architecturale.

Si chaque appel à `POST /analysis` met à jour ces champs :

- l'endpoint effectue une écriture ;
- deux analyses identiques ne sont plus sans effet ;
- la charge transactionnelle augmente ;
- les usages Seven Sieves deviennent une forme de télémétrie ;
- l'origine et la confidentialité des observations doivent être précisées ;
- le principe stateless est affaibli.

Ces compteurs ne doivent donc pas être mis à jour directement dans le chemin de `POST /analysis`.

## 5. Que pourrait signifier « observé » ?

Le terme doit être défini avant le schéma. Plusieurs sémantiques sont possibles.

### Option 1 — observation runtime Seven Sieves

Chaque occurrence analysée incrémente un compteur.

Avantage : mesure fidèle de l'usage réel.

Inconvénient : écritures dans le chemin stateless, télémétrie implicite, répétitions artificielles lorsqu'un même texte est rechargé.

Cette option est déconseillée pour la première version.

### Option 2 — observation dans un texte explicitement soumis à l'admin

L'assistant IA Texte ou un futur outil admin analyse un texte de préparation. Les surfaces y sont regroupées, puis certaines sont proposées comme mappings.

Avantages :

- action explicite ;
- pas d'écriture par Seven Sieves ;
- corpus pédagogiques réels ;
- validation en lot possible.

Cette option est la plus cohérente avec le projet actuel.

### Option 3 — compteur d'acceptations administratives

`seen_count` compte le nombre de lots ou textes admin dans lesquels le mapping a été confirmé, et non chaque occurrence apprenante.

Avantage : sémantique plus stable et moins sensible aux rechargements.

Inconvénient : ce n'est pas un compteur d'usage Seven Sieves ; son nom doit être explicite.

### Option 4 — télémétrie séparée et optionnelle

Une future couche d'analytics, séparée de la connaissance linguistique, agrège anonymement des usages.

Avantage : séparation propre des responsabilités.

Inconvénient : complexité injustifiée à court terme.

### Recommandation

Pour une première évolution, deux choix sont prudents :

1. omettre `seen_count` et `last_seen_at` du noyau minimal ;
2. ou leur donner une sémantique strictement administrative, mise à jour seulement lors d'un import ou d'une validation explicite.

Ils ne doivent pas signifier implicitement « nombre de fois vu par des apprenants ».

## 6. Noyau conceptuel minimal

Sans proposer de SQL, le noyau le plus simple serait :

```text
id
lexical_form_id
surface_form
normalized_surface
status
source_label
confidence_score
created_at
```

Éléments optionnels après expérimentation :

```text
morph_features_json
updated_at
validated_at
admin_seen_count
last_admin_seen_at
source_metadata
notes
```

Éléments probablement dérivables et donc à ne pas recopier sans besoin démontré :

```text
language_code
part_of_speech
```

Cette séparation réduit le risque d'incohérence et garde la table comme simple index morphologique vers le lemme.

## 7. Ambiguïté et contraintes d'unicité

Une surface ne mène pas toujours à un seul lemme.

Exemples génériques :

- homographes appartenant à plusieurs catégories ;
- formes verbales identiques issues de plusieurs analyses ;
- graphies sans diacritiques qui fusionnent après normalisation ;
- variantes régionales ou lexicalisées.

Il ne faudrait donc pas imposer conceptuellement :

```text
UNIQUE(normalized_surface)
```

Le même `normalized_surface` doit pouvoir mener à plusieurs `lexical_form_id`.

Une contrainte de dédoublonnage plus raisonnable porterait sur l'identité du mapping, par exemple :

```text
surface normalisée + lemme cible + analyse éventuelle
```

Le détail dépendra du choix fait pour `morph_features_json`.

Lors du lookup, l'API pourrait recevoir plusieurs cibles :

```text
surface
→ candidat A VALIDATED
→ candidat B VALIDATED
```

Le contexte et le moteur dynamique classeraient alors les candidats. En cas d'ambiguïté persistante, l'API devrait rester prudente plutôt que choisir arbitrairement.

## 8. Pipeline recommandé

### Chemin de lecture de `POST /analysis`

```text
1. tokeniser le texte et conserver les offsets
2. chercher les tokens correspondant exactement à un lemme
3. chercher par lot les mappings VALIDATED des autres surfaces
4. résoudre les ambiguïtés simples avec langue, POS et contexte
5. envoyer les surfaces non résolues au moteur dynamique
6. rechercher les lemmes obtenus dans lexical_form
7. générer les enrichissements sur les tokens originaux
8. renvoyer warnings et provenance
```

Ce chemin reste en lecture seule.

### Chemin de contribution

```text
texte soumis explicitement dans Dico-IC Admin
    ↓
lemmatisation dynamique
    ↓
regroupement des surfaces et propositions
    ↓
validation humaine sélective
    ↓
création ou mise à jour de mappings
```

Ce chemin est distinct de Seven Sieves et assumé comme une opération d'administration.

## 9. Priorité entre les sources

Ordre recommandé :

```text
1. correspondance exacte avec lexical_form
2. mapping inflected_form VALIDATED
3. moteur dynamique contextuel
4. mapping PROPOSED seulement comme indice interne
5. aucun résultat plutôt qu'un mapping REJECTED ou ambigu non résolu
```

Un mapping validé devrait normalement primer sur le moteur pour garantir la reproductibilité. Il faut toutefois prévoir un diagnostic lorsqu'un moteur récent le contredit.

Les conflits ne doivent pas être écrasés automatiquement : ils deviennent des objets de revue admin.

## 10. Cas concrets

### `organizaciones → organización`

Cas favorable au stockage attesté :

- mapping relativement peu ambigu dans un texte espagnol ;
- lemme déjà utile au tamis 1 ;
- nombre pluriel intéressant pour le tamis 6 ;
- finale du lemme utile aux tamis 3 et 7.

Une fois validé, le mapping évite de relancer le moteur pour ce cas et rend l'analyse reproductible.

### `útiles → útil`

Cas utile, mais la normalisation supprime les accents :

```text
útiles → utiles
útil   → util
```

La langue portée par le lemme cible est indispensable. La surface originale doit être conservée pour l'explication.

### `utiles → utile`

En français, le mapping peut viser l'adjectif `utile`. Le contexte reste important, car une surface peut être homographe ou correspondre à plusieurs usages.

Il ne faut pas fusionner le mapping français avec le mapping espagnol `útiles → útil` sous prétexte que leurs formes normalisées se ressemblent.

### `élèves → élève`

Le mapping nominal est utile, mais la surface illustre l'ambiguïté potentielle entre catégories ou analyses selon le contexte.

La table peut enregistrer que le mapping vers le lemme nominal est possible et validé. Elle ne doit pas nécessairement affirmer que chaque occurrence future de `élèves` est nominale sans regarder la phrase.

### `mangent → manger`

Cas particulièrement intéressant :

- accès au lemme verbal ;
- traits personne, nombre, temps et mode utiles ;
- forme susceptible de revenir dans plusieurs textes ;
- coût faible d'un mapping validé.

Les traits contextuels peuvent rester calculés dynamiquement même si le lien surface → lemme est mémorisé.

## 11. Impact sur Seven Sieves

Seven Sieves ne devrait pas connaître l'existence de la table.

Son flux reste :

```text
texte
→ POST /analysis
→ tokens originaux
→ enrichissements
```

Le backend peut utiliser un mapping validé comme provenance interne. Le contrat public actuel peut rester inchangé.

Une extension future facultative pourrait exposer :

- lemme résolu ;
- traits morphologiques ;
- source `validated_mapping` ou `dynamic_lemmatizer` ;
- confiance ;
- ambiguïtés.

Cette extension ne serait nécessaire que si Seven Sieves doit afficher explicitement la résolution morphologique.

## 12. Impact sur Dico-IC Admin

L'admin deviendrait le lieu naturel de validation, sans devenir une plateforme d'annotation exhaustive.

Workflow minimal possible à terme :

```text
surface observée | langue | lemme proposé | fréquence admin | confiance
    ↓
valider | corriger | rejeter | archiver
```

Principes recommandés :

- regrouper les occurrences identiques ;
- ne pas montrer chaque token séparément ;
- prévalider les cas sûrs mais exiger une action humaine avant persistance ;
- permettre la correction du lemme cible ;
- montrer un contexte court seulement pendant la revue ;
- ne pas stocker automatiquement le texte complet ;
- prioriser les propositions fréquentes, contradictoires ou utiles aux tamis.

## 13. Impact sur les assistants IA

### Assistant Domaine

Inchangé. Il continue à proposer des lemmes canoniques.

### Assistant Texte

Il bénéficie directement de la couche :

1. lookup des lemmes ;
2. lookup des mappings validés ;
3. lemmatisation dynamique ;
4. seuls les concepts réellement absents deviennent candidats lexicaux.

Il pourrait ultérieurement proposer des mappings de flexion séparés des candidats `lexical_entry`.

### Assistant Relations

Inchangé. Il continue à travailler sur les `lexical_form` canoniques et ne voit pas les formes fléchies comme des nœuds relationnels.

### Place de l'IA

L'IA peut aider à proposer ou expliquer un mapping, mais le moteur morphologique structuré et la validation humaine doivent rester prioritaires pour la connaissance persistante.

## 14. Impact sur les tamis

### Tamis 1 et 2

Gain direct : une surface connue atteint immédiatement le lemme, ses cognats et sa famille pan-romane.

### Tamis 3

Le lemme permet d'appliquer les correspondances au bon niveau, tandis que la surface reste disponible pour observer les variations.

### Tamis 4

La surface reste centrale. Le mapping apporte un contexte lexical sans effacer la graphie réellement rencontrée.

### Tamis 5

Le POS du lemme fournit un premier indice. Le rôle syntaxique exact reste contextuel.

### Tamis 6

Le mapping et les traits morphologiques peuvent expliquer nombre, genre, personne, temps et mode. C'est le tamis qui bénéficie le plus de `morph_features_json`, si ces traits sont suffisamment standardisés.

### Tamis 7

La distinction surface/lemme aide à séparer :

- suffixe lexical ou dérivationnel ;
- marque de pluriel ;
- terminaison verbale.

## 15. Avantages de la variante

- Modèle fidèle au faible volume réel.
- Stockage limité aux données pédagogiquement attestées.
- Lookup rapide et reproductible.
- Réduction des appels au moteur dynamique pour les cas connus.
- Corrections humaines capitalisées.
- Exceptions irrégulières représentables.
- `lexical_form` reste canonique.
- `form_relation` reste sémantiquement propre.
- Seven Sieves et `/analysis` peuvent rester stateless.
- Possibilité d'archiver sans supprimer immédiatement la connaissance.
- Bon support de l'architecture hybride progressive.

## 16. Risques

### Pollution par validation trop facile

Même à faible volume, accepter automatiquement les sorties du moteur produirait une base de confiance incertaine.

### Ambiguïté masquée

Un mapping validé ne signifie pas que chaque occurrence de la surface possède ce lemme. Le contexte doit rester disponible pour départager plusieurs candidats.

### Redondance

Recopier langue, POS ou autres attributs canoniques augmente le risque de divergence.

### JSON morphologique incontrôlé

Sans vocabulaire commun, les traits deviennent difficiles à comparer et exploiter.

### Compteurs trompeurs

`seen_count` peut compter des occurrences, des textes, des analyses répétées ou des validations. Sans définition, il n'est pas interprétable.

### Écriture implicite

Mettre à jour `last_seen_at` dans `/analysis` compromet le principe read-only et introduit une télémétrie non assumée.

### Dépendance au corpus pilote

Les formes attestées refléteront les textes choisis par les premiers enseignants. Elles ne constituent pas une image complète de la langue.

### Vieillissement des mappings

Un mapping validé peut devenir contesté après amélioration des modèles ou correction du lemme cible. L'archivage et la provenance sont donc utiles.

## 17. Comparaison avec la recommandation initiale

| Dimension | Rapport initial | Variante faible volume |
|---|---|---|
| Canon lexical | `lexical_form` | inchangé |
| Formes inédites | moteur dynamique | inchangé |
| Stockage persistant | sélectif, plutôt après expérimentation | sélectif mais introduit plus tôt |
| Contenu stocké | exceptions et mappings utiles | toutes les surfaces réellement attestées et validées jugées utiles |
| Priorité de lecture | mapping validé puis dynamique dans le pipeline cible | même ordre, plus fortement assumé |
| Risque de volume | considéré important si paradigmes | faible car aucun paradigme exhaustif |
| Administration | future et limitée | devient rapidement utile, toujours en lot |
| Compteurs d'usage | non centraux | intéressants mais séparés du runtime stateless |
| `/analysis` | aucune écriture | inchangé |

La variante n'est donc pas une Option A pure. Elle reste une Option D hybride, mais avec une table A **attestée et parcimonieuse**.

## 18. Éléments du rapport initial à réviser

Le rapport initial ne doit pas être considéré comme erroné. Plusieurs formulations gagneraient toutefois à être précisées lors d'une future révision documentaire.

### Réviser l'évaluation du coût de l'Option A

Le risque de volume doit être distingué selon deux stratégies :

- paradigmes complets : coût potentiellement élevé ;
- seules formes attestées : coût faible dans le contexte Dico-IC.

### Réviser « dynamique par défaut »

Pour une forme déjà validée, le mapping persistant devrait être le défaut. La lemmatisation dynamique devient le défaut seulement pour les surfaces inconnues ou ambiguës.

### Avancer le stockage persistant dans la trajectoire

Le rapport plaçait la décision de stockage après une expérimentation du moteur. Le faible volume justifie d'étudier plus tôt le noyau minimal, tout en conservant une phase de benchmark avant le SQL final.

### Ajouter la notion de forme attestée

Il faut distinguer explicitement :

- forme théoriquement générable ;
- forme rencontrée dans un corpus enseignant ;
- forme validée comme mapping utile ;
- occurrence précise, qui reste stateless.

### Ajouter la question des compteurs

Le rapport initial devrait signaler que `seen_count` et `last_seen_at` ne sont compatibles avec un `/analysis` stateless que si leur mise à jour se déroule dans un autre workflow.

### Éléments à ne pas réviser

- les lemmes restent canoniques ;
- `form_relation` ne doit pas représenter la flexion ;
- aucune écriture automatique dans `/analysis` ;
- le moteur dynamique reste nécessaire ;
- les ambiguïtés doivent être conservées ;
- la validation humaine précède la connaissance mutualisée.

## 19. Recommandation ajustée

La variante proposée est recommandée comme direction architecturale adaptée au projet, sous quatre conditions.

### Condition 1 — table de mappings, pas table de paradigmes

Ne stocker que les surfaces attestées et jugées utiles.

### Condition 2 — noyau minimal non redondant

Commencer conceptuellement par la cible, la surface, la normalisation, le statut, la provenance et la date. Dériver langue et POS du lemme.

### Condition 3 — aucune écriture depuis `/analysis`

Les mappings et compteurs éventuels doivent être alimentés par une action admin explicite ou un processus séparé.

### Condition 4 — ambiguïté autorisée

Une même surface normalisée doit pouvoir proposer plusieurs lemmes. Le contexte ou le moteur les départage.

La cible ajustée est donc :

```text
connaissance canonique : lexical_form
accès validé : inflected_form attestée
découverte : moteur de lemmatisation
validation : Dico-IC Admin
consommation : POST /analysis en lecture seule
```

## 20. Étapes de réflexion avant tout SQL

1. Définir précisément ce qui rend une forme « observée ».
2. Décider si les traits sont persistés ou seulement calculés.
3. Choisir un vocabulaire de statuts.
4. Définir les règles de priorité et de conflit.
5. Construire un corpus pilote quadrilingue.
6. Comparer Stanza, UDPipe et spaCy sur ce corpus.
7. Estimer le nombre réel de mappings distincts produits par quelques textes.
8. Tester les ambiguïtés et collisions de normalisation.
9. Décider si les compteurs administratifs apportent une valeur réelle.
10. Spécifier seulement ensuite le schéma, les index et les endpoints admin.

## 21. Questions ouvertes

- Une forme `PROPOSED` peut-elle être utilisée avec un warning, ou uniquement après validation ?
- Qui valide : enseignant, administrateur ou référent linguistique ?
- `REJECTED` doit-il être conservé pour éviter une nouvelle proposition identique ?
- Les traits morphologiques doivent-ils décrire le mapping possible ou une analyse contextuelle précise ?
- Un mapping validé peut-il avoir plusieurs ensembles de traits ?
- Que compte exactement `seen_count` : occurrences, textes, imports ou validations ?
- Faut-il archiver automatiquement, ou seulement suggérer l'archivage ?
- Comment réagir si un moteur contredit un mapping validé ?
- Les noms propres et données potentiellement sensibles doivent-ils être exclus des propositions ?
- Quelle fréquence minimale justifie une validation persistante ?

## Conclusion

Dans le contexte réel de Dico-IC, une table dédiée aux formes fléchies attestées est non seulement compatible avec l'architecture hybride, mais probablement utile assez tôt.

Le changement essentiel est de ne pas penser cette table comme une base morphologique exhaustive. Elle serait un petit index de mappings validés issus des textes pédagogiques réellement travaillés.

La lemmatisation dynamique conserve son rôle : découvrir et analyser les surfaces inconnues. La persistance conserve le sien : capitaliser les cas utiles, les exceptions et les corrections humaines.

Le point à protéger absolument est la séparation des responsabilités : Seven Sieves consomme, `/analysis` lit, Dico-IC Admin valide et écrit. Les compteurs d'observation ne doivent pas introduire discrètement une télémétrie dans le chemin stateless.
