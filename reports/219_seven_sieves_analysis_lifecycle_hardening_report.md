# Mission 219 — Fiabiliser le cycle d’analyse de l’interface enseignante Seven Sieves

Date : 19 août 2026

## Résultat

Le cycle de préparation enseignant est désormais explicite, annulable et protégé contre les réponses tardives. Une ancienne activité cesse immédiatement d’être ouvrable dès qu’un paramètre change ou qu’une nouvelle analyse commence. Le paquet de session n’est écrit qu’après succès et validation complète de la requête encore courante.

Le fonctionnement pédagogique, les sept tamis, les aides à la lecture et l’interface apprenante n’ont pas été modifiés.

## Ancienne faiblesse

Le script enseignant supprimait déjà le paquet précédent au lancement, mais :

- aucun délai maximal ne bornait `fetch` ;
- aucune annulation humaine n’était disponible ;
- aucun identifiant de génération ne protégeait contre une réponse tardive ;
- les champs restaient modifiables pendant la requête ;
- le message d’erreur technique brut pouvait être affiché ;
- le paquet ne portait pas de signature exacte des paramètres ;
- l’invalidation n’était pas exprimée comme un état distinct et calme.

## Nouvelle machine d’états

Le petit module autonome `seven-sieves-analysis-lifecycle-v0.js` porte les états suivants :

```text
ready → running → success
                → cancelled
                → timed_out
                → error

ready/success → invalidated
```

Chaque lancement obtient un numéro de génération monotone. Une seule requête peut être active. Le double lancement retourne la promesse de la requête courante sans lancer un second traitement.

Les paramètres sont figés pendant `running`. Le bouton d’analyse et l’ouverture apprenant sont désactivés ; le bouton « Annuler l’analyse » reste disponible. Une progression indéterminée, un chronomètre en secondes, `aria-busy`, `role="status"` et `aria-live="polite"` décrivent l’état sans inventer de pourcentage.

## Invalidation et stockage de session

Les changements du texte, de la langue source, de la langue de médiation ou d’une langue de comparaison appellent tous la même invalidation stricte :

- suppression immédiate de `seven-sieves.activity.v0.1` dans `sessionStorage` ;
- oubli du paquet en mémoire ;
- masquage du résumé précédent ;
- désactivation de l’ouverture apprenant ;
- message « Nouvelle analyse nécessaire ».

Une remise manuelle à l’ancienne valeur ne rétablit jamais le paquet supprimé.

Au lancement d’une nouvelle analyse, cette suppression est répétée avant tout appel HTTP. Après succès seulement, le contrat complet est validé, notamment le texte et l’égalité exacte des trois dimensions linguistiques, puis le paquet est écrit une seule fois.

Le paquet porte désormais `preparation_signature`, représentation déterministe du snapshot exact : texte, langue source, langue de médiation et liste ordonnée des langues de comparaison. Les anciens paquets locaux au format `0.1` restent lisibles ; la page enseignante les met à niveau localement lors de leur restauration. Aucun changement de contrat API n’est introduit.

La vue apprenante conserve son comportement existant : paquet valide chargé normalement ; paquet absent, invalide ou incompatible présenté par l’état vide calme.

## Délai, annulation et réponses tardives

Le délai maximal est la constante testable `DEFAULT_ANALYSIS_TIMEOUT_MS = 15_000`.

À l’expiration :

- `AbortController.abort()` interrompt réellement le signal `fetch` ;
- timeout et chronomètre sont nettoyés ;
- les paramètres sont réactivés et conservés ;
- aucun paquet n’est écrit ou restauré ;
- le message public est distinct d’une erreur réseau ;
- aucune relance automatique n’a lieu.

L’annulation humaine suit le même nettoyage, avec l’état distinct `cancelled` et un message calme. Elle n’est pas présentée comme une erreur technique.

Une réponse n’est acceptée que si son objet de requête est encore actif et non terminé. L’annulation, le timeout ou le départ de page détachent cette requête avant toute réponse tardive. Le numéro de génération complète donc l’abandon réseau et protège explicitement les scénarios A annulée puis B, A expirée puis B et double clic.

`pagehide` appelle le nettoyage du cycle et interrompt la requête sans dialogue de confirmation.

## Choix d’architecture

Le serveur n’a pas été modifié. L’analyse Dico-IC est locale, en lecture seule et ne déclenche aucun traitement OpenAI ni aucune écriture persistante. L’abandon côté client suffit pour empêcher tout résultat tardif d’atteindre ou d’écrire le paquet de session. Le module de cycle reste indépendant du DOM et reçoit ses horloges et callbacks par injection, ce qui permet des tests sans attente réelle.

## Fichiers concernés

Créés :

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-analysis-lifecycle-v0.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-analysis-lifecycle.test.js` ;
- `reports/219_seven_sieves_analysis_lifecycle_hardening_report.md`.

Modifiés :

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-teacher-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-teacher-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/css/seven-sieves-roles-0.1.css` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`.

La page apprenante et son moteur n’ont pas été modifiés.

## Tests permanents

La nouvelle suite couvre :

- succès normal et stockage unique ;
- invalidation et signature exacte du texte et des langues ;
- paquet absent dans la vue apprenante après invalidation ;
- timeout de 15 secondes avec horloge contrôlée, sans attente réelle ;
- annulation réelle et signal interrompu ;
- arrêt de la progression après annulation, timeout ou départ de page ;
- réponse tardive ignorée ;
- A annulée puis B réussie ;
- A expirée puis B réussie ;
- double lancement limité à une requête et une écriture ;
- erreurs réseau, HTTP, JSON et contrat incomplet ;
- nouvelle tentative après erreur, annulation ou timeout ;
- stockage uniquement après succès ;
- validation exacte des langues de comparaison ;
- compatibilité des paquets locaux historiques `0.1` ;
- présence des contrôles accessibles dans l’interface enseignante ;
- interface apprenante, sept tamis et identité visuelle inchangés ;
- exposition HTTP du nouveau module statique.

Contrôles réussis :

- syntaxe Node des trois scripts concernés : réussie ;
- tests ciblés finaux : 26/26 réussis ;
- suite complète finale : 264/264 réussis ;
- `git diff --check` : réussi ;
- aucun fichier temporaire ou fixture résiduelle créé.

## Recette déterministe A à D

Le test permanent `deterministic A-to-D recipe never reopens a stale activity` réalise la séquence demandée :

1. A est stockée ;
2. la modification l’invalide et vide le stockage ;
3. une nouvelle requête A est lancée puis annulée ;
4. sa réponse tardive est ignorée ;
5. B réussit et devient l’unique paquet ouvrable ;
6. C invalide B avant son lancement ;
7. C expire et sa réponse tardive est ignorée ;
8. le stockage reste vide, B ne redevient pas ouvrable ;
9. D réussit ;
10. seule D est finalement lue dans le stockage.

La progression, le chronomètre, le bouton d’annulation et le verrouillage sont vérifiés par les tests du module et les assertions statiques de l’interface.

## Recette HTTP réelle

Le serveur Dico local a été démarré temporairement. Une analyse réelle sur :

`Sin embargo, la información circula durante la noche.`

a retourné :

- contrat `0.1` ;
- texte strictement identique ;
- 10 tokens ;
- 7 tamis ;
- 3 avertissements ;
- 1 aide à la lecture.

Aucune écriture MariaDB n’est effectuée par cette route.

## Validation visuelle et validation humaine restante

Le navigateur intégré n’a pas pu établir sa connexion à cause d’une erreur interne de dépendance de confiance, identique à la limite rencontrée lors de la mission précédente. Conformément à la mission, son infrastructure n’a pas été réparée ni contournée. Aucune capture et aucune affirmation de validation visuelle interactive ne sont donc produites.

Les contrôles HTML/CSS et HTTP confirment la présence des éléments, l’absence de changement graphique général et la conservation de l’interface apprenante. La validation visuelle principale reste à David : lisibilité du chronomètre, progression, bouton d’annulation, champs figés, messages distincts, absence de débordement et absence de mojibake dans un navigateur réel.

## Versions

- enseignant : `0.1.2` → `0.1.3` ;
- apprenant : inchangé `0.1.3` ;
- administration Dico-IC : inchangée `0.1.8` ;
- API : inchangée `0.1`.

L’incrément enseignant est le baby-step du composant réellement modifié. Le module partagé de session reste compatible avec la vue apprenante et le format de paquet `0.1`.

## Intégrité MariaDB

Les contrôles avant et après la réalisation donnent les mêmes volumes :

| Table | Volume final |
|---|---:|
| `language` | 12 |
| `lexical_entry` | 305 |
| `lexical_form` | 1 286 |
| `inflected_form` | 41 |
| `connector_help` | 27 |
| `form_relation` | 86 |
| `pattern_rule` | 1 |
| `ic_feature` | 8 |

Les huit empreintes finales sont strictement identiques aux empreintes initiales et à la preuve Mission 218. L’auto-incrément `connector_help` reste 32 et l’empreinte des douze aides historiques reste `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846`.

Aucune donnée, seed, aide ou relation n’a été modifié.

## Services

- MariaDB `ic_dico_mariadb_next` : déjà actif au début, laissé actif ;
- phpMyAdmin `ic_lab_next_phpmyadmin` : déjà actif au début, laissé actif ;
- serveur Dico Node, port 3000 : démarré pour la recette, identité vérifiée (`--ic-lab-next-service=dico`), puis arrêté ; port 3000 libéré.

Anomalie préexistante non modifiée : `docker-compose.yml` contient `depends_on: - docker ps`, qui référence un service Compose inexistant et empêche `docker compose ps`. L’état des conteneurs a donc été observé directement. Cette correction est hors périmètre de la Mission 219.

## Limites et suite

- La validation visuelle et fonctionnelle humaine de David reste nécessaire.
- Aucun test n’attend réellement quinze secondes : le timeout est couvert par horloge déterministe.
- L’interruption client empêche toute consommation du résultat ; elle ne cherche pas à arrêter une requête SQL de lecture déjà arrivée au serveur, car cette analyse locale n’a ni écriture ni traitement persistant.
- Aucun commit, push ou déploiement n’a été effectué.

## Message de commit proposé

```text
feat(seven-sieves): fiabiliser le cycle d’analyse enseignant (mission 219)
```
