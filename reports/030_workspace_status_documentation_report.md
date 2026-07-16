# Rapport 030 — état actuel du workspace

Date : **16 juillet 2026**

## Objet

Créer [`STATUS.md`](../STATUS.md), un instantané court répondant à la question :
« Où en est actuellement IC-Lab-Next et quelle est la prochaine étape ? »

La mission est strictement documentaire. Aucun fichier existant n’a été modifié
et `AGENTS.md` n’a pas été créé.

## Sources consultées

### Documents du workspace

- `README.md` ;
- `PROJECTS_LAUNCH.md` ;
- `docs/ARCHITECTURE.md` ;
- `docs/WORKSPACE_PROVENANCE.md` ;
- rapports `026`, `027`, `028` et `029` ;
- rapport `002`, consulté en complément pour dater les dernières validations
  fonctionnelles connues des composants autres que Proto05.

### Composants actifs

- `prototypes/00-ic-hub/server/README.md` ;
- `prototypes/05-augmented-ic-video-01/README.md` ;
- `prototypes/05-augmented-ic-video-01/server/README.md` ;
- `prototypes/06-voice-agent-ic/README.md` ;
- `prototypes/06-voice-agent-ic/server/README.md` ;
- `prototypes/07-informaticaire/README.md` et `DEMO_FREEZE.md` ;
- `prototypes/08-dico-seven-sieves/docs/docs-index.md` ;
- `prototypes/08-dico-seven-sieves/docs/dico-local-development-startup.md` ;
- `prototypes/08-dico-seven-sieves/database/current_draft/README.md`.

Le composant Dico-IC / Seven Sieves ne possède pas de README à sa racine ; son
index documentaire et son guide de démarrage ont été utilisés comme références.

### État réel et versions

- inventaire des cinq dossiers actifs ;
- `server.js` et `package.json` des serveurs Hub, Proto05, Proto06 et Dico-IC ;
- constante de contrat Dico-IC dans `Node/src/analysis.js` ;
- fichiers et ports référencés par les launchers ;
- état Git initial, propre avant la création des deux livrables.

Aucun fichier `.env` n’a été lu.

## Faits retenus

- IC-Lab-Next est le workspace consolidé actuel; l’ancien workspace IC-Lab reste
  l’archive historique.
- Les composants actifs sont Hub, Proto05, Proto06, Informaticaire et Dico-IC /
  Seven Sieves.
- Les versions déclarées retenues sont Hub `0.10.3`, Proto05 serveur `0.1.7` et
  moteur `index-0.0.8.html`, Proto06 backend `1.1`, Informaticaire gel `0.6.5`
  et contrat Dico-IC `0.1`.
- Les ports déclarés sont `8791`, `8790`, `8788`, `3000` et `3306`.
- Le launcher global démarre Proto05 avant IC-Hub, puis Proto06 et Dico-IC.
- Proto05 possède désormais son serveur, ses pages, son API et son JSON, mais
  reste dépendant d’IC-Hub pour le HLS et `hls.js`.
- Les données Hub, Proto05, Proto06, Informaticaire et le volume Dico-IC gardent
  des propriétaires distincts et doivent être préservés.
- La dernière validation fonctionnelle détaillée de Proto05 est celle du 13
  juillet dans le rapport 026. Les rapports 028 et 029 sont documentaires et ne
  constituent pas des recettes runtime.
- La priorité immédiate retenue, conforme au P1 du rapport 027, est la
  sécurisation de la livraison Proto05 par tests de visibilité, de sauvegarde et
  de non-régression des données.

## Contradictions et arbitrages

| Source | Information à ne pas reprendre comme état courant | Arbitrage dans `STATUS.md` |
|---|---|---|
| README racine | Pointe encore vers `index-0.0.6.html` pour Proto05 | Moteur servi `index-0.0.8.html` et serveur `0.1.7` |
| README principal Proto05 | Présente encore le serveur autonome comme une évolution future | Le serveur `8791` et son API sont actuels; seules les dépendances HLS restent provisoires |
| README IC-Hub | Présente la séparation Proto05 comme future | Cette formulation ne vaut plus que pour les routes Hub héritées |
| Rapport 026 | Dit qu’IC-Hub « sert l’activité » | Proto05 sert aujourd’hui pages, API principale et JSON; Hub sert le HLS et la compatibilité |
| Rapports 026 et 027 | Signalent une branche non nettoyée à leur date | L’état Git était propre au début de la présente mission; cette ancienne mention n’est pas conservée dans le statut |
| Dico-IC | Le package Node vaut `1.0.0`, sans version produit globale claire | Le statut distingue le package générique du contrat API `0.1` |

Les versions d’interface et de serveur sont distinguées lorsqu’elles ne suivent
pas la même numérotation. Aucune « version globale » artificielle n’est attribuée
aux composants.

## Structure retenue

- résumé général et prochaine étape en tête ;
- tableau maintenable des composants, versions et ports ;
- section Proto05 prioritaire séparant vérifié, provisoire et à faire ;
- liste courte des données et services à préserver ;
- datation explicite des dernières validations, sans les présenter comme
  rejouées ;
- travaux différés et hors périmètre regroupés sans roadmap détaillée ;
- liens vers les rapports pour l’historique.

## Contrôles effectués

- vérification de l’existence des sources et liens locaux ;
- comparaison des versions de `server.js` et `package.json` ;
- vérification de la constante de contrat Dico-IC ;
- contrôle des ports et de l’ordre du launcher à partir de la documentation
  d’architecture et de lancement actuelle ;
- vérification que `STATUS.md` et le rapport 030 sont les seuls nouveaux fichiers
  de cette mission ;
- contrôle d’espaces des deux nouveaux fichiers ;
- `git diff --check`.

Aucun serveur, navigateur, conteneur, endpoint, test applicatif, migration,
launcher ou script SQL n’a été exécuté.
