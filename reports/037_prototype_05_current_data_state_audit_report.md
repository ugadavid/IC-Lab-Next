# Rapport 037 — État factuel courant des données Proto05

**Date :** 16 juillet 2026

**Nature :** audit en lecture seule après la mission 036

**Version applicative :** inchangée

## Écarts constatés

`data/activities.json` est un fichier suivi par Git, modifié uniquement dans le
working tree (`.M`) et non indexé. `HEAD` et l’index contiennent encore une seule
activité, `proto05-augmented-video-01`.

Le JSON courant contient trois activités :

- l’activité historique ;
- `MboloTest`, statut `draft`, identifiant
  `proto05-draft-1784218562686-f87014` ;
- `Lbinz`, statut `draft`, identifiant
  `proto05-draft-1784219853222-b9e6a5`.

`MboloTest` est donc bien un brouillon préexistant à la mission 036, comme
l’indique le [rapport 036](036_prototype_05_teacher_edit_flow_report.md), mais il
n’existait ni dans `HEAD`, ni lors des contrôles des
[rapports 033](033_prototype_05_data_regression_tests_report.md) et
[035](035_ic_hub_proto05_access_visibility_report.md). Il n’est pas suivi comme
objet autonome : son ajout appartient au diff non indexé du fichier JSON suivi.

## Chronologie des SHA-256

| État | SHA-256 | Faits établis |
|---|---|---|
| `HEAD`, missions 033 et 035 | `3DB18608A7A94021F4C7B5DFE3E306BC31517A0556A7B6094BF6FA60851776BE` | Une activité ; `updatedAt` au `2026-07-13T18:23:47.041Z`. Le SHA de `HEAD` recalculé est identique. |
| Début et fin de la mission 036 | `1248F45CC9EAC88968CB6A72A28DE63BCD2E576C4D1C216F9B9D5B81A1851DF3` | Deux activités ; `MboloTest` était déjà présent. La reconstruction de cet état reproduit exactement ce SHA. |
| État courant | `DBCCB28BD353F107A1F02778576735C1C4AC6FEEFD8B6CF903EBF8FBC269AB60` | Trois activités ; métadonnées de `MboloTest` modifiées et ajout de `Lbinz` ; `updatedAt` au `2026-07-16T16:49:09.647Z`. |

Les identifiants générés par `Date.now()` datent les créations à :

- `MboloTest` : `2026-07-16T16:16:02.686Z` (`18:16:02.686` à Paris), après
  le contrôle 035 et avant la mission 036 ;
- `Lbinz` : `2026-07-16T16:37:33.222Z` (`18:37:33.222` à Paris), après la
  rédaction du rapport 036.

L’état `1248F45C…` correspond à `MboloTest` avec la description « J'arrive pas à
passer cette étape lors d'une modification », sans consigne ni question, et un
`updatedAt` au `2026-07-16T16:17:13.455Z`. L’état courant porte désormais
« Maintenant oui », « C'est ok » et « Kékidi? ».

La sauvegarde ignorée `activities.json.bak` contient déjà les trois activités et
les métadonnées courantes, avec `updatedAt` au `2026-07-16T16:48:35.161Z`. Son
diff avec le JSON courant ne porte que sur `updatedAt`, ce qui établit une
dernière sauvegarde sans changement métier à `16:49:09.647Z`.

## Origine probable

Les identifiants `proto05-draft-<Date.now()>-*`, les changements de `updatedAt`
et la rotation cohérente du `.bak` correspondent aux écritures normales des
routes locales `POST /api/proto05/activities` puis `PUT` de sauvegarde. Les
missions 033, 035 et 036 déclarent au contraire des scénarios sans écriture
canonique ou réalisés sur copies temporaires.

L’origine la plus probable est donc une utilisation interactive du serveur
Proto05 actif entre les missions : création de `MboloTest`, édition avant 036,
puis création de `Lbinz` et nouvelles sauvegardes après 036. Le dépôt ne permet
pas d’identifier l’utilisateur ni de prouver l’intention de ces opérations.

## Validations humaines nécessaires

- confirmer que `MboloTest` et `Lbinz` doivent être conservés comme données
  canoniques ;
- décider ensuite explicitement soit d’indexer et commiter le JSON courant, soit
  d’autoriser une restauration ou un nettoyage lors d’une mission séparée ;
- ne pas inclure accidentellement `data/activities.json` dans un commit de code
  avant cet arbitrage.

Aucune donnée, sauvegarde, version ou fichier applicatif n’a été modifié par cet
audit. Seul le présent rapport a été créé.

## Message de commit proposé

`docs(proto05): auditer les brouillons locaux non indexés`
