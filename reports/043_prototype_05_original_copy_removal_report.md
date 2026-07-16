# Rapport 043 — Suppression ciblée d’Original_copy

**Date :** 16 juillet 2026  
**Périmètre :** suppression d’une seule activité du JSON canonique Proto05  
**Mission :** supprimer `Original_copy` avec sauvegarde datée, vérification des
quatre autres activités et remplacement atomique.

## Identification préalable

La recherche par titre exact `Original_copy` dans
`prototypes/05-augmented-ic-video-01/data/activities.json` a produit une seule
correspondance :

- titre : `Original_copy`;
- identifiant exact : `proto05-copy-1784223289628-f9a025`;
- segments : 11;
- phénomènes : 14;
- SHA-256 de l’objet activité sérialisé :
  `CA4813D676095FF55C4D54AC8939EF4826360CB7C5DAFC5A736F74091BD7A9EA`.

Il n’existait donc aucune ambiguïté. Une recherche de cet identifiant exact dans
le reste du workspace, avant création de la sauvegarde, n’a trouvé aucune
référence externe.

## État avant suppression

- Nombre d’activités : 5.
- SHA-256 du JSON canonique :
  `862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47`.

Les quatre activités à conserver ont été empreintées individuellement :

| Activité | Identifiant | SHA-256 de l’objet |
|---|---|---|
| Vidéo augmentée d’intercompréhension | `proto05-augmented-video-01` | `89FC60B90FB403EE960D4A1E9C3BF77C4AEC4D96A72B0B6B97E975E18A0005A6` |
| MboloTest | `proto05-draft-1784218562686-f87014` | `D02C39ED82F0EFE6E62BDB200759017AB7D6995E2F80DCF927F3F8F890EC7DF3` |
| Lbinz | `proto05-draft-1784219853222-b9e6a5` | `F207CFD1A97775DB910891E9CEF1A46B2554DCF9C70DC5204E7FBCA200D6B05C` |
| brouillon_vide | `proto05-draft-1784230655360-d1182f` | `E44D258284EA6F7AA0C145E655FBF67908E5ADC4CDADBDBE3840964322104E48` |

## Sauvegarde

Une copie datée a été créée avant toute suppression :

`prototypes/05-augmented-ic-video-01/data/activities.20260716T205538855Z.before-original-copy-removal.json.bak`

Son SHA-256 est exactement celui du canonique avant suppression :

`862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47`.

Le chemin n’existait pas avant la copie et aucun fichier de sauvegarde antérieur
n’a été écrasé.

## Suppression atomique

Avant l’écriture canonique, un test a appliqué l’opération sur une copie
temporaire de la sauvegarde. Après réussite :

1. le SHA du canonique et celui de la sauvegarde ont été revérifiés;
2. l’unicité du couple titre/identifiant a été contrôlée une nouvelle fois;
3. un nouvel objet magasin a été construit en retirant uniquement l’activité
   ciblée;
4. les quatre autres objets activité et tous les champs supérieurs ont été
   comparés strictement avec l’état initial;
5. le JSON a été écrit dans un fichier temporaire adjacent et forcé sur disque;
6. le fichier temporaire a été renommé atomiquement sur `activities.json`;
7. le résultat a été relu et comparé à l’état attendu.

`updatedAt` n’a volontairement pas été modifié : la seule différence de données
est le retrait d’un élément de `activities`.

## État après suppression

- Nombre d’activités : 4.
- SHA-256 canonique final :
  `E36BA0BF5F0EA27FED80434C5ED1CD4F7C056570E69706D6445741C6C3EC7864`.
- Les quatre SHA d’objets activité sont identiques à ceux relevés avant
  suppression.
- Leur ordre est inchangé.
- Aucun champ supérieur du magasin n’a changé.
- Le titre et l’identifiant supprimés sont absents du JSON canonique.
- Aucune autre activité ne contient l’identifiant supprimé.
- Une recherche post-suppression ne trouve aucune référence opérationnelle à
  l’identifiant dans le workspace, hors sauvegarde et documentation de mission.

## Test ciblé

Un seul test Node `node:test` a été exécuté sur une copie située dans le dossier
temporaire du système :

`suppression atomique ciblée et conservation des quatre autres activités`

Résultat : **1 test réussi, 0 échec**.

Le test a vérifié :

- une seule correspondance cible;
- le passage de 5 à 4 activités;
- l’absence du titre et de l’identifiant supprimés;
- l’égalité stricte et l’ordre des quatre activités conservées;
- l’égalité de tous les champs hors `activities`;
- le remplacement atomique sur la fixture temporaire.

Le test n’a jamais écrit dans le JSON canonique.

## Autres contrôles

- `npm run check` dans le serveur Proto05 : réussi.
- Vérification post-écriture des quatre objets et des champs supérieurs :
  réussie.
- Recherche de références vivantes à l’identifiant supprimé : aucune.
- Suite complète non exécutée, conformément à la mission.

## Restauration possible

La restauration n’a pas été exécutée. Procédure :

1. arrêter le serveur Proto05 afin d’éviter une écriture concurrente;
2. vérifier que la sauvegarde datée possède le SHA
   `862D270CAF41FEC4020B783F5650623BBB7981D414419ECE08D604B3ED3AFB47`;
3. copier la sauvegarde vers un fichier temporaire adjacent à
   `data/activities.json`;
4. renommer atomiquement ce fichier temporaire sur `activities.json`;
5. vérifier que le canonique restauré possède le même SHA et contient à nouveau
   cinq activités;
6. redémarrer le serveur.

Cette restauration réintroduit exactement l’activité supprimée et l’état
complet antérieur, sans nécessiter de changement de version applicative.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/data/activities.json`
- `prototypes/05-augmented-ic-video-01/data/activities.20260716T205538855Z.before-original-copy-removal.json.bak`
- `reports/043_prototype_05_original_copy_removal_report.md`

Aucun code d’interface, modèle de langue, relation segment/phénomène ou autre
activité n’a été modifié. Les changements de code déjà présents dans le
worktree avant cette mission ont été préservés.

## Version

- Serveur Proto05 : `0.1.13`, inchangé.
- Moteur étudiant : `index-0.0.9.html`, inchangé.
- Données : 5 → 4 activités.

La mission est une opération ciblée sur les données et ne justifie aucun
incrément applicatif.

## Validation humaine et limites

- Aucune validation fonctionnelle humaine par David n’a été réalisée.
- La sauvegarde contient volontairement l’activité supprimée; elle doit rester
  locale et disponible tant que la suppression n’est pas validée humainement.
- Les rapports historiques peuvent encore mentionner `Original_copy` comme un
  fait passé; ils ne constituent pas des références applicatives.

## Message de commit proposé

`chore(proto05): supprimer l’activité Original_copy`
