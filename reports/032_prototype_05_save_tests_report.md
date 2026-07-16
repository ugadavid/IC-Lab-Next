# Prototype 05 — tests de sauvegarde enseignant

Date : **16 juillet 2026**  
Version applicative obtenue : **inchangée (`0.1.7`)**

## Périmètre

La mission couvre la sauvegarde enseignant de Proto05 sans modifier le
comportement applicatif, l’interface, la timeline, le HLS, le launcher, le
modèle métier ou les données canoniques.

L’infrastructure introduite par le rapport 031 est réutilisée : `node:test`, un
serveur HTTP local et Chromium déjà installé. Les fonctions communes de
lancement Chromium et de calcul SHA-256 ont été déplacées dans un helper de
test. Aucune dépendance n’a été installée.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/test/helpers/chromium.js` :
  utilitaires Chromium et SHA-256 communs aux tests ;
- `prototypes/05-augmented-ic-video-01/server/test/layer-visibility.test.js` :
  réutilisation du helper commun, sans changement de couverture ;
- `prototypes/05-augmented-ic-video-01/server/test/teacher-save.test.js` :
  tests API et Chromium de la sauvegarde enseignant ;
- `reports/032_prototype_05_save_tests_report.md` : présent rapport.

Aucun fichier applicatif ou canonique n’a été modifié. Le script `npm test`
existant découvre automatiquement le nouveau fichier `*.test.js`. La version
du package reste `0.1.7`.

## Tests automatisés

### API auteur réelle sur copie temporaire

Le test copie le `server.js` courant dans un répertoire temporaire, construit un
magasin `activities.json` à partir du fixture existant et démarre cette copie sur
un port éphémère. Le serveur canonique et `data/activities.json` ne sont jamais
utilisés comme cible d’écriture.

Les contrôles couvrent :

1. `PUT /api/proto05/activities/:id/authoring` valide avec réponse `200` ;
2. persistance du titre modifié dans la copie temporaire ;
3. création de la sauvegarde `.bak`, contenant l’état antérieur ;
4. corps JSON invalide refusé avec `400`, sans nouvelle écriture ;
5. activité inconnue refusée avec `404` ;
6. liste exacte des trois requêtes `PUT` émises par ce scénario ;
7. identité SHA-256 de la donnée canonique avant et après le test.

### Contrôles statiques et suite complète

- `node --check test/helpers/chromium.js` : **OK** ;
- `node --check test/layer-visibility.test.js` : **OK** ;
- `node --check test/teacher-save.test.js` : **OK** ;
- `npm run check` : **OK** ;
- `git diff --check` : **OK** ;
- `npm test` : **OK**, 21 tests réussis, 0 échec.

La suite complète inclut les tests de visibilité du rapport 031 et les nouveaux
tests de sauvegarde.

## Vérifications Chromium automatisées

Chromium charge le fichier applicatif courant `teacher-guided.html` depuis un
serveur de test. Le média est remplacé uniquement dans la copie HTML en mémoire
pour éviter le HLS. Les réponses de sauvegarde sont contrôlées par le serveur de
test.

Les scénarios vérifiés sont :

- succès : message de succès, bouton réactivé et fermeture automatique de la
  modale ;
- HTTP `503` : message serveur affiché, état d’erreur, bouton réactivé, bouton
  **Fermer** présent et fonctionnel ;
- réponse JSON invalide : erreur affichée, bouton réactivé et modale refermable ;
- réseau indisponible : rejet de `fetch`, erreur affichée, bouton réactivé et
  modale refermable ;
- délai dépassé : message `Délai de sauvegarde dépassé.`, bouton réactivé et
  modale refermable ;
- absence de requête d’écriture inattendue : seuls les trois `PUT` réellement
  transportés pour succès, HTTP non-2xx et JSON invalide sont reçus. Les
  tentatives réseau indisponible et délai sont injectées avant transport et
  journalisées par des requêtes `GET` de test.

Le délai applicatif de `10 000 ms` est vérifié dans la source. Il est ramené à
`100 ms` uniquement dans la copie HTML servie par le test, afin d’exercer la
branche de timeout sans ralentir la suite. La panne réseau est également
injectée avant transport : une destruction réelle de socket provoque des
reprises automatiques de `PUT` par Chromium, ce qui empêcherait de distinguer
les retries du navigateur d’une réémission applicative.

Chromium a été exécuté hors du sandbox Codex, le sandbox Windows empêchant son
processus graphique protégé. Il s’agit d’une validation fonctionnelle DOM
automatisée, sans capture visuelle et sans validation humaine.

## Préservation des données historiques

Le SHA-256 canonique observé avant et après les tests est resté :

`3DB18608A7A94021F4C7B5DFE3E306BC31517A0556A7B6094BF6FA60851776BE`

Les volumes observés après les tests restent : 1 activité, 11 segments,
22 intervalles linguistiques, 26 phénomènes, 4 langues, 5 locuteurs,
11 annotations et 7 couches. Le champ `updatedAt` canonique reste
`2026-07-13T18:23:47.041Z`.

## Bugs applicatifs découverts

Aucun bug applicatif n’a été établi pendant cette mission. Les ajustements
effectués après les premiers essais concernaient uniquement les mécanismes de
simulation du timeout et de la panne réseau dans Chromium ; aucun code Proto05
n’a été corrigé ou modifié.

## Éléments non testés

- écriture dans `data/activities.json` canonique ou recette sur le serveur
  Proto05 de démonstration ;
- panne disque, refus de permission ou échec de renommage atomique ;
- concurrence de plusieurs sauvegardes enseignant ;
- payload trop volumineux et toutes les variantes de validation métier ;
- expiration mesurée pendant 10 secondes réelles ;
- HLS, timeline, launcher et autres fonctions hors sauvegarde ;
- focus clavier, lecteur d’écran et rendu responsive de la modale ;
- validation fonctionnelle humaine de David.

## Limites restantes

- les tests DOM nécessitent Chrome, Edge ou Chromium ; `CHROME_PATH` ou
  `EDGE_PATH` permettent de fournir un chemin personnalisé ;
- le scénario de succès API valide une modification de titre sur un fixture ;
  il ne cherche pas à couvrir exhaustivement chaque champ auteur ;
- les scénarios d’interface utilisent un serveur de réponses contrôlées ; le
  chemin de persistance réel est couvert séparément par le serveur copié ;
- les pannes réseau et timeout sont déterministes et injectées avant transport,
  elles ne simulent pas toutes les variantes possibles d’une coupure réelle.

## Commit proposé

`test(prototype-05): cover teacher save outcomes`
