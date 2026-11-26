# 235 — Reprise d’IC-Lab-Next sur CODEX_VM

## Trois gestes à refaire dans Chrome

Depuis `C:\Users\codex\Documents\Projets\IC-Lab-Next`, ouvrir le fichier indiqué dans Chrome. Ces trois démonstrations ont fonctionné le 26 novembre 2026, sans démarrer le laboratoire.

| Démonstration | Fichier dans le clone | Geste et résultat observé |
|---|---|---|
| Informaticaire | [prototypes/07-informaticaire/index.html](../prototypes/07-informaticaire/index.html) | Saisir **Miriadi**, cliquer sur **Rechercher**, puis sur **Ouvrir la fiche** dans le premier résultat. La recherche affiche 32 fiches. La fiche Miriadi propose **Lectŭrĭo+** parmi ses fiches liées. |
| Agent vocal IC | [prototypes/06-voice-agent-ic/library-1.1.html](../prototypes/06-voice-agent-ic/library-1.1.html) | Saisir **Chaleur urbaine**, puis cliquer sur **Voir details**. La fiche *Chaleur urbaine et nuits difficiles* présente Malik, Lucía et Laia. La bibliothèque affiche « Serveur indisponible - mode local ». |
| Seven Sieves historique | [prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-0.0.8.2.html](../prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-0.0.8.2.html) | Cliquer sur **2. Lexique pan-roman**. Le texte espagnol reste affiché et les rapprochements apparaissent, dont *lenguas → langues / lingue / línguas*. Cette édition permet de montrer le principe des tamis. L’entrée de soutenance actuelle est testée séparément ci-dessous. |

Pour présenter le laboratoire lui-même, ouvrir le [portail Hub 0.10.4](../prototypes/00-ic-hub/public/portal-0.10.4.html). Ses cinq cartes sont visibles. Pour la démonstration hors ligne, utiliser les fichiers du tableau.

## Les cinq cartes du Hub et la soutenance

Essai interactif sous Chrome 158 sur la VM. L’accueil HTTP `http://127.0.0.1:8790/` a refusé la connexion. Les cinq cartes ont donc été cliquées depuis la page locale du portail. Les adresses du tableau sont celles du parcours HTTP prévu.

| Destination et URL | Geste essayé | Résultat dans cette session |
|---|---|---|
| Vidéo augmentée · `http://127.0.0.1:8791/teacher` | **Espace enseignant** | Connexion refusée. Le lanceur Proto05 signale l’absence de `prototypes/05-augmented-ic-video-01/.env.local`. La bibliothèque requiert aussi le schéma MariaDB `ic_augmented_video` opérationnel et le client `mysql2` chargé par défaut depuis le Hub. |
| Agent vocal · `http://127.0.0.1:8788/library-1.1.html` | **Ouvrir l’Agent vocal** | Le serveur Node a annoncé son écoute sur 8788. Chrome a expiré et le client HTTP de la session a signalé `EACCES` sur la boucle locale. Seule la bibliothèque en mode local a pu être parcourue. Micro et synthèse vocale non essayés. |
| Informaticaire · `http://127.0.0.1:8790/demos/informaticaire/` | **Ouvrir Informaticaire** | Le chemin relatif requiert le serveur Hub. Depuis le fichier du portail, Chrome cherche `C:/demos/informaticaire/` et signale un fichier introuvable. L’ouverture directe de la vraie page fonctionne. |
| Dico-IC · `http://127.0.0.1:3000/admin-app/index-admin-0.1.html` | **Ouvrir l’administration Dico-IC**. Sur la page locale, soumettre **information** puis essayer **Voir l’exemple INFORMATION_DATA**. | Connexion HTTP refusée. La recherche locale affiche « Recherche impossible : Failed to fetch ». Le raccourci ouvre « Entrée indisponible ». La consultation demande l’API Node et la base `ic_dico` renseignée. Le lanceur s’arrête aux dépendances Node manquantes, avant Docker Compose. |
| Seven Sieves enseignant · `http://127.0.0.1:3000/prototypes/01-seven-sieves/index-api-live-0.1.html` | **Ouvrir Seven Sieves**. Ouvrir aussi la page de compatibilité sur disque puis **Lancer l’analyse Dico-IC** sur le texte proposé. | Connexion HTTP refusée. Sur disque, la redirection ouvre bien la préparation enseignant. L’appel à `/analysis` échoue et le bouton apprenant reste désactivé. |
| Seven Sieves soutenance · `http://127.0.0.1:3000/prototypes/01-seven-sieves/index-student-0.1.html?soutenance=1` | Saisir l’URL dans un onglet vierge, sans passer par l’enseignant. | Connexion refusée. Sur disque, la page apprenant 0.1.6 s’ouvre, puis le chargement du paquet échoue. Un serveur HTTP statique limité au dossier Seven Sieves a aussi été essayé sur 8235. Chrome n’a pu le joindre. |

**Ce qu’il reste à vérifier pour la soutenance.** Le code charge `mock/soutenance-analysis-v0.json` par HTTP. Cette démonstration utilise un paquet figé ES → FR avec IT et PT et peut se passer d’une analyse en base. Les **4 tests ciblés** de [l’entrée de soutenance](../prototypes/08-dico-seven-sieves/Node/test/seven-sieves-soutenance-entry.test.js) passent, dont deux stockages de session neufs simulés. L’affichage du paquet dans un onglet réel reste à confirmer dès qu’un serveur HTTP est joignable.

Pour refaire cet essai précis dans PowerShell sur la VM, depuis la racine du clone, lancer la commande ci-dessous. Ouvrir ensuite `http://127.0.0.1:8235/index-student-0.1.html?soutenance=1` dans un onglet neuf. Le résultat attendu est le texte espagnol avec les tamis. Fermer le serveur par **Ctrl+C**.

```powershell
py -m http.server 8235 --bind 127.0.0.1 --directory prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves
```

## Où commence l’anonymiseur de Christian

**Premier fichier à relire** · [teacher-video-detail.html](../prototypes/05-augmented-ic-video-01/teacher-video-detail.html), fonction `workshop(id, mode)`. Depuis la fiche d’une vidéo, **Anonymiser l’image** prépare une copie de travail via `/api/proto05/library/hls-preparations`, attend l’état `completed` puis ouvre `/teacher/anonymization/<preparationJobId>`.

- [teacher-anonymization.html](../prototypes/05-augmented-ic-video-01/teacher-anonymization.html) porte l’éditeur des masques, les étapes temporelles et la commande de dérivation. Son ouverture dans Chrome montre l’aperçu et les réglages de flou. Sans préparation servie, l’éditeur affiche « Erreur » et « Failed to fetch ».
- [server/server.js](../prototypes/05-augmented-ic-video-01/server/server.js) contient le traitement d’image. Chercher `runTemporalLocalPipeline` et `ffmpegTemporalLocalFilter` pour suivre FFprobe, le flou FFmpeg par masque et par segment, puis le réassemblage. [ANONYMIZATION_ENGINE.md](../prototypes/05-augmented-ic-video-01/ANONYMIZATION_ENGINE.md) en décrit les étapes. [audio-anonymization.js](../prototypes/05-augmented-ic-video-01/server/audio-anonymization.js) traite le son dans un atelier distinct.

Le code de l’éditeur et du moteur image est présent. Pour démontrer une dérivation, il manque une instance Proto05 configurée avec une copie vidéo préparée accessible. FFmpeg et FFprobe sont également introuvables dans le PATH de la session. Le repérage s’arrête avant tout traitement média ou extraction.

## État du clone et clôture

- **Départ.** Arbre propre sur `main`. HEAD local, `origin/main` local et `main` vérifié sur GitHub désignent `c52e52ab04931f7463cbe9239172157a638a196d`. Le brief local est identique au fichier distant. Git en ligne de commande ne résolvait pas `github.com`.
- **Lancement Windows.** Node 24.22.2 et npm 11.19.1 présents. `START_IC_LAB_NEXT.bat` échoue au contrôle Windows des processus (accès CIM indisponible), avant de lancer les services. Le contrôle d’état signale Docker indisponible et aucune réponse MariaDB sur 3306. Dans les serveurs Hub et Dico, `npm ci` échoue sur la résolution de `registry.npmjs.org`. Les fichiers de verrouillage sont intacts.
- **Arrêt.** Les processus isolés Node et Python ont été interrompus par Ctrl+C. `STOP_IC_LAB_NEXT.bat` rencontre la même limite CIM. Une vérification indépendante a pu réserver puis libérer les ports 8788, 8790, 8791, 3000, 3306 et 8235. Aucun service externe démarré, aucune écriture métier ni opération SQL.
- **Livrable.** Seul fichier de projet créé, `reports/235_reprise_codex_vm_report.md`. Versions applicatives inchangées. Recette Codex partielle, à relire avec David. Rapport conservé dans le clone, sans commit ni push.

**Commit proposé** · `docs(reports): consigner la reprise d’IC-Lab-Next sur CODEX_VM`
