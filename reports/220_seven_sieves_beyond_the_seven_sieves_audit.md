# Mission 220 — Audit historique et fonctionnel de l’espace « Au-delà des sept tamis »

Date : 2026-08-19  
Nature : audit strictement en lecture seule  
Projet principal : `prototypes/08-dico-seven-sieves`  
Version applicative : inchangée  
Validation humaine : non réalisée

## 1. Conclusion exécutive

L’audit ne retrouve aucun « huitième tamis » réellement créé, nommé ou numéroté. Il retrouve une piste plus nuancée, développée le 21 juin 2026 dans une variante isolée :

1. quatre explications grapho-phonétiques locales rattachées au tamis 4 existant ;
2. un rendu du pluriel rattaché au tamis 6 seulement lorsque Dico-IC le prouve ;
3. une aide discursive explicitement sans numéro de tamis.

Cette troisième piste a été transformée en architecture durable : `connector_help` alimente aujourd’hui 27 « Aides à la lecture » multilingues, séparées des sept tamis et masquées par défaut. Elle ne doit donc pas être dupliquée sous une nouvelle rubrique.

Les huit `ic_feature` sont bien réelles, mais elles ne constituent pas un catalogue prêt à l’emploi : elles n’ont ni statut, ni date, ni libellé pédagogique, ni description, ni vocabulaire contrôlé. Elles ne sont chargées ni par l’analyse, ni par une route de détail, ni par Seven Sieves. Trois risques de faux amis doublonnent moins précisément trois relations `FALSE_FRIEND` existantes. Leur seule consommation actuelle est un compteur agrégé dans le résumé d’administration.

Les huit relations `FALSE_FRIEND` sont plus prometteuses, mais `POST /analysis` les charge puis les exclut explicitement des résultats du tamis 1, qui n’accepte que les types commençant par `COGNATE`. Elles ne sont donc ni transportées ni affichées. Les transformer en alertes exige une décision de contrat, un traitement contextuel prudent et une validation humaine ; ce n’est pas un ajout sans risque avant la soutenance.

Le terrain documente clairement l’importance des images, gestes, audio, vidéo, contexte et culture. En revanche, l’attribution supposée à Raquel n’est pas vérifiable localement : sa fiche dit « à vérifier », « entretiens : à compléter » et aucun entretien PDF Raquel n’existe. La demande ne doit pas lui être attribuée sans nouvelle source.

### Recommandation nette

**Scénario A : ne rien ajouter avant la soutenance.** Conserver les sept tamis et les Aides à la lecture actuelles. Présenter « Au-delà des sept tamis » comme une perspective issue du terrain, pas comme une fonctionnalité déjà mûre. Aucune Mission 221 d’implémentation n’est raisonnable avant la soutenance.

## 2. Périmètre et méthode

### Sources inspectées

- code, tests, SQL, documents et rapports de `IC-Lab-Next/prototypes/08-dico-seven-sieves` ;
- copie historique `IC-Lab/prototypes/08-dico-seven-sieves` ;
- historique Git disponible dans les deux dépôts ;
- variante `index-api-live-pedagogical-hints-0.1.html` et son script ;
- MariaDB réelle par `SELECT` seulement ;
- réponses HTTP réelles de `POST /analysis` et de la route d’administration des relations ;
- synthèse d’entretiens de Dico-IC ;
- quinze PDF d’entretiens locaux, avec extraction textuelle ciblée et contrôle visuel des pages pertinentes de Roxana et Richard.

### Distinctions appliquées

Le rapport sépare systématiquement :

- fait actuel observé ;
- trace historique ;
- demande terrain ;
- proposition de produit ;
- validation humaine encore absente.

### Écritures autorisées seulement

Seuls le présent rapport et ses cinq artefacts ont été créés. Aucun code, test, seed, contrat, donnée, version ou service n’a été modifié.

### Arbitrage documentaire

Le mode d’audit général de `AGENTS.md` renvoie normalement les résultats vers `IC-Lab-Next-Technical`. La mission 220 autorise explicitement son rapport et ses artefacts sous `IC-Lab-Next/reports/`. Cette instruction plus spécifique a été appliquée uniquement aux six chemins déclarés.

## 3. État initial

- Git : propre.
- Rapport : numéro maximal existant 219 ; chemin 220 libre avant création.
- Serveur Dico-IC : port 3000, PID 54808, déjà actif.
- MariaDB Docker : port 3306, déjà actif.
- phpMyAdmin Docker : port 8080, déjà actif.
- Aucun processus lancé ou arrêté par la mission.

### Empreintes initiales MariaDB

Méthode : `SELECT * ORDER BY id`, sérialisation JSON déterministe par le client MariaDB du projet, SHA-256.

| Table | Lignes | SHA-256 |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 27 | `a94c3b333830c15169d7bf31758c936912b6ac3b4b002fb600750c27c0271c11` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

## 4. Histoire exacte retrouvée

Chronologie détaillée : [inventaire des variantes historiques](assets/220_seven_sieves_beyond_the_seven_sieves_audit/historical_variants_inventory.md).

### Première trace matérielle

Les premières données complémentaires sont les `ic_feature` du 22 avril 2026 : trois traits dans `seed_data.sql`, puis cinq autres dans `seed_data_v2.sql`. Elles précèdent les variantes d’interface et montrent une intention de stocker transparence, similarité et risque de faux ami, sans méthode de calcul stabilisée.

### Variante du 21 juin

La suite factuelle est reconstruite par six rapports dont les métadonnées sont cohérentes dans les copies IC-Lab et IC-Lab-Next :

| Heure locale observée | Trace |
|---|---|
| 16:02 | un indice local `ñ / gn` pour le tamis 4 |
| 16:14 | extension à `-ción`, `-dad`, `-mente` |
| 16:48 | refus honnête d’inventer un pluriel de tamis 6 |
| 17:00 | rendu du pluriel après présence d’un payload `inflected_form` validé |
| 17:46 | catalogue local d’aides discursives, séparé des tamis |
| 18:26 | objet persistant `connector_help` dans Dico-IC |

Ces heures sont des métadonnées de fichiers, pas des timestamps de commit. Le dossier Seven Sieves est non suivi dans l’ancien dépôt IC-Lab. La première preuve Git est l’import de consolidation `f063ecf` du 10 juillet.

### Comportement réel de la variante

La page contient deux couches :

- un ancien script massif conservé comme `type="text/plain"`, donc non exécuté ;
- un script externe actif qui appelle l’API et ajoute quatre heuristiques locales du tamis 4 au rendu.

L’ancien script neutralisé contient lexique, transformations, graphies, signaux morphologiques et rôles syntaxiques codés à la main. Il constitue une archive de conception, pas une fonction active.

Le script externe actif étiquette ses quatre règles comme `source.kind = heuristic` et `Prototype pédagogique local Seven Sieves`. Cette transparence réduit le risque de les confondre avec Dico-IC, mais leur catalogue reste non validé et limité à l’espagnol.

### Abandon, remplacement et intégration partielle

- Les heuristiques locales du tamis 4 restent dans la variante expérimentale ; elles ne sont pas chargées par les pages enseignant/apprenant officielles.
- Le pluriel validé est devenu un enrichissement normal du tamis 6 : intégration conceptuelle réussie, pas espace transversal.
- L’aide discursive locale a été remplacée par `connector_help` et `pedagogical_enrichments` : intégration réussie hors tamis.
- Le 19 août, les rôles ont été séparés, les aides rendues volontaires et masquées, cinq langues activées, 27 lignes seedées et le cycle d’analyse sécurisé (`057e9ad`, `9d54eed`, `dfbed23`, `72e9f36`, `44ca8fe`).

### État actuel

L’entrée officielle `index-api-live-0.1.html` redirige vers `index-teacher-0.1.html`. L’apprenant utilise `index-student-0.1.html` V0.1.3. La variante historique reste accessible par URL directe, mais aucun menu fonctionnel courant ne la choisit comme parcours canonique.

## 5. Audit exhaustif des huit `ic_feature`

Inventaire machine-readable : [`ic_feature_inventory.json`](assets/220_seven_sieves_beyond_the_seven_sieves_audit/ic_feature_inventory.json).

### Schéma réel

```text
id
form_id → lexical_form(id), obligatoire, ON DELETE CASCADE
feature_type
value_num
value_text
source_label
confidence_score
notes
```

Champs demandés mais absents du schéma : statut, dates, libellé, description, langue directe et entrée directe. Langue et entrée sont calculées par jointure via `lexical_form`.

Il n’existe aucune contrainte d’unicité, aucun contrôle du vocabulaire `feature_type`, aucune règle imposant exactement une valeur numérique ou textuelle et aucun cycle de validation.

### Inventaire condensé

| ID | Forme | Langue | Type | Valeur | Confiance | Provenance |
|---:|---|---|---|---:|---:|---|
| 1 | fenómeno | ES | `GRAPHIC_SIMILARITY` | 0,93 | 0,90 | `manual_seed` |
| 2 | fenómeno | ES | `TRANSPARENCY_SCORE` | 0,91 | 0,90 | `manual_seed` |
| 3 | phenomenon | EN | `TRANSPARENCY_SCORE` | 0,78 | 0,80 | `manual_seed` |
| 4 | información | ES | `TRANSPARENCY_SCORE` | 0,96 | 0,95 | `manual_seed_v2` |
| 5 | informazione | IT | `TRANSPARENCY_SCORE` | 0,94 | 0,95 | `manual_seed_v2` |
| 6 | college | EN | `FALSE_FRIEND_RISK` | `HIGH` | 0,98 | `manual_seed_v2` |
| 7 | demand | EN | `FALSE_FRIEND_RISK` | `HIGH` | 0,98 | `manual_seed_v2` |
| 8 | sensitive | EN | `FALSE_FRIEND_RISK` | `HIGH` | 0,97 | `manual_seed_v2` |

Toutes les notes sont nulles. Le schéma ne possède ni statut ni dates.

### Classification

- 5 traits numériques lexicaux, dont 1 graphique et 4 scores de transparence ;
- 3 catégories lexicales de risque pédagogique de faux ami ;
- aucun trait culturel, contextuel, typographique riche, paralinguistique ou multimodal ;
- aucune donnée d’occurrence : tout est attaché à un lemme/formulaire lexical, jamais à un contexte de phrase.

### Dépendances et redondances

La seule dépendance structurée est `form_id`. La suppression d’une forme supprimerait ses traits en cascade.

Les cinq scores numériques portent sur des formes déjà reliées par des relations explicites. Les trois `FALSE_FRIEND_RISK` correspondent aux relations :

- `collège ↔ college`, relation 64 ;
- `demander ↔ demand`, relation 58 ;
- `sensible ↔ sensitive`, relation 59.

La relation est plus informative, car elle nomme les deux formes trompeuses. Le trait unilatéral `HIGH` ne dit pas avec quelle langue ni quelle forme existe le risque.

### Consommateurs réels

| Étape | Consommation de `ic_feature` |
|---|---|
| Repository d’analyse | aucune requête de chargement |
| Route publique | aucune |
| Route admin de détail | aucune |
| Résumé admin | compteur 8 et libellé de rôle seulement |
| `POST /analysis` | aucune utilisation |
| Session | aucun transport |
| Enseignant | aucun affichage hors compteur global du modèle admin |
| Apprenant | aucun |
| Tests | compteurs, conservation par migrations et documentation ; aucun comportement pédagogique |

Le contrat documente `ic_feature` comme valeur possible de `source.kind`, mais l’implémentation actuelle ne produit aucun enrichissement de cette provenance. C’est une possibilité contractuelle non exercée, pas une fonction active.

### Pertinence actuelle

Les lignes sont utiles comme témoins historiques du modèle, pas comme données prêtes à être affichées. Les activer automatiquement serait scientifiquement fragile : méthode des scores inconnue, absence de statut, redondance et aucune validation de contexte.

## 6. Cartographie des enrichissements actuels

Artefact structuré : [`enrichment_families_map.json`](assets/220_seven_sieves_beyond_the_seven_sieves_audit/enrichment_families_map.json).

```text
Dico-IC / relations / règles / formes / aides / traits
                           ↓
                      POST /analysis
                           ↓
       ┌───────────────────┼────────────────────┐
       │                   │                    │
sept tamis numérotés   aides à la lecture   compléments éventuels
tokens.enrichments     pedagogical_          aucun canal actuel
sieve_id = 1..7        enrichments
                       sans sieve_id
```

### Les sept tamis

Ils restent le cœur. Les sources effectivement émises sont :

- `form_relation`, uniquement cognats, pour le tamis 1 ;
- `lexical_form` pour les familles pan-romanes ;
- `pattern_rule` pour transformations/affixes ;
- `inflected_form` pour le pluriel validé ;
- heuristiques serveur explicitement étiquetées pour graphie, syntaxe et morphosyntaxe.

Chaque résultat appartient à un tamis par `sieve_id`.

### Les Aides à la lecture

- table `connector_help` ;
- 27 lignes, cinq langues ;
- sortie `pedagogical_enrichments` sans `sieve_id` ;
- expressions multi-token ;
- masquées par défaut ;
- fonctionnelles et indépendantes du tamis actif.

Elles occupent déjà une partie légitime de l’espace « transversal ». Un nouveau panneau ne doit pas les recopier.

### Relations lexicales

Les 86 relations comprennent 54 `COGNATE_STRONG`, 24 `COGNATE_WEAK` et 8 `FALSE_FRIEND`. Le repository les charge pour les formes reconnues. L’analyse ne transforme en enrichissement de tamis 1 que les types commençant par `COGNATE`.

### `ic_feature`

Stockées, comptées, mais non chargées ni transportées.

### Anciennes heuristiques locales

Les quatre règles ES de la variante sont calculées dans le frontend, fusionnées seulement au rendu et absentes du parcours officiel. Le gros catalogue ancien dans le HTML est neutralisé par `type="text/plain"`.

## 7. Faux amis

### Huit relations réelles

| ID | Paire | Score | Confiance | Note |
|---:|---|---:|---:|---|
| 25 | actuellement ↔ actualmente | 0,10 | 0,98 | sens différent du français actuel |
| 26 | librairie ↔ library | 0,05 | 0,99 | bookshop, pas library |
| 27 | assister ↔ assist | 0,08 | 0,98 | être présent, pas aider |
| 28 | préservatif ↔ preservative | 0,05 | 0,98 | protection, pas additif |
| 29 | large ↔ largo | 0,10 | 0,96 | largeur, pas longueur |
| 58 | demander ↔ demand | 0,08 | 0,98 | ask/request, pas demand |
| 59 | sensible ↔ sensitive | 0,10 | 0,97 | raisonnable, pas émotionnel |
| 64 | collège ↔ college | 0,05 | 0,99 | établissement secondaire, pas supérieur |

Toutes sont symétriques et de provenance manuelle.

### Exploitabilité actuelle

- visibles et recherchables par `/admin/form-relations?search=FALSE_FRIEND` : 8 résultats réels ;
- chargées par le repository d’analyse lorsque la forme apparaît ;
- exclues par `analysis.js`, qui exige `relation_type.startsWith("COGNATE")` ;
- aucune route publique dédiée ;
- aucun transport dans la session ;
- aucun affichage apprenant.

Essais réels :

- FR `Actuellement, la librairie est large.` vers EN, tamis 1 : HTTP 200, aucun enrichissement ;
- EN `The college demand is sensitive.` vers FR, tamis 1 : HTTP 200, aucun enrichissement.

### Tamis ou complément ?

Un faux ami ne relève pas naturellement d’un huitième tamis. Il peut être vu comme contre-indice du tamis 1, mais son rôle pédagogique est transversal : avertir qu’une ressemblance séduisante peut tromper. Le meilleur classement futur doit être validé avec Christian. Si un affichage est retenu, une rubrique complémentaire séparée est préférable à un tamis 8.

### Risques

- la paire lexicale ne prouve pas que le sens trompeur est activé dans la phrase ;
- une alerte systématique peut casser une inférence correcte dans un contexte spécialisé ou diachronique ;
- les notes actuelles sont courtes et non localisées ;
- un score faible encode ici une faible équivalence, pas nécessairement une probabilité de faux ami ;
- l’élève peut sur-apprendre l’alerte et ignorer le contexte.

Validation humaine obligatoire avant transformation en aide : fonction, formulation, exemples positifs/négatifs et prudence contextuelle.

## 8. Demandes du terrain

Preuves détaillées : [`field_requests_evidence.md`](assets/220_seven_sieves_beyond_the_seven_sieves_audit/field_requests_evidence.md).

### Attribution Raquel

Non prouvée. La fiche `prototypes/07-informaticaire/data.js` de l’ancien IC-Lab indique « à vérifier », « entretiens : à compléter » et « contexte de citation à préciser ». Aucun PDF Raquel n’est présent. Il serait incorrect d’affirmer qu’elle a demandé les quatre catégories mentionnées dans la mission.

### Preuves positives

- Roxana : image, recherche sur smartphone, mimique, gestes et contexte réel comme médiation ; débat sur la légitimité de l’image.
- Richard : lecture avec/sans audio, images de contes, vidéos/transcriptions, faux amis, marqueurs temporels, aide orale ou écrite.
- Thomas : vidéo, texte, image, capsules audio, supports culturels et affectifs.
- Laura : H5P vidéo, audios/vidéos authentiques, contenus culturels et formules orales.
- Christian : richesse des interactions vidéo, avec exigences de consentement, bippage, floutage et droit à l’image.
- Kátia : oral important, mais fragilité technique des ressources audio et des migrations.
- Synthèse Dico-IC : aide à comprendre, transformations, connecteurs, reformulations, oral et multimodalité, avec validation humaine.

### Ce qui n’est pas prouvé

Aucune source attribuée ne demande précisément une analyse automatique du gras, de l’italique, de la couleur, de la mise en page ou de la ponctuation expressive. Ces éléments restent des hypothèses plausibles, pas des demandes terrain établies.

## 9. Capacités texte, visuel et multimodal

| Catégorie | Disponible aujourd’hui | Possible avec contrat actuel | Exigence supplémentaire | Avant soutenance |
|---|---|---|---|---|
| Texte brut | oui, copie exacte jusqu’à 20 000 unités UTF-16 | oui | aucune | déjà actif |
| Casse | surface conservée, lookup normalisé | règle prudente possible | modèle/provenance si interprétation | ne pas ajouter |
| Ponctuation | tokens de ponctuation conservés | repérage technique possible | sémantique et validation pour « expressive » | ne pas ajouter |
| Espaces/retours | conservés dans le texte et offsets | reconstruction possible | aucun pour affichage ; modèle pour interprétation | déjà suffisant |
| Contexte lexical/phrastique | texte entier disponible | règles locales possibles mais fragiles | désambiguïsation et preuve | différer |
| Gras/italique/couleur/police | perdus : entrée textarea/texte brut | non | nouveau contrat de document riche | hors périmètre |
| Mise en page structurée | seulement caractères et sauts de ligne | très limitée | HTML/DOM ou modèle de document | hors périmètre |
| Images | non | non | média, ancrages, provenance, droits | après soutenance |
| Audio | non | non | upload/URL, segmentation, transcription, modèle acoustique | après soutenance |
| Vidéo | non | non | contrat vidéo, temps, droits, articulation Proto05 | après soutenance |
| Gestes/mimique | non | non | annotation temporelle/multimodale | recherche ultérieure |
| Prosodie | non | non | audio et analyse acoustique | recherche ultérieure |
| Contexte culturel | non structuré | texte libre seulement | modèle, source et validation humaine | différer |

Seven Sieves ne doit pas prétendre analyser ce que le texte brut ne transporte pas.

## 10. Définition prudente proposée

### Définition

« Au-delà des sept tamis » serait, après validation, un espace facultatif de repères complémentaires traçables qui aident à interpréter un texte ou une situation sans appartenir au cadre historique des sept tamis.

Il ne devrait accueillir qu’une famille à la fois, avec :

- type stable ;
- occurrence exacte ;
- provenance ;
- niveau de confiance ;
- formulation et prudence validées ;
- possibilité de ne rien afficher ;
- activation volontaire.

### Ce qu’il ne doit pas devenir

- un huitième tamis ;
- un entrepôt de toutes les colonnes disponibles ;
- un doublon des Aides à la lecture ;
- un écran de promesses multimodales non fonctionnelles ;
- une résurrection invisible des heuristiques locales ;
- un panneau ouvert par défaut.

### Vocabulaire public proposé, non implémenté

- titre : **Au-delà des sept tamis** ;
- introduction : « D’autres repères documentés peuvent compléter l’exploration, sans appartenir aux sept tamis. » ;
- bouton : **Voir les repères complémentaires** ;
- distinction : « Les Aides à la lecture expliquent les connecteurs du texte ; les repères complémentaires signaleraient d’autres phénomènes validés. » ;
- rappel : « Ces repères ne sont ni un tamis supplémentaire ni une étape obligatoire. »

## 11. Comparaison des scénarios

Échelle qualitative : très favorable, favorable, moyen, défavorable, très défavorable.

| Critère | A — Rien avant soutenance | B — Démonstrateur minimal séparé | C — Chantier après soutenance |
|---|---|---|---|
| Valeur soutenance | très favorable : message clair | moyen : nouveauté mais distraction | faible immédiatement, forte perspective |
| Valeur pour Christian | favorable : bon sujet d’échange | moyen sans validation préalable | très favorable avec co-conception |
| Cohérence mémoire | très favorable : terrain → perspective | favorable si honnête | très favorable à long terme |
| Coût technique | très faible | moyen à élevé : contrat + session + UI | élevé mais planifiable |
| Risque régression | nul | réel sur cœur stabilisé | maîtrisable après gel |
| Dette | nulle | forte si payload provisoire | acceptable si modèle validé |
| Honnêteté scientifique | très forte | moyenne tant que les données restent fragiles | forte avec provenance/validation |
| Démo < 30 s | oui, par formulation orale | possible mais concurrence la démo actuelle | non pertinente maintenant |
| Surcharge apprenant | aucune | faible si masqué, mais nouveau contrôle | à étudier avec utilisateurs |
| Recommandation | **retenu** | non retenu avant soutenance | retenu comme perspective |

### Scénario A

Avantages : protège V0.1.3, garde la démonstration lisible, montre une démarche scientifique et ne crée aucune dette. Limite : aucune preuve visuelle nouvelle, compensée par une formulation orale forte.

### Scénario B

Le seul candidat relativement crédible serait un petit sous-ensemble de faux amis. Mais il faut encore : sélectionner les relations, valider les formulations, définir un enrichissement transversal, modifier analyse/session/UI et tester les faux positifs. Ce coût est disproportionné avant la soutenance.

Les `ic_feature` ne conviennent pas au démonstrateur : elles sont moins structurées et moins explicites que les relations. Les images/audio/gestes sont impossibles avec le contrat actuel.

### Scénario C

Le bon chantier post-soutenance commence par un modèle d’enrichissement complémentaire, la provenance, la validation humaine et un seul cas d’usage. Le multimodal doit progresser séparément, en articulation avec Proto05 et avec les contraintes éthiques des corpus.

## 12. Recommandation pour David

### Faire maintenant

- ne modifier ni Seven Sieves ni Dico-IC ;
- garder la démonstration sur les sept tamis et les Aides à la lecture ;
- préparer une phrase orale de 15–20 secondes ;
- si Christian est disponible, lui demander seulement si les faux amis doivent être conceptualisés comme contre-indice du tamis 1 ou complément transversal.

### Attendre

- tout affichage de faux amis ;
- toute exploitation de `ic_feature` ;
- tout modèle de contexte culturel ;
- tout contrat visuel, audio, vidéo, gestes ou prosodie ;
- toute nouvelle surface apprenante.

### Abandonner

- l’idée d’un huitième tamis ;
- l’activation automatique des huit `ic_feature` ;
- la remise en service silencieuse des heuristiques locales ;
- l’attribution à Raquel sans preuve ;
- un bouton factice promettant du multimodal.

### Échanges nécessaires

- Christian : statut pédagogique des faux amis et frontière avec le tamis 1 ;
- Sylvain : charge cognitive, vocabulaire et activation volontaire ;
- spécialistes/collègues concernés par les corpus : images, gestes, oral, culture et droit des médias ;
- Roxana, si possible : médiation par image et débat sur sa légitimité.

### Meilleur message oral pour la soutenance

> « Les sept tamis restent le cadre historique. Le terrain fait apparaître d’autres ressources — connecteurs, faux amis, images, gestes ou contexte culturel. Le prototype montre déjà une première extension maîtrisée avec les Aides à la lecture ; les autres restent des perspectives documentées, qui demanderont un contrat, des données traçables et une validation humaine. »

Ce message montre la possibilité sans exposer les recettes internes ni simuler une maturité inexistante.

## 13. Mission 221

Plan proposé : [`mission_221_candidate_plan.json`](assets/220_seven_sieves_beyond_the_seven_sieves_audit/mission_221_candidate_plan.json).

### Avant soutenance

Pas de Mission 221 d’implémentation. Une mission documentaire/orale seulement peut préparer la formulation et, au besoin, un schéma statique de perspective.

### Après soutenance

Si David autorise un chantier, le premier candidat est un sous-ensemble humainement validé de relations `FALSE_FRIEND`, jamais les `ic_feature` seules. Le plan exige un canal sans `sieve_id`, masqué par défaut, séparé des Aides à la lecture, avec tests de contexte et critères d’abandon stricts.

## 14. Contrôles réalisés

### Statique

- recherche exhaustive des termes de mission dans IC-Lab-Next et IC-Lab ;
- comparaison SHA-256 des variantes historiques ;
- historique Git et statut du dossier ancien ;
- inspection des routes, repository, analyse, session et pages actuelles ;
- inspection des rapports contemporains du 21 juin et des rapports 214–219 ;
- inspection des seeds et schémas.

### MariaDB et HTTP, lecture seule

- inventaire joint des 8 `ic_feature` ;
- `SHOW CREATE TABLE` de `ic_feature` et `form_relation` ;
- inventaire des 8 `FALSE_FRIEND` ;
- distributions des 86 relations ;
- recherche admin réelle : 8 faux amis ;
- trois appels `POST /analysis`, dont deux cas négatifs faux amis ;
- aucune requête SQL mutatrice.

### Tests automatisés ciblés

```text
node --test test/analysis.test.js test/seven-sieves-role-separation.test.js test/seven-sieves-analysis-lifecycle.test.js
```

Résultat : 37 tests réussis, 0 échec, 0 ignoré. Ils confirment notamment les sept familles d’enrichissement existantes, le pluriel sourcé, les aides multi-token, la séparation des rôles, le masquage par défaut des aides et la sûreté du cycle d’analyse. Ils ne couvrent aucun comportement `ic_feature` ni alerte `FALSE_FRIEND`, précisément parce que ces fonctions n’existent pas.

### Matériaux terrain

- extraction ciblée des quinze PDF disponibles ;
- lecture approfondie de Christian, Richard, Roxana, Thomas, Laura et Kátia ;
- rendu et inspection visuelle de Roxana p. 2 et Richard p. 3 ;
- suppression immédiate des quatre PNG temporaires.

## 15. Éléments non vérifiés

- aucun verbatim brut d’entretien ; les PDF sont des synthèses ;
- aucune source Raquel permettant l’attribution supposée ;
- aucune validation de Christian, Sylvain, Roxana ou d’un autre spécialiste ;
- aucune recette humaine de l’interface actuelle, puisqu’aucune interface n’a changé ;
- aucune mesure de faux positifs des faux amis ou heuristiques ;
- aucune preuve de méthode de calcul des scores `ic_feature` ;
- aucune expérimentation multimodale ;
- aucune validation de Mission 221.

## 16. Fichiers créés

- `reports/220_seven_sieves_beyond_the_seven_sieves_audit.md` ;
- `reports/assets/220_seven_sieves_beyond_the_seven_sieves_audit/ic_feature_inventory.json` ;
- `reports/assets/220_seven_sieves_beyond_the_seven_sieves_audit/historical_variants_inventory.md` ;
- `reports/assets/220_seven_sieves_beyond_the_seven_sieves_audit/enrichment_families_map.json` ;
- `reports/assets/220_seven_sieves_beyond_the_seven_sieves_audit/field_requests_evidence.md` ;
- `reports/assets/220_seven_sieves_beyond_the_seven_sieves_audit/mission_221_candidate_plan.json`.

## 17. Versionnement

Mission documentaire uniquement :

- enseignant : V0.1.3 inchangée ;
- apprenant : V0.1.3 inchangée ;
- contrat d’analyse : 0.1 inchangé ;
- format de session : 0.1 inchangé ;
- package Node : 1.0.0 inchangé.

## 18. Message de commit proposé

```text
docs(reports): add Mission 220 beyond-seven-sieves audit
```

Aucun commit ni push n’a été effectué.

## 19. Contrôle de clôture

- Les huit tables ont exactement les mêmes volumes et empreintes SHA-256 qu’au départ.
- `connector_help` reste à 27 lignes, `form_relation` à 86 et `ic_feature` à 8.
- `ic_feature` conserve l’empreinte `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a`.
- Git ne montre que le rapport 220 et son dossier de cinq artefacts, tous nouveaux ; aucun fichier préexistant n’est modifié ou supprimé.
- Les ports 3000, 3306 et 8080 sont toujours servis par les mêmes PID qu’au départ.
- Aucun service n’a été arrêté ou redémarré.
- Aucun appel OpenAI, aucune écriture SQL, migration, seed, installation, correction automatique, branche, commit, push ou déploiement n’a été effectué.
- Les quatre PNG de contrôle PDF ont été supprimés après inspection ; aucun fichier temporaire Mission 220 ne subsiste.
- Versions enseignant/apprenant V0.1.3, contrat 0.1, session 0.1 et package 1.0.0 inchangés.
