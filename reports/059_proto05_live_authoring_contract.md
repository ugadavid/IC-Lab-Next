# Rapport 059 — contrat authoring réellement servi

## Diagnostic

Avant redémarrage, le processus du port 8791 servait la version `0.1.20`. Sa whitelist de `PUT /api/proto05/activities/:id/authoring` refusait le champ top-level `transcription` :

```text
400 — Champ non autorisé : transcription.
```

Le payload guidé envoyait encore ce champ dans son override final de `save`.

## Correction

- `teacher-guided.html` n’envoie plus `transcription` dans le payload authoring ; seules les propriétés de la whitelist sont envoyées.
- Le serveur conserve `transcription.id` et `transcription.languageId`, puis dérive `transcription.segmentIds` depuis `segments` avant validation.
- La validation des références reste active et refuse toujours un top-level `transcription` interdit ou une référence orpheline.
- Version serveur/package : `0.1.22`.

## Vérifications

- Redémarrage réel du serveur 8791 : `/api/health` retourne `0.1.22`.
- Sonde sans écriture canonique avec `transcription` interdit : HTTP 400 attendu.
- Copie temporaire, navigation avec paramètres de cache distincts : sauvegarde sans modification réussie ; activité inchangée conservée avec 11 segments et 11 `segmentIds`.
- Copie temporaire, activité vide : sauvegarde réussie ; 0 segment et 0 `segmentIds`.
- `npm run check` réussi.
- Aucun écrit dans `data/activities.json` canonique.

Suite complète non relancée. Aucun commit ni push.
