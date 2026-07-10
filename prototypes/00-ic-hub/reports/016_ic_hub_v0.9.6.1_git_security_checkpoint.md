# 016 - IC-Hub V0.9.6.1 - Git + security checkpoint

Date: 2026-07-03

## Resume executif

Checkpoint effectue avant V0.9.7.

Resultat general : pret pour commit / V0.9.7 avec une reserve a traiter ou assumer : `runs.json` et `sessions.json` sont actuellement suivis par Git et ne sont pas proteges par `.gitignore`.

Aucune modification Prototype 06 n'a ete detectee. Les checks syntaxiques des fichiers cles passent. Les endpoints IA admin restent proteges par role admin. Aucun secret n'a ete lu ni affiche.

## Etat Git

Commande lancee :

```bash
git status --short
```

Resultat au moment du checkpoint, avant creation de ce rapport :

```txt
<aucune sortie>
```

Interpretation :

- aucun fichier modifie;
- aucun fichier ajoute;
- aucun fichier supprime;
- aucun changement staged;
- aucune modification detectee dans `prototypes/06-*`.

Apres creation de ce rapport, le seul changement attendu est :

```txt
?? prototypes/00-ic-hub/reports/016_ic_hub_v0.9.6.1_git_security_checkpoint.md
```

## Fichiers sensibles verifies

Commandes utilisees :

```bash
git ls-files .env
git ls-files "*node_modules*"
git ls-files prototypes/00-ic-hub/server/data/runs.json
git ls-files prototypes/00-ic-hub/server/data/sessions.json
git check-ignore -v .env
git check-ignore -v prototypes/00-ic-hub/server/node_modules
git check-ignore -v prototypes/00-ic-hub/server/data/runs.json
git check-ignore -v prototypes/00-ic-hub/server/data/sessions.json
```

Resultats :

- `.env` : non suivi par Git; ignore par `.gitignore`.
- `node_modules` : non suivi par Git; ignore par `.gitignore`.
- `runs.json` : suivi par Git.
- `sessions.json` : suivi par Git.
- `runs.json` : non protege par `.gitignore`.
- `sessions.json` : non protege par `.gitignore`.

Etat runtime au checkpoint :

- `git diff -- prototypes/00-ic-hub/server/data/runs.json` : aucun diff.
- `git diff -- prototypes/00-ic-hub/server/data/sessions.json` : aucun diff.

Anomalie a signaler :

- `runs.json` et `sessions.json` sont des fichiers runtime suivis. Ils sont propres actuellement, mais peuvent facilement polluer un commit apres tests manuels.

## Protection `.gitignore`

Contenu pertinent observe :

```txt
.env
.env.*
!.env.example

node_modules/
**/node_modules/

*.log
npm-debug.log*
```

Conclusion :

- protection OK pour `.env`;
- protection OK pour `node_modules`;
- protection absente pour les JSON runtime du hub.

## Prototype 06

Commande lancee :

```bash
git status --short prototypes/06-voice-agent-ic prototypes/06-*
```

Resultat :

```txt
<aucune sortie>
```

Conclusion : aucune modification detectee dans Prototype 06.

## Checks syntaxiques

Commandes lancees :

```bash
node --check server.js
node --check ai/openaiRuntime.js
node --check public/admin-0.9.6.js
node --check stores/mariadbStore.js
node --check db/migrate-json-to-mariadb.js
```

Resultats :

- `server.js` : OK.
- `ai/openaiRuntime.js` : OK.
- `public/admin-0.9.6.js` : OK.
- `stores/mariadbStore.js` : OK.
- `db/migrate-json-to-mariadb.js` : OK.

## Verification securite IA

### Appels navigateur

Scan effectue dans `prototypes/00-ic-hub/public`.

Observations :

- les `fetch(...)` navigateur pointent vers des chemins locaux du hub;
- aucune occurrence de `fetch("https://api.openai.com...")` n'a ete detectee;
- `public/admin-0.9.6.js` contient `OPENAI_OFFICIAL_BASE_URL`, utilise comme valeur indicative de configuration, pas comme endpoint `fetch` direct;
- aucune cle API n'a ete affichee ou lue.

Conclusion : aucun appel OpenAI direct depuis le navigateur detecte.

### Appels OpenAI serveur

Observations :

- `server/ai/openaiRuntime.js` cree le client OpenAI cote serveur avec `process.env.OPENAI_API_KEY`;
- `server/ai/openaiModels.js` synchronise les modeles OpenAI cote serveur;
- aucune valeur de cle n'est affichee dans les resultats du checkpoint.

Conclusion : les appels OpenAI reels restent cote serveur.

### Endpoints admin IA

Observation code :

- `handleAdminAi(...)` commence par `requireRole(response, user, ["admin"])`;
- les routes `/api/admin/ai/*` passent par `handleAdminAi(...)`.

Test HTTP effectue :

```txt
teacher -> GET /api/admin/ai/status : 403
student -> GET /api/admin/ai/status : 403
```

Conclusion : endpoints IA admin-only confirmes.

### Store false et run_events

Observations :

- `server/ai/openaiRuntime.js` retourne `stored: false`;
- la safety retourne `studentTextSent: false`;
- la safety retourne `storedInRunEvents: false`;
- `public/admin-0.9.6.js` affiche les brouillons comme `store=false`;
- aucun diff detecte dans `runs.json` apres le checkpoint.

Conclusion : aucun brouillon IA n'a ete ecrit dans `run_events`.

## Anomalies et points de vigilance

1. `runs.json` et `sessions.json` sont suivis par Git.
   - Risque : bruit de commit apres tests.
   - Etat actuel : propres au checkpoint.

2. `.gitignore` ne protege pas les JSON runtime.
   - La mission demandait seulement un audit, donc aucune modification `.gitignore` n'a ete faite.

3. Les anciennes pages admin versionnees contiennent encore des constantes d'URL OpenAI a usage informatif.
   - Aucun `fetch` navigateur direct vers `api.openai.com` n'a ete detecte.

## Recommandation

Pret pour commit / V0.9.7 sous reserve de surveiller `runs.json` et `sessions.json` au moment du commit.

Recommandation avant commit :

```bash
git status --short
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Si une passe de hygiene Git est acceptee plus tard, envisager une decision explicite sur les fichiers runtime JSON : les garder versionnes comme fixtures de demo ou les sortir du suivi avec migration vers fichiers exemples.
