# Mission 151 — Réconciliation des disponibilités locales de Proto05

Date : 31 juillet 2026

Prototype : `prototypes/05-augmented-ic-video-01`

Version observée et obtenue : **`0.1.48`**, inchangée

## Conclusion

Les trois playables locaux signalés par l'audit 149 ont été réconciliés de
façon ciblée. Chacun possédait un fichier régulier, non vide, situé sous la
racine `workspace` autorisée, dont la taille et le SHA-256 correspondaient aux
métadonnées MariaDB. Leur état canonique est passé de `missing-local` avec la
raison `missing-file` à `available` avec une raison nulle.

La correction ne repose pas sur trois identifiants codés en dur. Un outil de
maintenance explicite produit désormais un plan déterministe en lecture seule,
le ferme au moindre chemin ou contenu incohérent, puis peut l'appliquer sous
transaction et préconditions exactes. Il n'est appelé ni au démarrage ni lors
d'une consultation ordinaire : aucune lecture applicative ne devient une
écriture silencieuse.

Après application, reconnexion, redémarrage et nouveau contrôle physique, les
onze playables locaux sont cohérents : sept fichiers présents sont
`available`, quatre fichiers réellement absents restent `missing-local`, et
aucune autre ligne n'a été modifiée. MariaDB demeure l'unique source de vérité.

## État initial et précaution Git

Le dépôt était initialement propre sur `main`, révision `cdd6fc1`, avec la
Mission 150 commitée et 108 tests de référence.

Pendant la mission, `HEAD` a changé extérieurement vers `911af8a`, commit
attribué par Git à David. Ce commit contient la première version du module, du
CLI, des tests M151 et un script ponctuel d'inspection. Codex n'a créé aucun
commit et n'a effectué aucun push. Le travail local final retire le script
ponctuel, complète la documentation, durcit le verrouillage du témoin de
projection et ajoute le présent rapport. L'historique existant n'a pas été
réécrit.

## Les trois incohérences initiales

Les trois lignes appartiennent au même asset actif
`media-proto05-remote-ref-03738b8065e1866b8e956819`, intitulé `yop`. Leur
clé de stockage est relative ; aucun chemin personnel absolu n'est reproduit.

| Playable et source | Rôle | Clé sous `workspace` | Taille | SHA-256 |
| --- | --- | --- | ---: | --- |
| `video-hls-temporal-derivation-1784996744983-f056bd47` / `source-hls-temporal-derivation-1784996744983-f056bd47` | `derivation-local` | `media-proto05-remote-ref-03738b8065e1866b8e956819/derived/hls-temporal-derivation-1784996744983-f056bd47/e88d23de16134588-anonymized.mp4` | 29 130 464 | `e88d23de161345885ddc9e5c977de96d2f5fafa9dc29d63eab3be8e2e3914823` |
| `video-hls-temporal-derivation-1784996884534-a240cc7c` / `source-hls-temporal-derivation-1784996884534-a240cc7c` | `derivation-local` | `media-proto05-remote-ref-03738b8065e1866b8e956819/derived/hls-temporal-derivation-1784996884534-a240cc7c/f4dd436c50e8bea3-anonymized.mp4` | 27 393 166 | `f4dd436c50e8bea3cbb7704d263dfdc03c1bd94181515c7d0977cef889e2c1f3` |
| `video-media-proto05-remote-ref-03738b8065e1866b8e956819-download-47a3e7cf005c9fdc` / `source-media-proto05-remote-ref-03738b8065e1866b8e956819-download-47a3e7cf005c9fdc` | `working-copy` | `media-proto05-remote-ref-03738b8065e1866b8e956819/source/47a3e7cf005c9fdc-yop_macopielocale.mp4` | 108 359 167 | `47a3e7cf005c9fdc05f8062479714d98fbde9c6c030ba47f923a5cb5dbd753d3` |

Avant toute écriture, SQL et API exposaient pour les trois
`missing-local`/`missing-file`. L'observation bornée du disque a établi pour
chacun : fichier régulier lisible, taille strictement positive, emplacement
dans la racine autorisée, taille exacte et SHA-256 exact. Aucun fichier vide,
incomplet, extérieur à la racine ou d'identité ambiguë n'était présent.

L'asset possède un lien d'activité. Chacun de ces playables est couvert par les
deux traitements associés à cet asset dans l'inventaire large des dépendances.
Les deux premiers sont des sorties de dérivation et le troisième est la copie
locale de travail. L'audit n'a modifié ni ces relations ni les traitements.

## Sémantique canonique retenue

La disponibilité est portée par le **playable**. L'asset porte l'identité et le
cycle de vie ; la source porte la provenance et la localisation. Ni l'un ni
l'autre ne remplace l'état du playable dans cette réconciliation.

| État | Sens et preuve | Comportement API/interface | Réconciliation locale |
| --- | --- | --- | --- |
| `available` | représentation utilisable ; pour `local-file`, fichier régulier non vide sous une racine autorisée et métadonnées techniques concordantes | jouable et actions locales autorisées | conservé si présent ; dégradé si le fichier a disparu |
| `missing-local` | ligne canonique conservée, fichier local absent ; raison obligatoire `missing-file` | ressource structurellement valide mais présentée absente et non jouable localement | restauré si le même fichier valide réapparaît |
| `unreachable-remote` | ressource distante déclarée mais non joignable | indisponibilité distante | jamais résolu comme chemin local |
| `blocked` | usage empêché par un état métier ou technique explicite | action bloquée | préservé |
| `pending` | production ou acquisition non terminée | état d'attente | préservé |
| `unknown` | disponibilité non démontrée | disponibilité non vérifiée | préservé |

Les règles complémentaires sont les suivantes :

- un média HLS, distant ou non géré localement est ignoré par le plan ;
- plusieurs playables partageant légitimement une même portée et clé reçoivent
  la même observation, calculée une seule fois ;
- un traitement peut rester `completed` lorsque son fichier de sortie disparaît :
  le fait historique du traitement n'est pas réécrit, seul le playable devient
  `missing-local` ;
- un répertoire, un fichier vide, une portée inconnue, une clé invalide, une
  taille ou un SHA-256 contradictoire produit un refus global et aucune écriture.

## Origine la mieux démontrable

La migration réelle de la Mission 134 a observé le système de fichiers une
seule fois et a émis sept diagnostics `AVAILABLE_LOCAL_FILE_MISSING`. Elle a
normalisé les fichiers jugés absents en `missing-local`, conformément au
contrat de migration de l'époque. Aucun mécanisme courant ne réobservait
ensuite un fichier restauré ou replacé hors d'un parcours applicatif.

La Mission 145.1 a par ailleurs démontré un cas voisin : un serveur temporaire
ne reproduisait pas la racine `video-library-workspaces`, ce qui faisait voir
une copie locale comme absente. Cette mission avait réparé seulement son témoin
UGA ciblé.

L'audit des producteurs actuels montre que l'import local, la copie distante,
la copie de travail et la dérivation ne publient `available` qu'après
finalisation du fichier et persistance canonique. Aucun scénario reproductible
n'établit un défaut actif de ces parcours. La meilleure explication démontrable
des trois lignes est donc : **observation historique ponctuelle, suivie d'une
présence physique non réconciliée**. La date et le geste exacts de réapparition
des trois fichiers ne peuvent pas être attribués avec certitude et ne le sont
pas dans ce rapport.

## Mécanisme et point d'exécution

`local-media-availability-reconciliation.js` sépare :

```text
lecture des relations MariaDB
→ observation bornée des seules clés déclarées
→ plan stable et hashé
→ validation des refus et des cibles
→ transaction conditionnelle
→ relecture avant commit et après reconnexion
```

Le CLI `scripts/reconcile-local-media-availability.js` utilise par défaut le
mode `--inspect`. Pour appliquer, il exige simultanément le hash, le nombre de
mises à jour, la liste exacte des identifiants, une confirmation littérale et
un fichier témoin créé exclusivement. Il vérifie aussi l'identité et les grants
du compte applicatif sans exposer de secret.

L'application prend le verrou nommé déjà utilisé par le writer Proto05, ouvre
une transaction `SERIALIZABLE`, verrouille le témoin documentaire et les lignes
cibles, contrôle les anciennes valeurs et `updated_at`, recalcule la preuve
physique, exécute des `UPDATE` conditionnels, met à jour le témoin de projection
et relit les résultats avant commit. Toute divergence entraîne un rollback.

Le choix d'une **opération explicite** est intentionnel : une restauration ou
disparition externe n'est pas un parcours applicatif ordinaire. Un scan au
démarrage ou à chaque lecture introduirait des écritures implicites, du coût et
une dépendance au disque dans toutes les consultations. Les producteurs
normaux, eux, continuent de persister directement l'état cohérent au moment où
ils finalisent leur fichier.

## Plan et application réels

Plan validé avant application :

```text
hash               b39ee0a6126086485d2912f9e3bf5933f3fe5c48fb189b42758e7bba6270a7b2
playables totaux   15
playables locaux   11
distants ignorés   4
inchangés          8
à restaurer        3
à dégrader         0
refus              0
```

Les trois identifiants du plan sont exactement ceux de l'audit 149. Aucun
autre asset, source ou playable n'était ciblé.

Un témoin hors dépôt a été créé avant écriture sous le seul nom
`proto05-m151-local-availability-before-20260731.json`. Son SHA-256 est
`b9d00618e309c30e55870c68f41cc690e8b5404f6e114b790f8b91d3e980bc1d`.
Il contient le plan, les anciennes disponibilités, raisons et dates, ainsi que
le témoin `media-library` antérieur. Le mode exclusif refuse de l'écraser.

La transaction a appliqué exactement trois mises à jour. Pour chaque ligne :

```text
missing-local / missing-file
→ available / null
```

L'horodatage commun de mise à jour est `2026-07-31 09:47:48.789` UTC. Les
assets, sources, métadonnées techniques, activités, traitements, tailles,
empreintes et fichiers sont restés inchangés.

Après commit et nouvelle connexion, le plan est idempotent : hash
`ffc2a4e6f69b49d736e54677c7dac4bc1f7bc0a338fe7b2ce07e0748b5ef0078`,
onze playables locaux inchangés, zéro modification et zéro refus.

## Preuves après application

### SQL, API et disque

- SQL relit les trois playables en `available`, raison nulle.
- L'API de l'asset relit les mêmes trois états avant et après redémarrage.
- Un second inventaire des onze fichiers locaux retourne zéro divergence.
- Les quatre anciennes données de développement dont les fichiers sont
  réellement absents restent `missing-local` ; elles n'ont pas été ciblées.
- Une lecture HTTP partielle de chacun des trois playables retourne `206`,
  `video/mp4`, 1 024 octets et une plage cohérente avec sa taille totale.
- Les tailles et SHA-256 recalculés après écriture SQL sont identiques aux
  valeurs d'avant ; aucun média réel n'a été écrit, déplacé ou supprimé.

### Recette Chromium

Recette effectuée dans le navigateur intégré après redémarrage du serveur :

- la vidéothèque enseignante affiche ses neuf cartes sans fausse indication
  locale manquante pour l'asset `yop` ; son playable distant par défaut conserve
  logiquement l'indication de disponibilité non vérifiée ;
- la fiche détaillée de `yop` indique `Fichier local présent` ;
- la copie de travail et les deux dérivations indiquent chacune
  `Fichier local · Disponible` ;
- les actions locales et liens de téléchargement sont proposés ;
- la prévisualisation de la copie de travail charge une image vidéo réelle et
  affiche `Aperçu chargé.` ;
- aucune nouvelle erreur ni aucun avertissement console n'a été observé.

Aucun traitement et aucune suppression n'ont été déclenchés.

## Tests et contrôles

Trois tests purs ont été ajoutés dans le fichier existant de disponibilité :

1. fichier retrouvé, fichier disparu, état déjà cohérent, média distant ignoré,
   déterminisme et idempotence ;
2. clé traversante, portée inconnue et fichier vide : refus global ;
3. stockage partagé : observation et hash calculés une fois, décisions
   cohérentes pour tous les playables.

Un test MariaDB existant a été étendu par un scénario jetable couvrant :

- restauration d'un fichier présent et cohérence API ;
- disparition physique sans suppression SQL ;
- état SQL concurrent entre inspection et application, refusé sans écriture
  aveugle ;
- nouveau plan frais, application, idempotence, redémarrage et nettoyage.

Résultats complets :

```text
11 fichiers de test suivis
112 tests
112 réussis
0 échec
0 ignoré
```

La variation exacte par rapport à 108/108 est de quatre tests : trois tests
purs et un scénario MariaDB transactionnel. Les contrôles de syntaxe Node du
module, du CLI et des deux fichiers de test concernés sont valides.
`git diff --check` est propre.

## Nettoyage et non-altération

Le scénario MariaDB compare ses cardinalités avant/après et supprime son asset,
sa source, son playable, ses métadonnées et son petit fichier jetable. La suite
complète confirme ce nettoyage. La recherche finale ne trouve ni fichier
`mission151`, ni fichier `.m151-away`, ni script d'inspection ponctuel destiné
à rester dans le livrable.

Le témoin hors dépôt de la réconciliation réelle est conservé volontairement :
ce n'est pas une fixture, mais la preuve de retour arrière demandée.

Aucun schéma, migration, JSON, média réel, métadonnée pédagogique, snapshot
transactionnel, registre de migration ou outbox n'a été modifié. Aucun FFmpeg
ou FFprobe n'a été lancé. Aucun fallback JSON n'a été réintroduit.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/server/local-media-availability-reconciliation.js`
- `prototypes/05-augmented-ic-video-01/server/scripts/reconcile-local-media-availability.js`
- `prototypes/05-augmented-ic-video-01/server/test/media-library-availability.test.js`
- `prototypes/05-augmented-ic-video-01/server/test/mariadb-only-runtime.test.js`
- `prototypes/05-augmented-ic-video-01/server/README.md`
- retrait de `prototypes/05-augmented-ic-video-01/server/tmp-m151-inspect.cjs`,
  script ponctuel accidentellement présent dans le nouveau `HEAD`
- `reports/151_proto05_local_availability_reconciliation_report.md`

## Éléments non vérifiés et limites

- La date et l'action humaines exactes ayant replacé ou conservé les trois
  fichiers ne sont pas démontrables rétrospectivement.
- Aucun crash brutal n'a été injecté pendant le commit SQL ; le rollback sur
  erreur et les préconditions ont été testés, pas la perte du processus ou de
  la machine au milieu d'une transaction.
- La recette Chromium de Codex est une preuve technique, pas la validation
  humaine de David.

## Recette humaine minimale laissée à David

1. Ouvrir `/teacher/videos`, puis la fiche de l'asset `yop`.
2. Vérifier `Fichier local présent` et les trois lignes locales marquées
   disponibles.
3. Prévisualiser la copie de travail sans lancer de traitement.
4. Exécuter en lecture seule :
   `node --env-file=../.env.local scripts/reconcile-local-media-availability.js --inspect`.
5. Vérifier que le plan est sûr, sans refus et sans modification proposée.

## Proposition de message de commit

```text
fix(proto05): reconcile canonical local media availability
```
