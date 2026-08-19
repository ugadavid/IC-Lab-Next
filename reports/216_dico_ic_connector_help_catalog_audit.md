# Mission 216 — Audit approfondi du catalogue des aides à la lecture de Dico-IC

Date : 2026-08-19  
Nature : audit technique et linguistique en lecture seule  
Version applicative : inchangée  
Validation humaine : non réalisée

## 1. Résultat exécutif

Le catalogue courant est techniquement fonctionnel, petit, cohérent et effectivement consommé de MariaDB jusqu’à la page apprenant. Les 12 lignes attendues sont présentes : six espagnoles et six françaises, toutes `VALIDATED`, sans doublon exact, avec les cinq fonctions prévues. Le cas réel « Sin embargo » est reconnu sur deux jetons et arrive dans l’interface sous forme d’une aide volontaire, masquée par défaut, indépendante des Seven Sieves.

L’audit révèle néanmoins quatre limites avant stabilisation :

1. les 12 contenus portent une provenance de seed et un statut `VALIDATED`, mais aucune trace de validation humaine individuelle n’est enregistrée ;
2. les exemples sont actuellement des équivalences bilingues très courtes, pas des exemples contextualisés ;
3. les titres sont tous génériques et l’interface apprenant ne consomme pas `pedagogical_title` ;
4. l’extension IT/PT/EN ne peut pas être une simple insertion de données : ES/FR est codé en dur dans plusieurs étages de l’application.

Une matrice de travail limitée à 25 cellules (cinq fonctions × cinq langues) est proposée sans être validée. Elle conserve les 10 connecteurs FR/ES centraux existants, préserve `mais` et `pero` comme variantes secondaires et ajoute 15 candidats IT/PT/EN en statut futur `PROPOSED`. La Mission 217 doit commencer par les arbitrages humains et la capacité applicative, puis seulement écrire des données dans une transaction réconciliable.

## 2. Périmètre et règles appliquées

### Inclus

- table, contraintes et contenu réel de `connector_help` ;
- cohérence linguistique et pédagogique des 12 lignes ;
- liens lexicaux facultatifs possibles ;
- routes publiques et d’administration ;
- reconnaissance dans `POST /analysis` ;
- transport par `pedagogical_enrichments` ;
- consommation enseignant et apprenant ;
- essais HTTP en lecture seule sur le serveur déjà lancé ;
- matrice FR/ES/IT/PT/EN non validée ;
- plan réversible proposé pour Mission 217.

### Exclus et non modifiés

- MariaDB, schéma, seed et données ;
- code serveur, API, interface et tests ;
- Seven Sieves et son contrat ;
- dépendances, version, launcher, commit, push et déploiement ;
- appel OpenAI.

### Arbitrage documentaire

Le mode d’audit général de `AGENTS.md` interdit normalement toute écriture dans le dépôt et renvoie vers `IC-Lab-Next-Technical`. La mission courante autorise explicitement le rapport 216 et ses artefacts sous `IC-Lab-Next/reports/`. Cette autorisation plus spécifique a été appliquée uniquement à ces chemins ; aucune autre écriture n’a été faite.

## 3. Sources actuelles inspectées

- `prototypes/08-dico-seven-sieves/database/current_draft/60_connector_help.sql` ;
- `prototypes/08-dico-seven-sieves/Node/src/admin.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/repository.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/analysis.js` ;
- `prototypes/08-dico-seven-sieves/Node/server.js` ;
- `prototypes/08-dico-seven-sieves/Node/public/admin/index-admin-0.1.html` et scripts associés ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-teacher-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js` ;
- `prototypes/08-dico-seven-sieves/docs/api-analysis-contract-v0.md` ;
- études et rapports Connector Help V0 actuels ;
- tests ciblés `connector-help`, `analysis` et séparation enseignant/apprenant ;
- état réel de MariaDB et réponses HTTP du serveur déjà actif.

Les rapports historiques 214, 214b, 215 et 215b ont servi à comprendre les intentions récentes, jamais à remplacer l’observation du code et de la base actuels.

## 4. État initial observé

- Git : propre avant l’audit.
- Serveur Dico-IC : port 3000 déjà en écoute, PID 40756.
- MariaDB Docker : port 3306 déjà en écoute.
- phpMyAdmin Docker : port 8080 déjà en écoute.
- Aucun processus n’a été lancé ni arrêté par la mission.
- Numéro de rapport : maximum existant 215 ; `216_dico_ic_connector_help_catalog_audit.md` était libre juste avant création.

### Empreintes initiales de données

Méthode : `SELECT * ORDER BY id`, sérialisation JSON déterministe par le client MariaDB du projet, SHA-256.

| Table | Lignes | SHA-256 |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

## 5. Schéma réel de `connector_help`

### Champs

| Champ | Nature | Observation |
|---|---|---|
| `id` | `bigint`, auto-incrément | IDs actuels 1 à 12 ; compteur interne observé à 17, sans conclure sur son histoire. |
| `language_id` | FK obligatoire | Référence `language`. |
| `lexical_entry_id` | FK facultative | `ON DELETE SET NULL`; nul sur les 12 lignes. |
| `expression` | texte de surface | Obligatoirement non vide. |
| `normalized_expression` | `varchar(255)` binaire | Obligatoirement non vide. |
| `discourse_function` | taxonomie fermée | Opposition, cause, conséquence, addition, chronologie. |
| `pedagogical_title` | titre | Valeur par défaut et valeur actuelle : `Connecteur logique`. |
| `pedagogical_hint` | aide principale | Obligatoirement non vide. |
| `example` | exemple facultatif | Renseigné partout actuellement. |
| `caution` | prudence facultative | Renseignée partout actuellement. |
| `status` | cycle éditorial | `PROPOSED`, `VALIDATED`, `REJECTED`, `ARCHIVED`. |
| `source_label`, `notes` | provenance | Renseignés de manière identique sur les 12 lignes. |
| `created_at`, `updated_at` | horodatage | Identiques sur les 12 lignes. |

### Contraintes et subtilité d’unicité

La base impose l’unicité de `(language_id, normalized_expression, discourse_function)`. Le dépôt applicatif est plus strict lors d’une validation : il refuse une seconde ligne `VALIDATED` portant la même expression normalisée dans une langue, même si la fonction diffère. Tout futur script doit reproduire cette règle applicative, pas seulement se fier à l’index SQL.

## 6. Inventaire exhaustif des 12 lignes

Les champs communs à toutes les lignes sont :

- titre : `Connecteur logique` ;
- statut : `VALIDATED` ;
- lien lexical : `NULL` ;
- source : `connector_help_v0_seed` ;
- notes : `Catalogue pédagogique Connector Help V0.` ;
- création et mise à jour : `2026-06-21T14:23:35.000Z`.

| ID | Langue | Expression | Fonction | Aide | Exemple | Prudence |
|---:|---|---|---|---|---|---|
| 1 | ES | `sin embargo` | OPPOSITION | L'auteur introduit probablement une idée qui contraste avec ce qui précède. | `sin embargo / cependant` | La fonction exacte peut dépendre du contexte. |
| 2 | ES | `pero` | OPPOSITION | même aide d’opposition | `pero / mais` | prudence générique |
| 3 | ES | `porque` | CAUSE | La proposition qui suit donne probablement une raison ou une explication. | `porque / parce que` | prudence générique |
| 4 | ES | `por tanto` | CONSEQUENCE | L'auteur présente probablement un résultat ou une déduction. | `por tanto / donc` | prudence générique |
| 5 | ES | `además` | ADDITION | L'auteur ajoute probablement une information ou un argument. | `además / de plus` | prudence générique |
| 6 | ES | `después` | CHRONOLOGY | L'auteur signale probablement une étape qui vient après la précédente. | `después / ensuite` | La relation temporelle exacte dépend du contexte. |
| 7 | FR | `cependant` | OPPOSITION | même aide d’opposition | `cependant / sin embargo` | prudence générique |
| 8 | FR | `mais` | OPPOSITION | même aide d’opposition | `mais / pero` | prudence générique |
| 9 | FR | `parce que` | CAUSE | même aide de cause | `parce que / porque` | prudence générique |
| 10 | FR | `donc` | CONSEQUENCE | même aide de conséquence | `donc / por tanto` | prudence générique |
| 11 | FR | `de plus` | ADDITION | même aide d’addition | `de plus / además` | prudence générique |
| 12 | FR | `ensuite` | CHRONOLOGY | même aide chronologique | `ensuite / después` | prudence chronologique |

Les expressions normalisées sont exactement les expressions ci-dessus, en minuscules.

## 7. Cohérence du catalogue courant

### Faits favorables

- aucune expression exacte ou normalisée dupliquée dans une même langue ;
- cinq fonctions couvertes dans les deux langues ;
- symétrie FR/ES : une ligne par fonction, plus une seconde opposition (`mais`/`pero`) ;
- quatre expressions multi-token : `sin embargo`, `por tanto`, `parce que`, `de plus` ;
- prudence modale présente dans chaque aide (`probablement`) ;
- exemples et avertissements non nuls partout ;
- provenance, statut et horodatages homogènes.

### Anomalies ou faiblesses

1. **Validation non traçable.** `VALIDATED` est un fait de base, pas la preuve d’une validation par Christian ou Sylvain. La provenance indique seulement un seed V0.
2. **Exemples non contextualisés.** `sin embargo / cependant` aide à traduire, mais ne montre pas le mouvement du raisonnement dans une phrase.
3. **Titre uniforme.** Les cinq fonctions ont toutes `Connecteur logique`; le champ ne discrimine donc rien.
4. **Prudence trop générique.** Seule la chronologie bénéficie d’une réserve adaptée à sa fonction.
5. **Granularité asymétrique par fonction.** Deux oppositions par langue, une seule entrée ailleurs. Cette décision est défendable, mais non explicitée par les données.
6. **Liens lexicaux absents.** Ce n’est pas une panne : le modèle les rend facultatifs et la reconnaissance n’en dépend pas. Cela limite néanmoins la traçabilité vers le lexique.

### Cohérence linguistique indicative, non-validation

- La RAE atteste `sin embargo` comme locution adverbiale et atteste à la fois `por tanto` et `por lo tanto`; le catalogue actuel n’est donc pas fautif parce qu’il emploie `por tanto` ([RAE — embargo](https://dle.rae.es/embargo), [RAE — tanto](https://dle.rae.es/tanto)).
- `además` correspond bien à une valeur additive ([RAE — además](https://dle.rae.es/adem%C3%A1s)).
- Treccani soutient `tuttavia` comme adversatif/concessif et signale pour `quindi` des valeurs temporelles et conclusives : la prudence contextuelle proposée pour `quindi` est indispensable ([Treccani — tuttavia](https://www.treccani.it/vocabolario/tuttavia/), [Treccani — quindi](https://www.treccani.it/vocabolario/quindi/)).
- `perché` comporte plusieurs emplois, notamment causal, final et interrogatif : une correspondance de surface ne suffit pas toujours à établir la fonction ([Treccani — perché](https://www.treccani.it/vocabolario/perche/)).
- `no entanto` est bien documenté comme marqueur de contraste en portugais ([Infopédia — entanto](https://www.infopedia.pt/dicionarios/lingua-portuguesa/entanto)).
- `however` possède un emploi contrastif mais aussi d’autres constructions : l’anglais est utile comme comparaison non romane et comme test de polysémie ([Cambridge Dictionary — however](https://dictionary.cambridge.org/dictionary/english/however)).

Ces références ne remplacent pas la validation linguistique humaine demandée.

## 8. Liens lexicaux possibles

Les correspondances exactes actuellement observées dans `lexical_form` permettent les rapprochements suivants, sans imposer leur activation :

| Famille | Correspondances exactes existantes |
|---|---|
| `CEPENDANT` | FR `cependant`, ES `sin embargo`, IT `tuttavia`, EN `however` |
| `PARCE_QUE` | FR `parce que`, ES/PT `porque`, IT `perché`, EN `because` |
| `DONC` | FR `donc`, IT `quindi` |
| `POR_TANTO` | ES `por tanto`, PT `portanto`, EN `therefore` |
| `AUSSI` | ES `además`, PT `além disso` |

Absences exactes pertinentes : `de plus`, `ensuite`, `después`, `inoltre`, `poi`, `no entanto`, `depois`, `moreover`, `then` et la variante potentielle `por lo tanto`.

Recommandation : laisser les liens nuls dans la première phase de Mission 217, sauf si une politique explicite valide à la fois l’identité de forme et l’alignement sémantique. Un lien lexical n’est pas nécessaire à la reconnaissance et ne doit pas devenir une équivalence artificielle.

## 9. Chemin DB → API → apprenant

Le détail reproductible se trouve dans [`consumer_path_audit.md`](assets/216_dico_ic_connector_help_catalog_audit/consumer_path_audit.md).

### Résumé factuel

1. le dépôt charge uniquement les aides `VALIDATED` de la langue source active et documentée ;
2. l’analyse compare les expressions normalisées aux jetons du texte ;
3. les aides produites sont placées dans `pedagogical_enrichments`, sans `sieve_id` ;
4. la session conserve l’analyse complète ;
5. l’enseignant affiche seulement leur nombre ;
6. l’apprenant vérifie offsets et limites de jetons, puis affiche expression, fonction humanisée, aide, exemple et prudence ;
7. les aides sont masquées par défaut et activées volontairement.

Le titre pédagogique de la ligne n’est pas propagé jusqu’à l’apprenant. Le label de provenance de la ligne est remplacé par la source générique `Dico-IC`. Le tableau d’administration affiche les codes de fonction bruts alors que le référentiel voisin possède déjà les libellés humains. Les noms publics divergent également : « Aides discursives » côté administration, « Aides à la lecture » côté apprenant.

## 10. Essais dynamiques réels, non mutateurs

### API de référence

- `GET /connector-helps?limit=100` : HTTP 200, total 12.
- `GET /admin/connector-help-functions` : HTTP 200.

Compteurs observés : opposition 4 ; cause 2 ; conséquence 2 ; addition 2 ; chronologie 2.

### Cas « Sin embargo »

Texte : `Sin embargo, la información circula durante la noche.`  
Résultat : une aide `connector_help`, ID source 1, surface `Sin embargo`, offsets UTF-16 0–11, jetons `[0, 1]`, fonction `OPPOSITION`, source `Dico-IC`.

### Variantes éprouvées

| Langue et texte | Résultat observé |
|---|---|
| ES `SIN EMBARGO` | reconnu |
| ES `sin  embargo` | reconnu, surface et offsets réels conservés |
| ES `sin\nembargo` | reconnu |
| ES `sin, embargo` | non reconnu |
| ES `sin embárgo` | non reconnu |
| FR `PARCE QUE cela fonctionne.` | reconnu sur deux jetons |
| FR `De plus, cela fonctionne.` | reconnu sur deux jetons |
| IT `Tuttavia…` | aucune aide, comportement actuel attendu |
| PT `No entanto…` | aucune aide, comportement actuel attendu |
| EN `However…` | aucune aide, comportement actuel attendu |

Tous ces appels ont répondu HTTP 200. Ils n’ont écrit aucune donnée.

### Règles exactes déduites du code et confirmées par essais

- NFC, minuscules indépendantes de la locale, espaces réduits ;
- accents conservés ;
- casse ignorée ;
- seuls des espaces peuvent séparer les mots d’une expression multi-token ;
- priorité aux expressions les plus longues ;
- suppression silencieuse des chevauchements de jetons côté analyse ;
- validation stricte des offsets et jetons côté apprenant.

## 11. Matrice multilingue proposée

Artefact : [`proposed_multilingual_matrix.json`](assets/216_dico_ic_connector_help_catalog_audit/proposed_multilingual_matrix.json).

| Fonction | FR | ES | IT | PT | EN |
|---|---|---|---|---|---|
| Opposition | cependant | sin embargo | tuttavia | no entanto | however |
| Cause | parce que | porque | perché | porque | because |
| Conséquence | donc | por tanto | quindi | portanto | therefore |
| Addition | de plus | además | inoltre | além disso | moreover |
| Chronologie | ensuite | después | poi | depois | then |

### Statut de cette matrice

- Les 10 cellules FR/ES correspondent à des lignes actuelles, mais les reformulations de titre, exemple et prudence restent des propositions.
- Les 15 cellules IT/PT/EN sont des candidats seulement ; leur futur statut initial doit être `PROPOSED`.
- `mais` et `pero` restent des lignes utiles et ne sont pas proposés à la suppression ; ils sont seulement hors du noyau « une cellule par fonction et langue ».
- `por lo tanto` est attesté et offrirait un bon test à trois jetons, mais son ajout à côté de `por tanto` exige un arbitrage humain.
- Les cinq candidats chronologiques sont volontairement marqués de confiance moyenne à cause de leur polysémie.

Chaque entrée JSON fournit : langue, surface, normalisation, fonction, titre, aide, exemple contextualisé, prudence, provenance, statut cible, lien lexical candidat, niveau de confiance et validateurs requis.

## 12. Proposition de démonstration en 30–45 secondes

1. ouvrir une session apprenant préparée avec cinq phrases courtes, une par langue ;
2. montrer les Seven Sieves déjà visibles et les aides encore masquées ;
3. cliquer sur « Afficher les aides à la lecture » ;
4. désigner un cas multi-token (`Sin embargo` ou `Além disso`) et ses fonction, aide, exemple et prudence ;
5. masquer les aides et conclure : étayage volontaire, jamais huitième tamis.

Cette démonstration suppose la Mission 217 réalisée et validée humainement. Elle n’a pas été exécutée dans le présent audit.

## 13. Plan candidat prudent pour Mission 217

Artefact machine-readable : [`mission_217_candidate_plan.json`](assets/216_dico_ic_connector_help_catalog_audit/mission_217_candidate_plan.json).

Ordre recommandé :

1. validation humaine et gel d’une matrice approuvée avec empreinte ;
2. extension applicative isolée de la capacité ES/FR vers FR/ES/IT/PT/EN ;
3. sauvegarde exacte et préflight de la base ;
4. insertion transactionnelle des 15 lignes manquantes en `PROPOSED`, sans toucher aux 12 existantes ;
5. réconciliation champ par champ avant commit de transaction ;
6. validation éditoriale explicite, puis passage sélectif à `VALIDATED` ;
7. alignement du seed canonique seulement après succès sur la base réelle ;
8. tests API, analyse, multi-token, collisions et recette apprenant ;
9. rapport, versionnement par composant et retour arrière authentifié.

### État et idempotence attendus

- état initial reconnu : 12 lignes exactes et empreinte attendue ;
- état final par défaut : 27 lignes, dont 15 nouvelles identifiées par le plan gelé ;
- second passage : zéro modification ;
- état partiel ou inconnu : refus d’écriture et rapport de différences ;
- aucun `DELETE` basé seulement sur une plage d’IDs ; la propriété doit être prouvée par le plan, la provenance et les valeurs attendues.

### Retour arrière

Avant écriture, capturer les 12 lignes exactes et la définition de table. En cas d’échec avant commit, laisser la transaction annuler. Après commit, retirer uniquement l’ensemble nouvellement inséré et authentifié, puis vérifier que le snapshot initial, le compte et l’empreinte sont restaurés. Toute mise à jour future des 12 lignes doit posséder son propre avant/après explicite.

## 14. Contrôles automatisés

Commande ciblée, établie comme non mutatrice pour la base réelle :

```text
node --test test/connector-help.test.js test/analysis.test.js test/seven-sieves-role-separation.test.js
```

Résultat : 31 tests réussis, 0 échec, 0 ignoré.

Couverture utile observée :

- validation et normalisation Connector Help ;
- route publique, lookup et comportements d’administration sur dépôts simulés ;
- seed idempotent à 12 lignes ;
- analyse multi-token, casse, accents et ponctuation interne ;
- conservation de l’analyse par la session ;
- offsets, occurrences identiques, Unicode et entrées invalides ;
- aides masquées par défaut ;
- séparation enseignant/apprenant et indépendance des Seven Sieves.

## 15. Éléments non vérifiés

- aucune validation humaine par David, Christian ou Sylvain ;
- aucune recette Chromium nouvelle : non nécessaire à un audit sans modification d’interface ;
- aucune vérification de qualité native par des locuteurs IT/PT/EN ;
- aucune écriture, restauration ou répétition transactionnelle de Mission 217 ;
- aucun test d’activation réelle IT/PT/EN, puisque cette capacité n’existe pas encore ;
- aucun lien lexical appliqué ;
- aucune preuve historique expliquant le compteur auto-incrément 17, seulement son observation.

## 16. Décisions demandées

### David

- autoriser ou non le futur support IT/PT/EN pour Connector Help ;
- confirmer le noyau 25 cellules et le maintien recommandé de `mais`/`pero` ;
- arbitrer `por tanto` seul ou ajout de `por lo tanto` ;
- décider si les liens lexicaux restent différés ;
- autoriser séparément la Mission 217 et son écriture transactionnelle.

### Christian

- valider expressions, fonctions, registres, polysémies et naturalité des exemples ;
- examiner en priorité `quindi`, les cinq marqueurs chronologiques et les emplois non contrastifs de `however`.

### Sylvain

- valider titres, aides, exemples contextualisés et avertissements ;
- confirmer que les formulations restent utiles sans sur-promettre une interprétation automatique.

## 17. Fichiers créés

- `reports/216_dico_ic_connector_help_catalog_audit.md` ;
- `reports/assets/216_dico_ic_connector_help_catalog_audit/proposed_multilingual_matrix.json` ;
- `reports/assets/216_dico_ic_connector_help_catalog_audit/consumer_path_audit.md` ;
- `reports/assets/216_dico_ic_connector_help_catalog_audit/mission_217_candidate_plan.json`.

Le CSV facultatif n’a pas été créé : l’inventaire exhaustif tient dans le présent rapport, et aucun format supplémentaire non nécessaire n’a été ajouté.

## 18. Limites et suite possible

La stabilité technique actuelle est établie pour FR/ES. La stabilité linguistique ne peut pas être déclarée sans revue humaine, et l’extension multilingue ne doit pas être activée par une simple manipulation de données. La suite sûre est une Mission 217 explicitement autorisée, fondée sur le plan fourni, avec validation humaine avant tout `VALIDATED` nouveau.

## 19. Message de commit proposé

```text
docs(reports): add Mission 216 connector-help catalogue audit
```

Ce message est proposé seulement. Aucun commit ni push n’a été réalisé.

## 20. Contrôle de fin de mission

- Les huit tables contrôlées ont exactement les mêmes nombres de lignes et les mêmes empreintes SHA-256 qu’au départ.
- `connector_help` reste à 12 lignes avec l’empreinte `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846`.
- `git diff --check` ne signale aucune erreur.
- L’état Git final ne contient que le rapport 216 et son dossier d’artefacts, tous non suivis ; aucun fichier préexistant n’est modifié ou supprimé.
- Les services des ports 3000, 3306 et 8080 étaient déjà actifs ; la mission n’a lancé ni arrêté aucun processus.
- Aucune commande mutatrice de base, migration, seed, formatage, correction automatique ou installation n’a été exécutée.
- Les actions refusées ou volontairement omises sont : écriture MariaDB, activation IT/PT/EN, modification de code, création du CSV facultatif, recette Chromium et validation humaine.
