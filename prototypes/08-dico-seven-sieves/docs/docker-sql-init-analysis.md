# Analyse de l'initialisation SQL avec Docker

## Objet et limites

Ce document prépare une stratégie prudente pour tester le brouillon `database/current_draft/` avec Docker et MariaDB.

L'analyse est statique : Docker n'a pas été lancé, `docker-compose.yml` n'a pas été modifié et aucun fichier n'a été déplacé ou supprimé. Le dossier `current_draft/` reste un brouillon exploratoire, non une version finale validée.

## État actuel de `docker-compose.yml`

Le service `mariadb` utilise notamment :

```yaml
image: mariadb:11
environment:
  MARIADB_DATABASE: ic_dico
volumes:
  - mariadb_data:/var/lib/mysql
  - ./db:/docker-entrypoint-initdb.d
```

Le chemin `./db` est interprété relativement au dossier contenant `docker-compose.yml`. Il est donc monté dans le conteneur sous `/docker-entrypoint-initdb.d`.

MariaDB examine ce répertoire d'initialisation lors de la première création de son répertoire de données. Les fichiers SQL qui s'y trouvent sont alors traités dans l'ordre lexical de leurs noms.

Le volume nommé `mariadb_data` conserve les données entre les démarrages. Si ce volume contient déjà une base initialisée, ajouter ou modifier des scripts dans le répertoire monté ne provoque pas automatiquement leur nouvelle exécution.

## Vérification du dossier `db/`

Le dossier `db/` existe actuellement à la racine du projet, mais il est vide.

Le montage indiqué dans `docker-compose.yml` pointe donc vers un chemin réel, mais aucun script SQL n'y est actuellement disponible pour l'initialisation automatique.

Le constat initial doit ainsi être précisé :

- le montage ne pointe pas vers un dossier absent ;
- il pointe vers un dossier existant et vide ;
- les scripts SQL du projet se trouvent principalement dans `database/` ;
- le brouillon consolidé se trouve dans `database/current_draft/`.

## Comparaison avec `database/current_draft/`

Le dossier `database/current_draft/` contient :

1. `00_schema.sql`
2. `10_procedures.sql`
3. `20_seed_base.sql`
4. `30_seed_experimental.sql`
5. `README.md`

Les préfixes numériques fournissent l'ordre logique attendu : schéma, procédures, données minimales, puis données expérimentales.

La vérification théorique précédente conclut que cet ordre semble cohérent pour une base fraîche. Elle ne remplace toutefois pas un essai réel avec MariaDB. La rejouabilité, le comportement des procédures et l'encodage restent notamment à confirmer.

## Point d'attention sur l'initialisation Docker

Même avec un montage correct, deux situations doivent être distinguées :

### Première initialisation

Si le répertoire `/var/lib/mysql` est vide, MariaDB peut exécuter les fichiers `.sql` présents dans `/docker-entrypoint-initdb.d`, dans l'ordre lexical.

Dans ce cas, les noms `00_`, `10_`, `20_` et `30_` conviennent à l'ordre attendu.

### Volume déjà initialisé

Si `mariadb_data` contient déjà une base, les scripts d'initialisation ne sont normalement pas rejoués au redémarrage.

Un test du brouillon doit donc utiliser un environnement de test explicitement identifié et une base fraîche. Il ne faut pas supprimer un volume existant sans avoir d'abord vérifié son contenu et sans décision explicite, car cette opération détruirait les données qu'il contient.

## Options possibles

### Option 1 : modifier le volume vers `./database/current_draft`

Modification envisagée :

```yaml
volumes:
  - mariadb_data:/var/lib/mysql
  - ./database/current_draft:/docker-entrypoint-initdb.d:ro
```

Avantages :

- le brouillon est testé directement, sans copie intermédiaire ;
- l'ordre numérique des scripts est conservé ;
- le montage en lecture seule `:ro` protège les fichiers depuis le conteneur.

Limites :

- cela modifie la configuration Docker existante ;
- `30_seed_experimental.sql` serait chargé automatiquement lors d'une initialisation fraîche ;
- un volume `mariadb_data` déjà initialisé empêcherait un nouveau déclenchement automatique ;
- la configuration principale dépendrait directement d'un dossier explicitement non final.

Cette option est simple techniquement, mais elle donne au brouillon une place trop centrale tant qu'il n'est pas validé.

### Option 2 : utiliser `db/` comme dossier dédié au test

Le dossier `db/` existe déjà et correspond au montage actuel. Il pourrait recevoir, pour une campagne de test déterminée, des copies contrôlées des quatre scripts du brouillon.

Avantages :

- `docker-compose.yml` reste inchangé ;
- le contenu réellement présenté à MariaDB est visible dans un espace dédié ;
- le brouillon source reste séparé du point d'initialisation Docker ;
- le jeu expérimental peut être inclus ou écarté explicitement selon le test.

Limites :

- les copies peuvent diverger de `database/current_draft/` ;
- il faut noter leur provenance et leur date de préparation ;
- une modification ultérieure du brouillon impose de renouveler les copies ;
- le volume de données doit malgré tout être frais pour déclencher l'initialisation.

Pour limiter les ambiguïtés, `db/` devrait être présenté comme une zone de test temporaire et non comme une nouvelle source de vérité.

### Option 3 : utiliser une commande manuelle d'import SQL

Cette approche conserve le montage actuel et importe explicitement les scripts, dans l'ordre, dans une instance MariaDB de test déjà démarrée.

Ordre d'import à respecter :

```text
00_schema.sql
10_procedures.sql
20_seed_base.sql
30_seed_experimental.sql
```

Avantages :

- aucun changement de `docker-compose.yml` ;
- aucune copie nécessaire dans `db/` ;
- chaque étape peut être observée séparément ;
- le seed expérimental peut être exécuté seulement après validation des trois premières étapes ;
- l'échec éventuel peut être associé au fichier précis qui vient d'être importé.

Limites :

- la procédure est moins automatique ;
- la commande exacte dépend du terminal et de la manière dont le client MariaDB est appelé ;
- les scripts contenant `DELIMITER` doivent être transmis à un client compatible, et non exécutés comme de simples requêtes isolées ;
- une base de test fraîche ou clairement isolée reste nécessaire.

Cette option convient bien à une première validation exploratoire, car elle garde les décisions visibles et progressives.

## Recommandation prudente

Pour le premier test du brouillon, l'option la plus prudente est **l'import manuel, fichier par fichier, dans une instance MariaDB de test isolée et fraîche**.

Cette approche est recommandée parce qu'elle :

- ne modifie pas la configuration Docker existante ;
- ne crée pas de seconde copie susceptible de devenir une source concurrente ;
- permet d'arrêter le test après le schéma, les procédures ou le seed minimal ;
- maintient `30_seed_experimental.sql` comme une étape explicitement facultative ;
- rend plus facile l'identification du premier fichier en échec.

Une fois ce premier passage compris et documenté, l'option 2 peut devenir un moyen simple de répéter un test complet : `db/` servirait alors de zone d'initialisation dédiée, préparée explicitement à partir du brouillon. Cette évolution devrait rester documentée afin que `db/` ne soit pas confondu avec la source du SQL.

Il est déconseillé, à ce stade, de modifier directement le montage principal vers `./database/current_draft`, car cela ferait dépendre l'initialisation standard d'un brouillon encore expérimental et chargerait automatiquement les données expérimentales sur toute base fraîche.

## Stratégie de test proposée

Sans exécuter ces opérations maintenant, une campagne prudente pourrait suivre les étapes suivantes :

1. Identifier une instance MariaDB strictement dédiée au test.
2. Vérifier qu'aucune donnée utile n'est attachée au volume ou à la base choisis.
3. Préparer une base fraîche distincte de tout environnement de travail existant.
4. Importer `00_schema.sql` et vérifier la création des tables.
5. Importer `10_procedures.sql` et vérifier la présence des procédures `sp_`.
6. Importer `20_seed_base.sql` et vérifier les langues minimales.
7. Décider explicitement si les données exploratoires doivent être incluses.
8. Importer éventuellement `30_seed_experimental.sql` et contrôler les relations et traits créés.
9. Consigner les erreurs, avertissements, versions d'image et conditions du test.
10. Ne promouvoir aucune configuration ni aucun script comme version finale à partir de ce seul essai.

## Questions à conserver ouvertes

- Le volume `mariadb_data` contient-il déjà des données utiles sur les machines où le projet a été lancé ?
- Le test doit-il couvrir uniquement le schéma et les procédures, ou également les données expérimentales ?
- `db/` est-il destiné à devenir une zone de staging Docker ou s'agit-il d'un dossier historique vide ?
- Faut-il, à terme, un fichier Compose de test séparé afin de ne pas toucher à la configuration principale ?
- Quelle version mineure exacte de MariaDB doit servir de référence reproductible au-delà de l'étiquette générale `mariadb:11` ?

## Conclusion

Le montage actuel de `docker-compose.yml` est valide en tant que chemin, mais il ne charge aucun SQL puisque `db/` est vide. Le brouillon ordonné se trouve dans `database/current_draft/` et n'est pas monté actuellement.

Pour un projet exploratoire, un premier import manuel et progressif dans une base de test isolée constitue l'option la plus prudente. L'utilisation ultérieure de `db/` comme zone dédiée peut faciliter les répétitions, à condition de documenter clairement qu'il s'agit de copies de test. Le montage direct de `database/current_draft/` reste possible, mais il devrait attendre que le rôle et le contenu du brouillon soient mieux validés.
