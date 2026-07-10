# Seven Sieves — Tamis 6 V0, rapport de faisabilité

## Statut

**Prototype fonctionnel non implémenté : prérequis absent dans la réponse de `POST /analysis`.**

Le mapping validé existe bien dans Dico-IC, mais l’information qui permettrait à Seven Sieves d’affirmer « pluriel validé » n’est pas exposée dans le paquet d’analyse. Produire l’infobulle demandée uniquement dans le frontend obligerait donc à recalculer ou inventer cette information, contrairement aux contraintes de la V0.

## Principe retenu

Le principe conceptuel reste valide :

```text
forme observée
↓
mapping inflected_form VALIDATED
↓
lemme canonique + PLURAL
↓
indice pédagogique
```

L’indice ne doit apparaître que si le paquet consommé par Seven Sieves atteste explicitement :

- que la surface a été résolue par `inflected_form` ;
- que le mapping est validé ;
- que son trait est `PLURAL` ;
- quel est le lemme canonique.

Une simple ressemblance graphique ou une différence entre surface et lemme ne suffit pas.

## Fichiers modifiés

Aucun fichier frontend, backend ou SQL n’a été modifié.

Seul ce rapport a été créé :

```text
docs/seven-sieves-tamis6-pedagogical-hint-v0-report.md
```

La variante pédagogique du tamis 4 reste intacte.

## Source de vérité examinée

### Mapping réellement présent

La lecture administrative confirme le mapping suivant :

```text
surface_form       = organizaciones
normalized_surface = organizaciones
lemma              = organización
grammatical_number = PLURAL
status              = VALIDATED
source_label        = manual_admin_v0
confidence_score    = 1
```

Cette donnée répond au besoin pédagogique, mais elle est disponible via la couche administrative. Seven Sieves ne doit ni appeler un endpoint admin, ni interroger MariaDB.

### Réponse réelle de `POST /analysis`

Requête testée :

```text
Las organizaciones internacionales participan en proyectos educativos.
```

Le token `organizaciones` est renvoyé avec :

```text
surface    = organizaciones
normalized = organizaciones
```

Il possède notamment un enrichissement de tamis 1 dont le payload contient :

```text
source_form      = organización
mediation_form   = organisation
relation_type    = COGNATE_STRONG
source.kind      = form_relation
```

En revanche, le token et ses enrichissements ne contiennent pas :

```text
grammatical_number = PLURAL
match_kind          = inflected_form
inflected_form_id
mapping_status       = VALIDATED
```

La provenance exposée est `form_relation`, car l’enrichissement décrit une relation lexicale du tamis 1. Elle ne prouve pas au client que la surface a été résolue par un mapping morphologique validé.

## Pourquoi le frontend ne peut pas conclure

### Comparer `organizaciones` à `organización`

Seven Sieves pourrait constater que la surface et `payload.source_form` diffèrent. Mais conclure que cette différence signifie « pluriel » demanderait une règle morphologique implicite.

Cette déduction serait fragile et interdite par le périmètre :

- aucune règle en `-s` ou `-es` ;
- aucun recalcul ;
- aucune information inventée ;
- mapping validé comme seule source de vérité.

### Utiliser `payload.source_form`

Ce champ appartient à un enrichissement lexical produit parce qu’une relation de cognat existe. Il n’est pas garanti pour toutes les formes fléchies validées.

S’en servir pour le tamis 6 couplerait donc par erreur :

```text
reconnaissance morphologique
↓ dépendrait de
présence d’une relation du tamis 1
```

Une forme fléchie validée sans cognat français pourrait alors être reconnue par Dico-IC sans être explicable par Seven Sieves.

### Ajouter une liste locale

Coder dans Seven Sieves :

```text
organizaciones → organización → PLURAL
```

produirait une copie locale de la donnée Dico-IC. Elle pourrait diverger de la base et ne serait plus « uniquement issue de la réponse d’analyse ».

Cette option n’a donc pas été retenue.

### Appeler l’endpoint admin

L’endpoint admin expose le mapping complet, mais il n’appartient pas au contrat public Seven Sieves. L’appeler depuis le client :

- mélangerait lecture pédagogique et administration ;
- ajouterait un second appel par analyse ou par token ;
- exposerait une surface interne non destinée au client ;
- violerait l’architecture demandée.

Cette option n’a pas été retenue.

## Exemple testé et résultat actuel

### Texte

```text
Las organizaciones internacionales participan en proyectos educativos.
```

### Résultat observé

- `organizaciones` est correctement tokenisé ;
- son lemme `organización` est mobilisé pour les connaissances lexicales ;
- le mapping `organizaciones → organización` est bien `VALIDATED` et `PLURAL` dans Dico-IC ;
- la réponse publique ne transporte pas cette provenance morphologique ;
- aucune infobulle « Indice de pluriel » ne peut être construite avec certitude côté Seven Sieves.

### Résultat qui deviendrait possible avec le prérequis

```text
Indice de pluriel

Cette forme est le pluriel validé de « organización ».

Singulier :
organización

Pluriel observé :
organizaciones

Information utile :
le texte parle probablement de plusieurs organisations.

Prudence :
cette information provient d’un mapping validé dans Dico-IC.
```

Cette description constitue le rendu cible, pas un résultat actuellement affiché.

## Prérequis minimal pour débloquer le prototype

Le paquet `POST /analysis` doit exposer explicitement une connaissance morphologique validée. Deux formes seraient conceptuellement possibles.

### Option préférée — enrichissement tamis 6 produit par l’API

```json
{
  "sieve_id": 6,
  "type": "morphosyntactic_signal",
  "label": "Pluriel validé",
  "source": {
    "kind": "inflected_form",
    "id": 1,
    "label": "Dico-IC"
  },
  "payload": {
    "category": "validated_plural",
    "grammatical_number": "PLURAL",
    "lemma": "organización",
    "surface_form": "organizaciones"
  }
}
```

L’API ferait alors le travail de vérité et Seven Sieves se limiterait au rendu, conformément à son rôle de client léger.

### Option alternative — métadonnée de résolution du token

Le token pourrait exposer une résolution interne structurée indiquant le lemme, le type de correspondance et le nombre. Le frontend pourrait ensuite construire l’indice local.

Cette option élargirait davantage le format des tokens et risquerait de transférer de la logique pédagogique au client. Elle est donc moins nette que l’enrichissement tamis 6 déjà prêt à être affiché.

Les deux options nécessitent une évolution du contrat ou de l’endpoint. Elles sont volontairement hors périmètre de cette tâche.

## Coexistence avec le tamis 4

Le mécanisme local du tamis 4 n’est pas concerné et reste intact.

À terme, un même token pourrait recevoir :

- un indice tamis 4 portant sur la reconnaissance graphique ;
- un enrichissement tamis 6 portant sur le nombre validé.

La fusion existante des enrichissements API et locaux permet déjà cette coexistence. Le blocage ne concerne pas le rendu, mais l’absence du fait morphologique fiable dans le paquet public.

## Limites actuelles

- `grammatical_number` n’est pas exposé dans `POST /analysis` ;
- la résolution `inflected_form` reste interne au repository ;
- le contrat V0 ne liste pas encore `inflected_form` parmi les valeurs de `source.kind` ;
- le tamis 6 actuel couvre une heuristique verbale, pas le pluriel validé ;
- aucune implémentation frontend honnête n’est possible avec la seule réponse actuelle ;
- aucune capture d’infobulle n’existe puisque l’indice n’a pas été ajouté.

## Vers les indices morphologiques V0.1

Des indices graphiques pourraient plus tard signaler :

- `-s` comme pluriel probable après certaines voyelles ;
- `-es` comme pluriel probable après certaines consonnes.

Ils ne sont volontairement pas implémentés dans cette V0 parce qu’ils demandent :

- une règle par langue ;
- une gestion des exceptions et alternances graphiques ;
- une catégorie grammaticale ou un lemme candidat ;
- une confiance inférieure à celle d’un mapping attesté ;
- une validation pédagogique sur des textes réels.

L’ordre de priorité doit rester :

```text
1. mapping VALIDATED transmis par Dico-IC
2. paire singulier/pluriel attestée
3. indice graphique probable
4. aucun indice si la confiance est insuffisante
```

Le mapping validé prime parce qu’il relie une surface précise à un lemme précis avec un trait explicite. Une règle en `-s` ou `-es` ne fournit qu’une hypothèse.

## Conclusion

Le concept pédagogique du tamis 6 reste cohérent, et Dico-IC possède déjà la connaissance nécessaire. Cependant, cette connaissance s’arrête aujourd’hui à la frontière interne de l’API.

Sous les contraintes imposées — aucune modification d’endpoint, aucune règle locale, aucune invention — le prototype fonctionnel ne peut pas être réalisé honnêtement dans Seven Sieves. Le plus petit déblocage futur consiste à faire produire par `POST /analysis` un enrichissement tamis 6 explicitement sourcé par `inflected_form`.
