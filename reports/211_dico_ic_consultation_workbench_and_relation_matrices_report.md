# Mission 211 — Séparation consultation/atelier et matrices relationnelles

Date : 18 août 2026

## Résultat

La fiche conceptuelle et l'atelier sont désormais deux pages réellement distinctes :

- la fiche historique `index-admin-entry-0.1.1.html` est une consultation synthétique destinée à la lecture et à la soutenance ;
- le nouvel `index-admin-entry-workbench-0.1.html` concentre toute l'édition de l'entrée et des relations issue de la Mission 210.

La consultation ne montre que les relations enregistrées. L'atelier montre toutes les paires entre les formes actuellement documentées. Aucun traitement n'est codé en dur pour `INFORMATION_DATA` ou `NUIT`.

Les deux matrices exhaustives et une note de sémantique ont été produites sans écrire aucune proposition dans MariaDB réelle.

## Base de travail Mission 210

La Mission 210 était volontairement non commitée et constitue la base autorisée de cette mission. Ses acquis sont conservés :

- édition explicite, annulation, absence d'autosave et protection contre les réponses tardives ;
- route `PUT /admin/form-relation/:relationId` ;
- création et modification relationnelles ;
- calcul dynamique des paires non orientées ;
- détection symétrique et refus des doublons inverses ;
- préservation des provenances et notes historiques.

Le HEAD reste `15f4452`, commit de la Mission 209. Aucun changement de la Mission 210 n'a été traité comme étranger ou écrasé.

## Fiche de consultation

La page historique conserve son URL et présente :

- clé conceptuelle discrète, gloses et domaine ;
- action `Modifier et documenter cette entrée` vers l'atelier de la même clé ;
- formes en cartes, avec le décompte `Formes actuellement documentées` ;
- rappel que le catalogue Dico-IC référence douze langues ;
- anglais en dernier avec le libellé `Langue de comparaison — non romane` ;
- uniquement les relations réellement documentées, sous forme de cartes ;
- type humanisé et code technique, score, confiance et provenance ;
- aide repliée `? Comprendre les relations`.

La consultation ne contient aucun tableau de paires, bouton d'ajout, paire absente, compteur théorique ou vocabulaire de travail inachevé.

Lorsque l'entrée n'a aucune relation, l'état calme demandé est affiché avec l'action `Ouvrir l'atelier des relations`.

## Atelier de l'entrée

Le nouvel atelier est le seul emplacement de la logique Mission 210. Il conserve :

- modification des gloses, domaine, lemmes et catégories grammaticales ;
- sauvegarde et annulation explicites ;
- aucune écriture si le brouillon est inchangé ;
- maintien du brouillon après erreur ;
- prévention de perte et invalidation des réponses tardives ;
- ajout et modification de relation ;
- compteur actualisé après réponse serveur ;
- protections serveur et transactionnelles.

Le retour `← Revenir à la fiche de consultation` conserve la clé courante.

Pour cinq formes, l'atelier présente dix paires dans l'ordre FR, ES, IT, PT, EN. Le compteur dit explicitement, par exemple :

```text
4 présentes · 6 absentes · 10 paires entre les 5 formes actuellement documentées
```

Il ne présente jamais ces cinq langues comme la limite globale de Dico-IC.

## Navigation depuis le lexique

- `Voir` ouvre la fiche historique de consultation ;
- `Modifier` est maintenant un lien direct vers l'atelier ;
- la fiche ouvre l'atelier ;
- l'atelier revient à la fiche.

L'ancien formulaire général reste disponible pour la création manuelle, mais la liste du lexique ne lance plus une seconde interface d'édition concurrente pour une entrée existante.

## Comportement des deux vitrines

### `INFORMATION_DATA`

- cinq formes exactes : IDs 6 à 10 ;
- consultation : cinq cartes de formes et quatre cartes de relations ;
- aucune des six paires absentes n'apparaît en consultation ;
- atelier : quatre relations présentes et six absentes sur dix paires.

### `NUIT`

- cinq formes réelles : FR 1625 `nuit`, ES 1626 `noche`, IT 1627 `notte`, PT 1628 `noite`, EN 1629 `night` ;
- consultation : cinq cartes et état vide calme ;
- atelier : zéro relation présente et dix absentes sur dix paires.

## Sémantique constatée des relations

Le schéma, le repository, les routes, tests, seeds, assistants Relations, documentation et 70 lignes réelles ont été inspectés.

- `type` qualifie la nature pédagogique retenue ;
- `score` exprime actuellement une force ou qualité pédagogique manuelle, et non une mesure graphique ou étymologique calculée ;
- `confidence_score` porte sur la confiance dans l'annotation globale ; le modèle ne distingue pas confiance dans le type et confiance dans la valeur ;
- `source_label` documente l'origine de l'annotation ;
- toutes les relations réelles sont marquées symétriques.

Distribution réelle :

| Type | Nombre | Plage | Moyenne |
|---|---:|---:|---:|
| `COGNATE_STRONG` | 47 | 0,86–0,99 | 0,95 |
| `COGNATE_WEAK` | 15 | 0,42–0,82 | 0,69 |
| `FALSE_FRIEND` | 8 | 0,05–0,10 | 0,08 |

`RELATED_FORM` est accepté par les contrats mais absent des données réelles et insuffisamment défini. Les matrices ne l'utilisent donc pas.

Les cognats avec l'anglais sont permis et déjà présents. La symétrie décrit l'unicité de la paire, sans prétendre que l'aide soit identique dans chaque direction d'apprentissage.

La méthode de score n'étant pas stabilisée, les valeurs nouvelles sont des repères d'arbitrage alignés sur les plages historiques. Elles distinguent dans chaque justification parenté supposée, proximité graphique observable et intérêt pour l'intercompréhension.

## Matrices proposées

### `INFORMATION_DATA`

La matrice contient exactement dix paires :

- quatre lignes `existing`, reproduites avec leurs IDs et valeurs réelles ;
- six lignes `proposed`, toutes proposées en `COGNATE_STRONG` avec scores 0,93 à 0,97 ;
- confiance proposée 0,90 ;
- provenance proposée `human_review_mission212` ;
- validation humaine obligatoire pour les six nouvelles lignes.

### `NUIT`

La matrice contient exactement dix lignes `proposed` :

- toutes en `COGNATE_WEAK`, afin de ne pas confondre parenté historique et transparence pédagogique ;
- scores proposés 0,44 à 0,82 ;
- confiance 0,70 à 0,86 ;
- incertitude accrue pour les paires avec l'anglais, dont la parenté indo-européenne lointaine doit être confirmée ;
- validation humaine obligatoire pour chaque ligne.

La provenance dédiée `human_review_mission212` est une proposition à arbitrer. Le repli avec une valeur existante est `manual_admin_v0`; `manual_seed` serait historiquement inexact.

## Tests automatisés

Les tests Mission 210 sont préservés et complétés pour vérifier :

- séparation stricte des assets consultation/atelier ;
- absence de logique POST/PUT et de paires manquantes dans la consultation ;
- relations documentées seules et état vide ;
- liens fiche/atelier et liens `Voir`/`Modifier` du lexique ;
- dix paires et compteur d'atelier ;
- symétrie, refus des doublons inverses, édition, annulation et erreurs ;
- structure exhaustive des matrices, IDs, paires normalisées, statuts et validation humaine ;
- présence des deux pages statiques et versions.

Résultats :

- contrôles ciblés : 41/41 réussis ;
- suite Node complète : 214/214 réussis ;
- syntaxe Node des sources concernées : réussie ;
- quatre JSON validés par parseur et tests : réussis ;
- `git diff --check` : réussi, hors avertissements Windows LF/CRLF.

## Recette visuelle

La recette a utilisé les dimensions exactes demandées :

- consultation `INFORMATION_DATA` à 1440 × 900 : cinq formes, quatre cartes relationnelles, aucune paire manquante, aucun tableau ;
- consultation `NUIT` à 1366 × 768 : cinq formes, zéro carte, état vide calme ;
- atelier `INFORMATION_DATA` à 1440 × 900 : 4 présentes, 6 absentes, 10 paires ;
- atelier `NUIT` à 1440 × 900 : 0 présente, 10 absentes, 10 paires ;
- ouverture puis annulation du formulaire d'entrée ;
- création puis modification d'une relation sur fixture ;
- aucun débordement horizontal global, mojibake, erreur ou avertissement console.

La recette Codex ne remplace pas la validation humaine de David.

## Fixture d'écriture

La copie `ic_dico_m211_fixture_15f4452` des huit tables a servi la recette d'écriture :

- création ES 7 ↔ IT 8 en `COGNATE_STRONG`, score 0,94 ;
- compteur immédiatement passé à 5 présentes et 5 absentes ;
- modification en `COGNATE_WEAK`, score 0,80 ;
- provenance `mission211_fixture` conservée.

Le serveur PID 72760 sur 3001 a été authentifié puis arrêté. Les droits temporaires ont été révoqués, la base supprimée et son absence finale vérifiée.

## Intégrité MariaDB réelle

Les huit empreintes correspondent exactement à la preuve finale de la Mission 210 :

| Table | Volume | SHA-256 |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1 286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 70 | `4d3f55cfe964bcba184d07d63eb05e631cc186aaf26da42974a1c17ac2ceaa43` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

La base réelle conserve quatre relations pour `INFORMATION_DATA` et zéro pour `NUIT`. Aucune forme, relation ou entrée réelle n'a été modifiée.

## Versions

- administration principale : V0.1.6 → V0.1.7, car la navigation `Modifier` change ;
- fiche de consultation : V0.1.3 → V0.1.4 ;
- nouvel atelier : V0.1.0 ;
- contrat API global, package Node, Seven Sieves et autres prototypes : inchangés.

## Services

- Dico réel reste actif sur 3000, PID 27588, consultation HTTP 200 V0.1.4 et atelier HTTP 200 V0.1.0 ;
- Proto05 PID 42532, IC-Hub PID 53628 et Agent vocal PID 29348 n'ont pas été interrompus ;
- serveur fixture 3001 arrêté ;
- MariaDB et Docker laissés actifs dans leur état initial.

## Fichiers applicatifs Mission 211

Modifiés :

- `prototypes/08-dico-seven-sieves/admin/index-admin-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-0.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-entry-0.1.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-entry-0.1.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-entry-0.1.1.css` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/referenced-romance-languages.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/semantic-domain-normalization.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`.

Créés :

- `prototypes/08-dico-seven-sieves/admin/index-admin-entry-workbench-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-entry-workbench-0.1.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/relation-matrices.test.js` ;
- `reports/assets/211_dico_ic_consultation_workbench_matrices/information_data_relation_matrix.json` ;
- `reports/assets/211_dico_ic_consultation_workbench_matrices/nuit_relation_matrix.json` ;
- `reports/assets/211_dico_ic_consultation_workbench_matrices/relation_scoring_semantics.md` ;
- `reports/assets/211_dico_ic_consultation_workbench_matrices/fixture_validation.json` ;
- `reports/assets/211_dico_ic_consultation_workbench_matrices/real_db_integrity.json` ;
- `reports/211_dico_ic_consultation_workbench_and_relation_matrices_report.md`.

Les fichiers backend et tests non cités ici mais encore modifiés dans Git appartiennent à la Mission 210 non commitée et sont volontairement conservés.

## Limites et suite

- les scores proposés ne reposent pas sur une formule scientifique stabilisée ;
- la parenté étymologique de `NUIT` avec l'anglais demande une validation linguistique humaine ;
- la provenance `human_review_mission212` doit être arbitrée ;
- aucune proposition n'a été appliquée à MariaDB ;
- Mission 212 pourra appliquer uniquement les lignes validées ;
- aucun appel OpenAI, commit, push ou déploiement n'a été effectué.

Message de commit proposé pour les Missions 210 et 211 :

```text
feat(dico-ic): rendre les fiches éditables et séparer consultation et atelier
```
