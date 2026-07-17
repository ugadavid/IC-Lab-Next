# Rapport 057 — sauvegarde d’une activité Proto05 sans segments

## Périmètre

Correction de la sauvegarde après suppression en cascade de tous les moments de transcription dans l’atelier guidé. Les activités canoniques, le modèle vidéo, le catalogue et le proxy HLS n’ont pas été modifiés.

## Diagnostic

Sur une copie temporaire de `proto05-copy-1784236861048-984dec`, la suppression de tous les segments puis l’enregistrement aboutit désormais à une réponse 200. L’activité sauvegardée contient zéro segment, phénomène et annotation ; les overlays indépendants et les intervalles linguistiques indépendants sont conservés.

Le 400 a été reproduit séparément avec une vraie référence orpheline dans `transcription.segmentIds`. Réponse HTTP exacte :

```text
400
{"error":"transcription.segmentIds référence un identifiant inexistant : segment-proto05-copy-1784236861048-984dec-1."}
```

La règle de validation reste active. La cause était donc une référence de segment non normalisée, et non l’absence de segments en elle-même.

## Correction

La cascade de l’atelier guidé normalise désormais les références à la source :

- retrait des identifiants supprimés de `transcription.segmentIds` ;
- retrait des phénomènes rattachés par `phenomena[].segmentId` ;
- retrait des annotations rattachées par `segmentId` ;
- retrait des overlays liés aux annotations supprimées ;
- conservation des intervalles linguistiques, détachés du segment supprimé ;
- conservation des overlays indépendants, couches, langues et locuteurs ;
- recalcul de `segments[].phenomenonIds`.

L’atelier restitue maintenant les erreurs serveur de façon lisible, avec le statut HTTP et le détail de validation, par exemple : `Enregistrement refusé (400) : ...`.

## Vérifications

- Sauvegarde vide après cascade sur copie temporaire : réussie ; 0 segment, 0 phénomène, 0 annotation, 2 overlays indépendants et 22 intervalles conservés.
- Référence réellement orpheline : refusée en HTTP 400 avec le message ci-dessus.
- Sauvegarde normale avec un segment : réussie ; 1 segment et aucune référence de transcription orpheline.
- `npm run check` dans `prototypes/05-augmented-ic-video-01/server` : réussi (`node --check server.js`).
- Recette Chromium sur copie temporaire : ajout/suppression/cascade, sauvegarde vide puis sauvegarde avec segment ; statut visible correct et aucune erreur applicative dans la console.
- `data/activities.json` canonique : non modifié.

## Version et fichiers

La version reste inchangée : serveur Proto05 `0.1.21`, moteur étudiant `index-0.0.9.html`.

Fichiers modifiés pour cette mission :

- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `reports/057_proto05_empty_activity_save_report.md`

## Limites restantes

La suite complète n’a pas été relancée conformément à la demande. La recette Chromium est une validation technique de l’environnement disponible, pas une validation humaine.

Message de commit proposé, non créé : `fix(proto05): surface empty activity save validation errors`
