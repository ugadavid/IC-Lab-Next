# Mission 212 — Grille provisoire des relations Dico-IC

Date : 18 août 2026

## Périmètre réalisé

La mission est strictement documentaire côté interface. Elle explicite la
nature d’une relation, l’indice de transparence et la confiance sans modifier
le contrat API, le JavaScript métier ni les données MariaDB.

La fiche de consultation conserve son aide `? Comprendre les relations`
repliée par défaut et affiche désormais le texte public court demandé.

L’atelier relationnel comporte :

- le rappel visible selon lequel le score est une estimation humaine
  provisoire de la transparence pédagogique et non une probabilité ;
- une aide repliée par défaut intitulée
  `? Comprendre les types, les scores et la confiance` ;
- la grille complète demandée, avec types, facteurs d’appréciation, plages
  écrites avec des virgules décimales, distinction entre score et confiance,
  limite de la symétrie et caractère révisable de la proposition.

La présentation publique ne cite ni Christian Degache ni Sylvain Hatier.
David souhaite néanmoins revoir ultérieurement cette grille avec eux ; cette
intention est consignée uniquement dans le présent rapport.

## Fichiers concernés

- `prototypes/08-dico-seven-sieves/admin/index-admin-entry-0.1.1.html`
- `prototypes/08-dico-seven-sieves/admin/index-admin-entry-workbench-0.1.html`
- `prototypes/08-dico-seven-sieves/admin/css/admin-entry-0.1.1.css`
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js`
- `reports/212_dico_ic_provisional_relation_grid_report.md`

## Versions obtenues

- fiche de consultation : `0.1.5` (anciennement `0.1.4`) ;
- atelier de l’entrée : `0.1.1` (anciennement `0.1.0`).

Ces incréments du plus petit niveau existant correspondent au baby step
documentaire visible propre à chacun des deux artefacts. Les autres versions
sont inchangées.

## Contrôles automatisés

- tests ciblés : `node --test test/static-files.test.js test/admin-presentation.test.js` — 15/15 réussis ;
- suite complète : `npm.cmd test` — 214/214 réussis ;
- les assertions couvrent les versions, les intitulés et formulations
  essentiels, les virgules décimales, l’état replié par défaut et l’absence des
  deux noms propres dans l’interface publique ;
- `git diff --check` — réussi, sans erreur d’espace ; les avertissements Git
  concernent uniquement la conversion LF/CRLF au prochain traitement Git.

## Recette visuelle et fonctionnelle en lecture seule

Recette ciblée dans le navigateur Chromium intégré, sans clic sur une action
d’écriture :

- `INFORMATION_DATA`, consultation et atelier, à 1440 × 900 ;
- `NUIT`, consultation et atelier, à 1366 × 768 ;
- les deux aides sont repliées au chargement, s’ouvrent au clic puis se
  referment au second clic ;
- le rappel calme est visible dans les deux ateliers ;
- les textes complets, accents et plages décimales sont présents ;
- aucun débordement horizontal global ni mojibake détecté ;
- aucune erreur console détectée ;
- aucun texte de l’aide ne dépasse la largeur disponible ;
- les deux consultations présentent 10 relations documentées ;
- les deux ateliers présentent 10 paires sur 10 avec une relation présente et
  aucun bouton d’ajout résiduel.

La recette de Codex ne constitue pas la validation humaine de David.

## Préservation de MariaDB

Les six relations ajoutées manuellement à `INFORMATION_DATA` et les dix
relations ajoutées manuellement à `NUIT` depuis la Mission 211 ont été
considérées comme l’état canonique intentionnel. Elles n’ont été ni signalées
comme anomalie, ni restaurées, ni modifiées.

Un inventaire SQL strictement en lecture seule a été effectué avant les
modifications d’interface puis répété après les tests et la recette. Les
volumes et empreintes SHA-256 finales sont identiques aux valeurs initiales :

| Table | Volume | SHA-256 |
| --- | ---: | --- |
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1 286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

Les relations de `INFORMATION_DATA` sont toujours les IDs 5 à 8 et 72 à 77,
soit 10 relations. Celles de `NUIT` sont toujours les IDs 71 et 78 à 86,
soit 10 relations. MariaDB, ses formes, ses entrées et ses relations n’ont donc
subi aucune écriture pendant la mission.

## Services et appels externes

Le service Dico-IC déjà actif sur le port 3000 a suffi à la recette. Aucun
service n’a été arrêté, démarré ou redémarré par la mission. Aucun appel OpenAI,
déploiement, commit ou push n’a été effectué.

## Limites restantes

- la grille reste une proposition humaine provisoire et non une validation
  scientifique ou expérimentale ;
- la pertinence linguistique des seuils doit encore être discutée avec les
  spécialistes puis confrontée aux usages réels ;
- la validation humaine finale de David reste à effectuer.

## Message de commit proposé

`docs(dico-ic): expliciter la grille provisoire des relations`
