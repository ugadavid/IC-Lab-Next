# Rapport 014 - Informaticaire v0.6.5 liens externes verifies

## Objectif

Ajouter des liens externes utiles et verifies aux fiches centrales d'Informaticaire, sans importer de contenu externe et sans ajouter de backend.

La mission distingue les types de liens suivants :

- site officiel ;
- page projet ;
- documentation ;
- archive ;
- publication ;
- outil externe ;
- a verifier.

## Fichiers modifies

- `data.js`
- `index.html`
- `script.js`
- `styles.css`

Fichier cree :

- `reports/014_informaticaire_v0.6.5_external_links_report.md`

## Nombre de fiches enrichies

- 19 fiches disposent maintenant d'une structure `externalLinks`.
- 16 fiches contiennent au moins un lien externe.
- 3 fiches sont volontairement conservees sans lien confirme.
- 20 liens externes ont ete ajoutes.

## Liste des liens ajoutes

- `Miriadi` : `https://www.miriadi.net/` - site officiel - accessible.
- `Miriadi` : `https://www.miriadi.net/ressources` - documentation - accessible.
- `Galanet` : `https://web.archive.org/web/20120106192721/http://www.galanet.eu/` - archive - a verifier.
- `Galapro` : `http://arquivo.pt/wayback/20141121121652/http://www.galapro.eu/` - archive - a verifier.
- `Lecturio` : `https://www.miriadi.net/ressources/corpus-contes` - page projet - accessible.
- `ALPAGA` : `https://2jealpaga.sciencesconf.org/` - page projet - accessible.
- `ALPAGA` : `https://www.miriadi.net/blogs/jette-mp/alpaga-2e-journee-d-etudes-12122025-sur-inscription` - page projet - accessible.
- `REPLI4C` : `https://2jealpaga.sciencesconf.org/` - page projet - accessible.
- `APICAD` : `https://www.miriadi.net/` - a verifier - accessible.
- `EuRom / EuRom Web` : `https://www.eurom5.com/` - site officiel - accessible.
- `Romanofonia y Cinema` : `https://2jealpaga.sciencesconf.org/` - a verifier - accessible.
- `Speechmatics` : `https://www.speechmatics.com/` - outil externe - accessible.
- `Speechmatics` : `https://docs.speechmatics.com/` - documentation - accessible.
- `ELAN` : `https://archive.mpi.nl/tla/elan` - outil externe - accessible.
- `NoSketch Engine / KiParla` : `https://www.sketchengine.eu/nosketch-engine/` - outil externe - accessible.
- `NoSketch Engine / KiParla` : `https://kiparla.it/` - page projet - accessible.
- `PHIP - Historias Infantiles Plurilingues` : `https://www.miriadi.net/ressources/corpus-contes` - a verifier - accessible.
- `Itineraires romans` : `http://unilat.org/DPEL/Intercomprehension/Itineraires_romans/fr` - a verifier - a verifier.
- `Ressources UNITA` : `https://univ-unita.eu/` - site officiel - accessible.
- `Evaluation` : `https://www.miriadi.net/ressources/referentiels` - documentation - accessible.

## Liens accessibles

17 liens sont marques `accessible`.

Ils concernent notamment :

- Miriadi ;
- ressources Miriadi ;
- Lecturio / corpus de contes ;
- ALPAGA ;
- REPLI4C via la page ALPAGA ;
- EuRom5 / EuRom Web ;
- ELAN ;
- Speechmatics ;
- NoSketch Engine ;
- KiParla ;
- UNITA ;
- referentiels REFIC / REFDIC.

## Liens a verifier

3 liens sont marques `a verifier` :

- archive Galanet ;
- archive Galapro ;
- ancienne piste `Itineraires romans` de l'Union Latine.

Certains liens accessibles restent aussi classes avec `kind: "a verifier"` lorsqu'ils documentent seulement une piste indirecte :

- APICAD via Miriadi ;
- Romanofonia y Cinema via ALPAGA ;
- PHIP via le corpus de contes Miriadi.

## Liens non trouves

Aucun lien fiable n'a ete ajoute pour :

- `Galatea` ;
- `Elementi di intercomprensione UniTO` ;
- `Portail PLE cite par Katia`.

Pour ces fiches, des `todo` documentaires ont ete ajoutes ou conserves afin de demander un lien officiel, une archive fiable ou une confirmation humaine.

## Choix de fiabilite

Les sources privilegiees sont :

- sites de projet encore vivants ;
- pages institutionnelles ou universitaires ;
- plateformes de conference academique ;
- documentation officielle d'outils ;
- archives web identifiees comme pistes, mais marquees a verifier ;
- pages Miriadi lorsque la ressource appartient clairement a l'ecosysteme Miriadi.

Les liens non confirmes comme officiels n'ont pas ete presentes comme sites officiels. Ils sont soit absents, soit marques `a verifier`.

## Modifications d'interface

Dans la modale de fiche, une section `Liens externes verifies` affiche maintenant :

- label ;
- type de lien ;
- statut ;
- date de verification ;
- note eventuelle.

Les liens s'ouvrent dans un nouvel onglet avec :

```html
target="_blank" rel="noopener noreferrer"
```

La modale affiche aussi un badge leger :

- `Lien verifie` ;
- `Lien a verifier` ;
- `Sans lien`.

Si aucune URL n'est disponible, la modale affiche :

`Aucun lien externe verifie pour le moment.`

## Contribution de lien externe

Le formulaire `Contribuer` permet maintenant de choisir `Ajouter un lien externe`.

Le brouillon JSON produit contient :

```json
{
  "type": "external-link",
  "target": "miriadi",
  "targetTitle": "Miriadi",
  "label": "Site Miriadi",
  "url": "https://www.miriadi.net/",
  "kind": "site officiel",
  "reason": "Lien officiel du projet encore accessible.",
  "confidence": "haute",
  "contact": "a completer",
  "createdAt": "..."
}
```

## Verifications effectuees

Verifications syntaxiques :

- `node --check prototypes/07-informaticaire/script.js`
- `node --check prototypes/07-informaticaire/data.js`

Verifications de donnees :

- 19 fiches avec `externalLinks` ;
- 16 fiches avec au moins un lien ;
- 20 liens ajoutes ;
- tous les liens possedent `label`, `url`, `kind`, `status`, `lastChecked`, `note`.

Verifications navigateur :

- ouvrir fiche `Miriadi` ;
- ouvrir fiche `APICAD` ;
- ouvrir fiche `EuRom / EuRom Web` ;
- ouvrir fiche `Galanet` ;
- ouvrir fiche `ELAN` ;
- ouvrir fiche `Speechmatics` ;
- verifier les attributs `target="_blank"` et `rel="noopener noreferrer"` ;
- preparer une contribution de type `external-link` ;
- recherche `EuRom 5` ;
- filtre `Acteurs` ;
- demo Galanet ;
- exports JSON/CSV ;
- mobile a 390 px sans debordement horizontal ;
- console navigateur sans erreur.

## Limites restantes

- Les liens d'archive Galanet et Galapro doivent etre inspectes plus finement pour evaluer leur completude.
- APICAD n'a pas encore de lien officiel dedie confirme dans cette passe.
- Romanofonia y Cinema est documente indirectement par ALPAGA, mais une page propre au dispositif reste a retrouver.
- PHIP est rapproche du corpus de contes Miriadi, mais le lien exact doit etre confirme.
- Galatea, Elementi di intercomprensione UniTO et le portail PLE cite par Katia restent a documenter.
- Les statuts devront etre revus periodiquement, car l'accessibilite web peut changer.

## Confirmation de perimetre

La mission 014 a ete realisee uniquement dans `prototypes/07-informaticaire`.

Le dossier `prototypes/07-informaticaire/entretiens` n'a pas ete modifie.

Aucun autre prototype n'a ete modifie.

Les changements preexistants dans `prototypes/00-ic-hub` restent hors perimetre.
