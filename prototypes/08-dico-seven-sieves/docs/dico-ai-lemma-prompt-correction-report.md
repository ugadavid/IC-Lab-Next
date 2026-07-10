# Dico-IC — correction des prompts IA pour les lemmes

## Problème identifié

Les assistants lexicaux pouvaient interpréter une forme rencontrée ou attendue dans un contexte pédagogique comme la valeur à stocker directement dans `lexical_form.lemma`.

Cela a notamment contribué à la coexistence de deux entrées conceptuellement proches :

- `UTIL_ADJECTIVE_USEFUL`, avec des formes romanes plurielles comme `utiles`, `útiles`, `utili` et `úteis` ;
- `USEFUL`, avec les formes canoniques `utile`, `útil`, `utile`, `útil` et l'anglais `useful`.

La correction vise à réduire ces doublons conceptuels en demandant explicitement des lemmes dictionnaires. Elle ne modifie ni les données existantes ni le modèle de stockage.

## Assistants concernés

### Assistant IA Domaine

Le prompt construit dans `Node/src/admin-ai-domain.js` inclut désormais la règle complète de lemmatisation avant l'appel OpenAI.

### Assistant IA Texte

Le prompt construit dans `Node/src/admin-ai-text.js` réutilise exactement la même règle. Une instruction supplémentaire précise qu'une forme inconnue extraite du texte peut être fléchie et que le modèle doit d'abord retrouver son lemme dictionnaire.

### Assistant IA Relations

`Node/src/admin-ai-relations.js` a été vérifié mais n'a pas été modifié. Il travaille uniquement avec les identifiants et les lemmes déjà présents dans une entrée. Son prompt ne demande ni de créer ni de transformer des formes lexicales.

## Fichiers modifiés

- `Node/src/admin-ai-domain.js`
- `Node/src/admin-ai-text.js`
- `Node/test/admin-ai-domain.test.js`
- `Node/test/admin-ai-text.test.js`
- `admin/index-admin-ai-domain-0.1.html`
- `admin/index-admin-ai-text-0.1.html`
- `admin/css/admin-ai-domain-0.1.css`

## Nouvelle règle linguistique

Une constante partagée, `DICTIONARY_LEMMA_INSTRUCTIONS`, impose désormais :

- noms au singulier ;
- verbes à l'infinitif ;
- adjectifs sous leur forme canonique de dictionnaire ;
- adverbes sous leur forme non fléchie ;
- déterminants et pronoms sous leur forme canonique la plus neutre ;
- aucun pluriel contextuel ;
- aucune forme conjuguée ;
- aucun accord contextuel en genre ou en nombre, sauf forme lexicalisée ou réellement invariable.

Cette constante est intégrée aux instructions système des deux assistants lexicaux afin d'éviter leur divergence future.

## Exemples ajoutés

Les prompts contiennent explicitement les transformations suivantes :

```text
FR utiles → utile
ES útiles → útil
IT utili → utile
PT úteis → útil

FR élèves → élève
ES alumnos → alumno
IT studenti → studente
PT alunos → aluno

FR mangent → manger
ES comen → comer
IT mangiano → mangiare
PT comem → comer
```

## Schéma JSON

Le schéma JSON des candidats n'a pas été modifié. Une forme conserve la structure :

```json
{
  "language_code": "fr",
  "lemma": "utile",
  "part_of_speech": "adjective"
}
```

Le changement porte uniquement sur la signification explicitement demandée pour la valeur de `lemma`.

Le constructeur de prompt et le constructeur de schéma sont maintenant exportés pour permettre leur inspection par les tests unitaires. Cela ne change pas les endpoints ni les réponses HTTP.

## Frontend

Les pages IA Domaine et IA Texte affichent près du tableau de brouillons la note suivante :

> Les formes proposées doivent être des lemmes dictionnaires. Les formes fléchies rencontrées dans les textes seront gérées séparément dans une étape ultérieure.

Cette note rappelle la règle pendant la validation humaine sans ajouter de nouvelle fonctionnalité.

## Tests réalisés

Les tests unitaires vérifient désormais :

- la présence de l'expression « lemmes dictionnaires, pas des formes fléchies » dans le prompt Domaine ;
- sa présence dans le prompt Texte ;
- les règles du singulier et de l'infinitif ;
- les exemples `utiles → utile`, `útiles → útil` et `mangent → manger` ;
- l'instruction propre au texte, qui demande de convertir une forme de surface fléchie en lemme ;
- la stabilité du sous-schéma JSON `forms[]`, de ses trois champs et du type de `lemma`.

Résultat de `npm.cmd test` dans `Node/` :

```text
55 tests réussis
0 échec
```

Aucun test n'appelle OpenAI. Les fichiers serveur modifiés passent également le contrôle de syntaxe Node.

## Limites restantes

- Une instruction de prompt réduit fortement le risque, mais ne garantit pas à elle seule la correction morphologique de chaque proposition.
- La validation serveur vérifie toujours la structure et les valeurs autorisées, pas le caractère linguistiquement canonique d'un lemme.
- Les entrées existantes contenant des formes fléchies ne sont ni migrées ni fusionnées automatiquement.
- La détection d'un doublon conceptuel entre deux `entry_key` distinctes reste une tâche de révision humaine.

## Étape suivante

Les formes fléchies rencontrées dans les textes pourront ultérieurement être représentées séparément des lemmes canoniques, avec un lien explicite entre forme de surface et entrée lexicale. Cette étape demandera une réflexion dédiée sur le modèle ; elle n'est pas anticipée par une modification SQL dans cette correction.

Seven Sieves, `POST /analysis`, les endpoints d'écriture, le schéma SQL, les scripts SQL et la structure JSON des candidats restent inchangés.
