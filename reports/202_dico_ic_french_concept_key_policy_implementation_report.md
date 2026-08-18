# Mission 202 — Politique française pour les nouvelles clés conceptuelles IA

Date : 2026-08-18  
Statut : implémentée et contrôlée localement, validation OpenAI réelle laissée à David

## Périmètre et décision produit

La Mission 202 applique la recommandation validée par la Mission 201 aux deux assistants qui proposent de nouvelles entrées conceptuelles : IA Domaine et IA Texte.

Pour toute nouvelle proposition, le français devient la langue humaine de nomination du catalogue. La clé technique est ensuite canonicalisée en ASCII, majuscules et underscores avec le mécanisme partagé de la Mission 200. Les 326 clés historiques restent inchangées ; aucune traduction automatique, migration, fusion, alias, colonne ou redirection n'a été ajouté. Toute proposition reste un brouillon soumis à une décision humaine explicite.

## État constaté au début

- Git : `HEAD 4cab65e` ; seul `reports/201_dico_ic_concept_key_language_policy_audit.md` était non suivi, état attendu et préservé.
- Services : Dico-IC PID 36564 sur le port 3000 et service du port 3100 PID 19852 constatés actifs ; les launchers ont ensuite géré l'ensemble IC-Lab-Next pour la recette.
- Versions : IA Domaine `0.1.0` ; IA Texte `0.1.10`.
- Volumes MariaDB : 326 `lexical_entry`, 1125 `lexical_form`, 41 `inflected_form`, 12 `connector_help`, 70 `form_relation`, 1 `pattern_rule`, 8 `ic_feature`, 12 `language`.

## Réalisation

### Instruction linguistique partagée

Une constante unique `FRENCH_CONCEPT_KEY_INSTRUCTIONS`, définie et exportée par le module Domaine, est injectée sans reformulation dans les prompts Domaine et Texte. Elle couvre :

- nomination française à partir du sens visé ; infinitif, singulier et forme dictionnaire selon la catégorie ;
- canonicalisation technique ASCII/majuscules/underscores ;
- anglais limité à la comparaison linguistique ;
- interdiction de déduire la clé de l'espagnol, de l'italien, du portugais ou d'une forme fléchie ;
- qualificatif sémantique français bref lorsque la polysémie ou un concept voisin le justifie ;
- absence de suffixe grammatical systématique ;
- maintien en brouillon de toute clé incertaine jusqu'à la vérification humaine.

Les exemples intégrés sont `SOUFFRIR`, `PREOCCUPANT`, `AUGMENTER`, `BANQUE_FINANCE`, `BANQUE_DONNEES`, `VOLER_DEPLACEMENT_AERIEN` et `VOLER_DEROBER`. Les contre-exemples interdisent notamment `SUFFER`, `WORRISOME`, `SOFFRIR` et `PREOCCUPANT_ADJECTIVE` dans les cas décrits par la mission.

### Canonicalisation et décision humaine

L'assistant Domaine charge désormais explicitement l'utilitaire partagé de la Mission 200, comme l'assistant Texte. Les réponses IA sont canonicalisées avant affichage. Les saisies humaines restent libres pendant l'édition puis sont canonicalisées au `blur`, suivies d'un nouveau contrôle de présence dans Dico-IC et d'un recalcul des doublons internes et existants. Une dernière canonicalisation est appliquée avant l'envoi déclenché par le bouton de création.

Aucune traduction naïve d'une clé anglaise ou hybride n'est tentée. Les lemmes et gloses ne passent jamais par la canonicalisation.

La recette visuelle a détecté puis permis de corriger un raccord manquant dans IA Domaine : les fonctions exposées par `window.DicoEntryKey` n'étaient pas destructurées dans le script Domaine.

### Interface

Les deux assistants affichent près de la génération : « Convention : les nouveaux concepts sont nommés en français. Les clés historiques peuvent conserver une autre langue. » Une aide repliée précise l'infinitif, le singulier, le qualificatif sémantique seulement si nécessaire et la validation humaine obligatoire. La présentation reste informative et non anxiogène.

Versions obtenues :

- IA Domaine : `0.1.1` ;
- IA Texte : `0.1.11` ;
- administration principale, API et package Node : inchangés.

## Fichiers concernés

- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js`
- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-text.js`
- `prototypes/08-dico-seven-sieves/Node/test/entry-key-canonicalization.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/french-concept-key-policy.test.js` (créé)
- `prototypes/08-dico-seven-sieves/admin/css/admin-ai-domain-0.1.css`
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-domain-0.1.html`
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html`
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-domain-0.1.js`
- `reports/202_dico_ic_french_concept_key_policy_implementation_report.md` (créé)

Le rapport 201, déjà présent et non suivi au début, a été conservé sans modification.

## Contrôles réalisés

### Analyse statique et tests automatisés

- `node --check` sur les scripts frontend Domaine et Texte : succès.
- Tests ciblés de canonicalisation et de politique française : 16/16 réussis.
- Suite Node complète : 175/175 tests réussis.
- `git diff --check` : aucune erreur ; seuls les avertissements de conversion LF/CRLF attendus ont été affichés.

Les tests déterministes vérifient l'instruction strictement partagée, toutes ses règles et exemples, la canonicalisation, la préservation des accents dans les lemmes et gloses, la modification humaine, l'absence d'écriture automatique et le câblage des lots, de la progression et de l'annulation.

### Recette déterministe et contrôle visuel

Une fixture locale jetable a servi les deux interfaces et simulé les réponses sans OpenAI ni MariaDB. Elle a proposé les sept concepts demandés avec formes FR/ES/IT/PT/EN.

Résultats :

- 7/7 noms français et clés attendues affichés dans les deux assistants ;
- `S’ÉLEVER` devenu `S_ELEVER` au `blur` dans IA Domaine ;
- `BANQUE_DONNÉES` devenu `BANQUE_DONNEES` au `blur` dans IA Texte ;
- lemmes accentués (`préoccupant`, `banque de données`) et gloses accentuées inchangés ;
- contrôles de sélection et boutons de création conservés ; aucun bouton de création utilisé ;
- compteur d'écritures persistantes de la fixture : 0 ;
- console navigateur : aucune erreur ni aucun avertissement après correction ;
- contrôle visuel ciblé à 1440 × 900 et 1366 × 768 sur les deux assistants : convention lisible, formulaires et brouillons utilisables, aucune erreur visible.

La fixture temporaire a été arrêtée puis supprimée du dépôt.

### Services gérés

Les launchers demandés par la mission ont été utilisés :

- `STOP_IC_LAB_NEXT.bat` a arrêté les quatre services IC-Lab-Next authentifiés sans toucher Docker ni MariaDB ;
- `START_IC_LAB_NEXT.bat` a redémarré Proto05 (PID 5184, port 8791), IC-Hub (PID 47452, port 8790), Agent vocal (PID 24332, port 8788) et Dico-IC (PID 57780, port 3000) ;
- vérification finale Dico-IC : `/languages` répond avec le contrat `0.1` et 5 langues opérationnelles.

Lors du premier essai visuel, le ciblage frontend fixe vers `localhost:3000` a dirigé par erreur une génération Domaine vers le service réel au lieu de la fixture. La requête, encore affichée en cours, a été interrompue par l'arrêt autorisé du service avant de poursuivre la recette sur fixture. Aucune création n'était automatique et aucun bouton d'écriture n'a été utilisé. Cet essai ne vaut pas validation OpenAI réelle ; David réalisera cette validation sur un petit lot.

## Préservation des données et état final

Les volumes MariaDB après recette sont strictement identiques aux volumes initiaux :

- 326 `lexical_entry` ;
- 1125 `lexical_form` ;
- 41 `inflected_form` ;
- 12 `connector_help` ;
- 70 `form_relation` ;
- 1 `pattern_rule` ;
- 8 `ic_feature` ;
- 12 `language`.

Le contrôle final des clés donne 326 entrées et l'empreinte triée SHA-256 `876c2a167c61ce78f64e9ff051f307917b27b4d85b83ee4c4ece21a62192102e`. Aucun chemin de création n'a été déclenché pendant la recette et aucune clé historique n'a été modifiée, renommée ou fusionnée.

## Éléments non vérifiés et limites

- Aucun résultat linguistique provenant d'un appel OpenAI réel n'est validé par cette mission ; cette recette reste déterministe.
- La détection de doublons sémantiques multilingues et l'harmonisation historique restent hors périmètre.
- Une clé anglaise ou hybride échappant au prompt reste volontairement un brouillon humainement révisable.
- La validation fonctionnelle humaine de David reste à effectuer ; les contrôles Codex ne s'y substituent pas.

## Suite possible

David peut lancer un petit lot réel dans chaque assistant, vérifier la qualité linguistique des clés proposées, corriger ou refuser les brouillons si nécessaire, puis décider séparément d'une éventuelle mission sur les doublons sémantiques multilingues.

## Proposition de commit

`feat(dico-ic): nommer en français les nouveaux concepts IA (missions 201-202)`

Ce commit proposé doit inclure le rapport d'audit 201, l'implémentation et les tests de la Mission 202, ainsi que le présent rapport. Aucun commit, push ou déploiement n'a été effectué.
