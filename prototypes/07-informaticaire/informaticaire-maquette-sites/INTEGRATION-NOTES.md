# Informaticaire — maquette Sites validée

Cette archive contient la maquette graphique et fonctionnelle validée le 20 août 2026.

Elle doit être extraite dans un dossier distinct à la racine du prototype Informaticaire. Elle ne remplace pas directement les fichiers `index.html`, `script.js`, `styles.css` ou `data.js` de l’application existante.

## Ce que la maquette matérialise

- un accueil compact avec recherche immédiate ;
- une navigation principale réduite à Explorer, Carte, Visite, Contribuer et Comprendre ;
- un explorateur de fiches coloré par familles documentaires ;
- une carte interactive des relations entre fiches ;
- un panneau de voisinage explicitant les relations documentées ;
- une distinction visuelle entre type de fiche et état documentaire.

## Données de démonstration

Les fiches présentes dans la maquette sont représentatives. L’intégration doit les remplacer par les 110 fiches, 414 liens et 86 relations du fichier `data.js` réel, sans perdre les fonctions existantes d’Informaticaire.

## Lancer la maquette seule

```bash
npm install
npm run dev
```

La maquette sert de référence d’interface et d’interaction pour la future Mission 225. Le fichier `.openai/hosting.json` et les dépendances installées ne sont volontairement pas inclus dans l’archive.
