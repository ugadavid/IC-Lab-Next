# Mission 163 — Audit du cycle de suppression de la vidéothèque Proto05

## Périmètre et méthode

Audit strictement en lecture seule des deux assets intitulés « 1. GT01_RFC7_reu1_09m05-12m09 » et « 2. GT01_RFC7_reu1_14m34-18m », de leurs relations MariaDB, de leurs fichiers physiques, des projections HTTP et des interfaces de la vidéothèque.

Aucune route `DELETE`, aucune procédure d'écriture, aucun téléchargement, aucun déplacement et aucune réparation de fichier n'ont été exécutés. Aucun serveur n'a été démarré ou redémarré. Les contrôles ont utilisé l'instance Proto05 déjà active, des requêtes SQL `SELECT`/`SHOW`, des lectures du système de fichiers, SHA-256, FFprobe, des requêtes HTTP de lecture et une inspection visuelle non destructive.

La version observée dans l'interface est `0.1.55`; elle reste inchangée.

## Conclusion exécutive

Les deux cas ne relèvent ni d'un fichier partagé ni d'une même corruption.

1. La vidéo 1 possède toujours en MariaDB une source et un playable de copie de travail déclarés `available`, avec taille, empreinte et métadonnées FFprobe, mais son dossier physique entier est absent. Son URL locale répond `404`. La fiche combine donc une copie logique présente et une copie physique absente.
2. La véritable copie de travail de la vidéo 2 est saine et lisible : fichier présent, taille et SHA-256 conformes, conteneur MP4 H.264/AAC valide, HTTP Range fonctionnel et lecteur navigateur à `readyState 4`. Deux de ses trois dérivations sont toutefois absentes du disque tout en restant déclarées `available`. La fiche prend en plus l'une de ces dérivations manquantes comme résumé technique principal, ce qui donne une impression globale de média corrompu.
3. La suppression de la copie de travail de la vidéo 1 échoue fonctionnellement parce que la fiche affiche l'action depuis la collection logique `versionsAndAccess`, tandis que son gestionnaire recherche la copie dans `localCopies`, collection limitée aux fichiers effectivement présents. Il ne trouve rien et retourne silencieusement. Un appel direct serait ensuite refusé car le fichier est introuvable.
4. La suppression de la copie de travail de la vidéo 2 est légitimement bloquée par une activité brouillon qui référence exactement cette copie. Le message est néanmoins trompeur : il évoque indifféremment une utilisation ou un partage alors qu'aucune référence de stockage partagée n'existe.
5. Le retrait complet depuis les cartes de la vidéothèque est cassé pour tout asset autorisé par le préflight : le client omet le header `If-Match` obligatoire et obtient nécessairement `428 PROTO05_REVISION_REQUIRED`. La fiche détaillée envoie, elle, le bon témoin de révision.
6. Le retrait complet de la vidéo 2 est actuellement protégé par une dépendance légitime : une activité et trois traitements terminés. Un plan d'anonymisation audio et ses deux passages constituent en outre une dépendance SQL non affichée par le préflight. La procédure canonique de suppression ne nettoie pas ce plan et rencontrerait ensuite une contrainte `RESTRICT`.
7. À l'échelle du catalogue, aucun stockage partagé, aucun fichier physique non référencé et aucune opération de stockage ouverte n'ont été trouvés. En revanche, trois playables des deux assets cibles sont faussement `available` alors que leur fichier manque. Les quatre autres fichiers manquants du catalogue sont déjà correctement qualifiés `missing-local` / `missing-file`.

## Cartographie exacte des deux assets

### Vidéo 1

Asset : `media-proto05-remote-ref-40a71fc0179ee61ada88dbd7`.

| Élément | Identifiant / valeur | État constaté |
|---|---|---|
| Asset | identifiant ci-dessus | actif, racine de famille, aucune activité, aucun traitement |
| Playable par défaut | `video-media-proto05-remote-ref-40a71fc0179ee61ada88dbd7` | HLS distant, déclaré disponible |
| Source locale | `source-media-proto05-remote-ref-40a71fc0179ee61ada88dbd7-download-95ea7569b657cb58` | rôle `working-copy`, présente en MariaDB |
| Playable local | `video-media-proto05-remote-ref-40a71fc0179ee61ada88dbd7-download-95ea7569b657cb58` | `available`, analyse `complete`, présent en MariaDB |
| Stockage attendu | `media-proto05-remote-ref-40a71fc0179ee61ada88dbd7/source/95ea7569b657cb58-1.-GT01_RFC7_reu1_09m05-12m09.mp4` | dossier d'asset et fichier absents |
| Témoin technique | 53 867 437 octets; SHA-256 `95ea7569b657cb58ecd79304664ac446adf283cfbb3cf20cd7791cb0d2eef09d` | valeurs MariaDB uniquement; impossible de revérifier le fichier absent |
| Activités | aucune | aucune ligne `activity_media_links` |
| Traitements / plans audio | aucun | aucune dépendance trouvée |
| Stockage partagé | aucun | clé et digest non réutilisés |
| Opérations de stockage | aucune | aucun historique disponible |

Le rapport 162 atteste que le même fichier était présent et validé juste après la recette HLS. L'état actuel prouve sa disparition ultérieure, mais ni MariaDB ni le dépôt ne conservent un journal des suppressions physiques permettant d'établir quand, par quel parcours ou par quel acteur elle s'est produite. L'audit établit donc la cause immédiate de l'illisibilité — fichier absent — sans attribuer de responsabilité historique.

### Vidéo 2

Asset : `media-proto05-remote-ref-03738b8065e1866b8e956819`.

| Élément | Identifiant / valeur | État constaté |
|---|---|---|
| Asset | identifiant ci-dessus | actif, racine de famille |
| Playable par défaut | `video-media-proto05-remote-ref-03738b8065e1866b8e956819` | HLS distant, déclaré disponible |
| Copie de travail | `video-media-proto05-remote-ref-03738b8065e1866b8e956819-download-47a3e7cf005c9fdc` | fichier présent et lisible |
| Stockage de travail | `media-proto05-remote-ref-03738b8065e1866b8e956819/source/47a3e7cf005c9fdc-yop_macopielocale.mp4` | 108 359 167 octets; empreinte conforme |
| Dérivation visuelle 1 | `video-hls-temporal-derivation-1784996744983-f056bd47` | fichier présent, 29 130 464 octets, empreinte conforme, lisible par FFprobe |
| Dérivation visuelle 2 | `video-hls-temporal-derivation-1784996884534-a240cc7c` | fichier absent, MariaDB encore `available` |
| Dérivation audio | `video-audio-derivation-1785529576378-59a5391d` | fichier absent, MariaDB encore `available` / `complete` |
| Activité | `proto05-draft-1785247841585-6f55d6` — « Activité temporaire » | brouillon non supprimé; lien primaire vers l'asset et la copie de travail |
| Traitements | trois traitements `completed` | deux visuels et un audio, tous reliés en entrée et sortie au même asset |
| Plan audio | `audio-plan-443f28c0849caa368dc139ff` | révision 4, deux passages, lié à la dérivation visuelle présente |
| Stockage partagé | aucun | aucune clé de stockage commune à un autre playable |
| Opérations de stockage | aucune | aucune opération ouverte ou historique sur ces playables |

La copie de travail a été vérifiée de quatre manières concordantes : taille exacte, SHA-256 exact, FFprobe (MP4, H.264 1920×1080 à 60 i/s, AAC, 391,837667 s), puis lecture HTTP `206 bytes 0-1023/108359167`. Dans la fiche, son aperçu atteint `readyState 4`, expose une durée de 391,837667 s et ne produit aucune erreur console. Elle n'est donc pas corrompue dans l'état observé.

Les répertoires des deux dérivations manquantes existent mais sont vides. Le troisième fichier dérivé existe et est sain. Ce mélange explique qu'un contrôle global limité à « au moins un fichier local présent » soit insuffisant.

## Chaîne d'illisibilité et incohérences de projection

### Vidéo 1

MariaDB projette la copie de travail dans `versionsAndAccess.workingCopy` sans vérifier le disque. Parallèlement, `localCopies` est construit uniquement à partir des `storageKey` dont `statSync(...).isFile()` réussit. La fiche utilise ces deux collections pour des responsabilités différentes :

- le compteur, la carte de source, l'URL d'aperçu et le bouton « Supprimer la copie de travail » viennent de `versionsAndAccess` ;
- le gestionnaire de suppression recherche ensuite le playable dans `asset.localCopies` ;
- `localCopies` étant vide, le gestionnaire retourne sans requête ni message ;
- l'aperçu crée malgré tout un lecteur sur l'URL absente, annonce « Aperçu chargé », reste à `readyState 0` et l'endpoint répond `404` ;
- la même fiche affiche simultanément « 1 copie de travail » et « Aucun fichier local présent » ;
- `download.canDownload` redevient vrai parce qu'il dépend de `localCopies.length === 0`, alors qu'une ligne `working-copy` existe déjà en base.

Le contrat logique et l'état physique sont donc tous deux connus, mais leur divergence n'est pas représentée par un état utilisateur cohérent.

### Vidéo 2

`technicalSummary` sélectionne le premier playable portant des métadonnées techniques, indépendamment de l'existence du fichier. Dans l'ordre actuel, il retient la dérivation audio absente. La fiche résume donc le nom, la taille et l'empreinte d'un fichier manquant tout en déclarant « Fichier local présent » parce que deux autres fichiers de l'asset existent.

Les cartes affichent actuellement « Utilisée : 1 » et la fiche « 1 activité(s) utilisent cette vidéo », avec le nom de l'activité temporaire. L'affirmation « aucune activité » n'est donc pas reproductible avec l'état courant. Elle a pu correspondre à un écran antérieur ou à la vidéo 1, mais le canon observé aujourd'hui contient bien la dépendance de la vidéo 2.

## Deux opérations de suppression, deux contrats

### Supprimer une copie de travail

La route ciblée conserve l'asset, la référence distante et les dérivations. Elle doit retirer un seul fichier, son playable et, s'il n'est plus utilisé, sa source.

Le serveur contrôle actuellement :

- une activité pointant vers le playable exact, ou vers l'asset sans playable explicite ;
- une autre référence utilisant exactement la même clé de stockage ;
- un traitement actif (`queued`, `running`, `cancelling`) utilisant ce playable comme entrée ;
- la présence d'un fichier ordinaire avant toute suppression.

Il sauvegarde le fichier dans le répertoire temporaire système, supprime l'original, persiste MariaDB, restaure le fichier si la persistance échoue, puis retire les répertoires redevenus vides après succès. Cette atomicité entre base et disque reste compensatoire, et non une transaction unique.

Deux lacunes sont démontrées :

1. une copie déjà absente ne peut pas être nettoyée du registre ;
2. les traitements terminés ne sont pas déclarés comme conflits de la copie de travail, alors que le validateur canonique interdit de retirer leur playable source. Après retrait de l'activité de la vidéo 2, la suppression resterait donc incohérente ou échouerait plus tard avec une erreur de validation moins utile.

Pour la vidéo 2, le refus actuel protège bien l'activité temporaire. Il ne protège pas un fichier partagé : le nombre de références partagées est zéro.

### Retirer entièrement un média de la Library

Le préflight de l'asset bloque les activités, les assets enfants, tous les traitements quel que soit leur statut, les incohérences internes et, pour une suppression physique, les clés partagées. Le retrait catalogue enlève asset, sources, playables et traitements de MariaDB, mais ne supprime aucun fichier physique. La variante physique exige un unique fichier local géré.

Pour un asset hybride HLS + fichiers locaux comme les vidéos 1 et 2, l'interface ne propose pas le retrait physique complet. Un retrait catalogue autorisé laisserait donc intentionnellement les fichiers sur disque. Sans procédure de nettoyage ultérieure, ces fichiers deviendraient orphelins après disparition de leurs références.

La carte de la vidéothèque appelle le `DELETE` sans `If-Match`, alors que le serveur exige le témoin `media-deletion`. Tout retrait autorisé depuis cette surface échoue avant écriture avec `428 PROTO05_REVISION_REQUIRED`. La fiche détaillée transmet correctement `asset.deletionRevisionToken`.

Pour la vidéo 2, le préflight bloque avant cet appel et protège une activité plus trois traitements terminés. Le panneau d'usage les affiche aujourd'hui. Pour la vidéo 1, le préflight catalogue est `allowed`; le défaut `If-Match` explique le refus depuis la carte. Le parcours détaillé devrait, d'après le code et le préflight observés, permettre un retrait catalogue avec le bon témoin; il n'a pas été exécuté afin de préserver les données.

## Frontière Node / procédure MariaDB

`sp_media_asset_delete` applique une transaction, refuse une activité active, un asset enfant ou un traitement actif, puis supprime les traitements terminés, les opérations de stockage, les liens média, les playables, les sources et l'asset.

Trois écarts doivent être traités avant de considérer ce cycle canonique :

- le préflight Node bloque tous les traitements, tandis que la procédure n'interdit que les traitements actifs et supprime les autres ;
- le préflight n'inventorie pas `media_audio_anonymization_plans` ;
- la procédure ne supprime pas le plan audio ni ses passages. La contrainte composite du plan vers le playable source est `ON DELETE RESTRICT`; la suppression de la vidéo 2 échouerait donc lors du retrait des playables même après résolution des dépendances visibles.

Cette dernière relation est légitime mais invisible. Elle requiert une règle métier explicite : conserver le plan en interdisant la suppression, ou supprimer plan et passages dans une cascade contrôlée. Le présent audit ne choisit pas cette règle.

## Portée dans le reste du catalogue

Inventaire observé : 14 playables actifs avec `storageKey`, 7 fichiers physiques et aucune clé partagée.

| État | Nombre |
|---|---:|
| Playables avec fichier présent | 7 |
| Playables avec fichier absent | 7 |
| Absences déjà correctement marquées `missing-local` / `missing-file` | 4 |
| Absences encore faussement marquées `available` | 3 |
| Fichiers physiques sans référence MariaDB | 0 |
| Clés partagées entre playables | 0 |
| Opérations de stockage ouvertes | 0 |

Les trois faux `available` sont exactement la copie de travail de la vidéo 1 et les deux dérivations manquantes de la vidéo 2. Le défaut de projection et de nettoyage peut néanmoins affecter tout futur playable dont le fichier disparaît hors du parcours de réconciliation. Le défaut `If-Match` de la grille affecte, lui, tout asset dont le retrait catalogue est autorisé.

## Causes établies et niveau de certitude

| Question | Conclusion | Certitude |
|---|---|---|
| Pourquoi la vidéo 1 locale est illisible ? | Le fichier et le dossier d'asset sont absents alors que MariaDB conserve un playable `available`. L'URL répond `404`. | établie |
| Pourquoi la vidéo 2 locale est illisible ? | La copie de travail n'est pas illisible : elle est saine et lue par le navigateur. Deux dérivations annoncées disponibles sont absentes, et le résumé technique privilégie l'une d'elles. | établie |
| Pourquoi la copie 1 ne se supprime pas ? | Collection d'affichage logique différente de la collection physique utilisée par le handler; retour silencieux, puis fichier absent si la route est appelée directement. | établie |
| Pourquoi la copie 2 ne se supprime pas ? | Une activité brouillon référence exactement son playable. Le message « utilisée ou partagée » est trop générique; aucun partage n'existe. | établie |
| Pourquoi le retrait complet 1 échoue depuis la grille ? | `If-Match` obligatoire non envoyé. | établie par le code; route destructive non appelée |
| Pourquoi le retrait complet 2 échoue ? | Activité et trois traitements visibles bloquent le préflight. Un plan audio invisible bloquerait aussi la procédure plus tard. | établie |
| Qui ou quoi a supprimé les trois fichiers ? | Aucun historique de suppression physique ou `storage_operations` ne permet de l'établir. | indéterminable avec les témoins actuels |

## Plan de correction proposé

### Priorité 1 — Rendre le diagnostic et les préflights exacts

1. Projeter séparément « ligne locale enregistrée » et « fichier présent » pour chaque playable, sans masquer la ligne quand le fichier manque.
2. Afficher `missing-local` / `missing-file` et une erreur d'aperçu réelle au lieu de « Aperçu chargé ».
3. Calculer le résumé technique depuis un playable existant ou afficher explicitement que le playable résumé est absent.
4. Faire envoyer le `deletionRevisionToken` par la grille, comme le fait déjà la fiche.
5. Renvoyer et afficher les conflits par type et par identifiant : activité, traitement, plan audio, asset enfant, partage. Ne jamais mentionner un fichier partagé lorsque la liste est vide.
6. Compléter le préflight de copie avec tous les traitements qui référencent son playable, pas seulement les traitements actifs.

### Priorité 2 — Fermer le contrat de suppression

Décisions humaines requises avant implémentation :

- le devenir des traitements terminés lors du retrait d'un asset ;
- le devenir d'un plan audio et de ses passages ;
- la sémantique du retrait catalogue d'un asset possédant plusieurs fichiers : conservation assumée, quarantaine, ou suppression physique complète ;
- la place de l'archivage, présenté par le modèle comme opération normale, face à la suppression définitive.

Après arbitrage, créer une migration additive — sans modifier les migrations historiques — pour aligner `sp_media_asset_delete` et, idéalement, introduire une procédure ciblée de retrait de copie de travail. La procédure doit accepter une copie dont le fichier est déjà absent, nettoyer uniquement ses relations MariaDB prouvées, et distinguer « retrait de l'enregistrement » de « suppression physique ».

Le parcours fichier doit conserver une compensation vérifiable : témoin avant mutation, quarantaine ou sauvegarde temporaire, écriture MariaDB transactionnelle, relecture, suppression finale, restauration sur échec et élagage borné des répertoires vides. Une destination partagée ou ambiguë doit rester bloquée.

### Priorité 3 — Réconciliation ciblée des données

Après dump MariaDB et témoin des trois chemins :

1. décider si les trois fichiers absents doivent être restaurés depuis une sauvegarde connue ou si leurs playables doivent être qualifiés `missing-local` / `missing-file` ;
2. pour la vidéo 1, si le fichier n'est pas restauré, retirer transactionnellement la source et le playable de copie de travail tout en conservant la référence HLS ;
3. pour la vidéo 2, faire arbitrer par David l'activité temporaire : la conserver, la réassocier ou la supprimer via son parcours normal ;
4. conserver le fichier de travail et la dérivation visuelle dont taille et empreinte sont conformes ;
5. réconcilier seulement les deux sorties dérivées manquantes, puis traiter leurs traitements et le plan audio selon la règle retenue ;
6. contrôler après coup cardinalités, références, disponibilité, API, aperçus, suppression ciblée, redémarrage et absence de fichiers orphelins.

Aucune synchronisation globale ni reconstruction depuis un snapshot ne se justifie.

### Priorité 4 — Tests de non-régression

Ajouter des scénarios isolés couvrant :

- copie enregistrée mais fichier absent : affichage explicite et nettoyage du registre sans faux succès ;
- copie réellement présente : Range, aperçu, suppression et nettoyage du dossier ;
- activité liée au playable exact ;
- traitements actifs et terminés en entrée ou sortie ;
- plan audio et passages ;
- clé réellement partagée ;
- retrait depuis la grille avec `If-Match`, conflit obsolète et réussite ;
- asset hybride avec plusieurs fichiers et politique physique décidée ;
- rollback base/fichier et absence d'orphelins.

## Contrôles réalisés

- lecture des instructions, du modèle média, du serveur, du writer et des deux interfaces ;
- lecture SQL ciblée de tous les assets, sources, playables, métadonnées, liens d'activité, traitements, plans audio, opérations de stockage et contraintes concernés ;
- comparaison des 14 `storageKey` actifs avec les deux racines physiques ;
- recherche des clés partagées et des fichiers non référencés ;
- stat, SHA-256 et FFprobe des deux fichiers présents de la vidéo 2 ;
- HTTP complet et Range sur la copie de travail 2; `404` confirmé sur la copie 1 ;
- inspection visuelle des cartes et des deux fiches ;
- aperçu navigateur de la copie 2 (`readyState 4`, durée correcte, aucune erreur console) ;
- aperçu de la copie 1 (`readyState 0`) et confirmation HTTP indépendante du fichier absent ;
- aucune mutation applicative ou MariaDB.

## Éléments non vérifiés et limites

- Les actions de suppression n'ont volontairement pas été déclenchées, même lorsqu'un échec préalable était prévisible.
- Aucun témoin disponible ne permet d'attribuer historiquement la disparition des fichiers.
- Les sources HLS distantes n'ont pas été retéléchargées ni revérifiées : le périmètre concernait les copies locales et la suppression.
- Le comportement après une future migration corrective reste à valider sur des fixtures avant toute réconciliation réelle.
- La validation humaine de David reste distincte de cet audit.

## État Git et restitution

Le dépôt était déjà modifié par la Mission 162 au début de l'audit. Ces changements ont été préservés et ne font pas partie de la Mission 163. Le seul fichier créé ici est :

`reports/163_proto05_media_library_deletion_cycle_audit_report.md`

Aucun commit et aucun push n'ont été effectués. Proposition de message si ce rapport documentaire est commité séparément :

```text
docs(proto05): auditer le cycle de suppression de la vidéothèque
```
