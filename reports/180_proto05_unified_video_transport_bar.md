# Mission 180 — Barre de transport vidéo unifiée de Proto05

Date : 2026-08-02  
Périmètre : `prototypes/05-augmented-ic-video-01`  
Version obtenue : **0.1.62**  
Commit/push : aucun

## Résultat

Les trois interfaces enseignantes utilisent désormais le même composant de transport, immédiatement sous leur lecteur :

`<<<` · `<<` · `<` · `▶/❚❚` · `>` · `>>` · `>>>`

La barre fournit les pas −5 s, −1 s, −0,1 s, +0,1 s, +1 s et +5 s, un bouton lecture/pause synchronisé avec le média réel et un temps partagé au format `mm:ss,d / mm:ss,d`. Les commandes métier restent en dehors de ce groupe.

## Inventaire initial

| Interface | Lecteur et branchement | Contrôles universels avant mission | Contrôles métier distingués et préservés |
|---|---|---|---|
| Anonymisation visuelle | `teacher-anonymization.html`, élément `<video id="video">` natif | quatre pas précis et temps courant, produits localement | masques, images-clés/étapes, profils et lancement de dérivation |
| Anonymisation audio | `teacher-audio-anonymization.html`, élément `<video id="video">` natif | quatre pas précis et un affichage du temps dupliqué | Passage précédent/suivant, Son original/Aperçu anonymisé, début/fin au curseur, plan et dérivation |
| Atelier guidé | `teacher-guided.html`, façade créée par `shared/ic-video-player.js` autour du véritable média | quatre pas précis, anciens boutons textuels ±5 s et temps dupliqué | Ajouter un moment ici, transcription, langues entendues et Timeline IC |

Le helper existant de la Mission 179 était `shared/precise-video-time.js`, avec son style `shared/precise-video-time.css`. Il assurait déjà les pas ±1 s et ±0,1 s en millisecondes entières, le bornage et l’actualisation temporelle. `shared/ic-video-player.js` expose la façade utilisée par l’atelier guidé.

## Incohérences supprimées

- balisages locaux différents pour les quatre déplacements précis ;
- anciens boutons textuels de cinq secondes dans l’atelier guidé ;
- horloges immédiatement dupliquées dans les ateliers audio et guidé ;
- couleurs, dimensions et alignements propres à chaque page ;
- absence de commande lecture/pause partagée.

Aucune commande métier n’a été déplacée dans la barre ou supprimée.

## Contrat partagé et dessin final

`Proto05PreciseVideoTime` fournit maintenant :

- une définition ordonnée unique des sept actions ;
- `transportMarkup`, `render` et `mount` pour produire un seul balisage partagé ;
- le calcul temporel en millisecondes entières et le bornage à la durée réelle ;
- la neutralisation des actions tant que la durée n’est pas connue ;
- le pilotage du vrai lecteur par `play()` et `pause()` ;
- la synchronisation sur `play`, `playing`, `pause`, `ended`, `timeupdate` et les changements de métadonnées ;
- le retour à `▶` en fin naturelle et la remise en cohérence après rejet de `play()` ;
- un callback local facultatif pour rendre une erreur de lecture sans état mensonger.

La façade guidée retransmet désormais aussi `play` et `ended`. Les événements restent issus du véritable élément vidéo.

Le style commun crée un groupe centré de sept cases, à fond gris bleuté sobre, avec bordure et ombre légères. Le bouton central bleu sombre est légèrement plus haut. Les états survolé, pressé, désactivé et `focus-visible` sont communs. Les indications −5 s à +5 s figurent sous les symboles. À largeur réduite, la grille devient fluide sans modifier l’ordre ni déborder.

Accessibilité observée : groupe `role="group"` nommé « Commandes de lecture vidéo », sept noms accessibles explicites, libellé central alternant « Lire la vidéo » et « Mettre la vidéo en pause », `aria-pressed`, temps `aria-live`, focus visible et information non fondée uniquement sur la couleur.

## Fichiers modifiés

- `prototypes/05-augmented-ic-video-01/shared/precise-video-time.js`
- `prototypes/05-augmented-ic-video-01/shared/precise-video-time.css`
- `prototypes/05-augmented-ic-video-01/shared/ic-video-player.js`
- `prototypes/05-augmented-ic-video-01/teacher-anonymization.html`
- `prototypes/05-augmented-ic-video-01/teacher-audio-anonymization.html`
- `prototypes/05-augmented-ic-video-01/teacher-guided.html`
- `prototypes/05-augmented-ic-video-01/server/test/precise-video-time.test.js`
- `prototypes/05-augmented-ic-video-01/server/package.json`
- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- `prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md`
- `reports/180_proto05_unified_video_transport_bar.md`

Les quatre derniers fichiers fonctionnels/documentaires ne portent que l’incrément minimal visible de 0.1.61 à 0.1.62.

## Tests automatisés

Commande :

`node --test server/test/precise-video-time.test.js server/test/playable-annotations.test.js server/test/runtime-json-isolation.test.js server/test/teacher-ui-navigation.test.js`

Résultat : **26/26 réussis**. Les sept tests spécifiques couvrent notamment l’ordre et le rendu uniques, les six pas et leurs bornes, la conservation de lecture/pause, la synchronisation du bouton central, le rejet de `play()`, la façade guidée, les commandes métier, le style commun, le responsive et l’accessibilité statique.

Commande :

`node --test --test-name-pattern="plan ordonne|plan refuse|FFmpeg remplace|atelier audio reste" server/test/audio-anonymization.test.js`

Résultat : **4/4 réussis**, dont la vérification FFmpeg ciblée sur fixture temporaire et le contrat UI de l’atelier audio. Le parcours HTTP MariaDB de cette suite n’a pas été lancé : la mission ne modifie ni API ni données et la recette réelle chargeait déjà l’application contre MariaDB sans écriture.

Contrôles complémentaires :

- `node --check shared/precise-video-time.js` : réussi ;
- `node --check shared/ic-video-player.js` : réussi ;
- `node --check server/server.js` : réussi ;
- analyse syntaxique de tous les scripts embarqués des trois pages : réussie (4 + 1 + 12 scripts) ;
- `git diff --check` : réussi, avec seuls avertissements informatifs Git sur la future conversion LF/CRLF.

## Recette navigateur réelle

Environnement : serveur Proto05 déjà actif sur `127.0.0.1:8791`, application réelle chargée depuis MariaDB. Le lanceur a refusé de remplacer son PID existant car son identité n’était pas reconnue ; aucune terminaison forcée n’a été faite et ce défaut de lanceur est hors périmètre. Le serveur déjà actif a servi directement les actifs modifiés. Son endpoint de santé conserve en mémoire l’ancienne chaîne 0.1.61 jusqu’au prochain démarrage, tandis que les artefacts contrôlés sur disque sont bien en 0.1.62.

Médias :

- atelier guidé : activité réelle `proto05-augmented-video-01`, média réel de 939,238 s ;
- ateliers visuel et audio : même préparation temporaire `hls-prep-1785651032861-dd167d07`, créée à partir d’une dérivation locale déjà inscrite, durée exposée 163,432683 s. Cette préparation n’a écrit aucune donnée métier ni aucun plan ; aucune dérivation n’a été lancée.

Constats sur les trois pages :

- une seule barre, immédiatement sous le lecteur, avec les sept commandes dans l’ordre exact ;
- les six pas atteignent le véritable `currentTime` ; exemples mesurés sur chacun : 0 → 5 → 0, 0 → 1 → 0 et 0 → 0,1 → 0 ;
- chaque déplacement laisse la pause active ; le même contrat a également été exercé pendant la lecture ;
- le bouton central démarre le vrai média, passe à `❚❚`/« Mettre la vidéo en pause », puis revient à `▶`/« Lire la vidéo » à la pause ;
- l’utilisation de la commande native du lecteur guidé resynchronise immédiatement le bouton partagé ;
- sur le média guidé, la fin naturelle à 939,238 s a été attendue : `ended=true`, média en pause, symbole revenu à `▶`, libellé revenu à « Lire la vidéo » et temps `15:39,2 / 15:39,2` ;
- bornage guidé vérifié exactement à 0 et 939,238 s ;
- les commandes spécifiques visuelles (masques/dérivation) et audio (passages, modes d’écoute, bornes, plan) restent présentes ;
- après déplacement guidé à 5 s, « Ajouter un moment ici » a produit un début de transcription à 5 000 ms ; après déplacement à 6 s, « Ajouter une langue ici » a produit un début Timeline IC à 6 000 ms. La page a été rechargée sans sauvegarder ces brouillons ;
- aucune exception JavaScript ni rejet non géré n’a été observé pendant les interactions ; les erreurs de page auraient aussi rendu les actions ou états contrôlés incohérents. L’outil navigateur ne fournit toutefois pas un export historique séparé de la console : cette limite est explicitée plutôt que de revendiquer une capture de console inexistante ;
- contrôle visuel à largeur normale : barre centrée sous la largeur du lecteur, palette identique et séparation nette des commandes métier ;
- contrôle à largeur demandée 390 px (viewport effectif 375 px) : barre de 329 px, bords x=23 à x=352, aucun débordement ; les sept zones restent visibles et actionnables. Le viewport a ensuite été restauré.

Les trois barres sont produites par le même balisage et la même feuille : leur ordre, espacements, dimensions, couleurs, états et horloge ne peuvent pas diverger par page. La vérification visuelle confirme le résultat sur les trois routes.

## Limites et éléments non modifiés

- Aucun serveur neuf n’a été lancé en raison de l’identification refusée du processus existant ; Proto05 est resté disponible durant toute la recette.
- Aucun plan audio, masque, annotation, activité ou enregistrement Timeline IC n’a été sauvegardé.
- Aucune dérivation réelle/longue n’a été lancée pendant la recette ; seul le test FFmpeg ciblé sur fixture temporaire a été exécuté.
- Aucune migration, écriture MariaDB, modification d’API, de Media Library ou d’algorithme d’anonymisation.
- La validation navigateur est une recette Codex ; elle ne remplace pas une validation humaine de David.

## État Git final

Le dépôt contient uniquement les modifications de la Mission 180 listées ci-dessus. Aucun commit et aucun push n’ont été réalisés. `git diff --check` est vert. La version applicative obtenue est 0.1.62.

## Message de commit proposé

`feat(proto05): unify teacher video transport controls`
