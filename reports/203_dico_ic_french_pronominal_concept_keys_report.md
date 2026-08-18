# Mission 203 — Séparateurs des verbes pronominaux français

Date : 2026-08-18  
Statut : implémentée et contrôlée localement

## Cause du défaut

La Mission 200 canonicalisait correctement `s’élever` en `S_ELEVER` tant que l’apostrophe restait présente. Après une proposition OpenAI déjà aplatie en `SELEVER`, la canonicalisation ASCII ne disposait plus d'aucune preuve permettant de recréer le séparateur. La Mission 202 demandait une clé française, mais son prompt ne formulait pas explicitement la conservation du pronom et de son séparateur.

## État initial et périmètre préservé

- Git : `HEAD 4cab65e`, avec les changements non commités des Missions 201–202 conservés.
- Versions initiales : IA Domaine `0.1.1`, IA Texte `0.1.11`.
- Volumes MariaDB : 326 `lexical_entry`, 1125 `lexical_form`, 41 `inflected_form`, 12 `connector_help`, 70 `form_relation`, 1 `pattern_rule`, 8 `ic_feature`, 12 `language`.
- Les cinq clés historiques citées existaient au début : `S_ELEVER`, `ELEVATION`, `S_ELEVER_VERB`, `ELEVER`, `ELEVERSER_VERB`.
- Aucune migration, modification de schéma, route, contrat public ou donnée n'a été réalisée.

## Règle ajoutée au prompt partagé

L'instruction française unique des assistants Domaine et Texte demande désormais explicitement de conserver le pronom d'un verbe pronominal français et de le séparer par un underscore. Elle fournit les exemples :

- `s’élever → S_ELEVER` ;
- `s'enfuir → S_ENFUIR` ;
- `se souvenir → SE_SOUVENIR` ;
- `se lever → SE_LEVER`.

Elle interdit `SELEVER`, `SENFUIR` et `SESOUVENIR` pour ces lemmes, ainsi que la simple suppression de l'apostrophe ou de l'espace. Elle rappelle aussi de ne pas inventer un séparateur pour `semer`, `servir` ou `serrer`. Toutes les règles françaises de la Mission 202 restent présentes et partagées sans divergence.

## Correction déterministe prudente

La fonction partagée `reconcileFrenchPronominalConceptKey` complète la canonicalisation de la Mission 200 lors de la réception serveur des candidats :

1. canonicalisation normale de la clé proposée ;
2. recherche d'une forme `fr` dont la catégorie est strictement `verb` ;
3. reconnaissance d'un début réel `s'`, `s’` ou `se ` dans le lemme ;
4. canonicalisation du lemme français ;
5. comparaison exacte des deux clés après retrait des seuls underscores ;
6. restauration de la clé du lemme uniquement si cette comparaison est égale.

La correction intervient avant la recherche serveur des clés existantes. Ainsi, une réponse `SELEVER` associée à `s’élever` devient `S_ELEVER` avant l'appel à `findExistingEntryKeys`.

Les lemmes et les gloses ne sont jamais modifiés.

## Cas refusés ou ambigus

Aucune correction automatique n'est appliquée :

- sans forme française verbale ;
- pour une forme non pronominale ;
- lorsque la comparaison sans underscores diffère ;
- lorsqu'un qualificatif rend la correspondance non exacte.

Un brouillon pronominal non concordant ou qualifié reste inchangé, décoché au premier affichage et porte le statut calme `Structure à vérifier`. Il demeure éditable et sélectionnable par l'humain. `SEMER`, `SERVIR` et `SERRER` restent inchangés.

## Détection obligatoire de `S_ELEVER`

La fixture de recette a simulé une proposition fournisseur `SELEVER` avec le lemme FR `s’élever`, alors que la liste des clés existantes contenait `S_ELEVER`.

Dans IA Domaine et IA Texte :

- clé affichée : `S_ELEVER` ;
- lemme affiché : `s’élever`, inchangé ;
- statut immédiat : `Doublon possible` ;
- ligne décochée ;
- case désactivée pour ce doublon ;
- création ignorée côté interface et toujours protégée côté API.

## Interfaces et versions

Les deux assistants réutilisent la même inspection pronominale pour signaler les cas ambigus. Le badge d'avertissement reprend le style ambre existant des états à vérifier.

Versions obtenues :

- IA Domaine : `0.1.2` ;
- IA Texte : `0.1.12` ;
- administration principale, API et package Node : inchangés.

## Fichiers concernés par la Mission 203

- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js`
- `prototypes/08-dico-seven-sieves/Node/test/french-pronominal-concept-key.test.js` (créé)
- `prototypes/08-dico-seven-sieves/admin/js/entry-key-canonicalization-0.1.js`
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-domain-0.1.js`
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-0.1.js`
- `prototypes/08-dico-seven-sieves/admin/css/admin-ai-domain-0.1.css`
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-domain-0.1.html`
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html`
- `reports/203_dico_ic_french_pronominal_concept_keys_report.md` (créé)

Les fichiers déjà modifiés ou créés par les Missions 201–202 ont été préservés.

## Tests

- Analyse syntaxique des scripts serveur et frontend concernés : succès.
- Tests ciblés Mission 203 : 8/8 réussis.
- Tests ciblés Missions 200–203 : 24/24 réussis.
- Suite Node complète : 183/183 tests réussis.
- `git diff --check` : aucune erreur ; seuls les avertissements LF/CRLF attendus sont présents.

Les tests couvrent `SELEVER`, `SÉLEVER`, `SENFUIR`, `SESOUVENIR`, `SE_LEVER`, le doublon `S_ELEVER`, les non-pronominaux, les noms et adjectifs, les clés qualifiées ambiguës, ainsi que la préservation des formes et gloses. Les tests existants confirment la non-régression des lots réglables, de la tolérance aux propositions invalides, de la progression, du chronomètre, de l'annulation réelle et de la correction humaine au `blur`.

## Recette déterministe

Une fixture locale jetable, utilisant le vrai parseur de candidats, a servi les deux assistants sans appeler OpenAI ni MariaDB. Trois brouillons ont été présentés :

- `SELEVER` + `s’élever` : restauré en `S_ELEVER`, doublon immédiat et décoché ;
- `SELEVER_MOUVEMENT` + `s’élever` : conservé sans invention, avertissement et décoché ;
- `SEMER` + `semer` : conservé `SEMER`, statut `Prêt`.

La correction humaine de `S’ÉLEVER_MOUVEMENT` au `blur` a produit `S_ELEVER_MOUVEMENT` tout en gardant l'avertissement d'ambiguïté. Les deux interfaces sont restées utilisables à 1366 × 768, les statuts étaient lisibles et la console navigateur ne contenait ni erreur ni avertissement. Aucun bouton de création n'a été utilisé. Le compteur d'écritures persistantes de la fixture est resté à 0. La fixture a ensuite été arrêtée et supprimée.

Cette recette Codex ne vaut pas validation fonctionnelle humaine de David.

## Volumes et clés préservés

Les volumes finaux sont identiques aux volumes initiaux :

- 326 `lexical_entry` ;
- 1125 `lexical_form` ;
- 41 `inflected_form` ;
- 12 `connector_help` ;
- 70 `form_relation` ;
- 1 `pattern_rule` ;
- 8 `ic_feature` ;
- 12 `language`.

L'empreinte finale des 326 clés triées reste `876c2a167c61ce78f64e9ff051f307917b27b4d85b83ee4c4ece21a62192102e`, identique à celle consignée à la fin de la Mission 202. Les cinq clés historiques ciblées ont été relues après recette et sont toujours présentes sans modification.

## Services gérés

`STOP_IC_LAB_NEXT.bat` a arrêté les quatre services authentifiés sans toucher Docker ni MariaDB. Après la recette, `START_IC_LAB_NEXT.bat` a redémarré :

- Proto05 : PID 8668, port 8791 ;
- IC-Hub : PID 73820, port 8790 ;
- Agent vocal : PID 72756, port 8788 ;
- Dico-IC : PID 73484, port 3000.

Le contrôle final `/languages` répond avec le contrat `0.1` et 5 langues opérationnelles.

## Limites et suite possible

- La règle restaure uniquement un séparateur démontré par le lemme français verbal ; elle ne tente aucune analyse sémantique.
- Les clés historiques proches restent volontairement hors périmètre et relèvent du futur audit de nettoyage.
- Une clé qualifiée ambiguë demande toujours une décision humaine.

## Proposition de commit

`fix(dico-ic): préserver les clés pronominales françaises IA (missions 201-203)`

Le commit proposé doit inclure les rapports 201 à 203, l'implémentation et les tests correspondants. Aucun commit, push ou déploiement n'a été effectué.
