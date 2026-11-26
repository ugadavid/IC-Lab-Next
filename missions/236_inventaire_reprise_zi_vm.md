# Mission 236 — Inventaire de reprise de tout IC-Lab-Next, de Zenith Ice vers CODEX_VM

## Résultat attendu

David doit pouvoir se placer devant ZI et savoir quoi y rechercher, quoi exporter ou copier, où le remettre sur la VM et comment vérifier chaque parcours. Le rapport 235 constitue le point de départ. La refonte et l’extraction de l’anonymiseur sont reportées.

## Inventaire

1. Lire AGENTS.md, le rapport 235, l’architecture, les guides de lancement et les documents spécialisés. Suivre le code et la configuration actuelle pour couvrir le Hub (dont comptes, cours, activités et administration IA), Proto05, Agent vocal, Informaticaire, Dico-IC, Seven Sieves et les ressources partagées. Inclure les parcours authentifiés et les services externes réellement employés.
2. Pour chaque composant, croiser les manifests, fichiers Compose, exemples de configuration, règles Git, scripts, accès aux bases et références de médias avec le contenu réel du clone. Identifier les dépendances entre composants et les données persistantes hors Git : schémas et données MariaDB, autres persistances identifiées, médias sources, fichiers liés, configurations locales. Déterminer quels dérivés sont régénérables. Distinguer le contenu déjà suivi, ce qui doit venir de ZI, ce qui se réinstalle ou se configure sur la VM et ce qui reste à confirmer.
3. Pour Docker, relier services, conteneurs, montages, volumes et schémas aux applications consommatrices. Distinguer noms déclarés et noms observés. Préparer une procédure de repérage sur ZI et une méthode d’export cohérente pour les bases utiles. Préciser les liens à préserver entre identifiants en base et fichiers médias.
4. Pour chaque élément à récupérer, indiquer preuve (fichier ou usage), source sur ZI ou méthode de découverte, destination sur la VM, caractère indispensable ou facultatif, et contrôle après remise en place. Si ZI est inaccessible, fournir les commandes PowerShell/Docker de lecture que David pourra y exécuter et les résultats à relever. Qualifier séparément les restrictions de la session Codex (réseau, CIM, boucle locale, Git) et les manques confirmés sur la VM.
5. Terminer par un ordre de remise en route et une recette courte de chaque composant depuis ses entrées normales, y compris lancement et arrêt globaux. Signaler toute fonctionnalité encore sans preuve ou tout arbitrage requis.

## Périmètre et publication

Mission d’inventaire et de préparation. Préserver les données et les changements locaux, respecter les consignes du dépôt sur les secrets. Les transferts, installations, exports réels, restaurations SQL et modifications applicatives attendront la lecture du rapport. Ne publier aucune valeur secrète, donnée métier ou copie de média.

Synchroniser le clone en préservant le travail existant. Produire le rapport dans reports/ selon AGENTS.md, avec en tête la liste de collecte directement utilisable sur ZI. Même si l’inventaire est partiel, faire un commit contenant uniquement le rapport, le pousser sur origin/main, vérifier sa présence et sa lisibilité sur GitHub, puis transmettre le lien et le SHA vérifié. S’arrêter pour la lecture avec David.
