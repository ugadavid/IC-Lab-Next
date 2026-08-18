# Mission 208 — Normalisation prudente des domaines sémantiques A/B

Date : 18 août 2026

## Résultat

La normalisation A/B issue de la Mission 207 a été appliquée transactionnellement à la base canonique `ic_dico`. Les 38 entrées prévues ont reçu exactement leur libellé français attendu. Un second passage n'a modifié aucune ligne. Les 232 autres entrées, dont toutes les catégories C et D, sont restées identiques bit à bit.

Le champ demeure un texte libre et humainement révisable. Aucune taxonomie, table, contrainte de schéma ou liste fermée n'a été ajoutée.

## État de référence et sauvegarde

- dépôt de référence : `e5ff42d77a5a01ece364f400098a248d2f4a4af2` ;
- base source : `ic_dico` ;
- sauvegarde déterministe : `reports/assets/208_dico_ic_semantic_domain_ab_normalization/backup.json` ;
- SHA-256 de la sauvegarde : `8f838c1c64246d75d3f8bacb6d71575dfd410e5312de40d699376b3adbf6a05c` ;
- empreinte du plan : `ce2380342479877e9a1e8d7c75fa3ee7b03a74ad3fc64a5d175435a63dbfe063` ;
- empreinte initiale de `lexical_entry` : `d14f5e21eda3f4eaf0fb76c1eac758269cb73e8d5a2802ead6d721baedabcd78` ;
- empreinte finale attendue et obtenue : `0de59878ff98c0b6b6d4a6e49ac34c2754198a82d2803a4269a34ef1463ed787` ;
- empreinte des 232 entrées hors périmètre avant/après : `0b968e577667c93c751590a556e9e2e45e4227a3858c931f3c51b902c0fc8ee1`.

Les cinq sources Mission 207 sont contrôlées par leur SHA-256 avant toute opération. Leurs empreintes sont consignées dans la sauvegarde.

## Plan exact appliqué

| Catégorie | Ancienne valeur | Nouvelle valeur | IDs exacts |
|---|---|---|---|
| A | `Action` | `action` | 294, 308 |
| A | `Changement` | `changement` | 307 |
| B | `FOOD_NUTRITION` | `alimentation` | 330 |
| A | `GEOGRAPHY` | `géographie` | 332 |
| A | `Grammaire` | `grammaire` | 292, 293, 296, 297, 298, 300, 301, 303 |
| A | `Qualité` | `qualité` | 302, 304 |
| A | `biology` | `biologie` | 17 |
| A | `discourse` | `discours` | 227 |
| A | `economy` | `économie` | 28 |
| A | `education` | `éducation` | 5, 10, 29, 30 |
| B | `food` | `alimentation` | 14 |
| A | `health` | `santé` | 13 |
| A | `language` | `langue` | 32 |
| B | `liaison` | `relations logiques` | 131, 136, 140 |
| B | `météo` | `météorologie` | 234, 236, 238, 254 |
| A | `politics` | `politique` | 4, 19 |
| B | `social` | `relations sociales` | 6 |
| A | `society` | `société` | 18 |
| A | `time` | `temps` | 7, 8 |

Total : 14 valeurs A sur 28 entrées et 5 valeurs B sur 10 entrées, soit 19 valeurs et 38 IDs.

## Script permanent et garde-fous

Le script `Node/scripts/normalize-semantic-domains-ab.js` expose `--check`, `--apply` et `--rollback`. Chaque mode exige explicitement `--backup`.

- `--check` classe l'état comme initial, final ou partiel/inconnu, sans écriture ;
- `--apply` n'accepte que l'état initial complet ou final complet ;
- `--rollback` n'accepte que l'état final complet ;
- la transaction est unique et vérifie les compteurs, les empreintes globales, les 38 IDs et les valeurs attendues ;
- chaque écriture cible un ID et une valeur source exacts avec `BINARY semantic_domain = BINARY ?` ;
- aucune mise à jour globale par domaine n'existe ;
- toute ligne non modifiée alors qu'elle devait l'être annule la transaction ;
- un état partiel ou inconnu est refusé avant écriture.

Le test MariaDB jetable a confirmé : application de 38 lignes, rejeu idempotent à 0, restauration exacte des 38 anciennes valeurs, puis refus sans écriture après altération isolée de l'ID 294. La base et le privilège temporaires ont été supprimés après vérification. Le détail est conservé dans `reports/assets/208_dico_ic_semantic_domain_ab_normalization/fixture_validation.json`.

Une première tentative de création de la fixture avec le compte applicatif a été refusée par MariaDB, conformément à ses privilèges, avant toute création. La fixture a ensuite été administrée de façon isolée avec le compte de développement Docker et accordée uniquement au schéma temporaire.

## Résultat sur la base canonique

- précontrôle : état initial complet ;
- première application : 38 lignes modifiées et transaction validée ;
- seconde application : état final complet, 0 ligne modifiée ;
- contrôle final : état final complet ;
- les 19 anciennes valeurs sont absentes en comparaison binaire ;
- les 38 IDs portent leur cible exacte ;
- aucune autre colonne n'a été modifiée ;
- la recherche `LIKE` sur `relations logiques` retourne exactement `PARCE_QUE`, `POR_TANTO` et `CEPENDANT`.

## Volumes et empreintes préservés

| Table | Volume avant/après | SHA-256 avant/après |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 270 | `d14f5e…bcd78` → `0de598…d787` |
| `lexical_form` | 1 125 | `8b3d2cd9098213395ce9cc78ac257424adc13f22a5775472c536a773529ea4f5` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 70 | `4d3f55cfe964bcba184d07d63eb05e631cc186aaf26da42974a1c17ac2ceaa43` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

L'empreinte des 232 entrées hors plan est strictement inchangée. Cela établit notamment la préservation bit à bit des catégories C et D sans prétendre résoudre leurs questions taxonomiques.

## Prévention des nouvelles dérives

Une constante partagée `SEMANTIC_DOMAIN_INSTRUCTIONS` est définie par l'assistant Domaine et consommée également par l'assistant Texte. Elle demande un libellé bref en français naturel, en minuscules, avec accents et espaces, donne les exemples `environnement`, `relations logiques` et `production agricole`, et exclut l'anglais, les identifiants techniques, les underscores et les suffixes grammaticaux artificiels. Le domaine reste libre et révisable.

Les trois formulaires réellement concernés affichent discrètement : « Domaine en français naturel : minuscules, accents et espaces. »

## Versions

- administration principale : `0.1.5` → `0.1.6` ;
- assistant Domaine : `0.1.3` → `0.1.4` ;
- assistant Texte : `0.1.13` → `0.1.14` ;
- contrat API, package Node, Seven Sieves et autres prototypes : inchangés.

L'administration principale est versionnée car son formulaire de création a reçu l'aide demandée ; aucune autre fonction de cette interface n'a été modifiée.

## Vérifications réalisées

### Automatisées

- tests ciblés : 26/26 réussis ;
- suite complète avant application canonique : 194/194 réussis ;
- suite complète après application canonique : 194/194 réussis ;
- tests spécifiques : plan 19/38, classification d'état, sauvegarde obligatoire, écriture binaire par ID, consigne réellement partagée et champ libre, aides et versions UI ;
- `git diff --check` : aucune erreur.

Trois assertions de version existantes ont été alignées avec l'incrément de l'administration principale pendant la mise au point ; aucune régression fonctionnelle n'était en cause.

### HTTP

Le serveur Node ciblé a confirmé les volumes attendus, les domaines `biologie` pour `ANIMAL_CREATURE` et `relations logiques` pour `CEPENDANT`, ainsi que le maintien de `ENVIRONMENT_BIODIVERSITY` sur `BIODIVERSITE` (catégorie C). La recherche par `relations logiques` et le chargement des trois pages versionnées ont réussi.

### Visuelle Chromium

À une dimension représentative de 1265 × 710 :

- formulaire principal : aide visible près du domaine, sans recouvrement ;
- assistant Domaine : convention visible, version `0.1.4` ;
- assistant Texte : convention visible, version `0.1.14` ;
- vue conceptuelle `ANIMAL_CREATURE` : domaine `biologie` visible ;
- console : aucune erreur ni aucun avertissement.

Cette recette Codex ne remplace pas une validation fonctionnelle humaine de David.

## Services

Un serveur Node du projet a été démarré de façon ciblée pour les recettes HTTP et visuelles. Aucun processus n'écoute le port 3000 en fin de mission. Les services MariaDB/Docker préexistants n'ont pas été arrêtés. Aucun launcher n'a été modifié.

## Fichiers concernés

Créés :

- `prototypes/08-dico-seven-sieves/Node/scripts/normalize-semantic-domains-ab.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/semantic-domain-normalization.test.js` ;
- `reports/assets/208_dico_ic_semantic_domain_ab_normalization/backup.json` ;
- `reports/assets/208_dico_ic_semantic_domain_ab_normalization/fixture_validation.json` ;
- `reports/208_dico_ic_semantic_domain_ab_normalization_report.md`.

Modifiés :

- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-text.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-domain-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/referenced-romance-languages.test.js`.

## Limites et suites

- aucun appel OpenAI réel n'a été effectué, conformément à la mission ; la présence de la consigne a été vérifiée statiquement et par tests ;
- les catégories C, D et les groupes explicitement exclus restent à arbitrer séparément ;
- aucune validation humaine n'est revendiquée ;
- aucun commit, push ou déploiement n'a été réalisé.

Message de commit proposé :

```text
Mission 208 — normaliser transactionnellement les domaines sémantiques A/B
```
