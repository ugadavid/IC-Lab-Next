# ROADMAP — IC-Lab-Next

> État de référence : juillet 2026, après la stabilisation du pipeline d’anonymisation temporelle de Proto05.

## 1. Rôle du document

Cette roadmap fixe la direction fonctionnelle et technique d’IC-Lab-Next, en particulier pour Proto05 et la vidéo augmentée.

Elle sert à :

- conserver une vision commune du projet ;
- ordonner les chantiers avant leur mise en œuvre ;
- distinguer les fondations nécessaires des expérimentations ;
- consigner les décisions structurantes déjà prises ;
- définir les conditions permettant de considérer chaque phase comme terminée.

Elle ne remplace ni le `README.md`, qui décrit l’état et l’utilisation du projet, ni les rapports de mission, qui détaillent les travaux réalisés. Elle ne doit pas devenir un journal exhaustif des changements.

## 2. Vision

IC-Lab-Next doit permettre d’importer, organiser, enrichir, anonymiser et exploiter des ressources vidéo dans une interface compréhensible, traçable et adaptée à un contexte universitaire.

L’application doit rester :

- simple pour les usages courants ;
- suffisamment puissante pour l’auteur avancé ;
- explicite sur la provenance et les transformations des médias ;
- respectueuse des activités historiques ;
- portable et maintenable ;
- assistée par l’automatisation sans jamais dissimuler à l’utilisateur ce qui a été détecté, modifié ou généré.

La cible n’est pas seulement un moteur capable de produire une vidéo anonymisée. Il s’agit d’un environnement cohérent dans lequel l’utilisateur peut retrouver une ressource, comprendre son état, voir ses relations avec ses dérivés, effectuer un traitement, vérifier le résultat et réutiliser le média sans se perdre dans des détails techniques.

## 3. État désormais acquis

Les missions 088 à 093 ont profondément stabilisé la chaîne d’anonymisation de Proto05.

### 3.1. Modèle temporel

- Les masques sont organisés en collections associées à des étapes temporelles.
- Une étape commence au temps qui lui est attribué.
- Sa collection de masques reste active jusqu’à l’étape suivante.
- L’étape suivante prend alors le relais avec sa propre collection.
- Les masques peuvent être ajoutés, modifiés ou supprimés dans le contexte de l’étape sélectionnée.

### 3.2. Pipeline FFmpeg

- La vidéo est traitée par intervalles temporels.
- Seules les régions utiles sont recadrées et floutées.
- Les segments sont encodés avec des paramètres compatibles.
- Ils sont concaténés sans second encodage vidéo.
- L’audio original est remuxé une seule fois.
- L’instrumentation conserve les commandes, journaux, progressions et résultats des différentes étapes.

Le benchmark de référence sur 60 secondes est passé d’environ 41,1 secondes avec le graphe plein écran à environ 1,27 seconde avec le traitement local par segments. L’architecture locale est désormais la référence ; une accélération matérielle éventuelle ne devra jamais servir à compenser le retour à un pipeline global inefficace.

### 3.3. Validation

- La dérivation complète a été testée par David dans Chromium.
- Le traitement est rapide et le résultat fonctionnel.
- La perte de cinq images provoquée par `-shortest` a été identifiée et corrigée.
- Les étapes sont bornées au nombre réel d’images de la source.
- Les bordures, les raccords, la durée, les images et l’audio ont fait l’objet de contrôles ciblés.

Avant de considérer ce chantier comme administrativement clos, l’état exact du commit, de la version, du rapport final et de la documentation doit rester vérifiable dans le dépôt.

## 4. Diagnostic actuel

Le moteur d’anonymisation est devenu rapide et sain. Le principal obstacle n’est plus le traitement vidéo, mais l’organisation de l’application.

### 4.1. Haut de page

L’interface actuelle mélange dans un même espace :

- recherche de vidéo ;
- sélection d’activité ;
- import depuis une URL ;
- import d’un fichier local ;
- déclaration d’un média sans import ;
- actions liées à l’anonymisation ;
- informations techniques.

Ces opérations appartiennent à des moments et à des intentions différentes. Leur juxtaposition rend le parcours difficile à comprendre.

### 4.2. Collection de médias

Avec un nombre encore limité de ressources, la collection est déjà difficile à parcourir. Les cartes exposent trop d’informations :

- titre ;
- identifiants internes ;
- provenance ;
- URL ou chemin ;
- empreinte technique ;
- taille ;
- état ;
- aperçu ;
- association à une activité ;
- traitements et actions.

Une carte de navigation ne doit pas ressembler à une fiche de base de données. Les informations techniques doivent rester disponibles, mais être déplacées dans un inspecteur ou une section repliable.

### 4.3. Risque lié à l’automatisation

Une détection automatique des visages et des textes pourrait produire de nombreuses propositions, étapes, pistes, masques et versions dérivées. L’intégrer avant d’avoir refondu le modèle de classement et l’architecture de l’information multiplierait le désordre actuel.

La vidéothèque et son interface constituent donc le prochain chantier structurant. La détection automatique est une branche expérimentale prometteuse qui doit s’appuyer sur ce socle.

## 5. Principes directeurs

### 5.1. Séparer les espaces fonctionnels

L’application doit distinguer clairement :

1. **Vidéothèque** — trouver, classer, sélectionner et comprendre les médias ;
2. **Importer** — ajouter une ressource locale, distante, HLS ou déclarée ;
3. **Anonymiser** — définir et vérifier les masques manuels ou suggérés ;
4. **Traitements** — suivre les opérations, consulter leur historique et diagnostiquer les erreurs.

Ces espaces peuvent appartenir à une même application et partager un contexte, mais leurs actions principales ne doivent plus être mélangées dans un écran unique.

### 5.2. Préserver les relations entre médias

Chaque média dérivé doit rester rattaché à sa source.

Exemple :

```text
Entretien Raquel
├── Original
├── Version anonymisée — 24 juillet
└── Version anonymisée — essai 2
```

Cette famille ne doit pas être simulée par une simple duplication physique dans plusieurs dossiers. La relation source/dérivé constitue une information propre du modèle.

### 5.3. Distinguer quatre modes d’organisation

- **Dossier** : emplacement choisi par l’utilisateur pour ranger un média.
- **Tag** : caractéristique transversale utilisée pour décrire et filtrer.
- **Collection automatique** : regroupement calculé à partir de l’état connu par le système.
- **Famille de médias** : relation entre une source et les versions qui en dérivent.

Ces quatre notions répondent à des besoins différents et ne doivent pas être confondues.

Exemples de dossiers :

- Mémoire ;
- REPLI4C ;
- Entretiens ;
- Corpus catalan.

Exemples de tags :

- `Zoom` ;
- `espagnol` ;
- `entretien` ;
- `à vérifier` ;
- `publiable`.

Collections automatiques envisagées :

- Toutes les vidéos ;
- Originales ;
- Anonymisées ;
- En cours de traitement ;
- En erreur ;
- Non classées.

### 5.4. Réduire l’information visible par défaut

Dans la vidéothèque, une carte compacte ne devrait afficher que :

- une vignette ;
- le titre ;
- la durée ;
- un badge `Originale` ou `Anonymisée` ;
- l’état du média ;
- éventuellement le nombre de versions dérivées.

Les identifiants, empreintes, chemins, URL, paramètres d’encodage et autres métadonnées techniques doivent rester accessibles dans un inspecteur, sans occuper l’espace principal.

### 5.5. Assister sans décider à la place de l’utilisateur

Pour l’anonymisation automatique :

- parler de **détection et suivi des visages**, et non d’identification des personnes ;
- présenter les résultats comme des suggestions ;
- conserver une validation humaine obligatoire ;
- ne jamais lancer automatiquement le rendu définitif à partir de détections non vérifiées ;
- signaler les portions incertaines ;
- préserver la traçabilité entre la suggestion, la correction humaine et le résultat final.

## 6. Roadmap ordonnée

### Phase 0 — Clôturer le pipeline actuel

**Statut : Prochain**

#### Objectif

Transformer les missions 088 à 093 en point de référence propre et vérifiable avant d’ouvrir un nouveau chantier fonctionnel.

#### Travaux

- vérifier le commit couvrant les missions 088 à 093 ;
- confirmer la version réellement déclarée et servie ;
- compléter ou harmoniser le rapport 093 si nécessaire ;
- consigner le résultat définitif de la dérivation complète ;
- vérifier le nettoyage des fichiers temporaires ;
- confirmer que la correction liée à `-shortest` est bien incluse ;
- exécuter les contrôles finaux pertinents ;
- figer le pipeline rapide comme architecture de référence.

#### Critères d’acceptation

- état Git maîtrisé ;
- version cohérente ;
- documentation synchronisée ;
- tests réussis ;
- dérivation complète validée ;
- commit identifié ;
- aucune activité canonique altérée.

#### Livrables

- rapport final consolidé ;
- documentation mise à jour si nécessaire ;
- commit de référence.

---

### Phase 1 — Repenser le modèle de la vidéothèque

**Statut : Prochain**

#### Objectif

Définir le modèle d’organisation des médias avant de dessiner la nouvelle interface.

#### Travaux

- formaliser les familles source/dérivés ;
- distinguer provenance, type fonctionnel et format technique ;
- définir les dossiers créés par l’utilisateur ;
- définir les tags et leurs règles ;
- définir les collections automatiques ;
- définir les états de traitement ;
- séparer métadonnées fonctionnelles et métadonnées techniques ;
- fixer les règles de suppression, de déplacement et de traçabilité ;
- déterminer le comportement d’un dérivé lorsque sa source est supprimée ou indisponible ;
- préserver les associations existantes entre médias et activités ;
- préparer une migration non destructive des données actuelles.

#### Questions à trancher

- Un média peut-il appartenir à plusieurs dossiers ou un seul ?
- Les tags sont-ils libres, suggérés ou administrés ?
- Comment nommer et ordonner plusieurs dérivés d’une même source ?
- Quelles métadonnées sont héritées de la source ?
- Que signifie précisément « non classé » ?
- Quels états doivent être calculés et lesquels peuvent être définis par l’utilisateur ?

#### Critères d’acceptation

- modèle documenté ;
- invariants explicites ;
- migration des données historiques prévue ;
- aucune duplication artificielle nécessaire pour classer un média ;
- relations source/dérivés interrogeables ;
- collections automatiques calculables ;
- règles de suppression sûres et compréhensibles.

#### Livrables

- note de conception du modèle ;
- schéma des entités et relations ;
- stratégie de migration ;
- tests du modèle et des invariants.

---

### Phase 2 — Refaire l’architecture de l’information et l’interface

**Statut : Après la phase 1**

#### Objectif

Rendre les parcours de recherche, d’import, d’anonymisation et de suivi immédiatement compréhensibles.

#### Cible de la vidéothèque

- colonne gauche : dossiers, collections automatiques et tags ;
- zone centrale : grille compacte ou vue en tableau ;
- panneau droit : inspecteur du média sélectionné ;
- barre supérieure : recherche, filtres, tri et action d’import ;
- relations entre originaux et dérivés clairement visibles ;
- détails techniques regroupés dans une section repliable ;
- navigation utilisable avec un grand nombre de médias.

#### Parcours à séparer

- consulter et classer ;
- importer ou déclarer ;
- associer à une activité ;
- anonymiser ;
- suivre un traitement ;
- examiner un résultat ou une erreur.

#### Atelier d’anonymisation

L’interface des étapes temporelles doit également être clarifiée :

- liste lisible des étapes ;
- temps de départ et plage active ;
- nombre de masques par étape ;
- sélection d’une étape entraînant l’affichage de sa collection ;
- ajout d’une étape au temps courant ;
- copie contrôlée de la collection précédente lorsque cela est utile ;
- ajout, modification et suppression dans le contexte de l’étape sélectionnée ;
- repères temporels visibles sur la timeline ;
- absence d’identifiants techniques dans le parcours normal.

#### Critères d’acceptation

- chaque écran possède une intention principale identifiable ;
- les actions d’import ne monopolisent plus la vidéothèque ;
- les cartes restent compactes ;
- les détails techniques demeurent accessibles ;
- les familles source/dérivés sont compréhensibles sans documentation ;
- dossiers, tags et collections ne sont pas confondus ;
- les activités et médias historiques restent utilisables ;
- la navigation fonctionne sur un corpus sensiblement plus grand que le corpus actuel.

#### Livrables

- parcours et wireframes validés ;
- composants de navigation ;
- inspecteur de média ;
- vues grille et/ou tableau ;
- atelier temporel réorganisé ;
- tests d’interface et recette utilisateur.

---

### Phase 3 — Prototyper la détection automatique

**Statut : Exploration après stabilisation du socle**

#### Objectif

Évaluer si la détection automatique fait réellement gagner du temps sans compromettre la qualité de l’anonymisation.

Le prototype doit rester isolé de l’interface principale dans un premier temps.

#### Pipeline expérimental

```text
Vidéo
→ analyse d’images échantillonnées
→ détection des visages et des régions textuelles
→ suivi et regroupement temporel
→ production d’un JSON de propositions
→ vérification humaine
```

#### Visages

Le besoin porte sur :

- la détection des visages ;
- le suivi de leurs déplacements ;
- la construction de pistes temporelles ;
- la proposition de rectangles compatibles avec le modèle de masques existant.

L’identification biométrique des personnes n’est ni nécessaire ni souhaitée.

#### Textes

Le besoin comporte deux niveaux distincts :

1. détecter les régions contenant du texte ;
2. reconnaître facultativement leur contenu.

Le cas prioritaire est celui des bandeaux de noms dans les vidéos Zoom. Le prototype doit éviter de proposer systématiquement le floutage de tout texte pédagogique apparaissant dans une présentation ou un partage d’écran.

Les indices à étudier comprennent :

- la position ;
- la forme du bandeau ;
- son contraste ;
- sa persistance ;
- sa relation spatiale avec une vignette ou un visage ;
- le contenu reconnu lorsqu’il est disponible.

#### Cas de test

- vue galerie ;
- intervenant seul ;
- partage d’écran ;
- changement de disposition ;
- activation ou désactivation des caméras ;
- apparition et disparition de participants ;
- vidéo compressée ou de qualité dégradée ;
- textes pédagogiques à ne pas confondre avec les noms ;
- changements rapides de scène.

#### Technologies candidates

MediaPipe, PaddleOCR ou d’autres solutions peuvent être comparées. Aucun choix ne doit être déclaré définitif avant les benchmarks et les essais sur les vidéos représentatives du projet.

#### Mesures prioritaires

- taux de faux négatifs ;
- taux de faux positifs ;
- stabilité des pistes temporelles ;
- précision des rectangles ;
- temps d’analyse ;
- volume de corrections humaines ;
- temps réellement économisé par rapport au masquage manuel.

La métrique principale n’est pas la sophistication du modèle, mais le gain de temps obtenu avec un niveau de sécurité acceptable.

#### Critères d’acceptation

- export de propositions reproductible ;
- aucun rendu automatique ;
- résultats inspectables ;
- faux négatifs clairement mesurés ;
- test sur plusieurs configurations Zoom ;
- comparaison factuelle des technologies ;
- démonstration d’un gain réel pour l’utilisateur.

#### Livrables

- prototype autonome ;
- format JSON documenté ;
- corpus de test minimal ;
- rapport comparatif ;
- décision argumentée : intégrer, poursuivre l’exploration ou abandonner.

---

### Phase 4 — Intégrer l’assistance automatique

**Statut : Conditionnel**

Cette phase ne commence que si la phase 3 démontre un bénéfice suffisant.

#### Objectif

Transformer les détections automatiques en suggestions contrôlables dans l’atelier d’anonymisation.

#### Travaux

- convertir les pistes proposées en étapes et masques compatibles avec le modèle existant ;
- afficher clairement la différence entre suggestion et masque validé ;
- permettre d’accepter, corriger, fusionner, scinder ou supprimer une proposition ;
- montrer les zones et périodes incertaines ;
- permettre une navigation rapide entre les éléments à vérifier ;
- imposer une validation humaine avant la dérivation ;
- conserver la provenance de chaque suggestion ;
- mesurer le temps de correction.

#### Critères d’acceptation

- aucune suggestion n’est confondue avec une validation ;
- aucun rendu définitif ne part sans action humaine explicite ;
- les propositions restent éditables avec les outils manuels ;
- les portions non analysées ou incertaines sont visibles ;
- la traçabilité est conservée ;
- les activités historiques restent compatibles ;
- le temps total d’anonymisation diminue réellement.

#### Livrables

- interface de révision des suggestions ;
- conversion vers le modèle temporel ;
- journal des validations et corrections ;
- tests fonctionnels ;
- recette sur plusieurs vidéos.

---

### Phase 5 — Renforcer la robustesse et les performances

**Statut : Plus tard**

#### Cas à couvrir

- grand nombre de masques ;
- nombreuses étapes ;
- étapes très rapprochées ;
- temps d’étape ne correspondant pas exactement à une image ;
- disparition et réapparition d’un masque ;
- résolutions et cadences variées ;
- vidéos à cadence variable ;
- sources sans audio ou avec plusieurs pistes ;
- reprise après erreur ;
- interruption volontaire d’un traitement ;
- fichiers temporaires incomplets ;
- médias déplacés ou devenus indisponibles ;
- non-régression des activités historiques.

#### Optimisations envisagées

- cache des segments inchangés ;
- régénération limitée aux intervalles modifiés ;
- nettoyage contrôlé des fichiers temporaires ;
- stratégie explicite de conservation des journaux ;
- détection des capacités FFmpeg ;
- portabilité Windows ;
- benchmark facultatif d’une accélération GPU ;
- vérification des gains avant toute complexification.

#### Critères d’acceptation

- reprise sûre après erreur ;
- absence de corruption des médias et activités ;
- invalidation correcte du cache ;
- nettoyage prévisible ;
- résultats reproductibles ;
- tests de non-régression ;
- performance acceptable sur des cas réalistes et des cas limites.

## 7. Hors périmètre actuel

Ne sont pas prioritaires :

- identification biométrique des personnes ;
- reconnaissance d’identité ;
- anonymisation entièrement automatique sans contrôle humain ;
- rendu définitif déclenché depuis des détections non vérifiées ;
- refonte purement esthétique sans architecture de l’information ;
- duplication physique des médias uniquement pour simuler des dossiers ;
- choix définitif d’une technologie de détection avant expérimentation ;
- accélération GPU destinée à masquer un pipeline inefficace ;
- multiplication de fonctions spectaculaires au détriment de la lisibilité.

Ces éléments pourront être réévalués si les besoins du projet évoluent, mais ils ne doivent pas détourner les prochaines phases de leur objectif.

## 8. Ordre de priorité

1. Clôturer et figer le pipeline rapide actuel.
2. Définir le modèle de la vidéothèque.
3. Refaire l’architecture de l’information et l’interface.
4. Prototyper séparément la détection des visages et des textes.
5. Intégrer l’assistance seulement si son utilité est démontrée.
6. Renforcer ensuite la robustesse, le cache et la portabilité.

La refonte de la vidéothèque est le prochain chantier structurant. La détection automatique reste volontairement une exploration tant que le socle ne sait pas organiser proprement ses résultats.

## 9. Statuts de suivi

Les statuts suivants sont utilisés :

- **Terminé** : livré, vérifié, documenté et rattaché à un commit ;
- **En cours** : chantier actuellement ouvert ;
- **Prochain** : prochaine phase prête à être engagée ;
- **Plus tard** : phase prévue mais non prioritaire ;
- **Exploration** : hypothèse à tester avant décision ;
- **Conditionnel** : phase dépendant explicitement d’un résultat antérieur.

## 10. Convention de maintenance

À chaque évolution significative, mettre à jour uniquement les éléments pertinents :

- statut de la phase ;
- décision prise ;
- version obtenue ;
- rapport ou document de référence ;
- commit correspondant lorsqu’il existe ;
- éventuelle modification des conditions d’entrée de la phase suivante.

Une phase ne passe à **Terminé** que si :

- son livrable existe ;
- ses critères d’acceptation sont satisfaits ;
- les tests ou vérifications nécessaires ont réussi ;
- la documentation utile est à jour ;
- le commit de référence est identifié.

Les détails chronologiques restent dans les rapports et l’historique Git. La roadmap doit conserver une lecture rapide de la direction, des décisions et des prochaines étapes.

## 11. Répartition des rôles

### David et GPT

- définir la vision ;
- choisir les priorités ;
- arbitrer les concepts et les parcours ;
- rédiger et maintenir la roadmap ;
- valider les livrables et les changements de phase.

### Stagiaire

- confronter les demandes à l’état réel du dépôt ;
- réaliser les missions techniques dans un périmètre explicite ;
- produire les preuves, tests et rapports demandés ;
- signaler les contradictions et inconnues ;
- intégrer sans réécriture les documents directeurs validés par David et GPT.

Le dépôt décrit la réalité technique. La roadmap décrit la direction du projet. La seconde ne doit pas être déduite automatiquement de la première.
