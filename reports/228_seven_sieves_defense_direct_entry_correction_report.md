# Mission 227b — Correction de l’accès direct Seven Sieves

Date : 29 août 2026  
Composant : `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves`  
Version apprenante obtenue : `0.1.6` (depuis `0.1.5`)  
Version enseignant préservée : `0.1.3`  
Contrat de session préservé : `0.1`

## URL validée

<http://127.0.0.1:3000/prototypes/01-seven-sieves/index-student-0.1.html?soutenance=1>

Cette URL charge le paquet gelé directement depuis la page apprenante. Elle ne passe par aucune page bootstrap et ne change pas d’URL.

## Cause de l’échec Mission 227

La recette initiale avait utilisé un onglet déjà initialisé. Elle prouvait que le paquet et la vue apprenante étaient compatibles, mais pas que la chaîne intermédiaire restait fiable depuis un nouvel onglet vierge dans les conditions humaines de soutenance.

La recette humaine de David a révélé le défaut : après `location.replace`, la vue apprenante ne retrouvait pas l’activité et affichait l’état vide. Ce résultat humain invalide la conclusion du premier rapport, désormais marqué explicitement comme tel.

## Correction

La page intermédiaire `index-soutenance-0.1.html` a été retirée.

La page apprenante charge désormais `seven-sieves-soutenance-v0.js`, qui reste inactif par défaut. Le comportement se sépare explicitement :

- sans `soutenance=1`, le code historique lit immédiatement `sessionStorage` et conserve strictement son état vide ou son activité enseignante ;
- avec `soutenance=1`, la même page efface l’éventuel paquet de l’onglet, charge sans cache `soutenance-analysis-v0.json`, reconstruit et valide l’activité avec `SevenSievesSession.createActivity`, l’écrit avec `writeActivity`, puis appelle directement le rendu apprenant existant ;
- en cas d’échec, aucun paquet antérieur n’est réutilisé et un message lisible reste affiché.

Aucun `localStorage`, appel à `POST /analysis`, changement de route enseignant ou nouveau moteur apprenant n’a été introduit.

## Paquet réutilisé

Le paquet réel gelé par la Mission 227 est conservé sans nouvelle analyse :

- texte actuel commençant par `Durante el día, los estudiantes observan…` ;
- espagnol source, français médiation, italien et portugais en comparaison ;
- 50 tokens ;
- 39 enrichissements ;
- 7 tamis ;
- 3 avertissements ;
- 1 aide à la lecture.

## Fichiers concernés

Créés :

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-soutenance-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/mock/soutenance-analysis-v0.json` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-soutenance-entry.test.js` ;
- `reports/227_seven_sieves_defense_direct_entry_report.md` ;
- `reports/228_seven_sieves_defense_direct_entry_correction_report.md`.

Modifiés :

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-student-v0.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-analysis-lifecycle.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-role-separation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-student-help-dialog.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`.

Retiré avant commit :

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-soutenance-0.1.html`.

La présentation `Soutenance_M2`, la page enseignant, les données MariaDB et le contrat partagé de session sont inchangés.

## Tests automatisés

Contrôles ciblés :

```text
node --check ../prototypes/01-seven-sieves/js/seven-sieves-soutenance-v0.js
node --check ../prototypes/01-seven-sieves/js/seven-sieves-student-v0.js
node --test test/seven-sieves-soutenance-entry.test.js test/seven-sieves-role-separation.test.js test/static-files.test.js
```

Résultat : 19 tests réussis sur 19, 0 échec.

Les contrôles propres au mode soutenance couvrent deux stockages de session entièrement indépendants, le chargement sans cache, la validation du paquet, le refus de réutiliser un paquet périmé, le mode absent ou désactivé et l’absence de branchement sur la page enseignant.

Suite complète :

```text
npm.cmd test
```

Résultat final : 275 tests réussis sur 275, 0 échec. Une première exécution avait correctement signalé deux assertions historiques encore fixées à la version apprenante `0.1.5` ; elles ont été mises à jour vers le baby step `0.1.6` avant la relance complète réussie.

## Recette obligatoire reproduite

Le scénario demandé a été exécuté dans le navigateur intégré sur le serveur réel `127.0.0.1:3000` :

1. aucun onglet Seven Sieves n’était ouvert ;
2. création d’un onglet neuf, URL initiale vérifiée : `about:blank` ;
3. saisie de la seule URL de soutenance ;
4. affichage confirmé de « Explorer avec les sept tamis », contexte ES → FR et IT/PT, espace apprenant visible, état vide masqué, aide à la lecture présente et tamis actif `1` ;
5. fermeture de l’onglet ; le nombre d’onglets Seven Sieves est revenu à zéro ;
6. création d’un second onglet neuf, URL initiale vérifiée : `about:blank` ;
7. saisie de la même URL ;
8. mêmes contrôles tous réussis, avec activité à nouveau visible directement au tamis `1`.

Dans les deux cas, l’URL est restée `index-student-0.1.html?soutenance=1` et la console n’a contenu ni erreur ni avertissement.

Une troisième recette sans paramètre, dans un nouvel onglet vierge, a affiché l’état normal « Aucune activité n’a encore été préparée. » avec l’espace apprenant masqué. Le fonctionnement normal de `sessionStorage` est donc préservé.

Cette recette Codex reproduit exactement le protocole demandé ; la validation humaine finale reste celle de David sur le navigateur et le dispositif de soutenance.

## Version et services

La page apprenante passe de `0.1.5` à `0.1.6`, baby step justifié par l’ajout opt-in du mode de soutenance. Sans paramètre, son fonctionnement reste inchangé. Le serveur déjà actif a été réutilisé ; aucun service n’a été arrêté ou redémarré.

## Commit proposé

```text
feat(seven-sieves): fiabiliser l’accès direct de soutenance (missions 227 et 227b)
```

Aucun commit, push ou déploiement n’a été effectué.
