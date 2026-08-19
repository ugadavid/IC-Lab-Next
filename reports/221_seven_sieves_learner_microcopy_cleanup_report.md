# Mission 221 — Alléger les répétitions pédagogiques dans Seven Sieves

Date : 19 août 2026

## Résultat

La vue apprenante distingue maintenant, pour chacun des sept tamis, le principe pédagogique général des informations propres à un mot. Les principes généraux sont affichés une seule fois dans la carte de gauche « Tamis actif » ; ils ne sont plus répétés dans les infobulles, l’inspection, la comparaison ou les transformations.

La réouverture avant commit a étendu la correction initiale des tamis 1 et 7 aux tamis 2, 4, 5 et 6. Le tamis 3 conserve sa confirmation lexicale au niveau du mot, mais la présente comme une information et non comme une prudence.

Le panneau droit « Le tamis actif » ne répète plus la description générale déjà visible à gauche. Il conserve uniquement le statut public du tamis.

Aucune logique métier, donnée, API, session, aide, contrat ou fonctionnalité enseignante n’a été modifiée.

## Formulation de comparaison

La fin du retour de comparaison :

`Ce retour n’est pas une note.`

est remplacée par :

`Observe quels tamis peuvent éclairer chacun des mots sélectionnés.`

Les fichiers publics du parcours apprenant courant ne contiennent plus d’occurrence de « notation ». Les notions techniques de score, confiance et relation de Dico-IC n’ont pas été touchées.

## Revue exhaustive des sept tamis

| Tamis | Principe général final | Emplacement | Informations individuelles conservées | Répétition générique |
|---:|---|---|---|---|
| 1 | `Prudence : une ressemblance est un indice à vérifier dans le contexte, pas une traduction automatique.` | Carte gauche, sous la description | relation repérée, formes, langues, explication et toute précaution différente reçue de l’API | retirée des rendus individuels pour la phrase source exacte |
| 2 | `Prudence : les formes comparées sont des aides à l’inférence, pas une traduction automatique.` | Carte gauche, sous la description | formes comparées, langues, famille et explication propres au mot | retirée des rendus individuels pour la phrase source exacte |
| 3 | aucun principe générique déplacé | aucun ajout dans la carte générale | transformation, motifs, langues et explication ; confirmation lexicale reformulée ; prudence contextuelle non confirmée conservée | aucune provenance lexicale présentée comme « Prudence » |
| 4 | `Prudence : la prononciation peut varier selon les régions ; le repère reste ici graphique.` | Carte gauche, sous la description | motif graphique et explication locale | retirée des rendus individuels pour la phrase source exacte |
| 5 | `Prudence : la lecture syntaxique reste simplifiée ; le rôle exact doit être vérifié dans la phrase.` | Carte gauche, sous la description | rôle probable, payload et explication propres au mot | retirée pour les deux formulations génériques actuellement émises par l’API réelle et le fournisseur simulé |
| 6 | `Les pluriels affichés s’appuient sur des mappings validés dans Dico-IC. Prudence : le rôle exact des infinitifs probables doit être vérifié dans la phrase.` | Carte gauche, sous la description | surface, lemme, catégorie, marqueur et explication propres au mot | provenance générale des mappings et réserve générale sur les infinitifs retirées des rendus individuels |
| 7 | `Prudence : un affixe isolé ne détermine pas le sens complet.` | Carte gauche, sous la description | affixe repéré, préfixe ou suffixe, famille, transformation, provenance et précaution spécifique | retirée des rendus individuels pour la phrase source exacte |

Pour le tamis 3, la chaîne reçue `La forme proposée est confirmée ici par le lexique : information.` reste attachée à l’occurrence et devient :

`Forme confirmée par le lexique : information.`

La formulation non confirmée, réellement contextuelle, reste une prudence individuelle. Toute autre précaution reçue de l’API reste également affichée avec `Prudence :` : le filtrage n’agit que sur les couples exacts tamis/formulation inventoriés.

## Surfaces de rendu

Le formateur commun `formatEnrichmentPlain` alimente les infobulles et le panneau d’inspection. Il conserve le libellé, le payload, l’explication et les précautions spécifiques, tout en retirant les formulations génériques inventoriées.

La vue des transformations et la comparaison ne lisaient déjà pas le champ `caution`. Elles continuent d’afficher uniquement les informations propres aux mots. Le panneau droit du tamis actif n’affiche plus la description générale en doublon ; son statut public reste inchangé.

Le changement de tamis masque le principe précédent et affiche uniquement celui du tamis sélectionné. Le tamis 3 n’affiche aucun bloc de principe vide ou artificiel.

## Fichiers modifiés

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-student-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/css/seven-sieves-roles-0.1.css` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-role-separation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-analysis-lifecycle.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `reports/221_seven_sieves_learner_microcopy_cleanup_report.md`.

Aucun fichier serveur, fournisseur, contrat, session, seed ou donnée n’est modifié.

## Tests et contrôles

Les tests ciblés couvrent les sept tamis et vérifient notamment :

- l’emplacement unique des principes généraux des tamis 1, 2, 4, 5, 6 et 7 ;
- l’absence de principe générique ajouté au tamis 3 ;
- le retrait exact des formulations génériques des infobulles et de l’inspection ;
- la reformulation informative de la confirmation lexicale du tamis 3 ;
- la conservation des précautions spécifiques ou contextuelles ;
- la conservation des libellés, explications, formes, langues, transformations, rôles, catégories, affixes et motifs ;
- l’absence de répétition de la description dans le panneau droit ;
- l’absence de l’ancienne phrase sur la note et la présence de la formulation positive ;
- les versions enseignante et apprenante attendues ;
- l’exposition correcte des fichiers par le serveur HTTP.

Résultats finaux :

- syntaxe du script apprenant : réussie ;
- tests ciblés : 27/27 réussis ;
- suite complète : 265/265 réussis ;
- service HTTP : page apprenante servie en `0.1.4` avec statut 200 lors du contrôle de mission ;
- aucune fixture ni aucun processus temporaire créé ;
- aucun appel OpenAI effectué.

## Versions

- apprenant : version finale maintenue à `0.1.4` ;
- enseignant : inchangé `0.1.3` ;
- Dico-IC Admin : inchangé `0.1.8` ;
- API : inchangée `0.1`.

La correction rouverte appartient toujours à la Mission 221 et ne crée ni Mission 221b ni nouvel incrément.

## Intégrité MariaDB

Le contrôle final en lecture seule retrouve les volumes de début de mission :

| Table | Volume final |
|---|---:|
| `language` | 12 |
| `lexical_entry` | 305 |
| `lexical_form` | 1 286 |
| `inflected_form` | 41 |
| `connector_help` | 27 |
| `form_relation` | 86 |
| `pattern_rule` | 1 |
| `ic_feature` | 8 |

Les huit empreintes sont strictement identiques au constat initial. L’auto-incrément `connector_help` reste 32 et l’empreinte des douze aides historiques reste `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846`.

Les payloads, aides, relations, règles, seeds et le contrat d’analyse sont inchangés.

## Services et validation visuelle

Le serveur Dico était déjà actif au début de la mission et a été utilisé en lecture pour vérifier l’exposition de la page et du script. Il n’a pas été redémarré ni arrêté. MariaDB est restée active et n’a reçu aucune écriture de cette mission.

Le navigateur intégré n’a pas pu initialiser sa connexion en raison de l’erreur interne de dépendance de confiance déjà observée pendant cette mission. Son infrastructure n’a pas été modifiée ou contournée. Aucune nouvelle capture automatisée n’a donc pu être produite.

La recette humaine finale doit parcourir les tamis 1 à 7, puis revenir aux tamis 1, 3 et 7, avec survol, inspection et comparaison de plusieurs mots. Elle doit confirmer : un seul principe général dans la carte gauche, aucune répétition dans les surfaces individuelles, la confirmation lexicale informative du tamis 3, les précautions spécifiques intactes, et l’absence de débordement, mojibake ou erreur console.

Les tests automatisés confirment la structure et les règles de visibilité, mais ne valent pas validation humaine de David.

## Limites et suite

- La validation visuelle automatisée reste indisponible ; la recette humaine exhaustive demeure à effectuer.
- Les prudences génériques restent volontairement présentes dans les réponses API et données sources : seule leur présentation apprenante est dédupliquée.
- Les anciens prototypes historiques ne sont pas modifiés : seul le parcours apprenant courant demandé est concerné.
- Aucun commit, push ou déploiement n’a été effectué.

## Message de commit proposé

```text
fix(seven-sieves): alléger les répétitions de la vue apprenante (mission 221)
```
