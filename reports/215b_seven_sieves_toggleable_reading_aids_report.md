# Mission 215b — Rendre les aides à la lecture activables à la demande

Date : 19 août 2026

## Résultat

La couche « Aides à la lecture » introduite en Mission 215 est maintenant
masquée par défaut. Les aides restent normalisées et conservées en mémoire, mais
aucune carte, aucun soulignement et aucun raccord multi-token ne sont matérialisés
avant une action explicite de l’apprenant.

Lorsque le paquet contient une aide valide, la barre d’actions affiche :

`📚 Afficher les aides à la lecture (1)`

Après activation, le bouton devient `📚 Masquer les aides à la lecture`, son
attribut `aria-pressed` vaut `true`, les marqueurs apparaissent et la section avec
ses cartes est rendue. Un second clic masque entièrement la couche et remet
l’aide active à zéro.

Lorsque le paquet ne contient aucune aide valide, le bouton et la section restent
masqués sans réserver d’espace et sans erreur.

## Préservation des états

Le basculement est un état local indépendant. Il ne modifie jamais :

- le paquet API ni la liste d’aides gardée en mémoire ;
- le tamis actif ;
- le mot inspecté ;
- la sélection ;
- les statuts compris, doute ou inconnu ;
- les indices déjà visibles ;
- `sessionStorage`.

La désactivation remet seulement `activeReadingAidId` à `null`. L’action
« Recommencer » restaure l’état initial complet de Mission 214, donc les aides
masquées et aucune aide active.

Les associations exactes par offsets, les contenus, l’échappement HTML, le
traitement des recouvrements et les interactions token/carte de Mission 215 sont
inchangés. Un changement de tamis conserve la couche lorsqu’elle est active.

## Présentation

Le nouveau bouton rejoint la barre existante avec un bleu pâle et une ombre
retirée. Il reste volontairement moins dominant que « Montrer les indices »,
« Comparer la sélection » et « Recommencer ». L’identité visuelle générale de la
Mission 214b n’a pas été refaite.

## Fichiers concernés par le correctif 215b

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/css/seven-sieves-roles-0.1.css` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js` ;
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-student-v0.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-role-separation.test.js` ;
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`.

La page et le script enseignant n’ont reçu aucune modification supplémentaire en
215b. Le backend, les endpoints, le contrat API, les données, les aides et les
sept tamis sont inchangés.

## Versions

- interface apprenant : `0.1.3` ;
- interface enseignant : inchangée depuis 215, `0.1.2` ;
- format de transfert : inchangé, `0.1` ;
- contrat API : inchangé, `0.1`.

L’incrément apprenant correspond au correctif ergonomique ciblé.

## Tests

Les contrôles permanents ajoutés couvrent :

- l’état initial masqué ;
- le compteur et les deux libellés dynamiques ;
- `aria-pressed="false"` puis `aria-pressed="true"` ;
- l’activation de la couche et d’une aide multi-token ;
- la désactivation complète et la remise à zéro de l’aide active ;
- la conservation des données en mémoire ;
- la conservation du tamis, de l’inspection, de la sélection et du statut ;
- la réinitialisation avec aides masquées ;
- l’absence de bouton et de section avec zéro aide valide ;
- l’absence d’écriture de session pendant le basculement.

Résultats :

- tests ciblés : 14/14 réussis ;
- suite complète : 227/227 réussis ;
- syntaxe des trois scripts : réussie ;
- `git diff --check` : réussi, hors avertissements LF/CRLF sans incidence.

## Recette réelle

Le texte préparé long a été envoyé à `POST /analysis` avec ES → FR et IT/PT. La
réponse réelle reste HTTP 200, contrat `0.1`, 50 tokens et une aide `Sin embargo`
sur les tokens 17 et 18.

Le modèle d’interface produit pour ce paquet :

- état initial : bouton visible avec le compteur 1, section masquée,
  `aria-pressed="false"` ;
- état actif : section visible, `aria-pressed="true"`, libellé de masquage ;
- retour masqué : section et marqueurs absents, aide active remise à zéro, autres
  états inchangés.

## Contrôle visuel

Le contrôleur Chromium intégré reste indisponible avec le défaut déjà documenté :

`Trusted RPC dependency must resolve within a configured trusted code path`

Chrome et Edge système ont été détectés. Le contournement headless facultatif
n’a pas été utilisé : un lancement isolé ne reprend pas le `sessionStorage` de
l’activité préparée et n’aurait montré que l’état vide, ce qui ne constitue pas
une preuve visuelle pertinente. Aucun test harness ou changement d’application
n’a été ajouté pour fabriquer une capture.

Validation humaine à effectuer à 1440 × 900 et 1366 × 768 :

1. préparer puis ouvrir l’activité ;
2. vérifier le bouton avec compteur 1, sans marqueur ni espace vide initial ;
3. activer la couche et vérifier le raccord `Sin`–`embargo` ainsi que la carte ;
4. sélectionner un mot, appliquer un statut et changer de tamis ;
5. masquer la couche et confirmer que sélection, statut et tamis sont conservés ;
6. recommencer et confirmer le retour aux aides masquées.

La validation visuelle et fonctionnelle finale appartient à David.

## Intégrité MariaDB

Les volumes et empreintes finales sont strictement identiques à la Mission 215 :

| Table | Volume | SHA-256 |
| --- | ---: | --- |
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1 286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

Aucune écriture MariaDB n’a été effectuée.

## Services et opérations exclues

À la fin de la mission :

- serveur Dico-IC / Seven Sieves : actif sur 3000, page apprenante HTTP 200 ;
- MariaDB `ic_dico_mariadb_next` : active sur 3306 ;
- phpMyAdmin `ic_lab_next_phpmyadmin` : actif sur 8080.

Aucun service n’a été arrêté ou redémarré. Aucun processus extérieur au projet
n’a été touché. Aucun appel OpenAI, commit, push ou déploiement n’a été effectué.

## Message de commit proposé pour les Missions 215 et 215b

`feat(seven-sieves): intégrer les aides discursives activables à la demande`
