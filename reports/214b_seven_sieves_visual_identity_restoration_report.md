# Mission 214b — Restaurer l’identité visuelle apprenante de Seven Sieves

Date : 19 août 2026

## Résultat

La séparation fonctionnelle enseignant/apprenant de la Mission 214 est
intégralement conservée. Le correctif restaure sur la page apprenante une
identité ludique, colorée et encourageante inspirée de Seven Sieves historique,
sans réintroduire le bloc de préparation et sans modifier le comportement
JavaScript.

La page enseignant reste plus sobre, mais son en-tête, ses cartes, ses rayons,
sa typographie et ses couleurs appartiennent désormais à la même famille.

## Références utilisées

Les deux références HTML obligatoires ont été consultées en lecture seule :

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-0.0.8.2.html` ;
- la version pré-Mission 214 obtenue avec
  `git show HEAD:prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-api-live-0.1.html`.

Elles confirment les repères historiques réemployés : en-tête blanc et léger,
cartes très arrondies, bleu actif `#4A90E2`, orange `#F5A623`, vert `#7ED321`,
rouge d’action, fond bleuté, tokens sans sérif et observation chaleureuse.

Les deux captures mentionnées par David ne figuraient pas dans les fichiers
accessibles de la pièce jointe Mission 214b : seul `pasted-text.txt` y était
présent. Le correctif a néanmoins pu confronter la page actuelle aux deux
sources HTML obligatoires et à la description précise des captures fournie dans
la mission.

## Éléments visuels restaurés

### En-tête apprenant

- en-tête blanc translucide, compact et non institutionnel ;
- identité `🌈 Seven Sieves` ;
- badge `🎒 Activité apprenante` ;
- bouton d’aide orange ;
- retour enseignant discret ;
- contexte linguistique compact conservé sous l’en-tête.

### Sept tamis

- pictogramme `🧠` ;
- cartes bleu très clair ;
- tamis actif en bleu franc avec ombre légère ;
- survol plus vivant ;
- descriptif du tamis actif regroupé dans une carte bleutée ;
- légende colorée conservée.

### Actions apprenantes

- `💡 Montrer les indices` en bleu sombre ;
- `📊 Comparer la sélection` en orange ;
- `↻ Recommencer` en rouge modéré ;
- volumes, rayons, ombres et survols propres à une activité plutôt qu’à une
  administration.

### Texte et tokens

- retour à Arial/Segoe UI sans sérif ;
- interligne aéré et taille contenue ;
- tokens espacés et légèrement animés ;
- mot inspecté en bleu avec contour sombre ;
- sélection en vert franc ;
- statuts compris, doute et inconnu signalés par vert, orange et rouge ;
- indices pan-romans, transformations, suffixes, graphies et morphologie
  différenciés par les couleurs historiques.

### Observation

- titre `📈 Mon observation` ;
- panneau en dégradé bleu très clair ;
- métriques compactes bleue, verte et orange ;
- feedback central plus chaleureux ;
- inspection bleutée ;
- boutons des trois statuts colorés ;
- sélection, tamis actif et transformations présentés dans des cartes vertes,
  orange et violettes légères.

### Page enseignant

- en-tête clair et léger ;
- identité `🌈 Seven Sieves` ;
- même typographie, palette principale, rayons et cartes ;
- métriques de résumé colorées sans rendre cette page aussi ludique que la vue
  apprenante.

## Fichiers modifiés par la Mission 214b

- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-student-0.1.html`
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-teacher-0.1.html`
- `prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/css/seven-sieves-roles-0.1.css`
- `prototypes/08-dico-seven-sieves/Node/test/static-files.test.js`
- `prototypes/08-dico-seven-sieves/Node/test/seven-sieves-role-separation.test.js`
- `reports/214b_seven_sieves_visual_identity_restoration_report.md`

Aucun fichier JavaScript applicatif, contrat, endpoint, appel API, donnée,
Compose, launcher ou variante historique n’a été modifié par ce correctif.

## Comportements préservés

Les garde-fous de la Mission 214 restent actifs et réussis :

- préparation enseignant ;
- transfert `sessionStorage` versionné ;
- paquet API complet, dont `pedagogical_enrichments` ;
- états absent, invalide et incompatible ;
- sept tamis ;
- inspection ;
- sélection et désélection ;
- statuts compris, doute et inconnu ;
- comparaison ;
- réinitialisation locale sans perte de l’activité ;
- retour vers la préparation ;
- absence de contrôles enseignants dans la page apprenante.

## Versions obtenues

- interface enseignant : `0.1.1` ;
- interface apprenant : `0.1.1` ;
- contrat de transfert de session : inchangé, `0.1`.

L’incrément du plus petit niveau correspond au correctif visuel ciblé des deux
artefacts concernés.

## Contrôles exécutés

- scripts session, enseignant et apprenant : `node --check` réussi ;
- tests ciblés Mission 214/214b : 7/7 réussis ;
- suite complète : 220/220 réussis ;
- nouvelles assertions permanentes : identité Seven Sieves, pictogrammes,
  actions sémantiques, palette historique, typographie sans sérif, tokens
  sélectionnés et cohérence visuelle enseignant/apprenant ;
- pages réelles enseignant et apprenant : HTTP 200, version `0.1.1` ;
- `git diff --check` : réussi ; les avertissements Git concernent uniquement la
  conversion LF/CRLF future.

## Validation visuelle et checklist humaine

Le contrôleur Chromium demeure indisponible après l’échec d’infrastructure
documenté pendant la Mission 214. Une répétition disproportionnée n’a pas été
construite pour ce correctif esthétique. Aucune validation visuelle à
1440 × 900 ou 1366 × 768 n’est donc prétendue par Codex.

Pages à vérifier par David dans le même onglet :

1. ouvrir la page enseignant, vérifier l’en-tête clair et lancer le scénario
   préparé ;
2. ouvrir la vue apprenant avec le bouton prévu ;
3. à 1440 × 900 puis 1366 × 768, vérifier que le texte et les trois actions sont
   visibles sans débordement horizontal ;
4. cliquer un mot, le sélectionner, appliquer les trois statuts et changer de
   tamis pour contrôler les couleurs ;
5. vérifier la chaleur du panneau d’observation et l’absence de contrôle de
   préparation ;
6. tester comparaison, réinitialisation et retour enseignant.

La validation esthétique finale appartient à David.

## MariaDB et services

Les volumes et empreintes SHA-256 avant/après sont strictement identiques :

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

Les 86 relations, dont les dix relations de `INFORMATION_DATA` et les dix de
`NUIT`, sont préservées. Aucun service n’a été arrêté ou redémarré. Le serveur
Seven Sieves répond toujours sur `3000` et MariaDB reste accessible en lecture.

Aucun appel OpenAI, commit, push ou déploiement n’a été effectué.

## Message de commit proposé pour les Missions 214 et 214b

`feat(seven-sieves): séparer les parcours et restaurer l’identité apprenante`
