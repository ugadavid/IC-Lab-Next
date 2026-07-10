# Index documentaire Dico-IC

Cet index recense les 59 documents présents dans `docs/` et ses sous-dossiers au 21 juin 2026, hors index lui-même. Il sert de point d’entrée à un humain ou à un assistant qui doit reprendre le projet sans reconstruire tout son historique.

## Légende des statuts

- **Référence** : document à privilégier pour comprendre l’état ou une décision actuelle.
- **Historique** : étape importante pour comprendre l’évolution, mais pas nécessairement l’état courant.
- **Expérimental** : étude, prototype ou V0 volontairement non stabilisé.
- **Obsolète possible** : document remplacé en partie par une orientation ou une implémentation ultérieure.
- **À relire** : contenu susceptible d’éclairer une prochaine décision, à confronter à l’état courant.

Les statuts non inscrits explicitement dans les documents sont des appréciations documentaires prudentes, pas des décisions officielles supplémentaires.

## Architecture générale

- [`vision.md`](vision.md) — **Thème : vision et finalité. Statut : référence.**  
  Définit Dico-IC comme base administrable et explicable destinée aux applications d’intercompréhension. Pose les limites : ni traducteur, ni dictionnaire classique, ni système d’IA opaque.

- [`ic_dico_model_notes_md_v_1.md`](ic_dico_model_notes_md_v_1.md) — **Thème : modèle conceptuel initial. Statut : référence.**  
  Explique la séparation entre `lexical_entry`, `lexical_form` et `form_relation`, puis le rôle des tables initiales. À lire avant toute évolution du modèle lexical.

- [`research/ic_dico_field_insights_from_interviews_v_1.md`](research/ic_dico_field_insights_from_interviews_v_1.md) — **Thème : besoins issus du terrain. Statut : à relire.**  
  Synthétise les entretiens avec des enseignants et le positionnement métier émergent. Sert à confronter les choix techniques aux usages réels.

- [`codex-first-understanding.md`](codex-first-understanding.md) — **Thème : première lecture globale du dépôt. Statut : historique.**  
  Résume l’architecture, le modèle de données, les procédures et les incohérences observées au début du chantier. Utile pour comprendre le point de départ, mais antérieur aux API, à l’admin et à `inflected_form`.

- [`codex-workflow.md`](codex-workflow.md) — **Thème : règles de collaboration et philosophie. Statut : référence.**  
  Rappelle le caractère exploratoire du projet et les précautions attendues lors des interventions. Document court à consulter avant une modification structurante.

## Base de données

- [`current-source-of-truth-analysis.md`](current-source-of-truth-analysis.md) — **Thème : comparaison des anciens scripts SQL. Statut : historique, obsolète possible.**  
  Compare `sql.sql`, `init_schema.sql`, `schema.sql` et `procedures.sql`, puis propose une vérité provisoire. Précède la consolidation progressive dans `database/current_draft/`.

- [`sql-organization-proposal.md`](sql-organization-proposal.md) — **Thème : organisation des scripts. Statut : expérimental.**  
  Propose une réorganisation prudente des schémas, procédures et seeds sans suppression. A servi de base conceptuelle au dossier `current_draft`.

- [`current_draft_consistency_check.md`](current_draft_consistency_check.md) — **Thème : ordre d’exécution SQL. Statut : historique, obsolète possible.**  
  Vérifie la cohérence théorique de l’ordre initial `00/10/20/30`. Ne couvre pas nécessairement les ajouts ultérieurs `40_seed_api_mock_support.sql` et `50_inflected_form.sql`.

- [`database/stored-procedures-reference.md`](database/stored-procedures-reference.md) — **Thème : procédures stockées `sp_`. Statut : référence.**  
  Inventorie les procédures, signatures, dépendances, exemples d’usage et divergences entre scripts. Point d’entrée avant toute utilisation ou modification des procédures.

- [`docker-sql-init-analysis.md`](docker-sql-init-analysis.md) — **Thème : initialisation MariaDB avec Docker. Statut : à relire.**  
  Analyse le volume `./db`, son décalage avec `database/` et les options de test du brouillon SQL. À confronter au `docker-compose.yml` courant avant toute réinitialisation.

- [`api-mock-support-seed-report-v0.md`](api-mock-support-seed-report-v0.md) — **Thème : données expérimentales pour le mock API. Statut : expérimental.**  
  Documente le seed minimal permettant de reproduire les exemples Seven Sieves : cognats, formes pan-romanes et règle `-ción → -tion`. Précise les limites et la réexécution.

## API

- [`dico-local-development-startup.md`](dico-local-development-startup.md) — **Thème : démarrage local. Statut : référence.**  
  Donne le chemin court Docker MariaDB, `cd Node`, `npm start`, puis les URL admin et Seven Sieves servies par le serveur Node.

- [`dico-node-static-prototypes-report.md`](dico-node-static-prototypes-report.md) — **Thème : prototypes servis par Node. Statut : référence.**  
  Documente le montage Express `/prototypes`, les URL disponibles, les chemins Seven Sieves vérifiés et les tests réalisés.

- [`api-analysis-contract-v0.md`](api-analysis-contract-v0.md) — **Thème : contrat JSON de `POST /analysis`. Statut : référence.**  
  Définit la requête, les tokens avec offsets UTF-16, les enrichissements, les sept tamis, les warnings et les responsabilités du client. Contrat public V0 à préserver lors des évolutions.

- [`post-analysis-implementation-plan-v0.md`](post-analysis-implementation-plan-v0.md) — **Thème : algorithme prévu pour l’analyse. Statut : historique, obsolète possible.**  
  Décrit validation, tokenisation, lectures SQL par lot et génération des tamis avant l’implémentation. Utile pour les intentions initiales ; le rapport d’implémentation décrit mieux l’état réalisé.

- [`post-analysis-api-implementation-report-v0.md`](post-analysis-api-implementation-report-v0.md) — **Thème : API Node réalisée. Statut : référence.**  
  Présente la stack, `GET /languages`, `POST /analysis`, les lectures MariaDB et la couverture réelle des tamis. Point de départ pour comprendre le backend actuel.

- [`dico-analysis-inflected-form-sieve6-report.md`](dico-analysis-inflected-form-sieve6-report.md) — **Thème : transmission morphologique vers le tamis 6. Statut : référence.**  
  Documente l’enrichissement `validated_plural` produit par `POST /analysis` depuis un mapping `inflected_form` validé. Fige la provenance publique, le payload, les tests et la compatibilité avec les tamis existants.

- [`sieve-enrichment-sql-mapping-v0.md`](sieve-enrichment-sql-mapping-v0.md) — **Thème : correspondance API ↔ SQL. Statut : expérimental, à relire.**  
  Évalue, tamis par tamis, ce que le schéma peut représenter et ce qui reste heuristique. Antérieur à certaines évolutions, notamment `inflected_form`, mais encore utile pour les frontières du modèle.

## Dico-IC Admin

- [`dico-admin-v0-report.md`](dico-admin-v0-report.md) — **Thème : première application d’administration. Statut : historique.**  
  Documente la consultation du modèle, des langues et des entrées lexicales, ainsi que la création multilingue. Base de l’admin avant ses extensions manuelles et IA.

- [`dico-admin-manual-v0-extensions-report.md`](dico-admin-manual-v0-extensions-report.md) — **Thème : pagination, édition et relations. Statut : référence.**  
  Décrit les extensions manuelles du lexique, les endpoints associés et la gestion des relations entre formes. À lire pour le fonctionnement administratif courant.

- [`admin-edit-add-form-diagnostic.md`](admin-edit-add-form-diagnostic.md) — **Thème : bouton d’ajout de forme inactif. Statut : historique.**  
  Établit la cause frontend et les limites backend qui empêchaient l’ajout d’une forme pendant l’édition. Conservé comme diagnostic préalable au correctif.

- [`admin-edit-add-form-implementation-report.md`](admin-edit-add-form-implementation-report.md) — **Thème : ajout transactionnel de formes. Statut : référence.**  
  Explique le comportement frontend, la validation API et la transaction repository permettant d’ajouter une nouvelle forme à une entrée existante sans supprimer les anciennes.

## Assistants IA

- [`dico-admin-ai-domain-v0-report.md`](dico-admin-ai-domain-v0-report.md) — **Thème : propositions lexicales depuis un domaine. Statut : expérimental.**  
  Documente l’assistant IA Domaine, son endpoint, son workflow de brouillon et sa validation humaine avant écriture.

- [`dico-admin-ai-text-v0-report.md`](dico-admin-ai-text-v0-report.md) — **Thème : propositions lexicales depuis un texte. Statut : expérimental.**  
  Décrit l’analyse des mots inconnus d’un texte et la génération de candidats lexicaux. Réutilise les principes de l’assistant Domaine tout en séparant détection et écriture.

- [`dico-admin-ai-relations-v0-report.md`](dico-admin-ai-relations-v0-report.md) — **Thème : propositions de relations entre formes. Statut : expérimental.**  
  Présente le workflow IA → validation humaine → endpoint de relation, avec détection des doublons et conservation de l’écriture par l’API.

- [`dico-admin-ai-relations-v1-reference-language-report.md`](dico-admin-ai-relations-v1-reference-language-report.md) — **Thème : langue pivot des relations IA. Statut : référence pour cette fonctionnalité.**  
  Étend l’assistant Relations avec les modes FR, ES, IT, PT, EN et Toutes. Documente la compatibilité V0 et l’effet du pivot sur les propositions.

- [`dico-ai-lemma-prompt-correction-report.md`](dico-ai-lemma-prompt-correction-report.md) — **Thème : lemmes canoniques dans les prompts. Statut : référence.**  
  Fige la règle selon laquelle les assistants lexicaux doivent proposer des lemmes dictionnaires, pas des formes fléchies. Explique les exemples et les tests de non-régression du schéma JSON.

- [`dico-ai-inflected-form-v0-study.md`](dico-ai-inflected-form-v0-study.md) — **Thème : workflow IA vers `inflected_form`. Statut : référence conceptuelle.**  
  Étudie comment partir de formes inconnues observées dans les textes pour proposer des mappings `inflected_form`, avec validation humaine systématique. Définit les états `READY`, `LEMMA_NOT_FOUND`, `AMBIGUOUS`, `ALREADY_KNOWN` et les limites V0.

- [`dico-ai-inflected-form-v0-implementation-report.md`](dico-ai-inflected-form-v0-implementation-report.md) — **Thème : Assistant IA Formes Fléchies. Statut : référence.**  
  Documente le workflow réel Texte → formes inconnues → propositions IA → résolution Dico-IC → validation humaine → création de mappings. Référence principale pour l'assistant spécialisé qui alimente `inflected_form` sans créer de nouvelles entrées lexicales.

## Seven Sieves

- [`seven-sieves-api-needs-analysis.md`](seven-sieves-api-needs-analysis.md) — **Thème : besoins du premier client. Statut : historique, à relire.**  
  Inventorie les données autrefois codées en dur dans le prototype et les classe entre contenu administrable, règles réutilisables et état apprenant. A recentré Dico-IC sur Seven Sieves.

- [`teacher-admin-workflow-v0.md`](teacher-admin-workflow-v0.md) — **Thème : workflow enseignant avec activités et annotations. Statut : obsolète possible.**  
  Décrit un parcours de création, pré-analyse et validation d’activité. Sa part d’annotation manuelle a ensuite été volontairement remplacée par le workflow API léger.

- [`seven-sieves-light-api-workflow-v0.md`](seven-sieves-light-api-workflow-v0.md) — **Thème : workflow enseignant sans friction. Statut : référence.**  
  Fige la V0 stateless : texte, langues, tamis, appel API, puis chargement direct du paquet JSON. Distingue V0 directe, V1 activités et V2 contributions.

- [`seven-sieves-mock-integration-report-v0.md`](seven-sieves-mock-integration-report-v0.md) — **Thème : première consommation du contrat JSON. Statut : historique.**  
  Documente la page branchée sur un fichier mock, la reconstruction par offsets et les interactions restées locales. Étape antérieure à la connexion live.

- [`seven-sieves-live-api-integration-report-v0.md`](seven-sieves-live-api-integration-report-v0.md) — **Thème : connexion réelle à Dico-IC. Statut : référence.**  
  Présente la page live, l’appel `POST /analysis`, le fallback mock, les états locaux et la procédure de test. Référence principale pour l’intégration actuelle.

- [`seven-sieves-live-tooltip-diagnostic.md`](seven-sieves-live-tooltip-diagnostic.md) — **Thème : diagnostic du tamis 1. Statut : historique.**  
  Explique pourquoi `organización` reçoit une infobulle et `internacional` non : relation lexicale disponible pour l’un, donnée manquante pour l’autre. Clarifie la responsabilité respective DB/API/frontend.

## Morphologie et formes fléchies

- [`dico-inflected-forms-architecture-study.md`](dico-inflected-forms-architecture-study.md) — **Thème : options générales de représentation de la flexion. Statut : historique, expérimental.**  
  Compare table dédiée, détournement des relations, lemmatisation dynamique et architecture hybride. Pose les principes : le lemme reste canonique et l’analyse reste stateless.

- [`dico-observed-inflected-forms-architecture-note.md`](dico-observed-inflected-forms-architecture-note.md) — **Thème : mappings attestés à faible volume. Statut : référence conceptuelle.**  
  Adapte l’architecture hybride au contexte de quelques enseignants et textes. Définit `inflected_form` comme couche d’accès sélective, validée et non comme dictionnaire morphologique exhaustif.

- [`dico-singular-plural-architecture-note.md`](dico-singular-plural-architecture-note.md) — **Thème : pluriels des noms et adjectifs. Statut : référence conceptuelle.**  
  Compare formes attestées, règles morphologiques et combinaison hybride dans un périmètre V0 strict. Propose le pipeline exact → forme validée → règle éventuelle → lemme.

- [`dico-lemmatization-engines-study.md`](dico-lemmatization-engines-study.md) — **Thème : moteurs multilingues. Statut : à relire.**  
  Compare spaCy, Stanza, UDPipe, TreeTagger, ressources lexicales et LLM pour FR/ES/IT/PT. Recommande une expérimentation mesurée, avec Stanza et UDPipe comme premiers candidats.

- [`dico-inflected-form-v0-implementation-report.md`](dico-inflected-form-v0-implementation-report.md) — **Thème : implémentation de `inflected_form`. Statut : référence.**  
  Documente le script expérimental, les endpoints admin, l’interface et la lecture des pluriels validés par `POST /analysis`. Contient le test concret `organizaciones → organización`.

## Qualité des données

- [`dico-deduplication-v0-diagnostic.md`](dico-deduplication-v0-diagnostic.md) — **Thème : diagnostic global de duplication. Statut : référence.**  
  Cartographie les risques de doublons dans le dictionnaire : même concept, formes fléchies prises pour des lemmes, entrées IA partielles, stubs et variantes proches. Fournit aussi des requêtes SQL de contrôle qualité réutilisables.

- [`dico-deduplication-pilot-useful.md`](dico-deduplication-pilot-useful.md) — **Thème : cas pilote `USEFUL` / `UTIL_ADJECTIVE_USEFUL`. Statut : référence opérationnelle.**  
  Analyse en détail le premier doublon conceptuel emblématique : `USEFUL` comme entrée canonique et `UTIL_ADJECTIVE_USEFUL` comme pluriels adjectivaux stockés à tort dans `lexical_form`. Prépare une procédure reproductible sans modifier les données.

- [`dico-deduplication-pilot-useful-execution-plan.md`](dico-deduplication-pilot-useful-execution-plan.md) — **Thème : plan DBA réversible pour le cas `USEFUL`. Statut : référence opérationnelle.**  
  Décrit l'état initial, les sauvegardes, le SQL préparé, les contrôles, le rollback et les critères Go/No-Go. Conclut à un GO prudent pour créer des mappings `inflected_form`, mais à un NO-GO pour une résolution complète tant qu'il n'existe pas de politique d'archivage ou de désactivation des anciennes formes lexicales.

## Tamis et objets pédagogiques

- [`dico-connector-help-v0-architecture-study.md`](dico-connector-help-v0-architecture-study.md) — **Thème : architecture conceptuelle des aides discursives. Statut : référence conceptuelle.**  
  Analyse le besoin issu des entretiens, compare les rattachements possibles et recommande un objet pédagogique autonome, distinct du lexique et des tamis.

- [`seven-sieves-connector-help-v0-prototype-report.md`](seven-sieves-connector-help-v0-prototype-report.md) — **Thème : prototype local des connecteurs. Statut : historique, expérimental.**  
  Documente le catalogue JavaScript initial et la première validation du parcours expression discursive → indice pédagogique. Le catalogue local a ensuite été remplacé par l'intégration Dico-IC.

- [`dico-connector-help-v0-implementation-study.md`](dico-connector-help-v0-implementation-study.md) — **Thème : spécification d'implémentation Connector Help. Statut : référence d'architecture.**  
  Fige le modèle, le DDL, les endpoints, la portée multi-token, l'administration et la stratégie de migration retenus pour la V0 officielle.

- [`dico-connector-help-v0-implementation-report.md`](dico-connector-help-v0-implementation-report.md) — **Thème : implémentation officielle Connector Help V0. Statut : référence.**  
  Décrit la table et son seed, les endpoints, `pedagogical_enrichments`, la migration Seven Sieves, l'admin et les tests du premier objet pédagogique transversal officiel.

- [`dico-sieves-4-5-6-architecture-study.md`](dico-sieves-4-5-6-architecture-study.md) — **Thème : architecture des tamis 4, 5 et 6. Statut : référence conceptuelle.**  
  Distingue règles grapho-phonétiques, analyse syntaxique contextuelle et traits morphologiques. Recommande une approche hybride différenciée et une évolution guidée par les usages.

- [`dico-sieves-456-pedagogical-objects-v0.md`](dico-sieves-456-pedagogical-objects-v0.md) — **Thème : objets pédagogiques issus d’exemples. Statut : référence conceptuelle.**  
  Part d’exemples romans pour faire émerger cinq objets : indice grapho-phonétique, patron syntaxique, forme observée, indice morphologique et paradigme illustratif.

- [`seven-sieves-tamis4-pedagogical-hint-v0-report.md`](seven-sieves-tamis4-pedagogical-hint-v0-report.md) — **Thème : premier indice local `ñ / gn`. Statut : historique, expérimental.**  
  Documente la variante Seven Sieves, la fusion frontend avec l’API et le premier test sur `España`. Première preuve de concept du tamis 4 pédagogique.

- [`seven-sieves-tamis4-pedagogical-hint-v0-1-report.md`](seven-sieves-tamis4-pedagogical-hint-v0-1-report.md) — **Thème : catalogue Tamis 4 V0.1. Statut : expérimental.**  
  Étend le catalogue local avec `-ción/-tion`, `-dad/-té` et `-mente/-ment`. Décrit les cas positifs, négatifs, limites et la coexistence avec le paquet API.

- [`seven-sieves-tamis4-v0-concept-note.md`](seven-sieves-tamis4-v0-concept-note.md) — **Thème : décision conceptuelle Tamis 4. Statut : référence.**  
  Fige l’hypothèse mot → indice → raisonnement → compréhension, le catalogue de quatre règles et la décision de considérer le concept comme validé en V0, sans prétendre à une validation enseignante.

- [`seven-sieves-tamis6-pedagogical-hint-v0-study.md`](seven-sieves-tamis6-pedagogical-hint-v0-study.md) — **Thème : premier objet pédagogique morphologique. Statut : référence conceptuelle.**  
  Étudie les pluriels simples des noms et adjectifs, puis recommande de commencer par un mapping validé plutôt que par des règles en `-s` ou `-es`. Propose le format d’infobulle et les limites de la V0.

- [`seven-sieves-tamis6-pedagogical-hint-v0-report.md`](seven-sieves-tamis6-pedagogical-hint-v0-report.md) — **Thème : diagnostic de faisabilité du tamis 6. Statut : historique.**  
  Montre que `inflected_form` contenait déjà `PLURAL`, mais que l’ancien paquet d’analyse n’exposait pas la provenance nécessaire au frontend. Explique le prérequis qui a conduit à l’évolution additive du contrat.

- [`seven-sieves-tamis6-pedagogical-hint-v0-implementation-report.md`](seven-sieves-tamis6-pedagogical-hint-v0-implementation-report.md) — **Thème : rendu Seven Sieves du pluriel validé. Statut : référence.**  
  Documente le déclencheur frontend strict, l’infobulle, la surbrillance et la coexistence des tamis 1, 4 et 6. Confirme qu’aucune règle morphologique locale n’est appliquée.

- [`seven-sieves-tamis6-v0-concept-note.md`](seven-sieves-tamis6-v0-concept-note.md) — **Thème : décision conceptuelle Tamis 6. Statut : référence.**  
  Fige le parcours `forme observée → lemme → indice morphologique → compréhension` et le principe « si on sait, on explique ; si on suppose, on ne dit rien ». Référence stratégique pour les futures extensions morphologiques.

## Études exploratoires et archives

- [`david.md`](david.md) — **Thème : pense-bête d’exploitation locale. Statut : à relire.**  
  Rassemble des commandes et repères personnels pour Docker, MariaDB, phpMyAdmin et l’état du projet. Pratique pour redémarrer l’environnement, mais à vérifier contre la configuration courante.

- [`Chantiers.docx`](Chantiers.docx) — **Thème : feuille de route informelle. Statut : à relire.**  
  Inventorie les chantiers lexique, morphologie, tamis 4 à 6, objets pédagogiques et retours enseignants avec priorités. Instantané utile de la réflexion, non assimilable à un backlog officiel à jour.

- [`Chantiers.pdf`](Chantiers.pdf) — **Thème : export PDF de la feuille de route. Statut : historique.**  
  Version PDF de `Chantiers.docx`, pratique pour lecture figée. Ne constitue pas une source distincte ; privilégier le DOCX si le document doit évoluer.

- [`M2 - Dico-IC.docx`](M2%20-%20Dico-IC.docx) — **Thème : archive longue de conversation. Statut : historique.**  
  Export d’un échange de travail retraçant une grande partie de l’histoire et des réflexions Dico-IC. Très riche mais peu adapté à une reprise rapide ; utiliser l’index et les documents ciblés en priorité.

- [`M2 - Dico-IC.pdf`](M2%20-%20Dico-IC.pdf) — **Thème : export PDF de l’archive de conversation. Statut : historique.**  
  Version PDF de l’archive précédente, sur 84 pages. À consulter pour retrouver une discussion ancienne précise, pas comme source de vérité actuelle.

## Documents essentiels à lire pour reprendre le projet

Si un nouveau développeur, GPT ou Codex arrive, lire dans cet ordre :

1. [`vision.md`](vision.md) — comprendre la finalité et les limites du projet.
2. [`ic_dico_model_notes_md_v_1.md`](ic_dico_model_notes_md_v_1.md) — comprendre le noyau lexical du modèle.
3. [`seven-sieves-light-api-workflow-v0.md`](seven-sieves-light-api-workflow-v0.md) — comprendre le workflow stateless centré sur le premier client.
4. [`api-analysis-contract-v0.md`](api-analysis-contract-v0.md) — connaître le contrat public entre Dico-IC et Seven Sieves.
5. [`post-analysis-api-implementation-report-v0.md`](post-analysis-api-implementation-report-v0.md) — retrouver l’implémentation backend actuelle.
6. [`seven-sieves-live-api-integration-report-v0.md`](seven-sieves-live-api-integration-report-v0.md) — comprendre le client live et son fallback.
7. [`dico-admin-manual-v0-extensions-report.md`](dico-admin-manual-v0-extensions-report.md) — comprendre l’administration du lexique et des relations.
8. [`dico-inflected-form-v0-implementation-report.md`](dico-inflected-form-v0-implementation-report.md) — comprendre la couche de formes fléchies validées.
9. [`dico-ai-inflected-form-v0-implementation-report.md`](dico-ai-inflected-form-v0-implementation-report.md) — comprendre l'assistant IA qui propose des mappings fléchis validables.
10. [`dico-sieves-4-5-6-architecture-study.md`](dico-sieves-4-5-6-architecture-study.md) — comprendre les frontières entre connaissances stockées et calculs linguistiques.
11. [`seven-sieves-tamis4-v0-concept-note.md`](seven-sieves-tamis4-v0-concept-note.md) — reprendre la décision pédagogique du tamis 4.
12. [`seven-sieves-tamis6-v0-concept-note.md`](seven-sieves-tamis6-v0-concept-note.md) — comprendre la première transmission morphologique explicite et son principe de confiance.
13. [`dico-connector-help-v0-implementation-report.md`](dico-connector-help-v0-implementation-report.md) — comprendre le premier objet pédagogique transversal officiel et sa portée multi-token.
14. [`dico-deduplication-v0-diagnostic.md`](dico-deduplication-v0-diagnostic.md) — connaître les risques qualité avant de faire grandir le dictionnaire.

Pour une reprise orientée métier, insérer après la vision : [`research/ic_dico_field_insights_from_interviews_v_1.md`](research/ic_dico_field_insights_from_interviews_v_1.md). Pour une intervention SQL, ajouter immédiatement [`database/stored-procedures-reference.md`](database/stored-procedures-reference.md) et relire les scripts de `database/current_draft/` eux-mêmes.

## État actuel du projet

Dico-IC dispose aujourd'hui d'une API Node opérationnelle connectée à MariaDB, avec `POST /analysis`, `GET /languages`, une administration locale du lexique, des relations, des formes fléchies, des connecteurs discursifs et plusieurs assistants IA à validation humaine. Seven Sieves dispose d'une page live connectée à l'API et de variantes pédagogiques démontrant les tamis 4 et 6 ainsi que Connector Help.

Les éléments encore expérimentaux restent clairement identifiés : `database/current_draft/`, `inflected_form`, Connector Help, les assistants IA, les indices pédagogiques et la déduplication. Ils sont utilisables comme V0 locales, mais doivent conserver validation humaine, sauvegardes et prudence avant toute montée en volume.

Les prochains grands chantiers sont la qualité du dictionnaire, la déduplication contrôlée, l'archivage ou la désactivation propre des doublons, l'amélioration progressive des mappings `inflected_form`, et la validation pédagogique des objets Tamis 4, Tamis 6 et Connector Help avec des enseignants.
