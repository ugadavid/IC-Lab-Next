# Prototype 05 — polissage de l’atelier guidé

Version livrée : **0.1.4.1**

## Réalisé

- Correction de l’encodage UTF-8 de la page guidée et conservation de `charset=utf-8`.
- Affichage et édition des bornes temporelles en `mm:ss`, avec validation stricte avant application.
- Mise en page responsive des champs début/fin.
- Légende explicite des trois pistes de timeline : Transcription (bleu), Langues entendues (orange), Phénomènes IC (violet).
- Libellés lisibles dans le panneau de sélection et conservation des boutons d’ajout.
- Version du prototype portée à 0.1.4.1.

## Vérifications

- Contrôle statique de l’absence de séquences mojibake dans `teacher-guided.html`.
- Vérification du chargement du serveur, du type MIME HTML UTF-8 et de l’API d’activité.
- Vérification de la syntaxe JavaScript embarquée, `npm run check` et `git diff --check`.

## Limites

La validation image/lecture dépend d’un navigateur Chromium disponible et du flux HLS distant ; aucune modification de modèle de données, de route API ou d’interface avancée n’a été introduite.
