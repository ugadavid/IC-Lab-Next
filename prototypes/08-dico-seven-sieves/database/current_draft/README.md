# current_draft SQL

Ce dossier est un brouillon de consolidation SQL pour IC-Dico.

Il n'est pas encore une version finale ni une source de vérité validée. Il sert à préparer une organisation plus lisible des scripts sans modifier les fichiers existants dans `database/`.

## Ordre prévu

```text
00_schema.sql
10_procedures.sql
20_seed_base.sql
30_seed_experimental.sql
40_seed_api_mock_support.sql
50_inflected_form.sql
60_connector_help.sql
```

## Statut des fichiers

- `00_schema.sql` part de `database/sql.sql` et conserve `pattern_rule`.
- `10_procedures.sql` part de `database/procedures.sql`, avec retrait des clauses liées à un utilisateur défini, ajout de `DROP PROCEDURE IF EXISTS`, et version à 7 paramètres de `sp_upsert_lexical_form`.
- `20_seed_base.sql` contient seulement les données minimales de référence nécessaires au démarrage.
- `30_seed_experimental.sql` contient les données lexicales exploratoires.
- `40_seed_api_mock_support.sql` complète expérimentalement les données nécessaires au mock API Seven Sieves.
- `50_inflected_form.sql` ajoute la couche V0 expérimentale de pluriels attestés et validés, séparée des lemmes canoniques.
- `60_connector_help.sql` ajoute l'objet pédagogique transversal Connector Help V0 et son catalogue ES/FR validé.

## Reproduction du statut documentaire

Depuis la mission 192, `00_schema.sql` est l'artefact de reproduction à neuf
qui déclare `language.documentation_status` et sa contrainte à deux valeurs.
Les cinq appels historiques de `20_seed_base.sql` restent compatibles avec
`sp_upsert_language` : la valeur par défaut `DOCUMENTED` leur est appliquée.

Pour une base de développement déjà existante, ne pas rejouer ce brouillon ni
les anciens scripts destructifs. Utiliser exclusivement le script versionné
`Node/scripts/migrate-language-documentation-status.js`, avec sa sauvegarde et
ses modes `--check`, `--apply` et `--rollback`.

## Prudence

Ce dossier ne change pas `docker-compose.yml`.

Il ne remplace pas automatiquement les scripts existants.

Avant tout usage comme base officielle, il faudra vérifier :

- la compatibilité avec MariaDB ;
- la signature effective des procédures ;
- la rejouabilité des seeds ;
- les cas lexicaux encore discutables.
