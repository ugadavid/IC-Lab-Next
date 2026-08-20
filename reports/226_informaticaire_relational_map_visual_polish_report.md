# Mission 226 — Finition visuelle et ergonomique de la Carte relationnelle d’Informaticaire

Date : 20 août 2026  
Composant : `prototypes/07-informaticaire`  
Version obtenue : `0.7.1` (baby step depuis `0.7.0`)  
Fondation vérifiée : Mission 225 committée dans `8f177d3`

## Périmètre réalisé

La mission a été limitée à la finition visuelle et ergonomique de la Carte relationnelle introduite par la Mission 225. Les parcours, les données et les contrats documentaires existants n’ont pas été étendus.

- La disposition circulaire uniforme a été remplacée par une disposition organique déterministe : ordre stable dérivé des identifiants, angles et rayons légèrement modulés, limites spatiales explicites et absence de chevauchement sur le voisinage réel le plus dense.
- Les nœuds sont devenus des cartes documentaires compactes avec monogramme, intitulé, couleur de famille et indicateur de statut. La fiche centrale reste visuellement dominante.
- Les traits ont été affinés sans modifier les libellés ni leur orientation.
- Une identité commune `data-relation-neighbor` relie chaque nœud, trait et carte du panneau. Le survol et le focus clavier d’une représentation accentuent les deux autres et atténuent le reste.
- Le panneau droit a été resserré et réorganisé en lecture éditoriale. Il grandit avec la page et ne possède plus de défilement interne.
- Le sélecteur porte désormais le libellé exact « Explorer le voisinage de… ».
- Les animations se limitent à une apparition brève des nœuds après recentrage. Elles sont neutralisées par `prefers-reduced-motion: reduce`.
- Les actions de recentrage et d’ouverture de la fiche complète restent disponibles à la souris et au clavier.

## Fichiers concernés

- `prototypes/07-informaticaire/script.js`
- `prototypes/07-informaticaire/styles.css`
- `prototypes/07-informaticaire/index.html`
- `prototypes/07-informaticaire/README.md`
- `prototypes/07-informaticaire/informaticaire-immediate-search.test.js`
- `prototypes/07-informaticaire/informaticaire-relational-navigation.test.js`
- `reports/226_informaticaire_relational_map_visual_polish_report.md`

## Préservation des données et des comportements

Les fichiers `data.js` et `data_original.js` n’ont pas été modifiés. Leurs empreintes SHA-256 observées au début et à la fin restent respectivement :

- `data.js` : `34E1FCC7C6A645B3512083D083F2594EE5610C37B1313D6E6D459FCCCF5A5626` ;
- `data_original.js` : `9126EF227B07448A55173E83F371CDEBA2EA361CC050DB39A1EF3325D20E10B8`.

Les volumes réels sont préservés :

- 110 fiches ;
- 414 références `relatedItems` ;
- 86 relations typées utilisées par la Carte.

Les libellés, sens, notes et cibles des 86 relations restent issus exclusivement du corpus. Les recherches, filtres, exports, navigation en cinq familles, fiche complète, contribution, visite et autres fonctions préexistantes n’ont pas été modifiés fonctionnellement.

## Contrôles automatisés

Commande exécutée depuis `prototypes/07-informaticaire` :

```text
node --test informaticaire-immediate-search.test.js informaticaire-relational-navigation.test.js
```

Résultat : 13 tests réussis, 0 échec.

Les contrôles ciblés ajoutés couvrent :

- le déterminisme, les limites et l’espacement de la disposition sur Miriadi, voisinage réel le plus dense (8 voisins et 11 relations) ;
- le monogramme `CD` de Christian Degache ;
- la correspondance nœud–trait–carte pour le pointeur et le focus clavier ;
- le recentrage par `Entrée` ou `Espace` ;
- l’absence de défilement interne du panneau ;
- la neutralisation des animations en préférence de mouvement réduit ;
- la conservation des 86 relations réelles, des fonctions historiques et de la compatibilité statique locale.

`git diff --check` ne signale aucune erreur. Les avertissements affichés concernent uniquement la conversion future LF/CRLF de fichiers déjà suivis sous Windows.

## Recette visuelle et fonctionnelle Chromium

La recette a été effectuée sur le service local `http://127.0.0.1:8790/demos/informaticaire/`.

### 1440 × 900

- navigation humaine Accueil → Carte puis sélection de Christian Degache ;
- carte : `818,47 × 588 px`, entièrement visible ;
- panneau : `541,52 × 599,45 px`, entièrement visible ;
- les quatre relations réelles de Christian Degache sont toutes visibles dans la fenêtre ;
- panneau : hauteur visible et hauteur de contenu identiques (`593 px`), `overflow-y: visible` ;
- aucun débordement horizontal ;
- disposition organique, nœuds lisibles et fiche centrale distinguée ;
- absence d’erreur ou d’avertissement dans la console.

### 1366 × 768

- navigation Accueil → Carte puis sélection de Christian Degache ;
- aucun débordement horizontal ;
- quatre relations rendues et panneau sans défilement interne (`592 px` de hauteur visible et de contenu) ;
- les contenus supplémentaires restent accessibles par le défilement normal de la page, sans zone imbriquée ni coupe horizontale.

### Interactions vérifiées

- focus sur le nœud ALPAGA : un nœud, un trait et une carte associés deviennent actifs ;
- focus sur la carte Moodle : le nœud et le trait Moodle sont synchronisés ;
- `Entrée` sur ALPAGA recentre la Carte sur ALPAGA ;
- l’action « Recentrer » de Moodle recentre la Carte sur Moodle ;
- « Consulter la fiche complète » depuis Christian Degache ouvre bien la fiche détaillée ;
- les changements de centre conservent les relations réelles et réinitialisent proprement l’accentuation précédente.

Cette recette constitue un contrôle Codex, pas la validation humaine de David.

## Services

Le serveur IC-Lab-Next était déjà actif et répondait en HTTP 200. Aucun service n’a été arrêté, redémarré ou laissé supplémentaire par la mission.

## Éléments non vérifiés et limites

- Aucun test manuel n’a été réalisé avec un lecteur d’écran matériel ; les rôles, intitulés accessibles, focus et commandes clavier ont été contrôlés dans Chromium et dans les tests ciblés.
- La validation esthétique finale reste une décision humaine de David.
- La carte représente volontairement le voisinage direct réel ; la mission n’ajoute ni regroupement, ni relation, ni nouveau moteur de graphe.

## Versionnement

Le prototype passe de `0.7.0` à `0.7.1`. Cet incrément du plus petit niveau correspond à une finition visuelle et ergonomique locale sans changement de corpus ni d’architecture.

## Proposition de message de commit

```text
style(informaticaire): polir la carte relationnelle (mission 226)
```

Aucun commit, push ou déploiement n’a été effectué.
