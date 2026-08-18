# Mission 207 — Audit fonctionnel de `semantic_domain`

## Conclusion

Le champ est **libre, seulement contrôlé en apparence**. Il cumule libellé humain, terme de recherche, métadonnée API et sortie libre des assistants Domaine/Texte. Il n’est ni identifiant stable ni taxonomie fermée.

## Consommateurs actifs

| Consommateur | Usage réel | Contrainte ou dépendance |
|---|---|---|
| MariaDB `lexical_entry` | Stockage `VARCHAR(100) NULL` | Aucun index, FK, CHECK ou unicité sur ce champ |
| `sp_upsert_lexical_entry` | Insère ou remplace la valeur | Aucune comparaison de domaine |
| Repository de lecture | Transporte la valeur avec clés, gloses et formes | Aucune branche conditionnelle |
| Recherche admin | `semantic_domain LIKE %recherche%` | Filtre partiel selon `utf8mb4_unicode_ci` |
| Routes GET admin | Restituent la valeur telle quelle | Aucune liste fermée |
| Routes POST/PUT admin | Texte optionnel trimé, maximum 100 caractères | Type et longueur seulement |
| Admin principal | Affiche, édite avec un `input` libre | Placeholder français `école` |
| Vue conceptuelle | Affiche sous « Domaine sémantique » | Fonction de libellé humain explicite |
| Assistant IA Domaine | Envoie le domaine pédagogique à OpenAI et exige un domaine string | Réponse libre puis trim ; cohérence demandée avec l’entrée utilisateur |
| Assistant IA Texte | Demande un domaine bref à OpenAI | Langue du domaine non explicitement imposée |
| Interfaces IA | Champ éditable ; vide = brouillon incomplet | Aucune canonicalisation |
| Assistant IA Relations | Affiche la valeur dans la page | Le prompt Relations n’envoie pas ce champ |
| Seven Sieves | Le repository inclut la valeur dans certains objets | Aucun affichage, filtre ou branchement direct trouvé |
| Aides discursives | Modèle séparé | Aucun usage trouvé |
| Tests | Exemples libres, tests de transport et trim | Aucune taxonomie |
| Seeds/procédures | Valeurs historiques et upsert | Aucune liste fermée |
| Documentation | Description du champ et de la recherche | Non normative |
| Rapports historiques | Mentions descriptives | Non fonctionnel |

## Collation

La collation `utf8mb4_unicode_ci` masque des variantes de casse/accent : `COUNT(DISTINCT semantic_domain)` retourne 79, contre **84** avec `COUNT(DISTINCT BINARY semantic_domain)`. L’exactitude exige donc une comparaison binaire.

## Absences vérifiées

Aucune comparaison exacte métier, liste contrôlée, agrégation fonctionnelle, relation avec les aides discursives, export spécialisé ou filtration Seven Sieves par domaine n’a été trouvée.

## Fichiers probants inspectés

- schéma et procédures : `database/current_draft/00_schema.sql`, `database/current_draft/10_procedures.sql`, `database/schema.sql`, `database/procedures.sql` ;
- accès aux données : `Node/src/repository.js` ;
- validation et routes : `Node/src/admin.js`, `Node/server.js` ;
- génération IA : `Node/src/admin-ai-domain.js`, `Node/src/admin-ai-text.js`, `Node/src/admin-ai-relations.js` ;
- interfaces : `admin/js/admin-0.1.js`, `admin/js/admin-entry-0.1.1.js`, `admin/js/admin-ai-domain-0.1.js`, `admin/js/admin-ai-text-0.1.js`, `admin/js/admin-ai-relations-0.1.js` ;
- seeds et tests : `database/data_test.sql` et les tests `Node/test/` référençant `semantic_domain` ;
- client Seven Sieves : `prototypes/01-seven-sieves/`, sans lecture directe trouvée du champ.

## Cible proportionnée

Avant soutenance, conserver un champ texte français normalisé est suffisant. Une liste de suggestions côté interface pourra guider les nouvelles saisies après validation métier. Une table de domaines ou un couple identifiant/libellé doit être reporté tant qu’aucun consommateur n’exige une identité stable.
