# Note de validation documentaire — Informaticaire

Date : 9 septembre 2026. Version applicative observée : **0.7.1**, inchangée. Cette note restitue les contrôles de Codex ; elle ne constitue pas une validation éditoriale ou fonctionnelle humaine de David.

## Livrables

- `guide-utilisateur.md` et `guide-utilisateur.pdf` : guide commun de consultation, **5 pages**, avec sommaire, parcours Miriadi → Lectŭrĭo+ → corpus de contes, recherche, fiches, carte, liens externes et conservation des références.
- Quatre captures dans `images/` : `fiche-miriadi.png`, `recherche.png`, `carte-reperes.png`, `lien-externe.png`.
- Rapport : `reports/233_informaticaire_user_guide_report.md`.

Le guide ne documente ni l’administration ni l’édition du corpus. Il n’ajoute pas de compte, de procédure d’accès ou d’URL publique supposée. Les emplacements de livraison sont à compléter.

## Sources et périmètre d’observation

Instructions `AGENTS.md`, `PROJECTS_LAUNCH.md`, `docs/ARCHITECTURE.md`, puis `prototypes/07-informaticaire/README.md`, `index.html`, `script.js`, `styles.css` et `data.js`. Aucun AGENTS spécialisé supplémentaire trouvé dans le périmètre du prototype.

Le prototype actuel comporte 110 fiches et 86 relations typées. Le corpus statique appartient à Informaticaire ; les exports sont produits dans le navigateur. La lecture des données et des traitements actuels a servi à distinguer les fonctions réelles des intentions figurant dans certaines présentations historiques.

Service IC-Hub déjà disponible réutilisé : `http://127.0.0.1:8790/demos/informaticaire/`, conformément à `PROJECTS_LAUNCH.md`. Aucun lancement, nouveau serveur, nouveau lanceur, relancement ou arrêt de service. Aucun accès à Alpaga ou dev-lab.

## Parcours effectivement vérifiés

| Contrôle dans Chromium | Résultat observé |
| --- | --- |
| Recherche d’accueil « Miriadi » | Ouverture de Toutes les fiches ; 32 résultats, Miriadi en premier. |
| Fiche Miriadi | Lecture de la présentation, des usages, droits, accessibilité, liens, relations et traçabilité. |
| Relation interne dans la fenêtre de détail | Miriadi → Lectŭrĭo+ → Miriadi ; remplacement de la fiche dans la même fenêtre. Fermeture par le bouton Fermer la fiche. |
| Filtre de type | Miriadi + Plateformes : 5 résultats, dont Miriadi. Capture de cet état. |
| Filtre de public | Pour enseignants remplace Plateformes, conserve la requête et donne 31 résultats. |
| Filtre d’état | Miriadi + Fragile : Miriadi et Galapro. |
| Variante de recherche | EuRom5 retrouve notamment EuRom / EuRom Web. |
| Absence de résultat | DIPROLANG : aucune fiche trouvée, également avec Tous ; aucune création ou modification du corpus. |
| Tous et Réinitialiser | Tous conserve le texte saisi ; Réinitialiser efface la recherche et rétablit l’ensemble du corpus. |
| Carte depuis la bibliothèque | Voir dans la carte ouvre le voisinage de Miriadi ; 11 relations affichées. |
| Changement de centre | Choix de Lectŭrĭo+ dans la liste, clic sur son nœud, puis Recentrer vers Miriadi ; actualisation du centre et du panneau. Lectŭrĭo+ présente 4 relations. |
| Détail depuis la carte | Consulter la fiche complète ouvre la fiche du centre ; fermeture et retour à la consultation. |
| Vues secondaires | Consultation de Lectures guidées, À partager et À sauver / vérifier. |
| Export JSON | Commande lancée avec une recherche et un filtre actifs ; message `informaticaire_items_v0.7.0.json généré.` observé. |
| Rechargement de la bibliothèque | Après Miriadi + Fragile : adresse restant sur `#bibliotheque`, recherche vide, Tous actif, 110 fiches. |
| Rechargement de la carte | Après sélection de Lectŭrĭo+ : adresse restant sur `#carte`, centre revenu à Miriadi. |

Les parcours ont été consultés aux dimensions représentatives 1000 × 720 et 1280 × 720. Captures réelles en haute définition, recadrées sur les éléments utiles. La carte porte seulement trois pastilles numérotées ajoutées pour le repérage : aucun nœud, lien, texte ou disposition de l’interface n’a été redessiné. Les deux onglets ouverts pour cette mission ont été fermés.

## Liens externes : présence et destination

La fiche Miriadi contient notamment Site Miriadi, Ressources Miriadi et plusieurs liens issus du recensement Formarse en IC. La fiche Lectŭrĭo+ contient le corpus de contes et une page Erasmus+. La présence des liens et leurs adresses ont été lues dans l’interface ; leurs anciennes dates de vérification n’ont pas été actualisées dans le corpus.

**Destination réellement consultée le 9 septembre 2026** : clic sur **Corpus de contes Lectŭrĭo+** dans sa fiche, ouverture dans un nouvel onglet de `https://www.miriadi.net/ressources/corpus-contes`. La page intitulée **Corpus de contes** présente le corpus, sa structure et des entrées vers des contes. L’onglet Informaticaire est conservé. Aucun compte utilisé, aucune contribution ou inscription effectuée.

Les autres destinations du catalogue, les contes individuels et la page Erasmus+ n’ont pas été audités. Le formulaire de recherche externe limité à miriadi.net a été inspecté ; aucun résultat de moteur de recherche n’a été qualifié. Les règles de droits et d’accès des ressources externes ne font pas l’objet d’une validation juridique dans cette mission.

## Comportements établis par le code actuel

- `itemSearchText`, `matchesSearchText`, `searchRank` : recherche sur les titres, alias et de nombreux champs descriptifs et documentaires, accents/casse/ponctuation normalisés, rapprochement avec ou sans espaces ; recherche d’une séquence, pas combinaison générale de mots dispersés ni recherche sémantique. Classement favorisant titres et alias.
- `matchesFilter` et gestion des boutons : un filtre exclusif, combiné à la requête. Les sélections À partager et À sauver / vérifier utilisent leurs listes propres. Les filtres de type comparent le type exact ; les familles de couleur peuvent regrouper plusieurs types.
- `openDetail` et événements : une fiche liée dans la modale remplace le détail courant ; un bouton LIÉ À dans une carte cible la fiche dans la bibliothèque. La touche Échap ferme le détail. Aucun historique de fiches encodé dans l’adresse.
- `buildRelationNeighborhood` : carte des relations typées entrantes et sortantes autour du centre, indépendante des simples `relatedItems`. Plusieurs relations peuvent concerner un même voisin. Le nombre affiché ne compte pas des voisins uniques.
- `renderMapNode`, `organicNeighborPositions`, familles CSS : taille supérieure et contour du centre, couleurs documentaires ; placement stable calculé pour la présentation, sans signification de distance ou de rang scientifique. Correspondance de survol/focus entre graphe et panneau présente dans le code, sans essai distinct de toutes les modalités clavier ou de survol.
- `setViewHash`, `showAppView` et état initial : l’adresse conserve une vue, pas les critères, le détail ou le centre choisi ; changement de vue conservant l’état en mémoire, rechargement réinitialisant cet état. Aucune persistance personnelle de consultation identifiée.
- `exportItemsJson` exporte tout `items`, indépendamment du filtre. `exportRecoveryCsv` exporte les entrées dotées de `recovery`, pas les résultats affichés. Les noms d’exports portent encore v0.7.0 malgré l’interface v0.7.1 ; aucune correction dans cette mission.
- `submitSiteSearch` ouvre un moteur externe au moyen du modèle de recherche de la fiche, limité au domaine indiqué. La recherche ne modifie ni le corpus ni les résultats de la bibliothèque.

## Limites utiles et points d’attention

- Certaines données de traçabilité apparaissent avec `undefined` dans des cartes enrichies dont la source ne porte pas de nom d’entretien. L’anomalie a été observée hors des extraits retenus ; aucune correction de code ou de corpus n’a été faite. Les rubriques peuvent rester incomplètes, comme le rappelle le guide.
- Le dessin regroupe les liens par voisin et trace les flèches à partir du centre, y compris lorsque le panneau décrit une relation entrante. Le guide fait donc lire le sens dans **Depuis cette fiche / Vers cette fiche** et dans la note, sans attribuer aux seules flèches la direction documentaire. Les petits points d’état ne sont pas utilisés comme légende normative dans le guide : le libellé explicite de l’état reste le repère indiqué.
- La présence d’un badge Lien vérifié ne signifie pas que tous les liens de la fiche ont été contrôlés à la même date. Certains sont seulement recensés, avec une date à renseigner ; cette distinction figure dans le guide.
- Le fichier JSON généré n’a pas été rouvert pour une comparaison complète. Le contenu de l’export est établi par son traitement ; le CSV n’a pas été téléchargé. Aucun essai des contributions ou corrections, hors périmètre.
- Pas de campagne générale de tests, d’audit complet des 110 fiches ou de qualification mobile et multi-navigateur. Pas de validation de toutes les destinations externes.
- URL publique, modalités d’accès et validation éditoriale finale de David restent à confirmer. L’absence de fiche DIPROLANG n’a donné lieu à aucun enrichissement.

## Contrôle documentaire et préservation

PDF généré directement depuis le Markdown. Les cinq pages ont été rendues en PNG et inspectées : captures, légendes, repères, tableau, marges, pagination et renvois. Les captures de fiche et de lien externe ont été remplacées par des prises de meilleure définition, puis leurs pages réinspectées. Les trois autres pages finales sont identiques pixel par pixel aux rendus déjà relus. Aucun débordement, texte documentaire coupé, page vide ou couverture supplémentaire.

Concordance du texte Markdown/PDF après normalisation de la mise en forme et retrait des pieds de page : **5 pages sur 5 conformes**. Les sources Markdown restent la rédaction de référence ; aucune seconde rédaction indépendante dans le PDF.

Comparaison SHA-256 avec le relevé du début de mission : **31 fichiers des guides précédents préservés**, ainsi que les cinq fichiers actuels examinés d’Informaticaire (HTML, JavaScript, CSS, corpus et README). Aucun fichier applicatif, donnée, dépendance, configuration ou version modifié. Aucun commit ni push. Les captures brutes et outils de fabrication restent hors du dépôt.
