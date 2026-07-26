# Grille critique de réappropriabilité

## 1. Fonction de la grille

Cette grille sert à examiner les prototypes du stage — et le site de soutenance lui-même — à partir du cadre construit dans le mémoire.

Elle doit permettre :

- d’établir un état de référence avant la phase finale de consolidation ;
- d’orienter les améliorations sans réduire la réappropriation à une liste de fonctionnalités ;
- de comparer un même prototype avant et après consolidation ;
- de rendre visibles les progrès, les fragilités persistantes et les arbitrages ;
- de préparer des preuves simples à montrer pendant la soutenance.

La grille ne mesure ni l’efficacité pédagogique du prototype, qui demanderait une évaluation auprès d’utilisateurs, ni sa qualité logicielle générale. Elle examine plus précisément les **prises offertes à un tiers pour retrouver, comprendre, transformer, utiliser, transmettre et maintenir la ressource**.

## 2. Fondements tirés du mémoire

Le mémoire définit la ressource réappropriable comme :

> un ensemble pédagogique, documentaire et évolutif dont les composants et les relations restent suffisamment lisibles pour permettre une nouvelle utilisation.

La grille articule trois niveaux issus des chapitres 7 à 9 :

1. un **socle d’intelligibilité pédagogique**, sans lequel la reprise risque de ne conserver que la forme visible de l’activité ;
2. six **conditions favorisant la circulation et la réappropriation** : retrouvabilité, adaptabilité, documentation proportionnée, animation, pérennité d’usage et clarification des responsabilités ;
3. trois **critères d’arbitrage** : réduction du coût de réappropriation, préservation de l’intention pédagogique et compatibilité avec les pratiques et les moyens des acteurs.

Ces dimensions sont interdépendantes. Leur importance varie selon la nature de la ressource, son public, la distance entre son contexte de production et son contexte de reprise, ainsi que les moyens disponibles. Elles ne constituent donc ni six fonctionnalités obligatoires ni un modèle universel.

## 3. Règles d’utilisation

### 3.1. Définir d’abord le périmètre

Avant l’évaluation, il faut préciser ce qui constitue la ressource examinée. Pour un prototype, l’interface seule ne suffit généralement pas. Le périmètre peut inclure :

- l’application ou le démonstrateur ;
- les contenus et données ;
- le scénario pédagogique ;
- les fichiers sources et exports ;
- la documentation ;
- l’historique des versions et transformations ;
- les conditions d’hébergement, de maintenance et de gouvernance.

### 3.2. Situer le contexte de reprise envisagé

La même ressource n’exige pas le même degré d’explicitation selon qu’elle doit être reprise :

- par David quelques mois plus tard ;
- par un collègue proche connaissant déjà le projet ;
- par un enseignant extérieur au collectif ;
- par une autre institution ;
- par une personne chargée de sa maintenance technique ou documentaire.

Chaque application de la grille doit donc nommer le **tiers de référence** et la **tâche de reprise** attendue.

### 3.3. Qualifier, ne pas seulement noter

Chaque critère reçoit un état, une preuve et un commentaire :

| État | Signification |
|---|---|
| Non observable | Aucun élément ne permet encore de vérifier le critère. |
| Fragile | L’opération reste possible surtout grâce au concepteur, à des connaissances implicites ou à un environnement particulier. |
| Partiel | Des prises existent, mais une reconstruction, une aide ou des compétences importantes restent nécessaires. |
| Consolidé | Un tiers correspondant au profil retenu peut réaliser l’opération de manière réaliste avec les éléments fournis. |
| Non pertinent | Le critère ne s’applique pas dans ce cas ; la justification est obligatoire. |

Il n’est pas prévu de calculer une note globale. Une moyenne masquerait les dépendances critiques et donnerait une fausse impression d’équivalence entre les dimensions.

### 3.4. Distinguer affirmation et preuve

Une fonctionnalité annoncée dans un README n’est pas automatiquement une capacité démontrée. Le niveau de preuve doit être indiqué :

- **déclaré** : décrit, mais non vérifié ;
- **documenté** : appuyé par des fichiers ou des traces consultables ;
- **testé par le concepteur** : vérifié dans une recette explicite ;
- **testé par un tiers** : réalisé sans intervention décisive du concepteur ;
- **observé en usage** : éprouvé dans une situation pédagogique ou professionnelle réelle.

## 4. Fiche de cadrage

| Élément | Réponse |
|---|---|
| Prototype ou ressource |  |
| Version, tag ou commit |  |
| Date de l’état examiné |  |
| Périmètre inclus |  |
| Contexte de création |  |
| Public et usage initiaux |  |
| Tiers de référence pour la reprise |  |
| Tâche de reprise attendue |  |
| Contraintes connues |  |
| Évaluateur |  |

## 5. Socle : intelligibilité et cohérence pédagogiques

Le socle ne constitue pas une septième condition. Il vérifie que l’objet examiné peut être compris comme une ressource pédagogique, et non seulement comme un artefact technique disponible.

| Critère | Questions critiques | Exemples de preuves | État | Niveau de preuve | Commentaire / action |
|---|---|---|---|---|---|
| Intention pédagogique | Que permet de travailler la ressource ? Le problème auquel elle répond est-il explicite ? | Fiche de prototype, scénario, exemples d’activité |  |  |  |
| Public et contexte | Pour quels publics, langues, objectifs, durées et modalités a-t-elle été conçue ? | Notice de contexte, cas d’usage, limites déclarées |  |  |  |
| Cœur pédagogique | Un tiers peut-il identifier ce qui fonde l’intérêt didactique et ce qui ne doit pas disparaître lors d’une adaptation ? | Rubrique « cœur pédagogique », justification des choix, exemple commenté |  |  |  |
| Scénarisation | Le matériau est-il relié à des consignes, aides, étapes, formes d’accompagnement et prolongements possibles ? | Scénario lisible, parcours apprenant, fiche enseignant |  |  |  |
| Composants et relations | Les liens entre matériau, scénario, consignes, aides, données, variantes et traces d’usage sont-ils compréhensibles ? | Arborescence commentée, manifeste, modèle de données, liens de filiation |  |  |  |
| Marges d’adaptation | Les éléments susceptibles de varier sont-ils distingués du cœur pédagogique ? | Paramètres identifiés, exemples de variantes, points de vigilance |  |  |  |
| Honnêteté du statut | Ce qui est développé, testé, expérimental ou projeté est-il clairement distingué ? | Statuts, limites, résultats de tests, roadmap |  |  |  |

## 6. Les six conditions de réappropriation

### 6.1. Retrouvabilité

Question directrice : **un tiers peut-il localiser, identifier et situer la ressource selon une intention pédagogique ?**

| Critère | Questions critiques | Exemples de preuves | État | Niveau de preuve | Commentaire / action |
|---|---|---|---|---|---|
| Localisation | La ressource et ses éléments essentiels disposent-ils d’un emplacement ou d’une voie d’accès identifiable et stable ? | URL, dépôt, paquet autonome, inventaire |  |  |  |
| Identification | Le nom, la fonction, la version et le statut permettent-ils d’éviter les confusions ? | Titre explicite, version, identifiant, statut |  |  |  |
| Description pédagogique | Peut-on la chercher par langues, public, durée, support, objectif, modalité, guidage ou possibilité d’adaptation ? | Métadonnées, fiche, filtres, index |  |  |  |
| Multiplicité des accès | Une même ressource peut-elle être retrouvée par plusieurs usages ou catégories pertinentes ? | Tags, relations, recherche multi-entrée |  |  |  |
| Contexte et provenance | Son origine, son projet, ses auteurs, ses transformations et son lieu de conservation sont-ils visibles ? | Provenance, chronologie, filiation, crédits |  |  |  |
| Articulation aux classements existants | L’organisation commune laisse-t-elle des chemins compatibles avec les pratiques personnelles plutôt qu’un classement unique imposé ? | Favoris, tags libres, exports, liens externes |  |  |  |

### 6.2. Adaptabilité

Question directrice : **un tiers peut-il transformer ce qui doit varier sans reconstruire l’ensemble ni perdre l’intention pédagogique ?**

| Critère | Questions critiques | Exemples de preuves | État | Niveau de preuve | Commentaire / action |
|---|---|---|---|---|---|
| Accès aux composants | Les contenus, consignes, aides, médias, données et paramètres utiles sont-ils accessibles séparément ? | Sources, éditeur, fichiers structurés, manifestes |  |  |  |
| Transformations prévisibles | Peut-on modifier langues, supports, durée, consignes, extraits, guidage ou organisation de l’activité ? | Recette de modification, champs éditables, paramètres |  |  |  |
| Stabilité et transformabilité | Une forme de référence stable coexiste-t-elle avec des éléments réellement modifiables ? | Version de référence, export, sources modifiables |  |  |  |
| Modularité cohérente | Des composants peuvent-ils être repris séparément tout en conservant leur lien avec le scénario et l’intention ? | Unités identifiées, dépendances explicites, prévisualisation |  |  |  |
| Portabilité | La reprise dépend-elle inutilement d’une plateforme, d’un format opaque ou d’un service particulier ? | Export lisible, version autonome, formats documentés |  |  |  |
| Droits de transformation | Les droits de modification, de redistribution et les restrictions sur les contenus sont-ils explicites ? | Licence, crédits, autorisations, avertissements |  |  |  |
| Variantes et filiation | Une adaptation peut-elle être conservée et remise en circulation sans effacer sa provenance ? | Historique, duplication, liens original–dérivé |  |  |  |

### 6.3. Documentation proportionnée

Question directrice : **la documentation transmet-elle assez d’intelligence pédagogique et technique pour réduire la reconstruction, sans devenir elle-même une charge disproportionnée ?**

| Critère | Questions critiques | Exemples de preuves | État | Niveau de preuve | Commentaire / action |
|---|---|---|---|---|---|
| Minimum pédagogique | Intention, public, langues, durée, supports, prérequis et éléments indispensables sont-ils indiqués ? | Fiche courte, README, notice enseignant |  |  |  |
| Gestes d’accompagnement | Les gestes professionnels absents de l’interface sont-ils rendus visibles lorsqu’ils sont nécessaires ? | Conseils d’animation, exemple commenté, vidéo courte |  |  |  |
| Utilisation et reprise | Un tiers sait-il lancer, utiliser, modifier et exporter la ressource ? | Guide de démarrage, procédures testées |  |  |  |
| Dépendances et limites | Les prérequis, dépendances, données, limites et points de vigilance sont-ils explicites ? | Matrice de dépendances, limites connues, diagnostics |  |  |  |
| Progressivité | La documentation peut-elle commencer par un minimum utile puis accueillir variantes et retours d’expérience ? | Niveaux de lecture, changelog, fiches d’usage |  |  |  |
| Proportionnalité | Le volume et l’effort documentaire sont-ils adaptés à la complexité, à la distance de circulation et à la valeur de conservation ? | Justification du niveau retenu, absence de double saisie |  |  |  |
| Actualité | La documentation correspond-elle encore à la version disponible ? | Version liée, date, tests de procédure |  |  |  |

### 6.4. Animation et accompagnement de la circulation

Question directrice : **les savoir-faire, retours et médiations qui ne tiennent pas dans les fichiers peuvent-ils circuler sans dépendre exclusivement d’un réseau personnel invisible ?**

| Critère | Questions critiques | Exemples de preuves | État | Niveau de preuve | Commentaire / action |
|---|---|---|---|---|---|
| Orientation | Un nouvel entrant sait-il à qui ou à quoi s’adresser pour comprendre la ressource ? | Contact fonctionnel, page d’aide, point d’entrée |  |  |  |
| Transmission des pratiques | Des exemples, démonstrations ou échanges complètent-ils utilement la documentation ? | Cas d’usage, atelier, capsule, démonstration |  |  |  |
| Retours d’expérience | Les difficultés, adaptations et usages peuvent-ils être recueillis et reliés à la ressource ? | Fiches de retour, journal, commentaires structurés |  |  |  |
| Contribution légère | Peut-on signaler un lien obsolète, proposer une variante ou corriger une information sans procédure excessive ? | Canal de signalement, formulaire court, contribution documentée |  |  |  |
| Non-dépendance aux personnes | L’accès reste-t-il possible lorsqu’une personne-ressource est absente ? | Documentation autonome, contacts distribués, procédure de relais |  |  |  |
| Réalisme de l’animation | La médiation prévue dispose-t-elle de temps, d’une reconnaissance et d’une continuité crédibles ? | Rôle identifié, fréquence, moyens, décision explicite |  |  |  |

### 6.5. Pérennité d’usage

Question directrice : **la ressource peut-elle rester accessible, intelligible, adaptable et réactivable — ou être abandonnée proprement — au-delà de son environnement actuel ?**

| Critère | Questions critiques | Exemples de preuves | État | Niveau de preuve | Commentaire / action |
|---|---|---|---|---|---|
| Conservation utile | Les sources, données, scénarios, exports, droits et informations de provenance nécessaires sont-ils conservés ? | Inventaire, sauvegarde, paquet d’archive |  |  |  |
| Formats et dépendances | Les formats sont-ils documentés et les dépendances identifiables, remplaçables ou gelées lorsque nécessaire ? | Lockfile, versions, schémas, médias locaux |  |  |  |
| Séparation contenu–outil | Les éléments pédagogiques essentiels peuvent-ils survivre à l’interface ou à la plateforme actuelle ? | Export, données structurées, version imprimable |  |  |  |
| Migration et réactivation | Une personne compétente peut-elle déplacer, relancer ou reconstruire l’environnement avec un coût raisonnable ? | Procédure de restauration, test sur environnement vierge |  |  |  |
| Maintenance réaliste | Les vérifications, mises à jour, liens, sauvegardes et migrations nécessaires sont-ils identifiés ? | Plan de maintenance, automatisations, fréquence |  |  |  |
| Cycle de vie | La durée de service, les critères d’archivage et les décisions de fin de vie sont-ils pensés proportionnellement à la valeur de la ressource ? | Politique de cycle de vie, statuts, roadmap |  |  |  |
| Abandon sans perte | Si le prototype cesse d’être maintenu, les contenus et traces utiles restent-ils récupérables ? | Export final, archive, documentation de clôture |  |  |  |

### 6.6. Clarification des responsabilités

Question directrice : **le travail nécessaire à la continuité est-il visible, réparti et compatible avec les moyens disponibles ?**

| Critère | Questions critiques | Exemples de preuves | État | Niveau de preuve | Commentaire / action |
|---|---|---|---|---|---|
| Cartographie des tâches | Scénariser, décrire, indexer, vérifier, héberger, migrer, orienter, actualiser et recueillir les retours sont-ils identifiés ? | Matrice de responsabilités, liste d’opérations |  |  |  |
| Responsables actuels | Chaque tâche critique a-t-elle un responsable ou une procédure de décision identifiable ? | Rôles, propriétaires, contacts fonctionnels |  |  |  |
| Répartition soutenable | Les tâches ne reposent-elles pas toutes implicitement sur le concepteur ou l’enseignant ? | Répartition entre pédagogie, documentation, technique et coordination |  |  |  |
| Gouvernance | Les décisions sur les droits, contributions, versions, données et niveaux de service sont-elles explicites ? | Règles de contribution, licences, politiques |  |  |  |
| Transmission | Le changement de responsable peut-il s’effectuer sans perte majeure de connaissances ? | Passation testée, dossier de reprise, journal de décisions |  |  |  |
| Moyens reconnus | Le temps, les compétences et les ressources nécessaires sont-ils reconnus plutôt que supposés gratuits ? | Charge estimée, arbitrages, périmètre de service |  |  |  |

## 7. Arbitrage transversal

Après l’examen détaillé, trois questions empêchent la grille de devenir une course à l’accumulation de fonctionnalités ou de documents.

| Critère d’arbitrage | Question | Conclusion argumentée |
|---|---|---|
| Coût de réappropriation | Le dispositif réduit-il réellement le travail de recherche, de compréhension, de transformation et de remise en circulation ? |  |
| Intention pédagogique | Les possibilités de modification préservent-elles ce qui fait l’intérêt pédagogique de la ressource, ou rendent-elles au moins les conséquences des transformations visibles ? |  |
| Compatibilité située | La solution reste-t-elle compatible avec les pratiques, outils, compétences, temps et moyens des acteurs visés ? |  |

Question finale :

> **Le travail évité est-il supérieur au travail ajouté ?**

Cette question ne peut pas être tranchée définitivement par le concepteur seul. Avant un test auprès de tiers, la réponse doit rester formulée comme une hypothèse argumentée.

## 8. Synthèse du profil

| Élément | Synthèse |
|---|---|
| Forces déjà consolidées |  |
| Fragilités critiques |  |
| Dépendances au concepteur |  |
| Coûts évitables encore imposés au repreneur |  |
| Risques de perte de l’intention pédagogique |  |
| Actions prioritaires à faible coût |  |
| Actions importantes mais coûteuses |  |
| Fragilités structurelles difficilement supprimables |  |
| Critères non pertinents et justification |  |
| Prochaine mise à l’épreuve |  |

## 9. Protocole minimal du test du miroir

Pour une comparaison avant/après d’un même prototype :

1. figer l’état initial par un tag ou un commit, une capture, une courte vidéo et les documents disponibles ;
2. remplir la fiche de cadrage avec le même tiers de référence et la même tâche de reprise ;
3. appliquer la grille à l’état initial en citant les preuves disponibles ;
4. sélectionner quelques fragilités prioritaires, sans chercher artificiellement à tout consolider ;
5. mener le travail de transformation ;
6. figer le nouvel état et appliquer exactement la même grille ;
7. distinguer les progrès documentés, les progrès testés et les améliorations seulement supposées ;
8. faire réaliser au moins une tâche de reprise par un tiers si le calendrier le permet ;
9. présenter pendant la soutenance quelques écarts significatifs plutôt qu’un tableau exhaustif ;
10. terminer par ce qui demeure fragile et par le rapport entre travail ajouté et travail évité.

### Tâches de reprise possibles

- retrouver le prototype à partir d’une intention pédagogique ;
- expliquer son objectif et son cœur pédagogique sans aide orale ;
- le lancer dans un environnement préparé ou vierge ;
- modifier une langue, une consigne, un média, un extrait ou un degré de guidage ;
- créer une variante en conservant sa filiation ;
- exporter ou récupérer les éléments pédagogiques essentiels ;
- identifier les dépendances, les droits et la personne responsable ;
- expliquer ce qui resterait récupérable si l’application n’était plus maintenue.

## 10. Usage pendant la soutenance

La grille complète est un outil de travail et un contenu consultable après la soutenance. Dans les vingt minutes, elle ne doit pas être projetée intégralement.

La démonstration peut retenir :

- un socle : **comprendre l’intention et le cœur pédagogique** ;
- trois opérations immédiatement parlantes : **retrouver, transformer, transmettre** ;
- une condition de continuité : **maintenir ou abandonner sans perdre l’essentiel** ;
- l’arbitrage final : **travail ajouté contre travail évité**.

Le jury doit percevoir la logique de la grille, observer quelques preuves avant/après et comprendre que l’évaluation complète reste disponible dans le site.

## 11. Traçabilité dans le mémoire

La grille est principalement tirée :

- du chapitre 7, qui définit la ressource réappropriable, le cycle de vie, la stabilité et la transformabilité, la didactisation, le cœur pédagogique, les marges d’adaptation et l’ensemble évolutif ;
- du chapitre 8, qui construit les six conditions de circulation et de réappropriation ;
- du chapitre 9, qui propose d’examiner les prototypes par leur problème, leur médiation, leur contribution et leurs dépendances, puis insiste sur leur reprise, leur coût réel et leur continuité ;
- de la conclusion de la troisième partie, qui retient la réduction du coût de réappropriation, la préservation de l’intention pédagogique et la compatibilité avec les pratiques et les moyens des acteurs.

Cette filiation devra rester visible sur le site afin de montrer que le test du miroir ne repose pas sur des critères inventés uniquement pour valoriser les prototypes.
