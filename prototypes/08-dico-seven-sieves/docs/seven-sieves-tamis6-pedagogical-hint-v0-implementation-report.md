# Seven Sieves — implémentation de l’indice pédagogique Tamis 6 V0

## Objectif

Afficher dans Seven Sieves une explication pédagogique lorsqu’un token possède déjà un enrichissement de pluriel validé fourni par Dico-IC.

Le parcours complet devient :

```text
mapping inflected_form VALIDATED
↓
enrichissement API tamis 6
↓
rendu pédagogique Seven Sieves
```

Seven Sieves ne reconnaît aucune nouvelle forme et ne réalise aucun calcul morphologique.

## Fichiers modifiés

- `prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html`
- `prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js`

Fichier créé :

- `docs/seven-sieves-tamis6-pedagogical-hint-v0-implementation-report.md`

La page live officielle `index-api-live-0.1.html`, Dico-IC, MariaDB, le schéma SQL, les endpoints, l’admin et les assistants IA n’ont pas été modifiés.

## Logique de rendu retenue

### Déclencheur strict

Le rendu spécialisé s’active uniquement lorsque l’enrichissement satisfait toutes les conditions suivantes :

```text
sieve_id = 6
type = morphosyntactic_signal
source.kind = inflected_form
payload.category = validated_plural
payload.grammatical_number = PLURAL
payload.lemma présent
payload.surface_form présent
```

La fonction `isValidatedPluralEnrichment()` centralise cette vérification.

Un autre enrichissement tamis 6, par exemple l’ancien signal heuristique d’infinitif, continue d’utiliser le format générique.

### Données utilisées

Le formateur lit directement :

```text
payload.lemma
payload.surface_form
payload.grammatical_number
```

Il ne retire aucun suffixe, ne fabrique aucun lemme et n’applique aucune règle en `-s` ou `-es`.

Le message de prudence utilise `enrichment.caution` fourni par l’API. Un texte de secours équivalent existe uniquement pour éviter une infobulle incomplète si ce champ optionnel manque.

### Présentation

Le rendu produit :

```text
Indice de pluriel

Cette forme est le pluriel validé de « organización ».

Singulier :
organización

Pluriel observé :
organizaciones

Information utile :
Le texte emploie « organización » au pluriel.

Prudence :
Cette information provient d’un mapping validé dans Dico-IC.
```

La conclusion reste volontairement liée au lemme reçu. Le payload ne fournit pas la forme française plurielle `organisations` ; Seven Sieves ne la reconstruit donc pas.

### Réutilisation du mécanisme existant

Le même texte formaté alimente :

- l’infobulle au survol ;
- le panneau d’inspection ;
- la vue du tamis actif.

La fonction existante `classForEnrichment()` associait déjà tout enrichissement du tamis 6 à la classe `morpho-match`. Aucune nouvelle logique de surbrillance n’a été nécessaire.

Le CSS de l’infobulle de la variante accepte désormais les retours à la ligne avec `white-space: pre-line` et une largeur maximale légèrement supérieure. La page live officielle reste inchangée.

## Exemple réel testé

Texte :

```text
Las organizaciones internacionales participan en proyectos educativos.
```

L’API locale a renvoyé pour `organizaciones` trois enrichissements :

```text
1 : lexical_transparency
4 : grapho_phonetic_signal
6 : morphosyntactic_signal
```

L’enrichissement tamis 6 possède :

```text
source.kind                = inflected_form
payload.category           = validated_plural
payload.grammatical_number = PLURAL
payload.lemma              = organización
payload.surface_form       = organizaciones
```

Le déclencheur frontend a reconnu cet objet et produit exactement le rendu pédagogique présenté ci-dessus.

## Description du résultat visuel

Lorsque le tamis 6 est actif :

1. `organizaciones` reçoit la surbrillance morphosyntaxique existante après l’action « Montrer les indices du tamis actif » ;
2. son survol ouvre l’infobulle structurée « Indice de pluriel » ;
3. un clic sur le mot affiche le même détail dans le panneau d’inspection ;
4. les informations singulier et pluriel proviennent du payload API ;
5. les enrichissements des autres tamis restent accessibles en changeant de tamis ou dans la vue multi-tamis.

La page expérimentale et son script ont été servis avec succès en HTTP local. Le navigateur intégré n’était pas disponible pendant cette session ; aucune capture d’écran automatisée du survol n’a donc été produite. Le formateur, le déclencheur, la réponse API réelle et le CSS de présentation ont été vérifiés séparément.

## Compatibilité et non-régression

- le token conserve son enrichissement tamis 1 ;
- le token conserve son enrichissement tamis 4 ;
- le tamis 6 s’ajoute à la liste sans mutation des objets existants ;
- le catalogue pédagogique local du tamis 4 reste présent ;
- les autres enrichissements utilisent toujours le formateur générique ;
- aucune donnée du paquet API n’est modifiée ;
- aucune requête supplémentaire n’est envoyée ;
- aucune dépendance ou framework n’est ajouté ;
- la page live officielle n’est pas touchée.

La syntaxe JavaScript a été vérifiée avec succès. Le test de formatage utilise la véritable réponse de `POST /analysis` et confirme que le déclencheur strict vaut `true` uniquement pour l’objet attendu.

## Limites V0

- mapping `inflected_form` validé uniquement ;
- nombre `PLURAL` uniquement ;
- noms uniquement, selon le périmètre actuel du backend ;
- aucun pluriel probable ;
- aucune règle graphique ;
- aucun adjectif ;
- aucun genre ;
- aucun accord ;
- aucun traitement verbal ajouté ;
- formulation pédagogique uniquement en français ;
- aucune validation formelle par des enseignants ;
- pas de forme française plurielle dans le payload, donc aucune phrase générée du type « plusieurs organisations ».

## Prochaines étapes possibles

1. Faire tester l’infobulle à des enseignants sur des textes authentiques.
2. Ajuster la longueur et la hiérarchie du message selon leurs retours.
3. Ajouter éventuellement une formulation pédagogique localisée dans d’autres langues de médiation.
4. Évaluer l’affichage lorsqu’un token possède plusieurs enrichissements du même tamis.
5. Étendre plus tard le backend aux adjectifs validés, si ce besoin est confirmé.
6. Étudier séparément les pluriels probables en `-s` et `-es`, sans diminuer la priorité du mapping validé.

## Conclusion

Le premier parcours fonctionnel du tamis 6 est complet : une connaissance validée dans Dico-IC devient un enrichissement API, puis une explication visible dans Seven Sieves sans heuristique frontend.

```text
organizaciones
↓
organización + PLURAL validé
↓
Indice de pluriel
```
