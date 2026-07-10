# Rapport 001 - Informaticaire v0.1

## Objectif de la réalisation

Créer une première version statique du prototype **Informaticaire**, une interface de mémoire navigable de l'intercompréhension. Le prototype permet de retrouver, filtrer et relier des projets historiques, acteurs, ressources, outils, corpus, concepts et besoins issus d'une première exploitation des entretiens.

## Fichiers créés

- `index.html`
- `styles.css`
- `data.js`
- `script.js`
- `README.md`
- `reports/001_informaticaire_v0.1_report.md`

## Fichiers modifiés

Aucun fichier existant n'a été modifié. Les PDF du dossier `entretiens` ont été lus et exploités comme matière première, sans modification.

## Choix techniques

- Prototype statique uniquement.
- Pas de backend.
- Pas de framework.
- Pas de dépendance externe obligatoire.
- Données locales dans `data.js`.
- Rendu dynamique léger en JavaScript natif.
- Interface ouvrable directement via `index.html`.

## Choix de structuration des données

Le fichier `data.js` contient trois ensembles principaux :

- `timelineItems` pour la frise historique.
- `items` pour la bibliothèque de fiches filtrables.
- `needs` pour les besoins transversaux.

Chaque fiche contient au minimum :

- `id`
- `title`
- `type`
- `status`
- `description`
- `tags`
- `actors`
- `interviews`

Des champs complémentaires ont été ajoutés quand ils sont utiles :

- `period`
- `risks`
- `recoverability`
- `uncertain`

Ces champs permettent de distinguer les ressources vivantes, fragiles, disparues, à récupérer ou à vérifier.

## Éléments intégrés depuis les entretiens

La v0.1 intègre un premier noyau de fiches autour des éléments prioritaires :

- Galatea
- Galanet
- Galapro
- Miriadi
- RedInter
- Lecturio
- IPLERA
- ALPAGA
- REPLI4C
- APICAD
- EuRom / EuRom Web
- Romanofonía y Cinema
- Elementi di intercomprensione UniTO
- Speechmatics
- ELAN
- NoSketch Engine / KiParla
- PHIP / Historias Infantiles Plurilingües
- Itinéraires romans
- Portail PLE cité par Kátia
- aides à la compréhension orale
- corpus et vidéos non encore exploitables
- Christian Degache
- Encarni Carrasco
- Jean-Pierre Chavagne
- Kátia
- Sandra
- Alice
- Hugues Sheeren
- Richard
- Thomas

Les entretiens les plus mobilisés pour cette première passe sont notamment ceux d'Encarni, Jean-Pierre, Christian, Kátia, Sandra, Alice, Hugues, Richard, Laura et Sandrine. Ils ont fait émerger deux grands pôles : la mémoire des plateformes historiques et le chantier contemporain des corpus, de l'oral, de la transcription et de l'annotation.

## Limites actuelles

- La base n'est pas exhaustive.
- Certaines dates restent approximatives.
- Plusieurs noms ou références sont volontairement marqués comme incertains.
- Les relations entre fiches ne sont pas encore représentées comme un graphe.
- Les fiches ne contiennent pas encore de sources page par page.
- Les données ne sont pas encore exportables.

## Pistes pour la prochaine itération

- Ajouter une vue graphe acteurs-projets-ressources.
- Ajouter des liens internes entre fiches.
- Ajouter des niveaux de certitude et des références précises par entretien.
- Ajouter un champ `todo` plus systématique.
- Ajouter une vue "campagne de récupération" avec responsables, priorité et état d'avancement.
- Ajouter export JSON/CSV.
- Compléter RedInter, Lecturio, Portail PLE et les ressources Union Latine.
- Consolider la chronologie des projets historiques.

## Vérifications effectuées

- Lecture du dossier `prototypes/07-informaticaire/entretiens`.
- Extraction textuelle ciblée des PDF avec le runtime Python Codex.
- Vérification des occurrences principales : Galatea, Galanet, Galapro, Miriadi, Lecturio, IPLERA, ALPAGA, REPLI4C, APICAD, EuRom, Romanofonía y Cinema, Speechmatics, ELAN, NoSketch Engine, KiParla, PHIP.
- Vérification que l'interface repose uniquement sur `index.html`, `styles.css`, `data.js` et `script.js`.
- Vérification que les filtres demandés sont présents : Tous, Projets, Acteurs, Ressources, Outils, Corpus, Concepts, Besoins, À récupérer, Fragile, Disparu, Vivant.
- Vérification que la section "À sauver / à vérifier" isole les éléments fragiles, disparus, à récupérer ou à vérifier.

## Confirmation de périmètre

Aucun autre prototype n'a été modifié pour cette réalisation. Toutes les créations ont été faites dans `prototypes/07-informaticaire`.
