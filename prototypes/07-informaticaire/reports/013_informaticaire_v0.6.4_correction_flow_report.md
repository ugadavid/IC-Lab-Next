# Rapport 013 - Informaticaire v0.6.4 correction de fiches

## Objectif

Ajouter un flux leger `Proposer une correction` depuis les fiches detaillees, sans backend et sans transformer Informaticaire en outil d'edition directe.

Le principe retenu : une correction prepare un brouillon JSON local, relu humainement avant toute integration dans les donnees.

## Fichiers modifies

- `index.html`
- `styles.css`
- `script.js`

## Comportement ajoute

Dans chaque fiche detaillee, un bouton `Proposer une correction` est maintenant affiche.

Au clic :

- la fiche detaillee est fermee ;
- la page defile vers la section `Contribuer` ;
- le formulaire existant est pre-rempli avec `type = correction` ;
- la fiche concernee est selectionnee automatiquement ;
- le champ `Champ concerne` est initialise sur `description` ;
- la valeur actuelle est pre-remplie depuis la description de la fiche ;
- une remarque structuree est preparee pour aider la personne contributrice.

La section `Contribuer` precise desormais qu'une correction n'est pas appliquee automatiquement et qu'elle produit un brouillon relu humainement avant integration.

Le formulaire contient maintenant des champs adaptes aux corrections :

- champ concerne ;
- valeur actuelle ;
- correction proposee ;
- justification ;
- niveau de certitude ;
- contact facultatif.

Une section courte `Corrections a relire` affiche le dernier brouillon de correction prepare.

Un statut d'export du brouillon de contribution confirme le fichier genere.

## Structure du brouillon correction

Pour une correction, le brouillon JSON contient :

```json
{
  "type": "correction",
  "target": "sandra",
  "targetTitle": "Sandra Garbarino",
  "field": "description",
  "currentValue": "Valeur actuelle...",
  "proposedValue": "Correction proposee...",
  "reason": "Justification...",
  "confidence": "a verifier",
  "contact": "a completer",
  "createdAt": "2026-07-03T14:15:03.284Z"
}
```

Pour les autres types de contribution, le brouillon existant reste conserve avec `note`, `confidence`, `contact` et `nextStep`.

## Verifications effectuees

Verifications syntaxiques :

- `node --check prototypes/07-informaticaire/script.js`
- `node --check prototypes/07-informaticaire/data.js`

Verifications navigateur :

- ouverture de la fiche `Sandra Garbarino` ;
- clic sur `Proposer une correction` ;
- verification du pre-remplissage du formulaire :
  - `type = correction` ;
  - `target = sandra` ;
  - `field = description` ;
  - valeur actuelle pre-remplie ;
- generation d'un brouillon JSON ;
- verification du statut d'export `informaticaire_contribution_sandra.json genere.` ;
- verification de la section `Corrections a relire` ;
- test de la fiche `Galanet` avec pre-remplissage correction ;
- recherche `EuRom 5` : `EuRom / EuRom Web` retourne en premier resultat ;
- filtre `Acteurs` : 32 fiches, avec `Sandra Garbarino` presente ;
- exports existants :
  - `informaticaire_items_v0.6.json genere.` ;
  - `informaticaire_recovery_v0.6.csv genere.` ;
- affichage mobile a 390 px : pas de debordement horizontal ;
- console navigateur : aucune erreur observee.

## Limites restantes

- Les corrections restent locales : il n'y a pas de backend, de compte utilisateur ni de validation automatique.
- Le champ pre-rempli par defaut est `description`, meme si la correction peut ensuite viser un autre champ.
- La section `Corrections a relire` n'affiche que le dernier brouillon prepare pendant la session courante.
- Le brouillon exporte doit encore etre relu et integre manuellement dans `data.js` apres validation communautaire.

## Confirmation de perimetre

La mission 013 a ete realisee uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas ete modifie.

Aucun autre prototype n'a ete modifie.

Les changements preexistants dans `prototypes/00-ic-hub` restent hors perimetre.
