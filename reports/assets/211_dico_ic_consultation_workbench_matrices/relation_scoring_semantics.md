# Sémantique constatée des relations Dico-IC

## Conclusion opérationnelle

Le modèle V0 décrit une relation pédagogique entre deux formes lexicales. Il ne stocke pas séparément la parenté étymologique, la ressemblance graphique et l'utilité pour l'intercompréhension. Ces trois dimensions doivent donc être explicitées dans la justification humaine et ne peuvent pas être déduites du seul `score`.

## Champs constatés

- `relation_type` qualifie la nature pédagogique retenue : `COGNATE_STRONG`, `COGNATE_WEAK`, `FALSE_FRIEND` ou `RELATED_FORM` dans les routes actuelles.
- `score` représente, d'après la documentation du modèle, la force ou la qualité pédagogique attribuée manuellement à la relation. Il ne constitue ni une distance graphique calculée, ni une probabilité étymologique, ni une vérité linguistique absolue.
- `confidence_score` représente la confiance dans l'annotation elle-même. Le modèle ne précise pas s'il vise séparément le type ou la valeur du score : il porte donc prudemment sur l'ensemble de l'annotation.
- `source_label` indique l'origine de l'annotation. `manual_seed` et `manual_seed_v2` désignent des corpus initiaux ; `manual_admin_v0` désigne une saisie administrative ; `api_mock_support_v0` une provenance historique de support API.
- `is_symmetric` est vrai pour les 70 relations réelles. Le code de lecture, l'assistant et les protections Mission 210 traitent également les paires indépendamment de leur ordre.

## Types

- `COGNATE_STRONG` : formes très proches, sens proche et transparence forte.
- `COGNATE_WEAK` : formes apparentées ou proches, mais transparence moins immédiate.
- `FALSE_FRIEND` : formes proches mais sens différent ou trompeur.
- `RELATED_FORM` : accepté par l'administration et l'assistant, mais absent des 70 relations réelles et insuffisamment défini dans la documentation observée. Il n'est donc pas utilisé dans les deux matrices proposées.

La parenté étymologique n'entraîne pas automatiquement `COGNATE_STRONG` : une évolution phonographique opaque peut rester un cognat faible pédagogiquement.

## Valeurs réelles observées le 18 août 2026

| Type | Nombre | Minimum | Maximum | Moyenne |
|---|---:|---:|---:|---:|
| `COGNATE_STRONG` | 47 | 0,86 | 0,99 | 0,95 |
| `COGNATE_WEAK` | 15 | 0,42 | 0,82 | 0,69 |
| `FALSE_FRIEND` | 8 | 0,05 | 0,10 | 0,08 |

Provenances : 29 `manual_seed`, 35 `manual_seed_v2`, 2 `manual_admin_v0` et 4 `api_mock_support_v0`. Aucune relation réelle n'est non symétrique.

## Méthode proposée pour les matrices

Les scores proposés restent dans les plages réelles du type choisi :

- 0,86–0,99 : transparence très forte et transfert pédagogique immédiat ;
- 0,42–0,82 : parenté ou proximité utile, avec transformation moins transparente ;
- 0,05–0,10 : faux ami avéré, score faible conformément aux seeds actuels.

La justification de chaque paire distingue :

1. parenté étymologique supposée ou établie dans le cadre de travail ;
2. proximité graphique directement observable ;
3. intérêt attendu pour l'intercompréhension.

Les chiffres ne proviennent d'aucun algorithme stabilisé. Ils sont des valeurs d'arbitrage alignées sur les plages historiques. Toutes les lignes `proposed` exigent une validation humaine.

## Provenance proposée

`manual_seed` ne convient pas à de nouvelles décisions. `manual_admin_v0` est une provenance existante adaptée à une saisie humaine, mais elle ne permet pas d'identifier l'arbitrage Mission 212. Les matrices proposent donc `human_review_mission212`, valeur dédiée et descriptive, à valider par David avant insertion. Si aucune nouvelle provenance n'est souhaitée, le repli cohérent est `manual_admin_v0`.

## Anglais et symétrie

Le modèle réel contient déjà de nombreux cognats avec l'anglais, notamment `information ↔ information`, `nation ↔ nation` et `musique ↔ music`. L'anglais peut donc être qualifié de cognat lorsqu'une parenté et une utilité pédagogique sont défendables.

Les quatre types disponibles sont actuellement traités comme symétriques par le modèle et les données. Cette symétrie signifie que la relation unit la paire indépendamment du sens de consultation ; elle ne prétend pas que l'aide pédagogique ressentie soit identique pour les apprenants de chaque langue.

## Ambiguïtés non résolues

- aucune formule de score n'est stabilisée ;
- `confidence_score` ne sépare pas confiance dans le type et confiance dans le score ;
- `RELATED_FORM` ne dispose pas d'une sémantique assez précise dans les données réelles ;
- l'étymologie n'est pas un champ structuré ;
- les seuils constatés sont descriptifs, non normatifs.
