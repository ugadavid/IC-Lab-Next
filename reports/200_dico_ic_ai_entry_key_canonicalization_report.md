# Mission 200 — Canonicalisation des clés techniques et détection immédiate des doublons

Date : 2026-08-18  
Composant : Dico-IC — assistant IA par texte  
Version obtenue : assistant texte `0.1.10`  
Versions inchangées : administration principale `0.1.5`, API générale `0.1`, package Node `1.0.0`

## Défaut observé

La validation humaine montrait des clés OpenAI comme `ACCÉLÉRÉ` ou `S_ÉLEVER`. L’ancienne transformation se limitait à `trim().toUpperCase()` : les accents restaient donc présents et empêchaient la comparaison immédiate avec les clés MariaDB `ACCELERE` et `S_ELEVER`.

La correction est limitée aux identifiants techniques `entry_key`. Aucun lemme, forme, glose, exemple, aide, texte ou nom de langue n’est désaccentué.

## État initial

Les changements et rapports locaux des Missions 195 à 199 étaient présents et ont été préservés. Aucun commit, push ou déploiement n’a été effectué.

Volumes MariaDB constatés au début, en lecture seule :

| Table | Volume initial |
| --- | ---: |
| `lexical_entry` | 307 |
| `lexical_form` | 1086 |
| `inflected_form` | 40 |
| `connector_help` | 12 |
| `form_relation` | 70 |
| `pattern_rule` | 1 |
| `ic_feature` | 8 |
| `language` | 12 |

## Règles de canonicalisation

Le module partagé `admin/js/entry-key-canonicalization-0.1.js` constitue l’unique implémentation utilisée par le navigateur et le serveur :

1. conversion en majuscules ;
2. remplacement explicite de `Œ` par `OE` et de `Æ` par `AE` ;
3. normalisation Unicode NFD ;
4. suppression des marques diacritiques ;
5. conversion des espaces, apostrophes droites ou typographiques et traits d’union en underscores ;
6. suppression des caractères autres que `A-Z`, `0-9` et `_` ;
7. regroupement des underscores ;
8. suppression des underscores initiaux et finaux ;
9. exception explicite `EMPTY_ENTRY_KEY` si le résultat est vide.

Exemples vérifiés :

| Proposition | Clé canonique |
| --- | --- |
| `ACCÉLÉRÉ` | `ACCELERE` |
| `S’ÉLEVER` | `S_ELEVER` |
| `s'élever` | `S_ELEVER` |
| `CO-OPÉRER` | `CO_OPERER` |
| `CŒUR` | `COEUR` |
| `ÆTHER` | `AETHER` |
| `QUALITÉ` | `QUALITE` |
| `déjà  vu` | `DEJA_VU` |
| `LANGUAGE_SYSTEM` | `LANGUAGE_SYSTEM` |

Les contraintes historiques du contrat de création restent ensuite appliquées : 3 à 100 caractères et première position alphabétique.

## Protection frontend

Les clés des candidats sont canonicalisées :

- dès la réponse HTTP, avant affichage ;
- avant la comparaison avec `existing_entry_keys` ;
- avant le statut et la sélection par défaut ;
- au `focusout` après une édition humaine ;
- impérativement avant toute tentative de création.

La détection partagée des doublons compare les clés canoniques :

- aux clés MariaDB retournées avec la génération ;
- aux autres brouillons de la génération courante ;
- aux clés réinterrogées après une édition humaine.

Après un `blur`, la route de lecture existante `/admin/lexical-entry/:entryKey` vérifie une clé humaine qui n’était pas dans le résultat initial. La réponse n’est appliquée que si la ligne et sa clé sont encore courantes.

Une ligne `Doublon possible` :

- est décochée ;
- possède une case désactivée ;
- est ignorée par la création même si son état avait été forgé.

Les autres modifications humaines de la ligne restent dans l’objet brouillon et survivent au nouveau rendu. La saisie de clé reste naturelle pendant la frappe ; la transformation visible intervient à la perte de focus.

## Protection serveur

### Réponses OpenAI

`parseAndValidateCandidateJson` canonicalise chaque `entry_key` avant de retourner les candidats. Le prompt exige maintenant explicitement une clé ASCII composée uniquement de `A-Z`, `0-9` et underscores.

Les lemmes, gloses et domaines sémantiques conservent leurs accents. Une clé OpenAI devenue vide produit une erreur fournisseur lisible `OPENAI_INVALID_CANDIDATE`.

### Création et mise à jour

`validateAdminLexicalEntry` canonicalise une clé forgée avant validation. Ainsi un POST contenant `ACCÉLÉRÉ` transmet `ACCELERE` au dépôt et rencontre le doublon existant.

`validateAdminLexicalEntryUpdate` compare la forme canonique de la clé de route et de la clé du corps. Une variante équivalente n’est pas interprétée comme un renommage, tandis qu’une vraie modification reste interdite.

Les routes GET et PUT canonicalisent également le paramètre `:entryKey`.

### Défense dans le dépôt

`createAdminLexicalEntry` canonicalise encore la clé au point de confiance avant :

- le verrouillage et la recherche du doublon ;
- l’appel à la procédure d’insertion ;
- les insertions de formes ;
- la relecture de l’entrée créée.

`findExistingEntryKeys` canonicalise et déduplique toutes les clés avant la requête SQL. Une variante accentuée ne peut donc contourner ni la présentation du doublon ni la protection d’écriture.

## Doublons détectés

Les tests et la recette établissent :

- `ACCÉLÉRÉ` contre `ACCELERE` en base → `ACCELERE`, doublon immédiat ;
- `S’ÉLEVER` contre `S_ELEVER` → doublon immédiat ;
- `S’ÉLEVER` et `S_ELEVER` dans le même lot → les deux lignes sont des doublons ;
- édition humaine de `COEUR` vers `ACCÉLÉRÉ` → `ACCELERE`, nouvelle interrogation serveur, statut doublon recalculé.

## Audit non destructif des clés actuelles

Les 307 `entry_key` ont été lues et comparées avec la fonction de production, sans modification.

Résultat initial et final :

- clés contenant des accents : **0** ;
- clés contenant espaces, apostrophes ou traits d’union : **0** ;
- clés ne respectant pas `^[A-Z0-9_]+$` : **0** ;
- clés différentes de leur forme canonique : **0** ;
- collisions après canonicalisation : **0**.

Aucune correction de donnée n’est nécessaire au titre de cet audit. Aucune entrée existante n’a été modifiée.

## Fichiers concernés

- `prototypes/08-dico-seven-sieves/admin/js/entry-key-canonicalization-0.1.js` — créé ;
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-0.1.js` ;
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html` ;
- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/admin.js` ;
- `prototypes/08-dico-seven-sieves/Node/src/repository.js` ;
- `prototypes/08-dico-seven-sieves/Node/server.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/entry-key-canonicalization.test.js` — créé ;
- `reports/200_dico_ic_ai_entry_key_canonicalization_report.md` — créé.

Les autres fichiers modifiés ou non suivis appartiennent aux Missions 195 à 199 et restent préservés.

## Tests

### Tests dédiés

**9 tests sur 9** réussis :

- tous les vecteurs publics ;
- ligatures `Œ` et `Æ` ;
- apostrophes droite et typographique ;
- traits d’union, espaces multiples et underscores répétés ;
- clé déjà canonique ;
- clé vide refusée ;
- doublon avec la base et doublon interne au lot ;
- parsing OpenAI sans altération linguistique ;
- création HTTP forgée ;
- canonicalisation du dépôt ;
- présence des protections `blur` et pré-création.

### Tests ciblés combinés

**78 tests sur 78** réussis sur la canonicalisation, l’assistant texte, les lots, la progression et l’annulation.

### Suite complète

`npm test` : **168 tests réussis sur 168**, aucun échec.

### Analyse statique

- `node --check` réussi sur tous les fichiers JavaScript concernés ;
- `git diff --check` réussi ;
- seuls les avertissements Git existants de future conversion LF vers CRLF sont présents.

## Recette déterministe et visuelle

Une fixture locale jetable, sans accès MariaDB et sans appel OpenAI, a proposé :

- `ACCÉLÉRÉ` ;
- `S_ÉLEVER` ;
- `CŒUR` ;
- `CO-OPÉRER`.

Résultat affiché dès réception :

- `ACCELERE` — `Doublon possible`, décoché et désactivé ;
- `S_ELEVER` — `Doublon possible`, décoché et désactivé ;
- `COEUR` — `Prêt` ;
- `CO_OPERER` — `Prêt`.

Les contenus linguistiques `caractère accéléré`, `accéléré`, `s’élever`, `cœur`, `corazón` et `coração` sont restés accentués.

Une édition de `COEUR` en `ACCÉLÉRÉ`, suivie d’un changement de focus, a produit :

- affichage `ACCELERE` ;
- interrogation serveur de `ACCELERE` ;
- passage immédiat à trois lignes `Doublon possible` ;
- conservation de la glose et du lemme `cœur` ;
- passage de deux à une proposition sélectionnée.

Contrôle visuel effectué à `1440 × 900` et `1366 × 768` : clés, statuts et accents lisibles, aucune erreur de console, aucun défaut visible nouveau. La table conserve son comportement horizontal historique aux dimensions réduites.

État de la fixture : une génération, une vérification de doublon `ACCELERE`, `persistentWrites: 0`. Aucune création n’a été déclenchée. Les captures ont été inspectées sans être ajoutées au dépôt.

La fixture `mission200-visual-fixture.cjs` a été supprimée et son processus PID 21072 arrêté. L’onglet a été fermé et le viewport réinitialisé.

Cette recette Codex ne remplace pas la validation humaine avec OpenAI réel prévue par David.

## Volumes MariaDB après recette

| Table | Avant | Après |
| --- | ---: | ---: |
| `lexical_entry` | 307 | 307 |
| `lexical_form` | 1086 | 1086 |
| `inflected_form` | 40 | 40 |
| `connector_help` | 12 | 12 |
| `form_relation` | 70 | 70 |
| `pattern_rule` | 1 | 1 |
| `ic_feature` | 8 | 8 |
| `language` | 12 | 12 |

Aucune écriture, migration, réinitialisation ou correction MariaDB n’a été exécutée.

## Gestion des serveurs

Les launchers n’ont pas été modifiés ni nécessaires. Les services IC-Lab-Next réels n’ont pas gêné la recette isolée et n’ont donc pas été arrêtés.

Au contrôle final :

- PID 36564 sur le port 3000, démarré à 16:59:10 ;
- PID 19852 sur le port 3100, démarré à 11:48:34.

Le PID du port 3000 a changé extérieurement par rapport au relevé de fin de Mission 199 ; aucune attribution ni action n’a été effectuée. Les deux services sont laissés actifs. Aucun listener Mission 200 ne subsiste sur le port 3200.

## Non-régressions et limites

Les lots réglables, progression, timeout, tolérance des propositions invalides, chronomètre, annulation réelle, protection contre les réponses tardives, conservation des corrections et absence d’écriture automatique sont couverts par la suite complète et préservés.

Éléments non vérifiés :

- aucun appel OpenAI réel ;
- aucune validation fonctionnelle humaine finale ;
- aucune création réelle volontaire d’une nouvelle entrée pendant la recette, afin de préserver MariaDB.

## Versionnement

L’assistant texte passe de `0.1.9` à `0.1.10`, correction incrémentale conforme au versionnement par baby steps. L’API générale reste `0.1`, le package Node `1.0.0` et l’administration principale `0.1.5`.

## Message de commit global proposé — Missions 195 à 200

`fix(dico): fiabiliser les générations IA et canonicaliser les clés techniques`
