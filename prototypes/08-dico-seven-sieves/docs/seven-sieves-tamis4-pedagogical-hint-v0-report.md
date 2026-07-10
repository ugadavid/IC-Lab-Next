# Seven Sieves — prototype V0 d’indice pédagogique pour le tamis 4

## Objectif

Tester dans Seven Sieves Explorer la valeur pédagogique d’un indice grapho-phonétique local, sans modifier Dico-IC, MariaDB ou `POST /analysis`.

Le prototype détecte le caractère espagnol `ñ` dans un token et présente le rapprochement prudent `ñ / gn` lorsque le tamis 4 est actif.

## Page live vérifiée

La page Seven Sieves connectée à l’API reste :

```text
prototypes/01-seven-sieves/index-api-live-0.1.html
```

Elle charge :

```text
prototypes/01-seven-sieves/js/seven-sieves-api-live-v0.js
```

Ces deux fichiers n’ont pas été modifiés pour cette expérimentation.

## Fichiers créés

- `prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html`
- `prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js`
- `docs/seven-sieves-tamis4-pedagogical-hint-v0-report.md`

La page expérimentale est une variante isolée de la page live. Elle conserve l’appel à `POST /analysis`, le fallback mock et les interactions locales existantes.

## Fonctionnement

Le script contient un petit catalogue local `pedagogicalHints`. La seule règle V0 est :

```text
tamis : 4
langue : es
motif visible : ñ
titre : Indice ñ / gn
message : Indice de lecture : le ñ espagnol correspond souvent au groupe gn en français.
exemple : España / Espagne
prudence : Indice utile, mais pas une règle universelle.
```

Lorsqu’un paquet d’analyse est chargé :

1. le texte continue d’être reconstruit depuis les tokens et offsets reçus ;
2. les enrichissements API restent inchangés ;
3. au moment du rendu, Seven Sieves cherche les indices locaux correspondant à la langue source ;
4. pour le tamis 4 espagnol, un token contenant `ñ` reçoit un enrichissement local de type `grapho_phonetic_signal` ;
5. le système existant d’infobulle, de surbrillance et d’inspection affiche cet enrichissement comme les enrichissements API.

Le paquet JSON reçu n’est pas modifié. Le compteur « enrichissements API » continue donc de représenter uniquement la réponse de Dico-IC.

## Conservation des enrichissements API

La fonction de lecture fusionne pour l’affichage :

```text
enrichissements reçus de l’API
+
indices pédagogiques locaux applicables
```

Les autres tamis utilisent exactement leurs enrichissements API habituels. Une déduplication empêche l’ajout local si l’API fournit déjà un signal tamis 4 de même type et de même motif.

## Exemple vérifié

Texte :

```text
España es un país con una tradición importante.
```

Paramètres :

```text
langue source : es
langue de médiation : fr
tamis demandés : 1 à 7
```

Résultat du véritable appel local à `POST /analysis` :

- contrat `0.1` ;
- 9 tokens ;
- tamis 4 déclaré `experimental` ;
- token contenant `ñ` : `España` uniquement ;
- aucun enrichissement API tamis 4 pour `España`.

Résultat attendu de la couche locale :

- `España` reçoit l’indice `Indice ñ / gn` ;
- les huit autres tokens ne reçoivent pas cet indice ;
- au survol, l’infobulle reprend le message, l’exemple et la prudence ;
- les autres enrichissements éventuels restent affichables ;
- les autres tamis ne sont pas modifiés.

La page et son script ont été servis avec succès en HTTP local. La syntaxe JavaScript a également été vérifiée. Le navigateur intégré n’était pas accessible pendant cette session : le survol n’a donc pas pu faire l’objet d’une capture visuelle automatisée. Le chemin de rendu utilisé est toutefois le même que celui des infobulles existantes.

## Test local

Page expérimentale :

```text
http://127.0.0.1:8768/index-api-live-pedagogical-hints-0.1.html
```

Parcours :

1. saisir le texte de test ;
2. conserver `es` comme langue source et `fr` comme médiation ;
3. lancer « Analyser avec Dico-IC » ;
4. sélectionner le tamis 4 ;
5. utiliser « Montrer les indices du tamis actif » pour la surbrillance ;
6. survoler ou cliquer sur `España`.

## Limites V0

- une seule règle codée localement ;
- espagnol uniquement ;
- détection littérale de `ñ`, sans contexte phonétique ;
- message en français non localisé ;
- aucune validation enseignante enregistrée ;
- aucune mesure de faux positifs ou d’utilité pédagogique ;
- l’indice local n’entre pas dans le compteur des enrichissements API ;
- aucun partage du catalogue entre plusieurs clients Dico-IC.

Le rapprochement `ñ / gn` est volontairement formulé comme indice fréquent, pas comme transformation universelle ni comme traduction.

## Prochaines pistes

1. Tester l’indice avec plusieurs textes espagnols authentiques et quelques contre-exemples.
2. Recueillir l’avis d’enseignants sur le message, l’exemple et la prudence.
3. Vérifier si la surbrillance aide réellement sans surcharger le texte.
4. Ajouter seulement ensuite quelques indices robustes, par exemple `ñ / nh` ou `ph / f`, dans une autre variante expérimentale.
5. Si le catalogue devient utile et partagé, déplacer les connaissances validées vers Dico-IC et laisser Seven Sieves consommer les enrichissements fournis par l’API.

Ce déplacement futur ne devrait intervenir qu’après validation pédagogique. La variante actuelle sert précisément à tester cette valeur avant toute évolution du modèle de données.
