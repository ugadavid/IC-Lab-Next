# IC-Lab Hub V0.8.1 - MariaDB

Cette couche MariaDB est experimentale mais durcie jusqu'a la V0.8.1. Le mode JSON reste le mode par defaut et les fichiers JSON ne sont pas supprimes.

## Prerequis

- MariaDB accessible sur `127.0.0.1:3306`
- Base creee manuellement : `ic_hub`
- Utilisateur cree manuellement : `ic_hub_user`
- Ne pas toucher a la base `ic_dico`

Variables attendues :

```env
IC_HUB_STORE=mariadb
IC_HUB_DB_HOST=127.0.0.1
IC_HUB_DB_PORT=3306
IC_HUB_DB_NAME=ic_hub
IC_HUB_DB_USER=ic_hub_user
IC_HUB_DB_PASSWORD=ic_hub_pass
```

Un modele est disponible dans `server/.env.example`.

## Installation dependance

```powershell
cd prototypes/00-ic-hub/server
npm install
```

La seule dependance ajoutee est `mysql2`.

## Migration JSON vers MariaDB

```powershell
cd prototypes/00-ic-hub/server
node db/migrate-json-to-mariadb.js
```

Dry-run :

```powershell
node db/migrate-json-to-mariadb.js --dry-run
```

Le script :

- se connecte a `ic_hub`;
- execute `db/schema.sql`;
- execute `db/procedures.sql`;
- lit les fichiers JSON existants;
- insere/met a jour les tables avec `INSERT ... ON DUPLICATE KEY UPDATE`;
- ne fait pas de `DROP TABLE` et ne supprime pas les fichiers JSON.

La V0.7 migre aussi `data/ai-configs.json` vers `ai_configs` et `activity_ai_config`.

La V0.8 migre le catalogue providers/modeles IA depuis `data/ai-providers.json` et `data/ai-models.json`. La V0.8.1 enrichit ces modeles avec `data/ai-model-metadata.json` avant ecriture MariaDB, afin de renseigner descriptions courtes, recommandation IC-Lab, prix connus ou a completer, source tarifaire et date de verification.

## Procedures stockees

Le fichier `db/procedures.sql` installe les routines critiques du mode MariaDB :

- `sp_create_run` : cree un run de maniere atomique;
- `sp_append_run_event` : ajoute un evenement et met a jour le statut/dates/duree du run dans une transaction DB;
- `sp_assign_activity_with_ownership` : cree une assignation et cree ou reutilise le record ownership dans une transaction DB;
- `vw_activity_ownership_full` : vue diagnostique de lecture ownership/prototype/owner/institution.

Les procedures peuvent etre reinstallees par la migration :

```powershell
node db/migrate-json-to-mariadb.js
```

`DROP PROCEDURE IF EXISTS` et `DROP VIEW IF EXISTS` sont utilises uniquement pour les routines/vues. Les tables et les donnees ne sont pas supprimees.

Verification des routines :

```powershell
node db/check-db-routines.js
```

## Verification de coherence

```powershell
cd prototypes/00-ic-hub/server
node db/check-db-consistency.js
```

La commande affiche les counts principaux et les incoherences detectees :

- runs sans evenements;
- evenements sans run;
- assignations sans cours ou sans prototype;
- inscriptions sans user ou sans course;
- ownership sans prototype connu;
- doublons potentiels `prototypeId + activityId + activitySource`.

## Tables AIConfig

La V0.7 ajoute :

- `ai_configs` : profils de configuration IA/voix par prototype, sans secret ni appel provider;
- `activity_ai_config` : table de liaison preparatoire entre une activite referencee et une configuration IA.
- `course_activities.ai_config_id` : configuration IA/voix choisie pour une assignation de cours.

Les profils seedes pour `proto06` couvrent :

- mode scenarise + voix navigateur;
- IA texte future + voix navigateur;
- IA texte future + voix API;
- agent vocal temps reel futur;
- multi-agents experimental.

Les couts restent qualitatifs : `free`, `low`, `medium`, `high`, `very-high`.

## Catalogue modeles IA

La V0.8.1 ajoute des metadonnees non secretes au catalogue `ai_models` :

- `short_description` : resume admin lisible;
- `ic_lab_recommendation` : statut d'usage IC-Lab/Proto06;
- `pricing_json` et colonnes tarifaires (`input_price_usd`, `cached_input_price_usd`, `output_price_usd`, `pricing_unit`, `pricing_source`, `pricing_last_checked_at`);
- enrichissement heuristique local pour famille, modalite, capacites, cout qualitatif et usage recommande.

Les prix inconnus restent explicitement `null` avec une source `manual_review_required` ou un affichage "Prix non renseigne". Aucun prix n'est invente par le hub.

En V0.7.1, l'association prioritaire se fait au niveau de l'assignation (`course_activities.ai_config_id`) afin qu'une meme activite puisse etre scenarisee dans un cours et associee a un mode IA futur dans un autre. La table `activity_ai_config` reste disponible pour une evolution plus fine.

## Repartition des responsabilites

Cote Node :

- authentification et roles;
- validation d'acces aux cours;
- filtrage des payloads apprenants avant stockage;
- hash du `launchToken`;
- logique de visibilite effective;
- fallback JSON.
- exposition API des configurations IA;
- edition admin de metadonnees non secretes.

Cote MariaDB :

- atomicite creation de run;
- coherence `runs` + `run_events`;
- coherence `course_activities` + `activity_ownership`;
- diagnostics routines et vue ownership.
- stockage des profils `ai_configs`.
- persistance du mode choisi dans `course_activities.ai_config_id`.

## Lancement serveur

Mode JSON, par defaut :

```powershell
node server.js
```

Mode MariaDB :

```powershell
$env:IC_HUB_STORE="mariadb"
node server.js
```

Si MariaDB est indisponible au demarrage ou pendant une operation, le serveur bascule temporairement en fallback JSON et log l'erreur.

Endpoint de verification runtime :

```powershell
Invoke-RestMethod http://127.0.0.1:8790/api/health
Invoke-RestMethod http://127.0.0.1:8790/api/health/db
```

En mode MariaDB, la reponse inclut le store actif, la base utilisee, quelques counts rapides et le dernier message d'erreur DB s'il existe. Le mot de passe n'est jamais expose.

## Retour arriere

Fermer le serveur, puis relancer sans `IC_HUB_STORE=mariadb` :

```powershell
Remove-Item Env:\IC_HUB_STORE
node server.js
```

Les fichiers JSON restent la source de secours.

## Limites

- La couche MariaDB est une premiere abstraction compatible avec les stores JSON.
- Les dates restent stockees en chaines ISO pour preserver les donnees prototype.
- Les operations sensibles runs/events et assignation/ownership passent par des procedures stockees transactionnelles en mode MariaDB.
- Les autres operations restent sur l'abstraction store compatible JSON.
- Certaines suppressions restent volontairement prudentes ; le runtime couvre les suppressions de sessions, mais la migration n'efface pas les donnees existantes.
- Aucune table de Dico-IC ni la base `ic_dico` ne sont modifiees.
