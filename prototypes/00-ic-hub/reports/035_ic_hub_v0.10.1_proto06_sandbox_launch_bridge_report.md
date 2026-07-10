# 035 - IC-Hub V0.10.1 - Lancement admin vers sandbox Proto06

Date: 2026-07-03

## Resume executif

IC-Hub V0.10.1 ajoute un pont de lancement admin-only vers la sandbox Proto06 V1.3-alpha.

Le Hub peut maintenant generer une URL de sandbox avec une preuve courte et temporaire :

```txt
http://127.0.0.1:8788/sandbox-1.3-alpha.html?sandboxAccessId=[redacted]
```

Cette preuve permet a la sandbox de verifier l'acces aupres du Hub sans transmettre le token de session Hub principal dans l'URL Proto06.

Aucun provider IA n'est appele, aucun texte n'est genere, aucun run apprenant n'est cree et le bouton de generation reste desactive.

## Etat initial

Etat Git initial : propre avant modification.

Verifications initiales :

- Proto06 V1.2.3 stable sans diff ;
- `runs.json` sans diff ;
- `sessions.json` sans diff ;
- aucun fichier `.env` lu, affiche, logge ou modifie ;
- aucun appel OpenAI effectue.

## Endpoints ajoutes

### Preparation du lancement sandbox

```txt
POST /api/admin/proto06/sandbox/launch
```

Comportement :

- admin uniquement ;
- teacher refuse ;
- student refuse ;
- non connecte refuse ;
- cree une preuve temporaire en memoire ;
- ne stocke rien dans `runs.json` ;
- ne stocke rien dans `sessions.json` ;
- ne cree pas de run apprenant.

Reponse admin :

```json
{
  "sandbox": "proto06-v1.3-alpha",
  "launchUrl": "http://127.0.0.1:8788/sandbox-1.3-alpha.html?sandboxAccessId=[redacted]",
  "expiresInSeconds": 300,
  "providerEnabled": false,
  "generationEnabled": false
}
```

### Verification de preuve temporaire

```txt
GET /api/admin/proto06/sandbox/access/:sandboxAccessId
```

Comportement :

- verifie que la preuve existe en memoire ;
- verifie implicitement qu'elle n'a pas expire, car les preuves expirees sont nettoyees ;
- repond sans exposer de secret ;
- ne declenche aucune generation ;
- ne requiert pas le token de session Hub principal, puisque la preuve a deja ete creee par un admin.

Reponse preuve valide :

```json
{
  "allowed": true,
  "role": "admin",
  "sandbox": "proto06-v1.3-alpha",
  "providerEnabled": false,
  "generationEnabled": false,
  "expiresAt": "..."
}
```

Reponse preuve absente, invalide ou expiree :

```json
{
  "allowed": false,
  "error": "Acces sandbox expire ou invalide.",
  "sandbox": "proto06-v1.3-alpha",
  "providerEnabled": false,
  "generationEnabled": false
}
```

## Strategie de preuve temporaire

La preuve est un identifiant aleatoire court cree avec `crypto.randomBytes`.

Stockage :

- en memoire process uniquement ;
- pas de base ;
- pas de JSON runtime ;
- pas de `runs.json` ;
- pas de `sessions.json`.

Duree de vie :

```txt
300 secondes
```

La preuve contient uniquement des metadonnees minimales en memoire :

- identifiant de preuve ;
- id utilisateur admin createur ;
- role ;
- date de creation ;
- date d'expiration.

Le token de session Hub principal n'est jamais place dans l'URL Proto06.

## URL generee

Format :

```txt
http://127.0.0.1:8788/sandbox-1.3-alpha.html?sandboxAccessId=[redacted]
```

Verification effectuee :

```txt
launchUrlContainsSessionToken: false
```

## Tests HTTP

### Admin

```txt
POST /api/admin/proto06/sandbox/launch -> 200
```

Resultat :

```txt
sandbox: proto06-v1.3-alpha
expiresInSeconds: 300
providerEnabled: false
generationEnabled: false
```

### Teacher

```txt
POST /api/admin/proto06/sandbox/launch -> 403
```

### Student

```txt
POST /api/admin/proto06/sandbox/launch -> 403
```

### Non connecte

```txt
POST /api/admin/proto06/sandbox/launch -> 401
```

### Preuve valide

```txt
GET /api/admin/proto06/sandbox/access/[redacted] -> 200
allowed: true
role: admin
providerEnabled: false
generationEnabled: false
```

### Preuve invalide

```txt
GET /api/admin/proto06/sandbox/access/invalid-proof -> 403
```

Le test d'expiration n'a pas ete realise par attente reelle des 300 secondes. La logique nettoie les preuves expirees avant verification.

## Tests sandbox Proto06

La sandbox lit maintenant `sandboxAccessId` depuis l'URL.

### Preuve valide

URL testee avec preuve expurgee :

```txt
http://127.0.0.1:8788/sandbox-1.3-alpha.html?sandboxAccessId=[redacted]
```

Affichage observe :

```txt
Acces admin confirme par IC-Hub
providerEnabled: false
generationEnabled: false
Generation IA desactivee : provider non connecte.
```

Bouton generation : desactive.

### Preuve absente

URL :

```txt
http://127.0.0.1:8788/sandbox-1.3-alpha.html
```

Affichage observe :

```txt
Preuve temporaire Hub absente
Generation IA desactivee : preuve temporaire absente.
```

Bouton generation : desactive.

### Preuve invalide

URL :

```txt
http://127.0.0.1:8788/sandbox-1.3-alpha.html?sandboxAccessId=invalid-proof
```

Affichage observe :

```txt
Acces sandbox expire ou invalide
Generation IA desactivee : preuve temporaire invalide.
```

Bouton generation : desactive.

## Securite

Confirmations :

- aucun appel OpenAI ;
- aucun appel `api.openai.com` ;
- aucun provider IA ;
- aucun endpoint IA existant modifie ;
- aucun bouton Publier cree ;
- aucun bouton Assigner cree ;
- aucun token de session Hub principal transmis a Proto06 ;
- aucune preuve affichee dans le DOM ;
- aucun secret affiche ;
- aucun log console observe dans les tests navigateur ;
- aucune lecture, copie ou exposition de `OPENAI_API_KEY` ;
- aucune modification de `.env` ;
- aucune ecriture dans `run_events` ;
- aucune modification volontaire de `runs.json` ou `sessions.json`.

Le scan statique montre des references preexistantes a `.env`, `OPENAI_API_KEY` et `Bearer` dans le serveur Hub, ainsi que les mentions `.env` et `run_events` dans la liste des donnees interdites de la sandbox. Ces references ne sont pas liees a un appel provider dans cette mission.

## Checks

Syntaxe :

```bash
node --check prototypes/00-ic-hub/server/server.js
node --check prototypes/06-voice-agent-ic/sandbox-1.3-alpha.js
```

Resultat : OK.

Runtime JSON :

```bash
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultat : aucun diff.

## Flux etudiant stable intact

Les fichiers Proto06 V1.2.3 ne sont pas modifies :

- `index-1.2.3.html`
- `script-1.2.3.js`
- `style-1.2.3.css`

Le flux Hub V0.10.0 / V0.10.1 -> Proto06 V1.2.3 reste hors perimetre de cette passe.

## Etat Git final

Changements attendus :

```txt
M  prototypes/00-ic-hub/server/server.js
M  prototypes/06-voice-agent-ic/sandbox-1.3-alpha.css
M  prototypes/06-voice-agent-ic/sandbox-1.3-alpha.html
M  prototypes/06-voice-agent-ic/sandbox-1.3-alpha.js
?? prototypes/00-ic-hub/reports/035_ic_hub_v0.10.1_proto06_sandbox_launch_bridge_report.md
```

## Recommandation suivante

Prochaine passe recommandee : ajouter dans l'admin Hub un bouton explicite de lancement sandbox admin, visible uniquement pour les admins, qui appelle `POST /api/admin/proto06/sandbox/launch` puis ouvre l'URL retournee.

Le bouton devra rester separe des parcours etudiants, sans publication, sans assignation et sans activation provider.
