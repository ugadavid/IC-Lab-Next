# Prototype 05 — tests de visibilité des couches

Date : **16 juillet 2026**  
Version applicative obtenue : **inchangée (`0.1.7`)**

## Périmètre

La mission sécurise uniquement le comportement de visibilité des couches dans
la vue étudiante de Proto05. Elle n’apporte aucune modification à la timeline,
à l’interface, au modèle métier, au launcher, au proxy HLS ou à
`data/activities.json`.

L’infrastructure Proto05 ne contenait ni framework ni script de test. Le
mécanisme minimal retenu réutilise le testeur natif de Node.js (`node:test`) et
un navigateur Chromium déjà installé, sans nouvelle dépendance. Un serveur HTTP
éphémère fournit le moteur étudiant courant, la timeline partagée et un fixture
isolé. Le média est neutralisé uniquement dans la copie HTML servie en mémoire
afin que le test reste local et indépendant du HLS.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/package.json` : ajout du script
  `npm test`, sans changement de version ;
- `prototypes/05-augmented-ic-video-01/server/test/layer-visibility.test.js` :
  scénario d’intégration DOM local ;
- `prototypes/05-augmented-ic-video-01/server/test/fixtures/layer-visibility.activity.json` :
  activité de test non canonique ;
- `reports/031_prototype_05_layer_visibility_tests_report.md` : présent rapport.

## Tests ajoutés

Le scénario Chromium exerce le vrai moteur `index-0.0.8.html`, les événements
des cases étudiantes et `shared/ic-timeline.js` avec trois couches dédiées : une
couche proposée, une couche témoin et une couche masquée.

Les sous-tests couvrent :

1. l’apparition côté étudiant d’une couche proposée par l’enseignant, de son
   segment et de son phénomène ;
2. l’absence d’une couche masquée dans la liste étudiante, la transcription et
   les phénomènes de la timeline ;
3. le masquage local des phénomènes de la seule couche désactivée, tandis que la
   couche témoin reste rendue ;
4. l’absence de mutation de `layerConfiguration` et l’absence de requête autre
   que `GET` pendant les toggles étudiants ;
5. la restauration du phénomène et du segment après réactivation ;
6. l’identité SHA-256 de la donnée historique canonique avant et après le
   scénario.

## Contrôles exécutés

- `npm test` hors sandbox applicatif : **OK**, 7 tests TAP réussis, 0 échec ;
- `npm run check` : **OK**, syntaxe de `server.js` valide ;
- `node --check test/layer-visibility.test.js` : **OK** ;
- `git diff --check` : **OK** ;
- SHA-256 de `data/activities.json` avant et après les tests :
  `3DB18608A7A94021F4C7B5DFE3E306BC31517A0556A7B6094BF6FA60851776BE`,
  inchangé ;
- volumes historiques observés après les tests : 11 segments, 22 intervalles
  linguistiques, 26 phénomènes, 4 langues, 5 locuteurs, 11 annotations et
  7 couches, inchangés par le scénario ;
- version du package Proto05 : `0.1.7`, inchangée.

Le lancement Chromium a dû être exécuté hors du sandbox Codex : le sandbox
Windows interdit le processus GPU protégé de Chrome/Edge. L’exécution autorisée
hors sandbox a réussi. Le test conserve un média DOM inerte et ne contacte ni le
proxy HLS ni une source distante.

## Éléments non vérifiés

- lecture du flux HLS et comportement du proxy ;
- sauvegarde depuis l’atelier guidé et persistance serveur de la configuration
  enseignant ;
- erreurs de sauvegarde, délais dépassés ou panne réseau ;
- rendu visuel par capture et recette interactive humaine ;
- autres fonctions de Proto05 sans rapport direct avec la visibilité des
  couches.

Aucune interface n’ayant été modifiée, aucune validation visuelle de
non-régression n’était requise pour cette mission. Les contrôles automatisés ne
constituent pas une validation humaine de David.

## Limites restantes

- le test nécessite Chrome, Edge ou Chromium ; un chemin personnalisé peut être
  fourni avec `CHROME_PATH` ou `EDGE_PATH` ;
- la proposition ou le masquage enseignant est représenté par le contrat réel
  `layerConfiguration.learnerVisibleLayerIds` dans un fixture ; l’interaction de
  sauvegarde de l’atelier enseignant relève des futurs tests de sauvegarde ;
- le test vérifie les marqueurs de phénomènes de la timeline, pas la lecture ou
  la synchronisation vidéo ;
- la suite prioritaire possible est la couverture séparée des sauvegardes en
  succès, HTTP non-2xx, JSON invalide, panne réseau et délai dépassé, toujours
  sur une copie temporaire.

## Commit proposé

`test(prototype-05): cover student layer visibility`
