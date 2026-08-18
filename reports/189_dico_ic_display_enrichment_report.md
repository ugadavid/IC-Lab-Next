# Rapport 189 — Enrichissement de l’affichage Dico-IC pour la soutenance

Date : 18 août 2026  
Nature : évolution applicative locale, sans migration ni écriture de données  
Périmètre : administration et API GET de `prototypes/08-dico-seven-sieves`

## 1. Résultat

L’administration Dico-IC expose désormais un parcours de démonstration court et honnête :

1. ouvrir la section **Modèle** ;
2. lire les huit compteurs et les quatre indicateurs de couverture ;
3. cliquer sur **Voir l’exemple INFORMATION_DATA** ;
4. montrer sur un écran ses cinq formes et ses quatre relations.

La vue détaillée est strictement en lecture seule. Elle affiche les gloses, le domaine, les langues, lemmes, catégories grammaticales, normalisations utiles, confiances et provenances disponibles. Elle signale explicitement l’absence de provenance structurée des formes lexicales et l’absence de statut de validation relationnelle dans la V0.

Temps estimé du parcours commenté : **20 à 30 secondes**. Aucun chronométrage humain par David n’a été réalisé.

## 2. Arbitrage d’instructions

David a explicitement autorisé ce rapport dans `IC-Lab-Next/reports/` malgré la contradiction documentaire préexistante dans `AGENTS.md`. La modification locale préexistante de `AGENTS.md` a été préservée et n’a pas été modifiée par cette mission.

Le défaut Compose documenté par le rapport 188 est resté hors périmètre. Aucun launcher, processus portable, conteneur, schéma, seed ou donnée n’a été modifié.

## 3. Fichiers concernés

### Créés

- `prototypes/08-dico-seven-sieves/admin/index-admin-entry-0.1.1.html` : vue d’entrée en lecture seule ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-entry-0.1.1.css` : mise en page compacte et responsive ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-entry-0.1.1.js` : chargement GET et rendu des formes/relations ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-presentation.test.js` : couverture, endpoint et libellés ;
- `reports/assets/189_dico_ic_display_enrichment/model-1440x900.png` ;
- `reports/assets/189_dico_ic_display_enrichment/information-data-1440x900.png` ;
- `reports/assets/189_dico_ic_display_enrichment/information-data-1366x768.png` ;
- `reports/189_dico_ic_display_enrichment_report.md`.

### Modifiés

- `prototypes/08-dico-seven-sieves/Node/src/repository.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-0.1.css` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-0.1.js`.

## 4. Architecture de la solution

Le parcours réutilise les frontières existantes :

```text
Vue Modèle
  ├─ GET /admin/model-summary
  └─ lien ?entry_key=INFORMATION_DATA
             ↓
Vue d’entrée en lecture seule
  ├─ GET /admin/lexical-entry/:entryKey
  └─ GET /languages
             ↓
MariaDB ic_dico — SELECT uniquement
```

Aucune nouvelle route n’a été ajoutée. `GET /admin/lexical-entry/:entryKey` a été enrichi de deux champs déjà présents dans le schéma :

- `entry.forms[].source_label` ;
- `relations[].confidence_score`.

Le contrat API reste `0.1` ; l’ajout est rétrocompatible. Les routes d’administration et les liens Seven Sieves existants sont conservés.

## 5. Couverture dynamique

`GET /admin/model-summary` exécute désormais une agrégation de couverture à partir des entrées, formes et langues réelles. Le contrôle HTTP sur MariaDB a retourné :

| Indicateur | Valeur observée |
|---|---:|
| Concepts au total | 150 |
| Concepts couvrant FR/ES/IT/PT | 115 |
| Concepts couvrant FR/ES/IT/PT/EN | 109 |
| Formes linguistiques | 597 |

L’interface distingue quatre langues romanes centrales et l’anglais comme langue de comparaison. Les valeurs ne sont pas codées en dur dans l’interface.

## 6. Aides et libellés publics

Un composant natif réutilisable `<details>` intitulé **? Comprendre** est présent sur :

- Modèle ;
- Langues ;
- Lexique ;
- Formes fléchies ;
- Aides discursives ;
- Relations.

Chaque aide définit l’objet, sa raison d’être, ses producteurs/vérificateurs/utilisateurs et un exemple réel lorsque pertinent.

Les surfaces touchées affichent désormais des libellés français comme intitulés principaux pour les objets du modèle, catégories grammaticales, types de relation, statuts, nombres grammaticaux et provenances connues. Les codes internes restent visibles en information secondaire. Aucune valeur stockée, enum ou validation n’a été changée.

## 7. Contrôles automatisés et statiques

- `npm test` dans `Node/` : **104 tests réussis, 0 échec** ; cela comprend les **101 tests historiques** et **3 nouveaux tests** ;
- nouveaux contrôles : calcul SQL des couvertures, endpoint GET avec cinq formes/quatre relations, champs de provenance/confiance, libellés humains et absence de contrôles d’écriture dans la page de détail ;
- `node --check` : scripts frontend, repository et nouveau test valides ;
- `git diff --check` : réussi ; seuls des avertissements informatifs de conversion LF/CRLF sont affichés par Git ;
- aucune dépendance installée ou mise à jour.

## 8. Contrôle HTTP réel

Une instance temporaire séparée a été lancée sur le port `3100`, sans migration et sans appel d’écriture. Les GET réels ont confirmé :

- contrat `0.1` ;
- compteurs `150` et `597` ;
- couverture `115` et `109` ;
- entrée `INFORMATION_DATA` ;
- cinq formes ;
- quatre relations ;
- présence de `source_label` sur les formes ;
- présence de `confidence_score` sur les relations.

Cette instance a été arrêtée. Aucun processus lancé par la mission ne subsiste. Aucun service préexistant n’a été arrêté.

## 9. Validation visuelle

### 1440 × 900

- vue Modèle : huit compteurs, chemin en quatre étapes, couverture et raccourci visibles ;
- vue INFORMATION_DATA : cinq formes et quatre relations visibles sur un écran ;
- aucun débordement horizontal, texte coupé ou mojibake ;
- six aides contextuelles détectées ; ouverture de l’aide Modèle vérifiée ;
- aucune erreur ou alerte console.

### 1366 × 768

- cinq formes, quatre relations et limite V0 visibles sans défilement ;
- dimensions DOM observées : `1366 × 768`, largeur et hauteur de document égales au viewport ;
- aucun texte de carte détecté comme débordant ;
- aucune erreur ou alerte console.

Captures :

- `reports/assets/189_dico_ic_display_enrichment/model-1440x900.png` ;
- `reports/assets/189_dico_ic_display_enrichment/information-data-1440x900.png` ;
- `reports/assets/189_dico_ic_display_enrichment/information-data-1366x768.png`.

## 10. Limites conservées volontairement

- aucune provenance structurée pour les 597 formes lexicales : l’interface indique « Provenance non renseignée dans le modèle V0. » ;
- aucun statut de validation relationnelle : aucun badge « Validé » n’est inventé ;
- pas de refonte graphique, seulement un enrichissement cohérent avec l’admin existante ;
- aucune validation linguistique nouvelle ;
- aucune automatisation UI lourde ;
- aucune validation fonctionnelle humaine par David ;
- Seven Sieves et sa page canonique sont inchangés.

## 11. Préservation du périmètre

Confirmation : aucune donnée, langue, règle, heuristique, configuration de lancement, page Seven Sieves, configuration Compose, base MariaDB, IA ou processus portable n’a été modifié. Aucun commit, push ou déploiement n’a été effectué.

## 12. Version

- administration Dico-IC : **0.1.1** (évolution incrémentale de présentation) ;
- contrat API : **0.1**, inchangé ;
- package Node : **1.0.0**, inchangé ;
- Seven Sieves : inchangé.

Message de commit proposé :

```text
feat(dico): enrichir le parcours de démonstration de l’admin
```

Suite possible : répétition humaine du parcours par David avec le discours de soutenance, puis travail séparé sur Seven Sieves conformément à la mission annoncée.
