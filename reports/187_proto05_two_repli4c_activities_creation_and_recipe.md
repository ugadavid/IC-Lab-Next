# Rapport 187 — Création et recette des deux activités REPLI4C

## Périmètre

Création intégrale, par les routes applicatives normales de Proto05 et sans SQL direct, des deux activités recommandées dans `ANALYSE_CORPUS_QWEN3_24_VIDEOS.md`. Aucun code, schéma ou média n'a été modifié. La version applicative reste inchangée.

## Activités créées

### Comprendre, faire comprendre et réparer

- ID : `proto05-draft-1785695573737-0f2193`
- Média : asset `media-proto05-video-proto05-uga-37004`, playable `video-proto05-uga-37004`
- Extrait : 07:36–10:27 (`456000–627000 ms`)
- Contenu : fiche pédagogique complète, consigne étudiante, question générale, 5 segments non chevauchés, 3 locuteurs fonctionnels, 4 langues, 11 intervalles linguistiques, 3 couches, 5 phénomènes et 5 annotations.
- Stratégies travaillées : blocage explicite, clarification, geste et reformulation, rapprochement `ler/lire/leer/leggere`, validation collective.

### Comparer les effets du changement climatique

- ID : `proto05-draft-1785695655639-ef868d`
- Média : asset `media-proto05-uga-36988`, playable `video-proto05-uga-36988`
- Extrait : 00:24–02:15 (`24000–135000 ms`)
- Contenu : fiche pédagogique complète, consigne étudiante, question générale, 4 segments non chevauchés, 4 locuteurs fonctionnels, 4 langues, 4 intervalles linguistiques, 3 couches, 4 phénomènes et 4 annotations.
- Progression : espagnol, italien, portugais, français ; comparaison sécheresse/eau, pluies/inondations/littoral et réalités locales.
- La vidéo 36988 est exploitable : image lisible, lecture HLS continue, durée 2:22 et changement de langues/locuteurs cohérent avec le support. Le remplacement 36995 n'a pas été nécessaire.

Les libellés de segments sont volontairement des repères pédagogiques descriptifs : ils ne présentent pas la sortie Qwen3 comme une transcription verbatim certifiée. Les locuteurs sont désignés par rôle linguistique afin de ne pas inférer d'identité personnelle.

## Parcours et contrôles

- Les deux brouillons ont été créés depuis `/teacher/create`, avec sélection explicite du playable dans la Library.
- La fiche et l'authoring ont été sauvegardés via les API utilisées par les écrans enseignant, avec `If-Match` et révisions successives ; chaque activité est en révision 3.
- Réouverture réussie dans l'atelier guidé : données, fiche complète, timeline, langues, couches, phénomènes et annotations retrouvés.
- Cohérence automatique : segments ordonnés et sans chevauchement ; tous les phénomènes restent dans leur segment ; toutes les annotations référencent un segment existant.
- Aperçus enseignant : vidéo `readyState=4`, couches et transcription présentes, aucune erreur visible ni console.
- Vues étudiantes : clic sur le premier segment positionnant réellement la vidéo à `456 s` pour A et `24 s` pour B ; lecture continue, annotation active et timeline synchronisée.
- Contrôle visuel : vidéo 37004 lisible en galerie avec gestes visibles ; vidéo 36988 lisible sur le document partagé et les vignettes de réunion.
- Aucun défaut applicatif bloquant n'a été rencontré ; aucune correction de code n'a été nécessaire.

## Validation finale

David a validé la recette humaine le 2 août 2026. Les formulations restent des repères pédagogiques et non une transcription de recherche. L'anonymisation REPLI4C sera testée ultérieurement ; aucun nouveau traitement média n'a été lancé pendant la clôture.
