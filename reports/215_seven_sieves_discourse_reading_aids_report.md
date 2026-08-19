# Mission 215 — Afficher les aides discursives transversales dans Seven Sieves

Date : 19 août 2026

## Résultat

Les aides discursives fournies par `POST /analysis` sont désormais visibles dans
la vue apprenante sous le titre public « Aides à la lecture ». Elles restent
transversales aux sept tamis : elles ne créent pas de huitième tamis et un
changement de tamis ne les masque pas.

La page enseignant affiche seulement leur nombre dans le résumé. Le texte
espagnol long demandé est devenu le texte préparé par défaut ; les langues par
défaut restent ES source, FR médiation, IT/PT comparaison.

## Source et règle de présentation

La seule source consommée par la nouvelle vue est le tableau
`pedagogical_enrichments` du paquet API transféré par la Mission 214. Aucun des
quatre anciens repérages locaux de la variante
`index-api-live-pedagogical-hints-0.1.html` n’a été copié.

Chaque carte présente uniquement :

- l’expression réellement reconstruite dans le texte ;
- une fonction discursive humanisée (`Opposition`, `Cause`, `Conséquence`,
  `Addition` ou `Chronologie`) ;
- l’aide pédagogique ;
- l’exemple et la nuance lorsqu’ils existent.

La provenance, les noms de table, les codes bruts et les identifiants techniques
ne sont jamais rendus dans l’interface. Tous les textes issus de l’API sont
échappés avant leur insertion HTML.

## Association aux tokens

Le texte reste reconstruit avec les tokens et offsets UTF-16 du paquet API. Une
aide est acceptée seulement si :

- ses offsets entiers sont inclus dans le texte et forment une plage non vide ;
- son expression est exactement égale à la tranche de texte désignée ;
- la plage commence et finit sur les tokens-mots qu’elle couvre ;
- les références de tokens, lorsqu’elles sont fournies, correspondent exactement
  aux tokens déduits des offsets.

Il n’existe aucune recherche globale par expression. Deux occurrences textuelles
identiques restent donc distinctes grâce à leurs offsets. Une aide absente,
malformée, hors limites, partielle ou incohérente est ignorée sans exception et
sans correction inventive.

`Sin embargo` demeure deux tokens-mots distincts. Un soulignement transversal et
un petit raccord visuel les relient sans remplacer les fonds, contours ou ombres
des tamis, de la sélection et des statuts de compréhension.

Les recouvrements sont conservés. Un token peut référencer plusieurs aides ; des
clics successifs sur ce token les activent à tour de rôle. Un clic sur une carte
active directement cette aide. La carte et tous ses tokens deviennent actifs,
sans modifier le tamis, la sélection, l’inspection ou le statut. La
réinitialisation remet seulement l’aide active à zéro puis reconstruit les
marqueurs depuis le paquet intact.

## Fichiers concernés

Fichiers applicatifs modifiés :

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-teacher-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/css/seven-sieves-roles-0.1.css` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-teacher-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-student-v0.js`.

Tests modifiés :

- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-role-separation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`.

Le backend, le contrat `/analysis`, les variantes historique, mock et
pédagogique, les launchers, Compose et les données n’ont pas été modifiés.

## Versions

- interface enseignant : `0.1.2` ;
- interface apprenant : `0.1.2` ;
- format de transfert de session : inchangé, `0.1` ;
- contrat API : inchangé, `0.1`.

L’incrément du plus petit niveau correspond au baby step fonctionnel commun aux
deux interfaces.

## Tests automatisés

Les tests permanents couvrent :

- la conservation du paquet et des aides pendant le transfert ;
- le compteur enseignant ;
- une expression sur un token ;
- `Sin embargo` sur exactement deux tokens-mots ;
- le calcul par offsets et non par recherche textuelle ;
- deux occurrences identiques à des positions différentes ;
- les offsets UTF-16 avec un caractère astral ;
- l’absence d’aide ;
- les offsets malformés ou hors limites ;
- les références de tokens incohérentes ;
- les recouvrements ;
- la coexistence avec sélection, statut, changement de tamis et réinitialisation ;
- l’échappement XSS ;
- l’absence des anciennes heuristiques locales dans le moteur apprenant.

Résultats :

- tests ciblés : 12/12 réussis ;
- suite complète : 225/225 réussis ;
- analyse syntaxique des trois scripts : réussie ;
- `git diff --check` : réussi, hors avertissements LF/CRLF sans incidence.

## Recette HTTP réelle

Le texte long demandé a été envoyé au serveur actif avec ES → FR et IT/PT, sans
écriture. Résultat : HTTP 200, contrat `0.1`, texte restitué exactement, 50
tokens, 39 enrichissements de tamis, 1 aide à la lecture et 3 avertissements.

L’aide est `Sin embargo` et couvre exactement les tokens 17 et 18. Le token
`información` possède 4 enrichissements et `noche` en possède 2. Les pages
enseignant et apprenant ont répondu HTTP 200 et exposé la version `0.1.2`.

Le passage visuel enseignant → apprenant n’a pas pu être exécuté : le contrôleur
Chromium intégré échoue avant l’ouverture de la page avec le même défaut
d’infrastructure que lors des Missions 213 et 214 :

`Trusted RPC dependency must resolve within a configured trusted code path`

Aucune validation visuelle n’est donc prétendue par Codex.

### Recette humaine demandée

À 1440 × 900 puis 1366 × 768 :

1. ouvrir la page enseignant et vérifier le texte long, ES/FR et IT/PT ;
2. lancer l’analyse et vérifier « 1 » dans « Aides à la lecture » ;
3. ouvrir la vue apprenant et vérifier la carte `Sin embargo` ;
4. cliquer `Sin`, puis `embargo`, puis la carte et vérifier l’activation conjointe
   des deux mots ;
5. changer de tamis, sélectionner un mot et appliquer chaque statut pour vérifier
   que les couleurs restent lisibles avec le soulignement transversal ;
6. inspecter `información` puis `noche`, comparer la sélection et recommencer ;
7. vérifier l’absence de débordement horizontal, texte coupé, mojibake ou erreur
   visible.

Cette recette Codex ne remplace pas la validation fonctionnelle et esthétique de
David.

## Intégrité MariaDB

Les empreintes finales sont strictement identiques aux empreintes initiales :

| Table | Volume avant/après | SHA-256 avant/après |
| --- | ---: | --- |
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1 286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

Aucune donnée, relation, forme, aide ou schéma MariaDB n’a été écrit.

## Services, limites et suite

Aucun service n’a été volontairement démarré, arrêté ou redémarré par la mission.
Le serveur et MariaDB étaient actifs pendant les recettes HTTP et les relevés
d’empreintes. Au contrôle final, les ports 3000, 3306 et 8080 étaient fermés ;
aucun processus extérieur au projet n’a été touché. La configuration Compose
reste invalide en raison de la dépendance historique `depends_on: docker ps`,
hors périmètre de cette mission.

La seule preuve manquante est la recette visuelle Chromium et humaine aux deux
dimensions demandées. Aucun appel OpenAI, commit, push ou déploiement n’a été
effectué.

## Message de commit proposé

`feat(seven-sieves): afficher les aides discursives transversales`
