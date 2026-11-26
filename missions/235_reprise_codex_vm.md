# Mission 235 — Reprise d’IC-Lab-Next sur CODEX_VM

David a cloné le laboratoire sur CODEX_VM. Déterminer quels parcours de démonstration fonctionnent depuis ce clone et retrouver le point de départ de l’anonymiseur vidéo destiné à Christian.

## Recette sur la VM

1. Lire AGENTS.md, STATUS.md, le README et le guide des lanceurs Windows. Relever la branche, le SHA, l’état initial et les prérequis réellement présents. Les rapports 227 à 234 et les guides utilisateurs donnent des parcours témoins.
2. Essayer le démarrage Windows documenté. Les dépendances applicatives prévues peuvent être installées localement dans le clone en conservant les fichiers de verrouillage. Si le lancement global bloque, poursuivre avec les lanceurs isolés après vérification de leurs effets. Laisser les services externes et les données en place.
3. Ouvrir le Hub et essayer ses cinq destinations. Pour chacune, relever l’URL, un geste utilisateur représentatif, le résultat et le niveau de vérification. Tester également l’entrée directe de soutenance de Seven Sieves. Dans Dico-IC, rechercher « information » et ouvrir INFORMATION_DATA si disponible. Documenter le prérequis précis de chaque parcours bloqué. Les secrets .env, données privées, restaurations, migrations et initialisations SQL sont hors périmètre.
4. Retrouver l’entrée de l’anonymiseur vidéo, ses fichiers principaux et les indices qui établissent leur rôle. Vérifier son ouverture si possible. Si le clone contient seulement une référence ou une partie du module, préciser la pièce manquante. L’extraction et le développement de l’application autonome feront l’objet d’une décision ultérieure.
5. Arrêter les services démarrés pour la recette avec les mécanismes documentés. Vérifier l’état final du clone.

## Restitution

Rédiger un rapport court dans reports/ suivant AGENTS.md, en vérifiant le prochain numéro disponible juste avant l’écriture. Commencer par les gestes que David peut refaire sur la VM. Inclure les résultats par destination, les limites, les fichiers de l’anonymiseur et le premier fichier à relire. Une recette partielle avec des blocages précisément situés est recevable.

Le rapport est le seul fichier de projet à produire. Les dépendances locales et traces ordinaires du lancement restent dans leurs emplacements prévus. Synchroniser main en préservant le travail local. Faire un commit contenant uniquement le rapport, puis le pousser sur origin/main, même si la recette est partielle ou bloquée. Vérifier sur GitHub que main contient le commit et que le rapport est accessible. Transmettre son lien et le SHA vérifié, puis s’arrêter pour la lecture commune avec David.
