# Mission 247 — Première application Windows de l’Atelier d’anonymisation

David a validé l’extraction 0.1.1 dans Chrome sur CODEX_VM, y compris le premier plan et la reprise clavier après Échap des deux dialogues. Partir de l’extraction au commit 86baf9109c15f3b5f42a659c91e4ed44a23df374. Livrer un installateur Windows x64 réellement essayable par David avant remise à Christian.

## Expérience attendue

Installer par utilisateur, ouvrir « Atelier d’anonymisation » depuis son raccourci dans une fenêtre applicative dédiée, choisir une vidéo, ajuster image et son, enregistrer et rouvrir une variante, exporter un MP4 vers la destination choisie. Fonctionner hors ligne dès l’installation, sans console à lancer, navigateur à choisir, dépendance à installer à la main, dépôt ni services IC-Lab. À la fermeture libérer les ressources ; protéger le travail et traiter explicitement un export en cours.

## Réalisation

Réutiliser l’interface, le moteur, les contrôles d’export et le format projet existants. Privilégier Electron pour réemployer JS/Node et les dialogues natifs rattachés à la fenêtre ; documenter si un autre hôte Windows s’avère préférable. Conserver l’isolation du rendu et limiter les opérations natives aux besoins de l’atelier. Employer un profil applicatif stable et préserver les variantes nommées existantes sous LOCALAPPDATA, l’import/export JSON v2 et la reprise après relance. Garder la présentation et les raccourcis validés. Les dialogues d’ouverture et de destination doivent prendre le focus et le rendre à l’atelier après Échap.

Travailler sur atelier-anonymisation, dans un périmètre autonome et transférable pour la future application. Le site et son ancien éditeur restent hors périmètre. Livrer les outils de rendu avec l’installation ; vérifier la provenance, la configuration de compilation et les conditions de redistribution des binaires effectivement retenus, fournir les notices et éléments associés. Ne pas supposer que le build présent sur la VM est distribuable tel quel. Conserver une construction reproductible depuis les sources.

## Recette de livraison

Installer depuis le setup produit dans un environnement Windows de test hors du dépôt. Écarter toute résolution accidentelle vers le Node de développement ou les FFmpeg du PATH et de C:\Tools ; relever les exécutables réellement utilisés. Depuis le raccourci, ouvrir un média de test H.264/AAC, créer deux variantes, fermer, rouvrir, exporter et lire le fichier hors de l’application. Vérifier flou, coupure et retour du son, intégrité de l’original, dialogue au premier plan et clavier après annulation. Distinguer ce qui a été observé dans la version installée des essais en développement ou des limites de session.

Déposer setup, SHA-256 et mémo court dans C:\Users\codex\Documents\Livraisons\Anonymiseur-<version>-ZI\. Remettre le chemin exact à David pour essai ; aucun envoi à Christian. Sources, configuration de build, notices et rapport reports/247_application_windows_anonymiseur_report.md dans Git ; binaires de livraison hors GitHub. Faire commit et push sur origin/atelier-anonymisation, vérifier les livrables publiés et le SHA distant, puis transmettre lien du rapport, SHA, chemin du setup et résultat de l’essai. Si livraison partielle, préciser le blocage et les résultats vérifiés ; si le push échoue, indiquer aussi le SHA local.
