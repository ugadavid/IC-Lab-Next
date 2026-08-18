# Mission 206 — Nettoyage transactionnel Dico-IC

## Résultat

La sélection validée par la Mission 205 a été appliquée à MariaDB, sans action sur les 25 familles E hors périmètre. Le catalogue passe exactement de **326 à 270 entrées lexicales** : **56 IDs vides supprimés** et **41 IDs renseignés conservés puis renommés**. Les formes, dépendances et autres volumes demandés sont inchangés.

État Git initial : propre, HEAD `0a7b472` (`Mission 205 terminée, sans mutation de MariaDB ni du code applicatif.`). Aucun commit, push, déploiement ou appel OpenAI n'a été effectué.

## Sources et préconditions

Les cinq artefacts Mission 205 ont été relus et leur empreinte contrôlée avant toute écriture :

- rapport : `891A6663FA68C284C2E1D7A176FE8C344EB305B0FD150830BFA0B0E1D67C3C72` ;
- plan de politique : `CE1A038132CFCC9C3611D1B9B366D352C1B30AE08B3167393D4DC60138AFCF57` ;
- rekeys atomiques : `9E44E313A65A75C245B99E076B8BB90497D08E627A02C01C48B66793D74E93E9` ;
- protections D : `27840D2E1FC846EFF909DD505B538B193C887A787DFA053FFE910572E2398612` ;
- préflight SQL : `35B50F9344D9D66AA8F4736E97B74786950A8C2D4BBF39A825FED0FF973EE3B2`.

Les 13 contrôles SQL de préflight ont réussi. Le scan fonctionnel a porté sur les **97 IDs réellement mutés** et n'a trouvé aucune nouvelle référence fonctionnelle. Le préflight Mission 205 énumère 112 IDs parce qu'il inclut aussi 15 survivants A/D non renommés ; ce n'est pas une divergence du périmètre d'écriture.

Empreinte initiale ordonnée de `lexical_entry` : `fc3081d330f116a8438bc1b077d0b047b0d2c09bf845e81d654203543a6d1c75`.

## Sauvegarde et outil permanent

Le script permanent `prototypes/08-dico-seven-sieves/Node/scripts/apply-policy-aligned-concept-cleanup.js` propose quatre modes explicites :

- `--check` : vérifications en lecture seule et classification stricte de l'état `initial`, `final` ou partiel ;
- `--backup-create` : sauvegarde déterministe ciblée ;
- `--apply` : préconditions puis transaction unique avec rollback automatique sur erreur ;
- `--rollback` : restauration exacte depuis la sauvegarde.

Il ne lit jamais `refined_human_review.csv`, vérifie les empreintes des plans, les cardinalités 30 A / 26 B / 15 C / 3 D, les collisions, les références et les volumes. Il refuse toute écriture dans un état partiel ou inconnu.

Sauvegarde : `reports/assets/206_dico_ic_transactional_cleanup/backup.json`  
SHA-256 : `6c35dcd55e011b47d3b3609d141c7030be035a3172efd5ca37458c1572de4f1f`

Elle contient les 97 lignes concernées, les instantanés de dépendances des 41 IDs conservés, les empreintes globales des tables enfants, l'empreinte des entrées hors périmètre, les contenus antérieurs des deux fichiers D et les métadonnées du plan. Une première tentative de chemin, refusée avant création car elle sortait du workspace, a été corrigée sans effet sur le dépôt ni la base.

## Application A à D

### A — 30 doublons vides supprimés

`190:CONSTANTE`, `199:DESASTREUX_ADJ`, `200:COTIER_ADJ`, `205:PREOCCUPANT_ADJ`, `208:CONSTANT_ADJ`, `209:CONTINU_ADJ`, `211:HUMANITE_NOUN`, `212:ENTIER_ADJ`, `215:CONSEQUENCE_NOUN`, `242:WORRYING`, `243:INCREASE`, `244:CONTINUOUS`, `245:PRODUCE`, `246:HUMANITY`, `249:RISE`, `262:CONSTANTE_ADJECTIVE`, `263:CONTINU_ADJECTIVE`, `264:ENTIER_ADJECTIVE`, `266:ELEVERSER_VERB`, `269:PROVOQUER_VERB`, `277:RUINER_VERB`, `283:TOTAL_ADJ`, `284:RUIINER_VERB`, `299:TOTALE`, `314:PREOCCUPANT_ADJECTIF`, `316:CONSTANT_ADJECTIF`, `317:ENTIER_ADJECTIF`, `319:TOTAL_ADJECTIF`, `322:RUI_NER`, `97:ESTUDIANTE_NOUN_STUDENT`.

### B — 26 renommages en place

`51 STUDENT→ETUDIANT`; `96 MUCHO_ADJECTIVE_DETERMINER_MUCH_MANY→BEAUCOUP_DE`; `100 ACADEMICO_ADJECTIVE_ACADEMIC→ACADEMIQUE`; `102 RESULTAR_VERB_TO_RESULT→RESULTER`; `126 RESULTADO→RESULTAT`; `128 PARTICIPANTE→PARTICIPANT`; `137 NECESARIO→NECESSAIRE`; `201 PROCHE_ADJ→PROCHE`; `202 MILLION_NOUN→MILLION`; `203 PERSONNE_NOUN→PERSONNE`; `217 MENACE_NOUN→MENACE`; `218 MER_NOUN→MER`; `221 CONSEQUENT_ADVERBE→CONSEQUEMMENT`; `250 RISK→RISQUE`; `257 AGRICULTURAL_PRODUCTION→PRODUCTION_AGRICOLE`; `259 CONSEQUENT_ADJECTIVE→CONSEQUENT`; `273 FAUNE_NOUN→FAUNE`; `274 FLORE_NOUN→FLORE`; `275 CAUSE_NOUN→CAUSE_NOM`; `285 AGRICULTURE_ADJ→AGRICOLE`; `286 PRODUCTION_NOUN→PRODUCTION`; `288 GRAND_ADJ→GRAND`; `289 DANGER_NOUN→DANGER`; `291 HABITAT_NATUREL_NOUN→HABITAT_NATUREL`; `304 CONTRARIO→CONTRAIRE`; `326 NATUREL_ADJECTIF→NATUREL`.

### C — 15 rekeys atomiques

Les IDs riches conservés sont : `129→TRAVAILLER`, `130→BEAUCOUP`, `131→CEPENDANT`, `134→ABANDONNER`, `135→PROJET`, `138→ADAPTER`, `139→CONTINUER`, `140→PARCE_QUE`, `141→TROUVER`, `169→GLOBAL`, `214→ACCELERE`, `271→ABSENCE`, `272→EAU`, `280→HUMAIN`, `290→PERDRE`. Les collisions et alias vides associés ont été supprimés dans la même transaction.

Le cas obligatoire `TRAVAILLER` conserve l'ID 129 et ses cinq formes exactes : `fr travailler`, `es trabajar`, `it lavorare`, `pt trabalhar`, `en work`, toutes verbales avec confiance `1.0`.

### D — 3 protections et suppressions

Les lignes vides `241:SUFFER`, `260:PREOCCUPANT_ADJECTIVE` et `309:SOFFRIR` ont été supprimées après remplacement des littéraux de prompt/test par des protections sémantiques : ne pas choisir l'anglais pour *souffrir* ou *préoccupant*, ne pas copier une graphie italienne/portugaise et ne pas ajouter systématiquement un suffixe grammatical. Les tests vérifient désormais ces règles sans réintroduire les trois clés de base.

### E — exclusion confirmée

Aucune des 25 familles E n'a été modifiée, fusionnée ou requalifiée.

## Volumes et intégrité après application

| Objet | Avant | Après |
|---|---:|---:|
| `lexical_entry` | 326 | **270** |
| `lexical_form` | 1125 | **1125** |
| `inflected_form` | 41 | **41** |
| `connector_help` | 12 | **12** |
| `form_relation` | 70 | **70** |
| `pattern_rule` | 1 | **1** |
| `ic_feature` | 8 | **8** |
| `language` | 12 | **12** |

Empreinte finale ordonnée de `lexical_entry` : `d14f5e21eda3f4eaf0fb76c1eac758269cb73e8d5a2802ead6d721baedabcd78`.

Les 56 IDs supprimés sont absents, les 41 IDs retenus portent leur clé finale, les empreintes des dépendances correspondent à la sauvegarde et aucune collision exacte ou canonique ne subsiste. Aucun lemme, forme, glose ou relation n'a été réécrit.

## Vérifications

### Tests automatisés

- syntaxe du script : réussie ;
- tests ciblés avant application : **12/12** réussis ;
- suite Node complète avant application : **188/188** réussis ;
- suite Node complète après application canonique : **188/188** réussis ;
- test permanent Mission 206 : cinq scénarios couvrant contrat du plan, check, application, idempotence, rollback et refus partiel.

### Base jetable et retour arrière

Une copie MariaDB jetable `ic_dico_m206_fixture_0a7b472` a été créée puis supprimée. Résultats conservés dans `reports/assets/206_dico_ic_transactional_cleanup/fixture_validation.json` :

- application : 326→270 et empreinte finale identique à la base canonique ;
- seconde application : succès, `changed_rows: 0` ;
- rollback : 97 changements inverses et retour exact aux volumes/empreinte initiaux ;
- état partiel simulé (`51:STUDENT→ETUDIANT` seul) : application refusée avant écriture ; instantané inchangé.

Sur la base canonique, la seconde application est également idempotente (`already_applied`, zéro changement). Le contrôle final classe MariaDB et les fichiers texte à l'état `final`.

### HTTP et validation visuelle

La recette HTTP locale a confirmé : résumé `270/1125/41/12/70/1/8` et 12 langues ; anciennes clés `TRABAJAR`, `STUDENT`, `ACCELERE_ADJ`, `SUFFER` en 404 ; clés finales `TRAVAILLER`, `ETUDIANT`, `ACCELERE`, `SOUFFRIR` en 200.

La validation visuelle dans Chromium intégré, sur l'admin principal et la fiche `TRAVAILLER` à une dimension représentative de bureau, a montré les volumes exacts, une mise en page lisible, les cinq formes intactes et aucun défaut d'encodage visible. Les journaux navigateur ne contiennent ni erreur ni avertissement. Cette recette Codex ne remplace pas la validation humaine de David.

## Services gérés

L'état initial ne comportait aucun listener sur le port 3000. Un démarrage ciblé du serveur Dico-IC a servi aux contrôles HTTP et visuels. Une première tentative transitoire a interrogé un mauvais préfixe d'URL et obtenu une 404 sans processus persistant ; la route et le montage statique réels ont ensuite été utilisés. À la fin de mission, aucun listener ne subsiste sur le port 3000 : l'état initial est restauré.

## Fichiers concernés

Créés :

- `prototypes/08-dico-seven-sieves/Node/scripts/apply-policy-aligned-concept-cleanup.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/policy-aligned-concept-cleanup.test.js` ;
- `reports/assets/206_dico_ic_transactional_cleanup/backup.json` ;
- `reports/assets/206_dico_ic_transactional_cleanup/fixture_validation.json` ;
- `reports/206_dico_ic_transactional_cleanup_report.md`.

Modifiés :

- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/french-concept-key-policy.test.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-domain-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html`.

## Versionnement

- assistant IA Domaine : **0.1.2 → 0.1.3** ;
- assistant IA Texte : **0.1.12 → 0.1.13** ;
- admin principal, API, package et Seven Sieves : inchangés.

Ces baby steps correspondent aux protections partagées effectivement modifiées.

## Éléments non vérifiés et limites

- Aucun appel réel à OpenAI n'a été lancé, conformément à la mission.
- La validation humaine de David reste à effectuer.
- Le rollback canonique n'a volontairement pas été exécuté après application ; sa preuve exacte a été obtenue sur la copie jetable, puis la copie a été supprimée.

## Proposition de recette humaine

1. Ouvrir l'admin Dico-IC et confirmer 270 entrées.
2. Rechercher `TRAVAILLER`, `ETUDIANT`, `ACCELERE` et `SOUFFRIR`.
3. Ouvrir `TRAVAILLER` et vérifier les cinq formes FR/ES/IT/PT/EN.
4. Confirmer que les anciennes clés ne sont plus accessibles.
5. Ouvrir les assistants Domaine et Texte et vérifier les versions 0.1.3 et 0.1.13, sans lancer de génération si aucun test OpenAI n'est souhaité.

## Message de commit proposé

`Mission 206 — appliquer transactionnellement le nettoyage Dico-IC validé`
