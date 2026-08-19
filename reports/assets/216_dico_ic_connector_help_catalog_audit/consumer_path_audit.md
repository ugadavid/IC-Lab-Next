# Audit du chemin consommateur — `connector_help`

Statut : constat technique de Mission 216, en lecture seule, au 2026-08-19.

## Chaîne réellement observée

```text
MariaDB connector_help
  ├─ adminRepository.listConnectorHelps() → GET /admin/connector-helps
  ├─ repository.listConnectorHelps()      → GET /connector-helps
  └─ repository.listValidatedConnectorHelpsForAnalysis()
       → POST /analysis
       → result.pedagogical_enrichments[]
       → session payload
       ├─ enseignant : compte seulement
       └─ apprenant : cartes « Aides à la lecture », masquées par défaut
```

## Contrats par étage

| Étage | Données utilisées | Données écartées / transformées | Observation |
|---|---|---|---|
| Table MariaDB | 12 lignes, ES/FR, cinq fonctions, `VALIDATED` | — | `lexical_entry_id` est nul partout. |
| Dépôt public | lignes validées de la langue source | notes, statut et champs techniques absents | La langue doit être active et documentée. |
| `GET /connector-helps` | expression, fonction, titre, aide, exemple, prudence, source | normalisation, lien lexical, notes, dates absents | Réponse observée : HTTP 200, total 12. |
| `POST /analysis` | expression normalisée, fonction, aide, exemple, prudence | `pedagogical_title` et `source_label` de la ligne ne sont pas propagés | Produit une source générique `connector_help` / `Dico-IC`. |
| Session enseignant | longueur de `pedagogical_enrichments` | contenu détaillé | Affichage d’un compteur seulement. |
| Session apprenant | expression de surface, fonction, aide, exemple, prudence, offsets, jetons | titre pédagogique, identifiant DB et label de source ignorés | Fonction convertie en libellé français par le client. |

## Restrictions de langue

Quatre étages codent actuellement la liste `ES`, `FR` :

- route et validation serveur ;
- dépôt MariaDB ;
- analyse ;
- administration.

Conséquence : insérer seulement des lignes IT/PT/EN ne suffirait pas. Elles resteraient inaccessibles ou non reconnues. La future Mission 217 doit traiter explicitement cette capacité avant toute activation de données.

## Règles de reconnaissance observées

- normalisation NFC, minuscules indépendantes de la locale, espaces périphériques supprimés et espaces internes réduits ;
- accents conservés : `embárgo` ne correspond pas à `embargo` ;
- casse ignorée : `SIN EMBARGO` correspond ;
- plusieurs espaces ou un saut de ligne entre deux mots correspondent ;
- une ponctuation entre les mots d’une expression multi-token empêche la correspondance ;
- la ponctuation avant ou après l’expression ne gêne pas ;
- les expressions les plus longues sont évaluées en premier ;
- un jeton déjà occupé empêche une seconde aide chevauchante ;
- plusieurs occurrences disjointes peuvent chacune produire une aide.

## Cas réel « Sin embargo »

Requête observée :

```json
{
  "source_language": "ES",
  "text": "Sin embargo, la información circula durante la noche."
}
```

Résultat pertinent observé :

```json
{
  "id": "p-0001",
  "type": "connector_help",
  "source": { "kind": "connector_help", "id": 1, "label": "Dico-IC" },
  "expression": "Sin embargo",
  "start": 0,
  "end": 11,
  "token_indexes": [0, 1],
  "discourse_function": "OPPOSITION"
}
```

Le client apprenant vérifie encore que les offsets correspondent exactement au texte et aux limites des jetons. Une aide invalide est ignorée sans casser la session.

## Écart de vocabulaire public

- administration : « Aides discursives » ;
- apprenant : « Aides à la lecture » ;
- table d’administration : fonction brute (`OPPOSITION`, etc.) ;
- référentiel voisin des fonctions : libellé humain (`Opposition`, etc.).

Ce n’est pas un défaut d’exécution, mais une incohérence de présentation à arbitrer.

## Séparation avec Seven Sieves

Les aides sont transportées dans `pedagogical_enrichments`, hors de `results` et des sept étapes. Le bouton apprenant est volontaire, masqué par défaut, et n’ajoute pas une huitième étape. Les tests de séparation des rôles couvrent cette frontière.

