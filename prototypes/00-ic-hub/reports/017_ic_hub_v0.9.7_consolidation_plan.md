# 017 - IC-Hub V0.9.7 - Consolidation plan

Date: 2026-07-03

## Resume executif

Cette mission est un audit preparatoire pour V0.9.7. Aucune modification fonctionnelle n'a ete effectuee.

Etat global : le Hub V0.9.6 + correctif V0.9.6.1 est stable pour engager une passe de consolidation. La prochaine version devrait rester limitee a l'hygiene, a la lisibilite, aux garde-fous et a la stabilite UX de l'admin IA.

Conclusion : pret pour une mission V0.9.7 limitee, a condition de ne pas toucher a Prototype 06, de ne pas modifier les endpoints IA, et de surveiller `runs.json` / `sessions.json` avant tout commit.

## Etat initial Git

Commandes lancees :

```bash
git status --short
git status --short prototypes/06-voice-agent-ic prototypes/06-*
git diff -- prototypes/00-ic-hub/server/data/runs.json prototypes/00-ic-hub/server/data/sessions.json
```

Resultats :

- `git status --short` : aucune sortie au debut de l'audit.
- Prototype 06 : aucune sortie, donc aucune modification detectee.
- `runs.json` : aucun diff.
- `sessions.json` : aucun diff.

Apres creation de ce rapport, le seul changement attendu est :

```txt
?? prototypes/00-ic-hub/reports/017_ic_hub_v0.9.7_consolidation_plan.md
```

## Rappel des garde-fous

- Ne pas modifier Prototype 06.
- Ne pas lire, afficher, logger ou copier `OPENAI_API_KEY`.
- Ne pas appeler OpenAI depuis le navigateur.
- Ne pas ajouter d'IA generative dans le parcours apprenant.
- Ne pas envoyer de texte apprenant a OpenAI.
- Ne pas ecrire de brouillons IA dans `run_events`.
- Ne pas modifier `runs.json` ou `sessions.json` sans demande explicite.
- Ne pas ajouter de fonctionnalite majeure dans V0.9.7.

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

## Diagnostic UX admin IA

Fichiers inspectes :

- `public/admin-0.9.6.html`
- `public/admin-0.9.6.css`
- `public/admin-0.9.6.js`

### Points solides

- L'app-shell V0.9.6.1 corrige le recouvrement topbar/contenu.
- La sidebar est maintenant la navigation principale.
- Les vues principales sont pilotees par hash.
- La navigation horizontale ambigue a ete retiree du HTML.
- Le reload sur hash est couvert par la logique `activateShellView(...)`.

### Points a consolider sans urgence

1. Restes CSS inutiles
   - `.legacy-space-nav` existe encore dans le CSS alors que la navigation horizontale a ete retiree du HTML.
   - Recommandation : supprimer les styles morts lies a l'ancienne navigation.

2. Numerotation et noms de sections
   - La sidebar utilise `04 Generer`, `05 Evaluer`, `06 Comparer`, mais le panneau HTML associe reste `space-lab` avec `data-view="generate"`.
   - Les sous-vues Evaluer et Comparer sont des modes CSS du meme panneau, ce qui fonctionne mais peut rendre le code moins lisible.
   - Recommandation : renommer ou clarifier les titres internes selon le mode actif, sans dupliquer la logique.

3. Encodage / accents
   - Le HTML contient au moins un signe visible de mojibake sur le nom Lucia.
   - Recommandation : nettoyer les textes affiches en restant coherent avec l'encodage UTF-8 du fichier.

4. Structure HTML dense
   - `admin-0.9.6.html` contient plusieurs sections longues imbriquees dans un meme panneau.
   - Les sections `AIConfig` et `Systeme` sont compactees sur une ligne, ce qui nuit a la relecture.
   - Recommandation : reformatter seulement le HTML pour lisibilite, sans changer la structure DOM utile.

5. JS monolithique
   - `admin-0.9.6.js` fait environ 1687 lignes.
   - Il gere a la fois shell, catalogue, AIConfig, generation, draft packs, evaluation, comparaison, ownership et rendu systeme.
   - Recommandation V0.9.7 prudente : ajouter uniquement des petits regroupements de constantes / helpers, ou extraire des blocs purement locaux si cela reste sans impact fonctionnel.

6. Navigation hash
   - `hashchange` et `popstate` appellent tous deux `activateShellView(...)`.
   - Cela fonctionne, mais peut entrainer des appels doubles selon navigateur.
   - Recommandation : conserver le comportement actuel pour V0.9.7 sauf bug observe; documenter avant de simplifier.

7. Textes d'aide
   - Les textes de securite sont presents, parfois repetitifs.
   - Recommandation : clarifier les differences entre "generation admin-only", "draft pack local", "evaluation locale" et "comparaison locale".

## Diagnostic securite IA

### Navigateur

Scan effectue dans `public/admin-0.9.6.js`.

Observations :

- Les `fetch(...)` navigateur appellent les endpoints locaux du Hub.
- Aucun `fetch` navigateur vers `https://api.openai.com` n'a ete detecte.
- `OPENAI_OFFICIAL_BASE_URL` est une constante informative utilisee pour remplir le champ Base URL, pas pour appeler OpenAI depuis le navigateur.
- `localStorage` reste limite au token d'auth existant; les brouillons, evaluations, imports et comparaisons restent en memoire JS.

### Serveur

Observations :

- Les appels OpenAI reels restent dans `server/ai/openaiRuntime.js` et `server/ai/openaiModels.js`.
- Les endpoints `/api/admin/ai/*` passent par `handleAdminAi(...)`.
- Le rapport 016 a confirme que teacher/student recoivent `403` sur endpoint admin IA.
- Les brouillons IA serveur retournent `stored: false`.
- La safety IA retourne `studentTextSent: false` et `storedInRunEvents: false`.

Conclusion : les garde-fous IA tiennent. V0.9.7 ne devrait pas modifier ces chemins sans mission separee.

## Plan V0.9.7 en trois niveaux

### Niveau 1 - Corrections sans risque

Priorite haute, faible blast radius.

1. Supprimer les styles CSS morts lies a l'ancienne navigation horizontale.
2. Corriger les textes mojibake visibles, par exemple le nom Lucia.
3. Reformatter les sections HTML compactees sur une ligne.
4. Harmoniser quelques intitules : `Tableau` vs `Vue d'ensemble`, `Securite` vs `Gouvernance`, `Systeme` vs `Health et donnees techniques`.
5. Ajouter des commentaires courts uniquement autour du shell hash navigation et des trois sous-modes Lab.
6. Verifier apres chaque mini-changement :
   - `node --check public/admin-0.9.6.js`
   - ouverture admin;
   - navigation hash;
   - absence de diff `runs.json` / `sessions.json`.

### Niveau 2 - Ameliorations UX legeres

Priorite moyenne, a faire seulement si Niveau 1 reste propre.

1. Ajouter un court sous-titre dynamique dans le Lab selon le mode actif :
   - Generer : produire un lot commun.
   - Evaluer : noter un lot importe ou genere.
   - Comparer : comparer plusieurs exports locaux.
2. Renforcer les badges de mode actif dans la zone centrale, sans creer de nouvelle navigation.
3. Clarifier les textes "Cette vue sert a..." et "Cette vue ne fait pas..." dans Generer / Evaluer / Comparer.
4. Ameliorer les messages d'import :
   - distinguer schema invalide, fichier trop lourd, JSON invalide, brouillon sans texte.
5. Ajouter une confirmation visuelle plus claire apres export local, sans stockage serveur.

### Niveau 3 - Decisions a arbitrer plus tard

Ne pas faire dans la premiere passe V0.9.7 sans validation explicite.

1. Sortir `runs.json` et `sessions.json` du suivi Git ou les transformer en fixtures/exemples.
2. Decouper `admin-0.9.6.js` en plusieurs fichiers modules.
3. Creer de vrais fichiers `admin-0.9.7.*` au lieu de patcher V0.9.6.
4. Modifier l'architecture des vues Lab pour avoir trois vrais panneaux DOM separes.
5. Modifier les endpoints IA ou le runtime OpenAI.
6. Ajouter des tests automatises navigateur.
7. Changer la politique de stockage JSON / MariaDB.

## Ce qu'il ne faut pas faire maintenant

- Ne pas modifier Prototype 06.
- Ne pas modifier `.env`.
- Ne pas afficher ou logger la cle OpenAI.
- Ne pas appeler OpenAI depuis le navigateur.
- Ne pas ajouter de parcours IA apprenant.
- Ne pas envoyer de texte apprenant a OpenAI.
- Ne pas ecrire de brouillons IA dans `run_events`.
- Ne pas modifier `runs.json` ou `sessions.json`.
- Ne pas refactorer massivement `server.js` ou `admin-0.9.6.js`.
- Ne pas ajouter une nouvelle base, un ORM, une auth plus complexe ou un backend supplementaire.

## Proposition de prochaine mission Codex limitee et sure

Mission suggeree : **IC-Hub V0.9.7 - micro-cleanup admin IA sans changement fonctionnel**.

Perimetre recommande :

1. Corriger les textes mojibake visibles dans `public/admin-0.9.6.html`.
2. Supprimer `.legacy-space-nav` si aucun element HTML ne l'utilise.
3. Reformatter les sections HTML compactees `AIConfig` et `Systeme`.
4. Harmoniser les titres sidebar / vue centrale.
5. Ajouter un micro-rapport `018_ic_hub_v0.9.7_admin_cleanup_report.md`.
6. Verifier :
   - `git status --short`;
   - Prototype 06 propre;
   - `runs.json` / `sessions.json` sans diff;
   - `node --check public/admin-0.9.6.js`;
   - navigation admin sur `#dashboard`, `#generate`, `#evaluate`, `#compare`.

Definition de fini :

- aucun changement fonctionnel;
- aucun changement endpoint;
- aucune generation OpenAI appelee;
- aucun fichier runtime modifie;
- rapport 018 cree;
- UI admin plus lisible et plus coherente.
