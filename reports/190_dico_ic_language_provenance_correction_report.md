# Rapport 190 — Correctif de hiérarchie des langues et de provenance Dico-IC

Date : 18 août 2026  
Nature : correctif ciblé d’interface et de cinq provenances lexicales  
Périmètre : vue de lecture `INFORMATION_DATA` et cinq lignes `lexical_form` correspondantes

## 1. Résultat

La vue de soutenance présente désormais les langues dans l’ordre public explicite suivant :

1. Français — FR ;
2. Español — ES ;
3. Italiano — IT ;
4. Português — PT ;
5. English — EN.

Les quatre premières cartes sont identifiées comme **Cœur roman**. L’anglais est toujours placé en dernier, possède un fond et une bordure distincts, et porte l’étiquette **Langue de comparaison — non romane**.

Les cinq formes de `INFORMATION_DATA` portent maintenant la provenance technique `manual_seed`. La surface publique affiche **Corpus initial Dico-IC** pour les formes et les relations ; le code technique reste accessible dans l’infobulle `title`.

La bannière jaune sur l’absence de statut relationnel a été retirée. L’information se trouve dans l’aide repliée **? Comprendre les relations** avec la formulation demandée, sans inventer de statut.

## 2. Preuves de provenance

La provenance `manual_seed` a été retenue à partir de preuves concordantes :

- `database/seed_data.sql`, bloc `ENTRY : INFORMATION`, crée ensemble les cinq formes FR/ES/IT/PT/EN avec confiance `0.98` ;
- les quatre relations immédiatement suivantes portent `source_label = 'manual_seed'` ;
- `database/current_draft/30_seed_experimental.sql` reproduit exactement ce même bloc ;
- `database/data_test.sql` identifie les cinq formes comme le groupe initial `INFORMATION_DATA` ;
- le dump historique `database/schema.sql` contient ces formes aux IDs 6 à 10 et les relations 5 à 8 avec `manual_seed` ;
- le commit initial `f063ecf` contient déjà ce même ensemble ;
- l’ancienne procédure `sp_upsert_lexical_form` ne recevait pas de paramètre `source_label`, ce qui explique les valeurs `NULL` sans contredire l’origine manuelle initiale.

La provenance n’a donc pas été déduite de la seule ressemblance avec les relations : elle est établie par le seed, le draft, le dump et l’historique Git.

## 3. État de la base avant opération

Lecture avant écriture :

| ID | Langue | Lemme | Normalisation | POS | Confiance | `source_label` |
|---:|---|---|---|---|---:|---|
| 6 | fr | information | information | noun | 0.980 | `NULL` |
| 7 | es | información | informacion | noun | 0.980 | `NULL` |
| 8 | it | informazione | informazione | noun | 0.980 | `NULL` |
| 9 | pt | informação | informacao | noun | 0.980 | `NULL` |
| 10 | en | information | information | noun | 0.980 | `NULL` |

Totaux avant : 597 formes, 597 `source_label` nulles, 0 forme `manual_seed`.

Sauvegarde ciblée :

`reports/assets/190_dico_ic_language_provenance_correction/information-data-source-label-before.json`

## 4. Mécanisme correctif et retour arrière

Script versionné créé :

`prototypes/08-dico-seven-sieves/Node/scripts/correct-information-data-source-label.js`

Protections :

- modes explicites `--check`, `--apply` et `--rollback` ;
- cinq formes exactes attendues, avec contrôle de la langue, du lemme, de la normalisation et du POS ;
- verrouillage `FOR UPDATE` dans une transaction ;
- refus d’une provenance préexistante inconnue ;
- refus d’un état partiellement appliqué ;
- sauvegarde obligatoire créée avec le mode exclusif `wx` ;
- assertion de cinq lignes modifiées ;
- relecture et réconciliation avant `COMMIT` ;
- rollback automatique de la transaction en cas d’écart.

Commande appliquée :

```text
node scripts/correct-information-data-source-label.js --apply --backup <chemin-sauvegarde>
```

Résultat initial : `changed_rows = 5`, `state = applied`.

La même commande a été rejouée : `changed_rows = 0`, `state = already_applied`. L’opération est donc idempotente.

Retour arrière disponible, non exécuté puisque le correctif est attendu :

```text
node scripts/correct-information-data-source-label.js --rollback --backup <chemin-sauvegarde>
```

Ce mode restaure les cinq valeurs antérieures depuis le fichier de sauvegarde dans une transaction et vérifie la restauration exacte avant `COMMIT`.

## 5. État de la base après opération

- lignes modifiées : **exactement 5** ;
- IDs modifiés : 6, 7, 8, 9 et 10 ;
- champ modifié : uniquement `lexical_form.source_label` ;
- nouvelle valeur : `manual_seed` ;
- total de formes : 597, inchangé ;
- sources nulles : 592 ;
- formes `manual_seed` : 5 ;
- cinq formes et quatre relations toujours retournées par l’API ;
- aucun autre champ des cinq formes modifié ;
- aucune autre entrée lexicale touchée.

## 6. Fichiers concernés par ce correctif

### Créé

- `prototypes/08-dico-seven-sieves/Node/scripts/correct-information-data-source-label.js` ;
- `reports/assets/190_dico_ic_language_provenance_correction/information-data-source-label-before.json` ;
- `reports/assets/190_dico_ic_language_provenance_correction/information-data-corrected-1440x900.png` ;
- `reports/assets/190_dico_ic_language_provenance_correction/information-data-corrected-1366x768.png` ;
- `reports/190_dico_ic_language_provenance_correction_report.md`.

### Modifiés depuis la mission 189

- `prototypes/08-dico-seven-sieves/admin/index-admin-entry-0.1.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-entry-0.1.1.css` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-entry-0.1.1.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`.

La modification préexistante de `AGENTS.md`, le rapport 188 et les changements de la mission 189 ont été préservés.

## 7. Tests et contrôles

### Automatisés et statiques

- suite complète Node : **107 tests réussis, 0 échec** ;
- elle comprend les 104 tests de départ et 3 tests ciblés supplémentaires ;
- ordre FR/ES/IT/PT/EN et anglais en dernière position ;
- étiquette de comparaison non romane ;
- distinction CSS de la carte EN ;
- provenance publique concise et code technique séparé ;
- script correctif limité aux cinq formes exactes ;
- aide relationnelle repliée et absence de bannière principale ;
- cinq formes, quatre relations et lecture seule conservées ;
- `node --check` réussi ;
- `git diff --check` réussi, hors avertissements informatifs LF/CRLF.

### HTTP réel

`GET /admin/lexical-entry/INFORMATION_DATA` :

- cinq formes ;
- quatre relations ;
- langues API encore triées alphabétiquement, ce qui confirme que l’ordre public est imposé par la vue ;
- cinq `source_label = manual_seed`.

### Validation visuelle

À 1440 × 900 et 1366 × 768 :

- ordre exact FR, ES, IT, PT, EN ;
- anglais visuellement distinct et placé en dernier ;
- étiquette complète visible ;
- neuf libellés publics `Corpus initial Dico-IC` : cinq formes et quatre relations ;
- neuf codes techniques `manual_seed` accessibles en infobulle ;
- aucune occurrence visible de « Provenance non renseignée dans le modèle V0 » ;
- aucune bannière jaune ;
- aide relationnelle repliée par défaut et ouverture vérifiée ;
- cinq formes et quatre relations visibles sur un écran ;
- aucun débordement, texte coupé, mojibake, erreur ou avertissement navigateur.

## 8. Version et périmètre préservé

- vue de lecture Dico-IC : **0.1.2** ;
- route stable `index-admin-entry-0.1.1.html` conservée pour ne pas casser les liens existants ;
- contrat API `0.1`, package Node `1.0.0` et Seven Sieves inchangés.

Non modifiés : langues référencées, schéma MariaDB, Compose, launchers, autres entrées lexicales, règles, traits, heuristiques, assistants IA, Seven Sieves, `AGENTS.md` et rapport 188.

Le serveur temporaire de recette sur le port 3100 a été arrêté. Aucun processus lancé par la mission ne subsiste. Aucune validation humaine finale de David n’a encore été effectuée sur ce correctif.

Aucun commit, push ou déploiement n’a été réalisé.

Message de commit proposé :

```text
fix(dico): hiérarchiser les langues et présenter la provenance initiale
```
