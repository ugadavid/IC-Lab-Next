# Rapport 007 - Audit démo Informaticaire

## Objectif

Consolider l'expérience de démonstration d'Informaticaire v0.6 sans ajouter de grosse fonctionnalité.

L'audit visait à vérifier que l'interface explique clairement :

- ce qu'est Informaticaire ;
- à quoi il sert ;
- pour qui il est utile ;
- comment chercher ;
- comment contribuer ;
- pourquoi certaines ressources sont à sauver.

Il devait aussi préparer deux scripts de présentation et vérifier la démo Galanet, les exports, le mobile et la cohérence des libellés.

## Fichiers modifiés

- `prototypes/07-informaticaire/index.html`
- `prototypes/07-informaticaire/README.md`

## Fichiers créés

- `prototypes/07-informaticaire/demo-script.md`
- `prototypes/07-informaticaire/reports/007_informaticaire_audit_demo_report.md`

## Corrections effectuées

Les corrections sont restées légères, conformément à la mission.

### Libellés et navigation

- Le lien de navigation `Graphe` a été renommé `Relations`, plus compréhensible pour un public extérieur.
- Le lien `Sauver ensemble` a été raccourci en `Sauver` pour alléger la barre de navigation.
- Le bouton d'export CSV a été clarifié : `Exporter la récupération en CSV`.

### Textes de démonstration

- Le texte de la visite guidée a été reformulé pour expliciter le fil de présentation : comprendre, chercher, relier, sauver, contribuer.
- Le texte de la démo Galanet a été reformulé pour mieux indiquer qu'il s'agit d'un scénario jouable en direct.

### Discours communautaire

- Le texte de la bibliothèque ne met plus en avant les entretiens en première lecture : il parle de relations et de traçabilité documentaire.
- Le titre de la section `Besoins récurrents` a été recentré sur l'évolution de l'outil plutôt que sur ce que les entretiens demandent.
- Le README mentionne le nouveau fichier `demo-script.md`.

## Éléments volontairement non modifiés

- Les données de `data.js` n'ont pas été modifiées.
- Les relations, preuves, récupérations, priorités communautaires et champs de droits ont été conservés.
- La structure générale de l'interface v0.6 a été conservée.
- La démo Galanet n'a pas été transformée en tutoriel complexe : elle reste un parcours narratif léger.
- Le formulaire de contribution reste local et simulé.
- Les exports restent côté navigateur.
- Le dossier `entretiens` n'a pas été modifié.

## Script de démonstration

Le fichier `demo-script.md` a été créé avec :

- une phrase d'introduction courte ;
- une version 5 minutes ;
- une version 12 minutes ;
- les points à montrer absolument ;
- les questions à poser aux testeurs ;
- les points à discuter avec Christian et Kátia.

## Résultats de vérification

### Clarté du discours

L'interface permet de comprendre :

- ce qu'est Informaticaire dès l'accueil ;
- à quoi il sert via le concept et les verbes d'action ;
- pour qui il est utile via la section `Pour qui ?` ;
- comment chercher via la bibliothèque, les filtres et les parcours ;
- comment contribuer via le formulaire local ;
- pourquoi certaines ressources sont à sauver via la campagne collective.

### Démo Galanet

La démo Galanet fonctionne comme parcours narratif :

- la recherche est remplie avec `Galanet` ;
- la bibliothèque affiche la fiche correspondante ;
- le formulaire de contribution cible Galanet ;
- la fiche détaillée s'ouvre ;
- les relations, l'état, la récupération et les actions possibles sont visibles.

### Version mobile

La version mobile reste utilisable :

- aucun débordement horizontal détecté ;
- les compteurs restent lisibles ;
- la navigation et les cartes restent empilées correctement.

### Exports

Les exports fonctionnent encore :

- export JSON des fiches ;
- export CSV de la campagne de récupération.

Les noms de fichiers exportés restent alignés avec la v0.6 :

- `informaticaire_items_v0.6.json`
- `informaticaire_recovery_v0.6.csv`

### Vérifications techniques

- `data.js` : syntaxe vérifiée.
- `script.js` : syntaxe vérifiée.
- Page locale ouverte dans un navigateur.
- Aucune erreur console détectée.
- Serveur local de test arrêté après vérification.

## Zones encore confuses ou à surveiller

- La barre de navigation reste dense sur desktop, même si elle reste utilisable.
- La coexistence de `Ressources à sauver ensemble` et `À sauver / à vérifier` peut encore demander une explication orale.
- La traçabilité documentaire est utile scientifiquement, mais doit rester présentée comme un second niveau pendant la démonstration.
- Les droits et accès restent à vérifier avant tout partage public.
- Certaines fiches auront besoin d'une validation communautaire avant d'être présentées comme fiables.

## Points à discuter avec Christian et Kátia

- Quelles ressources fragiles doivent être traitées en priorité ?
- Qui possède encore des captures, archives, liens, exports ou copies locales ?
- Comment relier Informaticaire à APICAD, REPLI4C, Miriadi, l'UGA ou d'autres réseaux ?
- Quels droits ou statuts d'accès peuvent être indiqués publiquement ?
- Qui pourrait relire et valider les fiches centrales ?
- Quelle gouvernance minimale imaginer pour les contributions ?
- Quelle politique de sauvegarde adopter pour les ressources récupérées ?

## Confirmation de périmètre

Les travaux de la mission 007 ont été réalisés uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas été modifié.

Aucun autre prototype n'a été modifié.
