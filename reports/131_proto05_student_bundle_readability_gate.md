# Mission 131 — Proto05 — Fermeture du contrat de lecture étudiant MariaDB

Date : 27 juillet 2026

## Résultat

Le contrat `sp_student_activity_bundle` du schéma 003 est désormais fermé par
une unique décision de lisibilité étudiante, calculée une fois puis appliquée
aux 12 jeux de résultats.

Une activité sans média principal valide ne restitue plus aucune ligne, y
compris dans les collections pédagogiques et les médias supplémentaires. Après
restauration du principal, le bundle restitue exactement les mêmes 20 lignes de
fixture que dans son état lisible initial.

La recette 003 complète reste verte :

- 39 contrôles antérieurs toujours réussis ;
- 2 contrôles automatiques ajoutés ;
- 41 contrôles SQL réussis au total ;
- aucun marqueur d’échec SQL ;
- marqueur final `MISSION_130_VALIDATION_COMPLETE` obtenu ;
- 31 tables laissées à zéro ligne ;
- 43 procédures, 48 FK et 65 contraintes `CHECK` ;
- FK actives ;
- aucun helper, trigger, événement ou objet de test résiduel.

La base `ic_augmented_video` reste installée mais entièrement vide. Aucun
commit ni push n’a été effectué.

## État Git initial

- Branche : `main`.
- HEAD :
  `3b511bdea8ceabb630110bae2bb8e38f13023042`.
- Dernier commit : `Db document mission 128`.
- Version Proto05 : `0.1.45`.
- État initial :

```text
?? prototypes/05-augmented-ic-video-01/database/drafts/002_proto05_schema_revision.sql
?? prototypes/05-augmented-ic-video-01/database/drafts/003_proto05_schema_hardening.sql
?? prototypes/05-augmented-ic-video-01/database/tests/
?? reports/128_proto05_mariadb_model_revision_and_validation.md
?? reports/130_proto05_mariadb_schema_hardening_and_validation.md
```

Les changements non suivis antérieurs ont été préservés. Le rapport 130 n’a
pas été modifié.

## Base ciblée et état avant réinstallation

La seule base ciblée était :

```text
ic_augmented_video
```

Avant toute suppression d’objet, les contrôles ont établi :

- 31 tables attendues ;
- 43 procédures attendues ;
- 48 FK ;
- 65 contraintes `CHECK` ;
- aucun trigger ;
- aucun événement ;
- comptage réel de chacune des 31 tables : 0 ligne au total ;
- aucun objet inattendu.

Les témoins des bases voisines étaient de 8 tables pour `ic_dico` et de
16 objets de table pour `ic_hub`. Aucune commande d’écriture ne les a ciblées.

La réinstallation a supprimé uniquement les objets de
`ic_augmented_video`, dans l’ordre de leurs dépendances. La FK cyclique
contrôlée entre l’asset et son playable par défaut a été retirée explicitement
avant la purge. La base elle-même n’a pas été supprimée et
`FOREIGN_KEY_CHECKS` n’a jamais été désactivé.

## Cause précise du défaut

Dans la version produite par la Mission 130, le premier jeu du bundle exigeait
un média principal actif et disponible. Les jeux 2 à 12 se fondaient
principalement sur l’état `published` de l’activité et leurs filtres propres.

Si le playable principal devenait indisponible, le jeu 1 était donc vide, mais
les jeux suivants pouvaient encore restituer des médias supplémentaires,
langues, locuteurs, segments, intervalles, couches, phénomènes ou overlays.
Cette dépendance implicite envers le consommateur Node était insuffisante pour
une procédure autonome exécutée avec `SQL SECURITY DEFINER`.

## Définition de la lisibilité étudiante

La variable locale `v_is_student_readable` vaut vrai uniquement lorsqu’un même
graphe cohérent satisfait toutes les conditions suivantes :

1. l’activité demandée existe ;
2. elle est publiée ;
3. elle n’est pas supprimée logiquement ;
4. elle possède un lien média de rôle `primary` ;
5. l’asset du lien est `active` ;
6. cet asset n’est pas supprimé logiquement ;
7. le playable du lien appartient réellement à cet asset ;
8. le playable est `available`, ce qui exclut notamment
   `pending-removal` et les états d’indisponibilité ;
9. son `removed_at` est nul ;
10. son locator est cohérent avec son type :
    - `local-file` exige `storage_scope` et `storage_key` non vides, sans URL
      ni identifiant d’embed ;
    - un type non local exige l’absence de locator de stockage et au moins une
      URL ou un identifiant d’embed non vide.

Cette définition reproduit et explicite les garanties déjà retenues par le
contrat 003, en ajoutant la vérification directe de l’appartenance du playable
à l’asset et la cohérence du locator.

## Centralisation de la décision

La procédure :

1. déclare une seule variable locale ;
2. l’alimente par un seul `SELECT EXISTS` portant la règle complète ;
3. conserve les 12 `SELECT` existants ;
4. ajoute `v_is_student_readable = 1` à chacun d’eux.

Il n’existe donc pas douze variantes de la règle. Aucun `SIGNAL` n’a été
introduit : si l’activité est illisible, les 12 jeux existent toujours dans le
contrat mais renvoient zéro ligne.

## Jeux de résultats préservés

L’ordre, les projections, les alias et les tris du contrat 003 sont inchangés :

1. en-tête de l’activité publiée ;
2. médias principaux et supplémentaires disponibles avec locators ;
3. langues ;
4. locuteurs ;
5. segments ;
6. liens segment–locuteur ;
7. liens segment–langue ;
8. intervalles linguistiques ;
9. couches learner visibles ;
10. phénomènes des couches learner visibles ;
11. overlays learner ou globalement visibles ;
12. liens overlay–couche learner visibles.

L’inspection statique de la procédure corrigée établit :

- 12 blocs de jeux documentés ;
- 13 `SELECT` au total : un calcul de garde et les 12 jeux ;
- un seul calcul `SELECT EXISTS` ;
- exactement 12 dépendances à `v_is_student_readable = 1` ;
- aucun `SIGNAL` ;
- aucun `SELECT *`.

La recette comporte également un contrôle automatique de la présence du calcul
central, de l’appartenance asset–playable, des deux formes de locator et des 12
usages de la garde. L’installation MariaDB expose elle aussi 12 usages de la
garde dans `ROUTINE_DEFINITION`.

## Fixture et états réellement exécutés

La fixture non vide de la recette 003 a été réutilisée. Elle comprend notamment
une activité publiée, un principal local, deux médias supplémentaires, des
langues, locuteurs, segments, liens, intervalles, couches learner/auteur,
phénomènes, annotations et overlays.

Des marqueurs explicites encadrent chaque appel réel du bundle :

```text
BUNDLE_CASE_READABLE
BUNDLE_CASE_UNAVAILABLE
BUNDLE_CASE_RESTORED
BUNDLE_CASE_ARCHIVED
BUNDLE_CASE_DELETED
BUNDLE_CASE_PENDING_REMOVAL
BUNDLE_CASE_END
```

### Activité lisible

Sortie inspectée :

- 20 lignes dont `activity_id = m130_activity_root` dans les 12 jeux ;
- un principal identifiable, d’ordre 0 ;
- deux médias supplémentaires, d’ordres 10 et 20 ;
- collections pédagogiques non vides ;
- overlay learner présent dans les jeux overlay et overlay–couche ;
- overlay auteur absent.

### Principal indisponible

Le playable principal a été placé dans l’état `missing-local` par
`sp_media_update_playable_availability`, donc par une opération conforme au
modèle.

Résultat : zéro ligne portant l’activité dans l’ensemble du bundle. Aucun média
supplémentaire ni contenu pédagogique n’a été exposé.

### Principal restauré

Le playable a été restauré à `available` par la même procédure.

Résultat :

- 20 lignes à nouveau ;
- séquence complète de lignes strictement identique à celle de l’état lisible
  initial.

### États illisibles connexes

La même fixture a ensuite servi aux états défensifs suivants :

| État du principal | Lignes étudiantes observées |
|---|---:|
| asset `archived` | 0 |
| asset `deleted` avec `deleted_at` renseigné | 0 |
| playable `pending-removal` | 0 |
| playable `missing-local` | 0 |

Les mutations directes utilisées pour `archived`, `deleted` et
`pending-removal` sont limitées à la fixture DBA de recette afin de simuler ces
états défensifs. Elles sont restaurées avant la poursuite des anciens contrôles.
Un nouveau contrôle SQL vérifie que l’asset est revenu à `active`, que
`deleted_at` est nul, que le playable est `available` et que `removed_at` est
nul.

## Nature des preuves

### Tests SQL automatiques

La recette vérifie automatiquement :

- les 39 invariants de la Mission 130 ;
- la structure statiquement visible de la garde commune ;
- les 12 occurrences exactes de son application ;
- la restauration complète de la fixture après les changements d’état ;
- le nettoyage persistant final.

Total : 41 contrôles `PASS`.

### Inspection statique

Le fichier source et la définition installée ont été inspectés pour confirmer :

- un calcul commun ;
- 12 usages de cette décision ;
- les 12 jeux dans le même ordre ;
- les projections et alias conservés ;
- l’absence de `SIGNAL` et de `SELECT *`.

### Exécution contrôlée et inspection des sorties

Les six états ont réellement appelé la procédure. La sortie du client MariaDB a
été découpée entre les marqueurs et les lignes de l’activité ont été comptées
et comparées.

Le client MariaDB en mode batch n’imprime pas les en-têtes des jeux entièrement
vides. La présence matérielle de 12 jeux vides ne peut donc pas être déduite de
12 en-têtes dans ces sorties. Elle est établie honnêtement par la conservation
statique des 12 `SELECT` et de leurs projections, combinée à l’observation de
zéro ligne entre les marqueurs des états illisibles. Aucune capture SQL pure de
tous les result sets n’est prétendue.

## Régression complète de la recette 003

Après réinstallation du schéma corrigé, la recette 003 entière a été exécutée,
puis répétée pour comparer exactement la sortie lisible avant et après
restauration.

Les deux exécutions complètes ont obtenu :

- code client MariaDB 0 ;
- 41 contrôles `PASS` ;
- aucun marqueur `ERROR` ou `FAILED` ;
- un marqueur final de validation ;
- nettoyage final réussi.

Les 39 contrôles historiques restent verts. Cela couvre notamment :

- locators serveur ;
- transitions et progression des traitements ;
- finalisation strictement idempotente ;
- lignées média et pédagogiques ;
- FK entre asset de sortie et playable publié ;
- règles uniformes de rattachement média ;
- diagnostics précis par errno, SQLSTATE et message ;
- confidentialité learner ;
- purge topologique sans suspension des FK.

Les 43 procédures installées restent toutes `SQL SECURITY DEFINER`. Aucune
table, FK, contrainte `CHECK` ou autre procédure métier n’a été modifiée.

## État final de MariaDB

Contrôles finaux :

- base active : `ic_augmented_video` ;
- `FOREIGN_KEY_CHECKS = 1` ;
- tables : 31 ;
- procédures : 43 ;
- procédures `SQL SECURITY DEFINER` : 43 ;
- FK : 48 ;
- contraintes `CHECK` : 65 ;
- helpers `sp_m130_*` : 0 ;
- tables de test `m130_*` : 0 ;
- triggers : 0 ;
- événements : 0 ;
- comptage réel de 31 tables : 0 ligne.

Témoins finaux :

- `ic_dico` : 8 tables et 9 procédures ;
- `ic_hub` : 15 tables, 1 vue et 3 procédures.

Ces valeurs correspondent à l’état de référence. Ni `ic_dico` ni `ic_hub`
n’ont été ciblées.

## Périmètre et version

La version Proto05 reste `0.1.45`. Ce correctif pré-commit demeure dans la
révision SQL 003 ; aucun schéma 004 n’a été créé.

Inchangés :

- tables, FK et contraintes `CHECK` ;
- autres procédures ;
- rapport 130 ;
- JSON et données historiques ;
- serveur Node, routes et interface ;
- Docker et utilisateurs MariaDB ;
- launchers et architecture globale ;
- version applicative.

Proto05, Chromium, FFmpeg et la suite applicative n’ont pas été lancés,
conformément au périmètre.

## Fichiers concernés

Modifiés :

- `prototypes/05-augmented-ic-video-01/database/drafts/003_proto05_schema_hardening.sql` ;
- `prototypes/05-augmented-ic-video-01/database/tests/003_proto05_schema_validation.sql`.

Créé :

- `reports/131_proto05_student_bundle_readability_gate.md`.

Aucun autre fichier n’a été créé ou modifié par la Mission 131.

## Ce qui n’a pas été vérifié

- consommation des 12 result sets par le futur adaptateur Node ;
- comportement avec un compte applicatif réel limité à `EXECUTE` ;
- concurrence multi-session ;
- validation fonctionnelle humaine de David.

Ces limites ne remettent pas en cause la fermeture SQL du contrat. La validation
réalisée est une validation MariaDB et statique, pas une validation humaine.

## État Git final

État attendu :

```text
?? prototypes/05-augmented-ic-video-01/database/drafts/002_proto05_schema_revision.sql
?? prototypes/05-augmented-ic-video-01/database/drafts/003_proto05_schema_hardening.sql
?? prototypes/05-augmented-ic-video-01/database/tests/
?? reports/128_proto05_mariadb_model_revision_and_validation.md
?? reports/130_proto05_mariadb_schema_hardening_and_validation.md
?? reports/131_proto05_student_bundle_readability_gate.md
```

Aucun commit ni push n’a été réalisé.

Message de commit proposé :

```text
feat(proto05): harden MariaDB schema invariants
```

