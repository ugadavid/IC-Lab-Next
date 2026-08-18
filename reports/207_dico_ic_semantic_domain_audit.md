# Mission 207 — Audit linguistique et fonctionnel de `semantic_domain`

## Résultat

L’audit couvre exactement **270 entrées** et **84 valeurs binaires distinctes**. Les 270 valeurs sont non nulles et non vides ; aucune n’a d’espace périphérique. MariaDB retourne 79 valeurs distinctes avec la collation ordinaire, qui fusionne des variantes ; le chiffre exact est obtenu avec `BINARY`.

Le champ est **libre, seulement contrôlé en apparence**. Il sert de libellé humain, de terme de recherche `LIKE`, de métadonnée API et de sortie libre des assistants Domaine/Texte. Il n’est ni clé étrangère, ni identifiant stable, ni liste fermée.

## État de référence

- HEAD initial : `07b231e8396eeb4301581759cac957d8c7d39ea6`, worktree propre.
- Aucun service sur le port 3000 ; aucun service démarré.
- Volumes : 270 entrées, 1125 formes, 41 formes fléchies, 12 aides, 70 relations, 1 règle, 8 traits, 12 langues.
- Empreinte `lexical_entry` : `d14f5e21eda3f4eaf0fb76c1eac758269cb73e8d5a2802ead6d721baedabcd78`.

## Profil linguistique

Répartition des 270 entrées par nature probable de leur valeur : français : 166; technique : 8; international ou partagé : 73; anglais : 11; indéterminable : 4; anglais probable : 8. Aucun domaine proprement espagnol, italien ou portugais n’a été identifié : ces trois catégories ont un effectif nul. `education` reste classé indéterminable (anglais ou français désaccentué).

Principaux mélanges :

- casse : `Action/action`, `Changement/changement`, `Grammaire/grammaire`, `Qualité/qualité` ;
- langue/accent : `economy/économie`, `education/éducation`, `GEOGRAPHY/géographie`, `language/langue`, `society/société`, `time/temps` ;
- technique : `ENVIRONMENT_BIODIVERSITY`, `ENVIRONMENT_FIRE`, `FOOD_NUTRITION`, `VERB_TO_BE`, underscores et barres obliques ;
- synonymie probable : `météo/météorologie`, `food/FOOD_NUTRITION/nourriture` ;
- catégories grammaticales : `adverbe`, `grammaire`, sous-catégories et `verbe auxiliaire` ;
- catégories trop générales : `action`, `activité`, `description`, `general`, `nature`, `qualité`, `quantité`, `relation`, `temps`, `économie`.

## Propositions A à D

| Classe | Valeurs distinctes | Entrées | Sens |
|---|---:|---:|---|
| A — sûre | 14 | 28 | casse, accent ou traduction univoque vérifiée |
| B — probable | 5 | 10 | cible française solide avec léger choix terminologique |
| C — arbitrage réel | 19 | 123 | granularité ou regroupement à décider |
| D — conserver | 46 | 109 | valeur cohérente telle quelle |

Une correction A peut conduire vers une valeur elle-même classée C : `Action→action` est graphiquement sûre, même si le groupe `action` reste taxonomiquement trop général.

## Conclusions sémantiques

Les traductions biology, economy, GEOGRAPHY, health, language, politics, society et time sont sûres après examen des entrées. `liaison→relations logiques` et `météo→météorologie` sont probables. À l’inverse, `general` est réellement hétérogène ; `nature` mêle climat, eaux, habitats et environnement ; `qualité` sert surtout de type conceptuel adjectival ; `relation` mêle discours et causalité ; `temps` mêle temps, manière et discours ; `économie` contient RESULTAT et ALIMENTATION.

Aucune fusion automatique n’est proposée entre environnement et climat, alimentation et production agricole, grammaire et relations logiques, action et processus, émotion et sensation, danger et risque.

## Recommandation avant soutenance

Une refonte est disproportionnée. La cible recommandée est un **champ texte en français naturel**, avec accents, espaces et minuscules usuelles. Après arbitrage avec Christian des 19 valeurs C, une future transaction peut appliquer A/B puis les décisions C. Une liste de suggestions côté interface peut ensuite limiter la dérive. Table de domaines et séparation identifiant/libellé sont à reporter jusqu’à l’existence d’un besoin fonctionnel réel.

Une simple correction des données suffit pour A/B, mais pas pour tout le corpus.

## Livrables et contrôles

- `semantic_domain_inventory.csv` : 270 lignes de données ;
- `semantic_domain_usage_audit.md` : consommateurs fonctionnels ;
- `semantic_domain_normalization_map.json` : 84 correspondances ;
- `semantic_domain_review_required.csv` : 19 arbitrages ;
- `semantic_domain_preflight_selects.sql` : SELECT uniquement ;
- présent rapport.

L’audit utilise uniquement des SELECT directs et l’inspection statique. Aucun OpenAI, service, code, prompt, test, schéma ou donnée n’a été modifié. Mission documentaire : **versions inchangées**. La validation Codex ne vaut pas arbitrage métier.

## Contrôles de clôture réalisés

- CSV inventaire chargé : 270 lignes et 270 IDs uniques ;
- couverture binaire : 84 valeurs, somme des fréquences 270, aucune divergence avec le JSON ;
- JSON chargé : 84 correspondances et somme de 270 entrées ;
- CSV d’arbitrage : 19 lignes, identiques aux 19 mappings C ;
- SQL : six instructions, toutes `SELECT`, aucun jeton de mutation ;
- état Git limité au rapport et aux assets 207 ;
- aucun listener sur le port 3000 au début ou à la fin.

Les volumes et empreintes MariaDB de clôture sont identiques à ceux observés avant l’audit :

| Table | Lignes | SHA-256 déterministe |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 270 | `d14f5e21eda3f4eaf0fb76c1eac758269cb73e8d5a2802ead6d721baedabcd78` |
| `lexical_form` | 1125 | `8b3d2cd9098213395ce9cc78ac257424adc13f22a5775472c536a773529ea4f5` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 70 | `4d3f55cfe964bcba184d07d63eb05e631cc186aaf26da42974a1c17ac2ceaa43` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

## Message de commit proposé

`Mission 207 — auditer les usages et valeurs de semantic_domain`
