# Mission 213 — Audit approfondi de Seven Sieves avant stabilisation de soutenance

Date : 19 août 2026  
Nature : audit strictement diagnostique, sans modification applicative ni écriture MariaDB  
Périmètre : `prototypes/08-dico-seven-sieves`, client Seven Sieves, contrat `POST /analysis` et données `ic_dico` effectivement consommées

## 1. Résumé exécutif

### Faits observés

Seven Sieves constitue un démonstrateur réel, et non une maquette vide. Sa page canonique envoie le texte complet à `POST /analysis`, Dico-IC lit MariaDB, puis le client reconstruit le texte à partir des offsets et affiche les enrichissements des sept tamis. L'appel est stateless : il ne sauvegarde ni texte, ni résultat, ni état apprenant.

Les volumes annoncés dans la mission sont confirmés exactement : **12 langues, 305 entrées conceptuelles, 1 286 formes linguistiques, 41 formes fléchies, 12 aides discursives, 86 relations, 1 règle et 8 traits `ic_feature`**. `INFORMATION_DATA` et `NUIT` possèdent chacune 5 formes et 10 relations. Les 16 relations ajoutées volontairement depuis la Mission 211 ont été préservées.

Le texte espagnol préparé dans la page canonique retourne HTTP 200, contrat `0.1`, **103 tokens, dont 92 mots, et 144 enrichissements**. Au moins un enrichissement est attaché à 89 mots sur 92. Cette forte couverture est cependant très concentrée : 82 enrichissements proviennent du seul tamis 2, « Lexique pan-roman ».

Les constats principaux de la Mission 188 sont toujours vrais :

- les 8 `ic_feature` ne sont jamais chargés par le chemin d'analyse ;
- la page canonique ignore `pedagogical_enrichments`, donc les aides discursives pourtant produites par l'API ;
- seule la variante expérimentale `index-api-live-pedagogical-hints-0.1.html` affiche ces aides ;
- la seule règle Dico-IC `-ción → -tion` alimente à elle seule les tamis 3 et 7 ;
- la configuration Compose reste invalide à cause de `depends_on: docker ps`.

Depuis la Mission 188, la base et l'administration ont fortement progressé : le catalogue compte désormais 7 langues romanes référencées inactives en plus des 5 langues documentées, les deux entrées de démonstration possèdent une matrice complète de 10 relations, et les fiches Dico-IC permettent de les expliquer. Ces progrès ne sont toutefois pas reflétés dans le client Seven Sieves, dont les langues restent codées en dur à ES/FR/IT/PT et qui ne lit pas le catalogue.

### Déduction raisonnable

Le meilleur récit de soutenance n'est pas le texte long préparé. Un texte court rend la causalité beaucoup plus lisible et tient dans la fenêtre de 30 à 45 secondes :

> `Sin embargo, la información circula durante la noche.`

Il permet à l'API de démontrer une aide discursive, la transparence de `información`, la famille pan-romane, la règle `-ción → -tion` et la famille `noche / nuit / notte / noite / night`. Mais, dans l'état actuel, il faut utiliser la **variante expérimentale avec aides** pour rendre `Sin embargo` visible ; la page canonique masque cette partie du résultat.

### Recommandation synthétique

Avant la soutenance, les P0 sont : réparer le démarrage Compose, choisir une unique page de démonstration cohérente et y rendre visibles les aides Dico-IC, ajouter un timeout et empêcher l'affichage silencieux d'une ancienne analyse après échec, puis réaliser une vraie recette Chromium aux deux dimensions demandées. La démonstration doit être préchargée et répétée sans appel IA : Seven Sieves n'en a pas besoin.

### Validation humaine attendue

David doit valider le choix narratif entre `INFORMATION_DATA` seul, très simple, et le scénario combiné avec `NUIT` et une aide discursive. Il doit aussi chronométrer le parcours sur le dispositif réel de soutenance après correction des P0. La recette de Codex ne constitue pas cette validation humaine.

## 2. Périmètre, méthode et arbitrage d'instructions

### Faits observés

Le dépôt était propre au début de la mission. Le numéro maximal de rapport était 212 et le chemin demandé pour ce rapport était libre.

La mission autorise explicitement comme seule écriture Git `reports/213_seven_sieves_pre_stabilization_deep_audit.md`. La section « Mode d'audit technique » de `AGENTS.md` demande au contraire une restitution hors dépôt, dans `IC-Lab-Next-Technical`. Cette contradiction avait déjà été signalée et explicitement arbitrée par David lors de la Mission 188 en faveur de `IC-Lab-Next/reports/`. Le présent audit respecte cet arbitrage et la mission 213, plus spécifique. Aucun autre fichier du dépôt n'a été créé ou modifié.

Méthode employée :

- lecture du code, du contrat, de l'architecture et des rapports 188 à 212 ;
- requêtes MariaDB `SELECT` uniquement ;
- empreintes SHA-256 déterministes sur `SELECT * ... ORDER BY id` ;
- appels HTTP GET et `POST /analysis`, ce POST étant contractuellement stateless et sans écriture ;
- tests ciblés préalablement vérifiés comme isolés de la base réelle ;
- tentative de recette avec le navigateur Chromium intégré ;
- aucune route `/admin/ai/*`, aucune route d'écriture et aucun fournisseur externe appelés.

## 3. Cartographie réelle des pages et variantes

| Surface | Statut réel | Fichiers actifs | Données / appels | Observation |
|---|---|---|---|---|
| `index-api-live-0.1.html` | **Canonique** : lien de `PROJECTS_LAUNCH.md` | HTML avec CSS embarqué + `js/seven-sieves-api-live-v0.js` | `POST http://localhost:3000/analysis`; mock seulement après indisponibilité | Affiche les 7 tamis, mais ignore les aides discursives transversales |
| `index-api-live-pedagogical-hints-0.1.html` | Variante expérimentale | HTML avec CSS embarqué + `js/seven-sieves-tamis4-pedagogical-hint-v0.js` | même API et même mock | Affiche les `connector_help`, mais ajoute aussi 4 heuristiques locales du tamis 4 |
| `index-api-mock-0.1.html` | Démonstrateur hors ligne / mock | HTML + `mock/seven-sieves-mock-v0.js` + `mock/analysis-response-v0.json` | aucun accès MariaDB ou API live | Réponse figée ancienne, un résultat illustratif par tamis ; ce n'est pas une preuve des données actuelles |
| `index-0.0.8.2.html` | Historique autonome | HTML, CSS et JavaScript entièrement embarqués | catalogues et règles locaux statiques | Ne consomme pas Dico-IC ; utile seulement comme archive fonctionnelle |

Les quatre pages et leurs quatre ressources associées sont servies avec HTTP 200 par Express. La page canonique est explicitement désignée dans `PROJECTS_LAUNCH.md` et `docs/ARCHITECTURE.md`.

Le volumineux JavaScript historique reste copié dans les pages API sous `<script type="text/plain" id="legacy-prototype-script">`. Il n'est pas exécuté, mais alourdit chaque fichier, complique la lecture du code et peut laisser croire qu'une partie des catalogues locaux participe encore au fonctionnement live.

### États fonctionnels du client live

| État | Comportement observé dans le code |
|---|---|
| Initial | Texte préparé visible, aucun paquet chargé, badge « API prête à être appelée » |
| Chargement | bouton désactivé, badge « Analyse en cours… », aucun timeout |
| Succès | paquet validé, état local remis à zéro, texte reconstruit, compteurs et warnings affichés |
| Texte vide | refus local, focus sur la zone de texte |
| HTTP 4xx | « Requête refusée », pas de bouton de fallback |
| Réseau ou HTTP 5xx | « API indisponible », bouton « Charger le mock de développement » |
| Mock réussi | paquet figé chargé et texte remplacé par celui du mock |
| Aucun résultat | texte affiché, panneaux indiquant l'absence d'enrichissement ; pas de warning de couverture |

Risque confirmé par lecture du flux : si une analyse a déjà réussi puis qu'une nouvelle requête échoue, `analysisPackage` n'est pas effacé. L'ancien résultat reste donc affiché alors que le texte saisi peut avoir changé. Le message d'erreur est présent, mais l'écran peut visuellement associer des résultats périmés au nouveau texte.

## 4. Architecture et flux réels

```text
Page Seven Sieves statique
  └─ un POST /analysis avec texte + langues + [1..7]
       └─ Express / contrat 0.1
            └─ repository mysql2, SELECT uniquement
                 ├─ language
                 ├─ lexical_entry / lexical_form
                 ├─ inflected_form VALIDATED
                 ├─ form_relation
                 ├─ pattern_rule
                 └─ connector_help VALIDATED (ES/FR)
            └─ calculs en mémoire : tokens, heuristiques, regroupements, warnings
  └─ rendu local + états apprenant en mémoire JavaScript
```

Seven Sieves ne lit jamais MariaDB directement. Dico-IC, l'administration et les pages Seven sont néanmoins servis par le même processus Express sur le port 3000 : la frontière API est réelle, mais il ne s'agit pas encore de services déployés indépendamment.

### Services nécessaires

- MariaDB `ic_dico`, conteneur `ic_dico_mariadb_next`, port 3306 ;
- serveur Node/Express Dico-IC, port 3000 ;
- phpMyAdmin, port 8080, inutile à la démonstration Seven Sieves ;
- aucun fournisseur IA, aucune clé OpenAI et aucun accès Internet ne sont nécessaires à `POST /analysis`.

Le client ne possède aucune action d'écriture serveur. Les sélections et statuts « compris / doute / inconnu » restent en mémoire dans la page et disparaissent au rechargement.

## 5. Tableau des sept tamis

| # | Nom public | Logique effective | Source réelle | Affiché ? | Écart ou limite de compréhension |
|---:|---|---|---|---|---|
| 1 | Lexique international | Cherche, parmi les relations cognates de la forme source, la meilleure relation vers la langue de médiation | `lexical_form` + `form_relation`; donnée Dico-IC | Oui | Ignore entièrement les 8 relations `FALSE_FRIEND`; « international » est plus large que le calcul réellement binaire source→médiation |
| 2 | Lexique pan-roman | Pour une entrée reconnue, affiche les formes des langues demandées dès qu'au moins 3 langues sont présentes | coappartenance à `lexical_entry`, formes `lexical_form`; calcul local | Oui | Ne lit aucune relation ni preuve de parenté ; inclut aussi l'anglais si demandé par API ; la page ne permet pas de le demander |
| 3 | Correspondances phonétiques | Applique les `SUFFIX_TRANSFORM`; actuellement uniquement ES `-ción` vers FR `-tion` | 1 `pattern_rule` Dico-IC + calcul de chaîne | Oui | Le calcul est graphique, pas phonétique. `organización` donne la piste non attestée `organization`, alors que le français est `organisation` |
| 4 | Graphies / prononciations | Repère localement `c` devant `e` ou `i` en espagnol | heuristique en mémoire serveur | Oui, statut expérimental | Pas de ressource Dico-IC ; la variante aides ajoute encore 4 règles locales (`ñ`, `-ción`, `-dad`, `-mente`) |
| 5 | Syntaxe pan-romane | Si la forme lexicale a POS `verb`, la marque « Verbe probable » | POS de `lexical_form` + heuristique locale | Oui, statut expérimental | N'analyse ni phrase ni syntaxe pan-romane ; aucun sujet ou complément n'est produit par le moteur actuel |
| 6 | Morphosyntaxe | Pluriel de nom attesté via `inflected_form`, ou infinitif ES probable si POS verb et finale `-ar/-er/-ir` | donnée Dico-IC pour les pluriels ; heuristique pour les infinitifs | Oui, statut expérimental | Deux niveaux de preuve très différents sont réunis sous le même tamis |
| 7 | Préfixes / suffixes | Réutilise la même règle `-ción → -tion` pour signaler le suffixe `-ción` | 1 `pattern_rule` Dico-IC | Oui | Aucun préfixe, aucun autre suffixe ; duplication partielle du tamis 3 |

### Catégories de provenance réellement rencontrées sur le texte préparé

| Provenance | Résultats |
|---|---:|
| `lexical_form` | 82 |
| `form_relation` | 6 |
| `pattern_rule` | 20 |
| `heuristic` | 29 |
| `inflected_form` | 7 |
| `ic_feature` | 0 |

Le contrat autorise `source.kind = ic_feature` et cite ces traits comme source potentielle de confiance, mais `loadAnalysisResources()` ne les sélectionne pas. Le contrat donne aussi un exemple du tamis 2 sourcé par `form_relation`, alors que l'implémentation réelle annonce `lexical_form` et ne consulte aucune relation pour ce tamis.

## 6. Consommation réelle de Dico-IC

| Ressource | Volume | Usage Seven Sieves actuel | Donnée disponible mais invisible / inutilisée |
|---|---:|---|---|
| `language` | 12 | `/analysis` valide contre les 5 langues actives | la page ne lit ni `/languages` ni `/language-catalog`; elle code en dur ES/FR/IT/PT et masque EN ainsi que les 7 référencées |
| `lexical_entry` | 305 | pivot conceptuel implicite du tamis 2 | clé, domaine, gloses et provenance conceptuelle non visibles |
| `lexical_form` | 1 286 | reconnaissance exacte, POS, familles multilingues | confiance et provenance peu explicitées dans le client |
| `inflected_form` | 41, toutes `VALIDATED` | résolution de surface + pluriels nominaux au tamis 6 | formes FR possibles via API mais non adaptées au récit ES par défaut |
| `form_relation` | 86 | seules les 78 relations dont le type commence par `COGNATE` sont éligibles au tamis 1 | 8 `FALSE_FRIEND` totalement ignorées ; une seule meilleure relation vers la médiation est rendue par occurrence |
| `connector_help` | 12, toutes `VALIDATED` | l'API produit `pedagogical_enrichments` pour ES/FR | invisibles dans la page canonique, visibles uniquement dans la variante expérimentale |
| `pattern_rule` | 1 | tamis 3 et 7 | catalogue trop étroit ; résultat calculé parfois non attesté |
| `ic_feature` | 8 | aucun | 3 `FALSE_FRIEND_RISK`, 4 `TRANSPARENCY_SCORE`, 1 `GRAPHIC_SIMILARITY` inutilisés |

La réponse du scénario `Sin embargo, la información circula.` contient bien une aide `connector_help` couvrant les tokens `Sin` et `embargo`. Le test automatisé intitulé « Seven Sieves consumes API connector help without a local catalogue » vérifie uniquement le script de la variante expérimentale, pas celui de la page canonique. Il ne couvre donc pas le parcours documenté comme canonique.

### Entrées de démonstration

#### `INFORMATION_DATA`

- 5 formes : ES `información`, FR `information`, IT `informazione`, PT `informação`, EN `information` ;
- 10 relations sur les 10 paires possibles, toutes `COGNATE_STRONG` ;
- scores de 0,930 à 0,990 ;
- `información` en ES→FR produit les tamis 1, 2, 3 et 7.

#### `NUIT`

- 5 formes : ES `noche`, FR `nuit`, IT `notte`, PT `noite`, EN `night` ;
- 10 relations sur les 10 paires possibles, 9 `COGNATE_WEAK` et 1 `COGNATE_STRONG` (`notte`↔`noite`) ;
- `noche` en ES→FR produit le tamis 1 avec confiance 0,450 et le tamis 2 avec les cinq formes ;
- les appels inversés testés (`nuit` FR→ES, `notte` IT→FR, `noite` PT→FR et `night` EN→FR) produisent aussi les tamis 1 et 2 ;
- EN est testable par API mais pas sélectionnable dans la page.

#### Faux amis

Les 8 relations `FALSE_FRIEND`, par exemple `actuellement`↔`actualmente`, sont filtrées hors du tamis 1. Le test `Actualmente largo.` ne signale aucun faux ami. `largo` obtient seulement une famille pan-romane donnant correctement ES `largo`, FR/EN `long`, IT `lungo`, PT `longo`. Une capacité de prudence documentée en base existe donc, mais Seven Sieves ne l'expose pas.

## 7. Essais de parcours

| Candidat | Résultat réel | Tamis | Durée estimée | Verdict |
|---|---|---|---:|---|
| `La información circula.` | 4 tokens, 7 enrichissements ; `información→information` et famille à 5 langues | 1, 2, 3, 7, plus heuristiques sur `circula` | 25–35 s | Le plus sûr et le plus clair |
| `La noche cae.` | 4 tokens, 3 enrichissements ; famille complète `night/noche/nuit/notte/noite` | 1 et 2 | 25–35 s | Très bon second exemple, plus scientifique mais transparence faible assumée |
| `Las organizaciones participan.` | pluriel attesté de `organización`; 4 enrichissements | 1, 4, 6 | 25–35 s | Bonne preuve d'une forme fléchie, mais moins riche visuellement |
| `Sin embargo, la información circula.` | 8 enrichissements tokenisés + une aide discursive transversale | 1, 2, 3, 4, 5, 7 + aide hors tamis | 30–40 s | Excellent seulement dans la variante aides ; incomplet sur la page canonique |
| texte préparé de 5 phrases | 103 tokens, 144 enrichissements, 89/92 mots enrichis | tous | >45 s pour expliquer utilement | Trop dense ; bon test de charge, mauvais récit court |

## 8. Parcours recommandé en 30–45 secondes

### Parcours principal proposé

Précondition : page avec aides discursives déjà ouverte, serveur et base déjà actifs, texte déjà saisi.

Texte :

```text
Sin embargo, la información circula durante la noche.
```

Actions exactes :

1. cliquer « Analyser avec Dico-IC » ;
2. montrer le badge « API Dico-IC connectée » ;
3. rester sur le tamis 1 et cliquer `información` pour montrer `información → information` ;
4. passer au tamis 2 et cliquer `noche` pour montrer `noche / nuit / notte / noite / night` ;
5. pointer brièvement `Sin embargo` et son aide d'opposition, sans développer tous les panneaux.

Formulation orale fidèle :

> « Seven Sieves ne traduit pas la phrase. Il rend visibles des stratégies de compréhension. Dico-IC documente ici le rapprochement entre `información` et `information`, la famille plurilingue de `noche`, et une aide de lecture pour `sin embargo`. Les tamis transforment ces connaissances en indices, avec un statut explicite lorsque le traitement reste expérimental. »

Durée estimée : 35 à 45 secondes après préchargement et répétition.

Fragilité actuelle : ce parcours impose la variante expérimentale non canonique, laquelle mélange aides persistées et 4 heuristiques locales supplémentaires. Il ne doit pas être présenté comme parcours stabilisé tant que ce statut n'a pas été arbitré.

### Parcours principal sans arbitrage de page

Sur la page canonique, utiliser uniquement :

```text
La información circula durante la noche.
```

Montrer `información` au tamis 1 puis `noche` au tamis 2. Durée : 25 à 35 secondes. Ce parcours est plus robuste mais ne prouve pas les aides discursives.

### Parcours de secours hors ligne

Utiliser `index-api-mock-0.1.html`, déjà servi avec son JSON local. Aucun service IA ou MariaDB n'est nécessaire une fois les fichiers statiques accessibles. Dire explicitement :

> « Ceci est le paquet de secours figé ; il démontre le geste d'interface, pas l'état actuel de Dico-IC. »

Le bouton de fallback de la page live apparaît automatiquement sur erreur réseau ou HTTP 5xx. Il n'apparaît pas sur HTTP 4xx. Le mock ne reflète ni les 305 entrées, ni les 86 relations, ni les aides discursives actuelles ; il ne doit pas servir de preuve de données.

## 9. Compréhensibilité de l'interface

### Faits observés dans le DOM et les styles

- l'objectif « explorer un texte avec les tamis » et les interactions clic/double-clic sont expliqués ;
- les sept tamis sont visibles en permanence dans la colonne gauche ;
- les tamis 4, 5 et 6 portent un statut `experimental` dans les données et une info-bulle technique ;
- les warnings s'affichent comme codes bruts répétés `SIEVE_EXPERIMENTAL`, peu adaptés à un jury ;
- la provenance « donnée Dico-IC / règle / heuristique locale » n'est pas synthétisée visuellement ;
- « Seven Sieves » n'est pas défini historiquement ou pédagogiquement dans une phrase autonome ;
- l'anglais n'apparaît dans aucun sélecteur malgré son statut documenté actif et son utilité de comparaison ;
- au-dessus de 1 200 px, la grille comporte trois colonnes fixes de 320 px et 400 px autour du centre ; à 1 200 px ou moins, elle passe en une colonne ;
- les deux tailles demandées, 1440×900 et 1366×768, restent donc dans le mode dense à trois colonnes ;
- la fenêtre d'aide n'a ni rôle de dialogue explicite, ni fermeture au clavier Échap, ni gestion visible du focus.

### Déductions raisonnables

À 1366×768, les trois colonnes laissent environ 566 px à la zone centrale avant ses marges internes. Le texte long, les avertissements, les commandes de langue et les panneaux d'inspection nécessitent donc un défilement important. Pour un parcours court, une phrase unique est nettement préférable.

Le compteur « enrichissements » additionne tous les résultats, sans distinguer les 82 familles lexicales des 29 heuristiques. Il peut impressionner, mais ne constitue pas une mesure scientifique de qualité ou de couverture.

### Limite de validation visuelle

La recette Chromium intégrée n'a pas pu charger la page. Le greffon s'est arrêté avant création du navigateur avec l'erreur : `Trusted RPC dependency must resolve within a configured trusted code path` pour son propre `browser-service.mjs`. Une nouvelle tentative après réinitialisation contrôlée a produit la même erreur. Aucune capture 1440×900 ou 1366×768, aucune vérification visuelle de débordement et aucune lecture de console navigateur ne peuvent donc être affirmées dans cette mission. Ce blocage appartient à l'environnement Codex, pas à Seven Sieves.

## 10. Robustesse de démonstration

| Risque | Fait observé | Impact soutenance |
|---|---|---|
| Démarrage Compose | `docker compose config` refuse le projet : service `docker ps` indéfini | **Bloquant P0** pour le launcher canonique |
| Adresse API | `http://localhost:3000/analysis` codée en dur au lieu d'une URL relative | accès distant/portable fragile ; le navigateur du poste client viserait son propre localhost |
| Timeout | aucun `AbortController`, aucun délai maximal | requête lente = bouton désactivé et écran « Analyse en cours… » sans fin |
| Résultat périmé | ancien `analysisPackage` conservé après échec | risque de montrer un résultat associé à l'ancien texte |
| Dico absent | fallback mock explicite sur réseau/5xx | secours disponible, mais figé et ancien |
| OpenAI absent | aucune dépendance IA dans le flux Seven | aucun impact sur la démonstration analysée |
| MariaDB | indispensable au live | doit être démarrée et contrôlée avant passage |
| phpMyAdmin | non utilisé par Seven | peut rester fermé pendant la démonstration |
| Écritures | aucune dans `POST /analysis`; états locaux en mémoire | parcours sûr pour les données |

Le serveur Node temporaire a répondu moins de deux secondes après son démarrage contrôlé ; les requêtes d'analyse testées ont répondu en moins d'une seconde depuis la machine d'audit. Il s'agit d'observations locales, pas d'un benchmark ni d'une garantie de temps de soutenance.

## 11. Priorisation

### P0 — indispensable avant la soutenance

1. **Réparer et recetter le démarrage canonique** : remplacer la dépendance Compose invalide et vérifier le launcher complet sur la machine de soutenance.
2. **Choisir une unique page Seven canonique** : intégrer l'affichage des `pedagogical_enrichments` dans la page live, ou promouvoir proprement la variante après séparation claire de ses heuristiques locales. Aligner `PROJECTS_LAUNCH.md`, l'admin et les liens.
3. **Sécuriser l'échec d'analyse** : timeout explicite, annulation, et suppression/masquage du paquet précédent dès qu'une nouvelle analyse commence ou échoue.
4. **Préparer une phrase courte et un état déjà analysé** : scénario `información + noche`, avec ou sans `sin embargo` selon l'arbitrage précédent.
5. **Réaliser la recette humaine manquante** à 1440×900 et 1366×768 : absence de débordement, résultat au-dessus de la ligne de flottaison, console sans erreur, rechargement et fallback.

### P1 — amélioration très rentable

- remplacer les codes `SIEVE_EXPERIMENTAL` par une formulation pédagogique courte, détail technique repliable ;
- afficher un badge de provenance par résultat : « Dico-IC », « règle documentée », « heuristique expérimentale » ;
- charger `/languages` ou un endpoint de capacités au lieu de coder quatre langues en dur ; expliquer l'anglais comme langue de comparaison ;
- renommer ou expliquer les tamis 3 et 5 pour correspondre à leur portée réelle ;
- signaler les faux amis au lieu de filtrer silencieusement `FALSE_FRIEND` ;
- réduire le texte par défaut et placer la preuve clé sans défilement ;
- retirer le script historique non exécuté des pages live après conservation dans l'archive historique ;
- rendre le mock identifiable comme snapshot, avec date et périmètre ;
- ajouter des tests qui vérifient la page canonique, le timeout et la disparition du résultat périmé, pas seulement la variante aides.

### Après soutenance

- construire un vrai catalogue de règles, avec transformations attestées et couverture par langue ;
- consommer ou retirer du contrat les `ic_feature`, avec une sémantique validée ;
- faire du tamis 3 une analyse réellement phonétique et du tamis 5 une analyse syntaxique contextualisée ;
- étendre les formes fléchies au-delà des pluriels nominaux validés ;
- modéliser des capacités par langue, distinctes du simple statut documentaire ;
- étudier le support réel de CA/GL/OC/RO/CO/SC/RM ;
- séparer éventuellement le déploiement Dico-IC du client Seven Sieves et démontrer un second consommateur.

## 12. Fichiers concernés par de futures missions

Sans les modifier dans cette mission :

- `prototypes/08-dico-seven-sieves/docker-compose.yml` ;
- `scripts/windows/start-dico-seven.bat` et les launchers globaux, uniquement pour recette après correction Compose ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-api-live-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-api-live-v0.js` ;
- éventuellement `index-api-live-pedagogical-hints-0.1.html` et `js/seven-sieves-tamis4-pedagogical-hint-v0.js` si cette variante est consolidée ;
- `mock/analysis-response-v0.json` et `mock/seven-sieves-mock-v0.js` ;
- `Node/src/analysis.js` et `Node/src/repository.js` pour faux amis, traits IC et capacités ;
- `docs/api-analysis-contract-v0.md`, `PROJECTS_LAUNCH.md`, `docs/ARCHITECTURE.md` ;
- tests `Node/test/analysis.test.js`, `connector-help.test.js` et `static-files.test.js`.

Une évolution de données, de schéma ou de règles linguistiques devra faire l'objet d'une mission séparée avec sauvegarde, validation humaine et retour arrière.

## 13. Contrôles effectués

### Analyse statique

- pages, scripts, contrat, serveur, repository, configuration Compose et documentation de lancement inspectés ;
- quatre variantes et leurs routes cartographiées ;
- absence d'appel IA et d'écriture dans le parcours Seven vérifiée ;
- flux d'erreur, fallback et conservation d'état lus dans le code ;
- priorité et page canonique recoupées avec la documentation actuelle.

### Tests automatisés ciblés

Commande : `node --test test/analysis.test.js test/connector-help.test.js test/static-files.test.js`.

Résultat : **19/19 réussis**, aucune suite en échec. Ces tests utilisent des ressources en mémoire ou des repositories simulés et ne modifient pas MariaDB réelle.

La suite complète n'a pas été lancée : son périmètre comporte des scénarios administratifs et de migration plus larges, sans utilité proportionnée pour cet audit strictement non mutateur.

### Validation HTTP réelle

- 4 pages, 3 scripts et le mock JSON : HTTP 200 ;
- `/languages` : HTTP 200, contrat `0.1`, 5 langues actives/documentées ;
- scénarios `information`, `nuit`, forme fléchie, connecteur et texte préparé : HTTP 200 ;
- langue de comparaison invalide : HTTP 400, erreur structurée `INVALID_LANGUAGE` ;
- aucune requête d'écriture, aucune route IA.

### Commandes refusées ou volontairement non exécutées

- aucun launcher global STOP/START : il aurait perturbé davantage de services que nécessaire ;
- aucun appel OpenAI ;
- aucune migration, aucun seed, aucune route admin d'écriture ;
- aucune réparation du Compose invalide ;
- aucune tentative de contourner le défaut du greffon Chromium par installation ou outil non autorisé.

## 14. Intégrité MariaDB avant/après

Les empreintes sont calculées avec la même projection déterministe que les Missions 207 à 212 : `SELECT * FROM <table> ORDER BY id`, sérialisation JSON avec `decimalNumbers: true`, puis SHA-256.

| Table | Lignes avant/après | SHA-256 avant/après |
|---|---:|---|
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1 286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

Toutes les valeurs finales sont identiques aux valeurs initiales et à l'état final documenté en Mission 212. Aucune écriture MariaDB n'a eu lieu.

## 15. État des services et du dépôt

### Services

David a relancé MariaDB et phpMyAdmin pendant le relevé initial ; ils ont donc été considérés comme préexistants à la phase dynamique :

- `ic_dico_mariadb_next` : encore actif, port 3306 ;
- `ic_lab_next_phpmyadmin` : encore actif, port 8080.

Le port 3000 était libre. La mission a démarré directement un serveur Node Dico-IC, PID 15668, sans migration ni écriture, puis a arrêté uniquement ce processus. Le port 3000 était de nouveau fermé à la clôture. Aucun autre processus n'a été démarré ou arrêté.

### Git

- état initial : propre ;
- état final attendu : seul `reports/213_seven_sieves_pre_stabilization_deep_audit.md` est non suivi ;
- aucun commit, push, branche, stash ou déploiement.

### Version

Aucune version applicative n'a été modifiée. Le contrat reste `0.1`, la page canonique reste `index-api-live-0.1.html` et le package Node conserve sa version actuelle. Mission documentaire uniquement.

## 16. Limites restantes

- aucune validation visuelle Chromium aux deux dimensions, pour la raison environnementale documentée ;
- aucune mesure chronométrée par David sur le dispositif de soutenance ;
- aucun test de panne visuel réel avec une analyse déjà affichée, afin de ne pas utiliser un navigateur de substitution après l'échec du greffon ;
- aucun test du launcher complet, puisque `docker compose config` établit déjà son invalidité et que sa correction était hors mission ;
- aucune évaluation linguistique humaine de la pertinence des scores, règles et formulations ;
- aucune validation scientifique du regroupement des sept tamis.

## Message de commit proposé

```text
docs(seven-sieves): ajouter l'audit de pré-stabilisation mission 213
```
