# Provenance du workspace IC-Lab-Next

IC-Lab-Next est la racine de développement consolidée actuelle d’IC-Lab. Le
workspace rassemble plusieurs prototypes auparavant développés progressivement,
parfois dans des dépôts Git distincts.

L’ancien workspace `IC-Lab` demeure l’archive historique complète de cette phase
de travail. IC-Lab-Next constitue désormais une base volontairement nettoyée :
il n’a pas vocation à conserver toutes les copies intermédiaires ni à rester
identique fichier par fichier à l’archive.

Le composant `prototypes/08-dico-seven-sieves`, qui regroupe Dico-IC et Seven
Sieves, provenait initialement d’un dépôt autonome. Ses sources ont rejoint le
workspace consolidé sans conserver son ancien dépôt Git imbriqué.

Tous les anciens dossiers ou fichiers `.git` des prototypes ont été retirés afin
que la racine IC-Lab-Next soit l’unique dépôt Git.

Le périmètre actif comprend :

- `prototypes/00-ic-hub` ;
- `prototypes/05-augmented-ic-video-01` ;
- `prototypes/06-voice-agent-ic` ;
- `prototypes/07-informaticaire` ;
- `prototypes/08-dico-seven-sieves`.

Les anciens prototypes racine `01-seven-sieves`, `02-multilingual-story`,
`03-forgotten-notebook` et `04-false-friends` ne font plus partie de ce
périmètre. Seven Sieves reste actif sous
`prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves`.

Boost Hyper Engine (BHE) reste hors de ce dépôt.

Les fichiers de conception PSD et les PDF privés d’entretien sont conservés hors
du nouveau dépôt. Les secrets et données runtime restent locaux et ignorés.

La canonicalisation des scripts SQL de Dico-IC et l’initialisation vérifiée d’une
base fraîche feront l’objet d’une mission ultérieure. Le dossier
`database/current_draft/` n’est ni déplacé ni déclaré source de vérité par cette
consolidation.
