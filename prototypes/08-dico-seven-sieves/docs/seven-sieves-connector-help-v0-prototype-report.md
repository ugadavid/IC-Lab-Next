# Seven Sieves - Prototype expérimental Connector Help V0

## Objectif

Ce prototype évalue une hypothèse pédagogique simple : une expression discursive repérée dans un texte peut aider l'apprenant à comprendre la progression du raisonnement, au-delà de la traduction des mots.

Le dispositif reste entièrement local à Seven Sieves. Il ne crée aucun objet persistant dans Dico-IC et ne modifie ni l'API, ni MariaDB, ni le contrat de `/analysis`.

## Fichiers modifiés

- `prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html` : ajout du contrôle indépendant, du style de surbrillance et du texte de démonstration.
- `prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js` : ajout du catalogue, de la détection et du rendu des aides discursives.

## Fichier créé

- `docs/seven-sieves-connector-help-v0-prototype-report.md` : présent rapport.

La page live officielle `index-api-live-0.1.html` n'a pas été modifiée.

## Catalogue V0

| Expression espagnole | Fonction | Indice pédagogique |
|---|---|---|
| `sin embargo` | Opposition | L'auteur introduit probablement une idée qui contraste avec ce qui précède. |
| `pero` | Opposition | L'auteur introduit probablement une idée qui contraste avec ce qui précède. |
| `porque` | Cause | La proposition qui suit donne probablement une raison ou une explication. |
| `por tanto` | Conséquence | L'auteur présente probablement un résultat ou une déduction. |
| `además` | Addition | L'auteur ajoute probablement une information ou un argument. |

Le catalogue est une constante JavaScript locale. Il n'est ni chargé depuis Dico-IC, ni administrable, ni écrit en base.

## Logique de détection

La reconnaissance respecte le périmètre demandé :

- langue source espagnole uniquement ;
- comparaison insensible à la casse ;
- accents conservés et comparés ;
- mot exact ou séquence exacte de mots ;
- espaces autorisés entre les mots d'une expression ;
- ponctuation interne refusée ;
- aucune lemmatisation, heuristique grammaticale, IA ou analyse NLP.

Pour une expression multi-mots, chaque token appartenant à la séquence est surligné et donne accès à la même aide. `sin embargo` et `por tanto` sont donc reconnus comme deux séquences, sans être transformés en pseudo-tokens.

## Affichage

Un contrôle séparé, intitulé **Aide discursive expérimentale**, active ou désactive le catalogue. Il ne figure pas dans la liste des sept tamis et ne possède aucun numéro.

Quand l'aide est active :

- les expressions reconnues reçoivent une surbrillance propre ;
- leur infobulle présente le titre « Connecteur logique », la fonction et l'indice pédagogique ;
- l'inspection d'un mot comporte une section distincte « Aide discursive expérimentale » ;
- les enrichissements du tamis actif restent affichés dans la même infobulle lorsqu'ils existent.

L'aide est activée par défaut pour rendre la démonstration immédiatement observable. Son état est indépendant du tamis sélectionné.

## Exemples testés

Le texte de démonstration contient :

```text
Los estudiantes trabajaron mucho.
Sin embargo, los resultados fueron modestos.

Además, algunos participantes abandonaron el proyecto.

Por tanto, fue necesario adaptar la metodología.

Muchos estudiantes continuaron porque encontraban útil la experiencia.
```

Résultat attendu et vérifié :

- `Sin embargo` : opposition ;
- `Además` : addition ;
- `Por tanto` : conséquence ;
- `porque` : cause.

Le catalogue contient également `pero`, vérifiable avec une phrase telle que :

```text
El texto es breve, pero su razonamiento es complejo.
```

La vérification locale a envoyé ce corpus à `/analysis` avec le contrat `0.1`, puis appliqué la même reconnaissance exacte aux tokens retournés. Les cinq expressions du catalogue ont été retrouvées. Les séquences multi-mots correspondaient respectivement à deux tokens consécutifs, sans ponctuation interne.

## Résultat obtenu

Le parcours expérimental est fonctionnel :

```text
expression discursive
↓
reconnaissance locale exacte
↓
surbrillance et infobulle
↓
indice sur la progression du raisonnement
```

Les expressions multi-mots coexistent avec la reconstruction du texte depuis les tokens de `/analysis`. Le catalogue local n'altère pas les enrichissements API et les aides des tamis 4 et 6 restent disponibles.

La syntaxe du script a également été contrôlée et la page ainsi que son script ont été servis correctement par le serveur local.

## Limites

- catalogue espagnol très réduit ;
- aucune désambiguïsation selon le contexte ;
- une seule fonction prototypique par expression ;
- aucune locution discontinue ;
- aucune validation auprès d'enseignants dans le cadre de ce test technique ;
- dépendance à la tokenisation reçue pour délimiter les mots ;
- le prototype explique une fonction probable, sans garantir l'interprétation exacte de chaque occurrence.

## Recommandations

La prochaine décision ne devrait pas être technique. Le prototype doit d'abord être présenté à des enseignants afin d'évaluer :

- si l'indice aide réellement à suivre le raisonnement ;
- si le niveau de formulation est suffisamment clair ;
- si la surbrillance d'une locution en plusieurs mots est comprise ;
- si la prudence affichée est adaptée.

Tant que cette valeur pédagogique n'est pas confirmée, le catalogue doit rester local et expérimental. Aucun modèle persistant, endpoint ou outil d'administration n'est nécessaire pour cette V0.
