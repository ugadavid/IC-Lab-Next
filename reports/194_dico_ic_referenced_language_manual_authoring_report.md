# Mission 194 — Autorisation documentaire manuelle des langues référencées

## Périmètre et origine

La Mission 194 corrige la contradiction observée pendant la validation humaine de la Mission 193 : le catalogue présentait sept langues romanes comme prêtes à accueillir des contenus validés, tandis que l’atelier manuel ne proposait que FR, ES, IT, PT et EN.

La correction sépare explicitement trois périmètres sans étendre les fonctions opérationnelles :

- catalogue public : 12 langues ;
- atelier documentaire manuel : 12 langues ;
- analyse et assistants opérationnels : 5 langues, FR, ES, IT, PT et EN.

Les sept langues CA, GL, OC, RO, CO, SC et RM restent `REFERENCED`, inactives et sans contenu dans la base de développement. Aucune activation ni modification de statut n’est effectuée par une écriture manuelle.

## État initial observé

- dépôt propre sur `main` ;
- commit de départ : `dcfa898 feat(dico): référencer sept langues romanes au catalogue` ;
- `GET /languages` : 5 langues, FR, ES, IT, PT, EN ;
- catalogue et table `language` : 12 langues ;
- sept langues référencées inactives, sans dépendance ;
- volumes fonctionnels : 150 entrées lexicales, 597 formes lexicales, 16 formes fléchies, 12 aides discursives, 70 relations, 1 règle et 8 traits.

## Réalisation

### Frontières serveur et dépôt

- `getLanguages()` reste inchangé et continue de sélectionner uniquement les langues actives et `DOCUMENTED` ;
- ajout de `getDocumentableLanguages()`, distinct, limité aux statuts documentaires reconnus `DOCUMENTED` et `REFERENCED` ;
- ajout de `GET /admin/documentable-languages`, contrat API `0.1`, qui ne publie pas les statuts techniques et fournit une classification présentable ;
- les routes `POST /admin/lexical-entry` et `PUT /admin/lexical-entry/:entryKey` valident désormais les formes contre ce périmètre documentaire ;
- création, modification d’une forme existante et ajout d’une forme vérifient aussi la langue au niveau du dépôt, dans la transaction, sans condition `is_active` ;
- une langue inconnue ou portant un statut non reconnu produit `INVALID_LANGUAGE` ;
- les règles existantes de clé, glose, catégorie grammaticale, normalisation, doublon, transaction et provenance sont préservées.

Les autres appels à `getLanguages()` sont conservés pour l’analyse, les assistants de domaine et de texte, les formes fléchies et les autres usages opérationnels. Seven Sieves, les assistants, les aides discursives, les règles, les heuristiques et les informations n’ont pas été étendus.

### Atelier manuel

- les quatre lignes initiales restent FR, ES, IT et PT ;
- chaque sélecteur de langue, y compris une ligne ajoutée par « Ajouter une forme », contient les 12 langues ;
- présentation en trois groupes : 4 langues romanes documentées, 7 langues romanes prêtes à documenter, 1 langue non romane de comparaison ;
- libellé public « prête à documenter » pour les sept langues référencées, sans statut technique ;
- colonne de langue élargie pour conserver des libellés lisibles ;
- aide positive exacte : « Une langue prête à documenter peut déjà recevoir des formes linguistiques dans l’atelier manuel. Elle ne devient analysable qu’après constitution, vérification et activation de son contenu. »
- le message de catalogue « Prête à accueillir des contenus validés » est conservé.

## Fichiers modifiés

- `prototypes/08-dico-seven-sieves/Node/server.js`
- `prototypes/08-dico-seven-sieves/Node/src/repository.js`
- `prototypes/08-dico-seven-sieves/admin/index-admin-0.1.html`
- `prototypes/08-dico-seven-sieves/admin/js/admin-0.1.js`
- `prototypes/08-dico-seven-sieves/admin/css/admin-0.1.css`
- `prototypes/08-dico-seven-sieves/Node/test/admin-manual-routes.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/admin-repository-update.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/referenced-romance-languages.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`

## Artefacts visuels créés

- `reports/assets/194_dico_ic_referenced_language_manual_authoring/new-entry-1440x900.png`
- `reports/assets/194_dico_ic_referenced_language_manual_authoring/add-form-selector-open-1440x900.png`
- `reports/assets/194_dico_ic_referenced_language_manual_authoring/catalog-1440x900.png`
- `reports/assets/194_dico_ic_referenced_language_manual_authoring/new-entry-1366x768.png`
- `reports/assets/194_dico_ic_referenced_language_manual_authoring/add-form-selector-open-1366x768.png`
- `reports/assets/194_dico_ic_referenced_language_manual_authoring/catalog-1366x768.png`

## Contrôles réalisés

### Analyse statique et tests automatisés

- `node --check` sur `repository.js`, `server.js` et `admin-0.1.js` : succès ;
- tests ciblés des routes manuelles, du dépôt, de la présentation et des langues référencées : 40/40 réussis ;
- suite complète `npm.cmd test` : 121/121 réussis ;
- `git diff --check` : aucune erreur ;
- recherche de motifs de mojibake dans les fichiers concernés : aucun motif détecté.

Les tests couvrent notamment : langue référencée acceptée en création et en mise à jour manuelle, langue documentée acceptée, langue inconnue refusée, résolution documentaire sans activation, sept analyses forgées refusées et assistants conservés au périmètre opérationnel.

### Validation HTTP ciblée

Sur un serveur isolé avec le code de la mission :

- `GET /languages` : 5 langues, ordre FR, ES, IT, PT, EN ;
- `GET /admin/documentable-languages` : 12 langues, ordre FR, ES, IT, PT, CA, GL, OC, RO, CO, SC, RM, EN ;
- `GET /language-catalog` : les mêmes 12 langues ;
- création avec `xx` : HTTP 400 `INVALID_LANGUAGE` ;
- analyse forgée en CA : HTTP 400 `INVALID_LANGUAGE`.

### Écriture réelle référencée sur copie jetable

Une copie complète `ic_dico_m194_authoring_test` de la base de développement a été créée pour la recette, sans écrire dans `ic_dico`.

Scénario exécuté :

1. création de l’entrée temporaire `MISSION_194_CA_FIXTURE` avec la forme catalane `escola temporal` : HTTP 201 ;
2. relecture : entrée et forme CA retrouvées ;
3. mise à jour de l’entrée en conservant CA et en ajoutant la forme française `école temporaire` : HTTP 200 ;
4. contrôle en base pendant la recette : CA est restée `REFERENCED`, `is_active = 0`, avec une forme uniquement dans la copie ;
5. analyse CA : HTTP 400 `INVALID_LANGUAGE` ;
6. suppression transactionnelle ciblée de la fixture ;
7. volumes de la copie revenus exactement à 150/597/16/12/70/1/8 et contenu CA revenu à zéro ;
8. arrêt du serveur, suppression de la base jetable et retrait de ses droits temporaires.

Contrôle final : zéro schéma, zéro droit de base et zéro droit de procédure portant le nom de la copie jetable.

### Validation visuelle Chromium

Pages et états contrôlés à 1440 × 900 et 1366 × 768 :

- atelier « Nouvelle entrée » avec quatre lignes FR/ES/IT/PT ;
- ajout d’une cinquième ligne ;
- action d’ouverture du sélecteur et contrôle de ses 12 options, groupées 4/7/1 ;
- catalogue de 12 langues et texte d’aide positif ;
- absence de débordement horizontal ;
- aucune erreur navigateur visible ou journalisée.

Limite de capture : le menu déroulant natif a été ouvert, mais sa surcouche système n’est pas incluse par la capture de contenu web. La présence des 12 options et des trois groupes a été vérifiée directement dans l’état rendu pour chaque dimension. Les captures montrent le sélecteur actionné et les états avant/après ajout.

Cette recette Codex ne constitue pas la validation humaine de David.

## État final des données de développement

- catalogue : 12 ;
- atelier manuel documentable : 12 ;
- périmètre opérationnel : 5 ;
- FR, ES, IT, PT, EN : `DOCUMENTED`, actives ;
- CA, GL, OC, RO, CO, SC, RM : `REFERENCED`, inactives, sans dépendance ni contenu ;
- volumes : 150/597/16/12/70/1/8, inchangés ;
- aucune fixture, base temporaire ou processus de recette restant.

## Éléments non vérifiés et limites restantes

- aucune écriture n’a été effectuée sur la base réelle de développement, conformément à la mission ;
- aucune activation future d’une langue référencée ni constitution de corpus n’a été testée ;
- aucune validation humaine n’a été réalisée dans cette mission.

## Versionnement

- Dico-IC Admin : `0.1.5` ;
- contrat API : `0.1`, inchangé ;
- package Node : `1.0.0`, inchangé.

L’incrément Admin `0.1.4` → `0.1.5` correspond au correctif incrémental de l’atelier manuel. Aucun autre composant n’est versionné différemment.

## Hors périmètre confirmé

Aucun changement de statut ou d’activation, aucune donnée réelle, aucune migration, aucune modification de Seven Sieves, des assistants, des aides discursives, des règles, des heuristiques, des informations, de Compose, des launchers, du portable ou d’`AGENTS.md`. Aucun commit, push ou déploiement n’a été effectué.

## Suite possible

Validation humaine de la Mission 194 sur l’atelier manuel et le catalogue. Aucune autre évolution n’est nécessaire dans le périmètre actuel.

## Message de commit proposé

`fix(dico): autoriser la documentation manuelle des langues référencées`
