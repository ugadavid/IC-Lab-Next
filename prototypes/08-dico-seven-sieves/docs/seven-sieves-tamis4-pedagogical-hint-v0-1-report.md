# Seven Sieves — extension V0.1 du catalogue pédagogique du tamis 4

## Objectif

Étendre le prototype local du tamis 4 avec quatre indices grapho-phonétiques simples et fréquents, afin de disposer d’une démonstration plus représentative pour les enseignants d’intercompréhension.

Cette expérimentation reste entièrement dans Seven Sieves. Elle ne modifie ni Dico-IC, ni MariaDB, ni `POST /analysis`.

## Fichier modifié

```text
prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js
```

La variante expérimentale continue d’être :

```text
prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html
```

La page live officielle `index-api-live-0.1.html` et son script n’ont pas été modifiés.

## Catalogue V0.1

### 1. `ñ / gn`

Règle historique conservée inchangée.

```text
Indice de lecture : le ñ espagnol correspond souvent au groupe gn en français.
Exemple : España / Espagne.
Prudence : Indice utile, mais pas une règle universelle.
```

La détection reste une recherche du caractère `ñ` n’importe où dans le token.

### 2. `-ción / -tion`

```text
Les noms espagnols terminés par -ción correspondent souvent à des noms français en -tion.
```

Exemples proposés :

- `organización / organisation` ;
- `educación / éducation` ;
- `información / information` ;
- `formación / formation`.

Prudence : `Indice fréquent mais non systématique.`

### 3. `-dad / -té`

```text
Les noms espagnols terminés par -dad correspondent souvent à des noms français en -té.
```

Exemples proposés :

- `universidad / université` ;
- `actividad / activité` ;
- `realidad / réalité`.

Prudence : `Indice fréquent mais non systématique.`

### 4. `-mente / -ment`

```text
Les adverbes espagnols en -mente correspondent souvent aux adverbes français en -ment.
```

Exemples proposés :

- `rápidamente / rapidement` ;
- `normalmente / normalement`.

Prudence : `Indice fréquent mais non systématique.`

## Détection

Le catalogue possède désormais deux modes minimaux :

| Mode | Règle | Comportement |
|---|---|---|
| présence | `ñ` | le motif peut apparaître à n’importe quelle position |
| terminaison | `ción`, `dad`, `mente` | le motif doit terminer le token |

Cette distinction évite qu’une suite de lettres interne déclenche à tort une règle de suffixe. Le prototype n’utilise ni NLP, ni lemmatisation, ni analyse grammaticale.

## Affichage et coexistence avec l’API

Le mécanisme existant est conservé :

- surbrillance avec le style du tamis 4 ;
- infobulle au survol ;
- détail dans le panneau d’inspection ;
- présence dans la liste des indices du tamis actif ;
- sélection et statuts locaux inchangés.

Les enrichissements reçus de l’API sont lus normalement. Les indices pédagogiques locaux sont ajoutés uniquement au moment du rendu. Le paquet JSON, son contrat et son compteur d’enrichissements API ne sont pas altérés.

Si l’API fournit déjà un signal tamis 4 de même type et de même motif, le doublon local est écarté.

## Exemples testés

### Régression de la règle `ñ`

Résultats attendus et obtenus par le catalogue :

```text
España     → ñ / gn
señal      → ñ / gn
compañero  → ñ / gn
```

### Texte principal

```text
La organización internacional promueve la educación científica y la cooperación cultural.

La información circula rápidamente.

Una metodología basada en la observación y la comparación favorece la comprensión.
```

Indices détectés :

```text
organización  → -ción / -tion
educación     → -ción / -tion
cooperación   → -ción / -tion
información   → -ción / -tion
rápidamente   → -mente / -ment
observación   → -ción / -tion
comparación   → -ción / -tion
```

`comprensión` ne déclenche pas cette règle : sa finale est `-sión`. Ce cas pourra être étudié séparément dans une future itération, sans élargir implicitement la règle `-ción`.

### Complément pour `-dad`

```text
La universidad estudia la actividad y la realidad.
```

Indices détectés :

```text
universidad  → -dad / -té
actividad    → -dad / -té
realidad     → -dad / -té
```

### Cas négatifs contrôlés

```text
internacional  → aucun indice local du catalogue
tradiciónal    → aucun indice -ción, car la suite ne termine pas le token
comprensión    → aucun indice -ción, car sa finale est -sión
```

## Validation réalisée

- syntaxe JavaScript valide ;
- quatre règles chargées ;
- présence et terminaison distinguées ;
- règle `ñ` toujours fonctionnelle ;
- véritable réponse API au contrat `0.1` ;
- 39 tokens et 50 enrichissements API conservés sur le texte combiné ;
- statuts des sept tamis inchangés ;
- coexistence de plusieurs indices dans un même texte ;
- page expérimentale servie avec succès en HTTP local.

Le navigateur intégré n’était pas disponible pendant la validation. Aucune capture d’écran automatisée n’a donc été produite. Les exemples ci-dessus proviennent des tests de détection et du véritable paquet API local ; le rendu emprunte toujours le mécanisme d’infobulle déjà validé lors du prototype précédent.

## Limites

- catalogue espagnol uniquement ;
- quatre indices codés dans le frontend ;
- correspondances simplifiées et non exhaustives ;
- aucune analyse de la catégorie grammaticale réelle ;
- une terminaison correspondante déclenche l’indice même si le mot constitue une exception sémantique ;
- messages uniquement en français ;
- pas de mesure d’utilité pédagogique ni de taux de faux positifs ;
- aucune administration du catalogue ;
- les indices locaux ne sont pas partagés avec d’autres clients Dico-IC.

`-ción / -tion`, `-dad / -té` et `-mente / -ment` peuvent aussi être étudiés comme correspondances du tamis 3. Dans ce prototype, ils sont présentés au tamis 4 pour tester une explication de lecture. Une future clarification éditoriale devra éviter de répéter exactement le même message dans plusieurs tamis.

## Recommandations pour la suite

1. Présenter ce catalogue réduit à quelques enseignants avant d’ajouter d’autres règles.
2. Observer quels indices déclenchent une vraie stratégie de lecture et lesquels semblent redondants avec le tamis 3.
3. Ajouter des contre-exemples réels et mesurer les faux positifs.
4. Tester la lisibilité lorsque plusieurs indices concernent un même token.
5. Étudier ensuite `ñ / nh`, `ph / f` ou `qu/gu`, mais dans une nouvelle itération limitée.
6. Conserver la provenance locale visible tant que le catalogue n’est pas validé.

## Vers un futur objet pédagogique Dico-IC ?

### Ce qui peut rester local à Seven Sieves

- le style de surbrillance ;
- le moment d’affichage de l’infobulle ;
- l’activation du tamis ;
- les interactions de sélection et d’inspection ;
- d’éventuelles formulations temporaires servant aux tests d’interface.

### Ce qui pourrait un jour être porté par Dico-IC

- langue concernée ;
- motif visible et mode de détection ;
- rapprochement proposé ;
- message pédagogique validé ;
- exemples et contre-exemples ;
- prudence ;
- source, confiance et statut de validation.

Ce déplacement permettrait de partager les indices entre Seven Sieves et d’autres clients, tout en les administrant hors du code frontend. Il ne doit toutefois être envisagé qu’après validation de leur utilité et clarification de la frontière entre tamis 3 et tamis 4.

Aucune modification du modèle Dico-IC n’est proposée ou réalisée dans cette V0.1.
