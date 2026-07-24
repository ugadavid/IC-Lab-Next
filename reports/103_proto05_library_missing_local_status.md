# Rapport 103 — État des playables `missing-local`

## Périmètre

Correction limitée au rendu de la Library Proto05. Aucun catalogue, modèle,
route, activité ou fichier média n'a été modifié.

## Diagnostic

La réponse de `GET /api/proto05/library/assets` contenait bien trois playables
avec `availability: "missing-local"` et `availabilityReason: "missing-file"`.
Le problème était uniquement dans `teacher-videos.html` : le rendu affichait
`playable.status`, qui vaut `pending` pour ces playables, sans afficher leur
disponibilité canonique ni son motif.

## Correction

Le libellé de chaque playable utilise désormais `availability` :

- `missing-local` → **Indisponible — fichier local absent** ;
- `available` → **Disponible** ;
- `unknown` → **Disponibilité non vérifiée**.

Lorsque présent, `availabilityReason` est également affiché, notamment
`Motif : missing-file`. Les trois fichiers absents sont donc distingués sans
ambiguïté dans chaque carte.

## Vérifications

- payload runtime : 3 playables `missing-local` confirmés ;
- page servie après rechargement : nouveaux libellés présents ;
- `npm run check` : réussi ;
- SHA-256 `data/video-library.json` :
  `9cc48a5c0fab83255823a83942a66e7f2ef373eb70dfb9c5a0b0da5d6c7d4410` ;
- SHA-256 `data/activities.json` : inchangé,
  `488c41d28a9d05d8292b04a63f68e4508dd038087ee0e77dabc05bdbbb4d09ed`.

Version applicative inchangée : **0.1.31**.

La recette visuelle a ensuite été validée après redémarrage ; le serveur réel a
été arrêté et le port 8891 est désormais libre. Aucun commit ni push.
