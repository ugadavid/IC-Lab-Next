# Mission 210 — Fiche conceptuelle éditable et relationnelle

Date : 18 août 2026

## Résultat

La fiche conceptuelle Dico-IC est désormais une fiche de travail générique. Elle reste en lecture seule à l'ouverture, permet une modification explicite de l'entrée et de ses formes, calcule toutes les paires linguistiques non orientées et permet d'ajouter ou de modifier une relation symétrique depuis la même page.

La base MariaDB réelle n'a pas été modifiée. Les écritures de recette ont été limitées à une copie jetable, ensuite supprimée. Aucun traitement particulier n'est codé pour `NUIT` ou `INFORMATION_DATA`.

## État observé au début de mission

- dépôt propre, HEAD `15f4452`, commit de la Mission 209 ;
- 12 langues, 305 entrées conceptuelles, 1 286 formes lexicales, 41 formes fléchies, 12 aides, 70 relations, 1 règle et 8 traits IC ;
- `NUIT` : ID 341, cinq formes FR/ES/IT/PT/EN et aucune relation ;
- `INFORMATION_DATA` : ID 2, cinq formes FR/ES/IT/PT/EN et quatre relations ;
- le bouton `Modifier` du lexique réutilisait déjà le contrat `PUT /admin/lexical-entry/:entryKey` ;
- la création de relation existait avec `POST /admin/form-relation`, mais aucune route de modification de relation n'existait.

Ces volumes, plus élevés que ceux de la Mission 209, correspondent à l'état réel trouvé après les ajouts humains intervenus entre les deux missions. Ils ont été constatés et préservés, sans tentative de retour à un volume historique.

## Architecture réutilisée

La page continue d'utiliser les contrats et le repository existants :

- `GET /admin/lexical-entry/:entryKey` pour charger le concept, les formes et les relations ;
- `PUT /admin/lexical-entry/:entryKey` pour enregistrer atomiquement l'entrée et ses formes ;
- `POST /admin/form-relation` pour créer une relation ;
- validation serveur existante des types, scores, formes et provenances ;
- canonicalisation existante des lemmes normalisés ;
- transaction repository existante pour éviter les écritures partielles.

La clé conceptuelle reste immutable sur cette fiche. Aucun second mécanisme de sauvegarde, autosave ou contrat global parallèle n'a été créé.

## Route ajoutée

`PUT /admin/form-relation/:relationId` permet maintenant de modifier une relation existante.

- le couple de formes est immutable, y compris lorsqu'il est présenté dans l'ordre inverse ;
- seuls le type, le score, la symétrie, la provenance, la confiance et les notes supportés par le modèle sont modifiables au repository ;
- une relation inexistante renvoie 404 ;
- une tentative de changer la paire renvoie 409 et annule la transaction ;
- la route utilise les mêmes contrôles de payload que la création.

La création refuse désormais toute seconde ligne pour la même paire non orientée, indépendamment du type de relation et de l'ordre source/cible.

## Mode modification de l'entrée

Le bouton `Modifier l'entrée` ouvre un formulaire dans la fiche courante avec :

- glose française ;
- glose anglaise ;
- domaine sémantique et l'aide « Domaine en français naturel : minuscules, accents et espaces. » ;
- lemme et catégorie grammaticale de chaque forme existante.

Le comportement est explicite et réversible :

- aucun autosave ;
- boutons `Enregistrer` et `Annuler` ;
- annulation avec restauration immédiate des valeurs chargées ;
- comparaison stable du brouillon et absence de requête HTTP si rien n'a changé ;
- message accessible après succès, absence de changement ou erreur ;
- conservation du brouillon en cas d'erreur serveur ;
- invalidation et annulation des requêtes tardives avec `AbortController` et compteur de révision ;
- avertissement navigateur avant de quitter une fiche sale ;
- rechargement du même concept après enregistrement.

Les colonnes de provenance et les notes historiques de l'entrée et des formes ne sont plus réécrites implicitement par la mise à jour. Les lemmes ne sont jamais modifiés hors d'une sauvegarde humaine explicite.

## Couverture relationnelle et calcul des paires

Pour `n` formes, la fiche génère `n × (n - 1) / 2` paires non orientées. Les formes sont ordonnées FR, ES, IT, PT, puis EN ; l'anglais reste identifié comme langue de comparaison non romane.

Chaque paire est indexée par ses deux IDs triés. La détection est donc indépendante de l'ordre source/cible. La liste compacte présente : langues et lemmes, état textuel `Relation présente` ou `Relation à documenter`, type, score, confiance, provenance et action adaptée.

Avec cinq formes, les dix lignes sont exactement : FR↔ES, FR↔IT, FR↔PT, FR↔EN, ES↔IT, ES↔PT, ES↔EN, IT↔PT, IT↔EN et PT↔EN. Le compteur `présentes / possibles` est recalculé après chaque réponse serveur réussie.

Pour une paire manquante, `Ajouter la relation` ouvre un dialogue annulable. Pour une paire existante, `Modifier la relation` reprend le type, le score et la provenance. Une sauvegarde inchangée ne produit aucune écriture.

## Accessibilité et présentation

- vrais boutons et dialogue natif ;
- labels associés aux champs ;
- messages `role=status` avec zone vivante ;
- navigation clavier et focus visibles hérités des contrôles ;
- état exprimé par du texte, jamais uniquement par la couleur ;
- tableau compact avec débordement interne borné, sans défilement horizontal de la page entière ;
- traitement visuel distinct des paires comprenant l'anglais ;
- adaptation responsive des formulaires et actions.

## Tests automatisés

Les tests permanents couvrent notamment :

- calcul pour 0, 1, 2 et 5 formes ;
- exactement 10 paires et ordre FR/ES/IT/PT/EN ;
- détection symétrique et compteur présent/total ;
- session de modification annulée, sauvegardée ou laissée intacte après erreur ;
- présence et version des contrôles d'interface ;
- ajout d'une relation, modification d'une relation et refus d'un doublon inverse même d'un autre type ;
- rollback lorsqu'une modification tente de changer la paire ;
- consultation générique de `NUIT` sans écriture ;
- maintien du contrat `INFORMATION_DATA` ;
- fichiers statiques et syntaxe Node.

Résultats :

- suite ciblée : 43/43 réussis ;
- suite Node complète : 210/210 réussis ;
- `node --check` sur les sources modifiées : réussi ;
- `git diff --check` : réussi, hors avertissements Git de conversion LF/CRLF déjà configurée sur Windows.

## Recette MariaDB jetable

La copie `ic_dico_m210_fixture_15f4452` a servi une recette HTTP et navigateur complète :

- modification temporaire puis restauration exacte de la glose d'`INFORMATION_DATA` ;
- préservation des cinq provenances de formes ;
- création de la relation 71 ES↔IT ;
- refus HTTP 409 de l'inverse IT↔ES avec un type différent ;
- modification de la relation 71 ;
- modification d'une relation existante depuis l'interface ;
- création depuis l'interface d'une relation ES↔PT et passage immédiat du compteur à 6/10 ;
- annulation du mode entrée et du dialogue relation sans écriture.

Le privilège temporaire a été révoqué, la fixture supprimée, son absence vérifiée et le serveur de fixture sur 3001 arrêté. La preuve structurée se trouve dans `reports/assets/210_dico_ic_editable_concept_sheet/fixture_validation.json`.

## Recette visuelle

La recette Chromium a vérifié :

- `INFORMATION_DATA` en lecture, en modification, après annulation, après modification d'une relation et après création d'une relation sur fixture ;
- `NUIT` réel en lecture avec cinq formes et 0/10 relation ;
- `INFORMATION_DATA` réel en lecture avec cinq formes et 4/10 relations ;
- affichage des dix paires, distinction de l'anglais, états présents/manquants, messages et compteur ;
- absence de mojibake, de débordement horizontal global et d'erreur console.

Limite réelle : le navigateur intégré imposait une surface fixe de 1265 × 710 et n'exposait aucune commande de redimensionnement. Cette surface, plus contrainte que 1366 × 768, a produit un rendu lisible et responsive, mais les dimensions exactes 1366 × 768 et 1440 × 900 n'ont pas pu être attestées. Cette recette Codex ne remplace pas la validation humaine de David.

## Preuve de non-écriture sur MariaDB réelle

Les volumes et empreintes déterministes des huit tables sont identiques avant et après l'implémentation, les tests, la recette sur fixture et les consultations réelles :

| Table | Volume avant/après | SHA-256 avant/après |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1 286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 70 | `4d3f55cfe964bcba184d07d63eb05e631cc186aaf26da42974a1c17ac2ceaa43` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

`NUIT` et `INFORMATION_DATA` ont uniquement fait l'objet de requêtes GET sur la base réelle. La preuve structurée est `reports/assets/210_dico_ic_editable_concept_sheet/real_db_integrity.json`.

## Versions

- fiche conceptuelle : V0.1.2 → V0.1.3 ;
- contrat API global : inchangé à 0.1 ;
- package Node : inchangé ;
- Seven Sieves et autres prototypes : inchangés.

Seul l'artefact de page réellement affecté reçoit le baby step.

## Services

Un serveur temporaire sur le port 3001 a servi la fixture puis a été arrêté.

Le service Dico réel préexistant servait encore le processus chargé avant la modification backend. Un arrêt global a été refusé par le contrôle de sécurité afin de ne pas interrompre inutilement les trois autres services. Dico seul a donc été arrêté par sa requête authentifiée puis relancé avec son descripteur projet : PID Node 65180 → 27588, hôte 32436. Sa page de disponibilité répond HTTP 200 et sert V0.1.3.

Proto05 (PID 42532), IC-Hub (PID 53628) et Agent vocal (PID 29348) n'ont pas été arrêtés. MariaDB et Docker n'ont pas été redémarrés. En fin de mission, Dico écoute sur 3000 et les trois autres services conservent leur état initial.

## Fichiers modifiés

- `prototypes/08-dico-seven-sieves/Node/server.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/repository.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-manual-routes.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-entry-0.1.1.css` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-entry-0.1.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-entry-0.1.1.js`.

## Fichiers créés

- `prototypes/08-dico-seven-sieves/Node/test/admin-repository-relation-update.test.js` ;
- `reports/assets/210_dico_ic_editable_concept_sheet/fixture_validation.json` ;
- `reports/assets/210_dico_ic_editable_concept_sheet/real_db_integrity.json` ;
- `reports/210_dico_ic_editable_concept_sheet_report.md`.

## Limites et suites

- aucune relation réelle manquante n'a été créée ; leur qualification reste une mission suivante après validation humaine ;
- aucune suppression de relation n'a été ajoutée, conformément au périmètre ;
- les dimensions visuelles exactes demandées restent à confirmer humainement ;
- aucun appel OpenAI, commit, push ou déploiement n'a été effectué.

Message de commit proposé :

```text
feat(dico-ic): rendre la fiche conceptuelle éditable et relationnelle
```
