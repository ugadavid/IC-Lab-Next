# 033 - IC-Hub V0.10.0 - Pont admin-only pour sandbox Proto06

Date: 2026-07-03

## Resume executif

IC-Hub V0.10.0 ajoute un premier pont d'acces admin-only pour la sandbox Proto06 V1.3-alpha.

Endpoint ajoute :

```txt
GET /api/admin/proto06/sandbox/access
```

Cet endpoint permet au Hub de confirmer qu'un utilisateur connecte est admin avant toute future activation de generation dans la sandbox. Il ne cree pas de token court, ne declenche aucun provider, n'appelle pas OpenAI et n'ecrit rien dans les traces ou les fichiers runtime.

## Endpoint ajoute

Route :

```txt
GET /api/admin/proto06/sandbox/access
```

Reponse admin :

```json
{
  "allowed": true,
  "role": "admin",
  "sandbox": "proto06-v1.3-alpha",
  "providerEnabled": false,
  "generationEnabled": false
}
```

Reponses refusees :

- non connecte : `401` ;
- teacher : `403` ;
- student : `403`.

La route est volontairement separee de `/api/admin/ai` pour ne pas modifier les endpoints IA existants.

## Strategie d'acces

La strategie utilise l'auth Hub deja en place :

```txt
Authorization: Bearer <session Hub>
-> requireUser
-> requireRole(["admin"])
-> reponse courte sandbox
```

L'endpoint ne lit pas `.env`, ne lit pas de cle API et ne renvoie aucun token.

Il indique explicitement que le provider et la generation sont desactives :

```txt
providerEnabled: false
generationEnabled: false
```

## Tests HTTP

Tests effectues avec des sessions locales existantes, sans afficher les tokens.

### Admin

```txt
GET /api/admin/proto06/sandbox/access -> 200
```

Resultat :

```json
{
  "allowed": true,
  "role": "admin",
  "sandbox": "proto06-v1.3-alpha",
  "providerEnabled": false,
  "generationEnabled": false
}
```

### Teacher

```txt
GET /api/admin/proto06/sandbox/access -> 403
```

Resultat :

```json
{
  "error": "Acces refuse pour ce role."
}
```

### Student

```txt
GET /api/admin/proto06/sandbox/access -> 403
```

Resultat :

```json
{
  "error": "Acces refuse pour ce role."
}
```

### Non connecte

```txt
GET /api/admin/proto06/sandbox/access -> 401
```

Resultat :

```json
{
  "error": "Connexion requise."
}
```

## Securite

Confirmations :

- aucun appel OpenAI ;
- aucun appel provider ;
- aucun endpoint IA existant modifie ;
- aucun brouillon IA expose ;
- aucun token court cree ;
- aucun secret renvoye ;
- aucun log de token ;
- aucune lecture ou exposition de `.env` ;
- aucune ecriture dans `run_events` ;
- aucune ecriture volontaire dans `runs.json` ou `sessions.json`.

Le scan statique montre les modules OpenAI preexistants du Hub, mais l'endpoint sandbox ne les appelle pas.

## Flux etudiant intact

Le flux valide reste intact :

```txt
Hub V0.9.9 / V0.10.0
-> assignation Proto06
-> index-1.2.3.html
-> activitySource=hub-manifest
-> manifestId=climate-roundtable-demo
-> runtime scenarise
-> traces sobres
```

Aucun fichier Proto06 stable V1.2.3 n'a ete modifie.

## Verifications techniques

Syntaxe :

```bash
node --check prototypes/00-ic-hub/server/server.js
```

Resultat : OK.

Serveur :

```txt
GET /api/health -> 200
version: 0.10.0
store: json
```

Runtime JSON :

```bash
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultat : aucun diff.

Prototype 06 :

```bash
git status --short -- prototypes/06-voice-agent-ic
```

Resultat : aucun diff au debut et aucun changement pendant cette mission.

## Fichiers modifies

- `prototypes/00-ic-hub/server/server.js`

Fichier cree :

- `prototypes/00-ic-hub/reports/033_ic_hub_v0.10.0_proto06_sandbox_admin_access_report.md`

## Recommandation suivante

Prochaine passe recommandee : connecter la page sandbox Proto06 a cet endpoint en lecture seule.

Perimetre prudent :

- la sandbox appelle `GET http://127.0.0.1:8790/api/admin/proto06/sandbox/access` avec une session Hub admin si disponible ;
- admin voit `Acces admin confirme` ;
- teacher/student/non connecte voient un refus clair ;
- le bouton generation reste desactive ;
- aucun provider IA ;
- aucun OpenAI ;
- aucun run_event.
