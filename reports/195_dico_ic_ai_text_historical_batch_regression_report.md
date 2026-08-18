# Mission 195 — Diagnostic historique de la régression des lots de l’assistant IA texte

Date : 2026-08-18  
Composant : `prototypes/08-dico-seven-sieves`  
Nature : diagnostic uniquement, sans correction applicative

## Conclusion

Le blocage actuel est établi : l’interface transmet toutes les formes à examiner à l’API, alors que le serveur refuse strictement toute requête de plus de 100 éléments. Avec 164 formes, la requête est donc rejetée avant l’appel au fournisseur IA.

En revanche, les sources disponibles ne permettent pas d’établir le mécanisme historique exact qui aurait traité les 100 premières formes puis permis une seconde passe, ni d’identifier le changement, le commit ou la date ayant supprimé ce comportement. La condition d’autorisation de la mission n’étant pas satisfaite, aucune correction n’a été implémentée et aucune version n’a été modifiée.

## Périmètre observé

- interface de l’assistant texte : `admin/js/admin-ai-text-0.1.js` et sa page HTML ;
- validation et route serveur : `Node/src/admin-ai-inflected-form.js` et `Node/server.js` ;
- tests ciblés et suite automatisée du composant Node ;
- historique Git du dépôt consolidé et du dépôt Dico antérieur ;
- copies et archives locales identifiées par la documentation de provenance ;
- état MariaDB en lecture seule ;
- état Git et processus locaux à la fin de la mission.

## Interruption de la tentative précédente

David a interrompu volontairement la première formulation de la Mission 195 afin d’éviter l’introduction d’un état de lots complexe non fondé sur le comportement historique attendu.

La tentative interrompue avait commencé à préparer un module de lots et des raccordements HTML/CSS. À la reprise :

- le module `admin/js/admin-ai-text-batches-0.1.js` n’existe pas ;
- le contenu des deux fichiers encore signalés `M` par `git status` — `admin/css/admin-ai-text-0.1.css` et `admin/index-admin-ai-text-0.1.html` — est strictement identique à `HEAD` ;
- `git diff`, `git diff --raw` et `git diff --numstat` ne montrent aucune différence pour ces fichiers ;
- leurs objets Git calculés dans l’arbre de travail sont respectivement identiques aux objets de `HEAD` : `63137bc53f750a2646c4702862312f84ba2cd96d` et `1e7bb093cc0b4a3b6d6ea7aa13cba5b22b21f6a5`.

Il s’agit donc de signaux d’état d’index/horodatage (« racy clean »), pas de modifications applicatives conservées. Aucun nettoyage destructif, reset ou réécriture de ces fichiers n’a été effectué.

## Comportement actuel démontré

Dans `admin/js/admin-ai-text-0.1.js`, le résultat de couverture alimente `reviewItems`, puis la génération construit `items` avec `reviewItems.map(...)`. Il n’existe à cet endroit ni découpage à 100, ni curseur, ni offset, ni sélection du reliquat. Les 164 éléments sont donc envoyés dans la même requête.

Dans `Node/src/admin-ai-inflected-form.js`, `MAX_INFLECTED_CANDIDATES` vaut 100. La validation rejette un tableau plus long avec :

- code : `INFLECTED_ITEM_LIMIT_EXCEEDED` ;
- message : `La génération est limitée à 100 formes.`

Contrôle déterministe direct du validateur :

| Nombre d’éléments | Résultat |
|---:|---|
| 1 | accepté |
| 99 | accepté |
| 100 | accepté |
| 101 | rejeté avec `INFLECTED_ITEM_LIMIT_EXCEEDED` |
| 164 | rejeté avec `INFLECTED_ITEM_LIMIT_EXCEEDED` |

Le refus intervient avant toute génération OpenAI. Le symptôme décrit est donc reproduit au niveau du contrat serveur sans écriture de données et sans appel externe.

## Recherche historique

### Dépôt consolidé IC-Lab-Next

- Le commit courant observé au début de l’investigation est `3855d7e` (`fix(dico): autoriser la documentation manuelle des langues référencées`).
- `git log --follow` et `git blame` rattachent les fichiers concernés au commit racine de consolidation `f063ecf` du 2026-07-10.
- Ce commit contient déjà le comportement actuel : envoi de tout `reviewItems` par l’interface et rejet serveur au-delà de 100.
- Ce commit n’a pas de parent dans ce dépôt ; il ne permet donc pas de comparer une version antérieure.
- Les recherches par contenu (`reviewItems.map`, `MAX_INFLECTED_CANDIDATES`, `slice`, `offset`, `cursor`, reliquat) ne révèlent aucun ancien mécanisme de progression versionné.

### Dépôt Dico antérieur et copies locales

La provenance documentée indique que Dico vient d’un dépôt autonome dont l’historique imbriqué n’a pas été conservé lors de la consolidation. Le dépôt antérieur `Applications/Dico` a été inspecté en lecture seule avec son chemin déclaré comme répertoire Git sûr uniquement pour la commande.

- Son historique visible ne contient que trois commits généraux (`3f60c5b`, `982dbfc`, `7eb3bf6`).
- Les répertoires `admin/`, `Node/src`, leurs tests et les rapports concernés y sont non suivis : aucun historique Git exploitable n’existe pour ces fichiers.
- Les trois copies trouvées de `admin-ai-text-0.1.js` dans Dico, IC-Lab et IC-Lab-Next ont le même contenu, la même longueur et le même SHA-256 ; elles exposent toutes le comportement actuel.
- L’archive locale `dico-ic.zip` est antérieure à l’ajout des fichiers d’administration et du serveur concernés ; elle ne contient pas d’implémentation comparable.
- Les rapports historiques consultés documentent une limite de 100 par appel et une interface sans état, mais ne décrivent ni une troncature client aux 100 premiers éléments, ni un curseur, ni la progression d’un lot suivant. Une étude historique laisse même la taille de lot comme question ouverte.

### Résultat de l’enquête

Le souvenir fonctionnel — valider/créer les associations proposées, puis relancer l’analyse du même texte pour poursuivre — est cohérent avec le modèle de données actuel, mais le mécanisme initial du premier lot n’est pas prouvé.

Une fois des associations explicitement créées, une nouvelle analyse de couverture peut logiquement reconnaître ces formes comme déjà connues et les retirer de `forms_to_review`. C’est une inférence à partir du code actuel, pas une preuve du comportement historique. Il reste impossible de déterminer si l’ancienne première passe reposait sur une troncature de l’interface, une troncature du serveur ou un autre mécanisme.

La cause technique actuelle est donc connue, mais la cause historique de la régression et le moment de son introduction ne peuvent pas être attribués avec les éléments disponibles.

## Décision et absence de correction

La mission demande explicitement d’arrêter l’implémentation si l’histoire est insuffisante. Ce garde-fou s’applique ici.

- Aucun état de session, curseur ou système de lots n’a été ajouté.
- Aucun `slice(0, 100)` supposé n’a été introduit sans preuve historique.
- Le plafond serveur de 100 est inchangé.
- Aucun fichier applicatif, test applicatif, schéma ou donnée n’a été modifié.
- Aucune dépendance n’a été installée ou mise à jour.

Avant/après : comportement applicatif strictement inchangé. Le rapport est le seul artefact substantiel créé par cette reprise.

## Versions

- page d’administration principale : `0.1.5`, inchangée ;
- contrat API : `0.1`, inchangé ;
- package Node : `1.0.0`, inchangé.

Une mission de diagnostic seule ne justifie aucune incrémentation.

## Contrôles réalisés

### Analyse statique

- inspection ciblée du flux couverture → `reviewItems` → génération ;
- inspection de la limite et des erreurs serveur ;
- recherche de mécanismes de lot, troncature, offset et curseur ;
- `node --check` réussi pour `src/admin-ai-text.js`, `src/admin-ai-inflected-form.js`, `server.js` et `admin/js/admin-ai-text-0.1.js`.

### Tests automatisés

- `node --test test/admin-ai-text.test.js test/admin-ai-inflected-form.test.js` : 19 tests réussis sur 19 ;
- `npm.cmd test` : 121 tests réussis sur 121.

Ces tests confirment l’intégrité du comportement courant ; ils ne prouvent pas l’existence d’une progression historique au-delà de 100.

### MariaDB, données et volumes

Le contrôle en lecture seule `node scripts/manage-referenced-romance-languages.js --check` retourne l’état `applied` :

- 12 langues ;
- langues référencées `ca`, `gl`, `oc`, `ro`, `co`, `sc`, `rm` toujours inactives et sans dépendance ;
- 150 entrées lexicales ;
- 597 formes lexicales ;
- 16 formes fléchies ;
- 12 aides connecteurs ;
- 70 relations de formes ;
- 1 règle de motif ;
- 8 caractéristiques IC.

Aucune migration, écriture, réinitialisation ou restauration n’a été exécutée.

### Validation visuelle

Aucune validation visuelle Chromium n’a été lancée : aucune correction d’interface n’a été réalisée et aucun nouvel état visuel n’existe à vérifier à 1440 px ou 1366 px. Le défaut courant est établi directement dans le chemin de données et par le validateur. Une recette visuelle de progression au-delà de 100 serait trompeuse tant que le mécanisme historique ou une décision produit explicite n’autorise pas une correction.

### Processus

Aucun serveur n’a été démarré pendant cette reprise. Le contrôle final ne trouve aucun processus à l’écoute sur les ports 3000, 3100 et 3194 ; aucun processus n’a donc dû être arrêté.

## Éléments non vérifiés et limites

- Aucun artefact exécutable pré-régression n’a été retrouvé.
- La progression réelle « 100 puis reliquat » ne peut pas être démontrée dans l’état courant, puisque la première requête de 164 éléments est bloquée.
- Aucun appel OpenAI réel n’a été effectué.
- Aucune validation fonctionnelle humaine de David n’a été revendiquée.
- Le statut Git inhabituel des deux fichiers identiques à `HEAD` est conservé tel quel afin de ne pas altérer silencieusement l’arbre de travail.

## Suite nécessaire

Deux voies permettraient de reprendre sans inventer l’histoire :

1. fournir un snapshot, une archive, une capture de session ou une version réellement antérieure contenant le comportement validé ;
2. à défaut, autoriser explicitement une correction minimale déduite — probablement limiter l’envoi initial aux 100 premières formes, puis s’appuyer sur une nouvelle analyse après création des associations — en l’assumant comme décision actuelle et non comme restauration historiquement prouvée.

## Commit

Aucun commit ni push n’a été effectué. Aucun message de commit applicatif n’est proposé puisqu’aucune correction n’existe. Si le rapport documentaire doit être versionné seul, proposition :

`docs(dico): documenter le diagnostic historique de la mission 195`

