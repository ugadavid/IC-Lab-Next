# Rapport 234 - Guide de prise en main IC-Hub

Date : 9 septembre 2026.

## Périmètre et résultat

Mission documentaire : guide du portail pour les enseignants et professionnels, avec capture réelle et tableau besoin / outil / accès. Les étudiants sont orientés par l’enseignant vers leur parcours et leur guide ; Dico-IC reste exclusivement destiné au public professionnel. Aucun parcours historique de comptes, cours ou suivi n’est documenté.

Créations :

- `docs/utilisateurs/ic-hub/guide-utilisateur.md`
- `docs/utilisateurs/ic-hub/guide-utilisateur.pdf` : **2 pages**
- `docs/utilisateurs/ic-hub/images/accueil.png`
- `docs/utilisateurs/ic-hub/note-validation.md`
- Le présent rapport.

Retouche autorisée : `docs/utilisateurs/informaticaire/guide-utilisateur.md` et son PDF, **5 pages**. La page 4 invite à lire « Depuis cette fiche » et « Vers cette fiche » dans le panneau pour connaître le sens d’une relation, plutôt que l’orientation des flèches. L’explication précédente a été remplacée sans répétition. Images et autres pages préservées.

## Contrôles et faits observés

- Lecture des instructions, de la documentation actuelle et du code du portail effectivement servi : `/portal-0.10.4.html`. Les anciennes pages historiques n’ont pas servi de base au guide.
- Recette interactive des **neuf liens vers les cinq démonstrateurs** : cinq entrées Vidéo augmentée, Agent vocal, Informaticaire, Dico-IC et Seven Sieves. Toutes les pages de destination sont accessibles et affichent leur interface. Seven Sieves redirige vers la préparation enseignant. Le retour dans l’historique fonctionne dans le même onglet. Destinations exactes et résultats détaillés dans la note de validation.
- Capture Chromium réelle à 1280 pixels de largeur et haute densité ; raccord de deux zones contiguës aux coordonnées originales pour couvrir les cinq cartes, sans réécriture de l’interface.
- Rendu puis inspection visuelle de **toutes les 7 pages** : lisibilité des captures, légendes, tableau, marges et absence de débordement. Informaticaire : pages 1, 2, 3 et 5 identiques pixel par pixel aux rendus antérieurs.
- Concordance exacte des textes Markdown/PDF sur les 7 pages, hors mise en forme, pieds de page et texte des captures.
- Six noms de guides et chemins PDF vérifiés, y compris les liens relatifs insérés dans le PDF.
- Comparaison SHA-256 : seuls les deux fichiers Informaticaire autorisés ont changé parmi les guides préexistants ; les **36 autres fichiers** sont inchangés. Aucun changement suivi par Git ; les guides et rapports précédemment non suivis sont préservés.

## Limites et suite

Les URL publiques et les modalités d’accès restent à compléter. Aucun accès de démonstrateur indisponible lors du contrôle local ; ce résultat ne préjuge pas de leur disponibilité future. Le lien historique « Mon espace local » n’a pas été ouvert. Pas de contrôle complet des fonctions internes, d’audit des liens externes, de lancement d’activité vocale ou de campagne générale de tests. L’ouverture des liens relatifs dans tous les lecteurs PDF n’a pas été testée ; conserver l’arborescence de livraison.

Les badges de versions historiques visibles sur l’accueil ont été conservés dans la capture sans être présentés comme les versions actuelles des outils. Aucun guide utilisateur dédié à l’Agent vocal n’est présent dans la collection ; le lecteur est invité à demander les consignes de démonstration.

**Versions applicatives inchangées** ; portail observé V0.10.4. Aucun code, donnée métier, dépendance, configuration ou lanceur modifié. Services disponibles réutilisés, aucun démarrage ni arrêt. Onglet de recette fermé. Aucun accès à Alpaga ou dev-lab, appel payant, commit ou push.

Les contrôles de Codex constituent une recette documentaire, **pas une validation humaine de David**. Suite : validation éditoriale finale et renseignement des accès publics.

Message de commit proposé : `docs(ic-hub): ajouter le guide de prise en main et préciser les relations Informaticaire`
