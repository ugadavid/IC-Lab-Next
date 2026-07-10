# Workflow léger API pour Seven Sieves Explorer

## Statut et réorientation

Ce document révise conceptuellement le workflow décrit dans `teacher-admin-workflow-v0.md`, sans modifier ce document existant.

La contrainte principale est désormais :

> La V0 ne doit pas transformer la préparation d'un texte en travail d'annotation manuelle.

Seven Sieves Explorer reste une page HTML/JavaScript légère. L'enseignant fournit un texte et quelques paramètres linguistiques. L'application envoie une seule demande d'analyse à Dico-IC, reçoit un paquet JSON directement exploitable et affiche immédiatement le texte enrichi.

La V0 privilégie donc l'usage immédiat plutôt que la création, la validation et la publication d'une activité persistante.

## 1. Ce qui était trop manuel dans le workflow précédent

Plusieurs passages de `teacher-admin-workflow-v0.md` supposent un cycle éditorial trop lourd pour une première version.

| Passage ou hypothèse | Friction introduite | Destination proposée |
|---|---|---|
| Création obligatoire d'une activité avec titre, brouillon et identifiant | Étape administrative avant même de tester un texte | V1 |
| Statuts d'activité `DRAFT → PUBLISHED` | Suppose un cycle de publication et de gestion de contenu | V1 |
| Pré-analyse transformée en propositions `PROPOSED` | Empêche l'usage direct des résultats | V2 si une correction devient nécessaire |
| Relecture occurrence par occurrence ou tamis par tamis | Fait de l'enseignant un annotateur systématique | À exclure de la V0 |
| Actions valider, corriger, rejeter et ajouter une annotation | Crée une interface d'annotation complète | V2 |
| Ajout manuel de notes pédagogiques pour chaque cas | Demande un enrichissement éditorial avant l'usage | V2 |
| Aperçu obligatoire avant publication | Duplique Seven Sieves Explorer et ajoute une étape | V1 au plus tôt |
| Publication des seules annotations validées | Rend le paquet inutilisable sans validation humaine | Remplacé en V0 par des résultats directs et prudents |
| Persistance de `activity_token` et `activity_annotation` | Stocke les résultats de chaque analyse avant que le besoin soit établi | V1 ou V2 |
| Routes de gestion d'activités et d'annotations | Introduit une administration serveur complète | V1 et V2 |
| Cinq ajouts conceptuels au modèle SQL | Élargit le modèle avant le premier test réel de l'API | Aucun ajout requis pour la V0 |

Le problème n'est pas la possibilité future de corriger. Le problème est d'en faire un passage obligé avant que l'enseignant puisse utiliser son texte.

## 2. Principe de la V0 légère

La V0 repose sur une analyse directe et sans persistance obligatoire :

```text
Texte + langues + tamis
          ↓
      API Dico-IC
          ↓
  paquet JSON enrichi
          ↓
Seven Sieves Explorer
```

L'API lit les ressources mutualisées de Dico-IC, analyse le texte en mémoire et renvoie le résultat. Elle ne crée pas automatiquement une activité, un ensemble d'annotations à valider ou une session apprenant.

Le paquet JSON est un résultat calculé, explicable et réutilisable. Il ne prétend pas être une annotation linguistique définitive.

## 3. Workflow enseignant V0

### Étape 1 : coller ou importer un texte

L'enseignant ouvre Seven Sieves Explorer et :

- colle un texte ; ou
- importe un fichier texte simple en UTF-8.

Aucun titre, compte, brouillon ou dossier d'activité n'est requis.

### Étape 2 : choisir la langue source

L'enseignant indique la langue du texte à partir du catalogue fourni par Dico-IC.

La détection automatique de langue peut être envisagée plus tard. En V0, un choix explicite est plus simple et plus fiable.

### Étape 3 : choisir la langue de médiation ou de l'apprenant

Cette langue détermine notamment :

- les formes lexicales utilisées pour la comparaison principale ;
- la langue des explications quand elles sont disponibles ;
- la perspective depuis laquelle une transparence ou un faux ami peut être utile.

Dans le prototype actuel, il s'agit du français.

### Étape 4 : choisir les langues de comparaison

L'enseignant peut choisir d'autres langues à afficher dans les rapprochements pan-romans.

Exemple :

```text
source : es
médiation : fr
comparaison : it, pt
```

Cette sélection est facultative. L'analyse doit rester possible avec la seule langue de médiation.

### Étape 5 : utiliser tous les tamis par défaut

Les sept tamis sont activés par défaut afin d'éviter une configuration préalable.

L'interface peut permettre d'en désactiver quelques-uns, mais cette action reste facultative. L'API reçoit soit la liste demandée, soit l'indication `all`.

L'activation de tous les tamis ne signifie pas qu'ils sont tous également matures. Le paquet JSON doit indiquer clairement si un tamis est :

- disponible ;
- expérimental ;
- non encore pris en charge pour la combinaison de langues demandée.

Un tamis non pris en charge renvoie un état explicite et aucun résultat fabriqué.

### Étape 6 : appeler l'API d'analyse

Seven Sieves Explorer envoie une demande groupée contenant le texte et les paramètres.

Contrat conceptuel principal :

```text
POST /analysis
```

L'enseignant ne déclenche qu'une action visible : **Analyser le texte**.

### Étape 7 : charger le paquet JSON

La réponse est directement chargée par le JavaScript de Seven Sieves Explorer.

Le client utilise le paquet pour :

- reconstruire le texte avec des occurrences positionnées ;
- activer les surlignages par tamis ;
- afficher les rapprochements lexicaux ;
- présenter les règles mobilisées ;
- afficher les explications et formulations de prudence ;
- conserver localement les sélections et statuts de lecture.

Aucune validation annotation par annotation n'est demandée avant l'affichage.

### Étape 8 : recommencer librement

L'enseignant peut modifier le texte ou les langues puis relancer l'analyse. La nouvelle réponse remplace simplement le paquet précédent dans la page.

Le téléchargement local du paquet JSON pourrait être proposé comme commodité, mais il n'est pas requis pour le fonctionnement de la V0.

## 4. Contrat JSON conceptuel

Le format exact reste à tester avec le prototype. La structure suivante décrit seulement les informations minimales.

### 4.1 Requête

```json
{
  "text": "La organización internacional...",
  "source_language": "es",
  "mediation_language": "fr",
  "comparison_languages": ["it", "pt"],
  "sieves": "all"
}
```

### 4.2 Réponse

```json
{
  "analysis_version": "v0-experimental",
  "languages": {
    "source": "es",
    "mediation": "fr",
    "comparison": ["it", "pt"]
  },
  "sieves": [
    {
      "id": 1,
      "status": "available"
    },
    {
      "id": 5,
      "status": "experimental"
    }
  ],
  "tokens": [
    {
      "index": 1,
      "surface": "organización",
      "normalized": "organización",
      "start": 3,
      "end": 15,
      "enrichments": [
        {
          "sieve": 1,
          "type": "transparent_lexicon",
          "label": "Mot transparent ou quasi transparent",
          "explanation": "Proximité avec une forme reconnaissable en français.",
          "caution": "Indice de compréhension, pas traduction automatique.",
          "confidence": 0.9,
          "source": {
            "type": "form_relation",
            "id": 42
          }
        }
      ]
    }
  ],
  "warnings": []
}
```

Les identifiants, scores et formulations sont illustratifs. Ils ne doivent pas être interprétés comme des données déjà disponibles ou validées.

## 5. Propriétés attendues du paquet d'enrichissement

### Directement affichable

Seven Sieves Explorer ne doit pas avoir à reconstruire la logique linguistique depuis des tables brutes. Le paquet doit déjà relier chaque occurrence aux enrichissements utiles.

### Positionné par occurrence

Chaque token doit posséder un index ou des offsets afin que deux occurrences identiques puissent recevoir des résultats différents.

### Groupé en une réponse

L'application ne doit pas envoyer une requête par mot et par tamis. L'analyse complète du texte est demandée et renvoyée en une opération.

### Explicable

Chaque résultat devrait fournir, selon ce qui est disponible :

- un libellé ;
- une explication ;
- une formulation de prudence ;
- une confiance ;
- une provenance vers une forme, une relation, un trait ou une règle.

### Tolérant à l'incomplétude

Un mot sans résultat reste dans le texte sans erreur. Un tamis partiellement pris en charge peut renvoyer peu d'enrichissements et un avertissement clair.

### Sans écriture automatique

L'appel d'analyse ne doit pas ajouter les tokens, résultats ou textes au lexique mutualisé. La V0 est un service de lecture et de calcul.

## 6. Répartition des responsabilités

### Dico-IC

Dico-IC fournit :

- le catalogue des langues ;
- les formes lexicales ;
- les relations entre formes ;
- les faux amis et équivalences partielles disponibles ;
- les traits IC ;
- les règles de transformation ;
- la tokenisation et l'assemblage du paquet d'enrichissement ;
- les niveaux de confiance, explications, prudences et provenances disponibles.

### Seven Sieves Explorer

La page HTML/JavaScript gère :

- la saisie ou l'import du texte ;
- les sélecteurs de langues ;
- le bouton d'analyse ;
- le chargement et le rendu du JSON ;
- l'activation visuelle des tamis ;
- les infobulles et panneaux ;
- le tamis actif ;
- les mots sélectionnés ;
- les statuts `compris`, `doute`, `inconnu` ;
- la réinitialisation de la session locale.

### Enseignant

En V0, l'enseignant :

- fournit le texte ;
- choisit les langues ;
- lance l'analyse ;
- utilise le résultat immédiatement.

Il n'est pas responsable du contrôle exhaustif de chaque résultat avant usage. L'interface doit présenter les analyses comme des aides prudentes et expérimentales.

## 7. Découpage V0, V1 et V2

### V0 : analyse directe réutilisable

Objectif : obtenir rapidement un texte enrichi dans Seven Sieves Explorer.

Fonctions :

- saisie ou import local du texte ;
- choix des langues ;
- tous les tamis activés par défaut ;
- appel groupé à l'API ;
- réponse JSON positionnée et explicable ;
- rendu immédiat ;
- aucun enregistrement serveur obligatoire ;
- aucune validation manuelle obligatoire ;
- aucune modification automatique du lexique.

API minimale :

```text
GET  /languages
POST /analysis
```

### V1 : sauvegarde d'activités

Objectif : permettre de retrouver et partager une analyse déjà préparée.

Fonctions possibles :

- enregistrer un texte, ses paramètres et le paquet obtenu ;
- attribuer un identifiant à l'activité ;
- rouvrir ou partager une activité ;
- relancer l'analyse après modification ;
- distinguer un brouillon d'une activité partagée si ce besoin est confirmé.

Les objets `activity`, langues de comparaison et configuration de tamis deviennent pertinents à ce stade. Les tokens et enrichissements peuvent d'abord être conservés comme instantané du paquet plutôt que modélisés trop finement.

### V2 : corrections locales et contribution au dico

Objectif : permettre l'amélioration humaine sans la rendre obligatoire pour l'usage courant.

Fonctions possibles :

- masquer ou corriger localement un enrichissement ;
- ajouter une note propre à une activité ;
- ajouter une annotation manuelle ;
- proposer une correction comme contribution au lexique mutualisé ;
- distinguer contribution proposée, acceptée ou rejetée ;
- conserver la provenance et la portée locale ou globale d'une correction.

Les objets détaillés `activity_token`, `activity_annotation` et les statuts de validation relèvent principalement de cette étape.

## 8. Effet sur le modèle actuel

### Aucun ajout SQL obligatoire pour la V0

La V0 peut fonctionner en lecture sur le noyau actuel :

- `language` ;
- `lexical_entry` ;
- `lexical_form` ;
- `form_relation` ;
- `pattern_rule` ;
- `ic_feature`.

Les tokens et enrichissements sont calculés en mémoire et renvoyés dans la réponse. Ils n'ont pas besoin d'être persistés.

### Logique API encore nécessaire

L'absence d'ajout SQL ne signifie pas que l'analyse existe déjà. La couche API doit encore :

- segmenter et normaliser le texte selon la langue source ;
- rechercher les ressources lexicales par lot ;
- sélectionner les langues pertinentes ;
- appliquer prudemment les règles exploitables ;
- associer les résultats aux tamis ;
- produire le JSON attendu par le client.

Certaines procédures stockées actuelles sont trop limitées pour ce traitement groupé. La V0 peut clarifier le contrat API avant de décider quelles requêtes ou procédures devront l'alimenter.

### Données encore expérimentales

Les sept tamis ne disposent pas nécessairement tous de connaissances structurées dans le schéma actuel. En particulier, syntaxe et morphosyntaxe peuvent rester partielles ou expérimentales.

La simplicité ne doit pas conduire à inventer des résultats. Le paquet doit déclarer honnêtement la couverture de chaque tamis.

## 9. Critère de réussite V0

La V0 est réussie si une enseignante ou un enseignant peut :

1. ouvrir Seven Sieves Explorer ;
2. coller un texte ;
3. choisir les langues ;
4. cliquer sur **Analyser** ;
5. explorer immédiatement les résultats des tamis disponibles.

Le parcours ne doit exiger ni création de compte, ni sauvegarde, ni validation occurrence par occurrence, ni publication préalable.

## 10. Questions ouvertes limitées à la V0

- Quelle longueur maximale de texte garder pour une réponse rapide ?
- Quels tamis peuvent être réellement alimentés par les données actuelles ?
- La tokenisation doit-elle être faite uniquement par l'API pour garantir les offsets ?
- Quelles explications doivent être produites par l'API et lesquelles restent des textes génériques du client ?
- Comment signaler simplement une confiance faible sans surcharger l'interface ?
- Faut-il permettre le téléchargement local du paquet JSON dès la V0 ?

Ces questions peuvent être testées directement dans Seven Sieves Explorer sans construire un espace d'administration.

## Conclusion

La V0 de Dico-IC doit être un service d'enrichissement immédiat, pas un outil d'annotation. Le professeur fournit un texte et ses langues ; l'API renvoie un paquet JSON ; Seven Sieves Explorer l'affiche.

La sauvegarde d'activités est repoussée en V1. Les corrections locales et contributions au dictionnaire sont repoussées en V2. Cette progression réduit fortement la friction tout en conservant la vision centrale : Dico-IC mutualise des connaissances explicables pour alimenter Seven Sieves Explorer et d'autres applications d'intercompréhension.
