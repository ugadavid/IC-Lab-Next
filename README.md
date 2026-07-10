# IC-Lab-Next

IC-Lab-Next est le workspace de développement consolidé actuel d’IC-Lab, un
laboratoire de prototypage pédagogique consacré à l’intercompréhension.

Le dépôt rassemble les prototypes actifs dans une racine Git unique. Il vise un
état courant utile au développement ; l’ancien workspace `IC-Lab` reste
l’archive historique complète des étapes précédentes.

## Composants actifs

### IC-Lab Hub

[`prototypes/00-ic-hub`](prototypes/00-ic-hub/) est le portail local de
présentation, d’accès et de lancement des prototypes. Sa racine sert de portail
de démonstration vers les cinq destinations actives ; les parcours authentifiés
de comptes, cours et activités restent disponibles séparément.

- [Guide du serveur](prototypes/00-ic-hub/server/README.md)
- [Guide de maintenance de l’administration IA](prototypes/00-ic-hub/docs/ai-admin-maintainer-guide.md)

### Vidéo augmentée d’intercompréhension

[`prototypes/05-augmented-ic-video-01`](prototypes/05-augmented-ic-video-01/)
explore l’annotation et l’observation multimodale de situations orales.

- [Présentation du prototype](prototypes/05-augmented-ic-video-01/README.md)
- [Démonstrateur courant](prototypes/05-augmented-ic-video-01/index-0.0.6.html)

### Agent vocal IC

[`prototypes/06-voice-agent-ic`](prototypes/06-voice-agent-ic/) explore les
interactions orales, les agents participants et la composition d’activités.

- [Présentation du prototype](prototypes/06-voice-agent-ic/README.md)
- [Bibliothèque d’activités](prototypes/06-voice-agent-ic/library-1.1.html)
- [Guide du serveur local](prototypes/06-voice-agent-ic/server/README.md)

### Informaticaire

[`prototypes/07-informaticaire`](prototypes/07-informaticaire/) est un
prototype de mémoire, de documentation et de retrouvabilité des ressources
d’intercompréhension.

- [Présentation du prototype](prototypes/07-informaticaire/README.md)
- [Démonstrateur](prototypes/07-informaticaire/index.html)

Les documents privés d’entretien restent hors du dépôt. Le fichier `data.js`
contient le corpus de démonstration actuellement utilisé par l’interface et
doit faire l’objet d’une décision de gouvernance distincte avant toute
transformation de ses données dérivées d’entretiens.

### Dico-IC / Seven Sieves

[`prototypes/08-dico-seven-sieves`](prototypes/08-dico-seven-sieves/) réunit le
service de connaissances plurilingues Dico-IC, son administration et le
prototype Seven Sieves.

- [Index documentaire](prototypes/08-dico-seven-sieves/docs/docs-index.md)
- [Démarrage local](prototypes/08-dico-seven-sieves/docs/dico-local-development-startup.md)
- [Seven Sieves](prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/)

La canonicalisation des scripts SQL et l’initialisation fiable d’une base
fraîche restent des chantiers futurs. Aucun choix de source SQL n’est arrêté par
le présent dépôt fondateur.

## Hors périmètre

Boost Hyper Engine (BHE) reste volontairement en dehors de ce dépôt. Les anciens
prototypes racine 01 à 04 ne font plus partie du périmètre actif ; Seven Sieves
reste toutefois présent à l’intérieur du composant Dico-IC.

## Démarrage rapide sous Windows

Double-cliquer sur [`START_IC_LAB_NEXT.bat`](START_IC_LAB_NEXT.bat) pour lancer
les services locaux disponibles et ouvrir le portail Hub. Les lanceurs ne font
ni installation npm, ni migration, ni initialisation de base. Les instructions
d’arrêt sûr sont dans le [guide Windows](scripts/windows/README.md).

## Provenance

La consolidation et ses limites sont résumées dans
[`docs/WORKSPACE_PROVENANCE.md`](docs/WORKSPACE_PROVENANCE.md).

## Données locales

Les secrets `.env`, dépendances, sessions, traces d’exécution, sauvegardes,
bases locales, journaux et documents privés sont exclus par le `.gitignore`
racine. Les fichiers `.env.example` peuvent être suivis lorsqu’ils ne contiennent
que des valeurs d’exemple.
