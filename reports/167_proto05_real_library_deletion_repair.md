# Mission 167 — Suppression réelle Proto05

Date : 1er août 2026  
Version obtenue : `0.1.59`

## Périmètre et cause

Reprise ciblée du retrait depuis `/teacher/videos`, sans migration ni nouvelle architecture. La cause exacte était une dépendance non préflightée : `sp_media_terminal_output_delete` refusait avec l’errno MariaDB `30507` un playable de sortie encore utilisé par un plan audio, puis le writer masquait cette cause derrière une erreur transactionnelle générique.

## Correction et fichiers

- `server/proto05-mariadb-write.js`, `server/server.js` : conservation du diagnostic interne, préflight transactionnel des dérivations et message technique utilisateur simplifié.
- `teacher-videos.html`, `teacher-video-detail.html` : retours locaux ; layer listant les activités, traitements, plans audio, dérivations et références par leur nom ; actions `Effacer` ou `Ouvrir` ; recalcul du layer après action.
- `server/test/video-workspaces.test.js`, `server/test/library-download-finalization.test.js` : régressions ciblées.
- `server/package.json`, `server/README.md`, `ANONYMIZATION_ENGINE.md` : version `0.1.59`.

## Recette et contrôles

- Asset réel retiré depuis une carte : `media-proto05-remote-ref-08e3cf96cf078c9c9e79ef1b`; disparition immédiate, après rechargement et après redémarrage.
- Deux traitements réels effacés depuis le layer de `Vidéo augmentée IC — source UGA`; le layer est resté ouvert et la section Traitements a disparu après recalcul. L’activité bloquante restante est nommée et propose `Ouvrir`.
- MariaDB après redémarrage : asset supprimé = 0, traitements supprimés = 0, orphelins sources/playables/métadonnées/traitements/passages audio = 0.
- Tests ciblés : 18/18 réussis ; `node --check` réussi ; console navigateur sans erreur ; `git diff --check` réussi.

## Limites et validation humaine

La recette Codex a été faite sur le runtime réel et des données jetables autorisées. Elle ne remplace pas la validation humaine de David. Aucun commit ni push n’a été effectué.

Message de commit proposé : `fix(proto05): repair real library deletion and dependency actions`

## Récupération contrôlée de la migration 006

L’état partiellement appliqué a été confirmé en lecture seule : registre `001`–`005`, schéma réel identique au manifeste `006`, fingerprint commun `13e0e1b825768e77bf4c6f61c611c23334c153f6fb6e68d7113835ae7366a326`.

Le runner possédait déjà le chemin sûr requis : lorsqu’une migration pending est explicitement `adoptExisting` et que le schéma réel correspond exactement à sa cible, l’action `adopt` inscrit seulement la migration dans le registre, sous transaction et après vérification de sauvegarde, sans exécuter ses instructions SQL. La migration `006` a donc uniquement été déclarée `adoptExisting`; aucun relâchement du contrôle général de divergence ni changement du runner n’a été nécessaire.

Un test ciblé couvre le registre `001`–`005` avec schéma `006`, le plan `adopt` limité à `006`, l’absence de `DROP PROCEDURE`/`CREATE PROCEDURE` pendant la planification, et le refus d’un schéma ne correspondant exactement ni à `005` ni à `006`. Résultat : `1/1` réussi.

Plan réel produit mais non appliqué : action `adopt`, migration `006` uniquement, hash `d1ace5fe8ae53610853c35dc75d68c7c94d5edd750641f76519092cce1d9e480`. Aucun cycle START/STOP, aucune suppression réelle, aucune restauration, aucun commit et aucun push n’ont été effectués pendant cette étape. `git diff --check` est réussi.

## Adoption et recette finale autorisées

Le plan approuvé `d1ace5fe8ae53610853c35dc75d68c7c94d5edd750641f76519092cce1d9e480` a été appliqué par le chemin `adopt`. Le runner a uniquement inscrit `006` dans `schema_migrations`; sa branche d’adoption n’appelle pas l’exécuteur DDL. La vérification immédiate donne exactement `001` à `006`, aucun pending, le fingerprint réel et attendu `13e0e1b825768e77bf4c6f61c611c23334c153f6fb6e68d7113835ae7366a326`, et `schema:verify` confirme la version `006` avec six migrations. Le fingerprint intégral inchangé confirme notamment que `sp_media_asset_delete` n’a pas été modifiée pendant l’adoption.

Une nouvelle sauvegarde vérifiée de l’état courant a été créée dans `.runtime-migration-006-adoption-registry-backup.json`, car la sauvegarde antérieure décrivait légitimement le schéma `005` et était devenue périmée.

Cycle réel des lanceurs :

- premier START : IC-Hub PID `10148` sur `8790`, Proto05 PID `32052` sur `8791`, endpoints de santé réussis ;
- STOP : les deux services authentifiés ont été arrêtés et les ports `8790`/`8791` libérés ;
- second START : IC-Hub PID `15988` sur `8790`, Proto05 PID `69140` sur `8791`, endpoints de santé réussis ;
- les processus Node étrangers suivis avant le cycle (Adobe PID `40100`, runtimes Codex PID `18328` et `20052`) étaient toujours actifs après STOP et après le second START.

Recette réelle de suppression dans `/teacher/videos` : l’entrée jetable `3. GT01_RFC7_reu1_21m10-26m15` (`media-proto05-remote-ref-7cdc28f41be4906c37a7eef6`) a été supprimée ; le compteur est passé de 11 à 10 et la carte a disparu. Le retrait de `Vidéo augmentée IC — source UGA` a été refusé localement avec le message exploitable : « Suppression refusée : cette vidéo possède encore des dépendances. Éléments concernés : Vidéo augmentée d’intercompréhension ». Aucun message générique ni erreur console navigateur n’a été observé ; contrôle visuel réalisé dans Chromium.

Contrôles finaux : test d’adoption `1/1` réussi, tests ciblés de suppression et vidéothèque `18/18` réussis, `git diff --check` réussi. Version inchangée `0.1.59`. Aucun commit ni push.
