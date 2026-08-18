# Mission 198 — Tolérance des propositions IA invalides

Date : 2026-08-18  
Composant : Dico-IC — assistant IA par texte  
Version obtenue : assistant IA `0.1.8`  
Versions inchangées : API `0.1`, serveur Node `1.0.0`, administration principale `0.1.5`

## Périmètre

La mission rend les réponses OpenAI partiellement invalides récupérables au niveau de chaque proposition. Une proposition non demandée, dupliquée ou isolément mal formée est désormais ignorée sans faire échouer le lot entier. Les erreurs globales — JSON illisible, contrat global absent, réseau, authentification ou timeout — restent bloquantes.

Le traitement reste limité à la génération de candidats. Il n'écrit ni dans MariaDB ni dans une autre donnée canonique.

## Fichiers concernés

- `prototypes/08-dico-seven-sieves/Node/src/admin-ai-inflected-form.js`
- `prototypes/08-dico-seven-sieves/Node/server.js`
- `prototypes/08-dico-seven-sieves/Node/test/admin-ai-inflected-form.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/admin-ai-text-batches.test.js`
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-batches-0.1.js`
- `prototypes/08-dico-seven-sieves/admin/js/admin-ai-text-0.1.js`
- `prototypes/08-dico-seven-sieves/admin/css/admin-ai-text-0.1.css`
- `prototypes/08-dico-seven-sieves/admin/index-admin-ai-text-0.1.html`
- `reports/198_dico_ic_ai_invalid_proposal_tolerance_report.md`

Les deux fichiers de gestion et de test des lots, encore non suivis par Git, proviennent des Missions 196 et 197 et sont préservés dans leur état enrichi par la présente mission. Les rapports 195 à 197 restent également non suivis. Aucun commit ni push n'a été effectué.

## Fonctionnalités réalisées

### Filtrage serveur proposition par proposition

Le parseur conserve uniquement les candidats dont `surface_form` et `language` correspondent exactement, caractère pour caractère, à une combinaison demandée. Il ignore individuellement :

- une surface non demandée (`UNREQUESTED_SURFACE`) ;
- une langue non demandée (`UNREQUESTED_LANGUAGE`) ;
- une combinaison surface-langue non demandée (`UNREQUESTED_COMBINATION`) ;
- un doublon exact (`DUPLICATE_PROPOSAL`) ;
- une proposition isolément non conforme au contrat (`INVALID_CONTRACT`).

Chaque proposition ignorée produit un avertissement structuré `IGNORED_INFLECTED_PROPOSAL` avec son motif et son index. Une réponse globalement valide dont toutes les propositions sont invalides réussit avec zéro candidat et des avertissements.

Une réponse globalement illisible ou dépourvue du tableau `candidates` attendu reste rejetée. Les erreurs réseau, d'authentification et de timeout restent également bloquantes dans la chaîne existante.

### Contrat HTTP et prompt

La réponse de l'API demeure compatible avec le contrat `0.1` :

- `candidates` et `generation` sont conservés ;
- `warnings` est ajouté seulement lorsqu'au moins une proposition a été ignorée ;
- `generation.ignored` expose le nombre de propositions ignorées.

Le prompt exige maintenant explicitement la surface et la langue exactes, interdit les variantes orthographiques ou morphologiques et demande d'omettre une forme lorsqu'aucune analyse valide n'est disponible.

### Interface et progression des lots

Après une réponse partiellement valide, l'interface :

- conserve et affiche les candidats valides ;
- n'affiche jamais une proposition ignorée ;
- marque comme examiné l'ensemble du lot envoyé, y compris les formes sans candidat ;
- affiche un avertissement ambré, discret et non bloquant ;
- autorise immédiatement le lancement du lot suivant.

Le cas déterministe demandé affiche notamment :

> 1 proposition OpenAI a été ignorée car elle ne correspondait pas aux formes demandées : accélérées.

La forme non demandée `accélérées` est absente du tableau, tandis que la forme demandée `accélérée` peut être conservée.

## Contrôles réalisés

### Analyse statique

- `node --check` réussi sur les scripts serveur, frontend et tests concernés.
- `git diff --check` réussi ; seuls des avertissements Git relatifs à la future conversion LF vers CRLF ont été émis.

### Tests automatisés

- Suite ciblée finale : **42 tests réussis sur 42**.
- Suite complète du prototype : **151 tests réussis sur 151**.

Les cas couverts incluent :

- 12 propositions valides accompagnées de la surface non demandée `accélérées` ;
- variante orthographique refusée comme surface exacte ;
- langue et combinaison surface-langue non demandées ;
- doublon et proposition isolément mal formée ;
- réponse globalement valide ne contenant aucune proposition exploitable ;
- JSON globalement illisible ;
- propagation des avertissements dans la génération structurée ;
- timeout bloquant ;
- progression complète d'un lot partiellement valide ;
- format de l'avertissement frontend ;
- tailles de lots 10, 20, 30, 50 et 100 et reprise après échec.

### Recette HTTP et visuelle isolée

Une fixture temporaire, supprimée après la recette, a exercé le vrai parseur sans appeler OpenAI et sans se connecter à MariaDB.

À `1440 × 900` puis `1366 × 768`, les observations sont :

- premier lot : `30 examinées · 30 restantes` ;
- bouton disponible : `Examiner les 30 formes restantes` ;
- 12 lignes valides affichées ;
- avertissement non bloquant visible ;
- `accélérées` absente des résultats ;
- absence de débordement horizontal et d'erreur visible ;
- lot suivant lancé avec succès ;
- état final de la fixture : deux payloads de 30 formes et `persistentWrites: 0` ;
- aucune erreur dans la console du navigateur.

Cette recette Codex ne constitue pas une validation fonctionnelle humaine de David.

### Données et processus

Aucune commande d'écriture MariaDB, migration, réinitialisation ou modification de donnée canonique n'a été exécutée. La fixture a confirmé zéro écriture persistante.

Le contrôle final en lecture seule a toutefois révélé un écart externe par rapport aux volumes attendus dans la mission :

| Table | Attendu | Observé en fin de mission |
| --- | ---: | ---: |
| `lexical_entry` | 150 | **252** |
| `lexical_form` | 597 | **960** |
| `inflected_form` | 16 | **39** |
| `connector_help` | 12 | 12 |
| `form_relation` | 70 | 70 |
| `pattern_rule` | 1 | 1 |
| `ic_feature` | 8 | 8 |
| `language` | 12 | 12 |

Le script de contrôle officiel a refusé l'état dès `lexical_entry=252`. Une seconde requête strictement en lecture seule a établi les volumes ci-dessus ; sa tentative complémentaire de regroupement sur un champ `language.status` inexistant a échoué sans mutation.

Cet écart n'a pas été corrigé ni attribué : aucune restauration ou suppression n'est autorisée sans arbitrage humain, sauvegarde et retour arrière documentés. Il empêche d'affirmer que les volumes canoniques sont restés égaux au référentiel fourni, mais pas d'établir l'absence d'écriture de la recette isolée.

Aucun processus n'écoute sur les ports 3000 ou 3100 au contrôle final. Le serveur temporaire de recette a été arrêté et sa fixture supprimée.

## Éléments non vérifiés

- Aucun appel réel à OpenAI n'a été lancé afin d'éviter une dépendance réseau et une consommation non déterministe.
- Aucune validation humaine de David n'a encore confirmé le comportement avec sa configuration réelle.
- L'origine et l'intention des nouveaux volumes MariaDB n'ont pas été établies.
- Les avertissements de conversion LF/CRLF n'ont pas été normalisés, afin de ne pas produire de réécriture mécanique hors périmètre.

## Limites restantes et suite possible

- David doit arbitrer ou confirmer l'état MariaDB actuel avant toute opération qui dépend des anciens volumes 150/597/16.
- Une validation humaine peut reproduire le cas réel contenant `accélérées`, vérifier la poursuite du lot et confirmer qu'aucune proposition invalide n'est présentée à l'enregistrement.
- Les avertissements sont intentionnellement informatifs : ils ne bloquent pas un lot globalement valide.
- Les erreurs globales restent volontairement bloquantes et doivent être relancées après correction de leur cause.

## Versionnement

L'assistant IA passe de `0.1.7` à `0.1.8`, conformément à la convention de baby steps du composant. L'API reste `0.1`, le serveur Node `1.0.0` et l'administration principale `0.1.5` : aucun changement de contrat global ou de statut du prototype ne justifie leur incrément.

## Message de commit proposé

`fix(dico): tolérer les propositions IA invalides dans les lots texte`
