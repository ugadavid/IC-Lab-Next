# Mission 222 — Transformer le bouton « Aide » en guide apprenant contextuel

Date : 19 août 2026

## Résultat

Le bouton « Aide » de la vue apprenante ouvre désormais un dialogue superposé sans quitter l’activité. Le texte reste visible en arrière-plan et l’ouverture du guide ne modifie ni l’activité préparée, ni le tamis actif, ni l’inspection, ni la sélection, ni les statuts, ni les aides à la lecture.

L’ancien accordéon « Comment explorer ? » situé sous le texte a été entièrement retiré, ainsi que son identifiant `studentHelp`, ses styles et l’ancien lien d’ancre `href="#studentHelp"`. Aucun espace ou élément caché ne subsiste à son ancien emplacement.

## Contenu et présentation

Le guide reprend les trois blocs demandés :

1. « À quoi sert Seven Sieves ? » explique la construction progressive du sens à partir d’indices reconnaissables ;
2. « Comment explorer ? » présente les six actions du parcours apprenant ;
3. « En complément » distingue les aides à la lecture des sept tamis et rappelle qu’elles restent masquées jusqu’à leur activation.

Le message final invite à croiser les indices et à les vérifier dans le contexte. La présentation réutilise le bleu, l’orange, les arrondis, les pictogrammes et la typographie de l’interface apprenante. Le dialogue possède une hauteur maximale liée à la fenêtre, un défilement interne et un pied de dialogue fixe afin de garder l’action « Fermer » accessible.

## Comportements réalisés

- ouverture depuis le bouton « Aide », y compris sans activité préparée ;
- maintien de l’activité sur la même page et visible derrière le layer ;
- fermeture par la croix, le bouton « Fermer », la touche `Échap` ou le fond du layer ;
- absence de fermeture lors d’un clic dans le dialogue ;
- retour du focus au bouton « Aide » après chaque fermeture ;
- focus initial placé sur la croix ;
- tabulation et tabulation inverse contenues dans le dialogue ;
- blocage du défilement de la page pendant l’ouverture et restauration exacte de son état précédent à la fermeture ;
- synchronisation de `aria-expanded` et `aria-hidden` ;
- sémantique `role="dialog"`, `aria-modal="true"` et titre lié par `aria-labelledby`.

Le contrôleur du guide est volontairement isolé : il ne référence ni `analysisPackage`, ni `explorationState`, ni le stockage de session ou local. Il ne peut donc pas réinitialiser ou altérer l’état apprenant.

## Fichiers concernés

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/css/seven-sieves-roles-0.1.css` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-student-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-help-dialog-v0.js` — nouveau contrôleur local sans dépendance ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-student-help-dialog.test.js` — nouveaux tests ciblés ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-analysis-lifecycle.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-role-separation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js` ;
- `reports/222_seven_sieves_contextual_learner_guide_report.md`.

L’interface enseignante, l’API, les contrats, les seeds et les données ne sont pas modifiés.

## Tests et contrôles

Les tests ciblés vérifient :

- le contenu, la structure accessible et les états ARIA ;
- l’ouverture réelle par le bouton ;
- les fermetures par croix, bouton, `Échap` et clic extérieur ;
- l’absence de fermeture par clic intérieur ;
- le retour du focus ;
- le piège de focus avec `Tab` et `Maj + Tab` ;
- le blocage puis la restauration du défilement ;
- la conservation d’un état apprenant représentatif ;
- l’absence totale d’accès du contrôleur à l’activité, à l’exploration ou au stockage ;
- la disparition de l’accordéon et de l’ancre historiques ;
- la présence du guide même dans l’état sans activité ;
- l’exposition HTTP du nouveau script.

Résultats :

- contrôle syntaxique des deux scripts apprenants : réussi ;
- tests ciblés : 33/33 réussis ;
- suite complète : 271/271 réussis ;
- page apprenante servie avec statut 200, version `0.1.5` et dialogue présent ;
- `git diff --check` : réussi ;
- aucun appel OpenAI effectué.

## Versions finales

- Seven Sieves apprenant : `0.1.4` → `0.1.5` ;
- Seven Sieves enseignant : inchangé `0.1.3` ;
- Dico-IC Admin : inchangé `0.1.8` ;
- API : inchangée `0.1`.

L’incrément est limité au composant apprenant modifié et respecte le baby step autorisé.

## Intégrité MariaDB

Le contrôle final en lecture seule retrouve exactement :

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

Les huit empreintes sont identiques au constat de début. L’auto-incrément `connector_help` reste 32 et l’empreinte des douze aides historiques reste `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846`.

Aucune écriture MariaDB, migration ou modification de seed n’a été effectuée.

## Services et validation visuelle

Le serveur Dico et MariaDB étaient déjà actifs. Ils n’ont été ni arrêtés ni redémarrés ; le serveur a seulement été interrogé en lecture pour contrôler la page apprenante. Les services non concernés ont été préservés.

La tentative de recette avec le navigateur intégré a échoué avant l’ouverture de la page en raison de l’erreur interne connue : `Trusted RPC dependency must resolve within a configured trusted code path`. Aucun contournement de cette infrastructure n’a été tenté.

Recette humaine à effectuer à `1440 × 900` puis `1366 × 768` :

1. ouvrir le guide sans activité préparée et vérifier que les trois blocs et les deux actions de fermeture restent accessibles ;
2. préparer une activité, choisir un tamis différent du premier, sélectionner et qualifier plusieurs mots, puis éventuellement afficher les aides à la lecture ;
3. ouvrir le guide et confirmer que l’activité reste visible, que la page arrière ne défile plus et que le dialogue reste lisible sans débordement horizontal ;
4. parcourir les éléments avec `Tab` et `Maj + Tab`, puis tester successivement la croix, « Fermer », `Échap` et le fond du layer ;
5. vérifier après chaque fermeture le retour du focus et la conservation exacte du tamis, de l’inspection, de la sélection, des statuts et des aides à la lecture ;
6. confirmer l’absence de mojibake, d’erreur console et d’ancien accordéon sous le texte.

Cette recette reste une validation humaine à réaliser par David ; les tests automatisés ne s’y substituent pas.

## Limites et suite

- La validation visuelle automatisée n’a pas pu être produite en raison du blocage interne du navigateur intégré.
- Aucun commit, push ou déploiement n’a été effectué.

## Message de commit proposé

```text
feat(seven-sieves): ajouter le guide contextuel apprenant (mission 222)
```
