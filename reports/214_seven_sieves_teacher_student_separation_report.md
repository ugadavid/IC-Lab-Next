# Mission 214 — Séparer les parcours enseignant et apprenant de Seven Sieves

Date : 19 août 2026

## Résultat

Seven Sieves possède désormais deux interfaces actives distinctes : une page
enseignant compacte pour préparer et analyser le texte, puis une page apprenant
consacrée aux sept tamis et aux interactions d’exploration. L’ancienne URL live
est conservée comme entrée de compatibilité et redirige vers la préparation
enseignant ; elle ne maintient plus une troisième interface complète.

Le contrat `POST /analysis`, le serveur, les données Dico-IC, les 86 relations,
les variantes expérimentale, mock et historique n’ont pas été modifiés.

## Architecture retenue

### Pages canoniques

- enseignant :
  `/prototypes/01-seven-sieves/index-teacher-0.1.html` ;
- apprenant :
  `/prototypes/01-seven-sieves/index-student-0.1.html` ;
- compatibilité :
  `/prototypes/01-seven-sieves/index-api-live-0.1.html`, redirigée vers la page
  enseignant.

La page enseignant porte seulement la préparation, l’appel réel à Dico-IC, les
états de chargement ou d’erreur, les avertissements techniques, un résumé du
résultat et le bouton d’ouverture de l’activité. Elle ne contient ni moteur de
rendu étudiant, ni inspection, ni sélection, ni statut de compréhension.

La page apprenant porte un unique moteur d’exploration : sept tamis, texte
reconstruit à partir des tokens, inspection, sélection et désélection, statuts
`compris`, `doute` et `inconnu`, indices, comparaison et réinitialisation locale.
Elle ne contient aucune saisie de texte, aucun sélecteur de langue, aucun bouton
d’analyse et aucun avertissement serveur brut.

## Transfert local V0

Le module partagé `seven-sieves-session-v0.js` définit :

- le format `0.1` ;
- la clé versionnée `seven-sieves.activity.v0.1` ;
- la validation du paquet d’analyse et des paramètres préparés ;
- l’écriture et la lecture dans `sessionStorage` ;
- les états `missing`, `invalid` et `incompatible` sans exception non gérée ;
- le résumé enseignant ;
- le petit état local d’exploration apprenant.

Après un `POST /analysis` réussi, la réponse API complète est conservée telle
quelle avec les paramètres et une date ISO. Les champs non encore affichés,
dont `pedagogical_enrichments`, ainsi que les champs futurs inconnus sont
préservés par la sérialisation. L’ouverture apprenant se fait dans le même
onglet. Toute modification ultérieure de la préparation invalide le bouton et
retire l’ancien paquet de session afin de ne pas associer un résultat périmé à
de nouveaux paramètres.

La réinitialisation apprenant ne touche jamais `sessionStorage` : elle rétablit
uniquement le tamis 1, l’inspection, les indices visibles, la sélection et les
statuts locaux.

## Fichiers créés

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-teacher-0.1.html`
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html`
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/css/seven-sieves-roles-0.1.css`
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js`
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-teacher-v0.js`
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/js/seven-sieves-student-v0.js`
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-role-separation.test.js`
- `reports/214_seven_sieves_teacher_student_separation_report.md`

## Fichiers modifiés

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-api-live-0.1.html`
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`
- `prototypes/08-dico-seven-sieves/docs/dico-local-development-startup.md`
- `PROJECTS_LAUNCH.md`
- `docs/ARCHITECTURE.md`

Dico-IC Admin, ses fiches, Compose, les launchers, les variantes pédagogique,
mock et historique, le backend et le contrat API sont inchangés.

## Versions obtenues

- interface enseignant : `0.1.0` ;
- interface apprenant : `0.1.0` ;
- format de transfert de session : `0.1`.

Les deux artefacts disposent de leur propre nom, métadonnée de version et
fichier canonique. Aucun autre composant n’a été versionné.

## Contrôles fonctionnels et techniques

### Analyse réelle

Le scénario demandé a été envoyé au serveur actif par `POST /analysis`, sans
écriture :

`Sin embargo, la información circula durante la noche.`

Résultat réel : HTTP 200, contrat `0.1`, langues ES → FR avec IT/PT, 10 tokens,
12 enrichissements, 7 tamis, 3 avertissements et 1
`pedagogical_enrichment`.

Les pages enseignant et apprenant répondent toutes deux HTTP 200 sur le serveur
réel laissé actif.

### Tests permanents

Les nouveaux tests couvrent :

- sérialisation et relecture du paquet complet ;
- conservation des aides discursives et d’un champ futur inconnu ;
- paquet absent, JSON corrompu et version inconnue ;
- refus des textes ou offsets incohérents ;
- résumé tokens, enrichissements, tamis et avertissements ;
- sélection, désélection, inspection, statut et réinitialisation locale sans
  perte de l’activité ;
- séparation statique des contrôles enseignant et apprenant ;
- présence exacte des sept tamis et d’un seul moteur apprenant actif ;
- disponibilité HTTP des nouvelles ressources et de la redirection de
  compatibilité.

Résultats :

- tests ciblés : 6/6 réussis ;
- suite complète `npm.cmd test` : 219/219 réussis ;
- `node --check` réussi pour les trois nouveaux scripts ;
- `git diff --check` réussi ; les messages Git restants sont de simples
  avertissements de conversion LF/CRLF.

### Contrôles de rôle établis

- la page enseignant ne contient pas l’inspection, la sélection ou les trois
  statuts apprenants ;
- la page apprenant ne contient aucun contrôle de préparation ni code brut
  `SIEVE_EXPERIMENTAL` ; les états expérimentaux sont formulés en français ;
- le bouton apprenant est désactivé en l’absence d’un paquet courant valide ;
- l’état vide affiche exactement « Aucune activité n’a encore été préparée. » ;
- le retour vers la préparation est présent.

## Contrôle visuel — limite environnementale

La recette Chromium 1440 × 900 et 1366 × 768 a été tentée mais n’a pas pu être
effectuée. Le contrôleur Chromium s’arrête avant toute connexion avec l’erreur
suivante, déjà constatée en Mission 213 :

`Trusted RPC dependency must resolve within a configured trusted code path`

Une seconde voie par le contrôle visuel Windows a retrouvé sans ambiguïté la
fenêtre Chrome Seven Sieves, mais chaque capture d’état a expiré, y compris
après l’unique réinitialisation de récupération autorisée. Aucune action n’a
alors été injectée dans Chrome.

En conséquence, l’absence visuelle de débordement, texte coupé, mojibake et
erreur console aux deux dimensions ne peut pas être affirmée par Codex. Les
ruptures CSS prévues restent inspectées statiquement, mais elles ne remplacent
pas cette preuve. La recette visuelle et humaine de David est indispensable
avant validation finale.

## Intégrité MariaDB avant/après

Les empreintes déterministes finales sont strictement identiques aux empreintes
initiales :

| Table | Lignes avant/après | SHA-256 avant/après |
| --- | ---: | --- |
| `language` | 12 | `9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff` |
| `lexical_entry` | 305 | `34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec` |
| `lexical_form` | 1 286 | `a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41` |
| `inflected_form` | 41 | `35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184` |
| `connector_help` | 12 | `10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` |
| `form_relation` | 86 | `216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15` |
| `pattern_rule` | 1 | `432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d` |
| `ic_feature` | 8 | `d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a` |

MariaDB, les formes et les 86 relations n’ont subi aucune écriture. Les dix
relations de `INFORMATION_DATA` et les dix relations de `NUIT` sont préservées.

## Services

Aucun service n’a été démarré, arrêté ou redémarré par cette mission. Le serveur
Dico-IC/Seven Sieves laissé par David répond encore sur `3000`, et MariaDB reste
accessible en lecture via le repository. Le statut détaillé des conteneurs n’a
pas pu être relu par la CLI Docker à cause du refus d’accès au pipe Docker dans
l’environnement Codex ; aucun conteneur n’a été modifié. L’état de phpMyAdmin
n’est donc pas affirmé.

## Limites volontaires et suites

- transfert mono-onglet et mono-session, sans activité persistante ni gestion
  multi-utilisateur ;
- aides discursives conservées dans le paquet mais non encore rendues dans la
  vue apprenant, conformément à la mission ;
- aucune révision scientifique, suppression ou renommage des sept tamis ;
- aucun timeout ou changement du contrat `/analysis` dans ce baby step ;
- recette visuelle Chromium et validation humaine de David restant à réaliser.

Aucun appel OpenAI, commit, push ou déploiement n’a été effectué.

## Message de commit proposé

`feat(seven-sieves): séparer préparation enseignant et exploration apprenant`
