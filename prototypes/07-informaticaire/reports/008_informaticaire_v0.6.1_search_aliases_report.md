# Rapport 008 - Informaticaire v0.6.1 search aliases

## Objectif du hotfix

Corriger la recherche d'Informaticaire pour qu'elle retrouve les fiches centrales malgré les variantes de noms, sigles, graphies approximatives, accents, majuscules ou formes collées.

Le cas déclencheur était `EuRom 5`, qui ne retournait aucune fiche alors que la fiche `EuRom / EuRom Web` existe.

## Fichiers modifiés

- `prototypes/07-informaticaire/data.js`
- `prototypes/07-informaticaire/script.js`

## Fichier créé

- `prototypes/07-informaticaire/reports/008_informaticaire_v0.6.1_search_aliases_report.md`

## Champ aliases ajouté

Le champ `aliases` a été ajouté aux fiches centrales suivantes :

- EuRom / EuRom Web
- Galanet
- Galapro
- Miriadi
- Romanofonía y Cinema
- REPLI4C
- ALPAGA
- IPLERA
- APICAD
- ELAN
- Speechmatics
- PHIP
- Itinéraires romans
- Elementi di intercomprensione UniTO

Exemples d'alias ajoutés :

- `EuRom 5`, `EuRom5`, `Eurom 5`, `Eurom5`, `EuRom Web`, `EuroComRom`
- `GalaNet`
- `GalaPro`
- `Myriadi`
- `Romanophonie`
- `Repli4C`, `Reply for C`
- `IPLER`, `Iplera`

## Normalisation de recherche améliorée

La recherche utilise désormais une fonction `normalizeSearchText(value)` qui :

- passe le texte en minuscules ;
- supprime les accents ;
- remplace les ponctuations et séparateurs par des espaces ;
- nettoie les espaces superflus.

La recherche porte notamment sur :

- `title`
- `description`
- `tags`
- `actors`
- `interviews`
- `aliases`
- `communityUse`
- `reuseHint`
- `contributionHint`

## Variantes collées / non collées

La recherche compare aussi une version compacte sans espaces.

Ainsi :

- `EuRom5` peut trouver `EuRom 5` ;
- `Eurom5` peut trouver `EuRom 5` ;
- `Reply for C` peut trouver la fiche `REPLI4C` grâce aux alias.

## Priorité des résultats

Un tri léger de pertinence a été ajouté pour remonter en premier :

- les titres exacts ;
- les alias exacts ;
- les titres partiels ;
- les alias partiels ;
- puis les correspondances indirectes dans les autres champs.

Cela évite par exemple qu'une recherche `GalaNet` affiche d'abord une fiche liée avant la fiche `Galanet`.

## État aucune fiche amélioré

Le message d'absence de résultat propose maintenant des variantes utiles :

> Essayez une variante du nom, par exemple EuRom 5 / EuRom5, Galanet / GalaNet, REPLI4C / Reply for C.

Si la recherche contient `eurom`, une suggestion explicite est ajoutée :

> Suggestion : essayez la fiche EuRom / EuRom Web.

## Recherches testées

- EuRom 5
- EuRom5
- eurom web
- GalaNet
- GalaPro
- Myriadi
- Miriadi
- Romanophonie
- Romanofonía
- Repli4C
- Reply for C
- Iplera

## Résultats

Toutes les recherches obligatoires retournent au moins une fiche pertinente.

Les vérifications complémentaires confirment :

- les filtres fonctionnent encore ;
- la démo Galanet fonctionne encore ;
- les exports JSON et CSV fonctionnent encore côté navigateur ;
- aucune erreur console n'a été détectée ;
- la version mobile ne présente pas de débordement horizontal.

## Limites restantes

- Il ne s'agit pas d'une recherche floue complète : les fautes très éloignées ne sont pas corrigées automatiquement.
- Les alias doivent être enrichis progressivement avec les retours utilisateurs.
- Les suggestions restent simples et ne couvrent explicitement que le cas EuRom.
- Les champs `aliases` ne sont pas encore affichés dans les fiches détaillées.

## Confirmation de périmètre

Le hotfix a été réalisé uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas été modifié.

Aucun autre prototype n'a été modifié.
