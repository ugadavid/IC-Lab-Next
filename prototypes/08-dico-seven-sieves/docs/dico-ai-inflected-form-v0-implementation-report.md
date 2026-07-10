# Dico-IC — implémentation V0 de l'Assistant IA Formes Fléchies

## Objectif

Cette V0 ajoute un workflow spécialisé pour transformer des surfaces observées
dans un texte en propositions de mappings `inflected_form`, avec validation
humaine obligatoire.

Le parcours visé est désormais disponible :

```text
texte réel
↓
couverture enrichie
↓
formes à examiner
↓
Assistant IA Formes Fléchies
↓
résolution vers lexical_form
↓
revue humaine
↓
création explicite inflected_form VALIDATED
```

Le modèle SQL, la table `inflected_form`, `/analysis` et Seven Sieves n'ont pas
été modifiés.

## Fichiers créés

- `Node/src/admin-ai-inflected-form.js`
- `Node/test/admin-ai-inflected-form.test.js`
- `docs/dico-ai-inflected-form-v0-implementation-report.md`

## Fichiers modifiés

- `Node/src/admin-ai-text.js`
- `Node/src/repository.js`
- `Node/server.js`
- `Node/test/admin-ai-text.test.js`
- `Node/test/admin-manual-routes.test.js`
- `admin/index-admin-ai-text-0.1.html`
- `admin/css/admin-ai-text-0.1.css`
- `admin/js/admin-ai-text-0.1.js`

Aucun script SQL, aucune table, aucun endpoint Seven Sieves et aucun générateur
de `/analysis` n'ont été modifiés.

## Workflow final

### 1. Couverture enrichie

`POST /admin/text-coverage` demande maintenant une langue source :

```json
{
  "source_language": "es",
  "text": "Organización organizaciones inéditas."
}
```

La réponse distingue :

- `known_forms` : surfaces correspondant à un lemme exact dans `lexical_form` ;
- `known_inflected_forms` : surfaces déjà résolues par un mapping
  `inflected_form` validé ;
- `forms_to_review` : surfaces restantes à examiner ;
- `concept_absent` : liste vide à ce stade, remplie conceptuellement après la
  revue morphologique.

Cette évolution évite de considérer automatiquement :

```text
absent de lexical_form
=
concept absent
```

### 2. Assistant IA Formes Fléchies

Un endpoint de proposition a été ajouté :

```text
POST /admin/ai/inflected-form-candidates
```

Il ne crée rien. Il valide une liste de surfaces contextualisées :

```json
{
  "items": [
    {
      "surface_form": "organizaciones",
      "language": "es",
      "context": "Las organizaciones participan."
    }
  ]
}
```

Le prompt est volontairement étroit :

- langues : `fr`, `es`, `it`, `pt` ;
- catégories : `noun`, `adjective` ;
- trait : `grammatical_number = PLURAL` ;
- exclusion explicite des verbes, temps, personnes, genre complexe,
  comparatifs et superlatifs.

La sortie attendue reste temporaire :

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

### 3. Résolution Dico-IC

Après génération, le serveur rapproche chaque proposition de `lexical_form` par :

```text
language
+ normalized_lemma_candidate
+ part_of_speech
```

Il vérifie aussi les mappings `inflected_form` déjà présents pour la surface.

## États utilisés

Les états renvoyés à l'interface sont :

- `READY` : une cible Dico-IC unique existe et aucun mapping identique n'est
  présent ;
- `LEMMA_NOT_FOUND` : le lemme proposé n'existe pas encore dans `lexical_form` ;
- `AMBIGUOUS` : plusieurs cibles compatibles existent ;
- `ALREADY_KNOWN` : le mapping existe déjà ;
- `NEEDS_CORRECTION` : une cible ou une collision demande une décision humaine.

L'interface ajoute aussi des états locaux :

- `REJECTED_BY_REVIEWER` ;
- `CREATED` ;
- `ERROR`.

## Écrans ajoutés

La page `admin/index-admin-ai-text-0.1.html` conserve le point d'entrée par texte
et ajoute :

- un choix de langue source ;
- des compteurs séparés pour lemmes connus, flexions connues, formes à examiner
  et concepts absents ;
- une section **Assistant IA Formes Fléchies** ;
- un tableau de revue dédié avec les colonnes :

```text
Valider
Surface
Langue
Contexte
Lemme proposé
Cible Dico-IC
POS
Nombre
Confiance
État
Actions
```

Actions disponibles :

- cocher une ligne `READY` ;
- corriger le lemme proposé ;
- chercher une cible Dico-IC après correction ;
- choisir une cible en cas d'ambiguïté ;
- refuser une proposition ;
- orienter un `LEMMA_NOT_FOUND` vers le workflow lexical ;
- créer les mappings validés.

## Création des mappings

Aucun nouvel endpoint d'écriture n'a été ajouté.

La création réutilise :

```text
POST /admin/inflected-form
```

Chaque ligne validée envoie :

```json
{
  "lexical_form_id": 41,
  "surface_form": "organizaciones",
  "grammatical_number": "PLURAL",
  "status": "VALIDATED",
  "source_label": "ai_text_inflection_v0",
  "confidence_score": 0.97
}
```

La transaction, les contraintes de langue, les contraintes POS, la normalisation
et la détection de doublon restent celles du workflow manuel existant.

## Exemples couverts

### `organizaciones → organización`

Le test serveur vérifie que la proposition :

```text
ES organizaciones
→ organización
→ noun
```

est résolue en état `READY` lorsque la `lexical_form` espagnole existe.

### `internacionales → internacional`

Le test vérifie le cas adjectival :

```text
ES internacionales
→ internacional
→ adjective
```

avec résolution `READY`.

### `utiles → útil`

Le test vérifie que la surface non accentuée en contexte espagnol peut être
rapprochée de :

```text
ES útil
→ adjective
```

La langue source reste obligatoire afin d'éviter la confusion avec une surface
française.

## Tests réalisés

Commande :

```text
npm.cmd test
```

Résultat :

```text
100 tests réussis
0 échec
```

Les nouveaux tests couvrent :

- validation des requêtes IA de formes fléchies ;
- rejet des langues hors périmètre ;
- rejet des contextes absents ;
- présence du périmètre V0 dans le prompt ;
- schéma JSON strict et `PLURAL` uniquement ;
- parsing sans écriture ;
- `organizaciones → organización` ;
- `internacionales → internacional` ;
- `utiles → útil` ;
- lemme absent ;
- cible ambiguë ;
- mapping déjà connu ;
- collision avec un autre mapping ;
- couverture enrichie de `text-coverage` ;
- absence d'écriture pendant la couverture.

Contrôles syntaxiques :

```text
node --check Node/src/admin-ai-inflected-form.js
node --check Node/src/admin-ai-text.js
node --check Node/src/repository.js
node --check Node/server.js
node --check admin/js/admin-ai-text-0.1.js
```

Tous passent.

## Vérifications réelles

Après redémarrage de l'API locale sur `http://127.0.0.1:3000`, l'appel réel :

```json
{
  "source_language": "es",
  "text": "Organización organizaciones inéditas."
}
```

renvoie :

```json
{
  "total_words": 3,
  "unique_forms": 3,
  "known_lemmas": 1,
  "known_inflected_forms": 1,
  "forms_to_review": 1,
  "known_forms": 2,
  "unknown_forms": 1
}
```

Interprétation :

- `Organización` est reconnue comme lemme ;
- `organizaciones` est reconnue comme forme fléchie validée ;
- `inéditas` reste à examiner.

La page admin est servie depuis :

```text
http://127.0.0.1:3000/admin-app/index-admin-ai-text-0.1.html
```

et contient bien la nouvelle section **Assistant IA Formes Fléchies**.

Un contrôle statique confirme que tous les identifiants DOM utilisés par le script
sont présents dans la page.

Le navigateur intégré n'a pas pu être utilisé pour une validation visuelle
interactive dans cette session : l'outil de navigateur échoue côté environnement
avec un champ `sandboxPolicy` manquant. La limite est donc technique, pas liée à
la page elle-même.

## Limites V0

- aucune écriture en lot transactionnelle globale ;
- pas d'édition persistante des propositions refusées ;
- pas de mémoire des rejets IA ;
- pas de traitement des verbes ;
- pas de genre ;
- pas de comparatifs ou superlatifs ;
- pas de moteur morphologique local ;
- pas de garantie linguistique autre que la validation humaine ;
- les propositions IA nécessitent une clé OpenAI serveur configurée ;
- les cas `LEMMA_NOT_FOUND` doivent encore passer par le workflow lexical avant
  création éventuelle du mapping.

## Pistes V1

- ajouter une vraie file de reprise pour les propositions dont le lemme vient
  d'être créé ;
- proposer une création en lot avec rapport transactionnel détaillé ;
- mémoriser certains refus si les mêmes fausses propositions reviennent souvent ;
- ajouter un moteur morphologique local comme seconde opinion avant l'IA ;
- prioriser les surfaces par fréquence dans le texte ;
- mieux gérer les cas nom/adjectif ambigus ;
- ajouter une comparaison entre proposition IA et règles morphologiques simples.

## Conclusion

Le workflow B2 est maintenant disponible sans modifier le modèle de données :

```text
Assistant IA Texte
→ Assistant IA Formes Fléchies
→ revue humaine
→ endpoint inflected_form existant
→ mapping VALIDATED
```

Le principe de gouvernance reste inchangé :

```text
l'IA propose
l'humain valide
l'API contrôle
MariaDB conserve seulement la connaissance acceptée
```
