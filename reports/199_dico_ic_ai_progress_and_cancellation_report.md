# Mission 199 — Progression visible et annulation réelle de la génération

Date : 2026-08-18  
Composant : Dico-IC — assistant IA par texte, étape 3  
Version obtenue : assistant texte `0.1.9`  
Versions inchangées : administration principale `0.1.5`, API générale `0.1`, package Node `1.0.0`

## Problème ergonomique observé

Pendant l’appel long « Générer les concepts réellement manquants », l’état précédent reposait sur un message discret. L’application pouvait paraître figée et l’utilisateur ne pouvait pas arrêter une génération lancée avec une mauvaise sélection de langues.

La mission ajoute un retour visible sans pourcentage fictif et une annulation réelle, limitée à cette génération de l’étape 3. Les autres écrans IA ne sont pas étendus.

## État initial préservé

Les changements et rapports locaux des Missions 195 à 198 étaient présents au début de la mission et ont été préservés. Aucun commit, push ou déploiement n’a été effectué.

Le relevé MariaDB initial, effectué strictement en lecture seule, a établi la nouvelle référence canonique :

| Table | Volume initial |
| --- | ---: |
| `lexical_entry` | 285 |
| `lexical_form` | 1035 |
| `inflected_form` | 40 |
| `connector_help` | 12 |
| `form_relation` | 70 |
| `pattern_rule` | 1 |
| `ic_feature` | 8 |
| `language` | 12 |

Aucune restauration vers les anciens volumes 150/597/16 n’a été tentée.

## Fichiers concernés

- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html`
- `prototypes/08-dico-seven-sieves/admin/css/admin-ai-text-0.1.css`
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-0.1.js`
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-generation-0.1.js` (créé)
- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js`
- `prototypes/08-dico-seven-sieves/Node/server.js`
- `prototypes/08-dico-seven-sieves/Node/test/admin-ai-text-generation.test.js` (créé)
- `prototypes/08-dico-seven-sieves/Node/test/admin-ai-cancellation.test.js` (créé)
- `reports/199_dico_ic_ai_progress_and_cancellation_report.md` (créé)

Les fichiers des Missions 195 à 198 restent également modifiés ou non suivis dans la copie de travail ; ils ne sont pas réattribués à la seule Mission 199.

## Progression indéterminée et états affichés

Pendant l’appel, l’étape 3 affiche un bloc bleu clairement visible contenant :

- une barre HTML `progress` sans valeur, donc réellement indéterminée ;
- `Génération OpenAI en cours…` ;
- un chronomètre en secondes, démarrant à `0 s` ;
- la photographie immuable des langues sélectionnées au lancement ;
- `Aucun brouillon n’est encore écrit en base.`

Le bloc porte `role="status"`, `aria-live="polite"` et `aria-atomic="true"`. La barre possède un libellé accessible explicite. Aucun pourcentage ni avancement fournisseur fictif n’est présenté.

Les seules transitions affichées correspondent à des événements observables : attente de la génération OpenAI, puis « Affichage des brouillons… » après réception et avant rendu. Aucune pseudo-étape de validation serveur n’est simulée pendant l’attente HTTP.

Pendant la génération :

- le bouton de génération est désactivé ;
- toutes les cases de langues sont désactivées ;
- un second lancement est refusé par la session même si un événement était forgé ;
- le bouton distinct `Annuler la génération` reste actif.

À toute fin d’appel, la progression et le chronomètre s’arrêtent et les contrôles redeviennent cohérents.

## Annulation frontend

Le nouveau composant `CancellableGenerationSession` fournit :

- un `AbortController` propre à chaque appel ;
- un identifiant monotone de requête ;
- une copie des langues au lancement ;
- un chronomètre nettoyé à la réussite, à l’erreur ou à l’annulation ;
- un refus explicite du double lancement.

Le clic sur Annuler :

1. interrompt le `fetch` avec son signal ;
2. invalide immédiatement l’identité de la requête ;
3. réactive les contrôles et arrête l’animation ;
4. conserve le texte, les langues et les brouillons antérieurs ;
5. affiche `Génération annulée. Aucun nouveau brouillon n’a été créé.`

Une nouvelle analyse, un changement de langue source ou l’événement `pagehide` annule également l’appel actif. L’annulation volontaire est distinguée du timeout `OPENAI_TIMEOUT` et des erreurs réseau ou fournisseur.

Les variables `candidates` et `existingEntryKeys` ne sont remplacées qu’après une réponse réussie encore courante. Une annulation ou une erreur ne vide donc pas les brouillons existants.

## Propagation serveur et fournisseur

La route `POST /admin/ai/text-candidates` crée un contrôleur propre à la requête. Elle écoute :

- `aborted` sur la requête entrante ;
- `close` sur la réponse tant que celle-ci n’est pas terminée.

Le signal est transmis à `generateTextCandidates`, puis relié au `AbortController` déjà utilisé par le client OpenAI. La fermeture du client interrompt donc le `fetch` fournisseur sans tuer le serveur ni un processus global.

Après annulation, la route :

- ne lance pas `findExistingEntryKeys` ;
- ne valide ni ne transforme une réponse tardive ;
- ne tente pas de réponse JSON sur la connexion fermée ;
- ne déclenche aucune écriture.

Le code fournisseur classe une annulation client en `OPENAI_CANCELLED` (statut interne 499) et conserve `OPENAI_TIMEOUT` pour le délai de 90 secondes.

### Limite technique réelle

L’arrêt physique dépend du respect du standard `AbortSignal` par le transport fournisseur. Le `fetch` natif utilisé par le serveur le respecte et le test contrôlé confirme son interruption. Si un transport de remplacement ignorait volontairement le signal, le résultat resterait tout de même rejeté après retour grâce au contrôle du signal et à l’identité frontend ; le travail distant déjà accompli par ce transport non conforme ne pourrait pas être récupéré.

## Protection contre les réponses tardives

Chaque lancement reçoit un identifiant. Après A annulée, B peut démarrer immédiatement. Les blocs `try`, `catch` et `finally` de A vérifient tous que son identifiant est encore courant avant de modifier :

- les brouillons ;
- le message ;
- la progression ;
- l’état des contrôles.

Ainsi une résolution ou une erreur tardive de A ne peut ni écraser B, ni masquer sa progression, ni réactiver prématurément les contrôles.

## Tests automatisés

### Contrôles ciblés

La suite ciblée a réussi avec **57 tests sur 57**. Les nouveaux tests couvrent notamment :

- démarrage du chronomètre à zéro et progression ;
- photographie des langues ;
- refus du double lancement ;
- interruption du signal frontend ;
- A annulée, B lancée, fin tardive de A ignorée ;
- distinction annulation, timeout et erreur réseau ;
- présence des attributs accessibles et du bouton ;
- nouvelle analyse et départ de page reliés à l’annulation ;
- propagation du signal client au fournisseur simulé ;
- abandon HTTP réel ;
- absence de résolution complémentaire et d’écriture après abandon.

### Suite complète

`npm test` : **159 tests réussis sur 159**, aucun échec.

### Analyse statique

- `node --check` réussi sur les scripts frontend, serveur et tests concernés ;
- `git diff --check` réussi ;
- seuls les avertissements existants de future conversion LF vers CRLF sont signalés par Git.

## Recette déterministe d’annulation et de relance

Une fixture locale jetable, sans connexion MariaDB et sans appel OpenAI payant, a simulé :

- A longue ;
- son abandon fournisseur lors du clic utilisateur ;
- une tentative tardive de A ;
- B réussie après relance immédiate ;
- une troisième annulation après présence du brouillon B.

Résultats observés :

- progression visible à `1 s` ;
- langues affichées et figées : `FR, ES, IT, PT, EN` ;
- cases et bouton Générer désactivés ;
- bouton Annuler actif ;
- message neutre exact après annulation ;
- zéro brouillon après A ;
- fournisseur A signalé comme interrompu ;
- B affichée sous la clé `MISSION_199_SUCCESS` ;
- `LATE_A_MUST_NOT_APPEAR` absente ;
- brouillon B conservé après une annulation ultérieure ;
- aucune erreur de console ;
- état fixture : 3 appels, abandon fournisseur confirmé, tentative tardive confirmée, `persistentWrites: 0`.

La vérification visuelle a été effectuée à `1440 × 900` et `1366 × 768`. Le bloc est lisible, non anxiogène, sans débordement horizontal propre à l’étape 3 et les contrôles restent accessibles. Les captures ont été inspectées dans le navigateur mais n’ont pas été ajoutées au dépôt.

La fixture temporaire `mission199-visual-fixture.cjs` a été supprimée après recette. Les deux processus de fixture, PID 34052 puis 68840 lors de la reprise déterministe, ont été arrêtés. Les onglets de recette ont été fermés et la surcharge de viewport réinitialisée.

Cette recette Codex ne constitue pas la validation finale avec OpenAI réel, réservée à David.

## Volumes MariaDB après recette

Le contrôle final, toujours en lecture seule, donne :

| Table | Avant | Après |
| --- | ---: | ---: |
| `lexical_entry` | 285 | 285 |
| `lexical_form` | 1035 | 1035 |
| `inflected_form` | 40 | 40 |
| `connector_help` | 12 | 12 |
| `form_relation` | 70 | 70 |
| `pattern_rule` | 1 | 1 |
| `ic_feature` | 8 | 8 |
| `language` | 12 | 12 |

Les volumes sont strictement préservés. Aucune commande SQL d’écriture, migration, réinitialisation ou suppression n’a été exécutée.

## Processus préservés

Au contrôle final, deux services Node non lancés par la fixture Mission 199 écoutent :

- PID 30600 sur le port 3000, démarré à 16:29:04 ;
- PID 19852 sur le port 3100, démarré à 11:48:34.

Ils ont été préservés et n’ont pas été arrêtés. Aucun processus de fixture Mission 199 ne subsiste.

## Éléments non vérifiés et suites possibles

- Aucun appel OpenAI réel n’a été effectué ; David réalisera cette validation finale.
- Le comportement exact d’annulation côté infrastructure OpenAI dépend du transport HTTP réel, même si le `fetch` natif transmet et respecte le signal.
- Une validation humaine doit confirmer la lisibilité du bloc sur l’environnement habituel et l’arrêt perçu avec la clé réelle.
- Aucun écran IA autre que l’étape 3 de l’assistant texte n’a été modifié.

## Versionnement

L’assistant texte passe de `0.1.8` à `0.1.9`, petite évolution ergonomique et technique conforme au versionnement par baby steps. L’API générale reste rétrocompatible en `0.1`, l’administration principale reste `0.1.5` et le package Node reste `1.0.0`.

## Message de commit global proposé — Missions 195 à 199

`fix(dico): fiabiliser les lots IA et rendre la génération annulable`
