# Rapport - Prototypes statiques servis par Node

## Objectif

Seven Sieves fait maintenant partie du point d'entree local Dico-IC. Apres :

```bash
cd Node
npm start
```

le serveur Node existant sert a la fois l'API, l'administration et les
prototypes.

## Fichiers modifies

- `Node/server.js`
- `Node/test/static-files.test.js`
- `docs/dico-local-development-startup.md`
- `docs/dico-node-static-prototypes-report.md`
- `docs/docs-index.md`

## Configuration Express ajoutee

Le serveur possedait deja un montage statique pour l'administration :

```js
app.use("/admin-app", express.static(path.resolve(__dirname, "../admin"), {
  dotfiles: "deny",
  index: false,
}));
```

Le montage suivant a ete ajoute pour exposer le dossier `prototypes/` depuis le
meme serveur :

```js
app.use("/prototypes", express.static(path.resolve(__dirname, "../prototypes"), {
  dotfiles: "deny",
  index: false,
}));
```

La configuration garde les fichiers caches non servis et ne publie pas d'index
automatique.

## URL disponibles

- `http://localhost:3000/admin-app/index-admin-0.1.html`
- `http://localhost:3000/prototypes/01-seven-sieves/index-api-live-0.1.html`
- `http://localhost:3000/prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html`
- `http://localhost:3000/prototypes/01-seven-sieves/index-api-mock-0.1.html`
- `http://localhost:3000/prototypes/01-seven-sieves/index-0.0.8.2.html`

## Chemins verifies

Les chemins Seven Sieves existants restent relatifs au document HTML :

- `./js/seven-sieves-api-live-v0.js`
- `./js/seven-sieves-tamis4-pedagogical-hint-v0.js`
- `./mock/analysis-response-v0.json`

Aucune correction de chemin n'a ete necessaire dans Seven Sieves.

Les variantes live continuent d'appeler :

```text
http://localhost:3000/analysis
```

Depuis une page chargee sous `http://localhost:3000/prototypes/...`, cet appel
reste sur la meme origine applicative. Aucune politique CORS supplementaire
n'est donc necessaire pour ce nouveau mode d'acces.

## Navigation admin

L'administration principale contenait deja une entree :

```html
<a href="../prototypes/01-seven-sieves/index-api-live-0.1.html">Seven Sieves</a>
```

Sous `/admin-app/index-admin-0.1.html`, ce lien resout maintenant vers :

```text
http://localhost:3000/prototypes/01-seven-sieves/index-api-live-0.1.html
```

## Verifications realisees

- Lecture de `Node/server.js` pour identifier les endpoints API et le montage
  statique existant `/admin-app`.
- Lecture de l'admin principal pour verifier le lien `Seven Sieves`.
- Lecture des scripts Seven Sieves pour verifier les chemins relatifs et
  l'appel `fetch()` vers `/analysis`.
- Ajout d'un test Node confirmant que :
  - `/admin-app/index-admin-0.1.html` repond ;
  - `/prototypes/01-seven-sieves/index-api-live-0.1.html` repond ;
  - le script live Seven Sieves est servi ;
  - le mock JSON local est servi.
- Execution de `npm test` depuis `Node`.

## Compatibilite

- Pas de modification MariaDB.
- Pas de modification des endpoints REST.
- Pas de modification du contrat `POST /analysis`.
- Pas de second serveur.
- Pas de nouvel outil de developpement.
