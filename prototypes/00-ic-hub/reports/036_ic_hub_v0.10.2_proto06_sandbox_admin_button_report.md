# 036 - IC-Hub V0.10.2 - Bouton admin sandbox Proto06

Date: 2026-07-04

## Resume executif

L'administration Hub affiche maintenant un bloc explicite pour ouvrir la sandbox Proto06 V1.3-alpha depuis la vue Gouvernance.

Le bouton appelle :

```txt
POST /api/admin/proto06/sandbox/launch
```

Puis ouvre l'URL retournee dans un nouvel onglet, sans afficher le `sandboxAccessId`, sans logger la preuve et sans transmettre le token de session Hub principal dans l'interface.

Aucune generation IA n'est activee.

## Etat initial

Etat initial observe :

- changements V0.10.1 deja presents : `server.js` et rapport 035 ;
- Proto06 V1.2.3 stable sans diff ;
- `runs.json` sans diff ;
- `sessions.json` sans diff.

Cette passe V0.10.2 modifie uniquement l'admin Hub V0.9.6.

## Fichiers modifies

- `prototypes/00-ic-hub/public/admin-0.9.6.html`
- `prototypes/00-ic-hub/public/admin-0.9.6.css`
- `prototypes/00-ic-hub/public/admin-0.9.6.js`

Fichier cree :

- `prototypes/00-ic-hub/reports/036_ic_hub_v0.10.2_proto06_sandbox_admin_button_report.md`

## Emplacement du bloc sandbox

Le bloc est ajoute dans la vue :

```txt
#security / Gouvernance
```

Titre affiche :

```txt
Sandbox IA Proto06 V1.3-alpha
```

Badges affiches :

- Admin seulement ;
- Experimental ;
- Non publie ;
- Generation desactivee.

Texte d'intention :

```txt
Cette sandbox permet de preparer une future experimentation IA heritee de Proto06.
Elle ne publie rien, ne cree aucune assignation et ne modifie pas le parcours etudiant.
```

Le bloc rappelle aussi :

```txt
providerEnabled: false
generationEnabled: false
Parcours apprenant: non modifie
```

## Comportement du bouton

Bouton :

```txt
Ouvrir la sandbox Proto06
```

Au clic :

1. appel admin-authentifie vers `/api/admin/proto06/sandbox/launch` ;
2. reception d'une URL temporaire ;
3. ouverture de cette URL dans un nouvel onglet ;
4. affichage d'un statut court dans l'admin.

Messages prevus :

- succes : `Lien sandbox genere. Ouverture dans un nouvel onglet.` ;
- 401 : `Connexion admin requise.` ;
- 403 : `Acces reserve aux administrateurs.` ;
- erreur : `Impossible de generer le lien sandbox.`

L'URL complete n'est pas affichee dans le texte de l'admin.

## Tests admin / refus

Tests HTTP effectues sur l'endpoint de lancement :

```txt
admin -> 200
teacher -> 403
student -> 403
anonymous -> 401
```

Reponse admin expurgee :

```txt
launchUrl: http://127.0.0.1:8788/sandbox-1.3-alpha.html?sandboxAccessId=[redacted]
providerEnabled: false
generationEnabled: false
```

## Test navigateur

Page admin ouverte :

```txt
http://127.0.0.1:8790/admin-0.9.6.html#security
```

Verification avant clic :

- bloc `Sandbox IA Proto06 V1.3-alpha` visible ;
- bouton `Ouvrir la sandbox Proto06` visible ;
- aucun `sandboxAccessId` dans le texte visible de l'admin ;
- aucun `Bearer` dans le texte visible de l'admin ;
- aucun `api.openai.com` dans le texte visible de l'admin.

Apres clic :

- un onglet sandbox Proto06 est ouvert ;
- URL observee uniquement sous forme expurgee dans ce rapport ;
- la sandbox affiche `Acces admin confirme par IC-Hub` ;
- `providerEnabled: false` ;
- `generationEnabled: false` ;
- bouton de generation sandbox desactive ;
- aucun log console d'erreur observe.

Note de test : le navigateur de test bascule le contexte vers l'onglet sandbox ouvert, donc le statut textuel de l'onglet admin apres clic n'a pas ete relu de maniere fiable. Le comportement principal attendu, ouverture de la sandbox et confirmation d'acces, est valide.

## Securite

Confirmations :

- aucun appel OpenAI ;
- aucun appel `api.openai.com` ;
- aucun provider IA ;
- aucun endpoint IA existant modifie ;
- aucun bouton Publier cree ;
- aucun bouton Assigner cree ;
- aucun `sandboxAccessId` affiche dans le texte admin ;
- aucun token de session Hub affiche ;
- aucun token de session Hub transmis dans l'URL Proto06 ;
- aucune modification de `.env` ;
- aucune ecriture dans `run_events` ;
- aucune modification volontaire de `runs.json` ou `sessions.json`.

Le scan statique montre des mentions preexistantes de `.env`, `run_events` et de l'URL officielle OpenAI dans l'admin mainteneur. Elles ne correspondent pas a un nouvel appel provider dans cette passe.

## Checks

Syntaxe :

```bash
node --check prototypes/00-ic-hub/public/admin-0.9.6.js
```

Resultat : OK.

Runtime JSON :

```bash
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultat : aucun diff.

Proto06 V1.2.3 stable :

```txt
index-1.2.3.html, script-1.2.3.js, style-1.2.3.css sans diff.
```

## Flux etudiant stable intact

Le bouton est place dans l'admin Gouvernance.

Il ne cree :

- aucune assignation ;
- aucune publication ;
- aucun run apprenant ;
- aucune trace apprenante ;
- aucune activation generative.

Le flux etudiant Hub V0.10.1 -> Proto06 V1.2.3 reste intact.

## Etat Git final

Changements attendus de cette passe :

```txt
M  prototypes/00-ic-hub/public/admin-0.9.6.css
M  prototypes/00-ic-hub/public/admin-0.9.6.html
M  prototypes/00-ic-hub/public/admin-0.9.6.js
?? prototypes/00-ic-hub/reports/036_ic_hub_v0.10.2_proto06_sandbox_admin_button_report.md
```

Changements V0.10.1 encore presents dans le working tree :

```txt
M  prototypes/00-ic-hub/server/server.js
?? prototypes/00-ic-hub/reports/035_ic_hub_v0.10.1_proto06_sandbox_launch_bridge_report.md
```

## Recommandation suivante

Prochaine passe recommandee : ajouter un micro-test documente du parcours complet admin Hub -> bouton sandbox -> sandbox confirmee, puis preparer un checkpoint Git avant toute activation provider.

La generation IA doit rester desactivee tant que la validation institutionnelle et les garde-fous provider ne sont pas definis dans une mission separee.
