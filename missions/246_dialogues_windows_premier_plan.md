# Mission 246 — Ouvrir les dialogues Windows devant l’atelier autonome

David a testé la 0.1.0 sur CODEX_VM depuis Chrome via 127.0.0.1:8797. L’atelier fonctionne. Au clic sur Choisir une vidéo et au choix de destination du MP4, le dialogue natif apparaît derrière le navigateur.

Corriger ce comportement dans l’extraction autonome sur atelier-anonymisation. Le script extractions/anonymiseur/choisir.ps1 utilise déjà ShowDialog avec un formulaire propriétaire TopMost ; examiner le lancement et l’activation effective de ce propriétaire. Choisir le correctif minimal fiable qui fonctionne après un clic dans la fenêtre de l’atelier. Le dialogue doit apparaître immédiatement devant cette fenêtre, recevoir les frappes et rendre la main à l’atelier après validation, Annuler ou Échap. Éviter toute fenêtre parasite ou maintien global au premier plan. Préserver les noms, filtres, chemins renvoyés et le comportement de l’export. Le site reste hors périmètre.

Tester par l’entrée utilisateur dans Chrome sur Windows (Edge si disponible) : première ouverture, annulation et réouverture, choix du média, choix et annulation de destination puis export réel. Observer l’ordre des fenêtres et le focus dès le clic, avant toute intervention manuelle. Si la session empêche cette observation, rapporter les contrôles effectués et la courte recette restante sur CODEX_VM.

Livrer le correctif et reports/246_dialogues_windows_premier_plan_report.md. Faire commit et push sur origin/atelier-anonymisation, vérifier les livrables et le SHA distant, transmettre le lien du rapport et le SHA puis s’arrêter pour validation. En cas de blocage du push, communiquer la cause et le SHA local.
