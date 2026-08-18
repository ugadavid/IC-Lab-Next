# Mission 197 — Taille de lot IA réglable

Date : 2026-08-18  
Composant : `prototypes/08-dico-seven-sieves`  
Version de l’assistant texte obtenue : `0.1.7`

## Origine de la mission

La validation humaine réelle de la Mission 196 par David a confirmé le fonctionnement des lots manuels, puis révélé une limite opérationnelle du fournisseur : un lot valide de 100 formes peut dépasser le délai disponible et produire le message `Génération impossible : La génération OpenAI a dépassé le délai autorisé.`

La Mission 197 ne modifie ni le fournisseur ni le délai serveur. Elle introduit une décision ergonomique explicite : David choisit la taille du prochain lot afin d’adapter chaque appel, tout en conservant l’état manuel en mémoire livré par la Mission 196.

Les rapports 195 et 196 et leurs changements non commités ont été préservés. Aucun retour au comportement bloquant initial n’a été effectué.

## Fichiers concernés

Modifiés pour la Mission 197 :

- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-batches-0.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-0.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html` ;
- `prototypes/08-dico-seven-sieves/admin/css/admin-ai-text-0.1.css` ;
- `prototypes/08-dico-seven-sieves/Node/test/admin-ai-text-batches.test.js`.

Créé :

- `reports/197_dico_ic_ai_text_configurable_batch_size_report.md`.

Le test de limite HTTP ajouté pendant la Mission 196 reste présent dans `Node/test/admin-ai-inflected-form.test.js` sans nouvelle modification fonctionnelle serveur. Les rapports 195 et 196 restent inchangés.

## Liste de tailles

L’interface affiche, à proximité immédiate du bouton, une liste clairement libellée `Taille du prochain lot` avec les valeurs :

- 10 formes ;
- 20 formes ;
- 30 formes ;
- 50 formes ;
- 100 formes.

La valeur par défaut est 30 formes. Une nouvelle analyse ou un changement de langue source réinitialise la taille à 30, en même temps que la progression, les propositions et les sélections de l’analyse précédente.

Le terme public employé est toujours `formes`, jamais `mots` pour ce réglage.

## Validation frontend de la taille

Le module définit trois contrats distincts :

- taille par défaut : 30 ;
- valeurs autorisées : `10, 20, 30, 50, 100` ;
- plafond absolu frontend : 100.

La taille sélectionnée est validée lors de son changement et de nouveau immédiatement avant chaque génération. Une valeur falsifiée, vide, non entière, non proposée ou supérieure à 100 :

- déclenche un message explicite ;
- restaure visuellement la dernière taille valide ;
- ne modifie pas la progression ;
- ne déclenche aucune requête.

Le constructeur de payload garde son propre refus de tout tableau supérieur à 100. Ces contrôles sont indépendants du garde-fou serveur.

## Progression réglable

`nextBatch()` conserve l’ordre initial et choisit jusqu’au nombre de formes actuellement configuré parmi les identités non examinées.

Changer la taille entre deux lots modifie uniquement le prochain découpage. Cela ne réinitialise ni :

- les identités examinées ;
- les propositions reçues ;
- les corrections humaines ;
- les sélections ;
- le reliquat ;
- l’ordre des formes.

`completeBatch()` avance toujours du nombre exact de formes réellement envoyées avec succès, indépendamment d’un changement de taille ultérieur. La fusion par identité stable de la Mission 196 est conservée et empêche les doublons.

Pour 164 formes avec la valeur par défaut, la séquence validée est :

`30 + 30 + 30 + 30 + 30 + 14`

Le bouton distingue maintenant correctement un lot intermédiaire d’un reliquat final :

- tant que le reliquat dépasse la taille : `Examiner le prochain lot — 30 formes` ;
- lorsque le reliquat est inférieur ou égal : `Examiner les 14 formes restantes`.

## Gestion du timeout

L’erreur serveur `OPENAI_TIMEOUT` ou un statut HTTP 504 produit désormais le message :

> La génération a dépassé le délai autorisé. Réduisez la taille du lot puis réessayez.

Le traitement d’erreur intervient avant `completeBatch()`. Par conséquent :

- aucune forme du lot échoué n’est marquée examinée ;
- le compteur et le reliquat restent inchangés ;
- les propositions précédentes restent présentes ;
- les corrections et sélections humaines restent présentes ;
- le sélecteur redevient disponible ;
- une taille plus petite peut être choisie ;
- la reprise commence exactement à la même position ;
- aucune nouvelle tentative automatique n’est effectuée.

Le délai de 90 secondes et le fournisseur OpenAI n’ont pas été modifiés.

## Garde-fou serveur

La limite serveur reste strictement fixée à 100. Aucun fichier serveur de production n’a été modifié par cette mission.

Le test HTTP conservé envoie 101 formes forgées à une instance éphémère de `createApp` et confirme toujours :

- HTTP 400 ;
- `INFLECTED_ITEM_LIMIT_EXCEEDED` ;
- `La génération est limitée à 100 formes.` ;
- aucun appel IA.

## Scénarios automatisés

Les tests ciblés couvrent :

- les valeurs 10, 20, 30, 50 et 100 ;
- la valeur par défaut 30 ;
- les valeurs invalides `0`, `31`, `101`, `999`, texte et chaîne vide ;
- la conservation de la dernière taille valide après falsification ;
- le refus du constructeur de payload au-delà de 100 ;
- un reliquat inférieur à la taille choisie ;
- 164 avec 30 : `30+30+30+30+30+14` ;
- changement `30 → 10` avec progression exacte de 40 ;
- timeout simulé à 100 puis reprise à 30 depuis la même position ;
- échecs sans progression ;
- conservation des propositions, corrections et sélections ;
- absence de doublon ;
- achèvement complet ;
- réinitialisation d’une nouvelle analyse à 30 ;
- requête HTTP forgée de 101 toujours refusée.

Résultats finaux :

- contrôles `node --check` frontend et serveur : réussis ;
- tests ciblés lots + garde-fou : 32/32 réussis ;
- suite complète `npm.cmd test` : 141/141 réussis.

Aucun appel OpenAI réel ou payant n’a été effectué par Codex. Cette validation reste à la charge de David.

## Recette fonctionnelle déterministe

Une fixture HTTP jetable, sans accès MariaDB, a exposé 164 formes et simulé un timeout lors de la première tentative de 10.

Séquence observée :

1. analyse : taille par défaut 30 ;
2. premier lot de 30 réussi : `30 examinées · 134 restantes` ;
3. correction manuelle du premier lemme et désélection de sa proposition ;
4. changement de taille à 10 ;
5. tentative de 10 en timeout : progression toujours à 30, 30 propositions toujours présentes, correction et désélection conservées ;
6. relance de 10 réussie : progression à 40 ;
7. changement à 30 ;
8. lots réussis de 30 jusqu’à `160 examinées · 4 restantes` ;
9. bouton `Examiner les 4 formes restantes` ;
10. dernier lot de 4 réussi : 164 formes examinées, 164 propositions fusionnées, bouton désactivé.

Les payloads effectivement observés sont :

```json
[30, 10, 10, 30, 30, 30, 30, 4]
```

Le premier `10` est la tentative en timeout ; le second est la reprise réussie depuis la même position. Le compteur d’écritures persistantes de la fixture est resté à 0.

## Recette visuelle

Contrôle dans le navigateur Chromium intégré :

### 1440 × 900

- sélecteur lisible et placé immédiatement à gauche du bouton ;
- valeur initiale `30 formes` ;
- libellé initial `Examiner le prochain lot — 30 formes` ;
- après passage à 10 et timeout : message utile entièrement visible ;
- progression inchangée `30 examinées · 134 restantes` ;
- bouton corrigé `Examiner le prochain lot — 10 formes` ;
- correction du premier lemme et désélection toujours visibles ;
- aucun débordement des commandes.

### 1366 × 768

- sélecteur et bouton restent alignés et lisibles ;
- avec une taille de 30 et un reliquat de 4 : `Examiner les 4 formes restantes` ;
- tableau et contrôles restent utilisables ;
- aucun débordement nouveau ;
- le défilement horizontal historique du tableau est conservé.

Après achèvement : 164 lignes, bouton final désactivé, aucune erreur ni alerte console.

Les captures ont été inspectées pendant la recette et n’ont pas été ajoutées au dépôt. La recette Codex ne remplace pas la validation humaine avec le fournisseur réel.

## MariaDB et périmètre préservé

Le contrôle final en lecture seule `node scripts/manage-referenced-romance-languages.js --check` retourne `applied` :

- 12 langues inchangées ;
- langues référencées toujours inactives et sans dépendance ;
- volumes inchangés : `150 / 597 / 16 / 12 / 70 / 1 / 8`.

Aucune migration, écriture, création de mapping, modification de langue ou réinitialisation n’a été exécutée.

Catalogue, atelier manuel, Seven Sieves, `INFORMATION_DATA`, Compose, launchers, portable et `AGENTS.md` sont inchangés. `NUIT` n’a pas été ajouté.

## Processus et artefacts temporaires

- le serveur Dico préexistant sur le port 3000 a été préservé et répond encore en HTTP 200 ;
- les deux processus successifs de fixture sur le port 3100, PID `43964` puis `43944`, ont été arrêtés ;
- le port 3100 ne répond plus ;
- l’onglet de recette a été fermé ;
- la surcharge de viewport a été réinitialisée ;
- `Node/test/mission197-visual-fixture.cjs` a été supprimé ;
- aucune fixture ni aucun processus temporaire ne subsiste.

## Versions

- assistant texte : `0.1.7` ;
- administration principale : `0.1.5`, inchangée ;
- API : `0.1`, inchangée ;
- package Node : `1.0.0`, inchangé.

Le passage `0.1.6 → 0.1.7` est un baby step justifié par l’ajout du réglage ergonomique de taille et du traitement utile du timeout.

## Validation restante

La validation humaine de David a établi le timeout réel ayant motivé cette mission. David doit encore vérifier qu’une taille plus petite, notamment 30 ou 10, produit une réponse satisfaisante avec son fournisseur OpenAI réel et son environnement configuré.

## Commit global proposé

Aucun commit, push ou déploiement n’a été effectué.

Message proposé pour intégrer le diagnostic 195 et les corrections 196–197 :

`fix(dico): fiabiliser l’examen IA par lots réglables`

