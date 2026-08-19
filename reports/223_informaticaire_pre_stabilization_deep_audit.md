# Mission 223 — Audit approfondi d’Informaticaire avant stabilisation de soutenance

Date de l’audit : 19 août 2026  
Nature : audit strictement en lecture seule  
Version applicative obtenue : **inchangée — gel Informaticaire `0.6.5`**

## Résumé décisionnel

### 1. État réel

Informaticaire est un démonstrateur statique autonome dans son fonctionnement métier : une page HTML, une feuille CSS, un corpus JavaScript et un script d’interface, sans backend propre, sans base, sans clé, sans appel IA et sans API. Dans le workspace lancé, IC-Hub le sert à l’URL canonique :

`http://127.0.0.1:8790/demos/informaticaire/`

Le cœur est réellement opérationnel : recherche, filtres, fiches détaillées, relations, campagne de récupération, parcours Galanet, préparation locale de contributions et exports navigateur. Le corpus effectivement rendu contient **64 items**, 64 relations typées, 11 objets de récupération et 20 liens externes. Il ne persiste aucun changement : tout état d’interface est perdu au rechargement, sauf si l’utilisateur exporte explicitement un fichier.

La bonne qualification de soutenance est : **répertoire documentaire démontrable, riche mais non validé comme base officielle**. Ce n’est ni une application communautaire en production, ni une mémoire déjà gouvernée.

### 2. Meilleur parcours de démonstration

Le meilleur parcours tient en **45 à 55 secondes** et utilise la vraie application, pas la maquette simulée de la soutenance :

1. ouvrir l’URL canonique sur l’accueil déjà chargé ;
2. dire : « Les projets d’intercompréhension laissent des ressources, des personnes, des droits et des traces dispersés » ;
3. cliquer sur **Voir la démo rapide**, puis sur **Lancer le parcours Galanet** ;
4. regarder la recherche préremplie, puis la fiche qui s’ouvre automatiquement ;
5. montrer seulement l’état, les relations, la récupération et l’archive à vérifier ;
6. conclure : « Informaticaire transforme un nom de projet en système de relations et en actions de vérification ; il ne prétend pas encore être une base officielle. »

Ce parcours démontre la retrouvabilité, la mémoire relationnelle, l’incertitude documentée et l’action de récupération. Il évite la visite exhaustive, les exports, le registre complet des acteurs et les formulaires longs.

### 3. Priorités maximales

1. **P0 — faire coïncider la soutenance avec la vraie application** : la popup `v0.10` est une maquette explicitement simulée, mais elle montre une fiche Proto05 et des données qui n’existent pas dans Informaticaire. Ouvrir la vraie démo Galanet ou remplacer cette maquette par un état fidèle.
2. **P0 — trancher et harmoniser `42` contre `64`, puis `v0.6` contre `v0.6.5`** : l’interface affiche 64, tandis que README et gel annoncent 42 ; la page et les exports restent étiquetés `v0.6`, tandis que Hub et statut annoncent `0.6.5`.
3. **P0 — corriger la sémantique de vérification** : toutes les fiches affichent « Vérifié 2026-07-03 », y compris 46 sources non confirmées et 9 fiches de confiance « à vérifier ». Certains liens eux-mêmes « à vérifier » sont présentés dans un bloc « Liens externes vérifiés ».
4. **P0 de recette — faire la validation visuelle humaine aux deux dimensions sur le portable** : le connecteur navigateur intégré a échoué avant toute inspection graphique.
5. **P1 — enlever les petits signaux de prototype non relu** : statut dupliqué dans la modale, navigation très dense, deux sections de sauvegarde proches et filtres de publics peu discriminants.

### 4. Ce qui peut attendre après la soutenance

- backend de contribution, comptes, modération et gouvernance ;
- validation collective exhaustive des 64 fiches ;
- modèle de provenance plus fin avec localisateurs de source ;
- hébergement public durable et stratégie de sauvegarde ;
- intégration réelle des prototypes actuels, de leurs filiations et décisions ;
- sécurisation systématique du rendu HTML avant d’accepter des données externes ;
- refonte de la carte relationnelle ou enrichissement du moteur de recherche.

### 5. Principaux risques

- **crédibilité** : contradiction publique entre volumes, versions et badges de vérification ;
- **preuve de soutenance** : une maquette fictive peut être prise pour la vraie application ;
- **contenu** : la majorité des fiches reste de confiance moyenne ou de source non confirmée ;
- **visuel** : absence de recette contemporaine à 1440 × 900 et 1366 × 768 ;
- **dépendance locale** : l’URL canonique disparaît si IC-Hub n’est pas actif, même si le prototype n’a pas de backend métier ;
- **confidentialité et gouvernance** : les sources privées sont hors dépôt, donc la traçabilité visible n’est pas vérifiable par un tiers depuis le livrable seul.

## 1. Périmètre, sources et arbitrage d’instructions

### Périmètre observé

- prototype canonique : `prototypes/07-informaticaire/` ;
- route de service : `prototypes/00-ic-hub/server/server.js` ;
- carte publique Hub : `prototypes/00-ic-hub/public/portal-0.10.4.html` ;
- documents racine : `docs/ARCHITECTURE.md`, `docs/WORKSPACE_PROVENANCE.md`, `PROJECTS_LAUNCH.md`, `STATUS.md`, `README.md` ;
- historique propre au prototype : `prototypes/07-informaticaire/reports/001` à `015`, `DEMO_FREEZE.md`, `demo-script.md` ;
- ancien workspace `IC-Lab` et copie documentaire sous `Memoire/ingenieur-documentaire/dossiers/07-informaticaire` ;
- soutenance locale la plus récente accessible : `Soutenance_M2_David_v0.10` du 5 août 2026 ;
- matériaux du mémoire et échantillon de six synthèses d’entretiens ;
- transcription source de Christian Degache pour contrôler le verbatim central.

### Contradiction d’instructions signalée

`AGENTS.md` interdit en mode d’audit toute écriture dans le dépôt et demande une sortie sous `IC-Lab-Next-Technical`, tandis que la mission 223 autorise explicitement le rapport documentaire et impose `reports/223_informaticaire_pre_stabilization_deep_audit.md`. La règle générale des rapports du même `AGENTS.md` demande également un rapport dans `reports/`.

Conformément à la priorité déclarée des sources — mission courante avant règle de dépôt — et à l’autorisation explicite répétée par David d’écrire dans `IC-Lab-Next/reports/`, **seul le présent rapport a été créé dans le dépôt**. Aucun fichier applicatif, donnée, configuration ou artefact de test n’a été modifié.

## 2. Architecture réelle

### 2.1 Canon, variantes et histoire

| Élément | État observé | Conclusion |
|---|---|---|
| `IC-Lab-Next/prototypes/07-informaticaire` | servi par IC-Hub et référencé par les documents actuels | **canon applicatif** |
| ancien `IC-Lab/prototypes/07-informaticaire` | mêmes empreintes pour `index.html`, `styles.css`, `script.js`, `data.js` | archive historique identique fonctionnellement |
| `Memoire/ingenieur-documentaire/dossiers/07-informaticaire` | mêmes empreintes pour les quatre artefacts principaux | copie documentaire, non servie |
| entretiens privés | 15 PDF dans les copies historiques/documentaires, absents du dépôt actif | sources privées, volontairement non livrées |
| Git racine `IC-Lab-Next` | un commit de consolidation pour le prototype | historique fin conservé surtout par les rapports internes |
| Git ancien `IC-Lab` | commits `0.6.1`, gels `0.6.3` et `0.6.5` le 3 juillet | origine du gel actuel |

Les copies applicatives ne divergent pas ; la seule différence structurelle pertinente est l’absence volontaire des 15 PDF privés dans IC-Lab-Next.

### 2.2 Technologies et organisation

| Fichier | Rôle réel |
|---|---|
| `index.html` | page unique et toutes les sections statiques |
| `styles.css` | personnalité visuelle, grilles, modale et responsive |
| `data.js` | corpus canonique de démonstration, filtres, frise, besoins et graphe |
| `script.js` | rendu, recherche, filtres, modale, démo Galanet, contributions et exports |
| `README.md` | guide général, partiellement désynchronisé |
| `DEMO_FREEZE.md` | statut de gel `0.6.5`, également désynchronisé sur le volume |
| `demo-script.md` | scripts longs de 5 et 12 minutes |

Il n’existe aucun `package.json`, framework, dépendance installée, compilation ou suite de tests propre à Informaticaire.

### 2.3 Entrées et services

- entrée canonique : `http://127.0.0.1:8790/demos/informaticaire/` ;
- entrée depuis le Hub : carte « Informaticaire », statut « Démonstrateur gelé », `V0.6.5` ;
- source directe : `index.html`, théoriquement ouvrable comme fichier local mais non recettée aujourd’hui ;
- service nécessaire dans le workspace : IC-Hub Node sur `8790` ;
- serveur propre à Informaticaire : aucun ;
- Dico-IC, Seven Sieves, Proto05, Proto06, MariaDB : aucune dépendance fonctionnelle d’Informaticaire ;
- API : aucune ;
- variables d’environnement et clés : aucune pour Informaticaire ;
- réseau : facultatif, seulement au clic sur un lien externe.

IC-Hub sert directement les quatre ressources principales. Les requêtes contrôlées ont répondu `200` avec des types cohérents ; un chemin absent a répondu `404`.

### 2.4 Données et persistance

`data.js` possède toutes les données métier. Le navigateur construit les vues en mémoire. Il n’existe aucun appel `fetch`, WebSocket, cookie, stockage local, stockage de session ou base propre au prototype.

| Action | Effet | Persistance |
|---|---|---|
| recherche / filtre | modifie l’état JavaScript en mémoire | perdue au rechargement |
| démo Galanet | fixe recherche, filtre, cible et ouvre une fiche | perdue au rechargement |
| contribution | construit un brouillon JSON local | perdue sauf export explicite |
| correction | préremplit le formulaire avec une fiche | perdue sauf export explicite |
| export fiches | télécharge le corpus complet | fichier local |
| export récupération | télécharge les 11 lignes de campagne | fichier local |

La contribution est donc **simulée mais honnêtement annoncée comme telle**. Rien n’est envoyé ni intégré au corpus.

### 2.5 Indisponibilités

- Hub indisponible : l’URL canonique ne répond plus ;
- liens externes indisponibles : le cœur reste utilisable ;
- réseau coupé : recherche, fiches, relations, contribution et exports restent théoriquement fonctionnels une fois les fichiers chargés ;
- données JavaScript non chargées : le script dépend de variables globales et la page ne possède pas de gestion d’erreur dédiée ;
- JavaScript désactivé : les compteurs restent à zéro et les zones dynamiques vides, sans message explicatif.

## 3. Parcours utilisateur réel

### 3.1 Parcours principal

1. L’utilisateur arrive sur une longue page éditoriale avec mission, compteurs et quatre actions.
2. Il peut explorer la visite en cinq étapes, la démo Galanet, les publics ou des parcours d’intention.
3. La bibliothèque permet une recherche immédiate et 17 filtres.
4. Les résultats affichent déjà beaucoup de métadonnées avant ouverture.
5. La modale détaillée ajoute usages, droits, accessibilité, état, relations, preuves, risques, liens et actions.
6. L’utilisateur peut naviguer vers une fiche liée ou proposer une correction.
7. La correction ferme la modale, préremplit le formulaire, met la section en évidence et place le focus dans le champ.
8. Le brouillon peut être relu puis exporté.

### 3.2 Retour, reprise et annulation

- **recommencer** : bouton `Réinitialiser` pour la bibliothèque ;
- **modifier** : recherche et filtres immédiatement réapplicables ;
- **fermer** : croix, fond de modale ou touche Échap ;
- **revenir** : navigation par ancres et fermeture de fiche ;
- **annuler une contribution** : aucun bouton dédié, mais les champs restent modifiables et le rechargement efface l’état ;
- **persister** : seulement par téléchargement ;
- **ancien résultat après échec** : pas d’appel asynchrone métier, donc pas de scénario de réponse tardive ou d’ancien résultat serveur.

### 3.3 Mélanges et ruptures

La page juxtapose quatre rôles : visiteur découvrant le concept, documentaliste explorant des preuves, réseau pilotant une campagne, contributeur préparant une correction. Cette richesse est cohérente avec le concept, mais elle rend la page trop vaste pour une preuve de moins d’une minute.

Les deux sections `Ressources à sauver ensemble` et `À sauver / à vérifier` sont proches sans être identiques : la première affiche uniquement les 11 objets avec workflow de récupération ; la seconde agrège 36 fiches par statut fragile, disparu, à récupérer ou à vérifier. Cette distinction est réelle mais peu évidente sans explication.

## 4. Démonstration de soutenance — 45 à 55 secondes

### Préparation

- démarrer IC-Lab-Next et vérifier `8790` ;
- ouvrir l’URL canonique dans un onglet séparé ;
- recharger, rester en haut de page, zoom navigateur à 100 % ;
- fermer toute modale et réinitialiser la recherche ;
- garder une capture de la fiche Galanet comme secours ;
- ne pas dépendre d’un clic sur l’archive externe.

### Script recommandé

| Temps | Action de David | Ce que le jury regarde | Phrase orale |
|---:|---|---|---|
| 0–10 s | montrer le titre et les indicateurs | passage de ressources dispersées à une mémoire organisée | « Le terrain a révélé une autre difficulté : retrouver et maintenir ce qui a déjà été produit. » |
| 10–18 s | descendre ou cliquer `Voir la démo rapide` | une porte d’entrée explicite | « Je prends Galanet, une plateforme historique devenue fragile. » |
| 18–25 s | cliquer `Lancer le parcours Galanet` | recherche remplie et fiche unique | « Un nom devient une fiche reliée à son histoire et à ses acteurs. » |
| 25–43 s | pointer état, relations, récupération, archive à vérifier | incertitude, liens et prochaine action | « On voit ce qui est connu, ce qui reste à vérifier et qui pourrait aider à récupérer la ressource. » |
| 43–55 s | rester sur la fiche, ne pas ouvrir le web | différence avec Hub et prudence scientifique | « IC-Hub centralise l’accès ; Informaticaire conserve les relations. Ce prototype n’est pas une base officielle : il rend visible le travail documentaire restant. » |

### Risques et temps d’attente

Le parcours n’appelle aucun service externe. Le seul délai codé est de 550 ms avant l’ouverture de la modale Galanet. Un double clic programme deux ouvertures identiques, sans mutation ni corruption observable.

### Parcours de secours

1. si Hub ne répond pas, ouvrir la copie locale préparée d’`index.html` ;
2. si l’ouverture locale échoue sur le portable, montrer une capture pleine page de la fiche Galanet ;
3. dire la même phrase de conclusion ;
4. ne pas basculer sur la maquette Proto05 fictive comme preuve de l’application réelle.

## 5. Concordance avec la soutenance et les annonces

La source de soutenance la plus récente contrôlée est `Soutenance_M2_David_v0.10`. Elle situe Informaticaire après IC-Hub, cite Christian Degache et décrit un répertoire vivant qui préserve un système de relations.

| Affirmation publique | Preuve visible actuelle | État | Action minimale éventuelle |
|---|---|---|---|
| le mot vient de Christian Degache | transcription source : « il n’y a pas d’informaticaire, il faudrait qu’il y ait un informaticaire » | **démontré** | conserver attribution et contexte |
| conserver, maintenir, rendre accessible | la page montre conservation documentaire, états, liens, récupération ; elle ne maintient pas réellement une plateforme | **partiellement démontré** | dire « prototype qui prolonge la fonction », pas « service de maintenance » |
| mémoire relationnelle de ressources, acteurs et projets | 64 fiches, 64 relations, 5 lignes de graphe, navigation entre fiches | **démontré** | utiliser Galanet comme preuve |
| institutions, décisions et traces | une institution est mentionnée dans une fiche ; décisions = questions statiques ; traces = notes d’entretien, sans journal de cycle de vie | **présent mais peu lisible** | ne pas les présenter comme registres structurés |
| répertoire documentaire vivant | recherche, fiches, corrections préparées et liens ; aucune contribution persistée | **partiellement démontré** | qualifier « vivant par son projet communautaire », pas par une activité serveur |
| 42 fiches documentées | l’interface calcule 64 items | **absent / contradictoire** | choisir 64 ou définir publiquement les 42 objets non-acteurs |
| 32 fiches acteurs | filtre exact `Acteurs` = 32 ; un acteur collectif existe en plus | **démontré** | préciser la convention si le collectif est compté ailleurs |
| liens externes vérifiés | 20 liens, dont 17 marqués accessibles et 3 à vérifier, tous datés du 3 juillet | **partiellement démontré** | séparer « accessible le » de « source vérifiée » |
| maquette de soutenance centrée sur Proto05 | aucune fiche Proto05, David, LIDILEM ou « 7 activités dérivées » dans le corpus réel | **absent** | ouvrir Galanet réel ou refaire la maquette avec une fiche existante |
| mémoire, documentation et pérennité comme aboutissement | campagne de récupération, droits, statuts, relations et contribution locale | **démontré** | garder le discours actuel, qui est prudent |
| application non officielle et non exhaustive | section `Ce prototype n’est pas encore...` | **démontré** | montrer ou dire cette limite |
| adaptation/transmission des ressources | champs de réutilisation et contribution ; aucune adaptation effective d’une ressource | **partiellement démontré** | parler de préparation et de conditions, pas de transformation exécutée |

### Contradiction `42` / `64`

Elle ne résulte pas d’une découverte récente : le rapport interne `015` indique dans la même mission « 42 fiches documentées comme repère de démonstration » puis « nombre total d’items dans les données actuelles : 64 ». L’ajout du registre acteurs a augmenté le corpus sans que le repère public soit redéfini. L’interface, elle, affiche `items.length`, donc 64.

Une explication possible est que les **42** correspondent au noyau v0.6 avant l’extension du registre et que les **22** nouvelles fiches acteurs ont été ajoutées ensuite. Cette reconstruction est une inférence cohérente avec l’historique, pas une définition actuellement écrite dans l’interface. Pour la soutenance, il faut soit annoncer 64 fiches, soit afficher explicitement « 42 objets documentaires + 22 entrées d’acteurs ajoutées » si cette taxonomie est validée par David.

## 6. Qualité et compréhension de l’interface

### Forces observables dans le code et les textes

- identité calme et documentaire, distincte des prototypes linguistiques ;
- mission exprimée dès le premier écran ;
- CTA dédiés à l’exploration, la visite, la démo et la contribution ;
- statuts, droits, accès et incertitudes rendus visibles ;
- état vide de recherche explicite avec suggestion EuRom ;
- retours de génération des exports via zones `aria-live` ;
- boutons et champs majoritairement nommés en langage utilisateur ;
- responsive prévu sous 780 px ;
- cartes et grilles utilisent des dimensions flexibles et `overflow-wrap` ;
- aucun jargon de base, clé, endpoint ou JSON technique exposé avant la contribution.

### Faiblesses

1. **Densité** : 15 liens dans la barre supérieure et 17 filtres ; la barre accepte le retour à la ligne, mais peut devenir haute et occuper une part importante du viewport.
2. **Longueur** : 15 sections principales avant le pied de page ; la visite complète nuit à une démo courte.
3. **Fiche trop exhaustive** : les cartes de résultats affichent déjà relations, preuves, acteurs, entretiens et risques ; la différence avec la modale est moins nette.
4. **Statut dupliqué** : la modale rend deux fois le statut dans l’en-tête.
5. **Vérification ambiguë** : « confiance », « source », « vérifié » et « lien vérifié » mélangent revue de fiche, accessibilité technique et validation documentaire.
6. **Deux ensembles de sauvegarde** : campagne active et agrégat patrimonial sont difficiles à distinguer.
7. **Filtres de publics peu discriminants** : 64/64 fiches sont pour chercheurs, 61/64 pour enseignants, mais une seule pour formation de formateurs.
8. **Modale** : pas de focus automatique à l’ouverture, pas de piège de focus, pas de restauration du focus à la fermeture et pas de verrouillage du fond.
9. **Rendu HTML** : les liens externes et brouillons sont échappés, mais la plupart des champs du corpus sont interpolés sans échappement. Le risque est faible tant que `data.js` reste une source suivie et relue ; il devient significatif avec un futur backend contributif.

### Questions probables du jury

- « Que dois-je faire ? » — réponse : cliquer la démo Galanet ; éviter de présenter les 15 sections.
- « Quelle est la preuve ? » — réponse : relation + statut + source + action de récupération sur une fiche réelle.
- « Qu’est-ce qui vient de se passer ? » — le surlignage puis l’ouverture différée sont visibles, mais l’oral doit accompagner les 550 ms.
- « Quelle différence avec IC-Hub ? » — Hub = point d’entrée vers les outils ; Informaticaire = mémoire des objets et de leurs relations.
- « Est-ce réellement communautaire ? » — non encore : contribution locale, relecture et intégration manuelles.

## 7. Contenu et crédibilité

### Inventaire réel

| Dimension | Valeur |
|---|---:|
| items totaux | 64 |
| acteurs de type exact `acteur` | 32 |
| acteur collectif | 1 |
| projets | 7 |
| ressources | 9 |
| outils | 3 |
| corpus | 3 |
| concepts | 4 |
| besoins | 4 |
| plateforme | 1 |
| relations typées | 64 |
| objets avec récupération | 11 |
| liens externes | 20 sur 16 fiches |
| fiches avec preuves | 31 |
| fiches avec relations | 21 |
| confiance haute | 14 |
| confiance moyenne | 41 |
| confiance à vérifier | 9 |
| source confirmée | 18 |
| source non confirmée ou transcription/nom à vérifier | 46 |
| licence inconnue ou à vérifier | 60 |
| accès à vérifier ou à retrouver | 54 |

Les données sont donc abondantes pour une démo, mais la prudence n’est pas un détail : elle concerne la majorité du corpus.

### Provenance

Les fiches ont été construites à partir d’une première exploitation de 15 entretiens et enrichies par étapes. L’échantillon contrôlé — Christian, Jean-Pierre, Encarni, Hugues, Kátia et Sandra — soutient bien les thèmes centraux : fragilité des plateformes, Galanet/Galapro/Miriadi, besoin de bibliothèque, maintenance, corpus, annotation et réutilisation.

La transcription source de Christian confirme le verbatim de soutenance et développe la fonction : conserver, maintenir l’accès, sauvegarder, convertir lorsque les systèmes changent et rendre accessible.

Limite : les PDF utilisés dans le dossier historique sont des synthèses structurées et les preuves de l’interface renvoient à un entretien par nom et note, sans page, ligne, extrait ou identifiant de passage. Le dépôt actif ne contient pas les sources privées. La traçabilité est utile pour un prototype, insuffisante pour une validation scientifique indépendante fiche par fiche.

### Exemples à privilégier

- **Galanet** : meilleur récit, relations riches, enjeu de récupération, archive explicitement à vérifier ;
- **Miriadi** : site actuel et ressources accessibles, bon contraste avec Galanet ;
- **EuRom / EuRom Web** : site actuel redirigé vers EuRom Web, utile pour montrer un lien vivant ;
- **Sandra Garbarino** : robuste pour démontrer alias et fusion, mais moins direct pour le message de fin de soutenance.

### Exemples fragiles à éviter en démonstration courte

- PHIP : rapprochement au corpus Miriadi explicitement à confirmer ;
- Portail PLE cité par Kátia : nom et URL non établis ;
- Itinéraires romans : ancienne URL non confirmée ;
- Galapro : archive en HTTP et complétude non confirmée ;
- tout écran affirmant que Proto05 et ses sept dérivations figurent déjà dans le corpus.

### Contrôle actuel des liens

Les pages Miriadi, ressources Miriadi, corpus de contes, ALPAGA Sciencesconf, annonce ALPAGA, EuRom Web, ELAN, Speechmatics, documentation Speechmatics, NoSketch Engine, UNITA et référentiels Miriadi ont été retrouvées par contrôle web le 19 août. EuRom5 redirige vers `euromweb.com`. KiParla a répondu par un écran de protection et non par un contenu exploitable. Les deux archives imbriquant une URL HTTP et l’ancienne URL Union Latine n’ont pas pu être validées par l’outil ; elles doivent rester « à vérifier ».

Il s’agit d’un contrôle ponctuel d’accessibilité, pas d’une validation de droits, de provenance ou de complétude.

## 8. Robustesse de démonstration

### Contrôles concluants

- l’URL canonique et les trois assets ont répondu `200` ;
- le mauvais chemin a répondu `404` ;
- `data.js` et `script.js` passent le contrôle de syntaxe Node ;
- aucun identifiant de fiche dupliqué ;
- aucune relation vers une fiche absente ;
- aucun identifiant de priorité absent ;
- les 13 recherches préconisées par le gel retournent une fiche pertinente en tête ;
- recherche sans résultat : état vide prévu ;
- les 17 filtres s’exécutent sans exception dans le moteur réel ;
- aucun appel IA, serveur métier ou base ne peut ralentir le parcours ;
- l’action Galanet est déterministe et réentrante ;
- le reset remet recherche, filtre et focus dans leur état initial.

### Limites ou risques

- si IC-Hub est arrêté, aucune page canonique ;
- l’ouverture directe `file://` annoncée par le README n’a pas été recettée visuellement ;
- pas de gestion dédiée à l’échec de chargement de `data.js` ;
- pas de cache offline ni service worker ;
- la vérification actuelle n’a pas mesuré de temps de rendu sur le portable de soutenance ;
- la grande quantité de HTML construite côté client pourrait causer un bref coût initial, mais aucun ralentissement n’a été observé par la recette HTTP et aucune attente réseau métier n’existe ;
- l’ouverture d’un lien externe pendant l’oral ajoute un risque inutile.

## 9. Tests

### Tests existants

Aucun test automatisé, manifeste de test ou dépendance de test propre à Informaticaire n’existe. Les rapports historiques citent surtout des contrôles manuels de syntaxe, navigateur, recherche, exports et mobile. Ces rapports ne remplacent pas une exécution contemporaine.

### Contrôles exécutés pendant la mission

| Contrôle | Résultat |
|---|---|
| syntaxe `data.js` | succès |
| syntaxe `script.js` | succès |
| chargement HTTP page/CSS/data/script | quatre réponses `200` |
| chemin HTTP absent | `404` |
| invariants de corpus | 64 IDs uniques, zéro relation pendante |
| recherche réelle | 13 requêtes du gel conformes, plus état vide |
| filtres réels | 17 filtres évalués |
| cohérence des compteurs | 64 items, 11 récupérations, 10 priorités, 5 publics, 64 relations |
| comparaison des copies | quatre artefacts applicatifs identiques |
| échantillon de provenance | 6 synthèses + transcription source Christian |
| liens externes | contrôle ponctuel, résultats nuancés ci-dessus |
| Git avant rapport | propre |

### Couverture manquante

- rendu DOM complet dans un vrai navigateur ;
- clics de modale, parcours liés, contribution et téléchargements réels ;
- erreurs console ;
- accessibilité clavier complète ;
- dimensions 1440 × 900 et 1366 × 768 ;
- compatibilité exacte sur le portable et le navigateur de soutenance ;
- test automatisé empêchant le retour de la contradiction 42/64 ;
- test de concordance entre version de gel, page, exports et carte Hub.

## 10. Recette visuelle

### État de la recette Codex

Le connecteur du navigateur intégré a échoué lors de son initialisation avec un refus de chemin de confiance interne avant toute navigation. Aucun screenshot ni contrôle de console n’a donc été produit. La mission demandait de ne pas contourner longuement ce défaut connu ; aucun autre moteur navigateur n’a été substitué.

L’analyse statique confirme des protections de base : grilles flexibles, retour à la ligne de la navigation, largeur principale bornée, rupture mobile sous 780 px et absence d’identifiant HTML dupliqué ou d’ancre orpheline. Elle ne prouve pas le rendu final.

### Recette humaine courte — 1440 × 900 puis 1366 × 768

Pour chaque dimension, à zoom 100 % :

1. recharger l’accueil et vérifier qu’aucun débordement horizontal n’apparaît ;
2. vérifier la hauteur de la barre collante et que ses 15 liens ne masquent pas le titre ou les ancres ;
3. confirmer que le titre, les quatre CTA et les cinq compteurs sont lisibles ;
4. cliquer `Voir la démo rapide`, puis `Lancer le parcours Galanet` ;
5. vérifier que la bibliothèque est visible après le scroll et que la modale s’ouvre sans texte coupé ;
6. faire défiler la modale jusqu’aux relations, à la récupération et aux liens ;
7. fermer par croix, Échap et clic sur le fond ;
8. rechercher `EuRom 5`, `JP`, `Sandra Garbarino`, puis une chaîne absente ;
9. appliquer `Acteurs`, `À récupérer` et `Pour formation de formateurs` ;
10. préparer une correction sans l’exporter, vérifier le retour visible, puis recharger ;
11. ouvrir la console et confirmer zéro erreur rouge ;
12. contrôler contraste, focus clavier, taille des textes, barre de défilement et absence d’élément hors écran.

Critère d’arrêt : si 1366 × 768 rend la barre de navigation trop haute ou masque le contexte de la démo, préparer la page à la section `Démo rapide` avant projection et ne pas improviser une visite du menu.

## 11. Recommandations priorisées

### P0 — bloque ou fragilise la démonstration

#### P0.1 — Montrer l’application réelle depuis la soutenance

- **Problème** : la popup `v0.10` simule une fiche Proto05 absente du corpus réel.
- **Preuve** : la maquette affirme contexte REPLI4C, responsabilités David/LIDILEM et sept activités dérivées ; aucune de ces entrées n’existe dans `data.js`.
- **Impact** : le jury peut croire voir une preuve applicative alors qu’il voit une fiction éditoriale.
- **Correction minimale** : ouvrir l’URL réelle sur la fiche Galanet, ou remplacer la maquette par Galanet avec ses champs réellement présents ; garder le libellé maquette si elle reste simulée.
- **Coût** : faible à moyen.
- **Risque de régression** : faible si ajout d’un lien séparé ; moyen si modification du pilotage de la soutenance.

#### P0.2 — Harmoniser volume et version

- **Problème** : 42 contre 64 ; `v0.6` contre gel `v0.6.5` ; exports nommés `v0.6`.
- **Preuve** : calcul réel `items.length = 64`, rapport 015 déjà contradictoire, page `Prototype v0.6`, Hub `V0.6.5`.
- **Impact** : question immédiate sur la maîtrise du corpus et de la version démontrée.
- **Correction minimale** : décider la taxonomie, aligner accueil, README, gel et discours ; afficher `0.6.5` si c’est bien le gel démontré, sans changer le contenu des exports si une compatibilité est requise — dans ce cas documenter leur schéma `v0.6`.
- **Coût** : très faible.
- **Risque de régression** : très faible.

#### P0.3 — Distinguer revue, preuve et accessibilité

- **Problème** : « Vérifié 2026-07-03 » s’affiche sur toutes les fiches ; bloc « Liens externes vérifiés » même pour des liens à vérifier.
- **Preuve** : 46 sources non confirmées, 9 confiances à vérifier, 3 liens explicitement à vérifier.
- **Impact** : contradiction scientifique visible dans la même fiche ; risque de surpromesse.
- **Correction minimale** : remplacer « Vérifié » par « Fiche revue le » ; renommer le bloc « Liens externes » ; afficher « accessibilité contrôlée le » seulement pour le statut accessible ; garder « à vérifier » sans badge « lien vérifié ».
- **Coût** : faible.
- **Risque de régression** : faible.

#### P0.4 — Recetter sur le dispositif réel

- **Problème** : aucune preuve visuelle contemporaine aux deux dimensions demandées.
- **Preuve** : défaut d’infrastructure du connecteur navigateur avant navigation.
- **Impact** : un chevauchement de barre ou une modale coupée peut apparaître seulement le jour J.
- **Correction minimale** : exécuter la recette humaine du §10 sur le portable, conserver deux captures et chronométrer le parcours.
- **Coût** : très faible.
- **Risque de régression** : nul.

### P1 — amélioration importante et raisonnable dans la journée

#### P1.1 — Rafraîchir seulement les liens centraux de la démo

- **Problème** : toutes les dates de contrôle remontent au 3 juillet ; statut technique, source officielle et droits sont confondus.
- **Preuve** : 20 liens partagent la même date ; KiParla est protégé, EuRom redirige, archives et Union Latine restent incertaines.
- **Impact** : un lien mort ou indirect affaiblit la démonstration.
- **Correction minimale** : recontrôler Galanet, Miriadi et EuRom ; ne cliquer sur aucun lien externe pendant les 55 secondes ; documenter redirect/protection/archives.
- **Coût** : faible.
- **Risque de régression** : très faible.

#### P1.2 — Nettoyer la fiche Galanet

- **Problème** : statut affiché deux fois et quantité d’informations élevée.
- **Preuve** : deux appels successifs à `pill(item.status...)` dans l’en-tête de modale.
- **Impact** : impression de prototype non relu sur l’unique écran de preuve.
- **Correction minimale** : supprimer le badge dupliqué et vérifier que quatre blocs clés sont visibles sans chasse au contenu.
- **Coût** : très faible.
- **Risque de régression** : très faible.

#### P1.3 — Écrire un filet de tests de gel

- **Problème** : aucun test n’empêche une nouvelle désynchronisation.
- **Preuve** : pas de manifeste ou fichier de test propre au prototype ; incohérence 42/64 restée dans le gel.
- **Impact** : une petite modification tardive peut casser recherche, relations ou discours.
- **Correction minimale** : test lecture seule des invariants, requêtes de recherche, compteurs et libellés de version ; test DOM du bouton Galanet si l’outillage existe déjà ailleurs.
- **Coût** : faible.
- **Risque de régression** : faible.

#### P1.4 — Préparer l’entrée de démo plutôt que réduire toute la page

- **Problème** : navigation et page trop denses pour moins d’une minute.
- **Preuve** : 15 liens de navigation, 17 filtres, 15 sections.
- **Impact** : David risque de commenter le catalogue au lieu de démontrer une preuve.
- **Correction minimale** : conserver l’architecture, mais préparer la section Démo rapide et une fiche Galanet propre ; éventuellement mettre ce CTA en avant.
- **Coût** : très faible à faible.
- **Risque de régression** : très faible.

### P2 — utile seulement si du temps reste

#### P2.1 — Clarifier les deux vues de sauvegarde

- **Problème** : campagne d’action et inventaire de fragilité se ressemblent.
- **Preuve** : 11 objets de récupération contre 36 objets agrégés par statut.
- **Impact** : question « quelle différence ? ».
- **Correction minimale** : sous-titres explicites « campagne avec prochaine action » et « inventaire des statuts fragiles ».
- **Coût** : très faible.
- **Risque de régression** : très faible.

#### P2.2 — Revoir les publics

- **Problème** : filtres trop larges ou presque vides.
- **Preuve** : chercheurs 64, enseignants 61, formation de formateurs 1.
- **Impact** : segmentation promise mais faible valeur de sélection.
- **Correction minimale** : vérifier la taxonomie et ne pas montrer ce filtre pendant la soutenance.
- **Coût** : moyen si reprise des données.
- **Risque de régression** : moyen sur le corpus.

#### P2.3 — Accessibilité de la modale

- **Problème** : focus et fond non gérés.
- **Preuve** : aucun focus à l’ouverture, piège ou restauration.
- **Impact** : navigation clavier confuse.
- **Correction minimale** : focus initial sur la fermeture, retour au déclencheur, piège de focus simple, inertie du fond.
- **Coût** : faible.
- **Risque de régression** : faible à moyen.

### Après soutenance

#### A. Gouvernance et contribution réelle

- **Problème** : « communautaire » repose sur un export manuel.
- **Preuve** : aucun backend ni stockage.
- **Impact** : impossible d’animer durablement un répertoire partagé.
- **Correction minimale envisagée** : décider d’abord rôles, validation, provenance, droits, modération et responsabilité, puis seulement choisir le stockage.
- **Coût** : élevé.
- **Risque de régression** : élevé.

#### B. Provenance vérifiable

- **Problème** : preuves sans page/ligne et sources privées hors livrable.
- **Preuve** : `evidence` contient entretien + note, pas de localisateur.
- **Impact** : audit scientifique difficile.
- **Correction minimale envisagée** : identifiants anonymisés, localisateurs, niveau de preuve, date de revue et source publique ou procédure d’accès.
- **Coût** : moyen à élevé.
- **Risque de régression** : moyen, surtout éthique et documentaire.

#### C. Représenter réellement l’archipel actuel

- **Problème** : le prototype ne contient pas encore les relations réelles entre Proto05, Hub, Dico-IC, Seven Sieves et leurs décisions.
- **Preuve** : la maquette de soutenance les invente, le corpus réel non.
- **Impact** : l’aboutissement narratif reste plus avancé que l’application.
- **Correction minimale envisagée** : définir un modèle de fiches de prototypes, décisions, versions, responsabilités et filiations, puis l’alimenter avec preuves.
- **Coût** : moyen à élevé.
- **Risque de régression** : moyen.

#### D. Durcir le rendu avant ingestion externe

- **Problème** : champs de corpus largement interpolés dans `innerHTML`.
- **Preuve** : l’échappement est ciblé sur liens/brouillons, pas généralisé.
- **Impact** : risque d’injection si une future contribution non fiable entre dans les données.
- **Correction minimale envisagée** : composants DOM ou échappement systématique, validation d’URL et politique de contenu.
- **Coût** : moyen.
- **Risque de régression** : moyen.

## 12. Ce qui n’a pas été vérifié

- rendu visuel réel et console navigateur ;
- téléchargements déclenchés dans un navigateur ;
- ouverture directe `file://` sur le portable ;
- comportement de tous les liens externes dans le navigateur de David ;
- exactitude scientifique des 64 fiches une par une ;
- droits de diffusion des noms, entretiens et ressources ;
- chronométrage humain avec discours ;
- intégration effective d’un lien vers la vraie démo dans la soutenance `v0.10` ;
- comportement du launcher global, qui n’a pas été redémarré car le Hub utile répondait déjà.

La recette de Codex ne vaut pas validation humaine de David.

## 13. Fichiers créés et versions

Fichier créé :

- `reports/223_informaticaire_pre_stabilization_deep_audit.md`

Aucun autre fichier n’a été créé ou modifié. Aucun artefact annexe n’était nécessaire.

Version applicative : **inchangée**, gel canonique retenu `0.6.5`. Le présent audit documentaire n’incrémente aucune version.

## 14. Services et état Git

### Services

Aucun service n’a été démarré, redémarré ou arrêté par l’audit. Aucun processus temporaire ni fixture n’a été créé.

État relevé en fin d’analyse, avant l’écriture finale du rapport :

| Port | État | Processus |
|---:|---|---|
| 8790 | actif | Node IC-Hub, PID 71348 |
| 8791 | actif | Node Proto05, PID 14968 |
| 8788 | actif | Node Proto06, PID 12380 |
| 3000 | actif | Node Dico-IC/Seven Sieves, PID 54808 |
| 3306 | actif | relais Docker/MariaDB |
| 8080 | actif | relais Docker/phpMyAdmin |

Seul IC-Hub `8790` a été utilisé par la recette Informaticaire. Les autres services n’étaient pas nécessaires et n’ont pas été interrogés fonctionnellement.

### Git

État initial : propre.  
État final observé : uniquement le présent rapport non suivi.  
Aucun commit, stash, branche, push ou déploiement.

## 15. Suite possible

Mission de stabilisation courte recommandée, sans refonte :

1. arbitrage David sur `42/64` et `0.6/0.6.5` ;
2. alignement du vocabulaire de vérification ;
3. raccord de la soutenance à la vraie démo Galanet ;
4. suppression du doublon visuel dans la fiche ;
5. recette humaine aux deux dimensions et répétition chronométrée ;
6. gel définitif avec test d’invariants.

Message de commit proposé pour le rapport seul :

`docs: add Informaticaire pre-stabilization audit`
