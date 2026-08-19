# Inventaire des variantes historiques — Mission 220

Statut : preuves locales observées, distinctes des intentions reconstruites.

## Limite de l’historique disponible

Le dossier `IC-Lab/prototypes/08-dico-seven-sieves` est non suivi dans le dépôt Git historique `IC-Lab`. Il ne fournit donc aucun commit propre à Seven Sieves. Dans `IC-Lab-Next`, le premier commit qui contient la variante est le commit de consolidation `f063ecf` du 2026-07-10. Les dates antérieures ci-dessous sont des métadonnées de fichiers identiques dans les deux arbres, corroborées par les rapports contemporains ; elles ne valent pas preuve de commit.

Les deux copies suivantes sont octet pour octet identiques :

- HTML : 71 555 octets, SHA-256 `506454830353C1BD9C34A7734F6F661CF09ADF032A7EEE727F928841532723B7` ;
- JavaScript : 30 773 octets, SHA-256 `C46006B9BBB3A5557F69AE8F598C437B38E61A88B04AD8800329BC423586A744`.

Chemins comparés :

- `IC-Lab-Next/prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html` ;
- `IC-Lab/prototypes/08-dico-seven-sieves/prototypes/01-seven-sieves/index-api-live-pedagogical-hints-0.1.html` ;
- scripts `js/seven-sieves-tamis4-pedagogical-hint-v0.js` correspondants.

## Chronologie factuelle

| Trace | Preuve | Intention apparente | Comportement réel | État actuel |
|---|---|---|---|---|
| 2026-04-22 — premiers `ic_feature` | `database/seed_data.sql`, lignes 40–42 | Stocker des scores expérimentaux attachés à des formes. | Trois lignes : similarité graphique et transparence. | Toujours en base, jamais consommées par l’analyse. |
| 2026-04-22 — extension V2 | `database/seed_data_v2.sql`, lignes 290–294 | Ajouter transparence et risques de faux amis. | Cinq lignes supplémentaires, dont trois `FALSE_FRIEND_RISK=HIGH`. | Toujours en base ; les risques doublonnent partiellement des relations explicites. |
| 2026-06-21 16:02 — Tamis 4 V0 | `seven-sieves-tamis4-pedagogical-hint-v0-report.md` | Tester un indice local `ñ / gn` sans changer Dico-IC. | Une heuristique locale fusionnée uniquement au rendu, provenance locale visible. | Conservée dans la variante expérimentale, absente du parcours officiel. |
| 2026-06-21 16:14 — Tamis 4 V0.1 | `seven-sieves-tamis4-pedagogical-hint-v0-1-report.md` | Obtenir une démonstration plus représentative. | Quatre règles ES : `ñ`, `-ción`, `-dad`, `-mente`; aucune validation enseignante. | Même variante isolée ; risque de recouvrement avec tamis 3 et règles Dico-IC. |
| 2026-06-21 16:48 — Tamis 6 bloqué | `seven-sieves-tamis6-pedagogical-hint-v0-report.md` | Afficher un pluriel validé sans l’inventer. | Refus d’implémenter tant que le contrat ne transporte pas le mapping `inflected_form`. | Décision méthodologique saine, ensuite débloquée. |
| 2026-06-21 17:00 — Tamis 6 sourcé | `seven-sieves-tamis6-pedagogical-hint-v0-implementation-report.md` | Rendre une connaissance morphologique réellement fournie par l’API. | Déclencheur strict sur `source.kind=inflected_form` et payload pluriel validé. | Principe repris dans l’analyse actuelle ; ce n’est pas un complément hors tamis. |
| 2026-06-21 17:46 — aide discursive locale | `seven-sieves-connector-help-v0-prototype-report.md` | Aider à suivre le raisonnement sans créer de huitième tamis. | Catalogue ES local, contrôle séparé, activé par défaut, aucun `sieve_id`. | Remplacé comme source de vérité par `connector_help`; la variante sait désormais lire l’API. |
| 2026-06-21 18:26 — Connector Help Dico-IC | `dico-connector-help-v0-implementation-report.md` | Partager et administrer les aides hors du frontend. | Table dédiée, routes, analyse et enrichissements transversaux. | Architecture active ; 27 lignes multilingues aujourd’hui. |
| 2026-07-10 — consolidation Git | commit `f063ecf` | Consolider IC-Lab-Next. | Import de la variante et des documents. | Première trace Git disponible, mais pas première trace matérielle. |
| 2026-08-19 — parcours stabilisé | commits `057e9ad`, `9d54eed`, `dfbed23`, `72e9f36`, `44ca8fe` et rapports 214–219 | Séparer les rôles, rendre les aides volontaires, ouvrir cinq langues, sécuriser l’analyse. | Entrée officielle vers l’enseignant, apprenant V0.1.3, aides masquées par défaut, 27 lignes. | État canonique actuel. |

## Ce que contient réellement la variante

### Script historique neutralisé dans le HTML

La page conserve un gros script historique sous :

```html
<script type="text/plain" id="legacy-prototype-script">
```

Il n’est pas exécuté. Il contient un lexique pan-roman, des transformations, huit règles grapho-phonétiques, cinq signaux morphosyntaxiques et des rôles syntaxiques codés par mots. Le commentaire de la page dit explicitement : « Conservé comme référence dans cette copie, mais non exécuté. »

### Script réellement exécuté par la variante

Le fichier `seven-sieves-tamis4-pedagogical-hint-v0.js` :

- appelle réellement `POST /analysis` ;
- ajoute quatre aides locales ES au tamis 4 ;
- marque leur source comme `heuristic` / `Prototype pédagogique local Seven Sieves` ;
- fusionne API et aides locales uniquement pour l’affichage ;
- sait rendre le pluriel validé reçu de `inflected_form` ;
- lit aujourd’hui les `pedagogical_enrichments` `connector_help` de Dico-IC ;
- laisse son contrôle discursif visible et actif par défaut.

### Statut fonctionnel

La variante est encore servable par chemin direct, mais elle n’est plus l’entrée officielle :

- `index-api-live-0.1.html` redirige vers `index-teacher-0.1.html` ;
- les menus d’administration pointent vers cette entrée de compatibilité ;
- les pages officielles enseignant/apprenant ne chargent pas le script des heuristiques locales ;
- la page apprenant officielle n’affiche que les enrichissements API et les aides à la lecture normalisées.

## Conclusion historique

La trace retrouvée ne montre jamais un huitième tamis numéroté. Elle montre deux expérimentations distinctes :

1. enrichir certains tamis existants avec des explications locales ;
2. ajouter une aide discursive transversale explicitement séparée.

La seconde a trouvé une architecture durable dans `connector_help`. La première reste une archive expérimentale non canonique, utile comme preuve de méthode mais impropre à une réactivation silencieuse.

